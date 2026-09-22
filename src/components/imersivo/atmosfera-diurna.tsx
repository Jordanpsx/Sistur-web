import type { CSSProperties } from "react";

/**
 * Nuvens e rajadas de vento atravessando o céu do day use.
 *
 * Vive dentro do `CenarioDiurno`, entre o céu e a paisagem, e não como camada
 * própria em `z-0`: o cabeçalho do funil não é posicionado, então qualquer
 * camada fixa com z-index positivo ou zero pinta por cima da logo. Aqui as
 * nuvens ficam atrás de tudo — inclusive das copas das árvores quando a tela é
 * larga e baixa e a paisagem sobe até o terço de cima.
 *
 * Só `transform` e `opacity` animam, para rodar no compositor sem repintar.
 * Com `prefers-reduced-motion` as nuvens param onde estão (cada uma tem uma
 * posição de repouso) e o vento some — ele só existe como movimento.
 */

type Nuvem = {
  forma: "a" | "b";
  topo: string;
  largura: string;
  opacidade: number;
  duracao: string;
  atraso: string;
  flutuacao: string;
  repouso: string;
};

// Atrasos negativos: a página já abre com as nuvens espalhadas pelo céu, em
// vez de todas entrando pela esquerda ao mesmo tempo.
const NUVENS: Nuvem[] = [
  {
    forma: "a",
    topo: "5%",
    largura: "clamp(130px, 22vw, 320px)",
    opacidade: 0.9,
    duracao: "80s",
    atraso: "-24s",
    flutuacao: "9s",
    repouso: "6vw",
  },
  {
    forma: "b",
    topo: "13%",
    largura: "clamp(150px, 26vw, 360px)",
    opacidade: 0.75,
    duracao: "62s",
    atraso: "-41s",
    flutuacao: "11s",
    repouso: "58vw",
  },
  {
    forma: "a",
    topo: "19%",
    largura: "clamp(110px, 17vw, 250px)",
    opacidade: 0.8,
    duracao: "52s",
    atraso: "-24s",
    flutuacao: "8s",
    repouso: "30vw",
  },
  {
    forma: "b",
    topo: "25%",
    largura: "clamp(120px, 20vw, 290px)",
    opacidade: 0.7,
    duracao: "70s",
    atraso: "-58s",
    flutuacao: "13s",
    repouso: "80vw",
  },
];

type Rajada = {
  topo: string;
  largura: string;
  duracao: string;
  atraso: string;
  traco: string;
  caminho: string;
};

const RAJADAS: Rajada[] = [
  {
    topo: "10%",
    largura: "clamp(200px, 30vw, 460px)",
    duracao: "19s",
    atraso: "-3s",
    traco: "70 26 14 26",
    caminho: "M4 38 C 110 8, 200 10, 290 30 S 470 56, 596 20",
  },
  {
    topo: "24%",
    largura: "clamp(170px, 24vw, 380px)",
    duracao: "25s",
    atraso: "-15s",
    traco: "90 22 10 22",
    caminho: "M4 26 C 120 50, 230 50, 320 30 S 500 6, 596 30",
  },
  {
    topo: "38%",
    largura: "clamp(180px, 27vw, 420px)",
    duracao: "31s",
    atraso: "-9s",
    traco: "56 30 18 30",
    caminho: "M4 34 C 90 14, 180 16, 260 34 S 430 54, 596 26",
  },
];

export function AtmosferaDiurna() {
  return (
    <div className="atmosfera-diurna absolute inset-0 overflow-hidden">
      {/* As formas são desenhadas uma vez e reusadas por `<use>`. Os ids são
          fixos porque o componente aparece uma vez por página. */}
      <svg width="0" height="0" className="absolute" focusable="false">
        <defs>
          <symbol id="atm-nuvem-a" viewBox="0 0 220 90">
            <ellipse cx="110" cy="72" rx="100" ry="16" />
            <circle cx="60" cy="58" r="26" />
            <circle cx="100" cy="42" r="36" />
            <circle cx="148" cy="50" r="30" />
            <circle cx="182" cy="62" r="20" />
          </symbol>
          <symbol id="atm-nuvem-b" viewBox="0 0 260 76">
            <ellipse cx="130" cy="60" rx="122" ry="14" />
            <circle cx="70" cy="50" r="20" />
            <circle cx="108" cy="38" r="28" />
            <circle cx="152" cy="42" r="24" />
            <circle cx="192" cy="52" r="16" />
          </symbol>
        </defs>
      </svg>

      {NUVENS.map((n, i) => (
        <div
          key={`nuvem-${i}`}
          className="nuvem"
          style={
            {
              top: n.topo,
              width: n.largura,
              opacity: n.opacidade,
              "--duracao": n.duracao,
              "--atraso": n.atraso,
              "--flutuacao": n.flutuacao,
              "--repouso": n.repouso,
            } as CSSProperties
          }
        >
          <svg
            className="nuvem-corpo"
            viewBox={n.forma === "a" ? "0 0 220 90" : "0 0 260 76"}
            focusable="false"
          >
            {/* A sombra, um pouco abaixo e mais fria, dá volume sem contorno. */}
            <use href={`#atm-nuvem-${n.forma}`} className="nuvem-sombra" y="4" />
            <use href={`#atm-nuvem-${n.forma}`} className="nuvem-luz" />
          </svg>
        </div>
      ))}

      {RAJADAS.map((r, i) => (
        <div
          key={`rajada-${i}`}
          className="rajada"
          style={
            {
              top: r.topo,
              width: r.largura,
              "--duracao": r.duracao,
              "--atraso": r.atraso,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 600 60" focusable="false">
            <path d={r.caminho} strokeDasharray={r.traco} />
          </svg>
        </div>
      ))}
    </div>
  );
}
