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
 * recolhe onde o hover existe de verdade — `com-mouse:`, que exige ponteiro
 * fino **e** hover. Só ponteiro fino não basta: caneta e alguns híbridos têm
 * ponteiro fino sem hover, e ali o conteúdo sumiria sem ter como voltar.
 *
 * ## Por que o véu fica no texto, e não na foto
 *
 * A foto vem do CMS. Um degradê pintado sobre ela deixa o contraste do texto
 * à mercê da imagem: sobre céu ou água ao sol, o título caía para 2:1. O véu
 * agora é o fundo do próprio bloco de texto — no mínimo 65% de preto sob
 * qualquer letra, esvaindo só nos 6rem de respiro acima dele. Mesmo sobre uma
 * foto toda branca o texto branco fica em ~7:1. Trocar a foto não quebra a
 * leitura.
 *
 * `group-focus-within` acompanha o `group-hover` em toda parte: quem navega por
 * teclado chega ao botão pelo Tab, e o botão não pode estar invisível quando
 * recebe o foco.
 *
 * O cartão inteiro é um `<Link>` — em foto grande, a área clicável é a foto.
 * O "Reservar" fica como affordance visual dentro dela, não como segundo
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
    <section id="experiencias" className="mx-auto max-w-5xl px-4 py-20">
      {/* Mesmo título das outras seções (.sec-title). Era peso 800 e menor
          que os demais — a seção da decisão principal parecia de outro site. */}
      <h2 className="sec-title text-3xl sm:text-4xl">{titulo}</h2>
      {subtitulo && (
        <p className="mx-auto mt-6 max-w-xl text-center text-[var(--c-muted)]">
          {subtitulo}
        </p>
      )}

      <ul className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
        {experiencias.map((e) => (
          <li key={e.slug}>
            <Link
              href={`/reservar/${e.slug}/`}
              className="group relative flex aspect-[3/4] w-full items-end overflow-hidden rounded-3xl shadow-xl shadow-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--c-primary)]"
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
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[var(--c-primary-dark)]"
                />
              )}

              {/* Véu no bloco de texto, não na foto — ver a nota no topo. */}
              <div className="relative flex w-full flex-col items-center gap-3 px-8 pt-24 pb-8 text-center [background:linear-gradient(to_top,rgb(0_0_0/0.75)_0%,rgb(0_0_0/0.65)_calc(100%_-_6rem),rgb(0_0_0/0)_100%)]">
                <h3 className="text-3xl font-extrabold tracking-tight text-white uppercase [text-shadow:0_2px_12px_rgb(0_0_0/0.45)] md:text-4xl">
                  {e.nome}
                </h3>

                {/* Visível no toque, revelado no mouse. Ver a nota no topo. */}
                <div className="com-mouse:translate-y-4 com-mouse:opacity-0 com-mouse:group-focus-within:translate-y-0 com-mouse:group-focus-within:opacity-100 com-mouse:group-hover:translate-y-0 com-mouse:group-hover:opacity-100 flex flex-col items-center gap-3 transition-all duration-300 ease-out">
                  {e.descricao && (
                    <p className="max-w-sm text-sm leading-relaxed text-white [text-shadow:0_1px_6px_rgb(0_0_0/0.5)]">
                      {e.descricao}
                    </p>
                  )}
                  {e.nota && (
                    <p className="text-xs font-semibold tracking-wide text-white uppercase">
                      {e.nota}
                    </p>
                  )}
                  <span className="mt-1 inline-flex min-h-[48px] items-center rounded-full bg-[var(--c-primary)] px-8 text-sm font-bold tracking-wide text-[var(--c-on-primary)] uppercase shadow-lg transition-transform group-hover:scale-105">
                    Reservar
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
