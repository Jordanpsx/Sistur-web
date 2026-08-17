import { NextResponse } from "next/server";

/**
 * Payment proxy — hands the Mercado Pago Brick's payload to Sistur.
 *
 * Three things this exists to keep off the browser:
 *
 *   1. **`QR_SERVICE_TOKEN`.** Sistur's `/api/v1/payments/process` is Bearer
 *      authenticated. Shipping that token to the client would let anyone charge
 *      any reservation.
 *   2. **The amount.** The Brick reports what it collected, but the charge uses
 *      the total Sistur has stored for the reservation. A tampered request
 *      cannot pay R$ 1,00 for a R$ 500,00 booking, because the number in the
 *      request body is discarded here.
 *   3. **The payer.** Name, CPF and e-mail come from the reservation, not from
 *      the page. The browser never receives them, so the reservation code in the
 *      URL does not leak a stranger's data.
 *
 * The card token itself is generated *inside* the Brick, against Mercado Pago
 * directly — card numbers never touch this server, which is the entire point of
 * using Bricks rather than a hand-rolled form.
 */

const API = process.env.SISTUR_API_URL!;
const CHAVE_WEB = process.env.SISTUR_WEB_API_KEY ?? "";
const TOKEN_INTERNO = process.env.SISTUR_INTERNAL_TOKEN ?? "";

type DadosPagamento = {
  reserva_id: number;
  status: string;
  total: number;
  expirada: boolean;
  payer: Record<string, unknown>;
};

async function obterReserva(groupId: string): Promise<DadosPagamento | null> {
  const res = await fetch(
    `${API}/api/public/reservas/${encodeURIComponent(groupId)}/pagamento`,
    { headers: { "X-Web-Api-Key": CHAVE_WEB }, cache: "no-store" },
  );
  return res.ok ? res.json() : null;
}

export async function POST(req: Request) {
  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const groupId = String(corpo.group_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) {
    return NextResponse.json({ erro: "Reserva inválida." }, { status: 400 });
  }

  const reserva = await obterReserva(groupId);
  if (!reserva) {
    return NextResponse.json({ erro: "Reserva não encontrada." }, { status: 404 });
  }

  // Checked here rather than trusted from the page: the page was rendered at
  // some earlier moment, and the hold may have lapsed since.
  if (reserva.expirada) {
    return NextResponse.json(
      { erro: "O prazo desta reserva expirou. Refaça a reserva." },
      { status: 409 },
    );
  }
  if (reserva.status !== "PENDING") {
    return NextResponse.json(
      { erro: "Esta reserva não está aguardando pagamento." },
      { status: 409 },
    );
  }

  const formData = (corpo.formData ?? {}) as Record<string, unknown>;
  const metodo = String(
    corpo.payment_method_id ?? formData.payment_method_id ?? "",
  );
  if (!metodo) {
    return NextResponse.json({ erro: "Escolha uma forma de pagamento." }, { status: 400 });
  }

  try {
    const res = await fetch(`${API}/api/v1/payments/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN_INTERNO}`,
      },
      cache: "no-store",
      // Card tokenisation can be slow on a bad connection, and giving up early
      // would leave a charge in flight with nobody watching it.
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        reserva_id: reserva.reserva_id,
        // From Sistur, never from the request. See the note above.
        transaction_amount: reserva.total,
        payer: reserva.payer,
        payment_method_id: metodo,
        token: formData.token,
        installments: formData.installments,
        issuer_id: formData.issuer_id,
      }),
    });

    const dados = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { erro: dados?.erro || "Não foi possível processar o pagamento." },
        { status: res.status === 400 ? 400 : 502 },
      );
    }
    return NextResponse.json(dados, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { erro: "Não conseguimos falar com o sistema de pagamentos. Tente novamente." },
      { status: 502 },
    );
  }
}
