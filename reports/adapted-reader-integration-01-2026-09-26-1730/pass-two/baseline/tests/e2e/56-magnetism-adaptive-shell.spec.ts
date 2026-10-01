import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_magnetism.js',
  toolId: 'magnetism',
  width: 1080,
  height: 2400,
});

const seed = {
  magnetism: {
    tab: 'electro',
    learningMode: 'guided',
    electroView: '2d',
    turns: 100,
    current: 2,
    currentDir: 1,
    windingDir: 1,
    core: false,
    missionId: 'power_path',
    notebookOpen: false,
    notebookTrials: [],
    labShellPanel: '',
    labShellMenuOpen: false,
  },
};

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
test.describe.configure({ timeout: 90_000 });

test('keeps the experiment-first shell contained at phone and desktop widths', async ({ page }) => {
  for (const width of [390, 1080]) {
    await page.setViewportSize({ width, height: 1200 });
    await harness.mount(page, seed, undefined, { expectCanvas: false });
    await page.locator('#wrap').evaluate((wrap, nextWidth) => {
      (wrap as HTMLElement).style.width = String(nextWidth) + 'px';
    }, width);

    await expect(page.locator('[data-magnetism-adaptive-shell="true"]')).toBeVisible();
    await expect(page.locator('#mag-panel-electro')).toBeVisible();
    await expect(page.locator('.mag-passport')).toHaveClass(/is-shell-passport/);

    const metrics = await page.evaluate(() => {
      const wrap = document.getElementById('wrap');
      const root = wrap?.querySelector<HTMLElement>('.mag-root');
      const panel = root?.querySelector<HTMLElement>('.mag-active-panel');
      const passport = root?.querySelector<HTMLElement>('.mag-passport');
      if (!wrap || !root || !panel || !passport) throw new Error('Magnetism shell did not mount');
      const rootBox = root.getBoundingClientRect();
      const panelBox = panel.getBoundingClientRect();
      const passportBox = passport.getBoundingClientRect();
      const visibleSupport = [...root.querySelectorAll<HTMLElement>('[data-magnetism-shell-panel]')]
        .filter((element) => getComputedStyle(element).display !== 'none').length;
      const visibleGlobalButtons = [...root.querySelectorAll<HTMLButtonElement>('button')]
        .filter((button) => !button.closest('.mag-active-panel') && getComputedStyle(button).display !== 'none'
          && !button.closest<HTMLElement>('[hidden]')).length;
      const overflow = [...root.querySelectorAll<HTMLElement>('*')]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          let scrollContained = false;
          let ancestor = element.parentElement;
          while (ancestor && ancestor !== root) {
            const style = getComputedStyle(ancestor);
            const box = ancestor.getBoundingClientRect();
            if ((style.overflowX === 'auto' || style.overflowX === 'scroll')
              && box.left >= rootBox.left - 1 && box.right <= rootBox.right + 1) {
              scrollContained = true;
              break;
            }
            ancestor = ancestor.parentElement;
          }
          return {
            label: element.id || String(element.className || element.tagName),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            scrollContained,
          };
        })
        .filter((item) => item.width > 0 && !item.scrollContained
          && (item.left < Math.floor(rootBox.left - 1) || item.right > Math.ceil(rootBox.right + 1)))
        .slice(0, 12);
      return {
        rootWidth: Math.round(rootBox.width),
        rootScrollWidth: root.scrollWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        panelAfterPassport: panelBox.top >= passportBox.bottom - 1,
        visibleSupport,
        visibleGlobalButtons,
        overflow,
      };
    });

    expect(metrics.visibleSupport, JSON.stringify(metrics)).toBe(0);
    expect(metrics.visibleGlobalButtons, JSON.stringify(metrics)).toBe(13);
    expect(metrics.panelAfterPassport, JSON.stringify(metrics)).toBe(true);
    expect(metrics.rootScrollWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.rootWidth + 1);
    expect(metrics.documentScrollWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(width + 1);
    expect(metrics.overflow, JSON.stringify(metrics)).toEqual([]);
    await harness.destroy(page);
  }
});

test('reveals one support panel at a time and keeps local feedback next to the experiment', async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1200 });
  await harness.mount(page, seed, undefined, { expectCanvas: false });

  await page.locator('#mag-shell-menu-button').click();
  await expect(page.locator('#mag-shell-menu')).toBeVisible();
  await page.getByRole('button', { name: /Guide Predict, test, explain/ }).click();
  await expect(page.locator('[data-magnetism-shell-panel="guide"]')).toBeVisible();
  await expect(page.locator('[data-magnetism-shell-panel]:visible')).toHaveCount(1);

  await page.locator('[data-magnetism-shell-panel="guide"] .mag-shell-panel-head button').click();
  await expect(page.locator('[data-magnetism-shell-panel]:visible')).toHaveCount(0);

  const turns = page.getByRole('slider', { name: /Turns of wire/ });
  await turns.fill('160');
  const story = page.locator('[data-magnetism-signal-story="true"]');
  await expect(story).toBeVisible();
  await expect(story).toContainText('Center field: 4.02 mT');

  const order = await page.evaluate(() => {
    const signal = document.querySelector('[data-magnetism-signal-story="true"]');
    const panel = document.querySelector('.mag-active-panel');
    if (!signal || !panel) return false;
    return !!(signal.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(order).toBe(true);
});
