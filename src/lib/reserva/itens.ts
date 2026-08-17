/**
 * Item quantities as URL state, and the server-side price call.
 *
 * Quantities travel as `?i<id>=<qtd>` (`?i1=2&i18=1`). Chosen over a single
 * packed parameter because each item is independently editable, a malformed one
 * can be dropped without losing the rest, and the URL stays readable enough to
 * debug from a support ticket.
 */

const MAX_QTD = 99;

export type Quantidades = Record<number, number>;

/** Reads `i<id>=<qtd>` pairs, ignoring anything malformed. */
export function lerQuantidades(
  sp: Record<string, string | string[] | undefined>,
): Quantidades {
  const out: Quantidades = {};
  for (const [chave, bruto] of Object.entries(sp)) {
    const m = /^i(\d+)$/.exec(chave);
    if (!m) continue;
    const valor = Array.isArray(bruto) ? bruto[0] : bruto;
    const qtd = Number(valor);
    // A junk quantity drops that line rather than failing the page: the visitor
    // still sees the rest of their selection.
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > MAX_QTD) continue;
    out[Number(m[1])] = qtd;
  }
  return out;
}

export function escreverQuantidades(q: Quantidades): URLSearchParams {
  const p = new URLSearchParams();
  for (const [id, qtd] of Object.entries(q)) {
    if (qtd > 0) p.set(`i${id}`, String(qtd));
  }
  return p;
}

export type LinhaOrcamento = {
  item_id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  item_total: number;
  num_days: number | null;
};

export type Orcamento = {
  items_breakdown: LinhaOrcamento[];
  subtotal: number;
  discount_amount: number;
  discount_details: Record<string, unknown>;
  service_fee: number;
  total: number;
};

export function formatarBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Server-side price call, used for the first render.
 *
 * The client calls `/api/simular` instead — it cannot reach internal Docker DNS.
 * Both end at the same Sistur endpoint, so the number a visitor sees before
 * hydration and after it come from one source.
 *
 * Returns null on any failure. The step then renders without a total rather than
 * erroring: an unreachable pricing service must not block someone from picking
 * their dates.
 */
/**
 * Per-item unit price for one date, resolved by Sistur.
 *
 * Asks `/simular` for every item at quantity 1 and keeps `unit_price`. That
 * value already carries the day tier — a Day Use ticket answers 35,00 for a
 * Sunday and 30,01 for a Wednesday — which is why this is a round trip rather
 * than arithmetic over `price_weekday`/`weekend`/`holiday`: whether a given date
 * counts as a special date lives in Sistur's global calendar, and no column in
 * the catalogue can answer it.
 *
 * Depends only on the dates, so callers refresh it when the dates change, not
 * when quantities do.
 *
 * Returns an empty map on failure. Rows then show no price, which is the state
 * they were already in before a date was picked.
 */
export function precosDoBreakdown(o: Orcamento | null): Record<number, number> {
  const out: Record<number, number> = {};
  for (const l of o?.items_breakdown ?? []) out[l.item_id] = l.unit_price;
  return out;
}

export async function precosDoDia(params: {
  sourceId: number;
  categoryId: number;
  entrada: string;
  saida: string;
  itemIds: number[];
}): Promise<Record<number, number>> {
  const o = await simular({
    sourceId: params.sourceId,
    categoryId: params.categoryId,
    entrada: params.entrada,
    saida: params.saida,
    quantidades: Object.fromEntries(params.itemIds.map((id) => [id, 1])),
  });
  return precosDoBreakdown(o);
}

export async function simular(params: {
  sourceId: number;
  categoryId: number;
  entrada: string;
  saida: string;
  quantidades: Quantidades;
}): Promise<Orcamento | null> {
  const items = Object.entries(params.quantidades)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => ({ item_id: Number(id), quantity: q }));
  if (items.length === 0) return null;

  try {
    const res = await fetch(
      `${process.env.SISTUR_API_URL}/reservas/api/public/simular`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: params.sourceId,
          // Without this the discount rules attached to the category never
          // apply, and the quote comes back ABOVE what will be charged.
          category_id: params.categoryId,
          check_in_date: params.entrada,
          check_out_date: params.saida,
          items,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as Orcamento;
  } catch {
    return null;
  }
}

/**
 * Spreads the final total across the item lines.
 *
 * `criar()` sums every `price_override` and compares the result against its own
 * recalculated **total**, refusing anything more than a cent apart. So the
 * overrides have to add up to the total *after* discount and service fee — not
 * to the subtotal, which is what `items_breakdown` reports. Sending the
 * breakdown verbatim is rejected the moment any discount applies:
 *
 *     Divergência de preço: servidor 49,00, enviado 70,00
 *
 * Each line is scaled by `total / subtotal` and the last one absorbs the
 * rounding, so the sum matches to the cent. Rounding each line independently
 * would drift by a few centavos on a long list and trip the same guard.
 */
export function ratearTotal(o: Orcamento) {
  const linhas = o.items_breakdown;
  const base = linhas.reduce((s, l) => s + l.item_total, 0);
  const cents = (v: number) => Math.round(v * 100);

  let restante = cents(o.total);
  return linhas.map((l, i) => {
    const ultimo = i === linhas.length - 1;
    const valor = ultimo
      ? restante
      : base > 0
        ? Math.round((cents(o.total) * l.item_total) / base)
        : 0;
    restante -= valor;
    return {
      item_id: l.item_id,
      quantity: l.quantity,
      price_override: valor / 100,
    };
  });
}
