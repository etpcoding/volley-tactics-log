import { useSyncExternalStore } from "react";

export type Player = { id: string; name: string; number: number; position: string };
export type MatchEvent = {
  id: string;
  set: number;
  side: "us" | "them";
  kind: "point" | "error" | "opp";
  playerId?: string | undefined;
  how?: string | undefined;
  technique?: string | undefined;
  at: number;
};
export type Match = {
  id?: string;
  opponent: string;
  set: number;
  events: MatchEvent[];
  roster?: string[];
  timeouts?: { set: number; side: "us" | "them" }[];
  finished?: boolean;
  date?: number;
};
export type Token = { id: string; label: string; x: number; y: number; team: "us" | "them"; playerId?: string };
export type Play = { id: string; name: string; notes: string; tokens: Token[]; system?: string; rotation?: number };

const cache = new Map<string, unknown>();
const listeners = new Set<() => void>();

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  if (cache.has(key)) return cache.get(key) as T;
  let v = fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) v = JSON.parse(raw);
  } catch {}
  cache.set(key, v);
  return v;
}

export function write<T>(key: string, value: T) {
  cache.set(key, value);
  localStorage.setItem(key, JSON.stringify(value));
  listeners.forEach((l) => l());
}

export function useStored<T>(key: string, fallback: T): [T, (v: T) => void] {
  const v = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => read(key, fallback),
    () => fallback,
  );
  return [v, (nv: T) => write(key, nv)];
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export const POSITIONS = ["Zuspiel", "Außenangriff", "Mittelblock", "Diagonal", "Libero"];
export const POINT_HOW = ["Angriff", "Aufschlag-Ass", "Block", "Gegnerfehler"];
export const TECHNIQUES = ["Schmetterball", "Finte", "Lob / Leger", "Shot", "Pipe", "Schnellangriff", "Blockout", "Lang-Diagonal", "Linie"];
export const ERRORS = ["Aufschlagfehler", "Annahmefehler", "Angriff ins Aus", "Angriff ins Netz", "Geblockt", "Netzberührung", "Übertritt", "Doppelberührung", "Abwehrfehler", "Rotationsfehler"];

export const EMPTY_PLAYERS: Player[] = [];
export const EMPTY_MATCH: Match = { opponent: "", set: 1, events: [] };
export const EMPTY_PLAYS: Play[] = [];
export const EMPTY_HISTORY: Match[] = [];

/** Current match (if it has events) plus all finished matches, newest first, without duplicates. */
export function allMatches(current: Match, history: Match[]): Match[] {
  const list = history.filter((h) => h.id !== current.id);
  return current.events.length ? [current, ...list] : list;
}
