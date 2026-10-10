import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

// Evaluate the production functions, including their production dependency.
function loadProductionFunction(name, bindings = {}) {
  const declaration = new RegExp('^([ \\t]*)function ' + name + '\\(', 'm').exec(source);
  if (!declaration) throw new Error('Missing production function: ' + name);
  const start = declaration.index + declaration[1].length;
  const ending = '\n' + declaration[1] + '}';
  const end = source.indexOf(ending, start);
  if (end < 0) throw new Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), 'return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

const replayPosition = loadProductionFunction('procedureReplayPosition');
const replayReviewStep = loadProductionFunction('procedureReplayReviewStep', {
  procedureReplayPosition: replayPosition,
});

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

const replay = freezeDeep({
  actions: [
    { action: 'scalpel', point: { x: 0.2, y: 0.3 } },
    { action: 'forceps', toolCalibration: { forcepsGrip: 35 } },
    { action: 'pin' },
    { action: 'probe' },
  ],
  duration: 4000,
  startedAt: 1000,
  specimen: 'frog',
  layer: 'muscle',
  returnFocusId: 'diss-replay-attempt',
});

const inactive = { active: false, elapsed: 0, progress: 0, index: 0, localProgress: 0 };

describe('dissection replay review', () => {
  it('starts at the first action and clamps times before the start', () => {
    for (const now of [500, 1000]) {
      expect(replayPosition(replay, now)).toEqual({
        active: true, elapsed: 0, progress: 0, index: 0, localProgress: 0,
      });
    }
  });

  it('moves through action boundaries using the saved action order', () => {
    expect(replayPosition(replay, 1500)).toEqual({
      active: true, elapsed: 500, progress: 0.125, index: 0, localProgress: 0.5,
    });
    expect(replayPosition(replay, 2000)).toEqual({
      active: true, elapsed: 1000, progress: 0.25, index: 1, localProgress: 0,
    });
    expect(replayPosition(replay, 3500)).toEqual({
      active: true, elapsed: 2500, progress: 0.625, index: 2, localProgress: 0.5,
    });
  });

  it('finishes playing at the duration while keeping the final action index valid', () => {
    for (const now of [5000, 6000]) {
      const position = replayPosition(replay, now);
      expect(position).toMatchObject({ active: false, elapsed: 4000, progress: 0.999, index: 3 });
      expect(position.localProgress).toBeCloseTo(0.996);
    }
  });

  it('holds a paused action at its saved position regardless of elapsed wall time', () => {
    const paused = freezeDeep({ ...replay, paused: true, elapsed: 1500 });
    for (const now of [0, 1000, 100000]) {
      expect(replayPosition(paused, now)).toEqual({
        active: true, elapsed: 1500, progress: 0.375, index: 1, localProgress: 0.5,
      });
    }
  });

  it('defaults an absent paused elapsed value to the first action', () => {
    for (const elapsed of [undefined, null]) {
      expect(replayPosition({ ...replay, paused: true, elapsed }, 100000)).toEqual({
        active: true, elapsed: 0, progress: 0, index: 0, localProgress: 0,
      });
    }
  });

  it('clamps paused positions and keeps the last action available for review', () => {
    expect(replayPosition({ ...replay, paused: true, elapsed: -100 }, 0)).toEqual({
      active: true, elapsed: 0, progress: 0, index: 0, localProgress: 0,
    });
    for (const elapsed of [4000, 8000]) {
      const position = replayPosition({ ...replay, paused: true, elapsed }, 0);
      expect(position).toMatchObject({ active: true, elapsed: 4000, progress: 0.999, index: 3 });
      expect(position.localProgress).toBeCloseTo(0.996);
    }
  });

  it('returns a safe inactive position for invalid replay records', () => {
    const invalidRecords = [
      undefined, null, {},
      ...[undefined, null, {}, [], 'scalpel'].map(actions => ({ ...replay, actions })),
      ...[undefined, null, '4000', 0, -1, NaN, Infinity, -Infinity].map(duration => ({ ...replay, duration })),
      ...[undefined, null, '1000', NaN, Infinity, -Infinity].map(startedAt => ({ ...replay, startedAt })),
    ];
    for (const record of invalidRecords) {
      expect(replayPosition(record, 2000)).toEqual(inactive);
    }
  });

  it('rejects nonnumeric and nonfinite paused positions without using wall time', () => {
    for (const elapsed of ['1500', false, {}, NaN, Infinity, -Infinity]) {
      expect(replayPosition({ ...replay, paused: true, elapsed }, 2000)).toEqual(inactive);
    }
  });

  it('calculates positions without modifying the frozen replay or its actions', () => {
    const before = JSON.stringify(replay);
    replayPosition(replay, 3500);
    replayPosition(replay, 6000);
    expect(JSON.stringify(replay)).toBe(before);
    expect(Object.isFrozen(replay.actions[0].point)).toBe(true);
  });

  it('copies the replay to review a selected action at its midpoint', () => {
    const before = JSON.stringify(replay);
    const selected = replayReviewStep(replay, 2);
    expect(selected).toEqual({ ...replay, paused: true, elapsed: 2500 });
    expect(selected).not.toBe(replay);
    expect(selected.actions).toBe(replay.actions);
    expect(replayPosition(selected, 100000)).toEqual({
      active: true, elapsed: 2500, progress: 0.625, index: 2, localProgress: 0.5,
    });
    expect(JSON.stringify(replay)).toBe(before);
  });

  it('bounds and floors action selection at the first and last review steps', () => {
    for (const [requested, index, elapsed] of [[-5, 0, 500], [0, 0, 500], [1.9, 1, 1500], [3, 3, 3500], [99, 3, 3500]]) {
      const selected = replayReviewStep(replay, requested);
      expect(selected).toMatchObject({ paused: true, elapsed });
      expect(replayPosition(selected, 100000)).toMatchObject({ active: true, index, localProgress: 0.5 });
    }
  });

  it('reviews a single saved action without producing an out-of-range index', () => {
    const single = freezeDeep({ ...replay, actions: [replay.actions[0]] });
    const selected = replayReviewStep(single, 99);
    expect(selected).toMatchObject({ paused: true, elapsed: 2000 });
    expect(replayPosition(selected, 100000)).toEqual({
      active: true, elapsed: 2000, progress: 0.5, index: 0, localProgress: 0.5,
    });
  });

  it('rejects invalid action selections and invalid replay records', () => {
    for (const index of [undefined, null, '1', false, {}, NaN, Infinity, -Infinity]) {
      expect(replayReviewStep(replay, index)).toBeNull();
    }
    for (const record of [undefined, null, {}, { ...replay, actions: [] }, { ...replay, duration: 0 }, { ...replay, startedAt: NaN }, { ...replay, paused: true, elapsed: NaN }]) {
      expect(replayReviewStep(record, 0)).toBeNull();
    }
  });

  it('allows another action to be selected from a paused final position', () => {
    const paused = freezeDeep({ ...replay, paused: true, elapsed: 4000 });
    const before = JSON.stringify(paused);
    const selected = replayReviewStep(paused, 0);
    expect(selected).toMatchObject({ paused: true, elapsed: 500 });
    expect(replayPosition(selected, 100000)).toMatchObject({ active: true, index: 0, localProgress: 0.5 });
    expect(JSON.stringify(paused)).toBe(before);
  });

  it('resumes from the selected position and advances without restarting the attempt', () => {
    const selected = freezeDeep(replayReviewStep(replay, 1));
    const before = JSON.stringify(selected);
    const resumeAt = 10000;
    const resumed = { ...selected, paused: false, startedAt: resumeAt - selected.elapsed };
    expect(replayPosition(resumed, resumeAt)).toEqual({
      active: true, elapsed: 1500, progress: 0.375, index: 1, localProgress: 0.5,
    });
    expect(replayPosition(resumed, resumeAt + 1000)).toEqual({
      active: true, elapsed: 2500, progress: 0.625, index: 2, localProgress: 0.5,
    });
    expect(replayPosition(resumed, resumeAt + 2500)).toMatchObject({ active: false, elapsed: 4000, index: 3 });
    expect(JSON.stringify(selected)).toBe(before);
  });
});
