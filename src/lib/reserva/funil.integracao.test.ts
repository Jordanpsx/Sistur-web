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
    const itens = t.slice(t.indexOf("Ingressos"), t.indexOf("Resumo"));
    expect(itens).toMatch(/R\$/);
    expect(itens).toMatch(/nesta data|por diária/);
  });

  it("o resumo traz o total e o desconto", async () => {
    const t = await texto(`/reservar/day-use/?entrada=${daqui(40)}&i1=2&i2=1`);
    const resumo = t.slice(t.indexOf("Resumo"));
    expect(resumo).toMatch(/Total/);
    // Regressão do category_id ausente: sem ele o desconto sumia do resumo.
    expect(resumo).toMatch(/Desconto/);
  });

  it("data inválida é recusada com mensagem, sem derrubar a página", async () => {
    expect(await texto("/reservar/day-use/?entrada=abc")).toMatch(/inválida/i);
    expect(await texto("/reservar/day-use/?entrada=2027-02-31")).toMatch(/inválida/i);
    expect(await texto("/reservar/day-use/?entrada=2020-01-01")).toMatch(/a partir de hoje/i);
  });

  it("quantidade corrompida não derruba o resto da seleção", async () => {
    const t = await texto(`/reservar/day-use/?entrada=${daqui(40)}&i1=2&i2=abc`);
    expect(t.slice(t.indexOf("Resumo"))).toMatch(/Total/);
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

  it("o passo 3 mostra os dados pedidos e repete o total", async () => {
    const t = await texto(`/reservar/day-use/dados/?entrada=${daqui(40)}&i1=2&i2=1`);
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
