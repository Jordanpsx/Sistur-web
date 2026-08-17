/**
 * Date rules for the booking funnel.
 *
 * Pure functions over strings — no React, no fetch. They run on the server when
 * a step renders and can be unit-tested without a browser, which matters because
 * this is where an off-by-one silently sells a day that is not available.
 *
 * Everything is `America/Sao_Paulo`. The container runs UTC, so "today" computed
 * naively is wrong for three hours every night — long enough to matter for a
 * same-day cutoff.
 */

const TZ = "America/Sao_Paulo";

/** Today in São Paulo, as YYYY-MM-DD. */
export function hoje(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Current local time as minutes past midnight, for the same-day cutoff. */
function minutosAgora(): number {
  const hm = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function ehDataValida(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function diasEntre(a: string, b: string): number {
  const ms =
    new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatarData(s: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "long",
    year: "numeric",
    weekday: "long",
  }).format(new Date(`${s}T12:00:00Z`));
}

export type Selecao = {
  entrada?: string;
  saida?: string;
  erro?: string;
  completa: boolean;
};

/**
 * Validate what the URL carries.
 *
 * Returns rather than throws: a step must always render, showing the error
 * beside the field. Throwing would turn a mistyped date into an error page and
 * lose everything the customer had already chosen.
 *
 * `cutoff` is the category's `same_day_cutoff_time` ("HH:MM"). Past it, today is
 * no longer bookable — the rule belongs to Sistur and is only enforced here so
 * the customer is told before submitting, never instead of the server checking.
 */
export function validarSelecao(
  entrada: string | undefined,
  saida: string | undefined,
  opcoes: { diaUnico: boolean; cutoff?: string | null },
): Selecao {
  if (!entrada) return { completa: false };

  if (!ehDataValida(entrada)) {
    return { erro: "Data de entrada inválida.", completa: false };
  }

  const min = hoje();
  if (entrada < min) {
    return { entrada, erro: "Escolha uma data a partir de hoje.", completa: false };
  }

  if (entrada === min && opcoes.cutoff) {
    const [h, m] = opcoes.cutoff.split(":").map(Number);
    if (minutosAgora() >= h * 60 + m) {
      return {
        entrada,
        erro: `Reservas para hoje encerram às ${opcoes.cutoff}. Escolha outra data.`,
        completa: false,
      };
    }
  }

  if (opcoes.diaUnico) return { entrada, completa: true };

  if (!saida) return { entrada, completa: false };
  if (!ehDataValida(saida)) {
    return { entrada, erro: "Data de saída inválida.", completa: false };
  }
  if (diasEntre(entrada, saida) < 1) {
    return {
      entrada,
      saida,
      erro: "A saída precisa ser pelo menos um dia após a entrada.",
      completa: false,
    };
  }

  return { entrada, saida, completa: true };
}
