import Image from "next/image";

/**
 * Deck de churrasqueira no canto direito, no tema diurno.
 *
 * Mesmo raciocínio do `BarracaDecorativa`: some abaixo de `lg`, é
 * `pointer-events-none` e `aria-hidden` porque é enfeite puro, e a borda
 * esquerda dissolve em vez de terminar em corte reto — ver `.deck-cenario`
 * em globals.css.
 *
 * A arte veio com fundo e sombra de estúdio (branco sólido, sombra
 * azulada). Os dois foram recortados na biblioteca de mídia antes de chegar
 * aqui — sem isso, a sombra original aparece como uma mancha clara sobre
 * qualquer fundo que não seja o branco em que ela foi renderizada. Se a arte
 * for trocada, a substituta precisa do mesmo tratamento.
 */
export function DeckDecorativo({ src }: { src: string }) {
  return (
    <div
      aria-hidden="true"
      // Mesma lógica de ancoragem da barraca: encostada no canto sem folga,
      // e recuada de `right-0` para a base não ser cortada pela borda da tela.
      className="pointer-events-none fixed right-0 -bottom-[3vh] z-0 hidden h-[32vh] select-none lg:block"
    >
      <Image
        src={src}
        alt=""
        width={2816}
        height={1536}
        loading="lazy"
        sizes="(min-width: 1280px) min(30vw, 620px), min(34vw, 620px)"
        className="deck-cenario h-full w-auto drop-shadow-[0_18px_28px_rgba(20,40,30,0.22)]"
      />
    </div>
  );
}
