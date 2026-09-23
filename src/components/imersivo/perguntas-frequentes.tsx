/**
 * Perguntas frequentes em sanfona, no fim da página.
 *
 * Feito com `<details>`/`<summary>` e nenhum JavaScript: abre e fecha por
 * clique, por Enter e por espaço, é anunciado como grupo expansível pelos
 * leitores de tela e continua funcionando se o script falhar. Um acordeão
 * escrito à mão precisaria reconstruir tudo isso — e costuma errar o teclado.
 *
 * Todas fechadas por padrão: a página termina com uma lista curta de perguntas
 * que se varre com o olho, e não com uma parede de texto. Quem procura uma
 * resposta específica acha pelo título.
 *
 * O JSON-LD repete as mesmas perguntas e respostas para o buscador. Ele sai do
 * próprio conteúdo publicado, nunca de texto inventado — dado estruturado que
 * não bate com a página é penalizado.
 */

export type Pergunta = { question: string; answer: string };

export function PerguntasFrequentes({
  titulo,
  subtitulo,
  perguntas,
}: {
  titulo?: string;
  subtitulo?: string;
  perguntas: Pergunta[];
}) {
  if (perguntas.length === 0) return null;

  const dados = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: perguntas.map((p) => ({
      "@type": "Question",
      name: p.question,
      acceptedAnswer: { "@type": "Answer", text: p.answer },
    })),
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      {titulo && <h2 className="sec-title mb-6 text-3xl sm:text-4xl">{titulo}</h2>}
      {subtitulo && (
        <p className="mx-auto mb-10 max-w-xl text-center text-[var(--c-muted)]">
          {subtitulo}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {perguntas.map((p, i) => (
          <li
            key={i}
            className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)]"
          >
            <details className="group">
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-[var(--c-fg)] transition-colors hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--c-primary)] [&::-webkit-details-marker]:hidden">
                {p.question}
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 shrink-0 text-[var(--c-accent-dark)] transition-transform duration-200 group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <p className="border-t border-[var(--c-border)] px-5 py-4 leading-relaxed text-[var(--c-muted)]">
                {p.answer}
              </p>
            </details>
          </li>
        ))}
      </ul>

      <script
        type="application/ld+json"
        // O "<" vira \u003c: o Sistur já recusa markup em qualquer prop, mas
        // um "</script>" que escapasse fecharia a tag e o resto do texto
        // viraria HTML. Escapar aqui custa nada e não depende daquela regra.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(dados).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  );
}
