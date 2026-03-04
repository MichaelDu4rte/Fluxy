"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LogoutButtonProps = {
  label?: string;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  iconOnly?: boolean;
};

export default function LogoutButton({
  label = "Sair",
  className,
  variant = "secondary",
  iconOnly = false,
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

  const content = loading ? "Saindo..." : label;
  const icon = loading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <LogOut className="h-4 w-4" />
  );

  const variantClasses =
    variant === "primary"
      ? "bg-[#b38c19] text-white shadow-[0px_4px_20px_-2px_rgba(179,140,25,0.1),0px_2px_6px_-2px_rgba(0,0,0,0.05)] hover:bg-[#9e7c16]"
      : variant === "secondary"
        ? "border border-[#e7e3da] bg-white text-[#171611] hover:bg-[#f2efe7]"
        : "border border-transparent bg-transparent text-[#877e64] hover:bg-[#ebe8de] hover:text-[#171611]";

  return (
    <div className="flex flex-col gap-2">
      <Button
        aria-label={content}
        onClick={handleLogout}
        disabled={loading}
        className={cn(
          iconOnly ? "h-10 w-10 rounded-full justify-center" : "h-12 w-full rounded-2xl",
          variantClasses,
          className,
        )}
      >
        {icon}
        {!iconOnly ? <span className="ml-2">{content}</span> : <span className="sr-only">{content}</span>}
      </Button>
      {error ? <p className="text-[11px] text-red-500">{error}</p> : null}
    </div>
  );
}
