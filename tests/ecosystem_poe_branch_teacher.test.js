import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderEcosystem(state = {}) {
  return renderTool('ecosystem', { ecosystem: { tutorialDismissed: true, ...state } });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem');
});

describe('Ecosystem Predict–Observe–Explain and teacher workflow', () => {
  it('renders explicit workflow stages, branching, and teacher tools', () => {
    const html = renderEcosystem({
      tab: 'explore',
      teacherMode: true,
      data: [
        { step: 0, prey: 80, pred: 12 },
        { step: 1, prey: 78, pred: 13 }
      ],
      steps: 2
    });
    expect(html).toContain('Predict');
    expect(html).toContain('Observe');
    expect(html).toContain('Explain');
    expect(html).toContain('Save named branch');
    expect(html).toContain('Teacher / report mode');
    expect(html).toContain('eco-teacher-tools');
    expect(html).toContain('Export teacher report');
    expect(html).toContain('Replay key:');
  });

  it('stores replayable branch parameters and exports evidence', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(source).toContain('var replayKeyFor = function(params)');
    expect(source).toContain('var saveBranchRun = function()');
    expect(source).toContain('var loadBranchRun = function(record)');
    expect(source).toContain('var markExplanationComplete = function()');
    expect(source).toContain('var buildTeacherReport = function()');
    expect(source).toContain('schema: \'ecosystem-teacher-report-v1\'');
  });

  it('keeps the deployed mirror byte-identical', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    const deployed = fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(deployed).toBe(source);
  });
});