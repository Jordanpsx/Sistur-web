"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Photo viewer for one resource.
 *
 * Deliberately plain: a dialog, a big image, thumbnails, and a way out. The
 * point is letting someone see the pit they are about to book, not a carousel.
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
      if (e.key === "ArrowLeft") setAtual((i) => (i - 1 + imagens.length) % imagens.length);
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos da ${titulo}`}
      onClick={onFechar}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3
                 bg-black/85 p-4"
    >
      <div className="flex w-full max-w-3xl items-center justify-between text-white">
        <span className="text-sm font-medium">{titulo}</span>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="flex h-11 w-11 items-center justify-center rounded-full
                     text-2xl hover:bg-white/10"
        >
          ×
        </button>
      </div>

      {/* Para o clique na imagem não fechar o diálogo. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-lg bg-black"
      >
        <Image
          src={imagens[atual]}
          alt={`${titulo} — foto ${atual + 1} de ${imagens.length}`}
          fill
          sizes="(min-width: 768px) 768px, 100vw"
          quality={90}
          className="object-contain"
          priority
        />
      </div>

      {imagens.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex max-w-3xl gap-2 overflow-x-auto pb-1"
        >
          {imagens.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setAtual(i)}
              aria-label={`Foto ${i + 1}`}
              aria-current={i === atual}
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded
                          ${i === atual ? "ring-2 ring-white" : "opacity-60 hover:opacity-100"}`}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
