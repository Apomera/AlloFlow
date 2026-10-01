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

const TOPICS = ['spayNeuter', 'adoption', 'declawing', 'outdoorCats'];

function applyTable() {
  const source = between('var WELFARE_APPLY = {', '\n  // ─────');
  return vm.runInNewContext(`(function () { ${source}; return WELFARE_APPLY; })()`);
}

function applyApi() {
  const source = between('function normalizeWelfareApply(raw) {', 'function mythCheckProgress(');
  return vm.runInNewContext(
    `(function () { ${source}; return { normalizeWelfareApply, welfareApplyProgress }; })()`,
    { WELFARE_APPLY: applyTable() },
  );
}

const APPLY = applyTable();
const API = applyApi();

describe('Pets welfare apply — scenarios', () => {
  it('gives every welfare topic exactly one strongest response', () => {
    expect(Object.keys(APPLY).sort()).toEqual([...TOPICS].sort());
    for (const topic of TOPICS) {
      const options = APPLY[topic].options;
      expect(options.length, topic).toBeGreaterThanOrEqual(3);
      const best = options.filter((o) => o.verdict === 'best');
      expect(best.length, topic + ' must have one best answer').toBe(1);
      const ids = options.map((o) => o.id);
      expect(new Set(ids).size, topic + ' duplicate ids').toBe(ids.length);
      for (const option of options) {
        expect(['best', 'ok', 'miss'], `${topic}.${option.id}`).toContain(option.verdict);
      }
    }
  });

  // Every option gets a real response, including the right one: the moment
  // after a choice is when the student is most ready to read.
  it('explains every option, not just the wrong ones', () => {
    for (const topic of TOPICS) {
      expect(APPLY[topic].prompt.length, topic + ' prompt').toBeGreaterThan(100);
      expect(APPLY[topic].source.length, topic + ' source').toBeGreaterThan(10);
      for (const option of APPLY[topic].options) {
        expect(option.label.length, `${topic}.${option.id} label`).toBeGreaterThan(30);
        expect(option.note.length, `${topic}.${option.id} note`).toBeGreaterThan(120);
      }
    }
  });

  it('does not park the best answer in the same slot every time', () => {
    const positions = TOPICS.map((topic) =>
      APPLY[topic].options.findIndex((o) => o.verdict === 'best'));
    expect(new Set(positions).size, 'best answer always in the same position')
      .toBeGreaterThan(1);
  });

  // A student who learns "refuse hardest" has not learned what the sources
  // support. The strongest option should engage, not just disapprove.
  it('never makes the absolutist option the strongest one', () => {
    const absolutist = /\balways wrong\b|\bshould not do it\b|\bsay nothing\b/i;
    for (const topic of TOPICS) {
      const best = APPLY[topic].options.find((o) => o.verdict === 'best');
      expect(best.label, topic + ' best answer reads as a refusal').not.toMatch(absolutist);
    }
  });

  it('offers at least one defensible-but-weaker option per topic', () => {
    for (const topic of TOPICS) {
      const oks = APPLY[topic].options.filter((o) => o.verdict === 'ok');
      expect(oks.length, topic + ' has no middle ground').toBeGreaterThan(0);
    }
  });
});

describe('Pets welfare apply — state', () => {
  it('keeps only authored topics and authored option ids', () => {
    const restored = API.normalizeWelfareApply({
      spayNeuter: 'cost',
      adoption: 'NOT_AN_OPTION',
      notATopic: 'cost',
      declawing: 42,
    });
    expect(restored).toEqual({ spayNeuter: 'cost' });
  });

  it('ignores junk wholesale', () => {
    expect(API.normalizeWelfareApply(null)).toEqual({});
    expect(API.normalizeWelfareApply([])).toEqual({});
    expect(API.normalizeWelfareApply('nope')).toEqual({});
  });

  it('counts strongest answers without gating completion on them', () => {
    const weakest = {};
    for (const topic of TOPICS) {
      weakest[topic] = APPLY[topic].options.find((o) => o.verdict !== 'best').id;
    }
    const progress = API.welfareApplyProgress(API.normalizeWelfareApply(weakest));
    expect(progress.complete, 'deciding every topic is what completes it').toBe(true);
    expect(progress.done).toBe(4);
    expect(progress.strong).toBe(0);
  });

  it('is incomplete until every topic has a decision', () => {
    const partial = { spayNeuter: APPLY.spayNeuter.options[0].id };
    const progress = API.welfareApplyProgress(API.normalizeWelfareApply(partial));
    expect(progress.complete).toBe(false);
    expect(progress.done).toBe(1);

    const all = {};
    for (const topic of TOPICS) {
      all[topic] = APPLY[topic].options.find((o) => o.verdict === 'best').id;
    }
    const full = API.welfareApplyProgress(API.normalizeWelfareApply(all));
    expect(full.complete).toBe(true);
    expect(full.strong).toBe(4);
  });
});

describe('Pets welfare apply — wiring', () => {
  it('activity-gates welfare and registers it in every evidence table', () => {
    expect(between('var PETS_ACTIVITY_COMPLETION_MODULES = {', '};')).toContain('welfare: true');
    // Without an ACTIVITY_FIELDS entry the reason downgrades to self-review.
    expect(between('var PETS_EVIDENCE_ACTIVITY_FIELDS = {', '};')).toContain('welfare:');
    expect(between('var PETS_EVIDENCE_ACTIVITY_SUMMARIES = {', '};')).toContain('welfare:');
    expect(between('var PETS_ACTIVITY_COMPLETION_REASONS = {', '};'))
      .toContain("welfare: ['Decided all four welfare scenarios']");
  });

  it('persists the decisions through the snapshot normalizer', () => {
    expect(PETS).toContain("'mythChecks', 'welfareApply'");
    expect(PETS).toContain('snapshot.welfareApply = normalizeWelfareApply(snapshot.welfareApply);');
  });

  it('completes on deciding every topic, not on picking the best ones', () => {
    const choose = between('function choose(optionId) {', 'function clearChoice() {');
    expect(choose).toContain('if (after.complete) {');
    expect(choose).toContain("completeModule('welfare', 'Decided all four welfare scenarios'");
    expect(choose).not.toMatch(/if\s*\(\s*after\.strong\s*===?\s*after\.total\s*\)\s*\{[^}]*completeModule/);
  });

  it('shows the strongest answer to a student who picked a weaker one', () => {
    const card = between("className: 'petslab-welfare-apply',", 'petslab-welfare-apply-retry');
    expect(card).toContain("chosen.verdict !== 'best'");
    expect(card).toContain("option.verdict === 'best'");
  });
});
