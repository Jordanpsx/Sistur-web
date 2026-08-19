"use client";

/**
 * Collapsible section, built on `<details>`.
 *
 * A native element rather than a state hook, for three reasons that matter here:
 * it opens without JavaScript, the browser's find-in-page expands it to reveal a
 * match, and keyboard and screen-reader behaviour come for free. The form still
 * has to work with scripting off, and a section collapsed behind a `useState`
 * would hide items a visitor could never reach.
 *
 * `open` is the initial state only — after that the browser owns it, so a
 * re-render caused by the running total does not slam a section shut while
 * someone is choosing inside it.
 */
export function Acordeao({
  titulo,
  emoji,
  resumo,
  aberto = false,
  destaque = false,
  children,
}: {
  titulo: string;
  emoji?: string;
  /** Linha secundária: contagem de itens, ou o que está escolhido. */
  resumo?: string;
  aberto?: boolean;
  /** Marca visualmente uma seção que já tem item selecionado. */
  destaque?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={aberto}
      className={`group mt-4 overflow-hidden rounded-xl border transition-colors
                  ${destaque
                    ? "border-[var(--c-accent)]"
                    : "border-[var(--c-border)]"}`}
    >
      <summary
        className="flex min-h-[56px] cursor-pointer list-none items-center gap-3
                   px-4 py-3 hover:bg-[var(--c-surface)]
                   [&::-webkit-details-marker]:hidden"
      >
        {emoji && (
          <span aria-hidden="true" className="text-xl">
            {emoji}
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold leading-tight text-[var(--c-fg)]">
            {titulo}
          </span>
          {resumo && (
            <span className="block text-sm text-[var(--c-muted)]">{resumo}</span>
          )}
        </span>

        {/* Gira ao abrir. `group-open` vem do <details>, então acompanha o
            estado real do elemento sem precisar espelhá-lo em React. */}
        <span
          aria-hidden="true"
          className="shrink-0 text-[var(--c-muted)] transition-transform
                     group-open:rotate-180"
        >
          ▾
        </span>
      </summary>

      <div className="border-t border-[var(--c-border)] px-4 py-4">{children}</div>
    </details>
  );
}
