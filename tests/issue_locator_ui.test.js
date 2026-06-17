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
