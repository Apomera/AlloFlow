import { test, expect, type Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { showScaleExplorerTools } from './helpers/scale_explorer_workspace';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off', hasTouch: true });
const out = path.resolve(process.env.SCALE_CRATER_REPORT_DIR || 'reports/scale-explorer-crater');
const canvas = (page: Page) => page.locator('[data-atlas-ready]');
const route = (page: Page) => page.getByRole('region', { name: 'Crater navigation', exact: true });
const study = (page: Page) => page.getByRole('region', { name: 'Chicxulub observatory', exact: true });
const slider = (page: Page) => route(page).getByRole('slider', { name: 'Geological landmark', exact: true });
const ids = ['surface', 'sediment', 'peak-ring', 'impactites', 'melt', 'basement', 'borehole'];
const replacement = (process.env.STEM_GL_SUBSTITUTE || '').split(';').find(value => value.startsWith('stem_lab/stem_tool_scaleexplorer.js='));
const sourceFile = replacement ? replacement.slice(replacement.indexOf('=') + 1) : 'stem_lab/stem_tool_scaleexplorer.js';
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } } as any;
vm.runInNewContext(readFileSync(sourceFile, 'utf8').replace(
  "  window.StemLab.registerTool('scaleExplorer', {",
  "  window.__craterSites = CRATER_SITES;\n  window.StemLab.registerTool('scaleExplorer', {"
), sandbox);
const metadata = JSON.parse(JSON.stringify({ sites: sandbox.window.__craterSites }));
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100,
  layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  probes: `const Original = THREE.WebGLRenderer;
    THREE.WebGLRenderer = new Proxy(Original, { construct(target, args) {
      const renderer = Reflect.construct(target, args), render = renderer.render;
      renderer.render = function(scene, camera) { window.__craterCamera = camera; return render.apply(this, arguments); };
      return renderer;
    }});`
});

function save(name: string, value: unknown) {
  writeFileSync(path.join(out, name + '.json'), JSON.stringify(value, null, 2) + '\n');
}

async function mount(page: Page, phone = false) {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/*', request => {
    const url = request.request().url();
    if (/^https?:/.test(url) && !/^http:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(url)) {
      external.push(url);
      return request.abort();
    }
    return request.continue();
  });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
      return type === 'webgl2' ? null : original.apply(this, [type, ...args] as any);
    };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: phone ? 320 : 1400, height: phone ? 780 : 1100 });
  await harness.mount(page, { _scaleExplorer: { ambient: false } }, '!!document.querySelector("[data-atlas-ready]")');
  await showScaleExplorerTools(page);
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await fly(page, 'chicxulub');
  return { errors, external };
}

async function fly(page: Page, id: string) {
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption(id);
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects', id);
  await expect.poll(() => canvas(page).evaluate((element: HTMLElement) => Math.abs(Number(element.dataset.atlasExponent) - Number(element.dataset.atlasTarget))))
    .toBeLessThan(.002);
}

async function scene(page: Page) {
  return page.evaluate(metadata => {
    const w = window as any, T = w.THREE;
    const record = w.__glRecorder.records.find((record: any) => !record.ctx.isContextLost());
    let root: any;
    record.scene.traverse((object: any) => { if (object.userData.itemId === 'chicxulub') root = object; });
    const model = root.userData.model, crater = model.userData.crater, camera = w.__craterCamera;
    const element = document.querySelector('[data-atlas-ready]') as HTMLElement;
    const detail = element.dataset.atlasDetail || '';
    const point = metadata.sites.find((site: any) => site.id === detail);
    const aim = new T.Vector3().fromArray(element.dataset.atlasAim!.split(',').map(Number));
    const expected = point ? model.localToWorld(new T.Vector3().fromArray(point.at)) : null;
    const bounds = new T.Box3().setFromObject(crater.body);
    return {
      type: record.type, scale: root.scale.x, declaredExtent: model.userData.extent,
      dimension: model.userData.dimension, measureCenter: model.userData.measureCenter,
      width: (bounds.max.x - bounds.min.x) / root.scale.x,
      aligned: camera.getWorldDirection(new T.Vector3()).dot(aim.clone().sub(camera.position).normalize()),
      targetError: expected ? expected.distanceTo(aim) : 0,
      aim: aim.toArray(), cutaway: crater.cutaway, cover: crater.cover.visible,
      inside: crater.inside.visible, cutEdge: crater.cutEdge.visible,
      landmarks: crater.landmarks.map((site: any) => ({ id: site.id, at: site.at })),
      meshes: crater.meshes.map((mesh: any) => ({ geometry: mesh.geometry.uuid, material: mesh.material.uuid, detail: mesh.userData.craterDetailId })),
      stats: crater.stats, detail: crater.detailId, draws: record.draws, renders: record.renders
    };
  }, metadata);
}

async function site(page: Page, number: number) {
  await expect(canvas(page)).toHaveAttribute('data-atlas-crater-site', ids[number - 1]);
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail', ids[number - 1]);
  await expect(canvas(page)).toHaveAttribute('data-atlas-crater-section', number === 1 ? 'closed' : 'open');
  await expect(slider(page)).toHaveValue(String(number));
  await expect.poll(async () => (await scene(page)).aligned).toBeGreaterThan(.99999);
  await expect.poll(async () => (await scene(page)).targetError).toBeLessThan(.0002);
}

async function capture(page: Page, name: string) {
  await canvas(page).scrollIntoViewIfNeeded();
  await page.locator('.sx-stage').screenshot({ path: path.join(out, name + '-stage.png') });
  const pixels = await harness.glPixels(page);
  expect(pixels).not.toBeNull();
  expect(looksBlank(pixels!)).toBe(false);
  writeFileSync(path.join(out, name + '-gl.png'), pixels!.png);
}

async function pickActual(page: Page, wanted: string) {
  await canvas(page).scrollIntoViewIfNeeded();
  const point = await page.evaluate(wanted => {
    const w = window as any, T = w.THREE;
    const record = w.__glRecorder.records.find((record: any) => !record.ctx.isContextLost());
    let root: any;
    record.scene.traverse((object: any) => { if (object.userData.itemId === 'chicxulub') root = object; });
    const model = root.userData.model, camera = w.__craterCamera, ray = new T.Raycaster();
    const element = document.querySelector('[data-atlas-ready]')!, rect = element.getBoundingClientRect();
    const visible = (object: any) => {
      for (let current = object; current; current = current.parent) if (!current.visible) return false;
      return true;
    };
    const hit = (x: number, y: number) => {
      ray.setFromCamera(new T.Vector2((x - rect.x) / rect.width * 2 - 1, 1 - (y - rect.y) / rect.height * 2), camera);
      return ray.intersectObjects(model.children, true).find((hit: any) => hit.object.isMesh && visible(hit.object));
    };
    const targets = model.userData.crater.meshes.filter((mesh: any) => mesh.userData.craterDetailId === wanted && visible(mesh));
    for (const mesh of targets) {
      const positions = mesh.geometry.attributes.position, indices = mesh.geometry.index;
      const count = indices ? indices.count : positions.count, step = Math.max(3, Math.floor(count / 900 / 3) * 3);
      for (let index = 0; index + 2 < count; index += step) {
        const centroid = new T.Vector3();
        for (let corner = 0; corner < 3; corner++) centroid.add(new T.Vector3().fromBufferAttribute(positions, indices ? indices.getX(index + corner) : index + corner));
        const projected = mesh.localToWorld(centroid.multiplyScalar(1 / 3)).project(camera);
        if (Math.abs(projected.x) > .82 || Math.abs(projected.y) > .64 || projected.z >= 1) continue;
        const x = Math.round(rect.x + (projected.x + 1) * rect.width / 2);
        const y = Math.round(rect.y + (1 - projected.y) * rect.height / 2);
        let margin = true;
        for (let dx = -1; dx <= 1 && margin; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (document.elementFromPoint(x + dx, y + dy) !== element || hit(x + dx, y + dy)?.object.userData.craterDetailId !== wanted) {
              margin = false;
              break;
            }
          }
        }
        if (margin) return { x, y, wanted, marginPx: 1 };
      }
    }
    return null;
  }, wanted);
  expect(point, 'an exposed triangle of the actual crater structure').not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
  return point;
}

test.beforeAll(async () => {
  mkdirSync(out, { recursive: true });
  const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
  save('crater-browser-source', {
    checkedAt: new Date().toISOString(), source: sha('stem_lab/stem_tool_scaleexplorer.js'),
    desktop: sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'), substitution: process.env.STEM_GL_SUBSTITUTE || null
  });
  await harness.start();
});
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => {
  await harness.unmount(page);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});

test('buried geology supports native picking, seven inspection views and a fixed comparison width', async ({ page }) => {
  const log = await mount(page), initial = await scene(page);
  expect(initial.type).toBe('webgl');
  expect(initial.stats).toMatchObject({ diameterMeters: 180000, peakRingDiameterMeters: 80000, verticalExaggeration: 15, ringReliefMeters: 400, boreholeDepthMeters: 1334.69 });
  expect(initial.stats.triangles).toBeLessThan(180000);
  expect(initial.declaredExtent).toBe(1);
  expect(initial.dimension).toBe('x');
  expect(initial.measureCenter).toBe(0);
  expect(initial.cutaway).toBe(false);
  expect(initial.cover).toBe(true);
  expect(initial.inside).toBe(false);
  await capture(page, 'crater-desktop-whole');
  await study(page).screenshot({ path: path.join(out, 'crater-desktop-study.png') });
  const entry = page.getByRole('region', { name: 'Enter the buried crater', exact: true });
  const revealEntry = entry.getByRole('button', { name: 'Reveal the buried crater', exact: true });
  expect((await revealEntry.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await revealEntry.click();
  await site(page, 3);
  await expect(entry).toHaveCount(0);
  await route(page).getByRole('button', { name: 'Whole crater', exact: true }).click();
  await expect(entry).toBeVisible();

  const pickedSurface = await pickActual(page, 'surface');
  await site(page, 1);
  const next = route(page).getByRole('button', { name: 'Next layer', exact: true });
  await next.focus();
  await next.press('Enter');
  await site(page, 2);
  await expect(next).toBeFocused();
  const section = await scene(page);
  expect(section.cover).toBe(false);
  expect(section.inside).toBe(true);
  expect(section.cutEdge).toBe(true);
  expect(section.scale).toBe(initial.scale);
  await capture(page, 'crater-desktop-sediment');

  const pickedRing = await pickActual(page, 'peak-ring');
  await site(page, 3);
  await capture(page, 'crater-desktop-peak-ring');
  const views = [await scene(page)];
  for (let number = 4; number <= 7; number++) {
    await slider(page).fill(String(number));
    await site(page, number);
    const view = await scene(page);
    expect(view.cover).toBe(false);
    expect(view.inside).toBe(true);
    expect(view.cutEdge).toBe(true);
    views.push(view);
  }
  await capture(page, 'crater-desktop-borehole');
  const selected = await scene(page);
  expect(selected.meshes).toEqual(initial.meshes);
  expect(selected.landmarks).toEqual(initial.landmarks);
  expect(selected.width).toBeCloseTo(initial.width, 8);

  await route(page).getByRole('button', { name: 'Whole crater', exact: true }).click();
  await expect(route(page)).toHaveCount(0);
  await expect(canvas(page)).toHaveAttribute('data-atlas-crater-section', 'closed');
  const restored = await scene(page);
  expect(restored.cover).toBe(true);
  expect(restored.inside).toBe(false);
  expect(restored.width).toBeCloseTo(initial.width, 8);

  const panel = page.locator('.sx-comparison-workbench');
  if (await panel.getAttribute('open') === null) await panel.locator(':scope > summary').click();
  await panel.getByRole('combobox', { name: 'First thing', exact: true }).selectOption('grand-canyon');
  await panel.getByRole('combobox', { name: 'Second thing', exact: true }).selectOption('chicxulub');
  await panel.getByRole('button', { name: 'Compare them', exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-comparison', 'grand-canyon:chicxulub');
  const compared = await scene(page);
  expect(compared.cutaway).toBe(false);
  expect(compared.cover).toBe(true);
  expect(compared.inside).toBe(false);
  const ratio = await page.evaluate(() => {
    const record = (window as any).__glRecorder.records.find((record: any) => !record.ctx.isContextLost());
    const scales: any = {};
    record.scene.traverse((object: any) => { if (object.userData.itemId && object.visible) scales[object.userData.itemId] = object.scale.x; });
    return scales['grand-canyon'] / scales.chicxulub;
  });
  expect(ratio).toBeCloseTo(446000 / 180000, 8);
  save('crater-desktop', { initial, pickedSurface, pickedRing, section, views, selected, restored, compared, ratio, ...log });
  expect(log.errors).toEqual([]);
  expect(log.external).toEqual([]);
});

test('320 pixel WebGL 1 geology supports touch, route bounds, keyboard navigation and Escape focus', async ({ page }) => {
  const log = await mount(page, true), initial = await scene(page);
  expect(initial.type).toBe('webgl');
  await capture(page, 'crater-phone-whole');
  await study(page).screenshot({ path: path.join(out, 'crater-phone-study.png') });
  const entry = page.getByRole('region', { name: 'Enter the buried crater', exact: true });
  const enter = entry.getByRole('button', { name: 'Reveal the buried crater', exact: true });
  await enter.scrollIntoViewIfNeeded();
  expect((await enter.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await enter.tap();
  await site(page, 3);
  await route(page).getByRole('button', { name: 'Whole crater', exact: true }).tap();
  await expect(entry).toBeVisible();
  const start = study(page).getByRole('button', { name: 'Explore the geology', exact: true });
  await start.scrollIntoViewIfNeeded();
  const box = await start.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
  await start.tap();
  await site(page, 1);
  await slider(page).focus();
  await slider(page).press('ArrowRight');
  await site(page, 2);
  await slider(page).press('End');
  await site(page, 7);
  await expect(route(page).getByRole('button', { name: 'Next layer', exact: true })).toBeDisabled();
  await slider(page).press('Home');
  await site(page, 1);
  await expect(route(page).getByRole('button', { name: 'Previous layer', exact: true })).toBeDisabled();
  for (let number = 2; number <= 7; number++) {
    await slider(page).fill(String(number));
    await site(page, number);
  }
  for (const label of ['Previous layer', 'Next layer', 'Whole crater']) {
    expect((await route(page).getByRole('button', { name: label, exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  expect((await slider(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await capture(page, 'crater-phone-borehole');

  await slider(page).focus();
  await slider(page).press('Escape');
  await expect(route(page)).toHaveCount(0);
  await expect(start).toBeFocused();
  await expect(canvas(page)).toHaveAttribute('data-atlas-crater-section', 'closed');
  await expect(canvas(page)).toHaveAttribute('data-atlas-zoom', '1.00');
  expect((await scene(page)).scale).toBe(initial.scale);

  const reveal = study(page).getByRole('button', { name: 'Reveal the buried crater', exact: true });
  await reveal.scrollIntoViewIfNeeded();
  await reveal.tap();
  await site(page, 3);
  save('crater-phone', { initial, ...log });
  expect(log.errors).toEqual([]);
  expect(log.external).toEqual([]);
});

test('field notebook restores the exact drill site, cutaway and inspection zoom', async ({ page }) => {
  const log = await mount(page);
  const book = page.getByRole('region', { name: 'Field notebook', exact: true });
  await study(page).getByRole('button', { name: 'Visit the drill site', exact: true }).click();
  await site(page, 7);
  const zoom = Number(await canvas(page).getAttribute('data-atlas-zoom'));
  await book.getByRole('textbox', { name: 'What do you notice?', exact: true }).fill('The drill core samples the buried peak ring.');
  await book.getByRole('button', { name: 'Save observation', exact: true }).click();
  const saved = await page.evaluate(() => (window as any).__toolData._scaleExplorer.observations[0]);
  expect(saved).toMatchObject({ itemId: 'chicxulub', detailId: 'borehole', size: 180000, zoom, cutaway: true, note: 'The drill core samples the buried peak ring.' });
  await fly(page, 'earth');
  await book.locator('[data-observation="chicxulub:borehole"]').getByRole('button', { name: /^Return to/ }).click();
  await site(page, 7);
  await expect(canvas(page)).toHaveAttribute('data-atlas-zoom', zoom.toFixed(2));
  await expect(canvas(page)).toHaveAttribute('data-atlas-crater-section', 'open');
  await expect(book.getByRole('textbox')).toHaveValue('The drill core samples the buried peak ring.');
  await expect(page.locator('.sx-details').getByRole('link', { name: 'Read the science source', exact: true })).toHaveAttribute('href', /^https:\/\//);
  await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail', '');
  await expect(route(page)).toHaveCount(0);
  save('crater-notebook', { saved, ...log });
  expect(log.errors).toEqual([]);
  expect(log.external).toEqual([]);
});
