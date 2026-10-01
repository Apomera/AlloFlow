import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
const mean = (population: any[], trait: string) => population.length ? population.reduce((sum, o) => sum + (o.genes[trait][0] + o.genes[trait][1]) / 2, 0) / population.length : null;

test('habitat chapters link real recorded rounds, island visits and exact before-after population pairs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  const fixture = await page.evaluate(() => {
    const model = (window as any).StemLab.evoIslandModel; let world = { ...model.create(2026), living: false };
    world = model.step(model.step(world)); world = model.step(model.step({ ...world, habitat: 'snow' }));
    world = model.step({ ...world, selection: false }); world = model.step(model.step({ ...world, habitat: 'drought' }));
    world.habitat = 'forest'; world.selection = true;
    return { world, names: Object.fromEntries(Object.entries(model.habitats).map(([k, v]: any) => [k, v.name])) };
  });
  const notes = { livingIsland: { text: 'My own explanation.' }, livingIslandPopulations: { text: 'My earlier comparison.' }, livingIslandForecast: { text: 'My earlier forecast.' } };
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: fixture.world, evoProgress: { notes } } });
  const original = await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.island)), cache = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  const contexts = (await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id);
  await page.getByRole('button', { name: 'Follow this habitat chapter', exact: true }).click();
  const trail = page.locator('[data-habitat-trail]'); await expect(trail).toBeFocused();
  const entry = await trail.boundingBox(), tabs = await page.locator('.ei-desk-tabs').boundingBox(); expect(entry!.y).toBeGreaterThanOrEqual(tabs!.y + tabs!.height);
  await expect(trail.locator('[data-habitat-chapter]')).toHaveCount(4);
  expect(await trail.locator('[data-trail-habitat]').evaluateAll(cards => cards.map(card => card.getAttribute('data-trail-habitat')))).toEqual(['meadow', 'snow', 'snow', 'drought']);
  await expect(trail.locator('[data-selected-chapter]')).toHaveAttribute('data-selected-chapter', '6');
  await expect(page.locator('.ei-stage-top')).toContainText(fixture.names.drought);
  await expect(page.locator('[data-island-scene]')).toBeInViewport({ ratio: .5 });
  await page.screenshot({ path: report + '/habitat-trail-desktop-entry.png' });
  await trail.locator('[data-habitat-chapter="6"]').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
  await expect(trail.locator('[data-habitat-chapter="3"]')).toBeFocused();
  await expect(trail.locator('[data-selected-chapter]')).toHaveAttribute('data-selected-chapter', '3');
  for (const trait of ['fur', 'shade', 'legs']) {
    const before = mean(fixture.world.history[2].population, trait)!, after = mean(fixture.world.history[4].population, trait)!;
    await expect(trail.locator('[data-trail-mean-pair="' + trait + '"]')).toHaveText((before * 100).toFixed(1) + ' → ' + (after * 100).toFixed(1));
  }
  await page.selectOption('#ei-trail-generation', '3'); await trail.getByRole('button', { name: 'Save this habitat chapter', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  expect(saved.livingIslandHabitatTrail.text).toContain('Recorded survival rounds: G3–4. Habitat: snow. Trait selection: true.');
  expect(saved.livingIslandHabitatTrail.text).toContain('Before first round: G2'); expect(saved.livingIslandHabitatTrail.text).toContain('Selected G3:'); expect(saved.livingIslandHabitatTrail.text.length).toBeLessThan(2000);
  for (const key of Object.keys(notes)) expect(saved[key].text).toBe((notes as any)[key].text);
  await trail.getByText('Read every round in this chapter', { exact: true }).click();
  const counts = await trail.locator('tbody tr').evaluateAll(rows => rows.map(row => Array.from(row.children).map(cell => Number(cell.textContent))));
  expect(counts).toEqual([3, 4].map(g => [g, fixture.world.history[g - 1].population.length, fixture.world.history[g].survivors.length, fixture.world.history[g].population.length]));
  expect(await trail.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await trail.screenshot({ path: report + '/habitat-trail-desktop.png', style: '.ei-commandbar,.ei-desk-tabs{visibility:hidden!important}.ei-desk-body{max-height:none!important;overflow:visible!important}' });
  await page.selectOption('#ei-trail-generation', '2'); await trail.getByRole('button', { name: 'Visit this generation on the island', exact: true }).click();
  await expect(page.locator('.ei-stage')).toBeFocused(); await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '2');
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'offspring'); await expect(page.locator('.ei-stage-top')).toContainText(fixture.names.meadow);
  await trail.getByRole('button', { name: 'Compare this chapter’s populations', exact: true }).click();
  await expect(page.locator('[data-population-comparison]')).toBeFocused();
  await expect(page.locator('#ei-pop-generation-0')).toHaveValue('2'); await expect(page.locator('#ei-pop-generation-1')).toHaveValue('4');
  await page.getByRole('button', { name: 'Follow this habitat chapter', exact: true }).click();
  await expect(trail.locator('[data-selected-chapter]')).toHaveAttribute('data-selected-chapter', '1');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.island))).toBe(original);
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(cache);
  expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id)).toEqual(contexts); expect(errors).toEqual([]);
});

test('phone chapters preserve an unfinished forecast, support keyboard exploration and remain accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  const world = await page.evaluate(() => { const m = (window as any).StemLab.evoIslandModel; let world = m.create(2026); for (let i = 0; i < 6; i++) world = m.step(world); return world; });
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: world } });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  const original = await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.island));
  await page.getByRole('button', { name: 'Predict this round', exact: true }).click(); await page.locator('#ei-forecast-number').fill('17');
  await page.getByRole('button', { name: 'Follow this habitat chapter', exact: true }).click();
  const trail = page.locator('[data-habitat-trail]'); await expect(trail).toBeFocused();
  const entry = await trail.boundingBox(), tabs = await page.locator('.ei-desk-tabs').boundingBox(); expect(entry!.y).toBeGreaterThanOrEqual(tabs!.y + tabs!.height);
  await trail.locator('[data-habitat-chapter]').last().focus(); await page.keyboard.press('Home');
  await expect(trail.locator('[data-habitat-chapter="1"]')).toBeFocused();
  await page.selectOption('#ei-trail-generation', '1');
  await expect(trail.getByRole('button', { name: 'Visit this generation on the island', exact: true })).toBeDisabled();
  await expect(trail.getByRole('button', { name: 'Compare this chapter’s populations', exact: true })).toBeEnabled();
  await trail.getByRole('button', { name: 'Save this habitat chapter', exact: true }).click();
  await expect(page.locator('#ei-forecast-number')).toHaveValue('17'); await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '6');
  await trail.getByRole('button', { name: 'Compare this chapter’s populations', exact: true }).click();
  await expect(page.locator('#ei-pop-generation-0')).toHaveValue('0'); await expect(page.locator('#ei-pop-generation-1')).toHaveValue('4');
  await expect(page.locator('#ei-forecast-number')).toHaveValue('17');
  await page.getByRole('button', { name: 'Follow this habitat chapter', exact: true }).click();
  await trail.locator('[data-habitat-chapter]').last().focus(); await page.keyboard.press('Home'); await page.selectOption('#ei-trail-generation', '1');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-habitat-trail]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))));
  expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await trail.screenshot({ path: report + '/habitat-trail-phone.png', style: '.ei-commandbar,.ei-desk-tabs{visibility:hidden!important}' });
  await page.getByRole('button', { name: 'Cancel forecast', exact: true }).click();
  await expect(trail.getByRole('button', { name: 'Visit this generation on the island', exact: true })).toBeEnabled();
  await trail.getByRole('button', { name: 'Visit this generation on the island', exact: true }).click();
  await expect(page.locator('.ei-stage')).toBeFocused(); await expect(page.locator('[data-island-scene]')).toBeInViewport({ ratio: .5 });
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '1');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.island))).toBe(original);
});

test('fallback habitat evidence preserves zero traits, one survivor and undefined offspring means after extinction', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any; });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } }, undefined, { expectCanvas: false });
  const world = await page.evaluate(() => {
    const model = (window as any).StemLab.evoIslandModel;
    for (let seed = 1; seed < 100; seed++) {
      const world = model.create(seed); world.living = false; world.selection = false;
      world.history[0].population = world.history[0].population.slice(0, 2); world.history[0].population.forEach((o: any) => { o.genes.fur = [0, 0]; }); world.history[0].stats = model.stats(world.history[0].population); world.nextId = 3;
      const next = model.step(world); if (next.history[1].survivors.length === 1) return next;
    }
    throw new Error('No one-survivor fixture');
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: world } }, undefined, { expectCanvas: false });
  const original = await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.island));
  await page.getByRole('button', { name: 'Follow this habitat chapter', exact: true }).click(); const trail = page.locator('[data-habitat-trail]');
  await expect(trail.locator('[data-trail-mean-pair="fur"]')).toHaveText('0.0 → —'); await expect(trail.locator('[data-trail-shift="fur"]')).toHaveText('Change undefined');
  await expect(trail.locator('[data-trail-snapshot="1"] strong')).toHaveText('0');
  await expect(trail.locator('[data-trail-round]')).toHaveText('G1: 2 parents → 1 survivors → 0 offspring.');
  await trail.getByRole('button', { name: 'Save this habitat chapter', exact: true }).click();
  const note = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandHabitatTrail.text);
  expect(note).toContain('Insulation: 0.00000 on the 0–1 scale → undefined (empty population). Mean change: undefined.');
  expect(note).toContain('Selected G1: 2 parents, 1 survivors and 0 offspring.'); expect(note.length).toBeLessThan(2000);
  await trail.screenshot({ path: report + '/habitat-trail-extinction.png', style: '.ei-commandbar,.ei-desk-tabs{visibility:hidden!important}.ei-desk-body{max-height:none!important;overflow:visible!important}' });
  await trail.getByRole('button', { name: 'Compare this chapter’s populations', exact: true }).click();
  await expect(page.locator('#ei-pop-generation-0')).toHaveValue('0'); await expect(page.locator('#ei-pop-generation-1')).toHaveValue('1');
  await expect(page.locator('[data-population-side="0"] [data-population-mean]')).toHaveText('0.0'); await expect(page.locator('[data-population-side="1"] strong')).toHaveText('—');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.evoLab.island))).toBe(original);
});
