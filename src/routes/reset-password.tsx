import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Passwort zurücksetzen – Volley Coach" },
      { name: "description", content: "Neues Passwort für dein Volley-Coach-Konto festlegen." },
      { property: "og:title", content: "Passwort zurücksetzen – Volley Coach" },
      { property: "og:description", content: "Neues Passwort festlegen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) setMsg(error.message); else void navigate({ to: "/konto" });
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <h1 className="text-4xl">Neues Passwort</h1>
      <input className="w-full rounded-md border border-border bg-background px-3 py-2" type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Neues Passwort" />
      <Button type="submit">Speichern</Button>
      {msg && <p className="text-sm text-destructive">{msg}</p>}
    </form>
  );
}
