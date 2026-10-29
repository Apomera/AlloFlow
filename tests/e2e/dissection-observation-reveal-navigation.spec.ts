import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900,
  layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const ids = ['ventral_skin', 'pectoralis', 'rectus_abd', 'gastrocnemius', 'triceps_fem', 'sartorius', 'deltoid'];
const evidence = {
  exploredOrgans: Object.fromEntries(ids.map(id => ['frog|' + id, true])),
  organNotes: Object.fromEntries(ids.map(id => ['frog|' + id, 'Original observation: ' + id])),
  organConfidence: Object.fromEntries(ids.map(id => ['frog|' + id, 2])),
};
test.describe.configure({ retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.unmount(page));
async function mount(page: Page) {
  await harness.mount(page, { dissection: {
    specimen: 'frog', activeLayer: 'muscle', anatomicalView: 'ventral', _dissLoadedSpec: 'frog',
    workspaceMode: 'advanced', techniquePanelOpen: true, activeInstrument: 'probe', reducedMotion: false,
    soundEnabled: false, revealedLayers: { skin: true }, ...evidence,
    procedureByLayer: { muscle: { inspected: true, incisionStarted: true, incisionExtended: true, retracted: true,
      pins: [{ x: .3, y: .5 }, { x: .7, y: .5 }], probed: true, probedOrganId: 'pectoralis',
      history: ['inspect', 'pin', 'scalpel', 'scissors', 'forceps', 'probe'], actionLog: [{ action: 'probe', at: 2 }] } },
  } }, undefined, { expectCanvas: false });
  await page.locator('#diss-observation-review-title').click();
  const frozen = new Date('2026-10-29T12:00:00Z');
  await page.clock.install({ time: frozen }); await page.clock.pauseAt(new Date(frozen.getTime() + 1000));
  await page.locator('[data-next-action="peel-layer"] .diss-next-action__primary').click();
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection._incisionAnim.active)).toBe(true);
  await page.evaluate(() => { (window as any).__pendingPeel = (document.querySelector('[data-diss-canvas]') as any)._dissTimers.layerPeel; });
}
async function finishReveal(page: Page) {
  expect(await page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { layer: d.activeLayer, sameTimer: (document.querySelector('[data-diss-canvas]') as any)._dissTimers.layerPeel === (window as any).__pendingPeel };
  })).toEqual({ layer: 'muscle', sameTimer: true });
  await page.clock.runFor(550);
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.activeLayer)).toBe('organs');
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.revealedLayers)).toEqual({ skin: true, muscle: true });
  await page.clock.runFor(1400);
}
async function unchanged(page: Page) {
  expect(await page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { exploredOrgans: d.exploredOrgans, organNotes: d.organNotes, organConfidence: d.organConfidence };
  })).toEqual(evidence);
}

test('observation list waits for a reveal, then opens the saved note without a later layer jump', async ({ page }) => {
  await mount(page);
  const edit = page.locator('[data-observation-edit="ventral_skin"]');
  await expect(edit).toBeDisabled();
  await expect(page.locator('[data-observation-review-busy]')).toContainText('wait for the reveal to finish');
  await edit.evaluate((button: HTMLButtonElement) => button.click());
  await finishReveal(page);
  await expect(edit).toBeEnabled(); await edit.click(); await page.clock.runFor(1);
  await expect(page.locator('#diss-note-ventral_skin')).toBeFocused();
  await page.clock.runFor(2000);
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.activeLayer)).toBe('skin');
  await unchanged(page);
});

test('reading view remains open and readable until its record handoff is available', async ({ page }) => {
  await mount(page); await page.locator('[data-observation-reader-open]').click();
  const dialog = page.getByRole('dialog', { name: /Observation reading view/ });
  const edit = dialog.locator('[data-observation-reader-edit="ventral_skin"]');
  await expect(edit).toBeDisabled();
  await expect(dialog.locator('[data-observation-reader-busy]')).toContainText('keep reading saved notes');
  await expect(dialog.getByRole('region', { name: 'Your recorded note' })).toHaveText(evidence.organNotes['frog|ventral_skin']);
  await edit.evaluate((button: HTMLButtonElement) => button.click());
  await expect(dialog).toBeVisible();
  await finishReveal(page); await expect(dialog).toBeVisible(); await expect(edit).toBeEnabled();
  await edit.click(); await page.clock.runFor(1);
  await expect(dialog).toHaveCount(0); await expect(page.locator('#diss-note-ventral_skin')).toBeFocused();
  await unchanged(page);
});

test('layer stepper explains temporary lock and restores navigation after reveal', async ({ page }) => {
  await mount(page);
  const nav = page.locator('[data-dissection-layer-stepper]');
  const skin = nav.getByRole('button', { name: /^Layer 1:/ });
  await expect(skin).toBeDisabled();
  await expect(nav.locator('#diss-layer-help')).toContainText('Layer navigation will be available when it finishes');
  await nav.getByRole('region', { name: 'Anatomical layer access' }).focus();
  await expect(nav.getByRole('region', { name: 'Anatomical layer access' })).toBeFocused();
  await skin.evaluate((button: HTMLButtonElement) => button.click());
  await finishReveal(page); await expect(skin).toBeEnabled();
  await skin.click(); await page.clock.runFor(1000);
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.activeLayer)).toBe('skin');
  await unchanged(page);
});
