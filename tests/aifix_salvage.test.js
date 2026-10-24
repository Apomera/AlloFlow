// Partial acceptance of a refused fix candidate + refused-edit feedback (2026-10-19).
// IRS Form 1040 keyless run: one refused edit (an empty corner <th> made a <td>) made the content
// gate throw away the whole chunk, including the page title and seven row-header fixes, and the next
// pass was not told why. Runs the REAL aiFixChunked + acceptFixedHtmlDetailed sliced from the source,
// with the model mocked (same harness shape as aifix_chunk_gates.test.js).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sliceBetween, indexOfOrThrow } from './helpers/anchored_slice.js';

const SRC = fs.readFileSync(path.resolve('doc_pipeline_source.jsx'), 'utf8');
const FILE = { file: 'doc_pipeline_source.jsx' };
function arrow(name) {
  const at = indexOfOrThrow(SRC, 'const ' + name + ' = ', FILE);
  const open = indexOfOrThrow(SRC, '{', { ...FILE, from: indexOfOrThrow(SRC, '=>', { ...FILE, from: at }) });
  let depth = 0;
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}' && --depth === 0) return sliceBetween(SRC, 'const ' + name + ' = ', null, FILE).slice(0, i + 1 - at) + ';';
  }
  throw new Error('Unbalanced source function: ' + name);
}
const sourceFunctions = [
  arrow('textCharCount'), arrow('detectFabrication'), arrow('acceptFixedHtmlDetailed'),
  arrow('splitHtmlOnTagBoundary'), arrow('stripFence'), sliceBetween(SRC, 'const _isJsonWrapped = ', 'const _tryUnwrapJsonHtml = ', FILE), arrow('_tryUnwrapJsonHtml'),
  (SRC.match(/const _JSON_HTML_KEYS = [^\r\n]+/) || [])[0],
  sliceBetween(SRC, 'function _alloTableCellDrift(', '// ── Issue-resolution diff', FILE),
  sliceBetween(SRC, 'function checkReadingOrderPreserved(', 'function collectTaggedTreeReferenceOrder(', FILE),
  sliceBetween(SRC, 'var _ALLO_SALVAGE_SPLIT = ', '// Sanitize an AI-parsed doc-style object', FILE),
  sliceBetween(SRC, 'const aiFixChunked = ', '  // Strip Markdown triple-backtick code fences', FILE),
].join('\n');
function harness(respond, chunkSize = 16000) {
  const evidence = [], logs = [];
  const api = new Function('callGemini', 'warnLog', 'addToast', 'HTML_FIX_CHUNK', `
    const _neutralizePromptFence = s => s, _restoreNeutralizedPromptFences = s => s;
    const _isThrottleErr = () => false, _usesLocalTextBackend = () => false;
    const _geminiRateWindowMs = 0, _geminiRateMaxStarts = 0;
    const _geminiThrottleInfo = () => ({ storming: false }), _pipeLog = () => {};
    ${sourceFunctions}
    return { aiFixChunked, acceptFixedHtmlDetailed, salvage: _alloSalvageFixCandidate, feedback: _alloRejectionFeedback };
  `)(async (prompt) => {
    const match = prompt.match(/UNTRUSTED HTML (?:FRAGMENT )?DATA:\n"""\n([\s\S]*?)\n"""/);
    if (!match) throw new Error('Missing model payload in test harness');
    return respond(match[1]);
  }, (...a) => logs.push(a.join(' ')), () => {}, chunkSize);
  return { ...api, evidence, logs,
    run: (html) => api.aiFixChunked(html, 'Repair the title and the table headers.', 'salvage', null, { onPassEvidence: (v) => evidence.push(v) }),
  };
}

const PARA = '<p>' + 'Original educational material preserves all instructions and activities. '.repeat(6) + '</p>';
// IRS dependents-table shape: empty corner header, row labels in td cells.
const FORM = '<!DOCTYPE html><html lang="en"><head><title>Accessible Document — f1040</title></head><body><main>'
  + '<h1>Form 1040</h1>' + PARA
  + '<table><caption>Dependents</caption><tr><th></th><th scope="col">Dependent 1</th></tr>'
  + '<tr><td>(1) First name</td><td>________</td></tr><tr><td>(2) Last name</td><td>________</td></tr></table>'
  + PARA + '</main></body></html>';
const fixAll = (s) => s.replace('<title>Accessible Document — f1040</title>', '<title>Form 1040: U.S. Individual Income Tax Return 2025</title>')
  .replace('<tr><th></th>', '<tr><td></td>')
  .replace('<td>(1) First name</td>', '<th scope="row">(1) First name</th>')
  .replace('<td>(2) Last name</td>', '<th scope="row">(2) Last name</th>');

describe('a refused fix candidate keeps the edits that pass the gate on their own', () => {
  it('the whole IRS-shaped candidate is refused by the real gate (corner th->td)', () => {
    const h = harness((s) => s);
    const d = h.acceptFixedHtmlDetailed(fixAll(FORM), FORM, { fragment: false, mode: 'faithful', strictContent: true });
    expect(d.accepted).toBe(false);
    expect(d.reason).toBe('table-semantics-changed');
  });
  it('keeps the title and the row headers, drops only the refused corner edit', async () => {
    const h = harness(fixAll);
    const out = await h.run(FORM);
    expect(out).toContain('<title>Form 1040: U.S. Individual Income Tax Return 2025</title>');
    expect(out).toContain('<th scope="row">(1) First name</th>');
    expect(out).toContain('<th scope="row">(2) Last name</th>');
    expect(out).toContain('<tr><th></th>');
    // every kept state passed the same gate, and so does the result
    expect(h.acceptFixedHtmlDetailed(out, FORM, { fragment: false, mode: 'faithful', strictContent: true }).accepted).toBe(true);
    expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ reason: 'table-semantics-changed' }));
    expect(h.logs.some((l) => /kept 3 of 4 edit\(s\) from the refused candidate/.test(l))).toBe(true);
  });
  it('does the same chunk by chunk in a multi-chunk document', async () => {
    const h = harness(fixAll, 400);
    const out = await h.run(FORM);
    expect(h.logs.some((l) => /splitting \d+ chars into \d+ chunks/.test(l))).toBe(true);
    expect(out).toContain('<title>Form 1040: U.S. Individual Income Tax Return 2025</title>');
    expect(out).toContain('<th scope="row">(1) First name</th>');
    expect(out).toContain('<tr><th></th>');
    expect(h.acceptFixedHtmlDetailed(out, FORM, { fragment: false, mode: 'faithful', strictContent: true }).accepted).toBe(true);
  });
  it('never half-applies a score transposition', async () => {
    const TABLE = '<!DOCTYPE html><html lang="en"><body><main>' + PARA + '<table><tr><th scope="col">Subtest</th><th scope="col">Score</th></tr><tr><td>Vocabulary</td><td>95</td></tr><tr><td>Block Design</td><td>102</td></tr></table>' + PARA + '</main></body></html>';
    const swap = (s) => s.replace('<td>95</td>', '<td>TEMP</td>').replace('<td>102</td>', '<td>95</td>').replace('<td>TEMP</td>', '<td>102</td>');
    const h = harness(swap);
    expect(await h.run(TABLE)).toBe(TABLE);
  });
  it('salvage keeps exactly the runs a gate accepts, in order, on top of the input', () => {
    const h = harness((s) => s);
    const input = '<p>a</p><p>b</p><p>c</p><p>d</p>';
    const candidate = '<p>A</p><p>b</p><p>C!</p><p>d</p><p>new</p>';
    const r = h.salvage(candidate, input, (html) => ({ accepted: !/C!/.test(html) }));
    expect(r).toEqual({ html: '<p>A</p><p>b</p><p>c</p><p>d</p><p>new</p>', kept: 2, total: 3 });
    // adjacent changes form ONE run: kept or dropped together
    expect(h.salvage('<p>A</p><p>b</p><p>C!</p><p>new</p>', '<p>a</p><p>b</p><p>c</p>', (html) => ({ accepted: !/C!/.test(html) })))
      .toEqual({ html: '<p>A</p><p>b</p><p>c</p>', kept: 1, total: 2 });
    expect(h.salvage(candidate, input, () => ({ accepted: false }))).toBe(null);
    expect(h.salvage(input, input, () => ({ accepted: true }))).toBe(null);
  });
});

describe('the next fix pass is told which edits were refused', () => {
  it('names the refused change and where, in plain words', () => {
    const h = harness((s) => s);
    const note = h.feedback([{ reason: 'table-semantics-changed', sourceLocation: 'table:1/cell:1' }, { reason: 'table-semantics-changed', sourceLocation: 'table:1/cell:1' }, { reason: 'source-reading-order-changed' }]);
    expect(note).toMatch(/^NOTE: in the previous fix attempt the content-safety check REFUSED /);
    expect(note).toContain('changed table structure (which cells are headers, their scope, or how rows and columns relate) at table:1/cell:1');
    expect(note).toContain('changed the order of the text, or dropped or repeated words');
    expect(note.split('table:1/cell:1').length - 1).toBe(1);
    expect(h.feedback([])).toBe('');
    expect(h.feedback([{ reason: 'some-new-check' }])).toContain('failed the content-safety check (some-new-check)');
  });
  it('the auto-fix loop hands that note to the next pass and does not call a refused pass UNCHANGED', () => {
    expect(SRC.includes('_lastRejectionFeedback = _alloRejectionFeedback(entries);')).toBe(true);
    expect(SRC.includes("const _feedbackNow = [_lastPassFeedback, _lastRejectionFeedback].filter(Boolean).join('\\n\\n');")).toBe(true);
    expect(SRC.includes("if (!_lastRejectionFeedback) _lastPassFeedback = 'NOTE: the previous fix attempt returned the document UNCHANGED.")).toBe(true);
  });
});
