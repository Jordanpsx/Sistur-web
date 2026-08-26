import Image from "next/image";
import Link from "next/link";

/**
 * A escolha: Day Use ou Camping, como duas fotos grandes em que se entra.
 *
 * Cada cartão é a foto inteira com o nome por cima. Apontando, o véu escurece e
 * a descrição sobe junto com o botão.
 *
 * ## Por que o hover não decide sozinho
 *
 * Em telefone não existe apontar. Um cartão que só revela horário, regra e
 * botão no `:hover` esconde tudo isso da maioria de quem acessa — e num site
 * de reserva o que está escondido é justamente o que faz decidir.
 *
 * Então a regra se inverte: o conteúdo é **visível por padrão**, e só se
 * recolhe onde o hover existe de verdade (`pointer-fine`, o mouse). Quem chega
 * pelo celular vê tudo de cara; quem chega pelo desktop ganha a revelação.
 *
 * `group-focus-within` acompanha o `group-hover` em toda parte: quem navega por
 * teclado chega ao botão pelo Tab, e o botão não pode estar invisível quando
 * recebe o foco.
 *
 * O cartão inteiro é um `<Link>` — em foto grande, a área clicável é a foto.
 * O "Selecionar" fica como affordance visual dentro dela, não como segundo
 * link, senão o leitor de tela anuncia o mesmo destino duas vezes.
 */

export type EscolhaExperiencia = {
  slug: string;
  nome: string;
  descricao?: string | null;
  /** Detalhe prático: "Das 08h às 17h", "Mínimo de 24 horas". */
  nota?: string | null;
  /** Vazia = o cartão usa um painel neutro. Ver a nota no corpo. */
  imagem?: string | null;
};

export function ExperienceChoice({
  titulo = "Como você quer aproveitar?",
  subtitulo,
  experiencias,
}: {
  titulo?: string;
  subtitulo?: string;
  experiencias: EscolhaExperiencia[];
}) {
  if (experiencias.length === 0) return null;

  return (
    <section id="experiencias" className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight text-[var(--c-fg)] md:text-3xl">
        {titulo}
      </h2>
      {subtitulo && (
        <p className="mx-auto mt-3 max-w-xl text-center text-[var(--c-muted)]">
          {subtitulo}
        </p>
      )}

      <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        {experiencias.map((e) => (
          <li key={e.slug}>
            <Link
              href={`/reservar/${e.slug}/`}
              className="group relative flex aspect-[4/5] w-full overflow-hidden rounded-2xl
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4
                         focus-visible:outline-[var(--c-primary)] sm:aspect-[3/2] md:aspect-[4/5]"
            >
              {/* Sem foto o cartão não inventa uma: fica um painel neutro,
                  com a mesma forma e o mesmo comportamento. A ausência aparece
                  na tela, que é como o operador descobre o que falta subir. */}
              {e.imagem ? (
                <Image
                  src={e.imagem}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 45vw, 92vw"
                  className="object-cover transition-transform duration-500 ease-out
                             group-hover:scale-[1.04]"
                />
              ) : (
                <div aria-hidden="true" className="absolute inset-0 bg-[var(--c-primary-dark)]" />
              )}

              {/* Véu leve por padrão; fecha ao apontar. Também escurece por
                  baixo sempre, para o nome não flutuar sobre céu claro. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10
                           transition-colors duration-300 group-hover:from-black/85
                           group-hover:via-black/60 group-hover:to-black/40
                           group-focus-within:from-black/85 group-focus-within:via-black/60"
              />

              <div className="relative flex w-full flex-col items-center justify-end gap-3 p-6 text-center">
                <h3 className="text-3xl font-extrabold uppercase tracking-tight text-white drop-shadow-lg md:text-4xl">
                  {e.nome}
                </h3>

                {/* Visível no toque, revelado no mouse. Ver a nota no topo. */}
                <div
                  className="flex flex-col items-center gap-3 transition-all duration-300 ease-out
                             pointer-fine:translate-y-4 pointer-fine:opacity-0
                             pointer-fine:group-hover:translate-y-0 pointer-fine:group-hover:opacity-100
                             pointer-fine:group-focus-within:translate-y-0
                             pointer-fine:group-focus-within:opacity-100"
                >
                  {e.descricao && (
                    <p className="max-w-sm text-sm leading-relaxed text-white/90">
                      {e.descricao}
                    </p>
                  )}
                  {e.nota && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-primary)]">
                      {e.nota}
                    </p>
                  )}
                  <span
                    className="mt-1 inline-flex min-h-[48px] items-center rounded-full
                               bg-[var(--c-primary)] px-8 text-sm font-bold uppercase tracking-wide
                               text-[var(--c-on-primary)] shadow-lg transition-transform
                               group-hover:scale-105"
                  >
                    Selecionar
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
