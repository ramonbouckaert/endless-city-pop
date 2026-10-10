import { defineConfig } from 'vitest/config';

// Unit tests cover everything but the browser page (src/app/, bar its
// pure helpers). `npm run check:songs` sweeps many seeds' scores and MIDI.
export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
