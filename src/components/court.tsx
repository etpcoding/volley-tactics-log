import type { Player, Token } from "@/lib/store";

// Court positions I..VI on our half (top = net)
export const POS: [number, number][] = [[80, 78], [80, 25], [50, 25], [20, 25], [20, 78], [50, 78]];
export const POS_NAME = ["I", "II", "III", "IV", "V", "VI"];

export const SYSTEMS: Record<string, { label: string; info: string; roles: string[] }> = {
  "5:1": { label: "5:1 (ein Läufer)", info: "Ein Zuspieler (Läufer) spielt in allen Rotationen zu, Diagonal steht ihm gegenüber.", roles: ["Z", "A1", "M1", "D", "A2", "M2"] },
  "4:2": { label: "4:2", info: "Zwei Zuspieler, gespielt wird immer vom Zuspieler aus der Vorderreihe.", roles: ["Z1", "A1", "M1", "Z2", "A2", "M2"] },
  "6:2": { label: "6:2 (zwei Läufer)", info: "Zwei Läufer, zugespielt wird vom Zuspieler aus der Hinterreihe – vorne immer drei Angreifer.", roles: ["Z1", "A1", "M1", "Z2", "A2", "M2"] },
  "6:0": { label: "6:0", info: "Wer auf Position III / II steht, spielt zu – ideal für Anfänger.", roles: ["A", "A", "Z", "A", "A", "A"] },
};

export function rolesFor(system: string, rotation: number) {
  const base = SYSTEMS[system]?.roles ?? [];
  return POS.map((_, i) => base[(i + rotation - 1) % 6] ?? "");
}

/** Home slot of a token; older saves without `home` use the nearest slot. */
export function homeOf(t: Token): number {
  if (t.home !== undefined) return t.home;
  let best = 0, bd = Infinity;
  POS.forEach(([x, y], i) => { const d = Math.hypot(x - t.x, y - t.y); if (d < bd) { bd = d; best = i; } });
  return best;
}

/** Court with slots, dashed lines to home positions and player tokens. */
export function Court({ tokens, players, roles, onTokenDown, innerRef, small }: {
  tokens: Token[]; players: Player[]; roles: string[];
  onTokenDown?: (p: Player) => (e: React.PointerEvent) => void;
  innerRef?: React.Ref<HTMLDivElement>; small?: boolean;
}) {
  return (
    <div ref={innerRef} className={`relative mx-auto aspect-square touch-none select-none rounded-md border-4 border-t-0 border-court-line bg-court ${small ? "max-w-xs" : "max-h-[60vh]"}`}>
      <div className="absolute inset-x-0 top-0 h-2 bg-court-line" aria-label="Netz" />
      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-court-line/70" />
      {POS.map(([x, y], i) => (
        <div key={i} style={{ left: `${x}%`, top: `${y}%` }} className={`pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-dashed border-court-line/80 text-court-line ${small ? "h-9 w-9" : "h-14 w-14"}`}>
          <span className={`font-display leading-none ${small ? "text-xs" : "text-lg"}`}>{roles[i]}</span>
          <span className="text-[10px]">{POS_NAME[i]}</span>
        </div>
      ))}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {tokens.map((t) => {
          const [hx, hy] = POS[homeOf(t)]!;
          if (Math.hypot(hx - t.x, hy - t.y) < 1) return null;
          return <line key={t.id} x1={t.x} y1={t.y} x2={hx} y2={hy} stroke="var(--court-line)" strokeWidth={1.5} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      {tokens.map((k) => {
        const p = players.find((x) => x.id === k.playerId);
        if (!p) return null;
        return (
          <div key={k.id} onPointerDown={onTokenDown?.(p)} style={{ left: `${k.x}%`, top: `${k.y}%` }}
            className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-court-line bg-primary text-primary-foreground shadow-lg ${onTokenDown ? "cursor-grab" : ""} ${small ? "h-9 w-9" : "h-12 w-12"}`}>
            <span className={`font-display leading-none ${small ? "text-sm" : "text-xl"}`}>{p.number}</span>
            {!small && <span className="max-w-11 truncate text-[9px]">{p.name}</span>}
          </div>
        );
      })}
    </div>
  );
}
