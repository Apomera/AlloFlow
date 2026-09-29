import { describe, expect, it } from 'vitest';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { extractWatershed } = require('../dev-tools/campaign-adventure-pilot/build.cjs');
const moduleSource = extractWatershed().module.replace(/export /g, '').replace(
  '  apply: (state, tech, target) =>',
  '  preview: (state, tech, target) => { steward = copy(state); return copy(applyStewardTech(tech, target, true)); },\n  apply: (state, tech, target) =>'
);
function runtime() {
  return vm.runInNewContext(moduleSource + '\ncreateWatershedRuntime();');
}
const clone = value => JSON.parse(JSON.stringify(value));
const component = (state, id) => state.components.find(c => c.id === id);

describe('Steward decision evidence', () => {
  it('previews the same capped effects as Apply without spending hours or changing state', () => {
    const api = runtime();
    const state = api.start({ seed: 'decision-test', difficulty: 'coordinator' });
    Object.assign(component(state, 'riverMainstem'), { quality: 97, connectivity: 90, support: 8 });
    const before = clone(state);
    const preview = api.preview(state, 'damRemoval', 'riverMainstem');
    expect(state).toEqual(before);
    expect(preview.canApply).toBe(true);
    expect(preview.hoursAfter).toBe(3);
    const river = preview.after.find(c => c.id === 'riverMainstem');
    expect(river).toMatchObject({ quality: 100, connectivity: 100, support: 0 });
    const result = api.apply(state, 'damRemoval', 'riverMainstem');
    expect(result.components).toEqual(preview.after);
    expect(result.hoursLeft).toBe(preview.hoursAfter);
    expect(result.yearActions[0].before).toEqual(before.components);
    expect(result.yearActions[0].after).toEqual(result.components);
    expect(result.decisionPreview).toBeNull();
  });

  it('rejects over-budget, invalid-target, and out-of-year actions', () => {
    const api = runtime();
    const state = api.start({ seed: 'constraints' });
    state.hoursLeft = 1;
    expect(api.preview(state, 'damRemoval', 'riverMainstem').canApply).toBe(false);
    expect(api.apply(state, 'damRemoval', 'riverMainstem')).toEqual(state);
    state.hoursLeft = 18;
    expect(api.preview(state, 'damRemoval', 'forestBuffer').canApply).toBe(false);
    expect(api.apply(state, 'damRemoval', null)).toEqual(state);
    state.phase = 'review';
    expect(api.apply(state, 'citizenScience', null)).toEqual(state);
  });

  it('shows watershed-wide changes across all six components', () => {
    const api = runtime();
    const state = api.start({ seed: 'wide' });
    const preview = api.preview(state, 'publicEd', null);
    expect(preview.after).toHaveLength(6);
    preview.after.forEach((after, index) => {
      expect(after.quality).toBe(state.components[index].quality);
      expect(after.support).toBe(Math.min(100, state.components[index].support + 9));
    });
  });

  it('keeps the original year start and immutable receipts through repeated actions', () => {
    const api = runtime();
    const start = api.start({ seed: 'receipts' });
    const one = api.apply(start, 'bufferPlant', 'forestBuffer');
    const two = api.apply(one, 'bufferPlant', 'forestBuffer');
    expect(two.yearStart).toEqual(start.components);
    expect(two.yearActions[0]).toEqual(one.yearActions[0]);
    expect(two.yearActions[1].before).toEqual(one.components);
    expect(two.yearActions[1].after).toEqual(two.components);
  });

  it('records each annual cause in order and the stages reconcile to the exact outcome', () => {
    const api = runtime();
    let state = api.start({ seed: 'ledger', difficulty: 'director' });
    state = api.apply(state, 'bufferPlant', 'forestBuffer');
    const review = api.endYear(state);
    const log = review.yearLog[0];
    expect(log.yearStart).toEqual(state.yearStart);
    expect(log.stages.map(stage => stage.id)).toEqual(['actions', 'drift', 'event', 'difficulty', 'cascade']);
    expect(log.stages[0].components).toEqual(state.components);
    expect(log.stages[4].components).toEqual(review.components);
    expect(log.post).toEqual(review.components);
    log.yearStart.forEach((initial, index) => {
      for (const field of ['quality', 'connectivity', 'support']) {
        let previous = initial[field];
        const total = log.stages.reduce((sum, stage) => {
          const value = stage.components[index][field];
          const next = sum + value - previous;
          previous = value;
          return next;
        }, 0);
        expect(initial[field] + total).toBeCloseTo(review.components[index][field], 10);
      }
    });
    const next = api.continue(review);
    expect(next.yearStart).toEqual(review.components);
    expect(next.yearActions).toEqual([]);
  });

  it('does not invent missing start-of-year evidence in older saved campaigns', () => {
    const api = runtime();
    let state = api.start({ seed: 'legacy' });
    state = api.apply(state, 'publicEd', null);
    delete state.yearStart;
    state.yearActions = state.yearActions.map(({ tech, target, hours }) => ({ tech, target, hours }));
    const updated = api.apply(state, 'publicEd', null);
    expect(updated.yearStart).toBeUndefined();
    const review = api.endYear(updated);
    expect(review.yearLog[0].yearStart).toBeNull();
    expect(review.yearLog[0].stages[0].components).toEqual(updated.components);
    expect(review.yearLog[0].stages.at(-1).components).toEqual(review.components);
  });
});
