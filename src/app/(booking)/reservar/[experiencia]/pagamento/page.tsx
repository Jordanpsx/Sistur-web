import Link from "next/link";
import type { Metadata } from "next";
import { BrickPagamento } from "@/components/reserva/brick-pagamento";
import { Passos } from "@/components/reserva/passos";

/**
 * Step 4 — payment.
 *
 * The reservation already exists as `PENDING` when this renders, holding its
 * resources until `expires_at`. So the page has a deadline, and it says so.
 *
 * Everything the charge depends on — the amount, the payer — is fetched here on
 * the server and never handed to the browser. Only the total is rendered, so
 * the reservation code in the URL cannot be used to read a stranger's name or
 * CPF. The e-mail is the one exception: the Brick needs it to initialise, and
 * it is the same address the person just typed a step ago.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pagamento",
  robots: { index: false, follow: false },
};

const API = process.env.SISTUR_API_URL!;
const CHAVE = process.env.SISTUR_WEB_API_KEY ?? "";

type Dados = {
  reserva_id: number;
  status: string;
  total: number;
  expires_at: string | null;
  expirada: boolean;
  payer: { email: string | null };
};

async function obter(groupId: string): Promise<Dados | null> {
  try {
    const res = await fetch(
      `${API}/api/public/reservas/${encodeURIComponent(groupId)}/pagamento`,
      { headers: { "X-Web-Api-Key": CHAVE }, cache: "no-store" },
    );
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

async function publicKey(): Promise<string | null> {
  try {
    const res = await fetch(`${API}/api/v1/payments/config`, { cache: "no-store" });
    if (!res.ok) return null;
    const d = await res.json();
    return d.enabled && d.public_key ? d.public_key : null;
  } catch {
    return null;
  }
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="f-info" style={{ borderLeftColor: "var(--f-step-now)" }}>
      <strong style={{ color: "var(--f-err-fg)" }}>{titulo}</strong>
      <p>{children}</p>
    </div>
  );
}

export default async function Pagamento({
  params,
  searchParams,
}: {
  params: Promise<{ experiencia: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const slug = (await params).experiencia;
  const sp = await searchParams;
  const bruto = sp.r;
  const groupId = Array.isArray(bruto) ? bruto[0] : bruto;

  const [dados, chave] = await Promise.all([
    groupId ? obter(groupId) : Promise.resolve(null),
    publicKey(),
  ]);

  return (
    <section className="py-8 sm:py-12">
      <div className="f-card">
        <div className="f-head">
          <h1>Pagamento</h1>
          <p>Última etapa</p>
          <Passos atual={4} />
        </div>

        <div className="f-body">
          {!groupId || !dados ? (
            <Aviso titulo="Reserva não encontrada">
              Confira o link ou refaça a reserva.
            </Aviso>
          ) : dados.status !== "PENDING" ? (
            <Aviso titulo="Esta reserva não aguarda pagamento">
              Ela já foi paga ou cancelada. Entre em contato se precisar de ajuda.
            </Aviso>
          ) : dados.expirada ? (
            <Aviso titulo="O prazo expirou">
              Sua vaga ficava reservada por 15 minutos e o prazo passou, então ela voltou
              a ficar disponível. Refaça a reserva — os valores podem ter mudado.
            </Aviso>
          ) : !chave ? (
            /* Sem a chave pública o Brick não inicializa. Dizer isso é melhor do
               que mostrar um espaço vazio onde deveria haver um formulário. */
            <Aviso titulo="Pagamento online indisponível">
              Não foi possível carregar o pagamento no momento. Entre em contato para
              concluir sua reserva.
            </Aviso>
          ) : (
            <>
              <BrickPagamento
                publicKey={chave}
                groupId={groupId}
                slug={slug}
                total={dados.total}
                email={dados.payer.email ?? ""}
              />
              <p className="f-hint" style={{ marginTop: "1rem" }}>
                Sua vaga está reservada por 15 minutos. Os dados do cartão vão direto para
                o Mercado Pago e não passam pelo nosso site.
              </p>
            </>
          )}

          <div className="f-nav">
            <Link className="f-btn f-btn--voltar" href="/">
              ← Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
