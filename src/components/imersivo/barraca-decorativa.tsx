/**
 * Barraca acesa no canto da tela, no tema noturno.
 *
 * Some abaixo de `lg` de propósito. No celular a coluna do formulário ocupa a
 * largura toda e qualquer coisa no canto ou fica atrás do campo, ou empurra o
 * botão — e o funil é onde a pessoa digita CPF, não onde ela admira ilustração.
 *
 * `pointer-events-none` porque é enfeite: sem isso ela roubaria o toque de quem
 * mira o rodapé do formulário em telas estreitas de desktop. `aria-hidden`
 * porque não há o que anunciar — a informação está no formulário.
 *
 * SVG inline, não arquivo: são poucos caminhos, e uma requisição a menos numa
 * tela que já busca catálogo, disponibilidade e preço.
 */
export function BarracaDecorativa() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 right-10 z-0 hidden w-64 lg:block"
    >
      <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Brilho da fogueira, atrás de tudo */}
        <ellipse cx="186" cy="150" rx="46" ry="20" fill="#f59e0b" opacity="0.18" />
        <ellipse cx="186" cy="150" rx="24" ry="10" fill="#fbbf24" opacity="0.28" />

        {/* Chão */}
        <path d="M0 152h240" stroke="#312e81" strokeWidth="2" opacity="0.55" />

        {/* Barraca */}
        <path d="M74 152 L118 66 L162 152 Z" fill="#1e1b4b" />
        <path d="M74 152 L118 66 L118 152 Z" fill="#312e81" />
        {/* Entrada acesa: é o que faz a barraca parecer habitada */}
        <path d="M104 152 L118 96 L132 152 Z" fill="#fbbf24" opacity="0.85" />
        <path d="M110 152 L118 112 L126 152 Z" fill="#fef3c7" opacity="0.9" />
        {/* Estais */}
        <path d="M74 152 L58 158 M162 152 L178 158" stroke="#312e81" strokeWidth="2" />

        {/* Fogueira */}
        <path
          d="M186 150c-6-4-9-9-9-14 0-6 5-9 5-14 0 4 3 6 5 9 2-4 1-8-1-12 6 4 11 10 11 17 0 6-4 11-11 14Z"
          fill="#f59e0b"
        />
        <path
          d="M186 150c-3-2-5-5-5-8 0-4 3-5 3-8 0 2 2 3 3 5 1-2 0-4 0-6 3 2 5 5 5 9 0 3-2 6-6 8Z"
          fill="#fef3c7"
        />
        <path d="M174 152h24" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
