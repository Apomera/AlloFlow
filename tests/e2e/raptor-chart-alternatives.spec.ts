import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * The five recovery trajectory plots draw every figure as SVG <text>. Because each
 * chart is role="img", that subtree is hidden from assistive tech and the aria-label
 * replaces it -- and all five shared one label, "Population trajectory plot", which
 * carries none of the data. A screen reader got five identical, contentless strings.
 *
 * Each chart now describes its own series, and the same numbers are available as a
 * real table. These checks pin both, because a label regression is invisible on
 * screen: the page looks exactly the same when the alternative text is wrong.
 */
test.describe('Raptor Lab chart text alternatives', () => {
  test.describe.configure({ mode: 'serial' });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 1280, height: 900, appStyles: true });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });
  test.beforeEach(async ({ page }) => {
    await harness.mount(page, { raptorHunt: { activeSection: 'hub' } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap{width:100%;height:auto;display:block;padding:16px}' });
    await page.evaluate(() => {
      const d = (window as any).__toolData;
      d.raptorHunt = Object.assign({}, d.raptorHunt, { activeSection: 'recoveries' });
      (window as any).__rerender();
    });
    await page.waitForSelector('[id="rh-panel-recoveries"] svg[role="img"]');
  });

  test('every chart describes its own series, not a generic placeholder', async ({ page }) => {
    const labels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[id="rh-panel-recoveries"] svg[role="img"]'))
        .map((s) => s.getAttribute('aria-label') || '')
    );
    expect(labels.length).toBe(5);

    // Distinct: the old bug was five copies of one string.
    expect(new Set(labels).size).toBe(labels.length);

    for (const label of labels) {
      // Not the generic fallback.
      expect(label).not.toBe('Population trajectory plot');
      // Carries the actual data: a span of years and several figures.
      expect(label).toMatch(/\b(18|19|20)\d{2}\b.*\b(18|19|20)\d{2}\b/);
      expect(label).toMatch(/lowest\s+[\d,]+\s+in\s+(18|19|20)\d{2}/i);
      // Enough points to be a series rather than a summary sentence.
      expect((label.match(/(18|19|20)\d{2}:/g) || []).length).toBeGreaterThanOrEqual(6);
    }

    // And each names its own case study, so they are told apart when tabbing.
    expect(labels.some((l) => /Peregrine/i.test(l))).toBeTruthy();
    expect(labels.some((l) => /Philippine Eagle/i.test(l))).toBeTruthy();
  });

  test('the same figures are available as a real table', async ({ page }) => {
    const tables = page.locator('.rh-traj-data');
    await expect(tables).toHaveCount(5);

    // Collapsed by default, so the page reads as before until asked.
    expect(await page.locator('.rh-traj-data[open]').count()).toBe(0);

    const first = tables.first();
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');

    // Real table semantics: column headers, and the year as each row's header.
    await expect(first.locator('thead th')).toHaveCount(3);
    const rows = first.locator('tbody tr');
    expect(await rows.count()).toBeGreaterThan(3);
    await expect(rows.first().locator('th[scope="row"]')).toHaveText(/^(18|19|20)\d{2}$/);

    // The table agrees with the chart it belongs to: every year and population in
    // the label appears in the table, so the two cannot drift apart.
    const label = await page.locator('[id="rh-panel-recoveries"] svg[role="img"]').first().getAttribute('aria-label');
    const tableText = (await first.locator('table').innerText()).replace(/\s+/g, ' ');
    for (const m of (label || '').matchAll(/((?:18|19|20)\d{2}): ([\d,]+)/g)) {
      expect(tableText, `year ${m[1]} missing from the table`).toContain(m[1]);
      expect(tableText, `population ${m[2]} missing from the table`).toContain(m[2]);
    }
  });

  test('stays legible in forced colors', async ({ browser }) => {
    const ctx = await browser.newContext({ forcedColors: 'active', colorScheme: 'dark' });
    const fc = await ctx.newPage();
    await harness.mount(fc, { raptorHunt: { activeSection: 'hub' } }, undefined, { expectCanvas: false });
    await fc.evaluate(() => {
      const d = (window as any).__toolData;
      d.raptorHunt = Object.assign({}, d.raptorHunt, { activeSection: 'recoveries' });
      (window as any).__rerender();
    });
    await fc.waitForSelector('.rh-traj-data');
    const summary = fc.locator('.rh-traj-data > summary').first();
    await expect(summary).toBeVisible();
    await summary.click();
    // The table is the accessible path, so it must survive the high-contrast mode
    // rather than disappearing into the background with the decoration.
    await expect(fc.locator('.rh-traj-data[open] tbody tr').first()).toBeVisible();
    await harness.destroy(fc);
    await ctx.close();
  });
});
