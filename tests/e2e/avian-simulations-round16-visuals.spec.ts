import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve('reports/avian-simulations-round16-2026-10-20/final');
test.use({ video: 'off' });
test.describe.configure({ timeout: 240_000, retries: 0 });

async function capturePanel(page: Page, selector: string, name: string) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const viewport = page.viewportSize()!, initialBounds = (await page.locator(selector).boundingBox())!;
  // This long desktop panel changes layout when Chromium captures beyond its viewport.
  if (name === 'connectivity-1280.png' && initialBounds.height > viewport.height) {
    await page.setViewportSize({ width: viewport.width, height: Math.ceil(initialBounds.height) + 200 });
    await page.locator(selector).scrollIntoViewIfNeeded();
  }
  let previous = '', stable = 0;
  await expect.poll(async () => {
    const r = await page.locator(selector).boundingBox();
    const current = r ? JSON.stringify([r.width, r.height]) : '';
    stable = current && current === previous ? stable + 1 : 0; previous = current;
    return stable;
  }, { intervals: [50, 100, 150], timeout: 10_000 }).toBeGreaterThanOrEqual(3);
  const layout = await page.locator(selector).evaluate(root => {
    const rect = (node: Element) => { const r = node.getBoundingClientRect(); const s = getComputedStyle(node); return { tag: node.tagName, className: node.className, x: r.x, y: r.y, width: r.width, height: r.height, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight, overflow: s.overflow, position: s.position, transform: s.transform, scrollBehavior: s.scrollBehavior }; };
    const ancestors = []; for (let node: Element | null = root; node; node = node.parentElement) ancestors.push(rect(node));
    return { ancestors, documentHeight: document.documentElement.scrollHeight, bodyHeight: document.body.scrollHeight, viewport: [innerWidth, innerHeight], scroll: [scrollX, scrollY] };
  });
  writeFileSync(resolve(output, '..', 'capture-layout-' + name + '.json'), JSON.stringify(layout, null, 2));
  const buffer = await page.locator(selector).screenshot({ path: resolve(output, name), timeout: 90_000 });
  const bounds = (await page.locator(selector).boundingBox())!;
  expect(Math.abs(buffer.readUInt32BE(16) - bounds.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(buffer.readUInt32BE(20) - bounds.height)).toBeLessThanOrEqual(2);
}

async function inspect(page: Page, selector: string) {
  return page.locator(selector).evaluate(root => {
    const box = (node: Element) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    return { root: box(root), scrollOverflow: root.scrollWidth - root.clientWidth,
      inputs: [...root.querySelectorAll('input,select')].map(node => { const input = node as HTMLInputElement; return { id: input.id, value: input.value, checked: input.checked, min: input.min, max: input.max }; }),
      conditions: [...root.querySelectorAll('[data-connect-condition],[data-retention-balance]')].map(node => ({ attributes: Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value])) })),
      blocks: [...root.querySelectorAll('figure,svg,button,input,select,label,h2,h3,p,summary')].map(node => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 100), box: box(node), overflow: node.scrollWidth - node.clientWidth, fontSize: getComputedStyle(node).fontSize })),
      shapes: [...root.querySelectorAll('svg path,svg line,svg rect,svg circle')].map(node => ({ tag: node.tagName, attributes: Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value])), stroke: getComputedStyle(node).stroke, fill: getComputedStyle(node).fill })),
      svgText: [...root.querySelectorAll('svg text')].map(node => { const text = node as SVGTextElement, r = text.getBBox(), view = text.ownerSVGElement!.viewBox.baseVal, matrix = text.getScreenCTM(); return { text: text.textContent, x: r.x, y: r.y, width: r.width, height: r.height, viewWidth: view.width, viewHeight: view.height, renderedFontPx: parseFloat(getComputedStyle(text).fontSize) * (matrix ? Math.hypot(matrix.a, matrix.b) : 0) }; }) };
  });
}

for (const surface of ['connectivity', 'clearance', 'anatomy']) {
  test.describe(surface + ' visual review', () => {
    const bird = surface !== 'clearance';
    const harness = new GlHarness({ toolId: bird ? 'birdLab' : 'raptorHunt', toolFile: `stem_lab/stem_tool_${bird ? 'birdlab' : 'raptorhunt'}.js`,
      preScripts: bird ? ['stem_lab/stem_lab_module.js'] : [], appStyles: true, layout: 'document', width: 1280, height: 960,
      probes: surface === 'anatomy' ? `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round16Visual={scene,camera,renderer};return render(scene,camera);};return renderer;};})();` : undefined });
    test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
    test.afterAll(async () => harness.stop());
    test.afterEach(async ({ page }) => harness.destroy(page));
    for (const width of [1280, 390]) test(`${surface} at ${width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && /shader|WebGL|GL_INVALID/i.test(message.text())) errors.push(message.text()); });
      await page.setViewportSize({ width, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
      if (surface === 'anatomy') await page.addInitScript(() => {
        let time = 1000, next = 1, seed = 731;
        const pending = new Map<number, FrameRequestCallback>();
        Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        window.requestAnimationFrame = callback => { const id = next++; pending.set(id, callback); return id; };
        window.cancelAnimationFrame = id => { pending.delete(id); };
        (window as any).round16VisualStep = () => { time += 25; const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(time)); };
      });
      const data = surface === 'clearance' ? { raptorHunt: { activeSection: 'conservation' } } : { birdLab: { view: surface === 'connectivity' ? 'habitatsDeep' : 'observatory3d' } };
      await harness.mount(page, data, undefined, { expectCanvas: false });
      await page.locator('#wrap').evaluate((element: HTMLElement, size) => { element.style.width = size + 'px'; element.style.maxWidth = '100%'; element.style.height = 'auto'; element.style.padding = '0'; element.setAttribute('data-stem-tool-shell', 'true'); }, width);
      let selector: string, geometry: any = null, controls: any = null;
      if (surface === 'connectivity') {
        selector = '[data-birdlab-connectivity-study]'; await expect(page.locator(selector)).toBeVisible();
        await page.locator('#birdlab-connect-patch-C').uncheck(); await page.locator('[data-connect-pin]').click();
        await page.locator('[data-connect-experiment="longer"]').click(); await page.locator('#birdlab-connect-inspect').selectOption('0');
        await page.locator('[data-connect-answer="context"]').click();
        await expect(page.locator('[data-connect-condition="current"]')).toHaveAttribute('data-connect-threshold', '36');
      } else if (surface === 'clearance') {
        selector = '[data-raptor-retention-study]'; await expect(page.locator(selector)).toBeVisible();
        await page.locator('[data-retention-pin]').click(); await page.locator('[data-retention-experiment="double-half"]').click();
        await page.locator('#rh-retention-day').fill('40'); await page.locator('[data-retention-answer="limits"]').click();
        await expect(page.locator('#rh-retention-halfLife')).toHaveValue('20');
      } else {
        await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.round16Visual", null, { polling: 50, timeout: 60_000 });
        await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => { const control = canvas._birdlab3d; control.seek(7.5); control.setAnatomyStudy(true); control.setAnatomyPart('leftWing'); control.setAnatomyIsolate(true); control.setAnatomyView('above'); control.frameAnatomyPart(); });
        await page.evaluate(() => { for (let i = 0; i < 4; i++) (window as any).round16VisualStep(); });
        await expect(page.locator('[data-birdlab-anatomy-study]')).toBeVisible();
        await capturePanel(page, '[data-birdlab-anatomy-study]', `anatomy-controls-${width}.png`);
        controls = await inspect(page, '[data-birdlab-anatomy-study]'); selector = '.birdlab-3d-stage';
        geometry = await page.evaluate(() => {
          const w = window as any, { scene, camera, renderer } = w.round16Visual, T = w.THREE, state = (document.querySelector('[data-birdlab-3d-canvas]') as any)._birdlab3d.getState();
          scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
          const meshes: any[] = []; scene.getObjectByName('birdlab-red-tailed-hawk').traverse((mesh: any) => { if (mesh.isMesh) meshes.push({ uuid: mesh.uuid, name: mesh.name, visible: mesh.visible, morphs: mesh.morphTargetInfluences?.slice() || [], matrixWorld: mesh.matrixWorld.toArray() }); });
          const gl = renderer.getContext();
          return { time: state.time, paused: state.paused, study: state.anatomyInvestigation, meshes,
            projected: state.anatomyInvestigation.corners.map((point: number[]) => new T.Vector3(...point).project(camera).toArray()),
            camera: { position: camera.position.toArray(), target: state.cameraTarget, quaternion: camera.quaternion.toArray(), up: camera.up.toArray(), fov: camera.fov, aspect: camera.aspect, projectionMatrix: camera.projectionMatrix.toArray(), matrixWorld: camera.matrixWorld.toArray() },
            renderer: { live: !gl.isContextLost(), calls: renderer.info.render.calls, shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) } };
        });
        expect(geometry.time).toBe(7.5); expect(geometry.paused).toBe(true); expect(geometry.study.isolate).toBe(true); expect(geometry.study.part).toBe('leftWing'); expect(geometry.renderer.live).toBe(true); expect(geometry.renderer.calls).toBeGreaterThan(0); expect(geometry.renderer.shaders).toBe(true);
        for (const point of geometry.projected) { expect(Math.abs(point[0])).toBeLessThan(1); expect(Math.abs(point[1])).toBeLessThan(1); }
      }
      await capturePanel(page, selector, `${surface}-${width}.png`);
      const readability = await inspect(page, selector), overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      const harnessErrors = await page.evaluate(() => (window as any).__events.errors);
      writeFileSync(resolve(output, `${surface}-${width}.json`), JSON.stringify({ surface, width, captureViewport: page.viewportSize(), overflow, errors, harnessErrors, geometry, readability, controlsReadability: controls }, null, 2));
      expect(overflow).toBeLessThanOrEqual(1); expect(errors).toEqual([]); expect(harnessErrors).toEqual([]);
      for (const labels of [readability.svgText, controls?.svgText || []]) for (const label of labels) { expect(label.x).toBeGreaterThanOrEqual(0); expect(label.x + label.width).toBeLessThanOrEqual(label.viewWidth); expect(label.y).toBeGreaterThanOrEqual(0); expect(label.y + label.height).toBeLessThanOrEqual(label.viewHeight); }
    });
  });
}
