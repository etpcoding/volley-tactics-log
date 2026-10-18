import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useCloud } from "@/components/cloud-provider";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/konto")({
  head: () => ({
    meta: [
      { title: "Konto – Volley Coach" },
      { name: "description", content: "Anmelden, Profil pflegen und Trainerteam freigeben." },
      { property: "og:title", content: "Konto – Volley Coach" },
      { property: "og:description", content: "Anmeldung und Trainerteam für Volley Coach." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Konto,
});

const input = "w-full rounded-md border border-border bg-background px-3 py-2";

function Konto() {
  const { user, role, migrate, hasLegacy } = useCloud();
  return (
    <div className="space-y-6">
      <h1 className="text-4xl">Konto</h1>
      {user ? <>
        <Profile />
        <p className="text-sm text-muted-foreground">Rolle: {role === "admin" ? "Eigentümer (alles bearbeiten)" : role === "trainer" ? "Trainer (Spiele & Taktik)" : "Nur lesen – noch keine Freigabe"}</p>
        {role === "admin" && <Trainers />}
        {role === "admin" && hasLegacy && <section className="rounded-lg border border-border p-4">
          <h2 className="text-xl">Bestehende Daten übernehmen</h2>
          <p className="mb-2 text-sm text-muted-foreground">Überträgt die bisher auf diesem Gerät gespeicherten Daten in die Cloud (nur wenn die Cloud noch leer ist).</p>
          <Button onClick={() => void migrate()}>Daten übernehmen</Button>
        </section>}
        <Button variant="outline" onClick={() => void supabase.auth.signOut()}>Abmelden</Button>
      </> : <Login />}
    </div>
  );
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    const { error } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/konto` } });
    if (error) setMsg(error.message);
    else if (mode === "up") setMsg("Bitte bestätige deine E-Mail über den Link im Postfach.");
  }
  async function reset() {
    if (!email) { setMsg("Bitte zuerst E-Mail eingeben."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setMsg(error ? error.message : "Link zum Zurücksetzen wurde gesendet.");
  }
  async function social(p: "google" | "lovable") {
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: `${window.location.origin}/konto` });
    if (r.error) setMsg(r.error.message);
  }
  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="text-xl">{mode === "in" ? "Anmelden" : "Registrieren"}</h2>
      <input className={input} type="email" required placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={input} type="password" required minLength={6} placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit" className="w-full">{mode === "in" ? "Anmelden" : "Konto erstellen"}</Button>
      <div className="flex justify-between text-sm">
        <button type="button" className="underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "Neues Konto" : "Schon registriert?"}</button>
        <button type="button" className="underline" onClick={() => void reset()}>Passwort vergessen</button>
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={() => void social("google")}>Mit Google anmelden</Button>
      <Button type="button" variant="outline" className="w-full" onClick={() => void social("lovable")}>Mit Lovable anmelden</Button>
      {msg && <p className="text-sm" role="alert">{msg}</p>}
    </form>
  );
}

function Profile() {
  const { user } = useCloud();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [msg, setMsg] = useState("");
  async function load() {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("display_name,avatar_path").eq("id", user.id).maybeSingle();
    setName(data?.display_name ?? "");
    if (data?.avatar_path) {
      const { data: s } = await supabase.storage.from("avatars").createSignedUrl(data.avatar_path, 3600);
      setAvatar(s?.signedUrl ?? "");
    }
  }
  useEffect(() => { void load(); }, [user?.id]);
  async function save() {
    if (!user) return;
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: name });
    setMsg(error ? error.message : "Gespeichert.");
  }
  async function upload(file?: File) {
    if (!user || !file) return;
    const path = `${user.id}/avatar-${Date.now()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { setMsg(error.message); return; }
    await supabase.from("profiles").upsert({ id: user.id, display_name: name, avatar_path: path });
    void load();
  }
  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="text-xl">Profil</h2>
      <p className="text-sm text-muted-foreground">{user?.email}</p>
      <div className="flex items-center gap-3">
        {avatar ? <img src={avatar} alt="Profilbild" className="h-16 w-16 rounded-full object-cover" /> : <div className="h-16 w-16 rounded-full bg-muted" />}
        <input type="file" accept="image/*" onChange={(e) => void upload(e.target.files?.[0])} />
      </div>
      <input className={input} placeholder="Anzeigename" value={name} onChange={(e) => setName(e.target.value)} />
      <Button onClick={() => void save()}>Profil speichern</Button>
      {msg && <p className="text-sm">{msg}</p>}
    </section>
  );
}

function Trainers() {
  const [list, setList] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  async function load() {
    const { data } = await supabase.from("trainer_access").select("email").order("created_at");
    setList((data ?? []).map((r) => r.email));
  }
  useEffect(() => { void load(); }, []);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("trainer_access").insert({ email: email.trim().toLowerCase() });
    setMsg(error ? error.message : ""); setEmail(""); void load();
  }
  async function remove(m: string) {
    await supabase.from("trainer_access").delete().eq("email", m); void load();
  }
  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="text-xl">Trainerteam</h2>
      <p className="text-sm text-muted-foreground">Freigegebene Trainer dürfen Spiele und Taktiken bearbeiten, sobald sie sich mit dieser E-Mail registriert und bestätigt haben.</p>
      <form onSubmit={add} className="flex gap-2">
        <input className={input} type="email" required placeholder="trainer@verein.de" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit">Freigeben</Button>
      </form>
      <ul className="space-y-1">{list.map((m) => <li key={m} className="flex justify-between text-sm"><span>{m}</span><button className="text-destructive" onClick={() => void remove(m)}>Entfernen</button></li>)}</ul>
      {msg && <p className="text-sm text-destructive">{msg}</p>}
    </section>
  );
}
