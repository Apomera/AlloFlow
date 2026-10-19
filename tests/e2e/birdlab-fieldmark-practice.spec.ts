import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 1280, height: 960, appStyles: true, layout: 'document',
});
test.describe.configure({ timeout: 90_000, retries: 0, mode: 'serial' });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, width: number, hostWidth = width) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.setViewportSize({ width, height: 960 });
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab);
  await page.evaluate(width => {
    localStorage.clear();
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.width = width + 'px';
    wrap.setAttribute('data-stem-tool-shell', 'true');
    (window as any).__mount({ birdLab: { view: 'fieldMarks', blLifeList: {}, blBadges: {}, blXp: 15 } });
  }, hostWidth);
  await expect(page.locator('[data-birdlab-fieldmarks]')).toBeVisible();
  return errors;
}

for (const width of [1280, 390]) {
  test(`field-mark practice: retry, reveal, keyboard answer, and honest completion at ${width}px`, async ({ page }) => {
    const errors = await mount(page, width);
    await page.getByRole('button', { name: 'Match the clue', exact: true }).click();
    const question = page.locator('[data-birdlab-practice-question]');
    const title = page.locator('#birdlab-practice-title');
    const progress = page.getByRole('progressbar', { name: 'Field mark practice progress' });
    await expect(title).toBeFocused();
    const first = await question.getAttribute('data-birdlab-practice-question');
    await page.locator(`[data-birdlab-practice-answer]:not([data-birdlab-practice-answer="${first}"])`).first().click();
    await expect(page.locator('.birdlab-practice-feedback')).toHaveAttribute('data-outcome', 'retry');
    await expect(progress).toHaveAttribute('aria-valuenow', '0');
    await expect(question).toHaveAttribute('data-birdlab-practice-question', first!);
    await page.getByRole('button', { name: 'Reveal this field mark', exact: true }).click();
    await expect(page.locator('.birdlab-practice-feedback')).toHaveAttribute('data-outcome', 'revealed');
    // Exercise a late/double activation without asking Playwright to click an
    // aria-disabled control; the handler must preserve the revealed outcome.
    await page.locator(`[data-birdlab-practice-answer="${first}"]`).dispatchEvent('click');
    await expect(page.locator('.birdlab-practice-feedback')).toHaveAttribute('data-outcome', 'revealed');
    await page.getByRole('button', { name: 'Next clue', exact: true }).click();
    await expect(title).toBeFocused();
    const second = await question.getAttribute('data-birdlab-practice-question');
    const diagramAnswer = page.locator(`[data-birdlab-fieldmark-target="${second}"]`);
    await diagramAnswer.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.birdlab-practice-feedback')).toHaveAttribute('data-outcome', 'matched');
    const total = Number(await progress.getAttribute('aria-valuemax'));
    for (let index = 2; index < total; index++) {
      await page.getByRole('button', { name: 'Next clue', exact: true }).click();
      const target = await question.getAttribute('data-birdlab-practice-question');
      await page.locator(`[data-birdlab-practice-answer="${target}"]`).click();
      await expect(page.locator('.birdlab-practice-feedback')).toHaveAttribute('data-outcome', 'matched');
    }
    await page.getByRole('button', { name: 'Finish this round', exact: true }).click();
    await expect(title).toBeFocused();
    await expect(question).toHaveAttribute('data-birdlab-practice-question', 'complete');
    await expect(page.locator('[data-birdlab-practice-matched]')).toHaveText(String(total - 1));
    await expect(page.locator('[data-birdlab-practice-revealed]')).toHaveText('1');
    expect(await page.evaluate(() => {
      const state = (window as any).__toolData.birdLab;
      return { lifeList: state.blLifeList, badges: state.blBadges, xp: state.blXp };
    })).toEqual({ lifeList: {}, badges: {}, xp: 15 });
    await page.getByRole('button', { name: 'Return to anatomy', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Explore anatomy', exact: true })).toBeFocused();
    await expect(page.locator('[data-birdlab-practice-question]')).toHaveCount(0);
    // Matching does not silently convert the exploration counter into a score.
    await expect(page.getByText('Hotspots explored:', { exact: true }).locator('..')).toContainText('0 /');
    expect(errors).toEqual([]);
  });
}

test('species keyboard navigation resets the round and preserves tab focus', async ({ page }) => {
  const errors = await mount(page, 1280);
  await page.getByRole('button', { name: 'Match the clue', exact: true }).click();
  await page.getByRole('button', { name: 'Reveal this field mark', exact: true }).click();
  await page.locator('[data-birdlab-fieldmark-species="chickadee"]').focus();
  await page.keyboard.press('ArrowRight');
  const warbler = page.locator('[data-birdlab-fieldmark-species="yrwarbler"]');
  await expect(warbler).toBeFocused();
  await expect(warbler).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-birdlab-fieldmarks]')).toHaveAttribute('data-birdlab-fieldmarks', 'yrwarbler');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(page.locator('.birdlab-practice-feedback')).toHaveAttribute('data-outcome', 'ready');
  await page.keyboard.press('End');
  await expect(page.locator('[data-birdlab-fieldmark-species="wtsparrow"]')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.locator('[data-birdlab-fieldmark-species="chickadee"]')).toBeFocused();
  await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
  await page.locator('[data-birdlab-fieldmark-target="cap"]').click();
  await expect(page.getByRole('heading', { name: 'Black cap', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the specimen and challenge stack in a narrow embedded pane on a desktop viewport', async ({ page }) => {
  const errors = await mount(page, 1280, 500);
  await page.getByRole('button', { name: 'Match the clue', exact: true }).click();
  const plate = await page.locator('.birdlab-fieldmarks-plate').boundingBox();
  const practice = await page.locator('.birdlab-fieldmark-practice').boundingBox();
  const wrap = await page.locator('#wrap').boundingBox();
  expect(plate!.width).toBeGreaterThan(400);
  expect(practice!.y).toBeGreaterThanOrEqual(plate!.y + plate!.height - 1);
  expect(practice!.x + practice!.width).toBeLessThanOrEqual(wrap!.x + wrap!.width + 1);
  expect(errors).toEqual([]);
});
