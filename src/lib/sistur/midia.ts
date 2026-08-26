import { z } from "zod";

/**
 * Biblioteca de mídia do Sistur.
 *
 * As fotos do site hoje são URLs coladas à mão, apontando para os uploads do
 * WordPress — o sistema que esta migração existe para substituir. Isso já
 * produziu link morto: duas fotos da Churrasqueira A5 apontavam para um host
 * que devolve 404 e que o `next/image` recusa.
 *
 * Aqui o site pergunta o que existe em vez de guardar endereço. O Sistur
 * devolve caminho relativo (`/midia/<nome>`), porque o host muda entre staging
 * e produção e quem sabe em qual dos dois está é este módulo.
 */

const API = process.env.SISTUR_API_URL!;
/** Host por onde o **navegador** alcança os arquivos. O de dentro não serve: o
 *  `SISTUR_API_URL` é DNS interno do Docker e não resolve fora da rede. */
const HOST_PUBLICO = process.env.SISTUR_MIDIA_URL ?? "";
const TTL = 300;

export type TipoMidia = "image" | "video" | "360";

const ItemSchema = z.object({
  id: z.number(),
  url: z.string(),
  kind: z.enum(["image", "video", "360"]),
  mime: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  alt: z.string().nullable(),
  tag: z.string().nullable(),
});

const RespostaSchema = z.object({ itens: z.array(ItemSchema).default([]) });

export type ItemMidia = z.infer<typeof ItemSchema> & { url_absoluta: string };

/**
 * A biblioteca, opcionalmente filtrada.
 *
 * Devolve lista vazia quando o Sistur não responde: uma galeria a menos é uma
 * página incompleta, e uma exceção aqui derruba a página inteira.
 */
export async function listarMidia(filtro?: {
  tag?: string;
  kind?: TipoMidia;
}): Promise<ItemMidia[]> {
  const q = new URLSearchParams();
  if (filtro?.tag) q.set("tag", filtro.tag);
  if (filtro?.kind) q.set("kind", filtro.kind);

  try {
    const res = await fetch(`${API}/api/public/midia/?${q}`, {
      next: { revalidate: TTL, tags: ["midia"] },
    });
    if (!res.ok) return [];
    const { itens } = RespostaSchema.parse(await res.json());
    return itens.map((i) => ({ ...i, url_absoluta: `${HOST_PUBLICO}${i.url}` }));
  } catch {
    return [];
  }
}

/**
 * Converte um item da biblioteca no formato que a galeria imersiva consome.
 *
 * O `poster` de um vídeo ainda não existe: gerar quadro de vídeo pede ffmpeg no
 * servidor, que é decisão à parte. Até lá o vídeo entra sem poster e o
 * componente mostra o primeiro quadro, que o navegador busca com
 * `preload="metadata"`.
 */
export function paraGaleria(itens: ItemMidia[]) {
  return itens.map((i) => ({
    id: String(i.id),
    type: i.kind,
    poster: i.url_absoluta,
    src: i.kind === "image" ? undefined : i.url_absoluta,
    alt: i.alt ?? "",
  }));
}
