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
export async function simular(params: {
  sourceId: number;
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
