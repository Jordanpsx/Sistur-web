import { describe, expect, it } from "vitest";
import { escreverQuantidades, lerQuantidades } from "./itens";

/**
 * Quantities as URL state.
 *
 * This is the only thing carrying the visitor's selection between steps, so a
 * parsing slip silently drops items from a booking. Hostile input matters too:
 * these values come straight from a query string.
 */

describe("lerQuantidades", () => {
  it("lê os pares i<id>", () => {
    expect(lerQuantidades({ i1: "2", i18: "1" })).toEqual({ 1: 2, 18: 1 });
  });

  it("ignora parâmetros que não são quantidade", () => {
    expect(
      lerQuantidades({ entrada: "2027-01-01", saida: "2027-01-02", i1: "2" }),
    ).toEqual({
      1: 2,
    });
  });

  it("descarta linha inválida sem perder o resto", () => {
    // Uma quantidade corrompida não pode derrubar a seleção inteira.
    expect(lerQuantidades({ i1: "2", i2: "abc", i3: "1" })).toEqual({ 1: 2, 3: 1 });
  });

  it.each([
    ["zero", "0"],
    ["negativa", "-5"],
    ["fracionada", "1.5"],
    ["acima do teto", "100"],
    ["vazia", ""],
    ["notação científica", "1e3"],
  ])("descarta quantidade %s", (_rotulo, valor) => {
    expect(lerQuantidades({ i1: valor })).toEqual({});
  });

  it("aceita o teto de 99", () => {
    expect(lerQuantidades({ i1: "99" })).toEqual({ 1: 99 });
  });

  it("ignora chave parecida mas errada", () => {
    expect(lerQuantidades({ item1: "2", i: "2", i1x: "2", ia: "2" })).toEqual({});
  });

  it("usa o primeiro valor quando o parâmetro se repete", () => {
    expect(lerQuantidades({ i1: ["3", "9"] })).toEqual({ 1: 3 });
  });
});

describe("escreverQuantidades", () => {
  it("faz a volta completa", () => {
    const original = { 1: 2, 18: 1, 7: 3 };
    const url = escreverQuantidades(original);
    expect(lerQuantidades(Object.fromEntries(url))).toEqual(original);
  });

  it("omite quantidade zerada", () => {
    expect(escreverQuantidades({ 1: 2, 2: 0 }).toString()).toBe("i1=2");
  });

  it("vazio gera query string vazia", () => {
    expect(escreverQuantidades({}).toString()).toBe("");
  });
});
