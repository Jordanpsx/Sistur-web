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
export function CenarioNoturno({ chao }: { chao?: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      {/* Céu e estrelas — gradientes radiais, zero requisição. */}
      <div className="ceu-noturno absolute inset-0" />

      {/* A lua. Alta e à direita, longe da logo, que fica à esquerda do
          cabeçalho. No celular ela é a única peça do cenário que aparece — a
          barraca some abaixo de lg —, então precisa estar visível de cara. */}
      <div className="absolute right-8 top-20 sm:right-16 sm:top-24 lg:right-24">
        <div className="lua h-14 w-14 rounded-full sm:h-16 sm:w-16 lg:h-20 lg:w-20" />
      </div>

      {/* A mata. Uma peça só, ancorada à direita, sem repetir.

          Não ladrilha de propósito: esta arte tem o lado direito iluminado de
          quente, e é ali que a barraca fica — a luz no chão passa a ser a
          fogueira dela. Repetida, a mancha quente apareceria também à esquerda,
          onde não há fogo nenhum, e a cena deixaria de fazer sentido.

          `cover` com âncora no topo: a grama corre para fora pela borda de
          baixo da tela, que é o corte natural, em vez de as copas serem
          decepadas em cima. */}
      <div
        className="chao-noturno absolute inset-x-0 bottom-0 h-[38vh]"
        style={
          chao
            ? {
                backgroundImage: `url(${chao}), var(--chao-gradiente)`,
                backgroundRepeat: "no-repeat, no-repeat",
                backgroundPosition: "top right, bottom center",
                backgroundSize: "cover, 100% 100%",
              }
            : undefined
        }
      />
    </div>
  );
}
