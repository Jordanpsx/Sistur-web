/**
 * Ícones de traço fino, monocromáticos, na cor do texto em volta.
 *
 * Substituem os emojis que eram digitados dentro dos títulos do CMS: emoji é
 * colorido, muda de desenho em cada sistema e não obedece à cor da página. Aqui
 * o traço herda `currentColor`, então o ícone segue o token de quem o envolve.
 *
 * As chaves são contrato com o Sistur (`ICONES_VALIDOS`, no serviço de landing
 * pages): o editor só oferece o que está aqui, e o teste de contrato compara
 * as duas listas.
 */

const DESENHOS = {
  agua: (
    <>
      <path d="M12 3c3.5 4.2 6 7.6 6 10.5a6 6 0 0 1-12 0C6 10.6 8.5 7.2 12 3z" />
      <path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5" />
    </>
  ),
  gastronomia: (
    <>
      <path d="M5 3v5a2 2 0 0 0 4 0V3" />
      <path d="M7 3v18" />
      <path d="M17 21V3c-1.8 1-3 3.3-3 6v4h3" />
    </>
  ),
  camping: (
    <>
      <path d="M3.5 20L12 5l8.5 15" />
      <path d="M2 20h20" />
      <path d="M9.5 20L12 15.5l2.5 4.5" />
    </>
  ),
  wifi: (
    <>
      <path d="M2 9.5a14 14 0 0 1 20 0" />
      <path d="M5 12.8a10 10 0 0 1 14 0" />
      <path d="M8.3 16a5.5 5.5 0 0 1 7.4 0" />
      <path d="M12 19.5h.01" />
    </>
  ),
  trilha: (
    <>
      <path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z" />
      <path d="M5 19l9-9" />
    </>
  ),
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  som: (
    <>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </>
  ),
  silencio: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  pet: (
    <>
      <path d="M12 13c-2.5 0-4.5 2.3-4.5 4.2 0 1.3 1 1.8 2.2 1.8.9 0 1.5-.5 2.3-.5s1.4.5 2.3.5c1.2 0 2.2-.5 2.2-1.8 0-1.9-2-4.2-4.5-4.2z" />
      <circle cx="6.5" cy="10.5" r="1.6" />
      <circle cx="9.8" cy="6.8" r="1.6" />
      <circle cx="14.2" cy="6.8" r="1.6" />
      <circle cx="17.5" cy="10.5" r="1.6" />
    </>
  ),
  vidro: (
    <>
      <path d="M8 3h8l-.5 5a3.5 3.5 0 0 1-7 0L8 3z" />
      <path d="M12 11.5V20" />
      <path d="M8.5 20h7" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  horario: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  familia: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 20v-1a6 6 0 0 1 12 0v1" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.8 14.2A4.5 4.5 0 0 1 21 18.5V20" />
    </>
  ),
  seguranca: (
    <>
      <path d="M12 3l7 3v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
};

export type IconeNome = keyof typeof DESENHOS;

/** O CMS manda texto; só vira ícone o que o site sabe desenhar. */
export function ehIcone(valor: string | undefined | null): valor is IconeNome {
  return !!valor && Object.hasOwn(DESENHOS, valor);
}

export function Icone({
  nome,
  className = "h-6 w-6",
}: {
  nome: IconeNome;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {DESENHOS[nome]}
    </svg>
  );
}
