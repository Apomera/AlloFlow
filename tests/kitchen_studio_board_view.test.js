import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const BoardView = require('../stem_lab/kitchen_studio/kitchen_studio_board_view.js');
const mounted = [];
const keys = ['enabled', 'enableRotate', 'enableZoom', 'enablePan', 'enableDamping', 'dampingFactor', 'autoRotate', 'minDistance', 'maxDistance', 'minPolarAngle', 'maxPolarAngle', 'minAzimuthAngle', 'maxAzimuthAngle'];

function fixture(aspect = 16 / 9) {
  document.body.innerHTML = `<canvas id="boardCanvas"></canvas><section id="studioBoardView" hidden>
    <button type="button" id="studioBoardOpen" aria-expanded="false">Work closer at board</button>
    <div id="studioBoardPanel" hidden><label for="studioBoardAngle" id="studioBoardAngleLabel">Angle</label>
    <input id="studioBoardAngle" type="range" min="0" max="100" value="65">
    <p id="studioBoardReadout" aria-live="polite"></p><button type="button" id="studioBoardClose">Return to kitchen</button></div></section>`;
  const camera = new THREE.PerspectiveCamera(42, aspect, .23, 345);
  camera.position.set(7, 8, 9); camera.zoom = 1.3; camera.updateProjectionMatrix();
  const controls = {
    target: new THREE.Vector3(.4, 1.3, -.2), enabled: true, enableRotate: true, enableZoom: true, enablePan: false,
    enableDamping: false, dampingFactor: .13, autoRotate: false, minDistance: .9, maxDistance: 21,
    minPolarAngle: .15, maxPolarAngle: 1.4, minAzimuthAngle: -.7, maxAzimuthAngle: .8,
    update: vi.fn(() => { camera.lookAt(controls.target); camera.updateMatrixWorld(true); })
  };
  controls.update();
  const canvas = document.getElementById('boardCanvas');
  const host = { THREE, camera, controls, canvas, cancel: vi.fn(), draw: vi.fn(), onViewChange: vi.fn() };
  const view = BoardView.mount(host); mounted.push(view);
  const values = { secure: false, claw: false, cut: null }, state = { active: true, visible: true, values, historical: false, revision: 'attempt:0' };
  view.update(state);
  return { view, host, camera, controls, canvas, state, values,
    opener: document.getElementById('studioBoardOpen'), closer: document.getElementById('studioBoardClose'),
    panel: document.getElementById('studioBoardPanel'), section: document.getElementById('studioBoardView'),
    angle: document.getElementById('studioBoardAngle'), readout: document.getElementById('studioBoardReadout') };
}
function snapshot(f) {
  return { position: f.camera.position.toArray(), quaternion: f.camera.quaternion.toArray(), zoom: f.camera.zoom,
    up: f.camera.up.toArray(), fov: f.camera.fov, near: f.camera.near, far: f.camera.far,
    target: f.controls.target.toArray(), controls: Object.fromEntries(keys.map(k => [k, f.controls[k]])) };
}
function input(f, value) { f.angle.value = String(value); f.angle.dispatchEvent(new Event('input', { bubbles: true })); }
function assertBoardFits(camera) {
  camera.updateMatrixWorld(true);
  const footprints = [
    [-.54, .54, 1.35, -.40, .40], [-.50, .50, 1.565, -.36, .36],
    [.25, .61, 1.47, .41, .63], [-.38, .03, 1.655, .0, .56],
    [-.22, .43, 1.67, -.29, .04]
  ];
  for (const [left, right, y, back, front] of footprints) {
    for (const x of [left, right]) for (const z of [back, front]) {
      const p = new THREE.Vector3(x - 1.5, y, z - .85).project(camera);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(.860001);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(.820001);
      expect(p.z).toBeGreaterThan(-1); expect(p.z).toBeLessThan(1);
    }
  }
}
afterEach(() => { mounted.splice(0).forEach(v => v.dispose()); vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('Kitchen cutting-board working view', () => {
  it('opens only at the visible board and exposes its expanded state', () => {
    const f = fixture();
    for (const patch of [{ active: false }, { active: true, visible: false }]) {
      f.view.update(patch); f.view.open(); expect(f.view.isOpen()).toBe(false); expect(f.section.hidden).toBe(true);
    }
    f.view.update({ visible: true }); f.opener.click();
    expect(f.view.isOpen()).toBe(true); expect(f.panel.hidden).toBe(false); expect(f.section.hidden).toBe(false);
    expect(f.opener.getAttribute('aria-expanded')).toBe('true'); expect(f.host.onViewChange).toHaveBeenLastCalledWith(true);
  });
  it.each([16 / 9, 360 / 600, 320 / 500, 2.4])('fits the board, mat, hand and raised blade at aspect %s', aspect => {
    const f = fixture(aspect); f.view.open();
    for (const angle of [0, 1, 25, 50, 65, 75, 99, 100]) { input(f, angle); assertBoardFits(f.camera); }
    expect(f.canvas.dataset.boardInspection).toBe('true'); expect(f.canvas.dataset.boardViewAngle).toBe('100');
    expect(f.angle.getAttribute('aria-valuetext')).toBe('Above the board');
    expect(Number(f.canvas.dataset.boardViewZoom)).toBeGreaterThan(0);
  });
  it('cancels held movement before saving the original camera', () => {
    const f = fixture(); let original;
    f.host.cancel.mockImplementationOnce(() => { f.camera.position.set(-4, 5, 6); f.controls.target.set(.1, .2, .3); f.controls.update(); original = snapshot(f); });
    f.view.open(); expect(f.host.cancel).toHaveBeenCalledTimes(1); f.view.close(); expect(snapshot(f)).toEqual(original);
  });
  it('restores camera and control limits once, despite repeated opening and angle edits', () => {
    const f = fixture(), original = snapshot(f);
    f.view.open(); input(f, 0); f.view.open(); input(f, 100); f.view.close();
    expect(snapshot(f)).toEqual(original); expect(f.host.onViewChange.mock.calls).toEqual([[true], [false]]);
    const cancels = f.host.cancel.mock.calls.length, draws = f.host.draw.mock.calls.length;
    f.view.close(); expect(f.host.cancel).toHaveBeenCalledTimes(cancels); expect(f.host.draw).toHaveBeenCalledTimes(draws);
  });
  it('refits a resized canvas without losing the previous room camera', () => {
    const f = fixture(), original = snapshot(f); f.view.open(); input(f, 30);
    f.camera.aspect = 320 / 600; f.camera.updateProjectionMatrix(); f.host.cancel.mockClear(); f.view.resize();
    expect(f.host.cancel).toHaveBeenCalledTimes(1); expect(f.view.isOpen()).toBe(true); assertBoardFits(f.camera);
    f.view.close(); expect(snapshot(f)).toEqual(original); expect(f.camera.aspect).toBe(320 / 600);
  });
  it('cancels an in-progress gesture before changing the angle', () => {
    const f = fixture(); f.view.open(); f.host.cancel.mockClear(); input(f, 0);
    expect(f.host.cancel).toHaveBeenCalledTimes(1); expect(f.angle.getAttribute('aria-valuetext')).toBe('Counter view');
    expect(f.values).toEqual({ secure: false, claw: false, cut: null });
  });
  it.each([
    [{ secure: false, claw: false, cut: null }, ['Mat beside the board', 'Fingers extended', 'Whole carrot']],
    [{ secure: true, claw: true, cut: 'even' }, ['Nonslip mat under the board', 'Fingertips tucked in a claw grip', 'Uniform small dice']],
    [{ secure: true, claw: false, cut: 'large' }, ['Nonslip mat under the board', 'Fingers extended', 'Uniform large dice']],
    [{ secure: false, claw: true, cut: 'uneven' }, ['Mat beside the board', 'Fingertips tucked in a claw grip', 'Mixed-size pieces']]
  ])('describes the displayed board without guessing a verdict: %j', (values, terms) => {
    const f = fixture(); f.view.update({ values: Object.freeze(values) }); f.view.open();
    expect(f.readout.textContent).toMatch(/^Board:/); for (const term of terms) expect(f.readout.textContent).toContain(term);
    expect(f.readout.textContent).not.toMatch(/safe|correct|success|fail/i);
  });
  it('inspects recorded states without modifying evidence or disabling the camera', () => {
    const f = fixture(), recorded = Object.freeze({ secure: true, claw: true, cut: 'large' });
    f.view.update({ historical: true, values: recorded, revision: 'replay:2' }); f.opener.click(); input(f, 25);
    expect(f.readout.textContent).toMatch(/^Recorded board:/); expect(f.readout.textContent).toContain('Uniform large dice');
    expect(f.opener.disabled).toBe(false); expect(f.angle.disabled).toBe(false); expect(recorded).toEqual({ secure: true, claw: true, cut: 'large' });
  });
  it('cancels stale movement when the visible revision changes and retains the close-up', () => {
    const f = fixture(); f.view.open(); f.host.cancel.mockClear();
    f.view.update({ values: { secure: true, claw: true, cut: null }, revision: 'attempt:1' });
    expect(f.host.cancel).toHaveBeenCalledTimes(1); expect(f.view.isOpen()).toBe(true); expect(f.readout.textContent).toContain('Fingertips tucked');
    f.host.cancel.mockClear(); f.view.update({ revision: 'attempt:1' }); expect(f.host.cancel).not.toHaveBeenCalled();
  });
  it.each([{ active: false }, { visible: false }])('restores the previous camera when %j', patch => {
    const f = fixture(), original = snapshot(f); f.view.open(); f.view.update(patch);
    expect(f.panel.hidden).toBe(true); expect(f.section.hidden).toBe(true); expect(snapshot(f)).toEqual(original);
  });
  it('lets the held gesture consume first Escape, then returns focus on second Escape', () => {
    const f = fixture(); f.view.open(); f.angle.focus();
    const consumed = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); consumed.preventDefault(); document.dispatchEvent(consumed);
    expect(f.view.isOpen()).toBe(true); expect(document.activeElement).toBe(f.angle);
    const close = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); document.dispatchEvent(close);
    expect(close.defaultPrevented).toBe(true); expect(f.view.isOpen()).toBe(false); expect(document.activeElement).toBe(f.opener);
  });
  it('returns focus from the visible close button', () => {
    const f = fixture(); f.view.open(); f.closer.click(); expect(f.view.isOpen()).toBe(false); expect(document.activeElement).toBe(f.opener);
  });
  it.each(['visibilitychange', 'pagehide'])('restores the camera on %s', event => {
    const f = fixture(), original = snapshot(f); f.view.open();
    if (event === 'visibilitychange') { vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); document.dispatchEvent(new Event(event)); }
    else window.dispatchEvent(new Event(event));
    expect(f.view.isOpen()).toBe(false); expect(snapshot(f)).toEqual(original);
  });
  it('disposes its listeners and prevents further camera edits', () => {
    const f = fixture(), original = snapshot(f); f.view.open(); f.view.dispose(); expect(snapshot(f)).toEqual(original);
    f.host.cancel.mockClear(); f.host.draw.mockClear(); f.host.onViewChange.mockClear();
    f.opener.click(); f.closer.click(); input(f, 100); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    f.view.open(); f.view.update({ active: true }); f.view.resize(); f.view.dispose();
    expect(snapshot(f)).toEqual(original); expect(f.host.cancel).not.toHaveBeenCalled(); expect(f.host.draw).not.toHaveBeenCalled(); expect(f.host.onViewChange).not.toHaveBeenCalled();
  });
});
