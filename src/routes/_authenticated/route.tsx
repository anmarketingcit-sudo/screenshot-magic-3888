import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BudgetProvider } from "@/lib/budget/store";
import { AppShell } from "@/components/budget/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  return (
    <BudgetProvider userId={user.id}>
      <AppShell email={user.email ?? ""}>
        <Outlet />
      </AppShell>
    </BudgetProvider>
  );
}
