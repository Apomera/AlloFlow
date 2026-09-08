import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
const study = () => ({ version: 1, patchId: 'patch_c', prediction: 'unsure' });
const view = (overrides = {}) => ({ ready: true, patchId: 'patch_c', colony: 'home', routes: true, cycle: 6, ...overrides });
const at = '2026-09-07T16:00:00.000Z';
function pair() { return BH.bhQueenMapStudyCapture(BH.bhQueenMapStudyCapture(study(), view(), at), view({ colony: 'neighbor', cycle: 7 }), at); }

describe('Shared-patch observation records', () => {
  it('records only the visible colony view and preserves previous snapshots by value', () => {
    const original = study();
    const home = BH.bhQueenMapStudyCapture(original, view(), at);
    const frozen = JSON.stringify(home);
    const both = BH.bhQueenMapStudyCapture(home, view({ colony: 'neighbor', cycle: 7 }), at);
    expect(original).toEqual(study());
    expect(JSON.stringify(home)).toBe(frozen);
    expect(home.captures).toHaveProperty('home'); expect(home.captures).not.toHaveProperty('neighbor');
    expect(both.captures.home).toMatchObject({ patchId: 'patch_c', routeCount: 1, cycle: 6, source: 'shared-map-v1' });
    expect(both.captures.neighbor.cycle).toBe(7);
    both.captures.home.cycle = 55;
    expect(home.captures.home.cycle).toBe(6);
  });
  it.each([
    ['unready renderer', { ready: false }], ['hidden routes', { routes: false }],
    ['winter', { cycle: 95 }], ['both colonies', { colony: 'both' }],
    ['wrong patch', { patchId: 'patch_b' }], ['whole landscape', { patchId: null }],
    ['unknown colony', { colony: 'missing' }],
  ])('does not fabricate an observation for %s', (_, overrides) => {
    expect(BH.bhQueenMapStudyReady(study(), view(overrides))).not.toBe('');
    expect(BH.bhQueenMapStudyCapture(study(), view(overrides), at).captures).toEqual({});
  });
  it('requires a prediction and valid capture provenance', () => {
    expect(BH.bhQueenMapStudyCapture({ ...study(), prediction: '' }, view(), at).captures).toEqual({});
    expect(BH.bhQueenMapStudyCapture(study(), view(), 'invalid').captures).toEqual({});
    expect(BH.bhQueenMapStudyCapture(study(), view({ cycle: -1 }), at).captures).toEqual({});
    expect(BH.bhQueenMapStudyCapture(study(), view({ cycle: 6.5 }), at).captures).toEqual({});
  });
  it('does not overwrite a recorded route when the game clock or view changes', () => {
    const s = pair();
    expect(BH.bhQueenMapStudyCapture(s, view({ cycle: 25 }), '2026-09-08T00:00:00Z')).toEqual(s);
    expect(BH.bhQueenMapStudyCapture(s, view({ patchId: 'patch_f' }), at)).toEqual(s);
  });
  it('rejects stale or incompatible saved evidence and premature conclusions', () => {
    const s = pair();
    expect(BH.bhQueenMapStudy({ ...s, version: 2 }).captures).toEqual({});
    expect(BH.bhQueenMapStudy({ ...s, patchId: 'patch_a', claim: 'shared' }).captures).toEqual({});
    expect(BH.bhQueenMapStudy({ ...s, patchId: 'patch_a', claim: 'shared' }).claim).toBe('');
    expect(BH.bhQueenMapStudy({ ...s, prediction: 'toString' }).prediction).toBe('');
    expect(BH.bhQueenMapStudy({ ...s, captures: { home: { ...s.captures.home, source: 'field' } } }).captures).toEqual({});
    expect(BH.bhQueenMapStudy({ ...s, captures: { home: { ...s.captures.home, routeCount: 800 } } }).captures).toEqual({});
    expect(BH.bhQueenMapStudy({ ...s, reflection: 'x'.repeat(2000) }).reflection).toHaveLength(1200);
  });
  it('exports provenance, both frozen views, the learner claim and explicit scientific limits', () => {
    const s = { ...pair(), claim: 'shared', reflection: 'Count flower visits from each colony.' };
    const text = BH.bhQueenMapStudyText(s);
    expect(text).toContain('not field observations');
    expect(text).toContain('Prediction before recording: I am not sure yet.');
    expect(text).toContain('solid purple; game cycle 6');
    expect(text).toContain('dashed coral; game cycle 7');
    expect(text).toContain(at);
    expect(text).toContain(s.reflection);
    expect(text).toContain('not bee counts, visit rates, travel distances, or food yields');
    expect(text).toContain('https://doi.org/10.1002/ece3.71401');
    expect(BH.bhQueenMapStudyText({ ...s, claim: 'equal' })).toContain('Revisit this explanation');
    expect(BH.bhQueenMapStudyText(study())).toContain('Review: Incomplete.');
  });
});
