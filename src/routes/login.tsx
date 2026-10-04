import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, AuthField, AuthMessage, AuthSubmit, ruError } from "@/components/budget/AuthCard";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Вход — Баланс" },
      { name: "description", content: "Войдите в личный бюджет «Баланс»." },
      { property: "og:title", content: "Вход — Баланс" },
      { property: "og:description", content: "Войдите в личный бюджет «Баланс»." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(ruError(error.message));
    navigate({ to: "/" });
  }

  async function forgot() {
    setError(null);
    if (!email) return setError("Введите email, чтобы получить ссылку для сброса.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return setError(ruError(error.message));
    setInfo("Ссылка для сброса пароля отправлена на почту.");
  }

  return (
    <AuthCard title="Вход" subtitle="Личный бюджет в тенге">
      <form onSubmit={submit} className="space-y-3">
        <AuthField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <AuthField label="Пароль" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        <AuthMessage error={error} info={info} />
        <AuthSubmit busy={busy}>Войти</AuthSubmit>
      </form>
      <div className="mt-4 flex justify-between text-xs">
        <button type="button" onClick={forgot} className="text-muted-foreground underline">
          Забыли пароль?
        </button>
        <Link to="/register" className="font-semibold underline">
          Регистрация
        </Link>
      </div>
    </AuthCard>
  );
}
