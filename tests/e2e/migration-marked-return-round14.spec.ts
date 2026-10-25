import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 180_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round14-2026-10-20');
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
async function mount(page: Page, seed: Record<string, unknown> = {}) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { migration: { tab: 'flight3d', flightCamera: 'study', flightPaused: true,
    flightSpecies: 'canada_goose', flightShowWingtipPath: true, flightWind: 0,
    flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, ...seed } },
    'document.querySelector(".migration-flight-stage")?.getAttribute("data-flight-ready")==="true"');
  expect(await harness.glScene(page)).toMatchObject({ hasScene: true });
  await page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec, original = record.scene.onBeforeRender;
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
async function keyboardClick(page: Page, locator: ReturnType<Page['getByRole']>) {
  await locator.focus(); await page.keyboard.press('Enter'); await frames(page);
}
function observationSeed() {
  const record = { speciesId: 'canada_goose', region: 'primaries', note: 'My explicitly recorded feather observation.',
    bird: 0, yaw: 35, pitch: 15, zoom: 1, wingStep: 0, paused: true, motionReduced: true };
  return { flightStudyRegion: 'head', flightStudyObservationOpen: false,
    flightStudyObservations: { drafts: { 'canada_goose:head': 'Keep my head note.',
      'canada_goose:primaries': 'Keep my newer unrecorded feather draft.', 'monarch:whole-wing': 'Keep my butterfly draft.' },
      records: { 'canada_goose:primaries': record }, comparison: { draft: 'Keep my observation comparison.' } },
    flightInvestigation: { variable: 'wind', prediction: 'Keep my wind prediction.',
      baseline: { speciesId: 'canada_goose', wind: 0, season: 'fall', formationMode: 'natural' },
      trials: [{ id: 1, variable: 'wind', prediction: 'Keep this saved prediction.',
        baseline: { speciesId: 'canada_goose', wind: 0, season: 'fall', formationMode: 'natural' },
        snapshot: { speciesId: 'canada_goose', wind: 8, season: 'fall', formationMode: 'natural' } }],
      evidence: 'Keep the wind evidence.', explanation: 'Keep the wind explanation.' },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep my challenge.', notes: 'Keep my reasoning.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep the energy hypothesis.', explanation: 'Keep the energy explanation.', trials: [] },
    aiExplorerText: 'Keep my migration research.' };
}
function work(data: any) {
  return Object.fromEntries(['flightStudyObservations', 'flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText'].map(key => [key, data[key]]));
}
function speciesWork(data: any) {
  const retained = work(data); delete retained.aiExplorerText; return retained;
}

const speciesIds = ['canada_goose', 'arctic_tern', 'ruby_hummingbird', 'snow_goose', 'peregrine', 'sandhill_crane', 'monarch', 'bartailed_godwit'];
function positionButton(page: Page, index: number) {
  return page.getByRole('button', { name: 'Cycle position ' + (index + 1) + ' of 8', exact: true });
}
async function choosePosition(page: Page, index: number) {
  await keyboardClick(page, positionButton(page, index));
  await expect(positionButton(page, index)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-study-cycle-position][aria-pressed="true"]')).toHaveCount(1);
}
async function expectNoSelection(page: Page) {
  await expect(page.locator('[data-study-cycle-position][aria-pressed="true"]')).toHaveCount(0);
}
async function cycleLayout(page: Page) {
  return page.locator('.migration-cycle-positions').evaluate(group => {
    const rect = group.getBoundingClientRect(), style = getComputedStyle(group);
    return { display: style.display, columns: style.gridTemplateColumns.trim().split(/\s+/).length,
      width: rect.width, scrollWidth: group.scrollWidth, viewport: innerWidth,
      buttons: Array.from(group.querySelectorAll('button')).map(button => {
        const box = button.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height };
      }) };
  });
}
function expectCycleLayout(layout: any) {
  expect(layout.display).toBe('grid'); expect(layout.columns).toBe(4); expect(layout.buttons).toHaveLength(8);
  expect(layout.scrollWidth).toBeLessThanOrEqual(Math.ceil(layout.width));
  for (const button of layout.buttons) { expect(button.width).toBeGreaterThanOrEqual(44); expect(button.height).toBeGreaterThanOrEqual(44); }
  layout.buttons.slice(0, 4).forEach((button: any) => expect(button.y).toBeCloseTo(layout.buttons[0].y, 1));
  layout.buttons.slice(4).forEach((button: any) => expect(button.y).toBeCloseTo(layout.buttons[4].y, 1));
  expect(layout.buttons[4].y).toBeGreaterThan(layout.buttons[0].y);
}

// Read actual submitted GL geometry. Endpoints are independently chosen from
// the real outer mesh, never from the implementation's source metadata.
async function comparisonState(page: Page) {
  return page.evaluate(() => {
    const rec = (window as any).__glCanvas()?.rec, scene = rec?.scene, camera = rec?.camera, THREE = (window as any).THREE;
    const path = scene?.getObjectByName('migration-wingtip-path'), marked = scene?.getObjectByName('migration-marked-wing-pose');
    const flock = scene?.getObjectByName('migration-flock'), links = marked?.getObjectByName('migration-marked-wingtip-links');
    if (!path || !marked || !links || !flock || !camera) throw new Error('Marked comparison scene unavailable');
    const data = (window as any).__toolData.migration;
    const individual = Math.max(0, Math.min(flock.children.length - 1, Number(data.flightStudyBird) || 0));
    const bird = flock.children[individual]; scene.updateMatrixWorld(true);
    const inverse = new THREE.Matrix4().copy(bird.matrixWorld).invert();
    const shown = (node: any) => { for (let parent = node; parent; parent = parent.parent) if (!parent.visible) return false; return true; };
    const identityMap = (window as any).__return14IdentityMap || ((window as any).__return14IdentityMap = new WeakMap());
    const identity = (object: object) => { if (!identityMap.has(object)) identityMap.set(object, (window as any).__return14IdentityNext = ((window as any).__return14IdentityNext || 0) + 1); return identityMap.get(object); };
    const resources = new Map<string, any>();
    for (const owner of [path, marked]) owner.traverse((node: any) => {
      if (node.geometry) resources.set(node.geometry.uuid, { uuid: node.geometry.uuid, kind: 'geometry' });
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) resources.set(material.uuid, { uuid: material.uuid, kind: 'material' });
    });
    const actualTips = [0, 1].map(side => {
      const mesh = data.flightSpecies === 'monarch'
        ? bird.userData.wings[side].children.find((part: any) => part.name === 'migration-monarch-forewing') : bird.userData.primaries[side];
      if (!mesh?.geometry?.attributes?.position) throw new Error('Actual outer tip mesh unavailable');
      const positions = mesh.geometry.attributes.position;
      const limit = data.flightSpecies === 'monarch' ? mesh.geometry.userData.monarchBoundaryVertexCount : positions.count;
      let chosen = 0;
      for (let vertex = 1; vertex < limit; vertex++) if (positions.getX(vertex) > positions.getX(chosen) ||
        (positions.getX(vertex) === positions.getX(chosen) && positions.getZ(vertex) > positions.getZ(chosen))) chosen = vertex;
      const actual = new THREE.Vector3().fromBufferAttribute(positions, chosen).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
      return { point: actual.toArray(), meshUuid: mesh.uuid, geometryUuid: mesh.geometry.uuid, name: mesh.name, chosen, limit, count: positions.count };
    });
    const linkPosition = links.geometry.attributes.position, linkColor = links.geometry.attributes.color, linkDistance = links.geometry.attributes.lineDistance;
    const count = Number(links.userData.segmentCount) || 0;
    const lineCount = Number(marked.geometry.drawRange.count) || 0;
    return { scene: scene.uuid, bird: bird.uuid, species: data.flightSpecies, individual,
      phase: bird.userData.lastRenderedWingPhase, body: { position: bird.position.toArray(), rotation: bird.rotation.toArray(), matrix: bird.matrixWorld.elements.slice(), flockPosition: flock.position.toArray(), flockRotation: flock.rotation.toArray() },
      camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray() },
      joints: { wings: bird.userData.wings.map((part: any) => part.rotation.toArray()), wrists: bird.userData.wrists.map((part: any) => part.rotation.toArray()), primaries: bird.userData.primaries.map((part: any) => part.rotation.toArray()) },
      actualTips, paused: data.flightPaused === true, serial: Number(data.flightWingStep) || 0,
      marked: { visible: shown(marked), captured: marked.userData.captured === true, phase: marked.userData.capturedPhase,
        source: marked.userData.sourceBirdUuid, count: lineCount, positions: Array.from(marked.geometry.attributes.position.array.slice(0, lineCount * 3)),
        tips: Array.from(marked.userData.markedTipPositions || []), sources: marked.userData.tipSources || [] },
      links: { visible: shown(links), count, sides: Array.from(links.userData.segmentSides || []).slice(0, count), drawCount: links.geometry.drawRange.count,
        positions: Array.from(linkPosition.array.slice(0, count * 6)), colors: Array.from(linkColor.array.slice(0, count * 6)), distances: Array.from(linkDistance.array.slice(0, count * 2)),
        geometry: links.geometry.uuid, material: links.material.uuid, attributes: [linkPosition, linkColor, linkDistance].map(attribute => [identity(attribute), identity(attribute.array)]),
        bytes: linkPosition.array.byteLength + linkColor.array.byteLength + linkDistance.array.byteLength },
      palette: ['left', 'right'].map(side => path.getObjectByName('migration-wingtip-' + side + '-point').material.color.toArray()),
      resources: Array.from(resources.values()).sort((a, b) => a.uuid.localeCompare(b.uuid)),
      errors: (window as any).__events.errors };
  });
}
function returnButton(page: Page) { return page.getByRole('button', { name: 'Return wings to marked pose', exact: true }); }
function closePoint(actual: Array<number | string>, expected: Array<number | string>, precision = 5) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => {
    const target = expected[index]; expect(typeof value).toBe(typeof target);
    if (typeof value === 'number' && typeof target === 'number') expect(value).toBeCloseTo(target, precision);
    else expect(value).toBe(target);
  });
}
function samePhase(actual: number, expected: number) {
  expect(Number.isFinite(actual)).toBe(true); expect(Math.sin(actual)).toBeCloseTo(Math.sin(expected), 8); expect(Math.cos(actual)).toBeCloseTo(Math.cos(expected), 8);
}
function frozen(state: any) { return { source: state.marked.source, phase: state.marked.phase, positions: state.marked.positions, tips: state.marked.tips, sources: state.marked.sources }; }
function graphicPool(state: any) { return { resources: state.resources, geometry: state.links.geometry, material: state.links.material, attributes: state.links.attributes }; }
function expectLinks(state: any, reference: any) {
  expect(state.errors).toEqual([]); expect(state.marked.captured).toBe(true); expect(state.links.visible).toBe(true);
  expect(state.links.count).toBe(2); expect(state.links.drawCount).toBe(4); expect(state.links.bytes).toBe(112);
  expect(new Set(state.links.sides)).toEqual(new Set([0, 1])); expect(state.links.distances.every(Number.isFinite)).toBe(true);
  for (let segment = 0; segment < state.links.count; segment++) {
    const side = Number(state.links.sides[segment]);
    closePoint(state.links.positions.slice(segment * 6, segment * 6 + 3), reference.actualTips[side].point);
    closePoint(state.links.positions.slice(segment * 6 + 3, segment * 6 + 6), state.actualTips[side].point);
    closePoint(state.links.colors.slice(segment * 6, segment * 6 + 3), state.palette[side]);
    closePoint(state.links.colors.slice(segment * 6 + 3, segment * 6 + 6), state.palette[side]);
  }
  expect(frozen(state)).toEqual(frozen(reference));
}
function expectReturned(state: any, reference: any) {
  expect(state.errors).toEqual([]); expect(state.paused).toBe(true); samePhase(state.phase, reference.marked.phase);
  for (const role of ['wings', 'wrists', 'primaries']) for (let joint = 0; joint < state.joints[role].length; joint++) closePoint(state.joints[role][joint], reference.joints[role][joint], 6);
  for (let side = 0; side < 2; side++) closePoint(state.actualTips[side].point, reference.actualTips[side].point);
  expect(state.links.count).toBe(0); expect(state.links.visible).toBe(false); expect(frozen(state)).toEqual(frozen(reference));
}
async function mark(page: Page) {
  await keyboardClick(page, page.getByRole('button', { name: 'Mark wing pose', exact: true }));
  await expect(returnButton(page)).toBeEnabled(); return comparisonState(page);
}
async function select(page: Page, index: number) { await choosePosition(page, index); }

// One actual marked/live comparison per species is sufficient here. Round13's
// separate suite already exhausts all64 cycle checkpoints.
test('Migration marked wingtip links connect actual geometry and Return restores the captured phase for every species', async ({ page }) => {
  test.setTimeout(300_000);
  await mount(page, { ...observationSeed(), flightWingStep: 13 });
  const workBefore = work(await saved(page)), summaries = [];
  await expect(returnButton(page)).toBeDisabled();
  for (const id of speciesIds) {
    await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption(id); await frames(page);
    const baseline = await saved(page);
    expect(speciesWork(baseline)).toEqual(Object.fromEntries(Object.entries(workBefore).filter(([key]) => key !== 'aiExplorerText')));
    if (id === 'canada_goose') {
      // Read the last actual submitted frame after a real running interval.
      // A checkpoint offset that has merely been requested is not a capture.
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await keyboardClick(page, page.getByRole('button', { name: 'Resume flight', exact: true }));
      await frames(page, 4);
    } else await select(page, 2);
    const reference = await mark(page); samePhase(reference.marked.phase, reference.phase);
    expect(reference.marked.source).toBe(reference.bird); expect(reference.marked.sources).toHaveLength(2);
    expect(reference.marked.tips).toHaveLength(6);
    for (let side = 0; side < 2; side++) closePoint(reference.marked.tips.slice(side * 3, side * 3 + 3), reference.actualTips[side].point);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await frames(page);
    await select(page, 6); const compared = await comparisonState(page); expectLinks(compared, reference);
    const beforeReturn = await saved(page), geometryBefore = graphicPool(compared);
    await keyboardClick(page, returnButton(page)); const returned = await comparisonState(page); expectReturned(returned, reference);
    expect(returned.body).toEqual(compared.body); expect(returned.camera).toEqual(compared.camera); expect(returned.serial).toBe(Number(beforeReturn.flightWingStep) || 0);
    expect(graphicPool(returned)).toEqual(geometryBefore); expect(await saved(page)).toEqual(beforeReturn);
    if (id === 'monarch') for (const source of reference.actualTips) { expect(source.name).toBe('migration-monarch-forewing'); expect(source.limit).toBeLessThan(source.count); }
    const path = page.getByRole('checkbox', { name: 'Show wingtip path', exact: true });
    await path.uncheck(); await frames(page);
    await keyboardClick(page, page.getByRole('button', { name: 'Step wingbeat', exact: true }));
    const offBefore = await saved(page); await keyboardClick(page, returnButton(page));
    const offReturned = await comparisonState(page); expectReturned(offReturned, reference);
    expect((await saved(page)).flightShowWingtipPath).toBe(false); expect(await saved(page)).toEqual(offBefore);
    await path.check(); await frames(page);
    summaries.push({ id, reference, compared, returned, offReturned });
  }
  await writeFile(join(report, 'all-species-marked-return.json'), JSON.stringify({ workBefore, summaries }, null, 2));
});

test('Migration queued mark captures the rendered phase and rapid Return ordering preserves later manual steps and latest selection', async ({ page }) => {
  await mount(page, { ...observationSeed(), flightWingStep: 1000000 });
  const before = await saved(page);
  await select(page, 6); const rendered = await comparisonState(page);
  await page.evaluate(() => {
    (document.querySelector('[data-study-cycle-position="2"]') as HTMLButtonElement).click();
    (document.querySelector('[data-marked-pose-action="mark"]') as HTMLButtonElement).click();
  }); await frames(page);
  const captured = await comparisonState(page); samePhase(captured.marked.phase, rendered.phase);
  for (let side = 0; side < 2; side++) closePoint(captured.marked.tips.slice(side * 3, side * 3 + 3), rendered.actualTips[side].point);
  await keyboardClick(page, returnButton(page)); const firstReturn = await comparisonState(page);
  samePhase(firstReturn.phase, rendered.phase); for (const role of ['wings', 'wrists', 'primaries']) for (let joint = 0; joint < firstReturn.joints[role].length; joint++) closePoint(firstReturn.joints[role][joint], rendered.joints[role][joint], 6);
  await page.evaluate(() => {
    (document.querySelector('[data-marked-pose-action="return"]') as HTMLButtonElement).click();
    const step = Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Step wingbeat') as HTMLButtonElement; step.click();
  }); await frames(page, 4);
  const laterStep = await comparisonState(page); expect(laterStep.serial).toBe(0); samePhase(laterStep.phase, captured.marked.phase + Math.PI / 4);
  await page.evaluate(() => {
    (document.querySelector('[data-study-cycle-position="1"]') as HTMLButtonElement).click();
    const step = Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Step wingbeat') as HTMLButtonElement; step.click();
    (document.querySelector('[data-marked-pose-action="return"]') as HTMLButtonElement).click();
  }); await frames(page, 4);
  const latestReturn = await comparisonState(page); expect(latestReturn.serial).toBe(1); samePhase(latestReturn.phase, captured.marked.phase);
  await page.evaluate(() => {
    (document.querySelector('[data-marked-pose-action="return"]') as HTMLButtonElement).click();
    (document.querySelector('[data-study-cycle-position="3"]') as HTMLButtonElement).click();
  }); await frames(page, 4);
  const latestSelection = await comparisonState(page); samePhase(latestSelection.phase, 3 * Math.PI / 4); expect(latestSelection.serial).toBe(1);
  expect(work(await saved(page))).toEqual(work(before)); expect(frozen(latestSelection)).toEqual(frozen(captured));
  await writeFile(join(report, 'marked-return-latest-intent.json'), JSON.stringify({ before, rendered, captured, firstReturn, laterStep, latestReturn, latestSelection }, null, 2));
});

test('Migration marked comparison links retain their pool through themes and context changes and release resources once after context loss', async ({ page }) => {
  test.setTimeout(240_000);
  await mount(page, observationSeed()); await select(page, 2); const reference = await mark(page); await select(page, 6);
  const initial = await comparisonState(page); expectLinks(initial, reference); const initialPool = graphicPool(initial);
  const themed = [];
  for (const dark of [true, false]) { await theme(page, dark); const state = await comparisonState(page); expectLinks(state, reference); expect(graphicPool(state)).toEqual(initialPool); themed.push(state); }
  const path = page.getByRole('checkbox', { name: 'Show wingtip path', exact: true });
  await path.uncheck(); await frames(page); expect((await comparisonState(page)).links.visible).toBe(false);
  await path.check(); await frames(page); expectLinks(await comparisonState(page), reference);
  await keyboardClick(page, page.getByRole('button', { name: 'Chase', exact: true })); expect((await comparisonState(page)).links.visible).toBe(false);
  await keyboardClick(page, page.getByRole('button', { name: 'Study', exact: true })); expectLinks(await comparisonState(page), reference);
  await page.getByRole('combobox', { name: 'Study individual', exact: true }).selectOption('1'); await frames(page);
  await expect(returnButton(page)).toBeDisabled(); const cleared = await comparisonState(page);
  expect(cleared.marked.captured).toBe(false); expect(cleared.links.visible).toBe(false); expect(graphicPool(cleared)).toEqual(initialPool);
  await select(page, 2); await mark(page); await select(page, 6); const beforeLoss = await saved(page);
  await page.evaluate(() => {
    const scene = (window as any).__glCanvas().rec.scene, resources = new Map<string, any>();
    for (const rootName of ['migration-wingtip-path', 'migration-marked-wing-pose']) scene.getObjectByName(rootName).traverse((node: any) => {
      if (node.geometry) resources.set(node.geometry.uuid, node.geometry);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) resources.set(material.uuid, material);
    });
    (window as any).__return14Disposals = Array.from(resources.values()).map(resource => { const item = { uuid: resource.uuid, count: 0 }; resource.addEventListener('dispose', () => item.count++); return item; });
  });
  const loss = await page.evaluate(async () => {
    const rec = (window as any).__glCanvas().rec, marked = rec.scene.getObjectByName('migration-marked-wing-pose'), links = marked.getObjectByName('migration-marked-wingtip-links');
    const sample = () => ({ captured: marked.userData.captured, phase: marked.userData.capturedPhase, visible: links.visible, count: links.userData.segmentCount });
    rec.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })); const samples = [sample()];
    for (let frame = 0; frame < 6; frame++) { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); samples.push(sample()); } return samples;
  });
  for (const state of loss) { expect(state.captured).toBe(false); expect(state.phase).toBeNull(); expect(state.visible).toBe(false); expect(state.count).toBe(0); }
  await expect(returnButton(page)).toBeDisabled(); expect(work(await saved(page))).toEqual(work(beforeLoss));
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await harness.unmount(page);
  await expect.poll(() => page.evaluate(() => (window as any).__return14Disposals.every((resource: any) => resource.count === 1))).toBe(true);
  const disposals = await page.evaluate(() => (window as any).__return14Disposals); expect(disposals).toHaveLength(13);
  await writeFile(join(report, 'marked-links-lifecycle.json'), JSON.stringify({ reference, initial, themed, cleared, loss, disposals }, null, 2));
});

for (const dark of [false, true]) test.describe('Migration marked return phone ' + (dark ? 'dark' : 'light') + ' round14', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Marked pose Return and wingtip comparison support touch, keyboard and existing observation notes on a 390px phone', async ({ page }) => {
    await mount(page, { ...observationSeed(), flightWingStep: 13 }); await theme(page, dark);
    const before = await saved(page), stem = 'mobile-' + (dark ? 'dark' : 'light') + '-marked-return';
    await select(page, 2); const reference = await mark(page);
    await positionButton(page, 6).tap(); await frames(page); const compared = await comparisonState(page); expectLinks(compared, reference);
    const button = returnButton(page); await expect(button).toHaveAttribute('data-marked-pose-action', 'return'); const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44); expect(box?.width).toBeGreaterThanOrEqual(44);
    await button.focus(); await page.keyboard.press('Enter'); await frames(page); const returned = await comparisonState(page); expectReturned(returned, reference);
    expect(returned.serial).toBe(13); expect(work(await saved(page))).toEqual(work(before));
    await positionButton(page, 6).tap(); await frames(page); await button.tap(); await frames(page); expectReturned(await comparisonState(page), reference);
    await positionButton(page, 6).tap(); await frames(page);
    await page.getByRole('button', { name: 'Front', exact: true }).tap(); await frames(page);
    const front = await comparisonState(page); expectLinks(front, reference);
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, stem + '-stage.png') });
    await page.getByRole('button', { name: 'Describe wing motion', exact: true }).tap();
    const input = page.getByRole('textbox', { name: 'My observation', exact: true });
    await expect(input).toBeFocused(); await expect(input).toHaveValue(before.flightStudyObservations.drafts['canada_goose:primaries']);
    expect(work(await saved(page))).toEqual(work(before));
    await input.fill('I compared raised and lowered wingtip positions and returned to my marked pose.');
    await page.getByRole('button', { name: 'Record observation', exact: true }).tap();
    const recorded = await saved(page); expect(recorded.flightStudyObservations.records['canada_goose:primaries'].note).toContain('returned to my marked pose');
    for (const key of ['flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText']) expect(recorded[key]).toEqual(before[key]);
    await page.addScriptTag({ content: axeSource });
    const audit = await page.evaluate(async () => {
      const results = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, violations: results.violations.map((entry: any) => ({ id: entry.id, nodes: entry.nodes.map((node: any) => node.target) })), errors: (window as any).__events.errors };
    });
    expect(audit.width).toBe(390); expect(audit.scrollWidth).toBeLessThanOrEqual(390); expect(audit.violations).toEqual([]); expect(audit.errors).toEqual([]);
    await page.locator('[data-study-observation]').screenshot({ path: join(report, stem + '-notes.png') });
    await writeFile(join(report, stem + '.json'), JSON.stringify({ before, reference, compared, returned, front, recorded, audit }, null, 2));
    if (!dark) {
      await page.setViewportSize({ width: 1440, height: 1000 }); await frames(page);
      await page.getByRole('button', { name: 'Front', exact: true }).click(); await frames(page);
      await page.locator('[data-study-cycle-controls]').scrollIntoViewIfNeeded();
      await page.locator('#migration-flight-deck').screenshot({ path: join(report, 'desktop-marked-wingtip-comparison.png') });
    }
  });
});
