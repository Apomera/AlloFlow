import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const desktopHarness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_cell.js',
  toolId: 'cell',
  width: 1120,
  height: 1700,
  appStyles: true,
});

const mobileHarness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_cell.js',
  toolId: 'cell',
  width: 390,
  height: 2200,
  appStyles: true,
});

const playState = () => ({
  cell: {
    mode: 'play',
    selectedOrganism: 'amoeba',
    playAsOrganism: 'amoeba',
    showPlayInstructions: false,
    playMission: { organismId: 'amoeba', startSuccess: 9 },
    _cellExt: {
      successByOrganism: { amoeba: 9 },
      organismsObserved: ['amoeba'],
      tutorialsSeen: { amoeba: true },
    },
  },
});

const triggerAmoebaSuccesses = async (page: Page, count: number) => {
  await page.waitForFunction(() => typeof (document.querySelector('[data-cell-sim-canvas]') as any)?._onXP === 'function');
  await page.evaluate((hits) => {
    const canvas = document.querySelector('[data-cell-sim-canvas]') as any;
    for (let hit = 0; hit < hits; hit += 1) canvas._onXP(5, 'Phagocytosis');
  }, count);
};

test.beforeAll(async () => {
  await desktopHarness.start();
  await mobileHarness.start();
});
test.afterAll(async () => {
  await desktopHarness.stop();
  await mobileHarness.stop();
});
test.describe.configure({ timeout: 200_000 });

test('mission loop tracks the current run and requires a biology reflection', async ({ page }, testInfo) => {
  await desktopHarness.mount(page, playState(), undefined, { expectCanvas: false });
  await page.locator('[data-cell-mission-checkpoint]').waitFor({ state: 'visible' });

  await expect(page.locator('[data-cell-target-legend]')).toContainText('Green particles');
  await expect(page.locator('[data-cell-mission-progress]')).toHaveAttribute('aria-label', 'Mission progress 0 of 3');
  await expect(page.getByText('0/3 evidence', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm you can explain the biology' })).toBeDisabled();

  await triggerAmoebaSuccesses(page, 1);
  await expect(page.locator('[data-cell-evidence-feedback]')).toContainText('Evidence 1/3');
  await expect(page.locator('[data-cell-evidence-feedback]')).toContainText('pseudopods model phagocytosis');
  await triggerAmoebaSuccesses(page, 2);
  await expect(page.getByText('Targets found \u2014 explain the biology')).toBeVisible();
  await expect(page.locator('[data-cell-mission-progress]')).toHaveAttribute('aria-label', 'Target evidence complete; reflection needed');

  const explain = page.getByRole('button', { name: 'Confirm you can explain the biology' });
  await expect(explain).toBeEnabled();
  await explain.click();
  await expect(page.getByText('\u2713 Amoeba mission complete')).toBeVisible();
  await expect(page.locator('[data-cell-mission-progress]')).toHaveAttribute('aria-label', 'Mission complete');
  await expect(page.locator('[data-cell-mastery-summary]')).toHaveText('1 / 11 missions complete');
  await expect(page.locator('[data-cell-mission-mastered="amoeba"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next mission: Paramecium' })).toBeVisible();
  const missionMastered = await page.evaluate(() => (window as any).__toolData.cell._cellExt.completedMissions.amoeba);
  expect(missionMastered).toBe(true);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-mission-checkpoint]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-mission-card-desktop.png' : testInfo.outputPath('cell-mission-card-desktop.png') });
  }

  await page.getByRole('button', { name: 'Replay mission' }).click();
  await expect(page.getByRole('dialog', { name: /60-second mission briefing: Amoeba/ })).toBeVisible();
  const replayState = await page.evaluate(() => {
    const state = (window as any).__toolData.cell;
    return { mission: state.playMission, feedback: state.playFeedback, mastered: state._cellExt.completedMissions.amoeba };
  });
  expect(replayState.mission).toMatchObject({ organismId: 'amoeba', startSuccess: 12 });
  expect(replayState.mission.reflected).not.toBe(true);
  expect(replayState.feedback).toBeNull();
  expect(replayState.mastered).toBe(true);

  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-tutorial-stage-desktop.png' : testInfo.outputPath('cell-tutorial-stage-desktop.png') });
  }
});

test('completed missions guide the learner to the next unfinished organism', async ({ page }) => {
  const state: any = playState();
  state.cell.playMission = { organismId: 'amoeba', startSuccess: 9, reflected: true };
  state.cell._cellExt.successByOrganism.amoeba = 12;
  state.cell._cellExt.completedMissions = { amoeba: true };
  await desktopHarness.mount(page, state, undefined, { expectCanvas: false });

  await page.getByRole('button', { name: 'Next mission: Paramecium' }).click();
  await expect(page.getByRole('dialog', { name: /60-second mission briefing: Paramecium/ })).toBeVisible();
  const nextState = await page.evaluate(() => (window as any).__toolData.cell);
  expect(nextState).toMatchObject({
    playAsOrganism: 'paramecium',
    selectedOrganism: 'paramecium',
    playMission: { organismId: 'paramecium', startSuccess: 0 },
  });
  expect(nextState._cellExt.completedMissions.amoeba).toBe(true);
});

test('mobile play controls, target key, and learning card stay within the stage width', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mobileHarness.mount(page, playState(), undefined, { expectCanvas: false });
  await page.locator('[data-cell-direction-pad]').waitFor({ state: 'visible' });
  await triggerAmoebaSuccesses(page, 1);
  await page.locator('[data-cell-evidence-feedback]').waitFor({ state: 'visible' });

  const bounds = await page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } : null;
    };
    return {
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      stage: box('[data-cell-stage]'),
      legend: box('[data-cell-target-legend]'),
      feedback: box('[data-cell-evidence-feedback]'),
      pad: box('[data-cell-direction-pad]'),
      checkpoint: box('[data-cell-mission-checkpoint]'),
    };
  });
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.viewportWidth + 1);
  for (const item of [bounds.legend, bounds.feedback, bounds.pad]) {
    expect(item).not.toBeNull();
    expect(item!.left).toBeGreaterThanOrEqual(bounds.stage!.left - 1);
    expect(item!.right).toBeLessThanOrEqual(bounds.stage!.right + 1);
  }
  expect(bounds.checkpoint!.left).toBeGreaterThanOrEqual(0);
  expect(bounds.checkpoint!.right).toBeLessThanOrEqual(bounds.viewportWidth + 1);
  expect(bounds.feedback!.bottom).toBeLessThanOrEqual(bounds.stage!.bottom + 1);
  await expect(page.getByText('Zoom 40x', { exact: true })).toBeHidden();

  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-play-stage-mobile.png' : testInfo.outputPath('cell-play-stage-mobile.png') });
    await page.locator('[data-cell-mission-checkpoint]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-mission-card-mobile.png' : testInfo.outputPath('cell-mission-card-mobile.png') });
  }
});
