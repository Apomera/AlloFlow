import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true });
const reportDir = process.env.ECOLOGY_REPORT_DIR || 'reports/ecosystem-neighbor-nose-evidence';
test.describe.configure({ timeout: 420_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
async function assertClean(page: Page) {
  expect(await page.evaluate(() => (window as any).__events?.errors || []), 'the actual evidence challenge has no uncaught errors').toEqual([]);
}
test.afterEach(async ({ page }) => { await assertClean(page); await harness.destroy(page); });

async function mount(page: Page, foodWeb?: any) {
  await page.setViewportSize({ width: 1140, height: 1050 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true, ...(foodWeb ? { foodWeb } : {}) } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    document.body.className = 'theme-default';
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white';
  });
}

async function rendererReady(page: Page) {
  const ready = await page.waitForFunction(() => {
    const region = document.querySelector('[data-efw-meadow]'), hit = (window as any).__glCanvas?.('[data-efw-meadow]');
    if (hit?.rec?.scene && hit.rec.draws > 0 && region?.querySelector('canvas')?.hasAttribute('data-representative-index')) return 'ready';
    return region?.textContent?.includes('3D is unavailable on this device.') ? 'unavailable' : false;
  }, undefined, { timeout: 60_000 });
  expect(await ready.jsonValue(), 'the original encounter inspections use the actual drawn renderer').toBe('ready');
}

test('an actual neighbor encounter preserves first and revised evidence sources through scene inspection, save guards, export, reduced mobile reopening and historical review', async ({ page }) => {
  await mount(page);
  const prediction = 'I will distinguish a recorded animal action, information about a model rule, and an unsupported conclusion.';
  await page.getByRole('button', { name: 'Rabbit neighbors', exact: true }).click();
  await page.getByLabel('Your prediction (optional)', { exact: true }).fill(prediction);
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  const meadow = page.locator('[data-efw-meadow]');
  if (!(await meadow.isVisible())) await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  await rendererReady(page);
  const canvas = meadow.locator('canvas'), timeline = meadow.getByLabel('Meadow timeline', { exact: true });
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  const recorded = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config;
    const frames = api.behaviorTimeline(config, api.compare(config).baseline), encounter = api.encounters(frames, config).find((item: any) => item.kind === 'spacing');
    if (!encounter) return null;
    const trial = api.inferenceTrial(frames, encounter, 'baseline'), claims = api.inferenceClaims(trial), steps = [encounter.before, encounter.step, encounter.after];
    return { encounter, trial, claims, codes: claims.map((claim: any) => claim.category), steps, measurement: api.pairEvidence(frames, encounter, steps) };
  });
  expect(recorded, 'Rabbit neighbors supplies a real sustained Feeding neighbors encounter').toBeTruthy();
  expect(recorded!.trial).toBeTruthy(); expect(recorded!.measurement).toBeTruthy();
  expect(recorded!.trial.samples.every((sample: any) => sample.actor.active && sample.cue.active), 'the chosen original pair is present at all three UI inspection checkpoints').toBe(true);
  const fieldwork = meadow.locator('[data-efw-fieldwork]'), challenge = fieldwork.locator('[data-efw-inference]');
  const guide = page.locator('[data-efw-field-missions]'), progress = guide.locator('[data-efw-mission-progress]');
  const save = fieldwork.getByRole('button', { name: 'Save wildlife observation', exact: true });
  await expect(progress).toHaveText('Evidence saved for 0 of 3 missions.');
  const encounterButton = fieldwork.locator('[data-efw-encounter="spacing"]');
  await expect(encounterButton).toContainText('Feeding neighbors'); await encounterButton.click();
  await fieldwork.getByLabel('Wildlife prediction', { exact: true }).selectOption('avoid');
  await fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true }).click();
  await expect(challenge).not.toHaveAttribute('open', '');
  await challenge.locator('summary').press('Enter');
  await expect(challenge).toHaveAttribute('open', '');
  await expect(challenge.locator('[data-efw-inference-card]')).toHaveCount(4);
  await expect(fieldwork).toContainText('The optional evidence challenge has not been submitted and will not be included in this observation.');
  await expect(save).toBeEnabled();
  const wrong = recorded!.codes.map((code: string) => code === 'scene' ? 'unsupported' : 'scene');
  const initialCheck = challenge.getByRole('button', { name: 'Check evidence sources', exact: true });
  for (let k = 0; k < 4; k++) await challenge.getByLabel(`Evidence statement ${k + 1} source`, { exact: true }).selectOption(wrong[k]);
  await expect(initialCheck).toBeDisabled();
  for (let k = 0; k < 3; k++) {
    await challenge.getByRole('button', { name: `Inspect evidence checkpoint ${k + 1}`, exact: true }).press('Enter');
    await expect(timeline).toHaveValue(String(recorded!.steps[k]));
    await expect(canvas).toHaveAttribute('data-selected-species', recorded!.encounter.actor.id);
    await expect(canvas).toHaveAttribute('data-representative-index', String(recorded!.encounter.actor.index));
    await expect(canvas).toHaveAttribute('data-step', String(recorded!.steps[k]));
    const dock = meadow.locator('[data-efw-observation-dock]');
    const back = dock.getByRole('button', { name: 'Return to evidence sources', exact: true });
    await expect(back).toBeFocused(); await back.press('Enter');
    await expect(challenge.getByLabel('Evidence statement 1 source', { exact: true })).toBeFocused();
    const visited = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork.inference.visited);
    expect(visited).toEqual(recorded!.steps.slice(0, k + 1));
    if (k < 2) await expect(initialCheck).toBeDisabled();
  }
  await expect(initialCheck).toBeEnabled(); await initialCheck.click();
  const feedback = challenge.locator('[data-efw-inference-feedback]');
  await expect(feedback).toContainText('0 of 4 current sources match');
  await expect(feedback).toContainText('First submission: 0 of 4 matched.');
  await expect(progress).toHaveText('Evidence saved for 0 of 3 missions.');
  await challenge.getByLabel('Evidence statement 1 source', { exact: true }).selectOption(recorded!.codes[0]);
  await expect(save).toBeDisabled();
  await expect(fieldwork).toContainText('Recheck the revised evidence sources before saving this observation.');
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork.inference.firstCodes)).toEqual(wrong);
  for (let k = 0; k < 4; k++) await challenge.getByLabel(`Evidence statement ${k + 1} source`, { exact: true }).selectOption(recorded!.codes[k]);
  await challenge.getByRole('button', { name: 'Check revised evidence sources', exact: true }).click();
  await expect(feedback).toContainText('4 of 4 current sources match');
  await expect(feedback).toContainText('First submission: 0 of 4 matched.');
  await expect(save).toBeEnabled();
  const reflection = 'The original checkpoints show recorded actions. The spacing cue comes from the model rule; a lasting dominance hierarchy is not established.';
  await challenge.getByLabel('Evidence and inference reflection', { exact: true }).fill(reflection);
  await fieldwork.getByLabel('Wildlife explanation', { exact: true }).fill('I compared this fixed pair before, during and after giving space.');
  await fieldwork.getByLabel('Wildlife model limit', { exact: true }).fill('These observations do not establish dominance, food intake, capture, or changed biomass.');
  await challenge.screenshot({ path: `${reportDir}/evidence-inference-desktop.jpg`, type: 'jpeg', quality: 92 });
  await save.click();
  const firstNote = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[0]);
  const firstJSON = JSON.stringify(firstNote), firstRecord = firstNote.sighting.inference;
  expect(firstRecord).toEqual({ version: 1, trial: recorded!.trial, visited: recorded!.steps, codes: recorded!.codes, firstCodes: wrong, reflection });
  expect(firstNote.sighting.forecast).toBe('avoid'); expect(firstNote.sighting.runPrediction).toBe(prediction);
  expect(firstNote.sighting.measurement).toBeUndefined(); expect(firstNote.sighting.headline).toBeUndefined();
  await expect(progress).toHaveText('Evidence saved for 0 of 3 missions.');
  const notebook = page.locator('[data-efw-notebook]'), firstCard = notebook.locator(`[data-efw-note="${firstNote.id}"]`);
  const firstSaved = firstCard.locator('[data-efw-note-inference]');
  await firstSaved.locator('summary').click();
  await expect(firstSaved).toContainText('First classification: 0 of 4 matched; latest classification: 4 of 4 matched.');
  await expect(firstSaved).toContainText(reflection);
  await expect(firstSaved).toContainText('lasting dominance hierarchy');
  const downloadPromise = page.waitForEvent('download'); await notebook.getByRole('button', { name: 'Export field notebook', exact: true }).click();
  const download = await downloadPromise; expect(download.suggestedFilename()).toBe('ecosystem-field-notebook.txt');
  const exported = await readFile((await download.path())!, 'utf8'), prefix = 'Frozen evidence / inference trial (JSON): ';
  const frozen = exported.split('\n').find(line => line.startsWith(prefix));
  expect(frozen, 'the actual downloaded notebook preserves the portable original challenge').toBeTruthy();
  expect(JSON.parse(frozen!.slice(prefix.length))).toEqual(firstRecord); expect(exported).toContain(prediction); expect(exported).toContain('First source:'); expect(exported).toContain('Latest source:');
  // A new run clears working answers. Reopening uses the genuine saved note,
  // restoring a detached draft only when all original evidence still matches.
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork)).toBeNull();
  await notebook.getByRole('button', { name: `Reopen observation ${firstNote.id}`, exact: true }).click();
  await expect(challenge).toHaveAttribute('open', '');
  for (let k = 0; k < 4; k++) await expect(challenge.getByLabel(`Evidence statement ${k + 1} source`, { exact: true })).toHaveValue(recorded!.codes[k]);
  await expect(challenge.getByLabel('Evidence and inference reflection', { exact: true })).toHaveValue(reflection);
  const restored = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork.inference);
  expect(restored).toMatchObject({ trial: firstRecord.trial, codes: firstRecord.codes, firstCodes: wrong, visited: recorded!.steps, checked: true });
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(firstJSON);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 390, height: 844 });
  await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
  await expect(challenge.locator('[data-efw-inference-reduced]')).toBeVisible();
  const mobileCodes = recorded!.codes.slice(); mobileCodes[0] = wrong[0];
  await challenge.getByLabel('Evidence statement 1 source', { exact: true }).selectOption(mobileCodes[0]);
  await expect(save).toBeDisabled();
  await expect(fieldwork).toContainText('Recheck the revised evidence sources before saving this observation.');
  for (let k = 0; k < 3; k++) {
    await challenge.getByRole('button', { name: `Inspect evidence checkpoint ${k + 1}`, exact: true }).press('Enter');
    await expect(timeline).toHaveValue(String(recorded!.steps[k]));
    await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
    await expect(challenge.locator('[data-efw-inference-evidence]')).toContainText(recorded!.trial.samples[k].actor.state);
  }
  await challenge.getByRole('button', { name: 'Check revised evidence sources', exact: true }).click();
  await expect(feedback).toContainText('3 of 4 current sources match'); await expect(feedback).toContainText('First submission: 0 of 4 matched.');
  const mobileReflection = 'I reopened the original checkpoints on a still scene and revised one source judgment. The first note remains unchanged.';
  await challenge.getByLabel('Evidence and inference reflection', { exact: true }).fill(mobileReflection);
  await expect(save).toBeEnabled(); await expect(progress).toHaveText('Evidence saved for 0 of 3 missions.');
  await challenge.screenshot({ path: `${reportDir}/evidence-inference-mobile-reduced.jpg`, type: 'jpeg', quality: 92 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const cardBoxes = await challenge.locator('[data-efw-inference-card]').evaluateAll(cards => cards.map(card => { const r = card.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }));
  for (let k = 1; k < cardBoxes.length; k++) expect(cardBoxes[k].top).toBeGreaterThanOrEqual(cardBoxes[k - 1].bottom);
  // Genuine additional ruler work makes this second note eligible for the
  // measurement mission. Classification on its own has remained at zero.
  const ruler = fieldwork.locator('[data-efw-pair-lab]'); await ruler.locator('summary').click();
  await expect(ruler.locator('[data-efw-pair-reduced]')).toBeVisible();
  for (let k = 0; k < 3; k++) {
    await ruler.getByLabel('Pair measurement time', { exact: true }).fill(String(recorded!.steps[k]));
    await ruler.getByRole('button', { name: `Record current sample as ${'ABC'[k]}`, exact: true }).click();
  }
  await ruler.getByLabel('Pair gap claim', { exact: true }).selectOption(recorded!.measurement.trend);
  await ruler.getByRole('button', { name: 'Check my gap evidence', exact: true }).click();
  await ruler.getByLabel('Pair measurement reflection', { exact: true }).fill('These are three original same-time gaps of the same pair, separate from my source classifications.');
  await expect(progress).toHaveText('Evidence saved for 0 of 3 missions.');
  await save.click();
  const secondNote = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook.at(-1));
  expect(secondNote.id).toBeGreaterThan(firstNote.id);
  expect(secondNote.sighting.inference).toEqual({ ...firstRecord, codes: mobileCodes, reflection: mobileReflection });
  expect(secondNote.sighting.measurement.samples).toEqual(recorded!.measurement.samples);
  expect(secondNote.sighting.measurement.intervals).toEqual(recorded!.measurement.intervals);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(firstJSON);
  await expect(progress).toHaveText('Evidence saved for 1 of 3 missions.');
  // A model-version fixture is derived from the genuine second saved note.
  // Its inference coordinates/gap remain internally coherent, while exact
  // current-model matching deliberately fails. No 3D remount is needed.
  const historical = await page.evaluate(id => {
    const state = JSON.parse(JSON.stringify((window as any).__toolData.ecosystem.foodWeb));
    const note = state.notebook.find((item: any) => item.id === id), sample = note.sighting.inference.trial.samples[0];
    sample.cue.x += .125; sample.gap = Math.hypot(sample.actor.x - sample.cue.x, sample.actor.z - sample.cue.z);
    return { ...state, run: null, showMeadow: false, fieldwork: null, motionStudy: null, ethogram: null, controlStudy: null, sightingRequest: null };
  }, secondNote.id);
  await assertClean(page); await harness.destroy(page); await mount(page, historical); await page.setViewportSize({ width: 390, height: 844 });
  await expect(meadow).toHaveCount(0); await expect(progress).toHaveText('Evidence saved for 1 of 3 missions.');
  const persisted = await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb));
  const measureMission = guide.locator('[data-efw-mission="interaction"]');
  await measureMission.getByRole('button', { name: 'Resume saved measurement mission', exact: true }).press('Enter');
  await expect(guide.locator('[data-efw-mission-message]')).toContainText('does not reproduce all original samples');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb))).toBe(persisted);
  await expect(meadow).toHaveCount(0);
  const historicalCard = notebook.locator(`[data-efw-note="${secondNote.id}"]`), historicalEvidence = historicalCard.locator('[data-efw-note-inference]');
  await expect(historicalCard).toBeInViewport(); await expect(historicalEvidence).toHaveAttribute('open', '');
  await expect(historicalEvidence).toContainText('First classification: 0 of 4 matched; latest classification: 3 of 4 matched.');
  await expect(historicalEvidence).toContainText(mobileReflection);
  const frozenHistorical = await page.evaluate(id => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, note = api.notebook(w.__toolData.ecosystem.foodWeb.notebook).find((item: any) => item.id === id);
    return { trial: note.sighting.inference.trial, resume: api.missionResume(note, 'interaction').ok };
  }, secondNote.id);
  expect(frozenHistorical.resume).toBe(false);
  expect(frozenHistorical.trial.samples[0].cue.x).toBe(secondNote.sighting.inference.trial.samples[0].cue.x + .125);
  await expect(historicalEvidence).toContainText(String(frozenHistorical.trial.samples[0].cue.x));
  await historicalCard.screenshot({ path: `${reportDir}/evidence-inference-historical-review.jpg`, type: 'jpeg', quality: 92 });
  await guide.locator('[data-efw-mission-message]').screenshot({ path: `${reportDir}/evidence-inference-historical-notice.jpg`, type: 'jpeg', quality: 92 });
});
