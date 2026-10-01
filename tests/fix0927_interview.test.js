// Interview Mode fixes (2026-09-27 review of the 24 core resources).
//  I1  progress (rapport, quests, XP) no longer lives on the shared persona resource
//  I2  a failed grading call still saves the reflection, with no score
//  I3  persona reflections and summaries ride the student submission and read in the inbox
//  I4  an off-contract model reply never shows, speaks or saves raw JSON
//  I5  Full Pack / guided persona generation uses the interview normalizer
// Mutation hooks (point at a scratch copy): FIX0927_IV_PERSONAS, FIX0927_IV_PHASEK,
// FIX0927_IV_HOST, FIX0927_IV_INBOX, FIX0927_IV_DISPATCHER.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const PERSONAS = process.env.FIX0927_IV_PERSONAS || 'personas_source.jsx';
const PHASEK = process.env.FIX0927_IV_PHASEK || 'phase_k_helpers_module.js';
const HOST = process.env.FIX0927_IV_HOST || 'host_handlers_source.jsx';
const INBOX = process.env.FIX0927_IV_INBOX || 'view_submission_inbox_source.jsx';
const DISPATCHER = process.env.FIX0927_IV_DISPATCHER || 'generate_dispatcher_module.js';
const personaSource = fs.readFileSync(PERSONAS, 'utf8');

function personaHarness({ resource, replies = [] }) {
  const noop = () => {};
  let state = { mode: 'single', selectedCharacter: null, selectedCharacters: [], chatHistory: [], suggestions: [], panelSuggestions: [], isLoading: false, harmonyScore: 10, earnedBadges: [] };
  let generated = JSON.parse(JSON.stringify(resource));
  let history = [generated];
  const toasts = [];
  const queue = [...replies];
  const win = { AlloModules: {}, callGemini: vi.fn(async () => (queue.length ? queue.shift() : '[]')), callGeminiImageEdit: async () => null };
  vm.runInNewContext(personaSource, { window: win, console: { log: noop, warn: noop, error: noop }, setTimeout, clearTimeout, Date, Math, JSON, Promise, Set, Map, WeakMap, AbortController });
  const liveRef = { current: {} };
  const sync = () => Object.assign(liveRef.current, { personaState: state, generatedContent: generated, history });
  Object.assign(liveRef.current, {
    personaInput: '', sourceTopic: 'Computing', gradeLevel: '8th Grade', leveledTextLanguage: 'English', selectedLanguages: [], currentUiLanguage: 'English',
    personaTurnHintsViewed: false, isPersonaFreeResponse: true, apiKey: 'k', showPersonaHintsRef: { current: false },
    setPersonaState: next => { state = typeof next === 'function' ? next(state) : next; sync(); },
    setGeneratedContent: next => { generated = typeof next === 'function' ? next(generated) : next; sync(); },
    setHistory: next => { history = typeof next === 'function' ? next(history) : next; sync(); },
    setPersonaInput: noop, setPersonaTurnHintsViewed: noop, addToast: (...args) => toasts.push(args), t: key => key,
    setIsPersonaChatOpen: noop, setIsProcessing: noop, setIsGeneratingPersona: noop, setPanelTtsPending: noop,
    setPersonaAutoRead: noop, stopPlayback: noop, alloBotRef: { current: null }, lastReadPersonaIndexRef: { current: -1 },
    setPersonaReflectionInput: noop, setReflectionFeedback: noop, setIsPersonaDefining: noop, setIsGradingReflection: noop,
    setIsGeneratingReflectionPrompt: noop, setShowPersonaHints: noop, setIsPersonaReflectionOpen: noop, setPlayingContentId: noop, setPlaybackState: noop,
    personaDefinitionCache: { current: new Map() }, handleScoreUpdate: noop, playSound: noop, handleAiSafetyFlag: noop, callImagen: async () => null,
  });
  sync();
  const api = win.AlloModules.createPersonas({
    liveRef, warnLog: noop, debugLog: noop, cleanJson: text => String(text), fisherYatesShuffle: items => items,
    safeJsonParse: text => { try { return JSON.parse(text); } catch (_) { return null; } },
    SafetyContentChecker: { aiCheck: noop, check: () => [] },
  });
  return {
    api, win, toasts,
    get state() { return state; },
    get generated() { return generated; },
    newLearner() {
      generated = JSON.parse(JSON.stringify(history.find(item => item.id === resource.id)));
      history = [generated];
      state = { mode: 'single', selectedCharacter: null, selectedCharacters: [], chatHistory: [], suggestions: [], panelSuggestions: [], isLoading: false, harmonyScore: 10, earnedBadges: [] };
      sync();
    },
  };
}
const ada = () => ({ name: 'Ada', role: 'Mathematician', year: '1843', greeting: 'Hello', avatarUrl: 'data:image/png;base64,AA', initialRapport: 10, accumulatedXP: 0, quests: [{ id: 'q1', text: 'Ask about the engine', difficulty: 10, isCompleted: false }], suggestedQuestions: ['What did you build?'] });

describe('I1: interview progress stays with the learner, not the shared resource', () => {
  it('a teacher preview leaves no rapport, quest or XP on the resource for the next learner', async () => {
    const h = personaHarness({ resource: { id: 'r1', type: 'persona', data: [ada()], config: {} }, replies: [JSON.stringify({ response: 'The engine weaves algebra.', rapportChange: 20, completedQuestId: 'q1' })] });
    await h.api.handleSelectPersona(h.generated.data[0]);
    await h.api.handlePersonaChatSubmit('How does the engine work?', false);
    expect(h.state.selectedCharacter.rapport).toBe(30);
    expect(h.state.selectedCharacter.quests[0].isCompleted).toBe(true);
    h.api.handleClosePersonaChat();
    const stored = h.generated.data[0];
    expect(stored.rapport).toBeUndefined();
    expect(stored.accumulatedXP || 0).toBe(0);
    expect(stored.lastInterviewDate).toBeUndefined();
    expect(stored.quests[0].isCompleted).toBe(false);
    h.newLearner();
    await h.api.handleSelectPersona(h.generated.data[0]);
    expect(h.state.selectedCharacter.rapport).toBe(10);
    expect(h.state.selectedCharacter.accumulatedXP || 0).toBe(0);
    expect(h.state.selectedCharacter.quests[0].isCompleted).toBe(false);
  });

  it('ignores progress an older build already wrote onto a saved resource', async () => {
    const legacy = { ...ada(), rapport: 30, accumulatedXP: 60, reflectionText: 'Earlier learner reflection', quests: [{ id: 'q1', text: 'Ask about the engine', difficulty: 10, isCompleted: true }] };
    const h = personaHarness({ resource: { id: 'r2', type: 'persona', data: [legacy], config: {} } });
    await h.api.handleSelectPersona(h.generated.data[0]);
    expect(h.state.selectedCharacter.rapport).toBe(10);
    expect(h.state.selectedCharacter.accumulatedXP || 0).toBe(0);
    expect(h.state.selectedCharacter.quests[0].isCompleted).toBe(false);
    expect(h.state.selectedCharacter.reflectionText).toBeUndefined();
    h.api.handleClosePersonaChat();
    expect(h.generated.data[0].reflectionText).toBeUndefined();
    expect(h.generated.data[0].rapport).toBeUndefined();
    expect(h.generated.data[0].quests[0].isCompleted).toBe(false);
  });
});

describe('I4: off-contract persona replies', () => {
  const run = async reply => {
    const h = personaHarness({ resource: { id: 'r4', type: 'persona', data: [ada()], config: {} }, replies: [reply, '[]'] });
    await h.api.handleSelectPersona(h.generated.data[0]);
    await h.api.handlePersonaChatSubmit('What did you build?', false);
    return h;
  };
  it('uses the reply text from a renamed key or a one-item array', async () => {
    let h = await run(JSON.stringify({ reply: 'I wrote notes on the Analytical Engine.', rapportChange: 5 }));
    expect(h.state.chatHistory.at(-1)).toMatchObject({ role: 'model', text: 'I wrote notes on the Analytical Engine.' });
    h = await run(JSON.stringify([{ response: 'I wrote the first program.', rapportChange: 5 }]));
    expect(h.state.chatHistory.at(-1).text).toBe('I wrote the first program.');
  });
  it('never shows unreadable JSON as the character reply', async () => {
    const h = await run(JSON.stringify({ mood: 'pleased', rapportChange: 5 }));
    expect(h.state.turnError).toBe(true);
    expect(h.state.chatHistory.some(message => message.role === 'model' && /rapportChange|\{"/.test(message.text))).toBe(false);
  });
  it('still salvages a plain-text reply', async () => {
    const h = await run('I simply enjoyed the numbers.');
    expect(h.state.chatHistory.at(-1).text).toBe('I simply enjoyed the numbers.');
  });
});

describe('I2: a failed grading call still saves the reflection', () => {
  let PhaseKHelpers;
  beforeAll(() => {
    const React = require(resolve('desktop/web-app/node_modules/react'));
    globalThis.React = window.React = React;
    new Function(fs.readFileSync(PHASEK, 'utf8'))();
    PhaseKHelpers = window.AlloModules.PhaseKHelpers;
  });
  const harness = callGemini => {
    let history = [];
    let feedback = null;
    const deps = {
      personaState: { mode: 'single', selectedCharacter: { name: 'Ada', context: 'Computing' }, selectedCharacters: [], chatHistory: [{ role: 'user', text: 'What did you invent?' }, { role: 'model', text: 'An engine.' }], earnedBadges: [] },
      personaReflectionInput: 'I learned how the engine used cards to follow instructions.',
      personaReflectionSubmitRef: { current: false }, personaReflectionLastSavedKeyRef: { current: null },
      personaReflectionIdentityRef: { current: 'r:1' }, personaReflectionContextTokenRef: { current: 1 },
      personaReflectionResourceIdRef: { current: 'r' }, personaReflectionGradeAbortRef: { current: null },
      generatedContent: { id: 'r', config: {} }, targetStandards: [], dokLevel: '', currentUiLanguage: 'English', sourceTopic: 'Computing',
      callGemini, cleanJson: value => String(value || ''), setIsGradingReflection: vi.fn(),
      setHistory: vi.fn(update => { history = typeof update === 'function' ? update(history) : update; }),
      handleScoreUpdate: vi.fn(), setPersonaState: vi.fn(), setReflectionFeedback: vi.fn(value => { feedback = value; }),
      addToast: vi.fn(), playSound: vi.fn(), warnLog: vi.fn(), t: key => key,
    };
    return { deps, history: () => history, feedback: () => feedback };
  };
  it('saves with no score when the grading request fails', async () => {
    const h = harness(vi.fn().mockRejectedValue(new Error('Failed to fetch')));
    await PhaseKHelpers.handleSaveReflection(h.deps);
    expect(h.history()).toHaveLength(1);
    expect(h.history()[0].type).toBe('persona-reflection');
    expect(h.history()[0].data).toContain('engine used cards');
    expect(h.history()[0].meta).not.toMatch(/Score/);
    expect(h.feedback().score).toBeNull();
    expect(h.deps.addToast).toHaveBeenCalledWith('toasts.reflection_grade_error', 'warning');
  });
  it('saves with no score when grading times out', async () => {
    vi.useFakeTimers();
    try {
      const h = harness(vi.fn(() => new Promise(() => {})));
      const pending = PhaseKHelpers.handleSaveReflection(h.deps);
      await vi.advanceTimersByTimeAsync(45000);
      await pending;
      expect(h.history()).toHaveLength(1);
      expect(h.feedback().score).toBeNull();
    } finally { vi.useRealTimers(); }
  });
});

describe('I3: interview work reaches the teacher', () => {
  it('submits reflections and summaries but never the teacher persona resource', async () => {
    const createHostHandlers = new Function(fs.readFileSync(HOST, 'utf8') + '\nreturn createHostHandlers;')();
    const downloadSubmissionBackup = vi.fn();
    const history = [
      { id: 'p', type: 'persona', title: 'Interview Mode Options', data: [{ name: 'Ada', guardrails: 'TEACHER ONLY RULE' }] },
      { id: 'refl', type: 'persona-reflection', title: 'Reflection: Ada', data: '**Student:** Hi\n\n### Student Reflection\nI learned about the engine &amp; cards.' },
      { id: 'sum', type: 'persona-summary', title: 'Interview Summary: Ada', data: { overview: 'Ada explained the engine.', keyInsights: [{ insight: 'Cards held the program.' }] } },
    ];
    delete window.AlloModules.StudioResponse;
    const submit = createHostHandlers({
      history, studentResponses: {}, sanitizeSubmissionData: items => structuredClone(items), studentProjectSettings: {}, pasteEvents: [],
      globalPoints: 0, adventureState: { level: 1 }, gameCompletions: {}, _alloCheckpointRecordsRef: { current: [] }, _alloLedgerRef: { current: null },
      alloStableAssignmentId: () => 'a', downloadSubmissionBackup, addToast: vi.fn(), setIsSaveActionPulsing: vi.fn(), warnLog: vi.fn(), t: key => key,
    }).handleSubmitAssignment;
    await submit('Learner', {});
    const payload = downloadSubmissionBackup.mock.calls[0][0];
    expect(payload.content.map(item => item.type)).toEqual(['persona-reflection', 'persona-summary']);
    expect(JSON.stringify(payload)).not.toContain('TEACHER ONLY RULE');

    const inbox = fs.readFileSync(INBOX, 'utf8');
    const siWorkEvidence = new Function(inbox.slice(inbox.indexOf('function siWorkEvidence('), inbox.indexOf('function SubmissionInbox(')) + '\nreturn siWorkEvidence;')();
    const evidence = siWorkEvidence(payload);
    expect(evidence.interviews.map(entry => entry.title)).toEqual(['Reflection: Ada', 'Interview Summary: Ada']);
    expect(evidence.interviews[0].body).toContain('I learned about the engine & cards.');
    expect(evidence.interviews[1].body).toContain('Cards held the program.');
    expect(inbox).toContain('ev.interviews.map(');
  });
});

describe('I5: Full Pack persona generation shares the interview normalizer', () => {
  it('produces quests, a known voice and system guardrails from a thin model reply', async () => {
    const React = require(resolve('desktop/web-app/node_modules/react'));
    globalThis.React = window.React = React;
    loadAlloModule('personas_module.js');
    loadAlloModule('text_pipeline_helpers_module.js');
    loadAlloModule('generation_helpers_module.js');
    new Function(fs.readFileSync(DISPATCHER, 'utf8'))();
    const dispatcher = window.AlloModules.GenDispatcher;
    const captured = [];
    const explicit = {
      history: [], inputText: 'Ada Lovelace wrote notes on the Analytical Engine.', gradeLevel: '8th Grade', leveledTextLanguage: 'English', selectedLanguages: [],
      isTeacherMode: true, isParentMode: false, isIndependentMode: false, GUIDED_STEPS: [], LENGTH_THRESHOLDS: { short: 200, medium: 500, long: 900 }, TIMELINE_MODE_DEFINITIONS: {},
      alloBotRef: { current: null }, cleanJson: text => String(text), safeJsonParse: text => JSON.parse(text),
      callGemini: vi.fn(async () => JSON.stringify([{ name: 'Ada Lovelace', role: 'Mathematician', year: '1843', context: 'Wrote the notes', greeting: 'Hello', voice: 'NotAVoice', quests: [{ text: 'Find the first program', difficulty: 500 }] }])),
      setGeneratedContent: value => { if (value && value.type === 'persona') captured.push(value); },
      setHistory: () => {}, setPersonaState: () => {}, t: key => key, warnLog: () => {}, debugLog: () => {}, addToast: () => {},
    };
    const CALLABLE = /^(set|handle|get|call|build|format|parse|validate|compute|generate|execute|apply|fetch|is|has|can|should|split|chunk|count|filter|detect|repair|reset|reverify|perform|normalize|sanitize|fix|extract|process|reg|flyTo|fisher)/;
    const deps = new Proxy(explicit, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop !== 'string') return undefined;
        if (CALLABLE.test(prop)) return () => '';
        if (/s$/.test(prop) && /^(selected|target|suggested)/.test(prop)) return [];
        return '';
      },
      has: () => true,
    });
    try { await dispatcher.handleGenerate('persona', null, false, null, {}, true, deps); } catch (_) { /* later pipeline steps may need more deps */ }
    expect(captured.length).toBeGreaterThan(0);
    const figure = captured.at(-1).data[0];
    expect(figure.voice).toBe('Orus');
    expect(figure.guardrailsSource).toBe('system');
    expect(figure.initialRapport).toBe(10);
    expect(figure.quests[0]).toMatchObject({ id: 'q1', difficulty: 100, isCompleted: false });
  });
});
