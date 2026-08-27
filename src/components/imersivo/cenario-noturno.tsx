/**
 * O cenário: céu, lua, estrelas e chão.
 *
 * Uma camada só, fixa, atrás de tudo. Estar junta é o ponto — z-index e
 * `pointer-events` de enfeite decididos num arquivo, em vez de espalhados por
 * três componentes que precisam concordar entre si para o formulário continuar
 * clicável.
 *
 * A ordem no DOM é a ordem em profundidade: céu, depois lua, depois chão. Todos
 * dentro do mesmo `-z-10`, então nada disso disputa camada com a barraca (`z-0`)
 * nem com o formulário (`z-10`).
 *
 * Nada aqui se move. É uma tela onde a pessoa digita CPF e escolhe data —
 * cintilação ao lado de um campo de formulário distrai justamente quem está
 * conferindo um número. O céu fica vivo por densidade, não por animação.
 */
export function CenarioNoturno({ ceu, chao }: { ceu?: string; chao?: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      {/* O céu. Imagem, não gradiente: ela traz a lua crescente e as estrelas
          desenhadas, com uma densidade que radial-gradient não alcança.

          Ancorada à direita e no topo, porque é onde a lua está — com âncora
          ao centro ela sairia do quadro em tela estreita. O gradiente fica por
          baixo para cobrir o que a imagem não alcançar. */}
      <div className="ceu-noturno absolute inset-0">
        {ceu && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${ceu})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "top right",
              backgroundSize: "cover",
            }}
          />
        )}
      </div>

      {/* A mata. Duas camadas: o gradiente cobre a largura toda, e a arte
          pousa sobre ele ancorada à direita.

          Escalada por ALTURA, não por largura. Com largura, a copa crescia com
          a tela enquanto a barraca crescia com a altura, e as duas descasavam —
          numa ultrawide a barraca acabava dentro das árvores. Por altura, a
          base da copa fica sempre em 60% da faixa, em qualquer resolução, e a
          barraca cabe na frente dela por construção.

          Não repete: esta arte tem o lado direito aceso de quente, e é ali que
          a barraca fica — a luz no chão é a fogueira dela. Ladrilhada, o mesmo
          calor apareceria à esquerda, onde não há fogo.

          Em telas muito largas a arte não alcança a ponta esquerda; a borda
          dissolve no gradiente em vez de terminar em corte. */}
      <div className="chao-noturno absolute inset-x-0 bottom-0 h-[48vh]">
        {chao && (
          <div
            className="mata-arte absolute inset-0"
            style={{
              backgroundImage: `url(${chao})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "bottom right",
              backgroundSize: "auto 100%",
            }}
          />
        )}
      </div>
    </div>
  );
}
