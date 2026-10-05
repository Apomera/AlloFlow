import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Exercise the shipped review and checkpoint model. A learner's saved plan
// belongs to one scenario and airport, while completion evidence can outlive
// the bounded debrief history without inventing a full review to reopen.
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_atctower.js'), 'utf8');
const pureSource = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── CALLSIGNS ──'));
const model = new Function(pureSource + '\nreturn { AIRPORTS, createPracticeShift, recordPracticeOutcome, recordAtcShift, atcShiftHistory, atcReviewNote, atcPreviousReflection, atcPracticePathway, serializeAtcShift, restoreAtcShift };')();

function note(overrides = {}) {
  return { sourceShiftId: 'atc-review-source', practiceId: 'first_landing', airportId: 'simple',
    text: 'Assign the runway before clearing the approach.', ...overrides };
}

function exercise(id, shiftId, outcome = 'partial') {
  const game = model.createPracticeShift(id, shiftId);
  if (outcome === 'complete') {
    if (id === 'separation_recovery') {
      game.time = 6;
      game.aircraft[0].altitude = game.aircraft[1].altitude + 1000;
    } else {
      const order = id === 'arrival_sequence' ? [102, 101] : id === 'crossing_priority' ? [101, 102] : [101];
      for (const id of order) {
        const ac = game.aircraft.find(item => item.id === id);
        model.recordPracticeOutcome(game, 'landing', ac);
        ac.state = 'landed';
        game.landed++;
      }
    }
  } else if (outcome === 'failed') game.conflictEpisodes = 1;
  return game;
}

function summary(id, shiftId, outcome = 'partial') {
  return model.recordAtcShift({}, exercise(id, shiftId, outcome), 1000).lastShift;
}

function ordinary(shiftId, airportId = 'simple', mode = 'guided') {
  const game = exercise('first_landing', shiftId);
  game.practice = null;
  game.trainingMode = mode;
  game.airport = model.AIRPORTS.find(item => item.id === airportId);
  return model.recordAtcShift({}, game, 1000).lastShift;
}

function commit(data, game, time = 1000) {
  return { ...data, ...model.recordAtcShift(data, game, time) };
}

describe('ATC contextual review note validation', () => {
  it('returns a normalized independent copy with only the persisted note fields', () => {
    const input = note({ extra: { ignored: true } });
    const before = structuredClone(input);
    const result = model.atcReviewNote(input, 'first_landing', 'simple');
    expect(result).toEqual(note());
    expect(result).not.toBe(input);
    expect(input).toEqual(before);
  });

  it('rejects malformed identities and nontext or blank reflections', () => {
    for (const sourceShiftId of ['', '<invalid>', 'has space', 'a'.repeat(81), 123, null]) {
      expect(model.atcReviewNote(note({ sourceShiftId }), 'first_landing', 'simple')).toBeNull();
    }
    for (const text of ['', ' \t\n ', null, undefined, 123, {}, ['Plan']]) {
      expect(model.atcReviewNote(note({ text }), 'first_landing', 'simple')).toBeNull();
    }
    for (const input of [null, undefined, {}, [], 'Plan']) {
      expect(model.atcReviewNote(input, 'first_landing', 'simple')).toBeNull();
    }
  });

  it('isolates plans by scenario and airport and preserves ordinary-shift null context', () => {
    expect(model.atcReviewNote(note(), 'arrival_sequence', 'simple')).toBeNull();
    expect(model.atcReviewNote(note(), 'first_landing', 'parallel')).toBeNull();
    expect(model.atcReviewNote(note(), null, 'simple')).toBeNull();
    expect(model.atcReviewNote(note({ airportId: 'unknown' }), 'first_landing', 'unknown')).toBeNull();
    const plain = note({ practiceId: null });
    expect(model.atcReviewNote(plain, null, 'simple')).toEqual(plain);
    expect(model.atcReviewNote(plain, 'first_landing', 'simple')).toBeNull();
    expect(model.atcReviewNote(note({ practiceId: undefined }), null, 'simple')).toBeNull();
  });

  it('bounds saved text to 2,000 characters without modifying the original', () => {
    const input = note({ sourceShiftId: 'a'.repeat(80), text: 'P'.repeat(3000) });
    const result = model.atcReviewNote(input, 'first_landing', 'simple');
    expect(result.sourceShiftId).toHaveLength(80);
    expect(result.text).toBe('P'.repeat(2000));
    expect(input.text).toHaveLength(3000);
  });
});

describe('ATC latest applicable reflection', () => {
  it('reads the latest matching attempt while skipping other scenarios and airports', () => {
    const matching = summary('first_landing', 'atc-review-matching');
    const data = {
      shiftHistory: [summary('arrival_sequence', 'atc-review-other-skill'), ordinary('atc-review-other-airport', 'parallel'), matching],
      shiftReflections: { 'atc-review-other-skill': 'Hold the closer aircraft.',
        'atc-review-other-airport': 'Protect parallel runways.', 'atc-review-matching': 'Assign runway 27 first.' }
    };
    expect(model.atcPreviousReflection(data, 'first_landing', 'simple')).toEqual(note({
      sourceShiftId: matching.shiftId, text: 'Assign runway 27 first.'
    }));
    expect(model.atcPreviousReflection(data, 'first_landing', 'parallel')).toBeNull();
  });

  it('does not reuse an older plan when the latest matching reflection is absent or blank', () => {
    const recent = summary('first_landing', 'atc-review-latest');
    const older = summary('first_landing', 'atc-review-older');
    for (const latest of [undefined, '', '   ', null, 123, {}]) {
      const data = { shiftHistory: [recent, older], shiftReflections: {
        [recent.shiftId]: latest, [older.shiftId]: 'This older plan should not return.'
      } };
      expect(model.atcPreviousReflection(data, 'first_landing', 'simple')).toBeNull();
    }
  });

  it('stops at a latest matching attempt even when its objective result is missing', () => {
    const recent = summary('first_landing', 'atc-review-latest-no-result');
    const older = summary('first_landing', 'atc-review-older-with-result');
    for (const exerciseResult of [undefined, null]) {
      const data = { shiftHistory: [{ ...recent, exerciseResult }, older], shiftReflections: {
        [older.shiftId]: 'An older plan must not become the latest attempt plan.'
      } };
      expect(model.atcPreviousReflection(data, 'first_landing', 'simple')).toBeNull();
      data.shiftReflections[recent.shiftId] = 'A plan from this latest attempt.';
      expect(model.atcPreviousReflection(data, 'first_landing', 'simple')).toMatchObject({
        sourceShiftId: recent.shiftId, text: 'A plan from this latest attempt.'
      });
    }
  });

  it('keeps ordinary airport plans separate from fixed practice and works across teaching modes', () => {
    const practice = summary('first_landing', 'atc-review-practice-newer');
    const plain = ordinary('atc-review-standard', 'simple', 'standard');
    const data = { shiftHistory: [practice, ordinary('atc-review-parallel', 'parallel'), plain], shiftReflections: {
      [practice.shiftId]: 'Practice plan', [plain.shiftId]: 'Allow more time between arrivals.'
    } };
    expect(model.atcPreviousReflection(data, null, 'simple')).toEqual(note({
      sourceShiftId: plain.shiftId, practiceId: null, text: 'Allow more time between arrivals.'
    }));
    const newerGuided = ordinary('atc-review-guided', 'simple', 'guided');
    data.shiftHistory.unshift(newerGuided);
    data.shiftReflections[newerGuided.shiftId] = 'New guided plan.';
    expect(model.atcPreviousReflection(data, null, 'simple')).toMatchObject({ sourceShiftId: newerGuided.shiftId, text: 'New guided plan.' });
  });

  it('does not recover plans from outside the eight retained debrief records', () => {
    const old = summary('first_landing', 'atc-review-evicted');
    const data = { shiftHistory: Array.from({ length: 8 }, (_, i) => summary('arrival_sequence', 'atc-review-recent-' + i)).concat(old),
      shiftReflections: { [old.shiftId]: 'This reflection has no retained attempt.' } };
    expect(model.atcShiftHistory(data.shiftHistory)).toHaveLength(8);
    expect(model.atcPreviousReflection(data, 'first_landing', 'simple')).toBeNull();
  });

  it('normalizes retained identities and text without changing history or reflection storage', () => {
    const valid = summary('first_landing', 'atc-review-valid');
    const data = { shiftHistory: [{ ...valid, shiftId: '<invalid>' }, valid],
      shiftReflections: { '<invalid>': 'Invalid identity plan.', [valid.shiftId]: 'P'.repeat(3000) } };
    const before = structuredClone(data);
    expect(model.atcPreviousReflection(data, 'first_landing', 'simple')).toEqual(note({ sourceShiftId: valid.shiftId, text: 'P'.repeat(2000) }));
    expect(data).toEqual(before);
    for (const empty of [undefined, null, {}, { shiftHistory: {} }, { shiftHistory: [valid], shiftReflections: null }]) {
      expect(model.atcPreviousReflection(empty, 'first_landing', 'simple')).toBeNull();
    }
  });
});

describe('ATC pathway review availability', () => {
  it('exposes the latest validated result, retained debrief, and nonblank note availability', () => {
    const game = exercise('first_landing', 'atc-review-pathway', 'complete');
    const data = commit({}, game);
    data.shiftReflections = { [game.shiftId]: 'Clear the assigned approach.' };
    const before = structuredClone(data);
    const entry = model.atcPracticePathway(data).entries[0];
    expect(entry.lastResult).toEqual(data.lastShift.exerciseResult);
    expect(entry.lastShift).toEqual(model.atcShiftHistory(data.shiftHistory)[0]);
    expect(entry.hasReflection).toBe(true);
    expect(data).toEqual(before);
    for (const text of ['', ' \n ', null, 123]) {
      expect(model.atcPracticePathway({ ...data, shiftReflections: { [game.shiftId]: text } }).entries[0].hasReflection).toBe(false);
    }
  });

  it('keeps earned completion while making the latest failed retry reviewable', () => {
    let data = commit({}, exercise('first_landing', 'atc-review-completed', 'complete'));
    data = commit(data, exercise('first_landing', 'atc-review-failed', 'failed'), 2000);
    const entry = model.atcPracticePathway(data).entries[0];
    expect(entry.complete).toBe(true);
    expect(entry.lastResult).toMatchObject({ id: 'first_landing', complete: false, failed: true });
    expect(entry.lastShift.shiftId).toBe('atc-review-failed');
    expect(entry.hasReflection).toBe(false);
  });

  it('retains durable outcome after eviction without offering a nonexistent full debrief', () => {
    const game = exercise('first_landing', 'atc-review-old-achievement', 'complete');
    let data = commit({}, game);
    data.shiftReflections = { [game.shiftId]: 'An old saved note.' };
    for (let i = 0; i < 10; i++) data = commit(data, exercise('arrival_sequence', 'atc-review-later-' + i), 2000 + i);
    data = JSON.parse(JSON.stringify(data));
    const entry = model.atcPracticePathway(data).entries[0];
    expect(entry.complete).toBe(true);
    expect(entry.lastResult).toMatchObject({ id: 'first_landing', complete: true });
    expect(entry.lastShift).toBeNull();
    expect(entry.hasReflection).toBe(false);
  });

  it('requires full-review identity, airport, practice, and result to agree with the durable record', () => {
    const game = exercise('first_landing', 'atc-review-exact-match', 'complete');
    const valid = commit({}, game);
    const retained = valid.lastShift;
    for (const mismatched of [
      { ...retained, shiftId: 'atc-review-different-attempt' },
      { ...retained, airportId: 'parallel' },
      { ...retained, practice: null },
      { ...retained, practice: { ...retained.practice, id: 'arrival_sequence' } },
      { ...retained, exerciseResult: { ...retained.exerciseResult, id: 'arrival_sequence' } },
      { ...retained, exerciseResult: null }
    ]) {
      const entry = model.atcPracticePathway({ ...valid, shiftHistory: [mismatched], shiftReflections: {
        [retained.shiftId]: 'Do not attach this note to mismatched evidence.'
      } }).entries[0];
      expect(entry.lastResult).toMatchObject({ id: 'first_landing', complete: true });
      expect(entry.lastShift).toBeNull();
      expect(entry.hasReflection).toBe(false);
    }
  });

  it('does not fall back to an older retained review when the latest recorded attempt is unavailable', () => {
    let data = commit({}, exercise('first_landing', 'atc-review-older-retained', 'complete'));
    data = commit(data, exercise('first_landing', 'atc-review-latest-unavailable', 'failed'), 2000);
    data.shiftHistory = data.shiftHistory.slice(1);
    const entry = model.atcPracticePathway(data).entries[0];
    expect(entry.lastResult.failed).toBe(true);
    expect(entry.lastShift).toBeNull();
    expect(entry.hasReflection).toBe(false);
  });
});

describe('ATC review-note checkpoint continuity', () => {
  it('round-trips an active practice plan and dismissal through JSON storage', () => {
    const game = exercise('first_landing', 'atc-review-new-attempt');
    game.reviewNote = note();
    game.reviewNoteDismissed = true;
    const before = structuredClone(game);
    const saved = model.serializeAtcShift(game, 123456);
    const restored = model.restoreAtcShift(JSON.parse(JSON.stringify(saved)));
    expect(saved.reviewNote).toEqual(note());
    expect(saved.reviewNoteDismissed).toBe(true);
    expect(restored.reviewNote).toEqual(note());
    expect(restored.reviewNote).not.toBe(game.reviewNote);
    expect(restored.reviewNoteDismissed).toBe(true);
    expect(restored.paused).toBe(true);
    expect(game).toEqual(before);
  });

  it('keeps an ordinary airport plan separate and accepts legacy checkpoints without a plan', () => {
    const game = exercise('first_landing', 'atc-review-ordinary-live');
    game.practice = null;
    game.reviewNote = note({ practiceId: null });
    game.reviewNoteDismissed = false;
    const saved = model.serializeAtcShift(game);
    expect(model.restoreAtcShift(JSON.parse(JSON.stringify(saved)))).toMatchObject({
      practice: null, reviewNote: note({ practiceId: null }), reviewNoteDismissed: false
    });
    delete saved.reviewNote;
    delete saved.reviewNoteDismissed;
    expect(model.restoreAtcShift(saved)).toMatchObject({ reviewNote: null, reviewNoteDismissed: false });
  });

  it('discards malformed or wrong-context saved notes without rejecting a valid shift', () => {
    const game = exercise('first_landing', 'atc-review-recovery-valid');
    const saved = model.serializeAtcShift(game);
    for (const invalid of [note({ sourceShiftId: '<bad>' }), note({ text: '  ' }),
      note({ practiceId: 'arrival_sequence' }), note({ practiceId: null }),
      note({ airportId: 'parallel' }), null, {}, 'Plan']) {
      const restored = model.restoreAtcShift({ ...saved, reviewNote: invalid });
      expect(restored).not.toBeNull();
      expect(restored.shiftId).toBe(game.shiftId);
      expect(restored.practice.id).toBe('first_landing');
      expect(restored.reviewNote).toBeNull();
    }
  });

  it('normalizes note bounds and accepts only a boolean dismissal flag', () => {
    const game = exercise('first_landing', 'atc-review-bounded-live');
    game.reviewNote = note({ text: 'P'.repeat(3000) });
    const saved = model.serializeAtcShift(game);
    expect(saved.reviewNote.text).toHaveLength(2000);
    for (const flag of [undefined, null, false, 'true', 1, {}]) {
      expect(model.restoreAtcShift({ ...saved, reviewNoteDismissed: flag }).reviewNoteDismissed).toBe(false);
    }
    expect(model.restoreAtcShift({ ...saved, reviewNoteDismissed: true }).reviewNoteDismissed).toBe(true);
    expect(game.reviewNote.text).toHaveLength(3000);
  });
});
