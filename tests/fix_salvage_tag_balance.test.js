// (2026-11-08) NCES keyless rerun: a fix pass wrapped the Contents and List of Figures lists in <nav>. The content gate
// refused the chunk, and the partial salvage kept the runs that passed one by one: the "<nav ...>" opening tags, without
// the "</nav>" that closed them. Both landmarks stayed open to the end of the document, and everything after Contents
// sat inside two nested navs. The gate judges text, so nothing noticed. Kept runs must keep every container balanced.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const PIPE = readFileSync(process.env.ALLO_PIPELINE_SOURCE || resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const code = sliceBetween(PIPE, 'var _ALLO_SALVAGE_SPLIT = ', '// What the next fix pass is told about edits the content gate refused', { file: 'doc_pipeline_source.jsx' });
const { salvage, balance } = new Function(code + '\nreturn { salvage: _alloSalvageFixCandidate, balance: _alloTagBalance };')();

const INPUT = '<main><p>Contents</p><ul><li>Chapter one</li><li>Chapter two</li></ul><h2>Chapter one</h2><p>Text of the chapter.</p></main>';
const WRAPPED = '<main><p>Contents</p><nav aria-label="Contents"><ul><li>Chapter one</li><li>Chapter two</li></ul></nav><h2>Chapter one</h2><p>Text of the chapter.</p></main>';
const ok = (h) => ({ accepted: true, html: h });

describe('partial acceptance of a refused fix candidate keeps every container balanced', () => {
  it('counts opening minus closing tags of containers only, ignoring comments and scripts', () => {
    expect(balance('<nav><ul><li>x</li></ul>')).toMatchObject({ nav: 1, ul: 0 });
    expect(balance('<div><!-- <div> --><script>var s = "<div>";</script></div>')).toMatchObject({ div: 0 });
    expect(balance('<p>one<p>two<li>three')).toMatchObject({ ul: 0, nav: 0 });
  });
  it('drops an opening <nav> whose closing tag was refused (the NCES failure)', () => {
    // the gate refuses any state that contains the closing tag, as it did for the chunk that held it
    const s = salvage(WRAPPED, INPUT, (h) => (h.includes('</nav>') ? { accepted: false } : ok(h)));
    expect(s === null || balance(s.html).nav === 0).toBe(true);
    if (s) expect(s.html).not.toContain('<nav');
  });
  it('keeps a wrapper whose opening and closing tags both pass, even though they fall in different runs', () => {
    const s = salvage(WRAPPED, INPUT, ok);
    expect(s).not.toBeNull();
    expect(s.html).toBe(WRAPPED);
    expect(balance(s.html).nav).toBe(0);
  });
  it('still keeps the other edits when only the wrapper is dropped', () => {
    // (a changed segment right next to the wrapper's would merge into the same run, so this one is a segment away)
    const cand = WRAPPED.replace('<p>Text of the chapter.</p>', '<p class="lead">Text of the chapter.</p>');
    const s = salvage(cand, INPUT, (h) => (h.includes('</nav>') ? { accepted: false } : ok(h)));
    expect(s).not.toBeNull();
    expect(s.html).toContain('<p class="lead">');
    expect(s.html).not.toContain('<nav');
    expect(balance(s.html).nav).toBe(0);
  });
  it('leaves an input that was already unbalanced no worse', () => {
    const odd = '<main><div><p>One</p><h2>Two</h2></main>';
    const s = salvage(odd.replace('<h2>Two</h2>', '<h2 id="two">Two</h2>'), odd, ok);
    expect(s).not.toBeNull();
    expect(balance(s.html).div).toBe(balance(odd).div);
  });
  it('is the same function the fix passes call', () => {
    expect(PIPE.includes('s = _alloSalvageFixCandidate(candidate, input, (h) => acceptFixedHtmlDetailed(h, input, { fragment, mode: \'faithful\', strictContent: true }));')).toBe(true);
  });
});
