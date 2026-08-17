import Image from "next/image";
import Link from "next/link";
import { getNav } from "@/lib/sistur/pages";

/**
 * Public shell — header and footer shared by every CMS-driven page.
 *
 * Lives in the `(public)` group rather than the root layout so the `(booking)`
 * and `(client-area)` groups can later render without this chrome (§3).
 *
 * Reads no cookies and no headers: doing either would opt these routes into
 * dynamic rendering and forfeit the ISR that justifies the whole project (§3.1).
 */

const LOGO =
  "https://cachoeiradogirassol.com.br/wp-content/uploads/2025/09/logo-cachoeira.png";

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nav = await getNav();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--c-border)] bg-[var(--c-bg)]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={LOGO}
              alt="Cachoeira do Girassol"
              width={150}
              height={40}
              priority
              className="h-9 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-1 sm:gap-4">
            {/* Menu vindo do CMS. Escondido abaixo de sm: para não estourar a
                largura em 375px — regra de mobile-first do projeto. */}
            <ul className="hidden items-center gap-4 sm:flex">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-[44px] items-center px-1 text-sm text-[var(--c-fg)] hover:text-[var(--c-primary)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/reservar"
              className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--c-primary)] px-5 text-sm font-medium text-[var(--c-on-primary)]"
            >
              Reservar
            </Link>
          </div>
        </div>
      </header>

      {children}

      <footer className="mt-16 border-t border-[var(--c-border)] bg-[var(--c-surface)]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-3">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Localização</h3>
            <p className="text-sm text-[var(--c-muted)]">
              Cocalzinho de Goiás — GO
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Atendimento</h3>
            <p className="text-sm text-[var(--c-muted)]">
              Restaurante aberto de quinta a domingo. Camping 24h.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Institucional</h3>
            <p className="text-sm text-[var(--c-muted)]">
              Cachoeira do Girassol
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
