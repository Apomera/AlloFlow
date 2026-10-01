import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const source = readFileSync('view_persona_chat_source.jsx', 'utf8');
const moduleText = readFileSync('view_persona_chat_module.js', 'utf8');
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const propNames = [...new Set([...source.matchAll(/var \w+ = props\.(\w+)/g)].map(match => match[1]))];
const t = (key, params = {}) => {
  const value = key.split('.').reduce((obj, part) => obj?.[part], strings);
  return typeof value === 'string' ? value.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '') : key;
};
const people = [
  { name: 'Ada', year: '1843', role: 'Mathematician', context: 'Computing', quests: [] },
  { name: 'Grace', year: '1952', role: 'Computer scientist', context: 'Compilers', quests: [] },
];
const greeting = { role: 'model', text: 'Welcome to the interview.', speakerName: 'Ada' };
const completed = [greeting, { role: 'user', text: 'My current question' }, { role: 'model', text: 'My current reply', speakerName: 'Ada' }];
const savedHistory = [greeting, { role: 'user', text: 'Earlier question' }, { role: 'model', text: 'Earlier saved reply', speakerName: 'Ada' }, { role: 'user', text: 'Earlier follow-up' }, { role: 'model', text: 'Earlier saved conclusion', speakerName: 'Ada' }];
const hash = value => { let n = 2166136261; for (const c of value) { n ^= c.charCodeAt(0); n = Math.imul(n, 16777619); } return 'u' + (n >>> 0).toString(36); };
const snapshot = (resourceId = 'resume-resource', mode = 'single') => ({
  v: 2, appId: 'resume-app', resourceId, studentId: hash('learner'), savedAt: new Date().toISOString(),
  state: { mode, selectedCharacter: people[0], selectedCharacters: people, chatHistory: savedHistory },
});
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
let View, root, host;
beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  window.AlloModules = {};
  new Function(moduleText)();
  View = window.AlloModules.PersonaChatView;
});
beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  delete window.__alloDeviceStoragePromise; delete window.alloDeviceStorage;
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
});
async function render({ saved = null, delayedRead = false, history = [greeting], mode = 'single' } = {}) {
  const read = deferred();
  const storage = { ready: vi.fn(async () => {}), get: vi.fn(() => delayedRead ? read.promise : Promise.resolve(saved)), set: vi.fn(async () => {}), remove: vi.fn(async () => {}) };
  window.alloDeviceStorage = storage;
  delete window.__alloDeviceStoragePromise;
  const props = {};
  for (const name of propNames) props[name] = /^(handle|set|generate|stop)/.test(name) ? vi.fn() : /Ref$/.test(name) ? React.createRef() : false;
  Object.assign(props, {
    t, appId: 'resume-app', studentNickname: 'learner', theme: 'light', isTeacherMode: true,
    ErrorBoundary: ({ children }) => children, CharacterColumn: () => null, HarmonyMeter: () => null,
    studentProjectSettings: {}, generatedContent: { id: 'resume-resource', type: 'persona', data: people },
    personaState: { mode, selectedCharacter: people[0], selectedCharacters: people, chatHistory: history, suggestions: [], panelSuggestions: [], earnedBadges: [], isLoading: false },
    personaInput: '', isPersonaFreeResponse: true, playbackState: {}, panelTtsPending: [], personaReflectionInput: '',
    formatInteractiveText: text => text, splitTextToSentences: text => [text], extractPersonaGroundingDisclosure: () => ({ links: [], queries: [] }),
  });
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const draw = () => root.render(React.createElement(View, props));
  props.setPersonaState = vi.fn(next => { props.personaState = typeof next === 'function' ? next(props.personaState) : next; draw(); });
  await act(async () => draw());
  return {
    props, storage, read,
    update: async patch => { await act(async () => { Object.assign(props, patch, patch.personaState ? { personaState: { ...props.personaState, ...patch.personaState } } : {}); draw(); }); },
    release: async value => { await act(async () => read.resolve(value)); },
  };
}
const resume = () => [...host.querySelectorAll('button')].find(button => button.textContent.trim() === strings.persona.resume_btn);
const discard = () => [...host.querySelectorAll('button')].find(button => button.textContent.trim() === strings.persona.resume_discard_btn);
const advance = async () => { await act(async () => vi.advanceTimersByTimeAsync(1600)); };

describe('Persona resume and autosave lifecycle', () => {
  for (const mode of ['single', 'panel']) {
    it(mode + ' ignores a late snapshot after a newer conversation starts', async () => {
      const h = await render({ delayedRead: true, mode });
      await h.update({ personaState: { chatHistory: completed } });
      await h.release(snapshot('resume-resource', mode));
      expect(resume()).toBeUndefined();
      await advance();
      expect(h.storage.set).toHaveBeenLastCalledWith('persona_sessions', expect.any(String), expect.objectContaining({ state: expect.objectContaining({ chatHistory: completed }) }));
    });
    it(mode + ' withdraws an existing resume offer when the transcript changes', async () => {
      const h = await render({ saved: snapshot('resume-resource', mode), mode });
      expect(resume()).toBeTruthy();
      await h.update({ personaState: { chatHistory: completed } });
      expect(resume()).toBeUndefined();
      expect(h.props.personaState.chatHistory).toEqual(completed);
    });
    it(mode + ' still resumes an unchanged interview and pauses old audio', async () => {
      const h = await render({ saved: snapshot('resume-resource', mode), mode });
      await act(async () => resume().click());
      expect(h.props.personaState.chatHistory).toEqual(savedHistory);
      expect(h.props.stopPlayback).toHaveBeenCalledOnce();
      expect(h.props.setPersonaAutoRead).toHaveBeenCalledWith(false);
      expect(resume()).toBeUndefined();
    });
  }
  it('does not overwrite a panel snapshot while its initial lookup is unresolved', async () => {
    const h = await render({ delayedRead: true, history: [greeting, { ...greeting, speakerName: 'Grace' }], mode: 'panel' });
    await advance();
    expect(h.storage.set).not.toHaveBeenCalled();
    await h.release(snapshot('resume-resource', 'panel'));
    expect(resume()).toBeTruthy();
  });
  it('blocks Resume while a response is pending, then permits it when idle', async () => {
    const h = await render({ saved: snapshot() });
    await h.update({ personaState: { isLoading: true } });
    expect(resume().disabled).toBe(true);
    await act(async () => resume().click());
    expect(h.props.setPersonaState).not.toHaveBeenCalled();
    await h.update({ personaState: { isLoading: false } });
    await act(async () => resume().click());
    expect(h.props.personaState.chatHistory).toEqual(savedHistory);
  });
  for (const action of ['close', 'unmount', 'newer turn']) {
    it('invalidates a save waiting on storage after ' + action, async () => {
      const h = await render({ history: completed });
      const ready = deferred();
      h.storage.ready.mockImplementationOnce(() => ready.promise);
      await advance();
      expect(h.storage.set).not.toHaveBeenCalled();
      if (action === 'close') await act(async () => host.querySelector('[data-persona-initial-focus]').click());
      else if (action === 'unmount') await act(async () => { root.unmount(); root = null; });
      else await h.update({ personaState: { chatHistory: completed.map((message, index) => index === 2 ? { ...message, text: 'Updated reply at the same transcript length' } : message) } });
      await act(async () => ready.resolve());
      expect(h.storage.set).not.toHaveBeenCalled();
    });
  }
  it('re-enables resume actions when the resource changes after a discard', async () => {
    const h = await render({ saved: snapshot() });
    await act(async () => discard().click());
    h.storage.get.mockResolvedValue(snapshot('second-resource'));
    await h.update({ generatedContent: { ...h.props.generatedContent, id: 'second-resource' } });
    expect(resume()).toBeTruthy();
    await act(async () => resume().click());
    expect(h.props.personaState.chatHistory).toEqual(savedHistory);
  });
  it('ignores a late snapshot when a same-length transcript was revised', async () => {
    const h = await render({ delayedRead: true, history: completed });
    const revised = completed.map((message, index) => index === 2 ? { ...message, text: 'Revised current reply' } : message);
    await h.update({ personaState: { chatHistory: revised } });
    await h.release(snapshot());
    expect(resume()).toBeUndefined();
    expect(h.props.personaState.chatHistory).toEqual(revised);
  });
  it('uses current teacher metadata when resuming an already displayed offer', async () => {
    const h = await render({ saved: snapshot() });
    const updatedAda = { ...people[0], context: 'Updated lesson context', guardrails: 'Updated teacher guidance', guardrailsSource: 'teacher' };
    await h.update({ generatedContent: { ...h.props.generatedContent, data: [updatedAda, people[1]] } });
    await act(async () => resume().click());
    expect(h.props.personaState.selectedCharacter).toMatchObject({ context: updatedAda.context, guardrails: updatedAda.guardrails, guardrailsSource: 'teacher' });
    expect(h.props.personaState.chatHistory).toEqual(savedHistory);
  });
  it('can still autosave new work if reading storage fails', async () => {
    const h = await render({ delayedRead: true, history: completed });
    await act(async () => h.read.reject(new Error('Temporary read failure')));
    await advance();
    expect(h.storage.set).toHaveBeenCalledOnce();
  });
});
