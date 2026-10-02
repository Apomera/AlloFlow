import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
const setRange = async (page: any, id: string, value: number) => page.locator(id).evaluate((input: HTMLInputElement, v: number) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v)); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
}, value);

test('a generation story reconciles live evidence, migrant copies and archived rounds without changing the expedition', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { evoLab: { view: 'archipelago' } });
  const fixture = await page.evaluate(() => {
    const m = (window as any).StemLab.evoArchipelagoModel; let world = m.create(21); world.settings.migration = .4; world.settings.mutation = .05;
    for (let g = 0; g < 3; g++) world = m.step(world); return world;
  });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture } });
  const original = await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.archipelago));
  const trace = await page.evaluate(w => (window as any).StemLab.evoArchipelagoModel.story(w, 3, 0, 'birds'), fixture);
  const story = page.locator('[data-generation-story]');
  await expect(story).toHaveAttribute('data-generation-story', '3');
  for (const step of trace.stages) expect(Number(await story.locator('[data-story-stage="' + step.key + '"]').getAttribute('data-story-value'))).toBeCloseTo(step.trait, 12);
  await story.locator('[data-story-stage="expected"]').click(); await expect(story.locator('[data-story-detail]')).toContainText('two distinct parents');
  await story.getByRole('button', { name: 'Neutral marker A frequency', exact: true }).click();
  await expect(story.locator('[data-story-detail]')).toContainText('does not make A a beneficial allele');
  for (const step of trace.stages) expect(Number(await story.locator('[data-story-stage="' + step.key + '"]').getAttribute('data-story-value'))).toBeCloseTo(step.marker, 12);
  const newborn = trace.newborns.find((o: any) => o.copies.some((c: any) => c.from !== 0)); expect(newborn).toBeTruthy();
  await story.locator('summary').filter({ hasText: /^Follow a real newborn’s copies$/ }).click();
  await story.locator('#ea-story-child').selectOption(String(newborn.id));
  for (let j = 0; j < 2; j++) {
    const allele = story.locator('[data-story-copy="' + j + '"]'), actual = newborn.copies[j];
    await expect(allele).toHaveAttribute('data-copy-parent', String(actual.parent)); await expect(allele).toHaveAttribute('data-copy-from', String(actual.from));
    expect(Number(await allele.getAttribute('data-copy-before'))).toBe(actual.traitBeforeMutation); expect(Number(await allele.getAttribute('data-copy-after'))).toBe(actual.traitAfterMutation);
    await expect(allele).toHaveAttribute('data-copy-marker', String(actual.marker));
  }
  await story.locator('summary').filter({ hasText: /^Which islands supplied the newborn alleles\?$/ }).click();
  for (const route of trace.routes) await expect(story.locator('[data-story-origin="' + route.from + '"] td').first()).toHaveText(String(route.copies));
  await story.getByRole('button', { name: 'Meet this newborn and its family', exact: true }).click();
  await expect(page.locator('[data-arch-inspector]')).toHaveAttribute('data-arch-inspector', String(newborn.id));
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.archipelago))).toBe(original);
  await story.screenshot({ path: report + '/generation-story-desktop.png' });
  await page.getByRole('button', { name: 'Save island evidence to journal', exact: true }).click();
  const note = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoEvidence.text);
  expect(note).toContain('Recorded generation story for Ember'); expect(note).toContain('not a unique causal decomposition'); expect(note).toContain('Parent origins one generation earlier');
  await setRange(page, '#ea-generation', 1);
  const recorded = await story.textContent();
  await page.getByLabel('Trait-dependent breeding weights', { exact: true }).uncheck();
  expect(await story.textContent()).toBe(recorded);
  await page.selectOption('#ea-story-species', 'plants');
  await expect(story).toContainText('Seed-shell hardness');
  const plantTrace = await page.evaluate(w => (window as any).StemLab.evoArchipelagoModel.story(w, 1, 0, 'plants'), fixture);
  expect(Number(await story.locator('[data-story-stage="newborns"]').getAttribute('data-story-value'))).toBeCloseTo(plantTrace.stages[5].marker, 12);
  const queued = await page.evaluate(() => (window as any).__toolData.evoLab.archipelago);
  expect(queued.history).toEqual(fixture.history); expect(queued.rng).toBe(fixture.rng); expect(errors).toEqual([]);
  const longExplanation = 'Compare actual inherited copies with the expected cohort. '.repeat(105).slice(0, 5950) + ' END OF MY REASONING';
  await page.locator('#ea-explanation').fill(longExplanation);
  await page.getByRole('button', { name: 'Save island evidence to journal', exact: true }).click();
  const longNote = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoEvidence.text);
  expect(longNote).toContain(longExplanation); expect(longNote).toContain('Limits:'); expect(longNote.length).toBeLessThanOrEqual(12000);
});

test('phone learners can explore drift by keyboard without a 3D renderer and with accessible story controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any; });
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  const story = page.locator('[data-generation-story]');
  await expect(story).toHaveAttribute('data-generation-story', 'founders');
  await page.getByLabel('Trait-dependent breeding weights', { exact: true }).uncheck();
  await story.getByRole('button', { name: 'Record the first generation', exact: true }).click();
  await expect(story).toHaveAttribute('data-generation-story', '1');
  const expected = story.locator('[data-story-stage="expected"]'); await expected.focus(); await page.keyboard.press('Enter');
  await expect(expected).toHaveAttribute('aria-pressed', 'true'); await expect(story.locator('[data-story-detail]')).toContainText('Selection was off in this recorded round');
  expect(Number(await expected.getAttribute('data-story-value'))).toBeCloseTo(Number(await story.locator('[data-story-stage="dispersal"]').getAttribute('data-story-value')), 12);
  await story.getByRole('button', { name: 'Neutral marker A frequency', exact: true }).click();
  await story.locator('summary').filter({ hasText: /^Follow a real newborn’s copies$/ }).click();
  await story.locator('#ea-story-child').focus(); await page.keyboard.press('End');
  await expect(story.locator('[data-story-copy]')).toHaveCount(2);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-archipelago]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.setViewportSize({ width: 390, height: 1400 });
  await story.screenshot({ path: report + '/generation-story-phone.png' });
  await setRange(page, '#ea-generation', 0);
  await story.getByRole('button', { name: 'See the first recorded round', exact: true }).click(); await expect(page.locator('[data-arch-generation]')).toHaveText('G1');
});
