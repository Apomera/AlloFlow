// B13 (audit batch, 2026-06-28): aiFixChunked's full-chunk acceptance gate is 90% length / 95% text. When
// a full chunk fails it and is split in half, each half was accepted at a WEAKER 85% / 90% — so a chunk the
// full gate rejected for marginal degradation could ship via halves that each retained only 85%, compounding
// silent text loss across recursive splits. The half gates now match the full gate (90% / 95%); a half that
// fails simply keeps its ORIGINAL content (a fix isn't applied, but no text is lost). This pins that symmetry.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('B13: half-chunk acceptance gates are ≥ the full-chunk gate (no lossy cascade)', () => {
  it('the full-chunk gate is 90% length / 95% text', () => {
    expect(dp).toContain('out.length >= part.length * 0.9 && textCharCount(out) >= textCharCount(part) * 0.95');
  });
  it('BOTH half gates now match it (90%/95%), and the old lenient 85% threshold is gone', () => {
    const n = (dp.match(/half\.length \* 0\.9 && textCharCount\([a-zA-Z]+\) >= textCharCount\(half\) \* 0\.95/g) || []).length;
    expect(n).toBeGreaterThanOrEqual(2);            // JSON-unwrapped half gate + regular half gate
    expect(dp).not.toContain('half.length * 0.85'); // the weaker gate that allowed the cascade is gone
  });
});
