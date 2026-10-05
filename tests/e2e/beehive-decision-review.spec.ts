import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true,
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 320, height: 900,
});

test.describe.configure({ timeout: 120000, retries: 0 });
test.use({ viewport: { width: 320, height: 900 }, reducedMotion: 'reduce', video: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, mode: 'beekeeper' | 'drone' | 'queen', roleState: any = {}) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness');
  await page.evaluate(({ mode, roleState }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.__mount({ beehive: { ...BH.bhCreateNewColonyState(777, 1, 0),
      viewMode: mode, tutorialDone: true, soundOn: false, motionPaused: true,
      workers: 22000, diseaseRisk: 30, honey: 80, pollen: 80, day: 10,
      actionPoints: 3, ...roleState,
    }, otherTool: { retained: 'untouched' } });
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style,
      { width: '100%', height: 'auto', display: 'block' });
  }, { mode, roleState });
}

async function assertAccessiblePanel(page: Page, selector: string) {
  const violations = await page.evaluate(async (selector) => {
    const result = await (window as any).axe.run(document.querySelector(selector), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    return result.violations.filter((v: any) => ['serious', 'critical'].includes(v.impact))
      .map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  }, selector);
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

async function flightEvidenceState(page: Page) {
  return page.evaluate(() => {
    const data = JSON.parse(JSON.stringify((window as any).__toolData));
    delete data.beehive.drone.replayIndex;
    return JSON.stringify(data);
  });
}

test('management predictions are keyboard accessible and leave the colony unchanged', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mount(page, 'beekeeper');
  const preview = page.locator('[data-management-preview]');
  await expect(preview).toBeVisible();
  const before = await page.evaluate(() => JSON.stringify((window as any).__toolData));
  await preview.locator(':scope > summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-management-preview-choice]')).toBeVisible();
  await page.locator('[data-management-preview-choice]').selectOption('requeen');
  await page.locator('[data-management-preview-horizon]').selectOption('30');
  await expect(page.locator('[data-management-preview-results]')).toBeVisible();
  await expect(preview).toContainText(/event.free/i);
  await expect(page.locator('[data-management-preview-immediate]')).toContainText(/queen/i);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(before);
  await assertAccessiblePanel(page, '[data-management-preview]');
  await page.evaluate(() => { (window as any).__ctx.isDark = true; (window as any).__rerender(); });
  await assertAccessiblePanel(page, '[data-management-preview]');
  await page.emulateMedia({ forcedColors: 'active' });
  await page.locator('[data-management-preview-locate]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-management-choice="requeen"]')).toBeFocused();
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(before);
  expect(errors).toEqual([]);
});

test('reopened partial Drone evidence remains honest and review does not launch a flight', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mount(page, 'drone', { drone: { active: false, paused: false, attempts: 3,
    highScore: 410, difficulty: 'easy', lastRun: {
      success: false, score: 0, maxAlt: 108, distance: 0, courseSeed: 0,
      telemetry: [
        { t: 0, altitude: 10, energy: 80, wind: 0, phase: 'launch' },
        { t: 4, altitude: 108 },
        { t: 10, altitude: 80, energy: 0, wind: 2, phase: 'end' },
      ], decisionLog: [{ turn: 1, action: 'Climb', altitudeBefore: 10, altitude: 108 }],
    },
  } });
  const review = page.locator('[data-drone-saved-review]');
  await expect(review).toBeVisible();
  const before = await flightEvidenceState(page);
  const unopened = await page.evaluate(() => JSON.stringify((window as any).__toolData));
  await page.locator('[data-drone-saved-review-toggle]').focus(); await page.keyboard.press('Enter');
  const panel = page.locator('[data-drone-saved-review-panel]');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/not recorded/i);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(unopened);
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveCount(0);
  const scrub = panel.locator('input[type="range"]');
  await expect(scrub).toBeVisible();
  await scrub.focus(); await page.keyboard.press('ArrowRight');
  await expect(panel).toContainText(/108/);
  expect(await flightEvidenceState(page)).toBe(before);
  await assertAccessiblePanel(page, '[data-drone-saved-review-panel]');
  await page.evaluate(() => { (window as any).__ctx.isDark = true; (window as any).__rerender(); });
  await assertAccessiblePanel(page, '[data-drone-saved-review-panel]');
  await page.emulateMedia({ forcedColors: 'active' });
  await scrub.focus(); await page.keyboard.press('ArrowRight');
  expect(await flightEvidenceState(page)).toBe(before);
  expect(errors).toEqual([]);
});

test('Queen winter command readiness agrees across both decks and blocked keys preserve state', async ({ page }) => {
  await mount(page, 'queen', { focusLayout: true, queen: {
    active: true, paused: true, day: 31,
    resources: { nectar: 30, pollen: 20, wax: 10, royalJelly: 5 },
    pheromones: { qmp: 20, alarm: 0, nasonov: 50, brood: 40 },
    signalUsed: { emit_qmp: 31 },
  } });
  const full = page.locator('[data-queen-command="scout_rival"]');
  const quick = page.locator('[data-quick-command="scout_rival"]');
  await expect(full).toHaveAttribute('aria-disabled', 'true');
  await expect(quick).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('[data-queen-command="emit_qmp"]')).toHaveAttribute('aria-disabled', 'true');
  const before = await page.evaluate(() => JSON.stringify((window as any).__toolData));
  await full.focus(); await expect(full).toBeFocused(); await page.keyboard.press('Enter');
  await quick.focus(); await expect(quick).toBeFocused(); await page.keyboard.press('Space');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(before);
  await expect(page.locator('[data-rts-command-ready-count]')).toBeVisible();
  const total = await page.locator('[data-queen-command]').count();
  const ready = await page.locator('[data-queen-command][data-command-ready="true"]').count();
  await expect(page.locator('[data-rts-command-ready-count]')).toHaveText(`${ready}/${total} ready`);
});
