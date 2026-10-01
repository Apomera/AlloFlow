import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/** RoadReady — the four controls that were pointer-only.
 *
 *  These assert real Enter/Space ACTIVATION, not attributes. role + tabIndex with a
 *  dead key handler is the failure this guards, and an attribute-only test passes
 *  straight through it — verified the hard way: two of these went green on
 *  attributes while Enter did nothing.
 *
 *  The four fixed controls must be focusable AND operable by keyboard.
 *  role+tabIndex without a working key handler is the worse bug, so this drives
 *  real Enter/Space rather than asserting attributes. */
test.describe.configure({ timeout: 150_000 });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady', width: 1100, height: 900,
  preScripts: ['stem_lab/stem_lab_module.js'],
  probes: `window.__byLabel = function (re) {
    var els = [].slice.call(document.querySelectorAll('#wrap [aria-label]'));
    var hit = els.filter(function (e) { return new RegExp(re, 'i').test(e.getAttribute('aria-label') || ''); })[0];
    if (!hit) return null;
    hit.setAttribute('data-under-test', '1');
    return { label: hit.getAttribute('aria-label'), tabIndex: hit.tabIndex, role: hit.getAttribute('role') };
  };
  window.__label = function () {
    var e = document.querySelector('#wrap [data-under-test]');
    return e ? e.getAttribute('aria-label') : null;
  };`,
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mountAt(page: any, state: Record<string, unknown>) {
  await harness.mount(page, { roadReady: state }, undefined, { expectCanvas: false });
}

test('permit flashcard flips from the keyboard', async ({ page }) => {
  await mountAt(page, { view: 'permitFlashcards' });

  const found = await page.evaluate(() => (window as any).__byLabel('Flashcard, question side'));
  expect(found, 'flashcard control not found').not.toBeNull();
  expect(found.tabIndex, 'not focusable').toBe(0);
  expect(found.role).toBe('button');

  await page.locator('[data-under-test]').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  // Enter must actually flip it, not merely be announced.
  const after = await page.evaluate(() => (window as any).__byLabel('Flashcard, answer side'));
  expect(after, 'Enter did not flip the card').not.toBeNull();
});

test('reaction trainer starts from the keyboard', async ({ page }) => {
  await mountAt(page, { view: 'reactionTrainer' });

  const found = await page.evaluate(() => (window as any).__byLabel('Reaction trainer\\. Press Enter'));
  expect(found, 'reaction control not found').not.toBeNull();
  expect(found.tabIndex).toBe(0);

  await page.locator('[data-under-test]').focus();
  await page.keyboard.press(' ');
  await page.waitForTimeout(700);
  // Space must move it out of the waiting phase.
  const waiting = await page.evaluate(() => (window as any).__byLabel('Reaction trainer\\. Press Enter'));
  expect(waiting, 'Space did not start the trainer').toBeNull();
});

test('hazard drill can be answered from the keyboard', async ({ page }) => {
  // Seed an in-progress round: the drill only shows its response target when active.
  await mountAt(page, {
    view: 'hazardTest',
    htState: {
      round: 0, score: 0, total: 0, active: true, responded: false,
      startTime: Date.now(), hazard: { desc: 'Test hazard', reactionLimit: 3 }
    }
  });

  const found = await page.evaluate(() => (window as any).__byLabel('Hazard spotted'));
  expect(found, 'hazard response target not found').not.toBeNull();
  expect(found.tabIndex).toBe(0);
  expect(found.role).toBe('button');

  await page.locator('[data-under-test]').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  // Enter must record the response, not merely be announced.
  const done = await page.evaluate(() => (window as any).__byLabel('Hazard response recorded'));
  expect(done, 'Enter did not record a hazard response').not.toBeNull();
});

test('step dots are labelled and keyboard-reachable', async ({ page }) => {
  await mountAt(page, { view: 'seatSetup', ssStep: 0 });

  const dot = await page.evaluate(() => (window as any).__byLabel('Go to step 3'));
  expect(dot, 'step dot not found').not.toBeNull();
  expect(dot.tabIndex).toBe(0);
  expect(dot.role).toBe('button');

  await page.locator('[data-under-test]').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  const current = await page.evaluate(() => (window as any).__byLabel('Go to step 3, current'));
  expect(current, 'Enter did not move to step 3').not.toBeNull();
});
