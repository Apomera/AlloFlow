import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true,
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1080, height: 900,
});

test.describe.configure({ timeout: 120000, retries: 0 });
test.use({ viewport: { width: 1080, height: 900 }, reducedMotion: 'reduce' });
test.beforeAll(async () => { mkdirSync('scratch/beehive-roadmap', { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function audit(page: any) {
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-experiment-archive]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    });
    return result.violations.map((violation: any) => ({ id: violation.id, nodes: violation.nodes.map((node: any) => node.failureSummary) }));
  });
  expect(violations).toEqual([]);
}

test('explicitly archives protected pairs, summarizes distinct seeds, exports, and removes only saved evidence at desktop and phone widths', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness');
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.__archiveFixture = (seed: number, delta: number, firstRun: number) => {
      const runA = { ...BH.bhCreateNewColonyState(seed, firstRun, 0), day: 12 };
      const runB = { ...BH.bhCreateNewColonyState(seed, firstRun + 1, 0), day: 12, honey: 20 + delta,
        viewMode: 'beekeeper', motionPaused: true, tutorialDone: true, soundOn: false };
      const plan = {
        plannedActionId: 'plant_wildflowers', predictedMetricId: 'honey', predictedDirection: 'higher',
        question: 'Does extra forage change honey stores?', hypothesis: 'Extra forage may increase stores.',
        changedVariable: 'Add wildflowers on Day4.', prediction: 'RunB honey will be higher at Day12.',
        observations: 'Keep my paired values and notes.', alternativeExplanation: 'Eligible events may diverge.',
        conclusion: 'Compare additional distinct recipes.',
      };
      BH.bhAppendManagementAction(runB, { day: 4, choiceId: 'plant_wildflowers', label: 'Plant wildflowers', cost: '1 AP', summary: 'Native forage planted.' });
      runB.experimentBaseline = BH.bhCreateExperimentSnapshot(runA);
      runB.notebook = { synthesis: 'Keep my colony notes.', experiment: { ...plan, registeredPlan: BH.bhCreateExperimentPlanRegistration(plan, firstRun + 1, firstRun) } };
      return runB;
    };
    w.__mount({ beehive: w.__archiveFixture(1111, 6, 1) });
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  const archive = page.locator('[data-experiment-archive]');
  await expect(archive).toBeVisible();
  await expect(archive).toHaveAttribute('data-experiment-archive-count', '0');
  await expect(archive.locator('[data-experiment-archive-save="saved"]')).toBeEnabled();
  await page.evaluate(() => {
    const button = document.querySelector('[data-experiment-archive-save]') as HTMLButtonElement;
    (window as any).ReactDOM.unstable_batchedUpdates(() => { button.click(); button.click(); });
  });
  await expect(archive).toHaveAttribute('data-experiment-archive-count', '1');
  await expect(archive.locator('[data-experiment-archive-save="duplicate"]')).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__toolData.beehive.experimentArchive.records.length)).toBe(1);

  await page.evaluate(() => {
    const w = window as any;
    const next = w.__archiveFixture(2222, -2, 3);
    w.__ctx.setLabToolData((prev: any) => ({ ...prev, beehive: { ...next, experimentArchive: prev.beehive.experimentArchive } }));
  });
  const save = archive.locator('[data-experiment-archive-save="saved"]');
  await expect(save).toBeEnabled();
  await save.focus(); await page.keyboard.press('Enter');
  await expect(archive).toHaveAttribute('data-experiment-archive-count', '2');
  await archive.getByText('Review saved pairs and across-seed summaries', { exact: true }).click();
  const table = archive.locator('[data-experiment-archive-summary]');
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await expect(table).toContainText('2 seeds / 2 pairs');
  await expect(table).toContainText('+2 lb');
  await expect(table).toContainText('-2 lb to +6 lb');
  await expect(archive).toContainText('do not establish statistical confidence');
  await archive.locator('[data-experiment-archive-copy]').click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('## Completed Paired Trial Archive');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('**Mean paired difference:** +2 lb');
  expect(copied).toContain('### Saved pair 1');
  expect(copied).toContain('Keep my paired values and notes.');
  expect(copied).toContain('not confidence intervals');
  await audit(page);
  await archive.screenshot({ path: 'scratch/beehive-roadmap/archive-desktop.png' });

  await page.setViewportSize({ width: 320, height: 844 });
  await expect(table).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const region = archive.getByRole('region', { name: 'Scrollable paired trial summary' });
  await region.focus(); await expect(region).toBeFocused();
  await audit(page);
  await archive.screenshot({ path: 'scratch/beehive-roadmap/archive-mobile-light.png' });
  await page.evaluate(() => { (window as any).__ctx.isDark = true; (window as any).__rerender(); });
  await audit(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await archive.screenshot({ path: 'scratch/beehive-roadmap/archive-mobile-dark.png' });

  const before = await page.evaluate(() => {
    const state = JSON.parse(JSON.stringify((window as any).__toolData.beehive)); delete state.experimentArchive; return state;
  });
  await archive.locator('[data-experiment-archive-remove]').first().focus();
  await page.keyboard.press('Enter');
  await expect(archive).toHaveAttribute('data-experiment-archive-count', '1');
  const after = await page.evaluate(() => {
    const state = JSON.parse(JSON.stringify((window as any).__toolData.beehive)); delete state.experimentArchive; return state;
  });
  expect(after).toEqual(before);
  expect(after.notebook.synthesis).toBe('Keep my colony notes.');
  await expect(table).toContainText('1 seeds / 1 pairs');
  expect(errors).toEqual([]);
});
