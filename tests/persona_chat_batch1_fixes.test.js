// Persona chat fixes (2026-09-28 audit, batch 1).
//
// - Escape anywhere in the interview closed it, and closing erases the
//   conversation. A student pressing Escape while typing a question lost the
//   whole interview. Escape in a text field no longer closes it.
// - After the reflection, a button labelled "Continue" closed and cleared the
//   interview. It is now labelled "Finish interview", and lost a stray
//   aria-expanded (panel) and a redundant aria-label (single).
// - The question box was `disabled` while a reply was pending; disabling the
//   focused element drops focus out of the dialog. It is read-only instead.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const source = readFileSync('view_persona_chat_source.jsx', 'utf8');
const moduleText = readFileSync(process.env.ALLO_PERSONA_CANDIDATE || 'view_persona_chat_module.js', 'utf8');
const propNames = [...new Set([...source.matchAll(/var \w+ = props\.(\w+)/g)].map(match => match[1]))];
const t = () => undefined; // the host returns undefined for keys it does not have
const people = [
  { name: 'Ada', year: '1843', role: 'Mathematician', context: 'Computing', quests: [] },
  { name: 'Grace', year: '1952', role: 'Computer scientist', context: 'Compilers', quests: [] },
];
const greeting = { role: 'model', text: 'Welcome to the interview.', speakerName: 'Ada' };
let View, root, host;
beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  window.AlloModules = {};
  new Function(moduleText)();
  View = window.AlloModules.PersonaChatView;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  delete window.alloDeviceStorage;
});
async function render({ mode = 'single', isLoading = false, reflection = false } = {}) {
  window.alloDeviceStorage = { ready: async () => {}, get: async () => null, set: async () => {}, remove: async () => {} };
  const props = {};
  for (const name of propNames) props[name] = /^(handle|set|generate|stop)/.test(name) ? vi.fn() : /Ref$/.test(name) ? React.createRef() : false;
  Object.assign(props, {
    t, appId: 'batch1-app', studentNickname: 'learner', theme: 'light', isTeacherMode: false,
    ErrorBoundary: ({ children }) => children, CharacterColumn: () => null, HarmonyMeter: () => null,
    studentProjectSettings: {}, generatedContent: { id: 'batch1-resource', type: 'persona', data: people },
    personaState: { mode, selectedCharacter: people[0], selectedCharacters: people, chatHistory: [greeting], suggestions: [], panelSuggestions: [], earnedBadges: [], isLoading },
    personaInput: 'My half-typed question', isPersonaFreeResponse: true, playbackState: {}, panelTtsPending: [], personaReflectionInput: '',
    formatInteractiveText: text => text, splitTextToSentences: text => [text], extractPersonaGroundingDisclosure: () => ({ links: [], queries: [] }),
    isPersonaReflectionOpen: reflection, reflectionFeedback: reflection ? { feedback: 'Good thinking about the evidence.', score: 80, xpEarned: 20 } : null,
  });
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(View, props)));
  return props;
}
const escapeOn = async (el) => act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });

describe.each(['single', 'panel'])('%s mode', (mode) => {
  it('Escape while typing a question keeps the interview; Escape elsewhere closes it', async () => {
    const props = await render({ mode });
    const box = document.body.querySelector('[data-persona-composer] textarea');
    expect(box).not.toBeNull();
    box.focus();
    await escapeOn(box);
    expect(props.handleClosePersonaChat).not.toHaveBeenCalled();
    const button = [...document.body.querySelectorAll('[role="dialog"] button')][0];
    await escapeOn(button);
    expect(props.handleClosePersonaChat).toHaveBeenCalledTimes(1);
  });

  it('keeps the question box focusable while a reply is pending', async () => {
    await render({ mode, isLoading: true });
    const box = document.body.querySelector('[data-persona-composer] textarea');
    expect(box.disabled).toBe(false);
    expect(box.readOnly).toBe(true);
    expect(box.getAttribute('aria-disabled')).toBe('true');
    box.focus();
    expect(document.activeElement).toBe(box);
  });

  it('names the button that ends the interview for what it does', async () => {
    const props = await render({ mode, reflection: true });
    const finish = document.body.querySelector('[data-persona-finish-interview]');
    expect(finish).not.toBeNull();
    expect(finish.textContent.trim()).toBe('Finish interview');
    expect(finish.hasAttribute('aria-label')).toBe(false);
    expect(finish.hasAttribute('aria-expanded')).toBe(false);
    expect([...document.body.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Continue')).toBe(false);
    await act(async () => finish.click());
    expect(props.handleClosePersonaChat).toHaveBeenCalledTimes(1);
  });
});
