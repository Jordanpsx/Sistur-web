import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

/**
 * Open Sans — a fonte padrão do sistema de páginas.
 *
 * Por `next/font` e não por `<link>` para o Google: assim ela é baixada no
 * build e servida do nosso próprio domínio. Isso significa uma requisição a
 * menos a um terceiro em cada visita, nenhum salto de layout quando a fonte
 * chega, e a página continuando correta se o Google estiver bloqueado na rede
 * de quem acessa — coisa comum em Wi-Fi corporativo.
 *
 * Variável, então os pesos entre 300 e 800 saem de um arquivo só. O site usa de
 * 400 a 800; pedir cada peso separado baixaria cinco arquivos para a mesma
 * coisa.
 */
const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--fonte-base",
  display: "swap",
});

/**
 * Root layout — required by Next; the app does not build without it.
 *
 * Deliberately minimal. The public shell (nav, footer, JSON-LD) belongs to
 * `src/app/(public)/layout.tsx` so that the `(booking)` and `(client-area)`
 * groups can render without it later (§3).
 */

export const metadata: Metadata = {
  // Server-only on purpose. `NEXT_PUBLIC_*` is inlined into the bundle at BUILD
  // time, so a public var here would freeze the canonical host into the image —
  // and the same image could never be promoted from staging to production.
  // `metadataBase` is evaluated server-side, so a runtime variable works and one
  // image serves both environments.
  metadataBase: new URL(process.env.SITE_URL ?? "https://cachoeiradogirassol.com.br"),
  title: {
    default: "Cachoeira do Girassol",
    template: "%s · Cachoeira do Girassol",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={openSans.variable}>
      <body className="bg-[var(--c-bg)] font-sans text-[var(--c-fg)] antialiased">
        {children}
      </body>
    </html>
  );
}
