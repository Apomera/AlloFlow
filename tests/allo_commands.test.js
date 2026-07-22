// Unit tests for window.AlloModules.AlloCommands (allo_commands_module.js) -
// the natural-language / voice command router that maps a teacher/student
// utterance to an app action. Misrouting (or running a DESTRUCTIVE command
// without confirmation) is a real correctness/safety issue, so the scoring,
// role filtering, and the destructive-confirmation gate are worth pinning.
//
// The module hard-returns without window.React (it also builds a React command
// palette), so we stub React in beforeAll. The functions under test
// (scoreCommand / buildAlloCommands / routeUtterance) never touch React.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

describe('AlloCommandPalette accessibility', () => {
  it('connects combobox selection and live search feedback for assistive technology', () => {
    const source = readFileSync(resolve(process.cwd(), 'allo_commands_source.jsx'), 'utf-8');
    expect(source).toContain('aria-autocomplete="list"');
    expect(source).toContain('aria-describedby="allo-palette-status"');
    expect(source).toContain('id="allo-palette-status" role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain("count + ' matching command'");
    expect(source).toContain("selectedCommand.label + ' selected.'");
    expect(source).toContain("document.getElementById('allo-cmd-' + selectedCommandId)");
    expect(source).toContain("scrollIntoView({ block: 'nearest' })");
    expect(source).toContain("const COMMAND_RECENTS_KEY = 'allo_command_recents_v1'");
    expect(source).toContain("t('palette.group.recent', 'Recent')");
    expect(source).toContain('rememberCommand(cmd.id)');
    expect(source).toContain("getCommandAudience(ctx) === 'student'");
    expect(source).toContain("t('student.actions', 'Student actions')");
    expect(source).toContain("t('student.actions_search')");
  });
});

describe('command coverage drift guards', () => {
  const readRoot = (name) => readFileSync(resolve(process.cwd(), name), 'utf-8');

  it('keeps host launchers reachable from the command registry', () => {
    const app = readRoot('AlloFlowANTI.txt');
    const source = readRoot('allo_commands_source.jsx');
    const block = app.match(/Nested-tool launchers[\s\S]*?spotlightUiLanguage:/);
    expect(block).toBeTruthy();
    const launcherNames = [...new Set([...block[0].matchAll(/\b(open[A-Z][A-Za-z0-9]+):\s*\([^)]*\)\s*=>/g)].map((m) => m[1]))];
    expect(launcherNames).toEqual(expect.arrayContaining(['openVideoStudio', 'openTimelineStudio', 'openTestPrepHub']));
    const missing = launcherNames.filter((name) => !source.includes(`c.${name}(`));
    expect(missing).toEqual([]);
  });

  it('keeps command opensPanel ids backed by closeOtherPanels closers', () => {
    const app = readRoot('AlloFlowANTI.txt');
    const source = readRoot('allo_commands_source.jsx');
    const panels = [...new Set([...source.matchAll(/opensPanel:\s*'([^']+)'/g)].map((m) => m[1]))];
    expect(panels).toEqual(expect.arrayContaining(['videoStudio', 'timelineStudio', 'testPrepHub']));
    const closeBlock = app.match(/closeOtherPanels:\s*\(keep\)\s*=>\s*\{[\s\S]*?Object\.keys\(closers\)/);
    expect(closeBlock).toBeTruthy();
    const closers = new Set([...closeBlock[0].matchAll(/\b([A-Za-z][A-Za-z0-9]+):\s*\(\)\s*=>/g)].map((m) => m[1]));
    const allowedWithoutCloser = new Set(['dashboard']);
    const missing = panels.filter((panel) => !closers.has(panel) && !allowedWithoutCloser.has(panel));
    expect(missing).toEqual([]);
  });

  it('keeps every registry command explicitly grouped for palette browsing', () => {
    const source = readRoot('allo_commands_source.jsx');
    const registry = source.match(/const cmds = \[([\s\S]*?)\r?\n\s*\];\r?\n\s*\/\/ opts\.includeGated/);
    const groupBlock = source.match(/const CMD_GROUP = \{([\s\S]*?)\n\};/);
    expect(registry).toBeTruthy();
    expect(groupBlock).toBeTruthy();
    const commandIds = [...new Set([...registry[1].matchAll(/\{ id: '([^']+)'/g)].map((m) => m[1]))];
    const missing = commandIds.filter((id) => !new RegExp('\\b' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:').test(groupBlock[1]));
    expect(missing).toEqual([]);
  });

  it('keeps command context tags backed by active-state flags and labels', () => {
    const source = readRoot('allo_commands_source.jsx');
    const contextBlock = source.match(/const CMD_CONTEXT = \{([\s\S]*?)\n\};/);
    const flagBlock = source.match(/const CTX_FLAG = \{([^\n]+)\};/);
    const labelBlock = source.match(/const CONTEXT_LABEL_FALLBACK = \{([^\n]+)\};/);
    expect(contextBlock).toBeTruthy();
    expect(flagBlock).toBeTruthy();
    expect(labelBlock).toBeTruthy();
    const contexts = [...new Set([...contextBlock[1].matchAll(/\[([^\]]+)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])))];
    const missingFlags = contexts.filter((name) => !new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:').test(flagBlock[1]));
    const missingLabels = contexts.filter((name) => !new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:').test(labelBlock[1]));
    expect(missingFlags).toEqual([]);
    expect(missingLabels).toEqual([]);
  });

  it('keeps every command handler dependency exposed by the host context', () => {
    const app = readRoot('AlloFlowANTI.txt');
    const source = readRoot('allo_commands_source.jsx');
    const ctxBlock = app.match(/const ctx = \{([\s\S]*?)\r?\n\s*\};\r?\n\s*_alloCmdCtxRef\.current = ctx/);
    expect(ctxBlock).toBeTruthy();
    const ctxSource = ctxBlock[1].replace(/\/\/.*$/gm, '');
    const explicitKeys = [...ctxSource.matchAll(/(?:^|[,{]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/gm)].map((m) => m[1]);
    const shorthandKeys = [...ctxSource.matchAll(/(?:^|[,{]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*(?=,)/gm)].map((m) => m[1]);
    const provided = new Set([...explicitKeys, ...shorthandKeys]);
    const deps = [...new Set([...source.matchAll(/\bc\.([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)].map((m) => m[1]))];
    const notCtxDeps = new Set(['when']);
    const missing = deps.filter((name) => !provided.has(name) && !notCtxDeps.has(name));
    expect(missing).toEqual([]);
  });

  it('keeps natural-language param grammars backed by command contracts', () => {
    const source = readRoot('allo_commands_source.jsx');
    const grammarBlock = source.match(/const _grammars = \[([\s\S]*?)\n\s*\];/);
    expect(grammarBlock).toBeTruthy();
    const entries = grammarBlock[1].split(/\n\s*\{/).filter((entry) => entry.includes("id: '"));
    const paramGrammarIds = [...new Set(entries.filter((entry) => /\bparams\s*:/.test(entry)).map((entry) => entry.match(/id:\s*'([^']+)'/)[1]))];
    expect(paramGrammarIds).toEqual(expect.arrayContaining(['find_reading', 'create_lesson', 'set_grade_level', 'set_source_tone', 'set_source_length', 'set_output_language', 'set_font_size', 'translate_document', 'generate_simplified']));
    const missingContracts = paramGrammarIds.filter((id) => AC.getCommandContract(id).params.length === 0);
    expect(missingContracts).toEqual([]);
  });

});

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
  it('excludes teacher-only commands in every learner-facing mode', () => {
    const contexts = [
      { isTeacherMode: false },
      { isStudentLinkMode: true, isTeacherMode: false },
      { isIndependentMode: true },
      { isParentMode: true },
    ];
    for (const ctx of contexts) {
      const got = ids(ctx);
      expect(got).not.toContain('open_educator_hub');
      expect(got).not.toContain('open_ai_settings');
      expect(got).toContain('open_learning_hub');
    }
  });

  it('keeps authoring commands out of Student View but available to independent and parent modes', () => {
    const student = ids({ isTeacherMode: false, setSetupGradeLevel: vi.fn() });
    for (const commandId of ['open_source_input', 'open_source_url', 'open_source_generator', 'set_grade_level']) {
      expect(student).not.toContain(commandId);
    }
    expect(ids({ isIndependentMode: true, setSetupGradeLevel: vi.fn() })).toEqual(expect.arrayContaining(['open_source_input', 'set_grade_level']));
    expect(ids({ isParentMode: true, setSetupGradeLevel: vi.fn() })).toEqual(expect.arrayContaining(['open_source_input', 'set_grade_level']));
  });
  it('applies when() predicates (a gated command appears only when its condition holds)', () => {
    expect(ids({})).not.toContain('pipeline_new_doc'); // when: pipelineOpen
    expect(ids({ pipelineOpen: true })).toContain('pipeline_new_doc');
  });
  it('covers newer studio and practice launchers with the right role visibility', () => {
    const teacher = ids({});
    expect(teacher).toEqual(expect.arrayContaining([
      'open_video_studio', 'open_cinematic_studio', 'open_allo_studio',
      'open_open_groove', 'open_timeline_studio', 'open_lingua_practice', 'open_test_prep_hub',
    ]));
    const student = ids({ isIndependentMode: true });
    expect(student).not.toContain('open_video_studio');
    expect(student).not.toContain('open_cinematic_studio');
    expect(student).not.toContain('open_allo_studio');
    expect(student).toEqual(expect.arrayContaining(['open_open_groove', 'open_timeline_studio', 'open_lingua_practice', 'open_test_prep_hub']));
  });

  it('exposes source/history and Learning Hub tool launchers across roles', () => {
    const teacher = ids({});
    expect(teacher).toEqual(expect.arrayContaining([
      'open_source_input', 'open_source_url', 'open_source_generator', 'open_history', 'open_research_hub', 'open_lit_lab', 'open_mind_map', 'open_poet_tree',
    ]));
    const student = ids({ isIndependentMode: true });
    expect(student).toEqual(expect.arrayContaining([
      'open_source_input', 'open_source_url', 'open_source_generator', 'open_history', 'open_research_hub', 'open_lit_lab', 'open_mind_map', 'open_poet_tree',
    ]));
  });

  it('exposes setup-setting commands when host setters are available', () => {
    const ctx = {
      setSetupGradeLevel: vi.fn(),
      setSetupSourceTone: vi.fn(),
      setSetupSourceLength: vi.fn(),
      setSetupLanguage: vi.fn(),
    };
    expect(ids(ctx)).toEqual(expect.arrayContaining([
      'set_grade_level', 'set_source_tone', 'set_source_length', 'set_output_language',
    ]));
    expect(ids({ ...ctx, isIndependentMode: true })).toEqual(expect.arrayContaining([
      'set_grade_level', 'set_source_tone', 'set_source_length', 'set_output_language',
    ]));
  });

  it('exposes live-session commands only in the right live class roles', () => {
    const liveTeacher = ids({
      isTeacherMode: true,
      activeSessionCode: 'ABC123',
      openLiveSessionCenter: vi.fn(),
      openLivePoll: vi.fn(),
      openQuickCheck: vi.fn(),
      openPictionaryHost: vi.fn(),
      openGroupTools: vi.fn(),
      openStudentSignals: vi.fn(),
    });
    expect(liveTeacher).toEqual(expect.arrayContaining([
      'open_live_session_center', 'open_live_poll', 'open_quick_check', 'open_pictionary_host', 'open_group_tools',
    ]));
    expect(liveTeacher).not.toContain('open_student_signal');

    const liveStudent = ids({
      isIndependentMode: true,
      isTeacherMode: false,
      activeSessionCode: 'ABC123',
      openStudentSignals: vi.fn(),
      openLivePoll: vi.fn(),
    });
    expect(liveStudent).toContain('open_student_signal');
    expect(liveStudent).not.toContain('open_live_poll');

    expect(ids({ isTeacherMode: true, openLivePoll: vi.fn() })).not.toContain('open_live_poll');
  });

  it('applies student project permissions to dictation and Socratic commands', () => {
    const blocked = ids({ isTeacherMode: false, allowStudentDictation: false, allowStudentSocratic: false, studentAiFeaturesHidden: true });
    expect(blocked).not.toContain('toggle_dictation');
    expect(blocked).not.toContain('toggle_socratic');
    const allowed = ids({ isTeacherMode: false, allowStudentDictation: true, allowStudentSocratic: true, studentAiFeaturesHidden: false });
    expect(allowed).toEqual(expect.arrayContaining(['toggle_dictation', 'toggle_socratic']));
  });

  it('offers contextual assignment actions only to students with matching capabilities', () => {
    const student = ids({
      isTeacherMode: false,
      hasAssignmentDirections: true,
      openAssignmentDirections: vi.fn(),
      getAssignmentProgress: () => ({ done: 1, total: 3 }),
      canSaveStudentWork: true,
      saveStudentWork: vi.fn(),
    });
    expect(student).toEqual(expect.arrayContaining(['open_assignment_directions', 'check_assignment_progress', 'save_my_work']));
    const teacher = ids({
      isTeacherMode: true,
      hasAssignmentDirections: true,
      openAssignmentDirections: vi.fn(),
      getAssignmentProgress: () => ({ done: 1, total: 3 }),
      canSaveStudentWork: true,
      saveStudentWork: vi.fn(),
    });
    expect(teacher).not.toEqual(expect.arrayContaining(['open_assignment_directions', 'check_assignment_progress', 'save_my_work']));
  });

  it('surfaces the next teacher and student workflow commands only when their capabilities are ready', () => {
    const teacher = ids({
      canEditAssignmentDirections: true, editAssignmentDirections: vi.fn(),
      openAssessmentBuilder: vi.fn(), openUdlGuide: vi.fn(),
      canGenerateCurrentRubric: true, generateCurrentRubric: vi.fn(),
      canShareAssignment: true, shareAssignment: vi.fn(),
      canPreviewStudentAssignment: true, previewStudentAssignment: vi.fn(),
      hasResumableWork: true, resumeLatestWork: vi.fn(),
    });
    expect(teacher).toEqual(expect.arrayContaining([
      'edit_assignment_directions', 'open_assessment_builder', 'open_udl_guide',
      'create_activity_rubric', 'share_assignment', 'preview_assignment_as_student', 'resume_latest_work',
    ]));

    const student = ids({
      isTeacherMode: false,
      getNextAssignmentStep: () => ({ title: 'Quiz', goalLabel: 'Finish the quiz' }),
      openNextAssignmentStep: vi.fn(),
      hasAssignmentDirections: true, readAssignmentDirections: vi.fn(),
      getSuccessCriteria: () => ({ title: 'Goals', criteria: ['Explain your reasoning'] }),
      activeSessionCode: 'ABC123', sendTeacherSignal: vi.fn(),
      getTeacherFeedback: () => ({ title: 'Feedback', text: 'Add one example.' }),
      hasResumableWork: true, resumeLatestWork: vi.fn(),
    });
    expect(student).toEqual(expect.arrayContaining([
      'next_assignment_step', 'read_assignment_directions', 'show_success_criteria',
      'send_teacher_signal', 'review_teacher_feedback', 'resume_latest_work',
    ]));
    expect(student).not.toContain('edit_assignment_directions');
  });

  it('hides data-dependent student commands when no matching data exists', () => {
    const student = ids({
      isTeacherMode: false,
      getNextAssignmentStep: () => null, openNextAssignmentStep: vi.fn(),
      getSuccessCriteria: () => null,
      getTeacherFeedback: () => null,
    });
    expect(student).not.toEqual(expect.arrayContaining(['next_assignment_step', 'show_success_criteria', 'review_teacher_feedback']));
  });
});

describe('command param contracts', () => {
  it('exposes a contract-aware sanitizer for non-executing surfaces', () => {
    expect(AC.sanitizeCommandParams('create_lesson', { topic: ' volcanoes ', grade: '5', hidden: 'drop me', nested: { bad: true } })).toEqual({
      topic: 'volcanoes',
      grade: '5',
    });
    expect(AC.sanitizeCommandParams('find_reading', { topic: 'climate', raw: 'x'.repeat(500), hidden: 'drop me' })).toMatchObject({
      topic: 'climate',
      raw: expect.stringMatching(/^x{200}$/),
    });
    expect(AC.sanitizeCommandParams('set_grade_level', { grade: '5', hidden: 'drop me' })).toEqual({ grade: '5' });
    expect(AC.sanitizeCommandParams('set_source_tone', { tone: 'narrative', hidden: 'drop me' })).toEqual({ tone: 'narrative' });
    expect(AC.sanitizeCommandParams('set_source_length', { length: 'long', hidden: 'drop me' })).toEqual({ length: 'long' });
    expect(AC.sanitizeCommandParams('set_output_language', { language: 'Spanish', hidden: 'drop me' })).toEqual({ language: 'Spanish' });
    expect(AC.sanitizeCommandParams('send_teacher_signal', { signal: 'slow down', hidden: 'drop me' })).toEqual({ signal: 'slow down' });
    expect(AC.sanitizeCommandParams('open_learning_hub', { hidden: 'drop me' })).toEqual({});
  });
});

describe('routeUtterance', () => {
  it('returns null for empty or over-long input', async () => {
    expect(await AC.routeUtterance({}, '')).toBeNull();
    expect(await AC.routeUtterance({}, 'x'.repeat(201))).toBeNull();
  });

  it('routes fixed-vocabulary teacher signals without sending free text', async () => {
    const sendTeacherSignal = vi.fn(() => true);
    const result = await AC.routeUtterance({ isTeacherMode: false, activeSessionCode: 'ABC123', sendTeacherSignal }, 'ask my teacher to slow down');
    expect(result).toMatchObject({ handled: true, commandId: 'send_teacher_signal', via: 'grammar' });
    expect(sendTeacherSignal).toHaveBeenCalledWith('slow');
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
    expect(startNewPdfAudit).not.toHaveBeenCalled(); // not confirmed -> not run
    await AC.routeUtterance(ctx, 'start over with a new document', { confirmed: true });
    expect(startNewPdfAudit).toHaveBeenCalled(); // confirmed -> run
  });

  it('keeps deterministic grammar params declared in command contracts', async () => {
    const cases = [
      {
        text: 'find books about climate change in Spanish from StoryWeaver for grade 5',
        ctx: {},
        keys: ['topic', 'grade', 'language', 'source'],
      },
      {
        text: 'create a lesson about volcanoes for grade 5',
        ctx: { startLessonFlow: vi.fn() },
        keys: ['topic', 'grade'],
      },
      {
        text: 'set grade level to 5',
        ctx: { setSetupGradeLevel: vi.fn() },
        keys: ['grade'],
      },
      {
        text: 'set source tone to narrative',
        ctx: { setSetupSourceTone: vi.fn() },
        keys: ['tone'],
      },
      {
        text: 'set source length to 500 words',
        ctx: { setSetupSourceLength: vi.fn() },
        keys: ['length'],
      },
      {
        text: 'set output language to Spanish',
        ctx: { setSetupLanguage: vi.fn() },
        keys: ['language'],
      },
      {
        text: 'set text size to 20',
        ctx: { setFontSizeTo: vi.fn() },
        keys: ['size'],
      },
      {
        text: 'translate this into Vietnamese',
        ctx: { pipelineOpen: true, prefillTranslateLang: vi.fn() },
        keys: ['language'],
      },
      {
        text: 'simplify this to grade 3',
        ctx: { hasSourceOrAnalysis: true, generateSimplified: vi.fn() },
        keys: ['grade'],
      },
    ];
    for (const item of cases) {
      const match = await AC.routeUtterance(item.ctx, item.text, { preview: true, allowAi: false });
      expect(match && match.preview).toBe(true);
      const contractKeys = AC.getCommandContract(match.commandId).params;
      expect(contractKeys).toEqual(expect.arrayContaining(item.keys));
      const presentParamKeys = Object.entries(match.params || {}).filter(([, value]) => value != null && value !== '').map(([key]) => key);
      expect(contractKeys).toEqual(expect.arrayContaining(presentParamKeys));
    }
  });

  it('advertises declared params to the AI router and filters its response', async () => {
    const startLessonFlow = vi.fn();
    const callGemini = vi.fn(async (prompt) => {
      expect(prompt).toContain('create_lesson:');
      expect(prompt).toContain('[params topic, grade]');
      return JSON.stringify({
        commandId: 'create_lesson',
        params: { topic: 'volcanoes', grade: '5', hidden: 'drop me' },
        confidence: 0.9,
      });
    });
    const r = await AC.routeUtterance({ startLessonFlow, callGemini }, 'prepare materials around volcanoes', { allowAi: true });
    expect(r).toMatchObject({ handled: true, commandId: 'create_lesson', via: 'ai' });
    expect(startLessonFlow).toHaveBeenCalledWith({ topic: 'volcanoes', grade: '5' });
  });

  it('rejects a late AI router response after cancellation even when the transport resolves', async () => {
    const controller = new AbortController();
    const startLessonFlow = vi.fn();
    const callGemini = vi.fn(async () => {
      controller.abort();
      return JSON.stringify({ commandId: 'create_lesson', params: { topic: 'volcanoes' }, confidence: 0.95 });
    });
    await expect(AC.routeUtterance({ startLessonFlow, callGemini }, 'prepare materials around volcanoes', { allowAi: true, signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(startLessonFlow).not.toHaveBeenCalled();
  });
});

// The bot CHAT routes every message through the router first. If it EXECUTES on a
// match, a stray "bot"/"hi" opener runs toggle_bot -> the bot hides and the chat
// closes. Preview mode must MATCH-without-running so the chat can confirm first.
describe('routeUtterance preview mode (bot chat safety)', () => {
  it('excludes chatSkip commands (toggle_bot) from chat proposals', async () => {
    // Hiding the bot from inside its own chat is pointless (there is an X), so
    // "bot"/"assistant" must not even raise a confirm chip in the chat.
    const handleToggleIsBotVisible = vi.fn();
    const r = await AC.routeUtterance({ handleToggleIsBotVisible }, 'bot', { preview: true, allowAi: false });
    expect(r).toBeNull();
    expect(handleToggleIsBotVisible).not.toHaveBeenCalled();
  });

  it('but toggle_bot STILL runs via Ctrl+K / voice (non-preview)', async () => {
    const handleToggleIsBotVisible = vi.fn();
    const r = await AC.routeUtterance({ handleToggleIsBotVisible }, 'bot', {});
    expect(r).toMatchObject({ handled: true, commandId: 'toggle_bot' });
    expect(handleToggleIsBotVisible).toHaveBeenCalled();
  });

  it('previews a real multi-word command without side effects', async () => {
    const setShowEducatorHub = vi.fn();
    const r = await AC.routeUtterance({ setShowEducatorHub }, 'open the educator hub', { preview: true });
    expect(r).toMatchObject({ preview: true, commandId: 'open_educator_hub' });
    expect(setShowEducatorHub).not.toHaveBeenCalled();
  });

  it('does NOT match a short opener like "hi" (would only be noise)', async () => {
    // 'hi' scores 80 via "hide bot".startsWith("hi") but is < 3 chars -> rejected in
    // preview. allowAi:false so it cannot fall through to the AI classifier.
    const handleToggleIsBotVisible = vi.fn();
    const r = await AC.routeUtterance({ handleToggleIsBotVisible }, 'hi', { preview: true, allowAi: false });
    expect(r).toBeNull();
    expect(handleToggleIsBotVisible).not.toHaveBeenCalled();
  });

  it('does not spotlight on a "where is X" utterance in preview mode', async () => {
    const whereIs = vi.fn(() => 'in the sidebar');
    const r = await AC.routeUtterance({ whereIs }, 'where is the glossary', { preview: true, allowAi: false });
    expect(whereIs).not.toHaveBeenCalled();
    expect(r).toBeNull();
  });
});

describe('reading librarian command', () => {
  const miniCatalog = {
    books: [
      {
        slug: 'climate-frontiers',
        title: 'Climate Change and Coral Reefs',
        description: 'A science article about warming oceans, coral reefs, and climate change.',
        language: 'English',
        langCode: 'en',
        level: '5',
        sourceId: 'frontiers',
        contentType: 'article',
        subjects: ['climate', 'ocean', 'science'],
        source: { name: 'Frontiers for Young Minds' },
        file: 'books/climate-frontiers.json',
      },
      {
        slug: 'dance-story',
        title: 'Gappu Can Dance',
        description: 'A joyful early-reader story about dancing and opposites.',
        language: 'English',
        langCode: 'en',
        level: '1',
        sourceId: 'storyweaver',
        contentType: 'story',
        subjects: ['dance'],
        source: { name: 'StoryWeaver, Pratham Books' },
        file: 'books/dance-story.json',
      },
      {
        slug: 'clima-es',
        title: 'El clima y los oceanos',
        description: 'Una lectura sobre el clima y el oceano.',
        language: 'Spanish',
        langCode: 'es',
        level: '4',
        sourceId: 'storyweaver',
        contentType: 'story',
        subjects: ['climate', 'ocean'],
        source: { name: 'StoryWeaver, Pratham Books' },
        file: 'books/clima-es.json',
      },
    ],
  };

  it('normalizes topic, grade, language, and source hints', () => {
    const req = AC.normalizeReadingRequest({ topic: 'climate change in Spanish from StoryWeaver for grade 5' });
    expect(req).toMatchObject({ topic: 'climate change', grade: '5', language: 'Spanish', source: 'storyweaver' });
  });

  it('ranks catalog matches by topic, format, grade, and language', () => {
    const article = AC.findReadingMatches(miniCatalog, { topic: 'climate change', grade: '6', format: 'article' }, { limit: 2 });
    expect(article[0].book.slug).toBe('climate-frontiers');
    expect(article[0].why).toEqual(expect.arrayContaining(['matches "climate change"', 'near grade 6', 'student science article']));
    expect(AC.readingMatchWhyText(article[0], { topic: 'climate change', grade: '6', format: 'article' })).toContain('near grade 6');

    const spanish = AC.findReadingMatches(miniCatalog, { topic: 'climate ocean', language: 'Spanish' }, { limit: 2 });
    expect(spanish[0].book.slug).toBe('clima-es');
    expect(spanish[0].why).toContain('Spanish');
  });

  it('includes a short why-this-book note when the command searches the catalog directly', () => {
    const openReadingBook = vi.fn();
    const run = AC.runCommandById(
      { readingLibraryIndex: miniCatalog, openReadingBook },
      'find_reading',
      { topic: 'climate change', grade: '6', format: 'article' },
      { confirmed: true }
    );
    expect(run.narration).toContain('Why this fits:');
    expect(run.narration).toContain('near grade 6');
    expect(run.narration).toContain('student science article');
    expect(openReadingBook).toHaveBeenCalledWith('climate-frontiers');
  });

  it('previews a book-finding request, then runs only after confirmation', async () => {
    const findReadingBooks = vi.fn(() => 'Opened a climate book.');
    const r = await AC.routeUtterance({ findReadingBooks }, 'find books about climate change for grade 6', { preview: true, allowAi: false });
    expect(r).toMatchObject({ preview: true, commandId: 'find_reading' });
    expect(r.params).toMatchObject({ topic: 'climate change', grade: '6' });
    expect(findReadingBooks).not.toHaveBeenCalled();

    const run = AC.runCommandById({ findReadingBooks }, 'find_reading', r.params, { confirmed: true });
    expect(run).toMatchObject({ handled: true, commandId: 'find_reading' });
    expect(run.narration).toContain('climate');
    expect(findReadingBooks).toHaveBeenCalledWith(expect.objectContaining({ topic: 'climate change', grade: '6' }));
  });
});

describe('createVoiceLoop single-flight routing', () => {
  const speechEvent = (text) => {
    const result = [{ transcript: text }];
    result.isFinal = true;
    return { results: [result] };
  };

  const installFakeRecognition = () => {
    const instances = [];
    class FakeSpeechRecognition {
      constructor() {
        this.start = vi.fn();
        this.stop = vi.fn();
        instances.push(this);
      }
    }
    const previous = window.SpeechRecognition;
    window.SpeechRecognition = FakeSpeechRecognition;
    return {
      instances,
      restore: () => {
        if (previous === undefined) delete window.SpeechRecognition;
        else window.SpeechRecognition = previous;
      },
    };
  };

  it('supersedes a slow AI route when a newer transcript arrives', async () => {
    const fake = installFakeRecognition();
    try {
      let resolveFirst;
      let firstSignal;
      const callGemini = vi.fn((_prompt, _json, _search, _temperature, _query, signal) => {
        firstSignal = signal;
        return new Promise((resolve) => { resolveFirst = resolve; });
      });
      const fontBigger = vi.fn(() => 18);
      const setShowLearningHub = vi.fn();
      const addToast = vi.fn();
      const setVoiceActive = vi.fn();
      const ctx = { callGemini, fontBigger, setShowLearningHub, addToast, setVoiceActive };
      const loop = AC.createVoiceLoop(() => ctx);

      expect(loop.start()).toBe(true);
      const recognition = fake.instances[0];
      const first = recognition.onresult(speechEvent('prepare materials around volcanoes'));
      await vi.waitFor(() => expect(callGemini).toHaveBeenCalledOnce());

      await recognition.onresult(speechEvent('bigger text'));
      expect(firstSignal.aborted).toBe(true);
      expect(fontBigger).toHaveBeenCalledOnce();

      resolveFirst(JSON.stringify({ commandId: 'open_learning_hub', params: {}, confidence: 0.95 }));
      await first;
      expect(setShowLearningHub).not.toHaveBeenCalled();
      loop.stop();
    } finally {
      fake.restore();
    }
  });

  it('aborts pending interpretation when the stop phrase releases the microphone', async () => {
    const fake = installFakeRecognition();
    const removePageHideListener = vi.spyOn(window, 'removeEventListener');
    try {
      let resolveRoute;
      let routeSignal;
      const callGemini = vi.fn((_prompt, _json, _search, _temperature, _query, signal) => {
        routeSignal = signal;
        return new Promise((resolve) => { resolveRoute = resolve; });
      });
      const setShowLearningHub = vi.fn();
      const addToast = vi.fn();
      const setVoiceActive = vi.fn();
      const ctx = { callGemini, setShowLearningHub, addToast, setVoiceActive };
      const loop = AC.createVoiceLoop(() => ctx);

      expect(loop.start()).toBe(true);
      const recognition = fake.instances[0];
      const pending = recognition.onresult(speechEvent('prepare materials around volcanoes'));
      await vi.waitFor(() => expect(callGemini).toHaveBeenCalledOnce());
      await recognition.onresult(speechEvent('stop listening'));

      expect(routeSignal.aborted).toBe(true);
      expect(loop.isActive()).toBe(false);
      expect(recognition.stop).toHaveBeenCalledOnce();
      expect(setVoiceActive).toHaveBeenLastCalledWith(false);
      expect(removePageHideListener).toHaveBeenCalledWith('pagehide', expect.any(Function));

      resolveRoute(JSON.stringify({ commandId: 'open_learning_hub', params: {}, confidence: 0.95 }));
      await pending;
      expect(setShowLearningHub).not.toHaveBeenCalled();
    } finally {
      removePageHideListener.mockRestore();
      fake.restore();
    }
  });
});
describe('runCommandById (executes a confirmed, previewed command)', () => {
  it('runs the command by id', () => {
    const handleToggleIsBotVisible = vi.fn();
    const r = AC.runCommandById({ handleToggleIsBotVisible }, 'toggle_bot', {});
    expect(r).toMatchObject({ handled: true, commandId: 'toggle_bot' });
    expect(handleToggleIsBotVisible).toHaveBeenCalled();
  });

  it('returns null for an unknown id', () => {
    expect(AC.runCommandById({}, 'no_such_command')).toBeNull();
  });

  it('rechecks the current audience before executing a stale command object', () => {
    const staleTeacherCommand = AC.buildAlloCommands({}).find((command) => command.id === 'open_educator_hub');
    const setShowEducatorHub = vi.fn();
    expect(AC.executeCommand({ isTeacherMode: false, setShowEducatorHub }, staleTeacherCommand, {})).toBeNull();
    expect(setShowEducatorHub).not.toHaveBeenCalled();
  });

  it('runs student assignment actions through the shared executor', () => {
    const openAssignmentDirections = vi.fn();
    const saveStudentWork = vi.fn();
    const ctx = {
      isTeacherMode: false,
      hasAssignmentDirections: true,
      openAssignmentDirections,
      getAssignmentProgress: () => ({ title: 'Week 1', done: 2, total: 4 }),
      canSaveStudentWork: true,
      saveStudentWork,
    };
    expect(AC.runCommandById(ctx, 'open_assignment_directions', {})).toMatchObject({ handled: true });
    expect(openAssignmentDirections).toHaveBeenCalledTimes(1);
    expect(AC.runCommandById(ctx, 'check_assignment_progress', {}).narration).toContain('2 of 4');
    expect(AC.runCommandById(ctx, 'save_my_work', {})).toMatchObject({ handled: true });
    expect(saveStudentWork).toHaveBeenCalledTimes(1);
  });
  it('executes guarded student workflow actions and fixed teacher signals', () => {
    const openNextAssignmentStep = vi.fn(() => ({ title: 'Quiz', goalLabel: 'Finish the quiz' }));
    const sendTeacherSignal = vi.fn(() => true);
    const ctx = {
      isTeacherMode: false,
      getNextAssignmentStep: () => ({ title: 'Quiz' }),
      openNextAssignmentStep,
      activeSessionCode: 'ABC123',
      sendTeacherSignal,
    };
    expect(AC.runCommandById(ctx, 'next_assignment_step', {}).narration).toContain('Opening Quiz');
    expect(openNextAssignmentStep).toHaveBeenCalledTimes(1);
    expect(AC.runCommandById(ctx, 'send_teacher_signal', { signal: 'repeat that' })).toMatchObject({ handled: true });
    expect(sendTeacherSignal).toHaveBeenCalledWith('repeat');
  });

  it('uses assignment-specific confirmation details before sharing', async () => {
    const shareAssignment = vi.fn(async () => 'https://student.example/assignment');
    const onCommandState = vi.fn();
    const ctx = {
      canShareAssignment: true, shareAssignment, onCommandState,
      shareResourceCount: 3, shareExpiryDays: 7, shareStudentAiPolicy: 'student-byok',
    };
    const confirmation = AC.runCommandById(ctx, 'share_assignment', {});
    expect(confirmation).toMatchObject({ handled: true, via: 'confirm', confirmationRequired: true });
    expect(confirmation.narration).toContain('3');
    expect(confirmation.narration).toContain('7');
    expect(confirmation.narration).toContain('AI provider');
    expect(shareAssignment).not.toHaveBeenCalled();

    const started = AC.runCommandById(ctx, 'share_assignment', {}, { confirmed: true });
    expect(started).toMatchObject({ handled: true, pending: true, commandId: 'share_assignment' });
    expect(shareAssignment).toHaveBeenCalledTimes(1);
    await expect(started.completion).resolves.toMatchObject({ ok: true, commandId: 'share_assignment' });
    expect(onCommandState.mock.calls.map(([state]) => state.status)).toEqual(['pending', 'success']);
  });

  it('emits one pending-to-success lifecycle without running an async command twice', async () => {
    const generateCurrentRubric = vi.fn(async () => true);
    const onCommandState = vi.fn();
    const result = AC.runCommandById({ canGenerateCurrentRubric: true, generateCurrentRubric, onCommandState }, 'create_activity_rubric', {});
    expect(result).toMatchObject({ handled: true, pending: true, commandId: 'create_activity_rubric' });
    expect(generateCurrentRubric).toHaveBeenCalledTimes(1);
    await expect(result.completion).resolves.toMatchObject({ ok: true });
    expect(generateCurrentRubric).toHaveBeenCalledTimes(1);
    expect(onCommandState.mock.calls.map(([state]) => state.status)).toEqual(['pending', 'success']);
  });

  it('turns asynchronous command rejection into an announced lifecycle failure', async () => {
    const addToast = vi.fn();
    const onCommandState = vi.fn();
    const generateCurrentRubric = vi.fn(async () => { throw new Error('offline'); });
    const result = AC.runCommandById({ canGenerateCurrentRubric: true, generateCurrentRubric, addToast, onCommandState }, 'create_activity_rubric', {});
    const completed = await result.completion;
    expect(completed).toMatchObject({ ok: false, commandId: 'create_activity_rubric' });
    expect(completed.narration).toContain('offline');
    expect(onCommandState.mock.calls.map(([state]) => state.status)).toEqual(['pending', 'error']);
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('offline'), 'error');
  });
  it('opens newer studio launchers through one host handler and closes peer panels', () => {
    const closeOtherPanels = vi.fn();
    const openTimelineStudio = vi.fn();
    const r = AC.runCommandById({ closeOtherPanels, openTimelineStudio }, 'open_timeline_studio', {});
    expect(r).toMatchObject({ handled: true, commandId: 'open_timeline_studio' });
    expect(closeOtherPanels).toHaveBeenCalledWith('timelineStudio');
    expect(openTimelineStudio).toHaveBeenCalledTimes(1);
  });

  it('opens source input and history through host navigation handlers', () => {
    const openSourceInput = vi.fn();
    const source = AC.runCommandById({ openSourceInput }, 'open_source_input', {});
    expect(source).toMatchObject({ handled: true, commandId: 'open_source_input' });
    expect(openSourceInput).toHaveBeenCalledTimes(1);


    const openSourceUrl = vi.fn();
    const url = AC.runCommandById({ openSourceUrl }, 'open_source_url', {});
    expect(url).toMatchObject({ handled: true, commandId: 'open_source_url' });
    expect(openSourceUrl).toHaveBeenCalledTimes(1);

    const openSourceGenerator = vi.fn();
    const generator = AC.runCommandById({ openSourceGenerator }, 'open_source_generator', {});
    expect(generator).toMatchObject({ handled: true, commandId: 'open_source_generator' });
    expect(openSourceGenerator).toHaveBeenCalledTimes(1);

    const openHistory = vi.fn();
    const history = AC.runCommandById({ openHistory }, 'open_history', {});
    expect(history).toMatchObject({ handled: true, commandId: 'open_history' });
    expect(openHistory).toHaveBeenCalledTimes(1);
  });

  it('applies setup settings through validated host handlers', () => {
    const setSetupGradeLevel = vi.fn(() => '5th Grade');
    const grade = AC.runCommandById({ setSetupGradeLevel }, 'set_grade_level', { grade: '5', hidden: 'drop' });
    expect(grade).toMatchObject({ handled: true, commandId: 'set_grade_level' });
    expect(setSetupGradeLevel).toHaveBeenCalledWith('5');

    const setSetupSourceTone = vi.fn(() => 'Narrative');
    const tone = AC.runCommandById({ setSetupSourceTone }, 'set_source_tone', { tone: 'narrative', hidden: 'drop' });
    expect(tone).toMatchObject({ handled: true, commandId: 'set_source_tone' });
    expect(setSetupSourceTone).toHaveBeenCalledWith('narrative');

    const setSetupSourceLength = vi.fn(() => '500');
    const length = AC.runCommandById({ setSetupSourceLength }, 'set_source_length', { length: '500', hidden: 'drop' });
    expect(length).toMatchObject({ handled: true, commandId: 'set_source_length' });
    expect(setSetupSourceLength).toHaveBeenCalledWith('500');

    const setSetupLanguage = vi.fn(() => 'Spanish');
    const language = AC.runCommandById({ setSetupLanguage }, 'set_output_language', { language: 'Spanish', hidden: 'drop' });
    expect(language).toMatchObject({ handled: true, commandId: 'set_output_language' });
    expect(setSetupLanguage).toHaveBeenCalledWith('Spanish');
  });

  it('opens Learning Hub subtools through one host handler and closes peer panels', () => {
    const cases = [
      ['open_research_hub', 'researchHub', 'openResearchHub'],
      ['open_lit_lab', 'litLab', 'openLitLab'],
      ['open_mind_map', 'mindMap', 'openMindMap'],
      ['open_poet_tree', 'poetTree', 'openPoetTree'],
    ];
    for (const [commandId, panel, handlerName] of cases) {
      const closeOtherPanels = vi.fn();
      const handler = vi.fn();
      const r = AC.runCommandById({ closeOtherPanels, [handlerName]: handler }, commandId, {});
      expect(r).toMatchObject({ handled: true, commandId });
      expect(closeOtherPanels).toHaveBeenCalledWith(panel);
      expect(handler).toHaveBeenCalledTimes(1);
    }
  });

  it('opens live-class tools through guarded live-session handlers', () => {
    const openLivePoll = vi.fn();
    const poll = AC.runCommandById({ isTeacherMode: true, activeSessionCode: 'ABC123', openLivePoll }, 'open_live_poll', {});
    expect(poll).toMatchObject({ handled: true, commandId: 'open_live_poll' });
    expect(openLivePoll).toHaveBeenCalledTimes(1);

    const openStudentSignals = vi.fn();
    const signal = AC.runCommandById({ isTeacherMode: false, isIndependentMode: true, activeSessionCode: 'ABC123', openStudentSignals }, 'open_student_signal', {});
    expect(signal).toMatchObject({ handled: true, commandId: 'open_student_signal' });
    expect(openStudentSignals).toHaveBeenCalledTimes(1);
  });

  it('still gates a destructive command until confirmed:true', () => {
    const startNewPdfAudit = vi.fn();
    const ctx = { pipelineOpen: true, startNewPdfAudit };
    AC.runCommandById(ctx, 'pipeline_new_doc', {}); // no confirmed flag
    expect(startNewPdfAudit).not.toHaveBeenCalled();
    AC.runCommandById(ctx, 'pipeline_new_doc', {}, { confirmed: true });
    expect(startNewPdfAudit).toHaveBeenCalled();
  });
});
