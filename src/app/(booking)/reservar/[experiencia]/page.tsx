import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getExperiencia } from "@/lib/sistur/catalog";

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
 *      will live in `searchParams`. A step can therefore render from the URL
 *      alone — on a cold load, after a cache eviction, or when someone pastes
 *      the link tomorrow.
 *   2. Nothing is held in memory between steps except the customer's personal
 *      data, which must never enter a URL. Going back is an ordinary navigation
 *      rather than a state rewind, so there is no half-updated state to corrupt.
 *
 * Steps 2 onward (dates, items, customer, review, payment) are not built yet.
 */

// Never cached, never prerendered — see §3.1 and the note on the selector.
export const dynamic = "force-dynamic";

type Params = { experiencia: string };

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
}: {
  params: Promise<Params>;
}) {
  const slug = (await params).experiencia;
  const e = await getExperiencia(slug);
  if (!e) notFound();

  return (
    <section className="py-14">
      <nav className="mb-8 text-sm">
        <Link href="/reservar/" className="text-[var(--c-muted)] hover:underline">
          ← Voltar para a seleção
        </Link>
      </nav>

      <h1 className="text-2xl uppercase text-[var(--c-fg)] sm:text-3xl">
        {e.name}
      </h1>
      <p className="mt-1 text-xs uppercase tracking-wide text-[var(--c-muted)]">
        {e.venue}
      </p>

      {e.description && (
        <div className="mt-6 rounded-md border-l-4 border-[#2f6fd0] bg-[#eef4fb] p-4">
          <p className="text-sm leading-relaxed">{e.description}</p>
        </div>
      )}

      <div className="mt-10 rounded-lg border border-dashed border-[var(--c-border)] p-8 text-center">
        <p className="text-sm text-[var(--c-muted)]">
          Próxima etapa: escolha de{" "}
          {e.single_day_only ? "data" : "datas de entrada e saída"}.
        </p>
        <p className="mt-2 text-xs text-[var(--c-muted)]">
          Experiência {e.slug} · categoria {e.id} · venue {e.sourceId}
          {e.same_day_cutoff_time
            ? ` · corte para o mesmo dia às ${e.same_day_cutoff_time}`
            : ""}
        </p>
      </div>
    </section>
  );
}
