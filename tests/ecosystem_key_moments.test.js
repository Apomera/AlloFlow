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

describe('Ecosystem key-moment analysis', () => {
  it('identifies peaks, merges coincident moments, and reports positive predator lag', () => {
    const data = [
      { step: 0, prey: 50, pred: 5 },
      { step: 1, prey: 80, pred: 7 },
      { step: 2, prey: 70, pred: 10 },
      { step: 3, prey: 40, pred: 14 },
      { step: 4, prey: 45, pred: 12 }
    ];
    const html = renderEcosystem({ tab: 'explore', analysisView: 'moments', data, steps: data.length, replayStep: 1 });

    expect(html).toContain('Key moments in this run');
    expect(html).toContain('Predator abundance peaks 2 modeled steps after the prey peak.');
    expect(html).toContain('Predator peak + Prey low');
    expect(html).toContain('Evidence prompt:');
  });

  it('describes coincident peaks without inventing a lag', () => {
    const data = [
      { step: 0, prey: 50, pred: 5 },
      { step: 1, prey: 70, pred: 10 },
      { step: 2, prey: 60, pred: 8 }
    ];
    const html = renderEcosystem({ tab: 'explore', analysisView: 'moments', data, steps: data.length });

    expect(html).toContain('Prey and predator abundance peak at the same modeled step in this run.');
    expect(html).toContain('Prey peak + Predator peak');
  });

  it('reports a predator peak that precedes the prey peak', () => {
    const data = [
      { step: 0, prey: 40, pred: 5 },
      { step: 1, prey: 55, pred: 12 },
      { step: 2, prey: 80, pred: 9 },
      { step: 3, prey: 70, pred: 7 }
    ];
    const html = renderEcosystem({ tab: 'explore', analysisView: 'moments', data, steps: data.length });

    expect(html).toContain('Predator abundance peaks 1 modeled step before the prey peak in this run.');
  });

  it('keeps moment controls connected to shared replay and screen-reader announcements', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(source).toContain('var analyzeKeyMoments = function(runData)');
    expect(source).toContain("upd('replayStep', moment.index)");
    expect(source).toContain("announceToSR(moment.label + ', step '");
    expect(source).toContain("var momentFlags = keyMomentAnalysis.moments.map");
  });

  it('keeps the deployed mirror byte-identical', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    const deployed = fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(deployed).toBe(source);
  });
});
