// Water Cycle — full-screen control for the main droplet-journey viewport.
//
// WHY THIS EXISTS
// Before this, the only requestFullscreen in the tool's 31,000 lines was the
// precipitation storm chamber. The main journey scene — the one "Begin as a
// droplet" drives, and the one a teacher projects to a class — was locked
// inside height:clamp(360px,48vw,520px)!important with no way out.
//
// WHAT IS ACTUALLY AT RISK HERE, and why each check is a browser check.
// Three things can silently break this feature, and none of them is visible to
// a source-text pin:
//
//   1. The scene must actually fill the screen. Worth measuring, though NOT for
//      the reason it first appears: the shell carries
//      height:clamp(360px,48vw,520px)!important, and the obvious worry is that
//      fullscreen letterboxes at 520px. Measured, it does not — Chromium's UA
//      :fullscreen sheet outranks author !important, so the shell reaches
//      1100x720 with an author size, without one, and without !important. The
//      measurement stays because "it fills the screen" is the actual contract
//      and the cascade reasoning behind it is subtle enough to get wrong twice.
//   2. The button must fullscreen the SHELL, not the canvas. The pause / speed
//      / rotate / follow controls live in a dock absolutely positioned inside
//      the shell; targeting the canvas would strand every one of them offscreen
//      mid-journey. Asserted by checking the controls are still visible.
//   3. Esc exits fullscreen without firing the click handler, so a label driven
//      only by clicks desynchronises and tells a screen-reader user "exit full
//      screen" on a button that enters it. Asserted by dispatching a real exit.
//
// The SSR harness cannot attach React handlers, so the toggle logic is lifted
// out of the shipped source and evaluated against the real rendered DOM in
// Chromium. That keeps the behaviour under test while the markup it runs
// against stays the genuine article.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';

const ROOT = path.resolve(__dirname, '..');
const TOOL_REL = 'stem_lab/stem_tool_watercycle.js';
const TOOL = path.join(ROOT, TOOL_REL);

// 3D journey, mid-flight: the state in which the dock and this button exist.
//
// `_threeLoaded` sits NEXT TO `waterCycle`, not inside it, and not on
// ctx.labToolData: this tool opens with `var labToolData = ctx.toolData`, so the
// name in the source is an alias for the tool-data object seeded here.
//
// It must be true. While it is false the tool renders a full-bleed "Loading the
// 3D water journey..." status overlay at z-index 6 across the whole shell. In
// the real app Three.js resolves and the overlay goes away; in a static SSR page
// it never would, and it swallowed every click aimed at the dock beneath it.
// Setting this reproduces the post-load state a student actually sees, rather
// than deleting the node from the DOM and testing a surface the product never
// renders.
const JOURNEY_STATE = {
  _threeLoaded: true,
  waterCycle: { wcMode: 'explorer', journeyView: '3d', journeyActive: true },
};

function renderJourney() {
  resetStemLab();
  loadTool(TOOL_REL, 'waterCycle');
  return prepareStemBrowserRender(renderTool('waterCycle', JOURNEY_STATE, {}));
}

// The page is built from the SSR markup, so nothing is wired. Re-attach ONLY
// the shipped toggle: read it out of the source rather than restating it, so a
// future edit to the real handler is what this suite measures.
const SOURCE = fs.readFileSync(TOOL, 'utf8');

function shippedHandlerBody() {
  const marker = 'className: "wc-viewport-btn wc-viewport-fullscreen"';
  const at = SOURCE.indexOf(marker);
  expect(at, 'full-screen button is still in the source').toBeGreaterThan(-1);
  const onClickAt = SOURCE.indexOf('onClick: function(event) {', at);
  expect(onClickAt, 'its onClick is still an event handler').toBeGreaterThan(at);
  const bodyStart = SOURCE.indexOf('{', onClickAt + 'onClick: function(event)'.length);
  // Balance braces to the end of the handler.
  let depth = 0;
  let end = -1;
  for (let i = bodyStart; i < SOURCE.length; i += 1) {
    const ch = SOURCE[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  expect(end, 'handler body is brace balanced').toBeGreaterThan(bodyStart);
  return SOURCE.slice(bodyStart + 1, end);
}

describe('Water Cycle droplet journey full-screen control', () => {
  let browser;
  let rendered;

  // Only the browser launch belongs in the hook. This is the third suite in the
  // watercycle set to launch Chromium, and with all three starting at once the
  // neighbouring target-size suite began timing out in its own 30s beforeAll.
  // The SSR render of a 1.2 MB tool is the expensive half, so it moves out of
  // the hook and is memoised on first use instead; the explicit timeout covers
  // a launch that is merely queued behind the other two.
  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  }, 120000);

  afterAll(async () => {
    if (browser) await browser.close();
  }, 30000);

  function journeyMarkup() {
    if (!rendered) rendered = renderJourney();
    return rendered;
  }

  async function openPage() {
    const rendered = journeyMarkup();
    const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
    await page.setContent(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"></head>' +
      '<body><main id="tool-root">' + rendered.html + '</main></body></html>',
      { waitUntil: 'domcontentloaded' },
    );
    for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
    // If the loading overlay ever comes back, every click below would fail as a
    // 30s "element intercepts pointer events" timeout. Say why instead.
    const blocked = await page.$$eval('.wc-3d-loading', (n) => n.length);
    expect(blocked, 'the 3D loading overlay must be gone before clicks are meaningful').toBe(0);
    // Wire the SHIPPED handler to the real button.
    await page.evaluate((body) => {
      const btn = document.querySelector('.wc-viewport-fullscreen');
      // eslint-disable-next-line no-new-func
      const handler = new Function('event', '__alloT', 'announceToSR', body);
      btn.addEventListener('click', (event) => {
        handler(event, (key, fallback) => fallback, () => {});
      });
    }, shippedHandlerBody());
    return page;
  }

  it('renders one full-screen button in the 3D viewport, with a name and a pressed state', async () => {
    const page = await openPage();
    const found = await page.$$eval('.wc-viewport-fullscreen', (nodes) => nodes.map((n) => ({
      label: n.getAttribute('aria-label'),
      pressed: n.getAttribute('aria-pressed'),
      type: n.getAttribute('type'),
      inDock: !!n.closest('.wc-viewport-actions'),
    })));
    expect(found).toHaveLength(1);
    expect(found[0].label).toBe('View the droplet journey full screen');
    expect(found[0].pressed).toBe('false');
    expect(found[0].type, 'a button inside a form-ish dock must not submit').toBe('button');
    expect(found[0].inDock, 'sits with the other camera controls').toBe(true);
    await page.close();
  }, 60000);

  it('fills the viewport when activated', async () => {
    const page = await openPage();

    const before = await page.$eval('[data-watercycle-canvas-shell]', (el) => el.getBoundingClientRect().height);
    // Establishes that the shell really is clamped BEFORE the click, so the
    // growth measured after it is the fullscreen transition doing work rather
    // than a page that was already full height.
    expect(before, 'shell starts inside its clamp').toBeLessThan(620);

    await page.click('.wc-viewport-fullscreen');
    await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 5000 });

    const after = await page.evaluate(() => {
      const shell = document.querySelector('[data-watercycle-canvas-shell]');
      const rect = shell.getBoundingClientRect();
      return {
        isShell: document.fullscreenElement === shell,
        height: rect.height,
        width: rect.width,
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
      };
    });

    expect(after.isShell, 'the SHELL goes fullscreen, not the bare canvas').toBe(true);
    // The real assertion: it actually FILLS the screen. A rule that lost to
    // !important would leave this at the clamp value and still pass a
    // "fullscreenElement is set" check.
    expect(after.height).toBeGreaterThan(after.innerHeight * 0.9);
    expect(after.width).toBeGreaterThan(after.innerWidth * 0.9);
    await page.close();
  }, 60000);

  it('keeps the journey controls reachable while full screen', async () => {
    const page = await openPage();
    await page.click('.wc-viewport-fullscreen');
    await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 5000 });

    // Stranding these is the failure mode that makes fullscreen worse than
    // useless: a student cannot pause or re-aim a journey they are watching.
    const controls = await page.evaluate(() => {
      const shell = document.querySelector('[data-watercycle-canvas-shell]');
      const wanted = ['Pause water journey', 'Follow the droplet with the guided camera', 'Zoom in'];
      return wanted.map((label) => {
        const el = shell.querySelector('[aria-label="' + label + '"]');
        if (!el) return { label, present: false };
        const r = el.getBoundingClientRect();
        return {
          label,
          present: true,
          inside: r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight + 1 && r.right <= window.innerWidth + 1,
          sized: r.width > 0 && r.height > 0,
        };
      });
    });
    for (const c of controls) {
      expect(c.present, c.label + ' survives into fullscreen').toBe(true);
      expect(c.sized, c.label + ' is rendered').toBe(true);
      expect(c.inside, c.label + ' is on screen, not clipped off the fullscreen surface').toBe(true);
    }
    await page.close();
  }, 60000);

  it('re-labels itself on the real fullscreenchange, including an Esc-style exit', async () => {
    const page = await openPage();

    await page.click('.wc-viewport-fullscreen');
    await page.waitForFunction(
      () => document.querySelector('.wc-viewport-fullscreen').getAttribute('aria-pressed') === 'true',
      null,
      { timeout: 5000 },
    );
    const entered = await page.$eval('.wc-viewport-fullscreen', (n) => ({
      label: n.getAttribute('aria-label'),
      tooltip: n.getAttribute('data-tooltip'),
      text: n.textContent,
    }));
    expect(entered.label).toBe('Exit full screen droplet journey');
    expect(entered.tooltip).toBe('Exit full screen');

    // Esc does NOT go through the click handler. Exiting out of band is the
    // case a click-driven label gets wrong.
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(
      () => document.querySelector('.wc-viewport-fullscreen').getAttribute('aria-pressed') === 'false',
      null,
      { timeout: 5000 },
    );
    const exited = await page.$eval('.wc-viewport-fullscreen', (n) => ({
      label: n.getAttribute('aria-label'),
      tooltip: n.getAttribute('data-tooltip'),
    }));
    expect(exited.label, 'label follows the browser, not the click count').toBe('View the droplet journey full screen');
    expect(exited.tooltip).toBe('Full screen');
    await page.close();
  }, 60000);

  it('does not offer the control in 2D, where there is no 3D scene to enlarge', () => {
    resetStemLab();
    loadTool(TOOL_REL, 'waterCycle');
    const out = renderTool('waterCycle', { waterCycle: { wcMode: 'explorer', journeyView: '2d' } }, {});
    const html = typeof out === 'string' ? out : out.html;
    expect(html).toContain('data-watercycle-canvas-shell');
    expect(html).not.toContain('wc-viewport-fullscreen');
  }, 60000);

  it('strips the card trim in fullscreen, and does not restate the sizing', () => {
    const rule = SOURCE.match(/'\.wc-canvas-shell:fullscreen\{[^']*'/);
    expect(rule, 'fullscreen trim rule is present').toBeTruthy();
    // What the rule is actually for — measured in the companion test below.
    expect(rule[0]).toContain('border-radius:0!important');
    expect(rule[0]).toContain('border:0!important');
    // And what it should NOT contain. Author width/height here is dead weight:
    // the UA sheet already outranks it, so writing it would imply the sizing
    // depends on this rule when nothing does. This guard exists so the next
    // person to "fix" fullscreen sizing reads the reason instead of re-adding it.
    expect(rule[0]).not.toContain('height:100vh');
    expect(rule[0]).not.toContain('width:100vw');
  });

  it('removes the rounded card trim once full screen, which is what the rule buys', async () => {
    // The honest companion to the assertion above: with the trim rule in play
    // the fullscreen scene must go edge to edge, not render as an 18px-rounded
    // bordered card sitting on the black fullscreen backdrop.
    //
    // Mutation note for whoever checks whether this is vacuous: breaking ONE of
    // the two trim rules will NOT fail this test, and that is correct rather
    // than a hole. Chromium matches both :fullscreen and :-webkit-full-screen,
    // so either rule alone still delivers border-radius:0 — the duplicate is
    // doing its job. Strip the trim from BOTH and this reports
    // "expected '18px' to be '0px'", which is the real defect.
    const page = await openPage();
    await page.click('.wc-viewport-fullscreen');
    await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 5000 });
    const trim = await page.$eval('[data-watercycle-canvas-shell]', (el) => {
      const cs = getComputedStyle(el);
      return { radius: cs.borderTopLeftRadius, border: cs.borderTopWidth };
    });
    expect(trim.radius).toBe('0px');
    expect(trim.border).toBe('0px');
    await page.close();
  }, 60000);
});
