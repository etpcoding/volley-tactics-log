import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Users, Shapes, Trophy, BarChart3, Home, UserCircle } from "lucide-react";
import { CloudProvider, useCloud } from "@/components/cloud-provider";
import { Button } from "@/components/ui/button";

import logo from "@/assets/vc-haslach-logo.webp.asset.json";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-7xl text-primary">404</h1>
        <p className="mt-2 text-muted-foreground">Seite nicht gefunden.</p>
        <Link to="/" className="btn mt-6 inline-block">Zur Startseite</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-3xl">Etwas ist schiefgelaufen</h1>
        <Button className="mt-6" onClick={() => { router.invalidate(); reset(); }}>Erneut versuchen</Button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VC 94 Haslach · Volley Coach" },
      { name: "description", content: "Kader, Taktik und Live-Statistik für dein Volleyballteam." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

const tabs = [
  { to: "/", label: "Start", icon: Home },
  { to: "/kader", label: "Kader", icon: Users },
  { to: "/taktik", label: "Taktik", icon: Shapes },
  { to: "/spieltag", label: "Spieltag", icon: Trophy },
  { to: "/auswertung", label: "Auswertung", icon: BarChart3 },
] as const;

function AccountLink() {
  const { user, role } = useCloud();
  return (
    <header className="border-b border-border bg-card">
    <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link to="/" className="flex items-center gap-3">
        <img src={logo.url} alt="VC 94 Haslach" className="h-12 w-auto" />
        <span className="leading-tight"><span className="block font-display text-base font-extrabold text-primary sm:text-lg">VC 94 Haslach</span><span className="mt-1 block text-xs text-muted-foreground">Volley Coach</span></span>
      </Link>
      <Link to="/konto" aria-label={user ? "Mein Konto" : "Anmelden"} className="flex shrink-0 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-accent">
        <UserCircle className="h-4 w-4" />
        <span className="hidden sm:inline">{user ? role === "admin" ? "Eigentümer" : role === "trainer" ? "Trainer" : "Mein Konto" : "Anmelden"}</span>
      </Link>
    </div>
    <nav aria-label="Hauptnavigation" className="mx-auto hidden max-w-5xl gap-7 px-6 md:flex">
      {tabs.map((t) => <Link key={t.to} to={t.to} activeOptions={{ exact: true }} className="flex items-center gap-2 border-b-2 border-transparent py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary" activeProps={{ className: "border-primary text-primary" }}><t.icon className="h-4 w-4" />{t.label}</Link>)}
    </nav>
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
        <CloudProvider>
          <AccountLink />
          <main className="mx-auto min-h-screen max-w-5xl px-4 pb-28 pt-7 sm:px-6 md:pb-12 md:pt-9">
          <Outlet />
          </main>
        </CloudProvider>
      <nav aria-label="Mobile Navigation" className="app-bottom-nav fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card md:hidden">
        <div className="mx-auto flex max-w-3xl">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: true }}
              className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground"
              activeProps={{ className: "bg-accent text-primary font-bold" }}
            >
              <t.icon className="h-5 w-5" />
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </QueryClientProvider>
  );
}
