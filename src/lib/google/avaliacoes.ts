import { z } from "zod";
import { GOOGLE_PLACE_ID } from "@/lib/local";

/**
 * Nota e avaliações do Google, lidas da Places API (New) no servidor.
 *
 * A chave vive só no ambiente do servidor (`GOOGLE_PLACES_API_KEY`) e nunca
 * chega ao navegador: esta função só roda dentro de componentes de servidor.
 *
 * Sem chave, ou com qualquer falha do Google, devolve `null` e o bloco mostra
 * só o convite para ver as avaliações — sem número. Um número errado é pior
 * que nenhum: ele fica na página como se fosse a avaliação atual.
 *
 * Uma chamada só, a cada 6 horas: é o que mantém o número em dia e ainda cabe
 * folgado na cota gratuita da API. O id do lugar é fixo (`GOOGLE_PLACE_ID`);
 * se um dia o Google o aposentar, a chamada falha e o bloco cai no convite,
 * nunca na nota de outro lugar.
 */

const API = "https://places.googleapis.com/v1";
const SEIS_HORAS = 6 * 60 * 60;
const TEMPO_LIMITE_MS = 5000;

export type Avaliacao = {
  autor: string;
  /** Perfil do autor no Google — a política da API pede o crédito linkado. */
  autorUrl: string | null;
  nota: number;
  texto: string;
  /** Como o próprio Google escreve: "há 2 semanas". */
  quando: string | null;
};

export type ResumoAvaliacoes = {
  nota: number;
  total: number;
  /** Ficha do lugar no Google, onde estão todas as avaliações. */
  link: string | null;
  avaliacoes: Avaliacao[];
};

const DetalhesSchema = z.object({
  rating: z.number().optional(),
  userRatingCount: z.number().int().optional(),
  googleMapsUri: z.string().optional(),
  reviews: z
    .array(
      z.object({
        rating: z.number().optional(),
        text: z.object({ text: z.string() }).optional(),
        relativePublishTimeDescription: z.string().optional(),
        authorAttribution: z
          .object({ displayName: z.string().optional(), uri: z.string().optional() })
          .optional(),
      }),
    )
    .optional(),
});

export type RespostaDetalhes = z.infer<typeof DetalhesSchema>;

function linkSeguro(uri: string | undefined): string | null {
  return uri && uri.startsWith("https://") ? uri : null;
}

/**
 * Converte a resposta do Google no que a tela mostra. Sem nota ou sem
 * contagem, devolve `null`: meia informação ("4,8" sem saber de quantas
 * pessoas) não é algo que se deva anunciar.
 *
 * As avaliações vêm na ordem de relevância do próprio Google, sem filtro por
 * nota — escolher só as de 5 estrelas ao lado da média seria maquiar a média.
 * Ficam as que têm texto, até três.
 */
export function normalizarAvaliacoes(d: RespostaDetalhes): ResumoAvaliacoes | null {
  if (typeof d.rating !== "number" || typeof d.userRatingCount !== "number") return null;
  if (d.userRatingCount <= 0) return null;

  const avaliacoes: Avaliacao[] = (d.reviews ?? [])
    .filter((r) => r.text?.text?.trim())
    .slice(0, 3)
    .map((r) => ({
      autor: r.authorAttribution?.displayName?.trim() || "Visitante do Google",
      autorUrl: linkSeguro(r.authorAttribution?.uri),
      nota: Math.round(r.rating ?? 0),
      texto: r.text!.text.trim(),
      quando: r.relativePublishTimeDescription ?? null,
    }));

  return {
    nota: Math.round(d.rating * 10) / 10,
    total: d.userRatingCount,
    link: linkSeguro(d.googleMapsUri),
    avaliacoes,
  };
}

async function lerDetalhes(chave: string, lugar: string): Promise<RespostaDetalhes> {
  const resposta = await fetch(
    `${API}/places/${encodeURIComponent(lugar)}?languageCode=pt-BR`,
    {
      headers: {
        "X-Goog-Api-Key": chave,
        "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews",
      },
      next: { revalidate: SEIS_HORAS },
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    },
  );
  if (!resposta.ok) throw new Error(`detalhes do lugar: HTTP ${resposta.status}`);
  return DetalhesSchema.parse(await resposta.json());
}

export async function obterAvaliacoes(): Promise<ResumoAvaliacoes | null> {
  const chave = process.env.GOOGLE_PLACES_API_KEY;
  if (!chave) return null;

  try {
    return normalizarAvaliacoes(await lerDetalhes(chave, GOOGLE_PLACE_ID));
  } catch (err) {
    // Só a mensagem: a chave vai no cabeçalho e não pode acabar num log.
    console.warn(
      "[avaliacoes] Google indisponível — bloco sem nota.",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}
