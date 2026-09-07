import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_treelab.js', toolId: 'treeLab',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1365, height: 1000,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'] });
test.describe.configure({ timeout: 240_000 });
test.use({ viewport: { width: 1365, height: 1000 }, video: 'off', trace: 'off',
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const RUN = { version: 1, seed: 'GROVE-01', mode: 'deck', choices: [{ priority: 'offspring', route: 'mixed' }] };

// Headless Chromium has speechSynthesis but no voices, so the engine is stubbed to record
// what would be spoken. The point is the text and the control's state, not audio.
async function mountWithStub(page: any, band?: string) {
  await page.goto(`${harness.url}/__harness`);
  await page.addInitScript(() => {});
  await page.evaluate(b => {
    const w = window as any;
    w.__spoken = [];
    w.__cancels = 0;
    // window.speechSynthesis is a read-only accessor: a plain assignment silently does
    // nothing and the tool then talks to the real engine, which is mute in headless.
    Object.defineProperty(w, 'speechSynthesis', { configurable: true,
      value: { speak: (u: any) => { w.__spoken.push(u.text); w.__lastUtt = u; }, cancel: () => { w.__cancels++; } } });
    w.SpeechSynthesisUtterance = function (this: any, text: string) { this.text = text; this.rate = 1; } as any;
    w.__mount({ treeLab: Object.assign({ view: 'grove', groveRun: { version: 1, seed: 'GROVE-01', mode: 'deck', choices: [{ priority: 'offspring', route: 'mixed' }] } }, b ? { bandOverride: b } : {}) });
    w.__ctx.reduceMotion = true;
  }, band);
  await page.waitForTimeout(1200);
}

test('reads the year evidence aloud and reports its own state', async ({ page }) => {
  await mountWithStub(page);
  const btn = page.getByRole('button', { name: /Read this aloud/ });
  await expect(btn).toBeVisible();
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  await btn.click();
  await page.waitForTimeout(300);
  const spoken = await page.evaluate(() => (window as any).__spoken);
  expect(spoken).toHaveLength(1);
  // The spoken text is built from the receipt, not scraped, and names the year and the card.
  expect(spoken[0]).toMatch(/^Year 1: /);
  expect(spoken[0]).toContain('Priority used: Invest in offspring.');
  expect(spoken[0]).toMatch(/new arrival|new arrivals/);
  // Pressing again stops, and the control reflects it.
  await expect(page.getByRole('button', { name: /Stop reading/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Stop reading/ }).click();
  await page.waitForTimeout(250);
  await expect(page.getByRole('button', { name: /Read this aloud/ })).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => (window as any).__cancels)).toBeGreaterThanOrEqual(1);
  const issues = await page.evaluate(async () => (await (window as any).axe.run('.grove-receipt', { resultTypes: ['violations'] })).violations.map((v: any) => ({ id: v.id })));
  expect(issues).toEqual([]);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('speaks the K-2 wording and slows down for it', async ({ page }) => {
  await mountWithStub(page, 'k2');
  await page.getByRole('button', { name: /Read this to me/ }).click();
  await page.waitForTimeout(300);
  const spoken = await page.evaluate(() => (window as any).__spoken[0]);
  expect(spoken).toContain('Card used:');
  expect(spoken).toMatch(/new tree came|new trees came/);
  expect(await page.evaluate(() => (window as any).__lastUtt.rate)).toBeLessThan(0.95);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('hides the control where the browser cannot speak', async ({ page }) => {
  await page.goto(`${harness.url}/__harness`);
  await page.evaluate(() => {
    const w = window as any;
    Object.defineProperty(w, 'speechSynthesis', { configurable: true, value: undefined });
    w.__mount({ treeLab: { view: 'grove', groveRun: { version: 1, seed: 'GROVE-01', mode: 'deck', choices: [{ priority: 'offspring', route: 'mixed' }] } } });
    w.__ctx.reduceMotion = true;
  });
  await page.waitForTimeout(1000);
  await expect(page.locator('.grove-speak')).toHaveCount(0);
  await expect(page.locator('.grove-receipt')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

// The knowledge check offers the same control, sharing the machinery the grove uses. It
// reads what is on screen: the question and its options, and once answered, the verdict and
// the explanation, so a learner who cannot read the feedback still receives it.
async function mountQuiz(page: any, band: string) {
  await page.goto(`${harness.url}/__harness`);
  await page.evaluate(b => {
    const w = window as any;
    w.__spoken = [];
    w.__cancels = 0;
    Object.defineProperty(w, 'speechSynthesis', { configurable: true,
      value: { speak: (u: any) => { w.__spoken.push(u.text); w.__lastUtt = u; }, cancel: () => { w.__cancels++; } } });
    w.SpeechSynthesisUtterance = function (this: any, text: string) { this.text = text; this.rate = 1; } as any;
    w.__mount({ treeLab: { view: 'quiz', bandOverride: b, tree: w.__alloTreeLabEngine.newTree('oak'), speciesId: 'oak' } });
    w.__ctx.reduceMotion = true;
  }, band);
  await page.waitForTimeout(1200);
}

test('reads the knowledge check question, its options, then the explanation', async ({ page }) => {
  await mountQuiz(page, 'g68');
  const read = page.getByRole('button', { name: /Read this aloud/ });
  await expect(read).toBeVisible();
  await expect(read).toHaveAttribute('aria-pressed', 'false');
  await read.click();
  await page.waitForTimeout(250);
  const first = await page.evaluate(() => (window as any).__spoken[0]);
  expect(first).toContain('?');
  // Every option is read with its letter, in the order they are shown.
  for (const letter of ['A. ', 'B. ', 'C. ', 'D. ']) expect(first).toContain(letter);
  // Nothing is claimed about an answer that has not been given yet.
  expect(first).not.toMatch(/Evidence connected|revise the model/);
  await expect(page.getByRole('button', { name: /Stop reading/ })).toHaveAttribute('aria-pressed', 'true');

  await page.locator('.allo-tree-quiz-opt').first().click();
  await page.waitForTimeout(400);
  // The stub never fires onend, so the control is still in its speaking state: stop first,
  // exactly as a learner would before asking for the answer to be read.
  await page.getByRole('button', { name: /Stop reading/ }).first().click();
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: /Read this aloud/ }).first().click();
  await page.waitForTimeout(250);
  const second = await page.evaluate(() => { const s = (window as any).__spoken; return s[s.length - 1]; });
  expect(second).toMatch(/Evidence connected|Not yet/);
  // The explanation is the bank's own wording, not a summary of it.
  expect(second.length).toBeGreaterThan(first.length);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('slows the knowledge check reading down for K-2 as well', async ({ page }) => {
  await mountQuiz(page, 'k2');
  await page.getByRole('button', { name: /Read this to me/ }).click();
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as any).__lastUtt.rate)).toBeLessThan(0.95);
  expect(await page.evaluate(() => (window as any).__spoken[0])).toContain('A. ');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
