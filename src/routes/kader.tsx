import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useStored, uid, POSITIONS, EMPTY_PLAYERS, EMPTY_MATCH, EMPTY_HISTORY, allMatches, type Player, type Match } from "@/lib/store";
import { playerStats } from "@/lib/stats";

export const Route = createFileRoute("/kader")({
  head: () => ({
    meta: [
      { title: "Kader – Volley Coach" },
      { name: "description", content: "Verwalte die Spieler deines Volleyballteams." },
      { property: "og:title", content: "Kader – Volley Coach" },
      { property: "og:description", content: "Spieler hinzufügen und löschen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Kader,
});

function Kader() {
  const [players, setPlayers] = useStored<Player[]>("vb-players", EMPTY_PLAYERS);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [position, setPosition] = useState<string>(POSITIONS[1] ?? "Außenangriff");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setPlayers([...players, { id: uid(), name: name.trim(), number: Number(number) || 0, position }]);
    setName(""); setNumber("");
  };

  const sorted = [...players].sort((a, b) => a.number - b.number);
  const [current] = useStored<Match>("vb-match", EMPTY_MATCH);
  const [history] = useStored<Match[]>("vb-history", EMPTY_HISTORY);
  const stats = playerStats(players, allMatches(current, history));

  return (
    <div>
      <h1 className="text-5xl">Kader <span className="text-primary">{players.length}</span></h1>
      <form onSubmit={add} className="mt-4 grid gap-2 rounded-xl border border-border bg-card p-4">
        <div className="flex gap-2">
          <input className="field w-20" placeholder="Nr." inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value)} />
          <input className="field" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {POSITIONS.map((p) => (
            <button type="button" key={p} onClick={() => setPosition(p)} className={`chip ${position === p ? "chip-on" : ""}`}>{p}</button>
          ))}
        </div>
        <button className="btn" disabled={!name.trim()}>Spieler hinzufügen</button>
      </form>
      <ul className="mt-4 grid gap-2">
        {sorted.length === 0 && <p className="text-center text-muted-foreground">Noch keine Spieler im Kader.</p>}
        {sorted.map((p) => {
          const s = stats.find((x) => x.p.id === p.id);
          return (
          <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary font-display text-2xl text-primary-foreground">{p.number}</span>
            <div className="flex-1">
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-muted-foreground">{p.position}</p>
              {s && (
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs">
                  <span>{s.games} Spiele</span>
                  <span className="text-success">{s.pts} Pkt</span>
                  <span>{s.kills} Angriff</span>
                  <span>{s.aces} Asse</span>
                  <span>{s.blocks} Blocks</span>
                  <span className="text-destructive">{s.err} Fehler</span>
                </div>
              )}
            </div>
            <button aria-label={`${p.name} löschen`} onClick={() => confirm(`${p.name} löschen?`) && setPlayers(players.filter((x) => x.id !== p.id))} className="rounded-lg p-2 text-destructive hover:bg-muted">
              <Trash2 className="h-5 w-5" />
            </button>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
