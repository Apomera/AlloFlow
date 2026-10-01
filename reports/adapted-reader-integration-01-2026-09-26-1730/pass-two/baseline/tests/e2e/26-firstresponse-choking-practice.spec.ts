import { expect, test } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js',
  toolId: 'firstResponse',
  width: 900,
  height: 720,
});

test.describe.configure({ timeout: 90_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const seed = () => ({
  firstResponse: { view: 'choking', consentAccepted: true, chokeView: 'practice' },
});

async function completeFiveAndFive(page: any, startName: RegExp, placementName: string | RegExp) {
  await harness.mount(page, seed(), undefined, { expectCanvas: false });
  const practiceTab = page.getByRole('tab', { name: 'Interactive practice' });
  const mountDebug = await page.evaluate(() => ({
    text: document.body.innerText.slice(0, 600), errors: (window as any).__events.errors,
  }));
  await expect(practiceTab, JSON.stringify(mountDebug)).toBeVisible();
  await practiceTab.click();
  await page.getByRole('button', { name: startName }).click();
  await page.getByRole('button', { name: /Severe obstruction/ }).click();
  await page.getByRole('button', { name: /Send someone to call 911/ }).click();
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: /Give back blow/ }).click();
  await page.getByRole('button', { name: placementName }).click();
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: /^Give .* thrust .* of 5$/ }).click();
  await page.getByRole('button', { name: /Lower safely.*start CPR/ }).click();
  await page.getByRole('button', { name: /remove the object only if visible/ }).click();
  await expect(page.getByText(/Complete with no recorded mistakes/)).toBeVisible();
  return page.evaluate(() => (window as any).__toolData.firstResponse.chokePracticeBest);
}

test.describe('First Response - interactive choking practice', () => {
  test('adult case rehearses back blows, abdominal thrusts, and CPR transition', async ({ page }) => {
    const summary = await completeFiveAndFive(page, /Start choking scenario: Cafeteria/, 'Fist just above the navel');
    expect(summary).toMatchObject({ caseId: 'adult', mistakes: 0 });
    expect(summary.sequence).toEqual([
      'recognize-severe', 'activate-911', 'five-back-blows',
      'correct-abdomen-placement', 'five-thrusts',
      'start-cpr-compressions', 'remove-visible-object-only',
    ]);
  });

  test('infant case uses the heel-of-one-hand chest-thrust placement', async ({ page }) => {
    const summary = await completeFiveAndFive(page, /Start choking scenario: Day care/, 'Heel of one hand on the breastbone');
    expect(summary).toMatchObject({ caseId: 'infant', mistakes: 0 });
    expect(summary.sequence).toContain('correct-infant-placement');
  });

  test('late-pregnancy case uses chest thrusts instead of abdominal thrusts', async ({ page }) => {
    const summary = await completeFiveAndFive(page, /Start choking scenario: Restaurant/, 'Fist on the center of the breastbone');
    expect(summary).toMatchObject({ caseId: 'pregnant', mistakes: 0 });
    expect(summary.sequence).toContain('correct-chest-placement');
  });
});
