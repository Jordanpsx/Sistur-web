import { z } from "zod";
import { TAGS } from "./tags";

/**
 * Typed access to the Sistur Landing CMS.
 *
 * Sistur owns the content; this module owns only how it is cached. Nothing
 * here interprets business rules — it fetches, validates the shape, and tags.
 */

const API = process.env.SISTUR_API_URL!;
const API_KEY = process.env.SISTUR_PUBLIC_API_KEY!;

/** How long a page may serve stale before a background refresh, absent a webhook. */
const PAGE_TTL_SECONDS = 300;

// ---------------------------------------------------------------------------
// Contract — mirrors LandingPageService.BLOCK_SCHEMAS on the Python side.
// ---------------------------------------------------------------------------

const HrefSchema = z
  .string()
  // Same rule as the backend: absolute http(s) or a single-slash local path.
  // Rejects javascript:, data:, and protocol-relative "//evil.com".
  .refine((v) => /^(?:https?:\/\/|\/(?!\/))/.test(v), {
    message: "unsafe href",
  });

const BlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("hero"),
    props: z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      image: HrefSchema.optional(),
      cta_label: z.string().optional(),
      cta_href: HrefSchema.optional(),
    }),
  }),
  z.object({
    type: z.literal("feature_grid"),
    props: z.object({
      title: z.string().optional(),
      items: z
        .array(
          z.object({
            title: z.string(),
            description: z.string().optional(),
            icon: z.string().optional(),
          }),
        )
        .max(12),
    }),
  }),
  z.object({
    type: z.literal("gallery"),
    props: z.object({
      title: z.string().optional(),
      resource_id: z.number().int(),
    }),
  }),
  z.object({
    type: z.literal("rich_text"),
    props: z.object({
      title: z.string().optional(),
      paragraphs: z.array(z.string()),
    }),
  }),
  z.object({
    type: z.literal("cta_banner"),
    props: z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      cta_label: z.string(),
      cta_href: HrefSchema,
    }),
  }),
  z.object({
    type: z.literal("faq"),
    props: z.object({
      title: z.string().optional(),
      items: z
        .array(z.object({ question: z.string(), answer: z.string() }))
        .max(30),
    }),
  }),
]);

export const LandingPageSchema = z.object({
  slug: z.string(),
  locale: z.string(),
  seo: z.object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    og_image: z.string().nullable(),
    canonical: z.string().nullable(),
    noindex: z.boolean(),
  }),
  content: z.object({ blocks: z.array(BlockSchema) }),
  version: z.number(),
  published_at: z.string().nullable(),
});

export type LandingPage = z.infer<typeof LandingPageSchema>;
export type Block = z.infer<typeof BlockSchema>;

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

/**
 * Fetch one published page. Returns null on 404 so the route can call
 * notFound() — a missing page is a normal outcome, not an error.
 *
 * `slug` has no leading slash; the home page is "".
 */
export async function getLandingPage(slug: string): Promise<LandingPage | null> {
  const res = await fetch(`${API}/api/public/pages/${slug}`, {
    headers: { "X-Api-Key": API_KEY },
    next: {
      revalidate: PAGE_TTL_SECONDS,
      // Both tags: the specific page, and the index so a bulk change can
      // sweep everything with one tag.
      tags: [TAGS.page(slug), TAGS.pagesIndex],
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    // Throwing keeps the previously cached page served and surfaces the
    // failure — far better than caching an error shape as if it were content.
    throw new Error(`Sistur ${res.status} for /api/public/pages/${slug}`);
  }

  return LandingPageSchema.parse(await res.json());
}

const IndexSchema = z.object({
  pages: z.array(
    z.object({
      slug: z.string(),
      updated_at: z.string().nullable(),
      noindex: z.boolean(),
    }),
  ),
});

/** All published slugs — drives generateStaticParams and the sitemap. */
export async function getPublishedSlugs() {
  const res = await fetch(`${API}/api/public/pages`, {
    headers: { "X-Api-Key": API_KEY },
    next: { revalidate: PAGE_TTL_SECONDS, tags: [TAGS.pagesIndex] },
  });
  if (!res.ok) throw new Error(`Sistur ${res.status} for /api/public/pages`);
  return IndexSchema.parse(await res.json()).pages;
}
