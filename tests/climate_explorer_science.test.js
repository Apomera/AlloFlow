import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderClimate(state = {}, ctx = {}) {
  return renderTool('climateExplorer', { climateExplorer: state }, ctx);
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_climateExplorer.js', 'climateExplorer');
});

describe('Climate Explorer observation labels', () => {
  it('distinguishes the latest NOAA monthly mean from the historical annual series', () => {
    const html = renderClimate({ tab: 'keeling' });
    expect(html).toContain('June 2026: 431.44 ppm CO');
    expect(html).toContain('2024 annual mean');
    expect(html).toContain('Atmospheric visualization responding to the current activity values');
    expect(html).not.toContain('CO₂ today: ~424 ppm');
  });
});

describe('Climate Explorer solution-stack boundaries', () => {
  it('renders a selected portfolio without stale carbon-budget variables', () => {
    const html = renderClimate({
      tab: 'solutions',
      drawdownPicked: { wind_onshore: true, food_waste: true }
    });
    expect(html).toContain('Selected rows =');
    expect(html).toContain('simple sum is not a modeled portfolio');
    expect(html).toContain('Do not compare their simple sum with a remaining carbon budget or infer a temperature outcome');
  });

  it('does not compare the simple sum with a remaining carbon budget', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_climateExplorer.js', 'utf8');
    expect(source).not.toContain('var budget15');
    expect(source).not.toContain('pctOf15');
    expect(source).not.toContain('Your stack alone would close the 1.5');
    expect(source).not.toContain('keep warming below 2');
    expect(source).toContain('solutions interact, share baselines, and face resource constraints');
  });
});

describe('Climate Explorer teaching-model boundaries', () => {
  it('labels the forcing activity as an arbitrary index in teaching units', () => {
    const html = renderClimate({ tab: 'forceHunt' }, { gradeLevel: '10th Grade' });
    expect(html).toContain('Compare an arbitrary teaching index');
    expect(html).toContain('Relative forcing index =');
    expect(html).toContain('teaching units');
    expect(html).toContain('not a radiative-transfer model or temperature projection');
    expect(html).toContain('labels are prompts, not predictions');
  });

  it('identifies policy outcomes as hand-authored indices rather than forecasts', () => {
    const html = renderClimate({ tab: 'pathways' }, { gradeLevel: '10th Grade' });
    expect(html).toContain('illustrative scenario');
    expect(html).toContain('hand-authored 0-100 indices');
    expect(html).toContain('not measured emissions, probabilities, forecasts, or policy recommendations');
  });
});
