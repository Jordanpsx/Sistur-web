import { getExperiencia } from "@/lib/sistur/catalog";
import { BarracaDecorativa } from "@/components/imersivo/barraca-decorativa";

/**
 * Casca de uma experiência — onde o funil ganha a cara dela.
 *
 * Existe neste nível, e não no layout do funil inteiro, porque o tema é por
 * experiência: céu estrelado faz sentido em quem está reservando uma noite e
 * não faria numa visita à vinícola. Envolve os quatro passos, então a pessoa
 * não vê o fundo trocar entre escolher a data e pagar.
 *
 * Quem decide é o dado. A categoria carrega `tema`, editável na tela do
 * operador — olhar o slug aqui seria fixar no código do site uma decisão de
 * aparência que não é nossa, e que muda sem deploy.
 */
export default async function ExperienciaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ experiencia: string }>;
}) {
  const e = await getExperiencia((await params).experiencia);
  const noturno = e?.tema === "noturno";

  if (!noturno) return <>{children}</>;

  return (
    <div data-tema="noturno" className="relative">
      <BarracaDecorativa />
      {/* Acima do enfeite. Sem isto o formulário disputaria o clique com uma
          ilustração que não deveria receber nenhum. */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
