import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_probability.js',
  toolId: 'probability',
  width: 320,
  height: 1800,
  appStyles: true,
});

const LONG_LABEL = 'RedMarbleWithAnExtraordinarilyLongUnbrokenNameForNarrowScreens';

test.describe.configure({ timeout: 120_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('dependent bag tree is keyboard-operable, semantic, and reflows at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1800 });
  await harness.mount(page, { probability: {
    mode: 'tree',
    treeEventMode: 'coin',
    customSubMode: 'fraction',
    customOutcomes: [
      { label: LONG_LABEL, count: 1, numerator: 1, denominator: 3, color: '#0f766e' },
      { label: 'Blue', count: 2, numerator: 2, denominator: 3, color: '#1d4ed8' },
    ],
  } }, undefined, { expectCanvas: false });

  const region = page.getByRole('region', { name: /Two-Event Compound Probability Tree/i });
  await expect(region).toBeVisible();
  await expect(region).toHaveAttribute('aria-labelledby', 'prob-tree-heading');
  await expect(region.getByRole('heading', { name: /Two-Event Compound Probability Tree/i }))
    .toHaveAttribute('id', 'prob-tree-heading');

  const modelGroup = region.getByRole('group', { name: 'Choose a probability tree model' });
  await expect(modelGroup).toBeVisible();
  const modelButtons = modelGroup.getByRole('button');
  await expect(modelButtons).toHaveCount(5);
  expect(await modelButtons.evaluateAll((buttons) => buttons.every((button) => button.hasAttribute('aria-pressed'))))
    .toBe(true);

  const bagButton = modelGroup.getByRole('button', { name: /Bag \(no replacement\)/i });
  await expect(bagButton).toHaveAttribute('aria-pressed', 'false');
  await bagButton.focus();
  await expect(bagButton).toBeFocused();
  await page.keyboard.press('Space');
  await expect(bagButton).toHaveAttribute('aria-pressed', 'true');
  await expect(bagButton).toBeFocused();

  const detailsSummary = region.getByText('Ordered path data table (4 paths)', { exact: true });
  await detailsSummary.focus();
  await expect(detailsSummary).toBeFocused();
  await page.keyboard.press('Enter');

  const table = region.getByRole('table', {
    name: 'All ordered outcomes for two draws without replacement',
  });
  await expect(table).toBeVisible();
  await expect(table.getByRole('columnheader')).toHaveCount(5);

  const possiblePath = table.getByRole('row')
    .filter({ hasText: `P(${LONG_LABEL} then Blue)` });
  await expect(possiblePath).toHaveCount(1);
  await expect(possiblePath).toContainText('1/3 = 33.3%');
  await expect(possiblePath).toContainText('2/2 = 100.0%');
  await expect(possiblePath).toContainText(`P(${LONG_LABEL} then Blue) = 2/6 = 33.3%`);

  const impossiblePath = table.getByRole('row')
    .filter({ hasText: `P(${LONG_LABEL} then ${LONG_LABEL})` });
  await expect(impossiblePath).toHaveCount(1);
  await expect(impossiblePath).toContainText('0/2 = 0.0%');
  await expect(impossiblePath).toContainText(
    `P(${LONG_LABEL} then ${LONG_LABEL}) = 0/6 = 0.0% (impossible)`,
  );
  await expect(region.getByText('Impossible \u00b7 0%', { exact: true })).toBeVisible();

  const fit = await region.evaluate((element) => {
    const wrap = document.getElementById('wrap')!;
    const panelRect = element.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    return {
      panelClientWidth: element.clientWidth,
      panelScrollWidth: element.scrollWidth,
      wrapClientWidth: wrap.clientWidth,
      wrapScrollWidth: wrap.scrollWidth,
      panelLeft: panelRect.left,
      panelRight: panelRect.right,
      wrapLeft: wrapRect.left,
      wrapRight: wrapRect.right,
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(fit.panelScrollWidth, 'conditional tree region has horizontal overflow')
    .toBeLessThanOrEqual(fit.panelClientWidth + 1);
  expect(fit.wrapScrollWidth, 'conditional tree escaped the 320px harness')
    .toBeLessThanOrEqual(fit.wrapClientWidth + 1);
  expect(fit.panelLeft).toBeGreaterThanOrEqual(fit.wrapLeft - 1);
  expect(fit.panelRight).toBeLessThanOrEqual(fit.wrapRight + 1);
  expect(fit.documentScrollWidth, 'page has horizontal overflow at 320px')
    .toBeLessThanOrEqual(fit.viewportWidth + 1);

  const errors = await page.evaluate(() => (window as any).__events.errors);
  expect(errors).toEqual([]);

  await page.addScriptTag({ path: resolve('desktop/web-app/node_modules/axe-core/axe.min.js') });
  const violations = await region.evaluate(async (element) => {
    const results = await (window as any).axe.run(element);
    return results.violations
      .filter((violation: any) => violation.impact === 'critical' || violation.impact === 'serious')
      .map((violation: any) => ({
        id: violation.id,
        targets: violation.nodes.map((node: any) => node.target),
      }));
  });
  expect(violations).toEqual([]);
});
