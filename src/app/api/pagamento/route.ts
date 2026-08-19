import { NextResponse } from "next/server";
import { chavesDe, montarPayer } from "@/lib/reserva/pagador";

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
 *   3. **The reservation's identity.** Name and CPF are never sent to the page,
 *      so a reservation code in a URL does not leak a stranger's data. The payer
 *      Mercado Pago is told about is the one the Brick collected — see
 *      `montarPayer` for why those are different things.
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
  payer: import("@/lib/reserva/pagador").Payer;
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

  // Nomes dos campos recebidos, nunca os valores. Não havia registro nenhum do
  // que o Brick manda de fato — o formato era conhecido por documentação, não
  // por observação. Isto responde isso sem colocar CPF ou e-mail em log.
  //
  // Antes do try de propósito: uma falha de rede não pode apagar o rastro de
  // que a tentativa chegou até aqui.
  console.info(
    "[pagamento] metodo=%s formData=%o payer=%o",
    metodo,
    chavesDe(formData),
    chavesDe((formData as { payer?: unknown }).payer),
  );

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
        // From Sistur, never from the request. This is the field that guards the
        // charge, and the reason a tampered payer costs us nothing.
        transaction_amount: reserva.total,
        // Quem pagou, coletado pelo Brick, com o da reserva cobrindo o que
        // faltar. Mandar o da reserva fazia o token nascer com um CPF e a
        // cobrança sair com outro.
        payer: montarPayer((formData as { payer?: unknown }).payer, reserva.payer),
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
