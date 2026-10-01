import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 120_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
const value = (o: any, trait: string) => (o.genes[trait][0] + o.genes[trait][1]) / 2;
const members = (population: any[], trait: string, bin: number) => population.filter(o => Math.min(4, Math.floor(value(o, trait) * 5)) === bin);
const fullest = (population: any[], trait: string) => [0, 1, 2, 3, 4].sort((a, b) => members(population, trait, b).length - members(population, trait, a).length)[0];

test('population exploration links two fixed generations to their real organisms and preserves separate journal evidence', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  const fixture = await page.evaluate(() => {
    const m = (window as any).StemLab.evoIslandModel; let world = m.create(2026);
    for (let i = 0; i < 6; i++) world = m.step(world);
    world.habitat = Object.keys(m.habitats).find(key => key !== world.history[6].habitat);
    return { world, habitatNames: Object.fromEntries(Object.entries(m.habitats).map(([key, item]: any) => [key, item.name])) };
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: fixture.world, evoProgress: { notes: {
    livingIsland: { text: 'My own explanation.', at: '2026-10-01' },
    livingIslandData: { text: 'My earlier evidence.', at: '2026-10-01' },
    livingIslandCohorts: { text: 'My generation comparison.', at: '2026-10-01' }
  } } } });
  const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.island)), world = JSON.parse(saved);
  const savedLocal = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  const contexts = (await harness.glContexts(page)).filter(row => row.connected && !row.lost).map(row => row.id);
  await page.getByRole('button', { name: 'Predict this round', exact: true }).click();
  await page.locator('#ei-forecast-number').fill('17');
  await page.getByRole('button', { name: 'Compare across generations', exact: true }).click();
  const comparison = page.locator('[data-population-comparison]');
  await expect(comparison).toHaveJSProperty('open', true); await expect(comparison).toBeFocused();
  await expect(page.locator('#ei-forecast-number')).toHaveValue('17');
  const entry = await comparison.boundingBox(), transport = await page.locator('.ei-commandbar').boundingBox();
  expect(entry!.y).toBeGreaterThanOrEqual(transport!.y + transport!.height);
  await expect(page.locator('#ei-pop-generation-0')).toHaveValue('0'); await expect(page.locator('#ei-pop-generation-1')).toHaveValue('6');
  for (const [side, generation] of [0, 6].entries()) {
    const population = world.history[generation].population;
    await expect(comparison.locator('[data-population-side="' + side + '"]')).toContainText(fixture.habitatNames[world.history[generation].habitat]);
    expect(Number(await comparison.locator('[data-population-side="' + side + '"] [data-population-mean]').getAttribute('data-population-mean'))).toBeCloseTo(population.reduce((sum: number, o: any) => sum + value(o, 'fur'), 0) / population.length, 12);
    for (let bin = 0; bin < 5; bin++) {
      const button = comparison.locator('[data-population-bin="' + side + ':' + bin + '"]'), count = members(population, 'fur', bin).length;
      await expect(button).toHaveAttribute('data-population-count', String(count));
      expect(Number(await button.getAttribute('data-population-share'))).toBe(count / population.length);
    }
  }
  await expect(page.locator('[data-island-scene]')).toBeInViewport({ ratio: 0.5 });
  await expect(page.locator('#ei-lens')).toHaveValue('fur');
  await expect(page.locator('.ei-stage-top')).toContainText(fixture.habitatNames[world.history[6].habitat]);
  await page.screenshot({ path: report + '/population-comparison-desktop-entry.png' });
  await comparison.locator('[data-population-bin="1:' + fullest(world.history[6].population, 'fur') + '"]').click();
  await expect(page.locator('#ei-forecast-number')).toHaveValue('17');
  await expect(page.locator('.ei-stage-top')).toContainText(fixture.habitatNames[world.history[6].habitat]);
  const referenceBin = fullest(world.history[0].population, 'fur'), reference = members(world.history[0].population, 'fur', referenceBin);
  await comparison.locator('[data-population-bin="0:' + referenceBin + '"]').click();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '0');
  await expect(page.locator('#ei-forecast-number')).toHaveCount(0);
  await expect(page.locator('#ei-lens')).toHaveValue('fur'); await expect(page.locator('#ei-organism')).toHaveValue(String(reference[0].id));
  await comparison.getByRole('button', { name: 'Next individual', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(comparison.locator('[data-population-individual]')).toHaveAttribute('data-population-individual', String(reference[1].id));
  await expect(page.locator('#ei-pop-generation-1')).toHaveValue('6');
  await page.selectOption('#ei-pop-generation-1', '5'); await page.selectOption('#ei-pop-trait', 'legs');
  await expect(comparison.locator('[data-population-picked]')).toHaveCount(0);
  const comparisonBin = fullest(world.history[5].population, 'legs'), chosen = members(world.history[5].population, 'legs', comparisonBin)[0];
  await comparison.locator('[data-population-bin="1:' + comparisonBin + '"]').click();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '5');
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'offspring');
  await expect(page.locator('.ei-stage-top')).toContainText(fixture.habitatNames[world.history[5].habitat]);
  await expect(comparison.locator('[data-population-individual]')).toHaveAttribute('data-population-individual', String(chosen.id));
  await expect(page.locator('#ei-pop-generation-0')).toHaveValue('0'); await expect(page.locator('#ei-pop-generation-1')).toHaveValue('5');
  await comparison.getByRole('button', { name: 'Save this population comparison', exact: true }).click();
  const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  expect(notes.livingIsland.text).toBe('My own explanation.'); expect(notes.livingIslandData.text).toBe('My earlier evidence.');
  expect(notes.livingIslandCohorts.text).toBe('My generation comparison.');
  expect(notes.livingIslandPopulations.text).toContain('Reference G0 compared with G5.');
  expect(notes.livingIslandPopulations.text).toContain('Inspected individual:'); expect(notes.livingIslandPopulations.text.length).toBeLessThan(2000);
  await comparison.screenshot({ path: report + '/population-comparison-desktop.png', style: '.ei-commandbar,.ei-desk-tabs{visibility:hidden!important}.ei-desk-body{max-height:none!important;overflow:visible!important}' });
  await comparison.getByRole('button', { name: 'Follow this individual’s story', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Families', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-life-id]')).toHaveAttribute('data-life-id', String(chosen.id));
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.island))).toBe(saved);
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(savedLocal);
  expect((await harness.glContexts(page)).filter(row => row.connected && !row.lost).map(row => row.id)).toEqual(contexts);
  expect(errors).toEqual([]);
});

test('phone exploration distinguishes an empty trait range from extinction and keeps controls accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  const fixture = await page.evaluate(() => {
    const m = (window as any).StemLab.evoIslandModel;
    for (let seed = 1; seed < 50; seed++) {
      let world = m.create(seed); for (let i = 0; i < 4; i++) world = m.step(world);
      if (!world.history[4].population.length) continue;
      const counts = [0, 0, 0, 0, 0]; world.history[2].population.forEach((o: any) => counts[Math.min(4, Math.floor((o.genes.shade[0] + o.genes.shade[1]) / 2 * 5))]++);
      if (counts.includes(0)) return { world, empty: counts.indexOf(0) };
    }
    throw new Error('No recorded empty-range fixture found');
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: fixture.world } });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.island)), world = JSON.parse(saved);
  const savedLocal = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  await page.getByRole('button', { name: 'Compare across generations', exact: true }).click();
  const comparison = page.locator('[data-population-comparison]');
  await expect(comparison).toBeFocused();
  const entry = await comparison.boundingBox(), tabs = await page.locator('.ei-desk-tabs').boundingBox();
  expect(entry!.y).toBeGreaterThanOrEqual(tabs!.y + tabs!.height);
  await page.screenshot({ path: report + '/population-comparison-phone-entry.png' });
  await page.selectOption('#ei-pop-generation-0', '2'); await page.selectOption('#ei-pop-trait', 'shade');
  await comparison.locator('[data-population-bin="0:' + fixture.empty + '"]').click();
  await expect(comparison).toContainText('No individuals occupy this range');
  await expect(comparison.locator('#ei-pop-individual')).toHaveCount(0);
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '2');
  const available = await page.locator('#ei-organism option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value).filter(value => /^\d+$/.test(value)).map(Number).sort((a, b) => a - b));
  expect(available).toEqual(world.history[2].population.map((o: any) => o.id).sort((a: number, b: number) => a - b));
  const bin = fullest(world.history[4].population, 'shade'), group = members(world.history[4].population, 'shade', bin);
  await comparison.locator('[data-population-bin="1:' + bin + '"]').click();
  await expect(page.locator('#ei-pop-generation-0')).toHaveValue('2'); await expect(page.locator('#ei-pop-generation-1')).toHaveValue('4');
  await comparison.getByRole('button', { name: 'Next individual', exact: true }).click();
  await expect(comparison.locator('[data-population-individual]')).toHaveAttribute('data-population-individual', String(group[1].id));
  await comparison.screenshot({ path: report + '/population-comparison-phone.png', style: '.ei-commandbar,.ei-desk-tabs{visibility:hidden!important}' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-population-comparison]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))));
  expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await comparison.getByRole('button', { name: 'Show this range on the island', exact: true }).click();
  await expect(page.locator('.ei-stage')).toBeFocused();
  await expect(page.locator('[data-island-scene]')).toBeInViewport({ ratio: 0.5 });
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '4');
  await expect(page.locator('#ei-organism')).toHaveValue(String(group[1].id));
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.island))).toBe(saved);
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(savedLocal);
});

test('extinction comparison preserves zero traits, undefined shares and the ability to visit real founders', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any; });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } }, undefined, { expectCanvas: false });
  const world = await page.evaluate(() => {
    const model = (window as any).StemLab.evoIslandModel, world = model.create(1); world.living = false; world.selection = false;
    const first = world.history[0]; first.population = first.population.slice(0, 1); first.population[0].genes.fur = [0, 0]; first.stats = model.stats(first.population); world.nextId = 2;
    return model.step(world);
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: world } }, undefined, { expectCanvas: false });
  const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.island));
  const savedLocal = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  await page.getByRole('button', { name: 'Compare across generations', exact: true }).click();
  const comparison = page.locator('[data-population-comparison]');
  await expect(comparison.locator('[data-population-side="0"] [data-population-mean]')).toHaveText('0.0');
  await expect(comparison.locator('[data-population-side="1"] strong')).toHaveText('—');
  await expect(comparison.locator('.ei-pop-difference strong')).toHaveText('—');
  await comparison.locator('[data-population-bin="1:0"]').click();
  await expect(comparison).toContainText('This population has no individuals.'); await expect(page.locator('.ei-map-creature')).toHaveCount(0);
  await expect(comparison.locator('[data-population-bin="1:0"] b')).toHaveText('—');
  await comparison.locator('[data-population-bin="0:0"]').click();
  await expect(page.locator('.ei-map-creature')).toHaveCount(1); await expect(comparison.locator('[data-population-individual] b')).toHaveText('0.0 / 100');
  await comparison.getByRole('button', { name: 'Save this population comparison', exact: true }).click();
  const note = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandPopulations.text);
  expect(note).toContain('Population: 0. Mean: undefined (empty population)'); expect(note).toContain('share undefined');
  expect(note).toContain('Comparison minus reference mean: undefined'); expect(note.length).toBeLessThan(2000);
  await comparison.screenshot({ path: report + '/population-comparison-extinction.png', style: '.ei-commandbar,.ei-desk-tabs{visibility:hidden!important}.ei-desk-body{max-height:none!important;overflow:visible!important}' });
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.island))).toBe(saved);
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(savedLocal);
});
