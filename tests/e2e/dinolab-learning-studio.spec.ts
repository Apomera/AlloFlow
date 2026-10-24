import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ mode: 'default', timeout: 180_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const report = path.resolve('reports/dinolab-learning-studio');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 920, appStyles: true, layout: 'document' });

test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, state: Record<string, unknown> = {}) {
  await page.setViewportSize({ width: 1280, height: 920 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
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

test('question routes and browse shortcut preserve existing student work', async ({ page }) => {
  const notebook = { velociraptor: { observation: 'I can see attachment marks.', inference: 'These could anchor feathers.', question: 'Which part is preserved?', nextTest: 'Compare the original fossil.' } };
  await mount(page, { notebook, field3dSelected: 'velociraptor', digSeed: 11, digRevealed: [0, 2, 7] });
  await expect(page.locator('[data-dino-route]')).toHaveCount(3);
  await expect(page.locator('.dinolab-study-plate')).toHaveCount(2);
  await expect(page.locator('.dinolab-entry-investigation')).not.toContainText('million years');
  await page.getByRole('button', { name: 'Browse the species guide', exact: true }).click();
  await expect(page.locator('#dino-field-guide-heading')).toBeFocused();
  await page.locator('[data-dino-route=anatomy]').click();
  await expect(page.locator('[data-evidence-workbench]')).toBeVisible();
  await expect(page.locator('#dinotab-anatomy')).toBeFocused();
  await page.getByLabel('Jump to a lab section', { exact: true }).selectOption('explore');
  await page.locator('[data-dino-route=dig]').click();
  await expect(page.locator('#dinotab-dig')).toHaveAttribute('aria-selected', 'true');
  const saved = await page.evaluate(() => {
    const data = (window as any).__toolData.dinoLab;
    return { notebook: data.notebook, species: data.field3dSelected, seed: data.digSeed, revealed: data.digRevealed };
  });
  expect(saved).toEqual({ notebook, species: 'velociraptor', seed: 11, revealed: [0, 2, 7] });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('opening workspace is accessible in three themes and at phone widths', async ({ page }) => {
  await mount(page);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: unknown[] = [];
  for (const theme of ['theme-default', 'theme-dark', 'theme-contrast']) {
    await page.evaluate(theme => { document.body.className = theme; (window as any).__rerender(); window.scrollTo(0, 0); }, theme);
    const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('.dinolab-root'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
    })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })));
    audits.push({ theme, violations });
    await page.screenshot({ path: path.join(report, 'explore-' + theme + '.png') });
    expect(violations).toEqual([]);
  }
  await page.evaluate(() => { document.body.className = 'theme-default'; (window as any).__rerender(); });
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const start = page.getByRole('button', { name: 'Start the investigation', exact: false });
    expect((await start.boundingBox())!.y).toBeLessThan(600);
    for (const route of await page.locator('[data-dino-route]').all()) {
      expect(await route.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
    if (width === 390) await page.screenshot({ path: path.join(report, 'explore-phone.png') });
  }
  fs.writeFileSync(path.join(report, 'accessibility.json'), JSON.stringify(audits, null, 2));
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await expect(page.locator('.dinolab-entry-primary')).toBeVisible();
  await expect(page.locator('.dinolab-study-plate svg')).toHaveCount(2);
});

test('3D interpretation lenses update an existing live reconstruction', async ({ page }) => {
  await mount(page, { tab: 'field3d', field3dSelected: 'velociraptor', field3dStage: 'studio', field3dOrientationDismissed: true, field3dAutoRotate: false });
  await expect.poll(async () => (await harness.glScene(page))?.meshes || 0).toBeGreaterThan(0);
  const canvas = page.locator('canvas.dinolab-3d-canvas');
  await expect(canvas).toBeVisible();
  await canvas.evaluate(el => { (window as any).__learningCanvas = el; });
  for (const lens of ['anchors', 'body', 'scale', 'life', 'full']) {
    await page.locator('[data-dino-model-lens=' + lens + ']').click();
    await expect(page.locator('[data-dino-model-lens=' + lens + ']')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.dinolab-lens-note')).toBeVisible();
    expect(await canvas.evaluate(el => el === (window as any).__learningCanvas)).toBe(true);
  }
  await page.locator('.dinolab-model-lenses').screenshot({ path: path.join(report, 'model-lenses.png') });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  const live = await harness.glContexts(page);
  expect(live.some(record => !record.lost && record.draws > 0)).toBe(true);
});
