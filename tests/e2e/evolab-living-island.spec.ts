import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 120_000, retries: 0, mode: 'default' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('real 3D expedition: inheritance, family, prediction, rewind, journal and scene lifetime', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  const initialContexts = await harness.glContexts(page);
  expect(initialContexts.some(r => r.createdBy === 'page' && r.draws > 0 && r.connected)).toBe(true);
  await page.selectOption('#ei-organism', '1');
  await page.getByRole('button', { name: 'Follow this family', exact: false }).click();
  await page.locator('.ei-app').screenshot({ path: report + '/island-desktop.png' });
  await page.getByRole('button', { name: 'Creature close-up' }).click();
  await page.locator('.ei-stage').screenshot({ path: report + '/creature-closeup.png' });
  await page.getByRole('button', { name: 'Island overview' }).click();
  await page.getByRole('button', { name: 'Long winter', exact: false }).click();
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await page.selectOption('#ei-predict', 'more');
  await page.getByRole('button', { name: 'Lock my prediction' }).click();
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Next generation' }).click();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '5');
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await expect(page.getByText('Five generations later:', { exact: false })).toBeVisible();
  await page.locator('.ei-app').screenshot({ path: report + '/winter-generation-five.png' });
  const contexts = await harness.glContexts(page);
  expect(contexts.filter(r => r.connected && !r.lost)).toHaveLength(1);
  expect(contexts.find(r => r.connected)?.id).toBe(initialContexts.find(r => r.connected)?.id);
  await page.locator('#ei-time').fill('0');
  await expect(page.getByRole('button', { name: 'Next generation' })).toBeDisabled();
  await page.getByRole('button', { name: 'Return to present' }).click();
  await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
  await page.getByRole('button', { name: 'Save finding to journal' }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await downloaded).suggestedFilename()).toBe('living-island-2026.csv');
  await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '5');
  await expect(page.getByRole('button', { name: 'Play evolution', exact: false })).toBeVisible();
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await expect(page.getByText('Five generations later:', { exact: false })).toBeVisible();
  await page.getByRole('tab', { name: 'Explore', exact: true }).click();
  await expect(page.getByText('Family of #1', { exact: true })).toBeVisible();
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('.ei-app', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }))));
  expect(violations).toEqual([]);
  await page.selectOption('.ei-speed', '450');
  await page.getByRole('button', { name: 'Play evolution', exact: false }).click();
  await expect.poll(async () => Number(await page.locator('[data-island-generation]').getAttribute('data-island-generation'))).toBeGreaterThan(5);
  await page.getByRole('button', { name: 'Pause evolution', exact: false }).click();
  const paused = await page.locator('[data-island-generation]').getAttribute('data-island-generation');
  await page.waitForTimeout(600);
  expect(await page.locator('[data-island-generation]').getAttribute('data-island-generation')).toBe(paused);
  await page.evaluate(() => (window as any).__unmount());
  expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost)).toHaveLength(0);
  await expect.poll(async () => (await harness.glContexts(page)).every(r => r.lost)).toBe(true);
  expect(errors).toEqual([]);
});

test('phone layout, reduced motion and keyboard-equivalent selection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  await page.evaluate(() => { const wrap = document.getElementById('wrap')!; wrap.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  await page.selectOption('#ei-organism', '3');
  await page.getByLabel('Animate wildlife while paused').check();
  const before = (await harness.glContexts(page)).find(r => r.connected)!.renders;
  await page.waitForTimeout(500);
  const after = (await harness.glContexts(page)).find(r => r.connected)!.renders;
  expect(after - before).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Next generation' }).click();
  await page.getByRole('button', { name: 'Show parents', exact: true }).click();
  await page.selectOption('#ei-lens', 'legs');
  await page.getByText('Find two contrasting residents', { exact: true }).click();
  await page.getByRole('button', { name: 'Inspect lowest trait value', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.locator('.ei-app').screenshot({ path: report + '/island-phone.png' });
  await page.locator('.ei-stage').screenshot({ path: report + '/island-phone-stage.png' });
});

test('volcanic terrain, scenic exploration and habitat changes preserve the experiment and release scenery', async ({ page }) => {
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  const initial = await page.evaluate(() => {
    const w = window as any;
    const scene = w.__glRecorder.records.find((r: any) => r.scene && r.canvas.isConnected).scene;
    const terrain = scene.getObjectByName('Evolution island terrain');
    const positions = Array.from(terrain.geometry.attributes.position.array) as number[];
    const heights = positions.filter((_, i) => i % 3 === 1);
    const landscape = w.StemLab.evoIslandLandscape.create(2026);
    const errors: number[] = [];
    w.__islandDisposedInstances = 0;
    scene.traverse((o: any) => {
      if (o.isInstancedMesh) o.addEventListener('dispose', () => w.__islandDisposedInstances++);
      if (o.userData.islandResident) errors.push(Math.abs(o.position.y - landscape.sample(o.position.x, o.position.z).height - 0.025));
    });
    return { terrainId: terrain.geometry.uuid, positions, min: Math.min(...heights), max: Math.max(...heights), errors, colors: Array.from(terrain.geometry.attributes.color.array) };
  });
  expect(initial.max - initial.min).toBeGreaterThan(3);
  expect(initial.errors).toHaveLength(36);
  expect(Math.max(...initial.errors)).toBeLessThan(0.001);
  await page.locator('.ei-stage').screenshot({ path: report + '/volcanic-island.png' });
  for (const [name, file] of [['Lava coast', 'lava-coast'], ['Highlands', 'highlands']]) {
    await page.getByRole('button', { name, exact: true }).click();
    await page.locator('.ei-stage').screenshot({ path: report + '/' + file + '.png' });
    await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '0');
    await expect(page.locator('#ei-organism option')).toHaveCount(37);
  }
  await page.getByRole('button', { name: 'Island', exact: true }).click();
  for (const [name, file] of [['Dry season', 'dry-season'], ['Forest returns', 'forest-season']]) {
    await page.getByRole('button', { name, exact: false }).click();
    await page.locator('.ei-stage').screenshot({ path: report + '/' + file + '.png' });
  }
  const changed = await page.evaluate(() => {
    const w = window as any;
    const scene = w.__glRecorder.records.find((r: any) => r.scene && r.canvas.isConnected).scene;
    const terrain = scene.getObjectByName('Evolution island terrain');
    return { terrainId: terrain.geometry.uuid, positions: Array.from(terrain.geometry.attributes.position.array), colors: Array.from(terrain.geometry.attributes.color.array), disposed: w.__islandDisposedInstances };
  });
  expect(changed.terrainId).toBe(initial.terrainId);
  expect(changed.positions).toEqual(initial.positions);
  expect(changed.colors).not.toEqual(initial.colors);
  expect(changed.disposed).toBe(5);
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '0');
  expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost)).toHaveLength(1);
});

test('3D failure retains the complete simulation in a habitat map', async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any;
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } }, undefined, { expectCanvas: false });
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'fallback');
  await page.getByRole('button', { name: 'Inspect Spriglet 1', exact: true }).click();
  await page.getByRole('button', { name: 'Next generation' }).click();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '1');
  await page.selectOption('#ei-lens', 'fur');
  await page.getByText('Read every measurement', { exact: true }).click();
  await expect(page.locator('.ei-lens-table tbody tr')).toHaveCount(await page.locator('.ei-map-creature').count());
  await expect(page.locator('.ei-map-creature').first()).toHaveAccessibleName(/Insulation/);
  const original = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await page.getByRole('button', { name: 'Explore two futures', exact: false }).click();
  await page.getByRole('button', { name: 'Create my two futures', exact: true }).click();
  await expect(page.locator('[data-island-scene="fallback"]')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Creature close-up', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Advance both islands', exact: true }).click();
  await expect(page.locator('[data-trial-island="a"] [data-trial-generation]')).toHaveAttribute('data-trial-generation', '2');
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(original);
});

test('guided investigation pauses at its result, records reviewed evidence, and resumes its field notes', async ({ page }) => {
  await harness.mount(page, { evoLab: { view: 'livingIsland', evoProgress: { notes: { livingIsland: { text: 'My own explanation stays here.', at: '2026-09-26T00:00:00Z' } } } } });
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await page.getByRole('button', { name: 'Cold snap', exact: false }).click();
  await expect(page.getByLabel('Living climate', { exact: false })).not.toBeChecked();
  await page.selectOption('.ei-speed', '450');
  await page.getByRole('button', { name: 'Play evolution', exact: false }).click();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '5', { timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Play evolution', exact: false })).toBeVisible();
  await page.waitForTimeout(1100);
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '5');
  await expect(page.getByRole('button', { name: 'Collect field note', exact: true })).toBeDisabled();
  const evidence = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  expect(JSON.parse(evidence!).generation).toBe(5);
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await page.getByRole('button', { name: 'Review the evidence', exact: true }).click();
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'survivors');
  await page.locator('.ei-stage').screenshot({ path: report + '/survival-replay.png' });
  await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
  await page.locator('.ei-replay').screenshot({ path: report + '/generation-evidence.png' });
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await page.getByRole('button', { name: 'Collect field note', exact: true }).click();
  await expect(page.getByText('1/3 · field notes collected', { exact: true })).toBeVisible();
  await page.locator('.ei-investigations').screenshot({ path: report + '/investigation-complete.png' });
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(evidence);
  const study = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!));
  expect(study.mission).toMatchObject({ kind: 'cold', start: 0, reviewedAt: 5, saved: true });
  expect(study.notes.cold).toContain('G0–G5');
  await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
  await page.getByRole('button', { name: 'Save finding to journal', exact: true }).click();
  const journal = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  expect(journal.livingIsland.text).toBe('My own explanation stays here.');
  expect(journal.livingIslandCold.text).toBe(study.notes.cold);
  expect(journal.livingIslandData.text).toContain('Living Island · seed 2026');
  await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Field note collected', exact: false })).toBeDisabled();
  await expect(page.getByText('1/3 · field notes collected', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await page.getByRole('button', { name: 'Choose another question', exact: true }).click();
  await page.getByRole('button', { name: 'The chance experiment', exact: false }).click();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '5');
  const next = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.v1')!));
  expect(next.selection).toBe(false);
  expect(next.habitat).toBe('meadow');
  expect(next.history).toHaveLength(6);
});

test('replay preserves survivor positions and genes; family connections navigate recorded generations', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  await page.getByRole('button', { name: 'Next generation' }).click();
  const saved = await page.evaluate(() => localStorage.getItem('evoLab.island.v1')!);
  const world = JSON.parse(saved), child = world.history[1].population[0];
  async function residents() {
    return page.evaluate(() => {
      const scene = (window as any).__glRecorder.records.find((r: any) => r.scene && r.canvas.isConnected).scene;
      const out: Record<string, number[]> = {};
      scene.traverse((o: any) => { if (o.userData.islandResident) out[o.name.replace('Spriglet ', '')] = o.position.toArray(); });
      return out;
    });
  }
  await page.getByRole('button', { name: 'Show parents', exact: true }).click();
  const parents = await residents();
  expect(Object.keys(parents)).toHaveLength(36);
  await page.getByRole('button', { name: 'Show survivors', exact: true }).click();
  const survivors = await residents();
  expect(Object.keys(survivors).map(Number)).toEqual(world.history[1].survivors);
  for (const [id, position] of Object.entries(survivors)) expect(position).toEqual(parents[id]);
  await page.getByRole('button', { name: 'Show offspring', exact: true }).click();
  await page.selectOption('#ei-organism', String(child.id));
  await page.getByRole('tab', { name: 'Families', exact: true }).click();
  await page.getByText('Trace each inherited allele', { exact: true }).click();
  await expect(page.locator('.ei-allele-trace')).toHaveCount(3);
  await page.locator('.ei-family-tree').screenshot({ path: report + '/family-inheritance.png' });
  await page.getByRole('button', { name: 'Meet parent #' + child.parents[0], exact: true }).click();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '0');
  await page.getByRole('button', { name: 'Meet offspring #' + child.id, exact: true }).click();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '1');
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(saved);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('.ei-app', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))));
  expect(violations).toEqual([]);
  expect(errors).toEqual([]);
});

test('named residents and two futures preserve the expedition, save evidence, and release both renderers', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await harness.mount(page, { evoLab: { view: 'livingIsland', evoProgress: { notes: { livingIsland: { text: 'My island explanation.', at: '2026-09-26T00:00:00Z' } } } } });
  await page.selectOption('#ei-organism', '1');
  await page.getByText('Give a nickname', { exact: true }).click();
  await page.getByLabel('Field nickname', { exact: false }).fill('Pebble Explorer');
  await page.getByRole('button', { name: 'Save nickname', exact: true }).click();
  await expect(page.locator('.ei-name-chip')).toHaveText('Pebble Explorer · #1');
  await page.getByRole('button', { name: 'Creature close-up', exact: true }).click();
  await page.locator('.ei-stage').screenshot({ path: report + '/named-creature.png' });
  await page.getByRole('button', { name: 'Island overview', exact: true }).click();
  await page.getByRole('button', { name: 'Follow this family', exact: false }).click();
  await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  const original = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  const studyBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!));
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await page.getByRole('button', { name: 'Explore two futures', exact: false }).click();
  await expect(page.getByRole('heading', { name: 'The island experiment', exact: true })).toBeFocused();
  expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost)).toHaveLength(0);
  await page.locator('.ei-comparison').screenshot({ path: report + '/two-futures-setup.png' });
  await page.getByRole('button', { name: 'Create my two futures', exact: true }).click();
  await expect(page.locator('[data-island-scene="ready"]')).toHaveCount(2);
  expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost)).toHaveLength(2);
  await page.getByRole('button', { name: 'Advance both islands', exact: true }).click();
  await page.getByRole('button', { name: 'Watch both futures', exact: true }).click();
  await expect(page.getByText('Round 5 / 5 · Trial complete', { exact: true })).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1300);
  await expect(page.locator('[data-trial-island="a"] [data-trial-generation]')).toHaveAttribute('data-trial-generation', '6');
  await expect(page.getByRole('button', { name: 'Advance both islands', exact: true })).toBeDisabled();
  await page.locator('.ei-comparison').screenshot({ path: report + '/two-futures-desktop.png' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-app', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }))))).toEqual([]);
  await page.getByRole('button', { name: 'Save comparison to journal', exact: true }).click();
  const result = await page.evaluate(() => ({ world: localStorage.getItem('evoLab.island.v1'), study: JSON.parse(localStorage.getItem('evoLab.island.study.v1')!), notes: JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes }));
  expect(result.world).toBe(original);
  expect(result.study).toMatchObject({ ...studyBefore, lastTrial: { factor: 'habitat', round: 5, start: 1 } });
  expect(result.study.lastTrial.a.frames).toHaveLength(6);
  expect(result.notes.livingIslandComparison.text).toContain('shared start G1');
  expect(result.notes.livingIsland.text).toBe('My island explanation.');
  const twinIds = (await harness.glContexts(page)).filter(r => r.connected).map(r => r.id);
  await page.getByRole('button', { name: 'Return to my island', exact: false }).click();
  await expect(page.getByRole('button', { name: 'Explore two futures', exact: false })).toBeFocused();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '1');
  await expect(page.locator('[data-island-scene="ready"]')).toHaveCount(1);
  await expect.poll(async () => (await harness.glContexts(page)).filter(r => twinIds.includes(r.id)).every(r => r.lost && !r.connected)).toBe(true);
  await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  await expect(page.getByRole('heading', { name: 'Pebble Explorer', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
  await page.getByText('Your last comparison · saved evidence', { exact: true }).click();
  await expect(page.locator('.ei-trial-saved')).toContainText('Long winter');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).lastTrial)).toEqual(result.study.lastTrial);
  expect(errors).toEqual([]);
});

test('two futures and resident browsing remain usable on a phone with motion reduced', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await page.getByRole('button', { name: 'Next resident', exact: true }).click();
  await expect(page.locator('#ei-organism')).toHaveValue('1');
  await page.getByRole('button', { name: 'Previous resident', exact: true }).click();
  await expect(page.locator('#ei-organism')).toHaveValue('36');
  await page.getByRole('button', { name: 'Meet someone new', exact: true }).click();
  await expect(page.locator('#ei-organism')).not.toHaveValue('36');
  await expect(page.locator('.ei-pressure')).toContainText('Next living-climate shift: generation 5');
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await page.getByRole('button', { name: 'Explore two futures', exact: false }).click();
  await page.selectOption('#ei-trial-factor', 'selection');
  await page.getByRole('button', { name: 'Create my two futures', exact: true }).click();
  await expect(page.locator('[data-island-scene="ready"]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Advance both islands', exact: true }).click();
  const summary = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).lastTrial);
  expect(summary.a.habitat).toBe(summary.b.habitat);
  expect(summary.b.selection).toBe(false);
  expect(summary.a.selection).toBe(true);
  const renders = (await harness.glContexts(page)).filter(r => r.connected).map(r => r.renders);
  await page.waitForTimeout(500);
  expect((await harness.glContexts(page)).filter(r => r.connected).map(r => r.renders)).toEqual(renders);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.locator('.ei-comparison').screenshot({ path: report + '/two-futures-phone.png' });
  await page.getByRole('button', { name: 'Watch both futures', exact: true }).click();
  await page.getByRole('button', { name: 'Pause comparison', exact: true }).click();
  const paused = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).lastTrial.round);
  await page.waitForTimeout(1300);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).lastTrial.round)).toBe(paused);
});

test('trait lenses display actual values, preserve coats and reuse measurement buffers', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  const original = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  async function sceneData() {
    return page.evaluate(() => {
      const w = window as any, scene = w.__glRecorder.records.find((r: any) => r.scene && r.canvas.isConnected).scene;
      const bars = scene.getObjectByName('Trait lens values'), tracks = scene.getObjectByName('Trait lens scales');
      if (!w.__lensCameraHook) {
        w.__lensCameraHook = true;
        const previous = scene.onBeforeRender;
        scene.onBeforeRender = function(renderer: any, scene: any, camera: any) { w.__lensCamera = camera; return previous.apply(this, arguments); };
      }
      const matrix = new w.THREE.Matrix4(), scale = new w.THREE.Vector3(), quat = new w.THREE.Quaternion(), pos = new w.THREE.Vector3();
      const heights = [];
      for (let i = 0; i < bars.count; i++) { bars.getMatrixAt(i, matrix); matrix.decompose(pos, quat, scale); heights.push(scale.y); }
      const coats: string[] = [], sites: number[][] = [];
      scene.traverse((o: any) => {
        if (o.userData.islandResident) { sites.push(o.position.toArray()); o.children[0].traverse((m: any) => { if (m.isMesh && m.material.map) coats.push(m.material.color.getHexString()); }); }
      });
      return { colorCapacity: bars.instanceColor.count, count: bars.count, tracks: tracks.count, heights, coats, sites, geometry: bars.geometry.uuid, sameBuffer: bars.instanceMatrix === (w.__lensBuffer || (w.__lensBuffer = bars.instanceMatrix)) };
    });
  }
  const natural = await sceneData(); expect(natural.count).toBe(0);
  await page.selectOption('#ei-lens', 'fur');
  const measured = await sceneData();
  const world = JSON.parse(original!);
  expect(measured.count).toBe(world.history[1].population.length);
  expect(measured.tracks).toBe(measured.count);
  expect(measured.colorCapacity).toBeGreaterThanOrEqual(measured.count);
  world.history[1].population.forEach((o: any, i: number) => expect(measured.heights[i] / 1.2).toBeCloseTo((o.genes.fur[0] + o.genes.fur[1]) / 2, 5));
  expect(measured.coats).toEqual(natural.coats);
  expect(measured.sites).toEqual(natural.sites);
  await page.locator('.ei-scene').scrollIntoViewIfNeeded();
  const marker = await page.evaluate(() => {
    const w = window as any, rec = w.__glRecorder.records.find((r: any) => r.scene && r.canvas.isConnected);
    const mesh = rec.scene.getObjectByName('Trait lens values'), matrix = new w.THREE.Matrix4(), candidates = [];
    const rect = rec.canvas.getBoundingClientRect();
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix); const p = new w.THREE.Vector3().setFromMatrixPosition(matrix).project(w.__lensCamera);
      const x = rect.left + (p.x + 1) * rect.width / 2, y = rect.top + (1 - p.y) * rect.height / 2;
      if (y > rect.top + 100 && y < rect.bottom - 110) candidates.push({ index: i, x, y, z: p.z });
    }
    return candidates.sort((a: any, b: any) => a.z - b.z)[0];
  });
  expect(marker).toBeTruthy();
  await page.mouse.click(marker.x, marker.y);
  await expect(page.locator('#ei-organism')).toHaveValue(String(world.history[1].population[marker.index].id));
  await page.getByText('Find two contrasting residents', { exact: true }).click();
  await page.getByRole('button', { name: 'Inspect highest trait value', exact: true }).click();
  const expectedHigh = world.history[1].population.reduce((a: any, b: any) => a.genes.fur[0] + a.genes.fur[1] >= b.genes.fur[0] + b.genes.fur[1] ? a : b);
  await expect(page.locator('#ei-organism')).toHaveValue(String(expectedHigh.id));
  await expect(page.locator('.ei-name-chip')).toContainText('Insulation');
  await page.locator('.ei-stage').screenshot({ path: report + '/trait-lens-island.png' });
  await page.getByRole('button', { name: 'Creature close-up', exact: true }).click();
  expect((await sceneData()).count).toBe(1);
  await page.locator('.ei-stage-wrap').screenshot({ path: report + '/trait-lens-closeup.png' });
  await page.getByRole('button', { name: 'Island overview', exact: true }).click();
  await page.selectOption('#ei-lens', 'legs');
  const changed = await sceneData();
  expect(changed.geometry).toBe(measured.geometry);
  expect(changed.sameBuffer).toBe(true);
  expect(changed.coats).toEqual(natural.coats);
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(original);
  await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  await expect(page.locator('#ei-lens')).toHaveValue('legs');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-app', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }))))).toEqual([]);
  expect(errors).toEqual([]);
});

test('generation stories replay actual cohorts, stop reliably and keep the expedition unchanged', async ({ page }) => {
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  const original = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  const world = JSON.parse(original!);
  await page.selectOption('#ei-lens', 'fur');
  await page.getByRole('button', { name: 'Watch generation story', exact: true }).click();
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'parents');
  await expect(page.locator('.ei-story-chapter')).toContainText('36 individuals');
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'survivors', { timeout: 7000 });
  await page.getByRole('button', { name: 'Pause generation story', exact: true }).click();
  await page.waitForTimeout(3500);
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'survivors');
  await expect(page.locator('.ei-story-chapter')).toContainText(world.history[1].survivors.length + ' individuals');
  await page.locator('.ei-stage').screenshot({ path: report + '/generation-story-survivors.png' });
  await page.getByRole('button', { name: 'Watch generation story', exact: true }).click();
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'offspring', { timeout: 11000 });
  await expect(page.getByRole('button', { name: 'Watch generation story', exact: true })).toBeVisible();
  await expect(page.locator('.ei-story-chapter')).toContainText(world.history[1].population.length + ' individuals');
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(original);
  await page.getByRole('button', { name: 'Watch generation story', exact: true }).click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.getByRole('button', { name: 'Watch generation story', exact: true })).toBeVisible();
  await page.evaluate(() => { delete (document as any).hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(3500);
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'parents');
  await page.getByRole('button', { name: 'Watch generation story', exact: true }).click();
  await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '2');
  await page.waitForTimeout(3500);
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'offspring');
  const expected = await page.evaluate((saved: string) => JSON.stringify((window as any).StemLab.evoIslandModel.step(JSON.parse(saved))), original!);
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(expected);
});

test('generation stories keep the recorded habitat after a pending change and close without advancing', async ({ page }) => {
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  await page.getByRole('button', { name: 'Long winter', exact: false }).click();
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await page.getByText('Experiment settings', { exact: true }).click();
  await page.getByLabel('Traits affect survival', { exact: false }).uncheck();
  const original = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  const frame = JSON.parse(original!).history[1];
  expect(frame.habitat).toBe('meadow'); expect(frame.selection).toBe(true);
  await expect(page.locator('.ei-stage-top')).toContainText('Long winter');
  await expect(page.locator('.ei-pressure')).toContainText('Trait-neutral survival');
  await page.getByRole('button', { name: 'Watch generation story', exact: true }).click();
  await expect(page.locator('.ei-stage-top')).toContainText('Sunlit meadow');
  await expect(page.locator('.ei-pressure')).not.toContainText('Trait-neutral survival');
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'offspring', { timeout: 11000 });
  await expect(page.locator('[data-island-phase]')).toHaveText('Replay · recorded offspring');
  await expect(page.locator('.ei-stage-top')).toContainText('Sunlit meadow');
  await page.getByRole('button', { name: 'Close generation story', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Watch generation story', exact: true })).toBeFocused();
  await expect(page.locator('.ei-story-chapter')).toHaveCount(0);
  await expect(page.locator('.ei-stage-top')).toContainText('Long winter');
  await expect(page.locator('.ei-pressure')).toContainText('Trait-neutral survival');
  await expect(page.locator('[data-island-phase]')).toHaveText('Present day');
  await page.getByRole('button', { name: 'Watch generation story', exact: true }).click();
  await page.getByRole('button', { name: 'Close generation story', exact: true }).click();
  await page.waitForTimeout(3500);
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'offspring');
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(original);
});


test('first discovery brings the island forward and follows a real family without changing history', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  expect((await page.locator('.ei-scene').boundingBox())!.y).toBeLessThan(530);
  await page.screenshot({ path: report + '/first-discovery-desktop.png' });
  const original = await page.evaluate(() => JSON.stringify((window as any).StemLab.evoIslandModel.create(2026)));
  await page.getByRole('button', { name: 'Meet a spriglet', exact: true }).click();
  await expect(page.locator('#ei-organism')).toHaveValue('1');
  await expect(page.locator('[data-discovery-step]')).toHaveAttribute('data-discovery-step', '1');
  await page.getByRole('button', { name: 'Follow this spriglet', exact: true }).click();
  await expect(page.locator('[data-discovery-step]')).toHaveAttribute('data-discovery-step', '2');
  const initialStudy = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!));
  expect(initialStudy.trackedId).toBe(1);
  await page.getByRole('button', { name: 'Advance one generation', exact: true }).click();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '1');
  const expected = await page.evaluate((saved: string) => JSON.stringify((window as any).StemLab.evoIslandModel.step(JSON.parse(saved))), original);
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(expected);
  await page.getByRole('button', { name: 'Read the family story', exact: true }).click();
  await expect(page.locator('.ei-family-journey')).toBeFocused();
  const descendants = JSON.parse(expected).history[1].population.filter((o: any) => o.parents.includes(1));
  await expect(page.locator('[data-family-result]')).toContainText('G1 · ' + descendants.length + ' / ');
  await expect(page.locator('.ei-family-relative')).toContainText('#' + descendants[0].id);
  await page.getByRole('button', { name: 'Meet another family member', exact: true }).click();
  await expect(page.locator('.ei-family-relative')).toContainText('#' + descendants[1].id);
  await page.getByRole('button', { name: 'Find on the island', exact: true }).click();
  await expect(page.locator('.ei-stage')).toBeFocused();
  await expect(page.locator('#ei-organism')).toHaveValue(String(descendants[1].id));
  await page.locator('.ei-family-journey').screenshot({ path: report + '/family-journey.png' });
  await page.getByRole('button', { name: 'Revisit the ancestor', exact: true }).click();
  await expect(page.locator('#ei-organism')).toHaveValue('1');
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '0');
  await expect(page.locator('.ei-commandbar').getByRole('button', { name: 'Next generation', exact: false })).toBeDisabled();
  await page.getByRole('button', { name: 'Next family generation', exact: true }).click();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '1');
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(expected);
  await page.getByRole('button', { name: 'Explore freely', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Your first discovery', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Choose a question', exact: true }).click();
  await expect(page.locator('.ei-investigations')).toBeFocused();
  await page.getByRole('button', { name: 'Two futures', exact: true }).click();
  await expect(page.locator('.ei-trial-launch')).toBeFocused();
  await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  await expect(page.locator('[data-discovery-step]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Your first discovery', exact: true }).click();
  await expect(page.locator('[data-discovery-step]')).toBeFocused();
  await expect(page.locator('[data-discovery-step]')).toHaveAttribute('data-discovery-step', '3');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-app', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }))))).toEqual([]);
});

test('phone family journey stays usable across long histories and reports a lost lineage', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  expect((await page.locator('.ei-scene').boundingBox())!.y).toBeLessThan(590);
  await page.screenshot({ path: report + '/first-discovery-phone.png' });
  const world = await page.evaluate(() => {
    const model = (window as any).StemLab.evoIslandModel;
    let world = model.create(2026);
    for (let i = 0; i < 12; i++) world = model.step(world);
    return world;
  });
  const lost = world.history[0].population.find((o: any) => !world.history[1].population.some((c: any) => c.parents.includes(o.id)));
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: world.seed, trackedId: lost.id, introDismissed: true } } });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-family-result]')).toHaveAttribute('data-family-result', 'ended');
  await expect(page.locator('[data-family-result]')).toContainText('Other families still live');
  await expect(page.locator('.ei-family-timeline button')).toHaveCount(5);
  await page.getByRole('tab', { name: 'Families', exact: true }).click();
  await page.getByRole('button', { name: 'Previous family generation', exact: true }).click();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '11');
  await page.getByRole('button', { name: 'Revisit the ancestor', exact: true }).click();
  await expect(page.locator('[data-family-result]')).toHaveAttribute('data-family-result', 'ancestor');
  await page.getByRole('button', { name: 'Visit family in generation 1', exact: false }).click();
  await expect(page.locator('[data-family-result]')).toHaveAttribute('data-family-result', 'ended');
  await page.getByText('Read the complete family record', { exact: true }).click();
  await expect(page.locator('.ei-family-record tbody tr')).toHaveCount(13);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.locator('.ei-family-journey').screenshot({ path: report + '/family-journey-phone.png' });
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
});


test('generation field reports reveal actual shifts and mutated offspring without rewriting evidence', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  await expect(page.locator('.ei-field-report')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  const original = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  const data = await page.evaluate(() => {
    const w = window as any, world = JSON.parse(localStorage.getItem('evoLab.island.v1')!);
    return w.StemLab.evoIslandObservation.briefing(world, 1);
  });
  await expect(page.locator('.ei-report-flow strong')).toHaveText([String(data.parents), String(data.survivors), String(data.offspring)]);
  await expect(page.locator('.ei-report-announcement')).toHaveAttribute('role', 'status');
  await expect(page.locator('.ei-report-announcement')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('.ei-report-announcement')).toContainText(data.survivors + ' / ' + data.parents);
  await expect(page.locator('.ei-report-variant')).toContainText('#' + data.variant.id);
  await expect(page.locator('.ei-report-variant')).toContainText(data.variant.mutations + ' recorded allele mutations');
  await page.locator('.ei-field-report').screenshot({ path: report + '/generation-field-report.png' });
  await page.getByRole('button', { name: 'Long winter', exact: false }).click();
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await page.getByText('Experiment settings', { exact: true }).click();
  await page.getByLabel('Traits affect survival', { exact: false }).uncheck();
  const queued = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  await expect(page.locator('.ei-report-habitat')).toHaveText('Recorded habitat: Sunlit meadow');
  await expect(page.locator('.ei-field-report')).toContainText('One generation alone does not establish adaptation.');
  await page.getByRole('button', { name: 'Investigate this shift', exact: true }).click();
  await expect(page.locator('#ei-lens')).toHaveValue(data.strongest.trait);
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'survivors');
  await expect(page.locator('.ei-stage')).toBeFocused();
  await expect(page.locator('.ei-stage-top')).toContainText('Sunlit meadow');
  await page.getByRole('button', { name: 'Meet this offspring', exact: true }).click();
  await expect(page.locator('#ei-organism')).toHaveValue(String(data.variant.id));
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'offspring');
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(queued);
  expect(JSON.parse(queued!).history).toEqual(JSON.parse(original!).history);
  await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  await expect(page.locator('.ei-report-habitat')).toHaveText('Recorded habitat: Sunlit meadow → Long winter');
  await expect(page.locator('.ei-field-report')).toContainText('Trait advantages were off in this round.');
  const expected = await page.evaluate((saved: string) => (window as any).StemLab.evoIslandModel.step(JSON.parse(saved)), queued!);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.v1')!))).toEqual(expected);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.locator('.ei-field-report').screenshot({ path: report + '/generation-field-report-phone.png' });
  await page.getByRole('button', { name: 'Play evolution', exact: false }).click();
  await expect(page.locator('.ei-report-announcement')).toHaveAttribute('aria-live', 'off');
  await page.getByRole('button', { name: 'Pause evolution', exact: false }).click();
  await expect(page.locator('.ei-report-announcement')).toHaveAttribute('aria-live', 'polite');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-app', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }))))).toEqual([]);
});

test('seasonal atmosphere reuses buffers, freezes with pause and reduced motion, and leaves biology unchanged', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error' && /shader|webgl/i.test(msg.text())) errors.push(msg.text()); });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  const read = () => page.evaluate(() => {
    const w = window as any, scene = w.__glRecorder.records.find((r: any) => r.scene && r.canvas.isConnected).scene;
    const weather = scene.getObjectByName('Island seasonal atmosphere'), water = scene.getObjectByName('Shallow coastal water');
    if (!w.__weatherTracked) {
      w.__weatherTracked = true; w.__weatherBuffer = weather.geometry.attributes.position; w.__weatherDisposed = [];
      weather.geometry.addEventListener('dispose', () => w.__weatherDisposed.push('geometry'));
      weather.material.addEventListener('dispose', () => w.__weatherDisposed.push('material'));
      weather.material.map.addEventListener('dispose', () => w.__weatherDisposed.push('texture'));
    }
    return { count: weather.geometry.drawRange.count, capacity: weather.geometry.attributes.position.count, visible: weather.visible,
      positions: Array.from(weather.geometry.attributes.position.array), color: weather.material.color.getHexString(), geometry: weather.geometry.uuid,
      sameBuffer: weather.geometry.attributes.position === w.__weatherBuffer,
      shoreSamples: water.geometry.attributes.islandDepth.count, waterVertices: water.geometry.attributes.position.count };
  });
  const first = await read();
  expect(first.count).toBe(26); expect(first.capacity).toBe(180);
  expect(first.shoreSamples).toBe(first.waterVertices);
  await page.getByRole('button', { name: 'Long winter', exact: false }).click();
  const winter = await read();
  expect(winter.count).toBe(180); expect(winter.geometry).toBe(first.geometry); expect(winter.sameBuffer).toBe(true); expect(winter.color).not.toBe(first.color);
  await page.locator('.ei-stage-wrap').screenshot({ path: report + '/winter-atmosphere.png' });
  const original = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  await page.getByLabel('Animate wildlife while paused', { exact: false }).check();
  await page.waitForTimeout(300);
  expect((await read()).positions).not.toEqual(winter.positions);
  await page.getByLabel('Animate wildlife while paused', { exact: false }).uncheck();
  const paused = await read(); await page.waitForTimeout(350);
  expect((await read()).positions).toEqual(paused.positions);
  await page.getByLabel('Animate wildlife while paused', { exact: false }).check();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const hidden = await read(); await page.waitForTimeout(350);
  expect((await read()).positions).toEqual(hidden.positions);
  await page.evaluate(() => { delete (document as any).hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByText('Your reduced-motion preference keeps the habitat still.', { exact: true })).toBeVisible();
  const reduced = await read(); await page.waitForTimeout(350);
  expect((await read()).positions).toEqual(reduced.positions);
  await page.selectOption('#ei-organism', '1');
  await page.getByRole('button', { name: 'Creature close-up', exact: true }).click();
  expect((await read()).visible).toBe(false);
  await page.getByRole('button', { name: 'Island overview', exact: true }).click();
  expect((await read()).visible).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(original);
  await page.getByRole('button', { name: 'Dry season', exact: false }).click();
  const dry = await read(); expect(dry.count).toBe(75); expect(dry.sameBuffer).toBe(true);
  await page.locator('.ei-stage-wrap').screenshot({ path: report + '/dry-atmosphere.png' });
  const changed = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.v1')!));
  expect(changed.history).toEqual(JSON.parse(original!).history);
  expect(changed.rng).toBe(JSON.parse(original!).rng);
  await page.evaluate(() => (window as any).__unmount());
  expect(await page.evaluate(() => (window as any).__weatherDisposed.sort())).toEqual(['geometry', 'material', 'texture']);
  expect(errors).toEqual([]);
});


test('field desk keeps one island renderer, supports keyboard tabs and leaves evolution unchanged', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await harness.mount(page, { evoLab: { view: 'livingIsland', islandStudy: { seed: 2026, introDismissed: true } } });
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  const world = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.v1')!));
  await page.selectOption('#ei-organism', String(world.history[1].population[0].id));
  const renderer = (await harness.glContexts(page)).find(r => r.connected)!.id;
  await page.getByRole('tab', { name: 'Explore', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Families', exact: true })).toBeFocused();
  await expect(page.locator('#ei-panel-families')).toBeVisible();
  await expect(page.locator('#ei-panel-explore')).toBeHidden();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Evidence', exact: true })).toBeFocused();
  await expect(page.locator('.ei-replay')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'Explore', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Explore this family & inheritance', exact: true }).click();
  await expect(page.locator('.ei-inheritance')).toBeVisible();
  await page.locator('.ei-desk-body').evaluate(el => { el.scrollTop = el.scrollHeight; });
  const canvas = await page.locator('.ei-scene').boundingBox();
  const transport = await page.getByRole('button', { name: 'Next generation', exact: false }).boundingBox();
  expect(canvas!.y).toBeGreaterThanOrEqual(0); expect(canvas!.y + canvas!.height).toBeLessThan(1100);
  expect(transport!.y).toBeGreaterThanOrEqual(0); expect(transport!.y + transport!.height).toBeLessThan(1100);
  expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id)).toEqual([renderer]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.v1')!))).toEqual(world);
  await page.getByRole('tab', { name: 'Explore', exact: true }).click();
  await page.locator('.ei-desk-body').evaluate(el => { el.scrollTop = 0; });
  await page.screenshot({ path: report + '/focused-workspace-desktop.png' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  for (const tab of ['Explore', 'Families', 'Investigate', 'Evidence']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    expect(await page.evaluate(async () => (window as any).axe.run('.ei-app', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('inheritance reveal shows recorded choices, mutations and trait averages without drawing new genes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  const world = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.v1')!));
  const child = world.history[1].population.find((o: any) => o.mutations > 0);
  const trait = ['shade', 'fur', 'legs'].find(k => child.inheritance[k].some((r: any) => r.delta !== null))!;
  await page.selectOption('#ei-organism', String(child.id));
  await page.getByRole('button', { name: 'Trace this birth', exact: true }).click();
  await expect(page.locator('.ei-inheritance')).toBeFocused();
  await page.getByLabel('Trait to trace', { exact: true }).selectOption(trait);
  const reveal = page.locator('.ei-inheritance');
  await expect(reveal).toHaveAttribute('data-inheritance-step', '0');
  await page.getByRole('button', { name: 'Next inheritance step', exact: true }).click();
  for (let i = 0; i < 2; i++) {
    await expect(page.locator('[data-inherit-copy="' + i + ':' + child.inheritance[trait][i].copy + '"]')).toHaveAttribute('data-chosen', 'true');
    const parent = world.history[0].population.find((o: any) => o.id === child.parents[i]);
    await expect(page.locator('[data-inherit-value="' + i + '"]')).toHaveText((parent.genes[trait][child.inheritance[trait][i].copy] * 100).toFixed(2));
  }
  await page.getByRole('button', { name: 'Next inheritance step', exact: true }).click();
  await expect(page.locator('.ei-inherit-mutated')).toHaveCount(child.inheritance[trait].filter((r: any) => r.delta !== null).length);
  for (let i = 0; i < 2; i++) await expect(page.locator('[data-inherit-value="' + i + '"]')).toHaveText((child.genes[trait][i] * 100).toFixed(2));
  await page.getByRole('button', { name: 'Next inheritance step', exact: true }).click();
  await expect(page.locator('.ei-inherit-child')).toContainText(((child.genes[trait][0] + child.genes[trait][1]) * 50).toFixed(2));
  for (let i = 0; i < 2; i++) await expect(reveal.getByText('Parent ' + (i + 1) + ' · #' + child.parents[i], { exact: true })).toBeVisible();
  await page.locator('.ei-inherit-child').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-inheritance', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  await reveal.screenshot({ path: report + '/inheritance-reveal-desktop.png', style: '.ei-commandbar,.ei-workspace > .ei-main,.ei-desk { position: static !important; } .ei-desk-body,.ei-workspace > .ei-main { max-height: none !important; overflow: visible !important; }' });
  await page.getByRole('button', { name: 'Watch inheritance', exact: true }).click();
  await expect(reveal).toHaveAttribute('data-inheritance-step', '1', { timeout: 6000 });
  await page.getByRole('button', { name: 'Pause inheritance', exact: true }).click();
  await page.waitForTimeout(2400);
  await expect(reveal).toHaveAttribute('data-inheritance-step', '1');
  await page.getByRole('button', { name: 'Watch inheritance', exact: true }).click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.getByRole('button', { name: 'Watch inheritance', exact: true })).toBeVisible();
  await page.evaluate(() => { delete (document as any).hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(2400);
  await expect(reveal).toHaveAttribute('data-inheritance-step', '0');
  await page.getByRole('button', { name: 'Watch inheritance', exact: true }).click();
  await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
  await page.waitForTimeout(2400);
  await page.getByRole('tab', { name: 'Families', exact: true }).click();
  await expect(reveal).toHaveAttribute('data-inheritance-step', '0');
  await expect(page.getByRole('button', { name: 'Watch inheritance', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.v1')!))).toEqual(world);
  // A saved birth without detailed provenance must not claim to know its random choices.
  world.history.forEach((f: any) => f.population.forEach((o: any) => delete o.inheritance));
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: 2026, selectedId: child.id, introDismissed: true } } });
  await page.getByRole('tab', { name: 'Families', exact: true }).click();
  await expect(reveal).toContainText('exact choices and mutation events are unknown');
  await expect(page.getByRole('button', { name: 'Watch inheritance', exact: true })).toHaveCount(0);
  await expect(page.locator('[data-chosen="true"]')).toHaveCount(0);
});

test('phone inheritance is self paced, accessible and does not overflow with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { evoLab: { view: 'livingIsland', islandStudy: { seed: 2026, introDismissed: true } } });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  await page.selectOption('#ei-organism', '37');
  await page.getByRole('button', { name: 'Trace this birth', exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next inheritance step', exact: true }).click();
  expect(await page.locator('.ei-inherit-child').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await expect(page.locator('.ei-inheritance')).toHaveAttribute('data-inheritance-step', '3');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.locator('.ei-inheritance').screenshot({ path: report + '/inheritance-reveal-phone.png', style: '.ei-commandbar,.ei-desk-tabs { position: static !important; }' });
  await page.getByRole('tab', { name: 'Explore', exact: true }).click();
  await page.locator('.ei-stage').scrollIntoViewIfNeeded();
  await page.screenshot({ path: report + '/focused-workspace-phone.png' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-app', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => v.id)))).toEqual([]);
});


test('repeat trials preserve both original worlds, chart actual outcomes, save evidence and resume', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { evoLab: { view: 'livingIsland', evoProgress: { notes: { livingIsland: { text: 'My own field explanation.', at: '2026-09-27T00:00:00Z' } } } } });
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await page.getByRole('button', { name: 'Explore two futures', exact: false }).click();
  await page.getByRole('button', { name: 'Create my two futures', exact: true }).click();
  await expect(page.locator('.ei-repeat-evidence')).toHaveCount(0);
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Advance both islands', exact: true }).click();
  const before = await page.evaluate(() => ({ world: localStorage.getItem('evoLab.island.v1'), summary: JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).lastTrial }));
  const originalText = await page.locator('.ei-trial-evidence').innerText();
  const rendererIds = (await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id);
  await expect(page.locator('.ei-repeat-evidence')).toHaveAttribute('data-repeat-count', '0');
  for (let i = 1; i <= 5; i++) {
    await page.getByRole('button', { name: 'Run another 5-round trial', exact: true }).click();
    await expect(page.locator('.ei-repeat-evidence')).toHaveAttribute('data-repeat-count', String(i));
  }
  await expect(page.getByRole('button', { name: 'Five repeats recorded', exact: true })).toBeDisabled();
  await expect(page.locator('[data-trial-generation]')).toHaveText(['G5', 'G5']);
  expect(await page.locator('.ei-trial-evidence').innerText()).toBe(originalText);
  expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id)).toEqual(rendererIds);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).lastTrial);
  expect(saved).toMatchObject(before.summary);
  expect(saved.repeats.runs).toHaveLength(5);
  const expected = await page.evaluate((summary: any) => (window as any).StemLab.evoIslandRepeats.observe(summary, 'fur'), saved);
  await expect(page.locator('.ei-repeat-outcome')).toContainText('6 paired trials recorded');
  await expect(page.locator('.ei-repeat-outcome')).toContainText(expected.higher + ' with B higher');
  await page.getByText('Read every trial and random seed', { exact: true }).click();
  await expect(page.locator('.ei-repeat-evidence tbody tr')).toHaveCount(6);
  for (const run of saved.repeats.runs) await expect(page.locator('.ei-repeat-evidence table')).toContainText(String(run.seed));
  await page.getByLabel('Compare across trials', { exact: true }).selectOption('legs');
  const legs = await page.evaluate((summary: any) => (window as any).StemLab.evoIslandRepeats.observe(summary, 'legs'), saved);
  await expect(page.locator('.ei-repeat-outcome')).toContainText(legs.lower + ' with A higher');
  await page.locator('.ei-repeat-evidence').screenshot({ path: report + '/repeated-trials-desktop.png' });
  await page.getByRole('button', { name: 'Save repeated-trial evidence', exact: true }).click();
  const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  expect(notes.livingIsland.text).toBe('My own field explanation.');
  expect(notes.livingIslandComparison.text).toContain('original pair + 5 repeats');
  expect(notes.livingIslandComparison.text).toContain('Extinctions: A');
  expect(notes.livingIslandComparison.text.length).toBeLessThan(2000);
  expect(notes.livingIslandComparison.text).toContain('\nRepeated trials:');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-comparison', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  await page.getByRole('button', { name: 'Return to my island', exact: false }).click();
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(before.world);
  await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
  await page.getByText('Your last comparison · saved evidence', { exact: true }).click();
  await expect(page.locator('.ei-repeat-evidence')).toHaveAttribute('data-repeat-count', '5');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).lastTrial)).toEqual(saved);
  await expect(page.getByRole('button', { name: 'Run another 5-round trial', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('repeat evidence handles early extinction on a phone and survives changing experimental conditions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  const world = await page.evaluate(() => {
    const model = (window as any).StemLab.evoIslandModel, world = model.create(17);
    world.history[0].population = world.history[0].population.slice(0, 2);
    world.history[0].stats = model.stats(world.history[0].population); world.nextId = 3; return world;
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: 17, introDismissed: true } } });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await page.getByRole('button', { name: 'Explore two futures', exact: false }).click();
  await page.getByRole('button', { name: 'Create my two futures', exact: true }).click();
  for (let i = 0; i < 5; i++) {
    const button = page.getByRole('button', { name: 'Advance both islands', exact: true });
    if (await button.isDisabled()) break;
    await button.click();
  }
  await page.getByRole('button', { name: 'Run another 5-round trial', exact: true }).click();
  await page.getByRole('button', { name: 'Run another 5-round trial', exact: true }).click();
  await expect(page.locator('.ei-repeat-outcome')).toContainText('extinction');
  await page.getByText('Read every trial and random seed', { exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const scrollingTable = page.getByRole('region', { name: 'Read every trial and random seed', exact: true });
  await scrollingTable.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => scrollingTable.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  await scrollingTable.evaluate(el => { el.scrollLeft = 0; });
  await page.locator('.ei-repeat-evidence').screenshot({ path: report + '/repeated-trials-phone-extinction.png' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-repeat-evidence', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => v.id)))).toEqual([]);
  await page.getByRole('button', { name: 'Return to my island', exact: false }).click();
  await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
  await page.getByText('Your last comparison · saved evidence', { exact: true }).click();
  await expect(page.locator('.ei-repeat-evidence')).toHaveAttribute('data-repeat-count', '2');
  await page.getByRole('button', { name: 'Run another 5-round trial', exact: true }).click();
  await expect(page.locator('.ei-repeat-evidence')).toHaveAttribute('data-repeat-count', '3');
  const resumed = await page.evaluate(() => {
    const w = window as any, s = JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).lastTrial;
    return { actual: s.repeats.runs[2], expected: w.StemLab.evoIslandRepeats.run(w.__toolData.evoLab.island, s, s.repeats.rng, 3) };
  });
  expect(resumed.actual).toEqual(resumed.expected);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await page.getByRole('button', { name: 'Explore two futures', exact: false }).click();
  await page.selectOption('#ei-trial-factor', 'selection');
  await page.getByRole('button', { name: 'Create my two futures', exact: true }).click();
  await expect(page.locator('.ei-repeat-evidence')).toHaveCount(0);
  await page.getByRole('button', { name: 'Advance both islands', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).lastTrial.repeats)).toBeUndefined();
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
});


test('survival detective locks a prediction, records the actual boundary round, and restores its evidence', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  const world = await page.evaluate(() => {
    const m = (window as any).StemLab.evoIslandModel;
    let w = m.create(2026); for (let i = 0; i < 4; i++) w = m.step(w); return w;
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: 2026, introDismissed: true },
    evoProgress: { notes: { livingIsland: { text: 'My original reasoning.', at: '2026-09-27T00:00:00Z' } } } } });
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await page.getByRole('button', { name: 'Start survival detective', exact: true }).click();
  await expect(page.locator('.ei-detective')).toHaveAttribute('data-detective-phase', 'predict');
  await expect(page.getByRole('heading', { name: 'Survival detective', exact: true })).toBeFocused();
  await expect(page.locator('.ei-detective-chance')).toHaveCount(0);
  const locked = await page.evaluate(() => {
    const w = window as any, s = JSON.parse(localStorage.getItem('evoLab.island.study.v1')!);
    return { record: s.detective, answer: w.StemLab.evoIslandDetective.observe(w.__toolData.evoLab.island, s.detective).answer };
  });
  await page.locator('input[name="ei-detective-choice"][value="' + locked.answer + '"]').check();
  await page.getByRole('button', { name: 'Lock prediction & reveal chances', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A chance, not a promise', exact: true })).toBeFocused();
  await expect(page.locator('.ei-detective-feedback')).toContainText('matches the model’s chances');
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
  await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await expect(page.locator('.ei-detective')).toHaveAttribute('data-detective-phase', 'locked');
  const renderer = (await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id);
  const expected = await page.evaluate((original: any) => {
    const w = (window as any).StemLab.evoIslandModel.step({ ...original, living: false });
    return { ...w, living: true };
  }, world);
  await page.getByRole('button', { name: 'Run one survival round', exact: true }).click();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '5');
  await expect(page.getByRole('heading', { name: 'The real round is in', exact: true })).toBeFocused();
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(expected);
  expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id)).toEqual(renderer);
  await expect(page.getByRole('button', { name: 'Run one survival round', exact: true })).toHaveCount(0);
  for (const id of locked.record.ids) {
    const card = page.locator('.ei-detective-resident[data-organism-id="' + id + '"]');
    const survived = expected.history[5].survivors.includes(id);
    await expect(card.locator('.ei-detective-result')).toHaveAttribute('data-survived', String(survived));
    await expect(card).toContainText('Direct offspring: ' + expected.history[5].population.filter((o: any) => o.parents.includes(id)).length);
    const chance = await page.evaluate(({ original, id }: any) => {
      const m = (window as any).StemLab.evoIslandModel;
      return (m.chance(original.history[4].population.find((o: any) => o.id === id), m.habitats[original.habitat], original.selection) * 100).toFixed(1) + '%';
    }, { original: world, id });
    await expect(card.locator('.ei-detective-chance')).toContainText(chance);
  }
  await page.getByText('Why these chances?', { exact: true }).click();
  await expect(page.locator('.ei-detective-formula')).toContainText('Predator protection');
  await page.getByRole('button', { name: 'Save detective evidence', exact: true }).click();
  const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  expect(notes.livingIsland.text).toBe('My original reasoning.');
  expect(notes.livingIslandDetective.text).toContain('\nPrediction: ' + locked.answer);
  expect(notes.livingIslandDetective.text).toContain('G4 → G5');
  expect(notes.livingIslandDetective.text.length).toBeLessThan(2000);
  await page.locator('.ei-detective').screenshot({ path: report + '/survival-detective-desktop.png', style: '.ei-desk,.ei-desk-body{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar,.ei-desk-tabs{position:static!important}' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-detective', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await expect(page.locator('.ei-detective')).toHaveAttribute('data-detective-phase', 'result');
  await expect(page.locator('.ei-detective-feedback')).toContainText('matches the model’s chances');
  await expect(page.locator('.ei-detective-feedback')).toContainText('resident with lower odds survived');
  await page.getByRole('button', { name: 'Replay this survival round', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Evidence', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'survivors');
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(expected);
  expect(errors).toEqual([]);
});

test('survival detective on a phone distinguishes neutral chance from extinction and keeps the layout accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  const world = await page.evaluate(() => {
    const m = (window as any).StemLab.evoIslandModel;
    for (let seed = 1; seed <= 50; seed++) {
      const w = m.create(seed); w.selection = false;
      w.history[0].population = w.history[0].population.slice(0, 2); w.history[0].stats = m.stats(w.history[0].population); w.nextId = 3;
      if (m.step(w).history[1].survivors.length === 1) return w;
    }
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: world.seed, introDismissed: true } } });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await page.getByRole('button', { name: 'Start survival detective', exact: true }).click();
  await page.getByRole('radio', { name: 'About equal (within 1 percentage point)', exact: true }).focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Lock prediction & reveal chances', exact: true }).click();
  await expect(page.locator('.ei-detective-chance strong')).toHaveText(['68.0%', '68.0%']);
  await page.getByText('Why these chances?', { exact: true }).click();
  await expect(page.locator('.ei-detective-formula p')).toHaveText([/0.68 × 1.000 = 68.0%/, /0.68 × 1.000 = 68.0%/]);
  await page.getByRole('button', { name: 'Run one survival round', exact: true }).click();
  await expect(page.locator('.ei-detective-result[data-survived=true]')).toHaveCount(1);
  await expect(page.locator('.ei-detective-result[data-survived=false]')).toHaveCount(1);
  await expect(page.locator('.ei-detective-result small')).toHaveText(['Direct offspring: 0', 'Direct offspring: 0']);
  await expect(page.getByRole('button', { name: 'Start a new case', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.locator('.ei-detective').screenshot({ path: report + '/survival-detective-phone.png', style: '.ei-commandbar,.ei-desk-tabs{position:static!important}' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-detective', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  await page.getByRole('button', { name: 'Meet resident A', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Explore', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '0');
});

test('survival detective without WebGL explains changed conditions and never accepts a late prediction', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any;
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } }, undefined, { expectCanvas: false });
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await page.getByRole('button', { name: 'Start survival detective', exact: true }).click();
  await page.getByRole('radio', { name: 'A has the better chance', exact: true }).check();
  await page.getByRole('button', { name: 'Lock prediction & reveal chances', exact: true }).click();
  await page.getByRole('tab', { name: 'Explore', exact: true }).click();
  await page.getByRole('button', { name: 'Long winter', exact: false }).click();
  await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  await expect(page.locator('.ei-detective')).toContainText('The habitat or selection setting changed.');
  await expect(page.getByRole('button', { name: 'Run one survival round', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  await expect(page.locator('.ei-detective-feedback')).toContainText('original prediction is not scored');
  await expect(page.locator('.ei-detective')).toContainText('Long winter');
  await page.getByRole('button', { name: 'Save detective evidence', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandDetective.text)).toContain('Conditions changed; prediction not scored.');
  await page.getByRole('button', { name: 'Start a new case', exact: true }).click();
  await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  await expect(page.locator('.ei-detective-feedback')).toContainText('before you locked a prediction');
  await expect(page.getByRole('button', { name: 'Lock prediction & reveal chances', exact: true })).toHaveCount(0);
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'fallback');
});


test('family time machine scrubs real history, compares inherited traits, finds members and saves evidence', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  const fixture = await page.evaluate(() => {
    const m = (window as any).StemLab.evoIslandModel;
    let world = m.create(2026); for (let i = 0; i < 8; i++) world = m.step(world);
    const root = world.history[0].population.find((o: any) => {
      const family = m.family(world, o.id);
      return world.history[2].population.filter((c: any) => family.has(c.id)).length >= 2 &&
        world.history[8].population.every((c: any) => family.has(c.id));
    });
    world.habitat = world.history[8].habitat === 'snow' ? 'forest' : 'snow';
    return { world, root };
  });
  expect(fixture.root).toBeTruthy();
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: fixture.world,
    islandStudy: { seed: 2026, trackedId: fixture.root.id, familyTrait: '__proto__', introDismissed: true },
    evoProgress: { notes: { livingIsland: { text: 'My explanation stays.', at: '2026-09-27T00:00:00Z' } } } } });
  await page.getByRole('tab', { name: 'Families', exact: true }).click();
  await expect(page.getByLabel('Trait to follow', { exact: true })).toHaveValue('fur');
  const renderer = (await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id);
  await page.getByLabel('Trait to follow', { exact: true }).selectOption('legs');
  await page.locator('#ei-family-time').focus(); await page.keyboard.press('Home');
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '0');
  await page.keyboard.press('End');
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '8');
  await expect(page.locator('.ei-family-machine')).toContainText('Every resident here shares this ancestor.');
  const recordedName = await page.evaluate((world: any) => (window as any).StemLab.evoIslandModel.habitats[world.history[8].habitat].name, fixture.world);
  await expect(page.locator('.ei-stage-top')).toContainText(recordedName);
  await expect(page.locator('[data-island-phase]')).toHaveText('Replay · recorded offspring');
  await page.locator('#ei-family-time').fill('2');
  const evidence = await page.evaluate(({ world, id }: any) => {
    const m = (window as any).StemLab.evoIslandModel, family = m.family(world, id);
    const members = world.history[2].population.filter((o: any) => family.has(o.id));
    const mean = members.reduce((n: number, o: any) => n + (o.genes.legs[0] + o.genes.legs[1]) / 2, 0) / members.length;
    const sorted = members.slice().sort((a: any, b: any) => m.value(a, 'legs') - m.value(b, 'legs') || a.id - b.id);
    return { mean, minimum: sorted[0], maximum: sorted[sorted.length - 1], count: members.length,
      populationMean: world.history[2].population.reduce((n: number, o: any) => n + (o.genes.legs[0] + o.genes.legs[1]) / 2, 0) / world.history[2].population.length };
  }, { world: fixture.world, id: fixture.root.id });
  await expect(page.locator('[data-family-trait-mean]')).toHaveText((evidence.mean * 100).toFixed(1));
  await expect(page.locator('[data-family-population-mean]')).toHaveText((evidence.populationMean * 100).toFixed(1));
  await page.getByRole('button', { name: 'Meet lowest-trait member', exact: true }).click();
  await expect(page.locator('#ei-organism')).toHaveValue(String(evidence.minimum.id));
  await expect(page.locator('#ei-lens')).toHaveValue('legs');
  await expect(page.locator('.ei-stage')).toBeFocused();
  await page.getByRole('button', { name: 'Meet highest-trait member', exact: true }).click();
  await expect(page.locator('#ei-organism')).toHaveValue(String(evidence.maximum.id));
  await page.getByRole('button', { name: 'Save family trait evidence', exact: true }).click();
  const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  expect(notes.livingIsland.text).toBe('My explanation stays.');
  expect(notes.livingIslandTraitTrail.text).toContain('ancestor #' + fixture.root.id);
  expect(notes.livingIslandTraitTrail.text).toContain('\nTrait: Leg length.');
  expect(notes.livingIslandTraitTrail.text).toContain('viewed G2');
  expect(notes.livingIslandTraitTrail.text).toContain((evidence.mean * 100).toFixed(1) + '/100');
  expect(notes.livingIslandTraitTrail.text.length).toBeLessThan(2000);
  await page.getByText('Read the complete family record', { exact: true }).click();
  await expect(page.locator('.ei-family-record tbody tr')).toHaveCount(9);
  await expect(page.locator('.ei-family-record thead')).toContainText('Leg length');
  await expect(page.locator('.ei-family-record tbody tr').nth(2)).toContainText((evidence.mean * 100).toFixed(1));
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id)).toEqual(renderer);
  await page.locator('.ei-family-machine').screenshot({ path: report + '/family-time-machine-desktop.png', style: '.ei-desk,.ei-desk-body{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar,.ei-desk-tabs{position:static!important}' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-family-journey', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  await page.getByRole('tab', { name: 'Families', exact: true }).click();
  await expect(page.getByLabel('Trait to follow', { exact: true })).toHaveValue('legs');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).trackedId)).toBe(fixture.root.id);
  expect(errors).toEqual([]);
});

test('family time machine on a phone leaves a lost lineage undefined and makes the exact record keyboard-scrollable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  const fixture = await page.evaluate(() => {
    const m = (window as any).StemLab.evoIslandModel;
    let world = m.create(2026); for (let i = 0; i < 12; i++) world = m.step(world);
    const root = world.history[0].population.find((o: any) => !world.history[1].population.some((c: any) => c.parents.includes(o.id)));
    return { world, root };
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: fixture.world, islandStudy: { seed: 2026, trackedId: fixture.root.id, introDismissed: true } } });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await page.getByRole('tab', { name: 'Families', exact: true }).click();
  await expect(page.locator('[data-family-trait-mean]')).toHaveText('—');
  await expect(page.locator('.ei-family-machine')).toContainText('mean and range are undefined');
  expect((await page.locator('[data-family-mean-line]').getAttribute('points'))!.trim().split(' ')).toHaveLength(1);
  expect((await page.locator('[data-family-population-line]').getAttribute('points'))!.trim().split(' ')).toHaveLength(13);
  await expect(page.locator('[data-family-extreme]')).toHaveCount(0);
  await page.locator('#ei-family-time').fill('0');
  await expect(page.locator('[data-family-trait-mean]')).not.toHaveText('—');
  await expect(page.getByRole('button', { name: 'Meet highest-trait member', exact: true })).toBeDisabled();
  await page.locator('#ei-family-time').fill('12');
  await page.getByRole('button', { name: 'Save family trait evidence', exact: true }).click();
  const note = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandTraitTrail.text);
  expect(note).toContain('Family mean: undefined');
  expect(note).not.toContain('Mean change since ancestor:');
  await page.getByText('Read the complete family record', { exact: true }).click();
  const record = page.getByRole('region', { name: 'Read the complete family record', exact: true });
  await record.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => record.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  await record.evaluate(el => { el.scrollLeft = 0; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.locator('.ei-family-machine').screenshot({ path: report + '/family-time-machine-phone.png', style: '.ei-commandbar,.ei-desk-tabs{position:static!important}' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-family-journey', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(fixture.world);
});

test('family time machine without WebGL handles a single zero-valued ancestor and a later-born family', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any;
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } }, undefined, { expectCanvas: false });
  const world = await page.evaluate(() => {
    const m = (window as any).StemLab.evoIslandModel, world = m.create(2026);
    world.history[0].population.forEach((o: any) => { o.genes.fur = [0, 0]; });
    world.history[0].stats = m.stats(world.history[0].population); return world;
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: 2026, trackedId: 1, introDismissed: true } } }, undefined, { expectCanvas: false });
  await page.getByRole('tab', { name: 'Families', exact: true }).click();
  await expect(page.locator('#ei-family-time')).toBeDisabled();
  await expect(page.locator('[data-family-trait-mean]')).toHaveText('0.0');
  await expect(page.locator('[data-family-population-mean]')).toHaveText('0.0');
  await page.getByRole('button', { name: 'Meet lowest-trait member', exact: true }).click();
  await expect(page.locator('#ei-lens')).toHaveValue('fur');
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
  await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  await page.getByRole('tab', { name: 'Explore', exact: true }).click();
  const child = await page.evaluate(() => (window as any).__toolData.evoLab.island.history[1].population[0].id);
  await page.selectOption('#ei-organism', String(child));
  await page.getByRole('button', { name: 'Follow this family', exact: false }).click();
  await page.getByRole('tab', { name: 'Families', exact: true }).click();
  await expect(page.locator('#ei-family-time')).toHaveAttribute('min', '1');
  await expect(page.locator('#ei-family-time')).toBeDisabled();
  await page.locator('#ei-time').fill('0');
  await expect(page.locator('[data-family-result]')).toHaveAttribute('data-family-result', 'before');
  await expect(page.locator('.ei-family-machine')).toHaveCount(0);
  await page.getByRole('button', { name: 'Revisit the ancestor', exact: true }).click();
  await expect(page.locator('.ei-family-machine')).toHaveAttribute('data-family-trait-generation', '1');
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'fallback');
});


test('expedition highlights revisit recorded evidence, collect moments, trace births and persist independently', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  const fixture = await page.evaluate(() => {
    const w = window as any, m = w.StemLab.evoIslandModel;
    let world = m.create(2026); for (let i = 0; i < 12; i++) world = m.step(world);
    world.habitat = world.history[12].habitat === 'snow' ? 'forest' : 'snow';
    world.selection = !world.history[12].selection;
    return { world, events: w.StemLab.evoIslandHighlights.suggest(world) };
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: fixture.world, islandStudy: { seed: 2026, trackedId: 1, introDismissed: true },
    evoProgress: { notes: { livingIsland: { text: 'My own explanation.', at: '2026-09-27T00:00:00Z' } } } } });
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  const contexts = (await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id);
  expect(contexts).toHaveLength(1);
  await page.getByRole('button', { name: 'Expedition highlights', exact: true }).click();
  await expect(page.locator('.ei-highlights')).toBeFocused();
  for (const kind of ['habitat', 'shift', 'survival', 'mutation']) {
    const item = fixture.events.find((e: any) => e.record.kind === kind);
    expect(item).toBeTruthy();
    await page.selectOption('#ei-highlight-select', item.key);
    await expect(page.locator('.ei-highlight-moment')).toHaveAttribute('data-highlight-kind', kind);
    await expect(page.locator('.ei-highlight-cohorts strong')).toHaveText([String(item.parents), String(item.survivors), String(item.offspring)]);
    if (kind === 'shift') {
      await expect(page.locator('.ei-highlight-fact')).toContainText((item.from * 100).toFixed(1) + ' → ' + (item.to * 100).toFixed(1));
      await expect(page.locator('.ei-highlight-icon')).toHaveText(item.delta < 0 ? '↘' : '↗');
    }
    await page.getByRole('button', { name: 'Keep this moment', exact: true }).click();
    await page.getByRole('button', { name: 'Revisit this moment on the island', exact: true }).click();
    await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', String(item.generation));
    await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', kind === 'mutation' ? 'offspring' : 'survivors');
    const habitat = await page.evaluate((key: string) => (window as any).StemLab.evoIslandModel.habitats[key].name, item.habitat);
    await expect(page.locator('.ei-stage-top')).toContainText(habitat);
    if (kind === 'shift') await expect(page.locator('#ei-lens')).toHaveValue(item.record.trait);
    expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  }
  await expect(page.locator('[data-kept-count]')).toHaveAttribute('data-kept-count', '4');
  const mutation = fixture.events.find((e: any) => e.record.kind === 'mutation');
  await page.getByRole('button', { name: 'Trace this offspring’s birth', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Families', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.ei-inheritance')).toHaveAttribute('data-inheritance-organism', String(mutation.record.organismId));
  await expect(page.locator('.ei-inheritance')).toBeFocused();
  await page.getByRole('button', { name: 'Expedition highlights', exact: true }).click();
  await page.getByRole('button', { name: 'Save collection to journal', exact: true }).click();
  const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  expect(notes.livingIsland.text).toBe('My own explanation.');
  expect(notes.livingIslandHighlights.text).toContain('\nG' + mutation.generation + ' · mutation');
  expect(notes.livingIslandHighlights.text.length).toBeLessThan(2000);
  expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id)).toEqual(contexts);
  await page.locator('.ei-highlights').screenshot({ path: report + '/expedition-highlights-desktop.png', style: '.ei-desk,.ei-desk-body{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar,.ei-desk-tabs{position:static!important}' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-highlights', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  await page.getByRole('button', { name: 'Expedition highlights', exact: true }).click();
  await expect(page.locator('[data-kept-count]')).toHaveAttribute('data-kept-count', '4');
  const oldHabitat = fixture.events.find((e: any) => e.record.kind === 'habitat');
  await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  const expected = await page.evaluate((world: any) => (window as any).StemLab.evoIslandModel.step(world), fixture.world);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(expected);
  await page.selectOption('#ei-highlight-select', oldHabitat.key);
  await expect(page.locator('.ei-highlight-moment')).toHaveAttribute('data-highlight-generation', String(oldHabitat.generation));
  await expect(page.getByRole('button', { name: 'Remove from my collection', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).trackedId)).toBe(1);
  expect(errors).toEqual([]);
});

test('expedition highlights on a phone enforce collection capacity and preserve a six-moment journal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  const world = await page.evaluate(() => {
    const m = (window as any).StemLab.evoIslandModel; let w = m.create(2026);
    for (let i = 0; i < 8; i++) w = m.step(w); return w;
  });
  const records = [1,2,3,4,5,6].map(generation => ({ kind: 'survival', generation }));
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: 2026, highlights: records, introDismissed: true } } });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await page.getByRole('button', { name: 'Expedition highlights', exact: true }).click();
  await expect(page.locator('[data-kept-count]')).toHaveAttribute('data-kept-count', '6');
  await page.selectOption('#ei-highlight-select', 'habitat:5');
  await expect(page.getByRole('button', { name: 'Keep this moment', exact: true })).toBeDisabled();
  await expect(page.locator('.ei-highlights')).toContainText('Your six spaces are full.');
  await page.locator('.ei-highlight-chips button').first().focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Remove from my collection', exact: true }).click();
  await expect(page.locator('[data-kept-count]')).toHaveAttribute('data-kept-count', '5');
  await page.selectOption('#ei-highlight-select', 'habitat:5');
  await page.getByRole('button', { name: 'Keep this moment', exact: true }).click();
  await expect(page.locator('[data-kept-count]')).toHaveAttribute('data-kept-count', '6');
  await page.getByRole('button', { name: 'Save collection to journal', exact: true }).click();
  const note = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandHighlights.text);
  expect(note.match(/\nG/g)).toHaveLength(6); expect(note.length).toBeLessThan(2000);
  await page.getByText('How are highlights chosen?', { exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.locator('.ei-highlights').screenshot({ path: report + '/expedition-highlights-phone.png', style: '.ei-commandbar,.ei-desk-tabs{position:static!important}' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-highlights', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
});

test('expedition highlights without WebGL wait for real evidence and revisit a survivor after extinction', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any;
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } }, undefined, { expectCanvas: false });
  const world = await page.evaluate(() => {
    const m = (window as any).StemLab.evoIslandModel;
    for (let seed = 1; seed <= 50; seed++) {
      const w = m.create(seed); w.history[0].population = w.history[0].population.slice(0, 2);
      w.history[0].stats = m.stats(w.history[0].population); w.nextId = 3;
      if (m.step(w).history[1].survivors.length === 1) return w;
    }
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: world.seed, highlights: [{ kind: 'mutation', generation: 99, organismId: 999 }], introDismissed: true } } }, undefined, { expectCanvas: false });
  await page.getByRole('button', { name: 'Expedition highlights', exact: true }).click();
  await expect(page.locator('.ei-highlights')).toHaveAttribute('data-highlight-key', 'empty');
  await expect(page.getByRole('button', { name: 'Keep this moment', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  await expect(page.locator('.ei-highlights')).toHaveAttribute('data-highlight-key', 'extinction:1');
  await expect(page.locator('.ei-highlight-cohorts strong')).toHaveText(['2', '1', '0']);
  await page.getByRole('button', { name: 'Keep this moment', exact: true }).click();
  const before = await page.evaluate(() => (window as any).__toolData.evoLab.island);
  await page.getByRole('button', { name: 'Revisit this moment on the island', exact: true }).click();
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'survivors');
  await expect(page.locator('.ei-map-creature')).toHaveCount(1);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(before);
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'fallback');
  await page.getByRole('button', { name: 'Save collection to journal', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandHighlights.text)).toContain('Parents/survivors/offspring: 2/1/0');
});


test('watch a generation records one climate-boundary round and explores its real cohorts in 3D', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  const fixture = await page.evaluate(() => {
    const m = (window as any).StemLab.evoIslandModel;
    let world = m.create(2026); for (let i = 0; i < 4; i++) world = m.step(world);
    return { world, preview: m.preview(world), next: m.step(world) };
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: fixture.world, islandStudy: { seed: 2026, introDismissed: true, trackedId: 1, lens: 'fur' } } });
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  const contexts = (await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id);
  expect(contexts).toHaveLength(1);
  await expect(page.locator('.ei-next-round')).toHaveAttribute('data-next-generation', '5');
  await expect(page.locator('.ei-next-round')).toHaveAttribute('data-next-habitat', fixture.preview.habitat);
  await expect(page.locator('.ei-next-round')).toContainText('Living climate changes the habitat before survival.');
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  await page.getByRole('button', { name: 'Watch a generation', exact: true }).focus(); await page.keyboard.press('Enter');
  const guide = page.locator('.ei-watch-guide');
  await expect(guide).toBeFocused();
  await expect(guide).toHaveAttribute('data-watch-phase', 'parents');
  await expect(guide.locator('.ei-watch-count')).toContainText(String(fixture.world.history[4].population.length));
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'parents');
  const habitat = await page.evaluate((key: string) => (window as any).StemLab.evoIslandModel.habitats[key].name, fixture.preview.habitat);
  await expect(page.locator('.ei-stage-top')).toContainText(habitat);
  await expect(page.getByRole('button', { name: 'Next generation', exact: false })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Play evolution', exact: false })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Watch generation story', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(fixture.next);
  await guide.getByRole('button', { name: 'Reveal survivors', exact: false }).click();
  await expect(guide).toHaveAttribute('data-watch-phase', 'survivors');
  await expect(guide.locator('.ei-watch-count')).toContainText(String(fixture.next.history[5].survivors.length));
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'survivors');
  await guide.getByRole('button', { name: 'Previous stage', exact: true }).click();
  await expect(guide).toHaveAttribute('data-watch-phase', 'parents');
  await guide.getByRole('button', { name: 'Reveal survivors', exact: false }).click();
  await page.locator('.ei-board').screenshot({ path: report + '/watch-generation-desktop.png' });
  await guide.getByRole('button', { name: 'Meet the offspring', exact: false }).click();
  await expect(guide).toHaveAttribute('data-watch-phase', 'offspring');
  await expect(guide.locator('.ei-watch-count')).toContainText(String(fixture.next.history[5].population.length));
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(fixture.next);
  expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id)).toEqual(contexts);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-watch-guide', { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  await guide.getByRole('button', { name: 'Finish walkthrough', exact: true }).click();
  await expect(guide).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Watch a generation', exact: true })).toBeFocused();
  await expect(page.locator('.ei-next-round')).toHaveAttribute('data-next-generation', '6');
  // Two clicks in one task cannot record two rounds before React updates the button.
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Watch a generation')!; b.click(); b.click(); });
  const sixth = await page.evaluate((world: any) => (window as any).StemLab.evoIslandModel.step(world), fixture.next);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(sixth);
  await guide.getByRole('button', { name: 'Leave walkthrough', exact: true }).click();
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'offspring');
  await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  await expect(guide).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(sixth);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).trackedId)).toBe(1);
  expect(errors).toEqual([]);
});

test('watch a generation on a phone stays self-paced with reduced motion and supports keyboard navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  const world = await page.evaluate(() => ({ ...(window as any).StemLab.evoIslandModel.create(18), habitat: 'forest', living: false, selection: false }));
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: 18, introDismissed: true } } });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('.ei-next-round')).toHaveAttribute('data-next-habitat', 'forest');
  await expect(page.locator('.ei-next-round')).toContainText('Trait-neutral survival.');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-commandbar', { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => v.id)))).toEqual([]);
  await page.getByRole('button', { name: 'Watch a generation', exact: true }).click();
  await expect(page.locator('.ei-watch-guide')).toBeFocused();
  const snapshot = await page.evaluate(() => (window as any).__toolData.evoLab.island);
  await page.waitForTimeout(3500);
  await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase', 'parents');
  await page.getByRole('button', { name: 'Reveal survivors', exact: false }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.ei-watch-guide')).toContainText('trait-neutral sampling');
  await expect(page.locator('.ei-watch-steps [aria-current=step]')).toHaveText('2Survivors');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.locator('.ei-watch-guide').screenshot({ path: report + '/watch-generation-phone.png' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-watch-guide', { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id:v.id,nodes:v.nodes.map((n:any)=>n.target) }))))).toEqual([]);
  // Ordinary cohort controls remain connected to the same guided round.
  await page.getByRole('button', { name: 'Show parents', exact: true }).click();
  await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase', 'parents');
  await page.getByRole('button', { name: 'Leave walkthrough', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(snapshot);
  await page.locator('#ei-time').focus(); await page.keyboard.press('Home');
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '0');
  await expect(page.getByRole('button', { name: 'Watch a generation', exact: true })).toBeDisabled();
  await expect(page.locator('.ei-next-round')).toHaveCount(0);
  await page.getByRole('button', { name: 'Return to present', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Watch a generation', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(snapshot);
});

test('watch a generation without WebGL preserves the real survivor when the population goes extinct', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any;
  });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } }, undefined, { expectCanvas: false });
  const fixture = await page.evaluate(() => {
    const m = (window as any).StemLab.evoIslandModel;
    for (let seed = 1; seed < 50; seed++) {
      const world = m.create(seed); world.history[0].population = world.history[0].population.slice(0, 2);
      world.history[0].stats = m.stats(world.history[0].population); world.nextId = 3;
      const next = m.step(world); if (next.history[1].survivors.length === 1) return { world, next };
    }
  });
  expect(fixture).toBeTruthy();
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: fixture!.world, islandStudy: { seed: fixture!.world.seed, introDismissed: true } } }, undefined, { expectCanvas: false });
  await page.getByRole('button', { name: 'Watch a generation', exact: true }).click();
  await expect(page.locator('.ei-map-creature')).toHaveCount(2);
  await page.getByRole('button', { name: 'Reveal survivors', exact: false }).click();
  await expect(page.locator('.ei-map-creature')).toHaveCount(1);
  await expect(page.locator('.ei-watch-count')).toHaveText('1Survivors');
  await page.getByRole('button', { name: 'Meet the offspring', exact: false }).click();
  await expect(page.locator('.ei-map-creature')).toHaveCount(0);
  await expect(page.locator('.ei-watch-guide')).toContainText('There is no offspring cohort or mean trait to report.');
  await expect(page.getByRole('button', { name: 'Watch a generation', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Previous stage', exact: true }).click();
  await expect(page.locator('.ei-map-creature')).toHaveCount(1);
  await page.getByRole('button', { name: 'Leave walkthrough', exact: true }).click();
  await expect(page.locator('.ei-stage')).toBeFocused();
  await expect(page.locator('.ei-next-round')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(fixture!.next);
});


test('variation explorer spotlights real trait ranges in 3D and compares recorded cohorts without changing organisms', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  const world = await page.evaluate(() => { const m = (window as any).StemLab.evoIslandModel; let w = m.create(2026); for (let i = 0; i < 5; i++) w = m.step(w); return w; });
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: 2026, introDismissed: true, trackedId: 1 } } });
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  const contexts = (await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id); expect(contexts).toHaveLength(1);
  await page.selectOption('#ei-lens', 'fur');
  const bins = await page.evaluate(() => { const w = window as any; return w.StemLab.evoIslandObservation.distribution(w.__toolData.evoLab.island.history[5].population, 'fur').bins; });
  const chosen = bins.reduce((a: any, b: any) => a.count >= b.count ? a : b).index;
  async function sceneData() {
    return page.evaluate(() => {
      const w = window as any, scene = w.__glRecorder.records.find((r: any) => r.scene && r.canvas.isConnected).scene;
      const marks = scene.getObjectByName('Trait range spotlight'), sites: any[] = [], coats: any[] = [];
      scene.traverse((o: any) => { if (o.userData.islandResident) { sites.push([o.name, ...o.position.toArray()]); o.children[0].traverse((m: any) => { if (m.isMesh && m.material.map) coats.push(m.material.color.getHexString()); }); } });
      return { count: marks.count, ids: marks.userData.organismIds, geometry: marks.geometry.uuid, sameBuffer: marks.instanceMatrix === (w.__rangeBuffer || (w.__rangeBuffer = marks.instanceMatrix)), sites, coats };
    });
  }
  const baseline = await sceneData(); expect(baseline.count).toBe(0);
  await expect(page.locator('[data-variation-bin]')).toHaveCount(5);
  await page.locator('[data-variation-bin="' + chosen + '"]').click();
  let marked = await sceneData(); expect(marked.ids).toEqual(bins[chosen].members.map((o: any) => o.id));
  expect(marked.sites).toEqual(baseline.sites); expect(marked.coats).toEqual(baseline.coats);
  const transition = await page.evaluate(() => { const w = window as any; return w.StemLab.evoIslandStudy.transition(w.__toolData.evoLab.island, 5); });
  for (const phase of ['parents', 'survivors', 'offspring']) {
    const population = transition[phase];
    const members = population.filter((o: any) => { const v = (o.genes.fur[0] + o.genes.fur[1]) / 2; return v >= chosen / 5 && (chosen === 4 ? v <= 1 : v < (chosen + 1) / 5); });
    const button = page.locator('[data-range-phase="' + phase + '"]');
    await expect(button).toHaveAttribute('data-range-count', String(members.length));
    await expect(button).toHaveAttribute('data-range-total', String(population.length));
    await expect(button).toContainText((members.length / population.length * 100).toFixed(1) + '%');
    await button.click();
    await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', phase);
    await expect(page.locator('[data-selected-range]')).toHaveAttribute('data-selected-range', String(chosen));
    await expect(page.locator('[data-spotlight-count]')).toHaveAttribute('data-spotlight-count', String(members.length));
    marked = await sceneData(); expect(marked.ids).toEqual(members.map((o: any) => o.id)); expect(marked.sameBuffer).toBe(true); expect(marked.geometry).toBe(baseline.geometry);
    expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
  }
  await page.getByRole('button', { name: 'Meet the next match', exact: true }).click();
  await expect(page.locator('#ei-organism')).toHaveValue(String(bins[chosen].members[0].id));
  await page.getByRole('button', { name: 'Creature close-up', exact: true }).click(); expect((await sceneData()).count).toBe(1);
  await page.getByRole('button', { name: 'Find this range on the island', exact: true }).click();
  await expect(page.locator('.ei-stage')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Creature close-up', exact: true })).toBeVisible();
  expect((await sceneData()).count).toBe(bins[chosen].count);
  const placement = await page.evaluate(() => ({ stageTop: document.querySelector('.ei-stage')!.getBoundingClientRect().top, barBottom: document.querySelector('.ei-commandbar')!.getBoundingClientRect().bottom }));
  expect(placement.stageTop).toBeGreaterThanOrEqual(placement.barBottom - 1);
  await page.locator('.ei-stage-wrap').screenshot({ path: report + '/variation-spotlight-island.png', style: '.ei-commandbar{position:static!important}' });
  await page.locator('.ei-variation').screenshot({ path: report + '/variation-explorer-desktop.png' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-lenses', { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id:v.id,nodes:v.nodes.map((n:any)=>n.target) }))))).toEqual([]);
  await page.getByRole('button', { name: 'Clear spotlight', exact: true }).click();
  await expect(page.locator('[data-variation-bin="' + chosen + '"]')).toBeFocused();
  expect((await sceneData()).count).toBe(0);
  await page.locator('[data-variation-bin="' + chosen + '"]').click(); await page.selectOption('#ei-lens', 'legs');
  await expect(page.locator('[data-selected-range]')).toHaveCount(0); expect((await sceneData()).count).toBe(0);
  expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id)).toEqual(contexts);
  await page.locator('[data-variation-bin="2"]').click();
  await page.evaluate(() => { const w = window as any, mesh = w.__glRecorder.records.find((r:any)=>r.scene && r.canvas.isConnected).scene.getObjectByName('Trait range spotlight'); w.__rangeDisposed = { mesh:0, material:0, geometry:0 }; mesh.addEventListener('dispose',()=>w.__rangeDisposed.mesh++); mesh.material.addEventListener('dispose',()=>w.__rangeDisposed.material++); mesh.geometry.addEventListener('dispose',()=>w.__rangeDisposed.geometry++); });
  await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  expect(await page.evaluate(() => (window as any).__rangeDisposed)).toEqual({ mesh:1,material:1,geometry:1 });
  await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  await expect(page.locator('#ei-lens')).toHaveValue('legs'); await expect(page.locator('[data-selected-range]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
  expect(errors).toEqual([]);
});

test('variation explorer on a phone supports exact boundary values, keyboard spotlight and zero-valued organisms', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion:'reduce' });
  await harness.mount(page, { evoLab: { view:'livingIsland' } });
  const world = await page.evaluate(() => {
    const m = (window as any).StemLab.evoIslandModel, w = m.create(42), values = [0,0.2,0.4,0.6,0.8,1];
    w.history[0].population = w.history[0].population.slice(0,6).map((o:any,i:number)=>({ ...o, genes:{...o.genes,fur:[values[i],values[i]]} })); w.history[0].stats=m.stats(w.history[0].population); w.nextId=7; if (!m.restore(w)) throw new Error('Invalid boundary fixture'); return w;
  });
  await harness.mount(page, { evoLab: { view:'livingIsland',island:world,islandStudy:{seed:42,introDismissed:true,lens:'fur'} } });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width='100%'; document.body.style.padding='0'; });
  await expect(page.locator('[data-variation-bin] strong')).toHaveText(['1','1','1','1','2']);
  await page.locator('[data-variation-bin="4"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.ei-variation-detail')).toContainText('2 / 6 · 33.3%');
  await expect(page.locator('.ei-variation-detail')).toContainText('Advance once to compare');
  await page.getByRole('button', { name:'Meet the next match',exact:true }).click(); await expect(page.locator('#ei-organism')).toHaveValue('5');
  await page.getByRole('button', { name:'Meet the next match',exact:true }).click(); await expect(page.locator('#ei-organism')).toHaveValue('6');
  await page.locator('[data-variation-bin="0"]').click(); await page.getByRole('button',{name:'Meet the next match',exact:true}).click();
  await expect(page.locator('#ei-organism')).toHaveValue('1'); await expect(page.locator('.ei-name-chip')).toContainText('0.0/100');
  await page.getByRole('button',{name:'Find this range on the island',exact:true}).click();
  await expect(page.locator('.ei-stage')).toBeFocused();
  const placement=await page.evaluate(()=>({stageTop:document.querySelector('.ei-stage')!.getBoundingClientRect().top,barBottom:document.querySelector('.ei-commandbar')!.getBoundingClientRect().bottom}));
  expect(placement.stageTop).toBeGreaterThanOrEqual(placement.barBottom-1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await page.locator('.ei-variation').screenshot({path:report+'/variation-explorer-phone.png'});
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-variation',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  await page.getByRole('button',{name:'Clear spotlight',exact:true}).click(); await expect(page.locator('[data-variation-bin="0"]')).toBeFocused();
  await page.selectOption('#ei-lens','natural'); await expect(page.locator('.ei-variation')).toHaveCount(0); await expect(page.locator('[data-spotlight-count]')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(world);
});

test('variation explorer without WebGL follows a watched extinction with no invented percentage', async ({ page }) => {
  await page.setViewportSize({width:1440,height:1100});
  await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;for(let seed=1;seed<50;seed++){const world=m.create(seed);world.history[0].population=world.history[0].population.slice(0,2);world.history[0].stats=m.stats(world.history[0].population);world.nextId=3;const next=m.step(world);if(next.history[1].survivors.length===1){const survivor=world.history[0].population.find((o:any)=>o.id===next.history[1].survivors[0]);return {world,next,bin:Math.min(4,Math.floor(m.value(survivor,'fur')*5))};}}});
  expect(fixture).toBeTruthy();
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture!.world,islandStudy:{seed:fixture!.world.seed,introDismissed:true,lens:'fur'}}},undefined,{expectCanvas:false});
  await page.locator('[data-variation-bin="'+fixture!.bin+'"]').click();
  await page.getByRole('button',{name:'Watch a generation',exact:true}).click();
  await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase','parents');
  await expect(page.locator('.ei-map-creature')).toHaveCount(2);
  await page.locator('[data-range-phase="survivors"]').click();
  await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase','survivors');
  await expect(page.locator('.ei-map-creature')).toHaveCount(1); await expect(page.locator('.ei-map-creature[data-spotlight=true]')).toHaveCount(1);
  await expect(page.locator('[data-range-phase="survivors"]')).toContainText('100.0%');
  await page.locator('[data-range-phase="offspring"]').click();
  await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase','offspring');
  await expect(page.locator('.ei-map-creature')).toHaveCount(0);
  await expect(page.locator('[data-range-phase="offspring"] strong')).toHaveText('—');
  await expect(page.locator('[data-range-phase="offspring"]')).toHaveAttribute('data-range-total','0');
  await expect(page.locator('.ei-variation-detail')).toContainText('No organisms fall in this range');
  await expect(page.getByRole('button',{name:'Meet the next match',exact:true})).toBeDisabled();
  await page.locator('[data-range-phase="parents"]').click(); await expect(page.locator('.ei-map-creature')).toHaveCount(2);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture!.next);
});

test('life story replays an individual across a climate shift and follows any real offspring without rerolling', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  const fixture = await page.evaluate(() => {
    const w = window as any, m = w.StemLab.evoIslandModel; let world = m.create(2026);
    for (let i = 0; i < 6; i++) world = m.step(world);
    world.habitat = 'snow'; world.selection = false;
    const lives = world.history[4].population.map((o: any) => w.StemLab.evoIslandStudy.lineage(world, o.id));
    const life = lives.find((l: any) => l.children.length > 4);
    return { world, life, birthName: m.habitats[life.birthHabitat].name, roundName: m.habitats[life.round.habitat].name };
  });
  expect(fixture.life).toBeTruthy();
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: fixture.world, islandStudy: { seed: 2026, introDismissed: true, selectedId: fixture.life.organism.id } } });
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  const contexts = (await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id); expect(contexts).toHaveLength(1);
  await page.getByRole('button', { name: 'Follow this life', exact: false }).click();
  const life = page.getByRole('region', { name: 'Life story', exact: true });
  await expect(life).toBeFocused(); await expect(life).toHaveAttribute('data-life-id', String(fixture.life.organism.id));
  await expect(life.locator('[data-life-step="birth"]')).toContainText(fixture.birthName);
  await expect(life.locator('[data-life-step="survival"]')).toContainText(fixture.roundName);
  await expect(life).toContainText('The habitat changed after this organism was born');
  await expect(life.locator('[data-life-chance]')).toHaveText((fixture.life.round.chance * 100).toFixed(1) + '%');
  await expect(page.locator('#ei-life-child option')).toHaveCount(fixture.life.children.length);
  for (const chapter of ['birth', 'parents', 'survivors', 'offspring']) {
    await life.locator('[data-life-visit="' + chapter + '"]').click();
    await expect(page.locator('.ei-stage')).toBeFocused();
    await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', chapter === 'birth' ? '4' : '5');
    await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', chapter === 'birth' ? 'offspring' : chapter);
    await expect(page.locator('.ei-stage-label').first()).toContainText(chapter === 'birth' ? fixture.birthName : fixture.roundName);
    if (chapter === 'survivors') await expect(page.locator('.ei-life-context')).toContainText('Still here among the recorded survivors');
    if (chapter === 'offspring') await expect(page.locator('.ei-life-context')).toContainText('viewing the entire offspring cohort');
    expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(fixture.world);
    const placement = await page.evaluate(() => ({ stageTop: document.querySelector('.ei-stage')!.getBoundingClientRect().top, barBottom: document.querySelector('.ei-commandbar')!.getBoundingClientRect().bottom }));
    expect(placement.stageTop).toBeGreaterThanOrEqual(placement.barBottom - 1);
    const messageBounds = await page.evaluate(() => ({ top: document.querySelector('.ei-life-context')!.getBoundingClientRect().top, sceneBottom: document.querySelector('.ei-stage-wrap')!.getBoundingClientRect().bottom }));
    expect(messageBounds.top).toBeGreaterThanOrEqual(messageBounds.sceneBottom - 1);
    if (chapter === 'survivors') await page.locator('.ei-stage').screenshot({ path: report + '/life-story-survivors.png', style: '.ei-commandbar{position:static!important}' });
    await page.getByRole('button', { name: 'Back to life story', exact: true }).click(); await expect(life).toBeFocused();
  }
  await life.screenshot({ path: report + '/life-story-desktop.png', style: '.ei-desk,.ei-desk-body{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar,.ei-desk-tabs{position:static!important}' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-life', { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id:v.id,nodes:v.nodes.map((n:any)=>n.target) }))))).toEqual([]);
  const child = fixture.life.children[fixture.life.children.length - 1];
  await page.selectOption('#ei-life-child', String(child.id));
  await page.getByRole('button', { name: 'Follow this offspring', exact: true }).click();
  await expect(life).toHaveAttribute('data-life-id', String(child.id)); await expect(life).toBeFocused();
  await expect(page.locator('.ei-life-context')).toHaveCount(0);
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '5');
  expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id)).toEqual(contexts);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  await page.getByRole('button', { name: 'Follow this life', exact: false }).click();
  await expect(life).toHaveAttribute('data-life-id', String(child.id)); await expect(page.locator('.ei-life-context')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('life story on a phone keeps an unwritten fate unknown and updates after one watched generation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  const world = await page.evaluate(() => (window as any).StemLab.evoIslandModel.create(2026));
  await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: 2026, selectedId: 1, introDismissed: true } } });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width='100%'; document.body.style.padding='0'; });
  await page.getByRole('button', { name: 'Follow this life', exact: false }).focus(); await page.keyboard.press('Enter');
  const life = page.locator('.ei-life'); await expect(life).toBeFocused();
  await expect(life).toHaveAttribute('data-life-outcome', 'pending'); await expect(life).toContainText('Unrecorded offspring are unknown, not zero.');
  await expect(life.locator('[data-life-chance]')).toHaveCount(0); await expect(life.locator('[data-life-children]')).toHaveCount(0);
  await page.locator('[data-life-visit="birth"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.ei-stage')).toBeFocused(); await expect(page.locator('.ei-life-context')).toContainText('birth generation');
  const messageBounds = await page.evaluate(() => ({ top: document.querySelector('.ei-life-context')!.getBoundingClientRect().top, sceneBottom: document.querySelector('.ei-stage-wrap')!.getBoundingClientRect().bottom }));
  expect(messageBounds.top).toBeGreaterThanOrEqual(messageBounds.sceneBottom - 1);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
  const next = await page.evaluate(() => { const w = window as any; return w.StemLab.evoIslandModel.step(w.__toolData.evoLab.island); });
  await page.getByRole('button', { name: 'Watch a generation', exact: true }).click();
  await expect(page.locator('.ei-life-context')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reveal survivors', exact: false }).click();
  await page.getByRole('button', { name: 'Meet the offspring', exact: false }).click();
  await page.getByRole('button', { name: 'Finish walkthrough', exact: true }).click();
  await page.getByRole('tab', { name: 'Families', exact: true }).click();
  const observed = await page.evaluate(() => { const w = window as any; return w.StemLab.evoIslandStudy.lineage(w.__toolData.evoLab.island, 1); });
  await expect(life).toHaveAttribute('data-life-outcome', observed.outcome);
  await expect(life.locator('[data-life-children]')).toHaveText(observed.children.length + ' direct offspring');
  await life.screenshot({ path: report + '/life-story-phone.png', style: '.ei-commandbar,.ei-desk-tabs{position:static!important}' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (window as any).axe.run('.ei-life', { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id:v.id,nodes:v.nodes.map((n:any)=>n.target) }))))).toEqual([]);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(next);
});

test('life story without WebGL separates a lone survivor from the organism that died', async ({ page }) => {
  await page.setViewportSize({ width:1440,height:1100 });
  await page.addInitScript(() => { const get=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any; });
  await harness.mount(page, { evoLab:{view:'livingIsland'} }, undefined, {expectCanvas:false});
  const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;for(let seed=1;seed<50;seed++){const w=m.create(seed);w.history[0].population=w.history[0].population.slice(0,2);w.history[0].stats=m.stats(w.history[0].population);w.nextId=3;const world=m.step(w);if(world.history[1].survivors.length===1)return {world,id:world.history[1].survivors[0],other:world.history[0].population.find((o:any)=>!world.history[1].survivors.includes(o.id)).id};}});
  expect(fixture).toBeTruthy();
  await harness.mount(page, {evoLab:{view:'livingIsland',island:fixture!.world,islandStudy:{seed:fixture!.world.seed,selectedId:fixture!.id,introDismissed:true}}}, undefined, {expectCanvas:false});
  await page.getByRole('button',{name:'Follow this life',exact:false}).click();
  const life=page.locator('.ei-life'); await expect(life).toHaveAttribute('data-life-outcome','no-offspring');
  await expect(life).toContainText('Fewer than two residents survived'); await expect(life.locator('[data-life-children]')).toHaveText('0 direct offspring');
  await page.locator('[data-life-visit="survivors"]').click(); await expect(page.locator('.ei-map-creature')).toHaveCount(1); await expect(page.locator('.ei-life-context')).toContainText('Still here');
  await page.getByRole('button',{name:'Back to life story',exact:true}).click();
  await page.locator('[data-life-visit="offspring"]').click(); await expect(page.locator('.ei-map-creature')).toHaveCount(0); await expect(page.locator('.ei-life-context')).toContainText('0 direct offspring');
  await page.getByRole('button',{name:'Back to life story',exact:true}).click(); await page.locator('[data-life-visit="birth"]').click();
  await page.getByRole('tab',{name:'Explore',exact:true}).click(); await page.selectOption('#ei-organism',String(fixture!.other));
  await expect(page.locator('.ei-life-context')).toHaveCount(0); await page.getByRole('button',{name:'Follow this life',exact:false}).click();
  await expect(life).toHaveAttribute('data-life-outcome','not-survived'); await expect(life).toContainText('did not survive to reproduce');
  await page.locator('[data-life-visit="parents"]').click(); await expect(page.locator('.ei-map-creature')).toHaveCount(2);
  await page.getByRole('button',{name:'Back to life story',exact:true}).click(); await page.locator('[data-life-visit="survivors"]').click();
  await expect(page.locator('.ei-map-creature')).toHaveCount(1); await expect(page.locator('.ei-life-context')).toContainText('Absent from this survivor group');
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture!.world);
});

test('family resemblance compares real parents and offspring and explores allele pairings without creating organisms', async ({ page }) => {
  test.setTimeout(180_000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1100});
  await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const fixture=await page.evaluate(()=>{
    const w=window as any,m=w.StemLab.evoIslandModel,world=m.step({...m.create(2026),mutation:0.2});
    const child=world.history[1].population.find((o:any)=>o.inheritance.fur.some((e:any)=>e.delta!==null));
    const family=w.StemLab.evoIslandStudy.lineage(world,child.parents[0]);return {world,child,family};
  });
  expect(fixture.family.children.length).toBeGreaterThan(1);
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,selectedId:fixture.family.organism.id,introDismissed:true}}});
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene','ready');
  const contexts=(await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id);expect(contexts).toHaveLength(1);
  await page.getByRole('button',{name:'Follow this life',exact:false}).click();
  await page.selectOption('#ei-life-child',String(fixture.child.id));
  await page.getByText('Compare this offspring with both parents',{exact:true}).click();
  const comparison=page.locator('.ei-resemblance');await expect(comparison).toHaveAttribute('data-resemblance-child',String(fixture.child.id));
  const family=await page.evaluate((id:number)=>{const w=window as any;return w.StemLab.evoIslandStudy.lineage(w.__toolData.evoLab.island,id);},fixture.child.id);
  const members=[...family.parents,family.organism];
  await expect(comparison.locator('[data-resemblance-member]')).toHaveCount(3);
  expect(await comparison.locator('[data-resemblance-member]').evaluateAll(elements=>elements.map(e=>Number(e.getAttribute('data-resemblance-member'))))).toEqual(members.map((o:any)=>o.id));
  await page.getByText('Try the four allele pairings',{exact:true}).click();
  for(const trait of ['fur','shade','legs']) {
    await page.selectOption('#ei-resemblance-trait',trait);await expect(comparison.locator('[data-pairing-value]')).toHaveCount(0);
    const d=await page.evaluate(({id,trait})=>{const w=window as any;return w.StemLab.evoIslandStudy.resemblance(w.StemLab.evoIslandStudy.lineage(w.__toolData.evoLab.island,id),trait);},{id:fixture.child.id,trait});
    await expect(comparison.locator('[data-resemblance-value]')).toHaveText(d.values.map((v:number)=>(v*100).toFixed(2)));
    await expect(comparison.locator('[data-resemblance-position]')).toHaveAttribute('data-resemblance-position',d.position);
    await expect(comparison.locator('[data-recorded-pair=true]')).toHaveCount(1);
    await expect(comparison.locator('[data-recorded-pair=true]')).toHaveAttribute('data-allele-pair',String(d.actual));
    for(let pair=0;pair<4;pair++) {
      await comparison.locator('[data-allele-pair="'+pair+'"]').click();
      await expect(comparison.locator('[data-allele-pair="'+pair+'"]')).toHaveAttribute('aria-pressed','true');
      const p=d.pairings[pair];await expect(comparison.locator('[data-pairing-value]')).toHaveText('('+(p.alleles[0]*100).toFixed(2)+' + '+(p.alleles[1]*100).toFixed(2)+') ÷ 2 ≈ '+(p.value*100).toFixed(2));
      await expect(comparison.locator('[data-resemblance-value="2"]')).toHaveText((d.values[2]*100).toFixed(2));
    }
    if(trait==='fur') await expect(comparison.locator('.ei-resemblance-record')).toContainText(d.mutationCount+' of the two inherited copies mutated');
    expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  }
  const nextChild=fixture.family.children.find((o:any)=>o.id!==fixture.child.id);
  await page.selectOption('#ei-life-child',String(nextChild.id));
  await expect(comparison).toHaveAttribute('data-resemblance-child',String(nextChild.id));
  await expect(page.locator('#ei-resemblance-trait')).toHaveValue('legs');await expect(comparison.locator('[data-pairing-value]')).toHaveCount(0);
  await expect(comparison.locator('[data-allele-pair][aria-pressed=true]')).toHaveCount(0);
  await page.selectOption('#ei-life-child',String(fixture.child.id));
  await expect(comparison.locator('[data-pairing-value]')).toHaveCount(0);
  await page.selectOption('#ei-resemblance-trait','fur');
  await comparison.locator('[data-allele-pair="0"]').click();
  // Start the real timer, then inspect within the page so automation scrolling
  // and host scheduling cannot legitimately advance several rounds beforehand.
  await page.getByRole('button',{name:'Play evolution',exact:false}).evaluate(async button=>{
    (button as HTMLButtonElement).click();
    await new Promise(resolve=>setTimeout(resolve,80));
    (document.querySelector('.ei-resemblance [data-allele-pair="1"]') as HTMLButtonElement).click();
  });
  await expect(page.getByRole('button',{name:'Play evolution',exact:false})).toBeVisible();
  await page.waitForTimeout(2000);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  await page.setViewportSize({width:1440,height:2200});
  await comparison.screenshot({path:report+'/family-resemblance-desktop.png',style:'.ei-desk,.ei-desk-body{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar,.ei-desk-tabs{position:static!important}'});
  await page.setViewportSize({width:1440,height:1100});
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-resemblance',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  expect((await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id)).toEqual(contexts);
  await page.getByRole('button',{name:'Follow this offspring',exact:true}).click();
  await expect(page.locator('.ei-life')).toHaveAttribute('data-life-id',String(fixture.child.id));await expect(page.locator('.ei-life')).toBeFocused();
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);expect(errors).toEqual([]);
});

test('family resemblance on a phone preserves unknown legacy provenance and supports keyboard exploration', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const fixture=await page.evaluate(()=>{
    const w=window as any,m=w.StemLab.evoIslandModel,world=m.step(m.create(2026));
    world.history.forEach((f:any)=>f.population.forEach((o:any)=>delete o.inheritance));
    if(!m.restore(world))throw new Error('Invalid legacy fixture');
    const child=world.history[1].population[0],names:any={};child.parents.concat([child.id]).forEach((id:number)=>names[id]='WWWWWWWWWWWWWWWWWWWWWWWW');return {world,child,names};
  });
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,selectedId:fixture.child.parents[0],names:fixture.names,introDismissed:true}}});
  await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';document.body.style.padding='0';});
  await page.getByRole('button',{name:'Follow this life',exact:false}).click();await page.selectOption('#ei-life-child',String(fixture.child.id));
  const summary=page.getByText('Compare this offspring with both parents',{exact:true});await summary.focus();await page.keyboard.press('Enter');
  const comparison=page.locator('.ei-resemblance');await expect(comparison).toBeVisible();
  await page.selectOption('#ei-resemblance-trait','shade');
  await page.getByText('Try the four allele pairings',{exact:true}).focus();await page.keyboard.press('Enter');
  await expect(comparison.locator('[data-recorded-pair=true]')).toHaveCount(0);await expect(comparison.locator('.ei-resemblance-record')).toHaveCount(0);
  await expect(comparison).toContainText('which one occurred and whether mutations happened are unknown');
  await comparison.locator('[data-allele-pair="3"]').focus();await page.keyboard.press('Space');await expect(comparison.locator('[data-pairing-value]')).toHaveAttribute('data-pairing-value','3');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const bottoms=await comparison.locator('.ei-resemblance-family .ei-meter').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().bottom));expect(Math.max(...bottoms)-Math.min(...bottoms)).toBeLessThan(1);
  await comparison.screenshot({path:report+'/family-resemblance-phone.png',style:'.ei-commandbar,.ei-desk-tabs{position:static!important}'});
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-resemblance',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
});

test('family resemblance without WebGL explains a zero-valued offspring beyond both parents without mutation', async ({ page }) => {
  await page.setViewportSize({width:1440,height:1100});
  await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  const fixture=await page.evaluate(()=>{
    const m=(window as any).StemLab.evoIslandModel;
    for(let seed=1;seed<100;seed++) {
      const w=m.create(seed);w.history[0].population=w.history[0].population.slice(0,2).map((o:any)=>({...o,genes:{shade:[0,1],fur:[0,1],legs:[0,1]}}));w.history[0].stats=m.stats(w.history[0].population);w.nextId=3;w.mutation=0;w.selection=false;
      const world=m.step(w),child=world.history[1].population.find((o:any)=>m.value(o,'fur')===0);
      if(child){if(!m.restore(world))throw new Error('Invalid zero-value fixture');return {world,child};}
    }
  });expect(fixture).toBeTruthy();
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture!.world,islandStudy:{seed:fixture!.world.seed,selectedId:fixture!.child.parents[0],introDismissed:true}}},undefined,{expectCanvas:false});
  await page.getByRole('button',{name:'Follow this life',exact:false}).click();await page.selectOption('#ei-life-child',String(fixture!.child.id));
  await page.getByText('Compare this offspring with both parents',{exact:true}).click();
  const comparison=page.locator('.ei-resemblance');await expect(comparison.locator('[data-resemblance-value]')).toHaveText(['50.00','50.00','0.00']);
  await expect(comparison.locator('[data-resemblance-position]')).toHaveAttribute('data-resemblance-position','below');
  await page.getByText('Try the four allele pairings',{exact:true}).click();
  await expect(comparison.locator('[data-allele-pair] strong')).toHaveText(['0.00','50.00','50.00','100.00']);
  await expect(comparison).toContainText('Neither inherited copy mutated for this trait');
  await expect(comparison.locator('[data-recorded-pair=true]')).toHaveAttribute('data-allele-pair','0');
  await comparison.locator('[data-allele-pair="3"]').click();
  await expect(comparison.locator('[data-pairing-value]')).toHaveText('(100.00 + 100.00) ÷ 2 ≈ 100.00');
  await expect(comparison.locator('[data-resemblance-value="2"]')).toHaveText('0.00');
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture!.world);
});

test('birth comparison opens for a newborn and visits either real parent without losing the way back', async ({ page }) => {
  test.setTimeout(180_000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1100});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;let world=m.create(2026);for(let i=0;i<3;i++)world=m.step(world);world.habitat='snow';world.selection=false;const child=world.history[3].population[0];return {world,child};});
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,selectedId:fixture.child.id,trackedId:1,introDismissed:true}}});
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene','ready');
  const contexts=(await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id);expect(contexts).toHaveLength(1);
  await page.locator('.ei-birth-shortcut').click();
  const birth=page.locator('.ei-birth-resemblance'),life=page.locator('.ei-life');
  await expect(birth).toHaveAttribute('open','');await expect(birth.locator('> summary')).toBeFocused();
  await expect(life).toHaveAttribute('data-life-outcome','pending');await expect(life.locator('[data-life-children]')).toHaveCount(0);
  expect(await birth.locator('[data-resemblance-member]').evaluateAll(es=>es.map(e=>Number(e.getAttribute('data-resemblance-member'))))).toEqual([...fixture.child.parents,fixture.child.id]);
  const bounds=await birth.locator('> summary').evaluate(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,bodyTop:el.closest('.ei-desk-body')!.getBoundingClientRect().top,bodyBottom:el.closest('.ei-desk-body')!.getBoundingClientRect().bottom}));
  expect(bounds.top).toBeGreaterThanOrEqual(bounds.bodyTop-1);expect(bounds.bottom).toBeLessThanOrEqual(bounds.bodyBottom+1);
  await page.selectOption('#ei-birth-resemblance-trait','legs');await birth.getByText('Try the four allele pairings',{exact:true}).click();await birth.locator('[data-allele-pair="2"]').click();
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  await birth.locator('[data-visit-parent="'+fixture.child.parents[0]+'"]').click();
  await expect(life).toHaveAttribute('data-life-id',String(fixture.child.parents[0]));await expect(life).toBeFocused();
  await expect(page.locator('.ei-parent-return')).toContainText('#'+fixture.child.id);
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation','2');
  // This middle-generation organism has both its own parents and offspring.
  await birth.locator('> summary').click();await page.selectOption('#ei-birth-resemblance-trait','shade');
  const outgoing=life.locator('.ei-resemblance-details:not(.ei-birth-resemblance)');await outgoing.locator('> summary').click();
  await page.selectOption('#ei-resemblance-trait','legs');await expect(page.locator('#ei-birth-resemblance-trait')).toHaveValue('shade');
  const ids=await life.locator('[id]').evaluateAll(es=>es.map(e=>e.id));expect(new Set(ids).size).toBe(ids.length);
  await expect(birth.getByLabel('Compare an inherited trait',{exact:true})).toHaveValue('shade');await expect(outgoing.getByLabel('Compare an inherited trait',{exact:true})).toHaveValue('legs');
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-life',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  await page.getByRole('button',{name:'Back to this offspring',exact:true}).click();
  await expect(life).toHaveAttribute('data-life-id',String(fixture.child.id));await expect(birth.locator('> summary')).toBeFocused();await expect(birth).toHaveAttribute('open','');
  await expect(page.locator('.ei-parent-return')).toHaveCount(0);
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation','3');
  const habitatName=await page.evaluate((key:string)=>(window as any).StemLab.evoIslandModel.habitats[key].name,fixture.world.history[3].habitat);
  await expect(page.locator('.ei-stage-label').first()).toContainText(habitatName);await expect(page.locator('[data-island-phase]')).toContainText('recorded offspring');
  await page.setViewportSize({width:1440,height:2200});await birth.screenshot({path:report+'/birth-comparison-desktop.png',style:'.ei-desk,.ei-desk-body{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar,.ei-desk-tabs{position:static!important}'});await page.setViewportSize({width:1440,height:1100});
  await birth.locator('[data-visit-parent="'+fixture.child.parents[1]+'"]').click();await expect(life).toHaveAttribute('data-life-id',String(fixture.child.parents[1]));
  await page.getByRole('tab',{name:'Explore',exact:true}).click();const other=fixture.world.history[2].population.find((o:any)=>o.id!==fixture.child.parents[1]);await page.selectOption('#ei-organism',String(other.id));
  await expect(page.locator('.ei-parent-return')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.islandStudy.trackedId)).toBe(1);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  expect((await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id)).toEqual(contexts);expect(errors).toEqual([]);
});

test('birth comparison on a phone supports keyboard parent round trips and honest legacy records', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel,world=m.step(m.create(2026));world.history.forEach((f:any)=>f.population.forEach((o:any)=>delete o.inheritance));if(!m.restore(world))throw new Error('Invalid legacy fixture');const child=world.history[1].population[0];return {world,child};});
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,selectedId:fixture.child.id,introDismissed:true}}});
  await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';document.body.style.padding='0';});
  await page.locator('.ei-birth-shortcut').focus();await page.keyboard.press('Enter');const birth=page.locator('.ei-birth-resemblance');
  await expect(birth.locator('> summary')).toBeFocused();
  const bounds=await birth.locator('> summary').evaluate(el=>({top:el.getBoundingClientRect().top,bar:document.querySelector('.ei-commandbar')!.getBoundingClientRect().bottom,tabs:document.querySelector('.ei-desk-tabs')!.getBoundingClientRect().bottom}));
  expect(bounds.top).toBeGreaterThanOrEqual(Math.max(bounds.bar,bounds.tabs)-1);
  await birth.getByText('Try the four allele pairings',{exact:true}).focus();await page.keyboard.press('Enter');
  await expect(birth).toContainText('which one occurred and whether mutations happened are unknown');await expect(birth.locator('[data-recorded-pair=true]')).toHaveCount(0);
  await birth.locator('[data-visit-parent]').first().focus();await page.keyboard.press('Enter');
  await expect(page.locator('.ei-life')).toBeFocused();await expect(page.locator('.ei-birth-resemblance')).toHaveCount(0);
  await expect(page.locator('.ei-life')).toContainText('No earlier parents are recorded.');await expect(page.locator('.ei-parent-return')).toContainText('#'+fixture.child.id);
  await page.getByRole('button',{name:'Back to this offspring',exact:true}).focus();await page.keyboard.press('Enter');await expect(birth.locator('> summary')).toBeFocused();
  await birth.getByText('Try the four allele pairings',{exact:true}).click();await birth.locator('[data-allele-pair="0"]').focus();await page.keyboard.press('Space');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await birth.screenshot({path:report+'/birth-comparison-phone.png',style:'.ei-commandbar,.ei-desk-tabs{position:static!important}'});
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-life',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  await page.getByRole('button',{name:'All EvoLab activities',exact:false}).click();await page.getByRole('button',{name:'Explore Living Island',exact:false}).click();
  await expect(page.locator('#ei-organism')).toHaveValue(String(fixture.child.id));await expect(page.locator('.ei-parent-return')).toHaveCount(0);
  await page.locator('.ei-birth-shortcut').click();await expect(birth).toHaveAttribute('open','');expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
});

test('birth comparison without WebGL pauses playback and returns from a parent on the habitat map', async ({ page }) => {
  await page.setViewportSize({width:1440,height:1100});await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel,world=m.step(m.step(m.create(2026)));return {world,child:world.history[2].population[0]};});
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,selectedId:fixture.child.id,introDismissed:true}}},undefined,{expectCanvas:false});
  await page.getByRole('button',{name:'Play evolution',exact:false}).evaluate(async button=>{(button as HTMLButtonElement).click();await new Promise(resolve=>setTimeout(resolve,80));(document.querySelector('.ei-birth-shortcut') as HTMLButtonElement).click();});
  await expect(page.getByRole('button',{name:'Play evolution',exact:false})).toBeVisible();await page.waitForTimeout(2000);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  const birth=page.locator('.ei-birth-resemblance');await birth.locator('[data-visit-parent]').first().click();
  await page.locator('[data-life-visit="birth"]').click();await expect(page.locator('.ei-stage')).toBeFocused();await expect(page.locator('.ei-parent-return')).toBeAttached();
  const parentOnMap=page.locator('.ei-map-creature').filter({hasText:new RegExp('^'+fixture.child.parents[0]+'$')});
  await expect(parentOnMap).toHaveCount(1);await parentOnMap.click();
  await page.getByRole('button',{name:'Follow this life',exact:false}).click();await expect(page.locator('.ei-parent-return')).toBeVisible();
  await page.getByRole('button',{name:'Back to this offspring',exact:true}).click();await expect(birth.locator('> summary')).toBeFocused();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation','2');await expect(page.locator('.ei-parent-return')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
});


test('sibling explorer compares real full and half siblings with synchronized traits and an unchanged island', async ({ page }) => {
  test.setTimeout(180_000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1100});await page.emulateMedia({reducedMotion:'reduce'});
  await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const fixture=await page.evaluate(()=>{
    const m=(window as any).StemLab.evoIslandModel;let world=m.create(2026);
    for(let i=0;i<8;i++) {
      world=m.step(world);const population=world.history[world.generation].population;
      for(const child of population) {
        const shared=(other:any)=>other.parents.filter((id:number)=>child.parents.includes(id)).length;
        const full=population.filter((other:any)=>other.id!==child.id&&shared(other)===2),half=population.filter((other:any)=>other.id!==child.id&&shared(other)===1);
        if(full.length&&half.length>1)return {world,child,full,half};
      }
    }
    throw new Error('No sibling fixture found');
  });
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,selectedId:fixture.child.id,trackedId:1,introDismissed:true}}});
  const contexts=(await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id);expect(contexts).toHaveLength(1);
  await page.locator('.ei-birth-shortcut').click();const birth=page.locator('.ei-birth-resemblance'),siblings=birth.locator('.ei-siblings');
  await siblings.locator('> summary').click();await expect(siblings.locator('[data-sibling-group=full]')).toHaveAttribute('aria-pressed','true');
  await expect(siblings.locator('[data-sibling-group=full] span')).toHaveText(String(fixture.full.length));
  await expect(siblings.locator('[data-sibling-group=half] span')).toHaveText(String(fixture.half.length));
  expect(await siblings.getByLabel('Sibling to compare',{exact:true}).locator('option').evaluateAll(es=>es.map(e=>Number((e as HTMLOptionElement).value)))).toEqual(fixture.full.map((o:any)=>o.id));
  for(const trait of ['fur','shade','legs']) {
    await siblings.getByLabel('Trait to compare',{exact:true}).selectOption(trait);await expect(birth.getByLabel('Compare an inherited trait',{exact:true})).toHaveValue(trait);
    const values=[fixture.child,fixture.full[0]].map(o=>((o.genes[trait][0]+o.genes[trait][1])*50).toFixed(2));
    await expect(siblings.locator('[data-sibling-value]')).toHaveText(values);
  }
  for(const id of fixture.child.parents)await expect(siblings.locator('.ei-sibling-parents')).toContainText('#'+id);
  await siblings.locator('[data-sibling-group=half]').click();await expect(siblings.getByLabel('Sibling to compare',{exact:true})).toHaveValue(String(fixture.half[0].id));
  await siblings.getByRole('button',{name:'Next sibling',exact:true}).click();await expect(siblings.locator('[data-compared-sibling]')).toHaveAttribute('data-compared-sibling',String(fixture.half[1].id));
  const shared=fixture.child.parents.filter((id:number)=>fixture.half[1].parents.includes(id));expect(shared).toHaveLength(1);
  await expect(siblings.locator('.ei-sibling-parents')).toContainText('#'+shared[0]);
  for(const id of fixture.child.parents.filter((id:number)=>!shared.includes(id)))await expect(siblings.locator('.ei-sibling-parents')).not.toContainText(new RegExp('#'+id+'(?:\\D|$)'));
  await siblings.getByLabel('Sibling to compare',{exact:true}).selectOption(String(fixture.half.at(-1)!.id));await expect(siblings.getByRole('button',{name:'Next sibling',exact:true})).toBeDisabled();
  await siblings.getByLabel('Sibling to compare',{exact:true}).selectOption(String(fixture.half[0].id));await expect(siblings.getByRole('button',{name:'Previous sibling',exact:true})).toBeDisabled();
  await birth.getByLabel('Compare an inherited trait',{exact:true}).selectOption('shade');await expect(siblings.getByLabel('Trait to compare',{exact:true})).toHaveValue('shade');
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.islandStudy.selectedId)).toBe(fixture.child.id);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.islandStudy.trackedId)).toBe(1);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  await page.setViewportSize({width:1440,height:1600});await siblings.screenshot({path:report+'/siblings-desktop.png',style:'.ei-desk,.ei-desk-body{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar,.ei-desk-tabs{position:static!important}'});await page.setViewportSize({width:1440,height:1100});
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-siblings',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  // The same explorer also follows the outgoing offspring selector without stale choices.
  await birth.locator('[data-visit-parent]').first().click();const outgoing=page.locator('.ei-resemblance-details:not(.ei-birth-resemblance)');
  await page.selectOption('#ei-life-child',String(fixture.child.id));await outgoing.locator('> summary').click();
  const outgoingSiblings=outgoing.locator('.ei-siblings');await outgoingSiblings.locator('> summary').click();await outgoingSiblings.locator('[data-sibling-group=half]').click();
  await outgoingSiblings.getByLabel('Sibling to compare',{exact:true}).selectOption(String(fixture.half.at(-1)!.id));
  await page.selectOption('#ei-life-child',String(fixture.full[0].id));await expect(outgoingSiblings).toHaveAttribute('data-siblings-for',String(fixture.full[0].id));
  await page.selectOption('#ei-life-child',String(fixture.child.id));await expect(outgoingSiblings.locator('[data-sibling-group=full]')).toHaveAttribute('aria-pressed','true');
  await expect(outgoingSiblings.getByLabel('Sibling to compare',{exact:true})).toHaveValue(String(fixture.full[0].id));
  expect((await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id)).toEqual(contexts);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);expect(errors).toEqual([]);
});

test('sibling explorer on a phone supports keyboard comparison, empty groups and legacy saves', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const fixture=await page.evaluate(()=>{
    const m=(window as any).StemLab.evoIslandModel,world=m.step(m.create(2026)),population=world.history[1].population;
    const child=population.find((o:any)=>!population.some((other:any)=>other.id!==o.id&&o.parents.every((id:number)=>other.parents.includes(id)))&&population.filter((other:any)=>other.id!==o.id&&o.parents.filter((id:number)=>other.parents.includes(id)).length===1).length>1);
    if(!child)throw new Error('No half-sibling fixture');
    const half=population.filter((o:any)=>o.id!==child.id&&child.parents.filter((id:number)=>o.parents.includes(id)).length===1),names:any={};
    [child,...half].forEach(o=>names[o.id]='WWWWWWWWWWWWWWWWWWWWWWWW');
    world.history.forEach((f:any)=>f.population.forEach((o:any)=>delete o.inheritance));if(!m.restore(world))throw new Error('Invalid legacy fixture');
    return {world,child,half,names};
  });
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,selectedId:fixture.child.id,names:fixture.names,introDismissed:true}}});
  await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';document.body.style.padding='0';});
  await page.locator('.ei-birth-shortcut').focus();await page.keyboard.press('Enter');const birth=page.locator('.ei-birth-resemblance'),siblings=birth.locator('.ei-siblings');
  await siblings.locator('> summary').focus();await page.keyboard.press('Enter');
  await expect(siblings.locator('[data-sibling-group=half]')).toHaveAttribute('aria-pressed','true');await expect(siblings.getByLabel('Sibling to compare',{exact:true})).toHaveValue(String(fixture.half[0].id));
  await siblings.getByRole('button',{name:'Next sibling',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(siblings.getByLabel('Sibling to compare',{exact:true})).toHaveValue(String(fixture.half[1].id));
  await siblings.getByLabel('Trait to compare',{exact:true}).focus();await page.keyboard.press('End');await page.keyboard.press('Enter');
  await expect(siblings.getByLabel('Trait to compare',{exact:true})).toHaveValue('legs');
  await expect(siblings.locator('[data-sibling-value]')).toHaveText([fixture.child,fixture.half[1]].map(o=>((o.genes.legs[0]+o.genes.legs[1])*50).toFixed(2)));
  await siblings.locator('[data-sibling-group=full]').focus();await page.keyboard.press('Space');await expect(siblings.locator('[data-siblings-empty=full]')).toBeVisible();
  await expect(siblings.locator('[data-compared-sibling]')).toHaveCount(0);await expect(siblings.getByLabel('Sibling to compare',{exact:true})).toHaveCount(0);
  await siblings.locator('[data-sibling-group=half]').focus();await page.keyboard.press('Space');
  await expect(siblings.getByLabel('Sibling to compare',{exact:true})).toHaveValue(String(fixture.half[0].id));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const bottoms=await siblings.locator('.ei-meter').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().bottom));expect(Math.max(...bottoms)-Math.min(...bottoms)).toBeLessThan(1);
  await siblings.screenshot({path:report+'/siblings-phone.png',style:'.ei-commandbar,.ei-desk-tabs{position:static!important}'});
  await birth.getByText('Try the four allele pairings',{exact:true}).click();await expect(birth).toContainText('which one occurred and whether mutations happened are unknown');
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-siblings',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  await page.getByRole('button',{name:'All EvoLab activities',exact:false}).click();await page.getByRole('button',{name:'Explore Living Island',exact:false}).click();
  await expect(page.locator('#ei-organism')).toHaveValue(String(fixture.child.id));
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
});

test('sibling explorer without WebGL pauses real playback without changing the chosen resident', async ({ page }) => {
  await page.setViewportSize({width:1440,height:1100});await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});await expect(page.locator('.ei-siblings')).toHaveCount(0);
  const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel,world=m.step(m.create(2026));return {world,child:world.history[1].population[0]};});
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,selectedId:fixture.child.id,introDismissed:true}}},undefined,{expectCanvas:false});
  await page.locator('.ei-birth-shortcut').click();const siblings=page.locator('.ei-birth-resemblance .ei-siblings');await siblings.locator('> summary').click();
  await page.getByRole('button',{name:'Play evolution',exact:false}).evaluate(async button=>{(button as HTMLButtonElement).click();await new Promise(resolve=>setTimeout(resolve,80));(document.querySelector('.ei-birth-resemblance [data-sibling-group=half]') as HTMLButtonElement).click();});
  await expect(page.getByRole('button',{name:'Play evolution',exact:false})).toBeVisible();await page.waitForTimeout(2000);
  await expect(siblings.locator('[data-sibling-group=half]')).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.islandStudy.selectedId)).toBe(fixture.child.id);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  await page.getByRole('tab',{name:'Explore',exact:true}).click();await expect(page.locator('#ei-organism')).toHaveValue(String(fixture.child.id));
  await expect(page.locator('.ei-map-creature').filter({hasText:new RegExp('^'+fixture.child.id+'$')})).toHaveCount(1);
});


test('survival chance lens updates real 3D bars for habitat and selection while preserving genes and buffers', async ({ page }) => {
  test.setTimeout(180_000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1100});await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const world=await page.evaluate(()=>(window as any).StemLab.evoIslandModel.step((window as any).StemLab.evoIslandModel.create(2026)));
  await harness.mount(page,{evoLab:{view:'livingIsland',island:world,islandStudy:{seed:2026,introDismissed:true,selectedId:world.history[1].population[0].id,trackedId:1}}});
  const contexts=(await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id);expect(contexts).toHaveLength(1);
  const readScene=()=>page.evaluate(()=>{
    const w=window as any,scene=w.__glRecorder.records.find((r:any)=>r.scene&&r.canvas.isConnected).scene,bars=scene.getObjectByName('Trait lens values'),matrix=new w.THREE.Matrix4(),scale=new w.THREE.Vector3(),q=new w.THREE.Quaternion(),p=new w.THREE.Vector3(),heights:number[]=[],coats:string[]=[];
    for(let i=0;i<bars.count;i++){bars.getMatrixAt(i,matrix);matrix.decompose(p,q,scale);heights.push(scale.y/1.2);}
    scene.traverse((o:any)=>{if(o.userData.islandResident)o.children[0].traverse((m:any)=>{if(m.isMesh&&m.material.map)coats.push(m.material.color.getHexString());});});
    const buffer=w.__chanceBuffer||(w.__chanceBuffer=bars.instanceMatrix);
    return {heights,coats,geometry:bars.geometry.uuid,sameBuffer:buffer===bars.instanceMatrix};
  });
  await page.selectOption('#ei-lens','fur');await page.locator('[data-variation-bin="2"]').click();const original=await readScene();
  await page.selectOption('#ei-lens','survival');const lens=page.locator('.ei-survival-lens');await expect(lens).toBeVisible();await expect(page.locator('.ei-variation')).toHaveCount(0);
  await lens.getByText('Read every survival chance',{exact:true}).click();
  const verify=async(habitat:string,selection:boolean)=>{
    const expected=await page.evaluate(({world,habitat,selection})=>{const m=(window as any).StemLab.evoIslandModel;return world.history[1].population.map((o:any)=>m.chance(o,m.habitats[habitat],selection));},{world,habitat,selection});
    const scene=await readScene();expect(scene.heights).toHaveLength(expected.length);scene.heights.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],5));
    expect(scene.geometry).toBe(original.geometry);expect(scene.sameBuffer).toBe(true);expect(scene.coats).toEqual(original.coats);
    await expect(lens).toHaveAttribute('data-chance-habitat',habitat);await expect(lens).toHaveAttribute('data-chance-selection',String(selection));
    await expect(lens.locator('[data-survival-chance]')).toHaveText(expected.map((v:number)=>(v*100).toFixed(1)+'%'));
    return expected;
  };
  await verify(world.habitat,true);await expect(lens.locator('[data-chance-outcome]')).toHaveCount(0);
  await page.getByRole('button',{name:'Long winter',exact:false}).click();const winter=await verify('snow',true);
  await lens.getByText('Compare low and high chances',{exact:true}).click();await lens.getByRole('button',{name:'Inspect highest survival chance',exact:true}).click();
  const high=world.history[1].population[winter.indexOf(Math.max(...winter))];await expect(page.locator('#ei-organism')).toHaveValue(String(high.id));await expect(page.locator('.ei-name-chip')).toContainText('Survival chance '+(Math.max(...winter)*100).toFixed(1)+'%');
  await page.getByRole('button',{name:'Creature close-up',exact:true}).click();expect((await readScene()).heights).toHaveLength(1);
  await page.getByRole('button',{name:'Island overview',exact:true}).click();
  await page.getByRole('tab',{name:'Investigate',exact:true}).click();await page.getByText('Experiment settings',{exact:true}).click();await page.getByRole('checkbox',{name:'Traits affect survival',exact:false}).uncheck();
  await verify('snow',false);await expect(lens).toContainText('Every organism has the same modeled chance');await expect(lens.getByText('Compare low and high chances',{exact:true})).toHaveCount(0);
  await page.getByRole('checkbox',{name:'Traits affect survival',exact:false}).check();await verify('snow',true);
  await page.getByRole('tab',{name:'Explore',exact:true}).click();
  await lens.getByText('Read every survival chance',{exact:true}).click();await lens.getByText('Compare low and high chances',{exact:true}).click();
  await page.setViewportSize({width:1440,height:1700});await page.locator('.ei-stage').screenshot({path:report+'/survival-lens-desktop.png',style:'.ei-main,.ei-desk,.ei-desk-body{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar,.ei-desk-tabs{position:static!important}'});await page.setViewportSize({width:1440,height:1100});
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-lenses',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  const final=await page.evaluate(()=>(window as any).__toolData.evoLab.island);expect(final).toEqual({...world,habitat:'snow',living:false});
  expect((await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id)).toEqual(contexts);
  await page.getByRole('button',{name:'All EvoLab activities',exact:false}).click();await page.getByRole('button',{name:'Explore Living Island',exact:false}).click();await expect(page.locator('#ei-lens')).toHaveValue('survival');await expect(page.locator('.ei-survival-lens')).toHaveAttribute('data-chance-habitat','snow');expect(errors).toEqual([]);
});

test('survival chance lens on a phone distinguishes the coming climate from recorded probabilities and outcomes', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;let world=m.create(2026);for(let i=0;i<4;i++)world=m.step(world);return {world,next:m.step(world),plan:m.preview(world)};});
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,introDismissed:true}}});await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';document.body.style.padding='0';});
  await page.locator('#ei-lens').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(page.locator('#ei-lens')).toHaveValue('survival');
  const lens=page.locator('.ei-survival-lens');await expect(lens).toHaveAttribute('data-chance-habitat',fixture.world.habitat);await expect(lens.locator('[data-chance-next-habitat]')).toHaveAttribute('data-chance-next-habitat',fixture.plan.habitat);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  await page.getByRole('button',{name:'Watch a generation',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase','parents');await expect(lens).toHaveAttribute('data-chance-habitat',fixture.plan.habitat);await expect(lens).toHaveAttribute('data-chance-phase','parents');await expect(lens.locator('[data-chance-next-habitat]')).toHaveCount(0);
  await lens.getByText('Read every survival chance',{exact:true}).focus();await page.keyboard.press('Enter');
  const parentChances=await page.evaluate((world:any)=>{const m=(window as any).StemLab.evoIslandModel;return world.history[4].population.map((o:any)=>m.chance(o,m.habitats[world.history[5].habitat],world.history[5].selection));},fixture.next);
  await expect(lens.locator('[data-survival-chance]')).toHaveText(parentChances.map((v:number)=>(v*100).toFixed(1)+'%'));
  const outcomes=await lens.locator('[data-chance-organism]').evaluateAll(rows=>rows.map(row=>({id:Number(row.getAttribute('data-chance-organism')),survived:row.querySelector('[data-chance-outcome]')!.getAttribute('data-chance-outcome')==='true'})));
  expect(outcomes).toEqual(fixture.next.history[4].population.map((o:any)=>({id:o.id,survived:fixture.next.history[5].survivors.includes(o.id)})));
  await page.getByRole('button',{name:'Reveal survivors',exact:false}).focus();await page.keyboard.press('Enter');await expect(lens).toContainText('original probabilities, not 100% certainty');
  await expect(lens.locator('[data-chance-outcome=true]')).toHaveCount(fixture.next.history[5].survivors.length);await expect(lens.locator('[data-chance-outcome=false]')).toHaveCount(0);
  const chances=await lens.locator('[data-survival-chance]').evaluateAll(es=>es.map(e=>Number(e.getAttribute('data-survival-chance'))));expect(chances.every(v=>v<1)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const panelBounds=await lens.evaluate(el=>({right:el.getBoundingClientRect().right,stageRight:el.closest('.ei-stage')!.getBoundingClientRect().right,width:el.getBoundingClientRect().width,scrollWidth:el.scrollWidth}));
  expect(panelBounds.right).toBeLessThanOrEqual(panelBounds.stageRight-1);expect(panelBounds.scrollWidth).toBeLessThanOrEqual(panelBounds.width+1);
  const chanceTable=lens.getByRole('region',{name:'Survival chance table',exact:true});await chanceTable.focus();await page.keyboard.press('ArrowRight');
  await expect.poll(()=>chanceTable.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await expect(chanceTable).toBeFocused();
  await page.waitForTimeout(250);await chanceTable.evaluate(el=>{el.scrollLeft=0;});await lens.getByText('Read every survival chance',{exact:true}).focus();
  await lens.screenshot({path:report+'/survival-lens-phone.png',style:'.ei-commandbar,.ei-desk-tabs{position:static!important}'});
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-lenses',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  await page.getByRole('button',{name:'Meet the offspring',exact:false}).click();await expect(lens).toContainText('what-if estimate');await expect(lens.locator('[data-chance-outcome]')).toHaveCount(0);await expect(lens.getByRole('columnheader',{name:'Recorded outcome',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Finish walkthrough',exact:true}).click();await page.getByRole('button',{name:'Watch generation story',exact:true}).click();await expect(page.locator('.ei-story-chapter')).toBeVisible();await expect(page.locator('.ei-story-readings')).toContainText('Insulation');await page.getByRole('button',{name:'Pause generation story',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);
});

test('survival chance lens without WebGL preserves historical conditions and has no invented probabilities after extinction', async ({ page }) => {
  await page.setViewportSize({width:1440,height:1100});await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;for(let seed=1;seed<50;seed++){const start=m.create(seed);start.history[0].population=start.history[0].population.slice(0,2);start.history[0].stats=m.stats(start.history[0].population);start.nextId=3;const world=m.step(start);if(world.history[1].survivors.length===1){world.habitat='snow';world.selection=false;return {world,probabilities:start.history[0].population.map((o:any)=>m.chance(o,m.habitats.meadow,true))};}}throw new Error('No extinction fixture');});
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:fixture.world.seed,introDismissed:true,lens:'survival'}}},undefined,{expectCanvas:false});
  const lens=page.locator('.ei-survival-lens');await expect(lens).toContainText('no individual survival probabilities to display');await expect(lens.locator('[data-chance-range]')).toHaveCount(0);await expect(page.locator('.ei-map-creature')).toHaveCount(0);
  await page.getByRole('button',{name:'Show parents',exact:true}).click();await expect(lens).toHaveAttribute('data-chance-habitat','meadow');await expect(lens).toHaveAttribute('data-chance-selection','true');
  const names=await page.locator('.ei-map-creature').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));fixture.probabilities.forEach((v:number,i:number)=>expect(names[i]).toContain('Survival chance '+(v*100).toFixed(1)+'%'));
  await page.locator('.ei-map-creature').first().click();await expect(page.locator('#ei-organism')).toHaveValue('1');await expect(page.locator('.ei-name-chip')).toContainText((fixture.probabilities[0]*100).toFixed(1)+'%');
  await page.getByRole('button',{name:'Show survivors',exact:true}).click();await expect(page.locator('.ei-map-creature')).toHaveCount(1);await expect(lens).toContainText('original probabilities, not 100% certainty');
  await page.getByRole('button',{name:'Show offspring',exact:true}).click();await expect(lens).toContainText('no individual survival probabilities to display');
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
});


test('round forecast locks before a climate-boundary round, reveals real evidence and saves a separate journal note', async ({ page }) => {
  test.setTimeout(180_000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1100});await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;let world=m.create(2026);for(let i=0;i<4;i++)world=m.step(world);return {world,next:m.step(world),plan:(window as any).StemLab.evoIslandObservation.forecast(world)};});
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,introDismissed:true,trackedId:1,lens:'survival'},evoProgress:{notes:{livingIsland:{text:'My own explanation.',at:'2026-09-29T12:00:00Z'},livingIslandData:{text:'My earlier evidence.',at:'2026-09-29T12:00:00Z'}}}}});
  const contexts=(await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id);expect(contexts).toHaveLength(1);
  await page.getByRole('button',{name:'Predict this round',exact:true}).click();const draft=page.locator('.ei-round-forecast');await expect(draft).toBeFocused();await expect(draft).toHaveAttribute('data-forecast-generation','5');
  const habitat=await page.evaluate((key:string)=>(window as any).StemLab.evoIslandModel.habitats[key].name,fixture.plan.habitat);await expect(draft).toContainText(habitat);
  await expect(page.getByRole('button',{name:'Next generation',exact:false})).toBeDisabled();await expect(page.getByRole('button',{name:'Play evolution',exact:false})).toBeDisabled();
  await draft.getByText('Reveal a probability clue',{exact:true}).click();await expect(draft.locator('.ei-forecast-clue')).toContainText(fixture.plan.expected.toFixed(1));
  await page.locator('#ei-forecast-range').fill('0');await expect(page.locator('#ei-forecast-number')).toHaveValue('0');await expect(draft.locator('.ei-forecast-dots circle')).toHaveCount(fixture.plan.count);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-round-forecast',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  await draft.screenshot({path:report+'/forecast-desktop-predict.png',style:'.ei-main{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar{position:static!important}'});
  // A double activation before React rerenders must still record exactly one round.
  await draft.getByRole('button',{name:'Lock forecast & watch',exact:true}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
  const guide=page.locator('.ei-watch-guide'),result=page.locator('.ei-forecast-result');await expect(guide).toBeFocused();await expect(guide).toHaveAttribute('data-watch-phase','parents');await expect(result).toHaveAttribute('data-forecast-guess','0');await expect(result).toHaveAttribute('data-forecast-revealed','false');await expect(result.locator('[data-forecast-actual]')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);
  await guide.getByRole('button',{name:'Reveal survivors',exact:false}).click();await expect(result).toHaveAttribute('data-forecast-revealed','true');await expect(result.locator('[data-forecast-actual]')).toHaveAttribute('data-forecast-actual',String(fixture.next.history[5].survivors.length));await expect(result).toContainText('differed from your forecast');
  await guide.getByRole('button',{name:'Previous stage',exact:true}).click();await expect(result).toHaveAttribute('data-forecast-revealed','true');await expect(page.locator('#ei-forecast-number')).toHaveCount(0);
  await result.getByRole('button',{name:'Save forecast to journal',exact:true}).click();
  const notes=await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);expect(notes.livingIsland.text).toBe('My own explanation.');expect(notes.livingIslandData.text).toBe('My earlier evidence.');expect(notes.livingIslandForecast.text).toContain('Forecast: 0 / '+fixture.plan.count);expect(notes.livingIslandForecast.text).toContain('Recorded survivors: '+fixture.next.history[5].survivors.length);expect(notes.livingIslandForecast.text).toContain('Habitat: '+fixture.plan.habitat);expect(notes.livingIslandForecast.text.length).toBeLessThan(2000);
  await guide.getByRole('button',{name:'Reveal survivors',exact:false}).click();await guide.screenshot({path:report+'/forecast-desktop-result.png',style:'.ei-main{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar{position:static!important}'});
  expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-watch-guide',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  await guide.getByRole('button',{name:'Meet the offspring',exact:false}).click();await guide.getByRole('button',{name:'Finish walkthrough',exact:true}).click();await expect(result).toHaveCount(0);await expect(page.getByRole('button',{name:'Predict this round',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Predict this round',exact:true}).click();await expect(draft).toHaveAttribute('data-forecast-generation','6');await draft.getByRole('button',{name:'Cancel forecast',exact:true}).click();await expect(page.getByRole('button',{name:'Predict this round',exact:true})).toBeFocused();
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);expect((await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id)).toEqual(contexts);
  await page.getByRole('button',{name:'Field journal',exact:false}).click();const journalEntry=page.getByRole('listitem').filter({has:page.getByText(notes.livingIslandForecast.text,{exact:true})});await expect(journalEntry).toBeVisible();await expect(journalEntry).toContainText('Living Island · round forecast · ');await expect(journalEntry.locator('p')).toHaveText(notes.livingIslandForecast.text);expect(errors).toEqual([]);
});

test('round forecast on a phone handles keyboard estimates, invalid counts and cancellation when conditions change', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const world=await page.evaluate(()=>({...((window as any).StemLab.evoIslandModel.create(2026)),selection:false,living:false,habitat:'drought'}));
  await harness.mount(page,{evoLab:{view:'livingIsland',island:world,islandStudy:{seed:2026,introDismissed:true}}});await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';document.body.style.padding='0';});
  await page.getByRole('button',{name:'Predict this round',exact:true}).focus();await page.keyboard.press('Enter');const draft=page.locator('.ei-round-forecast');await expect(draft).toBeFocused();await expect(draft).toContainText('Equal chances do not guarantee equal outcomes');
  const bounds=await draft.evaluate(el=>({top:el.getBoundingClientRect().top,bar:document.querySelector('.ei-commandbar')!.getBoundingClientRect().bottom,right:el.getBoundingClientRect().right}));expect(bounds.top).toBeGreaterThanOrEqual(bounds.bar-1);expect(bounds.right).toBeLessThanOrEqual(390);
  await page.locator('#ei-forecast-range').focus();await page.keyboard.press('End');await expect(page.locator('#ei-forecast-number')).toHaveValue('36');
  for(const value of ['', '-1', '37', '1.5']){await page.locator('#ei-forecast-number').fill(value);await expect(draft.getByRole('button',{name:'Lock forecast & watch',exact:true})).toBeDisabled();await expect(page.locator('#ei-forecast-number')).toHaveAttribute('aria-invalid','true');}
  await page.locator('#ei-forecast-number').fill('12');await expect(page.locator('#ei-forecast-range')).toHaveValue('12');
  await draft.getByText('Reveal a probability clue',{exact:true}).focus();await page.keyboard.press('Enter');await expect(draft.locator('.ei-forecast-clue')).toContainText((36*.68*.72).toFixed(1));
  // Capture the full open clue at phone width; restore the real phone height for interaction checks.
  await page.setViewportSize({width:390,height:1200});await draft.evaluate(el=>el.scrollIntoView({block:'start'}));await draft.screenshot({path:report+'/forecast-phone-predict.png'});await page.setViewportSize({width:390,height:844});
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-round-forecast',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(world);
  await draft.getByRole('button',{name:'Cancel forecast',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Predict this round',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.getByRole('button',{name:'Long winter',exact:false}).click();await expect(draft).toHaveCount(0);await expect(page.getByRole('button',{name:'Predict this round',exact:true})).toBeEnabled();
  const expected=await page.evaluate(()=>(window as any).StemLab.evoIslandModel.step((window as any).__toolData.evoLab.island));
  await page.getByRole('button',{name:'Predict this round',exact:true}).click();await expect(draft).toContainText('Long winter');await page.locator('#ei-forecast-number').fill('20');await draft.getByRole('button',{name:'Lock forecast & watch',exact:true}).focus();await page.keyboard.press('Enter');
  await page.getByRole('button',{name:'Reveal survivors',exact:false}).focus();await page.keyboard.press('Enter');await expect(page.locator('[data-forecast-actual]')).toHaveAttribute('data-forecast-actual',String(expected.history[1].survivors.length));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.locator('.ei-forecast-result').screenshot({path:report+'/forecast-phone-result.png',style:'.ei-commandbar,.ei-desk-tabs{position:static!important}'});
  expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-watch-guide',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(expected);
});

test('round forecast without WebGL can match a count while extinction still follows the two-parent rule', async ({ page }) => {
  await page.setViewportSize({width:1440,height:1100});await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;for(let seed=1;seed<50;seed++){const world=m.create(seed);world.history[0].population=world.history[0].population.slice(0,2);world.history[0].stats=m.stats(world.history[0].population);world.nextId=3;const next=m.step(world);if(next.history[1].survivors.length===1)return {world,next};}throw new Error('No extinction fixture');});
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:fixture.world.seed,introDismissed:true}}},undefined,{expectCanvas:false});
  await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.locator('#ei-forecast-number').fill('1');await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();
  await page.getByRole('button',{name:'Show offspring',exact:true}).click();await expect(page.locator('.ei-forecast-result')).toHaveAttribute('data-forecast-revealed','true');await expect(page.locator('.ei-forecast-result')).toContainText('matched this round');await expect(page.locator('[data-forecast-actual]')).toHaveAttribute('data-forecast-actual','1');await expect(page.locator('.ei-map-creature')).toHaveCount(0);await expect(page.locator('.ei-watch-guide')).toContainText('Fewer than two individuals survived to breed');
  await page.getByRole('button',{name:'Save forecast to journal',exact:true}).click();const note=await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandForecast.text);expect(note).toContain('Recorded survivors: 1 / 2. Offspring: 0.');
  await page.getByRole('button',{name:'Finish walkthrough',exact:true}).click();await expect(page.locator('.ei-stage')).toBeFocused();await expect(page.getByRole('button',{name:'Predict this round',exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);
  await page.getByRole('button',{name:'All EvoLab activities',exact:false}).click();await page.getByRole('button',{name:'Explore Living Island',exact:false}).click();await expect(page.locator('.ei-round-forecast,.ei-forecast-result')).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandForecast.text)).toBe(note);
});


test('chance lab compares isolated survival trials with a recorded climate round and saves separate evidence', async ({ page }) => {
  test.setTimeout(180_000);
  const errors:string[]=[];page.on('pageerror',err=>errors.push(err.message));
  await page.setViewportSize({width:1440,height:1100});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel,t=(window as any).StemLab.evoIslandChanceTrials;let world=m.create(2026);for(let i=0;i<4;i++)world=m.step(world);return {world,next:m.step(world),trials:Array.from({length:20},(_,i)=>t.run(world,i+1))};});
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,introDismissed:true},evoProgress:{notes:{livingIsland:{text:'My explanation.',at:'2026-09-30'},livingIslandData:{text:'Earlier evidence.',at:'2026-09-30'}}}}});
  const contexts=(await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id);
  await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.locator('#ei-forecast-number').fill('25');await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();
  await expect(page.locator('.ei-chance-lab')).toHaveCount(0);
  await page.getByRole('button',{name:'Reveal survivors',exact:false}).click();await page.getByRole('button',{name:'Save forecast to journal',exact:true}).click();
  await page.getByText('Explore chance: repeat this round',{exact:true}).click();const lab=page.locator('.ei-chance-lab');await expect(lab).toHaveAttribute('data-chance-trials','0');
  await expect(lab.locator('svg')).toHaveCount(0);await lab.getByRole('button',{name:'Try one survival trial',exact:true}).click();await lab.getByRole('button',{name:'Try five trials',exact:true}).click();
  await expect(lab).toHaveAttribute('data-chance-trials','6');await expect(lab.locator('[data-inspected-trial]')).toHaveAttribute('data-inspected-trial','6');
  await expect(lab.locator('[data-trial-count]')).toHaveCount(6);
  expect(await lab.locator('[data-trial-count]').evaluateAll(es=>es.map(e=>Number(e.getAttribute('data-trial-count'))))).toEqual(fixture.trials.slice(0,6).map(row=>row.count));
  await page.locator('#ei-chance-trial').selectOption('0');await expect(lab.getByRole('button',{name:'Previous trial',exact:true})).toBeDisabled();
  await expect(lab.locator('[data-inspected-trial]')).toHaveAttribute('data-inspected-trial','1');expect(await lab.locator('.ei-chance-inspected circle').evaluateAll(es=>es.filter(e=>e.getAttribute('fill')==='#527b72').length)).toBe(fixture.trials[0].count);
  await lab.getByRole('button',{name:'Next trial',exact:true}).click();await expect(lab.locator('[data-inspected-trial]')).toHaveAttribute('data-inspected-trial','2');
  await page.getByRole('button',{name:'Previous stage',exact:true}).click();await expect(lab).toHaveAttribute('data-chance-trials','6');await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase','parents');
  await lab.getByRole('button',{name:'Try five trials',exact:true}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});await expect(lab).toHaveAttribute('data-chance-trials','16');
  await lab.getByRole('button',{name:'Try five trials',exact:true}).click();await expect(lab).toHaveAttribute('data-chance-trials','20');
  await expect(lab.getByRole('button',{name:'Try one survival trial',exact:true})).toBeDisabled();await expect(lab.getByRole('button',{name:'Try five trials',exact:true})).toBeDisabled();await expect(lab.locator('[data-trial-count]')).toHaveCount(20);
  const counts=fixture.trials.map(row=>row.count),mean=counts.reduce((a,b)=>a+b,0)/20;
  await expect(lab.locator('[data-chance-range]')).toHaveAttribute('data-chance-range',Math.min(...counts)+':'+Math.max(...counts));await expect(lab.locator('[data-chance-mean]')).toHaveAttribute('data-chance-mean',String(mean));await expect(lab.locator('[data-chance-recorded]')).toHaveAttribute('data-chance-recorded',String(fixture.next.history[5].survivors.length));
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);expect((await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id)).toEqual(contexts);
  await page.setViewportSize({width:1440,height:1800});await lab.screenshot({path:report+'/chance-lab-desktop.png',style:'.ei-main{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar{position:static!important}'});await page.setViewportSize({width:1440,height:1100});
  await lab.getByText('Read trial counts and seeds',{exact:true}).click();await expect(lab.locator('tbody tr')).toHaveCount(20);
  expect(await lab.locator('tbody tr').evaluateAll(es=>es.map(e=>e.textContent))).toEqual(fixture.trials.map(row=>String(row.index)+row.count+' / 60'+row.seed));
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-chance-lab',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  await lab.getByRole('button',{name:'Save chance trials to journal',exact:true}).click();const notes=await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  expect(notes.livingIsland.text).toBe('My explanation.');expect(notes.livingIslandData.text).toBe('Earlier evidence.');expect(notes.livingIslandForecast.text).toContain('Forecast: 25 / 60');expect(notes.livingIslandChanceTrials.text).toContain('20 survival-only trials: '+counts.join(', '));expect(notes.livingIslandChanceTrials.text).toContain('habitat: '+fixture.next.history[5].habitat);expect(notes.livingIslandChanceTrials.text).toContain(fixture.trials.map(row=>row.seed).join(', '));expect(notes.livingIslandChanceTrials.text.length).toBeLessThan(2000);
  await page.getByRole('button',{name:'Leave walkthrough',exact:true}).click();await expect(lab).toHaveCount(0);await expect(page.getByRole('button',{name:'Predict this round',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Field journal',exact:false}).click();const note=page.getByRole('listitem').filter({has:page.getByText(notes.livingIslandChanceTrials.text,{exact:true})});await expect(note).toBeVisible();await expect(note).toContainText('Living Island · chance trials · ');expect(errors).toEqual([]);
});

test('chance lab on a phone supports keyboard trial browsing and preserves the next real outcome', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const world=await page.evaluate(()=>({...((window as any).StemLab.evoIslandModel.create(2026)),selection:false,living:false,habitat:'drought'}));
  await harness.mount(page,{evoLab:{view:'livingIsland',island:world,islandStudy:{seed:2026,introDismissed:true}}});await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';document.body.style.padding='0';});
  await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.locator('#ei-forecast-number').fill('18');await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();await page.getByRole('button',{name:'Reveal survivors',exact:false}).click();
  const current=await page.evaluate(()=>(window as any).__toolData.evoLab.island),next=await page.evaluate(()=>(window as any).StemLab.evoIslandModel.step((window as any).__toolData.evoLab.island));
  const summary=page.getByText('Explore chance: repeat this round',{exact:true});await summary.focus();await page.keyboard.press('Enter');const lab=page.locator('.ei-chance-lab');
  await lab.getByRole('button',{name:'Try five trials',exact:true}).focus();await page.keyboard.press('Enter');await expect(lab).toHaveAttribute('data-chance-trials','5');
  await page.locator('#ei-chance-trial').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(page.locator('#ei-chance-trial')).toHaveValue('1');await expect(lab.locator('[data-inspected-trial]')).toHaveAttribute('data-inspected-trial','2');
  await lab.getByRole('button',{name:'Previous trial',exact:true}).focus();await page.keyboard.press('Enter');await expect(lab.locator('[data-inspected-trial]')).toHaveAttribute('data-inspected-trial','1');
  await lab.evaluate(el=>el.scrollIntoView({block:'start'}));
  const bounds=await lab.evaluate(el=>({top:el.getBoundingClientRect().top,bar:document.querySelector('.ei-commandbar')!.getBoundingClientRect().bottom,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width,scrollWidth:el.scrollWidth}));expect(bounds.top).toBeGreaterThanOrEqual(bounds.bar-1);expect(bounds.right).toBeLessThanOrEqual(390);expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width+1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.setViewportSize({width:390,height:1700});await lab.evaluate(el=>el.scrollIntoView({block:'start'}));await lab.screenshot({path:report+'/chance-lab-phone.png'});await page.setViewportSize({width:390,height:844});
  await lab.getByText('Read trial counts and seeds',{exact:true}).focus();await page.keyboard.press('Enter');await expect(lab.locator('tbody tr')).toHaveCount(5);expect(await lab.evaluate(el=>el.scrollWidth<=el.getBoundingClientRect().width+1)).toBe(true);
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-chance-lab',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  await summary.focus();await page.keyboard.press('Enter');await page.keyboard.press('Enter');await expect(lab).toHaveAttribute('data-chance-trials','5');
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(current);await page.getByRole('button',{name:'Meet the offspring',exact:false}).click();await page.getByRole('button',{name:'Finish walkthrough',exact:true}).click();await page.getByRole('button',{name:'Next generation',exact:false}).click();expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(next);
  await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();await page.getByRole('button',{name:'Reveal survivors',exact:false}).click();await expect(lab).toHaveAttribute('data-chance-trials','0');
});

test('chance lab without WebGL retains zero and one survivor trials after the real island goes extinct', async ({ page }) => {
  await page.setViewportSize({width:1440,height:1100});await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel,t=(window as any).StemLab.evoIslandChanceTrials;for(let seed=1;seed<50;seed++){const world=m.create(seed);world.history[0].population=world.history[0].population.slice(0,2);world.history[0].stats=m.stats(world.history[0].population);world.nextId=3;const next=m.step(world);if(next.history[1].survivors.length===1)return {world,next,trials:Array.from({length:20},(_,i)=>t.run(world,i+1))};}throw new Error('No extinction fixture');});
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:fixture.world.seed,introDismissed:true}}},undefined,{expectCanvas:false});
  await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();await page.getByRole('button',{name:'Show offspring',exact:true}).click();await page.getByText('Explore chance: repeat this round',{exact:true}).click();const lab=page.locator('.ei-chance-lab');
  for(let i=0;i<4;i++)await lab.getByRole('button',{name:'Try five trials',exact:true}).click();await expect(lab).toHaveAttribute('data-chance-trials','20');
  expect(fixture.trials.some(row=>row.count===0)).toBe(true);expect(fixture.trials.some(row=>row.count===1)).toBe(true);
  expect(await lab.locator('[data-trial-count]').evaluateAll(es=>es.map(e=>Number(e.getAttribute('data-trial-count'))))).toEqual(fixture.trials.map(row=>row.count));
  await page.locator('#ei-chance-trial').selectOption(String(fixture.trials.findIndex(row=>row.count===0)));expect(await lab.locator('.ei-chance-inspected circle').evaluateAll(es=>es.filter(e=>e.getAttribute('fill')==='#527b72').length)).toBe(0);
  await expect(lab.locator('[data-chance-recorded]')).toHaveAttribute('data-chance-recorded','1');await expect(page.locator('.ei-map-creature')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);
  await lab.getByRole('button',{name:'Save chance trials to journal',exact:true}).click();const note=await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandChanceTrials.text);expect(note).toContain('No offspring are produced');
  await page.getByRole('button',{name:'Finish walkthrough',exact:true}).click();await expect(page.locator('.ei-stage')).toBeFocused();await expect(lab).toHaveCount(0);
  await page.getByRole('button',{name:'All EvoLab activities',exact:false}).click();await page.getByRole('button',{name:'Explore Living Island',exact:false}).click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandChanceTrials.text)).toBe(note);await expect(lab).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);
});


test('individual chance follows real parent identities across trials and saves separate evidence', async ({ page }) => {
  test.setTimeout(180_000);const errors:string[]=[];page.on('pageerror',err=>errors.push(err.message));
  await page.setViewportSize({width:1440,height:1100});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel,t=(window as any).StemLab.evoIslandChanceTrials;let world=m.create(2026);for(let i=0;i<4;i++)world=m.step(world);const next=m.step(world),trials=Array.from({length:20},(_,i)=>t.run(world,i+1)),actual=next.history[5].survivors;return {world,next,trials,match:trials.findIndex(row=>row.count===actual.length&&row.survivors.some((id:number)=>!actual.includes(id)))};});
  expect(fixture.match).toBeGreaterThanOrEqual(0);const parents=fixture.world.history[4].population,firstId=parents[0].id;
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,introDismissed:true,selectedId:1,trackedId:1,names:{[firstId]:'Pebble chance explorer'}},evoProgress:{notes:{livingIsland:{text:'My own field note.',at:'2026-09-30'}}}}});
  const contexts=(await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id);
  await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();await page.getByRole('button',{name:'Reveal survivors',exact:false}).click();
  await page.getByText('Explore chance: repeat this round',{exact:true}).click();for(let i=0;i<4;i++)await page.getByRole('button',{name:'Try five trials',exact:true}).click();
  await page.locator('#ei-chance-trial').selectOption(String(fixture.match));await page.getByText('Who survived? Follow an individual',{exact:true}).click();const panel=page.locator('.ei-chance-residents');
  await expect(panel).toContainText('Same survivor count, different individuals');await expect(panel).toContainText('Pebble chance explorer');await expect(page.locator('#ei-chance-resident option')).toHaveCount(parents.length);
  const check=async(index:number,id:number)=>{
    const trial=fixture.trials[index-1],recorded=fixture.next.history[5].survivors,o=parents.find((parent:any)=>parent.id===id),groups={both:0,recorded:0,trial:0,neither:0};
    parents.forEach((parent:any)=>{const a=recorded.includes(parent.id),b=trial.survivors.includes(parent.id);groups[a?b?'both':'recorded':b?'trial':'neither']++;});
    for(const [key,value] of Object.entries(groups))await expect(panel.locator('[data-outcome-group='+key+']')).toHaveText(String(value));
    await expect(panel.locator('[data-chance-resident]')).toHaveAttribute('data-chance-resident',String(id));await expect(panel.locator('[data-resident-outcome=recorded]')).toHaveAttribute('data-survived',String(recorded.includes(id)));await expect(panel.locator('[data-resident-outcome=trial]')).toHaveAttribute('data-survived',String(trial.survivors.includes(id)));
    const chance=await page.evaluate(({o,habitat})=>(window as any).StemLab.evoIslandModel.chance(o,(window as any).StemLab.evoIslandModel.habitats[habitat],true),{o,habitat:fixture.next.history[5].habitat});await expect(panel.locator('[data-resident-chance]')).toHaveAttribute('data-resident-chance',String(chance));
    for(const key of ['shade','fur','legs'])await expect(panel.locator('[data-resident-trait='+key+']')).toHaveText(((o.genes[key][0]+o.genes[key][1])*50).toFixed(1));
    expect(await panel.locator('[data-resident-trial-chip]').evaluateAll(es=>es.map(e=>e.getAttribute('data-survived')==='true'))).toEqual(fixture.trials.map(row=>row.survivors.includes(id)));
  };
  await check(fixture.match+1,firstId);const portrait=await panel.locator('.ei-portrait').evaluate(el=>el.outerHTML);
  await panel.locator('[data-resident-trial-chip="1"]').click();await expect(page.locator('#ei-chance-trial')).toHaveValue('0');await check(1,firstId);expect(await panel.locator('.ei-portrait').evaluate(el=>el.outerHTML)).toBe(portrait);
  await panel.getByRole('button',{name:'Find a changed outcome',exact:true}).click();const selectedId=Number(await page.locator('#ei-chance-resident').inputValue());expect(fixture.next.history[5].survivors.includes(selectedId)).not.toBe(fixture.trials[0].survivors.includes(selectedId));await check(1,selectedId);
  await panel.locator('[data-resident-trial-chip="20"]').click();await check(20,selectedId);await expect(panel.locator('[data-resident-trial-chip="20"]')).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Previous stage',exact:true}).click();await expect(page.locator('#ei-chance-resident')).toHaveValue(String(selectedId));await check(20,selectedId);
  await page.setViewportSize({width:1440,height:1750});await panel.screenshot({path:report+'/chance-residents-desktop.png',style:'.ei-main{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar{position:static!important}'});await page.setViewportSize({width:1440,height:1100});
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-chance-residents',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  await page.getByRole('button',{name:'Save chance trials to journal',exact:true}).click();await panel.getByRole('button',{name:'Save individual comparison',exact:true}).click();const notes=await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  expect(notes.livingIsland.text).toBe('My own field note.');expect(notes.livingIslandChanceTrials.text).toContain('20 survival-only trials');expect(notes.livingIslandChanceResident.text).toContain('Individual #'+selectedId);expect(notes.livingIslandChanceResident.text).toContain('Trial 20 survival: '+fixture.trials[19].survivors.includes(selectedId));expect(notes.livingIslandChanceResident.text).toContain('chance seed: '+fixture.trials[19].seed);expect(notes.livingIslandChanceResident.text.length).toBeLessThan(2000);
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);expect((await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id)).toEqual(contexts);await expect(page.locator('#ei-organism')).toHaveValue('1');
  await page.getByRole('button',{name:'Leave walkthrough',exact:true}).click();await expect(panel).toHaveCount(0);await page.getByRole('button',{name:'Field journal',exact:false}).click();const entry=page.getByRole('listitem').filter({has:page.getByText(notes.livingIslandChanceResident.text,{exact:true})});await expect(entry).toBeVisible();await expect(entry).toContainText('Living Island · individual chance evidence · ');expect(errors).toEqual([]);
});

test('individual chance on a phone keeps the selected spriglet while keyboard trial controls change outcomes', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const world=await page.evaluate(()=>({...((window as any).StemLab.evoIslandModel.create(2026)),selection:false,living:false,habitat:'drought'}));
  await harness.mount(page,{evoLab:{view:'livingIsland',island:world,islandStudy:{seed:2026,introDismissed:true,names:{2:'LongNamedSprigletExplorer'}}}});await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';document.body.style.padding='0';});
  await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();await page.getByRole('button',{name:'Reveal survivors',exact:false}).click();
  await page.getByText('Explore chance: repeat this round',{exact:true}).click();await page.getByRole('button',{name:'Try five trials',exact:true}).click();const summary=page.getByText('Who survived? Follow an individual',{exact:true});await summary.focus();await page.keyboard.press('Enter');const panel=page.locator('.ei-chance-residents');
  await page.locator('#ei-chance-resident').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(page.locator('#ei-chance-resident')).toHaveValue('2');await expect(panel.locator('.ei-chance-resident-head strong')).toHaveText('LongNamedSprigletExplore');
  await expect(panel.locator('[data-resident-chance]')).toHaveAttribute('data-resident-chance',String(.68*.72));const portrait=await panel.locator('.ei-portrait').evaluate(el=>el.outerHTML);
  await panel.locator('[data-resident-trial-chip="1"]').focus();await page.keyboard.press('Enter');await expect(page.locator('#ei-chance-trial')).toHaveValue('0');await expect(page.locator('#ei-chance-resident')).toHaveValue('2');await expect(panel.locator('[data-resident-trial-chip="1"]')).toBeFocused();
  await panel.getByRole('button',{name:'Next individual',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.locator('#ei-chance-resident')).toHaveValue('3');await panel.getByRole('button',{name:'Previous individual',exact:true}).click();await expect(page.locator('#ei-chance-resident')).toHaveValue('2');expect(await panel.locator('.ei-portrait').evaluate(el=>el.outerHTML)).toBe(portrait);
  await page.getByRole('button',{name:'Try five trials',exact:true}).click();await expect(panel.locator('[data-resident-trial-chip]')).toHaveCount(10);await expect(page.locator('#ei-chance-resident')).toHaveValue('2');await expect(page.locator('#ei-chance-trial')).toHaveValue('9');
  await panel.evaluate(el=>el.scrollIntoView({block:'start'}));const bounds=await panel.evaluate(el=>({top:el.getBoundingClientRect().top,bar:document.querySelector('.ei-commandbar')!.getBoundingClientRect().bottom,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width,scrollWidth:el.scrollWidth}));expect(bounds.top).toBeGreaterThanOrEqual(bounds.bar-1);expect(bounds.right).toBeLessThanOrEqual(390);expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width+1);
  await page.setViewportSize({width:390,height:1700});await panel.evaluate(el=>el.scrollIntoView({block:'start'}));await panel.screenshot({path:report+'/chance-residents-phone.png'});await page.setViewportSize({width:390,height:844});
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-chance-residents',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  const current=await page.evaluate(()=>(window as any).__toolData.evoLab.island),expected=await page.evaluate(()=>(window as any).StemLab.evoIslandModel.step((window as any).__toolData.evoLab.island));await summary.click();await summary.click();await expect(page.locator('#ei-chance-resident')).toHaveValue('2');
  await page.getByRole('button',{name:'Meet the offspring',exact:false}).click();await page.getByRole('button',{name:'Finish walkthrough',exact:true}).click();await expect(panel).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(current);await page.getByRole('button',{name:'Next generation',exact:false}).click();expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(expected);
});

test('individual chance without WebGL explains identical and different survivors after actual extinction', async ({ page }) => {
  await page.setViewportSize({width:1440,height:1100});await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel,t=(window as any).StemLab.evoIslandChanceTrials;for(let seed=1;seed<50;seed++){const world=m.create(seed);world.history[0].population=world.history[0].population.slice(0,2);world.history[0].stats=m.stats(world.history[0].population);world.nextId=3;const next=m.step(world);if(next.history[1].survivors.length===1){const actual=next.history[1].survivors,trials=Array.from({length:20},(_,i)=>t.run(world,i+1));return {world,next,trials,identical:trials.findIndex(row=>row.count===1&&row.survivors[0]===actual[0]),empty:trials.findIndex(row=>row.count===0)};}}throw new Error('No extinction fixture');});
  expect(fixture.identical).toBeGreaterThanOrEqual(0);expect(fixture.empty).toBeGreaterThanOrEqual(0);
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:fixture.world.seed,introDismissed:true}}},undefined,{expectCanvas:false});
  await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();await page.getByRole('button',{name:'Show offspring',exact:true}).click();await page.getByText('Explore chance: repeat this round',{exact:true}).click();for(let i=0;i<4;i++)await page.getByRole('button',{name:'Try five trials',exact:true}).click();
  await page.locator('#ei-chance-trial').selectOption(String(fixture.identical));await page.getByText('Who survived? Follow an individual',{exact:true}).click();const panel=page.locator('.ei-chance-residents');await expect(panel).toContainText('The same individuals survived in this comparison');await expect(panel.getByRole('button',{name:'Find a changed outcome',exact:true})).toBeDisabled();await expect(panel.locator('[data-outcome-group=both]')).toHaveText('1');await expect(panel.locator('[data-outcome-group=neither]')).toHaveText('1');
  await page.locator('#ei-chance-resident').selectOption(String(fixture.next.history[1].survivors[0]));await panel.locator('[data-resident-trial-chip="'+(fixture.empty+1)+'"]').click();await expect(panel.locator('[data-resident-outcome=recorded]')).toHaveAttribute('data-survived','true');await expect(panel.locator('[data-resident-outcome=trial]')).toHaveAttribute('data-survived','false');await expect(panel.getByRole('button',{name:'Find a changed outcome',exact:true})).toBeEnabled();
  await expect(page.locator('.ei-map-creature')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);await panel.getByRole('button',{name:'Save individual comparison',exact:true}).click();const note=await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandChanceResident.text);expect(note).toContain('Recorded survival: true');expect(note).toContain('survival: false');
  await page.getByRole('button',{name:'Finish walkthrough',exact:true}).click();await expect(page.locator('.ei-stage')).toBeFocused();await page.getByRole('button',{name:'All EvoLab activities',exact:false}).click();await page.getByRole('button',{name:'Explore Living Island',exact:false}).click();await expect(panel).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandChanceResident.text)).toBe(note);
});


test('discovery compass routes real discoveries and resumes an unfinished prediction without advancing the island', async ({ page }) => {
  test.setTimeout(180_000);const errors:string[]=[];page.on('pageerror',err=>errors.push(err.message));
  await page.setViewportSize({width:1440,height:1100});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const world=await page.evaluate(()=>(window as any).StemLab.evoIslandModel.create(2026));
  await harness.mount(page,{evoLab:{view:'livingIsland',island:world,islandStudy:{seed:2026,introDismissed:true}}});
  const contexts=(await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id);
  const launch=page.getByRole('button',{name:'Discovery compass',exact:true}),compass=page.getByRole('region',{name:'Discovery compass',exact:true});
  await launch.click();await expect(compass).toBeFocused();await expect(launch).toHaveAttribute('aria-expanded','true');await expect(compass.locator('.ei-compass-recommended')).toHaveAttribute('data-discovery','meet');
  await expect(compass.getByRole('button',{name:'Trace an inheritance',exact:true})).toBeDisabled();await expect(compass.getByRole('button',{name:'Find a recorded moment',exact:true})).toBeDisabled();
  await compass.screenshot({path:report+'/compass-desktop.png'});
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-compass',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}))))).toEqual([]);
  await compass.getByRole('button',{name:'Meet a resident',exact:true}).click();await expect(page.getByRole('region',{name:'Meet the residents',exact:true})).toBeFocused();await expect(page.locator('#ei-organism')).toHaveValue('1');
  await launch.click();await expect(compass.locator('.ei-compass-recommended')).toHaveAttribute('data-discovery','predict');await compass.getByRole('button',{name:'Make a prediction',exact:true}).click();await expect(page.locator('.ei-round-forecast')).toBeFocused();
  await page.locator('#ei-forecast-number').fill('12');await launch.click();await expect(compass.getByRole('button',{name:'Continue your prediction',exact:true})).toBeEnabled();await compass.getByRole('button',{name:'Continue your prediction',exact:true}).click();await expect(page.locator('#ei-forecast-number')).toHaveValue('12');expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(world);
  const next=await page.evaluate(()=>(window as any).StemLab.evoIslandModel.step((window as any).__toolData.evoLab.island));
  await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();await page.getByRole('button',{name:'Reveal survivors',exact:false}).click();await page.getByText('Explore chance: repeat this round',{exact:true}).click();await page.getByRole('button',{name:'Try five trials',exact:true}).click();
  await launch.click();await compass.getByRole('button',{name:'Continue this round',exact:true}).click();await expect(page.locator('.ei-watch-guide')).toBeFocused();await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase','survivors');await expect(page.locator('.ei-chance-lab')).toHaveAttribute('data-chance-trials','5');await expect(page.locator('[data-forecast-guess]')).toHaveAttribute('data-forecast-guess','12');
  await page.getByRole('button',{name:'Leave walkthrough',exact:true}).click();
  await launch.click();await compass.getByRole('button',{name:'Trace an inheritance',exact:true}).click();await expect(page.locator('.ei-inheritance')).toBeFocused();await expect(page.locator('.ei-inheritance')).toHaveAttribute('data-inheritance-organism',String(next.history[1].population[0].id));
  await launch.click();await compass.getByRole('button',{name:'Follow a family',exact:true}).click();await expect(page.locator('.ei-family-journey')).toBeFocused();
  await launch.click();await compass.getByRole('button',{name:'Compare two futures',exact:true}).click();await expect(page.locator('.ei-trial-launch')).toBeFocused();await expect(page.getByRole('button',{name:'Explore two futures →',exact:true})).toBeVisible();
  await launch.click();await compass.getByRole('button',{name:'Find a recorded moment',exact:true}).click();await expect(page.getByRole('region',{name:'Expedition highlights',exact:true})).toBeFocused();
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(next);expect((await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id)).toEqual(contexts);expect(errors).toEqual([]);
});

test('discovery compass on a phone supports keyboard dismissal and present-day routing while preserving family and history', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const world=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;let w=m.create(2026);for(let i=0;i<4;i++)w=m.step(w);return w;});
  await harness.mount(page,{evoLab:{view:'livingIsland',island:world,islandStudy:{seed:2026,introDismissed:true,selectedId:1,trackedId:2,names:{2:'Pebble the explorer'}}}});await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';document.body.style.padding='0';});
  const launch=page.getByRole('button',{name:'Discovery compass',exact:true}),compass=page.getByRole('region',{name:'Discovery compass',exact:true});
  await page.locator('#ei-time').fill('1');await launch.focus();await page.keyboard.press('Enter');await expect(compass).toBeFocused();await expect(compass).toContainText('Viewing generation 1');await expect(compass.getByRole('button',{name:'Make a prediction',exact:true})).toBeDisabled();await expect(compass.getByRole('button',{name:'Compare two futures',exact:true})).toBeDisabled();
  const reason=await compass.getByRole('button',{name:'Make a prediction',exact:true}).getAttribute('aria-describedby');await expect(page.locator('#'+reason)).toHaveText('Return to the present generation to begin this investigation.');await expect(compass.locator('[data-discovery=family]')).toContainText('Pebble the explorer');
  const bounds=await compass.evaluate(el=>({right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width,scrollWidth:el.scrollWidth,cards:[...el.querySelectorAll('.ei-compass-card')].map(c=>({right:c.getBoundingClientRect().right,width:c.getBoundingClientRect().width,scrollWidth:c.scrollWidth}))}));expect(bounds.right).toBeLessThanOrEqual(390);expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width+1);bounds.cards.forEach(c=>{expect(c.right).toBeLessThanOrEqual(390);expect(c.scrollWidth).toBeLessThanOrEqual(c.width+1);});
  await page.screenshot({path:report+'/compass-phone.png'});
  await page.keyboard.press('Escape');await expect(compass).toHaveCount(0);await expect(launch).toBeFocused();await expect(launch).toHaveAttribute('aria-expanded','false');
  await launch.click();await compass.getByRole('button',{name:'Explore the present generation',exact:true}).focus();await page.keyboard.press('Enter');await expect(compass).toBeFocused();await expect(compass).toContainText('Viewing generation 4');await expect(compass.getByRole('button',{name:'Make a prediction',exact:true})).toBeEnabled();expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(world);
  await compass.getByRole('button',{name:'Follow a family',exact:true}).click();await expect(page.locator('.ei-family-journey')).toBeFocused();await expect(page.locator('.ei-family-journey')).toContainText('Pebble the explorer');await expect(page.locator('#ei-organism')).toHaveValue('2');
  await launch.click();await compass.getByRole('button',{name:'Trace an inheritance',exact:true}).click();const child=world.history[4].population[0];await expect(page.locator('.ei-inheritance')).toBeFocused();await expect(page.locator('.ei-inheritance')).toHaveAttribute('data-inheritance-organism',String(child.id));await expect(page.locator('#ei-time')).toHaveValue('4');
  await page.locator('#ei-time').fill('2');await launch.click();await expect(compass.locator('[data-discovery=birth]')).toContainText('#'+child.id);await compass.getByRole('button',{name:'Trace an inheritance',exact:true}).click();await expect(page.locator('#ei-time')).toHaveValue('4');await expect(page.locator('.ei-inheritance')).toHaveAttribute('data-inheritance-organism',String(child.id));
  await launch.click();await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-compass',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  await compass.getByRole('button',{name:'Close discovery compass',exact:true}).click();await expect(launch).toBeFocused();expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(world);
});

test('discovery compass without WebGL keeps extinct expeditions explorable and respects the comparison generation limit', async ({ page }) => {
  await page.setViewportSize({width:1440,height:1100});await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  const world=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;for(let seed=1;seed<50;seed++){const w=m.create(seed);w.history[0].population=w.history[0].population.slice(0,2);w.history[0].stats=m.stats(w.history[0].population);w.nextId=3;const next=m.step(w);if(!next.history[1].population.length)return next;}throw new Error('No extinction fixture');});
  await harness.mount(page,{evoLab:{view:'livingIsland',island:world,islandStudy:{seed:world.seed,introDismissed:true}}},undefined,{expectCanvas:false});
  const launch=page.getByRole('button',{name:'Discovery compass',exact:true}),compass=page.getByRole('region',{name:'Discovery compass',exact:true});
  await launch.click();await expect(compass.getByRole('button',{name:'Make a prediction',exact:true})).toBeDisabled();await expect(compass.getByRole('button',{name:'Compare two futures',exact:true})).toBeDisabled();await expect(compass.locator('[data-discovery=predict]')).toContainText('This population is extinct.');await expect(compass.getByRole('button',{name:'Trace an inheritance',exact:true})).toBeDisabled();await expect(compass.locator('[data-discovery=birth]')).toContainText('This expedition has no recorded offspring.');
  await compass.getByRole('button',{name:'Meet a resident',exact:true}).click();await expect(page.locator('#ei-time')).toHaveValue('0');await expect(page.locator('#ei-organism')).toHaveValue('1');await expect(page.locator('.ei-map-creature')).toHaveCount(2);
  await launch.click();await compass.getByRole('button',{name:'Explore the present generation',exact:true}).click();await compass.getByRole('button',{name:'Follow a family',exact:true}).click();await expect(page.locator('.ei-family-journey')).toBeFocused();await expect(page.locator('.ei-map-creature')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(world);
  const late=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;let w=m.create(2026);w.living=false;w.selection=false;for(let i=0;i<56;i++)w=m.step(w);return w;});expect(late.history[56].population.length).toBeGreaterThan(0);
  await harness.mount(page,{evoLab:{view:'livingIsland',island:late,islandStudy:{seed:late.seed,introDismissed:true}}},undefined,{expectCanvas:false});await launch.click();await expect(compass.getByRole('button',{name:'Make a prediction',exact:true})).toBeEnabled();await expect(compass.getByRole('button',{name:'Compare two futures',exact:true})).toBeDisabled();await expect(compass.locator('[data-discovery=futures]')).toContainText('five generations left');expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(late);
  await compass.getByRole('button',{name:'Close discovery compass',exact:true}).click();await page.getByRole('button',{name:'Play evolution',exact:false}).click();await launch.click();await expect(page.getByRole('button',{name:'Play evolution',exact:false})).toBeVisible();const paused=await page.evaluate(()=>(window as any).__toolData.evoLab.island);await page.waitForTimeout(1600);expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(paused);
  const finished=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;let w=(window as any).__toolData.evoLab.island;while(w.generation<60)w=m.step(w);return w;});await harness.mount(page,{evoLab:{view:'livingIsland',island:finished,islandStudy:{seed:finished.seed,introDismissed:true}}},undefined,{expectCanvas:false});await launch.click();await expect(compass.getByRole('button',{name:'Make a prediction',exact:true})).toBeDisabled();await expect(compass.locator('[data-discovery=predict]')).toContainText('generation 60');await expect(compass.getByRole('button',{name:'Trace an inheritance',exact:true})).toBeEnabled();expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(finished);
});


test('chance microscope reveals actual trial draws and lets students test the survival threshold without changing history', async ({ page }) => {
  test.setTimeout(180_000);const errors:string[]=[];page.on('pageerror',err=>errors.push(err.message));await page.setViewportSize({width:1440,height:1100});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;let world=m.create(2026);for(let i=0;i<4;i++)world=m.step(world);return {world,next:m.step(world),id:world.history[4].population[0].id};});
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,introDismissed:true,names:{[fixture.id]:'Pebble'}},evoProgress:{notes:{livingIsland:{text:'My observation.',at:'2026-09-30'}}}}});const contexts=(await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id);
  await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();await page.getByRole('button',{name:'Reveal survivors',exact:false}).click();await page.getByText('Explore chance: repeat this round',{exact:true}).click();await page.getByRole('button',{name:'Try five trials',exact:true}).click();await page.getByText('Who survived? Follow an individual',{exact:true}).click();
  const summary=page.getByText('Chance microscope: see the survival draw',{exact:true});await summary.click();const panel=page.locator('.ei-draw-microscope');await expect(panel).toHaveAttribute('data-microscope-id',String(fixture.id));await expect(panel).toHaveAttribute('data-microscope-index','5');await expect(panel.locator('[data-trial-draw]')).toHaveCount(0);
  const draw=await page.evaluate(({world,id})=>(window as any).StemLab.evoIslandChanceTrials.draw(world,5,id),{world:fixture.world,id:fixture.id});await panel.getByRole('button',{name:'Reveal this trial’s draw',exact:true}).click();await expect(panel.getByRole('button',{name:'Hide this trial’s draw',exact:true})).toBeFocused();await expect(panel.getByRole('button',{name:'Hide this trial’s draw',exact:true})).toHaveAttribute('aria-expanded','true');await panel.getByRole('button',{name:'Hide this trial’s draw',exact:true}).click();await expect(panel.locator('[data-trial-draw]')).toHaveCount(0);await expect(panel.getByRole('button',{name:'Reveal this trial’s draw',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(panel.locator('[data-trial-draw]')).toHaveAttribute('data-trial-draw',String(draw.number));await expect(panel.locator('[data-trial-draw]')).toHaveAttribute('data-trial-threshold',String(draw.probability));await expect(panel.locator('[data-trial-draw]')).toHaveAttribute('data-trial-survived',String(draw.survived));
  await expect(panel.locator('[data-draw-chart=trial] [data-draw-marker]')).toHaveAttribute('transform','translate('+(24+draw.number*552)+',0)');await panel.getByText('Exact values & trial seed',{exact:true}).click();await expect(panel.locator('.ei-draw-precision')).toContainText(String(draw.number));await expect(panel.locator('.ei-draw-precision')).toContainText(String(draw.seed));
  const chart=panel.locator('[data-draw-chart=practice]');await chart.scrollIntoViewIfNeeded();const box=(await chart.boundingBox())!;
  await page.mouse.move(box.x+box.width*(24+.1*552)/600,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*(24+.9*552)/600,box.y+box.height*.5,{steps:5});await page.mouse.up();expect(Number(await panel.locator('[data-practice-draw]').getAttribute('data-practice-draw'))).toBeCloseTo(.9,2);await expect(panel.locator('[data-practice-survived]')).toHaveAttribute('data-practice-survived',String(.9<draw.probability));
  await page.locator('#ei-practice-draw').fill('0');await expect(panel.locator('[data-practice-survived]')).toHaveAttribute('data-practice-survived','true');await page.locator('#ei-practice-draw').fill('100');await expect(panel.locator('[data-practice-survived]')).toHaveAttribute('data-practice-survived','false');
  await panel.getByRole('button',{name:'Test the exact threshold',exact:true}).click();await expect(panel.locator('[data-practice-draw]')).toHaveAttribute('data-practice-draw',String(draw.probability));await expect(panel.locator('[data-practice-survived]')).toHaveAttribute('data-practice-survived','false');await expect(panel).toContainText('Exactly at the threshold');
  await panel.screenshot({path:report+'/draw-microscope-desktop.png',style:'.ei-main{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar{position:static!important}'});
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-draw-details',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}))))).toEqual([]);
  await page.getByRole('button',{name:'Save individual comparison',exact:true}).click();const notes=await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);expect(notes.livingIsland.text).toBe('My observation.');expect(notes.livingIslandChanceResident.text).toContain('Selected trial draw (0–1): '+draw.number);expect(notes.livingIslandChanceResident.text).toContain('exact probability: '+draw.probability);expect(notes.livingIslandChanceResident.text.length).toBeLessThan(2000);
  await page.locator('[data-resident-trial-chip="1"]').click();await expect(page.locator('.ei-draw-details')).toHaveAttribute('open','');await expect(panel).toHaveAttribute('data-microscope-index','1');await expect(panel.locator('[data-trial-draw]')).toHaveCount(0);await expect(panel.locator('[data-practice-draw]')).toHaveAttribute('data-practice-draw','0.5');await panel.getByRole('button',{name:'Reveal this trial’s draw',exact:true}).click();
  const first=await page.evaluate(({world,id})=>(window as any).StemLab.evoIslandChanceTrials.draw(world,1,id),{world:fixture.world,id:fixture.id});await expect(panel.locator('[data-trial-draw]')).toHaveAttribute('data-trial-draw',String(first.number));expect(first.number).not.toBe(draw.number);expect(first.probability).toBe(draw.probability);
  await page.getByRole('button',{name:'Next individual',exact:true}).click();await expect(panel).toHaveAttribute('data-microscope-id',String(fixture.world.history[4].population[1].id));await expect(panel.locator('[data-trial-draw]')).toHaveCount(0);await expect(page.locator('.ei-draw-details')).toHaveAttribute('open','');
  expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);expect((await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id)).toEqual(contexts);expect(errors).toEqual([]);
});

test('chance microscope on a phone supports keyboard practice draws and keeps its controls inside the screen', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  const world=await page.evaluate(()=>({...((window as any).StemLab.evoIslandModel.create(2026)),selection:false,living:false,habitat:'drought'}));await harness.mount(page,{evoLab:{view:'livingIsland',island:world,islandStudy:{seed:2026,introDismissed:true}}});await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';document.body.style.padding='0';});
  await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();await page.getByRole('button',{name:'Reveal survivors',exact:false}).click();await page.getByText('Explore chance: repeat this round',{exact:true}).click();await page.getByRole('button',{name:'Try five trials',exact:true}).click();await page.getByText('Who survived? Follow an individual',{exact:true}).click();
  const summary=page.getByText('Chance microscope: see the survival draw',{exact:true});await summary.focus();await page.keyboard.press('Enter');const panel=page.locator('.ei-draw-microscope'),practice=panel.locator('[data-practice-draw]');await panel.getByRole('button',{name:'Reveal this trial’s draw',exact:true}).focus();await page.keyboard.press('Enter');await expect(panel.getByRole('button',{name:'Hide this trial’s draw',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(panel.locator('[data-trial-draw]')).toHaveCount(0);await expect(panel.getByRole('button',{name:'Reveal this trial’s draw',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(panel.locator('[data-trial-threshold]')).toHaveAttribute('data-trial-threshold',String(.68*.72));
  await page.locator('#ei-practice-draw').focus();await page.keyboard.press('Home');await expect(practice).toHaveAttribute('data-practice-draw','0');await expect(practice).toHaveAttribute('data-practice-survived','true');await page.keyboard.press('ArrowRight');expect(Number(await practice.getAttribute('data-practice-draw'))).toBeGreaterThan(0);await page.keyboard.press('End');await expect(practice).toHaveAttribute('data-practice-draw','1');await expect(practice).toHaveAttribute('data-practice-survived','false');
  await panel.getByRole('button',{name:'Test the exact threshold',exact:true}).focus();await page.keyboard.press('Enter');await expect(practice).toHaveAttribute('data-practice-draw',String(.68*.72));await expect(practice).toHaveAttribute('data-practice-survived','false');await expect(panel).toContainText('Exactly at the threshold');
  await panel.getByText('Exact values & trial seed',{exact:true}).click();await page.locator('.ei-draw-details').evaluate(el=>el.scrollIntoView({block:'start'}));const bounds=await panel.evaluate(el=>({right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width,scrollWidth:el.scrollWidth,sections:[...el.querySelectorAll('.ei-draw-panel')].map(c=>({right:c.getBoundingClientRect().right,width:c.getBoundingClientRect().width,scrollWidth:c.scrollWidth}))}));expect(bounds.right).toBeLessThanOrEqual(390);expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width+1);bounds.sections.forEach(c=>{expect(c.right).toBeLessThanOrEqual(390);expect(c.scrollWidth).toBeLessThanOrEqual(c.width+1);});
  const top=await page.locator('.ei-draw-details').evaluate(el=>({top:el.getBoundingClientRect().top,bar:document.querySelector('.ei-commandbar')!.getBoundingClientRect().bottom}));expect(top.top).toBeGreaterThanOrEqual(top.bar-1);
  await page.setViewportSize({width:390,height:1550});await panel.screenshot({path:report+'/draw-microscope-phone.png'});await page.setViewportSize({width:390,height:844});await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-draw-details',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  const current=await page.evaluate(()=>(window as any).__toolData.evoLab.island),next=await page.evaluate(()=>(window as any).StemLab.evoIslandModel.step((window as any).__toolData.evoLab.island));await summary.click();await summary.click();await expect(practice).toHaveAttribute('data-practice-draw',String(.68*.72));await page.getByRole('button',{name:'Leave walkthrough',exact:true}).click();await expect(panel).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(current);await page.locator('.ei-commandbar').getByRole('button',{name:'Next generation',exact:false}).click();expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(next);
});

test('chance microscope without WebGL explains trial outcomes after actual extinction without inventing recorded draws', async ({ page }) => {
  await page.setViewportSize({width:1440,height:1100});await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel,t=(window as any).StemLab.evoIslandChanceTrials;for(let seed=1;seed<50;seed++){const world=m.create(seed);world.history[0].population=world.history[0].population.slice(0,2);world.history[0].stats=m.stats(world.history[0].population);world.nextId=3;const next=m.step(world);if(next.history[1].survivors.length===1){const trials=Array.from({length:20},(_,i)=>t.run(world,i+1));return {world,next,empty:trials.findIndex(row=>row.count===0),survived:trials.findIndex(row=>row.survivors.includes(next.history[1].survivors[0]))};}}throw new Error('No extinction fixture');});expect(fixture.empty).toBeGreaterThanOrEqual(0);expect(fixture.survived).toBeGreaterThanOrEqual(0);
  await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:fixture.world.seed,introDismissed:true}}},undefined,{expectCanvas:false});await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();await page.getByRole('button',{name:'Show offspring',exact:true}).click();await page.getByText('Explore chance: repeat this round',{exact:true}).click();for(let i=0;i<4;i++)await page.getByRole('button',{name:'Try five trials',exact:true}).click();await page.locator('#ei-chance-trial').selectOption(String(fixture.empty));await page.getByText('Who survived? Follow an individual',{exact:true}).click();await page.locator('#ei-chance-resident').selectOption(String(fixture.next.history[1].survivors[0]));await page.getByText('Chance microscope: see the survival draw',{exact:true}).click();const panel=page.locator('.ei-draw-microscope');
  await panel.getByRole('button',{name:'Reveal this trial’s draw',exact:true}).click();await expect(panel.locator('[data-trial-survived]')).toHaveAttribute('data-trial-survived','false');expect(Number(await panel.locator('[data-trial-draw]').getAttribute('data-trial-draw'))).toBeGreaterThanOrEqual(Number(await panel.locator('[data-trial-threshold]').getAttribute('data-trial-threshold')));await expect(panel).toContainText('The recorded round keeps its own outcome.');
  await page.locator('[data-resident-trial-chip="'+(fixture.survived+1)+'"]').click();await panel.getByRole('button',{name:'Reveal this trial’s draw',exact:true}).click();await expect(panel.locator('[data-trial-survived]')).toHaveAttribute('data-trial-survived','true');expect(Number(await panel.locator('[data-trial-draw]').getAttribute('data-trial-draw'))).toBeLessThan(Number(await panel.locator('[data-trial-threshold]').getAttribute('data-trial-threshold')));
  await panel.getByRole('button',{name:'Test the exact threshold',exact:true}).click();await expect(panel.locator('[data-practice-survived]')).toHaveAttribute('data-practice-survived','false');await expect(page.locator('.ei-map-creature')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);await page.getByRole('button',{name:'Finish walkthrough',exact:true}).click();await expect(panel).toHaveCount(0);await expect(page.locator('.ei-stage')).toBeFocused();
});
