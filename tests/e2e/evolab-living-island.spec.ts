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
  await expect(page.getByRole('button', { name: 'Next generation', exact: false })).toBeDisabled();
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
