import { AtmosferaDiurna } from "./atmosfera-diurna";

/**
 * O cenário do dia: céu claro com a paisagem da cachoeira ao fundo.
 *
 * Mesma arquitetura do `CenarioNoturno` — uma camada fixa, atrás de tudo — mas
 * mais simples: não há lua nem estrelas para posicionar, só um céu chapado com
 * nuvens à deriva (`AtmosferaDiurna`) e uma faixa de paisagem ancorada ao
 * rodapé, que passa na frente delas.
 *
 * A arte já vem recortada (fundo transparente, sem faixa branca no topo) e traz
 * a churrasqueira encaixada na própria clareira de grama — não é mais uma peça
 * solta ancorada no canto.
 *
 * A faixa usa a proporção exata do panorama (`aspect-[4000/1039]`) em vez de
 * uma altura fixa em `vh`: com altura arbitrária, `contain` sobrava espaço nas
 * laterais ou embaixo sempre que a proporção da tela não batia com a da arte —
 * a imagem "encolhia" longe das bordas. Casando o contêiner com a proporção da
 * própria imagem, largura cheia (`inset-x-0`) e `cover` viram a mesma coisa:
 * a arte sempre toca as duas bordas, sem sobra e sem cortar nada. Como ela já
 * é transparente por cima da linha do horizonte, o céu chapado aparece através
 * dela sem precisar de máscara.
 *
 * O céu não é fotografia — é gradiente, medido para funcionar em qualquer
 * altura de tela sem emenda visível, do mesmo jeito que o céu noturno.
 */
export function CenarioDiurno({ paisagem }: { paisagem?: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <div className="ceu-diurno absolute inset-0" />
      <AtmosferaDiurna />

      {/* A faixa de paisagem, ancorada ao rodapé, com a proporção exata da
          arte — ver a nota acima sobre por que isso substitui a altura fixa. */}
      <div className="paisagem-diurno absolute inset-x-0 bottom-0 aspect-[4000/1039]">
        {paisagem && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${paisagem})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "bottom center",
              backgroundSize: "cover",
            }}
          />
        )}
      </div>
    </div>
  );
}
