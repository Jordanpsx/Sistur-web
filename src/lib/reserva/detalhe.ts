import { formatarBRL, type Orcamento } from "./itens";

/**
 * Quebra o orçamento nas linhas que explicam o total.
 *
 * O carrinho mostrava "3 itens · desconto de R$ 107,50" e o valor. Isso diz
 * quanto, nunca por quê: não dava para saber qual item pesa, de onde vem o
 * desconto, nem por que duas noites custam mais que o dobro de uma. Quem
 * escolhe sem entender a conta desiste ou liga perguntando.
 *
 * Função pura sobre a resposta do `/simular` — nada é calculado aqui. Somar
 * preço por quantidade no navegador produziria um número que o checkout
 * contradiz, e sob o CDC Art. 30 o preço anunciado obriga o fornecedor.
 */

export type LinhaDetalhe = {
  tipo: "item" | "subtotal" | "desconto" | "taxa" | "total";
  titulo: string;
  /** Como o valor da linha se forma. Ausente quando não há o que explicar. */
  descricao?: string;
  valor: number;
};

/** "24 horas" vira "1 diária"; 33 vira "1 diária + 9h". */
export function descreverTempo(horas: number): string {
  const diarias = Math.floor(horas / 24);
  const resto = Math.round(horas % 24);
  const d = diarias > 0 ? `${diarias} diária${diarias > 1 ? "s" : ""}` : "";
  if (resto === 0) return d;
  const h = `${resto}h`;
  return d ? `${d} + ${h}` : h;
}

/** Como a linha do item chegou ao valor dela. */
function descreverItem(l: Orcamento["items_breakdown"][number]): string | undefined {
  const unidade = l.unit_total ?? l.unit_price;
  const partes = [`${l.quantity} × ${formatarBRL(unidade)}`];

  // O fator temporal, quando existe. Sem ele, uma churrasqueira de R$ 80,00 a
  // diária aparecendo por R$ 240,00 em três noites parece erro de conta.
  if (l.total_hours != null && l.total_hours > 0) {
    partes.push(descreverTempo(l.total_hours));
  } else if (l.num_days != null && l.num_days > 1) {
    partes.push(`${l.num_days} diárias`);
  }

  // Só vale dizer a tarifa base quando ela difere do que se paga por unidade —
  // é o caso do pró-rata, e é exatamente onde o número parece arbitrário.
  if (l.unit_total != null && l.unit_total !== l.unit_price) {
    partes.push(`tarifa ${formatarBRL(l.unit_price)}/diária`);
  }

  return partes.join(" · ");
}

/** Nome legível de um desconto, com o percentual quando houver. */
function nomeDoDesconto(chave: string, dados: unknown): string {
  const d = (dados ?? {}) as { name?: unknown; percent?: unknown };
  const nome = typeof d.name === "string" && d.name ? d.name : chave;
  return typeof d.percent === "number" && d.percent > 0
    ? `${nome} (${d.percent}%)`
    : nome;
}

/**
 * Junta os nomes escolhidos numa frase.
 *
 * Duas churrasqueiras da mesma tarifa viram uma linha só no `/simular` — o
 * motor conta por tarifa e quantidade —, então a linha precisa nomear as duas.
 */
function juntar(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? "";
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

export function detalharOrcamento(
  o: Orcamento | null,
  /**
   * Tarifa → nomes das unidades físicas escolhidas nela.
   *
   * O `/simular` responde em tarifa: quem escolheu a Churrasqueira A4 recebe de
   * volta "Churrasqueira Grande (A)", que é o nome do preço, não o da coisa. Na
   * tela o cliente escolheu A4, e ver outro nome na conta faz duvidar se pegou
   * a certa. Ausente, a linha mantém o nome da tarifa — é o caso de todo item
   * que não tem unidade física.
   */
  nomesPorTarifa?: Record<number, string[]>,
): LinhaDetalhe[] {
  if (!o) return [];

  const linhas: LinhaDetalhe[] = o.items_breakdown.map((l) => {
    const escolhidas = nomesPorTarifa?.[l.item_id];
    return {
      tipo: "item",
      titulo: escolhidas?.length ? juntar(escolhidas) : l.item_name,
      descricao: descreverItem(l),
      valor: l.item_total,
    };
  });

  const temAjuste = o.discount_amount > 0 || o.service_fee > 0;

  // Subtotal só aparece quando há algo entre ele e o total. Sem desconto nem
  // taxa ele repetiria o total na linha de cima, e uma conta que se repete
  // faz duvidar de qual é a certa.
  if (temAjuste) {
    linhas.push({ tipo: "subtotal", titulo: "Subtotal", valor: o.subtotal });
  }

  if (o.discount_amount > 0) {
    const entradas = Object.entries(o.discount_details ?? {});
    if (entradas.length > 0) {
      for (const [chave, dados] of entradas) {
        const valor = (dados as { amount?: unknown })?.amount;
        linhas.push({
          tipo: "desconto",
          titulo: nomeDoDesconto(chave, dados),
          // Um desconto sem valor próprio não vira linha sem número: quando o
          // motor não detalha, mostramos o desconto inteiro numa linha só.
          valor: -(typeof valor === "number" ? valor : o.discount_amount),
        });
      }
    } else {
      linhas.push({ tipo: "desconto", titulo: "Desconto", valor: -o.discount_amount });
    }
  }

  if (o.service_fee > 0) {
    const pct = o.service_fee_details?.percent;
    linhas.push({
      tipo: "taxa",
      titulo: pct ? `Taxa de serviço (${pct}%)` : "Taxa de serviço",
      valor: o.service_fee,
    });
  }

  linhas.push({ tipo: "total", titulo: "Total", valor: o.total });
  return linhas;
}
