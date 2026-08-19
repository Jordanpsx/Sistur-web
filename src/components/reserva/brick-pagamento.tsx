"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatarBRL } from "@/lib/reserva/itens";
import { PixAguardando, type DadosPix } from "./pix-aguardando";
import { interpretarResposta } from "@/lib/reserva/resposta-pagamento";

/**
 * Mercado Pago Payment Brick.
 *
 * The Brick renders Mercado Pago's own card form inside an iframe and tokenises
 * the card **against Mercado Pago directly**. Card numbers never reach this
 * page's JavaScript, this server, or Sistur — only a single-use token does. That
 * is the reason for using Bricks instead of building the form, and it is what
 * keeps PCI scope off our side.
 *
 * What arrives here is `formData` with a token; it goes to `/api/pagamento/`,
 * which attaches the amount and the payer from the reservation. Neither is read
 * from this component, so tampering with the page cannot change what is charged
 * or who is charged.
 */

declare global {
  interface Window {
    MercadoPago?: new (
      chave: string,
      opcoes?: { locale?: string },
    ) => {
      bricks: () => {
        create: (
          tipo: string,
          container: string,
          config: unknown,
        ) => Promise<{ unmount: () => void }>;
      };
    };
  }
}

const SDK = "https://sdk.mercadopago.com/js/v2";

/** Loads the SDK once, even across remounts in development. */
function carregarSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve();
  const existente = document.querySelector<HTMLScriptElement>(`script[src="${SDK}"]`);
  if (existente) {
    return new Promise((ok, falha) => {
      existente.addEventListener("load", () => ok());
      existente.addEventListener("error", () => falha(new Error("sdk")));
    });
  }
  return new Promise((ok, falha) => {
    const s = document.createElement("script");
    s.src = SDK;
    s.onload = () => ok();
    s.onerror = () => falha(new Error("sdk"));
    document.head.appendChild(s);
  });
}

export function BrickPagamento({
  publicKey,
  groupId,
  slug,
  total,
  email,
}: {
  publicKey: string;
  groupId: string;
  slug: string;
  total: number;
  email: string;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  // Quando preenchido, o Brick sai de cena e o painel do PIX assume. Um PIX não
  // termina no submit: o Mercado Pago devolve `pending` com um QR code, e o
  // cliente precisa continuar nesta tela até o pagamento cair.
  const [pix, setPix] = useState<DadosPix | null>(null);
  // React 18 mounts effects twice in development; without this the Brick is
  // created twice in the same container and the second one renders empty.
  const montado = useRef(false);

  useEffect(() => {
    if (montado.current) return;
    montado.current = true;

    let brick: { unmount: () => void } | null = null;
    let vivo = true;

    (async () => {
      try {
        await carregarSdk();
        if (!vivo || !window.MercadoPago) return;

        const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        brick = await mp.bricks().create("payment", "brick-pagamento", {
          initialization: {
            amount: total,
            payer: {
              email,
              // O Brick avisa "entityType only receives individual or
              // association" quando o campo não vem. Todo cliente do site é
              // pessoa física — a criação da reserva valida CPF por dígito
              // verificador e recusa CNPJ —, então o valor é constante.
              entityType: "individual",
            },
          },
          customization: {
            paymentMethods: {
              creditCard: "all",
              debitCard: "all",
              bankTransfer: "all", // PIX
            },
            visual: { style: { theme: "default" } },
          },
          callbacks: {
            onReady: () => vivo && setCarregando(false),
            onError: (e: { message?: string }) => {
              if (!vivo) return;
              setErro(e?.message || "Não foi possível carregar o pagamento.");
              setCarregando(false);
            },
            onSubmit: async ({ formData }: { formData: Record<string, unknown> }) => {
              setErro(null);
              const res = await fetch("/api/pagamento/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  group_id: groupId,
                  payment_method_id: formData.payment_method_id,
                  formData,
                }),
              });
              const dados = await res.json().catch(() => null);

              if (!res.ok) {
                setErro(dados?.erro || "Não foi possível concluir o pagamento.");
                // Rejecting keeps the Brick's own error state consistent; it
                // re-enables its button instead of freezing on "processing".
                throw new Error(dados?.erro || "falha");
              }

              const desfecho = interpretarResposta(dados);

              // PIX: mostrar o código e esperar. A primeira versão redirecionava
              // aqui em `pending` e jogava o QR code fora — o Sistur criava a
              // cobrança certinha e o cliente nunca via como pagá-la.
              if (desfecho.tipo === "pix") {
                // Desmontar ANTES de trocar de tela: o painel do PIX substitui
                // este componente, e o React removeria a div onde o SDK do
                // Mercado Pago ainda mantém o iframe montado.
                brick?.unmount();
                brick = null;
                setPix(desfecho);
                return;
              }

              // Cartão: o desfecho já é definitivo, aprovado ou recusado.
              const p = new URLSearchParams({ r: groupId });
              if (desfecho.status) p.set("s", desfecho.status);
              if (desfecho.payment_id) p.set("p", desfecho.payment_id);
              router.push(`/reservar/${slug}/confirmacao/?${p}`);
            },
          },
        });
      } catch {
        if (vivo) {
          setErro(
            "Não foi possível carregar o formulário de pagamento. " +
              "Recarregue a página ou entre em contato.",
          );
          setCarregando(false);
        }
      }
    })();

    return () => {
      vivo = false;
      brick?.unmount();
    };
  }, [publicKey, groupId, slug, total, email, router]);

  if (pix) {
    return <PixAguardando dados={pix} total={total} groupId={groupId} slug={slug} />;
  }

  return (
    <div>
      <p className="f-total-data" style={{ marginBottom: "1rem" }}>
        Total a pagar: <strong>{formatarBRL(total)}</strong>
      </p>

      {carregando && !erro && (
        <p className="f-hint">Carregando as formas de pagamento…</p>
      )}
      {erro && (
        <p role="alert" className="f-erro">
          {erro}
        </p>
      )}

      <div id="brick-pagamento" />
    </div>
  );
}
