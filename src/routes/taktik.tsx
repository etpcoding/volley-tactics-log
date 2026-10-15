import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { useStored, uid, EMPTY_PLAYERS, EMPTY_PLAYS, type Play, type Player, type Token } from "@/lib/store";

export const Route = createFileRoute("/taktik")({
  head: () => ({
    meta: [
      { title: "Taktikboard – Volley Coach" },
      { name: "description", content: "Aufstellungen und Spielzüge auf dem Volleyballfeld planen." },
      { property: "og:title", content: "Taktikboard – Volley Coach" },
      { property: "og:description", content: "Aufstellungstaktiken visuell besprechen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Taktik,
});

// Positions in % on a vertical court; our half = bottom (y 50–100)
const BASE: [number, number][] = [[80, 88], [80, 62], [50, 62], [20, 62], [20, 88], [50, 88]]; // I..VI

function defaultTokens(players: Player[]): Token[] {
  const us = BASE.map(([x, y], i) => ({
    id: uid(), team: "us" as const, x, y,
    label: players[i] ? String(players[i].number) : ["I", "II", "III", "IV", "V", "VI"][i] ?? "",
  }));
  const them = BASE.map(([x, y], i) => ({ id: uid(), team: "them" as const, x: 100 - x, y: 100 - y, label: String(i + 1) }));
  return [...us, ...them];
}

function Taktik() {
  const [players] = useStored<Player[]>("vb-players", EMPTY_PLAYERS);
  const [plays, setPlays] = useStored<Play[]>("vb-plays", EMPTY_PLAYS);
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const court = useRef<HTMLDivElement>(null);
  const drag = useRef<string | null>(null);
  const t = tokens ?? defaultTokens(players);

  const move = (e: React.PointerEvent) => {
    if (!drag.current || !court.current) return;
    const r = court.current.getBoundingClientRect();
    const x = Math.min(97, Math.max(3, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.min(98, Math.max(2, ((e.clientY - r.top) / r.height) * 100));
    setTokens(t.map((k) => (k.id === drag.current ? { ...k, x, y } : k)));
  };

  const rotate = () => {
    const us = t.filter((k) => k.team === "us");
    const labels: string[] = us.map((k) => k.label);
    const rotated = us.map((k, i) => ({ ...k, label: labels[(i + 1) % 6] ?? k.label, x: BASE[i]?.[0] ?? k.x, y: BASE[i]?.[1] ?? k.y }));
    setTokens([...rotated, ...t.filter((k) => k.team === "them")]);
  };

  const save = () => {
    const nm = name.trim() || `Spielzug ${plays.length + 1}`;
    if (activeId) setPlays(plays.map((p) => (p.id === activeId ? { ...p, name: nm, notes, tokens: t } : p)));
    else { const id = uid(); setPlays([...plays, { id, name: nm, notes, tokens: t }]); setActiveId(id); }
    setName(nm);
  };

  const load = (p: Play) => { setTokens(p.tokens); setName(p.name); setNotes(p.notes); setActiveId(p.id); };
  const reset = () => { setTokens(null); setName(""); setNotes(""); setActiveId(null); };

  return (
    <div>
      <h1 className="text-5xl">Taktikboard</h1>
      <p className="text-sm text-muted-foreground">Ziehe die Spieler über das Feld.</p>

      <div
        ref={court}
        onPointerMove={move}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
        className="relative mx-auto mt-4 aspect-[1/2] max-h-[70vh] touch-none select-none rounded-md border-4 border-court-line bg-court"
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 bg-court-line" />
        <div className="absolute inset-x-0 top-1/3 h-0.5 bg-court-line/70" />
        <div className="absolute inset-x-0 top-2/3 h-0.5 bg-court-line/70" />
        {t.map((k) => (
          <div
            key={k.id}
            onPointerDown={(e) => { drag.current = k.id; (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); }}
            style={{ left: `${k.x}%`, top: `${k.y}%` }}
            className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 font-display text-xl shadow-lg ${
              k.team === "us" ? "border-court-line bg-primary text-primary-foreground" : "border-court-line bg-background text-foreground"
            }`}
          >
            {k.label}
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button className="chip flex-1" onClick={rotate}>Rotieren ↻</button>
        <button className="chip flex-1" onClick={reset}>Neu</button>
      </div>

      <div className="mt-3 grid gap-2 rounded-xl border border-border bg-card p-4">
        <input className="field" placeholder="Name des Spielzugs" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="field min-h-24" placeholder="Notizen: Laufwege, Zuspiel, Absprachen…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="btn" onClick={save}>{activeId ? "Änderungen speichern" : "Spielzug speichern"}</button>
      </div>

      <h2 className="mt-6 text-3xl">Gespeicherte Spielzüge</h2>
      <ul className="mt-2 grid gap-2">
        {plays.length === 0 && <p className="text-muted-foreground">Noch keine Spielzüge gespeichert.</p>}
        {plays.map((p) => (
          <li key={p.id} className={`flex items-center gap-2 rounded-xl border bg-card p-3 ${activeId === p.id ? "border-primary" : "border-border"}`}>
            <button className="flex-1 text-left" onClick={() => load(p)}>
              <p className="font-semibold">{p.name}</p>
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
