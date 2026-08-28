import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Campo de formulário — rótulo, controle, dica e erro numa peça só.
 *
 * O que ele resolve não é estilo: as classes `.f-*` já centralizavam isso. É a
 * **ligação entre as partes**. Escrito à mão, é onde se esquece o `htmlFor`, o
 * `aria-describedby` da dica e o `aria-invalid` do erro — e aí o leitor de tela
 * anuncia "campo de edição" sem dizer qual, sem a regra e sem o que deu errado.
 *
 * O fundo é branco sólido, sempre. É regra do design system e veio de defeito
 * real: campo translúcido destrói a legibilidade de quem digita CPF no celular,
 * no sol.
 */

type Props = {
  id: string;
  label: string;
  /** Marca o rótulo com asterisco e liga o `required` do controle. */
  obrigatorio?: boolean;
  /** Texto de apoio abaixo do campo. Fica ligado por `aria-describedby`. */
  dica?: ReactNode;
  /** Mensagem de erro. Presente, ela substitui a dica na leitura em voz alta. */
  erro?: string;
} & Omit<ComponentPropsWithoutRef<"input">, "id" | "required" | "className">;

export function Input({ id, label, obrigatorio, dica, erro, ...resto }: Props) {
  const idDica = dica ? `${id}-dica` : undefined;
  const idErro = erro ? `${id}-erro` : undefined;

  return (
    <div>
      <label className="f-label" htmlFor={id} data-req={obrigatorio ? "" : undefined}>
        {label}
      </label>

      <input
        id={id}
        required={obrigatorio}
        className="f-input"
        // O erro ganha a vez: quem não enxerga a tela precisa ouvir o que
        // impede de seguir, não a regra geral do campo.
        aria-describedby={idErro ?? idDica}
        aria-invalid={erro ? true : undefined}
        {...resto}
      />

      {erro ? (
        <p id={idErro} role="alert" className="f-erro">
          {erro}
        </p>
      ) : (
        dica && (
          <p id={idDica} className="f-hint">
            {dica}
          </p>
        )
      )}
    </div>
  );
}
