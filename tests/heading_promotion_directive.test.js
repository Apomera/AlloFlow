// Bold→heading promotion directive (2026-06-28). The PDF→HTML extraction prompt instructs the model to
// promote a STANDALONE bold/large LABEL into a real, correctly-NESTED heading (h3/h4 for subsections),
// rather than leaving it as bold body text or flattening everything to h2 — addressing the "inconsistent
// heading granularity" finding (numbered outline items / category labels read as flat headings). It
// carries an over-promotion GUARD: only standalone labels are promoted, never in-sentence <strong>/<em>
// emphasis. This anti-drift test pins the guidance so it can't silently revert. (The prompt's EFFECT is
// validated by a live Canvas re-run, not by unit tests — an LLM directive isn't deterministically testable.)
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('anti-drift: extraction prompt strengthens bold→nested-heading promotion (with an over-promotion guard)', () => {
  it('instructs NESTED promotion (h3/h4), names the failure modes, and forbids flattening to h2', () => {
    expect(src).toContain('promote it to a real heading at the correct');
    expect(src).toContain('numbered outline heading');
    expect(src).toContain('Do NOT flatten every section to h2');
  });
  it('carries the over-promotion GUARD: only standalone labels, never in-sentence emphasis', () => {
    expect(src).toMatch(/GUARD: only promote text that is a STANDALONE label/);
    expect(src).toContain('never turn in-sentence <strong>/<em> emphasis into a heading');
  });
});
