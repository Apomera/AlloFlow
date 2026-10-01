// Fixes from an axe-core audit of Geology Explorer in a real browser (8 states: explore, investigate,
// assess, Deep Earth, mountain belt, phone, walk, dark), plus the drill-rig strings found English-only
// on the way:
//  - aria-label on a plain <div>/<span> is ignored by screen readers (the sequence position badge,
//    the mission counter, the core-rig variable cards, an empty cassette slot);
//  - the scene-comparison "table" had no row or cell roles, and its sideways scroll box could not be
//    reached from the keyboard (a phone user could not scroll it without a mouse);
//  - the sequence up/down buttons were 18.7 px wide (WCAG 2.2 target size asks for 24);
//  - rock-type chips in the walk HUD were 3.7-4.4:1 on its 90% white card over the dark 3D view;
//  - the core rig built labels from English fragments ("Interval 3: pending", "2 coolant pulses").
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const root = path.resolve(import.meta.dirname, '..');
// GEO_TEST_SOURCE lets a mutation check load a scratch copy instead of rewriting the shared file.
const SRC = process.env.GEO_TEST_SOURCE || path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const source = fs.readFileSync(SRC, 'utf8');
const get = (o, k) => k.split('.').reduce((x, p) => (x && typeof x === 'object' ? x[p] : undefined), o);

let cfg, P, live = [];
beforeAll(() => {
  resetStemLab();
  delete window.__alloGeologyPure;
  cfg = loadTool(SRC, 'geologyExplorer');
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed');
});
afterEach(() => {
  for (const m of live) { act(() => m.root.unmount()); m.container.remove(); }
  live = [];
});
function mount(scene, mode) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const store = newStore({ geologyExplorer: { scene, mode } });
  const ctx = makeCtx({ toolData: store.toolData }, store);
  const r = ReactDOMClient.createRoot(container);
  act(() => r.render(React.createElement(() => cfg.render(ctx))));
  live.push({ container, root: r });
  return container;
}

const SCENES = ['crust', 'geode', 'deepEarth', 'subduction', 'ridge', 'hotspot', 'collision'];
const GENERIC = new Set(['DIV', 'SPAN', 'P', 'STRONG', 'EM', 'B', 'I', 'SMALL']);

describe('Geology Explorer after the axe audit', () => {
  it('no plain div/span/p carries an aria-label in any scene or mode (screen readers ignore it there)', () => {
    const bad = [];
    for (const scene of SCENES) {
      for (const mode of ['explore', 'investigate', 'assess']) {
        const c = mount(scene, mode);
        for (const el of c.querySelectorAll('[aria-label]')) {
          if (GENERIC.has(el.tagName) && !el.getAttribute('role')) bad.push(scene + '/' + mode + ' <' + el.tagName.toLowerCase() + '> "' + el.getAttribute('aria-label').slice(0, 60) + '"');
        }
        act(() => live.pop().root.unmount());
        c.remove();
      }
    }
    expect(bad, bad.slice(0, 6).join('\n')).toEqual([]);
  }, 90000);   // 21 full mounts: slow on a loaded machine

  it('the scene comparison is a real table with row and cell roles, inside a keyboard-scrollable region', () => {
    const c = mount('crust', 'assess');
    const panel = c.querySelector('[data-geology-scene-comparison]');
    expect(panel, 'comparison panel not rendered in Assess').toBeTruthy();
    const table = panel.querySelector('[role="table"]');
    expect(table, 'no role=table').toBeTruthy();
    const scroller = table.parentElement;
    expect(scroller.getAttribute('role')).toBe('region');
    expect(scroller.getAttribute('tabindex')).toBe('0');
    expect(scroller.getAttribute('aria-label')).toBeTruthy();
    expect(scroller.className).toContain('overflow-x-auto');
    expect(scroller.className).toMatch(/focus-visible:ring-2/);   // a focus stop must show where focus is
    const rows = [...table.children];
    expect(rows.length).toBe(6);
    expect(rows.every((r) => r.getAttribute('role') === 'row')).toBe(true);
    const roles = (r) => [...r.children].map((x) => x.getAttribute('role'));
    expect(roles(rows[0])).toEqual(['cell', 'columnheader', 'columnheader']);
    for (const r of rows.slice(1)) expect(roles(r)).toEqual(['rowheader', 'cell', 'cell']);
    expect(rows[1].children[0].textContent).toBe('Concept');
  });

  it('sequence cards: the position reads as text, and the move buttons are at least 24 px targets', () => {
    const c = mount('crust', 'investigate');
    const cards = [...c.querySelectorAll('[data-geology-sequence-card]')];
    expect(cards.length).toBeGreaterThan(2);
    cards.forEach((card, i) => {
      const badge = card.firstElementChild;
      expect(badge.hasAttribute('aria-label')).toBe(false);
      expect(badge.querySelector('.sr-only').textContent).toBe('Position ' + (i + 1));
      expect(badge.querySelector('[aria-hidden="true"]').textContent).toBe(String(i + 1));
      const moves = [...card.querySelectorAll('button')].filter((b) => /^Move .* (earlier|later)$/.test(b.getAttribute('aria-label') || ''));
      expect(moves.length).toBe(2);
      for (const b of moves) { expect(b.className).toMatch(/\bmin-h-6\b/); expect(b.className).toMatch(/\bmin-w-6\b/); }
    });
  });

  it('the mission counter speaks its full sentence and hides the bare fraction', () => {
    const c = mount('crust', 'investigate');
    const spoken = [...c.querySelectorAll('.sr-only')].filter((e) => /^\d+ of \d+ mission checks complete$/.test(e.textContent));
    expect(spoken.length).toBe(1);
    const fraction = spoken[0].nextElementSibling;
    expect(fraction.getAttribute('aria-hidden')).toBe('true');
    expect(fraction.textContent).toMatch(/^\d+\/\d+$/);
  });

  it('every light rock-type chip is at least 4.5:1 on the walk HUD card (90% white over the 3D view) and on white', () => {
    const block = source.slice(source.indexOf('var TYPE_INK = {'), source.indexOf('\n    dark:', source.indexOf('var TYPE_INK = {')));
    const types = [...block.matchAll(/'([^']+)': '#[0-9a-f]{6}'/g)].map((m) => m[1]);
    expect(types.length).toBeGreaterThan(20);
    const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const lum = (c) => { const a = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const mix = (fg, bg, al) => fg.map((v, i) => Math.round(v * al + bg[i] * (1 - al)));
    const card = mix(hex('#ffffff'), hex('#060913'), 0.9);            // bg-white/90 over the viewport's #060913
    const low = [];
    for (const type of types) {
      const ink = P.typeInkFor(type, false);                           // the product's own lookup
      for (const [name, ground] of [['HUD card', card], ['white', hex('#ffffff')]]) {
        const chip = mix(hex(ink), ground, 0x22 / 255);                  // the chip's own ink + '22' tint
        const r = ratio(hex(ink), chip);
        if (r < 4.5) low.push(type + ' ' + ink + ' on ' + name + ': ' + r.toFixed(2));
      }
    }
    expect(low, low.join('\n')).toEqual([]);
    expect(source).toContain("style: { color: typeInk(fpHud.type), background: typeInk(fpHud.type) + '22' }");   // the tint this models
  });

  it('the core rig and its comparison build every label from translated templates', () => {
    for (const gone of ["'Interval ' + cassetteSlot.interval", "' coolant pulse'", "'CERT ' +", "'Next XP at ' +", "' intervals ' + range",
      "'Δ Changed · '", "'= Held · '", "rigBrief.summary)", "'Re-excavated ' +", "'Excavated ' + material.name", "' becomes ' + toR.name",
      "sceneResumeNotice.message", "(discoveryProgress.complete ? ' complete' : ' logged')", "'fwd', 1, 'Move forward')", "'jump', 1, 'Jump')", "'Angle changed · depth held' :"]) {
      expect(source.includes(gone), 'still built from English: ' + gone).toBe(false);
    }
    for (const kept of ['geoTT(objective.label)', "tf('stem.geology.ui.core_interval_pending'", "tf('stem.geology.a11y.core_band_integrity'",
      "tf('stem.geology.ui.cert_line'", "tf('stem.geology.sr.bore_brief_complete', 'Bore Brief {met} of 3 complete. ', { met: rigBrief.metCount }).trim()",
      "geoT('stem.geology.eng.re_excavated'", "tf('stem.geology.sr.cycle_applied'", "tf('stem.geology.ui.resumed_at_stage'",
      "padBtn('▲', 'fwd', 1, t('stem.geology.a11y.pad_forward', 'Move forward'))", "key: axis + ':' + val"]) {
      expect(source.includes(kept), 'missing: ' + kept).toBe(true);
    }
  });

  // The rig panels only render in walk mode (WebGL), which jsdom cannot reach, so these are source pins.
  it('the rig panels put spoken labels in sr-only text or on an element with a role', () => {
    for (const gone of ["'aria-label': changed ? tf('stem.geology.a11y.variable_changed_to'", "'aria-label': slotLabel }, slotCopy)",
      "h('div', { key: 'mix', className: 'mt-1.5 flex flex-wrap gap-1', 'aria-label'"]) {
      expect(source.includes(gone), 'aria-label on a plain element: ' + gone).toBe(false);
    }
    for (const kept of ["h('span', { key: 'sr', className: 'sr-only' }, changed ? tf('stem.geology.a11y.variable_changed_to'",
      "h('span', { key: 'state', 'aria-hidden': 'true'", "[h('span', { key: 'sr', className: 'sr-only' }, slotLabel)].concat(slotCopy)",
      "h('div', { key: 'mix', role: 'group', className: 'mt-1.5 flex flex-wrap gap-1', 'aria-label'"]) {
      expect(source.includes(kept), 'missing: ' + kept).toBe(true);
    }
  });

  it('the new rig, pad and objective strings are registered and translated in all five packs', () => {
    const KEYS = ['ui.variable_changed', 'ui.variable_held', 'ui.depth_n_intervals', 'a11y.core_band', 'a11y.core_band_integrity', 'ui.recovered_formation',
      'ui.angle_changed_depth_held', 'ui.depth_changed_angle_held', 'ui.reference_bore', 'ui.candidate_bore', 'ui.core_compare_default_finding',
      'ui.core_compare_default_control', 'ui.coolant_pulses_one', 'ui.coolant_pulses', 'ui.specimens_complete', 'ui.specimens_logged', 'ui.cert_line',
      'ui.core_interval_scanning', 'ui.core_interval_current', 'ui.core_interval_pending', 'a11y.pad_forward', 'a11y.pad_left', 'a11y.pad_back',
      'a11y.pad_right', 'a11y.pad_up', 'a11y.pad_down', 'a11y.pad_jump', 'sr.cycle_applied', 'ui.resumed_at_stage', 'eng.re_excavated',
      'eng.excavated_exposed', 'eng.excavated_column_done'].map((k) => 'stem.geology.' + k);
    for (const en of ['Recover the safe column', 'Protect average integrity', 'Build a pristine streak']) KEYS.push(P.geoTextKey ? P.geoTextKey(en) : 'stem.geology.text.t' + (() => { let h = 0x811c9dc5; for (let i = 0; i < en.length; i++) { h ^= en.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); })());
    const reg = JSON.parse(fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8'));
    const pub = JSON.parse(fs.readFileSync(path.join(root, 'desktop', 'web-app', 'public', 'ui_strings.js'), 'utf8'));
    const bad = [];
    for (const k of KEYS) {
      if (typeof get(reg, k) !== 'string') bad.push('unregistered ' + k);
      if (get(pub, k) !== get(reg, k)) bad.push('public ui_strings differs ' + k);
    }
    for (const pack of ['spanish_latin_america', 'french', 'portuguese_angola', 'arabic', 'ukrainian']) {
      // GEO_TEST_LANG_DIR: point the gate at other packs (e.g. pre-translation copies) to prove it fails.
      const data = JSON.parse(fs.readFileSync(path.join(process.env.GEO_TEST_LANG_DIR || path.join(root, 'lang'), pack + '.js'), 'utf8'));
      for (const k of KEYS) {
        const v = get(data, k), en = get(reg, k);
        if (typeof v !== 'string') bad.push(pack + ' missing ' + k);
        else if (v === en && !/cert_line$/.test(k)) bad.push(pack + ' still English ' + k);   // "CERT" may stay as an abbreviation
        else if ((v.match(/\{[a-z_]+\}/g) || []).sort().join() !== (en.match(/\{[a-z_]+\}/g) || []).sort().join()) bad.push(pack + ' placeholders ' + k);
      }
    }
    expect(bad, bad.slice(0, 8).join('\n')).toEqual([]);
  }, 90000);   // parses seven multi-megabyte JSON files
});
