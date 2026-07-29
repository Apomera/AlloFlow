// Stage 5 — rebuild ONE plan row.
//
// Only possible because of the Stage 2 join key: the row is addressed by uiId,
// so a rebuild cannot hit the wrong resource on a reordered plan, and two rows
// of the same tool stay distinguishable — which is exactly what `nulls` (a flat
// list of tool names) could never express.
//
// The payoff chain: rebuild -> new resourceId -> the row drops out of
// run.audit.resourceIds -> its audit badge flips to "Not in audit". Staleness
// falls out of the identity model with no invalidation bookkeeping.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let PhaseO;
beforeAll(() => {
  loadAlloModule('phase_o_misc_handlers_module.js');
  PhaseO = window.AlloModules?.PhaseOHandlers;
  if (!PhaseO?.handleRebuildBlueprintStep) throw new Error('handleRebuildBlueprintStep failed to register');
});

// Two image rows on purpose.
const PLAN = {
  resourcePlan: [
    { tool: 'analysis', directive: 'a', uiId: 'r-analysis' },
    { tool: 'image', directive: 'first diagram', uiId: 'r-image-1' },
    { tool: 'image', directive: 'second diagram', uiId: 'r-image-2' },
  ],
};

const makeDeps = (over = {}) => {
  const store = { run: over.run !== undefined ? over.run : { rows: {
    'r-analysis': { uiId: 'r-analysis', status: 'landed', resourceId: 'res-analysis' },
    'r-image-1': { uiId: 'r-image-1', status: 'landed', resourceId: 'res-img-1' },
    'r-image-2': { uiId: 'r-image-2', status: 'failed', resourceId: null },
  }, audit: { resourceIds: ['res-analysis', 'res-img-1'], reportId: 'rep', rowUiId: 'r-audit' } } };
  const apply = (prev, next) => (typeof next === 'function' ? next(prev) : next);
  const deps = {
    activeBlueprint: PLAN,
    blueprintExecutionResult: store.run,
    persistedLessonDNA: null,
    history: [],
    setBlueprintExecutionResult: (n) => { store.run = apply(store.run, n); },
    handleGenerate: over.handleGenerate || vi.fn(async (type) => ({ id: 'res-' + type + '-NEW', type, data: {} })),
    addToast: vi.fn(),
    t: () => undefined,
    warnLog: () => {},
  };
  return { deps, store };
};

describe('rebuilding a single row', () => {
  it('regenerates the addressed row with its own directive', async () => {
    const { deps } = makeDeps();
    await PhaseO.handleRebuildBlueprintStep(deps, 'r-image-2');
    expect(deps.handleGenerate).toHaveBeenCalledTimes(1);
    const [type, , , , cfg] = deps.handleGenerate.mock.calls[0];
    expect(type).toBe('image');
    // The SECOND image's directive — not the first's. This is the join key.
    expect(cfg.customInstructions).toBe('second diagram');
  });

  it('marks the row running, then landed with a NEW resourceId', async () => {
    const { deps, store } = makeDeps();
    await PhaseO.handleRebuildBlueprintStep(deps, 'r-image-2');
    const row = store.run.rows['r-image-2'];
    expect(row.status).toBe('landed');
    expect(row.resourceId).toBe('res-image-NEW');
    expect(row.rebuilt).toBe(true);
  });

  it('leaves every other row untouched', async () => {
    const { deps, store } = makeDeps();
    await PhaseO.handleRebuildBlueprintStep(deps, 'r-image-2');
    expect(store.run.rows['r-image-1'].resourceId).toBe('res-img-1');
    expect(store.run.rows['r-analysis'].resourceId).toBe('res-analysis');
  });

  // The staleness payoff, end to end.
  it('drops a rebuilt row out of the recorded audit scope', async () => {
    const { deps, store } = makeDeps();
    // r-image-1 was audited. Rebuild it.
    await PhaseO.handleRebuildBlueprintStep(deps, 'r-image-1');
    const covered = store.run.audit.resourceIds;
    const row = store.run.rows['r-image-1'];
    expect(covered).toContain('res-img-1');            // scope is unchanged…
    expect(row.resourceId).toBe('res-image-NEW');       // …but the row moved on
    expect(covered).not.toContain(row.resourceId);      // so it is no longer covered
  });

  it('records a failure without wiping the row', async () => {
    const { deps, store } = makeDeps({ handleGenerate: vi.fn(async () => null) });
    await PhaseO.handleRebuildBlueprintStep(deps, 'r-image-2');
    expect(store.run.rows['r-image-2'].status).toBe('failed');
    expect(store.run.rows['r-image-2'].tool).toBe('image');
  });

  it('survives a throwing generator', async () => {
    const { deps, store } = makeDeps({ handleGenerate: vi.fn(async () => { throw new Error('boom'); }) });
    await expect(PhaseO.handleRebuildBlueprintStep(deps, 'r-image-2')).resolves.toBeNull();
    expect(store.run.rows['r-image-2'].status).toBe('failed');
  });

  it('refuses a uiId that is no longer in the plan', async () => {
    const { deps } = makeDeps();
    const out = await PhaseO.handleRebuildBlueprintStep(deps, 'r-deleted');
    expect(out).toBeNull();
    expect(deps.handleGenerate).not.toHaveBeenCalled();
    expect(deps.addToast).toHaveBeenCalled();
  });

  it('is re-entrancy safe — a second rebuild cannot interleave', async () => {
    let release;
    const gate = new Promise((r) => { release = r; });
    const { deps } = makeDeps({ handleGenerate: vi.fn(async () => { await gate; return { id: 'res-slow', type: 'image' }; }) });
    const first = PhaseO.handleRebuildBlueprintStep(deps, 'r-image-1');
    const second = await PhaseO.handleRebuildBlueprintStep(deps, 'r-image-2');
    expect(second).toBeNull();                       // refused while one is in flight
    expect(deps.handleGenerate).toHaveBeenCalledTimes(1);
    release();
    await first;
    // …and the guard releases, so a later rebuild works.
    expect(await PhaseO.handleRebuildBlueprintStep(deps, 'r-image-2')).toBeTruthy();
  });
});

// ── Wiring guardrails ──
const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');
describe('rebuild wiring guardrails', () => {
  it.each(['phase_o_misc_handlers_source.jsx', 'phase_o_misc_handlers_module.js',
           'desktop/web-app/public/phase_o_misc_handlers_module.js'])(
    '%s exports the rebuild handler', (file) => {
      const src = read(file);
      expect(src).toContain('handleRebuildBlueprintStep');
      // Shares the full-run guard, or a rebuild could interleave with a run.
      expect(src).toMatch(/_blueprintRunInFlight/);
    });

  it.each(['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'])(
    '%s wraps and passes it to the modal', (file) => {
      const src = read(file);
      expect(src).toContain('const handleRebuildBlueprintStep = async (uiId)');
      // Assert PRESENCE in the modal's prop list, not adjacency to a
      // neighbour — pinning "handleRebuildBlueprintStep, aiStandardQuery"
      // broke the moment the template props were inserted between them,
      // reporting a failure when the wiring was correct.
      const props = src.slice(src.indexOf('window.AlloModules.UDLGuideModal, {'));
      expect(props.slice(0, 1200)).toContain('handleRebuildBlueprintStep');
    });

  it.each(['view_misc_modals_source.jsx', 'view_misc_modals_module.js',
           'desktop/web-app/public/view_misc_modals_module.js'])(
    '%s passes onRebuildStep to BOTH card mounts', (file) => {
      const src = read(file);
      // The modal has TWO card mounts: the chat-message one and the Stage 4
      // restored-plan one. A rebuild button that works in one and not the other
      // is the kind of gap only a count catches.
      expect((src.match(/onRebuildStep/g) || []).length).toBe(2);
      // …and it must actually receive the handler, not an undefined prop.
      expect(src).toContain('handleRebuildBlueprintStep');
    });

  it.each(['persona_ui_source.jsx', 'persona_ui_module.js', 'desktop/web-app/public/persona_ui_module.js'])(
    '%s renders the rebuild control', (file) => {
      const src = read(file);
      expect(src).toContain('bp-rebuild-btn');
      // Never offered mid-generation, and never before a run has touched the row.
      expect(src).toMatch(/_status && _status !== 'running'/);
    });
});
