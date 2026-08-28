"use client";

import Image from "next/image";
import type { Item } from "@/lib/sistur/catalog";
import { formatarBRL } from "@/lib/reserva/itens";
import { Stepper } from "./stepper";

/**
 * Visual card for one add-on.
 *
 * A barbecue pit costs between R$ 65 and R$ 190, and the list gave a customer
 * nothing but a name to choose from. Sistur already holds what they need — 59
 * photos across the pits, and a description carrying the capacity — none of
 * which reached the page. The card exists to spend that data.
 *
 * The photo comes from the item's **group**, not the item: all "Churrasqueiras
 * grandes (A)" are the same size and carry the same description, so one shot
 * illustrates the tariff.
 */

export type Grupo = {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
};

export function CardAdicional({
  item,
  grupo,
  quantidade,
  onQtd,
  unit,
  noites,
  emoji,
}: {
  item: Item;
  grupo?: Grupo;
  quantidade: number;
  onQtd: (v: number) => void;
  /** Preço resolvido pelo Sistur para a data. Ausente = data não escolhida. */
  unit?: number;
  noites: number;
  /** Ícone da seção, usado quando o item não tem foto. */
  emoji: string;
}) {
  const porDia = item.billing_type !== "FIXED";
  const selecionado = quantidade > 0;

  return (
    <li
      className={`flex flex-col overflow-hidden rounded-xl border bg-white transition-shadow ${
        selecionado
          ? "border-[var(--c-accent)] shadow-[0_0_0_1px_var(--c-accent)]"
          : "border-[var(--c-border)] hover:shadow-md"
      }`}
    >
      <div className="relative aspect-[4/3] w-full bg-[var(--c-surface)]">
        {grupo?.image_url ? (
          <Image
            src={grupo.image_url}
            alt={item.name}
            fill
            sizes="(min-width: 640px) 300px, 100vw"
            className="object-cover"
          />
        ) : (
          /* Placeholder em vez de espaço em branco: mantém a altura do cartão
             estável na grade, então as linhas não ficam desalinhadas quando só
             alguns itens têm foto. */
          <div className="flex h-full items-center justify-center text-3xl text-[var(--c-muted)]">
            <span aria-hidden="true">{emoji}</span>
          </div>
        )}

        {selecionado && (
          <span className="absolute top-2 right-2 rounded-full bg-[var(--c-accent-dark)] px-2 py-1 text-xs font-semibold text-white">
            {quantidade} selecionado{quantidade > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h4 className="text-sm leading-snug font-semibold text-[var(--c-fg)]">
          {item.name}
        </h4>

        {grupo?.description && (
          <p className="text-xs leading-snug text-[var(--c-muted)]">
            {grupo.description}
          </p>
        )}

        <p className="mt-auto pt-2 text-sm font-semibold text-[var(--c-fg)]">
          {unit === undefined ? (
            <span className="font-normal text-[var(--c-muted)]">
              Escolha a data para ver o valor
            </span>
          ) : (
            <>
              {formatarBRL(unit)}
              {porDia && (
                <span className="font-normal text-[var(--c-muted)]">
                  {" "}
                  por diária
                  {noites > 1 && ` · ${noites}× = ${formatarBRL(unit * noites)}`}
                </span>
              )}
            </>
          )}
        </p>

        <div className="mt-2 flex justify-end">
          <Stepper
            nome={`i${item.id}`}
            valor={quantidade}
            onChange={onQtd}
            rotulo={item.name}
          />
        </div>
      </div>
    </li>
  );
}
