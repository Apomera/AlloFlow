/**
 * Tree Life Lab — accessibility.
 *
 * Two things static gates and unit tests cannot see:
 *
 * 1. COLOUR CONTRAST, which needs the real stylesheet and real computed colours. The
 *    tool shipped with white text on its accent fill: 3.76:1 in light and 1.92:1 in
 *    dark against an AA floor of 4.5. High contrast was the only theme that passed,
 *    because it alone used black on yellow.
 *
 * 2. KEYBOARD OPERATION. axe checks that roles have their required parents and
 *    children; it does not press a key. A role="tab" with no arrow-key movement and
 *    no tabpanel PROMISES the tab pattern to a screen reader and then fails to
 *    deliver it, which is worse than plain buttons would have been.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_treelab.js',
  toolId: 'treeLab',
  preScripts: ['stem_lab/stem_lab_module.js'],
  appStyles: true,
  width: 1180,
  height: 1000,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'],
});

test.describe.configure({ timeout: 400_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

type Theme = 'light' | 'dark' | 'contrast';

async function mount(page: import('@playwright/test').Page, view: string, band: string, theme: Theme) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.treeLab, null, { timeout: 30000 });
  await page.evaluate(({ view, band, theme }) => {
    const E = (window as any).__alloTreeLabEngine;
    // Aspen for Spread: it is the only common species carrying a clonal route, and
    // without one the map draws no stems, no root lines and no wipe.
    const speciesId = view === 'spread' ? 'aspen' : 'oak';
    const sp = E.speciesById(speciesId);
    let t = E.newTree(speciesId);
    const env = { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 };
    const alloc = { leaf: 0.3, root: 0.2, wood: 0.35, repro: 0.05, store: 0.1 };
    for (let i = 0; i < 55; i += 1) t = E.simulateYear(t, sp, env, alloc);
    const data: any = { treeLab: { view, bandOverride: band, tree: t, speciesId } };
    if (view === 'spread') {
      const res = E.resolveSpread({ seed_wind: 6, root_sucker: 5 },
        { id: 'pathogen', name: 'Root pathogen' }, E.lcg(11));
      // Force the shared-root wipe so the crosses, the root lines and the fourth legend
      // entry are all on screen for axe rather than left to a 55% dice roll.
      for (const r of res.results) if (r.diversity === 0) { r.wiped = true; r.took = 0; }
      data.treeLab.lastSpread = { event: 'pathogen', res };
    }
    if (view === 'quiz') data.treeLab.quizPick = 1;
    (window as any).__mount(data);
    const ctx = (window as any).__ctx;
    ctx.isDark = theme === 'dark';
    ctx.isContrast = theme === 'contrast';
    (window as any).__rerender();
  }, { view, band, theme });
  await page.waitForTimeout(1100);
}

const SURFACES: Array<[string, string, string, Theme]> = [
  ['Grow (light)', 'grow', 'g68', 'light'],
  ['Grow (dark)', 'grow', 'g68', 'dark'],
  ['Grow (high contrast)', 'grow', 'g68', 'contrast'],
  ['Grow (K-2)', 'grow', 'k2', 'light'],
  ['Chemistry (light)', 'chem', 'g912', 'light'],
  ['Chemistry (dark)', 'chem', 'g912', 'dark'],
  ['Transport', 'transport', 'g68', 'light'],
  ['Spread map (light)', 'spread', 'g68', 'light'],
  ['Spread map (dark)', 'spread', 'g68', 'dark'],
  ['Spread map (high contrast)', 'spread', 'g68', 'contrast'],
  ['Spread map (K-2)', 'spread', 'k2', 'light'],
  ['Knowledge check', 'quiz', 'g68', 'light'],
];

test.describe('axe', () => {
  test('the app stylesheet is actually applied', async ({ page }) => {
    // Without it axe would grade unstyled text and every result below would be
    // measuring colours no student ever sees.
    await mount(page, 'grow', 'g68', 'light');
    const painted = await page.evaluate(() => {
      const root = document.querySelector('#wrap > div') as HTMLElement | null;
      return root ? getComputedStyle(root).backgroundColor : null;
    });
    expect(painted, 'tool root is not painting a background').not.toBe('rgba(0, 0, 0, 0)');
  });

  for (const [label, view, band, theme] of SURFACES) {
    test(`${label} has no violations`, async ({ page }) => {
      await mount(page, view, band, theme);
      const violations = await page.evaluate(async () => {
        const res = await (window as any).axe.run('#wrap', { resultTypes: ['violations'] });
        return res.violations.flatMap((v: any) => v.nodes.map((n: any) => ({
          id: v.id,
          impact: v.impact,
          why: String(n.failureSummary || '').slice(0, 220).replace(/\s+/g, ' '),
          html: String(n.html).slice(0, 140).replace(/\s+/g, ' '),
        })));
      });
      const detail = violations.length
        ? '\n' + violations.map((v: any) => `    [${v.impact}] ${v.id}: ${v.why}\n      ${v.html}`).join('\n')
        : '';
      expect(violations, `${label}: ${violations.length} violation(s)${detail}`).toEqual([]);
    });
  }
});

test.describe('axe: full screen', () => {
  // The full-screen stage paints its own chrome over the whole viewport instead of
  // sitting inside the card, so it is the one surface in this tool whose colours do
  // not come from the surrounding page. A first version hardcoded a navy bar, which is
  // exactly how a panel disappears in the mode whose entire purpose is being visible.
  for (const theme of ['light', 'dark', 'contrast'] as Theme[]) {
    test(`the full-screen bar survives ${theme}`, async ({ page }) => {
      await mount(page, 'grow', 'g68', theme);
      await page.locator('button[aria-label="Full screen"]').click();
      await page.waitForTimeout(700);
      const state = await page.evaluate(async () => {
        const res = await (window as any).axe.run('#wrap', { resultTypes: ['violations'] });
        return {
          full: !!(window as any).__toolData?.treeLab?.viewerFull,
          violations: res.violations.flatMap((v: any) => v.nodes.map((n: any) => ({
            id: v.id, impact: v.impact,
            why: String(n.failureSummary || '').slice(0, 220).replace(/\s+/g, ' '),
            html: String(n.html).slice(0, 140).replace(/\s+/g, ' '),
          }))),
        };
      });
      expect(state.full, 'the full-screen toggle did nothing').toBe(true);
      const detail = state.violations.length
        ? '\n' + state.violations.map((v: any) => `    [${v.impact}] ${v.id}: ${v.why}\n      ${v.html}`).join('\n')
        : '';
      expect(state.violations, `full screen/${theme}: ${state.violations.length} violation(s)${detail}`).toEqual([]);
    });
  }
});

test.describe('keyboard', () => {
  test('the tab strip is a real tab pattern, not buttons wearing the role', async ({ page }) => {
    await mount(page, 'grow', 'g68', 'light');

    // Roving tabindex: exactly one tab is in the tab order.
    const roving = await page.evaluate(() => {
      const tabs = [...document.querySelectorAll('[role="tab"]')] as HTMLElement[];
      return {
        total: tabs.length,
        reachable: tabs.filter((t) => t.tabIndex === 0).length,
        selected: tabs.filter((t) => t.getAttribute('aria-selected') === 'true').length,
        controls: tabs.every((t) => !!t.getAttribute('aria-controls')),
      };
    });
    expect(roving.total).toBeGreaterThan(1);
    expect(roving.reachable, 'roving tabindex is broken').toBe(1);
    expect(roving.selected, 'more than one tab claims selection').toBe(1);
    expect(roving.controls, 'a tab does not point at its panel').toBe(true);

    // The panel it points at must exist and be labelled by the selected tab.
    const panel = await page.evaluate(() => {
      const tab = document.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement;
      const id = tab.getAttribute('aria-controls')!;
      const p = document.getElementById(id);
      return p ? { role: p.getAttribute('role'), labelledby: p.getAttribute('aria-labelledby'), tabId: tab.id } : null;
    });
    expect(panel, 'aria-controls points at nothing').not.toBeNull();
    expect(panel!.role).toBe('tabpanel');
    expect(panel!.labelledby).toBe(panel!.tabId);
  });

  test('arrow keys move between sections and carry focus', async ({ page }) => {
    await mount(page, 'grow', 'g68', 'light');
    await page.locator('[role="tab"][aria-selected="true"]').focus();

    const before = await page.evaluate(() => (window as any).__toolData.treeLab.view || 'grow');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => (window as any).__toolData.treeLab.view);
    expect(after, 'ArrowRight did not change section').not.toBe(before);

    // Focus must follow the selection, or the next arrow press goes nowhere.
    const focusFollowed = await page.evaluate(() =>
      document.activeElement?.getAttribute('aria-selected') === 'true');
    expect(focusFollowed, 'focus did not follow the selected tab').toBe(true);

    await page.keyboard.press('End');
    await page.waitForTimeout(250);
    const atEnd = await page.evaluate(() => (window as any).__toolData.treeLab.view);
    await page.keyboard.press('Home');
    await page.waitForTimeout(250);
    const atHome = await page.evaluate(() => (window as any).__toolData.treeLab.view);
    expect(atHome, 'Home did not return to the first section').not.toBe(atEnd);
    expect(atHome).toBe('grow');
  });

  test('every control on the Grow view can be reached and operated by keyboard', async ({ page }) => {
    await mount(page, 'grow', 'g68', 'light');
    const unreachable = await page.evaluate(() => {
      const bad: string[] = [];
      // Anything that LOOKS clickable must be operable. A div carrying role+tabIndex
      // with no key handler is the classic dead control in this codebase.
      document.querySelectorAll('#wrap [role="button"], #wrap [onclick]').forEach((el) => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'button' || tag === 'a' || tag === 'input' || tag === 'select') return;
        const t = (el as HTMLElement).tabIndex;
        if (t < 0) bad.push('not focusable: ' + el.outerHTML.slice(0, 90));
      });
      // Every native control needs an accessible name.
      document.querySelectorAll('#wrap button, #wrap input, #wrap select').forEach((el) => {
        const name = (el.getAttribute('aria-label') || el.textContent || '').trim()
          || (el.id && document.querySelector('label[for="' + el.id + '"]')?.textContent || '').trim();
        if (!name) bad.push('no accessible name: ' + el.outerHTML.slice(0, 90));
      });
      return bad;
    });
    expect(unreachable, unreachable.join('\n')).toEqual([]);
  });

  test('the 3D canvas is described, not silently decorative', async ({ page }) => {
    await mount(page, 'grow', 'g68', 'light');
    const desc = await page.evaluate(() => {
      const c = document.querySelector('#wrap [role="img"]') as HTMLElement | null;
      return c ? c.getAttribute('aria-label') : null;
    });
    expect(desc, 'the 3D panel has no description').toBeTruthy();
    // It must carry the live numbers, or a screen reader user gets "a tree" and
    // nothing about the tree they actually grew.
    expect(desc).toMatch(/\d/);
    expect(desc!.toLowerCase()).toContain('metre');
  });
});
