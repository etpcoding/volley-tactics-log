import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Court, POS, SYSTEMS, rolesFor, homeOf } from "@/components/court";
import { useStored, uid, EMPTY_PLAYERS, EMPTY_PLAYS, type Play, type Player, type Token } from "@/lib/store";

export const Route = createFileRoute("/taktik")({
  head: () => ({
    meta: [
      { title: "Taktikboard – Volley Coach" },
      { name: "description", content: "Läufersysteme (5:1, 4:2, 6:2) und Aufstellungen auf dem Volleyballfeld planen." },
      { property: "og:title", content: "Taktikboard – Volley Coach" },
      { property: "og:description", content: "Spieler selbst auf die Positionen ziehen und Spielzüge besprechen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Taktik,
});

function Taktik() {
  const [players] = useStored<Player[]>("vb-players", EMPTY_PLAYERS);
  const [plays, setPlays] = useStored<Play[]>("vb-plays", EMPTY_PLAYS);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [system, setSystem] = useState("5:1");
  const [rotation, setRotation] = useState(1);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const court = useRef<HTMLDivElement>(null);
  const tokRef = useRef(tokens);
  tokRef.current = tokens;
  const roles = rolesFor(system, rotation);

  const full = tokens.length >= 6;

  const startDrag = (player: Player) => (e: React.PointerEvent) => {
    e.preventDefault();
    const cur = tokRef.current;
    const self = cur.find((t) => t.playerId === player.id);
    // Phase 2: all six placed → move freely (reception formation), home slot stays
    const free = cur.length >= 6 && !!self;
    let inside = false, lastX = 0, lastY = 0;
    const onMove = (ev: PointerEvent) => {
      const r = court.current?.getBoundingClientRect();
      if (!r) return;
      lastX = ((ev.clientX - r.left) / r.width) * 100;
      lastY = ((ev.clientY - r.top) / r.height) * 100;
      inside = lastX >= 0 && lastX <= 100 && lastY >= 0 && lastY <= 100;
      const rest = tokRef.current.filter((t) => t.playerId !== player.id);
      const prev = tokRef.current.find((t) => t.playerId === player.id) ?? self;
      const x = Math.min(96, Math.max(4, lastX)), y = Math.min(96, Math.max(4, lastY));
      setTokens(inside ? [...rest, { id: player.id, playerId: player.id, team: "us", label: String(player.number), x, y, home: prev?.home }] : rest);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (!inside) { setTokens(tokRef.current.filter((t) => t.playerId !== player.id)); return; }
      if (free) return;
      // Phase 1: snap to nearest slot; swap (court) or send occupant to bench (from bench)
      let best = -1, bd = 14;
      POS.forEach(([x, y], i) => { const d = Math.hypot(x - lastX, (y - lastY) / 2); if (d < bd) { bd = d; best = i; } });
      const others = tokRef.current.filter((t) => t.playerId !== player.id);
      if (best < 0) { setTokens(others); return; }
      const [sx, sy] = POS[best]!;
      const me: Token = { id: player.id, playerId: player.id, team: "us", label: String(player.number), x: sx, y: sy, home: best };
      const next = others.flatMap((t) => {
        if (homeOf(t) !== best) return [t];
        if (self) { const h = homeOf(self); const [px, py] = POS[h]!; return [{ ...t, x: px, y: py, home: h }]; }
        return [];
      });
      setTokens([...next, me]);
    };
    onMove(e.nativeEvent);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const rotate = () => {
    setRotation((rotation % 6) + 1);
    // II→I, III→II, …, I→VI; back to base slots
    setTokens(tokens.map((t) => { const h = (homeOf(t) + 5) % 6; const [x, y] = POS[h]!; return { ...t, x, y, home: h }; }));
  };
  const toBase = () => setTokens(tokens.map((t) => { const h = homeOf(t); const [x, y] = POS[h]!; return { ...t, x, y, home: h }; }));

  const save = (asCopy = false) => {
    let nm = name.trim() || `${system} Rotation ${rotation}`;
    if (asCopy && activeId && plays.some((p) => p.name === nm)) nm = `${nm} (Kopie)`;
    const data = { name: nm, notes, tokens, system, rotation };
    if (activeId && !asCopy) setPlays(plays.map((p) => (p.id === activeId ? { ...p, ...data } : p)));
    else { const id = uid(); setPlays([...plays, { id, ...data }]); setActiveId(id); }
    setName(nm);
  };
  const load = (p: Play) => {
    setTokens(p.tokens.filter((t) => t.playerId).map((t) => ({ ...t, home: homeOf(t) }))); setName(p.name); setNotes(p.notes); setActiveId(p.id);
    setSystem(p.system ?? "5:1"); setRotation(p.rotation ?? 1);
  };
  const reset = () => { setTokens([]); setName(""); setNotes(""); setActiveId(null); setRotation(1); };

  const placed = new Set(tokens.map((t) => t.playerId));
  const bench = players.filter((p) => !placed.has(p.id));

  return (
    <div>
      <h1 className="text-5xl">Taktikboard</h1>

      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(SYSTEMS).map(([k, s]) => (
          <button key={k} className={`chip ${system === k ? "chip-on" : ""}`} onClick={() => setSystem(k)}>{s.label}</button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{SYSTEMS[system]?.info}</p>

      <div className="mt-3 flex items-center justify-between">
        <span className="font-display text-2xl">Rotation {rotation}</span>
        <div className="flex gap-2">
          <button className="chip" onClick={rotate}>Rotieren ↻</button>
          {full && <button className="chip" onClick={toBase}>Grundposition</button>}
          <button className="chip" onClick={reset}>Leeren</button>
        </div>
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        {full ? "Alle stehen – jetzt frei verschieben, um die Annahmeposition festzulegen. Gestrichelte Linien zeigen die eigentliche Position." : `Ziehe ${6 - tokens.length} weitere Spieler auf die Positionen.`}
      </p>
      <div className="mt-2"><Court innerRef={court} tokens={tokens} players={players} roles={roles} onTokenDown={startDrag} /></div>

      <h2 className="mt-3 text-xl">Bank</h2>
      <div className="mt-1 flex min-h-14 flex-wrap gap-2 rounded-xl border border-dashed border-border p-2">
        {players.length === 0 && <p className="text-sm text-muted-foreground">Lege zuerst Spieler im Kader an.</p>}
        {bench.map((p) => (
          <div key={p.id} onPointerDown={startDrag(p)} className="flex cursor-grab touch-none select-none items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-display text-primary-foreground">{p.number}</span>
            {p.name} <span className="text-xs text-muted-foreground">{p.position}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 rounded-xl border border-border bg-card p-4">
        <input className="field" placeholder="Name des Spielzugs" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="field min-h-24" placeholder="Notizen: Laufwege, Zuspiel, Absprachen…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <button className="btn flex-1" onClick={() => save()}>{activeId ? "Änderungen speichern" : "Aufstellung speichern"}</button>
          {activeId && <button className="chip flex-1" onClick={() => save(true)}>Als neue Aufstellung speichern</button>}
        </div>
      </div>

      <h2 className="mt-6 text-3xl">Gespeicherte Aufstellungen</h2>
      <ul className="mt-2 grid gap-2">
        {plays.length === 0 && <p className="text-muted-foreground">Noch nichts gespeichert.</p>}
        {plays.map((p) => (
          <li key={p.id} className={`flex items-center gap-2 rounded-xl border bg-card p-3 ${activeId === p.id ? "border-primary" : "border-border"}`}>
            <button className="flex-1 text-left" onClick={() => load(p)}>
              <p className="font-semibold">{p.name} {p.system && <span className="text-xs text-muted-foreground">· {p.system} · R{p.rotation}</span>}</p>
              {p.notes && <p className="line-clamp-1 text-sm text-muted-foreground">{p.notes}</p>}
            </button>
            <button aria-label="Löschen" className="p-2 text-destructive" onClick={() => { setPlays(plays.filter((x) => x.id !== p.id)); if (activeId === p.id) reset(); }}>
              <Trash2 className="h-5 w-5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
