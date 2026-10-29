// Open items from the 2026-10-25/26 keyless corpus (budget, osep, syllabus_sie). Runs the real
// source code, sliced out.
//   1. A picture of a table that the structure pass rebuilt as a real <table> is not repeated in the
//      "Recovered source images" section (budget: 5 tables twice).
//   2. An image the structure pass marked decorative (alt "") ships with alt="" and no caption, and the
//      vision pass leaves it alone (budget: two clip-art pieces got 300-character alts and captions).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { JSDOM } from 'jsdom';
import { sliceBetween } from './helpers/anchored_slice.js';

// The env overrides point the test at a private copy for mutation checks; the shared files are never written.
const PIPE = readFileSync(process.env.ALLO_PIPELINE_SOURCE || resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const RENDERER = readFileSync(process.env.ALLO_RENDERER_SOURCE || resolve(process.cwd(), 'doc_builder_renderer_source.jsx'), 'utf8');
const F = { file: 'doc_pipeline_source.jsx' };
const matchers = sliceBetween(PIPE, 'var _alloTextOverlap = function', '// Pair figure slots with extracted images', F);
const _alloLegendImageClaims = new Function(matchers + '\nreturn _alloLegendImageClaims;')();

// ── 1. table pictures ────────────────────────────────────────────────────────────────────────────
const claimCode = sliceBetween(PIPE, 'const _unplacedImg = (j) =>', "if (_legendImg.some(Boolean)) warnLog(", { ...F, label: 'table claims' });
const claim = new Function('bodyContent', 'extractedImages', '_imageTexts', '_pairedImg', 'imgIdx', '_legendImg', '_alloLegendImageClaims',
  claimCode + '\nreturn { _tableImg, _unclaimedIdx };');
const TABLE = '<table><caption>General Fund budgeted revenue by source: approved 2024-2025 and working 2025-2026</caption><thead><tr><th scope="col">Source</th><th scope="col">Approved 2024-2025 Budget</th><th scope="col">Working 2025-2026 Budget</th><th scope="col">Difference</th></tr></thead><tbody><tr><td>Local Assessments</td><td>1</td><td>2</td><td>1</td></tr></tbody></table>';
const TABLE_PIC = { type: 'diagram', description: "Picture of a table (no text layer) 'General Fund Budgeted Revenue' with columns Approved 2024-2025 Budget, Working 2025-2026 Budget, Difference and Increase for Local Assessments, State Subsidy" };
const LOGO = { type: 'logo', description: 'Mustangs logo: a running horse inside a circle.' };
const run = (body, imgs, paired) => claim(body, imgs, imgs.map((im) => [im.description, im.educationalPurpose].filter(Boolean).join(' ')),
  paired ? new Set(paired) : null, 0, imgs.map(() => false), _alloLegendImageClaims);

describe('a rebuilt table claims its own picture', () => {
  it('an unplaced table picture matching a real table is not recovered; an unrelated picture still is', () => {
    const r = run('<p>x</p>' + TABLE, [LOGO, TABLE_PIC], []);
    expect(r._tableImg).toEqual([false, true]);
    expect(r._unclaimedIdx).toEqual([0]);
  });
  it('without the table, the same picture is recovered', () => {
    expect(run('<p>x</p>', [LOGO, TABLE_PIC], [])._unclaimedIdx).toEqual([0, 1]);
  });
  it('a chart (or photo, logo, illustration) keeps its picture even when a table holds the same data', () => {
    for (const type of ['chart', 'photo', 'logo', 'illustration', 'Chart']) {
      expect(run(TABLE, [{ ...TABLE_PIC, type }], [])._unclaimedIdx, type).toEqual([0]);
    }
  });
  it('a placed picture is never claimed, and an AI chart-data table claims nothing', () => {
    expect(run(TABLE, [TABLE_PIC], [0])._tableImg).toEqual([false]);
    const chartData = TABLE.replace('<caption>', '<caption>Chart data, AI-estimated: ');
    expect(run(chartData, [TABLE_PIC], [])._unclaimedIdx).toEqual([0]);
  });
  it('one table claims at most one picture', () => {
    expect(run(TABLE, [TABLE_PIC, { ...TABLE_PIC }], [])._unclaimedIdx).toEqual([1]);
  });
  it('the claim is logged', () => {
    expect(PIPE.includes("picture(s) of a table were rebuilt as real tables — the pictures are not repeated in the recovery section.')")).toBe(true);
  });
});

// ── 2. decorative images ─────────────────────────────────────────────────────────────────────────
function rendererFigureOpen(alt) {
  const code = sliceBetween(RENDERER, 'const _shortAlt = typeof block.alt', "+ `<button type=\"button\" contenteditable=\"false\"", { file: 'doc_builder_renderer_source.jsx', label: 'renderer figure open' })
    .replace(/\n\s*$/, '');
  const fn = new Function('block', '_imgId', '_attr', code.replace(/return `/, 'return `') + ';');
  return fn({ type: 'image', alt, description: 'Decorative clip art of a dollar sign.' }, 'pdf-img-ph-a', (v) => String(v).replace(/"/g, '&quot;'));
}
const decCode = sliceBetween(PIPE, '            if (/^<figure\\b[^>]*\\sdata-allo-decorative="true"/i.test(match)) {', '+ _carriedOut;\n            }', { ...F, includeEnd: true, label: 'decorative slot' });
const decorative = (match, hasSrc) => {
  const map = {}, meta = {};
  const out = new Function('match', 'hasSrc', 'imgInfo', 'imgIdx', 'imgId', '_carriedOut', '_deferredImageMap', '_deferredImageMeta',
    'let _decorativeSlots = 0; const r = (() => {' + decCode + '\nreturn null; })(); return { r, n: _decorativeSlots };')(
    match, hasSrc, hasSrc ? { generatedSrc: 'data:image/png;base64,AAAA' } : null, 3, 'pdf-img-3', '<p>carried</p>', map, meta);
  return { ...out, map, meta };
};

describe('an explicit empty alt marks the image decorative', () => {
  it('the renderer stamps data-allo-decorative only for alt "" (not a missing or real alt)', () => {
    expect(rendererFigureOpen('')).toContain(' data-allo-decorative="true"');
    expect(rendererFigureOpen('   ')).toContain(' data-allo-decorative="true"');
    expect(rendererFigureOpen(undefined)).not.toContain('data-allo-decorative');
    expect(rendererFigureOpen('Dollar sign')).not.toContain('data-allo-decorative');
    expect(rendererFigureOpen('Dollar sign')).toContain('data-allo-alt="Dollar sign"');
  });
  it('the pipeline ships a placed decorative picture with alt="", role presentation, kind preset and no caption', () => {
    const d = decorative('<figure id="x" data-img-placeholder="true" data-allo-decorative="true"><figcaption>Decorative clip art</figcaption></figure>', true);
    expect(d.n).toBe(1);
    expect(d.r).toBe('<figure id="pdf-img-3-figure" data-img-idx="3" data-allo-decorative="true" role="none" style="margin:1em 0"><img src="__ALLOFLOW_DATAURL_FINAL_3__" alt="" role="presentation" data-allo-kind="decorative" style="max-width:100%"></figure><p>carried</p>');
    expect(d.map.__ALLOFLOW_DATAURL_FINAL_3__).toBe('data:image/png;base64,AAAA');
    expect(d.meta.__ALLOFLOW_DATAURL_FINAL_3__).toEqual({ alt: '', purpose: '', decorative: true });
  });
  it('with no picture the decorative slot is dropped (no upload placeholder for a decoration)', () => {
    const d = decorative('<figure id="x" data-img-placeholder="true" data-allo-decorative="true"></figure>', false);
    expect(d.r).toBe('<p>carried</p>');
    expect(d.n).toBe(1);
  });
  it('an ordinary slot is untouched by this branch', () => {
    const d = decorative('<figure id="x" data-img-placeholder="true" data-allo-alt="Logo"></figure>', true);
    expect(d.r).toBe(null);
    expect(d.n).toBe(0);
  });
  it('the vision pass skips images whose kind is already set, and dropped-image recovery skips decorations', () => {
    expect(PIPE.includes("/^data:image\\//i.test(im.getAttribute('src') || '') && !im.getAttribute('data-allo-kind'));")).toBe(true);
    expect(PIPE.includes("if (recoveryMeta && recoveryMeta.decorative) return '';")).toBe(true);
  });
});

// ── 3. delivered-file leftovers + what the AI auditor reads ──────────────────────────────────────
const _stripExecutableScripts = new Function(
  sliceBetween(PIPE, 'function _stripGeneratedImageEditorControls(html, stripFileHandlers) {', 'function _alloSanitizeRemediationHtml', F)
  + sliceBetween(PIPE, 'function _stripExecutableScripts(html, opts) {', '\n}', { ...F, includeEnd: true })
  + '\nreturn _stripExecutableScripts;')();
const BASE_CSS = '[data-alloflow-image-replace]:has(input:focus-visible) { outline: 2px solid #ffffff; outline-offset: 2px; box-shadow: 0 0 0 4px #000000; }\n'
  + '@media print { body { padding: 0.5in; } .sr-only { display: none; } label input[type="file"] { display: none !important; } label:has(input[type="file"]) { display: none !important; } button[onclick*="pdfCropImage"] { display: none !important; } }\n';

describe('the delivered file drops editor leftovers', () => {
  const doc = '<style>p{}\n' + BASE_CSS + '</style><main><div class="ds1" data-chunk-start="0"></div>\n<p>One.</p><div data-chunk-end="0" style="display:none"></div><div data-chunk-start="1" style="display:none"> </div><p>Two.</p></main>';
  it('static delivery removes empty chunk markers and the editor-control CSS', () => {
    const out = _stripExecutableScripts(doc, { stripImageReplace: true });
    expect(out).not.toContain('data-chunk-');
    expect(out).not.toContain('data-alloflow-image-replace');
    expect(out).not.toContain('pdfCropImage');
    expect(out).not.toContain('input[type="file"]');
    expect(out).toContain('@media print { body { padding: 0.5in; } .sr-only { display: none; } }');
    expect(out).toContain('<p>One.</p><p>Two.</p>');
  });
  it('a chunk marker holding content is kept, and the app preview (no stripImageReplace) keeps everything', () => {
    expect(_stripExecutableScripts('<div data-chunk-start="2"><p>kept</p></div>', { stripImageReplace: true })).toContain('data-chunk-start="2"');
    expect(_stripExecutableScripts(doc)).toContain('data-chunk-start="0"');
    expect(_stripExecutableScripts(doc)).toContain('pdfCropImage');
  });
  it('the AI auditor reads no executable script (data scripts stay)', () => {
    const line = sliceBetween(PIPE, 'const _auditHtmlForModel = _stripDataUrlsForAi(htmlContent).html', ';', F);
    const strip = new Function('htmlContent', '_stripDataUrlsForAi', line.replace('const _auditHtmlForModel =', 'return') + ';');
    const html = '<head><script>\nwindow.__pdfCropImage = function(){};\n</script><script type="application/ld+json">{"a":1}</script><script type=module>x()</script></head><body><p>t</p></body>';
    const out = strip(html, (h) => ({ html: h }));
    expect(out).toBe('<head><script type="application/ld+json">{"a":1}</script></head><body><p>t</p></body>');
  });
});

// ── 4. one h1: the source outline is shown one level down when it tags several H1s ──────────────
const outlineCode = sliceBetween(PIPE, '      const _outlineShift =', '      const _sourceHeadingsDirective =', F);
// (2026-10-28) the slice now also builds the page-range outline filter; a whole-document run has no range.
const outline = (headings) => new Function('_sourceStruct', '_pageRange', 'pageCount', outlineCode + '\nreturn { shift: _outlineShift, levels: _sourceStruct.headings.map(_outlineLevel), note: _outlineNote };')({ hasTags: true, headings }, null, 0);
describe('the source heading outline agrees with the single-h1 rule', () => {
  it('several H1 sections (osep) are listed as H2 and everything below moves down one, capped at 6', () => {
    const o = outline([{ level: 1 }, { level: 2 }, { level: 1 }, { level: 6 }, { level: 3 }]);
    expect(o.shift).toBe(1);
    expect(o.levels).toEqual([2, 3, 2, 6, 4]);
    expect(o.note).toContain('only h1');
  });
  it('a single H1 (the title) or none leaves the levels as tagged', () => {
    expect(outline([{ level: 1 }, { level: 2 }, { level: 3 }]).levels).toEqual([1, 2, 3]);
    expect(outline([{ level: 2 }, { level: 3 }]).levels).toEqual([2, 3]);
    expect(outline([{ level: 1 }]).note).toBe('');
  });
  it('both directives (whole-document and per-chunk) use the shifted level and the note', () => {
    expect((PIPE.match(/H\$\{_outlineLevel\(h\)\}/g) || []).length).toBe(2);
    expect(PIPE.includes('do not re-infer from font):\\n${_outlineNote}${outline}\\n`;')).toBe(true);
    expect(PIPE.includes('the document loses structure that the source explicitly encoded.\\n${_outlineNote}\\n${outline}')).toBe(true);
  });
});

// ── 5. a sentence split by the page-range chunking is one paragraph again ────────────────────────
const join = new Function(sliceBetween(PIPE, 'var _alloJoinChunkSplitParagraphs = function', '\nvar _alloEnsureSingleH1', F) + '\nreturn _alloJoinChunkSplitParagraphs;')();
const P = (text) => ({ type: 'p', text });
describe('chunk-split paragraphs rejoin', () => {
  it('joins osep\'s split sentence, without editing the cached chunk arrays', () => {
    const a = [P('x'), P('assess the child in all areas related to the suspected disability,')];
    const b = [P('including, if appropriate, social and emotional status.'), P('Next.')];
    const arrays = [a, b];
    expect(join(arrays)).toBe(1);
    expect(arrays[0].map((x) => x.text)).toEqual(['x', 'assess the child in all areas related to the suspected disability, including, if appropriate, social and emotional status.']);
    expect(arrays[1].map((x) => x.text)).toEqual(['Next.']);
    expect(a[1].text).toBe('assess the child in all areas related to the suspected disability,'); // originals untouched
    expect(b.length).toBe(2);
  });
  it('a word hyphen-broken across the boundary joins without a space', () => {
    const arrays = [[P('evidence-')], [P('based practice'), P('n')]];
    join(arrays);
    expect(arrays[0][0].text).toBe('evidence-based practice');
  });
  it('does not join after closing punctuation, before a capital, a lettered item, a heading, or when the next chunk has one block', () => {
    for (const [tail, head] of [['End.', 'and more'], ['Asked?', 'and more'], ['Note:', 'and more'], ['(see p. 4)', 'and more'], ['the', 'The'], ['as follows', 'a) first item'], ['quoted”', 'and']]) {
      const arrays = [[P(tail)], [P(head), P('z')]];
      expect(join(arrays), tail + ' | ' + head).toBe(0);
    }
    expect(join([[P('the')], [{ type: 'h2', text: 'section' }, P('z')]])).toBe(0);
    expect(join([[P('the')], [P('only block')]])).toBe(0);
    expect(join([[P('the')], null, [P('more'), P('z')]])).toBe(0);
    expect(join([[P('مرحبا')], [P('بالعالم'), P('z')]])).toBe(0); // caseless script: no join
  });
  it('is called on the chunk arrays before they are rendered', () => {
    expect(PIPE.includes("const _chunkJoins = _alloJoinChunkSplitParagraphs(chunkBlockArrays);\n        if (_chunkJoins) warnLog(")).toBe(true);
  });
});

// ── 6. the printed h1 names the page from the first audit on ─────────────────────────────────────
const titleHelper = sliceBetween(PIPE, 'function _alloTitleFromHeading(html) {', '\nfunction _alloExecutableActiveContentFindings', F);
const wrapCode = sliceBetween(PIPE, '      const _wrapTitleHtml =', '      let accessibleHtml = `<!DOCTYPE html>', F);
const wrapTitle = (bodyContent) => new Function('bodyContent', '_safeDocumentTitleHtml', titleHelper + wrapCode + '\nreturn _wrapTitleHtml;')(bodyContent, 'syllabus &amp; notes');
describe('the wrapper title', () => {
  it('uses the first plain-text h1, whitespace collapsed', () => {
    expect(wrapTitle('<header><h1 id="t">SIE 515\n  Human-Computer Interaction</h1></header><h1>Second</h1>')).toBe('SIE 515 Human-Computer Interaction');
  });
  it('adds a short subtitle line printed right under the h1 (agenda2, 2026-10-27)', () => {
    const agenda = '<h1 id="m">Maine School Administrative District No. 35</h1>\n<p style="margin:0">Board of Directors – Regular Meeting Agenda</p><p>Marshwood High School</p>';
    expect(wrapTitle(agenda)).toBe('Maine School Administrative District No. 35 – Board of Directors – Regular Meeting Agenda');
    expect(wrapTitle('<h1>Budget &amp; Plan</h1><p>Fiscal Year 2026 &lt;draft&gt;</p>')).toBe('Budget &amp; Plan – Fiscal Year 2026 &lt;draft&gt;');
  });
  it('keeps the h1 alone when the next line is a sentence, a URL, an address, one word, too long, a repeat, or not a <p>', () => {
    const form = 'STATE COMPLAINT INVESTIGATION REQUEST FORM';
    for (const next of ['<p>This form may be used to file a state complaint investigation request.</p>', '<p><a href="https://x.org/a">https://x.org/a</a></p>',
      '<p>www.rsu35.org/board</p>', '<p>dueprocess.doe@maine.gov</p>', '<p>www.rsu35.org board stream page</p>', '<p>Email dueprocess.doe@maine.gov for help</p>', '<p>Instructions</p>', '<p>' + 'word '.repeat(20) + '</p>', '<p>Investigation Request Form</p>',
      '<p>Wednesday, June 18, 2025<br>7:00pm</p>', '<h2>Section one</h2><p>Second line here</p>', '<p>Please send to:</p>'])
      expect(wrapTitle('<h1>' + form + '</h1>' + next), next).toBe(form);
  });
  it('keeps the escaped placeholder when there is no plain-text h1', () => {
    expect(wrapTitle('<p>no heading</p>')).toBe('Accessible Document — syllabus &amp; notes');
    expect(wrapTitle('<h1><span>marked up</span></h1>')).toBe('Accessible Document — syllabus &amp; notes');
    expect(wrapTitle('<h1>   </h1>')).toBe('Accessible Document — syllabus &amp; notes');
  });
  it('the wrapper writes it into <title>', () => {
    expect(PIPE.includes('\n<title>${_wrapTitleHtml}</title>\n<style>')).toBe(true);
  });
});

// ── 7. chart-data captions end at a sentence or a word, never mid-word ───────────────────────────
const capCode = sliceBetween(PIPE, '      const _capShort =', "+ '…'])[0];", { ...F, includeEnd: true });
const cap = (alt) => new Function('_capAlt', capCode + '\nreturn _capShort;')(alt);
describe('chart-data table caption', () => {
  it('a short alt is kept whole', () => {
    expect(cap('Pie chart of revenue: Local 62.54%, State 30.64%.')).toBe('Pie chart of revenue: Local 62.54%, State 30.64%.');
  });
  it('a long alt is cut at its first sentence end (not a decimal point) within 160 characters', () => {
    const alt = 'Line chart of State General Purpose Aid, FY 2011 to FY 2026: about $13.1 million in FY 2011, rising to $15.1 million. Then it climbs again for six more years until the end.';
    expect(cap(alt)).toBe('Line chart of State General Purpose Aid, FY 2011 to FY 2026: about $13.1 million in FY 2011, rising to $15.1 million.');
  });
  it('with no sentence end it is cut at the last word and marked with an ellipsis', () => {
    // Character 160 falls inside "recovering", so a plain 160-character cut would split that word.
    const alt = 'Line chart of annual enrollment, FY08 to FY25: about 3,570 students in FY08 falling steadily to about 2,980 in FY20, dropping to about 2,740 in FY21, then recovering to about 2,700 in FY25';
    const out = cap(alt);
    expect(out).toBe('Line chart of annual enrollment, FY08 to FY25: about 3,570 students in FY08 falling steadily to about 2,980 in FY20, dropping to about 2,740 in FY21, then…');
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(161);
    expect(alt.startsWith(out.slice(0, -1))).toBe(true);
    expect(alt[out.length - 1]).toMatch(/[\s,]/); // the cut falls between words
  });
});

// ── 8. an AI "not an issue" settles only the elements the model was shown ────────────────────────
const applyTriage = new Function(sliceBetween(PIPE, "var _ALLO_AI_SETTLED_REMINDERS = ['style_color_misuse'];", '\n// ── LaTeX → spoken English', F) + '\nreturn _alloApplyReminderTriage;')();
describe('reminder triage covers what was shown', () => {
  const ea = (nodes) => ({ failViolations: 0, potentialViolations: 1, manualViolations: 0, potentialFindings: [{ id: 'style_color_misuse', nodes, description: 'd' }], manualFindings: [] });
  const tri = (nodesShown) => ({ dispositions: [Object.assign({ key: 'equalAccess|potential|style_color_misuse', action: 'not-an-issue', reason: 'Only focus styles.' }, nodesShown == null ? {} : { nodesShown })] });
  it('a one-node finding judged not-an-issue is acknowledged (older dispositions count as one shown)', () => {
    expect(applyTriage(ea(1), tri(null)).acknowledgedByAiReview).toHaveLength(1);
    expect(applyTriage(ea(1), tri(1)).potentialViolations).toBe(0);
  });
  it('a three-node finding is acknowledged only when the model saw all three', () => {
    expect(applyTriage(ea(3), tri(1)).potentialViolations).toBe(1);
    expect(applyTriage(ea(3), tri(1)).acknowledgedByAiReview).toBeUndefined();
    expect(applyTriage(ea(3), tri(3)).acknowledgedByAiReview[0].reason).toBe('Only focus styles.');
  });
});

// ── 9. alt-quality caution: prices are not LaTeX, and the caution names what it found ────────────
const altQuality = new Function(sliceBetween(PIPE, 'var _alloAltQuality = function (alt, opts) {', '\n// Scan a remediated document', F) + '\nreturn _alloAltQuality;')();
const aqMsgCode = sliceBetween(PIPE, "      const _aqKinds = {", "      try {\n        altQualityReport = _alloScanAltQuality(accessibleHtml);", F);
const aqMsg = new Function(aqMsgCode + '\nreturn _aqNoteMsg;')();
describe('image-description quality caution', () => {
  it('two dollar amounts are not a LaTeX span; real inline math still is', () => {
    const ids = (alt) => altQuality(alt).issues.map((i) => i.id);
    expect(ids('Line chart of State General Purpose Aid: about $13.1 million in FY 2011, rising to $15.1 million in FY 2020.')).not.toContain('raw-latex');
    expect(ids('Prices: $5 and $10 per seat for the trip.')).not.toContain('raw-latex');
    expect(ids('The formula $E = mc^2$ written on a chalkboard.')).toContain('raw-latex');
    expect(ids('Equation \\frac{1}{2} m v^2 for kinetic energy')).toContain('raw-latex');
  });
  it('names the issue kinds found and quotes each alt up to 80 characters, cut at a word', () => {
    const long = 'Picture of a table (no text layer) comparing per pupil total operating costs across the state average and the district';
    const msg = aqMsg({ highCount: 2, flagged: [
      { alt: 'IMG_0417.jpg', severity: 'high', issues: ['filename'] },
      { alt: long, severity: 'high', issues: ['raw-latex', 'too-long'] },
      { alt: 'Too long but fine', severity: 'warn', issues: ['too-long'] }] });
    expect(msg).toBe('2 image descriptions tell a screen-reader user little or nothing (a file name, raw LaTeX code — e.g. "IMG_0417.jpg", "Picture of a table (no text layer) comparing per pupil total operating costs…"); edit them in the image review panel before distributing.');
    expect(msg).not.toContain('information-free');
  });
  it('one finding reads in the singular', () => {
    expect(aqMsg({ highCount: 1, flagged: [{ alt: 'Image', severity: 'high', issues: ['placeholder'] }] })).toMatch(/^1 image description tells a screen-reader user little or nothing \(placeholder text — e\.g\. "Image"\)/);
  });
});

describe('the source link count in the log', () => {
  it('names distinct destinations and the annotation total (civics: 6 annotations, 1 URL)', () => {
    expect(PIPE.includes("              _srcLinkUrls.add(_u);\n              _srcLinkAnnotTotal++;")).toBe(true);
    expect(PIPE.includes("' distinct link destination(s) in the source (' + _srcLinkAnnotTotal + ' link annotation(s))")).toBe(true);
  });
});

// ── 10. fix-pass fragments end on a whole block (2026-10-27, civics) ─────────────────────────────
const splitFix = new Function(
  sliceBetween(PIPE, '  const splitHtmlOnTagBoundary = (html, size) => {', '\n  };', { ...F, includeEnd: true })
  + '\nreturn splitHtmlOnTagBoundary;')();
describe('fix-pass fragments', () => {
  const p1 = '<p>' + 'a'.repeat(120) + '</p>';
  const p2 = '<p>' + 'b'.repeat(40) + '<strong>x</strong>' + 'c'.repeat(200) + '</p>';
  it('cut after a closing block tag in the latter half, never after an inline tag mid-paragraph', () => {
    const chunks = splitFix(p1 + p2, 200);
    expect(chunks[0]).toBe(p1);
    expect(chunks.join('')).toBe(p1 + p2);
  });
  it('without a block end in the latter half the earlier rules still apply (any top-level tag end)', () => {
    const short = '<p>' + 'a'.repeat(20) + '</p>';
    const late = '<p>' + 'b'.repeat(80) + '<strong>x</strong>' + 'c'.repeat(200) + '</p>';
    const chunks = splitFix(short + late, 200);
    expect(chunks[0]).toBe(short + '<p>' + 'b'.repeat(80) + '<strong>x</strong>');
    expect(chunks.join('')).toBe(short + late);
  });
  it('a list is still never cut inside', () => {
    const list = '<ul>' + Array.from({ length: 8 }, (_, k) => '<li>' + String(k).repeat(30) + '</li>').join('') + '</ul>';
    const chunks = splitFix('<p>' + 'a'.repeat(150) + '</p>' + list + '<p>end</p>', 200);
    expect(chunks.some((c) => c.includes('<ul>') && !c.includes('</ul>'))).toBe(false);
  });
});

// ── 11. tagged PDF: text drawn interleaved with other text still links exactly (2026-10-27, osep2) ─
const ilRun = new Function(sliceBetween(PIPE, 'var _alloInterleavedExactRun = function', '\nvar _alloEnsureSingleH1', F) + '\nreturn _alloInterleavedExactRun;')();
const B = (key, pageRef = 'p1') => ({ key, pageRef });
const all = () => true;
describe('interleaved exact linking', () => {
  // osep: a body paragraph and footnote 10 both cross the page 4/5 turn, drawn inside each other.
  const blocks = [B('ingeneral,ieptea'), B('mmeetingsprovide'), B('10assistancetostates', 'p4'), B('parentscritical', 'p5'), B('opportunities.', 'p5'), B('forinfants.', 'p5')];
  it('rebuilds a paragraph exactly, skipping the footnote lines drawn in between', () => {
    expect(ilRun(blocks, all, 'ingeneral,ieptea' + 'mmeetingsprovide' + 'parentscritical' + 'opportunities.')).toEqual([0, 1, 3, 4]);
    expect(ilRun(blocks, all, '10assistancetostates' + 'forinfants.')).toEqual([2, 5]);
  });
  it('never links a text it cannot rebuild exactly, and ignores claimed blocks', () => {
    expect(ilRun(blocks, all, 'ingeneral,ieptea' + 'mmeetingsprovide' + 'parentsCRITICAL')).toBe(null);
    expect(ilRun(blocks, (k) => k !== 3, 'ingeneral,ieptea' + 'mmeetingsprovide' + 'parentscritical')).toBe(null);
    expect(ilRun(blocks, all, 'zzzz' + 'mmeetingsprovide')).toBe(null);
    // nearly all of it (47 of 49 characters) is still not exact
    expect(ilRun(blocks, all, 'ingeneral,ieptea' + 'mmeetingsprovide' + 'parentscritical' + 'zz')).toBe(null);
  });
  it('drops a word-break hyphen at a block end', () => {
    expect(ilRun([B('assess-'), B('mentoftheneeds')], all, 'assessmentoftheneeds')).toEqual([0, 1]);
  });
  it('stops after 120 skipped blocks or more than 2 page turns', () => {
    const far = [B('startofthetext')].concat(Array.from({ length: 121 }, (_, k) => B('x' + k)), [B('endofit')]);
    expect(ilRun(far, all, 'startofthetextendofit')).toBe(null);
    const near = [B('startofthetext')].concat(Array.from({ length: 119 }, (_, k) => B('x' + k)), [B('endofit')]);
    expect(ilRun(near, all, 'startofthetextendofit')).toEqual([0, 120]);
    expect(ilRun([B('startofthetext', 'a'), B('x', 'b'), B('y', 'c'), B('endofit', 'd')], all, 'startofthetextendofit')).toBe(null);
    expect(ilRun([B('startofthetext', 'a'), B('x', 'b'), B('endofit', 'c')], all, 'startofthetextendofit')).toEqual([0, 2]);
  });
  it('a list item may start without its printed "1." or bullet (stripFirst uses the block\'s marker-free key)', () => {
    const li = [{ key: '1.considerationandaction', keyNoMarker: 'considerationandaction', pageRef: 'p' }, { key: 'toapprovetheminutes', pageRef: 'p' }];
    expect(ilRun(li, all, 'considerationandactiontoapprovetheminutes', true)).toEqual([0, 1]);
    expect(ilRun(li, all, 'considerationandactiontoapprovetheminutes', false)).toBe(null);
    expect(PIPE.includes("const done = _alloInterleavedExactRun(blockStream, _ilFree, tKey, lf.role === 'LBody');")).toBe(true);
    // list items run in a SECOND, later pass on leftovers only (irs1040: an early pass took near-match's blocks)
    expect(PIPE.indexOf("_ilPass({ LBody: 1, TH: 1 }, 'list item(s) / header cell(s)');")).toBeGreaterThan(PIPE.indexOf("warnLog('[Stage4b-Unique] linked '"));
    expect(PIPE.includes("_ilPass({ H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, P: 1, BlockQuote: 1, Caption: 1, Note: 1 }, 'leaf/leaves');")).toBe(true);
  });
  it('a heading printed with a run-in colon links to its unique block (syllabus_bio "Lecture Plan:")', () => {
    expect(PIPE.includes("if (keyRun === tKey || (/^H[1-6]$/.test(lf.role) && keyRun === tKey + ':')) { hits.push({ start: s, end: e }); break; }")).toBe(true);
  });
  it('a text-drawing form repeated on 2+ pages is wrapped as /Artifact (running header), one on a single page is not', () => {
    expect(PIPE.includes('for (const [k, s] of _tfPages) if (s.size >= 2) _repeatedTextForms.add(k);')).toBe(true);
    expect(PIPE.includes("if (furnitureForms.has(name)) { if (inArtifact) return m; furnitureWrapped++; return '/Artifact BMC\\n' + m + '\\nEMC'; }")).toBe(true);
    expect(PIPE.includes('{ repeatedTextForms: _repeatedTextForms, splitFont: _splitFont, keepFirstArtifacts: _keepFirstArtifacts }')).toBe(true);
  });
  it('AI-made chart data and image transcripts are left out of the tagged PDF', () => {
    expect(PIPE.includes("if (el.closest && el.closest('details.allo-chart-data, details.allo-imagetext')) {")).toBe(true);
  });
  it('the tagged-PDF builder runs it before the near-match pass, for paragraphs/headings with a key of 12+ characters', () => {
    const at = PIPE.indexOf("const done = _alloInterleavedExactRun(blockStream, _ilFree, tKey, lf.role === 'LBody');");
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(PIPE.indexOf('// ── Near-match pass (2026-10-16)'));
    expect(PIPE.includes('if (tKey.length < 12) continue;\n              const done = _alloInterleavedExactRun(')).toBe(true);
  });
});

describe('budget2 leftovers', () => {
  it('static delivery drops data-crop attributes', () => {
    const out = _stripExecutableScripts('<figure id="pdf-img-1-figure" data-img-idx="1" data-crop="{&quot;page&quot;:3,&quot;x&quot;:10}" style="margin:1em 0"><img src="a.png" alt="x"></figure>', { stripImageReplace: true });
    expect(out).not.toContain('data-crop');
    expect(out).toContain('data-img-idx="1" style="margin:1em 0"');
  });
  it('chart data keeps up to 16 rows (a 12-slice pie lost slices at 8)', () => {
    expect(PIPE.includes('parsed.chartData.rows.slice(0, 16)')).toBe(true);
    expect(PIPE.includes("AT MOST 16 rows (one per slice, bar or point)")).toBe(true);
  });
});

// ── 13. vector drawings can be figures in the tagged PDF (2026-10-27, osep: the seal) ─────────────
const vec = new Function(sliceBetween(PIPE, 'var _alloFormLooksLikeFigure = function', '\nvar _alloEnsureSingleH1', F) + '\nreturn { looks: _alloFormLooksLikeFigure, pair: _alloPairFigureDraws };')();
describe('vector figures', () => {
  const paths = 'q 0 0 1 rg\n' + '10 10 m 20 20 l 30 10 l f\n'.repeat(12) + 'Q';
  it('a drawing with no text and no nested form qualifies; text, a nested form or a tiny draw does not', () => {
    expect(vec.looks(paths, false)).toBe(true);
    expect(vec.looks(paths + '\nBT /F1 12 Tf (Seal)Tj ET', false)).toBe(false);
    expect(vec.looks('BT\n' + paths, false)).toBe(false);
    expect(vec.looks(paths, true)).toBe(false);
    expect(vec.looks('0 0 m 1 1 l S', false)).toBe(false);
    expect(vec.looks(paths + ' /BTx gs', false)).toBe(true); // a name containing BT is not a text object
  });
  const img = (p) => ({ form: false, pageRef: p });
  const form = (p, xref) => ({ form: true, pageRef: p, xref });
  it('images alone keep the old exact rule, and then every drawing is decoration', () => {
    const draws = [img('1'), form('1', 'X'), img('2')];
    const r = vec.pair(2, draws);
    expect(r.pairs).toEqual([draws[0], draws[2]]);
    expect(r.decorative).toEqual([draws[1]]);
  });
  it('a drawing completes the count only when the images alone cannot (osep: 1 figure, 0 images, the seal)', () => {
    const seal = form('1', 'Fm0');
    expect(vec.pair(1, [seal])).toMatchObject({ pairs: [seal], decorative: [] });
    const draws = [img('1'), form('2', 'A'), img('3')];
    expect(vec.pair(3, draws).pairs).toEqual(draws);
  });
  it('a drawing on 2+ pages (letterhead, background) is never paired', () => {
    const a = form('1', 'L'), b = form('2', 'L');
    const r = vec.pair(1, [a, b]);
    expect(r.pairs).toBe(null);
    expect(r.decorative).toEqual([a, b]);
    expect(vec.pair(2, [a, b]).pairs).toBe(null);
  });
  it('last resort: only draws drawn ONCE in the document (notifications: a signature among repeated bullets)', () => {
    const bullet = (p) => ({ form: false, pageRef: p, xref: 'B' });
    const sig = { form: false, pageRef: '2', xref: 'S' };
    const draws = [bullet('1'), bullet('1'), sig, bullet('2'), bullet('3')];
    const r = vec.pair(1, draws);
    expect(r.mode).toBe('drawn-once');
    expect(r.pairs).toEqual([sig]);
    expect(r.decorative).toEqual([draws[0], draws[1], draws[3], draws[4]]); // the repeated bullets
    // two signatures for one figure: no exact count, nothing paired, images keep today's handling
    expect(vec.pair(1, draws.concat([{ form: false, pageRef: '3', xref: 'T' }]))).toMatchObject({ pairs: null, decorative: [] });
  });
  it('the old modes report themselves and leave unpaired images alone', () => {
    const a = { form: false, pageRef: '1', xref: 'A' }, f = form('1', 'F');
    expect(vec.pair(1, [a, f])).toMatchObject({ mode: 'images', decorative: [f] });
    expect(vec.pair(2, [a, f])).toMatchObject({ mode: 'with-drawings', decorative: [] });
  });
  it('no exact count, no pairing; no figures, nothing paired', () => {
    expect(vec.pair(4, [img('1'), form('1', 'X')]).pairs).toBe(null);
    expect(vec.pair(0, [form('1', 'X')])).toMatchObject({ pairs: null });
  });
});

// ── 15. run-in headings get their own block; common words are not running headers (2026-10-27) ────
const segLib = new Function(sliceBetween(PIPE, 'const _stage4_maskStrings = (s) => {', '  // _stage4_rewriteStream', F) + '\nreturn _stage4_parseBTSegments;')();
const artLib = new Function(sliceBetween(PIPE, '  const _stage6b_normalizeArtifactText', '  // _stage4_tryWrapPage — orchestrates', F) + '\nreturn _stage6b_detectArtifactHashes;')();
const seg = (stream, opts) => segLib(Uint8Array.from(stream, (c) => c.charCodeAt(0)), opts).map((g) => stream.slice(g.btStart, g.etEnd));
describe('run-in headings and running-header detection', () => {
  const line = 'BT /F2 12 Tf 72 700 Td (Integrated Pest Management) Tj /F1 12 Tf (M.S.A.D. #49 has developed) Tj 0 -14 Td (a plan) Tj ET';
  it('splitFont starts a new segment where the font NAME changes on one line (notifications)', () => {
    expect(seg(line, { fine: true, splitFont: true })).toEqual(['(Integrated Pest Management) Tj', '(M.S.A.D. #49 has developed) Tj', '(a plan) Tj']);
  });
  it('without splitFont (right-to-left documents, or no probe) the line stays one segment', () => {
    expect(seg(line, { fine: true })).toEqual(['(Integrated Pest Management) Tj /F1 12 Tf (M.S.A.D. #49 has developed) Tj', '(a plan) Tj']);
    expect(seg(line, { splitFont: true })).toEqual([line]); // coarse mode ignores it
  });
  it('re-selecting the SAME font, or a size change only, does not split', () => {
    expect(seg('BT /F1 12 Tf 72 700 Td (one) Tj /F1 14 Tf (two) Tj ET', { fine: true, splitFont: true })).toEqual(['(one) Tj /F1 14 Tf (two) Tj']);
  });
  it('createTaggedPdf turns it off for right-to-left languages and passes it to the probe and the page step', () => {
    expect(PIPE.includes("const _splitFont = !/^(ar|he|iw|fa|ur|ps|yi|dv|sd|ug|ckb|syr)(-|$)/i.test(lang);")).toBe(true);
    expect(PIPE.includes('_stage4_probeSegmentTexts(_srcBytes.slice(), { splitFont: _splitFont })')).toBe(true);
    expect(PIPE.includes('{ repeatedTextForms: _repeatedTextForms, splitFont: _splitFont, keepFirstArtifacts: _keepFirstArtifacts }')).toBe(true);
  });
  const it_ = (str, y) => ({ str, y });
  const pages = (n, extra) => Array.from({ length: n }, (_, p) => [it_('Page ' + (p + 1) + ' Agenda', 760), it_('of', 400), it_('and', 300), it_('body ' + p, 500), it_('footer text', 40)].concat(extra || []));
  it('a word repeated on every page in the BODY is not an artifact; header/footer text still is (agenda)', () => {
    const set = artLib(pages(7));
    expect(set.has('of')).toBe(false);
    expect(set.has('and')).toBe(false);
    expect(set.has('footer text')).toBe(true);
  });
  it('a table row drawn as ONE TJ splits into one TJ per cell at gaps of 0.4 em or more (expenditures)', () => {
    // (the mask..rewriteStream slice already holds _stage4_splitTJGaps, which sits just before _stage4_rewriteStream)
    const splitLib = new Function(sliceBetween(PIPE, 'const _stage4_maskStrings = (s) => {', '  // _stage4_rewriteStream', F) + '\nreturn _stage4_splitTJGaps;')();
    const run = (s) => { const out = splitLib(Uint8Array.from(s, (c) => c.charCodeAt(0)), 400); return Array.from(out, (c) => String.fromCharCode(c)).join(''); };
    expect(run('BT [<0019>-0.9<0017>-435<0025> -8605 (State)-2(Total) -10496 ($1,273)] TJ ET'))
      .toBe('BT [<0019>-0.9<0017>] TJ\n[-435<0025> ] TJ\n[-8605 (State)-2(Total) ] TJ\n[-10496 ($1,273)] TJ ET');
    // small kerning, a gap with no string after it, a leading gap, and brackets inside a string are left alone
    expect(run('BT [(A)-120(B) -300(C)] TJ ET')).toBe('BT [(A)-120(B) -300(C)] TJ ET');
    expect(run('BT [-900 (A) (B) -900] TJ ET')).toBe('BT [-900 (A) (B) -900] TJ ET');
    expect(run('BT [(A) -900 -800] TJ ET')).toBe('BT [(A) -900 -800] TJ ET'); // no string after the gap
    expect(run('BT [(a [x] b) -900 (c\\) [y]) ] TJ ET')).toBe('BT [(a [x] b) ] TJ\n[-900 (c\\) [y]) ] TJ ET');
    // after the split, each cell is its own segment (splitFont on), and stays one segment with it off
    const row = run('BT /F1 8 Tf 72 300 Td [(1761 Acadia Academy) -8605 ($1,301,450.40) -8605 ($750,953.26)] TJ ET');
    expect(seg(row, { fine: true, splitFont: true })).toEqual(['[(1761 Acadia Academy) ] TJ', '[-8605 ($1,301,450.40) ] TJ', '[-8605 ($750,953.26)] TJ']);
    expect(seg(row, { fine: true }).length).toBe(1);
    expect(PIPE.includes('if (probeOpts && probeOpts.splitFont) bytes = _stage4_splitTJGaps(bytes, 400);')).toBe(true);
    expect(PIPE.includes('if (s4opts && s4opts.splitFont && segmentProbe instanceof Map && segmentProbe.get(pi)) bytes = _stage4_splitTJGaps(bytes, 400);')).toBe(true);
  });
  it('pages without positions keep the old rule', () => {
    const set = artLib(Array.from({ length: 6 }, () => [{ str: 'of' }, { str: 'x' + Math.random() }]));
    expect(set.has('of')).toBe(true);
  });
});

// ── 16. charts said once; missing axis numbers explained; one coverage line; repeated table header kept (10-28) ─
describe('chart text is not said three times', () => {
  const overlap = new Function(sliceBetween(PIPE, 'var _alloTextOverlap = function', '\n// Which extracted images a legend repair', F) + '\nreturn _alloTextOverlap;')();
  const code = sliceBetween(PIPE, '      const _capShort =', '      det.innerHTML = ', F);
  // (2026-10-28) the caption also asks whether the values are printed in the document; these fixtures are estimated
  const run = (alt, summary) => new Function('_capAlt', 'parsed', '_alloTextOverlap', 'rows', '_alloChartValuesPrinted', code + '\nreturn { caption: _chartCaption, keepSummary: !!(_sumText && !_sumRepeats) };')(alt, { chartSummary: summary }, overlap, [], () => false);
  const alt = 'Line chart of annual enrollment, FY08 to FY25: about 3,570 students in FY08 falling steadily to about 2,980 in FY20, dropping to about 2,740 in FY21.';
  it('the table caption names the chart (alt up to its colon), not its values', () => {
    expect(run(alt, '').caption).toBe('Chart data, AI-estimated: Line chart of annual enrollment, FY08 to FY25');
    expect(run('Pie chart of revenue by source with five slices', '').caption).toBe('Chart data, AI-estimated: Pie chart of revenue by source with five slices');
  });
  it('a summary that repeats the alt is left out; one that adds information stays', () => {
    expect(run(alt, 'Enrollment declined steadily from about 3,570 in FY08 to about 2,980 in FY20, dropped to about 2,740 in FY21.').keepSummary).toBe(false);
    expect(run(alt, 'The district projects a further decline as birth rates fall across all six towns.').keepSummary).toBe(true);
  });
  it('no panel at all when there is nothing beyond the alt', () => {
    expect(PIPE.includes('if (im.parentNode && (rows.length || (_sumText && !_sumRepeats))) im.parentNode.insertBefore(det, im.nextSibling);')).toBe(true);
  });
});
describe('missing numbers that look like chart axis labels', () => {
  const hint = new Function(sliceBetween(PIPE, 'var _alloAxisSeriesHint = function', '\nvar _alloEnsureSingleH1', F) + '\nreturn _alloAxisSeriesHint;')();
  it('names an evenly spaced series and keeps the warning (budget2 axis ticks)', () => {
    expect(hint(['13', '13.5', '11.5', '9.5', '8.5', '6.5', '5.5', '4.5', '0.5', '$1,000'])).toBe(' 9 of them form one evenly spaced series (0.5 to 13.5 in steps of 0.5), which is typical of chart axis labels that a chart description summarises; check that the rest are intact.');
  });
  it('a tiny step that "fits" everything but fills little of its grid is not taken (0.1 here; the series is 0..4 by 1)', () => {
    expect(hint(['0', '0.1', '1', '2', '3', '4'])).toBe(' 5 of them are consecutive numbers (0 to 4), which is typical of line or item numbers printed a second time, or of chart axis labels; check that the rest are intact.');
  });
  // (2026-10-28, IRS i1040 worksheets: line numbers 10..24 printed twice were called "chart axis labels")
  it('consecutive whole numbers name line numbers as well as axis labels; other steps keep the axis wording', () => {
    expect(hint(['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'])).toBe(' 15 of them are consecutive numbers (10 to 24), which is typical of line or item numbers printed a second time, or of chart axis labels; check that the rest are intact.');
    expect(hint(['10', '20', '30', '40', '50'])).toContain('in steps of 10), which is typical of chart axis labels');
    expect(hint(['0.5', '1.5', '2.5', '3.5', '4.5'])).toContain('in steps of 1), which is typical of chart axis labels');
  });
  it('says nothing for scattered numbers or too few', () => {
    expect(hint(['94', '2025', '17.3', '6', '412'])).toBe('');
    expect(hint(['1', '2', '3', '4'])).toBe('');
    expect(hint(['1', '2', '3', '4', '5', '17', '93', '204', '511'])).toBe(''); // series is under 60%
  });
  it('both numbers warnings carry it', () => {
    expect((PIPE.match(/A remediation should never change numbers — review the Diff to confirm scores, dates, and percentages are intact\.' \+ _alloAxisSeriesHint\(/g) || []).length).toBe(2);
  });
});
describe('one line for one coverage cause in the connector', () => {
  const V = require('../desktop/mcp/remediation_verification.cjs');
  const review = ['content fidelity needs a human check (possible loss or changed values)', 'numbers may have changed between source and output — verify scores, dates, and percentages before anyone reads this', 'Source content coverage requires review'];
  it('merges the three into one, naming chart axis labels and keeping the changed-number warning', () => {
    const out = V.explainDelivery({ files: {}, verdictReasons: { review, cautions: [] }, taggedPdfError: 'content_coverage_requires_review', contentCoverage: { missingWords: [{ word: '13.5', count: 1 }] } });
    expect(out.needsAPerson).toHaveLength(1);
    expect(out.needsAPerson[0]).toMatch(/^Some words or numbers from the original are not in the accessible version \(listed with the tagged-PDF item below\)\..*chart axis labels.*a changed score, date or percentage must be fixed\.$/);
  });
  // (2026-10-28, SP 800-63 slice) when another reason withholds the PDF, there is no list below: the words go in the line
  it('names the words in the line itself when the tagged-PDF item below does not list them', () => {
    const out = V.explainDelivery({ files: {}, verdictReasons: { review, cautions: [] }, taggedPdfError: 'page_range_tagged_pdf_unsupported', contentCoverage: { missingWords: [{ word: 'http', count: 3 }, { word: 's', count: 4 }] } });
    expect(out.needsAPerson[0]).not.toContain('listed with the tagged-PDF item below');
    expect(out.needsAPerson[0]).toMatch(/must be fixed\. Words not found in the accessible version: "http" \(x3\), "s" \(x4\)\.$/);
  });
  it('a numbers warning on its own is kept as is', () => {
    expect(V.explainDelivery({ files: {}, verdictReasons: { review: [review[1]], cautions: [] } }).needsAPerson).toEqual([review[1]]);
  });
});
describe('a table header row repeated on every page', () => {
  it('stays content on its first page (TH text or a whole-word part of one; TD by exact text)', () => {
    expect(PIPE.includes("const _partOfTh = (n) => _tdTexts.has(n) || _thTexts.some((t) => t === n || (' ' + t + ' ').indexOf(' ' + n + ' ') !== -1);")).toBe(true);
    expect(PIPE.includes("const _keptHere = !!(s4opts && s4opts.keepFirstArtifacts && norm && s4opts.keepFirstArtifacts.get(norm) === pi);")).toBe(true);
    expect(PIPE.includes('(hasArtifacts && norm && artifactHashSet.has(norm) && !_keptHere)')).toBe(true);
    expect(PIPE.includes('keepFirstArtifacts: _keepFirstArtifacts }')).toBe(true);
  });
});

// ── 17. what osep3's tagged PDF showed (2026-10-27) ────────────────────────────────────────────────
describe('tagged PDF structure after the osep3 inspection', () => {
  const relevel = sliceBetween(PIPE, '            let prevLevel = 0, releveled = 0;', "            if (releveled) { try { warnLog('[Stage4b-OffPage] re-levelled '", F);
  const run = (roles, off) => {
    const leaves = roles.map((r, i) => ({ role: r, _offPage: !!(off && off.includes(i)), ref: i }));
    const ctx = { lookup: () => ({ set: () => {} }) };
    new Function('_unifiableLeafRefs', 'isHeading', 'context', 'PDFName', relevel)(leaves, (r) => /^H[1-6]$/.test(r), ctx, { of: (x) => x });
    return leaves.filter((l) => !l._offPage).map((l) => l.role);
  };
  it('after the unprinted H1 is dropped, ALL headings move up together (sections stay siblings)', () => {
    // osep: H1 (dropped), I=H2, sub=H3, II=H2, sub=H3, III=H2
    expect(run(['H1', 'H2', 'H3', 'H2', 'H3', 'H2'], [0])).toEqual(['H1', 'H2', 'H1', 'H2', 'H1']);
  });
  it('a skip is still closed after the shift (H1 then H3 -> H1 H2)', () => {
    expect(run(['H1', 'H1', 'H3', 'H2'], [0])).toEqual(['H1', 'H2', 'H2']);
  });
  it('a probed segment that draws only whitespace is an artifact, not an empty P', () => {
    expect(PIPE.includes("const _blankSeg = useProbe && !String((item && item.str) || '').trim();")).toBe(true);
    expect(PIPE.includes('const isArtifact = (item && item.symbolic) || _blankSeg ||')).toBe(true);
  });
  it('a <br> inside a leaf is a word break in its spoken text', () => {
    const helper = sliceBetween(PIPE, '      const _leafText = (el) => {', '\n      };', { ...F, includeEnd: true });
    const doc = new JSDOM('<!DOCTYPE html><body></body>').window.document; // this file runs in node
    const lt = new Function('htmlDoc', helper + '\nreturn _leafText;')(doc);
    const p = doc.createElement('p'); p.innerHTML = '400 MARYLAND AVE., S.W. WASHINGTON, DC 20202-2600<br>www.ed.gov';
    expect(lt(p)).toBe('400 MARYLAND AVE., S.W. WASHINGTON, DC 20202-2600 www.ed.gov');
    const q = doc.createElement('p'); q.textContent = 'plain';
    expect(lt(q)).toBe('plain');
  });
  it("a list item's text stops at its nested list (agenda4: the parent item carried its sub-items' text)", () => {
    const helper = sliceBetween(PIPE, '      const _leafText = (el) => {', '\n      };', { ...F, includeEnd: true });
    const doc = new JSDOM('<!DOCTYPE html><body></body>').window.document;
    const lt = new Function('htmlDoc', helper + '\nreturn _leafText;')(doc);
    const li = doc.createElement('li');
    li.innerHTML = 'Assignment of Board Standing Committees 2025-2026:<ol><li>Elect the Finance Committee.<br>Motion:</li></ol>';
    expect(lt(li).trim()).toBe('Assignment of Board Standing Committees 2025-2026:');
    expect(lt(li.querySelector('ol li'))).toBe('Elect the Finance Committee. Motion:');
    li.innerHTML = 'Summer Board Meeting Dates<ul><li>July 30, 2025</li></ul>';
    expect(lt(li).trim()).toBe('Summer Board Meeting Dates');
    // other elements keep every word they hold
    const d = doc.createElement('td'); d.innerHTML = 'Cell<ul><li>x</li></ul>';
    expect(lt(d)).toBe('Cellx');
    expect(li.querySelector('ul')).not.toBeNull(); // the page is not changed
  });
  it("the connector report keeps an AI triage reason up to 600 characters and cuts a longer one at a word", () => {
    const DRIVER = readFileSync(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');
    const clip = new Function('return ' + sliceBetween(DRIVER, 'reason: (', "(String((d && d.reason) || ''))", { file: 'remediation_headless_driver.cjs' }).replace(/^reason: /, ''))();
    const s = 'The words below and above refer to sections of this letter, not to positions on the page. ';
    expect(clip(s.repeat(5).trim())).toBe(s.repeat(5).trim()); // 449 characters: whole
    const cut = clip(s.repeat(9));
    expect(cut.length).toBeLessThanOrEqual(601);
    expect(cut.endsWith('…')).toBe(true);
    expect(s.repeat(9).startsWith(cut.slice(0, -1) + ' ')).toBe(true); // ends at a whole word
  });
});

// ── 18. a numbered list's own numbers are not "lost values" (agenda3, 2026-10-27) ───────────────────
describe('numeric fidelity credits the numbers a list draws', () => {
  const lib = new Function('DOMParser', sliceBetween(PIPE, 'var _alloListMarkerNumbers = function', '\n// Factory: returns all pipeline functions', F)
    + '\nreturn { marks: _alloListMarkerNumbers };')(new JSDOM('').window.DOMParser);
  // _extractNumericTokens sits above the slice; give it the module's definition
  const tok = new Function(sliceBetween(PIPE, 'var _extractNumericTokens = function', '\n// ── OCR-quality helpers', F) + '\nreturn _extractNumericTokens;')();
  const losses = (src, out) => new Function('_extractNumericTokens', sliceBetween(PIPE, 'var _numericFidelityLosses = function', '\n// Factory: returns all pipeline functions', F) + '\nreturn _numericFidelityLosses;')(tok)(src, out);
  const SRC = 'New Business 10. Consideration and action to approve the minutes of June 4. Motion: 11. Consideration and action to nominate a Board Chair. Motion:';
  const LIST = '<ol start="10"><li>Consideration and action to approve the minutes of June 4.<br><em>Motion:</em></li><li>Consideration and action to nominate a Board Chair.<br><em>Motion:</em></li></ol>';
  const text = (h) => h.replace(/<br>/g, ' ').replace(/<[^>]+>/g, ' ');
  it('credits each item number the source prints right before that item', () => {
    expect(lib.marks(SRC, LIST)).toBe('10 11');
    expect(losses(SRC, text(LIST))).toEqual(['10', '11']);
    expect(losses(SRC, text(LIST) + ' ' + lib.marks(SRC, LIST))).toEqual([]);
  });
  it('a number the source pairs with different text is not credited', () => {
    expect(lib.marks(SRC.replace('11. Consideration', '12. Consideration'), LIST)).toBe('10');
    expect(lib.marks(SRC, LIST.replace('nominate a Board Chair', 'elect a Board Chair'))).toBe('10');
  });
  it('honours start, reversed and value; skips lettered, typed and self-numbered lists', () => {
    expect(lib.marks(SRC, LIST.replace('<ol start="10">', '<ol reversed start="11">').replace('<li>Consideration and action to approve', '<li value="10">Consideration and action to approve'))).toBe('10');
    expect(lib.marks('11. Alpha beta gamma 10. Delta epsilon zeta', '<ol reversed start="11"><li>Alpha beta gamma</li><li>Delta epsilon zeta</li></ol>')).toBe('11 10');
    expect(lib.marks(SRC, LIST.replace('<ol start="10">', '<ol start="10" style="list-style-type:lower-alpha">'))).toBe('');
    expect(lib.marks(SRC, LIST.replace('<ol start="10">', '<ol start="10" type="i">'))).toBe('');
    expect(lib.marks(SRC, LIST.replace('<li>Consideration and action to approve', '<li>10. Consideration and action to approve'))).toBe('11');
    expect(lib.marks(SRC, '<ul><li>Consideration and action to approve the minutes of June 4.</li></ul>')).toBe('');
  });
  it('is added on both numeric checks', () => {
    // (2026-10-28) followed by the page-folio credit (tests/remediation_page_range_slice.test.js)
    expect(PIPE.includes("_numericFidelityLosses(sourceText, htmlToPlainText(_stripSinks(html)) + ' ' + _alloListMarkerNumbers(sourceText, _stripSinks(html)) + ' ' + _alloFolioNumbers(")).toBe(true);
    expect(PIPE.includes("_numericFidelityLosses(_srcRaw, htmlToPlainText(_finalForIntegrity) + ' ' + _alloListMarkerNumbers(_srcRaw, _finalForIntegrity) + ' ' + _alloFolioNumbers(")).toBe(true);
  });
});

// ── 19. repeated form labels and nested links in the tagged PDF (complaint form, osep3, 2026-10-27) ──
describe('tagged PDF: repeated labels and link placement', () => {
  const H = (name, end) => new Function(sliceBetween(PIPE, 'var ' + name + ' = function', end, F) + '\nreturn ' + name + ';')();
  const between = H('_alloBetweenNeighboursRun', '\n// Tagged-PDF links (2026-10-27)');
  const plan = H('_alloOrderedRepeatsPlan', '\n// Tagged-PDF linking (2026-10-27): the unclaimed blocks');
  const host = H('_alloLinkHostPlan', '\n// Tagged-PDF linking (2026-10-27, complaint form): RANK-ORDER');
  const blk = (keys, taken = []) => keys.map((key, i) => ({ key, keyNoMarker: key, free: !taken.includes(i) }));
  const lf = (key, run = null, role = 'LBody') => ({ key, role, linkable: true, run });

  it('between neighbours: the ONE exact run inside the gap, adjacent blocks joined; none or two -> null', () => {
    const b = blk(['name', 'address', 'city', 'home', 'phone', 'name', 'address', 'city']);
    const free = () => true;
    expect(between(b, free, 'city', -1, 5)).toEqual({ start: 2, end: 2 });
    expect(between(b, free, 'homephone', 2, 8)).toEqual({ start: 3, end: 4 });
    expect(between(b, free, 'city', -1, 8)).toBeNull(); // two copies in the gap
    expect(between(b, free, 'city', 2, 7)).toBeNull(); // none
    expect(between(b, (k) => k !== 2, 'city', -1, 5)).toBeNull(); // the copy is taken
    expect(between(b, free, 'city', 4, 4)).toBeNull(); // empty gap
  });

  it('ordered repeats: k-th label takes the k-th copy, re-pairing a copy taken out of order', () => {
    // blocks: section 1 [name address city], section 2 [name address city]; leaf "Address" #1 was linked to section 2's copy
    const blocks = blk(['name', 'address', 'city', 'name', 'address', 'city'], [0, 4]);
    const leaves = [lf('name', { start: 0, end: 0 }), lf('address', { start: 4, end: 4 }), lf('city'), lf('name'), lf('address'), lf('city')];
    expect(plan(leaves, blocks, 30)).toEqual([{ start: 0, end: 0 }, { start: 1, end: 1 }, { start: 2, end: 2 }, { start: 3, end: 3 }, { start: 4, end: 4 }, { start: 5, end: 5 }]);
  });

  it('ordered repeats: a longer label claims its block first ("Child\'s Name*" takes "name" from the Name group)', () => {
    const blocks = blk(['name', "child's", 'name', '*', 'name'], [2]);
    const leaves = [lf('name', { start: 2, end: 2 }), lf("child'sname*"), lf('name')];
    expect(plan(leaves, blocks, 30)).toEqual([{ start: 0, end: 0 }, { start: 1, end: 3 }, { start: 4, end: 4 }]);
  });

  it('ordered repeats: nothing changes when counts differ, nothing improves, or a block would be left over', () => {
    expect(plan([lf('city'), lf('city')], blk(['city', 'x', 'city', 'city']), 30)).toBeNull(); // 3 copies, 2 labels
    expect(plan([lf('city', { start: 0, end: 0 })], blk(['city'], [0]), 30)).toBeNull(); // all linked already
    expect(plan([lf('a much longer paragraph key than thirty chars')], blk(['a much longer paragraph key than thirty chars']), 30)).toBeNull(); // not a short label
    // a block taken from another group's leaf that would not be re-linked -> refuse
    const blocks = blk(['name', 'name'], [0, 1]);
    expect(plan([lf('namename'), lf('name', { start: 0, end: 0 }), lf('name', { start: 1, end: 1 })], blocks, 30)).toBeNull();
    // re-pairing would free a block no label takes back ("city." held by the first City): refuse even though
    // it would link one more label, because that block's page entry would still point at the first City
    expect(plan([lf('city', { start: 3, end: 3 }), lf('city')], blk(['city', 'x', 'city', 'city.'], [3]), 30)).toBeNull();
  });

  it('link host: whole blocks move into the link; words inside a block place it after that block', () => {
    const leaves = [
      { blocks: [{ page: 'p1', key: 'visit' }, { page: 'p1', key: 'www.ada.gov' }, { page: 'p1', key: 'forhelp.' }] },
      { blocks: [{ page: 'p1', key: 'writetoiepgoals@ed.govtoday.' }] },
      { blocks: [{ page: 'p2', key: 'www.whitehouse.gov/sites/' }, { page: 'p2', key: 'default/files/omb/' }, { page: 'p2', key: 'memoranda/fy2007/' }] },
    ];
    expect(host(leaves, 'p1', 'www.ada.gov', new Set())).toEqual({ leaf: 0, first: 1, last: 1, own: true });
    expect(host(leaves, 'p1', 'iepgoals@ed.gov', new Set())).toEqual({ leaf: 1, first: 0, last: 0, own: false });
    expect(host(leaves, 'p2', 'www.whitehouse.gov/sites/default/files/omb/memoranda/fy2007/', new Set())).toEqual({ leaf: 2, first: 0, last: 2, own: true });
    expect(host(leaves, 'p2', 'www.ada.gov', new Set())).toBeNull(); // only the link's own page
    expect(host(leaves, 'p1', 'ww', new Set())).toBeNull(); // too short to place safely (it occurs inside www.ada.gov)
  });

  it('link host: the n-th link with the same words takes the n-th copy', () => {
    const leaves = [{ blocks: [{ page: 'p1', key: 'www.ada.gov' }] }, { blocks: [{ page: 'p1', key: 'seewww.ada.gov' }] }];
    const used = new Set();
    expect(host(leaves, 'p1', 'www.ada.gov', used)).toMatchObject({ leaf: 0, own: true });
    expect(host(leaves, 'p1', 'www.ada.gov', used)).toMatchObject({ leaf: 1, own: false });
    expect(host(leaves, 'p1', 'www.ada.gov', used)).toBeNull();
  });

  it('a picture the source marks as decoration stays its artifact; its figure leaves the tag tree in draw order (complaint, veraPDF 7.1-2)', () => {
    expect(PIPE.includes('const _artSpans = _stage4_scanMarks(s0).artifactSpans;')).toBe(true); // images too, not only forms
    expect(PIPE.includes("if (inArtifact) { imageBlockInfo.push({ artifact: true, xref: imgRefs.get(name) || '' }); return m; }")).toBe(true);
    expect(PIPE.includes('mcidCount: contentMcid + imageBlocks.filter((b) => !b.artifact).length')).toBe(true);
    expect(PIPE.includes('withArtifacts.some((d) => d.artifact) && figureLeaves.length === withArtifacts.length')).toBe(true);
  });
  it('a top-level leaf left out of the tag tree also leaves structElemRefs (which re-attaches top-level elements later)', () => {
    expect(PIPE.includes('if (String(structElemRefs[i]) === String(lf.ref)) { structElemRefs.splice(i, 1); removed = true; }')).toBe(true); // off-page text
    expect(PIPE.includes('if (String(structElemRefs[i]) === String(lf.ref)) structElemRefs.splice(i, 1); // top level')).toBe(true); // decorative figure
  });
  it('an incomplete /CIDSet is removed from embedded CID fonts only (veraPDF 7.21.4.2)', async () => {
    const { PDFDocument, PDFName } = require('../desktop/mcp/vendor/pdf-lib.min.js');
    const doc = await PDFDocument.create();
    const ctx = doc.context;
    const fd = (extra) => ctx.register(ctx.obj(Object.assign({ Type: 'FontDescriptor', FontName: 'ABCDEF+MS-Gothic', CIDSet: ctx.register(ctx.stream('\xff')) }, extra)));
    const embedded = fd({ FontFile2: ctx.register(ctx.stream('x')) }), notEmbedded = fd({}), simpleFd = fd({ FontFile2: ctx.register(ctx.stream('x')) });
    ctx.register(ctx.obj({ Type: 'Font', Subtype: 'CIDFontType2', BaseFont: 'ABCDEF+MS-Gothic', FontDescriptor: embedded }));
    ctx.register(ctx.obj({ Type: 'Font', Subtype: 'CIDFontType0', BaseFont: 'X', FontDescriptor: notEmbedded }));
    ctx.register(ctx.obj({ Type: 'Font', Subtype: 'TrueType', BaseFont: 'Y', FontDescriptor: simpleFd }));
    const code = sliceBetween(PIPE, '    let _cidSetsDropped = 0;', '    // ── Stage 7: font-embedding repair', F);
    const logs = [];
    new Function('context', 'PDFName', 'warnLog', code + '\nreturn _cidSetsDropped;')(ctx, PDFName, (m) => logs.push(m));
    const has = (r) => !!ctx.lookup(r).get(PDFName.of('CIDSet'));
    expect([has(embedded), has(notEmbedded), has(simpleFd)]).toEqual([false, true, true]);
    expect(logs.join(' ')).toMatch(/removed 1 optional \/CIDSet entry/);
  });
  it('adjacent exact run: consecutive free blocks only, after a start index, marker-free first block for list items', () => {
    const adj = H('_alloAdjacentExactRun', '\n// Tagged-PDF links (2026-10-27)');
    const b = [{ key: 'mailingaddress' }, { key: 'mail' }, { key: 'ingaddressisthesame' }, { key: 'x' }, { key: 'mail' }, { key: 'y' }, { key: 'ingaddressisthesame' }];
    const free = () => true;
    expect(adj(b, free, 'mailingaddressisthesame', false, -1, 6)).toEqual([1, 2]);
    expect(adj(b, free, 'mailingaddressisthesame', false, 2, 6)).toBeNull(); // the later copy is not adjacent ("mail", "y", ...)
    expect(adj(b, (k) => k !== 2, 'mailingaddressisthesame', false, -1, 6)).toBeNull(); // a taken block breaks the run
    // even when the text after the taken block would complete it: the run is never stitched across claimed text
    expect(adj([{ key: 'mail' }, { key: 'other' }, { key: 'ingaddressisthesame' }], (k) => k !== 1, 'mailingaddressisthesame', false, -1, 6)).toBeNull();
    expect(adj([{ key: '1.apples', keyNoMarker: 'apples' }, { key: 'andpears' }], free, 'applesandpears', true, -1, 6)).toEqual([0, 1]);
    expect(adj([{ key: 'a' }, { key: 'b' }, { key: 'c' }], free, 'abc', false, -1, 2)).toBeNull(); // longer than maxLen
  });
  it('a sub-line label may match its printed letter alone, between its neighbours (irs1040 "35b Routing number")', () => {
    expect(PIPE.includes("const _subLine = /^\\d{1,3}[a-z][a-z]{3,}/.test(tKey) ? tKey.replace(/^\\d{1,3}/, '') : null;")).toBe(true);
    expect(PIPE.includes('|| (_subLine ? _alloBetweenNeighboursRun(blockStream, _bnFree, _subLine, lo, hi, false) : null);')).toBe(true);
  });
  it('child-find: exact printed text wins inside the reworded pass; a footer matching only claimed text is off the page', () => {
    // exact-first over ADJACENT free blocks, starting after the last linked leaf in the forward rounds
    expect(PIPE.includes("const _exact = _exKey.length >= 12 ? _alloAdjacentExactRun(blockStream, (k) => !consumed.has(String(blockStream[k].bRef)), _exKey, lf.role === 'LBody', globalRound ? -1 : prevEnd, 6) : null;")).toBe(true);
    // words printed nowhere -> the rest counts only in unclaimed text
    expect(PIPE.includes('if (lw.length === 1 ? uni.has(lw[0]) : (missing ? longestRunFree(lw) : longestRun(lw)) >= need) continue;')).toBe(true);
  });
  it('child-find: field appearances drawn with an unembedded font are redrawn BEFORE Stage 7 decides what is unrepairable', () => {
    const redraw = PIPE.indexOf("if (bad) { try { _acroFormForSave.markFieldAsDirty(field.ref); _redrawn++; } catch (_) {} }");
    const stage7 = PIPE.indexOf('// ── Stage 7: font-embedding repair');
    const save = PIPE.indexOf('const _bytes = await doc.save({ useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: !_fieldAppearancesDrawn });');
    expect(redraw > 0 && redraw < stage7 && stage7 < save).toBe(true);
    // annotation appearance fonts are repair candidates; the form's default resources are not
    expect(PIPE.includes("for (const s of streams) if (s && s.dict && typeof s.dict.get === 'function') _addFontsFrom(s.dict.get(PDFName.of('Resources')));")).toBe(true);
    expect(PIPE.includes("_addFontsFrom(af.get(PDFName.of('DR')))")).toBe(false);
  });
  it('child-find: an artifact or unmarked copy of text the page already prints is read once (overlay)', () => {
    expect(PIPE.includes("page.getTextContent({ includeMarkedContent: true })")).toBe(true);
    expect(PIPE.includes('if (_anyTagged) for (let i = 0; i < _its.length; i++) if (_unmarked[i]) _art[i] = true;')).toBe(true);
    // only a twin at (nearly) the same spot: a running header whose words occur in the body stays (osep)
    expect(PIPE.includes('return !_content.some((c) => Math.abs(c.xy[0] - xy[0]) <= 6 && Math.abs(c.xy[1] - xy[1]) <= 6 && _twin(c.k, k));')).toBe(true);
    expect(PIPE.includes('Math.min(a.length, b.length) >= 0.8 * Math.max(a.length, b.length)')).toBe(true);
    // a page whose text is all artifacts (or untagged) keeps everything: the drop needs non-artifact text to repeat
    expect(PIPE.includes('if (_art.some(Boolean) && _art.some((a) => !a)) {')).toBe(true);
    // any trouble falls back to the plain read
    expect(PIPE.includes("} catch (_) {\n            tc = await _withTimeout(page.getTextContent(), 30000, 'getTextContent (text layer) p' + p);")).toBe(true);
  });
  it('the passes are wired into createTaggedPdf', () => {
    expect(PIPE.includes('const _orPlan = _alloOrderedRepeatsPlan(_orLeaves,')).toBe(true);
    expect(PIPE.includes('const hit = _alloBetweenNeighboursRun(blockStream, _bnFree, tKey, lo, hi,')).toBe(true);
    expect(PIPE.includes('(_host = _alloLinkHostPlan(_alloLinkedLeafBlocks, String(page.ref), lk, _lnkHostUsed))')).toBe(true);
    // an unplaced link keeps the old document-level placement
    expect(PIPE.includes('if (_host) _lnkPlaced.push({ host: _host, linkElemRef, linkElemDict, objrDict });\n            else linkAnnotElemRefs.push(linkElemRef);')).toBe(true);
  });
});

// ── 14. the app's review queue lists reminders the AI review settled (2026-10-27) ─────────────────
const VIEW = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const queueCode = sliceBetween(VIEW, '                    const _rfMapC = (engine, bucket) =>', '                    // Stylesheet-wide Equal Access prompts', { file: 'view_pdf_audit_source.jsx', label: 'review queue source' });
const queue = (pdfFixResult) => new Function('pdfFixResult', '_reviewFindingsLive', queueCode + '\nreturn _rfSource;')(pdfFixResult, null);
describe('review queue in the app', () => {
  it('shows an acknowledged reminder as a queue item (its triage verdict carries the AI reason)', () => {
    const src = queue({ axeAudit: { incomplete: [] }, secondEngineAudit: { potentialFindings: [{ id: 'text_quoted_correctly', description: 'q', nodes: 1 }], manualFindings: [],
      acknowledgedByAiReview: [{ id: 'style_color_misuse', description: 'Verify color', nodes: 1, bucket: 'potential', reason: 'Only focus styles.' }, { id: 'x_manual', description: 'm', nodes: 2, bucket: 'manual' }] } });
    expect(src.findings.map((f) => f.engine + '|' + f.bucket + '|' + f.id)).toEqual(['equalAccess|potential|text_quoted_correctly', 'equalAccess|potential|style_color_misuse', 'equalAccess|manual|x_manual']);
  });
  it('the queue labels a not-an-issue verdict with the AI reason (translated label)', () => {
    expect(VIEW.includes("d.action === 'not-an-issue' ? ((t('pdf_audit.review_queue.ai_not_issue') || 'AI judged this not an issue') + ': ' + (d.reason || t('pdf_audit.review_queue.ai_no_reason') || 'no reason given'))")).toBe(true);
  });
  it('the queue has no hardcoded English left in its own wording (every user-facing string goes through t())', () => {
    const qStart = VIEW.indexOf('<div id="pdf-review-findings"');
    const queueJsx = VIEW.slice(qStart, VIEW.indexOf('{pdfFixResult && pdfFixResult.accessibleHtml && <_PdfPreservationReview', qStart));
    for (const s of ['>Workbench<', '>Mark reviewed<', '>Undo<', 'Reset all reviewed marks</button>', "'Asking AI…' :", ' pending · {_rfDone} reviewed', '>Marking reviewed records', 'Reviewed findings ({_rfDone})', "'AI attempted '", "'Open Workbench for ' +", "'Mark reviewed: ' +", "'Undo reviewed mark: ' +"]) {
      expect(queueJsx.includes(s), s).toBe(false);
    }
    // every new key used by the queue is registered in ui_strings.js with its English
    const ui = JSON.parse(readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8'));
    const used = [...new Set((VIEW.match(/t\('pdf_audit\.review_queue\.([a-z_]+)'\)/g) || []).map((m) => m.slice(26, -2)))];
    expect(used.length).toBeGreaterThan(25);
    expect(used.filter((k) => typeof ui.pdf_audit.review_queue[k] !== 'string')).toEqual([]);
  });
});

// ── 12. the score caution names reminders the AI review judged fine (2026-10-27, budget2) ─────────
// Same extraction as tests/individual_remediation_polish.test.js (real verdict fn + real policy modules).
const policyWindow = { AlloModules: {} };
for (const name of ['accessibility_evidence_module.js', 'verification_policy_module.js']) {
  new Function('window', readFileSync(resolve(process.cwd(), name), 'utf8'))(policyWindow);
}
const verdictFn = new Function('window', 'var PIPELINE_DEFAULTS = { targetScore: 95 };\n'
  + sliceBetween(PIPE, 'function _alloDeriveVerificationState(input) {', '\n}', { ...F, includeEnd: true }) + '\n'
  + PIPE.slice(PIPE.indexOf('function _alloDistributionVerdict(r, opts) {'), PIPE.indexOf('\n}', PIPE.indexOf('headline: level ===', PIPE.indexOf('function _alloDistributionVerdict(r, opts) {'))) + 2)
  + '\nreturn _alloDistributionVerdict;')(policyWindow);
describe('score caution with AI-settled reminders', () => {
  const base = (eaScore, triaged) => ({
    afterScore: 94, axeAudit: { score: 100, totalViolations: 0, totalIncomplete: 0 }, integrityCoverage: 99, fidelityNotes: [],
    secondEngineAudit: { score: eaScore, failViolations: 0, potentialViolations: 2, manualViolations: 0, potentialFindings: [{ id: 'text_quoted_correctly' }, { id: 'media_alt_brief' }], manualFindings: [] },
    reviewTriage: { dispositions: triaged.map((id) => ({ key: 'equalAccess|potential|' + id, action: 'not-an-issue', reason: 'fine' })) },
  });
  const caution = (r) => verdictFn(r, { targetScore: 95 }).cautions.join(' | ');
  it('names them when every remaining Equal Access reminder was judged fine and Equal Access is the low score', () => {
    expect(caution(base(94, ['text_quoted_correctly', 'media_alt_brief']))).toContain('the score (94) is below your target of 95 — what keeps it there is 2 Equal Access reminders the AI review judged not an issue; they stay quick checks for a person');
  });
  it('the score is not raised, and the wording is not used when any reminder was not judged fine, or the AI score is the lower one', () => {
    expect(verdictFn(base(94, ['text_quoted_correctly', 'media_alt_brief']), { targetScore: 95 }).level).not.toBe('ready');
    expect(caution(base(94, ['text_quoted_correctly']))).not.toContain('what keeps it there');
    expect(caution(base(98, ['text_quoted_correctly', 'media_alt_brief']))).not.toContain('what keeps it there');
    const withFail = base(94, ['text_quoted_correctly', 'media_alt_brief']); withFail.secondEngineAudit.failViolations = 1;
    expect(caution(withFail)).not.toContain('what keeps it there');
  });
  // (2026-10-27, child-find) a specific fidelity line replaces the generic "possible loss or changed values"
  it('the generic content-fidelity line appears only when no specific line says what to check', () => {
    const review = (notes) => verdictFn(Object.assign(base(98, []), { needsExpertReview: true, expertReviewReason: 'content-fidelity', fidelityNotes: notes }), { targetScore: 95 }).review.join(' | ');
    const order = review([{ kind: 'sourceReadingOrder', msg: 'order' }]);
    expect(order).toContain('noticeably different order');
    expect(order).not.toContain('possible loss or changed values');
    expect(review([{ kind: 'numeric', msg: 'n' }])).not.toContain('possible loss or changed values');
    expect(review([])).toContain('content fidelity needs a human check (possible loss or changed values)');
    // "both" still names accessibility too
    const both = verdictFn(Object.assign(base(98, []), { needsExpertReview: true, expertReviewReason: 'both', fidelityNotes: [{ kind: 'sourceReadingOrder', msg: 'o' }] }), { targetScore: 95 }).review.join(' | ');
    expect(both).toContain('accessibility barriers and content fidelity both need human review');
  });
});

// The decorative figure passes the engines the pipeline runs (no figure-label or alt finding).
const AXE = resolve(process.cwd(), 'desktop/mcp/vendor/axe.min.js');
const ACE = resolve(process.cwd(), 'node_modules/accessibility-checker-engine/ace.js');
let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60000);
afterAll(async () => { await browser?.close(); });

describe('the decorative figure is clean in axe and IBM Equal Access', () => {
  it('no violations and no potential/manual findings on the figure or its image', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const fig = decorative('<figure data-img-placeholder="true" data-allo-decorative="true"></figure>', true).r.replace('<p>carried</p>', '').replace('__ALLOFLOW_DATAURL_FINAL_3__', png);
    const html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Decorative check</title></head><body><main><h1>Decorative check</h1><p>Text.</p>' + fig + '</main></body></html>';
    const tab = await browser.newPage();
    try {
      await tab.setContent(html, { waitUntil: 'load' });
      await tab.addScriptTag({ path: AXE });
      await tab.addScriptTag({ path: ACE });
      const res = await tab.evaluate(async () => {
        const a = await window.axe.run(document);
        const rep = await new window.ace.Checker().check(document, ['WCAG_2_2']);
        // style_highcontrast_visible is a manual reminder on EVERY image (placed ones too), not this markup's.
        const onFig = (r) => /figure|img/i.test(String(r.snippet || '')) && r.ruleId !== 'style_highcontrast_visible';
        return {
          axe: a.violations.map((v) => v.id),
          ea: rep.results.filter((r) => r.value[1] !== 'PASS' && onFig(r)).map((r) => r.ruleId + ':' + r.value.join('/')),
        };
      });
      expect(res.axe, JSON.stringify(res.axe)).toEqual([]);
      expect(res.ea, JSON.stringify(res.ea)).toEqual([]);
    } finally { await tab.close(); }
  }, 90000);
});
