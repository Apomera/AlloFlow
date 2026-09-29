import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-transit-2026-09-29';
const HARNESS = readFileSync('tests/e2e/astronomy-observatory-3d.spec.ts', 'utf8').split('const HARNESS = `')[1].split('`;')[0]
  .replace("gradeLevel: '8th Grade',", "gradeLevel: '8th Grade', isContrast: window.__contrast === true, theme: window.__contrast ? 'contrast' : 'dark',");
let server: Server, base: string;
test.use({ hasTouch: true, viewport: { width: 1280, height: 980 }, reducedMotion: 'reduce', launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.describe.configure({ timeout: 120000 });
test.beforeAll(async () => {
  mkdirSync(OUT, { recursive: true });
  server = createServer(async (req, res) => {
    if (req.url === '/__simulators') { res.setHeader('content-type', 'text/html'); res.end(HARNESS); return; }
    const file = resolve(ROOT, '.' + decodeURIComponent((req.url || '/').split('?')[0]));
    if (!file.startsWith(ROOT + sep)) { res.writeHead(403); res.end(); return; }
    try {
      res.setHeader('content-type', ({ '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' })[extname(file)] || 'text/plain');
      res.end(await readFile(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
test.afterAll(async () => { await new Promise<void>(done => server.close(() => done())); });
test.afterEach(async ({ page }) => { await page.evaluate(() => (window as any).__destroy?.()).catch(() => {}); });
async function mount(page, state, contrast = false) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/__simulators');
  await page.evaluate(({ state, contrast }) => { (window as any).__contrast = contrast; (window as any).__mount(state); }, { state, contrast });
  return errors;
}

async function state(page) { return page.evaluate(() => (window as any).__toolData.astronomy); }

test('transit explorer links measured radii, scene scale, chart cursor, controls and reference text', async ({ page }) => {
  const errors = await mount(page, { tab: 'exoplanets' });
  const lab = page.locator('#astronomy-transit-lab');
  await lab.getByRole('button', { name: 'TRAPPIST-1 e radii', exact: true }).click();
  await expect(lab.locator('#astr-transitStarR')).toHaveValue('0.1192');
  await expect(lab.locator('#astronomy-transit-reference')).toContainText('Agol et al., 2021');
  await expect(lab.locator('#astronomy-transit-reference')).toContainText('chosen central path');
  const geometry = await lab.evaluate(el => {
    const planet = el.querySelector('[data-transit-planet]')!, star = el.querySelector('[data-transit-star]')!;
    return { ratio: Number(planet.getAttribute('r')) / Number(star.getAttribute('r')), depth: Number(el.querySelector('[data-transit-depth]')!.textContent!.split(' ')[0]) / 100 };
  });
  expect(geometry.ratio * geometry.ratio).toBeCloseTo(geometry.depth, 6);
  await lab.locator('#astr-transitStarR').press('ArrowRight');
  await expect(lab.locator('#astr-transitStarR')).toHaveValue('0.1292');
  await lab.getByRole('button', { name: 'TRAPPIST-1 e radii', exact: true }).click();
  await lab.screenshot({ path: OUT + '/transit-desktop.png' });
  const chart = lab.locator('#astronomy-transit-curve');
  await chart.focus();
  await chart.press('Home');
  await expect(lab.locator('[data-transit-stage]')).toHaveText('Before crossing');
  await expect(lab.locator('[data-transit-brightness]')).toHaveText('100.0000%');
  await chart.press('ArrowRight');
  expect((await state(page)).transitTime).toBeCloseTo(0.01);
  await chart.press('End');
  await expect(lab.locator('[data-transit-stage]')).toHaveText('After crossing');
  await lab.getByRole('button', { name: 'Entering', exact: true }).click();
  await expect(lab.locator('[data-transit-stage]')).toHaveText('Entering the star');
  await lab.getByRole('button', { name: 'Midpoint', exact: true }).click();
  await expect(lab.locator('[data-transit-brightness]')).not.toHaveText('100.0000%');
  await lab.getByRole('button', { name: 'Full 0–100% scale', exact: true }).click();
  await expect(chart).toHaveAttribute('data-axis-range', '1');
  await lab.locator('#astr-transitImpact').fill('0.2');
  await expect(lab.locator('#astronomy-transit-reference')).not.toContainText('Published radii:');
  expect(errors).toEqual([]);
});

test('transit charts remain readable and interactive on a 320px contrast screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const errors = await mount(page, { tab: 'exoplanets' }, true);
  const lab = page.locator('#astronomy-transit-lab');
  await lab.getByRole('button', { name: 'TRAPPIST-1 e radii', exact: true }).click();
  await lab.screenshot({ path: OUT + '/transit-phone-contrast.png' });
  const chart = lab.locator('#astronomy-transit-curve');
  await chart.scrollIntoViewIfNeeded();
  const box = (await chart.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width * ((65 + 315 * 0.25) / 400), box.y + box.height * (150 / 300));
  expect((await state(page)).transitTime).toBeCloseTo(0.25, 2);
  await expect(chart).toBeFocused();
  expect(await lab.locator('button').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const clipped = await chart.evaluate(el => Array.from(el.querySelectorAll('text')).filter(node => { const b = node.getBBox(); return b.x < -1 || b.x + b.width > 401 || b.y < -1 || b.y + b.height > 301; }).map(node => node.textContent));
  expect(clipped).toEqual([]);
  expect(errors).toEqual([]);
});

test('grazing, missed and total occultation geometries keep both views consistent', async ({ page }) => {
  const errors = await mount(page, { tab: 'exoplanets' });
  const lab = page.locator('#astronomy-transit-lab');
  await lab.getByRole('button', { name: 'Grazing crossing', exact: true }).click();
  await expect(lab.locator('#astronomy-transit-status')).toContainText('Grazing transit');
  expect(Number(await lab.locator('#astronomy-transit-curve').getAttribute('data-blocked'))).toBeGreaterThan(0);
  await lab.getByRole('button', { name: 'Miss the star', exact: true }).click();
  await expect(lab.locator('#astronomy-transit-curve')).toHaveAttribute('data-blocked', '0');
  await expect(lab.locator('[data-transit-depth]')).toHaveText('0.0000 %');
  await expect(lab.getByRole('button', { name: 'Entering', exact: true })).toHaveCount(0);
  const points = (await lab.locator('[data-transit-line]').getAttribute('points'))!.split(' ').map(p => p.split(',')[1]);
  expect(new Set(points).size).toBe(1);
  await lab.locator('#astr-transitPlanetR').fill('0.3');
  await lab.locator('#astr-transitStarR').fill('3');
  await lab.locator('#astr-transitImpact').fill('0');
  expect(Number(await lab.locator('#astronomy-transit-curve').getAttribute('data-axis-range'))).toBeLessThan(0.000002);
  await lab.locator('#astr-transitPlanetR').fill('12');
  await lab.locator('#astr-transitStarR').fill('0.1');
  await lab.locator('#astr-transitImpact').fill('0');
  await expect(lab.locator('[data-transit-brightness]')).toHaveText('0.0000%');
  await lab.getByRole('button', { name: 'After', exact: true }).click();
  const bounds = await lab.locator('#astronomy-transit-scene').evaluate(el => {
    const p = el.querySelector('[data-transit-planet]')!, s = el.querySelector('[data-transit-star]')!;
    return [p, s].map(n => { const x=Number(n.getAttribute('cx')),y=Number(n.getAttribute('cy')),r=Number(n.getAttribute('r')); return x-r>=0 && x+r<=400 && y-r>=0 && y+r<=300; });
  });
  expect(bounds).toEqual([true, true]);
  expect(errors).toEqual([]);
});

test('transit playback stops, replays, pauses on input and releases its clock on leaving', async ({ page }) => {
  await page.clock.install();
  const errors = await mount(page, { tab: 'exoplanets', transitTime: 0.98 });
  const lab = page.locator('#astronomy-transit-lab');
  await lab.getByRole('button', { name: 'Play transit', exact: true }).click();
  await expect(lab.locator('#astronomy-transit-readout')).toHaveAttribute('aria-live', 'off');
  await page.clock.runFor(1000);
  await expect(lab.getByRole('button', { name: 'Replay transit', exact: true })).toBeVisible();
  expect((await state(page)).transitTime).toBe(1);
  await lab.getByRole('button', { name: 'Replay transit', exact: true }).click();
  expect((await state(page)).transitTime).toBe(0);
  await page.clock.runFor(500);
  expect((await state(page)).transitTime).toBeGreaterThan(0);
  await lab.getByRole('button', { name: 'Midpoint', exact: true }).click();
  await page.clock.runFor(1000);
  expect((await state(page)).transitTime).toBe(0.5);
  expect((await state(page)).transitPlaying).toBe(false);
  await lab.getByRole('button', { name: 'Play transit', exact: true }).click();
  await page.evaluate(() => { (window as any).__toolData.astronomy.tab = 'tonight'; (window as any).__bump(); });
  const before = (await state(page)).transitTime;
  await page.clock.runFor(1500);
  expect((await state(page)).transitTime).toBe(before);
  expect(errors).toEqual([]);
});
