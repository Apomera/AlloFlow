import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Visible evidence-export progress metrics', () => {
  it('shows saved packet progress in Cell Atlas', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_cellatlas.js', 'utf8');
    expect(source).toContain('var exportedArtifactCount = Object.keys(d.exportedArtifacts || {}).length');
    expect(source).toContain("'packets saved'");
    expect(source).toContain("grid-template-columns:repeat(4,1fr)");
  });

  it('shows evidence-export progress in AlphaFold', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_alphafold.js', 'utf8');
    expect(source).toContain('var exportedCount = progress.crossScaleExportStatus');
    expect(source).toContain("'Evidence exports'");
    expect(source).toContain(".af-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr))");
  });

  it('makes the completed record plus export an AlphaFold route milestone', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_alphafold.js', 'utf8');
    expect(source).toContain('var packetRouteComplete = !!(savedCrossScaleRecord.complete && exportedCount > 0);');
    expect(source).toContain("+ ' / 4'");
    expect(source).toContain("'Package the evidence'");
    expect(source).toContain(".af-route{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))");
  });
});
