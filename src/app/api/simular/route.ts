import { NextResponse } from "next/server";

/**
 * Price preview — proxies to Sistur's `POST /reservas/api/public/simular`.
 *
 * **Why a proxy and not a direct call from the browser.** `SISTUR_API_URL` points
 * at a private network name that a visitor's browser cannot resolve, and giving
 * the ERP a public address just to make it reachable would expose its whole
 * admin surface for the sake of one endpoint.
 *
 * **Why the total is not computed here.** The obvious shortcut is to multiply
 * price by quantity in the client and skip the round trip. That produces the
 * wrong number: Sistur applies a day tier (a Day Use ticket listed at R$ 30,00
 * costs R$ 35,00 on a Sunday), an advance-booking discount, and a service fee.
 * Under CDC Art. 30 the advertised price binds the supplier, so a preview that
 * disagrees with checkout is a liability, not a cosmetic bug — the same reason
 * prices are never stored in the CMS.
 *
 * This endpoint reserves nothing and writes nothing. It is safe to call on every
 * keystroke, and it is deliberately not cached: the answer depends on the date
 * being asked about and on rules an operator can change at any moment.
 */

const API = process.env.SISTUR_API_URL!;

// Bounds the work a single request can ask Sistur to do. The real limit is the
// engine's, this only stops an obviously crafted payload from getting there.
const MAX_LINHAS = 40;
const MAX_QTD = 99;

type Linha = { item_id: number; quantity: number };

export async function POST(req: Request) {
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const { source_id, category_id, check_in_date, check_out_date, items } =
    (corpo ?? {}) as {
    source_id?: unknown;
    category_id?: unknown;
    check_in_date?: unknown;
    check_out_date?: unknown;
    items?: unknown;
  };

  const dataOk = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (
    typeof source_id !== "number" ||
    typeof category_id !== "number" ||
    !dataOk(check_in_date) ||
    !dataOk(check_out_date) ||
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > MAX_LINHAS
  ) {
    return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
  }

  const linhas: Linha[] = [];
  for (const it of items) {
    const { item_id, quantity } = (it ?? {}) as Record<string, unknown>;
    if (
      !Number.isInteger(item_id) ||
      !Number.isInteger(quantity) ||
      (quantity as number) < 1 ||
      (quantity as number) > MAX_QTD
    ) {
      return NextResponse.json({ erro: "Item inválido." }, { status: 400 });
    }
    linhas.push({ item_id: item_id as number, quantity: quantity as number });
  }

  try {
    const res = await fetch(`${API}/reservas/api/public/simular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_id,
        category_id,
        check_in_date,
        check_out_date,
        items: linhas,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    const dados = await res.json().catch(() => null);
    if (!res.ok) {
      // Sistur's message is written for an end user ("ReservaItem 999 not found")
      // only sometimes, so it is not forwarded verbatim.
      return NextResponse.json(
        { erro: "Não foi possível calcular o valor agora." },
        { status: 502 },
      );
    }
    return NextResponse.json(dados, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível calcular o valor agora." },
      { status: 502 },
    );
  }
}
