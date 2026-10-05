import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1080, height: 900,
  extraScripts: ['node_modules/axe-core/axe.min.js'],
});
test.describe.configure({ timeout: 120000 });
test.use({ viewport: { width: 1080, height: 900 }, reducedMotion: 'reduce' });
test.beforeAll(async () => { mkdirSync('scratch/beehive-roadmap', { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: any, partial = false, dark = false) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness');
  await page.evaluate(({ partial, dark }: any) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    const runA = { ...BH.bhCreateNewColonyState(4321, 1), day: 12,
      experimentEnvironment: { schemaVersion: 1, gardenBonus: 0, trackedFromDay: 0 } };
    [
      { day: 1, choiceId: 'feed_bees', label: 'Feed bees', cost: '1 AP' },
      { day: 3, choiceId: 'hive_hygiene', label: 'Hive hygiene', cost: '1 AP' },
      { day: 5, choiceId: 'add_super', label: 'Add super', cost: '1 AP' },
      { day: 10, choiceId: 'winterize', label: 'Winterize', cost: '2 AP' },
    ].forEach(action => BH.bhAppendManagementAction(runA, action));
    if (partial) runA.managementHistory = { schemaVersion: 1, retainedCount: 4, omittedCount: 2, complete: false };
    const plan = {
      plannedActionId: 'plant_wildflowers', predictedMetricId: 'honey', predictedDirection: 'higher',
      question: 'Does planting once change stored honey?', hypothesis: 'Extra forage may increase stores.',
      changedVariable: 'Add wildflowers on Day 2; match the remaining Run A choices.', prediction: 'Compare honey on Day 12.',
    };
    const state = { ...BH.bhCreateNewColonyState(4321, 2), day: partial ? 4 : 3,
      experimentEnvironment: { schemaVersion: 1, gardenBonus: 0, trackedFromDay: 0 },
      diseaseRisk: 20, tutorialDone: true, viewMode: 'beekeeper', motionPaused: true, soundOn: false,
      experimentBaseline: BH.bhCreateExperimentSnapshot(runA),
      notebook: { experiment: { ...plan, registeredPlan: BH.bhCreateExperimentPlanRegistration(plan, 2, 1) } },
    };
    BH.bhAppendManagementAction(state, { day: 1, choiceId: 'feed_bees', label: 'Feed bees', cost: '1 AP' });
    BH.bhAppendManagementAction(state, { day: 2, choiceId: 'plant_wildflowers', label: 'Plant wildflowers', cost: '1 AP' });
    w.__mount({ beehive: state });
    w.__ctx.isDark = dark; w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, { partial, dark });
  await expect(page.locator('[data-experiment-action-schedule]')).toBeVisible();
}

async function audit(page: any) {
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-experiment-action-schedule]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.failureSummary) }));
  });
  expect(violations).toEqual([]);
}

test('keyboard schedule locates exact controls without applying choices, then records an intentional action', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const schedule = page.locator('[data-experiment-action-schedule]');
  await expect(schedule.locator('[data-experiment-schedule-locate="run-a-1"]')).toBeVisible();
  const before = await page.evaluate(() => JSON.stringify((window as any).__toolData.beehive));
  await schedule.locator('[data-experiment-schedule-locate="run-a-1"]').focus();
  await page.keyboard.press('Enter');
  const hygiene = page.locator('[data-management-choice="hive_hygiene"]');
  await expect(hygiene).toBeFocused();
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.beehive))).toBe(before);
  await page.keyboard.press('Enter');
  await expect(schedule.locator('ul[aria-label="Run A action choices for today"] [data-schedule-status="matched"]')).toHaveCount(1);
  const state = await page.evaluate(() => (window as any).__toolData.beehive);
  expect(state.day).toBe(3);
  expect(state.actionPoints).toBe(2);
  expect(state.managementTrail.at(-1)).toMatchObject({ day: 3, choiceId: 'hive_hygiene' });
  const afterAction = JSON.stringify(state);
  await schedule.locator('[data-experiment-schedule-plan-control]').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('[data-conservation-impact="plant_wildflowers"]')).toBeFocused();
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.beehive))).toBe(afterAction);
  await schedule.getByText('Review the full retained Run A schedule (4 choices)', { exact: true }).click();
  await expect(schedule.locator('[data-experiment-schedule-timeline]')).toContainText('Day 10: Winterize');
  await audit(page);
  await schedule.screenshot({ path: 'scratch/beehive-roadmap/action-schedule-desktop.png' });
  expect(errors).toEqual([]);
});

test('incomplete schedule stays honest and readable on a phone in both themes and forced colors', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mount(page, true);
  const schedule = page.locator('[data-experiment-action-schedule]');
  await expect(schedule).toHaveAttribute('data-schedule-history-complete', 'false');
  await expect(schedule.locator('[data-experiment-schedule-limit]')).toContainText('cannot establish a fair one-change comparison');
  await expect(schedule.locator('[data-experiment-schedule-past-warning]')).toContainText('Applying it late changes the timing');
  await expect(schedule).toContainText('No retained Run A action is scheduled for this day');
  await audit(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await schedule.screenshot({ path: 'scratch/beehive-roadmap/action-schedule-mobile-light.png' });
  await page.evaluate(() => { (window as any).__ctx.isDark = true; (window as any).__rerender(); });
  await audit(page);
  await schedule.getByText('Review the full retained Run A schedule (4 choices)', { exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(schedule.locator('[data-experiment-schedule-timeline]')).toHaveAttribute('open', '');
  await expect(schedule.locator('[data-experiment-schedule-timeline]')).toContainText('Not present in retained Run B records');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await schedule.screenshot({ path: 'scratch/beehive-roadmap/action-schedule-mobile-dark.png' });
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(schedule.locator('[data-experiment-schedule-plan-control]')).toBeVisible();
  expect(await schedule.locator('[data-experiment-schedule-plan-control]').evaluate((node: HTMLElement) => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await schedule.screenshot({ path: 'scratch/beehive-roadmap/action-schedule-mobile-forced-colors.png' });
});
