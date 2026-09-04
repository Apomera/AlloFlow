import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_fisherlab.js', toolId: 'fisherLab', width: 1180, height: 980, appStyles: true, extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
async function openQuiz(page: any) {
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.locator('#fl-section-search').fill('quiz');
  await page.getByRole('button', { name: /Quiz.*Study|Study.*Quiz/ }).last().click();
  await page.getByRole('button', { name: 'Start 5-question round' }).click();
}
test('targets the selected misconception and returns from study with the answer and question preserved', async ({ page }) => {
  await openQuiz(page);
  const quiz = page.locator('[data-fisherlab-quiz]');
  await expect(quiz.locator('[data-quiz-explore]')).toHaveCount(0);
  await quiz.getByRole('button', { name: /Stop and wait/ }).click();
  await expect(quiz.locator('[data-quiz-misconception]')).toContainText('not an instruction to stop');
  const selected = await quiz.locator('[aria-pressed="true"]').getAttribute('data-quiz-option');
  await quiz.screenshot({ path: 'scratch/fisherlab-quiz-targeted-feedback-desktop.png' });
  await quiz.getByRole('button', { name: /Explore Buoyage/ }).click();
  const study = page.locator('[data-fisherlab-quiz-study]');
  await expect(page.locator('#fl-quiz-study-title')).toBeFocused();
  await expect(study).toContainText('travel direction');
  await study.locator('summary').click();
  await expect(study).toContainText('When returning from sea');
  await study.getByRole('button', { name: 'Return to quiz' }).click();
  await expect(page.locator('#fl-quiz-question-title')).toBeFocused();
  await expect(quiz).toHaveAttribute('data-quiz-bank-index', '0');
  await expect(quiz.locator('[aria-pressed="true"]')).toHaveAttribute('data-quiz-option', selected!);
  await expect(quiz.locator('[data-quiz-misconception]')).toContainText('not an instruction to stop');
  await quiz.getByRole('button', { name: 'Next question', exact: true }).click();
  await expect(quiz).toHaveAttribute('data-quiz-bank-index', '1');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
test('returns to the same expanded result item and preserves the first score through retry', async ({ page }) => {
  await openQuiz(page);
  const quiz = page.locator('[data-fisherlab-quiz]');
  for (let index=0;index<5;index++) {
    const q = await page.evaluate(i => (window as any).__FisherLabCore.getCoreQuizQuestion(i), index);
    await quiz.locator('[data-quiz-option="' + (index === 4 ? (q.correct + 1) % q.a.length : q.correct) + '"]').click();
    await quiz.getByRole('button', { name: index === 4 ? 'See round results' : 'Next question', exact: true }).click();
  }
  await expect(quiz.locator('[data-quiz-first-score]')).toHaveAttribute('data-quiz-first-score', '4/5');
  await quiz.getByText('Review answers & explanations', { exact: true }).click();
  await page.locator('#fl-quiz-review-4').getByRole('button', { name: /Explore Tides/ }).click();
  await page.getByRole('button', { name: 'Return to quiz', exact: true }).click();
  await expect(page.locator('#fl-quiz-review-4')).toBeFocused();
  await expect(page.locator('#fl-quiz-review-4')).toBeVisible();
  await expect(quiz.locator('[data-quiz-first-score]')).toHaveAttribute('data-quiz-first-score', '4/5');
  await quiz.getByRole('button', { name: 'Retry missed questions (1)' }).click();
  await expect(quiz).toHaveAttribute('data-quiz-bank-index', '4');
  await expect(quiz.locator('[data-quiz-explore]')).toHaveCount(0);
  const q = await page.evaluate(() => (window as any).__FisherLabCore.getCoreQuizQuestion(4));
  await quiz.locator('[data-quiz-option="' + q.correct + '"]').click();
  await expect(quiz.locator('[data-quiz-misconception]')).toHaveCount(0);
  await quiz.getByRole('button', { name: 'See round results' }).click();
  await expect(quiz.locator('[data-quiz-first-score]')).toHaveAttribute('data-quiz-first-score', '4/5');
  await expect(quiz.locator('[data-quiz-retry-score]')).toHaveAttribute('data-quiz-retry-score', '1/1');
});
test('feedback and study bridge remain readable and keyboard accessible on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 850 });
  await openQuiz(page);
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '360px'; });
  await page.getByRole('button', { name: 'Large text', exact: true }).click();
  const quiz = page.locator('[data-fisherlab-quiz]');
  await quiz.getByRole('button', { name: /Stop and wait/ }).focus();
  await page.keyboard.press('Enter');
  for (const selector of ['[data-fisherlab-quiz]', '[data-fisherlab-quiz-study]']) {
    const card = page.locator(selector);
    const metric = await card.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth, right: el.getBoundingClientRect().right }));
    expect(metric.scroll).toBeLessThanOrEqual(metric.client + 1);
    expect(metric.right).toBeLessThanOrEqual(360);
    const violations = await page.evaluate(async selector => (await (window as any).axe.run(selector, { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'aria-allowed-attr'] } })).violations.map((v: any) => v.id), selector);
    expect(violations).toEqual([]);
    await card.screenshot({ path: selector.includes('study') ? 'scratch/fisherlab-quiz-study-mobile.png' : 'scratch/fisherlab-quiz-targeted-mobile.png' });
    if (!selector.includes('study')) {
      await quiz.getByRole('button', { name: /Explore Buoyage/ }).focus();
      await page.keyboard.press('Enter');
    }
  }
  await page.getByRole('button', { name: 'Return to quiz', exact: true }).click();
  await expect(page.locator('#fl-quiz-question-title')).toBeFocused();
});
