// Safari renders a native <select> at its intrinsic height and ignores min-height/padding unless
// `appearance` is reset, which made every select in the app a thin strip on macOS and iPad Safari
// while Chrome showed 44px. The global rule in desktop/web-app/src/index.css resets it and draws
// the arrow. This test measures a select styled the way the app styles its controls, in WebKit when
// that engine is installed (real Safari behaviour) and always in Chromium (no regression there).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const css = readFileSync(resolve(process.cwd(), 'desktop/web-app/src/index.css'), 'utf8');
const start = css.indexOf('select:not([multiple]):not([size]):not(.appearance-none) {');
const end = css.indexOf('@media (pointer: coarse)');
const selectRules = start >= 0 && end > start ? css.slice(start, end) : '';

const page = (rules) => `<!doctype html><html><head><style>
  .ctl { min-height: 44px; padding: 10px 12px; border: 2px solid #475569; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
  ${rules}
</style></head><body>
  <input id="i" class="ctl" value="x">
  <select id="s" class="ctl"><option>All Resources</option><option>Two</option></select>
  <select id="m" class="ctl" multiple size="3"><option>a</option><option>b</option></select>
</body></html>`;

async function measure(engine, rules) {
  const browser = await engine.launch();
  try {
    const p = await browser.newPage({ viewport: { width: 600, height: 300 } });
    await p.setContent(page(rules));
    return await p.evaluate(() => {
      const h = (id) => Math.round(document.getElementById(id).getBoundingClientRect().height);
      const s = getComputedStyle(document.getElementById('s'));
      return { input: h('i'), select: h('s'), multi: h('m'), appearance: s.appearance || s.webkitAppearance, arrow: s.backgroundImage !== 'none' };
    });
  } finally { await browser.close(); }
}

async function engineAvailable(engine) { try { const b = await engine.launch(); await b.close(); return true; } catch (_) { return false; } }

describe('select controls honour the 44px minimum in WebKit (Safari) as well as Chromium', () => {
  it('ships the appearance reset in the global stylesheet', () => {
    expect(selectRules).toContain('appearance: none');
    expect(selectRules).toContain('background-image: url("data:image/svg+xml');
    expect(selectRules).toContain(':not(.appearance-none)');
    expect(selectRules).toContain('forced-colors: active');
  });

  it('Chromium: 44px with and without the rule (no regression)', async () => {
    const before = await measure(chromium, '');
    const after = await measure(chromium, selectRules);
    expect(before.select).toBeGreaterThanOrEqual(44);
    expect(after.select).toBeGreaterThanOrEqual(44);
    expect(after.arrow).toBe(true);
    expect(after.multi).toBeGreaterThan(44); // list boxes keep their native rendering and rows
  }, 60000);

  it('WebKit: the rule is what lifts the select from its intrinsic height to 44px', async (ctx) => {
    if (!(await engineAvailable(webkit))) { ctx.skip(); return; }
    const before = await measure(webkit, '');
    const after = await measure(webkit, selectRules);
    expect(before.input).toBeGreaterThanOrEqual(44);
    // This used to assert before.select < 44 — the original defect, where WebKit
    // ignored min-height on a menulist select and left it under the touch-target
    // minimum. WebKit has since changed: it now renders the bare select at 50px,
    // so that precondition fails on a browser where nothing is wrong. Measured
    // here 2026-09-20: 50 without the rule, exactly 44 with it.
    //
    // What the rule has to guarantee is the 44px minimum, whichever side it
    // approaches from, so assert that rather than re-pinning a number the engine
    // owns. The appearance and arrow assertions below still prove the rule is
    // the thing doing the work.
    expect(after.select).toBeGreaterThanOrEqual(44);
    expect(after.appearance).toBe('none');
    expect(after.arrow).toBe(true);
  }, 60000);
});
