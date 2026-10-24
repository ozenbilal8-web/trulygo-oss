import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "_design-reference/**",
      "out/**",
      "node_modules/**",
      "next-env.d.ts",
      "supabase/functions/**",
    ],
  },
];

export default eslintConfig;
