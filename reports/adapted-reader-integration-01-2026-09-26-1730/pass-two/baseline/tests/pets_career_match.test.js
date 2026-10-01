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

function tables() {
  const paths = between('var CAREER_PATHS = [', '\n  // ─────');
  const match = between('var CAREER_MATCH_QUESTIONS = [', '\n  // ─────');
  return vm.runInNewContext(
    `(function () { ${paths}; ${match}; return { CAREER_PATHS, CAREER_MATCH_QUESTIONS, CAREER_MATCH_TENSIONS }; })()`,
  );
}

function api() {
  const source = between('function normalizeCareerMatch(raw) {', 'function normalizeWelfareApply(');
  return vm.runInNewContext(
    `(function () { ${source}; return { normalizeCareerMatch, careerMatchRanking }; })()`,
    { ...tables(), isFinite },
  );
}

const T = tables();
const API = api();
const IDS = T.CAREER_PATHS.map((p) => p.id);

describe('Pets career match — the inventory', () => {
  it('asks about constraints, with help text and real options', () => {
    expect(T.CAREER_MATCH_QUESTIONS.length).toBeGreaterThanOrEqual(4);
    const ids = T.CAREER_MATCH_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size, 'duplicate question ids').toBe(ids.length);
    for (const question of T.CAREER_MATCH_QUESTIONS) {
      expect(question.prompt.length, question.id + ' prompt').toBeGreaterThan(30);
      expect(question.help.length, question.id + ' help').toBeGreaterThan(30);
      expect(question.options.length, question.id + ' options').toBeGreaterThanOrEqual(2);
      const optionIds = question.options.map((o) => o.id);
      expect(new Set(optionIds).size, question.id + ' duplicate option ids').toBe(optionIds.length);
      for (const option of question.options) {
        expect(option.label.length, `${question.id}.${option.id}`).toBeGreaterThan(15);
      }
    }
  });

  it('only ever scores careers that exist', () => {
    for (const question of T.CAREER_MATCH_QUESTIONS) {
      for (const option of question.options) {
        for (const careerId of Object.keys(option.scores || {})) {
          expect(IDS, `${question.id}.${option.id} scores unknown career`).toContain(careerId);
        }
      }
    }
  });

  it('names a real tension for every career', () => {
    for (const id of IDS) {
      expect(typeof T.CAREER_MATCH_TENSIONS[id], id).toBe('string');
      expect(T.CAREER_MATCH_TENSIONS[id].length, id + ' tension').toBeGreaterThan(80);
    }
  });
});

describe('Pets career match — the ranking is not rigged', () => {
  // Exhaustive over every answer combination. A matcher where some careers can
  // never surface is worse than no matcher: it quietly tells a student their
  // option does not exist.
  const combos = [];
  (function walk(index, acc) {
    if (index === T.CAREER_MATCH_QUESTIONS.length) { combos.push(acc); return; }
    for (const option of T.CAREER_MATCH_QUESTIONS[index].options) {
      walk(index + 1, acc.concat([[T.CAREER_MATCH_QUESTIONS[index].id, option.id]]));
    }
  })(0, []);

  const winners = new Map();
  for (const combo of combos) {
    const picks = Object.fromEntries(combo);
    const { ranked } = API.careerMatchRanking(picks, T.CAREER_PATHS);
    const best = ranked[0].score;
    for (const entry of ranked.filter((r) => r.score === best)) {
      winners.set(entry.id, (winners.get(entry.id) || 0) + 1);
    }
  }

  it('lets every career reach the top for some honest set of answers', () => {
    const unreachable = IDS.filter((id) => !winners.has(id));
    expect(unreachable, 'careers that can never be a top result').toEqual([]);
  });

  it('has no single career that dominates most outcomes', () => {
    const most = Math.max(...winners.values());
    expect(most / combos.length, 'one career tops too many combinations')
      .toBeLessThan(0.5);
  });

  it('ranks deterministically, breaking ties by authored order', () => {
    const picks = { school: 'four', setting: 'people' };
    const first = API.careerMatchRanking(picks, T.CAREER_PATHS).ranked.map((r) => r.id);
    const second = API.careerMatchRanking(picks, T.CAREER_PATHS).ranked.map((r) => r.id);
    expect(first).toEqual(second);
  });

  it('shows the arithmetic behind every score it reports', () => {
    const picks = Object.fromEntries(
      T.CAREER_MATCH_QUESTIONS.map((q) => [q.id, q.options[0].id]));
    const { ranked, complete } = API.careerMatchRanking(picks, T.CAREER_PATHS);
    expect(complete).toBe(true);
    for (const entry of ranked) {
      const summed = entry.reasons.reduce((total, reason) => total + reason.weight, 0);
      expect(summed, entry.id + ' reasons do not sum to its score').toBe(entry.score);
    }
  });
});

describe('Pets career match — state', () => {
  it('keeps only authored questions and authored option ids', () => {
    expect(API.normalizeCareerMatch({
      school: 'grad',
      setting: 'NOT_AN_OPTION',
      notAQuestion: 'grad',
      pay: 42,
    })).toEqual({ school: 'grad' });
  });

  it('ignores junk wholesale', () => {
    expect(API.normalizeCareerMatch(null)).toEqual({});
    expect(API.normalizeCareerMatch([])).toEqual({});
    expect(API.normalizeCareerMatch('nope')).toEqual({});
  });

  it('is complete only when every question is answered', () => {
    const partial = { school: 'grad' };
    expect(API.careerMatchRanking(partial, T.CAREER_PATHS).complete).toBe(false);

    const all = Object.fromEntries(
      T.CAREER_MATCH_QUESTIONS.map((q) => [q.id, q.options[0].id]));
    const full = API.careerMatchRanking(all, T.CAREER_PATHS);
    expect(full.complete).toBe(true);
    expect(full.answered).toBe(T.CAREER_MATCH_QUESTIONS.length);
  });

  it('scores nothing from a corrupt answer', () => {
    const clean = API.careerMatchRanking({}, T.CAREER_PATHS);
    expect(clean.ranked.every((r) => r.score === 0)).toBe(true);
    const junk = API.careerMatchRanking({ school: 'NOPE' }, T.CAREER_PATHS);
    expect(junk.ranked.every((r) => r.score === 0)).toBe(true);
    expect(junk.answered).toBe(0);
  });
});

describe('Pets career match — wiring', () => {
  it('activity-gates careers and registers it in every evidence table', () => {
    expect(between('var PETS_ACTIVITY_COMPLETION_MODULES = {', '};')).toContain('careers: true');
    expect(between('var PETS_EVIDENCE_ACTIVITY_FIELDS = {', '};')).toContain('careers:');
    expect(between('var PETS_EVIDENCE_ACTIVITY_SUMMARIES = {', '};')).toContain('careers:');
    expect(between('var PETS_ACTIVITY_COMPLETION_REASONS = {', '};'))
      .toContain("careers: ['Completed the career self-inventory']");
  });

  it('persists the answers through the snapshot normalizer', () => {
    expect(PETS).toContain("'welfareApply', 'careerMatch'");
    expect(PETS).toContain('snapshot.careerMatch = normalizeCareerMatch(snapshot.careerMatch);');
  });

  // There is no right answer to what a person should be, so this module must
  // never carry a success flag.
  it('records no score and no criterion for the inventory', () => {
    const reconcile = between("} else if (moduleId === 'careers') {", "} else if (moduleId === 'welfare') {");
    expect(reconcile).toContain('delete details.criterionMet;');
    expect(reconcile).toContain('delete details.score;');
    expect(reconcile).toContain('delete details.scorePct;');
  });

  it('tells the student this is not a recommendation', () => {
    const panel = between("className: 'petslab-career-fit',", 'petslab-career-question');
    expect(panel).toContain('it is not a recommendation');
  });
});
