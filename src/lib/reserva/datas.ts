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

/**
 * Janela de horário da estadia, vinda da categoria no Sistur.
 *
 * Ausente (Day Use) o formulário pede só datas. Presente (Camping) ele pede
 * hora, porque ali a hora é preço: a diária é pró-rata, e das 08:00 às 17:00 do
 * dia seguinte são 33 horas, não 24 — R$ 61,87 contra R$ 45,00 na mesma tarifa.
 * Um formulário que mandasse só a data anunciaria um número e a portaria
 * cobraria outro.
 *
 * Os limites são dado do Sistur, nunca constantes daqui: o camping abre às 8h
 * porque a portaria abre às 8h, e isso muda sem que ninguém edite o site.
 */
export type Janela = {
  entradaDe: string;
  entradaAte: string;
  saidaAte: string;
  minHoras: number;
};

export type Selecao = {
  entrada?: string;
  saida?: string;
  horaEntrada?: string;
  horaSaida?: string;
  erro?: string;
  completa: boolean;
};

function ehHoraValida(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Horas entre dois instantes, cada um data + hora. */
export function horasEntre(
  dataA: string,
  horaA: string,
  dataB: string,
  horaB: string,
): number {
  const ms =
    new Date(`${dataB}T${horaB}:00Z`).getTime() -
    new Date(`${dataA}T${horaA}:00Z`).getTime();
  return ms / 3_600_000;
}

/**
 * O instante que vai para o Sistur: "YYYY-MM-DD" ou "YYYY-MM-DDTHH:MM".
 *
 * As duas formas são aceitas por `/simular` e por `criar`. Mandar a hora só
 * quando ela existe evita fabricar uma meia-noite que ninguém escolheu.
 */
export function momento(data: string, hora?: string): string {
  return hora ? `${data}T${hora}` : data;
}

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
  opcoes: {
    diaUnico: boolean;
    cutoff?: string | null;
    janela?: Janela | null;
    horaEntrada?: string;
    horaSaida?: string;
  },
): Selecao {
  if (!entrada) return { completa: false };

  if (!ehDataValida(entrada)) {
    // `entrada` volta mesmo sendo inválida, e isso importa: o passo 2 é um
    // componente cliente que re-deriva a seleção do próprio estado. Sem o valor
    // aqui, o estado nascia vazio, a re-derivação não via nada errado e a
    // mensagem sumia — quem digitasse uma data impossível não recebia aviso
    // nenhum. O <input type="date"> ignora o valor inválido e aparece vazio,
    // que é o comportamento certo: erro à vista e campo pronto para redigitar.
    return { entrada, erro: "Data de entrada inválida.", completa: false };
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

  const { janela } = opcoes;
  if (!janela) return { entrada, saida, completa: true };

  const { horaEntrada, horaSaida } = opcoes;
  const parcial = { entrada, saida, horaEntrada, horaSaida };

  if (!horaEntrada || !horaSaida) return { ...parcial, completa: false };
  if (!ehHoraValida(horaEntrada) || !ehHoraValida(horaSaida)) {
    return { ...parcial, erro: "Horário inválido.", completa: false };
  }

  if (
    minutos(horaEntrada) < minutos(janela.entradaDe) ||
    minutos(horaEntrada) > minutos(janela.entradaAte)
  ) {
    return {
      ...parcial,
      erro: `A entrada é permitida entre ${janela.entradaDe} e ${janela.entradaAte}.`,
      completa: false,
    };
  }

  if (minutos(horaSaida) > minutos(janela.saidaAte)) {
    return {
      ...parcial,
      erro: `A saída é permitida até as ${janela.saidaAte}.`,
      completa: false,
    };
  }

  const horas = horasEntre(entrada, horaEntrada, saida, horaSaida);
  if (horas < janela.minHoras) {
    return {
      ...parcial,
      erro: `Permanência mínima: ${janela.minHoras} horas. Esta seleção tem ${Math.floor(horas)}.`,
      completa: false,
    };
  }

  return { ...parcial, completa: true };
}
