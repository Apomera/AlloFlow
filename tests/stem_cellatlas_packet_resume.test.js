import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_cellatlas.js';

describe('Cell Atlas packet resume contract', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'cellAtlasLab');
  });

  it('renders an accessible resume control in Methods + sources', () => {
    const rendered = renderTool('cellAtlasLab', { cellAtlasLab: { tissue: 'pancreas', view: 'source' } });
    expect(rendered).toContain('Resume from a Cell Atlas JSON packet');
    expect(rendered).toContain('Choose packet (.json)');
    expect(rendered).toContain('never loads raw donor rows, sequences, or clinical data.');
  });

  it('accepts only bounded Cell Atlas JSON packet types', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).toContain('function importLearningPacket(event)');
    expect(source).toContain("artifact.schemaVersion !== EXPORT_SCHEMA_VERSION");
    expect(source).toContain("['cross-tissue-cer', 'reproducibility-audit', 'study-design']");
    expect(source).toContain('Number(file.size) > 2 * 1024 * 1024');
    expect(source).toContain("reader.readAsText(file)");
  });

  it('restores bounded learner fields without importing raw biology data', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).toContain('next.crossNotebook = notes');
    expect(source).toContain('next.studyDesign = safeDesign');
    expect(source).toContain('next.replicatesVisited = visitedReplicates');
    expect(source).toContain('never loads raw donor rows, sequences, or clinical data.');
    expect(source).toContain('save a local packet to complete the export milestone.');
  });

  it('keeps the resume importer mirrored in the public bundle', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_cellatlas.js', 'utf8'))
      .toBe(fs.readFileSync(SOURCE, 'utf8'));
  });
});
