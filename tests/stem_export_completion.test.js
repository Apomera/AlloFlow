import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('STEM evidence export completion milestones', () => {
  it('adds resumable packet progress to Cell Atlas exports', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_cellatlas.js', 'utf8');
    expect(source).toContain("id: 'atlas_export'");
    expect(source).toContain('function recordArtifactExport(kind, format)');
    expect(source).toContain("recordArtifactExport('cross-tissue-cer', format)");
    expect(source).toContain("recordArtifactExport('reproducibility-audit', format)");
    expect(source).toContain("recordArtifactExport('study-design', format)");
  });

  it('adds an AlphaFold export quest that recognizes either file format', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_alphafold.js', 'utf8');
    expect(source).toContain("id: 'af_export'");
    expect(source).toContain("d.crossScaleExportStatus === 'downloaded'");
    expect(source).toContain("d.crossScaleExportStatus === 'downloaded-json'");
  });
});
