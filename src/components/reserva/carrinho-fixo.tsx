"use client";

import { formatarBRL, type Orcamento } from "@/lib/reserva/itens";
import { DetalheValores } from "./detalhe-valores";

/**
 * Sticky cart.
 *
 * The summary used to sit at the bottom of the page, below twelve item rows. On
 * a phone that put the total — the number the whole screen exists to produce —
 * off screen for the entire time someone was choosing. The bar keeps it in view
 * and puts "Continuar" within reach from anywhere.
 *
 * The total is never computed here. It arrives from Sistur's `/simular`, which
 * applies the day tier, the advance discount and the service fee; multiplying
 * price by quantity in the browser would show a number checkout disagrees with,
 * and under CDC Art. 30 the advertised price binds the supplier.
 *
 * While a newer figure is in flight the old one dims rather than disappearing —
 * a total that blanks on every tap reads as broken.
 */
export function CarrinhoFixo({
  orcamento,
  carregando,
  pendencia,
  totalItens,
  podeAvancar,
}: {
  orcamento: Orcamento | null;
  carregando: boolean;
  /** Por que ainda não dá para avançar. Null = pode. */
  pendencia: string | null;
  totalItens: number;
  podeAvancar: boolean;
}) {
  return (
    <div
      className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-[var(--c-border)]
                 bg-white/95 px-4 py-3 backdrop-blur
                 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]
                 sm:-mx-5 sm:px-5"
      /* safe-area: em iPhone o gesture bar cobriria o botão. */
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" className="min-w-0">
          {pendencia ? (
            <p className="text-sm text-[var(--c-muted)]">{pendencia}</p>
          ) : (
            <div className={carregando ? "opacity-50 transition-opacity" : "transition-opacity"}>
              <p className="text-xs text-[var(--c-muted)]">
                {totalItens} {totalItens === 1 ? "item" : "itens"}
                {orcamento && orcamento.discount_amount > 0 && (
                  <span className="text-[var(--c-accent-dark)]">
                    {" "}· desconto de {formatarBRL(orcamento.discount_amount)}
                  </span>
                )}
              </p>
              <p className="text-xl font-bold leading-tight text-[var(--c-fg)]">
                {orcamento ? formatarBRL(orcamento.total) : "—"}
              </p>
              {/* Fechado por padrão: o total é o que a barra existe para
                  mostrar, e uma conta sempre aberta empurraria o botão para
                  fora da tela no celular. */}
              <DetalheValores orcamento={orcamento} />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!podeAvancar}
          className="min-h-[48px] w-full rounded-lg bg-[var(--c-accent)] px-8
                     text-base font-semibold uppercase tracking-wide text-white
                     transition-colors hover:bg-[var(--c-accent-dark)]
                     disabled:cursor-not-allowed disabled:opacity-40
                     sm:w-auto"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}
