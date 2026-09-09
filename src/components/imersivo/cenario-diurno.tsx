/**
 * O cenário do dia: céu claro com a paisagem da cachoeira ao fundo.
 *
 * Mesma arquitetura do `CenarioNoturno` — uma camada fixa, atrás de tudo — mas
 * mais simples: não há lua nem estrelas para posicionar, só um céu chapado e
 * uma faixa de paisagem ancorada ao rodapé.
 *
 * A arte original é um panorama com fundo branco por cima da linha de árvores
 * (o render não desenha céu nenhum). Por isso ela vira uma FAIXA no rodapé, e
 * não um `cover` de tela inteira: esticada por toda a viewport, aquele branco
 * apareceria como uma faixa clara cortando o topo em telas mais altas que
 * largas. Confinada a uma faixa baixa e dissolvendo no céu chapado por cima,
 * o recorte irregular da copa das árvores vira parte do desenho em vez de
 * defeito.
 *
 * O céu não é fotografia — é gradiente, medido para funcionar em qualquer
 * altura de tela sem emenda visível, do mesmo jeito que o céu noturno.
 */
export function CenarioDiurno({ paisagem }: { paisagem?: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <div className="ceu-diurno absolute inset-0" />

      {/* A faixa de paisagem, ancorada ao rodapé. Altura em vh, como a mata
          noturna — por largura ela estica ou encolhe com a proporção da tela
          e descasa do resto do cenário. */}
      <div className="paisagem-diurno absolute inset-x-0 bottom-0 h-[38vh]">
        {paisagem && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${paisagem})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "bottom center",
              backgroundSize: "cover",
            }}
          />
        )}
      </div>
    </div>
  );
}
