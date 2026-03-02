"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Fingerprint } from "lucide-react";

type AuthLayoutProps = {
  children: ReactNode;
  heroTitle: ReactNode;
  heroSubtitle?: ReactNode;
  heroFooterLeft: string;
  heroFooterRight: string;
};

export function AuthLayout({
  children,
  heroTitle,
  heroSubtitle,
  heroFooterLeft,
  heroFooterRight,
}: AuthLayoutProps) {
  return (
    <main className="min-h-screen w-full bg-[#f9f7f2] text-[#1c1917] selection:bg-[#C5B358]/30">
      <div className="flex min-h-screen w-full flex-col md:flex-row">
        <section
          className="relative hidden w-1/2 overflow-hidden md:flex"
          style={{
            backgroundImage:
              "radial-gradient(circle at 0% 0%, rgba(0,0,0,0.5), transparent 55%), radial-gradient(circle at 100% 100%, rgba(0,0,0,0.55), transparent 60%), url('/fluxy-gold-bg.png')",
            backgroundSize: "140% 140%, 140% 140%, cover",
            backgroundPosition: "top left, bottom right, center",
          }}
        >
          <div
            className="absolute inset-0 bg-black/45 mix-blend-multiply"
            aria-hidden
          />

          <div className="relative z-10 flex w-full flex-col justify-between p-16 text-center text-[#f9f7f2]">
            <div />

            <div className="mx-auto max-w-md lg:max-w-2xl">
              <h2 className="text-4xl font-light leading-tight lg:text-5xl lg:leading-tight">
                {heroTitle}
              </h2>
              {heroSubtitle ? (
                <p className="mt-4 text-sm font-medium uppercase tracking-[0.22em] text-stone-200/90 lg:text-[0.72rem]">
                  {heroSubtitle}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-center gap-4 text-xs font-medium uppercase tracking-[0.3em] text-stone-200">
              <span>{heroFooterLeft}</span>
              <div className="h-px w-12 bg-[#C5B358]/40" />
              <span>{heroFooterRight}</span>
            </div>
          </div>
        </section>

        <section className="flex w-full flex-col justify-center bg-white md:w-1/2">
          <div className="mx-auto w-full max-w-md px-8 py-12">
            {children}

            <footer className="mt-12 text-center">
              <Link
                href="/signin"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-[#C5B358]"
              >
                Ja tem uma conta?
                <span className="font-bold text-[#C5B358] underline decoration-[#C5B358]/30 underline-offset-4">
                  Entrar
                </span>
              </Link>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}

