// Singleton + archive — one plan stays LIVE (activeBlueprint, untouched);
// finished plans are filed into 'alloflow_blueprint_archive_v1' and can be
// restored with their full run record.
//
// The four red-team conditions this feature was only approved under:
//   (i)  archiveLivePlan reaches the modules through their `= deps`/props
//        destructures (check_free_vars did not cover these files until S9);
//   (ii) the archive UI adds NO hooks below UDLGuideModal's early return;
//   (iii) the host handlers actually EXIST (the draft referenced an
//        onArchiveAndClearBlueprint it never defined);
//   (iv) workspace-clear continuity — clearing a workspace files the outgoing
//        plan and does NOT clear the archive key.
// Plus the two structural invariants that killed the multi-plan option:
//   own key (never a version bump on the live envelope), and run.rows nested
//   per record (uiIds collide across plans by construction).

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');
const HOSTS = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];

let S;
beforeAll(() => {
  loadAlloModule('agent_core_blueprint_service_module.js');
  S = window.AlloModules?.AgentCoreBlueprintService;
  if (!S) throw new Error('AgentCoreBlueprintService failed to register');
});

// In-memory storage stub with a controllable quota failure.
const makeStore = () => {
  const m = new Map();
  return {
    full: false,
    getItem(k) { return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { if (this.full) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    removeItem(k) { m.delete(k); },
    _raw: m,
  };
};

const PLAN = { resourcePlan: [{ tool: 'analysis', directive: 'a', uiId: 'analysis-0' }, { tool: 'quiz', directive: 'q', uiId: 'quiz-1' }] };
const RUN = { rows: {
  'analysis-0': { uiId: 'analysis-0', tool: 'analysis', status: 'landed', resourceId: 'r1' },
  'quiz-1': { uiId: 'quiz-1', tool: 'quiz', status: 'failed' },
}, done: true };

describe('toArchivedPlan', () => {
  it('exports exist (vacuous-guard)', () => {
    expect(typeof S.toArchivedPlan).toBe('function');
    expect(typeof S.createBlueprintArchive).toBe('function');
    expect(S.BLUEPRINT_ARCHIVE_KEY).toBe('alloflow_blueprint_archive_v1');
  });

  it('puts identity on the RECORD, never on the plan (revise round-trips drop foreign fields)', () => {
    const rec = S.toArchivedPlan(PLAN, RUN, { name: 'Space', savedAt: '2026-07-29T00:00:00Z' });
    expect(typeof rec.id).toBe('string');
    expect(rec.plan.id).toBeUndefined();
  });

  it('keeps run.rows NESTED per record — uiIds collide across plans by construction', () => {
    const rec = S.toArchivedPlan(PLAN, RUN, {});
    expect(rec.run.rows['analysis-0'].status).toBe('landed');
  });

  it('is a deep copy: later mutation of the live pair cannot reach the record', () => {
    const run = JSON.parse(JSON.stringify(RUN));
    const rec = S.toArchivedPlan(PLAN, run, {});
    run.rows['analysis-0'].status = 'failed';
    expect(rec.run.rows['analysis-0'].status).toBe('landed');
  });

  it('computes stats: interrupted counts as failed, landed as landed', () => {
    const run = { rows: { a: { status: 'landed' }, b: { status: 'failed' }, c: { status: 'interrupted' } } };
    expect(S.toArchivedPlan(PLAN, run, {}).stats).toEqual({ total: 3, landed: 1, failed: 2 });
  });
});

describe('createBlueprintArchive', () => {
  let store, lib;
  beforeEach(() => { store = makeStore(); lib = S.createBlueprintArchive(store); });

  it('newest first, and re-adding the same id replaces rather than duplicates', () => {
    const a = S.toArchivedPlan(PLAN, RUN, { id: 'a', name: 'first' });
    const b = S.toArchivedPlan(PLAN, RUN, { id: 'b', name: 'second' });
    expect(lib.add(a)).toBe(true);
    expect(lib.add(b)).toBe(true);
    expect(lib.list().map(r => r.id)).toEqual(['b', 'a']);
    lib.add(S.toArchivedPlan(PLAN, RUN, { id: 'a', name: 'first-updated' }));
    expect(lib.list().map(r => r.id)).toEqual(['a', 'b']);
    expect(lib.list()).toHaveLength(2);
  });

  it('caps at BLUEPRINT_ARCHIVE_MAX — the oldest falls off, never the newest', () => {
    for (let i = 0; i < S.BLUEPRINT_ARCHIVE_MAX + 3; i++) {
      lib.add(S.toArchivedPlan(PLAN, RUN, { id: 'p' + i }));
    }
    const ids = lib.list().map(r => r.id);
    expect(ids).toHaveLength(S.BLUEPRINT_ARCHIVE_MAX);
    expect(ids[0]).toBe('p' + (S.BLUEPRINT_ARCHIVE_MAX + 2)); // newest kept
    expect(ids).not.toContain('p0');                          // oldest evicted
  });

  it('add() returns FALSE on quota exhaustion instead of swallowing it', () => {
    store.full = true;
    expect(lib.add(S.toArchivedPlan(PLAN, RUN, { id: 'x' }))).toBe(false);
  });

  it('refuses to read OR overwrite an envelope from a NEWER build (downgrade-safe)', () => {
    store.setItem(S.BLUEPRINT_ARCHIVE_KEY, JSON.stringify({ v: 99, plans: [{ id: 'future' }] }));
    expect(lib.list()).toEqual([]);          // unreadable, not mis-read
    expect(lib.isFrozen()).toBe(true);
    expect(lib.add(S.toArchivedPlan(PLAN, RUN, { id: 'y' }))).toBe(false); // never clobbers
    expect(JSON.parse(store.getItem(S.BLUEPRINT_ARCHIVE_KEY)).plans[0].id).toBe('future');
  });

  it('a corrupt envelope degrades to empty, never throws', () => {
    store.setItem(S.BLUEPRINT_ARCHIVE_KEY, '{not json');
    expect(lib.list()).toEqual([]);
  });

  it('uses its OWN key — the live run envelope is never touched', () => {
    lib.add(S.toArchivedPlan(PLAN, RUN, { id: 'z' }));
    expect(store._raw.has('alloflow-blueprint-run-v1')).toBe(false);
  });
});

describe('host wiring guardrails', () => {
  it.each(HOSTS)('%s defines the handlers it threads (red-team iii)', (file) => {
    const src = read(file);
    expect((src.match(/const archiveLivePlan = /g) || []).length).toBe(1);
    expect((src.match(/const handleRestoreArchivedPlan = /g) || []).length).toBe(1);
    expect((src.match(/const handleDeleteArchivedPlan = /g) || []).length).toBe(1);
  });

  it.each(HOSTS)('%s has exactly ONE demotion implementation, used by hydrate AND restore', (file) => {
    const src = read(file);
    expect((src.match(/status === 'running' \|\| r\.status === 'planned'/g) || []).length).toBe(1);
    expect(src).toContain('_demoteInFlightRows(env.run.rows)');
    expect(src).toContain('_demoteInFlightRows(rec.run.rows)');
  });

  it.each(HOSTS)('%s restore refuses mid-run and never touches persistedLessonDNA', (file) => {
    const src = read(file);
    const fn = src.slice(src.indexOf('const handleRestoreArchivedPlan'), src.indexOf('const handleDeleteArchivedPlan'));
    expect(fn).toContain('if (isExecutingBlueprint)');
    // The DA-leak class: a restore is a view of an old plan, not a workspace
    // time machine. Retargeting ambient DNA here would leak it app-wide.
    expect(fn).not.toContain('setPersistedLessonDNA');
  });

  it.each(HOSTS)('%s workspace clear files the plan first and leaves the cabinet alone (red-team iv)', (file) => {
    const src = read(file);
    const clear = src.slice(src.indexOf('const clearCanvasWorkspaceState'), src.indexOf('resetCanvasWorkspaceSettings();', src.indexOf('const clearCanvasWorkspaceState')));
    expect(clear.indexOf('archiveLivePlan();')).toBeGreaterThan(-1);
    expect(clear.indexOf('archiveLivePlan();')).toBeLessThan(clear.indexOf('setActiveBlueprint(null)'));
    expect(clear).not.toContain('BLUEPRINT_ARCHIVE');
  });

  it.each(HOSTS)('%s template apply files the outgoing plan before replacing it', (file) => {
    const src = read(file);
    const fn = src.slice(src.indexOf('const handleApplyLessonTemplate'), src.indexOf('const handleDeleteLessonTemplate'));
    expect(fn.indexOf('archiveLivePlan();')).toBeGreaterThan(-1);
    expect(fn.indexOf('archiveLivePlan();')).toBeLessThan(fn.indexOf('setActiveBlueprint(S.applyLessonTemplate'));
  });

  it.each(HOSTS)('%s threads the archive through BOTH consumer surfaces', (file) => {
    const src = read(file);
    // udl_chat deps object and UDLGuideModal props object.
    expect(src).toContain('archiveLivePlan, setActiveBlueprint, setActiveView, setAdventureInputMode');
    expect(src).toContain('archivedPlans, handleRestoreArchivedPlan, handleDeleteArchivedPlan, archiveLivePlan');
  });
});

describe('module wiring guardrails (red-team i + ii)', () => {
  const UDL = ['udl_chat_source.jsx', 'udl_chat_module.js', 'desktop/web-app/public/udl_chat_module.js'];
  const MODALS = ['view_misc_modals_source.jsx', 'view_misc_modals_module.js', 'desktop/web-app/public/view_misc_modals_module.js'];

  it.each(UDL)('%s archives (guarded) before BOTH new-plan installs', (file) => {
    const src = read(file);
    expect((src.match(/typeof archiveLivePlan === ["']function["']/g) || []).length).toBe(2);
    // Order: the archive call precedes each install.
    let idx = 0;
    for (let i = 0; i < 2; i++) {
      const a = src.indexOf('archiveLivePlan();', idx);
      const b = src.indexOf('setActiveBlueprint(config);', idx);
      expect(a).toBeGreaterThan(-1);
      expect(a).toBeLessThan(b);
      idx = b + 1;
    }
  });

  it('udl_chat destructures archiveLivePlan from deps — not a free identifier', () => {
    const src = read('udl_chat_source.jsx');
    const destructure = src.slice(0, src.indexOf('} = deps;'));
    expect(destructure).toContain('archiveLivePlan,');
  });

  it.each(MODALS)('%s archives (guarded) on BOTH cancel paths', (file) => {
    const src = read(file);
    expect((src.match(/typeof archiveLivePlan === ["']function["']/g) || []).length).toBe(2);
  });

  it('modal destructures every archive prop it renders', () => {
    const src = read('view_misc_modals_source.jsx');
    const destructure = src.slice(0, src.indexOf('} = props;'));
    for (const name of ['archivedPlans', 'handleRestoreArchivedPlan', 'handleDeleteArchivedPlan', 'archiveLivePlan']) {
      expect(destructure).toContain(name);
    }
  });

  it('archive picker adds NO hooks below the early return (conditional-hook crash class)', () => {
    const src = read('view_misc_modals_source.jsx');
    const earlyReturn = src.indexOf('return null;');
    const picker = src.indexOf('bp-archive-picker');
    expect(picker).toBeGreaterThan(earlyReturn);
    const pickerBlock = src.slice(picker, src.indexOf('Restored-plan mount', picker));
    expect(pickerBlock).not.toMatch(/use(State|Effect|Ref|Memo|Callback)\(/);
  });

  it('picker is hidden while a plan is live (same rule as the template picker)', () => {
    const src = read('view_misc_modals_source.jsx');
    expect(src).toMatch(/!activeBlueprint && Array\.isArray\(archivedPlans\)/);
  });
});
