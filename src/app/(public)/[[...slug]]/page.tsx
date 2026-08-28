import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLandingPage, getPublishedSlugs } from "@/lib/sistur/pages";
import { renderBlock } from "@/components/blocks";

/**
 * Catch-all renderer for every CMS-driven landing page.
 *
 * Why `[[...slug]]` and not `[slug]`:
 * The SEO mandate is that Next.js mirrors the legacy WordPress permalinks
 * exactly. Those permalinks are nested (`/turismo/cachoeira/como-chegar`), and
 * a single `[slug]` segment cannot match a path containing slashes — it would
 * silently 404 every nested legacy URL and drop the ranking those URLs hold.
 * The optional catch-all also renders the home page ("/") from the same route,
 * so the CMS owns the home page too.
 */

// Serve the pre-rendered HTML, then refresh in the background. On-demand
// revalidation via the webhook is the primary freshness mechanism; the TTL in
// lib/sistur/pages.ts is only the self-healing floor if a webhook is lost.
export const dynamicParams = true;

type Params = { slug?: string[] };

/** Sistur stores slugs without a leading slash; home is "". */
function toSlug(params: Params): string {
  return (params.slug ?? []).join("/");
}

export async function generateStaticParams(): Promise<Params[]> {
  // The build must NOT require Sistur to be reachable.
  //
  // Docker builds run on an isolated network, so the builder cannot resolve
  // the backend container — and more importantly, a backend outage must
  // never block deploying the frontend. On failure we pre-render nothing;
  // `dynamicParams` is true, so every page still renders on first request and
  // is then cached by ISR. The only thing lost is build-time pre-rendering,
  // which matters little for content that is invalidated by webhook anyway.
  try {
    const pages = await getPublishedSlugs();
    return pages.map((p) => ({
      // "" must become undefined, otherwise Next builds the route as "/%20"
      // style garbage instead of the index route.
      slug: p.slug === "" ? undefined : p.slug.split("/"),
    }));
  } catch (err) {
    console.warn(
      "[generateStaticParams] Sistur unreachable at build time — " +
        "pre-rendering nothing, pages will render on demand.",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

/**
 * Capa de compartilhamento do site, usada quando a página não define a sua.
 *
 * Vem da biblioteca de mídia, então trocar a foto é upload e não deploy — o
 * caminho é relativo porque o host muda entre ambientes.
 */
const CAPA_PADRAO = `${process.env.SISTUR_MIDIA_URL ?? ""}/midia/91cd147e0fa44b08be4ff28c1d8fb82a.jpg`;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const page = await getLandingPage(toSlug(await params));
  if (!page) return {};

  const { seo } = page;
  return {
    // `absolute` bypasses the root layout's "%s · Cachoeira do Girassol"
    // template. The CMS title is authoritative and already complete — without
    // this, a page titled "Cachoeira do Girassol" renders as
    // "Cachoeira do Girassol · Cachoeira do Girassol".
    title: seo.title ? { absolute: seo.title } : undefined,
    description: seo.description ?? undefined,
    // Canonical is what actually protects rankings during the WordPress
    // migration — it tells Google the new URL supersedes the old one.
    alternates: { canonical: seo.canonical ?? `/${page.slug}` },
    robots: seo.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: seo.title ?? undefined,
      description: seo.description ?? undefined,
      // Nunca sem imagem. Uma página do CMS que não define a sua cai na capa
      // do site — link colado no WhatsApp sem imagem vira bloco de texto, num
      // negócio que se vende pela paisagem. A capa é 1200x630 de propósito:
      // WhatsApp e Facebook recortam pelo centro, e a foto original é retrato.
      images: [seo.og_image ?? CAPA_PADRAO],
      type: "website",
      locale: "pt_BR",
      siteName: "Cachoeira do Girassol",
    },
  };
}

export default async function LandingRoute({ params }: { params: Promise<Params> }) {
  const page = await getLandingPage(toSlug(await params));
  if (!page) notFound();

  return (
    <main>
      {/*
        Blocks are validated data, not markup. An unknown block type cannot
        reach here: Zod rejects it at the fetch boundary and the Python service
        rejects it at write time, so a bad payload fails loudly rather than
        rendering a broken page in production.
      */}
      {page.content.blocks.map((block, i) => renderBlock(block, i))}
    </main>
  );
}
