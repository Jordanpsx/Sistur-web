import { describe, expect, it } from "vitest";

/**
 * SEO: o que o buscador recebe deste ambiente.
 *
 * Rodam contra o site de pé, porque o que importa aqui é a resposta HTTP —
 * arquivo de configuração correto que não chega ao cliente não protege nada.
 */

const SITE = process.env.SITE_URL;
const descreve = SITE ? describe : describe.skip;

descreve("robots e sitemap", () => {
  it("staging bloqueia tudo", async () => {
    // Sem SITE_INDEXAVEL, o ambiente é tratado como não-produção. É opt-in de
    // propósito: staging indexado compete com produção pelos mesmos termos.
    const t = await (await fetch(`${SITE}/robots.txt`)).text();
    expect(t).toMatch(/User-Agent:\s*\*/i);
    expect(t).toMatch(/Disallow:\s*\/\s*$/m);
    expect(t).not.toMatch(/Allow:/);
  });

  it("o sitemap de staging não convida ninguém", async () => {
    const t = await (await fetch(`${SITE}/sitemap.xml`)).text();
    expect(t).not.toMatch(/<url>/);
  });

  it("os dois são dinâmicos, não congelados no build", async () => {
    // O build deste projeto não recebe variável nenhuma. Se estas rotas fossem
    // estáticas, a imagem de produção sairia com o robots do staging gravado e
    // o tráfego morreria em silêncio.
    for (const rota of ["/robots.txt", "/sitemap.xml"]) {
      const res = await fetch(`${SITE}${rota}`);
      expect(res.status, rota).toBe(200);
      expect(res.headers.get("cache-control"), rota).toMatch(
        /no-store|no-cache|max-age=0/,
      );
    }
  });
});

descreve("dados estruturados", () => {
  it("o grafo descreve o lugar, com endereço e coordenada", async () => {
    const html = await (await fetch(`${SITE}/`, { redirect: "follow" })).text();
    const bruto = html.match(
      /<script type="application\/ld\+json">(.*?)<\/script>/s,
    )?.[1];
    expect(bruto, "nenhum JSON-LD na home").toBeTruthy();

    const grafo = JSON.parse(bruto!);
    const lugar = grafo["@graph"].find((n: { "@type": unknown }) =>
      String(n["@type"]).includes("TouristAttraction"),
    );
    expect(lugar).toBeTruthy();
    expect(lugar.address.postalCode).toBe("72979-000");
    expect(lugar.address.addressLocality).toBe("Cocalzinho de Goiás");
    expect(lugar.geo.latitude).toBeCloseTo(-15.722427, 5);
    expect(lugar.geo.longitude).toBeCloseTo(-48.390884, 5);
    expect(lugar.openingHoursSpecification[0].opens).toBe("08:00");
  });

  it("aparece nas páginas de conteúdo, não só na home", async () => {
    // /fotos e /restaurante também são porta de entrada por busca.
    const html = await (await fetch(`${SITE}/fotos/`, { redirect: "follow" })).text();
    expect(html).toMatch(/application\/ld\+json/);
  });

  it("não inventa nota nem avaliação", async () => {
    // Dado estruturado sem lastro é penalizado, e nada disso vem de um sistema
    // nosso hoje.
    const html = await (await fetch(`${SITE}/`, { redirect: "follow" })).text();
    expect(html).not.toMatch(/aggregateRating|reviewCount|ratingValue/);
  });
});

descreve("compartilhamento", () => {
  it("nenhuma página do CMS sai sem imagem", async () => {
    // Link colado no WhatsApp sem og:image vira bloco de texto, num negócio que
    // se vende pela paisagem.
    for (const rota of ["/", "/fotos/", "/termos/", "/sobre-nos/"]) {
      const html = await (await fetch(`${SITE}${rota}`, { redirect: "follow" })).text();
      const og = html.match(/<meta property="og:image" content="([^"]*)"/)?.[1];
      expect(og, `${rota} sem og:image`).toBeTruthy();
      const res = await fetch(og!);
      expect(res.status, `${rota}: a imagem não carrega`).toBe(200);
    }
  });
});

descreve("o funil fica fora do índice", () => {
  it("da tela de escolha até a confirmação", async () => {
    for (const rota of ["/reservar/", "/reservar/day-use/", "/reservar/day-use/dados/"]) {
      const html = await (await fetch(`${SITE}${rota}`, { redirect: "follow" })).text();
      expect(html, rota).toMatch(/<meta name="robots" content="noindex, nofollow"/);
    }
  });
});

descreve("privacidade e transparência", () => {
  const d = (n: number) => {
    const x = new Date();
    x.setUTCDate(x.getUTCDate() + n);
    return x.toISOString().slice(0, 10);
  };

  it("a política existe e cobre o que a LGPD pede", async () => {
    const res = await fetch(`${SITE}/privacidade/`, { redirect: "follow" });
    expect(res.status).toBe(200);
    const t = (await res.text())
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<[^>]*>/g, " ");
    for (const secao of [
      "Que dados coletamos",
      "Para que usamos",
      "Com quem compartilhamos",
      "Por quanto tempo guardamos",
      "Seus direitos",
      "Encarregado de dados",
    ]) {
      expect(t, secao).toContain(secao);
    }
  });

  it("está no rodapé de toda página pública", async () => {
    // É onde a pessoa procura depois de já ter entregado o CPF.
    for (const rota of ["/", "/fotos/", "/termos/", "/sobre-nos/"]) {
      const html = await (await fetch(`${SITE}${rota}`, { redirect: "follow" })).text();
      expect(html, rota).toMatch(/href="\/privacidade\/"/);
    }
  });

  it("o funil avisa no ponto da coleta, e cita a base legal", async () => {
    // Transparência tem de estar onde a pessoa acabou de digitar o CPF, não
    // num link de rodapé que ela leria depois.
    const html = await (
      await fetch(`${SITE}/reservar/day-use/dados/?entrada=${d(30)}&i1=1`, {
        redirect: "follow",
      })
    ).text();
    const t = html.replace(/<[^>]*>/g, " ");
    expect(t).toMatch(/Seus dados são coletados exclusivamente/);
    expect(t).toMatch(/Art\. 7, V da LGPD/);
    expect(html).toMatch(/href="\/privacidade\/"/);
  });

  it("não pede consentimento para o que é execução de contrato", async () => {
    // A base legal é o Art. 7, V: o tratamento existe porque a reserva foi
    // pedida. Uma caixa de aceite aqui sugeriria que dá para reservar sem
    // informar o CPF, o que não é verdade — e não há rastreador a consentir.
    const html = await (
      await fetch(`${SITE}/reservar/day-use/dados/?entrada=${d(30)}&i1=1`, {
        redirect: "follow",
      })
    ).text();
    expect(html).not.toMatch(/type="checkbox"[^>]*(consent|privacidade|aceito)/i);
    expect(html).not.toMatch(/aceito os termos|concordo com/i);
  });
});
