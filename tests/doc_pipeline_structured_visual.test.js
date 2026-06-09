// Unit tests for the structured-visual reconstruction TRIGGER (_isSuspectExtraction in
// doc_pipeline_source.jsx). This is the honesty-risk surface: it must flag a genuine
// category->examples infographic (so it gets reconstructed as a navigable table) WITHOUT
// false-positiving on ordinary captioned photos (which would turn prose into a spurious table).
// The re-extractor itself null-escapes on any doubt, so the trigger is the first conservative gate.
// Anti-drift: extracts the real arrow from source.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../doc_pipeline_source.jsx'), 'utf8');
function extractArrow(name) {
  const anchor = 'const ' + name + ' = ';
  const at = SRC.indexOf(anchor);
  if (at < 0) throw new Error('not found: ' + name);
  const braceStart = SRC.indexOf('{', SRC.indexOf('=>', at));
  let i = braceStart, d = 0, end = -1;
  for (; i < SRC.length; i++) { const c = SRC[i]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { end = i; break; } } }
  const head = SRC.slice(at + anchor.length, SRC.indexOf('=>', at));
  // eslint-disable-next-line no-eval
  return eval('(' + head + '=> ' + SRC.slice(braceStart, end + 1) + ')');
}
const isSuspect = extractArrow('_isSuspectExtraction');

describe('_isSuspectExtraction — structured-visual trigger', () => {
  it('FLAGS a category->examples infographic (structured cue + >=3 "Label: detail" groups)', () => {
    const block = { type: 'image', description: 'This infographic shows question-bias categories. Emotional loading: "What is your opinion on the tax mess?". One Sided: "Do you think it is a good idea?". Hidden argument: "Do you feel it is right to work over the break?".' };
    expect(isSuspect(block)).toBe('image-structured-panel');
  });

  it('does NOT flag a plain captioned photo (no structured cue, no groups)', () => {
    expect(isSuspect({ type: 'image', description: 'A photograph of a sunset over the ocean with a sailboat.' })).toBeNull();
  });

  it('does NOT flag when there is a structured cue but FEWER than 3 category groups (conservative)', () => {
    expect(isSuspect({ type: 'image', description: 'A comparison chart. Category A: one item.' })).toBeNull();
  });

  it('does NOT flag enumerated prose without a structured cue', () => {
    expect(isSuspect({ type: 'image', description: 'Notes: first thing. Reminder: second thing. Warning: third thing.' })).toBeNull();
  });

  it('preserves the existing legend trigger (mentions legend but not enumerated)', () => {
    expect(isSuspect({ type: 'image', description: 'A map legend.' })).toBe('image-mentions-legend-but-not-enumerated');
  });

  it('preserves the existing mostly-empty-table trigger', () => {
    const r = isSuspect({ type: 'table', headers: ['A', 'B'], rows: [['x', ''], ['', ''], ['', '']] });
    expect(String(r)).toMatch(/mostly-empty/);
  });

  it('returns null for non-suspect blocks', () => {
    expect(isSuspect({ type: 'p', text: 'ordinary paragraph' })).toBeNull();
    expect(isSuspect(null)).toBeNull();
  });
});
