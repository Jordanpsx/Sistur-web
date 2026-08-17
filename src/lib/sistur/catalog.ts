import { z } from "zod";
import { TAGS } from "./tags";

/**
 * Live pricing for the landing pages.
 *
 * **No price is ever stored in the CMS.** A `price_table` block holds only an
 * item's `internal_slug` and which day tier to show; the number is resolved
 * here, from Sistur, at request time.
 *
 * This exists because the WordPress home page kept prices typed by hand into
 * ACF fields and they drifted: it advertised R$ 35,00 for a weekend the engine
 * charged R$ 40,00 for. Under CDC Art. 30 advertising binds the supplier, so a
 * stale number is not a cosmetic bug.
 */

const API = process.env.SISTUR_API_URL!;
const TOKEN = process.env.SISTUR_PUBLIC_TOKEN ?? "";
const TTL = 300;

const ItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  internal_slug: z.string().nullable(),
  // Which experience the item belongs to. Without these the catalogue is 35
  // loose items with no way to tell a Day Use ticket from a camping pitch.
  category_id: z.number().nullable(),
  source_id: z.number().nullable(),
  price: z.number(),
  // Per-day-tier overrides. These are the same columns an operator edits under
  // "Tarifas por tipo de dia"; null means "fall back to the base price", which
  // is precisely what the admin form says.
  price_weekday: z.number().nullable().optional(),
  price_weekend: z.number().nullable().optional(),
  price_holiday: z.number().nullable().optional(),
  billing_type: z.string(),
});

const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  // Stable reference for the booking route. Renaming the category must not
  // break a link a customer saved, which is why this exists rather than
  // slugifying the name.
  slug: z.string().nullable(),
  description: z.string().nullable(),
  // Parameterises the form: a single date (day use) versus a range with an
  // overnight stay (camping).
  single_day_only: z.boolean().default(false),
  same_day_cutoff_time: z.string().nullable().optional(),
});

const CatalogSchema = z.object({
  sources: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      categories: z.array(CategorySchema).default([]),
    }),
  ),
  items: z.array(ItemSchema),
});

export type Experiencia = z.infer<typeof CategorySchema> & {
  sourceId: number;
  venue: string;
};

/**
 * Bookable experiences, flattened across venues.
 *
 * Read from Sistur rather than hardcoded: there are already three (Day Use,
 * Camping and Enoturismo at the Vinhedo), and a selector with two fixed buttons
 * would have been wrong on the day it shipped. A category without a slug is
 * skipped — it has no stable route to point at.
 */
export async function getExperiencias(): Promise<Experiencia[]> {
  const cat = await getCatalog();
  return cat.sources.flatMap((s) =>
    s.categories
      .filter((c) => c.slug)
      .map((c) => ({ ...c, sourceId: s.id, venue: s.name })),
  );
}

export async function getExperiencia(slug: string): Promise<Experiencia | null> {
  const todas = await getExperiencias();
  return todas.find((e) => e.slug === slug) ?? null;
}

export type Item = z.infer<typeof ItemSchema>;

/**
 * Bookable items for one experience, split into admissions and add-ons.
 *
 * The split reads `internal_slug`: an item whose slug contains `_entrada_` is an
 * admission (`dayuse_entrada_inteira`, `camping_entrada_meia`), everything else
 * is an optional extra. This mirrors how the current WordPress form is laid out —
 * headcount fields first, then opt-in extras — and it is a naming convention the
 * operators already maintain, not a second list to keep in sync.
 *
 * Items with no slug fall into add-ons, which is the safe side: an unrecognised
 * item shows up as optional rather than being presented as a required ticket.
 */
export async function getItensDaExperiencia(
  e: Experiencia,
): Promise<{ ingressos: Item[]; adicionais: Item[] }> {
  const cat = await getCatalog();
  const meus = cat.items.filter((i) => i.category_id === e.id);
  return {
    ingressos: meus.filter((i) => i.internal_slug?.includes("_entrada_")),
    adicionais: meus.filter((i) => !i.internal_slug?.includes("_entrada_")),
  };
}

export async function getCatalog() {
  const res = await fetch(`${API}/api/public/reservas/catalogo`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    next: { revalidate: TTL, tags: [TAGS.catalog] },
  });
  if (!res.ok) throw new Error(`catalogo ${res.status}`);
  return CatalogSchema.parse(await res.json());
}

export type Dia = "semana" | "fds" | "feriado";

/**
 * Resolve the price for one row of a `price_table`.
 *
 * Reads the tier column directly and falls back to the base price when the
 * override is empty — mirroring the engine's own precedence, and matching what
 * the operator sees in the admin form.
 *
 * An earlier version called `/simular` for weekday and weekend on the
 * assumption that a weekend price was a calendar rule rather than a column.
 * That was wrong: `price_weekday`, `price_weekend` and `price_holiday` are real
 * columns. Reading them is simpler, avoids an HTTP round trip per row, and
 * shows the tariff itself rather than a total that would also carry service
 * fees and advance discounts — which is what a rate table should advertise.
 *
 * Returns `null` when the slug does not exist, so the row renders nothing
 * rather than inventing a figure.
 */
export async function resolverPreco(
  slug: string,
  dia: Dia,
): Promise<number | null> {
  const cat = await getCatalog();
  const item = cat.items.find((i) => i.internal_slug === slug);
  if (!item) return null;

  const override =
    dia === "feriado"
      ? item.price_holiday
      : dia === "fds"
        ? item.price_weekend
        : item.price_weekday;

  return override ?? item.price;
}

export function formatarBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
