import { expect, type Page, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './stem_gl_harness';
export const stage = (page: Page) => page.locator('.migration-flight-stage');
const errors = new WeakMap<Page, string[]>();
export function makeHarness(toolFile: string) { return new GlHarness({ toolFile, toolId: 'migration', width: 1100, height: 900, layout: 'document', appStyles: true,
  probes: "var v=document.createElement('meta');v.name='viewport';v.content='width=device-width,initial-scale=1';document.head.appendChild(v);document.querySelector('#wrap').style.width='min(100vw,1100px)';document.body.style.fontFamily='system-ui,sans-serif';document.body.style.background='#f8fafc';" }); }
export async function frames(page: Page) { const count = await page.evaluate(() => (window as any).__glScene()?.renders || 0); await page.waitForFunction(n => ((window as any).__glScene()?.renders || 0) >= n + 2, count); }
export async function activate(page: Page, locator: Locator, touch = false) { if (touch) await locator.tap(); else { await locator.focus(); await page.keyboard.press('Enter'); } await frames(page); }
export async function openDetails(page: Page, locator: Locator, touch = false) { if (!(await locator.evaluate(node => (node as HTMLDetailsElement).open))) await activate(page, locator.locator(':scope > summary'), touch); }
export async function data(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.migration))); }
export async function writes(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__round31Writes))); }
export async function mount(harness: GlHarness, page: Page, species: string, options: { dark?: boolean; reduced?: boolean; extra?: any } = {}) {
  page.setDefaultTimeout(20_000); page.setDefaultNavigationTimeout(30_000); const failures: string[] = []; errors.set(page, failures);
  page.on('pageerror', e => failures.push(e.stack || e.message)); page.on('crash', () => failures.push('Browser page crashed'));
  page.on('console', m => { if (m.type() === 'error' && /WebGL|shader|context lost|THREE\.WebGLRenderer/i.test(m.text())) failures.push(m.text()); });
  await page.emulateMedia({ reducedMotion: options.reduced === false ? 'no-preference' : 'reduce' });
  await harness.mount(page, { migration: { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightSpecies: species,
    flightShowWingtipPath: true, flightShowAnatomy: species !== 'monarch', flightStudyRegion: species === 'monarch' ? 'whole-wing' : 'primaries',
    flightStudyObservationOpen: true, flightWingStep: 13, flightStudyYaw: 0, flightStudyPitch: 60, flightStudyZoom: 1, ...options.extra } },
    'document.querySelector(".migration-flight-stage")?.getAttribute("data-flight-ready")==="true"');
  await page.evaluate(dark => {
    const w = window as any, rec = w.__glCanvas().rec, original = rec.scene.onBeforeRender;
    rec.scene.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) { rec.camera = camera; if (original) original.call(this, renderer, scene, camera, ...rest); };
    w.__round31Writes = [];
    for (const method of ['update', 'updateMulti']) { const originalUpdate = w.__ctx[method]; w.__ctx[method] = function(...args: any[]) {
      w.__round31Writes.push({ bucket: args[0], patch: JSON.parse(JSON.stringify(method === 'update' ? { [args[1]]: args[2] } : args[1])) }); return originalUpdate.apply(this, args); }; }
    if (dark) { w.__ctx.isDark = true; w.__ctx.theme = 'dark'; document.documentElement.classList.add('dark'); document.body.style.background = '#0f172a'; w.__rerender(); }
  }, !!options.dark); await frames(page);
  expect((await harness.glContexts(page)).some(item => item.createdBy === 'page' && item.type === 'webgl2' && !item.lost && item.draws > 0)).toBe(true);
}
export async function scene(page: Page) { return page.evaluate(() => {
  const w = window as any, T = w.THREE, rec = w.__glCanvas().rec, root = rec.scene, camera = rec.camera, d = w.__toolData.migration;
  root.updateMatrixWorld(true); const flock = root.getObjectByName('migration-flock'), bird = flock.children[Number(d.flightStudyBird) || 0];
  const cue = root.getObjectByName('migration-anatomy-callouts'), markers = root.getObjectByName('migration-anatomy-markers');
  const ids = w.__round31Ids || (w.__round31Ids = new WeakMap()); const identity = (object: object) => { if (!ids.has(object)) ids.set(object, w.__round31Next = (w.__round31Next || 0) + 1); return ids.get(object); };
  const attrs = (geometry: any) => Object.entries(geometry.attributes).map(([name, a]: [string, any]) => [name, identity(a), identity(a.array)]);
  const nodes: string[] = [], resources: any[] = []; root.traverse((node: any) => { nodes.push(node.uuid); if (node.geometry) resources.push([node.geometry.uuid, attrs(node.geometry), node.geometry.index ? identity(node.geometry.index.array) : null]); for (const m of Array.isArray(node.material) ? node.material : [node.material]) if (m) resources.push([m.uuid, m.type]); });
  const side = cue.userData.anatomySide, primaries = bird.userData.primaries || [], anchors = bird.userData.anatomyAnchorsBySide?.[side];
  const primary = primaries.map((mesh: any) => { const g = mesh.geometry, p = g.attributes.position, ix = g.index, edges = new Map<string, number>();
    for (let i = 0; i < ix.count; i += 3) { const triangle = [ix.getX(i), ix.getX(i + 1), ix.getX(i + 2)]; for (let j = 0; j < 3; j++) { const key = [triangle[j], triangle[(j + 1) % 3]].sort((a, b) => a - b).join(':'); edges.set(key, (edges.get(key) || 0) + 1); } }
    const inverse = cue.matrixWorld.clone().invert(), point = new T.Vector3();
    const boundary = [...edges].filter(([, n]) => n === 1).map(([edge]) => edge.split(':').flatMap(index => point.fromBufferAttribute(p, Number(index)).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse).toArray()));
    return { uuid: mesh.uuid, geometry: g.uuid, material: mesh.material.uuid, positions: Array.from(p.array), indices: Array.from(ix.array), boundary, matrix: mesh.matrixWorld.toArray(), vertices: p.count, triangles: ix.count / 3 }; });
  const offset = anchors ? anchors.slice(0, 2).reduce((n: number, a: any) => n + a.outline.length + 12, 0) : 0;
  const outlineLength = anchors?.[2]?.outline.length || 0, p = cue.geometry.attributes.position, c = cue.geometry.attributes.color;
  const point = new T.Vector3(); let extent = 0, minDepth = Infinity, maxDepth = -Infinity;
  bird.traverse((node: any) => { const position = node.geometry?.attributes.position; if (!position) return; for (let i = 0; i < position.count; i++) { point.fromBufferAttribute(position, i).applyMatrix4(node.matrixWorld).project(camera); extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y)); minDepth = Math.min(minDepth, point.z); maxDepth = Math.max(maxDepth, point.z); } });
  const mark = root.getObjectByName('migration-marked-wing-pose');
  return { nodes, resources, primary, camera: camera.matrixWorld.toArray(), projection: camera.projectionMatrix.toArray(), model: bird.matrixWorld.toArray(),
    wings: bird.userData.wings.map((node: any) => node.matrixWorld.toArray()), joints: [...bird.userData.wings, ...(bird.userData.wrists || []), ...primaries].map((node: any) => node.quaternion.toArray()),
    view: { species: d.flightSpecies, yaw: d.flightStudyYaw, pitch: d.flightStudyPitch, zoom: d.flightStudyZoom, step: d.flightWingStep, phase: bird.userData.lastRenderedWingPhase },
    stage: { width: rec.canvas.clientWidth, height: rec.canvas.clientHeight }, studyRadius: bird.userData.studyRadius, visible: flock.children.filter((node: any) => node.visible).length,
    extent, minDepth, maxDepth, cue: { visible: cue.visible, side, source: cue.userData.sourceBirdUuid, bird: bird.uuid, selected: cue.userData.selectedAnatomyId,
      geometry: cue.geometry.uuid, buffer: [identity(p), identity(p.array), identity(c), identity(c.array)], capacity: p.count, drawCount: cue.geometry.drawRange.count,
      primaryOffset: offset, primaryOutline: Array.from(p.array.slice(offset, offset + outlineLength)), colors: Array.from(c.array.slice(offset, offset + outlineLength)),
      allFinite: Array.from(p.array.slice(0, cue.geometry.drawRange.count * 3)).every(Number.isFinite), anchorNode: anchors?.[2]?.node?.uuid || null },
    marked: { captured: mark?.userData.captured, phase: mark?.userData.capturedPhase, count: mark?.geometry.drawRange.count },
    monarch: bird.userData.wings.flatMap((wing: any) => wing.children.filter((node: any) => /^migration-monarch-(forewing|hindwing)$/.test(node.name))).map((mesh: any) => ({ name: mesh.name, positions: Array.from(mesh.geometry.attributes.position.array), indices: Array.from(mesh.geometry.index.array) })) };
}); }
export function expectFitted(s: any) { expect(s.visible).toBe(1); expect(s.extent).toBeGreaterThan(.2); expect(s.extent).toBeLessThan(.98); expect(s.minDepth).toBeGreaterThan(-1); expect(s.maxDepth).toBeLessThan(1); }
export function expectStable(a: any, b: any) { expect(a.nodes).toEqual(b.nodes); expect(a.resources).toEqual(b.resources); expect(a.studyRadius).toBe(b.studyRadius); expect(a.cue.buffer).toEqual(b.cue.buffer); }
export function expectPrimaryContour(s: any) {
  expect(s.primary).toHaveLength(2); expect(s.cue).toMatchObject({ visible: true, selected: 'primaries', capacity: 192, drawCount: 130, primaryOffset: 192, allFinite: true });
  expect([0, 1]).toContain(s.cue.side); const selected = s.primary[s.cue.side]; expect(s.cue.source).toBe(s.cue.bird); expect(s.cue.anchorNode).toBe(selected.uuid);
  expect(selected.boundary).toHaveLength(25); expect(s.cue.primaryOutline).toHaveLength(150);
  const remaining = selected.boundary.map((segment: number[]) => segment); for (let i = 0; i < 150; i += 6) {
    const actual = s.cue.primaryOutline.slice(i, i + 6), matches = (expected: number[]) => actual.every((v: number, j: number) => Math.abs(v - expected[j]) < 2e-5);
    const index = remaining.findIndex((segment: number[]) => matches(segment) || matches([...segment.slice(3), ...segment.slice(0, 3)])); expect(index).toBeGreaterThanOrEqual(0); remaining.splice(index, 1);
  } expect(remaining).toEqual([]); expectFitted(s);
}
export async function settled(page: Page) { await expect.poll(async () => page.evaluate(() => {
  const w = window as any, rec = w.__glCanvas().rec, d = w.__toolData.migration, T = w.THREE, camera = rec.camera;
  const bird = rec.scene.getObjectByName('migration-flock').children[Number(d.flightStudyBird) || 0], target = bird.getWorldPosition(new T.Vector3());
  const half = Math.min(camera.fov * Math.PI / 360, Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
  const r = bird.userData.studyRadius * 1.18 / Math.sin(half) / d.flightStudyZoom, yaw = d.flightStudyYaw * Math.PI / 180, pitch = d.flightStudyPitch * Math.PI / 180;
  return camera.position.distanceTo(target.clone().add(new T.Vector3(Math.sin(yaw) * Math.cos(pitch) * r, Math.sin(pitch) * r, Math.cos(yaw) * Math.cos(pitch) * r)));
}), { timeout: 15_000, intervals: [50, 100, 200] }).toBeLessThan(1e-5); }
export async function accessibility(page: Page) {
  await page.addScriptTag({ content: readFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8') });
  const result = await page.evaluate(async () => { const scan = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }); return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, errors: (window as any).__events.errors, violations: scan.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })) }; });
  expect(result.violations).toEqual([]); expect(result.errors).toEqual([]); expect(errors.get(page)).toEqual([]); expect(result.scrollWidth).toBe(result.width); return result;
}
export async function capture(page: Page, path: string, locator = stage(page)) { await locator.scrollIntoViewIfNeeded(); const box = await locator.boundingBox(); expect(box).not.toBeNull(); expect(box!.width).toBeGreaterThan(270); expect(box!.height).toBeGreaterThan(100); await locator.screenshot({ path }); return box; }
