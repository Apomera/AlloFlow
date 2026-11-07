// Lingua scripted dialogue (AI-off sweep wave 5, 2026-11-04): a branching
// target-language conversation learners play with no AI. Covers the pure
// normalizer/validator (cross-checked with AdventureOffline.validate), the
// built-in starter dialogues (only from Lingua's own STARTERS phrases), the
// lingua-config round trip through the student pack/live/file paths, the
// learner AI-off player (blocked AI spies never called, TTS via the shared
// speech player), and teacher authoring (AI writes once, doorway without AI).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, Lingua, Offline, root, host;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('lingua_practice_module.js');
  Lingua = window.AlloModules.LinguaPractice;
  // Shared story engine, for a cross-check of the graph rules.
  window.AlloIcons = window.AlloIcons || new Proxy({}, { get: () => () => null });
  window.AlloLanguageContext = window.AlloLanguageContext || React.createContext({ t: (k) => k });
  window.__alloHooks = window.__alloHooks || { useFocusTrap: () => {} };
  new Function(readFileSync('view_adventure_module.js', 'utf8'))();
  Offline = window.AlloModules.AdventureOffline;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  delete window.__alloAiUsable; delete window.__alloStudentAiDisabled; delete window.callGemini;
  delete window.AlloSpeechPlayer; delete window.AlloAiSetupNotice;
});

const dialogue = () => ({
  title: 'Meeting a classmate', start: 'd1', scenes: [
    { id: 'd1', text: 'Bonjour ! Je m’appelle Léa.', translation: 'Hello! My name is Léa.', note: 'A new classmate greets you.', choices: [
      { label: 'Bonjour, Léa !', translation: 'Hello, Léa!', to: 'd2' },
      { label: 'Salut ! Ça va ?', translation: 'Hi! How are you?', to: 'd3' },
    ] },
    { id: 'd2', text: 'Tu parles français ?', translation: 'Do you speak French?', choices: [{ label: 'Oui, je parle français.', translation: 'Yes, I speak French.', to: 'd4' }] },
    { id: 'd3', text: 'Ça va bien, merci !', translation: 'I am well, thanks!', choices: [{ label: 'Super !', translation: 'Great!', to: 'd4' }] },
    { id: 'd4', text: 'À demain !', translation: 'See you tomorrow!', ending: true },
  ],
});

function config(extraLesson = {}) {
  return {
    version: 2,
    profile: { known: 'English', target: 'French', level: 'Beginner', topic: 'Introductions' },
    practiceSet: {
      id: 'set-alpha', language: 'French', name: 'French foundations', level: 'Beginner', topic: 'Introductions', createdAt: 1000, updatedAt: 1000,
      lesson: {
        title: 'French foundations', goal: 'Greet a classmate.', scenario: 'Meeting a classmate.', inputCharacters: [],
        vocabulary: [{ term: 'bonjour', meaning: 'hello', example: 'Bonjour, Léa.', translation: 'Hello, Léa.' }],
        phrases: [{ target: 'Bonjour, je parle français.', translation: 'Hello, I speak French.' }],
        conversation: [{ coach: 'Bonjour !', translation: 'Hello!', sample: 'Bonjour !' }],
        ...extraLesson,
      },
    },
  };
}

function button(text) {
  return Array.from(host.querySelectorAll('button')).find((node) => node.textContent.includes(text));
}
async function click(node) {
  await act(async () => { node.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
}
async function mount(props) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(React.createElement(Lingua, Object.assign({ isOpen: true, onClose: () => {} }, props))); });
}
function blocked() {
  const fn = vi.fn(() => Promise.reject(Object.assign(new Error('off'), { code: 'allo-qr-ai-disabled' })));
  fn._alloQrBlocked = true;
  return fn;
}
const adventureShape = (d) => Offline.normalize({ ...d, scenes: d.scenes.map((s) => ({ ...s, text: s.text || s.note })) });

describe('dialogue data', () => {
  it('normalizes, validates and survives parseLesson; codes agree with the shared story engine', () => {
    const d = Lingua._normalizeDialogue(dialogue());
    expect(Lingua._dialogueIssues(d)).toEqual([]);
    expect(Offline.validate(adventureShape(d)).ok).toBe(true);
    expect(d.scenes[0].choices[1]).toEqual({ label: 'Salut ! Ça va ?', pronunciation: '', translation: 'Hi! How are you?', to: 'd3' });

    const broken = dialogue(); broken.scenes[1].choices[0].to = 'nowhere'; broken.scenes.push({ id: 'x', text: 'Perdu', ending: true });
    const codes = Lingua._dialogueIssues(Lingua._normalizeDialogue(broken)).map((i) => i.code + ':' + i.sceneId).sort();
    const shared = Offline.validate(adventureShape(Lingua._normalizeDialogue(broken))).errors.map((i) => i.code + ':' + i.sceneId).sort();
    expect(codes).toEqual(shared);
    expect(codes).toContain('broken_choice:d2');
    expect(codes).toContain('unreachable:x');

    const lesson = Lingua._parseLesson(JSON.stringify({ ...config().practiceSet.lesson, dialogue: dialogue() }));
    expect(lesson.dialogue.scenes).toHaveLength(4);
    expect(Lingua._parseLesson(JSON.stringify(config().practiceSet.lesson)).dialogue).toBeUndefined();
  });

  it('ships starter dialogues only for STARTERS languages, built only from their phrases', () => {
    const languages = ['Spanish', 'French', 'German', 'Arabic', 'Mandarin Chinese', 'Japanese'];
    for (const language of languages) {
      const d = Lingua._starterDialogue(language);
      expect(Lingua._dialogueIssues(d), language).toEqual([]);
      expect(Offline.validate(adventureShape(d)).errors, language).toEqual([]);
      const lesson = Lingua._fallbackLesson(language, 'English', '');
      const known = new Set();
      lesson.vocabulary.forEach((v) => { known.add(v.term); known.add(v.example); });
      d.scenes.forEach((s) => {
        if (s.text) expect(known.has(s.text), language + ' ' + s.text).toBe(true);
        s.choices.forEach((c) => expect(known.has(c.label), language + ' ' + c.label).toBe(true));
      });
      expect(Lingua._lessonDialogue(lesson, language).title).toBe('At the café');
    }
    expect(Lingua._starterDialogue('Swahili')).toBeNull();
    expect(Lingua._lessonDialogue(config().practiceSet.lesson, 'French')).toBeNull();
  });
});

describe('lingua-config round trip', () => {
  it('keeps the dialogue through the student pack, live session and project-file paths', () => {
    const win = { React: {}, AlloModules: {} };
    const { buildLiveAacModule } = require('../_build_live_aac_module.js');
    new Function('window', readFileSync('firestore_sync_module.js', 'utf8'))(win);
    new Function('window', buildLiveAacModule(readFileSync('live_aac_source.jsx', 'utf8')))(win);
    const item = { id: 'lingua-1', type: 'lingua-config', title: 'French foundations', data: config({ dialogue: dialogue() }), timestamp: new Date() };
    const packed = win.AlloModules.LiveAac.serializeResourceForStudentPack(item, { sanitizeHistoryForCloud: win.sanitizeHistoryForCloud, stripUndefined: win.stripUndefined });
    const live = win.prepareSessionResourcesForWrite([item]).resources[0];
    const file = JSON.parse(JSON.stringify({ mode: 'student', history: [packed] })).history[0];
    for (const resource of [packed, live, file]) {
      expect(resource && resource.type).toBe('lingua-config');
      const set = Lingua._normalizePracticeSets([resource.data.practiceSet])[0];
      expect(Lingua._lessonDialogue(set.lesson, 'French')).toEqual(Lingua._normalizeDialogue(dialogue()));
    }
  });
});

describe('learner with AI off', () => {
  it('plays the shipped dialogue with no AI calls, speaks through the shared player and counts turns', async () => {
    const spy = blocked();
    window.callGemini = spy;
    window.__alloStudentAiDisabled = true;
    const speakCalls = [];
    window.AlloSpeechPlayer = { speak: vi.fn(async (text, opts) => { speakCalls.push([text, opts.reason]); return true; }), stop: () => {} };
    await mount({ callGemini: null, initialConfig: config({ dialogue: dialogue() }) });

    const nav = host.querySelector('nav[aria-label="Lingua Practice sections"]');
    expect(nav.querySelector('[data-lingua-nav-key="chat"]')).toBeNull();
    await click(nav.querySelector('[data-lingua-nav-key="conversation"]'));
    const panel = host.querySelector('[data-lingua-dialogue]');
    expect(panel.textContent).toContain('Meeting a classmate');
    await click(panel.querySelector('[data-lingua-dialogue-start]'));
    expect(host.querySelector('[data-lingua-dialogue-scene="d1"]').textContent).toContain('Je m’appelle Léa');

    await click(Array.from(host.querySelectorAll('[data-lingua-dialogue] button')).find((b) => b.textContent.startsWith('▶')));
    expect(speakCalls).toEqual([['Bonjour ! Je m’appelle Léa.', 'lingua-practice']]);

    await click(host.querySelector('[data-lingua-dialogue-choice="d3"]'));
    expect(host.querySelector('[data-lingua-dialogue-scene="d3"]')).not.toBeNull();
    expect(host.querySelector('[data-lingua-dialogue]').textContent).toContain('Salut ! Ça va ?');
    await click(host.querySelector('[data-lingua-dialogue-choice="d4"]'));
    expect(host.querySelector('[data-lingua-dialogue-done]')).not.toBeNull();

    const progress = JSON.parse(localStorage.getItem('allo_lingua_progress_v1'));
    expect(JSON.stringify(progress)).toMatch(/"chatTurns":2/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('offers the built-in starter dialogue for an offline starter set', async () => {
    window.__alloStudentAiDisabled = true;
    const starter = Lingua._fallbackLesson('Spanish', 'English', '');
    await mount({ callGemini: null, initialConfig: { version: 2, profile: { known: 'English', target: 'Spanish', level: 'Beginner' }, practiceSet: { id: 'set-s', language: 'Spanish', name: 'Starter', lesson: starter, createdAt: 1, updatedAt: 1 } } });
    await click(host.querySelector('nav[aria-label="Lingua Practice sections"] [data-lingua-nav-key="conversation"]'));
    await click(host.querySelector('[data-lingua-dialogue-start]'));
    expect(host.querySelector('[data-lingua-dialogue-scene="d1"]').textContent).toContain('Hola, me llamo Ana.');
  });
});

describe('teacher authoring', () => {
  async function openEditor(props) {
    await mount(Object.assign({ isTeacherMode: true, initialConfig: config(), onSaveConfig: async () => {} }, props));
    await click(button('Practice sets'));
    await click(button('Edit'));
    return host.querySelector('[data-lingua-studio-dialogue]');
  }

  it('writes a dialogue with AI once (re-asking with the problems) and saves it into the practice set', async () => {
    const prompts = [];
    const bad = dialogue(); bad.scenes[1].choices[0].to = 'nowhere';
    const replies = [JSON.stringify(bad), '```json\n' + JSON.stringify(dialogue()) + '\n```'];
    const callGemini = vi.fn(async (prompt) => { prompts.push(prompt); return replies.shift(); });
    const section = await openEditor({ callGemini });
    expect(section).not.toBeNull();
    await act(async () => {
      section.querySelector('[data-lingua-dialogue-generate]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      for (let i = 0; i < 10; i++) await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(callGemini).toHaveBeenCalledTimes(2);
    expect(prompts[0]).toContain('Target language: French');
    expect(prompts[0]).toContain('bonjour');
    expect(prompts[1]).toContain('broken_choice at d2');
    expect(host.querySelector('[data-lingua-dialogue-status]').getAttribute('data-lingua-dialogue-status')).toBe('ready');
    expect(host.querySelector('#lingua-studio-dialogue-0-text').value).toBe('Bonjour ! Je m’appelle Léa.');

    await click(button('Save changes'));
    const sets = JSON.parse(localStorage.getItem('allo_lingua_sets_v1'));
    const saved = sets.find((s) => s.id === 'set-alpha');
    expect(saved.lesson.dialogue).toEqual(Lingua._normalizeDialogue(dialogue()));
    // The published lingua-config payload carries the practice set entry as-is.
    const payloadSet = Lingua._normalizePracticeSets([JSON.parse(JSON.stringify(saved))])[0];
    expect(Lingua._lessonDialogue(payloadSet.lesson, 'French').scenes).toHaveLength(4);
  });

  it('shows the AI setup doorway instead of the AI button when the teacher has no AI', async () => {
    window.__alloAiUsable = () => false;
    window.AlloAiSetupNotice = function Door() { return React.createElement('button', { type: 'button', 'data-ai-setup-doorway': '' }, 'Needs AI setup'); };
    const callGemini = vi.fn();
    const section = await openEditor({ callGemini });
    expect(section.querySelector('[data-lingua-dialogue-generate]')).toBeNull();
    expect(section.querySelector('[data-ai-setup-doorway]')).not.toBeNull();
    // Hand authoring still works without AI.
    await click(section.querySelector('[data-lingua-dialogue-blank]'));
    expect(host.querySelector('[data-lingua-dialogue-status]').getAttribute('data-lingua-dialogue-status')).toBe('problems');
    expect(callGemini).not.toHaveBeenCalled();
  });
});
