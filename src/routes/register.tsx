import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, AuthField, AuthMessage, AuthSubmit, ruError } from "@/components/budget/AuthCard";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Регистрация — Баланс" },
      { name: "description", content: "Создайте аккаунт в личном бюджете «Баланс»." },
      { property: "og:title", content: "Регистрация — Баланс" },
      { property: "og:description", content: "Создайте аккаунт в личном бюджете «Баланс»." },
    ],
  }),
  component: Register,
});

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== repeat) return setError("Пароли не совпадают.");
    if (password.length < 6) return setError("Пароль должен быть не короче 6 символов.");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return setError(ruError(error.message));
    setInfo("Готово! Проверьте почту и подтвердите email по ссылке из письма.");
  }

  return (
    <AuthCard title="Регистрация" subtitle="Данные хранятся только в вашем аккаунте">
      <form onSubmit={submit} className="space-y-3">
        <AuthField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <AuthField label="Пароль" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
        <AuthField label="Повтор пароля" type="password" value={repeat} onChange={setRepeat} autoComplete="new-password" />
        <AuthMessage error={error} info={info} />
        <AuthSubmit busy={busy}>Создать аккаунт</AuthSubmit>
      </form>
      <div className="mt-4 flex justify-between text-xs">
        <Link to="/forgot-password" className="text-muted-foreground underline">
          Забыли пароль?
        </Link>
        <Link to="/login" className="font-semibold underline">
          Уже есть аккаунт
        </Link>
      </div>
    </AuthCard>
  );
}
