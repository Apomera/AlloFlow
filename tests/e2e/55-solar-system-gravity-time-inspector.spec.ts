import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ mode: 'serial' });
const desktop = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1180, height: 900, appStyles: true });
const mobile = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 340, height: 820, appStyles: true });
function state(target = 'mars', height = 10) { return { solarSystem: { tutorialDismissed: true, selectedPlanet: 'stem.solar_sys.' + target, viewTab: 'overview', showGravityLab: true, gravHeight: height, paused: true } }; }
test.beforeAll(async () => { await desktop.start(); await mobile.start(); });
test.afterAll(async () => { await desktop.stop(); await mobile.stop(); });
test.afterEach(async ({ page }) => { await desktop.destroy(page); });

test('inspects exact quadratic positions on a common clock and saves the selected instant', async ({ page }) => {
  await desktop.mount(page, state());
  const lab = page.locator('[data-solarsystem-gravity-drop-lab]');
  const inspector = lab.locator('[data-gravity-time-inspector]');
  const run = lab.getByRole('button', { name: /Run synchronized vacuum drop/ });
  await expect(inspector).toHaveCount(0);
  await lab.getByRole('button', { name: 'Earth', exact: true }).click();
  await run.click();
  await inspector.locator('[data-gravity-checkpoint="half"]').focus();
  await page.keyboard.press('Enter');
  await expect(inspector.locator('[data-gravity-reading="target"]')).toContainText('2.50 m');
  await expect(inspector.locator('[data-gravity-reading="earth"]')).toContainText('6.58 m');
  const earth = lab.locator('[data-gravity-shaft="earth"]');
  const target = lab.locator('[data-gravity-shaft="target"]');
  expect(Number(await target.getAttribute('data-gravity-inspected-distance'))).toBeCloseTo(2.5, 8);
  const ball = target.locator('.solar-drop-ball');
  expect(await ball.evaluate(el => parseFloat((el as HTMLElement).style.top))).toBeCloseTo(45.5, 5);
  await expect(ball).toHaveCSS('animation-name', 'none');
  await expect(target.getByRole('img')).toHaveAccessibleName(/distance fallen is 2.50 meters/);
  await lab.getByRole('button', { name: /Save comparison to journal/ }).click();
  const entry = await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries.at(-1));
  expect(entry.observation).toContain('At elapsed time 1.16 s');
  expect(entry.observation).toContain('has fallen 2.50 m');
  await inspector.locator('[data-gravity-checkpoint="first"]').click();
  expect(Number(await earth.getAttribute('data-gravity-inspected-distance'))).toBeCloseTo(10, 8);
  expect(Number(await target.getAttribute('data-gravity-inspected-distance'))).toBeCloseTo(3.8, 8);
  await inspector.locator('[data-gravity-checkpoint="end"]').click();
  expect(Number(await target.getAttribute('data-gravity-inspected-distance'))).toBeCloseTo(10, 8);
  await expect(inspector.getByText('Drop endpoint reached', { exact: true })).toHaveCount(2);
  await lab.getByLabel('Object mass (kg)').fill('5');
  expect(Number(await target.getAttribute('data-gravity-inspected-distance'))).toBeCloseTo(10, 8);
  await run.click();
  await expect(earth).not.toHaveAttribute('data-gravity-inspected-distance');
  await expect(inspector.locator('[data-gravity-inspection-time]')).toHaveText('Choose a time to inspect');
  await inspector.locator('[data-gravity-checkpoint="half"]').click();
  await lab.getByRole('slider', { name: 'Vacuum drop height in meters' }).fill('20');
  await expect(inspector).toHaveCount(0);
  await run.click();
  await inspector.locator('[data-gravity-checkpoint="half"]').click();
  expect(Number(await target.getAttribute('data-gravity-inspected-distance'))).toBeCloseTo(5, 8);
});

test('preserves arrival-time ratios for short drops and clamps positions after arrival', async ({ page }) => {
  await desktop.mount(page, state('jupiter', 1));
  const lab = page.locator('[data-solarsystem-gravity-drop-lab]');
  await lab.locator('[data-gravity-inquiry-step="predict"]').getByRole('button', { name: 'stem.solar_sys.jupiter', exact: true }).click();
  await lab.getByRole('button', { name: /Run synchronized vacuum drop/ }).click();
  const times = await lab.locator('.solar-drop-ball').evaluateAll(els => els.map(el => parseFloat((el as HTMLElement).style.getPropertyValue('--drop-time'))));
  expect(times[0]).toBeGreaterThan(times[1]);
  expect(times[0] / times[1]).toBeCloseTo(Math.sqrt(2.53), 1);
  const inspector = lab.locator('[data-gravity-time-inspector]');
  await inspector.locator('[data-gravity-checkpoint="half"]').click();
  expect(Number(await lab.locator('[data-gravity-shaft="earth"]').getAttribute('data-gravity-inspected-distance'))).toBeCloseTo(0.25, 8);
  expect(Number(await lab.locator('[data-gravity-shaft="target"]').getAttribute('data-gravity-inspected-distance'))).toBeCloseTo(0.6325, 8);
  await inspector.getByRole('slider').fill('100');
  for (const shaft of await lab.locator('[data-gravity-shaft]').all()) expect(Number(await shaft.getAttribute('data-gravity-inspected-distance'))).toBeCloseTo(1, 8);
});

test('offers readable manual inspection on narrow screens with reduced motion', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mobile.mount(page, state());
  const lab = page.locator('[data-solarsystem-gravity-drop-lab]');
  await lab.getByRole('button', { name: 'Earth', exact: true }).click();
  await lab.getByRole('button', { name: /Run synchronized vacuum drop/ }).click();
  const inspector = lab.locator('[data-gravity-time-inspector]');
  await inspector.locator('[data-gravity-checkpoint="half"]').click();
  for (const dark of [false, true]) {
    await page.evaluate(value => { (window as any).__ctx.isDark = value; (window as any).__rerender(); }, dark);
    await expect(inspector.getByRole('slider')).toBeVisible();
    const shafts = await lab.locator('.solar-drop-shaft').evaluateAll(els => els.map(el => el.getBoundingClientRect().top));
    expect(shafts[0]).toBeCloseTo(shafts[1], 1);
    for (const button of await inspector.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box && box.height >= 44 && box.x >= 0 && box.x + box.width <= 341).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await lab.screenshot({ path: testInfo.outputPath(dark ? 'gravity-inspector-dark.png' : 'gravity-inspector-light.png') });
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
