
import { requireUser } from "@/src/lib/auth-guards";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth-client";

export default async function DashboardPage() {
    const user = await requireUser({ currentPath: "/dashboard" });
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogout = async () => {
        setError(null);
        setLoading(true);
        try {
            const result = await signOut();

            if (result?.error) {
                setError(result.error.message || "Falha ao sair da conta");
            } else {
                router.push("/signin");
            }
        } catch (err) {
            setError("Ocorreu um erro ao sair da conta");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1>Dashboard</h1>
            <p>Bem-vindo, {user.email ?? user.id}</p>
            <div className="mt-4 flex flex-col gap-2">
                <Button onClick={handleLogout} disabled={loading}>
                    {loading ? "Saindo..." : "Sair"}
                </Button>
                {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
        </div>
    );
}
