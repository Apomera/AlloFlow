// Unit tests for _spliceSelectedText (view_misc_panels_source.jsx) — the pure core of the
// region-targeted "Refine with AI" feature. Rebuilds the diff's effective text with the selected
// chunk range [firstId,lastId] replaced by the AI rewrite, mirroring the live effective-text rule
// (add-not-rejected + del-rejected + same). The result is then coverage-guarded by
// _applyTextSurgery, so this only has to get the text-level splice right. Anti-drift: extracts the
// real function from source.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../view_misc_panels_source.jsx'), 'utf8');
function extractFn(name) {
  const at = SRC.indexOf('function ' + name + '(');
  if (at < 0) throw new Error('not found: ' + name);
  const braceStart = SRC.indexOf('{', at);
  let i = braceStart, d = 0, end = -1;
  for (; i < SRC.length; i++) { const c = SRC[i]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { end = i; break; } } }
  // eslint-disable-next-line no-eval
  return eval('(' + SRC.slice(at, end + 1) + ')');
}
const splice = extractFn('_spliceSelectedText');

const C = (id, type, value, rejected = false) => ({ id, type, value, rejected });

describe('_spliceSelectedText', () => {
  it('replaces a single selected chunk with the rewrite, keeping the rest', () => {
    const chunks = [C(0, 'same', 'A '), C(1, 'add', 'B '), C(2, 'same', 'C ')];
    expect(splice(chunks, 1, 1, 'X')).toBe('A XC ');
  });

  it('replaces a multi-chunk range with ONE rewrite', () => {
    const chunks = [C(0, 'same', 'A '), C(1, 'add', 'B '), C(2, 'same', 'C '), C(3, 'same', 'D')];
    expect(splice(chunks, 1, 2, 'Y ')).toBe('A Y D');
  });

  it('honors the effective-text rule outside the selection (rejected add omitted, rejected del kept)', () => {
    const chunks = [
      C(0, 'same', 'keep '),
      C(1, 'add', 'addedBad ', true),   // rejected addition -> omitted
      C(2, 'del', 'origKept ', true),   // rejected deletion -> original kept
      C(3, 'del', 'goneAdd ', false),   // accepted deletion -> omitted
      C(4, 'same', 'end'),
    ];
    // nothing selected in range [9,9] -> selection matches nothing -> replacement appended at end
    expect(splice(chunks, 9, 9, '')).toBe('keep origKept end');
  });

  it('drops every chunk in the selected range and inserts the rewrite once', () => {
    const chunks = [C(0, 'same', 'pre '), C(1, 'same', 'a '), C(2, 'same', 'b '), C(3, 'same', 'post')];
    expect(splice(chunks, 1, 2, 'MID ')).toBe('pre MID post');
  });

  it('returns the replacement for non-array input', () => {
    expect(splice(null, 0, 0, 'Z')).toBe('Z');
  });
});
