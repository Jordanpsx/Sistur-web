"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Carrossel de fotos com legenda discreta sobre cada imagem.
 *
 * A rolagem é a nativa do navegador, com `scroll-snap`: arrastar no celular,
 * roda do mouse e teclado funcionam sem código, e sem JavaScript a lista
 * continua rolável. As setas só existem onde há mouse (`pointer-fine`) e são
 * atalho, não requisito.
 *
 * Cada cartão ocupa menos que a largura toda, para o próximo aparecer na borda
 * — é o que avisa que dá para rolar, sem precisar de bolinhas de paginação.
 */

export type FotoCarrossel = { titulo: string; descricao?: string; imagem: string };

export function CarrosselFotos({ fotos }: { fotos: FotoCarrossel[] }) {
  const trilho = useRef<HTMLUListElement>(null);
  const [inicio, setInicio] = useState(true);
  const [fim, setFim] = useState(false);

  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    const medir = () => {
      setInicio(el.scrollLeft <= 4);
      setFim(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    };
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    return () => {
      el.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
    };
  }, []);

  const rolar = (sentido: 1 | -1) => {
    const el = trilho.current;
    if (!el) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: sentido * el.clientWidth * 0.8,
      behavior: reduzir ? "auto" : "smooth",
    });
  };

  const seta =
    "absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full " +
    "bg-[var(--c-bg)] text-[var(--c-fg)] shadow-lg transition-opacity pointer-fine:flex " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-primary)] " +
    "disabled:pointer-events-none disabled:opacity-0";

  return (
    <div className="relative">
      <ul
        ref={trilho}
        tabIndex={0}
        aria-label="Fotos — role para o lado para ver mais"
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-5 overflow-x-auto px-4 pb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--c-primary)] [&::-webkit-scrollbar]:hidden"
      >
        {fotos.map((f, i) => (
          <li
            key={i}
            className="relative isolate aspect-[4/5] w-[80%] shrink-0 snap-start overflow-hidden rounded-3xl sm:w-[46%] lg:w-[36%]"
          >
            <Image
              src={f.imagem}
              // Vazio de propósito: a legenda logo abaixo já diz o nome, e com
              // alt o leitor de tela anunciava "Vinhedo Girassol" duas vezes.
              alt=""
              fill
              sizes="(min-width: 1024px) 36vw, (min-width: 640px) 46vw, 80vw"
              className="-z-20 object-cover"
            />
            {/* Só a faixa da legenda escurece; a foto fica com a luz que tem. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-gradient-to-t from-black/60 to-transparent"
            />
            <div className="flex h-full flex-col justify-end p-6">
              <h3 className="text-xl font-semibold text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.45)]">
                {f.titulo}
              </h3>
              {f.descricao && (
                <p className="mt-1 text-sm leading-snug text-white [text-shadow:0_1px_6px_rgb(0_0_0/0.5)]">
                  {f.descricao}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        aria-label="Foto anterior"
        onClick={() => rolar(-1)}
        disabled={inicio}
        className={`${seta} left-2 lg:-left-5`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Próxima foto"
        onClick={() => rolar(1)}
        disabled={fim}
        className={`${seta} right-2 lg:-right-5`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
