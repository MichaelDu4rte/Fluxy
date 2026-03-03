import { requireUser } from "@/src/lib/auth-guards";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
  const user = await requireUser({ currentPath: "/dashboard" });

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Bem-vindo, {user.email ?? user.id}</p>
      <div className="mt-4">
        <LogoutButton />
      </div>
    </div>
  );
}
