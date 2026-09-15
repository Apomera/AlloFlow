import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { readFileSync } from 'node:fs';

/**
 * Nuclear Lab — section 19, the predict-then-check comparison.
 *
 * The jsdom suite covers the state machine. This one exists for the parts a
 * jsdom harness cannot see: that the bars actually paint at a real width in a
 * real browser, that the disclosed note does not overflow its row, and that
 * axe finds nothing on the section once it is open. Screenshots in this repo
 * have repeatedly caught defects every passing unit test accepted.
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

async function mount(page: any, state: Record<string, unknown> = {}) {
  await harness.mount(page, { _nuclearLab: state }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const wrap = document.getElementById('wrap')!;
    wrap.style.display = 'block';
    wrap.style.height = 'auto';
  });
  await page.waitForSelector('[data-nuclear-lab]');
}

const REVEALED = {
  cmpRevealed: true,
  cmpGuess: { coal_nuclear: 'Coal', hydro_nuclear: 'Hydropower', gas_solar: 'Natural gas' },
};

test.describe('Nuclear Lab — predict then compare', () => {
  test('bars paint at a real width once revealed', async ({ page }) => {
    await mount(page, REVEALED);
    const section = page.locator('#nksec-compare');
    await expect(section).toBeVisible();

    // Coal is the widest bar and nuclear among the narrowest. Both must have
    // real painted width: a log scale that collapsed would show as equal bars,
    // which no unit test measuring the style string would notice.
    const widths = await section.evaluate((el: Element) => {
      const rows = [...el.querySelectorAll('button[aria-pressed]')]
        .filter((b) => /deaths per terawatt hour/.test(b.getAttribute('aria-label') || ''));
      return rows.map((row) => {
        const name = (row.getAttribute('aria-label') || '').split(',')[0];
        const fill = row.querySelector('span > span') as HTMLElement | null;
        return { name, width: fill ? fill.getBoundingClientRect().width : 0 };
      });
    });

    const coal = widths.find((w) => w.name === 'Coal')!;
    const nuclear = widths.find((w) => w.name === 'Nuclear')!;
    expect(coal.width).toBeGreaterThan(20);
    expect(nuclear.width).toBeGreaterThan(0);
    expect(coal.width).toBeGreaterThan(nuclear.width * 2);
  });

  test('an opened source shows its note inside the section', async ({ page }) => {
    await mount(page, REVEALED);
    const section = page.locator('#nksec-compare');
    const hydro = section.locator('button[aria-label^="Hydropower,"]');
    await hydro.click();

    await expect(section).toContainText('Banqiao');
    // The note must sit inside the section box, not spill past its right edge.
    const overflow = await section.evaluate((el: Element) => {
      const box = el.getBoundingClientRect();
      const note = [...el.querySelectorAll('p')]
        .find((p) => /Banqiao/.test(p.textContent || ''));
      if (!note) return null;
      const n = note.getBoundingClientRect();
      return { spill: Math.round(n.right - box.right), height: Math.round(n.height) };
    });
    expect(overflow).not.toBeNull();
    expect(overflow!.spill).toBeLessThanOrEqual(0);
    expect(overflow!.height).toBeGreaterThan(0);
  });

  test('every new control is a large enough touch target', async ({ page }) => {
    // WCAG 2.5.8 is 24x24 CSS px minimum; this lab targets 44 for its controls.
    await mount(page, REVEALED);
    const small = await page.locator('#nksec-compare').evaluate((el: Element) => {
      return [...el.querySelectorAll('button')]
        .map((b) => {
          const r = b.getBoundingClientRect();
          return { text: (b.textContent || '').trim().slice(0, 40), h: Math.round(r.height), w: Math.round(r.width) };
        })
        .filter((b) => b.h > 0 && b.h < 24);
    });
    expect(small).toEqual([]);
  });

  test('the open section has no axe violations', async ({ page }) => {
    await mount(page, REVEALED);
    await page.locator('#nksec-compare button[aria-label^="Coal,"]').click();
    await page.addScriptTag({ content: AXE_SOURCE });

    const violations = await page.evaluate(async () => {
      const axe = (window as any).axe;
      const results = await axe.run(document.querySelector('#nksec-compare'), {
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

  test('the unrevealed state hides the figures in a real browser', async ({ page }) => {
    await mount(page, {});
    const section = page.locator('#nksec-compare');
    await expect(section).toContainText('The chart appears once you have answered');
    await expect(section).not.toContainText('24.6');
  });
});
