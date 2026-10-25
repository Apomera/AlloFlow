// Exercise the production long-document polish pass with the canonical source
// gate and scripted responses. No generated module or provider is involved.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { normalizeCandidateRejectionEvidence } = require('../desktop/mcp/remediation_verification.cjs');
const source = fs.readFileSync('doc_pipeline_source.jsx', 'utf8');
const existingHarness = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const makeGate = new Function('fs', 'path', existingHarness.slice(existingHarness.indexOf('const SRC ='), existingHarness.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
const start = source.indexOf('const polishChunks = splitHtmlOnTagBoundary(_polishBody, POLISH_CHUNK);');
const end = source.indexOf('              } catch (polishErr) {', start);
if (start < 0 || end < start) throw Error('Missing production polish pass');
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
const runPass = new AsyncFunction('bodyContent', 'pieces', 'respond', 'gate', 'records', `
 const _polishBody = bodyContent, POLISH_CHUNK = 16000, _polishStyleBlock = '', polishIdx = 0;
 const _pipeLog = () => {}, _neutralizePromptFence = s => s, _restoreNeutralizedPromptFences = s => s, stripFence = s => s.trim();
 const splitHtmlOnTagBoundary = () => pieces;
 const textCharCount = gate.textCharCount, acceptFixedHtmlDetailed = gate.acceptFixedHtmlDetailed;
 const _recordPolishCandidateRejection = (decision, pass, chunkId, phase) => records.push({ pass, chunkId: String(chunkId), phase, reason: decision.reason, ...(decision.sourceLocation ? { sourceLocation: decision.sourceLocation } : {}) });
 let call = 0;
 const callGemini = async () => respond(pieces[call], ++call);
 ${source.slice(start, end)}
 return bodyContent;
`);
const padding = '<p>Read the original instructions carefully and record all observations in your notebook.</p>'.repeat(6);
const input = body => '<main><h1>Original instructions</h1>' + body + padding + '</main>';
async function polish(html, change, pieces = [html]) {
  const records = [], gate = makeGate(s => s);
  return { html: await runPass(html, pieces, change, gate, records), records };
}

describe('long-document extra polish preserves source content', () => {
  it.each([
    ['link destination', '<p><a href="https://example.test/real">Read the reference</a></p>', s => s.replace('/real', '/fake'), 'link-destination-changed'],
    ['negation', '<p>Do not open the container.</p>', s => s.replace('Do not open', 'Do now open'), 'source-reading-order-changed'],
    ['table value associations', '<table><tr><th scope="col">Student</th><th scope="col">Score</th></tr><tr><td>Ada</td><td>95</td></tr><tr><td>Lin</td><td>82</td></tr></table>', s => s.replace('>95<', '>TEMP<').replace('>82<', '>95<').replace('>TEMP<', '>82<'), 'table-cell-transposition'],
    ['visibility', '<p>Retain this instruction.</p>', s => s.replace('<p>', '<p hidden>'), 'source-visibility-changed'],
    ['form default', '<label>Name <input value="Ada"></label>', s => s.replace('value="Ada"', 'value="Lin"'), 'form-state-changed'],
    ['mathematics', '<math><msup><mi>x</mi><mn>2</mn></msup></math>', s => s.replace(/msup/g, 'msub'), 'math-content-changed'],
  ])('retains the original when a candidate changes %s', async (_, body, change, reason) => {
    const original = input(body), result = await polish(original, change);
    expect(result.html).toBe(original);
    expect(result.records).toContainEqual(expect.objectContaining({ pass: 1, chunkId: '1', phase: 'chunk', reason }));
    expect(JSON.stringify(result.records)).not.toContain('example.test');
  });

  it.each([
    ['contrast styling', '<p style="color:#aaa">Read this instruction.</p>', s => s.replace('#aaa', '#111')],
    ['semantic heading', '<h2>Observation</h2>', s => s.replace('<h2>', '<h2 class="section">')],
    ['table header promotion', '<table><tr><td>Student</td><td>Score</td></tr><tr><td>Ada</td><td>95</td></tr></table>', s => s.replace('<td>Student</td><td>Score</td>', '<th scope="col">Student</th><th scope="col">Score</th>')],
    ['descriptive link wording', '<p><a href="https://example.test/real">Read more</a></p>', s => s.replace('Read more', 'Read the original reference')],
  ])('accepts source-preserving %s', async (_, body, change) => {
    const original = input(body), result = await polish(original, change);
    expect(result.html).toBe(change(original));
    expect(result.records).toEqual([]);
  });

  it('checks assembled cross-chunk link targets against the original pass input', async () => {
    const pieces = [
      '<p><a href="#topic">Read the reference</a></p>' + padding + '\n',
      '<section id="topic"><p>The original reference passage.</p></section>' + padding,
    ];
    const original = pieces.join('');
    const gate = makeGate(s => s);
    expect(gate.acceptFixedHtmlDetailed(pieces[1].replace('id="topic"', 'id="other"'), pieces[1], { fragment: true, mode: 'faithful', strictContent: true }).accepted).toBe(true);
    const result = await polish(original, s => s.replace('id="topic"', 'id="other"'), pieces);
    expect(result.html).toBe(original);
    expect(result.records).toContainEqual(expect.objectContaining({ chunkId: 'all', phase: 'assembly', reason: 'link-destination-changed' }));
  });

  it('retains whitespace when a model trims adjacent fragment edges', async () => {
    const pieces = ['<p>Read alpha ', '<strong>beta</strong> carefully.</p>' + padding];
    const original = pieces.join('');
    const result = await polish(original, s => s.replace('<strong>', '<strong class="term">'), pieces);
    expect(result.html).toContain('Read alpha <strong class="term">beta');
  });

  it('retains bounded canonical rejection evidence alongside later fix-loop evidence', () => {
    const collectorStart = source.indexOf('    let _polishCandidateRejectionCount = 0;');
    const collectorEnd = source.indexOf('    const _runTargetScore = ', collectorStart);
    if (collectorStart < 0 || collectorEnd < collectorStart) throw Error('Missing production polish evidence collector');
    const collector = new Function('warnLog', source.slice(collectorStart, collectorEnd) + '\nreturn { record: _recordPolishCandidateRejection, snapshot: () => ({ count: _polishCandidateRejectionCount, records: _polishCandidateRejections }) };')(() => {});
    for (let i = 0; i < 120; i++) collector.record({ reason: 'link-destination-changed', sourceLocation: 'link:1', sourceText: 'PRIVATE', candidateHtml: 'PRIVATE' }, 1, i + 1, 'chunk');
    const snapshot = collector.snapshot();
    expect(snapshot).toMatchObject({ count: 120 });
    expect(snapshot.records).toHaveLength(100);
    const fieldsStart = source.indexOf('        candidateRejectionCount: Math.min(1000000, _polishCandidateRejectionCount');
    const fieldsEnd = source.indexOf('        _finalAuditThrottleDeferred:', fieldsStart);
    if (fieldsStart < 0 || fieldsEnd < fieldsStart) throw Error('Missing final preservation evidence merge');
    const merge = new Function('_polishCandidateRejectionCount', '_polishCandidateRejections', '_loopOut', 'return ({' + source.slice(fieldsStart, fieldsEnd) + '});');
    const later = { candidateRejectionCount: 2, candidateRejections: [{ pass: 1, phase: 'chunk', chunkId: '2', reason: 'math-content-changed' }] };
    const merged = merge(snapshot.count, snapshot.records, later);
    expect(merged.candidateRejectionCount).toBe(122);
    expect(merged.candidateRejections).toHaveLength(100);
    expect(normalizeCandidateRejectionEvidence(merged)).toEqual(merged);
    expect(JSON.stringify(merged)).not.toContain('PRIVATE');
    const small = merge(1, snapshot.records.slice(0, 1), later);
    expect(small.candidateRejectionCount).toBe(3);
    expect(small.candidateRejections.at(-1)).toEqual(later.candidateRejections[0]);
  });
});
