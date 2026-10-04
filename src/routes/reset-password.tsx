import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, AuthField, AuthMessage, AuthSubmit, ruError } from "@/components/budget/AuthCard";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Новый пароль — Баланс" },
      { name: "description", content: "Задайте новый пароль для входа в «Баланс»." },
      { property: "og:title", content: "Новый пароль — Баланс" },
      { property: "og:description", content: "Задайте новый пароль для входа в «Баланс»." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== repeat) return setError("Пароли не совпадают.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(ruError(error.message));
    navigate({ to: "/" });
  }

  return (
    <AuthCard title="Новый пароль">
      <form onSubmit={submit} className="space-y-3">
        <AuthField label="Новый пароль" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
        <AuthField label="Повтор пароля" type="password" value={repeat} onChange={setRepeat} autoComplete="new-password" />
        <AuthMessage error={error} />
        <AuthSubmit busy={busy}>Сохранить</AuthSubmit>
      </form>
    </AuthCard>
  );
}
