import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getExperiencia, getItensDaExperiencia, janelaDe } from "@/lib/sistur/catalog";
import { momento, validarSelecao } from "@/lib/reserva/datas";
import { lerQuantidades, precosDoDia, simular } from "@/lib/reserva/itens";
import {
  buscarRecursos,
  lerRecursos,
  quantidadesPorTarifa,
} from "@/lib/reserva/recursos";
import { PassoReserva } from "@/components/reserva/passo-reserva";

/**
 * The booking form itself — one component, parameterised by experience.
 *
 * Day use and camping are not two forms. They differ by `single_day_only`
 * (a single date versus a range) and by which items the catalogue offers, both
 * of which are data. Building them separately is what produced the parallel
 * implementations this rewrite is replacing.
 *
 * **Resilience to back-navigation and cache**, which the WordPress form did not
 * survive, comes from two rules:
 *
 *   1. The chosen experience lives in the URL path, and every later selection
 *      lives in `searchParams` — dates as `entrada`/`saida`, quantities as
 *      `i<id>`. A step therefore renders from the URL alone: on a cold load,
 *      after a cache eviction, or when someone pastes the link tomorrow.
 *   2. Nothing is held in memory between steps except the customer's personal
 *      data, which must never enter a URL. Going back is an ordinary navigation
 *      rather than a state rewind, so there is no half-updated state to corrupt.
 *
 * The price shown on the first paint is computed here, on the server, so the
 * page is correct before hydration and with scripting disabled.
 *
 * Steps 3 and 4 (customer, payment) are not built yet.
 */

// Never cached, never prerendered — see §3.1 and the note on the selector.
export const dynamic = "force-dynamic";

type Params = { experiencia: string };
type Search = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const e = await getExperiencia((await params).experiencia);
  if (!e) return {};
  return {
    title: `Reservar ${e.name}`,
    description: e.description ?? undefined,
    // The funnel must never be indexed as content.
    robots: { index: false, follow: false },
  };
}

export default async function FormularioReserva({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const slug = (await params).experiencia;
  const e = await getExperiencia(slug);
  if (!e) notFound();

  const sp = await searchParams;
  // Only the first value is read: `?entrada=a&entrada=b` is either a crafted URL
  // or a stale link, and picking one deterministically beats rejecting it.
  const um = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  // Presente só onde a hora entra no preço — hoje, o camping.
  const janela = janelaDe(e);
  const selecao = validarSelecao(um("entrada"), um("saida"), {
    diaUnico: e.single_day_only,
    cutoff: e.same_day_cutoff_time,
    janela,
    horaEntrada: um("he") ?? janela?.entradaDe,
    // Espelha a entrada, como o passo 2 faz no cliente. Assim a primeira
    // pintura já traz diárias cheias e o preço base, em vez de abrir num total
    // quebrado que ninguém escolheu.
    horaSaida: um("hs") ?? um("he") ?? janela?.entradaDe,
  });
  const quantidades = lerQuantidades(sp);
  const recursosSel = lerRecursos(sp);
  const { ingressos, adicionais, grupos } = await getItensDaExperiencia(e);

  // Priced on the server so the first paint is already correct. Day use is a
  // single date, and Sistur accepts check_out equal to check_in.
  const datado = selecao.completa && selecao.entrada;
  const entrada = selecao.entrada!;
  const saida = e.single_day_only ? entrada : selecao.saida!;
  // A primeira pintura já precisa do total certo, e no camping o total depende
  // da hora: 08:00 → 17:00 do dia seguinte são 33 horas, não 24.
  const inicio = momento(entrada, janela ? selecao.horaEntrada : undefined);
  const fim = momento(saida, janela ? selecao.horaSaida : undefined);

  // Two calls, not one. The quote covers what the visitor actually selected; the
  // price list covers every item so each row can state its own figure for the
  // date. They are separate because the second depends only on the dates, so it
  // is not repeated when a quantity changes.
  // Os espaços físicos disponíveis na data, com foto e tarifa do grupo.
  const recursos = datado
    ? await buscarRecursos({
        sourceId: e.sourceId,
        categoryId: e.id,
        entrada: inicio,
        saida: fim,
      })
    : [];

  // O que o /simular precisa: tarifa e quantidade. As churrasqueiras escolhidas
  // viram quantidade na tarifa do grupo delas.
  const porTarifa = quantidadesPorTarifa(recursosSel, recursos);
  const quantidadesCompletas = { ...quantidades };
  for (const [id, q] of Object.entries(porTarifa)) {
    quantidadesCompletas[Number(id)] = (quantidadesCompletas[Number(id)] ?? 0) + q;
  }

  const idsParaPrecificar = [
    ...ingressos.map((i) => i.id),
    ...adicionais.map((i) => i.id),
    ...new Set(recursos.map((r) => r.item_id)),
  ];

  const [orcamento, precos] = datado
    ? await Promise.all([
        simular({
          sourceId: e.sourceId,
          categoryId: e.id,
          entrada: inicio,
          saida: fim,
          quantidades: quantidadesCompletas,
        }),
        precosDoDia({
          sourceId: e.sourceId,
          categoryId: e.id,
          entrada: inicio,
          saida: fim,
          itemIds: idsParaPrecificar,
        }),
      ])
    : [null, {}];

  return (
    <section className="py-8 sm:py-12">
      {e.description && (
        <p className="fora-do-card mb-5 text-sm leading-relaxed text-[var(--c-muted)]">
          {e.description}
        </p>
      )}

      <PassoReserva
        slug={slug}
        nome={e.name}
        diaUnico={e.single_day_only}
        cutoff={e.same_day_cutoff_time}
        janela={janela}
        sourceId={e.sourceId}
        categoryId={e.id}
        ingressos={ingressos}
        adicionais={adicionais}
        grupos={grupos}
        inicial={{
          entrada: selecao.entrada,
          saida: selecao.saida,
          horaEntrada: selecao.horaEntrada,
          horaSaida: selecao.horaSaida,
          quantidades,
          recursos: recursosSel,
        }}
        orcamentoInicial={orcamento}
        precosIniciais={precos}
        recursosIniciais={recursos}
      />
    </section>
  );
}
