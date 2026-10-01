// SEL Hub · the second wiring pass (Advocacy, Upstander, Digital Wellbeing, Emotion
// Explorer journal templates) is on screen, reachable, and interactive.
//
// Same harness as tests/sel_wired_content.test.js: real tools through renderTool, a live
// tool-data store so a click re-renders, and assertions on headings, names, pressed state
// and the data a click writes.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDC: req('react-dom/client'), act: req('react-dom/test-utils').act };
} catch { R = null; }
let React, RDC, act;

function setup() {
  const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
  const noop = () => {};
  React = R.React; RDC = R.RDC; act = R.act;
  sg('React', React); window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = window.AlloModules || {};
  if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  if (typeof window.scrollTo !== 'function') window.scrollTo = noop;
  if (typeof Element.prototype.scrollIntoView !== 'function') Element.prototype.scrollIntoView = noop;
  sg('Audio', function () { return { play: () => Promise.resolve(), pause: noop }; });
  sg('IS_REACT_ACT_ENVIRONMENT', true);
  globalThis.fetch = () => Promise.resolve({ ok: false });
  const req = createRequire(import.meta.url);
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
  load(resolve(SEL, 'sel_hub_module.js'));
  for (const f of ['sel_tool_advocacy.js', 'sel_tool_upstander.js', 'sel_tool_digitalwellbeing.js', 'sel_tool_emotions.js']) load(join(SEL, f));
}

function harness(id, initial) {
  const noop = () => {};
  const pal = { bg: '#ffffff', bgCard: '#f8fafc', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1', accent: '#4f46e5', accentText: '#fff' };
  const theme = new Proxy({ isDark: false, isContrast: false, reduceMotion: true, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
  const store = { [id]: Object.assign({}, initial || {}) };
  let dirty = false;
  const mark = () => { dirty = true; };
  const base = {
    React, get toolData() { return store; },
    setToolData: (next) => { const v = typeof next === 'function' ? next(store) : next; Object.assign(store, v); mark(); },
    update: (tool, key, val) => { store[tool] = Object.assign({}, store[tool] || {}, { [key]: val }); mark(); },
    updateMulti: (tool, patch) => { store[tool] = Object.assign({}, store[tool] || {}, patch); mark(); },
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: id,
    addToast: noop, awardXP: noop, getXP: () => 0, getSavePolicy: () => ({ checkpointLabel: 'x', sharePacketLabel: 'y' }), announceToSR: noop, celebrate: noop, beep: noop,
    t: (k, fb) => (typeof fb === 'string' ? fb : k), theme, isDark: false, isContrast: false, reduceMotion: true, themePalette: pal,
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, onSafetyFlag: noop, studentCodename: 'test', selectedVoice: null, activeSessionCode: null,
    icons: new Proxy({}, { get: () => () => null }), gradeLevel: '7th Grade', gradeBand: 'middle', toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (t) => React.createElement('span', { className: 'sr-only' }, t), a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }), props: { onExportRequested: noop },
  };
  const ctx = new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = RDC.createRoot(container);
  const Probe = () => window.SelHub.renderTool(id, ctx);
  const render = () => act(() => { root.render(React.createElement(Probe, { key: Math.random() })); });
  render();
  const click = (el) => {
    expect(el, 'control to click must exist').toBeTruthy();
    act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
    if (dirty) { dirty = false; render(); }
  };
  const type = (el, value) => {
    expect(el, 'field to type into must exist').toBeTruthy();
    act(() => {
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
      el.dispatchEvent(new window.Event('input', { bubbles: true }));
      el.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    if (dirty) { dirty = false; render(); }
  };
  return { container, store, render, click, type, unmount: () => { act(() => root.unmount()); container.remove(); } };
}
const heading = (c, text) => Array.from(c.querySelectorAll('h3, h4')).find((h) => h.textContent.trim().startsWith(text));
const section = (c, key) => c.querySelector('section[aria-labelledby="' + key + '"]');
const buttonNamed = (c, re) => Array.from(c.querySelectorAll('button')).find((b) => re.test(b.getAttribute('aria-label') || b.textContent || ''));

describe.skipIf(!R)('Self-Advocacy Studio · power-ups, practice ladder, first aid, rights, words, voices, friendship audit', () => {
  beforeAll(setup);

  it('My Kit shows power-up cards with a rarity filter; marking one used is remembered', () => {
    const h = harness('advocacy', { activeTab: 'mykit' });
    expect(heading(h.container, 'Power-up cards')).toBeTruthy();
    expect(heading(h.container, 'Practice ladder')).toBeTruthy();
    expect(heading(h.container, 'One practice for today')).toBeTruthy();
    const used = buttonNamed(h.container, /^I used this$/);
    h.click(used);
    expect(h.store.advocacy.powerUpsUsed.length).toBe(1);
    expect(h.container.textContent).toMatch(/1 of \d+ cards used/);
    const rarity = h.container.querySelectorAll('[role="group"][aria-label="Card rarity"] button[aria-pressed]');
    expect(rarity.length).toBeGreaterThanOrEqual(2);
    h.click(rarity[1]);
    expect(h.store.advocacy.powerRarity).toBeTruthy();
    h.unmount();
  });

  it('Scenarios, Rights, Vocabulary, Voice and Case studies carry their panels', () => {
    const s = harness('advocacy', { activeTab: 'scenarios' });
    for (const t of ['Right now: first aid for hard moments', 'Triggers and what to do', 'More situations, step by step']) expect(heading(s.container, t), t).toBeTruthy();
    s.unmount();
    const r = harness('advocacy', { activeTab: 'rights' });
    expect(heading(r.container, 'Know your rights in Maine')).toBeTruthy();
    expect(r.container.textContent).toMatch(/not legal advice/);
    expect(r.container.textContent).toMatch(/MUSER/);
    r.unmount();
    const v = harness('advocacy', { activeTab: 'vocabulary' });
    expect(heading(v.container, 'Words that hurt, and what to say instead')).toBeTruthy();
    v.unmount();
    const vo = harness('advocacy', { activeTab: 'voice' });
    expect(heading(vo.container, 'Voices to borrow when yours is quiet')).toBeTruthy();
    const another = buttonNamed(vo.container, /^Another one$/);
    vo.click(another);
    expect(Object.keys(vo.store.advocacy).some((k) => k.startsWith('wiredSeed_'))).toBe(true);
    vo.unmount();
    const cs = harness('advocacy', { activeTab: 'casestudies' });
    expect(heading(cs.container, 'How we got here')).toBeTruthy();
    cs.unmount();
  });

  it('the friendship audit records yes and no per question and reports the counts', () => {
    const h = harness('advocacy', { activeTab: 'strengths' });
    expect(heading(h.container, 'Friendship audit')).toBeTruthy();
    const yes = Array.from(h.container.querySelectorAll('section[aria-labelledby="_advW-wired-friendship"] button[aria-pressed]')).filter((b) => b.textContent.trim() === 'Yes');
    expect(yes.length).toBeGreaterThanOrEqual(10);
    h.click(yes[0]);
    const no = Array.from(h.container.querySelectorAll('section[aria-labelledby="_advW-wired-friendship"] button[aria-pressed]')).filter((b) => b.textContent.trim() === 'No');
    h.click(no[1]);
    const values = Object.values(h.store.advocacy.friendshipAudit);
    expect(values.filter((v) => v === 'yes').length).toBe(1);
    expect(values.filter((v) => v === 'no').length).toBe(1);
    expect(h.container.querySelector('[role="status"]').textContent).toMatch(/1 yes, 1 no/);
    h.unmount();
  });
});

describe.skipIf(!R)('Upstander · courage ladder, situations, why people freeze, repair, voices, stories', () => {
  beforeAll(() => { if (!window.SelHub || !window.SelHub.isRegistered('upstander')) setup(); });

  it('Moves shows the courage ladder with a level filter, everyday moments, and scripts', () => {
    const h = harness('upstander', { activeTab: 'moves' });
    for (const t of ['Courage ladder', 'Everyday upstander moments', 'Words that have worked']) expect(heading(h.container, t), t).toBeTruthy();
    const lvls = h.container.querySelectorAll('[role="group"][aria-label="Courage level"] button[aria-pressed]');
    expect(lvls.length).toBeGreaterThanOrEqual(3);
    h.click(lvls[1]);
    expect(h.store.upstander.courageLevel).toBeTruthy();
    h.unmount();
  });

  it('Practice, Roles, Cycle, Pledge and Reference carry their panels', () => {
    const p = harness('upstander', { activeTab: 'practice' });
    expect(heading(p.container, 'Situations, with the low-risk move first')).toBeTruthy();
    expect(p.container.textContent).toMatch(/Low Risk Moves/);
    p.unmount();
    const r = harness('upstander', { activeTab: 'roles' });
    expect(heading(r.container, 'Why people freeze')).toBeTruthy();
    r.unmount();
    const c = harness('upstander', { activeTab: 'cycle' });
    expect(heading(c.container, 'Repair, step by step')).toBeTruthy();
    c.unmount();
    const pl = harness('upstander', { activeTab: 'pledge' });
    expect(heading(pl.container, 'Voices')).toBeTruthy();
    expect(heading(pl.container, 'A prompt to write from')).toBeTruthy();
    pl.unmount();
    const ref = harness('upstander', { activeTab: 'reference' });
    for (const t of ['Stories from people who spoke up', 'People who stood up before you', 'Questions people ask', 'For families and educators']) expect(heading(ref.container, t), t).toBeTruthy();
    expect(section(ref.container, '_upW-wired-stories').querySelectorAll('details').length).toBeGreaterThanOrEqual(20);
    ref.unmount();
  });
});

describe.skipIf(!R)('Digital Wellbeing · habits, prompts, situations, how the apps work on you, AI, voices, reference', () => {
  beforeAll(() => { if (!window.SelHub || !window.SelHub.isRegistered('digitalWellbeing')) setup(); });

  it('every tab except Self-Check gained its panel, and the prompt deck advances', () => {
    const t = harness('digitalWellbeing', { activeTab: 'toolkit' });
    expect(heading(t.container, 'Habits that hold')).toBeTruthy();
    t.click(buttonNamed(t.container, /^Another one$/));
    expect(t.store.digitalWellbeing.wiredSeed_prompt).toBe(1);
    t.unmount();
    const c = harness('digitalWellbeing', { activeTab: 'cyberbullying' });
    expect(heading(c.container, 'Situations, and what to do first')).toBeTruthy();
    expect(heading(c.container, 'Recovering afterwards')).toBeTruthy();
    c.unmount();
    const m = harness('digitalWellbeing', { activeTab: 'medialit' });
    expect(heading(m.container, 'How the apps work on you')).toBeTruthy();
    expect(m.container.textContent).toMatch(/Infinite scroll/);
    m.unmount();
    const a = harness('digitalWellbeing', { activeTab: 'aicompanion' });
    expect(heading(a.container, 'Talking to an AI')).toBeTruthy();
    a.unmount();
    const cr = harness('digitalWellbeing', { activeTab: 'crisis' });
    expect(heading(cr.container, 'Voices')).toBeTruthy();
    cr.unmount();
    const r = harness('digitalWellbeing', { activeTab: 'reference' });
    for (const x of ['Stories', 'Words', 'What the research says, with its limits', 'For families and educators']) expect(heading(r.container, x), x).toBeTruthy();
    r.unmount();
  });
});

describe.skipIf(!R)('Emotion Explorer · guided journal templates', () => {
  beforeAll(() => { if (!window.SelHub || !window.SelHub.isRegistered('emotions')) setup(); });

  it('picking a template shows labelled fields; typing stores the answer under that template', () => {
    const h = harness('emotions', { activeTab: 'journal' });
    expect(heading(h.container, 'Guided journal templates')).toBeTruthy();
    const templates = h.container.querySelectorAll('[role="group"][aria-label="Journal template"] button[aria-pressed]');
    expect(templates.length).toBe(20);
    h.click(templates[0]);
    const tid = h.store.emotions.journalTemplate;
    expect(tid).toBeTruthy();
    const field = h.container.querySelector('textarea[id^="emo-jt-' + tid + '-"]');
    expect(field).toBeTruthy();
    expect(h.container.querySelector('label[for="' + field.id + '"]')).toBeTruthy();
    h.type(field, 'It started at lunch.');
    expect(h.store.emotions.journalTemplateAnswers[tid][0]).toBe('It started at lunch.');
    h.unmount();
  });
});
