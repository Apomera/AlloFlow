import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-callout-preview', phase = process.env.DINO_PREVIEW_PHASE || 'after';
const harness = new GlHarness({ toolFile: process.env.DINO_PREVIEW_SOURCE || 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.__previewDraws=0;r.render=function(s,c){window.__previewScene=s;window.__previewCamera=c;window.__previewRenderer=r;r.__previewDraws++;return draw(s,c);};return r;};' });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const canvas = (page: Page) => page.locator('canvas.dinolab-3d-canvas');
const label = (page: Page, id: string) => page.locator('[data-dino-part-label="' + id + '"]');
async function frames(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))); }
async function showCanvas(page: Page) { await canvas(page).scrollIntoViewIfNeeded(); await frames(page); }
async function mount(page: Page, species: string, width: number, bone = false) {
  await page.setViewportSize({ width, height: width < 500 ? 844 : 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: species, field3dSelected: species, field3dStage: 'studio', field3dReconstructionMode: 'evidence',
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: false, field3dShowSkeleton: bone,
    field3dShowBody: !bone, field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: bone ? 28 : 100 } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__previewScene?.getObjectByName('dinolab-specimen')), { timeout: 120_000 }).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
  await page.getByRole('button', { name: 'Body-part labels', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Show scientific names', exact: true }).check(); await showCanvas(page);
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, renderer = w.__previewRenderer, camera = w.__previewCamera, model = w.__previewScene.getObjectByName('dinolab-specimen');
    const overlay = document.querySelector('.dinolab-body-label-overlay') as HTMLElement, b = overlay.getBoundingClientRect();
    const nums = (node: Element, names: string[]) => names.map(name => Number(node.getAttribute(name)));
    const labels = Array.from(overlay.querySelectorAll<HTMLElement>('[data-dino-part-label]')).filter(node => getComputedStyle(node).display !== 'none' && getComputedStyle(overlay).display !== 'none').map(node => {
      const id = node.dataset.dinoPartLabel!, group = overlay.querySelector('[data-dino-part-line="' + id + '"]')!, line = group.querySelector('[data-dino-part-leader]')!, outline = group.querySelector('[data-dino-part-leader-outline]')!;
      const ring = group.querySelector('[data-dino-part-ring]')!, ringOutline = group.querySelector('[data-dino-part-ring-outline]')!, box = node.getBoundingClientRect();
      return { id, selected: node.getAttribute('aria-pressed') === 'true', preview: node.getAttribute('data-dino-part-preview') === 'true', groupPreview: group.getAttribute('data-dino-part-preview') === 'true',
        aria: node.getAttribute('aria-label'), text: node.textContent, term: node.querySelector('[data-dino-anatomical-name]')?.textContent,
        layout: [box.x - b.x, box.y - b.y, box.width, box.height], fits: node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1,
        leader: nums(line, ['x1', 'y1', 'x2', 'y2']), outline: nums(outline, ['x1', 'y1', 'x2', 'y2']), width: Number(line.getAttribute('stroke-width')), outlineWidth: Number(outline.getAttribute('stroke-width')),
        colour: line.getAttribute('stroke'), ring: nums(ring, ['cx', 'cy']), ringOutline: nums(ringOutline, ['cx', 'cy']), marker: getComputedStyle(ring).display !== 'none', markerOutline: getComputedStyle(ringOutline).display !== 'none', dash: ring.getAttribute('stroke-dasharray') };
    });
    const geometries = new Set<string>(), materials = new Set<string>(), projected: Record<string, any> = {};
    model.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    model.traverse((node: any) => {
      if (node.isMesh) { geometries.add(node.geometry.uuid); for (const mat of Array.isArray(node.material) ? node.material : [node.material]) materials.add(mat.uuid); return; }
      const id = node.userData.dinoBodyPart; if (!id) return;
      const world = node.getWorldPosition(new T.Vector3()), depth = world.clone().applyMatrix4(camera.matrixWorldInverse).z, p = world.project(camera);
      if (depth >= 0 || Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)) > 1) return;
      // Annotation coordinates use the renderer's integer client dimensions;
      // CSS layout bounds can include fractional pixels at viewport-sized heights.
      if (!projected[id] || depth > projected[id].depth) projected[id] = { depth, x: (p.x + 1) * renderer.domElement.clientWidth / 2, y: (1 - p.y) * renderer.domElement.clientHeight / 2 };
    });
    return { model: model.uuid, geometries: [...geometries].sort(), materials: [...materials].sort(), camera: camera.position.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray(),
      state: w.__toolData.dinoLab, selected: (document.querySelector('#dinolab-part-picker') as HTMLSelectElement)?.value, guide: !!document.querySelector('#dinolab-selected-part-guide'),
      labels, projected, draws: renderer.__previewDraws, width: b.width, height: b.height, errors: w.__events.errors, lost: w.__glLive().lost,
      shaderFailures: renderer.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length, fitsPage: document.documentElement.scrollWidth <= innerWidth };
  });
}
function healthy(row: Awaited<ReturnType<typeof audit>>) {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaderFailures).toBe(0); expect(row.fitsPage).toBe(true);
  for (const item of row.labels) {
    expect(item.fits).toBe(true); expect(item.layout[0]).toBeGreaterThanOrEqual(-1); expect(item.layout[1]).toBeGreaterThanOrEqual(-1);
    expect(item.layout[0] + item.layout[2]).toBeLessThanOrEqual(row.width + 1); expect(item.layout[1] + item.layout[3]).toBeLessThanOrEqual(row.height + 1);
    expect(item.outline).toEqual(item.leader); expect(item.outlineWidth).toBeGreaterThanOrEqual(item.width + 2);
    expect(item.ring[0]).toBeCloseTo(item.leader[0], 5); expect(item.ring[1]).toBeCloseTo(item.leader[1], 5); expect(item.ringOutline).toEqual(item.ring);
    expect(item.leader[0]).toBeCloseTo(row.projected[item.id].x, 2); expect(item.leader[1]).toBeCloseTo(row.projected[item.id].y, 2);
    if (item.marker) expect(item.markerOutline).toBe(true);
  }
}
function retained(before: Awaited<ReturnType<typeof audit>>, after: Awaited<ReturnType<typeof audit>>, noDraw = true) {
  healthy(after);
  for (const field of ['model', 'geometries', 'materials', 'camera', 'quaternion', 'projection', 'state', 'selected', 'guide'] as const) expect(after[field], field + ' unchanged by preview').toEqual(before[field]);
  expect(after.labels.map(item => [item.id, item.selected, item.aria, item.text, item.leader])).toEqual(before.labels.map(item => [item.id, item.selected, item.aria, item.text, item.leader]));
  // CSSOM rectangles can differ by a few float units after scrolling/focus;
  // keep SVG anchor coordinates exact and bound layout differences to .01px.
  after.labels.forEach((item, index) => item.layout.forEach((value, axis) => expect(Math.abs(value - before.labels[index].layout[axis])).toBeLessThan(.01)));
  if (noDraw) expect(after.draws, 'preview uses no additional WebGL render').toBe(before.draws);
}
function preview(row: Awaited<ReturnType<typeof audit>>, id: string) {
  expect(row.labels.filter(item => item.preview).map(item => item.id)).toEqual([id]);
  const item = row.labels.find(item => item.id === id)!; expect(item.groupPreview).toBe(true); expect(item.selected).toBe(false); expect(item.marker).toBe(true);
  expect(item.colour).toBe('#fbbf24'); expect(item.width).toBe(2.5); expect(item.dash).toBe('3 2');
}
async function photo(page: Page, name: string) { await canvas(page).screenshot({ path: report + '/' + phase + '-' + name + '.png' }); }

test('hover and keyboard focus trace scientific labels without selecting or redrawing the dinosaur', async ({ page }) => {
  await mount(page, 'triceratops', 1280); const initial = await audit(page); healthy(initial); expect(initial.labels.length).toBeGreaterThan(1);
  expect(initial.selected).toBe(''); expect(initial.guide).toBe(false);
  const [first, second] = initial.labels.map(item => item.id);
  await photo(page, 'life-labels-before');
  await label(page, first).hover(); await frames(page); const hovered = await audit(page); retained(initial, hovered); preview(hovered, first); await photo(page, 'life-hover');
  await label(page, first).focus(); await page.keyboard.press('Tab'); await expect(label(page, second)).toBeFocused(); await frames(page);
  const focused = await audit(page); retained(initial, focused); preview(focused, second); await photo(page, 'life-keyboard');
  await page.mouse.move(0, 0); await frames(page); const pointerLeft = await audit(page); retained(initial, pointerLeft); preview(pointerLeft, second);
  await page.getByRole('checkbox', { name: 'Show scientific names', exact: true }).focus(); await frames(page);
  const cleared = await audit(page); retained(initial, cleared); expect(cleared.labels.some(item => item.preview || item.marker)).toBe(false);
  await label(page, second).focus(); await page.keyboard.press('Enter'); await showCanvas(page);
  await expect(page.locator('#dinolab-part-picker')).toHaveValue(second); const activated = await audit(page); healthy(activated);
  const chosen = activated.labels.find(item => item.id === second)!; expect(chosen.selected).toBe(true); expect(chosen.preview).toBe(false); expect(chosen.colour).toBe('#ffffff');
  await expect(page.locator('#dinolab-selected-part-guide')).toBeFocused();
  fs.writeFileSync(report + '/' + phase + '-desktop-audit.json', JSON.stringify({ initial, hovered, focused, pointerLeft, cleared, activated }, null, 2));
});

test('phone bone traces keep selected and partner markers distinct through preview and activation', async ({ page }) => {
  await mount(page, 'tyrannosaurus', 320, true); await page.locator('#dinolab-part-picker').selectOption('knee');
  await page.getByRole('checkbox', { name: 'Focus selected label', exact: true }).check();
  const relation = page.locator('.dinolab-supporting-relation[data-dino-support-relation="knee-ankle"]');
  if (!(await relation.evaluate(node => (node as HTMLDetailsElement).open))) await relation.locator(':scope > summary').click();
  await relation.locator('[data-dino-support-start]').click(); await showCanvas(page);
  await expect(label(page, 'ankle')).toBeVisible(); const initial = await audit(page); healthy(initial);
  expect(initial.labels.map(item => item.id).sort()).toEqual(['ankle', 'knee']); expect(initial.selected).toBe('knee');
  await label(page, 'ankle').hover(); await frames(page); const hovered = await audit(page); retained(initial, hovered); preview(hovered, 'ankle');
  const knee = hovered.labels.find(item => item.id === 'knee')!; expect(knee.colour).toBe('#ffffff'); expect(knee.dash).toBe(''); expect(knee.marker).toBe(true);
  await photo(page, 'bone-partner-hover-320px');
  await page.mouse.move(0, 0); await frames(page); const left = await audit(page); retained(initial, left);
  expect(left.labels.some(item => item.preview)).toBe(false); expect(left.labels.every(item => item.marker)).toBe(true);
  await label(page, 'knee').focus(); await page.keyboard.press('Tab'); await expect(label(page, 'ankle')).toBeFocused(); await frames(page);
  const focused = await audit(page); retained(initial, focused); preview(focused, 'ankle'); await photo(page, 'bone-partner-keyboard-320px');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => {
    const r = await (window as any).axe.run(document.querySelector('.dinolab-body-label-overlay'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
    return r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }));
  });
  expect(violations).toEqual([]);
  await page.keyboard.press('Enter'); await showCanvas(page); const activated = await audit(page); healthy(activated); expect(activated.selected).toBe('ankle');
  for (const field of ['model', 'geometries', 'materials', 'camera', 'quaternion', 'projection', 'state'] as const) expect(activated[field]).toEqual(initial[field]);
  expect(activated.labels.some(item => item.preview)).toBe(false); expect(activated.labels.find(item => item.id === 'ankle')!.colour).toBe('#ffffff');
  await relation.locator('[data-dino-support-end]').click(); await showCanvas(page); const ended = await audit(page); healthy(ended);
  expect(ended.labels.map(item => item.id)).toEqual(['ankle']); expect(ended.labels.some(item => item.preview)).toBe(false);
  fs.writeFileSync(report + '/' + phase + '-phone-audit.json', JSON.stringify({ initial, hovered, left, focused, activated, ended, violations }, null, 2));
});
