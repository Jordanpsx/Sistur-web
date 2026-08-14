import type { Metadata } from "next";
import "./globals.css";

/**
 * Root layout — required by Next; the app does not build without it.
 *
 * Deliberately minimal. The public shell (nav, footer, JSON-LD) belongs to
 * `src/app/(public)/layout.tsx` so that the `(booking)` and `(client-area)`
 * groups can render without it later (§3).
 */

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://cachoeiradogirassol.com.br",
  ),
  title: {
    default: "Cachoeira do Girassol",
    template: "%s · Cachoeira do Girassol",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="bg-[var(--c-bg)] text-[var(--c-fg)] antialiased">
        {children}
      </body>
    </html>
  );
}
