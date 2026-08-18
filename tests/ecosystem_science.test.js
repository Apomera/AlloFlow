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

describe('Ecosystem logistic predator-prey model', () => {
  it('uses the signed logistic derivative, RK4 integration, and permits zero-abundance outcomes', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(source).toContain('prey: params.preyBirth * prey * (1 - prey / K) - params.preyDeath * prey * pred');
    expect(source).toContain('pred: params.predBirth * prey * pred - params.predDeath * pred');
    expect(source).toContain('function ecoRK4Step(prey, pred, params, timeStep)');
    expect(source).toContain('var ECO_MODEL_SUBSTEPS = 4;');
    expect(source).toContain('return { prey: Math.max(0, nextPrey), pred: Math.max(0, nextPred), invalid: false };');
    expect(source).not.toContain('Math.max(0, 1 - prey / K)');
    expect(source).not.toContain('Math.min(500');
    expect(source).not.toContain('Math.max(1, prey + preyBirth');
  });

  it('labels coefficients and states the numerical model limits', () => {
    const html = renderEcosystem({ tab: 'explore' });
    expect(html).toContain('Prey intrinsic growth (r)');
    expect(html).toContain('Predation coefficient (a)');
    expect(html).toContain('Predator conversion (b)');
    expect(html).toContain('fourth-order Runge-Kutta updates use a 0.1 output step');
    expect(html).toContain('Values are not silently capped');
    expect(html).toContain('separate stochastic rules');
  });

  it('calibrates the baseline and keeps chart and canvas capacities aligned', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(source).toContain('var pred0 = d.pred0 !== undefined ? d.pred0 : 12;');
    expect(source).toContain('var ECO_MODEL_TIME_STEP = 0.1;');
    expect(source).toContain('guided: {');
    expect(source).toContain('pred0: { min: 4, max: 30, step: 2 }');
    expect(source).toContain('var PREY_POOL_SIZE = 200;');
    expect(source).toContain('var PRED_POOL_SIZE = 80;');
    expect(source).toContain('syncLivePopulationTargets();');
  });
  it('names analytical charts for assistive technology', () => {
    const data = [
      { step: 0, prey: 80, pred: 30 },
      { step: 1, prey: 58, pred: 51 },
      { step: 2, prey: 28, pred: 76 }
    ];
    const populationHtml = renderEcosystem({
      tab: 'explore',
      analysisView: 'population',
      data,
      steps: 3
    });
    const phaseHtml = renderEcosystem({
      tab: 'explore',
      analysisView: 'phase',
      data,
      steps: 3
    });
    expect(populationHtml).toContain('Predator and prey population trajectories over 0.2 modeled time units (2 output steps)');
    expect(phaseHtml).toContain('Phase portrait of predator abundance versus prey abundance across 0.2 modeled time units');
  });
});

describe('Ecosystem content contracts', () => {
  it('requires the two graph modes that actually exist', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(source).toContain('View both live graph modes (population and environment)');
    expect(source).toContain("return !!(v.population && v.environment)");
    expect(source).toContain("+ '/2 views'");
    expect(source).not.toContain("+ '/3 views'");
  });

  it('accurately describes its six-question quiz', () => {
    const html = renderEcosystem({ tab: 'quiz' });
    expect(html).toContain('6 multiple-choice questions');
    expect(html).toContain('Question 1 of 6');
    // Option A changed when the bank was rotated to break its answer-position bias
    // (answers sat at A/B/C/D = 1/3/2/0, so always picking B beat guessing). The point
    // of this assertion is the "Answer <letter>: <text>" label format, not which option
    // happens to be first.
    expect(html).toContain('Answer A: Predators stay the same');
    expect(html).not.toContain('12 multi-choice items');
  });

  it('defines carrying capacity as conditional rather than permanently fixed', () => {
    // quizAnswer selects the correct option so the confirming feedback renders; the
    // carrying-capacity answer moved from B to C when the bank was rotated to spread
    // its answer positions.
    const html = renderEcosystem({ tab: 'quiz', quizIndex: 3, quizAnswer: 2 });
    expect(html).toContain('under a specified set of environmental conditions');
    expect(html).toContain('Real carrying capacity can change');
    expect(html).not.toContain('sustain indefinitely');
  });
});

describe('Ecosystem scenario boundaries and accessibility', () => {
  it('runs an accessible 121-cell population-model sweep and exposes table headers', () => {
    const html = renderEcosystem({
      tab: 'inquiry',
      inquiry: {
        predBirth: 50,
        preyLife: 50,
        resScarcity: 30,
        log: [{ pb: 40, pl: 78, rs: 149, out: 'Coexistence in transition', outcomeKey: 'coexist' }]
      }
    });
    expect(html).toContain('Explore 121 runs from the same logistic predator-prey model');
    expect(html).toContain('every cell runs the same deterministic logistic predator-prey equations');
    expect(html).toContain('Outcome map: initial prey × initial predators');
    expect(html).not.toContain('arbitrary weighted classifier');
    expect(html).toContain('role="status"');
    expect((html.match(/aria-label="\d+ initial prey, \d+ initial predators,/g) || []).length).toBe(121);
    expect((html.match(/scope="col"/g) || []).length).toBe(4);
  });

  it('discloses what changes and what stays fixed across study scenarios', () => {
    const html = renderEcosystem({ tab: 'explore' });
    expect(html).toContain('Study scenario');
    expect(html).toContain('Species, visuals, events, and baseline values change by scenario.');
    expect(html).toContain('The same two-population equations remain underneath');
    expect(html).toContain('Kelp Forest');
    expect(html).not.toContain('Each has unique colors and ecology.');
  });

  it('discloses that Conservation Manager values are indices, not forecasts', () => {
    const html = renderEcosystem({ tab: 'conserve' });
    expect(html).toContain('Maine-inspired teaching scenario');
    expect(html).toContain('relative indices, not animal counts');
    expect(html).toContain('not forecasts or management recommendations');
  });
});
