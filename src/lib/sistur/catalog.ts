import { z } from "zod";
import { TAGS } from "./tags";

/**
 * Live pricing for the landing pages.
 *
 * **No price is ever stored in the CMS.** A `price_table` block holds only an
 * item's `internal_slug` and which day tier to show; the number is resolved
 * here, at render time, from Sistur.
 *
 * This exists because the WordPress home page kept prices typed by hand into
 * ACF fields and they drifted: the site advertised R$ 35,00 for a weekend while
 * the engine charged R$ 40,00. Under CDC Art. 30 advertising binds the supplier,
 * so a stale number is not a cosmetic bug.
 */

const API = process.env.SISTUR_API_URL!;
const TOKEN = process.env.SISTUR_PUBLIC_TOKEN ?? "";
const TTL = 300;

const ItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  internal_slug: z.string().nullable(),
  price: z.number(),
  price_holiday: z.number().nullable().optional(),
  billing_type: z.string(),
});

const CatalogSchema = z.object({
  sources: z.array(z.object({ id: z.number(), name: z.string() })),
  items: z.array(ItemSchema),
});

export type CatalogItem = z.infer<typeof ItemSchema>;

async function sistur(path: string, init?: RequestInit) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(init?.headers ?? {}) },
  });
}

export async function getCatalog() {
  const res = await sistur("/api/public/reservas/catalogo", {
    next: { revalidate: TTL, tags: [TAGS.catalog] },
  });
  if (!res.ok) throw new Error(`catalogo ${res.status}`);
  return CatalogSchema.parse(await res.json());
}

/** Next occurrence of a weekday, in America/Sao_Paulo. 1 = Mon … 6 = Sat. */
function proximaData(diaDaSemana: number): string {
  const agora = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  const delta = (diaDaSemana - agora.getDay() + 7) % 7 || 7;
  const d = new Date(agora);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * Ask the pricing engine what one unit costs on a representative date.
 *
 * `simular` is the same endpoint the booking funnel uses, so whatever it
 * returns is what the customer will actually be charged. It saves nothing.
 */
async function simular(sourceId: number, itemId: number, data: string) {
  const res = await sistur("/reservas/api/public/simular", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_id: sourceId,
      check_in_date: data,
      check_out_date: data,
      items: [{ item_id: itemId, quantity: 1 }],
    }),
    // Keyed by date, so a weekday and a weekend quote cache independently.
    next: { revalidate: TTL, tags: [TAGS.catalog] },
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { total?: number };
  return typeof j.total === "number" ? j.total : null;
}

export type Dia = "semana" | "fds" | "feriado";

/**
 * Resolve the displayed price for one row of a `price_table`.
 *
 * - `semana` / `fds` go through the engine, because a weekend price is not a
 *   column — it comes from calendar rules, and reading `price` would show
 *   R$ 30,00 on a day that actually costs R$ 40,00.
 * - `feriado` reads `price_holiday`, which is the tier the engine itself uses
 *   when a GlobalEvent marks the day as affecting pricing.
 *
 * Returns `null` when the item or the tier does not exist — the component then
 * renders nothing rather than inventing a number.
 */
export async function resolverPreco(
  slug: string,
  dia: Dia,
): Promise<number | null> {
  const cat = await getCatalog();
  const item = cat.items.find((i) => i.internal_slug === slug);
  if (!item) return null;

  if (dia === "feriado") {
    return item.price_holiday ?? null;
  }

  const sourceId = cat.sources[0]?.id;
  if (!sourceId) return null;

  // 1 = Monday (weekday tier), 6 = Saturday (weekend tier).
  return simular(sourceId, item.id, proximaData(dia === "fds" ? 6 : 1));
}

export function formatarBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
