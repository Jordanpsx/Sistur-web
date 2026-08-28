"use client";

import { useActionState } from "react";
import Link from "next/link";
import { criarReserva, type EstadoCriacao } from "@/lib/reserva/criar";
import type { Orcamento, Quantidades } from "@/lib/reserva/itens";
import { DetalheValores } from "./detalhe-valores";
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
  horaEntrada,
  horaSaida,
  diaUnico,
  quantidades,
  recursos,
  nomesDosRecursos,
  tarifaDosRecursos,
  orcamento,
}: {
  slug: string;
  nome: string;
  sourceId: number;
  categoryId: number;
  entrada: string;
  saida?: string;
  // Presentes só no camping, onde a hora é preço.
  horaEntrada?: string;
  horaSaida?: string;
  diaUnico: boolean;
  quantidades: Quantidades;
  /** Ids das churrasqueiras escolhidas. */
  recursos: number[];
  /** id -> nome, para o resumo e para o botão de voltar. */
  nomesDosRecursos: Record<number, string>;
  /** id do recurso → id da tarifa dele, para a conta nomear a unidade. */
  tarifaDosRecursos: Record<number, number>;
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
    if (horaEntrada) p.set("he", horaEntrada);
    if (horaSaida) p.set("hs", horaSaida);
    for (const [id, q] of Object.entries(quantidades)) p.set(`i${id}`, String(q));
    for (const id of recursos) p.set(`r${id}`, "1");
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
        {/* A hora precisa chegar à criação. Sem ela o Sistur monta a reserva
            sobre meia-noite e cobra menos do que o resumo mostrou — no camping
            08:00→17:00 do dia seguinte são 33 horas, não 24. */}
        {horaEntrada && <input type="hidden" name="he" value={horaEntrada} />}
        {horaSaida && <input type="hidden" name="hs" value={horaSaida} />}
        {Object.entries(quantidades).map(([id, q]) => (
          <input key={id} type="hidden" name={`i${id}`} value={q} />
        ))}
        {/* Sem estes campos a churrasqueira escolhida no passo 2 sumia: a
            Server Action lê `r<id>` do formulário, e ele não os carregava. */}
        {recursos.map((id) => (
          <input key={id} type="hidden" name={`r${id}`} value="1" />
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
          <p className="f-hint">
            Opcional. Alguma necessidade especial, horário de chegada…
          </p>
        </div>

        {/* Read-only recap. The visitor should not have to go back a step to
            remember what they are about to pay for. */}
        <section className="f-total" style={{ marginTop: "1.5rem" }}>
          <h3>Sua reserva</h3>
          <p className="f-total-data">
            {formatarData(entrada)}
            {saida && !diaUnico && <> até {formatarData(saida)}</>}
          </p>
          {recursos.length > 0 && (
            <p className="f-hint" style={{ marginBottom: "0.5rem" }}>
              Espaço reservado:{" "}
              <strong>
                {recursos.map((id) => nomesDosRecursos[id] ?? `#${id}`).join(", ")}
              </strong>
            </p>
          )}

          {orcamento ? (
            <div className="f-total-box">
              {/* A mesma conta do passo 2, da mesma função. Antes esta tela
                  montava a sua própria: sem subtotal, com o desconto chamado
                  só de "Desconto" e sem dizer por que uma diária de R$ 90,00
                  virava R$ 123,75. Duas telas explicando o mesmo total de
                  jeitos diferentes é uma delas estando errada mais cedo ou
                  mais tarde. */}
              <DetalheValores
                orcamento={orcamento}
                nomesPorTarifa={recursos.reduce<Record<number, string[]>>((acc, id) => {
                  const tarifa = tarifaDosRecursos[id];
                  const nome = nomesDosRecursos[id];
                  if (tarifa && nome) (acc[tarifa] ??= []).push(nome);
                  return acc;
                }, {})}
                sempreAberto
              />
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
