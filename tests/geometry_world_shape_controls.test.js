import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8').replace(/\r\n/g, '\n');
const shapeStart = source.indexOf('  var BLOCK_SHAPES =');
const shapes = new Function(source.slice(shapeStart, source.indexOf('\n  ];', shapeStart) + 5) + '\nreturn BLOCK_SHAPES;')();
const actionStart = source.indexOf('      function setBuildShape(');
const actionBody = source.slice(actionStart, source.indexOf('\n      var homeLang', actionStart));

function fixture(initial = {}) {
  vi.useFakeTimers();
  const engine = { _placeState: { selectedBlock: 6, selectedShape: 1, blockRotation: 3, collabMode: true, ...initial } };
  const updates = [];
  const ref = { current: { timer: null, feedback: '' } };
  const apply = (key, value) => {
    const patch = typeof key === 'object' ? key : { [key]: value };
    updates.push(patch);
    if ('actionFeedback' in patch) ref.current.feedback = patch.actionFeedback;
  };
  const ctx = { update: (_bucket, key, value) => apply(key, value), updateMulti: (_bucket, patch) => apply(patch) };
  const publishStart = source.indexOf('      var upd = function (key, val) {');
  const publishBody = source.slice(publishStart, source.indexOf('      var callGemini', publishStart));
  const upd = new Function('ctx', 'shapeActionRef', publishBody + '\nreturn upd;')(ctx, ref);
  const setBuildShape = new Function('window', 'engineKey', 'selectedShape', 'blockRotation', 'BLOCK_SHAPES', 'shapeActionRef', 'upd',
    actionBody + '\nreturn setBuildShape;')({ testEngine: engine }, 'testEngine', 0, 0, shapes, ref, upd);
  const keyStart = source.indexOf("            case 'KeyQ':");
  const cases = source.slice(keyStart, source.indexOf("            case 'KeyT':", keyStart));
  const key = new Function('setBuildShape', 'ev', 'switch(ev.code) {\n' + cases + '\n}').bind(null, setBuildShape);
  return { engine, ref, updates, setBuildShape, key, publish: upd };
}

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('Geometry World shared shape commands', () => {
  it.each([0, 1, 2, 3])('selecting shape %i starts at zero degrees without changing material or collaboration', index => {
    const f = fixture();
    f.setBuildShape('select', index);
    expect(f.engine._placeState).toEqual({ selectedBlock: 6, selectedShape: index, blockRotation: 0, collabMode: true });
    expect(f.updates[0].actionFeedback).toBe(shapes[index].name + (index ? ' · 0°' : ''));
  });

  it('Q and choosing the next shape produce the same orientation and announcement', () => {
    const f = fixture(); f.key({ code: 'KeyQ' });
    const keyboard = { ...f.engine._placeState }, feedback = f.ref.current.feedback;
    f.engine._placeState = { selectedBlock: 6, selectedShape: 1, blockRotation: 3, collabMode: true };
    f.setBuildShape('select', 2);
    expect(f.engine._placeState).toEqual(keyboard);
    expect(f.ref.current.feedback).toBe(feedback);
  });

  it('rapid rotation commands read live state before any component render and wrap at 360 degrees', () => {
    const f = fixture({ selectedShape: 3, blockRotation: 0 });
    [90, 180, 270, 0].forEach(degrees => {
      f.key({ code: 'KeyR' });
      expect(f.engine._placeState.blockRotation * 90).toBe(degrees);
      expect(f.ref.current.feedback).toBe('Quarter wedge · ' + degrees + '°');
    });
    expect(f.engine._placeState.selectedBlock).toBe(6);
  });

  it('rapid Q commands cycle every shape and wrap without stale React state', () => {
    const f = fixture({ selectedShape: 0, blockRotation: 0 });
    [1, 2, 3, 0].forEach(index => {
      f.key({ code: 'KeyQ' });
      expect(f.engine._placeState.selectedShape).toBe(index);
      expect(f.engine._placeState.blockRotation).toBe(0);
    });
  });

  it('R on a cube has no hidden rotation or misleading angle announcement', () => {
    const f = fixture({ selectedShape: 0, blockRotation: 0 });
    f.key({ code: 'KeyR' });
    expect(f.updates).toHaveLength(0);
    expect(f.engine._placeState.blockRotation).toBe(0);
  });

  it('a newer shape cue receives its full display time', () => {
    const f = fixture(); f.setBuildShape('select', 2);
    vi.advanceTimersByTime(1000);
    f.setBuildShape('rotate');
    vi.advanceTimersByTime(800);
    expect(f.ref.current.feedback).toBe('Half (horizontal) · 90°');
    vi.advanceTimersByTime(1000);
    expect(f.ref.current.feedback).toBe('');
    expect(f.ref.current.timer).toBeNull();
  });

  it('the shape cue timeout does not clear subsequent measurement feedback', () => {
    const f = fixture(); f.setBuildShape('select', 3);
    f.ref.current.feedback = 'Measured: 12 cubic units';
    vi.advanceTimersByTime(1800);
    expect(f.ref.current.feedback).toBe('Measured: 12 cubic units');
    expect(f.updates).toHaveLength(1);
  });
});


describe('Geometry World feedback ownership and native Space', () => {
  it('an older ruler expiry cannot erase a newly selected shape', () => {
    const f = fixture();
    f.publish('actionFeedback', 'Ruler: point A set');
    setTimeout(() => f.publish('actionFeedback', ''), 2000);
    vi.advanceTimersByTime(1900);
    f.setBuildShape('select', 3);
    vi.advanceTimersByTime(100);
    expect(f.ref.current.feedback).toBe('Quarter wedge · 0°');
    vi.advanceTimersByTime(1700);
    expect(f.ref.current.feedback).toBe('');
  });

  it('a later non-shape message can replace the cue and expire normally', () => {
    const f = fixture(); f.setBuildShape('select', 3);
    f.publish('actionFeedback', 'Measured: 12 cubic units');
    f.publish('actionFeedback', '');
    expect(f.ref.current.feedback).toBe('');
  });

  function space(target, repeat = false) {
    const engine = { velocity: { y: 0 }, onGround: true, flyMode: false, moveState: {} };
    const ev = new KeyboardEvent('keydown', { code: 'Space', key: ' ', cancelable: true, repeat });
    Object.defineProperty(ev, 'target', { value: target });
    const start = source.indexOf("            case 'Space':");
    const branch = source.slice(start, source.indexOf("            case 'KeyF':", start));
    new Function('engine', 'ev', 'upd', 'addToast', 'sfxJump', 'switch(ev.code) {\n' + branch + '\n}')(engine, ev, () => {}, null, () => {});
    return { engine, ev };
  }

  it.each(['button', 'select', 'link', 'role-button', 'button-child'])('Space on %s stays available to the control and does not jump', kind => {
    const node = document.createElement(kind === 'select' ? 'select' : kind === 'link' ? 'a' : kind === 'role-button' ? 'div' : 'button');
    if (kind === 'link') node.href = '#';
    if (kind === 'role-button') node.setAttribute('role', 'button');
    let target = node;
    if (kind === 'button-child') { target = document.createElement('span'); node.appendChild(target); }
    const f = space(target);
    expect(f.ev.defaultPrevented).toBe(false);
    expect(f.engine.velocity.y).toBe(0);
    expect(f.engine._lastSpaceTime).toBeUndefined();
    expect(f.engine._jumpLock).toBeUndefined();
  });

  it('Space on the world still jumps and prevents page scrolling', () => {
    const f = space(document.createElement('div'));
    expect(f.ev.defaultPrevented).toBe(true);
    expect(f.engine.velocity.y).toBe(6);
    expect(f.engine._jumpLock).toBe(true);
  });
});
