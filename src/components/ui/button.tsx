import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Botão — a única forma de desenhar um botão neste projeto.
 *
 * Existe para tirar três decisões das mãos de quem escreve tela:
 *
 * 1. **Contraste.** O verde da marca não carrega texto branco (3,2:1 contra os
 *    4,5:1 do WCAG AA). A variante sólida usa `--c-accent-dark`, e ninguém
 *    precisa lembrar disso ao criar o próximo botão.
 * 2. **Alvo de toque.** 44px é o mínimo que uma pessoa acerta com o polegar,
 *    e estava repetido em classe solta em quatro arquivos.
 * 3. **Foco visível.** Quem navega por teclado precisa ver onde está. É o
 *    detalhe que some primeiro quando cada botão é escrito à mão.
 *
 * Vira `<a>` quando recebe `href`, porque navegar não é agir: o leitor de tela
 * anuncia diferente, e o botão do meio abre em nova aba num link, não num
 * `<button>`.
 */

type Variante = "solid" | "outline" | "quiet";
type Tom = "accent" | "primary";
type Tamanho = "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold " +
  "transition-colors focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

const TAMANHO: Record<Tamanho, string> = {
  md: "min-h-[44px] px-5 text-sm",
  lg: "min-h-[48px] px-8 text-base",
};

/**
 * O sólido usa `--c-accent-dark`, não `--c-accent`. Ver a nota no topo: é aqui
 * que a regra do contraste vira estrutura em vez de lembrete.
 */
const ESTILO: Record<Tom, Record<Variante, string>> = {
  accent: {
    solid:
      "bg-[var(--c-accent-dark)] text-[var(--c-on-accent)] " +
      "hover:bg-[var(--c-accent-deep)] focus-visible:outline-[var(--c-accent-dark)]",
    outline:
      "border-2 border-[var(--c-accent)] text-[var(--c-accent-dark)] " +
      "hover:bg-[var(--c-accent)]/10 focus-visible:outline-[var(--c-accent-dark)]",
    quiet:
      "text-[var(--c-accent-dark)] hover:underline focus-visible:outline-[var(--c-accent-dark)]",
  },
  primary: {
    // Amarelo com texto escuro. Branco sobre ele dá 1,9:1 e é ilegível.
    solid:
      "bg-[var(--c-primary)] text-[var(--c-on-primary)] " +
      "hover:bg-[var(--c-primary-dark)] focus-visible:outline-[var(--c-primary-dark)]",
    outline:
      "border-2 border-[var(--c-primary)] text-[var(--c-on-primary)] " +
      "hover:bg-[var(--c-primary)]/15 focus-visible:outline-[var(--c-primary-dark)]",
    quiet:
      "text-[var(--c-on-primary)] hover:underline focus-visible:outline-[var(--c-primary-dark)]",
  },
};

type Comuns = {
  children: ReactNode;
  variante?: Variante;
  tom?: Tom;
  tamanho?: Tamanho;
  /** Ocupa a largura do contêiner. Padrão no celular, opcional no resto. */
  cheio?: boolean;
  className?: string;
};

function classes({
  variante = "solid",
  tom = "accent",
  tamanho = "md",
  cheio,
  className,
}: Comuns) {
  return [
    BASE,
    TAMANHO[tamanho],
    ESTILO[tom][variante],
    cheio ? "w-full" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

type BotaoProps = Comuns &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "children">;
type LinkProps = Comuns & { href: string } & Omit<
    ComponentPropsWithoutRef<typeof Link>,
    "className" | "children" | "href"
  >;

export function Button(props: BotaoProps): React.ReactElement;
export function Button(props: LinkProps): React.ReactElement;
export function Button(props: BotaoProps | LinkProps) {
  const { children, variante, tom, tamanho, cheio, className, ...resto } =
    props as Comuns & { href?: string };

  const cls = classes({ children, variante, tom, tamanho, cheio, className });

  if (typeof (resto as { href?: string }).href === "string") {
    const { href, ...rest } = resto as { href: string };
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }

  // `type` explícito: dentro de um <form>, um <button> sem type submete, e o
  // botão de "+ um ingresso" enviava a etapa inteira.
  const { type = "button", ...rest } = resto as ComponentPropsWithoutRef<"button">;
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
