// Persona "Role Swap" (2026-11-04, student AI-off sweep wave 2).
//
// With no usable AI a learner could only read the figure's greeting. Role Swap
// turns the interview around: the student answers the figure's stored
// questions AS the figure, cites evidence from the source passage, and ticks a
// short self-check. It needs no AI. Saving writes a learner-owned
// 'persona-reflection' history item, which rides the assignment submission and
// shows in the teacher's Submission Inbox under "Interview reflections".
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const viewSource = readFileSync('view_persona_chat_source.jsx', 'utf8');
const viewModule = readFileSync('view_persona_chat_module.js', 'utf8');
const personasModule = readFileSync('personas_module.js', 'utf8');
const propNames = [...new Set([...viewSource.matchAll(/var \w+ = props\.(\w+)/g)].map(match => match[1]))];
const t = () => undefined; // the host returns undefined for keys it does not have

const passage = 'In 1863 the president said that the nation was conceived in liberty and dedicated to the proposition that all men are created equal.';
const people = [
  { name: 'Ada', year: '1843', role: 'Mathematician', context: 'Computing', quests: [],
    suggestedQuestions: [{ text: 'What did you hope machines could do?', tier: 'good' }, { text: 'Do you like cake?', tier: 'poor' }, 'Who helped your work?'] },
  { name: 'Grace', year: '1952', role: 'Computer scientist', context: 'Compilers', quests: [], suggestedQuestions: ['Why did you build a compiler?'] },
];
const greeting = { role: 'model', text: 'Welcome to the interview.', speakerName: 'Ada' };
const resource = { id: 'role-swap-resource', type: 'persona', data: people, config: { personaSource: { kind: 'input', topic: 'Address', fingerprint: 'fp-1', excerpt: passage } } };

let View, root, host;
beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  window.AlloModules = {};
  new Function(viewModule)();
  View = window.AlloModules.PersonaChatView;
  new Function(personasModule)();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  delete window.alloDeviceStorage;
  delete window.__alloAiUsable;
  delete window.callGemini;
  delete window.AlloModules.PersonaRoleSwap;
});

function makeFactory(history) {
  const liveRef = { current: {} };
  const setHistory = vi.fn(updater => { history.items = typeof updater === 'function' ? updater(history.items) : updater; liveRef.current.history = history.items; });
  const handleScoreUpdate = vi.fn();
  Object.assign(liveRef.current, { setHistory, handleScoreUpdate, generatedContent: resource, history: history.items });
  const api = window.AlloModules.createPersonas({ liveRef, warnLog: () => {}, debugLog: () => {} });
  return { api, setHistory, handleScoreUpdate };
}

async function render({ mode = 'single', aiUsable = false, isTeacherMode = false, onSave } = {}) {
  window.__alloAiUsable = () => aiUsable;
  window.callGemini = vi.fn(async () => { throw new Error('AI must not be called'); });
  window.alloDeviceStorage = { ready: async () => {}, get: async () => null, set: async () => {}, remove: async () => {} };
  const props = {};
  for (const name of propNames) props[name] = /^(handle|set|generate|stop)/.test(name) ? vi.fn() : /Ref$/.test(name) ? React.createRef() : false;
  delete props.handleSavePersonaRoleSwap; // the host does not pass it yet: the view falls back to the module export
  if (onSave) props.handleSavePersonaRoleSwap = onSave;
  Object.assign(props, {
    t, appId: 'role-swap-app', studentNickname: 'learner', theme: 'light', isTeacherMode,
    ErrorBoundary: ({ children }) => children, CharacterColumn: () => null, HarmonyMeter: () => null,
    studentProjectSettings: {}, generatedContent: resource,
    personaInput: '', isPersonaFreeResponse: true, playbackState: {}, panelTtsPending: [], personaReflectionInput: '',
    formatInteractiveText: text => text, splitTextToSentences: text => [text],
  });
  const stateBox = { current: { mode, selectedCharacter: people[0], selectedCharacters: people, chatHistory: [greeting], suggestions: [], panelSuggestions: [], earnedBadges: [], isLoading: false } };
  function Host() {
    const [personaState, setPersonaState] = React.useState(stateBox.current);
    stateBox.current = personaState;
    return React.createElement(View, { ...props, personaState, setPersonaState });
  }
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Host)));
  return { props, stateBox };
}
const q = (selector) => document.body.querySelector(selector);
const type = async (el, value) => act(async () => {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
const click = async (el) => act(async () => { el.click(); });

describe('Role Swap with student AI off', () => {
  it('replaces the dead end with Role Swap, keeps the note as an intro, and offers only real questions', async () => {
    await render();
    const section = q('[data-persona-role-swap]');
    expect(section).not.toBeNull();
    expect(section.querySelector('[data-persona-ai-off]')).not.toBeNull();
    expect(q('[data-persona-composer] textarea')).toBeNull();
    expect(document.body.textContent).toContain('Welcome to the interview.');
    expect(section.textContent).toContain('Role Swap: you answer as Ada');
    const questions = [...section.querySelectorAll('[data-role-swap-question]')].map(b => b.textContent.trim());
    expect(questions).toEqual(['What did you hope machines could do?', 'Who helped your work?', 'Your own question']);
    expect(section.textContent).not.toContain('Do you like cake?'); // deliberately poor MC distractor
    expect(q('[data-persona-role-swap-toggle]')).toBeNull(); // no "back to interview" path when AI is off
    expect(section.querySelector('button')?.textContent).not.toBe('Back to interview');
    expect(q('[data-role-swap-save]').disabled).toBe(true);
  });

  it('keeps answers, evidence and self-checks in persona state and never calls AI', async () => {
    const { stateBox } = await render();
    await type(q('[data-role-swap-answer]'), 'I hoped they could compose music.');
    await type(q('[data-role-swap-evidence]'), '"dedicated to the proposition that all men are created equal"');
    expect(q('[data-role-swap-evidence-found]')).not.toBeNull();
    await click(q('[data-role-swap-check="inCharacter"]'));
    await click(document.body.querySelectorAll('[data-role-swap-question]')[1]);
    expect(q('[data-role-swap-answer]').value).toBe('');
    await click(document.body.querySelectorAll('[data-role-swap-question]')[0]);
    expect(q('[data-role-swap-answer]').value).toBe('I hoped they could compose music.');
    const saved = stateBox.current.roleSwap;
    expect(saved.key).toBe('single:Ada:role-swap-resource');
    expect(saved.answers['0:What did you hope machines could do?']).toMatchObject({ speaker: 'Ada', question: 'What did you hope machines could do?', answer: 'I hoped they could compose music.' });
    expect(saved.checks).toEqual({ inCharacter: true });
    expect(window.callGemini).not.toHaveBeenCalled();
  });

  it('saves through the Personas module into a teacher-visible persona-reflection item', async () => {
    const history = { items: [resource] };
    const { setHistory, handleScoreUpdate } = makeFactory(history);
    expect(typeof window.AlloModules.PersonaRoleSwap.save).toBe('function');
    await render();
    await type(q('[data-role-swap-answer]'), 'I hoped they could compose <music>.');
    await type(q('[data-role-swap-evidence]'), 'all men are created equal');
    await click(q('[data-role-swap-check="usesEvidence"]'));
    await click(q('[data-role-swap-save]'));
    expect(setHistory).toHaveBeenCalledTimes(1);
    const item = history.items[1];
    expect(item.type).toBe('persona-reflection');
    expect(item.title).toBe('Role Swap: Ada');
    expect(item.config.kind).toBe('role-swap');
    expect(item.config.roleSwap.entries).toEqual([{ speaker: 'Ada', question: 'What did you hope machines could do?', answer: 'I hoped they could compose <music>.', evidence: 'all men are created equal', evidenceInSource: true }]);
    expect(item.config.roleSwap.selfCheck).toEqual({ inCharacter: false, usesEvidence: true, accurate: false });
    expect(item.data).toContain('**Answer as Ada:**');
    expect(item.data).toContain('compose &lt;music&gt;.');
    expect(item.data).toContain('- [x] Used evidence from the source');
    expect(q('[data-role-swap-status]').textContent).toContain('Saved to your work');
    expect(handleScoreUpdate).toHaveBeenCalledTimes(1);

    // Saving again updates the same record instead of adding another (and awards no more XP).
    await type(q('[data-role-swap-answer]'), 'A revised answer.');
    await click(q('[data-role-swap-save]'));
    expect(history.items.filter(i => i.type === 'persona-reflection')).toHaveLength(1);
    expect(history.items[1].id).toBe(item.id);
    expect(history.items[1].config.roleSwap.entries[0].answer).toBe('A revised answer.');
    expect(handleScoreUpdate).toHaveBeenCalledTimes(1);
    expect(window.callGemini).not.toHaveBeenCalled();
  });

  it('reports a save it could not make and keeps the answer', async () => {
    await render({ onSave: vi.fn(async () => null) });
    await type(q('[data-role-swap-answer]'), 'Still here.');
    await click(q('[data-role-swap-save]'));
    expect(q('[data-role-swap-status]').textContent).toContain('Could not save yet');
    expect(q('[data-role-swap-answer]').value).toBe('Still here.');
  });

  it('Escape inside Role Swap does not close (and erase) the interview', async () => {
    const { props } = await render();
    const button = q('[data-role-swap-question]');
    await act(async () => { button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
    expect(props.handleClosePersonaChat).not.toHaveBeenCalled();
  });

  it('panel mode asks each figure its own questions, labelled by name', async () => {
    await render({ mode: 'panel' });
    const labels = [...document.body.querySelectorAll('[data-role-swap-question]')].map(b => b.textContent.trim());
    expect(labels).toContain('Grace: Why did you build a compiler?');
    expect(labels).toContain('Ada: Your own question');
    expect(q('[data-persona-role-swap]').textContent).toContain('Role Swap: you answer as Ada & Grace');
  });
});

describe('Role Swap with AI available', () => {
  it('is an option beside the interview and returns to it', async () => {
    await render({ aiUsable: true });
    expect(q('[data-persona-role-swap]')).toBeNull();
    expect(q('[data-persona-composer] textarea')).not.toBeNull();
    const toggle = q('[data-persona-role-swap-toggle]');
    expect(toggle.getAttribute('aria-label')).toBe('Role Swap: you answer as Ada');
    await click(toggle);
    expect(q('[data-persona-role-swap]')).not.toBeNull();
    expect(q('[data-persona-ai-off]')).toBeNull();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    const back = [...q('[data-persona-role-swap]').querySelectorAll('button')].find(b => b.textContent.trim() === 'Back to interview');
    await click(back);
    expect(q('[data-persona-role-swap]')).toBeNull();
    expect(q('[data-persona-composer] textarea')).not.toBeNull();
  });
});

describe('Personas module wiring', () => {
  it('a probe factory (shared normalizer) does not replace the live save export', () => {
    const history = { items: [] };
    makeFactory(history);
    const live = window.AlloModules.PersonaRoleSwap.save;
    window.AlloModules.normalizePersonaCandidates([]);
    expect(window.AlloModules.PersonaRoleSwap.save).toBe(live);
    expect(live({ key: 'k', entries: [{ speaker: 'Ada', question: 'Q?', answer: '' }] })).toBeNull();
  });
});
