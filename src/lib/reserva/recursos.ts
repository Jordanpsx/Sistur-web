import { z } from "zod";

/**
 * Physical resources — the actual barbecue pits.
 *
 * The form used to offer the tariff ("Churrasqueira Grande (A)"). It now offers
 * the pit ("Churrasqueira A4"), which is what the customer is really booking and
 * what makes two things possible that the tariff never could: saying whether
 * **that** pit is free on **that** date, and showing photos of **it** rather
 * than of a stand-in from the same group.
 *
 * The price still comes from the group — A4 belongs to "Churrasqueiras grandes
 * (A)", whose day-use tariff is R$ 120,00 — so the site and the counter charge
 * the same for the same pit.
 */

const RecursoSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  group_id: z.number(),
  group_name: z.string(),
  images: z.array(z.string()).default([]),
  is_available: z.boolean(),
  // null = estoque infinito. Não é "zero disponível".
  available: z.number().nullable(),
  // Capacidade total, não quantas sobraram. É o que separa uma unidade que se
  // escolhe pelo nome (Churrasqueira A4, estoque 1) de um pool intercambiável
  // (8 barracas pequenas). Ausente = trate como unidade.
  stock: z.number().nullable().optional(),
  // Tarifa que cobre este recurso na categoria pedida.
  item_id: z.number(),
  item_name: z.string(),
  price: z.number(),
});

const RespostaSchema = z.object({ resources: z.array(RecursoSchema).default([]) });

export type Recurso = z.infer<typeof RecursoSchema>;

/** Ids de recursos escolhidos, lidos da URL como `r<id>=1`. */
export function lerRecursos(sp: Record<string, string | string[] | undefined>): number[] {
  const out: number[] = [];
  for (const chave of Object.keys(sp)) {
    const m = /^r(\d+)$/.exec(chave);
    if (m) out.push(Number(m[1]));
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

export function escreverRecursos(ids: number[]): URLSearchParams {
  const p = new URLSearchParams();
  for (const id of ids) p.set(`r${id}`, "1");
  return p;
}

/**
 * Converts chosen resources into the `{item_id, quantity}` lines `/simular`
 * speaks. Two pits of the same tariff become one line of quantity two, which is
 * how the pricing engine counts them.
 */
export function quantidadesPorTarifa(
  escolhidos: number[],
  recursos: Recurso[],
): Record<number, number> {
  const porId = new Map(recursos.map((r) => [r.id, r]));
  const out: Record<number, number> = {};
  for (const id of escolhidos) {
    const r = porId.get(id);
    if (!r) continue;
    out[r.item_id] = (out[r.item_id] ?? 0) + 1;
  }
  return out;
}

/**
 * Fetches availability for a date. Returns an empty list on failure rather than
 * throwing: an unreachable backend must not stop someone picking their tickets,
 * and the section simply renders nothing to choose.
 */
export async function buscarRecursos(params: {
  sourceId: number;
  categoryId: number;
  entrada: string;
  saida: string;
}): Promise<Recurso[]> {
  const q = new URLSearchParams({
    source_id: String(params.sourceId),
    category_id: String(params.categoryId),
    check_in: params.entrada,
    check_out: params.saida,
  });
  try {
    const res = await fetch(
      `${process.env.SISTUR_API_URL}/api/public/reservas/disponibilidade?${q}`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    return RespostaSchema.parse(await res.json()).resources;
  } catch {
    return [];
  }
}
