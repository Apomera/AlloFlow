import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const ids = ['dorsal_skin', 'ventral_skin', 'tympanum', 'nictitating'];
const records = {
  exploredOrgans: Object.fromEntries(ids.map(id => ['frog|' + id, true])),
  organNotes: Object.fromEntries(ids.map(id => ['frog|' + id, 'Saved observation for ' + id])),
  organConfidence: Object.fromEntries(ids.map(id => ['frog|' + id, 2])),
};

test.describe.configure({ retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });

for (const { from, to, direction, key } of [
  { from: 'ventral_skin', to: 'dorsal_skin', direction: 'Previous', key: 'Enter' },
  { from: 'tympanum', to: 'nictitating', direction: 'Next', key: 'Space' },
]) test(`${direction} at the terminal structure keeps keyboard focus in its record`, async ({ page }) => {
  await harness.mount(page, { dissection: {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral',
    activeInstrument: 'probe', selectedOrgan: from, organSearch: '', directoryFilter: 'all',
    revealedLayers: {}, verifiedIdentifications: {}, workspaceMode: 'essentials',
    reducedMotion: true, soundEnabled: false, sceneDetail: false, ...records,
  } }, undefined, { expectCanvas: false });
  const button = page.getByRole('button', { name: direction + ' structure', exact: true });
  await button.focus();
  await page.keyboard.press(key);
  await expect(button).toBeDisabled();
  await expect(page.locator('#diss-selection-title')).toBeFocused();
  const state = await page.evaluate(() => (window as any).__ctx.toolData.dissection);
  expect(state.selectedOrgan).toBe(to);
  expect(state.exploredOrgans).toEqual(records.exploredOrgans);
  expect(state.organNotes).toEqual(records.organNotes);
  expect(state.organConfidence).toEqual(records.organConfidence);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: (direction === 'Next' ? 'Previous' : 'Next') + ' structure', exact: true })).toBeFocused();
});
