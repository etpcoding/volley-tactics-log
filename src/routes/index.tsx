import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Shapes, Trophy, ArrowUpRight, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Volley Coach – Dein Volleyball-Teamassistent" },
      { name: "description", content: "Kaderübersicht, Taktikboard und Live-Punkteerfassung für Volleyballtrainer." },
      { property: "og:title", content: "Volley Coach" },
      { property: "og:description", content: "Kader, Taktik und Spieltag-Statistik für dein Volleyballteam." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const mods = [
  { to: "/kader", title: "Kader", text: "Spieler hinzufügen, Positionen & Nummern verwalten.", icon: Users },
  { to: "/taktik", title: "Taktik", text: "Aufstellungen auf dem Feld planen und Spielzüge besprechen.", icon: Shapes },
  { to: "/spieltag", title: "Spieltag", text: "Punkte, Fehler und Angriffstechniken live erfassen.", icon: Trophy },
  { to: "/auswertung", title: "Auswertung", text: "Spiele, Leistungen und Statistiken im Überblick.", icon: BarChart3 },
] as const;

function Index() {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">VC 94 Haslach</p>
      <h1 className="page-heading mt-2">Dein Team. Dein Spiel.</h1>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {mods.map((m) => (
          <Link key={m.to} to={m.to} className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary hover:bg-accent/40">
            <div className="mb-6 flex items-center justify-between"><div className="rounded-md bg-accent p-3 text-primary"><m.icon className="h-6 w-6" /></div><ArrowUpRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" /></div>
            <div>
              <h2 className="text-xl">{m.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.text}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
