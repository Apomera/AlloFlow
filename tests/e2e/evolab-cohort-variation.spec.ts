import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000, retries: 0, mode: 'serial' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
const fieldCard = (page: Page) => page.getByRole('region', { name: 'Island field card', exact: true });
const variation = (card: Locator) => card.getByRole('region', { name: 'Displayed cohort variation', exact: true });
const trait = (organism: any) => (organism.genes[0] + organism.genes[1]) / 2;
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

async function expectCohort(panel: Locator, population: any[], generation: number, island: number, species: string) {
  await expect(panel).toHaveAttribute('data-field-variation-island', String(island));
  await expect(panel).toHaveAttribute('data-field-variation-generation', String(generation));
  await expect(panel).toHaveAttribute('data-field-variation-species', species);
  await expect(panel.locator('[data-field-variation-total]')).toHaveAttribute('data-field-variation-total', String(population.length));
  const values = population.map(trait);
  expect(Number(await panel.locator('[data-field-variation-minimum]').getAttribute('data-field-variation-minimum'))).toBeCloseTo(Math.min(...values), 12);
  expect(Number(await panel.locator('[data-field-variation-mean]').getAttribute('data-field-variation-mean'))).toBeCloseTo(values.reduce((sum, value) => sum + value, 0) / values.length, 12);
  expect(Number(await panel.locator('[data-field-variation-maximum]').getAttribute('data-field-variation-maximum'))).toBeCloseTo(Math.max(...values), 12);
  const groups = bands(population), buttons = panel.locator('[data-field-variation-band]');
  await expect(buttons).toHaveCount(5);
  for (let index = 0; index < groups.length; index++) {
    const button = panel.locator('[data-field-variation-band="' + index + '"]');
    await expect(button).toHaveJSProperty('tagName', 'BUTTON');
    await expect(button).toHaveAttribute('type', 'button');
    await expect(button).toHaveAttribute('data-field-variation-count', String(groups[index].length));
  }
  expect(groups.reduce((sum, group) => sum + group.length, 0)).toBe(population.length);
  await expect(panel.locator('[aria-live], [role="status"]')).toHaveCount(0);
}

async function expectBand(panel: Locator, index: number, members: any[], selectedId: number | null) {
  await expect(panel.locator('[data-field-variation-band][aria-pressed="true"]')).toHaveCount(1);
  await expect(panel.locator('[data-field-variation-band="' + index + '"]')).toHaveAttribute('aria-pressed', 'true');
  const buttons = panel.locator('[data-field-variation-resident]');
  expect(await buttons.evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('data-field-variation-resident')))))
    .toEqual(members.map(organism => organism.id));
  for (const organism of members) {
    const button = panel.locator('[data-field-variation-resident="' + organism.id + '"]');
    await expect(button).toHaveJSProperty('tagName', 'BUTTON');
    await expect(button).toHaveAttribute('type', 'button');
    await expect(button).toHaveAttribute('data-field-variation-trait', String(trait(organism)));
    await expect(button).toHaveAttribute('aria-pressed', organism.id === selectedId ? 'true' : 'false');
    await expect(button).toContainText('#' + organism.id);
  }
}

async function expectNoBand(panel: Locator) {
  await expect(panel.locator('[data-field-variation-band][aria-pressed="true"]')).toHaveCount(0);
  await expect(panel.locator('[data-field-variation-resident]')).toHaveCount(0);
}

test('desktop cohort bands use every actual resident and connect precise values to the scene, comparison and recorded history', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { evoLab: { view: 'archipelago' } });
  const fixture = await page.evaluate(() => {
    const w = window as any, model = w.StemLab.evoArchipelagoModel, world = model.step(model.create(2026)), primer = w.StemLab.evoIslandModel.create(2026);
    if (!model.restore(world)) throw new Error('Cohort variation must use a replay-valid expedition');
    localStorage.setItem('evoLab.archipelago.v1', JSON.stringify(world)); localStorage.setItem('evoLab.island.v1', JSON.stringify(primer));
    return { world, primer, names: model.islands.map((island: any) => island.name) };
  });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer } });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'ready');
  const original = await savedState(page), contexts = (await harness.glContexts(page)).filter(context => context.connected && !context.lost);
  expect(contexts).toHaveLength(1); expect(contexts[0].renders).toBeGreaterThan(0);
  const card = fieldCard(page), panel = variation(card), population = fixture.world.history[1].demes[0].birds, groups = bands(population);
  const summary = card.locator('summary').filter({ hasText: /^Explore variation in this cohort$/ });
  await expect(summary).toHaveJSProperty('tagName', 'SUMMARY'); await summary.click();
  await expectCohort(panel, population, 1, 0, 'birds'); await expectNoBand(panel);
  await expect(card).toHaveAttribute('data-arch-field-card', '');

  // Merely opening a band does not choose an organism or mutate the expedition.
  for (let index = 0; index < groups.length; index++) {
    await panel.locator('[data-field-variation-band="' + index + '"]').click();
    await expectBand(panel, index, groups[index], null);
    await expect(card).toHaveAttribute('data-arch-field-card', '');
  }
  const index = groups.findIndex(group => group.length >= 3);
  expect(index).toBeGreaterThanOrEqual(0);
  await panel.locator('[data-field-variation-band="' + index + '"]').click();
  const [a, b, c] = groups[index];
  await page.getByRole('button', { name: 'View whole archipelago', exact: true }).click();
  await panel.locator('[data-field-variation-resident="' + a.id + '"]').click();
  await expectBand(panel, index, groups[index], a.id);
  await expect(card).toHaveAttribute('data-arch-field-card', String(a.id));
  await expect(card.locator('[data-field-card-trait]')).toHaveAttribute('data-field-card-trait', String(trait(a)));
  await expect(page.locator('#ea-resident')).toHaveValue(String(a.id));
  await expect(page.locator('[data-arch-inspector]')).toHaveAttribute('data-arch-inspector', String(a.id));
  await expect(page.locator('[data-archipelago-view]')).toHaveAttribute('data-archipelago-view', 'island');
  await expect(page.locator('[data-arch-generation]')).toHaveText('G1');
  await expect.poll(async () => page.evaluate(id => {
    const w = window as any, record = w.__glRecorder.records.find((row: any) => row.scene && row.canvas.isConnected);
    const groups = record.scene.getObjectByName('Archipelago organisms').children;
    const selected = groups.find((group: any) => group.userData.id === id);
    return { visible: selected.visible, island: selected.userData.island, halo: selected.children.some((mesh: any) => mesh.geometry?.type === 'TorusGeometry') };
  }, a.id)).toEqual({ visible: true, island: 0, halo: true });
  await card.getByRole('button', { name: 'Pin this organism for comparison', exact: true }).click();
  await panel.locator('[data-field-variation-resident="' + b.id + '"]').click();
  await card.getByRole('button', { name: 'Capture this comparison', exact: true }).click();
  const captured = card.getByRole('region', { name: 'Captured comparison', exact: true });
  await expect(captured).toHaveAttribute('data-field-observation-a', String(a.id)); await expect(captured).toHaveAttribute('data-field-observation-b', String(b.id));
  await panel.locator('[data-field-variation-resident="' + c.id + '"]').click();
  await expectBand(panel, index, groups[index], c.id);
  await expect(captured).toHaveAttribute('data-field-observation-a', String(a.id)); await expect(captured).toHaveAttribute('data-field-observation-b', String(b.id));
  await panel.screenshot({ path: report + '/cohort-variation-desktop.png' });

  // Inspecting a recorded parent leaves the displayed cohort intact and never adds that parent to its bands.
  await card.getByRole('button', { name: 'Open full organism record', exact: true }).click();
  await expect(page.locator('.ea-inspector')).toBeFocused();
  await page.locator('.ea-inspector').getByRole('button', { name: new RegExp('^#' + c.parents[0] + ' ·') }).click();
  await expect(card).toHaveAttribute('data-field-card-presence', 'recorded');
  await expectCohort(panel, population, 1, 0, 'birds'); await expectBand(panel, index, groups[index], null);
  await expect(panel.locator('[data-field-variation-resident="' + c.parents[0] + '"]')).toHaveCount(0);
  await page.locator('[data-arch-island="2"]').click();
  await expectCohort(panel, fixture.world.history[1].demes[2].birds, 1, 2, 'birds'); await expectNoBand(panel);
  const mistBand = bands(fixture.world.history[1].demes[2].birds).findIndex(group => group.length > 0);
  await panel.locator('[data-field-variation-band="' + mistBand + '"]').click();
  await card.getByRole('button', { name: 'Browse Shellseed plants', exact: true }).click();
  await expectCohort(panel, fixture.world.history[1].demes[2].plants, 1, 2, 'plants'); await expectNoBand(panel);
  const plantBand = bands(fixture.world.history[1].demes[2].plants).findIndex(group => group.length > 0);
  await panel.locator('[data-field-variation-band="' + plantBand + '"]').click();
  await page.locator('#ea-generation').focus(); await page.keyboard.press('Home');
  await expectCohort(panel, fixture.world.history[0].demes[2].plants, 0, 2, 'plants'); await expectNoBand(panel);
  await expect(captured).toHaveAttribute('data-field-observation-a', String(a.id)); await expect(captured).toHaveAttribute('data-field-observation-b', String(b.id));
  expect(await savedState(page)).toEqual(original);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost).map(context => context.id)).toEqual(contexts.map(context => context.id));
  expect(errors).toEqual([]);
});

test('phone explores all six Mist founders using native keyboard buttons without WebGL or horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (getContext as any).call(this, type, ...args); } as any;
  });
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: false });
  const fixture = await page.evaluate(() => {
    const w = window as any, model = w.StemLab.evoArchipelagoModel, world = model.create(2026, true), primer = w.StemLab.evoIslandModel.create(2026);
    if (!model.restore(world)) throw new Error('Six-founder fixture must be replay-valid');
    localStorage.setItem('evoLab.archipelago.v1', JSON.stringify(world)); localStorage.setItem('evoLab.island.v1', JSON.stringify(primer));
    return { world, primer };
  });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'fallback');
  const original = await savedState(page), card = fieldCard(page), panel = variation(card), population = fixture.world.history[0].demes[2].birds;
  expect(population).toHaveLength(6);
  await enter(page, page.locator('[data-arch-island="2"]'));
  await enter(page, card.locator('summary').filter({ hasText: /^Explore variation in this cohort$/ }));
  await expectCohort(panel, population, 0, 2, 'birds'); await expectNoBand(panel);
  const groups = bands(population), index = groups.findIndex(group => group.length > 0), selected = groups[index][0];
  const bandButton = panel.locator('[data-field-variation-band="' + index + '"]');
  await enter(page, bandButton); await expect(bandButton).toBeFocused();
  await expectBand(panel, index, groups[index], null); await expect(card).toHaveAttribute('data-arch-field-card', '');
  const member = panel.locator('[data-field-variation-resident="' + selected.id + '"]');
  await enter(page, member); await expect(member).toBeFocused();
  await expectBand(panel, index, groups[index], selected.id);
  await expect(card).toHaveAttribute('data-arch-field-card', String(selected.id));
  await expect(page.locator('#ea-resident')).toHaveValue(String(selected.id));
  await expect(page.locator('[data-arch-inspector]')).toHaveAttribute('data-arch-inspector', String(selected.id));
  await expect(page.locator('[data-arch-island="2"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-arch-generation]')).toHaveText('G0');
  for (let nextIndex = 0; nextIndex < groups.length; nextIndex++) {
    await enter(page, panel.locator('[data-field-variation-band="' + nextIndex + '"]'));
    await expectBand(panel, nextIndex, groups[nextIndex], selected.id);
    await expect(card).toHaveAttribute('data-arch-field-card', String(selected.id));
  }
  await enter(page, bandButton);
  expect(await panel.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await card.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await panel.screenshot({ path: report + '/cohort-variation-phone.png' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-arch-field-card]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((result: any) => result.violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }))));
  expect(violations).toEqual([]); expect(await savedState(page)).toEqual(original);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost)).toHaveLength(0);
  expect(errors).toEqual([]);
});
