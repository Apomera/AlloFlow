import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 920, appStyles: true });
test.beforeAll(async () => { fs.mkdirSync('reports/dinolab-enhancement', { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page, state = {}) {
  await harness.mount(page, { dinoLab: { tab: 'explore', ...state } }, undefined, { expectCanvas: false });
  const styles = fs.readFileSync('app_styles_module.js', 'utf8');
  const start = styles.indexOf(':root, .theme-default {');
  const end = styles.indexOf('/* ─', styles.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: styles.slice(start, end) });
  await page.evaluate(() => {
    document.body.className = 'theme-default';
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block';
  });
}
test('catalog, notebook export, keyboard return, responsive layout, and contrast', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 920 });
  await mount(page);
  await expect(page.locator('[data-dino-card]')).toHaveCount(24);
  await page.screenshot({ path: 'reports/dinolab-enhancement/desktop-guide.png' });
  await page.getByLabel('Search dinosaurs', { exact: true }).fill('microraptor');
  await page.locator('[data-dino-card="microraptor"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#dino-specimen-heading')).toBeFocused();
  await page.getByRole('button', { name: 'Save specimen', exact: true }).click();
  await page.getByRole('button', { name: 'Write a field note', exact: true }).click();
  await expect(page.locator('#dino-note-question')).toBeFocused();
  await page.getByLabel('1. My question', { exact: true }).fill('How do four wings change gliding?');
  await page.getByLabel('2. Evidence I noticed', { exact: true }).fill('Feathers are preserved on both arms and legs.');
  await page.getByLabel('3. My explanation', { exact: true }).fill('The leg feathers may have helped control a glide.');
  await page.getByLabel('4. What I still wonder', { exact: true }).fill('The fossil alone cannot show the exact flight posture.');
  const original = await page.evaluate(() => JSON.stringify((window as any).__toolData.dinoLab.notebook));
  await page.getByRole('tab', { name: /Compare/ }).click();
  await page.getByRole('button', { name: 'Small and enormous', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Mass comparison value' }).first()).toHaveAttribute('aria-valuenow', '1');
  await page.screenshot({ path: 'reports/dinolab-enhancement/desktop-compare.png' });
  await page.getByRole('tab', { name: /Field Notes/ }).click();
  await expect(page.locator('#dino-note-question')).toHaveValue('How do four wings change gliding?');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.dinoLab.notebook))).toBe(original);
  await page.screenshot({ path: 'reports/dinolab-enhancement/desktop-notebook.png' });
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notebook', exact: true }).click();
  const download = await downloading; await download.saveAs('reports/dinolab-enhancement/example-notebook.txt');
  const text = fs.readFileSync('reports/dinolab-enhancement/example-notebook.txt', 'utf8');
  expect(text).toContain('How do four wings change gliding?'); expect(text).toContain('Catalog evidence:');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: any[] = [];
  for (const theme of ['theme-default', 'theme-dark', 'theme-contrast']) {
    await page.evaluate(theme => { document.body.className = theme; (window as any).__rerender(); }, theme);
    for (const tab of ['notes', 'compare', 'explore']) {
      await page.locator('#dinotab-' + tab).click();
      const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('#dinopanel'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
      audits.push({ theme, tab, violations });
    }
  }
  fs.writeFileSync('reports/dinolab-enhancement/accessibility.json', JSON.stringify(audits, null, 2));
  expect(audits.filter(a => a.violations.length)).toEqual([]);
  await page.evaluate(() => { document.body.className = 'theme-default'; (window as any).__rerender(); });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const tab of ['explore', 'notes', 'compare']) {
      await page.locator('#dinotab-' + tab).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + ' ' + tab).toBe(true);
      if (width === 390) await page.screenshot({ path: 'reports/dinolab-enhancement/mobile-' + tab + '.png' });
    }
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('species-file entry resets stale 3D evidence and connects the live station to the notebook', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 920 });
  await mount(page, {
    selected: 'triceratops', query: 'triceratops', field3dAutoRotate: false,
    field3dSelected: 'tyrannosaurus', field3dScanSpecies: 'tyrannosaurus',
    field3dScanLogged: { skull: true }, field3dAssemblyPlaced: { skull: true },
    notebook: { tyrannosaurus: { question: 'What can teeth tell us?' } }
  });
  await page.getByRole('button', { name: 'Inspect in 3D', exact: true }).click();
  await expect(page.getByLabel('Choose species for 3D field station', { exact: true })).toHaveValue('triceratops');
  await expect.poll(async () => page.evaluate(() => (window as any).__glLive()?.lost)).toBe(false);
  expect(await page.evaluate(() => (window as any).__toolData.dinoLab.field3dScanLogged)).toEqual({});
  expect(await page.evaluate(() => (window as any).__toolData.dinoLab.field3dAssemblyPlaced)).toEqual({});
  await page.screenshot({ path: 'reports/dinolab-enhancement/field-station.png' });
  // The file action lives in the tools drawer, which is also reachable from the evidence step.
  await page.locator('#dinolab-field-tools-toggle').click();
  await page.getByRole('button', { name: 'Write a field note', exact: true }).click();
  await expect(page.getByLabel('Notebook specimen', { exact: true })).toHaveValue('triceratops');
  await page.locator('#dino-note-observation').fill('I compared the skull and frill in the reconstruction.');
  expect(await page.evaluate(() => (window as any).__toolData.dinoLab.notebook.tyrannosaurus.question)).toBe('What can teeth tell us?');
  await expect(page.locator('.dinolab-3d-canvas')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
