import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-planets-2026-09-29';
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
test.afterEach(async ({ page }) => {
  try {
    const events = await page.evaluate(() => (window as any).__events);
    expect(events).toEqual({ errors: [], rejections: [] });
  } finally {
    await page.evaluate(() => (window as any).__destroy?.()).catch(() => {});
  }
});
async function mount(page, state, contrast = false) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/__simulators');
  await page.evaluate(({ state, contrast }) => { (window as any).__contrast = contrast; (window as any).__mount(state); }, { state, contrast });
  return errors;
}


test('size comparisons preserve true diameter ratios, selection and keyboard focus', async ({ page }) => {
  const errors = await mount(page, { tab: 'planets', selectedPlanet: 'earth' });
  const group = page.getByRole('group', { name: 'Planets', exact: true });
  await expect(group.getByRole('button')).toHaveCount(8);
  await expect(page.getByRole('combobox', { name: 'Compare with', exact: true })).toHaveValue('jupiter');
  await group.getByRole('button', { name: 'Jupiter', exact: true }).click();
  await page.getByRole('combobox', { name: 'Compare with', exact: true }).selectOption('earth');
  await expect(group.getByRole('button', { name: 'Jupiter', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(group.getByRole('button', { name: 'Jupiter', exact: true })).toHaveAccessibleDescription('Equatorial diameter: 11.209 Earth diameters');
  await expect(group.getByRole('button', { name: 'Earth', exact: true })).toHaveAccessibleDescription('Equatorial diameter: 1 Earth diameters. Reference planet');
  const radius = async (role: string) => Number(await page.locator('[data-planet-disk="' + role + '"]').getAttribute('r'));
  expect(await radius('selected') / await radius('reference')).toBeCloseTo(142984/12756, 8);
  await page.getByRole('button', { name: 'Swap planets', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Swap planets', exact: true })).toBeFocused();
  await expect(group.getByRole('button', { name: 'Earth', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('combobox', { name: 'Compare with', exact: true })).toHaveValue('jupiter');
  expect(await radius('selected') / await radius('reference')).toBeCloseTo(12756/142984, 8);
  await page.locator('#astronomy-planet-comparison').screenshot({ path: OUT + '/size-desktop.png' });
  expect(errors).toEqual([]);
});

test('distance comparison uses measured endpoints and one global scale for all eight planets', async ({ page }) => {
  const errors = await mount(page, { tab: 'planets', selectedPlanet: 'mercury', planetCompareWith: 'neptune', planetCompareMode: 'distance' });
  const figure = page.locator('#astronomy-planet-comparison-figure');
  await expect(figure).toHaveAttribute('data-mode', 'distance');
  expect(Number(await figure.locator('[data-planet-distance="selected"]').getAttribute('cx')) - 30).toBeCloseTo(300 * 57.9 / 4515, 8);
  expect(Number(await figure.locator('[data-planet-distance="reference"]').getAttribute('cx'))).toBe(330);
  const rows = await page.locator('[data-planet-row]').evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute('data-planet-row'), value: Number(node.getAttribute('data-value')), fraction: Number(node.getAttribute('data-fraction')) })));
  const maximum = Math.max(...rows.map(row => row.value));
  for (const row of rows) expect(row.fraction).toBeCloseTo(row.value/maximum, 12);
  await expect(page.locator('#astronomy-planet-comparison-status')).toContainText('Mean distance from Sun');
  await page.locator('#astronomy-planet-comparison').screenshot({ path: OUT + '/distance-desktop.png' });
  expect(errors).toEqual([]);
});

test('orbit time supports keyboard edits and preserves its state when changing views and sections', async ({ page }) => {
  const errors = await mount(page, { tab: 'planets' });
  await page.getByRole('button', { name: 'Neptune’s long year', exact: true }).click();
  const figure = page.locator('#astronomy-planet-comparison-figure');
  await expect(figure).toHaveAttribute('data-mode', 'year');
  await expect(figure.locator('[data-planet-orbit="reference"]')).toHaveAttribute('data-turns', '5');
  expect(Number(await figure.locator('[data-planet-orbit="selected"]').getAttribute('data-turns'))).toBeCloseTo(5*365.2/59800, 10);
  const slider = page.getByRole('slider', { name: 'Elapsed Earth years', exact: true });
  await slider.fill('0.25');
  expect(Number(await figure.locator('[data-planet-orbit="reference"]').getAttribute('cx'))).toBeCloseTo(116, 8);
  expect(Number(await figure.locator('[data-planet-orbit="reference"]').getAttribute('cy'))).toBeCloseTo(115, 8);
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(slider).toBeFocused();
  await expect(slider).toHaveValue('0.3');
  await page.getByRole('group', { name: 'Compare planet measurements' }).getByRole('button', { name: 'Size', exact: true }).click();
  await expect(slider).toHaveCount(0);
  await page.getByRole('group', { name: 'Compare planet measurements' }).getByRole('button', { name: 'Orbit pace', exact: true }).click();
  await expect(slider).toHaveValue('0.3');
  const picker = page.getByRole('combobox', { name: 'Explore a section' });
  await picker.selectOption('seasons');
  await picker.selectOption('planets');
  await expect(slider).toHaveValue('0.3');
  await slider.focus();
  await slider.press('Home');
  await expect(slider).toHaveValue('0');
  await slider.press('End');
  await expect(slider).toHaveValue('5');
  expect(errors).toEqual([]);
});

test('phone comparisons keep controls, scales and the solar-day explanation readable at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const errors = await mount(page, { tab: 'planets', selectedPlanet: 'venus', planetCompareWith: 'earth' }, true);
  const measurements = page.locator('#astronomy-planet-measurements');
  await expect(measurements.locator('div').filter({ has: page.locator('dt', { hasText: /^Spin period$/ }) })).toContainText('5,832.5 hours');
  await expect(measurements.locator('div').filter({ has: page.locator('dt', { hasText: /^Solar day$/ }) })).toContainText('2,802 hours');
  await expect(page.locator('#astronomy-planet-day-help')).toContainText('one local noon to the next');
  await page.locator('#astronomy-planet-comparison').screenshot({ path: OUT + '/venus-phone-contrast.png' });
  const modes = page.getByRole('group', { name: 'Compare planet measurements' });
  for (const name of ['Sun distance','Orbit pace','Size']) {
    await modes.getByRole('button', { name, exact: true }).click();
    await expect(modes.getByRole('button', { name, exact: true })).toBeFocused();
    const boxes = await page.locator('#astronomy-planet-comparison button, #astronomy-planet-elapsed, #astronomy-planet-reference, #astronomy-planet-comparison-figure, #astronomy-planet-measurements').evaluateAll(nodes => nodes.map(node => { const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, height: box.height, control: node.tagName === 'BUTTON' || node.tagName === 'SELECT' || node.tagName === 'INPUT' }; }));
    for (const box of boxes) { expect(box.left).toBeGreaterThanOrEqual(-0.5); expect(box.right).toBeLessThanOrEqual(320.5); if (box.control) expect(box.height).toBeGreaterThanOrEqual(44); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await page.getByRole('button', { name: 'Neptune’s long year', exact: true }).click();
  await page.locator('#astronomy-planet-comparison').screenshot({ path: OUT + '/orbit-phone-contrast.png' });
  expect(errors).toEqual([]);
});
