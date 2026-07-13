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
    expect(src).toContain('const _safeAudit = (run) => Promise.resolve().then(run).catch(() => null);');
    expect(src).toContain('_safeAudit(() => auditOutputAccessibility(newHtml)),');
    expect(src).toContain('_safeAudit(() => runAxeAudit(newHtml)),');
    expect(src).toContain("? _safeAudit(() => _docPipeline.runEqualAccessAudit(newHtml)) : Promise.resolve(null),");
    expect(src).toContain('const _wscore = _computeHeadline(_wvOk ? _wv.score : null, _wdet);');
    expect(src).toContain("issueResolution: (_wvOk && typeof recomputeIssueResolution === 'function') ? (recomputeIssueResolution(prev.issueResolution, _wv) || prev.issueResolution) : prev.issueResolution,");
    expect(src).toContain('const _freshBinding = await _viewCreateVerificationHtmlBinding(newHtml, _docPipeline);');
    expect(src).toContain('if (prev.accessibleHtml !== newHtml) return prev;');
    expect(src).toContain("pdfUaSelfCheck: _sameBoundHtml ? ((prev.verificationCoverage && prev.verificationCoverage.pdfUaSelfCheck) || 'not-run') : 'not-run',");
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

describe('S1 (2026-06-23): scope → intent → AGENT apply, blast-radius-bounded to the located block', () => {
  const h = src.slice(src.indexOf('const _applyScopedIntent = async'), src.indexOf('// Recovery residual source (Option B'));
  it('runs the agent on the located block FRAGMENT (bounded), not the whole document', () => {
    // `original` is the located block (the region); the agent is given only that, then re-spliced back
    expect(h).toMatch(/const original = String\(\(ed && ed\.original\) \|\| ''\)/);
    expect(h).toMatch(/await processExpertCommand\(intent, original, \{\}\)/);
    expect(h).not.toMatch(/processExpertCommand\([^,]*,\s*pdfFixResult\.accessibleHtml/); // NOT the full doc
  });
  it('unwraps a <body> the agent might add, then splices the edited region back via _spliceBlock', () => {
    expect(h).toMatch(/<body\[\\s>\]\/i\.test\(edited\)/);
    expect(h).toMatch(/const sp = _spliceBlock\(pdfFixResult\.accessibleHtml, original, edited\)/);
  });
  it('snapshots _preCmdHtml for one-click revert and re-audits via the shared mini-audit', () => {
    expect(h).toMatch(/accessibleHtml: sp\.html, _preCmdHtml: _before/);
    expect(h).toMatch(/await _reauditAndScore\(sp\.html, null\)/);
  });
  it('is graceful: no-change / agent failure / ambiguous splice → toast, no silent corruption', () => {
    expect(h).toMatch(/if \(!edited \|\| edited === original\)/);          // no-change / busy
    expect(h).toMatch(/pdf_audit\.issue\.ai_nochange/);
    expect(h).toMatch(/sp\.reason === 'ambiguous'/);                       // refuses ambiguous splice
  });
  it('the edit panel exposes the scoped-intent input + "Apply with AI" wired to _applyScopedIntent', () => {
    expect(src).toMatch(/typeof processExpertCommand === 'function' &&/);  // only when the agent is available
    expect(src).toMatch(/onClick=\{\(\) => _applyScopedIntent\(issue, _srcKey\)\}/);
    expect(src).toMatch(/pdf_audit\.issue\.ai_scoped_hint/);               // "scoped to this section only" honesty
  });
});
