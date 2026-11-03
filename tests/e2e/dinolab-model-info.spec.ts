import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-model-info';
const phase = process.env.DINO_INFO_PHASE || 'after';
const harness = new GlHarness({ toolFile: process.env.DINO_INFO_SOURCE || 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 960, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.render=function(s,c){window.__infoScene=s;window.__infoCamera=c;window.__infoRenderer=r;return draw(s,c);};return r;};' });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const canvas = (page: Page) => page.locator('canvas.dinolab-3d-canvas');
const panel = (page: Page) => page.locator('details.dinolab-model-info');
const header = (page: Page) => page.getByRole('group', { name: 'Displayed reconstruction', exact: true });
async function settle(page: Page) {
  await canvas(page).scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function mount(page: Page, species: string, width: number) {
  await page.setViewportSize({ width, height: width < 500 ? 844 : 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: species, field3dSelected: species, field3dStage: 'studio', field3dReconstructionMode: 'evidence',
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: false, field3dShowSkeleton: false,
    field3dShowBody: true, field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: 100 } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__infoScene?.getObjectByName('dinolab-specimen')), { timeout: 120_000 }).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click(); await settle(page);
}
async function openPanel(page: Page, open: boolean) {
  if (await panel(page).evaluate(node => (node as HTMLDetailsElement).open) !== open) {
    await panel(page).locator(':scope > summary').focus(); await page.keyboard.press('Enter');
  }
  await expect(panel(page)).toHaveJSProperty('open', open); await expect(panel(page).locator(':scope > summary')).toBeFocused(); await settle(page);
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, renderer = w.__infoRenderer, camera = w.__infoCamera, model = w.__infoScene.getObjectByName('dinolab-specimen');
    const c = document.querySelector('canvas.dinolab-3d-canvas')!.getBoundingClientRect(), info = document.querySelector('.dinolab-model-info') as HTMLDetailsElement;
    const infoBox = info.getBoundingClientRect(), hud = document.querySelector('.dinolab-3d-readouts') as HTMLElement;
    const summary = info.querySelector('summary')!, summaryBox = summary.getBoundingClientRect(), summaryStyle = getComputedStyle(summary);
    const captionBox = info.querySelector('.dinolab-model-info-content > div > div')!.getBoundingClientRect();
    const fits = (node: HTMLElement) => node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1;
    const geometries = new Set<string>(), materials = new Set<string>();
    model.traverse((node: any) => { if (!node.isMesh) return; geometries.add(node.geometry.uuid); for (const mat of Array.isArray(node.material) ? node.material : [node.material]) materials.add(mat.uuid); });
    const overlay = document.querySelector('.dinolab-body-label-overlay') as HTMLElement;
    const labels = getComputedStyle(overlay).display === 'none' ? [] : Array.from(overlay.querySelectorAll<HTMLElement>('[data-dino-part-label]')).filter(node => getComputedStyle(node).display !== 'none').map(node => {
      const b = node.getBoundingClientRect(); return { id: node.dataset.dinoPartLabel, x: b.x - c.x, y: b.y - c.y, right: b.right - c.x, bottom: b.bottom - c.y, fits: fits(node), text: node.textContent };
    });
    const headerChips = Array.from(hud.querySelectorAll<HTMLElement>('.dinolab-3d-chip')).map(node => { const b = node.getBoundingClientRect(); return { text: node.textContent, fits: fits(node), visible: getComputedStyle(node).display !== 'none', inside: b.x >= c.x && b.right <= c.right && b.y >= c.y && b.bottom <= c.bottom }; });
    return { model: model.uuid, geometries: [...geometries].sort(), materials: [...materials].sort(), state: w.__toolData.dinoLab,
      camera: camera.position.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray(), labels,
      panelOpen: info.open, panelBelowCanvas: infoBox.y >= c.bottom - 1, panelFits: fits(info), headerChips,
      captionGap: captionBox.y - summaryBox.bottom, focusClearance: parseFloat(summaryStyle.outlineWidth) + Math.max(0, parseFloat(summaryStyle.outlineOffset)),
      dimensions: Array.from(info.querySelectorAll('.dinolab-model-dimensions > div')).map(node => [node.querySelector('dt')?.textContent, node.querySelector('dd')?.textContent]),
      facts: info.open ? Array.from(info.querySelectorAll<HTMLElement>('.dinolab-3d-chip')).map(node => ({ text: node.textContent, visible: getComputedStyle(node).display !== 'none', fits: fits(node) })) : [],
      colourNote: info.querySelector('.dinolab-model-colour-note')?.textContent, canvas: [c.width, c.height],
      errors: w.__events.errors, lost: w.__glLive().lost, shaderFailures: renderer.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length,
      fitsPage: document.documentElement.scrollWidth <= innerWidth, summaryHeight: info.querySelector('summary')!.getBoundingClientRect().height };
  });
}
function healthy(row: Awaited<ReturnType<typeof audit>>) {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaderFailures).toBe(0); expect(row.fitsPage).toBe(true);
  expect(row.panelBelowCanvas).toBe(true); expect(row.panelFits).toBe(true); expect(row.summaryHeight).toBeGreaterThanOrEqual(43.99);
  if (row.panelOpen) expect(row.captionGap).toBeGreaterThanOrEqual(row.focusClearance);
  expect(row.headerChips).toHaveLength(2);
  for (const chip of row.headerChips) { expect(chip.visible).toBe(true); expect(chip.fits).toBe(true); expect(chip.inside).toBe(true); }
  for (const chip of row.facts) { expect(chip.visible).toBe(true); expect(chip.fits).toBe(true); }
  for (const label of row.labels) { expect(label.fits).toBe(true); expect(label.x).toBeGreaterThanOrEqual(-1); expect(label.y).toBeGreaterThanOrEqual(-1); expect(label.right).toBeLessThanOrEqual(row.canvas[0] + 1); expect(label.bottom).toBeLessThanOrEqual(row.canvas[1] + 1); }
}
function retained(before: Awaited<ReturnType<typeof audit>>, after: Awaited<ReturnType<typeof audit>>) {
  healthy(after);
  for (const field of ['model', 'geometries', 'materials', 'state', 'camera', 'quaternion', 'projection', 'labels', 'canvas'] as const) expect(after[field], field + ' retained while toggling notes').toEqual(before[field]);
}
async function photo(page: Page, name: string) { await settle(page); await page.locator('.dinolab-3d-viewer').screenshot({ path: report + '/' + phase + '-' + name + '.png' }); }

test('model information stays readable from desktop to 320px without changing the study', async ({ page }) => {
  await mount(page, 'tyrannosaurus', 1180); const rows = [];
  for (const width of [1180, 720, 390, 320]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 960 });
    if (await panel(page).evaluate(node => (node as HTMLDetailsElement).open)) await openPanel(page, false);
    await settle(page); await expect(header(page).getByText('Colour illustrated', { exact: true })).toBeVisible({ timeout: 5000 });
    const closed = await audit(page); healthy(closed);
    await expect(panel(page).locator('.dinolab-model-info-content')).toBeHidden();
    if (width === 1180 || width === 320) await photo(page, 'tyrannosaurus-closed-' + width + 'px');
    await openPanel(page, true); const open = await audit(page); retained(closed, open);
    expect(open.dimensions.map(metric => metric[0])).toEqual(['Length', 'Height', 'Mass']);
    expect(open.dimensions[0][1]).toContain('12.3'); expect(open.dimensions[1][1]).toContain('3.7'); expect(open.dimensions[2][1]).toContain('8.4');
    for (const prefix of ['Scene ', 'Pose ', 'Fossils ', 'Body ', 'Head ']) expect(open.facts.some(chip => chip.text!.startsWith(prefix)), prefix + ' available').toBe(true);
    expect(open.colourNote).toContain('Life colour evidence');
    if (width === 1180 || width === 320) await photo(page, 'tyrannosaurus-open-' + width + 'px');
    await openPanel(page, false); retained(closed, await audit(page)); rows.push({ width, closed, open });
  }
  await openPanel(page, true); await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run({ include: [['.dinolab-3d-readouts'], ['.dinolab-model-info']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
    return result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) }));
  });
  expect(violations).toEqual([]); fs.writeFileSync(report + '/' + phase + '-responsive-audit.json', JSON.stringify({ rows, violations }, null, 2));
});

test('phone header distinguishes fossil-supported life colour, neutral alternatives and bone display colours', async ({ page }) => {
  await mount(page, 'microraptor', 320); await expect(header(page).getByText('Colour from fossil pigment', { exact: true })).toBeVisible();
  await openPanel(page, true); const natural = await audit(page); healthy(natural); await photo(page, 'microraptor-pigment-320px');
  async function hypothesis(name: RegExp, label: string) {
    await page.getByRole('button', { name: /^Compare coverings:/ }).click();
    await page.getByRole('group', { name: 'Reconstruction hypothesis', exact: true }).getByRole('button', { name }).click();
    await page.getByRole('button', { name: 'Close field tools and return to the 3D model', exact: true }).click(); await settle(page);
    await expect(header(page).getByText(label, { exact: true })).toBeVisible(); await expect(panel(page)).toHaveJSProperty('open', true);
    const row = await audit(page); healthy(row); expect(row.colourNote).toBe(natural.colourNote); return row;
  }
  const neutral = await hypothesis(/Conservative minimum/, 'Colour illustrated'); await photo(page, 'microraptor-neutral-320px');
  const classic = await hypothesis(/Historical classic/, 'Colour illustrated'); await expect(header(page)).toContainText('Historical comparison');
  const restored = await hypothesis(/Evidence-led reconstruction/, 'Colour from fossil pigment');
  const presets = page.locator('.dinolab-surface-presets');
  await presets.getByRole('button', { name: /Fossil anchors/ }).click(); await settle(page);
  await expect(header(page).getByText('Skeleton reconstruction', { exact: true })).toBeVisible(); await expect(header(page).getByText('Bone display palette', { exact: true })).toBeVisible();
  const bones = await audit(page); healthy(bones); expect(bones.facts.some(chip => chip.text!.startsWith('Focus '))).toBe(true); expect(bones.facts.some(chip => chip.text!.startsWith('Scan '))).toBe(true);
  await presets.getByRole('button', { name: /Life view/ }).click(); await settle(page); await expect(header(page).getByText('Colour from fossil pigment', { exact: true })).toBeVisible();
  const life = await audit(page); healthy(life); expect(life.facts.some(chip => chip.text!.startsWith('Focus '))).toBe(false);
  fs.writeFileSync(report + '/' + phase + '-colour-audit.json', JSON.stringify({ natural, neutral, classic, restored, bones, life }, null, 2));
});

test('expanding model notes preserves the selected scientific landmark and camera', async ({ page }) => {
  await mount(page, 'triceratops', 320); await page.getByRole('button', { name: 'Body-part labels', exact: true }).click();
  await page.locator('#dinolab-part-picker').selectOption('frill');
  await page.getByRole('checkbox', { name: 'Show scientific names', exact: true }).check(); await page.getByRole('checkbox', { name: 'Focus selected label', exact: true }).check(); await settle(page);
  await expect(page.locator('[data-dino-part-label="frill"]')).toBeVisible(); const closed = await audit(page); healthy(closed); expect(closed.labels).toHaveLength(1); expect(closed.labels[0].text).toContain('Parietosquamosal');
  await openPanel(page, true); const open = await audit(page); retained(closed, open); await photo(page, 'scientific-frill-notes-320px');
  await openPanel(page, false); retained(closed, await audit(page));
  fs.writeFileSync(report + '/' + phase + '-anatomy-audit.json', JSON.stringify({ closed, open }, null, 2));
});
