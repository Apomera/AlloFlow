import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve('reports/avian-simulations-round13-2026-10-20/final');
test.use({ video: 'off' });
test.describe.configure({ timeout: 240_000, retries: 0 });

async function readability(page: Page, selector: string) {
  return page.locator(selector).evaluate(root => {
    function box(element: Element) { const value = element.getBoundingClientRect(); return { x: value.x, y: value.y, width: value.width, height: value.height }; }
    const rootBox = root.getBoundingClientRect();
    return { root: box(root), scrollOverflow: root.scrollWidth - root.clientWidth,
      blocks: [...root.querySelectorAll('figure,svg,button,input,select,label,h2,h3,p')].map(element => {
        const value = element.getBoundingClientRect(), css = getComputedStyle(element);
        return { tag: element.tagName, id: element.id || null, text: element.textContent?.trim().slice(0, 120), box: box(element),
          fontSize: css.fontSize, lineHeight: css.lineHeight, scrollOverflow: element.scrollWidth - element.clientWidth,
          outsideRoot: value.left < rootBox.left - 1 || value.right > rootBox.right + 1 };
      }),
      svgText: [...root.querySelectorAll('svg text')].map(element => {
        const text = element as SVGTextElement, bounds = text.getBBox(), matrix = text.getScreenCTM(), svg = text.ownerSVGElement!;
        const scale = matrix ? Math.hypot(matrix.a, matrix.b) : 0, css = getComputedStyle(text);
        return { text: text.textContent, native: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
          viewBox: svg.getAttribute('viewBox'), approximateRenderedFontPx: parseFloat(css.fontSize) * scale };
      }) };
  });
}

async function foragingGeometry(page: Page) {
  return page.locator('[data-birdlab-forage-study]').evaluate(root => {
    function line(node: SVGLineElement) { return [node.x1.baseVal.value, node.y1.baseVal.value, node.x2.baseVal.value, node.y2.baseVal.value]; }
    return { inputs: Object.fromEntries([...root.querySelectorAll('input')].map(element => [element.id, element.value])),
      optimum: { time: root.getAttribute('data-forage-optimum-time'), rate: root.getAttribute('data-forage-optimum-rate'), boundary: root.getAttribute('data-forage-optimum-boundary') },
      charts: [...root.querySelectorAll('[data-forage-chart]')].map(element => {
        const peak = element.querySelector('[data-forage-peak]') as SVGCircleElement | null;
        return { condition: element.getAttribute('data-forage-chart'), travel: element.getAttribute('data-forage-travel'), capacity: element.getAttribute('data-forage-capacity'),
          tau: element.getAttribute('data-forage-tau'), residence: element.getAttribute('data-forage-residence'),
          curve: element.querySelector('[data-forage-curve]')!.getAttribute('d'),
          average: line(element.querySelector<SVGLineElement>('[data-forage-average]')!), marginal: line(element.querySelector<SVGLineElement>('[data-forage-marginal]')!),
          peak: peak ? [peak.cx.baseVal.value, peak.cy.baseVal.value] : null,
          readings: [...element.querySelectorAll('[data-forage-reading]')].map(node => ({ name: node.getAttribute('data-forage-reading'), text: node.textContent })) };
      }),
      timeBars: [...root.querySelectorAll('[data-forage-time]')].map(node => { const rect = node as SVGRectElement; return { name: rect.getAttribute('data-forage-time'), x: rect.x.baseVal.value, width: rect.width.baseVal.value }; }) };
  });
}

async function apertureGeometry(page: Page) {
  return page.locator('[data-raptor-aperture-study]').evaluate(root => ({
    inputs: Object.fromEntries([...root.querySelectorAll('input,select')].map(element => {
      const control = element as HTMLInputElement; return [control.id, control.type === 'checkbox' ? control.checked : control.value];
    })),
    metrics: [...root.querySelectorAll('[data-aperture-metric],[data-aperture-ratio]')].map(node => ({ metric: node.getAttribute('data-aperture-metric') || node.getAttribute('data-aperture-ratio'), text: node.textContent })),
    display: root.querySelector('[data-aperture-display-note]')?.textContent,
    firstRings: [...root.querySelectorAll('[data-aperture-first-ring]')].map(node => { const circle = node as SVGCircleElement; return { condition: circle.getAttribute('data-aperture-first-ring'), radius: circle.r.baseVal.value }; }),
    bands: [...root.querySelectorAll('[data-aperture-bands]')].map(group => ({ condition: group.getAttribute('data-aperture-bands'),
      samples: [0, 1, 23, 119, 239].map(index => { const circle = group.querySelector('[data-band-index="' + index + '"]') as SVGCircleElement;
        return { index, radius: circle.r.baseVal.value, opacity: Number(circle.getAttribute('opacity')) }; }) })),
    curves: [...root.querySelectorAll('[data-aperture-curve]')].map(node => ({ condition: node.getAttribute('data-aperture-curve'), path: node.getAttribute('d') }))
  }));
}

async function orientationGeometry(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round13VisualScene;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const controller = (document.querySelector('[data-birdlab-3d-canvas]') as any)._birdlab3d, state = controller.getState();
    const guide = scene.getObjectByName('birdlab-attitude-guide'), bird = scene.getObjectByName('birdlab-red-tailed-hawk');
    const origin = bird.localToWorld(new T.Vector3()), axes = { forward: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0] };
    const projected: number[][] = [];
    guide.traverse((object: any) => { const values = object.geometry?.attributes?.position; if (!values) return;
      for (let index = 0; index < values.count; index++) projected.push(new T.Vector3().fromBufferAttribute(values, index).applyMatrix4(object.matrixWorld).project(camera).toArray());
    });
    function world(object: any, point: number[]) { return new T.Vector3(...point).applyMatrix4(object.matrixWorld).toArray(); }
    const horizon = guide.getObjectByName('birdlab-attitude-horizon');
    return { time: state.time, paused: state.paused, lens: state.attitudeLens, study: state.attitudeStudy,
      guide: { visible: guide.visible, origin: guide.getWorldPosition(new T.Vector3()).toArray(),
        horizonCenter: horizon.getWorldPosition(new T.Vector3()).toArray(), horizonNormal: new T.Vector3(0, 0, 1).applyQuaternion(horizon.getWorldQuaternion(new T.Quaternion())).toArray(),
        axes: Object.entries(axes).map(([name, vector]) => {
          const stem = guide.getObjectByName('birdlab-attitude-' + name + '-stem'), tip = guide.getObjectByName('birdlab-attitude-' + name + '-tip');
          return { name, bodyDirection: bird.localToWorld(new T.Vector3(...vector)).sub(origin).normalize().toArray(),
            start: world(stem, [0, -.5, 0]), end: world(stem, [0, .5, 0]), tip: world(tip, [0, .5, 0]) };
        }),
        projectedBounds: { min: [0, 1, 2].map(axis => Math.min(...projected.map(point => point[axis]))), max: [0, 1, 2].map(axis => Math.max(...projected.map(point => point[axis]))) } },
      camera: { position: camera.position.toArray(), up: camera.up.toArray(), aspect: camera.aspect },
      charts: [...document.querySelectorAll('[data-attitude-plane]')].map(svg => ({ plane: svg.getAttribute('data-attitude-plane'),
        vectors: [...svg.querySelectorAll('[data-attitude-vector]')].map(node => { const line = node as SVGLineElement;
          return { name: line.getAttribute('data-attitude-vector'), endpoints: [line.x1.baseVal.value, line.y1.baseVal.value, line.x2.baseVal.value, line.y2.baseVal.value] }; }) })),
      renderer: { live: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls,
        shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) } };
  });
}

for (const surface of ['foraging', 'aperture', 'orientation']) {
  test.describe(surface + ' visual review', () => {
    const bird = surface !== 'aperture';
    const harness = new GlHarness({ toolId: bird ? 'birdLab' : 'raptorHunt', toolFile: `stem_lab/stem_tool_${bird ? 'birdlab' : 'raptorhunt'}.js`,
      preScripts: bird ? ['stem_lab/stem_lab_module.js'] : [], appStyles: true, layout: 'document', width: 1280, height: 960,
      probes: surface === 'orientation' ? `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round13VisualScene={scene,camera,renderer};return render(scene,camera);};return renderer;};})();` : undefined });
    test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
    test.afterAll(async () => harness.stop());
    test.afterEach(async ({ page }) => harness.destroy(page));
    for (const width of [1280, 390]) test(`${surface} at ${width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && /shader|WebGL|GL_INVALID/i.test(message.text())) errors.push(message.text()); });
      await page.setViewportSize({ width, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
      if (surface === 'orientation') await page.addInitScript(() => {
        let time = 1000, next = 1, seed = 731;
        const callbacks = new Map<number, FrameRequestCallback>();
        Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        window.requestAnimationFrame = callback => { const id = next++; callbacks.set(id, callback); return id; };
        window.cancelAnimationFrame = id => { callbacks.delete(id); };
        (window as any).round13VisualStep = () => { time += 25; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback(time)); };
      });
      const state = surface === 'aperture' ? { raptorHunt: { activeSection: 'senses' } } : { birdLab: { view: surface === 'foraging' ? 'diets' : 'observatory3d' } };
      await harness.mount(page, state, undefined, { expectCanvas: false });
      await page.locator('#wrap').evaluate((element: HTMLElement, size) => {
        element.style.width = size + 'px'; element.style.maxWidth = '100%'; element.style.height = 'auto'; element.style.padding = '0'; element.setAttribute('data-stem-tool-shell', 'true');
      }, width);
      let selector: string, geometry: unknown, controls: unknown = null;
      if (surface === 'orientation') {
        await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.round13VisualScene", null, { polling: 50, timeout: 60_000 });
        await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => canvas._birdlab3d.seek(26));
        await expect(page.locator('[data-birdlab-attitude-toggle]')).toBeEnabled(); await page.locator('[data-birdlab-attitude-toggle]').click();
        await page.locator('[data-attitude-view="oblique"]').click();
        await page.evaluate(() => { for (let index = 0; index < 4; index++) (window as any).round13VisualStep(); });
        await expect(page.locator('[data-birdlab-attitude-study]')).toBeVisible();
        await page.locator('[data-birdlab-attitude-study]').screenshot({ path: resolve(output, `orientation-controls-${width}.png`), timeout: 90_000 });
        controls = await readability(page, '[data-birdlab-attitude-study]'); geometry = await orientationGeometry(page); selector = '.birdlab-3d-stage';
        const snapshot = geometry as any;
        expect(snapshot.time).toBe(26); expect(snapshot.paused).toBe(true); expect(snapshot.study.view).toBe('oblique');
        expect(snapshot.guide.visible).toBe(true); expect(snapshot.renderer.live).toBe(true); expect(snapshot.renderer.calls).toBeGreaterThan(0); expect(snapshot.renderer.shaders).toBe(true);
      } else if (surface === 'foraging') {
        selector = '[data-birdlab-forage-study]'; await expect(page.locator(selector)).toBeVisible();
        await page.locator('[data-forage-pin]').click(); await page.locator('#birdlab-forage-travel').fill('60');
        await page.locator('[data-forage-find]').click(); await page.locator('[data-forage-answer="measure"]').click();
        await expect(page.locator('[data-forage-chart="pinned"]')).toHaveAttribute('data-forage-travel', '8');
        geometry = await foragingGeometry(page);
      } else {
        selector = '[data-raptor-aperture-study]'; await expect(page.locator(selector)).toBeVisible();
        await page.locator('[data-aperture-pin]').click(); await page.locator('[data-aperture-experiment="both"]').click();
        await page.locator('#rh-aperture-radius').selectOption('10'); await page.locator('#rh-aperture-contrast').check();
        await page.locator('[data-aperture-answer="limits"]').click();
        await expect(page.locator('#rh-aperture-diameter')).toHaveValue('8'); await expect(page.locator('#rh-aperture-focal')).toHaveValue('40');
        geometry = await apertureGeometry(page);
      }
      await expect(page.locator(selector)).toBeVisible();
      await page.locator(selector).screenshot({ path: resolve(output, `${surface}-${width}.png`), timeout: 90_000 });
      const notes = await readability(page, selector), overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      const gl = surface === 'orientation' ? await harness.glScene(page) : null;
      if (surface === 'orientation') { expect(gl).not.toBeNull(); expect(gl!.draws).toBeGreaterThan(0); }
      const harnessErrors = await page.evaluate(() => (window as any).__events.errors);
      writeFileSync(resolve(output, `${surface}-${width}.json`), JSON.stringify({ surface, width, overflow, errors, harnessErrors, geometry, readability: notes, controlsReadability: controls, gl }, null, 2));
      expect(overflow).toBeLessThanOrEqual(1); expect(errors).toEqual([]); expect(harnessErrors).toEqual([]);
    });
  });
}
