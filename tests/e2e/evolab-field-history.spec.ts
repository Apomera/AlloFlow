import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000, retries: 0, mode: 'serial' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
const fieldCard = (page: Page) => page.getByRole('region', { name: 'Island field card', exact: true });
const navigator = (card: Locator) => card.getByRole('region', { name: 'Browse recorded cohorts', exact: true });
const variation = (card: Locator) => card.getByRole('region', { name: 'Displayed cohort variation', exact: true });
const reference = (card: Locator) => card.getByRole('region', { name: 'Pinned cohort comparison', exact: true });
const captured = (card: Locator) => card.getByRole('region', { name: 'Captured cohort comparison', exact: true });
const previous = (card: Locator) => navigator(card).getByRole('button', { name: 'Previous recorded generation', exact: true });
const next = (card: Locator) => navigator(card).getByRole('button', { name: 'Next recorded generation', exact: true });
const latest = (card: Locator) => navigator(card).getByRole('button', { name: 'Latest recorded generation', exact: true });
const slider = (card: Locator) => navigator(card).getByRole('slider', { name: 'Field card generation', exact: true });
const variationSummary = (card: Locator) => card.locator('summary').filter({ hasText: /^Explore variation in this cohort$/ });
const enter = async (page: Page, target: Locator) => { await target.focus(); await page.keyboard.press('Enter'); };

test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function makeFixture(page: Page, generations: number) {
  return page.evaluate(generations => {
    const w = window as any, model = w.StemLab.evoArchipelagoModel;
    let world = model.create(2026, true);
    for (let generation = 0; generation < generations; generation++) world = model.step(world);
    const primer = w.StemLab.evoIslandModel.create(2026);
    if (!model.restore(world)) throw new Error('Field history must use a replay-valid expedition');
    localStorage.setItem('evoLab.archipelago.v1', JSON.stringify(world));
    localStorage.setItem('evoLab.island.v1', JSON.stringify(primer));
    return { world, primer, expectedNext: JSON.stringify(model.step(world)) };
  }, generations);
}

async function savedState(page: Page) {
  return page.evaluate(() => {
    const data = (window as any).__toolData.evoLab;
    return {
      world: JSON.stringify(data.archipelago), rng: data.archipelago.rng, settings: JSON.stringify(data.archipelago.settings),
      primer: JSON.stringify(data.island), archipelagoCache: localStorage.getItem('evoLab.archipelago.v1'),
      primerCache: localStorage.getItem('evoLab.island.v1'), journal: localStorage.getItem('evoLab.progress.v1'),
      study: localStorage.getItem('evoLab.archipelago.study.v1')
    };
  });
}

async function expectGeneration(page: Page, generation: number, last: number) {
  const card = fieldCard(page), nav = navigator(card), range = slider(card);
  await expect(nav).toHaveAttribute('data-field-history-generation', String(generation));
  await expect(nav).toHaveAttribute('data-field-history-latest', String(last));
  await expect(nav).toHaveAttribute('data-field-history-state', generation === last ? 'present' : 'recorded');
  await expect(range).toHaveValue(String(generation));
  await expect(range).toHaveAttribute('min', '0'); await expect(range).toHaveAttribute('max', String(last));
  await expect(range).toHaveAttribute('step', '1'); await expect(range).toHaveAttribute('aria-valuetext', 'G' + generation + ' / G' + last);
  await expect(page.locator('#ea-generation')).toHaveValue(String(generation));
  await expect(page.locator('[data-arch-generation]')).toHaveText('G' + generation);
  const chart = page.getByRole('img', { name: 'Recorded mean beak strength and seed-shell hardness by generation on the selected island. Exact values are in the table.', exact: true });
  expect(Number(await chart.locator('line[stroke-dasharray="4 4"]').getAttribute('x1'))).toBeCloseTo(38 + generation / Math.max(1, last) * 570, 12);
  if (generation === 0) await expect(previous(card)).toBeDisabled(); else await expect(previous(card)).toBeEnabled();
  if (generation === last) { await expect(next(card)).toBeDisabled(); await expect(latest(card)).toBeDisabled(); }
  else { await expect(next(card)).toBeEnabled(); await expect(latest(card)).toBeEnabled(); }
  await expect(nav.locator('[aria-live], [role="status"]')).toHaveCount(0);
}

async function expectDisplayed(card: Locator, world: any, generation: number, island: number, species: string) {
  const panel = variation(card), population = world.history[generation].demes[island][species];
  await expect(panel).toHaveAttribute('data-field-variation-generation', String(generation));
  await expect(panel).toHaveAttribute('data-field-variation-island', String(island));
  await expect(panel).toHaveAttribute('data-field-variation-species', species);
  await expect(panel.locator('[data-field-variation-total]')).toHaveAttribute('data-field-variation-total', String(population.length));
  expect(Number(await panel.locator('[data-field-variation-mean]').getAttribute('data-field-variation-mean')))
    .toBeCloseTo(population.reduce((sum: number, organism: any) => sum + (organism.genes[0] + organism.genes[1]) / 2, 0) / population.length, 12);
}

async function expectSceneCohort(page: Page, world: any, generation: number, island: number) {
  const ids = ['birds', 'plants'].flatMap(species => world.history[generation].demes[island][species].map((organism: any) => organism.id)).sort((a, b) => a - b);
  await expect.poll(async () => page.evaluate(island => {
    const w = window as any, record = w.__glRecorder.records.find((row: any) => row.scene && row.canvas.isConnected);
    return record.scene.getObjectByName('Archipelago organisms').children.filter((group: any) => group.userData.island === island && group.visible)
      .map((group: any) => group.userData.id).sort((a: number, b: number) => a - b);
  }, island)).toEqual(ids);
}

async function captureCohorts(card: Locator) {
  const region = captured(card);
  await card.getByRole('button', { name: 'Capture cohort comparison', exact: true }).click();
  await expect(region).toHaveAttribute('data-field-cohort-observation-context', 'time');
  await region.getByText('Show captured cohort evidence', { exact: true }).click();
  const evidence = (await region.locator('pre').textContent())!;
  expect(evidence).toContain('recorded generation=G0; census N=6;');
  expect(evidence).toContain('recorded generation=G1; census N=24;');
  await region.getByRole('textbox').fill('These are recorded cohorts; browsing does not produce a new generation.');
  await region.getByText('Show captured cohort evidence', { exact: true }).click();
  return { evidence, reflection: await region.getByRole('textbox').inputValue() };
}

async function expectFrozen(card: Locator, snapshot: { evidence: string; reflection: string }) {
  await expect(captured(card).locator('pre')).toHaveText(snapshot.evidence);
  await expect(captured(card).getByRole('textbox')).toHaveValue(snapshot.reflection);
  await expect(reference(card)).toHaveAttribute('data-field-cohort-reference-generation', '0');
  await expect(reference(card)).toHaveAttribute('data-field-cohort-reference-island', '2');
  await expect(reference(card)).toHaveAttribute('data-field-cohort-reference-species', 'birds');
}

test('desktop browses actual recorded cohorts beside their evidence without advancing evolution or losing pinned findings', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { evoLab: { view: 'archipelago' } });
  const fixture = await makeFixture(page, 3);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer } });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'ready');
  const original = await savedState(page), contexts = (await harness.glContexts(page)).filter(context => context.connected && !context.lost);
  expect(contexts).toHaveLength(1); expect(contexts[0].renders).toBeGreaterThan(0);
  const card = fieldCard(page), nav = navigator(card), range = slider(card), panel = variation(card);
  await expectGeneration(page, 3, 3);
  await page.locator('[data-arch-island="2"]').click(); await variationSummary(card).click();
  await range.focus(); await page.keyboard.press('Home'); await expect(range).toBeFocused();
  await expectGeneration(page, 0, 3); await expectDisplayed(card, fixture.world, 0, 2, 'birds');
  await card.getByRole('button', { name: 'Pin displayed cohort as reference', exact: true }).click();
  const founder = fixture.world.history[0].demes[2].birds[0];
  await card.locator('#ea-field-resident').selectOption(String(founder.id));
  await card.getByRole('button', { name: 'Pin this organism for comparison', exact: true }).click();
  await next(card).click(); await expect(next(card)).toBeFocused();
  await expectGeneration(page, 1, 3); await expectDisplayed(card, fixture.world, 1, 2, 'birds');
  await expect(card).toHaveAttribute('data-arch-field-card', '');
  await expect(reference(card)).toHaveAttribute('data-field-cohort-comparison', 'ready');
  await expect(reference(card).locator('[data-field-cohort-reference-total]')).toHaveAttribute('data-field-cohort-reference-total', '6');
  await expect(panel.locator('[data-field-cohort-bar="A"]')).toHaveCount(5);
  await expect(panel.locator('[data-field-cohort-bar="B"]')).toHaveCount(5);
  const frozen = await captureCohorts(card);
  const occupiedBand = panel.locator('[data-field-variation-band]');
  const bandIndex = await occupiedBand.evaluateAll(nodes => nodes.findIndex(node => Number(node.getAttribute('data-field-variation-count')) > 0));
  await panel.locator('[data-field-variation-band="' + bandIndex + '"]').click();
  const member = panel.locator('[data-field-variation-resident]').first(); await member.click();
  await expect(card.locator('[data-field-reference]')).toHaveAttribute('data-field-reference', String(founder.id));
  await next(card).click(); await expect(next(card)).toBeFocused();
  await expectGeneration(page, 2, 3); await expectDisplayed(card, fixture.world, 2, 2, 'birds');
  await expect(card).toHaveAttribute('data-arch-field-card', '');
  await expect(panel.locator('[data-field-variation-band][aria-pressed="true"]')).toHaveCount(0);
  await expect(panel.locator('[data-field-variation-resident]')).toHaveCount(0);
  await expectFrozen(card, frozen); await expectSceneCohort(page, fixture.world, 2, 2);
  await expect(card.locator('#ea-field-variation-title')).not.toBeFocused();
  await previous(card).click(); await expect(previous(card)).toBeFocused(); await expectGeneration(page, 1, 3);

  // Local navigation preserves the chosen island/species while the reference action restores its own full context.
  await card.getByRole('button', { name: 'Browse Shellseed plants', exact: true }).click();
  await page.locator('[data-arch-island="0"]').click();
  await previous(card).click(); await expect(range).toBeFocused(); await expectGeneration(page, 0, 3);
  await expectDisplayed(card, fixture.world, 0, 0, 'plants'); await expectFrozen(card, frozen);
  await expect(reference(card)).toHaveAttribute('data-field-cohort-comparison', 'species');
  await reference(card).getByRole('button', { name: 'Visit reference cohort', exact: true }).click();
  await expect(card.locator('#ea-field-variation-title')).toBeFocused();
  await expectDisplayed(card, fixture.world, 0, 2, 'birds'); await expectGeneration(page, 0, 3);
  await expect(page.locator('[data-arch-island="2"]')).toHaveAttribute('aria-pressed', 'true');
  await latest(card).click(); await expect(range).toBeFocused(); await expectGeneration(page, 3, 3);
  await previous(card).click(); await expect(previous(card)).toBeFocused(); await expectGeneration(page, 2, 3);
  await expectFrozen(card, frozen); await expectSceneCohort(page, fixture.world, 2, 2);
  await nav.scrollIntoViewIfNeeded(); await card.screenshot({ path: report + '/field-history-desktop.png' });
  expect(await savedState(page)).toEqual(original);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost).map(context => context.id)).toEqual(contexts.map(context => context.id));

  // The first real simulation step is identical to the control that never browsed history.
  await latest(card).click(); await page.getByRole('button', { name: 'Advance one generation', exact: true }).click();
  await expectGeneration(page, 4, 4); await expectFrozen(card, frozen);
  const advanced = await savedState(page);
  expect(advanced.world).toBe(fixture.expectedNext); expect(advanced.archipelagoCache).toBe(fixture.expectedNext);
  expect(advanced.primer).toBe(original.primer); expect(advanced.primerCache).toBe(original.primerCache);
  expect(advanced.journal).toBe(original.journal); expect(advanced.study).toBe(original.study);
  expect(errors).toEqual([]);
});

test('phone provides a keyboard-accessible recorded-generation navigator, including founders-only and boundary focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (getContext as any).call(this, type, ...args); } as any;
  });
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: false });
  const founders = await makeFixture(page, 0);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: founders.world, island: founders.primer } }, undefined, { expectCanvas: false });
  await expectGeneration(page, 0, 0); await expect(slider(fieldCard(page))).toBeDisabled();
  await expect(navigator(fieldCard(page))).toContainText('Only the founding cohort is recorded.');
  await enter(page, page.getByRole('button', { name: 'Advance one generation', exact: true }));
  await expectGeneration(page, 1, 1); await expect(slider(fieldCard(page))).toBeEnabled();
  expect((await savedState(page)).world).toBe(founders.expectedNext);

  const fixture = await makeFixture(page, 3);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'fallback');
  const original = await savedState(page), card = fieldCard(page), nav = navigator(card), range = slider(card);
  for (const button of [previous(card), next(card), latest(card)]) { await expect(button).toHaveJSProperty('tagName', 'BUTTON'); await expect(button).toHaveAttribute('type', 'button'); }
  await expect(range).toHaveAttribute('aria-describedby', 'ea-field-history-help');
  await enter(page, page.locator('[data-arch-island="2"]')); await enter(page, variationSummary(card));
  await range.focus(); await page.keyboard.press('ArrowLeft'); await expectGeneration(page, 2, 3); await expect(range).toBeFocused();
  await page.keyboard.press('ArrowRight'); await expectGeneration(page, 3, 3); await expect(range).toBeFocused();
  await page.keyboard.press('Home'); await expectGeneration(page, 0, 3); await expect(range).toBeFocused();
  await enter(page, card.getByRole('button', { name: 'Pin displayed cohort as reference', exact: true }));
  await enter(page, next(card)); await expectGeneration(page, 1, 3); await expect(next(card)).toBeFocused();
  const frozen = await captureCohorts(card);
  await enter(page, next(card)); await expectGeneration(page, 2, 3); await expect(next(card)).toBeFocused();
  await enter(page, next(card)); await expectGeneration(page, 3, 3); await expect(range).toBeFocused();
  await expectFrozen(card, frozen); await expectDisplayed(card, fixture.world, 3, 2, 'birds');
  await page.keyboard.press('Home'); await expectGeneration(page, 0, 3); await expect(range).toBeFocused();
  await page.keyboard.press('End'); await expectGeneration(page, 3, 3); await expect(range).toBeFocused();
  await enter(page, previous(card)); await expectGeneration(page, 2, 3); await expect(previous(card)).toBeFocused();
  await enter(page, previous(card)); await expectGeneration(page, 1, 3); await expect(previous(card)).toBeFocused();
  await enter(page, previous(card)); await expectGeneration(page, 0, 3); await expect(range).toBeFocused();
  // The original history control also drives this local view without replacing its frozen evidence.
  await page.locator('#ea-generation').focus(); await page.keyboard.press('ArrowRight'); await expectGeneration(page, 1, 3);
  await expectFrozen(card, frozen); await expectDisplayed(card, fixture.world, 1, 2, 'birds');
  await enter(page, latest(card)); await expectGeneration(page, 3, 3); await expect(range).toBeFocused();
  await enter(page, reference(card).getByRole('button', { name: 'Visit reference cohort', exact: true }));
  await expect(card.locator('#ea-field-variation-title')).toBeFocused(); await expectGeneration(page, 0, 3);
  await enter(page, next(card)); await expectGeneration(page, 1, 3); await expect(next(card)).toBeFocused();
  await expectFrozen(card, frozen);
  expect(await nav.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await card.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await nav.scrollIntoViewIfNeeded(); await card.screenshot({ path: report + '/field-history-phone.png' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-arch-field-card]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((result: any) => result.violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }))));
  expect(violations).toEqual([]); expect(await savedState(page)).toEqual(original);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost)).toHaveLength(0);
  expect(errors).toEqual([]);
});
