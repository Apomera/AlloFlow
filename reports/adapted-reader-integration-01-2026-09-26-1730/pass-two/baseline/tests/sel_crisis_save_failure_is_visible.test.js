// A failed save in Crisis Companion must not be silent.
//
// `lsSet` shipped as:
//
//     function lsSet(key, val) { try { localStorage.setItem(...); } catch(e) {} }
//
// It stores `crisisCompanion.safetyPlan.v1`. When localStorage throws — quota
// full, private mode, site data blocked, a shared school device at its limit —
// the catch discarded it. The plan stayed on screen, the student closed the
// tab, and it was gone. Nothing told them at any point.
//
// The hub shell already handles this correctly for its OWN keys: writeLocalSel
// returns a boolean, saveHealth tracks it, and a role="alert" banner plus a
// retry button appear. This tool bypassed that path with a private helper and
// so bypassed the safety net too.
//
// These tests run the REAL lsSet against a throwing storage rather than reading
// the source, because the defect was behavioural: the code looked fine.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = resolve(process.cwd(), 'sel_hub/sel_tool_crisiscompanion.js');
const src = readFileSync(SOURCE, 'utf8');

/** Extract the shipped lsSet and run it against a storage we control. */
function makeLsSet(storage) {
  const m = /function lsSet\(key, val\)\s*\{[\s\S]*?\n/.exec(src);
  expect(m, 'lsSet must exist in the tool').toBeTruthy();
  // eslint-disable-next-line no-new-func
  return new Function('localStorage', `${m[0]}; return lsSet;`)(storage);
}

const throwingStorage = {
  setItem() {
    const e = new Error('QuotaExceededError');
    e.name = 'QuotaExceededError';
    throw e;
  },
  getItem: () => null,
  removeItem() {},
};

const workingStorage = {
  _v: {},
  setItem(k, v) { this._v[k] = v; },
  getItem(k) { return this._v[k] ?? null; },
  removeItem(k) { delete this._v[k]; },
};

describe('Crisis Companion save failure is visible', () => {
  it('lsSet reports success when the device accepts the write', () => {
    const lsSet = makeLsSet(workingStorage);
    expect(lsSet('crisisCompanion.safetyPlan.v1', { step1: 'Call my aunt' })).toBe(true);
  });

  it('lsSet reports FAILURE instead of swallowing it', () => {
    const lsSet = makeLsSet(throwingStorage);
    const result = lsSet('crisisCompanion.safetyPlan.v1', { step1: 'Call my aunt' });
    expect(result, 'a discarded failure is how a safety plan gets lost silently').toBe(false);
  });

  it('lsSet still does not throw at the caller', () => {
    // The original try/catch was right about one thing: a storage failure must
    // not crash the tool mid-crisis. Only the silence was wrong.
    const lsSet = makeLsSet(throwingStorage);
    expect(() => lsSet('k', { a: 1 })).not.toThrow();
  });

  it('the three student-work writes check the result and announce', () => {
    for (const key of [
      'crisisCompanion.safetyPlan.v1',
      'crisisCompanion.toolkit.v1',
      'crisisCompanion.badges.v1',
    ]) {
      const re = new RegExp(`if \\(!lsSet\\(ccKey\\('${key.replace(/\./g, '\\.')}'\\)[^)]*\\)\\) announce\\(`);
      expect(re.test(src), `${key} must report a failed save to the student`).toBe(true);
    }
  });

  it('the message says the work is still recoverable, and how', () => {
    // Naming the one action that preserves the work matters more than saying
    // "save failed" — the student is in the tool because things are hard.
    expect(src).toContain('Your work is still on screen');
    expect(src).toMatch(/Export or Print/);
  });

  it('announces through the tool\'s polite live region, not just visually', () => {
    expect(src).toContain('allo-live-crisiscompanion');
  });
});
