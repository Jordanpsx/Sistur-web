import Link from "next/link";
import { Navbar } from "@/components/imersivo/navbar";
import { DadosEstruturados } from "@/components/seo/dados-estruturados";
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

/** O host público, o mesmo que o `metadataBase` usa. */
const SITE = process.env.SITE_URL ?? "https://cachoeiradogirassol.com.br";

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
      {/* No shell público e não na home: /fotos e /restaurante também são porta
          de entrada por busca, e o buscador precisa saber de que lugar elas
          falam. Fora do funil de propósito — lá não há o que indexar. */}
      <DadosEstruturados site={SITE} />

      <Navbar itens={nav} logo={LOGO} />

      {/* O cabeçalho é fixo, então tira o conteúdo de baixo dele — menos na
          home, onde a hero começa no topo de propósito e passa por trás. */}
      {children}

      <footer className="bg-[var(--c-footer-bg)] text-[var(--c-footer-fg)]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-14 sm:grid-cols-3">
          <div>
            <h2 className="mb-4 text-lg text-[var(--c-primary)] uppercase">
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
              className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-[var(--c-info)] px-5 text-sm font-medium text-white"
            >
              Ver no Google Maps
            </a>
          </div>

          <div>
            <h2 className="mb-4 text-lg text-[var(--c-primary)] uppercase">
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
              className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-[var(--c-accent-dark)] px-5 text-sm font-medium text-[var(--c-on-accent)]"
            >
              Falar com Consultor
            </a>
          </div>

          <div>
            <h2 className="mb-4 text-lg text-[var(--c-primary)] uppercase">
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
