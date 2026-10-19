import { test, expect, type Page, type Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  width: 1280, height: 960, appStyles: true, layout: 'document',
});
test.describe.configure({ mode: 'serial', retries: 0, timeout: 90_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, section: string, hostWidth = 1280) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { raptorHunt: { activeSection: section } }, undefined, { expectCanvas: false });
  await page.evaluate(width => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.width = width + 'px';
    wrap.style.maxWidth = '100%';
    wrap.setAttribute('data-stem-tool-shell', 'true');
  }, hostWidth);
  return errors;
}

async function revealSolution(page: Page) {
  for (const name of ['Show the approach', 'Show the calculation', 'Show answer and interpretation']) {
    await page.getByRole('button', { name, exact: true }).click();
  }
}

async function expectInsideHost(page: Page, content: Locator) {
  await expect(content).toBeVisible();
  const host = await page.locator('#wrap').boundingBox();
  const box = await content.boundingBox();
  expect(host).not.toBeNull();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(host!.x - 1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(host!.x + host!.width + 1);
  expect(await content.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
}

test('life-history comparison preserves intervals, open ranges, and unknown mortality', async ({ page }) => {
  const errors = await mount(page, 'demographics');
  const explorer = page.locator('[data-life-history-explorer]');
  const first = explorer.locator('[data-life-profile=A]');
  const second = explorer.locator('[data-life-profile=B]');
  const primary = page.getByRole('combobox', { name: 'Life-history species', exact: true });
  const comparison = page.getByRole('combobox', { name: 'Compare life history with', exact: true });
  await expect(first).toContainText('20-30 years (wild), 50+ (captive)');
  await primary.selectOption('7');
  await comparison.selectOption('11');
  await expect(first).toContainText('60+ years');
  await expect(first).toContainText('1 egg / 2 years');
  await expect(first.locator('.rh-life-open-range')).toBeVisible();
  await expect(second).toContainText('1 egg / 2-3 years');
  await page.getByRole('button', { name: 'First-year mortality', exact: true }).click();
  await expect(explorer.locator('[data-life-lens]')).toHaveAttribute('data-life-lens', 'mortality');
  await expect(first.locator('[data-life-mortality]')).toHaveAttribute('data-life-mortality', 'Variable');
  await expect(first.locator('[data-cohort-band]')).toHaveCount(0);
  await expect(first).toContainText('No percentage has been assumed.');
  await primary.selectOption('1');
  await expect(first.locator('[data-cohort-band=mortality]')).toHaveCount(60);
  await expect(first.locator('[data-cohort-band=range]')).toHaveCount(10);
  await expect(first.locator('[data-cohort-band=remainder]')).toHaveCount(30);
  await primary.selectOption('0');
  await expect(first.locator('[data-life-mortality]')).toHaveAttribute('data-life-mortality', '~50%');
  // Selecting the comparison as the primary swaps the two, rather than losing a profile.
  await primary.selectOption('11');
  await expect(primary).toHaveValue('11');
  await expect(comparison).toHaveValue('0');
  await page.getByText('Open the complete reference table', { exact: true }).click();
  await expect(page.getByRole('table')).toContainText('<0.01 pairs / km²');
  await expect(page.getByRole('table')).toContainText('Effectively zero — managed population');
  expect(errors).toEqual([]);
});

test('math notes and staged solutions stay with each exercise, while self-review stays honest', async ({ page }) => {
  const errors = await mount(page, 'mathlab');
  const workbook = page.locator('[data-raptor-math-workbook]');
  const prediction = page.getByRole('textbox', { name: 'My prediction or answer', exact: true });
  const reasoning = page.getByRole('textbox', { name: 'My reasoning, units, and assumptions', exact: true });
  const exercise = page.getByRole('combobox', { name: 'Choose an exercise', exact: true });
  const review = page.locator('[data-math-review]');
  await expect(workbook).toHaveAttribute('data-math-stage', '0');
  await expect(review).toBeDisabled();
  await prediction.fill('9 kg/m²');
  await reasoning.fill('Divide 0.9 kg by 0.1 m².');
  await expect(review).toBeDisabled();
  await page.getByRole('button', { name: 'Show the approach', exact: true }).click();
  await expect(workbook).toHaveAttribute('data-math-stage', '1');
  await expect(page.locator('[data-math-solution=approach]')).toBeVisible();
  await expect(page.locator('[data-math-solution=calculation]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show the calculation', exact: true }).click();
  await expect(page.locator('[data-math-solution=calculation]')).toContainText('0.9 ÷ 0.1');
  await expect(page.locator('[data-math-solution=answer]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show answer and interpretation', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(workbook).toHaveAttribute('data-math-stage', '3');
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[data-raptor-math-workbook]'))).toBe(true);
  await expect(review).toHaveAttribute('aria-pressed', 'false');
  await expect(review).toBeEnabled();
  await review.click();
  await expect(review).toHaveAttribute('aria-pressed', 'true');
  await expect(workbook).toContainText('1 / 20');
  await exercise.selectOption('1');
  await expect(workbook).toHaveAttribute('data-math-stage', '0');
  await expect(prediction).toHaveValue('');
  await expect(reasoning).toHaveValue('');
  await prediction.fill('3 kg/m²');
  await exercise.selectOption('0');
  await expect(prediction).toHaveValue('9 kg/m²');
  await expect(reasoning).toHaveValue('Divide 0.9 kg by 0.1 m².');
  await expect(workbook).toHaveAttribute('data-math-stage', '3');
  await expect(review).toHaveAttribute('aria-pressed', 'true');
  await reasoning.fill('Mass divided by area, with units retained.');
  await expect(review).toHaveAttribute('aria-pressed', 'false');
  await expect(workbook).toContainText('0 / 20');
  await page.getByRole('button', { name: 'Hide solution', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(workbook).toHaveAttribute('data-math-stage', '0');
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[data-raptor-math-workbook]'))).toBe(true);
  await expect(prediction).toHaveValue('9 kg/m²');
  await expect(review).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.mathWorkings[1].prediction)).toBe('3 kg/m²');
  expect(errors).toEqual([]);
});

test('worked arithmetic corrections and fractional expectations remain visible', async ({ page }) => {
  const errors = await mount(page, 'mathlab');
  const exercise = page.getByRole('combobox', { name: 'Choose an exercise', exact: true });
  const cases = [
    { index: '4', expected: /145/ },
    { index: '12', expected: /3\.1/ },
    { index: '17', expected: /18\.6/ },
    { index: '19', expected: /155/ },
  ];
  for (const item of cases) {
    await exercise.selectOption(item.index);
    await revealSolution(page);
    await expect(page.locator('[data-math-solution=answer]')).toContainText(item.expected);
    await expect(page.locator('[data-math-review]')).toBeDisabled();
  }
  await page.getByRole('combobox', { name: 'Exercise topic', exact: true }).selectOption('Reproductive Math');
  await expect(exercise).toHaveValue('11');
  await revealSolution(page);
  await expect(page.locator('[data-math-solution=calculation]')).toContainText('5.5');
  await expect(page.locator('[data-math-solution=answer]')).toContainText(/expect|average/i);
  expect(errors).toEqual([]);
});

test('habitat role selection works from the keyboard and follows the selected habitat', async ({ page }) => {
  const errors = await mount(page, 'ecology');
  await page.getByRole('button', { name: /Food Webs by Habitat/ }).click();
  const community = page.locator('[data-habitat-community]');
  const habitat = page.getByRole('combobox', { name: 'Explore a habitat', exact: true });
  await expect(community).toHaveAttribute('data-community-selected', 'raptors');
  await expect(community.locator('[data-community-detail]')).toContainText("Cooper's hawk");
  const prey = community.getByRole('button', { name: 'Prey resources', exact: true });
  await prey.focus();
  await page.keyboard.press('Enter');
  await expect(prey).toBeFocused();
  await expect(prey).toHaveAttribute('aria-pressed', 'true');
  await expect(community.locator('[data-community-detail=prey]')).toContainText('Squirrels, chipmunks');
  await habitat.selectOption('4');
  await expect(community).toHaveAttribute('data-community-habitat', '4');
  await expect(community).toHaveAttribute('data-community-selected', 'prey');
  await expect(community.locator('[data-community-detail=prey]')).toContainText('snail kite specializes on apple snails');
  await community.getByRole('button', { name: 'Other consumers', exact: true }).click();
  await expect(community.locator('[data-community-detail=competitors]')).toContainText('Herons, egrets, otters');
  await community.getByRole('button', { name: 'Habitat pressures', exact: true }).click();
  await expect(community.locator('[data-community-detail=threats]')).toContainText('Wetland drainage');
  await community.getByRole('button', { name: 'Ecological roles', exact: true }).click();
  await expect(community.locator('[data-community-detail=services]')).toContainText('Indicator of water quality');
  await community.getByRole('button', { name: 'Raptor community', exact: true }).click();
  await expect(community.locator('[data-community-detail=raptors]')).toContainText('snail kite (Florida)');
  await expect(community).toContainText('Food → consumer: energy transfer');
  await expect(community).toContainText('Dashed: possible resource competition');
  await expect(community).toContainText('It does not connect every listed raptor to every prey item.');
  // Switch away and back to exercise saved selection, without constructing a new scenario.
  await page.getByRole('button', { name: /Niche Concepts/ }).click();
  await expect(community).toHaveCount(0);
  await page.getByRole('button', { name: /Food Webs by Habitat/ }).click();
  await expect(habitat).toHaveValue('4');
  await expect(community.locator('[data-community-role][aria-pressed=true]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

for (const activity of [
  { section: 'demographics', root: '[data-life-history-explorer]', first: '[data-life-profile=A]', second: '[data-life-profile=B]' },
  { section: 'mathlab', root: '[data-raptor-math-workbook]', first: '.rh-math-question', second: '.rh-math-notebook' },
  { section: 'ecology', root: '[data-habitat-community]', first: '.rh-community-map-panel', second: '.rh-community-detail' },
]) {
  test(`${activity.section} stacks and stays usable inside a 500px desktop pane`, async ({ page }) => {
    const errors = await mount(page, activity.section, 500);
    if (activity.section === 'ecology') await page.getByRole('button', { name: /Food Webs by Habitat/ }).click();
    const root = page.locator(activity.root);
    await expectInsideHost(page, root);
    const first = await root.locator(activity.first).boundingBox();
    const second = await root.locator(activity.second).boundingBox();
    expect(first!.width).toBeGreaterThan(350);
    expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height - 1);
    for (const control of await root.locator('select, textarea, button').all()) {
      await expectInsideHost(page, control);
    }
    expect(errors).toEqual([]);
  });
}
