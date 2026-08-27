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
      // Encostada no canto inferior direito, sem folga: ela pousa sobre o chão
      // do cenário, e uma margem ali a faria flutuar de novo — que é o defeito
      // que o chão veio corrigir.
      // Menor e recuada do canto: encostada em `right-0` a grama era fatiada
      // pela borda da tela, e no tamanho anterior a barraca competia com o
      // formulário em vez de emoldurá-lo.
      // Plantada na grama da mata, do lado que a arte já ilumina de quente.
      // Um pouco acima do rodapé: assim a base dela cai dentro da faixa de
      // grama em vez de encostar na borda da tela, e as duas peças passam a
      // ser um lugar só.
      className="pointer-events-none fixed bottom-[3vh] right-0 z-0 hidden w-[34vw]
                 max-w-[600px] select-none lg:block xl:w-[30vw]"
    >
      <Image
        src={src}
        alt=""
        width={1831}
        height={1141}
        // Sem `priority`: é decoração. Competir com o formulário pela banda da
        // primeira pintura seria trocar o que importa pelo que enfeita.
        loading="lazy"
        sizes="(min-width: 1280px) min(30vw, 600px), min(34vw, 600px)"
        // A borda esquerda dissolve antes de chegar ao formulário. No tamanho
        // pedido a barraca cobre 44% da coluna a 1024px — o card a 85% segura
        // o contraste, mas uma ilustração 3D detalhada atrás do texto continua
        // sendo ruído. Assim ela fica grande e ancorada à direita sem disputar
        // atenção com o que a pessoa está lendo.
        className="barraca-cenario h-auto w-full drop-shadow-[0_0_40px_rgba(251,191,36,0.18)]"
      />
    </div>
  );
}
