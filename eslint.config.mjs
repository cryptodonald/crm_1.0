import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Disable no-explicit-any rule as requested
      "@typescript-eslint/no-explicit-any": "off",
      
      // Disable unused vars warnings (common during development)
      "@typescript-eslint/no-unused-vars": "warn",
      
      // Disable unescaped entities errors (aesthetic, not functional)
      "react/no-unescaped-entities": "off",
      
      // Keep exhaustive-deps warnings (can cause real bugs)
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
