/**
 * Casca do funil.
 *
 * Só a coluna. O cabeçalho saiu daqui de propósito: o tema é escolhido por
 * experiência, e este layout está acima do segmento que sabe qual é — deixar o
 * cabeçalho aqui produzia uma faixa branca fixa por cima do céu noturno, com
 * uma emenda visível no meio da tela.
 *
 * Quem renderiza o cabeçalho agora é quem conhece o tema: a tela de escolha e o
 * layout de cada experiência. Resolvido no servidor, sem o pisca-branco que um
 * `useEffect` no `body` produziria a cada carregamento.
 */
export default function BookingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
