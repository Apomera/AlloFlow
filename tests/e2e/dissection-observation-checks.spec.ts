import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir('reports/dissection-observation-checks', { recursive: true }); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.unmount(page));

for (const width of [390, 1440]) {
  test(`review and check an identification at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 });
    const notes = { 'frog|dorsal_skin': 'Moist and pigmented surface along the back.' };
    const explored = { 'frog|dorsal_skin': true, 'frog|tympanum': true };
    await harness.mount(page, { dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
      reducedMotion: true, soundEnabled: false, exploredOrgans: explored, organNotes: notes,
      organConfidence: { 'frog|dorsal_skin': 3, 'frog|tympanum': 1 },
      verifiedIdentifications: { 'frog|tympanum': { status: 'verified' } },
    } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
    const panel = page.locator('[data-observation-review]');
    await panel.locator('summary').first().click();
    await expect(panel.getByRole('button', { name: 'Needs a check (1)', exact: true })).toBeVisible();
    await panel.locator('[data-observation-filter="verified"]').click();
    await expect(panel.locator('[data-observation-entry]')).toHaveCount(1);
    await expect(panel.locator('[data-observation-entry]')).toContainText('Guided investigation');
    await panel.locator('[data-observation-filter="unverified"]').click();
    await expect(panel.locator('[data-observation-entry]')).toContainText('Confidence 3 of 3');
    await expect(panel.locator('[data-observation-entry]')).toContainText('Identification needs a check');
    await panel.screenshot({ path: `reports/dissection-observation-checks/review-${width}.png` });
    await panel.getByRole('button', { name: 'Read observations in a larger view', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: /Observation reading view/ });
    await expect(dialog.locator('[data-observation-reader-verification]')).toHaveText('Identification needs a check');
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-observation-reader]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
    expect(violations).toEqual([]);
    await dialog.getByRole('button', { name: 'Check this identification', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('#diss-canvas')).toBeFocused();
    const after = await page.evaluate(() => {
      const d = (window as any).__ctx.toolData.dissection;
      return { notes: d.organNotes, explored: d.exploredOrgans, target: d.guidedTargetIds, guided: d.guidedMode };
    });
    expect(after).toEqual({ notes, explored, target: ['dorsal_skin'], guided: true });
    await page.locator('#diss-organ-dorsal_skin').click();
    const checkpoint = page.locator('[data-guided-observation]');
    await expect(checkpoint).toBeFocused();
    await checkpoint.getByRole('button', { name: /pigmented surface/i }).click();
    const result = page.locator('[data-observation-check-result="dorsal_skin"]');
    await expect(result.locator('#diss-check-result-title')).toBeFocused();
    await expect(result).toContainText('All your currently inspected observations have an identification check');
    await expect(result).toContainText('Other structures and learning objectives may still need work');
    await expect(result.locator('[data-check-result-record-status]')).toHaveText('Note and confidence recorded');
    await result.screenshot({ path: `reports/dissection-observation-checks/result-${width}.png` });
    const completionAudit = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-observation-check-result]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id));
    expect(completionAudit).toEqual([]);
    expect(await page.evaluate(() => !!(window as any).__ctx.toolData.dissection.guidedComplete)).toBe(false);
    await result.getByRole('button', { name: 'Back to observation review', exact: true }).click();
    await expect(panel.locator('#diss-observation-review-title')).toBeFocused();
    await expect(panel.locator('[data-observation-filter="unverified"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.locator('[data-observation-review-empty]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}
