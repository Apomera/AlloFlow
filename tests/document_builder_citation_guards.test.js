// Document Builder citation/dialogue guards (audit batch, 2026-06-28).
//  B7: validateAndRepairCitations decoded a superscript to a number and indexed groundingChunks[citNum-1].
//      A citation ⁽⁰⁾ decodes to 0 → groundingChunks[-1] = the LAST source → the citation was silently
//      "repaired" to the WRONG source (and an unmapped digit → NaN → groundingChunks[-1] likewise). Now an
//      out-of-range index (NaN / < 1) is left untouched (fail-safe), never mis-pointed at the last source.
//  B8: the dialogue formatter interpolated `${line.line}` unguarded — a dialogue object missing its `line`
//      field rendered the literal string "undefined". Now guarded like line.action.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ce = readFileSync(resolve(process.cwd(), 'content_engine_source.jsx'), 'utf8');

// extract the self-contained validateAndRepairCitations (its reverseMap + decodeSuperscript are inner)
const _s = ce.indexOf('var validateAndRepairCitations = function(text, groundingChunks) {');
const _e = ce.indexOf('\n  };', _s) + '\n  };'.length;
const validateAndRepairCitations = new Function(ce.slice(_s, _e) + '\nreturn validateAndRepairCitations;')();

const CHUNKS = [{ web: { uri: 'https://one.test' } }, { web: { uri: 'https://two.test' } }];

describe('B7 — validateAndRepairCitations never repairs to the wrong (last) source on an out-of-range index', () => {
  it('repairs a valid ⁽¹⁾ to its source', () => {
    const out = validateAndRepairCitations('Fact A ⁽¹⁾.', CHUNKS);
    expect(out).toContain('https://one.test'); // ⁽¹⁾ → chunks[0]
  });
  it('does NOT mis-repair ⁽⁰⁾ (citNum 0) to groundingChunks[-1] = the LAST source', () => {
    const out = validateAndRepairCitations('Bad cite ⁽⁰⁾ here.', CHUNKS);
    expect(out).not.toContain('two.test');   // would be the last source via groundingChunks[-1] without the guard
    expect(out).toContain('⁽⁰⁾');            // left untouched (fail-safe), not silently repointed
  });
  it('B6: STRIPS an out-of-range ⁽⁹⁾ (beyond the source list) — no dangling orphan, no wrong URL', () => {
    const out = validateAndRepairCitations('Way out ⁽⁹⁾.', CHUNKS);
    expect(out).not.toContain('⁽⁹⁾');        // orphan stripped (it matches no bibliography entry), not left dangling
    expect(out).not.toContain('](https://'); // and certainly not linked to a wrong source
  });
  it('empty / no-chunk inputs pass through unchanged', () => {
    expect(validateAndRepairCitations('', CHUNKS)).toBe('');
    expect(validateAndRepairCitations('text ⁽¹⁾', [])).toBe('text ⁽¹⁾');
  });
});

describe('anti-drift: the guards ship in source', () => {
  it('B7: the NaN/<1 guard precedes the groundingChunks index', () => {
    expect(ce).toContain('if (!Number.isInteger(citNum) || citNum < 1) return match;');
  });
  it('B6: the out-of-range strip ships', () => {
    expect(ce).toContain('if (citNum > groundingChunks.length) return \'\';');
  });
  it('B8: line.line is guarded like line.action (no raw `${action} ${line.line}` interpolation)', () => {
    expect(ce).toContain('const lineText = line.line ?');
    expect(ce).toContain('${action}${lineText}');
    expect(ce).not.toContain('${action} ${line.line}');
  });
});
