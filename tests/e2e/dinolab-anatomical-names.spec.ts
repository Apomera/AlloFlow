import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0, mode: 'serial' });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-anatomical-names';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.__namesIdentity=(window.__namesRendererCount||0)+1;window.__namesRendererCount=r.__namesIdentity;r.render=function(s,c){window.__namesScene=s;window.__namesCamera=c;window.__namesRenderer=r;return draw(s,c);};return r;};' });

test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function mount(page: Page, species: string) {
  await page.setViewportSize({ width: 1280, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  // Omit field3dScientificNames to exercise the actual default.
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: species, field3dSelected: species, field3dStage: 'studio', field3dReconstructionMode: 'evidence',
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: false, field3dShowSkeleton: false,
    field3dShowBody: true, field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: 100 } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__namesScene?.getObjectByName('dinolab-specimen')), { timeout: 120_000 }).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
  await page.getByRole('button', { name: 'Body-part labels', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Body-part labels', exact: true })).toHaveAttribute('aria-pressed', 'true');
}
async function inspect(page: Page) {
  return page.evaluate(() => {
    const w = window as any, renderer = w.__namesRenderer, model = w.__namesScene.getObjectByName('dinolab-specimen');
    const overlay = document.querySelector('.dinolab-body-label-overlay') as HTMLElement, bounds = overlay.getBoundingClientRect();
    const labels = Array.from(overlay.querySelectorAll<HTMLElement>('[data-dino-part-label]')).filter(node => {
      const box = node.getBoundingClientRect(), style = getComputedStyle(node);
      return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && getComputedStyle(overlay).display !== 'none';
    }).map(node => {
      const box = node.getBoundingClientRect(), scientific = node.querySelector<HTMLElement>('[data-dino-anatomical-name]');
      const termBox = scientific?.getBoundingClientRect();
      return { id: node.dataset.dinoPartLabel, text: node.textContent, aria: node.getAttribute('aria-label'), selected: node.getAttribute('aria-pressed') === 'true',
        x: box.left - bounds.left, y: box.top - bounds.top, width: box.width, height: box.height,
        contentFits: node.scrollHeight <= node.clientHeight + 1 && node.scrollWidth <= node.clientWidth + 1,
        term: scientific?.textContent || '', termFits: !termBox || (termBox.left >= box.left - 1 && termBox.right <= box.right + 1 && termBox.top >= box.top - 1 && termBox.bottom <= box.bottom + 1) };
    });
    const materials = new Set<string>(), geometries = new Set<string>();
    model.traverse((mesh: any) => { if (!mesh.isMesh) return; if (mesh.geometry) geometries.add(mesh.geometry.uuid); for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material])) if (material) materials.add(material.uuid); });
    return { model: model.uuid, renderer: renderer.__namesIdentity, materials: [...materials].sort(), geometries: [...geometries].sort(),
      scientificNames: w.__toolData.dinoLab.field3dScientificNames === true, selected: (document.querySelector('#dinolab-part-picker') as HTMLSelectElement)?.value,
      labels, width: bounds.width, height: bounds.height, errors: w.__events.errors, lost: w.__glLive().lost,
      shaderFailures: renderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length,
      fitsPage: document.documentElement.scrollWidth <= innerWidth };
  });
}
function check(row: Awaited<ReturnType<typeof inspect>>, selected: string, term = '') {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaderFailures).toBe(0); expect(row.fitsPage).toBe(true);
  expect(row.selected).toBe(selected); expect(row.labels.length).toBeGreaterThan(0);
  const chosen = row.labels.find(label => label.id === selected);
  expect(chosen, 'the selected anatomical part remains labeled').toBeDefined(); expect(chosen!.selected).toBe(true);
  expect(chosen!.term).toBe(term);
  for (const label of row.labels) {
    expect(label.contentFits, 'label content fits: ' + label.id).toBe(true); expect(label.termFits, 'scientific line fits: ' + label.id).toBe(true);
    expect(label.x).toBeGreaterThanOrEqual(-1); expect(label.y).toBeGreaterThanOrEqual(-1);
    expect(label.x + label.width).toBeLessThanOrEqual(row.width + 1); expect(label.y + label.height).toBeLessThanOrEqual(row.height + 1);
  }
  for (let i = 0; i < row.labels.length; i++) for (let j = i + 1; j < row.labels.length; j++) {
    const a = row.labels[i], b = row.labels[j];
    expect(a.x + a.width <= b.x + .5 || b.x + b.width <= a.x + .5 || a.y + a.height <= b.y + .5 || b.y + b.height <= a.y + .5,
      'no overlapping callouts: ' + a.id + ' / ' + b.id).toBe(true);
  }
}
function sameNativeScene(before: Awaited<ReturnType<typeof inspect>>, after: Awaited<ReturnType<typeof inspect>>) {
  expect(after.renderer).toBe(before.renderer); expect(after.model).toBe(before.model);
  expect(after.materials).toEqual(before.materials); expect(after.geometries).toEqual(before.geometries);
}
async function selectPart(page: Page, part: string, term: string) {
  await page.locator('#dinolab-part-picker').selectOption(part);
  await expect(page.locator('#dinolab-selected-part-guide .dinolab-anatomical-term')).toContainText('Anatomical term');
  await expect(page.locator('#dinolab-selected-part-guide .dinolab-anatomical-term')).toContainText(term);
  await expect.poll(async () => (await inspect(page)).labels.some(label => label.id === part && label.selected), { timeout: 60_000 }).toBe(true);
  await settle(page);
}
async function keyboardToggle(page: Page, enabled: boolean) {
  const toggle = page.getByRole('checkbox', { name: 'Show scientific names', exact: true });
  await toggle.focus(); await page.keyboard.press('Space');
  if (enabled) await expect(toggle).toBeChecked(); else await expect(toggle).not.toBeChecked();
  await expect.poll(async () => (await inspect(page)).scientificNames).toBe(enabled); await settle(page);
}
async function photo(page: Page, name: string) {
  await page.locator('canvas.dinolab-3d-canvas').screenshot({ path: report + '/' + name + '.png' });
}

test('scientific names are optional, keyboard operable and update native callouts without rebuilding the model', async ({ page }) => {
  await mount(page, 'therizinosaurus');
  await expect(page.getByRole('checkbox', { name: 'Show scientific names', exact: true })).not.toBeChecked();
  await selectPart(page, 'hand', 'Manus'); const plain = await inspect(page); check(plain, 'hand');
  await expect(page.locator('[data-dino-part-label] [data-dino-anatomical-name]')).toHaveCount(0);
  const label = page.locator('[data-dino-part-label="hand"]'), choice = page.locator('[data-dino-part-choice="hand"]');
  const commonAria = await label.getAttribute('aria-label'), choiceAria = await choice.getAttribute('aria-label');
  expect(commonAria).toBe('Describe Hand'); expect(choiceAria).toBe('Learn about Hand');
  await expect(page.locator('#dinolab-part-picker option[value="hand"]')).not.toContainText('Manus');

  await keyboardToggle(page, true);
  await expect(label.locator('[data-dino-anatomical-name]')).toHaveText('Manus');
  const scientific = await inspect(page); check(scientific, 'hand', 'Manus'); sameNativeScene(plain, scientific);
  expect(scientific.labels.find(item => item.id === 'hand')!.height).toBeGreaterThan(plain.labels.find(item => item.id === 'hand')!.height);
  expect(await label.getAttribute('aria-label')).toContain(commonAria!); expect(await label.getAttribute('aria-label')).toContain('Manus');
  await expect(page.locator('#dinolab-part-picker option[value="hand"]')).toContainText('Hand');
  await expect(page.locator('#dinolab-part-picker option[value="hand"]')).toContainText('Manus');
  await page.locator('.dinolab-body-part-key > summary').click();
  await expect(choice).toContainText('Hand'); await expect(choice).toContainText('Manus');
  expect(await choice.getAttribute('aria-label')).toContain(choiceAria!); expect(await choice.getAttribute('aria-label')).toContain('Manus');
  await photo(page, 'therizinosaurus-hand-scientific-desktop');

  await keyboardToggle(page, false); const restored = await inspect(page); check(restored, 'hand'); sameNativeScene(scientific, restored);
  await expect(label).toHaveAttribute('aria-label', commonAria!); await expect(choice).toHaveAttribute('aria-label', choiceAria!);
  await expect(page.locator('[data-dino-part-label] [data-dino-anatomical-name]')).toHaveCount(0);
  await expect(page.locator('#dinolab-selected-part-guide .dinolab-anatomical-term')).toContainText('Manus');
  await page.locator('#dinolab-selected-part-guide .dinolab-anatomical-term').screenshot({ path: report + '/hand-term-with-toggle-off.png' });
  fs.writeFileSync(report + '/keyboard-and-native-scene.json', JSON.stringify({ plain, scientific, restored }, null, 2));
});

test('long scientific names reflow on phones, persist between species and stay absent for outgroups', async ({ page }) => {
  await mount(page, 'triceratops'); await selectPart(page, 'frill', 'Parietosquamosal frill');
  const plain = await inspect(page); check(plain, 'frill');
  await keyboardToggle(page, true); const desktop = await inspect(page); check(desktop, 'frill', 'Parietosquamosal frill'); sameNativeScene(plain, desktop);
  const phone: any[] = [];
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 }); await settle(page);
    const row = await inspect(page); check(row, 'frill', 'Parietosquamosal frill'); sameNativeScene(desktop, row); phone.push({ width, ...row });
    await expect(page.locator('#dinolab-selected-part-guide .dinolab-anatomical-term')).toContainText('Parietosquamosal frill');
    await photo(page, 'triceratops-frill-' + width + 'px');
  }
  await keyboardToggle(page, false); const narrowOff = await inspect(page); check(narrowOff, 'frill');
  await keyboardToggle(page, true); const narrowOn = await inspect(page); check(narrowOn, 'frill', 'Parietosquamosal frill'); sameNativeScene(narrowOff, narrowOn);

  const species = page.getByRole('combobox', { name: 'Choose species for 3D field station', exact: true });
  await species.selectOption('tyrannosaurus');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.dinoLab.field3dSelected)).toBe('tyrannosaurus');
  await expect(page.getByRole('checkbox', { name: 'Show scientific names', exact: true })).toBeChecked();
  await selectPart(page, 'skull', 'Cranial skeleton'); const skull = await inspect(page); check(skull, 'skull', 'Cranial skeleton');
  expect(skull.scientificNames).toBe(true); expect(skull.model).not.toBe(narrowOn.model);
  await photo(page, 'tyrannosaurus-skull-persisted-phone');

  await species.selectOption('mosasaurus');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.dinoLab.field3dSelected)).toBe('mosasaurus');
  await expect(page.getByRole('checkbox', { name: 'Show scientific names', exact: true })).toHaveCount(0);
  await expect(page.locator('.dinolab-anatomical-term')).toHaveCount(0);
  await expect(page.locator('[data-dino-anatomical-name]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  fs.writeFileSync(report + '/mobile-persistence.json', JSON.stringify({ desktop, phone, narrowOff, narrowOn, skull, outgroupTermsAbsent: true }, null, 2));
});
