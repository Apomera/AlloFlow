// Blueprint commands in the AlloBot palette.
//
// Before this, the palette could only START a lesson flow (`create_lesson`).
// Everything the blueprint gained since — execute, rebuild one row, start from
// a saved template — was reachable only by clicking the card. These close that
// gap, and because commands are gated by `when`, a command that cannot work
// never appears.
//
// Deliberately absent: a "save as template" command. Saving runs a per-directive
// review (which instructions suit any topic vs. which describe THIS lesson) and
// a one-shot command would bypass it, quietly baking the current lesson's
// content into a reusable template.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let AC;
beforeAll(() => {
  // The commands module needs React on window at load time (same stub the
  // existing allo_commands_plan suite uses).
  const noop = () => {};
  vi.stubGlobal('React', {
    createElement: noop,
    useState: () => [undefined, noop],
    useEffect: noop,
    useRef: () => ({ current: null }),
    useMemo: noop,
    useCallback: (f) => f,
  });
  loadAlloModule('allo_commands_module.js');
  AC = window.AlloModules?.AlloCommands;
  if (!AC?.buildAlloCommands) throw new Error('AlloCommands failed to register');
});

const PLAN_STEPS = [
  { position: 1, tool: 'analysis', uiId: 'analysis-0' },
  { position: 2, tool: 'image', uiId: 'image-1' },
  { position: 3, tool: 'image', uiId: 'image-2' },
];

const makeCtx = (over = {}) => Object.assign({
  hasActiveBlueprint: true,
  hasSourceOrAnalysis: true,
  runBlueprint: vi.fn(),
  startLessonFlow: vi.fn(),
  planFullPack: vi.fn(async () => true),
  generateFullPack: vi.fn(async () => true),
  fullPackPlanReady: false,
  rebuildBlueprintStep: vi.fn(() => ({ ok: true })),
  blueprintStepList: () => PLAN_STEPS,
  lessonTemplateNames: () => [{ id: 't1', name: 'Vocabulary-first' }, { id: 't2', name: 'Close reading' }],
  applyLessonTemplateByName: vi.fn((n) => (String(n).toLowerCase().includes('vocab') ? { id: 't1', name: 'Vocabulary-first' } : null)),
}, over);

const find = (ctx, id) => (AC.buildAlloCommands(ctx, { includeGated: true }) || []).find((c) => c && c.id === id);
const visible = (ctx) => (AC.buildAlloCommands(ctx, { includeGated: true }) || [])
  .filter((c) => c && (typeof c.when !== 'function' || c.when(ctx)))
  .map((c) => c.id);

describe('the commands exist and are gated', () => {
  it('registers blueprint entry, execution, rebuild, template, and Full Pack commands', () => {
    for (const id of ['start_lesson_blueprint', 'run_lesson_blueprint', 'rebuild_lesson_step', 'apply_lesson_template', 'plan_full_pack', 'generate_full_pack']) {
      expect(find(makeCtx(), id), id).toBeTruthy();
    }
  });

  it('allows plan-only Full Pack previews in demos but gates generation and Auto-Fill', () => {
    expect(AC.getCommandContract('plan_full_pack')).toMatchObject({
      demoSafe: true,
      interaction: 'automatic',
      requires: ['source'],
      produces: ['full-pack-plan'],
    });
    expect(AC.getCommandContract('generate_full_pack')).toMatchObject({ demoSafe: false, interaction: 'guided', terminal: true });
    expect(AC.getCommandContract('start_lesson_blueprint')).toMatchObject({ demoSafe: false, interaction: 'guided', terminal: true });
  });

  it('hides execute and rebuild when there is no plan', () => {
    const ids = visible(makeCtx({ hasActiveBlueprint: false }));
    expect(ids).not.toContain('run_lesson_blueprint');
    expect(ids).not.toContain('rebuild_lesson_step');
  });

  it('hides the template command when the library is empty', () => {
    expect(visible(makeCtx({ lessonTemplateNames: () => [] }))).not.toContain('apply_lesson_template');
  });

  it('shows them when the capabilities are present', () => {
    const ids = visible(makeCtx());
    expect(ids).toContain('run_lesson_blueprint');
    expect(ids).toContain('rebuild_lesson_step');
    expect(ids).toContain('apply_lesson_template');
  });

  // The safeguard is the point, so pin its absence.
  it('does NOT offer a one-shot save-as-template', () => {
    const ids = (AC.buildAlloCommands(makeCtx(), { includeGated: true }) || []).map((c) => c.id);
    expect(ids).not.toContain('save_lesson_template');
  });
});

describe('running them', () => {
  it('executes the plan', () => {
    const ctx = makeCtx();
    const out = find(ctx, 'run_lesson_blueprint').run(ctx, {});
    expect(ctx.runBlueprint).toHaveBeenCalledTimes(1);
    expect(String(out)).toMatch(/generat/i);
  });

  it('asks which step when none is named, listing them by position', () => {
    const ctx = makeCtx();
    const out = find(ctx, 'rebuild_lesson_step').run(ctx, {});
    expect(ctx.rebuildBlueprintStep).not.toHaveBeenCalled();
    expect(String(out)).toContain('1. analysis');
    expect(String(out)).toContain('2. image');
    expect(String(out)).toContain('3. image');
  });

  it('rebuilds the step the teacher named, by POSITION', () => {
    const ctx = makeCtx();
    find(ctx, 'rebuild_lesson_step').run(ctx, { step: 3 });
    // Position is what the teacher sees on the card; the host maps it to the
    // Stage-2 uiId. The palette must never carry an index into the executor.
    expect(ctx.rebuildBlueprintStep).toHaveBeenCalledWith(3);
  });

  it('reports a step it cannot find', () => {
    const ctx = makeCtx({ rebuildBlueprintStep: vi.fn(() => null) });
    expect(String(find(ctx, 'rebuild_lesson_step').run(ctx, { step: 99 }))).toMatch(/could not find/i);
  });

  it('lists templates when none is named', () => {
    const ctx = makeCtx();
    const out = find(ctx, 'apply_lesson_template').run(ctx, {});
    expect(ctx.applyLessonTemplateByName).not.toHaveBeenCalled();
    expect(String(out)).toContain('Vocabulary-first');
    expect(String(out)).toContain('Close reading');
  });

  it('applies a template by fuzzy name', () => {
    const ctx = makeCtx();
    const out = find(ctx, 'apply_lesson_template').run(ctx, { name: 'vocab' });
    expect(ctx.applyLessonTemplateByName).toHaveBeenCalledWith('vocab');
    expect(String(out)).toContain('Vocabulary-first');
  });

  it('reports a template it cannot find', () => {
    const ctx = makeCtx();
    expect(String(find(ctx, 'apply_lesson_template').run(ctx, { name: 'nope' }))).toMatch(/could not find/i);
  });

  it('opens the production Auto-Fill lesson flow', () => {
    const ctx = makeCtx();
    const out = find(ctx, 'start_lesson_blueprint').run(ctx, { topic: 'weather', grade: '4' });
    expect(ctx.startLessonFlow).toHaveBeenCalledWith({ topic: 'weather', grade: '4' });
    expect(String(out)).toMatch(/blueprint mode is open/i);
  });

  it('prepares a Full Pack plan and generates only after the plan is ready', async () => {
    const planning = makeCtx();
    expect(String(await find(planning, 'plan_full_pack').runAsync(planning))).toMatch(/plan ready/i);
    expect(planning.planFullPack).toHaveBeenCalledOnce();

    const ready = makeCtx({ fullPackPlanReady: true });
    expect(String(await find(ready, 'generate_full_pack').runAsync(ready))).toMatch(/generating the reviewed/i);
    expect(ready.generateFullPack).toHaveBeenCalledOnce();
  });
});

// ── Host capability wiring ──
const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');
const HOSTS = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];

describe('host exposes the capabilities the commands gate on', () => {
  it.each(HOSTS)('%s wires every capability', (file) => {
    const src = read(file);
    for (const cap of ['hasActiveBlueprint', 'runBlueprint', 'planFullPack', 'fullPackPlanReady', 'generateFullPack', 'rebuildBlueprintStep',
                       'blueprintStepList', 'lessonTemplateNames', 'applyLessonTemplateByName']) {
      expect(src, cap).toContain(cap + ':');
    }
  });

  // A positional index reaching the executor would rebuild the wrong row on a
  // reordered plan — the exact failure the Stage 2 join key exists to prevent.
  it.each(HOSTS)('%s translates step POSITION to uiId before calling the handler', (file) => {
    const src = read(file);
    const fn = src.slice(src.indexOf('rebuildBlueprintStep: (position)'), src.indexOf('applyLessonTemplateByName:'));
    expect(fn.length).toBeGreaterThan(0);
    expect(fn).toContain('handleRebuildBlueprintStep(row.uiId || row.stepId)');
  });
});

describe('commands module copy-sync', () => {
  it.each(['allo_commands_source.jsx', 'allo_commands_module.js',
           'desktop/web-app/public/allo_commands_module.js'])('%s carries the commands', (file) => {
    const src = read(file);
    for (const id of ['start_lesson_blueprint', 'run_lesson_blueprint', 'plan_full_pack', 'generate_full_pack', 'rebuild_lesson_step', 'apply_lesson_template']) {
      expect(src, id).toContain(id);
    }
  });
});
