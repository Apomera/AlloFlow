import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island', weather = '#ea-climate', prefix = '#ea-climate-collection';
const weatherPrediction = 'The birds and plants may respond across several generations to changed breeding weights, with finite sampling and inherited variation producing different private futures.';
const rationale = 'I predict that changed rainfall can produce both higher and lower bird means across matched private futures; each difference should compare the same captured organisms and private starting seed.';

test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const setRange = async (page: any, selector: string, value: number) => page.locator(selector).evaluate((input: HTMLInputElement, v: number) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v));
  input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
}, value);

async function fixture(page: any, noGL = false, selection = true) {
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: !noGL });
  const world = await page.evaluate(enabled => {
    const m = (window as any).StemLab.evoArchipelagoModel;
    let w = m.create(21, !enabled); w.settings.migration = .4; w.settings.mutation = .03; w.settings.selection = enabled;
    if (enabled) for (let i = 0; i < 3; i++) w = m.step(w);
    return w;
  }, selection);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: world } }, undefined, { expectCanvas: !noGL }); return world;
}

async function openWeather(page: any, keyboard = false) {
  const nav = page.getByRole('button', { name: 'Plan a weather expedition', exact: true }); if (keyboard) { await nav.focus(); await nav.press('Enter'); } else await nav.click();
  const summary = page.getByText('Follow evolution through changing weather', { exact: true });
  if (!(await summary.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open))) { if (keyboard) { await summary.focus(); await summary.press('Enter'); } else await summary.click(); }
  const panel = page.locator('section[data-climate-expedition]'); await expect(panel).toBeVisible(); return panel;
}

async function makeWeather(page: any, panel: any, selection: boolean) {
  await panel.locator(weather + '-target').selectOption(selection ? '1' : '2');
  for (let i = 0; i < 4; i++) await setRange(page, weather + '-rain-' + i, [.15, .35, .8, .95][i]);
  await panel.locator(weather + '-prediction').fill(weatherPrediction); await panel.getByRole('button', { name: 'Run weather expedition', exact: true }).click();
  await expect(panel).toHaveAttribute('data-climate-expedition', 'complete'); return download(page, panel, 'Download weather expedition');
}

async function openCollection(panel: any, keyboard = false) {
  const summary = panel.getByText('Is the weather pattern repeatable?', { exact: true });
  if (!(await summary.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open))) { if (keyboard) { await summary.focus(); await summary.press('Enter'); } else await summary.click(); }
  const collection = panel.locator('section[data-climate-collection]'); await expect(collection).toBeVisible(); return collection;
}

async function download(page: any, panel: any, name = 'Download repeated weather collection') {
  const pending = page.waitForEvent('download'); await panel.getByRole('button', { name, exact: true }).click();
  return JSON.parse(readFileSync((await (await pending).path())!, 'utf8'));
}

function independentValues(studies: any[], generation: number, species: string, island: number, metric: 'trait' | 'marker' | 'diversity') {
  return studies.map((s: any, index: number) => {
    const steady = s.independent.steady[generation - s.plan.start][species][island][metric], changing = s.independent.changing[generation - s.plan.start][species][island][metric];
    return { index, batch: s.plan.batch, seed: s.plan.privateSeed, steady, changing, difference: steady === null || changing === null ? null : changing - steady };
  });
}

async function scalar(panel: any, suffix: string) {
  const attribute = 'data-climate-collection-' + suffix;
  const value = await panel.evaluate((el: Element, attr: string) => {
    const target = el.hasAttribute(attr) ? el : el.querySelector('[' + attr + ']'); return target ? target.getAttribute(attr) : null;
  }, attribute);
  expect(value, 'missing ' + attribute).not.toBeNull(); return value === 'null' ? null : Number(value);
}

async function verifyCollection(page: any, panel: any, raw: any, world: any, original: any, count: number, baseBatch = (original.recipe.batch + 1) >>> 0) {
  expect(raw.format).toBe('evolab-weather-collection'); expect(raw.version).toBe(1); expect(raw.protocol).toBeTruthy(); expect(raw.limits).toBeTruthy();
  expect(raw.weatherPrediction).toBe(weatherPrediction);
  const replay = await page.evaluate(data => {
    const m = (window as any).StemLab.evoArchipelagoModel;
    const collection = m.climateCollection(data.recipe);
    function independent(members: any[]) {
      if (!members.length) return { trait: null, marker: null, diversity: null };
      const trait = members.reduce((sum: number, o: any) => sum + (o.genes[0] + o.genes[1]) / 2, 0) / members.length;
      const marker = members.reduce((sum: number, o: any) => sum + o.marker[0] + o.marker[1], 0) / (2 * members.length);
      return { trait, marker, diversity: 2 * marker * (1 - marker) };
    }
    const studies = Array.from({ length: data.recipe.count }, (_, i) => {
      const plan = m.restoreClimatePlan({ ...data.recipe.plan, batch: (data.recipe.plan.batch + i) >>> 0 }), study = m.climateStudy(plan);
      const analysis: any = {};
      for (const condition of ['steady', 'changing']) analysis[condition] = study[condition].world.history.slice(plan.start, plan.end + 1).map((frame: any) => ({ birds: frame.demes.map((d: any) => independent(d.birds)), plants: frame.demes.map((d: any) => independent(d.plants)) }));
      return { plan: { batch: plan.batch, privateSeed: plan.privateSeed, start: plan.start, end: plan.end }, steady: { series: study.steady.series, rng: study.steady.world.rng }, changing: { series: study.changing.series, rng: study.changing.world.rng }, independent: analysis, equalCohorts: study.steady.world.history.slice(plan.start, plan.end + 1).map((frame: any) => JSON.stringify(frame.demes) === JSON.stringify(study.changing.world.history[frame.generation].demes)) };
    });
    return { source: m.restoreCheckpoint(data.recipe.plan.source), collection, studies, summary: m.climateCollectionSummary(collection, data.view), lockedSummary: m.climateCollectionSummary(collection, data.lockedQuestion) };
  }, raw);
  expect(replay.source).toEqual(world); expect(raw.recipe.count).toBe(count); expect(raw.recipe.plan.batch).toBe(baseBatch);
  expect(raw.recipe.plan.source).toEqual(original.recipe.source); expect(raw.recipe.plan.schedule).toEqual(original.recipe.schedule);
  expect(raw.result.trials).toEqual(replay.collection.trials); expect(raw.result.summary).toEqual(replay.summary); expect(raw.result.lockedSummary).toEqual(replay.lockedSummary);
  expect(replay.studies).toHaveLength(count); expect(new Set(replay.studies.map((s: any) => s.plan.privateSeed)).size).toBe(count);
  for (let i = 0; i < count; i++) expect(replay.studies[i].plan.batch).toBe((raw.recipe.plan.batch + i) >>> 0);
  await expect(panel).toHaveAttribute('data-climate-collection', 'complete', { timeout: 120_000 }); expect(await scalar(panel, 'count')).toBe(count); expect(await scalar(panel, 'base-batch')).toBe(raw.recipe.plan.batch);
  await expect(panel).toHaveAttribute('data-climate-collection-checksum', raw.recipe.plan.sourceChecksum);
  return replay.studies;
}

async function returnToCapturedQuestion(page: any, panel: any, raw: any) {
  const question = raw.lockedQuestion;
  await panel.locator(prefix + '-species').selectOption(question.species === 'birds' ? 'plants' : 'birds'); await panel.locator(prefix + '-island').selectOption(String((question.island + 1) % 3));
  await panel.locator(prefix + '-generation').selectOption(String(question.generation === raw.recipe.plan.start ? raw.recipe.plan.end : raw.recipe.plan.start)); await panel.locator(prefix + '-metric').selectOption(question.metric === 'diversity' ? 'marker' : 'diversity');
  await panel.getByRole('button', { name: 'Return to the captured question', exact: true }).click();
  for (const key of ['species', 'island', 'generation', 'metric']) await expect(panel.locator(prefix + '-' + key)).toHaveValue(String(question[key]));
  await expect(panel.locator('[data-climate-collection-exploratory]')).toHaveCount(0);
  const returned = await download(page, panel); expect(returned.recipe).toEqual(raw.recipe); expect(returned.lockedQuestion).toEqual(question); expect(returned.result.lockedSummary).toEqual(raw.result.lockedSummary); expect(returned.result.summary).toEqual(raw.result.lockedSummary);
  return returned;
}

async function reviewCapturedPlan(panel: any, raw: any) {
  const summary = panel.getByText('Review this collection’s captured plan', { exact: true }); if (!(await summary.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open))) await summary.click();
  const detail = summary.locator('xpath=ancestor::details[1]'); await expect(detail).toContainText(raw.weatherPrediction);
  const rounds = detail.locator('.ea-climate-captured > div'); await expect(rounds).toHaveCount(raw.recipe.plan.schedule.length);
  for (let i = 0; i < raw.recipe.plan.schedule.length; i++) {
    await expect(rounds.nth(i).locator('strong')).toHaveText('G' + (raw.recipe.plan.start + i + 1)); await expect(rounds.nth(i).locator('div')).toHaveCount(3);
    for (let island = 0; island < 3; island++) await expect(rounds.nth(i).locator('div').nth(island)).toContainText(raw.recipe.plan.schedule[i][island].toFixed(2));
  }
}

async function verifyResponse(panel: any, studies: any[], generation: number, species: string, island: number, metric: 'trait' | 'marker' | 'diversity') {
  await panel.locator(prefix + '-species').selectOption(species); await panel.locator(prefix + '-island').selectOption(String(island));
  await panel.locator(prefix + '-generation').selectOption(String(generation)); await panel.locator(prefix + '-metric').selectOption(metric);
  const expected = independentValues(studies, generation, species, island, metric), paired = expected.filter(row => row.difference !== null), values = paired.map(row => row.difference!);
  const summary = panel.locator('[data-climate-collection-summary]'); await expect(summary).toHaveCount(1);
  expect(await scalar(summary, 'paired')).toBe(paired.length); expect(await scalar(summary, 'missing')).toBe(expected.length - paired.length);
  expect(await scalar(summary, 'positive')).toBe(values.filter(v => v > 0).length); expect(await scalar(summary, 'zero')).toBe(values.filter(v => v === 0).length); expect(await scalar(summary, 'negative')).toBe(values.filter(v => v < 0).length);
  expect(await scalar(summary, 'mean')).toBeCloseTo(values.reduce((sum, v) => sum + v, 0) / values.length, 13); expect(await scalar(summary, 'min')).toBeCloseTo(Math.min(...values), 13); expect(await scalar(summary, 'max')).toBeCloseTo(Math.max(...values), 13);
  const chart = panel.locator('svg[data-climate-collection-chart]'); await expect(chart).toHaveAccessibleName(/\S+/);
  const extent = Math.max(.02, Math.abs(Math.min(...values)), Math.abs(Math.max(...values))); expect(Number(await chart.getAttribute('data-climate-collection-extent'))).toBeCloseTo(extent, 13);
  const selected = Number(await panel.locator(prefix + '-trial').inputValue());
  const dots = await chart.locator('[data-climate-collection-point]').evaluateAll((els: Element[]) => els.map(el => ({ index: Number(el.getAttribute('data-climate-collection-point')), value: Number(el.getAttribute('data-climate-collection-value')), cx: Number(el.getAttribute('cx')), cy: Number(el.getAttribute('cy')), r: Number(el.getAttribute('r')) })));
  expect(dots).toHaveLength(paired.length);
  for (const dot of dots) { expect(dot.value).toBeCloseTo(expected[dot.index].difference!, 13); expect(dot.cx).toBeCloseTo(48 + (expected[dot.index].difference! + extent) / (2 * extent) * 490, 10); expect(dot.cy).toBe(40 + dot.index * 32); expect(dot.r).toBe(dot.index === selected ? 7 : 5); }
  const exact = panel.getByText('Read every paired value', { exact: true }); if (!(await exact.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open))) await exact.click();
  const rows = panel.locator('[data-climate-collection-trial]'); await expect(rows).toHaveCount(expected.length);
  for (const row of expected) {
    const displayed = panel.locator('[data-climate-collection-trial="' + row.index + '"]');
    expect(await scalar(displayed, 'batch')).toBe(row.batch); expect(await scalar(displayed, 'seed')).toBe(row.seed);
    expect(await scalar(displayed, 'steady')).toBeCloseTo(row.steady!, 13); expect(await scalar(displayed, 'changing')).toBeCloseTo(row.changing!, 13); expect(await scalar(displayed, 'difference')).toBeCloseTo(row.difference!, 13);
  }
  return expected;
}

test('new matched weather batches retain their locked question, stable prefixes and captured recipe while learners explore and replay actual private futures', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const world = await fixture(page), weatherPanel = await openWeather(page), original = await makeWeather(page, weatherPanel, true), panel = await openCollection(weatherPanel);
  const collect = panel.getByRole('button', { name: 'Collect 8 new weather pairs', exact: true }); await expect(collect).toBeDisabled(); await panel.locator(prefix + '-prediction').fill('   '); await expect(collect).toBeDisabled();
  await panel.locator(prefix + '-species').selectOption('birds'); await panel.locator(prefix + '-island').selectOption('1'); await panel.locator(prefix + '-generation').selectOption('7'); await panel.locator(prefix + '-metric').selectOption('trait'); await panel.locator(prefix + '-direction').selectOption('mixed');
  await panel.locator(prefix + '-prediction').fill(rationale); await collect.click(); await expect(panel).toHaveAttribute('data-climate-collection', 'complete', { timeout: 120_000 });
  let raw = await download(page, panel), studies = await verifyCollection(page, panel, raw, world, original, 8); const firstRecipe = raw.recipe, locked = raw.lockedQuestion;
  const lockedSummary = raw.result.lockedSummary;
  expect(locked).toEqual({ species: 'birds', island: 1, generation: 7, metric: 'trait', direction: 'mixed' }); expect(raw.prediction).toBe(rationale); await expect(panel.locator('[data-climate-collection-locked]')).toContainText(rationale);
  await verifyResponse(panel, studies, 7, 'birds', 1, 'trait');
  await reviewCapturedPlan(panel, raw); const firstExact = panel.getByText('Read every paired value', { exact: true }); if (await firstExact.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open)) await firstExact.click();
  await panel.locator('xpath=ancestor::details[1]').screenshot({ path: report + '/weather-collection-desktop.png' });
  const firstEight = studies.map((s: any) => s.steady.series.concat(s.changing.series));
  for (const metric of ['trait', 'marker', 'diversity'] as const) for (const species of ['birds', 'plants']) await verifyResponse(panel, studies, 5, species, 2, metric);
  const explored = await download(page, panel); expect(explored.lockedQuestion).toEqual(locked); expect(explored.prediction).toBe(rationale); expect(explored.recipe).toEqual(firstRecipe); expect(explored.result.lockedSummary).toEqual(lockedSummary); expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(world);

  await weatherPanel.locator(weather + '-prediction').fill('A later weather draft must not replace the captured collection.'); await setRange(page, weather + '-rain-0', .99); await setRange(page, '#ea-migration', 0);
  const queued = await page.evaluate(() => (window as any).__toolData.evoLab.archipelago); expect(queued.history).toEqual(world.history); expect(queued.rng).toBe(world.rng);
  const beforeCancellation = await download(page, panel);
  // Observe the short partial-work window, then use the real native Cancel button.
  // The existing extension loops below continue to exercise physical and keyboard clicks.
  const canceledWork = await page.evaluate(() => new Promise<{ done: number; goal: number; progressValue: number; progressMax: number; completedCount: number }>((resolve, reject) => {
    const section = document.querySelector('section[data-climate-collection]') as HTMLElement;
    let timer: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(cancelAfterPartialWork);
    function cancelAfterPartialWork() {
      const done = Number(section.getAttribute('data-climate-collection-progress')), goal = Number(section.getAttribute('data-climate-collection-goal'));
      if (done <= 0 || done >= goal) return;
      const cancel = Array.from(section.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Cancel weather collection run');
      const progress = section.querySelector('progress[aria-label="Matched weather pairs computed"]') as HTMLProgressElement | null;
      if (!cancel || cancel.disabled || !progress) return;
      const snapshot = { done, goal, progressValue: progress.value, progressMax: progress.max, completedCount: Number(section.getAttribute('data-climate-collection-count')) };
      observer.disconnect(); clearTimeout(timer); cancel.click(); resolve(snapshot);
    }
    timer = setTimeout(() => { observer.disconnect(); reject(new Error('No cancellable partial weather collection appeared')); }, 120_000);
    observer.observe(section, { attributes: true, attributeFilter: ['data-climate-collection-progress', 'data-climate-collection-goal', 'data-climate-collection'] });
    const add = Array.from(section.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Add 8 weather pairs');
    if (!add || add.disabled) { observer.disconnect(); clearTimeout(timer); reject(new Error('The weather extension control is unavailable')); return; }
    add.click(); cancelAfterPartialWork();
  }));
  expect(canceledWork.goal).toBe(16); expect(canceledWork.done).toBeGreaterThan(0); expect(canceledWork.done).toBeLessThan(16);
  expect(canceledWork.progressValue).toBe(canceledWork.done); expect(canceledWork.progressMax).toBe(16); expect(canceledWork.completedCount).toBe(8);
  await expect(panel).toHaveAttribute('data-climate-collection', 'complete', { timeout: 120_000 });
  await expect(panel).toHaveAttribute('data-climate-collection-count', '8', { timeout: 120_000 });
  await expect(panel.getByRole('button', { name: 'Cancel weather collection run', exact: true })).toHaveCount(0);
  await expect(panel.getByRole('progressbar', { name: 'Matched weather pairs computed', exact: true })).toHaveCount(0);
  const afterCancellation = await download(page, panel);
  expect(afterCancellation.recipe).toEqual(beforeCancellation.recipe); expect(afterCancellation.result).toEqual(beforeCancellation.result);
  expect(afterCancellation.lockedQuestion).toEqual(beforeCancellation.lockedQuestion); expect(afterCancellation.prediction).toBe(beforeCancellation.prediction);
  expect(afterCancellation.explanation).toBe(beforeCancellation.explanation); expect(afterCancellation.view).toEqual(beforeCancellation.view);
  const retainedCancellationRecipe = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.archipelago.climateCollection.v1')!));
  expect(retainedCancellationRecipe.recipe).toEqual(beforeCancellation.recipe); expect(retainedCancellationRecipe).not.toHaveProperty('result');
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(queued);
  for (const size of [16, 24, 32]) {
    await panel.getByRole('button', { name: 'Add 8 weather pairs', exact: true }).click(); await expect(panel).toHaveAttribute('data-climate-collection-count', String(size), { timeout: 120_000 });
    raw = await download(page, panel); studies = await verifyCollection(page, panel, raw, world, original, size); expect(raw.lockedQuestion).toEqual(locked); expect(raw.prediction).toBe(rationale);
    expect(studies.slice(0, 8).map((s: any) => s.steady.series.concat(s.changing.series))).toEqual(firstEight);
  }
  await expect(panel.getByRole('button', { name: 'Add 8 weather pairs', exact: true })).toBeDisabled();
  await verifyResponse(panel, studies, 7, 'birds', 1, 'trait'); await panel.locator('[data-climate-collection-point="6"]').click(); await expect(panel.locator(prefix + '-trial')).toHaveValue('6');
  await verifyResponse(panel, studies, 5, 'birds', 1, 'trait');
  await panel.locator(prefix + '-trial').selectOption('9');
  await weatherPanel.getByRole('button', { name: 'Play recorded future', exact: true }).click(); await expect(weatherPanel.getByRole('button', { name: 'Pause playback', exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Inspect this weather pair', exact: true }).click(); await expect(weatherPanel).toHaveAttribute('data-climate-batch', String(studies[9].plan.batch));
  await expect(weatherPanel.getByRole('button', { name: 'Play recorded future', exact: true })).toHaveAttribute('aria-pressed', 'false'); await expect(weatherPanel.locator(weather + '-generation')).toHaveValue('2'); await expect(weatherPanel.locator(weather + '-species')).toHaveValue('birds'); await expect(weatherPanel.locator(weather + '-island')).toHaveValue('1');
  const inspected = await download(page, weatherPanel, 'Download weather expedition');
  const inspectedPlan = await page.evaluate(({ recipe, batch }) => (window as any).StemLab.evoArchipelagoModel.restoreClimatePlan({ ...recipe.plan, batch }), { recipe: raw.recipe, batch: studies[9].plan.batch });
  expect(inspected.recipe).toEqual(inspectedPlan); expect(inspected.result.steady.series).toEqual(studies[9].steady.series); expect(inspected.result.changing.series).toEqual(studies[9].changing.series);
  const afterBridge = await download(page, panel); expect(afterBridge.recipe).toEqual(raw.recipe); expect(afterBridge.lockedQuestion).toEqual(locked); expect(afterBridge.prediction).toBe(rationale);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(queued);
  const explanation = 'The sign counts describe paired future variation from the same captured organisms. They are not confidence intervals or a probability of adaptation in nature.';
  await panel.locator(prefix + '-explanation').fill(explanation); await weatherPanel.getByRole('button', { name: 'Save weather expedition to journal', exact: true }).click();
  const weatherNote = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoClimate.text);
  await panel.getByRole('button', { name: 'Save repeated weather finding', exact: true }).click(); const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  expect(notes.archipelagoClimate.text).toBe(weatherNote); expect(notes.archipelagoClimateCollection.text).toContain(rationale); expect(notes.archipelagoClimateCollection.text).toContain(explanation);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.archipelago.climateCollection.v1')!)); expect(stored.recipe).toEqual(raw.recipe); expect(stored).not.toHaveProperty('result'); expect(stored).not.toHaveProperty('trials'); expect(stored).not.toHaveProperty('outcomes');
  await reviewCapturedPlan(panel, afterBridge);
  const exact = panel.getByText('Read every paired value', { exact: true }); if (await exact.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open)) await exact.click();
  await panel.locator('xpath=ancestor::details[1]').screenshot({ path: report + '/weather-collection-desktop-32.png' });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: queued } }); const restoredWeather = await openWeather(page); await restoredWeather.getByRole('button', { name: 'Replay saved weather expedition', exact: true }).click(); await expect(restoredWeather).toHaveAttribute('data-climate-expedition', 'complete');
  const restored = await openCollection(restoredWeather); await expect(restored.locator('[data-climate-collection-trial]')).toHaveCount(0); await restored.getByRole('button', { name: 'Replay saved weather collection', exact: true }).click(); await expect(restored).toHaveAttribute('data-climate-collection', 'complete', { timeout: 120_000 });
  const replayed = await download(page, restored); await verifyCollection(page, restored, replayed, world, original, 32); expect(replayed.recipe).toEqual(raw.recipe); expect(replayed.lockedQuestion).toEqual(locked); expect(replayed.explanation).toBe(explanation);
  const returned = await returnToCapturedQuestion(page, restored, replayed);
  await restored.getByRole('button', { name: 'Start another weather question', exact: true }).click(); await expect(restored).toHaveAttribute('data-climate-collection', 'ready'); await expect(restored.locator(prefix + '-prediction')).toHaveValue(''); await expect(restored.getByRole('button', { name: 'Collect 8 new weather pairs', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.archipelago.climateCollection.v1')!).recipe)).toEqual(returned.recipe);
  await restored.getByRole('button', { name: 'Replay saved weather collection', exact: true }).click(); await expect(restored).toHaveAttribute('data-climate-collection-count', '32', { timeout: 120_000 }); const recovered = await download(page, restored); expect(recovered.recipe).toEqual(returned.recipe); expect(recovered.lockedQuestion).toEqual(locked); expect(recovered.explanation).toBe(explanation);
  await restored.getByRole('button', { name: 'Start another weather question', exact: true }).click();
  await restored.locator(prefix + '-species').selectOption('plants'); await restored.locator(prefix + '-island').selectOption('0'); await restored.locator(prefix + '-generation').selectOption('6'); await restored.locator(prefix + '-metric').selectOption('diversity'); await restored.locator(prefix + '-direction').selectOption('lower');
  const freshReason = 'This new question uses fresh paired futures after the earlier collection, and asks whether one-marker diversity is lower more often at this particular generation.';
  await restored.locator(prefix + '-prediction').fill(freshReason); await restored.getByRole('button', { name: 'Collect 8 new weather pairs', exact: true }).click(); await expect(restored).toHaveAttribute('data-climate-collection-count', '8', { timeout: 120_000 });
  const fresh = await download(page, restored), freshStudies = await verifyCollection(page, restored, fresh, world, original, 8, (returned.recipe.plan.batch + returned.recipe.count) >>> 0);
  expect(fresh.lockedQuestion).toEqual({ species: 'plants', island: 0, generation: 6, metric: 'diversity', direction: 'lower' }); expect(fresh.prediction).toBe(freshReason); expect(freshStudies.some((s: any) => studies.some((old: any) => old.plan.privateSeed === s.plan.privateSeed))).toBe(false); expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(queued);
  const next = await page.evaluate(w => (window as any).StemLab.evoArchipelagoModel.step(w), queued); await page.getByRole('button', { name: 'Advance one generation', exact: true }).click(); expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(next);
  const contexts = (await harness.glContexts(page)).filter(c => c.connected && !c.lost); expect(contexts).toHaveLength(1); expect(contexts[0].draws).toBeGreaterThan(0); expect(errors).toEqual([]);
});

test('phone learners test the selection-off collection, explore ties and private batches with native keyboard controls, and retain accessible no-WebGL layouts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any; });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); const world = await fixture(page, true, false);
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; }); await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'fallback');
  const weatherPanel = await openWeather(page, true), original = await makeWeather(page, weatherPanel, false), panel = await openCollection(weatherPanel, true);
  await panel.locator(prefix + '-species').focus(); await page.keyboard.press('End'); await expect(panel.locator(prefix + '-species')).toHaveValue('plants'); await panel.locator(prefix + '-island').focus(); await page.keyboard.press('End'); await expect(panel.locator(prefix + '-island')).toHaveValue('2');
  await panel.locator(prefix + '-generation').focus(); await page.keyboard.press('End'); await expect(panel.locator(prefix + '-generation')).toHaveValue('4'); await panel.locator(prefix + '-metric').focus(); await page.keyboard.press('Home'); await expect(panel.locator(prefix + '-metric')).toHaveValue('trait'); await panel.locator(prefix + '-direction').focus(); await page.keyboard.press('End'); await expect(panel.locator(prefix + '-direction')).toHaveValue('mixed');
  const reason = 'Selection is off, so different weather settings cannot alter parent weights. Every paired inherited cohort should match while private seeds differ between pairs.';
  await panel.locator(prefix + '-prediction').fill(reason); await panel.getByRole('button', { name: 'Collect 8 new weather pairs', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(panel).toHaveAttribute('data-climate-collection', 'complete', { timeout: 120_000 });
  const first = await download(page, panel), firstStudies = await verifyCollection(page, panel, first, world, original, 8); await verifyResponse(panel, firstStudies, 4, 'plants', 2, 'trait'); await reviewCapturedPlan(panel, first);
  const firstExact = panel.getByText('Read every paired value', { exact: true }); if (await firstExact.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open)) await firstExact.click();
  await panel.locator('xpath=ancestor::details[1]').screenshot({ path: report + '/weather-collection-phone.png' });
  for (const count of [16, 24, 32]) { await panel.getByRole('button', { name: 'Add 8 weather pairs', exact: true }).focus(); await page.keyboard.press('Space'); await expect(panel).toHaveAttribute('data-climate-collection-count', String(count), { timeout: 120_000 }); }
  const raw = await download(page, panel), studies = await verifyCollection(page, panel, raw, world, original, 32);
  expect(raw.lockedQuestion).toEqual({ species: 'plants', island: 2, generation: 4, metric: 'trait', direction: 'mixed' }); await expect(panel.locator('[data-climate-collection-null]')).toBeVisible();
  for (const s of studies) { expect(s.steady.rng).toBe(s.changing.rng); expect(s.equalCohorts).toEqual([true, true, true, true, true]); }
  for (const metric of ['trait', 'marker', 'diversity'] as const) {
    const response = await verifyResponse(panel, studies, 4, 'plants', 2, metric); expect(response.every(row => row.difference === 0)).toBe(true); expect(await scalar(panel.locator('[data-climate-collection-summary]'), 'zero')).toBe(32);
  }
  await returnToCapturedQuestion(page, panel, raw);
  await panel.locator(prefix + '-trial').focus(); await page.keyboard.press('End'); await expect(panel.locator(prefix + '-trial')).toHaveValue('31');
  await panel.getByRole('button', { name: 'Inspect this weather pair', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(weatherPanel).toHaveAttribute('data-climate-batch', String(studies[31].plan.batch));
  await expect(weatherPanel.locator(weather + '-species')).toHaveValue('plants'); await expect(weatherPanel.locator(weather + '-island')).toHaveValue('2'); await expect(weatherPanel.locator(weather + '-generation')).toHaveValue('4');
  await panel.getByRole('button', { name: 'Save repeated weather finding', exact: true }).focus(); await page.keyboard.press('Enter'); expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoClimateCollection.text)).toContain(reason);
  const after = await download(page, panel); expect(after.recipe).toEqual(raw.recipe); expect(after.lockedQuestion).toEqual(raw.lockedQuestion); expect(after.prediction).toBe(reason); expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(world);
  for (const suffix of ['-species', '-island', '-generation', '-metric', '-trial']) { await expect(panel.locator(prefix + suffix)).toHaveAccessibleName(/\S+/); expect(await panel.locator(prefix + suffix).evaluate((el: Element) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44); }
  for (const name of ['Add 8 weather pairs', 'Start another weather question', 'Inspect this weather pair', 'Save repeated weather finding', 'Download repeated weather collection']) expect(await panel.getByRole('button', { name, exact: true }).evaluate((el: Element) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); const violations = await page.evaluate(async () => (window as any).axe.run('[data-archipelago]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })))); expect(violations).toEqual([]);
  const pageWidths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth })); expect(pageWidths.scroll).toBeLessThanOrEqual(pageWidths.client + 1); await reviewCapturedPlan(panel, after);
  const exact = panel.getByText('Read every paired value', { exact: true }); if (await exact.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open)) await exact.click();
  await panel.locator('xpath=ancestor::details[1]').screenshot({ path: report + '/weather-collection-phone-32.png' });
  const next = await page.evaluate(w => (window as any).StemLab.evoArchipelagoModel.step(w), world); await page.getByRole('button', { name: 'Advance one generation', exact: true }).click(); expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(next);
  expect((await harness.glContexts(page)).filter(c => c.connected && !c.lost)).toHaveLength(0); expect(errors).toEqual([]);
});
