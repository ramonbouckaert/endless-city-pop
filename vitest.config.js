import { defineConfig } from 'vitest/config';

// Unit tests cover the engine, which has no dependencies. Playing the
// generated code through Strudel is `npm run check:songs`, which bundles
// with esbuild because some Strudel dependencies only resolve properly
// through their "module" builds.
export default defineConfig({
  test: { include: ['test/**/*.test.js'] },
});
