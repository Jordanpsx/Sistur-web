"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CONTATO, ENDERECO } from "@/lib/local";

/**
 * Cabeçalho que sabe onde está.
 *
 * Sobre a hero ele é transparente e branco, para a foto começar no topo da tela
 * em vez de atrás de uma faixa. Assim que a página rola, vira sólido com sombra
 * — sem isso o menu some sobre trechos claros da imagem e volta sobre os
 * escuros, e um menu que pisca é pior que um menu opaco.
 *
 * **Transparente só onde existe hero.** Em `/fotos` ou `/termos` o conteúdo
 * começa em fundo claro, e texto branco sobre ele seria invisível. A rota
 * decide, não um prop que alguém esquece de passar.
 *
 * O menu continua vindo do CMS: quem busca é o layout, que é server component;
 * aqui só entra o comportamento que precisa do navegador.
 *
 * ## Menu no celular
 *
 * Abaixo de `md` os links não cabem no cabeçalho, e antes eles simplesmente
 * sumiam — o resto do site só era alcançável pelo rodapé. Agora um botão abre
 * uma folha que sobe do rodapé da tela (e não uma gaveta lateral: em aparelho
 * grande o polegar não alcança o topo). Ela é um diálogo modal de verdade:
 * prende o foco, fecha com Esc e com toque fora, trava a rolagem da página e
 * devolve o foco ao botão que a abriu.
 *
 * A folha vai para um portal no `<body>` e todo o resto recebe `inert`. Assim
 * a prisão de foco é estrutural — nada atrás dela é focável nem clicável, por
 * qualquer caminho — e o tratamento de Tab abaixo vira só a volta ao início.
 */

export type ItemNav = { label: string; href: string };

export function Navbar({
  itens,
  logo,
  /** Rotas que começam com hero de imagem cheia. */
  rotasComHero = ["/"],
}: {
  itens: ItemNav[];
  logo: string;
  rotasComHero?: string[];
}) {
  const rota = usePathname();
  const podeSerTransparente = rotasComHero.includes(rota);
  const [rolou, setRolou] = useState(false);
  const [aberto, setAberto] = useState(false);
  const gatilho = useRef<HTMLButtonElement>(null);
  const folha = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!podeSerTransparente) return;

    // Compara antes de setar: `scroll` dispara dezenas de vezes por segundo, e
    // um setState por evento re-renderiza o cabeçalho à toa durante a rolagem.
    let ultimo = false;
    const aoRolar = () => {
      const agora = window.scrollY > 24;
      if (agora !== ultimo) {
        ultimo = agora;
        setRolou(agora);
      }
    };
    aoRolar(); // a página pode abrir já rolada, num F5 no meio dela
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, [podeSerTransparente]);

  // Ao fechar, o foco volta ao botão — menos quando o fechamento veio de trocar
  // de página, em que o foco pertence à página nova.
  const devolverFoco = useRef(true);
  const fechar = () => {
    devolverFoco.current = true;
    setAberto(false);
  };

  // Trocar de página fecha o menu: o link clicado já cumpriu o papel dele.
  useEffect(() => {
    devolverFoco.current = false;
    setAberto(false);
  }, [rota]);

  // Enquanto aberto: o resto da página fica inerte e não rola, e o foco começa
  // dentro da folha. Ao fechar, o foco só volta depois de o inert sair — um
  // elemento inerte não aceita foco.
  useEffect(() => {
    if (!aberto) return;
    const botao = gatilho.current;
    const raiz = folha.current?.closest("[data-menu-celular]");
    const inertes = [...document.body.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== raiz && !el.inert,
    );
    inertes.forEach((el) => (el.inert = true));
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    folha.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      inertes.forEach((el) => (el.inert = false));
      document.body.style.overflow = anterior;
      if (devolverFoco.current) botao?.focus();
    };
  }, [aberto]);

  function prenderFoco(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      fechar();
      return;
    }
    if (e.key !== "Tab" || !folha.current) return;
    const focaveis = folha.current.querySelectorAll<HTMLElement>("a, button");
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  }

  const transparente = podeSerTransparente && !rolou && !aberto;

  return (
    <>
      <header
        className={[
          "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300",
          transparente
            ? "bg-transparent"
            : "border-b border-[var(--c-border)] bg-[var(--c-bg)]/95 shadow-md backdrop-blur",
        ].join(" ")}
      >
        <div
          className={[
            "mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 transition-[height] duration-300",
            transparente ? "h-24" : "h-20",
          ].join(" ")}
        >
          <Link href="/" className="shrink-0" aria-label="Cachoeira do Girassol — início">
            <Image
              src={logo}
              alt=""
              width={500}
              height={500}
              priority
              className={[
                "object-contain transition-all duration-300",
                transparente ? "h-16 w-16 drop-shadow-lg" : "h-14 w-14",
              ].join(" ")}
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-6">
            <ul className="hidden items-center gap-5 md:flex">
              {itens.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    // Em lista, e não somando strings: a soma sem espaço colava
                    // a cor em "transition-colors" e os links perdiam a cor.
                    className={[
                      "inline-flex min-h-[44px] items-center text-xs font-medium tracking-wide uppercase transition-colors",
                      transparente
                        ? "text-white drop-shadow hover:text-[var(--c-primary)]"
                        : "text-[var(--c-fg)] hover:text-[var(--c-primary-dark)]",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* O botão nunca fica transparente: é a ação da página, e some se
              acompanhar o resto do cabeçalho na foto. */}
            <Link
              href="/reservar"
              className="inline-flex min-h-[44px] items-center rounded-md bg-[var(--c-primary)] px-4 text-xs font-semibold tracking-wide text-[var(--c-on-primary)] uppercase shadow-sm transition-colors hover:bg-[var(--c-primary-dark)] sm:px-5"
            >
              Reservar
            </Link>

            <button
              ref={gatilho}
              type="button"
              aria-label="Abrir menu"
              aria-expanded={aberto}
              aria-controls="menu-celular"
              onClick={() => setAberto(true)}
              className={[
                "inline-flex h-11 w-11 items-center justify-center rounded-md transition-colors md:hidden",
                transparente
                  ? "text-white drop-shadow hover:bg-white/10"
                  : "text-[var(--c-fg)] hover:bg-[var(--c-surface)]",
              ].join(" ")}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {aberto &&
        createPortal(
          <div data-menu-celular className="fixed inset-0 z-[60] md:hidden">
            <button
              type="button"
              aria-label="Fechar menu"
              tabIndex={-1}
              onClick={fechar}
              className="absolute inset-0 h-full w-full cursor-default bg-black/50"
            />
            <div
              ref={folha}
              id="menu-celular"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              onKeyDown={prenderFoco}
              className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-[var(--c-bg)] px-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl motion-safe:animate-[folha-sobe_200ms_ease-out]"
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  aria-hidden="true"
                  className="mx-auto h-1.5 w-12 rounded-full bg-[var(--c-border)]"
                />
              </div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold tracking-wide text-[var(--c-muted)] uppercase">
                  Menu
                </p>
                <button
                  type="button"
                  aria-label="Fechar menu"
                  onClick={fechar}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--c-fg)] hover:bg-[var(--c-surface)]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <nav aria-label="Principal">
                <ul className="divide-y divide-[var(--c-border)]">
                  {itens.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => {
                          devolverFoco.current = false;
                          setAberto(false);
                        }}
                        aria-current={item.href === rota ? "page" : undefined}
                        className="flex min-h-[52px] items-center text-base font-semibold text-[var(--c-fg)] aria-[current=page]:text-[var(--c-accent-dark)]"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-[var(--c-surface)] p-4 text-sm text-[var(--c-fg)]">
                <a
                  href={CONTATO.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--c-accent-dark)] px-5 font-semibold text-[var(--c-on-accent)] hover:bg-[var(--c-accent-deep)]"
                >
                  Falar no WhatsApp
                </a>
                <p className="text-center text-[var(--c-muted)]">
                  {ENDERECO.cidade} — {ENDERECO.uf} · {ENDERECO.referencia}
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* O cabeçalho é fixo, então sai do fluxo. Na home isso é o ponto — a hero
        começa no topo da tela e passa por trás dele. Nas outras páginas, sem
        este espaçador o primeiro parágrafo nasce escondido atrás do menu. */}
      {!podeSerTransparente && <div aria-hidden="true" className="h-20" />}
    </>
  );
}
