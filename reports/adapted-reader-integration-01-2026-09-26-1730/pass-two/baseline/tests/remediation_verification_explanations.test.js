import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
const { renderToStaticMarkup } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));

const source = readFileSync('view_pdf_audit_source.jsx', 'utf8');
const start = source.indexOf('function _pdfVerificationReasonValues(');
const end = source.indexOf('// Per-foundation provenance.', start);
if (start < 0 || end < start) throw new Error('Verification presentation markers missing');
const compiled = transformSync(source.slice(start, end), {
  plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]], babelrc: false, configFile: false,
}).code;
const { Engines, Reasons } = new Function('React', compiled + '\nreturn {Engines:_PdfAuditVerificationEngineList, Reasons:_PdfAuditVerificationReasons};')(React);
const policy = readFileSync('verification_policy_source.jsx', 'utf8');
const formatterStart = policy.indexOf('function _alloFormatVerificationReason(');
const formatterEnd = policy.indexOf('function _alloUnavailableVerificationState(', formatterStart);
const format = new Function(policy.slice(formatterStart, formatterEnd) + '\nreturn _alloFormatVerificationReason;')();
function render(Component, props) {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(React.createElement(Component, props));
  return root;
}
beforeEach(() => {
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.VerificationPolicy = { formatVerificationReason: format };
});

describe('verification engine explanations', () => {
  it.each([
    ['complete', 'complete'],
    ['complete-with-review', 'complete with review — human judgment needed'],
    ['partial', 'incomplete check'],
    ['unavailable', 'unavailable'],
  ])('makes the %s execution state readable without claiming a pass', (state, expected) => {
    const root = render(Engines, { coverage: { ai: state } });
    expect(root.querySelector('[data-engine="ai"]').textContent).toContain(expected);
    expect(root.textContent).not.toMatch(/passed|compliant/i);
    expect(root.querySelector('[data-verification-freshness]')).toBeNull();
  });
  it.each([
    'verification-html-binding-missing-or-stale',
    'verification-html-binding-unavailable',
    'verification-html-binding-mismatch',
  ])('shows %s proof limitations only for engines with evidence', reason => {
    const root = render(Engines, { coverage: { ai: 'complete', axe: 'unavailable', equalAccess: 'complete-with-review' }, reasons: [reason] });
    expect(root.querySelectorAll('[data-verification-freshness="unconfirmed"]')).toHaveLength(2);
    expect(root.querySelector('[data-engine="ai"]').textContent).toContain('Not confirmed for this document version.');
    expect(root.querySelector('[data-engine="axe"]').textContent.trim()).toBe('axe-core: unavailable');
  });
  it('distinguishes an actual edit from missing current-copy proof', () => {
    const root = render(Engines, { coverage: { ai: 'complete', axe: 'partial' }, reasons: ['content-modified-pending-reverification'] });
    expect(root.querySelectorAll('[data-verification-freshness="changed"]')).toHaveLength(2);
    expect(root.textContent).toContain('Check predates the latest edit; run again.');
  });
  it('retains the caller label override and adds visible proof context beside it', () => {
    const root = render(Engines, { coverage: { ai: 'complete' }, engineLabel: state => state === 'complete' ? 'Custom complete' : 'Missing', reasons: ['verification-html-binding-mismatch'] });
    expect(root.querySelector('[data-engine="ai"]').textContent).toContain('Custom complete');
    expect(root.querySelector('[data-engine="ai"] [data-verification-freshness]')).not.toBeNull();
  });
});

describe('current-result explanation and next action', () => {
  it.each([
    [['content-modified-pending-reverification'], 'partial', 'The document changed after its verification checks.', 'Re-run verification'],
    [['verification-html-binding-missing-or-stale'], 'partial', 'Verification is not confirmed for this document version.', 'Re-run verification'],
    [['axe-violation-count-unknown'], 'partial', 'Some checks or finding counts are incomplete.', 'before deciding whether more repairs'],
    [['axe-incomplete:1'], 'review-required', 'Some findings need human judgment.', 'Acknowledging them does not change verification'],
    [['ai-confirmed-issues:2'], 'review-required', 'The checks found accessibility issues.', 'before choosing another repair pass'],
    [['document-language-needs-review'], 'review-required', 'The document language needs confirmation.', 'Confirm the language against the document'],
    [[], 'complete-for-tested-scope', 'The completed checks cover the static source.', 'keyboard navigation and live interactions'],
  ])('explains %j without modifying the result policy', (reasons, verificationState, message, action) => {
    const root = render(Reasons, { reasons, verificationState });
    expect(root.querySelector('p').textContent).toBe(message);
    expect(root.querySelectorAll('p')).toHaveLength(2);
    expect(root.querySelectorAll('p')[1].textContent).toContain(action);
  });
  it('prioritizes missing evidence over another repair or review pass', () => {
    const root = render(Reasons, { reasons: ['axe-unavailable', 'ai-confirmed-issues:4', 'equal-access-manual:2'], verificationState: 'partial' });
    expect(root.querySelectorAll('p')[1].textContent).toContain('Re-run verification');
    expect(root.querySelectorAll('li')).toHaveLength(3);
  });
  it('keeps successful current checks quiet instead of adding redundant status paragraphs', () => {
    const root = render(Reasons, { reasons: [], verificationState: 'complete' });
    expect(root.querySelector('p')).toBeNull();
    expect(root.querySelector('details')).toBeNull();
  });
});

describe('readable reason details', () => {
  it('uses the policy formatter, dedupes equivalent messages, and preserves separate review buckets', () => {
    const root = render(Reasons, { reasons: ['ai-partial-audit', 'ai-score-degraded', 'ai-synthesized', 'equal-access-potential:2', 'equal-access-manual:2'], verificationState: 'partial' });
    const messages = [...root.querySelectorAll('li')].map(node => node.textContent);
    expect(messages).toEqual(['AI semantic verification was incomplete.', 'Potential issues: 2 IBM Equal Access items need manual review.', 'Manual checks: 2 IBM Equal Access items need manual review.']);
  });
  it('explains AI manual-review counts that the shared formatter does not yet cover', () => {
    const root = render(Reasons, { reasons: ['ai-manual-review:1'], verificationState: 'review-required' });
    expect(root.querySelector('li').textContent).toBe('1 AI finding needs human review.');
  });
  it('looks up the formatter dynamically so a late-loaded module is used', () => {
    window.AlloModules.VerificationPolicy = { formatVerificationReason: () => 'Loaded presentation formatter.' };
    const root = render(Reasons, { reasons: ['axe-unavailable'], verificationState: 'unavailable' });
    expect(root.querySelector('li').textContent).toBe('Loaded presentation formatter.');
  });
  it.each([null, { formatVerificationReason() { throw new Error('unavailable'); } }])('fails safely when the formatter is %j and preserves prose and URLs', policy => {
    window.AlloModules.VerificationPolicy = policy;
    const text = 'Read https://example.test/a-b?q=x:y — compare the source.';
    const root = render(Reasons, { reasons: ['future-policy-reason', text, '<script>alert(1)</script>'], verificationState: 'partial' });
    const messages = [...root.querySelectorAll('li')].map(node => node.textContent);
    expect(messages).toContain('Verification detail: future-policy-reason');
    expect(messages).toContain(text);
    expect(messages).toContain('<script>alert(1)</script>');
    expect(root.querySelector('script')).toBeNull();
  });
  it('preserves unknown reason codes even when the shared formatter returns its generic fallback', () => {
    const root = render(Reasons, { reasons: ['future-policy-reason'], verificationState: 'partial' });
    expect(root.querySelector('li').textContent).toBe('Verification detail: future-policy-reason');
  });
  it('does not mutate frozen coverage or raw reasons used by exported reports', () => {
    const coverage = Object.freeze({ ai: 'complete', axe: 'unavailable' });
    const reasons = Object.freeze(['ai-partial-audit', 'ai-score-degraded', 'verification-html-binding-mismatch']);
    render(Engines, { coverage, reasons });
    render(Reasons, { reasons, verificationState: 'partial' });
    expect(coverage).toEqual({ ai: 'complete', axe: 'unavailable' });
    expect(reasons).toEqual(['ai-partial-audit', 'ai-score-degraded', 'verification-html-binding-mismatch']);
  });
});
