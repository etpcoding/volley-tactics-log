import { describe, it, expect } from "vitest";
import { teamPlayers, type Player } from "./store";

const ps: Player[] = [
  { id: "a", name: "A", number: 1, position: "Libero", team: "Herren 1" },
  { id: "b", name: "B", number: 2, position: "Libero", team: "Damen 1" },
];
describe("Teams", () => {
  it("Team-Kader enthält nur Spieler dieses Teams", () => {
    expect(teamPlayers(ps, "Herren 1").map((p) => p.id)).toEqual(["a"]);
  });
  it("ohne Team werden alle Spieler gezeigt", () => {
    expect(teamPlayers(ps).length).toBe(2);
  });
  it("ein leeres Team übernimmt keine fremden Spieler", () => {
    expect(teamPlayers(ps, "Herren 2")).toEqual([]);
  });
});
