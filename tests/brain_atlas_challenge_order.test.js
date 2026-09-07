// The Find It in 3D challenge built its four options with the answer first and
// then rotated the list by round % 4. The answer's slot was therefore a pure
// function of the round number printed on screen: slot 0, 3, 2, 1, repeating.
// A learner who noticed the cycle could answer every round without looking at
// the model. That is worse than the quiz's skewed shuffle; it is a key.
//
// The order is now shuffled once per round and kept in state, so the list
// holds still after a wrong pick and reshuffles when the round advances. The
// distractor set is unchanged. These tests do not need to know which option is
// the answer: the defect was that ANY option had a fixed slot per round, so the
// property pinned is that none does.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const src = readFileSync(FILE, 'utf8');

function fresh(round, extra = {}) {
  resetStemLab();
  const tool = loadTool(FILE, 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'medial', brain3DChallengeActive: true, brain3DChallengeRound: round, ...extra } });
  const render = () => tool.render(makeCtx({ announceToSR: vi.fn() }, store));
  render();
  return { store, render, order: () => store.toolData.brainAtlas._brain3DChallengeOrder };
}

describe('brainAtlas Find It challenge does not telegraph its answer', () => {
  beforeEach(() => { resetStemLab(); vi.useFakeTimers(); });

  it('no longer rotates the options by the round number', () => {
    expect(src).not.toContain('challengeOptionRotation');
    expect(src).toContain('brainAtlasShuffle(challengeOptionBase)');
    expect(src).toContain("upd('_brain3DChallengeOrderFor', challengeRoundKey)");
  });

  it('keeps the same four options per round, only reordered', () => {
    const a = fresh(2).order();
    const b = fresh(2).order();
    expect(a).toHaveLength(4);
    expect(new Set(a).size).toBe(4);
    expect(a.slice().sort()).toEqual(b.slice().sort());
  });

  it('gives no option a fixed slot for a given round', () => {
    // under the old code every id sat in one slot for round r, every time
    for (const round of [0, 1, 2, 3]) {
      const seen = new Map();
      for (let n = 0; n < 60; n += 1) {
        fresh(round).order().forEach((id, slot) => {
          if (!seen.has(id)) seen.set(id, new Set());
          seen.get(id).add(slot);
        });
      }
      seen.forEach((slots, id) => {
        expect(slots.size, 'round ' + round + ': ' + id + ' only ever in slot(s) ' + [...slots].join(',')).toBeGreaterThan(2);
      });
    }
  }, 60000);

  it('holds the order still across re-renders within a round', () => {
    const s = fresh(1);
    const first = s.order().slice();
    for (let n = 0; n < 5; n += 1) s.render();
    expect(s.order()).toEqual(first);
  });

  it('holds the order still after a wrong pick', () => {
    const s = fresh(1);
    const first = s.order().slice();
    s.store.toolData.brainAtlas.brain3DChallengeFeedback = { status: 'retry', picked: 'x', points: 0 };
    s.store.toolData.brainAtlas.brain3DChallengeMisses = 1;
    s.render();
    expect(s.order()).toEqual(first);
  });

  it('reshuffles when the round advances', () => {
    const s = fresh(0);
    const round0 = s.order().slice();
    s.store.toolData.brainAtlas.brain3DChallengeRound = 1;
    s.render();
    expect(s.store.toolData.brainAtlas._brain3DChallengeOrderFor).toBe(1);
    // a different round draws from different pool entries, so the sets differ
    expect(s.order().slice().sort()).not.toEqual(round0.slice().sort());
  });

  it('ignores a stored order that does not match the round it is shown for', () => {
    // a stale or hand-edited order must not be trusted
    const s = fresh(0, { _brain3DChallengeOrder: ['not', 'real', 'ids', 'here'], _brain3DChallengeOrderFor: 0 });
    const order = s.order();
    expect(order).not.toEqual(['not', 'real', 'ids', 'here']);
    expect(order).toHaveLength(4);
  });

  it('the desktop mirror is byte-identical', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_brainatlas.js', 'utf8')).toBe(src);
  });
});
