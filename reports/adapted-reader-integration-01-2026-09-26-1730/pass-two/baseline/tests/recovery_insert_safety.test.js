// Recovery-review "Insert at match" safety (2026-06-15 third-review #7 #8). The walkthrough lives
// in a React closure, so we mirror the two load-bearing decisions (anchor uniqueness + residual
// bookkeeping) and anti-drift-guard the shipped source.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// mirror of the shipped _findAnchor uniqueness logic
function findUniqueAnchor(html, anchor) {
  const _norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!anchor || anchor.length < 12) return null;
  const d = new DOMParser().parseFromString(html, 'text/html');
  const walker = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT, null);
  let node, hit = null, count = 0;
  while ((node = walker.nextNode())) {
    if (node.parentElement && node.parentElement.closest('section[data-content-recovery="true"]')) continue;
    const _txt = _norm(node.textContent);
    let from = 0, idx;
    while ((idx = _txt.indexOf(anchor, from)) !== -1) { count++; if (!hit) hit = node; if (count > 1) return null; from = idx + anchor.length; }
  }
  return hit;
}

describe('#8 recovery anchor must be specific AND unique (no wrong-paragraph splice)', () => {
  it('returns a node for a unique, sufficiently specific anchor', () => {
    const html = '<body><p>the council reviewed the annual budget today</p><p>unrelated other content here</p></body>';
    expect(findUniqueAnchor(html, 'reviewed the annual budget')).not.toBe(null);
  });
  it('refuses a non-unique anchor (it recurs → ambiguous → stays in appendix)', () => {
    const html = '<body><p>summary of the data here</p><p>another summary of the data appears</p></body>';
    expect(findUniqueAnchor(html, 'summary of the data')).toBe(null); // pre-fix: spliced into the FIRST one
  });
  it('refuses a too-short anchor (<12 chars) that would collide on common phrases', () => {
    const html = '<body><p>of the data set</p></body>';
    expect(findUniqueAnchor(html, 'the data')).toBe(null);
  });
  it('ignores occurrences inside the recovery appendix itself', () => {
    const html = '<body><p>the council reviewed the annual budget</p><section data-content-recovery="true"><ul><li>the council reviewed the annual budget</li></ul></section></body>';
    expect(findUniqueAnchor(html, 'reviewed the annual budget')).not.toBe(null); // appendix copy not counted
  });
});

describe('#7 a word missing N>1 times keeps its appendix record for the residual', () => {
  const residual = (missingCount) => (missingCount > 1 ? missingCount : 1) - 1;
  it('missing once → fully placed → residual 0 (remove the entry)', () => {
    expect(residual(1)).toBe(0);
    expect(residual(undefined)).toBe(0);
  });
  it('missing 3× → place 1, residual 2 (keep + annotate, never dropped)', () => {
    expect(residual(3)).toBe(2);
  });
});

describe('anti-drift: the shipped recovery code carries both guards', () => {
  it('#8 uniqueness guard + 12-char floor are present', () => {
    expect(viewSrc).toContain('if (count > 1) return null;');
    expect(viewSrc).toContain('if (!anchor || anchor.length < 12) return null;');
  });
  it('#7 residual annotation keeps the appendix entry instead of always removing it', () => {
    expect(viewSrc).toContain("more occurrence' + (_resid === 1 ? '' : 's') + ' could not be auto-placed");
    expect(viewSrc).toContain('if (_resid > 0)');
  });
});
