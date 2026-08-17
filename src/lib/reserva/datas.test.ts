import { afterEach, describe, expect, it, vi } from "vitest";
import { diasEntre, hoje, validarSelecao } from "./datas";

/**
 * Date rules for the funnel.
 *
 * These run on the server when a step renders and decide whether the visitor can
 * advance, so an off-by-one here sells a day that is not available. The timezone
 * cases matter in particular: the container runs UTC and the business runs in
 * São Paulo, so "today" disagrees for three hours every night.
 */

afterEach(() => vi.useRealTimers());

/** Freezes the clock at a given UTC instant. */
function congelar(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

describe("hoje", () => {
  it("usa o fuso de São Paulo, não UTC", () => {
    // 02:00 UTC de 21/03 é ainda 23:00 de 20/03 em São Paulo. Usar UTC aqui
    // faria o formulário recusar uma reserva legítima para "hoje".
    congelar("2027-03-21T02:00:00Z");
    expect(hoje()).toBe("2027-03-20");
  });

  it("vira o dia no horário certo", () => {
    congelar("2027-03-21T03:00:00Z");
    expect(hoje()).toBe("2027-03-21");
  });
});

describe("diasEntre", () => {
  it("conta noites, não dias de calendário", () => {
    expect(diasEntre("2027-03-20", "2027-03-22")).toBe(2);
  });

  it("atravessa o horário de verão sem perder um dia", () => {
    // Onde uma conta ingênua em milissegundos erraria por causa da hora extra.
    expect(diasEntre("2027-10-15", "2027-10-20")).toBe(5);
  });

  it("atravessa a virada do ano", () => {
    expect(diasEntre("2027-12-30", "2028-01-02")).toBe(3);
  });
});

describe("validarSelecao — dia único", () => {
  const diaUnico = { diaUnico: true };

  it("sem data, não é erro — só não está completa", () => {
    const s = validarSelecao(undefined, undefined, diaUnico);
    expect(s.completa).toBe(false);
    expect(s.erro).toBeUndefined();
  });

  it("aceita hoje", () => {
    congelar("2027-05-10T15:00:00Z");
    expect(validarSelecao("2027-05-10", undefined, diaUnico).completa).toBe(true);
  });

  it("recusa data passada", () => {
    congelar("2027-05-10T15:00:00Z");
    const s = validarSelecao("2027-05-09", undefined, diaUnico);
    expect(s.completa).toBe(false);
    expect(s.erro).toMatch(/a partir de hoje/);
  });

  it("recusa texto que não é data", () => {
    expect(validarSelecao("abc", undefined, diaUnico).erro).toMatch(/inválida/);
  });

  it("recusa dia que não existe no calendário", () => {
    // 31 de fevereiro passa no regex e é aceito por um Date ingênuo.
    expect(validarSelecao("2027-02-31", undefined, diaUnico).erro).toMatch(/inválida/);
  });

  it("preserva a data digitada junto do erro", () => {
    congelar("2027-05-10T15:00:00Z");
    // Sem isto o campo esvaziaria e a pessoa redigitaria tudo.
    expect(validarSelecao("2020-01-01", undefined, diaUnico).entrada).toBe("2020-01-01");
  });
});

describe("validarSelecao — corte do mesmo dia", () => {
  const opts = { diaUnico: false, cutoff: "14:00" };

  it("antes do corte, hoje é aceito", () => {
    congelar("2027-05-10T13:00:00Z"); // 10:00 em São Paulo
    expect(validarSelecao("2027-05-10", "2027-05-12", opts).completa).toBe(true);
  });

  it("depois do corte, hoje é recusado", () => {
    congelar("2027-05-10T18:00:00Z"); // 15:00 em São Paulo
    const s = validarSelecao("2027-05-10", "2027-05-12", opts);
    expect(s.completa).toBe(false);
    expect(s.erro).toMatch(/14:00/);
  });

  it("o corte não afeta datas futuras", () => {
    congelar("2027-05-10T18:00:00Z");
    expect(validarSelecao("2027-05-11", "2027-05-12", opts).completa).toBe(true);
  });
});

describe("validarSelecao — período", () => {
  const periodo = { diaUnico: false };

  it("exige saída depois da entrada", () => {
    congelar("2027-05-01T12:00:00Z");
    expect(validarSelecao("2027-05-10", "2027-05-09", periodo).erro).toMatch(/pelo menos um dia/);
  });

  it("recusa entrada igual à saída", () => {
    congelar("2027-05-01T12:00:00Z");
    expect(validarSelecao("2027-05-10", "2027-05-10", periodo).erro).toMatch(/pelo menos um dia/);
  });

  it("com entrada e sem saída, fica incompleta sem erro", () => {
    congelar("2027-05-01T12:00:00Z");
    const s = validarSelecao("2027-05-10", undefined, periodo);
    expect(s.completa).toBe(false);
    expect(s.erro).toBeUndefined();
  });

  it("uma noite é válida", () => {
    congelar("2027-05-01T12:00:00Z");
    expect(validarSelecao("2027-05-10", "2027-05-11", periodo).completa).toBe(true);
  });
});
