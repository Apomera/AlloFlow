// Student AI-off sweep (wave 4): Culture Explorer works without AI.
// With AI off the AI tabs (Cultures, Compare, Explore) are hidden, the tool opens on a
// student-authored Culture Card (guided prompts + family/community interview + self-check),
// cards save into the tool's SEL data, AI-only badges hide unless earned, and no AI fn is called.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SRC = readFileSync(resolve(ROOT, 'sel_hub', 'sel_tool_cultureexplorer.js'), 'utf8');
const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
const React = req('react');
const RDC = req('react-dom/client');
const { act } = req('react-dom/test-utils');

function blockedFn() {
  const fn = vi.fn(() => Promise.reject(Object.assign(new Error('blocked'), { code: 'allo-qr-ai-disabled' })));
  fn._alloQrBlocked = true;
  return fn;
}

beforeAll(() => {
  const noop = () => {};
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  globalThis.Audio = function () { return { play: () => Promise.resolve(), pause: noop }; };
  window.SelHub = {
    _registry: {},
    registerTool(id, config) { this._registry[id] = config; },
    isRegistered(id) { return !!this._registry[id]; },
    getRegisteredTools() { return Object.values(this._registry); },
    renderTool(id, ctx) { const t = this._registry[id]; return t && t.render ? t.render(ctx) : null; },
  };
  new Function(SRC)();
});

let root = null, container = null, latest = null, spies = null;
afterEach(() => {
  try { if (root) act(() => root.unmount()); } catch {}
  root = null; container?.remove(); container = null;
  delete window.__alloStudentAiDisabled;
  window.callGemini = undefined;
});

function mount(initial, { ai }) {
  const noop = () => {};
  spies = { callGemini: ai ? vi.fn(async () => '{}') : blockedFn(), callImagen: ai ? vi.fn(async () => '') : blockedFn() };
  if (!ai) { window.__alloStudentAiDisabled = true; window.callGemini = spies.callGemini; } else { delete window.__alloStudentAiDisabled; }
  const base = {
    React, setToolData: noop, setSelHubTool: noop, addToast: noop, awardXP: noop, announceToSR: noop, celebrate: noop,
    t: (k) => k, isDark: true, isContrast: false, theme: { isDark: true, isContrast: false, reduceMotion: true, palette: {} },
    // A student without AI: the host passes null + aiAvailable:false; the blocked fns are also
    // handed in directly to prove the tool never calls them even when they are truthy.
    callGemini: spies.callGemini, callImagen: spies.callImagen, aiAvailable: !!ai, callTTS: null, callGeminiVision: null,
    icons: new Proxy({}, { get: () => () => null }), gradeLevel: '5th Grade', gradeBand: 'elementary',
    a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }), props: {},
  };
  function Host() {
    const [td, setTd] = React.useState({ cultureExplorer: initial || {} });
    latest = td;
    const ctx = Object.assign({}, base, {
      toolData: td,
      update: (id, k, v) => setTd((p) => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } })),
      updateMulti: (id, o) => setTd((p) => ({ ...p, [id]: { ...(p[id] || {}), ...o } })),
    });
    return window.SelHub.renderTool('cultureExplorer', ctx);
  }
  container = document.createElement('div'); document.body.appendChild(container);
  root = RDC.createRoot(container);
  act(() => { root.render(React.createElement(Host)); });
  return container;
}

const tabNames = () => [...container.querySelectorAll('[role="tab"]')].map((b) => b.textContent);
const clickTab = (re) => { const b = [...container.querySelectorAll('[role="tab"]')].find((x) => re.test(x.textContent)); act(() => { b.click(); }); };
const byId = (id) => container.querySelector('#' + id);
function setVal(el, v) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  act(() => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v); el.dispatchEvent(new window.Event('input', { bubbles: true })); });
}
const buttonByText = (re) => [...container.querySelectorAll('button')].find((b) => re.test(b.textContent));

describe('Culture Explorer with student AI off', () => {
  it('opens on the Culture Card and hides the AI tabs', () => {
    mount({}, { ai: false });
    const names = tabNames().join('|');
    expect(names).toContain('Culture Card');
    for (const ai of ['Cultures', 'Compare', 'Explore']) expect(names.includes(ai), 'AI tab shown: ' + ai).toBe(false);
    expect(container.textContent).toContain('Who is this card about?');
    expect(byId('ce-research-subject')).toBeTruthy();
  });

  it('a saved AI tab falls back to the Culture Card', () => {
    mount({ tab: 'explore', culture: 'Greek' }, { ai: false });
    expect(byId('ce-research-subject')).toBeTruthy();
    expect(container.querySelector('#culture-explore-title')).toBeNull();
  });

  it('saves a card with an interview, earns the research badges, and edits it back', () => {
    mount({}, { ai: false });
    const save = () => buttonByText(/Save culture card/);
    expect(save().disabled).toBe(true);
    setVal(byId('ce-research-subject'), 'My family');
    setVal(byId('ce-rp-foods'), 'Grandma makes tamales every December.');
    act(() => { buttonByText(/family or community interview/).click(); });
    expect(container.textContent).toContain('Ask first if the person is happy to talk');
    setVal(byId('ce-research-person'), 'my grandmother');
    setVal(byId('ce-iq-q4'), 'Always share what you cook.');
    setVal(byId('ce-research-sources'), 'I asked my grandmother.');
    const boxes = [...container.querySelectorAll('input[type="checkbox"]')];
    expect(boxes.length).toBe(3);
    boxes.forEach((b) => act(() => { b.click(); }));
    expect(save().disabled).toBe(false);
    act(() => { save().click(); });

    const st = latest.cultureExplorer;
    expect(st.researchCards).toHaveLength(1);
    const card = st.researchCards[0];
    expect(card.subject).toBe('My family');
    expect(card.fields.foods).toBe('Grandma makes tamales every December.');
    expect(card.interview).toEqual({ person: 'my grandmother', answers: { q4: 'Always share what you cook.' } });
    expect(card.checks).toEqual({ source: true, noGeneralize: true, ownWords: true });
    expect(st.researchDraft).toEqual({});
    expect(st.badgesEarned).toEqual(expect.arrayContaining(['culture_researcher', 'story_keeper']));
    expect(container.textContent).toContain('My saved cards (1)');
    expect(container.textContent).toContain('Always share what you cook.');

    // Edit moves the card back into the draft (nothing is lost).
    act(() => { buttonByText(/^Edit$/).click(); });
    expect(latest.cultureExplorer.researchCards).toHaveLength(0);
    expect(byId('ce-research-subject').value).toBe('My family');
    expect(byId('ce-iq-q4').value).toBe('Always share what you cook.');

    expect(spies.callGemini).not.toHaveBeenCalled();
    expect(spies.callImagen).not.toHaveBeenCalled();
  });

  it('Edit is blocked while another card is being written', () => {
    const saved = { id: 'rc_1', subject: 'Old card', relation: 'own', fields: { foods: 'Rice' }, interview: { person: '', answers: {} }, checks: {} };
    mount({ researchCards: [saved], researchDraft: { subject: 'New card' } }, { ai: false });
    const edit = buttonByText(/^Edit$/);
    expect(edit.disabled).toBe(true);
    expect(latest.cultureExplorer.researchCards).toHaveLength(1);
    expect(byId('ce-research-subject').value).toBe('New card');
  });

  it('survives a malformed saved card list and draft', () => {
    mount({ researchCards: ['x', null, 7, { subject: { a: 1 }, fields: 'str', interview: 5, checks: 'y' }], researchDraft: { subject: 9, fields: 7, interview: 'z', checks: 3 }, badgesEarned: 9999 }, { ai: false });
    expect(byId('ce-research-subject').value).toBe('9');
    expect(container.textContent).toContain('My saved cards (1)');
    expect(container.textContent).not.toMatch(/\[object Object\]|undefined|NaN/);
  });

  it('every visible tab renders without calling AI', () => {
    mount({}, { ai: false });
    for (const name of tabNames()) {
      clickTab(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      for (const b of [...container.querySelectorAll('button')].filter((x) => /Start Quiz|Explore More/.test(x.textContent))) act(() => { b.click(); });
    }
    expect(spies.callGemini).not.toHaveBeenCalled();
    expect(spies.callImagen).not.toHaveBeenCalled();
  });

  it('hides AI-only badges (kept once earned) and counts only the shown ones', () => {
    mount({ tab: 'badges' }, { ai: false });
    let text = container.textContent;
    for (const n of ['Global Citizen', 'Deep Diver', 'Culture Connector', 'Comparison Expert']) expect(text.includes(n), 'AI badge shown: ' + n).toBe(false);
    expect(text).toContain('Culture Researcher');
    expect(text).toContain('Story Keeper');
    expect(text).toContain('/ 14 badges earned');
    act(() => root.unmount()); root = null; container.remove();

    mount({ tab: 'badges', badgesEarned: ['global_citizen'] }, { ai: false });
    text = container.textContent;
    expect(text).toContain('Global Citizen');
    expect(text).toContain('/ 15 badges earned');
    act(() => root.unmount()); root = null; container.remove();

    mount({ tab: 'badges' }, { ai: true });
    text = container.textContent;
    expect(text).toContain('Global Citizen');
    expect(text).toContain('/ 18 badges earned');
  });

  it('keeps the AI tabs when AI is usable', () => {
    mount({}, { ai: true });
    const names = tabNames().join('|');
    for (const n of ['Cultures', 'Compare', 'Explore', 'Culture Card']) expect(names).toContain(n);
  });
});
