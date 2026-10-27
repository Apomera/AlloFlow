import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 180_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round17-2026-10-20');
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
  let typeMismatch = -1, valueMismatch = -1, maximumError = 0;
  actual.forEach((value, index) => {
    const target = expected[index];
    if (typeof value !== typeof target) typeMismatch = index;
    else if (typeof value === 'number' && typeof target === 'number') {
      maximumError = Math.max(maximumError, Number.isFinite(value) && Number.isFinite(target) ? Math.abs(value - target) : Infinity);
    } else if (value !== target) valueMismatch = index;
  });
  expect({ typeMismatch, valueMismatch }).toEqual({ typeMismatch: -1, valueMismatch: -1 });
  expect(maximumError, 'Every numeric component matches to the requested precision').toBeLessThan(0.5 * Math.pow(10, -precision));
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

async function checkState(page: Page) {
  const comparison = await comparisonState(page);
  const markers = await page.evaluate(() => {
    const rec = (window as any).__glCanvas()?.rec, scene = rec?.scene, camera = rec?.camera, THREE = (window as any).THREE;
    const marked = scene?.getObjectByName('migration-marked-wing-pose'), diamonds = marked?.getObjectByName('migration-marked-wingtip-diamonds');
    if (!marked || !diamonds || !camera) throw new Error('Marked-tip diamond scene unavailable');
    const data = (window as any).__toolData.migration, flock = scene.getObjectByName('migration-flock');
    const bird = flock.children[Math.max(0, Math.min(flock.children.length - 1, Number(data.flightStudyBird) || 0))];
    scene.updateMatrixWorld(true);
    const inverse = new THREE.Matrix4().copy(bird.matrixWorld).invert(), stage = rec.canvas.getBoundingClientRect();
    const cameraNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion).normalize();
    const shown = (node: any) => { for (let parent = node; parent; parent = parent.parent) if (!parent.visible) return false; return true; };
    const ids = (window as any).__check15Ids || ((window as any).__check15Ids = new WeakMap());
    const identity = (object: object) => { if (!ids.has(object)) ids.set(object, (window as any).__check15Next = ((window as any).__check15Next || 0) + 1); return ids.get(object); };
    const instances = [];
    for (let index = 0; index < diamonds.count; index++) {
      const local = new THREE.Matrix4(); diamonds.getMatrixAt(index, local);
      const world = new THREE.Matrix4().multiplyMatrices(diamonds.matrixWorld, local);
      const centre = new THREE.Vector3().setFromMatrixPosition(world).applyMatrix4(inverse);
      const normal = new THREE.Vector3(0, 0, 1).transformDirection(world);
      const vertices = diamonds.geometry.attributes.position;
      let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity;
      for (let vertex = 0; vertex < vertices.count; vertex++) {
        const projected = new THREE.Vector3().fromBufferAttribute(vertices, vertex).applyMatrix4(world).project(camera);
        left = Math.min(left, projected.x); right = Math.max(right, projected.x); bottom = Math.min(bottom, projected.y); top = Math.max(top, projected.y);
      }
      instances.push({ index, side: diamonds.userData.segmentSides[index], centre: centre.toArray(), normalAlignment: Math.abs(normal.dot(cameraNormal)),
        width: (right - left) * stage.width / 2, height: (top - bottom) * stage.height / 2 });
    }
    return { visible: shown(diamonds), count: diamonds.count, segmentCount: diamonds.userData.segmentCount,
      sides: Array.from(diamonds.userData.segmentSides), pixelRadius: diamonds.userData.pixelRadius,
      geometry: diamonds.geometry.uuid, material: diamonds.material.uuid, color: diamonds.material.color.getHex(), outlineColor: marked.material.color.getHex(),
      instanceMatrix: identity(diamonds.instanceMatrix), instanceArray: identity(diamonds.instanceMatrix.array), bytes: diamonds.instanceMatrix.array.byteLength, instances };
  });
  return { ...comparison, markers };
}
function checkButton(page: Page) { return page.getByRole('button', { name: 'Check what changed', exact: true }); }
function checkCue(page: Page) { return page.locator('[data-marked-comparison-check="true"]'); }
async function expectCue(page: Page, kind: string) {
  await expect(checkCue(page)).toHaveAttribute('data-marked-comparison-status', 'checked');
  await expect(checkCue(page)).toHaveAttribute('data-marked-comparison-kind', kind);
}
async function check(page: Page, kind: string) {
  const beforeData = await saved(page), before = await checkState(page);
  await keyboardClick(page, checkButton(page)); await expectCue(page, kind);
  const after = await checkState(page); expect(await saved(page)).toEqual(beforeData);
  samePhase(after.phase, before.phase); expect(after.serial).toBe(before.serial); expect(after.body).toEqual(before.body); expect(after.camera).toEqual(before.camera);
  expect(graphicPool(after)).toEqual(graphicPool(before)); expect(after.joints).toEqual(before.joints);
  return { kind, before, after, cue: await checkCue(page).textContent() };
}
function markerPool(state: any) { return { resources: state.resources, geometry: state.markers.geometry, material: state.markers.material,
  instanceMatrix: state.markers.instanceMatrix, instanceArray: state.markers.instanceArray }; }
function expectMarkers(state: any, reference: any) {
  expectLinks(state, reference); expect(state.markers.visible).toBe(true); expect(state.markers.count).toBe(2); expect(state.markers.segmentCount).toBe(2);
  expect(state.markers.pixelRadius).toBe(7); expect(state.markers.bytes).toBe(128); expect(state.markers.color).toBe(state.markers.outlineColor);
  expect(new Set(state.markers.instances.map((item: any) => item.side))).toEqual(new Set([0, 1]));
  for (const instance of state.markers.instances) {
    const side = Number(instance.side); closePoint(instance.centre, reference.actualTips[side].point);
    const segment = state.links.sides.indexOf(side); expect(segment).toBeGreaterThanOrEqual(0);
    closePoint(instance.centre, state.links.positions.slice(segment * 6, segment * 6 + 3));
    expect(instance.normalAlignment).toBeCloseTo(1, 6);
    expect(instance.width).toBeCloseTo(14, 1); expect(instance.height).toBeCloseTo(14, 1);
  }
  expect(state.resources).toHaveLength(13);
}


function followButton(page: Page, side: number) { return page.locator('[data-wingtip-follow-side="' + side + '"]'); }
function followStatus(page: Page) { return page.locator('[data-wingtip-follow-status]'); }
async function expectFollowControls(page: Page, side: number | null) {
  for (const index of [0, 1]) await expect(followButton(page, index)).toHaveAttribute('aria-pressed', side === index ? 'true' : 'false');
  await expect(followStatus(page)).toHaveAttribute('data-wingtip-follow-status', side === 0 ? 'left' : side === 1 ? 'right' : 'both');
}
async function followState(page: Page) {
  const base = await checkState(page);
  const guides = await page.evaluate(() => {
    const w = window as any, scene = w.__glCanvas()?.rec.scene, path = scene?.getObjectByName('migration-wingtip-path');
    const cycle = path?.getObjectByName('migration-wingtip-cycle'), marked = scene?.getObjectByName('migration-marked-wing-pose');
    const links = marked?.getObjectByName('migration-marked-wingtip-links'), data = w.__toolData.migration, flock = scene?.getObjectByName('migration-flock');
    if (!path || !cycle || !links || !flock) throw new Error('Anatomical side guide unavailable');
    const bird = flock.children[Math.max(0, Math.min(flock.children.length - 1, Number(data.flightStudyBird) || 0))];
    const shown = (node: any) => { for (let parent = node; parent; parent = parent.parent) if (!parent.visible) return false; return true; };
    const ids = w.__follow17Ids || (w.__follow17Ids = new WeakMap());
    const identity = (object: object) => { if (!ids.has(object)) ids.set(object, w.__follow17Next = (w.__follow17Next || 0) + 1); return ids.get(object); };
    const birdNodes: any[] = []; bird.traverse((node: any) => birdNodes.push({ uuid: node.uuid, visible: node.visible }));
    return { visible: shown(path), side: path.userData.followSide, linkSide: links.userData.followSide, sampleCount: path.userData.sampleCount,
      source: path.userData.sourceBirdUuid, buildVersion: path.userData.buildVersion, sources: path.userData.sources, birdNodes,
      cycle: { start: cycle.geometry.drawRange.start, count: cycle.geometry.drawRange.count,
        positions: Array.from(cycle.geometry.attributes.position.array), colors: Array.from(cycle.geometry.attributes.color.array), distances: Array.from(cycle.geometry.attributes.lineDistance.array),
        buffers: ['position', 'color', 'lineDistance'].map(name => [identity(cycle.geometry.attributes[name]), identity(cycle.geometry.attributes[name].array)]) },
      sides: ['left', 'right'].map(name => {
        const point = path.getObjectByName('migration-wingtip-' + name + '-point'), marks = path.getObjectByName('migration-wingtip-' + name + '-landmarks'), arrow = path.getObjectByName('migration-wingtip-' + name + '-direction');
        return { pointVisible: shown(point), point: point.position.toArray(), marksVisible: shown(marks), marksCount: marks.count, checkpoint: marks.userData.activeCheckpoint,
          directionVisible: shown(arrow), phase: arrow.userData.phase, anchorPhase: arrow.userData.anchorPhase,
          direction: Array.from(arrow.userData.directionVector), projectedDirection: Array.from(arrow.userData.projectedDirection) };
      }) };
  });
  return { ...base, guides };
}
function expectFollowGeometry(state: any, side: number | null, reference: any) {
  expect(state.errors).toEqual([]); expect(state.guides.visible).toBe(true); expect(state.guides.side).toBe(side);
  expect(state.guides.source).toBe(state.bird); expect(state.guides.sampleCount).toBe(64);
  expect(state.guides.cycle.start).toBe(side === null ? 0 : side * 128); expect(state.guides.cycle.count).toBe(side === null ? 256 : 128);
  for (const index of [0, 1]) {
    const selected = side === null || index === side, guide = state.guides.sides[index];
    expect(guide.pointVisible).toBe(selected); expect(guide.marksVisible).toBe(selected); expect(guide.marksCount).toBe(8);
    if (selected) {
      closePoint(guide.point, state.actualTips[index].point);
      const phaseSample = (((state.phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 64;
      if (Math.abs(phaseSample - Math.round(phaseSample)) < 0.000001) {
        const vertex = index * 128 + (Math.round(phaseSample) % 64) * 2;
        closePoint(state.guides.cycle.positions.slice(vertex * 3, vertex * 3 + 3), state.actualTips[index].point);
      }
    }
    if (!selected) { expect(guide.checkpoint).toBeNull(); expect(guide.directionVisible).toBe(false); expect(guide.phase).toBeNull(); expect(guide.anchorPhase).toBeNull(); expect(guide.direction).toEqual([0, 0, 0]); expect(guide.projectedDirection).toEqual([0, 0]); }
    const source = state.guides.sources[index]; expect(source.side).toBe(index); expect(source.nodeUuid).toBe(state.actualTips[index].meshUuid); expect(source.geometryUuid).toBe(state.actualTips[index].geometryUuid); expect(source.vertexIndex).toBe(state.actualTips[index].chosen);
  }
  const expected = [0, 1].filter(index => (side === null || side === index) && state.actualTips[index].point.some((value: number, axis: number) => Math.abs(value - reference.actualTips[index].point[axis]) > 0.000001));
  expect(state.links.count).toBe(expected.length); expect(state.links.drawCount).toBe(expected.length * 2); expect(state.links.visible).toBe(expected.length > 0);
  expect(state.links.sides).toEqual(expected); expect(state.links.bytes).toBe(112); expect(state.guides.linkSide).toBe(expected.length ? side : null);
  expect(state.markers.count).toBe(expected.length); expect(state.markers.segmentCount).toBe(expected.length); expect(state.markers.visible).toBe(expected.length > 0);
  expect(state.markers.sides).toEqual([...expected, ...Array(2 - expected.length).fill(-1)]); expect(state.markers.bytes).toBe(128);
  for (const [segment, index] of expected.entries()) {
    closePoint(state.links.positions.slice(segment * 6, segment * 6 + 3), reference.actualTips[index].point);
    closePoint(state.links.positions.slice(segment * 6 + 3, segment * 6 + 6), state.actualTips[index].point);
    closePoint(state.links.colors.slice(segment * 6, segment * 6 + 3), state.palette[index]); closePoint(state.links.colors.slice(segment * 6 + 3, segment * 6 + 6), state.palette[index]);
    const diamond = state.markers.instances[segment]; expect(diamond.side).toBe(index); closePoint(diamond.centre, reference.actualTips[index].point);
    expect(diamond.normalAlignment).toBeCloseTo(1, 6); expect(diamond.width).toBeCloseTo(14, 1); expect(diamond.height).toBeCloseTo(14, 1);
  }
  expect(state.marked.visible).toBe(true); expect(frozen(state)).toEqual(frozen(reference)); expect(state.resources).toHaveLength(13);
}
async function toggleFollow(page: Page, buttonSide: number, resultingSide: number | null, reference: any) {
  const beforeData = await saved(page), before = await followState(page); await keyboardClick(page, followButton(page, buttonSide));
  const after = await followState(page); await expectFollowControls(page, resultingSide); expectFollowGeometry(after, resultingSide, reference);
  expect(await saved(page)).toEqual(beforeData); samePhase(after.phase, before.phase); expect(after.serial).toBe(before.serial);
  expect(after.body).toEqual(before.body); expect(after.joints).toEqual(before.joints); expect(after.camera).toEqual(before.camera);
  expect(after.guides.birdNodes).toEqual(before.guides.birdNodes); expect(after.guides.cycle.positions).toEqual(before.guides.cycle.positions);
  expect(after.guides.cycle.colors).toEqual(before.guides.cycle.colors); expect(after.guides.cycle.distances).toEqual(before.guides.cycle.distances);
  expect(after.guides.cycle.buffers).toEqual(before.guides.cycle.buffers); expect(markerPool(after)).toEqual(markerPool(before));
  return after;
}
function brief(state: any) {
  return { species: state.species, bird: state.bird, phase: state.phase, serial: state.serial, body: state.body, actualTips: state.actualTips,
    marked: { phase: state.marked.phase, source: state.marked.source, count: state.marked.count }, links: state.links, markers: state.markers,
    guides: { ...state.guides, cycle: { start: state.guides.cycle.start, count: state.guides.cycle.count, buffers: state.guides.cycle.buffers } }, resources: state.resources };
}

test('Migration anatomical wingtip follow isolates the actual side geometry for all eight species without changing the bird, marked outline, camera or saved work', async ({ page }) => {
  test.setTimeout(330_000); await mount(page, { ...observationSeed(), flightWingStep: 13 });
  const originalWork = speciesWork(await saved(page)), species = [];
  await expect(followButton(page, 0)).toHaveAccessibleName('Individual’s left: solid path');
  await expect(followButton(page, 1)).toHaveAccessibleName('Individual’s right: dashed path');
  // Exercise path-on initial readiness before any action can trigger a React
  // rerender, choose a checkpoint, capture a mark, or change the source.
  const bootData = await saved(page), bootBefore = await followState(page); await expect(followButton(page, 0)).toBeEnabled();
  await keyboardClick(page, followButton(page, 0)); await expectFollowControls(page, 0); const bootFollowed = await followState(page);
  expect(bootFollowed.guides.side).toBe(0); expect(bootFollowed.guides.cycle.start).toBe(0); expect(bootFollowed.guides.cycle.count).toBe(128);
  expect(bootFollowed.guides.sides[0].pointVisible).toBe(true); expect(bootFollowed.guides.sides[1].pointVisible).toBe(false);
  closePoint(bootFollowed.guides.sides[0].point, bootFollowed.actualTips[0].point); expect(bootFollowed.resources).toHaveLength(13);
  expect(await saved(page)).toEqual(bootData); samePhase(bootFollowed.phase, bootBefore.phase); expect(bootFollowed.body).toEqual(bootBefore.body); expect(bootFollowed.joints).toEqual(bootBefore.joints);
  expect(bootFollowed.guides.birdNodes).toEqual(bootBefore.guides.birdNodes); expect(markerPool(bootFollowed)).toEqual(markerPool(bootBefore));
  await keyboardClick(page, followButton(page, 0)); await expectFollowControls(page, null);
  for (const id of speciesIds) {
    await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption(id); await frames(page); await expectFollowControls(page, null);
    await select(page, 2); const reference = await mark(page); await select(page, 6); const both = await followState(page); expectFollowGeometry(both, null, reference);
    const left = await toggleFollow(page, 0, 0, reference), right = await toggleFollow(page, 1, 1, reference), restored = await toggleFollow(page, 1, null, reference), views = [];
    if (id === 'canada_goose' || id === 'monarch') {
      await toggleFollow(page, 0, 0, reference);
      for (const name of ['Front', 'From above']) {
        const phase = (await followState(page)).phase; await keyboardClick(page, page.getByRole('button', { name, exact: true })); const state = await followState(page);
        await expectFollowControls(page, 0); expectFollowGeometry(state, 0, reference); samePhase(state.phase, phase); expect(markerPool(state)).toEqual(markerPool(both)); views.push({ name, state: brief(state) });
        if (id === 'canada_goose') { await page.locator('[data-wingtip-follow-controls]').scrollIntoViewIfNeeded(); await page.locator("[data-migration-id=\"migration-flight-deck\"]").screenshot({ path: join(report, 'desktop-left-wingtip-' + (name === 'Front' ? 'front' : 'above') + '.png') }); }
      }
      await toggleFollow(page, 0, null, reference);
    }
    expect(speciesWork(await saved(page))).toEqual(originalWork); expect((await saved(page)).flightWingStep).toBe(13);
    species.push({ id, both: brief(both), left: brief(left), right: brief(right), restored: brief(restored), views });
  }
  await writeFile(join(report, 'anatomical-wingtip-follow-geometry.json'), JSON.stringify({ bootBefore: brief(bootBefore), bootFollowed: brief(bootFollowed), species }, null, 2));
});

test('Migration wingtip follow survives learning actions and playback, resets at source and visibility boundaries, and releases the same thirteen resources once', async ({ page }) => {
  test.setTimeout(300_000); await mount(page, { ...observationSeed(), flightWingStep: 13 }); const original = await saved(page);
  await select(page, 2); let reference = await mark(page); await select(page, 6); const initial = await followState(page), pool = markerPool(initial); await toggleFollow(page, 0, 0, reference);
  for (const dark of [true, false]) { await theme(page, dark); const state = await followState(page); expectFollowGeometry(state, 0, reference); expect(markerPool(state)).toEqual(pool); }
  await keyboardClick(page, page.getByRole('button', { name: 'Front', exact: true })); await check(page, 'both'); await expectFollowControls(page, 0);
  await keyboardClick(page, page.getByRole('button', { name: 'Restore marked view settings', exact: true })); await expectFollowControls(page, 0); await check(page, 'wing-only');
  await keyboardClick(page, returnButton(page)); await expectFollowControls(page, 0); expectFollowGeometry(await followState(page), 0, reference); await check(page, 'same');
  await keyboardClick(page, page.getByRole('button', { name: 'Step wingbeat', exact: true })); await expectFollowControls(page, 0); expectFollowGeometry(await followState(page), 0, reference);
  reference = await mark(page); await expectFollowControls(page, 0); await select(page, 6); await expectFollowControls(page, 0); expectFollowGeometry(await followState(page), 0, reference);
  await keyboardClick(page, page.getByRole('button', { name: 'Resume flight', exact: true })); await expectFollowControls(page, 0);
  const playingData = await saved(page); await keyboardClick(page, followButton(page, 1)); await expectFollowControls(page, 1); expect(await saved(page)).toEqual(playingData);
  await keyboardClick(page, page.getByRole('button', { name: 'Pause flight', exact: true })); await expectFollowControls(page, 1); expect(markerPool(await followState(page))).toEqual(pool);
  const path = page.getByRole('checkbox', { name: 'Show wingtip path', exact: true }); await path.uncheck(); await frames(page);
  await expect(followButton(page, 0)).toHaveCount(0); const hidden = await followState(page); expect(hidden.guides.side).toBeNull(); expect(hidden.guides.visible).toBe(false); expect(hidden.guides.cycle.count).toBe(0); expect(hidden.links.count).toBe(0);
  await path.check(); await frames(page); await expectFollowControls(page, null); await toggleFollow(page, 1, 1, reference);
  await keyboardClick(page, page.getByRole('button', { name: 'Chase', exact: true })); await expect(followButton(page, 0)).toHaveCount(0); await expect(followButton(page, 1)).toHaveCount(0);
  await keyboardClick(page, page.getByRole('button', { name: 'Study', exact: true })); await expectFollowControls(page, null); expectFollowGeometry(await followState(page), null, reference);
  await toggleFollow(page, 0, 0, reference); await page.getByRole('combobox', { name: 'Study individual', exact: true }).selectOption('1'); await frames(page); await expectFollowControls(page, null); await expect(returnButton(page)).toBeDisabled();
  await select(page, 2); reference = await mark(page); await select(page, 6); await toggleFollow(page, 1, 1, reference);
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('monarch'); await frames(page); await expectFollowControls(page, null);
  await select(page, 2); reference = await mark(page); await select(page, 6); await toggleFollow(page, 0, 0, reference); const beforeLoss = await saved(page);
  await page.evaluate(() => {
    const scene = (window as any).__glCanvas().rec.scene, resources = new Map<string, any>();
    for (const name of ['migration-wingtip-path', 'migration-marked-wing-pose']) scene.getObjectByName(name).traverse((node: any) => {
      if (node.geometry) resources.set(node.geometry.uuid, node.geometry); for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) resources.set(material.uuid, material);
    });
    (window as any).__follow17Disposals = Array.from(resources.values()).map(resource => { const item = { uuid: resource.uuid, count: 0 }; resource.addEventListener('dispose', () => item.count++); return item; });
    (window as any).__follow17DiamondDisposals = 0; scene.getObjectByName('migration-marked-wingtip-diamonds').addEventListener('dispose', () => (window as any).__follow17DiamondDisposals++);
  });
  const loss = await page.evaluate(async () => {
    const rec = (window as any).__glCanvas().rec, path = rec.scene.getObjectByName('migration-wingtip-path'), links = rec.scene.getObjectByName('migration-marked-wingtip-links'), diamonds = rec.scene.getObjectByName('migration-marked-wingtip-diamonds');
    const sample = () => ({ side: path.userData.followSide, linkSide: links.userData.followSide, visible: path.visible, drawCount: path.getObjectByName('migration-wingtip-cycle').geometry.drawRange.count, links: links.userData.segmentCount, diamonds: diamonds.count });
    rec.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })); const states = [sample()];
    for (let frame = 0; frame < 5; frame++) { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); states.push(sample()); } return states;
  });
  for (const state of loss) { expect(state.side).toBeNull(); expect(state.linkSide).toBeNull(); expect(state.visible).toBe(false); expect(state.drawCount).toBe(0); expect(state.links).toBe(0); expect(state.diamonds).toBe(0); }
  await expect(followButton(page, 0)).toBeDisabled(); await expectFollowControls(page, null); expect(work(await saved(page))).toEqual(work(beforeLoss));
  await harness.unmount(page); await expect.poll(() => page.evaluate(() => (window as any).__follow17Disposals.every((resource: any) => resource.count === 1))).toBe(true);
  const disposal = await page.evaluate(() => ({ resources: (window as any).__follow17Disposals, diamonds: (window as any).__follow17DiamondDisposals })); expect(disposal.resources).toHaveLength(13); expect(disposal.diamonds).toBe(1);
  await mount(page, beforeLoss); await expectFollowControls(page, null); await expect(returnButton(page)).toBeDisabled(); expect(await saved(page)).toEqual(beforeLoss);
  expect(speciesWork(await saved(page))).toEqual(speciesWork(original)); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'anatomical-wingtip-follow-lifecycle.json'), JSON.stringify({ initial: brief(initial), hidden: brief(hidden), loss, disposal, beforeLoss }, null, 2));
});

for (const dark of [false, true]) test.describe('Migration anatomical wingtip follow phone ' + (dark ? 'dark' : 'light') + ' round17', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Anatomical side following supports keyboard and touch while holding a pose across Front and From above and recording existing observation notes', async ({ page }) => {
    await mount(page, { ...observationSeed(), flightWingStep: 13 }); await theme(page, dark); const original = await saved(page), stem = 'mobile-' + (dark ? 'dark' : 'light') + '-wingtip-follow';
    await select(page, 2); const reference = await mark(page); await positionButton(page, 6).tap(); await frames(page);
    await expect(page.locator('[data-wingtip-follow-activity="true"]')).toBeVisible(); const activity = await page.locator('[data-wingtip-follow-activity="true"]').textContent();
    expect(activity).toContain('Front'); expect(activity).toContain('From above'); expect(activity?.toLowerCase()).toContain('predict');
    for (const side of [0, 1]) { const box = await followButton(page, side).boundingBox(); expect(box?.height).toBeGreaterThanOrEqual(44); expect(box?.width).toBeGreaterThanOrEqual(44); await expect(followButton(page, side)).toHaveAttribute('aria-controls', 'migration-flight-stage'); }
    const held = await followState(page); await followButton(page, 0).focus(); await page.keyboard.press('Enter'); await frames(page); await expect(followButton(page, 0)).toBeFocused(); await expectFollowControls(page, 0);
    const left = await followState(page); expectFollowGeometry(left, 0, reference); expect(await saved(page)).toEqual(original);
    const views = [];
    for (const name of ['Front', 'From above']) {
      await page.getByRole('button', { name, exact: true }).tap(); await frames(page); const state = await followState(page); expectFollowGeometry(state, 0, reference); samePhase(state.phase, held.phase); expect(state.serial).toBe(13); expect(state.joints).toEqual(held.joints); expect(work(await saved(page))).toEqual(work(original));
      await expectFollowControls(page, 0); views.push({ name, state: brief(state) }); await page.locator('.migration-flight-stage').screenshot({ path: join(report, stem + '-' + (name === 'Front' ? 'front' : 'above') + '-stage.png') });
    }
    const beforeRight = await saved(page); await followButton(page, 1).tap(); await frames(page); await expectFollowControls(page, 1); expectFollowGeometry(await followState(page), 1, reference); expect(await saved(page)).toEqual(beforeRight);
    await followButton(page, 1).tap(); await frames(page); await expectFollowControls(page, null); expectFollowGeometry(await followState(page), null, reference);
    await followButton(page, 0).tap(); await frames(page); await checkButton(page).tap(); await frames(page); await expectCue(page, 'both'); await expectFollowControls(page, 0);
    await page.locator('[data-study-wingtip-path="true"]').screenshot({ path: join(report, stem + '-activity.png') });
    await page.getByRole('button', { name: 'Describe wing motion', exact: true }).tap(); const input = page.getByRole('textbox', { name: 'My observation', exact: true }); await expect(input).toBeFocused();
    await expect(input).toHaveValue(original.flightStudyObservations.drafts['canada_goose:primaries']); expect(work(await saved(page))).toEqual(work(original));
    await input.fill('I followed the individual’s left wingtip with the pose held. Front and From above changed its screen position, while its anatomical side stayed the same.');
    await page.getByRole('button', { name: 'Record observation', exact: true }).tap(); const recorded = await saved(page);
    expect(recorded.flightStudyObservations.records['canada_goose:primaries'].note).toContain('anatomical side stayed the same');
    expect(recorded.flightStudyObservations.drafts['canada_goose:head']).toBe(original.flightStudyObservations.drafts['canada_goose:head']);
    expect(recorded.flightStudyObservations.drafts['monarch:whole-wing']).toBe(original.flightStudyObservations.drafts['monarch:whole-wing']);
    for (const key of ['flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText']) expect(recorded[key]).toEqual(original[key]);
    await expectFollowControls(page, 0); await page.addScriptTag({ content: axeSource }); const audit = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, violations: result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) })), errors: (window as any).__events.errors };
    });
    expect(audit.width).toBe(390); expect(audit.scrollWidth).toBeLessThanOrEqual(390); expect(audit.violations).toEqual([]); expect(audit.errors).toEqual([]);
    await page.locator('[data-study-observation]').screenshot({ path: join(report, stem + '-notes.png') });
    await writeFile(join(report, stem + '.json'), JSON.stringify({ original, reference, left: brief(left), views, recorded, activity, audit }, null, 2));
  });
});
