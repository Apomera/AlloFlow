// Scale Explorer — the fullscreen button must say which state it is in.
//
// WHY THIS EXISTS
// The button rendered one flat string, "⛶ Fullscreen", with no aria-label, no
// aria-pressed and no listener. Pressing it filled the screen and left the
// control still reading "Fullscreen": a sighted learner had to guess, and a
// screen-reader user had no way to tell the state at all. The toggle itself was
// always fine — it called the shared window.__alloStemFS — so this was purely a
// labelling gap.
//
// It now hands the button to window.__alloStemFsBind, the shared helper 56 other
// STEM tools use, which syncs aria-label, aria-pressed, title and the glyph from
// the real fullscreenchange event. That matters most for the exit path: Escape
// leaves fullscreen without ever passing through a click handler, so a label
// driven by clicks alone desynchronises exactly when the user needs it.
//
// The suite runs the SHARED helper out of stem_lab_module.js against the real
// SSR markup, rather than restating what it does.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';

const ROOT = path.resolve(__dirname, '..');
const TOOL_REL = 'stem_lab/stem_tool_scaleexplorer.js';
const MODULE = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_lab_module.js'), 'utf8');

// Extract the two shared fullscreen blocks rather than executing the whole
// 631 KB module, which would drag in the registry and the plugin pump.
function sharedFullscreenSource() {
  const start = MODULE.indexOf("if (typeof window !== 'undefined' && !window.__alloStemFS) {");
  expect(start, '__alloStemFS block is still in stem_lab_module.js').toBeGreaterThan(-1);
  const bindAt = MODULE.indexOf('window.__alloStemFsBind = function (btn, stage) {', start);
  expect(bindAt, '__alloStemFsBind is still defined after it').toBeGreaterThan(start);
  const guardAt = MODULE.lastIndexOf('if (typeof window !== ', bindAt);
  let depth = 0;
  let end = -1;
  for (let i = guardAt; i < MODULE.length; i += 1) {
    const ch = MODULE[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') { depth -= 1; if (depth === 0) { end = i + 1; break; } }
  }
  expect(end, 'binder block is brace balanced').toBeGreaterThan(guardAt);
  return MODULE.slice(start, end);
}

describe('Scale Explorer fullscreen control reports its own state', () => {
  let browser;
  let rendered;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  }, 120000);

  afterAll(async () => {
    if (browser) await browser.close();
  }, 30000);

  function markup() {
    if (!rendered) {
      // The button is gated on `typeof window.__alloStemFS === 'function'`, and
      // the SSR harness has no stem_lab_module.js, so without this the branch
      // never renders and every assertion below would fail on a null button.
      // Installing the REAL shared helpers (not a stub) reproduces what the app
      // always has, since the module defines them for every tool.
      // eslint-disable-next-line no-new-func
      new Function(sharedFullscreenSource()).call(globalThis);
      resetStemLab();
      loadTool(TOOL_REL, 'scaleExplorer');
      rendered = prepareStemBrowserRender(renderTool('scaleExplorer', {}, {}));
    }
    return rendered;
  }

  async function openPage() {
    const r = markup();
    const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
    await page.setContent(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"></head>' +
      '<body style="margin:0"><main>' + r.html + '</main></body></html>',
      { waitUntil: 'domcontentloaded' },
    );
    for (const css of r.cssSheets) await page.addStyleTag({ content: css });
    // SSR markup carries no React handlers, so the ref callback that binds this
    // button in the browser never ran. Bind it here to exercise the RUNTIME
    // behaviour — but see the separate source assertion below: because this
    // harness always binds, the runtime tests alone cannot tell whether the TOOL
    // wires itself. Deleting the tool's ref used to leave every test green.
    await page.evaluate((src) => {
      // eslint-disable-next-line no-new-func
      new Function(src)();
      const btn = document.querySelector('[data-allo-fs-btn]');
      window.__alloStemFsBind(btn, btn.closest('[data-allo-fs-stage]'));
    }, sharedFullscreenSource());
    return page;
  }

  it('wires the button to the shared binder in the tool itself', () => {
    // The guard the runtime tests cannot provide. Without this, removing the ref
    // callback ships a button whose label never changes — the exact defect this
    // suite exists for — while the browser tests keep passing, because the
    // harness binds it for the tool.
    const src = fs.readFileSync(path.join(ROOT, TOOL_REL), 'utf8');
    const at = src.indexOf("'data-allo-fs-btn': 'true',");
    expect(at, 'the fullscreen button is still marked').toBeGreaterThan(-1);
    const near = src.slice(at, at + 900);
    expect(near, 'the tool must bind the button itself, not rely on a test to do it')
      .toContain('__alloStemFsBind');
    expect(near).toContain("closest('[data-allo-fs-stage]')");
    // data-fs-in / data-fs-out are what the binder reads for BOTH labels; a
    // static aria-label alone is overwritten by its first sync(), so these are
    // the attributes that actually decide what the button says.
    expect(near, 'the exit label must be supplied').toContain('data-fs-in');
    expect(near, 'the enter label must be supplied').toContain('data-fs-out');
  });

  it('ships a named, unpressed button wired to a stage', async () => {
    const page = await openPage();
    const found = await page.$$eval('[data-allo-fs-btn]', (nodes) => nodes.map((n) => ({
      label: n.getAttribute('aria-label'),
      pressed: n.getAttribute('aria-pressed'),
      type: n.getAttribute('type'),
      hasStage: !!n.closest('[data-allo-fs-stage]'),
      // The binder swaps firstElementChild.textContent, so the glyph must BE one.
      firstChildIsElement: !!n.firstElementChild,
    })));
    expect(found).toHaveLength(1);
    expect(found[0].label, 'an icon+word button still needs a real name').toBe('View the scale explorer full screen');
    expect(found[0].pressed).toBe('false');
    expect(found[0].type).toBe('button');
    expect(found[0].hasStage, 'closest() must find a stage or the button is inert').toBe(true);
    expect(found[0].firstChildIsElement, 'glyph must be an element for the binder to swap').toBe(true);
    await page.close();
  }, 60000);

  it('re-labels itself on entering, and on an Esc-style exit', async () => {
    const page = await openPage();

    await page.click('[data-allo-fs-btn]');
    await page.waitForFunction(
      () => document.querySelector('[data-allo-fs-btn]').getAttribute('aria-pressed') === 'true',
      null,
      { timeout: 5000 },
    );
    const entered = await page.$eval('[data-allo-fs-btn]', (n) => ({
      label: n.getAttribute('aria-label'),
      title: n.getAttribute('title'),
      glyph: n.firstElementChild ? n.firstElementChild.textContent : null,
    }));
    expect(entered.label, 'this is the defect: it used to still say "Fullscreen"').toBe('Exit full screen scale explorer');
    expect(entered.title).toBe('Exit full screen scale explorer');
    expect(entered.glyph).toBe('✕');

    // Escape does NOT go through the click handler. Exiting out of band is the
    // case a click-driven label gets wrong.
    //
    // Mutation note: deleting ONE of the binder's two native checks
    // (document.fullscreenElement / document.webkitFullscreenElement) will not
    // fail this, and that is the code being portable rather than a hole —
    // Chromium exposes both. Remove BOTH and this goes red.
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(
      () => document.querySelector('[data-allo-fs-btn]').getAttribute('aria-pressed') === 'false',
      null,
      { timeout: 5000 },
    );
    const exited = await page.$eval('[data-allo-fs-btn]', (n) => ({
      label: n.getAttribute('aria-label'),
      glyph: n.firstElementChild ? n.firstElementChild.textContent : null,
    }));
    expect(exited.label, 'label follows the browser, not the click count').toBe('View the scale explorer full screen');
    expect(exited.glyph).toBe('⛶');
    await page.close();
  }, 60000);

  it('makes the marked stage the fullscreen element, matched to the viewport', async () => {
    // NOT "the stage gets taller". This tool's stage is a tall scrolling column
    // (1276px in a 720px viewport), so entering fullscreen legitimately makes it
    // SHORTER: it becomes the viewport and scrolls internally. Asserting growth
    // here would have encoded the waterCycle shape, where the stage is a fixed
    // clamp(...520px) box. What matters for both is that the element the button
    // marked is the element the browser promoted, and that it matches the screen.
    const page = await openPage();
    await page.click('[data-allo-fs-btn]');
    await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 5000 });
    const after = await page.evaluate(() => {
      const el = document.querySelector('[data-allo-fs-stage]');
      const r = el.getBoundingClientRect();
      return {
        h: r.height, w: r.width,
        isStage: document.fullscreenElement === el,
        inner: window.innerHeight, innerW: window.innerWidth,
      };
    });
    expect(after.isStage, 'the marked stage is what goes fullscreen').toBe(true);
    expect(after.w).toBeGreaterThan(after.innerW * 0.9);
    expect(after.h).toBeGreaterThan(after.inner * 0.9);
    await page.close();
  }, 60000);
});
