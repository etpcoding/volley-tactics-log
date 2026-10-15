import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStored, EMPTY_PLAYERS, EMPTY_MATCH, EMPTY_HISTORY, allMatches, type Match, type Player } from "@/lib/store";
import { setScore, setsWon } from "@/lib/volley";
import { playerStats, tally } from "@/lib/stats";

export const Route = createFileRoute("/auswertung")({
  head: () => ({
    meta: [
      { title: "Auswertung – Volley Coach" },
      { name: "description", content: "Grafische Spielauswertung: wer gespielt hat, wer gepunktet hat und welche Fehler passiert sind." },
      { property: "og:title", content: "Auswertung – Volley Coach" },
      { property: "og:description", content: "Nach dem Spiel sehen, wo sich das Team verbessern kann." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auswertung,
});

function Auswertung() {
  const [players] = useStored<Player[]>("vb-players", EMPTY_PLAYERS);
  const [current] = useStored<Match>("vb-match", EMPTY_MATCH);
  const [history] = useStored<Match[]>("vb-history", EMPTY_HISTORY);
  const matches = allMatches(current, history);
  const [sel, setSel] = useState<string>("0");
  const m = matches[Number(sel)];

  if (!m) return <div><h1 className="text-5xl">Auswertung</h1><p className="mt-4 text-muted-foreground">Noch kein Spiel erfasst. Trage zuerst unter „Spieltag“ Punkte ein.</p></div>;

  const won = setsWon(m.events, m.set);
  const stats = playerStats(players, [m]).filter((s) => s.games);
  const errTypes = tally([m], "error", "how");
  const techs = tally([m], "point", "technique");
  const pointHow = tally([m], "point", "how");
  const ourErr = m.events.filter((e) => e.kind === "error").length;
  const ourPts = m.events.filter((e) => e.kind === "point").length;
  const oppPts = m.events.length - ourPts;
  const worst = [...stats].sort((a, b) => b.err - a.err)[0];
  const topErr = errTypes[0];

  return (
    <div>
      <h1 className="text-5xl">Auswertung</h1>
      <select className="field mt-3" value={sel} onChange={(e) => setSel(e.target.value)}>
        {matches.map((x, i) => {
          const w = setsWon(x.events, x.set);
          return <option key={x.id ?? i} value={i}>{x.team ? `${x.team} – ` : ""}{x.opponent || "Gegner"} · {x.season ? `${x.season} · ` : ""}{w.us}:{w.them}{x.finished ? "" : " (läuft)"}{x.date ? ` · ${new Date(x.date).toLocaleDateString("de-DE")}` : ""}</option>;
        })}
      </select>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Kpi label="Sätze" value={`${won.us}:${won.them}`} />
        <Kpi label="Punkte" value={`${ourPts}:${oppPts}`} />
        <Kpi label="Eigene Fehler" value={String(ourErr)} hint={oppPts ? `${Math.round((ourErr / oppPts) * 100)}% der Gegnerpunkte` : undefined} />
      </div>

      {(topErr || worst?.err) && (
        <div className="mt-3 rounded-xl border border-primary bg-card p-4 text-sm">
          <h2 className="text-2xl">Verbesserungspotenzial</h2>
          {topErr && <p>Häufigster Fehler: <b>{topErr[0]}</b> ({topErr[1]}×) – gezielt im Training üben.</p>}
          {worst && worst.err > 0 && <p>Meiste Fehler: <b>#{worst.p.number} {worst.p.name}</b> ({worst.err}).</p>}
        </div>
      )}

      <Card title="Punkteverlauf pro Satz">
        {Array.from({ length: m.set }, (_, i) => i + 1).map((s) => <SetLine key={s} m={m} set={s} />)}
      </Card>

      <Card title="Wer hat gespielt – Punkte & Fehler">
        {stats.length === 0 ? <Empty /> : (
          <div className="grid gap-2">
            {stats.sort((a, b) => b.pts - a.pts).map((s) => {
              const max = Math.max(1, ...stats.map((x) => Math.max(x.pts, x.err)));
              return (
                <div key={s.p.id} className="text-sm">
                  <div className="flex justify-between"><span>#{s.p.number} {s.p.name}</span><span><span className="text-success">{s.pts}</span> / <span className="text-destructive">{s.err}</span></span></div>
                  <div className="mt-0.5 h-2 rounded bg-success" style={{ width: `${(s.pts / max) * 100}%` }} />
                  <div className="mt-0.5 h-2 rounded bg-destructive" style={{ width: `${(s.err / max) * 100}%` }} />
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground"><span className="text-success">■</span> Punkte <span className="ml-2 text-destructive">■</span> Fehler</p>
          </div>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card title="Fehlerarten"><Bars rows={errTypes} cls="bg-destructive" /></Card>
        <Card title="Wie gepunktet"><Bars rows={pointHow} cls="bg-success" /></Card>
        <Card title="Angriffstechniken"><Bars rows={techs} cls="bg-primary" /></Card>
      </div>
    </div>
  );
}

function SetLine({ m, set }: { m: Match; set: number }) {
  const ev = m.events.filter((e) => e.set === set);
  const sc = setScore(m.events, set);
  let d = 0;
  const pts = [0, ...ev.map((e) => (d += e.kind === "point" ? 1 : -1))];
  const max = Math.max(3, ...pts.map(Math.abs));
  const w = 300, h = 60;
  const path = pts.map((v, i) => `${i ? "L" : "M"}${(i / Math.max(1, pts.length - 1)) * w},${h / 2 - (v / max) * (h / 2 - 4)}`).join(" ");
  return (
    <div className="mb-2">
      <p className="text-sm">Satz {set}: <b>{sc.us}:{sc.them}</b></p>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" preserveAspectRatio="none">
        <line x1="0" x2={w} y1={h / 2} y2={h / 2} className="stroke-border" strokeDasharray="4 4" />
        <path d={path} fill="none" className="stroke-primary" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="text-xs text-muted-foreground">Oberhalb der Linie: wir führen</p>
    </div>
  );
}

function Bars({ rows, cls }: { rows: [string, number][]; cls: string }) {
  if (!rows.length) return <Empty />;
  const max = Math.max(...rows.map((r) => r[1]));
  return <div className="grid gap-1.5">{rows.map(([k, v]) => (
    <div key={k} className="text-sm">
      <div className="flex justify-between"><span>{k}</span><b>{v}</b></div>
      <div className={`h-2 rounded ${cls}`} style={{ width: `${(v / max) * 100}%` }} />
    </div>
  ))}</div>;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-3 rounded-xl border border-border bg-card p-4"><h2 className="mb-2 text-2xl">{title}</h2>{children}</div>;
}
function Kpi({ label, value, hint }: { label: string; value: string; hint?: string | undefined }) {
  return <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-display text-3xl">{value}</p>{hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}</div>;
}
const Empty = () => <p className="text-sm text-muted-foreground">Keine Daten.</p>;
