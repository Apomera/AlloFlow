// H1 demotion well-formedness (audit #11, 2026-06-15). "Ensure exactly one h1" demotes extra
// <h1> opens to <h2>. The single-file path shared ONE flag across the open AND close pass, so by
// the close pass the flag was already true and every </h1> stayed </h1> — emitting mismatched
// <h2>…</h1> on the primary path (the batch path at ~6760 already used independent counters).
// Fixed to independent ordinal counters. This pins well-formedness + anti-drift.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// Mirror of the FIXED demotion.
function demoteExtraH1(html) {
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count <= 1) return html;
  let openIdx = 0;
  html = html.replace(/<h1([^>]*)>/gi, (m, attrs) => { openIdx++; return openIdx === 1 ? m : `<h2${attrs}>`; });
  let closeIdx = 0;
  html = html.replace(/<\/h1>/gi, () => { closeIdx++; return closeIdx === 1 ? '</h1>' : '</h2>'; });
  return html;
}
const balanced = (html, tag) =>
  (html.match(new RegExp('<' + tag + '[\\s>]', 'gi')) || []).length ===
  (html.match(new RegExp('</' + tag + '>', 'gi')) || []).length;

describe('multi-h1 demotion produces well-formed headings', () => {
  it('keeps the first h1 and demotes the rest to matched <h2>…</h2>', () => {
    const out = demoteExtraH1('<h1>A</h1><h1>B</h1><h1>C</h1>');
    expect(out).toBe('<h1>A</h1><h2>B</h2><h2>C</h2>');
  });
  it('open and close tags stay balanced (no mismatched <h2>…</h1>)', () => {
    const out = demoteExtraH1('<h1 id="x">A</h1><p>t</p><h1 class="y">B</h1>');
    expect(balanced(out, 'h1')).toBe(true);
    expect(balanced(out, 'h2')).toBe(true);
    expect(out).not.toMatch(/<h2[^>]*>[\s\S]*?<\/h1>/); // the exact corruption the bug produced
  });
  it('single h1 is left untouched', () => {
    expect(demoteExtraH1('<h1>only</h1>')).toBe('<h1>only</h1>');
  });

  it('anti-drift: the single-file path uses independent ordinal counters, not a shared flag', () => {
    expect(pipeSrc).toContain('let _h1OpenIdx = 0;');
    expect(pipeSrc).toContain('let _h1CloseIdx = 0;');
    expect(pipeSrc).toContain("return _h1CloseIdx === 1 ? '</h1>' : '</h2>';");
    expect(pipeSrc).not.toContain('firstH1Found'); // the buggy shared flag is fully removed
  });
});
