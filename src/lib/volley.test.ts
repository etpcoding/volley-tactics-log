import { describe, it, expect } from "vitest";
import { setWinner, applyEvent } from "./volley";
import type { Match, MatchEvent } from "./store";

const ev = (set: number, ours: boolean): MatchEvent => ({ id: Math.random().toString(), set, side: ours ? "us" : "them", kind: ours ? "point" : "opp", at: 0 });

describe("Satzregeln", () => {
  it("Satz endet bei 25 mit 2 Punkten Vorsprung", () => {
    expect(setWinner(25, 23, 1)).toBe("us");
    expect(setWinner(25, 24, 1)).toBeNull();
    expect(setWinner(26, 28, 2)).toBe("them");
  });
  it("Tie-Break geht bis 15", () => {
    expect(setWinner(15, 13, 5)).toBe("us");
    expect(setWinner(15, 13, 4)).toBeNull();
  });
  it("Satz wechselt automatisch und Spiel endet nach 3 Gewinnsätzen", () => {
    let m: Match = { opponent: "", set: 1, events: [] };
    for (let s = 0; s < 3; s++) for (let i = 0; i < 25; i++) m = applyEvent(m, ev(m.set, true));
    expect(m.finished).toBe(true);
    expect(m.set).toBe(3);
  });
});
