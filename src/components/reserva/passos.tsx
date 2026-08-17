/**
 * The numbered step indicator, matching the wizard on the WordPress form.
 *
 * One list drives every step, so a step cannot be added in one place and
 * forgotten in another — the current form's breadcrumb is hand-written per pane
 * and already disagrees with itself between day use and camping.
 *
 * The order is deliberately not WordPress's, which runs
 * *dados pessoais → dados da reserva → confirmação → pagamento*. Two problems
 * with that:
 *
 *   1. It asks for name, CPF, e-mail and phone **first**. A visitor types their
 *      document before learning what the trip costs or whether the date is even
 *      open — the highest-friction field guarding the answer they came for.
 *   2. It separates dates from items, so neither screen can show a price.
 *      Cost depends on both, which is exactly the question being asked.
 *
 * Here the order is: pick the experience, then everything that determines the
 * price on one screen with a live total, then identify yourself, then pay.
 * Effort rises as commitment rises, and no personal data is collected until the
 * visitor has seen the number.
 */

export const PASSOS = [
  "Experiência",
  "Datas e ingressos",
  "Seus dados",
  "Pagamento",
  // Só alcançado quando o pagamento é aprovado. Uma reserva registrada e não
  // paga para na etapa 4, que é a verdade da situação dela.
  "Confirmada",
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
