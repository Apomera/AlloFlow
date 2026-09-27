import { expect, test, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse', width: 1100, height: 900, layout: 'document', appStyles: true });
const report = 'reports/firstresponse-reasoning-practice';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const answers: Record<number, string> = { 1: 'callEMS', 2: 'cpr', 3: 'pressure', 4: 'heimlich', 5: 'aed', 6: 'recovery', 7: 'callEMS', 8: 'callEMS', 9: 'recovery', 10: 'callEMS' };
test.describe.configure({ mode: 'serial', retries: 0 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
function session(queue = [1]) { return { version: 1, queue, mode: 'all', position: 0, log: [], cue: null, action: null, hintUsed: false, feedback: null, run: 1 }; }
async function mount(page: Page, width = 1200, extra = {}) {
  await page.setViewportSize({ width, height: 940 });
  await harness.mount(page, { firstResponse: { view: 'firstAction', consentAccepted: true, ...extra } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1100px;margin:0 auto}body{margin:0}' });
}
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const failures = await page.evaluate(async () => {
    const result = await (window as any).axe.run('.fr-reason', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }));
  });
  expect(failures).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
}
async function choose(page: Page, kind: string, value: string | number) { await page.locator(`input[name="fr-reason-${kind}"][value="${value}"]`).check(); }
async function check(page: Page, cue = 0, action?: string) {
  const p = await page.evaluate(() => (window as any).__toolData.firstResponse.faPractice);
  await choose(page, 'cue', cue); await choose(page, 'action', action || answers[p.queue[p.position]]);
  await page.getByRole('button', { name: 'Check my reasoning', exact: true }).click();
}
async function next(page: Page) { await page.getByRole('button', { name: /^(Next scene|Review my decisions)$/ }).click(); }
async function finish(page: Page) {
  while (true) {
    const p = await page.evaluate(() => (window as any).__toolData.firstResponse.faPractice);
    if (p.position === p.queue.length) return;
    await check(page); await next(page);
  }
}

test('keyboard reasoning, correction, and a targeted revisit', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page); await audit(page);
  await page.screenshot({ path: report + '/intro-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Open practice record', exact: true }).click();
  await page.getByRole('button', { name: 'Practice scene: Collapse in the office', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Collapse in the office', exact: true })).toBeFocused();
  await page.locator('input[name="fr-reason-cue"][value="2"]').focus(); await page.keyboard.press('Space');
  await page.getByRole('radio', { name: 'Call 911', exact: true }).focus(); await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Check my reasoning', exact: true }).click();
  await expect(page.locator('.fr-reason [role="status"]')).toContainText('Your action fits this scene');
  await audit(page); await page.screenshot({ path: report + '/reasoning-feedback-desktop.png', fullPage: true });
  await choose(page, 'cue', 0); await page.getByRole('button', { name: 'Check my reasoning', exact: true }).click();
  await expect(page.locator('.fr-reason input:enabled')).toHaveCount(0);
  await audit(page); await next(page);
  await expect(page.getByRole('heading', { name: 'Clues connected to actions' })).toBeFocused();
  await expect(page.locator('.fr-reason-stats')).toContainText('0 / 1');
  await expect(page.locator('.fr-reason-first')).toContainText('known heart condition');
  await page.screenshot({ path: report + '/decision-review-desktop.png', fullPage: true }); await audit(page);
  await page.getByRole('button', { name: 'Revisit supported decisions' }).click(); await finish(page);
  await expect(page.locator('.fr-reason-stats')).toContainText('1 / 1');
  await page.getByRole('button', { name: 'Open practice record', exact: true }).click();
  await expect(page.locator('.fr-reason-stats')).toContainText('1 / 10'); await audit(page);
  await page.screenshot({ path: report + '/practice-record-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('all ten cases complete with separate first-check and supported records', async ({ page }) => {
  await mount(page, 1200, { faPractice: session(Object.keys(answers).map(Number)) });
  await check(page); await next(page);
  await page.getByRole('button', { name: 'Use a reasoning hint' }).click();
  await finish(page);
  await expect(page.locator('.fr-reason-review > li')).toHaveCount(10);
  await expect(page.locator('.fr-reason-stats')).toContainText('9 / 10');
  await page.getByRole('button', { name: 'Revisit supported decisions' }).click();
  const queue = await page.evaluate(() => (window as any).__toolData.firstResponse.faPractice.queue);
  expect(queue).toEqual([2]); await finish(page);
  await expect(page.locator('.fr-reason-stats')).toContainText('1 / 1');
  await page.getByRole('button', { name: 'Open practice record', exact: true }).click();
  await expect(page.locator('.fr-reason-stats')).toContainText('10 / 10');
  await expect(page.getByRole('button', { name: 'Practice remaining scenes' })).toHaveCount(0);
});

test('320px reflow, radio arrow keys, enlarged spacing, and forced colors', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, 320); await audit(page);
  await page.screenshot({ path: report + '/intro-phone.png', fullPage: true });
  await page.getByRole('button', { name: 'Start 10-scene practice' }).click();
  const radios = page.locator('input[name="fr-reason-cue"]');
  await radios.first().focus(); await page.keyboard.press('Space'); await page.keyboard.press('ArrowDown');
  await expect(radios.nth(1)).toBeChecked(); await expect(radios.nth(1)).toBeFocused();
  await page.getByRole('button', { name: 'Use a reasoning hint' }).click(); await audit(page);
  await page.screenshot({ path: report + '/reasoning-phone.png', fullPage: true });
  await page.addStyleTag({ content: '.fr-reason *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.fr-reason p{margin-bottom:2em!important}' });
  await check(page); await audit(page); await next(page);
  await page.getByRole('button', { name: 'Open practice record', exact: true }).click(); await audit(page);
  await page.screenshot({ path: report + '/practice-record-phone-spacing.png', fullPage: true });
  await page.getByRole('button', { name: 'Practice scene: The AED arrives', exact: true }).click();
  await page.emulateMedia({ forcedColors: 'active' }); await choose(page, 'cue', 0); await choose(page, 'action', 'aed');
  await expect(page.locator('input[name="fr-reason-action"][value="aed"]')).toBeChecked();
  await page.screenshot({ path: report + '/forced-colors-phone.png', fullPage: true });
});
