/**
 * JSON-LD do empreendimento — o que o buscador lê para saber onde ficamos.
 *
 * Duas entidades num grafo só, e não duas tags soltas, porque elas descrevem a
 * mesma coisa sob dois papéis: `TouristAttraction` é o que a pessoa procura
 * ("cachoeira perto de Brasília") e `LocalBusiness` é o que responde por
 * endereço, telefone e horário no mapa. Ligadas por `@id`, o buscador entende
 * que são o mesmo lugar em vez de dois registros concorrentes.
 *
 * Os dados aqui são **fatos verificáveis** — endereço, coordenada, telefone,
 * horário. Nada de nota, avaliação ou contagem: dado estruturado inventado é
 * penalizado, e nenhum deles vem de um sistema nosso hoje.
 *
 * Renderizado no servidor, dentro do componente, e não por `<Script>`: é
 * conteúdo que o rastreador precisa ver no HTML da primeira resposta, não algo
 * que chega depois com JavaScript.
 */

import { COORDENADAS, ENDERECO } from "@/lib/local";

const TELEFONE = "+5561998369133";

export function DadosEstruturados({ site }: { site: string }) {
  const id = `${site}/#empreendimento`;

  const endereco = {
    "@type": "PostalAddress",
    streetAddress: ENDERECO.logradouro,
    addressLocality: ENDERECO.cidade,
    addressRegion: ENDERECO.uf,
    postalCode: ENDERECO.cep,
    addressCountry: "BR",
  };

  const geo = { "@type": "GeoCoordinates", ...COORDENADAS };

  // Quinta a domingo, 08:00 às 17:00 — o horário da portaria, que é o que
  // decide se alguém consegue entrar. O camping fica aberto 24h, mas quem
  // chega às 22h não passa do portão, e o horário publicado precisa ser o que
  // a pessoa encontra na prática.
  const horarios = {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Thursday", "Friday", "Saturday", "Sunday"],
    opens: "08:00",
    closes: "17:00",
  };

  const grafo = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["TouristAttraction", "LocalBusiness"],
        "@id": id,
        name: "Cachoeira do Girassol",
        description:
          "Queda d'água de 18 metros, piscinas de água corrente e área de " +
          "camping em Cocalzinho de Goiás.",
        url: `${site}/`,
        telephone: TELEFONE,
        address: endereco,
        geo,
        openingHoursSpecification: [horarios],
        currenciesAccepted: "BRL",
        publicAccess: true,
        isAccessibleForFree: false,
        touristType: ["Famílias", "Campistas", "Turismo de natureza"],
        amenityFeature: [
          { "@type": "LocationFeatureSpecification", name: "Camping", value: true },
          { "@type": "LocationFeatureSpecification", name: "Restaurante", value: true },
          {
            "@type": "LocationFeatureSpecification",
            name: "Churrasqueiras",
            value: true,
          },
          {
            "@type": "LocationFeatureSpecification",
            name: "Piscinas naturais",
            value: true,
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${site}/#site`,
        url: `${site}/`,
        name: "Cachoeira do Girassol",
        inLanguage: "pt-BR",
        publisher: { "@id": id },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // O conteúdo é objeto nosso, serializado aqui — nada dele vem do
      // visitante, então não há entrada externa para escapar.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(grafo) }}
    />
  );
}
