import Image from "next/image";

/**
 * Barraca acesa no canto da tela, no tema noturno.
 *
 * Some abaixo de `lg` de propósito. No celular a coluna do formulário ocupa a
 * largura toda e qualquer coisa no canto ou fica atrás do campo, ou empurra o
 * botão — e o funil é onde a pessoa digita CPF, não onde admira ilustração.
 *
 * `pointer-events-none` porque é enfeite: sem isso ela roubaria o toque de quem
 * mira o rodapé do formulário em telas estreitas de desktop. `aria-hidden`
 * porque não há o que anunciar — a informação está no formulário.
 *
 * A ilustração precisa ter fundo transparente. A que chegou vinha em WebP sem
 * canal alpha, com o branco queimado, e sobre o céu isso é um retângulo branco
 * no canto — o oposto do efeito. O recorte foi feito uma vez, na biblioteca de
 * mídia; se a arte for trocada, a substituta também precisa de alpha.
 */
export function BarracaDecorativa({ src }: { src: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 right-6 z-0 hidden w-[22rem] select-none lg:block xl:w-[26rem]"
    >
      <Image
        src={src}
        alt=""
        width={663}
        height={485}
        // Sem `priority`: é decoração. Competir com o formulário pela banda da
        // primeira pintura seria trocar o que importa pelo que enfeita.
        loading="lazy"
        sizes="(min-width: 1280px) 26rem, 22rem"
        className="h-auto w-full drop-shadow-[0_0_40px_rgba(251,191,36,0.18)]"
      />
    </div>
  );
}
