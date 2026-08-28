import { NextResponse } from "next/server";

/**
 * Payment status, for the PIX waiting screen.
 *
 * A PIX charge answers `pending` and clears seconds to minutes later, when
 * Mercado Pago calls Sistur's webhook. The customer stays on the page until
 * then, so the page asks here on a timer.
 *
 * **Two sources, deliberately.** The payment lookup answers about the Mercado
 * Pago transaction; the reservation answers about the booking. They usually
 * agree, and when they do not the reservation is right — it is what the counter
 * reads and what the customer is actually buying. It also becomes `PAID` however
 * that happened: by webhook, by an operator reprocessing the payment by hand, or
 * at the till. Asking only about the payment id meant a booking marked paid
 * through any other route left the customer staring at a QR code for something
 * already settled, which is exactly what happened in production.
 *
 * A 404 on the payment means the webhook has not arrived yet. That is normal and
 * is reported as `pending`, never as an error: telling someone their payment
 * failed while it is merely in flight is worse than waiting.
 */

const API = process.env.SISTUR_API_URL!;
const CHAVE = process.env.SISTUR_WEB_API_KEY ?? "";

/** Status da reserva — autoritativo, seja qual for o caminho do pagamento. */
async function statusDaReserva(groupId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${API}/api/public/reservas/${encodeURIComponent(groupId)}/pagamento`,
      {
        headers: { "X-Web-Api-Key": CHAVE },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (d.status === "PAID" || d.status === "EM_USO" || d.status === "PARTIALLY_PAID") {
      return "approved";
    }
    if (d.status === "CANCELED") return "rejected";
    return "pending";
  } catch {
    return null;
  }
}

/** Status da transação no Mercado Pago, via Sistur. */
async function statusDoPagamento(id: string): Promise<string | null> {
  try {
    const res = await fetch(`${API}/api/v1/payments/status/${id}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    // 404 = webhook ainda não chegou. Não é falha.
    if (res.status === 404) return "pending";
    if (!res.ok) return null;
    return (await res.json()).status ?? "pending";
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const id = q.get("p") ?? "";
  const groupId = q.get("r") ?? "";

  const idOk = /^\d{1,24}$/.test(id);
  const grupoOk = /^[0-9a-f-]{36}$/i.test(groupId);
  if (!idOk && !grupoOk) {
    return NextResponse.json({ erro: "Pagamento inválido." }, { status: 400 });
  }

  const [porPagamento, porReserva] = await Promise.all([
    idOk ? statusDoPagamento(id) : Promise.resolve(null),
    grupoOk ? statusDaReserva(groupId) : Promise.resolve(null),
  ]);

  // Um "approved" de qualquer das fontes encerra a espera. O contrário não vale:
  // um "pending" não desfaz um "approved" já observado na outra.
  const status =
    porPagamento === "approved" || porReserva === "approved"
      ? "approved"
      : porPagamento === "rejected" || porReserva === "rejected"
        ? "rejected"
        : "pending";

  return NextResponse.json(
    {
      payment_id: id || null,
      status,
      // Sinaliza que nenhuma das fontes respondeu. A tela segue esperando, mas
      // isto aparece no diagnóstico quando alguém reclamar de espera infinita.
      indisponivel: porPagamento === null && porReserva === null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
