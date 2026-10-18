import { describe, expect, it } from "vitest";
import { canEditKey } from "./cloud-permissions";
describe("Cloud permissions", () => {
  it("only owner can change roster and club", () => {
    expect(canEditKey("admin", "vb-players")).toBe(true);
    expect(canEditKey("trainer", "vb-players")).toBe(false);
    expect(canEditKey(null, "vb-players")).toBe(false);
    expect(canEditKey("trainer", "vb-club")).toBe(false);
  });
  it("every signed-in user can enter matches", () => {
    expect(canEditKey("trainer", "vb-match")).toBe(true);
    expect(canEditKey("trainer", "vb-history")).toBe(true);
    expect(canEditKey(null, "vb-match")).toBe(false);
  });
  it("approved trainers can edit tactics", () => {
    expect(canEditKey("trainer", "vb-plays")).toBe(true);
    expect(canEditKey("admin", "vb-plays")).toBe(true);
  });
  it("visitors cannot write shared data", () => {
    for (const key of ["vb-club", "vb-players", "vb-match", "vb-history", "vb-plays"]) expect(canEditKey(null, key)).toBe(false);
  });
});
