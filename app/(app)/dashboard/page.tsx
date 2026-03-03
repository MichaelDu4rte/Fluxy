import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardMain from "@/components/dashboard/DashboardMain";
import { requireUser } from "@/src/lib/auth-guards";

export default async function DashboardPage() {
  const user = await requireUser({ currentPath: "/dashboard" });
  const userName = user.name?.trim() || user.email?.split("@")[0] || "Aureum";
  const userEmail = user.email || "premium@aureum.app";

  return (
    <DashboardLayout userName={userName} userEmail={userEmail} activeNavId="dashboard">
      <DashboardMain />
    </DashboardLayout>
  );
}
