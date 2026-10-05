import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const hostSource = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
const savers = [];
let P;

function hostBlock(name) {
  const start = hostSource.indexOf('// ' + name + '_START');
  const end = hostSource.indexOf('// ' + name + '_END', start);
  if (start < 0 || end < 0) throw new Error('Missing host helper: ' + name);
  return hostSource.slice(start, end);
}

function autosave() {
  vi.useFakeTimers();
  const win = new EventTarget(), doc = new EventTarget();
  doc.hidden = false;
  let stored = null;
  const storage = {
    getItem: vi.fn(() => stored),
    setItem: vi.fn((_key, value) => { stored = value; }),
  };
  const saver = Function('window', 'document', 'localStorage',
    hostBlock('BEEHIVE_PERSISTENCE_HELPER') + hostBlock('STEM_AUTOSAVE') + '\nreturn _createStemAutosave();'
  )(win, doc, storage);
  savers.push(saver);
  return { saver, storage, read: () => stored };
}

beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  P = window.StemLab._physics;
});

afterEach(() => {
  savers.splice(0).forEach(saver => saver.dispose());
  vi.useRealTimers();
});

function completed(run, drag = false) {
  const parameters = { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, drag };
  const radians = parameters.angle * Math.PI / 180;
  const body = {
    t: 0, mX: 0, mY: parameters.launchHeight,
    mVx: parameters.velocity * Math.cos(radians), mVy: parameters.velocity * Math.sin(radians),
    grav: parameters.gravity, drag: drag ? P.DRAG_K : 0, mass: parameters.mass,
    launchHeight: parameters.launchHeight, maxH: parameters.launchHeight,
  };
  const point = value => ({ t: value.t, mX: value.mX, mY: value.mY, mVx: value.mVx, mVy: value.mVy });
  const trail = [point(body)];
  Object.assign(trail, parameters, {
    run, modelVersion: P.MODEL_VERSION, parameters: Object.freeze({ ...parameters }),
    prediction: 123.456789012345, mission: Object.freeze({ targetMode: false, targetRound: 0, challengeTier: null }),
  });
  for (let steps = 0; !body.landed && steps < 4096; steps++) {
    P.step(body, P.DT);
    P.recordSample(trail, body);
  }
  expect(body.landed).toBe(true);
  if (body.apex) trail.apex = Object.freeze({ tSec: body.apex.t, mX: body.apex.mX, mY: body.apex.mY, vx: body.apex.mVx });
  const summary = {
    n: run, angle: parameters.angle, vel: parameters.velocity, grav: parameters.gravity,
    mass: parameters.mass, launchHeight: parameters.launchHeight, drag,
    range: body.mX, maxH: body.maxH, time: body.t, modelVersion: P.MODEL_VERSION,
  };
  const record = P.captureRecordedFlight(trail, summary, run);
  expect(record).not.toBeNull();
  return { record, trail, summary };
}

function savedState(flights) {
  return { _persisted: true, physics: {
    runCount: flights.at(-1).record.run,
    runLog: flights.map(flight => flight.summary),
    recordedFlights: P.normalizeRecordedFlights(flights.map(flight => flight.record)),
  } };
}

function assertRestored(encoded, flights) {
  const parsed = JSON.parse(encoded);
  const recordings = P.normalizeRecordedFlights(parsed.physics.recordedFlights);
  expect(recordings).toEqual(flights.map(flight => flight.record));
  expect(Object.isFrozen(recordings)).toBe(true);
  for (const [index, record] of recordings.entries()) {
    const original = flights[index].trail;
    const restored = P.restoreRecordedFlight(record);
    expect([...restored]).toEqual([...original]);
    for (const key of ['run', 'modelVersion', 'parameters', 'apex', 'prediction', 'mission']) {
      expect(restored[key], key).toEqual(original[key]);
    }
    expect(P.inspectSample(restored, restored.length - 1)).toEqual(P.inspectSample(original, original.length - 1));
  }
  return parsed;
}

describe('recorded physics flights through the host autosave contract', () => {
  it('writes every unrounded original sample and restores exact launch and apex metadata', () => {
    const flights = [completed(1), completed(2, true)], state = savedState(flights), h = autosave();
    const before = JSON.stringify(state);
    h.saver.queue(state);
    vi.advanceTimersByTime(399);
    expect(h.storage.setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(h.storage.setItem).toHaveBeenCalledExactlyOnceWith('alloflow_stemlab_v2', JSON.stringify({ physics: state.physics }));
    const parsed = assertRestored(h.read(), flights);
    expect(parsed.physics.runLog).toEqual(state.physics.runLog);
    expect(flights[0].record.points.some(point => point.some(value => value !== Number(value.toFixed(3))))).toBe(true);
    expect(parsed.physics.recordedFlights[0].points).toEqual(flights[0].record.points);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('flushes the latest completed recordings on disposal before the timer fires', () => {
    const first = completed(8), latest = completed(9, true), h = autosave();
    h.saver.queue(savedState([first]));
    h.saver.queue(savedState([first, latest]));
    expect(h.storage.setItem).not.toHaveBeenCalled();
    h.saver.dispose();
    expect(h.storage.setItem).toHaveBeenCalledTimes(1);
    const parsed = assertRestored(h.read(), [first, latest]);
    expect(parsed.physics.runCount).toBe(9);
    expect(vi.getTimerCount()).toBe(0);
    h.saver.queue(savedState([first]));
    vi.advanceTimersByTime(400);
    expect(h.storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('retries a failed storage write with unchanged full evidence instead of caching success', () => {
    const flights = [completed(17, true)], state = savedState(flights), h = autosave();
    const before = JSON.stringify(state);
    h.storage.setItem.mockImplementationOnce(() => { throw new Error('Storage quota exceeded'); });
    h.saver.queue(state);
    vi.advanceTimersByTime(400);
    expect(h.read()).toBeNull();
    expect(h.storage.setItem).toHaveBeenCalledTimes(1);
    h.saver.queue(state);
    vi.advanceTimersByTime(400);
    expect(h.storage.setItem).toHaveBeenCalledTimes(2);
    expect(h.storage.setItem.mock.calls[1]).toEqual(h.storage.setItem.mock.calls[0]);
    assertRestored(h.read(), flights);
    expect(JSON.stringify(state)).toBe(before);
    h.saver.queue(state);
    vi.advanceTimersByTime(400);
    expect(h.storage.setItem).toHaveBeenCalledTimes(2);
  });
});
