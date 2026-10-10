import { readdirSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

// The licences of what the app ships (public/licenses/), and a page
// listing them: written into the build, and served at /licenses/ in dev,
// from whatever files the folder holds.
const LICENSES = 'public/licenses';

function licensesPage(): string {
  const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.codePointAt(0)};`);
  const files = readdirSync(LICENSES)
    .filter((f) => f !== 'index.html' && !f.startsWith('.'))
    .sort((a, b) => a.localeCompare(b));
  const items = files.map((f) => `      <li><a href="${encodeURIComponent(f)}">${escape(f)}</a></li>`).join('\n');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Licences · Endless City Pop</title>
  </head>
  <body>
    <h1>Licences</h1>
    <ul>
${items}
    </ul>
  </body>
</html>
`;
}

function licensesIndex(): Plugin {
  return {
    name: 'licenses-index',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/licenses/' && path !== '/licenses/index.html') return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(licensesPage());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'licenses/index.html', source: licensesPage() });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [licensesIndex()],
  build: {
    target: 'es2022',
  },
});
