// @vitest-environment jsdom
// SEL Hub catalog, 2026-11-23 (UI complexity review: owner decision on student cards, and M2).
//
// Student cards: a card shows icon, name, description, suggested grades and the session
// time only. Guidance mode + note, the evidence-tradition pill, the evidence badge, the
// format and "Preview first" are teacher view only, except guidance that tells a student
// to involve an adult (restorativeCircle, crisiscompanion, safety), which students keep.
// Teacher view ("selTeacherView": isTeacherMode not false, not independent/parent, not the
// student view or QR student mode) is unchanged.
// SEL_HUB_SOURCE points the suite at another copy of the hub.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const modulesDir = resolve(ROOT, 'desktop/web-app/node_modules');
const HUB_FILE = process.env.SEL_HUB_SOURCE || resolve(ROOT, 'sel_hub/sel_hub_module.js');
const hubSource = readFileSync(HUB_FILE, 'utf8');

let React, ReactDOMClient, act, Hub, root, host;
const SAFETY_KEPT = ['restorativeCircle', 'crisiscompanion', 'safety'];

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = global.React = React;
  const Icon = () => React.createElement('span', { 'aria-hidden': 'true' });
  window.AlloIcons = new Proxy({}, { get: () => Icon });
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  window.AlloToggleTheme = () => {};
  window.__alloflowSelSnapshots = [];
  window.__alloflowStudentArtifacts = [];
  new Function(hubSource)(); // eslint-disable-line no-new-func
  // Cards read their framework tag from the standards module, as in the app.
  new Function(readFileSync(resolve(ROOT, 'sel_hub/sel_standards_alignment.js'), 'utf8'))(); // eslint-disable-line no-new-func
  Hub = window.AlloModules.SelHub;
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  host?.remove();
  root = host = null;
  try { sessionStorage.clear(); localStorage.clear(); } catch (e) { /* jsdom */ }
});

async function mount(extra = {}) {
  const Icon = () => React.createElement('span', { 'aria-hidden': 'true' });
  const props = Object.assign({
    showSelHub: true, setShowSelHub() {}, selHubTab: 'explore', setSelHubTab() {},
    selHubTool: null, setSelHubTool() {}, addToast() {}, gradeLevel: '5th Grade',
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, onSafetyFlag() {},
    studentCodename: 'test', selectedVoice: null, activeSessionCode: null, t: () => undefined,
    ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon, onExportRequested() {},
  }, extra);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(React.createElement(Hub, props)); });
  return host;
}
const card = (el, id) => el.querySelector('[data-sel-tool-card-id="' + id + '"]');
const desc = (el, id) => el.querySelector('#sel-card-desc-' + id).textContent;
const evidenceBits = (c) => c.querySelectorAll('[aria-label^="Evidence tradition:"], [aria-label^="Approach context:"]').length;

describe('SEL cards: teacher view keeps every block', () => {
  it('guidance, cue (time | format), Preview first and evidence labels show for a teacher', async () => {
    const el = await mount({ isTeacherMode: true });
    const zones = card(el, 'zones');
    expect(zones.querySelector('[data-sel-card-guidance="zones"]')).not.toBeNull();
    expect(zones.querySelector('[data-sel-card-cue="zones"]').textContent).toContain('5-8 min | Solo or group');
    expect(zones.querySelector('[data-sel-card-time]')).toBeNull();
    expect(card(el, 'safety').textContent).toContain('Preview first');
    expect(evidenceBits(zones)).toBeGreaterThan(0);
    expect(desc(el, 'zones')).toContain('Teacher cue: 5-8 min, Solo or group.');
    expect(desc(el, 'zones')).toContain('Best for:');
    const all = Array.from(el.querySelectorAll('[data-sel-tool-card-id]'));
    expect(all.filter((c) => evidenceBits(c) > 0).length).toBeGreaterThan(20);
  });

  it('a host that passes no role keeps the teacher cards, as before', async () => {
    const el = await mount({});
    expect(card(el, 'zones').querySelector('[data-sel-card-cue="zones"]')).not.toBeNull();
  });
});

describe('SEL cards: student view shows icon, name, description, grades and time', () => {
  for (const [who, role] of [['student', { isTeacherMode: false }], ['independent learner', { isTeacherMode: true, isIndependentMode: true }]]) {
    it(who + ': no guidance (except safety), cue format, Preview first or evidence labels', async () => {
      const el = await mount(role);
      const cards = Array.from(el.querySelectorAll('[data-sel-tool-card-id]'));
      expect(cards.length).toBeGreaterThan(60);
      expect(el.querySelectorAll('[data-sel-card-cue]').length).toBe(0);
      expect(cards.filter((c) => evidenceBits(c) > 0).map((c) => c.getAttribute('data-sel-tool-card-id'))).toEqual([]);
      expect(cards.filter((c) => /Preview first/i.test(c.textContent)).map((c) => c.getAttribute('data-sel-tool-card-id'))).toEqual([]);
      const guided = Array.from(el.querySelectorAll('[data-sel-card-guidance]')).map((n) => n.getAttribute('data-sel-card-guidance')).sort();
      expect(guided).toEqual(SAFETY_KEPT.slice().sort());
    });
  }

  it('the session time sits with the grades in one footer pinned to the card bottom', async () => {
    const el = await mount({ isTeacherMode: false });
    const zones = card(el, 'zones');
    const meta = zones.querySelector('[data-sel-card-meta="zones"]');
    expect(meta).not.toBeNull();
    expect(meta.style.marginTop).toBe('auto');
    expect(meta.querySelector('[data-sel-card-time="zones"]').textContent).toBe('5-8 min');
    expect(meta.textContent).toMatch(/Suggested grades/);
    expect(zones.textContent).not.toContain('Solo or group');
    // Icon, name and description are still there.
    expect(zones.textContent).toContain('Zones');
    expect(zones.querySelector('p').textContent.length).toBeGreaterThan(10);
    expect(zones.style.flexDirection).toBe('column');
  });

  it('the screen-reader description follows the card: time only, safety guidance and "Use with care" kept', async () => {
    const el = await mount({ isTeacherMode: false });
    expect(desc(el, 'zones')).not.toContain('Teacher cue');
    expect(desc(el, 'zones')).not.toContain('Best for:');
    expect(desc(el, 'zones')).toContain('5-8 min');
    expect(desc(el, 'crisiscompanion')).toMatch(/Best for:/);
    expect(card(el, 'crisiscompanion').getAttribute('aria-label')).toMatch(/Use with care/);
    expect(desc(el, 'safety')).toMatch(/Use with care:/);
  });
});

// ── M2: the first view is header, skip link, Start-here cards, search, need chips, grid ──
// "Help me choose an activity", "Browse by skill area" and "SEL Pathways" share ONE fold
// ("More ways to explore"); "Teacher launch" and "Custom SEL Stations" share ONE teacher-only
// fold ("Teacher tools"). Each fold opens itself while its content is in use.
const main = (el) => el.querySelector('[role="main"]');
const moreWays = (el) => el.querySelector('details[data-sel-more-ways]');
const teacherTools = (el) => el.querySelector('details[data-sel-teacher-tools]');
const click = async (node) => { await act(async () => { node.click(); }); };
// Top-level blocks of the catalog panel, in order, named by what they are.
const blocks = (el) => Array.from(main(el).children).map((n) => {
  if (n.id === 'sel-tool-grid') return 'grid';
  if (n.matches('details[data-sel-more-ways]')) return 'more-ways';
  if (n.matches('details[data-sel-teacher-tools]')) return 'teacher-tools';
  if (n.querySelector('#sel-tool-search-input')) return 'search';
  if (n.getAttribute('aria-label') === 'Find SEL tools by need') return 'need-chips';
  if (n.getAttribute('aria-label') === 'Start here') return 'start-here';
  if (n.tagName === 'BUTTON' && /Skip to the tool list/.test(n.textContent)) return 'skip';
  if (n.matches('details') && /Custom SEL Stations/.test(n.textContent)) return 'stations';
  return 'other:' + n.tagName.toLowerCase();
});

describe('M2: SEL Hub first view', () => {
  beforeAll(() => {
    try { sessionStorage.setItem('alloflow_sel_seen_ephemeral_explainer', '1'); } catch (e) { /* jsdom */ }
  });

  it('teacher: skip, Start here, search, need chips, then the two closed folds, then the grid', async () => {
    const el = await mount({ isTeacherMode: true });
    expect(blocks(el)).toEqual(['skip', 'start-here', 'search', 'need-chips', 'more-ways', 'teacher-tools', 'grid']);
    expect(moreWays(el).open).toBe(false);
    expect(teacherTools(el).open).toBe(false);
    // Start here keeps its cards (and the research-labels fold); Help me choose and the
    // storage note with its "Save now" left it.
    const start = main(el).querySelector('[aria-label="Start here"]');
    expect(start.querySelector('details[aria-label="Help me choose an activity"]')).toBeNull();
    expect(start.querySelector('details[aria-label="About research labels"]')).not.toBeNull();
    expect(start.textContent).not.toContain('Save now');
    expect(start.querySelectorAll('button').length).toBe(4);
    // The search box several handlers focus is still outside every fold.
    expect(el.querySelector('#sel-tool-search-input').closest('details')).toBeNull();
  });

  it('every moved control is inside the right fold, with its hooks', async () => {
    const el = await mount({ isTeacherMode: true });
    const mw = moreWays(el);
    expect(mw.querySelector(':scope > summary').textContent).toBe('More ways to explore');
    expect(mw.querySelector('details[aria-label="Help me choose an activity"]')).not.toBeNull();
    expect(mw.querySelector('details[data-sel-browse-area] [role="group"][aria-label="Filter SEL tools by category"]')).not.toBeNull();
    expect(mw.querySelectorAll('[aria-label^="Filter: "]').length).toBeGreaterThan(5);
    expect(mw.textContent).toContain('SEL Pathways');
    const tt = teacherTools(el);
    expect(tt.querySelector(':scope > summary').textContent).toContain('Teacher tools');
    expect(tt.querySelector('details[aria-label="Teacher launch routines"]')).not.toBeNull();
    expect(tt.querySelectorAll('[aria-label^="Load teacher launch plan: "]').length).toBe(4);
    expect(tt.textContent).toContain('Custom SEL Stations');
    expect(tt.querySelector('[aria-label="Build a new custom SEL Station"]')).not.toBeNull();
  });

  // fix2: every fold header in the two outer folds has ONE look: a native disclosure marker
  // (display list-item, no flex), the same padding, size and weight, palette text colour;
  // the two outer folds are one step bolder and larger. Teacher launch no longer repeats 🎓.
  it.each([['light', null, 'rgb(15, 23, 42)'], ['dark', 'theme-dark', 'rgb(241, 245, 249)'], ['contrast', 'theme-contrast', 'rgb(255, 255, 0)']])('fold headers share one style (%s theme)', async (_name, themeClass, textColor) => {
    if (themeClass) document.body.classList.add(themeClass);
    try {
      const el = await mount({ isTeacherMode: true });
      const top = [moreWays(el), teacherTools(el)].map((d) => d.querySelector(':scope > summary'));
      const sub = Array.from(el.querySelectorAll('[data-sel-more-ways] details > summary, [data-sel-teacher-tools] details > summary'));
      const labels = sub.map((s) => s.textContent);
      expect(labels).toHaveLength(5);
      expect(labels.join('|')).toMatch(/^Help me choose an activity\|Browse by skill area\|.*SEL Pathways.*\|Teacher launch\|.*Custom SEL Stations/);
      for (const s of top) expect(s.getAttribute('data-sel-fold-summary')).toBe('top');
      for (const s of sub) expect(s.getAttribute('data-sel-fold-summary')).toBe('sub');
      for (const s of top.concat(sub)) {
        expect(s.style.display, s.textContent).toBe('list-item');
        expect(s.style.minHeight).toBe('44px');
        expect(s.style.color).toBe(textColor);
        expect(s.style.cursor).toBe('pointer');
      }
      const look = (s) => [s.style.fontSize, s.style.fontWeight, s.style.lineHeight].join(' ');
      expect(new Set(sub.map(look))).toEqual(new Set(['14px 700 1.4']));
      expect(new Set(top.map(look))).toEqual(new Set(['15px 800 1.4']));
      // Side padding comes from the summary or from its details, never both: 12px either way.
      for (const s of top.concat(sub)) {
        const inset = s.parentElement.style.padding === '0px 12px';
        expect(s.style.padding, s.textContent).toBe(inset ? '12px 0px' : '12px');
      }
      expect(sub[3].textContent).toBe('Teacher launch');
      expect(sub[3].querySelector('[aria-hidden]')).toBeNull();
      for (const s of sub) expect(s.parentElement.style.border, s.textContent).toMatch(/^1px solid/);
    } finally {
      if (themeClass) document.body.classList.remove(themeClass);
    }
  });

  it('student: no teacher fold; the More ways fold has the chooser, skill areas and pathways', async () => {
    const el = await mount({ isTeacherMode: false });
    expect(blocks(el)).toEqual(['skip', 'start-here', 'search', 'need-chips', 'more-ways', 'grid']);
    expect(el.querySelector('details[aria-label="Teacher launch routines"]')).toBeNull();
    expect(moreWays(el).querySelector('details[aria-label="Help me choose an activity"]')).not.toBeNull();
  });

  it('a student with saved stations keeps the stations panel (their picker) outside any teacher fold', async () => {
    localStorage.setItem('alloflow_sel_stations', JSON.stringify([{ id: 'st1', name: 'Calm Corner', tools: ['breathing'], quests: [] }]));
    const el = await mount({ isTeacherMode: false });
    expect(blocks(el)).toEqual(['skip', 'start-here', 'search', 'need-chips', 'more-ways', 'stations', 'grid']);
    expect(teacherTools(el)).toBeNull();
  });

  it('the More ways fold (and the skill-area fold) open themselves while a skill-area filter is on', async () => {
    const el = await mount({ isTeacherMode: false });
    const chip = moreWays(el).querySelector('[aria-label^="Filter: "]');
    await click(chip);
    expect(moreWays(el).open).toBe(true);
    expect(el.querySelector('details[data-sel-browse-area]').open).toBe(true);
    expect(el.querySelector('#sel-tool-search-count').textContent).toMatch(/match/);
  });

  it('the More ways fold opens itself while a pathway is active', async () => {
    const el = await mount({ isTeacherMode: false });
    const pathway = Array.from(moreWays(el).querySelectorAll('button')).find((b) => /activities/.test(b.textContent));
    expect(pathway, 'a pathway button').toBeTruthy();
    await click(pathway);
    expect(moreWays(el).open).toBe(true);
  });

  // React passes a <details> toggle on to every ancestor's onToggle: closing an inner fold
  // used to close the outer one too (browser check, 2026-11-23).
  it('closing an inner fold leaves its outer fold open', async () => {
    const el = await mount({ isTeacherMode: true });
    const closeInner = async (outer, innerSelector) => {
      outer.open = true;
      await act(async () => { outer.dispatchEvent(new Event('toggle')); });
      expect(outer.open, 'outer opened').toBe(true);
      const inner = outer.querySelector(innerSelector);
      expect(inner, innerSelector).not.toBeNull();
      inner.open = true;
      await act(async () => { inner.dispatchEvent(new Event('toggle')); });
      inner.open = false;
      await act(async () => { inner.dispatchEvent(new Event('toggle')); });
      expect(outer.open, 'outer still open after closing ' + innerSelector).toBe(true);
    };
    await closeInner(moreWays(el), 'details[data-sel-browse-area]');
    await closeInner(moreWays(el), 'details:not([data-sel-browse-area])');
    await closeInner(teacherTools(el), 'details');
  });

  it('the Teacher tools fold opens itself while the Station Builder is open', async () => {
    const el = await mount({ isTeacherMode: true });
    await click(el.querySelector('[aria-label="Build a new custom SEL Station"]'));
    expect(teacherTools(el).open).toBe(true);
    expect(el.querySelector('#sel-station-name-input')).not.toBeNull();
  });

  it('one save label: the Saving fold\'s button reads "Export now" and asks the host to save', async () => {
    let asked = 0;
    const el = await mount({ isTeacherMode: false, onExportRequested: () => { asked++; return true; } });
    const save = el.querySelector('[data-sel-save-action]');
    expect(save.textContent).toBe('Export now');
    expect(save.closest('section').getAttribute('aria-label')).toBe('SEL saving and sharing');
    await click(save);
    expect(asked).toBe(1);
    expect(el.textContent).not.toContain('Request project save');
    expect(el.textContent).not.toContain('Save now');
    expect(el.textContent).not.toContain('Some SEL work is stored on this device.');
  });
});
