import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

function loadBrowserModule(relPath) {
  const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  window.eval(code);
}

describe('Round 8 Wave 32 — Generation Matrix, Generation Helpers, AlloCommands & Command Context Hardening (4 modules)', () => {
  afterEach(() => {
    delete window.__alloStudentAiDisabled;
    delete window.__alloQrStudentMode;
    delete window.__alloAiSecretsLocked;
    delete window._alloQrBlocked;
    delete window.ALLOFLOW_MANAGED_AI_POLICY;
    delete window.__alloAiUsable;
  });

  it('1. generation_matrix_module.js: uses own-property checks on policies/fields/forceRefresh and strips proto keys in stableValue/compactStableObject/uniqueStrings', () => {
    const GM = require(path.join(ROOT, 'generation_matrix_module.js'));
    // 'constructor' / 'toString' must not collide with Object.prototype in getResourcePolicy or projectEffectiveGenerationConfig
    const protoPolicy = GM.getResourcePolicy('constructor');
    expect(protoPolicy.type).toBe('constructor');
    expect(protoPolicy.cardinality).toBe('context-singleton');

    const cfg = GM.projectEffectiveGenerationConfig('toString', {
      generationContext: JSON.parse('{"__proto__":{"polluted":true},"topic":"cells"}')
    });
    expect(cfg).toBeTruthy();
    expect(Object.prototype.polluted).toBeUndefined();

    // forceRefresh object with inherited property must not force-refresh
    const resolved = GM.resolveGenerationMatrix({ type: 'toString' }, {
      sourceText: 'Sample text for matrix check',
      forceRefresh: {}
    });
    expect(resolved.action).not.toBe('refresh');

    // uniqueStrings handles 'constructor' & 'toString' cleanly via Object.create(null)
    const mat = GM.resolveGenerationMatrix({ type: 'quiz' }, {
      sourceText: 'Sample',
      selectedLanguages: ['constructor', 'toString', 'Spanish', 'spanish']
    });
    expect(Array.isArray(mat.variants)).toBe(true);
  });

  it('2. generation_helpers_module.js: enforces complete AI/QR/managed policy gate, null-guards manipulative grader, catches AbortError on delays, guards proto keys', async () => {
    const src = fs.readFileSync(path.join(ROOT, 'generation_helpers_source.jsx'), 'utf8');
    expect(src).toContain('if (!result || result.reason !== \'invalid-actual\')');
    expect(src).toContain('const _plannedLessonDnaSnapshot = _cloneFullPackValue(lessonDNA);');
    expect(src).toContain('if (requested && !_isBlockedPropKey(requested) && !used.has(requested)) return requested;');
    expect(src).toContain('const _fullPackAiBlocked = typeof window !== \'undefined\'');
    expect(src).toContain('if (_isFullPackAbort(delayErr, _fullPackSignal)) break;');

    if (!window.AlloModules || !window.AlloModules.GenerationHelpers) {
      loadBrowserModule('generation_helpers_module.js');
    }
    const GH = window.AlloModules.GenerationHelpers;
    window.ALLOFLOW_MANAGED_AI_POLICY = { enabled: false };
    let toastMsg = '';
    const ran = await GH.handleGenerateFullPack(null, {
      isProcessing: false,
      addToast: (m) => { toastMsg = m; },
      t: (_k, f) => f || ''
    });
    expect(ran).toBe(false);
    expect(toastMsg).toMatch(/unavailable/i);
  });

  it('3. allo_commands_module.js: gates routeUtterance/planUtterance via hardened _aiUsable, guards open_persona_chat, adds sessionSerial & chunk-timer cleanup, 44px progress controls', async () => {
    const src = fs.readFileSync(path.join(ROOT, 'allo_commands_source.jsx'), 'utf8');
    expect(src).toContain("when: (c) => !c.studentAiFeaturesHidden && typeof c.openPersona === 'function'");
    expect(src).toContain("if (!opts.allowAi || !_aiUsable('text', ctx && ctx.callGemini)) return null;");
    expect(src).toContain("if (!ctx || !_aiUsable('text', ctx.callGemini)) return null;");
    expect(src).toContain('if (!(structured && outcome.ok === false)) _recordCommandUse(cmd.id);');
    expect(src).toContain('if (loadTimer != null) { clearTimeout(loadTimer); loadTimer = null; }');
    expect(src).toContain('if (activeChunkTimerClear) { try { activeChunkTimerClear(); } catch (_) {} activeChunkTimerClear = null; }');
    expect(src).toContain('const mySession = ++sessionSerial;');
    expect(src).toContain('const executedCommandRef = useRef(false);');
    expect(src).toContain('min-h-11 rounded-lg border border-amber-500');
    expect(src).toContain('min-h-11 min-w-11 items-center justify-center');

    // Runtime check: load AlloCommands with React stub and verify routeUtterance & planUtterance block when AI policy disabled
    const webRequire = createRequire(path.resolve(ROOT, 'desktop/web-app/package.json'));
    window.React = webRequire('react');
    if (!window.AlloModules || !window.AlloModules.AlloCommands) {
      loadBrowserModule('allo_commands_module.js');
    }
    const AC = window.AlloModules.AlloCommands;
    let geminiCalls = 0;
    const ctx = {
      isTeacherMode: true,
      callGemini: async () => { geminiCalls++; return '{"commandId":"open_notebook","confidence":0.95}'; }
    };
    window.__alloQrStudentMode = { active: true };
    const routed = await AC.routeUtterance(ctx, 'please help me organize these notes', { allowAi: true });
    expect(routed).toBeNull();
    const planned = await AC.planUtterance(ctx, 'build a full lesson on cells and make a quiz');
    expect(planned).toBeNull();
    expect(geminiCalls).toBe(0);

    // open_persona_chat hidden when studentAiFeaturesHidden is true
    const hiddenCmds = AC.buildAlloCommands({ isTeacherMode: false, studentAiFeaturesHidden: true, openPersona: () => {} });
    expect(hiddenCmds.some((c) => c.id === 'open_persona_chat')).toBe(false);
    const shownCmds = AC.buildAlloCommands({ isTeacherMode: false, studentAiFeaturesHidden: false, openPersona: () => {} });
    expect(shownCmds.some((c) => c.id === 'open_persona_chat')).toBe(true);
  });

  it('4. allo_command_context_module.js: gates contextual AI actions, binds suggestions to workspace token, catches async converse rejection, null-guards studentProjectSettings, reports signal failure', async () => {
    const src = fs.readFileSync(path.join(ROOT, 'allo_command_context_source.js'), 'utf8');
    expect(src).toContain('if (_ctxAiBlocked(__live && __live.callGemini)) return \'AI features are currently disabled in this session.\';');
    expect(src).toContain('workspaceToken: _alloCommandWorkspaceToken(deps)');
    expect(src).toContain('if (packet.workspaceToken && currentWorkspaceToken && packet.workspaceToken !== currentWorkspaceToken)');
    expect(src).toContain('let _alloBrainstormOpenGeneration = 0;');
    expect(src).toContain('!studentProjectSettings || studentProjectSettings.allowDictation !== false');
    expect(src).toContain('Could not send signal to teacher');

    if (!window.AlloModules || !window.AlloModules.AlloCommandContext) {
      loadBrowserModule('allo_command_context_module.js');
    }
    const buildCtx = typeof window.AlloModules.AlloCommandContext === 'function'
      ? window.AlloModules.AlloCommandContext
      : window.AlloModules.AlloCommandContext.buildAlloCommandContext;
    const waitersRef = { current: [] };
    const suggestionRef = { current: { options: [], state: null, createdAt: 0 } };
    const cmdCtxRef = { current: null };
    const toasts = [];
    let geminiCalls = 0;
    const makeDeps = (overrides = {}) => ({
      _alloCmdCtxRef: cmdCtxRef,
      _contextualSuggestionRef: suggestionRef,
      _voiceConverseWaitersRef: waitersRef,
      _voiceEditableFieldSelectionRef: { current: null },
      canvasRecoveryCurrentIdRef: { current: 'ws-1' },
      _sendUdlToChat: () => Promise.reject(new Error('chat boom')),
      _alloVoiceInputAvailable: () => false,
      _alloNormalizeDirectionsData: () => ({ objectives: [] }),
      _alloEvaluateObjectives: () => [],
      getDefaultTitle: () => 'Lesson',
      _alloStudentSafeResources: () => [],
      getFilteredHistory: () => [],
      LIVE_SIGNAL_OPTIONS: [{ id: 'need_help', label: 'Need help' }],
      GUIDED_TOUR_MAP: {},
      READING_THEME_IDS: [],
      inputText: 'Cells are the basic unit of life.',
      sourceTopic: 'Cells',
      history: [],
      activeView: 'input',
      isTeacherMode: true,
      isStudentLinkMode: false,
      studentAiFeaturesHidden: false,
      studentProjectSettings: null,
      activeSessionCode: 'S1',
      user: { uid: 'u1' },
      writeToSession: () => Promise.reject(new Error('firestore offline')),
      setShowStudentSignals: () => {},
      addToast: (msg, type) => toasts.push({ msg, type }),
      t: (_k, f) => f || '',
      __live: {
        callGemini: async () => { geminiCalls++; return '{}'; },
        doc: () => ({})
      },
      ...overrides
    });

    // Null studentProjectSettings must not throw during context creation
    window.__alloAiSecretsLocked = true;
    const ctxLocked = buildCtx(makeDeps());
    expect(ctxLocked.allowStudentDictation).toBe(true);
    expect(await ctxLocked.surpriseMeContextually()).toMatch(/disabled/i);
    expect(await ctxLocked.suggestContextualNextSteps()).toMatch(/disabled/i);
    expect(geminiCalls).toBe(0);

    // converse() settles immediately to null on async _sendUdlToChat rejection (no 45s hang!)
    const t0 = Date.now();
    const reply = await ctxLocked.converse('Hello?');
    expect(reply).toBeNull();
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(waitersRef.current.length).toBe(0);

    // sendTeacherSignal reports Firestore failure via toast
    ctxLocked.sendTeacherSignal('need_help');
    await new Promise((r) => setTimeout(r, 10));
    expect(toasts.some((item) => item.type === 'error' && /signal/i.test(item.msg))).toBe(true);

    // useContextualSuggestion rejects stale suggestions after workspace switch
    delete window.__alloAiSecretsLocked;
    const ctxWs1 = buildCtx(makeDeps({ canvasRecoveryCurrentIdRef: { current: 'ws-1' } }));
    await ctxWs1.suggestContextualNextSteps();
    const ctxWs2 = buildCtx(makeDeps({ canvasRecoveryCurrentIdRef: { current: 'ws-2' } }));
    const staleMsg = await ctxWs2.useContextualSuggestion(1);
    expect(staleMsg).toMatch(/workspace changed/i);
  });
});
