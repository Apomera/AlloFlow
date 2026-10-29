import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
function productionFunction(name, bindings = {}) {
  const match = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (match.length !== 1) throw Error('Expected one production function: ' + name);
  const start = match[0].index + match[0][1].length;
  const ending = '\n' + match[0][1] + '}';
  const end = source.indexOf(ending, start);
  if (end < start) throw Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), 'return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}
const plainRecord = productionFunction('isPlainDissectionRecord');
const validAnnotation = productionFunction('isValidDissectionAnnotation', { isPlainDissectionRecord: plainRecord });
const draw = productionFunction('drawDissectionAnnotations', { isValidDissectionAnnotation: validAnnotation });
const inspectStored = productionFunction('inspectDissectionStoredValue', {
  isPlainDissectionRecord: plainRecord, isValidDissectionAnnotation: validAnnotation,
  DISSECTION_SAVE_SCHEMA_VERSION: 21,
  dissectionEvidenceImageFormat: productionFunction('dissectionEvidenceImageFormat'),
});
const legacyMarks = [
  { x: 0, y: 1 },
  { x: 0.5, y: 0.4, type: 'dot', prevX: 0, prevY: 1 },
  { x: 1, y: 0, type: 'line', prevX: 0.5, prevY: 0.4 },
];

describe('dissection annotation geometry integrity', () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); resetStemLab(); });
  afterEach(() => { vi.restoreAllMocks(); vi.clearAllTimers(); vi.useRealTimers(); localStorage.clear(); });

  it.each([
    null, {}, { x: 0.2 }, { x: '0.2', y: 0.3 }, { x: null, y: 0.3 },
    { x: { valueOf: null, toString: null }, y: 0.4, type: 'dot' },
    { x: 0.2, y: [] }, { x: -0.01, y: 0.4 }, { x: 0.4, y: 1.01 },
    { x: 0.3, y: 0.4, prevX: 0.1 }, { x: 0.3, y: 0.4, prevY: 0.2 },
    { x: 0.3, y: 0.4, prevX: null, prevY: 0.2 },
    { x: 0.3, y: 0.4, prevX: 0.1, prevY: { valueOf: null, toString: null } },
  ])('protects stored records containing unsafe annotation %j', annotation => {
    const raw = JSON.stringify({ schemaVersion: 21, annotations: [annotation], organNotes: { 'frog|dorsal_skin': 'Keep this evidence' } });
    localStorage.setItem('dissection_progress_frog', raw);
    expect(inspectStored('dissection_progress_frog')).toMatchObject({ ok: false, kind: 'unsafe-shape', field: 'annotations', raw });
    expect(localStorage.getItem('dissection_progress_frog')).toBe(raw);
  });

  it('does not coerce malformed coordinate objects or accept nonfinite live values', () => {
    const valueOf = vi.fn(() => 0.5);
    expect(validAnnotation({ x: { valueOf }, y: 0.3 })).toBe(false);
    expect(valueOf).not.toHaveBeenCalled();
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(validAnnotation({ x: value, y: 0.3 })).toBe(false);
      expect(validAnnotation({ x: 0.3, y: 0.4, prevX: 0.2, prevY: value })).toBe(false);
    }
  });

  it('preserves valid legacy dots, lines, and endpoint coordinates without rewriting them', () => {
    const raw = JSON.stringify({ annotations: legacyMarks });
    localStorage.setItem('dissection_progress_frog', raw);
    expect(inspectStored('dissection_progress_frog')).toMatchObject({ ok: true, data: { annotations: legacyMarks }, raw });
    const ctx = { beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fill: vi.fn() };
    draw(ctx, legacyMarks, 500, 600);
    expect(ctx.arc.mock.calls.map(call => call.slice(0, 2))).toEqual([[0, 600], [250, 240], [500, 0]]);
    expect(ctx.moveTo.mock.calls).toEqual([[0, 600], [250, 240]]);
    expect(ctx.lineTo.mock.calls).toEqual([[250, 240], [500, 0]]);
    expect(localStorage.getItem('dissection_progress_frog')).toBe(raw);
  });

  it('continues drawing safe live marks while breaking the line across malformed marks', () => {
    const annotations = [
      { x: 0.1, y: 0.2 },
      { x: { valueOf: null, toString: null }, y: 0.4 },
      { x: 0.3, y: 0.4, prevX: 0.1, prevY: 0.2 },
      { x: 0.5, y: 0.6, prevX: 0.3, prevY: 0.4 },
    ];
    const before = JSON.stringify(annotations);
    const ctx = { beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fill: vi.fn() };
    expect(() => draw(ctx, annotations, 500, 600)).not.toThrow();
    expect(ctx.arc.mock.calls.map(call => call.slice(0, 2))).toEqual([[50, 120], [150, 240], [250, 360]]);
    expect(ctx.moveTo.mock.calls).toEqual([[150, 240]]);
    expect(ctx.lineTo.mock.calls).toEqual([[250, 360]]);
    expect(JSON.stringify(annotations)).toBe(before);
    expect(() => draw(ctx, { length: 1 }, 500, 600)).not.toThrow();
  });

  it('loads corrupt annotation saves in protected mode and never overwrites their notes or raw bytes', () => {
    const raw = JSON.stringify({ schemaVersion: 21, annotations: [{ x: { valueOf: null, toString: null }, y: 0.4 }], organNotes: { 'frog|dorsal_skin': 'Protected saved note' } });
    localStorage.setItem('dissection_progress_frog', raw);
    const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
    const store = newStore({ dissection: { specimen: 'frog', reducedMotion: true } });
    const render = () => config.render(makeCtx({ toolData: store.toolData }, store));
    render(); vi.advanceTimersByTime(0);
    expect(store.toolData.dissection.annotations).toEqual([]);
    expect(ReactDOMServer.renderToStaticMarkup(render())).toContain('Protected saved progress');
    store.toolData.dissection.organNotes = { 'frog|dorsal_skin': 'Temporary new note' };
    render(); vi.advanceTimersByTime(150);
    window.dispatchEvent(new Event('pagehide'));
    expect(localStorage.getItem('dissection_progress_frog')).toBe(raw);
    expect(store.toolData.dissection.organNotes['frog|dorsal_skin']).toBe('Temporary new note');
  });

  it('hydrates valid legacy annotation geometry intact', () => {
    localStorage.setItem('dissection_progress_frog', JSON.stringify({ annotations: legacyMarks }));
    const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
    const store = newStore({ dissection: { specimen: 'frog', reducedMotion: true } });
    config.render(makeCtx({ toolData: store.toolData }, store)); vi.advanceTimersByTime(0);
    expect(store.toolData.dissection.annotations).toEqual(legacyMarks);
  });
});
