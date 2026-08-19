import { describe, expect, it } from "vitest";
import { ratearTotal, type Orcamento } from "./itens";

/**
 * Unit tests for the price apportionment — the piece that caused a real
 * production-shaped failure.
 *
 * Sistur's `criar()` sums every `price_override` and compares the result against
 * its own recalculated **total**, refusing a difference above R$ 0,01. The
 * obvious implementation sends `items_breakdown[].item_total` verbatim; that is
 * the *subtotal* line, so it is rejected the moment any discount applies:
 *
 *     Divergência de preço: servidor 49,00, enviado 70,00
 *
 * Every test here asserts the same invariant — **the sum equals the total, to
 * the cent** — because that is the single property Sistur checks.
 */

function orcamento(
  linhas: Array<[number, number, number]>,
  total: number,
): Orcamento {
  const items_breakdown = linhas.map(([item_id, quantity, item_total]) => ({
    item_id,
    item_name: `Item ${item_id}`,
    quantity,
    unit_price: item_total / quantity,
    item_total,
    num_days: null,
  }));
  const subtotal = items_breakdown.reduce((s, l) => s + l.item_total, 0);
  return {
    items_breakdown,
    subtotal,
    discount_amount: Math.max(0, subtotal - total),
    discount_details: {},
    service_fee: 0,
    total,
  };
}

const soma = (itens: Array<{ price_override: number }>) =>
  Math.round(itens.reduce((s, i) => s + i.price_override, 0) * 100) / 100;

describe("ratearTotal", () => {
  it("sem desconto, devolve os valores originais", () => {
    const r = ratearTotal(orcamento([[1, 2, 70], [2, 1, 17.5]], 87.5));
    expect(soma(r)).toBe(87.5);
    expect(r.map((i) => i.price_override)).toEqual([70, 17.5]);
  });

  it("com desconto, soma o total e não o subtotal", () => {
    // O caso real: 30% de desconto por antecedência no Day Use.
    const r = ratearTotal(orcamento([[1, 2, 70]], 49));
    expect(soma(r)).toBe(49);
  });

  it("preserva item_id e quantity", () => {
    const r = ratearTotal(orcamento([[1, 2, 70], [2, 1, 17.5]], 61.25));
    expect(r.map((i) => i.item_id)).toEqual([1, 2]);
    expect(r.map((i) => i.quantity)).toEqual([2, 1]);
  });

  it("distribui proporcionalmente ao peso de cada linha", () => {
    const r = ratearTotal(orcamento([[1, 1, 100], [2, 1, 300]], 200));
    // 100/400 e 300/400 de 200.
    expect(r[0].price_override).toBeCloseTo(50, 2);
    expect(r[1].price_override).toBeCloseTo(150, 2);
    expect(soma(r)).toBe(200);
  });

  it("a última linha absorve o arredondamento", () => {
    // 3 linhas iguais e um total que não divide por 3: arredondar cada uma
    // isoladamente daria 33.33×3 = 99.99 e estouraria a tolerância.
    const r = ratearTotal(orcamento([[1, 1, 10], [2, 1, 10], [3, 1, 10]], 100));
    expect(soma(r)).toBe(100);
  });

  it("nunca desvia mais de um centavo, em carrinho grande", () => {
    // Onde o arredondamento por linha realmente quebraria.
    const linhas: Array<[number, number, number]> = Array.from(
      { length: 20 },
      (_, i) => [i + 1, 1, 7.77],
    );
    const total = 111.11;
    const r = ratearTotal(orcamento(linhas, total));
    expect(Math.abs(soma(r) - total)).toBeLessThanOrEqual(0.01);
  });

  it("aguenta um total maior que o subtotal (taxa de serviço)", () => {
    const o = orcamento([[1, 1, 100]], 108.1);
    o.service_fee = 8.1;
    o.discount_amount = 0;
    expect(soma(ratearTotal(o))).toBe(108.1);
  });

  it("subtotal zero não gera NaN", () => {
    // Itens isentos: preço 0,01 pode arredondar para zero na base.
    const r = ratearTotal(orcamento([[1, 1, 0], [2, 1, 0]], 0));
    expect(r.every((i) => Number.isFinite(i.price_override))).toBe(true);
    expect(soma(r)).toBe(0);
  });

  it("linha única recebe o total inteiro", () => {
    expect(soma(ratearTotal(orcamento([[1, 3, 90]], 63)))).toBe(63);
  });
});

describe("ratearTotal com recursos físicos", () => {
  it("emite uma linha por churrasqueira, com resource_id", () => {
    // Sem o resource_id o Sistur escolhe outra do grupo pela atribuição
    // automática, e o cliente recebe a A1 depois de reservar a A4.
    const o = orcamento([[7, 2, 240]], 168);
    const r = ratearTotal(o, { 7: [6, 4] });
    expect(r).toHaveLength(2);
    expect(r.map((x) => x.resource_id)).toEqual([6, 4]);
    expect(r.every((x) => x.quantity === 1)).toBe(true);
    expect(soma(r)).toBe(168);
  });

  it("mistura ingressos sem recurso e churrasqueiras com recurso", () => {
    const o = orcamento([[1, 2, 70], [7, 1, 120]], 133);
    const r = ratearTotal(o, { 7: [6] });
    expect(r.find((x) => x.item_id === 1)?.resource_id).toBeUndefined();
    expect(r.find((x) => x.item_id === 7)?.resource_id).toBe(6);
    expect(soma(r)).toBe(133);
  });

  it("a divisão entre recursos não perde centavo", () => {
    // Três recursos e um valor que não divide por três.
    const o = orcamento([[7, 3, 100]], 100);
    const r = ratearTotal(o, { 7: [1, 2, 3] });
    expect(soma(r)).toBe(100);
  });

  it("sem recursos, o comportamento antigo é preservado", () => {
    const o = orcamento([[1, 2, 70]], 49);
    const r = ratearTotal(o);
    expect(r).toHaveLength(1);
    expect(r[0].resource_id).toBeUndefined();
    expect(soma(r)).toBe(49);
  });
});
