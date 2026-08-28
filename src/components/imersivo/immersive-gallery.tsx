"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

/**
 * Galeria de mídia mista para um espaço — restaurante, área de churrasqueiras.
 *
 * Três tipos convivendo na mesma grade, decididos pelo dado e não por um prop
 * de configuração: foto, vídeo curto e panorama 360°.
 *
 * O 360° é uma **casca**, de propósito. Um visualizador de esfera custa
 * centenas de kilobytes de JavaScript e precisa de WebGL; carregá-lo em toda
 * galeria para o caso de existir um panorama penaliza quem só quer ver as
 * fotos. Aqui ele fica anunciado e clicável, e o visualizador de verdade —
 * `react-photo-sphere-viewer` ou equivalente — entra por `dynamic()` no dia em
 * que houver panorama para mostrar. Enquanto isso o item mostra sua prévia
 * plana, que é honesta: é uma foto do lugar.
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

export function ImmersiveGallery({
  titulo,
  itens,
}: {
  titulo?: string;
  itens: MediaItem[];
}) {
  const [aberto, setAberto] = useState<number | null>(null);

  const fechar = useCallback(() => setAberto(null), []);
  const mover = useCallback(
    (passo: number) =>
      setAberto((i) => (i == null ? i : (i + passo + itens.length) % itens.length)),
    [itens.length],
  );

  useEffect(() => {
    if (aberto == null) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowRight") mover(1);
      if (e.key === "ArrowLeft") mover(-1);
    };
    window.addEventListener("keydown", tecla);
    // Trava o fundo: rolar a página atrás do visualizador desorienta.
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [aberto, fechar, mover]);

  if (itens.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      {titulo && (
        <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight text-[var(--c-fg)] uppercase">
          {titulo}
        </h2>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {itens.map((m, i) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => setAberto(i)}
              className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-accent)]"
            >
              <Image
                src={m.poster}
                alt={m.alt ?? ""}
                fill
                sizes="(min-width: 640px) 300px, 45vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {m.type !== "image" && <Selo tipo={m.type} />}
            </button>
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
        />
      )}
    </section>
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
}: {
  item: MediaItem;
  posicao: number;
  total: number;
  onFechar: () => void;
  onMover: (passo: number) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.legenda ?? item.alt ?? "Visualizar mídia"}
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <header className="flex shrink-0 items-center justify-between p-3">
        <span className="text-sm text-white/70 tabular-nums">
          {posicao} / {total}
        </span>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="flex h-11 w-11 items-center justify-center rounded-full text-2xl text-white hover:bg-white/10"
        >
          ×
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        {total > 1 && <Seta lado="esquerda" onClick={() => onMover(-1)} />}
        <Conteudo item={item} />
        {total > 1 && <Seta lado="direita" onClick={() => onMover(1)} />}
      </div>

      {item.legenda && (
        <p className="shrink-0 px-4 py-3 text-center text-sm text-white/80">
          {item.legenda}
        </p>
      )}
    </div>
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
          360° View Enabled
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
      aria-label={lado === "esquerda" ? "Anterior" : "Próxima"}
      className={
        "absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center " +
        "rounded-full bg-black/50 text-2xl text-white hover:bg-black/70" +
        (lado === "esquerda" ? "left-2" : "right-2")
      }
    >
      {lado === "esquerda" ? "‹" : "›"}
    </button>
  );
}
