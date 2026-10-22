import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document',
  probes: `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round14Lighting={scene,camera,renderer};return render(scene,camera);};return renderer;};})();`,
});

test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function call(page: Page, method: string, value?: unknown): Promise<any> {
  return page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any, input) => canvas._birdlab3d[input.method](input.value), { method, value });
}
async function step(page: Page, frames = 1, ms = 25) {
  await page.evaluate(({ frames, ms }) => { for (let index = 0; index < frames; index++) (window as any).round14LightingStep(ms); }, { frames, ms });
}
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((element: HTMLElement, width) => {
    element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true');
  }, host);
  await page.waitForTimeout(80); await step(page, 2);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    let time = 1000, next = 1;
    const pending = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = callback => { const id = next++; pending.set(id, callback); return id; };
    window.cancelAnimationFrame = id => { pending.delete(id); };
    (window as any).round14LightingStep = (ms: number) => { time += ms; const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(time)); };
  });
  await harness.mount(page, { birdLab: { view: 'observatory3d' } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d", null, { polling: 50, timeout: 60_000 });
  await page.waitForFunction('!!window.round14Lighting', null, { polling: 50, timeout: 60_000 });
  await sizing(page, 1280, 1100); await call(page, 'seek', 7.375); await step(page);
}
function frozen(before: any, after: any) {
  for (const key of ['time', 'paused', 'speed', 'position', 'orientation', 'pose', 'sightings', 'wildlife', 'animals', 'fieldVisitTime', 'camera', 'cameraPosition', 'cameraTarget', 'fieldOfView']) expect(after[key], key).toEqual(before[key]);
}
function closePoint(actual: number[], expected: number[], tolerance = .0001) {
  return actual.length === expected.length && actual.every((value, axis) => Number.isFinite(value) && Math.abs(value - expected[axis]) <= tolerance);
}
function direction(azimuth: number, elevation: number) {
  const a = azimuth * Math.PI / 180, e = elevation * Math.PI / 180;
  return [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)];
}
async function resources(page: Page) {
  return page.evaluate(() => {
    const { scene } = (window as any).round14Lighting, geometries = new Set<string>(), materials = new Set<string>(), textures = new Set<string>();
    scene.traverse((object: any) => {
      if (object.geometry) geometries.add(object.geometry.uuid);
      (Array.isArray(object.material) ? object.material : object.material ? [object.material] : []).forEach((material: any) => {
        materials.add(material.uuid);
        Object.values(material).forEach((value: any) => { if (value?.isTexture) textures.add(value.uuid); });
        Object.values(material.uniforms || {}).forEach((entry: any) => { if (entry.value?.isTexture) textures.add(entry.value.uuid); });
      });
    });
    return { objects: scene.children.map((object: any) => object.uuid).sort(), geometries: [...geometries].sort(), materials: [...materials].sort(), textures: [...textures].sort() };
  });
}
async function nativeDrawing(page: Page): Promise<any> {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round14Lighting;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const sun = scene.getObjectByName('birdlab-key-sun'), sky = scene.getObjectByName('birdlab-sky');
    const sunward = sun.getWorldPosition(new T.Vector3()).sub(sun.target.getWorldPosition(new T.Vector3())).normalize();
    const color = (value: any) => value?.isColor ? value.toArray() : null;
    const palette = { lights: scene.children.filter((object: any) => object.isLight).map((light: any) => ({ name: light.name, uuid: light.uuid, color: color(light.color), groundColor: color(light.groundColor), intensity: light.intensity, otherPosition: light === sun ? null : light.position.toArray() })),
      background: color(scene.background), fog: { color: color(scene.fog?.color), density: scene.fog?.density }, exposure: renderer.toneMappingExposure,
      sky: Object.fromEntries(Object.entries(sky.material.uniforms).filter(([name]) => name !== 'sunDirection').map(([name, entry]: [string, any]) => [name, entry.value?.isColor ? entry.value.toArray() : entry.value?.isVector2 ? entry.value.toArray() : entry.value?.isTexture ? entry.value.uuid : entry.value])) };
    function chart(plane: string) {
      const svg = document.querySelector('[data-light-plane="' + plane + '"]') as SVGSVGElement;
      return { plane, viewBox: svg.getAttribute('viewBox'), vectors: [...svg.querySelectorAll('[data-light-vector]')].map(node => {
        const line = node as SVGLineElement;
        return { name: line.getAttribute('data-light-vector'), endpoints: [line.x1.baseVal.value, line.y1.baseVal.value, line.x2.baseVal.value, line.y2.baseVal.value], stroke: getComputedStyle(line).stroke };
      }) };
    }
    return { directional: !!sun.isDirectionalLight, sunward: sunward.toArray(), skyDirection: sky.material.uniforms.sunDirection.value.toArray(), palette,
      charts: ['plan', 'elevation'].map(chart), metrics: Object.fromEntries(['azimuth', 'elevation'].map(name => [name, document.querySelector('[data-light-value="' + name + '"]')!.textContent])),
      live: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls, shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  });
}
async function agrees(page: Page): Promise<any> {
  await expect(page.locator('[data-birdlab-light-study]')).toBeVisible(); await step(page);
  const state = await call(page, 'getState'), drawing = await nativeDrawing(page), study = state.lightInvestigation;
  expect(state.lightStudy).toBe(true); expect(study).not.toBeNull(); expect(drawing.directional).toBe(true); expect(drawing.live).toBe(true); expect(drawing.calls).toBeGreaterThan(0); expect(drawing.shaders).toBe(true);
  expect(study.palette).toBe(state.lighting); expect(closePoint(study.direction, direction(study.azimuth, study.elevation))).toBe(true);
  expect(closePoint(study.direction, drawing.sunward)).toBe(true); expect(closePoint(study.direction, drawing.skyDirection)).toBe(true); expect(Math.hypot(...study.direction)).toBeCloseTo(1, 8);
  const actualAzimuth = Math.atan2(drawing.sunward[0], drawing.sunward[2]) * 180 / Math.PI, actualElevation = Math.asin(drawing.sunward[1]) * 180 / Math.PI;
  expect(Math.abs(study.azimuth - actualAzimuth)).toBeLessThan(.00001); expect(study.elevation).toBeCloseTo(actualElevation, 7);
  for (const name of ['azimuth', 'elevation']) {
    const displayed = Number((drawing.metrics[name].replace(/−/g, '-').match(/[+-]?\d+(?:\.\d+)?/) || [NaN])[0]);
    expect(Math.abs(displayed - study[name]), name + ' displayed degrees').toBeLessThan(.11);
  }
  for (const chart of drawing.charts) {
    expect(chart.viewBox).toBe('0 0 420 280'); expect(chart.vectors).toHaveLength(study.pinned ? 2 : 1);
    for (const vector of chart.vectors) {
      const condition = vector.name === 'current' ? study : study.pinned, e = condition.elevation * Math.PI / 180;
      const expected = chart.plane === 'plan' ? [210, 140, 210 + 90 * condition.direction[0], 140 + 90 * condition.direction[2]] : [210, 140, 210 + 90 * Math.cos(e), 140 - 90 * Math.sin(e)];
      // Native SVGAnimatedLength coordinates use browser Float32 values.
      expect(closePoint(vector.endpoints, expected), chart.plane + ':' + vector.name).toBe(true); expect(vector.stroke).not.toBe('none');
    }
  }
  return { state, drawing };
}
async function birdShading(page: Page): Promise<any> {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round14Lighting;
    const controller = (document.querySelector('[data-birdlab-3d-canvas]') as any)._birdlab3d, saved = controller.getState(), bird = scene.getObjectByName('birdlab-red-tailed-hawk');
    const visibility = scene.children.map((object: any) => ({ object, visible: object.visible })), background = scene.background, fog = scene.fog;
    const gl = renderer.getContext(), width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
    function read(azimuth: number, elevation: number) {
      controller.setLightDirection({ azimuth, elevation }); renderer.render(scene, camera);
      const pixels = new Uint8Array(width * height * 4); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels); return pixels;
    }
    try {
      // Remove the sky and habitat so their sun shader and shadows cannot
      // produce a false pass: only the existing bird and real lights remain.
      visibility.forEach(({ object }: any) => { object.visible = object === bird || !!object.isLight; }); scene.background = new T.Color(0); scene.fog = null;
      const a = read(-110, 20), b = read(70, 70); let birdPixels = 0, changed = 0, totalDelta = 0;
      for (let index = 0; index < a.length; index += 4) {
        if (a[index] + a[index + 1] + a[index + 2] < 12 && b[index] + b[index + 1] + b[index + 2] < 12) continue;
        birdPixels++; const delta = Math.abs(a[index] - b[index]) + Math.abs(a[index + 1] - b[index + 1]) + Math.abs(a[index + 2] - b[index + 2]); totalDelta += delta; if (delta > 18) changed++;
      }
      return { width, height, birdPixels, changed, changedFraction: changed / Math.max(1, birdPixels), meanDelta: totalDelta / Math.max(1, birdPixels) };
    } finally {
      visibility.forEach(({ object, visible }: any) => { object.visible = visible; }); scene.background = background; scene.fog = fog;
      if (saved.lightingDirectionCustom) controller.setLightDirection({ azimuth: saved.lightInvestigation.azimuth, elevation: saved.lightInvestigation.elevation }); else controller.setLighting(saved.lighting);
      renderer.render(scene, camera);
    }
  });
}

test('the actual directional sun, sky and native plots agree while camera, pose and clocks stay frozen; pins, modes and isolated bird shading remain coherent', async ({ page }) => {
  await mount(page); const baseline = await resources(page), before = await call(page, 'getState');
  await call(page, 'setLightStudy', true); let current = await agrees(page); frozen(before, current.state);
  expect(current.state.paused).toBe(true); expect(current.state.repeatFlights).toBe(false); expect(current.state.courseLens).toBe(false); expect(current.state.attitudeLens).toBe(false); expect(current.state.studyOverlay).toBe(false); expect(current.state.wingbeatStudy).toBeNull(); expect(current.state.lightingDirectionCustom).toBe(false);
  const palette = current.drawing.palette;
  for (const value of [{ azimuth: -180, elevation: 5 }, { azimuth: 180, elevation: 85 }, { azimuth: 37, elevation: 32 }, { azimuth: -73, elevation: 61 }]) {
    const still = current.state; await call(page, 'setLightDirection', value); current = await agrees(page); frozen(still, current.state); expect(current.state.lightingDirectionCustom).toBe(true); expect(current.state.lightInvestigation.azimuth).toBeCloseTo(value.azimuth, 7); expect(current.state.lightInvestigation.elevation).toBeCloseTo(value.elevation, 7); expect(current.drawing.palette).toEqual(palette);
    await expect(page.getByRole('button', { name: 'Daylight', exact: true })).toHaveAttribute('aria-pressed', 'false'); await expect(page.getByRole('button', { name: 'Golden hour', exact: true })).toHaveAttribute('aria-pressed', 'false');
  }
  await call(page, 'pinLightDirection'); const pinned = (await agrees(page)).state.lightInvestigation.pinned;
  expect(pinned.azimuth).toBeCloseTo(-73, 7); expect(pinned.elevation).toBeCloseTo(61, 7); expect(closePoint(pinned.direction, direction(-73, 61), 1e-9)).toBe(true);
  await call(page, 'setLightDirection', { azimuth: 55, elevation: 18 }); current = await agrees(page); expect(current.state.lightInvestigation.pinned).toEqual(pinned);
  const snapshot = current.state.lightInvestigation;
  await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => { const copy = canvas._birdlab3d.getState().lightInvestigation; copy.direction.fill(999); copy.pinned.direction.fill(999); copy.azimuth = 999; copy.pinned.elevation = 999; });
  expect((await call(page, 'getState')).lightInvestigation).toEqual(snapshot);
  const beforePalette = current.state; await call(page, 'setLighting', 'golden'); current = await agrees(page); frozen(beforePalette, current.state); expect(current.state.lightingDirectionCustom).toBe(false); expect(current.state.lightInvestigation.pinned).toEqual(pinned);
  await expect(page.getByRole('button', { name: 'Golden hour', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const golden = [-30, 16, 25], length = Math.hypot(...golden); expect(closePoint(current.drawing.sunward, golden.map(value => value / length))).toBe(true);
  const goldenPalette = current.drawing.palette; await call(page, 'restoreLightDirection'); current = await agrees(page); expect(closePoint(current.state.lightInvestigation.direction, pinned.direction, 1e-9)).toBe(true); expect(current.drawing.palette).toEqual(goldenPalette); expect(current.state.lightingDirectionCustom).toBe(true);
  const beforePaint = current.state, paint = await birdShading(page); expect(paint.birdPixels).toBeGreaterThan(200); expect(paint.changedFraction, 'actual bird pixels respond without the sky or habitat present').toBeGreaterThan(.05); expect(paint.meanDelta).toBeGreaterThan(2); current = await agrees(page); frozen(beforePaint, current.state); expect(current.state.lightInvestigation.azimuth).toBeCloseTo(beforePaint.lightInvestigation.azimuth, 7); expect(current.state.lightInvestigation.elevation).toBeCloseTo(beforePaint.lightInvestigation.elevation, 7); expect(closePoint(current.state.lightInvestigation.direction, beforePaint.lightInvestigation.direction, 1e-9)).toBe(true); expect(current.state.lightInvestigation.pinned).toEqual(beforePaint.lightInvestigation.pinned); expect(current.state.lightInvestigation.palette).toBe(beforePaint.lightInvestigation.palette);
  expect(await resources(page), 'the workbench adds no scene objects, geometries, materials or textures').toEqual(baseline);
  const still = current.state; await step(page, 3, 60_000); frozen(still, await call(page, 'getState'));
  await call(page, 'setCamera', 'robin'); expect((await call(page, 'getState')).lightStudy).toBe(true); expect((await call(page, 'getState')).lightInvestigation).toBeNull(); await expect(page.locator('[data-birdlab-light-study]')).toHaveCount(0);
  await call(page, 'setCamera', 'orbit'); current = await agrees(page); expect(current.state.lightInvestigation.pinned).toEqual(pinned); expect(closePoint(current.state.lightInvestigation.direction, pinned.direction, 1e-9)).toBe(true);
  await call(page, 'setMode', 'free'); expect((await call(page, 'getState')).lightStudy).toBe(true); expect((await call(page, 'getState')).lightInvestigation).toBeNull(); await expect(page.locator('[data-birdlab-light-study]')).toHaveCount(0);
  await call(page, 'setMode', 'guided'); current = await agrees(page); expect(current.state.lightInvestigation.pinned).toEqual(pinned); expect(closePoint(current.state.lightInvestigation.direction, pinned.direction, 1e-9)).toBe(true);
  for (const other of ['setCourseLens', 'setAttitudeLens']) {
    await call(page, other, true); expect((await call(page, 'getState')).lightStudy).toBe(false); expect((await call(page, 'getState')).lightInvestigation).toBeNull();
    await call(page, 'setLightStudy', true); current = await agrees(page); expect(current.state.courseLens).toBe(false); expect(current.state.attitudeLens).toBe(false); expect(current.state.lightInvestigation.pinned).toEqual(pinned);
  }
  await call(page, 'seek', 4.2); await call(page, 'inspectWingbeat'); expect((await call(page, 'getState')).lightStudy).toBe(false); expect((await call(page, 'getState')).lightInvestigation).toBeNull();
  await call(page, 'setLightStudy', true); current = await agrees(page); expect(current.state.wingbeatStudy).toBeNull(); expect(current.state.lightInvestigation.pinned).toEqual(pinned);
  await call(page, 'clearLightDirection'); current = await agrees(page); expect(current.state.lightInvestigation.pinned).toBeNull(); const unpinned = current.state.lightInvestigation; await call(page, 'restoreLightDirection'); expect((await call(page, 'getState')).lightInvestigation).toEqual(unpinned);
  await call(page, 'setLightStudy', false); expect((await call(page, 'getState')).lightStudy).toBe(false); expect((await call(page, 'getState')).lightInvestigation).toBeNull();
});

test('manual lighting controls and shared direction diagrams remain keyboard accessible, readable and contained at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    const toggle = page.locator('[data-birdlab-light-toggle]'); await toggle.focus(); await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    for (const name of ['azimuth', 'elevation']) {
      const input = page.locator('#birdlab-light-' + name); await input.focus(); await page.keyboard.press('Home'); const value = Number(await input.inputValue()); await page.keyboard.press('ArrowRight'); expect(Number(await input.inputValue())).toBeGreaterThan(value); await expect(input).toBeFocused(); await agrees(page);
    }
    const pin = page.locator('[data-light-pin]'); await pin.focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-light-vector="pinned"]')).toHaveCount(2);
    const savedPin = (await call(page, 'getState')).lightInvestigation.pinned;
    const directions: Record<string, { azimuth: number; elevation: number }> = { high: { azimuth: -45, elevation: 70 }, side: { azimuth: 90, elevation: 35 }, raking: { azimuth: -120, elevation: 12 } };
    for (const preset of ['high', 'side', 'raking']) {
      const button = page.locator('[data-light-preset="' + preset + '"]'); await button.focus(); await page.keyboard.press('Enter'); await expect(button).toBeFocused(); const current = await agrees(page); expect(current.state.lightInvestigation.pinned).toEqual(savedPin); expect(current.state.paused).toBe(true); expect(current.state.lightInvestigation.azimuth).toBeCloseTo(directions[preset].azimuth, 7); expect(current.state.lightInvestigation.elevation).toBeCloseTo(directions[preset].elevation, 7);
    }
    const restore = page.locator('[data-light-restore]'); await restore.focus(); await page.keyboard.press('Enter'); expect((await agrees(page)).state.lightInvestigation.pinned).toEqual(savedPin); expect(closePoint((await call(page, 'getState')).lightInvestigation.direction, savedPin.direction, 1e-9)).toBe(true);
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-birdlab-light-study]', '[data-light-plane="plan"]', '[data-light-plane="elevation"]', '#birdlab-light-azimuth', '#birdlab-light-elevation', '[data-light-pin]', '[data-light-restore]', '[data-light-clear]']) {
      const node = page.locator(selector), box = (await node.boundingBox())!; expect(box.width, selector).toBeGreaterThan(0); expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const plane of ['plan', 'elevation']) expect((await page.locator('[data-light-plane="' + plane + '"]').boundingBox())!.width, plane + ' readable width').toBeGreaterThan(280);
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-birdlab-light-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return result.violations.map((violation: any) => ({ id: violation.id, nodes: violation.nodes.map((node: any) => node.target) }));
    });
    expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const clear = page.locator('[data-light-clear]'); await clear.focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-light-vector="pinned"]')).toHaveCount(0);
    await toggle.focus(); await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-pressed', 'false'); await expect(page.locator('[data-birdlab-light-study]')).toHaveCount(0);
  }
});
