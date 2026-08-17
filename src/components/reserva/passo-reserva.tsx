"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Item } from "@/lib/sistur/catalog";
import {
  escreverQuantidades,
  formatarBRL,
  precosDoBreakdown,
  type Orcamento,
  type Quantidades,
} from "@/lib/reserva/itens";
import { formatarData, diasEntre, hoje, validarSelecao } from "@/lib/reserva/datas";
import { Passos } from "./passos";

/**
 * Step 2 — dates, items and the running total, on one screen.
 *
 * Dates and items were separate steps. That is the wrong split: what a visitor
 * actually wants to know is *what this costs*, and the price depends on both, so
 * splitting them means neither screen can answer the question. Now the total
 * updates as either side changes.
 *
 * **The total is never computed here.** It comes from Sistur's `/simular`, via
 * `/api/simular`. Multiplying price by quantity in the browser would be wrong:
 * the engine applies a day tier (a R$ 30,00 ticket costs R$ 35,00 on a Sunday),
 * an advance-booking discount and a service fee. A preview that disagrees with
 * checkout is a legal problem under CDC Art. 30, not a cosmetic one.
 *
 * **Degrades without JavaScript.** The markup is a real `<form method="get">`
 * with named controls, so the fields, the submit button and the server-rendered
 * total all work with scripting off — the first render already carries a total
 * computed on the server. JavaScript only removes the need to press the button.
 */

const DEBOUNCE_MS = 400;

export function PassoReserva({
  slug,
  nome,
  diaUnico,
  cutoff,
  sourceId,
  ingressos,
  adicionais,
  inicial,
  orcamentoInicial,
  precosIniciais,
}: {
  slug: string;
  nome: string;
  diaUnico: boolean;
  cutoff?: string | null;
  sourceId: number;
  ingressos: Item[];
  adicionais: Item[];
  inicial: { entrada?: string; saida?: string; quantidades: Quantidades };
  orcamentoInicial: Orcamento | null;
  precosIniciais: Record<number, number>;
}) {
  const [entrada, setEntrada] = useState(inicial.entrada ?? "");
  const [saida, setSaida] = useState(inicial.saida ?? "");
  const [qtds, setQtds] = useState<Quantidades>(inicial.quantidades);
  const [orcamento, setOrcamento] = useState<Orcamento | null>(orcamentoInicial);
  const [carregando, setCarregando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  // Unit price per item for the chosen date. Empty until a date is complete —
  // before that there is no correct number to show, only the base column, which
  // for the admissions is never what gets charged.
  const [precos, setPrecos] = useState<Record<number, number>>(precosIniciais);

  const min = hoje();
  const selecao = validarSelecao(entrada || undefined, saida || undefined, {
    diaUnico,
    cutoff,
  });
  const totalItens = Object.values(qtds).reduce((a, b) => a + b, 0);

  // Ignores the response of a request that a newer one has already superseded.
  // Without this, typing quickly can land an older total last.
  const geracao = useRef(0);

  useEffect(() => {
    // Keep the URL current so reload, share and restore rebuild this exact step.
    // replaceState rather than push: each keystroke must not become a history
    // entry the back button has to walk through.
    const p = escreverQuantidades(qtds);
    if (entrada) p.set("entrada", entrada);
    if (saida && !diaUnico) p.set("saida", saida);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : location.pathname);

    if (!selecao.completa || totalItens === 0) {
      setOrcamento(null);
      setFalhou(false);
      return;
    }

    const meu = ++geracao.current;
    const t = setTimeout(async () => {
      setCarregando(true);
      try {
        // The trailing slash is required, not cosmetic: `trailingSlash: true`
        // applies to route handlers too, and "/api/simular" answers 308 — which
        // a POST does not survive intact.
        const res = await fetch("/api/simular/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_id: sourceId,
            check_in_date: selecao.entrada,
            // Day use is a single date; Sistur accepts check_out equal to
            // check_in and prices the FIXED items once.
            check_out_date: diaUnico ? selecao.entrada : selecao.saida,
            items: Object.entries(qtds)
              .filter(([, q]) => q > 0)
              .map(([id, q]) => ({ item_id: Number(id), quantity: q })),
          }),
        });
        if (meu !== geracao.current) return;
        if (!res.ok) {
          setFalhou(true);
          setOrcamento(null);
        } else {
          setOrcamento(await res.json());
          setFalhou(false);
        }
      } catch {
        if (meu === geracao.current) {
          setFalhou(true);
          setOrcamento(null);
        }
      } finally {
        if (meu === geracao.current) setCarregando(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrada, saida, JSON.stringify(qtds), selecao.completa, totalItens]);

  // Prices depend on the dates alone, so this does not re-run when a quantity
  // changes — that would be one Sistur call per keystroke for no new answer.
  const todosIds = [...ingressos, ...adicionais].map((i) => i.id).join(",");
  useEffect(() => {
    if (!selecao.completa || !selecao.entrada) {
      setPrecos({});
      return;
    }
    let vivo = true;
    (async () => {
      try {
        const res = await fetch("/api/simular/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_id: sourceId,
            check_in_date: selecao.entrada,
            check_out_date: diaUnico ? selecao.entrada : selecao.saida,
            items: todosIds.split(",").map((id) => ({
              item_id: Number(id),
              quantity: 1,
            })),
          }),
        });
        if (!vivo) return;
        setPrecos(res.ok ? precosDoBreakdown(await res.json()) : {});
      } catch {
        if (vivo) setPrecos({});
      }
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecao.entrada, selecao.saida, selecao.completa, todosIds]);

  const setQtd = (id: number, valor: number) =>
    setQtds((atual) => {
      const proximo = { ...atual };
      if (valor > 0) proximo[id] = Math.min(valor, 99);
      else delete proximo[id];
      return proximo;
    });

  const noites =
    selecao.completa && selecao.entrada && selecao.saida
      ? diasEntre(selecao.entrada, selecao.saida)
      : 0;

  return (
    <div className="f-card">
      <div className="f-head">
        <h1>Reserva {nome}</h1>
        <p>Escolha as datas e o que vai precisar</p>
        <Passos atual={2} />
      </div>

      <form className="f-body" method="get" action={`/reservar/${slug}/`}>
        {/* ── Datas ─────────────────────────────────────────────────── */}
        <h2>{diaUnico ? "Data da visita" : "Período da estadia"}</h2>

        <div className={diaUnico ? "f-row" : "f-row f-row--2"}>
          <div>
            <label className="f-label" data-req htmlFor="entrada">
              {diaUnico ? "Data" : "Entrada"}
            </label>
            <input
              className="f-input"
              type="date"
              id="entrada"
              name="entrada"
              required
              min={min}
              value={entrada}
              onChange={(ev) => setEntrada(ev.target.value)}
            />
          </div>

          {!diaUnico && (
            <div>
              <label className="f-label" data-req htmlFor="saida">
                Saída
              </label>
              <input
                className="f-input"
                type="date"
                id="saida"
                name="saida"
                required
                min={entrada || min}
                value={saida}
                onChange={(ev) => setSaida(ev.target.value)}
              />
            </div>
          )}
        </div>

        {selecao.erro && (
          <p role="alert" className="f-erro">
            {selecao.erro}
          </p>
        )}

        {cutoff && (
          <div className="f-info">
            <strong>Reserva para o mesmo dia</strong>
            <p>
              Para chegar hoje, a reserva precisa ser feita até às {cutoff}.
            </p>
          </div>
        )}

        {/* ── Ingressos ─────────────────────────────────────────────── */}
        <h2 className="mt-8">Ingressos</h2>
        <ListaItens itens={ingressos} qtds={qtds} onQtd={setQtd} precos={precos} noites={noites} />

        {/* ── Adicionais ────────────────────────────────────────────── */}
        {adicionais.length > 0 && (
          <details className="f-det" open={adicionais.some((i) => qtds[i.id])}>
            <summary>
              Adicionais
              <span className="f-det-n">{adicionais.length} opções</span>
            </summary>
            <ListaItens itens={adicionais} qtds={qtds} onQtd={setQtd} precos={precos} noites={noites} />
          </details>
        )}

        {/* ── Total ─────────────────────────────────────────────────── */}
        <Resumo
          selecao={selecao}
          diaUnico={diaUnico}
          noites={noites}
          totalItens={totalItens}
          orcamento={orcamento}
          carregando={carregando}
          falhou={falhou}
        />

        <div className="f-nav">
          <Link className="f-btn f-btn--voltar" href="/reservar/">
            ← Trocar experiência
          </Link>
          <button
            type="submit"
            className="f-btn f-btn--ir"
            disabled={!selecao.completa || totalItens === 0}
          >
            Continuar →
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * One row per item: name and quantity — deliberately no unit price.
 *
 * The row used to print "a partir de {price}". That number is Sistur's `price`
 * column, and for the admissions it is never what gets charged: Inteira has all
 * three day tiers filled (30,01 weekday / 35,00 weekend / 40,03 holiday), so the
 * 30,00 shown was a fallback the engine never reaches. A figure beside the field
 * that disagrees with the total below it reads as a bug in the site.
 *
 * The price now appears once, in the summary, resolved by Sistur for the date
 * actually chosen — which is the only place it can be stated correctly.
 */
function ListaItens({
  itens,
  qtds,
  onQtd,
  precos,
  noites,
}: {
  itens: Item[];
  qtds: Quantidades;
  onQtd: (id: number, v: number) => void;
  precos: Record<number, number>;
  noites: number;
}) {
  if (itens.length === 0) {
    return <p className="f-hint">Nada disponível para esta experiência.</p>;
  }
  return (
    <ul className="f-itens">
      {itens.map((i) => {
        // Sistur stores R$ 0,01 as the sentinel for a free admission — the
        // "Isento" tier for small children. Worth saying out loud, since a
        // visitor otherwise cannot tell it from a paid ticket.
        const gratuito = i.price <= 0.01;
        const unit = precos[i.id];
        const porDia = i.billing_type !== "FIXED";
        return (
          <li key={i.id} className="f-item">
            <div className="f-item-txt">
              <span className="f-item-nome">{i.name}</span>
              {gratuito ? (
                <span className="f-item-preco">Sem custo</span>
              ) : unit !== undefined ? (
                <span className="f-item-preco">
                  {formatarBRL(unit)}
                  {porDia ? " por diária" : " nesta data"}
                  {porDia && noites > 1
                    ? ` · ${noites} diárias = ${formatarBRL(unit * noites)}`
                    : ""}
                </span>
              ) : null}
            </div>
            <input
              className="f-qtd"
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              step={1}
              name={`i${i.id}`}
              aria-label={`Quantidade — ${i.name}`}
              value={qtds[i.id] ?? 0}
              onChange={(ev) => onQtd(i.id, Number(ev.target.value) || 0)}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** The running total, or the reason there isn't one yet. */
function Resumo({
  selecao,
  diaUnico,
  noites,
  totalItens,
  orcamento,
  carregando,
  falhou,
}: {
  selecao: ReturnType<typeof validarSelecao>;
  diaUnico: boolean;
  noites: number;
  totalItens: number;
  orcamento: Orcamento | null;
  carregando: boolean;
  falhou: boolean;
}) {
  let pendencia: string | null = null;
  if (!selecao.completa) {
    pendencia = diaUnico
      ? "Escolha a data para ver o valor."
      : "Escolha entrada e saída para ver o valor.";
  } else if (totalItens === 0) {
    pendencia = "Escolha ao menos um ingresso para ver o valor.";
  }

  return (
    <section className="f-total" aria-live="polite">
      <h3>Resumo</h3>

      {selecao.completa && selecao.entrada && (
        <p className="f-total-data">
          {formatarData(selecao.entrada)}
          {selecao.saida && (
            <>
              {" até "}
              {formatarData(selecao.saida)} · {noites}{" "}
              {noites === 1 ? "noite" : "noites"}
            </>
          )}
        </p>
      )}

      {pendencia && <p className="f-hint">{pendencia}</p>}

      {!pendencia && falhou && (
        <p className="f-hint">
          Não foi possível calcular o valor agora. Você pode continuar — o total
          é confirmado na próxima etapa.
        </p>
      )}

      {!pendencia && !falhou && orcamento && (
        <div data-carregando={carregando ? "" : undefined} className="f-total-box">
          {orcamento.items_breakdown.map((l) => (
            <div key={l.item_id} className="f-linha">
              <span>
                {l.quantity}× {l.item_name}
                {l.num_days ? ` · ${l.num_days} diárias` : ""}
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
      )}

      {/* Without JavaScript nothing recalculates on change, so the button has to
          be reachable. With JavaScript the total is already current and it is
          just a second way to submit. */}
      <noscript>
        <button type="submit" className="f-btn f-btn--ir" style={{ marginTop: "1rem" }}>
          Atualizar valores
        </button>
      </noscript>
    </section>
  );
}
