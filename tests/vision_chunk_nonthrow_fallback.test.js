// Vision JSON-chunk non-throw content preservation (audit #16, 2026-06-15). A truthy-but-
// unparseable chunk that also failed object-recovery AND the direct-HTML fallback fell through to
// `return []` WITHOUT throwing — so the catch path's chunkText/structureTextHeuristic recovery
// never ran and the chunk dropped to zero blocks. Fix: run the SAME pre-extracted-text preservation
// on the non-throw fall-through. This pins the symmetry.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('vision chunk: non-throw parse failure still preserves extracted text (audit #16)', () => {
  // Isolate processJsonChunk: from its heuristic-fallback comment to the function close.
  const region = (() => {
    const a = src.indexOf('Final fallback: heuristic structuring from pre-extracted text');
    const b = src.indexOf('// Launch chunks in batches', a);
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    return src.slice(a, b);
  })();

  it('the non-throw fall-through runs structureTextHeuristic on extracted text BEFORE returning []', () => {
    // Two recovery sites now exist: the catch path AND the non-throw fall-through.
    const heuristicCalls = (region.match(/structureTextHeuristic\(/g) || []).length;
    expect(heuristicCalls).toBeGreaterThanOrEqual(2);
    expect(region).toContain('non-throw parse failure → heuristic fallback');
    expect(region).toContain('const _chunkText = extractedText.substring(_fbStart, _fbEnd);');
  });

  it('the non-throw fallback is positioned before the function-closing return []', () => {
    const nonThrow = region.indexOf("non-throw parse failure → heuristic fallback");
    const finalReturn = region.lastIndexOf('return [];');
    expect(nonThrow).toBeGreaterThan(-1);
    expect(finalReturn).toBeGreaterThan(nonThrow); // the bare return [] comes AFTER the recovery
  });
});
