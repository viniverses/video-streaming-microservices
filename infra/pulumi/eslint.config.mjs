import { withTsconfigRootDir } from '@repo/eslint-config/base';
import globals from 'globals';

export default [
  ...withTsconfigRootDir(import.meta.url),
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
];
