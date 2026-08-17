/**
 * The numbered step indicator, matching the wizard on the WordPress form.
 *
 * One list drives every step, so a step cannot be added in one place and
 * forgotten in another — the current form's breadcrumb is hand-written per pane
 * and already disagrees with itself between day use and camping.
 *
 * The order differs from WordPress on purpose. There, step 1 asks for name, CPF,
 * e-mail and phone, and dates only come at step 2 — so a visitor types their
 * document before finding out whether the date is even available. Here dates
 * come first and personal data last, right before payment.
 */

export const PASSOS = [
  "Experiência",
  "Datas",
  "Ingressos",
  "Seus dados",
  "Pagamento",
] as const;

export function Passos({ atual }: { atual: number }) {
  return (
    <ol className="f-steps">
      {PASSOS.map((titulo, i) => {
        const n = i + 1;
        const estado = n === atual ? "atual" : n < atual ? "feito" : "futuro";
        return (
          <li
            key={titulo}
            className="f-step"
            data-estado={estado}
            aria-current={estado === "atual" ? "step" : undefined}
          >
            {/* A completed step reads as a tick; the number stays in the label
                for screen readers, which would otherwise hear only "✓". */}
            <span className="f-step-n" aria-hidden="true">
              {estado === "feito" ? "✓" : n}
            </span>
            <span className="f-step-t">
              <span className="sr-only">{`Etapa ${n}: `}</span>
              {titulo}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
