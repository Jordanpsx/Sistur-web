import { NextResponse } from "next/server";
import { ehInstanteValido } from "@/lib/reserva/datas";

/**
 * Resource availability, proxied for the browser.
 *
 * Availability changes while someone is on the page — another customer can take
 * the last pit — so the client refetches when the date changes. It cannot reach
 * Sistur's private network name, hence this hop.
 *
 * Never cached: a stale "available" is exactly the answer that sends someone to
 * a booking that will be refused.
 */

const API = process.env.SISTUR_API_URL!;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const source = q.get("source_id") ?? "";
  const categoria = q.get("category_id") ?? "";
  const entrada = q.get("check_in") ?? "";
  const saida = q.get("check_out") ?? "";

  const numero = (v: string) => /^\d{1,9}$/.test(v);
  // Aceita hora: o camping manda instantes, porque lá a hora é preço.
  if (
    !numero(source) ||
    !numero(categoria) ||
    !ehInstanteValido(entrada) ||
    !ehInstanteValido(saida)
  ) {
    return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${API}/api/public/reservas/disponibilidade?source_id=${source}` +
        `&category_id=${categoria}&check_in=${encodeURIComponent(entrada)}` +
        `&check_out=${encodeURIComponent(saida)}`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) throw new Error(String(res.status));
    return NextResponse.json(await res.json(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // Lista vazia em vez de erro: a seção some, e escolher ingresso continua
    // possível.
    return NextResponse.json(
      { resources: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
