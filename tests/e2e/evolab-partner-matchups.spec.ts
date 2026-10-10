import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function setRange(page: any, selector: string, value: number) {
  await page.locator(selector).evaluate((input: HTMLInputElement, v: number) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function fixture(page: any, noGL = false) {
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: !noGL });
  const data = await page.evaluate(() => {
    const m = (window as any).StemLab.evoArchipelagoModel; let world = m.create(21);
    world.settings.migration = .4; world.settings.mutation = .03;
    for (let i = 0; i < 3; i++) world = m.step(world);
    const migrant = world.history[3].round.migrants.find((p: any) => p.species === 'birds' && p.gametes > 0);
    return { world, island: migrant.to, migrant };
  });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: data.world } }, undefined, { expectCanvas: !noGL });
  await page.locator('[data-arch-island="' + data.island + '"]').click(); return data;
}
async function openMicroscope(page: any, privateStudy = false, keyboard = false) {
  const prefix = privateStudy ? 'ea-private-partners' : 'ea-main-partners';
  const microscope = page.locator('.ea-partner-microscope:has(#' + prefix + '-title)');
  const summary = microscope.getByText('Inspect how partners shaped this round', { exact: true });
  if (!(await microscope.evaluate((el: HTMLDetailsElement) => el.open))) {
    if (keyboard) { await summary.focus(); await summary.press('Enter'); } else await summary.click();
  }
  const panel = microscope.locator('section[data-partner-evidence]');
  const matchupSummary = panel.getByText('Explore bird–seed matches', { exact: true });
  if (!(await matchupSummary.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open))) {
    if (keyboard) { await matchupSummary.focus(); await matchupSummary.press('Enter'); } else await matchupSummary.click();
  }
  return { prefix, microscope, panel, matchup: panel.locator('[data-partner-matchup]') };
}
async function download(page: any, panel: any) {
  const pending = page.waitForEvent('download'); await panel.getByRole('button', { name: 'Download partner comparison', exact: true }).click();
  return JSON.parse(readFileSync((await (await pending).path())!, 'utf8'));
}

// Rebuild the actual post-dispersal pools and nonlinear scores independently of both evidence helpers.
async function independent(page: any, raw: any) {
  return page.evaluate(record => {
    const m = (window as any).StemLab.evoArchipelagoModel, source = m.restoreCheckpoint(record.source);
    const world = record.research ? m.researchBranch(source, record.research.plan, record.research.trial, record.research.condition) : source;
    const before = world.history[record.generation - 1], frame = world.history[record.generation];
    const originals = new Map(before.demes.flatMap((d: any) => ['birds', 'plants'].flatMap(sp => d[sp])).map((o: any) => [o.id, o]));
    const trait = (o: any) => (o.genes[0] + o.genes[1]) / 2;
    const pools: any = {};
    for (const sp of ['birds', 'plants']) pools[sp] = frame.round.contributions.find((r: any) => r.island === record.island && r.species === sp).members.map((p: any) => ({ id: p.id, from: p.from, trait: trait(originals.get(p.id)) }));
    const ids: any = Object.fromEntries(record.view.members.map((p: any) => [p.species, p.id]));
    const chosen: any = Object.fromEntries(['birds', 'plants'].map(sp => [sp, pools[sp].find((p: any) => p.id === ids[sp]) || pools[sp][0] || null]));
    const crack = (beak: number, shell: number) => .08 + .84 / (1 + Math.exp(-10 * (beak - shell)));
    const encounters = ['birds', 'plants'].map(sp => {
      const parent = chosen[sp], other = sp === 'birds' ? 'plants' : 'birds', partners = pools[other];
      if (!parent) return null;
      const points = partners.map((p: any) => ({ ...p, access: sp === 'birds' ? crack(parent.trait, p.trait) : crack(p.trait, parent.trait) }));
      const mean = points.length ? points.reduce((n: number, p: any) => n + p.access, 0) / points.length : 0;
      const partnerMean = points.length ? points.reduce((n: number, p: any) => n + p.trait, 0) / points.length : null;
      const atMean = partnerMean === null ? null : sp === 'birds' ? crack(parent.trait, partnerMean) : crack(partnerMean, parent.trait);
      const factor = !frame.round.settings.selection || !frame.round.settings.reciprocal ? 1 : sp === 'birds' ? .18 + .82 * mean : 1 - .75 * mean;
      return { species: sp, parent: parent.id, trait: parent.trait, points, mean, atMean, difference: atMean === null ? null : mean - atMean, factor, applied: record.view.rule === 'off' ? 1 : factor };
    });
    return { pools, chosen, encounters, access: chosen.birds && chosen.plants ? crack(chosen.birds.trait, chosen.plants.trait) : null };
  }, raw);
}
async function verify(page: any, ui: any, raw: any) {
  const expected = await independent(page, raw), match = ui.matchup;
  await expect(match).toHaveAttribute('data-partner-matchup', String(raw.generation));
  for (const sp of ['birds', 'plants']) {
    const p = expected.chosen[sp], singular = sp === 'birds' ? 'bird' : 'plant';
    await expect(match).toHaveAttribute('data-matchup-' + singular, String(p.id));
    await expect(match.locator('#' + ui.prefix + '-matchup-' + sp)).toHaveValue(String(p.id));
    await expect(ui.panel.locator('#' + ui.prefix + '-' + sp + '-parent')).toHaveValue(String(p.id));
    expect(raw.matchup[singular]).toBe(p.id);
  }
  expect(Number(await match.getAttribute('data-matchup-access'))).toBeCloseTo(expected.access, 13);
  expect(raw.matchup.access).toBeCloseTo(expected.access, 13);
  const visual = match.locator('[data-matchup-beak]');
  expect(Number(await visual.getAttribute('data-matchup-beak'))).toBe(expected.chosen.birds.trait);
  expect(Number(await visual.getAttribute('data-matchup-shell'))).toBe(expected.chosen.plants.trait);
  for (const row of expected.encounters) {
    if (!row) continue;
    const chart = match.locator('[data-encounter-species="' + row.species + '"]');
    await expect(chart).toHaveAttribute('data-encounter-parent', String(row.parent));
    for (const [suffix, value] of [['mean', row.mean], ['at-mean', row.atMean], ['difference', row.difference], ['recorded-factor', row.factor], ['applied-factor', row.applied]]) {
      expect(Number(await chart.getAttribute('data-encounter-' + suffix))).toBeCloseTo(value as number, 13);
    }
    const svg = chart.locator('svg'); await expect(svg).toHaveAttribute('viewBox', '0 0 420 270');
    const curve = (await svg.locator('path').getAttribute('d'))!.match(/[ML]([^ML]+)/g)!;
    expect(curve).toHaveLength(41);
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, score = .08 + .84 / (1 + Math.exp(-10 * (row.species === 'birds' ? row.trait - t : t - row.trait)));
      const [x, y] = curve[i].slice(1).split(',').map(Number);
      expect(x).toBeCloseTo(60 + 320 * t, 11); expect(y).toBeCloseTo(210 - 150 * score, 11);
    }
    const meanLine = svg.locator('[data-encounter-mean-line]');
    expect(Number(await meanLine.getAttribute('y1'))).toBeCloseTo(210 - 150 * row.mean, 11);
    expect(Number(await meanLine.getAttribute('y2'))).toBeCloseTo(210 - 150 * row.mean, 11);
    const selectedPartner = expected.chosen[row.species === 'birds' ? 'plants' : 'birds'];
    const selectedScore = row.points.find((p: any) => p.id === selectedPartner.id);
    const ring = svg.locator('[data-encounter-selected-ring]');
    await expect(ring).toHaveAttribute('data-encounter-selected-ring', String(selectedPartner.id));
    expect(Number(await ring.getAttribute('cx'))).toBeCloseTo(60 + 320 * selectedPartner.trait, 11);
    expect(Number(await ring.getAttribute('cy'))).toBeCloseTo(210 - 150 * selectedScore.access, 11);
    await expect(ring).toHaveAttribute('pointer-events', 'none');
    const dots = await chart.locator('[data-encounter-point]').evaluateAll((els: Element[]) => els.map(el => {
      const circle = el.tagName.toLowerCase() === 'circle' ? el : el.querySelector('circle:last-child')!;
      return { id: el.getAttribute('data-encounter-point'), trait: Number(el.getAttribute('data-encounter-trait')), access: Number(el.getAttribute('data-encounter-access')), from: Number(el.getAttribute('data-encounter-from')), x: Number(circle.getAttribute('cx')), y: Number(circle.getAttribute('cy')) };
    }));
    expect(dots).toHaveLength(row.points.length);
    for (let i = 0; i < dots.length; i++) {
      const p = row.points[i], dot = dots[i]; expect(dot.id).toBe(row.species + ':' + p.id); expect(dot.from).toBe(p.from);
      expect(dot.trait).toBe(p.trait); expect(dot.access).toBeCloseTo(p.access, 13);
      expect(dot.x).toBeCloseTo(60 + 320 * p.trait, 11); expect(dot.y).toBeCloseTo(210 - 150 * p.access, 11);
    }
  }
  // Exported encounter records must be recomputed from the captured branch, not restored result blobs.
  const canonical = await page.evaluate(record => {
    const m = (window as any).StemLab.evoArchipelagoModel, source = m.restoreCheckpoint(record.source);
    const world = record.research ? m.researchBranch(source, record.research.plan, record.research.trial, record.research.condition) : source;
    return ['birds', 'plants'].map(sp => m.partnerEncounterEvidence(world, record.generation, record.island, sp, record.matchup[sp === 'birds' ? 'bird' : 'plant']));
  }, raw);
  expect(raw.matchup.encounters).toEqual(canonical);
  return expected;
}
async function choose(page: any, ui: any, species: string, id: number) {
  await ui.matchup.locator('#' + ui.prefix + '-matchup-' + species).selectOption(String(id));
  await expect(ui.panel.locator('#' + ui.prefix + '-' + species + '-parent')).toHaveValue(String(id));
}

test('bird–seed matches expose actual individual encounters, nonlinear pool means and replayable private comparisons without changing expedition randomness', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const data = await fixture(page), main = await openMicroscope(page), initial = await download(page, main.panel), base = await verify(page, main, initial);
  expect(base.encounters.some((e: any) => e && Math.abs(e.difference) > 1e-5)).toBe(true);
  await expect(main.matchup).toContainText(/feeding/i); await expect(main.matchup).toContainText(/mean/i);
  await choose(page, main, 'birds', data.migrant.id);
  const plant = base.pools.plants.at(-1)!; await choose(page, main, 'plants', plant.id);
  // Existing parent selectors and new matchup selectors are two views of the same scoped selection.
  const anotherBird = base.pools.birds.find((p: any) => p.id !== data.migrant.id)!;
  await main.panel.locator('#ea-main-partners-birds-parent').selectOption(String(anotherBird.id));
  await expect(main.matchup.locator('#ea-main-partners-matchup-birds')).toHaveValue(String(anotherBird.id));
  const otherPlant = base.pools.plants.find((p: any) => p.id !== plant.id)!;
  const point = main.matchup.locator('[data-encounter-point="birds:' + otherPlant.id + '"]');
  await point.focus(); await point.press('Enter'); await expect(main.matchup.locator('#ea-main-partners-matchup-plants')).toHaveValue(String(otherPlant.id));
  // The last drawn point is visible above overlapping marks; native selection reaches every member.
  const pointerBird = base.pools.birds.at(-1)!;
  const birdPoint = main.matchup.locator('[data-encounter-point="plants:' + pointerBird.id + '"]');
  await birdPoint.click(); await expect(main.panel.locator('#ea-main-partners-birds-parent')).toHaveValue(String(pointerBird.id));
  await choose(page, main, 'birds', data.migrant.id);
  const selected = await download(page, main.panel); const selectedExpected = await verify(page, main, selected);
  await main.panel.locator('#ea-main-partners-note').fill('Individual modeled bird–seed scores explain the partner factor; a score at the average trait need not equal the average individual score.');
  await main.panel.getByRole('button', { name: 'Save partner comparison to journal', exact: true }).click();
  const note = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoPartnerEvidence.text);
  expect(note).toContain('Selected modeled matchup=' + JSON.stringify({ bird: selected.matchup.bird, plant: selected.matchup.plant, access: selected.matchup.access }));
  for (const row of selectedExpected.encounters) expect(note).toContain(String(row.mean));
  await main.matchup.screenshot({ path: report + '/partner-matchups-desktop.png' });
  await main.panel.locator('[data-partner-rule-button=off]').click(); const off = await download(page, main.panel); await verify(page, main, off);
  expect(off.matchup).toEqual(selected.matchup); expect(off.evidence).toEqual(selected.evidence);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(data.world);

  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: data.world } });
  await page.locator('[data-arch-island="' + data.island + '"]').click(); const restored = await openMicroscope(page);
  const restoredRaw = await download(page, restored.panel); await verify(page, restored, restoredRaw); expect(restoredRaw.matchup).toEqual(selected.matchup); expect(restoredRaw.view.rule).toBe('off');
  const study = page.locator('[data-arch-research]'); await study.locator('#ea-research-count').selectOption('8');
  await study.getByRole('button', { name: 'Run study from present generation', exact: true }).click(); await expect(study).toHaveAttribute('data-arch-research', 'complete');
  // Trial labels are one-based; select the replay index by value, never by its label.
  await study.locator('#ea-research-trial').selectOption({ value: '2' }); await study.locator('#ea-research-condition').selectOption('11'); await setRange(page, '#ea-research-generation', 1);
  await expect(study.locator('#ea-research-trial')).toHaveValue('2');
  await expect(study.locator('[data-research-trial]')).toHaveAttribute('data-research-trial', '2');
  const privateUI = await openMicroscope(page, true), privateFirst = await download(page, privateUI.panel), privateBase = await verify(page, privateUI, privateFirst);
  await expect(study.locator('#ea-research-trial')).toHaveValue('2');
  expect(privateFirst.research.trial).toBe(2); expect(privateFirst.research.condition).toBe('11'); expect(privateFirst.generation).toBe(privateFirst.research.plan.start + 1);
  await choose(page, privateUI, 'birds', privateBase.pools.birds.at(-1).id); await choose(page, privateUI, 'plants', privateBase.pools.plants.at(-1).id);
  const pinnedPrivate = await download(page, privateUI.panel); await verify(page, privateUI, pinnedPrivate);
  await privateUI.panel.locator('#ea-private-partners-note').fill('These selected parents belong to private trial 3, condition 11, at its first copied generation.');
  await study.locator('#ea-research-condition').selectOption('10'); const noReciprocal = await download(page, privateUI.panel), ten = await verify(page, privateUI, noReciprocal);
  expect(noReciprocal.evidence.settings.reciprocal).toBe(false); for (const row of ten.encounters) expect(row.factor).toBe(1);
  await expect(privateUI.panel.locator('#ea-private-partners-note')).toHaveValue('');
  await study.locator('#ea-research-condition').selectOption('11'); const back = await download(page, privateUI.panel); await verify(page, privateUI, back); expect(back.matchup).toEqual(pinnedPrivate.matchup);
  await expect(privateUI.panel.locator('#ea-private-partners-note')).toHaveValue('These selected parents belong to private trial 3, condition 11, at its first copied generation.');
  await study.locator('#ea-research-trial').selectOption({ value: '3' }); await expect(privateUI.panel.locator('#ea-private-partners-note')).toHaveValue('');
  await study.locator('#ea-research-trial').selectOption({ value: '2' }); expect((await download(page, privateUI.panel)).matchup).toEqual(pinnedPrivate.matchup);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(data.world);

  await setRange(page, '#ea-generation', 0); await expect(restored.panel).toHaveAttribute('data-partner-evidence', 'unavailable'); await expect(restored.matchup).toHaveCount(0);
  await page.getByRole('button', { name: 'Return to present', exact: true }).click(); expect((await download(page, restored.panel)).matchup).toEqual(selected.matchup);
  await openMicroscope(page);
  await page.getByLabel('Reciprocal trait selection', { exact: true }).uncheck();
  let queued = await page.evaluate(() => (window as any).__toolData.evoLab.archipelago);
  expect(queued.history).toEqual(data.world.history); expect(queued.rng).toBe(data.world.rng);
  let expectedNext = await page.evaluate(w => (window as any).StemLab.evoArchipelagoModel.step(w), queued);
  await page.getByRole('button', { name: 'Advance one generation', exact: true }).click(); expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(expectedNext);
  await restored.panel.locator('[data-partner-rule-button=recorded]').click(); const reciprocalOff = await download(page, restored.panel), inactive = await verify(page, restored, reciprocalOff);
  expect(reciprocalOff.matchup.access).toBeGreaterThan(0); for (const row of inactive.encounters) expect(row.factor).toBe(1);
  await page.getByLabel('Trait-dependent breeding weights', { exact: true }).uncheck(); queued = await page.evaluate(() => (window as any).__toolData.evoLab.archipelago);
  expectedNext = await page.evaluate(w => (window as any).StemLab.evoArchipelagoModel.step(w), queued);
  await page.getByRole('button', { name: 'Advance one generation', exact: true }).click(); expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(expectedNext);
  const selectionOff = await download(page, restored.panel), noSelection = await verify(page, restored, selectionOff);
  expect(selectionOff.evidence.settings.selection).toBe(false); expect(selectionOff.matchup.access).toBeGreaterThan(0); for (const row of noSelection.encounters) expect(row.factor).toBe(1);

  await page.evaluate(() => { const key = 'evoLab.archipelago.partner-drafts.v1', drafts = JSON.parse(localStorage.getItem(key)!); for (const d of drafts) d.members = { birds: 999999999, plants: 999999998 }; localStorage.setItem(key, JSON.stringify(drafts)); });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: data.world } }); await page.locator('[data-arch-island="' + data.island + '"]').click(); const cleaned = await openMicroscope(page);
  const cleanedRaw = await download(page, cleaned.panel), fallback = await verify(page, cleaned, cleanedRaw);
  expect(cleanedRaw.matchup.bird).toBe(fallback.pools.birds[0].id); expect(cleanedRaw.matchup.plant).toBe(fallback.pools.plants[0].id);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(data.world); expect(errors).toEqual([]);
});

test('phone learners inspect individual matches using native selectors and keyboard points in accessible reduced-motion no-WebGL layouts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any; });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); const data = await fixture(page, true);
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'fallback');
  const ui = await openMicroscope(page, false, true), initial = await download(page, ui.panel), base = await verify(page, ui, initial);
  for (const sp of ['birds', 'plants']) {
    const selector = ui.matchup.locator('#ea-main-partners-matchup-' + sp); await selector.focus(); await selector.press('End');
    const last = base.pools[sp].at(-1); await expect(selector).toHaveValue(String(last.id)); await expect(ui.panel.locator('#ea-main-partners-' + sp + '-parent')).toHaveValue(String(last.id));
    expect(await selector.evaluate((el: Element) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await expect(selector).toHaveAccessibleName(/.+/);
  }
  const firstPlant = base.pools.plants[0], plantPoint = ui.matchup.locator('[data-encounter-point="birds:' + firstPlant.id + '"]');
  await plantPoint.focus(); await plantPoint.press('Space'); await expect(ui.matchup.locator('#ea-main-partners-matchup-plants')).toHaveValue(String(firstPlant.id)); await expect(plantPoint).toHaveAttribute('aria-pressed', 'true');
  const firstBird = base.pools.birds[0], birdPoint = ui.matchup.locator('[data-encounter-point="plants:' + firstBird.id + '"]');
  await birdPoint.focus(); await birdPoint.press('Enter'); await expect(ui.matchup.locator('#ea-main-partners-matchup-birds')).toHaveValue(String(firstBird.id));
  const chosen = await download(page, ui.panel); await verify(page, ui, chosen);
  await ui.panel.locator('[data-partner-rule-button=off]').focus(); await page.keyboard.press('Enter'); const off = await download(page, ui.panel); await verify(page, ui, off); expect(off.matchup).toEqual(chosen.matchup);
  await ui.panel.locator('[data-partner-rule-button=recorded]').focus(); await page.keyboard.press('Space');
  const summary = ui.panel.getByText('Explore bird–seed matches', { exact: true }); await summary.focus(); await summary.press('Enter'); await summary.press('Enter');
  for (const sp of ['birds', 'plants']) await expect(ui.matchup.locator('#ea-main-partners-matchup-' + sp)).toHaveValue(String(chosen.matchup[sp === 'birds' ? 'bird' : 'plant']));
  const anotherIsland = (data.island + 1) % 3; await page.locator('[data-arch-island="' + anotherIsland + '"]').click(); await verify(page, ui, await download(page, ui.panel));
  await page.locator('[data-arch-island="' + data.island + '"]').click(); const returned = await download(page, ui.panel); await verify(page, ui, returned); expect(returned.matchup).toEqual(chosen.matchup);
  for (const rule of ['recorded', 'off']) expect(await ui.panel.locator('[data-partner-rule-button=' + rule + ']').evaluate((el: Element) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-archipelago]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })))); expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await ui.matchup.screenshot({ path: report + '/partner-matchups-phone.png' });
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(data.world); expect(errors).toEqual([]);
});
