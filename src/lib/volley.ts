import type { Match, MatchEvent } from "./store";

/** Sets 1–4 go to 25, the 5th (tie-break) to 15; always 2 points ahead. Best of five. */
export const setTarget = (set: number) => (set >= 5 ? 15 : 25);
export const SETS_TO_WIN = 3;
export const TIMEOUTS_PER_SET = 2;

export function setWinner(us: number, them: number, set: number): "us" | "them" | null {
  const t = setTarget(set);
  if (us >= t && us - them >= 2) return "us";
  if (them >= t && them - us >= 2) return "them";
  return null;
}

export const isOurs = (e: MatchEvent) => e.kind === "point";

export function setScore(events: MatchEvent[], set: number) {
  const ev = events.filter((e) => e.set === set);
  const us = ev.filter(isOurs).length;
  return { us, them: ev.length - us };
}

export function setsWon(events: MatchEvent[], uptoSet: number) {
  let us = 0, them = 0;
  for (let s = 1; s <= uptoSet; s++) {
    const sc = setScore(events, s);
    const w = setWinner(sc.us, sc.them, s);
    if (w === "us") us++;
    if (w === "them") them++;
  }
  return { us, them };
}

/** Applies a new rally and advances the set / ends the match automatically. */
export function applyEvent(match: Match, ev: MatchEvent): Match {
  const events = [...match.events, ev];
  const sc = setScore(events, match.set);
  const w = setWinner(sc.us, sc.them, match.set);
  if (!w) return { ...match, events };
  const won = setsWon(events, match.set);
  if (won.us >= SETS_TO_WIN || won.them >= SETS_TO_WIN) return { ...match, events, finished: true };
  return { ...match, events, set: match.set + 1 };
}

export function undoEvent(match: Match): Match {
  const last = match.events[match.events.length - 1];
  if (!last) return match;
  return { ...match, events: match.events.slice(0, -1), set: last.set, finished: false };
}

/** Team that serves next: winner of the last rally of the current set; set 1 starts with us. */
export function server(match: Match): "us" | "them" {
  const ev = match.events.filter((e) => e.set === match.set);
  const last = ev[ev.length - 1];
  if (last) return isOurs(last) ? "us" : "them";
  return match.set % 2 === 1 ? "us" : "them";
}
