import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0, mode: 'serial' });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-landmark-focus';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.__landmarkIdentity=(window.__landmarkRendererCount||0)+1;window.__landmarkRendererCount=r.__landmarkIdentity;r.render=function(s,c){window.__landmarkScene=s;window.__landmarkCamera=c;window.__landmarkRenderer=r;return draw(s,c);};return r;};' });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const canvas = (page: Page) => page.locator('canvas.dinolab-3d-canvas');
const focusToggle = (page: Page) => page.getByRole('checkbox', { name: 'Focus selected label', exact: true });
const label = (page: Page, id: string) => page.locator('[data-dino-part-label="' + id + '"]');
async function settle(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function showCanvas(page: Page) { await canvas(page).scrollIntoViewIfNeeded(); await settle(page); }
async function mount(page: Page, species: string, width: number) {
  await page.setViewportSize({ width, height: width < 500 ? 844 : 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: species, field3dSelected: species, field3dStage: 'studio', field3dReconstructionMode: 'evidence',
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: false, field3dShowSkeleton: false,
    field3dShowBody: true, field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: 100 } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__landmarkScene?.getObjectByName('dinolab-specimen')), { timeout: 120_000 }).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
  await page.getByRole('button', { name: 'Body-part labels', exact: true }).click();
}
async function select(page: Page, part: string) {
  await page.locator('#dinolab-part-picker').selectOption(part);
  await showCanvas(page);
  // Selection requests a side pose. The native renderer may defer that frame
  // while its canvas is offscreen; capture only the completed visible pose.
  await expect.poll(() => page.evaluate(() => (window as any).__landmarkScene.getObjectByName('dinolab-specimen').rotation.y)).toBe(0);
  await expect(label(page, part)).toBeVisible(); await settle(page);
}
async function toggleWithKeyboard(page: Page, checked: boolean) {
  await focusToggle(page).focus(); await page.keyboard.press('Space');
  await expect(focusToggle(page)).toBeFocused();
  if (checked) await expect(focusToggle(page)).toBeChecked(); else await expect(focusToggle(page)).not.toBeChecked();
  await showCanvas(page);
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, renderer = w.__landmarkRenderer, camera = w.__landmarkCamera, model = w.__landmarkScene.getObjectByName('dinolab-specimen');
    const geometries = new Set<string>(), materials = new Set<string>();
    model.traverse((mesh: any) => { if (!mesh.isMesh) return; if (mesh.geometry) geometries.add(mesh.geometry.uuid); for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if (mat) materials.add(mat.uuid); });
    const overlay = document.querySelector('.dinolab-body-label-overlay') as HTMLElement, bounds = overlay.getBoundingClientRect();
    const numeric = (el: Element, names: string[]) => names.map(name => Number(el.getAttribute(name)));
    const labels = Array.from(overlay.querySelectorAll<HTMLElement>('[data-dino-part-label]')).filter(node => getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden').map(node => {
      const id = node.dataset.dinoPartLabel!, box = node.getBoundingClientRect(), group = overlay.querySelector('[data-dino-part-line="' + id + '"]')!;
      const leader = group.querySelector('[data-dino-part-leader]')!, outline = group.querySelector('[data-dino-part-leader-outline]')!;
      const ring = group.querySelector('[data-dino-part-ring]')!, ringOutline = group.querySelector('[data-dino-part-ring-outline]')!;
      const check = node.querySelector('[data-dino-part-selected-check]');
      return { id, selected: node.getAttribute('aria-pressed') === 'true', aria: node.getAttribute('aria-label'),
        term: node.querySelector('[data-dino-anatomical-name]')?.textContent || '',
        box: { x: box.left - bounds.left, y: box.top - bounds.top, width: box.width, height: box.height }, contentFits: node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1,
        check: check ? { text: check.textContent, hidden: check.getAttribute('aria-hidden') } : null,
        leader: numeric(leader, ['x1', 'y1', 'x2', 'y2']), outline: numeric(outline, ['x1', 'y1', 'x2', 'y2']),
        leaderWidth: Number(leader.getAttribute('stroke-width')), outlineWidth: Number(outline.getAttribute('stroke-width')),
        ring: numeric(ring, ['cx', 'cy', 'r']), ringOutline: numeric(ringOutline, ['cx', 'cy', 'r']),
        ringWidth: Number(ring.getAttribute('stroke-width')), ringOutlineWidth: Number(ringOutline.getAttribute('stroke-width')),
        ringVisible: getComputedStyle(ring).display !== 'none', ringOutlineVisible: getComputedStyle(ringOutline).display !== 'none' };
    });
    return { renderer: renderer.__landmarkIdentity, model: model.uuid, geometries: [...geometries].sort(), materials: [...materials].sort(), camera: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray(), rotation: model.rotation.toArray(), selected: (document.querySelector('#dinolab-part-picker') as HTMLSelectElement).value,
      focused: !!w.__toolData.dinoLab.field3dFocusSelectedLabel, labels, overlay: { width: bounds.width, height: bounds.height },
      fitsPage: document.documentElement.scrollWidth <= innerWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      errors: w.__events.errors, lost: w.__glLive().lost, shaderFailures: renderer.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length };
  });
}
function healthy(row: Awaited<ReturnType<typeof audit>>) {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaderFailures).toBe(0); expect(row.fitsPage).toBe(true); expect(row.reducedMotion).toBe(true);
  const selected = row.labels.find(item => item.selected); expect(selected).toBeTruthy();
  expect(selected!.check).toEqual({ text: '✓ ', hidden: 'true' });
  expect(selected!.aria).not.toContain('✓'); expect(selected!.ringVisible).toBe(true);
  for (const item of row.labels) {
    expect(item.contentFits, item.id + ' text fits').toBe(true); expect(item.box.height).toBeGreaterThanOrEqual(44);
    expect(item.box.x).toBeGreaterThanOrEqual(-1); expect(item.box.y).toBeGreaterThanOrEqual(-1);
    expect(item.box.x + item.box.width).toBeLessThanOrEqual(row.overlay.width + 1); expect(item.box.y + item.box.height).toBeLessThanOrEqual(row.overlay.height + 1);
    expect(item.leader.every(Number.isFinite)).toBe(true); expect(item.outline).toEqual(item.leader); expect(item.outlineWidth).toBeGreaterThanOrEqual(item.leaderWidth + 2);
    if (item.ringVisible) { expect(item.ringOutlineVisible).toBe(true); expect(item.ringOutline).toEqual(item.ring); expect(item.ringOutlineWidth).toBeGreaterThanOrEqual(item.ringWidth + 2); }
  }
  for (let i = 0; i < row.labels.length; i++) for (let j = i + 1; j < row.labels.length; j++) {
    const a = row.labels[i].box, b = row.labels[j].box;
    expect(a.x < b.x + b.width - 1 && a.x + a.width > b.x + 1 && a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1, 'labels do not overlap').toBe(false);
  }
}
function unchanged(before: Awaited<ReturnType<typeof audit>>, after: Awaited<ReturnType<typeof audit>>) {
  healthy(after);
  for (const field of ['renderer', 'model', 'geometries', 'materials', 'camera', 'quaternion', 'projection', 'rotation', 'selected']) expect(after[field], field + ' remains stable during label focus').toEqual(before[field]);
}
async function waitLabels(page: Page, ids: string[]) {
  await expect.poll(async () => (await audit(page)).labels.map(item => item.id).sort()).toEqual([...ids].sort());
}

test('keyboard label focus isolates the selected feathered hand without changing the native specimen', async ({ page }) => {
  await mount(page, 'microraptor', 1280); await select(page, 'hand'); await expect(focusToggle(page)).not.toBeChecked();
  const context = await audit(page); healthy(context); expect(context.focused).toBe(false); expect(context.labels.length).toBeGreaterThan(1);
  await expect(label(page, 'hand')).toHaveAccessibleName('Describe Hand');
  await canvas(page).screenshot({ path: report + '/feathered-hand-context-desktop.png' });
  await toggleWithKeyboard(page, true); await waitLabels(page, ['hand']);
  const focused = await audit(page); unchanged(context, focused); expect(focused.focused).toBe(true);
  await canvas(page).screenshot({ path: report + '/feathered-hand-focused-desktop.png' });
  await toggleWithKeyboard(page, false);
  await expect.poll(async () => (await audit(page)).labels.length).toBeGreaterThan(1);
  const restored = await audit(page); unchanged(context, restored); expect(restored.focused).toBe(false);
  expect(restored.labels.map(item => item.id).sort()).toEqual(context.labels.map(item => item.id).sort());
  fs.writeFileSync(report + '/desktop-audit.json', JSON.stringify({ context, focused, restored }, null, 2));
});

test('320px scientific landmarks stay legible and focus preserves both supporting trace endpoints', async ({ page }) => {
  await mount(page, 'triceratops', 320); await select(page, 'frill');
  await page.getByRole('checkbox', { name: 'Show scientific names', exact: true }).check(); await showCanvas(page);
  const frillContext = await audit(page); healthy(frillContext); expect(frillContext.labels.length).toBeGreaterThan(1);
  await expect(label(page, 'frill')).toContainText('Parietosquamosal frill');
  await canvas(page).screenshot({ path: report + '/scientific-frill-context-320px.png' });
  await toggleWithKeyboard(page, true); await waitLabels(page, ['frill']);
  const frillFocused = await audit(page); unchanged(frillContext, frillFocused);
  await canvas(page).screenshot({ path: report + '/scientific-frill-focused-320px.png' });
  await page.getByRole('combobox', { name: 'Choose species for 3D field station', exact: true }).selectOption('tyrannosaurus');
  await select(page, 'skull'); await expect(focusToggle(page)).toBeChecked(); await waitLabels(page, ['skull']);
  await expect(label(page, 'skull')).toContainText('Cranial skeleton');
  const skullFocused = await audit(page); healthy(skullFocused); expect(skullFocused.focused).toBe(true);
  await canvas(page).screenshot({ path: report + '/pale-skull-focused-320px.png' });
  await toggleWithKeyboard(page, false); await expect.poll(async () => (await audit(page)).labels.length).toBeGreaterThan(1);
  const skullContext = await audit(page); unchanged(skullFocused, skullContext);
  await canvas(page).screenshot({ path: report + '/pale-skull-context-320px.png' });
  await toggleWithKeyboard(page, true); await select(page, 'knee');
  const relation = page.locator('.dinolab-supporting-relation[data-dino-support-relation="knee-ankle"]');
  if (!(await relation.evaluate(node => (node as HTMLDetailsElement).open))) await relation.locator(':scope > summary').click();
  await relation.locator('[data-dino-support-start]').click(); await showCanvas(page);
  await waitLabels(page, ['knee', 'ankle']);
  const traceKnee = await audit(page); healthy(traceKnee); expect(traceKnee.focused).toBe(true);
  await expect(label(page, 'knee')).toContainText('A ·'); await expect(label(page, 'ankle')).toContainText('B ·');
  await relation.locator('[data-dino-support-endpoint="ankle"]').click(); await showCanvas(page); await waitLabels(page, ['knee', 'ankle']);
  const traceAnkle = await audit(page); healthy(traceAnkle); expect(traceAnkle.selected).toBe('ankle'); expect(traceAnkle.focused).toBe(true);
  for (const field of ['renderer', 'model', 'camera', 'quaternion', 'projection', 'rotation']) expect(traceAnkle[field]).toEqual(traceKnee[field]);
  await canvas(page).screenshot({ path: report + '/supporting-trace-focused-320px.png' });
  await relation.locator('[data-dino-support-end]').click(); await showCanvas(page); await waitLabels(page, ['ankle']);
  const ended = await audit(page); healthy(ended); expect(ended.focused).toBe(true);
  fs.writeFileSync(report + '/mobile-audit.json', JSON.stringify({ frillContext, frillFocused, skullFocused, skullContext, traceKnee, traceAnkle, ended }, null, 2));
});
