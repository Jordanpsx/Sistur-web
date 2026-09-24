"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { formatarBRL } from "@/lib/reserva/itens";
import {
  ROTULO_DIA,
  tarifaDoDia,
  type AbaValores,
  type Adicional,
} from "@/lib/reserva/tabela-valores";
import { Icone } from "@/components/ui/icone";

/**
 * Tabela de valores em abas — uma por experiência — com os adicionais à parte.
 *
 * Os números chegam prontos do servidor, lidos do Sistur a cada exibição; este
 * componente só decide o que está à mostra. Nenhum valor nasce aqui.
 *
 * Dentro da aba, um seletor de tipo de dia só, e todas as faixas de ingresso
 * (inteira, meia, isento) listadas juntas, cada uma com a idade a que se
 * aplica. Um estado para ler qualquer preço, em vez de um por linha.
 *
 * As abas seguem o padrão de tabs do WAI-ARIA: setas trocam de aba, Tab entra
 * no painel. O seletor de dia é um grupo de rádio pela mesma razão — são
 * opções exclusivas, não botões soltos.
 */

const valor = (v: number) => (v === 0 ? "Grátis" : formatarBRL(v));

function Aba({ aba }: { aba: AbaValores }) {
  const [dia, setDia] = useState(aba.dias[0]);

  return (
    <>
      {aba.dias.length > 1 && (
        <div
          role="radiogroup"
          aria-label={`Tipo de dia — ${aba.nome}`}
          className="flex flex-wrap gap-2"
        >
          {aba.dias.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={d === dia}
              onClick={() => setDia(d)}
              className={[
                "min-h-[44px] rounded-full px-4 text-sm font-semibold transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-on-panel)]",
                d === dia
                  ? "bg-[var(--c-on-panel)] text-[var(--c-panel)]"
                  : "border border-[var(--c-on-panel)]/40 text-[var(--c-on-panel)] hover:bg-[var(--c-on-panel)]/10",
              ].join(" ")}
            >
              {ROTULO_DIA[d]}
            </button>
          ))}
        </div>
      )}

      <ul className="divide-y divide-[var(--c-on-panel)]/20" aria-live="polite">
        {aba.linhas.map((l) => {
          const t = tarifaDoDia(l, dia);
          if (!t) return null;
          return (
            <li
              key={l.slug}
              // Grade, não flex-wrap: com wrap, a faixa de descrição longa
              // empurrava o preço para baixo e à esquerda, e as três linhas
              // saíam com dois alinhamentos. Aqui o texto quebra na coluna
              // dele e o preço fica sempre à direita.
              className="grid grid-cols-[1fr_auto] items-start gap-x-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-lg font-semibold text-[var(--c-on-panel)]">
                  {l.titulo}
                </p>
                {l.detalhe && (
                  <p className="text-sm text-[var(--c-on-panel)] opacity-85">
                    {l.detalhe}
                  </p>
                )}
              </div>
              <p className="text-right text-2xl font-bold whitespace-nowrap text-[var(--c-on-panel)] tabular-nums sm:text-3xl">
                {l.prefixo && t.valor !== 0 && (
                  <span className="mr-1 text-sm font-normal">{l.prefixo}</span>
                )}
                {valor(t.valor)}
              </p>
            </li>
          );
        })}
      </ul>
    </>
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
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
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

          {/* O desconto é alavanca de venda, não letra miúda: fica em cima do
              preço. Borda amarela e não fundo amarelo — fundo amarelo cheio é
              a cor do botão de reserva, e isto não se clica. */}
          {nota && (
            <p className="mb-6 flex items-start gap-3 rounded-xl border-l-4 border-[var(--c-primary)] bg-[var(--c-bg)] px-4 py-3 text-sm font-semibold text-[var(--c-fg)] shadow-sm">
              <Icone
                nome="calendario"
                className="mt-0.5 h-5 w-5 shrink-0 text-[var(--c-accent-dark)]"
              />
              {nota}
            </p>
          )}

          <div
            role={abas.length > 1 ? "tabpanel" : undefined}
            id={`${base}-painel`}
            aria-labelledby={abas.length > 1 ? `${base}-aba-${ativa}` : undefined}
            className="flex flex-col gap-6 rounded-2xl bg-[var(--c-panel)] p-6 shadow-lg sm:p-10"
          >
            {/* A chave troca com a aba: o seletor de dia volta para a primeira
                faixa em vez de herdar a escolha da outra experiência. */}
            <Aba key={aba.id} aba={aba} />
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
        <div className="w-full">
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
    </div>
  );
}
