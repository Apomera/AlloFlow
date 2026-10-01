import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Rendered WCAG 2.2 AA checks for Cyber Defense.
 *
 * The jsdom suites cover source contracts; this suite puts the real tool in
 * Chromium with its production CSS so axe, focus rings, tab behaviour, motion,
 * and narrow layouts are measured on the surface a learner actually sees.
 */
test.describe.configure({ timeout: 180_000 });

const TABS = ['phish', 'password', 'cipher', 'network', 'social', 'warroom', 'defenseHunt'];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_cyberdefense.js',
  toolId: 'cyberDefense',
  width: 1280,
  height: 1200,
  appStyles: true,
});

async function loadAxe(page: any, base: string) {
  await page.addScriptTag({ url: `${base}/node_modules/axe-core/axe.min.js` });
}

async function axeViolations(page: any) {
  return page.evaluate(async (tags) => {
    const result = await (window as any).axe.run(document.querySelector('#wrap'), {
      runOnly: { type: 'tag', values: tags },
    });
    return result.violations;
  }, AXE_TAGS);
}

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('axe finds no WCAG A/AA violations in every learning mode', async ({ page }) => {
  for (const tab of TABS) {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await harness.mount(page, { cyberDefense: { cyberTab: tab } }, undefined, { expectCanvas: false });
    await loadAxe(page, harness.url);
    const violations = await axeViolations(page);
    expect(violations, `${tab}: ${JSON.stringify(violations)}`).toEqual([]);
    await harness.destroy(page);
  }
});

test('every rendered control has a name and visible keyboard focus', async ({ page }) => {
  await harness.mount(page, { cyberDefense: { cyberTab: 'network' } }, undefined, { expectCanvas: false });
  await loadAxe(page, harness.url);
  const naming = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('#wrap'), {
      runOnly: { type: 'rule', values: ['button-name', 'link-name', 'input-button-name', 'select-name'] },
    });
    return result.violations;
  });
  expect(naming).toEqual([]);

  const focusable = await page.evaluate(() => document.querySelectorAll(
    '#wrap button, #wrap a[href], #wrap input, #wrap select, #wrap textarea, #wrap [tabindex]:not([tabindex="-1"])'
  ).length);
  const seen: Array<{ focusVisible: boolean; indicator: boolean }> = [];
  for (let i = 0; i < focusable + 4; i += 1) {
    await page.keyboard.press('Tab');
    const state = await page.evaluate(() => {
      const root = document.querySelector('#cyber-defense-region');
      const el = document.activeElement as HTMLElement | null;
      if (!root || !el || !root.contains(el)) return null;
      const style = getComputedStyle(el);
      const indicator = (style.outlineStyle !== 'none' && (parseFloat(style.outlineWidth) || 0) >= 2)
        || style.boxShadow !== 'none';
      return { focusVisible: el.matches(':focus-visible'), indicator };
    });
    if (state) seen.push(state);
  }
  expect(seen.length).toBeGreaterThan(0);
  expect(seen.every((state) => state.focusVisible && state.indicator)).toBeTruthy();
});

test('learning tabs expose a complete keyboard path and no narrow-screen overflow', async ({ page }) => {
  await harness.mount(page, { cyberDefense: { cyberTab: 'phish' } }, undefined, { expectCanvas: false });
  const tabs = page.locator('#wrap [role="tab"]');
  await expect(tabs).toHaveCount(7);
  await tabs.first().focus();
  await page.keyboard.press('End');
  await expect(tabs.nth(6)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await page.evaluate(() => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.width = '390px';
    document.documentElement.style.width = '390px';
    document.body.style.width = '390px';
  });
  await page.waitForTimeout(100);
  const overflow = await page.evaluate(() => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    const root = document.querySelector('#cyber-defense-region') as HTMLElement;
    return {
      wrap: wrap.scrollWidth - wrap.clientWidth,
      root: root.scrollWidth - root.clientWidth,
    };
  });
  expect(overflow.wrap).toBeLessThanOrEqual(1);
  expect(overflow.root).toBeLessThanOrEqual(1);
});

test('reduced motion removes tool animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { cyberDefense: { cyberTab: 'password' } }, undefined, { expectCanvas: false });
  const animations = await page.evaluate(() => [
    ...Array.from(document.querySelectorAll<HTMLElement>('#cyber-defense-region .cyberd-content, #cyber-defense-region .cyberd-status-dot')),
  ].map((el) => getComputedStyle(el).animationName));
  expect(animations).toEqual(expect.arrayContaining(['none']));
  expect(animations.every((name) => name === 'none')).toBeTruthy();
});
