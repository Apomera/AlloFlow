// recov-coverage (2026-06-15): integrityCoverage counted the out-of-reading-order
// Content-recovery appendix toward the final-text char count, re-inflating coverage and
// masking genuine reading-order loss (suppressing the "review the Diff" warning). The fix
// strips section[data-content-recovery="true"] from the FINAL html before measuring (only
// for the integrity numerator — htmlToPlainText/textCharCount stay global). This pins the
// real extracted stripper.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('const _stripRecoveryAppendix = (h) => String(h || \'\')');
const end = src.indexOf('\n        const _finalForIntegrity', start);
if (start === -1 || end === -1) throw new Error('extraction markers for _stripRecoveryAppendix missing');
const _stripRecoveryAppendix = new Function(src.slice(start, end) + '\n; return _stripRecoveryAppendix;')();

const APPENDIX = '<section data-content-recovery="true" aria-label="Content recovery" style="margin-top:2em">' +
  '<h2>Content recovery</h2><p>Words from the source document that could not be confidently placed:</p>' +
  '<ul><li>Shawn — source context: "the student Shawn Smith"</li></ul></section>';

describe('recov-coverage — strip the Content-recovery appendix before measuring coverage', () => {
  it('removes the appendix (recovered word + boilerplate) from the measured final text', () => {
    const html = '<main><p>the board approved the budget today</p>' + APPENDIX + '</main>';
    const stripped = _stripRecoveryAppendix(html);
    expect(stripped).not.toContain('Shawn');           // recovered (out-of-order) word excluded
    expect(stripped).not.toContain('Content recovery'); // appendix boilerplate excluded
    expect(stripped).toContain('the board approved the budget'); // real in-order body kept
  });

  it('is a no-op when there is no appendix (zero regression for clean docs)', () => {
    const html = '<main><p>nothing dropped here</p></main>';
    expect(_stripRecoveryAppendix(html)).toBe(html);
  });

  it('strips regardless of attribute order / single quotes', () => {
    const html = "<main><p>x</p><section aria-label='Content recovery' data-content-recovery='true'><p>Zphqx</p></section></main>";
    expect(_stripRecoveryAppendix(html)).not.toContain('Zphqx');
  });

  it('strips multiple appendices (extended-across-passes case)', () => {
    const html = '<main><p>body</p>' + APPENDIX + '<section data-content-recovery="true"><p>Second</p></section></main>';
    const stripped = _stripRecoveryAppendix(html);
    expect(stripped).not.toContain('Shawn');
    expect(stripped).not.toContain('Second');
  });

  it('newly reflects reading-order loss: stripped final is shorter than appendix-inflated final', () => {
    // a 6-char word survived ONLY in the appendix → stripped final excludes it → lower coverage
    const html = '<main><p>short body</p>' + APPENDIX + '</main>';
    const withAppendix = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
    const strippedLen = _stripRecoveryAppendix(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
    expect(strippedLen).toBeLessThan(withAppendix); // coverage numerator drops → warning can fire
  });

  it('anti-drift: the integrity numerator measures the stripped final', () => {
    expect(src).toContain('finalText = _normIntegrity(htmlToPlainText(_finalForIntegrity)).length;');
    expect(src).toContain('finalText = textCharCount(_finalForIntegrity);');
  });
});
