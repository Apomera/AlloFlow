import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_treelab.js', toolId: 'treeLab',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1365, height: 1000 });
test.describe.configure({ timeout: 240_000 });
test.use({ viewport: { width: 1365, height: 1000 }, video: 'off', trace: 'off',
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: any, treeLab: any) {
  await page.goto(`${harness.url}/__harness`);
  await page.evaluate(d => {
    const w = window as any, E = w.__alloTreeLabEngine;
    let tree = E.newTree('oak'); const sp = E.speciesById('oak');
    for (let y = 1; y < 30; y++) tree = E.simulateYear(tree, sp, { tempC: 22, light: 0.8, soilWater: 0.7, co2ppm: 420 }, E.normaliseAlloc());
    w.__mount({ treeLab: Object.assign({ tree, speciesId: 'oak', playing: false }, d) });
    w.__ctx.reduceMotion = true;
  }, treeLab);
  await page.waitForTimeout(1400);
}
const shown = (page: any, sel: string) => page.evaluate((s: string) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const cs = getComputedStyle(el);
  return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getBoundingClientRect().height > 0;
}, sel);

test('drops pointer-only controls when printing but keeps the readings', async ({ page }) => {
  await mount(page, { view: 'grow' });
  expect(await shown(page, '.allo-tree-tabs')).toBe(true);
  expect(await shown(page, '.allo-tree-grow-nav')).toBe(true);
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(300);
  // Controls that need a pointer go away.
  for (const sel of ['.allo-tree-tabs', '.allo-tree-grow-nav', 'canvas']) {
    expect(await shown(page, sel), sel).toBeFalsy();
  }
  // The readings and their explanations stay.
  for (const sel of ['#grow-sec-budget', '#grow-sec-conditions', '.allo-tree-card']) {
    expect(await shown(page, sel), sel).toBe(true);
  }
  // Chromium does not lay out a closed <details> at all, so asking for its child's
  // computed display returns 'block' while nothing renders - a vacuous check. Fire the
  // real print event and measure that the content actually occupies space.
  const before = await page.evaluate(() => [...document.querySelectorAll('.allo-tree-lab details')].length);
  expect(before).toBeGreaterThan(0);
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.waitForTimeout(200);
  const opened = await page.evaluate(() => [...document.querySelectorAll('.allo-tree-lab details')].map(d => {
    const body = [...d.children].find(c => c.tagName !== 'SUMMARY') as HTMLElement;
    return { open: (d as HTMLDetailsElement).open, h: body ? Math.round(body.getBoundingClientRect().height) : 0 };
  }));
  expect(opened.every(d => d.open)).toBe(true);
  expect(opened.every(d => d.h > 0)).toBe(true);
  // Afterwards the page goes back to how the learner left it.
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => [...document.querySelectorAll('.allo-tree-lab details')].every(d => !(d as HTMLDetailsElement).open))).toBe(true);
  await page.emulateMedia({ media: 'screen' });
});

test('keeps content that happens to be a button, in the grove map and the quiz', async ({ page }) => {
  await mount(page, { view: 'grove', groveRun: { version: 1, seed: 'GROVE-01', mode: 'deck', choices: [{ priority: 'offspring', route: 'mixed' }] } });
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(300);
  // The habitat patches are buttons, but they are the evidence, so they must print.
  expect(await page.locator('.grove-patch:visible').count()).toBe(9);
  expect(await shown(page, '.grove-receipt')).toBe(true);
  // The camera and view controls are pointer-only and go.
  expect(await shown(page, '.grove-view-switch')).toBeFalsy();
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.waitForTimeout(250);
  await page.locator('.allo-tree-lab').screenshot({ path: '.tmp/tree-review/print-grove.png', animations: 'disabled', timeout: 60000 });
  await page.emulateMedia({ media: 'screen' });
  await mount(page, { view: 'quiz' });
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(300);
  // A printed quiz without its answer options would be useless.
  expect(await page.locator('.allo-tree-quiz-opt:visible').count()).toBeGreaterThanOrEqual(4);
  await page.locator('.allo-tree-lab').screenshot({ path: '.tmp/tree-review/print-quiz.png', animations: 'disabled', timeout: 60000 });
  await page.emulateMedia({ media: 'screen' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
