import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 120_000, retries: 0, mode: 'serial' });
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
  await page.selectOption('#ei-predict', 'more');
  await page.getByRole('button', { name: 'Lock my prediction' }).click();
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Next generation' }).click();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '5');
  await expect(page.getByText('Five generations later:', { exact: false })).toBeVisible();
  await page.locator('.ei-app').screenshot({ path: report + '/winter-generation-five.png' });
  const contexts = await harness.glContexts(page);
  expect(contexts.filter(r => r.connected && !r.lost)).toHaveLength(1);
  expect(contexts.find(r => r.connected)?.id).toBe(initialContexts.find(r => r.connected)?.id);
  await page.locator('#ei-time').fill('0');
  await expect(page.getByRole('button', { name: 'Next generation' })).toBeDisabled();
  await page.getByRole('button', { name: 'Return to present' }).click();
  await page.getByRole('button', { name: 'Save finding to journal' }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await downloaded).suggestedFilename()).toBe('living-island-2026.csv');
  await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '5');
  await expect(page.getByRole('button', { name: 'Play evolution', exact: false })).toBeVisible();
  await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  await expect(page.getByText('Five generations later:', { exact: false })).toBeVisible();
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
});

test('guided investigation pauses at its result, records reviewed evidence, and resumes its field notes', async ({ page }) => {
  await harness.mount(page, { evoLab: { view: 'livingIsland', evoProgress: { notes: { livingIsland: { text: 'My own explanation stays here.', at: '2026-09-26T00:00:00Z' } } } } });
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
  await page.getByRole('button', { name: 'Review the evidence', exact: true }).click();
  await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'survivors');
  await page.locator('.ei-stage').screenshot({ path: report + '/survival-replay.png' });
  await page.locator('.ei-replay').screenshot({ path: report + '/generation-evidence.png' });
  await page.getByRole('button', { name: 'Collect field note', exact: true }).click();
  await expect(page.getByText('1/3 · field notes collected', { exact: true })).toBeVisible();
  await page.locator('.ei-investigations').screenshot({ path: report + '/investigation-complete.png' });
  expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(evidence);
  const study = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!));
  expect(study.mission).toMatchObject({ kind: 'cold', start: 0, reviewedAt: 5, saved: true });
  expect(study.notes.cold).toContain('G0–G5');
  await page.getByRole('button', { name: 'Save finding to journal', exact: true }).click();
  const journal = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  expect(journal.livingIsland.text).toBe('My own explanation stays here.');
  expect(journal.livingIslandCold.text).toBe(study.notes.cold);
  expect(journal.livingIslandData.text).toContain('Living Island · seed 2026');
  await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  await expect(page.getByRole('button', { name: 'Field note collected', exact: false })).toBeDisabled();
  await expect(page.getByText('1/3 · field notes collected', { exact: true })).toBeVisible();
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
