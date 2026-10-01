import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const PETS = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_pets.js'), 'utf8');

// sliceBetween throws naming the anchor that moved, so a relocated region
// fails loudly instead of silently pinning the whole file.
function between(startMarker, endMarker) {
  return sliceBetween(PETS, startMarker, endMarker, { file: 'stem_lab/stem_tool_pets.js' });
}

// The real claim tables, evaluated out of the tool.
function claimTables() {
  const myths = between('var MYTHS = [', '  // ─────────────────────────────────────────────────────────\n  // SECTION 5b');
  const rest = between('var MYTH_CHECK_TRUE = [', '  // ─────────────────────────────────────────────────────────\n  // SECTION 6: CAREER PATHWAYS');
  return vm.runInNewContext(
    `(function () { ${myths}; ${rest}; return { MYTHS, MYTH_CHECK_TRUE, MYTH_CHECK_ORDER }; })()`,
  );
}

// The resolver + normalizer + progress helpers, given the real tables.
function mythApi() {
  const source = between('function mythClaimByKey(key) {', 'function normalizeAiDrafts(');
  const tables = claimTables();
  return vm.runInNewContext(
    `(function () { ${source}; return { mythClaimByKey, mythCheckKeys, normalizeMythChecks, mythCheckProgress }; })()`,
    { ...tables, isFinite },
  );
}

const TABLES = claimTables();
const API = mythApi();

describe('Pets myth check — claim set', () => {
  it('mixes true statements in so "false" is never a free win', () => {
    const keys = API.mythCheckKeys();
    const verdicts = keys.map((key) => API.mythClaimByKey(key).verdict);
    const trues = verdicts.filter(Boolean).length;
    expect(keys.length).toBe(TABLES.MYTHS.length + TABLES.MYTH_CHECK_TRUE.length);
    expect(trues, 'no true claims: answering "false" every time would score 100%')
      .toBeGreaterThan(0);
    expect(verdicts.filter((v) => !v).length).toBeGreaterThan(0);
  });

  it('never runs the same answer more than twice in a row', () => {
    const verdicts = API.mythCheckKeys().map((key) => API.mythClaimByKey(key).verdict);
    let run = 1;
    let longest = 1;
    for (let i = 1; i < verdicts.length; i += 1) {
      run = verdicts[i] === verdicts[i - 1] ? run + 1 : 1;
      longest = Math.max(longest, run);
    }
    expect(longest, 'a long run of one answer is guessable from rhythm alone')
      .toBeLessThanOrEqual(2);
  });

  it('uses every authored claim exactly once', () => {
    const keys = API.mythCheckKeys();
    expect(new Set(keys).size).toBe(keys.length);
    const mythIdx = keys.filter((k) => k.startsWith('m')).map((k) => Number(k.slice(1)));
    const trueIdx = keys.filter((k) => k.startsWith('t')).map((k) => Number(k.slice(1)));
    expect([...mythIdx].sort((a, b) => a - b))
      .toEqual(TABLES.MYTHS.map((_, i) => i));
    expect([...trueIdx].sort((a, b) => a - b))
      .toEqual(TABLES.MYTH_CHECK_TRUE.map((_, i) => i));
  });

  it('gives every claim a correction and a source', () => {
    for (const key of API.mythCheckKeys()) {
      const claim = API.mythClaimByKey(key);
      expect(typeof claim.claim, key).toBe('string');
      expect(claim.claim.length, key + ' claim').toBeGreaterThan(18);
      expect(claim.note.length, key + ' note').toBeGreaterThan(60);
      expect(claim.source.length, key + ' source').toBeGreaterThan(5);
      expect(typeof claim.verdict, key + ' verdict').toBe('boolean');
    }
  });

  it('resolves myths as false and the mixed-in claims as true', () => {
    expect(API.mythClaimByKey('m0').verdict).toBe(false);
    expect(API.mythClaimByKey('m0').note).toBe(TABLES.MYTHS[0].truth);
    expect(API.mythClaimByKey('t0').verdict).toBe(true);
    expect(API.mythClaimByKey('t0').note).toBe(TABLES.MYTH_CHECK_TRUE[0].note);
  });

  it('rejects a key that does not resolve', () => {
    for (const bad of ['', 'x0', 'm999', 't999', 'm', 'm-1', 'mNaN', null, undefined]) {
      expect(API.mythClaimByKey(bad), String(bad)).toBeNull();
    }
  });
});

describe('Pets myth check — state', () => {
  it('keeps only resolvable keys and real boolean answers', () => {
    const restored = API.normalizeMythChecks({
      m0: { said: true, revealed: true },
      m1: { said: 'yes', revealed: true },
      m999: { said: false, revealed: true },
      t0: 'not-an-object',
    });
    expect(Object.keys(restored).sort()).toEqual(['m0', 'm1']);
    expect(restored.m0).toEqual({ said: true, revealed: true });
    // A non-boolean answer is dropped, but the reveal it came with survives.
    expect(restored.m1).toEqual({ said: null, revealed: true });
  });

  it('drops an empty row rather than storing a blank', () => {
    expect(API.normalizeMythChecks({ m0: { said: null, revealed: false } })).toEqual({});
    expect(API.normalizeMythChecks(null)).toEqual({});
    expect(API.normalizeMythChecks([])).toEqual({});
  });

  it('counts believed myths, not just wrong answers', () => {
    // Called a myth true = believed it. Called a true claim false = wrong, but
    // not a misconception this view is about.
    const state = API.normalizeMythChecks({
      m0: { said: true, revealed: true },   // believed a myth
      m1: { said: false, revealed: true },  // correct
      t0: { said: false, revealed: true },  // wrong, but not "believed a myth"
    });
    const progress = API.mythCheckProgress(state);
    expect(progress.done).toBe(3);
    expect(progress.correct).toBe(1);
    expect(progress.believed).toBe(1);
    expect(progress.complete).toBe(false);
  });

  it('is complete only when every claim has been judged', () => {
    const keys = API.mythCheckKeys();
    const all = {};
    keys.forEach((key) => { all[key] = { said: API.mythClaimByKey(key).verdict, revealed: true }; });
    const progress = API.mythCheckProgress(API.normalizeMythChecks(all));
    expect(progress.complete).toBe(true);
    expect(progress.done).toBe(keys.length);
    expect(progress.correct).toBe(keys.length);
    expect(progress.believed).toBe(0);

    // An unrevealed row does not count toward completion.
    const partial = { ...all };
    partial[keys[0]] = { said: true, revealed: false };
    expect(API.mythCheckProgress(API.normalizeMythChecks(partial)).complete).toBe(false);
  });
});

describe('Pets myth check — wiring', () => {
  it('activity-gates the module and registers it in every evidence table', () => {
    expect(between('var PETS_ACTIVITY_COMPLETION_MODULES = {', '};')).toContain('myths: true');
    // Without an ACTIVITY_FIELDS entry the stored reason silently downgrades
    // to 'Reviewed by learner'.
    expect(between('var PETS_EVIDENCE_ACTIVITY_FIELDS = {', '};')).toContain('myths:');
    expect(between('var PETS_EVIDENCE_ACTIVITY_SUMMARIES = {', '};')).toContain('myths:');
    expect(between('var PETS_ACTIVITY_COMPLETION_REASONS = {', '};'))
      .toContain("myths: ['Judged every myth claim']");
  });

  it('persists the answers through the snapshot normalizer', () => {
    expect(PETS).toContain("'speciesChecks', 'mythChecks'");
    expect(PETS).toContain('snapshot.mythChecks = normalizeMythChecks(snapshot.mythChecks);');
  });

  it('completes only after every claim is judged, and never on the score', () => {
    const answer = between('function answer(key, said) {', 'function resetChecks() {');
    expect(answer).toContain('if (done === keys.length) {');
    expect(answer).toContain("completeModule('myths', 'Judged every myth claim'");
    // The count is recomputed against the answer just given, because `checks`
    // is the render snapshot and excludes it.
    expect(answer).toContain('otherKey === key');
    expect(answer).not.toMatch(/if\s*\(\s*correct\s*[!=]==?\s*keys\.length\s*\)\s*\{[^}]*completeModule/);
  });

  it('drops a success flag the stored score does not support', () => {
    const reconcile = between("} else if (moduleId === 'myths') {", 'PETS_SPECIES_CHECK_MODULES');
    expect(reconcile).toContain("hasNumber('believed')");
    expect(reconcile).toContain('delete details.criterionMet;');
  });
});
