import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Optics Lab, Sign Convention Sleuth — the answer was printed on the buttons.
 *
 * Each of the four answer buttons rendered `t.rule`, and the rule names the
 * SETUP that produces that image ("Object beyond 2f", "DIVERGING lens (any
 * object position)"). The vignette states the setup in those same words, so
 * every question was a word-matching exercise: no optics required.
 *
 * These run in a real browser because the giveaway is about what a learner can
 * SEE at the moment of the decision, which a source slice cannot settle.
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_optics.js',
  toolId: 'opticsLab',
  width: 1100,
  height: 1500,
  appStyles: true,
});

type ToolWindow = Window & { __toolData: { opticsLab: Record<string, any> } };
const readOptics = (page: any) =>
  page.evaluate(() => (window as unknown as ToolWindow).__toolData.opticsLab);

async function mountSleuth(page: any, extra: Record<string, unknown> = {}) {
  await harness.mount(page, { opticsLab: Object.assign({ mode: 'sleuth' }, extra) },
    undefined, { expectCanvas: false });
  await page.waitForSelector('text=Sign Convention Sleuth', { timeout: 15000 });
}

// The words that would hand over the answer: they describe the object/lens
// configuration rather than the resulting image.
const SETUP_WORDS = ['beyond 2f', 'DIVERGING lens', 'inside f', 'Object between f and 2f'];

test.describe('Optics Sleuth — the setup rule is not on the answer buttons', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('the four answer buttons carry no setup language before the pick', async ({ page }) => {
    // ssIdx >= 0 puts us on a live vignette rather than the start screen.
    await mountSleuth(page, { ssIdx: 0, ssShown: [0], ssRounds: 0, ssSeed: 3 });

    const group = page.locator('[role="radiogroup"]');
    await expect(group).toBeVisible();
    const buttons = group.locator('[role="radio"]');
    await expect(buttons).toHaveCount(4);

    const text = (await group.innerText()).replace(/\s+/g, ' ');
    for (const word of SETUP_WORDS) {
      expect(text.toLowerCase(),
        `answer buttons still leak the setup: "${word}"`).not.toContain(word.toLowerCase());
    }
    // The cues themselves must still be there — the fix is a swap, not a strip.
    expect(text).toContain('Smaller than the object');
    expect(text).toContain('Bigger than the object');
  });

  test('the rule comes back after the answer, where it is the teaching', async ({ page }) => {
    await mountSleuth(page, { ssIdx: 0, ssShown: [0], ssRounds: 0, ssSeed: 3 });

    const group = page.locator('[role="radiogroup"]');
    await group.locator('[role="radio"]').first().click();
    await page.waitForTimeout(400);

    const after = (await group.innerText()).replace(/\s+/g, ' ');
    // At least one of the setup rules is now visible on the revealed buttons.
    const anyRule = SETUP_WORDS.some((w) => after.toLowerCase().includes(w.toLowerCase()));
    expect(anyRule, 'the rules never come back after answering').toBe(true);
  });

  test('the start screen still teaches the four rules up front', async ({ page }) => {
    await mountSleuth(page);   // ssIdx defaults to -1 => start screen
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(body).toContain('Sign convention reminder');
    const anyRule = SETUP_WORDS.some((w) => body.toLowerCase().includes(w.toLowerCase()));
    expect(anyRule, 'the reference cards lost the rules').toBe(true);
  });
});

test.describe('Optics Sleuth — the progress counter survives a second pass', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('keeps counting past the tenth vignette instead of resetting to 1', async ({ page }) => {
    // ssShown is the de-dup pool: it is emptied on the 11th draw. A learner
    // ten rounds in used to see "Vignette 1 of 10" again.
    await mountSleuth(page, { ssIdx: 2, ssShown: [], ssRounds: 10, ssScore: 7, ssAns: false });
    // The banner is uppercased by CSS textTransform, and innerText returns the
    // TRANSFORMED text, so compare case-insensitively.
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ').toLowerCase();
    expect(body, 'the counter fell back to the start of the deck').not.toContain('vignette 1 of 10');
    // Capped at the deck size rather than running away to "11 of 10".
    expect(body).toContain('vignette 10 of 10');
  });

  test('a restart clears the best streak so no trophy carries over', async ({ page }) => {
    await mountSleuth(page, {
      ssIdx: 4, ssShown: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      ssRounds: 10, ssScore: 9, ssAns: true, ssPick: 'realInvRed',
      ssStreak: 4, ssBest: 6,
    });
    await page.locator('text=Restart').click();
    await page.waitForTimeout(400);
    const state = await readOptics(page);
    expect(state.ssBest, 'the best streak survived a restart').toBe(0);
    expect(state.ssScore).toBe(0);
    expect(state.ssRounds).toBe(0);
    expect(state.ssAns).toBe(false);
  });
});
