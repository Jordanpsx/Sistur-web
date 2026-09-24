import { CONTATO } from "@/lib/local";

/**
 * Atalho fixo para o WhatsApp, no canto inferior direito.
 *
 * Boa parte das dúvidas que travam uma reserva — leva criança, tem sombra, e
 * se chover — se resolve numa conversa, e o único caminho até ela era o rodapé.
 *
 * Verde da marca na superfície que aguenta texto branco (`--c-accent-dark`,
 * 5,9:1), e não o verde do WhatsApp: cor fora do token quebraria o
 * white-label. O ícone já diz qual é o canal.
 *
 * Fica acima da barra de gestos do iOS (`safe-area-inset-bottom`) e abaixo do
 * cabeçalho e do menu do celular na pilha — o menu, aberto, cobre o botão.
 * Só no site público: no funil de reserva a barra do carrinho ocupa esse canto.
 */

const MENSAGEM = "Olá! Vim pelo site da Cachoeira do Girassol e tenho uma dúvida.";

export function WhatsAppFlutuante() {
  return (
    <a
      href={`${CONTATO.whatsappUrl}?text=${encodeURIComponent(MENSAGEM)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-accent-dark)] text-[var(--c-on-accent)] shadow-xl shadow-black/25 transition-colors hover:bg-[var(--c-accent-deep)] sm:right-6 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.17.25-.64.8-.78.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.23-.73-.66-1.23-1.47-1.37-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.29z" />
      </svg>
    </a>
  );
}
