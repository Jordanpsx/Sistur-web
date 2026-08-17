import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getExperiencia } from "@/lib/sistur/catalog";
import { validarSelecao } from "@/lib/reserva/datas";
import { lerQuantidades, simular } from "@/lib/reserva/itens";
import { PassoDados } from "@/components/reserva/passo-dados";

/**
 * Step 3 — the customer's details.
 *
 * Reached only with a complete selection. Anything missing sends the visitor
 * back to step 2 rather than rendering a form that cannot succeed: arriving here
 * with no dates means a stale bookmark or a hand-edited URL, and a redirect is
 * both kinder and shorter than an error.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seus dados",
  // Never indexed. This page carries no personal data in its URL, but it is a
  // funnel step and has no business appearing in search results.
  robots: { index: false, follow: false },
};

type Params = { experiencia: string };
type Search = Record<string, string | string[] | undefined>;

export default async function DadosDoCliente({
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
  const um = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const selecao = validarSelecao(um("entrada"), um("saida"), {
    diaUnico: e.single_day_only,
    cutoff: e.same_day_cutoff_time,
  });
  const quantidades = lerQuantidades(sp);

  // The same two conditions step 2's button enforces. Checked again here because
  // a URL is not a promise: the button being disabled proves nothing about how
  // this page was reached.
  if (!selecao.completa || !selecao.entrada || Object.keys(quantidades).length === 0) {
    const p = new URLSearchParams(
      Object.entries(sp).flatMap(([k, v]) =>
        typeof v === "string" ? [[k, v] as [string, string]] : [],
      ),
    );
    redirect(`/reservar/${slug}/${p.toString() ? `?${p}` : ""}`);
  }

  const entrada = selecao.entrada;
  const saida = e.single_day_only ? entrada : selecao.saida!;
  const orcamento = await simular({
    sourceId: e.sourceId,
    categoryId: e.id,
    entrada,
    saida,
    quantidades,
  });

  return (
    <section className="py-8 sm:py-12">
      <PassoDados
        slug={slug}
        nome={e.name}
        sourceId={e.sourceId}
        categoryId={e.id}
        entrada={entrada}
        saida={selecao.saida}
        diaUnico={e.single_day_only}
        quantidades={quantidades}
        orcamento={orcamento}
      />
    </section>
  );
}
