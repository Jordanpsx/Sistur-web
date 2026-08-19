"use client";

/**
 * Touch-first quantity control.
 *
 * Replaces `<input type="number">`, whose native spinners are roughly 14px tall
 * on a phone — well under the 44px the project requires of every touch target
 * (`.claude/skills/architecture.md` §4). Missing the arrow and landing on the
 * field brings up the keyboard instead of changing the number.
 *
 * The input stays in the markup and keeps its `name`, so the surrounding
 * `<form method="get">` still submits without JavaScript. It is `readOnly`
 * rather than hidden: a screen reader announces the current value, and the
 * quantity remains visible and selectable.
 */

export function Stepper({
  nome,
  valor,
  onChange,
  max = 99,
  rotulo,
}: {
  nome: string;
  valor: number;
  onChange: (v: number) => void;
  max?: number;
  /** Ex.: "Inteira" — o leitor de tela diz "menos um Inteira". */
  rotulo: string;
}) {
  const vazio = valor === 0;

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, valor - 1))}
        disabled={vazio}
        aria-label={`Remover um ${rotulo}`}
        className="flex h-11 w-11 items-center justify-center rounded-full border
                   border-[var(--c-border)] bg-white text-xl leading-none
                   text-[var(--c-fg)] transition-colors
                   hover:bg-[var(--c-surface)] active:bg-[var(--c-surface)]
                   disabled:cursor-not-allowed disabled:opacity-30"
      >
        −
      </button>

      {/* readOnly, não disabled: um campo desabilitado não é enviado, e o
          formulário precisa dele para funcionar sem JavaScript. */}
      <input
        type="number"
        name={nome}
        value={valor}
        readOnly
        tabIndex={-1}
        aria-label={`Quantidade de ${rotulo}`}
        className={`w-10 border-0 bg-transparent p-0 text-center text-base
                    font-semibold tabular-nums focus:outline-none
                    ${vazio ? "text-[var(--c-muted)]" : "text-[var(--c-fg)]"}`}
      />

      <button
        type="button"
        onClick={() => onChange(Math.min(max, valor + 1))}
        disabled={valor >= max}
        aria-label={`Adicionar um ${rotulo}`}
        className="flex h-11 w-11 items-center justify-center rounded-full
                   bg-[var(--c-accent)] text-xl leading-none text-white
                   transition-colors hover:bg-[var(--c-accent-dark)]
                   disabled:cursor-not-allowed disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
