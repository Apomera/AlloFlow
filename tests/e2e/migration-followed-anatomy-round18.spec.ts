import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 180_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round18-2026-10-20');
const axeSource = readFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');
const harness = new GlHarness({
  toolFile: process.env.MIG_TOOL_FILE || 'stem_lab/stem_tool_migration.js', toolId: 'migration',
  width: 1100, height: 900, layout: 'document', appStyles: true,
  probes: `var vp=document.createElement('meta');vp.name='viewport';vp.content='width=device-width,initial-scale=1';document.head.appendChild(vp);document.querySelector('#wrap').style.width='min(100vw,1100px)';document.body.style.fontFamily='system-ui,sans-serif';document.body.style.background='#f8fafc';`
});
const browserFailures = new WeakMap<Page, string[]>();
test.beforeAll(async () => { await mkdir(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([harness.destroy(page), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Round18 browser cleanup exceeded 60 seconds')), 60_000); })]);
  } finally { if (timer) clearTimeout(timer); }
});

async function frames(page: Page, count = 3) {
  const start = await page.evaluate(() => (window as any).__glScene()?.renders || 0);
  await page.waitForFunction(({ start, count }) => ((window as any).__glScene()?.renders || 0) >= start + count,
    { start, count }, { timeout: 60_000 });
}
async function mount(page: Page, seed: Record<string, unknown> = {}) {
  if (!browserFailures.has(page)) {
    const failures: string[] = []; browserFailures.set(page, failures);
    page.on('pageerror', error => failures.push(error.stack || error.message)); page.on('crash', () => failures.push('Browser page crashed'));
  }
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


function followButton(page: Page, side: number) { return page.locator('[data-wingtip-follow-side="' + side + '"]'); }
function anatomyToggle(page: Page) { return page.locator('[data-followed-anatomy-toggle="true"]'); }
async function nativeSelectionDiagnostic(page: Page, label: string, option: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const dom = await Promise.race([page.evaluate(() => {
      const w = window as any, data = w.__toolData?.migration, stage = document.querySelector('.migration-flight-stage');
      return { url: location.href, readyState: document.readyState, errors: w.__events?.errors || [],
        source: data && { species: data.flightSpecies, camera: data.flightCamera, individual: data.flightStudyBird, anatomy: data.flightShowAnatomy, wingStep: data.flightWingStep },
        stage: stage && { ready: stage.getAttribute('data-flight-ready'), error: stage.getAttribute('data-flight-error') },
        selects: Array.from(document.querySelectorAll('select')).map(element => {
          const rect = element.getBoundingClientRect(), style = getComputedStyle(element), labelledBy = element.getAttribute('aria-labelledby');
          return { id: element.id, ariaLabel: element.getAttribute('aria-label'), labelledBy,
            labelledText: labelledBy && labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent).join(' '),
            labels: Array.from(element.labels || []).map(label => label.textContent?.trim()), value: element.value, disabled: element.disabled,
            bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, display: style.display, visibility: style.visibility,
            hiddenAncestor: element.closest('[hidden],[aria-hidden="true"]')?.outerHTML.slice(0, 1200),
            options: Array.from(element.options).map(option => ({ value: option.value, label: option.label, disabled: option.disabled })), html: element.outerHTML.slice(0, 6000) };
        }), controlsDOM: document.querySelector('.migration-flight-controls')?.outerHTML.slice(0, 12000), wrapDOM: document.querySelector('#wrap')?.innerHTML.slice(0, 12000) };
    }), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('DOM diagnostic exceeded 8 seconds')), 8_000); })]);
    return { label, option, pageClosed: page.isClosed(), browserFailures: browserFailures.get(page) || [], ...dom };
  } catch (error) { return { label, option, pageClosed: page.isClosed(), browserFailures: browserFailures.get(page) || [], diagnosticError: String(error) }; }
  finally { if (timer) clearTimeout(timer); }
}
async function nativeSelect(page: Page, label: string, option: string, tag: string) {
  const before = await nativeSelectionDiagnostic(page, label, option), stamp = Date.now(), locator = page.getByRole('combobox', { name: label, exact: true });
  const beforeFile = join(report, 'native-selection-' + stamp + '-' + tag + '-before.json'); await writeFile(beforeFile, JSON.stringify(before, null, 2));
  try {
    await locator.waitFor({ state: 'visible', timeout: 8_000 }); await locator.selectOption(option, { timeout: 15_000 }); await frames(page);
  } catch (error) {
    const after = await nativeSelectionDiagnostic(page, label, option), diagnostic = { before, after, selectionError: String(error) };
    await writeFile(join(report, 'native-selection-' + stamp + '-' + tag + '-failure.json'), JSON.stringify(diagnostic, null, 2));
    console.error('Native selection failed: ' + JSON.stringify(diagnostic)); throw new Error('Native selection failed for ' + label + ' → ' + option + '; before: ' + beforeFile + '; ' + String(error));
  }
}
async function anatomyState(page: Page) {
  const comparison = await comparisonState(page);
  const anatomy = await page.evaluate(() => {
    const w = window as any, rec = w.__glCanvas()?.rec, scene = rec?.scene, camera = rec?.camera, THREE = w.THREE, data = w.__toolData.migration;
    const flock = scene?.getObjectByName('migration-flock'), overlay = scene?.getObjectByName('migration-anatomy-callouts'), markers = scene?.getObjectByName('migration-anatomy-markers');
    if (!flock || !overlay || !markers || !camera) throw new Error('Followed anatomy scene unavailable');
    const bird = flock.children[Math.max(0, Math.min(flock.children.length - 1, Number(data.flightStudyBird) || 0))]; scene.updateMatrixWorld(true);
    const shown = (node: any) => { for (let parent = node; parent; parent = parent.parent) if (!parent.visible) return false; return true; };
    const ids = w.__anatomy18Ids || (w.__anatomy18Ids = new WeakMap());
    const identity = (object: object) => { if (!ids.has(object)) ids.set(object, w.__anatomy18Next = (w.__anatomy18Next || 0) + 1); return ids.get(object); };
    const resources = new Map<string, any>();
    for (const owner of [overlay, markers]) owner.traverse((node: any) => {
      if (node.geometry) resources.set(node.geometry.uuid, { uuid: node.geometry.uuid, kind: 'geometry' });
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) resources.set(material.uuid, { uuid: material.uuid, kind: 'material' });
    });
    const bySide = bird.userData.anatomyAnchorsBySide, anchors = Array.isArray(bySide) ? bySide.map((entries: any[], side: number) => entries.map(anchor => {
      const expectedNode = anchor.id === 'inner-wing' ? bird.userData.wings[side] : anchor.id === 'primaries' ? bird.userData.primaries[side] : bird;
      const worldPoint = anchor.point.clone().applyMatrix4(expectedNode.matrixWorld), worldOutline: number[] = [];
      for (let index = 0; index < anchor.outline.length; index += 3) new THREE.Vector3().fromArray(anchor.outline, index).applyMatrix4(expectedNode.matrixWorld).toArray(worldOutline, index);
      return { id: anchor.id, color: anchor.color, node: anchor.node.uuid, expectedNode: expectedNode.uuid, point: anchor.point.toArray(), outline: Array.from(anchor.outline), worldPoint: worldPoint.toArray(), worldOutline };
    })) : [];
    const positions = overlay.geometry.attributes.position, colors = overlay.geometry.attributes.color, count = overlay.geometry.drawRange.count;
    const stage = rec.canvas.getBoundingClientRect(), side = overlay.userData.anatomySide;
    let offset = 0;
    const chunks = (anchors[side === 0 ? 0 : 1] || []).map((anchor: any) => {
      const outline = Array.from(positions.array.slice(offset, offset + anchor.outline.length));
      const outlineColors = Array.from(colors.array.slice(offset, offset + anchor.outline.length)); offset += anchor.outline.length;
      const leaderStart = Array.from(positions.array.slice(offset, offset + 3)), leaderColors = Array.from(colors.array.slice(offset, offset + 12)); offset += 12;
      return { id: anchor.id, outline, leaderStart, outlineColors, leaderColors };
    });
    const birdNodes: any[] = []; bird.traverse((node: any) => birdNodes.push({ uuid: node.uuid, visible: node.visible }));
    return { visible: shown(overlay), markerVisible: shown(markers), side, source: overlay.userData.sourceBirdUuid, dark: w.__ctx.isDark === true || w.__ctx.theme === 'dark',
      markerSide: markers.userData.anatomySide, markerSource: markers.userData.sourceBirdUuid, selected: data.flightStudyRegion,
      anchors, legacyRight: Array.isArray(bySide?.[1]) && bird.userData.anatomyAnchors === bySide[1], sharedHead: !!bySide?.[0]?.[0] && bySide[0][0] === bySide?.[1]?.[0], sharedTail: !!bySide?.[0]?.[3] && bySide[0][3] === bySide?.[1]?.[3],
      primaryScaleX: bird.userData.primaries.map((part: any) => part ? part.scale.x : null), chunks, birdNodes,
      geometry: overlay.geometry.uuid, material: overlay.material.uuid, count, positions: Array.from(positions.array.slice(0, count * 3)), colors: Array.from(colors.array.slice(0, count * 3)),
      attributes: [positions, colors].map(attribute => [identity(attribute), identity(attribute.array)]), bytes: positions.array.byteLength + colors.array.byteLength,
      resources: Array.from(resources.values()).sort((a, b) => a.uuid.localeCompare(b.uuid)),
      markers: markers.children.map((marker: any) => {
        const world = new THREE.Vector3(); marker.getWorldPosition(world); const point = world.clone().project(camera);
        return { name: marker.name, number: marker.userData.markerNumber, region: marker.userData.anatomyId, side: marker.userData.anatomySide,
          focused: marker.userData.focused, ring: marker.getObjectByName('migration-anatomy-focus-ring').visible,
          world: world.toArray(), ndc: point.toArray(), visible: shown(marker),
          x: stage.left + (point.x + 1) * stage.width / 2, y: stage.top + (1 - point.y) * stage.height / 2, z: point.z };
      }) };
  });
  return { ...comparison, anatomy };
}
function anatomyPool(state: any) { return { resources: state.anatomy.resources, geometry: state.anatomy.geometry, material: state.anatomy.material, attributes: state.anatomy.attributes }; }
function expectAnatomyColors(state: any) {
  const day = [0x78350f, 0x164e63, 0x14532d, 0x831843], dark = [0xfbbf24, 0x67e8f9, 0x86efac, 0xf9a8d4];
  for (const side of [0, 1]) expect(state.anatomy.anchors[side].map((anchor: any) => anchor.color)).toEqual(dark);
  for (const [index, chunk] of state.anatomy.chunks.entries()) {
    const color = (state.anatomy.dark ? dark : day)[index], rgb = [((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255];
    expect(chunk.outlineColors).toHaveLength(chunk.outline.length); expect(chunk.leaderColors).toHaveLength(12);
    for (const values of [chunk.outlineColors, chunk.leaderColors]) {
      const maximumError = values.reduce((maximum: number, value: number, component: number) => Math.max(maximum, Number.isFinite(value) ? Math.abs(value - rgb[component % 3]) : Infinity), 0);
      expect(maximumError, 'Every RGB component of ' + chunk.id + ' matches its scene palette').toBeLessThan(0.0000005);
    }
  }
}
function expectAnatomy(state: any, side: number) {
  const a = state.anatomy; expect(state.errors).toEqual([]); expect(a.visible).toBe(true); expect(a.markerVisible).toBe(true);
  expect(a.side).toBe(side); expect(a.markerSide).toBe(side); expect(a.source).toBe(state.bird); expect(a.markerSource).toBe(state.bird);
  expect(a.legacyRight).toBe(true); expect(a.sharedHead).toBe(true); expect(a.sharedTail).toBe(true); expect(a.anchors).toHaveLength(2);
  for (const index of [0, 1]) { expect(a.anchors[index]).toHaveLength(4); for (const anchor of a.anchors[index]) expect(anchor.node).toBe(anchor.expectedNode); }
  const leftInner = a.anchors[0][1], rightInner = a.anchors[1][1];
  closePoint(leftInner.point, rightInner.point.map((value: number, axis: number) => axis === 0 ? -value : value));
  closePoint(leftInner.outline, rightInner.outline.map((value: number, axis: number) => axis % 3 === 0 ? -value : value));
  closePoint(a.anchors[0][2].point, a.anchors[1][2].point); closePoint(a.anchors[0][2].outline, a.anchors[1][2].outline); expect(a.primaryScaleX).toEqual([-1, 1]);
  let expectedCount = 0;
  for (const [index, anchor] of a.anchors[side].entries()) { const chunk = a.chunks[index]; expect(chunk.id).toBe(anchor.id); closePoint(chunk.outline, anchor.worldOutline); closePoint(chunk.leaderStart, anchor.worldPoint); expectedCount += anchor.outline.length / 3 + 4; }
  expect(a.count).toBe(expectedCount); expect(a.positions.every(Number.isFinite)).toBe(true); expect(a.bytes).toBe(4608); expect(a.resources).toHaveLength(15);
  expect(new Set([...state.resources, ...a.resources].map((item: any) => item.uuid)).size).toBe(28);
  expect(a.markers.map((item: any) => item.region)).toEqual(['head', 'inner-wing', 'primaries', 'tail']); expect(a.markers.map((item: any) => item.number)).toEqual([1, 2, 3, 4]);
  expect(a.markers.map((item: any) => item.side)).toEqual([null, side, side, null]);
  expect(a.markers.filter((item: any) => item.focused && item.ring).map((item: any) => item.region)).toEqual([a.selected]);
  expectAnatomyColors(state);
}
function expectHiddenAnatomy(state: any) {
  const a = state.anatomy; expect(a.visible).toBe(false); expect(a.markerVisible).toBe(false); expect(a.side).toBeNull(); expect(a.markerSide).toBeNull(); expect(a.source).toBe(''); expect(a.markerSource).toBe('');
  for (const marker of a.markers) { expect(marker.side).toBeNull(); expect(marker.focused).toBe(false); expect(marker.ring).toBe(false); }
  expect(a.resources).toHaveLength(15); expect(a.bytes).toBe(4608);
}
async function follow(page: Page, side: number | null) {
  const beforeData = await saved(page), before = await anatomyState(page);
  if (side === null) { for (const index of [0, 1]) if (await followButton(page, index).getAttribute('aria-pressed') === 'true') await keyboardClick(page, followButton(page, index)); }
  else if (await followButton(page, side).getAttribute('aria-pressed') !== 'true') await keyboardClick(page, followButton(page, side));
  for (const index of [0, 1]) await expect(followButton(page, index)).toHaveAttribute('aria-pressed', side === index ? 'true' : 'false');
  const after = await anatomyState(page); expect(await saved(page)).toEqual(beforeData); samePhase(after.phase, before.phase); expect(after.body).toEqual(before.body); expect(after.camera).toEqual(before.camera); expect(after.joints).toEqual(before.joints);
  expect(after.anatomy.birdNodes).toEqual(before.anatomy.birdNodes); expect(anatomyPool(after)).toEqual(anatomyPool(before)); expect(graphicPool(after)).toEqual(graphicPool(before)); expect(frozen(after)).toEqual(frozen(before));
  if (before.anatomy.markerVisible && after.anatomy.markerVisible) for (const [index, marker] of after.anatomy.markers.entries()) {
    closePoint(marker.world, before.anatomy.markers[index].world, 6); closePoint(marker.ndc, before.anatomy.markers[index].ndc, 6);
  }
  return after;
}
async function toggleAnatomy(page: Page, enabled: boolean) {
  const beforeData = await saved(page), before = await anatomyState(page), button = anatomyToggle(page), node = await button.elementHandle();
  await keyboardClick(page, button); await expect(button).toHaveAttribute('aria-pressed', enabled ? 'true' : 'false'); await expect(button).toBeFocused();
  expect(await button.evaluate((element, original) => element === original, node)).toBe(true); await node?.dispose();
  const after = await anatomyState(page); expect(await saved(page)).toEqual({ ...beforeData, flightShowAnatomy: enabled });
  samePhase(after.phase, before.phase); expect(after.serial).toBe(before.serial); expect(after.body).toEqual(before.body); expect(after.camera).toEqual(before.camera); expect(after.joints).toEqual(before.joints);
  expect(anatomyPool(after)).toEqual(anatomyPool(before)); expect(graphicPool(after)).toEqual(graphicPool(before)); expect(frozen(after)).toEqual(frozen(before));
  return after;
}
async function captureToggle(page: Page) {
  return anatomyToggle(page).evaluate(element => {
    const key = Object.getOwnPropertyNames(element).find(name => name.startsWith('__reactProps$'));
    if (!key || typeof (element as any)[key].onClick !== 'function') throw new Error('Native React toggle callback unavailable');
    const w = window as any, callbacks = w.__anatomy18Callbacks || (w.__anatomy18Callbacks = []); callbacks.push({ fn: (element as any)[key].onClick, element }); return callbacks.length - 1;
  });
}
async function invokeStaleToggle(page: Page, index: number) {
  const before = await saved(page); await page.evaluate(index => { const item = (window as any).__anatomy18Callbacks[index]; item.fn({ currentTarget: item.element, target: item.element, preventDefault() {}, stopPropagation() {} }); }, index); await frames(page);
  expect(await saved(page)).toEqual(before);
}
function anatomyBrief(state: any) { return { species: state.species, bird: state.bird, phase: state.phase, serial: state.serial, camera: state.camera, body: state.body, marked: { source: state.marked.source, phase: state.marked.phase }, anatomy: state.anatomy, guideResources: state.resources }; }

test('Migration followed anatomy uses exact bilateral articulated anchors for all seven bird species and excludes Monarch bird anatomy', async ({ page }) => {
  test.setTimeout(330_000); console.log('[round18] geometry: mount');
  await mount(page, { ...observationSeed(), flightShowAnatomy: false, flightWingStep: 13 }); console.log('[round18] geometry: ready');
  const originalWork = speciesWork(await saved(page)); console.log('[round18] geometry: initial follow');
  await follow(page, 0); console.log('[round18] geometry: followed'); await expect(anatomyToggle(page)).toHaveAccessibleName('Show anatomy on followed wing');
  await expect(anatomyToggle(page)).toHaveAttribute('aria-controls', 'migration-flight-stage'); console.log('[round18] geometry: toggle'); const boot = await toggleAnatomy(page, true); console.log('[round18] geometry: palette'); expectAnatomy(boot, 0); console.log('[round18] geometry: verified boot'); const sharedPool = anatomyPool(boot), sharedGuides = graphicPool(boot); await follow(page, null);
  const species = [];
  for (const id of speciesIds.filter(id => id !== 'monarch')) {
    await nativeSelect(page, '3D migration focus species', id, 'geometry-' + id); expectAnatomy(await anatomyState(page), 1);
    await select(page, 2); const reference = await mark(page); await select(page, 6); const right = await anatomyState(page); expectAnatomy(right, 1);
    expect(anatomyPool(right)).toEqual(sharedPool); expect(graphicPool(right)).toEqual(sharedGuides);
    const left = await follow(page, 0); expectAnatomy(left, 0); expect(left.anatomy.chunks[0]).toEqual(right.anatomy.chunks[0]); expect(left.anatomy.chunks[3]).toEqual(right.anatomy.chunks[3]);
    expect(left.anatomy.chunks[1].outline).not.toEqual(right.anatomy.chunks[1].outline); expect(left.anatomy.chunks[2].outline).not.toEqual(right.anatomy.chunks[2].outline); expect(frozen(left)).toEqual(frozen(reference));
    const views = [];
    if (id === 'canada_goose' || id === 'ruby_hummingbird') {
      for (const name of ['Front', 'From above']) { await keyboardClick(page, page.getByRole('button', { name, exact: true })); const state = await anatomyState(page); expectAnatomy(state, 0); samePhase(state.phase, left.phase); expect(anatomyPool(state)).toEqual(anatomyPool(right)); views.push({ name, state: anatomyBrief(state) }); }
      const camera = (await anatomyState(page)).camera; await select(page, 2); const pose3 = await anatomyState(page); await select(page, 6); const pose7 = await anatomyState(page); expectAnatomy(pose3, 0); expectAnatomy(pose7, 0); expect(pose3.camera).toEqual(camera); expect(pose7.camera).toEqual(camera);
      expect(pose3.anatomy.chunks[1]).not.toEqual(pose7.anatomy.chunks[1]); expect(pose3.anatomy.chunks[2]).not.toEqual(pose7.anatomy.chunks[2]); expect(pose3.anatomy.chunks[0]).toEqual(pose7.anatomy.chunks[0]); expect(pose3.anatomy.chunks[3]).toEqual(pose7.anatomy.chunks[3]);
    }
    if (id === 'canada_goose') { await page.locator('[data-followed-anatomy-activity]').scrollIntoViewIfNeeded(); await page.locator("[data-migration-id=\"migration-flight-deck\"]").screenshot({ path: join(report, 'desktop-followed-anatomy-left.png') }); }
    const explicitRight = await follow(page, 1); expectAnatomy(explicitRight, 1);
    if (id === 'canada_goose') await page.locator("[data-migration-id=\"migration-flight-deck\"]").screenshot({ path: join(report, 'desktop-followed-anatomy-right.png') });
    await follow(page, null); expectAnatomy(await anatomyState(page), 1); await expect(page.locator('[data-study-anatomy-side="right"]')).toBeVisible();
    expect(speciesWork(await saved(page))).toEqual(originalWork); expect((await saved(page)).flightWingStep).toBe(13); species.push({ id, left: anatomyBrief(left), right: anatomyBrief(explicitRight), views });
  }
  await nativeSelect(page, '3D migration focus species', 'monarch', 'geometry-monarch'); await follow(page, 0); const monarch = await anatomyState(page); expectHiddenAnatomy(monarch);
  await expect(anatomyToggle(page)).toHaveCount(0); await expect(page.locator('[data-followed-anatomy-activity]')).toHaveCount(0); await expect(page.locator('[data-study-region]')).toHaveCount(0);
  await keyboardClick(page, page.getByRole('button', { name: 'Describe wing motion', exact: true })); await expect(page.getByRole('textbox', { name: 'My observation', exact: true })).toHaveValue('Keep my butterfly draft.'); expect(speciesWork(await saved(page))).toEqual(originalWork);
  await writeFile(join(report, 'followed-anatomy-exact-anchors.json'), JSON.stringify({ species, monarch: anatomyBrief(monarch) }, null, 2));
});

test('Migration followed anatomy toggle rejects stale source and side callbacks and reuses and disposes all twenty-eight overlay resources once', async ({ page }) => {
  test.setTimeout(300_000); await mount(page, { ...observationSeed(), flightShowAnatomy: false, flightWingStep: 13 }); const original = await saved(page);
  await follow(page, 0); const staleSide = await captureToggle(page); await follow(page, 1); await invokeStaleToggle(page, staleSide); expect((await saved(page)).flightShowAnatomy).toBe(false);
  const first = await toggleAnatomy(page, true); expectAnatomy(first, 1); const pool = anatomyPool(first), guidePool = graphicPool(first), staleSource = await captureToggle(page);
  await nativeSelect(page, 'Study individual', '1', 'lifecycle-individual'); await expect(anatomyToggle(page)).toHaveCount(0); await invokeStaleToggle(page, staleSource); expectAnatomy(await anatomyState(page), 1);
  await follow(page, 0); const stalePath = await captureToggle(page), path = page.getByRole('checkbox', { name: 'Show wingtip path', exact: true }); await path.uncheck(); await frames(page); await invokeStaleToggle(page, stalePath); await expect(anatomyToggle(page)).toHaveCount(0); expectAnatomy(await anatomyState(page), 1);
  await path.check(); await frames(page); await follow(page, 0); expectHiddenAnatomy(await toggleAnatomy(page, false)); await expect(page.locator('[data-study-anatomy-side]')).toHaveCount(0); expectAnatomy(await toggleAnatomy(page, true), 0);
  const beforeThemes = await anatomyState(page), themes = [];
  for (const dark of [true, false]) { await theme(page, dark); const state = await anatomyState(page); expectAnatomy(state, 0); expect(state.anatomy.positions).toEqual(beforeThemes.anatomy.positions); expect(state.body).toEqual(beforeThemes.body); expect(state.camera).toEqual(beforeThemes.camera); expect(anatomyPool(state)).toEqual(pool); expect(graphicPool(state)).toEqual(guidePool); themes.push(anatomyBrief(state)); }
  await select(page, 2); const reference = await mark(page); await select(page, 6); await keyboardClick(page, returnButton(page)); const returned = await anatomyState(page); expectAnatomy(returned, 0); expectReturned(returned, reference);
  await keyboardClick(page, page.getByRole('button', { name: 'Chase', exact: true })); expectHiddenAnatomy(await anatomyState(page)); await expect(anatomyToggle(page)).toHaveCount(0);
  await keyboardClick(page, page.getByRole('button', { name: 'Study', exact: true })); expectAnatomy(await anatomyState(page), 1); await follow(page, 0);
  const staleSpecies = await captureToggle(page); await nativeSelect(page, '3D migration focus species', 'monarch', 'lifecycle-monarch'); await invokeStaleToggle(page, staleSpecies); expectHiddenAnatomy(await anatomyState(page));
  await nativeSelect(page, '3D migration focus species', 'canada_goose', 'lifecycle-canada-goose'); const rebuilt = await anatomyState(page); expectAnatomy(rebuilt, 1); expect(anatomyPool(rebuilt)).toEqual(pool); expect(graphicPool(rebuilt)).toEqual(guidePool); await follow(page, 0); const staleLoss = await captureToggle(page), beforeLoss = await saved(page);
  await page.evaluate(() => {
    const scene = (window as any).__glCanvas().rec.scene, resources = new Map<string, any>();
    for (const name of ['migration-anatomy-callouts', 'migration-anatomy-markers', 'migration-wingtip-path', 'migration-marked-wing-pose']) scene.getObjectByName(name).traverse((node: any) => { if (node.geometry) resources.set(node.geometry.uuid, node.geometry); for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) resources.set(material.uuid, material); });
    (window as any).__anatomy18Disposals = Array.from(resources.values()).map(resource => { const item = { uuid: resource.uuid, count: 0 }; resource.addEventListener('dispose', () => item.count++); return item; });
  });
  const loss = await page.evaluate(async () => {
    const rec = (window as any).__glCanvas().rec, overlay = rec.scene.getObjectByName('migration-anatomy-callouts'), markers = rec.scene.getObjectByName('migration-anatomy-markers');
    const sample = () => ({ visible: overlay.visible, markerVisible: markers.visible, side: overlay.userData.anatomySide, source: overlay.userData.sourceBirdUuid, markerSide: markers.userData.anatomySide, markerSource: markers.userData.sourceBirdUuid, markers: markers.children.map((marker: any) => ({ side: marker.userData.anatomySide, focused: marker.userData.focused, ring: marker.getObjectByName('migration-anatomy-focus-ring').visible })) });
    rec.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })); const states = [sample()]; for (let frame = 0; frame < 5; frame++) { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); states.push(sample()); } return states;
  });
  for (const state of loss) { expect(state.visible).toBe(false); expect(state.markerVisible).toBe(false); expect(state.side).toBeNull(); expect(state.markerSide).toBeNull(); expect(state.source).toBe(''); expect(state.markerSource).toBe(''); for (const marker of state.markers) { expect(marker.side).toBeNull(); expect(marker.focused).toBe(false); expect(marker.ring).toBe(false); } }
  await page.evaluate(index => { const item = (window as any).__anatomy18Callbacks[index]; item.fn({ currentTarget: item.element, target: item.element }); }, staleLoss);
  expect(await saved(page)).toEqual(beforeLoss); await expect(anatomyToggle(page)).toHaveCount(0); expect(work(await saved(page))).toEqual(work(beforeLoss));
  await harness.unmount(page); await expect.poll(() => page.evaluate(() => (window as any).__anatomy18Disposals.every((item: any) => item.count === 1))).toBe(true);
  const disposal = await page.evaluate(() => (window as any).__anatomy18Disposals); expect(disposal).toHaveLength(28); await mount(page, beforeLoss); expectAnatomy(await anatomyState(page), 1); await expect(anatomyToggle(page)).toHaveCount(0); expect(await saved(page)).toEqual(beforeLoss); expect(speciesWork(beforeLoss)).toEqual(speciesWork(original));
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'followed-anatomy-source-lifecycle.json'), JSON.stringify({ first: anatomyBrief(first), themes, returned: anatomyBrief(returned), loss, disposal, beforeLoss }, null, 2));
});

for (const dark of [false, true]) test.describe('Migration followed anatomy phone ' + (dark ? 'dark' : 'light') + ' round18', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Followed wing anatomy and trace activity support native keyboard and touch with fixed-camera observations and existing notes', async ({ page }) => {
    await mount(page, { ...observationSeed(), flightShowAnatomy: false, flightWingStep: 13 }); await theme(page, dark); const original = await saved(page), stem = 'mobile-' + (dark ? 'dark' : 'light') + '-followed-anatomy';
    await follow(page, 0); const button = anatomyToggle(page), box = await button.boundingBox(); expect(box?.height).toBeGreaterThanOrEqual(44); expect(box?.width).toBeGreaterThanOrEqual(44); expectAnatomy(await toggleAnatomy(page, true), 0);
    const activity = page.locator('[data-followed-anatomy-activity="true"]'); await expect(activity).toBeVisible(); expect((await activity.textContent())?.toLowerCase()).toContain('predict');
    const region = page.locator('[data-study-region="inner-wing"]'); await keyboardClick(page, region); await expect(region).toHaveAttribute('aria-pressed', 'true');
    const trace = page.locator("[data-migration-id=\"migration-study-motion-evidence-prompt\"]"); await expect(trace).toContainText('Keep the camera fixed'); await expect(trace).toContainText('3 and 7'); await expect(trace).toContainText('side');
    await page.getByRole('button', { name: 'From above', exact: true }).tap(); await frames(page); await positionButton(page, 2).tap(); await frames(page); const pose3 = await anatomyState(page); expectAnatomy(pose3, 0);
    await positionButton(page, 6).tap(); await frames(page); const pose7 = await anatomyState(page); expectAnatomy(pose7, 0); expect(pose7.camera).toEqual(pose3.camera); expect(pose7.body).toEqual(pose3.body); expect(pose7.serial).toBe(13); expect(pose7.anatomy.chunks[1]).not.toEqual(pose3.anatomy.chunks[1]); expect(pose7.anatomy.chunks[2]).not.toEqual(pose3.anatomy.chunks[2]);
    await expect(page.locator('[data-study-anatomy-side="left"]')).toBeVisible();
    const beforeTouch = await saved(page); await button.tap(); await frames(page); await expect(button).toHaveAttribute('aria-pressed', 'false'); expectHiddenAnatomy(await anatomyState(page)); expect(await saved(page)).toEqual({ ...beforeTouch, flightShowAnatomy: false });
    await button.tap(); await frames(page); await expect(button).toHaveAttribute('aria-pressed', 'true'); expectAnatomy(await anatomyState(page), 0); expect(await saved(page)).toEqual(beforeTouch);
    await page.locator('.migration-flight-stage').scrollIntoViewIfNeeded(); const picking = await anatomyState(page), marker = picking.anatomy.markers.find((item: any) => item.number === 3); expect(marker.z).toBeGreaterThanOrEqual(-1); expect(marker.z).toBeLessThanOrEqual(1); await page.touchscreen.tap(marker.x, marker.y); await frames(page);
    await expect(page.locator('[data-study-region="primaries"]')).toHaveAttribute('aria-pressed', 'true'); expectAnatomy(await anatomyState(page), 0); samePhase((await anatomyState(page)).phase, pose7.phase);
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, stem + '-stage.png') }); await activity.screenshot({ path: join(report, stem + '-activity.png') });
    await page.getByRole('button', { name: 'Describe wing motion', exact: true }).tap(); const input = page.getByRole('textbox', { name: 'My observation', exact: true }); await expect(input).toBeFocused(); await expect(input).toHaveValue(original.flightStudyObservations.drafts['canada_goose:primaries']); expect(work(await saved(page))).toEqual(work(original));
    await expect(trace).toContainText('3 and 7'); await input.fill('I followed the individual’s left wing. With the camera fixed, cycle positions 3 and 7 changed the angles of the inner wing and outer primary feathers while they stayed connected.'); await page.getByRole('button', { name: 'Record observation', exact: true }).tap(); const recorded = await saved(page);
    expect(recorded.flightStudyObservations.records['canada_goose:primaries'].note).toContain('individual’s left wing'); expect(recorded.flightStudyObservations.drafts['canada_goose:head']).toBe(original.flightStudyObservations.drafts['canada_goose:head']); expect(recorded.flightStudyObservations.drafts['monarch:whole-wing']).toBe(original.flightStudyObservations.drafts['monarch:whole-wing']); for (const key of ['flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText']) expect(recorded[key]).toEqual(original[key]);
    const regionSizes = await page.locator('[data-study-region]').evaluateAll(nodes => nodes.map(node => { const rect = node.getBoundingClientRect(); return { width: rect.width, height: rect.height }; })); for (const size of regionSizes) { expect(size.width).toBeGreaterThanOrEqual(44); expect(size.height).toBeGreaterThanOrEqual(44); }
    await page.addScriptTag({ content: axeSource }); const audit = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }); return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, violations: result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) })), errors: (window as any).__events.errors }; });
    expect(audit.width).toBe(390); expect(audit.scrollWidth).toBeLessThanOrEqual(390); expect(audit.violations).toEqual([]); expect(audit.errors).toEqual([]); await page.locator('[data-study-observation]').screenshot({ path: join(report, stem + '-notes.png') });
    await writeFile(join(report, stem + '.json'), JSON.stringify({ original, pose3: anatomyBrief(pose3), pose7: anatomyBrief(pose7), recorded, audit }, null, 2));
  });
});
