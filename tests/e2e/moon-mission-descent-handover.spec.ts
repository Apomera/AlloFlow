import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass13-2026-10-02/browser');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: { missionPhase: 5, missionXP: 0,
  missionLog: [], animPaused: true, soundOff: true, difficulty: 'pilot',
  earnedBadges: { first_step: true, mission_complete: true }, ...extra } });
async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => {
    document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999;
    (window as any).__mount(value);
  }, data);
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
}
async function live(page: Page) {
  return page.locator('[data-descent-canvas]').evaluate((cv: HTMLCanvasElement) => {
    const st = (cv as any)._descentState();
    return { alt: st.alt, vVel: st.vVel, hVel: st.hVel, fuel: st.fuel, thrust: st.thrust,
      tilt: st.tilt, x: st.x, elapsed: st.elapsed };
  });
}
async function review(page: Page, duration = 720) {
  await expect(page.locator('[data-approach-canvas]')).toBeVisible();
  if (duration !== 720) await page.locator('[data-approach-plan]').selectOption(String(duration));
  await page.locator('[data-approach-review]').click();
  await expect(page.locator('[data-approach-result]')).toBeVisible();
  return page.evaluate(() => (window as any).MoonMissionPure.descentHandover((window as any).__toolData.moonMission));
}
async function begin(page: Page) {
  await page.locator('[data-descent-begin]').click();
  await expect(page.locator('[data-descent-canvas]')).toBeVisible();
  await page.waitForFunction(() => typeof (document.querySelector('[data-descent-canvas]') as any)?._descentState === 'function');
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
}
async function capture(page: Page, info: TestInfo, name: string, selector: string) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator(selector).screenshot({ path }); await info.attach(name, { path, contentType: 'image/png' });
}
async function axe(page: Page, selector: string) {
  return page.evaluate(async sel => (await (window as any).axe.run(document.querySelector(sel),
    { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations, selector);
}

test.describe.configure({ timeout: 150000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('verified approach enters manual flight with its measured tank, motion and engine controls', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const receipt = await review(page);
  await expect(page.locator('[data-descent-start-mode][value="approach"]')).toBeChecked();
  await capture(page, info, 'computed-start-card', '[data-descent-start-card]');
  await begin(page);
  expect(await live(page)).toEqual(receipt.state);
  expect((await saved(page)).descentStart).toEqual(receipt);
  await expect(page.locator('[data-descent-start-source]')).toHaveAttribute('data-descent-start-source', 'approach');
  expect(Number(await page.locator('[data-descent-throttle]').inputValue())).toBeCloseTo(Math.round(receipt.state.thrust * 100), 0);
  expect(Number(await page.locator('[data-descent-canvas]').getAttribute('data-descent-mass'))).toBeCloseTo(receipt.mass, 2);
  await page.waitForTimeout(250); expect(await live(page)).toEqual(receipt.state);
  expect((await saved(page)).missionXP).toBe(0);
  await capture(page, info, 'computed-handover-desktop', '[data-descent-session]');
  await page.locator('[data-descent-pause]').click();
  await expect.poll(async () => (await live(page)).elapsed).toBeGreaterThan(0.25);
  const flown = await live(page); expect(flown.fuel).toBeLessThan(receipt.state.fuel);
  await page.locator('[data-descent-pause]').click();
  const held = await live(page); await page.waitForTimeout(250); expect(await live(page)).toEqual(held);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const hidden = await live(page); await page.waitForTimeout(600); expect(await live(page)).toEqual(hidden);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(250); expect(await live(page)).toEqual(hidden);
  expect(errors).toEqual([]);
});

test('pause, resize, reload and a completed retry preserve the original handover snapshot', async ({ page }, info) => {
  await mount(page); const receipt = await review(page, 600); await begin(page);
  await page.setViewportSize({ width: 650, height: 900 }); expect(await live(page)).toEqual(receipt.state);
  await mount(page, seed(await saved(page)));
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  expect(await live(page)).toEqual(receipt.state); expect((await saved(page)).descentStart).toEqual(receipt);
  // Finish through the real lever and clock; the retained endpoint gets its own receipt.
  await page.locator('[data-descent-throttle]').fill('0'); await page.locator('[data-descent-pause]').click();
  await expect(page.locator('[data-descent-callout]')).toContainText('HARD LANDING', { timeout: 45000 });
  const result = (await saved(page)).landingResult; expect(result.start).toEqual(receipt);
  const changed = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, p = P.approachProfile({ duration: 900 });
    return { ...JSON.parse(JSON.stringify((window as any).__toolData.moonMission)), animPaused: true,
      approachPlan: p.plan, approachRun: { version: 1, duration: 900, time: p.summary.duration, recorded: true },
      approachResult: p.summary };
  });
  await mount(page, seed(changed)); await expect(page.locator('[data-landing-recorder]')).toBeVisible();
  expect((await live(page)).thrust).toBe(0); await expect(page.locator('[data-descent-throttle]')).toHaveValue('0');
  await expect(page.locator('[data-flight-value="throttle"]')).toHaveText('0%');
  expect((await saved(page)).landingResult.start).toEqual(receipt);
  await capture(page, info, 'completed-handover-record', '[data-descent-session]');
  await page.getByRole('button', { name: 'Retry the powered descent from the start', exact: true }).click();
  await expect(page.locator('[data-descent-canvas]')).toHaveCount(0); await begin(page);
  expect(await live(page)).toEqual(receipt.state); expect((await saved(page)).descentStart).toEqual(receipt);
  expect((await saved(page)).landingAttempts.at(-1).start).toEqual(receipt);
});

test('explicit practice and corrupt approach evidence use the stated practice reserve', async ({ page }) => {
  await mount(page, seed({ difficulty: 'commander' })); await review(page, 900);
  await page.locator('[data-descent-start-mode][value="practice"]').check(); await begin(page);
  const practice = (await saved(page)).descentStart;
  expect(practice.source).toBe('practice'); expect(practice.state.fuel).toBe(90); expect(practice.planDuration).toBeNull();
  expect(await live(page)).toEqual(practice.state); await expect(page.locator('[data-descent-throttle]')).toHaveValue('0');
  await mount(page); await review(page); const forged = await saved(page); forged.approachResult.mass += 1;
  await mount(page, seed(forged));
  await expect(page.locator('[data-approach-result]')).toHaveCount(0);
  await begin(page); const fallback = (await saved(page)).descentStart;
  expect(fallback.source).toBe('practice'); expect(fallback.state.fuel).toBe(110); expect(await live(page)).toEqual(fallback.state);
});

test('320px keyboard, resize and accessibility keep the handover and flight controls usable', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 850 }); await mount(page); await review(page);
  const practice = page.locator('[data-descent-start-mode][value="practice"]'); await practice.focus(); await page.keyboard.press('Space');
  await expect(practice).toBeChecked(); const computed = page.locator('[data-descent-start-mode][value="approach"]');
  await computed.focus(); await page.keyboard.press('Space'); await expect(computed).toBeChecked();
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const selection = await axe(page, '[data-descent-start-card]'); expect(selection).toEqual([]);
  await capture(page, info, 'handover-choice-phone-320', '[data-descent-start-card]');
  await begin(page); const initial = await live(page), lever = page.locator('[data-descent-throttle]');
  const throttle = Number(await lever.inputValue()); await lever.focus(); await page.keyboard.press('ArrowRight');
  await expect(lever).toHaveValue(String(Math.min(100, throttle + 1))); expect(await live(page)).toEqual(initial);
  await page.setViewportSize({ width: 500, height: 850 }); expect(await live(page)).toEqual(initial);
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  for (const selector of ['[data-descent-pause]', '[data-descent-throttle]', '[data-descent-pad] button']) {
    const boxes = await page.locator(selector).evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect(); return { x: box.x, right: box.right, height: box.height };
    }));
    for (const box of boxes) { expect(box.x).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(320); expect(box.height).toBeGreaterThanOrEqual(44); }
  }
  const flight = await axe(page, '[data-descent-session]'); expect(flight).toEqual([]);
  await capture(page, info, 'computed-handover-phone-320', '[data-descent-session]');
  await writeFile(join(REPORT, 'handover-phone-axe.json'), JSON.stringify({ selection, flight }, null, 2));
});
