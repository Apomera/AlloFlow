import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true,
  width: 1080, height: 900,
});

test.describe.configure({ timeout: 120000, retries: 0 });
test.use({ viewport: { width: 1080, height: 900 }, reducedMotion: 'reduce', video: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('restarts Run B and collapse replay with the complete retained Run A recipe', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness');
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    const runA = { ...BH.bhCreateNewColonyState(1111, 1, 15), day: 12,
      subspecies: 'russian', apiarySite: 'forest_edge' };
    const plan = {
      plannedActionId: 'plant_wildflowers', predictedMetricId: 'honey', predictedDirection: 'higher',
      question: 'Does extra forage change stores?', hypothesis: 'Extra forage may increase stores.',
      changedVariable: 'Add wildflowers on Day 4.', prediction: 'Compare honey at Day 12.',
    };
    w.__mount({ beehive: { ...BH.bhCreateNewColonyState(2222, 2, 0),
      subspecies: 'italian', apiarySite: 'meadow', viewMode: 'beekeeper',
      tutorialDone: true, motionPaused: true, soundOn: false,
      experimentBaseline: BH.bhCreateExperimentSnapshot(runA),
      notebook: { synthesis: 'Keep my existing notes.', experiment: plan },
    }, otherTool: { retained: 'untouched' } });
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });

  const restart = page.locator('[data-experiment-restart-run-b]');
  await expect(restart).toBeVisible();
  await restart.focus(); await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.beehive.simulationSeed)).toBe(1111);
  const started = await page.evaluate(() => (window as any).__toolData.beehive);
  expect(started).toMatchObject({ day: 0, randomState: 1111, experimentRunSerial: 3,
    subspecies: 'russian', apiarySite: 'forest_edge',
    experimentEnvironment: { gardenBonus: 15, trackedFromDay: 0 },
    notebook: { synthesis: 'Keep my existing notes.', experiment: { registeredPlan: { complete: true } } },
  });
  expect(started.experimentBaseline.simulationSeed).toBe(1111);

  await page.evaluate(() => {
    const w = window as any;
    w.__ctx.setLabToolData((prev: any) => ({ ...prev, beehive: { ...prev.beehive,
      day: 9, workers: 400, colonySurvived: false, simulationSeed: 3333, randomState: 3333,
      subspecies: 'italian', apiarySite: 'meadow',
      experimentEnvironment: { schemaVersion: 1, gardenBonus: 0, trackedFromDay: 0 },
    } }));
  });
  const replay = page.locator('[data-beehive-restart="same-seed"]');
  await expect(replay).toBeVisible();
  await expect(replay).toHaveAccessibleName(/1111/);
  await replay.focus(); await page.keyboard.press('Space');
  const replayed = await page.evaluate(() => (window as any).__toolData);
  expect(replayed.beehive).toMatchObject({ day: 0, workers: 10000, colonySurvived: true,
    simulationSeed: 1111, randomState: 1111, experimentRunSerial: 4,
    subspecies: 'russian', apiarySite: 'forest_edge',
    experimentEnvironment: { gardenBonus: 15, trackedFromDay: 0 },
  });
  expect(replayed.beehive.experimentBaseline).toEqual(started.experimentBaseline);
  expect(replayed.beehive.notebook.synthesis).toBe('Keep my existing notes.');
  expect(replayed.otherTool).toEqual({ retained: 'untouched' });
  expect(errors).toEqual([]);
});
