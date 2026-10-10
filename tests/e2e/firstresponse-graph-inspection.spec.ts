import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const report = process.env.FIRST_RESPONSE_GRAPH_REPORT || 'reports/firstresponse-graph-inspection';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const metrics: Record<string, unknown>[] = [];
const browserErrors = new WeakMap<Page, string[]>();
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 1080,
  layout: 'document', appStyles: true,
  probes: `window.__graphInspectionDraws = new WeakMap();
    var GraphInspectionRenderer = THREE.WebGLRenderer;
    THREE.WebGLRenderer = new Proxy(GraphInspectionRenderer, { construct: function (target, args, newTarget) {
      var renderer = Reflect.construct(target, args, newTarget), render = renderer.render;
      renderer.render = function (scene, camera) {
        var result = render.apply(this, arguments);
        if (scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')) {
          var previous = window.__graphInspectionDraws.get(this.domElement);
          window.__graphInspectionDraws.set(this.domElement, {
            scene: scene, camera: camera, sequence: (previous ? previous.sequence : 0) + 1
          });
        }
        return result;
      };
      return renderer;
    } });
    window.__graphInspection = function () {
      var canvas = document.querySelector('#wrap canvas'), record = canvas && window.__glRecorder.forCanvas(canvas);
      var drawn = canvas && window.__graphInspectionDraws.get(canvas);
      if (!record || !drawn) return null;
      var scene = drawn.scene, camera = drawn.camera;
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      function position(name) { return scene.getObjectByName(name).getWorldPosition(new THREE.Vector3()).toArray(); }
      var arrow = scene.getObjectByName('fr-depth-direction'), chest = scene.getObjectByName('fr-depth-chest');
      var heel = scene.getObjectByName('fr-rescuer-lower-heel'), bounds = new THREE.Box3().setFromObject(heel);
      var marker = position('fr-depth-marker');
      return {
        marker: marker, hands: position('fr-depth-hands'), chest: position('fr-depth-chest'), chestScale: chest.scale.toArray(),
        heelMinimum: bounds.min.toArray(), contactGap: bounds.min.y - marker[1],
        arrowVisible: arrow.visible,
        arrowDirection: new THREE.Vector3(0,1,0).transformDirection(arrow.matrixWorld).toArray(),
        camera: { position: camera.getWorldPosition(new THREE.Vector3()).toArray(), quaternion: camera.quaternion.toArray(),
          projection: camera.projectionMatrix.elements.slice() },
        draw: { id: record.id, draws: record.draws, renders: record.renders, sequence: drawn.sequence, createdBy: record.createdBy },
        state: JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)), errors: window.__events.errors.slice()
      };
    };`,
});

test.use({ hasTouch: true });

test.describe.configure({ mode: 'default', retries: 0, timeout: 300000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => {
  writeFileSync(report + '/graph-metrics.json', JSON.stringify(metrics, null, 2));
  await harness.stop();
});
test.beforeEach(async ({ page }) => {
  const errors: string[] = []; browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push('page: ' + error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, width = 1280, extra: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'depth',
    b3dPlaced: 'correct', b3dRec: ['check', 'arm', 'hand'], ...extra } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
  await settle(page);
}
async function probe(page: Page): Promise<any> {
  const value = await page.waitForFunction(() => (window as any).__graphInspection());
  try { return await value.jsonValue(); } finally { await value.dispose(); }
}
async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  const previous = await page.evaluate(() => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    return { id: runtime.__glRecorder.forCanvas(canvas)?.id || 0, sequence: runtime.__graphInspectionDraws.get(canvas)?.sequence || 0 };
  });
  await page.waitForFunction(previous => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__graphInspectionDraws.get(canvas);
    return record && drawn && drawn.sequence >= (record.id === previous.id ? previous.sequence + 2 : 2);
  }, previous);
}
function plot(page: Page) { return page.getByRole('slider', { name: 'Inspect cycle on graph', exact: true }); }
async function phase(page: Page, value: number) {
  await expect(plot(page)).toHaveAttribute('aria-valuenow', String(value));
  await expect(page.locator('#fr-depth-phase')).toHaveValue(String(value));
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.firstResponse.b3dDepthLab.phase)).toBe(value);
  await expect(page.locator('.fr-depth-cursor circle')).toHaveAttribute('cx', String(25 + value * 3.8));
}
async function graphPoint(page: Page, phase: number) {
  await plot(page).scrollIntoViewIfNeeded();
  return page.locator('.fr-depth-profile svg').evaluate((element, phase) => {
    const svg = element as SVGSVGElement;
    const point = svg.createSVGPoint(); point.x = 25 + phase * 3.8; point.y = 68;
    const client = point.matrixTransform(svg.getScreenCTM()!); return { x: client.x, y: client.y };
  }, phase);
}
async function clickPhase(page: Page, value: number, button: 'left' | 'right' = 'left') {
  const point = await graphPoint(page, value); await page.mouse.click(point.x, point.y, { button });
}
function valid(pose: any) {
  expect(pose.draw.createdBy).toBe('page'); expect(pose.draw.draws).toBeGreaterThan(0);
  expect(pose.draw.renders).toBeGreaterThan(0); expect(pose.draw.sequence).toBeGreaterThanOrEqual(2);
  expect(pose.marker.concat(pose.hands, pose.chest, pose.chestScale, pose.heelMinimum, pose.arrowDirection).every(Number.isFinite)).toBe(true);
  expect(Math.abs(pose.contactGap)).toBeLessThan(.00001); expect(pose.errors).toEqual([]);
}
function retained(before: any, after: any) {
  expect(after.b3dDepthInquiry).toEqual(before.b3dDepthInquiry);
  expect(after.b3dDepthReference).toEqual(before.b3dDepthReference);
  expect(after.b3dPlaced).toEqual(before.b3dPlaced); expect(after.b3dRec).toEqual(before.b3dRec);
  for (const key of ['depth', 'lean', 'rate', 'hands', 'anatomy', 'measure']) expect(after.b3dDepthLab[key], key).toBe(before.b3dDepthLab[key]);
}
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-body3d', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  })).violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) })));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  expect(browserErrors.get(page)).toEqual([]); expect((await probe(page)).errors).toEqual([]);
}
async function capture(page: Page, name: string, selector = '.fr-depth-profile') {
  if (page.viewportSize()!.width < 760 && selector === '.fr-depth-profile') {
    // Element screenshots scroll a tall figure beneath the pinned viewer. Capture
    // the actual phone viewport after the normal focus-reveal behavior instead.
    await plot(page).evaluate((element: HTMLElement) => { element.blur(); element.focus({ preventScroll: true }); });
    await expect.poll(() => plot(page).evaluate(element => {
      const bounds = element.getBoundingClientRect(), stage = document.querySelector('.fr-body3d-stage')!.getBoundingClientRect();
      return bounds.top >= stage.bottom + 8 && bounds.bottom <= innerHeight;
    })).toBe(true);
    await page.screenshot({ path: report + '/' + name + '.png', timeout: 60000 });
    return;
  }
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.locator(selector).screenshot({ path: report + '/' + name + '.png', timeout: 60000 });
}
async function release(page: Page) {
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect((await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost)).toHaveLength(1);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.locator('#wrap canvas').count()).toBe(0); expect(browserErrors.get(page)).toEqual([]);
}

test('graph pointer and keyboard inspection match the rendered chest and direction while retaining learning state', async ({ page }) => {
  const inquiry = { signature: JSON.stringify(['adult', 5.5, 0, 5.5, 1]), peak: 'same', release: 'b',
    reviewed: true, peakSeen: true, releaseSeen: true, explanation: 'Equal peak depths can have different release heights.' };
  await mount(page, 1280, { b3dAge: 'adult', b3dDepthLab: { age: 'adult', depth: 5.5, lean: 1, rate: 110,
    motion: 'inspect', phase: 0, hands: true, anatomy: false, measure: true },
    b3dDepthReference: { age: 'adult', depth: 5.5, lean: 0 }, b3dDepthInquiry: inquiry });
  const initialCanvas = await page.locator('#wrap canvas').elementHandle(), initial = await probe(page);
  await expect(plot(page)).toHaveAttribute('tabindex', '0');
  await expect(plot(page)).toHaveAttribute('aria-valuemin', '0'); await expect(plot(page)).toHaveAttribute('aria-valuemax', '100');
  await expect(page.locator('.fr-depth-profile')).toContainText('Chest depression (cm)');
  await expect(page.locator('.fr-depth-scale')).toContainText('0.0'); await expect(page.locator('.fr-depth-scale')).toContainText('7.0');
  await clickPhase(page, 25); await phase(page, 25); await settle(page);
  const down = await probe(page); valid(down); retained(initial.state, down.state);
  expect(down.arrowVisible).toBe(true); expect(down.arrowDirection[1]).toBeLessThan(-.99);
  expect(down.marker[1]).toBeLessThan(initial.marker[1]);
  await clickPhase(page, 75); await phase(page, 75); await settle(page);
  const up = await probe(page); valid(up); retained(initial.state, up.state);
  expect(up.arrowVisible).toBe(true); expect(up.arrowDirection[1]).toBeGreaterThan(.99);
  for (const property of ['marker', 'hands', 'chestScale']) {
    for (let axis = 0; axis < 3; axis++) expect(up[property][axis], property).toBeCloseTo(down[property][axis], 10);
  }
  expect(up.camera).toEqual(down.camera);
  await expect(page.locator('.fr-depth-inspection-note')).toContainText('same height');
  metrics.push({ condition: 'adult-25-down', pose: down }, { condition: 'adult-75-up', pose: up });
  await capture(page, 'adult-graph-releasing'); await capture(page, 'adult-manikin-releasing', '.fr-body3d-stage');
  await clickPhase(page, 50, 'right'); await phase(page, 75); await page.keyboard.press('Escape');
  const start = await graphPoint(page, 50), outsideLeft = await graphPoint(page, -8), outsideRight = await graphPoint(page, 108);
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(outsideLeft.x, outsideLeft.y, { steps: 4 }); await phase(page, 0);
  await page.mouse.move(outsideRight.x, outsideRight.y, { steps: 8 }); await phase(page, 100); await page.mouse.up();
  await plot(page).focus();
  for (const [key, value] of [['Home', 0], ['ArrowRight', 1], ['ArrowUp', 2], ['PageUp', 12], ['ArrowLeft', 11],
    ['ArrowDown', 10], ['PageDown', 0], ['End', 100], ['ArrowRight', 100]] as const) {
    await page.keyboard.press(key); await phase(page, value);
  }
  await settle(page); retained(initial.state, (await probe(page)).state);
  await page.getByRole('button', { name: 'Animate cycle', exact: true }).click();
  await expect(plot(page)).toHaveAttribute('aria-valuenow', '100'); await expect(page.locator('.fr-depth-cursor')).toHaveCount(0);
  await plot(page).focus(); await page.keyboard.press('ArrowLeft'); await phase(page, 99);
  for (const [label, maximum] of [[/^Child —/, '6.5'], [/^Infant —/, '5.5'], [/^Adult —/, '7.0']] as const) {
    await page.getByRole('button', { name: label }).click(); await settle(page);
    await expect(page.locator('.fr-depth-scale')).toContainText(maximum);
    await expect(page.locator('.fr-depth-scale')).toContainText('0.0'); valid(await probe(page));
  }
  expect(await initialCanvas!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  await audit(page); await release(page);
});

test('320px graph inspection remains visible and accessible, and zero travel stays stationary', async ({ page }) => {
  await mount(page, 320, { b3dAge: 'child', b3dChildHands: 'two', b3dDepthLab: {
    age: 'child', depth: 1, lean: 1, rate: 115, motion: 'inspect', phase: 0, hands: true, anatomy: false, measure: true },
    b3dDepthInquiry: { signature: 'preserved-zero-travel-inquiry', explanation: 'No change in height.' } });
  const initial = await probe(page), initialCanvas = await page.locator('#wrap canvas').elementHandle();
  await plot(page).focus(); await page.keyboard.press('Home');
  await expect(plot(page)).toHaveCSS('touch-action', 'pan-y pinch-zoom');
  const touchPoint = await graphPoint(page, 75);
  await page.touchscreen.tap(touchPoint.x, touchPoint.y); await phase(page, 75);
  await page.keyboard.press('Home');
  for (const [key, value] of [['PageUp', 10], ['ArrowRight', 11], ['End', 100], ['Home', 0]] as const) {
    await page.keyboard.press(key); await phase(page, value); await expect(plot(page)).toBeFocused();
  }
  await page.keyboard.press('PageUp'); await page.keyboard.press('PageUp'); await page.keyboard.press('PageUp'); await phase(page, 30);
  await expect.poll(async () => plot(page).evaluate(element => {
    const bounds = element.getBoundingClientRect(), stage = document.querySelector('.fr-body3d-stage')!.getBoundingClientRect();
    return bounds.top >= 0 && bounds.bottom <= innerHeight && bounds.top >= stage.bottom + 8;
  })).toBe(true);
  await settle(page); const still = await probe(page); valid(still); retained(initial.state, still.state);
  expect(still.arrowVisible).toBe(false); expect(still.marker).toEqual(initial.marker);
  expect(still.hands).toEqual(initial.hands); expect(still.chestScale).toEqual(initial.chestScale);
  await expect(page.locator('.fr-depth-inspection-note')).toContainText(/stationary|no movement|does not move/i);
  await expect(plot(page)).toHaveAttribute('aria-valuetext', /stationary|no movement|does not move/i);
  metrics.push({ condition: 'phone-zero-travel', pose: still });
  await capture(page, 'phone-graph-zero-travel'); await audit(page);
  await page.addStyleTag({ content: '.fr-body3d{line-height:1.5!important}.fr-body3d p{margin-bottom:2em!important}.fr-body3d *{letter-spacing:.12em!important;word-spacing:.16em!important}' });
  await plot(page).focus(); await page.keyboard.press('PageUp'); await phase(page, 40); await audit(page);
  await page.emulateMedia({ forcedColors: 'active' });
  await plot(page).focus(); await page.keyboard.press('End'); await phase(page, 100); await audit(page);
  await capture(page, 'phone-graph-forced-colors');
  expect(await initialCanvas!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); });
  await settle(page); await plot(page).focus(); await page.keyboard.press('Home'); await phase(page, 0); await audit(page);
  await settle(page); const contrast = await probe(page); valid(contrast); retained(initial.state, contrast.state);
  expect(contrast.arrowVisible).toBe(false); expect(contrast.marker).toEqual(initial.marker);
  await capture(page, 'phone-graph-app-contrast');
  await expect.poll(async () => initialCanvas!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  await release(page);
});
