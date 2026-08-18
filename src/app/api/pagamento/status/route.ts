import { NextResponse } from "next/server";

/**
 * Payment status, for the PIX waiting screen.
 *
 * A PIX charge answers `pending` and clears seconds to minutes later, when
 * Mercado Pago calls Sistur's webhook. The customer has to stay on the page
 * until then, so the page asks here on a timer.
 *
 * Sistur's own `/status/<payment_id>` is public, but the browser cannot reach
 * the private network name — hence this proxy. It reads the reservation's
 * status, which the webhook updates, so it never calls Mercado Pago directly.
 *
 * A 404 means the webhook has not arrived yet. That is normal and is reported
 * as `pending` rather than as an error, so the page keeps waiting instead of
 * telling someone their payment failed while it is merely in flight.
 */

const API = process.env.SISTUR_API_URL!;

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("p") ?? "";
  // Mercado Pago payment ids are numeric; anything else is not worth a round trip.
  if (!/^\d{1,24}$/.test(id)) {
    return NextResponse.json({ erro: "Pagamento inválido." }, { status: 400 });
  }

  try {
    const res = await fetch(`${API}/api/v1/payments/status/${id}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 404) {
      return NextResponse.json(
        { payment_id: id, status: "pending" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!res.ok) throw new Error(String(res.status));

    return NextResponse.json(await res.json(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // Uma falha de rede não é um pagamento recusado. Devolver "pending" mantém
    // a tela esperando em vez de anunciar erro para quem talvez já pagou.
    return NextResponse.json(
      { payment_id: id, status: "pending", indisponivel: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
