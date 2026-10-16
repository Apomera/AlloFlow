import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let walk, host, root, latest, viewer;
const query = selector => host.querySelector(selector);
const seed = patch => walk.normalize({ activity: 'landing', player: walk.spawn('landing'), ...patch });
const solution = round => round ? [2.65, 1.35, 2.3] : [1.25, 2.7, 1.9];
const answer = raw => solution(raw.landing.round).reduce((state, value, index) => walk.setLandingHeight(state, index, value), raw);
const click = async selector => { expect(query(selector)).toBeTruthy(); await act(async () => query(selector).click()); };
async function input(selector, value) {
  const node = query(selector);
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function mount(patch = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionWalk: seed(patch), otherTool: { preserved: 37 } }); latest = data;
    return React.createElement(walk.Component, { ctx: makeCtx({ toolData: data, setToolData: setData }), onClose: vi.fn() });
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}
async function pointer(type, x, y, pointerType = 'mouse') {
  const stage = query('[data-walk-stage]'); stage.setPointerCapture ||= vi.fn(); stage.hasPointerCapture ||= () => true; stage.releasePointerCapture ||= vi.fn();
  await act(async () => { const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y }); Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } }); stage.dispatchEvent(event); });
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab();
  new Function(readFileSync(resolve('stem_lab/perception_walk.js'), 'utf8'))(); walk = window.StemLab.PerceptionWalk;
  window.StemLab.PerceptionWalkScene = { createViewer: vi.fn(() => {
    let report = () => {};
    viewer = { attach: vi.fn(() => report('ready')), push: vi.fn(), dispose: vi.fn(), status: () => 'ready', onStatusChange: fn => { report = fn; }, onLayout: vi.fn(), pick: vi.fn(() => ({ id: 'landing-B' })), landingCoordinate: vi.fn((x, y) => -y / 100) };
    return viewer;
  }) };
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); host = root = null; vi.restoreAllMocks(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; });

describe('shadow landing model', () => {
  it('retains the landing room and expanded hall without altering old puzzle saves', () => {
    const old = { activity: 'weave', weave: { depths: [0.8, 0, -1], completed: [0] }, notes: { weave: 'Keep my note.' } }, state = walk.normalize(old);
    expect(state.landing.heights).toEqual([2.6, 1, 2.9]); expect(state.landing.lightAngle).toBe(0); expect(state.notes.weave).toBe(old.notes.weave); expect(state.weave.completed).toEqual([0]);
    expect(walk.nextRoom(seed(), 1)).toBe('aperture'); expect(walk.nextRoom(walk.normalize({ activity: 'weave' }), 1)).toBe('landing');
    expect(walk.activities.at(-1).id).toBe('anamorphosis'); expect(walk.normalizePlayer({ x: 999 }).x).toBe(223.3);
  });
  it('normalizes malformed state and derives earned progress from unique rounds', () => {
    const s = seed({ landing: { round: 999, heights: [-2, '2.1', Infinity], selected: 999, completed: [0, 0, 1, 3] } });
    expect(s.landing).toEqual({ round: 1, heights: [0.55, 2.1, 1.2], selected: 2, lightAngle: 0, completed: [0, 1] }); expect(s.progress.landing.solved).toBe(true);
    expect(seed({ progress: { landing: { solved: true } } }).progress.landing.solved).toBe(false);
    expect(seed({ landing: s.landing, progress: { landing: { assisted: true } } }).progress.landing.solved).toBe(false);
  });
  it.each([0, 1])('projects genuine directional sphere shadows in arrangement %i', round => {
    const light = walk.landingLight(round), objects = walk.landingObjects(round, [0.55, 1.75, 3.2]);
    for (const sphere of objects) {
      expect(sphere.shadow.x).toBeCloseTo(sphere.x + sphere.y * light.x, 10); expect(sphere.shadow.z).toBeCloseTo(sphere.z + sphere.y * light.z, 10);
      expect(sphere.shadow.major).toBeCloseTo(sphere.radius * Math.sqrt(1 + light.x ** 2 + light.z ** 2), 10); expect(sphere.shadow.minor).toBe(sphere.radius);
      expect(sphere.shadow.angle).toBeCloseTo(Math.atan2(light.z, light.x), 10);
      expect(sphere.target.x).toBeCloseTo(sphere.x + sphere.targetHeight * light.x, 10);
    }
  });
  it('moves shadows without resizing them or changing sphere floor coordinates', () => {
    const a = walk.landingObjects(0, [0.55, 1, 1]), b = walk.landingObjects(0, [3.2, 1, 1]);
    expect(b[0].shadow.x - a[0].shadow.x).toBeCloseTo((3.2 - 0.55) * 0.6); expect(b[0].shadow.major).toBe(a[0].shadow.major); expect(b[0].shadow.minor).toBe(a[0].shadow.minor);
    expect([b[0].x, b[0].z, b[0].radius]).toEqual([a[0].x, a[0].z, a[0].radius]); expect(b.slice(1)).toEqual(a.slice(1));
  });
  it('normalizes saved light angles with safe defaults and bounded finite values', () => {
    for (const round of [0, 1]) expect(walk.landingDefaults(round).lightAngle).toBe(0);
    for (const [value, expected] of [[undefined, 0], [NaN, 0], [Infinity, 0], [-Infinity, 0], ['bad', 0], ['12', 12], [99, 25], [-99, -25], [0, 0]]) {
      expect(seed({ landing: { lightAngle: value } }).landing.lightAngle).toBe(expected);
    }
  });
  it.each([0, 1])('rotates light and floor targets without changing shadow size in arrangement %i', round => {
    const original = walk.landingLight(round), heights = [0.55, 1.75, 3.2], baseline = walk.landingObjects(round, heights);
    for (const angle of [-25, 0, 25]) {
      const radians = angle * Math.PI / 180, light = walk.landingLight(round, angle), objects = walk.landingObjects(round, heights, angle);
      expect(light.x).toBeCloseTo(original.x * Math.cos(radians) - original.z * Math.sin(radians), 10);
      expect(light.z).toBeCloseTo(original.x * Math.sin(radians) + original.z * Math.cos(radians), 10);
      expect(Math.hypot(light.x, light.z)).toBeCloseTo(Math.hypot(original.x, original.z), 10);
      for (const [index, sphere] of objects.entries()) {
        expect([sphere.x, sphere.y, sphere.z, sphere.radius, sphere.targetHeight]).toEqual([baseline[index].x, heights[index], baseline[index].z, baseline[index].radius, baseline[index].targetHeight]);
        expect(sphere.shadow.x).toBeCloseTo(sphere.x + sphere.y * light.x, 10); expect(sphere.shadow.z).toBeCloseTo(sphere.z + sphere.y * light.z, 10);
        expect(sphere.target.x).toBeCloseTo(sphere.x + sphere.targetHeight * light.x, 10); expect(sphere.target.z).toBeCloseTo(sphere.z + sphere.targetHeight * light.z, 10);
        expect(sphere.shadow.major).toBeCloseTo(baseline[index].shadow.major, 10); expect(sphere.shadow.minor).toBe(baseline[index].shadow.minor);
        expect(sphere.target.major).toBeCloseTo(sphere.shadow.major, 10); expect(sphere.target.minor).toBe(sphere.shadow.minor);
        expect(sphere.shadow.angle).toBeCloseTo(Math.atan2(light.z, light.x), 10); expect(sphere.target.angle).toBeCloseTo(sphere.shadow.angle, 10);
      }
    }
  });
  it.each([0, 1])('keeps the solution and height tolerance truthful throughout light rotation in arrangement %i', round => {
    for (const lightAngle of [-25, -12, 0, 12, 25]) {
      const unsolved = walk.setLandingLight(seed({ landing: { round } }), lightAngle);
      expect(walk.landingMatches(unsolved)).toBe(false); expect(unsolved.landing.completed).toEqual([]);
      const solved = answer(unsolved); expect(walk.landingMatches(solved)).toBe(true);
      for (const sphere of walk.landingObjects(round, solved.landing.heights, lightAngle)) {
        expect(sphere.shadow.x).toBeCloseTo(sphere.target.x, 10); expect(sphere.shadow.z).toBeCloseTo(sphere.target.z, 10);
      }
      solved.landing.heights[0] += 0.12; expect(walk.landingMatches(solved)).toBe(true);
      solved.landing.heights[0] += 0.001; expect(walk.landingMatches(solved)).toBe(false);
    }
  });
  it('bounds light rotation, rejects non-finite changes, and preserves other puzzle work', () => {
    const s = seed({ landing: { heights: [1.5, 2.4, 2.1], selected: 2, lightAngle: 7, completed: [0, 1] }, notes: { landing: 'Light changes the cast direction.' }, progress: { ring: { solved: true } } });
    expect(walk.setLandingLight(s, 99).landing.lightAngle).toBe(25); expect(walk.setLandingLight(s, -99).landing.lightAngle).toBe(-25);
    for (const value of [NaN, Infinity, -Infinity, 'bad']) expect(walk.setLandingLight(s, value)).toEqual(s);
    const after = walk.setLandingLight(s, -12);
    expect(after.landing).toEqual({ ...s.landing, lightAngle: -12 }); expect(after.notes).toEqual(s.notes); expect(after.progress).toEqual(s.progress); expect(s.landing.lightAngle).toBe(7);
    expect(walk.setLandingLight(answer(seed()), 25).landing.completed).toEqual([]);
    const otherRoom = { ...s, activity: 'weave' }; expect(walk.setLandingLight(otherRoom, 12)).toEqual(walk.normalize(otherRoom));
  });
  it.each([0, 1])('accepts a full alignment and tolerant boundary in arrangement %i', round => {
    const s = answer(seed({ landing: { round } })); expect(walk.landingMatches(s)).toBe(true); expect(walk.landingAligned(s)).toBe(3);
    s.landing.heights[0] += 0.12; expect(walk.landingMatches(s)).toBe(true); s.landing.heights[0] += 0.001; expect(walk.landingAligned(s)).toBe(2); expect(walk.landingMatches(s)).toBe(false);
  });
  it('requires two separately completed arrangements and does not duplicate credit', () => {
    let s = seed(); expect(walk.nextLanding(s)).toEqual(s); s = walk.checkLanding(answer(s)); expect(s.landing.completed).toEqual([0]); expect(s.progress.landing.solved).toBe(false);
    expect(walk.checkLanding(s).landing.completed).toEqual([0]); s = walk.nextLanding(walk.setLandingLight(s, 25)); expect(s.landing.round).toBe(1); expect(s.landing.heights).toEqual([0.7, 2.8, 1.2]); expect(s.landing.lightAngle).toBe(0);
    s = walk.checkLanding(answer(s)); expect(s.progress.landing.solved).toBe(true); expect(walk.checkAnswer(s)).toBe(true);
  });
  it.each([{ x: 168, z: 10, yaw: 180, pitch: 0 }, { x: 168, z: 2, yaw: 0, pitch: 0 }, { x: 156, z: 10, yaw: 0, pitch: 0 }, { x: 168, z: 10, yaw: 0, pitch: 30 }])('rejects remote or turned-away manipulation and scoring', player => {
    const s = seed({ player, landing: { heights: solution(0), lightAngle: 7 } }); expect(walk.canManipulateLanding(s)).toBe(false); expect(walk.setLandingHeight(s, 0, 2).landing).toEqual(s.landing); expect(walk.setLandingLight(s, -12)).toEqual(s); expect(walk.checkLanding(s).landing.completed).toEqual([]);
  });
  it.each(['front', 'left', 'right'])('offers a valid %s inspection view without changing the puzzle', side => {
    const s = seed(), view = walk.inspectLanding(s, side); expect(walk.canManipulateLanding(view)).toBe(true); expect(view.landing).toEqual(s.landing);
    expect(walk.movePlayer(view.player, 'forward', 10, -1).z).toBeGreaterThanOrEqual(1.5);
  });
  it('bounds lifts, ignores invalid indices and preserves earned progress and notes', () => {
    const s = seed({ notes: { landing: 'Follow the shadow.' }, landing: { completed: [0] } });
    expect(walk.setLandingHeight(s, 0, 99).landing.heights[0]).toBe(3.2); expect(walk.setLandingHeight(s, 0, -1).landing.heights[0]).toBe(0.55); expect(walk.setLandingHeight(s, 0, NaN).landing.heights).toEqual(s.landing.heights);
    expect(walk.setLandingHeight(s, 7, 2)).toEqual(s); const after = walk.nextLanding(s); expect(after.notes).toEqual(s.notes); expect(after.landing.completed).toEqual([0]);
  });
});

describe('shadow landing controls', () => {
  it('provides a bounded light slider and restores only the light direction', async () => {
    await mount({ landing: { heights: [1.5, 2.4, 2.1], selected: 2, lightAngle: 7, completed: [0] }, notes: { landing: 'Keep this observation.' } });
    const before = latest.perceptionWalk, slider = query('[data-walk-landing-light]'), sceneBefore = viewer.push.mock.lastCall[0];
    expect(sceneBefore.landingLightAngle).toBe(7); viewer.push.mockClear();
    expect(slider.type).toBe('range'); expect(slider.min).toBe('-25'); expect(slider.max).toBe('25'); expect(slider.step).toBe('1');
    slider.focus();
    await act(async () => slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    // jsdom has no native slider keyboard stepping; deliver the resulting input event.
    await input('[data-walk-landing-light]', 8);
    await act(async () => slider.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true })));
    expect(latest.perceptionWalk.landing).toEqual({ ...before.landing, lightAngle: 8 }); expect(latest.perceptionWalk.player).toEqual(before.player);
    expect(viewer.push).toHaveBeenCalled(); expect(viewer.push.mock.lastCall[0]).toMatchObject({ landingLightAngle: 8, landingHeights: before.landing.heights, sig: sceneBefore.sig });
    await click('[data-walk-landing-light-reset]'); expect(latest.perceptionWalk.landing).toEqual({ ...before.landing, lightAngle: 0 }); expect(latest.perceptionWalk.notes).toEqual(before.notes); expect(latest.otherTool.preserved).toBe(37);
    expect(viewer.push.mock.lastCall[0]).toMatchObject({ landingLightAngle: 0, sig: sceneBefore.sig });
  });
  it('supports selection, coarse and fine controls and slider changes', async () => {
    await mount(); await click('[data-walk-landing-piece="1"]'); await input('[data-walk-landing-height]', 2); await click('[data-walk-landing-up]'); expect(latest.perceptionWalk.landing.heights).toEqual([2.6, 2.1, 2.9]);
    await click('[data-walk-precision]'); await click('[data-walk-landing-down]'); expect(latest.perceptionWalk.landing.heights[1]).toBeCloseTo(2.075); expect(latest.otherTool.preserved).toBe(37);
  });
  it('direct sphere dragging lifts only the selected sphere and cancellation ends interaction', async () => {
    await mount(); const p = latest.perceptionWalk.player; await pointer('pointerdown', 100, 100); await pointer('pointermove', 100, 70); expect(latest.perceptionWalk.landing.heights).toEqual([2.6, 1.3, 2.9]); expect(latest.perceptionWalk.player).toEqual(p);
    await pointer('pointercancel', 100, 70); await pointer('pointermove', 100, 40); expect(latest.perceptionWalk.landing.heights[1]).toBe(1.3);
  });
  it('keeps vertical touch gestures for page scrolling and supports horizontal lifting', async () => {
    await mount(); await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 101, 40, 'touch'); expect(latest.perceptionWalk.landing.heights[1]).toBe(1); await pointer('pointercancel', 101, 40, 'touch');
    await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 140, 102, 'touch'); expect(latest.perceptionWalk.landing.heights[1]).toBe(1.4);
  });
  it('completes both arrangements, preserves earned solves on reveal, and resets only this room', async () => {
    await mount({ notes: { landing: 'My observation.' }, progress: { ring: { solved: true } } });
    for (const round of [0, 1]) { for (const [index, height] of solution(round).entries()) { await click('[data-walk-landing-piece="' + index + '"]'); await input('[data-walk-landing-height]', height); } await click('[data-walk-check]'); if (!round) await click('[data-walk-landing-next]'); }
    expect(latest.perceptionWalk.progress.landing.solved).toBe(true); await click('[data-walk-reveal]'); expect(latest.perceptionWalk.progress.landing.assisted).toBe(false);
    await input('[data-walk-landing-light]', -25); await click('[data-walk-reset]'); expect(latest.perceptionWalk.landing.completed).toEqual([]); expect(latest.perceptionWalk.landing.lightAngle).toBe(0); expect(latest.perceptionWalk.notes.landing).toBe('My observation.'); expect(latest.perceptionWalk.progress.ring.solved).toBe(true);
  });
  it('keeps revealed practice distinct and enables the next arrangement', async () => {
    await mount({ landing: { heights: solution(0) } }); await click('[data-walk-reveal]'); await click('[data-walk-check]'); expect(latest.perceptionWalk.landing.completed).toEqual([]); expect(latest.perceptionWalk.progress.landing.assisted).toBe(true); expect(query('[data-walk-landing-next]').disabled).toBe(false);
  });
  it.each(['front', 'left', 'right'])('renders a finite %s plan with geometry and reveal guides', async side => {
    await mount(); await click('[data-walk-landing-view="' + side + '"]'); await click('[data-walk-diagram-toggle]'); const plan = query('[data-walk-landing-plan]'); expect(plan).toBeTruthy(); expect(plan.outerHTML).not.toMatch(/NaN|Infinity/); expect(plan.querySelectorAll('circle')).toHaveLength(3);
    await click('[data-walk-reveal]'); expect(query('[data-walk-landing-guides]').querySelectorAll('line')).toHaveLength(9);
    const old = plan.innerHTML; await input('[data-walk-landing-height]', 0.55); expect(plan.innerHTML).not.toBe(old);
    const lifted = plan.innerHTML; await input('[data-walk-landing-light]', 25); expect(plan.innerHTML).not.toBe(lifted); expect(plan.outerHTML).not.toMatch(/NaN|Infinity/); expect(query('[data-walk-landing-guides]').querySelectorAll('line')).toHaveLength(9);
  });
});
