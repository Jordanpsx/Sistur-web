import { describe, expect, it } from "vitest";

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

/** Fetches a page and strips tags, leaving the visible text. */
async function texto(caminho: string): Promise<string> {
  const res = await fetch(`${SITE}${caminho}`, { redirect: "follow" });
  expect(res.ok, `${caminho} respondeu ${res.status}`).toBe(true);
  const html = (await res.text()).replace(/<script[\s\S]*?<\/script>/g, "");
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

/** Cria uma reserva de verdade e devolve o group_id. */
async function reservar(): Promise<string> {
  const api = process.env.SISTUR_API_URL!;
  const chave = process.env.SISTUR_WEB_API_KEY!;
  const d = daqui(70);
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

  const { ratearTotal } = await import("./itens");
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
  return (await res.json()).group_id;
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
    const caminho = html.match(
      /\/_next\/static\/chunks\/app\/[^"]*experiencia[^"]*\.js/,
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

descreve("pagamento", () => {
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
