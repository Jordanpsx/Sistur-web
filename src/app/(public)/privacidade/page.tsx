import type { Metadata } from "next";
import Link from "next/link";

/**
 * Política de Privacidade.
 *
 * Rota em código, e não página do CMS como os Termos, porque o texto ainda não
 * existe: esta é a estrutura à espera da redação vinculante. Vale saber de uma
 * consequência disso — **esta rota tem precedência sobre o catch-all**. No dia
 * em que a política for publicada no admin com o slug `privacidade`, este
 * arquivo precisa ser apagado, senão ele continua servindo o rascunho e a
 * página publicada nunca aparece.
 *
 * O que já está correto e não é rascunho: a base legal. O CPF que o funil
 * coleta é tratado para **execução de contrato** (Art. 7, V da LGPD), não por
 * consentimento — não há caixa a marcar, e pedir consentimento para isso seria
 * pedir permissão para algo que a pessoa já solicitou ao reservar.
 */

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como a Cachoeira do Girassol coleta, usa e protege os dados pessoais de " +
    "quem reserva day use ou camping.",
  alternates: { canonical: "/privacidade/" },
};

/** Um rótulo honesto: a seção existe, o texto ainda não. */
function EmElaboracao() {
  return (
    <p className="rounded-md border border-dashed border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3 text-sm text-[var(--c-muted)]">
      Texto em elaboração.
    </p>
  );
}

export default function PoliticaDePrivacidade() {
  return (
    <article className="mx-auto max-w-[65ch] px-4 py-12 sm:py-16">
      <header className="mb-10 border-b border-[var(--c-border)] pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--c-fg)] sm:text-4xl">
          Política de Privacidade
        </h1>
        <p className="mt-3 leading-relaxed text-[var(--c-muted)]">
          Esta página está em elaboração. A estrutura abaixo já reflete o que fazemos
          hoje; o texto completo e vinculante será publicado em breve.
        </p>
      </header>

      <div className="flex flex-col gap-10 leading-relaxed text-[var(--c-fg)]">
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">Que dados coletamos</h2>
          <p>
            Ao reservar, pedimos nome completo, CPF, e-mail e telefone. O campo de
            observações é livre e opcional — o que você escrever nele chega à equipe junto
            com a reserva.
          </p>
          <EmElaboracao />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">Para que usamos</h2>
          <p>
            Para emitir e validar sua reserva, identificar você na portaria e entrar em
            contato sobre ela. É o que a LGPD chama de{" "}
            <strong>execução de contrato</strong> (Art. 7, inciso V): o tratamento existe
            porque você pediu a reserva, e não depende de consentimento em separado.
          </p>
          <p>
            O CPF cumpre um papel específico: é por ele que a portaria confere que a
            reserva é sua, e é como você consulta uma reserva já feita.
          </p>
          <EmElaboracao />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">Com quem compartilhamos</h2>
          <p>
            Com quem é necessário para a reserva existir — o processador de pagamento,
            para cobrar; e a operadora de mensagens, para confirmar. Não vendemos dados e
            não os cedemos para publicidade de terceiros.
          </p>
          <EmElaboracao />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">Por quanto tempo guardamos</h2>
          <EmElaboracao />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">Seus direitos</h2>
          <p>
            A LGPD garante a você confirmar se tratamos seus dados, acessá-los,
            corrigi-los, pedir a eliminação do que não for necessário e saber com quem os
            compartilhamos. Para exercer qualquer um deles, fale com a gente pelos canais
            no rodapé desta página.
          </p>
          <EmElaboracao />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">Cookies</h2>
          <p>
            Este site não usa cookies de publicidade nem ferramentas de análise de
            terceiros. Se isso mudar, esta página muda antes.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">Encarregado de dados</h2>
          <EmElaboracao />
        </section>
      </div>

      <footer className="mt-12 border-t border-[var(--c-border)] pt-6 text-sm text-[var(--c-muted)]">
        Veja também os{" "}
        <Link href="/termos/" className="font-medium text-[var(--c-info)] underline">
          Termos de uso
        </Link>
        , com as regras de convivência e a política de cancelamento.
      </footer>
    </article>
  );
}
