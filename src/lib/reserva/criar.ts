"use server";

import { momento } from "./datas";
import { redirect } from "next/navigation";
import { lerQuantidades, ratearTotal, simular } from "./itens";
import { lerRecursos, quantidadesPorTarifa, buscarRecursos } from "./recursos";

/**
 * Creates the reservation in Sistur — step 3's submit.
 *
 * A Server Action rather than a form posting to a route handler, for one
 * reason: **personal data must never reach a URL.** Every step before this one
 * keeps its state in the query string, which is what makes back-navigation and
 * reload work. That trick stops here. A CPF in a query string lands in the
 * access log, the browser history and the `Referer` header sent to any third
 * party the next page happens to load.
 *
 * Dates and quantities stay in the URL because they are not personal data — a
 * date and a count identify nobody. Name, CPF, e-mail and phone travel in the
 * POST body only.
 *
 * The action re-prices server-side before submitting. It does not trust the
 * total the page was showing: minutes may have passed, and Sistur's own
 * anti-fraud check would reject a stale figure anyway. Better to send the
 * current number and handle a genuine change explicitly.
 */

const API = process.env.SISTUR_API_URL!;
const CHAVE = process.env.SISTUR_WEB_API_KEY ?? "";

export type EstadoCriacao = { erro?: string; campo?: string };

export async function criarReserva(
  _anterior: EstadoCriacao,
  form: FormData,
): Promise<EstadoCriacao> {
  const texto = (k: string) => String(form.get(k) ?? "").trim();

  const slug = texto("slug");
  const sourceId = Number(form.get("source_id"));
  const categoryId = Number(form.get("category_id"));
  const entrada = texto("entrada");
  const saida = texto("saida") || entrada;
  // A hora vem do passo 2 e é preço no camping. Tudo daqui para baixo fala com
  // o Sistur usando estes instantes, nunca a data crua: simular sobre um valor
  // e criar sobre outro é a divergência que a anti-fraude recusa.
  const inicio = momento(entrada, texto("he") || undefined);
  const fim = momento(saida, texto("hs") || undefined);

  // Quantities arrive as the same `i<id>` keys the URL uses, so one parser
  // serves both and the two cannot drift apart.
  const campos = Object.fromEntries(
    [...form.entries()].map(([k, v]) => [k, String(v)]),
  );
  const quantidades = lerQuantidades(campos);
  const recursosSel = lerRecursos(campos);

  if (!slug || !entrada || (Object.keys(quantidades).length === 0 && recursosSel.length === 0)) {
    return { erro: "Sua seleção expirou. Volte e escolha as datas novamente." };
  }

  // Cheap checks first, so an obvious typo does not cost a round trip. The
  // authoritative validation is Sistur's — this only shortens the loop.
  const nome = texto("customer_name");
  if (nome.split(/\s+/).filter(Boolean).length < 2) {
    return { erro: "Informe seu nome completo.", campo: "customer_name" };
  }
  if (!/^\S+@\S+\.\S+$/.test(texto("email"))) {
    return { erro: "Informe um e-mail válido.", campo: "email" };
  }

  // Os espaços escolhidos viram quantidade na tarifa do grupo deles, que é a
  // linguagem do /simular; o `resource_id` volta a aparecer no rateio.
  const recursos = recursosSel.length
    ? await buscarRecursos({ sourceId, categoryId, entrada: inicio, saida: fim })
    : [];
  const porTarifa = quantidadesPorTarifa(recursosSel, recursos);
  const quantidadesCompletas = { ...quantidades };
  for (const [id, q] of Object.entries(porTarifa)) {
    quantidadesCompletas[Number(id)] = (quantidadesCompletas[Number(id)] ?? 0) + q;
  }

  const recursosPorTarifa: Record<number, number[]> = {};
  for (const id of recursosSel) {
    const r = recursos.find((x) => x.id === id);
    if (!r) continue;
    (recursosPorTarifa[r.item_id] ??= []).push(id);
  }

  const orcamento = await simular({
    sourceId,
    categoryId,
    entrada: inicio,
    saida: fim,
    quantidades: quantidadesCompletas,
  });
  if (!orcamento) {
    return {
      erro: "Não foi possível confirmar os valores agora. Tente novamente em instantes.",
    };
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${API}/api/public/reservas/criar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Web-Api-Key": CHAVE },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        source_id: sourceId,
        category_id: categoryId,
        customer_name: nome,
        customer_document: texto("customer_document"),
        email: texto("email"),
        telefone: texto("telefone"),
        observacoes: texto("observacoes"),
        check_in_date: inicio,
        check_out_date: fim,
        items: ratearTotal(orcamento, recursosPorTarifa),
      }),
    });
  } catch {
    return { erro: "Não conseguimos falar com o sistema de reservas. Tente novamente." };
  }

  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    // Sistur's validation messages are written in pt-BR for the end user, so
    // they are shown as-is. The generic fallback covers 5xx.
    return { erro: dados?.erro || "Não foi possível concluir a reserva." };
  }

  // redirect() throws by design — it must sit outside the try above, or the
  // catch would swallow it and the visitor would stay on a form whose
  // reservation was already created.
  //
  // Goes straight to payment: the reservation now holds its resources, and the
  // hold lapses in 15 minutes.
  redirect(`/reservar/${slug}/pagamento/?r=${dados.group_id}`);
}
