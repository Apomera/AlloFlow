// AlloBot's command router once showed {"topic": "photosynthesis"} as its
// example, so a model could hand back that topic for a request that named none,
// and "write source text" would write about photosynthesis every time, setting
// the Topic field to it as well. Since 2026-10-30 a topic is kept only when one
// of its words appears in what the user typed. ALLO_COMMANDS_CANDIDATE points at
// a saved copy for mutation checks.
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let commands, buildContext;
beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', { createElement: noop, useState: noop, useEffect: noop, useRef: noop, useMemo: noop, useCallback: (f) => f });
  loadAlloModule(process.env.ALLO_COMMANDS_CANDIDATE || 'allo_commands_module.js');
  loadAlloModule('allo_command_context_module.js');
  commands = window.AlloModules.AlloCommands;
  buildContext = window.AlloModules.AlloCommandContext;
});
afterAll(() => vi.unstubAllGlobals());

function route(text, reply) {
  const handleGenerateSource = vi.fn(async () => ({}));
  const setSourceTopic = vi.fn();
  const deps = {
    __live: { callGemini: vi.fn(async () => JSON.stringify(reply)) },
    _alloCmdCtxRef: { current: null }, _contextualSuggestionRef: { current: null },
    _alloStudentSafeResources: () => [], _alloVoiceInputAvailable: () => false,
    studentProjectSettings: {}, isTeacherMode: true, t: () => '', activeSidebarTab: 'create', activeView: 'input',
    inputText: 'Our town garden opened this spring.', hasSourceOrAnalysis: true,
    setShowWizard: vi.fn(), setIsBotVisible: vi.fn(), setShowUDLGuide: vi.fn(), handleAutoFillToggle: vi.fn(),
    handleGenerateSource, setSourceTopic,
  };
  return { done: commands.routeUtterance(buildContext(deps), text, { allowAi: true }), handleGenerateSource, setSourceTopic, deps };
}

describe('AlloBot keeps only topics the user named', () => {
  it('drops a topic the user never typed', async () => {
    const r = route('could you produce some fresh material', { commandId: 'generate_source_text', params: { topic: 'photosynthesis' }, confidence: 0.95 });
    await r.done;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(r.handleGenerateSource).toHaveBeenCalledWith({});
    expect(r.setSourceTopic).not.toHaveBeenCalled();
  });

  it('keeps a topic the user did name', async () => {
    const r = route('could you produce some fresh material on volcanoes', { commandId: 'generate_source_text', params: { topic: 'Volcanoes' }, confidence: 0.95 });
    await r.done;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(r.setSourceTopic).toHaveBeenCalledWith('Volcanoes');
    expect(r.handleGenerateSource).toHaveBeenCalledWith({ topic: 'Volcanoes' });
  });

  it('no longer shows the model a concrete example topic to copy', async () => {
    const r = route('could you produce some fresh material', { commandId: null, params: {}, confidence: 0 });
    await r.done;
    const prompt = r.deps.__live.callGemini.mock.calls[0][0];
    expect(prompt.toLowerCase().includes('photosynthesis')).toBe(false);
    expect(prompt).toContain('Never copy an example value');
  });
});
