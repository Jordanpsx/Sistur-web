import { describe, expect, it } from "vitest";
import { agruparAdicionais, emojiDaSecao, type Grupo } from "./secoes";
import type { Item } from "@/lib/sistur/catalog";

/**
 * Grouping the add-ons from Sistur's own tree.
 *
 * The shape mirrors production: Churrasqueiras splits into two areas that differ
 * by whether music is allowed — the fact that actually decides which pit someone
 * books — while Esportes e aventuras has no sublevel.
 */

const grupos: Grupo[] = [
  {
    id: 20,
    name: "Esportes e aventuras",
    parent_id: null,
    sort_order: 0,
    description: null,
    image_url: null,
  },
  {
    id: 2,
    name: "Churrasqueiras",
    parent_id: null,
    sort_order: 1,
    description: null,
    image_url: null,
  },
  {
    id: 5,
    name: "ÁREA A – DIVERSÃO (Permitido som ambiente)",
    parent_id: 2,
    sort_order: 1,
    description: null,
    image_url: null,
  },
  {
    id: 6,
    name: "ÁREA B – SOSSEGO (Proibido som)",
    parent_id: 2,
    sort_order: 1,
    description: null,
    image_url: null,
  },
  {
    id: 4,
    name: "Churrasqueiras grandes (A)",
    parent_id: 5,
    sort_order: 2,
    description: "até 8 pessoas",
    image_url: "/a.jpg",
  },
  {
    id: 3,
    name: "Churrasqueiras pequenas (A)",
    parent_id: 5,
    sort_order: 2,
    description: "até 4 pessoas",
    image_url: null,
  },
  {
    id: 8,
    name: "Churrasqueiras Grandes (B)",
    parent_id: 6,
    sort_order: 2,
    description: null,
    image_url: null,
  },
];

function item(id: number, group_id: number | null, price = 100): Item {
  return {
    id,
    name: `Item ${id}`,
    internal_slug: null,
    category_id: 1,
    source_id: 1,
    group_id,
    is_entry_ticket: false,
    description: null,
    price,
    billing_type: "FIXED",
  } as Item;
}

describe("agruparAdicionais", () => {
  it("usa o ancestral de topo como seção", () => {
    const s = agruparAdicionais([item(1, 4)], grupos);
    expect(s).toHaveLength(1);
    expect(s[0].titulo).toBe("Churrasqueiras");
  });

  it("o nível intermediário vira subseção", () => {
    const s = agruparAdicionais([item(1, 4), item(2, 8)], grupos);
    const churras = s.find((x) => x.titulo === "Churrasqueiras")!;
    expect(churras.sub.map((x) => x.grupo?.name)).toEqual([
      "ÁREA A – DIVERSÃO (Permitido som ambiente)",
      "ÁREA B – SOSSEGO (Proibido som)",
    ]);
  });

  it("grupo já no topo não ganha subseção repetindo o título", () => {
    const s = agruparAdicionais([item(1, 20)], grupos);
    expect(s[0].titulo).toBe("Esportes e aventuras");
    expect(s[0].sub[0].grupo).toBeNull();
  });

  it("item sem grupo cai em Outros, não some", () => {
    const s = agruparAdicionais([item(1, null)], grupos);
    expect(s[0].titulo).toBe("Outros");
    expect(s[0].sub[0].itens).toHaveLength(1);
  });

  it("grupo inexistente também cai em Outros", () => {
    const s = agruparAdicionais([item(1, 999)], grupos);
    expect(s[0].titulo).toBe("Outros");
  });

  it("nenhum item é perdido no agrupamento", () => {
    const itens = [item(1, 4), item(2, 3), item(3, 8), item(4, 20), item(5, null)];
    const total = agruparAdicionais(itens, grupos)
      .flatMap((s) => s.sub)
      .reduce((n, sub) => n + sub.itens.length, 0);
    expect(total).toBe(itens.length);
  });

  it("respeita a ordem dos grupos e, dentro dela, o preço", () => {
    // Esportes tem sort_order 0 e vem antes de Churrasqueiras.
    const s = agruparAdicionais([item(1, 4), item(2, 20)], grupos);
    expect(s.map((x) => x.titulo)).toEqual(["Esportes e aventuras", "Churrasqueiras"]);

    const dois = agruparAdicionais([item(1, 4, 200), item(2, 4, 50)], grupos);
    expect(dois[0].sub[0].itens.map((i) => i.price)).toEqual([50, 200]);
  });

  it("ciclo na hierarquia não trava", () => {
    // Um pai apontando para o filho é dado corrompido; não pode congelar a página.
    const ciclo: Grupo[] = [
      {
        id: 1,
        name: "A",
        parent_id: 2,
        sort_order: 0,
        description: null,
        image_url: null,
      },
      {
        id: 2,
        name: "B",
        parent_id: 1,
        sort_order: 0,
        description: null,
        image_url: null,
      },
    ];
    expect(() => agruparAdicionais([item(1, 1)], ciclo)).not.toThrow();
  });

  it("lista vazia devolve nenhuma seção", () => {
    expect(agruparAdicionais([], grupos)).toEqual([]);
  });
});

describe("emojiDaSecao", () => {
  it.each([
    ["Churrasqueiras", "🔥"],
    ["Esportes e aventuras", "🧗"],
    ["estacionamento interno", "🅿️"],
    ["Itens para Camping", "🏕️"],
    ["Qualquer coisa nova", "✨"],
  ])("%s → %s", (titulo, esperado) => {
    expect(emojiDaSecao(titulo)).toBe(esperado);
  });
});
