import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Cell Biology Simulator — Play-as-Cell must not steal keystrokes meant for the page.
 *
 * WHY THIS EXISTS
 * The driver binds keydown/keyup on WINDOW and calls preventDefault on w/a/s/d and the
 * arrows, with no check on where the keystroke came from. Measured 2026-08-16 with play
 * mode on: typing "was a sword" into the tool's own search box produced "  or". Every
 * w, a, s and d in the tool was being eaten — mode search, organism search, glossary
 * search, the AI question box — and the arrow keys were taken from the zoom and speed
 * sliders, which are `input type=range` and are driven by exactly those keys.
 *
 * The fix has to cut both ways, so this asserts both: keystrokes aimed at a form
 * control reach it, AND movement keys are still consumed when they are not. A guard
 * that simply stopped consuming keys would pass the first half and silently disable
 * play mode.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_cell.js',
  toolId: 'cell',
  width: 1200,
  height: 900,
  appStyles: true,
  probes: `
    window.__enterPlay = function () {
      var cv = document.querySelector('[data-cell-sim-canvas]');
      if (!cv || !cv._cellSimSetPlayAs) return false;
      cv._cellSimSetPlayAs('amoeba');
      return cv.style.cursor === 'crosshair';
    };
    window.__focusSearch = function () {
      var el = document.querySelector('#wrap input[type=text], #wrap textarea');
      if (!el) return null;
      el.focus();
      return document.activeElement === el;
    };
    window.__searchValue = function () {
      var el = document.querySelector('#wrap input[type=text], #wrap textarea');
      return el ? el.value : null;
    };
    window.__focusRange = function () {
      var el = document.querySelector('#wrap input[type=range]');
      if (!el) return null;
      el.focus();
      return { focused: document.activeElement === el, value: el.value, label: el.getAttribute('aria-label') };
    };
    window.__rangeValue = function () {
      var el = document.querySelector('#wrap input[type=range]');
      return el ? el.value : null;
    };
    window.__focusBody = function () {
      var el = document.querySelector('[data-cell-sim-canvas]');
      if (el) el.focus();
      return document.activeElement === el;
    };
    // Whether the tool consumed the key can only be read by a listener that runs AFTER
    // the tool's own. The tool binds on WINDOW, and probes are injected BEFORE the tool
    // script — so this has to be armed from the test after mount, and on window: a
    // document-level listener runs on the way UP to window and always sees false.
    window.__consumed = null;
    window.__armConsumedProbe = function () {
      window.addEventListener('keydown', function (e) { window.__consumed = e.defaultPrevented; });
    };
    window.__canvasOutline = function () {
      var el = document.querySelector('[data-cell-sim-canvas]');
      if (!el) return null;
      var cs = getComputedStyle(el);
      return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) || 0, color: cs.outlineColor };
    };
    window.__onCanvas = function () {
      var el = document.querySelector('[data-cell-sim-canvas]');
      return !!(el && document.activeElement === el);
    };
  `,
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.describe.configure({ timeout: 200_000 });

test('play mode leaves text fields and sliders alone but still drives the cell', async ({ page }) => {
  await harness.mount(page, { cell: { mode: 'encyclopedia' } }, undefined, { expectCanvas: false });
  await page.waitForTimeout(1500);
  await page.evaluate(() => (window as any).__armConsumedProbe());

  expect(await page.evaluate(() => (window as any).__enterPlay()),
    'play mode did not engage, so nothing below is being tested').toBe(true);

  // 1. A text field receives every character, including the movement letters.
  expect(await page.evaluate(() => (window as any).__focusSearch()),
    'no text field to type into').toBe(true);
  await page.keyboard.type('was a sword');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as any).__searchValue()),
    'the play-mode key handler swallowed the w/a/s/d characters on their way to a text field')
    .toBe('was a sword');

  // 2. Arrow keys still drive a range slider.
  const range = await page.evaluate(() => (window as any).__focusRange());
  expect(range && range.focused, 'no range slider to test').toBe(true);
  const before = range.value;
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as any).__rangeValue()),
    `the slider "${range.label}" did not move: play mode is still taking its arrow keys`)
    .not.toBe(before);

  // 3. ...and movement keys are STILL consumed when they are not aimed at a control.
  // Without this, a guard that just stopped handling keys would pass the two above.
  // Play mode is re-entered first: typing into the mode search re-renders the tool and
  // remounts the canvas, which drops the play target — so a check here without this
  // would be asserting against a tool that simply is not in play mode any more.
  expect(await page.evaluate(() => (window as any).__enterPlay()),
    'play mode did not re-engage after the canvas remounted').toBe(true);
  expect(await page.evaluate(() => (window as any).__focusBody()),
    'the simulation canvas could not take focus').toBe(true);
  await page.evaluate(() => { (window as any).__consumed = null; });
  await page.keyboard.press('w');
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).__consumed),
    'the movement key was not consumed with focus on the canvas — play mode is broken')
    .toBe(true);
});

test('the focusable simulation canvas shows a focus indicator', async ({ page }) => {
  // The canvas carried `outline: none` inline while being a tab stop: a focus indicator
  // deliberately removed from a focusable element.
  await harness.mount(page, { cell: {} }, undefined, { expectCanvas: false });
  await page.waitForTimeout(1500);

  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => (window as any).__onCanvas())) break;
    await page.keyboard.press('Tab');
  }
  expect(await page.evaluate(() => (window as any).__onCanvas()),
    'the simulation canvas is not reachable by Tab').toBe(true);

  const outline = await page.evaluate(() => (window as any).__canvasOutline());
  expect(outline.style, 'the focused canvas draws no outline').not.toBe('none');
  expect(outline.width,
    `a ${outline.width}px ring is not a focus indicator`).toBeGreaterThanOrEqual(3);
});
