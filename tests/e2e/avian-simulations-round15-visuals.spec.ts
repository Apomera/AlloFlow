import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve('reports/avian-simulations-round15-2026-10-20/final');
test.use({ video: 'off' });
test.describe.configure({ timeout: 240_000, retries: 0 });

async function readability(page: Page, selector: string) {
  return page.locator(selector).evaluate(root => {
    function box(element: Element) { const value = element.getBoundingClientRect(); return { x: value.x, y: value.y, width: value.width, height: value.height }; }
    const rootBox = root.getBoundingClientRect();
    return { root: box(root), scrollOverflow: root.scrollWidth - root.clientWidth,
      blocks: [...root.querySelectorAll('figure,svg,button,input,select,label,h2,h3,p,summary')].map(element => {
        const bounds = element.getBoundingClientRect(), css = getComputedStyle(element);
        return { tag: element.tagName, id: element.id || null, text: element.textContent?.trim().slice(0, 120), box: box(element),
          fontSize: css.fontSize, lineHeight: css.lineHeight, scrollOverflow: element.scrollWidth - element.clientWidth,
          outsideRoot: bounds.left < rootBox.left - 1 || bounds.right > rootBox.right + 1 };
      }),
      svgText: [...root.querySelectorAll('svg text')].map(node => {
        const text = node as SVGTextElement, bounds = text.getBBox(), matrix = text.getScreenCTM(), svg = text.ownerSVGElement!;
        return { text: text.textContent, native: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
          viewBox: svg.getAttribute('viewBox'), approximateRenderedFontPx: parseFloat(getComputedStyle(text).fontSize) * (matrix ? Math.hypot(matrix.a, matrix.b) : 0) };
      }) };
  });
}

async function seasonGeometry(page: Page) {
  return page.locator('[data-birdlab-season-study]').evaluate(root => ({
    day: root.getAttribute('data-season-day'), inputs: Object.fromEntries([...root.querySelectorAll('input')].map(input => [input.id, input.value])),
    conditions: [...root.querySelectorAll('[data-season-chart]')].map(element => {
      const cursor = element.querySelector('[data-season-cursor]') as SVGLineElement;
      return { condition: element.getAttribute('data-season-chart'), foodPeak: element.getAttribute('data-season-food-peak'), foodWidth: element.getAttribute('data-season-food-width'),
        demandPeak: element.getAttribute('data-season-demand-peak'), demandWidth: element.getAttribute('data-season-demand-width'), overlap: element.getAttribute('data-season-overlap'),
        viewBox: element.querySelector('svg')!.getAttribute('viewBox'), polygon: element.querySelector('[data-season-overlap-shape]')!.getAttribute('d'),
        profiles: [...element.querySelectorAll('[data-season-profile]')].map(node => ({ kind: node.getAttribute('data-season-profile'), path: node.getAttribute('d'), stroke: getComputedStyle(node).stroke })),
        cursor: [cursor.x1.baseVal.value, cursor.y1.baseVal.value, cursor.x2.baseVal.value, cursor.y2.baseVal.value],
        samples: [...element.querySelectorAll('[data-season-sample]')].map(node => { const circle = node as SVGCircleElement; return { kind: circle.getAttribute('data-season-sample'), point: [circle.cx.baseVal.value, circle.cy.baseVal.value] }; }),
        readings: [...element.querySelectorAll('[data-season-reading]')].map(node => ({ name: node.getAttribute('data-season-reading'), text: node.textContent })) };
    })
  }));
}

async function cohortGeometry(page: Page) {
  return page.locator('[data-raptor-cohort-study]').evaluate(root => ({
    savedSettings: (window as any).__toolData.raptorHunt.cohortStudy, sharedScale: root.getAttribute('data-cohort-scale'),
    inputs: Object.fromEntries([...root.querySelectorAll('input')].map(input => [input.id, input.value])),
    trajectory: [...root.querySelectorAll('[data-cohort-curve]')].map(node => ({ condition: node.getAttribute('data-cohort-curve'), path: node.getAttribute('d') })),
    points: [...root.querySelectorAll('[data-cohort-point]')].map(node => { const circle = node as SVGCircleElement; return { condition: circle.getAttribute('data-cohort-point'), point: [circle.cx.baseVal.value, circle.cy.baseVal.value] }; }),
    stocks: [...root.querySelectorAll('[data-cohort-stock]')].map(node => { const rect = node as SVGRectElement; return { condition: rect.getAttribute('data-cohort-stock'),
      geometry: [rect.x.baseVal.value, rect.y.baseVal.value, rect.width.baseVal.value, rect.height.baseVal.value], fill: getComputedStyle(rect).fill }; }),
    flows: [...root.querySelectorAll('[data-cohort-flow]')].map(element => ({ condition: element.getAttribute('data-cohort-flow'), viewBox: element.getAttribute('viewBox'),
      links: [...element.querySelectorAll('[data-cohort-link]')].map(node => ({ name: node.getAttribute('data-cohort-link'), path: node.getAttribute('d') })),
      bars: [...element.querySelectorAll('[data-cohort-contribution-bar]')].map(node => { const rect = node as SVGRectElement; return { name: rect.getAttribute('data-cohort-contribution-bar'), geometry: [rect.x.baseVal.value, rect.y.baseVal.value, rect.width.baseVal.value, rect.height.baseVal.value] }; }),
      values: [...element.querySelectorAll('[data-cohort-contribution-value],[data-cohort-loss],[data-cohort-balance]')].map(node => ({ name: node.getAttribute('data-cohort-contribution-value') || node.getAttribute('data-cohort-loss') || 'balance', text: node.textContent })) })),
    readings: [...root.querySelectorAll('[data-cohort-reading]')].map(node => ({ name: node.getAttribute('data-cohort-reading'), text: node.textContent }))
  }));
}

async function perspectiveGeometry(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round15VisualScene;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const canvas = document.querySelector('[data-birdlab-3d-canvas]') as any, state = canvas._birdlab3d.getState(), study = state.perspectiveInvestigation;
    function line(node: Element) { const value = node as SVGLineElement; return [value.x1.baseVal.value, value.y1.baseVal.value, value.x2.baseVal.value, value.y2.baseVal.value]; }
    const overlay = document.querySelector('[data-birdlab-perspective-ruler]') as SVGSVGElement, overlayBox = overlay.getBoundingClientRect();
    const gl = renderer.getContext(), target = new T.Vector3(...state.cameraTarget), distance = camera.position.distanceTo(target);
    const ruler = study.ruler.world.map((point: number[]) => new T.Vector3(...point).project(camera).toArray());
    return { time: state.time, paused: state.paused, enabled: state.perspectiveStudy, study,
      camera: { position: camera.position.toArray(), target: target.toArray(), up: camera.up.toArray(), quaternion: camera.quaternion.toArray(), aspect: camera.aspect,
        fov: camera.fov, near: camera.near, far: camera.far, distance, fieldHeight: 2 * distance * Math.tan(camera.fov * Math.PI / 360),
        projectionMatrix: camera.projectionMatrix.toArray(), matrixWorld: camera.matrixWorld.toArray(), matrixWorldInverse: camera.matrixWorldInverse.toArray() },
      ruler: { lengthFromWorldEndpoints: new T.Vector3(...study.ruler.world[0]).distanceTo(new T.Vector3(...study.ruler.world[1])), reprojectedNdc: ruler,
        fractionFromProjection: Math.abs(ruler[0][1] - ruler[1][1]) / 2, overlayViewBox: overlay.getAttribute('viewBox'),
        overlayBox: { x: overlayBox.x, y: overlayBox.y, width: overlayBox.width, height: overlayBox.height },
        native: [...overlay.querySelectorAll('[data-perspective-ruler]')].map(node => ({ condition: node.getAttribute('data-perspective-ruler'), endpoints: line(node) })) },
      cone: { viewBox: document.querySelector('[data-perspective-cone]')!.getAttribute('viewBox'),
        paths: [...document.querySelectorAll('[data-perspective-cone-path]')].map(node => ({ condition: node.getAttribute('data-perspective-cone-path'), path: node.getAttribute('d') })),
        focus: [...document.querySelectorAll('[data-perspective-focus]')].map(node => ({ condition: node.getAttribute('data-perspective-focus'), endpoints: line(node) })) },
      scales: [...document.querySelectorAll('[data-perspective-scale]')].map(node => { const rect = node as SVGRectElement; return { condition: rect.getAttribute('data-perspective-scale'), geometry: [rect.x.baseVal.value, rect.y.baseVal.value, rect.width.baseVal.value, rect.height.baseVal.value] }; }),
      controls: [...document.querySelectorAll('[data-birdlab-perspective-study] input')].map(node => { const input = node as HTMLInputElement; return { id: input.id, value: input.type === 'checkbox' ? input.checked : input.value, min: input.min, max: input.max, step: input.step }; }),
      renderer: { live: !gl.isContextLost(), calls: renderer.info.render.calls, drawingWidth: gl.drawingBufferWidth, drawingHeight: gl.drawingBufferHeight, version: gl.getParameter(gl.VERSION),
        shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) } };
  });
}

for (const surface of ['season', 'cohorts', 'perspective']) {
  test.describe(surface + ' visual review', () => {
    const bird = surface !== 'cohorts';
    const harness = new GlHarness({ toolId: bird ? 'birdLab' : 'raptorHunt', toolFile: `stem_lab/stem_tool_${bird ? 'birdlab' : 'raptorhunt'}.js`,
      preScripts: bird ? ['stem_lab/stem_lab_module.js'] : [], appStyles: true, layout: 'document', width: 1280, height: 960,
      probes: surface === 'perspective' ? `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round15VisualScene={scene,camera,renderer};return render(scene,camera);};return renderer;};})();` : undefined });
    test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
    test.afterAll(async () => harness.stop());
    test.afterEach(async ({ page }) => harness.destroy(page));
    for (const width of [1280, 390]) test(`${surface} at ${width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && /shader|WebGL|GL_INVALID/i.test(message.text())) errors.push(message.text()); });
      await page.setViewportSize({ width, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
      if (surface === 'perspective') await page.addInitScript(() => {
        let time = 1000, next = 1, seed = 731;
        const callbacks = new Map<number, FrameRequestCallback>();
        Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        window.requestAnimationFrame = callback => { const id = next++; callbacks.set(id, callback); return id; };
        window.cancelAnimationFrame = id => { callbacks.delete(id); };
        (window as any).round15VisualStep = () => { time += 25; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback(time)); };
      });
      const state = surface === 'cohorts' ? { raptorHunt: { activeSection: 'demographics' } } : { birdLab: { view: surface === 'season' ? 'climateBirds' : 'observatory3d' } };
      await harness.mount(page, state, undefined, { expectCanvas: false });
      await page.locator('#wrap').evaluate((element: HTMLElement, size) => {
        element.style.width = size + 'px'; element.style.maxWidth = '100%'; element.style.height = 'auto'; element.style.padding = '0'; element.setAttribute('data-stem-tool-shell', 'true');
      }, width);
      let selector: string, geometry: unknown, controls: unknown = null;
      if (surface === 'perspective') {
        await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.round15VisualScene", null, { polling: 50, timeout: 60_000 });
        await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => canvas._birdlab3d.seek(7.5));
        await expect(page.locator('[data-birdlab-perspective-toggle]')).toBeEnabled(); await page.locator('[data-birdlab-perspective-toggle]').click();
        await expect(page.locator('[data-birdlab-perspective-study]')).toBeVisible();
        await page.locator('[data-perspective-pin]').click(); await page.locator('#birdlab-perspective-link').check(); await page.locator('#birdlab-perspective-distance').fill('5');
        await page.evaluate(() => { for (let index = 0; index < 4; index++) (window as any).round15VisualStep(); });
        await page.locator('[data-birdlab-perspective-study]').screenshot({ path: resolve(output, `perspective-controls-${width}.png`), timeout: 90_000 });
        controls = await readability(page, '[data-birdlab-perspective-study]'); geometry = await perspectiveGeometry(page); selector = '.birdlab-3d-stage';
        const snapshot = geometry as any;
        expect(snapshot.time).toBe(7.5); expect(snapshot.paused).toBe(true); expect(snapshot.enabled).toBe(true); expect(snapshot.study.linked).toBe(true); expect(snapshot.study.pinned).not.toBeNull();
        expect(snapshot.camera.distance).toBeCloseTo(5, 7); expect(snapshot.camera.fieldHeight).toBeCloseTo(snapshot.study.pinned.fieldHeight, 7);
        expect(snapshot.ruler.lengthFromWorldEndpoints).toBeCloseTo(.5, 7); expect(snapshot.renderer.live).toBe(true); expect(snapshot.renderer.calls).toBeGreaterThan(0); expect(snapshot.renderer.shaders).toBe(true);
      } else if (surface === 'season') {
        selector = '[data-birdlab-season-study]'; await expect(page.locator(selector)).toBeVisible();
        await page.locator('[data-season-pin]').click(); await page.locator('[data-season-experiment="food-earlier"]').click();
        await page.locator('#birdlab-season-day').fill('54'); await page.locator('[data-season-answer="measure"]').click();
        await expect(page.locator('[data-season-chart="current"]')).toHaveAttribute('data-season-food-peak', '44');
        await expect(page.locator('[data-season-chart="pinned"]')).toHaveAttribute('data-season-food-peak', '54'); geometry = await seasonGeometry(page);
      } else {
        selector = '[data-raptor-cohort-study]'; await expect(page.locator(selector)).toBeVisible();
        await page.locator('[data-cohort-composition="juvenile"]').click(); await page.locator('[data-cohort-pin]').click(); await page.locator('[data-cohort-composition="adult"]').click();
        await page.locator('#rh-cohort-year').evaluate((input: HTMLInputElement) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '5'); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page.locator('[data-cohort-answer="limits"]').click(); await expect(page.locator('#rh-cohort-year')).toHaveValue('5'); geometry = await cohortGeometry(page);
      }
      await expect(page.locator(selector)).toBeVisible(); await page.locator(selector).screenshot({ path: resolve(output, `${surface}-${width}.png`), timeout: 90_000 });
      const notes = await readability(page, selector), overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      const gl = surface === 'perspective' ? await harness.glScene(page) : null;
      if (surface === 'perspective') { expect(gl).not.toBeNull(); expect(gl!.draws).toBeGreaterThan(0); }
      const harnessErrors = await page.evaluate(() => (window as any).__events.errors);
      writeFileSync(resolve(output, `${surface}-${width}.json`), JSON.stringify({ surface, width, overflow, errors, harnessErrors, geometry, readability: notes, controlsReadability: controls, gl }, null, 2));
      expect(overflow).toBeLessThanOrEqual(1); expect(errors).toEqual([]); expect(harnessErrors).toEqual([]);
    });
  });
}
