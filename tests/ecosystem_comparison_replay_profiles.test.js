import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderEcosystem(state = {}) {
  return renderTool('ecosystem', { ecosystem: { tutorialDismissed: true, ...state } });
}

const currentData = [
  { step: 0, prey: 80, pred: 12 },
  { step: 1, prey: 76, pred: 13 },
  { step: 2, prey: 72, pred: 14 }
];

const savedRun = {
  id: 11,
  label: 'Fewer predators',
  parameters: {
    prey0: 80,
    pred0: 6,
    preyBirth: 0.12,
    preyDeath: 0.01,
    predBirth: 0.008,
    predDeath: 0.08,
    carryingCapacity: 220
  },
  data: [
    { step: 0, prey: 80, pred: 6 },
    { step: 1, prey: 84, pred: 6 },
    { step: 2, prey: 89, pred: 7 }
  ]
};

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem');
});

describe('Ecosystem comparison replay and display profiles', () => {
  it('renders a responsive paired comparison with a shared replay cursor', () => {
    const html = renderEcosystem({
      tab: 'explore',
      analysisView: 'compare',
      displayProfile: 'projection',
      compareRunId: '11',
      replayStep: 1,
      data: currentData,
      steps: currentData.length,
      branchRuns: [savedRun]
    });

    expect(html).toContain('Display profile');
    expect(html).toContain('Beginner');
    expect(html).toContain('Advanced');
    expect(html).toContain('Projection');
    expect(html).toContain('Run comparison workspace');
    expect(html).toContain('Shared replay timeline');
    expect(html).toContain('Time 0.1 of 0.2');
    expect(html).toContain('Current run');
    expect(html).toContain('Fewer predators');
    expect(html).toContain('Prey solid');
    expect(html).toContain('Predator dashed');
    expect(html).toContain('Parameter');
    expect(html).toContain('Delta');
    expect(html).toContain('data-eco-projection-panel="true"');
  });

  it('keeps the comparison but removes the advanced table in Beginner view', () => {
    const html = renderEcosystem({
      tab: 'explore',
      analysisView: 'compare',
      displayProfile: 'beginner',
      replayStep: 1,
      data: currentData,
      steps: currentData.length,
      branchRuns: [savedRun]
    });

    expect(html).toContain('Run comparison workspace');
    expect(html).toContain('Shared replay timeline');
    expect(html).not.toContain('Current and saved run parameter comparison');
  });

  it('uses non-color line and point encodings and synchronizes replay state', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(source).toContain("strokeDasharray: '6,4'");
    expect(source).toContain("buildReplaySVG(data, 'Current run')");
    expect(source).toContain("upd('replayStep', Math.min(replayMax, replayCursor + 1))");
    expect(source).toContain("'data-ecosystem-profile': displayProfile");
  });

  it('keeps the deployed mirror byte-identical', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    const deployed = fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(deployed).toBe(source);
  });
});
