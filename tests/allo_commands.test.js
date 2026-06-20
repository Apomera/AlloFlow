// Unit tests for window.AlloModules.AlloCommands (allo_commands_module.js) —
// the natural-language / voice command router that maps a teacher/student
// utterance to an app action. Misrouting (or running a DESTRUCTIVE command
// without confirmation) is a real correctness/safety issue, so the scoring,
// role filtering, and the destructive-confirmation gate are worth pinning.
//
// The module hard-returns without window.React (it also builds a React command
// palette), so we stub React in beforeAll. The functions under test
// (scoreCommand / buildAlloCommands / routeUtterance) never touch React.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let AC;
beforeAll(() => {
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
  AC = window.AlloModules.AlloCommands;
  if (!AC) throw new Error('AlloCommands failed to register');
});
afterAll(() => { vi.unstubAllGlobals(); });

describe('scoreCommand', () => {
  const cmd = { label: 'Open the educator hub', aliases: ['hub'] };
  it('scores an exact label/alias match 100', () => {
    expect(AC.scoreCommand(cmd, 'hub')).toBe(100);
    expect(AC.scoreCommand(cmd, 'open the educator hub')).toBe(100);
  });
  it('scores prefix 80, word-prefix 60, substring 40', () => {
    expect(AC.scoreCommand(cmd, 'open')).toBe(80);
    expect(AC.scoreCommand(cmd, 'educa')).toBe(60);
    expect(AC.scoreCommand({ label: 'translate' }, 'ansl')).toBe(40);
  });
  it('falls back to the hint (30), then 0', () => {
    expect(AC.scoreCommand({ label: 'X', hint: 'make text bigger' }, 'bigger')).toBe(30);
    expect(AC.scoreCommand({ label: 'X' }, 'zzz')).toBe(0);
  });
  it('returns 1 for an empty query', () => {
    expect(AC.scoreCommand(cmd, '')).toBe(1);
  });
});

describe('buildAlloCommands (role + when filtering)', () => {
  const ids = (ctx) => AC.buildAlloCommands(ctx).map((c) => c.id);
  it('includes teacher + all-role commands for a default teacher ctx', () => {
    const got = ids({});
    expect(got).toContain('open_educator_hub'); // roles: 'teacher'
    expect(got).toContain('open_learning_hub'); // roles: 'all'
  });
  it('excludes teacher-only commands in independent/student mode', () => {
    const got = ids({ isIndependentMode: true });
    expect(got).not.toContain('open_educator_hub');
    expect(got).toContain('open_learning_hub');
  });
  it('applies when() predicates (a gated command appears only when its condition holds)', () => {
    expect(ids({})).not.toContain('pipeline_new_doc'); // when: pipelineOpen
    expect(ids({ pipelineOpen: true })).toContain('pipeline_new_doc');
  });
});

describe('routeUtterance', () => {
  it('returns null for empty or over-long input', async () => {
    expect(await AC.routeUtterance({}, '')).toBeNull();
    expect(await AC.routeUtterance({}, 'x'.repeat(201))).toBeNull();
  });

  it('routes a "where is X" utterance to ctx.whereIs', async () => {
    const ctx = { whereIs: (q) => 'It is in the sidebar: ' + q };
    const r = await AC.routeUtterance(ctx, 'where is the glossary');
    expect(r).toMatchObject({ handled: true, commandId: 'where_is', via: 'where-is' });
    expect(r.narration).toContain('glossary');
  });

  it('dispatches a matched command deterministically and runs it', async () => {
    const setShowEducatorHub = vi.fn();
    const r = await AC.routeUtterance({ setShowEducatorHub }, 'open the educator hub');
    expect(r).toMatchObject({ handled: true, commandId: 'open_educator_hub', via: 'deterministic' });
    expect(setShowEducatorHub).toHaveBeenCalledWith(true);
  });

  it('gates a destructive command behind confirmation', async () => {
    const startNewPdfAudit = vi.fn();
    const ctx = { pipelineOpen: true, startNewPdfAudit };
    const r1 = await AC.routeUtterance(ctx, 'start over with a new document');
    expect(r1.commandId).toBe('pipeline_new_doc');
    expect(startNewPdfAudit).not.toHaveBeenCalled(); // not confirmed → not run
    await AC.routeUtterance(ctx, 'start over with a new document', { confirmed: true });
    expect(startNewPdfAudit).toHaveBeenCalled(); // confirmed → run
  });
});
