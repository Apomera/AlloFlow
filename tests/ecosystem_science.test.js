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
  it('uses the signed logistic term and permits zero-abundance outcomes', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(source).toContain('var logisticFactor = 1 - prey / K;');
    expect(source).toContain('var newPrey = Math.max(0, prey + preyBirth * prey * logisticFactor');
    expect(source).toContain('var newPred = Math.max(0, pred + predBirth * prey * pred - predDeath * pred);');
    expect(source).not.toContain('Math.max(0, 1 - prey / K)');
    expect(source).not.toContain('Math.max(1, prey + preyBirth');
  });

  it('labels coefficients and states the numerical model limits', () => {
    const html = renderEcosystem({ tab: 'explore' });
    expect(html).toContain('Prey intrinsic growth (r)');
    expect(html).toContain('Predation coefficient (a)');
    expect(html).toContain('Predator conversion (b)');
    expect(html).toContain('one-step Euler updates with rounded counts');
    expect(html).toContain('separate stochastic rules');
  });

  it('names analytical charts for assistive technology', () => {
    const html = renderEcosystem({
      tab: 'explore',
      data: [
        { step: 0, prey: 80, pred: 30 },
        { step: 1, prey: 58, pred: 51 },
        { step: 2, prey: 28, pred: 76 }
      ],
      steps: 3
    });
    expect(html).toContain('Predator and prey population trajectories over 2 modeled time steps');
    expect(html).toContain('Phase portrait of predator abundance versus prey abundance');
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
    expect(html).toContain('Answer A: Predators decrease');
    expect(html).not.toContain('12 multi-choice items');
  });

  it('defines carrying capacity as conditional rather than permanently fixed', () => {
    const html = renderEcosystem({ tab: 'quiz', quizIndex: 3, quizAnswer: 1 });
    expect(html).toContain('under a specified set of environmental conditions');
    expect(html).toContain('Real carrying capacity can change');
    expect(html).not.toContain('sustain indefinitely');
  });
});

describe('Ecosystem scenario boundaries and accessibility', () => {
  it('labels the inquiry classifier as conceptual and exposes table headers', () => {
    const html = renderEcosystem({
      tab: 'inquiry',
      inquiry: {
        predBirth: 50,
        preyLife: 50,
        resScarcity: 30,
        log: [{ pb: 50, pl: 50, rs: 30, out: 'balanced' }]
      }
    });
    expect(html).toContain('arbitrary weighted classifier');
    expect(html).toContain('not a population-dynamics model');
    expect(html).toContain('role="status"');
    expect((html.match(/scope="col"/g) || []).length).toBe(4);
  });

  it('discloses that Conservation Manager values are indices, not forecasts', () => {
    const html = renderEcosystem({ tab: 'conserve' });
    expect(html).toContain('Maine-inspired teaching scenario');
    expect(html).toContain('relative indices, not animal counts');
    expect(html).toContain('not forecasts or management recommendations');
  });
});
