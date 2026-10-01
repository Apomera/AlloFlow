import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// Exercise the working-tree renderer through the local, real-WebGL harness.
test.describe.configure({ mode: 'serial', timeout: 240_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const report = path.resolve(process.env.DINO_HABITAT_REPORT || 'reports/dinolab-habitat-landscape');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab',
  width: 1180, height: 920, appStyles: true,
  probes: [
    'var habitatNativeNow = performance.now.bind(performance); window.__habitatNow = 10000;',
    'performance.now = function() { return window.__habitatNow == null ? habitatNativeNow() : window.__habitatNow; };',
    'var HabitatRenderer = THREE.WebGLRenderer;',
    'THREE.WebGLRenderer = function(options) { var renderer = new HabitatRenderer(options), render = renderer.render.bind(renderer);',
    'renderer.render = function(scene,camera) { window.__habitatScene=scene; window.__habitatRenderer=renderer; window.__habitatCamera=camera; window.__habitatFrames=(window.__habitatFrames||0)+1; return render(scene,camera); }; return renderer; };'
  ].join('\n')
});

test.beforeAll(async () => {
  fs.mkdirSync(report, { recursive: true });
  await harness.start();
});
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function tick(page: Page, ms: number, steps = 1) {
  await page.evaluate(async ({ ms, steps }) => {
    for (let i = 0; i < steps; i++) {
      (window as any).__habitatNow += ms / steps;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }
  }, { ms, steps });
}

async function mount(page: Page, species: string) {
  await page.setViewportSize({ width: 1180, height: 920 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: {
    tab: 'field3d', field3dSelected: species, field3dStage: 'habitat',
    field3dAutoRotate: false, field3dOrientationDismissed: true,
    field3dShowSkeleton: false, field3dShowBody: true,
    field3dShowHuman: false, field3dShowEvidence: false,
    field3dBodyOpacity: 100, field3dLabelMode: 'off'
  } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8');
  const start = css.indexOf(':root, .theme-default {');
  const end = css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: css.slice(start, end) });
  await page.evaluate(() => {
    document.body.className = 'theme-default';
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block';
  });
  await expect.poll(() => page.evaluate(() => !!(window as any).__habitatScene?.getObjectByName('dinolab-habitat-landscape'))).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
  await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  await tick(page, 0);
}

async function inspect(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, scene = w.__habitatScene;
    const camera = w.__habitatCamera, renderer = w.__habitatRenderer;
    const landscape = scene.getObjectByName('dinolab-habitat-landscape');
    const model = scene.getObjectByName('dinolab-specimen');
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    let invalid = 0, environmentMeshes = 0, ridges = 0, plants = 0;
    let anatomicalVertices = 0, outside = 0;
    const tags: string[] = [];
    landscape?.traverse((object: any) => {
      const tag = [object.name, object.userData?.dinoEnvironment || ''].join(' ').toLowerCase();
      if (/ridge|hill|mountain/.test(tag)) ridges++;
      if (/fern|cycad|conifer|tree|plant|vegetation/.test(tag)) plants++;
      if (object.userData?.dinoEnvironment) tags.push(String(object.userData.dinoEnvironment));
      if (!object.isMesh) return;
      environmentMeshes++;
      for (const attributeName of ['position', 'normal', 'uv']) {
        const attribute = object.geometry?.attributes?.[attributeName];
        if (attribute && !Array.from(attribute.array as ArrayLike<number>).every(Number.isFinite)) invalid++;
      }
      if (![...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray()].every(Number.isFinite)) invalid++;
    });
    model.traverse((object: any) => {
      if (!object.isMesh || !object.userData?.dinoAnatomy || !object.visible) return;
      const positions = object.geometry?.attributes?.position;
      if (!positions) return;
      for (let i = 0; i < positions.count; i++) {
        const point = new T.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).project(camera);
        anatomicalVertices++;
        if (![point.x, point.y, point.z].every(Number.isFinite)) invalid++;
        if (Math.abs(point.x) > 1.001 || Math.abs(point.y) > 1.001 || Math.abs(point.z) > 1.001) outside++;
      }
    });
    const water = scene.getObjectByName('dinolab-habitat-water');
    const bank = scene.getObjectByName('dinolab-water-bank');
    const ripple = scene.getObjectByName('dinolab-ripple-surface');
    const material = Array.isArray(ripple?.material) ? ripple.material[0] : ripple?.material;
    const waterNormals = ripple?.geometry?.attributes?.normal;
    let minWaterNormalY: number | null = null;
    if (waterNormals) {
      minWaterNormalY = 1;
      for (let i = 0; i < waterNormals.count; i++) {
        if (![waterNormals.getX(i), waterNormals.getY(i), waterNormals.getZ(i)].every(Number.isFinite)) invalid++;
        minWaterNormalY = Math.min(minWaterNormalY, waterNormals.getY(i));
      }
    }
    const environmentMaterials: any[] = [];
    scene.traverse((object: any) => {
      if (!object.material || !object.userData?.dinoEnvironment) return;
      const m = object.material;
      environmentMaterials.push({ name: object.name, color: m.color?.toArray(), vertexColors: m.vertexColors, map: !!m.map });
    });
    return {
      revision: T.REVISION, environmentMaterials,
      landscape: !!landscape, environmentMeshes, ridges, plants, tags: [...new Set(tags)],
      water: !!water, bank: !!bank, ripple: !!ripple, normalMap: !!material?.normalMap, minWaterNormalY,
      invalid, anatomicalVertices, outside,
      lost: w.__glLive().lost, errors: w.__events.errors,
      shaderFailures: renderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length
    };
  });
}

function verifyScene(result: Awaited<ReturnType<typeof inspect>>) {
  expect(result.landscape).toBe(true);
  expect(result.environmentMeshes).toBeGreaterThan(0);
  expect(result.ridges).toBeGreaterThan(0);
  expect(result.plants).toBeGreaterThan(0);
  expect(result.anatomicalVertices).toBeGreaterThan(0);
  expect(result.invalid).toBe(0);
  expect(result.outside).toBe(0);
  expect(result.errors).toEqual([]);
  expect(result.lost).toBe(false);
  expect(result.shaderFailures).toBe(0);
}

for (const [species, hasWater] of [
  ['spinosaurus', true], ['archaeopteryx', true],
  ['velociraptor', false], ['brachiosaurus', false]
] as const) {
  test(species + ' habitat has a finite landscape, clear specimen, and responsive framing', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('pageerror', error => browserErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && /shader|webglprogram|validate_status/i.test(message.text())) browserErrors.push(message.text());
    });
    await mount(page, species);
    const desktop = await inspect(page);
    verifyScene(desktop);
    expect(desktop.water).toBe(hasWater);
    expect(desktop.ripple).toBe(hasWater);
    expect(desktop.bank).toBe(hasWater);
    if (hasWater) { expect(desktop.normalMap).toBe(true); expect(desktop.minWaterNormalY).toBeGreaterThan(.99); }
    await page.locator('.dinolab-3d-canvas').screenshot({ path: path.join(report!, species + '-habitat-desktop.png') });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
    await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
    await tick(page, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const mobile = await inspect(page);
    verifyScene(mobile);
    await page.locator('.dinolab-3d-canvas').screenshot({ path: path.join(report!, species + '-habitat-mobile.png') });
    expect(browserErrors).toEqual([]);
    fs.writeFileSync(path.join(report!, species + '-habitat-metrics.json'), JSON.stringify({ desktop, mobile, browserErrors }, null, 2));

    if (species === 'spinosaurus') {
      await page.evaluate(() => { (window as any).__habitatRendererBeforeStudio = (window as any).__habitatRenderer; });
      await page.getByRole('button', { name: 'Studio', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__toolData.dinoLab.field3dStage)).toBe('studio');
      await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
      await tick(page, 0);
      await expect.poll(() => page.evaluate(() => !(window as any).__habitatScene.getObjectByName('dinolab-habitat-landscape'))).toBe(true);
      expect(await page.evaluate(() => {
        const w = window as any;
        return {
          rendererPreserved: w.__habitatRenderer === w.__habitatRendererBeforeStudio,
          water: !!w.__habitatScene.getObjectByName('dinolab-habitat-water'),
          bank: !!w.__habitatScene.getObjectByName('dinolab-water-bank'),
          ripple: !!w.__habitatScene.getObjectByName('dinolab-ripple-surface'),
          errors: w.__events.errors, lost: w.__glLive().lost
        };
      })).toEqual({ rendererPreserved: true, water: false, bank: false, ripple: false, errors: [], lost: false });
      expect(browserErrors).toEqual([]);
    }
  });
}

async function rippleState(page: Page) {
  return page.evaluate(() => {
    const w = window as any, ripple = w.__habitatScene.getObjectByName('dinolab-ripple-surface');
    const material = Array.isArray(ripple?.material) ? ripple.material[0] : ripple?.material;
    return { rendererPreserved: !w.__habitatMotionRenderer || w.__habitatRenderer === w.__habitatMotionRenderer, surface: ripple?.uuid,
      texture: material?.normalMap?.uuid, offset: material?.normalMap?.offset?.toArray() };
  });
}

test('water ripples respond to reduced motion and pause without replacing the surface', async ({ page }) => {
  await mount(page, 'spinosaurus');
  await page.evaluate(() => { (window as any).__habitatMotionRenderer = (window as any).__habitatRenderer; });
  await expect(page.getByRole('button', { name: 'Motion reduced', exact: true })).toBeDisabled();
  const initial = await rippleState(page);
  expect(initial.offset).toHaveLength(2);
  await tick(page, 5000, 5);
  expect(await rippleState(page)).toEqual(initial);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.getByRole('button', { name: 'Pause motion', exact: true })).toBeEnabled();
  await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  await tick(page, 0); await tick(page, 400, 8);
  const moving = await rippleState(page);
  expect(moving.offset).not.toEqual(initial.offset);
  expect(moving.surface).toBe(initial.surface); expect(moving.texture).toBe(initial.texture);

  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume motion', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  await tick(page, 0);
  const paused = await rippleState(page);
  await tick(page, 60000, 5);
  expect(await rippleState(page)).toEqual(paused);

  await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
  await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  await tick(page, 0); await tick(page, 200, 4);
  const resumed = await rippleState(page);
  expect(resumed.offset).not.toEqual(paused.offset);
  expect(resumed.surface).toBe(initial.surface);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Motion reduced', exact: true })).toBeDisabled();
  await tick(page, 0);
  const reduced = await rippleState(page);
  await tick(page, 30000, 5);
  expect(await rippleState(page)).toEqual(reduced);
  verifyScene(await inspect(page));
  await page.evaluate(() => {
    const w = window as any, surface = w.__habitatScene.getObjectByName('dinolab-ripple-surface');
    const material = Array.isArray(surface.material) ? surface.material[0] : surface.material;
    w.__habitatNormalDisposals = 0;
    material.normalMap.addEventListener('dispose', () => { w.__habitatNormalDisposals++; });
  });
  // The harness documents destroy() as safe when nothing is mounted; afterEach
  // therefore remains valid after this explicit resource-lifecycle assertion.
  await harness.destroy(page);
  const normalDisposals = await page.evaluate(() => (window as any).__habitatNormalDisposals);
  expect(normalDisposals).toBeGreaterThanOrEqual(1);
  fs.writeFileSync(path.join(report!, 'habitat-water-motion.json'), JSON.stringify({ initial, moving, paused, resumed, reduced, normalDisposals }, null, 2));
});
