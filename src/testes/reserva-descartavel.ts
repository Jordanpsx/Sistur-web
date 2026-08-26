/**
 * Faxina das reservas que a suíte de integração cria.
 *
 * Os testes de funil precisam de reservas **de verdade** — é o objetivo deles:
 * um mock não teria pego o `category_id` que muda o preço em 30%, nem o
 * `price_override` que soma o total e não o subtotal. Mas reserva de verdade
 * fica na lista do operador, e ficou: dezenas de "Regressao ... Silva" no topo
 * da tela de reservas do staging, empurrando o trabalho real para baixo.
 *
 * O conserto não é parar de criar, é devolver o que se pegou emprestado. Cada
 * teste registra aqui o `group_id` que criou e o `afterAll` cancela todos. O
 * cancelamento passa pelo `ReservaService`, que versiona — a reserva vira uma
 * versão CANCELED em vez de sumir, então nem o histórico nem a taxa de
 * conversão perdem nada, e o soft lock devolve a churrasqueira ao estoque na
 * hora em vez de segurá-la por 15 minutos.
 *
 * Falha de faxina nunca derruba o teste: se a limpeza quebrar, o que interessa
 * é o resultado do teste, e o rastro fica no console.
 */

/**
 * Se este alvo pode receber reservas de teste.
 *
 * As suítes se pulam quando SISTUR_API_URL está ausente, mas ausência não era
 * garantia nenhuma: a variável apontando para o Sistur *de produção* rodaria
 * igual e criaria "Regressao ... Silva" na lista de quem trabalha. Nada no
 * código distinguia um alvo do outro.
 *
 * Então o padrão é não escrever. Criar reserva exige que o ambiente se declare
 * descartável, e só o .env do staging traz essa declaração. Um alvo sem ela não
 * quebra a rodada — os testes de leitura seguem, os de escrita se pulam.
 */
export const PODE_CRIAR = process.env.SISTUR_ALVO_DESCARTAVEL === "1";

const pendentes = new Set<string>();

/** Anota um `group_id` para ser cancelado ao fim do arquivo de testes. */
export function descartarDepois(groupId: string | undefined | null): void {
  if (typeof groupId === "string" && groupId) pendentes.add(groupId);
}

/** Cancela tudo que foi registrado. Passe como `afterAll` do arquivo. */
export async function faxinar(): Promise<void> {
  const api = process.env.SISTUR_API_URL;
  const chave = process.env.SISTUR_WEB_API_KEY;
  if (!api || !chave) return;

  const ids = [...pendentes];
  pendentes.clear();

  const falhas: string[] = [];
  for (const id of ids) {
    try {
      const res = await fetch(
        `${api}/api/public/reservas/${encodeURIComponent(id)}/cancelar`,
        { method: "POST", headers: { "X-Web-Api-Key": chave } },
      );
      // 409 é esperado quando o próprio teste já pagou a reserva: uma reserva
      // paga não se cancela por API, e não deveria mesmo.
      if (!res.ok && res.status !== 409) falhas.push(`${id} → ${res.status}`);
    } catch (e) {
      falhas.push(`${id} → ${e}`);
    }
  }

  if (falhas.length) {
    console.warn(
      `[faxina] ${falhas.length} de ${ids.length} reservas de teste ficaram no banco:\n  ` +
        falhas.join("\n  "),
    );
  }
}

/**
 * Datas candidatas a partir de `inicio` dias no futuro.
 *
 * O operador bloqueia dias — hoje há "Manutenção de piscinas toda
 * quarta-feira" —, e a suíte usava uma data fixa no futuro. Como essa data
 * caminha pelos dias da semana conforme o tempo passa, a cada semana ela caía
 * numa quarta e três testes quebravam sem que nada tivesse mudado no código.
 *
 * Quem cria reserva percorre estas datas até uma ser aceita. O teste quer uma
 * reserva, não um dia específico.
 */
export function datasCandidatas(inicio: number, quantas = 8): string[] {
  return Array.from({ length: quantas }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + inicio + i);
    return d.toISOString().slice(0, 10);
  });
}

/** Se o Sistur recusou por bloqueio de data, e não por defeito do teste. */
export function ehDataBloqueada(corpo: unknown): boolean {
  const erro = (corpo as { erro?: unknown })?.erro;
  return typeof erro === "string" && /bloquead/i.test(erro);
}
