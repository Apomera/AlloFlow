// Zoom Gallery — the fullscreen button must report its own state.
//
// WHY THIS EXISTS
// The button rendered I('fullscreen') — one flat string, "⛶ Fullscreen" — with
// no aria-label, no aria-pressed and no listener. Pressing it filled the screen
// and left the control still reading "Fullscreen": a sighted learner had to
// infer the state, and a screen-reader user could not tell it at all. The toggle
// was always correct (it called the shared window.__alloStemFS); the labelling
// was the gap. Same defect and same fix as scaleExplorer.
//
// WHY THIS SUITE IS SOURCE-LEVEL, stated plainly rather than dressed up.
// The button is gated on `current`, which comes from React.useState(null) with
// no toolData seed, so it appears only after a learner opens an image. The SSR
// harness renders initial state, and the button is therefore NOT in the markup
// under any seeding — verified against an empty render, a nested
// {zoomGallery:{currentId}} and a flat {currentId}: all three produce the stage
// marker and no button. A browser test of the kind
// tests/scaleexplorer_fullscreen_state.test.js runs is impossible here without
// driving the real React tree, which this harness does not do.
//
// So this suite asserts the WIRING, and the runtime behaviour it buys is covered
// where it actually lives: the shared binder in stem_lab_module.js, exercised
// against a real browser by the scaleExplorer and waterCycle suites. The one
// thing a source test can still get wrong is drifting out of step with the
// binder's contract, so the contract itself is asserted here too, against the
// module rather than restated from memory.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const TOOL_REL = 'stem_lab/stem_tool_zoomgallery.js';
const SOURCE = fs.readFileSync(path.join(ROOT, TOOL_REL), 'utf8');
const MODULE = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_lab_module.js'), 'utf8');

function buttonBlock() {
  const at = SOURCE.indexOf("'data-allo-fs-btn': 'true',");
  expect(at, 'the fullscreen button is still marked').toBeGreaterThan(-1);
  return SOURCE.slice(Math.max(0, at - 700), at + 900);
}

describe('Zoom Gallery fullscreen control is wired to report its state', () => {
  it('binds the button to the shared binder, against a real stage', () => {
    const near = buttonBlock();
    expect(near, 'the tool must bind the button itself').toContain('__alloStemFsBind');
    expect(near).toContain("closest('[data-allo-fs-stage]')");
    expect(SOURCE, 'the stage the button resolves must exist')
      .toContain("'data-allo-fs-stage': 'true'");
  });

  it('supplies both labels through the attributes the binder reads', () => {
    // data-fs-in / data-fs-out are what decide the accessible name in each
    // state. A static aria-label alone is overwritten by the binder's first
    // sync(), so these are the load-bearing attributes.
    const near = buttonBlock();
    expect(near, 'exit label').toContain('data-fs-in');
    expect(near, 'enter label').toContain('data-fs-out');
    expect(near).toContain('aria-pressed');
    // And the binder must actually read them, rather than this suite trusting a
    // contract that has since moved.
    expect(MODULE).toContain("btn.getAttribute('data-fs-in')");
    expect(MODULE).toContain("btn.getAttribute('data-fs-out')");
  });

  it('puts the glyph in an element the binder can swap', () => {
    // sync() writes btn.firstElementChild.textContent. A bare text child would
    // leave the glyph frozen at ⛶ while the label said "exit".
    const near = buttonBlock();
    expect(near).toMatch(/h\('span',\s*\{\s*'aria-hidden':\s*'true'\s*\}/);
    expect(MODULE, 'the binder still swaps the first element child')
      .toContain('var glyph = btn.firstElementChild;');
  });

  it('does not toggle fullscreen twice per click', () => {
    // The binder attaches its own click listener that calls __alloStemFS(stage).
    // If toggleFullscreen still called it as well, one press would enter
    // fullscreen and immediately leave it.
    const toggle = SOURCE.slice(SOURCE.indexOf('function toggleFullscreen()'));
    const body = toggle.slice(0, toggle.indexOf('\n      function ', 1));
    expect(body, 'the binder owns the toggle now').not.toContain('__alloStemFS(');
    expect(MODULE, 'and the binder is what calls it')
      .toContain("if (typeof window.__alloStemFS === 'function') window.__alloStemFS(stage);");
  });

  it('ships English fallbacks for the new keys', () => {
    // I(key) falls back to INL[key]; without an entry an untranslated build
    // renders the bare key name in the accessible name.
    for (const key of ['fullscreen_enter', 'fullscreen_exit', 'fullscreen_label']) {
      expect(SOURCE, key + ' needs an INL fallback').toMatch(
        new RegExp('\\n\\s*' + key + ":\\s*'[^']+'"),
      );
    }
  });
});
