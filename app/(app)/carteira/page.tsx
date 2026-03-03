import DashboardLayout from "@/components/dashboard/DashboardLayout";
import WalletMain from "@/components/wallet/WalletMain";
import { requireUser } from "@/src/lib/auth-guards";

export default async function CarteiraPage() {
  const user = await requireUser({ currentPath: "/carteira" });
  const userName = user.name?.trim() || user.email?.split("@")[0] || "Aureum";
  const userEmail = user.email || "premium@aureum.app";

  return (
    <DashboardLayout userName={userName} userEmail={userEmail} activeNavId="wallet">
      <WalletMain />
    </DashboardLayout>
  );
}
