// A Unit Path stamp must be consumed by whichever button generates the plan.
//
// Flow (host_handlers_source.jsx ~4497): picking a Unit Path follow-up sets
// window.__alloPendingUnitPathNode, then hands control back to the user at the
// source-input stage (setActiveView('input')). It does NOT generate anything
// itself. Its comment says "the plan generated next is stamped as that node
// (the dispatcher reads and clears this)" -- "next", with no qualification
// about which button.
//
// But TWO buttons generate a lesson plan:
//   dispatcher (generate_dispatcher_source.jsx) read the stamp, wrote unitPath
//     onto the saved plan, and deleted the global.
//   sidebar (concept_map_handlers_source.jsx handleGenerateLessonPlan) did
//     neither -- it never referenced __alloPendingUnitPathNode at all.
//
// Two consequences on the sidebar route:
//   1. The plan the user just asked for was NOT recorded as that unit-path node.
//   2. The global was never cleared, so it survived and attached itself to a
//      LATER, unrelated plan -- mislabelling that one instead.
//
// The setter records `since` and `priorPlanId` precisely so staleness can be
// judged; neither was ever read. The consumer now lives once in UtilsPure, so
// both routes share one freshness rule and one record shape. These tests
// exercise that function rather than grepping for its call sites: the earlier
// draft of this file asserted on string literals and went red purely because
// the logic had been centralized, which is the wrong thing to pin.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let Utils, cmap, dispatcher, host;

beforeAll(() => {
  loadAlloModule('utils_pure_module.js');
  Utils = window.AlloModules.UtilsPure;
  if (!Utils) throw new Error('UtilsPure failed to register');
  cmap = readFileSync('concept_map_handlers_source.jsx', 'utf8');
  dispatcher = readFileSync('generate_dispatcher_source.jsx', 'utf8');
  host = readFileSync('host_handlers_source.jsx', 'utf8');
});

afterEach(() => {
  try { delete window.__alloPendingUnitPathNode; } catch (_) {}
});

const stamp = (extra = {}) => {
  window.__alloPendingUnitPathNode = {
    graphId: 'g1', nodeId: 'n7', label: 'Fractions on a number line',
    title: 'Unit 3', index: 2, count: 5, since: Date.now(), priorPlanId: 'p1',
    ...extra,
  };
};

describe('the premise: the stamp is set, then the user chooses a button', () => {
  it('the Unit Path option stamps a pending node and returns to source input', () => {
    const i = host.indexOf('window.__alloPendingUnitPathNode = {');
    expect(i).toBeGreaterThan(-1);
    expect(host.slice(i, i + 2500)).toContain("setActiveView('input')");
    // It records the two fields that make staleness judgeable.
    const set = host.slice(i, i + 200);
    expect(set).toContain('priorPlanId');
    expect(set).toContain('since');
  });
});

describe('consumePendingUnitPathNode', () => {
  it('returns a normalized record for a fresh stamp', () => {
    stamp();
    expect(Utils.consumePendingUnitPathNode()).toEqual({
      graphId: 'g1', nodeId: 'n7', label: 'Fractions on a number line',
      title: 'Unit 3', index: 2, count: 5,
    });
  });

  it('clears the global, so a second plan is not also stamped', () => {
    stamp();
    expect(Utils.consumePendingUnitPathNode()).toBeTruthy();
    expect(Utils.consumePendingUnitPathNode()).toBeNull();
    expect(window.__alloPendingUnitPathNode).toBeUndefined();
  });

  it('drops a stale stamp instead of applying it to an unrelated plan', () => {
    const tooOld = Date.now() - (Utils._ALLO_UNIT_PATH_STAMP_MAX_AGE_MS + 1000);
    stamp({ since: tooOld });
    expect(Utils.consumePendingUnitPathNode()).toBeNull();
  });

  it('still clears a stale stamp, so it cannot linger for the NEXT plan', () => {
    const tooOld = Date.now() - (Utils._ALLO_UNIT_PATH_STAMP_MAX_AGE_MS + 1000);
    stamp({ since: tooOld });
    Utils.consumePendingUnitPathNode();
    expect(window.__alloPendingUnitPathNode).toBeUndefined();
  });

  it('keeps a stamp that is inside the freshness window', () => {
    stamp({ since: Date.now() - (Utils._ALLO_UNIT_PATH_STAMP_MAX_AGE_MS - 60000) });
    expect(Utils.consumePendingUnitPathNode()).toBeTruthy();
  });

  it('ignores junk: no stamp, wrong type, or a missing nodeId', () => {
    expect(Utils.consumePendingUnitPathNode()).toBeNull();
    window.__alloPendingUnitPathNode = 'nope';
    expect(Utils.consumePendingUnitPathNode()).toBeNull();
    window.__alloPendingUnitPathNode = { graphId: 'g1' };
    expect(Utils.consumePendingUnitPathNode()).toBeNull();
  });

  it('tolerates a stamp with no `since` rather than discarding it', () => {
    // Older stamps predate the field; absence must not mean "stale".
    stamp({ since: undefined });
    expect(Utils.consumePendingUnitPathNode()).toBeTruthy();
  });

  it('bounds the free-text fields it copies onto the plan', () => {
    stamp({ label: 'x'.repeat(900), title: 'y'.repeat(900) });
    const got = Utils.consumePendingUnitPathNode();
    expect(got.label).toHaveLength(400);
    expect(got.title).toHaveLength(300);
  });
});

describe('both lesson-plan routes go through that one consumer', () => {
  it.each([
    ['sidebar', () => cmap],
    ['dispatcher', () => dispatcher],
  ])('%s calls consumePendingUnitPathNode', (_label, get) => {
    expect(get()).toContain('consumePendingUnitPathNode');
  });

  it.each([
    ['sidebar', () => cmap],
    ['dispatcher', () => dispatcher],
  ])('%s writes unitPath onto the generated plan', (_label, get) => {
    expect(get()).toMatch(/content\.unitPath = /);
  });

  it('neither route still hand-rolls its own read or delete of the global', () => {
    // One owner for the lifecycle; a second `delete` site is how the two
    // routes drifted apart in the first place.
    expect(cmap).not.toContain('delete window.__alloPendingUnitPathNode');
    expect(dispatcher).not.toContain('delete window.__alloPendingUnitPathNode');
  });
});
