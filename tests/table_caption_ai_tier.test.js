// AI-tier table captions (2026-06-22, Increment 2). After the deterministic heading-inference tier,
// caption-less tables with NO adjacent heading get a Gemini-authored caption from the table's own data,
// inserted via the same DOM path as fix_table_caption (textContent auto-escapes). Gated on callGemini,
// bounded, fail-safe. Extracts the real addAiTableCaptions and drives it with a mocked callGemini +
// a stub _serializeDomEdit (the real serializer is exercised by fix_table_caption's own tests).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
// PARAMETER-AGNOSTIC start anchor. This pinned `async (html) => {` and broke as
// soon as the function gained an options arg (it takes { signal } now), which
// made the whole suite fail to LOAD — hence its stay in quarantine. Uniqueness is
// asserted so a rename still fails loudly rather than slicing from -1.
const _START = 'const addAiTableCaptions = async (';
const _startHits = dp.split(_START).length - 1;
if (_startHits !== 1) throw new Error('expected exactly 1 addAiTableCaptions declaration, found ' + _startHits);
const _s = dp.indexOf(_START);
const _e = dp.indexOf('\n  // ── fixLangSpans:', _s);
if (_s === -1 || _e === -1) throw new Error('extraction markers for addAiTableCaptions missing');
const slice = dp.slice(_s, _e);

// Build a fresh instance with injected deps. _serializeDomEdit stub returns the doc body innerHTML
// (enough to assert the inserted caption; the real serializer preserves head/doctype and is tested
// separately). callGemini is the per-test mock.
// The REAL prompt-fence neutralizer, extracted rather than stubbed.
// addAiTableCaptions interpolates the table's own HTML into a prompt, so it runs
// every table through this first. It was NOT injected here, so the per-table
// `catch (_) {}` swallowed a ReferenceError for EVERY table: the function
// returned fixCount 0 and the suite read as "the AI tier is broken" when the
// harness was what was missing. Stubbing it would leave the sanitizer untested
// at the one call site that handles untrusted document text.
const _nfStart = dp.indexOf('function _neutralizePromptFence(s) {');
if (_nfStart === -1) throw new Error('anchor missed _neutralizePromptFence — inject it or every table is skipped silently');
const _nfEnd = dp.indexOf('\nfunction _restoreNeutralizedPromptFences', _nfStart);
if (_nfEnd === -1) throw new Error('anchor missed the end of _neutralizePromptFence');
const _neutralizePromptFence = new Function(
  dp.slice(_nfStart, _nfEnd) + '\nreturn _neutralizePromptFence;')();

const build = (callGemini, opts = {}) => {
  const warnLog = opts.warnLog || (() => {});
  const _serializeDomEdit = opts.serialize || ((html, doc) => (doc.body ? doc.body.innerHTML : html));
  return new Function('callGemini', 'warnLog', '_serializeDomEdit', '_neutralizePromptFence', slice + '\nreturn addAiTableCaptions;')(callGemini, warnLog, _serializeDomEdit, _neutralizePromptFence);
};

const TBL = (id, body) => `<table id="${id}">${body || '<tbody><tr><td>1</td><td>2</td></tr></tbody>'}</table>`;

describe('addAiTableCaptions — AI authors captions for caption-less tables', () => {
  it('inserts a Gemini-authored caption as the table’s first child', async () => {
    const fn = build(async () => 'Quarterly enrollment by grade');
    const { html, fixCount } = await fn('<p>intro</p>' + TBL('a'));
    expect(fixCount).toBe(1);
    expect(html).toContain('<caption>Quarterly enrollment by grade</caption>');
    expect(html).toMatch(/<table id="a"><caption>Quarterly enrollment by grade<\/caption>/);
  });
  it('strips a "Caption:" prefix, surrounding quotes, and any markup from the model output', async () => {
    const fn = build(async () => 'Caption: "<b>Budget</b> by department"');
    const { html } = await fn(TBL('a'));
    expect(html).toContain('<caption>Budget by department</caption>');
    expect(html).not.toContain('<b>'); // markup stripped before insert
  });
  it('escapes special characters via textContent (no markup injection from the model)', async () => {
    const fn = build(async () => 'Cost & risk <2024>');
    const { html } = await fn(TBL('a'));
    expect(html).toContain('<caption>Cost &amp; risk &lt;2024&gt;</caption>');
  });
});

describe('addAiTableCaptions — gated, bounded, conservative, fail-safe', () => {
  it('no-ops (no AI call) when callGemini is unavailable', async () => {
    const fn = build(null);
    const src = TBL('a');
    const { html, fixCount } = await fn(src);
    expect(fixCount).toBe(0);
    expect(html).toBe(src);
  });
  it('skips tables that already have a caption', async () => {
    let calls = 0;
    const fn = build(async () => { calls++; return 'X'; });
    const src = '<table id="a"><caption>Existing</caption><tbody><tr><td>1</td></tr></tbody></table>';
    const { html, fixCount } = await fn(src);
    expect(fixCount).toBe(0);
    expect(calls).toBe(0); // never asked the model
    expect(html).toBe(src);
  });
  it('drops empty/whitespace model output (no empty caption inserted)', async () => {
    const fn = build(async () => '   ');
    const { html, fixCount } = await fn(TBL('a'));
    expect(fixCount).toBe(0);
    expect(html).not.toContain('<caption');
  });
  it('a model error on one table is skipped; others still get captioned', async () => {
    let n = 0;
    const fn = build(async () => { n++; if (n === 1) throw new Error('boom'); return 'Second table'; });
    const { html, fixCount } = await fn(TBL('a') + TBL('b'));
    expect(fixCount).toBe(1);
    expect(html).toMatch(/<table id="b"><caption>Second table<\/caption>/);
    expect(html).toMatch(/<table id="a"><tbody>/); // first table left uncaptioned (error)
  });
  it('bounds AI calls to at most 12 tables', async () => {
    let calls = 0;
    const fn = build(async () => { calls++; return 'C' + calls; });
    let src = '';
    for (let i = 0; i < 15; i++) src += TBL('t' + i);
    const { fixCount } = await fn(src);
    expect(calls).toBeLessThanOrEqual(12);
    expect(fixCount).toBeLessThanOrEqual(12);
  });
});

describe('anti-drift: addAiTableCaptions is wired into the main flow before the final audit', () => {
  // 2026-07-05: repointed to the LIVE single-doc path. The original anchors (the call site +
  // `const batchFinalAudit = …`) lived only in the batch loop deleted @3a5d9280 (2026-07-02), so
  // this test had been red — the function was orphaned. It is now restored on the live path, right
  // after the outline fix and before `const finalAudit = await auditOutputAccessibility(...)`.
  it('the main remediation calls addAiTableCaptions ahead of the final authoritative audit', () => {
    // 2026-07-29: made ARGUMENT-agnostic. Both sites gained an abort signal, and
    // the audit's input was renamed accessibleHtml -> _finalAuditHtml, so pinning
    // the full call text made this red again for a reason that has nothing to do
    // with the invariant. What matters is the ORDER: captions must be authored
    // before the audit that reports final accessibility, or the audit scores a
    // document that is about to change. Uniqueness is asserted so a rename fails
    // loudly instead of an indexOf(-1) quietly satisfying "less than".
    const callHits = dp.split('await addAiTableCaptions(').length - 1;
    // The assignment split from the declaration when the trigger tag landed.
    const auditHits = dp.split("finalAudit = await auditOutputAccessibility(_finalAuditHtml, { signal: _runAbortSignal, trigger: 'primary-final-audit' })").length - 1;
    expect(callHits, 'expected exactly one addAiTableCaptions call site').toBe(1);
    expect(auditHits, 'expected exactly one finalAudit assignment').toBe(1);
    const callIdx = dp.indexOf('await addAiTableCaptions(');
    // `let finalAudit = null;` is declared two lines above the assignment now, so the ORDER pin
    // follows the unique assignment already asserted above rather than a `const` that no longer exists.
    const finalAuditIdx = dp.indexOf("finalAudit = await auditOutputAccessibility(_finalAuditHtml, { signal: _runAbortSignal, trigger: 'primary-final-audit' })");
    expect(callIdx).toBeGreaterThan(-1);
    expect(finalAuditIdx).toBeGreaterThan(-1);
    expect(callIdx).toBeLessThan(finalAuditIdx);
  });
});
