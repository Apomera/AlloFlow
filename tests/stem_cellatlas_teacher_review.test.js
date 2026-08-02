import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_cellatlas.js';

describe('Cell Atlas teacher review snapshot', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'cellAtlasLab');
  });

  it('renders a transparent draft rubric in Methods + sources', () => {
    const rendered = renderTool('cellAtlasLab', { cellAtlasLab: { tissue: 'pancreas', view: 'source' } });
    expect(rendered).toContain('Teacher review + portfolio');
    expect(rendered).toContain('Draft review snapshot');
    expect(rendered).toContain('Draft rubric suggestion:');
    expect(rendered).toContain('Best next move');
    expect(rendered).toContain('Next move');
    expect(rendered).toContain('Copy teacher review snapshot');
    expect(rendered).toContain('not an automatic grade');
  });

  it('keeps the rubric criteria and boundary explicit in source', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).toContain('function cellAtlasReviewItems()');
    expect(source).toContain("{ label: 'Evidence route'");
    expect(source).toContain("{ label: 'Claim + limitation'");
    expect(source).toContain("{ label: 'Source provenance'");
    expect(source).toContain("{ label: 'Portfolio evidence'");
    expect(source).toContain('function cellAtlasReviewNextMove(items)');
    expect(source).toContain('nextMove:');
    expect(source).toContain('Best next move:');
    expect(source).toContain('draft review aid only. No raw donor rows, sequences, clinical data, or automatic grade inference.');
  });

  it('keeps the teacher-review UI mirrored in the public bundle', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_cellatlas.js', 'utf8'))
      .toBe(fs.readFileSync(SOURCE, 'utf8'));
  });
});
