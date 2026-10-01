import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const BAG_3R_1B = [
  { label: 'Red', count: 3, numerator: 3, denominator: 4, prob: 0.75, color: '#ef4444' },
  { label: 'Blue', count: 1, numerator: 1, denominator: 4, prob: 0.25, color: '#3b82f6' },
];

const FIVE_SINGLETONS = [
  { label: 'A', count: 1, prob: 0.2, color: '#b91c1c' },
  { label: 'B', count: 1, prob: 0.2, color: '#c2410c' },
  { label: 'C', count: 1, prob: 0.2, color: '#3f6212' },
  { label: 'D', count: 1, prob: 0.2, color: '#0369a1' },
  { label: 'E', count: 1, prob: 0.2, color: '#6d28d9' },
];

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_probability.js', 'probability');
});

function path(tree, first, second) {
  return tree.paths.find((candidate) =>
    candidate.first.label === first && candidate.second.label === second);
}

describe('Probability Lab without-replacement tree mathematics', () => {
  it('computes every ordered path exactly for a 3-red, 1-blue bag', () => {
    const tree = window.__ProbabilityCore.withoutReplacementTree(BAG_3R_1B);

    expect(tree).toMatchObject({ valid: true, total: 4, secondDenominator: 3 });
    expect(tree.paths).toHaveLength(4);
    expect(path(tree, 'Red', 'Red')).toMatchObject({
      firstNumerator: 3, firstDenominator: 4,
      conditionalNumerator: 2, conditionalDenominator: 3,
      jointNumerator: 6, jointDenominator: 12,
      firstProbability: 0.75, jointProbability: 0.5, impossible: false,
    });
    expect(path(tree, 'Red', 'Blue')).toMatchObject({
      conditionalNumerator: 1, conditionalDenominator: 3,
      jointNumerator: 3, jointDenominator: 12,
      conditionalProbability: 1 / 3, jointProbability: 0.25, impossible: false,
    });
    expect(path(tree, 'Blue', 'Red')).toMatchObject({
      conditionalNumerator: 3, conditionalDenominator: 3,
      jointNumerator: 3, jointDenominator: 12,
      conditionalProbability: 1, jointProbability: 0.25, impossible: false,
    });
    expect(path(tree, 'Blue', 'Blue')).toMatchObject({
      conditionalNumerator: 0, conditionalDenominator: 3,
      jointNumerator: 0, jointDenominator: 12,
      conditionalProbability: 0, jointProbability: 0, impossible: true,
    });
  });

  it('retains all 25 ordered paths for five singleton outcomes', () => {
    const tree = window.__ProbabilityCore.withoutReplacementTree(FIVE_SINGLETONS);

    expect(tree).toMatchObject({ valid: true, total: 5, secondDenominator: 4 });
    expect(tree.branches).toHaveLength(5);
    expect(tree.paths).toHaveLength(25);
    expect(tree.paths.filter((candidate) => candidate.impossible)).toHaveLength(5);
    expect(tree.paths.filter((candidate) => !candidate.impossible)).toHaveLength(20);
    expect(path(tree, 'A', 'A').jointProbability).toBe(0);
    expect(path(tree, 'A', 'E').jointProbability).toBeCloseTo(1 / 20, 12);
    expect(tree.paths.reduce((sum, candidate) => sum + candidate.jointProbability, 0)).toBeCloseTo(1, 12);
  });

  it('normalizes every conditional row and preserves the population distribution as the second-draw marginal', () => {
    const bags = [
      BAG_3R_1B,
      [
        { label: 'Red', count: 2 },
        { label: 'Blue', count: 2 },
        { label: 'Green', count: 1 },
      ],
      FIVE_SINGLETONS,
    ];

    for (const bag of bags) {
      const tree = window.__ProbabilityCore.withoutReplacementTree(bag);
      for (const branch of tree.branches) {
        expect(
          branch.paths.reduce((sum, candidate) => sum + candidate.conditionalProbability, 0),
          'conditional row after first drawing ' + branch.outcome.label,
        ).toBeCloseTo(1, 12);
      }
      for (const outcome of tree.outcomes) {
        const secondMarginal = tree.paths
          .filter((candidate) => candidate.second.label === outcome.label)
          .reduce((sum, candidate) => sum + candidate.jointProbability, 0);
        expect(secondMarginal, 'second-draw marginal for ' + outcome.label)
          .toBeCloseTo(outcome.count / tree.total, 12);
      }
      expect(tree.paths.reduce((sum, candidate) => sum + candidate.jointProbability, 0))
        .toBeCloseTo(1, 12);
    }
  });

  it('returns an explicit invalid model when fewer than two items are available', () => {
    const empty = window.__ProbabilityCore.withoutReplacementTree([]);
    const singleton = window.__ProbabilityCore.withoutReplacementTree([
      { label: 'Only', count: 1, color: '#475569' },
    ]);

    expect(empty).toMatchObject({ valid: false, total: 0, secondDenominator: 0, paths: [] });
    expect(empty.reason).toContain('at least two items');
    expect(singleton).toMatchObject({ valid: false, total: 1, secondDenominator: 0 });
    expect(singleton.reason).toContain('at least two items');
    expect(singleton.paths).toHaveLength(1);
    expect(singleton.paths[0]).toMatchObject({
      conditionalProbability: 0, jointProbability: 0, impossible: true,
    });
  });

  it('does not mutate the caller-owned bag or share returned outcome objects with it', () => {
    const mutableBag = BAG_3R_1B.map((outcome) => ({ ...outcome }));
    const before = structuredClone(mutableBag);
    const frozenBag = Object.freeze(mutableBag.map((outcome) => Object.freeze(outcome)));

    const tree = window.__ProbabilityCore.withoutReplacementTree(frozenBag);

    expect(frozenBag).toEqual(before);
    expect(tree.outcomes).not.toBe(frozenBag);
    tree.outcomes.forEach((outcome, index) => expect(outcome).not.toBe(frozenBag[index]));
    tree.paths.forEach((candidate) => {
      expect(frozenBag).not.toContain(candidate.first);
      expect(frozenBag).not.toContain(candidate.second);
    });
  });
});

describe('Probability Lab conditional-tree pedagogy', () => {
  it('renders conditional notation, ordered paths, impossible outcomes, and one-of-each addition without an independence claim', () => {
    const html = renderTool('probability', { probability: {
      mode: 'tree', treeEventMode: 'bagNoReplacement', customSubMode: 'fraction',
      customOutcomes: BAG_3R_1B,
    } });

    expect(html).toMatch(/without replacement/i);
    expect(html).toMatch(/P\(Blue\s*\|\s*Red\)/);
    expect(html).toMatch(/ordered path/i);
    expect(html).toMatch(/Blue[^<]*(?:then|→)[^<]*Blue/i);
    expect(html).toMatch(/(?:impossible[^<]*0(?:\.0)?%|0(?:\.0)?%[^<]*impossible)/i);
    expect(html).toMatch(/one of each/i);
    expect(html).toMatch(/P\(Red[^)]*Blue\)[^+]*\+[^=]*P\(Blue[^)]*Red\)/i);
    expect(html).not.toContain('These events are independent');
    expect(html).toMatch(/P\(A\s*then\s*B\)\s*=\s*P\(A\)\s*[×x]\s*P\(B\s*\|\s*A\)/i);
  });

  it('renders every outcome and all 25 paths in a five-outcome independent custom tree', () => {
    const html = renderTool('probability', { probability: {
      mode: 'tree', treeEventMode: 'custom', customSubMode: 'slider',
      customOutcomes: FIVE_SINGLETONS,
    } });

    expect(html).toContain('25 ordered joint paths');
    expect(html).toContain('P(E then E) = 4.0%');
    expect(html.match(/P\([A-E] then [A-E]\) = 4\.0%/g)).toHaveLength(25);
    expect(html).not.toContain('16 ordered joint paths');
  });
});
