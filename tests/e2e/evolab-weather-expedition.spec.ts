import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
const prefix = '#ea-climate';
const prediction = 'A changing rainfall sequence may shift which inherited traits contribute offspring, but each generation is still a finite sample. I expect a delayed and variable response rather than organisms changing because they need to.';

test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const setRange = async (page: any, selector: string, value: number) => page.locator(selector).evaluate((input: HTMLInputElement, v: number) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v));
  input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
}, value);

async function fixture(page: any, noGL = false, selection = true, rounds = 3) {
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: !noGL });
  const world = await page.evaluate(({ enabled, count }) => {
    const m = (window as any).StemLab.evoArchipelagoModel;
    let w = m.create(21, !enabled); w.settings.migration = .4; w.settings.mutation = .03; w.settings.selection = enabled;
    for (let i = 0; i < count; i++) w = m.step(w);
    return w;
  }, { enabled: selection, count: rounds });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: world } }, undefined, { expectCanvas: !noGL });
  return world;
}

async function openClimate(page: any, keyboard = false) {
  const nav = page.getByRole('button', { name: 'Plan a weather expedition', exact: true });
  if (keyboard) { await nav.focus(); await nav.press('Enter'); } else await nav.click();
  const summary = page.getByText('Follow evolution through changing weather', { exact: true });
  await expect(summary).toHaveCount(1);
  const open = await summary.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open);
  if (!open) { if (keyboard) { await summary.focus(); await summary.press('Enter'); } else await summary.click(); }
  const panel = page.locator('section[data-climate-expedition]'); await expect(panel).toBeVisible(); return panel;
}

async function scalar(panel: any, attribute: string) {
  const value = await panel.evaluate((el: Element, attr: string) => {
    const target = el.hasAttribute(attr) ? el : el.querySelector('[' + attr + ']');
    return target ? target.getAttribute(attr) : null;
  }, attribute);
  expect(value, 'missing ' + attribute).not.toBeNull(); return value === 'null' ? null : Number(value);
}

function independentStats(members: any[]) {
  if (!members.length) return { size: 0, mean: null, H: null };
  const mean = members.reduce((sum: number, o: any) => sum + (o.genes[0] + o.genes[1]) / 2, 0) / members.length;
  const A = members.reduce((sum: number, o: any) => sum + Number(o.marker[0]) + Number(o.marker[1]), 0), p = A / (2 * members.length);
  return { size: members.length, mean, H: 2 * p * (1 - p) };
}

async function downloadExpedition(page: any, panel: any) {
  const pending = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Download weather expedition', exact: true }).click();
  return JSON.parse(readFileSync((await (await pending).path())!, 'utf8'));
}

async function verifyCapturedSchedule(panel: any, schedule: number[][], start: number) {
  const summary = panel.getByText('Review the captured rainfall plan', { exact: true });
  if (!(await summary.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open))) await summary.click();
  const captured = panel.locator('[data-climate-captured-schedule]'); await expect(captured).toBeVisible();
  await expect(captured.locator('[data-climate-scheduled-round]')).toHaveCount(schedule.length);
  for (let i = 0; i < schedule.length; i++) {
    const round = captured.locator('[data-climate-scheduled-round="' + i + '"]'); await expect(round.locator('strong')).toHaveText('G' + (start + i + 1));
    await expect(round.locator('[data-climate-scheduled-island]')).toHaveCount(3);
    for (let island = 0; island < 3; island++) {
      const cell = round.locator('[data-climate-scheduled-island="' + island + '"]');
      expect(Number(await cell.getAttribute('data-climate-scheduled-rain'))).toBe(schedule[i][island]); await expect(cell).toContainText(schedule[i][island].toFixed(2));
    }
  }
}

async function verifyExport(page: any, raw: any, world: any) {
  expect(raw.format).toBe('evolab-weather-expedition'); expect(raw.version).toBe(1);
  expect(raw.prediction).toBeTruthy(); expect(raw.protocol).toBeTruthy(); expect(raw.limits).toBeTruthy();
  const study = await page.evaluate(data => (window as any).StemLab.evoArchipelagoModel.climateStudy(data.recipe), raw);
  expect(study).toBeTruthy();
  // The normalized recipe captures the complete starting checkpoint, so later main-world changes cannot rewrite this study.
  const source = await page.evaluate(data => (window as any).StemLab.evoArchipelagoModel.restoreCheckpoint(data.recipe.source), raw);
  expect(source).toEqual(world);
  expect(raw.result.steady.series).toEqual(study.steady.series); expect(raw.result.changing.series).toEqual(study.changing.series);
  const independent = await page.evaluate(data => {
    const m = (window as any).StemLab.evoArchipelagoModel, plan = data.recipe;
    function branch(changing: boolean) {
      let w = m.restoreCheckpoint(plan.source); w = { ...w, rng: plan.privateSeed, privateSeed: plan.privateSeed, privateResearch: true, privateKind: 'climate' };
      for (let round = 0; round < plan.schedule.length; round++) {
        w.settings = { ...plan.settings, rainfall: changing ? plan.schedule[round].slice() : plan.settings.rainfall.slice() };
        w = m.step(w);
      }
      return w;
    }
    return { steady: branch(false), changing: branch(true) };
  }, raw);
  expect(independent.steady).toEqual(study.steady.world); expect(independent.changing).toEqual(study.changing.world);
  const start = source.generation;
  expect(study.steady.series).toHaveLength(raw.recipe.schedule.length + 1);
  for (const condition of ['steady', 'changing'] as const) {
    const branch = study[condition];
    expect(branch.series[0].generation).toBe(start); expect(branch.series[0].rainfall).toBeNull();
    for (let i = 0; i < branch.series.length; i++) {
      const item = branch.series[i], frame = branch.world.history[start + i];
      expect(item.generation).toBe(start + i);
      if (i) {
        const rain = condition === 'steady' ? world.settings.rainfall : raw.recipe.schedule[i - 1];
        expect(item.rainfall).toEqual(rain); expect(frame.round.settings.rainfall).toEqual(rain);
      }
      for (const species of ['birds', 'plants']) for (let island = 0; island < 3; island++) {
        const actual = item[species].rows[island], stats = independentStats(frame.demes[island][species]);
        expect(actual.size).toBe(stats.size);
        if (stats.mean === null) { expect(actual.mean).toBeNull(); expect(actual.H).toBeNull(); }
        else { expect(actual.mean).toBeCloseTo(stats.mean, 14); expect(actual.H).toBeCloseTo(stats.H!, 14); }
      }
    }
  }
  return study;
}

async function verifyView(panel: any, study: any, index: number, species: string, island: number, condition: string) {
  await panel.locator(prefix + '-generation').selectOption(String(index));
  await panel.locator(prefix + '-species').selectOption(species); await panel.locator(prefix + '-island').selectOption(String(island));
  await panel.locator(prefix + '-condition').selectOption(condition);
  const start = study.steady.series[0].generation;
  for (const lens of ['steady', 'changing']) {
    const card = panel.locator('[data-climate-condition="' + lens + '"][data-climate-cohort-generation]');
    await expect(card).toHaveCount(1); await expect(card).toHaveAttribute('data-climate-cohort-generation', String(start + index));
    const stats = independentStats(study[lens].world.history[start + index].demes[island][species]);
    expect(await scalar(card, 'data-climate-size')).toBe(stats.size);
    const mean = await scalar(card, 'data-climate-mean'), H = await scalar(card, 'data-climate-h');
    if (stats.mean === null) { expect(mean).toBeNull(); expect(H).toBeNull(); }
    else { expect(mean).toBeCloseTo(stats.mean, 14); expect(H).toBeCloseTo(stats.H!, 14); }
    if (!index) await expect(card.locator('[data-climate-rain]')).toHaveCount(0);
    else expect(await scalar(card, 'data-climate-rain')).toBe(study[lens].series[index].rainfall[island]);
  }
  const chart = panel.locator('svg[data-climate-chart]'); await expect(chart).toHaveAccessibleName(/\S+/); await expect(chart).toHaveAttribute('viewBox', '0 0 590 245');
  const points = await chart.locator('[data-climate-point]').evaluateAll((els: Element[]) => els.map(el => ({ key: el.getAttribute('data-climate-point'), value: Number(el.getAttribute('data-climate-value')), cx: Number(el.getAttribute('cx')), cy: Number(el.getAttribute('cy')), r: Number(el.getAttribute('r')) })));
  expect(points).toHaveLength(study.steady.series.length * 2);
  for (const lens of ['steady', 'changing']) for (let i = 0; i < study[lens].series.length; i++) {
    const point = points.find((p: any) => p.key === lens + ':' + i); expect(point).toBeTruthy();
    const mean = independentStats(study[lens].world.history[start + i].demes[island][species]).mean!;
    expect(point!.value).toBeCloseTo(mean, 14);
    expect(point!.cx).toBeCloseTo(48 + i / (study[lens].series.length - 1) * 490, 11);
    expect(point!.cy).toBeCloseTo(190 - mean * 152, 11);
    expect(point!.r).toBe(lens === condition && i === index ? 7 : 4);
  }
  await expect(panel.locator('svg[data-climate-map][role=img]')).toHaveAccessibleName(/\S+/);
  return study[condition].world.history[start + index].demes[island][species];
}

async function verifyPrivateFamily(page: any, panel: any, study: any, index: number, species: string, island: number, condition: string) {
  const generation = study[condition].series[index].generation, world = study[condition].world;
  const members = world.history[generation].demes[island][species]; expect(members.length).toBeGreaterThan(0);
  const child = members[Math.min(3, members.length - 1)];
  const summary = panel.getByText('Follow a private organism’s copies', { exact: true });
  const open = await summary.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open); if (!open) await summary.click();
  await panel.locator(prefix + '-resident').selectOption(String(child.id));
  const family = panel.locator('[data-climate-family]'); await expect(family).toHaveAttribute('data-climate-family', String(child.id));
  const parents = world.history[generation - 1].demes.flatMap((d: any) => d[species]);
  for (let j = 0; j < child.parents.length; j++) {
    const id = child.parents[j];
    const parent = parents.find((o: any) => o.id === id); expect(parent).toBeTruthy();
    expect(child.marker[j]).toBe(parent.marker[child.inheritance[j].markerCopy]);
    const row = family.locator('[data-climate-parent="' + j + '"]'); await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute('data-climate-parent-id', String(id));
    expect(Number(await row.getAttribute('data-climate-copy-before'))).toBe(parent.genes[child.inheritance[j].copy]);
    expect(Number(await row.getAttribute('data-climate-copy-after'))).toBe(child.genes[j]);
    expect(Number(await row.getAttribute('data-climate-copy-marker'))).toBe(child.marker[j]);
  }
  const passport = panel.locator('[data-allele-passport="ea-climate-passport"]'); await expect(passport).toHaveCount(1);
  const passportSummary = passport.locator('summary'); if (!(await passport.evaluate((el: HTMLDetailsElement) => el.open))) await passportSummary.click();
  for (const copy of [0, 1]) {
    await passport.locator(prefix + '-passport-copy').selectOption(String(copy));
    const expected = await page.evaluate(({ w, id, c }) => (window as any).StemLab.evoArchipelagoModel.alleleTrail(w, id, c, 'marker'), { w: world, id: child.id, c: copy });
    const steps = await passport.locator('[data-passport-generation]').evaluateAll((els: Element[]) => els.map(el => ({ generation: Number(el.getAttribute('data-passport-generation')), id: Number(el.getAttribute('data-passport-id')), copy: Number(el.getAttribute('data-passport-copy')), value: Number(el.getAttribute('data-passport-value')) })));
    expect(steps).toEqual(expected.steps.map((s: any) => ({ generation: s.generation, id: s.id, copy: s.copy, value: s.value })));
    expect(steps[steps.length - 1].id).toBe(child.id); expect(steps[steps.length - 1].value).toBe(child.marker[copy]);
  }
}

test('captured weather schedules compare exact private futures, preserve locked predictions, trace inheritance and leave the expedition untouched', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const world = await fixture(page), panel = await openClimate(page), run = panel.getByRole('button', { name: 'Run weather expedition', exact: true });
  await expect(panel).toHaveAttribute('data-climate-expedition', 'ready'); await expect(run).toBeDisabled();
  await panel.locator(prefix + '-prediction').fill('   '); await expect(run).toBeDisabled();
  await panel.locator(prefix + '-target').selectOption('1'); await panel.getByRole('button', { name: 'Gradual climate reversal', exact: true }).click();
  const gradual = await panel.locator('input[id^="ea-climate-rain-"]').evaluateAll((els: HTMLInputElement[]) => els.map(el => Number(el.value)));
  expect(gradual).toHaveLength(4); expect(new Set(gradual).size).toBeGreaterThan(1);
  await panel.getByRole('button', { name: 'Abrupt dry season', exact: true }).click();
  const abrupt = await panel.locator('input[id^="ea-climate-rain-"]').evaluateAll((els: HTMLInputElement[]) => els.map(el => Number(el.value))); expect(abrupt).not.toEqual(gradual);
  const schedule = [.15, .35, .8, .95]; for (let i = 0; i < schedule.length; i++) await setRange(page, prefix + '-rain-' + i, schedule[i]);
  await panel.locator(prefix + '-prediction').fill(prediction); await expect(run).toBeEnabled(); await run.click();
  await expect(panel).toHaveAttribute('data-climate-expedition', 'complete'); await expect(panel).toHaveAttribute('data-climate-start', '3'); await expect(panel).toHaveAttribute('data-climate-end', '7');
  const captured = await downloadExpedition(page, panel), study = await verifyExport(page, captured, world);
  expect(captured.prediction).toBe(prediction); expect(captured.recipe.schedule).toEqual(schedule.map(r => world.settings.rainfall.map((v: number, i: number) => i === 1 ? r : v)));
  await verifyCapturedSchedule(panel, captured.recipe.schedule, world.generation);
  await panel.getByRole('button', { name: 'Play recorded future', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Pause playback', exact: true })).toHaveAttribute('aria-pressed', 'true'); await expect(panel.locator(prefix + '-generation')).toHaveValue('0');
  await expect(panel.locator(prefix + '-generation')).toHaveValue('1', { timeout: 6000 });
  await panel.getByRole('button', { name: 'Pause playback', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Play recorded future', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(1600); await expect(panel.locator(prefix + '-generation')).toHaveValue('1');
  await panel.getByRole('button', { name: 'Next private generation', exact: true }).click(); await expect(panel.locator(prefix + '-generation')).toHaveValue('2');
  await panel.getByRole('button', { name: 'Previous private generation', exact: true }).click(); await expect(panel.locator(prefix + '-generation')).toHaveValue('1');
  const played = await downloadExpedition(page, panel); expect(played.recipe).toEqual(captured.recipe); expect(played.result).toEqual(captured.result);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(world);
  for (const species of ['birds', 'plants']) for (const island of [0, 1, 2]) for (const index of [0, 2, 4]) await verifyView(panel, study, index, species, island, 'changing');
  await verifyView(panel, study, 4, 'birds', 1, 'steady');
  await panel.locator('[data-climate-point="changing:1"]').click();
  await expect(panel.locator(prefix + '-generation')).toHaveValue('1'); await expect(panel.locator(prefix + '-condition')).toHaveValue('changing');
  await expect(panel.locator('[data-climate-point="changing:1"]')).toHaveAttribute('r', '7');
  await verifyView(panel, study, 1, 'birds', 1, 'changing');
  await verifyView(panel, study, 4, 'birds', 1, 'changing'); await verifyPrivateFamily(page, panel, study, 4, 'birds', 1, 'changing');
  await verifyView(panel, study, 2, 'plants', 2, 'steady'); await verifyPrivateFamily(page, panel, study, 2, 'plants', 2, 'steady');
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(world);
  await page.locator('#ea-explanation').fill('My recorded expedition must retain its own independent evidence.'); await page.getByRole('button', { name: 'Save island evidence to journal', exact: true }).click();
  const originalNote = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoEvidence.text);
  await panel.getByRole('button', { name: 'Save weather expedition to journal', exact: true }).click();
  const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes); expect(notes.archipelagoEvidence.text).toBe(originalNote); expect(notes.archipelagoClimate.text).toContain(prediction);
  await panel.locator('xpath=ancestor::details[1]').screenshot({ path: report + '/weather-expedition-desktop.png' });

  await panel.locator(prefix + '-prediction').fill('A new draft is independent of the already captured prediction.'); await setRange(page, prefix + '-rain-0', .99);
  await expect(panel.locator('[data-climate-stale]')).toBeVisible();
  const unchanged = await downloadExpedition(page, panel); expect(unchanged.recipe).toEqual(captured.recipe); expect(unchanged.prediction).toBe(prediction); expect(unchanged.result).toEqual(captured.result);
  await verifyCapturedSchedule(panel, captured.recipe.schedule, world.generation);
  await setRange(page, '#ea-migration', 0); await setRange(page, '#ea-rain-1', .25);
  const queued = await page.evaluate(() => (window as any).__toolData.evoLab.archipelago); expect(queued.history).toEqual(world.history); expect(queued.rng).toBe(world.rng);
  const stillCaptured = await downloadExpedition(page, panel); await verifyExport(page, stillCaptured, world); expect(stillCaptured.recipe).toEqual(captured.recipe);
  await panel.getByRole('button', { name: 'Repeat captured weather expedition', exact: true }).click();
  await expect(panel).toHaveAttribute('data-climate-batch', String(captured.recipe.batch + 1));
  const repeated = await downloadExpedition(page, panel), repeatedStudy = await verifyExport(page, repeated, world);
  expect(repeated.recipe.batch).toBe(captured.recipe.batch + 1); expect(repeated.recipe.schedule).toEqual(captured.recipe.schedule); expect(repeated.prediction).toBe(prediction); expect(repeated.recipe.privateSeed).not.toBe(captured.recipe.privateSeed);
  expect(repeatedStudy.changing.world).not.toEqual(study.changing.world); expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(queued);
  const explanation = 'Comparing new paired random futures helps distinguish the captured model trajectory from a general claim about natural climate responses.';
  await panel.locator(prefix + '-explanation').fill(explanation); await verifyView(panel, repeatedStudy, 2, 'plants', 2, 'steady');
  const next = await page.evaluate(w => (window as any).StemLab.evoArchipelagoModel.step(w), queued);
  await page.getByRole('button', { name: 'Advance one generation', exact: true }).click(); expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(next);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: next } });
  const replayPanel = await openClimate(page); await expect(replayPanel).toHaveAttribute('data-climate-expedition', 'ready'); await expect(replayPanel.locator('svg[data-climate-chart]')).toHaveCount(0);
  await replayPanel.getByRole('button', { name: 'Replay saved weather expedition', exact: true }).click(); await expect(replayPanel).toHaveAttribute('data-climate-expedition', 'complete');
  const replayed = await downloadExpedition(page, replayPanel); await verifyExport(page, replayed, world); expect(replayed.recipe).toEqual(repeated.recipe); expect(replayed.prediction).toBe(prediction); expect(replayed.explanation).toBe(explanation);
  await expect(replayPanel.locator(prefix + '-generation')).toHaveValue('2'); await expect(replayPanel.locator(prefix + '-species')).toHaveValue('plants'); await expect(replayPanel.locator(prefix + '-island')).toHaveValue('2'); await expect(replayPanel.locator(prefix + '-condition')).toHaveValue('steady');
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(next);
  const contexts = (await harness.glContexts(page)).filter(c => c.connected && !c.lost); expect(contexts).toHaveLength(1); expect(contexts[0].draws).toBeGreaterThan(0); expect(errors).toEqual([]);
});

test('phone learners plan weather with native keyboard controls, inspect the selection-off control and reach the recorded generation limit accessibly without WebGL', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any; });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); const world = await fixture(page, true, false, 0);
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'fallback');
  const panel = await openClimate(page, true); await panel.locator(prefix + '-target').focus(); await page.keyboard.press('End'); await expect(panel.locator(prefix + '-target')).toHaveValue('2');
  await panel.getByRole('button', { name: 'Keep rainfall steady', exact: true }).focus(); await page.keyboard.press('Enter');
  for (let i = 0; i < 4; i++) await expect(panel.locator(prefix + '-rain-' + i)).toHaveValue(String(world.settings.rainfall[2]));
  const firstRain = panel.locator(prefix + '-rain-0'); await expect(firstRain).toHaveAccessibleName('Rainfall in future round 1'); await firstRain.focus(); await page.keyboard.press('Home');
  const low = Number(await firstRain.inputValue()); await page.keyboard.press('End'); const high = Number(await firstRain.inputValue()); expect(high).toBeGreaterThan(low);
  await page.keyboard.press('ArrowLeft'); expect(Number(await firstRain.inputValue())).toBeLessThan(high);
  await panel.getByRole('button', { name: 'Gradual climate reversal', exact: true }).focus(); await page.keyboard.press('Space');
  await panel.locator(prefix + '-prediction').fill('With selection off, rainfall cannot change parent weights; matched random draws should keep the two populations identical even while their weather differs.');
  await panel.getByRole('button', { name: 'Run weather expedition', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(panel).toHaveAttribute('data-climate-expedition', 'complete'); await expect(panel.locator('[data-climate-null-control]')).toBeVisible();
  const raw = await downloadExpedition(page, panel), study = await verifyExport(page, raw, world);
  await verifyCapturedSchedule(panel, raw.recipe.schedule, world.generation);
  expect(study.steady.world.rng).toBe(study.changing.world.rng);
  for (let i = 0; i <= 4; i++) expect(study.steady.world.history[i].demes).toEqual(study.changing.world.history[i].demes);
  expect(study.steady.series.slice(1).some((r: any, i: number) => JSON.stringify(r.rainfall) !== JSON.stringify(study.changing.series[i + 1].rainfall))).toBe(true);
  await panel.getByRole('button', { name: 'Previous private generation', exact: true }).focus(); await page.keyboard.press('Space'); await expect(panel.locator(prefix + '-generation')).toHaveValue('3');
  await panel.getByRole('button', { name: 'Next private generation', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(panel.locator(prefix + '-generation')).toHaveValue('4');
  await panel.getByRole('button', { name: 'Play recorded future', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(panel.getByRole('button', { name: 'Pause playback', exact: true })).toHaveAttribute('aria-pressed', 'true'); await expect(panel.locator(prefix + '-generation')).toHaveValue('0');
  await panel.locator(prefix + '-generation').focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await expect(panel.locator(prefix + '-generation')).toHaveValue('2');
  await expect(panel.getByRole('button', { name: 'Play recorded future', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(1600); await expect(panel.locator(prefix + '-generation')).toHaveValue('2');
  const manuallyPaused = await downloadExpedition(page, panel); expect(manuallyPaused.recipe).toEqual(raw.recipe); expect(manuallyPaused.result).toEqual(raw.result); expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(world);
  await panel.locator(prefix + '-generation').focus(); await page.keyboard.press('End'); await expect(panel.locator(prefix + '-generation')).toHaveValue('4');
  await panel.locator(prefix + '-species').focus(); await page.keyboard.press('End'); await expect(panel.locator(prefix + '-species')).toHaveValue('plants');
  await panel.locator(prefix + '-island').focus(); await page.keyboard.press('End'); await expect(panel.locator(prefix + '-island')).toHaveValue('2');
  await panel.locator(prefix + '-condition').focus(); await page.keyboard.press('End'); await expect(panel.locator(prefix + '-condition')).toHaveValue('changing');
  await verifyView(panel, study, 4, 'plants', 2, 'changing'); await verifyPrivateFamily(page, panel, study, 4, 'plants', 2, 'changing');
  await panel.getByRole('button', { name: 'Save weather expedition to journal', exact: true }).focus(); await page.keyboard.press('Enter');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoClimate.text)).toContain(raw.prediction);
  const exported = await downloadExpedition(page, panel); await verifyExport(page, exported, world); expect(exported.view.generation).toBe(4); expect(exported.view.species).toBe('plants'); expect(exported.view.island).toBe(2); expect(exported.view.condition).toBe('changing');
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(world);
  for (const name of ['Run weather expedition', 'Repeat captured weather expedition', 'Save weather expedition to journal', 'Download weather expedition', 'Gradual climate reversal', 'Abrupt dry season', 'Keep rainfall steady', 'Previous private generation', 'Next private generation', 'Play recorded future']) {
    expect(await panel.getByRole('button', { name, exact: true }).evaluate((el: Element) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
  for (const suffix of ['-target', '-generation', '-species', '-island', '-condition', '-resident']) {
    expect(await panel.locator(prefix + suffix).evaluate((el: Element) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44); await expect(panel.locator(prefix + suffix)).toHaveAccessibleName(/\S+/);
  }
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-archipelago]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })))); expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await panel.locator('xpath=ancestor::details[1]').screenshot({ path: report + '/weather-expedition-phone.png' });
  let boundaryWorld = await page.evaluate(w => { const m = (window as any).StemLab.evoArchipelagoModel; let next = w; while (next.generation < 39) next = m.step(next); return next; }, world);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: boundaryWorld } }, undefined, { expectCanvas: false });
  const boundary = await openClimate(page, true); await expect(boundary.locator('input[id^="ea-climate-rain-"]')).toHaveCount(1);
  await boundary.locator(prefix + '-prediction').fill('Only one future round remains within the generation-40 recording limit.'); await boundary.getByRole('button', { name: 'Run weather expedition', exact: true }).click();
  await expect(boundary).toHaveAttribute('data-climate-end', '40'); const boundaryExport = await downloadExpedition(page, boundary); await verifyExport(page, boundaryExport, boundaryWorld); expect(boundaryExport.recipe.schedule).toHaveLength(1);
  await verifyCapturedSchedule(boundary, boundaryExport.recipe.schedule, 39);
  boundaryWorld = await page.evaluate(w => (window as any).StemLab.evoArchipelagoModel.step(w), boundaryWorld);
  await page.getByRole('button', { name: 'Advance one generation', exact: true }).click(); expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(boundaryWorld);
  await expect(boundary.getByRole('button', { name: 'Run weather expedition', exact: true })).toBeDisabled();
  expect((await harness.glContexts(page)).filter(c => c.connected && !c.lost)).toHaveLength(0); expect(errors).toEqual([]);
});
