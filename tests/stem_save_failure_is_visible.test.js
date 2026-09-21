// A failed save in the STEM Lab must not be silent.
//
// 24 localStorage writes across 17 STEM tools ship as:
//
//     try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {}
//
// Eleven of them hold real student work, and four tools (geometryWorld,
// swimLab, firstResponse, renewables) have no setToolData mirror at all, so
// localStorage is their ONLY persistence. When storage refuses the write —
// quota full, private mode, blocked site data, a shared school device at its
// limit — the work stays on screen, the student closes the tab, and it is gone.
//
// The SEL hub already solved this (writeLocalSel -> saveHealth -> a role="alert"
// banner with a retry). STEM handled it correctly in exactly one place, for
// preferences, and nowhere else.
//
// These tests run the REAL helper against a throwing storage rather than
// reading the source, because the defect is behavioural: the old code looked
// fine.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = resolve(process.cwd(), 'stem_lab/stem_lab_module.js');
const src = readFileSync(SOURCE, 'utf8');

/** Extract the shipped saveLocal and run it against a storage we control. */
function makeSaveLocal(storage, onAnnounce) {
  const m = /saveLocal: (function\(key, value, opts\) \{[\s\S]*?\n {12}\})/.exec(src);
  expect(m, 'saveLocal must exist in the STEM shell ctx').toBeTruthy();
  // eslint-disable-next-line no-new-func
  return new Function(
    'localStorage',
    'announceToSR',
    `return (${m[1]});`,
  )(storage, onAnnounce);
}

const throwingStorage = {
  setItem() {
    const e = new Error('QuotaExceededError');
    e.name = 'QuotaExceededError';
    throw e;
  },
  removeItem() { throw new Error('blocked'); },
  getItem: () => null,
};

function workingStorage() {
  const v = {};
  return {
    _v: v,
    setItem(k, val) { v[k] = val; },
    getItem(k) { return k in v ? v[k] : null; },
    removeItem(k) { delete v[k]; },
  };
}

describe('STEM saveLocal makes a failed save visible', () => {
  it('reports success when the device accepts the write', () => {
    const store = workingStorage();
    const saveLocal = makeSaveLocal(store, () => {});
    expect(saveLocal('gw_my_lessons', [{ title: 'Angles' }])).toBe(true);
    expect(JSON.parse(store._v.gw_my_lessons)).toEqual([{ title: 'Angles' }]);
  });

  it('reports FAILURE instead of swallowing it', () => {
    const saveLocal = makeSaveLocal(throwingStorage, () => {});
    expect(
      saveLocal('gw_my_lessons', [{ title: 'Angles' }]),
      'a discarded failure is how a student loses a lesson library',
    ).toBe(false);
  });

  it('still does not throw at the caller', () => {
    // The original try/catch was right about one thing: a storage failure must
    // not crash the tool. Only the silence was wrong.
    const saveLocal = makeSaveLocal(throwingStorage, () => {});
    expect(() => saveLocal('k', { a: 1 })).not.toThrow();
  });

  it('announces the failure to the screen-reader live region', () => {
    const said = [];
    const saveLocal = makeSaveLocal(throwingStorage, (m) => said.push(m));
    saveLocal('swimLab.state.v1', { quizResults: {} });
    expect(said.length, 'a silent failure reaches nobody').toBe(1);
  });

  it('names the recovery action, not just the error', () => {
    // Naming the one action that preserves the work matters more than saying
    // "save failed" — the student cannot act on an error alone.
    const said = [];
    const saveLocal = makeSaveLocal(throwingStorage, (m) => said.push(m));
    saveLocal('firstResponse.state.v1', {});
    expect(said[0]).toMatch(/still on screen/i);
    expect(said[0]).toMatch(/Export|Print|Save Project/);
  });

  it('stays silent for genuine preferences', () => {
    // theme / workspace_mode / tour_done cost the student nothing when lost.
    // Announcing those would train students to ignore the message that matters.
    const said = [];
    const saveLocal = makeSaveLocal(throwingStorage, (m) => said.push(m));
    expect(saveLocal('allo_wave_tour_done', '1', { silent: true })).toBe(false);
    expect(said.length).toBe(0);
  });

  it('lets a caller supply a message naming its own recovery path', () => {
    const said = [];
    const saveLocal = makeSaveLocal(throwingStorage, (m) => said.push(m));
    saveLocal('gw_my_lessons', [], { message: 'Lesson not saved. Use Export.' });
    expect(said[0]).toBe('Lesson not saved. Use Export.');
  });

  it('writes strings through without double-encoding them', () => {
    const store = workingStorage();
    const saveLocal = makeSaveLocal(store, () => {});
    saveLocal('alloflow_canvas_narrate', 'on');
    expect(store._v.alloflow_canvas_narrate, 'a string must not become "\\"on\\""').toBe('on');
  });

  it('reports failure on a refused remove too', () => {
    const saveLocal = makeSaveLocal(throwingStorage, () => {});
    expect(saveLocal('k', null, { remove: true })).toBe(false);
  });
});
