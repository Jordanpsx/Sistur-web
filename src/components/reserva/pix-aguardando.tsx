"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatarBRL } from "@/lib/reserva/itens";

/**
 * The PIX waiting screen.
 *
 * A PIX charge does not finish when the form is submitted. Mercado Pago answers
 * `pending` with a QR code, and the payment clears seconds to minutes later when
 * its webhook reaches Sistur. So this screen has one job the card flow does not:
 * **stay put and keep the code visible** until the money actually arrives.
 *
 * The first version of the payment step redirected straight to the confirmation
 * page on `pending`, throwing the QR code away. Sistur had created the charge
 * correctly; the customer simply never saw how to pay it.
 *
 * Polling asks our own proxy, which reads the reservation's status — the value
 * the webhook updates. It never calls Mercado Pago from the browser.
 */

export type DadosPix = {
  payment_id: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url?: string;
};

// Rápido o bastante para parecer imediato, espaçado o bastante para não
// martelar o Sistur enquanto alguém abre o app do banco.
const INTERVALO_MS = 4000;
// O Sistur gera o PIX com `date_of_expiration` de 12 minutos, dentro do soft
// lock de 15 — depois disso o código não é mais pagável. Esperamos um pouco
// além para cobrir a compensação de um pagamento feito no limite.
const VALIDADE_MIN = 12;
const LIMITE_MS = (VALIDADE_MIN + 1) * 60 * 1000;

export function PixAguardando({
  dados,
  total,
  groupId,
  slug,
}: {
  dados: DadosPix;
  total: number;
  groupId: string;
  slug: string;
}) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);
  const [desistiu, setDesistiu] = useState(false);
  const inicio = useRef(Date.now());

  useEffect(() => {
    let vivo = true;
    let timer: ReturnType<typeof setTimeout>;

    const perguntar = async () => {
      if (!vivo) return;
      if (Date.now() - inicio.current > LIMITE_MS) {
        setDesistiu(true);
        return;
      }
      try {
        const res = await fetch(
          // Pergunta pelas duas fontes: a transação e a própria reserva. Uma
          // reserva marcada como paga fora do webhook — reprocessada à mão, ou
          // baixada no balcão — precisa encerrar esta espera do mesmo jeito.
          `/api/pagamento/status/?p=${encodeURIComponent(dados.payment_id)}` +
            `&r=${encodeURIComponent(groupId)}`,
          { cache: "no-store" },
        );
        const r = await res.json();
        if (!vivo) return;
        if (r.status === "approved") {
          router.push(`/reservar/${slug}/confirmacao/?r=${groupId}&s=approved`);
          return;
        }
        if (r.status === "rejected") {
          router.push(`/reservar/${slug}/confirmacao/?r=${groupId}&s=rejected`);
          return;
        }
      } catch {
        // Silencioso de propósito: uma falha de rede não é recusa, e a próxima
        // tentativa acontece em segundos.
      }
      timer = setTimeout(perguntar, INTERVALO_MS);
    };

    timer = setTimeout(perguntar, INTERVALO_MS);
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, [dados.payment_id, groupId, slug, router]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(dados.qr_code);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Clipboard bloqueado (contexto inseguro, permissão negada). O código
      // continua visível e selecionável no <textarea> abaixo.
    }
  };

  return (
    <div>
      <div className="f-info" style={{ borderLeftColor: "var(--f-info-bar)" }}>
        <strong>Pague com PIX para confirmar</strong>
        <p>
          Abra o app do seu banco, escaneie o código e conclua o pagamento. Mantenha esta
          página aberta — ela confirma sozinha assim que o pagamento cair. O código vale
          por {VALIDADE_MIN} minutos.
        </p>
      </div>

      <p className="f-total-data" style={{ textAlign: "center", fontSize: "1.25rem" }}>
        <strong>{formatarBRL(total)}</strong>
      </p>

      {dados.qr_code_base64 && (
        <div className="pix-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${dados.qr_code_base64}`}
            alt="QR Code do PIX"
            width={260}
            height={260}
          />
        </div>
      )}

      <label className="f-label" htmlFor="pix-codigo" style={{ marginTop: "1.25rem" }}>
        Ou copie o código PIX
      </label>
      <textarea
        id="pix-codigo"
        className="f-input pix-codigo"
        readOnly
        rows={3}
        value={dados.qr_code}
        onFocus={(e) => e.currentTarget.select()}
      />

      <button type="button" className="f-btn f-btn--ir pix-copiar" onClick={copiar}>
        {copiado ? "Código copiado ✓" : "Copiar código PIX"}
      </button>

      {desistiu ? (
        <p role="alert" className="f-erro">
          O código PIX expirou e não recebemos a confirmação. Se você já pagou, entre em
          contato com o código da sua reserva — <strong>não pague de novo</strong>. Caso
          contrário, refaça a reserva.
        </p>
      ) : (
        <p className="pix-esperando" aria-live="polite">
          <span className="pix-pulso" aria-hidden="true" />
          Aguardando a confirmação do pagamento…
        </p>
      )}

      {dados.ticket_url && (
        <p className="f-hint" style={{ marginTop: "0.75rem" }}>
          <a href={dados.ticket_url} target="_blank" rel="noopener noreferrer">
            Abrir comprovante no Mercado Pago
          </a>
        </p>
      )}
    </div>
  );
}
