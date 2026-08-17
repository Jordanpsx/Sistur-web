import Link from "next/link";
import type { Metadata } from "next";
import { Passos } from "@/components/reserva/passos";

/**
 * Step 4 — placeholder while payment is not built.
 *
 * The reservation already exists in Sistur as `PENDING` by the time this
 * renders, so the page must say so plainly. Showing a cheerful "all done"
 * would be false: nothing is paid, and the hold lapses.
 *
 * It deliberately shows **only the reservation code**. The `?r=` parameter is
 * an opaque UUID, so anyone with the link could otherwise read a stranger's
 * name, CPF and phone — which is exactly the failure mode of the WordPress
 * lookup endpoint this migration is meant to retire. Displaying the customer's
 * own data here would need the customer to prove who they are first.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reserva registrada",
  robots: { index: false, follow: false },
};

export default async function Confirmacao({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const bruto = sp.r;
  const codigo = Array.isArray(bruto) ? bruto[0] : bruto;

  return (
    <section className="py-8 sm:py-12">
      <div className="f-card">
        <div className="f-head">
          <h1>Reserva registrada</h1>
          <p>Guarde o código abaixo</p>
          <Passos atual={4} />
        </div>

        <div className="f-body">
          {codigo && (
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "1.125rem",
                wordBreak: "break-all",
                padding: "0.75rem",
                borderRadius: "6px",
                background: "var(--c-surface)",
                border: "1px solid var(--c-border)",
              }}
            >
              {codigo}
            </p>
          )}

          <div className="f-info" style={{ borderLeftColor: "var(--f-step-now)" }}>
            <strong style={{ color: "var(--f-err-fg)" }}>Ainda não está paga</strong>
            <p>
              O pagamento online ainda não está disponível nesta página. Sua vaga
              fica reservada por 15 minutos — depois disso ela volta a ficar
              disponível para outras pessoas. Entre em contato para concluir.
            </p>
          </div>

          <div className="f-nav">
            <Link className="f-btn f-btn--voltar" href="/">
              ← Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
