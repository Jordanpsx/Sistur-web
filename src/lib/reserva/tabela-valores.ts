import type { Dia } from "@/lib/sistur/catalog";

/**
 * Organiza as linhas da tabela de valores em abas por experiência.
 *
 * O CMS guarda linhas soltas (item + faixa de dia). O agrupamento sai do dado
 * do Sistur, não do texto do rótulo:
 * - a **aba** é a categoria do item (Day Use, Camping);
 * - cada **ingresso** (Inteira, Meia, Isento) vira uma linha da aba, com a faixa
 *   de idade que o operador cadastrou no item;
 * - o **tipo de dia** é um seletor só, da aba inteira — não um por ingresso.
 *   Com um seletor por linha o visitante tinha de manter dois estados na
 *   cabeça para ler um preço, e a meia não aparecia;
 * - item que **não é ingresso** (a churrasqueira) vai para os adicionais.
 *
 * A ordem é a do CMS: quem edita a tabela continua decidindo o que vem antes.
 */

export type LinhaResolvida = {
  slug: string;
  dia: Dia;
  label: string;
  prefixo?: string;
  valor: number;
  item: { nome: string; entrada: boolean; descricao?: string | null };
  categoria: { id: number; nome: string; slug: string | null };
};

export type Tarifa = { dia: Dia; valor: number };

export type LinhaValor = {
  slug: string;
  titulo: string;
  /** Faixa de idade do item ("A partir de 13 anos"), ou o rótulo do CMS. */
  detalhe?: string;
  prefixo?: string;
  tarifas: Tarifa[];
};

export type AbaValores = {
  id: string;
  nome: string;
  href: string;
  /** Tipos de dia com preço nesta aba, na ordem em que o CMS os listou. */
  dias: Dia[];
  linhas: LinhaValor[];
};

export type Adicional = { rotulo: string; prefixo?: string; valor: number; href: string };

export const ROTULO_DIA: Record<Dia, string> = {
  semana: "Seg a Sex",
  fds: "Fim de semana",
  feriado: "Feriados",
};

const hrefDe = (slug: string | null) => (slug ? `/reservar/${slug}/` : "/reservar/");

/**
 * O preço de uma linha no tipo de dia escolhido. Uma linha com uma tarifa só
 * (o camping, que não varia) vale para qualquer dia; sem a faixa pedida e com
 * várias tarifas, não há preço a mostrar — e nada se inventa.
 */
export function tarifaDoDia(linha: LinhaValor, dia: Dia | undefined): Tarifa | null {
  if (linha.tarifas.length === 1) return linha.tarifas[0];
  return linha.tarifas.find((t) => t.dia === dia) ?? null;
}

export function agruparValores(linhas: LinhaResolvida[]): {
  abas: AbaValores[];
  adicionais: Adicional[];
} {
  const abas: AbaValores[] = [];
  const adicionais: Adicional[] = [];
  const rotulos = new Map<LinhaValor, string>();

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
      aba = {
        id,
        nome: l.categoria.nome,
        href: hrefDe(l.categoria.slug),
        dias: [],
        linhas: [],
      };
      abas.push(aba);
    }

    let linha = aba.linhas.find((x) => x.slug === l.slug);
    if (!linha) {
      linha = {
        slug: l.slug,
        titulo: l.item.nome,
        detalhe: l.item.descricao?.trim() || undefined,
        prefixo: l.prefixo,
        tarifas: [],
      };
      rotulos.set(linha, l.label);
      aba.linhas.push(linha);
    }
    if (!linha.tarifas.some((t) => t.dia === l.dia)) {
      linha.tarifas.push({ dia: l.dia, valor: l.valor });
    }
  }

  for (const aba of abas) {
    // Só linhas com mais de uma tarifa pedem seletor. As de tarifa única valem
    // para qualquer dia e não devem acrescentar botão.
    for (const linha of aba.linhas) {
      if (linha.tarifas.length < 2) {
        // Tarifa única: o rótulo do CMS ("Camping (24h)") é o que explica a
        // linha quando o item não tem faixa de idade cadastrada. Com várias
        // tarifas ele nomearia só uma delas ("Day Use (Seg a Sex)").
        linha.detalhe ??= rotulos.get(linha);
        continue;
      }
      for (const t of linha.tarifas) if (!aba.dias.includes(t.dia)) aba.dias.push(t.dia);
    }
  }

  return { abas, adicionais };
}
