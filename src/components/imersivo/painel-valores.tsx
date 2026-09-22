"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { formatarBRL } from "@/lib/reserva/itens";
import {
  ROTULO_DIA,
  type AbaValores,
  type Adicional,
  type LinhaValor,
} from "@/lib/reserva/tabela-valores";

/**
 * Tabela de valores em abas — uma por experiência — com os adicionais à parte.
 *
 * Os números chegam prontos do servidor, lidos do Sistur a cada exibição; este
 * componente só decide o que está à mostra. Nenhum valor nasce aqui.
 *
 * As abas seguem o padrão de tabs do WAI-ARIA: setas trocam de aba, Tab entra
 * no painel. O seletor de faixa de dia é um grupo de rádio pela mesma razão —
 * quem navega por teclado ou leitor de tela precisa saber que são opções
 * exclusivas, não botões soltos.
 */

function Tarifas({ linha }: { linha: LinhaValor }) {
  const [ativa, setAtiva] = useState(0);
  const tarifa = linha.tarifas[ativa] ?? linha.tarifas[0];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-[var(--c-on-panel)]">{linha.titulo}</h3>
        {linha.detalhe && (
          <p className="text-sm text-[var(--c-on-panel)] opacity-80">{linha.detalhe}</p>
        )}
      </div>

      {linha.tarifas.length > 1 && (
        <div
          role="radiogroup"
          aria-label={`Tipo de dia — ${linha.titulo}`}
          className="flex flex-wrap gap-2"
        >
          {linha.tarifas.map((t, i) => (
            <button
              key={t.dia}
              type="button"
              role="radio"
              aria-checked={i === ativa}
              onClick={() => setAtiva(i)}
              className={[
                "min-h-[44px] rounded-full px-4 text-sm font-semibold transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-on-panel)]",
                i === ativa
                  ? "bg-[var(--c-on-panel)] text-[var(--c-panel)]"
                  : "border border-[var(--c-on-panel)]/40 text-[var(--c-on-panel)] hover:bg-[var(--c-on-panel)]/10",
              ].join(" ")}
            >
              {ROTULO_DIA[t.dia]}
            </button>
          ))}
        </div>
      )}

      <p
        className="text-4xl font-bold text-[var(--c-on-panel)] tabular-nums"
        aria-live="polite"
      >
        {linha.prefixo && (
          <span className="mr-2 text-base font-normal">{linha.prefixo}</span>
        )}
        {formatarBRL(tarifa.valor)}
      </p>
    </div>
  );
}

export function PainelValores({
  abas,
  adicionais,
  nota,
}: {
  abas: AbaValores[];
  adicionais: Adicional[];
  nota?: string;
}) {
  const [ativa, setAtiva] = useState(0);
  const base = useId();
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const aba = abas[ativa];

  function navegar(e: KeyboardEvent) {
    const passo = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const proxima = (ativa + passo + abas.length) % abas.length;
    setAtiva(proxima);
    botoes.current[proxima]?.focus();
  }

  return (
    <div className="flex flex-col gap-8">
      {aba && (
        <div>
          {abas.length > 1 && (
            <div
              role="tablist"
              aria-label="Experiências"
              onKeyDown={navegar}
              className="mb-6 flex flex-wrap justify-center gap-2"
            >
              {abas.map((a, i) => (
                <button
                  key={a.id}
                  ref={(el) => {
                    botoes.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${base}-aba-${i}`}
                  aria-selected={i === ativa}
                  aria-controls={`${base}-painel`}
                  tabIndex={i === ativa ? 0 : -1}
                  onClick={() => setAtiva(i)}
                  className={[
                    "min-h-[44px] rounded-full px-6 text-sm font-semibold tracking-wide uppercase transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-panel)]",
                    i === ativa
                      ? "bg-[var(--c-panel)] text-[var(--c-on-panel)]"
                      : "border border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-fg)] hover:bg-[var(--c-surface)]",
                  ].join(" ")}
                >
                  {a.nome}
                </button>
              ))}
            </div>
          )}

          <div
            role={abas.length > 1 ? "tabpanel" : undefined}
            id={`${base}-painel`}
            aria-labelledby={abas.length > 1 ? `${base}-aba-${ativa}` : undefined}
            className="mx-auto flex max-w-2xl flex-col gap-8 rounded-2xl bg-[var(--c-panel)] p-6 shadow-lg sm:p-10"
          >
            {aba.linhas.map((l) => (
              // A chave inclui a aba: ao trocar de aba o seletor de dia volta
              // para a primeira faixa, em vez de herdar a escolha da outra.
              <Tarifas key={`${aba.id}-${l.slug}`} linha={l} />
            ))}
            <Link
              href={aba.href}
              className="inline-flex min-h-[48px] items-center justify-center self-start rounded-full bg-[var(--c-primary)] px-8 text-sm font-bold tracking-wide text-[var(--c-on-primary)] uppercase transition-colors hover:bg-[var(--c-primary-dark)]"
            >
              Reservar {aba.nome}
            </Link>
          </div>
        </div>
      )}

      {adicionais.length > 0 && (
        <div className="mx-auto w-full max-w-2xl">
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-[var(--c-muted)] uppercase">
            Adicionais para a sua reserva
          </h3>
          <ul className="divide-y divide-[var(--c-border)] rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)]">
            {adicionais.map((a, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-4"
              >
                <span className="text-[var(--c-fg)]">{a.rotulo}</span>
                <span className="font-semibold text-[var(--c-fg)] tabular-nums">
                  {a.prefixo && (
                    <span className="mr-1 text-sm font-normal text-[var(--c-muted)]">
                      {a.prefixo.toLocaleLowerCase("pt-BR")}
                    </span>
                  )}
                  {formatarBRL(a.valor)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--c-muted)]">
            Os adicionais são escolhidos no formulário de reserva.
          </p>
        </div>
      )}

      {nota && <p className="text-center text-xs text-[var(--c-muted)]">{nota}</p>}
    </div>
  );
}
