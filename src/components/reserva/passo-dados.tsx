"use client";

import { useActionState } from "react";
import Link from "next/link";
import { criarReserva, type EstadoCriacao } from "@/lib/reserva/criar";
import { formatarBRL, type Orcamento, type Quantidades } from "@/lib/reserva/itens";
import { formatarData } from "@/lib/reserva/datas";
import { Passos } from "./passos";

/**
 * Step 3 — who is booking.
 *
 * The selection from step 2 rides along as hidden inputs rather than being
 * re-read from the URL by the action. Same values, but this way the submitted
 * reservation is exactly what the visitor had on screen when they pressed the
 * button, even if the URL were edited in another tab.
 *
 * No masking library. `inputMode` and `autoComplete` give the right keyboard and
 * the browser's own autofill, which is worth more to a person on a phone than a
 * formatted CPF; Sistur validates the check digits regardless.
 */
export function PassoDados({
  slug,
  nome,
  sourceId,
  categoryId,
  entrada,
  saida,
  diaUnico,
  quantidades,
  orcamento,
}: {
  slug: string;
  nome: string;
  sourceId: number;
  categoryId: number;
  entrada: string;
  saida?: string;
  diaUnico: boolean;
  quantidades: Quantidades;
  orcamento: Orcamento | null;
}) {
  const [estado, acao, enviando] = useActionState<EstadoCriacao, FormData>(
    criarReserva,
    {},
  );

  const voltar = (() => {
    const p = new URLSearchParams();
    p.set("entrada", entrada);
    if (saida && !diaUnico) p.set("saida", saida);
    for (const [id, q] of Object.entries(quantidades)) p.set(`i${id}`, String(q));
    return `/reservar/${slug}/?${p}`;
  })();

  return (
    <div className="f-card">
      <div className="f-head">
        <h1>Reserva {nome}</h1>
        <p>Falta pouco — só precisamos saber quem vai</p>
        <Passos atual={3} />
      </div>

      <form className="f-body" action={acao}>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="source_id" value={sourceId} />
        <input type="hidden" name="category_id" value={categoryId} />
        <input type="hidden" name="entrada" value={entrada} />
        {saida && !diaUnico && <input type="hidden" name="saida" value={saida} />}
        {Object.entries(quantidades).map(([id, q]) => (
          <input key={id} type="hidden" name={`i${id}`} value={q} />
        ))}

        <h2>Seus dados</h2>

        <div className="f-row f-row--2">
          <div>
            <label className="f-label" data-req htmlFor="customer_name">
              Nome completo
            </label>
            <input
              className="f-input"
              id="customer_name"
              name="customer_name"
              required
              autoComplete="name"
              minLength={5}
            />
          </div>
          <div>
            <label className="f-label" data-req htmlFor="customer_document">
              CPF
            </label>
            <input
              className="f-input"
              id="customer_document"
              name="customer_document"
              required
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
            />
            <p className="f-hint">Usado na entrada e para consultar sua reserva.</p>
          </div>
        </div>

        <div className="f-row f-row--2" style={{ marginTop: "1rem" }}>
          <div>
            <label className="f-label" data-req htmlFor="email">
              E-mail
            </label>
            <input
              className="f-input"
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="f-label" data-req htmlFor="telefone">
              Telefone / WhatsApp
            </label>
            <input
              className="f-input"
              id="telefone"
              name="telefone"
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <label className="f-label" htmlFor="observacoes">
            Observações
          </label>
          <textarea
            className="f-input"
            id="observacoes"
            name="observacoes"
            rows={2}
            style={{ minHeight: "auto" }}
          />
          <p className="f-hint">Opcional. Alguma necessidade especial, horário de chegada…</p>
        </div>

        {/* Read-only recap. The visitor should not have to go back a step to
            remember what they are about to pay for. */}
        <section className="f-total" style={{ marginTop: "1.5rem" }}>
          <h3>Sua reserva</h3>
          <p className="f-total-data">
            {formatarData(entrada)}
            {saida && !diaUnico && <> até {formatarData(saida)}</>}
          </p>
          {orcamento ? (
            <div className="f-total-box">
              {orcamento.items_breakdown.map((l) => (
                <div key={l.item_id} className="f-linha">
                  <span>
                    {l.quantity}× {l.item_name}
                  </span>
                  <span>{formatarBRL(l.item_total)}</span>
                </div>
              ))}
              {orcamento.discount_amount > 0 && (
                <div className="f-linha f-linha--desc">
                  <span>Desconto</span>
                  <span>− {formatarBRL(orcamento.discount_amount)}</span>
                </div>
              )}
              {orcamento.service_fee > 0 && (
                <div className="f-linha">
                  <span>Taxa de serviço</span>
                  <span>{formatarBRL(orcamento.service_fee)}</span>
                </div>
              )}
              <div className="f-linha f-linha--total">
                <span>Total</span>
                <span>{formatarBRL(orcamento.total)}</span>
              </div>
            </div>
          ) : (
            <p className="f-hint">
              Não foi possível carregar os valores. Volte e confira sua seleção.
            </p>
          )}
        </section>

        {estado.erro && (
          <p role="alert" className="f-erro">
            {estado.erro}
          </p>
        )}

        <div className="f-nav">
          <Link className="f-btn f-btn--voltar" href={voltar}>
            ← Voltar
          </Link>
          <button type="submit" className="f-btn f-btn--ir" disabled={enviando}>
            {enviando ? "Confirmando…" : "Confirmar reserva →"}
          </button>
        </div>

        <p className="f-hint" style={{ marginTop: "0.75rem" }}>
          Ao confirmar, sua vaga fica reservada por 15 minutos para o pagamento.
        </p>
      </form>
    </div>
  );
}
