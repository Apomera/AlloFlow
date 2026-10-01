import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('stem_lab/stem_tool_printingpress.js', 'utf8');
const start = source.indexOf('  function ppNormalizePressRun(raw)');
const end = source.indexOf("  window.StemLab.registerTool('printingPress'", start);
const normalize = new Function(source.slice(start, end) + '; return ppNormalizePressRun;')();
const proof = (number, overrides = {}) => ({ number, phrase: 'hello', timestamp: '2026-09-09T12:00:00.000Z', mode: 'manual', ...overrides });
describe('Printing Press saved run integrity', () => {
  it('restores safe defaults for absent or corrupt records', () => {
    for (const input of [null, undefined, 'broken', 3, {}]) {
      expect(normalize(input)).toEqual({ phrase: 'FIAT LUX', count: 0, proofs: [], notes: '', showLabels: false, prediction: null });
    }
    expect(normalize({ count: -1, phrase: '', proofs: 'invalid', showLabels: 'true' }).phrase).toBe('');
  });
  it('keeps at most twelve proofs while retaining the total run count', () => {
    const run = normalize({ count: 25, proofs: Array.from({ length: 25 }, (_, i) => proof(i + 1)) });
    expect(run.count).toBe(25); expect(run.proofs.map(p => p.number)).toEqual(Array.from({ length: 12 }, (_, i) => i + 14));
  });
  it('rejects malformed and duplicate proofs and reconciles the counter', () => {
    const run = normalize({ count: NaN, proofs: [null, {}, proof(-1), proof(2.5), proof(5), proof(5), proof(8, { timestamp: 'invalid', mode: 'unknown' })] });
    expect(run.count).toBe(8); expect(run.proofs).toHaveLength(2);
    expect(run.proofs[1]).toEqual({ number: 8, phrase: 'HELLO', timestamp: '', mode: 'manual', prediction: null });
  });
  it('normalizes bounded text without mutating stored data or breaking surrogate pairs', () => {
    const input = { phrase: '😀'.repeat(20), notes: 'x'.repeat(6000), proofs: [proof(1, { phrase: 'ß'.repeat(14) })] };
    const before = JSON.stringify(input); const run = normalize(input);
    expect(Array.from(run.phrase)).toHaveLength(14); expect(run.notes).toHaveLength(4000);
    expect(run.proofs[0].phrase).toBe('SSSSSSSSSSSSSS'); expect(JSON.stringify(input)).toBe(before);
  });
  it('retains explicit note and phrase edits and guided-tour provenance', () => {
    const run = normalize({ phrase: 'Next print', notes: 'Type is reversed.', showLabels: true, proofs: [proof(1, { mode: 'guided' })] });
    expect(run.phrase).toBe('Next print'); expect(run.notes).toBe('Type is reversed.'); expect(run.showLabels).toBe(true); expect(run.proofs[0].mode).toBe('guided');
  });
  it('keeps the prediction made for a proof independent of the next prediction', () => {
    const run = normalize({ prediction: 'readable', proofs: [proof(1, { prediction: 'mirrored' })] });
    expect(run.prediction).toBe('readable'); expect(run.proofs[0].prediction).toBe('mirrored');
  });
  it('treats legacy or invalid predictions as unanswered, not incorrect', () => {
    const run = normalize({ prediction: 'invalid', proofs: [proof(1, { prediction: 'wrong' })] });
    expect(run.prediction).toBeNull(); expect(run.proofs[0].prediction).toBeNull();
  });
  it('ships the same implementation to desktop', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_printingpress.js', 'utf8')).toBe(source);
  });
});
