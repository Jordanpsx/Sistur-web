import { describe, expect, it } from "vitest";
import { descreverTempo, detalharOrcamento } from "./detalhe";
import type { Orcamento } from "./itens";

const base: Orcamento = {
  items_breakdown: [],
  subtotal: 0,
  discount_amount: 0,
  discount_details: {},
  service_fee: 0,
  total: 0,
};

describe("descreverTempo", () => {
  it("diárias cheias", () => {
    expect(descreverTempo(24)).toBe("1 diária");
    expect(descreverTempo(48)).toBe("2 diárias");
  });

  it("diária mais horas soltas — o caso que confunde no camping", () => {
    expect(descreverTempo(33)).toBe("1 diária + 9h");
  });

  it("menos de um dia", () => {
    expect(descreverTempo(9)).toBe("9h");
  });
});

describe("detalharOrcamento", () => {
  it("sem orçamento, não inventa linhas", () => {
    expect(detalharOrcamento(null)).toEqual([]);
  });

  it("um item sem desconto nem taxa não repete o subtotal", () => {
    // Subtotal igual ao total na linha de cima faz duvidar de qual é o certo.
    const linhas = detalharOrcamento({
      ...base,
      items_breakdown: [
        { item_id: 1, item_name: "Inteira", quantity: 2, unit_price: 35, item_total: 70, num_days: null },
      ],
      subtotal: 70,
      total: 70,
    });
    expect(linhas.map((l) => l.tipo)).toEqual(["item", "total"]);
  });

  it("mostra cada desconto pelo nome e percentual", () => {
    const linhas = detalharOrcamento({
      ...base,
      items_breakdown: [
        { item_id: 1, item_name: "Inteira", quantity: 2, unit_price: 90, item_total: 180, num_days: null },
      ],
      subtotal: 180,
      discount_amount: 90,
      discount_details: {
        advance_booking: { name: "Reserva Antecipada", percent: 50, amount: 90 },
      },
      total: 90,
    });
    const desconto = linhas.find((l) => l.tipo === "desconto")!;
    expect(desconto.titulo).toBe("Reserva Antecipada (50%)");
    expect(desconto.valor).toBe(-90);
    expect(linhas.map((l) => l.tipo)).toEqual(["item", "subtotal", "desconto", "total"]);
  });

  it("desconto sem detalhe vira uma linha só, nunca uma linha sem número", () => {
    const linhas = detalharOrcamento({
      ...base,
      items_breakdown: [
        { item_id: 1, item_name: "Inteira", quantity: 1, unit_price: 100, item_total: 100, num_days: null },
      ],
      subtotal: 100,
      discount_amount: 10,
      discount_details: {},
      total: 90,
    });
    const d = linhas.filter((l) => l.tipo === "desconto");
    expect(d).toHaveLength(1);
    expect(d[0].valor).toBe(-10);
  });

  it("explica o pró-rata: quantidade, horas e a tarifa base", () => {
    // 33 horas de uma diária de R$ 90,00 dão R$ 123,75 por pessoa. Sem dizer
    // isso o número parece arbitrário.
    const linhas = detalharOrcamento({
      ...base,
      items_breakdown: [
        {
          item_id: 18,
          item_name: "Inteira",
          quantity: 2,
          unit_price: 90,
          unit_total: 123.75,
          item_total: 247.5,
          num_days: null,
          total_hours: 33,
          billing_type: "DAILY_PRORATED_HOURLY",
        },
      ],
      subtotal: 247.5,
      total: 247.5,
    });
    const item = linhas[0];
    expect(item.descricao).toContain("2 ×");
    expect(item.descricao).toContain("1 diária + 9h");
    expect(item.descricao).toMatch(/tarifa.*90,00\/diária/);
  });

  it("não fala em tarifa base quando ela é o próprio preço pago", () => {
    const linhas = detalharOrcamento({
      ...base,
      items_breakdown: [
        {
          item_id: 4,
          item_name: "Churrasqueira",
          quantity: 1,
          unit_price: 80,
          unit_total: 80,
          item_total: 80,
          num_days: null,
          total_hours: 24,
        },
      ],
      subtotal: 80,
      total: 80,
    });
    expect(linhas[0].descricao).not.toMatch(/tarifa/);
    expect(linhas[0].descricao).toContain("1 diária");
  });

  it("taxa de serviço aparece com o percentual", () => {
    const linhas = detalharOrcamento({
      ...base,
      items_breakdown: [
        { item_id: 1, item_name: "X", quantity: 1, unit_price: 100, item_total: 100, num_days: null },
      ],
      subtotal: 100,
      service_fee: 8.1,
      service_fee_details: { percent: 8.1 },
      total: 108.1,
    });
    const taxa = linhas.find((l) => l.tipo === "taxa")!;
    expect(taxa.titulo).toBe("Taxa de serviço (8.1%)");
    expect(taxa.valor).toBe(8.1);
  });

  it("as linhas somam o total — é a promessa que o detalhe faz", () => {
    const o: Orcamento = {
      ...base,
      items_breakdown: [
        { item_id: 1, item_name: "A", quantity: 2, unit_price: 90, item_total: 180, num_days: null },
        { item_id: 2, item_name: "B", quantity: 1, unit_price: 95, item_total: 95, num_days: null },
      ],
      subtotal: 275,
      discount_amount: 137.5,
      discount_details: { advance_booking: { name: "Antecipada", percent: 50, amount: 137.5 } },
      service_fee: 10,
      service_fee_details: { percent: 5 },
      total: 147.5,
    };
    const linhas = detalharOrcamento(o);
    const soma =
      linhas.filter((l) => l.tipo === "item").reduce((s, l) => s + l.valor, 0) +
      linhas.filter((l) => l.tipo === "desconto").reduce((s, l) => s + l.valor, 0) +
      linhas.filter((l) => l.tipo === "taxa").reduce((s, l) => s + l.valor, 0);
    expect(soma).toBeCloseTo(o.total, 2);
  });
});

describe("a conta nomeia a unidade escolhida, não a tarifa", () => {
  const comChurrasqueira: Orcamento = {
    ...base,
    items_breakdown: [
      { item_id: 1, item_name: "Inteira", quantity: 2, unit_price: 35, item_total: 70, num_days: null },
      {
        item_id: 6,
        item_name: "Churrasqueira Grande (A)",
        quantity: 1,
        unit_price: 120,
        item_total: 120,
        num_days: null,
      },
    ],
    subtotal: 190,
    total: 190,
  };

  it("troca o nome da tarifa pelo da churrasqueira", () => {
    // O cliente escolheu a A4 na tela; ver "Churrasqueira Grande (A)" na conta
    // faz duvidar se pegou a certa.
    const linhas = detalharOrcamento(comChurrasqueira, { 6: ["Churrasqueira A4"] });
    expect(linhas[1].titulo).toBe("Churrasqueira A4");
  });

  it("nomeia as duas quando a mesma tarifa leva duas unidades", () => {
    // O /simular conta por tarifa e quantidade, então duas churrasqueiras do
    // mesmo tipo voltam numa linha só.
    const linhas = detalharOrcamento(comChurrasqueira, {
      6: ["Churrasqueira A1", "Churrasqueira A4"],
    });
    expect(linhas[1].titulo).toBe("Churrasqueira A1 e Churrasqueira A4");
  });

  it("sem unidade física, mantém o nome da tarifa", () => {
    // É o caso de todo item que se compra por quantidade — ingresso, lenha.
    const linhas = detalharOrcamento(comChurrasqueira, { 6: [] });
    expect(linhas[1].titulo).toBe("Churrasqueira Grande (A)");
    expect(linhas[0].titulo).toBe("Inteira");
  });

  it("sem o mapa, nada muda", () => {
    const linhas = detalharOrcamento(comChurrasqueira);
    expect(linhas[1].titulo).toBe("Churrasqueira Grande (A)");
  });
});
