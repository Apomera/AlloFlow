import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = 'reports/sky-lab-clarity-2026-09-29';
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


test('Tonight offers direct simulator routes and moves focus to the selected content', async ({ page }) => {
  const errors = await mount(page, { tab: 'tonight', observingList: [], hrHunt: { hypothesis: 'Keep my prediction', log: [] }, simMeteorView: '2d' });
  const picker = page.getByRole('combobox', { name: 'Explore a section' });
  const groups = await picker.locator('optgroup').evaluateAll(nodes => nodes.map(node => node.label));
  expect(groups).toEqual(['Explore the sky', 'Try a simulator', 'Learn about space', 'Tools and practice']);
  expect(await picker.locator('option').count()).toBe(18);
  const values = await picker.locator('option').evaluateAll(nodes => nodes.map(node => node.value));
  expect(new Set(values).size).toBe(18);
  const starts = page.locator('#astronomy-simulator-starts');
  await expect(starts.getByRole('button')).toHaveCount(4);
  await starts.screenshot({ path: OUT + '/simulator-starts-desktop.png' });
  await starts.getByRole('button', { name: /How do stars compare with the Sun/ }).click();
  await expect(page.locator('#astronomy-main')).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Star diagram (HR)', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(picker).toHaveValue('hrDiagram');
  await expect(page.locator('#astronomy-section-guide')).toContainText('Start with Sun reference');
  await expect(page.locator('[data-astronomy-command]')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'H-R diagram hypothesis' })).toHaveValue('Keep my prediction');
  expect(errors).toEqual([]);
});

test('changing sections resets panel scroll while edits preserve position and navigation focus', async ({ page }) => {
  const errors = await mount(page, { tab: 'hrDiagram', simMeteorView: '2d' });
  await page.addStyleTag({ content: '#wrap { height: 850px }' });
  const panel = page.locator('#astronomy-main');
  await panel.evaluate(el => { el.scrollTop = 600; });
  const before = await panel.evaluate(el => el.scrollTop);
  expect(before).toBeGreaterThan(300);
  await page.evaluate(() => { (window as any).__toolData.astronomy.askInput = 'Unrelated edit'; (window as any).__bump(); });
  await expect.poll(() => panel.evaluate(el => el.scrollTop)).toBe(before);
  const picker = page.getByRole('combobox', { name: 'Explore a section' });
  await picker.focus();
  await picker.selectOption('exoplanets');
  await expect.poll(() => panel.evaluate(el => el.scrollTop)).toBe(0);
  await expect(picker).toBeFocused();
  await expect(page.locator('#astronomy-section-guide')).toContainText('Start with a transit example');
  const tab = page.getByRole('tab', { name: 'Exoplanets', exact: true });
  await tab.focus();
  await tab.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Seasons', exact: true })).toBeFocused();
  await expect(picker).toHaveValue('seasons');
  await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'astronomy-tab-seasons');
  expect(errors).toEqual([]);
});

test('phone navigation and guidance stay readable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const errors = await mount(page, { tab: 'tonight', observingList: [], simMeteorView: '2d' }, true);
  await page.locator('#astronomy-simulator-starts').screenshot({ path: OUT + '/simulator-starts-phone.png' });
  const picker = page.getByRole('combobox', { name: 'Explore a section' });
  for (const section of ['exoplanets', 'hrDiagram', 'eclipses', 'observe', 'planets', 'quiz', 'print']) {
    await picker.selectOption(section);
    await expect(picker).toHaveValue(section);
    await expect(page.locator('#astronomy-section-guide h2')).not.toBeEmpty();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), section).toBe(true);
    const guide = await page.locator('#astronomy-section-guide').textContent();
    expect(guide).not.toContain('Build a one-target');
  }
  await picker.selectOption('hrDiagram');
  await page.locator('#astronomy-section-guide').screenshot({ path: OUT + '/star-guide-phone.png' });
  await expect(page.getByRole('slider', { name: 'Mass (Sun = 1)', exact: true })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Temperature (K)', exact: true })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Luminosity (Sun = 1)', exact: true })).toBeVisible();
  await picker.selectOption('exoplanets');
  await expect(page.getByRole('slider', { name: 'Path offset (star radii)', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('star investigation explains units and distinguishes moving to the Sun from resetting notes', async ({ page }) => {
  const errors = await mount(page, { tab: 'hrDiagram', hrHunt: { hypothesis: 'Hotter means left', explanation: 'My notes', log: [] } });
  await expect(page.locator('#astronomy-hr-lab')).toContainText('luminosity, the total light a star gives off');
  await expect(page.locator('#astronomy-hr-reset-help')).toContainText('clears logged stars, predictions and explanations');
  await page.getByRole('button', { name: 'Cool giant', exact: true }).click();
  await page.getByRole('button', { name: 'Log this star observation', exact: true }).click();
  await page.getByRole('button', { name: 'Sun reference', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Logged H-R diagram observations' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'H-R diagram hypothesis' })).toHaveValue('Hotter means left');
  await page.getByRole('button', { name: 'Reset investigation', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Logged H-R diagram observations' })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'H-R diagram hypothesis' })).toHaveValue('');
  expect(errors).toEqual([]);
});
