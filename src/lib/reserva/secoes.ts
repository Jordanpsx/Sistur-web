import type { Item } from "@/lib/sistur/catalog";

/**
 * Turns the flat add-on list into the sections Sistur already defines.
 *
 * The groups are maintained by the operator and carry information no invented
 * category could: "ÁREA A – DIVERSÃO (Permitido som ambiente)" versus
 * "ÁREA B – SOSSEGO (Proibido som)" is the fact that decides which barbecue pit
 * someone wants, and it was sitting unused in the database.
 *
 * Deriving the sections from that tree rather than hardcoding them means a group
 * created in the admin appears on the site without a deploy, and the site can
 * never disagree with the admin about what exists.
 *
 * Shape: the **top-level ancestor** becomes the section, and the item's own
 * parent becomes a subsection when it differs. So Churrasqueiras splits into
 * Área A and Área B, while Esportes e aventuras stays flat.
 */

export type Grupo = {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  description: string | null;
  image_url: string | null;
};

export type Subsecao = { grupo: Grupo | null; itens: Item[] };
export type Secao = { titulo: string; id: number | null; sub: Subsecao[] };

/** Sobe até o ancestral de topo, com guarda contra ciclo. */
function raiz(g: Grupo, porId: Map<number, Grupo>): Grupo {
  const vistos = new Set<number>();
  let atual = g;
  while (atual.parent_id != null && !vistos.has(atual.id)) {
    vistos.add(atual.id);
    const pai = porId.get(atual.parent_id);
    if (!pai) break;
    atual = pai;
  }
  return atual;
}

export function agruparAdicionais(itens: Item[], grupos: Grupo[]): Secao[] {
  const porId = new Map(grupos.map((g) => [g.id, g]));
  const ordem = new Map(grupos.map((g, i) => [g.id, i]));

  // secao -> subsecao -> itens. Map preserva ordem de inserção, e as chaves
  // entram na ordem em que os grupos vêm da API (sort_order, depois id).
  const secoes = new Map<number | null, Map<number | null, Item[]>>();

  const ordenados = [...itens].sort((a, b) => {
    const ga = a.group_id != null ? ordem.get(a.group_id) ?? 1e9 : 1e9;
    const gb = b.group_id != null ? ordem.get(b.group_id) ?? 1e9 : 1e9;
    return ga - gb || a.price - b.price;
  });

  for (const item of ordenados) {
    const g = item.group_id != null ? porId.get(item.group_id) : undefined;
    const topo = g ? raiz(g, porId) : null;
    // Subseção só quando há um nível intermediário de verdade. Um item cujo
    // grupo já é o topo não ganha um cabeçalho repetindo o nome da seção.
    const paiDireto = g?.parent_id != null ? porId.get(g.parent_id) : undefined;
    const sub = paiDireto && paiDireto.id !== topo?.id ? paiDireto.id : null;

    const chaveSecao = topo?.id ?? null;
    if (!secoes.has(chaveSecao)) secoes.set(chaveSecao, new Map());
    const subs = secoes.get(chaveSecao)!;
    if (!subs.has(sub)) subs.set(sub, []);
    subs.get(sub)!.push(item);
  }

  return [...secoes.entries()].map(([secaoId, subs]) => ({
    id: secaoId,
    titulo: (secaoId != null ? porId.get(secaoId)?.name : null) ?? "Outros",
    sub: [...subs.entries()].map(([subId, itens]) => ({
      grupo: subId != null ? porId.get(subId) ?? null : null,
      itens,
    })),
  }));
}

/** Emoji por seção — só chrome, some sem quebrar nada. */
export function emojiDaSecao(titulo: string): string {
  const t = titulo.toLowerCase();
  if (t.includes("churrasqueir")) return "🔥";
  if (t.includes("esporte") || t.includes("aventura")) return "🧗";
  if (t.includes("estacionamento")) return "🅿️";
  if (t.includes("camping") || t.includes("barraca")) return "🏕️";
  return "✨";
}
