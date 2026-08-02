import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const CELL_ATLAS = 'stem_lab/stem_tool_cellatlas.js';
const ALPHAFOLD = 'stem_lab/stem_tool_alphafold.js';

describe('Learning-route export metadata', () => {
  it('carries Cell Atlas milestones and next-step context in every artifact envelope', () => {
    const source = fs.readFileSync(CELL_ATLAS, 'utf8');
    expect(source).toContain("routeId: 'cell-atlas-evidence-route/v1'");
    expect(source).toContain('completedCount: routeDoneCount');
    expect(source).toContain('steps: routeSteps.map');
    expect(source).toContain('Next recommended step: ');
  });

  it('carries AlphaFold route milestones without adding protein sequence data', () => {
    const source = fs.readFileSync(ALPHAFOLD, 'utf8');
    expect(source).toContain("routeId: 'alphafold-cross-scale-route/v1'");
    expect(source).toContain('function alphaFoldLearningPath()');
    expect(source).toContain('learningPath: alphaFoldLearningPath()');
    expect(source).toContain('No protein sequence is included in this artifact.');
    expect(source).toContain('Next recommended step: ');
  });

  it('keeps both deploy mirrors byte-identical', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_cellatlas.js', 'utf8'))
      .toBe(fs.readFileSync(CELL_ATLAS, 'utf8'));
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_alphafold.js', 'utf8'))
      .toBe(fs.readFileSync(ALPHAFOLD, 'utf8'));
  });
});
