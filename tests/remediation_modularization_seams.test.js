import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(process.cwd());
const {
  PROPOSED_SLICE_SPECS,
  auditSeams,
  scanTestImpact,
  checkParity,
  verifyDryRunCompileParity,
} = require(path.join(ROOT, 'dev-tools', 'verify_remediation_modularization.cjs'));

describe('Phase 1 remediation modularization seam verifier', () => {
  let seamAudit;
  let testImpact;

  beforeAll(() => {
    seamAudit = auditSeams({ rootDir: ROOT });
    testImpact = scanTestImpact({ rootDir: ROOT, seamAudit });
  }, 60000);

  it('aligns all 9 proposed slices to valid AST statement boundaries with 0 gaps and 0 overlaps', () => {
    expect(seamAudit.ok).toBe(true);
    expect(seamAudit.errors).toEqual([]);
    expect(seamAudit.sliceCount).toBe(9);

    const docTarget = seamAudit.targets['doc_pipeline_source.jsx'];
    const viewTarget = seamAudit.targets['view_pdf_audit_source.jsx'];

    expect(docTarget.slices).toHaveLength(5);
    expect(viewTarget.slices).toHaveLength(4);

    for (const target of [docTarget, viewTarget]) {
      expect(target.gapCount).toBe(0);
      expect(target.overlapCount).toBe(0);
      expect(target.errors).toEqual([]);
      expect(target.extractedLines + target.coreLines).toBe(target.totalLines);

      for (const slice of target.slices) {
        expect(slice.astBoundaryValid).toBe(true);
        expect(slice.statementCount).toBeGreaterThan(0);
        expect(slice.declaredSymbolCount).toBeGreaterThan(0);
        expect(slice.startLine).toBeLessThanOrEqual(slice.firstStatementLine);
        expect(slice.endLine).toBeGreaterThanOrEqual(slice.lastStatementEndLine);
        expect(slice.lineCount).toBe(slice.endLine - slice.startLine + 1);
        expect(slice.byteLength).toBeGreaterThan(0);
      }
    }

    // Verify expected slice IDs match the Phase 2 plan
    expect(docTarget.slices.map((s) => s.filename)).toEqual([
      '01_pure_helpers_and_policies.js',
      '02_office_and_pdf_extractors.js',
      '03_auditors_and_deterministic_fixers.js',
      '04_reports_and_inplace_tagging.js',
      '05_resource_and_pack_generators.js',
    ]);
    expect(viewTarget.slices.map((s) => s.filename)).toEqual([
      '01_security_and_verification_helpers.js',
      '02_docx_odt_pptx_exporters.js',
      '03_epub_daisy_braille_narration.js',
      '04_doc_modes_and_diagnostics.jsx',
    ]);
  });

  it('produces 100% byte-identical SHA-256 dry-run reassembly for both monoliths', () => {
    for (const targetFile of ['doc_pipeline_source.jsx', 'view_pdf_audit_source.jsx']) {
      const target = seamAudit.targets[targetFile];
      expect(target.byteIdentical).toBe(true);
      expect(target.reassembledBytes).toBe(target.totalBytes);
      expect(target.reassembledSha256).toBe(target.originalSha256);
      expect(target.originalSha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('preserves check_pipeline_integrity.js export compatibility and factory return block in core', () => {
    const pi = seamAudit.pipelineIntegrity;
    expect(pi.ok).toBe(true);
    expect(pi.originalExportCount).toBeGreaterThan(100);
    expect(pi.reassembledExportCount).toBe(pi.originalExportCount);
    expect(pi.missingInReassembled).toEqual([]);
    expect(pi.extraInReassembled).toEqual([]);
    expect(pi.danglingUiCalls).toEqual([]);
    expect(pi.returnInCore).toBe(true);
    expect(pi.runtimeUrlIssueCount).toBe(0);
  });

  it('compiles dry-run reassembled sources cleanly via wrapSimpleIife, esbuild JSX, and vm.Script', () => {
    const compile = verifyDryRunCompileParity({ rootDir: ROOT, seamAudit });
    expect(compile.ok).toBe(true);
    expect(compile.checks.docPipeline.ok).toBe(true);
    expect(compile.checks.docPipeline.exportCount).toBe(seamAudit.pipelineIntegrity.originalExportCount);
    expect(compile.checks.viewPdfAudit.ok).toBe(true);
    expect(compile.checks.viewPdfAudit.errors).toEqual([]);

    // --check-parity hook works cleanly in Phase 1 (skips gracefully when manifest.cjs is absent) and Phase 2
    const parity = checkParity({ rootDir: ROOT });
    expect(parity.ok).toBe(true);
  }, 30000);

  it('scans tests/*.test.* and reports structured host_source vs raw_fs impact counts', () => {
    expect(testImpact.totalTestFilesScanned).toBeGreaterThan(100);
    expect(testImpact.readersTotal).toBe(
      testImpact.byReaderKind.host_source + testImpact.byReaderKind.raw_fs
    );
    expect(testImpact.byReaderKind.host_source).toBeGreaterThan(0);
    expect(testImpact.byReaderKind.raw_fs).toBeGreaterThan(0);
    expect(
      testImpact.byTarget.doc_pipeline_source +
      testImpact.byTarget.view_pdf_audit_source +
      testImpact.byTarget.both
    ).toBe(testImpact.readersTotal);

    expect(
      testImpact.rawFsImpact.touches_moved_slices +
      testImpact.rawFsImpact.core_only +
      testImpact.rawFsImpact.unclassified_dynamic
    ).toBe(testImpact.byReaderKind.raw_fs);

    // Every proposed slice ID is tracked in the per-slice raw_fs impact map
    const expectedSliceIds = Object.values(PROPOSED_SLICE_SPECS).flat().map((s) => s.id);
    for (const id of expectedSliceIds) {
      expect(typeof testImpact.bySlice[id]).toBe('number');
      expect(testImpact.bySlice[id]).toBeGreaterThanOrEqual(0);
    }

    // Our own verifier test file should not be misclassified as a raw_fs reader
    const selfEntry = testImpact.tests.find((t) => t.file === 'tests/remediation_modularization_seams.test.js');
    if (selfEntry) {
      expect(selfEntry.readerKind).not.toBe('raw_fs');
    }
  });
});
