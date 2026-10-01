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

function caseTable() {
  const source = between('var SERVICE_CASES = [', '\n  // ─────');
  return vm.runInNewContext(`(function () { ${source}; return SERVICE_CASES; })()`);
}

function api() {
  const source = between('function normalizeServiceCalls(raw) {', 'var ACTION_PLAN_MAX =');
  return vm.runInNewContext(
    `(function () { ${source}; return { normalizeServiceCalls, serviceCallsProgress }; })()`,
    { SERVICE_CASES: caseTable() },
  );
}

const CASES = caseTable();
const API = api();

describe('Pets service cases — the calls', () => {
  it('gives every case a setting, a rule, and exactly one lawful call', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(4);
    const ids = CASES.map((c) => c.id);
    expect(new Set(ids).size, 'duplicate case ids').toBe(ids.length);
    for (const item of CASES) {
      expect(item.setting.length, item.id + ' setting').toBeGreaterThan(15);
      expect(item.prompt.length, item.id + ' prompt').toBeGreaterThan(80);
      // The rule that settles it must be named: the goal is a student who can
      // say WHY, not one who guesses right.
      expect(item.rule.length, item.id + ' rule').toBeGreaterThan(50);
      expect(item.note.length, item.id + ' note').toBeGreaterThan(120);
      expect(item.alsoWrong.length, item.id + ' alsoWrong').toBeGreaterThan(80);
      const best = item.options.filter((o) => o.verdict === 'best');
      expect(best.length, item.id + ' must have one lawful call').toBe(1);
      const optionIds = item.options.map((o) => o.id);
      expect(new Set(optionIds).size, item.id + ' duplicate option ids').toBe(optionIds.length);
      for (const option of item.options) {
        expect(['best', 'ok', 'miss'], `${item.id}.${option.id}`).toContain(option.verdict);
        expect(option.label.length, `${item.id}.${option.id}`).toBeGreaterThan(25);
      }
    }
  });

  it('does not park the lawful call in the same slot every time', () => {
    const positions = CASES.map((c) => c.options.findIndex((o) => o.verdict === 'best'));
    expect(new Set(positions).size, 'lawful call always in the same position')
      .toBeGreaterThan(2);
  });

  // The whole point of the view: people fail in BOTH directions, so the case
  // set must contain at least one of each failure mode.
  it('covers over-restriction and under-restriction', () => {
    const text = JSON.stringify(CASES);
    expect(text, 'no case about demanding documentation').toMatch(/certification or registration/i);
    expect(text, 'no case about a lawful exclusion').toMatch(/out of control/i);
    expect(text, 'no case distinguishing ESAs').toMatch(/emotional support/i);
    expect(text, 'no case about allergies as grounds').toMatch(/allergic|allergies/i);
  });

  it('cites the regulation for the exclusion case', () => {
    const exclusion = CASES.filter((c) => /out of control/i.test(c.rule))[0];
    expect(exclusion, 'no case names the exclusion rule').toBeTruthy();
    expect(exclusion.rule).toMatch(/28 CFR/);
  });
});

describe('Pets service cases — state', () => {
  it('keeps only authored cases and authored option ids', () => {
    const restored = API.normalizeServiceCalls({
      noVest: 'ask2',
      outOfControl: 'NOT_AN_OPTION',
      notACase: 'ask2',
      esaRestaurant: 42,
    });
    expect(restored).toEqual({ noVest: 'ask2' });
  });

  it('ignores junk wholesale', () => {
    expect(API.normalizeServiceCalls(null)).toEqual({});
    expect(API.normalizeServiceCalls([])).toEqual({});
    expect(API.normalizeServiceCalls('nope')).toEqual({});
  });

  it('completes on calling every case, not on calling them correctly', () => {
    const allWrong = {};
    for (const item of CASES) {
      allWrong[item.id] = item.options.find((o) => o.verdict !== 'best').id;
    }
    const progress = API.serviceCallsProgress(API.normalizeServiceCalls(allWrong));
    expect(progress.complete, 'ruling on every case is what completes it').toBe(true);
    expect(progress.done).toBe(CASES.length);
    expect(progress.correct).toBe(0);
  });

  it('counts the lawful calls when they are made', () => {
    const allRight = {};
    for (const item of CASES) {
      allRight[item.id] = item.options.find((o) => o.verdict === 'best').id;
    }
    const progress = API.serviceCallsProgress(API.normalizeServiceCalls(allRight));
    expect(progress.correct).toBe(CASES.length);
    expect(progress.complete).toBe(true);
  });

  it('is incomplete until every case is called', () => {
    const partial = { [CASES[0].id]: CASES[0].options[0].id };
    expect(API.serviceCallsProgress(API.normalizeServiceCalls(partial)).complete).toBe(false);
  });
});

describe('Pets service cases — wiring', () => {
  it('activity-gates service and registers it in every evidence table', () => {
    expect(between('var PETS_ACTIVITY_COMPLETION_MODULES = {', '};')).toContain('service: true');
    expect(between('var PETS_EVIDENCE_ACTIVITY_FIELDS = {', '};')).toContain('service:');
    expect(between('var PETS_EVIDENCE_ACTIVITY_SUMMARIES = {', '};')).toContain('service:');
    expect(between('var PETS_ACTIVITY_COMPLETION_REASONS = {', '};'))
      .toContain("service: ['Ruled on every access case']");
  });

  it('persists the calls through the snapshot normalizer', () => {
    expect(PETS).toContain("'actionPlan', 'serviceCalls'");
    expect(PETS).toContain('snapshot.serviceCalls = normalizeServiceCalls(snapshot.serviceCalls);');
  });

  it('completes on ruling every case, never on the score', () => {
    const decide = between('function decide(caseId, optionId) {', 'function resetCalls() {');
    expect(decide).toContain('if (after.complete) {');
    expect(decide).toContain("completeModule('service', 'Ruled on every access case'");
    expect(decide).not.toMatch(/if\s*\(\s*after\.correct\s*===?\s*after\.total\s*\)\s*\{[^}]*completeModule/);
  });

  it('states the legal scope rather than implying advice', () => {
    const panel = between("className: 'petslab-service-cases',", 'petslab-service-case');
    expect(panel).toContain('not legal advice');
    expect(panel).toContain('28 CFR');
  });
});
