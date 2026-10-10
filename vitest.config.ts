import { defineConfig } from 'vitest/config';

// Unit tests cover everything but render/ (and the notation it builds), which has no dependencies. Querying
// the Strudel patterns built from it is `npm run check:songs`, which bundles
// with esbuild because some Strudel dependencies only resolve properly
// through their "module" builds.
export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
