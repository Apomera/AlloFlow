// Issue-locator UI slices (2026-06-16): each remaining issue in the results panel gets a "🔎 Find"
// (scroll+highlight the exact spot in the live preview) and a "🛠" Workbench bridge (prefill a
// targeted fix command). Both consume the resolver's locator with an honest precision gradient:
// the vetted-unique snippet (locator.kind==='exact') > the AI's text anchor > none for a
// document-level / page-only anchor (no precise jump). Find only renders when an anchor resolves.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// _issueAnchor is pure (reads only issue.locator / issue.location) — extract + exercise its tiers.
const start = src.indexOf('const _issueAnchor = (issue) => {');
const end = src.indexOf('\n  };', start);
if (start === -1 || end === -1) throw new Error('extraction markers for _issueAnchor missing');
const { _issueAnchor } = new Function(src.slice(start, end + 4) + '\n; return { _issueAnchor };')();

describe('_issueAnchor — precision gradient', () => {
  it('prefers the resolver vetted snippet (kind exact)', () => {
    expect(_issueAnchor({ locator: { kind: 'exact', snippet: 'Clarifying the objectives' }, location: 'page 4' }))
      .toBe('Clarifying the objectives');
  });
  it('falls back to the AI text anchor when no exact locator', () => {
    expect(_issueAnchor({ location: 'Interview stages heading' })).toBe('Interview stages heading');
  });
  it('returns "" (no precise jump) for document-level / page-only / empty anchors', () => {
    expect(_issueAnchor({ location: 'document' })).toBe('');
    expect(_issueAnchor({ location: 'page 7' })).toBe('');
    expect(_issueAnchor({ location: '' })).toBe('');
    expect(_issueAnchor({})).toBe('');
    expect(_issueAnchor({ locator: { kind: 'page', pages: [7] }, location: 'page 7' })).toBe('');
  });
});

describe('anti-drift: jump + Workbench wired into the remaining-issues render', () => {
  it('defines the jump + Workbench helpers', () => {
    expect(src).toContain('const _jumpToIssue = (issue) =>');
    expect(src).toContain('const _issueToWorkbench = (issue) =>');
    expect(src).toContain("document.getElementById('allo-sec-workbench')"); // bridge target
    expect(src).toContain("setExpertCommandInput('Fix this WCAG '");
  });
  it('the remaining-issues card renders a guarded Find button + a Workbench button', () => {
    expect(src).toContain('{_issueAnchor(issue) && (');
    expect(src).toContain('onClick={() => _jumpToIssue(issue)}');
    expect(src).toContain('onClick={() => _issueToWorkbench(issue)}');
  });
  it('the jump resolves against the LIVE preview DOM and highlights', () => {
    expect(src).toContain('pdfPreviewRef.current.contentDocument');
    expect(src).toContain("found.style.outline = '3px solid #d97706'");
  });
});

// Follow-up #1 (2026-06-16): the post-remediation axe "Issues" list gets the same Find/Workbench
// actions — but axe carries an EXACT CSS-selector target (nodeDetails[0].target), so Find resolves
// it directly with querySelector (more precise than the AI text-anchor search).
describe('axe-list actions — _axeTarget selector resolution + wiring', () => {
  const aStart = src.indexOf('const _axeTarget = (v) => {');
  const aEnd = src.indexOf('\n  };', aStart);
  if (aStart === -1 || aEnd === -1) throw new Error('extraction markers for _axeTarget missing');
  const { _axeTarget } = new Function(src.slice(aStart, aEnd + 4) + '\n; return { _axeTarget };')();

  it('reads the first node\'s selector, and unwraps axe\'s nested-frame array form (last selector)', () => {
    expect(_axeTarget({ nodeDetails: [{ target: 'img.hero' }] })).toBe('img.hero');
    expect(_axeTarget({ nodeDetails: [{ target: ['#main', 'img.hero'] }] })).toBe('#main img.hero');
    expect(_axeTarget({ nodeDetails: [{ target: [['#frame', 'img.x']] }] })).toBe('#frame img.x');
  });
  it('returns "" when there is no node target (minor rules carry none) → no Find button', () => {
    expect(_axeTarget({})).toBe('');
    expect(_axeTarget({ nodeDetails: [] })).toBe('');
    expect(_axeTarget({ nodeDetails: [{}] })).toBe('');
  });
  it('the axe jump uses querySelector against the live preview + an indigo highlight', () => {
    expect(src).toContain('el = d.querySelector(sel)');
    expect(src).toContain("el.style.outline = '3px solid #4f46e5'");
    expect(src).toContain("'Fix this accessibility issue ('"); // workbench command carries id + selector
  });
  it('_axeActions is wired into all four severity rows (critical/serious/moderate/minor)', () => {
    expect((src.match(/\{_axeActions\(v\)\}/g) || []).length).toBe(4);
    // Find button is guarded so rows without a selector (minor) just show the Workbench action
    expect(src).toContain('{_axeTarget(v) && <button onClick={() => _jumpToAxe(v)}');
  });
});
