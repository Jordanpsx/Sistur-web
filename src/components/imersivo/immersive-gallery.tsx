"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

/**
 * Galeria de mídia mista — foto, vídeo curto e panorama 360° — decidida pelo
 * dado, não por um prop de configuração.
 *
 * **Duas formas, uma lista.** No celular, uma faixa que se arrasta para o lado:
 * a página já é longa, e uma grade de sete fotos somaria quatro telas. No
 * desktop, um mosaico — a primeira foto grande e quatro ao lado; havendo mais,
 * a última mostra quantas faltam. Em qualquer uma, tocar abre o visualizador.
 *
 * **O visualizador é um diálogo modal de verdade**, como o menu do celular:
 * portal no `<body>`, o resto da página inerte, foco preso, Esc fecha, setas
 * do teclado e arrastar para o lado trocam a foto, e ao fechar o foco volta
 * para a foto que o abriu.
 *
 * O 360° é uma **casca**, de propósito. Um visualizador de esfera custa
 * centenas de kilobytes de JavaScript e precisa de WebGL; carregá-lo em toda
 * galeria para o caso de existir um panorama penaliza quem só quer ver as
 * fotos. Aqui ele fica anunciado e clicável, e o visualizador de verdade entra
 * por `dynamic()` no dia em que houver panorama para mostrar.
 */

export type MediaType = "image" | "video" | "360";

export type MediaItem = {
  id: string;
  type: MediaType;
  /** Foto, poster do vídeo, ou prévia plana do panorama. Sempre presente. */
  poster: string;
  /** Só para `video`; e para `360`, a esfera equirretangular. */
  src?: string;
  /** Texto alternativo. Vazio só quando a mídia for pura decoração. */
  alt?: string;
  legenda?: string;
};

/** Quantas fotos o mosaico do desktop mostra antes do "+N". */
const NO_MOSAICO = 5;

export function ImmersiveGallery({
  titulo,
  subtitulo,
  itens,
}: {
  titulo?: string;
  subtitulo?: string;
  itens: MediaItem[];
}) {
  const [aberto, setAberto] = useState<number | null>(null);
  const origem = useRef<HTMLElement | null>(null);

  const abrir = (i: number, el: HTMLElement) => {
    origem.current = el;
    setAberto(i);
  };
  const fechar = useCallback(() => setAberto(null), []);
  const mover = useCallback(
    (passo: number) =>
      setAberto((i) => (i == null ? i : (i + passo + itens.length) % itens.length)),
    [itens.length],
  );

  if (itens.length === 0) return null;

  const mosaico = itens.length >= NO_MOSAICO;
  const restantes = itens.length - NO_MOSAICO;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      {titulo && <h2 className="sec-title text-3xl sm:text-4xl">{titulo}</h2>}
      {subtitulo && (
        <p className="mx-auto mt-6 max-w-xl text-center text-[var(--c-muted)]">
          {subtitulo}
        </p>
      )}

      {/* Celular: faixa que se arrasta. O próximo cartão aparece na borda — é
          o que avisa que há mais para o lado. */}
      <ul
        aria-label="Fotos — arraste para o lado para ver mais"
        className="-mx-4 mt-10 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2 sm:hidden [&::-webkit-scrollbar]:hidden"
      >
        {itens.map((m, i) => (
          <li key={m.id} className="w-[72%] shrink-0 snap-start">
            <Miniatura
              item={m}
              sizes="72vw"
              className="aspect-[4/5]"
              onAbrir={(el) => abrir(i, el)}
            />
          </li>
        ))}
      </ul>

      {/* Desktop: mosaico, ou grade simples se houver poucas fotos. */}
      <ul
        className={[
          "mt-12 hidden gap-3 sm:grid",
          mosaico
            ? "h-[min(70vh,560px)] grid-cols-4 grid-rows-2"
            : "grid-cols-2 lg:grid-cols-3",
        ].join(" ")}
      >
        {itens.slice(0, mosaico ? NO_MOSAICO : itens.length).map((m, i) => (
          <li key={m.id} className={mosaico && i === 0 ? "col-span-2 row-span-2" : ""}>
            <Miniatura
              item={m}
              sizes={mosaico && i === 0 ? "50vw" : "25vw"}
              className={mosaico ? "h-full" : "aspect-square"}
              extra={mosaico && i === NO_MOSAICO - 1 && restantes > 0 ? restantes : 0}
              onAbrir={(el) => abrir(i, el)}
            />
          </li>
        ))}
      </ul>

      {aberto != null && (
        <Visualizador
          item={itens[aberto]}
          posicao={aberto + 1}
          total={itens.length}
          onFechar={fechar}
          onMover={mover}
          origem={origem}
        />
      )}
    </section>
  );
}

function Miniatura({
  item,
  sizes,
  className,
  extra = 0,
  onAbrir,
}: {
  item: MediaItem;
  sizes: string;
  className: string;
  /** Fotos que não cabem no mosaico, mostradas como "+N" sobre esta. */
  extra?: number;
  onAbrir: (el: HTMLElement) => void;
}) {
  const nome = item.alt || item.legenda || "Foto";
  return (
    <button
      type="button"
      onClick={(e) => onAbrir(e.currentTarget)}
      aria-label={extra ? `${nome} — ver todas as fotos` : `Ampliar: ${nome}`}
      className={`group relative block w-full overflow-hidden rounded-2xl bg-[var(--c-surface)] ${className}`}
    >
      <Image
        src={item.poster}
        alt=""
        fill
        sizes={sizes}
        className="com-mouse:group-hover:scale-[1.04] object-cover transition-transform duration-500 ease-out"
      />
      {item.type !== "image" && <Selo tipo={item.type} />}
      {extra > 0 && (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-semibold text-white"
        >
          +{extra} fotos
        </span>
      )}
    </button>
  );
}

/** Marca o que não é foto, para o clique não surpreender. */
function Selo({ tipo }: { tipo: Exclude<MediaType, "image"> }) {
  const texto = tipo === "video" ? "▶ Vídeo" : "360°";
  return (
    <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
      {texto}
    </span>
  );
}

function Visualizador({
  item,
  posicao,
  total,
  onFechar,
  onMover,
  origem,
}: {
  item: MediaItem;
  posicao: number;
  total: number;
  onFechar: () => void;
  onMover: (passo: number) => void;
  origem: React.RefObject<HTMLElement | null>;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const toque = useRef<number | null>(null);

  // Abrir: resto da página inerte e sem rolagem, foco no Fechar. Fechar: tudo
  // volta, e o foco retorna à miniatura que abriu — depois de o inert sair,
  // porque elemento inerte não aceita foco.
  useEffect(() => {
    const raiz = caixa.current;
    const volta = origem.current;
    const inertes = [...document.body.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== raiz && !el.inert,
    );
    inertes.forEach((el) => (el.inert = true));
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    raiz?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      inertes.forEach((el) => (el.inert = false));
      document.body.style.overflow = antes;
      volta?.focus();
    };
  }, [origem]);

  function teclas(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") onFechar();
    else if (e.key === "ArrowRight") onMover(1);
    else if (e.key === "ArrowLeft") onMover(-1);
    else if (e.key === "Tab" && caixa.current) {
      const botoes = caixa.current.querySelectorAll<HTMLElement>("button");
      const primeiro = botoes[0];
      const ultimo = botoes[botoes.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
  }

  const inicioToque = (e: TouchEvent) => (toque.current = e.touches[0].clientX);
  const fimToque = (e: TouchEvent) => {
    if (toque.current == null) return;
    const dx = e.changedTouches[0].clientX - toque.current;
    toque.current = null;
    if (Math.abs(dx) > 50 && total > 1) onMover(dx < 0 ? 1 : -1);
  };

  return createPortal(
    <div
      ref={caixa}
      role="dialog"
      aria-modal="true"
      aria-label={item.legenda || item.alt || "Visualizar foto"}
      onKeyDown={teclas}
      className="fixed inset-0 z-[70] flex flex-col bg-black/95"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <header className="flex shrink-0 items-center justify-between p-3">
        <span className="px-2 text-sm text-white/80 tabular-nums" aria-live="polite">
          {posicao} de {total}
        </span>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2"
        onTouchStart={inicioToque}
        onTouchEnd={fimToque}
      >
        {total > 1 && <Seta lado="esquerda" onClick={() => onMover(-1)} />}
        {/* key por item: sem ela o React reaproveita o mesmo <img>, e o
            navegador segura a foto anterior até a nova carregar — a legenda
            e o contador já trocaram e a imagem ainda não. */}
        <Conteudo key={item.id} item={item} />
        {total > 1 && <Seta lado="direita" onClick={() => onMover(1)} />}
      </div>

      {(item.legenda || item.alt) && (
        <p className="shrink-0 px-4 py-3 text-center text-sm text-white/85">
          {item.legenda || item.alt}
        </p>
      )}
    </div>,
    document.body,
  );
}

function Conteudo({ item }: { item: MediaItem }) {
  if (item.type === "video" && item.src) {
    return (
      // Com controles e sem autoplay: aqui a pessoa pediu para ver, então ela
      // manda no play, no volume e no tempo.
      <video
        src={item.src}
        poster={item.poster}
        controls
        playsInline
        preload="metadata"
        className="max-h-full max-w-full"
      />
    );
  }

  if (item.type === "360") {
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <Image
          src={item.poster}
          alt={item.alt ?? ""}
          fill
          sizes="100vw"
          quality={90}
          className="object-contain"
        />
        {/* O ponto de entrada do visualizador de esfera. Ver a nota no topo:
            o pacote entra por dynamic() quando houver panorama de verdade. */}
        <div
          data-panorama={item.src ?? item.poster}
          className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur"
        >
          Vista 360°
        </div>
      </div>
    );
  }

  return (
    <Image
      src={item.poster}
      alt={item.alt ?? ""}
      fill
      sizes="100vw"
      quality={90}
      className="object-contain"
    />
  );
}

function Seta({ lado, onClick }: { lado: "esquerda" | "direita"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === "esquerda" ? "Foto anterior" : "Próxima foto"}
      // Em lista: a soma de strings sem espaço colava "left-2" na classe
      // anterior e as setas perdiam a posição.
      className={[
        "absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center",
        "rounded-full bg-black/50 text-white hover:bg-black/70",
        lado === "esquerda" ? "left-2" : "right-2",
      ].join(" ")}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={lado === "esquerda" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}
