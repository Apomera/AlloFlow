// Page-range runs (2026-10-28, NCES Condition of Education pages 22-25): what a slice says about
// itself and what it borrows from the rest of the document. Runs the real source code, sliced out.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

// The env override points the test at a private copy for mutation checks; the shared file is never written.
const PIPE = readFileSync(process.env.ALLO_PIPELINE_SOURCE || resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const F = { file: 'doc_pipeline_source.jsx' };
const linksForRange = new Function(sliceBetween(PIPE, 'function _alloLinksForPageRange(links, pageRange) {', '\nfunction _reattachSourceLinks', { ...F, includeStart: true })
  + '\nreturn _alloLinksForPageRange;')();
const footer = new Function(sliceBetween(PIPE, 'var _alloOutputProvenanceFooterHtml = function (opts) {', '\n// Right-to-left script detection', { ...F, includeStart: true })
  + '\nreturn _alloOutputProvenanceFooterHtml;')();
const capNameLine = sliceBetween(PIPE, '      const _capName = ', '\n', { ...F, includeStart: true });
const capName = new Function('_capAlt', capNameLine + '\nreturn _capName;');

describe('links restored into a page-range run come from its own pages', () => {
  const links = [
    { text: 'Report on the Condition of Education', url: 'https://nces.ed.gov/pubs2023/2023144.pdf', occurrences: 1, byPage: { 4: 1 } },
    { text: 'Racial/Ethnic Enrollment in Public Schools', url: 'https://nces.ed.gov/programs/coe/indicator/cge', occurrences: 3, byPage: { 23: 1, 40: 2 } },
    { text: 'Digest of Education Statistics', url: 'https://nces.ed.gov/programs/digest/current_tables.asp', occurrences: 2, byPage: { 6: 1, 22: 1 } },
  ];
  it('keeps only links printed inside the range, with the in-range count as the budget', () => {
    const r = linksForRange(links, [22, 25]);
    expect(r.map((l) => [l.url.split('/').pop(), l.occurrences])).toEqual([['cge', 1], ['current_tables.asp', 1]]);
    expect(links[1].occurrences).toBe(3); // the published record is not changed
  });
  it('a whole-document run keeps every link as it was', () => {
    expect(linksForRange(links, null)).toBe(links);
    expect(linksForRange(links, [0, 0])).toBe(links);
  });
  it('a record without per-page counts is not restored into a slice (a missed link beats an invented one)', () => {
    expect(linksForRange([{ text: 'Old record link text', url: 'https://example.org/a', occurrences: 1 }], [1, 2])).toEqual([]);
  });
  it('an open-ended range runs to the end of the document', () => {
    expect(linksForRange(links, [23, 0]).map((l) => l.occurrences)).toEqual([3]);
  });
});

describe('the provenance footer names the slice', () => {
  const when = new Date(2026, 9, 28);
  it('a range run says which pages of how many', () => {
    expect(footer({ date: when, fileNameHtml: 'nces.pdf', pageCount: 4, pageRange: [22, 25], totalPages: 54 })).toContain('Original file: nces.pdf (pages 22-25 of 54).');
    expect(footer({ date: when, fileNameHtml: 'nces.pdf', pageCount: 1, pageRange: [7, 7], totalPages: 54 })).toContain('(page 7 of 54).');
    // an unknown or inconsistent total is left out rather than stated wrong
    expect(footer({ date: when, fileNameHtml: 'nces.pdf', pageCount: 4, pageRange: [22, 25], totalPages: 1 })).toContain('(pages 22-25).');
  });
  it('a whole-document run is unchanged', () => {
    expect(footer({ date: when, fileNameHtml: 'a.pdf', pageCount: 3, pageRange: null, totalPages: 3 })).toContain('Original file: a.pdf (3 pages).');
  });
});

describe('the structure prompt of a single-pass range run lists only its own headings', () => {
  it('filters the tag-tree outline to the range, like the chunked branch', () => {
    const site = sliceBetween(PIPE, 'const _outlineHeadings = ', 'const _t2SinglePageScope', F);
    expect(site.includes('h.page >= Math.max(1, _pageRange[0]) && h.page <= Math.max(1, _pageRange[0]) + pageCount - 1')).toBe(true);
    expect(site.includes("_outlineHeadings.slice(0, 30).map(")).toBe(true);
    expect(site.includes('_sourceStruct.headings.slice(0, 30)')).toBe(false);
  });
});

describe('a chart-data caption names the chart', () => {
  it('a prefix that is only the chart type is not a name', () => {
    expect(capName('Line graph: traditional public enrollment fell from 47.4 to 45.4 million, 2010-2021')).toBe(null);
    expect(capName('Stacked bar chart: revenue by source')).toBe(null);
    expect(capName('Line chart of annual enrollment, FY08 to FY25: rises then falls')).toBe('Line chart of annual enrollment, FY08 to FY25');
    expect(capName('Enrollment by school type: three lines')).toBe('Enrollment by school type');
  });
});

describe('extraction records each link with its page and joins a link that wraps to the next line', () => {
  it('pairs carry their page, and a same-URL rect directly below continues the text', () => {
    const site = sliceBetween(PIPE, 'const _lastByUrl = new Map();', '// Column-aware reading order', F);
    expect(site.includes('const _pair = { text: _txt, url: _la.url, page: p };')).toBe(true);
    expect(site.includes('if (_prevLink && _txt && _ry1 <= _prevLink.ry0 + 0.5 * _lineH && _prevLink.ry0 - _ry1 <= 1.0 * _lineH) {')).toBe(true);
    expect(PIPE.includes('_byPair.get(_k).byPage[_lp.page] = (_byPair.get(_k).byPage[_lp.page] || 0) + 1;')).toBe(true);
    expect(PIPE.includes("const _srcLinks = _alloLinksForPageRange((typeof window !== 'undefined' && Array.isArray(window.__alloSourceLinks)) ? window.__alloSourceLinks : null, _pageRange);")).toBe(true);
  });
});

// IRS i1040 instructions, pages 35-38 (2026-10-28): a label printed beside every worksheet is not a subtitle.
const titleFn = new Function(sliceBetween(PIPE, 'function _alloTitleFromHeading(html) {', '\nfunction _alloExecutableActiveContentFindings', { ...F, includeStart: true })
  + '\nreturn _alloTitleFromHeading;')();
describe('the page title does not take a recurring label as the subtitle', () => {
  const h1 = '<h1>Standard Deduction Worksheet for Dependents - Line 12e</h1>';
  it('a line printed again later in the document stays out of the title', () => {
    expect(titleFn(h1 + '<p>Keep for Your Records</p><p>Use this worksheet.</p><h2>Foreign Earned Income Tax Worksheet</h2><p>Keep for Your Records</p>'))
      .toBe('Standard Deduction Worksheet for Dependents - Line 12e');
    expect(titleFn(h1 + '<p>Keep for Your Records</p><h2>Other</h2><p style="margin:0">keep for your records</p>'))
      .toBe('Standard Deduction Worksheet for Dependents - Line 12e');
  });
  it('a subtitle printed once still names the document', () => {
    expect(titleFn(h1 + '<p>Keep for Your Records</p><p>Use this worksheet.</p>')).toBe('Standard Deduction Worksheet for Dependents - Line 12e \u2013 Keep for Your Records');
  });
});

// IRS i1040 (2026-10-28): leader dots are drawing, not text, in the character coverage.
const normCov = new Function(sliceBetween(PIPE, '  const _alloNormForCoverage = (s) =>', '\n  const _recomputeContentFidelity', { ...F, includeStart: true }) + '\nreturn _alloNormForCoverage;')();
describe('character coverage ignores leader dots', () => {
  it('a run of four or more dots (spaced or not) is dropped; an ellipsis and decimals stay', () => {
    expect(normCov('Enter the amount here . . . . . . . . 12')).toBe('Enter the amount here 12');
    expect(normCov('Total.........$40')).toBe('Total $40');
    expect(normCov('Wait... then 3.5 and 1.2.3')).toBe('Wait... then 3.5 and 1.2.3');
  });
});

// NSF 9-12 / NIST CSF 8-11 (2026-10-28): figure captions and AI findings merged across audit sections.
const captionSpan = new Function(sliceBetween(PIPE, 'function _alloCaptionSpan(desc, alt) {', '\n// (2026-10-28) REGROUPED vs SCRAMBLED.', { ...F, includeStart: true }) + '\nreturn _alloCaptionSpan;')();
describe('a figure caption is hidden from screen readers only when it repeats the alt', () => {
  it('a copy of the alt stays aria-hidden (it was already heard)', () => {
    expect(captionSpan('Bar chart of average scores', 'Bar chart of average scores')).toBe('<span aria-hidden="true">Bar chart of average scores</span>');
    expect(captionSpan('Bar chart of average scores, 2019.', 'Bar chart of average scores 2019')).toContain('aria-hidden="true"');
  });
  it('a longer description than the alt is readable by everyone', () => {
    const out = captionSpan('Horizontal bar chart of average scores (axis 0 to 600): Singapore 616, United States 515 & others', 'Average mathematics scores by country');
    expect(out).toBe('<span>Horizontal bar chart of average scores (axis 0 to 600): Singapore 616, United States 515 &amp; others</span>');
  });
  it('the figure template uses it', () => {
    expect(PIPE.includes('font-style:italic;margin-top:0.5em">${_alloCaptionSpan(desc, imgAlt)}</figcaption>')).toBe(true);
  });
});
describe('a finding merged across audit sections reaches the fixer once per section', () => {
  const entriesCode = sliceBetween(PIPE, "          const _axeEntry = (v, line) =>", '          let violationInstructions = ', F);
  const entries = (issues) => new Function('axeResults', 'equalAccessResults', 'verification', 'accessibleHtml', '_alloTitleIssueSettled', entriesCode + '\nreturn _fixEntries;')(null, null, { issues }, '<p>x</p>', () => false);
  it('each instance becomes its own entry with its own anchor', () => {
    const merged = { ruleId: 'alt-quality', issue: 'Figure 1 caption is aria-hidden', locator: { kind: 'exact', snippet: 'Figure 1' },
      instances: [{ issue: 'Figure 1 caption is aria-hidden', locator: { kind: 'exact', snippet: 'Figure 1' } }, { issue: 'Figure 5 caption is aria-hidden', locator: { kind: 'exact', snippet: 'Figure 5' } }, { issue: 'Figure 6 caption is aria-hidden', locator: { kind: 'chunk', chunks: [3] } }] };
    expect(entries([merged]).map((e) => [e.text, e.snippet])).toEqual([
      ['AI-FLAGGED: Figure 1 caption is aria-hidden', 'Figure 1'], ['AI-FLAGGED: Figure 5 caption is aria-hidden', 'Figure 5'], ['AI-FLAGGED: Figure 6 caption is aria-hidden', null]]);
  });
  it('a finding with one instance (or none recorded) is one entry, as before', () => {
    expect(entries([{ ruleId: 'link-text', issue: 'Click here', locator: { kind: 'exact', snippet: 'Click here' } }]).map((e) => [e.text, e.snippet])).toEqual([['AI-FLAGGED: Click here', 'Click here']]);
    expect(entries(['bare string finding']).map((e) => e.text)).toEqual(['AI-FLAGGED: bare string finding']);
  });
  it('the section merge keeps each instance and resolves its own locator', () => {
    expect(PIPE.includes("if (stored.instances.length < 20 && !stored.instances.some((x) => x._k === _instKey)) {")).toBe(true);
    expect(PIPE.includes("const instances = Array.isArray(iss.instances) && iss.instances.length > 1 ? iss.instances.map(({ _k, ...inst }) => inst) : undefined;")).toBe(true);
    expect(PIPE.includes("const r = _resolveIssueLocator(inst.location, _nhMerged, iss.pages);")).toBe(true);
  });
});

// NASA Artemis 15-18 (2026-10-28): printed page numbers and decorative figure slots.
const folios = new Function(sliceBetween(PIPE, 'var _alloFolioNumbers = function (pages) {', '\nvar _numericFidelityLosses = function', { ...F, includeStart: true }) + '\nreturn _alloFolioNumbers;')();
describe('a page\'s own printed number is not a lost value', () => {
  it('credits the page number among a page\'s first or last three words, once per page', () => {
    expect(folios([{ pageNum: 16, text: 'Preparations for Artemis I are well underway ... the launch. 16' }, { pageNum: 17, text: '17 In 2019, NASA conducted a test' }])).toBe('16 17');
    expect(folios([{ pageNum: 6, text: '6 | Science and Engineering Indicators 2022 body text here and more words follow' }])).toBe('6');
    expect(folios([{ pageNum: 9, text: 'body text https://ncses.nsf.gov/indicators | 9' }])).toBe('9');
    expect(folios([{ pageNum: 17, text: 'body text ends here -17-' }, { pageNum: 18, text: '(18) next page starts here' }])).toBe('17 18');
  });
  it('a number in the middle of the page, or another page\'s number, is not credited', () => {
    expect(folios([{ pageNum: 16, text: 'The crew of 16 astronauts trained for many months before the mission began' }])).toBe('');
    expect(folios([{ pageNum: 16, text: '17 is not this page' }])).toBe('');
    expect(folios(null)).toBe('');
  });
  it('both numeric checks add it to the output side', () => {
    expect((PIPE.match(/ \+ ' ' \+ _alloFolioNumbers\(typeof window !== 'undefined' \? window\.__lastGroundTruthPageMap : null\)\);/g) || []).length).toBe(2);
  });
});
describe('decorative figure slots need no picture', () => {
  it('the pairing note compares recovered images with the slots that need one', () => {
    const site = sliceBetween(PIPE, 'const _decoSlotCount = ', "warnLog('[PDF Fix] image pairing uncertain: '", F);
    expect(site.includes('/\\sdata-allo-decorative="true"/i.test(t)')).toBe(true);
    expect(site.includes('(_meaningfulSlots > 0 && _slotAlign.matched >= _meaningfulSlots)')).toBe(true);
  });
});

// USGS mineral guide 19-22 (2026-10-28): duplicate source links, running-header subtitle, "(N)" list numbers.
describe('the link restore counts links the HTML already has by normalized URL', () => {
  it('the author\'s link without a trailing slash spends the budget of pdf.js\'s normalized URL', () => {
    const PIPEFNS = PIPE;
    expect(PIPEFNS.includes("const _urlKey = (u) => String(u).replace(/&amp;/g, '&').trim().replace(/^([a-z][a-z0-9+.-]*:\\/\\/[^/?#]*)/i, (s) => s.toLowerCase()).replace(/\\/+$/, '');")).toBe(true);
    expect(PIPEFNS.includes('const k = _urlKey(l.url), have = _existing.get(k) || 0;')).toBe(true);
  });
  it('a wrapped link continues the previous rect for the SAME url, wherever its annotation sits', () => {
    const site = sliceBetween(PIPE, 'const _lastByUrl = new Map();', '// Column-aware reading order', F);
    expect(site.includes('const _prevLink = _lastByUrl.get(_la.url);')).toBe(true);
    expect(site.includes('_lastByUrl.set(_la.url, { ry0: _ry0, pair: _pair });')).toBe(true);
  });
});
describe('a running header with its page number is not the title\'s subtitle', () => {
  it('lines that differ only in their numbers recur', () => {
    const h = '<h1>The Life Cycle of a Mineral Deposit</h1><p>Hands-On Activities 13</p><p>Activity text.</p><p>Hands-On Activities 15</p>';
    expect(titleFn(h)).toBe('The Life Cycle of a Mineral Deposit');
  });
});
const listNums = (src, html) => new Function('DOMParser', sliceBetween(PIPE, 'var _alloListMarkerNumbers = function (srcText, html) {', '\n// (2026-10-28) A page\'s own printed number', { ...F, includeStart: true }) + '\nreturn _alloListMarkerNumbers;')(DOMParserImpl)(src, html);
let DOMParserImpl;
describe('list numbers printed "(N)" are the list\'s own', () => {
  it('credits (1)..(10) when the source prints them before the item words', async () => {
    DOMParserImpl = new (await import('jsdom')).JSDOM('').window.DOMParser;
    const items = ['Each player draws one card', 'The dealer shuffles again', 'Score the round', 'Pass the deck left', 'Count the chips', 'Swap seats', 'Draw two more', 'Discard one card', 'Reveal the hand', 'Record the winner'];
    const src = items.map((t, i) => '(' + (i + 1) + ') ' + t).join(' ');
    const html = '<ol>' + items.map((t) => '<li>' + t + '</li>').join('') + '</ol>';
    expect(listNums(src, html)).toBe('1 2 3 4 5 6 7 8 9 10');
  });
});

// Slices of tagged PDFs (2026-10-28): the audit's tag summary is whole-document; each slice prompt says so.
const sliceTagNote = new Function(sliceBetween(PIPE, 'function _alloSliceTagNote(structTree, first, last) {', '\n// (2026-10-28) A figure caption is hidden', { ...F, includeStart: true }) + '\nreturn _alloSliceTagNote;')();
describe('a slice audit is told the tag statistics cover the whole file', () => {
  const tree = { hasTags: true, headings: [{ level: 1, text: 'Chapter 1', page: 3 }, { level: 2, text: 'Artemis I and Mission Readiness', page: 16 }, { level: 3, text: 'SCIENCE', page: 17 }] };
  it('names the slice and lists only the headings tagged on its pages', () => {
    const note = sliceTagNote(tree, 15, 18);
    expect(note).toContain('cover the WHOLE file, not just pages 15');
    expect(note).toContain('Headings tagged on these pages: H2 "Artemis I and Mission Readiness"; H3 "SCIENCE".');
    expect(note).not.toContain('Chapter 1');
  });
  it('says so when the slice has no tagged heading, and adds nothing for an untagged file', () => {
    expect(sliceTagNote(tree, 40, 44)).toContain('No headings are tagged on these pages.');
    expect(sliceTagNote({ hasTags: false }, 1, 4)).toBe('');
    expect(sliceTagNote(null, 1, 4)).toBe('');
  });
  it('both sliced audits pass the tag tree, and every slice prompt carries the note', () => {
    expect((PIPE.match(/_auditPdfInSlices\(base64Data, auditPrompt, _auditCancelled, _auditPageRange, _auditSignal, _structTree\)/g) || []).length).toBe(2);
    expect(PIPE.includes("Report pageCount as ${totalPages}.`\n        + _alloSliceTagNote(structTree, s + 1, e);")).toBe(true);
  });
});

// NIST CSF / NASA / HB44 (2026-10-28): no fixer calls when only Equal Access reminders are left.
describe('the fixer is skipped when only Equal Access reminders are left', () => {
  const entriesCode = sliceBetween(PIPE, "          const _axeEntry = (v, line) =>", '          let violationInstructions = ', F);
  const rule = sliceBetween(PIPE, 'const _remindersOnly = ', ';\n', { ...F, includeStart: true });
  const decide = (axe, ea, issues) => new Function('axeResults', 'equalAccessResults', 'verification', 'accessibleHtml', '_alloTitleIssueSettled', '_feedbackNow',
    entriesCode + '\n' + rule + ';\nreturn _remindersOnly;')(axe, ea, { issues }, '<p>x</p>', () => false, '');
  const ea = (o) => Object.assign({ fails: [], potentialFindings: [], manualFindings: [] }, o);
  it('potential and manual reminders only: skip', () => {
    expect(decide(null, ea({ potentialFindings: [{ id: 'text_sensory_misuse', description: 'Check words like below', nodes: 3 }], manualFindings: [{ id: 'style_color_misuse', nodes: 1 }] }), [])).toBe(true);
  });
  it('any confirmed failure, axe finding or AI finding: the fixer runs', () => {
    expect(decide(null, ea({ fails: [{ id: 'img_alt_valid', nodes: 1 }], potentialFindings: [{ id: 'x', nodes: 1 }] }), [])).toBe(false);
    expect(decide({ critical: [], serious: [{ id: 'color-contrast', description: 'contrast', nodes: 2 }], moderate: [] }, ea({ potentialFindings: [{ id: 'x', nodes: 1 }] }), [])).toBe(false);
    expect(decide(null, ea({ potentialFindings: [{ id: 'x', nodes: 1 }] }), [{ ruleId: 'alt-quality', issue: 'Figure 2 alt is vague' }])).toBe(false);
    expect(decide(null, ea({}), [])).toBe(false); // nothing at all is the other skip branch
  });
});

// NASA 15-18 (2026-10-28): the editor's Replace handler dropped quotes from the alt ("NASA's" -> "NASAs").
describe('an alt carried into the editor handlers round-trips exactly', () => {
  const RENDERER = readFileSync(resolve(process.cwd(), 'doc_builder_renderer_source.jsx'), 'utf8');
  const pipeLine = sliceBetween(PIPE, '            const _altSafe = ', '\n', { ...F, includeStart: true });
  const rendLine = sliceBetween(RENDERER, '              const _imgAltSafe = ', '\n', { file: 'doc_builder_renderer_source.jsx', includeStart: true });
  const roundTrip = async (safe) => {
    const { JSDOM } = await import('jsdom');
    const el = new JSDOM('<button onclick="window.__got=\'' + safe + '\';">x</button>').window.document.querySelector('button');
    return new Function('window', el.getAttribute('onclick') + '\nreturn window.__got;')({});
  };
  const alt = 'NASA\'s "Pegasus" barge <moved> the core stage & engines';
  it('pipeline placeholder handlers', async () => {
    const safe = new Function('imgAlt', pipeLine + '\nreturn _altSafe;')(alt);
    expect(safe).not.toMatch(/["'<>&]/);
    expect(await roundTrip(safe)).toBe(alt);
  });
  it('renderer placeholder handlers', async () => {
    const safe = new Function('block', rendLine + '\nreturn _imgAltSafe;')({ description: alt });
    expect(safe).not.toMatch(/["'<>&]/);
    expect(await roundTrip(safe)).toBe(alt);
  });
  it('a backslash still cannot escape the string delimiter', async () => {
    const safe = new Function('imgAlt', pipeLine + '\nreturn _altSafe;')('trailing backslash \\');
    expect(await roundTrip(safe)).toBe('trailing backslash ');
  });
});

// NCES / NSF (2026-10-28): "AI-estimated" only when the values are not printed in the document.
const valuesPrinted = new Function(sliceBetween(PIPE, 'function _alloChartValuesPrinted(rows, pages) {', '\n// (2026-10-28) The tag-structure summary', { ...F, includeStart: true }) + '\nreturn _alloChartValuesPrinted;')();
describe('chart values printed in the document are transcribed, not estimated', () => {
  const pages = [{ pageNum: 24, text: 'Specific learning disability 32 Speech or language impairment 19 Autism 12 percent of 7,300,000' }];
  it('every number in the rows found in the page text: printed', () => {
    expect(valuesPrinted([['Specific learning disability', '32%'], ['Speech or language impairment', '19'], ['Autism', '12']], pages)).toBe(true);
    expect(valuesPrinted([['Total', '7,300,000'], ['Autism', '12']], pages)).toBe(true);
  });
  it('any number not printed, fewer than two numbers, or no page text: estimated', () => {
    expect(valuesPrinted([['Specific learning disability', '32'], ['Other', '14']], pages)).toBe(false);
    expect(valuesPrinted([['Autism', '12']], pages)).toBe(false);
    expect(valuesPrinted([['a', '32'], ['b', '19']], null)).toBe(false);
  });
  it('the caption and the note follow it', () => {
    expect(PIPE.includes("const _chartCaption = (_printedVals ? 'Chart data' : 'Chart data, AI-estimated') + (_capAlt ? ': ' + (_capName || _capShort) : '');")).toBe(true);
    expect(PIPE.includes("+ (_printedVals ? '<p><em>Values transcribed by AI from numbers printed in the document")).toBe(true);
  });
});

// NSF 9-12 (2026-10-28): the infographic re-extraction named "the specified pages" without naming any.
describe('the infographic re-extraction says which figure', () => {
  const code = sliceBetween(PIPE, '  const _reextractAsStructuredVisual = async (originalBlock, pdfBase64, pdfMimeType, pageRange, callGeminiVisionFn) => {', '    let raw;', { ...F, includeStart: true });
  const promptFor = (block, range) => new Function('_untrustedPromptDataBlock', code + '\nreturn prompt; };\nreturn _reextractAsStructuredVisual;')((l, t) => '[' + l + ': ' + t + ']')(block, 'b64', 'application/pdf', range, () => null);
  it('uses the figure\'s own page, then the run range, and otherwise points at the hints', async () => {
    expect(await promptFor({ page: 10, caption: 'Figure 3' }, [9, 12])).toContain('Focus on pages 10 through 10 of the PDF.');
    expect(await promptFor({ caption: 'Figure 3' }, [9, 12])).toContain('Focus on pages 9 through 12 of the PDF.');
    const none = await promptFor({ caption: 'Figure 3' }, null);
    expect(none).not.toContain('specified pages');
    expect(none).toContain('Look at the ONE figure the caption and description hints above describe');
  });
});

// HB44 58-61 (2026-10-28): a slice's active-content note says the scan covers the whole file and promises no PDF export.
describe('active-content note on a page-range run', () => {
  it('has its own wording on a slice; whole-document runs keep theirs', () => {
    const site = sliceBetween(PIPE, 'if (_ac && _ac.any && _pageRange && (_pageRange[0] || _pageRange[1])) {', '} else if (_ac && _ac.any) {', { ...F, includeStart: true });
    expect(site.includes("msg: 'The original PDF file (the whole document, not only these pages) contains '")).toBe(true);
    expect(site.includes('tagged-PDF')).toBe(false);
  });
});
