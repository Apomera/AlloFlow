import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

/**
 * The rover/probe/submersible scene used to render at the bottom of a ~800px
 * stack of orrery chrome (the orbital 3D canvas, the viewpoint bar, the planet
 * picker and the scale note) that is inert while you are driving. On a laptop
 * that meant scrolling past a second 3D canvas to reach the one you fly.
 *
 * These render the tool for real and assert what the DOM actually does, rather
 * than pinning the source text: a later refactor that keeps the behaviour stays
 * green, and only a real regression in the layout goes red.
 */
const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js';
const EARTH = 'stem.solar_sys.earth';
const noop = () => {};

// The chrome that surrounds the orrery and is not useful while driving.
const COLLAPSIBLE = [
  '[data-solarsystem-canvas-world-picker]',
];

describe('Solar System surface-ops immersive layout', () => {
  let host;
  let root;
  let originalGetContext;
  let originalRequestAnimationFrame;
  let originalCancelAnimationFrame;
  let originalResizeObserver;

  const renderWith = async (solarSystem) => {
    const config = window.StemLab._registry.solarSystem;
    function Host() {
      const [toolData, setToolData] = React.useState({ solarSystem });
      return config.render(makeCtx({ toolData, setToolData }));
    }
    root = ReactDOMClient.createRoot(host);
    await React.act(async () => {
      root.render(React.createElement(Host));
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement('div');
    document.body.appendChild(host);

    originalGetContext = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = () => ({
      setTransform: noop, clearRect: noop, save: noop, restore: noop, fillRect: noop,
      strokeRect: noop, beginPath: noop, closePath: noop, roundRect: noop, rect: noop,
      arc: noop, ellipse: noop, moveTo: noop, lineTo: noop, bezierCurveTo: noop,
      quadraticCurveTo: noop, fill: noop, stroke: noop, setLineDash: noop, translate: noop,
      rotate: noop, scale: noop, fillText: noop, strokeText: noop,
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
      measureText: (text) => ({ width: String(text || '').length * 6 }),
    });

    originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = () => 1;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = noop;

    originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = window.ResizeObserver = class { observe() {} disconnect() {} };
  });

  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    root = null;
    if (host) host.remove();
    window.HTMLCanvasElement.prototype.getContext = originalGetContext;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelAnimationFrame;
    globalThis.ResizeObserver = window.ResizeObserver = originalResizeObserver;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('keeps the layout implementation mirrored in the deploy copy', () => {
    expect(readFileSync(MIRROR, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });

  it('shows the orrery chrome on the overview tab', async () => {
    await renderWith({ tutorialDismissed: true, selectedPlanet: EARTH, viewTab: 'overview' });

    const shell = host.querySelector('[data-solarsystem-canvas-shell]');
    expect(shell, 'the orrery canvas shell should render on the overview tab').not.toBeNull();
    expect(shell.getAttribute('data-solarsystem-chrome-collapsed')).toBeNull();
    expect(shell.style.display).not.toBe('none');

    COLLAPSIBLE.forEach((selector) => {
      expect(host.querySelector(selector), `${selector} should render on the overview tab`).not.toBeNull();
    });
  });

  it('collapses the orrery chrome on the surface-ops tab', async () => {
    await renderWith({ tutorialDismissed: true, selectedPlanet: EARTH, viewTab: 'drone' });

    // The orrery canvas stays MOUNTED (tearing down its WebGL context on every
    // tab switch would drop the camera state and cost a full rebuild) but is
    // taken out of layout, out of the a11y tree and out of the tab order.
    const shell = host.querySelector('[data-solarsystem-canvas-shell]');
    expect(shell, 'the orrery shell should stay mounted to keep its WebGL context').not.toBeNull();
    expect(shell.style.display).toBe('none');
    expect(shell.getAttribute('aria-hidden')).toBe('true');
    expect(shell.inert, 'the hidden orrery canvas is focusable, so it must be inert').toBe(true);

    COLLAPSIBLE.forEach((selector) => {
      expect(host.querySelector(selector), `${selector} should be collapsed on the surface-ops tab`).toBeNull();
    });
  });

  it('keeps the view tabs reachable so the scene is not a dead end', async () => {
    await renderWith({ tutorialDismissed: true, selectedPlanet: EARTH, viewTab: 'drone' });

    const tabs = host.querySelector('[data-solarsystem-world-view-tabs]');
    expect(tabs, 'the view tabs must survive the collapse or there is no way back').not.toBeNull();

    const overview = tabs.querySelector('[data-world-view-tab="overview"]');
    expect(overview, 'the overview tab must stay reachable').not.toBeNull();
    expect(overview.disabled).toBe(false);

    // The detail card carries the marker that tightens its own padding.
    const detail = host.querySelector('[data-solarsystem-planet-detail]');
    expect(detail.getAttribute('data-solarsystem-immersive')).toBe('true');
  });

  it('lifts the science ticker off the rocky-world traverse panel', () => {
    // Measured in Chromium at 1280/1024/900/760px: the traverse panel (310px
    // wide, z-index 15) sat directly on the ticker's right end at EVERY width,
    // and at 760px left only 164px of visible bar for a ~590px fact. The ticker
    // now takes its own row above it on rocky worlds; fluid worlds build no
    // traverse panel and keep the bottom row.
    const source = readFileSync(SOURCE, 'utf8');

    const bottom = source.match(/var tickerBottom = isFluid \? (\d+) : (\d+);/);
    expect(bottom, 'could not read the ticker row offset').toBeTruthy();
    const fluidBottom = Number(bottom[1]);
    const rockyBottom = Number(bottom[2]);

    const traverse = source.match(/roverTraversePanel\.style\.cssText = 'position:absolute;right:\d+px;bottom:(\d+)px/);
    expect(traverse, 'could not read the traverse panel geometry').toBeTruthy();
    const traverseBottom = Number(traverse[1]);

    // On a rocky world the ticker must start above the traverse panel's own box.
    expect(
      rockyBottom,
      `ticker bottom:${rockyBottom}px still sits inside the traverse panel at bottom:${traverseBottom}px`,
    ).toBeGreaterThan(traverseBottom);

    // Fluid worlds have no traverse panel, so the ticker should NOT be pushed up.
    expect(fluidBottom, 'fluid worlds have no traverse panel to clear').toBeLessThan(rockyBottom);
  });

  it('keeps the science ticker clear of the minimap', () => {
    // Both sit at the bottom of the scene at z-index 10, so whichever is
    // appended last simply paints over the other -- the ticker is appended
    // first, so the minimap wins. A full-width ticker therefore ran its own
    // rotating science facts underneath the minimap. Above ~1000px the centered
    // text is too short to reach it, and at <=640px a media query hides the
    // ticker outright, so the damage sat in the 641px-1000px tablet band where
    // nothing was watching.
    //
    // Derive both boxes from the source rather than pinning today's numbers, so
    // retuning either panel keeps this honest.
    const source = readFileSync(SOURCE, 'utf8');

    const ticker = source.match(/ticker\.style\.cssText = 'position:absolute;bottom:' \+ tickerBottom \+ 'px;left:\d+px;right:(\d+)px/);
    expect(ticker, 'could not read the ticker geometry').toBeTruthy();
    const tickerRight = Number(ticker[1]);

    const map = source.match(/mapPanel\.style\.cssText = 'position:absolute;bottom:\d+px;right:(\d+)px;width:(\d+)px/);
    expect(map, 'could not read the minimap geometry').toBeTruthy();
    const mapRight = Number(map[1]);
    const mapWidth = Number(map[2]);

    // The ticker's right edge must clear the minimap's left edge.
    expect(
      tickerRight,
      `ticker right:${tickerRight}px runs under the minimap, which occupies the rightmost ${mapRight + mapWidth}px`,
    ).toBeGreaterThanOrEqual(mapRight + mapWidth);
  });

  it('gives the scene more height than the chrome it replaced', async () => {
    await renderWith({ tutorialDismissed: true, selectedPlanet: EARTH, viewTab: 'drone' });

    const canvas = host.querySelector('[data-drone-canvas]');
    expect(canvas, 'the surface-ops canvas should render').not.toBeNull();

    // Target the frame by its own marker: the drone init writes an inline
    // height onto the CANVAS too, so closest('[style*=height]') finds that
    // instead and the assertion below would read the wrong element.
    const frame = host.querySelector('[data-drone-scene-frame]');
    expect(frame, 'the scene frame should carry an explicit height').not.toBeNull();
    expect(frame.contains(canvas), 'the marked frame should be the canvas ancestor').toBe(true);

    // The old frame was capped at 70vh AND hard-capped at an absolute 800px, so
    // on a tall window the scene stopped growing while the chrome above it did
    // not. Assert the viewport share went up and the absolute cap is gone,
    // rather than the exact expression, so a later retune stays green.
    const height = frame.style.height;
    expect(height, `scene height "${height}" should still be viewport-relative`).toMatch(/vh|vmin|%/);

    const vh = Number((height.match(/(\d+(?:\.\d+)?)vh/) || [])[1]);
    expect(vh, `scene height "${height}" should claim more than the old 70vh`).toBeGreaterThan(70);

    // A cap may remain, but it has to track the viewport -- a bare pixel cap is
    // the thing that stopped the scene growing on a tall screen.
    const cap = frame.style.maxHeight;
    if (cap) {
      expect(cap, `max-height "${cap}" should track the viewport, not a fixed pixel ceiling`).toMatch(/vh|vmin|%/);
    }

    // Every declaration must survive the CSS parser. A nested min()/calc() is
    // dropped WHOLESALE by strict parsers, which left the frame with no height
    // at all -- the scene then collapsed to its min-height instead of growing.
    expect(frame.style.height, 'the height declaration must survive parsing').not.toBe('');
    expect(frame.style.minHeight, 'the min-height floor must survive parsing').not.toBe('');
  });

  it('gives the scene audio caption a readable substrate', () => {
    // This caption is the TEXT ALTERNATIVE for the scene's audio, so it has to be
    // readable over whatever world is behind it. It used to be bare slate-400 at
    // 0.6 alpha with no backing: measured 1.20:1 over Earth's sunlit ocean and
    // 1.31:1 over the Martian sky, against WCAG AA's 4.5:1 for body text.
    const source = readFileSync(SOURCE, 'utf8');
    // The declaration is built by concatenation, so take the whole statement up
    // to its terminating semicolon rather than the first quoted run.
    const caption = source.match(/soundDesc\.style\.cssText = (.*);\n/);
    expect(caption, 'could not read the sound caption style').toBeTruthy();
    const css = caption[1];

    // It must paint its own substrate rather than float on the scene, and the
    // text colour must be a light one that reads against that substrate.
    expect(css, 'the caption needs its own background to be readable over any world')
      .toMatch(/background:[^;]*rgba?\(/);
    expect(css, 'the caption text should be a light colour on its dark pill')
      .toMatch(/color:#(?:e|f)[0-9a-f]{5}/i);

    // The old failure mode was a translucent FOREGROUND over the live scene.
    const colour = (css.match(/(?:^|;)color:([^;]*)/) || [])[1] || '';
    expect(colour, `caption colour "${colour}" must not be a translucent foreground`)
      .not.toMatch(/rgba\([^)]*,\s*0?\.\d+\s*\)/);

    // It must be anchored to the BOTTOM band, not the top. The HUD claims the
    // left 298px and the action dock the right 252px, so a centred caption at
    // top:60px has clear width only above ~850px -- at 760px it ran 112px into
    // the HUD and 66px into the dock. Below them the full width is free.
    expect(css, 'the caption must sit in the clear bottom band, not under the HUD/dock')
      .toMatch(/bottom:' \+ captionBottom \+ 'px/);
    expect(css, 'a top-anchored caption collides with the HUD and dock below ~850px')
      .not.toMatch(/(?:^|;)top:\d+px/);

    // And its offset has to clear the ticker, which rocky worlds lift to its
    // own row -- otherwise the two reading strips land on each other.
    const offset = source.match(/var captionBottom = \(isFluid \? (\d+) : (\d+)\) \+ (\d+);/);
    expect(offset, 'could not read the caption offset').toBeTruthy();
    const [, fluidTicker, rockyTicker, gap] = offset.map(Number);
    expect(rockyTicker, 'the rocky offset should track the lifted ticker row')
      .toBeGreaterThan(fluidTicker);
    expect(gap, 'the caption needs to clear the ticker it sits above').toBeGreaterThan(26);
  });

  it('does not clip the phone HUD past its teaching content', () => {
    // On phones .rover-hud is max-height + overflow:hidden, and it is
    // pointer-events:none, so anything past the cap is lost with no scroll and
    // no indicator. At 154px that was 41px on Mars, 16px on Earth and 12px on
    // Jupiter -- and what fell off the end was the pedagogy: the inquiry
    // question cut mid-sentence and the live measurements hidden outright.
    // Measured in Chromium at 390px; the tallest vehicle now renders 200px.
    const source = readFileSync(SOURCE, 'utf8');

    const cap = source.match(/\.rover-hud\{[^}]*max-height:(\d+)px!important/);
    expect(cap, 'could not read the phone HUD cap').toBeTruthy();
    expect(Number(cap[1]), 'the phone HUD cap must clear the tallest vehicle (200px)')
      .toBeGreaterThanOrEqual(200);

    // The science block must render ABOVE the gauge rows, so that if a future
    // world does overflow, what survives the clip is the teaching content.
    const rule = source.match(/@media\(max-width:640px\)\{\.solar-cosmos \.rover-hud\{[\s\S]{0,900}?#hud-simple-row\{order:(\d+)\}/);
    expect(rule, 'the phone HUD should order its sections explicitly').toBeTruthy();
    const focusOrder = source.match(/#hud-science-focus\{order:(\d+)\}/);
    expect(focusOrder, 'the science focus needs an explicit order').toBeTruthy();
    expect(Number(focusOrder[1]), 'the science block must precede the gauge rows')
      .toBeLessThan(Number(rule[1]));

    // Every inquiry question is three lines at this width, so a 2-line clamp
    // truncated all three worlds.
    const clamp = source.match(/#hud-science-focus>div:nth-child\(2\)\{[^}]*-webkit-line-clamp:(\d+)/);
    expect(clamp, 'could not read the question clamp').toBeTruthy();
    expect(Number(clamp[1]), 'a 2-line clamp truncates every inquiry question')
      .toBeGreaterThanOrEqual(3);

    // The hazard banner is z-index 11 over the HUD's 10, so it must start below
    // the taller box or it lands back on top of the gauge row.
    const hazard = source.match(/\[data-drone-hazard\]\{top:(\d+)px!important/);
    expect(hazard, 'could not read the phone hazard banner offset').toBeTruthy();
    expect(Number(hazard[1]), 'the hazard banner must clear the HUD cap')
      .toBeGreaterThanOrEqual(Number(cap[1]));
  });

  it('keeps the driving HUD from swallowing the scene', () => {
    // Measured in Chromium on Earth: the HUD was 537px of a 710px frame (76% of
    // the scene height). World context and notable features are static reference
    // -- read once, then pure occlusion -- and the phone rule has hidden exactly
    // those since it was written. They now follow the H density cycle instead.
    const source = readFileSync(SOURCE, 'utf8');

    const fn = source.match(/function applyHudReferenceVisibility\(\) \{[\s\S]*?\n {24}\}/);
    expect(fn, 'could not find the HUD reference-visibility helper').toBeTruthy();
    const body = fn[0];

    expect(body, 'the static reference sections should collapse in simple mode')
      .toMatch(/hudMode === 'simple' \? 'none' : ''/);

    // The movement keys (WASD / Q-E / arrow-look) appear nowhere else on screen,
    // so the shortcut legend must NOT be collapsed with the reference blocks.
    expect(body, 'hud-shortcuts must stay visible or the movement keys are stranded')
      .not.toMatch(/hud-shortcuts/);

    // And it has to actually run: once at init and again on every H press.
    const calls = source.match(/applyHudReferenceVisibility\(\);/g) || [];
    expect(calls.length, 'the helper must run at init AND on the H density cycle')
      .toBeGreaterThanOrEqual(2);
  });

  it('gives the science ticker a pause control and time to be read', () => {
    // The ticker auto-advanced on a flat 6000ms interval, 400ms of which is the
    // fade -- a 5.6s reading window. Measured against the 40 facts this tool
    // ships: 11 exceed it at a typical adult 200 wpm and 30 exceed it at a
    // middle-grades 150 wpm. This is a K-12 tool. There was also no pause, no
    // way back, and pointer-events:none meant it could not even be hovered --
    // WCAG 2.2.2 requires a mechanism for auto-updating content.
    const source = readFileSync(SOURCE, 'utf8');

    // Dwell must scale with the text, not be a flat interval.
    const dwell = source.match(/function factDwellMs\(text\) \{[\s\S]*?\n {24}\}/);
    expect(dwell, 'the ticker needs a length-aware dwell').toBeTruthy();
    expect(dwell[0], 'dwell must be derived from the length of the fact on screen')
      .toMatch(/\.length/);

    // The floor has to cover the longest fact for a middle-grades reader:
    // 137 chars / 5.5 chars-per-word / 150 wpm = 10.0s.
    const clamp = dwell[0].match(/Math\.max\((\d+), Math\.min\((\d+), (\d+) \+ chars \* (\d+)\)\)/);
    expect(clamp, 'could not read the dwell clamp').toBeTruthy();
    const [, floor, ceiling, base, perChar] = clamp.map(Number);
    expect(base + 137 * perChar, 'the longest fact (137ch) needs ~10s at 150 wpm')
      .toBeGreaterThanOrEqual(10000);
    expect(ceiling, 'the ceiling must not cut the longest fact short')
      .toBeGreaterThanOrEqual(10000);
    expect(floor, 'short facts should keep roughly the original pacing')
      .toBeGreaterThanOrEqual(6000);

    // A pause control, reachable: the ticker is pointer-events:none, so the
    // cluster has to opt back in or the buttons cannot be clicked at all.
    // Built by concatenation, so take the whole statement, not the first
    // quoted run.
    const controls = source.match(/factControls\.style\.cssText = (.*);\n/);
    expect(controls, 'the ticker needs a control cluster').toBeTruthy();
    expect(controls[1], 'controls must opt back into pointer events')
      .toMatch(/pointer-events:auto/);

    expect(source, 'the pause button must expose its state to assistive tech')
      .toMatch(/factPauseButton\.setAttribute\('aria-pressed'/);
    expect(source, 'there must be a previous control, not just pause')
      .toMatch(/'Previous science fact'/);
    expect(source, 'there must be a next control').toMatch(/'Next science fact'/);

    // Reduced motion should stop the rotation starting at all -- the controls
    // keep the facts reachable, they just wait to be asked for.
    expect(source, 'reduced motion must suppress the auto-advance')
      .toMatch(/factPaused = droneReduceMotion;/);
  });
});
