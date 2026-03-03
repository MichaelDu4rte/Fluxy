import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ExpensesMain from "@/components/expenses/ExpensesMain";
import { requireUser } from "@/src/lib/auth-guards";

export default async function TransacoesPage() {
  const user = await requireUser({ currentPath: "/transacoes" });
  const userName = user.name?.trim() || user.email?.split("@")[0] || "Aureum";
  const userEmail = user.email || "premium@aureum.app";

  return (
    <DashboardLayout userName={userName} userEmail={userEmail} activeNavId="expenses">
      <ExpensesMain />
    </DashboardLayout>
  );
}
