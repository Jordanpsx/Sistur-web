import { getExperiencia } from "@/lib/sistur/catalog";
import { listarMidia } from "@/lib/sistur/midia";
import { BarracaDecorativa } from "@/components/imersivo/barraca-decorativa";
import { CenarioNoturno } from "@/components/imersivo/cenario-noturno";
import { CabecalhoFunil } from "@/components/reserva/cabecalho-funil";

/**
 * Casca de uma experiência — onde o funil ganha a cara dela.
 *
 * O tema vive neste nível, e não no layout do funil inteiro, porque é por
 * experiência: céu estrelado faz sentido em quem reserva uma noite e não faria
 * numa visita à vinícola. Envolve os quatro passos, então o fundo não troca
 * entre escolher a data e pagar.
 *
 * Quem decide é o dado. A categoria carrega `tema`, editável na tela do
 * operador — olhar o slug aqui fixaria no código do site uma decisão de
 * aparência que não é nossa e que muda sem deploy.
 *
 * ## Por que o céu é uma camada fixa, e não o `body`
 *
 * A saída óbvia para cobrir a tela inteira seria um `useEffect` pondo o atributo
 * no `document.body`. Funciona, e pisca: o servidor manda a página clara, o
 * navegador pinta, e só então o JavaScript escurece. Num tema noturno esse
 * lampejo branco é exatamente o que se quer evitar, e ele acontece em todo
 * carregamento.
 *
 * Uma camada `fixed inset-0 -z-10` renderizada no servidor cobre a viewport
 * desde o primeiro byte, sem JavaScript nenhum e sem estado para limpar quando
 * a pessoa navega para outra experiência.
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
  // A ilustração vem da biblioteca, por uma etiqueta só dela. Buscar por
  // "camping" traria também a foto do cartão da experiência, e o cenário
  // viraria uma paisagem esticada no canto na próxima vez que alguém subisse
  // uma foto. Sem nada etiquetado, o céu fica sem barraca — não com um vão.
  const [barraca] = noturno ? await listarMidia({ tag: "cenario-camping" }) : [];
  // A faixa de mata do rodapé, quando existir. Etiqueta própria: ela e a
  // barraca são peças diferentes do mesmo cenário e trocam em separado.
  const [chao] = noturno ? await listarMidia({ tag: "cenario-chao" }) : [];
  const [ceu] = noturno ? await listarMidia({ tag: "cenario-ceu" }) : [];

  return (
    <div data-tema={noturno ? "noturno" : undefined} className="relative">
      {noturno && (
        <>
          {/* Céu, lua, estrelas e chão. Fixo e atrás de tudo, inclusive do
              cabeçalho. */}
          <CenarioNoturno ceu={ceu?.url_absoluta} chao={chao?.url_absoluta} />
          {barraca && <BarracaDecorativa src={barraca.url_absoluta} />}
        </>
      )}

      <CabecalhoFunil noturno={noturno} />

      {/* Acima do enfeite: sem isto o formulário disputaria o clique com uma
          ilustração que não deveria receber nenhum. */}
      <main className="relative z-10 mx-auto max-w-4xl px-4 pb-24">{children}</main>
    </div>
  );
}
