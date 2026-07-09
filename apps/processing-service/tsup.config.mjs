import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { app: 'src/app.ts' },
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  outDir: 'dist',
  bundle: true,
  noExternal: [/^@repo\//],
  splitting: false,
  clean: true,
  sourcemap: true,
  outExtension: () => ({ js: '.mjs' }),
});
