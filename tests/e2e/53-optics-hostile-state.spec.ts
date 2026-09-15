import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Optics Lab — a corrupt save must not blank the whole tool.
 *
 * `d.quizQuestions || []` and `if (!d.quizQuestions)` only replace a FALSY
 * value. A restored project carrying an object, a string or a number passed
 * straight through to `.map`, and because the tool renders as ONE component,
 * the TypeError blanked every tab — not just the Quiz. Reproduced at HEAD:
 * `quizQuestions: {}` rendered a body of length 0.
 *
 * These run in a real browser because the failure is a render-time throw:
 * a source pin can show the guard exists but not that the page survives.
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_optics.js',
  toolId: 'opticsLab',
  width: 1100,
  height: 1200,
  appStyles: true,
});

// Shapes a hand-edited or partially-restored save actually produces.
const HOSTILE: [string, Record<string, unknown>][] = [
  ['quizQuestions as an object', { mode: 'quiz', quizQuestions: { a: 1 } }],
  ['quizQuestions as a string', { mode: 'quiz', quizQuestions: 'five' }],
  ['quizQuestions as a number', { mode: 'quiz', quizQuestions: 5 }],
  ['quizAnswers as an object', { mode: 'quiz', quizAnswers: { 0: 2 } }],
  ['quizAnswers as a string', { mode: 'quiz', quizAnswers: 'ab' }],
  ['opticsRecentModes as an object', { mode: 'quiz', opticsRecentModes: { a: 1 } }],
  ['opticsRecentModes as a string', { mode: 'lenses', opticsRecentModes: 'quiz' }],
  ['phenoQuantumDots as a string', { mode: 'phenomena', phenoQuantumDots: 'xy' }],
];

test.describe('Optics Lab survives a corrupt save', () => {
  test.describe.configure({ timeout: 200_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  for (const [name, seed] of HOSTILE) {
    test(`renders with ${name}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await harness.mount(page, { opticsLab: seed }, undefined, { expectCanvas: false });
      await page.waitForTimeout(900);

      const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      expect(errors, `${name} threw during render`).toEqual([]);
      // A blank body is the signature of the crash: the whole tool unmounts.
      expect(text.length, `${name} rendered an empty tool`).toBeGreaterThan(120);
      expect(text, `${name} lost the tool header`).toContain('Optics Lab');
    });
  }

  // The recovery has to be USABLE, not merely non-throwing.
  test('a corrupt quiz recovers to a startable quiz', async ({ page }) => {
    await harness.mount(page, { opticsLab: { mode: 'quiz', quizQuestions: { a: 1 } } },
      undefined, { expectCanvas: false });
    await page.waitForTimeout(600);

    const start = page.locator('text=Start 5-question quiz');
    await expect(start, 'no way back into the quiz after a corrupt save').toBeVisible();
    await start.click();
    await page.waitForTimeout(700);

    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(text, 'the recovered quiz does not present a question').toMatch(/Question 1 of \d+/);
  });

  // Navigation itself ran the corrupt value through .filter in the state
  // updater, so a bad opticsRecentModes broke every tab change, not one tab.
  test('tab navigation still works with a corrupt recent-modes list', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await harness.mount(page, { opticsLab: { mode: 'lenses', opticsRecentModes: 'quiz' } },
      undefined, { expectCanvas: false });
    await page.waitForTimeout(700);

    await page.locator('button', { hasText: 'Quiz' }).first().click();
    await page.waitForTimeout(700);

    expect(errors, 'changing tabs threw with a corrupt recent-modes list').toEqual([]);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(text.length).toBeGreaterThan(120);
  });
});
