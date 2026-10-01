import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

/**
 * "Send to Print Lab" reported success and did nothing.
 *
 * ctx.setStemLabTool exists in every host, but the STEM loader substitutes a
 * silent no-op when the surrounding app supplied no real setter. The builder
 * only checked that the function EXISTED, so it announced "Opening Print Lab"
 * and left the student on an unchanged screen with no model and no file — the
 * STL-download fallback beside it was unreachable.
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
}

test('a host whose tool switch never lands still gets the build as a file', async ({ page }) => {
  await boot(page);
  const outcome = await page.evaluate(async () => {
    const pure = (window as any).StemLab.geometryWorldBuilderPure;
    const eng = (window as any).__geoWorldEngine;
    eng.placeBlock(2, 0, 2, 'stone');
    eng.placeBlock(2, 1, 2, 'stone');
    eng.placeBlock(3, 0, 2, 'stone');
    // The handoff works on the SELECTED creation; set the selection the way the
    // builder's own "select a creation" flow does.
    eng._builderSelection = { blocks: [
      { x: 2, y: 0, z: 2 }, { x: 2, y: 1, z: 2 }, { x: 3, y: 0, z: 2 }
    ], exact: true };
    await new Promise((r) => setTimeout(r, 200));

    const downloads: number[] = [];
    const origCreate = URL.createObjectURL.bind(URL);
    (URL as any).createObjectURL = (b: Blob) => { downloads.push(b.size); return origCreate(b); };

    const toasts: { m: string; k: string }[] = [];
    const td = (window as any).__toolData;
    const ctx = {
      toolData: td,
      addToast: (m: string, k: string) => toasts.push({ m, k }),
      announceToSR: () => {},
      // The exact shape the loader hands a tool when the host has no setter.
      setStemLabTool: function () {},
      update: () => {}, updateMulti: () => {},
    };
    try { pure.openSelectedBuildInPrintLab(ctx); } catch (e) { return { threw: String(e).slice(0, 160), toasts, downloads }; }
    // the stranded check runs on a short timer
    await new Promise((r) => setTimeout(r, 2200));
    return { threw: null, toasts, downloads, handoffLeft: !!(window as any).__alloPrintLabPendingHandoff };
  });

  console.log('OUTCOME:', JSON.stringify(outcome).slice(0, 700));
  // The student must end up with the model one way or another: a real STL blob.
  expect(outcome.downloads.length, 'an STL was produced for the stranded handoff').toBeGreaterThan(0);
  expect(outcome.downloads[outcome.downloads.length - 1]).toBeGreaterThan(0);
  const said = outcome.toasts.map((t: any) => t.m).join(' | ');
  expect(said, 'the student is told what actually happened').toMatch(/download|STL/i);
});
