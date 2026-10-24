import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

// Early clicks: a host action that lands before its deferred module must wait for it, not throw
// "module not loaded - reload the page". Most actions already go through _alloAwaitModules; a
// review of the remaining throw sites found these still reachable from a first click:
//   - Run Blueprint (AgentCoreUIAdapter), the AI Guide's settings intent (GlossaryHelpers),
//     a hands-free chat turn (UdlChat), Lesson Plan's prompt builders (PromptsLibrary was not in
//     its wait), and History/Guided restore buttons (MiscHandlers).
//   - Render helpers called while a view paints (formatInlineText, renderOutlineContent,
//     renderInteractiveMap): they now show plain text / nothing and request the module; the host
//     re-renders when it registers.
// A module that IS present but missing the function is a real bug and must still throw.
const ANTI = readFileSync(resolve(process.cwd(), process.env.EARLY_CLICK_ANTI || 'AlloFlowANTI.txt'), 'utf8');

const slice = (from, to) => sliceBetween(ANTI, from, to, { file: 'AlloFlowANTI.txt' });

const AWAIT = slice('  const _alloAwaitModules = ', '  let __alloHostHandlersCache = null;');

function harness(source, names, extra) {
  const pending = {};
  const promoted = [];
  const toasts = [];
  const window = {
    AlloModules: {},
    __alloModuleRegistry: {},
    __alloPromoteModule: (name) => { promoted.push(name); return true; },
    __alloEnsureLazyModule: (name, promote, key) => {
      if (typeof promote === 'function') promote();
      if (window.AlloModules[key]) return Promise.resolve(window.AlloModules[key]);
      return new Promise((resolveFn, rejectFn) => { pending[key] = { resolveFn, rejectFn }; });
    },
  };
  const env = Object.assign({ window, addToast: (message, kind) => toasts.push([message, kind]) }, extra || {});
  const scope = new Proxy(env, {
    has: () => true,
    get: (target, name) => (name === Symbol.unscopables ? undefined : name in target ? target[name] : globalThis[name]),
  });
  // eslint-disable-next-line no-new-func
  const api = new Function('scope', 'with (scope) {\n' + AWAIT + source + '\nreturn { ' + names.join(', ') + ' };\n}')(scope);
  return {
    api, window, promoted, toasts,
    register(key, value) { window.AlloModules[key] = value; if (pending[key]) pending[key].resolveFn(value); },
    fail(key) { if (pending[key]) pending[key].rejectFn(Object.assign(new Error('offline'), { code: 'allo-lazy-module-failed' })); },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('actions wait for their module instead of throwing', () => {
  it('Run Blueprint waits for the agent adapter, then runs', async () => {
    const run = vi.fn(() => 'ran');
    const h = harness(slice('  const blueprintCreationRequestRef = useRef(', '  // Stage 5'), ['handleExecuteBlueprint'], {
      activeBlueprint: { id: 'plan' }, _alloPhaseOHandlersDeps: () => ({}), useRef: value => ({ current: value }),
      gradeLevel: '6', leveledTextLanguage: 'English', standardsInput: '', studentInterests: [],
    });
    Object.assign(h.window.AlloModules, { AgentCoreContracts: {}, AgentCoreBlueprintService: {}, GenerationMatrix: {}, PhaseOHandlers: { handleExecuteBlueprint: run } });
    const result = h.api.handleExecuteBlueprint();
    await flush();
    expect(run).not.toHaveBeenCalled();
    h.register('AgentCoreUIAdapter', { createUIAdapter: () => ({ prepareExecution: () => ({ ok: true, legacyConfig: { id: 'plan' } }) }) });
    await expect(result).resolves.toBe('ran');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('Run Blueprint with a broken adapter still reports it (no wait loop)', async () => {
    const h = harness(slice('  const blueprintCreationRequestRef = useRef(', '  // Stage 5'), ['handleExecuteBlueprint'], { activeBlueprint: {}, useRef: value => ({ current: value }) });
    Object.assign(h.window.AlloModules, { AgentCoreContracts: {}, AgentCoreBlueprintService: {}, GenerationMatrix: {}, PhaseOHandlers: {} });
    h.window.AlloModules.AgentCoreUIAdapter = {};
    await expect(h.api.handleExecuteBlueprint()).rejects.toThrow(/AgentCoreUIAdapter/);
  });

  it('a hands-free chat turn waits for the chat module and is noted once', async () => {
    const send = vi.fn(() => 'sent');
    const note = vi.fn();
    const h = harness(slice('  const _sendUdlToChat = (manualText = null) => {', '  const handleSendUDLMessage = async'), ['_sendUdlToChat'], {});
    h.window.__alloNoteSupport = note;
    let result;
    expect(() => { result = h.api._sendUdlToChat('hello'); }, 'the turn threw instead of waiting').not.toThrow();
    h.register('UdlChat', { handleSendUDLMessage: send });
    await expect(result).resolves.toBe('sent');
    expect(send.mock.calls[0][0]).toBe('hello');
    expect(note, 'the turn was logged twice (once before the wait, once after)').toHaveBeenCalledTimes(1);
  });

  it('the AI Guide settings intent waits for its helper, then reports the change', async () => {
    const applyAIConfig = vi.fn(() => ['Grade: 5th']);
    const setUdlMessages = vi.fn();
    const h = harness(slice('  const handleSettingsIntent = (intentData) => {', '  const captureIntentSnapshot'), ['handleSettingsIntent'], {
      applyAIConfig, setUdlMessages, t: (key) => (key === 'chat.settings_updated' ? 'Updated: {changes}' : key),
    });
    let result;
    expect(() => { result = h.api.handleSettingsIntent({ grade: '5th' }); }).not.toThrow();
    expect(applyAIConfig, 'applied settings before GlossaryHelpers existed (it answers "settings failed")').not.toHaveBeenCalled();
    h.register('GlossaryHelpers', { applyAIConfig: () => [] });
    await result;
    expect(applyAIConfig).toHaveBeenCalledWith({ grade: '5th' });
    expect(setUdlMessages).toHaveBeenCalledTimes(1);
  });

  it('a settings intent whose helper never loads does not leave an unhandled rejection', async () => {
    const h = harness(slice('  const handleSettingsIntent = (intentData) => {', '  const captureIntentSnapshot'), ['handleSettingsIntent'], { applyAIConfig: vi.fn(), setUdlMessages: vi.fn() });
    const result = h.api.handleSettingsIntent({});
    h.fail('GlossaryHelpers');
    await expect(result).resolves.toBeUndefined();
    expect(h.toasts.some(([, kind]) => kind === 'error'), 'the failure was silent').toBe(true);
  });

  it('Lesson Plan waits for the prompt library its builders need', () => {
    const fn = slice('  const handleGenerateLessonPlan = async (switchView = true, configOverride = {}) => {', '    if (sourceScope &&');
    const wait = (fn.match(/await _alloAwaitModules\((\[[\s\S]*?\]\]),\s*'/) || [])[1] || '';
    for (const name of ['CmapHandlersModule', 'GenDispatcherModule', 'PromptsLibraryModule']) {
      expect(wait.includes("'" + name + "'"), 'Lesson Plan does not wait for ' + name).toBe(true);
    }
  });

  it('a restore button that fires before MiscHandlers hands off to the waiting history opener', () => {
    const opener = vi.fn(() => 'opening');
    const h = harness(slice('  const handleRestoreView = (item, options = {}) => {', '  // BEGIN LEARNING_WEB_RESOURCE_OPEN_BRIDGE'), ['handleRestoreView'], {
      supportDraftSessionRef: { current: null }, handleOpenHistoryResource: opener,
    });
    let result;
    expect(() => { result = h.api.handleRestoreView({ id: 'r1' }, { source: 'header' }); }, 'restore threw before MiscHandlers landed').not.toThrow();
    expect(result).toBe('opening');
    expect(opener).toHaveBeenCalledWith({ id: 'r1' }, { source: 'header' });
  });

  it('a restore with a broken MiscHandlers still throws', () => {
    const h = harness(slice('  const handleRestoreView = (item, options = {}) => {', '  // BEGIN LEARNING_WEB_RESOURCE_OPEN_BRIDGE'), ['handleRestoreView'], {
      supportDraftSessionRef: { current: null }, handleOpenHistoryResource: vi.fn(),
    });
    h.window.AlloModules.MiscHandlers = {};
    expect(() => h.api.handleRestoreView({ id: 'r1' })).toThrow(/MiscHandlers/);
  });
});

describe('render helpers paint something instead of throwing', () => {
  const cases = [
    ['formatInlineText', slice('  const formatInlineText = (', '  const renderFormattedText'), 'PhaseKHelpers', 'PhaseKHelpersModule', ['**Bold** words'], '**Bold** words'],
    ['renderInteractiveMap', slice('  const renderInteractiveMap = () => {', '  useEffect(() => {'), 'ViewRenderers', 'ViewRenderersModule', [], null],
    ['renderOutlineContent', slice('  const renderOutlineContent = () => {', 'module not loaded - reload the page");\n  };') + 'module not loaded - reload the page");\n  };', 'ViewRenderers', 'ViewRenderersModule', [], null],
  ];
  for (const [name, source, key, registryName, args, expected] of cases) {
    it(name + ' falls back while ' + key + ' is loading and asks for it', () => {
      const h = harness(source, [name], { _alloPhaseKHelpersDeps: () => ({}), _alloViewRenderersDeps: () => ({}) });
      let out;
      expect(() => { out = h.api[name](...args); }, name + ' threw during render').not.toThrow();
      expect(out).toBe(expected);
      expect(h.promoted, name + ' never asked for its module, so nothing re-renders it').toContain(registryName);
    });
    it(name + ' with a broken ' + key + ' still throws', () => {
      const h = harness(source, [name], {});
      h.window.AlloModules[key] = {};
      expect(() => h.api[name](...args)).toThrow(/module not loaded/);
    });
  }
});
