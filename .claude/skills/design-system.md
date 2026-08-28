# Design System — Cachoeira do Girassol

Aplica-se ao `sistur-web`.

## O que isto é, e o que não é

É **padronização de apresentação**, não exclusividade. As páginas públicas —
home, fotos, restaurante, sobre nós, termos — vestem a paleta da marca, e é
nelas que a consistência importa: são a cara do lugar, e alguém que chega por
uma delas precisa reconhecer as outras.

**Formulários podem sair da paleta.** O funil tem outro trabalho: ele veste a
experiência que está sendo vendida. O tema noturno do camping usa azul-marinho
tirado da própria arte do céu, e isso é acerto, não desvio — a cor ali serve à
noite de acampamento, não ao manual.

O que não muda em lugar nenhum: a **fonte** (seção 1) e o **contraste**
(seção 3). Tipografia e acessibilidade não têm versão temática.

---

## 1. Tipografia

**Open Sans em todo o sistema de páginas** — apresentação e formulários. Aqui
não há a distinção da paleta: a fonte é padrão em toda tela.

Carregada por `next/font/google` no layout raiz, nunca por `<link>` para o
Google. A diferença não é estilística:

- baixada no build e servida do nosso domínio — uma requisição a menos a um
  terceiro em cada visita;
- sem salto de layout quando ela chega;
- a página continua correta onde o Google está bloqueado, o que acontece em
  Wi-Fi corporativo e em algumas redes móveis.

Variável, então os pesos de 300 a 800 saem de um arquivo só. Pedir peso a peso
baixaria cinco arquivos para a mesma coisa.

```tsx
const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--fonte-base",
  display: "swap",
});
// <html className={openSans.variable}> e --font-sans no @theme
```

A pilha depois da variável (`system-ui`, `Segoe UI`, Roboto…) é o que aparece
nos milissegundos até a fonte carregar, e nas raras vezes em que ela falha.
Nunca deixe `--font-sans` terminar na variável sozinha.

---

## 2. A paleta

| Cor                   | Hex       | RGB         | Significado                   |
| --------------------- | --------- | ----------- | ----------------------------- |
| Laranja               | `#F27405` | 242, 116, 5 | Alegria e diversão            |
| Amarelo Girassol      | `#FAB005` | 250, 176, 5 | Alegria, diversão e confiança |
| Verde                 | `#00A836` | 0, 168, 54  | Segurança e prazer            |
| Azul Intermediário    | `#0A4D8C` | 10, 77, 140 | Segurança e prazer            |
| Azul Escuro / Marinho | `#14284D` | 20, 40, 77  | Confiança                     |

### Os três pares da marca

| Par                | Cores                      | Uso                                |
| ------------------ | -------------------------- | ---------------------------------- |
| Alegria e Diversão | Laranja + Amarelo          | Blocos, ícones, destaques de lazer |
| Segurança e Prazer | Verde + Azul Intermediário | Confirmação, estados de sucesso    |
| Confiança          | Amarelo + Azul Marinho     | Chamada principal, cabeçalhos      |

---

## 3. O que cada par aguenta — medido, não estimado

Esta seção vale em toda tela, dentro ou fora da paleta.

Contraste de cada par, um sobre o outro:

| Par                                  | Contraste | Serve para                 |
| ------------------------------------ | --------- | -------------------------- |
| Alegria (laranja sobre amarelo)      | **1,5:1** | Só forma. **Nunca texto.** |
| Segurança (verde sobre azul interm.) | **2,7:1** | Só forma. **Nunca texto.** |
| Confiança (amarelo sobre marinho)    | **7,8:1** | Texto à vontade            |

Dois dos três pares não passam nem perto dos 4,5:1 do WCAG AA. Eles descrevem
**harmonia**, não legibilidade — use-os em áreas, bordas e ícones, e escolha a
cor do texto à parte.

### Texto sobre cada cor

| Fundo              | Texto branco | Texto marinho `#14284D` |
| ------------------ | ------------ | ----------------------- |
| Laranja            | 2,9:1 ✗      | **5,1:1 ✓**             |
| Amarelo            | 1,9:1 ✗      | **7,9:1 ✓**             |
| Verde              | 3,2:1 ✗      | **4,6:1 ✓**             |
| Azul Intermediário | **8,6:1 ✓**  | 1,7:1 ✗                 |
| Azul Marinho       | **14,6:1 ✓** | —                       |

**Regra prática:** laranja, amarelo e verde pedem texto escuro. Os dois azuis
pedem texto branco. Branco sobre amarelo (1,9:1) é o erro mais fácil de cometer
e o mais grave.

### O verde não carrega texto branco

`#00A836` com branco dá **3,2:1** e reprova. Quando um botão verde precisar de
texto branco, use `#007525` (5,9:1) como superfície e guarde `#00A836` para
preenchimento sem texto.

> Isto **já é um defeito hoje**: o botão "Continuar" usa `--c-accent: #4caf50`
> com texto branco, o que dá 2,8:1. Adotar a paleta sem escurecer o verde apenas
> leva o problema adiante.

---

## 4. Como aplicar neste projeto

### Sempre por token, nunca literal

Vale para qualquer cor, da marca ou não. O site lê `var(--c-*)`, definidos em
`src/app/globals.css`. Escrever `bg-[#FAB005]` ou `bg-green-800` num componente
quebra o white-label e espalha decisão de aparência por dentro da lógica.

Cor fora da paleta também vira token — o tema noturno define os dele num escopo
`[data-tema="noturno"]`, sem tocar no claro.

```
❌ className="bg-[#FAB005]"      ❌ className="bg-green-800"
✅ className="bg-[var(--c-primary)]"
```

### Os tokens de cor

| Token              | Valor     | Para quê                                                   |
| ------------------ | --------- | ---------------------------------------------------------- |
| `--c-primary`      | `#FAB005` | Amarelo da marca. Ação principal, com texto escuro         |
| `--c-primary-dark` | `#D89A00` | Hover do amarelo                                           |
| `--c-accent`       | `#00A836` | Verde da marca — borda, ícone, preenchimento **sem texto** |
| `--c-accent-dark`  | `#007525` | Superfície sólida com texto branco (5,9:1) e texto verde   |
| `--c-accent-deep`  | `#00601E` | Hover dessa superfície                                     |
| `--c-panel`        | `#245c2b` | Painel da tabela de valores — verde-mata, por decisão      |
| `--c-brand-navy`   | `#14284D` | Marinho da marca. Sem uso ainda                            |
| `--c-info`         | `#2f6fd0` | Aviso informativo                                          |
| `--c-info-surface` | `#eef4fb` | Fundo desse aviso                                          |

Três tokens de verde porque são três trabalhos, e o do meio existe por medição:
o verde da marca dá 3,2:1 com texto branco e reprova. Nunca use `--c-accent`
como fundo de algo escrito.

O painel segue verde-mata de propósito. O marinho existe no token e está livre
para quando um bloco pedir a sobriedade dele — trocar o painel por ele mudaria
o clima de floresta da tabela de preços por um painel corporativo.

Alinhar os tokens é sobre as **páginas de apresentação**. Um formulário que
tenha razão para outra cor define a dele no próprio escopo.

---

## 5. Regras que já custaram caro

Não são preferências: cada uma veio de um defeito real neste projeto.

**Campo de formulário é branco sólido.** Nunca translúcido, nunca colorido. Um
`<input>` com vidro fosco fotografa bem e destrói a legibilidade de quem digita
CPF no celular, no sol.

**Preço nunca é literal.** Todo valor vem do Sistur em tempo de requisição. A
home antiga guardava preço em campo de ACF e ele divergiu do cobrado — sob o CDC
Art. 30, o anúncio obriga o fornecedor.

**Verifique o CSS entregue, não o fonte.** Classe presente no componente não
prova regra emitida. Já aconteceu de a variante existir no JSX e o Tailwind não
gerar nada — baixe a folha e confira.

**Conteúdo só no `:hover` não existe no toque.** A maioria acessa por celular.
Se algo se revela no hover, ele precisa estar visível por padrão e recolher-se
só onde há mouse (`pointer-fine`), com `group-focus-within` acompanhando para
o teclado.

**Calcule o contraste antes de escolher a opacidade.** Vidro a 10% sobre fundo
escuro põe o texto secundário em 1,1:1. O número decide, não o gosto.

---

## 6. Antes de dar por pronto

- [ ] Open Sans carregando por `next/font`, com pilha de reserva
- [ ] Nenhum hex literal no componente — só `var(--c-*)`
- [ ] Página de apresentação veste a paleta da marca
- [ ] Todo texto sobre qualquer cor ≥ 4,5:1 (≥ 3:1 se ≥ 24px ou negrito ≥ 19px)
- [ ] Alvos de toque ≥ 44px
- [ ] Funciona a 375px sem rolagem horizontal
- [ ] O que aparece no hover está visível no toque
- [ ] As regras chegaram à folha de estilo entregue, não só ao fonte
