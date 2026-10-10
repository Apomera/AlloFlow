import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000, retries: 0, mode: 'serial' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
const fieldCard = (page: Page) => page.getByRole('region', { name: 'Island field card', exact: true });
const variation = (card: Locator) => card.getByRole('region', { name: 'Displayed cohort variation', exact: true });
const reference = (card: Locator) => card.getByRole('region', { name: 'Pinned cohort comparison', exact: true });
const pinButton = (card: Locator) => card.getByRole('button', { name: 'Pin displayed cohort as reference', exact: true });
const visitButton = (card: Locator) => card.getByRole('button', { name: 'Visit reference cohort', exact: true });
const trait = (organism: any) => (organism.genes[0] + organism.genes[1]) / 2;
const mean = (population: any[]) => population.reduce((sum, organism) => sum + trait(organism), 0) / population.length;
const bands = (population: any[]) => Array.from({ length: 5 }, (_, index) => population
  .filter(organism => trait(organism) >= index / 5 && (index === 4 ? trait(organism) <= 1 : trait(organism) < (index + 1) / 5))
  .sort((a, b) => trait(a) - trait(b) || a.id - b.id));
const enter = async (page: Page, target: Locator) => { await target.focus(); await page.keyboard.press('Enter'); };

test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function savedState(page: Page) {
  return page.evaluate(() => {
    const data = (window as any).__toolData.evoLab;
    return {
      world: JSON.stringify(data.archipelago), rng: data.archipelago.rng, primer: JSON.stringify(data.island),
      archipelagoCache: localStorage.getItem('evoLab.archipelago.v1'), primerCache: localStorage.getItem('evoLab.island.v1'),
      journal: localStorage.getItem('evoLab.progress.v1'), study: localStorage.getItem('evoLab.archipelago.study.v1')
    };
  });
}

async function makeFixture(page: Page, advance: boolean) {
  return page.evaluate((advance) => {
    const w = window as any, model = w.StemLab.evoArchipelagoModel;
    const founders = model.create(2026, true), world = advance ? model.step(founders) : founders;
    const primer = w.StemLab.evoIslandModel.create(2026);
    if (!model.restore(world)) throw new Error('Cohort references must use a replay-valid expedition');
    localStorage.setItem('evoLab.archipelago.v1', JSON.stringify(world));
    localStorage.setItem('evoLab.island.v1', JSON.stringify(primer));
    return { world, primer };
  }, advance);
}

async function expectReference(card: Locator, population: any[], generation: number, island: number, species: string, state: string) {
  const region = reference(card);
  await expect(region).toHaveAttribute('data-field-cohort-reference-generation', String(generation));
  await expect(region).toHaveAttribute('data-field-cohort-reference-island', String(island));
  await expect(region).toHaveAttribute('data-field-cohort-reference-species', species);
  await expect(region).toHaveAttribute('data-field-cohort-comparison', state);
  await expect(region.locator('[data-field-cohort-reference-total]')).toHaveAttribute('data-field-cohort-reference-total', String(population.length));
  expect(Number(await region.locator('[data-field-cohort-reference-mean]').getAttribute('data-field-cohort-reference-mean'))).toBeCloseTo(mean(population), 12);
  await expect(region.locator('[aria-live], [role="status"]')).toHaveCount(0);
}

async function expectDisplayed(panel: Locator, population: any[], generation: number, island: number, species: string) {
  await expect(panel).toHaveAttribute('data-field-variation-generation', String(generation));
  await expect(panel).toHaveAttribute('data-field-variation-island', String(island));
  await expect(panel).toHaveAttribute('data-field-variation-species', species);
  await expect(panel.locator('[data-field-variation-total]')).toHaveAttribute('data-field-variation-total', String(population.length));
  expect(Number(await panel.locator('[data-field-variation-mean]').getAttribute('data-field-variation-mean'))).toBeCloseTo(mean(population), 12);
}

async function expectComparisonValues(card: Locator, a: any[], b: any[]) {
  const panel = variation(card), region = reference(card), aBands = bands(a), bBands = bands(b);
  expect(Number(await region.locator('[data-field-cohort-difference]').getAttribute('data-field-cohort-difference'))).toBeCloseTo((mean(b) - mean(a)) * 100, 12);
  await expect(panel.locator('[data-field-cohort-bar="A"]')).toHaveCount(5);
  await expect(panel.locator('[data-field-cohort-bar="B"]')).toHaveCount(5);
  for (let index = 0; index < 5; index++) {
    const button = panel.locator('[data-field-variation-band="' + index + '"]');
    await expect(button).toHaveJSProperty('tagName', 'BUTTON');
    await expect(button).toHaveAttribute('type', 'button');
    await expect(button).toHaveAttribute('data-field-variation-count', String(bBands[index].length));
    await expect(button).toHaveAttribute('data-field-cohort-reference-count', String(aBands[index].length));
    for (const [side, group, population] of [['A', aBands[index], a], ['B', bBands[index], b]] as const) {
      const bar = panel.locator('[data-field-cohort-bar="' + side + '"][data-field-cohort-band="' + index + '"]');
      expect(Number(await bar.getAttribute('data-field-cohort-share'))).toBeCloseTo(group.length / population.length, 12);
    }
  }
}

async function expectTableValues(card: Locator, a: any[], b: any[]) {
  const panel = variation(card), aBands = bands(a), bBands = bands(b), rows = panel.locator('[data-field-cohort-row]');
  await expect(rows).toHaveCount(5);
  for (let index = 0; index < 5; index++) {
    const row = rows.nth(index);
    for (const [side, group, population] of [['A', aBands[index], a], ['B', bBands[index], b]] as const) {
      const cell = row.locator('td[data-field-cohort-table-side="' + side + '"]');
      await expect(cell).toHaveAttribute('data-field-cohort-count', String(group.length));
      expect(Number(await cell.getAttribute('data-field-cohort-share'))).toBeCloseTo(group.length / population.length, 12);
    }
    expect(Number(await row.locator('[data-field-cohort-share-difference]').getAttribute('data-field-cohort-share-difference')))
      .toBeCloseTo((bBands[index].length / b.length - aBands[index].length / a.length) * 100, 12);
  }
}

test('desktop compares six founders with 24 offspring using cohort proportions and revisits the complete reference context', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { evoLab: { view: 'archipelago' } });
  const fixture = await makeFixture(page, true);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer } });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'ready');
  const original = await savedState(page), contexts = (await harness.glContexts(page)).filter(context => context.connected && !context.lost);
  expect(contexts).toHaveLength(1); expect(contexts[0].renders).toBeGreaterThan(0);
  const card = fieldCard(page), panel = variation(card), a = fixture.world.history[0].demes[2].birds, b = fixture.world.history[1].demes[2].birds;
  expect(a).toHaveLength(6); expect(b).toHaveLength(24);
  await page.locator('#ea-generation').focus(); await page.keyboard.press('Home');
  await page.locator('[data-arch-island="2"]').click();
  await card.locator('summary').filter({ hasText: /^Explore variation in this cohort$/ }).click();
  await expect(reference(card)).toHaveCount(0); await expect(pinButton(card)).toBeEnabled();
  await pinButton(card).click(); await expectReference(card, a, 0, 2, 'birds', 'same');
  await expect(pinButton(card)).toBeDisabled(); await expect(visitButton(card)).toBeDisabled();
  await expect(panel.locator('[data-field-cohort-bar]')).toHaveCount(0);

  await page.locator('#ea-generation').focus(); await page.keyboard.press('End');
  await expectReference(card, a, 0, 2, 'birds', 'ready');
  await expectDisplayed(panel, b, 1, 2, 'birds'); await expectComparisonValues(card, a, b);
  await expect(pinButton(card)).toBeEnabled(); await expect(visitButton(card)).toBeEnabled();
  const valuesSummary = panel.locator('summary').filter({ hasText: /^Read cohort comparison values$/ });
  await expect(valuesSummary).toHaveJSProperty('tagName', 'SUMMARY'); await valuesSummary.click();
  await expectTableValues(card, a, b);

  // A range always browses the displayed B cohort, never the pinned founders.
  const groups = bands(b), bandIndex = groups.findIndex(group => group.length > 1), selected = groups[bandIndex][0];
  expect(bandIndex).toBeGreaterThanOrEqual(0);
  await panel.locator('[data-field-variation-band="' + bandIndex + '"]').click();
  expect(await panel.locator('[data-field-variation-resident]').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('data-field-variation-resident')))))
    .toEqual(groups[bandIndex].map((organism: any) => organism.id));
  for (const founder of a) await expect(panel.locator('[data-field-variation-resident="' + founder.id + '"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'View whole archipelago', exact: true }).click();
  await panel.locator('[data-field-variation-resident="' + selected.id + '"]').click();
  await expect(card).toHaveAttribute('data-arch-field-card', String(selected.id));
  await expect(page.locator('#ea-resident')).toHaveValue(String(selected.id));
  await expect(page.locator('[data-arch-inspector]')).toHaveAttribute('data-arch-inspector', String(selected.id));
  await expect(page.locator('[data-archipelago-view]')).toHaveAttribute('data-archipelago-view', 'island');
  await expectReference(card, a, 0, 2, 'birds', 'ready');
  await expect.poll(async () => page.evaluate(id => {
    const w = window as any, record = w.__glRecorder.records.find((row: any) => row.scene && row.canvas.isConnected);
    const selected = record.scene.getObjectByName('Archipelago organisms').children.find((group: any) => group.userData.id === id);
    return { visible: selected.visible, island: selected.userData.island, halo: selected.children.some((mesh: any) => mesh.geometry?.type === 'TorusGeometry') };
  }, selected.id)).toEqual({ visible: true, island: 2, halo: true });
  await panel.screenshot({ path: report + '/cohort-reference-desktop.png' });

  await visitButton(card).click();
  await expect(card.locator('#ea-field-variation-title')).toBeFocused();
  await expectReference(card, a, 0, 2, 'birds', 'same'); await expectDisplayed(panel, a, 0, 2, 'birds');
  await expect(card).toHaveAttribute('data-arch-field-card', ''); await expect(page.locator('[data-arch-generation]')).toHaveText('G0');
  await expect(page.locator('[data-arch-island="2"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(visitButton(card)).toBeDisabled();

  // Both generation and geography may change, while the pinned A context remains explicit.
  await page.locator('#ea-generation').focus(); await page.keyboard.press('End');
  await page.locator('[data-arch-island="0"]').click();
  const otherBirds = fixture.world.history[1].demes[0].birds;
  await expectReference(card, a, 0, 2, 'birds', 'ready'); await expectDisplayed(panel, otherBirds, 1, 0, 'birds');
  await expectComparisonValues(card, a, otherBirds);
  await card.getByRole('button', { name: 'Browse Shellseed plants', exact: true }).click();
  await expectReference(card, a, 0, 2, 'birds', 'species');
  await expect(panel.locator('[data-field-cohort-bar], [data-field-cohort-difference], [data-field-cohort-row]')).toHaveCount(0);
  await expectDisplayed(panel, fixture.world.history[1].demes[0].plants, 1, 0, 'plants');
  await visitButton(card).click();
  await expect(card.locator('#ea-field-variation-title')).toBeFocused();
  await expectDisplayed(panel, a, 0, 2, 'birds'); await expectReference(card, a, 0, 2, 'birds', 'same');
  await expect(page.locator('[data-arch-island="2"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-arch-generation]')).toHaveText('G0'); await expect(card).toHaveAttribute('data-arch-field-card', '');
  await expect(page.locator('[data-archipelago-view]')).toHaveAttribute('data-archipelago-view', 'island');
  await card.getByRole('button', { name: 'Clear cohort reference', exact: true }).click();
  await expect(card.locator('#ea-field-variation-title')).toBeFocused();
  await expect(reference(card)).toHaveCount(0); await expect(pinButton(card)).toBeEnabled();
  await expect(panel.locator('[data-field-cohort-bar]')).toHaveCount(0);
  expect(await savedState(page)).toEqual(original);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost).map(context => context.id)).toEqual(contexts.map(context => context.id));
  expect(errors).toEqual([]);
});

test('phone compares islands by keyboard without WebGL, reads exact proportions and clears its reference for a new expedition', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (getContext as any).call(this, type, ...args); } as any;
  });
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: false });
  const fixture = await makeFixture(page, false);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'fallback');
  const original = await savedState(page), card = fieldCard(page), panel = variation(card);
  const a = fixture.world.history[0].demes[2].birds, b = fixture.world.history[0].demes[0].birds;
  expect(a).toHaveLength(6); expect(b).toHaveLength(24);
  await enter(page, page.locator('[data-arch-island="2"]'));
  await enter(page, card.locator('summary').filter({ hasText: /^Explore variation in this cohort$/ }));
  await expect(pinButton(card)).toHaveJSProperty('tagName', 'BUTTON'); await expect(pinButton(card)).toHaveAttribute('type', 'button');
  await enter(page, pinButton(card)); await expectReference(card, a, 0, 2, 'birds', 'same');
  await enter(page, page.locator('[data-arch-island="0"]'));
  await expectReference(card, a, 0, 2, 'birds', 'ready'); await expectDisplayed(panel, b, 0, 0, 'birds');
  await expectComparisonValues(card, a, b);
  const groups = bands(b), index = groups.findIndex(group => group.length > 0), selected = groups[index][0];
  const band = panel.locator('[data-field-variation-band="' + index + '"]');
  await enter(page, band); await expect(band).toBeFocused();
  expect(await panel.locator('[data-field-variation-resident]').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('data-field-variation-resident')))))
    .toEqual(groups[index].map((organism: any) => organism.id));
  const member = panel.locator('[data-field-variation-resident="' + selected.id + '"]');
  await enter(page, member); await expect(member).toBeFocused();
  await expect(card).toHaveAttribute('data-arch-field-card', String(selected.id)); await expectReference(card, a, 0, 2, 'birds', 'ready');
  const summary = panel.locator('summary').filter({ hasText: /^Read cohort comparison values$/ });
  await enter(page, summary); await expect(summary).toBeFocused(); await expectTableValues(card, a, b);
  expect(await panel.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await card.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await panel.screenshot({ path: report + '/cohort-reference-phone.png' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-arch-field-card]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((result: any) => result.violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }))));
  expect(violations).toEqual([]); expect(await savedState(page)).toEqual(original);
  await expect(visitButton(card)).toHaveAttribute('type', 'button'); await enter(page, visitButton(card));
  await expect(card.locator('#ea-field-variation-title')).toBeFocused();
  await expectReference(card, a, 0, 2, 'birds', 'same'); await expectDisplayed(panel, a, 0, 2, 'birds');
  await expect(card).toHaveAttribute('data-arch-field-card', ''); await expect(visitButton(card)).toBeDisabled();
  await expect(page.locator('[data-arch-island="2"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await savedState(page)).toEqual(original);

  const expectedRestart = await page.evaluate(() => JSON.stringify((window as any).StemLab.evoArchipelagoModel.create(((window as any).__toolData.evoLab.archipelago.seed + 1) >>> 0)));
  await enter(page, page.getByText('Start a different expedition', { exact: true }));
  await enter(page, page.getByRole('button', { name: 'New seed · full founding populations', exact: true }));
  await expect(reference(card)).toHaveCount(0); await expect(card).toHaveAttribute('data-arch-field-card', '');
  await expect(panel.locator('[data-field-cohort-bar]')).toHaveCount(0);
  const restarted = await savedState(page);
  expect(restarted.world).toBe(expectedRestart); expect(restarted.archipelagoCache).toBe(expectedRestart);
  expect(restarted.primer).toBe(original.primer); expect(restarted.primerCache).toBe(original.primerCache);
  expect(restarted.journal).toBe(original.journal); expect(restarted.study).toBe(original.study);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost)).toHaveLength(0);
  expect(errors).toEqual([]);
});
