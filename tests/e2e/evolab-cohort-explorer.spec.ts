import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 120_000, retries: 0, mode: 'default' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const traitValue = (o: any, trait: string) => (o.genes[trait][0] + o.genes[trait][1]) / 2;
const mean = (population: any[], trait: string) => population.length ? population.reduce((sum, o) => sum + traitValue(o, trait), 0) / population.length : null;
const ordered = (population: any[], trait: string) => population.slice().sort((a, b) => traitValue(a, trait) - traitValue(b, trait) || a.id - b.id);

test('cohort dots connect real individuals, unchanged survivors, parents and a separate journal entry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { evoLab: { view: 'livingIsland', evoProgress: { notes: {
    livingIsland: { text: 'My own explanation.', at: '2026-10-01T00:00:00Z' },
    livingIslandData: { text: 'My earlier evidence.', at: '2026-10-01T00:00:00Z' }
  } } } });
  const context = (await harness.glContexts(page)).find(row => row.connected)!.id;
  await page.getByRole('button', { name: 'Next generation' }).click();
  const saved = await page.evaluate(() => localStorage.getItem('evoLab.island.v1')!);
  const world = JSON.parse(saved), parents = world.history[0].population;
  const survivors = parents.filter((o: any) => world.history[1].survivors.includes(o.id));
  const children = world.history[1].population;
  await page.getByRole('button', { name: 'Investigate this shift', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Evidence', exact: true })).toHaveAttribute('aria-selected', 'true');
  const replay = page.locator('.ei-replay');
  await expect(replay).toBeFocused();
  await expect(replay.locator('h2')).toBeInViewport();
  const entry = await replay.boundingBox(), transport = await page.locator('.ei-commandbar').boundingBox();
  expect(entry!.y).toBeGreaterThanOrEqual(transport!.y + transport!.height);
  await page.screenshot({ path: report + '/cohort-explorer-desktop-entry.png' });
  const strongest = ['shade', 'fur', 'legs'].sort((a, b) => Math.abs(mean(children, b)! - mean(parents, b)!) - Math.abs(mean(children, a)! - mean(parents, a)!))[0];
  await expect(page.locator('#ei-replay-trait')).toHaveValue(strongest);
  await page.selectOption('#ei-replay-trait', 'fur');
  for (const [phase, population] of [['parents', parents], ['survivors', survivors], ['offspring', children]] as const) {
    await expect(replay.locator('[data-cohort="' + phase + '"] [data-cohort-dot]')).toHaveCount(population.length);
    expect(Number(await replay.locator('[data-cohort="' + phase + '"] [data-cohort-mean]').getAttribute('data-cohort-mean'))).toBeCloseTo(mean(population, 'fur')!, 12);
  }
  expect(Number(await replay.locator('[data-cohort-shift="survivors"] [data-cohort-delta]').getAttribute('data-cohort-delta'))).toBeCloseTo((mean(survivors, 'fur')! - mean(parents, 'fur')!) * 100, 12);
  expect(Number(await replay.locator('[data-cohort-shift="offspring"] [data-cohort-delta]').getAttribute('data-cohort-delta'))).toBeCloseTo((mean(children, 'fur')! - mean(survivors, 'fur')!) * 100, 12);

  const parent = survivors[0], dot = replay.locator('[data-cohort-dot="parents:' + parent.id + '"]');
  await dot.focus(); await dot.press('Enter');
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'parents');
  await expect(replay.locator('[data-cohort-specimen]')).toHaveAttribute('data-cohort-specimen', String(parent.id));
  await replay.getByRole('button', { name: 'Find this same survivor', exact: true }).click();
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'survivors');
  await expect(replay.locator('[data-cohort-linked="' + parent.id + '"]')).toHaveCount(2);
  expect(await replay.locator('[data-cohort-dot="survivors:' + parent.id + '"]').getAttribute('data-cohort-value')).toBe(String(traitValue(parent, 'fur')));
  const survivorDot = replay.locator('[data-cohort-dot="survivors:' + parent.id + '"]');
  await survivorDot.focus(); await survivorDot.press('Home');
  const sorted = ordered(survivors, 'fur');
  await expect(replay.locator('[data-cohort-specimen]')).toHaveAttribute('data-cohort-specimen', String(sorted[0].id));
  await page.keyboard.press('ArrowRight');
  await expect(replay.locator('[data-cohort-dot="survivors:' + sorted[1].id + '"]')).toBeFocused();
  await page.keyboard.press('End');
  await expect(replay.locator('[data-cohort-specimen]')).toHaveAttribute('data-cohort-specimen', String(sorted[sorted.length - 1].id));
  await page.selectOption('#ei-replay-trait', 'legs');
  await expect(page.locator('#ei-lens')).toHaveValue('legs');
  await replay.locator('[data-cohort-shift="offspring"]').click();
  const child = children[0];
  await page.selectOption('#ei-cohort-individual', String(child.id));
  await replay.getByRole('button', { name: 'Find parent in this round · #' + child.parents[0], exact: true }).click();
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'parents');
  await expect(replay.locator('[data-cohort-specimen]')).toHaveAttribute('data-cohort-specimen', String(child.parents[0]));
  await replay.locator('[data-cohort-shift="offspring"]').click();
  await page.selectOption('#ei-cohort-individual', String(child.id));
  await replay.getByRole('button', { name: 'Save this generation comparison', exact: true }).click();
  const journal = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  expect(journal.livingIsland.text).toBe('My own explanation.');
  expect(journal.livingIslandData.text).toBe('My earlier evidence.');
  expect(journal.livingIslandCohorts.text).toContain('G0 → G1');
  expect(journal.livingIslandCohorts.text).toContain('Inspected individual:');
  expect(journal.livingIslandCohorts.text).toContain('Birth-step mean change:');
  await replay.scrollIntoViewIfNeeded();
  await replay.screenshot({ path: report + '/cohort-explorer-desktop.png', style: '.ei-commandbar,.ei-desk-tabs{visibility:hidden!important}.ei-desk-body{max-height:none!important;overflow:visible!important}' });
  await replay.getByRole('button', { name: 'Read this individual’s life story', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Families', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-life-id]')).toHaveAttribute('data-life-id', String(child.id));
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(saved);
  expect((await harness.glContexts(page)).filter(row => row.connected && !row.lost).map(row => row.id)).toEqual([context]);
  expect(errors).toEqual([]);
});

test('phone cohort exploration is self paced, accessible and preserves the selected individual', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await page.getByRole('button', { name: 'Next generation' }).click();
  const saved = await page.evaluate(() => localStorage.getItem('evoLab.island.v1')!);
  const world = JSON.parse(saved), child = ordered(world.history[1].population, 'fur')[0];
  await page.getByRole('button', { name: 'Investigate this shift', exact: true }).click();
  await expect(page.locator('.ei-replay')).toBeFocused();
  await expect(page.locator('.ei-replay h2')).toBeInViewport();
  const entry = await page.locator('.ei-replay').boundingBox(), tabs = await page.locator('.ei-desk-tabs').boundingBox();
  expect(entry!.y).toBeGreaterThanOrEqual(tabs!.y + tabs!.height);
  await page.screenshot({ path: report + '/cohort-explorer-phone-entry.png' });
  await page.selectOption('#ei-replay-trait', 'fur');
  await page.locator('[data-cohort-shift="offspring"]').click();
  await page.selectOption('#ei-cohort-individual', String(child.id));
  await page.getByRole('button', { name: 'Next individual', exact: true }).click();
  const selected = await page.locator('[data-cohort-specimen]').getAttribute('data-cohort-specimen');
  await page.selectOption('#ei-replay-trait', 'shade');
  await expect(page.locator('[data-cohort-specimen]')).toHaveAttribute('data-cohort-specimen', selected!);
  await page.locator('.ei-replay').screenshot({ path: report + '/cohort-explorer-phone.png', style: '.ei-commandbar,.ei-desk-tabs{visibility:hidden!important}' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('.ei-replay', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(saved);
});

test('the fallback map retains a zero-valued lone survivor and undefined birth evidence after extinction', async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any;
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } }, undefined, { expectCanvas: false });
  const world = await page.evaluate(() => {
    const model = (window as any).StemLab.evoIslandModel;
    for (let seed = 0; seed < 100; seed++) {
      const world = model.create(seed); world.living = false; world.selection = false;
      const first = world.history[0]; first.population = first.population.slice(0, 1);
      first.population[0].genes.fur = [0, 0]; first.stats = model.stats(first.population); world.nextId = 2;
      const next = model.step(world);
      if (next.history[1].survivors.length === 1) return next;
    }
    throw new Error('No real lone-survivor fixture was found');
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: world } }, undefined, { expectCanvas: false });
  await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
  const replay = page.locator('.ei-replay');
  await expect(replay.locator('[data-cohort="survivors"] [data-cohort-mean]')).toHaveText('0.0');
  await expect(replay.locator('[data-cohort-shift="offspring"] strong')).toHaveText('—');
  await expect(replay.locator('[data-cohort="offspring"] [data-cohort-dot]')).toHaveCount(0);
  await replay.locator('[data-cohort-shift="survivors"]').click();
  await expect(page.locator('.ei-map-creature')).toHaveCount(1);
  await expect(replay.getByText('Trait advantages were off.', { exact: false })).toBeVisible();
  await replay.getByRole('button', { name: 'Save this generation comparison', exact: true }).click();
  const note = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandCohorts.text);
  expect(note).toContain('survivors: 1 individuals; mean 0.00000');
  expect(note).toContain('offspring: 0 individuals; mean undefined');
  expect(note).toContain('Birth-step mean change: undefined');
  await replay.screenshot({ path: report + '/cohort-explorer-extinction.png', style: '.ei-commandbar,.ei-desk-tabs{visibility:hidden!important}' });
});
