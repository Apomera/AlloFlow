import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 180_000 });
const report = process.env.MIGRATION_REPORT_DIR ? join(process.env.MIGRATION_REPORT_DIR, 'round10') : join(process.cwd(), 'reports/migration-deep-review-round10-2026-10-18');
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
  await harness.mount(page, { migration: { tab: 'flight3d', flightCamera: 'study', flightPaused: true,
    flightSpecies: 'canada_goose', flightWind: 0, flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, ...seed } },
    'document.querySelector(".migration-flight-stage")?.getAttribute("data-flight-ready")==="true"');
  expect(await harness.glScene(page)).toMatchObject({ hasScene: true });
  await page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec;
    const original = record.scene.onBeforeRender;
    record.scene.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) {
      record.camera = camera;
      if (original) original.call(this, renderer, scene, camera, ...rest);
    };
  }); await frames(page);
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.migration)));
}
async function theme(page: Page, dark: boolean) {
  await page.evaluate(dark => {
    (window as any).__ctx.isDark = dark; (window as any).__ctx.theme = dark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', dark);
    document.body.style.background = dark ? '#0f172a' : '#f8fafc'; (window as any).__rerender();
  }, dark); await frames(page);
}
function snapshot(speciesId: string, wind: number, season = 'fall', formationMode = 'natural') {
  return { speciesId, wind, season, formationMode };
}
function evidenceSeed() {
  const historical = snapshot('canada_goose', 0);
  return { flightSeason: 'fall', flightFormation: 'natural', flightWind: 6,
    flightInvestigation: { variable: 'wind', prediction: 'Keep my current prediction, separate from the saved pair.',
      baseline: snapshot('monarch', -15, 'spring', 'swarm'),
      trials: [{ id: 1, variable: 'wind', prediction: 'Original first pair: tailwind changes ground speed.', baseline: historical, snapshot: snapshot('canada_goose', 10) },
        { id: 2, variable: 'formation', prediction: 'Original second pair: compare this confounded change carefully.', baseline: snapshot('snow_goose', 5, 'spring', 'solo'), snapshot: snapshot('snow_goose', -10, 'spring', 'v') }],
      evidence: 'Keep my existing observation and numbers.', explanation: 'Keep this ungraded explanation.' },
    flightStudyObservations: { drafts: { 'canada_goose:head': 'Keep an unfinished shape observation.' }, records: {}, comparison: { draft: 'Keep an unfinished comparison.' } },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep a challenge prediction.', notes: 'Keep this challenge reasoning.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep this energy inquiry.', explanation: 'Keep this energy explanation.', trials: [] },
    aiExplorerText: 'Keep route facts.', selectedSpecies: 'canada_goose' };
}
function retainedLearning(data: Record<string, unknown>) {
  const result = { ...data };
  for (const key of ['flightSpecies', 'flightSeason', 'flightFormation', 'flightWind', 'flightCamera', 'flightPaused', 'flightShowSpeedVectors']) delete result[key];
  return result;
}
async function keyboardClick(page: Page, locator: ReturnType<Page['getByRole']>) {
  await locator.focus(); await page.keyboard.press('Enter'); await frames(page);
}
async function pair(page: Page) {
  const tray = page.locator('[data-experiment-pair-review]'); await expect(tray).toBeVisible(); return tray;
}

async function pose(page: Page) {
  return page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec, scene = record?.scene, camera = record?.camera, THREE = (window as any).THREE;
    const root = scene?.getObjectByName('migration-marked-wing-pose'), flock = scene?.getObjectByName('migration-flock');
    if (!root || !camera || !flock) throw new Error('Submitted marked pose, flock or camera is unavailable');
    scene.updateMatrixWorld(true);
    const data = (window as any).__toolData.migration;
    const selected = flock.children[Math.max(0, Math.min(flock.children.length - 1, Number(data.flightStudyBird) || 0))];
    const bird = flock.children.find((item: any) => item.uuid === root.userData.sourceBirdUuid) || selected;
    const sources = root.userData.sources || [], positions = root.geometry.attributes.position, distances = root.geometry.attributes.lineDistance;
    const rawCount = Number(root.geometry.drawRange.count);
    const count = Number.isFinite(rawCount) ? Math.max(0, Math.min(positions.count, rawCount)) : 0;
    const frozen = Array.from(positions.array.slice(0, count * 3)) as number[];
    const expected: number[] = [], sourceReview: any[] = [], point = new THREE.Vector3(), projected = new THREE.Vector3();
    const inverseBird = new THREE.Matrix4().copy(bird.matrixWorld).invert();
    let maximumError = 0, allSourcesFound = true, inView = 0, extent = 0;
    for (const source of sources) {
      let node: any = null; bird.traverse((part: any) => { if (part.uuid === source.nodeUuid) node = part; });
      if (!node?.geometry) { allSourcesFound = false; continue; }
      // Reconstruct the actual membrane rim before its decorative cells/spots,
      // or independently extract the ordinary submitted wing mesh boundary.
      const membraneRim = Number(node.geometry.userData.monarchBoundaryVertexCount) || 0;
      const boundary = membraneRim ? null : new THREE.EdgesGeometry(node.geometry, 180);
      const vertices = membraneRim ? node.geometry.attributes.position : boundary.attributes.position;
      const vertexIndices = membraneRim ? Array.from({ length: membraneRim }, (_, index) => [index, (index + 1) % membraneRim]).flat()
        : Array.from({ length: vertices.count }, (_, index) => index);
      sourceReview.push({ nodeUuid: node.uuid, name: node.name, geometryUuid: node.geometry.uuid, role: source.role, side: source.side,
        offset: source.offset, capturedVertices: source.vertexCount, actualVertices: vertexIndices.length,
        boundaryVertices: membraneRim, capturedBoundaryVertices: source.boundaryVertexCount || 0, fullMeshVertices: node.geometry.attributes.position.count });
      for (const index of vertexIndices) {
        point.fromBufferAttribute(vertices, index).applyMatrix4(node.matrixWorld).applyMatrix4(inverseBird);
        expected.push(point.x, point.y, point.z);
      }
      if (boundary) boundary.dispose();
    }
    for (let index = 0; index < Math.min(expected.length, frozen.length); index++) maximumError = Math.max(maximumError, Math.abs(expected[index] - frozen[index]));
    for (let index = 0; index < count; index++) {
      projected.fromBufferAttribute(positions, index).applyMatrix4(root.matrixWorld).project(camera);
      extent = Math.max(extent, Math.abs(projected.x), Math.abs(projected.y));
      if (Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1 && projected.z >= -1 && projected.z <= 1) inView++;
    }
    const shown = (object: any) => { for (let part = object; part; part = part.parent) if (!part.visible) return false; return true; };
    return { visible: shown(root), type: root.type, captured: root.userData.captured === true,
      geometry: root.geometry.uuid, material: root.material.uuid, materialType: root.material.type,
      capacity: positions.count, count, frozen, expected, maximumError, allSourcesFound, sourceReview,
      lineDistances: distances ? Array.from(distances.array.slice(0, count)) : [],
      finite: frozen.every(Number.isFinite), inView, extent,
      rootMatrix: root.matrixWorld.elements.slice(), birdMatrix: bird.matrixWorld.elements.slice(),
      sourceBirdUuid: root.userData.sourceBirdUuid, selectedBirdUuid: selected.uuid,
      speciesId: root.userData.speciesId, individual: root.userData.individual,
      camera: camera.position.toArray(), data: JSON.parse(JSON.stringify(data)) };
  });
}
function expectCaptured(state: any, alignedWithCurrent = true) {
  expect(state.captured).toBe(true); expect(state.visible).toBe(true); expect(state.type).toBe('LineSegments');
  expect(state.materialType).toBe('LineDashedMaterial'); expect(state.count).toBeGreaterThan(20); expect(state.count).toBeLessThanOrEqual(state.capacity);
  expect(state.count % 2).toBe(0); expect(state.finite).toBe(true); expect(state.allSourcesFound).toBe(true);
  expect(state.lineDistances).toHaveLength(state.count); expect(state.lineDistances.every(Number.isFinite)).toBe(true);
  expect(state.sourceReview.reduce((sum: number, source: any) => sum + source.actualVertices, 0)).toBe(state.count);
  for (const source of state.sourceReview) { expect(source.capturedVertices).toBe(source.actualVertices); }
  expect(state.inView).toBe(state.count); expect(state.extent).toBeLessThan(1);
  state.rootMatrix.forEach((value: number, index: number) => expect(value).toBeCloseTo(state.birdMatrix[index], 6));
  if (alignedWithCurrent) { expect(state.expected).toHaveLength(state.frozen.length); expect(state.maximumError).toBeLessThan(0.00001); }
}


// CASES
test('Migration marked wing pose captures the actual rendered mesh boundaries, stays frozen through wing steps and follows the individual while orbiting', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(page);
  const initial = await pose(page); expect(initial.captured).toBe(false); expect(initial.visible).toBe(false);
  await keyboardClick(page, page.getByRole('button', { name: 'Mark wing pose', exact: true }));
  const marked = await pose(page); expectCaptured(marked);
  await expect(page.locator('[data-marked-pose-status]')).toHaveAttribute('data-marked-pose-status', 'marked');
  expect(marked.data.flightPaused).toBe(true); expect(marked.sourceBirdUuid).toBe(marked.selectedBirdUuid);
  expect(marked.sourceReview.some((source: any) => source.name === 'migration-primary-feathers')).toBe(true);
  await keyboardClick(page, page.getByRole('button', { name: 'Step wingbeat', exact: true }));
  const stepped = await pose(page); expectCaptured(stepped, false);
  expect(stepped.frozen).toEqual(marked.frozen); expect(stepped.expected).not.toEqual(marked.expected); expect(stepped.maximumError).toBeGreaterThan(0.01);
  expect(stepped.geometry).toBe(marked.geometry); expect(stepped.material).toBe(marked.material);
  await keyboardClick(page, page.getByRole('button', { name: 'From above', exact: true }));
  const above = await pose(page); expectCaptured(above, false); expect(above.frozen).toEqual(marked.frozen); expect(above.camera).not.toEqual(stepped.camera);
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-frozen-wing-pose-above.png') });
  await keyboardClick(page, page.getByRole('button', { name: 'Profile', exact: true }));
  const profile = await pose(page); expectCaptured(profile, false); expect(profile.frozen).toEqual(marked.frozen);
  await page.locator("[data-migration-id=\"migration-flight-stage\"]").focus(); await page.keyboard.press('ArrowRight'); await frames(page);
  const orbited = await pose(page); expectCaptured(orbited, false); expect(orbited.frozen).toEqual(marked.frozen);
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-frozen-wing-pose-profile.png') });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'desktop-marked-pose-review.json'), JSON.stringify({ initial, marked, stepped, above, profile, orbited }, null, 2));
});

test('Migration marked pose reuses its buffers, clears on individual and flock selection changes, and supports insect wing membranes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(page);
  await page.getByRole('button', { name: 'Mark wing pose', exact: true }).click(); await frames(page);
  const first = await pose(page); expectCaptured(first);
  for (let iteration = 0; iteration < 3; iteration++) {
    await page.getByRole('button', { name: 'Step wingbeat', exact: true }).click(); await frames(page);
    await page.getByRole('button', { name: 'Mark wing pose', exact: true }).click(); await frames(page);
    const replaced = await pose(page); expectCaptured(replaced);
    expect(replaced.geometry).toBe(first.geometry); expect(replaced.material).toBe(first.material); expect(replaced.capacity).toBe(first.capacity);
    await page.getByRole('button', { name: 'Clear marked pose', exact: true }).click(); await frames(page);
    const cleared = await pose(page); expect(cleared.captured).toBe(false); expect(cleared.visible).toBe(false); expect(cleared.count).toBe(0);
    expect(cleared.geometry).toBe(first.geometry); expect(cleared.material).toBe(first.material);
  }
  await page.getByRole('button', { name: 'Mark wing pose', exact: true }).click(); await frames(page);
  const beforeCamera = await pose(page);
  await page.getByRole('button', { name: 'Chase', exact: true }).click(); await frames(page);
  const hidden = await pose(page); expect(hidden.visible).toBe(false); expect(hidden.captured).toBe(true);
  await theme(page, true); await page.getByRole('button', { name: 'Study', exact: true }).click(); await frames(page);
  const restored = await pose(page); expectCaptured(restored); expect(restored.frozen).toEqual(beforeCamera.frozen);
  await page.getByRole('combobox', { name: 'Study individual', exact: true }).selectOption('1'); await frames(page);
  const individual = await pose(page); expect(individual.captured).toBe(false); expect(individual.visible).toBe(false);
  await page.getByRole('button', { name: 'Mark wing pose', exact: true }).click(); await frames(page); expectCaptured(await pose(page));
  await page.getByRole('combobox', { name: '3D migration flight pattern', exact: true }).selectOption('solo'); await frames(page);
  const rebuilt = await pose(page); expect(rebuilt.captured).toBe(false); expect(rebuilt.visible).toBe(false);
  await page.getByRole('button', { name: 'Mark wing pose', exact: true }).click(); await frames(page); expectCaptured(await pose(page));
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('monarch'); await frames(page);
  const changedSpecies = await pose(page); expect(changedSpecies.captured).toBe(false); expect(changedSpecies.visible).toBe(false);
  await page.getByRole('button', { name: 'Mark wing pose', exact: true }).click(); await frames(page);
  const insect = await pose(page); expectCaptured(insect); expect(insect.sourceReview).toHaveLength(4);
  for (const source of insect.sourceReview) {
    expect(source.boundaryVertices).toBeGreaterThan(3); expect(source.capturedBoundaryVertices).toBe(source.boundaryVertices);
    expect(source.fullMeshVertices).toBeGreaterThan(source.boundaryVertices);
    expect(source.capturedVertices).toBe(source.boundaryVertices * 2);
  }
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-marked-monarch-wing-pose.png') });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'desktop-marked-pose-lifecycle.json'), JSON.stringify({ first, hidden, restored, individual, rebuilt, changedSpecies, insect }, null, 2));
});

test('Migration stage-adjacent pair review switches the historical sources by keyboard while preserving every learner record', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); const seed: any = evidenceSeed(); await mount(page, seed);
  const before = await saved(page);
  await keyboardClick(page, page.getByRole('button', { name: 'Revisit baseline for trial 2', exact: true }));
  const tray = await pair(page);
  await expect(tray).toHaveAttribute('data-review-trial', '2'); await expect(tray).toHaveAttribute('data-review-active', 'baseline');
  await expect(tray).toContainText(seed.flightInvestigation.trials[1].prediction);
  await expect(tray.getByRole('button', { name: 'Saved baseline', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const baseline = await saved(page); expect(baseline).toMatchObject({ flightSpecies: 'snow_goose', flightSeason: 'spring', flightFormation: 'solo', flightWind: 5, flightCamera: 'chase', flightPaused: true, flightShowSpeedVectors: true });
  expect(retainedLearning(baseline)).toEqual(retainedLearning(before));
  const stageBounds = await page.locator('.migration-flight-stage').boundingBox(), trayBounds = await tray.boundingBox();
  if (!stageBounds || !trayBounds) throw new Error('Stage-adjacent pair review bounds are missing');
  expect(trayBounds.y).toBeGreaterThanOrEqual(stageBounds.y + stageBounds.height - 1);
  await keyboardClick(page, tray.getByRole('button', { name: 'Saved trial', exact: true }));
  await expect(tray).toHaveAttribute('data-review-active', 'trial');
  await expect(tray.getByRole('button', { name: 'Saved trial', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(tray.getByRole('button', { name: 'Saved baseline', exact: true })).toHaveAttribute('aria-pressed', 'false');
  const trial = await saved(page); expect(trial).toMatchObject({ flightSpecies: 'snow_goose', flightSeason: 'spring', flightFormation: 'v', flightWind: -10 });
  expect(retainedLearning(trial)).toEqual(retainedLearning(before));
  await expect(page.locator("[data-migration-id=\"migration-flight-stage\"]")).toBeFocused();
  await page.getByRole('button', { name: 'Study', exact: true }).click(); await frames(page);
  await expect(tray).toHaveAttribute('data-review-active', 'trial');
  await keyboardClick(page, tray.getByRole('button', { name: 'Saved baseline', exact: true }));
  await keyboardClick(page, tray.getByRole('button', { name: 'Add evidence', exact: true }));
  const evidence = page.getByRole('textbox', { name: 'Evidence I noticed', exact: true }); await expect(evidence).toBeFocused();
  await expect(evidence).toHaveValue(seed.flightInvestigation.evidence);
  const after = await saved(page); expect(retainedLearning(after)).toEqual(retainedLearning(before));
  await tray.getByText('Prediction when recorded', { exact: true }).click();
  await page.locator('.migration-flight-deck').screenshot({ path: join(report, 'desktop-stage-adjacent-pair-review.png') });
  await keyboardClick(page, tray.getByRole('button', { name: 'Close saved trial review', exact: true }));
  await expect(page.locator('[data-experiment-pair-review]')).toHaveCount(0);
  await expect(page.locator("[data-migration-id=\"migration-flight-stage\"]")).toBeFocused();
  expect(await saved(page)).toEqual(after);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'desktop-pair-review.json'), JSON.stringify({ before, baseline, trial, after, stageBounds, trayBounds }, null, 2));
});

test('Migration pair review distinguishes changed controls, hides stale sources and returns focus after removing a final trial without a baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); const seed: any = evidenceSeed(); await mount(page, seed);
  const before = await saved(page);
  await keyboardClick(page, page.getByRole('button', { name: 'Revisit trial 2', exact: true }));
  const tray = await pair(page);
  const wind = page.getByRole('slider', { name: /Along-route wind in meters per second/ }); await wind.fill('-9'); await frames(page);
  await expect(tray).toHaveAttribute('data-review-active', '');
  await expect(tray).toContainText('Current conditions differ from this saved pair.');
  for (const name of ['Saved baseline', 'Saved trial']) await expect(tray.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'false');
  await keyboardClick(page, tray.getByRole('button', { name: 'Saved baseline', exact: true }));
  await expect(tray).toHaveAttribute('data-review-active', 'baseline');
  const evidence = page.getByRole('textbox', { name: 'Evidence I noticed', exact: true });
  await evidence.fill('Keep my revised evidence while the same historical pair remains selected.');
  await expect(tray).toBeVisible(); await expect(tray).toHaveAttribute('data-review-active', 'baseline');
  await page.evaluate(() => { (window as any).__toolData.migration.flightInvestigation.trials[1].prediction += ' Changed source.'; (window as any).__rerender(); });
  await frames(page); await expect(page.locator('[data-experiment-pair-review]')).toHaveCount(0);
  await keyboardClick(page, page.getByRole('button', { name: 'Revisit trial 1', exact: true }));
  await pair(page); await page.getByRole('button', { name: 'Remove trial 1', exact: true }).click(); await frames(page);
  await expect(page.locator('[data-experiment-pair-review]')).toHaveCount(0);
  await expect(page.locator('[data-experiment-trial]')).toHaveCount(1);
  await page.evaluate(() => { (window as any).__toolData.migration.flightInvestigation.baseline = null; (window as any).__rerender(); }); await frames(page);
  await page.getByRole('button', { name: 'Remove trial 1', exact: true }).click(); await frames(page);
  await expect(page.locator('[data-experiment-trial]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Record trial', exact: true })).toBeDisabled();
  await expect(page.getByRole('textbox', { name: 'What do you predict, and why?', exact: true })).toBeFocused();
  const after = await saved(page);
  for (const key of ['flightStudyObservations', 'flightChallenges', 'inquiry']) expect(after[key]).toEqual(before[key]);
  expect(after.flightInvestigation.evidence).toBe('Keep my revised evidence while the same historical pair remains selected.');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'desktop-pair-source-guards.json'), JSON.stringify({ before, after }, null, 2));
});
for (const dark of [false, true]) test.describe('phone ' + (dark ? 'dark' : 'light'), () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Migration native touch marked poses and adjacent historical evidence review stay readable and accessible', async ({ page }) => {
    await mount(page, evidenceSeed()); await theme(page, dark);
    await page.getByRole('button', { name: 'Mark wing pose', exact: true }).tap(); await frames(page);
    const marked = await pose(page); expectCaptured(marked);
    await page.getByRole('button', { name: 'Step wingbeat', exact: true }).tap(); await frames(page);
    await page.getByRole('button', { name: 'From above', exact: true }).tap(); await frames(page);
    const stepped = await pose(page); expectCaptured(stepped, false); expect(stepped.frozen).toEqual(marked.frozen); expect(stepped.maximumError).toBeGreaterThan(0.01);
    const stem = 'mobile-' + (dark ? 'dark' : 'light') + '-pose-pair';
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, stem + '-marked-wing.png') });
    const beforeReview = await saved(page);
    await page.getByRole('button', { name: 'Revisit trial 1', exact: true }).tap(); await frames(page);
    const tray = await pair(page); await expect(tray).toHaveAttribute('data-review-trial', '1'); await expect(tray).toHaveAttribute('data-review-active', 'trial');
    await tray.getByRole('button', { name: 'Saved baseline', exact: true }).tap(); await frames(page);
    const baseline = await saved(page); expect(baseline).toMatchObject({ flightSpecies: 'canada_goose', flightWind: 0, flightSeason: 'fall', flightFormation: 'natural', flightCamera: 'chase', flightPaused: true, flightShowSpeedVectors: true });
    expect(retainedLearning(baseline)).toEqual(retainedLearning(beforeReview)); await expect(tray).toHaveAttribute('data-review-active', 'baseline');
    await tray.getByRole('button', { name: 'Saved trial', exact: true }).tap(); await frames(page);
    const trial = await saved(page); expect(trial.flightWind).toBe(10); expect(retainedLearning(trial)).toEqual(retainedLearning(beforeReview));
    await expect(tray).toHaveAttribute('data-review-active', 'trial');
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, stem + '-saved-trial-stage.png') });
    await tray.screenshot({ path: join(report, stem + '-saved-trial-tray.png') });
    await tray.getByRole('button', { name: 'Add evidence', exact: true }).tap();
    await expect(page.getByRole('textbox', { name: 'Evidence I noticed', exact: true })).toBeFocused();
    await page.addScriptTag({ content: axeSource });
    const review = await page.evaluate(async () => {
      const axe = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        violations: axe.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary })) })),
        errors: (window as any).__events.errors };
    });
    await page.screenshot({ path: join(report, stem + '.png'), fullPage: true });
    await writeFile(join(report, stem + '.json'), JSON.stringify({ ...review, marked, stepped, beforeReview, baseline, trial }, null, 2));
    expect(review.viewport).toBe(390); expect(review.scrollWidth).toBeLessThanOrEqual(390); expect(review.violations).toEqual([]); expect(review.errors).toEqual([]);
  });
});

test('Migration marked pose contrast follows light and dark themes at desktop and phone widths without replacing frozen resources', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(page);
  await page.getByRole('button', { name: 'Mark wing pose', exact: true }).click(); await frames(page);
  const original = await pose(page); expectCaptured(original);
  const states: any[] = [];
  for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height }); await frames(page);
    for (const dark of [false, true]) {
      await theme(page, dark);
      const state = await pose(page); expectCaptured(state);
      const material = await page.evaluate(() => {
        const scene = (window as any).__glCanvas()?.rec?.scene;
        const reference = scene?.getObjectByName('migration-marked-wing-pose');
        if (!reference?.material?.color) throw new Error('Submitted marked pose material is unavailable');
        return { uuid: reference.material.uuid, hex: reference.material.color.getHexString(), rgb: reference.material.color.toArray(),
          opacity: reference.material.opacity, depthTest: reference.material.depthTest, depthWrite: reference.material.depthWrite, fog: reference.material.fog };
      });
      const expectedRgb = dark ? [196 / 255, 181 / 255, 253 / 255] : [48 / 255, 16 / 255, 86 / 255];
      expect(material.hex).toBe(dark ? 'c4b5fd' : '301056');
      material.rgb.forEach((channel: number, index: number) => expect(channel).toBeCloseTo(expectedRgb[index], 6));
      expect(material.uuid).toBe(original.material); expect(state.geometry).toBe(original.geometry); expect(state.material).toBe(original.material);
      expect(state.capacity).toBe(original.capacity); expect(state.frozen).toEqual(original.frozen);
      expect(material.depthTest).toBe(false); expect(material.depthWrite).toBe(false); expect(material.fog).toBe(false);
      const name = viewport.name + '-marked-pose-contrast-' + (dark ? 'night' : 'day');
      await page.locator('.migration-flight-stage').screenshot({ path: join(report, name + '.png') });
      states.push({ viewport, dark, material, geometry: state.geometry, capacity: state.capacity, count: state.count, extent: state.extent });
    }
  }
  expect(await saved(page)).toEqual(original.data);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'marked-pose-theme-contrast-review.json'), JSON.stringify({ original, states }, null, 2));
});
