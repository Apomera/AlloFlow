import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

/**
 * The block palette grew from 12 to 20 materials. Only 12 keyboard slots exist
 * (1-9, 0, -, =), and the old shortcut expression indexed past the end of its
 * array, so a 13th material would have rendered "key undefined" into the
 * hotbar's accessible name. Every material must also actually place.
 */
const ROOT = process.cwd();
const MIME: Record<string, string> = { '.js': 'text/javascript; charset=utf-8', '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const SRC = readFileSync(join(ROOT, 'tests/e2e/18-geometry-world-gl.spec.ts'), 'utf8');
const HARNESS = SRC.slice(SRC.indexOf('const HARNESS = `') + 17, SRC.indexOf('`;', SRC.indexOf('const HARNESS = `')));
let server: Server; let base = '';
test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    const url = (req.url || '/').split('?')[0];
    if (url === '/__harness') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(HARNESS); return; }
    try { const p = normalize(join(ROOT, decodeURIComponent(url))); if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      const body = await readFile(p); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(body);
    } catch { res.writeHead(404); res.end('nf'); }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
test.afterAll(async () => { await new Promise<void>((r) => server.close(() => r())); });
// SwiftShader is one shared software rasteriser; run these with --workers=1.
test.describe.configure({ timeout: 150_000, mode: 'serial' });

async function boot(page: any) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.geometryWorld);
  await page.evaluate(() => { (window as any).__alloGeometryWorldPendingBuild = { __e2e: true }; });
  // The palette folds into the Blocks button in a lesson (2026-09-24); this spec is about the palette.
  await page.evaluate(() => (window as any).__mount({ _introShownOnce: true, buildToolsOpenLesson: true }));
  await page.waitForSelector('#geoworld-fs-wrap canvas', { timeout: 30000 });
  await page.waitForFunction(() => !!(window as any).__geoWorldEngine, null, { timeout: 30000 });
  await page.waitForTimeout(900);
}

test('every material places a real block and gets a drawn swatch', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const en = (window as any).__geoWorldEngine;
    const items = Array.from(document.querySelectorAll('.gw-hotbar-item')) as HTMLElement[];
    const names = items.map((n) => n.querySelector('.gw-material-name')?.textContent || '');
    const swatchless = items.filter((n) => !n.querySelector('svg.gw-material-swatch')).length;
    // Place one block of every registered type, using the id the tool itself
    // stores on the placed mesh, and confirm each one really lands.
    const placed: string[] = []; const failed: string[] = [];
    const ids = names.map((n) => n.toLowerCase());
    ids.forEach((id, i) => {
      // High and spread out, so the default world's own blocks cannot occupy
      // the cell and make a material look like it failed to place.
      const bx = 30 + i * 2, by = 24, bz = 30;
      const mesh = en.placeBlock(bx, by, bz, id);
      const key = bx + ',' + by + ',' + bz;
      if (mesh && en.blocks[key]) placed.push(id); else failed.push(id);
    });
    return { count: items.length, names, swatchless, placed: placed.length, failed };
  });
  console.log('MATERIALS:', JSON.stringify({ count: result.count, swatchless: result.swatchless, failed: result.failed }));
  expect(result.count).toBeGreaterThanOrEqual(20);
  expect(result.swatchless, 'every hotbar item draws a swatch').toBe(0);
  expect(result.failed, 'every material places a block that lands in the world').toEqual([]);
  expect(result.placed).toBe(result.count);
});

test('no hotbar item announces an undefined shortcut', async ({ page }) => {
  await boot(page);
  const labels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.gw-hotbar-item')).map((n) => ({
      label: n.getAttribute('aria-label') || '',
      title: (n as HTMLElement).title || '',
    })));
  expect(labels.length).toBeGreaterThanOrEqual(20);
  for (const { label, title } of labels) {
    expect(label, 'aria-label must never say undefined').not.toMatch(/undefined/);
    expect(title, 'title must never say undefined').not.toMatch(/undefined/);
    expect(label, 'aria-label must never end with a dangling "key"').not.toMatch(/,\s*key\s*(,|$)/);
  }
  // The first twelve keep their real shortcuts.
  expect(labels[0].label).toMatch(/key 1/);
  expect(labels[11].label).toMatch(/key =/);
  // The thirteenth onwards simply have none.
  expect(labels[12].label).not.toMatch(/key/);
});
