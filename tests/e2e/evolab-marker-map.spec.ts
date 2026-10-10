import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
const prefix = '#ea-marker-map';
const speciesNames: Record<string, string> = { birds: 'Seedwing birds', plants: 'Shellseed plants' };

test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const setRange = async (page: any, selector: string, value: number) => page.locator(selector).evaluate((input: HTMLInputElement, v: number) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v));
  input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
}, value);

async function fixture(page: any, noGL = false) {
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: !noGL });
  const world = await page.evaluate(() => {
    const m = (window as any).StemLab.evoArchipelagoModel;
    let w = m.create(21); w.settings.migration = .4; w.settings.mutation = .03;
    for (let i = 0; i < 3; i++) w = m.step(w);
    return w;
  });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: world } }, undefined, { expectCanvas: !noGL });
  return world;
}

async function openMap(page: any, keyboard = false) {
  const nav = page.getByRole('button', { name: 'Explore marker copies', exact: true });
  if (keyboard) { await nav.focus(); await nav.press('Enter'); } else await nav.click();
  const summary = page.getByText('Explore two marker copies', { exact: true });
  await expect(summary).toHaveCount(1);
  const isOpen = await summary.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open);
  if (!isOpen) { await summary.focus(); await summary.press('Enter'); }
  const panel = page.locator('section[data-marker-map]');
  await expect(panel).toBeVisible();
  return panel;
}

async function scalar(panel: any, attribute: string) {
  const value = await panel.evaluate((el: Element, attr: string) => {
    const target = el.hasAttribute(attr) ? el : el.querySelector('[' + attr + ']');
    return target ? target.getAttribute(attr) : null;
  }, attribute);
  expect(value, 'missing ' + attribute).not.toBeNull();
  return Number(value);
}

function independent(frame: any, species: string) {
  const rows = frame.demes.map((deme: any) => {
    const members = deme[species], copies = members.flatMap((o: any) => o.marker);
    const A = copies.filter((v: number) => v === 1).length, a = copies.length - A;
    const p = copies.length ? A / copies.length : null;
    return { members, copies, A, a, p, H: p === null ? null : 2 * p * (1 - p), observed: members.length ? members.filter((o: any) => o.marker[0] !== o.marker[1]).length / members.length : null };
  });
  const A = rows.reduce((n: number, r: any) => n + r.A, 0), total = rows.reduce((n: number, r: any) => n + r.copies.length, 0);
  const p = total ? A / total : null;
  return { rows, A, a: total - A, total, pooled: p === null ? null : 2 * p * (1 - p), within: total ? rows.reduce((n: number, r: any) => n + (r.H === null ? 0 : r.H * r.copies.length), 0) / total : null };
}

function pairProbability(stats: any, from: number, to: number) {
  const p = stats.rows[from].p, q = stats.rows[to].p;
  return p === null || q === null ? null : p * (1 - q) + (1 - p) * q;
}

async function verifyMap(panel: any, frame: any, species: string, kind: string, generation: number) {
  const stats = independent(frame, species);
  await expect(panel).toHaveAttribute('data-marker-map', kind);
  await expect(panel).toHaveAttribute('data-marker-map-generation', String(generation));
  await expect(panel).toHaveAttribute('data-marker-map-species', species);
  expect(await scalar(panel, 'data-map-pooled')).toBeCloseTo(stats.pooled, 14);
  expect(await scalar(panel, 'data-map-within')).toBeCloseTo(stats.within, 14);
  const rows = panel.locator('[data-map-island]'); await expect(rows).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    expect(await scalar(panel.locator('[data-map-island="' + i + '"]'), 'data-map-observed')).toBe(stats.rows[i].observed);
  }
  const matrix = panel.locator('button[data-marker-pair]'); await expect(matrix).toHaveCount(9);
  for (let from = 0; from < 3; from++) for (let to = 0; to < 3; to++) {
    const button = panel.locator('button[data-marker-pair="' + from + ':' + to + '"]');
    expect(Number(await button.getAttribute('data-marker-pair-probability'))).toBeCloseTo(pairProbability(stats, from, to), 14);
  }
  const from = Number(await panel.locator(prefix + '-from').inputValue()), to = Number(await panel.locator(prefix + '-to').inputValue());
  expect(await scalar(panel, 'data-map-difference')).toBeCloseTo(pairProbability(stats, from, to), 14);
  const p = stats.rows[from].p, q = stats.rows[to].p;
  const ordered = [(1 - p) * (1 - q), (1 - p) * q, p * (1 - q), p * q];
  await expect(panel.locator('[data-map-outcome]')).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    const outcome = panel.locator('[data-map-outcome="' + i + '"]');
    expect(Number(await outcome.getAttribute('data-map-outcome-probability'))).toBeCloseTo(ordered[i], 14);
    await expect(outcome).toHaveAttribute('data-map-outcome-different', String(i === 1 || i === 2));
  }
  expect(await scalar(panel, 'data-map-gap')).toBeCloseTo(stats.pooled - stats.within, 14);
  await verifyCopy(panel, frame, species, from, 'first'); await verifyCopy(panel, frame, species, to, 'second');
  return stats;
}

async function verifyCopy(panel: any, frame: any, species: string, island: number, side: 'first' | 'second') {
  const [id, copy] = (await panel.locator(prefix + '-copy-' + side).inputValue()).split(':').map(Number);
  const organism = frame.demes[island][species].find((o: any) => o.id === id);
  expect(organism).toBeTruthy(); expect([0, 1]).toContain(copy);
  const selected = panel.locator('[data-map-selected="' + side + '"]');
  await expect(selected).toHaveCount(1);
  await expect(selected).toHaveAttribute('data-map-id', String(id));
  await expect(selected).toHaveAttribute('data-map-slot', String(copy));
  await expect(selected.locator('[data-map-letter]')).toHaveAttribute('data-map-letter', organism.marker[copy] ? 'A' : 'a');
  return { id, copy, letter: organism.marker[copy] ? 'A' : 'a' };
}

async function teachingFrame(page: any, kind: string) {
  return page.evaluate(value => (window as any).StemLab.evoArchipelagoModel.markerMapCase(value), kind);
}

async function downloadMap(page: any, panel: any) {
  const pending = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Download marker map evidence', exact: true }).click();
  return JSON.parse(readFileSync((await (await pending).path())!, 'utf8'));
}

async function verifyExport(page: any, raw: any, world: any, kind: string, species: string, generation: number) {
  expect(raw.format).toBe('evolab-marker-map'); expect(raw.version).toBe(1);
  expect(raw.generation).toBe(generation); expect(raw.recipe.case).toBe(kind); expect(raw.recipe.species).toBe(species);
  expect(raw.protocol).toBeTruthy(); expect(raw.limits).toBeTruthy();
  const replay = await page.evaluate(data => {
    const m = (window as any).StemLab.evoArchipelagoModel, source = m.restoreCheckpoint(data.source);
    const frame = data.recipe.case === 'recorded' ? source.history[data.generation] : m.markerMapCase(data.recipe.case);
    return { world: source, frame, evidence: m.markerMap(frame, data.recipe.species) };
  }, raw);
  expect(replay.world).toEqual(world); expect(replay.evidence).toEqual(raw.evidence);
  const stats = independent(replay.frame, species), recipe = raw.recipe;
  expect(recipe.from).toBeGreaterThanOrEqual(0); expect(recipe.from).toBeLessThan(3);
  expect(recipe.to).toBeGreaterThanOrEqual(0); expect(recipe.to).toBeLessThan(3);
  for (const [side, island] of [['first', recipe.from], ['second', recipe.to]] as const) {
    expect([0, 1]).toContain(recipe[side].copy);
    expect(stats.rows[island].members.some((o: any) => o.id === recipe[side].id)).toBe(true);
  }
  return replay;
}

test('marker copies explain within-island, pooled and observed variation without altering the recorded expedition or queued future', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const world = await fixture(page), panel = await openMap(page);
  const recorded = world.history[3];
  const stats = await verifyMap(panel, recorded, 'birds', 'recorded', 3);
  expect(stats.rows.some((row: any) => Math.abs(row.H - row.observed) > .000001)).toBe(true);
  for (let from = 0; from < 3; from++) for (let to = 0; to < 3; to++) {
    await panel.locator('button[data-marker-pair="' + from + ':' + to + '"]').click();
    await expect(panel.locator(prefix + '-from')).toHaveValue(String(from));
    await expect(panel.locator(prefix + '-to')).toHaveValue(String(to));
    expect(await scalar(panel, 'data-map-difference')).toBeCloseTo(pairProbability(stats, from, to), 14);
  }
  await panel.locator('button[data-marker-pair="0:0"]').click();
  const same = recorded.demes[0].birds[0].id + ':0';
  await panel.locator(prefix + '-copy-first').selectOption(same); await panel.locator(prefix + '-copy-second').selectOption(same);
  const first = await verifyCopy(panel, recorded, 'birds', 0, 'first'), second = await verifyCopy(panel, recorded, 'birds', 0, 'second');
  expect(first).toEqual(second);
  expect(await scalar(panel, 'data-map-difference')).toBeCloseTo(stats.rows[0].H, 14);
  await panel.getByRole('button', { name: 'Find a differing pair', exact: true }).click();
  expect((await verifyCopy(panel, recorded, 'birds', 0, 'first')).letter).not.toBe((await verifyCopy(panel, recorded, 'birds', 0, 'second')).letter);
  await panel.getByRole('button', { name: 'Find a matching pair', exact: true }).click();
  expect((await verifyCopy(panel, recorded, 'birds', 0, 'first')).letter).toBe((await verifyCopy(panel, recorded, 'birds', 0, 'second')).letter);
  const inspected = await verifyCopy(panel, recorded, 'birds', 0, 'first');
  await panel.getByRole('button', { name: 'Inspect first copy’s organism', exact: true }).click();
  await expect(page.locator('[data-arch-inspector]')).toHaveAttribute('data-arch-inspector', String(inspected.id));
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(world);

  await panel.locator(prefix + '-case').selectOption('separated');
  const separated = await teachingFrame(page, 'separated');
  const separatedStats = await verifyMap(panel, separated, 'birds', 'separated', 3);
  expect(separatedStats.A).toBe(48); expect(separatedStats.a).toBe(96); expect(separatedStats.pooled).toBeCloseTo(4 / 9, 14); expect(separatedStats.within).toBe(0);
  for (const row of separatedStats.rows) expect(row.observed).toBe(0);
  await panel.locator('button[data-marker-pair="0:1"]').click();
  expect(await scalar(panel, 'data-map-difference')).toBe(1);
  await panel.getByRole('button', { name: 'Find a differing pair', exact: true }).click();
  expect((await verifyCopy(panel, separated, 'birds', 0, 'first')).letter).toBe('A');
  expect((await verifyCopy(panel, separated, 'birds', 1, 'second')).letter).toBe('a');
  const unmatchedRecipe = [await panel.locator(prefix + '-copy-first').inputValue(), await panel.locator(prefix + '-copy-second').inputValue()];
  await panel.getByRole('button', { name: 'Find a matching pair', exact: true }).click();
  await expect(panel.getByRole('status')).toHaveText('These sources contain no pair of that kind. Try another source island.');
  expect([await panel.locator(prefix + '-copy-first').inputValue(), await panel.locator(prefix + '-copy-second').inputValue()]).toEqual(unmatchedRecipe);
  await expect(panel.getByRole('button', { name: 'Inspect first copy’s organism', exact: true })).toBeDisabled();
  const separatedExport = await downloadMap(page, panel);
  await verifyExport(page, separatedExport, world, 'separated', 'birds', 3);
  expect(separatedExport.recipe.from).toBe(0); expect(separatedExport.recipe.to).toBe(1);

  await panel.locator(prefix + '-case').selectOption('mixed');
  const mixed = await teachingFrame(page, 'mixed');
  const mixedStats = await verifyMap(panel, mixed, 'birds', 'mixed', 3);
  expect(mixedStats.A).toBe(separatedStats.A); expect(mixedStats.a).toBe(separatedStats.a);
  expect(mixedStats.pooled).toBeCloseTo(4 / 9, 14); expect(mixedStats.within).toBeCloseTo(4 / 9, 14);
  for (const row of mixedStats.rows) { expect(row.observed).toBe(0); expect(row.H).toBeCloseTo(4 / 9, 14); }
  await panel.locator('button[data-marker-pair="0:2"]').click();
  await panel.getByRole('button', { name: 'Find a differing pair', exact: true }).click();
  expect((await verifyCopy(panel, mixed, 'birds', 0, 'first')).letter).not.toBe((await verifyCopy(panel, mixed, 'birds', 2, 'second')).letter);
  await panel.getByRole('button', { name: 'Find a matching pair', exact: true }).click();
  expect((await verifyCopy(panel, mixed, 'birds', 0, 'first')).letter).toBe((await verifyCopy(panel, mixed, 'birds', 2, 'second')).letter);
  await expect(panel.locator('[data-map-inspected-different]')).toHaveAttribute('data-map-inspected-different', 'false');
  const explanation = 'The same 48 A and 96 a copies retain pooled H, while their distribution changes within-island H. Neither teaching map has actual Aa residents.';
  await panel.locator(prefix + '-explanation').fill(explanation);
  await page.locator('#ea-explanation').fill('Keep my actual expedition evidence separate from the teaching marker maps.');
  await page.getByRole('button', { name: 'Save island evidence to journal', exact: true }).click();
  const actualNote = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoEvidence.text);
  await panel.getByRole('button', { name: 'Save marker map finding to journal', exact: true }).click();
  const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  expect(notes.archipelagoEvidence.text).toBe(actualNote); expect(notes.archipelagoMarkerMap.text).toContain('mixed'); expect(notes.archipelagoMarkerMap.text).toContain(explanation);
  const mixedExport = await downloadMap(page, panel);
  await verifyExport(page, mixedExport, world, 'mixed', 'birds', 3);
  expect(mixedExport.explanation).toBe(explanation);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(world);
  await panel.locator('xpath=ancestor::details[1]').screenshot({ path: report + '/marker-map-desktop.png' });

  await setRange(page, '#ea-generation', 1);
  await verifyMap(panel, world.history[1], 'birds', 'recorded', 1);
  await expect(panel.locator(prefix + '-explanation')).toHaveValue('');
  const diversity = page.locator('[data-arch-diversity]');
  await diversity.getByRole('button', { name: speciesNames.plants, exact: true }).click();
  await verifyMap(panel, world.history[1], 'plants', 'recorded', 1);
  await panel.locator('button[data-marker-pair="2:1"]').click();
  const archivedExport = await downloadMap(page, panel);
  await verifyExport(page, archivedExport, world, 'recorded', 'plants', 1);
  await setRange(page, '#ea-migration', 0); await setRange(page, '#ea-rain-1', .95);
  const queued = await page.evaluate(() => (window as any).__toolData.evoLab.archipelago);
  expect(queued.history).toEqual(world.history); expect(queued.rng).toBe(world.rng);
  const queuedExport = await downloadMap(page, panel);
  expect(queuedExport.recipe).toEqual(archivedExport.recipe); expect(queuedExport.evidence).toEqual(archivedExport.evidence);
  await verifyExport(page, queuedExport, queued, 'recorded', 'plants', 1);
  await page.getByRole('button', { name: 'Return to present', exact: true }).click();
  await verifyMap(panel, world.history[3], 'plants', 'recorded', 3);
  const next = await page.evaluate(w => (window as any).StemLab.evoArchipelagoModel.step(w), queued);
  await page.getByRole('button', { name: 'Advance one generation', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(next);
  await verifyMap(panel, next.history[4], 'plants', 'recorded', 4);
  const contexts = (await harness.glContexts(page)).filter(c => c.connected && !c.lost);
  expect(contexts).toHaveLength(1); expect(contexts[0].draws).toBeGreaterThan(0); expect(errors).toEqual([]);
});

test('phone learners compare marker geography with native keyboard controls, manual copy examples and accessible no-WebGL layouts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any;
  });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: false });
  const world = await page.evaluate(() => (window as any).StemLab.evoArchipelagoModel.create(21, true));
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: world } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'fallback');
  const panel = await openMap(page, true);
  await verifyMap(panel, world.history[0], 'birds', 'recorded', 0);
  await expect(panel.locator(prefix + '-copy-first').locator('option')).toHaveCount(48);
  await panel.locator(prefix + '-from').focus(); await page.keyboard.press('End');
  await expect(panel.locator(prefix + '-from')).toHaveValue('2');
  await expect(panel.locator(prefix + '-copy-first').locator('option')).toHaveCount(12);
  await panel.locator(prefix + '-case').focus(); await page.keyboard.press('End');
  await expect(panel.locator(prefix + '-case')).toHaveValue('mixed');
  const mixed = await teachingFrame(page, 'mixed'); await verifyMap(panel, mixed, 'birds', 'mixed', 0);
  await panel.locator(prefix + '-from').focus(); await page.keyboard.press('Home');
  await panel.locator(prefix + '-to').focus(); await page.keyboard.press('End');
  await expect(panel.locator(prefix + '-from')).toHaveValue('0'); await expect(panel.locator(prefix + '-to')).toHaveValue('2');
  await panel.locator(prefix + '-copy-first').focus(); await page.keyboard.press('End');
  await verifyCopy(panel, mixed, 'birds', 0, 'first');
  await panel.getByRole('button', { name: 'Find a differing pair', exact: true }).focus(); await page.keyboard.press('Enter');
  expect((await verifyCopy(panel, mixed, 'birds', 0, 'first')).letter).not.toBe((await verifyCopy(panel, mixed, 'birds', 2, 'second')).letter);
  await panel.getByRole('button', { name: 'Find a matching pair', exact: true }).focus(); await page.keyboard.press('Space');
  expect((await verifyCopy(panel, mixed, 'birds', 0, 'first')).letter).toBe((await verifyCopy(panel, mixed, 'birds', 2, 'second')).letter);
  const diagonal = panel.locator('button[data-marker-pair="1:1"]');
  await diagonal.focus(); await page.keyboard.press('Enter');
  await expect(panel.locator(prefix + '-from')).toHaveValue('1'); await expect(panel.locator(prefix + '-to')).toHaveValue('1');
  const same = await panel.locator(prefix + '-copy-first').inputValue();
  await panel.locator(prefix + '-copy-second').selectOption(same);
  expect(await verifyCopy(panel, mixed, 'birds', 1, 'first')).toEqual(await verifyCopy(panel, mixed, 'birds', 1, 'second'));
  expect(await scalar(panel, 'data-map-difference')).toBeCloseTo(4 / 9, 14);
  await panel.getByRole('button', { name: 'Save marker map finding to journal', exact: true }).focus(); await page.keyboard.press('Enter');
  const note = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoMarkerMap.text);
  expect(note).toContain('mixed');
  const exported = await downloadMap(page, panel); await verifyExport(page, exported, world, 'mixed', 'birds', 0);
  expect(exported.recipe.first).toEqual(exported.recipe.second);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(world);
  for (const name of ['Find a differing pair', 'Find a matching pair', 'Save marker map finding to journal', 'Download marker map evidence']) {
    expect(await panel.getByRole('button', { name, exact: true }).evaluate((el: Element) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
  for (const dimensions of await panel.locator('button[data-marker-pair]').evaluateAll((els: Element[]) => els.map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })))) {
    expect(dimensions.width).toBeGreaterThanOrEqual(44); expect(dimensions.height).toBeGreaterThanOrEqual(44);
  }
  for (const id of ['-case', '-from', '-to', '-copy-first', '-copy-second']) {
    expect(await panel.locator(prefix + id).evaluate((el: Element) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await expect(panel.locator(prefix + id)).toHaveAccessibleName(/\S+/);
  }
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-archipelago]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await panel.locator('xpath=ancestor::details[1]').screenshot({ path: report + '/marker-map-phone.png' });
  const next = await page.evaluate(w => (window as any).StemLab.evoArchipelagoModel.step(w), world);
  await page.getByRole('button', { name: 'Advance one generation', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(next);
  await verifyMap(panel, next.history[1], 'birds', 'recorded', 1);
  const diversity = page.locator('[data-arch-diversity]');
  await diversity.getByRole('button', { name: speciesNames.plants, exact: true }).focus(); await page.keyboard.press('Space');
  await verifyMap(panel, next.history[1], 'plants', 'recorded', 1);
  await panel.getByRole('button', { name: 'Inspect first copy’s organism', exact: true }).focus(); await page.keyboard.press('Enter');
  const selected = await verifyCopy(panel, next.history[1], 'plants', Number(await panel.locator(prefix + '-from').inputValue()), 'first');
  await expect(page.locator('[data-arch-inspector]')).toHaveAttribute('data-arch-inspector', String(selected.id));
  await verifyExport(page, await downloadMap(page, panel), next, 'recorded', 'plants', 1);
  expect((await harness.glContexts(page)).filter(c => c.connected && !c.lost)).toHaveLength(0); expect(errors).toEqual([]);
});
