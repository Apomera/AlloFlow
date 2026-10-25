import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 120_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round29-2026-10-21');
const axeSource = readFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');
const canonicalSource = readFileSync(join(process.cwd(), 'stem_lab/stem_tool_migration.js'));
const mirrorSource = readFileSync(join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js'));
if (!canonicalSource.equals(mirrorSource)) throw new Error('Migration canonical and desktop mirror must match');
const sourceProof = { canonical: 'stem_lab/stem_tool_migration.js', mirror: 'desktop/web-app/public/stem_lab/stem_tool_migration.js',
  bytes: canonicalSource.length, sha256: createHash('sha256').update(canonicalSource).digest('hex'), identical: true };
if (process.env.STEM_GL_SUBSTITUTE || process.env.MIG_TOOL_FILE) throw new Error('Canonical identity checks reject source substitutions');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_migration.js', toolId: 'migration',
  width: 1100, height: 900, layout: 'document', appStyles: true,
  probes: `var viewport=document.createElement('meta');viewport.name='viewport';viewport.content='width=device-width,initial-scale=1';document.head.appendChild(viewport);document.querySelector('#wrap').style.width='min(100vw,1100px)';document.body.style.fontFamily='system-ui,sans-serif';document.body.style.background='#f8fafc';`
});
const failures = new WeakMap<Page, string[]>();
test.beforeAll(async () => { await mkdir(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([harness.destroy(page), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Round29 scene cleanup exceeded 20 seconds')), 20_000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
});

const stage = (page: Page) => page.locator('.migration-flight-stage');
const context = (page: Page) => page.locator('#migration-study-current-context');
const note = (page: Page) => page.getByRole('textbox', { name: 'My observation', exact: true });
const cycle = (page: Page, index: number) => page.getByRole('button', { name: 'Cycle position ' + (index + 1) + ' of 8', exact: true });
const viewpoint = (page: Page, id: string) => page.locator('[data-study-viewpoint="' + id + '"]');
const checkedCue = (page: Page) => context(page).locator('[data-study-checked-comparison]');
async function frames(page: Page) {
  const before = await page.evaluate(() => (window as any).__glScene()?.renders || 0);
  await page.waitForFunction(before => ((window as any).__glScene()?.renders || 0) >= before + 2, before, { timeout: 20_000 });
}
async function activate(page: Page, locator: Locator, touch = false) {
  if (touch) await locator.tap();
  else { await locator.focus(); await page.keyboard.press('Enter'); }
  await frames(page);
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.migration)));
}
function work(data: any) {
  return Object.fromEntries(['flightStudyObservations', 'flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText'].map(key => [key, data[key]]));
}
function learnerSeed(id: string, region: string) {
  const key = id + ':' + region;
  return {
    flightStudyObservations: { drafts: { [key]: 'My prediction before observing ' + id + '.' },
      records: { [key]: { speciesId: id, region, note: 'Keep my earlier recorded evidence.', bird: 0,
        yaw: 90, pitch: 10, zoom: 1, wingStep: 4, paused: true, motionReduced: true } },
      comparison: { draft: 'Keep my own comparison claim.' } },
    flightInvestigation: { variable: 'wind', prediction: 'Keep my wind prediction.', trials: [], evidence: 'Keep my wind evidence.' },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep my challenge prediction.', notes: 'Keep my reasoning.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep my migration hypothesis.', explanation: 'Keep my explanation.', trials: [] },
    aiExplorerText: 'Keep my migration research.'
  };
}
async function setTheme(page: Page, dark: boolean) {
  await page.evaluate(dark => {
    const w = window as any; w.__ctx.isDark = dark; w.__ctx.theme = dark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', dark);
    document.body.style.background = dark ? '#0f172a' : '#f8fafc'; w.__rerender();
  }, dark);
  await frames(page);
}
async function mount(page: Page, id: string, region: string, dark: boolean, reducedMotion = true, extra: any = {}) {
  page.setDefaultTimeout(20_000); page.setDefaultNavigationTimeout(30_000);
  const errors: string[] = []; failures.set(page, errors);
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('crash', () => errors.push('Browser page crashed'));
  page.on('console', message => { if (message.type() === 'error' && /WebGL|shader|context lost|THREE\.WebGLRenderer/i.test(message.text())) errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  await harness.mount(page, { migration: { tab: 'flight3d', flightCamera: 'chase', flightPaused: true,
    flightSpecies: id, flightShowWingtipPath: true, flightShowAnatomy: id !== 'monarch',
    flightStudyRegion: region, flightStudyObservationOpen: true, flightWingStep: 13,
    flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, ...learnerSeed(id, region), ...extra } },
    'document.querySelector(".migration-flight-stage")?.getAttribute("data-flight-ready")==="true"');
  await page.evaluate(() => {
    const w = window as any, record = w.__glCanvas()?.rec, original = record.scene.onBeforeRender;
    const updateMulti = w.__ctx.updateMulti, update = w.__ctx.update;
    w.__round29Writes = [];
    w.__ctx.update = function(bucket: string, key: string, value: any) {
      w.__round29Writes.push({ bucket, patch: JSON.parse(JSON.stringify({ [key]: value })) });
      return update.call(this, bucket, key, value);
    };
    w.__ctx.updateMulti = function(bucket: string, patch: any) {
      w.__round29Writes.push({ bucket, patch: JSON.parse(JSON.stringify(patch)) });
      return updateMulti.call(this, bucket, patch);
    };
    record.scene.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) {
      record.camera = camera; record.renderer = renderer;
      if (original) original.call(this, renderer, scene, camera, ...rest);
    };
  });
  await setTheme(page, dark);
  expect(await harness.glScene(page)).toMatchObject({ hasScene: true });
  expect((await harness.glContexts(page)).some(item => item.createdBy === 'page' && item.type === 'webgl2' && !item.lost && item.draws > 0)).toBe(true);
}

async function renderState(page: Page) {
  return page.evaluate(() => {
    const w = window as any, rec = w.__glCanvas()?.rec, scene = rec?.scene, camera = rec?.camera, THREE = w.THREE;
    if (!scene || !camera || !rec.canvas) throw new Error('Rendered lighting scene unavailable');
    scene.updateMatrixWorld(true);
    const hemi = scene.getObjectByName('migration-flight-hemisphere');
    const key = scene.getObjectByName('migration-flight-key-light');
    const rim = scene.getObjectByName('migration-flight-rim-light');
    const flock = scene.getObjectByName('migration-flock'), data = w.__toolData.migration;
    if (!hemi?.isHemisphereLight || !key?.isDirectionalLight || !rim?.isDirectionalLight || !flock) throw new Error('Expected three original named lights');
    const bird = flock.children[Math.max(0, Math.min(flock.children.length - 1, Number(data.flightStudyBird) || 0))];
    const target = bird.getWorldPosition(new THREE.Vector3());
    const axes = [0, 1, 2].map(column => new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, column).normalize());
    const identityMap = w.__direction29Ids || (w.__direction29Ids = new WeakMap());
    const identity = (object: object) => { if (!identityMap.has(object)) identityMap.set(object, w.__direction29Next = (w.__direction29Next || 0) + 1); return identityMap.get(object); };
    const countLights: string[] = [], sceneResources = new Set<string>(), birdResources = new Set<string>();
    const birdColors = new Map<string, number>(); const geometryBuffers = new Map<string, number[]>();
    scene.traverse((node: any) => {
      if (node.isLight) countLights.push(node.uuid);
      if (node.geometry) sceneResources.add(node.geometry.uuid);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (material) { sceneResources.add(material.uuid); if (material.map) sceneResources.add(material.map.uuid); }
      }
    });
    bird.traverse((node: any) => {
      if (node.geometry) {
        birdResources.add(node.geometry.uuid);
        const attribute = node.geometry.attributes.position;
        if (attribute) geometryBuffers.set(node.geometry.uuid, [identity(attribute), identity(attribute.array)]);
      }
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) {
        birdResources.add(material.uuid); if (material.color) birdColors.set(material.uuid, material.color.getHex());
      }
    });
    const directional = (light: any) => {
      light.updateWorldMatrix(true, false); light.target.updateWorldMatrix(true, false);
      const position = light.getWorldPosition(new THREE.Vector3()), point = light.target.getWorldPosition(new THREE.Vector3());
      const delta = position.clone().sub(target), direction = position.clone().sub(point).normalize();
      return { uuid: light.uuid, targetUuid: light.target.uuid, color: light.color.getHex(), intensity: light.intensity,
        position: light.position.toArray(), worldPosition: position.toArray(), target: light.target.position.toArray(), worldTarget: point.toArray(),
        cameraOffset: axes.map(axis => delta.dot(axis)), cameraDirection: axes.map(axis => direction.dot(axis)),
        shadow: { object: identity(light.shadow), camera: identity(light.shadow.camera), mapSize: light.shadow.mapSize.toArray(), castShadow: light.castShadow,
          map: light.shadow.map?.texture?.uuid || null } };
    };

    // Inspect the real geometry used by both mirrored primary meshes. These
    // checks read positions/normals/indices; they do not trust feature metadata.
    const primaryMeshes = bird.userData.primaries || [];
    const primary = primaryMeshes.map((mesh: any) => {
      const geometry = mesh.geometry, positions = geometry.attributes.position, normals = geometry.attributes.normal;
      const colors = geometry.attributes.color, indices = geometry.index;
      const p = Array.from(positions.array) as number[], n = Array.from(normals.array) as number[];
      const c = Array.from(colors.array) as number[], ix = Array.from(indices.array) as number[];
      const ridges: any[] = [], triangleAreas: number[] = [], triangleFacing: number[] = [], normalLengths: number[] = [];
      for (let feather = 0; feather < 5; feather++) {
        const offset = feather * 7 * 3, baseY = p[offset + 1], baseZ = p[offset + 2];
        const shoulderY = p[offset + 2 * 3 + 1], shoulderZ = p[offset + 2 * 3 + 2];
        ridges.push([5, 6].map(vertex => {
          const index = offset + vertex * 3;
          const edgeY = baseY + (shoulderY - baseY) * (p[index + 2] - baseZ) / (shoulderZ - baseZ);
          return { position: p.slice(index, index + 3), lift: p[index + 1] - edgeY };
        }));
      }
      for (let vertex = 0; vertex < normals.count; vertex++) normalLengths.push(Math.hypot(...n.slice(vertex * 3, vertex * 3 + 3)));
      for (let index = 0; index < ix.length; index += 3) {
        const a = ix[index] * 3, b = ix[index + 1] * 3, c = ix[index + 2] * 3;
        const u = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
        const v = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
        const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        triangleAreas.push(Math.hypot(...cross) / 2); triangleFacing.push(cross[1]);
      }
      return { name: mesh.name, geometry: geometry.uuid, material: mesh.material.uuid, scaleX: mesh.scale.x,
        vertices: positions.count, normalCount: normals.count, indexCount: indices.count,
        positions: p, normals: n, colors: c, indices: ix, ridges,
        triangleAreas, triangleFacing, normalLengths,
        identities: [identity(positions), identity(positions.array), identity(normals), identity(normals.array), identity(colors), identity(colors.array), identity(indices), identity(indices.array)] };
    });
    const tailMesh = bird.getObjectByName('migration-tail-feathers');
    const tail = tailMesh ? (() => {
      const g = tailMesh.geometry, p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color, ix = g.index;
      const positions = Array.from(p.array) as number[], normals = Array.from(n.array) as number[];
      const areas: number[] = [], facing: number[] = [];
      for (let i = 0; i < ix.count; i += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(p, ix.getX(i));
        const b = new THREE.Vector3().fromBufferAttribute(p, ix.getX(i + 1)).sub(a);
        const d = new THREE.Vector3().fromBufferAttribute(p, ix.getX(i + 2)).sub(a);
        const cross = b.cross(d); areas.push(cross.length() / 2); facing.push(cross.y);
      }
      return { geometry: g.uuid, material: tailMesh.material.uuid, vertices: p.count, indices: ix.count,
        positions, normals, colors: Array.from(c.array), areas, facing,
        identities: [identity(p), identity(p.array), identity(n), identity(n.array), identity(c), identity(c.array), identity(ix), identity(ix.array)] };
    })() : null;
    // Read wrist panels independently of their primary-feather child meshes.
    const hands = (bird.userData.wrists || []).flatMap((wrist: any, side: number) =>
      wrist.children.filter((part: any) => part.isMesh && part.name !== 'migration-primary-feathers').map((mesh: any) => {
        const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal, ix = g.index;
        const positions = Array.from(p.array) as number[], normals = Array.from(n.array) as number[];
        const areas: number[] = [], facing: number[] = [], edges = new Map<string, number>();
        for (let index = 0; index < ix.count; index += 3) {
          const triangle = [ix.getX(index), ix.getX(index + 1), ix.getX(index + 2)];
          const a = new THREE.Vector3().fromBufferAttribute(p, triangle[0]);
          const b = new THREE.Vector3().fromBufferAttribute(p, triangle[1]).sub(a);
          const c = new THREE.Vector3().fromBufferAttribute(p, triangle[2]).sub(a);
          const cross = b.cross(c); areas.push(cross.length() / 2); facing.push(cross.y);
          for (let edge = 0; edge < 3; edge++) {
            const key = [triangle[edge], triangle[(edge + 1) % 3]].sort((a, b) => a - b).join(':');
            edges.set(key, (edges.get(key) || 0) + 1);
          }
        }
        return { side: side === 0 ? -1 : 1, geometry: g.uuid, material: mesh.material.uuid,
          vertices: p.count, normalCount: n.count, indexCount: ix.count, positions, normals,
          indices: Array.from(ix.array), areas, facing,
          boundary: [...edges].filter(([, count]) => count === 1).map(([edge]) => edge).sort(),
          edgeUses: [...edges].sort(), identities: [identity(p), identity(p.array), identity(n), identity(n.array), identity(ix), identity(ix.array)] };
      }));
    const path = scene.getObjectByName('migration-wingtip-path'), marked = scene.getObjectByName('migration-marked-wing-pose');
    const markedPositions = marked?.geometry?.attributes.position;
    const markedCount = marked?.geometry?.drawRange.count || 0;
    const rect = rec.canvas.getBoundingClientRect();
    const joints = [...(bird.userData.wings || []), ...(bird.userData.wrists || []), ...(bird.userData.primaries || [])].filter(Boolean);
    return {
      primary, tail, hands, studyRadius: bird.userData.studyRadius,
      path: { available: path?.userData.available, buildVersion: path?.userData.buildVersion, sampleCount: path?.userData.sampleCount },
      marked: { captured: marked?.userData.captured, capturedPhase: marked?.userData.capturedPhase, capacity: marked?.userData.capacity, vertexCount: marked?.userData.vertexCount,
        drawCount: markedCount, finite: markedPositions ? Array.from(markedPositions.array).slice(0, markedCount * 3).every(Number.isFinite) : false },
      lights: { hemi: { uuid: hemi.uuid, color: hemi.color.getHex(), ground: hemi.groundColor.getHex(), intensity: hemi.intensity, position: hemi.position.toArray() },
        key: directional(key), rim: directional(rim), count: countLights.length, identities: countLights.sort() },
      target: target.toArray(), axes: axes.map(axis => axis.toArray()),
      pool: { scene: [...sceneResources].sort(), bird: [...birdResources].sort(), buffers: [...geometryBuffers].sort(), materialColors: [...birdColors].sort() },
      pose: { species: data.flightSpecies, source: bird.uuid, phase: bird.userData.lastRenderedWingPhase,
        body: bird.matrixWorld.elements.slice(), flock: flock.matrixWorld.elements.slice(), allBodies: flock.children.map((node: any) => node.matrixWorld.elements.slice()),
        joints: joints.map((node: any) => node.quaternion.toArray()), serial: Number(data.flightWingStep) || 0, paused: data.flightPaused === true },
      view: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), matrix: camera.matrixWorld.elements.slice(), projection: camera.projectionMatrix.elements.slice() },
      canvas: { width: rect.width, height: rect.height }, errors: w.__events.errors
    };
  });
}

async function cameraError(page: Page) {
  return page.evaluate(() => {
    const w = window as any, rec = w.__glCanvas()?.rec, camera = rec.camera, THREE = w.THREE, data = w.__toolData.migration;
    const flock = rec.scene.getObjectByName('migration-flock'), bird = flock.children[Number(data.flightStudyBird) || 0];
    const target = bird.getWorldPosition(new THREE.Vector3());
    const half = Math.min(camera.fov * Math.PI / 360, Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
    const radius = bird.userData.studyRadius * 1.18 / Math.sin(half) / data.flightStudyZoom;
    const yaw = data.flightStudyYaw * Math.PI / 180, pitch = data.flightStudyPitch * Math.PI / 180;
    const desired = target.clone().add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch) * radius,
      Math.sin(pitch) * radius, Math.cos(yaw) * Math.cos(pitch) * radius));
    const forward = camera.getWorldDirection(new THREE.Vector3());
    return { error: camera.position.distanceTo(desired), position: camera.position.toArray(), desired: desired.toArray(),
      directionError: forward.distanceTo(target.clone().sub(camera.position).normalize()),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
  });
}
async function cameraSettled(page: Page) {
  await expect.poll(async () => {
    const camera = await cameraError(page);
    return Math.max(camera.error, camera.directionError);
  }, { timeout: 12_000, intervals: [50, 100, 200] }).toBeLessThan(1e-5);
  return cameraError(page);
}

const themeValues = (dark: boolean) => dark
  ? { hemi: [0x415a86, 0x10161f, .26], key: [0xcddcff, .42], rim: [0x6f8ec6, .20] }
  : { hemi: [0xcfe6f5, 0x2f4a2c, .72], key: [0xfff2d0, 1.05], rim: [0x9fd0ec, .42] };
function expectCorridor(state: any, dark: boolean) {
  const theme = themeValues(dark);
  expect([state.lights.hemi.color, state.lights.hemi.ground, state.lights.hemi.intensity]).toEqual(theme.hemi);
  expect([state.lights.key.color, state.lights.key.intensity]).toEqual(theme.key);
  expect([state.lights.rim.color, state.lights.rim.intensity]).toEqual(theme.rim);
  expect(state.lights.key.position).toEqual([-28, 34, 18]); expect(state.lights.rim.position).toEqual([22, 12, -40]);
  expect(state.lights.key.target).toEqual([0, 0, 0]); expect(state.lights.rim.target).toEqual([0, 0, 0]);
  expect(state.lights.count).toBe(3); expect(state.errors).toEqual([]);
}
function expectStudy(state: any) {
  expect([state.lights.hemi.color, state.lights.hemi.ground, state.lights.hemi.intensity]).toEqual([0xe4ecf0, 0x46515c, .62]);
  expect([state.lights.key.color, state.lights.key.intensity]).toEqual([0xfff5e8, .82]);
  expect([state.lights.rim.color, state.lights.rim.intensity]).toEqual([0xc6d8e5, .34]);
  for (const [light, offset] of [[state.lights.key, [-4, 5, 7]], [state.lights.rim, [5, 2, -4]]] as const) {
    for (let index = 0; index < 3; index++) { expect(light.cameraOffset[index]).toBeCloseTo(offset[index], 6); expect(light.worldTarget[index]).toBeCloseTo(state.target[index], 6); }
    const length = Math.hypot(...offset);
    for (let index = 0; index < 3; index++) expect(light.cameraDirection[index]).toBeCloseTo(offset[index] / length, 6);
    expect([...light.position, ...light.worldPosition, ...light.worldTarget, ...light.cameraDirection].every(Number.isFinite)).toBe(true);
  }
  expect(state.lights.count).toBe(3); expect(state.pose.serial).toBe(13); expect(state.pose.paused).toBe(true); expect(state.errors).toEqual([]);
}
function expectFixedPool(state: any, reference: any) {
  expect(state.pool).toEqual(reference.pool); expect(state.lights.identities).toEqual(reference.lights.identities);
  for (const id of ['key', 'rim']) {
    expect(state.lights[id].uuid).toBe(reference.lights[id].uuid); expect(state.lights[id].targetUuid).toBe(reference.lights[id].targetUuid);
    expect(state.lights[id].shadow).toEqual(reference.lights[id].shadow);
  }
  expect(state.lights.hemi.uuid).toBe(reference.lights.hemi.uuid);
}
async function capture(page: Page, name: string) { await stage(page).screenshot({ path: join(report, name + '.png') }); }
async function toggleStudy(page: Page, touch: boolean) {
  await activate(page, stage(page).getByRole('button', { name: 'Study view', exact: true }), touch);
}

const comparison = (page: Page) => page.locator('#migration-marked-comparison-controls');
const comparisonCheck = (page: Page) => comparison(page).locator('[data-marked-pose-action="check"]');
const breakdown = (page: Page) => comparison(page).locator('[data-marked-comparison-breakdown]');
const componentRestores = (page: Page) => comparison(page).locator('[data-marked-component-restores="true"]');
const pair = (page: Page) => page.locator('#migration-flight-trial-review[data-experiment-pair-review]');
const evidence = (page: Page) => page.locator('#migration-experiment-evidence');
const reminder = (page: Page) => page.locator('[data-trial-evidence-context="1"]');
const inspect = (page: Page) => reminder(page).locator('[data-experiment-action="inspect-saved-comparison"]');
async function writes(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__round29Writes))); }
function expectSceneFixed(state: any, reference: any) {
  expectFixedPool(state, reference);
  expect(state.primary).toEqual(reference.primary); expect(state.tail).toEqual(reference.tail); expect(state.hands).toEqual(reference.hands);
  expect(state.studyRadius).toBe(reference.studyRadius);
}
function historicalSeed(id: string) {
  const snapshot = (wind: number) => ({ speciesId: id, season: 'fall', formationMode: 'natural', wind });
  return { flightStudyYaw: 0, flightStudyPitch: 15, flightWind: 6,
    flightInvestigation: { variable: 'formation', prediction: 'My newer editable formation prediction.',
      baseline: { speciesId: 'arctic_tern', season: 'spring', formationMode: 'solo', wind: -15 },
      trials: [{ variable: 'wind', prediction: 'My original recorded wind prediction.',
        baseline: snapshot(0), snapshot: snapshot(10) }],
      evidence: 'My own evidence draft, kept while I inspect the saved comparison.', explanation: 'My own ungraded explanation.' } };
}

// Independent screen-space oracle: project actual triangles and find the
// Euclidean distance to each actual cue disk. It never calls the cue runtime.
async function arrowState(page: Page) {
  return page.evaluate(() => {
    const w = window as any, rec = w.__glCanvas()?.rec, camera = rec.camera, THREE = w.THREE;
    rec.scene.updateMatrixWorld(true);
    const rect = rec.canvas.getBoundingClientRect();
    const screen = (point: any) => { const p = point.clone().project(camera); return [(p.x + 1) * rect.width / 2, (1 - p.y) * rect.height / 2, p.z]; };
    const projectVertex = (geometry: any, index: number, matrix: any) => screen(new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, index).applyMatrix4(matrix));
    const segmentDistance = (p: number[], a: number[], b: number[]) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], squared = dx * dx + dy * dy;
      const t = squared ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / squared)) : 0;
      return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
    };
    const triangleDistance = (p: number[], triangle: number[][]) => {
      const cross = (a: number[], b: number[], q: number[]) => (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
      const signs = triangle.map((a, index) => cross(a, triangle[(index + 1) % 3], p));
      if (signs.every(value => value >= -1e-7) || signs.every(value => value <= 1e-7)) return 0;
      return Math.min(...triangle.map((a, index) => segmentDistance(p, a, triangle[(index + 1) % 3])));
    };
    const path = rec.scene.getObjectByName('migration-wingtip-path');
    return { canvas: { width: rect.width, height: rect.height },
      path: { visible: path.visible, buildVersion: path.userData.buildVersion, samples: path.userData.sampleCount },
      sides: ['left', 'right'].map(side => {
        const arrow = rec.scene.getObjectByName('migration-wingtip-' + side + '-direction');
        const point = rec.scene.getObjectByName('migration-wingtip-' + side + '-point');
        const rings = rec.scene.getObjectByName('migration-wingtip-' + side + '-landmarks');
        const dotCenter = screen(point.getWorldPosition(new THREE.Vector3()));
        const dotVertices = Array.from({ length: point.geometry.attributes.position.count }, (_, index) => projectVertex(point.geometry, index, point.matrixWorld));
        const dotRadius = Math.max(...dotVertices.map(p => Math.hypot(p[0] - dotCenter[0], p[1] - dotCenter[1])));
        const active = rings.userData.activeCheckpoint;
        let ring: any = null;
        if (Number.isInteger(active) && active >= 0 && active < rings.count) {
          const matrix = new THREE.Matrix4(); rings.getMatrixAt(active, matrix); matrix.premultiply(rings.matrixWorld);
          const center = screen(new THREE.Vector3().applyMatrix4(matrix));
          const vertices = Array.from({ length: rings.geometry.attributes.position.count }, (_, index) => projectVertex(rings.geometry, index, matrix));
          ring = { index: active, center, radius: Math.max(...vertices.map(p => Math.hypot(p[0] - center[0], p[1] - center[1]))) };
        }
        const vertices = Array.from({ length: arrow.geometry.attributes.position.count }, (_, index) => projectVertex(arrow.geometry, index, arrow.matrixWorld));
        const indices = arrow.geometry.index ? Array.from(arrow.geometry.index.array) as number[] : vertices.map((_, index) => index);
        const triangles: number[][][] = [];
        for (let index = 0; index < indices.length; index += 3) triangles.push(indices.slice(index, index + 3).map(index => vertices[index]));
        const distance = (center: number[]) => Math.min(...triangles.map(triangle => triangleDistance(center, triangle)));
        const phase = arrow.userData.phase, anchorPhase = arrow.userData.anchorPhase;
        const aheadSamples = Number.isFinite(phase) && Number.isFinite(anchorPhase)
          ? (((anchorPhase - phase) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) * 64 / (Math.PI * 2) : null;
        return { side, visible: arrow.visible, geometry: arrow.geometry.uuid, material: arrow.material.uuid,
          phase, anchorPhase, aheadSamples, dotCenter, dotRadius, ring, vertices, triangles,
          dotClearance: distance(dotCenter) - dotRadius, ringClearance: ring ? distance(ring.center) - ring.radius : null };
      }) };
  });
}
function expectArrows(state: any, minimumVisible = 1) {
  expect(state.path.visible).toBe(true);
  expect(state.sides.filter((side: any) => side.visible).length).toBeGreaterThanOrEqual(minimumVisible);
  expect(state.sides[0].geometry).toBe(state.sides[1].geometry);
  for (const side of state.sides) {
    expect(side.dotRadius).toBeCloseTo(6, 2);
    if (side.ring) expect(side.ring.radius).toBeCloseTo(8, 2);
    if (!side.visible) { expect(side.anchorPhase).toBeNull(); continue; }
    expect(Number.isFinite(side.anchorPhase)).toBe(true);
    expect(side.aheadSamples).toBeGreaterThanOrEqual(2 - 1e-6); expect(side.aheadSamples).toBeLessThanOrEqual(8 + 1e-6);
    expect(side.dotClearance).toBeGreaterThanOrEqual(1.95);
    if (side.ring) expect(side.ringClearance).toBeGreaterThanOrEqual(1.95);
    for (const vertex of side.vertices) {
      expect(vertex.every(Number.isFinite)).toBe(true);
      expect(vertex[0]).toBeGreaterThanOrEqual(-.05); expect(vertex[0]).toBeLessThanOrEqual(state.canvas.width + .05);
      expect(vertex[1]).toBeGreaterThanOrEqual(-.05); expect(vertex[1]).toBeLessThanOrEqual(state.canvas.height + .05);
      expect(vertex[2]).toBeGreaterThanOrEqual(-1); expect(vertex[2]).toBeLessThanOrEqual(1);
    }
  }
}
async function accessibility(page: Page) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => {
    const scan = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, errors: (window as any).__events.errors,
      violations: scan.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) })) };
  });
  expect(result.violations).toEqual([]); expect(result.errors).toEqual([]); expect(failures.get(page)).toEqual([]);
  expect(result.scrollWidth).toBe(result.width); return result;
}
async function arrowScene(page: Page, id: string, region: string, dark: boolean, touch: boolean) {
  await mount(page, id, region, dark, true, historicalSeed(id));
  await toggleStudy(page, touch);
  await activate(page, cycle(page, 2), touch);
  let arrows = await arrowState(page), chosenCycle = 2;
  const inspectedCheckpoints: any[] = [{ index: chosenCycle, arrows }];
  if (id !== 'canada_goose' && !arrows.sides.some((side: any) => side.visible)) {
    // A cramped projection may legitimately hide both chevrons. Select a
    // useful native checkpoint for the phone illustration; retain every result.
    expectArrows(arrows, 0);
    for (const index of [0, 1, 3, 4, 5, 6, 7]) {
      await activate(page, cycle(page, index), touch); chosenCycle = index; arrows = await arrowState(page);
      inspectedCheckpoints.push({ index, arrows }); expectArrows(arrows, 0);
      if (arrows.sides.some((side: any) => side.visible)) break;
    }
  }
  const state = await renderState(page), initialData = await saved(page);
  expectStudy(state); expectArrows(arrows, id === 'canada_goose' ? 2 : 1);
  const stem = touch ? 'mobile-' + (dark ? 'dark-monarch' : 'light-peregrine') : 'desktop-goose';
  await capture(page, stem + '-direction-clearance');
  return { stem, state, arrows, initialData, chosenCycle, inspectedCheckpoints };
}

async function captureCheckedComponents(page: Page, name: string) {
  await expect(breakdown(page)).toBeVisible();
  await expect(componentRestores(page)).toBeVisible();
  const layout = await comparison(page).evaluate(root => {
    const dl = root.querySelector('[data-marked-comparison-breakdown]')!;
    const group = root.querySelector('[data-marked-component-restores="true"]')!;
    const controls = root.closest('.migration-flight-controls') as HTMLElement;
    if (!dl || !group || !controls) throw new Error('Checked comparison capture needs both rows and the restore group');
    const range = document.createRange();
    range.setStartBefore(dl); range.setEndAfter(group);
    const combinedHeight = range.getBoundingClientRect().height;
    // Mobile controls flow in the document; desktop controls have their own
    // native scrollport. Both keep the learner's actual layout and content.
    const availableHeight = Math.min(controls.clientHeight, innerHeight) - 16;
    const mode = combinedHeight <= availableHeight ? 'breakdown-and-restores' : 'restore-group-only';
    if (mode === 'restore-group-only') range.selectNode(group);
    controls.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' as ScrollBehavior });
    let box = range.getBoundingClientRect(), scroller = controls.getBoundingClientRect();
    controls.scrollTop += box.top - (scroller.top + controls.clientTop + 8);
    box = range.getBoundingClientRect();
    window.scrollBy({ top: box.top - 8, left: 0, behavior: 'instant' as ScrollBehavior });
    box = range.getBoundingClientRect(); scroller = controls.getBoundingClientRect();
    const content = { left: scroller.left + controls.clientLeft, top: scroller.top + controls.clientTop,
      right: scroller.left + controls.clientLeft + controls.clientWidth,
      bottom: scroller.top + controls.clientTop + controls.clientHeight };
    const visible = { left: Math.max(0, content.left), top: Math.max(0, content.top),
      right: Math.min(innerWidth, content.right), bottom: Math.min(innerHeight, content.bottom) };
    const rect = { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    // page.screenshot({ fullPage:false, clip }) uses viewport CSS coordinates.
    // Do not add document scroll offsets, or the crop would target other content.
    const x = Math.floor(box.left), y = Math.floor(box.top);
    const clip = { x, y, width: Math.ceil(box.right) - x, height: Math.ceil(box.bottom) - y };
    return { mode, combinedHeight, availableHeight, rect, visible, clip,
      controlsScrollTop: controls.scrollTop, documentScroll: { x: scrollX, y: scrollY },
      dlRows: dl.querySelectorAll(':scope > [data-marked-comparison-variable]').length,
      restoreButtons: group.querySelectorAll('[data-marked-pose-action="restore-view-component"]').length };
  });
  expect(layout.dlRows).toBe(2);
  expect(layout.restoreButtons).toBeGreaterThan(0);
  expect(layout.rect.width).toBeGreaterThan(150); expect(layout.rect.height).toBeGreaterThan(80);
  expect(layout.rect.left).toBeGreaterThanOrEqual(layout.visible.left - 1);
  expect(layout.rect.top).toBeGreaterThanOrEqual(layout.visible.top - 1);
  expect(layout.rect.right).toBeLessThanOrEqual(layout.visible.right + 1);
  expect(layout.rect.bottom).toBeLessThanOrEqual(layout.visible.bottom + 1);
  expect(layout.clip.x).toBeGreaterThanOrEqual(0); expect(layout.clip.y).toBeGreaterThanOrEqual(0);
  await page.screenshot({ path: join(report, name + '.png'), fullPage: false, clip: layout.clip });
  return layout;
}


async function captureEvidence(page: Page, name: string) {
  const layout = await reminder(page).evaluate(start => {
    const field = document.querySelector('#migration-experiment-evidence')!;
    const range = document.createRange(); range.setStartBefore(start); range.setEndAfter(field.closest('label')!);
    let rect = range.getBoundingClientRect();
    window.scrollBy({ top: rect.top - 12, left: 0, behavior: 'instant' as ScrollBehavior });
    rect = range.getBoundingClientRect();
    const x = Math.floor(rect.left), y = Math.floor(rect.top);
    return { rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height },
      viewport: { width: innerWidth, height: innerHeight }, clip: { x, y, width: Math.ceil(rect.right) - x, height: Math.ceil(rect.bottom) - y } };
  });
  expect(layout.rect.top).toBeGreaterThanOrEqual(0); expect(layout.rect.bottom).toBeLessThanOrEqual(layout.viewport.height);
  expect(layout.rect.left).toBeGreaterThanOrEqual(0); expect(layout.rect.right).toBeLessThanOrEqual(layout.viewport.width);
  await page.screenshot({ path: join(report, name + '.png'), fullPage: false, clip: layout.clip });
  return layout;
}
async function historicalEvidenceFlow(page: Page, touch: boolean, stem: string) {
  await expect(reminder(page)).toHaveCount(0);
  const original = await saved(page);
  await activate(page, page.locator('[data-experiment-revisit="1"]'), touch);
  await expect(pair(page)).toHaveAttribute('data-review-trial', '1');
  await expect(pair(page)).toHaveAttribute('data-review-active', 'trial');
  await expect(reminder(page)).toContainText('Selected saved comparison: Trial 1 · Wind');
  const trial = await saved(page);
  expect(trial).toMatchObject({ flightWind: 10, flightCamera: 'chase', flightPaused: true });
  expect(work(trial)).toEqual(work(original));
  const wind = page.getByRole('slider', { name: /Along-route wind in meters per second/ });
  await wind.focus(); await wind.press('End'); await frames(page);
  await expect(pair(page)).toHaveAttribute('data-review-active', '');
  await expect(reminder(page)).toHaveCount(1);
  const beforeNavigation = await saved(page), beforeScene = await renderState(page), beforeWrites = await writes(page);
  expect(beforeNavigation.flightWind).toBe(25);
  expect(work(beforeNavigation)).toEqual(work(original));
  const baseline = pair(page).locator('[data-pair-review="baseline"]');
  const addEvidence = pair(page).locator('[data-pair-review="evidence"]');
  const field = await evidence(page).elementHandle();
  await activate(page, addEvidence, touch);
  await expect(evidence(page)).toBeFocused();
  await evidence(page).evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(7, 24, 'backward'));
  const caret = await evidence(page).evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd, element.selectionDirection]);
  await expect(evidence(page)).toHaveValue(original.flightInvestigation.evidence);
  await expect(page.locator('#migration-experiment-prediction')).toHaveValue('My newer editable formation prediction.');
  await activate(page, reminder(page).locator('summary'), touch);
  await expect(reminder(page).locator('[data-trial-evidence-prediction]')).toHaveJSProperty('open', true);
  await expect(reminder(page)).toContainText('My original recorded wind prediction.');
  await expect(reminder(page)).not.toContainText('My newer editable formation prediction.');
  await expect(inspect(page)).toHaveAccessibleName('Inspect saved trial comparison');
  await expect(inspect(page)).toHaveAttribute('aria-controls', 'migration-flight-trial-review');
  const button = await inspect(page).boundingBox(); expect(button!.height).toBeGreaterThanOrEqual(44);
  const captureLayout = await captureEvidence(page, stem + '-historical-evidence');
  const accessibilityResult = await accessibility(page);
  await activate(page, inspect(page), touch);
  await expect(baseline).toBeFocused();
  await expect(pair(page)).toHaveAttribute('data-review-active', '');
  await expect(baseline).toHaveAttribute('aria-pressed', 'false');
  const baselineBox = await baseline.boundingBox(), viewport = page.viewportSize()!;
  expect(baselineBox!.y).toBeGreaterThanOrEqual(-1); expect(baselineBox!.y + baselineBox!.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(await saved(page)).toEqual(beforeNavigation); expect(await writes(page)).toEqual(beforeWrites);
  const afterInspect = await renderState(page);
  expect(afterInspect.pose).toEqual(beforeScene.pose); expect(afterInspect.view).toEqual(beforeScene.view); expectSceneFixed(afterInspect, beforeScene);
  await activate(page, addEvidence, touch);
  await expect(evidence(page)).toBeFocused();
  expect(await field!.evaluate(element => element === document.querySelector('#migration-experiment-evidence'))).toBe(true);
  expect(await evidence(page).evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd, element.selectionDirection])).toEqual(caret);
  expect(await saved(page)).toEqual(beforeNavigation); expect(await writes(page)).toEqual(beforeWrites);
  await activate(page, pair(page).locator('[data-pair-review="close"]'), touch);
  await expect(pair(page)).toHaveCount(0); await expect(reminder(page)).toHaveCount(0);
  await expect(page.locator('[data-experiment-action="inspect-saved-comparison"]')).toHaveCount(0);
  await expect(stage(page)).toBeFocused(); expect(await saved(page)).toEqual(beforeNavigation); expect(await writes(page)).toEqual(beforeWrites);
  const finalScene = await renderState(page);
  expect(finalScene.pose).toEqual(beforeScene.pose); expect(finalScene.view).toEqual(beforeScene.view); expectSceneFixed(finalScene, beforeScene);
  return { original, trial, beforeNavigation, beforeScene, afterInspect, finalScene, caret, captureLayout, accessibility: accessibilityResult,
    currentConditionsDiffer: true, originalPredictionRetained: true, navigationDidNotReplayOrWrite: true };
}
async function setAngle175(page: Page) {
  const angle = page.getByRole('slider', { name: 'Study angle in degrees', exact: true });
  await angle.focus(); await angle.press('End'); await angle.press('ArrowLeft'); await frames(page);
  await expect(angle).toHaveValue('175');
}
async function nativeWrapFlow(page: Page, reference: any) {
  const angle = page.getByRole('slider', { name: 'Study angle in degrees', exact: true });
  await setAngle175(page);
  await activate(page, comparison(page).locator('[data-marked-pose-action="mark"]'));
  await activate(page, comparisonCheck(page));
  await expect(breakdown(page)).toHaveAttribute('data-marked-comparison-breakdown', 'same');
  const markedData = await saved(page), markedScene = await renderState(page);
  await stage(page).focus(); await page.keyboard.press('ArrowRight'); await frames(page);
  expect((await saved(page)).flightStudyYaw).toBe(-175);
  await expect(breakdown(page)).toHaveCount(0);
  const keyboardScene = await renderState(page);
  expect(keyboardScene.pose).toEqual(markedScene.pose); expectSceneFixed(keyboardScene, reference); expectStudy(keyboardScene);
  expect(work(await saved(page))).toEqual(work(markedData));
  await activate(page, comparisonCheck(page));
  await expect(breakdown(page)).toHaveAttribute('data-marked-comparison-breakdown', 'view-only');
  const comparisonCapture = await captureCheckedComponents(page, 'desktop-goose-keyboard-wrap-comparison');

  const beforeShortcuts = await saved(page), beforeShortcutScene = await renderState(page), beforeShortcutWrites = await writes(page);
  await stage(page).focus();
  for (const modifier of ['Control', 'Meta', 'Alt']) { await page.keyboard.press(modifier + '+ArrowRight'); await frames(page); }
  const nested = stage(page).getByRole('button', { name: 'Study view', exact: true });
  await nested.focus(); await page.keyboard.press('ArrowRight'); await frames(page);
  await expect(breakdown(page)).toHaveAttribute('data-marked-comparison-breakdown', 'view-only');
  await note(page).focus();
  await note(page).evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(8, 8));
  const noteText = await note(page).inputValue();
  await page.keyboard.press('ArrowLeft');
  expect(await note(page).evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd])).toEqual([7, 7]);
  await expect(note(page)).toHaveValue(noteText);
  expect(await saved(page)).toEqual(beforeShortcuts); expect(await writes(page)).toEqual(beforeShortcutWrites);
  const afterShortcutScene = await renderState(page);
  expect(afterShortcutScene.pose).toEqual(beforeShortcutScene.pose); expect(afterShortcutScene.view).toEqual(beforeShortcutScene.view);
  expectSceneFixed(afterShortcutScene, reference);

  await setAngle175(page);
  await stage(page).scrollIntoViewIfNeeded();
  const box = await stage(page).boundingBox(), x = box!.x + box!.width * .52, y = box!.y + box!.height * .48;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x - 25, y, { steps: 3 }); await frames(page);
  const preview = await renderState(page), beforePreviewWrites = await writes(page);
  await expect(stage(page)).toHaveAttribute('data-study-dragging', 'true');
  expect((await saved(page)).flightStudyYaw).toBe(175); expect(preview.view).toEqual(keyboardScene.view);
  await page.keyboard.press('Control+ArrowRight'); await frames(page);
  await expect(stage(page)).toHaveAttribute('data-study-dragging', 'true');
  expect((await renderState(page)).view).toEqual(preview.view); expect(await writes(page)).toEqual(beforePreviewWrites);
  await page.mouse.up(); await frames(page);
  expect((await saved(page)).flightStudyYaw).toBe(-175);
  const pointerScene = await renderState(page);
  expect(pointerScene.view).toEqual(keyboardScene.view); expect(pointerScene.pose).toEqual(keyboardScene.pose); expectSceneFixed(pointerScene, reference);

  await stage(page).focus();
  for (let index = 0; index < 36; index++) await page.keyboard.press('ArrowRight');
  await frames(page);
  expect((await saved(page)).flightStudyYaw).toBe(-175);
  await expect(breakdown(page)).toHaveCount(0);
  const fullCircle = await renderState(page);
  expect(fullCircle.view).toEqual(keyboardScene.view); expect(fullCircle.pose).toEqual(keyboardScene.pose); expectSceneFixed(fullCircle, reference);
  await angle.focus(); await angle.press('End'); await stage(page).focus(); await page.keyboard.press('ArrowRight'); await frames(page);
  expect((await saved(page)).flightStudyYaw).toBe(-170);
  await angle.focus(); await angle.press('Home'); await stage(page).focus(); await page.keyboard.press('ArrowLeft'); await frames(page);
  expect((await saved(page)).flightStudyYaw).toBe(170);
  return { markedData, markedScene, keyboardScene, pointerScene, preview, beforeShortcuts, afterShortcutScene, comparisonCapture, fullCircle,
    nativeKeyboardPointerParity: true, ignoredShortcutRetainedPreview: true, nestedButtonAndTextCaretPreserved: true, fullCircularOrbit: true };
}
test('Native keyboard and pointer orbit continuously while actual Goose direction triangles remain clear', async ({ page }) => {
  const scene = await arrowScene(page, 'canada_goose', 'primaries', false, false);
  const keyboard = await nativeWrapFlow(page, scene.state), final = await renderState(page), data = await saved(page);
  expect(final.pose).toEqual(scene.state.pose); expectSceneFixed(final, scene.state); expect(work(data)).toEqual(work(scene.initialData));
  const scan = await accessibility(page);
  await writeFile(join(report, 'desktop-goose-direction-keyboard.json'), JSON.stringify({ sourceProof, scene, keyboard, final, data, accessibility: scan }, null, 2));
});
for (const dark of [false, true]) test.describe('Migration direction and historical evidence phone ' + (dark ? 'dark Monarch' : 'light Peregrine'), () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Actual direction glyphs stay clear and historical evidence navigation preserves the current flight', async ({ page }) => {
    const scene = await arrowScene(page, dark ? 'monarch' : 'peregrine', dark ? 'whole-wing' : 'primaries', dark, true);
    const historical = await historicalEvidenceFlow(page, true, scene.stem);
    expect(failures.get(page)).toEqual([]);
    await writeFile(join(report, scene.stem + '-direction-evidence.json'), JSON.stringify({ sourceProof, scene, historical }, null, 2));
  });
});
test('Motion-enabled wrapped keyboard orbit keeps actual camera-aligned lights and direction resources stable', async ({ page }) => {
  await mount(page, 'canada_goose', 'primaries', false, false, historicalSeed('canada_goose'));
  await toggleStudy(page, false); await activate(page, cycle(page, 2));
  const initialSettled = await cameraSettled(page), initial = await renderState(page), initialData = await saved(page);
  expect(initialSettled.reducedMotion).toBe(false); expectStudy(initial);
  await setAngle175(page); await cameraSettled(page);
  await activate(page, comparison(page).locator('[data-marked-pose-action="mark"]'));
  const markedScene = await renderState(page);
  await stage(page).focus(); await page.keyboard.press('ArrowRight'); await frames(page);
  expect((await saved(page)).flightStudyYaw).toBe(-175);
  const transient = await renderState(page), transientError = await cameraError(page);
  expectStudy(transient); expectSceneFixed(transient, initial); expect(transient.pose).toEqual(initial.pose);
  expect(transientError.error).toBeGreaterThan(1e-6);
  const wrappedSettled = await cameraSettled(page), wrapped = await renderState(page), wrappedArrows = await arrowState(page);
  expectStudy(wrapped); expectSceneFixed(wrapped, initial); expect(wrapped.pose).toEqual(initial.pose);
  await expect(breakdown(page)).toHaveCount(0);
  await activate(page, comparisonCheck(page)); await expect(breakdown(page)).toHaveAttribute('data-marked-comparison-breakdown', 'view-only');
  // Return to the near-dot clearance case using native controls, then verify
  // the settled glyphs and lights without altering paused wing phase or work.
  await activate(page, viewpoint(page, 'above'));
  const elevation = page.getByRole('slider', { name: 'Study elevation in degrees', exact: true });
  await elevation.focus(); await elevation.press('Home');
  for (let index = 0; index < 5; index++) await elevation.press('ArrowRight');
  await frames(page); const finalSettled = await cameraSettled(page), final = await renderState(page), arrows = await arrowState(page);
  expect((await saved(page))).toMatchObject({ flightStudyYaw: 0, flightStudyPitch: 15 });
  expectStudy(final); expectSceneFixed(final, initial); expect(final.pose).toEqual(initial.pose); expectArrows(arrows, 2);
  expect(work(await saved(page))).toEqual(work(initialData));
  await capture(page, 'desktop-motion-direction-clearance');
  const scan = await accessibility(page);
  await writeFile(join(report, 'desktop-motion-direction-keyboard.json'), JSON.stringify({ sourceProof, initial, initialData, initialSettled,
    markedScene, transient, transientError, wrappedSettled, wrapped, wrappedArrows, finalSettled, final, arrows, accessibility: scan }, null, 2));
});
