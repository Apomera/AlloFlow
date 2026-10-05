import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
const range = async (page: any, value: number) => page.locator('#ea-founders-generation').evaluate((input: HTMLInputElement, v: number) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v)); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }, value);
async function fixture(page: any, saved?: any, fallback = false) {
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: !fallback });
  const world = await page.evaluate(() => (window as any).StemLab.evoArchipelagoModel.step((window as any).StemLab.evoArchipelagoModel.create(21)));
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: world, ...(saved ? { archipelagoFounders: saved } : {}) } }, undefined, { expectCanvas: !fallback }); return world;
}

test('saved boats support fair repeated comparisons, separate condition evidence, common-generation revisits and reproducible downloads', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const world = await fixture(page), original = JSON.stringify(world), panel = page.locator('[data-founder-voyage]');
  await panel.getByRole('button', { name: 'Draw founder boats', exact: true }).click(); await range(page, 5);
  const firstReasoning = 'Isolation and recorded copy ancestry. '.repeat(105).slice(0, 3900) + ' FINAL EVIDENCE';
  await panel.locator('#ea-founders-reasoning').fill(firstReasoning); await panel.locator('#ea-founders-prediction').fill('My isolated prediction.');
  await panel.getByRole('button', { name: 'Draw another founder voyage', exact: true }).click(); await expect(panel.locator('#ea-founders-reasoning')).toHaveValue('');
  await panel.locator('#ea-founders-reasoning').fill('Second draw has its own evidence.'); await range(page, 5); await panel.locator('#ea-founders-response').selectOption('H');
  const expected = await page.evaluate(() => { const m = (window as any).StemLab.evoArchipelagoModel; return m.founderVoyageComparison(JSON.parse(localStorage.getItem('evoLab.archipelago.founders.v1')!), 'birds', 'H', 5); });
  await expect(panel.locator('[data-founder-comparison-group]')).toHaveAttribute('data-founder-comparison-group', '2');
  expect(Number(await panel.locator('[data-founder-difference-mean]').getAttribute('data-founder-difference-mean'))).toBe(expected.difference.mean);
  for (const row of expected.rows) { const tr = panel.locator('[data-founder-comparison-key="' + row.key + '"]'); expect(Number(await tr.getAttribute('data-founder-comparison-small'))).toBe(row.small); expect(Number(await tr.getAttribute('data-founder-comparison-large'))).toBe(row.large); expect(Number(await tr.getAttribute('data-founder-comparison-difference'))).toBe(row.difference); }
  const point = panel.locator('[data-founder-point="21:0:0:small"]'); await point.focus(); await page.keyboard.press('Enter');
  await expect(panel.locator('[data-founder-batch]')).toHaveAttribute('data-founder-batch', '0'); await expect(panel.locator('[data-founder-generation]')).toHaveText('G5 / G5'); await expect(panel.locator('#ea-founders-reasoning')).toHaveValue(firstReasoning);
  await panel.locator('#ea-founders-linked').check(); await panel.locator('#ea-founders-reasoning').fill('Connected boats have their own evidence.'); await expect(panel.locator('[data-founder-comparison-group]')).toHaveAttribute('data-founder-comparison-group', '1');
  await panel.locator('#ea-founders-linked').uncheck(); await expect(panel.locator('#ea-founders-reasoning')).toHaveValue(firstReasoning); await expect(panel.locator('#ea-founders-prediction')).toHaveValue('My isolated prediction.');
  await panel.locator('#ea-founders-voyage').selectOption('21:1:0'); await expect(panel.locator('#ea-founders-reasoning')).toHaveValue('Second draw has its own evidence.'); await range(page, 3);
  await panel.locator('#ea-founders-voyage').selectOption('21:0:0.3'); await expect(panel.locator('[data-founder-generation]')).toHaveText('G3 / G5'); await expect(panel.locator('#ea-founders-reasoning')).toHaveValue('Connected boats have their own evidence.');
  await panel.locator('#ea-founders-voyage').selectOption('21:0:0'); await panel.getByRole('button', { name: 'Draw another founder voyage', exact: true }).click(); await expect(panel.locator('[data-founder-batch]')).toHaveAttribute('data-founder-batch', '2');
  await range(page, 5); await panel.locator('#ea-founders-voyage').selectOption('21:0:0');
  await expect(panel.locator('[data-founder-collection]')).toHaveAttribute('data-founder-collection', '4'); await expect(panel.locator('[data-founder-comparison-group]')).toHaveAttribute('data-founder-comparison-group', '3');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.archipelago.founders.v1')!));
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: world } }); await expect(panel.locator('#ea-founders-reasoning')).toHaveValue(firstReasoning); await expect(panel.locator('[data-founder-generation]')).toHaveText('G5 / G5');
  await panel.locator('#ea-founders-response').selectOption('H');
  const downloadPromise = page.waitForEvent('download'); await panel.getByRole('button', { name: 'Download voyage collection', exact: true }).click(); const download = await downloadPromise; const data = JSON.parse(readFileSync((await download.path())!, 'utf8'));
  expect(data.format).toBe('evolab-founder-collection'); expect(data.recipe).toEqual(saved); expect(data.view).toEqual({ species: 'birds', metric: 'H', generation: 5 }); expect(data.comparison.excluded).toBe(1); expect(data.comparison.rows).toHaveLength(3); expect(data.recipe.reasoning).toBe(firstReasoning); expect(data.limits).toContain('not confidence intervals');
  const replay = await page.evaluate(data => (window as any).StemLab.evoArchipelagoModel.founderVoyageComparison(data.recipe, data.view.species, data.view.metric, data.view.generation), data); expect(replay).toEqual(data.comparison);
  await panel.getByRole('button', { name: 'Save founder evidence to journal', exact: true }).click(); const note = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoFounders.text); expect(note).toContain(firstReasoning); expect(note).toContain('compatible draws=3'); expect(note).toContain('not confidence intervals');
  await panel.locator('.ea-founder-collection').screenshot({ path: report + '/founder-collection-desktop.png' });
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.archipelago))).toBe(original); const contexts = (await harness.glContexts(page)).filter(c => c.connected && !c.lost); expect(contexts).toHaveLength(1); expect(contexts[0].draws).toBeGreaterThan(0); expect(errors).toEqual([]);
});

test('phone collection is keyboard navigable, accessible, responsive and works without WebGL', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any; });
  await fixture(page, undefined, true);
  const saved = await page.evaluate(() => { const m = (window as any).StemLab.evoArchipelagoModel; let saved = null; for (let i = 0; i < 6; i++) saved = m.drawFounderVoyage(saved, 21, 0, 'prediction ' + i, 'evidence ' + i); return { ...saved, generation: 5 }; });
  const world = await fixture(page, saved, true); await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  const panel = page.locator('[data-founder-voyage]'); await panel.locator('#ea-founders-response').selectOption('H'); await panel.locator('#ea-founders-species').selectOption('plants');
  const point = panel.locator('[data-founder-point="21:0:0:large"]'); await point.focus(); await page.keyboard.press('Space'); await expect(panel.locator('[data-founder-batch]')).toHaveAttribute('data-founder-batch', '0'); await expect(panel.locator('#ea-founders-reasoning')).toHaveValue('evidence 0'); await expect(panel.locator('[data-founder-generation]')).toHaveText('G5 / G5');
  await panel.locator('#ea-founders-voyage').focus(); await page.keyboard.press('End'); await expect(panel.locator('#ea-founders-voyage')).toHaveValue('21:0:0');
  await panel.getByText('Read the recorded voyage comparisons', { exact: true }).click(); await expect(panel.locator('[data-founder-comparisons] tbody tr')).toHaveCount(6);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); const violations = await page.evaluate(async () => (window as any).axe.run('[data-archipelago]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })))); expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true); await panel.locator('.ea-founder-collection').screenshot({ path: report + '/founder-collection-phone.png' }); expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(world);
});
