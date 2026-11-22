import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const viewSrc = readFileSync(resolve(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
const reviewCompSrc = readFileSync(resolve(ROOT, 'remediation_review_component.jsx'), 'utf8');
const workspaceCompSrc = readFileSync(resolve(ROOT, 'remediation_workspace_component.jsx'), 'utf8');
const batchWorkspaceSrc = readFileSync(resolve(ROOT, 'remediation_batch_workspace.jsx'), 'utf8');
const reviewHelpers = require(resolve(ROOT, 'remediation_review_helpers.js'));

describe('Wave 6 — Track 3: Frontend Verification Binding, Unified Project Loader & Review Performance', () => {
  it('T3-1: routes all direct accessibleHtml edits in PdfAuditView through _withHtmlVerificationBinding', () => {
    expect(viewSrc).toContain('const _withHtmlVerificationBinding = (next, reason = \'content-modified-after-verification\') => (');
    for (const reason of [
      'tag-editor-modified-html',
      'image-classification-modified-html',
      'doc-mode-style-modified-html',
      'manual-issue-edit-modified-html',
      'image-alt-edit-modified-html',
      'auto-restore-undone-modified-html',
      'recovery-word-insert-modified-html',
      'reconstructed-table-rejected-modified-html',
      'revert-command-modified-html',
      'bionic-reading-applied-modified-html',
      'line-guide-applied-modified-html',
      'preview-edited-modified-html',
      'image-studio-modified-html',
      'fillable-forms-modified-html',
    ]) {
      expect(viewSrc).toContain(reason);
    }
    // No bare unguarded setPdfFixResult(prev => ({ ...prev, accessibleHtml: ... })) left
    expect(viewSrc).not.toMatch(/setPdfFixResult\(\s*\(?prev\)?\s*=>\s*\(\{\s*\.\.\.prev,\s*accessibleHtml:/);
  });

  it('T3-2: consolidates both Load Project buttons onto _loadProjectFromFileInput with full ref/state resets', () => {
    expect(viewSrc).toContain('const _loadProjectFromFileInput = (e, opts = {}) => {');
    expect(viewSrc).toContain('onChange={(e) => _loadProjectFromFileInput(e, { sidebar: false })}');
    expect(viewSrc).toContain('onChange={(e) => _loadProjectFromFileInput(e, { sidebar: true })}');

    const loaderStart = viewSrc.indexOf('const _loadProjectFromFileInput = (e, opts = {}) => {');
    const loaderEnd = viewSrc.indexOf('if (!pdfAuditResult && !pdfAuditLoading) return null;', loaderStart);
    const loaderBody = viewSrc.slice(loaderStart, loaderEnd);

    // Restores incomplete runs, fidelityNotes/fidelityLimited, and multiSession in one shared place
    expect(loaderBody).toContain('if (project.incomplete) {');
    expect(loaderBody).toContain('fidelityNotes: Array.isArray(project.fidelityNotes) ? project.fidelityNotes : [],');
    expect(loaderBody).toContain('fidelityLimited: project.fidelityLimited || false,');
    expect(loaderBody).toContain('setPdfMultiSession(project.multiSession);');

    // Resets every per-document holdover ref & state
    for (const reset of [
      '_paletteSnapshotRef.current = null;',
      '_selectTaggedArtifact(null);',
      '_lastTaggedDeliveryRef.current = null;',
      '_taggedGateBytesRef.current = null;',
      '_fidelityGateBytesRef.current = null;',
      '_pendingTaggedExportRef.current = null;',
      'audioJobRef.current = null;',
      'setTaggedGateIssue(null);',
      'setFidelityGateIssue(null);',
      'setLastTaggedReport(null);',
      'setPdfMetaOverride(null);',
    ]) {
      expect(loaderBody).toContain(reset);
    }
  });

  it('T3-3a: memoizes previewHtml in _PdfPreservationReview on [expanded, html] before early return', () => {
    const memoIdx = reviewCompSrc.indexOf('const previewHtml = React.useMemo(() => {');
    const earlyRetIdx = reviewCompSrc.indexOf('if (!api || !result || !html) return null;');
    expect(memoIdx).toBeGreaterThan(0);
    expect(earlyRetIdx).toBeGreaterThan(memoIdx); // Rules of Hooks: useMemo precedes early return
    expect(reviewCompSrc).toContain('if (!expanded || !html) return \'\';');
    expect(reviewCompSrc).toContain('}, [expanded, html]);');
  });

  it('T3-3b: deduplicates and parallelizes SHA-256 digests in remediation_review_helpers.createSourceModel', async () => {
    // 20 identical empty cells + 2 distinct cells should trigger far fewer digest calls than 22
    const rows = Array.from({ length: 10 }, () => '<tr><td></td><td>0</td></tr>').join('');
    const html = `<!DOCTYPE html><html><body><table><caption>Scores</caption>${rows}<tr><td>Alice</td><td>98</td></tr></table></body></html>`;
    let digestCalls = 0;
    const crypto = await import('node:crypto');
    const model = await reviewHelpers.createSourceModel(html, {
      digest: async (val) => {
        digestCalls += 1;
        return crypto.createHash('sha256').update(String(val)).digest('hex');
      },
    });
    expect(model).toBeTruthy();
    expect(model.references.length).toBe(23); // 1 table + 22 cells
    // Unique payloads: 1 table + 4 unique cells ("", "0", "Alice", "98") + 1 doc signature + 1 sourceDigest = 7!
    expect(digestCalls).toBe(7);
  });

  it('T3-4: renders complete-for-tested-scope in batch status and debounces focus/online saved-batch refresh', () => {
    expect(workspaceCompSrc).toContain("result.verificationState === 'complete-for-tested-scope'");
    expect(workspaceCompSrc).toContain("say('tested_scope', 'Complete (static scope)')");
    expect(batchWorkspaceSrc).toContain('const lastAutoRefreshRef = React.useRef(0);');
    expect(batchWorkspaceSrc).toContain('if (now - lastAutoRefreshRef.current < 1500) return;');
  });
});
