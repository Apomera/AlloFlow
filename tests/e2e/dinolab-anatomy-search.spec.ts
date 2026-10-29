import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0, mode: 'serial' });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-anatomy-search';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.__searchIdentity=(window.__searchRendererCount||0)+1;window.__searchRendererCount=r.__searchIdentity;r.render=function(s,c){window.__searchScene=s;window.__searchCamera=c;window.__searchRenderer=r;return draw(s,c);};return r;};' });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const directory = (page: Page) => page.locator('.dinolab-body-part-key');
const search = (page: Page) => page.getByRole('searchbox', { name: 'Search body parts', exact: true });
const categories = (page: Page) => page.getByRole('group', { name: 'Body-part categories', exact: true });
const cards = (page: Page) => directory(page).locator('.dinolab-part-card[data-dino-part-choice]');
async function settle(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function mount(page: Page, species: string, width = 1280) {
  await page.setViewportSize({ width, height: width < 500 ? 844 : 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: species, field3dSelected: species, field3dStage: 'studio', field3dReconstructionMode: 'evidence',
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: false, field3dShowSkeleton: false,
    field3dShowBody: true, field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: 100 } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__searchScene?.getObjectByName('dinolab-specimen')), { timeout: 120_000 }).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
  await page.getByRole('button', { name: 'Body-part labels', exact: true }).click();
  await directory(page).locator(':scope > summary').click();
  await expect(search(page)).toBeVisible();
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, renderer = w.__searchRenderer, camera = w.__searchCamera, model = w.__searchScene.getObjectByName('dinolab-specimen');
    const key = document.querySelector('.dinolab-body-part-key') as HTMLElement, keyBox = key.getBoundingClientRect();
    const nodes = Array.from(key.querySelectorAll<HTMLElement>('.dinolab-part-card[data-dino-part-choice]')).map(node => {
      const box = node.getBoundingClientRect();
      return { id: node.dataset.dinoPartChoice, text: node.textContent, aria: node.getAttribute('aria-label'), pressed: node.getAttribute('aria-pressed'),
        x: box.left - keyBox.left, y: box.top - keyBox.top, width: box.width, height: box.height,
        contentFits: node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1 };
    });
    const materials = new Set<string>(), geometries = new Set<string>();
    model.traverse((mesh: any) => { if (!mesh.isMesh) return; if (mesh.geometry) geometries.add(mesh.geometry.uuid); for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material])) if (material) materials.add(material.uuid); });
    return { renderer: renderer.__searchIdentity, model: model.uuid, materials: [...materials].sort(), geometries: [...geometries].sort(),
      camera: camera.position.toArray(), projection: camera.projectionMatrix.toArray(), rotation: model.rotation.toArray(),
      selected: (document.querySelector('#dinolab-part-picker') as HTMLSelectElement)?.value,
      query: (document.querySelector('#dinolab-part-search') as HTMLInputElement)?.value,
      status: document.querySelector('#dinolab-part-search-status')?.textContent, cards: nodes, width: keyBox.width, height: keyBox.height,
      state: JSON.parse(JSON.stringify(w.__toolData.dinoLab)), errors: w.__events.errors, lost: w.__glLive().lost,
      shaderFailures: renderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length,
      fitsPage: document.documentElement.scrollWidth <= innerWidth };
  });
}
function healthy(row: Awaited<ReturnType<typeof audit>>) {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaderFailures).toBe(0); expect(row.fitsPage).toBe(true);
  for (const card of row.cards) {
    expect(card.contentFits, 'card content fits: ' + card.id).toBe(true); expect(card.height).toBeGreaterThanOrEqual(44);
    expect(card.x).toBeGreaterThanOrEqual(-1); expect(card.x + card.width).toBeLessThanOrEqual(row.width + 1);
  }
  for (let i = 0; i < row.cards.length; i++) for (let j = i + 1; j < row.cards.length; j++) {
    const a = row.cards[i], b = row.cards[j];
    expect(a.x + a.width <= b.x + .5 || b.x + b.width <= a.x + .5 || a.y + a.height <= b.y + .5 || b.y + b.height <= a.y + .5,
      'cards do not overlap: ' + a.id + ' / ' + b.id).toBe(true);
  }
}
function unchanged(before: Awaited<ReturnType<typeof audit>>, after: Awaited<ReturnType<typeof audit>>) {
  healthy(after);
  for (const name of ['renderer', 'model', 'materials', 'geometries', 'camera', 'projection', 'rotation', 'selected', 'state']) expect(after[name], name + ' is unaffected by directory filtering').toEqual(before[name]);
}
async function count(page: Page, expected: number, total: number) {
  await expect(cards(page)).toHaveCount(expected);
  await expect(page.locator('#dinolab-part-search-status')).toContainText(expected + ' of ' + total + ' parts');
  await settle(page);
}
async function chooseCategory(page: Page, name: string) {
  const button = categories(page).getByRole('button', { name, exact: true });
  await button.focus(); await page.keyboard.press('Enter'); await expect(button).toHaveAttribute('aria-pressed', 'true'); await settle(page);
}
async function clear(page: Page) {
  const button = directory(page).getByRole('button', { name: 'Clear search', exact: true });
  await button.focus(); await page.keyboard.press('Enter'); await expect(search(page)).toBeFocused(); await expect(search(page)).toHaveValue('');
  await expect(categories(page).getByRole('button', { name: 'All parts', exact: true })).toHaveAttribute('aria-pressed', 'true'); await settle(page);
}

test('common and scientific searches, categories and keyboard clearing preserve the selected native study', async ({ page }) => {
  await mount(page, 'therizinosaurus');
  await page.locator('#dinolab-part-picker').selectOption('hand'); await settle(page);
  await expect(page.locator('#dinolab-selected-part-guide .dinolab-anatomical-term')).toContainText('Manus');
  await expect(page.getByRole('checkbox', { name: 'Show scientific names', exact: true })).not.toBeChecked();
  const total = await cards(page).count(); expect(total).toBeGreaterThan(25); await count(page, total, total);
  const initial = await audit(page); healthy(initial); expect(initial.selected).toBe('hand');
  for (const [part, layer] of [['hand', 'Both layers'], ['skull', 'Bone layer'], ['eyes', 'Life surface'], ['lungs', 'Inferred tissue']]) {
    await expect(directory(page).locator('[data-dino-part-choice="' + part + '"]')).toHaveAccessibleDescription(layer);
  }
  await directory(page).screenshot({ path: report + '/desktop-anatomy-directory.png' });

  await search(page).fill('  MÁNUS  '); await count(page, 1, total);
  const hand = cards(page).first(); await expect(hand).toHaveAttribute('data-dino-part-choice', 'hand');
  await expect(hand).toContainText('Hand'); await expect(hand.locator('[data-dino-anatomical-name]')).toHaveText('Manus');
  expect(await hand.getAttribute('aria-label')).toContain('Manus');
  await expect(page.locator('.dinolab-body-label-overlay [data-dino-anatomical-name]')).toHaveCount(0);
  const scientific = await audit(page); unchanged(initial, scientific);
  await directory(page).screenshot({ path: report + '/desktop-scientific-match.png' });

  await search(page).fill('HIP—joint'); await count(page, 1, total);
  await expect(cards(page).first()).toHaveAttribute('data-dino-part-choice', 'hip'); const common = await audit(page); unchanged(initial, common);
  await chooseCategory(page, 'Body and tail'); await count(page, 0, total);
  await expect(page.locator('.dinolab-part-search-empty')).toBeVisible(); const incompatible = await audit(page); unchanged(initial, incompatible);
  await clear(page); await count(page, total, total); await expect(page.locator('.dinolab-part-search-empty')).toHaveCount(0);

  await chooseCategory(page, 'Limbs and digits'); const limbCount = await cards(page).count(); expect(limbCount).toBeGreaterThan(5); expect(limbCount).toBeLessThan(total);
  await search(page).fill('wrist'); await count(page, 1, total);
  await search(page).press('Escape'); await expect(search(page)).toHaveValue(''); await expect(search(page)).toBeFocused();
  await expect(categories(page).getByRole('button', { name: 'Limbs and digits', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await count(page, limbCount, total); const escaped = await audit(page); unchanged(initial, escaped);
  await clear(page); await search(page).fill('not-a-dinosaur-part'); await count(page, 0, total); await expect(page.locator('.dinolab-part-search-empty')).toBeVisible();
  await clear(page); await count(page, total, total); const restored = await audit(page); unchanged(initial, restored);
  fs.writeFileSync(report + '/keyboard-filtering.json', JSON.stringify({ initial, scientific, common, incompatible, escaped, restored }, null, 2));
});

test('phone directory cards stay readable and search resets when changing species', async ({ page }) => {
  await mount(page, 'triceratops', 390);
  const total = await cards(page).count(); await search(page).fill('parietosquamosal'); await count(page, 1, total);
  const frill = cards(page).first(); await expect(frill).toHaveAttribute('data-dino-part-choice', 'frill');
  await expect(frill.locator('[data-dino-anatomical-name]')).toHaveText('Parietosquamosal frill');
  await frill.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#dinolab-part-picker')).toHaveValue('frill');
  await expect(page.locator('#dinolab-selected-part-guide .dinolab-anatomical-term')).toContainText('Parietosquamosal frill');
  await expect(search(page)).toHaveValue('parietosquamosal'); await expect(frill).toHaveAttribute('aria-pressed', 'true');
  const selected = await audit(page); healthy(selected);
  await directory(page).screenshot({ path: report + '/frill-match-390px.png' });

  await clear(page); await chooseCategory(page, 'Head and neck'); const head = await audit(page); healthy(head); expect(head.cards.length).toBeGreaterThan(3);
  await directory(page).screenshot({ path: report + '/head-categories-390px.png' });
  await page.setViewportSize({ width: 320, height: 844 }); await settle(page); await chooseCategory(page, 'Distinctive features');
  const distinctive = await audit(page); healthy(distinctive); expect(distinctive.cards.some(card => card.id === 'frill')).toBe(true);
  await directory(page).screenshot({ path: report + '/distinctive-cards-320px.png' });
  await search(page).fill('frÍll'); await count(page, 1, total); const narrow = await audit(page); healthy(narrow);
  await directory(page).screenshot({ path: report + '/frill-match-320px.png' });

  await page.getByRole('combobox', { name: 'Choose species for 3D field station', exact: true }).selectOption('tyrannosaurus');
  await expect(search(page)).toHaveValue('');
  await expect(categories(page).getByRole('button', { name: 'All parts', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await audit(page)).model).not.toBe(narrow.model); await settle(page);
  const switched = await audit(page); healthy(switched); expect(switched.cards.length).toBeGreaterThan(25); expect(switched.cards.some(card => card.id === 'frill')).toBe(false);
  await expect(page.locator('#dinolab-part-picker')).toHaveValue('');
  fs.writeFileSync(report + '/mobile-directory.json', JSON.stringify({ selected, head, distinctive, narrow, switched }, null, 2));
});
