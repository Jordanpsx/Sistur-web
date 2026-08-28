import type { MetadataRoute } from "next";

/**
 * `/robots.txt`, gerado a partir do ambiente.
 *
 * Fora de produção ele bloqueia tudo. É a segunda camada da mesma proteção: o
 * `X-Robots-Tag` do `next.config` fala com quem já baixou a página, e este fala
 * com quem ainda vai pedi-la. Rastreador que respeita um costuma respeitar o
 * outro, mas os dois custam nada e falham em situações diferentes.
 *
 * Em produção, o funil de reserva fica de fora do rastreamento. Não é conteúdo:
 * são telas de estado, com data e seleção na URL, e cada combinação geraria uma
 * página distinta aos olhos do buscador.
 */

/**
 * Lido a cada requisição, não no build.
 *
 * Sem isto o Next geraria este arquivo uma vez, com o ambiente que existia na
 * hora de compilar — e o build deste projeto não recebe variável nenhuma. A
 * mesma imagem serve staging e produção; quem decide é o ambiente que a está
 * executando.
 */
export const dynamic = "force-dynamic";

const INDEXAVEL = process.env.SITE_INDEXAVEL === "1";
const SITE = process.env.SITE_URL ?? "https://cachoeiradogirassol.com.br";

export default function robots(): MetadataRoute.Robots {
  if (!INDEXAVEL) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/reservar/", // o funil inteiro, incluindo os passos
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
