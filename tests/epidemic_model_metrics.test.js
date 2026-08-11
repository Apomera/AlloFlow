import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_epidemic.js', 'epidemicSim');
});

describe('Epidemic Lab model metrics', () => {
  it('does not count initial immunity as infection', () => {
    const summarize = window.__EpidemicCore.summarizeEpidemicRun;
    const data = [
      { day: 0, S: 79.9, I: 0.1, R: 20 },
      { day: 20, S: 79.9, I: 0.02, R: 20.08 }
    ];
    expect(summarize(data, 20, 0.8).attackRate).toBeCloseTo(0.1, 6);
  });

  it('reports attack rate, peak prevalence, and initial R-effective', () => {
    const summarize = window.__EpidemicCore.summarizeEpidemicRun;
    const result = summarize([
      { day: 0, S: 79.9, I: 0.1, R: 20 },
      { day: 25, S: 55, I: 12, R: 33 },
      { day: 80, S: 40, I: 0.2, R: 59.8 }
    ], 20, 3);
    expect(result).toMatchObject({ peakInfected: 12, peakDay: 25, attackRate: 40 });
    expect(result.initialEffectiveR).toBeCloseTo(2.397, 6);
  });

  it('handles empty data without invalid values', () => {
    expect(window.__EpidemicCore.summarizeEpidemicRun([], 30, 2.5)).toEqual({
      peakInfected: 0,
      peakDay: 0,
      attackRate: 0,
      initialEffectiveR: 1.75
    });
  });

  it('makes the model boundary and accessible result explicit', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_epidemic.js', 'utf8');
    expect(source).toContain('Model boundary: ');
    expect(source).toContain('immediate complete immunity for the vaccinated percentage');
    expect(source).toContain("'Attack Rate'");
    expect(source).toContain("'Initial R-effective'");
    expect(source).toContain("role: 'status', 'aria-live': 'polite'");
    expect(source).toContain('patch.sirRunNote = null');
    expect(source).toContain('lastRunData');
    expect(source).toContain("type: 'number'");
    expect(source).toContain('mapPlacementMode');
    expect(source).toContain('summarizeMapHistory');
    expect(source).toContain('Run outcome');
    expect(source).toContain('Undo last quarantine zone');
    expect(source).toContain('Simulation horizon (days)');
    expect(source).toContain('Initial infected (%)');
    expect(source).toContain('Inspect epidemic day');
    expect(source).toContain('function advanceMap');
    expect(source).toContain('solveSIRStochastic');
    expect(source).toContain('chartPlaybackRunning');
    expect(source).toContain('uncertaintyData');
    expect(source).toContain('mapSnapshots');
    expect(source).toContain('mapViewStep');
    expect(source).toContain('Scrub map history');
    expect(source).toContain('mapDisplayGrid');
    expect(source).toContain('Map snapshot summary');
    expect(source).toContain('Growing transmission');
    expect(source).toContain('mapPlacementMode: nextStep === mapStep');
    expect(source).toContain('PATHOGEN_PROFILES');
    expect(source).toContain('Pathogen profile');
    expect(source).toContain('pathogenGridRates');
    expect(source).toContain('isPathogenFeature');
    expect(source).toContain('mapExposure');
    expect(source).toContain('Water contamination');
    expect(source).toContain('Habitat coverage');
    expect(source).toContain('getPathogenInterventions');
    expect(source).toContain('Pathogen-specific interventions');
    expect(source).toContain('Historical reconstruction');
    expect(source).toContain('SARS 2003 containment');
    expect(source).toContain('hospitalizationRisk');
    expect(source).toContain('Clinical map trajectories');
    expect(source).toContain('Hospitalized');
    expect(source).not.toContain("totalInf = 100 - activeData[activeData.length - 1].S");
  });
});
