import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Exercise coaching must use the same measured progress as the shipped model.
// Pending targets explain an intention; they do not prove actual separation.
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_atctower.js'), 'utf8');
const pureSource = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── CALLSIGNS ──'));
const model = new Function(pureSource + '\nreturn { atcPracticeDecisionState, createPracticeShift, recordPracticeOutcome, scenarioProgress };')();

function shift(id = 'separation_recovery') {
  return model.createPracticeShift(id, 'atc-practice-flow-test');
}

function decision(game) {
  return model.atcPracticeDecisionState(game);
}

function markLanded(game, id) {
  const ac = game.aircraft.find(item => item.id === id);
  model.recordPracticeOutcome(game, 'landing', ac);
  ac.state = 'landed';
}

describe('ATC practice coaching availability and evidence', () => {
  it('returns no coaching for missing, non-practice, or unsupported practice inputs', () => {
    for (const game of [null, undefined, {}, { practice: {} },
      { practice: { version: 2, id: 'first_landing' } },
      { practice: { version: 1, id: 'unknown' } }]) {
      expect(decision(game)).toBeNull();
    }
  });

  it('preserves generic arrival coaching and null separation metrics for the first landing', () => {
    expect(decision(shift('first_landing'))).toEqual({
      id: 'first_landing', kind: 'arrival', verticalFeet: null,
      pendingVerticalFeet: null, shiftSeconds: 0, nextCallsign: null
    });
  });

  it('does not treat a stored completed flag as a measured exercise result', () => {
    const game = shift();
    game.practice.completed = true;
    game.practice.completedAt = 6;
    expect(decision(game)).toMatchObject({ kind: 'vertical-plan', verticalFeet: 0 });
    expect(model.scenarioProgress(game).complete).toBe(false);
  });

  it('uses review coaching for each recorded objective failure', () => {
    const conflict = shift();
    conflict.conflictEpisodes = 1;
    const lost = shift();
    model.recordPracticeOutcome(lost, 'lost', lost.aircraft[0]);
    const wrongOrder = shift('arrival_sequence');
    markLanded(wrongOrder, 101);
    const goAround = shift('crossing_priority');
    goAround.goArounds = 1;
    for (const game of [conflict, lost, wrongOrder, goAround]) {
      expect(decision(game)).toMatchObject({ kind: 'review', verticalFeet: null,
        pendingVerticalFeet: null, nextCallsign: null });
    }
  });

  it('keeps failure precedence when altitude and time would otherwise meet the objective', () => {
    const game = shift();
    game.aircraft[0].altitude = 6000;
    game.time = 6;
    game.conflicts = 1;
    expect(decision(game)).toEqual({ id: 'separation_recovery', kind: 'review',
      verticalFeet: null, pendingVerticalFeet: null, shiftSeconds: 6, nextCallsign: null });
  });

  it('returns complete coaching after the actual first-landing outcome is recorded', () => {
    const game = shift('first_landing');
    game.time = 12;
    markLanded(game, 101);
    expect(decision(game)).toEqual({ id: 'first_landing', kind: 'complete',
      verticalFeet: null, pendingVerticalFeet: null, shiftSeconds: 12, nextCallsign: null });
  });
});

describe('ATC separation practice actual and pending spacing', () => {
  it('starts with an altitude plan because the real converging aircraft share an altitude', () => {
    expect(decision(shift())).toEqual({ id: 'separation_recovery', kind: 'vertical-plan',
      verticalFeet: 0, pendingVerticalFeet: 0, shiftSeconds: 0, nextCallsign: null });
  });

  it('describes a pending instruction without counting it as completed separation', () => {
    const game = shift();
    game.aircraft[0].targetAltitude = 6000;
    game.time = 6;
    expect(decision(game)).toMatchObject({ kind: 'vertical-pending', verticalFeet: 0,
      pendingVerticalFeet: 1000, shiftSeconds: 6 });
    expect(model.scenarioProgress(game).complete).toBe(false);
  });

  it('compares both manual targets instead of assuming that two climbs create spacing', () => {
    const game = shift();
    game.aircraft[0].targetAltitude = 6000;
    game.aircraft[1].targetAltitude = 6000;
    expect(decision(game)).toMatchObject({ kind: 'vertical-plan', verticalFeet: 0, pendingVerticalFeet: 0 });
  });

  it('uses the other aircraft actual altitude when only one target is assigned', () => {
    const game = shift();
    game.aircraft[0].altitude = 5400;
    game.aircraft[0].targetAltitude = 6200;
    expect(decision(game)).toMatchObject({ kind: 'vertical-pending', verticalFeet: 400,
      pendingVerticalFeet: 1200 });
  });

  it('requires the actual 1000-foot threshold even after six shift seconds', () => {
    const game = shift();
    game.aircraft[0].altitude = 5999.9;
    game.aircraft[0].targetAltitude = 6000;
    game.time = 6;
    expect(decision(game)).toMatchObject({ kind: 'vertical-pending', pendingVerticalFeet: 1000 });
    expect(decision(game).verticalFeet).toBeCloseTo(999.9);
    expect(model.scenarioProgress(game).complete).toBe(false);
  });

  it('keeps watching actual separation until the full six seconds have elapsed', () => {
    const game = shift();
    game.aircraft[0].altitude = 6000;
    game.time = 5.999;
    expect(decision(game)).toMatchObject({ kind: 'vertical-watch', verticalFeet: 1000,
      pendingVerticalFeet: 1000, shiftSeconds: 5.999 });
  });

  it('returns complete only when actual spacing and elapsed time both meet the objective', () => {
    const game = shift();
    game.aircraft[1].altitude = 4000;
    game.time = 6;
    expect(decision(game)).toEqual({ id: 'separation_recovery', kind: 'complete',
      verticalFeet: null, pendingVerticalFeet: null, shiftSeconds: 6, nextCallsign: null });
  });

  it('does not claim a manual final spacing when either aircraft is on automatic approach', () => {
    for (const index of [0, 1]) {
      const game = shift();
      game.aircraft[0].targetAltitude = 6000;
      game.aircraft[index].state = 'approach';
      expect(decision(game)).toMatchObject({ kind: 'vertical-plan', verticalFeet: 0,
        pendingVerticalFeet: null });
    }
  });

  it('rejects malformed manual targets without inventing their final spacing', () => {
    for (const target of [NaN, Infinity, -1, '6000']) {
      const game = shift();
      game.aircraft[0].targetAltitude = target;
      expect(decision(game)).toMatchObject({ kind: 'vertical-plan', verticalFeet: 0,
        pendingVerticalFeet: null });
    }
  });

  it('returns unavailable for missing or retired canonical aircraft even when extra traffic exists', () => {
    for (const state of ['landed', 'departed', 'crashed']) {
      const game = shift();
      game.aircraft[0].state = state;
      game.aircraft.push({ ...game.aircraft[1], id: 999, altitude: 7000 });
      expect(decision(game)).toMatchObject({ kind: 'unavailable', verticalFeet: null,
        pendingVerticalFeet: null });
    }
    const missing = shift();
    missing.aircraft = missing.aircraft.slice(1);
    expect(decision(missing).kind).toBe('unavailable');
  });

  it('rejects malformed actual altitudes before they can become completion evidence', () => {
    for (const altitude of [undefined, NaN, Infinity, -1, '7000']) {
      const game = shift();
      game.aircraft[0].altitude = altitude;
      game.time = 6;
      expect(decision(game)).toMatchObject({ kind: 'unavailable', verticalFeet: null,
        pendingVerticalFeet: null });
    }
  });

  it('normalizes unusable elapsed time to zero and does not mark actual spacing complete', () => {
    for (const time of [undefined, NaN, Infinity, -1, '6']) {
      const game = shift();
      game.aircraft[0].altitude = 6000;
      game.time = time;
      expect(decision(game)).toMatchObject({ kind: 'vertical-watch', verticalFeet: 1000,
        shiftSeconds: 0 });
    }
  });
});

describe('ATC sequence coaching follows the expected next arrival', () => {
  it('identifies FAST102 when the initially selected aircraft is NEAR101', () => {
    expect(decision(shift('arrival_sequence'))).toEqual({ id: 'arrival_sequence',
      kind: 'sequence-wait', verticalFeet: null, pendingVerticalFeet: null,
      shiftSeconds: 0, nextCallsign: 'FAST102' });
  });

  it('uses first-arrival coaching only when the required first aircraft is selected', () => {
    const game = shift('arrival_sequence');
    game.selected = 102;
    expect(decision(game)).toMatchObject({ kind: 'sequence-first', nextCallsign: 'FAST102' });
    const priority = shift('crossing_priority');
    expect(decision(priority)).toMatchObject({ kind: 'sequence-first', nextCallsign: 'MED101' });
    priority.selected = 102;
    expect(decision(priority)).toMatchObject({ kind: 'sequence-wait', nextCallsign: 'MED101' });
  });

  it('advances to the second active aircraft after each expected first landing', () => {
    for (const [id, first, second, callsign] of [
      ['arrival_sequence', 102, 101, 'NEAR101'],
      ['crossing_priority', 101, 102, 'ROUT102']
    ]) {
      const game = shift(id);
      markLanded(game, first);
      game.selected = first;
      expect(decision(game)).toMatchObject({ kind: 'sequence-wait', nextCallsign: callsign });
      game.selected = second;
      expect(decision(game)).toMatchObject({ kind: 'sequence-next', nextCallsign: callsign });
    }
  });

  it('returns unavailable when the expected next aircraft is absent or retired', () => {
    for (const id of ['arrival_sequence', 'crossing_priority']) {
      const game = shift(id);
      const expectedId = id === 'arrival_sequence' ? 102 : 101;
      game.aircraft.find(ac => ac.id === expectedId).state = 'departed';
      expect(decision(game)).toMatchObject({ kind: 'unavailable', nextCallsign: null });
      game.aircraft = game.aircraft.filter(ac => ac.id !== expectedId);
      expect(decision(game)).toMatchObject({ kind: 'unavailable', nextCallsign: null });
    }
  });

  it('reports completion after the expected sequence rather than looking for retired aircraft', () => {
    for (const [id, order] of [['arrival_sequence', [102, 101]], ['crossing_priority', [101, 102]]]) {
      const game = shift(id);
      order.forEach(acId => markLanded(game, acId));
      expect(decision(game)).toMatchObject({ kind: 'complete', nextCallsign: null,
        verticalFeet: null, pendingVerticalFeet: null });
    }
  });

  it('leaves practice outcomes, aircraft targets, and shift state unchanged while coaching', () => {
    const separation = shift();
    separation.aircraft[0].targetAltitude = 6000;
    const sequence = shift('crossing_priority');
    markLanded(sequence, 101);
    const snapshots = [separation, sequence].map(game => structuredClone(game));
    [separation, sequence].forEach(game => decision(game));
    expect(separation).toEqual(snapshots[0]);
    expect(sequence).toEqual(snapshots[1]);
  });
});
