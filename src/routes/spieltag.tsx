import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Undo2 } from "lucide-react";
import {
  useStored, uid, EMPTY_PLAYERS, EMPTY_MATCH, POINT_HOW, TECHNIQUES, ERRORS,
  type Match, type MatchEvent, type Player,
} from "@/lib/store";

export const Route = createFileRoute("/spieltag")({
  head: () => ({
    meta: [
      { title: "Spieltag – Volley Coach" },
      { name: "description", content: "Punkte, Fehler und Angriffstechniken live während des Spiels erfassen." },
      { property: "og:title", content: "Spieltag – Volley Coach" },
      { property: "og:description", content: "Live-Statistik für jeden Ballwechsel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Spieltag,
});

type Mode = null | "point" | "error";

function Spieltag() {
  const [players] = useStored<Player[]>("vb-players", EMPTY_PLAYERS);
  const [match, setMatch] = useStored<Match>("vb-match", EMPTY_MATCH);
  const [mode, setMode] = useState<Mode>(null);
  const [playerId, setPlayerId] = useState<string>();
  const [how, setHow] = useState<string>();
  const [technique, setTechnique] = useState<string>();

  const setEv = match.events.filter((e) => e.set === match.set);
  const ours = (e: MatchEvent) => e.kind === "point";
  const us = setEv.filter(ours).length;
  const them = setEv.length - us;
  const setsWon = (side: "us" | "them") => {
    let n = 0;
    for (let s = 1; s < match.set; s++) {
      const ev = match.events.filter((e) => e.set === s);
      const a = ev.filter(ours).length, b = ev.length - a;
      if ((side === "us" && a > b) || (side === "them" && b > a)) n++;
    }
    return n;
  };
  const pname = (id?: string) => {
    const p = players.find((x) => x.id === id);
    return p ? `#${p.number} ${p.name}` : id ? "Unbekannt" : "";
  };

  const clear = () => { setMode(null); setPlayerId(undefined); setHow(undefined); setTechnique(undefined); };
  const push = (e: Omit<MatchEvent, "id" | "set" | "at">) => {
    setMatch({ ...match, events: [...match.events, { ...e, id: uid(), set: match.set, at: Date.now() }] });
    clear();
  };

  const needsPlayer = mode === "error" || (how && how !== "Gegnerfehler");
  const canSave = mode === "point" ? !!how && (!needsPlayer || !!playerId) && (how !== "Angriff" || !!technique) : mode === "error" ? !!playerId && !!how : false;

  // Stats
  const stats = players.map((p) => {
    const ev = match.events.filter((e) => e.playerId === p.id);
    return { p, pts: ev.filter((e) => e.kind === "point").length, err: ev.filter((e) => e.kind === "error").length };
  }).filter((s) => s.pts || s.err).sort((a, b) => b.pts - a.pts);
  const count = (key: "technique" | "how", kind: MatchEvent["kind"]) => {
    const m: Record<string, number> = {};
    match.events.filter((e) => e.kind === kind && e[key]).forEach((e) => (m[e[key]!] = (m[e[key]!] ?? 0) + 1));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };

  return (
    <div>
      <input className="field mb-3" placeholder="Gegner" value={match.opponent} onChange={(e) => setMatch({ ...match, opponent: e.target.value })} />

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-center text-sm uppercase tracking-widest text-muted-foreground">Satz {match.set} · Sätze {setsWon("us")}:{setsWon("them")}</p>
        <div className="mt-1 grid grid-cols-2 text-center">
          <div><p className="text-sm text-muted-foreground">Wir</p><p className="font-display text-7xl text-primary">{us}</p></div>
          <div><p className="text-sm text-muted-foreground">{match.opponent || "Gegner"}</p><p className="font-display text-7xl">{them}</p></div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button className="btn bg-success" onClick={() => { clear(); setMode("point"); }}>+ Punkt</button>
          <button className="btn bg-destructive text-destructive-foreground" onClick={() => { clear(); setMode("error"); }}>Fehler</button>
          <button className="btn bg-secondary text-secondary-foreground" onClick={() => push({ side: "them", kind: "opp" })}>Gegner +1</button>
        </div>
        <div className="mt-2 flex gap-2">
          <button className="chip flex flex-1 items-center justify-center gap-1" disabled={!match.events.length} onClick={() => setMatch({ ...match, events: match.events.slice(0, -1) })}><Undo2 className="h-4 w-4" /> Rückgängig</button>
          <button className="chip flex-1" onClick={() => setMatch({ ...match, set: match.set + 1 })}>Nächster Satz</button>
          <button className="chip flex-1" onClick={() => confirm("Neues Spiel starten? Alle Daten dieses Spiels werden gelöscht.") && setMatch(EMPTY_MATCH)}>Neues Spiel</button>
        </div>
      </div>

      {mode && (
        <div className="mt-3 grid gap-3 rounded-xl border border-primary bg-card p-4">
          <h2 className="text-2xl">{mode === "point" ? "Punkt für uns" : "Eigener Fehler (Punkt Gegner)"}</h2>
          <Section title={mode === "point" ? "Wie?" : "Welcher Fehler?"}>
            {(mode === "point" ? POINT_HOW : ERRORS).map((h) => <Chip key={h} on={how === h} onClick={() => setHow(h)}>{h}</Chip>)}
          </Section>
          {mode === "point" && how === "Angriff" && (
            <Section title="Angriffstechnik">
              {TECHNIQUES.map((h) => <Chip key={h} on={technique === h} onClick={() => setTechnique(h)}>{h}</Chip>)}
            </Section>
          )}
          {needsPlayer && (
            <Section title="Wer?">
              {players.length === 0 && <p className="text-sm text-muted-foreground">Lege zuerst Spieler im Kader an.</p>}
              {players.map((p) => <Chip key={p.id} on={playerId === p.id} onClick={() => setPlayerId(p.id)}>#{p.number} {p.name}</Chip>)}
            </Section>
          )}
          <div className="flex gap-2">
            <button className="chip flex-1" onClick={clear}>Abbrechen</button>
            <button className="btn flex-1" disabled={!canSave} onClick={() => push(mode === "point"
              ? { side: "us", kind: "point", how, playerId: needsPlayer ? playerId : undefined, technique: how === "Angriff" ? technique : undefined }
              : { side: "them", kind: "error", how, playerId })}>Eintragen</button>
          </div>
        </div>
      )}

      <h2 className="mt-6 text-3xl">Spielerstatistik</h2>
      <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
        {stats.length === 0 ? <p className="p-3 text-muted-foreground">Noch keine Einträge.</p> : stats.map((s) => (
          <div key={s.p.id} className="flex items-center justify-between border-b border-border p-3 last:border-0">
            <span>#{s.p.number} {s.p.name}</span>
            <span><span className="font-semibold text-success">{s.pts} Pkt</span> · <span className="text-destructive">{s.err} Fehler</span></span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Tally title="Angriffstechniken" rows={count("technique", "point")} />
        <Tally title="Fehlerarten" rows={count("how", "error")} />
      </div>

      <h2 className="mt-6 text-3xl">Verlauf</h2>
      <ul className="mt-2 grid gap-1">
        {[...match.events].reverse().map((e) => (
          <li key={e.id} className="flex gap-2 rounded-lg bg-card px-3 py-2 text-sm">
            <span className="text-muted-foreground">S{e.set}</span>
            <span className={e.kind === "point" ? "text-success" : e.kind === "error" ? "text-destructive" : ""}>
              {e.kind === "point" ? "Punkt" : e.kind === "error" ? "Fehler" : "Punkt Gegner"}
            </span>
            <span className="flex-1 text-right">{[pname(e.playerId), e.how, e.technique].filter(Boolean).join(" · ")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="mb-1.5 text-sm font-semibold text-muted-foreground">{title}</p><div className="flex flex-wrap gap-2">{children}</div></div>;
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`chip ${on ? "chip-on" : ""}`}>{children}</button>;
}
function Tally({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <h3 className="text-xl">{title}</h3>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">–</p> : rows.map(([k, v]) => (
        <div key={k} className="flex justify-between text-sm"><span>{k}</span><span className="font-semibold">{v}</span></div>
      ))}
    </div>
  );
}
