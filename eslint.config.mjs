import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

/**
 * Regras que o repositório impõe a si mesmo.
 *
 * A base é `next/core-web-vitals`, que já cobre o que degrada a experiência
 * medida — imagem sem dimensão, script bloqueante, link que recarrega a página.
 * Acima dela ficam três regras que vieram de defeitos reais deste projeto, e
 * são erro e não aviso: aviso não impede merge nenhum.
 */
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  {
    rules: {
      // Variável não usada esconde refatoração pela metade — foi assim que um
      // componente ficou órfão por semanas até alguém precisar dele de novo.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // `any` apaga justamente a checagem que justifica ter TypeScript.
      "@typescript-eslint/no-explicit-any": "error",
      // Console em código de produção vira ruído no log do servidor. `warn` e
      // `error` passam: são para o que alguém precisa ler.
      "no-console": ["error", { allow: ["warn", "error", "info"] }],
    },
  },
];

export default config;
