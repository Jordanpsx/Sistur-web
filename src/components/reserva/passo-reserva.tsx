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
import {
  formatarData,
  diasEntre,
  hoje,
  horasEntre,
  momento,
  validarSelecao,
  type Janela,
} from "@/lib/reserva/datas";
import { agruparAdicionais, emojiDaSecao, type Grupo } from "@/lib/reserva/secoes";
import {
  escreverRecursos,
  lerRecursos,
  quantidadesPorTarifa,
  type Recurso,
} from "@/lib/reserva/recursos";
import { Passos } from "./passos";
import { Stepper } from "./stepper";
import { CardRecurso } from "./card-recurso";
import { CardAdicional } from "./card-adicional";
import { CarrinhoFixo } from "./carrinho-fixo";
import { Acordeao } from "./acordeao";

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
  janela,
  sourceId,
  categoryId,
  ingressos,
  adicionais,
  grupos,
  inicial,
  orcamentoInicial,
  precosIniciais,
  recursosIniciais,
}: {
  slug: string;
  nome: string;
  diaUnico: boolean;
  cutoff?: string | null;
  // Presente só onde a hora entra no preço. Ver `Janela` em lib/reserva/datas.
  janela?: Janela | null;
  sourceId: number;
  categoryId: number;
  ingressos: Item[];
  // Itens de aluguel com quantidade — barraca, colchão, lenha. São o que o
  // camping tem além dos ingressos e das churrasqueiras.
  adicionais: Item[];
  grupos: Grupo[];
  inicial: {
    entrada?: string;
    saida?: string;
    horaEntrada?: string;
    horaSaida?: string;
    quantidades: Quantidades;
    recursos: number[];
  };
  recursosIniciais: Recurso[];
  orcamentoInicial: Orcamento | null;
  precosIniciais: Record<number, number>;
}) {
  const [entrada, setEntrada] = useState(inicial.entrada ?? "");
  const [saida, setSaida] = useState(inicial.saida ?? "");
  // A mesma hora nas duas pontas, e não a abertura contra o fechamento. Isso dá
  // diárias cheias — 24, 48, 72 horas — e o formulário abre no preço base, em
  // número redondo. Começar em 08:00 → 17:00 abria em 33 horas e R$ 123,75, um
  // valor quebrado antes de a pessoa ter escolhido nada. Saindo do redondo, ver
  // o total mexer explica sozinho de onde vem a diferença.
  const [horaEntrada, setHoraEntrada] = useState(
    inicial.horaEntrada ?? janela?.entradaDe ?? "",
  );
  const [horaSaida, setHoraSaida] = useState(
    inicial.horaSaida ?? inicial.horaEntrada ?? janela?.entradaDe ?? "",
  );
  // Enquanto ninguém tocou na saída, ela segue a entrada. Não é só estética:
  // sem isso, mudar a entrada para 10:00 deixava a saída às 08:00 e derrubava a
  // estadia para 22 horas, abaixo do mínimo — um erro que a pessoa não pediu e
  // não saberia desfazer. Depois que ela escolhe uma saída, mandamos parar.
  const [saidaEscolhida, setSaidaEscolhida] = useState(
    inicial.horaSaida != null && inicial.horaSaida !== inicial.horaEntrada,
  );

  const mudarEntrada = (v: string) => {
    setHoraEntrada(v);
    if (!saidaEscolhida && janela) {
      // Espelha, sem passar do limite de saída.
      setHoraSaida(v > janela.saidaAte ? janela.saidaAte : v);
    }
  };
  const [qtds, setQtds] = useState<Quantidades>(inicial.quantidades);
  const [orcamento, setOrcamento] = useState<Orcamento | null>(orcamentoInicial);
  const [carregando, setCarregando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  // Unit price per item for the chosen date. Empty until a date is complete —
  // before that there is no correct number to show, only the base column, which
  // for the admissions is never what gets charged.
  const [precos, setPrecos] = useState<Record<number, number>>(precosIniciais);
  // Churrasqueiras físicas disponíveis na data, com foto e preço da tarifa do
  // grupo. Buscadas de novo a cada troca de data: outra pessoa pode levar a
  // última enquanto esta escolhe.
  const [recursos, setRecursos] = useState<Recurso[]>(recursosIniciais);
  const [recursosSel, setRecursosSel] = useState<number[]>(inicial.recursos);

  const min = hoje();
  // O que vai para o Sistur. Com janela carrega a hora, sem janela é a data
  // pura — as duas formas são aceitas por /simular e por criar.
  const instanteEntrada = (d: string) => momento(d, janela ? horaEntrada : undefined);
  const instanteSaida = (d: string) => momento(d, janela ? horaSaida : undefined);
  const selecao = validarSelecao(entrada || undefined, saida || undefined, {
    diaUnico,
    cutoff,
    janela,
    horaEntrada: horaEntrada || undefined,
    horaSaida: horaSaida || undefined,
  });
  // O /simular fala em tarifa e quantidade. Duas churrasqueiras da mesma
  // tarifa viram uma linha de quantidade dois — é assim que o motor conta.
  const qtdsCompletas = {
    ...qtds,
    ...(() => {
      const porTarifa = quantidadesPorTarifa(recursosSel, recursos);
      const soma: Quantidades = {};
      for (const [id, q] of Object.entries(porTarifa)) {
        soma[Number(id)] = (qtds[Number(id)] ?? 0) + q;
      }
      return soma;
    })(),
  };
  const totalItens =
    Object.values(qtds).reduce((a, b) => a + b, 0) + recursosSel.length;

  // Ignores the response of a request that a newer one has already superseded.
  // Without this, typing quickly can land an older total last.
  const geracao = useRef(0);

  useEffect(() => {
    // Keep the URL current so reload, share and restore rebuild this exact step.
    // replaceState rather than push: each keystroke must not become a history
    // entry the back button has to walk through.
    const p = escreverQuantidades(qtds);
    for (const [k, v] of escreverRecursos(recursosSel)) p.set(k, v);
    if (entrada) p.set("entrada", entrada);
    if (saida && !diaUnico) p.set("saida", saida);
    // A hora é preço, então viaja com o resto do estado. Sem isto o passo 3
    // recalcularia sobre meia-noite e cobraria diferente do que foi mostrado —
    // foi assim que a churrasqueira sumiu entre os passos antes.
    if (janela && horaEntrada) p.set("he", horaEntrada);
    if (janela && horaSaida) p.set("hs", horaSaida);
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
            category_id: categoryId,
            check_in_date: instanteEntrada(selecao.entrada!),
            // Day use is a single date; Sistur accepts check_out equal to
            // check_in and prices the FIXED items once.
            check_out_date: diaUnico
              ? instanteEntrada(selecao.entrada!)
              : instanteSaida(selecao.saida!),
            items: Object.entries(qtdsCompletas)
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
  }, [
    entrada,
    saida,
    horaEntrada,
    horaSaida,
    JSON.stringify(qtdsCompletas),
    selecao.completa,
    totalItens,
  ]);

  // Prices depend on the dates alone, so this does not re-run when a quantity
  // changes — that would be one Sistur call per keystroke for no new answer.
  // Ingressos mais as tarifas que cobrem os espaços disponíveis. Repetida não
  // faz mal: o /simular responde uma linha por item.
  const todosIds = [
    ...ingressos.map((i) => i.id),
    ...new Set(recursos.map((r) => r.item_id)),
  ].join(",");
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
            category_id: categoryId,
            check_in_date: instanteEntrada(selecao.entrada!),
            check_out_date: diaUnico
              ? instanteEntrada(selecao.entrada!)
              : instanteSaida(selecao.saida!),
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
  }, [selecao.entrada, selecao.saida, horaEntrada, horaSaida, selecao.completa, todosIds]);

  useEffect(() => {
    if (!selecao.completa || !selecao.entrada) {
      setRecursos([]);
      return;
    }
    let vivo = true;
    (async () => {
      const q = new URLSearchParams({
        source_id: String(sourceId),
        category_id: String(categoryId),
        check_in: instanteEntrada(selecao.entrada!),
        check_out: diaUnico
          ? instanteEntrada(selecao.entrada!)
          : instanteSaida(selecao.saida!),
      });
      try {
        const res = await fetch(`/api/recursos/?${q}`, { cache: "no-store" });
        if (!vivo) return;
        const dados = res.ok ? await res.json() : { resources: [] };
        setRecursos(dados.resources ?? []);
        // Solta o que deixou de estar disponível: manter a seleção levaria a
        // pessoa até o pagamento para ser recusada lá.
        const livres = new Set(
          (dados.resources ?? [])
            .filter((r: Recurso) => r.is_available)
            .map((r: Recurso) => r.id),
        );
        setRecursosSel((atual) => atual.filter((id) => livres.has(id)));
      } catch {
        if (vivo) setRecursos([]);
      }
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selecao.entrada,
    selecao.saida,
    horaEntrada,
    horaSaida,
    selecao.completa,
    sourceId,
    categoryId,
  ]);

  // Uma churrasqueira por reserva. Marcar outra **substitui** a anterior em vez
  // de somar: bloquear o clique deixaria a pessoa procurando onde desmarcar a
  // primeira, e o servidor recusa duas de qualquer forma.
  const setRecurso = (id: number, marcado: boolean) =>
    setRecursosSel((atual) => (marcado ? [id] : atual.filter((x) => x !== id)));

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

  // Tarifa → nomes das churrasqueiras escolhidas nela, para a conta dizer
  // "Churrasqueira A4" onde o /simular responde "Churrasqueira Grande (A)".
  const nomesPorTarifa: Record<number, string[]> = {};
  for (const id of recursosSel) {
    const r = recursos.find((x) => x.id === id);
    if (r) (nomesPorTarifa[r.item_id] ??= []).push(r.name);
  }

  const porGrupo = new Map(grupos.map((g) => [g.id, g]));
  // Duas formas de escolher, e quem decide é o estoque, não a categoria.
  //
  // Estoque 1 é uma coisa só, e a pessoa escolhe QUAL: a churrasqueira A4, com
  // a foto dela, porque a A4 e a A1 não são a mesma churrasqueira. Estoque
  // maior é um pool intercambiável — ninguém quer escolher qual das oito
  // barracas pequenas, só quantas.
  //
  // A decisão é por seção inteira, não por tarifa. "Itens para Camping" tem
  // Barraca Pequena com estoque 8 e Barraca Grande com estoque 1; decidindo uma
  // a uma, a seção saía com cinco contadores e um card "Selecionar" no meio.
  const tarifasEmPool = new Set(
    recursos.filter((r) => (r.stock ?? 1) > 1).map((r) => r.item_id),
  );
  const todasAsSecoes = agruparAdicionais(recursos, grupos);
  const secoes = todasAsSecoes.filter(
    (sec) => !sec.sub.some((x) => x.itens.some((r) => tarifasEmPool.has(r.item_id))),
  );

  // O que sobrou vira contador: os itens sem recurso nenhum (lenha) e os das
  // seções que caíram em pool. Uma tarifa nunca aparece nas duas listas.
  const porUnidade = new Set(
    secoes.flatMap((sec) => sec.sub.flatMap((x) => x.itens.map((r) => r.item_id))),
  );
  const secoesItens = agruparAdicionais(
    adicionais.filter((i) => !porUnidade.has(i.id)),
    grupos,
  );

  // Uma frase só, dizendo o que falta. Botão desabilitado sem explicação deixa
  // a pessoa procurando o que fez de errado.
  const pendencia = !selecao.completa
    ? diaUnico
      ? "Escolha a data para ver o valor"
      : "Escolha entrada e saída para ver o valor"
    : totalItens === 0
      ? "Escolha ao menos um ingresso"
      : falhou
        ? "Não foi possível calcular agora — você pode continuar"
        : null;

  return (
    <div className="f-card">
      <div className="f-head">
        <h1>Reserva {nome}</h1>
        <p>Escolha as datas e o que vai precisar</p>
        <Passos atual={2} />
      </div>

      <form className="f-body" method="get" action={`/reservar/${slug}/dados/`}>
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

        {/* Hora só onde ela é preço. No camping a diária é pró-rata: 08:00 →
            17:00 do dia seguinte são 33 horas, e custam mais que 24. */}
        {janela && (
          <div className="f-row f-row--2">
            <div>
              <label className="f-label" data-req htmlFor="he">
                Hora de entrada
              </label>
              <input
                className="f-input"
                type="time"
                id="he"
                name="he"
                required
                step={1800}
                min={janela.entradaDe}
                max={janela.entradaAte}
                value={horaEntrada}
                onChange={(ev) => mudarEntrada(ev.target.value)}
              />
              <p className="f-hint">
                Portaria aberta das {janela.entradaDe} às {janela.entradaAte}.
              </p>
            </div>
            <div>
              <label className="f-label" data-req htmlFor="hs">
                Hora de saída
              </label>
              <input
                className="f-input"
                type="time"
                id="hs"
                name="hs"
                required
                step={1800}
                max={janela.saidaAte}
                value={horaSaida}
                onChange={(ev) => {
                  setSaidaEscolhida(true);
                  setHoraSaida(ev.target.value);
                }}
              />
              <p className="f-hint">
                Até as {janela.saidaAte}. Permanência mínima de {janela.minHoras} horas.
              </p>
            </div>
          </div>
        )}

        {/* Quantas horas a escolha tem. Sem isto o total muda e a pessoa não
            sabe por quê — o preço parece arbitrário em vez de proporcional. */}
        {janela && selecao.completa && selecao.saida && (
          <p className="f-hint">
            {(() => {
              const h = horasEntre(selecao.entrada!, horaEntrada, selecao.saida, horaSaida);
              const diarias = h / 24;
              return Number.isInteger(diarias)
                ? `${h} horas — ${diarias} diária${diarias > 1 ? "s" : ""} cheia${diarias > 1 ? "s" : ""}.`
                : `${h} horas — ${Math.floor(diarias)} diária${Math.floor(diarias) > 1 ? "s" : ""} mais ${Math.round(h % 24)} hora${Math.round(h % 24) > 1 ? "s" : ""} proporcionais.`;
            })()}
          </p>
        )}

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
        <ul className="divide-y divide-[var(--c-border)] rounded-xl border border-[var(--c-border)]">
          {ingressos.map((i) => (
            <li key={i.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] font-medium text-[var(--c-fg)]">
                  {i.name}
                </p>
                {/* Microcopy vinda do Sistur (bot_description). Quem paga meia e
                    quem não paga é regra de negócio; o operador edita no admin,
                    e o site não fica com a regra congelada em código. */}
                {i.description && (
                  <p className="text-sm text-[var(--c-muted)]">{i.description}</p>
                )}
                <p className="mt-0.5 text-sm text-[var(--c-fg)]">
                  {i.price <= 0.01
                    ? "Sem custo"
                    : precos[i.id] !== undefined
                      ? formatarBRL(precos[i.id])
                      : ""}
                </p>
              </div>
              <Stepper
                nome={`i${i.id}`}
                valor={qtds[i.id] ?? 0}
                onChange={(v) => setQtd(i.id, v)}
                rotulo={i.name}
              />
            </li>
          ))}
        </ul>

        {/* ── Espaços ───────────────────────────────────────────────── */}
        {/*
          O formulário oferece a churrasqueira física, não a tarifa. É o que o
          cliente reserva de fato, e é o que permite dizer se AQUELA está livre
          na data e mostrar as fotos DELA. O preço continua vindo do grupo, o
          mesmo caminho que o balcão percorre.

          Uma seção vira acordeão quando tem subseções e fica aberta quando não
          tem — regra tirada da forma da árvore, não de uma lista de nomes.
        */}
        {secoes.map((sec) => {
          const temSub = sec.sub.some((x) => x.grupo !== null);
          const todos = sec.sub.flatMap((x) => x.itens);
          const escolhidos = todos.filter((r) => recursosSel.includes(r.id)).length;
          const livres = todos.filter((r) => r.is_available).length;

          const grade = (lista: Recurso[]) => (
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {lista.map((r) => (
                <CardRecurso
                  key={r.id}
                  recurso={r}
                  selecionado={recursosSel.includes(r.id)}
                  onToggle={(m) => setRecurso(r.id, m)}
                  unit={precos[r.item_id]}
                  noites={noites}
                  outraEscolhida={
                    recursosSel.length > 0 && !recursosSel.includes(r.id)
                  }
                />
              ))}
            </ul>
          );

          const resumo = (n: number, disp: number) =>
            n > 0
              ? `${n} selecionada${n > 1 ? "s" : ""}`
              : disp === 0
                ? "Nenhuma disponível nesta data"
                : `${disp} disponíve${disp > 1 ? "is" : "l"}`;

          if (!temSub) {
            return (
              <section key={sec.id ?? "outros"} className="mt-8">
                <h2 className="flex items-center gap-2">
                  <span aria-hidden="true">{emojiDaSecao(sec.titulo)}</span>
                  {sec.titulo}
                </h2>
                {grade(todos)}
              </section>
            );
          }

          return (
            <Acordeao
              key={sec.id ?? "outros"}
              titulo={sec.titulo}
              emoji={emojiDaSecao(sec.titulo)}
              resumo={resumo(escolhidos, livres)}
              aberto={escolhidos > 0}
              destaque={escolhidos > 0}
            >
              {sec.sub.map((sub) => {
                const n = sub.itens.filter((r) => recursosSel.includes(r.id)).length;
                const d = sub.itens.filter((r) => r.is_available).length;
                return sub.grupo ? (
                  <Acordeao
                    key={sub.grupo.id}
                    titulo={sub.grupo.name}
                    resumo={resumo(n, d)}
                    aberto={n > 0}
                    destaque={n > 0}
                  >
                    {grade(sub.itens)}
                  </Acordeao>
                ) : (
                  <div key="raiz" className="mb-4">
                    {grade(sub.itens)}
                  </div>
                );
              })}
            </Acordeao>
          );
        })}

        {/* Itens de aluguel: escolhe-se a quantidade, não a unidade. A mesma
            árvore de grupos decide seção e acordeão — "Itens para Camping"
            abre em Barracas, Colchões e Lenha sem nenhuma regra por nome. */}
        {secoesItens.map((sec) => {
          const todos = sec.sub.flatMap((x) => x.itens);
          const escolhidos = todos.reduce((n, i) => n + (qtds[i.id] ?? 0), 0);

          const lista = (itens: Item[]) => (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {itens.map((i) => (
                <CardAdicional
                  key={i.id}
                  item={i}
                  grupo={i.group_id != null ? porGrupo.get(i.group_id) : undefined}
                  quantidade={qtds[i.id] ?? 0}
                  onQtd={(v) => setQtd(i.id, v)}
                  unit={precos[i.id]}
                  noites={noites}
                  emoji={emojiDaSecao(sec.titulo)}
                />
              ))}
            </ul>
          );

          const resumo = (n: number) =>
            n > 0 ? `${n} selecionado${n > 1 ? "s" : ""}` : "Nenhum selecionado";

          // Sempre acordeão, com ou sem subseções. Item de aluguel nunca é
          // ingresso, e "Itens para Camping" traz seis linhas de uma vez —
          // aberto, empurra o total e o botão para fora da tela no celular.
          return (
            <Acordeao
              key={`i${sec.id ?? "outros"}`}
              titulo={sec.titulo}
              emoji={emojiDaSecao(sec.titulo)}
              resumo={resumo(escolhidos)}
              aberto={escolhidos > 0}
              destaque={escolhidos > 0}
            >
              {sec.sub.map((sub) => {
                const n = sub.itens.reduce((t, i) => t + (qtds[i.id] ?? 0), 0);
                return sub.grupo ? (
                  <Acordeao
                    key={sub.grupo.id}
                    titulo={sub.grupo.name}
                    resumo={resumo(n)}
                    aberto={n > 0}
                    destaque={n > 0}
                  >
                    {lista(sub.itens)}
                  </Acordeao>
                ) : (
                  <div key="raiz" className="mb-4">
                    {lista(sub.itens)}
                  </div>
                );
              })}
            </Acordeao>
          );
        })}

        {selecao.completa && recursos.length === 0 && secoesItens.length === 0 && (
          <p className="f-hint mt-6">
            Nenhum espaço disponível para esta data.
          </p>
        )}

        <CarrinhoFixo
          nomesPorTarifa={nomesPorTarifa}
          orcamento={orcamento}
          carregando={carregando}
          pendencia={pendencia}
          totalItens={totalItens}
          podeAvancar={selecao.completa && totalItens > 0}
        />

        <p className="mt-3 text-center">
          <Link className="text-sm text-[var(--c-muted)] hover:underline" href="/reservar/">
            ← Trocar experiência
          </Link>
        </p>

        {/* Sem JavaScript o total não recalcula sozinho; o formulário avança
            para o passo 3, então recalcular precisa de um botão que volte. */}
        <noscript>
          <button type="submit" formAction="" className="f-btn f-btn--ir mt-4 w-full">
            Atualizar valores
          </button>
        </noscript>
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

      {/* Without JavaScript the total does not refresh on change. The form now
          submits forward to step 3, so recalculating needs its own control that
          returns here instead. */}
      <noscript>
        <button
          type="submit"
          formAction=""
          className="f-btn f-btn--ir"
          style={{ marginTop: "1rem" }}
        >
          Atualizar valores
        </button>
      </noscript>
    </section>
  );
}
