import Image from "next/image";
import Link from "next/link";

/**
 * Cabeçalho do funil — mais quieto que o do site.
 *
 * Sem menu: quem já está escolhendo experiência não precisa de links para Fotos
 * e Sobre nós, que ali são saídas e não recursos. A logo volta ao site e é a
 * única porta que esta moldura oferece.
 *
 * Vive como componente, e não dentro do layout do funil, porque o tema é por
 * experiência: o layout de cima não sabe se está sobre céu estrelado, sobre
 * a paisagem do dia ou sobre branco, e quem sabe precisa poder dizer.
 */
export function CabecalhoFunil({ tema }: { tema?: "noturno" | "diurno" }) {
  // Os dois temas ilustrados têm cenário atrás do cabeçalho — ele precisa ser
  // transparente para o céu aparecer. Só o padrão claro tem fundo próprio,
  // porque não há nada atrás dele além da página branca.
  const sobreIlustracao = tema === "noturno" || tema === "diurno";
  return (
    <header
      className={
        sobreIlustracao
          ? "border-b border-white/10 bg-transparent"
          : "border-b border-[var(--c-border)] bg-[var(--c-bg)]"
      }
    >
      <div className="mx-auto flex h-24 max-w-4xl items-center px-4">
        <Link href="/" className="shrink-0" aria-label="Cachoeira do Girassol — início">
          <Image
            src="https://cachoeiradogirassol.com.br/wp-content/uploads/2025/09/logo-cachoeira.png"
            alt=""
            width={500}
            height={500}
            priority
            className={
              "h-16 w-16 object-contain " + (sobreIlustracao ? "drop-shadow-lg" : "")
            }
          />
        </Link>
      </div>
    </header>
  );
}
