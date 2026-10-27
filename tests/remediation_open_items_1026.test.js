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
const outline = (headings) => new Function('_sourceStruct', outlineCode + '\nreturn { shift: _outlineShift, levels: _sourceStruct.headings.map(_outlineLevel), note: _outlineNote };')({ hasTags: true, headings });
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
const wrapCode = sliceBetween(PIPE, '      const _wrapH1 =', '      let accessibleHtml = `<!DOCTYPE html>', F);
const wrapTitle = (bodyContent) => new Function('bodyContent', '_safeDocumentTitleHtml', wrapCode + '\nreturn _wrapTitleHtml;')(bodyContent, 'syllabus &amp; notes');
describe('the wrapper title', () => {
  it('uses the first plain-text h1, whitespace collapsed', () => {
    expect(wrapTitle('<header><h1 id="t">SIE 515\n  Human-Computer Interaction</h1></header><h1>Second</h1>')).toBe('SIE 515 Human-Computer Interaction');
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
