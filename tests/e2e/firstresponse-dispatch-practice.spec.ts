import { expect, test, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse', width: 1100, height: 900, layout: 'document', appStyles: true });
const report = 'reports/firstresponse-dispatch-practice';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
test.describe.configure({ mode: 'serial', retries: 0 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
async function mount(page: Page, width = 1200, extra = {}) {
  await page.setViewportSize({ width, height: 940 });
  await harness.mount(page, { firstResponse: { view: 'call', callView: 'practice', consentAccepted: true, ...extra } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1100px;margin:0 auto}body{margin:0}' });
}
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const failures = await page.evaluate(async () => {
    const result = await (window as any).axe.run('.fr-call-shell', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }));
  });
  expect(failures).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
}
function rehearsal(page: Page) { return page.getByRole('region', { name: 'Emergency communication rehearsal' }); }
async function check(page: Page) { await rehearsal(page).getByRole('button', { name: 'Check practice response', exact: true }).click(); }
async function next(page: Page) { await rehearsal(page).getByRole('button', { name: /Continue rehearsal|Review conversation/ }).click(); }
async function select(page: Page, pattern: RegExp) { await rehearsal(page).getByRole('checkbox', { name: pattern }).check(); }
async function finish(page: Page) {
  while (true) {
    const s = await page.evaluate(() => (window as any).__toolData.firstResponse.dispatchPractice);
    if (s.turn === 5) return;
    const trail = s.caseId === 'trail', text = s.mode === 'text';
    const options = [
      [trail ? /^River Loop Trail/ : /^48 Lantern Way/, trail ? /^Trail marker 4/ : /^Community center, gym/],
      [trail ? /^A cyclist fell/ : /^An adult collapsed/, trail ? /^A helper is applying/ : /^A helper is beside/],
      [/^This practice phone number/],
      [trail ? /^Blood is now soaking/ : /^Their breathing has changed/],
      [text ? /^Keep watching for replies/ : /^Stay on the line/]
    ];
    if (text && s.turn === 0) options[0].push(trail ? /^A cyclist fell/ : /^An adult collapsed/);
    for (const name of options[s.turn]) await select(page, name);
    await check(page); await next(page);
  }
}

test('keyboard correction, changing observations, and the conversation review', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page);
  await audit(page);
  await page.screenshot({ path: report + '/picker-desktop.png', fullPage: true });
  const start = rehearsal(page).getByRole('button', { name: /^Community center/ });
  await start.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-fr-dispatch-heading]')).toBeFocused();
  const location = rehearsal(page).getByRole('checkbox', { name: /^48 Lantern Way/ });
  await location.focus(); await page.keyboard.press('Space');
  await check(page);
  await expect(rehearsal(page).getByRole('status')).toContainText('Add both the location');
  await expect(rehearsal(page).getByRole('button', { name: /Continue rehearsal/ })).toHaveCount(0);
  await page.screenshot({ path: report + '/location-feedback-desktop.png', fullPage: true });
  await audit(page);
  await select(page, /^Community center, gym/); await check(page); await next(page);
  await select(page, /^An adult collapsed/); await select(page, /^A helper is beside/); await check(page); await next(page);
  await page.getByText('Full briefing and callback number', { exact: true }).click();
  await expect(page.locator('.fr-dispatch-full-brief')).toContainText('(207) 555-0142');
  await select(page, /^This practice phone number/); await check(page); await next(page);
  await expect(page.locator('.fr-dispatch-change')).toContainText('occasional irregular gasps');
  await page.screenshot({ path: report + '/changing-observation-desktop.png', fullPage: true });
  await finish(page);
  await expect(page.getByRole('heading', { name: 'Communication rehearsal complete' })).toBeFocused();
  await expect(page.locator('.fr-dispatch-result')).toContainText('4 / 5');
  await expect(page.locator('.fr-dispatch-first')).toContainText('48 Lantern Way');
  await audit(page);
  await page.screenshot({ path: report + '/conversation-review-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('both locations and communication modes complete without outbound call controls', async ({ page }) => {
  await mount(page);
  await rehearsal(page).getByRole('radio', { name: 'Maine text practice' }).check();
  await expect(page.locator('.fr-dispatch-notice')).toContainText('location and the emergency');
  await rehearsal(page).getByRole('button', { name: /^River trail/ }).click();
  await select(page, /^River Loop Trail/); await select(page, /^Trail marker 4/); await check(page);
  await expect(rehearsal(page).getByRole('status')).toContainText('emergency in the first practice text');
  await rehearsal(page).getByRole('button', { name: 'Show an example' }).click();
  await expect(page.locator('#fr-dispatch-example')).toContainText('A cyclist fell');
  await finish(page);
  await expect(page.locator('.fr-dispatch-result')).toContainText('4 / 5');
  for (const name of ['Try the other location', 'Practice the other communication mode', 'Try the other location']) {
    await rehearsal(page).getByRole('button', { name, exact: true }).click(); await finish(page);
    await expect(page.locator('.fr-dispatch-result')).toContainText('5 / 5');
  }
  const badges = await page.evaluate(() => (window as any).__toolData.firstResponse.badges);
  expect(badges.dispatch_voice).toBeTruthy(); expect(badges.dispatch_text).toBeTruthy();
  expect(await rehearsal(page).locator('a[href^="tel:"],a[href^="sms:"]').count()).toBe(0);
});

test('320px layout, text spacing, reduced motion, and forced colors', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, 320, { dispatchMode: 'text' });
  await audit(page);
  await page.screenshot({ path: report + '/picker-phone.png', fullPage: true });
  await rehearsal(page).getByRole('button', { name: /^River trail/ }).click();
  await audit(page);
  await page.screenshot({ path: report + '/text-practice-phone.png', fullPage: true });
  await page.addStyleTag({ content: '.fr-call-shell *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.fr-call-shell p{margin-bottom:2em!important}' });
  await select(page, /^River Loop Trail/); await check(page); await audit(page);
  await finish(page); await audit(page);
  await page.screenshot({ path: report + '/review-phone-spacing.png', fullPage: true });
  await page.emulateMedia({ forcedColors: 'active' });
  await rehearsal(page).getByRole('button', { name: 'Try the other location', exact: true }).click();
  await select(page, /^48 Lantern Way/);
  await expect(rehearsal(page).getByRole('checkbox', { name: /^48 Lantern Way/ })).toBeChecked();
  await page.screenshot({ path: report + '/forced-colors-phone.png', fullPage: true });
});
