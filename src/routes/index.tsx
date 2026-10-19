import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Shapes, Trophy } from "lucide-react";

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
] as const;

function Index() {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">Volley Coach</p>
      <h1 className="mt-1 text-6xl leading-[0.9]">Dein Team.<br />Dein Spiel.</h1>
      <div className="mt-8 grid gap-3">
        {mods.map((m) => (
          <Link key={m.to} to={m.to} className="flex items-center gap-4 border border-border bg-card p-5 transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-accent">
            <div className="border-2 border-border bg-primary p-3 text-primary-foreground"><m.icon className="h-6 w-6" /></div>
            <div>
              <h2 className="text-2xl">{m.title}</h2>
              <p className="text-sm text-muted-foreground">{m.text}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
