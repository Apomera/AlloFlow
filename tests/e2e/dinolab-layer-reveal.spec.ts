import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0, mode: 'serial' });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-layer-reveal';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.__revealIdentity=(window.__revealRendererCount||0)+1;window.__revealRendererCount=r.__revealIdentity;r.render=function(s,c){window.__revealScene=s;window.__revealCamera=c;window.__revealRenderer=r;return draw(s,c);};return r;};' });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const canvas = (page: Page) => page.locator('canvas.dinolab-3d-canvas');
const notice = (page: Page) => page.locator('.dinolab-part-visibility-notice');
const summary = (page: Page) => page.locator('.dinolab-selected-part-summary');
async function settle(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function showCanvas(page: Page) { await canvas(page).scrollIntoViewIfNeeded(); await settle(page); }
async function mount(page: Page, species: string, width: number, layers: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: width < 500 ? 844 : 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: species, field3dSelected: species, field3dStage: 'studio', field3dReconstructionMode: 'evidence',
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: false, field3dShowSkeleton: false,
    field3dShowBody: true, field3dShowHuman: true, field3dShowEvidence: false, field3dBodyOpacity: 100, ...layers } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__revealScene?.getObjectByName('dinolab-specimen')), { timeout: 120_000 }).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
  await page.getByRole('button', { name: 'Body-part labels', exact: true }).click();
}
async function select(page: Page, part: string) {
  await page.locator('#dinolab-part-picker').selectOption(part); await showCanvas(page);
  await expect.poll(() => page.evaluate(() => (window as any).__revealScene.getObjectByName('dinolab-specimen').rotation.y)).toBe(0);
  await settle(page);
}
async function preferencesAndFilter(page: Page, category: string, query: string) {
  await page.getByRole('checkbox', { name: 'Show scientific names', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Focus selected label', exact: true }).check();
  const key = page.locator('#dinolab-body-part-key');
  if (!(await key.evaluate(node => (node as HTMLDetailsElement).open))) await key.locator(':scope > summary').click();
  await page.getByRole('group', { name: 'Body-part categories', exact: true }).getByRole('button', { name: category, exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search body parts', exact: true }).fill(query); await showCanvas(page);
}
async function configureLayers(page: Page, patch: Record<string, unknown>) {
  // Set up unusual layer combinations directly; the reveal action itself is
  // always exercised with its native, keyboard-accessible UI control.
  const old = await page.evaluate(() => (window as any).__revealScene.getObjectByName('dinolab-specimen').uuid);
  await page.evaluate(patch => (window as any).__ctx.updateMulti('dinoLab', patch), patch); await showCanvas(page);
  await expect.poll(() => page.evaluate(() => (window as any).__revealScene.getObjectByName('dinolab-specimen').uuid)).not.toBe(old);
  await settle(page);
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, renderer = w.__revealRenderer, camera = w.__revealCamera, model = w.__revealScene.getObjectByName('dinolab-specimen'), state = w.__toolData.dinoLab;
    const selected = (document.querySelector('#dinolab-part-picker') as HTMLSelectElement)?.value;
    const overlay = document.querySelector('.dinolab-body-label-overlay') as HTMLElement;
    const group = document.querySelector('[data-dino-part-line="' + selected + '"]'), ring = group?.querySelector('[data-dino-part-ring]');
    const marker = ring && getComputedStyle(overlay).display !== 'none' && getComputedStyle(group!).display !== 'none' ? [Number(ring.getAttribute('cx')), Number(ring.getAttribute('cy'))] : null;
    const labels = Array.from(document.querySelectorAll<HTMLElement>('[data-dino-part-label]')).filter(node => getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden');
    const lungs: any[] = [], geometries = new Set<string>();
    model.traverse((node: any) => {
      if (node.isMesh && node.geometry) geometries.add(node.geometry.uuid);
      if (node.userData.dinoFeature !== 'lung-proxy') return;
      let visible = true; for (let parent = node; parent; parent = parent.parent) if (!parent.visible) visible = false;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      lungs.push({ visible: visible && materials.some((mat: any) => mat.visible && mat.opacity > 0), materials: materials.map((mat: any) => ({ visible: mat.visible, opacity: mat.opacity, transparent: mat.transparent })) });
    });
    const strip = document.querySelector('.dinolab-selected-part-summary') as HTMLElement;
    const callout = document.querySelector('.dinolab-part-visibility-notice') as HTMLElement;
    return { renderer: renderer.__revealIdentity, model: model.uuid, geometries: [...geometries].sort(), camera: camera.position.toArray(), quaternion: camera.quaternion.toArray(),
      projection: camera.projectionMatrix.toArray(), rotation: model.rotation.toArray(), selected, marker,
      study: document.querySelector('.dinolab-study-controls [aria-pressed="true"]')?.getAttribute('aria-label'),
      presets: Array.from(document.querySelectorAll('.dinolab-3d-view-controls [aria-pressed="true"]')).map(node => node.getAttribute('aria-label')),
      query: (document.querySelector('#dinolab-part-search') as HTMLInputElement)?.value,
      category: document.querySelector('[aria-label="Body-part categories"] [aria-pressed="true"]')?.getAttribute('aria-label'),
      focused: !!state.field3dFocusSelectedLabel, scientific: !!state.field3dScientificNames, human: state.field3dShowHuman, evidence: state.field3dShowEvidence,
      skeleton: state.field3dShowSkeleton, body: state.field3dShowBody, opacity: state.field3dBodyOpacity,
      labels: getComputedStyle(overlay).display === 'none' ? [] : labels.map(node => ({ id: node.dataset.dinoPartLabel, term: node.querySelector('[data-dino-anatomical-name]')?.textContent, fits: node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1 })), lungs,
      noticeFits: !callout || callout.scrollWidth <= callout.clientWidth + 1, summaryFits: !strip || strip.scrollWidth <= strip.clientWidth + 1,
      fitsPage: document.documentElement.scrollWidth <= innerWidth, errors: w.__events.errors, lost: w.__glLive().lost,
      shaderFailures: renderer.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length };
  });
}
function healthy(row: Awaited<ReturnType<typeof audit>>) {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaderFailures).toBe(0); expect(row.fitsPage).toBe(true); expect(row.summaryFits).toBe(true); expect(row.noticeFits).toBe(true);
  for (const item of row.labels) expect(item.fits, item.id + ' label text fits').toBe(true);
}
function retained(before: Awaited<ReturnType<typeof audit>>, after: Awaited<ReturnType<typeof audit>>) {
  healthy(after);
  for (const field of ['renderer', 'camera', 'quaternion', 'projection', 'rotation', 'selected', 'study', 'presets', 'query', 'category', 'focused', 'scientific', 'human', 'evidence']) expect(after[field], field + ' retained through reveal').toEqual(before[field]);
  if (before.marker) {
    expect(after.marker).not.toBeNull(); before.marker.forEach((value, index) => expect(after.marker![index], 'landmark stays in place').toBeCloseTo(value, 4));
  }
}
async function reveal(page: Page, kind: string, name: string) {
  const button = page.locator('[data-dino-part-reveal="' + kind + '"]');
  await expect(page.getByRole('button', { name, exact: true })).toHaveCount(1); await expect(button).toHaveAccessibleName(name);
  await button.focus(); await page.keyboard.press('Enter'); await expect(canvas(page)).toBeFocused(); await expect(notice(page)).toHaveCount(0); await settle(page);
}
async function opaqueBody(page: Page) {
  const controls = page.locator('.dinolab-3d-controls-disclosure');
  if (!(await controls.evaluate(node => (node as HTMLDetailsElement).open))) await controls.locator(':scope > summary').click();
  const slider = page.getByRole('slider', { name: 'Body inference opacity', exact: true });
  await slider.focus(); await page.keyboard.press('End'); await expect(slider).toHaveValue('100'); await showCanvas(page);
}

test('hidden and opaque-covered skull bones reveal without losing the selected study', async ({ page }) => {
  await mount(page, 'tyrannosaurus', 1280); await select(page, 'skull'); await preferencesAndFilter(page, 'Head and neck', 'cranial');
  await canvas(page).focus(); await canvas(page).press('ArrowRight'); await canvas(page).press('PageUp'); await settle(page);
  await expect(notice(page)).toContainText('Bone layer is hidden');
  await expect(page.locator('#dinolab-selected-part-guide .dinolab-part-layer-help')).toContainText('currently off');
  const hidden = await audit(page); healthy(hidden); expect(hidden.skeleton).toBe(false); expect(hidden.body).toBe(true);
  await canvas(page).screenshot({ path: report + '/skull-hidden-life-desktop.png' });
  await notice(page).screenshot({ path: report + '/skull-hidden-notice-desktop.png' });
  await reveal(page, 'bone', 'Show bone structure'); const bone = await audit(page); retained(hidden, bone);
  expect(bone.skeleton).toBe(true); expect(bone.body).toBe(false); expect(bone.opacity).toBe(28);
  await canvas(page).screenshot({ path: report + '/skull-revealed-bone-desktop.png' });
  await configureLayers(page, { field3dShowBody: true, field3dBodyOpacity: 100 });
  await expect(notice(page)).toContainText('Bone view is covered'); const covered = await audit(page); healthy(covered);
  expect(covered.skeleton).toBe(true); expect(covered.body).toBe(true);
  await reveal(page, 'bone', 'Show bone structure'); const uncovered = await audit(page); retained(covered, uncovered);
  expect(uncovered.skeleton).toBe(true); expect(uncovered.body).toBe(false); expect(uncovered.opacity).toBe(28);
  fs.writeFileSync(report + '/desktop-audit.json', JSON.stringify({ hidden, bone, covered, uncovered }, null, 2));
});

test('320px inferred tissues and life features reveal from hidden layers with clear context', async ({ page }) => {
  await mount(page, 'archaeopteryx', 320, { field3dShowSkeleton: true, field3dShowBody: false, field3dBodyOpacity: 28 });
  await select(page, 'lungs'); await preferencesAndFilter(page, 'Inferred tissues', 'pulmonary');
  await expect(notice(page)).toContainText('Inferred tissues are hidden');
  await expect(notice(page)).toContainText('reconstructions, not preserved organs');
  const hidden = await audit(page); healthy(hidden); expect(hidden.lungs).toHaveLength(0);
  await notice(page).screenshot({ path: report + '/inferred-tissues-notice-320px.png' });
  await reveal(page, 'tissue', 'Reveal inferred tissues'); const tissue = await audit(page); retained(hidden, tissue);
  expect(tissue.skeleton).toBe(true); expect(tissue.body).toBe(true); expect(tissue.opacity).toBe(45);
  expect(tissue.lungs).toHaveLength(2); expect(tissue.lungs.every(lung => lung.visible && lung.materials.every((mat: any) => mat.transparent))).toBe(true);
  await expect(page.locator('#dinolab-selected-part-guide')).toContainText('inferred');
  await canvas(page).screenshot({ path: report + '/inferred-tissues-revealed-320px.png' });
  await opaqueBody(page); const opaque = await audit(page); healthy(opaque); expect(opaque.lungs.every(lung => !lung.visible)).toBe(true);
  await expect(page.getByRole('button', { name: 'Reveal inferred tissues', exact: true })).toHaveCount(1);
  await reveal(page, 'tissue', 'Reveal inferred tissues'); const translucent = await audit(page); retained(opaque, translucent);
  expect(translucent.model).toBe(opaque.model); expect(translucent.geometries).toEqual(opaque.geometries); expect(translucent.opacity).toBe(45);
  expect(translucent.lungs.every(lung => lung.visible)).toBe(true);

  await configureLayers(page, { field3dShowBody: false }); await select(page, 'wing');
  await expect(notice(page)).toContainText('Life surface is hidden'); const wingHidden = await audit(page); healthy(wingHidden);
  await reveal(page, 'life', 'Show life surface'); const wing = await audit(page); retained(wingHidden, wing);
  expect(wing.skeleton).toBe(false); expect(wing.body).toBe(true); expect(wing.opacity).toBe(100);
  await canvas(page).screenshot({ path: report + '/wing-life-revealed-320px.png' });

  await select(page, 'hand'); await configureLayers(page, { field3dShowBody: false });
  await expect(page.locator('.dinolab-body-label-overlay')).toBeHidden();
  const allHidden = await audit(page); healthy(allHidden); expect(allHidden.marker).toBeNull();
  await reveal(page, 'model', 'Show life surface'); const model = await audit(page); retained(allHidden, model); expect(model.body).toBe(true);
  await page.getByRole('combobox', { name: 'Choose species for 3D field station', exact: true }).selectOption('pteranodon'); await select(page, 'head');
  await expect(notice(page)).toHaveCount(0); await expect(page.locator('[data-dino-part-reveal]')).toHaveCount(0);
  fs.writeFileSync(report + '/mobile-audit.json', JSON.stringify({ hidden, tissue, opaque, translucent, wingHidden, wing, allHidden, model }, null, 2));
});
