import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const host = readFileSync('AlloFlowANTI.txt', 'utf8');
const view = readFileSync('view_export_preview_source.jsx', 'utf8');

function sourceBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  expect(start, `missing source marker: ${startMarker}`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(end, `missing source marker: ${endMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('Document Builder Advanced Review integration', () => {
  it('models workspace intent independently from the document source and passes it to the Builder', () => {
    expect(host).toContain("const [builderWorkspaceMode, setBuilderWorkspaceMode] = useState('author');");

    const builderMount = sourceBlock(
      host,
      'React.createElement(window.AlloModules.ExportPreviewView, {',
      '<CDNModuleGate moduleKey="StemLab"',
    );
    expect(builderMount).toContain('exportPreviewSource');
    expect(builderMount).toContain('builderWorkspaceMode');

    const viewProps = sourceBlock(view, 'function ExportPreviewView(props) {', '} = props;');
    expect(viewProps).toContain('exportPreviewSource');
    expect(viewProps).toContain('builderWorkspaceMode');
    expect(view).toContain("builderWorkspaceMode === 'advanced-review'");
    expect(view).toMatch(/Advanced Review/i);
  });

  it('routes ordinary Builder entry to the author workspace without changing its history source', () => {
    const ordinaryOpen = sourceBlock(
      host,
      "const openExportPreview = (mode = 'print') => {",
      '// \u2500\u2500 Builder crop-chrome sweeper',
    );

    expect(ordinaryOpen).toContain("setExportPreviewSource('history');");
    expect(ordinaryOpen).toContain("setBuilderWorkspaceMode('author');");
    expect(ordinaryOpen).toContain('setExportPreviewMode(mode);');
    expect(ordinaryOpen).toContain('setShowExportPreview(true);');
    expect(ordinaryOpen).not.toContain("setBuilderWorkspaceMode('advanced-review');");
  });

  it('routes the remediation Expert entry to Advanced Review on remediated HTML', () => {
    const expertEntry = sourceBlock(
      host,
      "} else if (pdfFixMode === 'expert') {",
      '// eslint-disable-next-line react-hooks/exhaustive-deps',
    );

    expect(expertEntry).toContain("setExportPreviewSource('remediation');");
    expect(expertEntry).toContain("setBuilderWorkspaceMode('advanced-review');");
    expect(expertEntry).toContain('setShowExportPreview(true);');

    const previewRoute = sourceBlock(
      host,
      'const getExportPreviewHTML = () => {',
      'const updateExportPreview = React.useCallback',
    );
    expect(previewRoute).toContain("exportPreviewSource === 'remediation'");
    expect(previewRoute).toContain('pdfFixResult?.accessibleHtml');
    expect(previewRoute).toContain('sanitizeRemediationHtml(pdfFixResult.accessibleHtml)');
  });

  it('resets both routing dimensions on close so author mode cannot inherit review state', () => {
    const close = sourceBlock(
      host,
      'const setShowExportPreviewWrapped = (v) => {',
      'const NON_EXPORTABLE_TYPES',
    );

    const closingBranch = sourceBlock(close, 'if (v === false) {', 'setShowExportPreview(v);');
    expect(closingBranch).toContain('_syncBuilderEditsToRemediation();');
    expect(closingBranch).toContain("setExportPreviewSource('history');");
    expect(closingBranch).toContain("setBuilderWorkspaceMode('author');");
  });

  it('preserves author drafts and generated-history rendering as author-only behavior', () => {
    expect(host).toContain("if (exportPreviewSource === 'history' && !_builderDraftRestoreRef.current)");
    expect(host).toContain("draft.source === 'history'");
    expect(host).toContain("source: 'history', historySignature: _getBuilderHistorySignature()");
    expect(view).toContain("exportPreviewSource || 'generated'");
  });
});
