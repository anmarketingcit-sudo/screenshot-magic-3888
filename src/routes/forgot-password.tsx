import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, AuthField, AuthMessage, AuthSubmit, ruError } from "@/components/budget/AuthCard";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Сброс пароля — Баланс" },
      { name: "description", content: "Получите ссылку для сброса пароля на email." },
      { property: "og:title", content: "Сброс пароля — Баланс" },
      { property: "og:description", content: "Получите ссылку для сброса пароля на email." },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return setError(ruError(error.message));
    setInfo("Если такой аккаунт есть, ссылка для сброса уже в почте.");
  }

  return (
    <AuthCard title="Забыли пароль?" subtitle="Пришлём ссылку на email">
      <form onSubmit={submit} className="space-y-3">
        <AuthField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <AuthMessage error={error} info={info} />
        <AuthSubmit busy={busy}>Отправить ссылку</AuthSubmit>
      </form>
      <Link to="/login" className="mt-4 block text-xs underline">
        Вернуться ко входу
      </Link>
    </AuthCard>
  );
}
