import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const PETS = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_pets.js'), 'utf8');

function between(startMarker, endMarker) {
  return sliceBetween(PETS, startMarker, endMarker, { file: 'stem_lab/stem_tool_pets.js' });
}

function goalTable() {
  const source = between('var PUNNETT_GOALS = [', '\n  // ─────');
  return vm.runInNewContext(`(function () { ${source}; return PUNNETT_GOALS; })()`);
}

function api() {
  const source = between('function normalizeGeneGoals(raw) {', 'function normalizeServiceCalls(');
  return vm.runInNewContext(
    `(function () { ${source}; return { normalizeGeneGoals, geneGoalsState }; })()`,
    { PUNNETT_GOALS: goalTable() },
  );
}

// The SHIPPED genetics model, lifted out of the tool so the goals are checked
// against the same maths the student sees rather than a reimplementation.
function geneticsModel() {
  const gametes = between('function gametes(geno) {', '// Phenotype from offspring');
  const phenotype = between('function phenotype(b1, b2, e1, e2) {', 'function renderLabPortrait(');
  return vm.runInNewContext(
    `(function () { ${gametes}; ${phenotype}; return { gametes, phenotype }; })()`,
  );
}

const GOALS = goalTable();
const API = api();
const MODEL = geneticsModel();

const OPTIONS = ['BBEE', 'BBEe', 'BbEE', 'BbEe', 'bbEE', 'bbEe', 'BBee', 'Bbee', 'bbee'];

function crossCounts(p1, p2) {
  const g1 = MODEL.gametes(p1);
  const g2 = MODEL.gametes(p2);
  const counts = { Black: 0, Chocolate: 0, Yellow: 0 };
  for (const a of g1) {
    for (const b of g2) {
      counts[MODEL.phenotype(a[0], b[0], a[1], b[1]).color] += 1;
    }
  }
  return counts;
}
const phenotypeOf = (geno) => MODEL.phenotype(geno[0], geno[1], geno[2], geno[3]).color;

// Every pairing the dropdowns allow, evaluated once.
const ALL_CROSSES = [];
for (const p1 of OPTIONS) {
  for (const p2 of OPTIONS) {
    ALL_CROSSES.push({ p1, p2, counts: crossCounts(p1, p2) });
  }
}

describe('Pets Punnett goals — the challenges', () => {
  it('asks, hints and explains for every goal', () => {
    expect(GOALS.length).toBeGreaterThanOrEqual(3);
    const ids = GOALS.map((g) => g.id);
    expect(new Set(ids).size, 'duplicate goal ids').toBe(ids.length);
    for (const goal of GOALS) {
      expect(goal.title.length, goal.id + ' title').toBeGreaterThan(10);
      expect(goal.ask.length, goal.id + ' ask').toBeGreaterThan(50);
      // A hint should point at the reasoning, not give the answer away.
      expect(goal.hint.length, goal.id + ' hint').toBeGreaterThan(50);
      expect(goal.why.length, goal.id + ' why').toBeGreaterThan(150);
      expect(typeof goal.check, goal.id + ' check').toBe('function');
      expect(typeof goal.solutions, goal.id + ' solutions').toBe('number');
    }
  });

  // The property that matters: a goal nobody can satisfy is a dead end that
  // silently blocks module completion.
  it('every goal is satisfiable by some cross the dropdowns allow', () => {
    for (const goal of GOALS) {
      const hits = ALL_CROSSES.filter((c) => goal.check(c.p1, c.p2, c.counts, phenotypeOf));
      expect(hits.length, goal.id + ' cannot be solved by any cross').toBeGreaterThan(0);
    }
  });

  it('matches the authored solution count for every goal', () => {
    for (const goal of GOALS) {
      const hits = ALL_CROSSES.filter((c) => goal.check(c.p1, c.p2, c.counts, phenotypeOf));
      expect(hits.length, goal.id + ' solution count drifted').toBe(goal.solutions);
    }
  });

  it('is not trivially satisfied by the default cross alone', () => {
    // The view opens on BbEe x BbEe. If every goal were already true there,
    // the challenges would complete themselves without the student doing
    // anything.
    const defaultCounts = crossCounts('BbEe', 'BbEe');
    const satisfied = GOALS.filter((g) => g.check('BbEe', 'BbEe', defaultCounts, phenotypeOf));
    expect(satisfied.length, 'every goal is true on the default cross').toBeLessThan(GOALS.length);
  });

  it('keeps each goal distinct — no two accept exactly the same crosses', () => {
    const signatures = GOALS.map((goal) => ALL_CROSSES
      .filter((c) => goal.check(c.p1, c.p2, c.counts, phenotypeOf))
      .map((c) => c.p1 + 'x' + c.p2)
      .join(','));
    expect(new Set(signatures).size, 'two goals are the same challenge').toBe(GOALS.length);
  });

  it('targets epistasis rather than plain dominance', () => {
    const text = JSON.stringify(GOALS.map((g) => g.why));
    expect(text, 'no goal explains the masking').toMatch(/epistasis|mask/i);
  });
});

describe('Pets Punnett goals — state', () => {
  it('keeps only authored goal ids, without duplicates', () => {
    expect(API.normalizeGeneGoals(['blackToYellow', 'blackToYellow', 'notAGoal', 42]))
      .toEqual(['blackToYellow']);
    expect(API.normalizeGeneGoals(null)).toEqual([]);
    expect(API.normalizeGeneGoals('blackToYellow')).toEqual([]);
  });

  it('separates "solved now" from "solved ever"', () => {
    // BbEe x BbEe is the 9:3:4 cross.
    const counts = crossCounts('BbEe', 'BbEe');
    const state = API.geneGoalsState([], 'BbEe', 'BbEe', counts, phenotypeOf);
    expect(state.nowSolved).toContain('nineThreeFour');
    // Satisfying a goal on screen does not by itself record it.
    expect(state.solved).toEqual([]);
    expect(state.count).toBe(0);
    expect(state.complete).toBe(false);
  });

  it('is complete only when every goal has been recorded', () => {
    const counts = crossCounts('BbEe', 'BbEe');
    const partial = API.geneGoalsState([GOALS[0].id], 'BbEe', 'BbEe', counts, phenotypeOf);
    expect(partial.complete).toBe(false);

    const all = API.geneGoalsState(GOALS.map((g) => g.id), 'BbEe', 'BbEe', counts, phenotypeOf);
    expect(all.complete).toBe(true);
    expect(all.count).toBe(GOALS.length);
  });

  it('survives a goal whose check throws', () => {
    const throwing = vm.runInNewContext(
      `(function () { ${between('function normalizeGeneGoals(raw) {', 'function normalizeServiceCalls(')}; return geneGoalsState; })()`,
      { PUNNETT_GOALS: [{ id: 'boom', check() { throw new Error('nope'); } }] },
    );
    expect(() => throwing([], 'BbEe', 'BbEe', { Black: 9 }, phenotypeOf)).not.toThrow();
    expect(throwing([], 'BbEe', 'BbEe', { Black: 9 }, phenotypeOf).nowSolved).toEqual([]);
  });
});

describe('Pets Punnett goals — wiring', () => {
  it('activity-gates genetics and registers it in every evidence table', () => {
    expect(between('var PETS_ACTIVITY_COMPLETION_MODULES = {', '};')).toContain('genetics: true');
    expect(between('var PETS_EVIDENCE_ACTIVITY_FIELDS = {', '};')).toContain('genetics:');
    expect(between('var PETS_EVIDENCE_ACTIVITY_SUMMARIES = {', '};')).toContain('genetics:');
    expect(between('var PETS_ACTIVITY_COMPLETION_REASONS = {', '};'))
      .toContain("genetics: ['Solved every Punnett challenge']");
  });

  it('keeps the slice-local goal count in sync with the table', () => {
    const declared = between('var PUNNETT_GOAL_COUNT = ', ';').replace('var PUNNETT_GOAL_COUNT = ', '');
    expect(Number(declared), 'PUNNETT_GOAL_COUNT drifted from PUNNETT_GOALS').toBe(GOALS.length);
  });

  it('persists the solved goals and the open challenge', () => {
    expect(PETS).toContain("'geneGoals', 'geneGoalActive', 'geneGoalHint'");
    expect(PETS).toContain('snapshot.geneGoals = normalizeGeneGoals(snapshot.geneGoals);');
    // An unknown active goal id would render an empty panel.
    expect(PETS).toContain('snapshot.geneGoalActive = PUNNETT_GOALS.some(');
  });

  // Recording on the button, not in an effect: an effect firing on every
  // dropdown change would mark goals the student never selected.
  it('records a solve only when the student confirms it', () => {
    const record = between('function recordSolve() {', 'return h(\'div\', {');
    expect(record).toContain('if (!active || !activeSolvedNow || activeSolvedEver) return;');
    expect(record).toContain("completeModule('genetics', 'Solved every Punnett challenge'");
    expect(PETS).toContain("className: 'petslab-gene-goal-record'");
  });

  it('hides the hint until it is asked for', () => {
    const panel = between("className: 'petslab-gene-goals',", 'petslab-gene-parent-grid');
    expect(panel).toContain("className: 'petslab-gene-goal-hint'");
    expect(panel).toContain('showHint');
  });
});
