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
}
async function question(page: any) {
  return page.evaluate(() => {
    const index = Number(document.querySelector('[data-quiz-bank-index]')!.getAttribute('data-quiz-bank-index'));
    return { index, ...(window as any).__FisherLabCore.getCoreQuizQuestion(index) };
  });
}
test('shows explanations before advancing and retries errors without inflating the first score', async ({ page }) => {
  await openQuiz(page);
  await page.getByRole('button', { name: 'Start 5-question round' }).click();
  const quiz = page.locator('[data-fisherlab-quiz]');
  await expect(page.locator('#fl-quiz-question-title')).toBeFocused();
  for (let i = 0; i < 5; i++) {
    const q = await question(page);
    const pick = i === 0 ? (q.correct + 1) % q.a.length : q.correct;
    await quiz.locator('[data-quiz-option="' + pick + '"]').click();
    await expect(quiz).toHaveAttribute('data-quiz-bank-index', String(q.index));
    await expect(quiz.getByRole('status')).toContainText(q.explain);
    await expect(quiz.locator('[data-quiz-option="' + pick + '"]')).toHaveAttribute('aria-disabled', 'true');
    if (i === 0) {
      await quiz.locator('[data-quiz-option="' + q.correct + '"]').focus();
      await page.keyboard.press('Enter');
      await expect(quiz.locator('[data-quiz-option="' + pick + '"]')).toHaveAttribute('aria-pressed', 'true');
      await expect(quiz.getByRole('link', { name: /US Coast Guard/ })).toBeVisible();
      await quiz.screenshot({ path: 'scratch/fisherlab-quiz-feedback-desktop.png' });
    }
    await quiz.getByRole('button', { name: i === 4 ? 'See round results' : 'Next question', exact: true }).click();
    await expect(page.locator(i === 4 ? '#fl-quiz-results-title' : '#fl-quiz-question-title')).toBeInViewport();
  }
  await expect(quiz.locator('[data-quiz-first-score]')).toHaveAttribute('data-quiz-first-score', '4/5');
  await expect(page.locator('#fl-quiz-results-title')).toBeFocused();
  await quiz.getByRole('button', { name: 'Retry missed questions (1)' }).click();
  await expect(quiz).toContainText('Question 1 of 1');
  const retry = await question(page);
  expect(retry.index).toBe(0);
  await quiz.locator('[data-quiz-option="' + retry.correct + '"]').click();
  await quiz.getByRole('button', { name: 'See round results' }).click();
  await expect(quiz.locator('[data-quiz-first-score]')).toHaveAttribute('data-quiz-first-score', '4/5');
  await expect(quiz.locator('[data-quiz-retry-score]')).toHaveAttribute('data-quiz-retry-score', '1/1');
  await expect(quiz.getByRole('button', { name: /Retry missed/ })).toHaveCount(0);
  await quiz.screenshot({ path: 'scratch/fisherlab-quiz-results-desktop.png' });
  await quiz.getByRole('button', { name: 'Start another round' }).click();
  await expect(quiz).toHaveAttribute('data-quiz-bank-index', '5');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
test('retains the full-bank option and provides accessible mobile feedback', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 850 });
  await openQuiz(page);
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '360px'; });
  await page.getByRole('button', { name: 'Large text', exact: true }).click();
  await page.getByLabel('Round length', { exact: true }).selectOption('full');
  await page.getByRole('button', { name: 'Start full-bank round' }).click();
  const total = await page.evaluate(() => (window as any).__FisherLabCore.getCoreQuizAnswerDistribution().total);
  const quiz = page.locator('[data-fisherlab-quiz]');
  await expect(quiz).toContainText('Question 1 of ' + total);
  const q = await question(page);
  await quiz.locator('[data-quiz-option="' + q.correct + '"]').focus();
  await page.keyboard.press('Enter');
  await expect(quiz.getByRole('status')).toContainText('Correct — here is why');
  const violations = await page.evaluate(async () => (await (window as any).axe.run('[data-fisherlab-quiz]', { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'aria-allowed-attr'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
  expect(violations).toEqual([]);
  const size = await quiz.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth, right: el.getBoundingClientRect().right }));
  expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
  expect(size.right).toBeLessThanOrEqual(360);
  await quiz.screenshot({ path: 'scratch/fisherlab-quiz-feedback-mobile.png' });
});
