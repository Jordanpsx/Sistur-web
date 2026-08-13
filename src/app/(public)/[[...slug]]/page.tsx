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
  const pages = await getPublishedSlugs();
  return pages.map((p) => ({
    // "" must become undefined, otherwise Next builds the route as "/%20" style
    // garbage instead of the index route.
    slug: p.slug === "" ? undefined : p.slug.split("/"),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const page = await getLandingPage(toSlug(await params));
  if (!page) return {};

  const { seo } = page;
  return {
    title: seo.title ?? undefined,
    description: seo.description ?? undefined,
    // Canonical is what actually protects rankings during the WordPress
    // migration — it tells Google the new URL supersedes the old one.
    alternates: { canonical: seo.canonical ?? `/${page.slug}` },
    robots: seo.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: seo.title ?? undefined,
      description: seo.description ?? undefined,
      images: seo.og_image ? [seo.og_image] : undefined,
      type: "website",
    },
  };
}

export default async function LandingRoute({
  params,
}: {
  params: Promise<Params>;
}) {
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
