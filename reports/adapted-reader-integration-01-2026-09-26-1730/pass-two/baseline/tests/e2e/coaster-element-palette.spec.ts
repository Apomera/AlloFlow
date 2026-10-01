import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_coasterlab.js', toolId: 'coasterLab', width: 1440, height: 960,
  probes: "document.head.insertAdjacentHTML('beforeend', '<style>#wrap{width:100%}.clab-root{width:100%;height:100vh!important}</style>');" });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
test('illustrated cards preview, insert, undo, and respect the available node budget', async ({ page }, testInfo) => {
  test.setTimeout(240000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('coaster_lab_onboarding_v1', 'complete'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 960 });
  await harness.mount(page, {}, "document.querySelector('[aria-label=\"Coaster Lab 3-D designer\"]')._lab");
  const state = () => page.evaluate(() => (document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.elementPresentation());
  const card = (kind: string) => page.locator('.clab-element-btn[data-element="' + kind + '"]');
  await expect(page.locator('.clab-element-btn svg[aria-hidden="true"]')).toHaveCount(5);
  await expect(card('hill')).toBeDisabled();
  await page.locator('.clab-edit-track').first().click();
  const initial = (await state()).nodes;
  for(const [kind, count] of [['hill', 3], ['drop', 4], ['turn-left', 3], ['turn-right', 3], ['loop', 10]] as const){
    await expect(card(kind)).toBeEnabled();
    await expect(card(kind).locator('.clab-element-cost')).toHaveText('+' + count + ' nodes');
    await card(kind).focus();
    await expect.poll(state).toMatchObject({ previewVisible: true, previewNodes: count, nodes: initial });
  }
  await page.locator('#clab-elementPalette').screenshot({ path: testInfo.outputPath('illustrated-track-palette.png') });
  await card('hill').press('Enter');
  await expect.poll(state).toMatchObject({ nodes: initial + 3, previewVisible: false });
  await expect(page.locator('#clab-nodeBudget')).toHaveAttribute('aria-valuetext', (initial + 3) + ' of 80 nodes used; ' + (77 - initial) + ' free');
  await page.locator('#clab-btnUndo').click();
  await expect.poll(state).toMatchObject({ nodes: initial });
  await page.evaluate(() => {
    const lab = (document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab;
    const design = JSON.parse(lab.exportDesign());
    design.points = Array.from({ length: 76 }, (_, i) => ({ x: Math.cos(i / 76 * Math.PI * 2) * 45, y: 5 + 10 * Math.sin(i / 76 * Math.PI * 2) ** 2, z: Math.sin(i / 76 * Math.PI * 2) * 45, bank: 0 }));
    design.certTurnIdx = 10; lab.importDesign(JSON.stringify(design));
  });
  await page.locator('.clab-edit-track').first().click();
  await expect(card('loop')).toBeDisabled();
  await expect(card('loop').locator('.clab-element-cost')).toHaveText('Needs 10 free nodes');
  await expect(card('drop')).toBeEnabled();
  await expect(page.locator('#clab-nodeBudgetText')).toHaveText('76 / 80 · 4 free');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#clab-elementPalette').screenshot({ path: testInfo.outputPath('track-palette-near-limit.png') });
  await card('drop').click();
  await expect.poll(state).toMatchObject({ nodes: 80 });
  for(const kind of ['hill', 'drop', 'turn-left', 'turn-right', 'loop']) await expect(card(kind)).toBeDisabled();
  await expect(page.locator('#clab-nodeBudgetText')).toHaveText('80 / 80 · 0 free');
  expect(errors).toEqual([]);
});
