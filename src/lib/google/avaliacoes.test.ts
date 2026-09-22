import { describe, expect, it } from "vitest";
import { normalizarAvaliacoes } from "./avaliacoes";

describe("normalizarAvaliacoes", () => {
  it("sem nota ou sem contagem não anuncia nada", () => {
    expect(normalizarAvaliacoes({ userRatingCount: 10 })).toBeNull();
    expect(normalizarAvaliacoes({ rating: 4.8 })).toBeNull();
    expect(normalizarAvaliacoes({ rating: 5, userRatingCount: 0 })).toBeNull();
  });

  it("arredonda a nota para uma casa e mantém a contagem", () => {
    const r = normalizarAvaliacoes({ rating: 4.76, userRatingCount: 1234 });
    expect(r).toMatchObject({ nota: 4.8, total: 1234, avaliacoes: [] });
  });

  it("mantém a ordem do Google, sem filtrar por nota, até três com texto", () => {
    const r = normalizarAvaliacoes({
      rating: 4.5,
      userRatingCount: 50,
      reviews: [
        { rating: 5, text: { text: "Lindo" } },
        { rating: 2, text: { text: "Cheio demais" } },
        { rating: 5 },
        { rating: 4, text: { text: "   " } },
        { rating: 4, text: { text: "Voltaria" } },
        { rating: 5, text: { text: "Quarta com texto" } },
      ],
    });
    expect(r!.avaliacoes.map((a) => a.texto)).toEqual([
      "Lindo",
      "Cheio demais",
      "Voltaria",
    ]);
    expect(r!.avaliacoes.map((a) => a.nota)).toEqual([5, 2, 4]);
  });

  it("só linka o autor e a ficha por https", () => {
    const r = normalizarAvaliacoes({
      rating: 4.9,
      userRatingCount: 3,
      googleMapsUri: "javascript:alert(1)",
      reviews: [
        {
          rating: 5,
          text: { text: "Ótimo" },
          authorAttribution: { displayName: "Ana", uri: "javascript:alert(1)" },
        },
        {
          rating: 5,
          text: { text: "Muito bom" },
          authorAttribution: {
            displayName: "Bruno",
            uri: "https://www.google.com/maps/contrib/1",
          },
        },
      ],
    });
    expect(r!.link).toBeNull();
    expect(r!.avaliacoes[0].autorUrl).toBeNull();
    expect(r!.avaliacoes[1].autorUrl).toBe("https://www.google.com/maps/contrib/1");
  });

  it("dá um nome genérico a quem não tem nome", () => {
    const r = normalizarAvaliacoes({
      rating: 5,
      userRatingCount: 1,
      reviews: [{ rating: 5, text: { text: "Top" }, authorAttribution: {} }],
    });
    expect(r!.avaliacoes[0].autor).toBe("Visitante do Google");
  });
});
