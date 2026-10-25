import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import postcss from 'postcss';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Run the shipped interaction handlers rather than pinning the presence of a
// modifier guard. Markup checks use the English catalog so a corrected fallback
// cannot conceal an older translated label. Native QA owns layout/hit testing.
const paths = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const sources = paths.map(path => readFileSync(path, 'utf8'));
const catalog = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const translate = (key, fallback) => key.split('.').reduce((value, part) => value?.[part], catalog) ?? fallback ?? key;

function shippedFunction(source, name) {
  const start = source.indexOf('function ' + name + '(', source.indexOf('function wcPilotCanvasRef'));
  if (start < 0) throw new Error('Missing pilot function: ' + name);
  let position = source.indexOf('{', start) + 1, depth = 1;
  while (depth && position < source.length) {
    if (source[position] === '{') depth++;
    if (source[position] === '}') depth--;
    position++;
  }
  if (depth) throw new Error('Unterminated pilot function: ' + name);
  return source.slice(start, position);
}

function inputHarness(source, overrides = {}) {
  const state = createContext({
    input: { cameraMode: 'follow', movementStyle: 'hold', paused: false, stepDirection: '', stepRemaining: 0,
      up: 0, down: 0, left: 0, right: 0, fwd: 0, back: 0, lookYaw: 0, lookPitch: 0, rainbowAlign: 0 },
    keyState: {}, activePointers: {}, pinchDistance: 0, dragging: false,
    yaw: -.8, pitch: .2, lastPx: 0, lastPy: 0, userZoom: 0, camDist: 118,
    camera: { aspect: 1.4 }, sim: { form: 'liquid' }, canvasEl: { dataset: {}, setPointerCapture() {} },
    document: { hidden: false }, ...overrides,
  });
  const names = ['onKeyDown', 'onKeyUp', 'clearPilotKeyboardState', 'clearPilotMovementInputs', 'clearPilotInputs',
    'onPilotVisibilityChange', 'pilotPointerIds', 'pilotPinchDistance', 'onPointerDown', 'onPointerMove', 'onPointerUp',
    'formCamDist', 'pilotZoomBase', 'adjustPilotZoom', 'onWheel'];
  runInContext(names.map(name => shippedFunction(source, name)).join('\n'), state);
  // Execute the actual public bindings that React and the zoom buttons use.
  for (const property of ['clearMovement', 'adjustZoom']) {
    const binding = source.match(new RegExp('input\\.' + property + '\\s*=\\s*[A-Za-z]+;'));
    if (!binding) throw new Error('Missing pilot input binding: ' + property);
    runInContext(binding[0], state);
  }
  return state;
}

function event(overrides = {}) {
  return { key: 'w', repeat: false, deltaY: 100, ctrlKey: false, altKey: false, metaKey: false,
    shiftKey: false, isComposing: false, prevented: false, preventDefault() { this.prevented = true; }, ...overrides };
}

describe.each(paths.map((path, i) => ({ path, source: sources[i] })))('Be the Water accessible input: $path', ({ source }) => {
  it('leaves browser/assistive shortcuts and composition untouched, including tap mode', () => {
    for (const movementStyle of ['hold', 'tap']) for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'isComposing']) {
      const state = inputHarness(source); state.input.movementStyle = movementStyle;
      for (const key of ['w', 'a', 'f', 's', 'ArrowUp', ' ']) {
        const keyEvent = event({ key, [modifier]: true });
        state.onKeyDown(keyEvent);
        expect(keyEvent.prevented, modifier + '+' + key).toBe(false);
        expect(Object.keys(state.keyState)).toEqual([]);
        expect(state.input.stepRemaining).toBe(0);
      }
    }
  });

  it('keeps ordinary movement, Shift descent, and release-after-modifier changes working', () => {
    const state = inputHarness(source);
    for (const key of ['W', 'e', 'q', 'ArrowLeft', ' ', 'Shift']) {
      const keyEvent = event({ key, shiftKey: key === 'Shift' });
      state.onKeyDown(keyEvent);
      expect(keyEvent.prevented).toBe(true);
      expect(state.keyState[key.toLowerCase()]).toBe(true);
      state.onKeyUp(event({ key, ctrlKey: true }));
      expect(state.keyState[key.toLowerCase()]).toBe(false);
    }
    const unhandled = event({ key: 'Tab' }); state.onKeyDown(unhandled);
    expect(unhandled.prevented).toBe(false);
  });

  it('makes tap mode one bounded step and does not queue travel during pause', () => {
    const state = inputHarness(source); state.input.movementStyle = 'tap';
    state.onKeyDown(event({ key: 'ArrowUp' }));
    expect(state.input.stepDirection).toBe('fwd'); expect(state.input.stepRemaining).toBe(.35);
    state.input.stepRemaining = .12;
    state.onKeyDown(event({ key: 'ArrowUp', repeat: true }));
    expect(state.input.stepRemaining).toBe(.12);
    state.clearPilotKeyboardState(); state.input.paused = true;
    state.onKeyDown(event({ key: 'e' }));
    expect(state.input.stepRemaining).toBe(0); expect(state.input.stepDirection).toBe('');
  });

  it('clears travel on paused React updates while preserving queued camera and rainbow commands', () => {
    const state = inputHarness(source);
    Object.assign(state.input, { up: 1, down: 1, left: 1, right: 1, fwd: 1, back: 1,
      stepDirection: 'up', stepRemaining: .2, lookYaw: .22, lookPitch: -.12, rainbowAlign: 2 });
    state.keyState.w = true; state.activePointers = { 1: { x: 2, y: 3 } }; state.pinchDistance = 30; state.dragging = true;
    state.input.clearMovement();
    for (const key of ['up', 'down', 'left', 'right', 'fwd', 'back', 'stepRemaining']) expect(state.input[key]).toBe(0);
    expect(state.input.stepDirection).toBe(''); expect(Object.keys(state.keyState)).toEqual([]);
    expect(Object.keys(state.activePointers)).toEqual([]); expect(state.pinchDistance).toBe(0); expect(state.dragging).toBe(false);
    expect([state.input.lookYaw, state.input.lookPitch, state.input.rainbowAlign]).toEqual([.22, -.12, 2]);
    state.clearPilotInputs();
    expect([state.input.lookYaw, state.input.lookPitch, state.input.rainbowAlign]).toEqual([0, 0, 0]);
    state.input.lookYaw = .22; state.document.hidden = true; state.onPilotVisibilityChange();
    expect(state.input.lookYaw).toBe(0);
  });

  it('supports bounded zoom buttons and reset using the current form framing', () => {
    const state = inputHarness(source);
    for (const form of ['liquid', 'cloud', 'rain', 'snow', 'snowpack', 'vapor']) {
      state.sim.form = form; state.input.adjustZoom(0); const base = state.formCamDist(form);
      expect(state.input.adjustZoom(-18)).toBe(base - 18);
      expect(state.input.adjustZoom(18)).toBe(base);
      expect(state.input.adjustZoom(-10000)).toBe(12);
      expect(state.input.adjustZoom(10000)).toBe(320);
      expect(state.input.adjustZoom(0)).toBe(base); expect(state.userZoom).toBe(0);
      expect(state.canvasEl.dataset.pilotZoom).toBe(String(Math.round(base)));
    }
  });

  it('preserves browser zoom gestures and Water-view scrolling without changing camera distance', () => {
    const state = inputHarness(source);
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
      const wheel = event({ [modifier]: true }); state.onWheel(wheel);
      expect(wheel.prevented).toBe(false); expect(state.userZoom).toBe(0);
    }
    const normalWheel = event({ deltaY: 100 }); state.onWheel(normalWheel);
    expect(normalWheel.prevented).toBe(true); expect(state.userZoom).toBe(88);
    state.input.cameraMode = 'water'; const before = state.userZoom, beforeDataset = state.canvasEl.dataset.pilotZoom;
    for (const delta of [-10000, 0, 10000]) expect(state.input.adjustZoom(delta)).toBe(before);
    const waterWheel = event(); state.onWheel(waterWheel);
    expect(waterWheel.prevented).toBe(false); expect(state.userZoom).toBe(before);
    expect(state.canvasEl.dataset.pilotZoom).toBe(beforeDataset);
  });

  it('keeps custom zoom during horizontal wheel and unchanged pinch distance', () => {
    const state = inputHarness(source); state.input.adjustZoom(-18);
    const customZoom = state.userZoom, dataset = state.canvasEl.dataset.pilotZoom;
    const horizontal = event({ deltaX: 80, deltaY: 0 }); state.onWheel(horizontal);
    expect(horizontal.prevented).toBe(false); expect(state.userZoom).toBe(customZoom);
    state.onPointerDown({ pointerId: 1, clientX: 0, clientY: 0 });
    state.onPointerDown({ pointerId: 2, clientX: 100, clientY: 0 });
    state.onPointerMove({ pointerId: 2, clientX: 100, clientY: 0 });
    expect(state.userZoom).toBe(customZoom);
    expect(state.canvasEl.dataset.pilotZoom).toBe(dataset);
  });

  it('routes wheel, pinch and UI button activation through the same zoom bounds', () => {
    const state = inputHarness(source);
    state.onWheel(event({ deltaY: -10000 })); expect(state.userZoom).toBe(12);
    state.onWheel(event({ deltaY: 10000 })); expect(state.userZoom).toBe(320);
    state.input.adjustZoom(0);
    state.onPointerDown({ pointerId: 1, clientX: 0, clientY: 0 });
    state.onPointerDown({ pointerId: 2, clientX: 100, clientY: 0 });
    state.onPointerMove({ pointerId: 2, clientX: 1000, clientY: 0 }); expect(state.userZoom).toBe(12);
    state.onPointerMove({ pointerId: 2, clientX: 1, clientY: 0 }); expect(state.userZoom).toBe(320);
    state.input.cameraMode = 'water';
    state.onPointerMove({ pointerId: 2, clientX: 1000, clientY: 0 }); expect(state.userZoom).toBe(320);
    state.input.cameraMode = 'follow';
    state.pilotInput = () => state.input;
    runInContext(shippedFunction(source, 'changePilotZoom'), state);
    state.changePilotZoom(0); expect(state.userZoom).toBe(0);
    state.changePilotZoom(-18); expect(state.userZoom).toBe(58);
  });

  it('returns focus to the Look toggle when closing controls', () => {
    const state = inputHarness(source), patches = [];
    let focused = 0;
    state.setPilot = patch => patches.push(patch);
    state.document.getElementById = id => id === 'wcPilotLookToggle' ? { focus() { focused++; } } : null;
    runInContext(shippedFunction(source, 'closePilotLookControls'), state);
    state.closePilotLookControls();
    expect(patches).toEqual([{ showLookControls: false }]); expect(focused).toBe(1);
  });
});

function renderPilot(pilot = {}) {
  const rendered = prepareStemBrowserRender(renderTool('waterCycle', {
    _threeLoaded: true, waterCycle: { wcMode: 'pilot', pilot: { onboardingComplete: true, paused: true, ...pilot } },
  }, { t: translate }));
  const host = document.createElement('div'); host.innerHTML = rendered.html;
  return { host, css: rendered.cssSheets.join('\n') };
}

describe('Be the Water rendered accessible control contracts', () => {
  beforeAll(() => { resetStemLab(); loadTool(paths[0], 'waterCycle'); }, 60000);

  it('gives the canvas a stable concise name and resolving instruction/state descriptions', () => {
    const names = [];
    for (const form of ['liquid', 'rain', 'snow']) {
      const snapshot = { ...window.WaterCyclePilotKernel.initialState('tropicalOcean'), form, altitudeM: form === 'liquid' ? 0 : 400,
        tempC: 25, ambientC: 18, rh: 85, buoyancyC: 7, vy: form === 'liquid' ? 0 : -20, surface: 'water' };
      const { host } = renderPilot({ snapshot }); const canvas = host.querySelector('#wcPilotCanvas');
      expect(canvas).not.toBeNull(); names.push(canvas.getAttribute('aria-label'));
      expect(names.at(-1).length).toBeLessThan(100);
      const descriptionIds = canvas.getAttribute('aria-describedby').split(/\s+/);
      expect(descriptionIds).toContain('wcPilotCanvasInstructions'); expect(descriptionIds).toContain('wcPilotSceneDescription');
      for (const id of descriptionIds) {
        const description = host.querySelector('#' + id);
        expect(description?.textContent.trim().length).toBeGreaterThan(20);
        expect(description.closest('details, [hidden], [aria-hidden="true"]')).toBeNull();
      }
      const detail = host.querySelector('#wcPilotSceneDescription').textContent;
      const visibleDescription = [...host.querySelectorAll('details p')].find(p => p.textContent === detail);
      expect(visibleDescription).toBeTruthy();
      expect(host.querySelectorAll('#wcPilotSceneDescription')).toHaveLength(1);
      expect(detail).not.toContain('rising on your own');
      expect(detail).toContain(form === 'liquid' ? 'liquid water at the surface' : 'Gravity is carrying you down');
    }
    expect(new Set(names).size).toBe(1);
  });

  it('includes each visible Help, Done and Fwd label in its real English accessible name', () => {
    const { host } = renderPilot({ showLookControls: true });
    const buttons = [...host.querySelectorAll('button')];
    for (const selector of ['.wc-pilot-camera-help', '.wc-pilot-look-panel>button:last-child', '[data-control="forward"]']) {
      const button = host.querySelector(selector); expect(button, selector).not.toBeNull();
      const visible = [...button.childNodes].filter(node => node.nodeType !== 1 || node.getAttribute('aria-hidden') !== 'true')
        .map(node => node.textContent).join('').trim();
      expect(button.getAttribute('aria-label').toLowerCase(), selector).toContain(visible.toLowerCase());
    }
    expect(buttons.some(button => button.textContent === 'Zoom in')).toBe(true);
  });

  it('offers single-pointer zoom controls and explains their disabled Water-view state', () => {
    for (const cameraMode of ['follow', 'water']) {
      const { host } = renderPilot({ cameraMode, showLookControls: true });
      const group = host.querySelector('.wc-pilot-zoom-controls'); expect(group).not.toBeNull();
      const buttons = [...group.querySelectorAll('button')];
      expect(buttons.map(button => button.textContent)).toEqual(['Zoom in', 'Zoom out', 'Reset zoom']);
      expect(buttons.every(button => button.disabled === (cameraMode === 'water'))).toBe(true);
      expect(host.querySelector('#' + group.getAttribute('aria-describedby')).textContent).toContain('Follow view');
    }
  });

  it('removes previously open Look controls from the focus order while a learning notice is visible', () => {
    const lastChange = { id: 'wcag-notice', sequence: 1, elapsed: 12, scenario: 'tropicalOcean', from: 'liquid', to: 'vapor', energy: 1 };
    const { host } = renderPilot({ showLookControls: true, lastChange, noticeChangeId: lastChange.id });
    expect(host.querySelector('.wc-pilot-notice')).not.toBeNull();
    expect(host.querySelector('#wcPilotLookPanel')).toBeNull();
    const toggle = host.querySelector('#wcPilotLookToggle'); expect(toggle.disabled).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.hasAttribute('aria-controls')).toBe(false);
  });

  it('keeps shortcut hints readable across normal, hover and pressed flight-deck colors', () => {
    const { css } = renderPilot(), ast = postcss.parse(css);
    function declarations(selector) {
      const values = {};
      ast.walkRules(rule => {
        if (!rule.selector.split(',').map(s => s.trim()).includes(selector)) return;
        for (let parent = rule.parent; parent; parent = parent.parent) if (parent.type === 'atrule') return;
        rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
      });
      return values;
    }
    const base = declarations('.wc-pilot-key'), hint = declarations('.wc-pilot-key-hint'), hover = declarations('.wc-pilot-key:hover'), pressed = declarations('.wc-pilot-key:active');
    expect(hint.color).toBe('inherit'); expect(Number(hint.opacity)).toBe(1);
    expect(hover.filter === undefined || hover.filter === 'none').toBe(true);
    function rgb(hex) { return hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16)); }
    function luminance(color) { return rgb(color).map(value => { const s = value / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0); }
    function ratio(first, second) { const a = luminance(first), b = luminance(second); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }
    for (const selector of ['.wc-pilot-key.is-rise', '.wc-pilot-key.is-sink', '.wc-pilot-key.is-left', '.wc-pilot-key.is-depth', '.wc-pilot-key:hover']) {
      const rule = declarations(selector), stops = rule.background.match(/#[a-f\d]{6}/gi);
      expect(stops?.length, selector).toBeGreaterThan(0);
      for (const stop of stops) expect(ratio(base.color, stop), selector + ' against ' + stop).toBeGreaterThanOrEqual(4.5);
    }
    expect(ratio(pressed.color, pressed.background)).toBeGreaterThanOrEqual(4.5);
  });

  it('ships the same accessible behavior and markup in the desktop mirror', () => {
    expect(sources[1]).toBe(sources[0]);
  });
});
