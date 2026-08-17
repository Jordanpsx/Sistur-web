import Image from "next/image";
import Link from "next/link";

/**
 * Booking shell — deliberately quieter than the public one.
 *
 * No navigation menu: once someone is choosing an experience, links to Fotos and
 * Sobre nós are exits, not affordances. The logo returns to the site and that is
 * the only way out that this chrome offers.
 */

const LOGO =
  "https://cachoeiradogirassol.com.br/wp-content/uploads/2025/09/logo-cachoeira.png";

export default function BookingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header className="border-b border-[var(--c-border)] bg-[var(--c-bg)]">
        <div className="mx-auto flex h-24 max-w-4xl items-center px-4">
          <Link href="/" className="shrink-0">
            <Image
              src={LOGO}
              alt="Cachoeira do Girassol"
              width={500}
              height={500}
              priority
              className="h-16 w-16 object-contain"
            />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-24">{children}</main>
    </>
  );
}
