// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import FIXTURE from './roadready_cn31_sources.json';

// Round 31, lane content (cn31). Five plain-language guides and the license dates:
//  1. each guide renders, in the light, dark and high-contrast themes, with no text under WCAG AA;
//  2. each guide is reachable from the menu, and the guides link to each other where the brief asks;
//  3. the GDL tracker shows the provisional stage with the right LOCAL dates;
//  4. Check yourself: no position cue, no length cue, plain feedback, nothing saved;
//  5. every new sentence has an entry in roadready_cn31_sources.json (change a sentence -> recheck its source);
//  6. reading level and link hygiene.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const GUIDES = ['licenseGuide', 'pulledOver', 'insuranceBasics', 'slowVehicles', 'languageHelp'];
// Kept next to this test: copy both files into tests/.
let loadTool, resetStemLab, makeCtx, renderTool, React, ReactDOMClient, SRC, HOST_CSS;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, makeCtx, renderTool, React, ReactDOMClient } = mod);
  SRC = readFileSync(path.resolve(process.cwd(), TOOL), 'utf8');
  HOST_CSS = readFileSync(path.resolve(process.cwd(), 'app_styles_source.jsx'), 'utf8');
});

function load() {
  window.__testHooks = {};
  window.__RR_TEST_EXPORTS__ = {};
  resetStemLab();
  const config = loadTool(TOOL, 'roadReady');
  return { config, G: window.__RR_TEST_EXPORTS__.roadReadyGuides, SAVE: window.__RR_TEST_EXPORTS__.roadReadySaveGuards };
}
const ssr = (d) => { load(); return renderTool('roadReady', { roadReady: d }); };

let mounted = [];
async function mount(roadReady) {
  const { config, G } = load();
  const state = { toolData: { roadReady } };
  function Host() {
    const [toolData, setToolData] = React.useState(state.toolData);
    state.toolData = toolData;
    const ctx = makeCtx({
      toolData,
      update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
      updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })),
    });
    return config.render(ctx);
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(Host)); });
  const m = { host, root, state, G, view: () => state.toolData.roadReady.view };
  mounted.push(m);
  return m;
}
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
afterEach(async () => {
  for (const m of mounted) { await React.act(async () => { m.root.unmount(); }); m.host.remove(); }
  mounted = [];
  vi.useRealTimers();
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  // A mounted tool mirrors saved slices here and on the device; a later render would load them back.
  delete window.__alloflowRoadReady;
  try { localStorage.clear(); } catch (e) {}
});

// ── Contrast: the host theme wrapper, resolved by hand (jsdom does not resolve var()) ──────────────
// Host palette per theme is read from app_styles_source.jsx, the tool's inks from the tool's own CSS.
function themeVars(theme) {
  const hostSel = { light: ':root, .theme-default {', dark: '.theme-dark {', contrast: '.theme-contrast {' }[theme];
  const anchor = HOST_CSS.indexOf('--allo-stem-canvas', HOST_CSS.indexOf(hostSel, HOST_CSS.indexOf('--allo-stem-canvas') - 400));
  const block = HOST_CSS.slice(HOST_CSS.lastIndexOf('{', anchor), HOST_CSS.indexOf('}', anchor));
  const vars = {};
  for (const m of block.matchAll(/(--allo-stem-[a-z-]+):\s*(#[0-9a-fA-F]{3,8})/g)) vars[m[1]] = m[2];
  const toolSel = { light: ':root, .theme-default{', dark: '.theme-dark{', contrast: '.theme-contrast{' }[theme];
  const at = SRC.indexOf(toolSel + '--rr-cyan');
  const toolBlock = SRC.slice(at, SRC.indexOf('}', at));
  for (const m of toolBlock.matchAll(/(--rr-[a-z-]+):(#[0-9a-fA-F]{3,8})/g)) vars[m[1]] = m[2];
  return vars;
}
const hexRgb = (hex) => { let h = hex.slice(1); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
function resolveColor(value, vars) {
  if (!value) return null;
  value = String(value).trim();
  if (/^(inherit|transparent|none|initial|unset)$/i.test(value)) return null;
  const v = /^var\(\s*(--[a-z-]+)\s*(?:,\s*(.+))?\)$/i.exec(value);
  if (v) return vars[v[1]] ? hexRgb(vars[v[1]]) : resolveColor(v[2], vars);
  if (/^#[0-9a-f]{3,6}$/i.test(value)) return hexRgb(value);
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(value);
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];
  return 'unknown:' + value;
}
const styleMap = (el) => { const out = {}; for (const part of (el.getAttribute('style') || '').split(';')) { const i = part.indexOf(':'); if (i > 0) out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim(); } return out; };
const lum = (c) => { const a = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function contrastFailures(html, theme, scopeSel) {
  const vars = themeVars(theme);
  const cls = { light: 'theme-default', dark: 'theme-dark', contrast: 'theme-contrast' }[theme];
  // The host: theme class on the app root, the tool shell paints canvas + text, and in the dark theme only
  // the tool sits on a white card (stem_lab_module.js, data-stem-tool-surface).
  const surface = theme === 'dark' ? '<div data-stem-tool-surface="roadReady" style="background:#ffffff;color:#0f172a">' + html + '</div>' : html;
  const box = document.createElement('div');
  box.innerHTML = '<div class="' + cls + '"><div data-stem-tool-shell="roadReady" data-stem-theme="' + theme + '" style="background:var(--allo-stem-canvas, #0f172a);color:var(--allo-stem-text, #e2e8f0)">' + surface + '</div></div>';
  const scope = scopeSel ? box.querySelector(scopeSel) : box;
  if (!scope) return ['scope not found: ' + scopeSel];
  const fails = []; let checked = 0;
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const text = walker.currentNode.nodeValue.trim();
    const el = walker.currentNode.parentElement;
    if (!text || el.closest('style,script,[aria-hidden="true"]')) continue;
    let fg = null, bg = null, size = null, weight = null;
    for (let e = el; e && e !== box; e = e.parentElement) {
      const st = styleMap(e);
      if (fg === null && st.color) fg = resolveColor(st.color, vars);
      // A button or link does not inherit the page ink in a browser: it must set its own.
      if (fg === null && (e.tagName === 'BUTTON' || e.tagName === 'A')) fg = 'unknown:control without its own color';
      if (size === null && st['font-size']) size = parseFloat(st['font-size']);
      if (weight === null && st['font-weight']) weight = parseFloat(st['font-weight']) || (st['font-weight'] === 'bold' ? 700 : 400);
      if (bg === null) { const b = st['background-color'] || st.background; if (b && /gradient|url\(/.test(b)) bg = 'unknown:' + b; else if (b) bg = resolveColor(b, vars); }
    }
    checked++;
    if (!fg || !bg || typeof fg === 'string' || typeof bg === 'string') { fails.push(theme + ' unresolved ' + JSON.stringify([fg, bg]) + ' "' + text.slice(0, 40) + '"'); continue; }
    const strong = /^(H[1-6]|STRONG|B)$/.test(el.tagName) || (weight || 400) >= 700;
    const need = ((size || 16) >= 24 || ((size || 16) >= 18.66 && strong)) ? 3 : 4.5;
    const cr = ratio(fg, bg);
    if (cr < need) fails.push(theme + ' ' + cr.toFixed(2) + ' < ' + need + ' "' + text.slice(0, 40) + '" ' + fg + ' on ' + bg);
  }
  if (!checked) fails.push(theme + ' checked no text');
  return fails;
}

describe('cn31 item 1: each guide renders and passes contrast in the three themes', () => {
  for (const view of GUIDES) {
    it(view + ' renders its content, a check, its sources and a way back', () => {
      const html = ssr({ view });
      expect(html).not.toContain('RoadReady Error');
      expect(html).not.toContain('Loading RoadReady');
      const box = document.createElement('div'); box.innerHTML = html;
      const root = box.querySelector('[data-rr-guide="' + view + '"]');
      expect(root, 'guide root').toBeTruthy();
      expect(root.getAttribute('data-rr-view')).toBe(view);
      expect(root.querySelectorAll('h2')).toHaveLength(1);
      expect(root.querySelector('h2').textContent).toBe(FIXTURE.strings[{ licenseGuide: 'guide_lic_title', pulledOver: 'guide_stop_title', insuranceBasics: 'guide_ins_title', slowVehicles: 'guide_road_title', languageHelp: 'guide_lang_title' }[view]].en);
      expect(root.querySelectorAll('section').length).toBeGreaterThanOrEqual(6);
      expect(root.querySelector('[data-rr-guide-back]').textContent).toBe('Back to the menu');
      expect(root.querySelector('[data-rr-guide-quiz] h3').textContent).toBe('Check yourself');
      expect(root.querySelectorAll('[data-rr-guide-question]')).toHaveLength(3);
      expect(root.querySelectorAll('[data-rr-guide-option]')).toHaveLength(12);
      expect(root.querySelector('[data-rr-guide-sources]').textContent).toMatch(/^Sources: /);
      for (const a of root.querySelectorAll('a[data-rr-guide-link]')) {
        expect(a.getAttribute('href')).toMatch(/^https:\/\/www\.maine\.gov\/sos\/bmv\/driver-licenses-and-ids\//);
        expect(a.getAttribute('target')).toBe('_blank');
        expect(a.getAttribute('rel')).toBe('noopener noreferrer');
        expect(a.textContent).toContain('(opens in a new tab)');
      }
      // Controls are large enough to tap.
      for (const b of root.querySelectorAll('button,a')) expect(styleMap(b)['min-height'], b.textContent).toBe('44px');
      // No text under 13px.
      for (const el of root.querySelectorAll('[style*="font-size"]')) if (!el.closest('[aria-hidden="true"]')) expect(parseFloat(styleMap(el)['font-size'])).toBeGreaterThanOrEqual(13);
    });
    it(view + ' has no contrast failure in light, dark or high contrast (answered and unanswered)', () => {
      const plain = ssr({ view });
      const answered = ssr({ view, guideQuiz: { [view]: { 0: 0, 1: 3, 2: 1 } } });
      expect(answered).toContain('Right answer');
      const fails = [];
      for (const theme of ['light', 'dark', 'contrast']) fails.push(...contrastFailures(plain, theme), ...contrastFailures(answered, theme));
      expect(fails).toEqual([]);
      // The checker can fail: the dark theme's soft ink on the light canvas is 2.56:1.
      const bad = contrastFailures('<div style="background:#ffffff"><p style="color:#94a3b8;font-size:14px">grey on white</p></div>', 'light');
      expect(bad).toHaveLength(1);
      expect(bad[0]).toContain('2.56 < 4.5');
    });
  }
  it('the new tracker card, the menu language strip and the guide link in the Neurodivergent guide pass too', () => {
    const fails = [];
    const tracker = ssr({ view: 'gdlTracker', gdlBirthDate: '2010-01-05', gdlPermitDate: '2025-02-01', gdlIntermediateDate: '2026-03-01' });
    const trackerEmpty = ssr({ view: 'gdlTracker' });
    const menu = ssr({ view: 'menu', tourCompleted: true });
    const nd = ssr({ view: 'neurodivergentGuide' });
    for (const theme of ['light', 'dark', 'contrast']) {
      fails.push(...contrastFailures(tracker, theme, '[data-rr-gdl-dates]'), ...contrastFailures(trackerEmpty, theme, '[data-rr-gdl-dates]'));
      fails.push(...contrastFailures(menu, theme, '[data-rr-language-help]'));
      for (const target of GUIDES) fails.push(...contrastFailures(menu, theme, '[data-rr-view-target="' + target + '"]'));
    }
    expect(fails).toEqual([]);
    expect(nd).toContain('Steps for every driver: If You Are Pulled Over');
  });
});

describe('cn31 item 2: reachable from the menu, and linked to each other', () => {
  it('each guide has a menu tile under a goal heading and opens from it', async () => {
    for (const view of GUIDES) {
      const m = await mount({ view: 'menu', tourCompleted: true });
      const tile = m.host.querySelector('button[data-rr-tile][data-rr-view-target="' + view + '"]');
      expect(tile, view + ' tile').toBeTruthy();
      const heading = tile.closest('section').querySelector('h3').textContent;
      expect(heading).toContain(view === 'languageHelp' ? 'Study for permit' : 'Maine-specific');
      await click(tile);
      expect(m.view()).toBe(view);
      expect(m.host.querySelector('[data-rr-guide="' + view + '"] h2')).toBeTruthy();
      await click(m.host.querySelector('[data-rr-guide-back]'));
      expect(m.view()).toBe('menu');
    }
  });
  it('the help directory lists the five guides', () => {
    const html = ssr({ view: 'helpHub' });
    for (const name of ['Your License, Step by Step', 'If You Are Pulled Over', 'Insurance and Paperwork Basics', 'Slow Vehicles and Lane Lines', 'Test and Manual in Your Language']) expect(html).toContain(name);
  });
  it('the menu has a Language help strip that opens the language guide; the Accessibility panel still links the Neurodivergent guide', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true });
    expect(m.host.querySelector('[data-rr-nd-guide-link]')).toBeTruthy();
    const strip = m.host.querySelector('[data-rr-language-help]');
    expect(strip.textContent).toContain('You can take the Maine permit test in several languages. The BMV also gives free interpreters.');
    await click(strip.querySelector('button[data-rr-language-help-link]'));
    expect(m.view()).toBe('languageHelp');
    const text = m.host.textContent;
    for (const lang of ['Arabic', 'Canadian French', 'English', 'French', 'Lingala', 'Portuguese', 'Somali', 'Spanish', 'Swahili']) expect(text).toContain(lang);
    expect(text).toContain('The interpreter is free.');
    expect(text).not.toMatch(/8 languages/); // the BMV page says "8" and then names nine: the guide lists names, no count
  });
  it('traffic stop guide <-> Neurodivergent guide; license guide <-> tracker; insurance guide -> Post-Crash', async () => {
    let m = await mount({ view: 'pulledOver' });
    await click(m.host.querySelector('button[data-rr-guide-go="neurodivergentGuide"]'));
    expect(m.view()).toBe('neurodivergentGuide');
    expect(m.host.textContent).toContain('glovebox card'); // the existing card text is still there
    await click(m.host.querySelector('button[data-rr-guide-go="pulledOver"]'));
    expect(m.view()).toBe('pulledOver');
    m = await mount({ view: 'licenseGuide' });
    await click(m.host.querySelector('button[data-rr-guide-go="gdlTracker"]'));
    expect(m.view()).toBe('gdlTracker');
    await click(m.host.querySelector('[data-rr-gdl-dates] button[data-rr-guide-go="licenseGuide"]'));
    expect(m.view()).toBe('licenseGuide');
    await click(m.host.querySelector('button[data-rr-guide-go="languageHelp"]'));
    expect(m.view()).toBe('languageHelp');
    m = await mount({ view: 'insuranceBasics' });
    await click(m.host.querySelector('button[data-rr-guide-go="postCrash"]'));
    expect(m.view()).toBe('postCrash');
  });
});

describe('cn31 item 3: GDL tracker dates', () => {
  it('rrGdlTimeline counts local calendar days', () => {
    const { G } = load();
    expect(G.RR_GDL_RESTRICTION_DAYS).toBe(270);
    expect(G.RR_GDL_PROVISIONAL_YEARS).toBe(2);
    const day269 = G.rrGdlTimeline('2026-03-01', '2026-11-25');
    expect(day269).toMatchObject({ restrictionsEnd: '2026-11-26', provisionalEnd: '2028-03-01', daysHeld: 269, restricted: true, provisional: true, phase: 'restricted', daysToRestrictionsEnd: 1 });
    const day270 = G.rrGdlTimeline('2026-03-01', '2026-11-26');
    expect(day270).toMatchObject({ daysHeld: 270, restricted: false, provisional: true, phase: 'provisional', daysToRestrictionsEnd: 0, daysToProvisionalEnd: 461 });
    expect(G.rrGdlTimeline('2026-03-01', '2028-03-01')).toMatchObject({ phase: 'provisional', daysToProvisionalEnd: 0 });
    expect(G.rrGdlTimeline('2026-03-01', '2028-03-02')).toMatchObject({ phase: 'after', provisional: false, restricted: false });
    // Daylight saving starts 2026-03-08 and ends 2026-11-01: a day is still a day.
    expect(G.rrDayKeyDiff('2026-03-01', '2026-03-09')).toBe(8);
    expect(G.rrDayKeyDiff('2026-10-31', '2026-11-02')).toBe(2);
    expect(G.rrDayKeyAdd('2026-01-31', 1, 0)).toBe('2026-02-01');
    expect(G.rrDayKeyAdd('2024-02-29', 0, 2)).toBe('2026-03-01');
    expect(G.rrDayKeyToDate('2026-03-01').getHours()).toBe(0);
    expect(G.rrDayKeyToDate('2026-03-01').getDate()).toBe(1);
    for (const bad of ['', null, 'soon', '2026-02-31', '2026-13-01']) expect(G.rrDayKeyToDate(bad)).toBeNull();
    expect(G.rrGdlTimeline('', '2026-11-26')).toBeNull();
    expect(G.rrGdlTimeline('2026-03-01', 'x')).toBeNull();
  });
  const dates = { gdlBirthDate: '2010-01-05', gdlPermitDate: '2025-02-01', gdlIntermediateDate: '2026-03-01' };
  const tracker = (now) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    const html = ssr(Object.assign({ view: 'gdlTracker' }, dates));
    const box = document.createElement('div'); box.innerHTML = html;
    return box;
  };
  it('late evening of day 269 (local) is still the intermediate stage: no UTC slip', () => {
    const box = tracker(new Date(2026, 10, 25, 23, 30));
    expect(box.textContent).toContain('Intermediate License');
    expect(box.textContent).toContain('Curfew: Midnight - 5 AM');
    const card = box.querySelector('[data-rr-gdl-dates]');
    expect(card.querySelector('[data-rr-gdl-restrictions-end]').getAttribute('data-rr-gdl-restrictions-end')).toBe('2026-11-26');
    expect(card.querySelector('[data-rr-gdl-restrictions-end]').textContent).toBe('The 270-day rules can end on November 26, 2026. Days left: 1.');
    expect(card.querySelector('[data-rr-gdl-provisional-end]').getAttribute('data-rr-gdl-provisional-end')).toBe('2028-03-01');
  });
  it('day 270: the stage is "Provisional license", with the two-year date, not "Restrictions lifted"', () => {
    const box = tracker(new Date(2026, 10, 26, 0, 30));
    const text = box.textContent;
    expect(text).toContain('Provisional license');
    expect(text).toContain('Your license is still provisional. The 2-year rule lasts through March 1, 2028.');
    expect(text).toContain('30 days the first time, 180 days the second time, and 1 year after that.');
    expect(text).not.toContain('Restrictions lifted');
    expect(text).not.toContain('Curfew: Midnight - 5 AM');
    expect(text).toContain('Zero handheld phone use'); // still applies
    const card = box.querySelector('[data-rr-gdl-dates]');
    expect(card.querySelector('[data-rr-gdl-restrictions-end]').textContent).toBe('The 270-day rules ended on November 26, 2026, unless they were extended.');
    expect(card.querySelector('[data-rr-gdl-provisional-end]').textContent).toBe('The 2-year rule for new drivers lasts through March 1, 2028. Days left: 461.');
  });
  it('the last day of the two years is still provisional; the day after is not', () => {
    let box = tracker(new Date(2028, 2, 1, 22, 0));
    expect(box.textContent).toContain('The 2-year rule for new drivers lasts through March 1, 2028. Days left: 0.');
    box = tracker(new Date(2028, 2, 2, 0, 5));
    expect(box.textContent).toContain('Two years since your first license');
    expect(box.textContent).toContain('The 2-year rule for new drivers ended on March 1, 2028.');
    expect(box.textContent).toContain('Demerit points and every traffic law still apply.');
    expect(box.textContent).not.toContain('Restrictions lifted');
  });
  it('with no license date the card says what to enter', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 26, 12, 0));
    const html = ssr({ view: 'gdlTracker', gdlBirthDate: '2010-01-05' });
    expect(html).toContain('Enter the date of your first license above.');
    expect(html).not.toContain('data-rr-gdl-restrictions-end');
  });
});

describe('cn31 item 4: Check yourself', () => {
  it('no position cue and no length cue across the 15 questions', () => {
    const { G } = load();
    const list = G.rrGuideList();
    expect(list.map((g) => g.id)).toEqual(GUIDES);
    expect(G.RR_GUIDE_IDS).toEqual(GUIDES);
    const pos = [0, 0, 0, 0]; let longest = 0, shortest = 0, n = 0;
    for (const g of list) {
      expect(g.quiz).toHaveLength(3);
      for (const q of g.quiz) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        const shown = G.rrGuideQuizOptions(q);
        expect(shown.filter((o) => o.correct)).toHaveLength(1);
        expect(shown.find((o) => o.correct).text).toBe(q.options[0]);
        const len = shown.map((o) => o.text.length);
        expect(len.slice().sort((a, b) => a - b)).toEqual(len); // shortest first
        expect(Math.max(...len) / Math.min(...len), q.q).toBeLessThanOrEqual(1.35); // the four are about one length
        const i = shown.findIndex((o) => o.correct);
        pos[i]++; n++;
        if (i === 3 && len[3] > len[2]) longest++;
        if (i === 0 && len[0] < len[1]) shortest++;
      }
    }
    expect(n).toBe(15);
    for (const count of pos) { expect(count).toBeGreaterThanOrEqual(3); expect(count).toBeLessThanOrEqual(4); } // 15 / 4 = 3.75 each
    expect(longest / n).toBeLessThanOrEqual(1 / 3);
    expect(shortest / n).toBeLessThanOrEqual(1 / 3);
  });
  it('a wrong pick, then the right one: plain feedback, options in the measured order', async () => {
    const m = await mount({ view: 'pulledOver' });
    const q = m.G.rrGuideList()[1].quiz[2];
    const shown = m.G.rrGuideQuizOptions(q);
    const group = () => m.host.querySelector('[data-rr-guide-question="2"]');
    const options = () => [...group().querySelectorAll('button[data-rr-guide-option]')];
    expect(options().map((b) => b.textContent)).toEqual(shown.map((o) => o.text));
    expect(group().querySelector('[data-rr-guide-feedback]').textContent).toBe('');
    expect(m.host.querySelector('[data-rr-guide-retry]')).toBeNull();
    const right = shown.findIndex((o) => o.correct), wrong = right === 0 ? 1 : 0;
    await click(options()[wrong]);
    expect(options()[wrong].textContent).toBe(shown[wrong].text + 'Your answer');
    expect(options()[wrong].getAttribute('aria-pressed')).toBe('true');
    expect(options()[right].textContent).toBe(shown[right].text + 'Right answer');
    const feedback = group().querySelector('[data-rr-guide-feedback]');
    expect(feedback.getAttribute('role')).toBe('status');
    expect(feedback.textContent).toBe('Not this one. The answer is: Say where it is, then reach slowly. Tell the officer where the papers are. Then reach slowly with one hand on the wheel.');
    await click(options()[right]);
    expect(group().querySelector('[data-rr-guide-feedback]').textContent).toBe('Yes. Tell the officer where the papers are. Then reach slowly with one hand on the wheel.');
    // the other two questions are untouched
    expect(m.host.querySelector('[data-rr-guide-question="0"] [data-rr-guide-feedback]').textContent).toBe('');
    await click(m.host.querySelector('[data-rr-guide-retry]'));
    expect(group().querySelector('[data-rr-guide-feedback]').textContent).toBe('');
    expect(m.state.toolData.roadReady.guideQuiz).toEqual({});
  });
  it('no score is saved: not in the save file fields, not on the device, no badge', async () => {
    const m = await mount({ view: 'slowVehicles' });
    for (const qi of [0, 1, 2]) await click(m.host.querySelector('[data-rr-guide-question="' + qi + '"] button[data-rr-guide-option="0"]'));
    expect(Object.keys(m.state.toolData.roadReady.guideQuiz.slowVehicles)).toHaveLength(3);
    const SAVE = window.__RR_TEST_EXPORTS__.roadReadySaveGuards;
    expect(JSON.stringify(SAVE.RR_SAVE_FIELDS)).not.toContain('guideQuiz');
    // Four device keys: permit stats, parking best, permit mastery, permit study. None is for the guides.
    expect(SAVE.RR_STORAGE_KEYS).toHaveLength(4);
    expect(SAVE.RR_STORAGE_KEYS.join(' ')).not.toMatch(/guide/i);
    for (let i = 0; i < localStorage.length; i++) expect(localStorage.getItem(localStorage.key(i)) || '').not.toContain('slowVehicles');
    expect(m.state.toolData.roadReady.badges || {}).toEqual({});
    expect(m.host.textContent).not.toMatch(/\b\d\s*\/\s*3\b|score:/i);
  });
});

describe('cn31 item 5: every sentence has a source entry', () => {
  const NEW_KEY = /^(guide_(lic|stop|ins|road|lang|ui|link)_|gdl_stage_(provisional|after)|gdl_dates_|language_help_|nd_open_pulled_over$|feature_(license_guide|pulled_over|insurance_basics|slow_vehicles|language_help))/;
  const sourceStrings = () => {
    const out = {};
    const re = /__allo(?:RR)?T\(\s*'stem\.roadready\.([A-Za-z0-9_]+)'\s*,\s*'((?:[^'\\]|\\.)*)'/g;
    let m;
    while ((m = re.exec(SRC))) if (NEW_KEY.test(m[1])) {
      const en = m[2].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      if (m[1] in out && out[m[1]] !== en) throw new Error('one key, two English texts: ' + m[1]);
      out[m[1]] = en;
    }
    return out;
  };
  it('the tool and the fixture hold the same strings, word for word', () => {
    const tool = sourceStrings();
    expect(Object.keys(tool).length).toBeGreaterThan(300);
    const changed = Object.keys(tool).filter((k) => !FIXTURE.strings[k] || FIXTURE.strings[k].en !== tool[k]);
    expect(changed, 'these strings are new or changed: read the source again, then update roadready_cn31_sources.json').toEqual([]);
    expect(Object.keys(FIXTURE.strings).filter((k) => !(k in tool)), 'fixture entries for strings that no longer exist').toEqual([]);
  });
  it('every source id is a real entry with where it is from and a quote', () => {
    expect(SRC, 'the fixture describes guides this tool file does not have').toContain('function rrGuideList()');
    for (const [key, entry] of Object.entries(FIXTURE.strings)) for (const id of entry.src) expect(FIXTURE.sources[id], key + ' -> ' + id).toBeTruthy();
    for (const [id, s] of Object.entries(FIXTURE.sources)) {
      expect(s.from, id).toMatch(/Maine Driver's License Manual|Maine BMV|29-A M\.R\.S\. sec\. \d+/);
      expect(s.quote.length, id).toBeGreaterThan(10);
    }
  });
  it('every guide line with a number in it, and every right answer, names a source', () => {
    const { G } = load();
    const byText = {};
    for (const [key, entry] of Object.entries(FIXTURE.strings)) byText[entry.en] = (byText[entry.en] || []).concat([entry]);
    const unsourced = [];
    const need = (text, why) => { const e = byText[text]; if (!e) unsourced.push('not in fixture: ' + text); else if (!e.some((x) => x.src.length)) unsourced.push(why + ': ' + text); };
    for (const g of G.rrGuideList()) {
      for (const s of g.sections) {
        const lines = [].concat(s.intro || [], s.list || [], s.intro2 || [], s.list2 || [], s.notes || []);
        for (const line of lines) if (/\d/.test(line)) need(line, 'number without a source');
      }
      for (const q of g.quiz) { need(q.options[0], 'right answer without a source'); need(q.why, 'explanation without a source'); }
    }
    expect(unsourced).toEqual([]);
    // The stage texts on the tracker carry numbers too.
    for (const key of ['gdl_stage_provisional_desc', 'gdl_stage_after_desc', 'gdl_dates_restrict_until', 'gdl_dates_prov_until', 'gdl_dates_note']) expect(FIXTURE.strings[key].src.length, key).toBeGreaterThan(0);
  });
  it('the numbers a student must not get wrong are the ones in the sources', () => {
    const { G } = load();
    const text = JSON.stringify(G.rrGuideList());
    for (const fact of ['30 days', '180 days', '1 year', '60 days the first time', '270 more days', 'At 6 points', 'At 12 points or more', 'at least 24 right', '$2,000 or more', '$50,000', '$100,000', '$25,000', '$100 to $500', '$250 to $500', 'slower than 25 mph', 'at least 3 feet', '4 weeks or more', '6 months', '70 hours', '10 of those hours']) expect(text, fact).toContain(fact);
    expect(FIXTURE.sources.prov30.quote).toBe('For 30 days on the 1st offense');
    expect(FIXTURE.sources.points6_12.quote).toContain('12 points or more');
    expect(FIXTURE.sources.crashReport.quote).toContain('$2,000 or more');
    expect(FIXTURE.sources.test30.quote).toContain('30 questions, and you must answer a minimum of 24');
  });
});

describe('cn31 item 6: reading level, wording and links', () => {
  function syl(w) { if (/^\d/.test(w)) return 2; w = w.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return 0; if (w.length <= 3) return 1; w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, ''); const g = w.match(/[aeiouy]{1,2}/g); return g ? g.length : 1; }
  function grade(t) {
    const sents = t.split(/[.!?]+(?=\s|$)/).filter((s) => /[A-Za-z0-9]/.test(s));
    const words = t.split(/\s+/).map((w) => w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9%]+$/g, '')).filter((w) => /[A-Za-z0-9]/.test(w));
    const total = words.reduce((a, w) => a + syl(w), 0);
    return 0.39 * (words.length / Math.max(1, sents.length)) + 11.8 * (total / Math.max(1, words.length)) - 15.59;
  }
  it('body text of each guide is at or under Flesch-Kincaid grade 8, and no sentence runs past 30 words', () => {
    const { G } = load();
    for (const g of G.rrGuideList()) {
      const body = [g.lead];
      for (const s of g.sections) for (const line of [].concat(s.intro || [], s.list || [], s.intro2 || [], s.list2 || [], s.notes || [])) body.push(/[.!?:]$/.test(line) ? line : line + '.');
      const text = body.join(' ').replace(/:/g, '.');
      expect(grade(text), g.id).toBeLessThanOrEqual(8);
      for (const sentence of text.split(/[.!?]+(?=\s|$)/)) expect(sentence.trim().split(/\s+/).length, sentence).toBeLessThanOrEqual(30);
    }
  });
  it('new strings carry no emoji and no legal-advice or scare wording', () => {
    expect(SRC, 'the fixture describes guides this tool file does not have').toContain('function rrGuideList()');
    for (const [key, entry] of Object.entries(FIXTURE.strings)) {
      expect(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}]/u.test(entry.en), key).toBe(false);
      expect(/\b(you will die|kill you|always consult|legal counsel|attorney)\b/i.test(entry.en), key).toBe(false);
    }
    expect(FIXTURE.strings.guide_ui_disclaimer.en).toContain('not legal advice');
  });
  it('links go to BMV pages that were checked, never to a file or to the old /sos/bmv/licenses/ paths', () => {
    const { G } = load();
    const links = Object.values(G.RR_BMV_LINKS);
    expect(links).toHaveLength(4);
    for (const url of links) {
      expect(url).toMatch(/^https:\/\/www\.maine\.gov\/sos\/bmv\/driver-licenses-and-ids\/[A-Za-z0-9\/-]+$/);
      expect(url).not.toMatch(/\.(pdf|docx?|html?)$/i);
    }
    expect(SRC).not.toMatch(/maine\.gov\/sos\/bmv\/licenses\//);
    expect(SRC).not.toMatch(/maine\.gov[^'"\s]*\.pdf/);
  });
});
