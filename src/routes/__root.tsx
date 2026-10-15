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
import { Users, Shapes, Trophy, Home } from "lucide-react";

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
        <button className="btn mt-6" onClick={() => { router.invalidate(); reset(); }}>Erneut versuchen</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Volley Coach" },
      { name: "description", content: "Kader, Taktik und Live-Statistik für dein Volleyballteam." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Bebas+Neue&display=swap" },
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="mx-auto min-h-screen max-w-3xl px-4 pb-28 pt-6">
        <Outlet />
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: true }}
              className="flex flex-1 flex-col items-center gap-1 py-3 text-xs text-muted-foreground"
              activeProps={{ className: "text-primary" }}
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
