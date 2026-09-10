// Behavioral contracts for the current source, with transport mocked and no build dependency.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
const SRC = fs.readFileSync(path.resolve('doc_pipeline_source.jsx'), 'utf8');
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
  region('const aiFixChunked = ', '  // Strip Markdown triple-backtick code fences'),
].join('\n');
function harness(respond, chunkSize = 16000) {
  const evidence = [], rejected = [], calls = [];
  const api = new Function('callGemini', 'warnLog', 'addToast', 'HTML_FIX_CHUNK', `
    const _neutralizePromptFence = s => s, _restoreNeutralizedPromptFences = s => s;
    const _isThrottleErr = () => false, _usesLocalTextBackend = () => false;
    const _geminiRateWindowMs = 0, _geminiRateMaxStarts = 0;
    const _geminiThrottleInfo = () => ({ storming: false }), _pipeLog = () => {};
    ${sourceFunctions}
    return { aiFixChunked, acceptFixedHtmlDetailed, textCharCount, splitHtmlOnTagBoundary };
  `)(async (prompt) => {
    const match = prompt.match(/UNTRUSTED HTML (?:FRAGMENT )?DATA:\n"""\n([\s\S]*?)\n"""/);
    if (!match) throw new Error('Missing model payload in test harness');
    calls.push(prompt);
    return respond(match[1], prompt, calls.length);
  }, () => {}, () => {}, chunkSize);
  return { ...api, evidence, rejected, calls,
    run: html => api.aiFixChunked(html, 'Repair table headers and preserve all source facts.', 'contract', null, {
      onPassEvidence: value => evidence.push(value), onCandidateRejected: value => rejected.push(value),
    }),
  };
}
const DOC = s => '<!DOCTYPE html><html lang="en"><body><main>' + s + '</main></body></html>';
const TABLE = '<table><tr><td>Subtest</td><td>Score</td></tr><tr><td>Vocabulary</td><td>95</td></tr><tr><td>Block Design</td><td>102</td></tr></table>';
const PARA = '<p>' + 'Original educational material preserves all instructions and activities. '.repeat(15) + '</p>';
const swap = s => s.replace('<td>95</td>', '<td>TEMP</td>').replace('<td>102</td>', '<td>95</td>').replace('<td>TEMP</td>', '<td>102</td>');
const IMAGE = '<img src="__ALLOFLOW_DATAURL_FINAL_1__" alt="Experiment">';

describe('shared AI-fix content acceptance across documents and fragments', () => {
  it.each([1, 36])('rejects a score transposition with %i paragraphs', async count => {
    const h = harness(swap), input = DOC(TABLE + PARA.repeat(count));
    expect(await h.run(input)).toBe(input);
    expect(h.evidence).toHaveLength(1);
    expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ reason: 'table-cell-transposition' }));
  });
  it('accepts real header promotion across multiple chunks', async () => {
    const h = harness(s => s.replace('<td>Subtest</td><td>Score</td>', '<th scope="col">Subtest</th><th scope="col">Score</th>'));
    const input = DOC(TABLE + PARA.repeat(36));
    const out = await h.run(input);
    expect(out).toContain('<th scope="col">Subtest</th>');
    expect(out).toContain('<td>Vocabulary</td><td>95</td>');
    expect(h.evidence[0].candidateRejectionCount).toBe(0);
  });
  it.each(['<p>Hi.</p>', '</p><p>Continue.</p>', '<span></span>'])('keeps a tiny unchanged fragment valid: %s', async input => {
    const h = harness(s => s);
    expect(await h.run(input)).toBe(input);
    expect(h.evidence[0].candidateRejectionCount).toBe(0);
  });
  it('accepts a small whitespace cleanup that keeps content', async () => {
    const h = harness(s => s.replace('material  preserves', 'material preserves'));
    const input = '<p>' + 'Educational material  preserves all instructions and source facts. '.repeat(2) + '</p>';
    expect(await h.run(input)).toBe(input.replace('material  preserves', 'material preserves'));
    expect(h.evidence[0].candidateRejectionCount).toBe(0);
  });
  it('accepts JSON-wrapped valid fragments through the same gate', async () => {
    const h = harness(s => JSON.stringify({ html: s.replace('scope="row"', 'scope="col"') }));
    const input = '<table><tr><th scope="row">Scores</th></tr></table>';
    expect(await h.run(input)).toContain('scope="col"');
    expect(h.evidence[0].candidateRejectionCount).toBe(0);
  });
  it('rejects unexpected growth in a multi-chunk document without expensive split retries', async () => {
    const h = harness(s => s + PARA.repeat(15)), input = DOC(PARA.repeat(36));
    expect(await h.run(input)).toBe(input);
    expect(h.calls).toHaveLength(h.splitHtmlOnTagBoundary(input, 16000).length);
    expect(h.evidence[0].candidateRejections.every(r => /growth/.test(r.reason))).toBe(true);
  });
});

describe('immutable image identities and source associations', () => {
  it('rejects equal-count duplicate tokens', async () => {
    const input = DOC(IMAGE + '<img src="__ALLOFLOW_DATAURL_FINAL_2__" alt="Another experiment">' + PARA);
    const h = harness(s => s.replace('__ALLOFLOW_DATAURL_FINAL_2__', '__ALLOFLOW_DATAURL_FINAL_1__'));
    expect(await h.run(input)).toBe(input);
    expect(h.evidence[0].candidateRejections[0].reason).toBe('image-reference-changed');
  });
  it('rejects swapping image identities while retaining their multiset', async () => {
    const input = DOC(IMAGE + '<img src="__ALLOFLOW_DATAURL_FINAL_2__" alt="Another experiment">' + PARA);
    const h = harness(s => s.replace('FINAL_1__', 'FINAL_TMP__').replace('FINAL_2__', 'FINAL_1__').replace('FINAL_TMP__', 'FINAL_2__'));
    expect(await h.run(input)).toBe(input);
  });
  it('rejects moving an image token into prose instead of an image src', async () => {
    const input = DOC(IMAGE + PARA);
    const h = harness(s => s.replace(IMAGE, '<p>__ALLOFLOW_DATAURL_FINAL_1__</p><span aria-hidden="true"></span>'));
    expect(await h.run(input)).toBe(input);
  });
  it.each(['"', "'"])('protects and restores a data image with %s quotes', async quote => {
    const data = 'data:image/png;base64,' + 'A'.repeat(300);
    const input = DOC('<img src=' + quote + data + quote + ' alt="Experiment">' + PARA);
    const unchanged = harness(s => s);
    expect(await unchanged.run(input)).toBe(input);
    expect(unchanged.calls[0]).toContain('__IMG_DATA_1__');
    expect(unchanged.calls[0]).not.toContain(data);
    const bad = harness(s => s.replace('__IMG_DATA_1__', 'image-missing'));
    expect(await bad.run(input)).toBe(input);
    expect(bad.evidence[0].candidateRejections[0].reason).toBe('image-reference-changed');
  });
  it('accepts an improved alt without changing source identity', async () => {
    const input = DOC(IMAGE + PARA), h = harness(s => s.replace('alt="Experiment"', 'alt="Two seedlings compare growth in sunlight and shade"'));
    const out = await h.run(input);
    expect(out).toContain('alt="Two seedlings');
    expect(h.evidence[0].candidateRejectionCount).toBe(0);
  });
});

describe('retry and assembly paths cannot weaken the content gate', () => {
  it('rejects a markup-padded image retry that omits prose', async () => {
    const input = DOC(IMAGE + PARA.repeat(120));
    const h = harness((s, prompt) => {
      if (!s.includes('__ALLOFLOW_DATAURL_FINAL_1__')) return s;
      if (prompt.startsWith('Re-fix this HTML fragment.')) return IMAGE + '<div data-padding="' + 'x'.repeat(Math.floor(s.length * .95)) + '"></div>';
      return s.replace('__ALLOFLOW_DATAURL_FINAL_1__', 'missing-image');
    });
    expect(await h.run(input)).toBe(input);
    expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ phase: 'image-retry', reason: 'text-shrink' }));
  });
  it('accepts an image retry only when both content and image identity survive', async () => {
    const input = DOC(IMAGE + PARA.repeat(36));
    const h = harness((s, prompt) => {
      if (prompt.startsWith('Re-fix this HTML fragment.')) return s.replace('alt="Experiment"', 'alt="Two plant experiments"');
      return s.replace('__ALLOFLOW_DATAURL_FINAL_1__', 'missing-image');
    });
    expect(await h.run(input)).toContain('alt="Two plant experiments"');
    expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ phase: 'chunk', reason: 'image-reference-changed' }));
    expect(h.evidence[0].candidateRejections.some(r => r.phase === 'image-retry')).toBe(false);
  });
  it('applies image protection to half-chunk retries', async () => {
    const input = DOC(IMAGE + PARA.repeat(36));
    const h = harness((s, prompt) => {
      if (prompt.startsWith('Fix these WCAG violations in the HTML fragment.')) return s.replace('__ALLOFLOW_DATAURL_FINAL_1__', 'missing-image');
      return s.includes('__ALLOFLOW_DATAURL_FINAL_1__') ? '<p>truncated</p>' : s;
    });
    expect(await h.run(input)).toBe(input);
    expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ phase: 'half', reason: 'image-reference-changed' }));
  });
  it('rejects changed values even when an oversized table spans chunks', async () => {
    const cells = Array.from({ length: 90 }, (_, i) => '<tr><td>Measure ' + i + '</td><td>Score ' + i + '</td></tr>').join('');
    const input = DOC('<table>' + cells + '</table>');
    const h = harness(s => s.replace('Score 11</td>', 'Score TEMP</td>').replace('Score 12</td>', 'Score 11</td>').replace('Score TEMP</td>', 'Score 12</td>'), 400);
    expect(await h.run(input)).toBe(input);
    expect(h.evidence[0].candidateRejections.some(r => /^(table-cell-transposition|table-content-changed|source-value-changed)$/.test(r.reason))).toBe(true);
    expect(h.evidence[0].shippedOriginalChunks).toBe(h.evidence[0].totalChunks);
  });
  it('reports bounded, content-free rejection metadata once per pass', async () => {
    const input = DOC(TABLE + PARA.repeat(36)), h = harness(swap);
    await h.run(input);
    expect(h.evidence).toHaveLength(1);
    expect(h.rejected.length).toBe(h.evidence[0].candidateRejectionCount);
    expect(Object.keys(h.evidence[0].candidateRejections[0]).sort()).toEqual(['chunkId', 'phase', 'reason']);
    expect(JSON.stringify(h.evidence[0].candidateRejections)).not.toMatch(/Vocabulary|Block Design|95|102/);
    const many = harness(s => s + s, 100);
    await many.run(DOC('<p>Preserve every instruction and source fact.</p>'.repeat(220)));
    expect(many.evidence[0].candidateRejectionCount).toBeGreaterThan(100);
    expect(many.evidence[0].candidateRejections).toHaveLength(100);
  });
});