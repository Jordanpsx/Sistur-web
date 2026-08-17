import Link from "next/link";
import { hoje, formatarData, diasEntre, type Selecao } from "@/lib/reserva/datas";
import { Passos } from "./passos";

/**
 * Step 2 — dates.
 *
 * A plain `<form method="get">`. No client component, no state hook, no
 * `onSubmit`. The browser serialises the fields into the query string and
 * navigates, which gives the resilience requirement almost for free:
 *
 *   - Back and forward are ordinary history entries, so returning to this step
 *     re-renders the previous dates from the URL instead of replaying state.
 *   - A reload, a shared link, or a restored tab all reconstruct the step
 *     exactly, because the URL is the entire input.
 *   - It works before hydration and with JS disabled — the WordPress form lost
 *     everything when its script failed to load on hotel wifi.
 *
 * The cost is a full round trip per submission. That is acceptable here: the
 * route is `force-dynamic` anyway, and correctness under back-navigation was the
 * stated priority over interaction latency.
 *
 * The layout follows the WordPress day-use form: a green header, numbered steps,
 * paired fields, and back/advance separated at the footer rule.
 */
export function PassoDatas({
  slug,
  nome,
  diaUnico,
  cutoff,
  selecao,
}: {
  slug: string;
  nome: string;
  diaUnico: boolean;
  cutoff?: string | null;
  selecao: Selecao;
}) {
  const min = hoje();
  const noites =
    selecao.completa && selecao.entrada && selecao.saida
      ? diasEntre(selecao.entrada, selecao.saida)
      : 0;

  return (
    <div className="f-card">
      <div className="f-head">
        <h1>Reserva {nome}</h1>
        <p>Preencha os dados abaixo para continuar</p>
        <Passos atual={2} />
      </div>

      <div className="f-body">
        <h2>{diaUnico ? "Data da visita" : "Período da estadia"}</h2>

        <form method="get" action={`/reservar/${slug}/`}>
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
                defaultValue={selecao.entrada ?? ""}
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
                  min={selecao.entrada ?? min}
                  defaultValue={selecao.saida ?? ""}
                />
              </div>
            )}
          </div>

          {cutoff && (
            <div className="f-info">
              <strong>Reserva para o mesmo dia</strong>
              <p>
                Para chegar hoje, a reserva precisa ser feita até às {cutoff}.
                Depois desse horário, escolha a partir de amanhã.
              </p>
            </div>
          )}

          {selecao.erro && (
            <p role="alert" className="f-erro">
              {selecao.erro}
            </p>
          )}

          {selecao.completa && selecao.entrada && (
            <div className="f-info" style={{ borderLeftColor: "var(--c-accent)" }}>
              <strong style={{ color: "var(--c-accent-dark)" }}>
                {diaUnico ? "Data escolhida" : "Período escolhido"}
              </strong>
              <p>
                {formatarData(selecao.entrada)}
                {selecao.saida && (
                  <>
                    {" até "}
                    {formatarData(selecao.saida)} · {noites}{" "}
                    {noites === 1 ? "noite" : "noites"}
                  </>
                )}
              </p>
            </div>
          )}

          <div className="f-nav">
            <Link className="f-btn f-btn--voltar" href="/reservar/">
              ← Voltar
            </Link>
            <button type="submit" className="f-btn f-btn--ir">
              {selecao.completa ? "Continuar →" : "Confirmar datas →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
