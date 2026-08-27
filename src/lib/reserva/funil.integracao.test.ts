import { afterAll, describe, expect, it } from "vitest";
import {
  PODE_CRIAR,
  datasCandidatas,
  descartarDepois,
  ehDataBloqueada,
  faxinar,
} from "@/testes/reserva-descartavel";

/**
 * Smoke tests over the running site.
 *
 * These walk the funnel the way a visitor does and assert what is on the page.
 * They catch a whole class of failure the unit tests cannot: a stale container.
 * That is not hypothetical — the price fix sat in a built image for an hour
 * while the running container served the previous one, so the bug looked
 * unfixed.
 *
 * Skipped when SITE_URL is unset.
 */

const SITE = process.env.SITE_URL;
const descreve = SITE ? describe : describe.skip;
// Escrever exige que o alvo se declare descartável — ver PODE_CRIAR.
const descreveCria = SITE && PODE_CRIAR ? describe : describe.skip;

/** Fetches a page and strips tags, leaving the visible text. */
async function texto(caminho: string): Promise<string> {
  const res = await fetch(`${SITE}${caminho}`, { redirect: "follow" });
  expect(res.ok, `${caminho} respondeu ${res.status}`).toBe(true);
  const html = (await res.text()).replace(/<script[\s\S]*?<\/script>/g, "");
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

/**
 * Uma reserva de verdade, criada no máximo uma vez por arquivo.
 *
 * Seis testes precisam de um `group_id` que exista e esteja PENDING, e todos
 * apenas *leem* a página — nenhum altera a reserva. Criar seis era gerar seis
 * linhas na lista do operador para exercitar exatamente o mesmo estado.
 */
let reservaCompartilhada: Promise<string> | null = null;

function reservar(): Promise<string> {
  reservaCompartilhada ??= criarReserva();
  return reservaCompartilhada;
}

/** Cria uma reserva de verdade e devolve o group_id. */
async function criarReserva(): Promise<string> {
  const api = process.env.SISTUR_API_URL!;
  const chave = process.env.SISTUR_WEB_API_KEY!;
  const { ratearTotal } = await import("./itens");

  let ultimo: unknown = null;
  // Percorre dias até um ser aceito: o operador bloqueia datas, e uma data fixa
  // no futuro caminha pelos dias da semana até cair num dia bloqueado.
  for (const d of datasCandidatas(70)) {
    const sim = await (
      await fetch(`${api}/reservas/api/public/simular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: 1,
          category_id: 1,
          check_in_date: d,
          check_out_date: d,
          items: [{ item_id: 1, quantity: 1 }],
        }),
      })
    ).json();

    const res = await fetch(`${api}/api/public/reservas/criar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Web-Api-Key": chave },
      body: JSON.stringify({
        source_id: 1,
        category_id: 1,
        customer_name: "Regressao Pagamento Silva",
        customer_document: "529.982.247-25",
        email: "pagamento@exemplo.com.br",
        telefone: "(64) 99999-0000",
        check_in_date: d,
        check_out_date: d,
        items: ratearTotal(sim),
      }),
    });
    const corpo = await res.json();
    ultimo = corpo;
    if (res.status === 201) {
      descartarDepois(corpo.group_id);
      return corpo.group_id;
    }
    if (!ehDataBloqueada(corpo)) break;
  }
  throw new Error(`nenhuma data livre para reservar: ${JSON.stringify(ultimo)}`);
}

function daqui(dias: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

descreve("funil de reserva", () => {
  it("o seletor oferece as experiências do Sistur", async () => {
    const t = await texto("/reservar/");
    expect(t).toMatch(/Day use/i);
    expect(t).toMatch(/Camping/i);
    // Enoturismo perdeu o slug e não deve aparecer.
    expect(t).not.toMatch(/Enoturismo/i);
  });

  it("experiência sem slug devolve 404", async () => {
    const res = await fetch(`${SITE}/reservar/enoturismo/`);
    expect(res.status).toBe(404);
  });

  it("day use pede uma data; camping pede duas", async () => {
    expect(await texto("/reservar/day-use/")).toMatch(/Data da visita/i);
    const camping = await texto("/reservar/camping/");
    expect(camping).toMatch(/Entrada/);
    expect(camping).toMatch(/Sa[íi]da/);
  });

  it("o corte do mesmo dia aparece só onde existe", async () => {
    expect(await texto("/reservar/camping/")).toMatch(/14:00/);
    expect(await texto("/reservar/day-use/")).not.toMatch(/mesmo dia/i);
  });

  it("sem data escolhida, nenhum item mostra preço", async () => {
    const t = await texto("/reservar/day-use/");
    const itens = t.slice(t.indexOf("Ingressos"), t.indexOf("Resumo"));
    // O preço base era exibido aqui e o motor nunca o cobra.
    expect(itens).not.toMatch(/R\$/);
  });

  it("com data escolhida, cada item mostra o valor daquele dia", async () => {
    const t = await texto(`/reservar/day-use/?entrada=${daqui(40)}`);
    expect(t.slice(t.indexOf("Ingressos"))).toMatch(/R\$/);
  });

  it("os ingressos vêm do mais caro para o mais barato", async () => {
    // Inteira, Meia-Entrada, Isento — a ordem de uma bilheteria. Sai do preço
    // BASE, não do preço do dia: a tarifa por tipo de dia faz um passar o outro
    // (a Inteira está com price_weekday de R$ 0,01 agora), e a lista mudaria de
    // ordem conforme a data.
    for (const d of [daqui(40), daqui(41), daqui(45)]) {
      const t = await texto(`/reservar/day-use/?entrada=${d}`);
      const trecho = t.slice(t.indexOf("Ingressos"));
      const posicoes = ["Inteira", "Meia-Entrada", "Isento"].map((n) =>
        trecho.indexOf(n),
      );
      expect(posicoes.every((p) => p >= 0), `faltou ingresso em ${d}`).toBe(true);
      expect(posicoes, `ordem errada em ${d}`).toEqual([...posicoes].sort((a, b) => a - b));
    }
  });

  it("o cartão pede miniatura, em qualidade acima do padrão", async () => {
    // Divisão de papéis: a grade fica escaneável com treze churrasqueiras, e
    // quem quer ver de perto abre a galeria.
    const html = await (await fetch(`${SITE}/reservar/day-use/?entrada=${daqui(40)}`)).text();
    expect(html).toMatch(/wp-content%2Fuploads[^"&]*&amp;w=\d+&amp;q=85/);
    expect(html).toContain("grid-cols-2");
  });

  it("a galeria pede a viewport inteira", async () => {
    // Ela monta no clique, então não aparece no HTML do servidor. O que dá para
    // travar é o contrato dela dentro do bundle da página: a primeira versão
    // ficava presa a 768px e clicar na foto entregava outra foto pequena.
    const html = await (await fetch(`${SITE}/reservar/day-use/?entrada=${daqui(40)}`)).text();
    // Especificamente o chunk da PÁGINA. Procurar por "experiencia" pegava o
    // primeiro que casasse, e no dia em que o segmento ganhou um layout esse
    // primeiro passou a ser o layout — o teste acusou a galeria por uma
    // mudança que não a tocou.
    const caminho = html.match(
      /\/_next\/static\/chunks\/app\/[^"]*experiencia[^"]*\/page-[^"]*\.js/,
    )?.[0];
    expect(caminho, "não achei o chunk da página").toBeTruthy();

    const js = await (await fetch(`${SITE}${caminho}`)).text();
    expect(js).toContain("100vw");
    expect(js).toContain("quality:90");
    // Contain e não cover: recortar a foto da churrasqueira ao ampliar seria o
    // oposto do que a galeria existe para fazer.
    expect(js).toContain("object-contain");
  });

  it("os ingressos explicam quem paga meia e quem não paga", async () => {
    // A regra vem do bot_description no Sistur, editável pelo operador. O
    // formulário do WordPress explicava; o novo tinha perdido isso.
    const t = await texto(`/reservar/day-use/?entrada=${daqui(40)}`);
    expect(t).toMatch(/6 a 12 anos/);
    expect(t).toMatch(/n[ãa]o pagam/);
  });

  it("o formulário oferece a churrasqueira física, não a tarifa", async () => {
    // Trocar "Churrasqueira Grande (A)" por "Churrasqueira A4" é o que permite
    // dizer se AQUELA está livre e mostrar as fotos DELA.
    const t = await texto(`/reservar/day-use/?entrada=${daqui(40)}`);
    expect(t).toMatch(/Churrasqueira A\d/);
    expect(t).toMatch(/Churrasqueira B\d/);
    expect(t).not.toMatch(/Churrasqueira Grande \(A\)/);
  });

  it("cada churrasqueira traz suas próprias fotos", async () => {
    const html = await (await fetch(`${SITE}/reservar/day-use/?entrada=${daqui(40)}`)).text();
    expect(html).toContain("wp-content/uploads");
    // No HTML cru o React separa {n} de " fotos" com um comentário; comparar no
    // texto já limpo em vez de casar a marcação.
    expect(await texto(`/reservar/day-use/?entrada=${daqui(40)}`)).toMatch(/\d+ fotos/);
  });

  it("esportes e estacionamento saíram do formulário", async () => {
    const t = await texto(`/reservar/day-use/?entrada=${daqui(40)}`);
    for (const fora of [/tirolesa/i, /arvorismo/i, /estacionamento/i]) {
      expect(t).not.toMatch(fora);
    }
  });

  it("os adicionais aparecem nas seções que o Sistur mantém", async () => {
    // "Permitido som" vs "Sossego" é o que decide a escolha da churrasqueira, e
    // estava só no banco.
    const t = await texto(`/reservar/day-use/?entrada=${daqui(40)}`);
    expect(t).toMatch(/Churrasqueiras/);
    expect(t).toMatch(/Permitido som/);
    expect(t).toMatch(/Proibido som/);
  });

  it("churrasqueiras vêm em acordeão; ingressos e esportes ficam abertos", async () => {
    // A regra sai da forma da árvore: seção com subseções vira acordeão, seção
    // plana fica aberta. Um grupo novo no admin se encaixa sozinho.
    const html = await (await fetch(`${SITE}/reservar/day-use/?entrada=${daqui(40)}`)).text();
    const t = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

    // Churrasqueiras (com Área A e Área B) + as duas áreas = 3 acordeões.
    expect(html.match(/<details/g) ?? []).toHaveLength(3);
    // Nada escolhido: todos fechados.
    expect(html).not.toContain("<details open");
    // Ingressos ficam fora do mecanismo — são o ponto da etapa.
    expect(t).toMatch(/Meia-Entrada/);
  });

  it("o acordeão abre sozinho quando já há churrasqueira escolhida dentro", async () => {
    // Descobre um recurso real da Área A e o seleciona por `r<id>`. Deixar a
    // escolha atrás de um cabeçalho fechado esconderia o que a pessoa acabou de
    // marcar.
    const d = daqui(40);
    const api = process.env.SISTUR_API_URL!;
    const disp = await (
      await fetch(
        `${api}/api/public/reservas/disponibilidade?source_id=1&category_id=1` +
          `&check_in=${d}&check_out=${d}`,
      )
    ).json();
    const areaA = disp.resources.find((r: { group_name: string }) =>
      /grandes \(A\)/i.test(r.group_name),
    );
    expect(areaA, "esperava uma churrasqueira da Área A").toBeTruthy();

    const html = await (await fetch(
      `${SITE}/reservar/day-use/?entrada=${d}&i1=1&r${areaA.id}=1`,
    )).text();
    // Churrasqueiras + a área que contém a escolhida.
    expect(html.match(/<details open/g) ?? []).toHaveLength(2);
    expect(html.replace(/<[^>]*>/g, " ")).toMatch(/1 selecionada/);
  });

  it("estacionamento interno não aparece no formulário", async () => {
    // Escondido por visible_to_web no Sistur, não por filtro no frontend.
    const t = await texto(`/reservar/day-use/?entrada=${daqui(40)}`);
    expect(t).not.toMatch(/estacionamento/i);
  });

  it("as churrasqueiras mostram capacidade", async () => {
    const html = await (await fetch(`${SITE}/reservar/day-use/?entrada=${daqui(40)}`)).text();
    expect(html).toMatch(/capacidade para at[ée]/);
  });

  it("o carrinho fixo traz o total e o botão de avançar", async () => {
    const t = await texto(`/reservar/day-use/?entrada=${daqui(40)}&i1=2&i2=1`);
    expect(t).toMatch(/Continuar/);
    expect(t).toMatch(/R\$/);
  });

  it("sem seleção, o carrinho diz o que falta", async () => {
    expect(await texto("/reservar/day-use/")).toMatch(/Escolha a data/);
    expect(await texto(`/reservar/day-use/?entrada=${daqui(40)}`)).toMatch(
      /Escolha ao menos um ingresso/,
    );
  });

  it("o carrinho mostra o desconto", async () => {
    const t = await texto(`/reservar/day-use/?entrada=${daqui(40)}&i1=2&i2=1`);
    // Regressão do category_id ausente: sem ele o desconto sumia.
    expect(t).toMatch(/desconto de R\$/i);
  });

  it("data inválida é recusada com mensagem, sem derrubar a página", async () => {
    expect(await texto("/reservar/day-use/?entrada=abc")).toMatch(/inválida/i);
    expect(await texto("/reservar/day-use/?entrada=2027-02-31")).toMatch(/inválida/i);
    expect(await texto("/reservar/day-use/?entrada=2020-01-01")).toMatch(/a partir de hoje/i);
  });

  it("quantidade corrompida não derruba o resto da seleção", async () => {
    const t = await texto(`/reservar/day-use/?entrada=${daqui(40)}&i1=2&i2=abc`);
    expect(t).toMatch(/R\$/);
    expect(t).toMatch(/Continuar/);
  });

  it("o passo 3 exige a seleção completa", async () => {
    // Sem datas nem itens, deve voltar ao passo 2 em vez de renderizar um
    // formulário que não pode dar certo.
    const res = await fetch(`${SITE}/reservar/day-use/dados/`, { redirect: "follow" });
    expect(res.url).toMatch(/\/reservar\/day-use\/$/);

    const semItens = await fetch(`${SITE}/reservar/day-use/dados/?entrada=${daqui(40)}`, {
      redirect: "follow",
    });
    expect(semItens.url).not.toMatch(/\/dados\//);
  });

  it("o passo 3 carrega a churrasqueira escolhida no passo 2", async () => {
    // O defeito relatado: a seleção sumia entre os passos e a reserva nascia só
    // com o ingresso. O passo 3 lia `i<id>` e nunca `r<id>`.
    const d = daqui(40);
    const api = process.env.SISTUR_API_URL!;
    const disp = await (
      await fetch(
        `${api}/api/public/reservas/disponibilidade?source_id=1&category_id=1` +
          `&check_in=${d}&check_out=${d}`,
      )
    ).json();
    const churras = disp.resources[0];
    expect(churras, "esperava uma churrasqueira disponível").toBeTruthy();

    const html = await (await fetch(
      `${SITE}/reservar/day-use/dados/?entrada=${d}&i1=1&r${churras.id}=1`,
    )).text();
    // Precisa viajar como campo do formulário, senão a Server Action não a vê.
    expect(html).toContain(`name="r${churras.id}"`);

    const t = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]*>/g, " ");
    expect(t).toMatch(/Espaço reservado/);
    expect(t).toMatch(new RegExp(churras.name));
    // E o total precisa contar a churrasqueira, não só o ingresso.
    expect(t).toMatch(new RegExp(churras.item_name.replace(/[()]/g, "\\$&")));
  });

  it("o passo 3 aceita só a churrasqueira, sem ingresso", async () => {
    const d = daqui(41);
    const api = process.env.SISTUR_API_URL!;
    const disp = await (
      await fetch(
        `${api}/api/public/reservas/disponibilidade?source_id=1&category_id=1` +
          `&check_in=${d}&check_out=${d}`,
      )
    ).json();
    const res = await fetch(
      `${SITE}/reservar/day-use/dados/?entrada=${d}&r${disp.resources[0].id}=1`,
      { redirect: "follow" },
    );
    expect(res.url).toMatch(/\/dados\//);
  });

  it("o passo 3 mostra os dados pedidos e repete o total", async () => {
    const t = await texto(`/reservar/day-use/dados/?entrada=${daqui(40)}&i1=2&i2=1`);
    expect(t).toMatch(/Sua reserva/);
    expect(t).toMatch(/Nome completo/i);
    expect(t).toMatch(/CPF/);
    expect(t).toMatch(/E-mail/i);
    expect(t).toMatch(/Telefone/i);
    expect(t).toMatch(/Total/);
  });

  it("o seletor é indexável — é entrada de anúncio e link direto", async () => {
    const html = await (await fetch(`${SITE}/reservar/`)).text();
    expect(html).not.toMatch(/noindex/);
  });

  it("etapas que carregam seleção não são indexáveis", async () => {
    for (const c of [
      "/reservar/day-use/",
      `/reservar/day-use/dados/?entrada=${daqui(40)}&i1=1`,
      "/reservar/day-use/confirmacao/?r=x",
    ]) {
      const html = await (await fetch(`${SITE}${c}`)).text();
      expect(html, c).toMatch(/noindex/);
    }
  });

  it("a confirmação diz que ainda não está paga", async () => {
    // Enquanto o pagamento não existe, a página não pode dar a entender que sim.
    const t = await texto("/reservar/day-use/confirmacao/?r=abc-123");
    expect(t).toMatch(/n[ãa]o est[áa] paga/i);
    expect(t).toMatch(/abc-123/);
  });
});

descreve("home", () => {
  it("continua cacheável", async () => {
    // O seletor lê o Sistur; se alguém torná-la dinâmica, cai o cache.
    const res = await fetch(`${SITE}/`);
    expect(res.headers.get("cache-control")).toMatch(/s-maxage/);
  });
});

descreveCria("pagamento", () => {
  it("a página monta o Brick com a chave pública e o total", async () => {
    const g = await reservar();
    const html = await (await fetch(`${SITE}/reservar/day-use/pagamento/?r=${g}`)).text();
    expect(html).toContain("brick-pagamento");
    expect(html).toMatch(/APP_USR-/); // public key do Mercado Pago
    expect(html).toMatch(/Total a pagar/);
  });

  it("não expõe o CPF de quem reservou", async () => {
    // O group_id viaja na URL; qualquer coisa impressa aqui é legível por quem
    // tiver o link.
    const g = await reservar();
    const html = await (await fetch(`${SITE}/reservar/day-use/pagamento/?r=${g}`)).text();
    expect(html).not.toContain("52998224725");
    expect(html).not.toContain("529.982.247-25");
  });

  it("código inexistente não vira formulário de pagamento", async () => {
    const t = await texto(
      "/reservar/day-use/pagamento/?r=00000000-0000-0000-0000-000000000000",
    );
    expect(t).toMatch(/não encontrada/i);
    const html = await (
      await fetch(`${SITE}/reservar/day-use/pagamento/?r=00000000-0000-0000-0000-000000000000`)
    ).text();
    expect(html).not.toContain("brick-pagamento");
  });

  it("sem código, não monta o Brick", async () => {
    const html = await (await fetch(`${SITE}/reservar/day-use/pagamento/`)).text();
    expect(html).not.toContain("brick-pagamento");
  });

  it("o proxy recusa payload malformado antes de cobrar", async () => {
    for (const corpo of [{}, { group_id: "nao-e-uuid" }]) {
      const res = await fetch(`${SITE}/api/pagamento/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      expect(res.status).toBe(400);
    }
  });

  it("o proxy recusa reserva inexistente", async () => {
    const res = await fetch(`${SITE}/api/pagamento/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        group_id: "00000000-0000-0000-0000-000000000000",
        payment_method_id: "pix",
      }),
    });
    expect(res.status).toBe(404);
  });

  it("o token interno do Sistur nunca chega ao navegador", async () => {
    const g = await reservar();
    const html = await (await fetch(`${SITE}/reservar/day-use/pagamento/?r=${g}`)).text();
    const token = process.env.SISTUR_INTERNAL_TOKEN;
    if (token) expect(html).not.toContain(token);
    expect(html).not.toContain(process.env.SISTUR_WEB_API_KEY!);
  });

  it("a confirmação não acredita no status vindo da URL", async () => {
    // ?s=approved numa reserva não paga não pode produzir "confirmada".
    const g = await reservar();
    const t = await texto(`/reservar/day-use/confirmacao/?r=${g}&s=approved`);
    expect(t).not.toMatch(/Pagamento aprovado/i);
    expect(t).toMatch(/Ainda não está paga|Aguardando/i);
  });
});

descreve("status do pagamento (polling do PIX)", () => {
  it("pagamento sem webhook ainda responde pending, não erro", async () => {
    // Enquanto o webhook do Mercado Pago não chega, o Sistur devolve 404. A tela
    // precisa continuar esperando em vez de anunciar falha para quem já pagou.
    const res = await fetch(`${SITE}/api/pagamento/status/?p=999999999`);
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("pending");
  });

  it("id malformado é recusado sem consultar o Sistur", async () => {
    for (const p of ["", "abc", "'; DROP TABLE", "1e9"]) {
      const r = await fetch(`${SITE}/api/pagamento/status/?p=${encodeURIComponent(p)}`);
      expect(r.status, `p=${p}`).toBe(400);
    }
  });

});

descreveCria("status do pagamento — com reserva de verdade", () => {
  it("também aceita consulta só pela reserva", async () => {
    // A reserva é a fonte autoritativa: ela vira paga por webhook, por
    // reprocessamento manual ou no balcão. Só perguntar pelo payment_id deixava
    // o cliente olhando um QR de algo já quitado.
    const g = await reservar();
    const res = await fetch(`${SITE}/api/pagamento/status/?r=${g}`);
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("pending");
  });

  it("responde pela reserva sem exigir um payment_id", async () => {
    const g = await reservar();
    const api = process.env.SISTUR_API_URL!;
    const antes = await (
      await fetch(`${api}/api/public/reservas/${g}/pagamento`, {
        headers: { "X-Web-Api-Key": process.env.SISTUR_WEB_API_KEY! },
      })
    ).json();
    expect(antes.status).toBe("PENDING");

    // Marcar a reserva como paga exige ação de operador, fora do alcance deste
    // teste. O que fica travado aqui é o caminho: a rota consulta a reserva e
    // responde por ela mesmo sem payment_id nenhum.
    const res = await fetch(`${SITE}/api/pagamento/status/?r=${g}`);
    const corpo = await res.json();
    expect(corpo.payment_id).toBeNull();
    expect(corpo.status).toBe("pending");
    expect(corpo.indisponivel).toBe(false);
  });

  it("sem nenhum parâmetro válido, recusa", async () => {
    const r = await fetch(`${SITE}/api/pagamento/status/?r=nao-e-uuid`);
    expect(r.status).toBe(400);
  });

  it("a resposta do status nunca é cacheada", async () => {
    const res = await fetch(`${SITE}/api/pagamento/status/?p=123456789`);
    expect(res.headers.get("cache-control")).toMatch(/no-store/);
  });
});

descreve("camping — a hora é preço", () => {
  const d = (n: number) => {
    const x = new Date();
    x.setUTCDate(x.getUTCDate() + n);
    return x.toISOString().slice(0, 10);
  };

  /** Lê o orçamento que o servidor embutiu na página. */
  async function totalDe(query: string): Promise<{ horas: number; total: number }> {
    const html = await (
      await fetch(`${SITE}/reservar/camping/?${query}`, { redirect: "follow" })
    ).text();
    const horas = html.match(/\\"total_hours\\":(\d+)/);
    const total = html.match(/\\"total\\":([\d.]+)/);
    expect(horas, "a página não trouxe total_hours").not.toBeNull();
    return { horas: Number(horas![1]), total: Number(total![1]) };
  }

  it("pede hora de entrada e de saída, com os limites da portaria", async () => {
    const t = await texto(`/reservar/camping/?entrada=${d(30)}&saida=${d(31)}`);
    expect(t).toMatch(/Hora de entrada/);
    expect(t).toMatch(/Hora de saída/);
    // Os limites vêm da categoria no Sistur, não de constante no site.
    expect(t).toMatch(/Portaria aberta das 08:00 às 17:00/);
    expect(t).toMatch(/Permanência mínima de 24 horas/);
  });

  it("o day use não pede hora — lá ela não entra no preço", async () => {
    const t = await texto(`/reservar/day-use/?entrada=${d(30)}`);
    expect(t).not.toMatch(/Hora de entrada/);
  });

  it("33 horas custam mais que 24 na mesma tarifa", async () => {
    // É a razão de todo o trabalho de horário existir: mandar só a data
    // anunciaria o preço de 24h e a portaria cobraria o de 33.
    const longa = await totalDe(`entrada=${d(30)}&saida=${d(31)}&he=08:00&hs=17:00&i18=2`);
    const curta = await totalDe(`entrada=${d(30)}&saida=${d(31)}&he=14:00&hs=14:00&i18=2`);
    expect(longa.horas).toBe(33);
    expect(curta.horas).toBe(24);
    expect(longa.total).toBeGreaterThan(curta.total);
  });

  it("abre em diárias cheias, no preço base e em número redondo", async () => {
    // Abrir em 08:00 → 17:00 dava 33 horas e R$ 123,75 antes de a pessoa
    // escolher nada — um valor quebrado que parecia arbitrário. Mesma hora nas
    // duas pontas dá a diária cheia, e o total só sai do redondo quando o
    // cliente mexe, que é quando ele entende por quê.
    const uma = await totalDe(`entrada=${d(30)}&saida=${d(31)}&i18=2`);
    const duas = await totalDe(`entrada=${d(30)}&saida=${d(32)}&i18=2`);
    expect(uma.horas).toBe(24);
    expect(duas.horas).toBe(48);
    expect(duas.total).toBeCloseTo(uma.total * 2, 2);
  });

  it("mudar só a entrada não quebra a estadia mínima", async () => {
    // A saída acompanha a entrada enquanto ninguém a escolheu. Sem isso, mover
    // a entrada para 10:00 deixava a saída às 08:00, caía para 22 horas e
    // batia no mínimo de 24 — um erro que a pessoa não pediu.
    const t = await texto(`/reservar/camping/?entrada=${d(30)}&saida=${d(31)}&he=10:00`);
    expect(t).not.toMatch(/Permanência mínima: 24 horas/i);
    expect(t).toMatch(/24 horas — 1 diária cheia/);
  });

  it("diz quantas horas a escolha tem, para o total não parecer arbitrário", async () => {
    const t = await texto(
      `/reservar/camping/?entrada=${d(30)}&saida=${d(31)}&he=08:00&hs=17:00`,
    );
    expect(t).toMatch(/33 horas — 1 diária mais 9 horas proporcionais/);
  });

  it("pool é contador, unidade é card — quem decide é o estoque", async () => {
    // 8 barracas pequenas são intercambiáveis: ninguém quer escolher QUAL, só
    // quantas. A churrasqueira A4 não é intercambiável com a A1, e a foto é
    // dela. Oferecer as duas do mesmo jeito punha um card "Selecionar" no meio
    // de cinco contadores.
    const html = await (
      await fetch(`${SITE}/reservar/camping/?entrada=${d(30)}&saida=${d(31)}`, {
        redirect: "follow",
      })
    ).text();
    const texto = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]*>/g, " ");
    const cards = texto.match(/Selecionar/g)?.length ?? 0;
    const pits = texto.match(/Churrasqueira [AB]\d/g)?.length ?? 0;
    expect(cards).toBeGreaterThan(0);
    expect(cards).toBe(pits);
  });

  it("recusa entrada fora do horário da portaria", async () => {
    const t = await texto(
      `/reservar/camping/?entrada=${d(30)}&saida=${d(31)}&he=06:00&hs=17:00`,
    );
    expect(t).toMatch(/entrada é permitida entre 08:00 e 17:00/i);
  });

  it("recusa permanência abaixo de 24 horas", async () => {
    const t = await texto(
      `/reservar/camping/?entrada=${d(30)}&saida=${d(31)}&he=09:00&hs=08:00`,
    );
    expect(t).toMatch(/Permanência mínima: 24 horas/i);
  });

  it("mostra os itens de camping, não só ingressos", async () => {
    const t = await texto(`/reservar/camping/?entrada=${d(30)}&saida=${d(31)}`);
    // Barraca e colchão são itens com quantidade; a churrasqueira é unidade
    // física, e tem de aparecer pelo nome DELA (A1, B2), não pela tarifa.
    expect(t).toMatch(/Itens para Camping/);
    expect(t).toMatch(/Barraca Pequena/);
    expect(t).toMatch(/Colchão Casal/);
    expect(t).toMatch(/Churrasqueiras/);
    // Churrasqueira é unidade: aparece pelo nome DELA, nunca pela tarifa.
    expect(t).toMatch(/Churrasqueira A4/);
    expect(t).not.toMatch(/Churrasqueira Pequena \(A\)/);
    // Uma seção só. Decidir card-ou-contador tarifa a tarifa partia "Itens
    // para Camping" em duas, com o mesmo título aparecendo duas vezes.
    expect(t.match(/Itens para Camping/g)).toHaveLength(1);
  });
});

descreveCria("camping — a hora sobrevive à criação", () => {
  const d = (n: number) => {
    const x = new Date();
    x.setUTCDate(x.getUTCDate() + n);
    return x.toISOString().slice(0, 10);
  };

  it("a reserva nasce com o total que foi simulado, hora incluída", async () => {
    const api = process.env.SISTUR_API_URL!;
    const chave = process.env.SISTUR_WEB_API_KEY!;
    const ci = `${d(60)}T08:00`;
    const co = `${d(61)}T17:00`;

    const sim = await (
      await fetch(`${api}/reservas/api/public/simular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: 1,
          category_id: 2,
          check_in_date: ci,
          check_out_date: co,
          items: [{ item_id: 18, quantity: 2 }],
        }),
      })
    ).json();
    expect(sim.items_breakdown[0].total_hours).toBe(33);

    const { ratearTotal } = await import("./itens");
    const res = await fetch(`${api}/api/public/reservas/criar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Web-Api-Key": chave },
      body: JSON.stringify({
        source_id: 1,
        category_id: 2,
        customer_name: "Regressao Camping Silva",
        customer_document: "529.982.247-25",
        email: "camping@exemplo.com.br",
        telefone: "(64) 99999-0000",
        check_in_date: ci,
        check_out_date: co,
        items: ratearTotal(sim),
      }),
    });
    const corpo = await res.json();
    descartarDepois(corpo?.group_id);

    // Truncar a hora aqui fazia a reserva nascer barata: o Sistur montava
    // meia-noite → meia-noite, 24 horas, e cobrava menos que o simulado.
    expect(res.status, JSON.stringify(corpo)).toBe(201);
    expect(corpo.total).toBeCloseTo(sim.total, 2);
  });
});

descreve("proxies do site aceitam a hora", () => {
  /**
   * O buraco que deixou isto passar: todo teste anterior lia o HTML que o
   * servidor renderiza, e o servidor chama o Sistur direto. Os proxies só
   * entram quando o navegador atualiza a tela — trocar uma quantidade, mudar
   * uma data. Eles recusavam o "T" com 400, e a tela dizia que não era
   * possível calcular o valor no momento.
   */
  const d = (n: number) => {
    const x = new Date();
    x.setUTCDate(x.getUTCDate() + n);
    return x.toISOString().slice(0, 10);
  };

  it("/api/simular/ aceita instante com hora", async () => {
    const res = await fetch(`${SITE}/api/simular/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_id: 1,
        category_id: 2,
        check_in_date: `${d(30)}T08:00`,
        check_out_date: `${d(31)}T17:00`,
        items: [{ item_id: 18, quantity: 2 }],
      }),
    });
    expect(res.status).toBe(200);
    const corpo = await res.json();
    expect(corpo.items_breakdown[0].total_hours).toBe(33);
  });

  it("/api/recursos/ aceita instante com hora", async () => {
    const q = new URLSearchParams({
      source_id: "1",
      category_id: "2",
      check_in: `${d(30)}T08:00`,
      check_out: `${d(31)}T17:00`,
    });
    const res = await fetch(`${SITE}/api/recursos/?${q}`);
    expect(res.status).toBe(200);
    expect((await res.json()).resources.length).toBeGreaterThan(0);
  });

  it("continuam recusando lixo", async () => {
    for (const v of ["", "amanhã", "2026-13-99", "2026-10-01T08:00:00"]) {
      const q = new URLSearchParams({
        source_id: "1",
        category_id: "2",
        check_in: v,
        check_out: v,
      });
      const r = await fetch(`${SITE}/api/recursos/?${q}`);
      expect(r.status, `check_in=${v}`).toBe(400);
    }
  });
});

descreve("a conta aberta", () => {
  const d = (n: number) => {
    const x = new Date();
    x.setUTCDate(x.getUTCDate() + n);
    return x.toISOString().slice(0, 10);
  };

  it("o day use abre item, subtotal, desconto pelo nome e total", async () => {
    const t = await texto(`/reservar/day-use/?entrada=${d(30)}&i1=2&i2=1`);
    expect(t).toMatch(/Ver detalhes do valor/);
    expect(t).toMatch(/2 × R\$/);
    expect(t).toMatch(/Subtotal/);
    // O desconto pelo nome e percentual. Antes dizia só "Desconto".
    expect(t).toMatch(/Reserva Antecipada \(\d+%\)/);
    expect(t).toMatch(/Total/);
  });

  it("o camping explica o pró-rata que faz o número parecer arbitrário", async () => {
    const t = await texto(
      `/reservar/camping/?entrada=${d(30)}&saida=${d(31)}&he=08:00&hs=17:00&i18=2`,
    );
    expect(t).toMatch(/1 diária \+ 9h/);
    expect(t).toMatch(/tarifa R\$/);
  });

  it("em diárias cheias não fala em tarifa base — não há o que explicar", async () => {
    const t = await texto(`/reservar/camping/?entrada=${d(30)}&saida=${d(31)}&i18=2`);
    expect(t).toMatch(/1 diária/);
    expect(t).not.toMatch(/tarifa R\$/);
  });

  it("o passo 3 mostra a mesma conta, aberta", async () => {
    // Ali a pessoa está confirmando o que vai pagar; esconder a conta atrás de
    // um clique seria esconder o que ela veio ver.
    const t = await texto(`/reservar/day-use/dados/?entrada=${d(30)}&i1=2&i2=1`);
    expect(t).toMatch(/Subtotal/);
    expect(t).toMatch(/Reserva Antecipada \(\d+%\)/);
    expect(t).not.toMatch(/Ver detalhes do valor/);
  });

  it("passo 2 e passo 3 contam a mesma história", async () => {
    const q = `entrada=${d(30)}&saida=${d(31)}&he=08:00&hs=17:00&i18=2`;
    const p2 = await texto(`/reservar/camping/?${q}`);
    const p3 = await texto(`/reservar/camping/dados/?${q}`);
    const subtotal = (s: string) => s.match(/Subtotal\s+R\$[\s ]*([\d.,]+)/)?.[1];
    expect(subtotal(p2)).toBeTruthy();
    expect(subtotal(p3)).toBe(subtotal(p2));
  });
});

descreve("a home como convite", () => {
  it("o cabeçalho é fixo e a home o deixa passar por trás da hero", async () => {
    const html = await (await fetch(`${SITE}/`, { redirect: "follow" })).text();
    expect(html).toMatch(/fixed inset-x-0 top-0 z-50/);
    // Sem espaçador: a hero começa no topo da tela de propósito.
    expect(html).not.toMatch(/class="h-20"/);
  });

  it("página sem hero empurra o conteúdo para baixo do cabeçalho", async () => {
    // O cabeçalho é fixo, logo sai do fluxo. Sem o espaçador o primeiro
    // parágrafo de /fotos/ nasceria escondido atrás do menu.
    const html = await (await fetch(`${SITE}/fotos/`, { redirect: "follow" })).text();
    expect(html).toMatch(/class="h-20"/);
    expect(html).toMatch(/bg-\[var\(--c-bg\)\]\/95/);
  });

  it("os cartões revelam no mouse mas nunca escondem no toque", async () => {
    // Em telefone não existe apontar. Conteúdo só no :hover sumiria para a
    // maioria de quem acessa — e é o que faz decidir entre day use e camping.
    const html = await (await fetch(`${SITE}/`, { redirect: "follow" })).text();
    expect(html).toMatch(/pointer-fine:opacity-0/);
    expect(html).toMatch(/pointer-fine:group-hover:opacity-100/);
    // Teclado chega ao botão por Tab; ele não pode estar invisível no foco.
    expect(html).toMatch(/pointer-fine:group-focus-within:opacity-100/);
  });

  it("o CSS entregue traz mesmo a media query, não só a classe", async () => {
    const html = await (await fetch(`${SITE}/`, { redirect: "follow" })).text();
    const css = html.match(/\/_next\/static\/css\/[^"]+\.css/)?.[0];
    expect(css, "a home não referenciou nenhum CSS").toBeTruthy();
    const folha = await (await fetch(`${SITE}${css}`)).text();
    // Classe presente no HTML não prova regra emitida: se o Tailwind não
    // conhecesse a variante, tudo ficaria visível e ninguém notaria no desktop.
    expect(folha).toMatch(/@media\s*\(pointer:\s*fine\)/);
  });
});

descreve("hierarquia visual da home", () => {
  async function markup(): Promise<string> {
    const html = await (await fetch(`${SITE}/`, { redirect: "follow" })).text();
    // O payload RSC repete as mesmas classes dentro de <script>; contar sem
    // tirá-lo dá o dobro e esconde se algo deixou de renderizar.
    return html.replace(/<script[\s\S]*?<\/script>/g, "");
  }

  it("cada item da estrutura é um cartão, não texto solto no branco", async () => {
    const m = await markup();
    const cartoes = m.match(/border border-\[var\(--c-border\)\] bg-\[var\(--c-bg\)\] p-6/g);
    expect(cartoes?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("foto com texto ganha gradiente direcional, não véu parelho", async () => {
    // Véu uniforme apaga a paisagem; gradiente escurece só onde o texto pousa.
    const m = await markup();
    expect(m).toMatch(/from-black\/80 via-black\/30 to-transparent/);
    expect(m).not.toMatch(/-z-10 bg-black\/35/);
  });

  it("a tabela de valores é clara com cartões escuros, não um bloco verde", async () => {
    const m = await markup();
    expect(m).toMatch(/bg-\[var\(--c-surface\)\] py-14/);
    const cards = m.match(/rounded-xl bg-\[var\(--c-panel\)\]/g);
    expect(cards?.length ?? 0).toBeGreaterThan(0);
  });

  it("o Reservar da tabela é sólido e ocupa a largura do cartão", async () => {
    // Contorno vazado lê como ação secundária, e é a única ação do bloco.
    const m = await markup();
    const solidos = m.match(/w-full items-center justify-center\s+rounded-lg bg-\[var\(--c-on-panel\)\]/g);
    expect(solidos?.length ?? 0).toBeGreaterThan(0);
    expect(m).not.toMatch(/border border-white\/70/);
  });
});

descreve("tema noturno do camping", () => {
  const d = (n: number) => {
    const x = new Date();
    x.setUTCDate(x.getUTCDate() + n);
    return x.toISOString().slice(0, 10);
  };

  it("veste o camping e deixa o day use em paz", async () => {
    // O tema sai da categoria, não do slug: é decisão de aparência do operador,
    // e um céu estrelado numa visita à vinícola ficaria deslocado.
    const camping = await (
      await fetch(`${SITE}/reservar/camping/?entrada=${d(30)}&saida=${d(31)}`)
    ).text();
    const dayUse = await (
      await fetch(`${SITE}/reservar/day-use/?entrada=${d(30)}`)
    ).text();
    expect(camping).toMatch(/data-tema="noturno"/);
    expect(dayUse).not.toMatch(/data-tema="noturno"/);
  });

  it("a barraca não existe no celular e não rouba toque em lugar nenhum", async () => {
    const html = await (
      await fetch(`${SITE}/reservar/camping/?entrada=${d(30)}&saida=${d(31)}`)
    ).text();
    // Garantias, não nomes de classe: o enfeite não aparece no celular, não
    // recebe toque, e encosta no canto. Travar a largura exata fazia o teste
    // quebrar toda vez que a arte era redimensionada.
    const bloco = html.match(/<div aria-hidden="true" class="pointer-events-none fixed bottom-0[^"]*"/)?.[0];
    expect(bloco, "não achei o contêiner da barraca").toBeTruthy();
    expect(bloco).toMatch(/\bhidden\b/);
    expect(bloco).toMatch(/\blg:block\b/);
    expect(bloco).toMatch(/\bright-0\b/);
  });

  it("o cenário é uma camada só, e nenhuma parte dele recebe clique", async () => {
    // Céu, lua, estrelas e chão juntos: z-index e pointer-events de enfeite
    // decididos num arquivo, em vez de três componentes que precisam concordar
    // para o formulário continuar clicável.
    const html = await (
      await fetch(`${SITE}/reservar/camping/?entrada=${d(30)}&saida=${d(31)}`)
    ).text();
    expect(html).toMatch(/pointer-events-none fixed inset-0 -z-10/);
    expect(html).toMatch(/class="lua/);
    expect(html).toMatch(/chao-noturno/);
    // O formulário fica acima de tudo isso.
    expect(html).toMatch(/relative z-10 mx-auto max-w-4xl/);
  });

  it("o chão e a lua chegam à folha entregue", async () => {
    const html = await (await fetch(`${SITE}/reservar/camping/`)).text();
    const css = html.match(/\/_next\/static\/css\/[^"]+\.css/)?.[0];
    const folha = await (await fetch(`${SITE}${css}`)).text();
    expect(folha).toMatch(/\.lua\{/);
    expect(folha).toMatch(/\.chao-noturno\{/);
    // A borda da barraca dissolve antes de encostar na coluna do formulário.
    expect(folha).toMatch(/\.barraca-cenario\{[^}]*mask-image/);
  });

  it("o cenário sai da biblioteca, e é uma imagem que carrega", async () => {
    // Ela vem por etiqueta própria: buscar por "camping" traria também a foto
    // do cartão da experiência, e o canto viraria uma paisagem esticada.
    const html = await (
      await fetch(`${SITE}/reservar/camping/?entrada=${d(30)}&saida=${d(31)}`)
    ).text();
    const src = html
      .match(/src="\/_next\/image\/\?url=[^"]*midia[^"]*"/)?.[0]
      ?.replace(/^src="/, "")
      .replace(/"$/, "")
      .replace(/&amp;/g, "&");
    expect(src, "o cenário não veio da biblioteca de mídia").toBeTruthy();
    const res = await fetch(`${SITE}${src}`);
    expect(res.status).toBe(200);
  });

  it("o texto que ficou sobre o céu clareia junto", async () => {
    // Sem isto a descrição da experiência continuava #5b6b7c sobre azul-noite.
    const html = await (
      await fetch(`${SITE}/reservar/camping/?entrada=${d(30)}&saida=${d(31)}`)
    ).text();
    expect(html).toMatch(/fora-do-card/);
  });

  it("o céu cobre a viewport inteira, não só a coluna do formulário", async () => {
    // A camada é fixa e renderizada no servidor: um useEffect no body pintaria
    // a página clara primeiro e escureceria depois, piscando a cada carga.
    const html = await (
      await fetch(`${SITE}/reservar/camping/?entrada=${d(30)}&saida=${d(31)}`)
    ).text();
    // A camada do cenário cobre a viewport e fica atrás de tudo; o céu vive
    // dentro dela. Antes o céu era ele próprio o fixed — mudou quando lua e
    // chão entraram, e a garantia é a mesma.
    expect(html).toMatch(/pointer-events-none fixed inset-0 -z-10/);
    expect(html).toMatch(/ceu-noturno/);
    // E o cabeçalho entra no tema em vez de ficar uma faixa branca por cima.
    expect(html).toMatch(/border-b border-white\/10 bg-transparent/);
  });

  it("o day use mantém o cabeçalho claro", async () => {
    const html = await (await fetch(`${SITE}/reservar/day-use/?entrada=${d(30)}`)).text();
    expect(html).not.toMatch(/ceu-noturno/);
    expect(html).toMatch(/border-\[var\(--c-border\)\] bg-\[var\(--c-bg\)\]/);
  });

  it("o vidro do card não sacrifica a legibilidade", async () => {
    // Com o card a 10% o texto secundário fica em 1,1:1 contra o fundo e o
    // WCAG AA pede 4,5:1. A 85% o céu atravessa e o texto continua legível.
    const html = await (await fetch(`${SITE}/reservar/camping/`)).text();
    const css = html.match(/\/_next\/static\/css\/[^"]+\.css/)?.[0];
    const folha = await (await fetch(`${SITE}${css}`)).text();
    const regra = folha.match(/\[data-tema=["']?noturno["']?\]\s*\.f-card\{[^}]*\}/)?.[0] ?? "";
    expect(regra, "não achei a regra do card no CSS entregue").toBeTruthy();
    // #ffffffd9 é 0.85 em hex; o que não pode é despencar para transparente.
    expect(regra).toMatch(/background:\s*#ffffffd9/);
    expect(regra).toMatch(/--c-muted:\s*#4a5768/);
  });

  it("as regras do tema chegam mesmo na folha entregue", async () => {
    const html = await (await fetch(`${SITE}/reservar/camping/`)).text();
    const css = html.match(/\/_next\/static\/css\/[^"]+\.css/)?.[0];
    expect(css).toBeTruthy();
    const folha = await (await fetch(`${SITE}${css}`)).text();
    // Sem aspas: o CSS compilado escreve [data-tema=noturno].
    expect(folha).toMatch(/\[data-tema=["']?noturno["']?\]/);
    // Campo branco sólido é inegociável — vidro fosco atrás de um <input>
    // destrói a legibilidade de quem digita CPF no sol.
    expect(folha).toMatch(/\[data-tema=["']?noturno["']?\]\s*\.f-input\s*\{\s*background:\s*#fff/);
  });
});
