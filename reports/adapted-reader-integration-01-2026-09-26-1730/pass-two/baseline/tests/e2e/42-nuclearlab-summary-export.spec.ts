import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { readFileSync } from 'node:fs';

/**
 * Nuclear Lab — "What you worked out".
 *
 * The jsdom suite covers which lines appear and what the copied text says.
 * This one covers what only a real browser can show: that the summary is
 * reachable and legible at a phone width, that its controls are real touch
 * targets, and that axe finds nothing on it in either theme.
 */

const AXE_SOURCE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_nuclearlab.js',
  toolId: 'nuclearLab',
  appStyles: true,
  width: 1100,
  height: 1400,
});

test.describe.configure({ timeout: 180_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const WORKED = {
  doseEstimated: true,
  cmpRevealed: true,
  cmpGuess: { coal_nuclear: 'Coal', hydro_nuclear: 'Nuclear', gas_solar: 'Natural gas' },
  evidenceMastered: ['reactor-bomb', 'inverse-square'],
  nkReflections: {
    all: {
      confidence: 'explain',
      idea: 'Distance is the cheapest shielding there is.',
      question: 'How do they measure risk below 100 mSv?',
    },
  },
};

async function mount(page: any, state: Record<string, unknown>, ctx?: any) {
  await harness.mount(page, { _nuclearLab: state }, undefined, { expectCanvas: false, ...(ctx || {}) });
  await page.evaluate(() => {
    const wrap = document.getElementById('wrap')!;
    wrap.style.display = 'block';
    wrap.style.height = 'auto';
  });
  await page.waitForSelector('[data-nuclear-lab]');
}

function summary(page: any) {
  return page.locator('#nksec-next');
}

test.describe('Nuclear Lab — summary export', () => {
  test('gathers the student work into the closing section', async ({ page }) => {
    await mount(page, WORKED);
    const sec = summary(page);
    await expect(sec).toContainText('What you worked out');
    await expect(sec).toContainText('My estimated annual dose');
    await expect(sec).toContainText('Distance is the cheapest shielding there is.');
    await expect(sec).toContainText('How do they measure risk below 100 mSv?');
  });

  test('stays out of the way for a student who did nothing', async ({ page }) => {
    await mount(page, {});
    await expect(summary(page)).not.toContainText('What you worked out');
    // The bridges themselves must still be there.
    await expect(summary(page)).toContainText('Take this somewhere');
  });

  test('the copy control is a real touch target at a phone width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await mount(page, WORKED);
    const button = summary(page).locator('button', { hasText: 'Copy my summary' });
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    // WCAG 2.5.8 floor is 24; this lab targets 44 for its controls.
    expect(Math.round(box!.height)).toBeGreaterThanOrEqual(24);
  });

  test('does not overflow the page at a phone width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await mount(page, WORKED);
    const spill = await summary(page).evaluate((el: Element) => {
      const box = el.getBoundingClientRect();
      return Math.round(el.scrollWidth - Math.ceil(box.width));
    });
    expect(spill).toBeLessThanOrEqual(1);
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`has no axe violations — ${theme}`, async ({ page }) => {
      await mount(page, WORKED, { theme });
      await page.addScriptTag({ content: AXE_SOURCE });
      const violations = await page.evaluate(async () => {
        const axe = (window as any).axe;
        const results = await axe.run(document.querySelector('#nksec-next'), {
          resultTypes: ['violations'],
        });
        return results.violations.map((v: any) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.slice(0, 2).map((n: any) => n.html.slice(0, 160)),
        }));
      });
      expect(violations).toEqual([]);
    });
  }
});
