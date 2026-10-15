import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
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

// Court positions I..VI on our half (top = net)
const POS: [number, number][] = [[80, 78], [80, 25], [50, 25], [20, 25], [20, 78], [50, 78]];
const POS_NAME = ["I", "II", "III", "IV", "V", "VI"];

// Roles at positions I..VI in rotation 1 (Läufer / setter on position I)
const SYSTEMS: Record<string, { label: string; info: string; roles: string[] }> = {
  "5:1": { label: "5:1 (ein Läufer)", info: "Ein Zuspieler (Läufer) spielt in allen Rotationen zu, Diagonal steht ihm gegenüber.", roles: ["Z", "A1", "M1", "D", "A2", "M2"] },
  "4:2": { label: "4:2", info: "Zwei Zuspieler, gespielt wird immer vom Zuspieler aus der Vorderreihe.", roles: ["Z1", "A1", "M1", "Z2", "A2", "M2"] },
  "6:2": { label: "6:2 (zwei Läufer)", info: "Zwei Läufer, zugespielt wird vom Zuspieler aus der Hinterreihe – vorne immer drei Angreifer.", roles: ["Z1", "A1", "M1", "Z2", "A2", "M2"] },
  "6:0": { label: "6:0", info: "Wer auf Position III / II steht, spielt zu – ideal für Anfänger.", roles: ["A", "A", "Z", "A", "A", "A"] },
};

function rolesFor(system: string, rotation: number) {
  const base = SYSTEMS[system]?.roles ?? [];
  // After each rotation the player from II moves to I, etc.
  return POS.map((_, i) => base[(i + rotation - 1) % 6] ?? "");
}

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

  const startDrag = (player: Player) => (e: React.PointerEvent) => {
    e.preventDefault();
    let inside = false, lastX = 0, lastY = 0;
    const onMove = (ev: PointerEvent) => {
      const r = court.current?.getBoundingClientRect();
      if (!r) return;
      lastX = ((ev.clientX - r.left) / r.width) * 100;
      lastY = ((ev.clientY - r.top) / r.height) * 100;
      inside = lastX >= 0 && lastX <= 100 && lastY >= 0 && lastY <= 100;
      const rest = tokRef.current.filter((t) => t.playerId !== player.id);
      setTokens(inside ? [...rest, { id: player.id, playerId: player.id, team: "us", label: String(player.number), x: lastX, y: lastY }] : rest);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (!inside) return;
      // snap to nearest position slot; swap if occupied
      let best = -1, bd = 14;
      POS.forEach(([x, y], i) => { const d = Math.hypot(x - lastX, (y - lastY) / 2); if (d < bd) { bd = d; best = i; } });
      if (best < 0) return;
      const [sx, sy] = POS[best]!;
      const prev = tokRef.current.find((t) => t.playerId === player.id);
      setTokens(tokRef.current.map((t) => {
        if (t.playerId === player.id) return { ...t, x: sx, y: sy };
        if (Math.hypot(t.x - sx, t.y - sy) < 1 && prev) return { ...t, x: prev.x, y: prev.y };
        return t;
      }).filter((t) => !(t.playerId !== player.id && Math.hypot(t.x - sx, t.y - sy) < 1 && !prev)));
    };
    onMove(e.nativeEvent);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const rotate = () => {
    setRotation((rotation % 6) + 1);
    // players move clockwise: II→I, III→II, IV→III, V→IV, VI→V, I→VI
    setTokens(tokens.map((t) => {
      const i = POS.findIndex(([x, y]) => Math.hypot(x - t.x, y - t.y) < 1);
      if (i < 0) return t;
      const [x, y] = POS[(i + 5) % 6]!;
      return { ...t, x, y };
    }));
  };

  const save = () => {
    const nm = name.trim() || `${system} Rotation ${rotation}`;
    const data = { name: nm, notes, tokens, system, rotation };
    if (activeId) setPlays(plays.map((p) => (p.id === activeId ? { ...p, ...data } : p)));
    else { const id = uid(); setPlays([...plays, { id, ...data }]); setActiveId(id); }
    setName(nm);
  };
  const load = (p: Play) => {
    setTokens(p.tokens.filter((t) => t.playerId)); setName(p.name); setNotes(p.notes); setActiveId(p.id);
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
      <p className="mt-2 text-sm text-muted-foreground">{SYSTEMS[system]?.info} Ziehe die Spieler von der Bank auf die Positionen.</p>

      <div className="mt-3 flex items-center justify-between">
        <span className="font-display text-2xl">Rotation {rotation}</span>
        <div className="flex gap-2">
          <button className="chip" onClick={rotate}>Rotieren ↻</button>
          <button className="chip" onClick={reset}>Leeren</button>
        </div>
      </div>

      <div ref={court} className="relative mx-auto mt-2 aspect-square max-h-[60vh] touch-none select-none rounded-md border-4 border-t-0 border-court-line bg-court">
        <div className="absolute inset-x-0 top-0 h-2 bg-court-line" aria-label="Netz" />
        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-court-line/70" />
        {POS.map(([x, y], i) => (
          <div key={i} style={{ left: `${x}%`, top: `${y}%` }} className="pointer-events-none absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-dashed border-court-line/80 text-court-line">
            <span className="font-display text-lg leading-none">{roles[i]}</span>
            <span className="text-[10px]">{POS_NAME[i]}</span>
          </div>
        ))}
        {tokens.map((k) => {
          const p = players.find((x) => x.id === k.playerId);
          if (!p) return null;
          return (
            <div key={k.id} onPointerDown={startDrag(p)} style={{ left: `${k.x}%`, top: `${k.y}%` }}
              className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center justify-center rounded-full border-2 border-court-line bg-primary text-primary-foreground shadow-lg">
              <span className="font-display text-xl leading-none">{p.number}</span>
              <span className="max-w-11 truncate text-[9px]">{p.name}</span>
            </div>
          );
        })}
      </div>

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
        <button className="btn" onClick={save}>{activeId ? "Änderungen speichern" : "Aufstellung speichern"}</button>
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
