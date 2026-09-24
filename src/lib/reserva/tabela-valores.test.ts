import { describe, expect, it } from "vitest";
import { agruparValores, tarifaDoDia, type LinhaResolvida } from "./tabela-valores";

const dayUse = { id: 1, nome: "Day use", slug: "day-use" };
const camping = { id: 2, nome: "Camping", slug: "camping" };
const inteira = { nome: "Inteira", entrada: true, descricao: "A partir de 13 anos" };
const meia = {
  nome: "Meia-Entrada",
  entrada: true,
  descricao: "Crianças de 6 a 12 anos e maiores de 60 anos",
};

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
  it("junta as faixas do mesmo ingresso numa linha e oferece os dias na aba", () => {
    const { abas } = agruparValores([
      linha({ dia: "semana", valor: 30 }),
      linha({ dia: "fds", label: "Day Use (Fim de Semana)", valor: 35 }),
      linha({ dia: "feriado", label: "Day Use (Feriados)", valor: 40 }),
    ]);
    expect(abas).toHaveLength(1);
    expect(abas[0].dias).toEqual(["semana", "fds", "feriado"]);
    expect(abas[0].linhas).toHaveLength(1);
    expect(abas[0].linhas[0]).toMatchObject({
      titulo: "Inteira",
      detalhe: "A partir de 13 anos",
    });
    expect(abas[0].linhas[0].tarifas).toHaveLength(3);
  });

  it("lista inteira e meia na mesma aba, cada uma com a sua faixa de idade", () => {
    const { abas } = agruparValores([
      linha({}),
      linha({ dia: "fds", valor: 35 }),
      linha({ slug: "dayuse_entrada_meia", item: meia, valor: 15 }),
      linha({ slug: "dayuse_entrada_meia", item: meia, dia: "fds", valor: 17.5 }),
    ]);
    expect(abas[0].linhas.map((l) => [l.titulo, l.detalhe])).toEqual([
      ["Inteira", "A partir de 13 anos"],
      ["Meia-Entrada", "Crianças de 6 a 12 anos e maiores de 60 anos"],
    ]);
  });

  it("sem faixa de idade, a linha de tarifa única usa o rótulo do CMS", () => {
    const { abas } = agruparValores([
      linha({
        slug: "camping_entrada_inteira",
        label: "Camping (24h)",
        valor: 90,
        item: { nome: "Inteira", entrada: true, descricao: null },
        categoria: camping,
      }),
    ]);
    expect(abas[0].dias).toEqual([]);
    expect(abas[0].linhas[0].detalhe).toBe("Camping (24h)");
  });

  it("com várias tarifas e sem faixa de idade, não mostra o rótulo de uma só", () => {
    const semDescricao = { nome: "Inteira", entrada: true, descricao: null };
    const { abas } = agruparValores([
      linha({ item: semDescricao }),
      linha({ item: semDescricao, dia: "fds", valor: 35 }),
    ]);
    expect(abas[0].linhas[0].detalhe).toBeUndefined();
  });

  it("separa as abas pela categoria do item e leva cada uma à sua reserva", () => {
    const { abas } = agruparValores([
      linha({}),
      linha({ slug: "camping_entrada_inteira", valor: 90, categoria: camping }),
    ]);
    expect(abas.map((a) => [a.nome, a.href])).toEqual([
      ["Day use", "/reservar/day-use/"],
      ["Camping", "/reservar/camping/"],
    ]);
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

describe("tarifaDoDia", () => {
  const base = { slug: "x", titulo: "Inteira" };

  it("tarifa única vale para qualquer dia", () => {
    const l = { ...base, tarifas: [{ dia: "semana" as const, valor: 90 }] };
    expect(tarifaDoDia(l, "fds")).toEqual({ dia: "semana", valor: 90 });
  });

  it("com várias tarifas, devolve a do dia pedido", () => {
    const l = {
      ...base,
      tarifas: [
        { dia: "semana" as const, valor: 30 },
        { dia: "fds" as const, valor: 35 },
      ],
    };
    expect(tarifaDoDia(l, "fds")?.valor).toBe(35);
  });

  it("com várias tarifas e sem a do dia pedido, não inventa preço", () => {
    const l = {
      ...base,
      tarifas: [
        { dia: "semana" as const, valor: 30 },
        { dia: "fds" as const, valor: 35 },
      ],
    };
    expect(tarifaDoDia(l, "feriado")).toBeNull();
  });
});
