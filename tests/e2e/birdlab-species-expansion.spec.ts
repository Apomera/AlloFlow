import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// The renderer probe exposes the application's actual scene. No substitute
// geometry, proxy hit regions, videos or pixel goldens are created. Six compact
// stage screenshots accompany the independent geometry and interaction checks.
test.use({ video: 'off', trace: 'off', hasTouch: true });
test.describe.configure({ timeout: 240_000, retries: 0 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  width: 1100, height: 1000, appStyles: true, layout: 'document',
  probes: "window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.speciesExpansion={scene,camera,renderer};return render(scene,camera);};return renderer;};})();",
});
const previews = resolve('reports/birdlab-species-expansion-2026-10-21/previews');
test.beforeAll(async () => { mkdirSync(previews, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const canvas = '[data-birdlab-3d-canvas]';
const residents = [
  { id: 'americanGoldfinch', label: 'American goldfinch', scientific: 'Spinus tristis', origin: [.45, 1.55], ground: [4.8, 6.1], flight: [17.4, 18.65], return: [36, 37.25], moments: [5.2, 8.63, 17.55, 18, 18.55] },
  { id: 'easternBluebird', label: 'Eastern bluebird', scientific: 'Sialia sialis', origin: [1.25, 2.05], ground: [6.6, 7.8], flight: [21.6, 23], return: [38.2, 39.6], moments: [6.9, 10.93, 21.75, 22.3, 22.88] },
  { id: 'whiteThroatedSparrow', label: 'White-throated sparrow', scientific: 'Zonotrichia albicollis', origin: [-1.15, -.15], ground: [2, 3.4], flight: [12.4, 13.55], return: [32.4, 33.6], moments: [2.4, 6.03, 12.55, 12.97, 13.45] },
];
async function call(page: Page, method: string, value?: unknown): Promise<any> {
  return page.locator(canvas).evaluate((node: any, input) => node._birdlab3d[input.method](input.value), { method, value });
}
async function step(page: Page, count = 2) {
  await page.evaluate(count => { for (let i = 0; i < count; i++) (window as any).speciesExpansionStep(100); }, count);
}
async function mount(page: Page, width = 1280, host = 1100) {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    let now = 1000, next = 1; const pending = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = callback => { const id = next++; pending.set(id, callback); return id; };
    window.cancelAnimationFrame = id => { pending.delete(id); };
    (window as any).speciesExpansionStep = (ms: number) => { now += ms; const work = [...pending.values()]; pending.clear(); work.forEach(fn => fn(now)); };
  });
  await harness.mount(page, { birdLab: { view: 'observatory3d', blXp: 23, blBadges: {}, blLifeList: {} } }, undefined, { expectCanvas: false });
  await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, host);
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.speciesExpansion", null, { polling: 50, timeout: 60_000 });
  await call(page, 'seek', 0); await step(page); return errors;
}
async function native(page: Page, id: string): Promise<any> {
  return page.evaluate(id => {
    const w = window as any, T = w.THREE, p = w.speciesExpansion, root = p.scene.getObjectByName('woodland-' + id);
    if (!root) return null; p.scene.updateMatrixWorld(true); let vertices = 0, invalid = 0, visible = 0, meshes = 0;
    const transforms: number[] = [], parts: Record<string, any[]> = {}, colors: Record<string, any> = {};
    root.traverse((mesh: any) => {
      if (!mesh.isMesh) return; meshes++;
      let shown = true; for (let parent = mesh; parent; parent = parent.parent) if (!parent.visible) shown = false;
      if (shown) visible++;
      const position = mesh.geometry.attributes.position; vertices += position.count;
      for (const attribute of Object.values(mesh.geometry.attributes) as any[]) for (const value of attribute.array) if (!Number.isFinite(value)) invalid++;
      for (const value of mesh.matrixWorld.elements) { if (!Number.isFinite(value)) invalid++; transforms.push(value); }
      const bounds = new T.Box3().setFromBufferAttribute(position).getSize(new T.Vector3()).toArray();
      (parts[mesh.name] ||= []).push({ vertices: position.count, bounds, shown });
      const attribute = mesh.geometry.attributes.color;
      if (attribute) {
        const pigment = { yellow: 0, blue: 0, rust: 0, white: 0, black: 0 }; let hash = 0;
        for (let i = 0; i < attribute.count; i++) {
          const r = attribute.getX(i), g = attribute.getY(i), b = attribute.getZ(i);
          if (r > .4 && g > .3 && b < .25) pigment.yellow++;
          if (b > .2 && b > r * 1.5) pigment.blue++;
          if (r > .2 && r > g * 1.5 && r > b * 1.5) pigment.rust++;
          if (Math.min(r, g, b) > .5) pigment.white++;
          if (Math.max(r, g, b) < .07) pigment.black++;
          hash = Math.imul(hash ^ Math.round((r + g * 3 + b * 7) * 1e6), 16777619);
        }
        colors[mesh.name] = { ...pigment, hash };
      }
    });
    return { vertices, invalid, visible, meshes, parts, colors, transforms, position: root.position.toArray(), root: root.uuid,
      live: !p.renderer.getContext().isContextLost(), calls: p.renderer.info.render.calls,
      shaders: p.renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  }, id);
}
function validModel(value: any) {
  expect(value).toBeTruthy(); expect(value.invalid).toBe(0); expect(value.vertices).toBeGreaterThan(1000);
  expect(value.visible).toBe(value.meshes); expect(value.live).toBe(true); expect(value.calls).toBeGreaterThan(0); expect(value.shaders).toBe(true);
  for (const name of ['woodland-body-plumage', 'woodland-head-plumage', 'woodland-eyes-and-bill', 'woodland-layered-tail']) {
    expect(value.parts[name], name).toHaveLength(1); expect(value.parts[name][0].shown).toBe(true);
    expect(value.parts[name][0].vertices).toBeGreaterThan(50); expect(value.parts[name][0].bounds.every((n: number) => n > 0)).toBe(true);
  }
  expect(value.parts['woodland-layered-wing']).toHaveLength(2);
}
async function residentState(page: Page, id: string) { return (await call(page, 'getState')).wildlife.find((bird: any) => bird.id === id); }
function frozenWorld(before: any, after: any) {
  for (const key of ['time', 'paused', 'speed', 'position', 'orientation', 'pose', 'wildlife', 'fieldVisitTime', 'sightings']) expect(after[key], key).toEqual(before[key]);
}

test('three distinct native species retain finite articulated models through ground, flight, return and actual mesh selection', async ({ page }) => {
  const errors = await mount(page), initial = await call(page, 'getState');
  expect(initial.wildlife.map((bird: any) => bird.id)).toEqual(['robin', 'chickadee', 'mourningDove', 'grouse', 'blueJay', 'northernCardinal', 'darkEyedJunco', 'tuftedTitmouse', 'easternTowhee', ...residents.map(bird => bird.id)]);
  const signatures: string[] = [];
  for (const species of residents) {
    await call(page, 'setCamera', species.id); await call(page, 'seek', 0); await step(page);
    const rest = await native(page, species.id); validModel(rest);
    await page.locator('.birdlab-3d-stage').screenshot({ path: resolve(previews, species.id + '-1280.png') });
    expect(rest.position[0]).toBeCloseTo(species.origin[0], 8); expect(rest.position[2]).toBeCloseTo(species.origin[1], 8);
    expect((await residentState(page, species.id)).scientificName).toBe(species.scientific);
    const head = rest.colors['woodland-head-plumage'], body = rest.colors['woodland-body-plumage'];
    signatures.push(head.hash + ':' + body.hash);
    // These broad pigment families check the native vertex buffers, separately
    // from species metadata and explanatory DOM copy.
    if (species.id === 'americanGoldfinch') { expect(body.yellow).toBeGreaterThan(10); expect(head.yellow).toBeGreaterThan(5); expect(head.black).toBeGreaterThan(5); }
    if (species.id === 'easternBluebird') { expect(body.blue).toBeGreaterThan(5); expect(body.rust).toBeGreaterThan(5); expect(body.white).toBeGreaterThan(5); }
    if (species.id === 'whiteThroatedSparrow') { expect(head.yellow).toBeGreaterThan(3); expect(head.white).toBeGreaterThan(5); expect(head.black).toBeGreaterThan(5); }
    for (const [range, kind] of [[species.ground, 'ground'], [species.flight, 'flight'], [species.return, 'return']] as const) {
      const midpoint = (range[0] + range[1]) / 2; await call(page, 'seek', midpoint); await step(page);
      const moving = await native(page, species.id), state = await residentState(page, species.id); validModel(moving);
      expect(moving.root).toBe(rest.root); expect(moving.transforms).not.toEqual(rest.transforms);
      expect(state.altitude, species.id + ' ' + kind).toBeGreaterThan(kind === 'ground' ? -.01 : .1);
      if (kind !== 'ground') expect(state.behavior).toMatch(/flight|alighting|takeoff|flying|landing/i);
      for (const boundary of range) {
        await call(page, 'seek', boundary - .0001); const before = await residentState(page, species.id);
        await call(page, 'seek', boundary + .0001); const after = await residentState(page, species.id);
        expect(Math.hypot(...after.position.map((value: number, axis: number) => value - before.position[axis]))).toBeLessThan(.002);
      }
    }
    await call(page, 'seek', 44); await step(page); const returned = await residentState(page, species.id);
    expect(returned.position).toEqual((await residentStateAtZero(page, species.id)).position);
    await call(page, 'setCamera', species.id); await call(page, 'seek', 0); await step(page);
    const framed = await call(page, 'getState'); expect(framed.camera).toBe(species.id);
    expect(framed.cameraPosition.every(Number.isFinite)).toBe(true);
    expect(Math.hypot(...framed.cameraTarget.map((v: number, i: number) => v - framed.cameraPosition[i]))).toBeGreaterThan(.2);
    // Find a drawable triangle from native meshes, then click that same surface
    // after changing only the controller mode. Manual RAF keeps the view fixed.
    const hit = await page.evaluate(id => {
      const w = window as any, T = w.THREE, p = w.speciesExpansion, target = p.scene.getObjectByName('woodland-' + id), all: any[] = [], candidates: any[] = [];
      p.scene.updateMatrixWorld(true); p.camera.updateMatrixWorld(true);
      p.scene.traverse((mesh: any) => { if (mesh.isMesh) { for (let parent = mesh; parent; parent = parent.parent) if (parent.name === 'birdlab-red-tailed-hawk' || parent.name.startsWith('woodland-')) { all.push(mesh); break; } } });
      target.traverse((mesh: any) => { if (mesh.isMesh) { const g = mesh.geometry; g.computeBoundingSphere(); const point = g.boundingSphere.center.clone().applyMatrix4(mesh.matrixWorld).project(p.camera); if (Math.abs(point.x) < .9 && Math.abs(point.y) < .9 && point.z > -1 && point.z < 1) candidates.push(point); } });
      const ray = new T.Raycaster(); for (const point of candidates) {
        ray.setFromCamera(new T.Vector2(point.x, point.y), p.camera);
        const hits = ray.intersectObjects(all, false).filter((hit: any) => { for (let parent = hit.object; parent; parent = parent.parent) if (!parent.visible) return false; return true; });
        if (hits[0] && target.getObjectById(hits[0].object.id)) return { x: (point.x + 1) / 2, y: (1 - point.y) / 2 };
      }
      return null;
    }, species.id);
    expect(hit, species.id + ' has a real projected mesh hit').toBeTruthy();
    await page.locator(canvas).scrollIntoViewIfNeeded(); const box = await page.locator(canvas).boundingBox();
    await call(page, 'setCamera', 'orbit'); await page.mouse.click(box!.x + hit!.x * box!.width, box!.y + hit!.y * box!.height);
    expect((await call(page, 'getState')).camera).toBe(species.id); await step(page);
  }
  expect(new Set(signatures).size).toBe(3);
  const roots = await Promise.all(residents.map(async species => ({ id: species.id, root: (await native(page, species.id)).root })));
  const guided = await call(page, 'getState'); await call(page, 'setMode', 'free'); await step(page, 3);
  const free = await call(page, 'getState'); expect(free.mode).toBe('free'); expect(free.camera).toBe('walk');
  expect(free.wildlife.map((bird: any) => bird.id)).toEqual(initial.wildlife.map((bird: any) => bird.id));
  for (const resident of roots) { const model = await native(page, resident.id); validModel(model); expect(model.root).toBe(resident.root); }
  await call(page, 'setMode', 'guided'); await step(page, 3); const restored = await call(page, 'getState');
  expect(restored.mode).toBe('guided'); expect(restored.camera).toBe(guided.camera); expect(restored.time).toBe(guided.time);
  for (const resident of roots) { const model = await native(page, resident.id); validModel(model); expect(model.root).toBe(resident.root); }
  expect(errors).toEqual([]);
});
async function residentStateAtZero(page: Page, id: string) { await call(page, 'seek', 0); return residentState(page, id); }

test('phone species controls, authored behavior moments and orbit keys preserve clocks, model identity and host rewards', async ({ page }) => {
  const errors = await mount(page, 390, 390), stored = await page.evaluate(() => JSON.stringify((window as any).__toolData));
  for (const species of residents) {
    const choice = page.locator('[data-birdlab-resident-camera="' + species.id + '"]');
    await choice.focus(); await page.keyboard.press('Enter'); await call(page, 'seek', 0); await step(page);
    await expect(choice).toBeFocused(); await expect(choice).toHaveAttribute('aria-pressed', 'true');
    const focus = page.locator('[data-birdlab-species-focus="' + species.id + '"]');
    await expect(focus).toContainText(species.label); await expect(focus).toContainText(species.scientific);
    await expect(page.locator(canvas)).toHaveAccessibleName(new RegExp(species.label, 'i'));
    const model = await native(page, species.id); validModel(model);
    await page.locator('.birdlab-3d-stage').screenshot({ path: resolve(previews, species.id + '-390.png') });
    const study = page.locator('[data-birdlab-resident-study="' + species.id + '"]');
    for (const [index, name] of ['hopping', 'foraging', 'takeoff', 'flight', 'landing'].entries()) {
      const moment = study.locator('[data-birdlab-resident-moment="' + name + '"]');
      await moment.focus(); await page.keyboard.press('Space'); await step(page); await expect(moment).toBeFocused();
      const state = await call(page, 'getState'); expect(state.time).toBe(species.moments[index]); expect(state.paused).toBe(true); expect(state.camera).toBe(species.id);
      const actual = state.wildlife.find((bird: any) => bird.id === species.id);
      expect(actual.behavior).toMatch([/hopping/i, /foraging/i, /taking flight/i, /flying/i, /alighting/i][index]);
      if (name === 'hopping' || name === 'flight') expect(actual.altitude).toBeGreaterThan(0);
      expect((await native(page, species.id)).root).toBe(model.root);
    }
    const before = await call(page, 'getState'); await page.locator(canvas).focus();
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('+'); await step(page, 8);
    const after = await call(page, 'getState'); frozenWorld(before, after); expect(after.cameraPosition).not.toEqual(before.cameraPosition);
    await page.evaluate(() => { (window as any).__ctx.props.qaSpeciesExpansion = 1; (window as any).__rerender(); }); await step(page);
    expect((await native(page, species.id)).root).toBe(model.root); expect((await call(page, 'getState')).camera).toBe(species.id);
    const rules = ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'];
    const violations = await page.evaluate(async rules => (await (window as any).axe.run('[data-birdlab-3d-shell]', { runOnly: { type: 'rule', values: rules } })).violations.map((row: any) => ({ id: row.id, nodes: row.nodes.map((node: any) => node.target) })), rules);
    expect(violations).toEqual([]);
    expect(await page.locator('#wrap').evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  }
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(stored); expect(errors).toEqual([]);
});
