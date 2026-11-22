// Wave 11B (2026-11-22): WCAG 2.4.4 descriptive link text vs. source URL token & numeric fidelity.
// Verifies that replacing raw printed URLs (http(s)://, bare www., mailto:, bare emails, tel:) with
// descriptive link text while preserving the EXACT destination in a visible, non-empty <a href="...">
// produces 0 false missing-number warnings and 100% MCP contentCoverage recall — while dropped,
// truncated, altered, hidden, empty, or duplicated URLs and dropped prose/table numbers STILL fail closed.
import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { createRequire } from 'node:module';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const NarrationPlanner = require('../desktop/mcp/remediation_narration_plan.cjs');

const PURE_PATH = path.resolve('remediation_modules/pipeline/01_pure_helpers_and_policies.js');
const ORCH_PATH = path.resolve('remediation_modules/pipeline/01b_core_orchestration_head.js');
const FIX_PATH = path.resolve('remediation_modules/pipeline/03b_core_fix_loop.js');

const PURE_SRC = fs.readFileSync(PURE_PATH, 'utf8');
const ORCH_SRC = fs.readFileSync(ORCH_PATH, 'utf8');
const FIX_SRC = fs.readFileSync(FIX_PATH, 'utf8');

const opts = { file: '01_pure_helpers_and_policies.js', includeEnd: true };
const loadNumericHelpers = (DOMParserImpl) => new Function(
  'DOMParser',
  sliceBetween(PURE_SRC, 'var _extractNumericTokens = function', '\n};', opts) + '\n'
  + sliceBetween(PURE_SRC, 'var _numericFidelityLosses = function', '\n// Factory: returns all pipeline functions', {
    file: '01_pure_helpers_and_policies.js',
    includeStart: true,
    includeEnd: false,
  })
  + '\nreturn { _extractNumericTokens, _numericFidelityLosses, _alloPreservedHrefUrls, _alloPreservedHrefUrlNumbers };'
)(DOMParserImpl);

const htmlToPlain = (html) => {
  const dom = new JSDOM('<body>' + String(html || '') + '</body>');
  dom.window.document.querySelectorAll('script,style,template,[hidden]').forEach((n) => n.remove());
  return (dom.window.document.body.textContent || '').replace(/\s+/g, ' ').trim();
};

describe('Wave 11B: numeric fidelity preserved-href URL helpers (01_pure_helpers_and_policies.js)', () => {
  const jsdomParser = new JSDOM('').window.DOMParser;
  const withDom = loadNumericHelpers(jsdomParser);
  const noDom = loadNumericHelpers(undefined);

  it('extracts normalized http(s)://, mailto:, and tel: hrefs cleanly (with &amp; and trailing punctuation)', () => {
    const html = [
      '<p><a href="https://www2.ed.gov/about/offices/list/osers/osep/policy/eos_soi_philly_012716.pdf">OSEP Statement</a></p>',
      '<p><a href="https://example.gov/search?id=182002&amp;mode=full">Search Record</a></p>',
      '<p><a href="http://www.lep.gov/resources/EOS_SOI_Philly_012716.pdf/">LEP Resource</a></p>',
      '<p><a href="mailto:Lisa.Pagano@ed.gov">Email Lisa Pagano</a></p>',
      '<p><a href="tel:+1-800-555-0199">Call Support</a></p>',
      '<p><a href="https://hidden.example.gov/999999.pdf" style="display:none">Hidden</a></p>',
      '<p><a href="https://empty.example.gov/888888.pdf"></a></p>',
      '<p><a href="javascript:alert(12345)">Bad</a></p>',
    ].join('');

    for (const helpers of [withDom, noDom]) {
      const urls = helpers._alloPreservedHrefUrls(html);
      expect(urls.has('http://www2.ed.gov/about/offices/list/osers/osep/policy/eos_soi_philly_012716.pdf')).toBe(true);
      expect(urls.has('http://example.gov/search?id=182002&mode=full')).toBe(true);
      expect(urls.has('http://www.lep.gov/resources/eos_soi_philly_012716.pdf')).toBe(true);
      expect(urls.has('mailto:lisa.pagano@ed.gov')).toBe(true);
      expect(urls.has('tel:+18005550199')).toBe(true);
      // Hidden, empty, and non-http/mailto/tel links are strictly excluded.
      expect(urls.has('http://hidden.example.gov/999999.pdf')).toBe(false);
      expect(urls.has('http://empty.example.gov/888888.pdf')).toBe(false);
      expect(urls.size).toBe(5);
    }
  });

  it('(a) replacing raw URLs containing digits with WCAG 2.4.4 descriptive link text produces 0 false missing-number losses', () => {
    const src = [
      'Case No. 15-04782 (E.D. Pa.). The SOI, filed January 25, 2016, is available at www.lep.gov/resources/EOS_SOI_Philly_012716.pdf.',
      'DOJ Guidance, 67 Fed. Reg. 41,455 (June 18, 2002), available at https://www.justice.gov/crt/about/cor/lep/DOJFinLEPFRJun182002.pdf.',
      'See also https://example.gov/policy/eos_soi_philly_012716.pdf and https://example.gov/item?a=1&b=2048.',
    ].join(' ');

    const html = [
      '<p>Case No. 15-04782 (E.D. Pa.). The SOI, filed January 25, 2016, is available in the ',
      '<a href="http://www.lep.gov/resources/EOS_SOI_Philly_012716.pdf">OSEP Statement of Interest — Philadelphia (PDF)</a>.</p>',
      '<p>DOJ Guidance, 67 Fed. Reg. 41,455 (June 18, 2002), available in the ',
      '<a href="https://www.justice.gov/crt/about/cor/lep/DOJFinLEPFRJun182002.pdf">DOJ Final LEP Guidance (PDF)</a>.</p>',
      '<p>See also <a href="https://example.gov/policy/eos_soi_philly_012716.pdf">Philadelphia Policy Statement (PDF)</a> ',
      'and <a href="https://example.gov/item?a=1&amp;b=2048">Reference Item</a>.</p>',
    ].join('');

    const plain = htmlToPlain(html);
    for (const helpers of [withDom, noDom]) {
      // Without outputHtml, the digits inside the replaced raw URLs would have been flagged:
      expect(helpers._numericFidelityLosses(src, plain)).toEqual(expect.arrayContaining(['012716', '182002', '2048']));
      // With outputHtml, exact preserved hrefs credit ONLY those URL digits -> 0 false losses:
      expect(helpers._numericFidelityLosses(src, plain, html)).toEqual([]);
    }
  });

  it('(b) dropping, truncating, altering, or hiding href STILL triggers missing-number fidelity losses', () => {
    const src = 'Read https://example.gov/policy/eos_soi_philly_012716.pdf for details.';

    const droppedLink = '<p>Read OSEP Statement of Interest for details.</p>';
    const alteredHref = '<p>Read <a href="https://example.gov/policy/eos_soi_philly_012717.pdf">OSEP Statement of Interest</a> for details.</p>';
    const truncatedHref = '<p>Read <a href="https://example.gov/policy/">OSEP Statement of Interest</a> for details.</p>';
    const emptyAnchor = '<p>Read <a href="https://example.gov/policy/eos_soi_philly_012716.pdf"></a> for details.</p>';
    const hiddenAnchor = '<p>Read <a href="https://example.gov/policy/eos_soi_philly_012716.pdf" style="display:none">OSEP Statement</a> for details.</p>';

    for (const html of [droppedLink, alteredHref, truncatedHref, emptyAnchor, hiddenAnchor]) {
      const plain = htmlToPlain(html);
      expect(withDom._numericFidelityLosses(src, plain, html)).toEqual(['012716']);
      expect(noDom._numericFidelityLosses(src, plain, html)).toEqual(['012716']);
    }
  });

  it('(b) dropping a prose/table number like 012716 OUTSIDE a preserved URL is STILL flagged (even if the same digits appear in a preserved URL or raw-URL link)', () => {
    const src = 'Docket 012716 is posted at https://example.gov/policy/eos_soi_philly_012716.pdf.';
    // Prose 012716 dropped, descriptive link preserves href:
    const descHtml = '<p>Docket is posted at <a href="https://example.gov/policy/eos_soi_philly_012716.pdf">OSEP Statement</a>.</p>';
    expect(withDom._numericFidelityLosses(src, htmlToPlain(descHtml), descHtml)).toEqual(['012716']);
    // Prose 012716 dropped, raw URL kept visible as link text (anti-double-counting):
    const rawHtml = '<p>Docket is posted at <a href="https://example.gov/policy/eos_soi_philly_012716.pdf">https://example.gov/policy/eos_soi_philly_012716.pdf</a>.</p>';
    expect(withDom._numericFidelityLosses(src, htmlToPlain(rawHtml), rawHtml)).toEqual(['012716']);
    // Both prose 012716 and preserved href intact -> 0 losses:
    const okHtml = '<p>Docket 012716 is posted at <a href="https://example.gov/policy/eos_soi_philly_012716.pdf">OSEP Statement</a>.</p>';
    expect(withDom._numericFidelityLosses(src, htmlToPlain(okHtml), okHtml)).toEqual([]);
  });

  it('enforces 1-to-1 multiplicity and handles wrapped PDF URLs and tel:/mailto: strictly', () => {
    // Source prints the same URL twice; output only keeps one link -> second copy's digits are still flagged.
    const dupSrc = 'Link A: https://example.gov/doc_012716.pdf and Link B: https://example.gov/doc_012716.pdf';
    const oneLink = '<p>Link A: <a href="https://example.gov/doc_012716.pdf">Doc A</a> and Link B: removed</p>';
    expect(withDom._numericFidelityLosses(dupSrc, htmlToPlain(oneLink), oneLink)).toEqual(['012716']);

    // Wrapped PDF URL across a line break matches when exact joined href is preserved.
    const wrappedSrc = 'Available at https://www2.ed.gov/about/offices/\neos_soi_philly_012716.pdf today.';
    const wrappedHtml = '<p>Available at <a href="https://www2.ed.gov/about/offices/eos_soi_philly_012716.pdf">OSEP Policy</a> today.</p>';
    expect(withDom._numericFidelityLosses(wrappedSrc, htmlToPlain(wrappedHtml), wrappedHtml)).toEqual([]);

    // tel: URI in source matched by tel: href, while a dropped bare prose phone number is STILL flagged.
    const telSrc = 'Dial tel:+1-800-555-0199 or call 207-624-6661.';
    const telKeptPhoneDropped = '<p>Dial <a href="tel:+1-800-555-0199">Support Line</a> or call us.</p>';
    const telLosses = withDom._numericFidelityLosses(telSrc, htmlToPlain(telKeptPhoneDropped), telKeptPhoneDropped);
    expect(telLosses).toEqual(expect.arrayContaining(['207', '624', '6661']));
    expect(telLosses).not.toContain('0199');
  });

  it('wires preserved-href URL number credit into both pipeline numeric fidelity call sites (01b recompute & 03b final gate)', () => {
    expect(ORCH_SRC).toMatch(/_numericFidelityLosses\(sourceText,[\s\S]*?_alloPreservedHrefUrlNumbers\(sourceText,\s*_stripSinks\(html\)\)/);
    expect(FIX_SRC).toMatch(/_numericFidelityLosses\(_srcRaw,[\s\S]*?_alloPreservedHrefUrlNumbers\(_srcRaw,\s*_finalForIntegrity\)/);
  });
});

describe('Wave 11B: MCP contentCoverage (assessSourceCoverage) preserved-href URL recall', () => {
  beforeAll(() => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    globalThis.DOMParser = dom.window.DOMParser;
  });

  // Also verify serialized browser-eval path used by remediation_headless_driver.cjs
  const assessViaEval = (args) => (0, eval)('(' + NarrationPlanner.assessSourceCoverage.toString() + ')')(args);

  it('(a) ed-parent-guide-idea.pdf style bare www. and https:// footnote URLs replaced with descriptive WCAG link text achieve 100% token recall', () => {
    const src = [
      '[1] Case No. 15-04782 (E.D. Pa.). The SOI, which was filed on January 25, 2016, is available at www.lep.gov/resources/EOS_SOI_Philly_012716.pdf .',
      '[3] DOJ Guidance, 67 Fed. Reg. 41,455 (June 18, 2002), available at https://www.justice.gov/crt/about/cor/lep/DOJFinLEPFRJun182002.pdf .',
      'If you have questions, please contact Lisa Pagano at Lisa.Pagano@ed.gov .',
    ].join('\n');

    const html = [
      '<main>',
      '<p>[1] Case No. 15-04782 (E.D. Pa.). The SOI, which was filed on January 25, 2016, is available at ',
      '<a href="http://www.lep.gov/resources/EOS_SOI_Philly_012716.pdf">OSEP Statement of Interest — Philadelphia (PDF)</a>.</p>',
      '<p>[3] DOJ Guidance, 67 Fed. Reg. 41,455 (June 18, 2002), available at ',
      '<a href="https://www.justice.gov/crt/about/cor/lep/DOJFinLEPFRJun182002.pdf">DOJ Final LEP Guidance (PDF)</a>.</p>',
      '<p>If you have questions, please contact Lisa Pagano at <a href="mailto:Lisa.Pagano@ed.gov">Lisa Pagano email</a>.</p>',
      '</main>',
    ].join('');

    const res = assessViaEval({ sourceText: src, outputHtml: html, method: 'pdfjs' });
    expect(res).toMatchObject({
      status: 'matched',
      reviewRequired: false,
      missingTokens: 0,
      tokenRecall: 1,
      preservedHrefUrlsCount: 3,
    });
    expect(res.missingWords).toEqual([]);
  });

  it('(a) handles https:// URL with digits, &amp; query params, and line-wrapped PDF URLs with 100% recall', () => {
    const src = [
      'Read https://example.gov/policy/eos_soi_philly_012716.pdf for the full text.',
      'Lookup https://example.gov/search?a=1&b=182002 or https://www2.ed.gov/about/\noffices/eos_soi_philly_012716.pdf now.',
    ].join(' ');

    const html = [
      '<p>Read <a href="https://example.gov/policy/eos_soi_philly_012716.pdf">OSEP Policy Statement</a> for the full text.</p>',
      '<p>Lookup <a href="https://example.gov/search?a=1&amp;b=182002">Search Results</a> or ',
      '<a href="https://www2.ed.gov/about/offices/eos_soi_philly_012716.pdf">ED Office Policy</a> now.</p>',
    ].join('');

    const res = NarrationPlanner.assessSourceCoverage({ sourceText: src, outputHtml: html, method: 'pdfjs' });
    expect(res).toMatchObject({
      status: 'matched',
      reviewRequired: false,
      missingTokens: 0,
      tokenRecall: 1,
      preservedHrefUrlsCount: 3,
    });
  });

  it('(b) dropping, altering, truncating, hiding, or emptying href STILL triggers contentCoverage review', () => {
    const src = 'The SOI is available at www.lep.gov/resources/EOS_SOI_Philly_012716.pdf for parents.';

    const dropped = '<p>The SOI is available in the OSEP Statement of Interest for parents.</p>';
    const altered = '<p>The SOI is available in the <a href="http://www.lep.gov/resources/EOS_SOI_Philly_012717.pdf">OSEP Statement</a> for parents.</p>';
    const truncated = '<p>The SOI is available in the <a href="http://www.lep.gov/resources/">OSEP Statement</a> for parents.</p>';
    const hidden = '<p>The SOI is available in the <a href="http://www.lep.gov/resources/EOS_SOI_Philly_012716.pdf" style="display:none">OSEP Statement</a> for parents.</p>';
    const empty = '<p>The SOI is available in the <a href="http://www.lep.gov/resources/EOS_SOI_Philly_012716.pdf"></a> for parents.</p>';

    for (const html of [dropped, altered, truncated, hidden, empty]) {
      const res = NarrationPlanner.assessSourceCoverage({ sourceText: src, outputHtml: html, method: 'pdfjs' });
      expect(res.status).toBe('review_required');
      expect(res.reviewRequired).toBe(true);
      expect(res.missingTokens).toBeGreaterThan(0);
      expect(res.missingWords.map((w) => w.word)).toContain('eos_soi_philly_012716');
    }
  });

  it('(b) dropping a prose/table number outside a preserved URL (even matching URL digits) STILL triggers contentCoverage review', () => {
    const src = 'Docket 012716 is posted at https://example.gov/policy/eos_soi_philly_012716.pdf today.';
    const droppedProseDesc = '<p>Docket is posted at <a href="https://example.gov/policy/eos_soi_philly_012716.pdf">OSEP Policy</a> today.</p>';
    const r1 = NarrationPlanner.assessSourceCoverage({ sourceText: src, outputHtml: droppedProseDesc, method: 'pdfjs' });
    expect(r1.reviewRequired).toBe(true);
    expect(r1.missingWords.map((w) => w.word)).toContain('012716');

    // Anti-double-counting: raw URL printed verbatim in link text CANNOT mask a dropped prose token ("2016")
    const src2 = 'Report 2016 at https://example.gov/2016/report.pdf today.';
    const rawLinkDroppedProse = '<p>Report at <a href="https://example.gov/2016/report.pdf">https://example.gov/2016/report.pdf</a> today.</p>';
    const r2 = NarrationPlanner.assessSourceCoverage({ sourceText: src2, outputHtml: rawLinkDroppedProse, method: 'pdfjs' });
    expect(r2.reviewRequired).toBe(true);
    expect(r2.missingWords.map((w) => w.word)).toContain('2016');
  });
});
