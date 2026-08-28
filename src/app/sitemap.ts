import type { MetadataRoute } from "next";
import { getPublishedSlugs } from "@/lib/sistur/pages";

/**
 * `/sitemap.xml`, montado a partir do que o CMS tem publicado.
 *
 * A lista não é escrita aqui de propósito: publicar uma página no admin precisa
 * bastar. Uma lista fixa neste arquivo significaria que toda página nova nasce
 * invisível para o buscador até alguém lembrar de editar código.
 *
 * O funil fica de fora — ver a nota em `robots.ts`.
 *
 * Sem produção, devolve vazio: um sitemap de staging só serve para convidar
 * rastreador a um lugar que não deveria ser rastreado.
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!INDEXAVEL) return [];

  let paginas: Awaited<ReturnType<typeof getPublishedSlugs>> = [];
  try {
    paginas = await getPublishedSlugs();
  } catch {
    // O sitemap não pode derrubar o build nem a resposta. Sem o CMS, ao menos
    // a home entra — é melhor que um 500 onde o buscador espera XML.
    return [{ url: `${SITE}/`, changeFrequency: "weekly", priority: 1 }];
  }

  return paginas
    // Página marcada como `noindex` no admin não entra: listá-la no sitemap
    // seria pedir ao buscador que visite exatamente o que o operador escondeu.
    .filter((p) => !p.noindex)
    .map(({ slug, updated_at }) => {
      const caminho = slug ? `/${slug}/` : "/";
      return {
        url: `${SITE}${caminho}`,
        lastModified: updated_at ? new Date(updated_at) : undefined,
        // A home é a porta de entrada; as demais são conteúdo de apoio.
        changeFrequency: slug ? ("monthly" as const) : ("weekly" as const),
        priority: slug ? 0.7 : 1,
      };
    });
}
