import { ExperienceChoice } from "@/components/imersivo/experience-choice";
import { HeroBanner } from "@/components/imersivo/hero-banner";
import { LocalizacaoAvaliacoes } from "@/components/imersivo/localizacao-avaliacoes";
import { obterAvaliacoes } from "@/lib/google/avaliacoes";
import Link from "next/link";
import type { Block } from "@/lib/sistur/pages";
import { resolverPreco, getCatalog, getExperiencias } from "@/lib/sistur/catalog";
import { CarrosselFotos } from "@/components/imersivo/carrossel-fotos";
import { PainelValores } from "@/components/imersivo/painel-valores";
import { Icone, ehIcone } from "@/components/ui/icone";
import { agruparValores, type LinhaResolvida } from "@/lib/reserva/tabela-valores";

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
      className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--c-primary)] px-7 text-sm font-semibold tracking-wide text-[var(--c-on-primary)] uppercase transition-colors hover:bg-[var(--c-primary-dark)]"
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
 * items **with** an image become a photo carousel with captions over the
 * pictures, the way "Além da Água" does; items **without** one render as white
 * cards with a line icon over a green title, the way "Nossa Estrutura" does.
 */
function FeatureGrid({ title, items }: PropsOf<"feature_grid">) {
  const fotos = items.flatMap((i) =>
    i.image ? [{ titulo: i.title, descricao: i.description, imagem: i.image }] : [],
  );
  if (fotos.length > 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16">
        {title && <SectionTitle>{title}</SectionTitle>}
        <CarrosselFotos fotos={fotos} />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      {title && <SectionTitle>{title}</SectionTitle>}
      <ul
        className={`grid grid-cols-1 gap-6 ${
          items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {items.map((item, i) => (
          <li
            key={i}
            // Borda além da sombra: em tela clara a sombra sozinha some, e os
            // itens ficam boiando no branco sem virar cartão.
            className="flex flex-col items-center rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-8 text-center shadow-sm transition-shadow hover:shadow-md"
          >
            {ehIcone(item.icon) && (
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-surface)] text-[var(--c-accent-dark)]">
                <Icone nome={item.icon} className="h-7 w-7" />
              </span>
            )}
            <h3 className="text-lg text-[var(--c-accent-dark)] uppercase">
              {item.title}
            </h3>
            {item.description && (
              <p className="mt-3 text-sm leading-relaxed text-[var(--c-muted)]">
                {item.description}
              </p>
            )}
          </li>
        ))}
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
          <p className="-mt-6 text-lg font-semibold text-[var(--c-fg)] uppercase">
            {subtitle}
          </p>
        )}
        <CtaPill href={cta_href}>{cta_label}</CtaPill>
      </div>
    </section>
  );
}

/**
 * House rules as a welcome, not a warning: a quiet panel with one line icon per
 * rule. The warning signs that used to mark every line read as danger, and most
 * of these rules are about comfort — silence at night, where pets may go.
 */
function Faq({ title, items }: PropsOf<"faq">) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      {title && <SectionTitle>{title}</SectionTitle>}
      <div className="rounded-3xl bg-[var(--c-surface)] p-6 sm:p-10">
        <dl className="grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <div key={i} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--c-bg)] text-[var(--c-accent-dark)] shadow-sm">
                <Icone
                  nome={ehIcone(item.icon) ? item.icon : "info"}
                  className="h-5 w-5"
                />
              </span>
              <div className="text-sm">
                <dt className="font-semibold text-[var(--c-fg)]">{item.question}</dt>
                <dd className="mt-1 leading-relaxed text-[var(--c-muted)]">
                  {item.answer}
                </dd>
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
  const cat = await getCatalog();
  const categorias = new Map(
    cat.sources.flatMap((src) => src.categories).map((c) => [c.id, c] as const),
  );

  const resolvidas = await Promise.all(
    rows.map(async (r): Promise<LinhaResolvida | null> => {
      const item = cat.items.find((i) => i.internal_slug === r.slug);
      const categoria =
        item?.category_id != null ? categorias.get(item.category_id) : undefined;
      const valor = await resolverPreco(r.slug, r.dia);
      if (!item || !categoria || valor === null) return null;
      return {
        slug: r.slug,
        dia: r.dia,
        label: r.label,
        prefixo: r.prefixo,
        valor,
        item: { nome: item.name, entrada: item.is_entry_ticket },
        categoria: { id: categoria.id, nome: categoria.name, slug: categoria.slug },
      };
    }),
  );
  const { abas, adicionais } = agruparValores(
    resolvidas.filter((r): r is LinhaResolvida => r !== null),
  );
  if (abas.length === 0 && adicionais.length === 0) return null;

  return (
    <section className="bg-[var(--c-surface)] py-16">
      <div className="mx-auto max-w-6xl px-4">
        {title && <SectionTitle>{title}</SectionTitle>}
        <PainelValores abas={abas} adicionais={adicionais} nota={nota} />
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
        nota: e.single_day_only ? "Reserva para um único dia" : "Permite mais de um dia",
        imagem: e.image_url,
      }))}
    />
  );
}

/**
 * Location and Google reviews, side by side. Only the heading is CMS content:
 * the address is fixed in lib/local.ts and the rating comes from Google at
 * render time, so neither can drift from the truth inside the editor.
 */
async function LocationReviews({ title, subtitle }: PropsOf<"location_reviews">) {
  const avaliacoes = await obterAvaliacoes();
  return (
    <section className="py-14">
      <div className="mx-auto max-w-6xl px-4">
        {title && <SectionTitle>{title}</SectionTitle>}
        {subtitle && (
          <p className="mx-auto -mt-4 mb-10 max-w-2xl text-center text-base text-[var(--c-muted)]">
            {subtitle}
          </p>
        )}
        <LocalizacaoAvaliacoes avaliacoes={avaliacoes} />
      </div>
    </section>
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
    case "location_reviews":
      return <LocationReviews key={key} {...block.props} />;
  }
}
