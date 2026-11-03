import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const L = require('../stem_lab/kitchen_studio/kitchen_studio_lid.js');
const initial = (open = false, unit = 1) => L.begin({ x: 150, y: 90 }, { open, unit });
const at = (trace, dx = 0, dy = 0) => L.move(trace, { x: trace.start.x + dx * trace.unit, y: trace.start.y + dy * trace.unit });
const partial = trace => expect(L.finish(trace)).toMatchObject({ complete: false, action: null });

describe('View-only container lid gesture', () => {
  it('exports the same pure API to the browser and CommonJS', () => {
    const source = readFileSync(require.resolve('../stem_lab/kitchen_studio/kitchen_studio_lid.js'), 'utf8');
    const browser = { window: {} };
    runInNewContext(source, browser);
    expect(Object.keys(browser.window.KitchenStudioLid).sort()).toEqual(['begin', 'finish', 'move', 'progress']);
    const hybrid = { window: {}, module: { exports: {} } };
    runInNewContext(source, hybrid);
    expect(hybrid.window.KitchenStudioLid).toBe(hybrid.module.exports);
  });

  it('defaults to a closed lid, with no movement or accepted tap', () => {
    const trace = L.begin({ x: 10, y: 20 });
    expect(trace).toEqual({ start: { x: 10, y: 20 }, current: { x: 10, y: 20 }, unit: 1, initialOpen: false, opening: 0, phase: 'adjust', invalid: false });
    expect(L.progress(trace)).toBe(0);
    partial(trace); partial(L.move(trace, { x: 10, y: 20 }));
    expect(L.begin({ x: 0, y: 0 }, null).unit).toBe(1);
  });

  it.each([false, true])('starts from the current open state %s', open => {
    const trace = initial(open);
    expect(trace.initialOpen).toBe(open);
    expect(trace.opening).toBe(open ? 1 : 0);
    partial(trace);
  });

  it.each([.1, .5, 1, 2, 8])('uses normalized pointer travel with clamped unit %s', unit => {
    for (const open of [false, true]) {
      const trace = initial(open, unit), direction = open ? 1 : -1;
      expect(trace.unit).toBe(Math.max(.5, Math.min(2, unit)));
      partial(at(trace, 0, direction * 23.99));
      const ready = at(trace, 0, direction * 24);
      expect(ready.phase).toBe('ready'); expect(L.progress(ready)).toBe(1);
      expect(L.finish(ready)).toMatchObject({ complete: true, action: null, view: 'lids', open: !open });
    }
  });

  it('previews a continuous lift, and clamps the lid opening at both ends', () => {
    const trace = initial();
    expect(at(trace, 0, -13).opening).toBeCloseTo(.2);
    expect(at(trace, 0, -32.5).opening).toBeCloseTo(.5);
    expect(at(trace, 0, -65).opening).toBe(1);
    expect(at(trace, 0, -300).opening).toBe(1);
    expect(at(trace, 0, 65).opening).toBe(0);
    partial(at(trace, 0, 65));
  });

  it('previews lowering an open lid, without interpreting upward travel as closing', () => {
    const trace = initial(true);
    expect(at(trace, 0, 13).opening).toBeCloseTo(.8);
    expect(at(trace, 0, 65).opening).toBe(0);
    expect(at(trace, 0, 300).opening).toBe(0);
    expect(at(trace, 0, -65).opening).toBe(1);
    partial(at(trace, 0, -65));
  });

  it.each([false, true])('requires the current pointer to retain the release threshold from state %s', open => {
    const trace = initial(open), direction = open ? 1 : -1;
    const ready = at(trace, 0, direction * 30);
    expect(L.finish(ready).complete).toBe(true);
    const back = at(ready, 0, direction * 12);
    expect(back.phase).toBe('adjust'); expect(L.progress(back)).toBe(.5); partial(back);
    const returned = at(back, 0, 0);
    expect(returned.opening).toBe(open ? 1 : 0); expect(L.progress(returned)).toBe(0); partial(returned);
  });

  it.each([-55, 55])('permits sideways contact exactly at %s normalized units', dx => {
    const trace = at(initial(), dx, -24);
    expect(trace.invalid).toBe(false); expect(L.finish(trace).complete).toBe(true);
  });

  it.each([-55.01, 55.01])('permanently loses contact beyond %s sideways units', dx => {
    const trace = at(initial(), dx, -30);
    expect(trace).toMatchObject({ invalid: true, phase: 'retry' });
    expect(L.progress(trace)).toBe(0); partial(trace);
    const back = at(trace, 0, -65);
    expect(back).toEqual(trace); expect(back).not.toBe(trace); partial(back);
    expect(L.finish(back).message).toMatch(/Contact lost/);
  });

  it('never produces a storage action, including complete open and close gestures', () => {
    for (const open of [false, true]) for (const dy of [-100, -24, 0, 24, 100]) {
      const result = L.finish(at(initial(open), 0, dy));
      expect(result.action).toBeNull();
      if (result.complete) { expect(result.view).toBe('lids'); expect(result.open).toBe(!open); }
      else expect(result.view).toBeUndefined();
    }
  });

  it.each([false, true])('describes lifting or lowering from state %s', open => {
    expect(L.finish(initial(open)).message).toMatch(open ? /Lower the lid/ : /Lift the lid/);
    expect(L.finish(at(initial(open), 0, open ? 24 : -24)).message).toMatch(open ? /close the lid/ : /leave the lid open/);
  });

  it('does not mutate inputs or share nested points between states', () => {
    const point = Object.freeze({ x: 150, y: 90 }), options = Object.freeze({ open: false, unit: 1 });
    const trace = L.begin(point, options);
    Object.freeze(trace.start); Object.freeze(trace.current); Object.freeze(trace);
    const end = Object.freeze({ x: 160, y: 60 });
    const next = L.move(trace, end);
    expect(trace.current).toEqual(point); expect(next.start).not.toBe(trace.start); expect(next.current).not.toBe(end);
    expect(next.start).not.toBe(point); expect(trace.start).not.toBe(point); expect(trace.current).not.toBe(point);
    expect(next).toMatchObject({ opening: 30 / 65, phase: 'ready' });
    const before = JSON.stringify(next); L.finish(next); L.progress(next); expect(JSON.stringify(next)).toBe(before);
  });

  it.each([null, undefined, {}, { x: '1', y: 0 }, { x: 0, y: NaN }, { x: Infinity, y: 0 }, { x: 0, y: -Infinity }])('rejects an invalid starting point %j', point => {
    expect(L.begin(point)).toBeNull();
  });

  it.each([0, -1, NaN, Infinity, '1', null, undefined])('rejects an explicitly invalid unit %s', unit => {
    expect(L.begin({ x: 0, y: 0 }, { unit })).toBeNull();
  });

  it.each([0, 1, 'true', null, undefined])('rejects an explicitly invalid open preference %s', open => {
    expect(L.begin({ x: 0, y: 0 }, { open })).toBeNull();
  });

  it.each([true, 1, 'options', []])('rejects malformed options %j', options => {
    expect(L.begin({ x: 0, y: 0 }, options)).toBeNull();
  });

  it.each([null, {}, { x: 0, y: NaN }, { x: Infinity, y: 0 }, { x: 0, y: '1' }])('fails closed and stays cancelled after invalid movement %j', point => {
    const trace = initial(), bad = L.move(trace, point);
    expect(bad).toMatchObject({ invalid: true, phase: 'retry', opening: 0 });
    expect(trace.invalid).toBe(false); expect(bad.start).not.toBe(trace.start);
    expect(L.progress(bad)).toBe(0); partial(bad); partial(at(bad, 0, -65));
  });

  it('rejects normalized travel overflow rather than accepting an infinite gesture', () => {
    const trace = L.begin({ x: 0, y: -1e308 });
    const bad = L.move(trace, { x: 0, y: 1e308 });
    expect(bad.invalid).toBe(true); expect(L.progress(bad)).toBe(0); partial(bad);
  });

  it.each([null, undefined, {}, false, { phase: 'ready', initialOpen: false, invalid: false }])('fails closed for missing or malformed state %j', trace => {
    expect(L.move(trace, { x: 0, y: 0 })).toBeNull(); expect(L.progress(trace)).toBe(0); partial(trace);
  });
});
