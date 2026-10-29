import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-studio-refinement';
const phase = process.env.DINO_STUDIO_PHASE || 'after', baseline = phase === 'before';
const harness = new GlHarness({ toolFile: process.env.DINO_STUDIO_SOURCE || 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 920, appStyles: true,
  probes: 'var R=THREE.WebGLRenderer; THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r); r.render=function(s,c){window.__studioScene=s;window.__studioCamera=c;window.__studioRenderer=r;return render(s,c);};return r;};' });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function settle(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function mount(page: Page, species: string, width = 1180) {
  await page.setViewportSize({ width, height: 920 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', field3dSelected: species, field3dReconstructionMode: 'evidence', field3dAutoRotate: false,
    field3dOrientationDismissed: true, field3dWorkflowStarted: false, field3dShowSkeleton: false, field3dShowBody: true,
    field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: 100 } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__studioScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click(); await settle(page);
}
async function inspect(page: Page) {
  return page.evaluate(() => {
    const w = window as any, scene = w.__studioScene, camera = w.__studioCamera, renderer = w.__studioRenderer;
    const floor = scene.getObjectByName('dinolab-habitat-ground'), model = scene.getObjectByName('dinolab-specimen');
    let meshes = 0, transparentAnatomy = 0;
    model.traverse(part => { if (!part.isMesh || !part.userData.dinoAnatomy) return; meshes++; if (part.material?.transparent && part.material.opacity > 0 && part.material.opacity < .99) transparentAnatomy++; });
    return { model: model.uuid, meshes, transparentAnatomy, mode: scene.userData.dinoStudioLighting, state: w.__toolData.dinoLab,
      floor: { environment: floor.userData.dinoEnvironment, order: floor.renderOrder, transparent: floor.material.transparent,
        depthWrite: floor.material.depthWrite, fog: floor.material.fog, hasMap: !!floor.material.map, surface: floor.material.userData.dinoStudioFloorSurface,
        softShadow: floor.material.userData.dinoStudioFloorShadow, key: floor.material.customProgramCacheKey() },
      contactOrder: scene.getObjectByName('dinolab-contact-shadow')?.renderOrder,
      matrixFinite: [...camera.matrixWorld.elements, ...camera.projectionMatrix.elements].every(Number.isFinite),
      renderCalls: renderer.info.render.calls, shaderFailures: renderer.info.programs.filter(program => program.diagnostics?.runnable === false).length,
      errors: w.__events.errors, lost: w.__glLive().lost, fitsPage: document.documentElement.scrollWidth <= innerWidth };
  });
}
function check(result: Awaited<ReturnType<typeof inspect>>, studio = true) {
  expect(result.errors).toEqual([]); expect(result.lost).toBe(false); expect(result.shaderFailures).toBe(0);
  expect(result.matrixFinite).toBe(true); expect(result.meshes).toBeGreaterThan(10); expect(result.renderCalls).toBeGreaterThan(0);
  expect(result.fitsPage).toBe(true);
  if (studio && !baseline) {
    expect(result.floor.environment).toBe('studio-floor'); expect(result.floor.softShadow).toBe(true);
    expect(result.floor.surface.span).toBeGreaterThan(0); expect(result.floor.transparent).toBe(true);
    expect(result.floor.depthWrite).toBe(false); expect(result.floor.fog).toBe(false); expect(result.floor.hasMap).toBe(false);
    expect(result.floor.order).toBeLessThan(0); expect(result.contactOrder).toBeGreaterThan(result.floor.order);
  } else if (!studio) {
    expect(result.floor.environment).toBe('specimen-clearing'); expect(result.floor.surface).toBeUndefined(); expect(result.floor.softShadow).toBeUndefined();
  }
}
async function photo(page: Page, name: string) { await page.locator('.dinolab-3d-canvas').screenshot({ path: report + '/' + phase + '-' + name + '.png' }); }
async function openControls(page: Page) {
  const summary = page.locator('.dinolab-3d-controls-disclosure > summary');
  if (!(await summary.evaluate(node => node.parentElement!.hasAttribute('open')))) await summary.click();
}

test('studio backdrop and native shadow shaders survive whole, head, side and overhead studies', async ({ page }) => {
  await mount(page, 'tyrannosaurus'); const initial = await inspect(page); check(initial); await photo(page, 'tyrannosaurus-whole');
  await page.getByRole('button', { name: 'Study head details', exact: true }).click(); await settle(page);
  const head = await inspect(page); check(head); expect(head.model).toBe(initial.model); await photo(page, 'tyrannosaurus-head');
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click(); await openControls(page);
  const views: any[] = [];
  for (const view of ['Side', 'Overhead']) {
    await page.getByRole('button', { name: view + ' camera view', exact: true }).click(); await settle(page);
    const current = await inspect(page); check(current); expect(current.model).toBe(initial.model); views.push({ view, ...current });
    await photo(page, 'tyrannosaurus-' + view.toLowerCase());
  }
  fs.writeFileSync(report + '/' + phase + '-desktop-presentation.json', JSON.stringify({ initial, head, views }, null, 2));
});

test('small feathered ghost layers remain visible across mobile studio and habitat changes', async ({ page }) => {
  await mount(page, 'microraptor', 390); await openControls(page);
  await expect(page.getByRole('button', { name: 'Motion reduced', exact: true })).toBeDisabled();
  const initial = await inspect(page); check(initial); await photo(page, 'microraptor-mobile-life');
  await page.locator('.dinolab-surface-presets').getByRole('button', { name: /Body inference/ }).click(); await settle(page);
  const ghost = await inspect(page); check(ghost); expect(ghost.state.field3dShowSkeleton).toBe(true); expect(ghost.state.field3dShowBody).toBe(true);
  expect(ghost.transparentAnatomy).toBeGreaterThan(0); await photo(page, 'microraptor-mobile-ghost');
  const lighting = page.getByRole('group', { name: 'Scene lighting', exact: true });
  await lighting.getByRole('button', { name: 'Habitat', exact: true }).click(); await settle(page); const habitat = await inspect(page); check(habitat, false);
  await lighting.getByRole('button', { name: 'Studio', exact: true }).click(); await settle(page); const returned = await inspect(page); check(returned);
  expect(returned.state.field3dBodyOpacity).toBe(ghost.state.field3dBodyOpacity); expect(returned.transparentAnatomy).toBeGreaterThan(0);
  await page.locator('.dinolab-surface-presets').getByRole('button', { name: /Life view/ }).click(); await settle(page); check(await inspect(page));
  await page.setViewportSize({ width: 320, height: 844 }); await settle(page); const narrow = await inspect(page); check(narrow);
  await photo(page, 'microraptor-320px-life');
  fs.writeFileSync(report + '/' + phase + '-mobile-layer-presentation.json', JSON.stringify({ initial, ghost, habitat, returned, narrow }, null, 2));
});

test('tall sauropod keeps its studio floor and softened shadows through low light and overhead view', async ({ page }) => {
  await mount(page, 'brachiosaurus'); await openControls(page); const initial = await inspect(page); check(initial);
  await page.getByRole('button', { name: 'Surface detail studio lighting', exact: true }).click(); await settle(page);
  const detail = await inspect(page); check(detail); expect(detail.model).toBe(initial.model); await photo(page, 'brachiosaurus-detail-light');
  await page.getByRole('button', { name: 'Overhead camera view', exact: true }).click(); await settle(page); const overhead = await inspect(page); check(overhead);
  await photo(page, 'brachiosaurus-overhead');
  fs.writeFileSync(report + '/' + phase + '-sauropod-presentation.json', JSON.stringify({ initial, detail, overhead }, null, 2));
});
