// Adventure Mode fixes (2026-09-27 review of the 24 core resources).
//  AD1  the teacher dashboard, CSV and badge read the level the game actually saves
//  AD2  resume prefers the story already open (a loaded work file), device saves are
//       scoped to the learner, and a finished choice story is never a dead end
//  AD4  an unreadable AI reply changes nothing and offers a retry
//  AD7  the debate prompt no longer invites a literal "String" topic or a reset on concession
// Mutation hooks: FIX0927_AD_TEACHER_MODULE, FIX0927_AD_TEACHER_SRC, FIX0927_AD_HANDLERS,
// FIX0927_AD_SESSION, FIX0927_AD_VIEW_SRC, FIX0927_AD_ANTI.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const TEACHER_MODULE = process.env.FIX0927_AD_TEACHER_MODULE || 'teacher_module.js';
const TEACHER_SRC = process.env.FIX0927_AD_TEACHER_SRC || 'teacher_source.jsx';
const HANDLERS = process.env.FIX0927_AD_HANDLERS || 'adventure_handlers_source.jsx';
const SESSION = process.env.FIX0927_AD_SESSION || 'adventure_session_handlers_source.jsx';
const VIEW_SRC = process.env.FIX0927_AD_VIEW_SRC || 'view_adventure_source.jsx';
const ANTI = process.env.FIX0927_AD_ANTI || 'AlloFlowANTI.txt';
const anti = fs.readFileSync(ANTI, 'utf8');
const lessonKeyStart = anti.indexOf('const _alloAdventureLessonKey = (history, inputText) => {');
const lessonKey = new Function(anti.slice(lessonKeyStart, anti.indexOf('window._alloAdventureLessonKey = _alloAdventureLessonKey;', lessonKeyStart)) + '\nreturn _alloAdventureLessonKey;')();
const handlerSource = fs.readFileSync(HANDLERS, 'utf8');
const loadHandlers = () => new Function('window', handlerSource + '\nreturn window.AlloModules.AdventureHandlers;')({ AlloModules: {}, _alloAdventureLessonKey: lessonKey });
const proxy = target => new Proxy(target, { get: (t, p) => (p in t ? t[p] : vi.fn()) });

describe('AD1: dashboard adventure level uses data.snapshot.level', () => {
  const real = level => ({ type: 'adventure', data: { snapshot: { level, turnCount: 9 } } });
  let M;
  beforeAll(() => {
    const React = require(resolve('desktop/web-app/node_modules/react'));
    globalThis.React = window.React = React;
    new Function(fs.readFileSync(TEACHER_MODULE, 'utf8'))();
    M = window.AlloModules.TeacherAnalyticsInternals;
  });
  it('averages the saved levels of real student files (4 and 7)', () => {
    expect(M.calculateAnalyticsMetrics([{ history: [real(4)], responses: {} }, { history: [real(7)], responses: {} }]).avgAdventureLevel).toBe(5.5);
  });
  it('the badge and CSV read the same field, keeping the legacy shape readable', () => {
    const src = fs.readFileSync(TEACHER_SRC, 'utf8');
    const g = src.indexOf('const getStudentLevel = (history) => {');
    const getStudentLevel = new Function('return ' + src.slice(g + 'const getStudentLevel = '.length, src.indexOf('  const getClassMetrics', g)).trim().replace(/;\s*$/, ''))();
    expect(getStudentLevel([real(7)])).toBe(7);
    expect(getStudentLevel([{ type: 'adventure', data: { level: 3 } }])).toBe(3);
    expect(getStudentLevel([{ type: 'quiz' }])).toBe('N/A');
    const rowsAt = src.indexOf('const rows = dashboardData.map(student => {');
    const a = src.indexOf('const adventureItem', rowsAt);
    const csvLevel = new Function('student', src.slice(a, src.indexOf('let totalQuizScore', a)) + '\nreturn level;');
    expect(csvLevel({ history: [real(4)] })).toBe(4);
  });
});

describe('AD2: resuming the right story', () => {
  it('resumes the story already open (a loaded work file) instead of this device\'s save', async () => {
    const { handleResumeAdventure } = loadHandlers();
    const storageDB = { get: vi.fn(async () => ({ level: 9, turnCount: 30, currentScene: { text: 'Someone else', options: [] } })) };
    const setActiveView = vi.fn();
    let state = { currentScene: { text: 'My story', options: ['Go on'] }, turnCount: 4, level: 2, isLoading: false };
    await handleResumeAdventure(proxy({ adventureState: state, storageDB, setActiveView, setAdventureState: u => { state = typeof u === 'function' ? u(state) : u; }, addToast: vi.fn(), t: k => k, warnLog: vi.fn() }));
    expect(storageDB.get).not.toHaveBeenCalled();
    expect(state.currentScene.text).toBe('My story');
    expect(setActiveView).toHaveBeenCalledWith('adventure');
  });
  it('refuses a device save stamped for another learner', async () => {
    const { handleResumeAdventure } = loadHandlers();
    const record = { level: 5, turnCount: 12, currentScene: { text: 'Ana\'s story', options: ['x'] }, _adventureConfig: { learnerKey: lessonKey([], 'Ana') } };
    const setAdventureState = vi.fn();
    const addToast = vi.fn();
    await handleResumeAdventure(proxy({ adventureState: {}, studentNickname: 'Ben', history: [], inputText: '', storageDB: { get: vi.fn(async () => record) }, setAdventureState, addToast, setHasSavedAdventure: vi.fn(), t: k => k, warnLog: vi.fn() }));
    expect(setAdventureState).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('toasts.adventure_other_learner', 'error');
  });
  it('the host stamps device saves with the learner and hides another learner\'s save', () => {
    expect(anti).toContain('learnerKey: _alloAdventureLessonKey([], studentNickname)');
    expect(anti).toContain("setSavedAdventureLessonKey(otherLearner ? 'learner:other' : String(savedAdventureConfig.lessonKey || ''));");
    expect(anti).toContain("hasSavedAdventure && savedAdventureLessonKey !== 'learner:other'");
    // A fresh save of this learner's story (e.g. just loaded from a work file) re-opens the offer.
    expect(anti).toContain("setHasSavedAdventure(true);\n                  setSavedAdventureLessonKey(String(sanitizedState._adventureConfig.lessonKey || ''));");
    const depsAt = anti.indexOf('const _alloAdventureHandlersDeps = () => ({');
    expect(anti.slice(depsAt, anti.indexOf('});', depsAt))).toContain('studentNickname,');
  });
  it('a finished choice story with no options offers its ending and a restart in both layouts', () => {
    const view = fs.readFileSync(VIEW_SRC, 'utf8');
    expect(view).toContain('var sceneHasNoChoices = !!adventureState.currentScene && !adventureState.isGameOver && !adventureState.isLoading && !usesWrittenResponse');
    expect(view).toContain('setAdventureState(prev => ({ ...prev, isGameOver: true, isLoading: false }))');
    expect(view).toContain('sceneHasNoChoices ? renderStoryEndedActions() : usesWrittenResponse ? (');
    expect(view).toMatch(/\) : sceneHasNoChoices \? \(\s*renderStoryEndedActions\(\)\s*\) : \(!usesWrittenResponse\) \? \(/);
  });
});

describe('AD4: an unreadable reply never becomes a scene', () => {
  const baseState = () => ({
    currentScene: { text: 'A bridge sways.', options: ['Cross', 'Wait'] }, history: [], inventory: [], climax: { isActive: false },
    energy: 80, xp: 10, level: 2, xpToNextLevel: 100, gold: 5, turnCount: 3, lastKeyItemTurn: 0, isLoading: false, sceneImage: null, characters: [],
  });
  it('a choice turn restores the scene, keeps energy and XP, and offers a retry', async () => {
    const { handleAdventureChoice } = loadHandlers();
    let state = baseState();
    const before = structuredClone(state);
    let pending;
    const callGemini = vi.fn(async () => 'not-json');
    const resilientJsonParse = vi.fn(async () => { throw new SyntaxError('bad json'); });
    const failed = vi.fn();
    const addToast = vi.fn();
    await handleAdventureChoice('Cross', proxy({
      adventureState: state, adventureInputMode: 'choice', adventureLanguageMode: 'English', adventureDifficulty: 'Normal', adventureChanceMode: false,
      adventureFreeResponseEnabled: false, adventureConsistentCharacters: false, history: [], inputText: 'Bridges carry loads.', selectedLanguages: [],
      studentInterests: [], isTeacherMode: true, activeSessionCode: '', lastTurnSnapshot: { current: null }, SafetyContentChecker: { aiCheck: vi.fn() },
      archiveAdventureImage: vi.fn(), stopPlayback: vi.fn(), getAdventureGlossaryTerms: vi.fn(() => []), callGemini, resilientJsonParse,
      setAdventureState: u => { state = typeof u === 'function' ? u(state) : u; }, setPendingAdventureUpdate: u => { pending = u; },
      setFailedAdventureAction: failed, addToast, warnLog: vi.fn(), t: k => k,
    }));
    expect(callGemini).toHaveBeenCalled();
    expect(resilientJsonParse).toHaveBeenCalled();
    expect(pending).toBeUndefined();
    expect(failed).toHaveBeenCalledWith({ type: 'choice', payload: 'Cross' });
    expect(state.currentScene).toEqual(before.currentScene);
    expect([state.energy, state.xp, state.turnCount, state.isLoading]).toEqual([80, 10, 3, false]);
    expect(addToast).toHaveBeenCalledWith('toasts.adventure_reply_unreadable', 'error');
    expect(handlerSource).not.toContain('data stream error');
  });
});

describe('AD7: debate topics and resets', () => {
  it('the prompt never offers a literal "String" topic and does not reset on a concession', () => {
    expect(handlerSource).not.toContain('"newTopic": "String"');
    expect(handlerSource).not.toContain('- "Give Up" or "Concede": Set "resetDebate": true.');
    expect(handlerSource).toContain('A concession or evidence-based change of position is not giving up.');
  });
  it('applies a new topic only with a reset and never a schema placeholder', () => {
    const session = new Function('window', fs.readFileSync(SESSION, 'utf8') + '\nreturn window.AlloModules.AdventureSessionHandlers;')({ AlloModules: {} });
    const resolveWith = update => {
      let state = {
        currentScene: { text: 'Opening', options: ['A', 'B'] }, pendingChoice: 'My point', history: [], stats: { successes: 0, failures: 0, decisions: 0, conceptsFound: [] },
        energy: 100, xp: 0, xpToNextLevel: 100, level: 1, gold: 0, inventory: [], systemResources: [], imageCache: [], climax: { isActive: false, masteryScore: 0, attempts: 0 },
        debatePhase: 'active', debateMomentum: 50, debateTopic: 'Should cities ban cars?', turnCount: 2, activeXpMultiplier: 1, activeRollModifier: 0, activeGoldBuffTurns: 0, lastKeyItemTurn: 0,
      };
      session.handleDiceRollComplete(proxy({
        adventureState: state, adventureInputMode: 'debate', adventureChanceMode: false, adventureDifficulty: 'Normal', adventureFreeResponseEnabled: false,
        pendingAdventureUpdate: { scene: { text: 'Rebuttal', options: ['Respond'] }, feedback: 'ok', evaluation: 'ok', xpAwarded: 0, energyChange: 0, goldAwarded: 0, debateMomentumChange: 0, ...update },
        setAdventureState: u => { state = typeof u === 'function' ? u(state) : u; }, addToast: vi.fn(), t: k => k, warnLog: vi.fn(), alloBotRef: { current: null },
      }));
      return state.debateTopic;
    };
    expect(resolveWith({ resetDebate: false, newTopic: 'String' })).toBe('Should cities ban cars?');
    expect(resolveWith({ resetDebate: true, newTopic: 'String' })).toBe('Should cities ban cars?');
    expect(resolveWith({ resetDebate: false, newTopic: 'Should homework be banned?' })).toBe('Should cities ban cars?');
    expect(resolveWith({ resetDebate: true, newTopic: 'Should homework be banned?' })).toBe('Should homework be banned?');
  });
});
