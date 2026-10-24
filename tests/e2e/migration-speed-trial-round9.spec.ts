import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// Every scenario is independent and reads geometry actually submitted to WebGL.
test.describe.configure({ retries: 0, timeout: 180_000 });
const report = process.env.MIGRATION_REPORT_DIR ? join(process.env.MIGRATION_REPORT_DIR, 'round9') : join(process.cwd(), 'reports/migration-deep-review-round9-2026-10-18');
const axeSource = readFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');
const harness = new GlHarness({
  toolFile: process.env.MIG_TOOL_FILE || 'stem_lab/stem_tool_migration.js', toolId: 'migration',
  width: 1100, height: 900, layout: 'document', appStyles: true,
  probes: `var vp=document.createElement('meta');vp.name='viewport';vp.content='width=device-width,initial-scale=1';document.head.appendChild(vp);document.querySelector('#wrap').style.width='min(100vw,1100px)';document.body.style.fontFamily='system-ui,sans-serif';document.body.style.background='#f8fafc';`
});
test.beforeAll(async () => { await mkdir(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function frames(page: Page, count = 3) {
  const start = await page.evaluate(() => (window as any).__glScene()?.renders || 0);
  await page.waitForFunction(({ start, count }) => ((window as any).__glScene()?.renders || 0) >= start + count,
    { start, count }, { timeout: 60_000 });
}
async function mount(page: Page, seed: Record<string, unknown> = {}, motion: 'reduce' | 'no-preference' = 'reduce') {
  await page.emulateMedia({ reducedMotion: motion });
  await harness.mount(page, { migration: { tab: 'flight3d', flightCamera: 'chase', flightPaused: true,
    flightSpecies: 'canada_goose', flightWind: 0, ...seed } },
    'document.querySelector(".migration-flight-stage")?.getAttribute("data-flight-ready")==="true"');
  expect(await harness.glScene(page)).toMatchObject({ hasScene: true });
  await page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec;
    const original = record.scene.onBeforeRender;
    record.scene.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) {
      record.camera = camera;
      if (original) original.call(this, renderer, scene, camera, ...rest);
    };
  });
  await frames(page);
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.migration)));
}
async function wind(page: Page, value: number) {
  const control = page.getByRole('slider', { name: /Along-route wind in meters per second/ });
  await control.fill(String(value)); await expect(control).toHaveValue(String(value)); await frames(page);
}
async function theme(page: Page, dark: boolean) {
  await page.evaluate(dark => {
    (window as any).__ctx.isDark = dark; (window as any).__ctx.theme = dark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', dark);
    document.body.style.background = dark ? '#0f172a' : '#f8fafc'; (window as any).__rerender();
  }, dark); await frames(page);
}
function snapshot(speciesId: string, wind: number, season = 'fall', formationMode = 'natural') {
  const airspeed = ({ canada_goose: 40, snow_goose: 50, monarch: 12 } as Record<string, number>)[speciesId];
  const formation = formationMode === 'natural' ? (speciesId === 'monarch' ? 'swarm' : 'v') : formationMode;
  return { speciesId, season, wind, formationMode, formation,
    groundSpeed: Math.max(0, Math.round(airspeed + wind * 2.237)), benefit: speciesId === 'monarch' || formation === 'solo' ? 0 : formation === 'v' ? 22 : formation === 'loose' ? 8 : 0 };
}
function evidenceSeed() {
  const baseline = snapshot('canada_goose', 0);
  return { flightSeason: 'spring', flightFormation: 'solo', flightWind: -4,
    flightInvestigation: { variable: 'wind', prediction: 'A following wind increases ground speed while airspeed stays fixed.',
      baseline, trials: [{ id: 1, variable: 'wind', prediction: 'First saved prediction.', baseline, snapshot: snapshot('canada_goose', 10) },
        { id: 2, variable: 'formation', prediction: 'Second saved prediction.', baseline, snapshot: snapshot('snow_goose', -10, 'spring', 'solo') }],
      evidence: 'Keep my observed numbers and the note about a confounded trial.', explanation: 'This teaching model holds species airspeed fixed.' },
    flightStudyObservations: { drafts: { 'canada_goose:head': 'Keep this unfinished anatomy note.' }, records: {}, comparison: { draft: 'Keep this comparison draft.' } },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep this mission prediction.' } } },
    inquiryTrials: [{ condition: 'Keep this other investigation.' }],
    aiExplorerText: 'Keep this route explanation.', selectedSpecies: 'canada_goose' };
}

async function vectors(page: Page) {
  return page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec, scene = record?.scene, camera = record?.camera, THREE = (window as any).THREE;
    const root = scene?.getObjectByName('migration-speed-vectors');
    if (!root || !camera) throw new Error('Submitted speed vector scene and camera are unavailable');
    scene.updateMatrixWorld(true);
    const shown = (object: any) => { for (let part = object; part; part = part.parent) if (!part.visible) return false; return true; };
    const point = new THREE.Vector3();
    const canvasNode = document.querySelector('.migration-flight-stage canvas');
    if (!canvasNode) throw new Error('Submitted speed canvas bounds are unavailable');
    const canvasRect = canvasNode.getBoundingClientRect();
    const rect = (selector: string) => {
      const element = document.querySelector(selector), box = element?.getBoundingClientRect();
      return box && box.width > 0 && box.height > 0 ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom } : null;
    };
    const arrows = ['air', 'wind', 'ground'].map(id => {
      const arrow = root.getObjectByName('migration-speed-' + id);
      if (!arrow) throw new Error('Missing submitted ' + id + ' speed geometry');
      let vertices = 0, finite = true, inView = 0, renderables = 0;
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity], transforms: any[] = [];
      const screen = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
      arrow.traverse((part: any) => {
        const positions = part.geometry?.attributes?.position;
        if (!positions || !shown(part)) return;
        renderables++; transforms.push({ name: part.name, position: part.position.toArray(), scale: part.scale.toArray(), quaternion: part.quaternion.toArray() });
        for (let index = 0; index < positions.count; index++) {
          vertices++; point.fromBufferAttribute(positions, index).applyMatrix4(part.matrixWorld);
          const coordinates = point.toArray(); finite = finite && coordinates.every(Number.isFinite);
          coordinates.forEach((value: number, axis: number) => { min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value); });
          point.project(camera);
          const screenX = canvasRect.left + (point.x + 1) * canvasRect.width / 2;
          const screenY = canvasRect.top + (1 - point.y) * canvasRect.height / 2;
          screen.left = Math.min(screen.left, screenX); screen.right = Math.max(screen.right, screenX);
          screen.top = Math.min(screen.top, screenY); screen.bottom = Math.max(screen.bottom, screenY);
          if (Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && point.z >= -1 && point.z <= 1) inView++;
        }
      });
      return { id, uuid: arrow.uuid, visible: shown(arrow), mph: arrow.userData.mph,
        origin: arrow.getWorldPosition(new THREE.Vector3()).toArray(),
        start: arrow.userData.start, tip: arrow.userData.tip, vertices, finite, inView, renderables,
        min: vertices ? min : null, max: vertices ? max : null, screen: vertices ? screen : null, transforms };
    });
    return { scene: scene.uuid, uuid: root.uuid, visible: shown(root), unitsPerMph: root.userData.unitsPerMph,
      canvas: { left: canvasRect.left, right: canvasRect.right, top: canvasRect.top, bottom: canvasRect.bottom },
      hud: { route: rect('.migration-flight-route'), key: rect('.migration-flight-layer-key') },
      arrows, camera: camera.position.toArray(), data: JSON.parse(JSON.stringify((window as any).__toolData.migration)) };
  });
}

function expectSpeeds(state: any, airspeed: number, windMs: number) {
  expect(state.visible).toBe(true); expect(state.unitsPerMph).toBeGreaterThan(0);
  const expected = { air: airspeed, wind: windMs * 2.237, ground: Math.max(0, Math.round(airspeed + windMs * 2.237)) } as Record<string, number>;
  for (const arrow of state.arrows) {
    expect(arrow.mph).toBeCloseTo(expected[arrow.id], 5); expect(arrow.finite).toBe(true);
    if (expected[arrow.id] === 0) { expect(arrow.visible).toBe(false); expect(arrow.renderables).toBe(0); continue; }
    expect(arrow.visible).toBe(true); expect(arrow.vertices).toBeGreaterThan(10); expect(arrow.inView).toBeGreaterThan(0);
    expect(arrow.max[2] - arrow.min[2]).toBeCloseTo(Math.abs(expected[arrow.id]) * state.unitsPerMph, 1);
    // Check the submitted solid vertices against the actual group origin.
    // Correct metadata alone cannot hide geometry pointing the wrong way.
    const renderedDelta = -expected[arrow.id] * state.unitsPerMph;
    expect(arrow.min[2]).toBeCloseTo(arrow.origin[2] + Math.min(0, renderedDelta), 5);
    expect(arrow.max[2]).toBeCloseTo(arrow.origin[2] + Math.max(0, renderedDelta), 5);
    const delta = arrow.tip[2] - arrow.start[2];
    expect(Math.sign(delta)).toBe(-Math.sign(expected[arrow.id]));
    expect(Math.abs(delta)).toBeCloseTo(Math.abs(expected[arrow.id]) * state.unitsPerMph, 5);
  }
}

function expectClearOfHud(state: any, margin = 4) {
  for (const arrow of state.arrows.filter((item: any) => item.visible && item.vertices)) {
    expect(arrow.inView, arrow.id + ' solid vertices fit the canvas').toBe(arrow.vertices);
    for (const [name, box] of Object.entries(state.hud) as [string, any][]) {
      if (!box) continue;
      const overlapsX = arrow.screen.right > box.left && arrow.screen.left < box.right;
      if (!overlapsX) continue;
      const clearAbove = arrow.screen.bottom <= box.top - margin;
      const clearBelow = arrow.screen.top >= box.bottom + margin;
      expect(clearAbove || clearBelow, arrow.id + ' geometry clears the ' + name + ' HUD by ' + margin + 'px: ' + JSON.stringify({ geometry: arrow.screen, hud: box })).toBe(true);
    }
  }
}

// CASES
test('Migration opt-in speed arrows use one actual geometry scale for tailwind, headwind, calm and clamped ground speed', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(page);
  const control = page.getByRole('checkbox', { name: 'Show speed vectors', exact: true });
  await expect(control).not.toBeChecked(); expect((await vectors(page)).visible).toBe(false);
  await control.check(); await frames(page);
  const calm = await vectors(page); expectSpeeds(calm, 40, 0);
  const reviewed: any[] = [calm];
  for (const value of [10, -10, 25, 0]) {
    await wind(page, value); const state = await vectors(page); expectSpeeds(state, 40, value); reviewed.push(state);
    expect(state.unitsPerMph).toBe(calm.unitsPerMph); expect(state.uuid).toBe(calm.uuid); expect(state.arrows.map((row: any) => row.uuid)).toEqual(calm.arrows.map((row: any) => row.uuid));
  }
  await wind(page, 10); await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('snow_goose'); await frames(page);
  const snow = await vectors(page); expectSpeeds(snow, 50, 10); expect(snow.unitsPerMph).toBe(calm.unitsPerMph); reviewed.push(snow);
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('monarch'); await wind(page, -15);
  const clamped = await vectors(page); expectSpeeds(clamped, 12, -15); expect(clamped.unitsPerMph).toBe(calm.unitsPerMph); reviewed.push(clamped);
  const key = page.locator('.migration-flight-layer-key'); await expect(key).toContainText('0 mph');
  await expect(page.locator('[data-speed-vector-note]')).toContainText('holds ground speed at zero');
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('canada_goose'); await wind(page, 10);
  await expect(page.locator('[data-speed-role=air]')).toHaveText('Airspeed: 40 mph');
  await expect(page.locator('[data-speed-role=wind]')).toHaveText('Along-route wind: +22.4 mph');
  await expect(page.locator('[data-speed-role=ground]')).toHaveText('Ground speed: 62 mph');
  await expect(page.locator('#migration-flight-stage')).toHaveAttribute('aria-label', /Ground speed: 62 mph/);
  for (const camera of ['Chase', 'Aerial', 'Side']) {
    await page.getByRole('button', { name: camera, exact: true }).click(); await frames(page);
    const state = await vectors(page); expectSpeeds(state, 40, 10); reviewed.push(state);
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-speed-vectors-' + camera.toLowerCase() + '.png') });
  }
  await wind(page, -15);
  await page.getByRole('button', { name: 'Aerial', exact: true }).click(); await frames(page);
  const aerialHeadwind = await vectors(page); expectSpeeds(aerialHeadwind, 40, -15); expectClearOfHud(aerialHeadwind); reviewed.push(aerialHeadwind);
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-aerial-headwind.png') });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'desktop-speed-vector-review.json'), JSON.stringify(reviewed, null, 2));
});

test('Migration speed vectors remain readable while paused and Reduce motion is on, and Study hides the speed layer without losing its toggle', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { flightShowSpeedVectors: true, flightShowAirflow: true, flightWind: 10 });
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await frames(page);
  const paused = await vectors(page); expectSpeeds(paused, 40, 10); await frames(page, 6);
  const still = await vectors(page); expect(still.arrows).toEqual(paused.arrows);
  await expect(page.locator('.migration-flight-layer-key')).toHaveCount(1);
  await page.getByRole('button', { name: 'Resume flight', exact: true }).click(); await frames(page, 6);
  const moving = await vectors(page); expectSpeeds(moving, 40, 10);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await frames(page);
  const reduced = await vectors(page); await frames(page, 6); const reducedStill = await vectors(page);
  expect(reducedStill.arrows).toEqual(reduced.arrows); expectSpeeds(reducedStill, 40, 10);
  await page.getByRole('button', { name: 'Study', exact: true }).click(); await frames(page);
  const isolated = await vectors(page); expect(isolated.visible).toBe(false); expect(isolated.arrows.every((arrow: any) => !arrow.visible && !arrow.renderables)).toBe(true);
  await expect(page.getByRole('checkbox', { name: 'Show speed vectors', exact: true })).toBeChecked();
  await expect(page.locator('.migration-flight-layer-key')).toHaveCount(1);
  await expect(page.locator('.migration-flight-layer-key')).toHaveAttribute('data-speed-vectors', 'false');
  await expect(page.locator('[data-speed-role]')).toHaveCount(0);
  await expect(page.locator('[data-speed-vector-note]')).toContainText('hidden in Study');
  await page.getByRole('button', { name: 'Chase', exact: true }).click(); await frames(page);
  const restored = await vectors(page); expectSpeeds(restored, 40, 10); expect(restored.uuid).toBe(paused.uuid);
  await page.getByRole('checkbox', { name: 'Show wingtip airflow', exact: true }).uncheck();
  await expect(page.locator('.migration-flight-layer-key')).toHaveCount(1);
  await page.getByRole('checkbox', { name: 'Show speed vectors', exact: true }).uncheck(); await frames(page);
  expect((await vectors(page)).visible).toBe(false); await expect(page.locator('.migration-flight-layer-key')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'desktop-speed-motion-review.json'), JSON.stringify({ paused, still, moving, reduced, reducedStill, isolated, restored }, null, 2));
});

function retainedLearning(data: Record<string, unknown>) {
  const result = { ...data };
  for (const key of ['flightSpecies', 'flightSeason', 'flightFormation', 'flightWind', 'flightCamera', 'flightPaused', 'flightShowSpeedVectors']) delete result[key];
  return result;
}
async function keyboardReview(page: Page, name: string, expected: Record<string, unknown>) {
  const button = page.getByRole('button', { name, exact: true }); await button.focus(); await page.keyboard.press('Enter'); await frames(page);
  const data = await saved(page); expect(data).toMatchObject({ ...expected, flightCamera: 'chase', flightPaused: true, flightShowSpeedVectors: true });
  await expect(page.locator('#migration-flight-stage')).toBeFocused();
  return data;
}

test('Migration keyboard review restores each historical trial pair while preserving the current baseline and all learner work', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); const seed: any = evidenceSeed();
  seed.flightInvestigation.baseline = snapshot('monarch', -15, 'spring', 'swarm');
  await mount(page, { ...seed, flightCamera: 'study', flightShowSpeedVectors: false });
  const before = await saved(page), status = page.locator('[data-experiment-revisit-status]');
  const first = await keyboardReview(page, 'Revisit trial 1', { flightSpecies: 'canada_goose', flightSeason: 'fall', flightFormation: 'natural', flightWind: 10 });
  expect(retainedLearning(first)).toEqual(retainedLearning(before)); await expect(status).toContainText('Revisited trial 1'); expectSpeeds(await vectors(page), 40, 10);
  const historical = await keyboardReview(page, 'Revisit baseline for trial 1', { flightSpecies: 'canada_goose', flightSeason: 'fall', flightFormation: 'natural', flightWind: 0 });
  expect(retainedLearning(historical)).toEqual(retainedLearning(before)); await expect(status).toContainText('Revisited baseline for trial 1'); expectSpeeds(await vectors(page), 40, 0);
  const second = await keyboardReview(page, 'Revisit trial 2', { flightSpecies: 'snow_goose', flightSeason: 'spring', flightFormation: 'solo', flightWind: -10 });
  expect(retainedLearning(second)).toEqual(retainedLearning(before)); expectSpeeds(await vectors(page), 50, -10);
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-revisited-trial-vectors.png') });
  await wind(page, -9); await expect(status).toBeEmpty();
  await keyboardReview(page, 'Revisit trial 2', { flightSpecies: 'snow_goose', flightSeason: 'spring', flightFormation: 'solo', flightWind: -10 });
  const restore = page.getByRole('button', { name: 'Restore baseline controls', exact: true }); await restore.focus(); await page.keyboard.press('Enter'); await frames(page);
  const currentBaseline = await saved(page);
  expect(currentBaseline).toMatchObject({ flightSpecies: 'monarch', flightSeason: 'spring', flightFormation: 'swarm', flightWind: -15, flightCamera: 'chase', flightPaused: true, flightShowSpeedVectors: true });
  expect(retainedLearning(currentBaseline)).toEqual(retainedLearning(before)); await expect(status).toBeEmpty(); expectSpeeds(await vectors(page), 12, -15);
  await page.locator('[data-migration-flight-investigation]').screenshot({ path: join(report, 'desktop-paired-trial-review.png') });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'desktop-trial-revisit-review.json'), JSON.stringify({ before, first, historical, second, currentBaseline }, null, 2));
});

test('Migration readable legacy trials are reviewed with recalculated speeds and transient feedback clears when rows change', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); const seed: any = evidenceSeed();
  seed.flightInvestigation.trials[0].snapshot.groundSpeed = 9999; seed.flightInvestigation.trials[0].snapshot.benefit = 99;
  seed.flightInvestigation.trials.unshift({ id: 99, variable: 'wind', baseline: snapshot('canada_goose', 0), snapshot: { speciesId: '__proto__', wind: 'oops' } });
  seed.flightInvestigation.trials.push(null);
  await mount(page, seed); const before = await saved(page), status = page.locator('[data-experiment-revisit-status]');
  await expect(page.locator('[data-experiment-trial]')).toHaveCount(2);
  await expect(page.getByText('Some saved observations could not be read. Your readable trials and notes are still available.', { exact: true })).toBeVisible();
  const first = await keyboardReview(page, 'Revisit trial 1', { flightSpecies: 'canada_goose', flightSeason: 'fall', flightFormation: 'natural', flightWind: 10 });
  expect(first.flightInvestigation).toEqual(before.flightInvestigation); expect(retainedLearning(first)).toEqual(retainedLearning(before)); expectSpeeds(await vectors(page), 40, 10);
  await keyboardReview(page, 'Revisit trial 2', { flightSpecies: 'snow_goose', flightSeason: 'spring', flightFormation: 'solo', flightWind: -10 });
  await page.getByRole('button', { name: 'Remove trial 1', exact: true }).click(); await frames(page);
  await expect(page.locator('[data-experiment-trial]')).toHaveCount(1); await expect(status).toBeEmpty();
  await keyboardReview(page, 'Revisit trial 1', { flightSpecies: 'snow_goose', flightSeason: 'spring', flightFormation: 'solo', flightWind: -10 });
  await expect(status).toContainText('Revisited trial 1');
  await page.evaluate(() => { (window as any).__toolData.migration.flightInvestigation.trials[0].snapshot.wind = 7; (window as any).__rerender(); });
  await frames(page); await expect(status).toBeEmpty();
  const updated = await keyboardReview(page, 'Revisit trial 1', { flightSpecies: 'snow_goose', flightSeason: 'spring', flightFormation: 'solo', flightWind: 7 });
  expectSpeeds(await vectors(page), 50, 7);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'desktop-legacy-trial-review.json'), JSON.stringify({ before, first, updated }, null, 2));
});

for (const dark of [false, true]) test.describe('phone ' + (dark ? 'dark' : 'light'), () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Migration native touch speed layers and paired trial review fit the viewport and pass accessibility checks', async ({ page }) => {
    await mount(page, evidenceSeed()); await theme(page, dark);
    const control = page.getByRole('checkbox', { name: 'Show speed vectors', exact: true }); await control.tap(); await expect(control).toBeChecked(); await frames(page);
    const initial = await vectors(page); expectSpeeds(initial, 40, -4);
    await page.getByRole('checkbox', { name: 'Show wingtip airflow', exact: true }).tap();
    await expect(page.locator('.migration-flight-layer-key')).toHaveCount(1);
    await page.getByRole('button', { name: 'Revisit trial 2', exact: true }).tap(); await frames(page);
    const revisited = await vectors(page); expectSpeeds(revisited, 50, -10);
    const status = page.locator('[data-experiment-revisit-status]'); await expect(status).toContainText('Revisited trial 2');
    await page.getByRole('button', { name: 'Revisit baseline for trial 2', exact: true }).tap(); await frames(page);
    const baseline = await vectors(page); expectSpeeds(baseline, 40, 0);
    expect(baseline.data.flightInvestigation).toEqual(initial.data.flightInvestigation);
    await expect(status).toContainText('Revisited baseline for trial 2');
    const stem = 'mobile-' + (dark ? 'dark' : 'light') + '-speed-trial';
    await wind(page, -15);
    await page.getByRole('button', { name: 'Aerial', exact: true }).tap(); await frames(page);
    const aerialHeadwind = await vectors(page); expectSpeeds(aerialHeadwind, 40, -15); expectClearOfHud(aerialHeadwind);
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, stem + '-aerial-headwind.png') });
    await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('peregrine'); await wind(page, 25);
    const aerialTailwind = await vectors(page); expectSpeeds(aerialTailwind, 60, 25); expectClearOfHud(aerialTailwind);
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, stem + '-aerial-max-tailwind.png') });
    await page.getByRole('button', { name: 'Revisit baseline for trial 2', exact: true }).tap(); await frames(page);
    const restoredBaseline = await vectors(page); expectSpeeds(restoredBaseline, 40, 0); expectClearOfHud(restoredBaseline);
    expect(restoredBaseline.data.flightInvestigation).toEqual(initial.data.flightInvestigation);
    await expect(status).toContainText('Revisited baseline for trial 2');
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, stem + '-stage.png') });
    await page.addScriptTag({ content: axeSource });
    const review = await page.evaluate(async () => {
      const axe = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        violations: axe.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary })) })),
        errors: (window as any).__events.errors };
    });
    await page.screenshot({ path: join(report, stem + '.png'), fullPage: true });
    await writeFile(join(report, stem + '.json'), JSON.stringify({ ...review, initial, revisited, baseline, aerialHeadwind, aerialTailwind, restoredBaseline }, null, 2));
    expect(review.viewport).toBe(390); expect(review.scrollWidth).toBeLessThanOrEqual(390); expect(review.violations).toEqual([]); expect(review.errors).toEqual([]);
  });
});
