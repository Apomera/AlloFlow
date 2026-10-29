import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
function productionFunction(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw new Error('Expected one production function: ' + name);
  const match = matches[0], start = match.index + match[1].length;
  const ending = '\n' + match[1] + '}', end = source.indexOf(ending, start);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

const target = { id: 'dorsal_skin', name: 'Dorsal Skin' };
const distractor = { id: 'tympanum', name: 'Tympanic Membrane' };
const originalVerification = { status: 'verified', guided: true, at: 123456, layer: 'skin', retainedDetail: 'Original specimen evidence' };
function lab(overrides = {}) {
  const submissions = Object.create(null);
  const submissionFor = productionFunction('dissectionGuidedSubmissionFor', { _disGuidedSubmissions: submissions });
  const awardXP = vi.fn(), feedback = vi.fn(), toast = vi.fn(), sound = vi.fn();
  let state = {
    specimen: 'frog', activeLayer: 'skin', guidedMode: true, guidedStep: 0,
    guidedTargetIds: [target.id], guidedObservationPending: target.id,
    verifiedIdentifications: {}, guidedComplete: false,
    exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: { 'frog|dorsal_skin': 'Moist surface' },
    organConfidence: { 'frog|dorsal_skin': 2 }, assessmentEvidence: { 'frog|tympanum': { correct: true, at: 99 } },
    ...overrides,
  };
  const writes = [];
  function render(patch = {}, owner = 'lab-a') {
    state = { ...state, ...patch };
    const d = state; // Immutable render snapshot; updates remain deferred until commit().
    const guidedSubmission = submissionFor(owner, d);
    const ids = d.guidedTargetIds;
    const organs = [target, distractor];
    const steps = ids.map(id => organs.find(organ => organ.id === id)).filter(Boolean);
    const record = productionFunction('recordGuidedObservationChoice', {
      d, guidedSubmission, _disGuidedSubmissions: submissions, dissectionSaveOwner: owner,
      organs, specimen: d.specimen, activeLayer: d.activeLayer, guidedStep: d.guidedStep,
      currentGuided: steps[d.guidedStep] && { organId: steps[d.guidedStep].id },
      guidedSteps: steps, guidedTargetIds: ids,
      upd: (key, value) => writes.push({ [key]: value }), updMany: value => writes.push(value),
      awardStemXP: awardXP, setProcedureFeedback: feedback, addToast: toast, sfxDisProbe: sound,
      setTimeout: () => 0, focusDissectionTarget: vi.fn(),
    });
    return { record, token: guidedSubmission };
  }
  function commit() { for (const patch of writes.splice(0)) state = { ...state, ...patch }; return state; }
  return { render, commit, awardXP, feedback, toast, sound, writes, get state() { return state; } };
}

describe('Guided evidence and reward integrity', () => {
  it('awards new identification and first full completion once without changing other learning evidence', () => {
    const f = lab(); const before = structuredClone(f.state); const { record } = f.render();
    expect(record(target.id)).toBe(true); f.commit();
    expect(f.awardXP.mock.calls.map(call => call[1])).toEqual([2, 10]);
    expect(f.state.verifiedIdentifications['frog|dorsal_skin']).toMatchObject({ status: 'verified', guided: true, layer: 'skin' });
    expect(f.state.guidedComplete).toBe(true); expect(f.state.guidedMode).toBe(false);
    for (const key of ['exploredOrgans', 'organNotes', 'organConfidence', 'assessmentEvidence']) expect(f.state[key]).toEqual(before[key]);
  });

  it('treats a previously verified full round as practice and preserves its original metadata', () => {
    const f = lab({ guidedComplete: true, verifiedIdentifications: { 'frog|dorsal_skin': originalVerification } });
    expect(f.render().record(target.id)).toBe(true); f.commit();
    expect(f.awardXP).not.toHaveBeenCalled();
    expect(f.state.verifiedIdentifications['frog|dorsal_skin']).toBe(originalVerification);
    expect(f.state.guidedObservationFeedback.message).toContain('Practice confirmed');
    expect(f.state.guidedObservationFeedback.message).toContain('no additional XP');
    expect(f.feedback).toHaveBeenLastCalledWith(expect.stringContaining('Guided practice round complete'), 'success');
    expect(f.state.guidedComplete).toBe(true);
  });

  it('can earn the first full-round completion after an earlier focused verification', () => {
    const f = lab({ verifiedIdentifications: { 'frog|dorsal_skin': originalVerification } });
    expect(f.render().record(target.id)).toBe(true); f.commit();
    expect(f.awardXP.mock.calls.map(call => call[1])).toEqual([10]);
    expect(f.state.guidedComplete).toBe(true);
    expect(f.state.verifiedIdentifications['frog|dorsal_skin']).toBe(originalVerification);
  });

  it.each([false, true])('keeps focused-check credit separate from prior full completion %s', guidedComplete => {
    const f = lab({ guidedComplete, _guidedCheckOnly: true, _guidedCheckOrigin: 'observations' });
    expect(f.render().record(target.id)).toBe(true); f.commit();
    expect(f.awardXP.mock.calls.map(call => call[1])).toEqual([2]);
    expect(f.state.guidedComplete).toBe(guidedComplete);
    expect(f.state._guidedCheckResult).toEqual({ specimen: 'frog', organId: target.id });
    expect(f.state._guidedCheckOnly).toBe(false);
  });

  it('allows wrong-answer retries but awards only when the matching evidence is supplied', () => {
    const f = lab({ guidedTargetIds: [target.id, distractor.id] });
    const first = f.render(); expect(first.record(distractor.id)).toBe(false); f.commit();
    expect(f.state.verifiedIdentifications).toEqual({}); expect(f.awardXP).not.toHaveBeenCalled();
    const retry = f.render(); expect(retry.token).toBe(first.token);
    expect(retry.record(target.id)).toBe(true); f.commit();
    expect(f.awardXP.mock.calls.map(call => call[1])).toEqual([2]);
    expect(f.state.guidedStep).toBe(1);
  });

  it('claims a correct response before deferred updates so rapid duplicate callbacks cannot award twice', () => {
    const f = lab(); const first = f.render();
    expect(first.record(target.id)).toBe(true);
    expect(f.state.guidedObservationPending).toBe(target.id); // React has not committed yet.
    expect(first.record(target.id)).toBe(false);
    const rerender = f.render({ procedureFeedback: { message: 'Unrelated update before commit' } });
    expect(rerender.token).toBe(first.token);
    expect(rerender.record(target.id)).toBe(false);
    expect(f.awardXP.mock.calls.map(call => call[1])).toEqual([2, 10]);
    expect(f.sound).toHaveBeenCalledTimes(1); expect(f.writes).toHaveLength(1);
  });

  it.each([
    ['layer', { activeLayer: 'muscle' }], ['specimen', { specimen: 'pig' }],
    ['target', { guidedObservationPending: distractor.id, guidedStep: 1, guidedTargetIds: [target.id, distractor.id] }],
    ['assessment', { quizMode: true }], ['practical', { practicalMode: true }], ['exit', { guidedMode: false }],
  ])('rejects an old callback after the %s changes', (_label, change) => {
    const f = lab(); const stale = f.render(); f.render(change);
    expect(stale.record(target.id)).toBe(false);
    expect(f.awardXP).not.toHaveBeenCalled(); expect(f.writes).toHaveLength(0);
  });

  it('allows a later practice round after leaving the checkpoint, without renewing rewards', () => {
    const f = lab(); const first = f.render(); expect(first.record(target.id)).toBe(true); f.commit();
    f.render(); // Completion leaves the checkpoint.
    const repeat = f.render({ guidedMode: true, guidedStep: 0, guidedTargetIds: [target.id], guidedObservationPending: target.id });
    expect(repeat.token).not.toBe(first.token);
    expect(first.record(target.id)).toBe(false); expect(repeat.record(target.id)).toBe(true); f.commit();
    expect(f.awardXP.mock.calls.map(call => call[1])).toEqual([2, 10]);
    expect(f.state.guidedObservationFeedback.message).toContain('Practice confirmed');
  });

  it('isolates checkpoint claims between simultaneous mounted labs', () => {
    const f = lab(); const first = f.render({}, 'lab-a'), second = f.render({}, 'lab-b');
    expect(first.token).not.toBe(second.token);
    expect(first.record(target.id)).toBe(true); expect(second.record(target.id)).toBe(true);
    expect(f.awardXP.mock.calls.map(call => call[1])).toEqual([2, 10, 2, 10]);
  });

  it('scopes verification credit by specimen and still credits a new target after a completed round', () => {
    const f = lab({ guidedComplete: true, verifiedIdentifications: { 'pig|dorsal_skin': originalVerification } });
    expect(f.render().record(target.id)).toBe(true); f.commit();
    expect(f.awardXP.mock.calls.map(call => call[1])).toEqual([2]);
    expect(f.state.verifiedIdentifications['pig|dorsal_skin']).toBe(originalVerification);
    expect(f.state.verifiedIdentifications['frog|dorsal_skin'].status).toBe('verified');
  });
});
