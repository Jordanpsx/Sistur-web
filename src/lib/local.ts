/**
 * Onde fica a Cachoeira do Girassol — os fatos, num lugar só.
 *
 * Rodapé, JSON-LD e o bloco de localização da home liam cada um a sua cópia do
 * endereço e do link do mapa. Três cópias de um endereço são três chances de
 * um deles ficar diferente dos outros, e o JSON-LD divergindo do que a página
 * mostra é justamente o que o buscador penaliza.
 */

export const COORDENADAS = { latitude: -15.722427, longitude: -48.390884 } as const;

export const ENDERECO = {
  logradouro: "Distrito de Girassol, Km 21,5, s/n — Zona Rural",
  cidade: "Cocalzinho de Goiás",
  uf: "GO",
  cep: "72979-000",
  referencia: "Aprox. 65 km de Brasília",
} as const;

/**
 * Identificador da ficha do lugar no Google (o "cid" do Maps). É estável — não
 * muda com a busca, o idioma ou o dispositivo —, então o link feito com ele não
 * cai num homônimo como uma busca por nome pode cair.
 */
export const GOOGLE_CID = "18068136711908426240";

/**
 * O mesmo lugar no formato da Places API. Não é segredo — é o endereço público
 * da ficha. Veio do plugin de avaliações do WordPress antigo e foi conferido:
 * decodificado, carrega exatamente o `GOOGLE_CID` acima.
 */
export const GOOGLE_PLACE_ID = "ChIJyVN6mtw6WpMRAAJ_Qpzqvvo";

/** Abre a ficha do lugar no Google Maps, com fotos e avaliações. */
export const MAPS_FICHA = `https://www.google.com/maps?cid=${GOOGLE_CID}`;

/** Traça a rota até a coordenada da portaria a partir de onde a pessoa está. */
export const MAPS_ROTA =
  "https://www.google.com/maps/dir/?api=1&destination=" +
  `${COORDENADAS.latitude},${COORDENADAS.longitude}`;

export const WAZE_ROTA = `https://waze.com/ul?ll=${COORDENADAS.latitude},${COORDENADAS.longitude}&navigate=yes`;

/**
 * Mapa incorporado sem chave de API. Aponta para a coordenada, e não para o
 * nome: uma busca por nome pode cair num homônimo, a coordenada não.
 */
export const MAPS_EMBED =
  `https://maps.google.com/maps?q=${COORDENADAS.latitude},${COORDENADAS.longitude}` +
  "&z=12&hl=pt-BR&output=embed";

/** Canais de atendimento — os mesmos do rodapé e da política de privacidade. */
export const CONTATO = {
  email: "contato@cachoeiradogirassol.com.br",
  whatsapp: "(61) 9 9836-9133",
  whatsappUrl: "https://wa.me/5561998369133",
} as const;
