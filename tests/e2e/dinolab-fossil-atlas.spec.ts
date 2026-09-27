import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const dir = 'reports/dinolab-fossil-atlas-2026-09-27';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 920, appStyles: true });
test.beforeAll(async () => { fs.mkdirSync(dir, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page, data = {}) {
  await harness.mount(page, { dinoLab: { tab: 'anatomy', fossilLibraryOpen: true, ...data } }, undefined, { expectCanvas: false });
  const styles = fs.readFileSync('app_styles_module.js', 'utf8');
  const start = styles.indexOf(':root, .theme-default {');
  const end = styles.indexOf('/* ─', styles.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: styles.slice(start, end) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
}

test('atlas selection, keyboard focus, practice feedback, and restored work stay connected', async ({ page }) => {
  test.setTimeout(300000);
  await page.setViewportSize({ width: 1366, height: 1000 });
  const notebook = { microraptor: { question: 'Could it glide?' } };
  const evidenceWorkbench = { caseId: 'quills', cases: { quills: { claim: 'My developing idea' } } };
  await mount(page, { notebook, evidenceWorkbench });
  await expect(page.locator('[data-fossil-type]')).toHaveCount(8);
  for (const id of ['bones', 'teeth', 'tracks', 'skin', 'coprolites', 'gastroliths', 'softtissue', 'eggs']) {
    const choice = page.locator('[data-fossil-type=' + id + ']');
    await choice.focus();
    await page.keyboard.press('Space');
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#dino-atlas-detail')).toHaveAttribute('data-fossil-detail', id);
    await expect(page.locator('#dino-atlas-detail-heading')).toBeFocused();
    await expect(page.locator('#dino-atlas-detail svg[role=img]')).toHaveAttribute('aria-label', /^Schematic/);
  }
  await expect(page.locator('.dinolab-atlas-limit')).toContainText('alone does not establish parental care');
  await expect(page.locator('.dinolab-atlas-sources a').first()).toHaveAttribute('href', 'https://www.amnh.org/dinosaurs/dinosaur-eggs');
  await page.getByRole('button', { name: 'Practice recognizing this evidence', exact: true }).click();
  await expect(page.locator('#dino-evidence-question')).toBeFocused();
  await expect(page.locator('#dino-fossil-matching')).toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Bones. Choose this fossil.', exact: true }).click();
  await expect(page.locator('#dino-fossil-matching')).toContainText('Eggs and nests is the best match here.');
  await expect(page.locator('#dino-fossil-matching')).toContainText('alone does not establish parental care');
  await page.locator('#dino-fossil-library > summary').click();
  await expect(page.locator('#dino-fossil-library')).not.toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Inspect this fossil type', exact: true }).click();
  await expect(page.locator('#dino-atlas-detail-heading')).toBeFocused();
  await expect(page.locator('#dino-fossil-library')).toHaveAttribute('open', '');
  await page.getByLabel('Jump to a lab section', { exact: true }).selectOption('notes');
  await page.getByLabel('Jump to a lab section', { exact: true }).selectOption('anatomy');
  await expect(page.locator('#dino-atlas-detail')).toHaveAttribute('data-fossil-detail', 'eggs');
  const saved = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.dinoLab)));
  expect(saved.notebook).toEqual(notebook);
  expect(saved.evidenceWorkbench).toEqual(evidenceWorkbench);
  expect(saved.fossilLibraryOpen).toBe(true);
  expect(saved.fossilMatchingOpen).toBe(true);
  await harness.destroy(page);
  await mount(page, saved);
  await expect(page.locator('#dino-fossil-matching')).toContainText('Eggs and nests is the best match here.');
  await expect(page.locator('#dino-fossil-library')).toHaveAttribute('open', '');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  fs.writeFileSync(dir + '/restored-state.json', JSON.stringify(saved, null, 2));
});

test('illustrated atlas fits phone and desktop layouts and remains readable across themes', async ({ page }) => {
  test.setTimeout(300000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1366, height: 1000 });
  await mount(page, { fossilReference: 'eggs', fossilMatchingOpen: true, evidenceIdx: 3, evidenceAnswered: true, evidencePicked: 'bones' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: any[] = [];
  for (const theme of ['theme-default', 'theme-dark', 'theme-contrast']) {
    await page.evaluate(theme => { document.body.className = theme; (window as any).__rerender(); }, theme);
    for (const id of ['eggs', 'gastroliths', 'softtissue']) {
      await page.locator('[data-fossil-type=' + id + ']').click();
      const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('.dinolab-root'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
      audits.push({ theme, id, violations });
      if (id === 'eggs') { await page.mouse.move(0, 0); await page.locator('#dino-fossil-library').screenshot({ path: dir + '/atlas-' + theme + '.png' }); }
    }
  }
  fs.writeFileSync(dir + '/accessibility.json', JSON.stringify(audits, null, 2));
  expect(audits.filter(a => a.violations.length)).toEqual([]);
  await page.evaluate(() => { document.body.className = 'theme-default'; (window as any).__rerender(); });
  const layouts: any[] = [];
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('[data-fossil-type=eggs]').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const card of await page.locator('[data-fossil-type]').all()) expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    const size = await page.locator('#dino-atlas-detail').boundingBox();
    expect(size!.x).toBeGreaterThanOrEqual(0); expect(size!.x + size!.width).toBeLessThanOrEqual(width);
    layouts.push({ width, detail: size });
    if (width === 390) {
      await page.mouse.move(0, 0);
      await page.locator('#dino-fossil-library').screenshot({ path: dir + '/atlas-phone.png' });
      await page.locator('#dino-atlas-detail').screenshot({ path: dir + '/detail-phone.png' });
    }
  }
  fs.writeFileSync(dir + '/layout.json', JSON.stringify(layouts, null, 2));
  await page.setViewportSize({ width: 1366, height: 1000 });
  await page.emulateMedia({ forcedColors: 'active' });
  await page.mouse.move(0, 0);
  await page.locator('#dino-fossil-library').screenshot({ path: dir + '/atlas-forced-colors.png' });
  await expect(page.locator('#dino-atlas-detail svg[role=img]')).toBeVisible();
  expect(await page.locator('[data-fossil-type=eggs]').evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  expect(await page.locator('[data-fossil-type=eggs]').evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
