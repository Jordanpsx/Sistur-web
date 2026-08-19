"use client";

import { useState } from "react";
import Image from "next/image";
import type { Recurso } from "@/lib/reserva/recursos";
import { formatarBRL } from "@/lib/reserva/itens";
import { Galeria } from "./galeria";

/**
 * One physical barbecue pit.
 *
 * Selection is a toggle, not a stepper: "Churrasqueira A4" is one specific pit,
 * so the only meaningful quantities are zero and one. A stepper here would
 * invite someone to ask for two of a thing there is one of.
 *
 * Only one pit per booking, so choosing another swaps rather than adds — the
 * button says "Trocar por esta" when something else is already picked, which is
 * gentler than disabling every other card and leaving someone hunting for the
 * one to untick.
 *
 * An unavailable pit stays on the page, greyed and disabled, rather than being
 * hidden. Removing it would leave a customer wondering where A4 went and trying
 * other dates blindly; shown as taken, it says the date is the problem.
 */
export function CardRecurso({
  recurso,
  selecionado,
  onToggle,
  unit,
  noites,
  outraEscolhida,
}: {
  recurso: Recurso;
  selecionado: boolean;
  onToggle: (marcado: boolean) => void;
  /** Preço resolvido pelo Sistur para a data; cai no de tabela se ausente. */
  unit?: number;
  noites: number;
  /** Já existe outra churrasqueira escolhida — só uma por reserva. */
  outraEscolhida: boolean;
}) {
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const indisponivel = !recurso.is_available;
  const valor = unit ?? recurso.price;
  const capa = recurso.images[0];

  return (
    <li
      className={`flex flex-col overflow-hidden rounded-xl border bg-white transition
                  ${indisponivel
                    ? "border-[var(--c-border)] opacity-55"
                    : selecionado
                      ? "border-[var(--c-accent)] shadow-[0_0_0_1px_var(--c-accent)]"
                      : "border-[var(--c-border)] hover:shadow-md"}`}
    >
      <div className="relative aspect-[4/3] w-full bg-[var(--c-surface)]">
        {capa ? (
          <button
            type="button"
            onClick={() => setGaleriaAberta(true)}
            aria-label={`Ver fotos da ${recurso.name}`}
            className="group absolute inset-0 h-full w-full cursor-zoom-in"
          >
            <Image
              src={capa}
              alt={recurso.name}
              fill
              // Miniatura mesmo: duas colunas no celular, três a partir de
              // 1024px. Quem quer ver de perto abre a galeria.
              sizes="(min-width: 1024px) 280px, 45vw"
              quality={85}
              className="object-cover transition-transform group-hover:scale-105"
            />
            {recurso.images.length > 1 && (
              <span
                className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1
                           text-xs font-medium text-white"
              >
                {recurso.images.length} fotos
              </span>
            )}
          </button>
        ) : (
          <div className="flex h-full items-center justify-center text-3xl text-[var(--c-muted)]">
            <span aria-hidden="true">🔥</span>
          </div>
        )}

        {indisponivel && (
          <span
            className="absolute left-2 top-2 rounded-full bg-[var(--f-err-fg)] px-2 py-1
                       text-xs font-semibold text-white"
          >
            Indisponível
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h4 className="text-sm font-semibold leading-snug text-[var(--c-fg)]">
          {recurso.name}
        </h4>

        {recurso.description && (
          <p className="text-xs leading-snug text-[var(--c-muted)]">
            {recurso.description}
          </p>
        )}

        <p className="mt-auto pt-2 text-sm font-semibold text-[var(--c-fg)]">
          {formatarBRL(valor)}
          {noites > 1 && (
            <span className="font-normal text-[var(--c-muted)]">
              {" "}· {noites} diárias = {formatarBRL(valor * noites)}
            </span>
          )}
        </p>

        <button
          type="button"
          disabled={indisponivel}
          onClick={() => onToggle(!selecionado)}
          className={`mt-2 min-h-[44px] rounded-lg px-4 text-sm font-semibold transition-colors
                      ${selecionado
                        ? "bg-[var(--c-accent)] text-white hover:bg-[var(--c-accent-dark)]"
                        : "border border-[var(--c-accent)] text-[var(--c-accent-dark)] hover:bg-[var(--c-surface)]"}
                      disabled:cursor-not-allowed disabled:border-[var(--c-border)]
                      disabled:bg-transparent disabled:text-[var(--c-muted)]`}
        >
          {indisponivel
            ? "Reservada"
            : selecionado
              ? "Selecionada ✓"
              : outraEscolhida
                ? "Trocar por esta"
                : "Selecionar"}
        </button>

        {/* Sem JavaScript o botão acima não faz nada, então o estado precisa
            viajar num campo de verdade. */}
        {selecionado && <input type="hidden" name={`r${recurso.id}`} value="1" />}
      </div>

      {galeriaAberta && (
        <Galeria
          titulo={recurso.name}
          imagens={recurso.images}
          onFechar={() => setGaleriaAberta(false)}
        />
      )}
    </li>
  );
}
