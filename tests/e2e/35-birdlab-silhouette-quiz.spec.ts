/**
 * Bird Lab — Silhouette Quiz: the options hold still and each question scores once.
 *
 * The three wrong options were chosen with Math.random() inside render, and the
 * four were shuffled the same way, so any state change re-rolled them: picking an
 * answer set the feedback, the component re-rendered, and the buttons changed
 * under the student's click. The buttons never locked, so clicking the right
 * answer again added another point, and every click counted as an attempt.
 */
import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolId: 'birdLab',
  toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 1100,
  height: 900,
  appStyles: true,
  layout: 'document',
});

test.describe.configure({ timeout: 300_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const RAPTORS = ['eagle', 'osprey', 'turkeyvulture', 'redtailhawk', 'cooper', 'kestrel', 'peregrine'];

async function mount(page: Page) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(() => (window as any).__mount({ birdLab: { view: 'silhouetteQuiz' } }));
  await page.waitForSelector('[data-sil-choice]', { timeout: 30000 });
}
const choiceIds = (page: Page) => page.locator('[data-sil-choice]').evaluateAll(
  (els) => els.map((e) => e.getAttribute('data-sil-choice') as string));
const scoreLine = (page: Page) => page.getByText(/Score: \d+ \/ \d+/);

test('answering does not reshuffle the options', async ({ page }) => {
  await mount(page);
  const before = await choiceIds(page);
  expect(before).toHaveLength(4);
  expect(before).toContain('eagle');          // question 1 is the Bald Eagle
  const wrong = before.find((id) => id !== 'eagle') as string;
  await page.locator(`[data-sil-choice="${wrong}"]`).click();
  await expect(page.getByRole('status')).toContainText('Correct: Bald Eagle');
  expect(await choiceIds(page)).toEqual(before);
  await expect(page.locator('[data-sil-choice="eagle"]')).toContainText('✓');
  await expect(page.locator(`[data-sil-choice="${wrong}"]`)).toContainText('✗');
});

test('a question scores once, however many times it is clicked', async ({ page }) => {
  await mount(page);
  // force: a locked option is aria-disabled, which Playwright refuses to click,
  // but a student's pointer still lands on it; the handler must ignore it.
  await page.locator('[data-sil-choice="eagle"]').click();
  await page.locator('[data-sil-choice="eagle"]').click({ force: true });
  await page.locator('[data-sil-choice="eagle"]').click({ force: true });
  await expect(scoreLine(page)).toContainText('Score: 1 / 1');
  for (const id of await choiceIds(page)) {
    await expect(page.locator(`[data-sil-choice="${id}"]`)).toHaveAttribute('aria-disabled', 'true');
  }
  await page.getByRole('button', { name: /Next silhouette/ }).click();
  await expect(page.locator('[data-sil-choice="osprey"]')).not.toHaveAttribute('aria-disabled', 'true');
  await page.locator('[data-sil-choice="osprey"]').click();
  await page.locator('[data-sil-choice="osprey"]').click({ force: true });
  await expect(scoreLine(page)).toContainText('Score: 2 / 2');
});

test('a raptor question offers raptor distractors', async ({ page }) => {
  await mount(page);
  const ids = await choiceIds(page);
  for (const id of ids) expect(RAPTORS, `${id} is not a raptor`).toContain(id);
});
