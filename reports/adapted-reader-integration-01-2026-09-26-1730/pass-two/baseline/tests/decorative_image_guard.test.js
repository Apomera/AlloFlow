// fixDecorativeImages must not DESTROY meaningful images (audit #13, 2026-06-15). isTiny fired on
// EITHER dimension <=16, so a 600x16 banner / a height=16 signature line was marked decorative and
// its alt stripped (invisible to a screen reader, while the doc falsely passed images-have-alt).
// Fix: require BOTH dimensions small, and never strip a non-empty alt.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('const fixDecorativeImages = (htmlContent) => {');
const end = src.indexOf('const fixLangSpans = (htmlContent) => {', start);
if (start === -1 || end === -1) throw new Error('extraction markers for fixDecorativeImages missing');
const fixDecorativeImages = new Function('warnLog', src.slice(start, end) + '\n; return fixDecorativeImages;')(() => {});

describe('fixDecorativeImages — never destroy a meaningful image', () => {
  it('keeps a wide-but-short banner (600x16) and its alt — not decorative', () => {
    const r = fixDecorativeImages('<img src="banner.png" width="600" height="16" alt="School logo banner">');
    expect(r.html).toContain('alt="School logo banner"');
    expect(r.html).not.toContain('role="presentation"');
    expect(r.fixCount).toBe(0);
  });
  it('never strips a non-empty alt, even on a 16x16 image', () => {
    const r = fixDecorativeImages('<img src="sig.png" width="16" height="16" alt="Required signature">');
    expect(r.html).toContain('alt="Required signature"');
    expect(r.fixCount).toBe(0);
  });
  it('does not mark a single-small-dimension image decorative (height 16, no width)', () => {
    const r = fixDecorativeImages('<img src="rule.png" height="16">');
    expect(r.fixCount).toBe(0);
  });
  it('STILL marks a genuinely tiny, alt-less image decorative (16x16 spacer)', () => {
    const r = fixDecorativeImages('<img src="spacer.gif" width="16" height="16">');
    expect(r.html).toContain('role="presentation"');
    expect(r.html).toMatch(/alt=""/);
    expect(r.fixCount).toBe(1);
  });
  it('STILL respects an explicit decorative class', () => {
    const r = fixDecorativeImages('<img src="dot.png" class="bullet decoration">');
    expect(r.html).toContain('role="presentation"');
  });
});
