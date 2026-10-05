import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Run the shipped private model. Completion evidence comes from the measured
// exercise objectives, not fabricated scores or a duplicate helper algorithm.
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_atctower.js'), 'utf8');
const pureSource = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── CALLSIGNS ──'));
const model = new Function(pureSource + '\nreturn { ATC_PRACTICE_SCENARIOS, createPracticeShift, scenarioProgress, recordPracticeOutcome, recordAtcShift, atcPracticeLearning, atcPracticePathway, atcPracticeActionProgress };')();
const ids = ['first_landing', 'arrival_sequence', 'separation_recovery', 'crossing_priority'];

function exercise(id, shiftId, outcome = 'complete') {
  const game = model.createPracticeShift(id, shiftId);
  if (outcome === 'complete') {
    if (id === 'separation_recovery') {
      game.time = 6;
      game.aircraft[0].altitude = game.aircraft[1].altitude + 1000;
    } else {
      const order = id === 'arrival_sequence' ? [102, 101] : id === 'crossing_priority' ? [101, 102] : [101];
      for (const aircraftId of order) {
        const ac = game.aircraft.find(item => item.id === aircraftId);
        model.recordPracticeOutcome(game, 'landing', ac);
        ac.state = 'landed';
        game.landed++;
      }
    }
  } else if (outcome === 'failed') {
    game.conflictEpisodes = 1;
  }
  return game;
}

function commit(data, game, completedAt = 1000) {
  return { ...data, ...model.recordAtcShift(data, game, completedAt) };
}

describe('ATC durable practice pathway', () => {
  it('starts with four honest new exercises and recommends the first one', () => {
    const path = model.atcPracticePathway({});
    expect(path.entries.map(entry => entry.id)).toEqual(ids);
    expect(path.entries.map(entry => entry.scenario)).toEqual(model.ATC_PRACTICE_SCENARIOS);
    expect(path.entries.map(entry => entry.state)).toEqual(['new', 'new', 'new', 'new']);
    expect(path.entries.every(entry => entry.attempts === 0 && entry.complete === false)).toBe(true);
    expect(path.completedCount).toBe(0);
    expect(path.recommendedId).toBe('first_landing');
    expect(path.allCompleted).toBe(false);
  });

  it('advances recommendations only after measured objective completion', () => {
    let data = {};
    for (const [index, id] of ids.entries()) {
      const game = exercise(id, 'atc-pathway-complete-' + index);
      expect(model.scenarioProgress(game).complete).toBe(true);
      data = commit(data, game, 1000 + index);
      const path = model.atcPracticePathway(data);
      expect(path.entries[index]).toMatchObject({ id, attempts: 1, complete: true, state: 'complete' });
      expect(path.completedCount).toBe(index + 1);
      expect(path.recommendedId).toBe(ids[index + 1] || null);
      expect(path.allCompleted).toBe(index === ids.length - 1);
    }
  });

  it('records partial and failed attempts without awarding completion', () => {
    let data = commit({}, exercise('first_landing', 'atc-pathway-partial', 'partial'));
    data = commit(data, exercise('first_landing', 'atc-pathway-failed', 'failed'));
    const path = model.atcPracticePathway(data);
    expect(path.entries[0]).toMatchObject({ attempts: 2, complete: false, state: 'attempted' });
    expect(path.completedCount).toBe(0);
    expect(path.recommendedId).toBe('first_landing');
    expect(path.learning.records.first_landing.completedResult).toBeNull();
    expect(path.learning.records.first_landing.lastResult.failed).toBe(true);
    expect(path.learning.records.first_landing.lastShiftId).toBe('atc-pathway-failed');
  });

  it('retains achievement through a failed retry while showing the latest result', () => {
    let data = commit({}, exercise('first_landing', 'atc-pathway-passed'));
    data = commit(data, exercise('first_landing', 'atc-pathway-retry-failed', 'failed'));
    const path = model.atcPracticePathway(data);
    expect(path.entries[0]).toMatchObject({ attempts: 2, complete: true, state: 'complete' });
    expect(path.learning.records.first_landing.completedResult.complete).toBe(true);
    expect(path.learning.records.first_landing.lastResult.failed).toBe(true);
    expect(path.recommendedId).toBe('arrival_sequence');
  });

  it('does not count finishing the same shift twice', () => {
    const game = exercise('first_landing', 'atc-pathway-idempotent');
    const data = commit({}, game);
    const repeated = commit(data, game, 2000);
    expect(model.atcPracticePathway(repeated)).toEqual(model.atcPracticePathway(data));
    expect(repeated.practiceLearning).toEqual(data.practiceLearning);
    const next = commit(data, exercise('arrival_sequence', 'atc-pathway-next', 'partial'));
    expect(model.atcPracticePathway(commit(next, game, 3000))).toEqual(model.atcPracticePathway(next));
  });

  it('preserves completed evidence after the recent history evicts that exercise', () => {
    let data = commit({}, exercise('first_landing', 'atc-pathway-old-complete'));
    for (let i = 0; i < 10; i++) data = commit(data, exercise('arrival_sequence', 'atc-pathway-later-' + i, 'partial'), 2000 + i);
    expect(data.shiftHistory).toHaveLength(8);
    expect(data.shiftHistory.some(item => item.shiftId === 'atc-pathway-old-complete')).toBe(false);
    data = JSON.parse(JSON.stringify(data));
    const path = model.atcPracticePathway(data);
    expect(path.entries[0]).toMatchObject({ attempts: 1, complete: true });
    expect(path.entries[1]).toMatchObject({ attempts: 10, complete: false });
    expect(path.completedCount).toBe(1);
    expect(path.recommendedId).toBe('arrival_sequence');
  });

  it('hydrates a legacy history without counting its attempts again on each read', () => {
    const complete = model.recordAtcShift({}, exercise('first_landing', 'atc-legacy-complete'), 1000).lastShift;
    const partial = model.recordAtcShift({}, exercise('arrival_sequence', 'atc-legacy-partial', 'partial'), 2000).lastShift;
    const history = [partial, complete];
    const first = model.atcPracticeLearning(null, history);
    expect(first.records.first_landing.attempts).toBe(1);
    expect(first.records.first_landing.completedResult.complete).toBe(true);
    expect(first.records.arrival_sequence.attempts).toBe(1);
    expect(first.records.arrival_sequence.completedResult).toBeNull();
    const before = JSON.stringify({ first, history });
    for (let i = 0; i < 5; i++) expect(model.atcPracticeLearning(first, history)).toEqual(first);
    expect(JSON.stringify({ first, history })).toBe(before);
  });

  it('ignores high scores, plain completion flags, and missing objective evidence', () => {
    const forged = { version: 1, records: { first_landing: { attempts: 3, completed: true, complete: true,
      completedResult: { id: 'first_landing', complete: true, checks: [] }, lastResult: null } } };
    const learning = model.atcPracticeLearning(forged, []);
    expect(learning.records.first_landing.completedResult).toBeNull();
    expect(model.atcPracticePathway({ practiceLearning: forged, totalScore: 1000000, totalLanded: 1000000 }).completedCount).toBe(0);
    const claimed = exercise('first_landing', 'atc-unmet-claim', 'partial');
    claimed.practice.completed = true;
    claimed.score = 1000000;
    expect(model.atcPracticePathway(commit({}, claimed)).completedCount).toBe(0);
  });

  it('rejects unknown versions and result identities and bounds saved attempts', () => {
    const valid = model.recordAtcShift({}, exercise('first_landing', 'atc-schema-complete'), 1000).lastShift.exerciseResult;
    const wrongVersion = model.atcPracticeLearning({ version: 2, records: { first_landing: { attempts: 4, completedResult: valid } } }, []);
    expect(wrongVersion.records.first_landing.attempts).toBe(0);
    expect(wrongVersion.records.first_landing.completedResult).toBeNull();
    const input = { version: 1, records: {
      first_landing: { attempts: -2, completedResult: { ...valid, id: 'arrival_sequence' }, lastResult: valid, lastShiftId: '<invalid>' },
      arrival_sequence: { attempts: Infinity },
      separation_recovery: { attempts: 10000000 },
      crossing_priority: { attempts: 2.9 },
      unknown: { attempts: 100, completedResult: valid },
    } };
    const learning = model.atcPracticeLearning(input, []);
    expect(Object.keys(learning.records)).toEqual(ids);
    expect(learning.records.first_landing).toMatchObject({ attempts: 0, completedResult: null, lastShiftId: null });
    expect(learning.records.arrival_sequence.attempts).toBe(0);
    expect(learning.records.separation_recovery.attempts).toBe(100000);
    expect(learning.records.crossing_priority.attempts).toBe(2);
  });

  it('does not count ordinary guided or standard shifts as fixed exercises', () => {
    const base = commit({}, exercise('first_landing', 'atc-prior-achievement'));
    for (const mode of ['guided', 'standard']) {
      const game = exercise('crossing_priority', 'atc-ordinary-' + mode);
      game.practice = null;
      game.trainingMode = mode;
      const after = commit(base, game);
      expect(model.atcPracticePathway(after)).toEqual(model.atcPracticePathway(base));
    }
  });
});

describe('ATC purposeful action progress', () => {
  it('starts landing objectives at zero despite already satisfied safety checks', () => {
    for (const id of ['first_landing', 'arrival_sequence', 'crossing_priority']) {
      const game = exercise(id, 'atc-progress-start-' + id, 'partial');
      const progress = model.scenarioProgress(game);
      expect(progress.checks.some(check => check.done)).toBe(true);
      expect(model.atcPracticeActionProgress(progress, game.practice)).toMatchObject({ value: 0, max: id === 'first_landing' ? 1 : 2, percent: 0, unit: 'landings' });
    }
  });

  it('counts distinct exercise landings, ignoring duplicate and foreign IDs', () => {
    const game = exercise('arrival_sequence', 'atc-progress-landings', 'partial');
    game.practice.landedIds = [102, 102, 999];
    expect(model.atcPracticeActionProgress(model.scenarioProgress(game), game.practice)).toMatchObject({ value: 1, max: 2, percent: 50, unit: 'landings' });
    game.practice.landedIds.push(101);
    expect(model.atcPracticeActionProgress(model.scenarioProgress(game), game.practice)).toMatchObject({ value: 2, max: 2, percent: 100 });
  });

  it('measures vertical separation and observation time without counting guardrails', () => {
    const game = exercise('separation_recovery', 'atc-progress-separation', 'partial');
    expect(model.atcPracticeActionProgress(model.scenarioProgress(game), game.practice)).toMatchObject({ value: 0, max: 2, percent: 0, unit: 'actions' });
    game.aircraft[0].altitude += 1000;
    expect(model.atcPracticeActionProgress(model.scenarioProgress(game), game.practice)).toMatchObject({ value: 1, max: 2, percent: 50 });
    game.time = 6;
    expect(model.atcPracticeActionProgress(model.scenarioProgress(game), game.practice)).toMatchObject({ value: 2, max: 2, percent: 100 });
  });
});
