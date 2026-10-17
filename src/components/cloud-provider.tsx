import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { connectStore, receiveStored, EMPTY_CLUB, EMPTY_PLAYERS, EMPTY_HISTORY, EMPTY_MATCH, EMPTY_PLAYS } from "@/lib/store";
import { canEditKey, SHARED_KEYS, type CloudRole } from "@/lib/cloud-permissions";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";

type CloudContextType = { user: User | null; role: CloudRole; status: string; error: string; refreshAccount: () => Promise<void>; migrate: () => Promise<void>; hasLegacy: boolean };
const CloudContext = createContext<CloudContextType>({ user: null, role: null, status: "Lädt…", error: "", refreshAccount: async () => {}, migrate: async () => {}, hasLegacy: false });
export const useCloud = () => useContext(CloudContext);
const defaults: Record<string, unknown> = { "vb-club": EMPTY_CLUB, "vb-players": EMPTY_PLAYERS, "vb-history": EMPTY_HISTORY, "vb-match": EMPTY_MATCH, "vb-plays": EMPTY_PLAYS };

export function CloudProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<CloudRole>(null);
  const [status, setStatus] = useState("Verbinde…");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [hasLegacy, setHasLegacy] = useState(false);
  const roleRef = useRef<CloudRole>(null);
  const versions = useRef<Record<string, number>>({});
  const pending = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const router = useRouter();
  const queryClient = useQueryClient();

  async function refreshAccount() {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    let next: CloudRole = null;
    if (data.user) {
      const { data: admin } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
      const { data: trainer } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "trainer" });
      next = admin ? "admin" : trainer ? "trainer" : null;
    }
    roleRef.current = next; setRole(next);
  }
  async function reload() {
    const { data, error: failure } = await supabase.from("shared_documents").select("key,value,version");
    if (failure) throw failure;
    for (const key of SHARED_KEYS) {
      const row = data.find((r) => r.key === key);
      versions.current[key] = row?.version ?? 0;
      let value: unknown = row?.value ?? defaults[key];
      if (key === "vb-club") value = { ...(value as object), activeTeam: localStorage.getItem("vb-active-team") ?? "" };
      receiveStored(key, value);
    }
  }
  function save(key: string, input: unknown) {
    if (!SHARED_KEYS.some((k) => k === key)) return;
    let value = input;
    if (key === "vb-club") {
      const club = input as { activeTeam?: string };
      localStorage.setItem("vb-active-team", club.activeTeam ?? "");
      const { activeTeam: _selection, ...shared } = club;
      value = shared;
      if (!canEditKey(roleRef.current, key)) { void reload().catch((e) => setError(e.message)); return; }
    }
    if (!canEditKey(roleRef.current, key)) { setError("Zum Bearbeiten benötigst du die passende Trainerfreigabe."); return; }
    receiveStored(key, input);
    pending.current += 1; setStatus("Speichert…"); setError("");
    queue.current = queue.current.then(async () => {
      const { data, error: failure } = await supabase.rpc("save_document", { document_key: key, document_value: value as Json, expected_version: versions.current[key] ?? 0 });
      if (failure) {
        localStorage.setItem("vb-unsaved-draft", JSON.stringify({ key, value, at: Date.now() }));
        setError(`${failure.message} Deine Eingabe wurde als lokale Notfallsicherung behalten.`);
        throw failure;
      }
      versions.current[key] = data;
    }).catch(async () => { await reload().catch(() => {}); }).finally(() => {
      pending.current -= 1;
      if (!pending.current) { setStatus("Cloud verbunden"); void reload().catch((e) => setError(e.message)); }
    });
  }
  async function migrate() {
    if (roleRef.current !== "admin") return;
    const backup = JSON.parse(localStorage.getItem("vb-local-backup") ?? "{}") as Record<string, unknown>;
    await reload();
    if (Object.values(versions.current).some((v) => v > 0)) { setError("Die Cloud enthält bereits Daten. Nutze die Sicherung im Kader, um sie bewusst zu ersetzen."); return; }
    for (const key of SHARED_KEYS) if (backup[key] !== undefined) save(key, backup[key]);
    await queue.current;
  }
  useEffect(() => {
    let alive = true;
    const backup: Record<string, unknown> = {};
    for (const key of SHARED_KEYS) { const raw = localStorage.getItem(key); if (raw) { try { backup[key] = JSON.parse(raw); } catch {} } }
    if (!localStorage.getItem("vb-local-backup") && Object.keys(backup).length) localStorage.setItem("vb-local-backup", JSON.stringify(backup));
    setHasLegacy(!!localStorage.getItem("vb-local-backup"));
    connectStore(save);
    async function init() { try { await reload(); await refreshAccount(); if (alive) { setReady(true); setStatus("Cloud verbunden"); } } catch (e) { if (alive) { setError(e instanceof Error ? e.message : "Cloud nicht erreichbar"); setStatus("Verbindung fehlgeschlagen"); } } }
    void init();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      if (event === "SIGNED_OUT") { roleRef.current = null; setRole(null); setUser(null); }
      else void refreshAccount();
      void router.invalidate();
      if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
    });
    const channel = supabase.channel("volley-shared").on("postgres_changes", { event: "*", schema: "public", table: "shared_documents" }, () => { if (!pending.current) void reload().catch((e) => setError(e.message)); }).subscribe();
    const onFocus = () => { if (!pending.current) { void reload().catch((e) => setError(e.message)); void refreshAccount(); } };
    window.addEventListener("focus", onFocus);
    return () => { alive = false; listener.subscription.unsubscribe(); void supabase.removeChannel(channel); window.removeEventListener("focus", onFocus); };
  }, []);
  return <CloudContext.Provider value={{ user, role, status, error, refreshAccount, migrate, hasLegacy }}>
    <p className="mb-3 text-xs text-muted-foreground" role="status">{status}</p>
    {error && <p className="mb-3 text-sm text-destructive" role="alert">{error}</p>}
    {ready ? children : <div className="py-8"><p>Gemeinsame Vereinsdaten werden geladen.</p>{error && <Button className="mt-3" onClick={() => window.location.reload()}>Erneut verbinden</Button>}</div>}
  </CloudContext.Provider>;
}