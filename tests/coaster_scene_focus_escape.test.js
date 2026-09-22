// Coaster Lab — pressing Escape must not strand the student with the editing
// panels hidden.
//
// THE DEFECT THIS PINS
// "Scene focus" does two things from one click: it sets
// [data-scene-focus="true"] on the root, which hides #clab-side, #clab-hud,
// #clab-lapHud, #clab-buildCoach, #clab-vectorLegend and #clab-xrayLegend with
// display:none!important, and it asks the shared helper for fullscreen.
//
// `sceneFocus` used to flip ONLY inside the button's click handler, and the tool
// had no fullscreenchange listener at all (0 listeners, 0 reads of
// *FullscreenElement, no __alloStemFsBind). So Escape — the instinctive way out
// of fullscreen — left the student back at normal size with every editing panel
// still hidden, the button still reading "Restore panels", and aria-pressed
// still "true", which the tool's own CSS also styles as active. The next press
// then restored the panels INSTEAD of re-entering fullscreen, so the control
// read inverted from then on.
//
// WHAT IS EXERCISED
// The two shipped functions are lifted out of the source and run against a real
// jsdom document, rather than restated here. That keeps the assertions pointed
// at what ships. A source-level guard below covers the wiring the lifted
// functions cannot show (that the listener is actually registered), because
// without it deleting the addEventListener calls would leave this green.
import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE = readFileSync('stem_lab/stem_tool_coasterlab.js', 'utf8');

/** Lift a top-level `function name(...)` body out of the shipped source. */
function lift(name) {
  const at = SOURCE.indexOf('function ' + name + '(');
  expect(at, name + ' is still in the source').toBeGreaterThan(-1);
  const open = SOURCE.indexOf('{', at);
  let depth = 0;
  let end = -1;
  for (let i = open; i < SOURCE.length; i += 1) {
    const ch = SOURCE[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') { depth -= 1; if (depth === 0) { end = i + 1; break; } }
  }
  expect(end, name + ' is brace balanced').toBeGreaterThan(open);
  return SOURCE.slice(at, end);
}

/**
 * Build a harness holding the tool's real applySceneFocus +
 * onCoasterFullscreenChange over a minimal DOM, with the collaborators they
 * call stubbed so the functions under test are the only real code.
 */
function harness(startFocused) {
  document.body.innerHTML =
    '<div id="root"><button id="btn" aria-pressed="false">Scene focus</button>' +
    '<div id="clab-side"></div><div id="clab-hud"></div></div>';
  const rootEl = document.getElementById('root');
  const sceneFocusButton = document.getElementById('btn');
  const banners = [];
  const calls = { clearStationViews: 0, updateViewClearance: 0 };

  const factory = new Function(
    'rootEl', 'sceneFocusButton', 'banner', 'clearStationViews', 'updateViewClearance', 'document', 'startFocused',
    'let sceneFocus = startFocused;'
    + lift('applySceneFocus') + '\n'
    + lift('onCoasterFullscreenChange') + '\n'
    + 'return { applySceneFocus, onCoasterFullscreenChange, get sceneFocus(){ return sceneFocus; } };',
  );

  const api = factory(
    rootEl, sceneFocusButton,
    (msg) => banners.push(msg),
    () => { calls.clearStationViews += 1; },
    () => { calls.updateViewClearance += 1; },
    document, startFocused,
  );

  // Reproduce the state the click handler leaves behind when focus is on.
  if (startFocused) {
    rootEl.dataset.sceneFocus = 'true';
    sceneFocusButton.setAttribute('aria-pressed', 'true');
    sceneFocusButton.textContent = 'Restore panels';
  }
  return { api, rootEl, sceneFocusButton, banners, calls };
}

/** Drive a real fullscreenchange with document.fullscreenElement set or not. */
function setFullscreen(el) {
  Object.defineProperty(document, 'fullscreenElement', { value: el, configurable: true });
  document.dispatchEvent(new window.Event('fullscreenchange'));
}

describe('Coaster Lab scene focus follows the real fullscreen state', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
  });

  it('restores the editing panels when fullscreen ends by Escape', () => {
    const h = harness(true);
    expect(h.rootEl.dataset.sceneFocus, 'precondition: panels hidden').toBe('true');

    // Escape: the browser leaves fullscreen and fires the event. No click.
    setFullscreen(null);
    h.api.onCoasterFullscreenChange();

    expect(h.api.sceneFocus, 'scene focus must follow the browser').toBe(false);
    expect(h.rootEl.dataset.sceneFocus, 'THE DEFECT: panels stayed display:none').toBe('false');
    expect(h.sceneFocusButton.getAttribute('aria-pressed')).toBe('false');
    expect(h.sceneFocusButton.textContent).toBe('Scene focus');
    expect(h.banners.join(' ')).toContain('Editing panels restored');
  });

  it('recomputes the view clearance after the viewport shrinks', () => {
    // Nothing in this tool re-runs updateViewClearance on resize, so leaving
    // fullscreen without calling it leaves the canvas clearance sized for a
    // full screen.
    const h = harness(true);
    setFullscreen(null);
    h.api.onCoasterFullscreenChange();
    expect(h.calls.updateViewClearance).toBeGreaterThan(0);
  });

  it('does nothing while still fullscreen', () => {
    // Entering fullscreen fires the same event. It must not cancel scene focus.
    const h = harness(true);
    setFullscreen(h.rootEl);
    h.api.onCoasterFullscreenChange();
    expect(h.api.sceneFocus).toBe(true);
    expect(h.rootEl.dataset.sceneFocus).toBe('true');
    expect(h.banners, 'no announcement for entering').toHaveLength(0);
  });

  it('does nothing when scene focus was never on', () => {
    // A fullscreen exit driven by some other control must not announce panel
    // restoration that did not happen.
    const h = harness(false);
    setFullscreen(null);
    h.api.onCoasterFullscreenChange();
    expect(h.api.sceneFocus).toBe(false);
    expect(h.banners).toHaveLength(0);
    expect(h.calls.updateViewClearance).toBe(0);
  });

  it('registers the listener in the tool itself', () => {
    // The lifted functions above cannot show that anything CALLS them. Without
    // this guard, deleting both addEventListener lines would ship the original
    // defect with every test still green.
    expect(SOURCE).toContain("document.addEventListener('fullscreenchange', onCoasterFullscreenChange)");
    expect(SOURCE, 'older WebKit fires the prefixed event')
      .toContain("document.addEventListener('webkitfullscreenchange', onCoasterFullscreenChange)");
  });

  it('keeps the view clearance measured AFTER the fullscreen request', () => {
    // updateViewClearance reads canvas.clientHeight and the HUD's offsetHeight.
    // If a refactor moves it above the __alloStemFS call it measures the
    // pre-fullscreen layout, which is silent and wrong.
    const click = SOURCE.slice(
      SOURCE.indexOf("sceneFocusButton.addEventListener('click'"),
      SOURCE.indexOf('themeSelect.value = visualTheme;'),
    );
    expect(click).toContain('__alloStemFS');
    expect(click.indexOf('updateViewClearance()'), 'clearance must follow the fullscreen request')
      .toBeGreaterThan(click.indexOf('__alloStemFS'));
  });
});
