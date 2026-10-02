import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
const setRange = async (page: any, id: string, value: number) => page.locator(id).evaluate((input: HTMLInputElement, v: number) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v)); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
}, value);

test('a real 3D expedition supports a repeated field study, private lineage replay, reproducible export and cancellation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { evoLab: { view: 'archipelago' } });
  const fixture = await page.evaluate(() => { const m = (window as any).StemLab.evoArchipelagoModel; let w = m.create(21); w.settings.migration = .3; w.settings.mutation = .03; for (let i = 0; i < 2; i++) w = m.step(w); return w; });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture } });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'ready');
  await page.getByRole('button', { name: 'Run a field study', exact: true }).click();
  await expect(page.locator('#ea-research-title')).toBeFocused();
  const study = page.locator('[data-arch-research]'), original = JSON.stringify(fixture);
  await study.locator('#ea-research-count').selectOption('8');
  await study.locator('#ea-research-prediction').fill('Connections may retain marker variation, but individual futures may differ.');
  await study.getByRole('button', { name: 'Run study from present generation', exact: true }).click();
  await expect(study).toHaveAttribute('data-arch-research', 'complete');
  await expect(study.locator('[data-research-point]')).toHaveCount(32);
  await expect(study).toContainText('census-weighted mean across occupied islands, not total genetic diversity');
  const raw = await page.evaluate(() => (window as any).__toolData.evoLab.archipelagoResearch);
  const expected = await page.evaluate(data => {
    const m = (window as any).StemLab.evoArchipelagoModel, w = m.restoreCheckpoint(data.source), p = m.researchPlan(w, data.options), t = Array.from({ length: p.replicates }, (_, i) => m.researchTrial(w, p, i));
    return { summary: m.researchSummary(t, 'within', 'birds', 0), trials: t, plan: p };
  }, raw);
  for (const c of expected.summary.conditions) expect(Number(await study.locator('[data-research-summary="' + c.id + '"]').getAttribute('data-research-mean'))).toBeCloseTo(c.mean, 12);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.archipelago))).toBe(original);
  await study.locator('[data-research-point="10:3"]').click();
  await expect(study.locator('[data-research-trial]')).toHaveAttribute('data-research-trial', '3'); await expect(study.locator('[data-research-trial]')).toHaveAttribute('data-research-condition', '10');
  await study.locator('summary').filter({ hasText: /^Trace a newborn in this private future$/ }).click();
  await setRange(page, '#ea-research-generation', 1);
  await expect(study.locator('[data-private-generation]')).toHaveAttribute('data-private-generation', '3');
  await expect(page.locator('[data-arch-generation]')).toHaveText('G2');
  const id = Number(await study.locator('#ea-research-birth').inputValue());
  const birth = await page.evaluate(({ data, id }) => {
    const m = (window as any).StemLab.evoArchipelagoModel, w = m.restoreCheckpoint(data.source), p = m.researchPlan(w, data.options), b = m.researchBranch(w, p, 3, '10');
    return m.story(b, p.start + 1, 0, 'birds').newborns.find((o: any) => o.id === id);
  }, { data: raw, id });
  for (let j = 0; j < 2; j++) {
    const copy = study.locator('[data-research-copy="' + j + '"]'); await expect(copy).toHaveAttribute('data-research-parent', String(birth.copies[j].parent));
    expect(Number(await copy.getAttribute('data-research-before'))).toBe(birth.copies[j].traitBeforeMutation); expect(Number(await copy.getAttribute('data-research-after'))).toBe(birth.copies[j].traitAfterMutation);
  }
  await study.locator('summary').filter({ hasText: /^Does the effect of connections depend on partners\?$/ }).click();
  expect(Number(await study.locator('[data-research-contrast="interaction"]').getAttribute('data-contrast-mean'))).toBeCloseTo(expected.summary.interaction.mean, 12);
  await study.screenshot({ path: report + '/field-study-desktop.png' });
  const reasoning = 'Compare the spread and paired effects. '.repeat(150).slice(0, 5900) + ' END OF REASONING';
  await study.locator('#ea-research-reasoning').fill(reasoning);
  await study.getByRole('button', { name: 'Save repeated study to journal', exact: true }).click();
  const note = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoResearch.text);
  expect(note).toContain(reasoning); expect(note).toContain('not confidence intervals'); expect(note).toContain('paired mean difference'); expect(note).toContain('One neutral marker: H = 2p(1−p)');
  const downloadEvent = page.waitForEvent('download'); await study.getByRole('button', { name: 'Download reproducible study data', exact: true }).click();
  const download = await downloadEvent, downloadPath = test.info().outputPath('field-study.json'); await download.saveAs(downloadPath);
  const exported = JSON.parse(readFileSync(downloadPath, 'utf8')); expect(exported.trials).toEqual(expected.trials); expect(exported.plan).toEqual(expected.plan); expect(exported.recipe.reasoning).toBe(reasoning);
  await setRange(page, '#ea-rain-0', .95); await expect(study.locator('[data-research-stale]')).toBeVisible();
  for (const c of expected.summary.conditions) expect(Number(await study.locator('[data-research-summary="' + c.id + '"]').getAttribute('data-research-mean'))).toBeCloseTo(c.mean, 12);
  await study.locator('#ea-research-count').selectOption('24');
  const canceled = await page.evaluate(async () => {
    const panel = document.querySelector('[data-arch-research]')!;
    Array.from(panel.querySelectorAll('button')).find(b => b.textContent === 'Run study from present generation')!.click();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const cancel = Array.from(panel.querySelectorAll('button')).find(b => b.textContent === 'Cancel study'); if (!cancel) return false; cancel.click(); return true;
  });
  expect(canceled).toBe(true); await expect(study).toHaveAttribute('data-arch-research', 'complete'); await expect(study).toContainText('Study canceled');
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelagoResearch.options.batch)).toBe(raw.options.batch);
  const current = await page.evaluate(() => (window as any).__toolData.evoLab.archipelago); expect(current.history).toEqual(fixture.history); expect(current.rng).toBe(fixture.rng);
  const contexts = (await harness.glContexts(page)).filter(c => c.connected && !c.lost); expect(contexts).toHaveLength(1); expect(contexts[0].draws).toBeGreaterThan(0); expect(errors).toEqual([]);
});

test('phone learners can run the null control, revisit saved outcomes and repeat a captured population without WebGL', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any; });
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: false });
  const fixture = await page.evaluate(() => { const m = (window as any).StemLab.evoArchipelagoModel, w = m.create(5); w.settings.selection = false; return w; });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  const study = page.locator('[data-arch-research]');
  await study.locator('#ea-research-count').selectOption('8'); await study.locator('#ea-research-prediction').fill('Partner settings should have no effect when selection is off.');
  await study.getByRole('button', { name: 'Run study from present generation', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(study).toHaveAttribute('data-arch-research', 'complete'); await expect(study).toContainText('paired on/off futures are identical');
  const recipe = await page.evaluate(() => (window as any).__toolData.evoLab.archipelagoResearch);
  await study.locator('#ea-research-metric').selectOption('trait');
  expect(await study.locator('[data-research-summary="00"]').getAttribute('data-research-mean')).toBe(await study.locator('[data-research-summary="01"]').getAttribute('data-research-mean'));
  expect(await study.locator('[data-research-summary="10"]').getAttribute('data-research-mean')).toBe(await study.locator('[data-research-summary="11"]').getAttribute('data-research-mean'));
  await study.locator('#ea-research-trial').focus(); await page.keyboard.press('End'); await expect(study.locator('[data-research-trial]')).toHaveAttribute('data-research-trial', '7');
  await study.locator('summary').filter({ hasText: /^Trace a newborn in this private future$/ }).click(); await expect(study.locator('[data-research-copy]')).toHaveCount(2);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-archipelago]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })))); expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.setViewportSize({ width: 390, height: 1400 }); await study.screenshot({ path: report + '/field-study-phone.png' });
  const means = await study.locator('[data-research-summary]').evaluateAll(rows => rows.map(row => row.getAttribute('data-research-mean')));
  await page.getByRole('button', { name: '← Living Island primer', exact: true }).click(); await page.getByRole('button', { name: 'Explore Island Connections · advanced →', exact: true }).click();
  await expect(study).toHaveAttribute('data-arch-research', 'complete'); await expect(study.locator('#ea-research-prediction')).toHaveValue('Partner settings should have no effect when selection is off.');
  expect(await study.locator('[data-research-summary]').evaluateAll(rows => rows.map(row => row.getAttribute('data-research-mean')))).toEqual(means);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelagoResearch.options)).toEqual(recipe.options);
  await page.getByRole('button', { name: 'Advance one generation', exact: true }).click(); await expect(study.locator('[data-research-stale]')).toBeVisible();
  await study.getByRole('button', { name: 'Repeat this starting population', exact: true }).click(); await expect(study).toHaveAttribute('data-arch-research', 'complete');
  const repeat = await page.evaluate(() => (window as any).__toolData.evoLab.archipelagoResearch);
  expect(repeat.source).toEqual(recipe.source); expect(repeat.options.batch).toBe(recipe.options.batch + 1);
  await expect(page.locator('[data-arch-generation]')).toHaveText('G1'); expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago.generation)).toBe(1);
});
