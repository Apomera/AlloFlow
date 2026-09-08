import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('stem_lab/stem_tool_coasterlab.js', 'utf8');
const block = source.slice(source.indexOf('/* @clab-physics-pit-start */'), source.indexOf('/* @clab-physics-pit-end */'));
const { normalize, progress, notebookText, stops } = new Function(block + '; return { normalize: normalizePhysicsPit, progress: physicsPitProgress, notebookText: physicsPitNotebookText, stops: PHYSICS_PIT_STOPS };')();
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

describe('Physics pit investigation notebooks', () => {
  it('upgrades older saved predictions without losing writing', () => {
    const state = normalize({ stops: { energy: { choice: 0, checked: 0, reason: 'Gravity transfers energy.' } } });
    expect(state.stops.energy.reason).toBe('Gravity transfers energy.');
    expect(state.stops.energy.notebook).toEqual({ change: '', fixed: '', prediction: '', baseline: '', revised: '', explanation: '' });
    expect(progress(state)).toBe(1);
  });
  it('keeps each investigation separate and bounds recovered text', () => {
    const state = normalize({ stops: { energy: { notebook: { change: 'Raise crest', baseline: '12 m/s at the valley', revised: 'Stalled before the valley', explanation: 'x'.repeat(900), fixed: 42, surprise: 'discard' } }, curvature: { notebook: { change: 'Broaden turn' } } } });
    expect(state.stops.energy.notebook.change).toBe('Raise crest');
    expect(state.stops.curvature.notebook.change).toBe('Broaden turn');
    expect(state.stops.energy.notebook.explanation).toHaveLength(600);
    expect(state.stops.energy.notebook.fixed).toBe('');
    expect(state.stops.energy.notebook.surprise).toBeUndefined();
    expect(state.stops.energy.notebook.revised).toBe('Stalled before the valley');
    expect(progress(state)).toBe(0);
  });
  it('round-trips notes including line breaks and markup as plain text', () => {
    const raw = { stops: { airtime: { notebook: { explanation: '0.2 g at crest\n<img src=x> is just text' } } } };
    const state = normalize(JSON.parse(JSON.stringify(normalize(raw))));
    const text = notebookText(stops[2], state.stops.airtime.notebook);
    expect(text).toContain('CoasterLab investigation: Airtime');
    expect(text).toContain('0.2 g at crest\n<img src=x> is just text');
    expect(text).toContain('(No notes yet)');
    expect(text).toContain('not automatically captured telemetry');
  });
});
