import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-simulators-2026-09-28';
const HARNESS = readFileSync('tests/e2e/astronomy-observatory-3d.spec.ts', 'utf8').split('const HARNESS = `')[1].split('`;')[0]
  .replace("gradeLevel: '8th Grade',", "gradeLevel: '8th Grade', isContrast: window.__contrast === true, theme: window.__contrast ? 'contrast' : 'dark',");
let server: Server, base: string;
test.use({ viewport: { width: 1280, height: 980 }, reducedMotion: 'reduce', launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
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
async function hrState(page) { return page.evaluate(() => (window as any).__toolData.astronomy.hrHunt); }

test('HR explorer links presets, log slider, keyboard and saved observations to the visible diagram', async ({ page }) => {
  const errors = await mount(page, { tab: 'hrDiagram' });
  const chart = page.locator('#astronomy-hr-plot');
  await page.getByRole('button', { name: 'White dwarf', exact: true }).click();
  await expect(page.locator('#astronomy-hr-classification')).toContainText('White-dwarf region');
  await expect(page.locator('[data-hr-marker]')).toHaveAttribute('data-temperature', '20000');
  await expect(page.locator('[data-hr-marker]')).toHaveAttribute('data-luminosity', '0.01');
  await page.getByRole('button', { name: 'Log this star observation', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Logged H-R diagram observations' })).toContainText('White-dwarf region');
  await page.locator('#hr-lumin').fill('2');
  await expect.poll(async () => (await hrState(page)).lumin).toBe(100);
  await chart.focus();
  await chart.press('ArrowRight');
  expect((await hrState(page)).tempK).toBeLessThan(20000);
  await chart.press('ArrowUp');
  expect((await hrState(page)).lumin).toBeGreaterThan(100);
  await chart.press('Home');
  await expect.poll(async () => (await hrState(page)).tempK).toBe(5772);
  await expect(page.locator('#hr-tempK')).toHaveValue('5772');
  await expect(page.locator('#astronomy-hr-readout')).toContainText('5,772 K');
  await expect(page.locator('#astronomy-hr-readout')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('#astronomy-hr-readout')).toContainText('1 R☉');
  await page.getByRole('button', { name: 'Cool giant', exact: true }).click();
  await expect(page.locator('#astronomy-hr-classification')).toContainText('Giant region');
  await page.locator('#astronomy-hr-explorer').screenshot({ path: OUT + '/hr-desktop.png' });
  await page.getByRole('button', { name: 'Reset investigation', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Logged H-R diagram observations' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('HR diagram responds to pointer input and stays usable on a 320px contrast screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const errors = await mount(page, { tab: 'hrDiagram' }, true);
  const chart = page.locator('#astronomy-hr-plot');
  await chart.scrollIntoViewIfNeeded();
  const box = (await chart.boundingBox())!;
  await page.mouse.click(box.x + box.width * (240 / 430), box.y + box.height * (186 / 440));
  const state = await hrState(page);
  expect(state.tempK).toBeGreaterThan(9000);
  expect(state.tempK).toBeLessThan(11000);
  expect(state.lumin).toBeGreaterThan(9);
  expect(state.lumin).toBeLessThan(11);
  await expect(chart).toBeFocused();
  await page.getByRole('button', { name: 'Sun reference', exact: true }).click();
  await page.locator('#astronomy-hr-explorer').screenshot({ path: OUT + '/hr-phone-contrast.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test('eclipse stages show true coverage, clipped lunar shadow and clear phone controls', async ({ page }) => {
  const errors = await mount(page, { tab: 'eclipses', simMeteorView: '2d' });
  const sim = page.locator('#astronomy-eclipse-simulator');
  await sim.getByRole('button', { name: /Solar eclipse$/ }).click();
  await sim.getByRole('button', { name: 'Total', exact: true }).click();
  await sim.getByRole('button', { name: 'Show eclipse stage: Maximum', exact: true }).click();
  await expect(sim.locator('[data-eclipse-stage]')).toContainText(/total/i);
  await expect(sim).toContainText('100%');
  await sim.screenshot({ path: OUT + '/eclipse-solar-desktop.png' });
  await sim.getByRole('button', { name: 'Annular', exact: true }).click();
  await expect(sim.locator('[data-eclipse-stage]')).toContainText(/annular/i);
  await sim.getByRole('button', { name: /Lunar eclipse$/ }).click();
  await sim.getByRole('button', { name: 'Show eclipse stage: Maximum', exact: true }).click();
  await expect(sim.locator('[data-eclipse-stage]')).toContainText(/total/i);
  await page.setViewportSize({ width: 390, height: 844 });
  await sim.screenshot({ path: OUT + '/eclipse-lunar-phone.png' });
  await sim.getByRole('button', { name: 'Show eclipse stage: After', exact: true }).click();
  await expect(sim.locator('[data-eclipse-stage]')).not.toContainText(/totality/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});
