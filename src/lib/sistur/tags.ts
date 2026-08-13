/**
 * Cache tag registry — the single source of truth on the TypeScript side.
 *
 * These strings MUST match the tags emitted by the Postgres trigger
 * `sistur_landing_pages_revalidate()` in
 * sistur-teste/docs/landing_cms/schema.sql.
 *
 * A drift between the two is silent and nasty: the webhook returns 200,
 * `revalidateTag` invalidates nothing, and the page stays stale until the
 * long TTL expires. The contract test in tests/contract/tags.test.ts asserts
 * the two sides agree — keep it passing.
 */

export const TAGS = {
  /** Every landing page payload. Emitted on any page change. */
  pagesIndex: "pages:index",

  /** One specific page. `slug` is stored WITHOUT leading slash; home is "". */
  page: (slug: string) => `page:${slug}`,
} as const;

/** Tags accepted from the webhook. Anything else is rejected, not ignored. */
export function isKnownTag(tag: string): boolean {
  return tag === TAGS.pagesIndex || tag.startsWith("page:");
}
