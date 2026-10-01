import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_coasterlab.js', 'utf8');
const block = source.slice(source.indexOf('/* @clab-trace-comparison-start */'), source.indexOf('function renderExperimentComparisonBoard(){'));
const api = new Function('fmt', block + '\nreturn { guidedTraceNumber, guidedComparisonTrace, guidedTraceReading, renderGuidedTraceReadout, renderGuidedTraceOverlay, bindGuidedTraceInspector, guidedComparisonDraftKey, normalizeGuidedComparisonDrafts, guidedTraceDifferences, guidedTraceEvidenceText, guidedAppendEvidenceText };')((v, d) => Number(v).toFixed(d));
const trace = points => api.guidedComparisonTrace({ trace: points });
const point = (s, v, g = 1, gl = 0) => ({ s, v, g, gl });
const history = [{ trace: [point(0, 0), point(100, 20, 3)] }, { trace: [point(0, 10), point(200, 30, 5)] }];

describe('Coaster saved-run distance inspector', () => {
  it('interpolates each run at the same physical distance, including unequal track lengths', () => {
    const a = trace(history[0].trace), b = trace(history[1].trace);
    expect(api.guidedTraceReading(a, 50)).toEqual(point(50, 10, 2));
    expect(api.guidedTraceReading(b, 50)).toEqual(point(50, 15, 2));
    expect(api.guidedTraceReading(a, 100)).toEqual(point(100, 20, 3));
    expect(api.guidedTraceReading(b, 100)).toEqual(point(100, 20, 3));
  });
  it('does not extrapolate beyond either recorded run', () => {
    const a = trace(history[0].trace);
    expect(api.guidedTraceReading(a, -1)).toBeNull();
    expect(api.guidedTraceReading(a, 101)).toBeNull();
    expect(api.guidedTraceReading([], 0)).toBeNull();
    expect(api.guidedTraceReading(a, NaN)).toBeNull();
    expect(api.guidedTraceReading(trace([point(10, 8)]), 0)).toBeNull();
  });
  it.each([null, undefined, '', ' ', false, true, Infinity, NaN, {}, []])('does not interpret %j as a zero measurement', value => {
    expect(api.guidedTraceNumber(value)).toBeNull();
  });
  it('preserves legitimate zeros, numeric strings, and negative forces', () => {
    expect(trace([{ s: '0', v: 0, g: '-0.5', gl: '0' }])).toEqual([point(0, 0, -0.5)]);
  });
  it('sorts and deduplicates distances without changing saved history', () => {
    const raw = [point(100, 9), point(0, 2), point(100, 12), point(null, 3), point(-1, 4)];
    expect(trace(raw)).toEqual([point(0, 2), point(100, 12)]);
    expect(raw[0].v).toBe(9);
    expect(raw).toHaveLength(5);
  });
  it('does not interpolate through a missing measurement', () => {
    const values = trace([point(0, 0), point(50, null, 2), point(100, 20, 3)]);
    expect(api.guidedTraceReading(values, 25)).toEqual(point(25, null, 1.5));
    expect(api.guidedTraceReading(values, 50)).toEqual(point(50, null, 2));
    expect(api.guidedTraceReading(values, 75).v).toBeNull();
  });
  it('renders labeled numerical differences and a separate reading for each run', () => {
    const root = document.createElement('div');
    root.innerHTML = api.renderGuidedTraceReadout(trace(history[0].trace), trace(history[1].trace), 50);
    expect(root.querySelector('caption').textContent).toContain('50.0 m');
    expect([...root.querySelectorAll('tbody tr:first-child td')].map(x => x.textContent)).toEqual(['10.00', '15.00', '+5.00']);
    root.innerHTML = api.renderGuidedTraceReadout(trace(history[0].trace), trace(history[1].trace), 150);
    expect([...root.querySelectorAll('tbody tr:first-child td')].map(x => x.textContent)).toEqual(['Not recorded', '25.00', 'Not recorded']);
  });
  it('labels actual distance, differentiates curves by shape, and renders gaps without invalid SVG', () => {
    const root = document.createElement('div');
    root.innerHTML = api.renderGuidedTraceOverlay([{ trace: [point(0, 1, null, null), point(50, null, null, null), point(100, 3, null, null)] }, history[1]], 0, 1, true);
    expect(root.textContent).toContain('Distance along the track in meters');
    expect(root.textContent).not.toContain('normalized circuit');
    expect(root.querySelector('[stroke-dasharray="6 4"]')).not.toBeNull();
    expect(root.querySelector('path').getAttribute('d')).toMatch(/^M[^L]+ M/);
    expect(root.innerHTML).not.toMatch(/NaN|Infinity/);
  });
  it('handles missing traces, absent metrics and selecting the same run', () => {
    expect(api.renderGuidedTraceOverlay([{}, history[1]], 0, 1)).toContain('not available');
    expect(api.renderGuidedTraceOverlay(history, 0, 0)).toContain('two different');
    const html = api.renderGuidedTraceOverlay([{ trace: [{ s: 0 }, { s: 10 }] }, { trace: [{ s: 0 }, { s: 20 }] }], 0, 1);
    expect(html).toContain('Speed: not recorded');
    expect(html).not.toMatch(/NaN|Infinity/);
  });
  it('updates the cursor, table and screen-reader announcement without replacing keyboard focus', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    root.innerHTML = api.renderGuidedTraceOverlay(history, 0, 1, true);
    api.bindGuidedTraceInspector(root, history, 0, 1);
    const slider = root.querySelector('input');
    slider.focus();
    slider.value = '50';
    slider.dispatchEvent(new Event('input'));
    expect(document.activeElement).toBe(slider);
    expect(slider.getAttribute('aria-valuetext')).toBe('50.0 meters from the start');
    expect(root.querySelector('[data-clab-trace-cursor]').getAttribute('x1')).toBe('138');
    expect(root.querySelector('caption').textContent).toContain('50.0 m');
    slider.dispatchEvent(new Event('change'));
    expect(root.querySelector('[role="status"]').textContent).toContain('Earlier: speed 10.00 meters per second');
    expect(root.querySelector('[role="status"]').textContent).toContain('Later: speed 15.00 meters per second');
    root.remove();
  });
  it('keeps exported charts static with numerical readings and no inactive slider', () => {
    const html = api.renderGuidedTraceOverlay(history, 0, 1);
    expect(html).toContain('<caption');
    expect(html).not.toContain('type="range"');
  });
});

describe('Coaster saved comparison conclusions', () => {
  const runs = Array.from({ length: 8 }, (_, i) => ({ attempt: i + 1, revision: i, goal: 'hill20', designKey: JSON.stringify([[0, i, 0, 0]]) }));
  const key = (a, b, entries = runs) => api.guidedComparisonDraftKey(entries, a, b);
  it('keeps drafts attached to their runs when older history is removed', () => {
    const saved = { [key(2, 3)]: 'My evidence' };
    const trimmed = runs.slice(2);
    expect(api.normalizeGuidedComparisonDrafts(saved, trimmed)[key(0, 1, trimmed)]).toBe('My evidence');
    expect(api.normalizeGuidedComparisonDrafts(saved, runs.slice(3))).toEqual({});
  });
  it('separates reversed pairs and excludes invalid selections', () => {
    expect(key(0, 1)).not.toBe(key(1, 0));
    expect(key(1, 1)).toBe('');
    expect(key(-1, 1)).toBe('');
    expect(api.guidedComparisonDraftKey(null, 0, 1)).toBe('');
  });
  it('retains deliberately empty conclusions and treats imported text as plain text', () => {
    const raw = { [key(0, 1)]: '', [key(1, 2)]: '<script>alert(1)</script>', obsolete: 'wrong run' };
    expect(api.normalizeGuidedComparisonDrafts(raw, runs)).toEqual({ [key(0, 1)]: '', [key(1, 2)]: '<script>alert(1)</script>' });
  });
  it('bounds saved drafts and rejects malformed imported values', () => {
    const raw = {};
    for(let a = 0; a < runs.length; a++) for(let b = 0; b < runs.length; b++) if(a !== b) raw[key(a, b)] = 'x'.repeat(6500);
    const normalized = api.normalizeGuidedComparisonDrafts(raw, runs);
    expect(Object.keys(normalized)).toHaveLength(24);
    expect(Object.values(normalized).every(value => value.length === 6000)).toBe(true);
    expect(api.normalizeGuidedComparisonDrafts({ [key(0, 1)]: { text: 'bad' } }, runs)).toEqual({});
    expect(api.normalizeGuidedComparisonDrafts(null, runs)).toEqual({});
  });
  it('does not attach a draft to a replaced experiment with reused attempt numbers', () => {
    const updated = runs.map(entry => ({ ...entry }));
    updated[1].designKey = 'different design';
    expect(api.normalizeGuidedComparisonDrafts({ [key(0, 1)]: 'old' }, updated)).toEqual({});
  });
  it('captures a selected distance in static report charts and clamps invalid distances', () => {
    const root = document.createElement('div');
    root.innerHTML = api.renderGuidedTraceOverlay(history, 0, 1, false, 150);
    expect(root.querySelector('caption').textContent).toContain('150.0 m');
    expect(root.querySelector('[data-clab-trace-cursor]').getAttribute('x1')).toBe('298');
    expect(root.querySelector('input')).toBeNull();
    root.innerHTML = api.renderGuidedTraceOverlay(history, 0, 1, false, 900);
    expect(root.querySelector('caption').textContent).toContain('200.0 m');
    root.innerHTML = api.renderGuidedTraceOverlay(history, 0, 1, false, -20);
    expect(root.querySelector('caption').textContent).toContain('0.0 m');
  });
});

describe('Coaster evidence discovery and capture', () => {
  it('finds a maximum at a sample boundary unique to either trace', () => {
    const earlier = trace([point(0, 0), point(40, 20), point(100, 0)]);
    const later = trace([point(0, 0), point(100, 0)]);
    expect(api.guidedTraceDifferences(earlier, later).v).toEqual({ s: 40, earlier: 20, later: 0, delta: -20 });
    const other = trace([point(0, 0), point(25, 20), point(100, 10)]);
    expect(api.guidedTraceDifferences(trace([point(0, 0), point(100, 10)]), other).v).toEqual({ s: 25, earlier: 2.5, later: 20, delta: 17.5 });
  });
  it('uses absolute differences for signed lateral forces and breaks ties at the first point', () => {
    const a = trace([point(0, 1, 1, 1), point(20, 1, 1, -1)]);
    const b = trace([point(0, 2, 1, -3), point(20, 0, 1, 3)]);
    expect(api.guidedTraceDifferences(a, b).gl).toEqual({ s: 0, earlier: 1, later: -3, delta: -4 });
    expect(api.guidedTraceDifferences(a, b).v.s).toBe(0);
  });
  it('excludes gaps, nonoverlapping distances, and extrapolated peaks', () => {
    const a = trace([point(0, 0), point(50, null), point(100, 0)]);
    const b = trace([point(0, 0), point(50, 100), point(100, 0)]);
    expect(api.guidedTraceDifferences(a, b).v.delta).toBe(0);
    expect(api.guidedTraceDifferences(trace([point(0, 1), point(10, 2)]), trace([point(20, 100), point(30, 500)]))).toEqual({ v: null, g: null, gl: null });
    const short = trace([point(0, 0), point(100, 0)]);
    const long = trace([point(0, 0), point(200, 200)]);
    expect(api.guidedTraceDifferences(short, long).v).toEqual({ s: 100, earlier: 0, later: 100, delta: 100 });
  });
  it('jumps the synchronized cursor without replacing keyboard focus', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    root.innerHTML = api.renderGuidedTraceOverlay(history, 0, 1, true);
    api.bindGuidedTraceInspector(root, history, 0, 1);
    const slider = root.querySelector('input');
    slider.value = '70';
    const button = root.querySelector('[data-clab-jump-difference="v"]');
    button.focus();
    button.click();
    expect(document.activeElement).toBe(button);
    expect(slider.value).toBe('0');
    expect(root.querySelector('caption').textContent).toContain('0.0 m');
    expect(root.querySelector('[data-clab-trace-status]').textContent).toContain('Earlier: speed 0.00');
    expect(root.querySelector('[data-clab-jump-difference="gl"]').disabled).toBe(true);
    root.remove();
  });
  it('captures paired readings with units, signed differences and experiment context', () => {
    const evidence = api.guidedTraceEvidenceText(history, 0, 1, 50);
    expect(evidence).toContain('Evidence at 50.0 m');
    expect(evidence).toContain('attempt 1 -> attempt 2');
    expect(evidence).toContain('Speed: earlier 10.00 m/s, later 15.00 m/s, change +5.00 m/s.');
    expect(evidence).toContain('interpolated between samples');
    expect(evidence).toContain('do not establish the cause');
    expect(api.guidedTraceEvidenceText(history, 0, 1, 150)).toBe('');
    expect(api.guidedTraceEvidenceText(history, 0, 0, 50)).toBe('');
    expect(api.guidedTraceEvidenceText(null, 0, 1, 50)).toBe('');
  });
  it('omits unavailable measurements from captured evidence', () => {
    const entries = [{ trace: [point(0, null, 1)] }, { trace: [point(0, 9, 2)] }];
    const evidence = api.guidedTraceEvidenceText(entries, 0, 1, 0);
    expect(evidence).not.toContain('Speed:');
    expect(evidence).toContain('Vertical force: earlier 1.00 g, later 2.00 g, change +1.00 g.');
  });
  it('appends without replacing writing, duplicating evidence, or truncating a full draft', () => {
    const original = 'My explanation.  ';
    const first = api.guidedAppendEvidenceText(original, 'Evidence block');
    expect(first).toEqual({ text: original + '\n\nEvidence block', added: true, reason: '' });
    expect(api.guidedAppendEvidenceText(first.text, 'Evidence block')).toEqual({ text: first.text, added: false, reason: 'duplicate' });
    const full = 'a'.repeat(5998);
    expect(api.guidedAppendEvidenceText(full, 'Evidence')).toEqual({ text: full, added: false, reason: 'full' });
    expect(api.guidedAppendEvidenceText(original, '')).toEqual({ text: original, added: false, reason: 'missing' });
    expect(api.guidedAppendEvidenceText('', 'Evidence').text).toBe('Evidence');
  });
});
