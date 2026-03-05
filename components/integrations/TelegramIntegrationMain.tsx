"use client";

import { Button } from "@/components/ui/button";
import type { TelegramLinkStatusDto } from "@/src/server/telegram/types";
import { Loader2, RefreshCcw, Unlink2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

class IntegrationRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationRequestError";
  }
}

async function readApiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as unknown) : undefined;

  if (!response.ok) {
    const errorBody = (parsed ?? {}) as ApiErrorResponse;
    throw new IntegrationRequestError(
      errorBody.error?.message ?? "Falha ao processar a integracao do Telegram.",
    );
  }

  return parsed as T;
}

function formatDateTime(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return parsed.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function TelegramIntegrationMain() {
  const [status, setStatus] = useState<TelegramLinkStatusDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const data = await readApiJson<TelegramLinkStatusDto>("/api/integracoes/telegram");
      setStatus(data);
    } catch (error) {
      const message =
        error instanceof IntegrationRequestError
          ? error.message
          : "Nao foi possivel carregar a integracao do Telegram.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function handleGenerateCode() {
    setIsGeneratingCode(true);
    setErrorMessage(null);

    try {
      await readApiJson("/api/integracoes/telegram/link-code", {
        method: "POST",
      });
      await loadStatus();
    } catch (error) {
      const message =
        error instanceof IntegrationRequestError
          ? error.message
          : "Nao foi possivel gerar o codigo.";
      setErrorMessage(message);
    } finally {
      setIsGeneratingCode(false);
    }
  }

  async function handleUnlink() {
    setIsUnlinking(true);
    setErrorMessage(null);

    try {
      const nextStatus = await readApiJson<TelegramLinkStatusDto>("/api/integracoes/telegram", {
        method: "DELETE",
      });
      setStatus(nextStatus);
    } catch (error) {
      const message =
        error instanceof IntegrationRequestError
          ? error.message
          : "Nao foi possivel desvincular o Telegram.";
      setErrorMessage(message);
    } finally {
      setIsUnlinking(false);
    }
  }

  return (
    <main className="relative min-w-0 flex-1 overflow-x-hidden bg-[linear-gradient(134.5deg,#f8f7f6_0%,#eceae5_100%)]">
      <div className="mx-auto w-full max-w-[1040px] space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-[#171611] sm:text-4xl">
            Integracao com Telegram
          </h1>
          <p className="text-sm text-[#877e64] sm:text-base">
            Lance despesas por mensagem no bot e sincronize direto com o Fluxy.
          </p>
        </header>

        <section className="rounded-3xl border border-[#e9e4da] bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f8771]">
                Status atual
              </p>
              {isLoading ? (
                <p className="mt-1 text-base font-medium text-[#5f5745]">Carregando...</p>
              ) : status?.linked ? (
                <p className="mt-1 text-base font-medium text-emerald-700">
                  Vinculado
                </p>
              ) : (
                <p className="mt-1 text-base font-medium text-[#5f5745]">
                  Nao vinculado
                </p>
              )}
              {status?.botUsername ? (
                <p className="mt-1 text-sm text-[#7f7763]">
                  Bot: @{status.botUsername}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadStatus()}
                disabled={isLoading || isGeneratingCode || isUnlinking}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Atualizar
              </Button>
              <Button
                type="button"
                onClick={handleGenerateCode}
                disabled={isLoading || isGeneratingCode || isUnlinking}
                className="bg-[#b38c19] text-white hover:bg-[#9f7b17]"
              >
                {isGeneratingCode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Gerar codigo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleUnlink}
                disabled={isLoading || isGeneratingCode || isUnlinking || !status?.linked}
              >
                {isUnlinking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink2 className="h-4 w-4" />
                )}
                Desvincular
              </Button>
            </div>
          </div>

          {status?.link ? (
            <div className="mt-4 grid gap-3 rounded-2xl border border-[#ece6da] bg-[#faf8f3] p-4 text-sm text-[#5f5745] sm:grid-cols-2">
              <p>Chat ID: <strong>{status.link.chatId}</strong></p>
              <p>Tipo: <strong>{status.link.chatType}</strong></p>
              <p>Vinculado em: <strong>{formatDateTime(status.link.linkedAt)}</strong></p>
              <p>Ultima atividade: <strong>{formatDateTime(status.link.lastSeenAt)}</strong></p>
            </div>
          ) : null}

          {status?.activeCode ? (
            <div className="mt-4 rounded-2xl border border-[#eadfca] bg-[#f8f3e6] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f8771]">
                Codigo ativo
              </p>
              <p className="mt-2 font-mono text-2xl font-bold tracking-[0.2em] text-[#7a6120]">
                {status.activeCode.code}
              </p>
              <p className="mt-2 text-xs text-[#7f7763]">
                Expira em {status.activeCode.expiresInSeconds}s ({formatDateTime(status.activeCode.expiresAt)})
              </p>
            </div>
          ) : null}

          {errorMessage ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[#e9e4da] bg-white/90 p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-[#171611]">Como usar</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[#5f5745]">
            <li>Clique em &quot;Gerar codigo&quot;.</li>
            <li>No Telegram, envie ao bot: <code className="rounded bg-[#f3efe4] px-1.5 py-0.5">/vincular CODIGO</code>.</li>
            <li>Use <code className="rounded bg-[#f3efe4] px-1.5 py-0.5">/cartoes</code> para ver os nomes das contas/cartoes ativos.</li>
            <li>Use <code className="rounded bg-[#f3efe4] px-1.5 py-0.5">/categorias</code> para ver categorias aceitas.</li>
            <li>Depois envie despesas no formato abaixo.</li>
          </ol>

          <div className="mt-4 rounded-2xl border border-[#ece6da] bg-[#faf8f3] p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f8771]">
              Formato flexivel
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-white p-3 font-mono text-xs text-[#3f382b]">
{`titulo, descricao, valor, cartao[, categoria[, status[, data]]]
Mercado, Coca, 8,00, Cartao
Mercado, Coca, 8,00, Cartao, alimentacao, pago, 05/03/2026`}
            </pre>
            <p className="mt-2 text-xs text-[#7f7763]">
              Defaults quando nao informar: categoria = outros, status = pago, data = hoje (America/Sao_Paulo).
            </p>
            <p className="mt-1 text-xs text-[#7f7763]">
              Categorias: moradia, alimentacao, transporte, assinaturas, lazer, saude, educacao, outros.
            </p>
            <p className="mt-1 text-xs text-[#7f7763]">
              Status: pago, pendente, atrasado. Data: DD/MM/AAAA (recomendado) ou YYYY-MM-DD.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
