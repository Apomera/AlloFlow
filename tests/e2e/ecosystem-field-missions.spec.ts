import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true });
const reportDir = 'reports/ecosystem-eyes-landing-field-guide';
test.describe.configure({ timeout: 420_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => (window as any).__events?.errors || []);
  await harness.destroy(page); expect(errors, 'mission navigation and real saved activities have no uncaught errors').toEqual([]);
});

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
    const region = document.querySelector('[data-efw-meadow]'), rec = (window as any).__glCanvas?.('[data-efw-meadow]');
    if (rec?.rec?.scene && rec.rec.draws > 0 && region?.querySelector('canvas')?.hasAttribute('data-representative-index')) return 'ready';
    return region?.textContent?.includes('3D is unavailable on this device.') ? 'unavailable' : false;
  }, undefined, { timeout: 60_000 });
  expect(await ready.jsonValue(), 'the actual page renderer initializes and draws before the field missions').toBe('ready');
}

test('field missions count genuine saved evidence, preserve current drafts, resume a real ruler observation and stay honest after deletion, reset and historical mismatch', async ({ page }) => {
  await mount(page);
  const guide = page.locator('[data-efw-field-missions]'), progress = guide.locator('[data-efw-mission-progress]');
  const observe = guide.locator('[data-efw-mission="observe"]'), measure = guide.locator('[data-efw-mission="interaction"]'), population = guide.locator('[data-efw-mission="population"]');
  await expect(guide.getByRole('heading', { name: 'Field missions', exact: true })).toBeVisible();
  await expect(progress).toHaveText('Evidence saved for 0 of 3 missions.');
  await expect(progress).toHaveAttribute('aria-live', 'polite'); await expect(progress).toHaveAttribute('aria-atomic', 'true');
  await expect(guide.locator('input,select,textarea')).toHaveCount(0);
  await observe.getByRole('button', { name: 'Set up observation mission', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Run food-web comparison', exact: true })).toBeFocused();
  await expect(progress).toHaveText('Evidence saved for 0 of 3 missions.');
  const prediction = 'I will distinguish evidence about one animal, a measured pair and a modeled population comparison.';
  await page.getByRole('button', { name: 'Rabbit neighbors', exact: true }).click();
  await page.getByLabel('Your prediction (optional)', { exact: true }).fill(prediction);
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  await observe.getByRole('button', { name: 'Open observation mission', exact: true }).press('Enter');
  await rendererReady(page);
  const meadow = page.locator('[data-efw-meadow]'), canvas = meadow.locator('canvas'), timeline = meadow.getByLabel('Meadow timeline', { exact: true });
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  await observe.getByRole('button', { name: 'Open observation mission', exact: true }).press('Enter');
  const movement = meadow.locator('[data-efw-movement-study]');
  await expect(movement.getByRole('button', { name: 'Study a rabbit movement', exact: true })).toBeFocused();
  await expect(progress).toHaveText('Evidence saved for 0 of 3 missions.');
  await movement.getByRole('button', { name: 'Study a rabbit movement', exact: true }).click();
  const sequence = movement.locator('[data-efw-motion-sequence]');
  for (const snapshot of await sequence.locator('[data-efw-motion-sample]').all()) await snapshot.click();
  for (const order of [[1, 0, 2], [0, 1, 2]]) {
    for (let k = 0; k < 3; k++) await sequence.getByLabel(['First', 'Middle', 'Last'][k] + ' movement snapshot', { exact: true }).selectOption(String(order[k]));
    await sequence.getByRole('button', { name: 'Check my sequence', exact: true }).click();
    await expect(progress).toHaveText('Evidence saved for 0 of 3 missions.');
  }
  await sequence.getByLabel('Movement evidence reflection', { exact: true }).fill('The original supporting paws and body pose distinguish preparation, movement and recovery.');
  await sequence.getByRole('button', { name: 'Save movement observation', exact: true }).click();
  await expect(progress).toHaveText('Evidence saved for 1 of 3 missions.'); await expect(observe.locator('[data-efw-mission-count]')).toContainText('1 observation');
  const movementNote = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[0]);
  expect(movementNote.movement.order).toEqual([1, 0, 2]); expect(movementNote.movement.latestOrder).toEqual([0, 1, 2]);
  const movementDraft = await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.motionStudy));
  await observe.getByRole('button', { name: 'Review observation evidence', exact: true }).click();
  await expect(page.locator(`[data-efw-note="${movementNote.id}"]`)).toBeInViewport();
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.motionStudy))).toBe(movementDraft);
  await expect(measure).toContainText('Opening the chooser keeps your current animal draft.');
  await measure.getByRole('button', { name: 'Open measurement mission', exact: true }).press('Enter');
  const fieldwork = meadow.locator('[data-efw-fieldwork]');
  expect(await fieldwork.locator('[data-efw-encounter]').evaluateAll(buttons => buttons.some(button => button === document.activeElement))).toBe(true);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.motionStudy))).toBe(movementDraft);
  const recorded = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config;
    const frames = api.behaviorTimeline(config, api.compare(config).baseline), encounter = api.encounters(frames, config).find((e: any) => e.kind === 'listening');
    const steps = [encounter.before, encounter.step, encounter.after];
    return { encounter, steps, evidence: api.pairEvidence(frames, encounter, steps) };
  });
  expect(recorded.evidence).toBeTruthy();
  await fieldwork.locator('[data-efw-encounter="listening"]').click(); await fieldwork.getByLabel('Wildlife prediction', { exact: true }).selectOption('approach');
  await fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true }).click();
  const lab = fieldwork.locator('[data-efw-pair-lab]'); await lab.locator('summary').click();
  for (let k = 0; k < 3; k++) {
    await lab.getByLabel('Pair measurement time', { exact: true }).fill(String(recorded.steps[k]));
    await expect(timeline).toHaveValue(String(recorded.steps[k]));
    await expect(canvas).toHaveAttribute('data-field-ruler', 'true');
    await lab.getByRole('button', { name: `Record current sample as ${'ABC'[k]}`, exact: true }).click();
  }
  const wrongClaim = recorded.evidence.trend === 'steady' ? 'mixed' : 'steady';
  await lab.getByLabel('Pair gap claim', { exact: true }).selectOption(wrongClaim); await lab.getByRole('button', { name: 'Check my gap evidence', exact: true }).click();
  await lab.getByLabel('Pair gap claim', { exact: true }).selectOption(recorded.evidence.trend); await lab.getByRole('button', { name: 'Check my gap evidence', exact: true }).click();
  const reflection = 'These original same-time gaps describe this fixed pair. They do not establish capture or a population effect.';
  await lab.getByLabel('Pair measurement reflection', { exact: true }).fill(reflection);
  await fieldwork.getByLabel('Wildlife explanation', { exact: true }).fill('Original listening encounter explanation.');
  await expect(progress).toHaveText('Evidence saved for 1 of 3 missions.');
  await fieldwork.getByRole('button', { name: 'Save wildlife observation', exact: true }).click();
  const pairNote = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[1]), pairJSON = JSON.stringify(pairNote);
  expect(pairNote.sighting.headline).toBeUndefined(); expect(pairNote.sighting.measurement).toMatchObject({ samples: recorded.evidence.samples, intervals: recorded.evidence.intervals, firstClaim: wrongClaim, claim: recorded.evidence.trend, reflection });
  await expect(progress).toHaveText('Evidence saved for 2 of 3 missions.');
  const beforePopulationEntry = await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.fieldwork));
  await population.getByRole('button', { name: 'Choose disturbance for population mission', exact: true }).press('Enter');
  await expect(page.getByLabel('Disturbance', { exact: true })).toBeFocused();
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.fieldwork))).toBe(beforePopulationEntry);
  await page.getByLabel('Disturbance', { exact: true }).selectOption('remove');
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  await page.getByLabel('Chart group', { exact: true }).selectOption('rabbits');
  await population.getByRole('button', { name: 'Open population mission', exact: true }).click();
  const control = page.locator('[data-efw-control-study]'), time = page.getByLabel('Food-web comparison time', { exact: true });
  await expect(control).toHaveAttribute('open', '');
  await time.fill('40'); await control.getByRole('button', { name: 'Capture before-event sample', exact: true }).click();
  await time.fill('160'); await control.getByRole('button', { name: 'Capture after-event sample', exact: true }).click();
  for (const label of ['Baseline change number', 'Experiment change number', 'Extra modeled change number']) await control.getByLabel(label, { exact: true }).fill('0');
  await control.getByRole('button', { name: 'Compare my estimates', exact: true }).click();
  await expect(progress).toHaveText('Evidence saved for 2 of 3 missions.');
  await control.getByLabel('Controlled comparison reflection', { exact: true }).fill('A checked estimate is not a saved observation or proof of a correct population claim.');
  await control.getByRole('button', { name: 'Save controlled comparison', exact: true }).click();
  const populationNote = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[2]);
  expect(populationNote.controlStudy).toBeTruthy(); await expect(progress).toHaveText('Evidence saved for 3 of 3 missions.');
  await guide.screenshot({ path: `${reportDir}/field-missions-saved-evidence.jpg`, type: 'jpeg', quality: 92 });
  // An explicit new run clears working activities, while saved evidence remains.
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  await expect(progress).toHaveText('Evidence saved for 3 of 3 missions.');
  await measure.getByRole('button', { name: 'Resume saved measurement mission', exact: true }).press('Enter');
  await expect(lab.getByLabel('Pair measurement time', { exact: true })).toBeFocused();
  await expect(meadow.getByLabel('Meadow scene data', { exact: true })).toHaveValue('baseline');
  await expect(canvas).toHaveAttribute('data-selected-species', recorded.encounter.actor.id); await expect(canvas).toHaveAttribute('data-representative-index', String(recorded.encounter.actor.index));
  await expect(lab.getByLabel('Pair gap claim', { exact: true })).toHaveValue(recorded.evidence.trend); await expect(lab.getByLabel('Pair measurement reflection', { exact: true })).toHaveValue(reflection);
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork.measurement.firstClaim)).toBe(wrongClaim);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[1]))).toBe(pairJSON);
  await expect(page.getByLabel('Your prediction (optional)', { exact: true })).toHaveValue(prediction);
  const notebook = page.locator('[data-efw-notebook]');
  await notebook.getByRole('button', { name: `Remove observation ${pairNote.id}`, exact: true }).click();
  await expect(progress).toHaveText('Evidence saved for 2 of 3 missions.'); await expect(measure.locator('[data-efw-mission-count]')).toHaveText('No saved evidence yet');
  await expect(measure.getByRole('button', { name: 'Review measurement evidence', exact: true })).toHaveCount(0);
  await expect(measure.getByRole('button', { name: 'Continue measurement mission', exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 390, height: 844 });
  const draft = await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.fieldwork));
  await page.getByRole('button', { name: 'Hide 3D meadow', exact: true }).click(); await expect(meadow).toHaveCount(0);
  await measure.getByRole('button', { name: 'Continue measurement mission', exact: true }).press('Enter');
  await expect(lab.getByLabel('Pair measurement time', { exact: true })).toBeFocused();
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.fieldwork))).toBe(draft);
  await expect(lab.locator('[data-efw-pair-reduced]')).toBeVisible(); await expect(canvas).toHaveAttribute('data-field-ruler', 'false');
  await expect(progress).toHaveText('Evidence saved for 2 of 3 missions.');
  const revised = 'I resumed the same original samples and changed only this reflection before saving a new observation.';
  await lab.getByLabel('Pair measurement reflection', { exact: true }).fill(revised); await fieldwork.getByRole('button', { name: 'Save wildlife observation', exact: true }).click();
  const replacement = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook.at(-1));
  expect(replacement.id).toBeGreaterThan(populationNote.id); expect(replacement.sighting.measurement).toEqual({ ...pairNote.sighting.measurement, reflection: revised });
  await expect(progress).toHaveText('Evidence saved for 3 of 3 missions.');
  await guide.screenshot({ path: `${reportDir}/mobile-reduced-field-missions.jpg`, type: 'jpeg', quality: 92 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const boxes = await guide.locator('li').evaluateAll(cards => cards.map(card => { const r = card.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }));
  expect(boxes).toHaveLength(3); for (let k = 1; k < boxes.length; k++) expect(boxes[k].top).toBeGreaterThanOrEqual(boxes[k - 1].bottom);
  // Model-version drift is a persisted-data fixture, derived from the genuine
  // control note above. It remains internally valid frozen evidence, while its
  // original before values deliberately differ from today's recording.
  const historical = await page.evaluate(id => {
    const state = JSON.parse(JSON.stringify((window as any).__toolData.ecosystem.foodWeb));
    const note = state.notebook.find((item: any) => item.id === id); note.controlStudy.before.baseline += .125; note.controlStudy.before.experiment += .125;
    return { ...state, run: null, showMeadow: false, fieldwork: null, motionStudy: null, ethogram: null, controlStudy: null, sightingRequest: null };
  }, populationNote.id);
  await harness.destroy(page); await mount(page, historical); await page.setViewportSize({ width: 390, height: 844 });
  await expect(progress).toHaveText('Evidence saved for 3 of 3 missions.'); await expect(meadow).toHaveCount(0);
  const historicalState = await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb));
  await population.getByRole('button', { name: 'Resume saved population mission', exact: true }).press('Enter');
  await expect(guide.locator('[data-efw-mission-message]')).toContainText('does not reproduce all original samples');
  await expect(page.locator(`[data-efw-note="${populationNote.id}"]`)).toBeInViewport();
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb))).toBe(historicalState);
  await expect(meadow).toHaveCount(0); await expect(population.getByRole('button', { name: 'Review population evidence', exact: true })).toBeVisible();
  await guide.screenshot({ path: `${reportDir}/field-missions-historical-review.jpg`, type: 'jpeg', quality: 92 });
});
