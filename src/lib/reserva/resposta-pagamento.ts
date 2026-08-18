/**
 * Interprets Mercado Pago's answer to a charge.
 *
 * Pulled out of the Brick component so it can be tested. The bug that made this
 * necessary: the component redirected to the confirmation page on any successful
 * response, which threw away the PIX QR code. Sistur had created the charge
 * correctly and the customer simply never saw how to pay it.
 *
 * The distinction is not "approved versus not". It is **is there anything left
 * for the customer to do here**:
 *
 *   - PIX answers `pending` with a QR code → stay, show it, wait.
 *   - A card answers `approved` or `rejected` → the outcome is final, move on.
 *
 * Presence of the QR code decides it, not the status string. A PIX is always
 * pending at this moment, and treating `pending` alone as "stay" would also trap
 * a card sitting in manual review, where there is nothing to show.
 */

export type RespostaPagamento = {
  payment_id?: string | number;
  status?: string;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
};

export type Desfecho =
  | { tipo: "pix"; payment_id: string; qr_code: string; qr_code_base64: string; ticket_url?: string }
  | { tipo: "final"; payment_id: string; status: string };

export function interpretarResposta(dados: RespostaPagamento | null): Desfecho {
  const payment_id = String(dados?.payment_id ?? "");

  const qr_code = String(dados?.qr_code ?? "");
  const qr_code_base64 = String(dados?.qr_code_base64 ?? "");

  // Qualquer um dos dois basta: o código copia-e-cola sozinho já permite pagar,
  // e a imagem sozinha também. Exigir os dois deixaria o cliente sem saída se o
  // Mercado Pago devolvesse só um.
  if (qr_code || qr_code_base64) {
    return {
      tipo: "pix",
      payment_id,
      qr_code,
      qr_code_base64,
      ticket_url: dados?.ticket_url || undefined,
    };
  }

  return { tipo: "final", payment_id, status: String(dados?.status ?? "") };
}
