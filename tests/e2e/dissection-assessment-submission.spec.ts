import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900,
  layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
test.describe.configure({ retries: 0, timeout: 90000 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.unmount(page));
async function state(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { score: d.quizFirstAttemptScore, total: d.quizFirstAttemptTotal, supported: d.quizSupportedCount,
      feedback: d.quizFeedback, retry: d.quizRetry, evidence: d.assessmentEvidence, awards: (window as any).__answerAwards };
  });
}

for (const width of [390, 1440]) {
  test(`rapid responses preserve the first attempt and allow supported retry at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 });
    await harness.mount(page, { dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: 'advanced',
      reducedMotion: true, soundEnabled: false, quizMode: true, quizAnswerMode: 'choices', quizSeed: 1234, quizIdx: 0,
      quizScore: 0, quizTotal: 0, quizFirstAttemptScore: 0, quizFirstAttemptTotal: 0, quizSupportedCount: 0,
      assessmentEvidence: {}, quizReviewQueue: [], exploredOrgans: { 'frog|nictitating': true },
    } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
    await page.evaluate(() => {
      const w = window as any; w.__answerAwards = [];
      w.__ctx.awardXP = (...args: unknown[]) => w.__answerAwards.push(args); w.__rerender();
    });
    const panel = page.locator('#diss-quiz-panel');
    const answer = panel.getByRole('button', { name: 'Tympanic Membrane', exact: true });
    await expect(answer).toBeVisible();
    // Synchronous native events exercise two callbacks before a deferred render commits.
    await panel.evaluate(node => {
      const buttons = [...node.querySelectorAll<HTMLButtonElement>('.diss-quiz-option')];
      const correct = buttons.find(button => button.textContent === 'Tympanic Membrane')!;
      const wrong = buttons.find(button => button !== correct)!;
      wrong.click(); correct.click();
    });
    let result = await state(page);
    expect(result.score).toBe(0); expect(result.total).toBe(1); expect(result.awards).toEqual([]);
    expect(result.evidence['frog|tympanum']).toBeUndefined();
    expect(result.retry.questionId).toBe('tympanum'); expect(result.feedback).toBeFalsy();
    await answer.click();
    await expect(panel).toContainText('Correct with support');
    result = await state(page);
    expect(result.score).toBe(0); expect(result.total).toBe(1); expect(result.supported).toBe(1);
    expect(result.feedback).toMatchObject({ correct: true, supported: true }); expect(result.awards).toEqual([]);
    await page.locator('#diss-quiz-continue').click();
    await expect(panel.locator('.diss-quiz-option').first()).toBeEnabled();
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.quizIdx)).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}
