/**
 * Who Mercado Pago is told paid.
 *
 * The proxy used to discard whatever the Brick collected and send the
 * reservation's holder instead. That made the card token and the charge carry
 * different documents: the token is created with the CPF typed into the Brick,
 * and the payment went out with the CPF on the booking.
 *
 * They are not the same thing. The booking's CPF is who walks in; Mercado Pago's
 * `payer` is who pays, and a mother paying for her son's day is ordinary. Sending
 * what the Brick collected makes both records true, and removes the mismatch.
 *
 * Prefilling the booking's CPF into the Brick would not have fixed it — it would
 * only move the mismatch inside, tokenising the mother's card against the son's
 * document.
 *
 * **What is still not trusted from the browser:** the amount. That comes from the
 * stored reservation and never from the request, which is what actually guards
 * the charge. A tampered payer means paying with your own card under someone
 * else's name — no loss to us, and Mercado Pago's own anti-fraud is the layer
 * that cares.
 */

export type Payer = {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  identification?: { type?: string | null; number?: string | null } | null;
};

const texto = (v: unknown, max: number): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
};

/**
 * Builds the payer to send, preferring what the Brick collected and falling back
 * to the reservation field by field.
 *
 * Only known keys survive: the Brick's payload is rebuilt rather than spread, so
 * an edited page cannot inject extra fields into the Mercado Pago request.
 *
 * The fallback is per-field, not all-or-nothing. PIX and card collect different
 * subsets, and a charge with no payer e-mail is refused — so a missing piece
 * borrows from the booking instead of dropping the payment.
 */
export function montarPayer(doBrick: unknown, daReserva: Payer): Payer {
  const b = (doBrick ?? {}) as Payer;
  const bi = (b.identification ?? {}) as { type?: unknown; number?: unknown };
  const ri = (daReserva.identification ?? {}) as { type?: unknown; number?: unknown };

  // Só dígitos: o Brick devolve o CPF formatado e o Mercado Pago espera cru.
  const digitos = (v: unknown) => {
    const s = typeof v === "string" ? v.replace(/\D/g, "") : "";
    return s || undefined;
  };

  const numero = digitos(bi.number) ?? digitos(ri.number);
  const tipo = texto(bi.type, 10) ?? texto(ri.type, 10) ?? (numero ? "CPF" : undefined);

  return {
    email: texto(b.email, 254) ?? texto(daReserva.email, 254),
    first_name: texto(b.first_name, 100) ?? texto(daReserva.first_name, 100),
    last_name: texto(b.last_name, 100) ?? texto(daReserva.last_name, 100),
    identification: numero ? { type: tipo, number: numero } : undefined,
  };
}

/**
 * Field names present in a payload, for the log — never the values.
 *
 * We had no record of what the Brick actually sends, so the shape was known from
 * documentation rather than from observation. Keys alone answer that without
 * putting a CPF or an e-mail in a log file.
 */
export function chavesDe(o: unknown): string[] {
  if (!o || typeof o !== "object") return [];
  return Object.keys(o as Record<string, unknown>).sort();
}
