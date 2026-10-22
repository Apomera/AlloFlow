import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// This is a persisted-evidence/real-button regression. Deliberately defer the
// optional renderer, exercising the tool's handled unavailable-3D path rather
// than creating a WebGL context or making any claims about rendered animals.
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true,
  probes: `window.THREE=undefined;window.StemLab.ensureThree=function(){return Promise.reject(new Error('Renderer deferred for persisted-record restoration test'));};`,
});
const reportDir = process.env.ECOLOGY_REPORT_DIR || 'reports/ecosystem-neighbor-nose-evidence';
test.describe.configure({ timeout: 180_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
async function assertClean(page: Page) {
  expect(await page.evaluate(() => (window as any).__events?.errors || []), 'data-only regular reopening has no uncaught errors').toEqual([]);
  expect(await harness.glContexts(page), 'this metadata/restoration regression creates no WebGL context').toEqual([]);
}
test.afterEach(async ({ page }) => { await assertClean(page); await harness.destroy(page); });
async function mount(page: Page, foodWeb: any = { showMeadow: false }) {
  await page.setViewportSize({ width: 1140, height: 1050 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true, foodWeb } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    document.body.className = 'theme-default';
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white';
  });
}

test('regular Reopen setup restores only complete current combined evidence and leaves a coherent historical ruler with different sample times frozen', async ({ page }) => {
  await mount(page);
  await page.getByRole('button', { name: 'Rabbit neighbors', exact: true }).click();
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  const fixture = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = api.normalize(w.__toolData.ecosystem.foodWeb.run.config);
    const pair = api.compare(config), frames = api.behaviorTimeline(config, pair.baseline), encounter = api.encounters(frames, config).find((item: any) => item.kind === 'spacing');
    if (!encounter) throw new Error('Rabbit neighbors did not provide its real Feeding neighbors encounter');
    const trial = api.inferenceTrial(frames, encounter, 'baseline'), steps = [encounter.before + 1, encounter.step + 1, encounter.after - 1];
    if (!trial || !(steps[0] < steps[1] && steps[1] < steps[2])) throw new Error('The original encounter cannot supply the requested independent ruler sample times');
    const codes = api.inferenceClaims(trial).map((card: any) => card.category), firstCodes = codes.map((code: string) => code === 'scene' ? 'unsupported' : 'scene');
    const inference = api.inferenceEvidence(frames, encounter, 'baseline', { trial, checked: true, visited: [trial.before, trial.step, trial.after], codes, firstCodes, reflection: 'Original first and revised classifications stay attached to these exact checkpoints.' });
    const measured = api.pairEvidence(frames, encounter, steps);
    if (!inference || !measured) throw new Error('The genuine combined evidence could not be produced by the current APIs');
    const raw = { version: 1, kind: encounter.kind, branch: 'baseline', actorIndex: encounter.actor.index, cueId: encounter.cue.id, cueIndex: encounter.cue.index, state: trial.samples[1].actor.state, decisionDistance: trial.decision.distance, before: { step: trial.before, state: trial.samples[0].actor.state }, after: { step: trial.after, state: trial.samples[2].actor.state }, forecast: 'avoid', runPrediction: 'Original population prediction.', limitation: 'Individual representative responses do not establish capture or biomass change.', inference, measurement: { version: 1, samples: measured.samples, intervals: measured.intervals, claim: measured.trend, firstClaim: measured.trend === 'closer' ? 'farther' : 'closer', reflection: 'These three ruler times intentionally differ from the inference checkpoints.' } };
    const current = api.notebook([api.capture(config, pair, encounter.step, encounter.actor.id, 'Original action prediction.', 'Original wildlife explanation.', 1, null, raw)])[0];
    if (!current?.sighting?.inference || !current?.sighting?.measurement) throw new Error('The source normalizer rejected the genuine combined note');
    const historicalRaw = JSON.parse(JSON.stringify(current)); historicalRaw.id = 2;
    // Translate the complete ruler recording, preserving all relative gaps and
    // sampled path lengths. The independent inference trial stays EXACTLY current.
    historicalRaw.sighting.measurement.samples.forEach((sample: any) => {
      sample.actor.x += .125; sample.cue.x += .125;
      sample.gap = Math.hypot(sample.actor.x - sample.cue.x, sample.actor.z - sample.cue.z);
    });
    historicalRaw.sighting.measurement.intervals.forEach((interval: any, k: number) => {
      interval.delta = historicalRaw.sighting.measurement.samples[k + 1].gap - historicalRaw.sighting.measurement.samples[k].gap;
    });
    const historical = api.notebook([historicalRaw])[0];
    if (!historical?.sighting?.inference || !historical?.sighting?.measurement) throw new Error('The historical ruler translation was not internally valid frozen evidence');
    return { current, historical, steps, inferenceSteps: [trial.before, trial.step, trial.after], codes, firstCodes, currentMatches: api.missionResume(current, 'interaction').ok, historicalMatches: api.missionResume(historical, 'interaction').ok, historicalInferenceMatches: api.inferenceMatches(historical.sighting.inference, frames, encounter), state: { ...config, notebook: [current, historical], notebookSequence: 2, run: null, showMeadow: false, fieldwork: null, motionStudy: null, ethogram: null, controlStudy: null, sightingRequest: null, cursor: 0, focus: encounter.actor.id, prediction: 'Unrelated working prediction.', reflection: 'Unrelated working explanation.' } };
  });
  expect(fixture.currentMatches).toBe(true); expect(fixture.historicalMatches).toBe(false); expect(fixture.historicalInferenceMatches).toBe(true);
  expect(fixture.steps).not.toEqual(fixture.inferenceSteps);
  expect(fixture.steps.every((step: number, k: number) => step !== fixture.inferenceSteps[k])).toBe(true);
  expect(fixture.historical.sighting.inference).toEqual(fixture.current.sighting.inference);
  expect(fixture.historical.sighting.measurement.samples[0].actor.x).toBe(fixture.current.sighting.measurement.samples[0].actor.x + .125);
  await test.info().attach('source-normalized-independent-ruler-fixture', { body: JSON.stringify({ current: fixture.current, historical: fixture.historical, currentMatches: fixture.currentMatches, historicalMatches: fixture.historicalMatches, historicalInferenceMatches: fixture.historicalInferenceMatches }), contentType: 'application/json' });
  await assertClean(page); await harness.destroy(page); await mount(page, fixture.state);
  const notebook = page.locator('[data-efw-notebook]'), currentNote = notebook.locator('[data-efw-note="1"]'), historicalNote = notebook.locator('[data-efw-note="2"]');
  const frozen = await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook));
  // The exact same real Reopen button must still restore complete matching data.
  await currentNote.getByRole('button', { name: 'Reopen observation 1', exact: true }).press('Enter');
  const fieldwork = page.locator('[data-efw-fieldwork]'), inference = fieldwork.locator('[data-efw-inference]'), ruler = fieldwork.locator('[data-efw-pair-lab]');
  await expect(inference).toHaveAttribute('open', ''); await expect(ruler).toHaveAttribute('open', '');
  const restored = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork);
  expect(restored.inference).toMatchObject({ checked: true, trial: fixture.current.sighting.inference.trial, codes: fixture.codes, firstCodes: fixture.firstCodes });
  expect(restored.measurement).toMatchObject({ checked: true, steps: fixture.steps, claim: fixture.current.sighting.measurement.claim, firstClaim: fixture.current.sighting.measurement.firstClaim });
  for (let k = 0; k < 4; k++) await expect(inference.getByLabel(`Evidence statement ${k + 1} source`, { exact: true })).toHaveValue(fixture.codes[k]);
  await expect(ruler.getByLabel('Pair gap claim', { exact: true })).toHaveValue(fixture.current.sighting.measurement.claim);
  await expect(ruler.getByLabel('Pair measurement reflection', { exact: true })).toHaveValue(fixture.current.sighting.measurement.reflection);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook))).toBe(frozen);
  // Only the ruler changed historically. Matching inference metadata must not
  // license copying those different ruler samples into a checked working form.
  await historicalNote.getByRole('button', { name: 'Reopen observation 2', exact: true }).press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork)).toBeNull();
  await expect(fieldwork.locator('[data-efw-inference]')).toHaveCount(0); await expect(fieldwork.locator('[data-efw-pair-lab]')).toHaveCount(0);
  const notice = page.locator('[data-efw-mission-message]');
  await expect(notice).toHaveText('Saved wildlife measurements remain unchanged, but the current recording does not reproduce all original samples; no checked wildlife activity was restored.');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook))).toBe(frozen);
  const savedRuler = historicalNote.locator('[data-efw-note-measurement]'); await savedRuler.locator('summary').click();
  await expect(savedRuler).toContainText(fixture.historical.sighting.measurement.reflection);
  for (let k = 0; k < 3; k++) await expect(savedRuler).toContainText(`time ${(fixture.steps[k] / 10).toFixed(1)}`);
  await historicalNote.locator('[data-efw-note-inference] summary').click();
  await expect(historicalNote.locator('[data-efw-note-inference]')).toContainText('First classification: 0 of 4 matched; latest classification: 4 of 4 matched.');
  await notice.screenshot({ path: `${reportDir}/regular-reopen-historical-ruler-notice.jpg`, type: 'jpeg', quality: 92 });
  await assertClean(page);
});
