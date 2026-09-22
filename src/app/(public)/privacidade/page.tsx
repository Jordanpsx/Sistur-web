import type { Metadata } from "next";
import Link from "next/link";
import { CONTATO, ENDERECO } from "@/lib/local";

/**
 * Política de Privacidade.
 *
 * Fica em código, e não no CMS como os Termos, porque descreve o código: a
 * lista de terceiros, os cookies e o que o funil coleta mudam junto com os
 * componentes que os introduzem. Um mapa novo na home ou um SDK novo no
 * pagamento é a mesma alteração que precisa atualizar esta página — no mesmo
 * commit, e não num editor que ninguém lembra de abrir. Também é o que leva o
 * texto para produção pelo deploy, sem recriá-lo à mão no admin.
 *
 * Esta rota tem precedência sobre o catch-all: uma página publicada no admin
 * com o slug `privacidade` nunca apareceria enquanto este arquivo existir.
 *
 * Cada afirmação aqui foi conferida no sistema. Ao mudar o que o site ou o
 * Sistur coletam, compartilham ou guardam, mude esta página junto e a data em
 * `ATUALIZADA_EM`.
 */

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Quais dados a Cachoeira do Girassol coleta ao reservar, pagar e conversar pelo " +
    "WhatsApp, para que usa, com quem compartilha, por quanto tempo guarda e como " +
    "exercer seus direitos pela LGPD.",
  alternates: { canonical: "/privacidade/" },
};

const ATUALIZADA_EM = "21 de setembro de 2026";

/**
 * Identificação formal do controlador. Só aparece quando preenchida: publicar
 * um CNPJ de exemplo numa página jurídica é pior do que não publicar nenhum.
 */
const CONTROLADOR: { razaoSocial: string | null; cnpj: string | null } = {
  razaoSocial: null,
  cnpj: null,
};

/** Nome do encarregado (art. 41). Sem nome, o canal de contato responde por ele. */
const ENCARREGADO: string | null = null;

function Secao({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-28 flex-col gap-3">
      <h2 className="text-xl font-bold tracking-tight">{titulo}</h2>
      {children}
    </section>
  );
}

function Lista({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5">{children}</ul>;
}

const LINK = "font-medium text-[var(--c-info)] underline underline-offset-2";

const SUMARIO: [string, string][] = [
  ["quem-somos", "Quem somos"],
  ["dados", "Que dados coletamos"],
  ["finalidades", "Para que usamos e com qual base legal"],
  ["compartilhamento", "Com quem compartilhamos"],
  ["internacional", "Transferência para fora do Brasil"],
  ["assistente", "Atendimento automatizado no WhatsApp"],
  ["cookies", "Cookies e tecnologias semelhantes"],
  ["retencao", "Por quanto tempo guardamos"],
  ["seguranca", "Como protegemos"],
  ["direitos", "Seus direitos"],
  ["criancas", "Crianças e adolescentes"],
  ["encarregado", "Encarregado de dados"],
  ["alteracoes", "Alterações nesta política"],
];

export default function PoliticaDePrivacidade() {
  return (
    <article className="mx-auto max-w-[65ch] px-4 py-12 sm:py-16">
      <header className="mb-10 border-b border-[var(--c-border)] pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--c-fg)] sm:text-4xl">
          Política de Privacidade
        </h1>
        <p className="mt-3 text-sm text-[var(--c-muted)]">
          Última atualização: {ATUALIZADA_EM}
        </p>
        <p className="mt-4 leading-relaxed text-[var(--c-fg)]">
          Esta política explica quais dados pessoais tratamos quando você visita este
          site, faz uma reserva, paga ou conversa com a gente pelo WhatsApp — e o que você
          pode fazer a respeito. Ela segue a Lei Geral de Proteção de Dados (Lei nº
          13.709/2018, a LGPD).
        </p>
      </header>

      <aside className="mb-10 rounded-xl bg-[var(--c-surface)] p-5 text-sm leading-relaxed text-[var(--c-fg)]">
        <p className="font-semibold">Em resumo</p>
        <Lista>
          <li>Pedimos só o necessário para a reserva: nome, CPF, e-mail e telefone.</li>
          <li>
            Os dados do seu cartão vão direto para o Mercado Pago e nunca passam por nós.
          </li>
          <li>
            Não vendemos dados e não usamos ferramentas de publicidade ou de análise de
            visitas.
          </li>
          <li>
            Você pode pedir acesso, correção ou eliminação a qualquer momento pelo{" "}
            <a href={CONTATO.whatsappUrl} className={LINK}>
              WhatsApp
            </a>{" "}
            ou pelo e-mail{" "}
            <a href={`mailto:${CONTATO.email}`} className={LINK}>
              {CONTATO.email}
            </a>
            .
          </li>
        </Lista>
      </aside>

      <nav aria-label="Seções desta política" className="mb-12">
        <p className="mb-2 text-sm font-semibold text-[var(--c-muted)] uppercase">
          Nesta página
        </p>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
          {SUMARIO.map(([id, titulo]) => (
            <li key={id}>
              <a href={`#${id}`} className={LINK}>
                {titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-col gap-10 leading-relaxed text-[var(--c-fg)]">
        <Secao id="quem-somos" titulo="1. Quem somos">
          <p>
            A <strong>Cachoeira do Girassol</strong>
            {CONTROLADOR.razaoSocial && <> ({CONTROLADOR.razaoSocial})</>}
            {CONTROLADOR.cnpj && <>, inscrita no CNPJ sob o nº {CONTROLADOR.cnpj}</>}, com
            endereço em {ENDERECO.logradouro}, {ENDERECO.cidade} — {ENDERECO.uf}, CEP{" "}
            {ENDERECO.cep}, é a <strong>controladora</strong> dos dados tratados nesta
            política: é quem decide para que e como eles são usados.
          </p>
          <p>
            Contato: WhatsApp {CONTATO.whatsapp} ou e-mail{" "}
            <a href={`mailto:${CONTATO.email}`} className={LINK}>
              {CONTATO.email}
            </a>
            .
          </p>
        </Secao>

        <Secao id="dados" titulo="2. Que dados coletamos">
          <p>
            <strong>Ao reservar pelo site:</strong> nome completo, CPF, e-mail, telefone
            (WhatsApp), as datas e os ingressos escolhidos e, se você quiser, o texto do
            campo de observações — tudo o que você escrever nele chega à nossa equipe
            junto com a reserva, então evite colocar ali informações que não precisamos
            saber.
          </p>
          <p>
            <strong>Ao pagar:</strong> o pagamento por cartão de crédito, débito ou PIX é
            feito pelo Mercado Pago. Os dados do cartão são digitados num formulário do
            próprio Mercado Pago e vão direto para ele — nem este site nem nossos sistemas
            têm acesso ao número do cartão. De nossa parte, enviamos ao Mercado Pago seu
            nome, e-mail, CPF e o valor da reserva, e recebemos de volta a situação do
            pagamento (aprovado, pendente ou recusado).
          </p>
          <p>
            <strong>Ao falar pelo WhatsApp:</strong> seu número, o nome do seu perfil, as
            mensagens que você envia e os dados que você informar para reservar (como nome
            e CPF).
          </p>
          <p>
            <strong>Ao navegar:</strong> este site não usa ferramentas de análise de
            visitas nem cria cookies próprios para acompanhar você. Quando algo dá errado
            numa etapa da reserva ou do pagamento, registramos um relatório técnico do
            erro — a etapa em que ele aconteceu, o código do erro, o número da reserva e o
            nome de quem estava reservando —, para podermos corrigir o problema. Não
            registramos o endereço IP de quem visita o site.
          </p>
        </Secao>

        <Secao id="finalidades" titulo="3. Para que usamos e com qual base legal">
          <p>A LGPD exige uma base legal para cada uso. As nossas são:</p>
          <Lista>
            <li>
              <strong>Emitir e gerenciar sua reserva</strong>, identificar você na
              portaria e falar com você sobre ela — execução de contrato e dos
              procedimentos que o antecedem (art. 7º, V). O CPF é o que a portaria usa
              para conferir que a reserva é sua e o que permite consultar uma reserva já
              feita.
            </li>
            <li>
              <strong>Processar o pagamento e prevenir fraudes</strong> — execução de
              contrato (art. 7º, V) e proteção do crédito (art. 7º, X).
            </li>
            <li>
              <strong>Responder suas mensagens</strong> no WhatsApp — execução de contrato
              quando o assunto é uma reserva (art. 7º, V) e nosso legítimo interesse em
              atender quem nos procura (art. 7º, IX).
            </li>
            <li>
              <strong>Cumprir obrigações legais e fiscais</strong>, como guardar registros
              de vendas e atender a autoridades — cumprimento de obrigação legal (art. 7º,
              II).
            </li>
            <li>
              <strong>Corrigir falhas e proteger o site</strong> com os relatórios
              técnicos de erro — legítimo interesse (art. 7º, IX).
            </li>
          </Lista>
          <p>
            Não usamos seus dados para publicidade de terceiros e não os vendemos. Se um
            dia quisermos enviar promoções, isso só acontecerá com o seu consentimento,
            que poderá ser retirado quando você quiser.
          </p>
        </Secao>

        <Secao id="compartilhamento" titulo="4. Com quem compartilhamos">
          <p>
            Só com quem é necessário para o serviço funcionar, cada um recebendo apenas o
            que precisa:
          </p>
          <Lista>
            <li>
              <strong>Mercado Pago</strong> — processa os pagamentos. Recebe nome, e-mail,
              CPF e valor e, no formulário de pagamento, pode coletar dados do seu
              dispositivo para prevenir fraudes.
            </li>
            <li>
              <strong>WhatsApp (Meta)</strong> — as mensagens trocadas conosco trafegam
              pela plataforma do WhatsApp, sob as regras de privacidade dela.
            </li>
            <li>
              <strong>OpenAI</strong> — fornece a inteligência artificial do nosso
              assistente virtual no WhatsApp (veja o item 6). O conteúdo da conversa é
              enviado a ela para gerar as respostas e, pelos termos do serviço que
              contratamos, não é usado para treinar os modelos da OpenAI.
            </li>
            <li>
              <strong>Google</strong> — o mapa da página inicial é do Google Maps e é
              carregado diretamente do Google pelo seu navegador. As avaliações exibidas
              no site também vêm do Google; para isso nenhum dado seu é enviado.
            </li>
            <li>
              <strong>Autoridades públicas</strong>, quando a lei ou uma ordem judicial
              exigir.
            </li>
          </Lista>
          <p>
            O sistema de reservas, o sistema de atendimento e a transcrição de áudios
            funcionam em servidores contratados por nós, e não são compartilhados com
            outras empresas.
          </p>
        </Secao>

        <Secao id="internacional" titulo="5. Transferência para fora do Brasil">
          <p>
            OpenAI, Google e Meta (WhatsApp) podem processar dados em servidores fora do
            Brasil, principalmente nos Estados Unidos. Essas transferências seguem o art.
            33 da LGPD e acontecem apenas na medida necessária para os serviços descritos
            no item anterior.
          </p>
        </Secao>

        <Secao id="assistente" titulo="6. Atendimento automatizado no WhatsApp">
          <p>
            Parte do atendimento no WhatsApp é feita por um assistente virtual com
            inteligência artificial, que responde dúvidas, faz cotações e pode registrar
            reservas com os dados que você informar. Ele não toma decisões sobre você:
            preços e disponibilidade vêm do nosso sistema de reservas, com as mesmas
            regras do site.
          </p>
          <p>
            Nossa equipe acompanha as conversas e pode assumir o atendimento. Se preferir
            falar com uma pessoa, é só pedir na própria conversa.
          </p>
        </Secao>

        <Secao id="cookies" titulo="7. Cookies e tecnologias semelhantes">
          <p>
            Este site não cria cookies de publicidade nem de análise de visitas. Dois
            serviços de terceiros, porém, podem usar cookies ou identificadores do
            navegador quando são carregados:
          </p>
          <Lista>
            <li>
              <strong>Google Maps</strong>, no mapa da página inicial, carregado apenas
              quando você rola a página até ele.
            </li>
            <li>
              <strong>Mercado Pago</strong>, na etapa de pagamento, para processar a
              transação e prevenir fraudes.
            </li>
          </Lista>
          <p>
            Você pode bloquear ou apagar cookies nas configurações do seu navegador. O
            site continua funcionando, mas o pagamento pode não ser concluído se os
            cookies do Mercado Pago forem bloqueados.
          </p>
        </Secao>

        <Secao id="retencao" titulo="8. Por quanto tempo guardamos">
          <Lista>
            <li>
              <strong>Reservas e pagamentos:</strong> por até 5 anos após a data da
              visita, prazo em que ainda podem ser exigidos por obrigações fiscais ou em
              reclamações de consumo.
            </li>
            <li>
              <strong>Conversas no WhatsApp:</strong> pelo tempo necessário para o
              atendimento e para resolver eventuais pendências da reserva.
            </li>
            <li>
              <strong>Relatórios técnicos de erro:</strong> pelo tempo necessário para
              investigar e corrigir a falha.
            </li>
          </Lista>
          <p>
            Terminado o prazo, os dados são eliminados ou anonimizados — ou seja,
            transformados de forma que não seja mais possível identificar você —, salvo
            quando a lei exigir que sejam mantidos por mais tempo.
          </p>
        </Secao>

        <Secao id="seguranca" titulo="9. Como protegemos">
          <Lista>
            <li>Toda a comunicação com o site é criptografada (HTTPS).</li>
            <li>Os dados do cartão nunca passam pelos nossos sistemas.</li>
            <li>
              Só funcionários autorizados acessam os dados das reservas, cada um com
              acesso limitado ao que a sua função exige.
            </li>
            <li>
              Toda alteração em uma reserva fica registrada, com quem a fez e quando.
              Nesses registros o CPF aparece apenas parcialmente.
            </li>
          </Lista>
          <p>
            Nenhum sistema é totalmente imune a incidentes. Se ocorrer um que possa trazer
            risco ou dano relevante a você, avisaremos você e a Autoridade Nacional de
            Proteção de Dados (ANPD), como determina a lei.
          </p>
        </Secao>

        <Secao id="direitos" titulo="10. Seus direitos">
          <p>Pela LGPD (art. 18), você pode pedir, a qualquer momento:</p>
          <Lista>
            <li>a confirmação de que tratamos seus dados e o acesso a eles;</li>
            <li>a correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>
              a anonimização, o bloqueio ou a eliminação de dados desnecessários,
              excessivos ou tratados em desacordo com a lei;
            </li>
            <li>a portabilidade dos seus dados a outro fornecedor;</li>
            <li>a informação sobre com quem compartilhamos seus dados;</li>
            <li>
              a eliminação dos dados tratados com o seu consentimento e a revogação desse
              consentimento;
            </li>
            <li>
              a oposição a um tratamento feito sem consentimento, quando ele não cumprir a
              lei.
            </li>
          </Lista>
          <p>
            Para exercer qualquer um deles, fale com a gente pelo WhatsApp{" "}
            {CONTATO.whatsapp} ou pelo e-mail{" "}
            <a href={`mailto:${CONTATO.email}`} className={LINK}>
              {CONTATO.email}
            </a>
            . Para proteger você, poderemos pedir a confirmação da sua identidade antes de
            atender. Respondemos em até 15 dias. Alguns dados podem continuar guardados
            mesmo após um pedido de eliminação, quando a lei nos obrigar a mantê-los —
            nesse caso, explicaremos o motivo.
          </p>
          <p>
            Se achar que seu pedido não foi atendido, você também pode reclamar à{" "}
            <a
              href="https://www.gov.br/anpd"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK}
            >
              Autoridade Nacional de Proteção de Dados (ANPD)
            </a>
            .
          </p>
        </Secao>

        <Secao id="criancas" titulo="11. Crianças e adolescentes">
          <p>
            As reservas são feitas por um adulto responsável. O site não pede nome nem
            documento de crianças: os ingressos com meia-entrada ou isenção são escolhidos
            apenas pela quantidade, e a idade é comprovada na portaria, com a apresentação
            de um documento.
          </p>
        </Secao>

        <Secao id="encarregado" titulo="12. Encarregado de dados">
          <p>
            O encarregado é quem responde pelos assuntos de proteção de dados na Cachoeira
            do Girassol e faz a ponte com os titulares e com a ANPD.
            {ENCARREGADO && <> Hoje, essa função é exercida por {ENCARREGADO}.</>} Fale
            com o encarregado pelo e-mail{" "}
            <a href={`mailto:${CONTATO.email}`} className={LINK}>
              {CONTATO.email}
            </a>
            , indicando no assunto “Proteção de dados”.
          </p>
        </Secao>

        <Secao id="alteracoes" titulo="13. Alterações nesta política">
          <p>
            Sempre que mudarmos o que coletamos, com quem compartilhamos ou como usamos
            seus dados, esta página será atualizada antes da mudança, com a nova data no
            topo.
          </p>
        </Secao>
      </div>

      <footer className="mt-12 border-t border-[var(--c-border)] pt-6 text-sm text-[var(--c-muted)]">
        Veja também os{" "}
        <Link href="/termos/" className={LINK}>
          Termos de uso
        </Link>
        , com as regras de convivência e a política de cancelamento.
      </footer>
    </article>
  );
}
