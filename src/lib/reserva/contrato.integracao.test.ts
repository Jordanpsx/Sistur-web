import { afterAll, describe, expect, it } from "vitest";
import { PODE_CRIAR, descartarDepois, faxinar } from "@/testes/reserva-descartavel";
import { ratearTotal, type Orcamento } from "./itens";

/**
 * Contract tests against a **live** Sistur.
 *
 * The unit tests prove the apportionment is internally consistent. They cannot
 * prove Sistur agrees, and agreement is the whole point: `criar()` recomputes
 * the total and refuses a difference above R$ 0,01. Only a real round trip
 * catches a rule changing on Sistur's side.
 *
 * Skipped automatically when SISTUR_API_URL is unset, so `npm test` stays green
 * on a machine with no backend. In CI, point it at staging.
 *
 * Nothing here writes: every case stops at `/simular` and compares numbers,
 * except the ones explicitly marked as creating a reservation, which are gated
 * behind SISTUR_WEB_API_KEY.
 */

const API = process.env.SISTUR_API_URL;
const CHAVE = process.env.SISTUR_WEB_API_KEY;

const descreve = API ? describe : describe.skip;
const CACHOEIRA = 1;
const DAY_USE = 1;
const CAMPING = 2;

/** A date N days out, so the advance-booking discount is deterministic. */
function daqui(dias: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

async function simular(corpo: Record<string, unknown>): Promise<Orcamento> {
  const res = await fetch(`${API}/reservas/api/public/simular`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!res.ok) throw new Error(`simular ${res.status}: ${await res.text()}`);
  return res.json();
}

async function criar(corpo: Record<string, unknown>) {
  const res = await fetch(`${API}/api/public/reservas/criar`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Web-Api-Key": CHAVE! },
    body: JSON.stringify(corpo),
  });
  const devolvido = await res.json().catch(() => null);
  // Registra no ponto único por onde toda criação passa: quem recusa não
  // devolve group_id, então só o que existe de fato entra na faxina.
  descartarDepois(devolvido?.group_id);
  return { status: res.status, corpo: devolvido };
}

afterAll(faxinar);

const soma = (itens: Array<{ price_override: number }>) =>
  Math.round(itens.reduce((s, i) => s + i.price_override, 0) * 100) / 100;

descreve("contrato de preços com o Sistur", () => {
  it("category_id muda o total — omiti-lo devolve valor acima do cobrado", async () => {
    const base = {
      source_id: CACHOEIRA,
      check_in_date: daqui(40),
      check_out_date: daqui(40),
      items: [{ item_id: 1, quantity: 2 }],
    };
    const sem = await simular(base);
    const com = await simular({ ...base, category_id: DAY_USE });

    // A regressão real: o preview mostrava `sem` e o motor cobrava `com`.
    expect(com.total).toBeLessThanOrEqual(sem.total);
    expect(com.discount_amount).toBeGreaterThan(0);
  });

  it("unit_price já traz a tarifa do tipo de dia", async () => {
    // Um sábado e a quarta seguinte, para as faixas divergirem.
    const sabado = (() => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + 30);
      while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().slice(0, 10);
    })();
    const quarta = (() => {
      const d = new Date(`${sabado}T12:00:00Z`);
      while (d.getUTCDay() !== 3) d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().slice(0, 10);
    })();

    const um = (data: string) =>
      simular({
        source_id: CACHOEIRA,
        category_id: DAY_USE,
        check_in_date: data,
        check_out_date: data,
        items: [{ item_id: 1, quantity: 1 }],
      });

    const [fds, semana] = await Promise.all([um(sabado), um(quarta)]);
    expect(fds.items_breakdown[0].unit_price).not.toBe(
      semana.items_breakdown[0].unit_price,
    );
  });

  it("day use aceita check_out igual a check_in", async () => {
    const d = daqui(45);
    const o = await simular({
      source_id: CACHOEIRA,
      category_id: DAY_USE,
      check_in_date: d,
      check_out_date: d,
      items: [{ item_id: 1, quantity: 1 }],
    });
    expect(o.total).toBeGreaterThan(0);
  });

  it("camping escala por diária", async () => {
    const ci = daqui(50);
    const pedir = (noites: number) => {
      const co = new Date(`${ci}T12:00:00Z`);
      co.setUTCDate(co.getUTCDate() + noites);
      return simular({
        source_id: CACHOEIRA,
        category_id: CAMPING,
        check_in_date: ci,
        check_out_date: co.toISOString().slice(0, 10),
        items: [{ item_id: 18, quantity: 1 }],
      });
    };
    const [uma, duas] = await Promise.all([pedir(1), pedir(2)]);
    expect(duas.subtotal).toBeCloseTo(uma.subtotal * 2, 1);
  });
});

descreve("rateio bate com o que o Sistur recalcula", () => {
  const casos: Array<[string, number, number, number, Array<{ item_id: number; quantity: number }>]> = [
    ["day use, 1 ingresso",        DAY_USE, 40, 0, [{ item_id: 1, quantity: 1 }]],
    ["day use, adultos e criança", DAY_USE, 41, 0, [{ item_id: 1, quantity: 2 }, { item_id: 2, quantity: 1 }]],
    ["day use, com isento",        DAY_USE, 42, 0, [{ item_id: 1, quantity: 2 }, { item_id: 2, quantity: 1 }, { item_id: 3, quantity: 1 }]],
    ["day use, quantidade ímpar",  DAY_USE, 43, 0, [{ item_id: 1, quantity: 7 }, { item_id: 2, quantity: 3 }]],
    ["camping, 2 noites",          CAMPING, 44, 2, [{ item_id: 18, quantity: 2 }, { item_id: 13, quantity: 1 }]],
    ["camping, 4 noites",          CAMPING, 46, 4, [{ item_id: 18, quantity: 4 }, { item_id: 17, quantity: 3 }]],
  ];

  it.each(casos)("%s", async (_nome, categoria, offset, noites, items) => {
    const ci = daqui(offset);
    const co = (() => {
      const d = new Date(`${ci}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + noites);
      return d.toISOString().slice(0, 10);
    })();

    const o = await simular({
      source_id: CACHOEIRA,
      category_id: categoria,
      check_in_date: ci,
      check_out_date: co,
      items,
    });

    // A invariante que o Sistur checa, verificada antes de gastar uma escrita.
    expect(soma(ratearTotal(o))).toBeCloseTo(o.total, 2);
  });
});

// Além da chave, exige um alvo declarado descartável: sem isso a suíte
// apontada para produção criaria reservas na lista de quem trabalha.
const criaReservas = API && CHAVE && PODE_CRIAR ? describe : describe.skip;

criaReservas("criação ponta a ponta", () => {
  it("cria a reserva com o rateio, sem divergência de preço", async () => {
    const ci = daqui(60);
    const o = await simular({
      source_id: CACHOEIRA,
      category_id: DAY_USE,
      check_in_date: ci,
      check_out_date: ci,
      items: [{ item_id: 1, quantity: 2 }, { item_id: 2, quantity: 1 }],
    });

    const r = await criar({
      source_id: CACHOEIRA,
      category_id: DAY_USE,
      customer_name: "Regressao Automatizada Silva",
      customer_document: "529.982.247-25",
      email: "regressao@exemplo.com.br",
      telefone: "(64) 99999-0000",
      check_in_date: ci,
      check_out_date: ci,
      items: ratearTotal(o),
    });

    expect(r.status, JSON.stringify(r.corpo)).toBe(201);
    expect(r.corpo.total).toBeCloseTo(o.total, 2);
    expect(r.corpo.group_id).toBeTruthy();
    // Soft lock: é o que solta a vaga sozinho se ninguém pagar.
    expect(r.corpo.expires_at).toBeTruthy();
  });

  it("mandar o subtotal em vez do total é recusado", async () => {
    // Guarda contra alguém "simplificar" o rateio de volta ao bug original.
    const ci = daqui(61);
    const o = await simular({
      source_id: CACHOEIRA,
      category_id: DAY_USE,
      check_in_date: ci,
      check_out_date: ci,
      items: [{ item_id: 1, quantity: 2 }],
    });
    // A anti-fraude tolera R$ 0,01. Se o desconto couber dentro disso não há
    // divergência a detectar — acontece de verdade quando alguém põe um preço
    // de centavos para testar pagamento, e o teste não deve acusar o produto
    // por isso.
    if (o.subtotal - o.total <= 0.01) return;

    const r = await criar({
      source_id: CACHOEIRA,
      category_id: DAY_USE,
      customer_name: "Regressao Automatizada Silva",
      customer_document: "529.982.247-25",
      email: "regressao@exemplo.com.br",
      telefone: "(64) 99999-0000",
      check_in_date: ci,
      check_out_date: ci,
      items: o.items_breakdown.map((l) => ({
        item_id: l.item_id,
        quantity: l.quantity,
        price_override: l.item_total,
      })),
    });

    expect(r.status).toBe(400);
    expect(r.corpo.erro).toMatch(/Divergência de preço/);
  });

  it("CPF inválido é recusado antes de gravar", async () => {
    const ci = daqui(62);
    const o = await simular({
      source_id: CACHOEIRA,
      category_id: DAY_USE,
      check_in_date: ci,
      check_out_date: ci,
      items: [{ item_id: 1, quantity: 1 }],
    });
    const r = await criar({
      source_id: CACHOEIRA,
      category_id: DAY_USE,
      customer_name: "Regressao Automatizada Silva",
      customer_document: "111.111.111-11",
      email: "regressao@exemplo.com.br",
      telefone: "(64) 99999-0000",
      check_in_date: ci,
      check_out_date: ci,
      items: ratearTotal(o),
    });
    expect(r.status).toBe(400);
  });

  it("sem a chave de serviço, recusa", async () => {
    const res = await fetch(`${API}/api/public/reservas/criar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });
});
