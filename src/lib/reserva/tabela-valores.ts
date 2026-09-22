import type { Dia } from "@/lib/sistur/catalog";

/**
 * Organiza as linhas da tabela de valores em abas por experiência.
 *
 * O CMS guarda linhas soltas (item + faixa de dia), e a versão anterior pintava
 * uma caixa verde por linha: cinco caixas iguais, três delas o mesmo ingresso
 * em dias diferentes, e a churrasqueira no meio como se fosse um ingresso.
 *
 * Aqui o agrupamento sai do dado do Sistur, não do texto do rótulo:
 * - a **aba** é a categoria do item (Day Use, Camping);
 * - linhas do **mesmo item** viram um cartão só, com as faixas de dia num
 *   seletor;
 * - item que **não é ingresso** (`is_entry_ticket` falso, como a churrasqueira)
 *   vai para a lista de adicionais, que é como ele entra na reserva.
 *
 * A ordem é a do CMS: quem edita a tabela continua decidindo o que vem antes.
 */

export type LinhaResolvida = {
  slug: string;
  dia: Dia;
  label: string;
  prefixo?: string;
  valor: number;
  item: { nome: string; entrada: boolean };
  categoria: { id: number; nome: string; slug: string | null };
};

export type Tarifa = { dia: Dia; valor: number };

export type LinhaValor = {
  slug: string;
  titulo: string;
  /** Rótulo do CMS, mostrado quando a linha tem uma faixa só ("Camping (24h)"). */
  detalhe?: string;
  prefixo?: string;
  tarifas: Tarifa[];
};

export type AbaValores = { id: string; nome: string; href: string; linhas: LinhaValor[] };

export type Adicional = { rotulo: string; prefixo?: string; valor: number; href: string };

export const ROTULO_DIA: Record<Dia, string> = {
  semana: "Seg a Sex",
  fds: "Fim de semana",
  feriado: "Feriados",
};

const hrefDe = (slug: string | null) => (slug ? `/reservar/${slug}/` : "/reservar/");

export function agruparValores(linhas: LinhaResolvida[]): {
  abas: AbaValores[];
  adicionais: Adicional[];
} {
  const abas: AbaValores[] = [];
  const adicionais: Adicional[] = [];

  for (const l of linhas) {
    if (!l.item.entrada) {
      adicionais.push({
        rotulo: l.label,
        prefixo: l.prefixo,
        valor: l.valor,
        href: hrefDe(l.categoria.slug),
      });
      continue;
    }

    const id = String(l.categoria.id);
    let aba = abas.find((a) => a.id === id);
    if (!aba) {
      aba = { id, nome: l.categoria.nome, href: hrefDe(l.categoria.slug), linhas: [] };
      abas.push(aba);
    }

    let linha = aba.linhas.find((x) => x.slug === l.slug);
    if (!linha) {
      linha = {
        slug: l.slug,
        titulo: `Entrada ${l.item.nome.toLocaleLowerCase("pt-BR")}`,
        detalhe: l.label,
        prefixo: l.prefixo,
        tarifas: [],
      };
      aba.linhas.push(linha);
    }
    if (!linha.tarifas.some((t) => t.dia === l.dia)) {
      linha.tarifas.push({ dia: l.dia, valor: l.valor });
    }
  }

  // Com mais de uma faixa, o seletor já diz qual é qual; o rótulo do CMS
  // ("Day Use (Seg a Sex)") repetiria só uma delas.
  for (const aba of abas) {
    for (const linha of aba.linhas) {
      if (linha.tarifas.length > 1) delete linha.detalhe;
    }
  }

  return { abas, adicionais };
}
