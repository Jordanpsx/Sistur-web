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
  price: z.number(),
  // Per-day-tier overrides. These are the same columns an operator edits under
  // "Tarifas por tipo de dia"; null means "fall back to the base price", which
  // is precisely what the admin form says.
  price_weekday: z.number().nullable().optional(),
  price_weekend: z.number().nullable().optional(),
  price_holiday: z.number().nullable().optional(),
  billing_type: z.string(),
});

const CatalogSchema = z.object({
  sources: z.array(z.object({ id: z.number(), name: z.string() })),
  items: z.array(ItemSchema),
});

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
