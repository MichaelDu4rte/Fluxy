"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setError(null);
    setLoading(true);

    try {
      const result = await signOut();

      if (result?.error) {
        setError(result.error.message || "Falha ao sair da conta");
      } else {
        router.push("/signin");
      }
    } catch {
      setError("Ocorreu um erro ao sair da conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleLogout} disabled={loading}>
        {loading ? "Saindo..." : "Sair"}
      </Button>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
