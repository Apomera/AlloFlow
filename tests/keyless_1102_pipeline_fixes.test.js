// Keyless corpus re-run 2026-11-02 (C:\tmp\keyless_1102\QUEUE.md). Pipeline-side fixes:
//  2. ballot: two "○" ovals the hidden OCR layer cannot encode counted as dropped characters and
//     withheld the tagged PDF (ocr-text-layer-incomplete). Pure symbols no longer count.
//  3. scan1913: the gate refused an empty corner <th> -> <td> as table-semantics-changed, and the
//     same AI finding was re-sent every pass. Empty header cells may become data cells, and a
//     finding whose only fix was refused is reported so the loop stops re-sending it.
//  4. worksheet/civics/notifications: a post-mutation re-audit ran when the only changes after the
//     final audit were data-allo-* attributes, the image token restore and a re-serialization.
//  5. scan1913: the page title appended a parenthetical subtitle to a heading ending in a period.
//  6. pt/fda/udhr_es: consecutive audit sections repeated boundary paragraphs.
//  7. syllabus_sie: the tagged PDF carried 1,412 StructElems no tree reached.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
// ALLO_PIPELINE_SOURCE lets a mutation run point at a private copy instead of the shared file.
const SRC = fs.readFileSync(process.env.ALLO_PIPELINE_SOURCE || path.resolve('doc_pipeline_source.jsx'), 'utf8');
const F = { file: 'doc_pipeline_source.jsx' };
const topFn = (name, params = '') => new Function(...(params ? params.split(',') : []),
  sliceBetween(SRC, 'function ' + name + '(', '\n}', { ...F, includeEnd: true }) + '\nreturn ' + name + ';');

describe('2. pure symbols do not withhold the scanned PDF', () => {
  const isSymbol = topFn('_alloOcrIsPureSymbol')();
  const countCode = sliceBetween(SRC, "    const _countNonWinAnsi = (s) => ((s || '')", '.length;', { ...F, includeEnd: true });
  const count = new Function('_alloOcrIsPureSymbol', countCode + '\nreturn _countNonWinAnsi;')(isSymbol);
  const verdict = topFn('_alloOcrTextLayerVerdict')();
  const layer = (droppedChars) => ({ scanned: true, coveragePct: 100, droppedChars, pagesWithText: 1, pagesCovered: 1, pagesIncomplete: 0, pagesEmpty: 0 });

  it('the ballot ovals, check boxes, bullets and emoji are not dropped characters', () => {
    expect(count('○ Yes ○ No')).toBe(0);
    expect(count('☐ ☑ ✓ ★ ✅\uFE0F • ◦ ■ ▪ ➤')).toBe(0);
    expect(verdict({ ocrTextLayer: layer(count('○ Yes ○ No')) }).ok).toBe(true);
  });

  it('letters and digits outside WinAnsi still count, once per character', () => {
    expect(count('Привет')).toBe(6);
    expect(count('שלום')).toBe(4);
    expect(count('①②')).toBe(2); // circled digits are numbers, not symbols
    expect(count('𝐀')).toBe(1);
    expect(count('Ação “quoted” – done…')).toBe(0); // WinAnsi letters and the folded punctuation
    expect(verdict({ ocrTextLayer: layer(count('○ Привет')) }).ok).toBe(false);
  });

  it('the Unicode-font path drops a missing symbol without counting it', () => {
    const code = sliceBetween(SRC, 'const _drawable = (t, count) => {', 'return o;\n              };', { ...F, includeEnd: true });
    const draw = new Function('_cs', '_alloOcrIsPureSymbol', 'let _ocrDroppedChars = 0;\n' + code
      + '\nreturn (t) => { const o = _drawable(t, true); return { o, dropped: _ocrDroppedChars }; };')(new Set([...'Yes No'].map((c) => c.codePointAt(0))), isSymbol);
    expect(draw('○ Yes ○ No')).toEqual({ o: ' Yes  No', dropped: 0 });
    expect(draw('Yes Ñ')).toEqual({ o: 'Yes ', dropped: 1 });
  });
});

// The aiFixChunked harness of tests/aifix_chunk_gates.test.js, with a deterministic routing stub
// (entry.chunk = the chunk index it is routed to; absent = global).
function region(begin, end) {
  const a = SRC.indexOf(begin), b = SRC.indexOf(end, a + begin.length);
  if (a < 0 || b < 0) throw new Error('Missing source anchor: ' + begin);
  return SRC.slice(a, b);
}
function arrow(name) {
  const at = SRC.indexOf('const ' + name + ' = ');
  if (at < 0) throw new Error('Missing source function: ' + name);
  const open = SRC.indexOf('{', SRC.indexOf('=>', at));
  let depth = 0;
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}' && --depth === 0) return SRC.slice(at, i + 1) + ';';
  }
  throw new Error('Unbalanced source function: ' + name);
}
const sourceFunctions = [
  arrow('textCharCount'), arrow('detectFabrication'), arrow('acceptFixedHtmlDetailed'),
  arrow('splitHtmlOnTagBoundary'), arrow('stripFence'), region('const _isJsonWrapped = ', 'const _tryUnwrapJsonHtml = '), arrow('_tryUnwrapJsonHtml'),
  (SRC.match(/const _JSON_HTML_KEYS = [^\r\n]+/) || [])[0],
  region('function _alloTableCellDrift(', '// ── Issue-resolution diff'),
  region('function checkReadingOrderPreserved(', 'function collectTaggedTreeReferenceOrder('),
  region('function _alloSalvageFixCandidate(', '// What the next fix pass is told'),
  region('const aiFixChunked = ', '  // Strip Markdown triple-backtick code fences'),
].join('\n');
function harness(respond, chunkSize = 16000) {
  const evidence = [];
  const api = new Function('callGemini', 'warnLog', 'addToast', 'HTML_FIX_CHUNK', `
    const _neutralizePromptFence = s => s, _restoreNeutralizedPromptFences = s => s;
    const _isThrottleErr = () => false, _usesLocalTextBackend = () => false;
    const _geminiRateWindowMs = 0, _geminiRateMaxStarts = 0;
    const _geminiThrottleInfo = () => ({ storming: false }), _pipeLog = () => {};
    const _routeViolationsToChunks = (entries) => ({ assign: entries.map((e) => (e.chunk == null ? -1 : e.chunk)), routedCount: entries.filter((e) => e.chunk != null).length });
    ${sourceFunctions}
    return { aiFixChunked, acceptFixedHtmlDetailed, splitHtmlOnTagBoundary };
  `)(async (prompt) => {
    const match = prompt.match(/UNTRUSTED HTML (?:FRAGMENT )?DATA:\n"""\n([\s\S]*?)\n"""/);
    if (!match) throw new Error('Missing model payload in test harness');
    return respond(match[1], prompt);
  }, () => {}, () => {}, chunkSize);
  return { ...api, evidence,
    run: (html, entries) => api.aiFixChunked(html, entries.map((e) => e.text).join('\n'), 'keyless-1102', { entries, feedback: '' }, {
      onPassEvidence: (value) => evidence.push(value),
    }),
  };
}
const DOC = (s) => '<!DOCTYPE html><html lang="en"><body><main>' + s + '</main></body></html>';
const TABLE = '<table><caption>Rates</caption><tr><th scope="col"></th><th scope="col">Rate</th></tr>'
  + '<tr><th scope="row">Bracket 1</th><td>1%</td></tr><tr><th scope="row">Bracket 2</th><td>2%</td></tr></table>';
const PARA = '<p>' + 'The return lists every source of income received during the year. '.repeat(12) + '</p>';

describe('3. an empty corner header may become a data cell', () => {
  const gate = harness(() => 'UNCHANGED').acceptFixedHtmlDetailed;
  const check = (from, to, table = TABLE) => gate(DOC(table.replace(from, to)), DOC(table), { strictContent: true, mode: 'faithful' });

  it('accepts th -> td for a textless corner cell (scan1913)', () => {
    expect(check('<th scope="col"></th>', '<td></td>').accepted).toBe(true);
    const nbsp = TABLE.replace('<th scope="col"></th>', '<th scope="col">&nbsp;</th>');
    expect(check('<th scope="col">&nbsp;</th>', '<td>&nbsp;</td>', nbsp).accepted).toBe(true);
  });

  it('still refuses demoting a header that names something', () => {
    for (const [from, to, table] of [
      ['<th scope="col">Rate</th>', '<td>Rate</td>', TABLE],
      ['<th scope="row">Bracket 1</th>', '<td>Bracket 1</td>', TABLE],
      ['<th scope="col" aria-label="Bracket"></th>', '<td aria-label="Bracket"></td>', TABLE.replace('<th scope="col"></th>', '<th scope="col" aria-label="Bracket"></th>')],
      ['<th scope="col" id="corner"></th>', '<td id="corner"></td>', TABLE.replace('<th scope="col"></th>', '<th scope="col" id="corner"></th>').replace('<td>1%</td>', '<td headers="corner">1%</td>')],
      ['<th scope="col"></th>', '<td role="columnheader"></td>', TABLE],
    ]) {
      const result = check(from, to, table);
      expect(result.accepted, from + ' -> ' + to).toBe(false);
      expect(result.reason).toBe('table-semantics-changed');
    }
  });
});

describe('3. a finding whose only fix the gate refused is reported, not re-sent', () => {
  const refusedCandidate = (html) => html.replace('<th scope="col">Rate</th>', '<td>Rate</td>');
  const goodCandidate = (html) => html.replace('<th scope="col"></th>', '<td></td>');

  it('single fragment: the refused pass names its AI-flagged findings only', async () => {
    const h = harness(refusedCandidate);
    const input = DOC(TABLE);
    expect(await h.run(input, [{ text: 'AI-FLAGGED: the corner cell is an empty header' }, { text: 'SERIOUS (axe-core): something (x, 1 elements)' }])).toBe(input);
    expect(h.evidence.at(-1).refusedFindings).toEqual(['AI-FLAGGED: the corner cell is an empty header']);
  });

  it('single fragment: an accepted or UNCHANGED pass refuses nothing', async () => {
    for (const respond of [goodCandidate, () => 'UNCHANGED']) {
      const h = harness(respond);
      await h.run(DOC(TABLE), [{ text: 'AI-FLAGGED: the corner cell is an empty header' }]);
      expect(h.evidence.at(-1).refusedFindings).toEqual([]);
    }
  });

  it('several fragments: only findings no fragment changed and a refused fragment received', async () => {
    const h = harness((html) => (html.includes('<table') ? refusedCandidate(html) : 'UNCHANGED'), 1200);
    const input = DOC(TABLE + PARA.repeat(4));
    const chunks = h.splitHtmlOnTagBoundary(input, 1200);
    const tableChunk = chunks.findIndex((c) => c.includes('<table'));
    const otherChunk = chunks.findIndex((c) => !c.includes('<table'));
    expect(chunks.length).toBeGreaterThan(1);
    expect(tableChunk).toBeGreaterThanOrEqual(0);
    expect(await h.run(input, [
      { text: 'AI-FLAGGED: routed to the table', chunk: tableChunk },
      { text: 'AI-FLAGGED: routed elsewhere', chunk: otherChunk },
      { text: 'AI-FLAGGED: unroutable' },
      { text: 'SERIOUS (axe-core): routed to the table (x, 1 elements)', chunk: tableChunk },
    ])).toBe(input);
    expect(h.evidence.at(-1).refusedFindings).toEqual(['AI-FLAGGED: routed to the table', 'AI-FLAGGED: unroutable']);
  });

  it('the fix loop drops reported findings from later passes', () => {
    expect(SRC.includes("for (const text of (meta && Array.isArray(meta.refusedFindings) ? meta.refusedFindings : [])) if (typeof text === 'string') _gateRefusedFindings.add(text);"), 'evidence hook').toBe(true);
    const block = sliceBetween(SRC, '          // Not re-sent: AI findings whose only fix', '          const _feedbackNow = ', F);
    const run = (refused, texts, feedback) => new Function('_gateRefusedFindings', '_fixEntries', 'violationInstructions', '_lastRejectionFeedback', 'warnLog', 'fixPass',
      block + '\nreturn { texts: _fixEntries.map((e) => e.text), violationInstructions, _lastRejectionFeedback };')(new Set(refused), texts.map((text) => ({ text })), texts.join('\n'), feedback, () => {}, 1);
    const EA = 'POTENTIAL REVIEW FINDING (IBM Equal Access): Verify this is a list (list_markup_review, 18 elements)';
    const AI = 'AI-FLAGGED: The top-left corner cell is an empty th';
    // scan1913 pass 2: the refused AI finding goes, and with only a reminder left so does the refusal note
    expect(run([AI], [EA, AI], 'NOTE: refused')).toEqual({ texts: [EA], violationInstructions: EA, _lastRejectionFeedback: '' });
    // another real finding remains: it is still sent, with the note
    const AXE = 'SERIOUS (axe-core): Images must have alternate text (image-alt, 1 elements)';
    expect(run([AI], [AXE, AI], 'NOTE: refused')).toEqual({ texts: [AXE], violationInstructions: AXE, _lastRejectionFeedback: 'NOTE: refused' });
    // nothing refused yet: unchanged
    expect(run([], [EA, AI], 'NOTE: refused')).toEqual({ texts: [EA, AI], violationInstructions: EA + '\n' + AI, _lastRejectionFeedback: 'NOTE: refused' });
  });
});

describe('4. data-allo-* bookkeeping after the final audit does not buy a re-audit', () => {
  const same = topFn('_alloSameHtmlIgnoringAlloData')();
  const audited = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<title>T</title>\n</head>\n<body><main><figure><img src="__ALLOFLOW_DATAURL_FINAL_1__" alt="Wood duck"></figure><p>Beaks and feet</p></main></body></html>';
  const shipped = '<!DOCTYPE html>\n<html lang="en"><head>\n<title>T</title>\n</head>\n<body><main><figure><img src="data:image/png;base64,AAAA" alt="Wood duck" data-allo-kind="photo"></figure><p>Beaks and feet</p></main></body></html>';

  it('compares HTML ignoring data-allo-* attributes and re-serialization', () => {
    const restored = audited.replace('__ALLOFLOW_DATAURL_FINAL_1__', 'data:image/png;base64,AAAA');
    expect(same(restored, shipped)).toBe(true);
    expect(same(restored, shipped.replace('alt="Wood duck"', 'alt="A duck"'))).toBe(false);
    expect(same(restored, shipped.replace('Beaks and feet', 'Beaks and toes'))).toBe(false);
    expect(same(restored, shipped.replace('<p>', '<p data-note="x">'))).toBe(false);
  });

  it('re-binds the final audit at the call site, after restoring the image tokens', () => {
    const block = sliceBetween(SRC, "      if (typeof _finalAiAuditedHtml === 'string' && _finalAiAuditedHtml !== accessibleHtml) {", '      const _htmlChangedAfterFinalAiAudit', F);
    const run = (finalAudited, current) => new Function('_finalAiAuditedHtml', 'accessibleHtml', '_deferredImageMap', '_alloSameHtmlIgnoringAlloData', '_pipeLog',
      block + '\nreturn _finalAiAuditedHtml;')(finalAudited, current, { __ALLOFLOW_DATAURL_FINAL_1__: 'data:image/png;base64,AAAA' }, same, () => {});
    expect(run(audited, shipped)).toBe(shipped);
    const altChanged = shipped.replace('alt="Wood duck"', 'alt="A duck"');
    expect(run(audited, altChanged)).toBe(audited);
  });
});

describe('5. the page title skips a subtitle after a sentence or in parentheses', () => {
  const title = topFn('_alloTitleFromHeading')();
  it('scan1913 keeps its heading alone', () => {
    expect(title('<h1 id="x">RETURN OF ANNUAL NET INCOME OF INDIVIDUALS.</h1>\n<p style="margin:0">(As provided by Act of Congress, approved October 3, 1913.)</p>'))
      .toBe('RETURN OF ANNUAL NET INCOME OF INDIVIDUALS.');
  });
  it('a parenthetical subtitle or a heading ending in ? or ! is not joined', () => {
    expect(title('<h1>Annual Report</h1><p>(Draft for board review)</p>')).toBe('Annual Report');
    expect(title('<h1>Annual Report</h1><p>[Draft for board review]</p>')).toBe('Annual Report');
    expect(title('<h1>What is a watershed?</h1><p>Science Unit Three</p>')).toBe('What is a watershed?');
    expect(title('<h1>Welcome back!</h1><p>Family Newsletter August</p>')).toBe('Welcome back!');
  });
  it('a short label subtitle is still joined', () => {
    expect(title('<h1>Maine School Administrative District No. 35</h1><p>Board of Directors – Regular Meeting Agenda</p>'))
      .toBe('Maine School Administrative District No. 35 – Board of Directors – Regular Meeting Agenda');
  });
});

describe('6. audit sections are disjoint', () => {
  const start = SRC.indexOf('  const _AUDIT_BLOCK_CLOSE = ');
  const split = new Function(SRC.slice(start, SRC.indexOf('\n  };', start) + 5) + '\nreturn splitHtmlForAudit;')();
  const overlap = Number((SRC.match(/const AUDIT_CHUNK_OVERLAP = (\d+);/) || [])[1]);
  const para = (i, words) => `<p id="p${i}">${('word ').repeat(words).trim()}</p>\n`;

  it('the output audit uses no overlap', () => {
    expect(overlap).toBe(0);
    expect(SRC.includes('const chunks = splitHtmlForAudit(_auditHtmlForModel, CHUNK_SIZE, OVERLAP);')).toBe(true);
  });

  it('every paragraph is audited exactly once and the sections rebuild the document', () => {
    const html = '<html lang="en"><head><title>T</title></head><body><main>' + Array.from({ length: 400 }, (_, i) => para(i, 30)).join('') + '</main></body></html>';
    const chunks = split(html, 16000, overlap);
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks.join('')).toBe(html);
    for (let i = 0; i < 400; i++) expect(chunks.filter((c) => c.includes(`id="p${i}"`)).length, 'p' + i).toBe(1);
  });

  it('a last section that happens to repeat the previous tail is kept (no content lost)', () => {
    for (let n = 3; n <= 140; n++) {
      const html = '<p>same words here</p>'.repeat(n);
      const chunks = split(html, 1000, overlap);
      expect(chunks.join(''), 'n=' + n).toBe(html);
    }
  });
});

describe('9. a footer printed on both pages of a 2-page document counts once', () => {
  const drop = new Function(sliceBetween(SRC, 'function _alloStripOcrMarkup(text) {', 'function _alloChooseLoopShipment(s) {', F)
    + '\nreturn _alloDropRunningLines;')();
  // activity4h as the deterministic extractor hands it over: one line per page, y-sorted, so the
  // UMaine EEO footer closes both pages.
  const FOOTER = 'The University of Maine is an EEO/AA employer and does not discriminate on the grounds of race, color, religion, sex, '
    + 'sexual orientation, transgender status, gender expression, national origin, citizenship status, age, disability, genetic information '
    + 'or veteran’s status in employment, education, and all other programs and activities. The following person has been designated to '
    + 'handle inquiries regarding non-discrimination policies: Director of Equal Opportunity, 101 North Stevens Hall, University of Maine, '
    + 'Orono, ME 04469-5754, 207.581.1226, TTY 711 (Maine Relay System).';
  const P1 = '4-H Learn at Home Activity: Rain in a Jar Materials Needed: ● 1 canning jar, drinking glass or plastic container '
    + 'Instructions: 1. Fill your jar or container about ¾ full of water. Learn more about cloud and rain science: ' + FOOTER;
  const P2 = '● www.jpl.nasa.gov/edu/learn/project/the-types-of-clouds-and-what- they-mean ' + FOOTER;
  const count = (text, needle) => text.split(needle).length - 1;

  it('activity4h: the second copy of the footer is dropped, the first and all body text kept', () => {
    const out = drop(P1 + '\n\n' + P2, [{ text: P1 }, { text: P2 }]);
    for (const n of ['04469-5754', '207.581.1226', 'TTY 711', '101 North Stevens Hall']) expect(count(out, n), n).toBe(1);
    expect(out).toContain('Learn more about cloud and rain science: The University of Maine');
    expect(out).toContain('they-mean');
    expect(out).toContain('Fill your jar');
  });

  it('a shared 3-word ending on two pages is content, not a footer', () => {
    const a = 'First page talks about the water cycle. See you soon', b = 'Second page talks about clouds and rain. See you soon';
    expect(drop(a + '\n\n' + b, [{ text: a }, { text: b }])).toBe(a + '\n\n' + b);
  });

  it('three or more pages keep the existing rule', () => {
    const pages = ['Alpha body one. Shared footer words here', 'Beta body two. Shared footer words here', 'Gamma body three. Shared footer words here'];
    const out = drop(pages.join('\n\n'), pages.map((text) => ({ text })));
    expect(count(out, 'Shared footer words here')).toBe(1);
  });
});

describe('7. structure elements no tree reaches are not written', () => {
  const prune = topFn('_alloPruneUnreachableStructElems')();
  const L = require('../desktop/mcp/vendor/pdf-lib.min.js');
  const build = async () => {
    const doc = await L.PDFDocument.create();
    const page = doc.addPage();
    const ctx = doc.context, N = (n) => L.PDFName.of(n);
    const elem = (S, P, extra = {}) => ctx.register(ctx.obj({ Type: 'StructElem', S, P, Pg: page.ref, ...extra }));
    const rootRef = ctx.register(ctx.obj({ Type: 'StructTreeRoot' }));
    const docRef = elem('Document', rootRef);
    const kept = elem('P', docRef, { K: 0 });
    const draft = elem('P', docRef, { K: 1 });
    const draftChild = elem('Span', draft, { K: 2 });
    const viaParentTree = elem('Figure', docRef);
    // A detached parent that a LIVE element still names in /P stays, so no /P is left dangling.
    const detachedParent = elem('Sect', docRef);
    const liveChild = elem('Span', detachedParent, { K: 3 });
    ctx.lookup(kept).set(N('K'), ctx.obj([L.PDFNumber.of(0), liveChild]));
    ctx.lookup(docRef).set(N('K'), ctx.obj([kept]));
    ctx.lookup(rootRef).set(N('K'), docRef);
    ctx.lookup(rootRef).set(N('ParentTree'), ctx.obj({ Nums: [0, ctx.obj([kept, viaParentTree])] }));
    doc.catalog.set(N('StructTreeRoot'), rootRef);
    return { doc, ctx, refs: { docRef, kept, draft, draftChild, viaParentTree, detachedParent, liveChild } };
  };
  const structCount = (ctx) => ctx.enumerateIndirectObjects().filter(([, o]) => o instanceof L.PDFDict && String(o.get(L.PDFName.of('Type'))) === '/StructElem').length;

  it('deletes superseded drafts and keeps every element the tree, the ParentTree or a live /P reaches', async () => {
    const { doc, ctx, refs } = await build();
    expect(structCount(ctx)).toBe(7);
    expect(prune(ctx, L.PDFName)).toBe(2);
    expect(ctx.lookup(refs.draft)).toBeUndefined();
    expect(ctx.lookup(refs.draftChild)).toBeUndefined();
    for (const r of [refs.docRef, refs.kept, refs.viaParentTree, refs.detachedParent, refs.liveChild]) expect(ctx.lookup(r)).toBeInstanceOf(L.PDFDict);
    const saved = await L.PDFDocument.load(await doc.save({ useObjectStreams: false }), { updateMetadata: false });
    expect(structCount(saved.context)).toBe(5);
    expect(prune(saved.context, L.PDFName)).toBe(0);
  });

  it('runs on the tagged PDF just before it is saved', () => {
    const at = SRC.indexOf('const _prunedStructElems = _alloPruneUnreachableStructElems(context, PDFName);');
    const save = SRC.indexOf('const _bytes = await doc.save({ useObjectStreams: false, addDefaultPage: false');
    expect(at).toBeGreaterThan(0);
    expect(save - at).toBeGreaterThan(0);
    expect(save - at).toBeLessThan(400);
  });
});
