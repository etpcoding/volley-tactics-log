import { describe, expect, it } from "vitest";
import { canEditKey } from "./cloud-permissions";
describe("Cloud permissions", () => {
  it("only owner can change roster and club", () => {
    expect(canEditKey("admin", "vb-players")).toBe(true);
    expect(canEditKey("trainer", "vb-players")).toBe(false);
    expect(canEditKey(null, "vb-players")).toBe(false);
    expect(canEditKey("trainer", "vb-club")).toBe(false);
  });
  it("approved trainers can edit matches and tactics", () => {
    for (const key of ["vb-match", "vb-history", "vb-plays"]) expect(canEditKey("trainer", key)).toBe(true);
  });
  it("visitors cannot write shared data", () => {
    for (const key of ["vb-club", "vb-players", "vb-match", "vb-history", "vb-plays"]) expect(canEditKey(null, key)).toBe(false);
  });
});