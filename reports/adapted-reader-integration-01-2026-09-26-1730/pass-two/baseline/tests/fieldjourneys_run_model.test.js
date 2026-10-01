// Field Journeys run model (2026-09-21).
//
// This was the only STEM tool with no functional test coverage. Its core is a
// command-sourced run: a seed plus an ordered list of action ids, replayed
// through an adapter to rebuild the model. Everything a learner does goes
// through that, and their journal saves depend on it replaying identically.
//
// The properties worth pinning are the ones a learner loses work over:
//   · a saved run replays to the same state it was left in
//   · a stale decision (double-click, second tab) cannot be applied twice
//   · a corrupted or foreign save is refused rather than half-loaded
//
// Reached through the production-inert window.__RR_TEST_EXPORTS__ hook, the
// same convention flightSim/roadReady/beehive/butterfly use.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let FJ;
let adapter;

// A minimal adapter over the tool's own watershed runtime. createWatershedRuntime
// stubs its own dependencies, so this needs no Tree Life Lab engine — the same
// reason the export hook exposes it directly.
function makeWatershedAdapter(water) {
  const actions = (model) => {
    if (model.phase === 'debrief') return [];
    if (model.phase === 'review') return [{ id: 'continue', label: 'Continue' }];
    return water.techniques
      .filter((t) => t.id !== 'rest')
      .flatMap((tech) => {
        const targets = tech.appliesTo === 'any' ? [null] : tech.appliesTo;
        return targets.map((target) => ({ id: 'tech:' + tech.id + ':' + (target || 'all'), label: tech.name }));
      })
      .concat([{ id: 'end-year', label: 'End the year' }]);
  };
  return {
    id: 'watershed',
    start: (seed, config) => water.start({ seed, difficulty: (config && config.difficulty) || 'steady' }),
    config: (model) => ({ difficulty: model.difficulty }),
    actions,
    step(model, id) {
      if (!actions(model).some((a) => a.id === id && !a.disabled)) throw new Error('Unavailable watershed action.');
      if (id === 'end-year') return water.endYear(model);
      if (id === 'continue') return water.continue(model);
      const [, tech, target] = id.split(':');
      return water.apply(model, tech, target === 'all' ? null : target);
    },
  };
}

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool('stem_lab/stem_tool_fieldjourneys.js', 'fieldJourneys');
  FJ = window.__RR_TEST_EXPORTS__.fieldJourneys;
  expect(FJ, 'the test-export hook should be present').toBeTruthy();
  adapter = makeWatershedAdapter(FJ.createWatershedRuntime());
});

const newRun = (over) => FJ.makeRun(adapter, { seed: 'FIELD-01', runId: 'test-run-1', ...over });
const firstAction = (run) => adapter.actions(FJ.materialize(adapter, run))[0].id;

describe('starting a run', () => {
  it('records the seed and campaign, and starts with no decisions', () => {
    const run = newRun();
    expect(run.campaignId).toBe('watershed');
    expect(run.seed).toBe('FIELD-01');
    expect(run.commands).toEqual([]);
    expect(run.version).toBe(1);
  });

  it('refuses a seed a learner could not have meant', () => {
    // The seed is typed by hand and drives world generation, so it is input.
    for (const seed of ['', '   ', 'x'.repeat(33)]) {
      expect(() => newRun({ seed }), JSON.stringify(seed)).toThrow(/world seed/i);
    }
    expect(() => newRun({ seed: 42 })).toThrow(/world seed/i);
  });

  it('refuses a run id that is not a plain token', () => {
    // A run id becomes part of the storage key, so a path-like value there is
    // the kind of thing that escapes its own record.
    for (const runId of ['../other', 'has space', 'x'.repeat(65)]) {
      expect(() => newRun({ runId }), runId).toThrow(/run ID/i);
    }
  });
});

describe('replaying a run', () => {
  it('rebuilds the same state from the same seed and commands', () => {
    // This is the whole contract: nothing but seed + commands is stored, so if
    // replay drifted, a learner would reopen their journal to a different world.
    const run = newRun();
    const advanced = FJ.dispatch(adapter, run, firstAction(run));

    const first = FJ.materialize(adapter, advanced);
    const second = FJ.materialize(adapter, advanced);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('a run saved and reloaded lands on the state it was left in', () => {
    const run = newRun();
    const advanced = FJ.dispatch(adapter, run, firstAction(run));
    const reloaded = FJ.validateRun(adapter, JSON.parse(JSON.stringify(advanced)));

    expect(reloaded.commands).toEqual(advanced.commands);
    expect(JSON.stringify(FJ.materialize(adapter, reloaded)))
      .toBe(JSON.stringify(FJ.materialize(adapter, advanced)));
  });

  it('refuses a save from a different campaign instead of replaying it', () => {
    const run = newRun();
    const foreign = { ...run, campaignId: 'grove' };
    expect(() => FJ.materialize(adapter, foreign)).toThrow(/different campaign/i);
  });

  it('refuses a save whose commands no longer make sense', () => {
    // An action id that was never valid means the save is from another build or
    // was edited; replaying it part-way would silently drop decisions.
    const run = newRun();
    const tampered = { ...run, commands: ['tech:not-a-real-technique:all'] };
    expect(() => FJ.materialize(adapter, tampered)).toThrow(/no longer valid/i);
  });
});

describe('dispatching a decision', () => {
  it('appends the decision and leaves the original run untouched', () => {
    const run = newRun();
    const id = firstAction(run);
    const next = FJ.dispatch(adapter, run, id);

    expect(next.commands).toEqual([id]);
    // The caller keeps the old run; mutating it in place would corrupt undo.
    expect(run.commands).toEqual([]);
  });

  it('rejects a decision made against a stale view of the run', () => {
    // Double-click, or a second tab on the same journal: both send a decision
    // computed from an earlier revision. Applying it would record a choice the
    // learner made about a situation that no longer exists.
    const run = newRun();
    const id = firstAction(run);
    const advanced = FJ.dispatch(adapter, run, id);

    expect(() => FJ.dispatch(adapter, advanced, firstAction(advanced), 0))
      .toThrow(/already been handled/i);
  });

  it('rejects an action that is not available in the current situation', () => {
    const run = newRun();
    expect(() => FJ.dispatch(adapter, run, 'tech:not-a-real-technique:all'))
      .toThrow(/unavailable/i);
  });

  it('stops at the decision limit rather than growing without bound', () => {
    // MAX_COMMANDS guards the save size; a run that blew past it would fail to
    // store and the learner would lose the session.
    const run = newRun();
    const full = { ...run, commands: new Array(FJ.MAX_COMMANDS).fill('tech:placeholder:all') };
    expect(() => FJ.dispatch(adapter, full, 'end-year', full.commands.length))
      .toThrow(/decision limit/i);
  });
});

describe('validating a save before trusting it', () => {
  const valid = () => JSON.parse(JSON.stringify(newRun()));

  it('accepts a well-formed save', () => {
    expect(() => FJ.validateRun(adapter, valid())).not.toThrow();
  });

  it('refuses saves that are not this campaign or not a known version', () => {
    expect(() => FJ.validateRun(adapter, null)).toThrow();
    expect(() => FJ.validateRun(adapter, { ...valid(), version: 99 })).toThrow();
    expect(() => FJ.validateRun(adapter, { ...valid(), campaignId: 'grove' })).toThrow();
  });

  it('refuses a save whose seed or run id was tampered with', () => {
    expect(() => FJ.validateRun(adapter, { ...valid(), seed: '' })).toThrow(/seed/i);
    expect(() => FJ.validateRun(adapter, { ...valid(), seed: 'x'.repeat(33) })).toThrow(/seed/i);
    expect(() => FJ.validateRun(adapter, { ...valid(), runId: '../escape' })).toThrow();
  });
});

describe('journal responses stay bound to the decision they describe', () => {
  // A written response is not free-floating text: it carries the revision and
  // the action id of the decision it was written about. That is what lets the
  // journal show "you wrote this when you chose that" after a replay — so the
  // binding is the thing worth pinning.
  const commands = ['tech:buffer:all', 'end-year'];
  const entry = (over) => ({ revision: 1, actionId: 'tech:buffer:all', text: 'The stream ran clearer after the buffer strip.', ...over });

  it('keeps a response that matches its decision', () => {
    const [kept] = FJ.validateResponses([entry()], commands);
    expect(kept.text).toContain('buffer strip');
    expect(kept.revision).toBe(1);
    expect(kept.actionId).toBe('tech:buffer:all');
  });

  it('refuses a response pinned to a decision the learner did not make', () => {
    // Otherwise an edited save could attach a reflection to the wrong choice,
    // and the journal would misreport what the learner did.
    expect(() => FJ.validateResponses([entry({ actionId: 'end-year' })], commands))
      .toThrow(/does not match/i);
    expect(() => FJ.validateResponses([entry({ revision: 5 })], commands))
      .toThrow(/does not match/i);
  });

  it('refuses out-of-order or duplicated revisions', () => {
    const second = entry({ revision: 2, actionId: 'end-year', text: 'Ended the year early.' });
    expect(() => FJ.validateResponses([second, entry()], commands)).toThrow();
    expect(() => FJ.validateResponses([entry(), entry()], commands)).toThrow();
  });

  it('refuses blank or oversized text rather than storing it', () => {
    expect(() => FJ.validateResponses([entry({ text: '   ' })], commands)).toThrow(/1 to 1,200/);
    expect(() => FJ.validateResponses([entry({ text: 'x'.repeat(1201) })], commands)).toThrow(/1 to 1,200/);
    expect(() => FJ.validateResponses([entry({ text: 42 })], commands)).toThrow(/1 to 1,200/);
  });

  it('refuses a responses field that is not a list', () => {
    // Saves are input; a hand-edited file must be rejected, not half-read.
    for (const raw of [null, {}, 'text', new Array(101).fill(entry())]) {
      expect(() => FJ.validateResponses(raw, commands), JSON.stringify(raw)?.slice(0, 30)).toThrow();
    }
    expect(FJ.validateResponses([], commands)).toEqual([]);
  });
});
