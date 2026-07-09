import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';
import importPlugin from 'eslint-plugin-import';
import onlyWarn from 'eslint-plugin-only-warn';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import turboPlugin from 'eslint-plugin-turbo';
import tseslint from 'typescript-eslint';

/**
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'warn',
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      import: importPlugin,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
    },
  },
  eslintConfigPrettier,
  ...(Array.isArray(eslintPluginPrettier) ? eslintPluginPrettier : [eslintPluginPrettier]),
  {
    ignores: ['dist/**'],
  },
];

/**
 * Garante `parserOptions.tsconfigRootDir` quando há vários tsconfigs no monorepo.
 *
 * @param {string} importMetaUrl — `import.meta.url` do `eslint.config` do pacote
 * @param {import("eslint").Linter.Config[]} [baseConfig=config]
 */
export function withTsconfigRootDir(importMetaUrl, baseConfig = config) {
  const tsconfigRootDir = dirname(fileURLToPath(importMetaUrl));
  return [
    ...baseConfig,
    {
      languageOptions: {
        parserOptions: {
          tsconfigRootDir,
        },
      },
    },
  ];
}
