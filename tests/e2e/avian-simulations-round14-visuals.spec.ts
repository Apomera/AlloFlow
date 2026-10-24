import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve('reports/avian-simulations-round14-2026-10-20/final');
test.use({ video: 'off' });
test.describe.configure({ timeout: 240_000, retries: 0 });

async function readability(page: Page, selector: string) {
  return page.locator(selector).evaluate(root => {
    function box(element: Element) { const value = element.getBoundingClientRect(); return { x: value.x, y: value.y, width: value.width, height: value.height }; }
    const rootBox = root.getBoundingClientRect();
    return { root: box(root), scrollOverflow: root.scrollWidth - root.clientWidth,
      blocks: [...root.querySelectorAll('figure,svg,button,input,select,label,h2,h3,p,summary')].map(element => {
        const value = element.getBoundingClientRect(), css = getComputedStyle(element);
        return { tag: element.tagName, id: element.id || null, text: element.textContent?.trim().slice(0, 120), box: box(element),
          fontSize: css.fontSize, lineHeight: css.lineHeight, scrollOverflow: element.scrollWidth - element.clientWidth,
          outsideRoot: value.left < rootBox.left - 1 || value.right > rootBox.right + 1 };
      }),
      svgText: [...root.querySelectorAll('svg text')].map(element => {
        const text = element as SVGTextElement, bounds = text.getBBox(), matrix = text.getScreenCTM(), svg = text.ownerSVGElement!;
        return { text: text.textContent, native: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
          viewBox: svg.getAttribute('viewBox'), approximateRenderedFontPx: parseFloat(getComputedStyle(text).fontSize) * (matrix ? Math.hypot(matrix.a, matrix.b) : 0) };
      }) };
  });
}

async function detectionGeometry(page: Page) {
  return page.locator('[data-birdlab-detection-study]').evaluate(root => ({
    controls: Object.fromEntries([...root.querySelectorAll('input,select')].map(node => { const input = node as HTMLInputElement; return [input.id, input.type === 'checkbox' ? input.checked : input.value]; })),
    conditions: [...root.querySelectorAll('[data-detect-condition]')].map(element => ({ condition: element.getAttribute('data-detect-condition'),
      seed: element.getAttribute('data-detect-seed'), p: element.getAttribute('data-detect-prob'), visits: element.getAttribute('data-detect-visits'), selected: element.getAttribute('data-detect-selected'), truth: element.getAttribute('data-detect-truth'),
      observed: element.getAttribute('data-detect-count'), expected: element.getAttribute('data-detect-expected'),
      sites: [...element.querySelectorAll('[data-detect-site]')].map(node => { const circle = node.querySelector('[data-detect-site-disc]') as SVGCircleElement;
        return { index: node.getAttribute('data-detect-site'), observed: node.getAttribute('data-detect-observed'), truth: node.getAttribute('data-detect-site-truth'), history: node.getAttribute('data-detect-pattern'),
          circle: [circle.cx.baseVal.value, circle.cy.baseVal.value, circle.r.baseVal.value], fill: getComputedStyle(circle).fill }; }),
      bars: [...element.querySelectorAll('[data-detect-bar]')].map(node => { const rect = node as SVGRectElement;
        return { name: node.getAttribute('data-detect-bar'), geometry: [rect.x.baseVal.value, rect.y.baseVal.value, rect.width.baseVal.value, rect.height.baseVal.value] }; }),
      selectedHistory: [...element.querySelectorAll('[data-detect-history="selected"] td')].map(node => ({ symbol: node.textContent, label: node.getAttribute('aria-label') }))
    })),
    probability: [...root.querySelectorAll('[data-detect-probability-series]')].map(element => {
      const selected = element.querySelector('[data-detect-probability-selection]') as SVGCircleElement;
      return { condition: element.getAttribute('data-detect-probability-series'), path: element.querySelector('path')!.getAttribute('d'),
        points: [...element.querySelectorAll('[data-detect-probability-point]')].map(node => { const circle = node as SVGCircleElement; return [circle.cx.baseVal.value, circle.cy.baseVal.value]; }),
        selected: [selected.cx.baseVal.value, selected.cy.baseVal.value] };
    })
  }));
}

async function phylogenyGeometry(page: Page) {
  return page.locator('[data-raptor-tree-study]').evaluate(root => ({
    savedSettings: (window as any).__toolData.raptorHunt.treeEvidence,
    controls: [...root.querySelectorAll('button[aria-pressed],input')].map(node => ({ id: node.id, text: node.textContent?.trim(), pressed: node.getAttribute('aria-pressed'), value: (node as HTMLInputElement).value })),
    diagrams: [...root.querySelectorAll('[data-tree-diagram]')].map(svg => ({ condition: svg.getAttribute('data-tree-diagram'), viewBox: svg.getAttribute('viewBox'),
      edges: [...svg.querySelectorAll('[data-tree-edge]')].map(node => { const line = node as SVGLineElement;
        return { name: line.getAttribute('data-tree-edge'), changed: line.getAttribute('data-changed'), endpoints: [line.x1.baseVal.value, line.y1.baseVal.value, line.x2.baseVal.value, line.y2.baseVal.value], stroke: getComputedStyle(line).stroke }; }) })),
    matrices: [...root.querySelectorAll('[data-tree-matrix]')].map(svg => ({ condition: svg.getAttribute('data-tree-matrix'), viewBox: svg.getAttribute('viewBox'),
      cells: [...svg.querySelectorAll('rect')].map(node => ({ attributes: Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value])), geometry: [node.x.baseVal.value, node.y.baseVal.value, node.width.baseVal.value, node.height.baseVal.value] })) })),
    scores: [...root.querySelectorAll('[data-tree-score-bar]')].map(node => { const rect = node as SVGRectElement;
      return { condition: rect.getAttribute('data-tree-score-bar'), geometry: [rect.x.baseVal.value, rect.y.baseVal.value, rect.width.baseVal.value, rect.height.baseVal.value] }; }),
    text: [...root.querySelectorAll('h2,h3,figcaption,p[role="status"]')].map(node => node.textContent?.trim())
  }));
}

async function lightingGeometry(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round14VisualScene;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const canvas = document.querySelector('[data-birdlab-3d-canvas]') as any, state = canvas._birdlab3d.getState();
    const sun = scene.getObjectByName('birdlab-key-sun'), sky = scene.getObjectByName('birdlab-sky');
    const sunPosition = sun.getWorldPosition(new T.Vector3()), target = sun.target.getWorldPosition(new T.Vector3());
    function value(input: any) { return input?.isTexture ? { texture: input.uuid } : input?.toArray ? input.toArray() : typeof input === 'number' || typeof input === 'string' || typeof input === 'boolean' || input === null ? input : String(input); }
    const gl = renderer.getContext();
    return { time: state.time, paused: state.paused, enabled: state.lightStudy, study: state.lightInvestigation, palette: state.lighting, customDirection: state.lightingDirectionCustom,
      sun: { directional: !!sun.isDirectionalLight, position: sunPosition.toArray(), target: target.toArray(), sunward: sunPosition.clone().sub(target).normalize().toArray(), color: value(sun.color), intensity: sun.intensity },
      sky: { visible: sky.visible, direction: sky.material.uniforms.sunDirection.value.toArray(), uniforms: Object.fromEntries(Object.entries(sky.material.uniforms).map(([name, entry]: [string, any]) => [name, value(entry.value)])) },
      lights: scene.children.filter((object: any) => object.isLight).map((light: any) => ({ name: light.name, color: value(light.color), groundColor: value(light.groundColor), intensity: light.intensity, position: light.position.toArray() })),
      appearance: { background: value(scene.background), fogColor: value(scene.fog?.color), fogDensity: scene.fog?.density, exposure: renderer.toneMappingExposure },
      camera: { position: camera.position.toArray(), up: camera.up.toArray(), aspect: camera.aspect },
      charts: [...document.querySelectorAll('[data-light-plane]')].map(svg => ({ plane: svg.getAttribute('data-light-plane'), viewBox: svg.getAttribute('viewBox'),
        vectors: [...svg.querySelectorAll('[data-light-vector]')].map(node => { const line = node as SVGLineElement;
          return { condition: line.getAttribute('data-light-vector'), endpoints: [line.x1.baseVal.value, line.y1.baseVal.value, line.x2.baseVal.value, line.y2.baseVal.value], stroke: getComputedStyle(line).stroke }; }) })),
      renderer: { live: !gl.isContextLost(), calls: renderer.info.render.calls, drawingWidth: gl.drawingBufferWidth, drawingHeight: gl.drawingBufferHeight, version: gl.getParameter(gl.VERSION),
        shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) } };
  });
}

for (const surface of ['detection', 'phylogeny', 'lighting']) {
  test.describe(surface + ' visual review', () => {
    const bird = surface !== 'phylogeny';
    const harness = new GlHarness({ toolId: bird ? 'birdLab' : 'raptorHunt', toolFile: `stem_lab/stem_tool_${bird ? 'birdlab' : 'raptorhunt'}.js`,
      preScripts: bird ? ['stem_lab/stem_lab_module.js'] : [], appStyles: true, layout: 'document', width: 1280, height: 960,
      probes: surface === 'lighting' ? `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round14VisualScene={scene,camera,renderer};return render(scene,camera);};return renderer;};})();` : undefined });
    test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
    test.afterAll(async () => harness.stop());
    test.afterEach(async ({ page }) => harness.destroy(page));
    for (const width of [1280, 390]) test(`${surface} at ${width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && /shader|WebGL|GL_INVALID/i.test(message.text())) errors.push(message.text()); });
      await page.setViewportSize({ width, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
      if (surface === 'lighting') await page.addInitScript(() => {
        let time = 1000, next = 1, seed = 731;
        const callbacks = new Map<number, FrameRequestCallback>();
        Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        window.requestAnimationFrame = callback => { const id = next++; callbacks.set(id, callback); return id; };
        window.cancelAnimationFrame = id => { callbacks.delete(id); };
        (window as any).round14VisualStep = () => { time += 25; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback(time)); };
      });
      const state = surface === 'phylogeny' ? { raptorHunt: { activeSection: 'evolution' } } : { birdLab: { view: surface === 'detection' ? 'citizenScience' : 'observatory3d' } };
      await harness.mount(page, state, undefined, { expectCanvas: false });
      await page.locator('#wrap').evaluate((element: HTMLElement, size) => {
        element.style.width = size + 'px'; element.style.maxWidth = '100%'; element.style.height = 'auto'; element.style.padding = '0'; element.setAttribute('data-stem-tool-shell', 'true');
      }, width);
      let selector: string, geometry: unknown, controls: unknown = null;
      if (surface === 'lighting') {
        await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.round14VisualScene", null, { polling: 50, timeout: 60_000 });
        await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => { canvas._birdlab3d.seek(7.5); canvas._birdlab3d.setLightStudy(true); });
        await expect(page.locator('[data-birdlab-light-study]')).toBeVisible();
        await page.locator('[data-light-pin]').click(); await page.locator('[data-light-preset="raking"]').click();
        await page.evaluate(() => { for (let index = 0; index < 4; index++) (window as any).round14VisualStep(); });
        await page.locator('[data-birdlab-light-study]').screenshot({ path: resolve(output, `lighting-controls-${width}.png`), timeout: 90_000 });
        controls = await readability(page, '[data-birdlab-light-study]'); geometry = await lightingGeometry(page); selector = '.birdlab-3d-stage';
        const snapshot = geometry as any;
        expect(snapshot.time).toBe(7.5); expect(snapshot.paused).toBe(true); expect(snapshot.enabled).toBe(true); expect(snapshot.study.pinned).not.toBeNull();
        expect(snapshot.study.azimuth).toBeCloseTo(-120, 7); expect(snapshot.study.elevation).toBeCloseTo(12, 7);
        expect(snapshot.sun.directional).toBe(true); expect(snapshot.renderer.live).toBe(true); expect(snapshot.renderer.calls).toBeGreaterThan(0); expect(snapshot.renderer.shaders).toBe(true);
      } else if (surface === 'detection') {
        selector = '[data-birdlab-detection-study]'; await expect(page.locator(selector)).toBeVisible();
        await page.locator('#birdlab-detect-site').selectOption('2'); await page.locator('[data-detect-pin]').click();
        await page.locator('#birdlab-detect-visits').fill('5'); await page.locator('#birdlab-detect-prob').fill('60');
        await page.locator('#birdlab-detect-truth').check(); await page.locator('#birdlab-detect-site').selectOption('0');
        await page.locator('[data-detect-answer="unresolved"]').click();
        await expect(page.locator('[data-detect-condition="pinned"]')).toHaveAttribute('data-detect-prob', '35'); geometry = await detectionGeometry(page);
      } else {
        selector = '[data-raptor-tree-study]'; await expect(page.locator(selector)).toBeVisible();
        await page.locator('[data-tree-preset="conflict"]').click(); await page.locator('[data-tree-topology="2"]').click();
        await page.locator('[data-tree-next-assignment]').click(); await page.locator('[data-tree-pin]').click();
        await page.locator('[data-tree-topology="0"]').click();
        await page.locator('#rh-tree-weight').evaluate((input: HTMLInputElement) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '3'); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page.locator('[data-tree-answer="limits"]').click(); await expect(page.locator('#rh-tree-weight')).toHaveValue('3'); geometry = await phylogenyGeometry(page);
        const clippedLabels = await page.locator('[data-tree-scores] svg').evaluate(svg => {
          const bounds = (svg as SVGSVGElement).viewBox.baseVal;
          return [...svg.querySelectorAll<SVGTextElement>('text')].filter(text => {
            const box = text.getBBox();
            return box.x < bounds.x - 1 || box.x + box.width > bounds.x + bounds.width + 1 || box.y < bounds.y - 1 || box.y + box.height > bounds.y + bounds.height + 1;
          }).map(text => text.textContent);
        });
        expect(clippedLabels, 'native score labels fit the displayed SVG at both sizes').toEqual([]);
      }
      await expect(page.locator(selector)).toBeVisible();
      await page.locator(selector).screenshot({ path: resolve(output, `${surface}-${width}.png`), timeout: 90_000 });
      const notes = await readability(page, selector), overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      const gl = surface === 'lighting' ? await harness.glScene(page) : null;
      if (surface === 'lighting') { expect(gl).not.toBeNull(); expect(gl!.draws).toBeGreaterThan(0); }
      const harnessErrors = await page.evaluate(() => (window as any).__events.errors);
      writeFileSync(resolve(output, `${surface}-${width}.json`), JSON.stringify({ surface, width, overflow, errors, harnessErrors, geometry, readability: notes, controlsReadability: controls, gl }, null, 2));
      expect(overflow).toBeLessThanOrEqual(1); expect(errors).toEqual([]); expect(harnessErrors).toEqual([]);
    });
  });
}
