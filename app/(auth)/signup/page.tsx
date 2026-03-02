"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth-client";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";

type PasswordStrength = {
  label: string;
  progress: number;
  toneClassName: string;
  barClassName: string;
};

type PasswordValidation = {
  isValid: boolean;
  missingRequirements: string[];
};

function validatePasswordRequirements(password: string): PasswordValidation {
  const missingRequirements: string[] = [];

  if (password.length < 8) {
    missingRequirements.push("minimo de 8 caracteres");
  }
  if (!/[A-Za-z]/.test(password)) {
    missingRequirements.push("ao menos 1 letra");
  }
  if (!/\d/.test(password)) {
    missingRequirements.push("ao menos 1 numero");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    missingRequirements.push("ao menos 1 caractere especial");
  }

  return {
    isValid: missingRequirements.length === 0,
    missingRequirements,
  };
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      label: "Digite uma senha",
      progress: 0,
      toneClassName: "text-stone-400",
      barClassName: "bg-stone-400",
    };
  }

  const hasLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const hasLongLength = password.length >= 12;

  const baseScore = [hasLength, hasLetter, hasNumber, hasSymbol]
    .filter(Boolean)
    .length;
  const score = hasLongLength && baseScore === 4 ? 5 : baseScore;

  if (score <= 1) {
    return {
      label: "Fraca",
      progress: 25,
      toneClassName: "text-rose-500",
      barClassName: "bg-rose-400",
    };
  }

  if (score === 2) {
    return {
      label: "Media",
      progress: 50,
      toneClassName: "text-amber-600",
      barClassName: "bg-amber-400",
    };
  }

  if (score === 3) {
    return {
      label: "Boa",
      progress: 75,
      toneClassName: "text-[#A58F3C]",
      barClassName: "bg-[#C5B358]",
    };
  }

  return {
    label: "Forte",
    progress: 100,
    toneClassName: "text-emerald-600",
    barClassName: "bg-emerald-500",
  };
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const passwordStrength = getPasswordStrength(password);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    if (password !== passwordConfirm) {
      toast.error("Senhas nao conferem", {
        description: "Digite a mesma senha nos dois campos.",
      });
      setLoading(false);
      return;
    }

    const passwordValidation = validatePasswordRequirements(password);

    if (!passwordValidation.isValid) {
      toast.error("Senha invalida", {
        description: `Sua senha precisa ter ${passwordValidation.missingRequirements.join(", ")}.`,
      });
      setLoading(false);
      return;
    }

    try {
      const result = await signUp.email({ email, name, password });

      if (result.error) {
        toast.error("Nao foi possivel criar sua conta", {
          description: "Verifique os dados informados e tente novamente.",
        });
      } else {
        router.push("/dashboard");
      }
    } catch {
      toast.error("Erro inesperado ao registrar", {
        description: "Tente novamente em alguns instantes.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      heroTitle={
        <>
          Comece sua jornada
          <br />
          <span className="font-semibold italic">financeira com a Fluxy</span>
        </>
      }
      heroSubtitle="Crie sua conta em poucos instantes"
      heroFooterLeft="Fluxy"
      heroFooterRight="Conta gratuita"
    >
      <header className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight">
          Criar conta na Fluxy
        </h1>
        <p className="mt-2 text-base text-stone-500">
          Centralize suas contas, despesas e investimentos em um unico lugar.
        </p>
      </header>

      <form className="space-y-6" onSubmit={handleRegister}>
        <div className="space-y-2">
          <label
            className="ml-1 block text-xs font-semibold uppercase tracking-widest text-stone-500"
            htmlFor="name"
          >
            Nome completo
          </label>
          <Input
            id="name"
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label
            className="ml-1 block text-xs font-semibold uppercase tracking-widest text-stone-500"
            htmlFor="email"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="voce@fluxy.app"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label
            className="ml-1 block text-xs font-semibold uppercase tracking-widest text-stone-500"
            htmlFor="password"
          >
            Senha
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="********"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 transition-colors hover:text-stone-600"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? (
                <EyeOff className="h-4.5 w-4.5" aria-hidden />
              ) : (
                <Eye className="h-4.5 w-4.5" aria-hidden />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label
            className="ml-1 block text-xs font-semibold uppercase tracking-widest text-stone-500"
            htmlFor="passwordConfirm"
          >
            Confirmar senha
          </label>
          <div className="relative">
            <Input
              id="passwordConfirm"
              type={showPasswordConfirm ? "text" : "password"}
              placeholder="********"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirm((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 transition-colors hover:text-stone-600"
              aria-label={
                showPasswordConfirm ? "Ocultar confirmacao da senha" : "Mostrar confirmacao da senha"
              }
            >
              {showPasswordConfirm ? (
                <EyeOff className="h-4.5 w-4.5" aria-hidden />
              ) : (
                <Eye className="h-4.5 w-4.5" aria-hidden />
              )}
            </button>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Força da senha
              </span>
              <span
                className={`text-xs font-medium transition-colors ${passwordStrength.toneClassName}`}
                aria-live="polite"
              >
                {passwordStrength.label}
              </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
              <div
                className={`h-full rounded-full transition-all duration-300 ${passwordStrength.barClassName}`}
                style={{ width: `${passwordStrength.progress}%` }}
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="mt-4 h-12 w-full rounded-xl bg-[#C5B358] font-semibold text-white shadow-lg shadow-[#C5B358]/20 transition-all duration-300 hover:bg-[#B3A24E] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>
    </AuthLayout>
  );
}

