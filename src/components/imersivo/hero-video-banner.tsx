import Link from "next/link";
import Image from "next/image";
import { VideoDeFundo } from "./video-de-fundo";

/**
 * O convite: a primeira dobra da home.
 *
 * Um vídeo de drone atrás, um gradiente que garante contraste, uma frase e as
 * duas portas de entrada — Day Use e Camping. Nada mais: quem chega aqui está
 * decidindo se vem, não escolhendo tarifa.
 *
 * **O vídeo é opcional e continuará sendo.** Sem `video`, a imagem de poster
 * assume e a seção fica idêntica em tudo o mais. Isso não é tolerância a falha,
 * é o estado de hoje — não existe filmagem na biblioteca ainda.
 *
 * O gradiente vai de baixo para cima, mais forte embaixo, porque é lá que o
 * texto fica. Um véu uniforme sobre a imagem inteira transforma a paisagem num
 * retângulo cinza, e a paisagem é o argumento de venda.
 */

export type CtaExperiencia = {
  /** Rótulo curto: "Day Use", "Camping". */
  label: string;
  /** Rota do funil — `/reservar/day-use/`. Vem do slug da categoria. */
  href: string;
};

export function HeroVideoBanner({
  titulo,
  subtitulo,
  poster,
  video,
  ctas,
}: {
  titulo: string;
  subtitulo?: string;
  /** Obrigatória: é o que se vê antes, durante o carregamento e no lugar do vídeo. */
  poster: string;
  video?: { url: string; tipo?: string }[];
  ctas: CtaExperiencia[];
}) {
  return (
    <section className="relative isolate flex min-h-[88svh] items-end overflow-hidden">
      <div className="absolute inset-0 -z-20">
        {video?.length ? (
          <VideoDeFundo src={video} poster={poster} />
        ) : (
          <Image
            src={poster}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
      </div>

      {/* Escurece só onde o texto pousa. Ver a nota no topo. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/40 to-black/10"
      />

      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-28 sm:pb-24">
        <h1 className="max-w-3xl text-4xl font-semibold uppercase leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-6xl lg:text-7xl">
          {titulo}
        </h1>

        {subtitulo && (
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
            {subtitulo}
          </p>
        )}

        {ctas.length > 0 && (
          <nav aria-label="Escolha sua experiência" className="mt-9">
            <ul className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {ctas.map((c, i) => (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    className={
                      // O primeiro é o caminho principal; os demais são
                      // alternativas legítimas, não ações secundárias — daí
                      // contorno sólido em vez de link apagado.
                      "inline-flex min-h-[52px] w-full items-center justify-center rounded-full px-9 " +
                      "text-base font-semibold uppercase tracking-wide transition-transform " +
                      "duration-200 hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 " +
                      "focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto " +
                      (i === 0
                        ? "bg-[var(--c-accent)] text-[var(--c-on-accent)] shadow-lg hover:bg-[var(--c-accent-dark)]"
                        : "border-2 border-white/80 bg-white/10 text-white backdrop-blur hover:bg-white/20")
                    }
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}
