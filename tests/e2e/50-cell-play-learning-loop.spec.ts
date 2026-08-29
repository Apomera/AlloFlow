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
const readTargetGuide = async (page: Page) => {
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-cell-sim-canvas]') as any;
    const guide = canvas?._cellSimGetTargetGuide?.();
    return !!guide && Number.isFinite(guide.marker?.x) && Number.isFinite(guide.marker?.y);
  });
  return page.evaluate(() => (document.querySelector('[data-cell-sim-canvas]') as any)._cellSimGetTargetGuide());
};

const readControlResponse = async (page: Page) => {
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-cell-sim-canvas]') as any;
    const response = canvas?._cellSimGetControlResponse?.();
    return !!response && !!response.tagBounds && !!response.canvasBounds;
  });
  return page.evaluate(() => (document.querySelector('[data-cell-sim-canvas]') as any)._cellSimGetControlResponse());
};


const readMissionEvidenceState = async (page: Page) => {
  await page.waitForFunction(() => typeof (document.querySelector('[data-cell-sim-canvas]') as any)?._cellSimGetMissionEvidenceState === 'function');
  return page.evaluate(() => (document.querySelector('[data-cell-sim-canvas]') as any)._cellSimGetMissionEvidenceState());
};

const setMissionScenario = async (page: Page, scenario: Record<string, unknown>) => {
  await page.waitForFunction(() => typeof (document.querySelector('[data-cell-sim-canvas]') as any)?._cellSimTestSetMissionScenario === 'function');
  return page.evaluate((nextScenario) => (document.querySelector('[data-cell-sim-canvas]') as any)._cellSimTestSetMissionScenario(nextScenario), scenario);
};

const advanceMission = async (page: Page, elapsedMs: number) => {
  return page.evaluate((duration) => (document.querySelector('[data-cell-sim-canvas]') as any)._cellSimTestAdvanceMission(duration), elapsedMs);
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
  const predictionStage = page.locator('[data-cell-prediction-stage]');
  await expect(predictionStage).toHaveAttribute('data-cell-prediction-stage-state', 'ready');
  await expect(predictionStage.locator('[data-cell-prediction-stage-status]')).toHaveText('Before play');
  await expect(predictionStage.locator('[data-cell-prediction-summary]')).toContainText('Prediction question');
  await expect(predictionStage.locator('[data-cell-prediction-guidance]')).toContainText('before collecting evidence');
  const nextStep = page.locator('[data-cell-next-step]');
  await expect(nextStep).toHaveAttribute('data-cell-next-step-state', 'continue');
  await expect(nextStep).toContainText('Continue Amoeba \u00B7 0/3 evidence');
  await expect(nextStep).toContainText('Goal: Engulf 3 green food particles.');
  await expect(nextStep).toContainText("You'll learn: Touching a particle models phagocytosis");
  await page.getByRole('button', { name: 'Return to Amoeba mission in the dish' }).click();
  await expect(page.locator('[data-cell-sim-canvas]')).toBeFocused();
  expect(await page.evaluate(() => (window as any).__toolData.cell.playMission.startSuccess)).toBe(9);
  const initialGuide = await readTargetGuide(page);
  expect(initialGuide.kind).toBe('food');
  expect(initialGuide.marker.x).toBeGreaterThanOrEqual(initialGuide.safeRect.left);
  expect(initialGuide.marker.x).toBeLessThanOrEqual(initialGuide.safeRect.right);
  expect(initialGuide.marker.y).toBeGreaterThanOrEqual(initialGuide.safeRect.top);
  expect(initialGuide.marker.y).toBeLessThanOrEqual(initialGuide.safeRect.bottom);

  await expect(page.locator('[data-cell-target-legend]')).toContainText('Green particles');
  const controlCheckpoint = page.locator('[data-cell-checkpoint-step="control"]');
  const observeCheckpoint = page.locator('[data-cell-checkpoint-step="observe"]');
  const explainCheckpoint = page.locator('[data-cell-checkpoint-step="explain"]');
  await expect(controlCheckpoint).toHaveAttribute('data-cell-checkpoint-state', 'current');
  await expect(controlCheckpoint).toHaveAttribute('aria-current', 'step');
  await expect(controlCheckpoint.locator('[data-cell-checkpoint-status="control"]')).toHaveText('Now');
  await expect(observeCheckpoint).toHaveAttribute('data-cell-checkpoint-state', 'upcoming');
  await expect(observeCheckpoint).not.toHaveAttribute('aria-current', 'step');
  await expect(observeCheckpoint.locator('[data-cell-checkpoint-status="observe"]')).toHaveText('Next');
  await expect(explainCheckpoint).toHaveAttribute('data-cell-checkpoint-state', 'locked');
  await expect(explainCheckpoint).not.toHaveAttribute('aria-current', 'step');
  await expect(explainCheckpoint.locator('[data-cell-checkpoint-status="explain"]')).toHaveText('Locked');
  await expect(page.locator('[data-cell-mission-checkpoint] [aria-current="step"]')).toHaveCount(1);
  await expect(page.locator('[data-cell-mission-checkpoint] [data-cell-checkpoint-state="current"]')).toHaveCount(1);
  await expect(page.locator('[data-cell-mission-checkpoint] [data-cell-checkpoint-status]')).toHaveCount(3);
  await expect(page.locator('[data-cell-mission-progress]')).toHaveAttribute('aria-label', 'Learning step 2 of 4, Control. Evidence 0 of 3.');
  await expect(page.locator('[data-cell-mission-progress]')).toHaveAttribute('data-cell-learning-phase', 'control');
  await expect(page.locator('[data-cell-mission-progress]')).toHaveAttribute('data-cell-learning-step', '2');
  await expect(page.locator('[data-cell-learning-phase-label]')).toHaveText('Control');
  await expect(page.locator('[data-cell-hud-heading]')).toHaveAttribute('data-cell-hud-phase', 'control');
  await expect(page.locator('[data-cell-hud-heading]')).toHaveText('Learning loop \u00B7 2/4');
  await expect(page.locator('[data-cell-mission-progress]')).toHaveAttribute('data-cell-mission-progress-state', 'collect');
  await expect(page.locator('[data-cell-sim-canvas]')).toHaveAttribute('data-cell-sim-state', 'active');
  await expect(page.locator('[data-cell-explain-handoff]')).toHaveCount(0);
  await expect(page.getByText('0/3 evidence', { exact: true })).toBeVisible();
  await expect(page.locator('[data-cell-explanation-locked]')).toBeVisible();
  await expect(page.locator('[data-cell-explanation-locked]')).toContainText('Collect 3 targets');
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-live-phase-control-desktop.png' : testInfo.outputPath('cell-live-phase-control-desktop.png') });
    await page.locator('[data-cell-mission-checkpoint]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-roadmap-control-desktop.png' : testInfo.outputPath('cell-roadmap-control-desktop.png') });
  }

  await triggerAmoebaSuccesses(page, 1);
  await expect(predictionStage).toHaveAttribute('data-cell-prediction-stage-state', 'skipped');
  await expect(predictionStage).toContainText('No prediction was recorded before evidence collection.');
  await expect(page.locator('[data-cell-evidence-feedback]')).toContainText('Evidence 1/3');
  await expect(page.locator('[data-cell-evidence-feedback]')).toContainText('pseudopods model phagocytosis');
  await expect(page.locator('[data-cell-mission-progress]')).toHaveAttribute('data-cell-learning-phase', 'observe');
  await expect(page.locator('[data-cell-mission-progress]')).toHaveAttribute('data-cell-learning-step', '3');
  await expect(page.locator('[data-cell-mission-progress]')).toHaveAttribute('aria-label', 'Learning step 3 of 4, Observe. Evidence 1 of 3.');
  await expect(page.locator('[data-cell-learning-phase-label]')).toHaveText('Observe');
  await expect(page.locator('[data-cell-hud-heading]')).toHaveAttribute('data-cell-hud-phase', 'observe');
  await expect(page.locator('[data-cell-hud-heading]')).toHaveText('Learning loop \u00B7 3/4');
  await expect(controlCheckpoint).toHaveAttribute('data-cell-checkpoint-state', 'complete');
  await expect(controlCheckpoint).not.toHaveAttribute('aria-current', 'step');
  await expect(controlCheckpoint.locator('[data-cell-checkpoint-status="control"]')).toHaveText('\u2713 Complete');
  await expect(observeCheckpoint).toHaveAttribute('data-cell-checkpoint-state', 'current');
  await expect(observeCheckpoint).toHaveAttribute('aria-current', 'step');
  await expect(observeCheckpoint.locator('[data-cell-checkpoint-status="observe"]')).toHaveText('Now \u00B7 1/3');
  await expect(explainCheckpoint).toHaveAttribute('data-cell-checkpoint-state', 'locked');
  await expect(explainCheckpoint.locator('[data-cell-checkpoint-status="explain"]')).toHaveText('Locked');
  await expect(page.locator('[data-cell-mission-checkpoint] [aria-current="step"]')).toHaveCount(1);
  await expect(page.locator('[data-cell-mission-checkpoint] [data-cell-checkpoint-state="current"]')).toHaveCount(1);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-live-phase-observe-desktop.png' : testInfo.outputPath('cell-live-phase-observe-desktop.png') });
    await page.locator('[data-cell-mission-checkpoint]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-roadmap-observe-desktop.png' : testInfo.outputPath('cell-roadmap-observe-desktop.png') });
  }
  await triggerAmoebaSuccesses(page, 2);
  await expect(page.getByText('Targets found \u2014 explain the biology')).toBeVisible();
  const explainHandoff = page.locator('[data-cell-explain-handoff]');
  await expect(page.locator('[data-cell-mission-progress]')).toHaveAttribute('data-cell-mission-progress-state', 'explain');
  await expect(explainHandoff).toHaveAttribute('aria-label', 'Learning step 4 of 4, Explain. Evidence 3 of 3. Open Amoeba evidence explanation.');
  await expect(explainHandoff).toHaveAttribute('data-cell-learning-phase', 'explain');
  await expect(explainHandoff).toHaveAttribute('data-cell-learning-step', '4');
  await expect(page.locator('[data-cell-learning-phase-label]')).toHaveText('Explain \u2193');
  await expect(page.locator('[data-cell-hud-heading]')).toHaveAttribute('data-cell-hud-phase', 'explain');
  await expect(page.locator('[data-cell-hud-heading]')).toHaveText('Learning loop \u00B7 4/4');
  await expect(controlCheckpoint).toHaveAttribute('data-cell-checkpoint-state', 'complete');
  await expect(controlCheckpoint.locator('[data-cell-checkpoint-status="control"]')).toHaveText('\u2713 Complete');
  await expect(observeCheckpoint).toHaveAttribute('data-cell-checkpoint-state', 'complete');
  await expect(observeCheckpoint).not.toHaveAttribute('aria-current', 'step');
  await expect(observeCheckpoint.locator('[data-cell-checkpoint-status="observe"]')).toHaveText('\u2713 3/3');
  await expect(explainCheckpoint).toHaveAttribute('data-cell-checkpoint-state', 'current');
  await expect(explainCheckpoint).toHaveAttribute('aria-current', 'step');
  await expect(explainCheckpoint.locator('[data-cell-checkpoint-status="explain"]')).toHaveText('Now');
  await expect(page.locator('[data-cell-mission-checkpoint] [aria-current="step"]')).toHaveCount(1);
  await expect(page.locator('[data-cell-mission-checkpoint] [data-cell-checkpoint-state="current"]')).toHaveCount(1);
  await expect(explainHandoff).toContainText('Explain ↓');
  await expect(page.locator('[data-cell-explanation-evidence-summary]')).toContainText('Evidence to use');
  await expect(page.locator('[data-cell-explanation-evidence-summary]')).toContainText('3/3 observed');
  await expect(page.locator('[data-cell-explanation-evidence-summary]')).toContainText('Pseudopods → engulfment');
  await expect(page.locator('[data-cell-target-legend]')).toHaveAttribute('data-cell-target-state', 'complete');
  await expect(page.locator('[data-cell-sim-canvas]')).toHaveAttribute('data-cell-sim-state', 'explain');
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-cell-sim-canvas]') as any;
    return !!canvas
      && canvas._cellSimGetTargetGuide?.() === null
      && canvas._cellSimGetControlResponse?.() === null;
  });
  await expect(page.locator('[data-cell-target-proximity]')).toHaveAttribute('data-cell-proximity', 'complete');
  await expect(page.locator('[data-cell-target-proximity]')).toContainText('EVIDENCE READY');
  await expect(page.locator('[data-cell-evidence-to-explain]')).toContainText('Pseudopods → engulfment');
  await expect(page.locator('[data-cell-evidence-to-explain]')).toContainText('Choose Explain 3/3 above');
  await expect(page.locator('[data-cell-mission-cue]')).toHaveCount(0);
  await expect(page.locator('[data-cell-control-loop]')).toHaveCount(0);
  await expect(page.locator('[data-cell-direction-pad]')).toHaveCount(0);
  await expect(nextStep).toHaveAttribute('data-cell-next-step-state', 'explain');
  await expect(nextStep).toContainText('Finish the Amoeba explanation');
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-explain-handoff-desktop.png' : testInfo.outputPath('cell-explain-handoff-desktop.png') });
    await page.locator('[data-cell-mission-checkpoint]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-explanation-evidence-desktop.png' : testInfo.outputPath('cell-explanation-evidence-desktop.png') });
  }
  await explainHandoff.click();
  await expect(page.getByRole('button', { name: /^Explanation A: Pseudopods reshape/ })).toBeFocused();

  await page.locator('[data-cell-play-hud]').click();
  const explainTutorial = page.locator('[data-cell-play-tutorial-dialog]');
  const tutorialLearningPath = page.locator('[data-cell-tutorial-learning-path]');
  await expect(explainTutorial).toBeVisible();
  await expect(tutorialLearningPath).toHaveAttribute('data-cell-tutorial-phase', 'explain');
  await expect(tutorialLearningPath.locator('[data-cell-tutorial-step="predict"]')).toHaveAttribute('data-cell-tutorial-step-state', 'skipped');
  await expect(tutorialLearningPath.locator('[data-cell-tutorial-step="control"]')).toHaveAttribute('data-cell-tutorial-step-state', 'complete');
  await expect(tutorialLearningPath.locator('[data-cell-tutorial-step="observe"]')).toHaveAttribute('data-cell-tutorial-step-state', 'complete');
  await expect(tutorialLearningPath.locator('[data-cell-tutorial-step="explain"]')).toHaveAttribute('data-cell-tutorial-step-state', 'current');
  await expect(page.locator('[data-cell-tutorial-phase-guidance]')).toContainText('use your 3 observations');
  const goToExplanation = page.getByRole('button', { name: 'Go to Amoeba evidence explanation' });
  await expect(goToExplanation).toContainText('Go to explanation');
  const tutorialRegions = await page.evaluate(() => {
    const panel = document.querySelector('[data-cell-play-tutorial-panel]')!.getBoundingClientRect();
    const body = document.querySelector('[data-cell-tutorial-scroll-body]')!.getBoundingClientRect();
    const action = document.querySelector('[data-cell-tutorial-action-bar]')!.getBoundingClientRect();
    return {
      panel: { top: panel.top, bottom: panel.bottom },
      body: { top: body.top, bottom: body.bottom },
      action: { top: action.top, bottom: action.bottom },
    };
  });
  expect(tutorialRegions.body.top).toBeGreaterThan(tutorialRegions.panel.top);
  expect(tutorialRegions.body.bottom).toBeLessThanOrEqual(tutorialRegions.action.top + 1);
  expect(tutorialRegions.action.bottom).toBeLessThanOrEqual(tutorialRegions.panel.bottom + 1);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-tutorial-explain-phase-desktop.png' : testInfo.outputPath('cell-tutorial-explain-phase-desktop.png') });
  }
  await goToExplanation.click();
  await expect(explainTutorial).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Explanation A: Pseudopods reshape/ })).toBeFocused();

  await expect(page.locator('[data-cell-explanation-check]')).toBeVisible();
  const misconception = page.getByRole('button', { name: /^Explanation B: A rigid cell wall pushes/ });
  await misconception.click();
  await expect(page.locator('[data-cell-explanation-feedback]')).toContainText('amoebas use a flexible membrane and pseudopods');
  await expect(page.getByText('\u2713 Amoeba mission complete')).toHaveCount(0);
  const supportedExplanation = page.getByRole('button', { name: /^Explanation A: Pseudopods reshape/ });
  await supportedExplanation.click();
  await expect(page.locator('[data-cell-explanation-result]')).toContainText('Evidence matched');
  await expect(page.getByText('\u2713 Amoeba mission complete')).toBeVisible();
  await expect(page.locator('[data-cell-mission-progress]')).toHaveAttribute('aria-label', 'Learning loop complete. Evidence 3 of 3.');
  await expect(page.locator('[data-cell-mission-progress]')).toHaveAttribute('data-cell-learning-phase', 'complete');
  await expect(page.locator('[data-cell-mission-progress]')).toHaveAttribute('data-cell-learning-step', '4');
  await expect(page.locator('[data-cell-learning-phase-label]')).toHaveText('\u2713 Complete');
  await expect(page.locator('[data-cell-hud-heading]')).toHaveAttribute('data-cell-hud-phase', 'complete');
  await expect(page.locator('[data-cell-hud-heading]')).toHaveText('Learning loop complete');
  await expect(controlCheckpoint).toHaveAttribute('data-cell-checkpoint-state', 'complete');
  await expect(controlCheckpoint.locator('[data-cell-checkpoint-status="control"]')).toHaveText('\u2713 Complete');
  await expect(observeCheckpoint).toHaveAttribute('data-cell-checkpoint-state', 'complete');
  await expect(observeCheckpoint.locator('[data-cell-checkpoint-status="observe"]')).toHaveText('\u2713 3/3');
  await expect(explainCheckpoint).toHaveAttribute('data-cell-checkpoint-state', 'complete');
  await expect(explainCheckpoint).not.toHaveAttribute('aria-current', 'step');
  await expect(explainCheckpoint.locator('[data-cell-checkpoint-status="explain"]')).toHaveText('\u2713 Complete');
  await expect(page.locator('[data-cell-mission-checkpoint] [aria-current="step"]')).toHaveCount(0);
  await expect(page.locator('[data-cell-mission-checkpoint] [data-cell-checkpoint-state="current"]')).toHaveCount(0);
  await expect(page.locator('[data-cell-mission-checkpoint] [data-cell-checkpoint-state="complete"]')).toHaveCount(3);
  await expect(page.locator('[data-cell-mission-progress]')).toHaveAttribute('data-cell-mission-progress-state', 'complete');
  await expect(page.locator('[data-cell-explain-handoff]')).toHaveCount(0);
  await expect(page.locator('[data-cell-target-legend]')).toHaveAttribute('data-cell-target-state', 'mastered');
  await expect(page.locator('[data-cell-sim-canvas]')).toHaveAttribute('data-cell-sim-state', 'complete');
  await expect(page.locator('[data-cell-target-proximity]')).toHaveAttribute('data-cell-proximity', 'mastered');
  await expect(page.locator('[data-cell-target-proximity]')).toContainText('LOOP COMPLETE');
  await expect(page.locator('[data-cell-evidence-to-explain]')).toHaveCount(0);
  await expect(page.locator('[data-cell-mastery-summary]')).toHaveText('1 / 11 missions complete');
  await expect(page.locator('[data-cell-mission-mastered="amoeba"]')).toBeVisible();
  await expect(page.locator('[data-cell-strategy-contrast]')).toContainText('Amoeba reshapes its flexible edge with pseudopods');
  await expect(page.getByRole('button', { name: 'Compare movement strategies: Amoeba and Paramecium' })).toBeVisible();
  await expect(nextStep).toHaveAttribute('data-cell-next-step-state', 'compare');
  await expect(nextStep).toContainText('Compare next: Paramecium');
  await expect(page.getByRole('button', { name: 'Start recommended comparison: Paramecium' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start recommended comparison: Paramecium' })).toBeFocused();
  await expect(page.locator('[data-cell-recommended-card="paramecium"]')).toBeVisible();
  await page.getByRole('button', { name: 'Switch organism' }).click();
  await expect(page.locator('[data-cell-organism-option="amoeba"]')).toBeFocused();
  const missionMastered = await page.evaluate(() => (window as any).__toolData.cell._cellExt.completedMissions.amoeba);
  expect(missionMastered).toBe(true);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-mission-checkpoint]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-mission-card-desktop.png' : testInfo.outputPath('cell-mission-card-desktop.png') });
    await page.locator('[data-cell-next-step]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-next-step-desktop.png' : testInfo.outputPath('cell-next-step-desktop.png') });
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

  await expect(page.locator('[data-cell-prediction-checkpoint]')).toContainText('What visible change should occur when food is captured?');
  const amoebaPrediction = page.getByRole('button', { name: /Prediction option 1: The flexible edge will extend around the particle/ });
  await expect(amoebaPrediction).toHaveAttribute('aria-pressed', 'false');
  await amoebaPrediction.click();
  await expect(amoebaPrediction).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-cell-prediction-status]')).toContainText('Prediction saved');
  expect(await page.evaluate(() => (window as any).__toolData.cell.playMission)).toMatchObject({
    predictionChoice: 0,
    predictionText: 'The flexible edge will extend around the particle.',
  });

  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-tutorial-stage-desktop.png' : testInfo.outputPath('cell-tutorial-stage-desktop.png') });
  }

  await page.locator('[data-cell-tutorial-primary]').click();
  await expect(predictionStage).toHaveAttribute('data-cell-prediction-stage-state', 'saved');
  await expect(predictionStage.locator('[data-cell-prediction-stage-status]')).toHaveText('\u2713 Saved before play');
  await expect(predictionStage.locator('[data-cell-prediction-guidance]')).toContainText('Keep this prediction fixed');
  await expect(page.locator('[data-cell-prediction-summary]')).toContainText('The flexible edge will extend around the particle.');
  await triggerAmoebaSuccesses(page, 1);
  await expect(page.locator('[data-cell-prediction-compare]')).toContainText('Your prediction');
  await expect(page.locator('[data-cell-prediction-compare]')).toContainText('The flexible edge will extend around the particle.');
  await expect(page.locator('[data-cell-evidence-chain]')).toContainText('Observed');
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-prediction-evidence-desktop.png' : testInfo.outputPath('cell-prediction-evidence-desktop.png') });
  }
  await page.locator('[data-cell-play-hud]').click();
  await expect(amoebaPrediction).toBeDisabled();
  await expect(page.locator('[data-cell-prediction-status]')).toContainText('Compare it with the evidence.');
  await page.locator('[data-cell-tutorial-primary]').click();
  await triggerAmoebaSuccesses(page, 2);
  await expect(predictionStage).toHaveAttribute('data-cell-prediction-stage-state', 'compare');
  await expect(predictionStage.locator('[data-cell-prediction-stage-status]')).toHaveText('Compare now');
  await expect(predictionStage.locator('[data-cell-prediction-guidance]')).toContainText('all 3 observations');
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-mission-checkpoint]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-prediction-stage-compare-desktop.png' : testInfo.outputPath('cell-prediction-stage-compare-desktop.png') });
  }
});


test('live control cue translates input into organism mechanism and result', async ({ page }, testInfo) => {
  const canvasErrors: string[] = [];
  page.on('pageerror', (error) => canvasErrors.push(error.message));
  const amoebaControlState: any = playState();
  amoebaControlState.cell.paused = true;
  await desktopHarness.mount(page, amoebaControlState, undefined, { expectCanvas: false });
  await setMissionScenario(page, { particleOffsets: [[1000, 1000]], resetRuntime: true });
  await page.waitForTimeout(100);
  expect(canvasErrors).toEqual([]);
  const liveControlTrace = page.locator('[data-cell-control-loop]');
  await expect(liveControlTrace).toHaveAttribute('data-cell-control-phase', 'ready');
  await expect(liveControlTrace).toHaveAttribute('data-cell-first-action-state', 'waiting');
  await expect(liveControlTrace.locator('[data-cell-control-title]')).toHaveText('1 \u00B7 First action');
  await expect(liveControlTrace.locator('[data-cell-control-input]')).toHaveText('Press / hold a direction');
  await expect(liveControlTrace.locator('[data-cell-control-mechanism]')).toHaveText('Pseudopods extend');
  await expect(liveControlTrace.locator('[data-cell-control-observation]')).toHaveText('Cell crawls');
  await expect(liveControlTrace).toHaveAttribute('aria-label', 'First action: Press or hold any direction. Cell response: Pseudopods extend. Watch for: Cell crawls. This cue will confirm when your input is registered.');
  const directionPad = page.locator('[data-cell-direction-pad]');
  const rightDirection = directionPad.locator('[data-cell-move="ArrowRight"]');
  const padReadout = directionPad.locator('[data-cell-pad-readout]');
  await expect(directionPad).toHaveAttribute('aria-describedby', 'cell-live-biology-loop');
  await expect(directionPad).toHaveAttribute('data-cell-active-direction', 'idle');
  await expect(directionPad).toHaveAttribute('data-cell-first-action-state', 'waiting');
  await expect(directionPad).toHaveAttribute('aria-label', /No direction pressed.*First action: press or hold any direction/);
  await expect(rightDirection).toHaveAttribute('aria-pressed', 'false');
  await expect(rightDirection).toHaveAttribute('data-cell-move-active', 'false');
  await expect(padReadout).toHaveAttribute('data-cell-pad-state', 'start');
  await expect(padReadout).toHaveText(/StartPseudopods/);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-first-action-ready-desktop.png' : testInfo.outputPath('cell-first-action-ready-desktop.png') });
  }

  const canvas = page.locator('[data-cell-sim-canvas]');
  await canvas.focus();
  const idle = await readControlResponse(page);
  expect(idle).toMatchObject({
    organismId: 'amoeba',
    moving: false,
    direction: 'idle',
    idle: 'Pseudopods ready',
    evidence: 'Pseudopods \u2192 engulfment',
    mechanismVisual: 'pseudopod',
    mechanismVisualActive: false,
    mechanismVisualEvidence: false,
  });

  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => (document.querySelector('[data-cell-sim-canvas]') as any)?._cellSimGetControlResponse?.()?.moving === true);
  const moving = await readControlResponse(page);
  expect(moving).toMatchObject({
    organismId: 'amoeba',
    moving: true,
    direction: 'right',
    action: 'Pseudopods extend',
    outcome: 'Cell crawls',
    compactControlFocus: false,
    anatomyLabelCount: 3,
    evidenceActive: false,
    mechanismVisual: 'pseudopod',
    mechanismVisualActive: true,
    mechanismVisualEvidence: false,
  });
  await expect(liveControlTrace).toHaveAttribute('data-cell-control-phase', 'input');
  await expect(liveControlTrace).toHaveAttribute('data-cell-first-action-state', 'registered');
  await expect(liveControlTrace.locator('[data-cell-control-title]')).toHaveText('Live biology');
  expect(await page.evaluate(() => (window as any).__toolData.cell.playMission)).toMatchObject({ firstActionRegistered: true, firstActionKind: 'control', firstActionLabel: 'RIGHT input' });
  await expect(liveControlTrace.locator('[data-cell-control-input]')).toHaveText('RIGHT input');
  await expect(liveControlTrace.locator('[data-cell-control-mechanism]')).toHaveText('Pseudopods extend');
  await expect(liveControlTrace.locator('[data-cell-control-observation]')).toHaveText('Cell crawls');
  await expect(liveControlTrace).toHaveAttribute('aria-label', /Current action: RIGHT input.*Biological mechanism: Pseudopods extend.*Observe: Cell crawls/);
  await expect(directionPad).toHaveAttribute('data-cell-active-direction', 'right');
  await expect(directionPad).toHaveAttribute('aria-label', /Current input: right/);
  await expect(rightDirection).toHaveAttribute('aria-pressed', 'true');
  await expect(rightDirection).toHaveAttribute('data-cell-move-active', 'true');
  await expect(padReadout).toHaveAttribute('data-cell-pad-state', 'active');
  await expect(padReadout).toHaveText(/rightInput/i);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-live-action-trace-desktop.png' : testInfo.outputPath('cell-live-action-trace-desktop.png') });
  }
  expect(moving.tagBounds.left).toBeGreaterThanOrEqual(moving.canvasBounds.left);
  expect(moving.tagBounds.right).toBeLessThanOrEqual(moving.canvasBounds.right);
  expect(moving.tagBounds.top).toBeGreaterThanOrEqual(moving.canvasBounds.top);
  expect(moving.tagBounds.bottom).toBeLessThanOrEqual(moving.canvasBounds.bottom);
  await expect(page.getByRole('button', { name: /Move right.*Direction input causes Pseudopods extend.*Cell crawls/ })).toBeVisible();
  await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => (document.querySelector('[data-cell-sim-canvas]') as any)?._cellSimGetControlResponse?.()?.moving === false);
  await expect(liveControlTrace).toHaveAttribute('data-cell-control-phase', 'ready');
  await expect(liveControlTrace).toHaveAttribute('data-cell-first-action-state', 'registered');
  await expect(liveControlTrace.locator('[data-cell-control-title]')).toHaveText('\u2713 Input linked');
  await expect(liveControlTrace).toHaveAttribute('aria-label', /First action registered.*Repeat the control to steer toward the target/);
  await expect(liveControlTrace.locator('[data-cell-control-input]')).toHaveText('Direction input');
  await expect(directionPad).toHaveAttribute('data-cell-active-direction', 'idle');
  await expect(directionPad).toHaveAttribute('data-cell-first-action-state', 'registered');
  await expect(rightDirection).toHaveAttribute('aria-pressed', 'false');
  await expect(rightDirection).toHaveAttribute('data-cell-move-active', 'false');
  await expect(padReadout).toHaveAttribute('data-cell-pad-state', 'linked');
  await expect(padReadout).toHaveText(/LinkedPseudopods/);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-first-action-linked-desktop.png' : testInfo.outputPath('cell-first-action-linked-desktop.png') });
  }

  const parameciumState: any = playState();
  parameciumState.cell.selectedOrganism = 'paramecium';
  parameciumState.cell.playAsOrganism = 'paramecium';
  parameciumState.cell.playMission = { organismId: 'paramecium', startSuccess: 0 };
  parameciumState.cell._cellExt = {
    successByOrganism: { paramecium: 0 },
    organismsObserved: ['paramecium'],
    tutorialsSeen: { paramecium: true },
  };
  parameciumState.cell.paused = true;
  await desktopHarness.mount(page, parameciumState, undefined, { expectCanvas: false });
  await setMissionScenario(page, { particleOffsets: [[1000, 1000]], resetRuntime: true });
  await page.locator('[data-cell-sim-canvas]').focus();
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => (document.querySelector('[data-cell-sim-canvas]') as any)?._cellSimGetControlResponse?.()?.moving === true);
  expect(await readControlResponse(page)).toMatchObject({
    organismId: 'paramecium',
    action: 'Cilia beat together',
    outcome: 'Cell swims',
    mechanismVisual: 'cilia',
    mechanismVisualActive: true,
  });
  await expect(liveControlTrace).toHaveAttribute('data-cell-control-phase', 'input');
  await expect(liveControlTrace.locator('[data-cell-control-input]')).toHaveText('RIGHT input');
  await expect(liveControlTrace.locator('[data-cell-control-mechanism]')).toHaveText('Cilia beat together');
  await expect(liveControlTrace.locator('[data-cell-control-observation]')).toHaveText('Cell swims');
  await expect(directionPad).toHaveAttribute('data-cell-active-direction', 'right');
  await expect(rightDirection).toHaveAttribute('aria-pressed', 'true');
  await expect(padReadout).toHaveAttribute('data-cell-pad-state', 'active');
  await expect(padReadout).toHaveText(/rightInput/i);
  await page.keyboard.up('ArrowRight');
  await expect(directionPad).toHaveAttribute('data-cell-first-action-state', 'registered');
  await expect(padReadout).toHaveAttribute('data-cell-pad-state', 'linked');
  await expect(padReadout).toContainText('Cilia');
});

test('briefing traps and restores focus and can restart only the current attempt', async ({ page }) => {
  const state: any = playState();
  state.cell._cellExt.completedMissions = { amoeba: true };
  await desktopHarness.mount(page, state, undefined, { expectCanvas: false });
  await triggerAmoebaSuccesses(page, 1);

  const tutorialButton = page.locator('[data-cell-play-hud]');
  await tutorialButton.click();
  const dialog = page.locator('[data-cell-play-tutorial-dialog]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  expect(await page.locator('[data-cell-play-tutorial-panel]').evaluate((panel) => panel.scrollTop)).toBeLessThanOrEqual(1);
  const continueMission = page.getByRole('button', { name: 'Continue Amoeba mission' });
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('[data-cell-restart-attempt]')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(continueMission).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(tutorialButton).toBeFocused();

  await tutorialButton.click();
  await page.getByRole('button', { name: 'Continue Amoeba mission' }).click();
  await expect(page.locator('[data-cell-sim-canvas]')).toBeFocused();

  await tutorialButton.click();
  await page.locator('[data-cell-restart-attempt]').click();
  await expect(page.locator('[data-cell-restart-attempt]')).toHaveCount(0);
  const restarted = await page.evaluate(() => {
    const cell = (window as any).__toolData.cell;
    return {
      mission: cell.playMission,
      feedback: cell.playFeedback,
      mastered: cell._cellExt.completedMissions.amoeba,
    };
  });
  expect(restarted.mission).toMatchObject({ organismId: 'amoeba', startSuccess: 10 });
  expect(restarted.mission.explanationChoice).toBeUndefined();
  expect(restarted.feedback).toBeNull();
  expect(restarted.mastered).toBe(true);
});
test('completed missions guide the learner into a movement-strategy comparison', async ({ page }) => {
  const state: any = playState();
  state.cell.playMission = { organismId: 'amoeba', startSuccess: 9, reflected: true };
  state.cell._cellExt.successByOrganism.amoeba = 12;
  state.cell._cellExt.completedMissions = { amoeba: true };
  await desktopHarness.mount(page, state, undefined, { expectCanvas: false });

  await page.getByRole('button', { name: 'Compare movement strategies: Amoeba and Paramecium' }).click();
  await expect(page.getByRole('dialog', { name: /60-second mission briefing: Paramecium/ })).toBeVisible();
  const nextState = await page.evaluate(() => (window as any).__toolData.cell);
  expect(nextState).toMatchObject({
    playAsOrganism: 'paramecium',
    selectedOrganism: 'paramecium',
    playMission: { organismId: 'paramecium', startSuccess: 0 },
  });
  expect(nextState._cellExt.completedMissions.amoeba).toBe(true);
});

test('particle evidence requires a deliberate contact episode and never double-counts overlap', async ({ page }, testInfo) => {
  const state: any = playState();
  state.cell.paused = true;
  await desktopHarness.mount(page, state, undefined, { expectCanvas: false });

  await setMissionScenario(page, { particleOffsets: [[120, 0]], resetRuntime: true });
  await advanceMission(page, 0);
  expect(await readMissionEvidenceState(page)).toMatchObject({
    successCount: 0,
    particleInitialized: true,
    particleContactLatched: false,
  });

  await setMissionScenario(page, { particleOffsets: [[0, 0], [0, 0]] });
  const firstContact = await advanceMission(page, 0);
  expect(firstContact).toMatchObject({ successCount: 1, particleContactLatched: true });
  const evidenceResponse = await readControlResponse(page);
  expect(evidenceResponse).toMatchObject({
    evidenceActive: true,
    evidenceCount: 1,
    evidenceLabel: 'Pseudopods \u2192 engulfment',
    pulseAnimated: true,
  });
  expect(evidenceResponse.evidenceTargetKey).toMatch(/^particle-/);
  await expect(page.locator('[data-cell-evidence-feedback]')).toContainText('Evidence 1/3');
  await expect(page.locator('[data-cell-evidence-chain]')).toContainText('Pseudopods \u2192 engulfment');
  await expect(page.locator('[data-cell-mission-cue]')).toContainText('Move clear, then approach a new target');
  await expect(page.locator('[data-cell-mission-cue]')).toHaveAttribute('data-cell-cue-layout', 'consolidated');
  await expect(page.locator('[data-cell-evidence-feedback]')).toHaveAttribute('data-cell-evidence-layout', 'consolidated');
  await expect(page.locator('[data-cell-cue-layout="standalone"]')).toHaveCount(0);
  await expect(page.locator('[data-cell-evidence-chain]')).toHaveAttribute('aria-label', 'Structure-to-function evidence: Pseudopods \u2192 engulfment');
  const recordedTargetLegend = page.locator('[data-cell-target-legend]');
  const recordedTargetStatus = page.locator('[data-cell-target-proximity]');
  const completedApproach = page.locator('[data-cell-approach-meter]');
  await expect(recordedTargetLegend).toHaveAttribute('data-cell-target-state', 'recorded');
  await expect(recordedTargetStatus).toHaveAttribute('data-cell-proximity', 'recorded');
  await expect(recordedTargetStatus).toContainText('RECORDED');
  await expect(recordedTargetStatus).toContainText('Move clear for the next target');
  await expect(completedApproach).toHaveAttribute('data-cell-approach-state', 'complete');
  await expect(completedApproach).toHaveAttribute('aria-label', 'Mission path complete: Locate, then Approach, then Contact. Evidence recorded. Next action: Move clear for the next target.');
  await expect(completedApproach.locator('[data-cell-step-state="complete"]')).toHaveCount(3);
  await expect(completedApproach.locator('[aria-current="step"]')).toHaveCount(0);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-evidence-pulse-desktop.png' : testInfo.outputPath('cell-evidence-pulse-desktop.png') });
  }

  const heldContact = await advanceMission(page, 0);
  expect(heldContact.successCount).toBe(1);
  expect((await page.evaluate(() => (window as any).__toolData.cell._cellExt.successByOrganism.amoeba))).toBe(10);

  await setMissionScenario(page, { particleOffsets: [[120, 0]] });
  expect((await advanceMission(page, 0)).particleContactLatched).toBe(false);
  await setMissionScenario(page, { particleOffsets: [[0, 0]] });
  expect((await advanceMission(page, 0)).successCount).toBe(2);
  await expect(page.locator('[data-cell-evidence-feedback]')).toContainText('Evidence 2/3');
  expect((await page.evaluate(() => (window as any).__toolData.cell._cellExt.successByOrganism.amoeba))).toBe(11);
});

test('paused learners can reset unavailable targets without earning evidence', async ({ page }, testInfo) => {
  const state: any = playState();
  state.cell.paused = true;
  await desktopHarness.mount(page, state, undefined, { expectCanvas: false });

  await setMissionScenario(page, { particleOffsets: [], resetRuntime: true });
  const unavailable = await advanceMission(page, 0);
  expect(unavailable).toMatchObject({
    successCount: 0,
    particleContactLatched: false,
    lastCue: { phase: 'paused' },
  });
  await expect(page.locator('[data-cell-mission-cue]')).toContainText('No targets are available');
  const recovery = page.getByRole('button', { name: 'Reset unavailable mission targets and resume the simulation' });
  await expect(recovery).toBeVisible();
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-target-legend]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-target-recovery-desktop.png' : testInfo.outputPath('cell-target-recovery-desktop.png') });
  }
  expect(await page.evaluate(() => (document.querySelector('[data-cell-sim-canvas]') as any)._cellSimGetTargetGuide())).toBeNull();

  await recovery.click();
  await expect(page.locator('[data-cell-mission-cue]')).toContainText('Targets ready');
  await expect(page.locator('[data-cell-mission-cue]')).toContainText('evidence remains unchanged');
  await expect(recovery).toHaveCount(0);
  const restored = await readMissionEvidenceState(page);
  expect(restored).toMatchObject({
    successCount: 0,
    particleContactLatched: false,
  });
  expect(['restocked', 'ready']).toContain(restored.lastCue.phase);
  await page.waitForFunction(() => (window as any).__toolData.cell.paused === false);
  const restoredGuide = await page.evaluate(() => (document.querySelector('[data-cell-sim-canvas]') as any)._cellSimGetTargetGuide());
  expect(restoredGuide).toMatchObject({ kind: 'food' });

  await page.evaluate(() => (document.querySelector('[data-cell-sim-canvas]') as any)._cellSimSetPaused(true));
  await setMissionScenario(page, { particleOffsets: [[120, 0]] });
  expect((await advanceMission(page, 0)).successCount).toBe(0);
  await setMissionScenario(page, { particleOffsets: [[0, 0]] });
  expect((await advanceMission(page, 0)).successCount).toBe(1);
});
test('briefing blocks evidence and light credit requires continuous real elapsed dwell', async ({ page }, testInfo) => {
  const lightState: any = { cell: {
    mode: 'play',
    selectedOrganism: 'euglena',
    playAsOrganism: 'euglena',
    showPlayInstructions: true,
    paused: true,
    playMission: { organismId: 'euglena', startSuccess: 0 },
    _cellExt: {
      successByOrganism: { euglena: 0 },
      organismsObserved: ['euglena'],
      tutorialsSeen: { euglena: true },
    },
  } };
  await desktopHarness.mount(page, lightState, undefined, { expectCanvas: false });
  await expect(page.locator('[data-cell-play-tutorial-dialog]')).toBeVisible();

  await setMissionScenario(page, { insideLight: true, resetRuntime: true, worldTick: 59 });
  const blocked = await advanceMission(page, 2000);
  expect(blocked).toMatchObject({ evidenceAllowed: false, successCount: 0, lightHoldMs: 0 });
  expect(await page.evaluate(() => (window as any).__toolData.cell._cellExt.successByOrganism.euglena)).toBe(0);

  await page.getByRole('button', { name: 'Continue Euglena mission' }).click();
  await expect(page.locator('[data-cell-play-tutorial-dialog]')).toHaveCount(0);
  await page.evaluate(() => (document.querySelector('[data-cell-sim-canvas]') as any)._cellSimSetSpeed(5));
  await setMissionScenario(page, { insideLight: true, worldTick: 59 });

  const partial = await advanceMission(page, 750);
  expect(partial).toMatchObject({ evidenceAllowed: true, successCount: 0, lightInside: true, lightHoldMs: 750, lightProgressPct: 75 });
  await expect(page.locator('[data-cell-mission-cue]')).toContainText('Inside light');
  await expect(page.getByRole('progressbar', { name: 'Continuous light exposure' })).toHaveAttribute('aria-valuenow', '70');
  const lightPath = page.locator('[data-cell-approach-meter]');
  await expect(lightPath).toHaveAttribute('data-cell-approach-current', '2');
  await expect(lightPath).toContainText(/Find light.*Enter zone.*Hold/);
  await expect(lightPath.locator('[data-cell-approach-step="2"]')).toHaveAttribute('aria-current', 'step');
  expect((await readTargetGuide(page)).progressPct).toBe(70);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-light-dwell-desktop.png' : testInfo.outputPath('cell-light-dwell-desktop.png') });
  }

  const almost = await advanceMission(page, 249);
  expect(almost).toMatchObject({ successCount: 0, lightHoldMs: 999 });
  const complete = await advanceMission(page, 1);
  expect(complete).toMatchObject({ successCount: 1, lightHoldMs: 0 });
  expect(complete.lastCue.phase).toBe('evidence');
  await expect(page.locator('[data-cell-evidence-feedback]')).toContainText('Evidence 1/3');
  await expect(page.locator('[data-cell-mission-cue]')).toContainText('Remain in the light zone to begin the next light-capture cycle.');
  await expect(page.locator('[data-cell-mission-cue]')).toHaveAttribute('data-cell-cue-layout', 'consolidated');
  expect(await page.evaluate(() => (window as any).__toolData.cell._cellExt.successByOrganism.euglena)).toBe(1);
  await expect(page.locator('[data-cell-target-legend]')).toHaveAttribute('data-cell-target-state', 'recorded');
  await expect(page.locator('[data-cell-target-proximity]')).toHaveAttribute('data-cell-proximity', 'recorded');
  await expect(page.locator('[data-cell-target-proximity]')).toContainText('Begin the next light cycle');
  await expect(page.locator('[data-cell-approach-meter]')).toHaveAttribute('data-cell-approach-state', 'complete');
  await expect(page.locator('[data-cell-approach-meter] [data-cell-step-state="complete"]')).toHaveCount(3);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-light-evidence-recorded-desktop.png' : testInfo.outputPath('cell-light-evidence-recorded-desktop.png') });
  }

  const nextCycle = await advanceMission(page, 400);
  expect(nextCycle.lightHoldMs).toBe(400);
  await setMissionScenario(page, { insideLight: false });
  const interrupted = await advanceMission(page, 0);
  expect(interrupted).toMatchObject({ successCount: 1, lightInside: false, lightHoldMs: 0 });
  expect(interrupted.lastCue.phase).toBe('reset');
  await expect(page.locator('[data-cell-mission-cue]')).toContainText('Light exposure was interrupted');
  await expect(page.getByRole('progressbar', { name: 'Continuous light exposure' })).toHaveCount(0);
});

test('repeated plant labels explain why evidence stays unchanged', async ({ page }) => {
  const plantState: any = { cell: {
    mode: 'play',
    selectedOrganism: 'plantcell',
    playAsOrganism: 'plantcell',
    showPlayInstructions: false,
    paused: true,
    playMission: { organismId: 'plantcell', startSuccess: 0 },
    _cellExt: { successByOrganism: { plantcell: 0 } },
  } };
  await desktopHarness.mount(page, plantState, undefined, { expectCanvas: false });
  await readMissionEvidenceState(page);
  const plantTrace = page.locator('[data-cell-control-loop]');
  await expect(plantTrace).toHaveAttribute('data-cell-first-action-state', 'waiting');
  await expect(plantTrace.locator('[data-cell-control-input]')).toHaveText('Select a glowing label');

  await page.evaluate(() => {
    (document.querySelector('[data-cell-sim-canvas]') as any)._cellSimShowOrganelleTooltip('plantcell', 'Cell Wall');
    (document.querySelector('[data-cell-sim-canvas]') as any)._cellSimShowOrganelleTooltip('plantcell', 'Cell Wall');
  });
  await expect(page.locator('[data-cell-mission-cue]')).toContainText('Already observed');
  await expect(page.locator('[data-cell-mission-cue]')).toContainText('choose a different structure');
  expect((await readMissionEvidenceState(page)).successCount).toBe(1);
  expect(await page.evaluate(() => (window as any).__toolData.cell._cellExt.successByOrganism.plantcell)).toBe(1);
  await expect(plantTrace).toHaveAttribute('data-cell-first-action-state', 'progressing');
  expect(await page.evaluate(() => (window as any).__toolData.cell.playMission)).toMatchObject({ firstActionRegistered: true, firstActionKind: 'interaction', firstActionLabel: 'Label selected' });
});

test('target compass reports identity, proximity, and direction from far through deliberate contact', async ({ page }, testInfo) => {
  const state: any = playState();
  state.cell.paused = true;
  await desktopHarness.mount(page, state, undefined, { expectCanvas: false });

  await setMissionScenario(page, { particleOffsets: [[120, 0]], resetRuntime: true });
  await advanceMission(page, 0);
  const farGuide = await readTargetGuide(page);
  expect(farGuide).toMatchObject({
    kind: 'food',
    label: 'Food particle',
    proximity: 'far',
    proximityLabel: 'FAR',
    direction: 'right',
    directionLabel: 'right',
    directionGlyph: '\u2192',
    guideLabel: 'FOOD \u00B7 FAR \u00B7 RIGHT',
  });
  expect(farGuide.gap).toBeGreaterThan(35);
  const missionPath = page.locator('[data-cell-approach-meter]');
  await expect(missionPath).toBeVisible();
  await expect(missionPath).toHaveAttribute('data-cell-approach-current', '0');
  await expect(missionPath.locator('[data-cell-approach-step="0"]')).toHaveAttribute('aria-current', 'step');
  const targetStatus = page.locator('[data-cell-target-proximity]');
  await expect(targetStatus).toHaveAttribute('data-cell-proximity', 'far');
  await expect(targetStatus).toHaveAttribute('data-cell-direction', 'right');
  await expect(targetStatus).toContainText('FAR');
  await expect(targetStatus).toContainText('right');
  await expect(page.locator('[data-cell-target-legend]')).toHaveAttribute('aria-label', /Target status: FAR\. Direction: right/);
  await expect(page.locator('[data-cell-sim-canvas]')).toHaveAttribute('aria-label', /Target status: FAR\. Direction: right/);

  await setMissionScenario(page, { particleOffsets: [[0, 120]] });
  await advanceMission(page, 0);
  expect(await readTargetGuide(page)).toMatchObject({ proximity: 'far', direction: 'down', guideLabel: 'FOOD \u00B7 FAR \u00B7 DOWN' });
  await expect(targetStatus).toHaveAttribute('data-cell-direction', 'down');
  await expect(targetStatus).toContainText('down');

  await setMissionScenario(page, { particleOffsets: [[50, 0]] });
  await advanceMission(page, 0);
  const nearGuide = await readTargetGuide(page);
  expect(nearGuide).toMatchObject({
    proximity: 'near',
    proximityLabel: 'NEAR',
    direction: 'right',
    guideLabel: 'FOOD \u00B7 NEAR \u00B7 RIGHT',
  });
  expect(nearGuide.gap).toBeGreaterThan(0);
  expect(nearGuide.gap).toBeLessThanOrEqual(35);
  await expect(missionPath).toHaveAttribute('data-cell-approach-current', '1');
  await expect(missionPath.locator('[data-cell-approach-step="0"]')).toHaveAttribute('data-cell-step-state', 'complete');
  await expect(missionPath.locator('[data-cell-approach-step="1"]')).toHaveAttribute('aria-current', 'step');
  await expect(targetStatus).toHaveAttribute('data-cell-proximity', 'near');
  await expect(targetStatus).toContainText('NEAR');
  await expect(targetStatus).toContainText('Make contact');
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-target-proximity-near-desktop.png' : testInfo.outputPath('cell-target-proximity-near-desktop.png') });
  }

  await setMissionScenario(page, { particleOffsets: [[0, 0]], resetRuntime: true });
  const overlap = await advanceMission(page, 0);
  expect(overlap).toMatchObject({ successCount: 0, lastCue: { phase: 'overlap' } });
  const contactGuide = await readTargetGuide(page);
  expect(contactGuide).toMatchObject({
    proximity: 'contact',
    proximityLabel: 'CONTACT',
    direction: 'here',
    directionLabel: 'here',
    directionGlyph: '\u25CE',
    guideLabel: 'FOOD \u00B7 CONTACT \u00B7 HERE',
    gap: 0,
  });
  await expect(targetStatus).toHaveAttribute('data-cell-proximity', 'contact');
  await expect(targetStatus).toHaveAttribute('data-cell-direction', 'here');
  await expect(targetStatus).toContainText('CONTACT');
  await expect(targetStatus).toContainText('Contact detected');
  await expect(missionPath).toHaveAttribute('data-cell-approach-current', '2');
  await expect(missionPath.locator('[data-cell-approach-step="2"]')).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('[data-cell-mission-cue]')).toContainText('Begin clear of the target');
});

test('target compass adapts to structures, light, target shapes, and reduced motion', async ({ page }, testInfo) => {
  const plantState = { cell: {
    mode: 'play',
    selectedOrganism: 'plantcell',
    playAsOrganism: 'plantcell',
    showPlayInstructions: false,
    paused: true,
    playMission: { organismId: 'plantcell', startSuccess: 0 },
    _cellExt: { successByOrganism: { plantcell: 0 } },
  } };
  await desktopHarness.mount(page, plantState, undefined, { expectCanvas: false });
  const firstStructureGuide = await readTargetGuide(page);
  expect(firstStructureGuide).toMatchObject({ kind: 'structure', label: 'Cell Wall', proximity: 'select', proximityLabel: 'SELECT' });
  await expect(page.locator('[data-cell-target-proximity]')).toHaveAttribute('data-cell-proximity', 'select');
  await expect(page.locator('[data-cell-target-proximity]')).toContainText('Choose the highlighted label');
  const plantPath = page.locator('[data-cell-approach-meter]');
  await expect(plantPath).toHaveAttribute('data-cell-approach-current', '1');
  await expect(plantPath).toContainText(/Find label.*Select.*Function/);
  await expect(plantPath.locator('[data-cell-approach-step="1"]')).toHaveAttribute('aria-current', 'step');

  await page.evaluate(() => {
    (document.querySelector('[data-cell-sim-canvas]') as any)._cellSimShowOrganelleTooltip('plantcell', 'Cell Wall');
  });
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-cell-sim-canvas]') as any;
    return canvas?._cellSimGetTargetGuide?.()?.label === 'Central Vacuole';
  });
  const secondStructureGuide = await readTargetGuide(page);
  expect(secondStructureGuide.label).toBe('Central Vacuole');

  await expect(page.locator('[data-cell-target-legend]')).toHaveAttribute('data-cell-target-state', 'recorded');
  await expect(page.locator('[data-cell-target-proximity]')).toHaveAttribute('data-cell-proximity', 'recorded');
  await expect(page.locator('[data-cell-target-proximity]')).toContainText('Choose a different structure');
  await expect(plantPath).toHaveAttribute('data-cell-approach-state', 'complete');
  await expect(plantPath.locator('[data-cell-step-state="complete"]')).toHaveCount(3);
  await expect(plantPath.locator('[aria-current="step"]')).toHaveCount(0);
  await expect(page.locator('[data-cell-direction-pad]')).toHaveCount(0);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-plant-evidence-recorded-desktop.png' : testInfo.outputPath('cell-plant-evidence-recorded-desktop.png') });
  }
  const lightState = { cell: {
    mode: 'play',
    selectedOrganism: 'euglena',
    playAsOrganism: 'euglena',
    showPlayInstructions: false,
    paused: true,
    playMission: { organismId: 'euglena', startSuccess: 0 },
    _cellExt: { successByOrganism: { euglena: 0 } },
  } };
  await desktopHarness.mount(page, lightState, undefined, { expectCanvas: false });
  expect((await readTargetGuide(page)).kind).toBe('light');
  await setMissionScenario(page, { insideLight: true, resetRuntime: true });
  await advanceMission(page, 0);
  expect(await readTargetGuide(page)).toMatchObject({ kind: 'light', proximity: 'inside', proximityLabel: 'INSIDE', direction: 'here', directionLabel: 'here' });
  await expect(page.locator('[data-cell-target-proximity]')).toHaveAttribute('data-cell-proximity', 'inside');
  await expect(page.locator('[data-cell-target-proximity]')).toContainText('Hold position');

  const nutrientState = { cell: {
    mode: 'play',
    selectedOrganism: 'bacterium',
    playAsOrganism: 'bacterium',
    showPlayInstructions: false,
    paused: true,
    playMission: { organismId: 'bacterium', startSuccess: 0 },
    _cellExt: { successByOrganism: { bacterium: 0 } },
  } };
  await desktopHarness.mount(page, nutrientState, undefined, { expectCanvas: false });
  expect(await readTargetGuide(page)).toMatchObject({
    kind: 'nutrient',
    label: 'Nutrient marker',
    shape: 'diamond',
    keyline: 'Teal diamond nutrient',
    color: '#14b8a6',
  });
  await expect(page.locator('[data-cell-target-legend]'))
    .toHaveAttribute('data-cell-target-visual', 'nutrient');
  await expect(page.locator('[data-cell-target-legend]'))
    .toHaveAttribute('data-cell-target-shape', 'diamond');
  await expect(page.locator('[data-cell-target-legend]')).toContainText('Teal diamond nutrient');
  await expect(page.locator('[data-cell-sim-canvas]')).toHaveAttribute('aria-label', /Target key: Teal diamond nutrient/);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-target-nutrient-desktop.png' : testInfo.outputPath('cell-target-nutrient-desktop.png') });
  }

  const pathogenState = { cell: {
    mode: 'play',
    selectedOrganism: 'wbc',
    playAsOrganism: 'wbc',
    showPlayInstructions: false,
    paused: true,
    playMission: { organismId: 'wbc', startSuccess: 0 },
    _cellExt: { successByOrganism: { wbc: 0 } },
  } };
  await desktopHarness.mount(page, pathogenState, undefined, { expectCanvas: false });
  expect(await readTargetGuide(page)).toMatchObject({
    kind: 'pathogen',
    label: 'Pathogen target',
    shape: 'burst',
    keyline: 'Red spiky pathogen',
    color: '#ef4444',
  });
  await expect(page.locator('[data-cell-target-legend]'))
    .toHaveAttribute('data-cell-target-visual', 'pathogen');
  await expect(page.locator('[data-cell-target-legend]'))
    .toHaveAttribute('data-cell-target-shape', 'burst');
  await expect(page.locator('[data-cell-target-legend]')).toContainText('Red spiky pathogen');
  await expect(page.locator('[data-cell-sim-canvas]')).toHaveAttribute('aria-label', /Target key: Red spiky pathogen/);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-target-pathogen-desktop.png' : testInfo.outputPath('cell-target-pathogen-desktop.png') });
  }


  await page.emulateMedia({ reducedMotion: 'reduce' });
  await desktopHarness.mount(page, playState(), undefined, { expectCanvas: false });
  await page.locator('[data-cell-play-hud]').click();
  const reducedTutorial = page.locator('[data-cell-play-tutorial-dialog]');
  const reducedTutorialPanel = page.locator('[data-cell-play-tutorial-panel]');
  await expect(reducedTutorial).toBeVisible();
  await expect(reducedTutorial).toHaveCSS('animation-name', 'none');
  await expect(reducedTutorialPanel).toHaveCSS('animation-name', 'none');
  await page.locator('[data-cell-tutorial-primary]').click();
  expect((await readTargetGuide(page)).animated).toBe(false);
  expect((await readControlResponse(page))).toMatchObject({ animated: false, evidenceActive: false });
  const reducedTrace = page.locator('[data-cell-control-loop]');
  await page.locator('[data-cell-sim-canvas]').focus();
  await page.keyboard.down('ArrowRight');
  await expect(reducedTrace).toHaveAttribute('data-cell-control-phase', 'input');
  await expect(page.locator('[data-cell-move="ArrowRight"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-cell-direction-pad]')).toHaveAttribute('data-cell-active-direction', 'right');
  await expect(reducedTrace.locator('[data-cell-control-input]')).toHaveText('RIGHT input');
  expect(await readControlResponse(page)).toMatchObject({
    animated: false,
    mechanismVisual: 'pseudopod',
    mechanismVisualActive: true,
    mechanismVisualEvidence: false,
  });
  await page.keyboard.up('ArrowRight');
  await expect(reducedTrace).toHaveAttribute('data-cell-control-phase', 'ready');
  await expect(page.locator('[data-cell-move="ArrowRight"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-cell-direction-pad]')).toHaveAttribute('data-cell-active-direction', 'idle');
  await setMissionScenario(page, { particleOffsets: [[120, 0]], resetRuntime: true });
  await advanceMission(page, 0);
  await setMissionScenario(page, { particleOffsets: [[0, 0]] });
  expect((await advanceMission(page, 0)).successCount).toBe(1);
  expect((await readControlResponse(page))).toMatchObject({
    animated: false,
    evidenceActive: true,
    evidenceCount: 1,
    evidenceLabel: 'Pseudopods \u2192 engulfment',
    pulseAnimated: false,
    mechanismVisual: 'pseudopod',
    mechanismVisualActive: true,
    mechanismVisualEvidence: true,
  });
});

test('mobile pathogen target key stays legible and inside the stage', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const pathogenState = { cell: {
    mode: 'play',
    selectedOrganism: 'wbc',
    playAsOrganism: 'wbc',
    showPlayInstructions: false,
    paused: true,
    playMission: { organismId: 'wbc', startSuccess: 0 },
    _cellExt: { successByOrganism: { wbc: 0 } },
  } };
  await mobileHarness.mount(page, pathogenState, undefined, { expectCanvas: false });

  await page.locator('[data-cell-play-hud]').click();
  const mobileTutorial = page.locator('[data-cell-play-tutorial-dialog]');
  await expect(mobileTutorial).toBeVisible();
  await expect(mobileTutorial).toBeFocused();
  const tutorialPanel = page.locator('[data-cell-play-tutorial-panel]');
  const tutorialScrollBody = page.locator('[data-cell-tutorial-scroll-body]');
  const tutorialActionBar = page.locator('[data-cell-tutorial-action-bar]');
  const mobileTutorialPath = page.locator('[data-cell-tutorial-learning-path]');
  expect(await tutorialScrollBody.evaluate((body) => body.scrollTop)).toBeLessThanOrEqual(1);
  await expect(mobileTutorialPath).toHaveAttribute('data-cell-tutorial-phase', 'predict');
  await expect(mobileTutorialPath.locator('[data-cell-tutorial-step="predict"]')).toHaveAttribute('data-cell-tutorial-step-state', 'current');
  await expect(page.locator('[data-cell-tutorial-primary]')).toBeInViewport();
  expect(await page.evaluate(() => {
    const prediction = document.querySelector('[data-cell-prediction-checkpoint]');
    const control = document.querySelector('[data-cell-tutorial-control-map]');
    return !!prediction && !!control && !!(prediction.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  expect(await tutorialPanel.evaluate((panel) => panel.scrollTop)).toBeLessThanOrEqual(1);
  const tutorialControlMap = page.locator('[data-cell-tutorial-control-map]');
  await expect(tutorialControlMap).toBeVisible();
  await expect(tutorialControlMap).toHaveAttribute('aria-label', 'Control model: Direction input, then Pseudopods extend, then Immune cell crawls. Evidence to collect: Pseudopods \u2192 pathogen engulfment.');
  await expect(page.locator('[data-cell-tutorial-control-input]')).toHaveText('Direction input');
  await expect(page.locator('[data-cell-tutorial-control-mechanism]')).toHaveText('Pseudopods extend');
  await expect(page.locator('[data-cell-tutorial-control-result]')).toHaveText('Immune cell crawls');
  await expect(page.locator('[data-cell-tutorial-evidence-preview]')).toContainText('Pseudopods \u2192 pathogen engulfment');
  await expect(page.locator('[data-cell-tutorial-prediction-handoff]')).toContainText('compare this live cause-and-effect chain');
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-control-model-tutorial-mobile.png' : testInfo.outputPath('cell-control-model-tutorial-mobile.png') });
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => { const wrap = document.getElementById('wrap'); if (wrap) wrap.style.width = '320px'; });
  await page.waitForFunction(() => document.documentElement.clientWidth === 320);
  const narrowTutorialLayout = await tutorialControlMap.evaluate((controlMap) => {
    const panel = document.querySelector('[data-cell-play-tutorial-panel]') as HTMLElement;
    const body = document.querySelector('[data-cell-tutorial-scroll-body]') as HTMLElement;
    const action = document.querySelector('[data-cell-tutorial-action-bar]') as HTMLElement;
    const path = document.querySelector('[data-cell-tutorial-learning-path]') as HTMLElement;
    const mapRect = controlMap.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    const actionRect = action.getBoundingClientRect();
    const pathRect = path.getBoundingClientRect();
    return {
      viewportWidth: document.documentElement.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
      mapLeft: mapRect.left,
      mapRight: mapRect.right,
      panelLeft: panelRect.left,
      panelRight: panelRect.right,
      mapScrollWidth: controlMap.scrollWidth,
      mapClientWidth: controlMap.clientWidth,
      bodyBottom: bodyRect.bottom,
      bodyScrollHeight: body.scrollHeight,
      bodyClientHeight: body.clientHeight,
      actionLeft: actionRect.left,
      actionRight: actionRect.right,
      actionTop: actionRect.top,
      actionBottom: actionRect.bottom,
      panelBottom: panelRect.bottom,
      pathLeft: pathRect.left,
      pathRight: pathRect.right,
      pathScrollWidth: path.scrollWidth,
      pathClientWidth: path.clientWidth,
    };
  });
  expect(narrowTutorialLayout.pageScrollWidth).toBeLessThanOrEqual(narrowTutorialLayout.viewportWidth + 1);
  expect(narrowTutorialLayout.mapLeft).toBeGreaterThanOrEqual(narrowTutorialLayout.panelLeft - 1);
  expect(narrowTutorialLayout.mapRight).toBeLessThanOrEqual(narrowTutorialLayout.panelRight + 1);
  expect(narrowTutorialLayout.mapScrollWidth).toBeLessThanOrEqual(narrowTutorialLayout.mapClientWidth + 1);
  expect(narrowTutorialLayout.pathLeft).toBeGreaterThanOrEqual(narrowTutorialLayout.panelLeft - 1);
  expect(narrowTutorialLayout.pathRight).toBeLessThanOrEqual(narrowTutorialLayout.panelRight + 1);
  expect(narrowTutorialLayout.pathScrollWidth).toBeLessThanOrEqual(narrowTutorialLayout.pathClientWidth + 1);
  expect(narrowTutorialLayout.bodyScrollHeight).toBeGreaterThan(narrowTutorialLayout.bodyClientHeight);
  expect(narrowTutorialLayout.bodyBottom).toBeLessThanOrEqual(narrowTutorialLayout.actionTop + 1);
  expect(narrowTutorialLayout.actionLeft).toBeGreaterThanOrEqual(narrowTutorialLayout.panelLeft - 1);
  expect(narrowTutorialLayout.actionRight).toBeLessThanOrEqual(narrowTutorialLayout.panelRight + 1);
  expect(narrowTutorialLayout.actionBottom).toBeLessThanOrEqual(narrowTutorialLayout.panelBottom + 1);
  await expect(tutorialActionBar).toBeInViewport();
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-control-model-tutorial-320.png' : testInfo.outputPath('cell-control-model-tutorial-320.png') });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { const wrap = document.getElementById('wrap'); if (wrap) wrap.style.width = '390px'; });
  await page.waitForFunction(() => document.documentElement.clientWidth === 390);
  await expect(page.locator('[data-cell-prediction-checkpoint]')).toContainText('What should happen when the immune cell reaches a pathogen?');
  const pathogenPrediction = page.getByRole('button', { name: /Prediction option 1: Pseudopods will extend around the pathogen/ });
  await pathogenPrediction.click();
  await expect(pathogenPrediction).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-cell-prediction-status]')).toContainText('Prediction saved');
  await expect(mobileTutorialPath).toHaveAttribute('data-cell-tutorial-phase', 'control');
  await expect(mobileTutorialPath.locator('[data-cell-tutorial-step="predict"]')).toHaveAttribute('data-cell-tutorial-step-state', 'complete');
  await expect(mobileTutorialPath.locator('[data-cell-tutorial-step="control"]')).toHaveAttribute('data-cell-tutorial-step-state', 'current');
  const predictionLayout = await page.evaluate(() => {
    const panel = document.querySelector('[data-cell-play-tutorial-panel]') as HTMLElement;
    const checkpoint = document.querySelector('[data-cell-prediction-checkpoint]') as HTMLElement;
    const controlMap = document.querySelector('[data-cell-tutorial-control-map]') as HTMLElement;
    const panelRect = panel.getBoundingClientRect();
    const checkpointRect = checkpoint.getBoundingClientRect();
    const controlMapRect = controlMap.getBoundingClientRect();
    return {
      viewportWidth: document.documentElement.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
      panel: { left: panelRect.left, right: panelRect.right },
      checkpoint: { left: checkpointRect.left, right: checkpointRect.right },
      controlMap: { left: controlMapRect.left, right: controlMapRect.right },
      checkpointScrollWidth: checkpoint.scrollWidth,
      checkpointClientWidth: checkpoint.clientWidth,
      controlMapScrollWidth: controlMap.scrollWidth,
      controlMapClientWidth: controlMap.clientWidth,
    };
  });
  expect(predictionLayout.pageScrollWidth).toBeLessThanOrEqual(predictionLayout.viewportWidth + 1);
  expect(predictionLayout.panel.left).toBeGreaterThanOrEqual(0);
  expect(predictionLayout.panel.right).toBeLessThanOrEqual(predictionLayout.viewportWidth + 1);
  expect(predictionLayout.checkpoint.left).toBeGreaterThanOrEqual(predictionLayout.panel.left - 1);
  expect(predictionLayout.checkpoint.right).toBeLessThanOrEqual(predictionLayout.panel.right + 1);
  expect(predictionLayout.checkpointScrollWidth).toBeLessThanOrEqual(predictionLayout.checkpointClientWidth + 1);
  expect(predictionLayout.controlMap.left).toBeGreaterThanOrEqual(predictionLayout.panel.left - 1);
  expect(predictionLayout.controlMap.right).toBeLessThanOrEqual(predictionLayout.panel.right + 1);
  expect(predictionLayout.controlMapScrollWidth).toBeLessThanOrEqual(predictionLayout.controlMapClientWidth + 1);
  expect(await page.evaluate(() => (window as any).__toolData.cell.playMission.predictionText)).toBe('Pseudopods will extend around the pathogen.');
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-prediction-tutorial-mobile.png' : testInfo.outputPath('cell-prediction-tutorial-mobile.png') });
  }
  await page.locator('[data-cell-tutorial-primary]').click();
  await setMissionScenario(page, { particleOffsets: [[50, 0]], resetRuntime: true });
  await advanceMission(page, 0);

  expect(await readTargetGuide(page)).toMatchObject({
    kind: 'pathogen',
    shape: 'burst',
    keyline: 'Red spiky pathogen',
    proximity: 'near',
    direction: 'right',
    guideLabel: 'PATHOGEN \u00B7 NEAR \u00B7 RIGHT',
  });
  const legend = page.locator('[data-cell-target-legend]');
  await expect(legend).toHaveAttribute('data-cell-target-shape', 'burst');
  await expect(legend).toContainText('Red spiky pathogen targets');
  const mobileTargetStatus = page.locator('[data-cell-target-proximity]');
  await expect(mobileTargetStatus).toHaveAttribute('data-cell-proximity', 'near');
  await expect(mobileTargetStatus).toHaveAttribute('data-cell-direction', 'right');
  await expect(mobileTargetStatus).toContainText('NEAR');
  await expect(mobileTargetStatus).toContainText('Make contact');

  const layout = await page.evaluate(() => {
    const stage = document.querySelector('[data-cell-stage]')!.getBoundingClientRect();
    const targetKey = document.querySelector('[data-cell-target-legend]') as HTMLElement;
    const targetRect = targetKey.getBoundingClientRect();
    return {
      viewportWidth: document.documentElement.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
      stage: { left: stage.left, right: stage.right },
      target: { left: targetRect.left, right: targetRect.right },
      targetScrollWidth: targetKey.scrollWidth,
      targetClientWidth: targetKey.clientWidth,
    };
  });
  expect(layout.pageScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.target.left).toBeGreaterThanOrEqual(layout.stage.left - 1);
  expect(layout.target.right).toBeLessThanOrEqual(layout.stage.right + 1);
  expect(layout.targetScrollWidth).toBeLessThanOrEqual(layout.targetClientWidth + 1);

  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-target-pathogen-mobile.png' : testInfo.outputPath('cell-target-pathogen-mobile.png') });
  }
});


test('mobile play controls, target key, and learning card stay within the stage width', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileState: any = playState();
  mobileState.cell.paused = true;
  await mobileHarness.mount(page, mobileState, undefined, { expectCanvas: false });
  await page.locator('[data-cell-direction-pad]').waitFor({ state: 'visible' });
  const stageHud = page.locator('[data-cell-stage-hud]');
  const hudSummary = stageHud.locator('[data-cell-hud-summary]');
  await expect(stageHud.locator('[data-cell-hud-heading]')).toHaveText('Learning loop \u00B7 2/4');
  await expect(stageHud.locator('[data-cell-hud-heading]')).toHaveAttribute('data-cell-hud-phase', 'control');
  await expect(stageHud.locator('[data-cell-learning-phase-label]')).toHaveText('Control');
  await expect(stageHud.locator('[data-cell-progress-dot]:visible')).toHaveCount(0);
  await expect(stageHud.locator('[data-cell-hud-actions]')).toBeVisible();
  await expect(hudSummary.locator('[data-cell-hud-organism]')).toHaveText('Amoeba');
  await expect(hudSummary.locator('[data-cell-hud-objective]')).toHaveText('Engulf 3 green food particles.');
  await expect(hudSummary.locator('[data-cell-hud-mechanism]')).toHaveText('Pseudopods');
  await expect(hudSummary).toContainText('Control models');
  await expect(page.locator('[data-cell-play-hud]')).toHaveAttribute('aria-label', 'Open Amoeba mission tutorial');
  const fullTargetKey = page.locator('[data-cell-target-key-full]');
  const compactTargetKey = page.locator('[data-cell-target-key-compact]');
  const mobileMissionPath = page.locator('[data-cell-approach-meter]');
  const organismGrid = page.locator('[data-cell-organism-grid]');
  const amoebaControlMap = page.locator('[data-cell-organism-option="amoeba"] [data-cell-card-control-map]');
  const plantControlMap = page.locator('[data-cell-organism-option="plantcell"] [data-cell-card-control-map]');
  const selectedOrganismCard = page.locator('[data-cell-selected-organism-card]');
  const structureSpotlight = selectedOrganismCard.locator('[data-cell-structure-spotlight]');
  const amoebaFocusRows = selectedOrganismCard.locator('[data-cell-mission-focus="true"]');
  const selectedPrimaryAction = selectedOrganismCard.locator('[data-cell-selected-organism-action]');
  const backToOrganisms = selectedOrganismCard.locator('[data-cell-back-to-organisms]');
  const centerPlayer = page.locator('[data-cell-center-player]');
  const centerPlayerLabel = centerPlayer.locator('[data-cell-center-player-label]');
  const tutorialHudLabel = page.locator('[data-cell-play-hud-label]');
  const mobileCanvas = page.locator('[data-cell-sim-canvas]');
  const amoebaChoice = page.locator('[data-cell-organism-option="amoeba"]');
  const parameciumChoice = page.locator('[data-cell-organism-option="paramecium"]');
  await expect(amoebaControlMap).toHaveAttribute('aria-label', 'Amoeba control mapping: Direction input, then Pseudopods extend.');
  await expect(amoebaControlMap.locator('[data-cell-card-control-input]')).toHaveText('Direction input');
  await expect(amoebaControlMap.locator('[data-cell-card-control-response]')).toHaveText('Pseudopods extend');
  await expect(plantControlMap).toHaveAttribute('aria-label', 'Plant Cell control mapping: Select a label, then Structure highlighted.');
  await expect(plantControlMap.locator('[data-cell-card-control-input]')).toHaveText('Select a label');
  await expect(plantControlMap.locator('[data-cell-card-control-response]')).toHaveText('Structure highlighted');
  await expect(selectedOrganismCard).toHaveAttribute('data-cell-selected-organism', 'amoeba');
  await expect(selectedOrganismCard).toHaveAttribute('data-cell-selected-organism-state', 'current');
  await expect(selectedOrganismCard.locator('[data-cell-selected-organism-eyebrow]')).toContainText('Current organism');
  await expect(selectedOrganismCard.locator('[data-cell-learning-link]')).toHaveAttribute('aria-label', 'Amoeba gameplay learning map');
  await expect(structureSpotlight).toHaveAttribute('aria-label', 'Amoeba mission anatomy: Pseudopods, Cell Membrane, Food Vacuole');
  await expect(structureSpotlight.locator('[data-cell-focus-structure]')).toHaveCount(3);
  await expect(structureSpotlight.locator('[data-cell-focus-structure="Pseudopods"]')).toContainText('Pseudopods');
  await expect(structureSpotlight.locator('[data-cell-focus-structure="Cell Membrane"]')).toContainText('Cell Membrane');
  await expect(structureSpotlight.locator('[data-cell-focus-structure="Food Vacuole"]')).toContainText('Food Vacuole');
  await expect(amoebaFocusRows).toHaveCount(3);
  await expect(selectedOrganismCard.locator('[data-cell-anatomy-item="Pseudopods"]')).toHaveAttribute('data-cell-mission-focus', 'true');
  await expect(selectedOrganismCard.locator('[data-cell-anatomy-item="Pseudopods"]')).toContainText('Mission focus');
  const amoebaStructureRow = selectedOrganismCard.locator('[data-cell-anatomy-item="Pseudopods"]');
  await expect(amoebaStructureRow).toHaveAttribute('data-cell-anatomy-jump', 'true');
  await expect(amoebaStructureRow).toHaveAttribute('aria-label', 'Show Pseudopods in the Amoeba live dish. Mission focus structure. Moves focus to the simulation.');
  await expect(amoebaStructureRow).toContainText('Show in live dish');
  await expect(backToOrganisms).toHaveAttribute('aria-label', 'Return to organism choices from Amoeba details');
  await expect(selectedPrimaryAction).toHaveAttribute('aria-label', 'Review Amoeba tutorial');
  await expect(centerPlayer).toHaveAttribute('aria-label', 'Center Amoeba in the live dish');
  await expect(centerPlayerLabel).toBeVisible();
  await expect(tutorialHudLabel).toBeVisible();
  const mobileFirstActionTrace = page.locator('[data-cell-control-loop]');
  await expect(mobileFirstActionTrace).toHaveAttribute('data-cell-first-action-state', 'waiting');
  await expect(mobileFirstActionTrace.locator('[data-cell-control-title]')).toHaveText('1 \u00B7 First action');
  await expect(mobileFirstActionTrace.locator('[data-cell-control-input]')).toHaveText('Press / hold a direction');
  const mobileFirstActionLayout = await mobileFirstActionTrace.evaluate((loop) => {
    const loopRect = loop.getBoundingClientRect();
    const legend = loop.closest('[data-cell-target-legend]') as HTMLElement;
    const legendRect = legend.getBoundingClientRect();
    return {
      loopLeft: loopRect.left, loopRight: loopRect.right,
      legendLeft: legendRect.left, legendRight: legendRect.right,
      scrollWidth: (loop as HTMLElement).scrollWidth, clientWidth: (loop as HTMLElement).clientWidth,
    };
  });
  expect(mobileFirstActionLayout.loopLeft).toBeGreaterThanOrEqual(mobileFirstActionLayout.legendLeft);
  expect(mobileFirstActionLayout.loopRight).toBeLessThanOrEqual(mobileFirstActionLayout.legendRight);
  expect(mobileFirstActionLayout.scrollWidth).toBeLessThanOrEqual(mobileFirstActionLayout.clientWidth + 1);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-first-action-ready-mobile.png' : testInfo.outputPath('cell-first-action-ready-mobile.png') });
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => { const wrap = document.getElementById('wrap'); if (wrap) wrap.style.width = '320px'; });
  await page.waitForFunction(() => document.documentElement.clientWidth === 320);
  await expect(mobileFirstActionTrace).toHaveAttribute('data-cell-first-action-state', 'waiting');
  await expect(mobileFirstActionTrace.locator('[data-cell-first-action-command="true"]')).toBeVisible();
  expect(await page.locator('[data-cell-control-lead]:visible').count()).toBe(0);
  const narrowFirstActionLayout = await mobileFirstActionTrace.evaluate((loop) => ({
    scrollWidth: (loop as HTMLElement).scrollWidth,
    clientWidth: (loop as HTMLElement).clientWidth,
    legendWidth: (loop.closest('[data-cell-target-legend]') as HTMLElement).clientWidth,
  }));
  expect(narrowFirstActionLayout.scrollWidth).toBeLessThanOrEqual(narrowFirstActionLayout.clientWidth + 1);
  expect(narrowFirstActionLayout.clientWidth).toBeLessThanOrEqual(narrowFirstActionLayout.legendWidth);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-first-action-ready-320.png' : testInfo.outputPath('cell-first-action-ready-320.png') });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { const wrap = document.getElementById('wrap'); if (wrap) wrap.style.width = '390px'; });
  await page.waitForFunction(() => document.documentElement.clientWidth === 390);
  await parameciumChoice.click();
  await expect(selectedOrganismCard).toHaveAttribute('data-cell-selected-organism', 'paramecium');
  await expect(selectedOrganismCard).toHaveAttribute('data-cell-selected-organism-state', 'preview');
  await expect(selectedOrganismCard.locator('[data-cell-selected-organism-eyebrow]')).toContainText('Mission preview');
  await expect(selectedPrimaryAction).toHaveAttribute('aria-label', 'Play as Paramecium');
  await expect(selectedPrimaryAction).toBeFocused();
  await expect(backToOrganisms).toHaveAttribute('aria-label', 'Return to organism choices from Paramecium details');
  if (process.env.CELL_VISUAL_QA === '1') {
    await selectedOrganismCard.screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-mission-preview-mobile.png' : testInfo.outputPath('cell-mission-preview-mobile.png') });
  }
  await backToOrganisms.click();
  await expect(parameciumChoice).toBeFocused();
  await amoebaChoice.click();
  await expect(selectedOrganismCard).toHaveAttribute('data-cell-selected-organism', 'amoeba');
  await expect(selectedOrganismCard).toHaveAttribute('data-cell-selected-organism-state', 'current');
  await expect(selectedPrimaryAction).toHaveAttribute('aria-label', 'Review Amoeba tutorial');
  await expect(selectedPrimaryAction).toBeFocused();
  await amoebaStructureRow.click();
  await expect(mobileCanvas).toBeFocused();
  await page.waitForFunction(() => {
    const rect = document.querySelector('[data-cell-stage]')?.getBoundingClientRect();
    return !!rect && rect.top < window.innerHeight && rect.bottom > 0;
  });
  await page.waitForFunction(() => ((window as any).__toolData.cell._cellExt.organellesClicked || []).includes('Pseudopods'));
  await page.waitForFunction(() => !!(document.querySelector('[data-cell-sim-canvas]') as any)?._cellSimGetOrganelleTooltip?.()?.layout?.bounds);
  const anatomyTooltip = await page.evaluate(() => (document.querySelector('[data-cell-sim-canvas]') as any)._cellSimGetOrganelleTooltip());
  expect(anatomyTooltip).toMatchObject({
    organismId: 'amoeba',
    name: 'Pseudopods',
  });
  expect(anatomyTooltip.layout.legendBottom).toBeGreaterThan(0);
  expect(anatomyTooltip.layout.bounds.top).toBeGreaterThanOrEqual(anatomyTooltip.layout.safeTop - 1);
  expect(anatomyTooltip.layout.bounds.top).toBeGreaterThanOrEqual(
    anatomyTooltip.layout.legendBottom + (6 * anatomyTooltip.layout.dpr),
  );
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-anatomy-jump-mobile.png' : testInfo.outputPath('cell-anatomy-jump-mobile.png') });
  }
  await centerPlayer.click();
  await expect(mobileCanvas).toBeFocused();
  expect(await organismGrid.evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length)).toBe(2);
  await expect(fullTargetKey).toBeVisible();
  await expect(fullTargetKey).toContainText('Target key');
  await expect(compactTargetKey).toBeHidden();
  expect(await page.locator('[data-cell-control-lead]:visible').count()).toBe(3);
  await expect(mobileMissionPath).toBeVisible();
  await setMissionScenario(page, { particleOffsets: [[120, 0]], resetRuntime: true });
  await advanceMission(page, 0);
  await setMissionScenario(page, { particleOffsets: [[0, 0]] });
  expect((await advanceMission(page, 0)).successCount).toBe(1);
  await page.locator('[data-cell-evidence-feedback]').waitFor({ state: 'visible' });
  await expect(page.locator('[data-cell-evidence-chain]')).toContainText('Pseudopods \u2192 engulfment');
  await page.locator('[data-cell-mission-cue]').waitFor({ state: 'visible' });
  await expect(page.locator('[data-cell-mission-cue]')).toHaveAttribute('data-cell-cue-layout', 'consolidated');
  await expect(page.locator('[data-cell-evidence-feedback]')).toHaveAttribute('data-cell-evidence-layout', 'consolidated');
  await mobileCanvas.focus();
  await expect(page.locator('[data-cell-target-legend]')).toHaveAttribute('data-cell-target-state', 'recorded');
  await expect(page.locator('[data-cell-target-proximity]')).toHaveAttribute('data-cell-proximity', 'recorded');
  await expect(mobileMissionPath).toHaveAttribute('data-cell-approach-state', 'complete');
  await expect(mobileMissionPath.locator('[data-cell-step-state="complete"]')).toHaveCount(3);
  await expect(mobileMissionPath.locator('[aria-current="step"]')).toHaveCount(0);
  await page.keyboard.down('ArrowRight');
  expect(await page.evaluate(() => (document.querySelector('[data-cell-sim-canvas]') as any)._cellSimGetOrganelleTooltip())).toBeNull();
  await page.waitForFunction(() => (document.querySelector('[data-cell-sim-canvas]') as any)?._cellSimGetControlResponse?.()?.moving === true);
  const mobileControl = await readControlResponse(page);
  expect(mobileControl).toMatchObject({
    evidenceActive: true,
    evidenceCount: 1,
    evidenceLabel: 'Pseudopods \u2192 engulfment',
    compactControlFocus: false,
    anatomyLabelCount: 3,
    mechanismVisual: 'pseudopod',
    mechanismVisualActive: true,
    mechanismVisualEvidence: true,
  });
  const mobileTrace = page.locator('[data-cell-control-loop]');
  await expect(mobileTrace).toHaveAttribute('data-cell-control-phase', 'evidence');
  await expect(mobileTrace.locator('[data-cell-control-input]')).toHaveText('Food contact');
  await expect(mobileTrace.locator('[data-cell-control-mechanism]')).toHaveText('Pseudopods');
  await expect(mobileTrace.locator('[data-cell-control-observation]')).toHaveText('engulfment');
  await expect(mobileTrace).toHaveAttribute('aria-label', /Observed action: Food contact.*Biological mechanism: Pseudopods.*Evidence: engulfment.*Evidence 1 of 3/);
  await expect(page.locator('[data-cell-direction-pad]')).toHaveAttribute('data-cell-active-direction', 'right');
  await expect(page.locator('[data-cell-move="ArrowRight"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-cell-move="ArrowRight"]')).toHaveAttribute('data-cell-move-active', 'true');
  await expect(page.locator('[data-cell-pad-readout]')).toHaveAttribute('data-cell-pad-state', 'active');
  await expect(page.locator('[data-cell-pad-readout]')).toHaveText(/rightInput/i);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-evidence-pulse-mobile.png' : testInfo.outputPath('cell-evidence-pulse-mobile.png') });
  }
  expect(mobileControl.tagBounds.left).toBeGreaterThanOrEqual(mobileControl.canvasBounds.left);
  expect(mobileControl.tagBounds.right).toBeLessThanOrEqual(mobileControl.canvasBounds.right);
  expect(mobileControl.tagBounds.top).toBeGreaterThanOrEqual(mobileControl.canvasBounds.top);
  expect(mobileControl.tagBounds.bottom).toBeLessThanOrEqual(mobileControl.canvasBounds.bottom);
  const mobileTagPlacement = await page.evaluate((response) => {
    const canvas = document.querySelector('[data-cell-sim-canvas]') as HTMLCanvasElement;
    const canvasRect = canvas.getBoundingClientRect();
    const legendRect = document.querySelector('[data-cell-target-legend]')!.getBoundingClientRect();
    const padRect = document.querySelector('[data-cell-direction-pad]')!.getBoundingClientRect();
    const scaleY = canvas.height / canvasRect.height;
    return {
      tagTop: canvasRect.top + response.tagBounds.top / scaleY,
      tagBottom: canvasRect.top + response.tagBounds.bottom / scaleY,
      legendBottom: legendRect.bottom,
      padTop: padRect.top,
    };
  }, mobileControl);
  expect(mobileTagPlacement.tagTop).toBeGreaterThanOrEqual(mobileTagPlacement.legendBottom + 4);
  expect(mobileTagPlacement.tagBottom).toBeLessThanOrEqual(mobileTagPlacement.padTop - 4);

  const bounds = await page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } : null;
    };
    return {
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      stage: box('[data-cell-stage]'),
      stageHud: box('[data-cell-stage-hud]'),
      hudHeading: box('[data-cell-hud-heading]'),
      hudActions: box('[data-cell-hud-actions]'),
      hudSummary: box('[data-cell-hud-summary]'),
      legend: box('[data-cell-target-legend]'),
      controlLoop: box('[data-cell-control-loop]'),
      feedback: box('[data-cell-evidence-feedback]'),
      cue: box('[data-cell-mission-cue]'),
      pad: box('[data-cell-direction-pad]'),
      checkpoint: box('[data-cell-mission-checkpoint]'),
      nextStep: box('[data-cell-next-step]'),
      chooser: box('[data-cell-organism-chooser]'),
      firstOption: box('[data-cell-organism-option="amoeba"]'),
      selectedCard: box('[data-cell-selected-organism-card]'),
      spotlight: box('[data-cell-structure-spotlight]'),
      focusRow: box('[data-cell-anatomy-item="Pseudopods"]'),
    };
  });
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.viewportWidth + 1);
  for (const item of [bounds.stageHud, bounds.hudSummary, bounds.legend, bounds.controlLoop, bounds.cue, bounds.feedback, bounds.pad]) {
    expect(item).not.toBeNull();
    expect(item!.left).toBeGreaterThanOrEqual(bounds.stage!.left - 1);
    expect(item!.right).toBeLessThanOrEqual(bounds.stage!.right + 1);
  }
  expect(bounds.hudSummary!.top).toBeGreaterThanOrEqual(Math.max(bounds.hudHeading!.bottom, bounds.hudActions!.bottom) - 1);
  expect(bounds.stageHud!.bottom).toBeLessThanOrEqual(bounds.legend!.top - 4);
  expect(bounds.cue!.top).toBeGreaterThan(bounds.feedback!.top);
  expect(bounds.cue!.bottom).toBeLessThanOrEqual(bounds.feedback!.bottom + 1);
  expect(bounds.checkpoint!.left).toBeGreaterThanOrEqual(0);
  expect(bounds.checkpoint!.right).toBeLessThanOrEqual(bounds.viewportWidth + 1);
  for (const item of [bounds.nextStep, bounds.chooser, bounds.firstOption, bounds.selectedCard, bounds.spotlight, bounds.focusRow]) {
    expect(item).not.toBeNull();
    expect(item!.left).toBeGreaterThanOrEqual(0);
    expect(item!.right).toBeLessThanOrEqual(bounds.viewportWidth + 1);
  }
  await expect(page.locator('[data-cell-next-step]')).toContainText('Continue Amoeba \u00B7 1/3 evidence');
  expect(bounds.feedback!.bottom).toBeLessThanOrEqual(bounds.stage!.bottom + 1);
  await expect(page.getByText('Zoom 40x', { exact: true })).toBeHidden();
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => { const wrap = document.getElementById('wrap'); if (wrap) wrap.style.width = '320px'; });
  await page.waitForFunction(() => document.documentElement.clientWidth === 320);
  await expect(compactTargetKey).toBeVisible();
  await expect(compactTargetKey).toHaveText('FOOD target | Green circle');
  await expect(fullTargetKey).toBeHidden();
  expect(await page.locator('[data-cell-control-lead]:visible').count()).toBe(0);
  await expect(mobileMissionPath).toBeHidden();
  await expect(centerPlayerLabel).toBeHidden();
  await expect(tutorialHudLabel).toBeHidden();
  expect(await organismGrid.evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length)).toBe(1);
  const narrowSelectedBounds = await page.evaluate(() => [
    '[data-cell-selected-organism-card]',
    '[data-cell-structure-spotlight]',
    '[data-cell-anatomy-item="Pseudopods"]',
  ].map((selector) => {
    const rect = document.querySelector(selector)!.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewportWidth: document.documentElement.clientWidth };
  }));
  for (const item of narrowSelectedBounds) {
    expect(item.left).toBeGreaterThanOrEqual(0);
    expect(item.right).toBeLessThanOrEqual(item.viewportWidth + 1);
  }
  const narrowChooserLayout = await page.evaluate(() => {
    const grid = document.querySelector('[data-cell-organism-grid]') as HTMLElement;
    const firstCard = grid.querySelector('[data-cell-organism-option]') as HTMLElement;
    const map = firstCard.querySelector('[data-cell-card-control-map]') as HTMLElement;
    const gridRect = grid.getBoundingClientRect();
    const cardRect = firstCard.getBoundingClientRect();
    const mapRect = map.getBoundingClientRect();
    return {
      grid: { left: gridRect.left, right: gridRect.right },
      card: { left: cardRect.left, right: cardRect.right },
      map: { left: mapRect.left, right: mapRect.right },
      pageScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    };
  });
  expect(narrowChooserLayout.pageScrollWidth).toBeLessThanOrEqual(narrowChooserLayout.viewportWidth + 1);
  expect(narrowChooserLayout.card.left).toBeGreaterThanOrEqual(narrowChooserLayout.grid.left - 1);
  expect(narrowChooserLayout.card.right).toBeLessThanOrEqual(narrowChooserLayout.grid.right + 1);
  expect(narrowChooserLayout.map.left).toBeGreaterThanOrEqual(narrowChooserLayout.card.left - 1);
  expect(narrowChooserLayout.map.right).toBeLessThanOrEqual(narrowChooserLayout.card.right + 1);
  const narrowControl = await readControlResponse(page);
  expect(narrowControl).toMatchObject({
    compactControlFocus: true,
    anatomyLabelCount: 0,
  });
  const narrowLayout = await page.evaluate((response) => {
    const canvas = document.querySelector('[data-cell-sim-canvas]') as HTMLCanvasElement;
    const canvasRect = canvas.getBoundingClientRect();
    const stageRect = document.querySelector('[data-cell-stage]')!.getBoundingClientRect();
    const hudRect = document.querySelector('[data-cell-stage-hud]')!.getBoundingClientRect();
    const hudHeadingRect = document.querySelector('[data-cell-hud-heading]')!.getBoundingClientRect();
    const hudActionsRect = document.querySelector('[data-cell-hud-actions]')!.getBoundingClientRect();
    const hudSummaryRect = document.querySelector('[data-cell-hud-summary]')!.getBoundingClientRect();
    const legendRect = document.querySelector('[data-cell-target-legend]')!.getBoundingClientRect();
    const traceRect = document.querySelector('[data-cell-control-loop]')!.getBoundingClientRect();
    const padRect = document.querySelector('[data-cell-direction-pad]')!.getBoundingClientRect();
    const scaleY = canvas.height / canvasRect.height;
    return {
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      stageLeft: stageRect.left,
      stageRight: stageRect.right,
      hudLeft: hudRect.left,
      hudRight: hudRect.right,
      hudBottom: hudRect.bottom,
      hudFirstRowBottom: Math.max(hudHeadingRect.bottom, hudActionsRect.bottom),
      hudSummaryLeft: hudSummaryRect.left,
      hudSummaryRight: hudSummaryRect.right,
      hudSummaryTop: hudSummaryRect.top,
      legendLeft: legendRect.left,
      legendRight: legendRect.right,
      legendTop: legendRect.top,
      legendBottom: legendRect.bottom,
      legendHeight: legendRect.height,
      openCanvasBand: padRect.top - legendRect.bottom,
      traceLeft: traceRect.left,
      traceRight: traceRect.right,
      padTop: padRect.top,
      tagTop: canvasRect.top + response.tagBounds.top / scaleY,
      tagBottom: canvasRect.top + response.tagBounds.bottom / scaleY,
    };
  }, narrowControl);
  expect(narrowLayout.scrollWidth).toBeLessThanOrEqual(narrowLayout.viewportWidth + 1);
  for (const edge of [narrowLayout.hudLeft, narrowLayout.hudSummaryLeft, narrowLayout.legendLeft, narrowLayout.traceLeft]) expect(edge).toBeGreaterThanOrEqual(narrowLayout.stageLeft - 1);
  for (const edge of [narrowLayout.hudRight, narrowLayout.hudSummaryRight, narrowLayout.legendRight, narrowLayout.traceRight]) expect(edge).toBeLessThanOrEqual(narrowLayout.stageRight + 1);
  expect(narrowLayout.hudSummaryTop).toBeGreaterThanOrEqual(narrowLayout.hudFirstRowBottom - 1);
  expect(narrowLayout.hudBottom).toBeLessThanOrEqual(narrowLayout.legendTop - 4);
  expect(narrowLayout.legendHeight).toBeLessThanOrEqual(265);
  expect(narrowLayout.openCanvasBand).toBeGreaterThanOrEqual(100);
  expect(narrowLayout.legendBottom).toBeLessThanOrEqual(narrowLayout.tagTop - 4);
  expect(narrowLayout.tagBottom).toBeLessThanOrEqual(narrowLayout.padTop - 4);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-evidence-pulse-320.png' : testInfo.outputPath('cell-evidence-pulse-320.png') });
    await page.locator('[data-cell-organism-chooser]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-organism-chooser-320.png' : testInfo.outputPath('cell-organism-chooser-320.png') });
    await selectedOrganismCard.screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-selected-organism-320.png' : testInfo.outputPath('cell-selected-organism-320.png') });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { const wrap = document.getElementById('wrap'); if (wrap) wrap.style.width = '390px'; });
  await page.waitForFunction(() => document.documentElement.clientWidth === 390);
  await expect(centerPlayerLabel).toBeVisible();
  await expect(tutorialHudLabel).toBeVisible();
  const mobileRoadmap = page.locator('[data-cell-mission-checkpoint]');
  const mobileObserveCheckpoint = mobileRoadmap.locator('[data-cell-checkpoint-step="observe"]');
  await expect(mobileRoadmap.locator('[data-cell-checkpoint-step]')).toHaveCount(3);
  await expect(mobileRoadmap.locator('[data-cell-checkpoint-state="current"]')).toHaveCount(1);
  await expect(mobileObserveCheckpoint).toHaveAttribute('data-cell-checkpoint-state', 'current');
  await expect(mobileObserveCheckpoint).toHaveAttribute('aria-current', 'step');
  await expect(mobileObserveCheckpoint.locator('[data-cell-checkpoint-status="observe"]')).toHaveText('Now \u00B7 1/3');
  const mobileRoadmapBounds = await page.evaluate(() => Array.from(document.querySelectorAll('[data-cell-mission-checkpoint] [data-cell-checkpoint-step]')).map((node) => {
    const card = node as HTMLElement;
    const status = card.querySelector('[data-cell-checkpoint-status]') as HTMLElement;
    const cardRect = card.getBoundingClientRect();
    const statusRect = status.getBoundingClientRect();
    return {
      cardLeft: cardRect.left,
      cardRight: cardRect.right,
      statusLeft: statusRect.left,
      statusRight: statusRect.right,
      scrollWidth: card.scrollWidth,
      clientWidth: card.clientWidth,
    };
  }));
  for (const card of mobileRoadmapBounds) {
    expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
    expect(card.statusLeft).toBeGreaterThanOrEqual(card.cardLeft - 1);
    expect(card.statusRight).toBeLessThanOrEqual(card.cardRight + 1);
  }

  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-play-stage-mobile.png' : testInfo.outputPath('cell-play-stage-mobile.png') });
    await page.locator('[data-cell-mission-checkpoint]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-mission-card-mobile.png' : testInfo.outputPath('cell-mission-card-mobile.png') });
    await page.locator('[data-cell-organism-chooser]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-organism-chooser-mobile.png' : testInfo.outputPath('cell-organism-chooser-mobile.png') });
    await selectedOrganismCard.screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-selected-organism-mobile.png' : testInfo.outputPath('cell-selected-organism-mobile.png') });
  }

  await page.keyboard.up('ArrowRight');
  await expect(page.locator('[data-cell-direction-pad]')).toHaveAttribute('data-cell-active-direction', 'idle');
  await expect(page.locator('[data-cell-move="ArrowRight"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-cell-pad-readout]')).toHaveAttribute('data-cell-pad-state', 'ready');
  await page.evaluate(() => {
    const state = (window as any).__toolData.cell;
    state._cellExt.successByOrganism.amoeba = 12;
    state.playMission = { organismId: 'amoeba', startSuccess: 9 };
    state.playFeedback = null;
    (window as any).__rerender();
  });
  await page.locator('[data-cell-explanation-check]').waitFor({ state: 'visible' });
  const mobileExplainHandoff = page.locator('[data-cell-explain-handoff]');
  await expect(mobileExplainHandoff).toBeVisible();
  await expect(mobileExplainHandoff).toHaveAttribute('aria-label', 'Learning step 4 of 4, Explain. Evidence 3 of 3. Open Amoeba evidence explanation.');
  await expect(mobileExplainHandoff).toHaveAttribute('data-cell-learning-phase', 'explain');
  await expect(page.locator('[data-cell-hud-heading]')).toHaveAttribute('data-cell-hud-phase', 'explain');
  await expect(page.locator('[data-cell-hud-heading]')).toHaveText('Learning loop \u00B7 4/4');
  await expect(page.locator('[data-cell-evidence-to-explain]')).toContainText('3/3 observations');
  await expect(page.locator('[data-cell-evidence-to-explain]')).toContainText('Choose Explain 3/3 above');
  await expect(page.locator('[data-cell-target-legend]')).toHaveAttribute('data-cell-target-state', 'complete');
  await expect(page.locator('[data-cell-sim-canvas]')).toHaveAttribute('data-cell-sim-state', 'explain');
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-cell-sim-canvas]') as any;
    return !!canvas
      && canvas._cellSimGetTargetGuide?.() === null
      && canvas._cellSimGetControlResponse?.() === null;
  });
  await expect(page.locator('[data-cell-mission-cue]')).toHaveCount(0);
  await expect(page.locator('[data-cell-control-loop]')).toHaveCount(0);
  await expect(page.locator('[data-cell-direction-pad]')).toHaveCount(0);
  const mobileHandoffBounds = await page.evaluate(() => {
    const handoff = document.querySelector('[data-cell-explain-handoff]')!.getBoundingClientRect();
    const hud = document.querySelector('[data-cell-stage-hud]')!.getBoundingClientRect();
    return { handoff: { left: handoff.left, right: handoff.right }, hud: { left: hud.left, right: hud.right }, viewportWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(mobileHandoffBounds.scrollWidth).toBeLessThanOrEqual(mobileHandoffBounds.viewportWidth + 1);
  expect(mobileHandoffBounds.handoff.left).toBeGreaterThanOrEqual(mobileHandoffBounds.hud.left - 1);
  expect(mobileHandoffBounds.handoff.right).toBeLessThanOrEqual(mobileHandoffBounds.hud.right + 1);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-explain-handoff-mobile.png' : testInfo.outputPath('cell-explain-handoff-mobile.png') });
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => { const wrap = document.getElementById('wrap'); if (wrap) wrap.style.width = '320px'; });
  await page.waitForFunction(() => document.documentElement.clientWidth === 320);
  await expect(mobileExplainHandoff).toBeVisible();
  const narrowHandoffBounds = await page.evaluate(() => {
    const handoff = document.querySelector('[data-cell-explain-handoff]')!.getBoundingClientRect();
    const hud = document.querySelector('[data-cell-stage-hud]')!.getBoundingClientRect();
    return {
      handoff: { left: handoff.left, right: handoff.right, top: handoff.top, bottom: handoff.bottom },
      hud: { left: hud.left, right: hud.right, top: hud.top, bottom: hud.bottom },
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(narrowHandoffBounds.scrollWidth).toBeLessThanOrEqual(narrowHandoffBounds.viewportWidth + 1);
  expect(narrowHandoffBounds.handoff.left).toBeGreaterThanOrEqual(narrowHandoffBounds.hud.left - 1);
  expect(narrowHandoffBounds.handoff.right).toBeLessThanOrEqual(narrowHandoffBounds.hud.right + 1);
  expect(narrowHandoffBounds.handoff.top).toBeGreaterThanOrEqual(narrowHandoffBounds.hud.top - 1);
  expect(narrowHandoffBounds.handoff.bottom).toBeLessThanOrEqual(narrowHandoffBounds.hud.bottom + 1);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-explain-handoff-320.png' : testInfo.outputPath('cell-explain-handoff-320.png') });
  }
  await mobileExplainHandoff.click();
  await expect(page.getByRole('button', { name: /^Explanation A: Pseudopods reshape/ })).toBeFocused();
  const explanationBounds = await page.evaluate(() => {
    const check = document.querySelector('[data-cell-explanation-check]')!.getBoundingClientRect();
    return { left: check.left, right: check.right, viewportWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(explanationBounds.scrollWidth).toBeLessThanOrEqual(explanationBounds.viewportWidth + 1);
  expect(explanationBounds.left).toBeGreaterThanOrEqual(0);
  expect(explanationBounds.right).toBeLessThanOrEqual(explanationBounds.viewportWidth + 1);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-mission-checkpoint]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-explanation-check-mobile.png' : testInfo.outputPath('cell-explanation-check-mobile.png') });
  }
  await page.getByRole('button', { name: /^Explanation A: Pseudopods reshape/ }).click();
  await page.locator('[data-cell-strategy-contrast]').waitFor({ state: 'visible' });
  await expect(page.locator('[data-cell-target-legend]')).toHaveAttribute('data-cell-target-state', 'mastered');
  await expect(page.locator('[data-cell-target-proximity]')).toContainText('LOOP COMPLETE');
  await expect(page.locator('[data-cell-sim-canvas]')).toHaveAttribute('data-cell-sim-state', 'complete');
  await expect(page.locator('[data-cell-progress-dot]:visible')).toHaveCount(0);
  const completeHudBounds = await page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } : null;
    };
    return {
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      hud: box('[data-cell-stage-hud]'),
      actions: box('[data-cell-hud-actions]'),
      progress: box('[data-cell-mission-progress]'),
      tutorial: box('[data-cell-play-hud]'),
      center: box('[data-cell-center-player]'),
    };
  });
  expect(completeHudBounds.scrollWidth).toBeLessThanOrEqual(completeHudBounds.viewportWidth + 1);
  expect(completeHudBounds.hud).not.toBeNull();
  for (const item of [completeHudBounds.actions, completeHudBounds.progress, completeHudBounds.tutorial, completeHudBounds.center]) {
    expect(item).not.toBeNull();
    expect(item!.left).toBeGreaterThanOrEqual(completeHudBounds.hud!.left - 1);
    expect(item!.right).toBeLessThanOrEqual(completeHudBounds.hud!.right + 1);
  }
  const completedBounds = await page.evaluate(() => {
    const contrast = document.querySelector('[data-cell-strategy-contrast]')!.getBoundingClientRect();
    return { left: contrast.left, right: contrast.right, viewportWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(completedBounds.scrollWidth).toBeLessThanOrEqual(completedBounds.viewportWidth + 1);
  expect(completedBounds.left).toBeGreaterThanOrEqual(0);
  expect(completedBounds.right).toBeLessThanOrEqual(completedBounds.viewportWidth + 1);
  if (process.env.CELL_VISUAL_QA === '1') {
    await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-loop-complete-320.png' : testInfo.outputPath('cell-loop-complete-320.png') });
    await page.locator('[data-cell-mission-checkpoint]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-mission-card-mobile-complete.png' : testInfo.outputPath('cell-mission-card-mobile-complete.png') });
  }
});
