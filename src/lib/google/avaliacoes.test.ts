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

  it("cita só 4 e 5 estrelas, das mais recentes para as mais antigas, até três", () => {
    const r = normalizarAvaliacoes({
      rating: 4.2,
      userRatingCount: 1201,
      reviews: [
        { rating: 5, text: { text: "Antiga" }, publishTime: "2026-01-10T12:00:00Z" },
        { rating: 1, text: { text: "Péssimo" }, publishTime: "2026-09-20T12:00:00Z" },
        { rating: 4, text: { text: "Recente" }, publishTime: "2026-09-01T12:00:00Z" },
        { rating: 3, text: { text: "Mediano" }, publishTime: "2026-08-01T12:00:00Z" },
        { rating: 5, text: { text: "Meio" }, publishTime: "2026-05-01T12:00:00Z" },
        { rating: 5, text: { text: "   " }, publishTime: "2026-09-24T12:00:00Z" },
        { rating: 5, text: { text: "Quarta boa" }, publishTime: "2025-12-01T12:00:00Z" },
      ],
    });
    expect(r!.avaliacoes.map((a) => a.texto)).toEqual(["Recente", "Meio", "Antiga"]);
    expect(r!.avaliacoes.every((a) => a.nota >= 4)).toBe(true);
  });

  it("filtrar os trechos não mexe na média nem no total", () => {
    const r = normalizarAvaliacoes({
      rating: 4.2,
      userRatingCount: 1201,
      reviews: [{ rating: 1, text: { text: "Ruim" } }],
    });
    expect(r).toMatchObject({ nota: 4.2, total: 1201, avaliacoes: [] });
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
