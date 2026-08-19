import { describe, expect, it } from "vitest";
import { chavesDe, montarPayer, type Payer } from "./pagador";

/**
 * Who Mercado Pago is told paid.
 *
 * The proxy used to replace whatever the Brick collected with the reservation's
 * holder, so the card token carried one CPF and the charge another. These tests
 * fix the rule that removed it: prefer the Brick, fall back field by field, and
 * never let the browser add fields of its own.
 */

const reserva: Payer = {
  email: "reserva@exemplo.com.br",
  first_name: "Maria",
  last_name: "Souza",
  identification: { type: "CPF", number: "52998224725" },
};

describe("montarPayer", () => {
  it("prefere quem o Brick coletou", () => {
    const p = montarPayer(
      {
        email: "mae@exemplo.com.br",
        first_name: "Ana",
        last_name: "Souza",
        identification: { type: "CPF", number: "111.444.777-35" },
      },
      reserva,
    );
    expect(p.email).toBe("mae@exemplo.com.br");
    expect(p.first_name).toBe("Ana");
    expect(p.identification).toEqual({ type: "CPF", number: "11144477735" });
  });

  it("tira a máscara do CPF", () => {
    // O Brick devolve formatado; o Mercado Pago espera só dígitos.
    const p = montarPayer({ identification: { number: "529.982.247-25" } }, reserva);
    expect(p.identification?.number).toBe("52998224725");
  });

  it("cai na reserva campo a campo, não tudo ou nada", () => {
    // PIX e cartão coletam subconjuntos diferentes; faltar um pedaço não pode
    // derrubar o pagamento.
    const p = montarPayer({ email: "so-email@exemplo.com" }, reserva);
    expect(p.email).toBe("so-email@exemplo.com");
    expect(p.first_name).toBe("Maria");
    expect(p.identification?.number).toBe("52998224725");
  });

  it("sem nada do Brick, usa a reserva inteira", () => {
    expect(montarPayer(undefined, reserva)).toEqual(reserva);
    expect(montarPayer({}, reserva)).toEqual(reserva);
    expect(montarPayer(null, reserva)).toEqual(reserva);
  });

  it("descarta campos que o Brick não deveria mandar", () => {
    // O payload é remontado, não espalhado: uma página editada não injeta
    // campos extras na requisição ao Mercado Pago.
    const p = montarPayer(
      { email: "a@b.com", entity_type: "association", extra: "x" } as never,
      reserva,
    );
    expect(Object.keys(p).sort()).toEqual([
      "email",
      "first_name",
      "identification",
      "last_name",
    ]);
  });

  it("string vazia não sobrescreve a reserva", () => {
    const p = montarPayer({ email: "   ", first_name: "" }, reserva);
    expect(p.email).toBe("reserva@exemplo.com.br");
    expect(p.first_name).toBe("Maria");
  });

  it("CPF só com pontuação é ignorado", () => {
    const p = montarPayer({ identification: { number: "...---" } }, reserva);
    expect(p.identification?.number).toBe("52998224725");
  });

  it("sem documento em lugar nenhum, omite identification", () => {
    const p = montarPayer({}, { email: "x@y.com" });
    expect(p.identification).toBeUndefined();
    expect(p.email).toBe("x@y.com");
  });

  it("assume CPF quando só o número vem", () => {
    const p = montarPayer(
      { identification: { number: "11144477735" } },
      { email: "x@y.com" },
    );
    expect(p.identification).toEqual({ type: "CPF", number: "11144477735" });
  });

  it("corta valores absurdamente longos", () => {
    const p = montarPayer({ first_name: "a".repeat(500) }, reserva);
    expect(p.first_name!.length).toBe(100);
  });

  it("tipo errado não quebra", () => {
    const p = montarPayer({ email: 42, identification: "x" } as never, reserva);
    expect(p.email).toBe("reserva@exemplo.com.br");
    expect(p.identification?.number).toBe("52998224725");
  });
});

describe("chavesDe", () => {
  it("devolve os nomes dos campos, ordenados", () => {
    expect(chavesDe({ token: "x", payer: {}, installments: 1 })).toEqual([
      "installments",
      "payer",
      "token",
    ]);
  });

  it("nunca devolve valores", () => {
    const chaves = chavesDe({ cpf: "52998224725" });
    expect(chaves).toEqual(["cpf"]);
    expect(JSON.stringify(chaves)).not.toContain("52998224725");
  });

  it("aceita nulo e não-objeto", () => {
    expect(chavesDe(null)).toEqual([]);
    expect(chavesDe(undefined)).toEqual([]);
    expect(chavesDe("texto")).toEqual([]);
  });
});
