import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900,
  layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
test.describe.configure({ retries: 0, timeout: 90000 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.unmount(page));

const cues: Record<string, RegExp> = {
  dorsal_skin: /Green-brown pigmented surface/i,
  ventral_skin: /Lighter, thinner ventral surface/i,
  tympanum: /External eardrum behind eye/i,
  nictitating: /Transparent third eyelid/i,
};
async function awards(page: Page) {
  return page.evaluate(() => (window as any).__guidedAwards);
}
async function finishRound(page: Page, tryIncorrect = false) {
  await page.locator('#diss-route-guided').click();
  const targets: string[] = await page.evaluate(() => (window as any).__ctx.toolData.dissection.guidedTargetIds);
  expect(targets.length).toBeGreaterThan(1);
  for (const [index, target] of targets.entries()) {
    expect(cues[target]).toBeDefined();
    await page.locator('[data-inspection-directory-action]').click();
    await page.locator('#diss-organ-' + target).click();
    const checkpoint = page.locator('[data-guided-observation]');
    await expect(checkpoint).toBeFocused();
    const correct = checkpoint.getByRole('button', { name: cues[target] });
    if (tryIncorrect && index === 0) {
      const before = await awards(page);
      await checkpoint.getByRole('button').filter({ hasNotText: cues[target] }).first().click();
      await expect(checkpoint).toContainText('Try another choice');
      expect(await awards(page)).toEqual(before);
    }
    await correct.click();
    await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.guidedStep)).toBe(index + 1);
  }
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.guidedMode)).toBe(false);
  return targets;
}

test('Guided practice remains repeatable while identification and completion credit stay earned once', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 950 });
  await harness.mount(page, { dissection: {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: 'advanced',
    reducedMotion: true, soundEnabled: false, revealedLayers: { skin: true },
    exploredOrgans: Object.fromEntries(Object.keys(cues).map(id => ['frog|' + id, true])),
    organNotes: { 'frog|dorsal_skin': 'Keep this observation while I practice again.' },
    organConfidence: { 'frog|dorsal_skin': 2 }, verifiedIdentifications: {}, guidedComplete: false,
  } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const w = window as any;
    w.__guidedAwards = [];
    w.__ctx.awardXP = (...args: unknown[]) => w.__guidedAwards.push(args);
    w.__rerender();
  });
  const targets = await finishRound(page, true);
  const earned = await awards(page);
  expect(earned.filter((entry: unknown[]) => entry[1] === 2)).toHaveLength(targets.length);
  expect(earned.filter((entry: unknown[]) => entry[1] === 10)).toHaveLength(1);
  const verified = await page.evaluate(() => (window as any).__ctx.toolData.dissection.verifiedIdentifications);
  expect(await finishRound(page)).toEqual(targets);
  expect(await awards(page)).toEqual(earned);
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.verifiedIdentifications)).toEqual(verified);
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes['frog|dorsal_skin']))
    .toBe('Keep this observation while I practice again.');
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.guidedComplete)).toBe(true);
  expect(errors).toEqual([]);
});
