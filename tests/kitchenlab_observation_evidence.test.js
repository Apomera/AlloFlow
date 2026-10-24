// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let E;
beforeAll(() => {
  resetStemLab();
  E = loadTool('stem_lab/stem_tool_kitchenlab.js', 'kitchenLab').engine;
});

const judgement = (independent = true) => ({ score: 92, grade: 'A', verdict: 'Cook complete.', notes: [], independent });
const stateWith = (log) => Object.assign(E.defaultState(), {
  activeSection: 'recipe', recipeActiveId: 'steak', recipePhase: 'done',
  recipeStartedAt: 1000, recipeSimElapsedSec: 300, recipeHeatRemovedSimSec: 280,
  recipeLog: log
});
const checks = () => [
  { t: 0, k: 'dial', level: 8 },
  { t: 15, k: 'flick' },
  { t: 60, k: 'add', id: 'steak' },
  { t: 160, k: 'probe', reading: 121 },
  { t: 230, k: 'probe', reading: 139 },
  { t: 280, k: 'probe', reading: 147 }
];
const assessed = (state, j = judgement()) => {
  const evidence = E.evidenceStatus(state, j);
  return Object.assign({}, j, { evidenceStatus: evidence.status, evidenceLabel: evidence.label, evidenceDetail: evidence.detail });
};

describe('Kitchen Lab observation evidence', () => {
  it('credits checking the food repeatedly as independent evidence in the learning record', () => {
    const state = stateWith(checks());
    const before = JSON.stringify(state);
    const j = assessed(state);
    expect(j.evidenceStatus).toBe('independent');
    expect(j.evidenceDetail).toContain('3 thermometer probes and 1 water flick');
    expect(E.cookSupports(state, j)).toMatchObject({
      count: 0, observationCount: 4,
      observations: { thermometerProbes: 3, waterFlicks: 1 }
    });
    expect(E.foldRecipeHistory({}, 'steak', j, false).steak).toMatchObject({
      independentRuns: 1, supportedRuns: 0, independentBest: 92
    });
    expect(E.xpForCook(j)).toBe(15);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('keeps coaching visible when a coached learner makes the same observations', () => {
    const state = stateWith(checks());
    const j = assessed(state, judgement(false));
    expect(j.evidenceStatus).toBe('coached');
    expect(j.evidenceDetail).toContain('Coaching was enabled.');
    expect(j.evidenceDetail).toContain('3 thermometer probes and 1 water flick');
    expect(E.foldRecipeHistory({}, 'steak', j, false).steak.independentRuns).toBe(0);
    expect(E.xpForCook(j)).toBe(10);
  });

  it('preserves feedback about whether the learner actually checked before removing the food', () => {
    const unchecked = stateWith([]);
    const early = stateWith([{ t: 100, k: 'probe', reading: 110 }]);
    const verified = stateWith(checks());
    for (const state of [unchecked, early, verified]) {
      expect(E.evidenceStatus(state, judgement()).status).toBe('independent');
    }
    expect(E.thermometerNote(E.RECIPES.steak, unchecked).neg).toBe(true);
    expect(E.thermometerNote(E.RECIPES.steak, early).neg).toBe(true);
    expect(E.thermometerNote(E.RECIPES.steak, verified).neg).toBe(false);
    expect(E.evidenceStatus(unchecked, judgement()).detail).toContain('No thermometer probes or water flicks were recorded.');
  });

  it('does not infer coaching from an old AI critique or award evidence to a sandbox cook', () => {
    const state = Object.assign(stateWith(checks()), { aiCritique: 'Try lower heat next time.' });
    expect(E.evidenceStatus(state, judgement()).status).toBe('independent');
    expect(E.evidenceStatus(state, { score: null, independent: true })).toBeNull();
  });

  it('keeps observation counts in the results and exported report even with the old translation loaded', () => {
    const state = stateWith(checks());
    state.recipeJudgement = assessed(state);
    const staleDetail = 'No coaching, and no instrument beyond the one check the recipe asks for.';
    const t = vi.fn((key, fallback) => key === 'stem.kitchenlab.evidence_independent_detail' ? staleDetail : fallback);
    const html = renderTool('kitchenLab', { kitchenLab: state }, { t });
    const host = document.createElement('div');
    host.innerHTML = html;
    const evidence = host.querySelector('[data-kl-evidence="independent"]');
    expect(evidence).not.toBeNull();
    expect(evidence.textContent).toContain('3 thermometer probes and 1 water flick');
    expect(evidence.textContent).not.toContain(staleDetail);
    const report = E.cookReport(E.RECIPES.steak, state, 'F');
    expect(report).toContain('cooked independently');
    expect(report).toContain('3 thermometer probes and 1 water flick');
    expect(report).toContain('probed the centre: 147°F');
  });
});
