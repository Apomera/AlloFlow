import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('stem_lab/stem_tool_coasterlab.js', 'utf8');
const block = source.slice(source.indexOf('/* @clab-physics-pit-start */'), source.indexOf('/* @clab-physics-pit-end */'));
const { normalize, progress } = new Function(block + '; return { normalize: normalizePhysicsPit, progress: physicsPitProgress };')();
describe('Physics pit stop response recovery', () => {
  it.each([null, [], false, 12, 'broken'])('recovers a usable empty state from %j', raw => {
    const state = normalize(raw);
    expect(state.active).toBe('energy'); expect(state.experiment).toBeNull(); expect(progress(state)).toBe(0);
  });
  it('retains a different first prediction as explored, without grading it', () => {
    const state = normalize({ active: 'energy', stops: { energy: { choice: 1, checked: 1 } } });
    expect(progress(state)).toBe(1); expect(state.stops.energy.checked).toBe(1);
  });
  it('preserves the last checked response while a learner revises their prediction', () => {
    const state = normalize({ stops: { airtime: { choice: 1, checked: 0 } } });
    expect(state.stops.airtime).toMatchObject({ choice: 1, checked: 0 }); expect(progress(state)).toBe(1);
  });
  it('does not award exploration for merely choosing an option', () => {
    expect(progress({ stops: { energy: { choice: 0 } } })).toBe(0);
  });
  it('rejects out-of-range, string and fractional choices', () => {
    const state = normalize({ active: 'unknown', experiment: 'unknown', stops: { energy: { choice: '0', checked: -1 }, curvature: { choice: 0.5, checked: 3 }, airtime: { choice: NaN, checked: Infinity } } });
    expect(progress(state)).toBe(0); expect(state.experiment).toBeNull();
    Object.values(state.stops).forEach(value => { expect(value.choice).toBeNull(); expect(value.checked).toBeNull(); });
  });
  it('bounds saved writing and only preserves known stops', () => {
    const state = normalize({ active: 'curvature', experiment: 'airtime', stops: { energy: { reason: 'x'.repeat(1000) }, unexpected: { checked: 0 } } });
    expect(state.active).toBe('curvature'); expect(state.experiment).toBe('airtime');
    expect(state.stops.energy.reason.length).toBe(600); expect(state.stops.unexpected).toBeUndefined();
  });
  it('counts three explored explanations regardless of prediction matches', () => {
    expect(progress({ stops: { energy: { checked: 2 }, curvature: { checked: 0 }, airtime: { checked: 0 } } })).toBe(3);
  });
});
