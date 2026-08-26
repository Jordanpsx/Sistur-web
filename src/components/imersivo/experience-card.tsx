"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatarBRL } from "@/lib/reserva/itens";
import { VideoDeFundo } from "./video-de-fundo";

/**
 * Cartão de uma atividade — tirolesa, arvorismo, o combo dos dois.
 *
 * A ideia é vender a sensação antes do preço: um trecho em POV rodando no
 * lugar da miniatura parada. O vídeo começa quando a pessoa aponta ou foca o
 * cartão; em toque, onde não existe hover, começa quando o cartão aparece.
 *
 * **O preço nunca é digitado aqui.** `preco` é o valor que o Sistur resolveu
 * para a data escolhida — via `/simular` ou pela tarifa do catálogo. A home
 * antiga do WordPress guardava preço em campo de ACF e ele divergia do que o
 * sistema cobrava; sob o CDC Art. 30 o anúncio obriga o fornecedor. Sem data
 * escolhida não há preço certo, e o cartão diz isso em vez de inventar.
 *
 * Adicionar não é um `<a>` disfarçado: mexe no estado da reserva, então é
 * `<button>`, com alvo de toque de 44px e contagem visível depois do primeiro
 * toque — a mesma gramática dos outros seletores do funil.
 */

export type Atividade = {
  /** `ReservaItem.id` no Sistur. É a chave de tudo a jusante. */
  id: number;
  titulo: string;
  descricao?: string | null;
  /** Sempre presente: é o que se vê sem vídeo, e é o poster do vídeo. */
  poster: string;
  video?: { url: string; tipo?: string }[];
};

export function ExperienceCard({
  atividade,
  preco,
  quantidade,
  onQtd,
  max = 20,
}: {
  atividade: Atividade;
  /** Resolvido pelo Sistur. `undefined` = data ainda não escolhida. */
  preco?: number;
  quantidade: number;
  onQtd: (valor: number) => void;
  max?: number;
}) {
  const [apontado, setApontado] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [temHover, setTemHover] = useState(true);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setTemHover(window.matchMedia("(hover: hover)").matches);
  }, []);

  useEffect(() => {
    // Em toque não há para onde apontar, então o gatilho é aparecer na tela.
    if (temHover || !ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => setVisivel(e.isIntersecting && e.intersectionRatio > 0.6),
      { threshold: [0, 0.6] },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [temHover]);

  const escolhido = quantidade > 0;
  const tocando = temHover ? apontado : visivel;

  return (
    <article
      ref={ref}
      onMouseEnter={() => setApontado(true)}
      onMouseLeave={() => setApontado(false)}
      onFocus={() => setApontado(true)}
      onBlur={() => setApontado(false)}
      className={
        "group flex flex-col overflow-hidden rounded-2xl bg-[var(--c-panel)] " +
        "shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_8px_28px_rgba(0,0,0,0.14)] " +
        (escolhido ? "ring-2 ring-[var(--c-accent)]" : "")
      }
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--c-surface)]">
        {atividade.video?.length ? (
          <VideoDeFundo
            src={atividade.video}
            poster={atividade.poster}
            tocarNoHover
            ativo={tocando}
            className="transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <Image
            src={atividade.poster}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-semibold text-[var(--c-fg)]">{atividade.titulo}</h3>

        {atividade.descricao && (
          <p className="text-sm leading-relaxed text-[var(--c-muted)]">
            {atividade.descricao}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <p className="text-base font-bold tabular-nums text-[var(--c-fg)]">
            {preco != null ? (
              formatarBRL(preco)
            ) : (
              <span className="text-sm font-normal text-[var(--c-muted)]">
                Escolha a data para ver o valor
              </span>
            )}
          </p>

          {escolhido ? (
            <div className="flex items-center gap-1 rounded-full border border-[var(--c-border)] p-1">
              <BotaoQtd
                rotulo={`Remover um ${atividade.titulo}`}
                onClick={() => onQtd(quantidade - 1)}
              >
                −
              </BotaoQtd>
              <span
                aria-live="polite"
                className="min-w-[2ch] text-center text-base font-semibold tabular-nums text-[var(--c-fg)]"
              >
                {quantidade}
              </span>
              <BotaoQtd
                rotulo={`Adicionar mais um ${atividade.titulo}`}
                onClick={() => onQtd(Math.min(max, quantidade + 1))}
                desabilitado={quantidade >= max}
              >
                +
              </BotaoQtd>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onQtd(1)}
              className="min-h-[44px] shrink-0 rounded-full bg-[var(--c-accent)] px-6 text-sm
                         font-semibold uppercase tracking-wide text-[var(--c-on-accent)]
                         transition-colors hover:bg-[var(--c-accent-dark)]
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Adicionar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function BotaoQtd({
  children,
  rotulo,
  onClick,
  desabilitado = false,
}: {
  children: React.ReactNode;
  rotulo: string;
  onClick: () => void;
  desabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      aria-label={rotulo}
      className="flex h-11 w-11 items-center justify-center rounded-full text-xl leading-none
                 text-[var(--c-fg)] transition-colors hover:bg-[var(--c-surface)]
                 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}
