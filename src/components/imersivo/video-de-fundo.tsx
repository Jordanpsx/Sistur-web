"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Vídeo decorativo que sabe não tocar.
 *
 * Três razões para isto existir em vez de um `<video autoPlay>` solto:
 *
 *   1. **Ainda não temos vídeo.** A biblioteca de mídia não tem um único
 *      arquivo de vídeo. Todo componente daqui precisa ficar bom com só a
 *      imagem de poster, senão a página nasce quebrada esperando um asset.
 *   2. **`prefers-reduced-motion` é acessibilidade, não preferência.** Vídeo em
 *      loop de fundo provoca enjoo e desorientação em quem tem sensibilidade
 *      vestibular. Quem pediu menos movimento recebe o poster parado.
 *   3. **Dados móveis.** O visitante típico chega pelo celular, muitas vezes na
 *      estrada. O vídeo só começa a baixar quando entra na tela, e nunca em
 *      conexão que o navegador reporta como econômica.
 *
 * O elemento é `aria-hidden`: é decoração atrás de texto. O que precisa ser
 * lido está no conteúdo por cima, nunca no vídeo.
 */

type Conexao = { saveData?: boolean; effectiveType?: string };

function devePoupar(): boolean {
  const nav = navigator as Navigator & { connection?: Conexao };
  const c = nav.connection;
  if (!c) return false;
  return Boolean(c.saveData) || /^([23]g|slow-2g)$/.test(c.effectiveType ?? "");
}

export function VideoDeFundo({
  src,
  poster,
  className = "",
  tocarNoHover = false,
  ativo = true,
}: {
  /** Fontes do vídeo, da preferida para a alternativa. Vazio = só o poster. */
  src?: { url: string; tipo?: string }[];
  /** Imagem mostrada antes, no lugar de, e sob o vídeo. Sempre presente. */
  poster: string;
  className?: string;
  /** Card: só toca quando a pessoa aponta ou foca. Hero: toca ao entrar. */
  tocarNoHover?: boolean;
  /** O pai controla — hover, foco, ou o card estar visível. */
  ativo?: boolean;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [podeCarregar, setPodeCarregar] = useState(false);

  useEffect(() => {
    if (!src?.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (devePoupar()) return;

    const el = ref.current;
    if (!el) return;

    // Só baixa quando aparece. Um vídeo de hero fora da dobra custa megabytes
    // que ninguém pediu.
    const obs = new IntersectionObserver(
      ([entrada]) => entrada.isIntersecting && setPodeCarregar(true),
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [src]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !podeCarregar) return;
    const querTocar = tocarNoHover ? ativo : true;
    if (querTocar) {
      // O navegador pode recusar; não é erro nosso e não pode quebrar a página.
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [podeCarregar, ativo, tocarNoHover]);

  return (
    <video
      ref={ref}
      poster={poster}
      // `muted` e `playsInline` são o que permite tocar sozinho no iOS. Sem os
      // dois o vídeo abre em tela cheia ou simplesmente não começa.
      muted
      loop
      playsInline
      autoPlay={!tocarNoHover}
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
      className={`h-full w-full object-cover ${className}`}
    >
      {podeCarregar && src?.map((f) => <source key={f.url} src={f.url} type={f.tipo} />)}
    </video>
  );
}
