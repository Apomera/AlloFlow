import { beforeAll, afterEach, afterAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let buildContext;
beforeAll(() => {
  vi.stubGlobal('React', { createElement: () => null });
  loadAlloModule('allo_command_context_module.js');
  buildContext = window.AlloModules.AlloCommandContext;
});
afterEach(() => { delete window.AlloModules.ErrorReporter; });
afterAll(() => vi.unstubAllGlobals());

function context() {
  const addToast = vi.fn();
  const ctx = buildContext({
    __live: {}, _alloCmdCtxRef: { current: null }, _contextualSuggestionRef: { current: null },
    _alloStudentSafeResources: () => [], _alloVoiceInputAvailable: () => false,
    studentProjectSettings: {}, isTeacherMode: true, t: () => '',
    activeSidebarTab: 'create', activeView: 'input', inputText: '', hasSourceOrAnalysis: false,
    addToast,
  });
  return { ctx, addToast };
}

describe('Report a problem command entry', () => {
  it('uses the manual report entry rather than toggling the current diagnostics tab', () => {
    const openManualReport = vi.fn();
    const openPanel = vi.fn();
    window.AlloModules.ErrorReporter = { openManualReport, openPanel };
    const { ctx, addToast } = context();
    ctx.openErrorReporter();
    expect(openManualReport).toHaveBeenCalledOnce();
    expect(openPanel).not.toHaveBeenCalled();
    expect(addToast).not.toHaveBeenCalled();
  });

  it('explicitly opens Errors with an older cached reporter', () => {
    const openPanel = vi.fn();
    window.AlloModules.ErrorReporter = { openPanel };
    context().ctx.openErrorReporter();
    expect(openPanel).toHaveBeenCalledExactlyOnceWith('errors');
  });

  it('explains when the reporter has not loaded', () => {
    const { ctx, addToast } = context();
    ctx.openErrorReporter();
    expect(addToast).toHaveBeenCalledExactlyOnceWith('The problem reporter is still loading — try again in a moment.', 'info');
  });
});
