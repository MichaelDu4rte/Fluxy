"use client";

import { ReactNode } from "react";
import Link from "next/link";

type AuthLayoutProps = {
  children: ReactNode;
  heroTitle: ReactNode;
  heroSubtitle?: ReactNode;
  heroFooterLeft: string;
  heroFooterRight: string;
  footerHref: string;
  footerLeadText: string;
  footerActionText: string;
};

export function AuthLayout({
  children,
  heroTitle,
  heroSubtitle,
  heroFooterLeft,
  heroFooterRight,
  footerHref,
  footerLeadText,
  footerActionText,
}: AuthLayoutProps) {
  return (
    <main className="min-h-[100dvh] w-full bg-[#f9f7f2] text-[#1c1917] selection:bg-[#C5B358]/30">
      <div className="flex min-h-[100dvh] w-full flex-col md:flex-row">
        <section className="relative hidden w-1/2 overflow-hidden md:flex">
          <video
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster="/fluxy-gold-bg.png"
            onLoadedMetadata={(event) => {
              event.currentTarget.playbackRate = 0.72;
            }}
            aria-hidden
          >
            <source src="/bg-gradient.mp4" type="video/mp4" />
          </video>

          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 0% 0%, rgba(0,0,0,0.62), transparent 55%), radial-gradient(circle at 100% 100%, rgba(0,0,0,0.68), transparent 60%)",
              backgroundSize: "140% 140%, 140% 140%",
              backgroundPosition: "top left, bottom right",
            }}
            aria-hidden
          />

          <div
            className="absolute inset-0 bg-black/55 mix-blend-multiply"
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

        <section className="flex w-full flex-col justify-start overflow-y-auto bg-white md:w-1/2 md:justify-center">
          <div className="mx-auto w-full max-w-md px-5 py-8 sm:px-8 sm:py-12">
            {children}

            <footer className="mt-10 text-center sm:mt-12">
              <Link
                href={footerHref}
                className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-sm font-medium leading-relaxed text-stone-500 transition-colors hover:text-[#C5B358]"
              >
                {footerLeadText}
                <span className="font-bold text-[#C5B358] underline decoration-[#C5B358]/30 underline-offset-4">
                  {footerActionText}
                </span>
              </Link>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}

