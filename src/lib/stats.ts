import type { Match, Player } from "./store";

export type PlayerStat = { p: Player; games: number; pts: number; err: number; aces: number; blocks: number; kills: number };

export function playerStats(players: Player[], matches: Match[]): PlayerStat[] {
  return players.map((p) => {
    let games = 0, pts = 0, err = 0, aces = 0, blocks = 0, kills = 0;
    for (const m of matches) {
      const ev = m.events.filter((e) => e.playerId === p.id);
      if ((m.roster ?? []).includes(p.id) || ev.length) games++;
      for (const e of ev) {
        if (e.kind === "error") err++;
        if (e.kind === "point") {
          pts++;
          if (e.how === "Aufschlag-Ass") aces++;
          if (e.how === "Block") blocks++;
          if (e.how === "Angriff") kills++;
        }
      }
    }
    return { p, games, pts, err, aces, blocks, kills };
  });
}

export function tally(matches: Match[], kind: "point" | "error", key: "how" | "technique") {
  const m: Record<string, number> = {};
  for (const x of matches) for (const e of x.events) if (e.kind === kind && e[key]) m[e[key]!] = (m[e[key]!] ?? 0) + 1;
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
