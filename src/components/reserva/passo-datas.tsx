import { hoje, formatarData, diasEntre, type Selecao } from "@/lib/reserva/datas";

/**
 * Step 2 — dates.
 *
 * A plain `<form method="get">`. No client component, no state hook, no
 * `onSubmit`. The browser serialises the fields into the query string and
 * navigates, which gives the resilience requirement almost for free:
 *
 *   - Back and forward are ordinary history entries, so returning to this step
 *     re-renders the previous dates from the URL instead of replaying state.
 *   - A reload, a shared link, or a restored tab all reconstruct the step
 *     exactly, because the URL is the entire input.
 *   - It works before hydration and with JS disabled — the WordPress form lost
 *     everything when its script failed to load on hotel wifi.
 *
 * The cost is a full round trip per submission. That is acceptable here: the
 * route is `force-dynamic` anyway, and correctness under back-navigation was the
 * stated priority over interaction latency.
 */
export function PassoDatas({
  slug,
  diaUnico,
  cutoff,
  selecao,
}: {
  slug: string;
  diaUnico: boolean;
  cutoff?: string | null;
  selecao: Selecao;
}) {
  const min = hoje();
  const noites =
    selecao.completa && selecao.entrada && selecao.saida
      ? diasEntre(selecao.entrada, selecao.saida)
      : 0;

  return (
    <div className="mt-8">
      <ol className="mb-8 flex gap-2 text-xs uppercase tracking-wide">
        <li className="text-[var(--c-muted)]">1. Experiência</li>
        <li className="text-[var(--c-muted)]">›</li>
        <li className="font-semibold text-[var(--c-fg)]">2. Datas</li>
        <li className="text-[var(--c-muted)]">›</li>
        <li className="text-[var(--c-muted)]">3. Ingressos</li>
      </ol>

      <form
        method="get"
        action={`/reservar/${slug}/`}
        className="rounded-lg border border-[var(--c-border)] p-6"
      >
        <div className={diaUnico ? "" : "grid gap-4 sm:grid-cols-2"}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              {diaUnico ? "Data da visita" : "Entrada"}
            </span>
            <input
              type="date"
              name="entrada"
              required
              min={min}
              defaultValue={selecao.entrada ?? ""}
              className="w-full rounded-md border border-[var(--c-border)] px-3 py-2 text-base"
            />
          </label>

          {!diaUnico && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Saída</span>
              <input
                type="date"
                name="saida"
                required
                min={selecao.entrada ?? min}
                defaultValue={selecao.saida ?? ""}
                className="w-full rounded-md border border-[var(--c-border)] px-3 py-2 text-base"
              />
            </label>
          )}
        </div>

        {cutoff && (
          <p className="mt-3 text-xs text-[var(--c-muted)]">
            Reservas para o mesmo dia até às {cutoff}.
          </p>
        )}

        {selecao.erro && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-[#fdecea] px-3 py-2 text-sm text-[#8a1c14]"
          >
            {selecao.erro}
          </p>
        )}

        <button
          type="submit"
          className="mt-6 min-h-[44px] w-full rounded-md bg-[var(--c-primary)] px-6 font-semibold text-[#1a1a1a] sm:w-auto"
        >
          {selecao.completa ? "Alterar datas" : "Continuar"}
        </button>
      </form>

      {selecao.completa && selecao.entrada && (
        <div className="mt-6 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-6">
          <p className="text-sm">
            <strong>{formatarData(selecao.entrada)}</strong>
            {selecao.saida && (
              <>
                {" até "}
                <strong>{formatarData(selecao.saida)}</strong>
                <span className="text-[var(--c-muted)]">
                  {" "}
                  · {noites} {noites === 1 ? "noite" : "noites"}
                </span>
              </>
            )}
          </p>
          <p className="mt-4 text-sm text-[var(--c-muted)]">
            Próxima etapa: escolha dos ingressos.
          </p>
        </div>
      )}
    </div>
  );
}
