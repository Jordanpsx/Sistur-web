import { describe, expect, it } from "vitest";
import { interpretarResposta } from "./resposta-pagamento";

/**
 * Regression tests for the bug that lost the PIX QR code.
 *
 * Sistur created the charge, Mercado Pago returned the code, and the page
 * redirected to a confirmation screen anyway — so the customer had a valid PIX
 * waiting and no way to see it. Every case below asserts the same thing from a
 * different angle: **a response carrying a QR code must keep the customer here.**
 */

describe("interpretarResposta", () => {
  it("PIX pendente com QR code faz a tela esperar", () => {
    const d = interpretarResposta({
      payment_id: 123456789,
      status: "pending",
      qr_code: "00020126580014BR.GOV.BCB.PIX",
      qr_code_base64: "iVBORw0KGgo=",
      ticket_url: "https://mp/ticket",
    });
    expect(d.tipo).toBe("pix");
    if (d.tipo !== "pix") return;
    expect(d.payment_id).toBe("123456789");
    expect(d.qr_code).toBe("00020126580014BR.GOV.BCB.PIX");
    expect(d.qr_code_base64).toBe("iVBORw0KGgo=");
    expect(d.ticket_url).toBe("https://mp/ticket");
  });

  it("só o copia-e-cola já basta para esperar", () => {
    // Sem a imagem o cliente ainda paga colando o código; redirecionar seria
    // deixá-lo sem saída.
    expect(interpretarResposta({ status: "pending", qr_code: "0002012658" }).tipo).toBe(
      "pix",
    );
  });

  it("só a imagem também basta", () => {
    expect(
      interpretarResposta({ status: "pending", qr_code_base64: "iVBORw0KGgo=" }).tipo,
    ).toBe("pix");
  });

  it("cartão aprovado é desfecho final", () => {
    const d = interpretarResposta({ payment_id: 42, status: "approved" });
    expect(d.tipo).toBe("final");
    if (d.tipo !== "final") return;
    expect(d.status).toBe("approved");
    expect(d.payment_id).toBe("42");
  });

  it("cartão recusado é desfecho final", () => {
    const d = interpretarResposta({ payment_id: 43, status: "rejected" });
    expect(d.tipo).toBe("final");
  });

  it("pendente SEM QR code não prende o cliente na tela", () => {
    // Cartão em análise manual: não há nada a exibir, então prender seria uma
    // espera sem fim. É por isso que a decisão olha o QR code e não o status.
    const d = interpretarResposta({ payment_id: 44, status: "in_process" });
    expect(d.tipo).toBe("final");
  });

  it("campos vazios não viram PIX", () => {
    expect(
      interpretarResposta({ status: "approved", qr_code: "", qr_code_base64: "" }).tipo,
    ).toBe("final");
  });

  it("resposta nula não quebra", () => {
    const d = interpretarResposta(null);
    expect(d.tipo).toBe("final");
    if (d.tipo !== "final") return;
    expect(d.payment_id).toBe("");
  });

  it("payment_id numérico vira string, que é o que a URL usa", () => {
    const d = interpretarResposta({ payment_id: 987654321, status: "approved" });
    if (d.tipo !== "final") return;
    expect(d.payment_id).toBe("987654321");
  });

  it("ticket_url vazio não é propagado como link quebrado", () => {
    const d = interpretarResposta({ status: "pending", qr_code: "x", ticket_url: "" });
    if (d.tipo !== "pix") return;
    expect(d.ticket_url).toBeUndefined();
  });
});
