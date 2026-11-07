// LitLab shipped script (AI-off sweep wave 5, 2026-11-04): the teacher extracts
// the performance script once (AI), it is saved inside the litlab-config, and a
// learner with no AI opens straight into the script (no extract/generate
// buttons, blocked AI spies never called). Teachers without AI see the doorway.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, LitLab, root, host;

beforeAll(() => {
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('story_stage_module.js');
  LitLab = window.AlloModules.LitLab;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  delete window.__alloAiUsable; delete window.__alloStudentAiDisabled; delete window.callGemini; delete window.AlloAiSetupNotice;
});

const script = () => ({
  title: 'The Fox and the Crow', setting: 'A forest clearing', theme: 'Beware of flattery', literaryElements: ['dialogue'],
  characters: [
    { id: 'fox', name: 'Fox', description: 'Clever and hungry', color: '#ea580c' },
    { id: 'crow', name: 'Crow', description: 'Proud bird with cheese', color: '#1e293b' },
  ],
  lines: [
    { id: 'l1', speaker: 'narrator', text: 'A crow sat in a tree with a piece of cheese.', type: 'narration' },
    { id: 'l2', speaker: 'fox', text: 'What a beautiful bird! Surely your voice is lovely too.', type: 'dialogue' },
    { id: 'l3', speaker: 'crow', text: 'Caw!', type: 'dialogue' },
    { id: 'l4', speaker: 'narrator', text: 'The cheese fell, and the fox ran off with it.', type: 'narration' },
  ],
});
const SOURCE = 'A crow sat in a tree with a piece of cheese. A fox looked up and said, "What a beautiful bird!"';

function baseProps(extra) {
  return Object.assign({
    isOpen: true, onClose: () => {}, onCallTTS: async () => null, addToast: () => {},
    gradeLevel: '5th Grade', geminiVoices: [], kokoroVoices: [], selectedVoice: 'Kore', handleScoreUpdate: () => {},
  }, extra || {});
}
async function mount(props) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(React.createElement(LitLab, props)); });
}
function button(text) { return Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes(text)); }
async function click(node) { await act(async () => { node.dispatchEvent(new MouseEvent('click', { bubbles: true })); for (let i = 0; i < 6; i++) await Promise.resolve(); }); }
async function type(node, value) {
  const proto = node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
function blocked() {
  const fn = vi.fn(() => Promise.reject(Object.assign(new Error('off'), { code: 'allo-qr-ai-disabled' })));
  fn._alloQrBlocked = true;
  return fn;
}

describe('teacher extracts once and saves the script into litlab-config', () => {
  it('stores a plain script copy in the config payload', async () => {
    const saved = [];
    const onCallGemini = vi.fn(async (prompt) => (String(prompt).includes('performable script') ? JSON.stringify(script()) : '{}'));
    await mount(baseProps({ onCallGemini, onSaveConfig: async (config) => { saved.push(config); } }));
    expect(host.querySelector('[data-litlab-config-script="none"]')).not.toBeNull();
    await type(host.querySelector('#litlab-story-text'), SOURCE);
    await click(button('Create Script'));
    expect(host.textContent).toContain('Assign Voices');
    await click(button('Back'));
    expect(host.querySelector('[data-litlab-config-script="ready"]').textContent).toContain('3 characters, 4 lines');
    await click(button('Save as Assignment'));
    expect(saved).toHaveLength(1);
    expect(saved[0].sourceText).toBe(SOURCE);
    expect(saved[0].script.lines.map((l) => l.text)).toEqual(script().lines.map((l) => l.text));
    expect(saved[0].script.characters.map((c) => c.id)).toEqual(['narrator', 'fox', 'crow']);
    expect(Object.keys(saved[0].script.lines[0]).sort()).toEqual(['id', 'speaker', 'text', 'type']);
  });

  it('shows the AI setup doorway instead of Create Script / Generate when the teacher has no AI', async () => {
    window.__alloAiUsable = () => false;
    window.AlloAiSetupNotice = function Door() { return React.createElement('button', { type: 'button', 'data-ai-setup-doorway': '' }, 'Needs AI setup'); };
    const onCallGemini = vi.fn(async () => '{}');
    await mount(baseProps({ onCallGemini, onSaveConfig: async () => {} }));
    expect(button('Create Script')).toBeUndefined();
    expect(host.querySelectorAll('[data-ai-setup-doorway]').length).toBe(1);
    await click(button('AI Generate'));
    expect(button('Generate Story')).toBeUndefined();
    expect(host.querySelectorAll('[data-ai-setup-doorway]').length).toBe(1);
    expect(onCallGemini).not.toHaveBeenCalled();
  });
});

describe('learner with no AI performs the shipped script', () => {
  function config() {
    return { storyTitle: 'Fox and Crow', sourceText: SOURCE, teacherPrompt: 'Use a different voice for each animal.', gradeLevel: '5th Grade', inputMode: 'paste', script: script(), storyLanguage: 'English' };
  }

  it('survives the student pack, live session and project-file paths', () => {
    const win = { React: {}, AlloModules: {} };
    const { buildLiveAacModule } = require('../_build_live_aac_module.js');
    new Function('window', readFileSync('firestore_sync_module.js', 'utf8'))(win);
    new Function('window', buildLiveAacModule(readFileSync('live_aac_source.jsx', 'utf8')))(win);
    const item = { id: 'litlab-1', type: 'litlab-config', title: 'Fox and Crow', data: config(), timestamp: new Date() };
    const packed = win.AlloModules.LiveAac.serializeResourceForStudentPack(item, { sanitizeHistoryForCloud: win.sanitizeHistoryForCloud, stripUndefined: win.stripUndefined });
    const live = win.prepareSessionResourcesForWrite([item]).resources[0];
    const file = JSON.parse(JSON.stringify({ mode: 'student', history: [packed] })).history[0];
    for (const resource of [packed, live, file]) {
      expect(resource.type).toBe('litlab-config');
      expect(resource.data.script.lines).toEqual(script().lines);
      expect(resource.data.script.characters.map((c) => c.name)).toEqual(['Fox', 'Crow']);
    }
  });

  it('opens straight into the script with no extract/generate buttons and no AI calls', async () => {
    const spy = blocked();
    window.callGemini = spy;
    window.__alloStudentAiDisabled = true;
    const tts = vi.fn(async () => null);
    await mount(baseProps({ onCallGemini: null, onCallTTS: tts, initialConfig: config() }));
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(host.textContent).toContain('Assign Voices');
    expect(host.textContent).toContain('Fox');
    await click(button('Start Performance'));
    expect(host.textContent).toContain('What a beautiful bird!');
    await click(button('Back'));
    await click(button('Back'));
    expect(button('Create Script')).toBeUndefined();
    expect(button('AI Generate')).toBeUndefined();
    expect(host.querySelector('[data-litlab-ai-off]')).toBeNull();
    const reopen = host.querySelector('[data-litlab-open-config-script]');
    expect(reopen).not.toBeNull();
    await click(reopen);
    expect(host.textContent).toContain('Assign Voices');
    expect(spy).not.toHaveBeenCalled();
  });

  it('keeps the AI-off note when the assignment has no script', async () => {
    window.__alloStudentAiDisabled = true;
    const c = config(); delete c.script;
    await mount(baseProps({ onCallGemini: null, initialConfig: c }));
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(host.querySelector('[data-litlab-ai-off]')).not.toBeNull();
    expect(host.querySelector('[data-litlab-open-config-script]')).toBeNull();
  });
});

describe('Prepare narration with AI off', () => {
  const config = () => ({ storyTitle: 'Fox and Crow', sourceText: SOURCE, teacherPrompt: 'Use a different voice for each animal.', gradeLevel: '5th Grade', inputMode: 'paste', script: script(), storyLanguage: 'English' });
  it('is gone for a learner with no AI and nothing prepared, and stays for a learner with AI', async () => {
    await mount(baseProps({ onCallGemini: null, initialConfig: config() }));
    expect(button('Prepare narration')).toBeUndefined();
    expect(host.querySelector('[aria-label="Saved narration"]')).toBeNull();
    act(() => root.unmount()); root = null; host.remove(); host = null;
    await mount(baseProps({ onCallGemini: vi.fn(async () => '{}'), initialConfig: config() }));
    expect(button('Prepare narration')).toBeTruthy();
  });
});
