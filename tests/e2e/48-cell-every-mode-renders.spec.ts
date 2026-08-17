import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Cell Biology Simulator — every mode renders, and none of them leaks a raw JS value.
 *
 * WHY THIS EXISTS
 * The tool has 17 modes. The static crash gate only exercises the DEFAULT state, and a
 * render golden pins one snapshot — so a mode that renders an empty shell, or one that
 * prints "undefined" into a heading, is invisible to both. Found this way 2026-08-16:
 * play mode's header read "🎮 Playing as undefined". The label was
 * `(ORGANISMS.find(...) || {}).label`, which guarded the crash and then showed the word
 * to the student. It is reachable on two ordinary paths, both of which clear the
 * organism while leaving `d.mode` at 'play': the played organism dies or is culled, and
 * a reopened session whose organism is not in the regenerated world.
 *
 * The "undefined"/"NaN" assertion is the general form of that bug. It is cheap, it
 * covers every mode at once, and it is the class most likely to reach a student
 * unnoticed — a wrong number is argued about, a missing one is reported, but a stray
 * `undefined` in a heading just looks like the tool is broken.
 */
const MODES = ['observe', 'interior', 'microdissection', 'processes', 'play', 'quiz',
  'encyclopedia', 'filter', 'compare', 'history', 'biologists', 'lab', 'disease',
  'ecology', 'glossary', 'library', 'finale'];

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_cell.js',
  toolId: 'cell',
  width: 1200,
  height: 900,
  appStyles: true,
  probes: `
    window.__errors = [];
    (function () {
      var realError = console.error;
      console.error = function () {
        try { window.__errors.push(Array.prototype.join.call(arguments, ' ').slice(0, 200)); } catch (e) {}
        return realError.apply(console, arguments);
      };
    })();
    window.__snapshot = function () {
      var w = document.getElementById('wrap');
      if (!w) return null;
      var text = (w.innerText || '').replace(/\\s+/g, ' ').trim();
      return {
        chars: text.length,
        buttons: w.querySelectorAll('button').length,
        // Context, not just a count: "undefined" three screens down is a different
        // problem from "undefined" in the header, and the message should say which.
        undefContext: (text.match(/.{0,50}undefined.{0,30}/) || [''])[0],
        nanContext: (text.match(/.{0,50}\\bNaN\\b.{0,30}/) || [''])[0],
      };
    };
    window.__takeErrors = function () {
      var e = window.__errors.slice();
      window.__errors.length = 0;
      return e;
    };
  `,
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.describe.configure({ timeout: 300_000 });

for (const mode of MODES) {
  test(`${mode} mode renders without leaking a raw value`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 200)));

    await harness.mount(page, { cell: { mode, quizMode: mode === 'quiz' } },
      undefined, { expectCanvas: false });
    await page.waitForTimeout(900);

    const snap = await page.evaluate(() => (window as any).__snapshot());
    const consoleErrors: string[] = await page.evaluate(() => (window as any).__takeErrors());

    expect(pageErrors, `${mode} threw while rendering`).toEqual([]);
    expect(consoleErrors.filter((e) => !/ResizeObserver loop/.test(e)),
      `${mode} logged an error while rendering`).toEqual([]);

    // A floor, not an exact count: this catches a mode that renders an empty shell
    // without pinning layout that is expected to change.
    expect(snap.chars, `${mode} rendered almost no text (${snap.chars} chars) — it is `
      + 'probably an empty shell rather than a working mode').toBeGreaterThan(800);
    expect(snap.buttons, `${mode} rendered no controls`).toBeGreaterThan(3);

    expect(snap.undefContext,
      `${mode} shows the word "undefined" to the student: "${snap.undefContext}"`).toBe('');
    expect(snap.nanContext,
      `${mode} shows "NaN" to the student: "${snap.nanContext}"`).toBe('');
  });
}
