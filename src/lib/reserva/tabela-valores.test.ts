import { describe, expect, it } from "vitest";
import { agruparValores, type LinhaResolvida } from "./tabela-valores";

const dayUse = { id: 1, nome: "Day use", slug: "day-use" };
const camping = { id: 2, nome: "Camping", slug: "camping" };
const inteira = { nome: "Inteira", entrada: true };

const linha = (p: Partial<LinhaResolvida>): LinhaResolvida => ({
  slug: "dayuse_entrada_inteira",
  dia: "semana",
  label: "Day Use (Seg a Sex)",
  valor: 30,
  item: inteira,
  categoria: dayUse,
  ...p,
});

describe("agruparValores", () => {
  it("junta as faixas do mesmo ingresso num cartão só, na ordem do CMS", () => {
    const { abas } = agruparValores([
      linha({ dia: "semana", valor: 30 }),
      linha({ dia: "fds", label: "Day Use (Fim de Semana)", valor: 35 }),
      linha({ dia: "feriado", label: "Day Use (Feriados)", valor: 40 }),
    ]);
    expect(abas).toHaveLength(1);
    expect(abas[0].linhas).toHaveLength(1);
    expect(abas[0].linhas[0].tarifas).toEqual([
      { dia: "semana", valor: 30 },
      { dia: "fds", valor: 35 },
      { dia: "feriado", valor: 40 },
    ]);
    // Com seletor, o rótulo de uma faixa só não aparece.
    expect(abas[0].linhas[0].detalhe).toBeUndefined();
  });

  it("separa as abas pela categoria do item e leva cada uma à sua reserva", () => {
    const { abas } = agruparValores([
      linha({}),
      linha({
        slug: "camping_entrada_inteira",
        label: "Camping (24h)",
        valor: 90,
        categoria: camping,
      }),
    ]);
    expect(abas.map((a) => [a.nome, a.href])).toEqual([
      ["Day use", "/reservar/day-use/"],
      ["Camping", "/reservar/camping/"],
    ]);
    expect(abas[1].linhas[0]).toMatchObject({
      titulo: "Entrada inteira",
      detalhe: "Camping (24h)",
    });
  });

  it("manda o que não é ingresso para os adicionais, e não para uma aba", () => {
    const { abas, adicionais } = agruparValores([
      linha({}),
      linha({
        slug: "dayuse_churrasqueira_pequena_a",
        label: "Área coberta com churrasqueira",
        prefixo: "A partir de",
        valor: 65.05,
        item: { nome: "Churrasqueira Pequena (A)", entrada: false },
      }),
    ]);
    expect(abas).toHaveLength(1);
    expect(abas[0].linhas).toHaveLength(1);
    expect(adicionais).toEqual([
      {
        rotulo: "Área coberta com churrasqueira",
        prefixo: "A partir de",
        valor: 65.05,
        href: "/reservar/day-use/",
      },
    ]);
  });

  it("não repete a mesma faixa se o CMS listar duas vezes", () => {
    const { abas } = agruparValores([linha({ valor: 30 }), linha({ valor: 30 })]);
    expect(abas[0].linhas[0].tarifas).toHaveLength(1);
  });

  it("categoria sem slug leva à escolha de experiência", () => {
    const { abas } = agruparValores([
      linha({ categoria: { id: 9, nome: "Outro", slug: null } }),
    ]);
    expect(abas[0].href).toBe("/reservar/");
  });
});
