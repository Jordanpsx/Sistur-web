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
