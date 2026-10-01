import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL_FILE = 'stem_lab/stem_tool_cellatlas.js';
const TOOL_ID = 'cellAtlasLab';

describe('Cell Atlas shared export contract', () => {
  beforeEach(() => {
    resetStemLab();
    delete window.__alloCellAtlasPure;
    loadTool(TOOL_FILE, TOOL_ID);
  });

  it('declares one schema envelope and structured JSON/Markdown download paths', () => {
    const source = fs.readFileSync(TOOL_FILE, 'utf8');
    expect(source).toContain("var EXPORT_SCHEMA_VERSION = 'cell-atlas-artifact/v1'");
    expect(source).toContain('function buildExportArtifact(artifactType, title, markdown, extra)');
    expect(source).toContain("buildExportArtifact('cross-tissue-cer'");
    expect(source).toContain("buildExportArtifact('reproducibility-audit'");
    expect(source).toContain("buildExportArtifact('study-design'");
    expect(source).toContain("application/json;charset=utf-8");
    expect(source).toContain('datasetVersionId');
    expect(source).toContain('assetSha256');
  });

  it('exposes Markdown and JSON actions in the CER and study-design views', () => {
    const cross = renderTool(TOOL_ID, {
      cellAtlasLab: { tissue: 'lung', view: 'cross', systemLens: 'vascular' },
    });
    expect(cross).toContain('Download CER packet (.md)');
    expect(cross).toContain('Download CER packet (.json)');

    const design = renderTool(TOOL_ID, {
      cellAtlasLab: { tissue: 'pancreas', view: 'design' },
    });
    expect(design).toContain('Download plan (.md)');
    expect(design).toContain('Download plan (.json)');
  });
});
