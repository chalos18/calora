// @ts-check
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Type-aware linting, so the rules that matter here can actually run.
 *
 * The untyped rulesets only see one file at a time and cannot tell a promise
 * from a value. The defects worth catching in this codebase - an unawaited
 * write, a `catch` that swallows a rejection, a condition that is always true
 * because the type is not nullable - all need the type checker.
 *
 * Formatting is deliberately not linted. Nothing here enforces a style, and
 * introducing one would rewrite every file for no defect caught.
 */
export default tseslint.config(
  {
    ignores: [
      "**/dist/",
      "**/.expo/",
      "apps/mobile/android/",
      "apps/mobile/ios/",
      "apps/mobile/expo-env.d.ts",
    ],
  },

  js.configs.recommended,

  // Type-aware rules apply to TypeScript only. This config file is JS and
  // belongs to no TS project, so including it would be a parse error.
  {
    files: ["**/*.{ts,tsx,mts}"],
    extends: [
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        // Named explicitly rather than discovered: tests and root scripts are
        // excluded from the package tsconfigs and live in their own, which
        // tsconfig.json discovery would never reach.
        project: [
          "./tsconfig.test.json",
          "./tsconfig.tools.json",
          "./packages/core/tsconfig.json",
          "./server/tsconfig.json",
          "./data/seed/tsconfig.json",
          "./apps/mobile/tsconfig.json",
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Errors are values here, not just `any` thrown around: the server
      // inspects a Postgres error code and the client inspects ApiError.
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",

      // An unused argument is often documentation of a signature. An unused
      // local is not.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  {
    files: ["**/*.js"],
    languageOptions: { globals: { ...globals.node } },
  },

  {
    files: ["apps/mobile/**/*.{ts,tsx}"],
    ...reactHooks.configs["recommended-latest"],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  {
    files: ["server/**/*.ts", "data/**/*.ts", "scripts/**/*.mts", "*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
