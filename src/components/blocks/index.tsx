import Image from "next/image";
import { ExperienceChoice } from "@/components/imersivo/experience-choice";
import { HeroBanner } from "@/components/imersivo/hero-banner";
import Link from "next/link";
import type { Block } from "@/lib/sistur/pages";
import { resolverPreco, formatarBRL, getExperiencias } from "@/lib/sistur/catalog";

/**
 * Block components — the only place presentation exists.
 *
 * Every component takes validated, structured props. None accepts HTML and none
 * uses dangerouslySetInnerHTML. That is the point of the architecture: an editor
 * (human or AI) writing to `content_jsonb` can change what a page says, never
 * how it renders, and can never inject markup. A syntax error in content is
 * impossible because content is data.
 *
 * The layout follows the live WordPress page: amber calls to action, uppercase
 * section titles over a short amber rule, a deep green panel behind the price
 * table, and a cream callout for the house rules.
 */

type PropsOf<T extends Block["type"]> = Extract<Block, { type: T }>["props"];

/** Amber pill — the primary call to action everywhere on the site. */
function CtaPill({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--c-primary)] px-7 text-sm font-semibold uppercase tracking-wide text-[var(--c-on-primary)] transition-colors hover:bg-[var(--c-primary-dark)]"
    >
      {children}
    </Link>
  );
}

function SectionTitle({
  children,
  onPanel = false,
}: {
  children: React.ReactNode;
  onPanel?: boolean;
}) {
  return (
    <h2
      className={`sec-title mb-10 text-3xl sm:text-4xl ${
        onPanel ? "sec-title--on-panel" : ""
      }`}
    >
      {children}
    </h2>
  );
}

/**
 * Two presentations from one block, chosen by the data rather than by a prop:
 * items **with** an image render as a photo card with the label overlaid, the
 * way "Além da Água" does; items **without** one render as a white card with a
 * green title, the way "Nossa Estrutura" does.
 */
function FeatureGrid({ title, items }: PropsOf<"feature_grid">) {
  const comImagem = items.some((i) => i.image);
  return (
    <section className="mx-auto max-w-5xl px-4 py-14">
      {title && <SectionTitle>{title}</SectionTitle>}
      <ul
        className={`grid grid-cols-1 gap-6 ${
          items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {items.map((item, i) =>
          comImagem && item.image ? (
            <li
              key={i}
              className="relative isolate aspect-[4/3] overflow-hidden rounded-lg"
            >
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="absolute inset-0 -z-20 object-cover"
              />
              {/* Gradiente direcional, não véu uniforme: escurece onde o texto
                  pousa e deixa a foto limpa em cima. Véu parelho sobre a imagem
                  inteira apaga a paisagem, e a paisagem é o que vende. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
              />
              <div className="flex h-full flex-col justify-end p-4">
                <h3 className="text-lg uppercase text-white drop-shadow-sm sm:text-xl">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="mt-1 text-sm leading-snug text-white/85">
                    {item.description}
                  </p>
                )}
              </div>
            </li>
          ) : (
            <li
              key={i}
              // Borda além da sombra: em tela clara a sombra sozinha some, e os
              // itens ficam boiando no branco sem virar cartão.
              className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-6
                         text-center shadow-md transition-shadow hover:shadow-lg"
            >
              <h3 className="text-lg uppercase text-[var(--c-accent)]">
                {item.title}
              </h3>
              {item.description && (
                <p className="mt-3 text-sm leading-relaxed text-[var(--c-muted)]">
                  {item.description}
                </p>
              )}
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

function RichText({ title, paragraphs }: PropsOf<"rich_text">) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14">
      {title && <SectionTitle>{title}</SectionTitle>}
      {/* Plain text nodes — React escapes them. No HTML path exists. */}
      {paragraphs.map((p, i) => (
        <p key={i} className="mb-4 leading-relaxed text-[var(--c-fg)]">
          {p}
        </p>
      ))}
    </section>
  );
}

function CtaBanner({ title, subtitle, cta_label, cta_href }: PropsOf<"cta_banner">) {
  return (
    <section className="px-4 py-14">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <SectionTitle>{title}</SectionTitle>
        {subtitle && (
          <p className="-mt-6 text-lg font-semibold uppercase text-[var(--c-fg)]">
            {subtitle}
          </p>
        )}
        <CtaPill href={cta_href}>{cta_label}</CtaPill>
      </div>
    </section>
  );
}

/** House rules — cream callout with an amber rule down its left edge. */
function Faq({ title, items }: PropsOf<"faq">) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-14">
      {title && <SectionTitle>{title}</SectionTitle>}
      <div className="rounded-lg border-l-4 border-[var(--c-note-border)] bg-[var(--c-note-bg)] p-6 sm:p-8">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <span aria-hidden className="shrink-0">
                ⚠️
              </span>
              <div>
                <dt className="inline font-semibold text-[var(--c-fg)]">
                  {item.question}:{" "}
                </dt>
                <dd className="inline text-[var(--c-muted)]">{item.answer}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/**
 * Live price table. The CMS supplies only the item slug and the day tier; every
 * figure comes from Sistur at request time.
 *
 * A row whose price cannot be resolved renders nothing. A stale or invented
 * figure is worse than an absent one: under CDC Art. 30 an advertised price
 * binds the supplier, and the WordPress page it replaces already carried two
 * different weekend prices in two places, neither matching what is charged.
 */
async function PriceTable({ title, nota, rows }: PropsOf<"price_table">) {
  const resolvidas = await Promise.all(
    rows.map(async (r) => ({ ...r, valor: await resolverPreco(r.slug, r.dia) })),
  );
  const visiveis = resolvidas.filter((r) => r.valor !== null);
  if (visiveis.length === 0) return null;

  return (
    // Invertido: a seção clara e os cartões escuros. O bloco verde inteiro
    // pesava no meio da página e os preços se perdiam dentro dele; agora cada
    // preço é um objeto sobre o fundo, e é neles que o olho pousa.
    <section className="bg-[var(--c-surface)] py-14">
      <div className="mx-auto max-w-6xl px-4">
        {title && <SectionTitle>{title}</SectionTitle>}
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {visiveis.map((r, i) => (
            <li
              key={i}
              className="flex flex-col items-center gap-2 rounded-xl bg-[var(--c-panel)]
                         px-4 py-6 text-center text-[var(--c-on-panel)] shadow-lg"
            >
              <p className="text-xs font-medium text-[var(--c-primary)]">
                {r.label}
              </p>
              <p className="text-xl font-bold text-[var(--c-on-panel)] tabular-nums">
                {r.prefixo && (
                  <span className="mr-1 text-sm font-normal">{r.prefixo}</span>
                )}
                {formatarBRL(r.valor as number)}
              </p>
              {/* Sólido, e ocupando a largura do cartão. Contorno vazado lê
                  como ação secundária, e esta é a única ação do bloco. */}
              <Link
                href="/reservar"
                className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center
                           rounded-lg bg-[var(--c-on-panel)] px-4 text-xs font-bold uppercase
                           tracking-wide text-[var(--c-panel)] transition-colors
                           hover:bg-[var(--c-surface)]"
              >
                Reservar
              </Link>
            </li>
          ))}
        </ul>
        {nota && (
          <p className="mt-8 text-center text-xs text-[var(--c-muted)]">{nota}</p>
        )}
      </div>
    </section>
  );
}

/**
 * Experience selector — the bridge from the landing page into the funnel.
 *
 * The options are read from Sistur, never declared in the CMS. Listing them as
 * content would mean a new category stays invisible until someone edits a page,
 * and a retired one leaves a button pointing at a dead route. A category joins
 * this selector by having an internal_slug; that is also how Enoturismo is kept
 * out of it while remaining in the catalogue.
 *
 * The choice navigates rather than expanding in place. Each experience is its
 * own route, so only one form ever exists on a page — which is the structural
 * version of the reason the WordPress site needed a selector at all — and the
 * home stays cacheable because nothing here depends on live availability.
 */
async function ExperienceSelector({ title, subtitle }: PropsOf<"experience_selector">) {
  const experiencias = await getExperiencias();
  if (experiencias.length === 0) return null;

  // Cartões grandes com foto. A descrição e o botão aparecem no hover onde há
  // mouse e ficam sempre visíveis no toque — ver ExperienceChoice.
  return (
    <ExperienceChoice
      titulo={title ?? undefined}
      subtitulo={subtitle ?? undefined}
      experiencias={experiencias.map((e) => ({
        slug: e.slug!,
        nome: e.name,
        descricao: e.description,
        nota: e.single_day_only
          ? "Reserva para um único dia"
          : "Permite mais de um dia",
        imagem: e.image_url,
      }))}
    />
  );
}

/** Gallery pulls images from the reservas API, keyed by resource_id. */
function Gallery({ title, resource_id }: PropsOf<"gallery">) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-14">
      {title && <SectionTitle>{title}</SectionTitle>}
      {/* Rendered by a child RSC that fetches ResourceImage rows for this id. */}
      <div data-resource-id={resource_id} />
    </section>
  );
}

/**
 * Registry: block type → component. Must stay in lockstep with
 * LandingPageService.BLOCK_SCHEMAS (Python).
 */
export function renderBlock(block: Block, key: number) {
  switch (block.type) {
    case "hero":
      return (
        <HeroBanner
          key={key}
          titulo={block.props.title}
          subtitulo={block.props.subtitle}
          poster={block.props.image}
          ctas={
            block.props.cta_label && block.props.cta_href
              ? [{ label: block.props.cta_label, href: block.props.cta_href }]
              : []
          }
        />
      );
    case "feature_grid":
      return <FeatureGrid key={key} {...block.props} />;
    case "rich_text":
      return <RichText key={key} {...block.props} />;
    case "cta_banner":
      return <CtaBanner key={key} {...block.props} />;
    case "faq":
      return <Faq key={key} {...block.props} />;
    case "gallery":
      return <Gallery key={key} {...block.props} />;
    case "price_table":
      return <PriceTable key={key} {...block.props} />;
    case "experience_selector":
      return <ExperienceSelector key={key} {...block.props} />;
  }
}
