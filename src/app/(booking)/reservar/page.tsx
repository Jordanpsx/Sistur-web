import Link from "next/link";
import type { Metadata } from "next";
import { getExperiencias } from "@/lib/sistur/catalog";

/**
 * Step 1 — choose the experience.
 *
 * The WordPress site needed this screen for a reason worth preserving: both
 * forms used to load at once, which broke things, and customers started filling
 * one believing they were in the other. Here the separation is structural rather
 * than a workaround — each experience is its own route, so only one form ever
 * exists on the page.
 *
 * The options come from Sistur. Hardcoding "Day Use" and "Camping" would already
 * be wrong: Enoturismo exists at the Vinhedo, and anything added later would be
 * invisible until someone edited this file.
 *
 * Rendered on the server with no client state, so a back-navigation to this
 * screen is an ordinary page load and cannot land in a half-filled condition.
 */

/**
 * Never cached and never prerendered. §3.1 assigns the booking group
 * force-dynamic because availability and price must not be served stale — and
 * it also means the build does not need Sistur reachable, which the Docker
 * builder is not.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Faça sua reserva",
  description: "Escolha a experiência: day use, camping ou enoturismo.",
};

export default async function EscolherExperiencia() {
  const experiencias = await getExperiencias();

  if (experiencias.length === 0) {
    return (
      <section className="py-20 text-center">
        <h1 className="sec-title mb-6 text-3xl">Faça sua reserva</h1>
        <p className="text-[var(--c-muted)]">
          Nenhuma experiência disponível no momento. Tente novamente em instantes.
        </p>
      </section>
    );
  }

  return (
    <section className="py-14">
      <h1 className="sec-title mb-4 text-3xl sm:text-4xl">Faça sua reserva</h1>
      <p className="mb-10 text-center text-lg font-semibold uppercase text-[var(--c-fg)]">
        Escolha a opção de reserva que deseja
      </p>

      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {experiencias.map((e) => (
          <li
            key={e.slug}
            className="flex flex-col rounded-lg bg-[var(--c-bg)] p-7 shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
          >
            <h2 className="text-center text-lg uppercase text-[var(--c-fg)]">
              {e.name}
            </h2>
            <p className="mt-1 text-center text-xs uppercase tracking-wide text-[var(--c-muted)]">
              {e.venue}
            </p>

            <div className="mt-5 flex-1 rounded-md border-l-4 border-[#2f6fd0] bg-[#eef4fb] p-4">
              <p className="text-sm leading-relaxed text-[var(--c-fg)]">
                {e.description ?? "Detalhes desta experiência em breve."}
              </p>
              <p className="mt-3 text-xs text-[var(--c-muted)]">
                {e.single_day_only
                  ? "Reserva para um único dia."
                  : "Permite reserva com mais de um dia."}
              </p>
            </div>

            <Link
              href={`/reservar/${e.slug}/`}
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--c-accent)] px-6 text-sm font-semibold text-[var(--c-on-accent)] transition-colors hover:bg-[var(--c-accent-dark)]"
            >
              Selecionar {e.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
