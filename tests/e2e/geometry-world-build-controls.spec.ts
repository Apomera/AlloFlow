import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
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
// SwiftShader is a single software rasteriser; parallel workers contend over it
// and time out mounting the engine. These specs drive real WebGL, so run them
// one at a time (the sibling 18-geometry-world-gl spec does the same by default).
// SwiftShader is one software rasteriser shared by the whole run: parallel
// workers contend over it and time out mounting the engine. Run these with
// --workers=1 (as the sibling 18-geometry-world-gl WebGL spec requires too).
test.describe.configure({ timeout: 150_000, mode: 'serial' });

async function boot(page: any) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.geometryWorld);
  await page.evaluate(() => { (window as any).__alloGeometryWorldPendingBuild = { __e2e: true }; });
  await page.evaluate(() => (window as any).__mount({ _introShownOnce: true }));
  await page.waitForSelector('#geoworld-fs-wrap canvas', { timeout: 30000 });
  await page.waitForFunction(() => !!(window as any).__geoWorldEngine, null, { timeout: 30000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => (document.getElementById('geoworld-fs-wrap') as HTMLElement).focus());
  await page.waitForTimeout(150);
}

test('right-click places a block in free-cursor mode', async ({ page }) => {
  await boot(page);
  const locked = await page.evaluate(() => !!(window as any).__geoWorldEngine.isLocked);
  expect(locked, 'this test must run WITHOUT pointer lock').toBe(false);
  await page.evaluate(() => (window as any).__aimAt(2, 0, 2));
  await page.waitForTimeout(200);
  const before = await page.evaluate(() => (window as any).__worldState());
  await page.evaluate(() => {
    const c = document.querySelector('#geoworld-fs-wrap canvas') as HTMLElement;
    c.dispatchEvent(new MouseEvent('mousedown', { button: 2, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => (window as any).__worldState());
  expect(after.studentBlocks).toBe(before.studentBlocks + 1);
});

test('left-click breaks a block in free-cursor mode', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as any).__aimAt(2, 0, 2));
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(300);
  const built = await page.evaluate(() => (window as any).__worldState());
  await page.evaluate(() => {
    const c = document.querySelector('#geoworld-fs-wrap canvas') as HTMLElement;
    c.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => (window as any).__worldState());
  expect(after.studentBlocks).toBe(built.studentBlocks - 1);
});

test('the placement hint offers a clickable Remove control', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as any).__aimAt(2, 0, 2));
  await page.waitForTimeout(250);
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(350);
  const built = await page.evaluate(() => (window as any).__worldState());
  const btn = page.locator('button.gw-placement-remove');
  await expect(btn).toHaveCount(1);
  await btn.click({ timeout: 15000 });
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => (window as any).__worldState());
  expect(after.studentBlocks).toBe(built.studentBlocks - 1);
});

test('the growth nudge can be turned off and stays off', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.geometryWorld);
  await page.evaluate(() => { (window as any).__alloGeometryWorldPendingBuild = { __e2e: true }; });
  // Mount with the nudge already open, the way a frustration streak leaves it.
  await page.evaluate(() => (window as any).__mount({ _introShownOnce: true, showGrowthNudge: true, growthNudgeMsg: 'probe message' }));
  await page.waitForSelector('#geoworld-fs-wrap canvas', { timeout: 30000 });
  await page.waitForFunction(() => !!(window as any).__geoWorldEngine, null, { timeout: 30000 });
  await page.waitForTimeout(900);
  const off = page.getByRole('button', { name: /Don.t show these again/i });
  await expect(off).toHaveCount(1);
  await off.click({ timeout: 15000 });
  await page.waitForTimeout(400);
  const state = await page.evaluate(() => (window as any).__toolData.geometryWorld);
  expect(state.growthNudgeOptOut).toBe(true);
  expect(state.showGrowthNudge).toBe(false);
});
