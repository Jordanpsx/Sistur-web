import Image from "next/image";
import Link from "next/link";
import { getNav } from "@/lib/sistur/pages";

/**
 * Public shell — header and footer shared by every CMS-driven page.
 *
 * Lives in the `(public)` group rather than the root layout so the `(booking)`
 * and `(client-area)` groups can later render without this chrome (§3).
 *
 * Reads no cookies and no headers: either would opt these routes into dynamic
 * rendering and forfeit the ISR that justifies the whole project (§3.1).
 */

const LOGO =
  "https://cachoeiradogirassol.com.br/wp-content/uploads/2025/09/logo-cachoeira.png";

const MAPS =
  "https://www.google.com/maps/search/?api=1&query=Cachoeira+do+Girassol+Cocalzinho+de+Goias";
const WHATSAPP = "https://wa.me/5561998369133";

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nav = await getNav();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--c-border)] bg-[var(--c-bg)]">
        <div className="mx-auto flex h-28 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="shrink-0">
            {/* O arquivo é 500x500 — QUADRADO. Declarar 160x48 fazia o
                object-contain encaixotar o logo numa faixa larga, e ele
                aparecia pequeno dentro dela. A proporção correta é 1:1. */}
            <Image
              src={LOGO}
              alt="Cachoeira do Girassol"
              width={500}
              height={500}
              priority
              className="h-20 w-20 object-contain"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-6">
            {/* Menu from the CMS. Hidden below sm: four links plus a button
                overflow a 375px viewport, and mobile-first is a project rule. */}
            <ul className="hidden items-center gap-5 md:flex">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-[44px] items-center text-xs font-medium uppercase tracking-wide text-[var(--c-fg)] transition-colors hover:text-[var(--c-primary-dark)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/reservar"
              className="inline-flex min-h-[44px] items-center rounded-md bg-[var(--c-primary)] px-4 text-xs font-semibold uppercase tracking-wide text-[var(--c-on-primary)] transition-colors hover:bg-[var(--c-primary-dark)] sm:px-5"
            >
              Faça sua reserva
            </Link>
          </div>
        </div>
      </header>

      {children}

      <footer className="bg-[var(--c-footer-bg)] text-[var(--c-footer-fg)]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-14 sm:grid-cols-3">
          <div>
            <h2 className="mb-4 text-lg uppercase text-[var(--c-primary)]">
              Localização
            </h2>
            <p className="text-sm leading-relaxed">
              Distrito de Girassol
              <br />
              Cocalzinho de Goiás — GO
              <br />
              Aprox. 65km de Brasília
            </p>
            <a
              href={MAPS}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-[#2f6fd0] px-5 text-sm font-medium text-white"
            >
              Ver no Google Maps
            </a>
          </div>

          <div>
            <h2 className="mb-4 text-lg uppercase text-[var(--c-primary)]">
              Atendimento
            </h2>
            <p className="text-sm leading-relaxed">
              WhatsApp: (61) 9 9836-9133
              <br />
              E-mail: contato@cachoeiradogirassol.com.br
            </p>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-[var(--c-accent)] px-5 text-sm font-medium text-[var(--c-on-accent)]"
            >
              Falar com Consultor
            </a>
          </div>

          <div>
            <h2 className="mb-4 text-lg uppercase text-[var(--c-primary)]">
              Institucional
            </h2>
            <ul className="space-y-2 text-sm">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/reservar" className="hover:text-white">
                  Reservas
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-6 text-center text-xs text-white/60">
          © {new Date().getFullYear()} Cachoeira do Girassol. Todos os direitos
          reservados.
        </div>
      </footer>
    </>
  );
}
