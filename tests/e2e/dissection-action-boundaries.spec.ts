import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900,
  layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
test.describe.configure({ retries: 0, timeout: 90000 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.unmount(page));

test('deferred copy results leave newer selections and specimen feedback intact', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 950 });
  await harness.mount(page, { dissection: {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', workspaceMode: 'advanced', reducedMotion: true,
    toolbarToolsOpen: true, _labReportPreviewOpen: true, organNotes: { 'frog|dorsal_skin': 'The original frog note.' },
  } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const w = window as any; w.__copies = []; w.__copyAnnouncements = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: (text: string) => new Promise((resolve, reject) => w.__copies.push({ text, resolve, reject })),
    } });
    document.execCommand = () => false;
    w.__ctx.announceToSR = (text: string) => w.__copyAnnouncements.push(text); w.__rerender();
  });
  await page.getByRole('button', { name: 'Copy lab report to clipboard', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__copies.length)).toBe(1);
  await page.getByRole('button', { name: 'Select report', exact: true }).click();
  const selected = await page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback);
  await page.evaluate(async () => { (window as any).__copies[0].resolve(); await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback)).toEqual(selected);
  await expect(page.locator('#diss-lab-report-preview')).toBeFocused();
  await page.getByRole('button', { name: 'Copy lab report to clipboard', exact: true }).click();
  await page.locator('#diss-specimen-tab-pig').click();
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection._dissLoadedSpec)).toBe('pig');
  const afterSwitch = await page.evaluate(() => ({ feedback: (window as any).__ctx.toolData.dissection.procedureFeedback,
    toasts: (window as any).__events.toasts, announcements: (window as any).__copyAnnouncements }));
  await page.evaluate(async () => { (window as any).__copies[1].reject(new Error('Clipboard denied'));
    await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(await page.evaluate(() => ({ feedback: (window as any).__ctx.toolData.dissection.procedureFeedback,
    toasts: (window as any).__events.toasts, announcements: (window as any).__copyAnnouncements }))).toEqual(afterSwitch);
  expect(errors).toEqual([]);
});

for (const width of [390, 1440]) {
  test(`Undo stays unavailable while a completed layer is opening at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 });
    const structures = ['dorsal_skin', 'ventral_skin', 'tympanum', 'nictitating'];
    await harness.mount(page, { dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral',
      workspaceMode: 'advanced', techniquePanelOpen: true, activeInstrument: 'probe', reducedMotion: false, soundEnabled: false,
      exploredOrgans: Object.fromEntries(structures.map(id => ['frog|' + id, true])),
      organNotes: Object.fromEntries(structures.map(id => ['frog|' + id, 'Recorded specimen evidence for ' + id])),
      organConfidence: Object.fromEntries(structures.map(id => ['frog|' + id, 2])),
      procedureByLayer: { skin: { inspected: true, incisionStarted: true, incisionExtended: true, retracted: true,
        pins: [{ x: .3, y: .5 }, { x: .7, y: .5 }], probed: true, probedOrganId: 'ventral_skin',
        history: ['inspect', 'pin', 'scalpel', 'scissors', 'forceps', 'probe'],
        actionLog: [{ action: 'inspect', at: 1 }, { action: 'probe', at: 2 }],
      } },
    } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
    const frozen = new Date('2026-10-29T12:00:00Z');
    await page.clock.install({ time: frozen }); await page.clock.pauseAt(frozen);
    const before = await page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureByLayer);
    await page.locator('[data-next-action="peel-layer"] .diss-next-action__primary').click();
    await expect(page.locator('#diss-undo-procedure')).toBeDisabled();
    await expect(page.locator('#diss-undo-unavailable')).toBeVisible();
    await page.locator('#diss-undo-procedure').evaluate((node: HTMLButtonElement) => node.click());
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureByLayer)).toEqual(before);
    await page.clock.runFor(550);
    await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.activeLayer)).toBe('muscle');
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.revealedLayers.skin)).toBe(true);
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureByLayer.skin.probed)).toBe(true);
    expect(errors).toEqual([]);
  });
}
