import { readdirSync } from 'node:fs';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig, type Plugin } from 'vite';
import { artworkPng, faviconSvg, readArtwork } from './artwork/images.ts';

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

// The images made from artwork/artwork.svg: written into the build, and
// served in dev (made again whenever the artwork changes).
function artworkImages(): Plugin {
  let png: { artwork: string; image: Promise<Uint8Array> } | undefined;
  const pngOf = (artwork: string) => {
    if (png?.artwork !== artwork) png = { artwork, image: artworkPng(artwork) };
    return png.image;
  };
  return {
    name: 'artwork-images',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path === '/favicon.svg') {
          res.setHeader('Content-Type', 'image/svg+xml');
          res.end(faviconSvg(readArtwork()));
        } else if (path === '/artwork.png') {
          pngOf(readArtwork()).then(
            (image) => {
              res.setHeader('Content-Type', 'image/png');
              res.end(image);
            },
            (error: unknown) => next(error),
          );
        } else next();
      });
    },
    async generateBundle() {
      const artwork = readArtwork();
      this.emitFile({ type: 'asset', fileName: 'favicon.svg', source: faviconSvg(artwork) });
      this.emitFile({ type: 'asset', fileName: 'artwork.png', source: await artworkPng(artwork) });
    },
  };
}

// `--mode https` (npm run dev-network) serves over HTTPS on a self-signed
// certificate, for phones on the network: iOS only gives the media
// controls and the Audio Session API to a secure page.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [licensesIndex(), artworkImages(), ...(mode === 'https' ? [basicSsl()] : [])],
  build: {
    target: 'es2022',
  },
}));
