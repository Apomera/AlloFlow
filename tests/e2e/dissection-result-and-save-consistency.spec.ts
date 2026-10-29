import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900,
  layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
test.describe.configure({ retries: 0, timeout: 90000 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.unmount(page));

for (const width of [390, 1440]) {
  test(`completed support count stays with its result through a new assessment and review at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 });
    await harness.mount(page, { dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: 'advanced',
      reducedMotion: true, soundEnabled: false, quizMode: true, quizComplete: true, quizSeed: 1234,
      quizScore: 2, quizTotal: 4, quizFirstAttemptScore: 2, quizFirstAttemptTotal: 4, quizSupportedCount: 2,
      assessmentCompletedAt: 100, assessmentRecordedScore: 2, assessmentRecordedTotal: 4, assessmentRecordedSupportedCount: 2,
      quizReviewQueue: ['dorsal_skin'], exploredOrgans: { 'frog|dorsal_skin': true },
      organNotes: { 'frog|dorsal_skin': 'A moist surface on the back.' }, organConfidence: { 'frog|dorsal_skin': 2 },
    } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
    await page.getByRole('button', { name: 'Try a new assessment', exact: true }).click();
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.quizSupportedCount)).toBe(0);
    await page.locator('#diss-route-explore').click();
    await page.getByRole('button', { name: 'Lab tool options', exact: true }).click();
    await page.getByText('Review and export lab report', { exact: true }).click();
    await expect(page.locator('#diss-lab-report-preview')).toContainText('Completed first-attempt assessment: 2/4; supported practice: 2');
    await page.locator('#diss-review-missed-structures').click();
    await page.locator('#diss-quiz-panel').getByRole('button', { name: 'Dorsal Skin', exact: true }).click();
    await page.locator('#diss-quiz-continue').click();
    await expect(page.locator('[data-assessment-support-summary]')).toContainText('2');
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.assessmentRecordedSupportedCount)).toBe(2);
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes['frog|dorsal_skin']))
      .toBe('A moist surface on the back.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test('a specimen switch catches storage changes even after autosave has finished', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 950 });
  const note = 'Keep my local observation available for export.';
  await harness.mount(page, { dissection: {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', workspaceMode: 'advanced', reducedMotion: true,
    soundEnabled: false, exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: { 'frog|dorsal_skin': note },
    organConfidence: { 'frog|dorsal_skin': 2 },
  } }, undefined, { expectCanvas: false });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dissection_progress_frog') || '{}').organNotes?.['frog|dorsal_skin'])).toBe(note);
  // There must be no queued autosave whose existing write checks could mask the departure check.
  await page.waitForTimeout(250);
  const external = await page.evaluate(() => {
    const key = 'dissection_progress_frog', other = JSON.parse(localStorage.getItem(key)!);
    other.organNotes['frog|dorsal_skin'] = 'A newer saved observation from another writer.';
    const raw = JSON.stringify(other); localStorage.setItem(key, raw);
    (document.querySelector('#diss-specimen-tab-pig') as HTMLButtonElement).click();
    return raw;
  });
  await expect(page.locator('#diss-specimen-tab-frog')).toHaveAttribute('aria-selected', 'true');
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes['frog|dorsal_skin'])).toBe(note);
  expect(await page.evaluate(() => localStorage.getItem('dissection_progress_frog'))).toBe(external);
  await page.getByRole('button', { name: 'Export current session report', exact: true }).click();
  await expect(page.locator('#diss-lab-report-preview')).toContainText(note);
  await expect(page.locator('#diss-lab-report-preview')).not.toContainText('A newer saved observation from another writer.');
  expect(await page.evaluate(() => localStorage.getItem('dissection_progress_frog'))).toBe(external);
  expect(errors).toEqual([]);
});
