// AI-tier table captions (2026-06-22, Increment 2). After the deterministic heading-inference tier,
// caption-less tables with NO adjacent heading get a Gemini-authored caption from the table's own data,
// inserted via the same DOM path as fix_table_caption (textContent auto-escapes). Gated on callGemini,
// bounded, fail-safe. Extracts the real addAiTableCaptions and drives it with a mocked callGemini +
// a stub _serializeDomEdit (the real serializer is exercised by fix_table_caption's own tests).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const _s = dp.indexOf('const addAiTableCaptions = async (html) => {');
const _e = dp.indexOf('\n  // ── fixLangSpans:', _s);
if (_s === -1 || _e === -1) throw new Error('extraction markers for addAiTableCaptions missing');
const slice = dp.slice(_s, _e);

// Build a fresh instance with injected deps. _serializeDomEdit stub returns the doc body innerHTML
// (enough to assert the inserted caption; the real serializer preserves head/doctype and is tested
// separately). callGemini is the per-test mock.
const build = (callGemini, opts = {}) => {
  const warnLog = opts.warnLog || (() => {});
  const _serializeDomEdit = opts.serialize || ((html, doc) => (doc.body ? doc.body.innerHTML : html));
  return new Function('callGemini', 'warnLog', '_serializeDomEdit', slice + '\nreturn addAiTableCaptions;')(callGemini, warnLog, _serializeDomEdit);
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
    const callIdx = dp.indexOf('await addAiTableCaptions(accessibleHtml)');
    const finalAuditIdx = dp.indexOf('const finalAudit = await auditOutputAccessibility(accessibleHtml)');
    expect(callIdx).toBeGreaterThan(-1);
    expect(finalAuditIdx).toBeGreaterThan(-1);
    expect(callIdx).toBeLessThan(finalAuditIdx);
  });
});
