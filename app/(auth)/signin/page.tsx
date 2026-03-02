"use client";

import { signIn } from "@/lib/auth-client";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const DEFAULT_REDIRECT_PATH = "/dashboard";

function getRedirectPath(nextPath: string | null): string {
    if (!nextPath) return DEFAULT_REDIRECT_PATH;
    if (!nextPath.startsWith("/")) return DEFAULT_REDIRECT_PATH;
    if (nextPath.startsWith("//")) return DEFAULT_REDIRECT_PATH;
    return nextPath;
}

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
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
                toast.error("Nao foi possivel entrar", {
                    description: "Verifique seu email e senha e tente novamente.",
                });
                return;
            }

            const nextPath = getRedirectPath(searchParams.get("next"));
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
        <main className="min-h-screen w-full bg-[#f9f7f2] text-[#1c1917] selection:bg-[#C5B358]/30">
            <div className="flex min-h-screen w-full flex-col md:flex-row">
                <section
                    className="relative hidden w-1/2 overflow-hidden md:flex"
                    style={{
                        backgroundImage: "radial-gradient(circle at 0% 0%, rgba(0,0,0,0.5), transparent 55%), radial-gradient(circle at 100% 100%, rgba(0,0,0,0.55), transparent 60%), url('/fluxy-gold-bg.png')",
                        backgroundSize: "140% 140%, 140% 140%, cover",
                        backgroundPosition: "top left, bottom right, center",
                    }}
                >
                    <div className="absolute inset-0 bg-black/45 mix-blend-multiply" aria-hidden />

                    <div className="relative z-10 flex w-full flex-col justify-between p-16 text-center text-[#f9f7f2]">
                        <div />

            <div className="mx-auto max-w-md lg:max-w-2xl">
              <h2 className="text-4xl leading-tight font-light lg:text-5xl lg:leading-tight">
                                Organize suas financas
                                <br />
                                <span className="font-semibold italic">com clareza e controle</span>
                            </h2>
              <p className="mt-4 text-sm font-medium uppercase tracking-[0.22em] text-stone-200/90 lg:text-[0.72rem]">
                Seu hub para contas, despesas e investimentos
              </p>
                        </div>

                        <div className="flex items-center justify-center gap-4 text-xs font-medium tracking-[0.3em] text-stone-200 uppercase">
                            <span>Fluxy</span>
                            <div className="h-px w-12 bg-[#C5B358]/40" />
                            <span>Since 2024</span>
                        </div>
                    </div>
                </section>

                <section className="flex w-full flex-col justify-center bg-white md:w-1/2">
                    <div className="mx-auto w-full max-w-md px-8 py-12">
                        <header className="mb-12">
                            <h1 className="text-3xl font-semibold tracking-tight">Entrar na Fluxy</h1>
                            <p className="mt-2 text-base text-stone-500">
                                Acesse seu painel financeiro pessoal.
                            </p>
                        </header>

                        <form className="space-y-8" onSubmit={handleLogin}>
                            <div className="space-y-2">
                                <label
                                    className="ml-1 block text-xs font-semibold tracking-widest text-stone-500 uppercase"
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
                                    className="w-full border-0 border-b border-stone-200 bg-transparent px-1 py-4 text-base placeholder:text-stone-300 transition-all outline-none focus:border-[#C5B358]"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <label
                                        className="block text-xs font-semibold tracking-widest text-stone-500 uppercase"
                                        htmlFor="password"
                                    >
                                        Senha
                                    </label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-[10px] font-bold tracking-widest text-[#C5B358] uppercase transition-opacity hover:opacity-80"
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
                                        className="w-full border-0 border-b border-stone-200 bg-transparent px-1 py-4 pr-10 text-base placeholder:text-stone-300 transition-all outline-none focus:border-[#C5B358]"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-1 text-stone-400 hover:text-stone-600 transition-colors"
                                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" aria-hidden />
                                        ) : (
                                            <Eye className="h-5 w-5" aria-hidden />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-4 h-14 w-full rounded-xl bg-[#C5B358] font-semibold text-white shadow-lg shadow-[#C5B358]/20 transition-all duration-300 hover:bg-[#B3A24E] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {loading ? "Entrando..." : "Entrar"}
                            </button>
                        </form>


                        <footer className="mt-12 text-center">
                            <Link
                                href="/signup"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-[#C5B358]"
                            >
                                Ainda nao tem conta?
                                <span className="font-bold text-[#C5B358] underline decoration-[#C5B358]/30 underline-offset-4">
                                    Criar conta gratis
                                </span>
                            </Link>
                        </footer>
                    </div>
                </section>
            </div>
        </main>
    );
}
