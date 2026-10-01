import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Nuclear Lab — focused keyboard and accessibility interaction regressions.
 *
 * Keep these checks separate from the broader responsive/performance suite:
 * every assertion here protects a specific focus, keyboard, motion, or
 * disclosure contract and should remain cheap to diagnose when it fails.
 */

const SRC = readFileSync('stem_lab/stem_tool_nuclearlab.js', 'utf8');
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

test.describe('Nuclear Lab — keyboard focus continuity', () => {
  test('ArrowRight advances reactor rods by one visible five-percent step', async ({ page }) => {
    await mount(page, { nkOpen: false });

    const rods = page.locator('#rx-rods');
    await expect(rods).toHaveValue('50');
    await rods.focus();
    await page.keyboard.press('ArrowRight');

    await expect(rods).toHaveValue('55', { timeout: 3000 });
    await expect(rods).toHaveAttribute('aria-valuetext', '55 percent inserted');
  });

  test('clearing detector runs hands focus back to Take a count', async ({ page }) => {
    await mount(page, {
      nkOpen: false,
      cdSrc: 'cs137',
      cdDist: 10,
      cdTime: 10,
      cdRuns: [{ g: 80, b: 12, t: 10, d: 10, s: 'cs137' }],
    });

    const detector = page.locator('#nksec-detect');
    const clear = detector.getByRole('button', { name: /^Clear the 1 count/ });
    const takeCount = detector.getByRole('button', { name: /^Take a count\./ });
    await clear.focus();
    await page.keyboard.press('Enter');

    await expect(clear).toHaveCount(0);
    await expect(takeCount).toBeFocused({ timeout: 3000 });
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
  });

  test('clearing a saved reflection keeps focus inside the editor', async ({ page }) => {
    await mount(page, {
      nkPath: 'know',
      nkOpen: false,
      evidenceMastered: ['short-count'],
      nkReflections: {
        know: {
          confidence: 'growing',
          idea: 'A measurement needs uncertainty before it supports a claim.',
          question: 'How long should a weak source be counted?',
        },
      },
    });

    const reflection = page.locator('[data-nk-reflection="know"]');
    const clear = reflection.getByRole('button', { name: 'Clear saved reflection' });
    await clear.focus();
    await page.keyboard.press('Enter');

    await expect(clear).toHaveCount(0);
    await expect.poll(async () => page.evaluate(() => {
      const active = document.activeElement;
      return active !== document.body && !!active?.closest('[data-nk-reflection="know"]');
    }), { timeout: 3000 }).toBe(true);
  });
});

test.describe('Nuclear Lab — semantic interaction contracts', () => {
  test('forced colors distinguish selected pills without relying on color alone', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, { nkOpen: false, isoId: 'cs137' });

    const decay = page.locator('#nksec-halflife');
    const selected = decay.locator('button[aria-pressed="true"]').first();
    const unselected = decay.locator('button[aria-pressed="false"]').first();
    await expect(selected).toBeVisible();
    await expect(unselected).toBeVisible();

    const cues = await Promise.all([selected, unselected].map(async (control) =>
      control.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          borderStyle: style.borderTopStyle,
          borderWidth: Number.parseFloat(style.borderTopWidth),
        };
      })
    ));

    expect(cues[0].borderStyle).toBe('double');
    expect(cues[1].borderStyle).toBe('solid');
    expect(cues[0].borderWidth).toBeGreaterThan(cues[1].borderWidth);
  });

  test('core-part detail controls expose disclosure state and ownership', async ({ page }) => {
    await mount(page, { nkOpen: false, rxPart: 'fuel' });

    const operate = page.locator('#nksec-operate');
    const disclosure = operate.getByRole('button', { name: 'Fuel assemblies', exact: true });
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true', { timeout: 3000 });
    await expect(disclosure).not.toHaveAttribute('aria-pressed');

    const bodyId = await disclosure.getAttribute('aria-controls');
    expect(bodyId).toBeTruthy();
    await expect(operate.locator('#' + bodyId)).toHaveCount(1);
  });

  test('every host celebration call is explicitly reduced-motion gated', () => {
    const calls = [...SRC.matchAll(/\bcelebrate\(\)/g)];
    expect(calls.length, 'no celebration calls found; the contract test is stale').toBeGreaterThan(0);

    for (const call of calls) {
      const start = Math.max(0, (call.index || 0) - 320);
      const context = SRC.slice(start, (call.index || 0) + call[0].length);
      expect(context, 'celebrate() can run without consulting nkReduceMotion')
        .toMatch(/nkReduceMotion/);
    }
  });

  test('learner instructions do not require a pointer gesture', () => {
    expect(SRC).not.toContain('Drag to 7 half-lives');
    expect(SRC).not.toContain('Tap a row to light up its nucleus');
    expect(SRC).not.toContain('Tap any row');
  });

  test('visible control labels are included in their accessible names', async ({ page }) => {
    await mount(page, { nkOpen: true });
    await page.addScriptTag({ content: AXE_SOURCE });

    const audit = await page.evaluate(async () => {
      const axe = (window as any).axe;
      const results = await axe.run(
        document.querySelector('[data-nuclear-lab]'),
        {
          runOnly: {
            type: 'rule',
            values: ['label-content-name-mismatch'],
          },
          resultTypes: ['violations', 'passes', 'incomplete'],
        },
      );
      return {
        auditedNodes: [...results.violations, ...results.passes, ...results.incomplete]
          .reduce((total: number, result: any) => total + result.nodes.length, 0),
        violations: results.violations.flatMap((violation: any) =>
          violation.nodes.map((node: any) => ({
            rule: violation.id,
            target: node.target,
            html: node.html,
            failureSummary: node.failureSummary,
          }))
        ),
      };
    });

    expect(audit.auditedNodes, 'the experimental axe rule did not inspect any controls')
      .toBeGreaterThan(0);
    expect(
      audit.violations,
      `axe experimental label-content-name-mismatch residuals (${audit.violations.length} nodes):\n`
        + audit.violations.map((node: any) =>
          `  ${node.target.join(' ')}\n    ${node.html}\n    ${node.failureSummary || ''}`
        ).join('\n'),
    ).toEqual([]);
  });
});
