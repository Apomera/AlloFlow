import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true });
const reportDir = 'reports/ecosystem-pinna-vigilance';

test.describe.configure({ timeout: 360_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => (window as any).__events?.errors || []);
  await harness.destroy(page);
  expect(errors, 'the actual headline evidence activity completes without uncaught errors').toEqual([]);
});

async function mount(page: Page, prediction: string) {
  await page.setViewportSize({ width: 1140, height: 1050 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    document.body.className = 'theme-default';
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white';
  });
  await page.getByRole('button', { name: 'Rabbit neighbors', exact: true }).click();
  await page.getByLabel('Your prediction (optional)', { exact: true }).fill(prediction);
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  const meadow = page.locator('[data-efw-meadow]');
  if (!(await meadow.isVisible())) await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  const initialized = await page.waitForFunction(() => {
    const region = document.querySelector('[data-efw-meadow]'), record = (window as any).__glCanvas?.('[data-efw-meadow]');
    if (record?.rec?.scene && record.rec.draws > 0 && region?.querySelector('canvas')?.hasAttribute('data-representative-index')) return 'ready';
    return region?.textContent?.includes('3D is unavailable on this device.') ? 'unavailable' : false;
  }, undefined, { timeout: 60_000 });
  expect(await initialized.jsonValue(), 'the page-created 3D renderer initializes and draws before evidence inspection').toBe('ready');
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  return { meadow, canvas: meadow.locator('canvas'), fieldwork: meadow.locator('[data-efw-fieldwork]'), timeline: meadow.getByLabel('Meadow timeline', { exact: true }), lab: meadow.locator('[data-efw-headline-trial]') };
}

async function fixture(page: Page) {
  return page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config;
    const frames = api.behaviorTimeline(config, api.compare(config).baseline), catalog = api.encounters(frames, config);
    const encounter = catalog.find((e: any) => e.kind === 'listening'), trial = encounter && api.headlineTrial(frames, encounter);
    if (!trial) throw new Error('The genuine listening encounter needs a bounded complete headline-trial recording');
    const intervals = trial.series.slice(1).map((point: any) => api.headlineInterval(trial, point.step));
    const support = intervals.filter((point: any) => point.classification === 'supports'), challenge = intervals.filter((point: any) => point.classification === 'challenges');
    if (support.length < 2 || !challenge.length) throw new Error('The actual listening fixture must contain both supporting evidence and a recorded counterexample');
    const pins = [support[0].end.step, support[1].end.step, challenge[0].end.step];
    const sorts = pins.map((step: number) => api.headlineInterval(trial, step).classification);
    const unavailable = catalog.find((e: any) => e.after - e.before > 60 && !api.headlineTrial(frames, e));
    w.__headlineFrames = frames;
    return { encounter, trial, pins, sorts, challengeSteps: challenge.map((p: any) => p.end.step), supportCount: support.length, unavailable, run: JSON.stringify(w.__toolData.ecosystem.foodWeb.run) };
  });
}

async function inspectEndpoint(page: Page, step: number, end: boolean, recorded: any) {
  const lab = page.locator('[data-efw-headline-trial]'), meadow = page.locator('[data-efw-meadow]'), canvas = meadow.locator('canvas');
  await lab.getByRole('button', { name: end ? 'Inspect interval end' : 'Inspect interval start', exact: true }).click();
  await expect(meadow.getByLabel('Meadow timeline', { exact: true })).toHaveValue(String(step));
  await expect(canvas).toHaveAttribute('data-selected-species', recorded.trial.actor.id);
  await expect(canvas).toHaveAttribute('data-representative-index', String(recorded.trial.actor.index));
  await expect(canvas).toHaveAttribute('data-field-ruler', 'true');
  const point = recorded.trial.series[step - recorded.trial.before];
  await expect.poll(async () => Number(await canvas.getAttribute('data-field-ruler-gap'))).toBeCloseTo(point.gap, 10);
  const actual = await page.evaluate(() => {
    const w = window as any, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const group = scene.getObjectByName('eco-field-ruler'), line = scene.getObjectByName('eco-field-ruler-line');
    const canvas = document.querySelector('[data-efw-meadow] canvas')!;
    return { visible: group?.visible, count: line?.geometry.getAttribute('position').count, endpoints: JSON.parse(canvas.getAttribute('data-field-ruler-endpoints')!) };
  });
  expect(actual.visible).toBe(true); expect(actual.count).toBe(33);
  expect(actual.endpoints[0][0]).toBeCloseTo(point.actor.x, 10); expect(actual.endpoints[0][2]).toBeCloseTo(point.actor.z, 10);
  expect(actual.endpoints[1][0]).toBeCloseTo(point.cue.x, 10); expect(actual.endpoints[1][2]).toBeCloseTo(point.cue.z, 10);
  const back = meadow.locator('[data-efw-observation-dock]').getByRole('button', { name: 'Return to headline evidence', exact: true });
  await expect(back).toBeFocused();
  await back.press('Enter');
  await expect(lab.getByLabel('Headline evidence interval', { exact: true })).toBeFocused();
}

test('a learner tests an endpoint headline against real adjacent intervals, revises a counterexample case and preserves the complete frozen evidence through export and mobile reduced-motion reopening', async ({ page }) => {
  const prediction = 'An illustrated gap can change without establishing a capture, cause or population effect.';
  const { meadow, canvas, fieldwork, timeline, lab } = await mount(page, prediction), recorded = await fixture(page);
  await fieldwork.locator('[data-efw-encounter="listening"]').click();
  await fieldwork.getByLabel('Wildlife prediction', { exact: true }).selectOption('approach');
  await fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true }).click();
  await expect(lab).not.toHaveAttribute('open', '');
  await lab.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(lab).toHaveAttribute('open', '');
  await expect(lab).toContainText(`The gap ${recorded.trial.direction} at every recorded step.`);
  await expect(lab.getByRole('button', { name: 'Commit verdict and investigate', exact: true })).toBeDisabled();
  await expect(lab.locator('[data-efw-headline-workbench]')).toHaveCount(0);
  await expect(lab.locator('[data-efw-headline-feedback]')).toHaveCount(0);
  await lab.getByRole('button', { name: 'I expect the headline to hold', exact: true }).focus(); await page.keyboard.press('Space');
  await lab.getByRole('button', { name: 'Commit verdict and investigate', exact: true }).press('Enter');
  await expect(lab).toContainText('First verdict: I expect the headline to hold.');
  const slider = lab.getByLabel('Headline evidence interval', { exact: true });
  await expect(slider).toHaveAttribute('min', String(recorded.trial.before + 1)); await expect(slider).toHaveAttribute('max', String(recorded.trial.after));
  await slider.focus(); await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork.headline.visited)).toEqual([]);
  await expect(lab.getByRole('button', { name: 'Pin this interval', exact: true })).toBeDisabled();
  const firstSorts = ['supports', 'supports', 'supports'];
  for (const [index, step] of recorded.pins.entries()) {
    await slider.fill(String(step));
    await inspectEndpoint(page, step - 1, false, recorded);
    if (index === 0) await expect(lab.getByRole('button', { name: 'Pin this interval', exact: true })).toBeDisabled();
    await inspectEndpoint(page, step, true, recorded);
    await expect(lab.locator('[data-efw-headline-inspected]')).not.toContainText('not inspected');
    await lab.getByRole('button', { name: 'Pin this interval', exact: true }).click();
    const card = lab.locator(`[data-efw-headline-card="${index}"]`);
    await expect(card).toHaveAttribute('data-bin', 'unclassified');
    await expect(card.getByRole('button', { name: 'Supports headline', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(card.getByRole('button', { name: 'Challenges headline', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(lab.getByRole('button', { name: 'Check evidence and audit full recording', exact: true })).toBeDisabled();
    await card.getByRole('button', { name: 'Supports headline', exact: true }).press('Enter');
  }
  await expect(lab.locator('[data-efw-headline-card]')).toHaveCount(3);
  await expect(lab.getByRole('button', { name: 'This interval is already pinned', exact: true })).toBeDisabled();
  await expect(lab.locator('[data-efw-headline-feedback]')).toHaveCount(0);
  await lab.getByRole('button', { name: 'Check evidence and audit full recording', exact: true }).click();
  const feedback = lab.locator('[data-efw-headline-feedback]');
  await expect(feedback).toContainText('2 of 3 evidence cards classified correctly. First case: 2 of 3.');
  await expect(feedback).toContainText(`Full recording audit: ${recorded.supportCount} supporting and ${recorded.challengeSteps.length} challenging intervals out of ${recorded.trial.series.length - 1}.`);
  await expect(feedback).toContainText('One counterexample is enough'); await expect(feedback).toContainText('Revise your verdict');
  await expect(lab).toContainText('Three supporting intervals do not establish an every-step claim.');
  await lab.getByRole('button', { name: 'I expect a counterexample', exact: true }).press('Enter');
  await lab.locator('[data-efw-headline-card="2"]').getByRole('button', { name: 'Challenges headline', exact: true }).press('Enter');
  await lab.getByRole('button', { name: 'Check revised evidence case', exact: true }).click();
  await expect(feedback).toContainText('3 of 3 evidence cards classified correctly. First case: 2 of 3.');
  await expect(feedback).toContainText('Your current verdict fits the complete recorded window.');
  await expect(lab).toContainText('First verdict: I expect the headline to hold.');
  await expect(lab.getByRole('button', { name: /^Remove evidence/ })).toHaveCount(0);
  await expect(lab.getByRole('img', { name: 'Complete recorded gap series for the fixed pair', exact: true })).toBeVisible();
  const gapChart = lab.getByRole('img', { name: 'Complete recorded gap series for the fixed pair', exact: true });
  await expect(gapChart).toContainText('Gap · zoomed recorded range');
  await expect(gapChart.locator('desc')).toContainText('rather than starting at zero');
  const axisLabels = await gapChart.locator('text').allTextContents();
  for (const value of [Math.min(...recorded.trial.series.map((point: any) => point.gap)), Math.max(...recorded.trial.series.map((point: any) => point.gap))]) expect(axisLabels).toContain(Number(value.toPrecision(3)).toString());
  const exact = feedback.locator('details'); await exact.locator('summary').click();
  await expect(exact.locator('tbody tr')).toHaveCount(recorded.trial.series.length);
  const reflection = 'The endpoints suggested a decreasing gap, but one adjacent recorded interval increased. That counterexample challenges the every-step headline; it does not establish a capture or a cause.';
  const explanation = 'The original fox paused to listen near a moving prey representative.';
  await lab.getByLabel('Headline evidence reflection', { exact: true }).fill(reflection);
  await fieldwork.getByLabel('Wildlife explanation', { exact: true }).fill(explanation);
  await fieldwork.getByLabel('Wildlife model limit', { exact: true }).fill('Scene units and recorded checkpoints do not measure a real chase.');
  const beforeCursor = await timeline.inputValue(), draft = await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.fieldwork.headline));
  await slider.fill(String(recorded.trial.before + 1));
  await expect(timeline).toHaveValue(beforeCursor);
  const afterDraft = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork.headline), beforeDraft = JSON.parse(draft);
  for (const key of ['firstVerdict', 'verdict', 'pins', 'sorts', 'firstSorts', 'visited', 'checked', 'reflection']) expect(afterDraft[key]).toEqual(beforeDraft[key]);
  await fieldwork.getByRole('button', { name: 'Save wildlife observation', exact: true }).click();
  const note = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[0]), saved = JSON.stringify(note);
  expect(note.sighting.headline).toEqual({ version: 1, branch: 'baseline', trial: recorded.trial, pins: recorded.pins, sorts: recorded.sorts, firstSorts, verdict: 'challenged', firstVerdict: 'supported', reflection });
  expect(note.step).toBe(recorded.encounter.step); expect(note.sighting.forecast).toBe('approach'); expect(note.sighting.runPrediction).toBe(prediction); expect(note.prediction).toContain('Pause and listen near moving prey'); expect(note.explanation).toBe(explanation);
  const notebook = page.locator('[data-efw-notebook]'), savedTrial = notebook.locator('[data-efw-note-headline]');
  await savedTrial.locator('summary').click(); await expect(savedTrial).toContainText('first sorting supports; latest sorting challenges');
  await expect(savedTrial).not.toContainText('Frozen headline-trial evidence (JSON)');
  const downloadPromise = page.waitForEvent('download'); await notebook.getByRole('button', { name: 'Export field notebook', exact: true }).click();
  const download = await downloadPromise; expect(download.suggestedFilename()).toBe('ecosystem-field-notebook.txt');
  const text = await readFile((await download.path())!, 'utf8'), prefix = 'Frozen headline-trial evidence (JSON): ', line = text.split('\n').find(value => value.startsWith(prefix));
  expect(line, 'the actual downloaded notebook contains portable exact evidence').toBeTruthy(); expect(JSON.parse(line!.slice(prefix.length))).toEqual(note.sighting.headline); expect(text).toContain(prediction);
  await lab.screenshot({ path: `${reportDir}/headline-counterexample-evidence.jpg`, type: 'jpeg', quality: 92 });
  await lab.getByRole('button', { name: 'Start a new headline evidence set', exact: true }).click();
  await expect(lab.getByRole('button', { name: 'Commit verdict and investigate', exact: true })).toBeDisabled();
  await expect(lab.locator('[data-efw-headline-card]')).toHaveCount(0); await expect(lab.locator('[data-efw-headline-feedback]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork.headline.firstVerdict)).toBe('');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(saved);
  expect(recorded.unavailable, 'the actual catalog retains a long window that must not be silently cropped').toBeTruthy();
  await fieldwork.locator(`[data-efw-encounter="${recorded.unavailable.kind}"]`).click(); await fieldwork.getByLabel('Wildlife prediction', { exact: true }).selectOption('unsure'); await fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true }).click();
  await lab.locator('summary').click(); await expect(lab.locator('[data-efw-headline-unavailable]')).toContainText('No missing positions are invented.'); await expect(lab.getByLabel('Headline evidence interval', { exact: true })).toHaveCount(0);
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('experiment');
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork)).toBeNull();
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 390, height: 844 });
  await notebook.getByRole('button', { name: 'Reopen observation 1', exact: true }).click();
  await expect(meadow.getByLabel('Meadow scene data', { exact: true })).toHaveValue('baseline');
  await expect(lab).toHaveAttribute('open', ''); await expect(lab.locator('[data-efw-headline-reduced]')).toBeVisible();
  await expect(lab.getByLabel('Headline evidence reflection', { exact: true })).toHaveValue(reflection);
  await expect(fieldwork.getByLabel('Wildlife explanation', { exact: true })).toHaveValue(explanation);
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork.forecast)).toBe('approach');
  await expect(fieldwork).toContainText('Your prediction was “Pause and listen near moving prey”.');
  await expect(page.getByLabel('Your prediction (optional)', { exact: true })).toHaveValue(prediction);
  await expect(timeline).toHaveValue(String(recorded.encounter.step)); await expect(slider).toHaveValue(String(recorded.pins[0]));
  await expect(feedback).toContainText('3 of 3 evidence cards classified correctly. First case: 2 of 3.');
  await expect(canvas).toHaveAttribute('data-field-ruler', 'false'); await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
  const restored = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork.headline);
  for (const key of ['pins', 'sorts', 'firstSorts', 'verdict', 'firstVerdict', 'reflection']) expect(restored[key]).toEqual(note.sighting.headline[key]);
  const frozenPosition = await canvas.getAttribute('data-representative-position');
  await slider.fill(String(recorded.pins[2])); await lab.getByRole('button', { name: 'Inspect interval end', exact: true }).click();
  await expect(timeline).toHaveValue(String(recorded.pins[2])); await expect(canvas).toHaveAttribute('data-representative-position', frozenPosition!);
  await expect(lab.locator('[data-efw-headline-inspected]')).not.toContainText('not inspected'); await expect(meadow.locator('[data-efw-observation-dock]')).toHaveCount(0);
  await lab.screenshot({ path: `${reportDir}/mobile-reduced-headline-evidence.jpg`, type: 'jpeg', quality: 92 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const layout = await lab.locator('[data-efw-headline-card]').evaluateAll(cards => cards.map(card => { const r = card.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }));
  expect(layout).toHaveLength(3); for (let k = 1; k < layout.length; k++) expect(layout[k].y).toBeGreaterThanOrEqual(layout[k - 1].bottom);
  const revised = 'My revised evidence statement preserves the original pair and separates a single counterexample from claims about capture or causation.';
  await lab.getByLabel('Headline evidence reflection', { exact: true }).fill(revised); await fieldwork.getByRole('button', { name: 'Save wildlife observation', exact: true }).click();
  const second = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[1]);
  expect(second.sighting.headline).toEqual({ ...note.sighting.headline, reflection: revised }); expect(second.explanation).toBe(explanation); expect(second.prediction).toBe(note.prediction); expect(second.sighting.runPrediction).toBe(prediction);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(saved);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(recorded.run);
});
