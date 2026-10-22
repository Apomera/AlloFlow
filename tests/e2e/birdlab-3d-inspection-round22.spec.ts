import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true, trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true } });
test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document',
  probes: "window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round22Woodland={scene,camera,renderer};return render(scene,camera);};return renderer;};})();" });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const canvas = '[data-birdlab-3d-canvas]', shell = '[data-birdlab-3d-shell]';
async function call(page: Page, method: string, value?: unknown): Promise<any> { return page.locator(canvas).evaluate((node: any, input) => node._birdlab3d[input.method](input.value), { method, value }); }
// Native camera damping is time based. Larger bounded clock steps reach the
// same settled view without submitting dozens of redundant woodland frames.
async function step(page: Page, frames = 12) { await page.evaluate(frames => { for (let i = 0; i < frames; i++) (window as any).round22Step(100); }, frames); }
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 }); await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, host);
  await page.locator(canvas).scrollIntoViewIfNeeded(); await step(page, 2);
  await expect.poll(() => page.evaluate(() => { const p = (window as any).round22Woodland; return Math.abs(p.camera.aspect - p.renderer.domElement.clientWidth / p.renderer.domElement.clientHeight); })).toBeLessThan(.002);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { let now = 1000, next = 1; const pending = new Map<number, FrameRequestCallback>(); window.requestAnimationFrame = callback => { const id = next++; pending.set(id, callback); return id; }; window.cancelAnimationFrame = id => { pending.delete(id); }; (window as any).round22Step = (ms: number) => { now += ms; const work = [...pending.values()]; pending.clear(); work.forEach(fn => fn(now)); }; });
  await harness.mount(page, { birdLab: { view: 'observatory3d' } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.round22Woodland", null, { polling: 50, timeout: 60_000 });
  await sizing(page, 1280, 1100); await call(page, 'setCamera', 'wide'); await call(page, 'seek', 7.375); await step(page, 2);
  await expect(page.locator(canvas)).toHaveAttribute('data-scene-picking', 'true');
}
function frozen(before: any, after: any) { for (const key of ['time', 'paused', 'speed', 'position', 'orientation', 'pose', 'wind', 'sightings', 'wildlife', 'animals', 'fieldVisitTime', 'lighting', 'lightingDirectionCustom']) expect(after[key], key).toEqual(before[key]); }
async function native(page: Page, remember = false): Promise<any> {
  return page.evaluate(remember => {
    const w = window as any, T = w.THREE, p = w.round22Woodland; p.scene.updateMatrixWorld(true); p.camera.updateMatrixWorld(true);
    const objects: string[] = [], geos = new Set<string>(), mats = new Set<string>(), textures = new Set<string>(), saved = new Map(), before = w.round22Buffers;
    let bufferError = 0, worldError = 0, matched = 0;
    p.scene.traverse((node: any) => {
      objects.push(node.uuid); if (node.geometry) geos.add(node.geometry.uuid);
      for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) { mats.add(material.uuid); for (const value of Object.values(material) as any[]) if (value?.isTexture) textures.add(value.uuid); }
      let root = node; while (root && root.name !== 'birdlab-red-tailed-hawk' && !root.name?.startsWith('woodland-')) root = root.parent;
      if (!root || !node.isMesh) return;
      const attr = node.geometry.attributes.position, old = before?.get(node.uuid), points: number[][] = [];
      for (let i = 0; i < attr.count; i++) { const point = new T.Vector3().fromBufferAttribute(attr, i).applyMatrix4(node.matrixWorld).toArray(); points.push(point); if (old) point.forEach((value: number, axis: number) => { worldError = Math.max(worldError, Math.abs(value - old.points[i][axis])); }); }
      if (old) { matched++; attr.array.forEach((value: number, i: number) => { bufferError = Math.max(bufferError, Math.abs(value - old.buffer[i])); }); }
      saved.set(node.uuid, { buffer: Array.from(attr.array), points });
    });
    if (remember) w.round22Buffers = saved;
    return { objects: objects.sort(), geometries: [...geos].sort(), materials: [...mats].sort(), textures: [...textures].sort(), meshCount: saved.size, matched, bufferError, worldError,
      scene: p.scene.uuid, camera: p.camera.uuid, position: p.camera.position.toArray(), quaternion: p.camera.quaternion.toArray(), fov: p.camera.fov, live: !p.renderer.getContext().isContextLost(), shaders: p.renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  }, remember);
}
function intact(value: any, before: any) { for (const key of ['objects', 'geometries', 'materials', 'textures', 'scene', 'camera', 'meshCount']) expect(value[key], key).toEqual(before[key]); expect(value.matched).toBe(value.meshCount); expect(value.bufferError).toBe(0); expect(value.worldError).toBeLessThan(1e-9); expect(value.live).toBe(true); expect(value.shaders).toBe(true); }

// Native oracle uses the real instance matrices/triangle faces of habitat solids,
// independently of the production observer's cached proxy inventory.
async function surface(page: Page, id: string, blocked = false, centre = false): Promise<any> {
  return page.evaluate(({ id, blocked, centre }) => {
    const w = window as any, T = w.THREE, p = w.round22Woodland, roots: any[] = [], targets: any[] = [], owners = new Map(), solids: any[] = [], ray = new T.Raycaster();
    p.scene.updateMatrixWorld(true); p.camera.updateMatrixWorld(true);
    const hawk = p.scene.getObjectByName('birdlab-red-tailed-hawk'); roots.push({ root: hawk, id: 'orbit' });
    p.scene.getObjectByName('birdlab-woodland-residents').children.forEach((root: any) => { if (root.name.startsWith('woodland-')) roots.push({ root, id: root.name.slice(9) }); });
    const shown = (node: any) => { for (; node; node = node.parent) if (node.visible === false) return false; return true; };
    roots.forEach(entry => entry.root.traverse((mesh: any) => { if (mesh.isMesh) { targets.push(mesh); owners.set(mesh, entry.id); } }));
    p.scene.traverse((mesh: any) => { if (mesh.isMesh && ['continuous-woodland-ground', 'distant-connected-woodland-ridge', 'weathered-landing-limb', 'branching-woodland-trunks', 'weathered-wood-broken-end-grain', 'weathered-clearing-stones'].includes(mesh.name) && shown(mesh)) solids.push(mesh); });
    const root = roots.find(entry => entry.id === id)?.root, rect = p.renderer.domElement.getBoundingClientRect(), candidates: any[] = [];
    if (centre) candidates.push(new T.Vector3(0, 0, 0));
    else if (root) {
      const meshes: any[] = []; root.traverse((mesh: any) => { if (mesh.isMesh) meshes.push(mesh); }); meshes.sort((a, b) => Number(/body|breast|head/.test(b.name)) - Number(/body|breast|head/.test(a.name)));
      meshes.forEach(mesh => { mesh.geometry.computeBoundingBox(); candidates.push(mesh.geometry.boundingBox.getCenter(new T.Vector3()).applyMatrix4(mesh.matrixWorld).project(p.camera)); });
    }
    for (const ndc of candidates) {
      if (Math.abs(ndc.x) > .97 || Math.abs(ndc.y) > .97 || ndc.z < -1 || ndc.z > 1) continue;
      const x = centre ? rect.left + rect.width / 2 : Math.floor(rect.left + (ndc.x + 1) * rect.width / 2) + .5, y = centre ? rect.top + rect.height / 2 : Math.floor(rect.top + (1 - ndc.y) * rect.height / 2) + .5;
      ray.setFromCamera(new T.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), p.camera);
      const hit = ray.intersectObjects(targets, false).find((hit: any) => shown(hit.object)); if (!hit || owners.get(hit.object) !== id) continue;
      const solid = ray.intersectObjects(solids, false).find((candidate: any) => candidate.distance < hit.distance - .025);
      if (!!solid !== blocked) continue;
      return { id, x, y, mesh: hit.object.uuid, world: hit.point.toArray(), distance: hit.distance, blocker: solid ? { name: solid.object.name, distance: solid.distance, instance: solid.instanceId } : null };
    }
    return null;
  }, { id, blocked, centre });
}
async function birdPixels(page: Page, id: string): Promise<number> {
  return page.evaluate(id => {
    const w = window as any, p = w.round22Woodland, target = p.scene.getObjectByName(id === 'orbit' ? 'birdlab-red-tailed-hawk' : 'woodland-' + id), saved: any[] = [], background = p.scene.background, fog = p.scene.fog;
    try {
      p.scene.traverse((node: any) => { if (!node.isMesh) return; saved.push({ node, visible: node.visible }); let current = node, own = false; while (current) { if (current === target) own = true; current = current.parent; } node.visible = node.visible && own; });
      p.scene.background = new w.THREE.Color(0); p.scene.fog = null; p.renderer.render(p.scene, p.camera);
      const gl = p.renderer.getContext(), bytes = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4); gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
      let count = 0; for (let i = 0; i < bytes.length; i += 4) if (bytes[i] + bytes[i + 1] + bytes[i + 2] > 15) count++; return count;
    } finally { saved.forEach(({ node, visible }) => { node.visible = visible; }); p.scene.background = background; p.scene.fog = fog; p.renderer.render(p.scene, p.camera); }
  }, id);
}
// A same-time seek snaps an existing camera without advancing the paused scene.
async function wide(page: Page) { await call(page, 'setCamera', 'wide'); await call(page, 'seek', (await call(page, 'getState')).time); await step(page, 2); await page.locator(canvas).scrollIntoViewIfNeeded(); }

test('native bird surfaces select existing cameras while real solid blockers, hidden roots and frozen geometry stay respected', async ({ page }) => {
  await mount(page); const before = await call(page, 'getState'), baseline = await native(page, true), host = await page.evaluate(() => JSON.stringify((window as any).__toolData));
  const available: string[] = [];
  for (const id of ['grouse', 'mourningDove', 'blueJay', 'northernCardinal', 'robin', 'chickadee', 'darkEyedJunco', 'easternTowhee', 'tuftedTitmouse']) if (await surface(page, id)) available.push(id);
  expect(available.length).toBeGreaterThanOrEqual(3);
  for (const id of [...available.slice(0, 3), 'orbit']) {
    await wide(page); const point = await surface(page, id); expect(point, id).not.toBeNull(); expect(point.blocker).toBeNull(); const small = await birdPixels(page, id);
    await page.mouse.click(point.x, point.y); await step(page); const selected = await call(page, 'getState'); expect(selected.camera).toBe(id); frozen(before, selected); intact(await native(page), baseline);
    const large = await birdPixels(page, id); expect(large).toBeGreaterThan(20); expect(large).toBeGreaterThan(small * 2);
    const name = id === 'orbit' ? 'Red-tailed hawk' : selected.wildlife.find((bird: any) => bird.id === id).name; await expect(page.locator('.birdlab-3d-card h2').filter({ hasText: name })).toHaveText(name); await expect(page.locator('.birdlab-3d-scene-caption')).toContainText(id === 'orbit' ? 'A hawk’s flight' : name);
  }
  await wide(page); const id = available[0], point = await surface(page, id); expect(point).not.toBeNull();
  await page.evaluate(id => { (window as any).round22Woodland.scene.getObjectByName('woodland-' + id).visible = false; }, id);
  await page.mouse.click(point.x, point.y); await step(page, 2); expect((await call(page, 'getState')).camera).toBe('wide');
  await page.evaluate(id => { (window as any).round22Woodland.scene.getObjectByName('woodland-' + id).visible = true; }, id);
  // Put an existing native bird below the existing continuous ground, retaining
  // its own triangles and using no extra blocker geometry or cached test proxy.
  await page.evaluate(id => { const w = window as any, root = w.round22Woodland.scene.getObjectByName('woodland-' + id); w.round22RestorePosition = root.position.clone(); root.position.set(0, -4, 0); root.updateMatrixWorld(true); }, id);
  const occluded = await surface(page, id, true); expect(occluded).not.toBeNull(); expect(occluded.blocker.distance).toBeLessThan(occluded.distance - .025);
  await page.mouse.click(occluded.x, occluded.y); await step(page, 2); expect((await call(page, 'getState')).camera).toBe('wide');
  await page.evaluate(id => { const w = window as any, root = w.round22Woodland.scene.getObjectByName('woodland-' + id); root.position.copy(w.round22RestorePosition); root.updateMatrixWorld(true); }, id);
  intact(await native(page), baseline); frozen(before, await call(page, 'getState')); expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(host);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('tap versus orbit gestures, keyboard selection and active-study ownership remain accessible at three host widths', async ({ page }) => {
  await mount(page); const baseline = await native(page, true), before = await call(page, 'getState');
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await wide(page); let choice: any = null;
    for (const id of ['grouse', 'mourningDove', 'blueJay', 'northernCardinal', 'robin']) { choice = await surface(page, id); if (choice) break; } expect(choice).not.toBeNull();
    await page.touchscreen.tap(choice.x, choice.y); await step(page); expect((await call(page, 'getState')).camera).toBe(choice.id); frozen(before, await call(page, 'getState')); intact(await native(page), baseline);
    await call(page, 'setCamera', 'robin'); await call(page, 'seek', (await call(page, 'getState')).time); await step(page, 2); expect(await surface(page, 'robin', false, true)).not.toBeNull();
    await page.locator(canvas).evaluate(node => { node.addEventListener('keydown', event => { if ((event as KeyboardEvent).key === 'Enter') (window as any).round22EnterHandled = event.defaultPrevented; }); });
    await page.locator(canvas).focus(); await page.keyboard.press('Enter'); await step(page, 2); await expect(page.locator(canvas)).toBeFocused(); expect(await page.evaluate(() => (window as any).round22EnterHandled)).toBe(true); expect((await call(page, 'getState')).camera).toBe('robin');
    await wide(page); choice = await surface(page, choice.id); expect(choice).not.toBeNull();
    await page.mouse.move(choice.x, choice.y); await page.mouse.down(); await page.mouse.move(choice.x + 24, choice.y); await page.mouse.move(choice.x, choice.y); await page.mouse.up(); await step(page, 2); expect((await call(page, 'getState')).camera).toBe('orbit');
    await wide(page); choice = await surface(page, choice.id); expect(choice).not.toBeNull();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: choice.x, y: choice.y, id: 1 }, { x: choice.x + 20, y: choice.y, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: choice.x - 10, y: choice.y, id: 1 }, { x: choice.x + 30, y: choice.y, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach(); await step(page, 2); expect((await call(page, 'getState')).camera).toBe('orbit');
    await wide(page); choice = await surface(page, choice.id); expect(choice).not.toBeNull();
    await page.locator(canvas).evaluate((node, point) => { for (const type of ['pointerdown', 'pointercancel', 'pointerup']) node.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 99, pointerType: 'touch', clientX: point.x, clientY: point.y, button: 0 })); }, choice);
    await step(page, 2); expect((await call(page, 'getState')).camera).toBe('wide'); frozen(before, await call(page, 'getState')); intact(await native(page), baseline);
    const host = (await page.locator('#wrap').boundingBox())!; for (const selector of [canvas, '[data-birdlab-scene-pick-help]']) { const box = (await page.locator(selector).boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width).toBeLessThanOrEqual(host.x + host.width + 1); }
    const violations = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('[data-birdlab-3d-shell]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } }); return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })); }); expect(violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  await sizing(page, 1280, 1100);
  for (const [method, off, flag] of [['setStudyOverlay', false, 'studyOverlay'], ['setCourseLens', false, 'courseLens'], ['setAttitudeLens', false, 'attitudeLens'], ['setLightStudy', false, 'lightStudy'], ['setPerspectiveStudy', false, 'perspectiveStudy'], ['setAnatomyStudy', false, 'anatomyStudy'], ['inspectWingbeat', null, 'wingbeatStudy']] as const) {
    await call(page, 'setCamera', 'orbit'); await call(page, 'seek', method === 'inspectWingbeat' ? 4.2 : 7.375); await call(page, method, true); await step(page, 2); const owner = await call(page, 'getState'); expect(owner[flag], method + ' owns its study').toBeTruthy(); expect(owner.canSelectBird, method).toBe(false); await expect(page.locator(canvas)).toHaveAttribute('data-scene-picking', 'false');
    const rect = (await page.locator(canvas).boundingBox())!; await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.locator(canvas).focus(); await page.keyboard.press('Enter'); await step(page, 2);
    const after = await call(page, 'getState'); frozen(owner, after); for (const key of ['camera', 'courseStudy', 'attitudeStudy', 'lightInvestigation', 'perspectiveInvestigation', 'anatomyInvestigation', 'wingbeatStudy']) expect(after[key], key).toEqual(owner[key]);
    await call(page, method === 'inspectWingbeat' ? 'closeWingbeat' : method, off); await step(page, 2); const closed = await call(page, 'getState'); expect(closed[flag], method + ' closes its study').toBeFalsy();
    if (method === 'setCourseLens') {
      // Closing comparison retains its independently toggled flight overlay.
      expect(closed.courseStudy).toBeNull(); expect(closed.studyOverlay).toBe(true); expect(closed.studyOverlayVisible).toBe(true); expect(closed.canSelectBird).toBe(false); await expect(page.locator(canvas)).toHaveAttribute('data-scene-picking', 'false');
      await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.locator(canvas).focus(); await page.keyboard.press('Enter'); await step(page, 2);
      const retained = await call(page, 'getState'); frozen(closed, retained); expect(retained.camera).toBe(closed.camera); expect(retained.studyOverlay).toBe(true); expect(retained.courseLens).toBe(false); expect(retained.canSelectBird).toBe(false);
      await call(page, 'setStudyOverlay', false); await step(page, 2);
    }
    const released = await call(page, 'getState'); for (const key of ['studyOverlay', 'courseLens', 'attitudeLens', 'lightStudy', 'perspectiveStudy', 'anatomyStudy', 'wingbeatStudy']) expect(released[key], method + ' releases ' + key).toBeFalsy();
    expect(released.canSelectBird, method + ' releases bird selection').toBe(true); await expect(page.locator(canvas)).toHaveAttribute('data-scene-picking', 'true');
  }
  await call(page, 'setMode', 'free'); await step(page, 2); const free = await call(page, 'getState'); expect(free.canSelectBird).toBe(false); const rect = (await page.locator(canvas).boundingBox())!;
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.keyboard.press('Enter'); await step(page, 2); const afterFree = await call(page, 'getState'); expect(afterFree.mode).toBe('free'); expect(afterFree.camera).toBe(free.camera); expect(afterFree.sightings).toEqual(free.sightings); expect(afterFree.fieldVisitTime).toBe(free.fieldVisitTime);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
