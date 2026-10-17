export type CloudRole = "admin" | "trainer" | null;
export const SHARED_KEYS = ["vb-club", "vb-players", "vb-match", "vb-history", "vb-plays"] as const;
export function canEditKey(role: CloudRole, key: string) {
  return role === "admin" || (role === "trainer" && ["vb-match", "vb-history", "vb-plays"].includes(key));
}