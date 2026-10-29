import { test, expect, type Page, type Locator } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0, mode: 'serial' });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-anatomy-navigation';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.__navigationIdentity=(window.__navigationRendererCount||0)+1;window.__navigationRendererCount=r.__navigationIdentity;r.render=function(s,c){window.__navigationScene=s;window.__navigationCamera=c;window.__navigationRenderer=r;return draw(s,c);};return r;};' });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const key = (page: Page) => page.locator('#dinolab-body-part-key');
const guide = (page: Page) => page.locator('#dinolab-selected-part-guide');
const summary = (page: Page) => page.locator('.dinolab-selected-part-summary');
const canvas = (page: Page) => page.locator('canvas.dinolab-3d-canvas');
const search = (page: Page) => page.getByRole('searchbox', { name: 'Search body parts', exact: true });
async function settle(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function activate(page: Page, button: Locator) { await button.focus(); await page.keyboard.press('Enter'); await settle(page); }
async function mount(page: Page, species: string, width: number) {
  await page.setViewportSize({ width, height: width < 500 ? 844 : 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: species, field3dSelected: species, field3dStage: 'studio', field3dReconstructionMode: 'evidence',
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: false, field3dShowSkeleton: false,
    field3dShowBody: true, field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: 100 } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__navigationScene?.getObjectByName('dinolab-specimen')), { timeout: 120_000 }).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
  await page.getByRole('button', { name: 'Body-part labels', exact: true }).click();
  await expect(summary(page)).toHaveCount(0);
  await key(page).locator(':scope > summary').click();
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, renderer = w.__navigationRenderer, camera = w.__navigationCamera, model = w.__navigationScene.getObjectByName('dinolab-specimen');
    const active = document.activeElement as HTMLElement, strip = document.querySelector('.dinolab-selected-part-summary') as HTMLElement;
    const selectedGuide = document.querySelector('#dinolab-selected-part-guide') as HTMLElement, heading = selectedGuide?.querySelector('h3');
    const box = heading?.getBoundingClientRect();
    const materials = new Set<string>(), geometries = new Set<string>();
    model.traverse((mesh: any) => { if (!mesh.isMesh) return; if (mesh.geometry) geometries.add(mesh.geometry.uuid); for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material])) if (material) materials.add(material.uuid); });
    return { renderer: renderer.__navigationIdentity, model: model.uuid, materials: [...materials].sort(), geometries: [...geometries].sort(),
      camera: camera.position.toArray(), projection: camera.projectionMatrix.toArray(), rotation: model.rotation.toArray(),
      selected: (document.querySelector('#dinolab-part-picker') as HTMLSelectElement)?.value,
      query: (document.querySelector('#dinolab-part-search') as HTMLInputElement)?.value,
      category: document.querySelector('[aria-label="Body-part categories"] [aria-pressed="true"]')?.getAttribute('aria-label') || document.querySelector('[aria-label="Body-part categories"] [aria-pressed="true"]')?.textContent,
      keyOpen: (document.querySelector('#dinolab-body-part-key') as HTMLDetailsElement)?.open,
      focus: { id: active?.id, card: active?.dataset.dinoPartChoice, canvas: active?.classList.contains('dinolab-3d-canvas') },
      heading: box ? { top: box.top, bottom: box.bottom, left: box.left, right: box.right } : null,
      summaryOutsideOverlay: !!strip && !strip.closest('.dinolab-body-label-overlay') && !strip.closest('.dinolab-3d-viewer'),
      summaryFits: !strip || strip.scrollWidth <= strip.clientWidth + 1,
      state: JSON.parse(JSON.stringify(w.__toolData.dinoLab)), errors: w.__events.errors, lost: w.__glLive().lost,
      shaderFailures: renderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length,
      fitsPage: document.documentElement.scrollWidth <= innerWidth, viewport: { width: innerWidth, height: innerHeight } };
  });
}
function healthy(row: Awaited<ReturnType<typeof audit>>) {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaderFailures).toBe(0); expect(row.fitsPage).toBe(true);
  expect(row.summaryFits).toBe(true); expect(row.summaryOutsideOverlay).toBe(true);
}
function unchanged(before: Awaited<ReturnType<typeof audit>>, after: Awaited<ReturnType<typeof audit>>) {
  healthy(after);
  for (const field of ['renderer', 'model', 'materials', 'geometries', 'camera', 'projection', 'rotation', 'selected', 'query', 'category', 'state']) expect(after[field], field + ' remains stable during navigation').toEqual(before[field]);
}
async function checkGuideFocus(page: Page) {
  await expect(guide(page)).toBeFocused(); const row = await audit(page); healthy(row);
  expect(row.heading).not.toBeNull(); expect(row.heading!.top).toBeGreaterThanOrEqual(-1); expect(row.heading!.bottom).toBeLessThanOrEqual(row.viewport.height);
  return row;
}
async function openViewControls(page: Page) {
  const disclosure = page.locator('.dinolab-3d-controls-disclosure');
  if (!(await disclosure.evaluate(node => (node as HTMLDetailsElement).open))) await disclosure.locator(':scope > summary').click();
}
async function settleSelectedPose(page: Page) {
  // The demand renderer defers an offscreen canvas after a card scrolls to its
  // guide. Let that already-requested side pose draw before comparing navigation.
  await canvas(page).scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => (window as any).__navigationScene.getObjectByName('dinolab-specimen').rotation.y)).toBe(0);
  await activate(page, summary(page).getByRole('button', { name: 'Read part guide', exact: true }));
  return checkGuideFocus(page);
}

test('phone navigation returns to guide, model and filtered key without resetting the study', async ({ page }) => {
  await mount(page, 'triceratops', 320);
  await page.getByRole('group', { name: 'Body-part categories', exact: true }).getByRole('button', { name: 'Distinctive features', exact: true }).click();
  await search(page).fill('frill');
  const frillCard = key(page).locator('[data-dino-part-choice="frill"]');
  await activate(page, frillCard); await checkGuideFocus(page);
  const selected = await settleSelectedPose(page);
  expect(selected.selected).toBe('frill'); expect(selected.query).toBe('frill');
  await expect(summary(page)).toContainText('Frill'); await expect(summary(page)).toContainText('Parietosquamosal frill');
  await guide(page).screenshot({ path: report + '/frill-guide-320px.png' });

  await activate(page, guide(page).getByRole('button', { name: 'View on model', exact: true }));
  await expect(canvas(page)).toBeFocused(); const onModel = await audit(page); unchanged(selected, onModel);
  await openViewControls(page); await page.getByRole('button', { name: 'Overhead camera view', exact: true }).click(); await settle(page);
  const overhead = await audit(page); healthy(overhead); expect(overhead.camera).not.toEqual(selected.camera);
  await activate(page, summary(page).getByRole('button', { name: 'Read part guide', exact: true }));
  const readOverhead = await checkGuideFocus(page); unchanged(overhead, readOverhead);
  await activate(page, guide(page).getByRole('button', { name: 'View on model', exact: true }));
  await expect(canvas(page)).toBeFocused(); const returnModel = await audit(page); unchanged(overhead, returnModel);
  await summary(page).screenshot({ path: report + '/frill-selected-summary-320px.png' });

  await activate(page, summary(page).getByRole('button', { name: 'Read part guide', exact: true }));
  await activate(page, guide(page).getByRole('button', { name: 'Back to body-part key', exact: true }));
  await expect(frillCard).toBeFocused(); const returned = await audit(page); unchanged(overhead, returned); expect(returned.keyOpen).toBe(true);
  await key(page).screenshot({ path: report + '/frill-returned-key-320px.png' });

  // A stale search must not hide the return target or clear the user's filter.
  await search(page).fill('horn'); await expect(frillCard).toHaveCount(0); const excluded = await audit(page);
  await key(page).locator(':scope > summary').click(); await expect(key(page)).not.toHaveAttribute('open', '');
  await activate(page, summary(page).getByRole('button', { name: 'Read part guide', exact: true })); await checkGuideFocus(page);
  await activate(page, guide(page).getByRole('button', { name: 'Back to body-part key', exact: true }));
  await expect(search(page)).toBeFocused(); await expect(search(page)).toHaveValue('horn'); const fallback = await audit(page); unchanged(excluded, fallback); expect(fallback.keyOpen).toBe(true);
  await key(page).locator(':scope > summary').click();
  await activate(page, summary(page).getByRole('button', { name: 'Browse body parts', exact: true }));
  await expect(search(page)).toBeFocused(); const browsed = await audit(page); unchanged(excluded, browsed); expect(browsed.keyOpen).toBe(true);
  fs.writeFileSync(report + '/mobile-navigation.json', JSON.stringify({ selected, onModel, overhead, readOverhead, returnModel, returned, excluded, fallback, browsed }, null, 2));
});

test('desktop selected-part strip and fact cards make the guide easy to scan', async ({ page }) => {
  await mount(page, 'therizinosaurus', 1280); await search(page).fill('manus');
  await activate(page, key(page).locator('[data-dino-part-choice="hand"]')); await checkGuideFocus(page);
  const selected = await settleSelectedPose(page);
  await expect(summary(page)).toContainText('Hand'); await expect(summary(page)).toContainText('Manus');
  const facts = guide(page).locator('.dinolab-part-facts');
  for (const label of ['What it does', 'Characteristics', 'Look for', 'Fossils and inference']) await expect(facts.locator('dt').filter({ hasText: label })).toHaveCount(1);
  const order = await facts.evaluate(node => {
    const inspection = document.querySelector('#dinolab-selected-part-guide .dinolab-part-inspection');
    return { precedingInspection: !inspection || !!(node.compareDocumentPosition(inspection) & Node.DOCUMENT_POSITION_FOLLOWING),
      fits: (node as HTMLElement).scrollWidth <= (node as HTMLElement).clientWidth + 1 };
  });
  expect(order.precedingInspection).toBe(true); expect(order.fits).toBe(true);
  await facts.screenshot({ path: report + '/hand-guide-facts-desktop.png' });
  await summary(page).screenshot({ path: report + '/hand-selected-summary-desktop.png' });
  for (const button of await summary(page).getByRole('button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await activate(page, summary(page).getByRole('button', { name: 'Read part guide', exact: true })); const focused = await checkGuideFocus(page); unchanged(selected, focused);
  await activate(page, guide(page).getByRole('button', { name: 'Back to body-part key', exact: true }));
  await expect(key(page).locator('[data-dino-part-choice="hand"]')).toBeFocused(); const returned = await audit(page); unchanged(selected, returned);
  fs.writeFileSync(report + '/desktop-navigation.json', JSON.stringify({ selected, focused, returned, order }, null, 2));
});
