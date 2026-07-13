// Sentence-restoration insert-target guard (2026-06-23). Tier-B sentence restoration inserts a restored
// <p> as a sibling after its best-matched block. Two real problems that guard fixes: (1) STRUCTURAL — a
// <p> can't be a child of <tr>/<ul>/<dl>, so inserting after a <td>/<li> etc. is malformed; (2) SEMANTIC —
// a weak (sub-50%) anchor could graft a paraphrased body sentence into a quote/table/figure or a
// references section. Unsafe targets are routed to the existing "Preserved source content" section (no
// content lost). This extracts the real _unsafeSentenceTarget (DOM-only) and exercises it under jsdom.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const _s = dp.indexOf('const _unsafeSentenceTarget = (el) => {');
const _e = dp.indexOf('\n    };', _s) + '\n    };'.length;
if (_s === -1 || _e < 0) throw new Error('extraction markers for _unsafeSentenceTarget missing');
const _unsafeSentenceTarget = new Function(dp.slice(_s, _e) + '\nreturn _unsafeSentenceTarget;')();

const el = (html, sel) => new DOMParser().parseFromString(html, 'text/html').querySelector(sel);

describe('_unsafeSentenceTarget: rejects structurally-invalid + semantically-isolated targets', () => {
  it('a normal body <p> or <h2> is a SAFE target', () => {
    expect(_unsafeSentenceTarget(el('<main><p id="a">body text here</p></main>', '#a'))).toBe(false);
    expect(_unsafeSentenceTarget(el('<main><h2 id="a">A heading</h2></main>', '#a'))).toBe(false);
  });
  it('a <td>/<th> is UNSAFE (a sibling <p> in a <tr> is malformed)', () => {
    expect(_unsafeSentenceTarget(el('<table><tr><td id="a">cell</td></tr></table>', '#a'))).toBe(true);
    expect(_unsafeSentenceTarget(el('<table><tr><th id="a">head</th></tr></table>', '#a'))).toBe(true);
  });
  it('an <li>/<dt>/<dd> is UNSAFE (a sibling <p> in a list is malformed)', () => {
    expect(_unsafeSentenceTarget(el('<ul><li id="a">item</li></ul>', '#a'))).toBe(true);
    expect(_unsafeSentenceTarget(el('<dl><dt id="a">term</dt></dl>', '#a'))).toBe(true);
  });
  it('a <p> INSIDE a blockquote/table/figure is UNSAFE (semantically isolated)', () => {
    expect(_unsafeSentenceTarget(el('<blockquote><p id="a">quoted</p></blockquote>', '#a'))).toBe(true);
    expect(_unsafeSentenceTarget(el('<figure><figcaption><p id="a">cap</p></figcaption></figure>', '#a'))).toBe(true);
  });
  it('a <p> inside a References/Bibliography section is UNSAFE', () => {
    expect(_unsafeSentenceTarget(el('<section aria-label="References"><p id="a">[1] Smith</p></section>', '#a'))).toBe(true);
    expect(_unsafeSentenceTarget(el('<section aria-label="Footnotes"><p id="a">note</p></section>', '#a'))).toBe(true);
    // a section with an UNRELATED label is still safe
    expect(_unsafeSentenceTarget(el('<section aria-label="Introduction"><p id="a">intro</p></section>', '#a'))).toBe(false);
  });
  it('null / non-element → treated as unsafe (never insert)', () => {
    expect(_unsafeSentenceTarget(null)).toBe(true);
    expect(_unsafeSentenceTarget({})).toBe(true);
  });
});

describe('anti-drift: the guard + the raised fallback are wired into restoreSentencesDeterministic', () => {
  it('the weak 0.4 fallback is raised to 0.5', () => {
    expect(dp).toMatch(/const matched = pickBest\(0\.6\) \|\| pickBest\(0\.5\)/);
    expect(dp).not.toMatch(/pickBest\(0\.6\) \|\| pickBest\(0\.4\)/);
  });
  it('insertion is gated on the target guard, and unsafe targets route to the Preserved section', () => {
    expect(dp).toMatch(/if \(bestBlock\.el\.parentNode && !_unsafeSentenceTarget\(bestBlock\.el\)\) \{/);
    // the else branch routes to the orphan/Preserved-source-content collection
    expect(dp).toMatch(/\} else \{[\s\S]{0,260}orphanSentenceIndices\.add\(sentIdx\);[\s\S]{0,120}orphanByWord\.push/);
  });
});
