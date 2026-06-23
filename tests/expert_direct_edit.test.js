// Direct expert-edit path (2026-06-22, Feature 2). An expert who knows the fix can edit a located block's
// HTML and re-check it WITHOUT the AI (matters under Canvas throttle storms). The risky part is the
// precise single-occurrence splice (_spliceBlock) — replace exactly the located block, touch nothing else,
// refuse when ambiguous/moved. The re-check reuses the SAME mini-audit (_reauditAndScore) the Workbench
// uses, so they can't drift. This extracts the pure _spliceBlock and exercises it, plus anti-drift on the
// shared mini-audit + the Workbench now delegating to it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// ── Extract the pure _spliceBlock (no closure deps) ──
const _s = src.indexOf('const _spliceBlock = (html, original, draft) => {');
const _e = src.indexOf('\n  };', _s) + 4;
if (_s === -1 || _e === -1) throw new Error('extraction markers for _spliceBlock missing');
const _spliceBlock = new Function(src.slice(_s, _e) + '\nreturn _spliceBlock;')();

describe('_spliceBlock: precise single-occurrence replacement, minimal mutation', () => {
  const doc = '<body><h2>Intro</h2><p data-source-restored="true">* Areas of dysfunction</p><footer>x</footer></body>';
  it('replaces exactly the located block and leaves everything else byte-identical', () => {
    const orig = '<p data-source-restored="true">* Areas of dysfunction</p>';
    const draft = '<ul><li>Areas of dysfunction</li></ul>';
    const r = _spliceBlock(doc, orig, draft);
    expect(r.ok).toBe(true);
    expect(r.html).toBe('<body><h2>Intro</h2><ul><li>Areas of dysfunction</li></ul><footer>x</footer></body>');
    // nothing outside the block changed
    expect(r.html.startsWith('<body><h2>Intro</h2>')).toBe(true);
    expect(r.html.endsWith('<footer>x</footer></body>')).toBe(true);
  });
  it('refuses when the original is not found (it moved/changed)', () => {
    const r = _spliceBlock(doc, '<p>not here</p>', '<p>x</p>');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('not-found');
  });
  it('refuses when the original markup appears more than once (ambiguous)', () => {
    const dup = '<div><p>same</p><p>same</p></div>';
    const r = _spliceBlock(dup, '<p>same</p>', '<p>edited</p>');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ambiguous');
  });
  it('only the FIRST occurrence boundary is used — a unique block in a doc with repeated text still works', () => {
    const d = '<p>Heading text</p><table><caption>Heading text</caption></table>';
    // the <p> is unique as full markup even though the text "Heading text" recurs
    const r = _spliceBlock(d, '<p>Heading text</p>', '<h2>Heading text</h2>');
    expect(r.ok).toBe(true);
    expect(r.html).toBe('<h2>Heading text</h2><table><caption>Heading text</caption></table>');
  });
  it('guards empty inputs', () => {
    expect(_spliceBlock('', 'x', 'y').ok).toBe(false);
    expect(_spliceBlock('<p>x</p>', '', 'y').ok).toBe(false);
  });
});

describe('anti-drift: the mini-audit is shared (no drift between Workbench + direct-edit)', () => {
  it('_reauditAndScore exists and folds in score + issueResolution', () => {
    expect(src).toMatch(/const _reauditAndScore = async \(newHtml, onActivity\) => \{/);
    expect(src).toMatch(/Promise\.all\(\[auditOutputAccessibility\(newHtml\), runAxeAudit\(newHtml\)\]\)/);
    expect(src).toMatch(/recomputeIssueResolution\(prev\.issueResolution, _wv\)/);
    expect(src).toMatch(/_wscore = \(_wdet !== null\) \? _computeHeadline\(_wv\.score, _wdet\)/);
  });
  it('the Expert Workbench now delegates to _reauditAndScore (the old inline copy is gone)', () => {
    expect(src).toMatch(/const _ra = await _reauditAndScore\(result\.html, \(entry\) => setAgentActivityLog/);
    // the previous inline duplicate (two Promise.all re-audits) should no longer exist
    expect((src.match(/Promise\.all\(\[auditOutputAccessibility\([a-z.]+Html?\), runAxeAudit/g) || []).length).toBeLessThanOrEqual(1);
  });
  it('_saveManualEdit splices then re-checks, and snapshots _preCmdHtml for one-click revert', () => {
    expect(src).toMatch(/const _saveManualEdit = async \(issue, key\) => \{/);
    expect(src).toMatch(/const sp = _spliceBlock\(html, original, draft\)/);
    expect(src).toMatch(/await _reauditAndScore\(newHtml, null\)/);
    expect(src).toMatch(/accessibleHtml: newHtml, _preCmdHtml: html/);
  });
  it('the Source panel exposes an Edit & re-check control bound to the located full block', () => {
    expect(src).toMatch(/_src\.fullHtml && _src\.fullHtml\.length <= 8000/);
    expect(src).toMatch(/onClick=\{\(\) => _saveManualEdit\(issue, _srcKey\)\}/);
    expect(src).toMatch(/pdf_audit\.issue\.edit_save/);
  });
});
