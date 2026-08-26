"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

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

  const transparente = podeSerTransparente && !rolou;

  return (
    <>
    <header
      className={
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300 " +
        (transparente
          ? "bg-transparent"
          : "border-b border-[var(--c-border)] bg-[var(--c-bg)]/95 shadow-md backdrop-blur")
      }
    >
      <div
        className={
          "mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 transition-[height] duration-300 " +
          (transparente ? "h-24" : "h-20")
        }
      >
        <Link href="/" className="shrink-0" aria-label="Cachoeira do Girassol — início">
          <Image
            src={logo}
            alt=""
            width={500}
            height={500}
            priority
            className={
              "object-contain transition-all duration-300 " +
              (transparente ? "h-16 w-16 drop-shadow-lg" : "h-14 w-14")
            }
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-6">
          <ul className="hidden items-center gap-5 md:flex">
            {itens.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={
                    "inline-flex min-h-[44px] items-center text-xs font-medium uppercase " +
                    "tracking-wide transition-colors " +
                    (transparente
                      ? "text-white drop-shadow hover:text-[var(--c-primary)]"
                      : "text-[var(--c-fg)] hover:text-[var(--c-primary-dark)]")
                  }
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
            className="inline-flex min-h-[44px] items-center rounded-md bg-[var(--c-primary)]
                       px-4 text-xs font-semibold uppercase tracking-wide text-[var(--c-on-primary)]
                       shadow-sm transition-colors hover:bg-[var(--c-primary-dark)] sm:px-5"
          >
            Faça sua reserva
          </Link>
        </div>
      </div>
    </header>

    {/* O cabeçalho é fixo, então sai do fluxo. Na home isso é o ponto — a hero
        começa no topo da tela e passa por trás dele. Nas outras páginas, sem
        este espaçador o primeiro parágrafo nasce escondido atrás do menu. */}
    {!podeSerTransparente && <div aria-hidden="true" className="h-20" />}
    </>
  );
}
