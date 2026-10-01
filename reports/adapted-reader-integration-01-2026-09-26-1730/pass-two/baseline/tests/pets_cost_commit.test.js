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

function commitTable() {
  const source = between('var COST_COMMITMENTS = [', '\n  // ─────');
  return vm.runInNewContext(`(function () { ${source}; return COST_COMMITMENTS; })()`);
}

function api() {
  const source = between('function normalizeCostCommit(raw) {', 'function normalizeGeneGoals(');
  return vm.runInNewContext(
    `(function () { ${source}; return { normalizeCostCommit, costCommitProgress }; })()`,
    { COST_COMMITMENTS: commitTable() },
  );
}

const QUESTIONS = commitTable();
const API = api();

describe('Pets cost reckoning — the questions', () => {
  it('asks about the monthly figure, the emergency, and who pays later', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(3);
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size, 'duplicate question ids').toBe(ids.length);
    for (const question of QUESTIONS) {
      expect(question.title.length, question.id + ' title').toBeGreaterThan(5);
      expect(question.ask.length, question.id + ' ask').toBeGreaterThan(60);
      expect(question.options.length, question.id + ' options').toBeGreaterThanOrEqual(3);
      const optionIds = question.options.map((o) => o.id);
      expect(new Set(optionIds).size, question.id + ' duplicate option ids').toBe(optionIds.length);
    }
  });

  // The design property that matters most: a student must always be able to
  // say "we could not", and that answer must be a first-class option rather
  // than a hidden failure state.
  it('gives every question an honest "we could not" option', () => {
    for (const question of QUESTIONS) {
      const honest = question.options.filter((o) => o.tone === 'honest');
      expect(honest.length, question.id + ' has no honest option').toBeGreaterThan(0);
    }
  });

  it('answers every option with something substantive, not a verdict', () => {
    for (const question of QUESTIONS) {
      for (const option of question.options) {
        expect(option.label.length, `${question.id}.${option.id} label`).toBeGreaterThan(25);
        expect(option.note.length, `${question.id}.${option.id} note`).toBeGreaterThan(150);
        expect(['steady', 'strain', 'honest', 'unsure'], `${question.id}.${option.id} tone`)
          .toContain(option.tone);
      }
    }
  });

  // "We cannot afford this" is a GOOD outcome, so the copy must not scold.
  it('never frames the honest answer as a failure', () => {
    // Match scolding ASSERTED at the student, not the word 'failure' used to
      // deny one ('this is not a failure of the exercise').
      const scolding = /you are (irresponsible|selfish)|\byou should be ashamed\b|\bshame on you\b|is a failure\b/i;
    for (const question of QUESTIONS) {
      for (const option of question.options.filter((o) => o.tone === 'honest')) {
        expect(option.note, `${question.id}.${option.id} scolds`).not.toMatch(scolding);
      }
    }
  });

  it('points the honest answer at a real alternative', () => {
    const alternatives = /foster|volunteer|wait|smaller|another species|shelter/i;
    for (const question of QUESTIONS) {
      for (const option of question.options.filter((o) => o.tone === 'honest')) {
        expect(option.note, `${question.id}.${option.id} offers no alternative`)
          .toMatch(alternatives);
      }
    }
  });
});

describe('Pets cost reckoning — state', () => {
  it('keeps only authored questions and authored option ids', () => {
    expect(API.normalizeCostCommit({
      monthly: 'tight',
      emergency: 'NOT_AN_OPTION',
      notAQuestion: 'tight',
      whoPays: 42,
    })).toEqual({ monthly: 'tight' });
  });

  it('ignores junk wholesale', () => {
    expect(API.normalizeCostCommit(null)).toEqual({});
    expect(API.normalizeCostCommit([])).toEqual({});
    expect(API.normalizeCostCommit('nope')).toEqual({});
  });

  it('completes on answering every question, whatever the answers are', () => {
    const allHonest = {};
    for (const question of QUESTIONS) {
      allHonest[question.id] = question.options.find((o) => o.tone === 'honest').id;
    }
    const progress = API.costCommitProgress(API.normalizeCostCommit(allHonest));
    expect(progress.complete, 'answering honestly must still complete it').toBe(true);
    expect(progress.done).toBe(QUESTIONS.length);
    expect(progress.honest).toBe(QUESTIONS.length);
  });

  it('is incomplete until every question is answered', () => {
    const partial = { [QUESTIONS[0].id]: QUESTIONS[0].options[0].id };
    const progress = API.costCommitProgress(API.normalizeCostCommit(partial));
    expect(progress.complete).toBe(false);
    expect(progress.done).toBe(1);
  });
});

describe('Pets cost reckoning — wiring', () => {
  it('activity-gates cost and registers it in every evidence table', () => {
    expect(between('var PETS_ACTIVITY_COMPLETION_MODULES = {', '};')).toContain('cost: true');
    // Without an ACTIVITY_FIELDS entry the stored reason silently downgrades.
    expect(between('var PETS_EVIDENCE_ACTIVITY_FIELDS = {', '};')).toContain('cost:');
    expect(between('var PETS_EVIDENCE_ACTIVITY_SUMMARIES = {', '};')).toContain('cost:');
    expect(between('var PETS_ACTIVITY_COMPLETION_REASONS = {', '};'))
      .toContain("cost: ['Answered every budget question']");
  });

  it('persists the answers through the snapshot normalizer', () => {
    expect(PETS).toContain("'geneGoalHint', 'costCommit'");
    expect(PETS).toContain('snapshot.costCommit = normalizeCostCommit(snapshot.costCommit);');
  });

  // Scoring this would mark the most useful answer on the page as a failure.
  it('records no score and no criterion', () => {
    const reconcile = between("} else if (moduleId === 'cost') {", "} else if (moduleId === 'genetics') {");
    expect(reconcile).toContain('delete details.criterionMet;');
    expect(reconcile).toContain('delete details.score;');
    expect(reconcile).toContain('delete details.scorePct;');
  });

  it('says plainly that cost is the top surrender reason', () => {
    const panel = between("className: 'petslab-cost-commit',", 'petslab-cost-commit-q');
    expect(panel).toMatch(/most common reason animals are given up/i);
    expect(panel).toMatch(/there are no right answers/i);
  });
});
