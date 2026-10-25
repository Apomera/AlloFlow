import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_galaxy.js', 'utf8');
const helpers = source.split('// BEGIN BLACK HOLE CAMERA ACCESSIBILITY')[1].split('// END BLACK HOLE CAMERA ACCESSIBILITY')[0];
const model = new Function(helpers + ';return {render:renderBlackHoleCameraControls,label:blackHoleCameraActionLabel};')();
const t = (key, fallback) => fallback;
// Extract the production handler, including nested branches, without copying its
// implementation into the regression fixture.
function functionAt(marker) {
  const offset = typeof marker === 'number' ? marker : source.indexOf(marker); if (offset < 0) throw Error('Missing production marker: ' + marker);
  const start = source.indexOf('function', offset), body = source.indexOf('{', start);
  let depth = 0, quote = '', escape = false;
  for (let index = body; index < source.length; index++) {
    const char = source[index];
    if (quote) { if (escape) escape = false; else if (char === '\\') escape = true; else if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth++; else if (char === '}' && !--depth) return source.slice(start, index + 1);
  }
  throw Error('Unclosed production handler: ' + marker);
}
const nudge = functionAt('canvas._nudgeBlackHoleCamera='), zoom = functionAt('function zoomCamera(amount)');
const cameraFactory = new Function('canvas', '__alloT', 'blackHoleCameraActionLabel', 'options', `
  var yaw=.28,pitch=.38,distance=4.6,followZoom=1,followActive=!!options.follow,paused=true,interaction='aim',experimentTime=2.5,opticalEnabled=!!options.optical,blackHoleCleanedUp=false,contextLost=false;
  var release={radius:6,sideways:.8,radial:.2,angle:20},reference={radius:5,sideways:1},updates=0;
  function updateCamera(){updates++;}
  ${zoom}
  canvas._nudgeBlackHoleCamera=${nudge};
  return {state:function(){return {yaw:yaw,pitch:pitch,distance:distance,followZoom:followZoom,followActive:followActive,paused:paused,interaction:interaction,experimentTime:experimentTime,opticalEnabled:opticalEnabled,release:Object.assign({},release),reference:Object.assign({},reference),updates:updates};},clean:function(){blackHoleCleanedUp=true;},lose:function(){contextLost=true;}};
`);
const fixtureRoots = [];
const open = options => {
  const host = document.createElement('section'); host.setAttribute('data-galaxy-root', 'true');
  const canvas = document.createElement('canvas'), status = document.createElement('p'); status.setAttribute('data-bh-camera-status', 'true'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  host.append(canvas, status); document.body.appendChild(host); fixtureRoots.push(host);
  return { canvas, status, runtime: cameraFactory(canvas, t, model.label, options || {}) };
};
afterEach(() => { fixtureRoots.splice(0).forEach(root => root.remove()); });
const modelState = state => ({ paused: state.paused, interaction: state.interaction, experimentTime: state.experimentTime, opticalEnabled: state.opticalEnabled, followActive: state.followActive, release: state.release, reference: state.reference });

describe('Black hole single-click camera controls', () => {
  let root, host;
  afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; if (host) host.remove(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; });
  it.each([true, false])('renders six named 44px controls, with ready state %s, through actual button activation', async ready => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true; host = document.createElement('div'); document.body.appendChild(host);
    const onNudge = vi.fn(); root = ReactDOMClient.createRoot(host);
    await React.act(async () => root.render(model.render({ React, t, ready, onNudge })));
    const buttons = [...host.querySelectorAll('[data-bh-camera-step]')];
    expect(buttons.map(button => button.textContent)).toEqual(['Orbit left', 'Orbit right', 'Orbit up', 'Orbit down', 'Zoom in', 'Zoom out']);
    expect(host.querySelector('[role="group"]').getAttribute('aria-label')).toBe('Black hole camera controls');
    expect(host.querySelector('#black-hole-camera-click-help').textContent).toContain('without dragging or pinching');
    const status = host.querySelector('[data-bh-camera-status]'); expect(status.textContent).toBe(''); expect(status.getAttribute('role')).toBe('status'); expect(status.getAttribute('aria-live')).toBe('polite'); expect(status.closest('[hidden]')).toBeNull();
    for (const button of buttons) {
      expect(button.type).toBe('button'); expect(button.style.minHeight).toBe('44px'); expect(button.style.minWidth).toBe('44px'); expect(button.disabled).toBe(!ready);
      await React.act(async () => button.click());
    }
    expect(onNudge.mock.calls.flat()).toEqual(ready ? ['left', 'right', 'up', 'down', 'in', 'out'] : []);
  });
  it.each([false, true])('changes only camera coordinates and zoom in optical mode %s', optical => {
    const { canvas, status, runtime } = open({ optical }), before = runtime.state();
    for (const [action, field, delta] of [['left', 'yaw', -.1], ['right', 'yaw', .1], ['up', 'pitch', .1], ['down', 'pitch', -.1], ['in', 'distance', -.3], ['out', 'distance', .3]]) {
      const current = runtime.state(); expect(canvas._nudgeBlackHoleCamera(action)).toBe(true);
      const after = runtime.state(); expect(after[field]).toBeCloseTo(current[field] + delta, 10);
      expect(modelState(after)).toEqual(modelState(before));
      expect(status.textContent).toBe(model.label(action, t) + '. Experiment settings and playback are unchanged.');
    }
    expect(runtime.state().updates).toBe(6);
    expect(status.getAttribute('aria-live')).toBe('polite');
  });
  it('honors the existing pitch, ordinary-distance and followed-view zoom limits', () => {
    for (const follow of [false, true]) {
      const { canvas, runtime } = open({ follow });
      for (let count = 0; count < 160; count++) { canvas._nudgeBlackHoleCamera('up'); canvas._nudgeBlackHoleCamera('in'); }
      expect(runtime.state().pitch).toBe(1.5);
      if (follow) { expect(runtime.state().followZoom).toBe(.65); expect(runtime.state().distance).toBe(4.6); }
      else { expect(runtime.state().distance).toBe(2.8); expect(runtime.state().followZoom).toBe(1); }
      for (let count = 0; count < 160; count++) { canvas._nudgeBlackHoleCamera('down'); canvas._nudgeBlackHoleCamera('out'); }
      expect(runtime.state().pitch).toBe(-1.5);
      if (follow) expect(runtime.state().followZoom).toBe(3); else expect(runtime.state().distance).toBe(12);
      expect(runtime.state().followActive).toBe(follow);
    }
  });
  it('rejects unavailable and invalid requests, and removes its native API in the actual teardown method list', () => {
    const { canvas, runtime } = open(), before = runtime.state();
    for (const action of [null, {}, true, '', 'diagonal']) expect(canvas._nudgeBlackHoleCamera(action)).toBe(false);
    expect(runtime.state()).toEqual(before); runtime.lose(); expect(canvas._nudgeBlackHoleCamera('left')).toBe(false);
    const second = open(), retained = second.canvas._nudgeBlackHoleCamera; second.runtime.clean(); expect(retained('left')).toBe(false);
    const cleanupStart = source.indexOf("['_blackHoleReleaseSettings'"), cleanupEnd = source.indexOf('\n', cleanupStart);
    new Function('canvas', source.slice(cleanupStart, cleanupEnd))(second.canvas);
    expect(second.canvas._nudgeBlackHoleCamera).toBeUndefined();
  });
});

describe('Black hole comparison focus recovery', () => {
  it.each([true, false])('returns focus to Keep current path only when Clear comparison initiated with focus: %s', focused => {
    const host = document.createElement('div'); host.innerHTML = '<button id="black-hole-comparison-keep">Keep current path</button><button id="black-hole-comparison-clear">Clear comparison</button><button id="other-focus">Other</button>'; document.body.appendChild(host);
    try {
      const clear = host.querySelector('#black-hole-comparison-clear'), keep = host.querySelector('#black-hole-comparison-keep'), other = host.querySelector('#other-focus');
      const commit = vi.fn(), announce = vi.fn(), canvas = { _setBlackHoleComparison: vi.fn(() => { clear.hidden = true; }) };
      const handler = new Function('canvas', 'blackHoleLaunchCommit', 'announce', '__alloT', 'return (' + functionAt('canvas._clearBlackHoleComparison=') + ');')(canvas, { current: commit }, announce, t);
      (focused ? clear : other).focus(); handler();
      expect(clear.hidden).toBe(true); expect(canvas._setBlackHoleComparison).toHaveBeenCalledWith(null); expect(commit).toHaveBeenCalledWith({ blackHoleComparison: null });
      expect(document.activeElement).toBe(focused ? keep : other); expect(announce).toHaveBeenCalledWith('Comparison cleared.');
    } finally { host.remove(); }
  });
});

const modifiers = [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }, { nativeEvent: { isComposing: true } }, { keyCode: 229 }];
const event = (key, options = {}) => ({ key, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...options });
describe('Custom chart keyboard shortcut boundaries', () => {
  it('keeps browser and IME keys untouched on the distance slider while ordinary and Shift steps still work', () => {
    const start = source.indexOf("id:'black-hole-distance-chart'"), marker = source.indexOf('onKeyDown:', start);
    const pause = vi.fn(), seek = vi.fn(), slider = document.createElement('div'); slider.setAttribute('aria-valuenow', '40');
    const handler = new Function('pauseBlackHoleForInspection', 'blackHoleCanvasActive', 'return (' + functionAt(marker) + ');')(pause, { current: { _seekBlackHoleExperiment: seek } });
    for (const options of modifiers) for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) {
      const input = event(key, { currentTarget: slider, ...options }); handler(input); expect(input.preventDefault).not.toHaveBeenCalled();
    }
    expect(pause).not.toHaveBeenCalled(); expect(seek).not.toHaveBeenCalled();
    const shifted = event('ArrowRight', { currentTarget: slider, shiftKey: true }); handler(shifted);
    expect(shifted.preventDefault).toHaveBeenCalledOnce(); expect(seek).toHaveBeenLastCalledWith(.5);
    handler(event('Home', { currentTarget: slider })); expect(seek).toHaveBeenLastCalledWith(0);
    handler(event('End', { currentTarget: slider })); expect(seek).toHaveBeenLastCalledWith(1);
  });
  it('retains ordinary HR stage selection and requests guarded focus without consuming browser or composition chords', () => {
    const choose = vi.fn(), target = document.createElement('button'); document.body.appendChild(target);
    const focus = vi.fn();
    const handler = new Function('plottedStages', 'chooseHRStage', 'focusGalaxyAfterAction', 'return (' + functionAt('function hrStageKey(event,index)') + ');')([{ id: 'first' }, { id: 'second' }], choose, focus);
    try {
      for (const options of modifiers) for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' ']) {
        const input = event(key, { currentTarget: target, ...options }); handler(input, 0); expect(input.preventDefault).not.toHaveBeenCalled();
      }
      expect(choose).not.toHaveBeenCalled(); expect(focus).not.toHaveBeenCalled(); target.focus();
      const next = event('ArrowRight', { shiftKey: true, currentTarget: target }); handler(next, 0);
      expect(next.preventDefault).toHaveBeenCalledOnce(); expect(choose).toHaveBeenLastCalledWith('second');
      expect(focus).toHaveBeenCalledWith(next, '[data-galaxy-hr-stage="second"]');
      handler(event('Enter', { currentTarget: target }), 0); expect(choose).toHaveBeenLastCalledWith('first'); expect(focus).toHaveBeenCalledTimes(1);
    } finally { target.remove(); }
  });
});
