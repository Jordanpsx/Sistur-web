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
export function CenarioNoturno() {
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

      {/* Chão: a mata escura no rodapé. Sem ela o diorama flutua no vazio.
          Full-width e ~20vh, com o topo dissolvendo no céu. */}
      <div className="chao-noturno absolute inset-x-0 bottom-0 h-[20vh] lg:h-[26vh]" />
    </div>
  );
}
