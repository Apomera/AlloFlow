import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 30, lane input. The drive and its inputs, mounted the way the STEAM Lab mounts the tool:
// a NEW ctx object on every render (the lab builds ctx inside its render), reactive toolData.
//  1. a setting changed during the visit reaches the next drive (Ride-Along, Parent Ride Check, Free Explore);
//  2. letter keys work with focus on the page body, and the drive surface takes focus;
//  3. Escape ends the drive and never reaches a document-level listener (the lab closes the tool there);
//     leaving the tool mid-drive puts the menu back;
// 10. keyboard brake ramp + hard-brake floor (pure functions run; the loop lines are source checks).

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
let loadTool, resetStemLab, makeCtx, renderTool, React, ReactDOMClient, RR, SRC;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, makeCtx, renderTool, React, ReactDOMClient } = mod);
  SRC = readFileSync(path.resolve(process.cwd(), TOOL), 'utf8');
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let mounted = [];
async function mount(roadReady, parent) {
  window.__testHooks = {};
  window.__RR_TEST_EXPORTS__ = {};
  resetStemLab();
  const config = loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const state = { toolData: { roadReady }, set: null };
  function Host() {
    const [toolData, setToolData] = React.useState(state.toolData);
    state.toolData = toolData; state.set = setToolData;
    // A new ctx every render, like stem_lab_module.js.
    const ctx = makeCtx({
      toolData,
      callTTS: () => new Promise(() => {}),
      update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
      updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })),
    });
    return config.render(ctx);
  }
  const host = document.createElement('div');
  (parent || document.body).appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(Host)); });
  const m = { host, root, state };
  mounted.push(m);
  return m;
}
const patch = (m, values) => React.act(async () => { m.state.set((p) => ({ ...p, roadReady: { ...p.roadReady, ...values } })); });
const hook = () => window.__testHooks.roadReady;
const start = (scn) => React.act(async () => { hook().startDriving(scn || 'residential', 'sedan'); });
const key = (target, k, type) => { const e = new KeyboardEvent(type || 'keydown', { key: k, bubbles: true, cancelable: true }); target.dispatchEvent(e); return e; };
const buttonByText = (host, text) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
const rideAlongBox = (host) => [...host.querySelectorAll('label')].find((l) => /Ride-Along mode/.test(l.textContent)).querySelector('input');

afterEach(async () => {
  for (const m of mounted) { await React.act(async () => { m.root.unmount(); }); m.host.remove(); }
  mounted = [];
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  document.body.querySelectorAll('input[data-in30]').forEach((n) => n.remove());
});

describe('in30 item 1: a drive reads the settings as they are NOW', () => {
  it('Ride-Along ticked during the visit: the next drive is automatic and says so', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true, reducedMotion: true, calmDrive: true });
    await React.act(async () => { rideAlongBox(m.host).click(); });
    expect(m.state.toolData.roadReady.rideAlong).toBe(true);
    await start();
    expect(hook().rideAlongRef.current).toBe(true);
    expect(hook().seatbeltRef.current.fastened).toBe(true);
    expect(m.host.querySelector('.rr-ridealong-state')).toBeTruthy();
    expect(m.host.querySelector('.rr-seatbelt-prompt')).toBeNull();
  });
  it('Ride-Along unticked during the visit: the next drive is manual (belt prompt, no Auto badge)', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true, rideAlong: true, reducedMotion: true, calmDrive: true });
    await React.act(async () => { rideAlongBox(m.host).click(); });
    expect(m.state.toolData.roadReady.rideAlong).toBe(false);
    await start();
    expect(hook().rideAlongRef.current).toBe(false);
    expect(hook().seatbeltRef.current.fastened).toBe(false);
    expect(m.host.querySelector('.rr-ridealong-state')).toBeNull();
    expect(m.host.querySelector('.rr-seatbelt-prompt')).toBeTruthy();
  });
  it('a value written in the same click as the start is seen (Parent Ride Check turns Ride-Along off for that drive)', async () => {
    const m = await mount({ view: 'parentRideCheck', rideAlong: true, reducedMotion: true, calmDrive: true });
    const go = [...m.host.querySelectorAll('button')].find((b) => /Start/.test(b.textContent));
    expect(go).toBeTruthy();
    await React.act(async () => { go.click(); });
    expect(m.state.toolData.roadReady.view).toBe('driving');
    expect(m.state.toolData.roadReady.parentRideMode).toBe(true);
    // An evaluated drive is always driven by the learner.
    expect(hook().rideAlongRef.current).toBe(false);
    expect(hook().seatbeltRef.current.fastened).toBe(false);
  });
  it('Free Explore chosen during the visit builds the free-explore world at start', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true, reducedMotion: true, calmDrive: true });
    await patch(m, { freeExplore: true, freeExploreScenario: { id: 'rural', weather: 'snow', time: 'night', traffic: 'light', speedLimit: 35 }, worldSeed: 4242 });
    await start('rural');
    expect(hook().infiniteWorldRef.current).toBeTruthy();
    expect(hook().infiniteWorldRef.current.mode).toBe('freeExplore');
    // The intro card is the Free Explore one (it is only set inside the start branch).
    expect(String(hook().eventToastRef.current.msg)).toContain('FREE EXPLORE');
  });
  it('first visit (the lab has no Road Ready data yet when the tool opens): a setting made now still reaches the drive', async () => {
    const m = await mount(undefined);
    await patch(m, { rideAlong: true, reducedMotion: true, calmDrive: true });
    await start();
    expect(hook().rideAlongRef.current).toBe(true);
    expect(hook().seatbeltRef.current.fastened).toBe(true);
    expect(m.host.querySelector('.rr-ridealong-state')).toBeTruthy();
  });
  it('source: every d. read in startDriving comes from the merged live object', () => {
    const body = SRC.slice(SRC.indexOf('var startDriving = useCallback('), SRC.indexOf('_testStartDrivingRef.current = startDriving;'));
    expect(body).toContain('var d = Object.assign({}, ctxData === rrMountDataRef.current ? (dataRef.current || {}) : (ctxData || {}), rrLivePatchRef.current || {});');
    const reads = Array.from(new Set((body.match(/\bd\.[A-Za-z]+/g) || []))).sort();
    expect(reads).toEqual(['d.calmDrive', 'd.dynamicWeather', 'd.freeExplore', 'd.freeExploreScenario', 'd.freeExploreTrip', 'd.parentRideMode', 'd.rideAlong', 'd.roadTestStage', 'd.rrRetryStation', 'd.worldSeed']);
  });
});

describe('in30 item 2: keys reach the drive without a click', () => {
  it('after Start the drive surface has focus, so B and W typed right away count (no click)', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true, reducedMotion: true, calmDrive: true });
    await start();
    const surface = m.host.querySelector('canvas[role="application"]');
    expect(document.activeElement).toBe(surface);
    // A real key press goes to whatever has focus.
    expect(hook().seatbeltRef.current.fastened).toBe(false);
    await React.act(async () => { key(document.activeElement, 'b'); key(document.activeElement, 'b', 'keyup'); });
    // A tap shorter than one frame still buckles (it used to wait for the frame loop to see the key down).
    expect(hook().seatbeltRef.current.fastened).toBe(true);
    expect(m.host.querySelector('.rr-seatbelt-prompt')).toBeNull();
    expect(document.activeElement).toBe(surface);
    key(document.activeElement, 'w');
    expect(hook().keysRef.current.w).toBe(true);
  });
  it('the WCAG 2.1.4 guard stays: a letter typed with focus on the page body does nothing', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true, reducedMotion: true, calmDrive: true });
    await start();
    m.host.querySelector('canvas[role="application"]').blur();
    expect(document.activeElement).toBe(document.body);
    key(document.body, 'w');
    expect(hook().keysRef.current.w).toBeFalsy();
  });
  it('typing in a field outside the drive view does not drive the car', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true, reducedMotion: true, calmDrive: true });
    await start();
    const field = document.createElement('input'); field.setAttribute('data-in30', '1'); document.body.appendChild(field);
    const other = document.createElement('div'); other.setAttribute('data-in30', '1'); other.tabIndex = 0; document.body.appendChild(other);
    key(field, 'w');
    expect(hook().keysRef.current.w).toBeFalsy();
    key(other, 'w');
    expect(hook().keysRef.current.w).toBeFalsy();
    other.remove();
  });
  it('focus returns to the drive surface after the belt button and after Resume', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true, reducedMotion: true, calmDrive: true });
    await start();
    const surface = m.host.querySelector('canvas[role="application"]');
    const belt = m.host.querySelector('.rr-seatbelt-prompt button');
    belt.focus();
    await React.act(async () => { belt.click(); });
    expect(m.host.querySelector('.rr-seatbelt-prompt')).toBeNull();
    expect(document.activeElement).toBe(surface);
    await React.act(async () => { buttonByText(m.host, '⏸ Pause').click(); });
    expect(document.activeElement.textContent).toContain('Resume Driving');
    await React.act(async () => { document.activeElement.click(); });
    expect(document.activeElement).toBe(surface);
  });
  it('a drive control that disappears while focused hands focus to the drive surface; focus moved outside stays outside', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true, reducedMotion: true, calmDrive: true, freeExplore: true, freeExploreScenario: { weather: 'clear', time: 'day', traffic: 'light', speedLimit: 25 } });
    await start();
    const surface = m.host.querySelector('canvas[role="application"]');
    await React.act(async () => { buttonByText(m.host, 'More').click(); });
    await React.act(async () => { buttonByText(m.host, 'World settings').click(); });
    const close = buttonByText(m.host, '×');
    close.focus();
    await React.act(async () => { close.click(); await sleep(0); });
    expect(m.host.querySelector('#rr-world-controls')).toBeNull();
    expect(document.activeElement).toBe(surface);
    // The learner clicks a field outside the drive: later changes in the drive view leave it alone.
    const field = document.createElement('input'); field.setAttribute('data-in30', '1'); document.body.appendChild(field);
    field.focus();
    await React.act(async () => { buttonByText(m.host, 'Less').click(); await sleep(0); });
    expect(document.activeElement).toBe(field);
  });
});
describe('in30 item 3: Escape ends the drive, the lab never sees it', () => {
  it('Escape typed at the page: debrief opens, a document listener (the lab) is not called', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true, reducedMotion: true, calmDrive: true });
    await start();
    const lab = vi.fn();
    document.addEventListener('keydown', lab);
    try {
      let ev;
      await React.act(async () => { ev = key(document.body, 'Escape'); });
      expect(lab).not.toHaveBeenCalled();
      expect(ev.defaultPrevented).toBe(true);
      expect(['debrief', 'driveDebrief']).toContain(m.state.toolData.roadReady.view);
      expect(m.host.querySelector('.rr-drive-shell')).toBeNull();
      // Not driving any more: Escape belongs to the lab again.
      await React.act(async () => { key(document.body, 'Escape'); });
      expect(lab).toHaveBeenCalledTimes(1);
    } finally { document.removeEventListener('keydown', lab); }
  });
  it('Escape closes the More panel first and keeps the drive', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true, reducedMotion: true, calmDrive: true });
    await start();
    await React.act(async () => { buttonByText(m.host, 'More').click(); });
    expect(m.host.querySelector('#rr-drive-more-controls')).toBeTruthy();
    await React.act(async () => { key(document.activeElement, 'Escape'); });
    expect(m.host.querySelector('#rr-drive-more-controls')).toBeNull();
    expect(m.state.toolData.roadReady.view).toBe('driving');
    await React.act(async () => { key(document.body, 'Escape'); });
    expect(m.state.toolData.roadReady.view).not.toBe('driving');
  });
  it('Tab stays inside the pause dialog', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true, reducedMotion: true, calmDrive: true });
    await start();
    await React.act(async () => { buttonByText(m.host, '⏸ Pause').click(); });
    const resume = document.activeElement;
    expect(resume.textContent).toContain('Resume Driving');
    const lab = vi.fn();
    document.addEventListener('keydown', lab);
    try {
      const ev = key(resume, 'Tab');
      expect(ev.defaultPrevented).toBe(true);
      expect(lab).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(resume);
    } finally { document.removeEventListener('keydown', lab); }
  });
  it('leaving the tool in the middle of a drive puts the menu back', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true, reducedMotion: true, calmDrive: true });
    await start();
    expect(m.state.toolData.roadReady.view).toBe('driving');
    const calls = [];
    // The lab keeps toolData when the tool closes: watch what the closing tool writes.
    const config = window.StemLab._registry.roadReady;
    expect(config).toBeTruthy();
    const host2 = document.createElement('div'); document.body.appendChild(host2);
    const root2 = ReactDOMClient.createRoot(host2);
    const ctx2 = makeCtx({ toolData: { roadReady: { view: 'driving', scenario: 'residential', vehicle: 'sedan', reducedMotion: true } }, update: (tool, k, v) => calls.push([tool, k, v]), updateMulti: () => {} });
    await React.act(async () => { root2.render(React.createElement(() => config.render(ctx2))); });
    await React.act(async () => { root2.unmount(); });
    host2.remove();
    expect(calls).toContainEqual(['roadReady', 'view', 'menu']);
  });
});

describe('in30 item 5: the drive view fits and has a full screen button', () => {
  it('rrDriveShellFitHeight: region height minus the space above the view, with a floor', () => {
    expect(RR.rrDriveShellFitHeight(649, 34)).toBe(613);
    expect(RR.rrDriveShellFitHeight(586, 24)).toBe(560);
    expect(RR.rrDriveShellFitHeight(138, 24)).toBe(RR.RR_DRIVE_SHELL_MIN_PX);
    expect(RR.rrDriveShellFitHeight(0, 0)).toBe(0);
  });
  it('inside a lab scroll area the view is sized to it and the area starts at the top', async () => {
    const region = document.createElement('div'); region.className = 'stem-lab-scroll-region';
    Object.defineProperty(region, 'clientHeight', { configurable: true, value: 649 });
    document.body.appendChild(region);
    const m = await mount({ view: 'menu', tourCompleted: true, reducedMotion: true, calmDrive: true }, region);
    const host = m.host;
    region.scrollTop = 300;
    await start();
    const shell = host.querySelector('.rr-drive-shell');
    expect(shell.style.getPropertyValue('height')).toBe('647px');
    expect(shell.style.getPropertyPriority('height')).toBe('important');
    expect(region.scrollTop).toBe(0);
    const fs = host.querySelector('button[data-rr-fullscreen]');
    expect(fs).toBeTruthy();
    expect(fs.getAttribute('aria-pressed')).toBe('false');
    const seen = [];
    window.__alloStemFS = (el) => { seen.push(el); el.setAttribute('data-allo-fullscreen-active', 'true'); };
    try {
      await React.act(async () => { fs.click(); await sleep(20); });
      expect(seen).toEqual([shell]);
      expect(host.querySelector('button[data-rr-fullscreen]').getAttribute('aria-pressed')).toBe('true');
      expect(host.querySelector('button[data-rr-fullscreen]').textContent).toBe('Exit full screen');
    } finally { delete window.__alloStemFS; }
    await React.act(async () => { m.root.unmount(); }); mounted = [];
    region.remove();
  });
});

describe('in30 item 10: keyboard brake', () => {
  it('a tap is a light brake, a short hold is a firm stop, a held key is the full pedal in half a second', () => {
    expect(RR.keyBrakeLevel(0)).toBeCloseTo(0.3, 6);
    expect(RR.keyBrakeLevel(RR.RR_KEY_BRAKE_FIRM_SECONDS)).toBeCloseTo(RR.RR_KEY_BRAKE_FIRM, 6);
    expect(RR.keyBrakeLevel(RR.RR_KEY_BRAKE_FULL_SECONDS)).toBe(1);
    expect(RR.keyBrakeLevel(3)).toBe(1);
    expect(RR.RR_KEY_BRAKE_FULL_SECONDS).toBeLessThanOrEqual(0.5);
    let last = 0;
    for (let t = 0; t <= 0.6; t += 0.016) { const v = RR.keyBrakeLevel(t); expect(v).toBeGreaterThanOrEqual(last); last = v; }
    expect(RR.keyBrakeLevel(-1)).toBeCloseTo(0.3, 6);
    expect(RR.keyBrakeLevel(NaN)).toBeCloseTo(0.3, 6);
  });
  it('the firm level stays under the dry-road hard-brake line and out of ABS; the full pedal does not (functions run)', () => {
    // The loop's line: hardBrakeAt = -(frictionCoef * 0.92 * 9.81) * 0.80. Brake deceleration = brakingMu * 9.81.
    const hardLine = RR.frictionCoef('clear') * 0.92 * 9.81 * 0.80;
    const decel = (pedal) => RR.computeTireDynamics('clear', 25, pedal, 0, {}, 0, 1).brakingMu * 9.81;
    expect(decel(RR.keyBrakeLevel(0))).toBeLessThan(hardLine);
    expect(decel(RR.RR_KEY_BRAKE_FIRM)).toBeLessThan(hardLine - 0.5);   // room for drag and rolling resistance
    expect(decel(1)).toBeGreaterThan(hardLine);
    expect(RR.computeTireDynamics('clear', 25, 1, 0, {}, 0, 1).absActive).toBe(true);   // what one S press asked for before
    expect(RR.computeTireDynamics('clear', 25, RR.keyBrakeLevel(0), 0, {}, 0, 1).absActive).toBe(false);
    expect(RR.computeTireDynamics('clear', 25, RR.RR_KEY_BRAKE_FIRM, 0, {}, 0, 1).absActive).toBe(false);
    expect(RR.computeTireDynamics('clear', 25, RR.keyBrakeLevel(RR.RR_KEY_BRAKE_FULL_SECONDS), 0, {}, 0, 1).absActive).toBe(true);   // emergency stop still there
  });
  it('source: the loop ramps only the key brake, and no hard-brake event is logged under the floor', () => {
    expect(RR.RR_HARD_BRAKE_MIN_MPH).toBe(10);
    expect(SRC).toContain("var keyBrakeHeld = !!(k['s'] || k['arrowdown']) && !k._rrTouchBrake;");
    expect(SRC).toContain('if (keyBrakeHeld) brakeInput = Math.max(keyBrakeLevel(keyBrakeSeconds), gpBrake);');
    expect(SRC).toContain('if (brakeInput > 0 && accel < hardBrakeAt && Math.abs(car.speed) * MS_TO_MPH >= RR_HARD_BRAKE_MIN_MPH &&');
    expect(SRC).toContain("if (keyName === 's') keysRef.current._rrTouchBrake = touchControlsLockedUi ? false : !!held;");
  });
});
