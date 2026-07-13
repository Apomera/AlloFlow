// Characterization smoke test for the codingPlayground serializer (blocksToText).
//
// WHY THIS IS SHAPED ODDLY: the interpreter (textToBlocks / blocksToText) lives
// inside the tool's render closure in stem_lab/stem_tool_coding.js and is not
// exported, so it cannot be imported directly. Until the interpreter is lifted
// to a pure, testable namespace (roadmap item C1 in docs/coding_tool_review.md),
// this test extracts the self-contained blocksToText function from source by
// brace-matching and evaluates it in isolation. blocksToText references only its
// own params (b / lines / indent) + self-recursion, so this is safe.
//
// It pins the 2026-06-14 A3 fix: six misplaced 3D *executor* branches had been
// pasted into the pure serializer, referencing out-of-scope vars (t / vars /
// allLines) and throwing `ReferenceError` whenever a 3D block was serialized
// (e.g. toggling text<->blocks after hand-typing `forward3D(50)`). The fix
// removed the duplicate branches (the real executor lives in executeBlocks) and
// added a totality `else` so the serializer can never silently drop or throw.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadBlocksToText() {
  const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_coding.js'), 'utf8');
  const start = src.indexOf('function blocksToText(blks, indent) {');
  if (start < 0) throw new Error('blocksToText anchor not found (was it renamed?)');
  let depth = 0, end = -1;
  for (let k = src.indexOf('{', start); k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) { end = k + 1; break; } }
  }
  // eslint-disable-next-line no-eval
  return eval('(' + src.slice(start, end) + ')');
}

describe('codingPlayground blocksToText serializer (A3 regression net)', () => {
  const blocksToText = loadBlocksToText();

  it('serializes a 3D block instead of throwing (the bug)', () => {
    expect(blocksToText([{ type: 'forward3D', distance: 50 }])).toBe('forward3D(50)');
    expect(blocksToText([{ type: 'pitch', degrees: 30 }])).toBe('pitch(30)');
  });

  it('serializes every 3D op the parser accepts', () => {
    expect(blocksToText([
      { type: 'yaw', degrees: 15 }, { type: 'roll', degrees: 5 },
      { type: 'moveUp', distance: 20 }, { type: 'moveDown', distance: 10 },
    ])).toBe('yaw(15)\nroll(5)\nmoveUp(20)\nmoveDown(10)');
  });

  it('round-trips a repeat-nested 3D program without throwing', () => {
    const out = blocksToText([{ type: 'repeat', times: 3, children: [
      { type: 'forward3D', distance: 40 }, { type: 'pitch', degrees: 90 },
    ] }]);
    expect(out).toContain('forward3D(40)');
    expect(out).toContain('pitch(90)');
  });

  it('is total — an unknown block type yields a comment, never a silent drop or throw', () => {
    expect(blocksToText([{ type: 'wat' }])).toBe('// unsupported: wat');
  });

  it('still serializes ordinary turtle blocks', () => {
    expect(blocksToText([{ type: 'forward', distance: 100 }, { type: 'right', degrees: 90 }]))
      .toBe('forward(100)\nright(90)');
  });
});
