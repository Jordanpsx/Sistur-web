# Design System — Cachoeira do Girassol

Aplica-se ao `sistur-web`. Leia antes de escolher qualquer cor.

---

## 1. A paleta

| Cor | Hex | RGB | Significado |
|---|---|---|---|
| Laranja | `#F27405` | 242, 116, 5 | Alegria e diversão |
| Amarelo Girassol | `#FAB005` | 250, 176, 5 | Alegria, diversão e confiança |
| Verde | `#00A836` | 0, 168, 54 | Segurança e prazer |
| Azul Intermediário | `#0A4D8C` | 10, 77, 140 | Segurança e prazer |
| Azul Escuro / Marinho | `#14284D` | 20, 40, 77 | Confiança |

### Os três pares da marca

| Par | Cores | Uso |
|---|---|---|
| Alegria e Diversão | Laranja + Amarelo | Blocos, ícones, destaques de lazer |
| Segurança e Prazer | Verde + Azul Intermediário | Confirmação, estados de sucesso |
| Confiança | Amarelo + Azul Marinho | Chamada principal, cabeçalhos |

---

## 2. O que cada par aguenta — medido, não estimado

Contraste de cada par, um sobre o outro:

| Par | Contraste | Serve para |
|---|---|---|
| Alegria (laranja sobre amarelo) | **1,5:1** | Só forma. **Nunca texto.** |
| Segurança (verde sobre azul interm.) | **2,7:1** | Só forma. **Nunca texto.** |
| Confiança (amarelo sobre marinho) | **7,8:1** | Texto à vontade |

Dois dos três pares não passam nem perto dos 4,5:1 do WCAG AA. Eles descrevem
**harmonia**, não legibilidade — use-os em áreas, bordas e ícones, e escolha a
cor do texto à parte.

### Texto sobre cada cor

| Fundo | Texto branco | Texto marinho `#14284D` |
|---|---|---|
| Laranja | 2,9:1 ✗ | **5,1:1 ✓** |
| Amarelo | 1,9:1 ✗ | **7,9:1 ✓** |
| Verde | 3,2:1 ✗ | **4,6:1 ✓** |
| Azul Intermediário | **8,6:1 ✓** | 1,7:1 ✗ |
| Azul Marinho | **14,6:1 ✓** | — |

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

## 3. Como aplicar neste projeto

### Sempre por token, nunca literal

O site inteiro lê `var(--c-*)`, definidos em `src/app/globals.css`. Escrever
`bg-[#FAB005]` ou `bg-yellow-400` num componente quebra o white-label e espalha
a decisão de cor por dentro da lógica.

```
❌ className="bg-[#FAB005]"      ❌ className="bg-green-800"
✅ className="bg-[var(--c-primary)]"
```

### Onde a paleta está hoje

| Token | Valor atual | Cor da marca | Situação |
|---|---|---|---|
| `--c-primary` | `#f5b301` | Amarelo `#FAB005` | Praticamente igual (distância 12) |
| `--c-accent` | `#4caf50` | Verde `#00A836` | Verde diferente (distância 109) |
| `--c-panel` | `#245c2b` | Marinho `#14284D` | **É verde onde a marca é azul** |
| — | — | Laranja `#F27405` | Não existe no código |
| — | — | Azul interm. `#0A4D8C` | Não existe no código |

Trocar `--c-panel` de verde para marinho muda a tabela de valores e o cabeçalho
de cada formulário. Não é ajuste de tom, é troca de matiz — verifique as telas
antes de dar como pronto.

---

## 4. Regras que já custaram caro

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

## 5. Antes de dar por pronto

- [ ] Nenhum hex literal de marca no componente — só `var(--c-*)`
- [ ] Todo texto sobre cor de marca ≥ 4,5:1 (≥ 3:1 se ≥ 24px ou negrito ≥ 19px)
- [ ] Alvos de toque ≥ 44px
- [ ] Funciona a 375px sem rolagem horizontal
- [ ] O que aparece no hover está visível no toque
- [ ] As regras chegaram à folha de estilo entregue, não só ao fonte
