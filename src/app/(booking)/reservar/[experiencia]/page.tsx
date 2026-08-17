import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getExperiencia } from "@/lib/sistur/catalog";
import { validarSelecao } from "@/lib/reserva/datas";
import { PassoDatas } from "@/components/reserva/passo-datas";

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
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const slug = (await params).experiencia;
  const e = await getExperiencia(slug);
  if (!e) notFound();

  // Only the first value is read: `?entrada=a&entrada=b` is either a crafted URL
  // or a stale link, and picking one deterministically beats rejecting it.
  const sp = await searchParams;
  const um = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const selecao = validarSelecao(um("entrada"), um("saida"), {
    diaUnico: e.single_day_only,
    cutoff: e.same_day_cutoff_time,
  });

  return (
    <section className="py-8 sm:py-12">
      {/* The experience description belongs above the card, not inside it: the
          card is the form, and mixing marketing copy into it is what makes the
          current page read as two things stacked. */}
      {e.description && (
        <p className="mb-5 text-sm leading-relaxed text-[var(--c-muted)]">
          {e.description}
        </p>
      )}

      <PassoDatas
        slug={slug}
        nome={e.name}
        diaUnico={e.single_day_only}
        cutoff={e.same_day_cutoff_time}
        selecao={selecao}
      />
    </section>
  );
}
