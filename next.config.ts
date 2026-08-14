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
