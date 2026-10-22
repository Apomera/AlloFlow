import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const output = resolve('reports/avian-simulations-round23-2026-10-21/final');
test.use({ video: 'off', trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true } });
test.describe.configure({ timeout: 240_000, retries: 0 });
async function capture(page: Page, selector: string, name: string) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const viewport = page.viewportSize()!, initial = (await page.locator(selector).boundingBox())!;
  if (initial.height > viewport.height) {
    await page.setViewportSize({ width: viewport.width, height: Math.ceil(initial.height) + 200 });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.locator(selector).scrollIntoViewIfNeeded();
  }
  let prior = '', stable = 0;
  await expect.poll(async () => { const r=(await page.locator(selector).boundingBox())!; const value=JSON.stringify([r.width,r.height]);stable=value===prior?stable+1:0;prior=value;return stable; }, { intervals:[50,100,150],timeout:10_000 }).toBeGreaterThanOrEqual(3);
  const png=await page.locator(selector).screenshot({ path:resolve(output,name),timeout:90_000 });
  const bounds=(await page.locator(selector).boundingBox())!;
  expect(Math.abs(png.readUInt32BE(16)-bounds.width)).toBeLessThanOrEqual(2);expect(Math.abs(png.readUInt32BE(20)-bounds.height)).toBeLessThanOrEqual(2);
}
async function inspect(page: Page, selector: string) {
  return page.locator(selector).evaluate(root => {
    const box = (node: Element) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    return { root: box(root), scrollOverflow: root.scrollWidth - root.clientWidth,
      inputs: [...root.querySelectorAll('input,select')].map(node => { const input = node as HTMLInputElement; return { id: input.id, value: input.value, checked: input.checked, min: input.min, max: input.max }; }),
      conditions: [...root.querySelectorAll('[data-wave-condition],[data-geodesic-condition]')].map(node => ({ attributes: Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value])) })),
      blocks: [...root.querySelectorAll('figure,svg,button,input,select,label,h2,h3,p,summary')].map(node => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 100), box: box(node), overflow: node.scrollWidth - node.clientWidth, fontSize: getComputedStyle(node).fontSize })),
      shapes: [...root.querySelectorAll('svg path,svg line,svg rect,svg circle')].map(node => ({ tag: node.tagName, attributes: Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value])), stroke: getComputedStyle(node).stroke, fill: getComputedStyle(node).fill })),
      svgText: [...root.querySelectorAll('svg text')].map(node => { const text = node as SVGTextElement, r = text.getBBox(), view = text.ownerSVGElement!.viewBox.baseVal, matrix = text.getScreenCTM(); return { text: text.textContent, x: r.x, y: r.y, width: r.width, height: r.height, viewWidth: view.width, viewHeight: view.height, renderedFontPx: parseFloat(getComputedStyle(text).fontSize) * (matrix ? Math.hypot(matrix.a, matrix.b) : 0) }; }) };
  });
}





async function nativeSurfacePoints(page: Page, id: string, blocked = false, centre = false): Promise<any> {
  return page.evaluate(({ id, blocked, centre }) => {
    const w = window as any, T = w.THREE, p = w.round23Native, roots: any[] = [], targets: any[] = [], owners = new Map(), solids: any[] = [], ray = new T.Raycaster();
    p.scene.updateMatrixWorld(true); p.camera.updateMatrixWorld(true);
    const hawk = p.scene.getObjectByName('birdlab-red-tailed-hawk'); roots.push({ root: hawk, id: 'orbit' });
    p.scene.getObjectByName('birdlab-woodland-residents').children.forEach((root: any) => { if (root.name.startsWith('woodland-')) roots.push({ root, id: root.name.slice(9) }); });
    const shown = (node: any) => { for (; node; node = node.parent) if (node.visible === false) return false; return true; };
    roots.forEach(entry => entry.root.traverse((mesh: any) => { if (mesh.isMesh) { targets.push(mesh); owners.set(mesh, entry.id); } }));
    p.scene.traverse((mesh: any) => { if (mesh.isMesh && ['continuous-woodland-ground', 'distant-connected-woodland-ridge', 'weathered-landing-limb', 'branching-woodland-trunks', 'weathered-wood-broken-end-grain', 'weathered-clearing-stones'].includes(mesh.name) && shown(mesh)) solids.push(mesh); });
    const root = roots.find(entry => entry.id === id)?.root, rect = p.renderer.domElement.getBoundingClientRect(), candidates: any[] = [], results: any[] = [];
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
      results.push({ id, x, y, mesh: hit.object.uuid, world: hit.point.toArray(), distance: hit.distance, blocker: solid ? { name: solid.object.name, distance: solid.distance, instance: solid.instanceId } : null });
    }
    return results;
  }, { id, blocked, centre });
}



test.describe('surface ruler visual review', () => {
  const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, layout: 'document', width: 1280, height: 960,
    probes: 'window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round23Native={scene,camera,renderer};return render(scene,camera);};return renderer;};})();' });
  test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
  test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.destroy(page));
  for (const width of [1280, 390]) test('surface ruler at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /shader|WebGL|GL_INVALID/i.test(message.text())) errors.push(message.text()); });
    await page.setViewportSize({ width, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await harness.mount(page, { birdLab: { view: 'observatory3d' } }, undefined, { expectCanvas: false });
    await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.style.height = 'auto'; node.style.padding = '0'; node.setAttribute('data-stem-tool-shell', 'true'); }, width);
    const canvas = '[data-birdlab-3d-canvas]', selector = '[data-birdlab-3d-shell]', stage = '.birdlab-3d-stage';
    await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.round23Native", null, { polling: 50, timeout: 60_000 });
    await page.locator(canvas).scrollIntoViewIfNeeded();
    const before = await page.locator(canvas).evaluate((node: any) => { node._birdlab3d.setCamera('robin'); node._birdlab3d.seek(7.375); return node._birdlab3d.getState(); });
    await page.locator('[data-birdlab-surface-toggle]').click(); await page.locator(canvas).scrollIntoViewIfNeeded();
    await expect(page.locator('[data-birdlab-surface-ruler]')).toHaveAttribute('data-surface-next', 'a');
    await expect.poll(() => page.evaluate(() => { const p = (window as any).round23Native; return Math.abs(p.camera.aspect - p.renderer.domElement.clientWidth / p.renderer.domElement.clientHeight); })).toBeLessThan(.002);
    let points = await nativeSurfacePoints(page, 'robin'); expect(points.length).toBeGreaterThan(1);
    let best = { a: points[0], b: points[1], gap: -1 };
    for (const a of points) for (const b of points) { const gap = Math.hypot(a.x - b.x, a.y - b.y); if (gap > best.gap) best = { a, b, gap }; }
    expect(best.gap).toBeGreaterThan(30); const a = best.a; await page.mouse.click(a.x, a.y);
    await expect(page.locator('[data-birdlab-surface-ruler]')).toHaveAttribute('data-surface-next', 'b');
    await page.locator(canvas).scrollIntoViewIfNeeded(); points = await nativeSurfacePoints(page, 'robin');
    const b = points.reduce((best: any, point: any) => { const gap = Math.hypot(...point.world.map((value: number, index: number) => value - a.world[index])); return !best || gap > best.gap ? { ...point, gap } : best; }, null);
    expect(b.gap).toBeGreaterThan(.01); await page.mouse.click(b.x, b.y);
    await expect(page.locator('[data-birdlab-surface-ruler]')).toHaveAttribute('data-surface-next', 'done');
    const expectedDelta = b.world.map((value: number, index: number) => value - a.world[index]), expectedDistance = Math.hypot(...expectedDelta);
    await capture(page, selector, 'ruler-' + width + '.png'); const readability = await inspect(page, selector);
    await capture(page, stage, 'ruler-stage-' + width + '.png'); const stageReadability = await inspect(page, stage);
    const geometry = await page.evaluate(() => { const p = (window as any).round23Native, state = (document.querySelector('[data-birdlab-3d-canvas]') as any)._birdlab3d.getState(), group = p.scene.getObjectByName('birdlab-surface-ruler'); let meshes = 0; const geometries = new Set(), materials = new Set(); p.scene.traverse((node: any) => { if (node.isMesh) meshes++; if (node.geometry) geometries.add(node.geometry.uuid); for (const mat of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) materials.add(mat.uuid); }); return { state, scene: p.scene.uuid, meshes, geometries: geometries.size, materials: materials.size, overlay: { visible: group.visible, objects: group.children.map((node: any) => ({ name: node.name, visible: node.visible, position: node.position.toArray(), scale: node.scale.toArray(), depthTest: node.material.depthTest })) }, renderer: { live: !p.renderer.getContext().isContextLost(), calls: p.renderer.info.render.calls, shaders: p.renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) } }; });
    for (const key of ['time', 'paused', 'position', 'orientation', 'pose', 'wildlife', 'sightings']) expect((geometry.state as any)[key], key).toEqual((before as any)[key]);
    const measure = geometry.state.surfaceMeasurement; expect(geometry.state.surfaceRuler).toBe(true); expect(geometry.state.camera).toBe('robin'); expect(measure.points).toHaveLength(2);
    for (let index = 0; index < 3; index++) { expect(measure.points[0].position[index]).toBeCloseTo(a.world[index], 7); expect(measure.points[1].position[index]).toBeCloseTo(b.world[index], 7); expect(measure.delta[index]).toBeCloseTo(expectedDelta[index], 7); }
    expect(measure.distance).toBeCloseTo(expectedDistance, 7); await expect(page.locator('[data-surface-reading="distance"]')).toHaveText(expectedDistance.toFixed(4));
    expect(geometry.overlay.visible).toBe(true); expect(geometry.overlay.objects.every((node: any) => node.visible && node.depthTest)).toBe(true);
    expect(geometry.renderer.live).toBe(true); expect(geometry.renderer.shaders).toBe(true); expect(geometry.renderer.calls).toBeGreaterThan(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), harnessErrors = await page.evaluate(() => (window as any).__events.errors);
    writeFileSync(resolve(output, 'ruler-' + width + '.json'), JSON.stringify({ surface: 'ruler', width, captureViewport: page.viewportSize(), overflow, errors, harnessErrors, selection: { a, b }, expectedDelta, expectedDistance, geometry, readability, stageReadability }, null, 2));
    expect(overflow).toBeLessThanOrEqual(1); expect(errors).toEqual([]); expect(harnessErrors).toEqual([]);
  });
});

for (const surface of ['wave', 'geodesic']) test.describe(surface + ' visual review', () => {
  const bird = surface === 'wave';
  const harness = new GlHarness({ toolId: bird ? 'birdLab' : 'raptorHunt', toolFile: 'stem_lab/stem_tool_' + (bird ? 'birdlab' : 'raptorhunt') + '.js', preScripts: bird ? ['stem_lab/stem_lab_module.js'] : [], appStyles: true, layout: 'document', width: 1280, height: 960 });
  test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
  test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.destroy(page));
  for (const width of [1280, 390]) test(surface + ' at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await harness.mount(page, bird ? { birdLab: { view: 'seabirds' } } : { raptorHunt: { activeSection: 'migration', geodesicStudy: { version: 1, latA: 45, lonA: -60, latB: 30, lonB: 60, selected: 'B', fraction: 50, view: 0 }, xp: 0 } }, undefined, { expectCanvas: false });
    await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.style.height = 'auto'; node.style.padding = '0'; node.setAttribute('data-stem-tool-shell', 'true'); }, width);
    const selector = bird ? '[data-birdlab-wave-study]' : '[data-raptor-geodesic-study]'; await expect(page.locator(selector)).toBeVisible();
    if (bird) {
      await page.locator('[data-wave-pin]').click(); await page.locator('[data-wave-experiment="follow"]').click();
      await page.locator('#birdlab-wave-station').fill('23.25'); await page.locator('#birdlab-wave-time').fill('4.3');
      await expect(page.locator('#birdlab-wave-observer')).toHaveValue('1');
      await expect(page.locator('[data-wave-condition="pinned"]')).toHaveAttribute('data-wave-observer', '0');
    } else {
      await page.locator('[data-geodesic-pin]').click(); await page.locator('[data-geodesic-experiment="rotate"]').click();
      await page.locator('#rh-geodesic-fraction').fill('35'); await page.locator('#rh-geodesic-view').fill('30'); await page.locator('[data-geodesic-answer="geometry"]').click();
      await expect(page.locator('[data-geodesic-condition="current"]')).toHaveAttribute('data-geodesic-coordinates', '45,-30,30,90');
      await expect(page.locator('[data-geodesic-condition="pinned"]')).toHaveAttribute('data-geodesic-coordinates', '45,-60,30,60');
    }
    await capture(page, selector, surface + '-' + width + '.png'); const readability = await inspect(page, selector);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), harnessErrors = await page.evaluate(() => (window as any).__events.errors);
    writeFileSync(resolve(output, surface + '-' + width + '.json'), JSON.stringify({ surface, width, captureViewport: page.viewportSize(), overflow, errors, harnessErrors, geometry: null, readability, stageReadability: null }, null, 2));
    expect(overflow).toBeLessThanOrEqual(1); expect(errors).toEqual([]); expect(harnessErrors).toEqual([]);
    const invalid = readability.svgText.filter(label => !(label.x >= 0 && label.x + label.width <= label.viewWidth && label.y >= 0 && label.y + label.height <= label.viewHeight && label.renderedFontPx >= 11));
    expect(invalid).toEqual([]);
  });
});
