import { beforeAll, describe, it, expect, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
let AC;
beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', { createElement: noop, useState: () => [null, noop], useEffect: noop, useRef: () => ({ current: null }), useMemo: noop, useCallback: fn => fn });
  loadAlloModule('allo_commands_module.js'); AC = window.AlloModules.AlloCommands;
});
const context = overrides => ({ commandAudience: 'teacher', isTeacherMode: true, canReviseLesson: true, startLessonRevision: vi.fn(() => true), ...overrides });
const command = ctx => AC.buildAlloCommands(ctx).find(item => item.id === 'open_lesson_revision');
describe('native lesson revision command entry', () => {
  it('offers a distinct reviewed revision workflow', () => { expect(command(context())).toMatchObject({ id: 'open_lesson_revision', roles: 'teacher' }); });
  it('requires live authoring capability', () => { const ctx = context({ canReviseLesson: false }); const cmd = command(ctx); expect(!cmd || !cmd.when(ctx)).toBe(true); });
  it('requires the actual start handler', () => { const ctx = context({ startLessonRevision: null }); const cmd = command(ctx); expect(!cmd || !cmd.when(ctx)).toBe(true); });
  for (const audience of ['student', 'parent', 'independent']) it('does not expose teacher revision to ' + audience, () => { expect(command(context({ commandAudience: audience, isTeacherMode: audience !== 'student' }))).toBeUndefined(); });
  it('only opens selection and does not apply anything', () => {
    const ctx = context({ applyLessonRevision: vi.fn() }); const result = command(ctx).run(ctx);
    expect(ctx.startLessonRevision).toHaveBeenCalledOnce(); expect(ctx.applyLessonRevision).not.toHaveBeenCalled(); expect(result).toContain('review');
  });
  it('honestly reports a refused start', () => { const ctx = context({ startLessonRevision: () => false }); expect(command(ctx).run(ctx).ok).toBe(false); });
  it('cannot claim output production or continue an autonomous command chain', () => { expect(AC.getCommandContract('open_lesson_revision')).toMatchObject({ demoSafe: false, interaction: 'interactive', terminal: true, produces: [] }); });
});
