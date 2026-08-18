import Link from "next/link";
import type { Metadata } from "next";
import { Passos } from "@/components/reserva/passos";

/**
 * The end of the funnel.
 *
 * Mercado Pago answers with one of three outcomes, and this page must not
 * flatten them into "thank you". A PIX charge is `pending` until the transfer
 * clears, and a card can be rejected — telling someone their booking is
 * confirmed when it is not costs them a trip.
 *
 * The status is re-read from Sistur rather than trusted from the query string,
 * so editing `?s=approved` in the address bar does not produce a page claiming
 * payment. It shows only the code and the outcome: the reservation code travels
 * in the URL, so anything printed here is readable by anyone holding the link.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sua reserva",
  robots: { index: false, follow: false },
};

const API = process.env.SISTUR_API_URL!;
const CHAVE = process.env.SISTUR_WEB_API_KEY ?? "";

async function obterStatus(groupId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${API}/api/public/reservas/${encodeURIComponent(groupId)}/pagamento`,
      { headers: { "X-Web-Api-Key": CHAVE }, cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()).status ?? null;
  } catch {
    return null;
  }
}

export default async function Confirmacao({
  params,
  searchParams,
}: {
  params: Promise<{ experiencia: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const slug = (await params).experiencia;
  const sp = await searchParams;
  const um = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const codigo = um("r");
  // `?s=` is only a hint about which message to prepare; the authority is the
  // reservation's own status, fetched below.
  const sugerido = um("s");
  const status = codigo ? await obterStatus(codigo) : null;

  const pago = status === "PAID" || status === "EM_USO" || status === "PARTIALLY_PAID";
  const aguardando = !pago && (sugerido === "pending" || sugerido === "in_process");

  return (
    <section className="py-8 sm:py-12">
      <div className="f-card">
        <div className="f-head">
          <h1>{pago ? "Reserva confirmada" : "Reserva registrada"}</h1>
          <p>Guarde o código abaixo</p>
          <Passos atual={pago ? 5 : 4} />
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

          {pago ? (
            <div className="f-info" style={{ borderLeftColor: "var(--c-accent)" }}>
              <strong style={{ color: "var(--c-accent-dark)" }}>Pagamento aprovado</strong>
              {/* Sem instrução de apresentar o código na entrada — a portaria
                  não o pede. Mandar guardar algo que ninguém vai cobrar cria uma
                  exigência inexistente e preocupa quem perder o print. */}
              <p>Sua reserva está confirmada.</p>
            </div>
          ) : aguardando ? (
            <div className="f-info">
              <strong>Aguardando confirmação do pagamento</strong>
              <p>
                O PIX pode levar alguns instantes para compensar. Assim que o
                Mercado Pago confirmar, sua reserva é liberada automaticamente —
                não é preciso pagar de novo.
              </p>
            </div>
          ) : (
            <div className="f-info" style={{ borderLeftColor: "var(--f-step-now)" }}>
              <strong style={{ color: "var(--f-err-fg)" }}>Ainda não está paga</strong>
              <p>
                Sua vaga fica reservada por 15 minutos. Depois disso ela volta a
                ficar disponível para outras pessoas.
              </p>
            </div>
          )}

          <div className="f-nav">
            {!pago && !aguardando && codigo && (
              <Link
                className="f-btn f-btn--ir"
                href={`/reservar/${slug}/pagamento/?r=${codigo}`}
              >
                Pagar agora →
              </Link>
            )}
            <Link className="f-btn f-btn--voltar" href="/">
              ← Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
