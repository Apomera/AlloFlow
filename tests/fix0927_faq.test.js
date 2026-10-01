import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
import { validAudioBase64 } from './lib/audio_fixtures.js';

// FAQ review fixes (2026-09-27). Env vars swap in scratch copies so the suite
// can be mutation-checked against pre-fix code.
const read = (envName, file) => fs.readFileSync(path.resolve(process.cwd(), process.env[envName] || file), 'utf8');
const FAQ_MODULE = read('FIX0927_FAQ_MODULE', 'view_faq_module.js');
const DISPATCH_SOURCE = read('FIX0927_FAQ_DISPATCH', 'generate_dispatcher_source.jsx');
const HOST_SOURCE = fs.readFileSync('AlloFlowANTI.txt', 'utf8');

const require = createRequire(import.meta.url);
const modulesDir = path.resolve(process.cwd(), 'desktop/web-app/node_modules');
const noop = () => {};
let React, createRoot, act, FaqView, KS, Dispatcher, faqBranch;
const enumeration = HOST_SOURCE.slice(HOST_SOURCE.indexOf('  const _enumerateReadAloudResourceSegments ='), HOST_SOURCE.indexOf('  const _encodeReadAloudBridgeAudio ='));
const hostEnumerator = new Function('window', 'splitTextToSentences', 'leveledTextLanguage', 'currentUiLanguage', enumeration + ';return _enumerateReadAloudResourceSegments;');

beforeAll(() => {
  React = require(path.resolve(modulesDir, 'react'));
  ({ createRoot } = require(path.resolve(modulesDir, 'react-dom/client')));
  ({ act } = require(path.resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('karaoke_audio_store_module.js');
  loadAlloModule('phase_k_helpers_module.js');
  loadAlloModule('read_aloud_audio_service_source.jsx');
  loadAlloModule('resource_read_aloud_module.js');
  delete window.AlloModules.FaqView;
  new Function(FAQ_MODULE)();
  FaqView = window.AlloModules.FaqView;
  KS = window.AlloModules.KaraokeAudioStore;
  (0, eval)('(function(){\n' + DISPATCH_SOURCE + '\n})()');
  Dispatcher = window.AlloModules.GenDispatcher;
  const ast = require('@babel/parser').parse(DISPATCH_SOURCE, { sourceType: 'script', plugins: ['jsx'] });
  require('@babel/traverse').default(ast, {
    IfStatement(p) {
      const test = p.node.test;
      if (test.type === 'BinaryExpression' && test.left.name === 'type' && test.right.value === 'faq' && p.node.consequent.type === 'BlockStatement') {
        faqBranch = DISPATCH_SOURCE.slice(p.node.consequent.start + 1, p.node.consequent.end - 1);
      }
    }
  });
  if (!FaqView || !faqBranch) throw new Error('FAQ view or dispatcher branch missing');
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:faq-' + Math.random() });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: noop });
});

let host, root, currentProps, store, synthesize;
const resource = (data = [{ question: 'Echo.', answer: 'Echo.' }, { question: 'Echo.', answer: 'Other.' }]) => ({ id: 'faq-fix', type: 'faq', data });
const props = overrides => ({
  t: () => undefined, generatedContent: resource(), isTeacherMode: true, isEditingFaq: true, isPlaying: false, voiceSpeed: 1,
  selectedVoice: 'Kore', effectiveLanguage: 'English', leveledTextLanguage: 'English', playbackState: { currentIdx: -1 },
  audioRef: { current: null }, playbackSessionRef: { current: null }, setVoiceSpeed: noop, setIsPlaying: noop, setPlayingContentId: noop,
  handleToggleIsEditingFaq: noop, handleFaqChange: noop, handleSpeak: noop, getRows: () => 2,
  splitTextToSentences: x => KS.splitSentences(x), formatInteractiveText: x => x, ...overrides,
});
const profile = () => ({ voice: currentProps.selectedVoice, language: currentProps.effectiveLanguage, speed: 1, synthesisRate: 1, voiceResolverVersion: 2, provider: 'gemini' });
async function render(input) {
  currentProps = input;
  if (!root) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); }
  await act(async () => root.render(React.createElement(FaqView, input)));
}
const regenerateButtons = () => [...host.querySelectorAll('button')].filter(el => /Regenerate audio\./.test(el.getAttribute('aria-label') || ''));

beforeEach(() => {
  currentProps = props();
  store = KS.createStore(); KS.current = store;
  synthesize = vi.fn(async () => ({ b64: validAudioBase64(256, 65 + synthesize.mock.calls.length), mime: 'audio/wav' }));
  const bridge = window.AlloModules.createReadAloudLegacyBridge({
    getResource: () => currentProps.generatedContent, getStore: () => store, getProfile: profile,
    enumerateResourceSegments: r => hostEnumerator(window, x => KS.splitSentences(x), 'English', 'English')(r),
    normalize: window.AlloModules.PhaseKHelpers.toSpokenText, synthesize, persist: vi.fn(async () => ({ status: 'attached' })),
  });
  window.__alloInspectReadAloudAudio = (...args) => bridge.inspect(...args);
  window.__alloRegenerateSentenceAudio = (...args) => bridge.regenerate(...args);
  window.__alloPrepareReadAloud = (...args) => bridge.prepare(...args);
  window.__bridge = bridge;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null; store?.clear(); KS.current = null;
  ['__alloInspectReadAloudAudio', '__alloRegenerateSentenceAudio', '__alloPrepareReadAloud', '__bridge'].forEach(name => delete window[name]);
  vi.restoreAllMocks();
});

describe('F3: regenerating a repeated FAQ sentence targets that occurrence', () => {
  it('regenerates the second FAQ question and leaves same-text clips untouched', async () => {
    await window.__bridge.prepare(undefined, noop, { profile: profile() });
    const before = Object.values(store.serialize().entries);
    synthesize.mockClear();
    await render(currentProps);
    expect(regenerateButtons()).toHaveLength(4);
    await act(async () => regenerateButtons()[2].click());
    expect(synthesize).toHaveBeenCalledTimes(1);
    expect(synthesize.mock.calls[0][0].segment.segmentId).toBe('faq/1/question/0');
    const after = Object.values(store.serialize().entries);
    for (const entry of before) {
      const next = after.find(value => value.identity.segmentId === entry.identity.segmentId);
      expect(next.audio === entry.audio).toBe(entry.identity.segmentId !== 'faq/1/question/0');
    }
  });
});

describe('F2: FAQ strings go through the translation helper', () => {
  const es = { 'faq.read_sentence': 'Leer: {sentence}', 'faq.save_tts': 'Guardar audio', 'faq.udl_goal_label': 'Meta DUA:' };
  it('names sentence buttons with the translated template', async () => {
    await render(props({ t: key => es[key], isTeacherMode: false, isEditingFaq: false }));
    const names = [...host.querySelectorAll('button[id^="sentence-"]')].map(el => el.getAttribute('aria-label'));
    expect(names[0]).toBe('Leer: Echo.');
    expect(names.some(name => /Read sentence/.test(name))).toBe(false);
  });
  it('translates the Save TTS control and the teacher goal label', async () => {
    await render(props({ t: key => es[key], isEditingFaq: false }));
    const save = [...host.querySelectorAll('button')].find(el => el.getAttribute('aria-label') === 'Guardar audio');
    expect(save?.textContent).toContain('Guardar audio');
    expect(host.textContent).toContain('Meta DUA:');
    expect(host.textContent).not.toContain('Save TTS');
  });
});

describe('F1: empty FAQ output', () => {
  it('shows an empty state instead of a blank panel', async () => {
    await render(props({ generatedContent: resource([]), isEditingFaq: false, isTeacherMode: false }));
    const empty = host.querySelector('[data-faq-empty]');
    expect(empty?.getAttribute('role')).toBe('status');
    expect(empty.textContent).toContain('No questions are available yet.');
  });
  it('does not crash on a non-array payload', async () => {
    await render(props({ generatedContent: { id: 'faq-bad', type: 'faq', data: {} }, isEditingFaq: false }));
    expect(host.querySelector('[data-faq-empty]')).toBeTruthy();
  });

  const cleanJson = s => String(s).replace(/```json|```/g, '').trim();
  const parseJsonLenient = (raw, fallback) => { try { return JSON.parse(cleanJson(raw)); } catch (_) { return fallback; } };
  async function runBranch(response, overrides = {}) {
    const scope = {
      usesLocalTextBackend: false, faqCount: 5, effectiveGrade: '5th Grade', effectiveLanguage: 'English', standardsDirective: '', dokDirective: '',
      studentInterests: [], useEmojis: false, effCustomInstructions: '', _xlate: { enabled: false }, glossLang: '', dialectInstruction: '',
      differentiationContext: '', textToProcess: 'Source.', setGenerationStatus: noop, setGenerationTaskProgress: noop, t: k => k,
      assertLocalTaskSupported: noop, localSchemaArg: () => null, localExcerpt: s => s, parseJsonLenient, cleanJson, warnLog: noop,
      unwrapArray: (v, keys) => Array.isArray(v) ? v : (keys.map(k => v && v[k]).find(Array.isArray) || []),
      normalizeFaqItems: Dispatcher.normalizeFaqItems, callGemini: async () => response, ...overrides,
    };
    const run = new Function('scope', 'with (scope) { return (async () => { let content, metaInfo;\n' + faqBranch + '\nreturn { content, metaInfo }; })(); }');
    return run(scope);
  }
  it('unwraps FAQs/items wrappers and q/a item shapes and labels the real count', async () => {
    const wrapped = await runBranch(JSON.stringify({ FAQs: [{ question: 'Why?', answer: 'Because.' }, { question: 'How?', answer: 'Like this.' }] }));
    expect(wrapped.content).toEqual([{ question: 'Why?', answer: 'Because.' }, { question: 'How?', answer: 'Like this.' }]);
    expect(wrapped.metaInfo.startsWith('2 Questions')).toBe(true);
    const short = await runBranch(JSON.stringify({ items: [{ q: 'What?', a: 'That.', question_en: 'What?' }] }));
    expect(short.content).toEqual([{ question: 'What?', answer: 'That.', question_en: 'What?' }]);
  });
  it('rejects empty, blank or prose output so the teacher sees a retryable error', async () => {
    for (const response of ['{}', '[{"question":"","answer":""}]', '{"unrelated":{}}', 'Here are some questions about the text.']) {
      await expect(runBranch(response)).rejects.toThrow(/FAQ/);
    }
  });
  it('normalizes q/a on the local branch too', async () => {
    const local = await runBranch(JSON.stringify({ faqs: [{ q: 'Where?', a: 'Here.' }] }), { usesLocalTextBackend: true });
    expect(local.content).toEqual([{ question: 'Where?', answer: 'Here.' }]);
  });
});
