import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (name) => readFileSync(resolve(process.cwd(), name), 'utf8');
const pipeline = read('doc_pipeline_source.jsx');
const view = read('view_pdf_audit_source.jsx');

const sliceBetween = (source, start, end) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`Missing source markers: ${start} -> ${end}`);
  return source.slice(from, to);
};

const sliceAround = (source, marker, before = 500, after = 5000) => {
  const at = source.indexOf(marker);
  if (at < 0) throw new Error(`Missing source marker: ${marker}`);
  return source.slice(Math.max(0, at - before), Math.min(source.length, at + after));
};

describe('remediation security-boundary inventory', () => {
  it('neutralizes prompt delimiters reversibly so document bytes are not changed', () => {
    const start = pipeline.indexOf('function _neutralizePromptFence');
    const end = pipeline.indexOf('// Cross-check AI audit issues', start);
    if (start < 0 || end < 0) throw new Error('Prompt-fence helper markers missing');
    const helpers = new Function(
      pipeline.slice(start, end) + '\nreturn { neutralize: _neutralizePromptFence, restore: _restoreNeutralizedPromptFences };',
    )();
    const original = 'const doc = """teacher text""";\n```html\n<p>literal fence</p>\n```';
    const guarded = helpers.neutralize(original);
    expect(guarded).not.toContain('"""');
    expect(guarded).not.toContain('```');
    expect(helpers.restore(guarded)).toBe(original);
  });

  it('isolates every uploaded-content remediation prompt from instructions', () => {
    const blocks = [
      sliceBetween(pipeline, 'var _visionViaLocalTextModel = async function', 'var callGeminiVision'),
      sliceBetween(pipeline, 'const translateAccessibleHtml = async', '// ── Fillable S2'),
      sliceBetween(pipeline, 'const simplifyAccessibleHtml = async', '// aiFixChunked:'),
      sliceBetween(pipeline, 'const remediateSurgicallyThenAI = async', '// Tier 2:'),
      sliceBetween(pipeline, 'const surgicalFixCluster = async', '// Decide whether to keep a surgical rewrite'),
      sliceBetween(pipeline, 'const sectionScopedFixCluster = async', '// Orchestrator.'),
      sliceBetween(pipeline, 'const addAiTableCaptions = async', '// ── fixLangSpans'),
      sliceBetween(pipeline, 'const retargetMissingWordsViaGemini = async', '// ── Stage B:'),
    ];
    for (const block of blocks) {
      expect(block).toMatch(/UNTRUSTED|untrusted/);
      expect(block).toContain('_neutralizePromptFence');
    }

    const transformBlocks = [blocks[1], blocks[2], blocks[3], blocks[4], blocks[5], blocks[7]];
    for (const block of transformBlocks) expect(block).toContain('_restoreNeutralizedPromptFences');

    const grammar = sliceAround(pipeline, 'Step 2c: Spelling & grammar correction pass', 0, 7000);
    const diffCleanup = sliceAround(pipeline, 'Phase 4: If artifacts remain', 0, 4000);
    const taggedTable = sliceAround(pipeline, 'Stage 5b full Gemini classification', 2500, 4500);
    const autonomous = sliceBetween(pipeline, 'const runAutonomousRemediation = async', 'const processExpertCommand = async');
    const command = sliceBetween(pipeline, 'const processExpertCommand = async', 'const retargetMissingWordsViaGemini');
    for (const block of [grammar, diffCleanup, taggedTable, autonomous, command]) {
      expect(block).toMatch(/UNTRUSTED|untrusted/);
      expect(block).toContain('_neutralizePromptFence');
    }
  });

  it('isolates document-derived prompts made directly by PdfAuditView', () => {
    const blocks = [
      sliceBetween(view, 'const _buildSmartTable = async', 'const [recoveryReviewOutcomes'),
      sliceAround(view, 'id="pdf-translate-lang"', 500, 10000),
      sliceAround(view, 'data-help-key="pdf_audit_glossary_appendix_btn"', 500, 6500),
      sliceAround(view, 'pdf_audit.plain_summary.heading', 500, 8500),
    ];
    for (const block of blocks) {
      expect(block).toMatch(/UNTRUSTED|untrusted/);
      expect(block).toContain('_viewNeutralizePromptFence');
    }
  });

  it('sanitizes every executable remediation HTML download boundary', () => {
    const batchZip = sliceAround(pipeline, '_accessible.html`', 1800, 1400);
    expect(batchZip).toContain('_alloSanitizeRemediationHtml');

    const multiSession = sliceAround(view, 'Download progress so far', 1800, 500);
    expect(multiSession).toContain('_viewSanitizeMarkupForExport');

    const htmlExport = sliceAround(view, "pdf_audit.export_menu.html", 500, 1800);
    const epubExport = sliceAround(view, '{/* ePub */}', 0, 6500);
    expect(htmlExport).toContain('_viewSanitizeMarkupForExport');
    expect(epubExport).toContain('_viewSanitizeMarkupForExport');

    expect(view).not.toContain('_wrapAsReaderApp(pdfFixResult.accessibleHtml)');
    expect(view).not.toContain('_wrapAsReaderApp(pdfFixResult._translation.html)');
    expect(view).not.toContain('_wrapAsReaderApp(pdfFixResult._plainLanguage.html)');
    expect(view).not.toMatch(/new Blob\(\[pdfFixResult(?:\?\.)?\.accessibleHtml\]/);
    expect(view).not.toMatch(/zip\.file\([^\n]+,\s*pdfFixResult(?:\?\.)?\.accessibleHtml\s*\)/);
  });

  it('fails closed when the sanitizer is unavailable instead of exporting raw markup', () => {
    const helper = sliceBetween(view, 'function _viewSanitizeMarkupForExport', 'function _viewAuditCanStartRemediation');
    expect(helper).toContain("typeof helper !== 'function'");
    expect(helper).toMatch(/throw new Error/);
    expect(helper).not.toMatch(/return\s+String\(html/);
  });
});
