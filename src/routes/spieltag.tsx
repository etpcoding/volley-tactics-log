import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Undo2, Timer } from "lucide-react";
import {
  useStored, uid, teamPlayers, EMPTY_PLAYERS, EMPTY_MATCH, EMPTY_HISTORY, POINT_HOW, TECHNIQUES, ERRORS,
  EMPTY_CLUB, defaultSeason, type Club, type Match, type MatchEvent, type Player,
} from "@/lib/store";
import { applyEvent, undoEvent, setScore, setsWon, server, setTarget, TIMEOUTS_PER_SET } from "@/lib/volley";

export const Route = createFileRoute("/spieltag")({
  head: () => ({
    meta: [
      { title: "Spieltag – Volley Coach" },
      { name: "description", content: "Spielbericht wie im Schiri-System: Punkte, Fehler, Auszeiten und automatische Satzwechsel." },
      { property: "og:title", content: "Spieltag – Volley Coach" },
      { property: "og:description", content: "Live-Spielbericht für jeden Ballwechsel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Spieltag,
});

type Mode = null | "point" | "error";

function Spieltag() {
  const [players] = useStored<Player[]>("vb-players", EMPTY_PLAYERS);
  const [match, setMatchRaw] = useStored<Match>("vb-match", EMPTY_MATCH);
  const [history, setHistory] = useStored<Match[]>("vb-history", EMPTY_HISTORY);
  const [club] = useStored<Club>("vb-club", EMPTY_CLUB);
  const season = club.season || defaultSeason();
  const [mode, setMode] = useState<Mode>(null);
  const [playerId, setPlayerId] = useState<string>();
  const [how, setHow] = useState<string>();
  const [technique, setTechnique] = useState<string>();

  const roster = match.roster ?? [];
  const timeouts = match.timeouts ?? [];
  const pickPool = teamPlayers(players, match.team);
  const pool = pickPool;
  const onCourt = roster.length ? pool.filter((p) => roster.includes(p.id)) : pool;

  const setMatch = (m: Match) => {
    const withId = m.id ? m : { ...m, id: uid(), date: Date.now(), season };
    setMatchRaw(withId);
    const rest = history.filter((h) => h.id !== withId.id);
    if (withId.finished) setHistory([withId, ...rest]);
    else if (rest.length !== history.length) setHistory(rest);
  };

  const sc = setScore(match.events, match.set);
  const won = setsWon(match.events, match.finished ? match.set : match.set - 1);
  const serving = server(match);
  const tie = match.set >= 5;
  const sideChange = tie && !match.finished && Math.max(sc.us, sc.them) === 8 && sc.us + sc.them > 0 &&
    match.events[match.events.length - 1]?.set === match.set && (sc.us === 8) !== (sc.them === 8);
  const toUsed = (side: "us" | "them") => timeouts.filter((t) => t.set === match.set && t.side === side).length;

  const clear = () => { setMode(null); setPlayerId(undefined); setHow(undefined); setTechnique(undefined); };
  const push = (e: Omit<MatchEvent, "id" | "set" | "at">) => {
    if (match.finished) return;
    setMatch(applyEvent(match, { ...e, id: uid(), set: match.set, at: Date.now() }));
    clear();
  };
  const timeout = (side: "us" | "them") => {
    if (toUsed(side) >= TIMEOUTS_PER_SET) return;
    setMatch({ ...match, timeouts: [...timeouts, { set: match.set, side }] });
  };

  const needsPlayer = mode === "error" || (how && how !== "Gegnerfehler");
  const canSave = mode === "point" ? !!how && (!needsPlayer || !!playerId) && (how !== "Angriff" || !!technique) : mode === "error" ? !!playerId && !!how : false;

  const setRows = Array.from({ length: match.set }, (_, i) => i + 1).map((s) => ({ s, ...setScore(match.events, s) }));

  return (
    <div>
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">{club.name || "Mein Verein"} · Saison {match.season ?? season}</p>
        <p className="mt-2 mb-1 text-sm font-semibold text-muted-foreground">Unser Team</p>
        {club.teams.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {club.teams.map((t) => <Chip key={t} on={match.team === t} onClick={() => { setMatch({ ...match, team: t, roster: [] }); clear(); }}>{t}</Chip>)}
          </div>
        ) : (
          <input className="field" placeholder="z. B. Herren 1 (Teams im Kader anlegen)" value={match.team ?? ""} onChange={(e) => setMatch({ ...match, team: e.target.value })} />
        )}
        <p className="mt-2 mb-1 text-sm font-semibold text-muted-foreground">Gegner</p>
        <input className="field" placeholder="Name des gegnerischen Teams" value={match.opponent} onChange={(e) => setMatch({ ...match, opponent: e.target.value })} />
      </div>

      {match.events.length === 0 && players.length > 0 && (
        <div className="mt-3 rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-semibold text-muted-foreground">Wer spielt heute mit?{pool.length > 0 ? ` (leer = ${match.team ? `ganzes Team ${match.team}` : "alle"})` : ""}</p>
          {pool.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Spieler diesem Team zugeordnet.</p>}
          <div className="flex flex-wrap gap-2">
            {pool.map((p) => (
              <Chip key={p.id} on={roster.includes(p.id)} onClick={() => setMatch({ ...match, roster: roster.includes(p.id) ? roster.filter((x) => x !== p.id) : [...roster, p.id] })}>#{p.number} {p.name}</Chip>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <p className="text-center text-sm uppercase tracking-widest text-muted-foreground">
          {match.finished ? "Spiel beendet" : `Satz ${match.set}${tie ? " · Tie-Break" : ""} · bis ${setTarget(match.set)}`} · Sätze {won.us}:{won.them}
        </p>
        <div className="mt-1 grid grid-cols-2 text-center">
          <Team label="Wir" score={sc.us} serving={!match.finished && serving === "us"} primary />
          <Team label={match.opponent || "Gegner"} score={sc.them} serving={!match.finished && serving === "them"} />
        </div>

        {sideChange && <p className="mt-2 rounded-lg bg-primary/15 p-2 text-center text-sm font-semibold text-primary">Seitenwechsel!</p>}

        {match.finished ? (
          <div className="mt-3 grid gap-2 text-center">
            <p className="font-display text-3xl">{won.us > won.them ? "Sieg" : "Niederlage"} {won.us}:{won.them}</p>
            <Link to="/auswertung" className="btn">Zur Auswertung</Link>
          </div>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button className="btn bg-success" onClick={() => { clear(); setMode("point"); }}>+ Punkt</button>
              <button className="btn bg-destructive text-destructive-foreground" onClick={() => { clear(); setMode("error"); }}>Fehler</button>
              <button className="btn bg-secondary text-secondary-foreground" onClick={() => push({ side: "them", kind: "opp" })}>Gegner +1</button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["us", "them"] as const).map((side) => (
                <button key={side} className="chip flex items-center justify-center gap-1" disabled={toUsed(side) >= TIMEOUTS_PER_SET} onClick={() => timeout(side)}>
                  <Timer className="h-4 w-4" /> Auszeit {side === "us" ? "Wir" : "Gegner"} ({toUsed(side)}/{TIMEOUTS_PER_SET})
                </button>
              ))}
            </div>
          </>
        )}
        <div className="mt-2 flex gap-2">
          <button className="chip flex flex-1 items-center justify-center gap-1" disabled={!match.events.length} onClick={() => setMatch(undoEvent(match))}><Undo2 className="h-4 w-4" /> Rückgängig</button>
          <button className="chip flex-1" onClick={() => confirm(match.finished ? "Neues Spiel starten? Das beendete Spiel bleibt in der Auswertung." : "Neues Spiel starten? Dieses unfertige Spiel wird verworfen.") && setMatchRaw(EMPTY_MATCH)}>Neues Spiel</button>
        </div>

        <table className="mt-3 w-full text-center text-sm">
          <thead className="text-muted-foreground"><tr><th className="text-left">Satz</th>{setRows.map((r) => <th key={r.s}>{r.s}</th>)}</tr></thead>
          <tbody>
            <tr><td className="text-left">Wir</td>{setRows.map((r) => <td key={r.s} className="font-semibold">{r.us}</td>)}</tr>
            <tr><td className="text-left">Gegner</td>{setRows.map((r) => <td key={r.s}>{r.them}</td>)}</tr>
          </tbody>
        </table>
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
              {onCourt.length === 0 && <p className="text-sm text-muted-foreground">Lege zuerst Spieler im Kader an.</p>}
              {onCourt.map((p) => <Chip key={p.id} on={playerId === p.id} onClick={() => setPlayerId(p.id)}>#{p.number} {p.name}</Chip>)}
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

      <h2 className="mt-6 text-3xl">Verlauf</h2>
      <ul className="mt-2 grid gap-1">
        {match.events.length === 0 && <p className="text-muted-foreground">Noch keine Ballwechsel.</p>}
        {[...match.events].reverse().map((e) => {
          const p = players.find((x) => x.id === e.playerId);
          return (
            <li key={e.id} className="flex gap-2 rounded-lg bg-card px-3 py-2 text-sm">
              <span className="text-muted-foreground">S{e.set}</span>
              <span className={e.kind === "point" ? "text-success" : e.kind === "error" ? "text-destructive" : ""}>
                {e.kind === "point" ? "Punkt" : e.kind === "error" ? "Fehler" : "Punkt Gegner"}
              </span>
              <span className="flex-1 text-right">{[p && `#${p.number} ${p.name}`, e.how, e.technique].filter(Boolean).join(" · ")}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Team({ label, score, serving, primary }: { label: string; score: number; serving: boolean; primary?: boolean }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{serving && <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-primary" aria-label="Aufschlag" />}{label}</p>
      <p className={`font-display text-7xl ${primary ? "text-primary" : ""}`}>{score}</p>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="mb-1.5 text-sm font-semibold text-muted-foreground">{title}</p><div className="flex flex-wrap gap-2">{children}</div></div>;
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`chip ${on ? "chip-on" : ""}`}>{children}</button>;
}
