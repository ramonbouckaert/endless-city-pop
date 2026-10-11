// The app's images, made from its artwork (artwork.svg, here): the PNG the
// media controls show (iOS draws an SVG at its own tiny intrinsic size),
// and the favicon, the same picture on a rounded tile. vite.config.ts
// writes them into the build and serves them in dev.

import { readFileSync } from 'node:fs';

const SOURCE = new URL('artwork.svg', import.meta.url);
/** The PNG's width and height, in pixels (media-session.ts says so). */
const PNG_SIZE = 512;
// The favicon tile's corner radius, in the artwork's own units (its viewBox is 32 wide).
const CORNER = 7;

export function readArtwork(): string {
  return readFileSync(SOURCE, 'utf8');
}

/** The favicon: the artwork without its size or its comment, the drawing clipped to a rounded tile. */
export function faviconSvg(artwork: string): string {
  const match =
    /^(<svg\b[^>]*?)(?: width="\d+" height="\d+")?>\n(?:\s*<!--[\s\S]*?-->\n)?([\s\S]*?\n {2}<\/defs>\n)([\s\S]*)<\/svg>\s*$/.exec(
      artwork,
    );
  if (!match) throw new Error('artwork.svg: expected <svg>, a comment, <defs> and the drawing');
  const [, open, defs, drawing] = match;
  return [
    `${open}>`,
    defs.replace(
      /\n {2}<\/defs>\n$/,
      `\n    <clipPath id="tile">\n      <rect width="32" height="32" rx="${CORNER}" />\n    </clipPath>\n  </defs>\n`,
    ) + `  <g clip-path="url(#tile)">`,
    drawing.replace(/^(?=.)/gm, '  ') + '  </g>',
    '</svg>',
    '',
  ].join('\n');
}

/** The artwork as a PNG. Chromium renders it, as ImageMagick drops the sun's gradient. */
export async function artworkPng(artwork: string): Promise<Uint8Array> {
  const { chromium } = await import('playwright');
  // Drawn at PNG_SIZE whatever the SVG's own width and height.
  const svg = artwork.replace(/<svg\b/, `<svg style="display:block;width:${PNG_SIZE}px;height:${PNG_SIZE}px"`);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: PNG_SIZE, height: PNG_SIZE } });
    await page.setContent(`<body style="margin:0">${svg}</body>`);
    return await page.locator('svg').screenshot();
  } finally {
    await browser.close();
  }
}
