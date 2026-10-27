// @ts-nocheck
// Bridge Engineering Lab: WCAG findings from the 2026-10-25 audit (dev-tools/stem_tool_a11y_audit.cjs).
// axe passed every tab before the fix; these failures were only visible to a probe that measures text
// against what is really painted behind it.
import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { PROBE } from './helpers/contrast_probe';

const ROOT = process.cwd();
// The GL spec's harness serves React UMD, three r128 and the working-tree tool; reuse it rather than fork it.
const HARNESS = readFileSync('tests/e2e/26-bridgelab-gl.spec.ts', 'utf8').split('const HARNESS = `')[1].split('`;')[0];
const TABS = ['build', 'types', 'materials', 'forces', 'cases', 'cycle', 'quiz', 'print', 'inquiry'];
let server: Server, base: string;
test.use({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce', launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.describe.configure({ timeout: 180000 });
test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    if (req.url === '/__harness') { res.setHeader('content-type', 'text/html'); res.end(HARNESS); return; }
    const file = resolve(ROOT, '.' + decodeURIComponent((req.url || '/').split('?')[0]));
    if (!file.startsWith(ROOT + sep)) { res.writeHead(403); res.end(); return; }
    try { res.setHeader('content-type', ({ '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' })[extname(file)] || 'text/plain'); res.end(await readFile(file)); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
test.afterAll(async () => { await new Promise<void>(done => server.close(() => done())); });

async function mount(page, state) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/__harness');
  // The GL harness pins a 900 x 1400 clipped box; let the tool flow so reflow and targets are measured honestly.
  await page.addStyleTag({ content: '#wrap{width:auto!important;height:auto!important;overflow:visible!important} *,*::before,*::after{transition:none!important;animation:none!important}' });
  await page.evaluate(s => (window as any).__mount(s), state);
  await page.waitForTimeout(state.tab === 'build' ? 1500 : 400);
  return errors;
}

test('every tab passes 4.5:1 text contrast against what is really painted', async ({ page }) => {
  for (const tab of TABS) {
    const errors = await mount(page, { tab });
    expect(await page.evaluate(PROBE), tab).toEqual([]);
    expect(errors, tab).toEqual([]);
    await page.evaluate(() => (window as any).__destroy());
  }
});

test('the readiness status stays readable whatever the verdict, and the vehicle step button is legible', async ({ page }) => {
  // A tiny cross-section fails, a huge one passes: both inks are measured.
  for (const crossSectionMm2 of [60, 6000, 60000]) {
    await mount(page, { tab: 'build', crossSectionMm2 });
    expect(await page.evaluate(PROBE), 'cross-section ' + crossSectionMm2).toEqual([]);
    await page.evaluate(() => (window as any).__destroy());
  }
  await mount(page, { tab: 'build', loadMode: 'vehicle', bridgeView: '2d' });
  const step = page.getByRole('button', { name: /Advance vehicle 10%|Auto-Drive Vehicle/ });
  await expect(step.first()).toBeVisible();
  expect(await page.evaluate(PROBE)).toEqual([]);
});

test('the design-challenge card passes contrast and target size in every state', async ({ page }) => {
  const record = { stars: 2, value: 120000, design: { trussStyle: 'howe', height: 4, materialId: 'steel', crossSectionMm2: 20000, lateralBraceEvery: 1 } };
  for (const state of [
    { tab: 'build', challengeRecords: { county_road: record } },
    { tab: 'build', challengeId: 'county_road', challengeHint: 3, span: 45, nBays: 6, loadPerJoint: 80, loadMode: 'uniform', materialId: 'concrete', challengeRecords: { county_road: record }, challengeNote: 'Recorded: 2 of 3 stars, $120,000.' },
    { tab: 'build', challengeId: 'footbridge', span: 20, nBays: 4, loadPerJoint: 20, loadMode: 'uniform', trussStyle: 'warren', height: 4, materialId: 'wood', crossSectionMm2: 16000, lateralBraceEvery: 1 },
    // worked example open (material table) and the printed results
    { tab: 'build', challengeId: 'county_road', challengeRevealed: { county_road: true }, challengeHint: 3, span: 40, nBays: 6, loadPerJoint: 80, loadMode: 'uniform', materialId: 'steel', challengeRecords: { county_road: record } },
    { tab: 'print', challengeRecords: { county_road: { ...record, afterExample: true } } }
  ]) {
    await mount(page, state);
    const card = page.locator('[data-bridge-challenges],[data-bridge-challenge-active],[data-bridge-print-challenges]').first();
    await expect(card).toBeVisible();
    expect(await page.evaluate(PROBE), JSON.stringify(state).slice(0, 80)).toEqual([]);
    const small = await card.evaluate(root => [...root.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width < 24 || r.height < 24; }).length);
    expect(small).toBe(0);
    await page.evaluate(() => (window as any).__destroy());
  }
  // The par design earns three stars, and the stars are words to assistive technology, not glyphs.
  await mount(page, { tab: 'build', challengeId: 'footbridge', span: 20, nBays: 4, loadPerJoint: 20, loadMode: 'uniform', trussStyle: 'warren', height: 4, materialId: 'wood', crossSectionMm2: 16000, lateralBraceEvery: 1 });
  const now = page.locator('[data-challenge-stars-now]');
  await expect(now).toHaveAttribute('data-challenge-stars-now', '3');
  await expect(now).toContainText('3 of 3 stars');
  expect(await now.locator('[aria-hidden="true"]').count()).toBe(1);
});

test('the 3D view can be turned, tilted and zoomed without dragging (WCAG 2.5.7)', async ({ page }) => {
  await mount(page, { tab: 'build', bridgeView: '3d', rot3d: { rotY: 26, rotX: 14 }, zoom3d: 1 });
  const group = page.getByRole('group', { name: 'Turn and zoom the 3D bridge' });
  await expect(group).toBeVisible();
  const bucket = () => page.evaluate(() => (window as any).__bucket());
  await group.getByRole('button', { name: /Turn left/ }).click();
  expect((await bucket()).rot3d).toEqual({ rotY: 11, rotX: 14 });
  await group.getByRole('button', { name: /Turn right/ }).click();
  await group.getByRole('button', { name: /Turn right/ }).click();
  expect((await bucket()).rot3d.rotY).toBe(41);
  await group.getByRole('button', { name: /Tilt up/ }).click();
  expect((await bucket()).rot3d.rotX).toBe(22);
  await group.getByRole('button', { name: /Zoom in/ }).click();
  expect((await bucket()).zoom3d).toBeCloseTo(1.12, 5);
  await group.getByRole('button', { name: /Zoom out/ }).click();
  expect((await bucket()).zoom3d).toBeCloseTo(1.12 * 0.89, 5);
  // At a limit the button says so by being unavailable rather than silently doing nothing.
  await page.evaluate(() => (window as any).__set({ rot3d: { rotY: 0, rotX: 78 }, zoom3d: 3.2 }));
  await expect(group.getByRole('button', { name: /Tilt up/ })).toBeDisabled();
  await expect(group.getByRole('button', { name: /Zoom in/ })).toBeDisabled();
  await expect(group.getByRole('button', { name: /Tilt down/ })).toBeEnabled();
  // Not offered where it does not apply: the walk-through view has its own sliders.
  await page.evaluate(() => (window as any).__set({ bridgeView: 'immersive' }));
  await expect(group).toHaveCount(0);
});

test('pointer targets are at least 24 CSS px and nothing scrolls sideways at 320 px', async ({ page }) => {
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tab of TABS) {
      await mount(page, { tab });
      const small = await page.evaluate(() => [...document.querySelectorAll('#wrap button, #wrap input:not([type=hidden]), #wrap select, #wrap summary, #wrap [role=tab]')]
        .filter((n: any) => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24) && getComputedStyle(n).visibility !== 'hidden'; })
        .map((n: any) => n.tagName + ':' + (n.getAttribute('aria-label') || n.textContent || n.type || '').trim().slice(0, 30)));
      expect(small, tab + ' @' + width).toEqual([]);
      if (width === 320) expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), tab + ' @320').toBeLessThanOrEqual(1);
      await page.evaluate(() => (window as any).__destroy());
    }
  }
});

test('the quiz credits XP under its own activity id, in the host order (activityId, points, reason)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/__harness');
  await page.addStyleTag({ content: '*{transition:none!important}' });
  await page.evaluate(() => {
    const w = window as any;
    w.__xp = [];
    // The harness builds ctx inside __mount, so swap a recorder into ctx.awardXP on every render.
    // The tool used to send awardXP(score), which the host read as an activity id and credited nothing.
    const realRender = w.StemLab._registry.bridgeLab.render;
    w.StemLab._registry.bridgeLab.render = function (ctx) { ctx.awardXP = function (id, pts, why) { w.__xp.push([id, pts, why]); }; return realRender.call(this, ctx); };
    w.__mount({ tab: 'quiz' });
  });
  await page.waitForTimeout(400);
  const groups = await page.evaluate(() => [...new Set([...document.querySelectorAll('#wrap input[type=radio]')].map((r: any) => r.name))]);
  expect(groups.length).toBeGreaterThan(5);
  for (const name of groups) await page.locator(`#wrap input[type=radio][name="${name}"]`).first().check();
  await page.getByRole('button', { name: /submit/i }).first().click();
  const heading = await page.locator('#bridge-quiz-result').textContent();
  const score = Number(/(\d+)\s*\/\s*\d+/.exec(heading || '')[1]);
  const xp = await page.evaluate(() => (window as any).__xp);
  if (score > 0) expect(xp).toEqual([['bridgeLab', score * 5, 'Bridge Lab quiz']]);
  else expect(xp).toEqual([]);
  expect(errors).toEqual([]);
});
