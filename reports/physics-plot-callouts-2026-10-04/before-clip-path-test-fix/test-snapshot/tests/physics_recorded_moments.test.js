import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let P;
beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  P = window.StemLab._physics;
  expect(typeof P.recordedMoments).toBe('function');
});

const point = body => ({ mX: body.mX, mY: body.mY, mVx: body.mVx, mVy: body.mVy, t: body.t });

function recorded({ angle = 35, velocity = 30, gravity = 9.8, mass = 2, height = 10, drag = false } = {}, ticks = Infinity) {
  const body = {
    mX: 0, mY: height, mVx: velocity * Math.cos(angle * Math.PI / 180),
    mVy: velocity * Math.sin(angle * Math.PI / 180), grav: gravity,
    drag: drag ? P.DRAG_K : 0, mass, t: 0,
  };
  const trail = [point(body)];
  trail.parameters = Object.freeze({ angle, velocity, gravity, mass, launchHeight: height, drag });
  trail.modelVersion = P.MODEL_VERSION;
  trail.run = 7;
  for (let step = 0; !body.landed && step < ticks && step < 10000; step++) {
    P.step(body, P.DT);
    P.recordSample(trail, body);
  }
  if (ticks === Infinity) expect(body.landed).toBe(true);
  if (body.apex) trail.apex = Object.freeze({
    tSec: body.apex.t, mX: body.apex.mX, mY: body.apex.mY, vx: body.apex.mVx,
  });
  return { body, trail };
}

function canonicalIndex(trail) {
  const matches = trail.map((sample, index) => ({ sample, index })).filter(({ sample }) =>
    sample.t === trail.apex.tSec && sample.mX === trail.apex.mX &&
    sample.mY === trail.apex.mY && sample.mVx === trail.apex.vx && sample.mVy === 0);
  expect(matches).toHaveLength(1);
  return matches[0].index;
}

function highestSupported(trail) {
  const valid = trail.map((sample, index) => ({ sample, index })).filter(({ index }) => P.inspectSample(trail, index));
  expect(valid.length).toBeGreaterThan(0);
  return valid.reduce((highest, next) => next.sample.mY > highest.sample.mY ? next : highest).index;
}

function unchangedMoments(trail, body) {
  const before = structuredClone({ trail, body });
  const moments = P.recordedMoments(trail);
  expect({ trail, body }).toEqual(before);
  if (moments !== null) {
    expect(Object.isFrozen(moments)).toBe(true);
    expect(Object.keys(moments).sort()).toEqual(['apexIndex', 'highestIndex', 'impact', 'latestIndex', 'launchIndex']);
    const captured = { ...moments };
    expect(Reflect.set(moments, 'latestIndex', -100)).toBe(false);
    expect(moments).toEqual(captured);
  }
  return moments;
}

describe('moments derived from supported recorded flight evidence', () => {
  it.each([
    ['ordinary vacuum', { drag: false }],
    ['ordinary drag', { drag: true }],
    ['short vacuum', { angle: 5, velocity: 5, gravity: 25, height: 0, drag: false }],
    ['short drag', { angle: 5, velocity: 5, gravity: 25, height: 0, drag: true }],
  ])('%s identifies launch, canonical apex, and actual impact without changing evidence', (name, settings) => {
    const { body, trail } = recorded(settings), apex = canonicalIndex(trail);
    expect(unchangedMoments(trail, body)).toEqual({
      launchIndex: 0, highestIndex: apex, apexIndex: apex, latestIndex: trail.length - 1, impact: true,
    });
    expect(P.inspectSample(trail, apex)).toMatchObject({ apex: true, phase: 'apex', vy: 0 });
    expect(trail[apex]).toEqual(point(body.apex));
    if (name.startsWith('short')) {
      expect(trail).toHaveLength(3);
      expect(apex).toBe(1);
      expect(trail.at(-1).t).toBeLessThan(P.DT);
      expect(trail[apex].mY).toBeGreaterThan(0);
    } else expect(trail.length).toBeGreaterThan(80);
  });

  it.each([false, true])('horizontal flight with drag=%s reuses release as the canonical apex', drag => {
    const { body, trail } = recorded({ angle: 0, velocity: 15, height: 10, drag });
    expect(canonicalIndex(trail)).toBe(0);
    expect(trail.filter(sample => sample.t === 0)).toHaveLength(1);
    expect(unchangedMoments(trail, body)).toEqual({
      launchIndex: 0, highestIndex: 0, apexIndex: 0, latestIndex: trail.length - 1, impact: true,
    });
  });

  it.each([0, 35])('a paused %s-degree launch has one observation and no resolved apex', angle => {
    const { body, trail } = recorded({ angle, velocity: 15, height: 10 }, 0);
    expect(trail).toHaveLength(1);
    expect(trail.apex).toBeUndefined();
    expect(body.t).toBe(0);
    expect(unchangedMoments(trail, body)).toEqual({
      launchIndex: 0, highestIndex: 0, apexIndex: -1, latestIndex: 0, impact: false,
    });
  });

  it.each([false, true])('unfinished ascent with drag=%s exposes the latest supported height without an apex or impact', drag => {
    const { body, trail } = recorded({ drag }, 3);
    expect(body.mVy).toBeGreaterThan(0);
    expect(trail.apex).toBeUndefined();
    expect(unchangedMoments(trail, body)).toEqual({
      launchIndex: 0, highestIndex: trail.length - 1, apexIndex: -1, latestIndex: trail.length - 1, impact: false,
    });
  });

  it('keeps the resolved apex during an unfinished descent without claiming an impact', () => {
    const { body, trail } = recorded({ drag: true });
    const apex = canonicalIndex(trail);
    trail.splice(apex + 2);
    expect(trail.at(-1).mY).toBeGreaterThan(0);
    expect(trail.at(-1).mVy).toBeLessThan(0);
    expect(unchangedMoments(trail, body)).toEqual({
      launchIndex: 0, highestIndex: apex, apexIndex: apex, latestIndex: apex + 1, impact: false,
    });
  });

  it('falls back to the highest recorded sample when legacy evidence omits the canonical apex', () => {
    const { body, trail } = recorded({ drag: true });
    trail.splice(canonicalIndex(trail), 1);
    expect(trail.some(sample => sample.t === trail.apex.tSec)).toBe(false);
    expect(unchangedMoments(trail, body)).toEqual({
      launchIndex: 0, highestIndex: highestSupported(trail), apexIndex: -1, latestIndex: trail.length - 1, impact: true,
    });
  });

  it('does not label a zero-velocity sample as the canonical apex without matching metadata', () => {
    const { body, trail } = recorded();
    const highest = canonicalIndex(trail);
    delete trail.apex;
    expect(trail[highest].mVy).toBe(0);
    expect(unchangedMoments(trail, body)).toEqual({
      launchIndex: 0, highestIndex: highest, apexIndex: -1, latestIndex: trail.length - 1, impact: true,
    });
  });

  it.each(['tSec', 'mX', 'mY', 'vx'])('requires an exact %s match rather than accepting nearby apex metadata', field => {
    const { body, trail } = recorded();
    const highest = canonicalIndex(trail);
    trail.apex = { ...trail.apex, [field]: trail.apex[field] + 1e-9 };
    expect(unchangedMoments(trail, body)).toEqual({
      launchIndex: 0, highestIndex: highest, apexIndex: -1, latestIndex: trail.length - 1, impact: true,
    });
  });

  it.each([-1e-10, 1e-10])('rejects an apex candidate whose recorded vertical velocity is %s rather than exactly zero', verticalVelocity => {
    const { body, trail } = recorded();
    const highest = canonicalIndex(trail);
    trail[highest].mVy = verticalVelocity;
    expect(P.inspectSample(trail, highest)).not.toBeNull();
    expect(unchangedMoments(trail, body)).toEqual({
      launchIndex: 0, highestIndex: highest, apexIndex: -1, latestIndex: trail.length - 1, impact: true,
    });
  });

  it.each([
    ['null', () => null],
    ['string', () => 'invalid apex'],
    ['array without fields', () => []],
    ['missing velocity', apex => ({ tSec: apex.tSec, mX: apex.mX, mY: apex.mY })],
    ['non-finite time', apex => ({ ...apex, tSec: NaN })],
    ['non-finite height', apex => ({ ...apex, mY: Infinity })],
  ])('ignores malformed apex metadata: %s', (_name, corrupt) => {
    const { body, trail } = recorded();
    const highest = canonicalIndex(trail);
    trail.apex = corrupt(trail.apex);
    expect(unchangedMoments(trail, body)).toEqual({
      launchIndex: 0, highestIndex: highest, apexIndex: -1, latestIndex: trail.length - 1, impact: true,
    });
  });

  it.each([
    ['missing interior sample', (trail, index) => { trail[index] = null; }],
    ['invalid timestamp on a false maximum', (trail, index) => { trail[index] = { ...trail[index], t: NaN, mY: 1e6 }; }],
    ['overflowing sample with otherwise matching apex metadata', (trail, index) => {
      trail[index].mVx = 1e308;
      trail.apex = { ...trail.apex, vx: 1e308 };
    }],
  ])('finds the highest supported observation when there is a %s', (_name, corrupt) => {
    const { body, trail } = recorded();
    const invalidIndex = canonicalIndex(trail);
    corrupt(trail, invalidIndex);
    expect(P.inspectSample(trail, invalidIndex)).toBeNull();
    const highest = highestSupported(trail);
    expect(highest).not.toBe(invalidIndex);
    expect(unchangedMoments(trail, body)).toEqual({
      launchIndex: 0, highestIndex: highest, apexIndex: -1, latestIndex: trail.length - 1, impact: true,
    });
  });

  it.each([
    ['missing first sample', trail => { trail[0] = null; }],
    ['missing latest sample', trail => { trail[trail.length - 1] = null; }],
    ['invalid first time', trail => { trail[0].t = NaN; }],
    ['overflowing latest energy', trail => { trail[trail.length - 1].mVx = 1e308; }],
  ])('returns null for a %s rather than inferring endpoint moments', (_name, corrupt) => {
    const { body, trail } = recorded();
    corrupt(trail);
    expect(unchangedMoments(trail, body)).toBeNull();
  });

  it.each([
    ['null', null], ['undefined', undefined], ['object', {}], ['string', 'not a trail'], ['empty array', []],
  ])('returns null for an unsupported trail input: %s', (_name, trail) => {
    expect(unchangedMoments(trail)).toBeNull();
  });

  it.each([
    ['missing launch parameters', trail => { delete trail.parameters; }],
    ['unsupported model', trail => { trail.modelVersion = 'unknown-model'; }],
    ['invalid mass', trail => { trail.parameters = { ...trail.parameters, mass: 0 }; }],
    ['invalid drag flag', trail => { trail.parameters = { ...trail.parameters, drag: 'false' }; }],
    ['missing launch height', trail => { trail.parameters = { ...trail.parameters, launchHeight: undefined }; }],
  ])('returns null when endpoint inspection is unsupported: %s', (_name, corrupt) => {
    const { body, trail } = recorded();
    corrupt(trail);
    expect(P.inspectSample(trail, 0)).toBeNull();
    expect(P.inspectSample(trail, trail.length - 1)).toBeNull();
    expect(unchangedMoments(trail, body)).toBeNull();
  });
});
