// Renders a page to PNG so a visual claim about the plate-tectonics globe can be
// checked rather than asserted.
//
//   node dev-tools/platetectonics_visual_qa.mjs <page.html> <out.png> [w] [h]
//
// The page must set window.__ready once it has finished drawing.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const target = process.argv[2];
const out = process.argv[3] || 'tectonics.png';
const width = Number(process.argv[4] || 1120);
const height = Number(process.argv[5] || 400);
if (!target) {
  console.error('usage: platetectonics_visual_qa.mjs <page.html> <out.png> [width] [height]');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
page.on('pageerror', (error) => console.error('PAGE ERROR:', error.message));
page.on('console', (message) => { if (message.type() === 'error') console.error('CONSOLE:', message.text()); });
await page.goto(pathToFileURL(resolve(target)).href);
await page.waitForFunction(() => window.__ready === true, { timeout: 20000 });
await page.screenshot({ path: resolve(out) });
await browser.close();
console.log('wrote ' + resolve(out));
