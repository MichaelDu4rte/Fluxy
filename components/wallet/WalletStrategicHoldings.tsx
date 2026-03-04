"use client";

import type { WalletHoldingVm } from "@/components/wallet/types";
import { cn } from "@/lib/utils";
import { ArrowUpRight, CreditCard, Landmark, Pencil, Trash2, Wallet } from "lucide-react";

type WalletStrategicHoldingsProps = {
  items: WalletHoldingVm[];
  deletingId: string | null;
  onEdit: (accountId: string) => void;
  onDelete: (accountId: string) => void;
};

function getTypeIcon(type: WalletHoldingVm["type"]) {
  if (type === "investment") return Landmark;
  if (type === "credit") return CreditCard;
  return Wallet;
}

export default function WalletStrategicHoldings({
  items,
  deletingId,
  onEdit,
  onDelete,
}: WalletStrategicHoldingsProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold tracking-[-0.02em] text-[#171611]">
            Lista de ativos estratégicos
          </h3>
        </div>

        <button
          type="button"
          className="text-xs font-semibold uppercase tracking-[0.1em] text-[#b38c19]"
        >
          Ver projeções detalhadas
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-3xl border border-[#ece7dd] bg-white/90 p-6 text-sm text-[#7f7763] shadow-sm">
            Nenhum ativo encontrado para os filtros atuais.
          </div>
        ) : null}

        {items.map((item) => {
          const Icon = getTypeIcon(item.type);
          const positiveReturn = item.returnPct >= 0;

          return (
            <article
              key={item.accountId}
              className="grid gap-4 rounded-3xl border border-[#ece7dd] bg-white/92 p-4 shadow-sm md:grid-cols-[auto_1fr_auto]"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#776f5b_0%,#92856a_100%)] text-[#f4efe3]">
                <Icon className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <div>
                  <h4 className="text-lg font-semibold text-[#171611]">{item.accountName}</h4>
                  {item.marketAssetLabel ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[#8b836d]">
                      {item.marketAssetLabel}
                    </p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-[0.08em] text-[#7f7763]">
                    <span>
                      AUM <strong className="ml-1 text-sm tracking-normal text-[#2c271f]">{item.aumLabel}</strong>
                    </span>
                    <span>
                      Alocação <strong className="ml-1 text-sm tracking-normal text-[#2c271f]">{item.allocationLabel}</strong>
                    </span>
                  </div>
                  {item.currentPriceLabel || item.entryPriceLabel ? (
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6f6754]">
                      {item.currentPriceLabel ? (
                        <span>
                          Preço atual: <strong className="text-[#272218]">{item.currentPriceLabel}</strong>
                        </span>
                      ) : null}
                      {item.entryPriceLabel ? (
                        <span>
                          Preço de entrada: <strong className="text-[#272218]">{item.entryPriceLabel}</strong>
                        </span>
                      ) : null}
                      {item.marketUpdatedAtLabel ? (
                        <span className="text-[#8a826f]">Atualizado {item.marketUpdatedAtLabel}</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs uppercase tracking-[0.08em] text-[#8b836d]">
                  <div>
                    Retorno
                    <div
                      className={cn(
                        "mt-1 text-sm font-semibold tracking-normal",
                        positiveReturn ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      {item.returnLabel}
                    </div>
                  </div>
                  <div>
                    Risco
                    <div
                      className={cn(
                        "mt-1 text-sm font-semibold tracking-normal",
                        item.risk === "conservative" ? "text-blue-600" : "text-[#b38c19]",
                      )}
                    >
                      {item.riskLabel}
                    </div>
                  </div>
                  <div>
                    Horizonte
                    <div className="mt-1 text-sm font-semibold tracking-normal text-[#2c271f]">
                      {item.horizonLabel}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-end gap-2 md:flex-col md:items-end">
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e8e2d6] bg-[#f8f4ea] text-[#5f5745] transition hover:bg-[#eee7d7]"
                  aria-label={`Editar ${item.accountName}`}
                  onClick={() => onEdit(item.accountId)}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                  aria-label={`Excluir ${item.accountName}`}
                  onClick={() => onDelete(item.accountId)}
                  disabled={deletingId === item.accountId}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ece5d8] bg-white text-[#736b57] transition hover:bg-[#f8f4ea]"
                  aria-label={`Ver detalhes de ${item.accountName}`}
                >
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
