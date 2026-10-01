// A fixer may answer UNCHANGED instead of retyping a fragment that needs no edit. On the
// agent-bridge lane every untouched fragment used to cost a complete 16 KB generation (2026-09-13
// pilots: pass 2 of the Form 1040 run rewrote three fragments to produce "no changes"). The reply
// is treated exactly like an unchanged fragment: kept verbatim, counted as shipped-original
// evidence, never recorded as a candidate rejection. Same harness as aifix_chunk_gates.test.js.
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
  const evidence = [], rejected = [], calls = [], logs = [];
  const api = new Function('callGemini', 'warnLog', 'addToast', 'HTML_FIX_CHUNK', `
    const _neutralizePromptFence = s => s, _restoreNeutralizedPromptFences = s => s;
    const _isThrottleErr = () => false, _usesLocalTextBackend = () => false;
    const _geminiRateWindowMs = 0, _geminiRateMaxStarts = 0;
    const _geminiThrottleInfo = () => ({ storming: false }), _pipeLog = () => {};
    ${sourceFunctions}
    return { aiFixChunked };
  `)(async (prompt) => {
    const match = prompt.match(/UNTRUSTED HTML (?:FRAGMENT )?DATA:\n"""\n([\s\S]*?)\n"""/);
    if (!match) throw new Error('Missing model payload in test harness');
    calls.push(prompt);
    return respond(match[1], prompt, calls.length);
  }, (...args) => logs.push(args.join(' ')), () => {}, chunkSize);
  return { ...api, evidence, rejected, calls, logs,
    run: html => api.aiFixChunked(html, 'Add a header landmark.', 'contract', null, {
      onPassEvidence: value => evidence.push(value), onCandidateRejected: value => rejected.push(value),
    }),
  };
}
const DOC = s => '<!DOCTYPE html><html lang="en"><body><main>' + s + '</main></body></html>';
const PARA = '<p>' + 'Original educational material preserves all instructions and activities. '.repeat(15) + '</p>';

describe('UNCHANGED reply for fix fragments', () => {
  it('both fix prompts tell the model it may answer UNCHANGED', () => {
    expect(SRC).toContain('Return the COMPLETE fixed HTML — raw HTML only, do NOT wrap in JSON or a code fence. If nothing in it needs to change, reply with exactly UNCHANGED and nothing else.');
    expect(SRC).toContain('Same opening and closing boundaries as the input. If nothing in this fragment needs to change, reply with exactly UNCHANGED and nothing else.');
  });

  it('a single-chunk UNCHANGED reply keeps the input byte for byte, as shipped-original evidence, with no rejection', async () => {
    const h = harness(() => 'UNCHANGED'), input = DOC(PARA);
    expect(await h.run(input)).toBe(input);
    expect(h.calls.length).toBe(1);
    expect(h.calls[0]).toContain('reply with exactly UNCHANGED');
    expect(h.rejected).toEqual([]);
    expect(h.evidence.length).toBe(1);
    expect(h.evidence[0].totalChunks).toBe(1);
    expect(h.evidence[0].shippedOriginalChunks).toBe(1);
    expect(h.evidence[0].deferredChunks).toBe(0);
    expect(h.logs.some((l) => /reported UNCHANGED/.test(l))).toBe(true);
  });

  it('tolerates the usual decorations around the word and nothing more', async () => {
    for (const reply of ['unchanged', '  UNCHANGED.\n', '**UNCHANGED**', '```\nUNCHANGED\n```']) {
      const h = harness(() => reply), input = DOC(PARA);
      expect(await h.run(input)).toBe(input);
      expect(h.rejected).toEqual([]);
    }
    // A reply that merely contains the word is still a candidate and is judged as one.
    const h = harness(() => 'UNCHANGED except I removed everything'), input = DOC(PARA);
    expect(await h.run(input)).toBe(input);
    expect(h.rejected.length).toBe(1);
  });

  it('in a chunked run, an UNCHANGED chunk is kept verbatim while the other chunk\'s fix is applied', async () => {
    const input = DOC(PARA.repeat(40));
    const h = harness((payload, prompt, n) => (n === 1 ? payload.replace('<main>', '<header><h1>Title</h1></header><main>') : 'UNCHANGED'), 6000);
    const out = await h.run(input);
    expect(h.calls.length).toBeGreaterThan(1);
    expect(out).toContain('<header><h1>Title</h1></header><main>');
    expect(out.length).toBe(input.length + '<header><h1>Title</h1></header>'.length);
    expect(h.rejected).toEqual([]);
    expect(h.evidence.length).toBe(1);
    expect(h.evidence[0].totalChunks).toBe(h.calls.length);
    expect(h.evidence[0].shippedOriginalChunks).toBe(h.calls.length - 1);
    expect(h.evidence[0].deferredChunks).toBe(0);
    expect(h.logs.filter((l) => /reported UNCHANGED/.test(l)).length).toBe(h.calls.length - 1);
  });
});
