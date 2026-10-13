import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let walk, host, root, latest, viewer, media, mediaListeners;
const query = selector => host.querySelector(selector);
const seed = patch => walk.normalize({ activity: 'aperture', player: walk.spawn('aperture'), ...patch });
const defaults = () => ({ round: 0, phase: 0, speed: 1, masked: true, seenMasked: 2, seenOpen: 0, choice: '', completed: [] });
const click = async selector => { expect(query(selector)).toBeTruthy(); await act(async () => query(selector).click()); };
const observe = state => walk.setAperturePhase(walk.toggleApertureMask(walk.setAperturePhase(state, 90), false), 270);
const answer = state => walk.selectApertureAxis(observe(state), state.aperture.round ? 'vertical' : 'horizontal');
async function input(selector, value) {
  const node = query(selector); expect(node).toBeTruthy();
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function pointer(type, x, y, pointerType = 'mouse') {
  const stage = query('[data-walk-stage]');
  stage.setPointerCapture ||= vi.fn(); stage.hasPointerCapture ||= () => true; stage.releasePointerCapture ||= vi.fn();
  await act(async () => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } }); stage.dispatchEvent(event);
  });
}
async function key(key, repeat = false) {
  await act(async () => query('[data-walk-stage]').dispatchEvent(new KeyboardEvent('keydown', { key, repeat, bubbles: true })));
}
async function mount(patch = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionWalk: seed(patch), otherTool: { preserved: 37 } }); latest = data;
    return React.createElement(walk.Component, { ctx: makeCtx({ toolData: data, setToolData: setData }), onClose: vi.fn() });
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}
async function tick(milliseconds = 300) { await act(async () => { vi.advanceTimersByTime(milliseconds); }); }
async function setReducedMotion(matches) { await act(async () => { media.matches = matches; mediaListeners.forEach(listener => listener({ matches })); }); }

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab();
  mediaListeners = new Set();
  media = { matches: false, media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn((type, listener) => mediaListeners.add(listener)), removeEventListener: vi.fn((type, listener) => mediaListeners.delete(listener)),
    addListener: vi.fn(listener => mediaListeners.add(listener)), removeListener: vi.fn(listener => mediaListeners.delete(listener)) };
  vi.stubGlobal('matchMedia', vi.fn(() => media));
  new Function(readFileSync(resolve('stem_lab/perception_walk.js'), 'utf8'))(); walk = window.StemLab.PerceptionWalk;
  window.StemLab.PerceptionWalkScene = { createViewer: vi.fn(() => {
    let report = () => {};
    viewer = { attach: vi.fn(() => report('ready')), push: vi.fn(), dispose: vi.fn(), status: () => 'ready', onStatusChange: fn => { report = fn; }, report: value => report(value), onLayout: vi.fn(), pick: vi.fn(() => null), apertureCoordinate: vi.fn(x => x) };
    return viewer;
  }) };
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); host?.remove(); host = root = null;
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('aperture motion geometry', () => {
  it('upgrades aperture saves and preserves earlier puzzle saves without mutation', () => {
    const old = { activity: 'landing', landing: { heights: [1.25, 2.7, 1.9], lightAngle: 12, completed: [0] }, notes: { landing: 'A moving shadow.' } }, before = structuredClone(old), state = walk.normalize(old);
    expect(state.aperture).toEqual(defaults()); expect(state.notes.landing).toBe(old.notes.landing); expect(state.landing.completed).toEqual([0]); expect(state.landing.lightAngle).toBe(12); expect(old).toEqual(before);
    expect(walk.activities.at(-1).id).toBe('length'); expect(walk.nextRoom(seed(), 1)).toBe('length'); expect(walk.nextRoom(walk.normalize(old), 1)).toBe('aperture');
    expect(walk.normalizePlayer({ x: 999 }).x).toBe(199.3); expect(walk.normalize(state)).toEqual(state);
  });

  it('uses distinct horizontal and vertical translations with the same visible central line', () => {
    for (let phase = 0; phase <= 360; phase += 15) {
      const horizontal = walk.apertureObjects(0, phase), vertical = walk.apertureObjects(1, phase), sine = Math.sin(phase * Math.PI / 180);
      expect(horizontal.axis).toBe('horizontal'); expect(vertical.axis).toBe('vertical');
      expect(horizontal.offset.x).toBeCloseTo(0.65 * sine, 12); expect(horizontal.offset.y).toBe(0);
      expect(vertical.offset.x).toBe(0); expect(vertical.offset.y).toBeCloseTo(-0.364 * sine, 12);
      for (const rod of [horizontal, vertical]) {
        expect(rod.to.x - rod.from.x).toBeCloseTo(5, 12); expect(rod.to.y - rod.from.y).toBeCloseTo(2.8, 12);
        expect(rod.from.z).toBe(0); expect(rod.to.z).toBe(0); expect(rod.center.x).toBeCloseTo((rod.from.x + rod.to.x) / 2, 12); expect(rod.center.y).toBeCloseTo((rod.from.y + rod.to.y) / 2, 12);
        expect(rod.from.y - 0.56 * (rod.from.x - 180)).toBeCloseTo(2 - 0.364 * sine, 12);
        for (const point of [rod.from, rod.to, rod.center]) for (const coordinate of ['x', 'y', 'z']) expect(Number.isFinite(point[coordinate])).toBe(true);
      }
      expect(horizontal.from.y - 0.56 * horizontal.from.x).toBeCloseTo(vertical.from.y - 0.56 * vertical.from.x, 12);
    }
  });

  it('wraps phase consistently and returns independent geometry objects', () => {
    expect(walk.apertureObjects(0, 360)).toEqual(walk.apertureObjects(0, 0)); expect(walk.apertureObjects(1, -90)).toEqual(walk.apertureObjects(1, 270));
    const rod = walk.apertureObjects(0, 0); rod.from.x = 999; rod.offset.y = 999;
    expect(walk.apertureObjects(0, 0).from.x).toBe(177.5); expect(walk.apertureObjects(0, 0).offset.y).toBe(0);
  });

  it('conceals both endpoint paths behind the closed screen from every inspection view', () => {
    for (const round of [0, 1]) for (let phase = 0; phase < 360; phase += 15) {
      const rod = walk.apertureObjects(round, phase), screen = rod.screen;
      for (const { player } of walk.apertureInspectionViews()) for (const point of [rod.from, rod.to]) {
        const fraction = (screen.z - player.z) / (point.z - player.z);
        const x = player.x + fraction * (point.x - player.x), y = 1.65 + fraction * (point.y - 1.65);
        expect(Math.abs(x - screen.x)).toBeLessThan(screen.width / 2 - 0.1); expect(Math.abs(y - screen.y)).toBeLessThan(screen.height / 2 - 0.1);
        expect(Math.abs(x - screen.x) > screen.openingWidth / 2 + 0.1 || Math.abs(y - screen.y) > screen.openingHeight / 2 + 0.1).toBe(true);
      }
    }
  });
});

describe('aperture observations and scoring', () => {
  it('normalizes bounded state, unique earned rounds and invalid answers', () => {
    const state = seed({ aperture: { round: 99, phase: -90, masked: false, seenMasked: 99, seenOpen: -10, choice: 'diagonal', completed: [0, 0, 1, 2, -1, '1', null] } });
    expect(state.aperture).toEqual({ round: 1, phase: 270, speed: 1, masked: false, seenMasked: 7, seenOpen: 0, choice: '', completed: [0, 1] }); expect(state.progress.aperture.solved).toBe(true);
    expect(seed({ progress: { aperture: { solved: true } } }).progress.aperture.solved).toBe(false);
    expect(seed({ aperture: { completed: [0, 1] }, progress: { aperture: { assisted: true } } }).progress.aperture.solved).toBe(false);
    for (const aperture of [null, [], { phase: Infinity, round: 'bad', seenMasked: NaN, seenOpen: NaN, choice: null, completed: 'bad' }]) expect(seed({ aperture }).aperture).toEqual(defaults());
  });

  it('records distinct signed positions separately for masked and open views', () => {
    let state = seed(); expect(state.aperture.seenMasked).toBe(2); expect(state.aperture.seenOpen).toBe(0);
    state = walk.setAperturePhase(state, 90); expect(state.aperture.seenMasked).toBe(6); expect(state.aperture.seenOpen).toBe(0);
    state = walk.toggleApertureMask(state, false); expect(state.aperture.masked).toBe(false); expect(state.aperture.seenOpen).toBe(4);
    state = walk.setAperturePhase(state, 270); expect(state.aperture.seenMasked).toBe(6); expect(state.aperture.seenOpen).toBe(5);
    state = walk.toggleApertureMask(state); expect(state.aperture.masked).toBe(true); expect(state.aperture.seenMasked).toBe(7); expect(state.aperture.seenOpen).toBe(5);
    expect(walk.setAperturePhase(state, 630).aperture).toEqual(state.aperture);
  });

  it('normalizes playback speed independently of observations and earned progress', () => {
    for (const [speed, expected] of [[undefined, 1], [null, 1], ['', 1], ['bad', 1], [NaN, 1], [Infinity, 1], [-Infinity, 1], [-2, 0.25], [0, 0.25], [0.5, 0.5], ['1.5', 1.5], [2, 2], [20, 2]]) {
      const state = seed({ aperture: { speed, phase: 90, seenMasked: 6, seenOpen: 5, choice: 'horizontal', completed: [0] } });
      expect(state.aperture).toEqual({ ...defaults(), speed: expected, phase: 90, seenMasked: 6, seenOpen: 5, choice: 'horizontal', completed: [0] });
      expect(state.progress.aperture.solved).toBe(false); expect(walk.normalize(state)).toEqual(state);
    }
  });

  it('changes only playback speed and rejects invalid values without mutating the saved experiment', () => {
    const state = seed({ aperture: { speed: 0.75, phase: 90, seenMasked: 6, seenOpen: 5, choice: 'horizontal', completed: [0] }, notes: { aperture: 'Compare slow motion.' }, landing: { lightAngle: 12, completed: [0] } });
    const before = structuredClone(state);
    for (const [value, speed] of [[0.25, 0.25], [2, 2], [-1, 0.25], [5, 2], ['1.5', 1.5]]) expect(walk.setApertureSpeed(state, value)).toEqual({ ...state, aperture: { ...state.aperture, speed } });
    for (const value of [null, '', 'bad', Infinity, -Infinity, NaN, {}, true]) expect(walk.setApertureSpeed(state, value)).toEqual(state);
    expect(state).toEqual(before);
  });

  it('does not treat repeated neutral positions or repeated mask switches as motion evidence', () => {
    let state = seed();
    for (const phase of [0, 180, 360, 10, 350]) { state = walk.setAperturePhase(state, phase); state = walk.toggleApertureMask(walk.toggleApertureMask(state)); }
    expect(state.aperture.seenMasked).toBe(2); expect(state.aperture.seenOpen).toBe(2);
    state = walk.selectApertureAxis(state, 'horizontal'); expect(walk.apertureMatches(state)).toBe(false); expect(walk.checkAperture(state).aperture.completed).toEqual([]);
  });

  it.each([{ activity: 'landing' }, { player: { x: 174.4, z: 10, yaw: 29.25, pitch: 0 } }, { player: { x: 185.6, z: 10, yaw: -29.25, pitch: 0 } },
    { player: { x: 180, z: 4.9, yaw: 0, pitch: 0 } }, { player: { x: 180, z: 13.1, yaw: 0, pitch: 0 } },
    { player: { x: 180, z: 10, yaw: 180, pitch: 0 } }, { player: { x: 180, z: 10, yaw: 0, pitch: 20 } }])('gates observation, choices and scoring outside the active viewing area: %j', patch => {
    const state = seed({ aperture: { seenMasked: 7, seenOpen: 7, choice: 'horizontal' }, ...patch });
    expect(walk.canObserveAperture(state)).toBe(false); expect(walk.setAperturePhase(state, 90)).toEqual(state); expect(walk.setApertureSpeed(state, 2)).toEqual(state); expect(walk.toggleApertureMask(state)).toEqual(state); expect(walk.selectApertureAxis(state, 'vertical')).toEqual(state);
    expect(walk.apertureMatches(state)).toBe(false); expect(walk.checkAperture(state).aperture.completed).toEqual([]);
  });

  it('preserves notes, camera and sibling work while rejecting invalid phase and choice input', () => {
    const state = seed({ notes: { aperture: 'Watch both ends.' }, landing: { lightAngle: 12, completed: [0] } }), before = structuredClone(state);
    const changed = walk.selectApertureAxis(walk.setAperturePhase(state, 450), 'vertical');
    expect(changed.aperture.phase).toBe(90); expect(changed.aperture.choice).toBe('vertical'); expect(changed.player).toEqual(state.player); expect(changed.notes).toEqual(state.notes); expect(changed.landing).toEqual(state.landing); expect(state).toEqual(before);
    for (const value of [null, '', 'bad', Infinity, NaN]) expect(walk.setAperturePhase(state, value)).toEqual(state);
    for (const value of ['', 'diagonal', 'Horizontal', null, 1, {}, ['horizontal']]) expect(walk.selectApertureAxis(state, value)).toEqual(state);
  });

  it('includes the observation-area boundaries when the player faces the exhibit', () => {
    for (const x of [174.5, 180, 185.5]) for (const z of [5, 13]) {
      const state = seed({ player: { x, z, yaw: Math.atan2(180 - x, z) * 180 / Math.PI, pitch: 0 } });
      expect(walk.canObserveAperture(state)).toBe(true); expect(walk.setAperturePhase(state, 90).aperture.seenMasked).toBe(6);
    }
  });

  it.each([0, 1])('requires two positions in both viewing modes and the correct axis in round %i', round => {
    const correct = round ? 'vertical' : 'horizontal';
    for (const [seenMasked, seenOpen] of [[2, 0], [7, 0], [7, 1], [2, 7], [1, 4]]) {
      const state = seed({ aperture: { round, seenMasked, seenOpen, choice: correct } }); expect(walk.apertureMatches(state)).toBe(false); expect(walk.checkAperture(state).aperture.completed).toEqual([]);
    }
    for (const choice of ['', round ? 'horizontal' : 'vertical']) expect(walk.apertureMatches(seed({ aperture: { round, seenMasked: 7, seenOpen: 7, choice } }))).toBe(false);
    const observed = answer(seed({ aperture: { round } })); expect(walk.apertureMatches(observed)).toBe(true); expect(observed.aperture.completed).toEqual([]); expect(walk.checkAnswer(observed)).toBe(false);
  });

  it('awards each round once and resets observations for the second round while preserving notes', () => {
    const initial = seed({ notes: { aperture: 'Endpoints disambiguate motion.' } }); expect(walk.nextAperture(initial)).toEqual(initial);
    let state = answer(initial); expect(walk.nextAperture(state)).toEqual(state); state = walk.checkAperture(state);
    expect(state.aperture.completed).toEqual([0]); expect(walk.checkAperture(state)).toEqual(state); expect(state.progress.aperture.solved).toBe(false);
    state = walk.nextAperture(state); expect(state.aperture).toEqual({ ...defaults(), round: 1, completed: [0] }); expect(state.notes).toEqual(initial.notes);
    state = walk.checkAperture(answer(state)); expect(state.aperture.completed).toEqual([0, 1]); expect(state.progress.aperture.solved).toBe(true); expect(walk.checkAnswer(state)).toBe(true);
    expect(walk.nextAperture(state).aperture).toEqual({ ...defaults(), completed: [0, 1] }); expect(walk.nextAperture(state).progress.aperture.solved).toBe(true);
  });

  it('allows revealed practice without awarding earned progress', () => {
    const assisted = answer(seed({ progress: { aperture: { assisted: true } } })); expect(walk.checkAperture(assisted).aperture.completed).toEqual([]);
    const next = walk.nextAperture(assisted); expect(next.aperture.round).toBe(1); expect(next.aperture.completed).toEqual([]); expect(next.progress.aperture.assisted).toBe(true);
    const other = seed({ activity: 'landing', aperture: { completed: [0, 1] } }); expect(walk.nextAperture(other)).toEqual(other);
  });

  it('preserves the chosen speed when advancing earned or assisted trials', () => {
    const earned = walk.checkAperture(answer(seed({ aperture: { speed: 0.25 } })));
    expect(walk.nextAperture(earned).aperture).toEqual({ ...defaults(), round: 1, speed: 0.25, completed: [0] });
    const assisted = seed({ aperture: { speed: 2 }, progress: { aperture: { assisted: true } } });
    expect(walk.nextAperture(assisted).aperture).toEqual({ ...defaults(), round: 1, speed: 2 });
  });

  it.each(['front', 'left', 'right'])('offers a gated %s inspection pose without changing the experiment', side => {
    const state = seed({ aperture: { phase: 90, seenMasked: 6, choice: 'horizontal' } }), inspected = walk.inspectAperture(state, side);
    expect(walk.canObserveAperture(inspected)).toBe(true); expect(inspected.aperture).toEqual(state.aperture);
    const other = { ...state, activity: 'landing' }; expect(walk.inspectAperture(other, side)).toEqual(walk.normalize(other));
  });
});

describe('aperture interactive controls', () => {
  it('steps and scrubs motion, opens the screen and scores both observed rounds', async () => {
    await mount(); expect(query('[data-walk-aperture-next]').disabled).toBe(true); expect(query('[data-walk-aperture-mask]').checked).toBe(true);
    await click('[data-walk-aperture-forward]'); expect(latest.perceptionWalk.aperture.phase).toBe(30); await click('[data-walk-aperture-back]'); expect(latest.perceptionWalk.aperture.phase).toBe(0);
    for (const round of [0, 1]) {
      await click('[data-walk-aperture-choice="' + (round ? 'vertical' : 'horizontal') + '"]'); await click('[data-walk-check]'); expect(latest.perceptionWalk.aperture.completed).not.toContain(round);
      await input('[data-walk-aperture-phase]', 90); await click('[data-walk-aperture-mask]'); await input('[data-walk-aperture-phase]', 270); await click('[data-walk-check]');
      expect(latest.perceptionWalk.aperture.completed).toContain(round); if (!round) await click('[data-walk-aperture-next]');
    }
    expect(latest.perceptionWalk.progress.aperture).toMatchObject({ solved: true, assisted: false }); expect(latest.otherTool).toEqual({ preserved: 37 });
    await click('[data-walk-reveal]'); expect(latest.perceptionWalk.progress.aperture.assisted).toBe(false);
  });

  it('keeps revealed practice separate and resets only this room', async () => {
    await mount({ aperture: { speed: 1.75 }, notes: { aperture: 'Keep my note.' }, landing: { completed: [0] }, progress: { ring: { solved: true } } });
    await click('[data-walk-reveal]'); await input('[data-walk-aperture-phase]', 90); await click('[data-walk-aperture-mask]'); await input('[data-walk-aperture-phase]', 270); await click('[data-walk-aperture-choice="horizontal"]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.aperture.completed).toEqual([]); expect(latest.perceptionWalk.progress.aperture.assisted).toBe(true); expect(query('[data-walk-aperture-next]').disabled).toBe(false);
    await click('[data-walk-reset]'); expect(latest.perceptionWalk.aperture).toEqual(defaults()); expect(latest.perceptionWalk.progress.aperture).toEqual({ solved: false, assisted: false, hints: 0 });
    expect(latest.perceptionWalk.notes.aperture).toBe('Keep my note.'); expect(latest.perceptionWalk.landing.completed).toEqual([0]); expect(latest.perceptionWalk.progress.ring.solved).toBe(true);
  });

  it('synchronizes revealed screen state with its checkbox and renderer without adding observations', async () => {
    await mount({ aperture: { phase: 90, seenMasked: 6, seenOpen: 0, completed: [0, 1] } });
    const before = structuredClone(latest.perceptionWalk.aperture);
    await click('[data-walk-reveal]');
    expect(latest.perceptionWalk.aperture).toEqual({ ...before, masked: false }); expect(query('[data-walk-aperture-mask]').checked).toBe(false);
    expect(viewer.push.mock.lastCall[0].apertureMasked).toBe(false); expect(latest.perceptionWalk.progress.aperture).toMatchObject({ solved: true, assisted: false });
    await click('[data-walk-diagram-toggle]'); expect(query('[data-walk-aperture-panels]')).toBeNull(); expect(query('[data-walk-aperture-guides]')).toBeTruthy();
    await click('[data-walk-aperture-mask]'); expect(latest.perceptionWalk.aperture.masked).toBe(true); expect(query('[data-walk-aperture-mask]').checked).toBe(true);
    expect(query('[data-walk-aperture-panels]').querySelectorAll('polygon')).toHaveLength(4); expect(query('[data-walk-aperture-guides]')).toBeTruthy();
    expect(latest.perceptionWalk.progress.aperture.solved).toBe(true); expect(latest.perceptionWalk.aperture.seenOpen).toBe(0);
  });

  it.each(['front', 'left', 'right'])('renders a finite %s fallback and keeps phase and mask controls available', async side => {
    await mount(); await click('[data-walk-aperture-view="' + side + '"]'); await click('[data-walk-diagram-toggle]');
    const plan = query('[data-walk-aperture-plan]'); expect(plan).toBeTruthy(); expect(plan.outerHTML).not.toMatch(/NaN|Infinity/);
    const before = plan.innerHTML; await input('[data-walk-aperture-phase]', 90); expect(plan.innerHTML).not.toBe(before);
    const masked = plan.innerHTML; await click('[data-walk-aperture-mask]'); expect(plan.innerHTML).not.toBe(masked); expect(plan.outerHTML).not.toMatch(/NaN|Infinity/);
    await click('[data-walk-reveal]'); expect(query('[data-walk-aperture-guides]')).toBeTruthy();
  });

  it('retains manual controls after WebGL fails', async () => {
    await mount(); await act(async () => viewer.report('failed')); expect(query('[data-walk-aperture-plan]')).toBeTruthy();
    await input('[data-walk-aperture-phase]', 90); await click('[data-walk-aperture-mask]'); await input('[data-walk-aperture-phase]', 270); await click('[data-walk-aperture-choice="horizontal"]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.aperture.completed).toEqual([0]); expect(query('[data-walk-aperture-play]').disabled).toBe(true);
  });

  it('starts paused and stops playback on manual phase and screen changes', async () => {
    await mount(); vi.useFakeTimers(); await tick(); expect(latest.perceptionWalk.aperture.phase).toBe(0);
    await click('[data-walk-aperture-play]'); await tick(); expect(latest.perceptionWalk.aperture.phase).toBeGreaterThan(0);
    expect(latest.perceptionWalk.aperture).not.toHaveProperty('playing');
    await click('[data-walk-aperture-play]'); const paused = latest.perceptionWalk.aperture.phase; await tick(); expect(latest.perceptionWalk.aperture.phase).toBe(paused);
    await click('[data-walk-aperture-play]'); await input('[data-walk-aperture-phase]', 90); await tick(); expect(latest.perceptionWalk.aperture.phase).toBe(90);
    await click('[data-walk-aperture-play]'); await tick(); await click('[data-walk-aperture-mask]'); const opened = latest.perceptionWalk.aperture.phase;
    await tick(); expect(latest.perceptionWalk.aperture.phase).toBe(opened); expect(query('[data-walk-aperture-play]').getAttribute('aria-pressed')).toBe('false');
  });

  it('adjusts speed while paused without collecting observations or changing phase', async () => {
    await mount({ aperture: { phase: 90, speed: 1, seenMasked: 6, seenOpen: 5, completed: [0] } });
    const before = structuredClone(latest.perceptionWalk), slider = query('[data-walk-aperture-speed]');
    expect(slider.min).toBe('0.25'); expect(slider.max).toBe('2'); expect(slider.step).toBe('0.25');
    await input('[data-walk-aperture-speed]', 0.5);
    expect(latest.perceptionWalk).toEqual({ ...before, aperture: { ...before.aperture, speed: 0.5 } });
    expect(query('[data-walk-aperture-play]').getAttribute('aria-pressed')).toBe('false');
  });

  it('changes playback rate without pausing, jumping phase, or restarting the current tick', async () => {
    await mount({ aperture: { speed: 0.25 } }); vi.useFakeTimers();
    await click('[data-walk-aperture-play]'); await tick(50); expect(latest.perceptionWalk.aperture.phase).toBeCloseTo(0.5625);
    await tick(25); const before = structuredClone(latest.perceptionWalk.aperture); await input('[data-walk-aperture-speed]', 2);
    expect(latest.perceptionWalk.aperture).toEqual({ ...before, speed: 2 }); expect(query('[data-walk-aperture-play]').getAttribute('aria-pressed')).toBe('true');
    await tick(25); expect(latest.perceptionWalk.aperture.phase).toBeCloseTo(5.0625);
    await tick(50); expect(latest.perceptionWalk.aperture.phase).toBeCloseTo(9.5625);
    expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('turns the physical dial across the angle seam and through multiple rotations without moving the camera', async () => {
    await mount({ aperture: { phase: 350 } }); viewer.pick.mockReturnValue({ id: 'aperture-dial' });
    const player = structuredClone(latest.perceptionWalk.player);
    const coordinates = [359, 1, 91, 181, 271, 1, 91]; viewer.apertureCoordinate.mockImplementation(() => coordinates.shift());
    await pointer('pointerdown', 100, 100);
    for (const [index, expected] of [352, 82, 172, 262, 352, 82].entries()) {
      await pointer('pointermove', 110 + index * 10, 100); expect(latest.perceptionWalk.aperture.phase).toBeCloseTo(expected);
    }
    await pointer('pointerup', 160, 100); expect(latest.perceptionWalk.aperture.phase).toBeCloseTo(82);
    expect(latest.perceptionWalk.player).toEqual(player); expect(latest.perceptionWalk.aperture.completed).toEqual([]); expect(latest.perceptionWalk.aperture.seenMasked).toBe(7);
  });

  it('re-anchors the dial after an invalid angular coordinate without jumping across its center', async () => {
    await mount({ aperture: { phase: 40 } }); viewer.pick.mockReturnValue({ id: 'aperture-dial' });
    const coordinates = [null, 90, 120, null, 300, 330]; viewer.apertureCoordinate.mockImplementation(() => coordinates.shift());
    await pointer('pointerdown', 100, 100);
    for (const [index, expected] of [40, 70, 70, 70, 100].entries()) {
      await pointer('pointermove', 110 + index * 10, 100); expect(latest.perceptionWalk.aperture.phase).toBeCloseTo(expected);
    }
    await pointer('pointerup', 150, 100); expect(latest.perceptionWalk.aperture.phase).toBeCloseTo(100);
  });

  it('applies fine movement to angular dial dragging and horizontal touch dragging', async () => {
    await mount({ precise: true, aperture: { phase: 45 } }); viewer.pick.mockReturnValue({ id: 'aperture-dial' });
    viewer.apertureCoordinate.mockReturnValueOnce(350).mockReturnValueOnce(10);
    const player = structuredClone(latest.perceptionWalk.player);
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 120, 100); await pointer('pointerup', 120, 100);
    expect(latest.perceptionWalk.aperture.phase).toBeCloseTo(50);
    await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 140, 102, 'touch'); await pointer('pointerup', 140, 102, 'touch');
    expect(latest.perceptionWalk.aperture.phase).toBeCloseTo(57.5); expect(latest.perceptionWalk.player).toEqual(player);
  });

  it('leaves vertical touch scrolling unchanged and maps horizontal touch gestures to dial motion', async () => {
    await mount(); viewer.pick.mockReturnValue({ id: 'aperture-dial' }); const before = structuredClone(latest.perceptionWalk);
    await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 102, 150, 'touch'); await pointer('pointerup', 102, 150, 'touch');
    expect(latest.perceptionWalk).toEqual(before);
    await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 140, 102, 'touch'); await pointer('pointerup', 140, 102, 'touch');
    expect(latest.perceptionWalk.aperture.phase).toBeCloseTo(30); expect(latest.perceptionWalk.player).toEqual(before.player);
  });

  it('pauses playback as soon as the dial is grabbed', async () => {
    await mount(); viewer.pick.mockReturnValue({ id: 'aperture-dial' }); vi.useFakeTimers();
    await click('[data-walk-aperture-play]'); await tick(); const phase = latest.perceptionWalk.aperture.phase;
    await pointer('pointerdown', 100, 100); await tick(); expect(latest.perceptionWalk.aperture.phase).toBe(phase);
    expect(query('[data-walk-aperture-play]').getAttribute('aria-pressed')).toBe('false');
    await pointer('pointercancel', 100, 100); await tick(); expect(latest.perceptionWalk.aperture.phase).toBe(phase);
  });

  it.each(['pointercancel', 'lostpointercapture', 'blur', 'room', 'home', 'plan'])('ends dial dragging on %s', async action => {
    await mount(); viewer.pick.mockReturnValue({ id: 'aperture-dial' });
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 120, 100); expect(latest.perceptionWalk.aperture.phase).toBe(20);
    if (action === 'blur') await act(async () => window.dispatchEvent(new Event('blur')));
    else if (action === 'room') await click('[data-walk-activity="landing"]');
    else if (action === 'home') await click('[data-walk-home]');
    else if (action === 'plan') await click('[data-walk-diagram-toggle]');
    else await pointer(action, 120, 100);
    const before = structuredClone(latest.perceptionWalk.aperture);
    await pointer('pointermove', 160, 100); await pointer('pointerup', 160, 100); expect(latest.perceptionWalk.aperture).toEqual(before);
  });

  it('steps a clicked or keyboard-selected dial once and honors fine movement', async () => {
    await mount(); viewer.pick.mockReturnValue({ id: 'aperture-dial' }); const player = structuredClone(latest.perceptionWalk.player);
    await pointer('pointerdown', 100, 100); await pointer('pointerup', 100, 100); expect(latest.perceptionWalk.aperture.phase).toBe(30);
    await key('e'); expect(latest.perceptionWalk.aperture.phase).toBe(60); await key('e', true); expect(latest.perceptionWalk.aperture.phase).toBe(60);
    await click('[data-walk-precision]'); await key('e'); expect(latest.perceptionWalk.aperture.phase).toBe(65);
    await click('[data-walk-interact]'); expect(latest.perceptionWalk.aperture.phase).toBe(70); expect(latest.perceptionWalk.player).toEqual(player);
  });

  it('allows aiming directly at either physical control from every inspection viewpoint', () => {
    for (const { player } of walk.apertureInspectionViews()) for (const x of [176.5, 183.5]) {
      const dx = x - player.x, dz = player.z - 2.2, aimed = { ...player, yaw: Math.atan2(dx, dz) * 180 / Math.PI, pitch: Math.atan2(1.1 - 1.65, Math.hypot(dx, dz)) * 180 / Math.PI };
      const state = seed({ player: aimed }); expect(walk.canObserveAperture(state)).toBe(true); expect(walk.setAperturePhase(state, 90).aperture.phase).toBe(90);
      expect(walk.setApertureSpeed(state, 0.5).aperture.speed).toBe(0.5); expect(walk.toggleApertureMask(state).aperture.masked).toBe(false);
    }
  });

  it('keeps speed and physical dial interactions gated outside the observation area', async () => {
    await mount({ player: { x: 180, z: 10, yaw: 180, pitch: 0 } }); viewer.pick.mockReturnValue({ id: 'aperture-dial' });
    const before = structuredClone(latest.perceptionWalk.aperture); expect(query('[data-walk-aperture-speed]').disabled).toBe(true);
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 120, 100); await pointer('pointerup', 120, 100); await key('e');
    expect(latest.perceptionWalk.aperture).toEqual(before);
  });

  it('stops playback on blur, room navigation, fallback and renderer failure', async () => {
    await mount(); vi.useFakeTimers();
    await click('[data-walk-aperture-play]'); await tick(); await act(async () => window.dispatchEvent(new Event('blur')));
    const blurred = latest.perceptionWalk.aperture.phase; await tick(); expect(latest.perceptionWalk.aperture.phase).toBe(blurred);
    await click('[data-walk-aperture-play]'); await tick(); await click('[data-walk-activity="landing"]');
    const away = latest.perceptionWalk.aperture.phase; await tick(); expect(latest.perceptionWalk.aperture.phase).toBe(away);
    await click('[data-walk-activity="aperture"]'); await tick(); expect(latest.perceptionWalk.aperture.phase).toBe(away);
    await click('[data-walk-aperture-play]'); await tick(); await click('[data-walk-diagram-toggle]');
    const plan = latest.perceptionWalk.aperture.phase; await tick(); expect(latest.perceptionWalk.aperture.phase).toBe(plan); expect(query('[data-walk-aperture-play]').disabled).toBe(true);
    await click('[data-walk-diagram-toggle]'); await click('[data-walk-aperture-play]'); await tick(); await act(async () => viewer.report('failed'));
    const failed = latest.perceptionWalk.aperture.phase; await tick(); expect(latest.perceptionWalk.aperture.phase).toBe(failed); expect(query('[data-walk-aperture-play]').disabled).toBe(true);
  });

  it('honors reduced motion and cleans up playback timers and preference listeners', async () => {
    media.matches = true; await mount(); vi.useFakeTimers();
    expect(query('[data-walk-aperture-play]').disabled).toBe(true); await tick(); expect(latest.perceptionWalk.aperture.phase).toBe(0);
    await click('[data-walk-aperture-forward]'); expect(latest.perceptionWalk.aperture.phase).toBe(30);
    await setReducedMotion(false); expect(query('[data-walk-aperture-play]').disabled).toBe(false);
    await click('[data-walk-aperture-play]'); await tick(); expect(latest.perceptionWalk.aperture.phase).toBeGreaterThan(30);
    await setReducedMotion(true); const stopped = latest.perceptionWalk.aperture.phase; await tick(); expect(latest.perceptionWalk.aperture.phase).toBe(stopped);
    expect(query('[data-walk-aperture-play]').disabled).toBe(true); await input('[data-walk-aperture-phase]', 90); expect(latest.perceptionWalk.aperture.phase).toBe(90);
    await act(async () => root.unmount()); root = null; expect(mediaListeners.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
});
