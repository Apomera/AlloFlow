import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Titration Lab — colour contrast, in a real browser with the real stylesheet.
 *
 * This is the half of accessibility that neither of the jsdom suites can reach.
 * `titration_axe_a11y` runs axe over the markup but has to switch colour-contrast OFF,
 * because jsdom has no stylesheet and axe would be grading unstyled text.
 * `titration_contrast` computes ratios by hand, but only for the colours the tool sets
 * inline — it says nothing about the Tailwind utilities, which are most of the text.
 *
 * With the harness serving the app's compiled CSS (appStyles), Chromium computes the
 * same colours a student sees, so axe's own contrast implementation can be trusted
 * here. This is the only place in the suite where a contrast pass means anything.
 *
 * Contrast is checked at AA. Violations are reported with the element and the measured
 * ratio rather than a bare count, because "3 violations" is not actionable.
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_titration.js',
  toolId: 'titrationLab',
  preScripts: ['stem_lab/stem_lab_module.js'],
  appStyles: true,
  width: 1180,
  height: 1000,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'],
});

test.describe.configure({ timeout: 150_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

// The pre-lab safety walkthrough has no 3D surface, so it mounts with the canvas wait
// switched off; every other surface here has one. Flagged per-surface below.
const SURFACES: Array<[string, Record<string, unknown>, boolean?]> = [
  ['safety gate', { safetyChecked: false }, false],
  ['titrate', { safetyChecked: true, labTab: 'titrate', presetId: 'sa_sb', volumeAdded: 12 }],
  ['titrate — redox', { safetyChecked: true, labTab: 'titrate', presetId: 'redox_kmno4', volumeAdded: 5 }],
  ['graded — mid-run', {
    safetyChecked: true, labTab: 'challenge', chMode: 'graded', gRun: 1, gVb: 21.2, gEyeCm: 10,
    gTrials: [{ vb: 21.25, eyeCm: 10, recorded: 21.08 }],
  }],
  ['quiz', { safetyChecked: true, labTab: 'challenge', chMode: 'quiz' }],
  ['safety drills', { safetyChecked: true, labTab: 'incidents', incidentIdx: 0 }],
  ['equipment + bench', { safetyChecked: true, labTab: 'equipment', benchSel: 'beaker' }],
  ['dilution', { safetyChecked: true, labTab: 'molarity' }],
  ['buffers', { safetyChecked: true, labTab: 'buffers', buffers: { ka: 1e-5, ratio: 0.1, log: [] } }],
];

test.describe('Titration Lab — contrast with the real stylesheet', () => {
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('the app stylesheet is actually applied', async ({ page }) => {
    await harness.mount(page, { titrationLab: { safetyChecked: true, labTab: 'titrate' } });
    // A Tailwind arbitrary-value class the tool leans on heavily. If the bundle were
    // missing or served with the wrong content-type this reads as the 16px default and
    // every contrast result below would be measuring the wrong thing.
    const size = await page.evaluate(() => {
      const el = [...document.querySelectorAll('#wrap *')]
        .find((n) => n.className && String(n.className).includes('text-[11px]'));
      return el ? getComputedStyle(el).fontSize : null;
    });
    expect(size, 'app CSS is not applying — contrast results would be meaningless').toBe('11px');
  });

  for (const [name, state, hasCanvas] of SURFACES) {
    test(`${name} passes AA contrast`, async ({ page }) => {
      await harness.mount(page, { titrationLab: state }, undefined, { expectCanvas: hasCanvas !== false });
      await page.waitForTimeout(500);

      const violations = await page.evaluate(async () => {
        const res = await (window as any).axe.run('#wrap', {
          runOnly: { type: 'rule', values: ['color-contrast'] },
          resultTypes: ['violations'],
        });
        return res.violations.flatMap((v: any) =>
          v.nodes.map((n: any) => ({
            html: String(n.html).slice(0, 150),
            why: String(n.any?.[0]?.message || n.failureSummary || '').slice(0, 200),
          })));
      });

      const detail = violations.length
        ? '\n' + violations.map((v: any) => `    ${v.why}\n      ${v.html}`).join('\n')
        : '';
      expect(violations, `${name}: ${violations.length} contrast failure(s)${detail}`).toEqual([]);
    });
  }
});
