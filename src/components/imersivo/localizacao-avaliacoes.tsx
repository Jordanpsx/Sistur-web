import type { ResumoAvaliacoes } from "@/lib/google/avaliacoes";
import { ENDERECO, MAPS_EMBED, MAPS_FICHA, MAPS_ROTA, WAZE_ROTA } from "@/lib/local";

/**
 * Onde fica e o que dizem — dois cartões independentes.
 *
 * Moram em seções diferentes da home: as avaliações no alto, para quem ainda
 * está decidindo se vem; o mapa perto do fim, junto das regras, para quem já
 * decidiu e quer saber como chegar e o que levar.
 *
 * O cartão das avaliações tem dois estados, e o segundo não é erro: sem a
 * chave do Google (ou com o Google fora do ar) ele vira um convite para ver as
 * avaliações lá, sem número nenhum. Estrelas cheias sem nota ao lado dariam a
 * entender uma nota 5 que ninguém mediu.
 */

const nota = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const ESTRELA =
  "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";

/** Cinco estrelas preenchidas na proporção da nota — 4,6 pinta 92% da fileira. */
function Estrelas({ valor, tamanho = "h-5 w-5" }: { valor: number; tamanho?: string }) {
  const fileira = (classe: string) => (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={`${tamanho} shrink-0 ${classe}`}
          aria-hidden="true"
        >
          <path d={ESTRELA} fill="currentColor" />
        </svg>
      ))}
    </span>
  );
  return (
    <span
      role="img"
      aria-label={`Nota ${nota(valor)} de 5`}
      className="relative inline-flex"
    >
      {fileira("text-[var(--c-border)]")}
      <span
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${Math.max(0, Math.min(5, valor)) * 20}%` }}
      >
        {fileira("text-[var(--c-primary)]")}
      </span>
    </span>
  );
}

const BOTAO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full px-6 text-sm " +
  "font-semibold tracking-wide uppercase transition-colors focus-visible:outline " +
  "focus-visible:outline-2 focus-visible:outline-offset-2";

export function CartaoLocalizacao() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-sm">
      {/* Carrega só quando a seção se aproxima da tela: o mapa é o item mais
          pesado da página e a maioria de quem abre a home não rola até aqui. */}
      <iframe
        src={MAPS_EMBED}
        title="Mapa com a localização da Cachoeira do Girassol"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        // No desktop o cartão estica até a altura das regras ao lado; quem
        // cresce é o mapa, senão sobra um vão em branco acima dos botões.
        className="aspect-[16/9] w-full border-0 lg:aspect-auto lg:min-h-[300px] lg:flex-1"
      />
      <div className="flex flex-col gap-5 p-6">
        <address className="text-sm leading-relaxed text-[var(--c-fg)] not-italic">
          <span className="block font-semibold">{ENDERECO.logradouro}</span>
          {ENDERECO.cidade} — {ENDERECO.uf}, {ENDERECO.cep}
          <span className="mt-1 block text-[var(--c-muted)]">{ENDERECO.referencia}</span>
        </address>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={MAPS_ROTA}
            target="_blank"
            rel="noopener noreferrer"
            // Verde, não amarelo: amarelo é só reserva em todo o site. Chegar é
            // ação de quem já decidiu ir — secundária, e o verde é a secundária.
            className={`${BOTAO} bg-[var(--c-accent-dark)] text-[var(--c-on-accent)] hover:bg-[var(--c-accent-deep)] focus-visible:outline-[var(--c-accent-dark)]`}
          >
            Como chegar
          </a>
          <a
            href={WAZE_ROTA}
            target="_blank"
            rel="noopener noreferrer"
            className={`${BOTAO} border-2 border-[var(--c-border)] text-[var(--c-fg)] hover:bg-[var(--c-surface)] focus-visible:outline-[var(--c-fg)]`}
          >
            Abrir no Waze
          </a>
        </div>
      </div>
    </div>
  );
}

export function CartaoAvaliacoes({ dados }: { dados: ResumoAvaliacoes | null }) {
  const link = dados?.link ?? MAPS_FICHA;

  if (!dados) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 rounded-2xl bg-[var(--c-surface)] p-8 text-center">
        <p className="text-base leading-relaxed text-[var(--c-fg)]">
          Veja o que os visitantes contam sobre a cachoeira, as piscinas naturais e o
          atendimento.
        </p>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BOTAO} bg-[var(--c-accent-dark)] text-[var(--c-on-accent)] hover:bg-[var(--c-accent-deep)] focus-visible:outline-[var(--c-accent-dark)]`}
        >
          Ver avaliações no Google
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* A nota em destaque, centralizada: é o número que decide. */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-4">
          <span className="text-5xl font-bold text-[var(--c-fg)] tabular-nums">
            {nota(dados.nota)}
          </span>
          <div className="flex flex-col items-start gap-1">
            <Estrelas valor={dados.nota} />
            <span className="text-sm text-[var(--c-muted)]">
              {dados.total.toLocaleString("pt-BR")}{" "}
              {dados.total === 1 ? "avaliação" : "avaliações"} no Google
            </span>
          </div>
        </div>
      </div>

      {dados.avaliacoes.length > 0 && (
        <ul
          className={`mx-auto grid w-full grid-cols-1 gap-4 ${
            dados.avaliacoes.length === 1
              ? "max-w-2xl"
              : dados.avaliacoes.length === 2
                ? "max-w-4xl md:grid-cols-2"
                : "md:grid-cols-3"
          }`}
        >
          {dados.avaliacoes.map((a, i) => (
            <li
              key={i}
              className="flex flex-col rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm"
            >
              <Estrelas valor={a.nota} tamanho="h-4 w-4" />
              <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-[var(--c-fg)]">
                “{a.texto}”
              </p>
              <p className="mt-auto pt-3 text-xs text-[var(--c-muted)]">
                {a.autorUrl ? (
                  <a
                    href={a.autorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--c-fg)] underline-offset-2 hover:underline"
                  >
                    {a.autor}
                  </a>
                ) : (
                  <span className="font-semibold text-[var(--c-fg)]">{a.autor}</span>
                )}
                {a.quando && <> · {a.quando}</>}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col items-center gap-2">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BOTAO} bg-[var(--c-accent-dark)] text-[var(--c-on-accent)] hover:bg-[var(--c-accent-deep)] focus-visible:outline-[var(--c-accent-dark)]`}
        >
          Ver todas no Google
        </a>
        <p className="text-xs text-[var(--c-muted)]">Dados do Google Maps.</p>
      </div>
    </div>
  );
}
