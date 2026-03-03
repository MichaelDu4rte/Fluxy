"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LogoutButtonProps = {
  label?: string;
  className?: string;
  variant?: "primary" | "secondary";
};

export default function LogoutButton({
  label = "Sair",
  className,
  variant = "secondary",
}: LogoutButtonProps) {
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
      <Button
        onClick={handleLogout}
        disabled={loading}
        className={cn(
          "w-full",
          variant === "primary"
            ? "h-12 rounded-2xl bg-[#b38c19] text-white shadow-[0px_4px_20px_-2px_rgba(179,140,25,0.1),0px_2px_6px_-2px_rgba(0,0,0,0.05)] hover:bg-[#9e7c16]"
            : "h-12 rounded-2xl border border-[#e7e3da] bg-white text-[#171611] hover:bg-[#f2efe7]",
          className,
        )}
      >
        {loading ? "Saindo..." : label}
      </Button>
      {error ? <p className="text-[11px] text-red-500">{error}</p> : null}
    </div>
  );
}
