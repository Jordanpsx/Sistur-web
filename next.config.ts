import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces .next/standalone — a self-contained server with only the modules
  // it actually uses, so the runtime image carries no node_modules tree.
  output: "standalone",

  // NON-NEGOTIABLE (§2.2, §6.7). Every legacy WordPress permalink ends in "/".
  // Next defaults to stripping it, which would 404 every indexed URL at once.
  trailingSlash: true,

  // Sistur and WordPress serve ResourceImage files from their own hosts.
  // next/image refuses remote hosts that are not listed here.
  /*
   * Sem `headers()` para o X-Robots-Tag, e a razão é o formato deste deploy.
   *
   * O Next compila `headers()` no routes-manifest durante o build, e este
   * Dockerfile não recebe variável nenhuma no build — não há ARG, não há .env.
   * O valor seria congelado como "não indexável" em toda imagem, produção
   * inclusive, e o tráfego morreria em silêncio até alguém abrir o Search
   * Console. A falha mais cara é a que não avisa.
   *
   * O sinal ficou no `app/robots.ts`, que é dinâmico e lê o ambiente a cada
   * requisição. Para a segunda camada, o `X-Robots-Tag` pertence ao proxy
   * reverso, onde staging e produção são hosts diferentes por construção e
   * não há como marcar o errado.
   */

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cachoeiradogirassol.com.br" },
      { protocol: "https", hostname: "administrativo.cachoeiradogirassol.com.br" },
      { protocol: "https", hostname: "test-admin.cachoeiradogirassol.com.br" },
    ],
  },

  // The Sistur token and the HMAC secret live only in Server Actions and Route
  // Handlers. Leaking a stack trace with a header in it is a cheap way to undo
  // that, so keep the framework quiet in production.
  poweredByHeader: false,

  // Fail the build on a type error rather than shipping it. Both default to
  // false already; stated explicitly because the whole point of TypeScript here
  // is guarding the API seam with Sistur (§2.1).
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
