import Image from "next/image";
import { Icone, ehIcone } from "@/components/ui/icone";

/**
 * O que você encontra aqui — estrutura e atrações num lugar só.
 *
 * Juntou dois blocos que diziam a mesma coisa ("Nossa Estrutura" e "Além da
 * Água") e respondia mal a pergunta que importa: isso está no ingresso? O selo
 * de cada cartão diz a condição — "Incluso no ingresso", "Pago à parte · só aos
 * domingos", "Outra atração" — em texto, não em cor, para valer também para
 * quem não distingue cores.
 *
 * Foto quando houver; sem foto, o ícone de traço fino ocupa o lugar dela, e o
 * cartão mantém a mesma forma — a grade não fica desalinhada por item.
 *
 * No celular, faixa que se arrasta (a página já é longa); do `sm` em diante,
 * grade.
 */

export type Atracao = {
  titulo: string;
  descricao?: string;
  imagem?: string;
  icone?: string;
  selo?: string;
};

function Cartao({ a }: { a: Atracao }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-sm">
      <div className="relative aspect-[16/10] bg-[var(--c-surface)]">
        {a.imagem ? (
          <Image
            src={a.imagem}
            alt=""
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 78vw"
            className="object-cover"
          />
        ) : (
          ehIcone(a.icone) && (
            <span className="absolute inset-0 flex items-center justify-center text-[var(--c-accent-dark)]">
              <Icone nome={a.icone} className="h-12 w-12" />
            </span>
          )
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {a.selo && (
          <span className="self-start rounded-full bg-[var(--c-surface)] px-3 py-1 text-xs font-semibold text-[var(--c-accent-dark)]">
            {a.selo}
          </span>
        )}
        <h3 className="text-lg font-semibold text-[var(--c-fg)]">{a.titulo}</h3>
        {a.descricao && (
          <p className="text-sm leading-relaxed text-[var(--c-muted)]">{a.descricao}</p>
        )}
      </div>
    </article>
  );
}

export function Atracoes({
  titulo,
  subtitulo,
  itens,
}: {
  titulo?: string;
  subtitulo?: string;
  itens: Atracao[];
}) {
  if (itens.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      {titulo && <h2 className="sec-title text-3xl sm:text-4xl">{titulo}</h2>}
      {subtitulo && (
        <p className="mx-auto mt-6 max-w-xl text-center text-[var(--c-muted)]">
          {subtitulo}
        </p>
      )}
      <ul
        aria-label={titulo}
        className="-mx-4 mt-10 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden"
      >
        {itens.map((a, i) => (
          <li key={i} className="w-[78%] shrink-0 snap-start sm:w-auto">
            <Cartao a={a} />
          </li>
        ))}
      </ul>
    </section>
  );
}
