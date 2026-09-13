// SEL Hub · the content wired back on 2026-09-13 is on screen, reachable, and named.
//
// Aug 25 found ~5 MB of authored SEL content that no view read. Sept 13 removed it,
// archived it, and then wired the strongest of it into the tools on the Crew path:
// Emotion Zones (body cues, validating sentences, real co-regulation situations,
// educator guidance), HOWL Tracker (micro-actions, coaching moves, repair and
// conference scripts, EL library), Mindfulness (trauma-sensitive alternatives,
// sensory anchors, awe practices, a 390-prompt gratitude bank), and the Emotion
// Explorer (optional illustrations with emoji fallback). This suite mounts the REAL
// tools through renderTool and checks each panel renders with a heading, that the
// interactive bits carry names and pressed state, and that clicking them changes
// tool data the way the tool expects.

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
  const req = createRequire(import.meta.url);
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
  load(resolve(SEL, 'sel_hub_module.js'));
  for (const f of ['sel_tool_zones.js', 'sel_tool_howl.js', 'sel_tool_mindfulness.js', 'sel_tool_emotions.js']) load(join(SEL, f));
}

// A ctx whose update/updateMulti write into a live store, so a click re-renders with the new state.
function harness(id, initial) {
  const noop = () => {};
  const pal = { bg: '#ffffff', bgCard: '#f8fafc', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1', accent: '#4f46e5', accentText: '#fff' };
  const theme = new Proxy({ isDark: false, isContrast: false, reduceMotion: true, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
  const store = { [id]: Object.assign({}, initial || {}) };
  let rerender = () => {};
  const base = {
    React, get toolData() { return store; },
    setToolData: (next) => { const v = typeof next === 'function' ? next(store) : next; Object.assign(store, v); rerender(); },
    update: (tool, key, val) => { store[tool] = Object.assign({}, store[tool] || {}, { [key]: val }); rerender(); },
    updateMulti: (tool, patch) => { store[tool] = Object.assign({}, store[tool] || {}, patch); rerender(); },
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
  // A state write from inside a click handler marks the tree dirty; the re-render
  // happens after that act() completes, never nested inside it.
  let dirty = false;
  rerender = () => { dirty = true; };
  render();
  const click = (el) => {
    expect(el, 'control to click must exist').toBeTruthy();
    act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
    if (dirty) { dirty = false; render(); }
  };
  return { container, store, render, click, unmount: () => { act(() => root.unmount()); container.remove(); } };
}
const heading = (c, text) => Array.from(c.querySelectorAll('h3, h4')).find((h) => h.textContent.trim().startsWith(text));
const buttonNamed = (c, re) => Array.from(c.querySelectorAll('button')).find((b) => re.test(b.getAttribute('aria-label') || b.textContent || ''));

describe.skipIf(!R)('Emotion Zones · body cues, validation, situations, educator guidance', () => {
  beforeAll(setup);

  it('check-in shows body cues; tapping cues suggests a zone; choosing it shows a validating sentence', () => {
    const h = harness('zones', { activeTab: 'checkin' });
    expect(heading(h.container, 'What is your body telling you?')).toBeTruthy();
    const group = h.container.querySelector('[role="group"][aria-label="Body sensations you notice"]');
    expect(group).toBeTruthy();
    const chips = Array.from(group.querySelectorAll('button[aria-pressed]'));
    expect(chips.length).toBeGreaterThanOrEqual(12);
    expect(h.container.textContent).not.toMatch(/Most of what you tapped/);
    // Tap two chips from the same zone (they are grouped blue, green, yellow, red in order).
    h.click(chips[0]);
    h.click(h.container.querySelector('[role="group"][aria-label="Body sensations you notice"] button:nth-of-type(2)'));
    expect(h.store.zones.bodyCues.length).toBe(2);
    const status = h.container.querySelector('[role="status"]');
    expect(status && status.textContent).toMatch(/points to the .* Zone/);
    const choose = buttonNamed(h.container, /^Choose .* Zone$/);
    expect(choose).toBeTruthy();
    h.click(choose);
    expect(h.store.zones.selectedZone).toBeTruthy();
    expect(heading(h.container, 'Something true to hear right now')).toBeTruthy();
    expect(h.container.textContent).toMatch(/“.+”/);
    const another = buttonNamed(h.container, /^Another one$/);
    h.click(another);
    expect(h.store.zones.validationSeed).toBe(1);
    expect(h.container.querySelector('details summary').textContent).toMatch(/Why this helps/);
    h.unmount();
  });

  it('Help a Friend lists real situations for the predicted zone, with escalation guidance', () => {
    const h = harness('zones', { activeTab: 'coreg_helper', crStep: 2, crPredicted: 'yellow', crObserved: ['fidgeting'] });
    expect(heading(h.container, 'Real situations in the')).toBeTruthy();
    const details = Array.from(h.container.querySelectorAll('section[aria-labelledby="zones-wired-coreg"] details'));
    expect(details.length).toBeGreaterThanOrEqual(3);
    const body = details[0].textContent;
    expect(body).toMatch(/What to say/);
    expect(body).toMatch(/What not to say/);
    expect(body).toMatch(/When to get an adult/);
    h.unmount();
  });

  it('Classroom tab carries the educator-facing community guidance, clearly labelled as adult guidance', () => {
    const h = harness('zones', { activeTab: 'classroom' });
    const sec = h.container.querySelector('section[aria-labelledby="zones-wired-cultural"]');
    expect(sec).toBeTruthy();
    expect(sec.textContent).toMatch(/Written for the adult, not the student/);
    expect(sec.querySelectorAll('details').length).toBeGreaterThanOrEqual(10);
    h.unmount();
  });
});

describe.skipIf(!R)('HOWL Tracker · micro-actions, coaching moves, repair and conference scripts, EL library', () => {
  beforeAll(() => { if (!window.SelHub || !window.SelHub.isRegistered('howlTracker')) setup(); });

  it('Goals offers three micro-actions per HOWL and one tap adds one to the goal list', () => {
    const h = harness('howlTracker', { view: 'goals' });
    expect(heading(h.container, 'Micro-actions you could try this week')).toBeTruthy();
    const add = Array.from(h.container.querySelectorAll('button[aria-label^="Add micro-action: "]'));
    expect(add.length).toBe(12); // 4 HOWLs x 3
    h.click(add[0]);
    const st = h.store.howlTracker;
    const lists = Object.values(st.goalActions[Object.keys(st.goalActions)[0]]);
    expect(lists.some((l) => l.length === 1 && l[0].source === 'suggested' && l[0].text.length > 5)).toBe(true);
    h.click(buttonNamed(h.container, /Show me different ones/));
    expect(h.store.howlTracker.microSeed).toBe(3);
    h.unmount();
  });

  it('Crew prompts gains coaching moves for the Crew leader, filterable by category', () => {
    const h = harness('howlTracker', { view: 'crew' });
    expect(heading(h.container, 'For the Crew leader: coaching moves')).toBeTruthy();
    const cats = h.container.querySelectorAll('[role="group"][aria-label="Coaching move category"] button[aria-pressed]');
    expect(cats.length).toBeGreaterThanOrEqual(3);
    expect(h.container.querySelectorAll('section[aria-labelledby="howl-wired-for-the-crew-leader-coaching-moves"] details').length).toBeGreaterThanOrEqual(5);
    h.click(cats[1]);
    expect(h.store.howlTracker.coachCategory).toBe(cats[1].textContent.trim());
    h.unmount();
  });

  it('Protocols, SLC rehearsal and Library carry the repair scripts, conference scripts and EL background', () => {
    // 19m: the thirty "scripts" shared one body, so each panel shows the one script once with the
    // situations it fits (see tests/sel_howl_content_honesty_2.test.js).
    const p = harness('howlTracker', { view: 'protocols' });
    expect(heading(p.container, 'Repair conversation')).toBeTruthy();
    expect(p.container.textContent).toMatch(/When not to do this/);
    expect(p.container.textContent).toMatch(/Fits these situations/);
    p.unmount();
    const c = harness('howlTracker', { view: 'conference' });
    expect(heading(c.container, 'Conference agenda')).toBeTruthy();
    expect(c.container.textContent).toMatch(/Occasions/);
    c.unmount();
    const l = harness('howlTracker', { view: 'library' });
    for (const t of ['EL Education core practices', 'Habits of character', 'Expedition connections', 'Research behind EL Education']) expect(heading(l.container, t), t).toBeTruthy();
    expect(l.container.textContent).toMatch(/Caveat/);
    l.unmount();
  });
});

describe.skipIf(!R)('Mindfulness · safer alternatives, anchors, awe, gratitude bank', () => {
  beforeAll(() => { if (!window.SelHub || !window.SelHub.isRegistered('mindfulness')) setup(); });

  it('Body Scan and Meditate show trauma-sensitive alternatives with signs to stop', () => {
    const s = harness('mindfulness', { activeTab: 'scan' });
    expect(heading(s.container, 'If this practice feels unsafe')).toBeTruthy();
    expect(s.container.textContent).toMatch(/Closed-eye body scan/);
    expect(s.container.textContent).toMatch(/Early signs to stop/);
    s.unmount();
    const m = harness('mindfulness', { activeTab: 'meditate' });
    expect(heading(m.container, 'If this practice feels unsafe')).toBeTruthy();
    expect(m.container.textContent).toMatch(/Loving-kindness/);
    m.unmount();
  });

  it('Grounding gains sensory anchors filterable by sense, and Moments gains awe practices', () => {
    const g = harness('mindfulness', { activeTab: 'ground' });
    expect(heading(g.container, 'More anchors for your senses')).toBeTruthy();
    const senses = g.container.querySelectorAll('[role="group"][aria-label="Sense"] button[aria-pressed]');
    expect(senses.length).toBeGreaterThanOrEqual(3);
    g.click(senses[1]);
    expect(g.store.mindfulness.anchorSense).toBe(senses[1].textContent.trim());
    expect(g.container.textContent).toMatch(/Eyes-open visual anchors|How to use it/);
    g.unmount();
    const mo = harness('mindfulness', { activeTab: 'moments' });
    expect(heading(mo.container, 'Awe practices')).toBeTruthy();
    expect(mo.container.querySelectorAll('section[aria-labelledby="mind-wired-awe"] details').length).toBeGreaterThanOrEqual(5);
    mo.unmount();
  });

  it('the gratitude prompt bank is drawn from (source check: the prompt list is extended by the bank)', () => {
    const src = readFileSync(resolve(SEL, 'sel_tool_mindfulness.js'), 'utf8');
    expect(src).toContain("GRATITUDE_PROMPT_BANK.filter(function(p) { return !p.forBand || p.forBand === 'all' || p.forBand === band; }).map(function(p) { return p.prompt; })");
    expect((src.match(/prompt: '/g) || []).length).toBeGreaterThan(300);
  });
});

describe.skipIf(!R)('Emotion Explorer · optional illustrations with emoji fallback', () => {
  beforeAll(() => { if (!window.SelHub || !window.SelHub.isRegistered('emotions')) setup(); });

  it('renders emoji (aria-hidden, the word is printed beside it) when no image manifest is published', () => {
    const orig = globalThis.fetch;
    globalThis.fetch = () => Promise.resolve({ ok: false });
    try {
      const h = harness('emotions', {});
      const hidden = h.container.querySelectorAll('span[aria-hidden="true"]');
      expect(hidden.length).toBeGreaterThan(0);
      expect(h.container.querySelector('img[src$=".webp"]')).toBeNull();
      h.unmount();
    } finally { globalThis.fetch = orig; }
  });

  it('swaps in an image for a feeling or family listed in the manifest, keeps emoji for the rest', async () => {
    // Fresh load so the module-level manifest cache starts empty.
    const req = createRequire(import.meta.url);
    const orig = globalThis.fetch;
    globalThis.fetch = (url) => Promise.resolve({ ok: /manifest\.json$/.test(String(url)), json: () => Promise.resolve({ families: { happy: 'family-happy.webp' }, feelings: { proud: 'proud.webp' } }) });
    try {
      delete window.SelHub._registry.emotions;
      new Function('require', readFileSync(resolve(SEL, 'sel_tool_emotions.js'), 'utf8'))(req);
      const h = harness('emotions', {});
      await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
      h.render();
      const img = h.container.querySelector('img[src$="family-happy.webp"]');
      expect(img, 'happy family image should render once the manifest is loaded').toBeTruthy();
      expect(img.getAttribute('alt')).toBe('');
      expect(h.container.querySelectorAll('span[aria-hidden="true"]').length).toBeGreaterThan(0);
      h.unmount();
    } finally { globalThis.fetch = orig; }
  });
});
