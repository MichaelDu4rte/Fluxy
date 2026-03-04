import DashboardLayout from "@/components/dashboard/DashboardLayout";
import TelegramIntegrationMain from "@/components/integrations/TelegramIntegrationMain";
import { requireUser } from "@/src/lib/auth-guards";

export default async function IntegracoesTelegramPage() {
  const user = await requireUser({ currentPath: "/integracoes/telegram" });
  const userName = user.name?.trim() || user.email?.split("@")[0] || "Aureum";
  const userEmail = user.email || "premium@aureum.app";

  return (
    <DashboardLayout userName={userName} userEmail={userEmail} activeNavId="settings">
      <TelegramIntegrationMain />
    </DashboardLayout>
  );
}
