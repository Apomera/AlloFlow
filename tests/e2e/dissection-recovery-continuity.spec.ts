import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900,
  layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
test.describe.configure({ retries: 0, timeout: 90000 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.unmount(page));
async function learningEvidence(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return Object.fromEntries(['assessmentEvidence', 'assessmentRecordedScore', 'assessmentRecordedTotal',
      'quizFirstAttemptScore', 'quizFirstAttemptTotal', 'organNotes', 'organConfidence', 'exploredOrgans',
      'verifiedIdentifications'].map(key => [key, d[key]]));
  });
}

for (const width of [390, 1440]) {
  test(`completed review work survives leaving and reopening review at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 });
    await harness.mount(page, { dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: 'advanced',
      reducedMotion: true, soundEnabled: false, quizMode: true, quizReviewMode: true, quizAnswerMode: 'choices',
      quizReviewQueue: ['tympanum', 'dorsal_skin'], quizSeed: 1234, quizIdx: 0, quizTotal: 0, quizScore: 0,
      quizFirstAttemptScore: 2, quizFirstAttemptTotal: 4, assessmentRecordedScore: 2, assessmentRecordedTotal: 4,
      assessmentCompletedAt: 100, assessmentEvidence: {}, verifiedIdentifications: {},
      exploredOrgans: { 'frog|tympanum': true, 'frog|dorsal_skin': true },
      organNotes: { 'frog|tympanum': 'A round membrane behind the eye.' }, organConfidence: { 'frog|tympanum': 2 },
    } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
    const before = await learningEvidence(page);
    const panel = page.locator('#diss-quiz-panel');
    await panel.getByRole('button', { name: 'Tympanic Membrane', exact: true }).click();
    await expect(panel).toContainText('Correct with support');
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.quizReviewQueue)).toEqual(['dorsal_skin']);
    await page.locator('#diss-quiz-continue').click();
    await expect(panel).toContainText('Question 2/2');
    await expect(panel.getByRole('button', { name: 'Dorsal Skin', exact: true })).toBeEnabled();
    await page.locator('#diss-route-explore').click();
    await expect(page.locator('#diss-review-missed-structures')).toContainText('Review 1 missed structure');
    await page.locator('#diss-review-missed-structures').click();
    await expect(panel).toContainText('Question 1/1');
    await panel.getByRole('button', { name: 'Dorsal Skin', exact: true }).click();
    await page.locator('#diss-quiz-continue').click();
    await expect(page.locator('#diss-assessment-summary')).toBeVisible();
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.quizReviewQueue)).toEqual([]);
    expect(await learningEvidence(page)).toEqual(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test('a denied reset leaves the pending layer reveal able to finish', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 950 });
  const structures = ['dorsal_skin', 'ventral_skin', 'tympanum', 'nictitating'];
  await harness.mount(page, { dissection: {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', workspaceMode: 'advanced',
    techniquePanelOpen: true, toolbarToolsOpen: true, activeInstrument: 'probe', reducedMotion: false, soundEnabled: false,
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
  const before = await learningEvidence(page);
  await page.evaluate(() => {
    const original = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (key: string) {
      if (key === 'dissection_progress_frog') throw new DOMException('Deletion denied', 'SecurityError');
      return original.call(this, key);
    };
  });
  await page.locator('[data-next-action="peel-layer"] .diss-next-action__primary').click();
  await page.locator('#diss-reset-specimen').click();
  await page.locator('#diss-reset-confirm').click();
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback.message)).toContain('Reset could not continue');
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection._incisionAnim.active)).toBe(true);
  await page.clock.runFor(550);
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.activeLayer)).toBe('muscle');
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.revealedLayers.skin)).toBe(true);
  expect(await learningEvidence(page)).toEqual(before);
  expect(errors).toEqual([]);
});
