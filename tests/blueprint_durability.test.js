// Stage 4 — blueprint durability.
//
// The plan and its run record now survive a reload. Three things had to be
// right, and each one is a defect class the examination's red team named:
//
//  1. The envelope carries its OWN version. The agent-core contract's
//     SCHEMA_VERSION hard-fails validation on any value but '1.0' with no
//     migration path — borrowing it would make a future bump UNREADABLE
//     instead of upgradable.
//  2. Persistence goes through an EFFECT, not a value-shaped setter. The
//     executor updates the run with the updater form
//     (setBlueprintExecutionResult(prev => ...)); a setPersistedLessonDNA-shaped
//     setter would JSON.stringify a *callback* and write the literal string
//     "undefined", which JSON.parse then throws on, silently.
//  3. A run interrupted by the tab closing must NOT rehydrate as 'running' —
//     that is a spinner that never resolves on a row that can never be rebuilt.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');
const HOSTS = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];

// The host hydration logic lives inside the React component, so exercise the
// pure part of it here against the same rules the host applies.
const REHYDRATE = (input, storeVersion = 2) => {
  if (!input || typeof input !== 'object') return null;
  const hasVersion = Object.prototype.hasOwnProperty.call(input, 'v');
  const numericVersion = Number(input.v);
  if (hasVersion && (!Number.isInteger(numericVersion) || numericVersion < 0 || numericVersion > storeVersion)) return null;
  const hasEnvelopeShape = Object.prototype.hasOwnProperty.call(input, 'plan') || Object.prototype.hasOwnProperty.call(input, 'run');
  let env = input;
  if (!hasEnvelopeShape && Array.isArray(input.resourcePlan)) env = { plan: input, run: null };
  else if (!hasEnvelopeShape) return null;
  if (!env.run || !env.run.rows) return { plan: env.plan || null, run: null };
  const rows = {};
  Object.keys(env.run.rows).forEach((k) => {
    const r = env.run.rows[k];
    rows[k] = (r && (r.status === 'running' || r.status === 'planned'))
      ? Object.assign({}, r, { status: 'interrupted' })
      : r;
  });
  return { plan: env.plan || null, run: Object.assign({}, env.run, { rows, done: true, restored: true }) };
};

const ENVELOPE = {
  v: 1,
  savedAt: '2026-07-28T12:00:00.000Z',
  plan: { resourcePlan: [{ tool: 'glossary', directive: 'g', uiId: 'glossary-0' }] },
  run: {
    rows: {
      'analysis-0': { uiId: 'analysis-0', tool: 'analysis', status: 'landed' },
      'glossary-1': { uiId: 'glossary-1', tool: 'glossary', status: 'running' },
      'quiz-2': { uiId: 'quiz-2', tool: 'quiz', status: 'planned' },
      'image-3': { uiId: 'image-3', tool: 'image', status: 'failed' },
    },
    done: false,
  },
};

describe('rehydration rules', () => {
  it('restores the plan', () => {
    expect(REHYDRATE(ENVELOPE).plan.resourcePlan[0].uiId).toBe('glossary-0');
  });

  it('demotes running AND planned rows to interrupted', () => {
    const rows = REHYDRATE(ENVELOPE).run.rows;
    expect(rows['glossary-1'].status).toBe('interrupted'); // was running
    expect(rows['quiz-2'].status).toBe('interrupted');     // was planned
  });

  it('leaves settled rows alone', () => {
    const rows = REHYDRATE(ENVELOPE).run.rows;
    expect(rows['analysis-0'].status).toBe('landed');
    expect(rows['image-3'].status).toBe('failed');
  });

  it('marks the restored run done, so nothing waits on a dead generation', () => {
    const out = REHYDRATE(ENVELOPE).run;
    expect(out.done).toBe(true);
    expect(out.restored).toBe(true);
  });

  it('migrates v1 but ignores future or malformed envelopes', () => {
    expect(REHYDRATE(ENVELOPE).plan).toBeTruthy();
    expect(REHYDRATE(Object.assign({}, ENVELOPE, { v: 3 }))).toBeNull();
    expect(REHYDRATE(Object.assign({}, ENVELOPE, { v: 'unknown' }))).toBeNull();
    expect(REHYDRATE(null)).toBeNull();
    expect(REHYDRATE({})).toBeNull();
  });

  it('survives a plan with no run record yet', () => {
    const out = REHYDRATE({ v: 1, plan: ENVELOPE.plan });
    expect(out.plan).toBeTruthy();
    expect(out.run).toBeNull();
  });
});

describe('durability wiring guardrails', () => {
  it.each(HOSTS)('%s versions the envelope independently of the contract', (file) => {
    const src = read(file);
    expect(src).toContain("const ALLO_BLUEPRINT_STORE_KEY = 'alloflow-blueprint-run-v1'");
    expect(src).toContain('const ALLO_BLUEPRINT_STORE_VERSION = 2');
    expect(src).toContain('_migrateBlueprintEnvelope(JSON.parse(raw))');
    expect(src).toContain('if (!env) return;');
    // Must not reuse the contract's version constant for storage.
    expect(src).not.toMatch(/ALLO_BLUEPRINT_STORE_VERSION\s*=\s*SCHEMA_VERSION/);
  });

  it.each(HOSTS)('%s persists via an effect, keeping the updater form safe', (file) => {
    const src = read(file);
    // The executor calls setBlueprintExecutionResult(prev => ...). A wrapper
    // that stringified its argument would corrupt the store.
    expect(src).toContain('}, [activeBlueprint, blueprintExecutionResult]);');
    expect(src).toContain('_blueprintHydratedRef');
    // Never write before the first read, or boot would clobber the save.
    expect(src).toContain('if (!_blueprintHydratedRef.current) return;');
  });

  it.each(HOSTS)('%s demotes in-flight rows on restore', (file) => {
    const src = read(file);
    expect(src).toMatch(/status === 'running' \|\| r\.status === 'planned'/);
    expect(src).toContain("{ status: 'interrupted' }");
  });

  it.each(HOSTS)('%s clears the plan with the workspace it belongs to', (file) => {
    const src = read(file);
    const clear = src.slice(src.indexOf('const clearCanvasWorkspaceState'), src.indexOf('resetCanvasWorkspaceSettings();', src.indexOf('const clearCanvasWorkspaceState')));
    expect(clear).toContain('setActiveBlueprint(null)');
    expect(clear).toContain('setBlueprintExecutionResult(null)');
  });

  // "Persisting data without a mount is an invisible plan."
  it.each(['view_misc_modals_source.jsx', 'view_misc_modals_module.js',
           'desktop/web-app/public/view_misc_modals_module.js'])(
    '%s mounts a restored plan from state, not from a chat message', (file) => {
      const src = read(file);
      expect(src).toMatch(/activeBlueprint && !\(udlMessages \|\| \[\]\)\.some/);
      expect(src).toContain('blueprint.restored_notice');
    });
});

// ── Blueprint output is filed into the active unit ──
// Verified 2026-07-29: generate_dispatcher_source.jsx has ZERO unitId
// references and the only writer is handleMoveToUnit — ONE resource at a time.
// So an eight-step plan landed eight resources in "uncategorized" and the
// teacher re-filed each by hand. Units are the app's one grouping system, and
// a unit holds MULTIPLE packs, so a plan files INTO a unit; it never owns one.
describe('finished runs file themselves into the active unit', () => {
  const rd = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');
  const HOSTS3 = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];

  it.each(HOSTS3)('%s has exactly one filing effect', (file) => {
    const src = rd(file);
    expect((src.match(/File a finished run's resources into the active unit/g) || []).length).toBe(1);
  });

  it.each(HOSTS3)('%s never overwrites a hand-filed resource', (file) => {
    const src = rd(file);
    const fn = src.slice(src.indexOf("File a finished run's resources"), src.indexOf('// Reconcile the run record against history.'));
    // `|| item.unitId` short-circuits: an item already in a unit is skipped.
    expect(fn).toContain('!target.has(item.id) || item.unitId');
  });

  it.each(HOSTS3)('%s only files real units, never the "all"/"uncategorized" pseudo-ids', (file) => {
    const src = rd(file);
    const fn = src.slice(src.indexOf("File a finished run's resources"), src.indexOf('// Reconcile the run record against history.'));
    expect(fn).toMatch(/activeUnitId === 'all' \|\| activeUnitId === 'uncategorized'/);
  });

  it.each(HOSTS3)('%s only files resources that actually landed', (file) => {
    const src = rd(file);
    const fn = src.slice(src.indexOf("File a finished run's resources"), src.indexOf('// Reconcile the run record against history.'));
    expect(fn).toMatch(/status === 'landed'/);
    expect(fn).toContain('!r.resourceMissing');
  });
});
