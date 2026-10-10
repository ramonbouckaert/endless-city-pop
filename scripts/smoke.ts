// Browser smoke test: load the built app, generate a song, press Play,
// and report console errors. Expects `vite preview` on :4173.
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:4173/';
const shot = process.argv[3];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const errors: string[] = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url);
await page.waitForFunction(() => document.querySelector('#form li'));
const title = await page.textContent('#title');
const meta = await page.textContent('#meta');
await page.click('#play');
await page.waitForTimeout(4000);
const error = await page.textContent('#error');
const playing = await page.evaluate(() => document.body.classList.contains('playing'));
if (shot) await page.screenshot({ path: shot, fullPage: false });
console.log(JSON.stringify({ title, meta, playing, error, errors: errors.slice(0, 15) }, null, 1));
await browser.close();
