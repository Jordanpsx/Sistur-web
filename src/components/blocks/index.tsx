import Image from "next/image";
import Link from "next/link";
import type { Block } from "@/lib/sistur/pages";

/**
 * Block components — the only place presentation exists.
 *
 * Every component takes validated, structured props. None of them accept HTML,
 * and none of them use dangerouslySetInnerHTML. That is the whole point of the
 * architecture: an editor (human or AI) writing to `content_jsonb` can change
 * what a page says, but can never change how it renders, and can never inject
 * markup. A syntax error in content is impossible because content is data.
 */

type PropsOf<T extends Block["type"]> = Extract<Block, { type: T }>["props"];

function Hero({ title, subtitle, image, cta_label, cta_href }: PropsOf<"hero">) {
  return (
    <section className="relative isolate overflow-hidden">
      {image && (
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 -z-10 object-cover"
        />
      )}
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-20 text-center sm:py-28">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base text-[--c-muted] sm:text-lg">{subtitle}</p>
        )}
        {cta_label && cta_href && (
          <div className="mt-2">
            <Link
              href={cta_href}
              className="inline-flex min-h-[44px] items-center rounded-lg bg-[--c-primary] px-6 text-sm font-medium text-[--c-on-primary]"
            >
              {cta_label}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function FeatureGrid({ title, items }: PropsOf<"feature_grid">) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      {title && <h2 className="mb-6 text-2xl font-semibold">{title}</h2>}
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <li key={i} className="rounded-xl border border-[--c-border] p-5">
            <h3 className="font-medium">{item.title}</h3>
            {item.description && (
              <p className="mt-2 text-sm text-[--c-muted]">{item.description}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RichText({ title, paragraphs }: PropsOf<"rich_text">) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      {title && <h2 className="mb-4 text-2xl font-semibold">{title}</h2>}
      {/* Plain text nodes — React escapes them. No HTML path exists. */}
      {paragraphs.map((p, i) => (
        <p key={i} className="mb-4 leading-relaxed text-[--c-fg]">
          {p}
        </p>
      ))}
    </section>
  );
}

function CtaBanner({ title, subtitle, cta_label, cta_href }: PropsOf<"cta_banner">) {
  return (
    <section className="bg-[--c-surface] px-4 py-14">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {subtitle && <p className="text-[--c-muted]">{subtitle}</p>}
        <Link
          href={cta_href}
          className="mt-2 inline-flex min-h-[44px] items-center rounded-lg bg-[--c-primary] px-6 text-sm font-medium text-[--c-on-primary]"
        >
          {cta_label}
        </Link>
      </div>
    </section>
  );
}

function Faq({ title, items }: PropsOf<"faq">) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      {title && <h2 className="mb-6 text-2xl font-semibold">{title}</h2>}
      <dl className="divide-y divide-[--c-border]">
        {items.map((item, i) => (
          <div key={i} className="py-4">
            <dt className="font-medium">{item.question}</dt>
            <dd className="mt-1 text-sm text-[--c-muted]">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Gallery pulls images from the reservas API, keyed by resource_id. */
function Gallery({ title, resource_id }: PropsOf<"gallery">) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      {title && <h2 className="mb-6 text-2xl font-semibold">{title}</h2>}
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
      return <Hero key={key} {...block.props} />;
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
  }
}
