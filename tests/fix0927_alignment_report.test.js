// 2026-09-27 Standards & UDL Alignment report fixes: the report is tagged with
// the language its prose is written in (B1), its headings, notices and buttons go
// through the host's t() (B2), and "Re-run audit" reuses the saved scope and says
// which scope it will use (B3). FIX0927_AR_DIR points at another build (mutation checks).
import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const require = createRequire(import.meta.url);
const DIR = process.env.FIX0927_AR_DIR || process.cwd();
let React, createRoot, act, root, host, View;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act; globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.React = React;
  new Function(readFileSync(join(DIR, 'view_alignment_report_module.js'), 'utf8'))();
  View = window.AlloModules.AlignmentReportView;
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; vi.restoreAllMocks(); });

const report = (scope) => ({
  id: 'audit-1', type: 'alignment-report', timestamp: '2026-09-01T00:00:00.000Z',
  data: { reports: [], comprehensive: {
    auditLanguage: 'Spanish', auditLanguageTag: 'es',
    auditMetadata: { generatedAt: '2026-09-01T00:00:00.000Z' },
    auditScope: { selectionMode: 'explicit artifact IDs', requestedArtifactIds: ['a1', 'a2'], includedArtifactIds: ['a1', 'a2'], includedTypes: ['quiz'], ...scope },
    overall: { score: null, dimensionsEvaluated: 0, totalDimensions: 9, dimensionScores: {}, perDimensionPercent: {}, blockingIssues: [] }
  } }
});
const history = [
  { id: 'a1', type: 'quiz', timestamp: '2026-08-30T00:00:00.000Z' },
  { id: 'a2', type: 'glossary', timestamp: '2026-08-30T00:00:00.000Z' },
  { id: 'later', type: 'outline', title: 'New organizer', timestamp: '2026-09-20T00:00:00.000Z' }
];
function render(props) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, { t: () => undefined, history, isProcessing: false, ...props })));
  return host.querySelector('.curriculum-audit-report');
}
const rerunButton = () => [...host.querySelectorAll('button')].find(b => /Re-run audit|T\[rerun\]/.test(b.textContent));

describe('B1: language tag', () => {
  it('tags English report prose as English even when the student content was Spanish', () => {
    expect(render({ generatedContent: report() }).getAttribute('lang')).toBe('en');
  });
  it('keeps the all-chrome empty state English until its strings are translated', () => {
    expect(render({ generatedContent: { id: 'x', type: 'alignment-report', data: { reports: [] } } }).getAttribute('lang')).toBe('en');
    act(() => root.unmount()); root = null; host.remove();
    const t = key => key.startsWith('audit_report.') ? 'Informe ' + key : undefined;
    expect(render({ generatedContent: { id: 'x', type: 'alignment-report', data: { reports: [] } }, t }).hasAttribute('lang')).toBe(false);
  });
});

describe('B2: headings, notices and buttons use the host translations', () => {
  it('routes the freshness notice, re-run button, findings heading and dimension cards through t()', () => {
    const t = vi.fn(key => key.startsWith('audit_report.') ? 'T[' + key.slice('audit_report.'.length) + ']' : undefined);
    render({ generatedContent: report(), t, onRerunAudit: () => {} });
    const text = host.textContent;
    for (const key of ['out_of_date', 'rerun', 'findings_heading', 'accessibility_scope_label', 'dim_standards', 'dim_culturalResponsiveness', 'badge_not_evaluated', 'readiness_score', 'report_title']) expect(text).toContain('T[' + key + ']');
    expect(text).not.toContain('This audit may be out of date.');
    expect(text).not.toContain('Per-Dimension Findings');
  });
  it('falls back to English when a key is missing', () => {
    render({ generatedContent: report(), t: key => key, onRerunAudit: () => {} });
    expect(host.textContent).toContain('This audit may be out of date.');
    expect(rerunButton().textContent).toBe('Re-run audit');
    expect(host.querySelector('[data-audit-rerun-scope]').textContent).toBe('Re-run audits the same 2 resources this audit selected.');
  });
});

describe('B3: re-run uses the saved scope', () => {
  it('re-runs an explicit-id audit on the same resources, skipping ones since deleted, and says so', () => {
    const onRerunAudit = vi.fn();
    render({ generatedContent: report({ requestedArtifactIds: ['a1', 'a2', 'gone'] }), onRerunAudit });
    act(() => rerunButton().click());
    expect(onRerunAudit).toHaveBeenCalledTimes(1);
    expect(onRerunAudit.mock.calls[0][0]).toEqual({ artifactIds: ['a1', 'a2'] });
    expect(host.querySelector('[data-audit-rerun-scope]').getAttribute('data-audit-rerun-scope')).toBe('ids');
    expect(host.querySelector('[data-audit-rerun-scope]').textContent).toContain('same 2 resources');
  });
  it('re-selects by the same rule for heuristic scopes so new resources are included', () => {
    const onRerunAudit = vi.fn();
    render({ generatedContent: report({ selectionMode: 'latest analysis anchor', requestedArtifactIds: [] }), onRerunAudit });
    act(() => rerunButton().click());
    expect(onRerunAudit.mock.calls[0][0]).toEqual({});
    expect(host.querySelector('[data-audit-rerun-scope]').getAttribute('data-audit-rerun-scope')).toBe('rederive');
  });
  it('the host forwards the scope to the audit generator', () => {
    const anti = readFileSync(process.env.FIX0927_LP_ANTI || 'AlloFlowANTI.txt', 'utf8');
    expect(anti).toContain("onRerunAudit: (scope) => { if (!isProcessing) handleGenerate('alignment-report', null, false, null, scope && typeof scope === 'object' ? scope : {}); },");
  });
});
