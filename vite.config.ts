import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    rolldownOptions: {
      onwarn(warning, warn) {
        // @strudel/soundfonts evals the soundfont files it fetches; nothing we can change.
        if (warning.code === 'EVAL' && warning.id?.includes('@strudel/soundfonts')) return;
        warn(warning);
      },
    },
  },
});
