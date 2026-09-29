import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-seasons-2026-09-29';
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


test('month comparisons keep charts, readouts and accessible monthly values in step', async ({ page }) => {
  const errors = await mount(page, { tab: 'seasons', seasonMonth: 6, skyLoc: 'portland' });
  const daily = page.locator('#astronomy-season-sun-path');
  const annual = page.locator('#astronomy-season-year-chart');
  const buttons = page.getByRole('group', { name: 'Compare key months' });
  const june = Number(await daily.getAttribute('data-daylight-hours'));
  await expect(annual.locator('[data-season-month]')).toHaveCount(12);
  await expect(buttons.getByRole('button', { name: 'June', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await buttons.getByRole('button', { name: 'December', exact: true }).click();
  await expect(buttons.getByRole('button', { name: 'December', exact: true })).toBeFocused();
  await expect(page.getByRole('slider', { name: 'Month of year' })).toHaveAttribute('aria-valuetext', 'December');
  await expect(page.locator('[data-season-readout="date"]')).toContainText('December 15');
  const december = Number(await daily.getAttribute('data-daylight-hours'));
  expect(december).toBeLessThan(june);
  await expect(annual.locator('[data-selected="true"]')).toHaveAttribute('data-season-month', '12');
  await expect(annual.locator('[data-selected="true"]')).toHaveAttribute('data-daylight-hours', String(await daily.getAttribute('data-daylight-hours')));
  await page.getByText('Read monthly daylight values', { exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  const decemberRow = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'December', exact: true }) });
  await expect(decemberRow.getByRole('cell')).toHaveText(await page.locator('[data-season-readout="daylight"] dd').first().innerText());
  await page.getByText('Read monthly daylight values', { exact: true }).click();
  await page.getByText('How these values are calculated', { exact: true }).click();
  await expect(page.locator('#astronomy-season-calculation')).toContainText('Atmospheric refraction');
  await page.getByText('How these values are calculated', { exact: true }).click();
  await page.locator('#astronomy-season-sun-panel').screenshot({ path: OUT + '/daylight-desktop.png' });
  expect(errors).toEqual([]);
});

test('location changes reverse the seasonal daylight comparison and keyboard month edits retain focus', async ({ page }) => {
  const errors = await mount(page, { tab: 'seasons', seasonMonth: 6, skyLoc: 'portland' });
  const annual = page.locator('#astronomy-season-year-chart');
  const hours = async (month: number) => Number(await annual.locator('[data-season-month="' + month + '"]').getAttribute('data-daylight-hours'));
  expect(await hours(6)).toBeGreaterThan(await hours(12));
  await page.getByRole('combobox', { name: 'Observer location for Sun path' }).selectOption('sydney');
  await expect(annual).toHaveAttribute('data-observer', 'sydney');
  expect(await hours(6)).toBeLessThan(await hours(12));
  const slider = page.getByRole('slider', { name: 'Month of year' });
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(slider).toBeFocused();
  await expect(slider).toHaveAttribute('aria-valuetext', 'July');
  await expect(annual.locator('[data-selected="true"]')).toHaveAttribute('data-season-month', '7');
  await expect(page.locator('[data-season-readout="date"]')).toContainText('July 15');
  await expect(page.locator('#astronomy-season-sun-status')).toContainText('Sydney');
  expect(errors).toEqual([]);
});

test('polar daylight and phone layouts remain clear at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 980 });
  const errors = await mount(page, { tab: 'seasons', seasonMonth: 6, skyLoc: 'custom', skyCustomLocation: { name: 'Arctic comparison', lat: 80, lon: 0, timeZone: 'UTC' } }, true);
  await expect(page.locator('[data-season-readout="daylight"]')).toContainText('24 hourspolar day');
  await page.getByRole('group', { name: 'Compare key months' }).getByRole('button', { name: 'December', exact: true }).click();
  await expect(page.locator('[data-season-readout="daylight"]')).toContainText('0 hourspolar night');
  await expect(page.locator('[data-season-readout="height"] dd').first()).toHaveText(/^-\d+°$/);
  const caption = await page.locator('[data-solar-polar-state]').evaluate(el => {
    const svg = (el as SVGGraphicsElement).ownerSVGElement!;
    const box = (el as SVGGraphicsElement).getBBox();
    return { left: box.x, right: box.x + box.width, bottom: box.y + box.height, width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height };
  });
  expect(caption.left).toBeGreaterThanOrEqual(0);
  expect(caption.right).toBeLessThanOrEqual(caption.width);
  expect(caption.bottom).toBeLessThanOrEqual(caption.height);
  await page.locator('#astronomy-season-sun-panel').screenshot({ path: OUT + '/daylight-phone.png' });
  const geometry = await page.evaluate(() => {
    const elements = [...document.querySelectorAll('#astronomy-season-readouts, #astronomy-season-sun-path, #astronomy-season-year-chart, [aria-label="Compare key months"] button')];
    return elements.map(el => { const box = el.getBoundingClientRect(); return { left: box.left, right: box.right, width: box.width, height: box.height, button: el.tagName === 'BUTTON' }; });
  });
  for (const box of geometry) {
    expect(box.width).toBeGreaterThan(0);
    expect(box.left).toBeGreaterThanOrEqual(-0.5);
    expect(box.right).toBeLessThanOrEqual(320.5);
    if (box.button) expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByText('Read monthly daylight values', { exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});
