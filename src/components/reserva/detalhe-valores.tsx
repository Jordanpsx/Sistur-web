import { formatarBRL } from "@/lib/reserva/itens";
import { detalharOrcamento, type LinhaDetalhe } from "@/lib/reserva/detalhe";
import type { Orcamento } from "@/lib/reserva/itens";

/**
 * A conta aberta: o que cada item pesa, de onde vem o desconto, e como se chega
 * ao total.
 *
 * O carrinho dizia "3 itens · desconto de R$ 107,50" e o valor. Isso informa
 * quanto, nunca por quê — não dava para saber qual escolha pesa no preço, nem
 * por que duas noites custam mais que o dobro de uma. Aberto, o cliente vê o
 * efeito de cada escolha antes de decidir.
 *
 * É um `<details>` de propósito, não um botão com estado: funciona sem
 * JavaScript e, dentro de um `<form>`, não corre o risco de submeter a etapa.
 */
export function DetalheValores({
  orcamento,
  sempreAberto = false,
}: {
  orcamento: Orcamento | null;
  /**
   * Sem o disclosure. No passo 3 a pessoa está confirmando o que vai pagar —
   * esconder a conta atrás de um clique ali seria esconder o que ela veio ver.
   * Na barra do passo 2 é o contrário: o total é o que a barra existe para
   * mostrar, e a conta aberta empurraria o botão para fora da tela.
   */
  sempreAberto?: boolean;
}) {
  const linhas = detalharOrcamento(orcamento);
  if (linhas.length === 0) return null;

  if (sempreAberto) return <Linhas linhas={linhas} />;

  return (
    <details className="group mt-1">
      <summary
        className="inline-flex cursor-pointer list-none items-center gap-1 py-1
                   text-xs font-medium text-[var(--c-accent-dark)]
                   hover:underline [&::-webkit-details-marker]:hidden"
      >
        Ver detalhes do valor
        <span aria-hidden="true" className="transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="mt-2 border-t border-[var(--c-border)] pt-2">
        <Linhas linhas={linhas} />
      </div>
    </details>
  );
}

function Linhas({ linhas }: { linhas: LinhaDetalhe[] }) {
  return (
    <dl className="space-y-1 text-sm">
      {linhas.map((l, i) => (
        <Linha key={`${l.tipo}-${l.titulo}-${i}`} linha={l} />
      ))}
    </dl>
  );
}

function Linha({ linha }: { linha: LinhaDetalhe }) {
  const total = linha.tipo === "total";
  const desconto = linha.tipo === "desconto";

  return (
    <div
      className={
        "flex items-baseline justify-between gap-3" +
        (total ? " mt-1 border-t border-[var(--c-border)] pt-2" : "")
      }
    >
      <dt className="min-w-0">
        <span
          className={
            total
              ? "font-semibold text-[var(--c-fg)]"
              : desconto
                ? "text-[var(--c-accent-dark)]"
                : "text-[var(--c-fg)]"
          }
        >
          {linha.titulo}
        </span>
        {linha.descricao && (
          <span className="block text-xs text-[var(--c-muted)]">{linha.descricao}</span>
        )}
      </dt>
      <dd
        className={
          "shrink-0 tabular-nums " +
          (total
            ? "text-base font-bold text-[var(--c-fg)]"
            : desconto
              ? "text-[var(--c-accent-dark)]"
              : "text-[var(--c-fg)]")
        }
      >
        {/* O sinal fica no valor, não só na cor: quem não distingue as cores
            precisa ver que a linha subtrai. */}
        {desconto ? `− ${formatarBRL(Math.abs(linha.valor))}` : formatarBRL(linha.valor)}
      </dd>
    </div>
  );
}
