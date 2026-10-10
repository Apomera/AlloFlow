import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000, retries: 0, mode: 'serial' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
const fieldCard = (page: Page) => page.getByRole('region', { name: 'Island field card', exact: true });
const story = (page: Page) => page.locator('.ea-story');
const variationSummary = (card: Locator) => card.locator('summary').filter({ hasText: /^Explore variation in this cohort$/ });
const variation = (card: Locator) => card.getByRole('region', { name: 'Displayed cohort variation', exact: true });
const reference = (card: Locator) => card.getByRole('region', { name: 'Pinned cohort comparison', exact: true });
const captured = (card: Locator) => card.getByRole('region', { name: 'Captured cohort comparison', exact: true });
const cohortTrace = (card: Locator) => card.getByRole('button', { name: 'Trace this recorded round', exact: true });
const residentTrace = (card: Locator) => card.getByRole('button', { name: 'Trace this resident’s inherited copies', exact: true });
const returnButton = (page: Page) => story(page).getByRole('button', { name: 'Return to field card', exact: true });
const enter = async (page: Page, target: Locator) => { await target.focus(); await page.keyboard.press('Enter'); };

test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function makeFixture(page: Page, generations: number) {
  return page.evaluate(generations => {
    const w = window as any, model = w.StemLab.evoArchipelagoModel;
    let world = model.create(2026, true);
    for (let generation = 0; generation < generations; generation++) world = model.step(world);
    const primer = w.StemLab.evoIslandModel.create(2026), next = model.step(world);
    if (!model.restore(world)) throw new Error('Story entry must use a replay-valid expedition');
    localStorage.setItem('evoLab.archipelago.v1', JSON.stringify(world));
    localStorage.setItem('evoLab.island.v1', JSON.stringify(primer));
    return { world, primer, expectedNext: JSON.stringify(next), plants: generations ? model.story(world, generations, 2, 'plants') : null, nextBirds: model.story(next, next.generation, 2, 'birds') };
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

async function expectContext(page: Page, generation: number, island: number, species: string, id: number) {
  const card = fieldCard(page), panel = variation(card);
  await expect(card.locator('#ea-field-generation')).toHaveValue(String(generation));
  await expect(page.locator('#ea-generation')).toHaveValue(String(generation));
  await expect(panel).toHaveAttribute('data-field-variation-generation', String(generation));
  await expect(panel).toHaveAttribute('data-field-variation-island', String(island));
  await expect(panel).toHaveAttribute('data-field-variation-species', species);
  await expect(page.locator('[data-arch-island="' + island + '"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(card.locator('#ea-field-resident')).toHaveValue(String(id));
}

async function expectCopies(page: Page, trace: any, id: number) {
  const panel = story(page), child = trace.newborns.find((newborn: any) => newborn.id === id);
  expect(child).toBeTruthy();
  await expect(panel).toHaveAttribute('data-story-lens', 'trait');
  await expect(panel.locator('[data-story-stage][aria-pressed="true"]')).toHaveAttribute('data-story-stage', trace.stages[5].key);
  await expect(panel.locator('.ea-copy-trail')).toHaveJSProperty('open', true);
  await expect(panel.locator('#ea-story-child')).toHaveValue(String(id));
  await expect(panel.locator('[data-story-copy]')).toHaveCount(2);
  for (let index = 0; index < 2; index++) {
    const copy = child.copies[index], row = panel.locator('[data-story-copy="' + index + '"]');
    await expect(row).toHaveAttribute('data-copy-parent', String(copy.parent));
    await expect(row).toHaveAttribute('data-copy-from', String(copy.from));
    await expect(row).toHaveAttribute('data-copy-marker', String(copy.marker));
    expect(Number(await row.getAttribute('data-copy-before'))).toBeCloseTo(copy.traitBeforeMutation, 12);
    expect(Number(await row.getAttribute('data-copy-after'))).toBeCloseTo(copy.traitAfterMutation, 12);
  }
}

test('desktop connects a pinned cohort and a selected non-first resident to the recorded round, restoring context and frozen evidence on return', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { evoLab: { view: 'archipelago' } });
  const fixture = await makeFixture(page, 3);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer } });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'ready');
  const original = await savedState(page), contexts = (await harness.glContexts(page)).filter(context => context.connected && !context.lost);
  expect(contexts).toHaveLength(1); expect(contexts[0].renders).toBeGreaterThan(0);
  const card = fieldCard(page), range = card.locator('#ea-field-generation');
  await page.locator('[data-arch-island="2"]').click();
  await card.getByRole('button', { name: 'Browse Shellseed plants', exact: true }).click();
  await variationSummary(card).click(); await range.focus(); await page.keyboard.press('Home');
  await card.getByRole('button', { name: 'Pin displayed cohort as reference', exact: true }).click();
  await expect(cohortTrace(card)).toBeDisabled();
  await range.focus(); await page.keyboard.press('End');
  await card.getByRole('button', { name: 'Capture cohort comparison', exact: true }).click();
  const frozenEvidence = (await captured(card).locator('pre').textContent())!;
  const reflection = 'The two complete censuses differ. This recorded round describes G2 to G3; it does not isolate the cause of all differences from G0.';
  await captured(card).getByRole('textbox').fill(reflection);
  const cohort = fixture.world.history[3].demes[2].plants, firstPinned = cohort[7], selected = cohort[11];
  await card.locator('#ea-field-resident').selectOption(String(firstPinned.id));
  await card.getByRole('button', { name: 'Pin this organism for comparison', exact: true }).click();
  await card.locator('#ea-field-resident').selectOption(String(selected.id));
  await expect(cohortTrace(card)).toHaveAttribute('id', 'ea-field-cohort-story');
  await cohortTrace(card).click();
  await expect(story(page).locator('#ea-story-title')).toBeFocused();
  await expect(story(page)).toHaveAttribute('data-generation-story', '3');
  await expect(story(page).locator('#ea-story-species')).toHaveValue('plants');
  await expect(story(page).locator('[data-story-stage][aria-pressed="true"]')).toHaveAttribute('data-story-stage', fixture.plants.stages[0].key);
  await expect(story(page)).toContainText('not a unique causal decomposition of evolution');

  // The return route remembers the field context, even after changing the story's species and closing its source details.
  await story(page).locator('#ea-story-species').selectOption('birds');
  await variationSummary(card).click(); await expect(variation(card)).toBeHidden();
  await returnButton(page).click();
  await expect(cohortTrace(card)).toBeFocused(); await expect(variation(card)).toBeVisible();
  await expectContext(page, 3, 2, 'plants', selected.id);
  await expect(reference(card)).toHaveAttribute('data-field-cohort-reference-generation', '0');
  await expect(reference(card)).toHaveAttribute('data-field-cohort-reference-species', 'plants');
  await expect(card.locator('[data-field-reference]')).toHaveAttribute('data-field-reference', String(firstPinned.id));
  await expect(captured(card).locator('pre')).toHaveText(frozenEvidence);
  await expect(captured(card).getByRole('textbox')).toHaveValue(reflection);

  await expect(residentTrace(card)).toHaveAttribute('id', 'ea-field-resident-story');
  await residentTrace(card).click();
  await expect(story(page).locator('#ea-story-child')).toBeFocused();
  await expectCopies(page, fixture.plants, selected.id);
  // Normal choices inside the story remain usable; returning still restores the resident that initiated this visit.
  await story(page).locator('#ea-story-child').selectOption(String(cohort[8].id));
  await expect(story(page).locator('#ea-story-child')).toHaveValue(String(cohort[8].id));
  await story(page).getByRole('button', { name: 'Neutral marker A frequency', exact: true }).click();
  await expect(story(page)).toHaveAttribute('data-story-lens', 'marker');
  await returnButton(page).click(); await expect(residentTrace(card)).toBeFocused();
  await expectContext(page, 3, 2, 'plants', selected.id);

  const second = cohort[16];
  await card.locator('#ea-field-resident').selectOption(String(second.id));
  await residentTrace(card).click(); await expect(story(page).locator('#ea-story-child')).toBeFocused();
  await expectCopies(page, fixture.plants, second.id);
  await story(page).screenshot({ path: report + '/story-bridge-desktop.png' });
  await returnButton(page).click(); await expect(residentTrace(card)).toBeFocused();
  await expectContext(page, 3, 2, 'plants', second.id);
  await expect(captured(card).locator('pre')).toHaveText(frozenEvidence);
  await expect(captured(card).getByRole('textbox')).toHaveValue(reflection);
  expect(await savedState(page)).toEqual(original);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost).map(context => context.id)).toEqual(contexts.map(context => context.id));
  await page.getByRole('button', { name: 'Advance one generation', exact: true }).click();
  const advanced = await savedState(page);
  expect(advanced.world).toBe(fixture.expectedNext); expect(advanced.archipelagoCache).toBe(fixture.expectedNext);
  expect(advanced.journal).toBe(original.journal); expect(advanced.primer).toBe(original.primer); expect(advanced.study).toBe(original.study);
  expect(errors).toEqual([]);
});

test('phone makes founder limits and keyboard story entry clear, with exact inheritance and return focus without WebGL', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (getContext as any).call(this, type, ...args); } as any;
  });
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: false });
  const fixture = await makeFixture(page, 0);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'fallback');
  const card = fieldCard(page), founders = await savedState(page);
  await enter(page, page.locator('[data-arch-island="2"]')); await enter(page, variationSummary(card));
  await expect(cohortTrace(card)).toHaveJSProperty('tagName', 'BUTTON'); await expect(cohortTrace(card)).toHaveAttribute('type', 'button');
  await expect(cohortTrace(card)).toBeDisabled();
  await expect(card).toContainText('G0 is a founding sample. There is no earlier recorded breeding round to trace.');
  await card.locator('#ea-field-resident').selectOption(String(fixture.world.history[0].demes[2].birds[2].id));
  await expect(residentTrace(card)).toHaveCount(0); expect(await savedState(page)).toEqual(founders);
  await enter(page, page.getByRole('button', { name: 'Advance one generation', exact: true }));
  expect((await savedState(page)).world).toBe(fixture.expectedNext);
  const original = await savedState(page), selected = fixture.nextBirds.newborns[9];
  await card.locator('#ea-field-resident').selectOption(String(selected.id));
  await expect(cohortTrace(card)).toBeEnabled();
  await enter(page, cohortTrace(card)); await expect(story(page).locator('#ea-story-title')).toBeFocused();
  await expect(story(page)).toHaveAttribute('data-generation-story', '1');
  await expect(story(page).locator('[data-story-stage][aria-pressed="true"]')).toHaveAttribute('data-story-stage', fixture.nextBirds.stages[0].key);
  await expect(returnButton(page)).toHaveAttribute('type', 'button');
  await enter(page, returnButton(page)); await expect(cohortTrace(card)).toBeFocused();
  await expectContext(page, 1, 2, 'birds', selected.id);
  await expect(residentTrace(card)).toHaveAttribute('type', 'button');
  await enter(page, residentTrace(card)); await expect(story(page).locator('#ea-story-child')).toBeFocused();
  await expectCopies(page, fixture.nextBirds, selected.id);
  expect(await story(page).evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await card.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await story(page).screenshot({ path: report + '/story-bridge-phone.png' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-arch-field-card], .ea-story', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((result: any) => result.violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }))));
  expect(violations).toEqual([]);
  await enter(page, returnButton(page)); await expect(residentTrace(card)).toBeFocused();
  await expectContext(page, 1, 2, 'birds', selected.id);
  // A second activation of the same target is a new deliberate entry, with the same exact newborn selected.
  await page.keyboard.press('Enter'); await expect(story(page).locator('#ea-story-child')).toBeFocused();
  await expectCopies(page, fixture.nextBirds, selected.id);
  await enter(page, returnButton(page)); await expect(residentTrace(card)).toBeFocused();
  expect(await savedState(page)).toEqual(original);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost)).toHaveLength(0);
  expect(errors).toEqual([]);
});
