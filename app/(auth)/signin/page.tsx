"use client";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { signIn } from "@/lib/auth-client";
import { useIsMobile } from "@/src/lib/use-is-mobile";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const DEFAULT_REDIRECT_PATH = "/dashboard";
const enterEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

function getAuthMotionVariants(
  isMobile: boolean,
  reduceMotion: boolean,
): { container: Variants; item: Variants } {
  if (reduceMotion) {
    return {
      container: {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            duration: 0.2,
            when: "beforeChildren",
            staggerChildren: 0.03,
          },
        },
      },
      item: {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.18 } },
      },
    };
  }

  const containerY = isMobile ? 10 : 18;
  const itemY = isMobile ? 6 : 10;
  const containerDuration = isMobile ? 0.4 : 0.55;
  const itemDuration = isMobile ? 0.3 : 0.45;
  const stagger = isMobile ? 0.05 : 0.08;

  return {
    container: {
      hidden: { opacity: 0, y: containerY },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: containerDuration,
          ease: enterEase,
          when: "beforeChildren",
          staggerChildren: stagger,
        },
      },
    },
    item: {
      hidden: { opacity: 0, y: itemY },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: itemDuration, ease: enterEase },
      },
    },
  };
}

function getRedirectPath(nextPath: string | null): string {
  if (!nextPath) return DEFAULT_REDIRECT_PATH;
  if (!nextPath.startsWith("/")) return DEFAULT_REDIRECT_PATH;
  if (nextPath.startsWith("//")) return DEFAULT_REDIRECT_PATH;
  return nextPath;
}

export default function LoginPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();
  const motionVariants = useMemo(
    () => getAuthMotionVariants(isMobile, Boolean(prefersReducedMotion)),
    [isMobile, prefersReducedMotion],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const result = await signIn.email({ email, password });
      if (result?.error) {
        toast.error("Não foi possível entrar", {
          description: "Verifique seu e-mail e senha e tente novamente.",
        });
        return;
      }

      const nextPath = getRedirectPath(
        new URLSearchParams(window.location.search).get("next"),
      );
      router.push(nextPath);
      router.refresh();
    } catch {
      toast.error("Erro inesperado ao entrar", {
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
          Organize suas financas
          <br />
          <span className="font-semibold italic">com clareza e controle</span>
        </>
      }
      heroSubtitle="Seu hub para contas, despesas e investimentos"
      heroFooterLeft="Fluxy"
      heroFooterRight="Entrar"
      footerHref="/signup"
      footerLeadText="Ainda nao tem conta?"
      footerActionText="Criar conta gratis"
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={motionVariants.container}
      >
        <motion.header variants={motionVariants.item} className="mb-8 sm:mb-12">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Entrar na Fluxy
          </h1>
          <p className="mt-2 text-sm text-stone-500 sm:text-base">
            Acesse seu painel financeiro pessoal.
          </p>
        </motion.header>

        <motion.form
          variants={motionVariants.item}
          className="space-y-5 sm:space-y-8"
          onSubmit={handleLogin}
        >
          <motion.div variants={motionVariants.item} className="space-y-2">
            <label
              className="ml-1 block text-xs font-semibold uppercase tracking-widest text-stone-500"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="voce@fluxy.app"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full border-0 border-b border-stone-200 bg-transparent px-1 py-3 text-base placeholder:text-stone-300 transition-all outline-none focus:border-[#C5B358] sm:h-auto sm:py-4"
              required
            />
          </motion.div>

          <motion.div variants={motionVariants.item} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label
                className="block text-xs font-semibold uppercase tracking-widest text-stone-500"
                htmlFor="password"
              >
                Senha
              </label>
              <Link
                href="/forgot-password"
                className="text-[10px] font-bold uppercase tracking-widest text-[#C5B358] transition-opacity hover:opacity-80"
              >
                Esqueceu?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="********"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full border-0 border-b border-stone-200 bg-transparent px-1 py-3 pr-10 text-base placeholder:text-stone-300 transition-all outline-none focus:border-[#C5B358] sm:h-auto sm:py-4"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-2 text-stone-400 transition-colors hover:text-stone-600 sm:pr-1"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" aria-hidden />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden />
                )}
              </button>
            </div>
          </motion.div>

          <motion.div variants={motionVariants.item}>
            <button
              type="submit"
              disabled={loading}
              className="mt-3 h-11 w-full rounded-xl bg-[#C5B358] font-semibold text-white shadow-lg shadow-[#C5B358]/20 transition-all duration-300 hover:bg-[#B3A24E] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 sm:mt-4 sm:h-14"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </motion.div>
        </motion.form>
      </motion.div>
    </AuthLayout>
  );
}
