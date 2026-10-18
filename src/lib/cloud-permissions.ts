export type CloudRole = "admin" | "trainer" | null;
export const SHARED_KEYS = ["vb-club", "vb-players", "vb-match", "vb-history", "vb-plays"] as const;
export function canEditKey(role: CloudRole, key: string) {
  if (key === "vb-match" || key === "vb-history") return role !== null;
  return role === "admin" || (role === "trainer" && key === "vb-plays");
}
