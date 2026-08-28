"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Photo viewer for one resource.
 *
 * The card shows a thumbnail on purpose — thirteen pits in a grid have to stay
 * scannable. This is where someone looks properly, so it fills the viewport
 * rather than sitting in a fixed 768px box as the first version did.
 *
 * The layout is a flex column with the image area as `flex-1 min-h-0`, so the
 * picture takes every pixel the header and thumbnails leave behind, at any
 * screen size, without a hardcoded aspect ratio cropping tall photos.
 *
 * Escape closes it and body scroll is locked while open — without the lock the
 * page behind scrolls under the overlay on iOS, which makes the dialog feel
 * broken.
 */
export function Galeria({
  titulo,
  imagens,
  onFechar,
}: {
  titulo: string;
  imagens: string[];
  onFechar: () => void;
}) {
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
      if (e.key === "ArrowRight") setAtual((i) => (i + 1) % imagens.length);
      if (e.key === "ArrowLeft")
        setAtual((i) => (i - 1 + imagens.length) % imagens.length);
    };
    document.addEventListener("keydown", tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = overflow;
    };
  }, [imagens.length, onFechar]);

  if (imagens.length === 0) return null;

  const irPara = (delta: number) =>
    setAtual((i) => (i + delta + imagens.length) % imagens.length);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos da ${titulo}`}
      onClick={onFechar}
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      /* Barras do sistema no celular: sem isto o cabeçalho some sob o notch e
         as miniaturas ficam atrás da gesture bar. */
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-2 text-white">
        <span className="truncate text-sm font-medium">{titulo}</span>
        <span className="shrink-0 text-xs text-white/60">
          {atual + 1} / {imagens.length}
        </span>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl leading-none hover:bg-white/10"
        >
          ×
        </button>
      </header>

      {/* min-h-0 é o que permite o flex-1 encolher abaixo do tamanho natural da
          imagem; sem isso a coluna transborda e a foto sai da tela. */}
      <div onClick={(e) => e.stopPropagation()} className="relative min-h-0 flex-1">
        <Image
          src={imagens[atual]}
          alt={`${titulo} — foto ${atual + 1} de ${imagens.length}`}
          fill
          /* Ocupa praticamente a viewport inteira; pedir menos que isso é o que
             fazia a foto abrir pequena. */
          sizes="100vw"
          quality={90}
          className="object-contain"
          priority
        />

        {imagens.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => irPara(-1)}
              aria-label="Foto anterior"
              className="absolute top-1/2 left-2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white hover:bg-black/70"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => irPara(1)}
              aria-label="Próxima foto"
              className="absolute top-1/2 right-2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white hover:bg-black/70"
            >
              ›
            </button>
          </>
        )}
      </div>

      {imagens.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex shrink-0 gap-2 overflow-x-auto px-4 py-3"
        >
          {imagens.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setAtual(i)}
              aria-label={`Foto ${i + 1}`}
              aria-current={i === atual}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded ${i === atual ? "ring-2 ring-white" : "opacity-50 hover:opacity-100"}`}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
