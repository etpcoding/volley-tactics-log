import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useStored, write, uid, EMPTY_CLUB, defaultSeason, type Club, POSITIONS, EMPTY_PLAYERS, EMPTY_MATCH, EMPTY_HISTORY, allMatches, teamPlayers, type Player, type Match } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { playerStats } from "@/lib/stats";
import { setsWon } from "@/lib/volley";

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
  const [club, setClub] = useStored<Club>("vb-club", EMPTY_CLUB);
  const view = club.activeTeam ?? "";
  const viewTeam = view && view !== "__none" && club.teams.includes(view) ? view : undefined;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setPlayers([...players, { id: uid(), name: name.trim(), number: Number(number) || 0, position, team: viewTeam ?? "" }]);
    setName(""); setNumber("");
  };

  const visible = view === "__none" ? players.filter((p) => !p.team || !club.teams.includes(p.team)) : viewTeam ? teamPlayers(players, viewTeam) : players;
  const sorted = [...visible].sort((a, b) => a.number - b.number);
  const removeTeam = (t: string) => {
    if (!confirm(`Team „${t}“ entfernen? Die Spieler bleiben ohne Team im Kader.`)) return;
    setClub({ ...club, teams: club.teams.filter((x) => x !== t), activeTeam: club.activeTeam === t ? "" : (club.activeTeam ?? "") });
    setPlayers(players.map((p) => (p.team === t ? { ...p, team: "" } : p)));
  };
  const [current] = useStored<Match>("vb-match", EMPTY_MATCH);
  const [history, setHistory] = useStored<Match[]>("vb-history", EMPTY_HISTORY);
  const [teamName, setTeamName] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("alle");
  const season = club.season || defaultSeason();
  const all = allMatches(current, history);
  const seasons = [...new Set([season, ...all.map((m) => m.season ?? season)])].sort().reverse();
  const filtered = seasonFilter === "alle" ? all : all.filter((m) => (m.season ?? season) === seasonFilter);
  const stats = playerStats(players, filtered);

  const exportData = () => {
    const keys = ["vb-club", "vb-players", "vb-history", "vb-plays", "vb-match"];
    const data = Object.fromEntries(keys.map((k) => [k, JSON.parse(localStorage.getItem(k) ?? "null")]));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = `volley-coach-${(club.name || "verein").replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  const importData = async (f?: File) => {
    if (!f || !confirm("Sicherung laden? Die aktuellen Daten werden ersetzt.")) return;
    const data = JSON.parse(await f.text()) as Record<string, unknown>;
    Object.entries(data).forEach(([k, v]) => v !== null && k.startsWith("vb-") && write(k, v));
  };

  return (
    <div>
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-1 text-sm font-semibold text-muted-foreground">Verein</p>
        <input className="field" placeholder="Vereinsname" value={club.name} onChange={(e) => setClub({ ...club, name: e.target.value })} />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Aktuelle Saison</span>
          <input className="field w-28" value={season} onChange={(e) => setClub({ ...club, season: e.target.value })} />
        </div>
        <p className="mt-3 mb-1 text-sm font-semibold text-muted-foreground">Teams</p>
        <div className="flex flex-wrap gap-2">
          {club.teams.map((t) => (
            <button key={t} className="chip" aria-label={`Team ${t} entfernen`} onClick={() => removeTeam(t)}>{t} ✕</button>
          ))}
        </div>
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = teamName.trim(); if (t && !club.teams.includes(t)) setClub({ ...club, teams: [...club.teams, t] }); setTeamName(""); }}>
          <input className="field" placeholder="z. B. Herren 1, Damen 2" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          <button className="btn" disabled={!teamName.trim()}>+</button>
        </form>
      </div>

      <h1 className="mt-6 text-5xl">{viewTeam ?? (club.name || "")}{viewTeam || club.name ? " – " : ""}Kader <span className="text-primary">{visible.length}</span></h1>
      {club.teams.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {club.teams.map((t) => (
            <button key={t} className={`chip ${viewTeam === t ? "chip-on" : ""}`} onClick={() => setClub({ ...club, activeTeam: t })}>{t} ({players.filter((p) => p.team === t).length})</button>
          ))}
          <button className={`chip ${view === "__none" ? "chip-on" : ""}`} onClick={() => setClub({ ...club, activeTeam: "__none" })}>Ohne Team</button>
          <button className={`chip ${!viewTeam && view !== "__none" ? "chip-on" : ""}`} onClick={() => setClub({ ...club, activeTeam: "" })}>Alle</button>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Statistik:</span>
        {["alle", ...seasons].map((s) => (
          <button key={s} className={`chip ${seasonFilter === s ? "chip-on" : ""}`} onClick={() => setSeasonFilter(s)}>{s === "alle" ? "Alle Saisons" : s}</button>
        ))}
      </div>
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
        <button className="btn" disabled={!name.trim()}>Spieler hinzufügen{viewTeam ? ` zu ${viewTeam}` : ""}</button>
      </form>
      <ul className="mt-4 grid gap-2">
        {sorted.length === 0 && <p className="text-center text-muted-foreground">{viewTeam ? `Noch keine Spieler in ${viewTeam}.` : "Noch keine Spieler im Kader."}</p>}
        {sorted.map((p) => {
          const s = stats.find((x) => x.p.id === p.id);
          return (
          <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary font-display text-2xl text-primary-foreground">{p.number}</span>
            <div className="flex-1">
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-muted-foreground">{p.position}</p>
              {club.teams.length > 0 && (
                <select aria-label={`Team von ${p.name}`} className="field mt-1 h-8 py-0 text-sm" value={p.team && club.teams.includes(p.team) ? p.team : ""}
                  onChange={(e) => setPlayers(players.map((x) => (x.id === p.id ? { ...x, team: e.target.value } : x)))}>
                  <option value="">Ohne Team</option>
                  {club.teams.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
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

      <h2 className="mt-6 text-3xl">Spieltage-Archiv</h2>
      {seasons.map((s) => {
        const list = history.filter((m) => (m.season ?? season) === s);
        if (!list.length) return null;
        return (
          <div key={s} className="mt-2 rounded-xl border border-border bg-card p-3">
            <p className="font-semibold">Saison {s} · {list.length} Spiele · {list.filter((m) => { const w = setsWon(m.events, m.set); return w.us > w.them; }).length} Siege</p>
            <ul className="mt-1 grid gap-1 text-sm">
              {list.map((m) => { const w = setsWon(m.events, m.set); return (
                <li key={m.id} className="flex items-center gap-2">
                  <span className="text-muted-foreground">{m.date ? new Date(m.date).toLocaleDateString("de-DE") : ""}</span>
                  <span className="flex-1">{m.team || "Team"} – {m.opponent || "Gegner"}</span>
                  <b className={w.us > w.them ? "text-success" : "text-destructive"}>{w.us}:{w.them}</b>
                  <button aria-label="Spiel löschen" className="p-1 text-destructive" onClick={() => confirm("Spiel aus dem Archiv löschen?") && setHistory(history.filter((x) => x.id !== m.id))}><Trash2 className="h-4 w-4" /></button>
                </li>
              ); })}
            </ul>
          </div>
        );
      })}
      {history.length === 0 && <p className="mt-2 text-muted-foreground">Noch keine beendeten Spiele.</p>}

      <div className="mt-6 grid gap-2 rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Sichere alle Daten (Verein, Kader, Spiele, Taktik) als Datei, um sie über Jahre aufzubewahren oder auf ein anderes Gerät zu übertragen.</p>
        <div className="flex gap-2">
          <button className="btn flex-1" onClick={exportData}>Sicherung herunterladen</button>
          <label className="chip flex flex-1 cursor-pointer items-center justify-center">Sicherung laden<input type="file" accept="application/json" className="hidden" onChange={(e) => importData(e.target.files?.[0])} /></label>
        </div>
      </div>
    </div>
  );
}
