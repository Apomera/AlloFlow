// Angle Explorer engagement build (2026-11-04), through a live mount with the
// hub's hosted state: the protractor near the top (compact hero, folded path,
// level menu, one-stop mode group, steps folded after the first task), no decoy
// Explore angle in the hero, snap feedback while dragging the protractor (never
// naming a scale), estimate-by-dragging in puzzles (no number until the check,
// locked before typing, no points), and levels named by skill.
// ANGLES_DEEP_SRC points at another copy (the start copy fails these).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.ANGLES_DEEP_SRC || 'stem_lab/stem_tool_angles.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mounted = [];
let live = null;
let xp = [];
let said = [];
let errors = [];

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'protractor');
  live = null; xp = []; said = []; errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); });
});

afterEach(async () => {
  vi.restoreAllMocks();
  delete window.PointerEvent;
  const screens = mounted.map(({ container }) => container.textContent).join(' ');
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
  expect(screens.match(/\{\w+\}/g), 'unfilled placeholder on screen').toBe(null);
  expect(said.filter((m) => /\{\w+\}/.test(m)), 'unfilled placeholder in an announcement').toEqual([]);
});

async function mount(init, extra) {
  const cfg = window.StemLab._registry.protractor;
  const container = document.createElement('div');
  document.body.appendChild(container);
  function Host() {
    const [angleValue, setAngleValue] = React.useState(init.angleValue != null ? init.angleValue : 45);
    const [angleChallenge, setAngleChallenge] = React.useState(init.angleChallenge || null);
    const [angleFeedback, setAngleFeedback] = React.useState(null);
    const [exploreScore, setExploreScore] = React.useState({ correct: 0, total: 0 });
    const [toolData, setToolData] = React.useState({ protractor: init.protractor || {}, angles: {} });
    live = { angleValue, exploreScore, d: toolData.protractor || {} };
    const update = (slot, key, val) => setToolData((p) => Object.assign({}, p, { [slot]: Object.assign({}, p[slot] || {}, { [key]: val }) }));
    const updateMulti = (slot, obj) => setToolData((p) => Object.assign({}, p, { [slot]: Object.assign({}, p[slot] || {}, obj) }));
    return cfg.render(makeCtx(Object.assign({
      toolData, setToolData, update, updateMulti,
      angleValue, setAngleValue, angleChallenge, setAngleChallenge, angleFeedback, setAngleFeedback,
      exploreScore, setExploreScore,
      awardXP: (id, n, why) => xp.push([id, n, why]),
      announceToSR: (m) => said.push(m),
      addToast: () => {},
      t: (k, fb) => fb || k,
    }, extra || {})));
  }
  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => { root.render(React.createElement(Host)); });
  mounted.push({ root, container });
  return container;
}
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
const key = async (el, k, opts) => React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, opts || {}))); });
async function setValue(input, value) {
  expect(input, 'input').toBeTruthy();
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
async function choose(select, value) {
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, value);
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}
// Keyboard tab stops in document order (positive tabindex is not used here).
function stops(c) {
  const closedIn = (n) => { const d = n.closest('details:not([open])'); return d && !(n.tagName === 'SUMMARY' && n.parentElement === d); };
  return Array.from(c.querySelectorAll('button,select,input,textarea,a[href],[tabindex],summary')).filter((n) => {
    const ti = n.hasAttribute('tabindex') ? Number(n.getAttribute('tabindex')) : 0;
    return ti >= 0 && !n.disabled && !n.closest('[hidden]') && !closedIn(n);
  });
}
class FakePointerEvent extends window.MouseEvent {
  constructor(type, init) { super(type, init); this.pointerId = init.pointerId; this.isPrimary = init.isPrimary !== false; this.pointerType = 'mouse'; }
}
const pe = (type, x, y) => new FakePointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 5, button: 0 });
const rig = (svg, w, h) => { svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h }); };

const readTask = { base: 40, open: 1, m: 62, vx: 210, vy: 175, tol: 1, start: { x: 130, y: 240, rot: 0 } };

describe('1. the protractor near the top', () => {
  it('a new grade 4-5 student reaches the protractor handle in about six tab stops', async () => {
    const c = await mount({ protractor: {} }, { gradeBand: 'g35' });
    const list = stops(c);
    const at = list.indexOf(c.querySelector('[data-angles-protractor]'));
    expect(at, 'handle is focusable').toBeGreaterThan(0);
    expect(at, 'stops before the handle: ' + list.slice(0, at).map((n) => n.getAttribute('aria-label') || n.textContent.trim().slice(0, 30)).join(' | ')).toBeLessThanOrEqual(7);
    // The score, badges, sound and export controls come after the activity.
    const bar = c.querySelector('[data-angles-toolbar]');
    expect(bar).toBeTruthy();
    expect(list.indexOf(bar.querySelector('button')) > at).toBe(true);
  });
  it('the path folds to one Next line; Start opens the step and moves focus to the protractor', async () => {
    const c = await mount({ protractor: { activeTab: 'challenges' } }, { gradeBand: 'g35' });
    expect(c.querySelector('[data-angles-path-next]').textContent).toBe('Next: Read an angle with the protractor');
    expect(c.querySelector('[data-angles-path-more]').hasAttribute('open'), 'all steps folded').toBe(false);
    // Every step and its tick are still there behind "All steps".
    expect(c.querySelectorAll('[data-angles-path-more] [data-angles-path-step]').length).toBe(6);
    await click(c.querySelector('[data-angles-path-start]'));
    expect(live.d).toMatchObject({ activeTab: 'protractor', mMode: 'read' });
    await React.act(async () => { await new Promise((r) => setTimeout(r, 120)); });
    expect(document.activeElement && document.activeElement.getAttribute('data-angles-protractor')).toBe('true');
  });
  it('Read / Draw / Compare is one radio group: one tab stop, arrow keys switch', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor' } }, { gradeBand: 'g35' });
    const group = c.querySelector('[role="radiogroup"]');
    const radios = Array.from(group.querySelectorAll('[role="radio"]'));
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    expect(radios.filter((r) => r.getAttribute('tabindex') === '0').length).toBe(1);
    await key(radios[0], 'ArrowRight');
    expect(live.d.mMode).toBe('draw');
    expect(document.activeElement.getAttribute('data-angles-mode')).toBe('draw');
    await key(c.querySelector('[data-angles-mode="draw"]'), 'End');
    expect(live.d.mMode).toBe('compare');
    await key(c.querySelector('[data-angles-mode="compare"]'), 'ArrowRight');
    expect(live.d.mMode).toBe('read');
  });
  it('"How to use a protractor" is open for the first task and folded after it', async () => {
    const a = await mount({ protractor: { activeTab: 'protractor', mSolved: 0 } }, { gradeBand: 'g35' });
    expect(a.querySelector('[data-angles-steps]').hasAttribute('open')).toBe(true);
    const b = await mount({ protractor: { activeTab: 'protractor', mSolved: 1 } }, { gradeBand: 'g35' });
    expect(b.querySelector('[data-angles-steps]').hasAttribute('open')).toBe(false);
    await click(Array.from(b.querySelectorAll('button')).find((x) => x.textContent.includes('Show the steps again')));
    expect(b.querySelector('[data-angles-steps]').hasAttribute('open')).toBe(true);
  });
});

describe('2. no decoy angle in the hero', () => {
  it('the Explore angle shows only on Explore', async () => {
    for (const tab of ['protractor', 'challenges', 'puzzles', 'polygons']) {
      const c = await mount({ angleValue: 45, protractor: { activeTab: tab, level: 'g57' } });
      const hero = c.querySelector('[data-protractor-command]');
      expect(/45/.test(hero.textContent), tab + ': ' + hero.textContent).toBe(false);
      expect(hero.querySelector('[data-angles-metric="angle"]')).toBe(null);
    }
    const e = await mount({ angleValue: 45, protractor: { activeTab: 'explore' } });
    expect(e.querySelector('[data-protractor-command] [data-angles-metric="angle"]').textContent).toMatch(/^45°/);
  });
});

describe('3. snap feedback while dragging the protractor', () => {
  it('a drag near the vertex snaps the centre and the baseline, rings the vertex and announces once; it never names a scale', async () => {
    window.PointerEvent = FakePointerEvent;
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: readTask, mPlace: { x: 150, y: 200, rot: 38 }, soundEnabled: false } });
    rig(c.querySelector('[data-angles-measure-svg]'), 420, 350);
    expect(c.querySelector('[data-angles-snap]').getAttribute('data-angles-snap')).toBe('');
    const prot = c.querySelector('[data-angles-protractor]');
    prot.setPointerCapture = () => {};
    await React.act(async () => { prot.dispatchEvent(pe('pointerdown', 150, 200)); });
    await React.act(async () => { window.dispatchEvent(pe('pointermove', 190, 190)); });
    expect(live.d.mPlace).toMatchObject({ x: 190, y: 190, rot: 38 });
    expect(said.length).toBe(0);
    await React.act(async () => { window.dispatchEvent(pe('pointermove', 205, 178)); });
    expect(live.d.mPlace).toEqual({ x: 210, y: 175, rot: 40 });
    await React.act(async () => { window.dispatchEvent(pe('pointermove', 206, 177)); });
    await React.act(async () => { window.dispatchEvent(pe('pointerup', 206, 177)); });
    expect(said).toEqual(['The centre is on the vertex. The baseline lies along the base ray.']);
    expect(c.querySelector('[data-angles-vertex-ring]')).toBeTruthy();
    expect(c.querySelector('[data-angles-base-snapped]').getAttribute('data-angles-base-snapped')).toBe('true');
    expect(c.querySelector('[data-angles-snap]').getAttribute('data-angles-snap')).toBe('vb');
    const checklist = c.querySelector('[data-angles-snap]').textContent;
    expect(/inner|outer|blue|red/i.test(checklist + said.join(' ')), checklist).toBe(false);
    // Keys still turn one degree away from the line: no snap back.
    await key(c.querySelector('[data-angles-protractor]'), 'PageUp');
    expect(live.d.mPlace.rot).toBe(41);
    expect(c.querySelector('[data-angles-snap]').getAttribute('data-angles-snap')).toBe('v');
  });
  it('the baseline snaps at either end (the wrong way round too), so the snap does not choose the scale', async () => {
    window.PointerEvent = FakePointerEvent;
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: readTask, mPlace: { x: 150, y: 200, rot: 222 }, soundEnabled: false } });
    rig(c.querySelector('[data-angles-measure-svg]'), 420, 350);
    const prot = c.querySelector('[data-angles-protractor]');
    prot.setPointerCapture = () => {};
    await React.act(async () => { prot.dispatchEvent(pe('pointerdown', 150, 200)); });
    await React.act(async () => { window.dispatchEvent(pe('pointermove', 212, 173)); });
    await React.act(async () => { window.dispatchEvent(pe('pointerup', 212, 173)); });
    expect(live.d.mPlace).toEqual({ x: 210, y: 175, rot: 220 });
    expect(c.querySelector('[data-angles-snap]').getAttribute('data-angles-snap')).toBe('vb');
    // Far from the line, no rotation snap.
    await unmount();
    const f = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: readTask, mPlace: { x: 150, y: 200, rot: 50 }, soundEnabled: false } });
    rig(f.querySelector('[data-angles-measure-svg]'), 420, 350);
    const p2 = f.querySelector('[data-angles-protractor]');
    p2.setPointerCapture = () => {};
    await React.act(async () => { p2.dispatchEvent(pe('pointerdown', 150, 200)); });
    await React.act(async () => { window.dispatchEvent(pe('pointermove', 210, 175)); });
    expect(live.d.mPlace).toEqual({ x: 210, y: 175, rot: 50 });
    expect(f.querySelector('[data-angles-snap]').getAttribute('data-angles-snap')).toBe('v');
  });
  it('the keyboard description says when the baseline lies along the base ray', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: readTask, mPlace: { x: 210, y: 175, rot: 39 } } });
    await key(c.querySelector('[data-angles-protractor]'), 'PageUp');
    expect(said.slice(-1)[0]).toMatch(/baseline lies along the base ray/);
    expect(c.querySelector('[data-angles-prot-desc]').textContent).toMatch(/centre is on the vertex, and its baseline lies along the base ray/);
  });
});

describe('4. estimate x by dragging before typing', () => {
  const comp = { kind: 'comp', a: 35, answer: 55, rot: 0, id: 'comp:35' };
  const P = (extra) => ({ protractor: Object.assign({ activeTab: 'puzzles', level: 'g57', pz: comp, pzKind: 'comp', pzSolved: { comp: 2 } }, extra || {}) });
  const dialText = (c) => c.querySelector('[data-angles-est]').textContent;
  it('no number while estimating; lock, then a wrong answer far from the estimate gets a sense check; the check shows both; no points for the estimate', async () => {
    const c = await mount(P());
    const slider = c.querySelector('[data-angles-est-slider]');
    expect(slider.getAttribute('aria-valuetext')).toBe('No opening yet');
    expect(c.querySelector('[data-angles-est-lock]').disabled, 'nothing to lock yet').toBe(true);
    await setValue(slider, '50');
    expect(live.d.pzEst).toEqual({ id: 'comp:35', deg: 50, locked: false });
    expect(c.querySelector('[data-angles-est-slider]').getAttribute('aria-valuetext')).toBe('Between 45° and 90°');
    expect(/\d/.test(dialText(c)), dialText(c)).toBe(false);
    expect(c.textContent.includes('50'), 'estimate printed').toBe(false);
    expect(c.querySelector('[data-angles-est-true]'), 'true size drawn before the check').toBe(null);
    await click(c.querySelector('[data-angles-est-lock]'));
    expect(live.d.pzEst.locked).toBe(true);
    expect(c.querySelector('[data-angles-est-slider]').disabled).toBe(true);
    expect(said.slice(-1)[0]).toMatch(/Estimate locked/);
    await setValue(c.querySelector('#stem-angles-pz-input'), '145');
    await click(c.querySelector('button[aria-label="Check my answer"]'));
    expect(c.querySelector('[data-angles-est-gap]').textContent).toMatch(/much larger than your estimate/);
    await setValue(c.querySelector('#stem-angles-pz-input'), '55');
    await click(c.querySelector('button[aria-label="Check my answer"]'));
    expect(live.d.pzResult.ok).toBe(true);
    expect(c.querySelector('[data-angles-est-status]').textContent).toBe('Your estimate was about 50°; x is 55°. A sharp eye: within 10°.');
    expect(c.querySelector('[data-angles-est-true]')).toBeTruthy();
    // The puzzle pays as before (second try); the estimate pays nothing.
    expect(xp.filter((a) => a[2] === 'angle puzzle')).toEqual([['protractor', 3, 'angle puzzle']]);
    expect(xp.filter((a) => /estimat/i.test(String(a[0]) + a[2])), JSON.stringify(xp)).toEqual([]);
  });
  it('typing locks the estimate; typing first closes it unused', async () => {
    const c = await mount(P());
    await setValue(c.querySelector('[data-angles-est-slider]'), '40');
    await setValue(c.querySelector('#stem-angles-pz-input'), '5');
    expect(live.d.pzEst).toEqual({ id: 'comp:35', deg: 40, locked: true });
    expect(c.querySelector('[data-angles-est-slider]').disabled).toBe(true);
    expect(said.slice(-1)[0]).toBe('Your estimate is now locked.');
    await setValue(c.querySelector('#stem-angles-pz-input'), '');
    expect(c.querySelector('[data-angles-est-slider]').disabled, 'clearing the box does not reopen it').toBe(true);
    const s = await mount(P());
    await setValue(s.querySelectorAll('#stem-angles-pz-input')[0], '55');
    expect(live.d.pzEst).toMatchObject({ locked: true, skipped: true });
    expect(s.querySelector('[data-angles-est-status]').textContent).toBe('No estimate this time.');
  });
  it('the dial arm follows a pointer drag; a new puzzle starts a fresh estimate; radian conversions have none', async () => {
    window.PointerEvent = FakePointerEvent;
    const c = await mount(P());
    rig(c.querySelector('[data-angles-est-dial]'), 240, 200);
    const hd = c.querySelector('[data-angles-est-handle]');
    expect(hd.getAttribute('aria-hidden'), 'the slider is the keyboard route').toBe('true');
    hd.setPointerCapture = () => {};
    await React.act(async () => { hd.dispatchEvent(pe('pointerdown', 200, 100)); });
    await React.act(async () => { window.dispatchEvent(pe('pointermove', 120, 20)); });
    await React.act(async () => { window.dispatchEvent(pe('pointerup', 120, 20)); });
    expect(live.d.pzEst).toMatchObject({ deg: 90, locked: false });
    await click(Array.from(c.querySelectorAll('button')).find((b) => b.textContent.includes('Next puzzle')));
    expect(live.d.pzEst).toBe(null);
    expect(c.querySelector('[data-angles-est-slider]').getAttribute('aria-valuetext')).toBe('No opening yet');
    const r = await mount({ protractor: { activeTab: 'puzzles', level: 'g8', pz: { kind: 'rad', deg: 135, dir: 'toRad', id: 'rad:135:toRad' }, pzKind: 'rad' } });
    expect(r.querySelector('[data-angles-est]')).toBe(null);
  });
});

describe('5. levels named by skill', () => {
  it('one level menu, skill first; choosing a level reorders the activities', async () => {
    const c = await mount({ protractor: {} }, { gradeBand: 'g35' });
    const sel = c.querySelector('[data-angles-level-select]');
    expect(Array.from(sel.options).map((o) => o.textContent)).toEqual(['Measuring angles (Grades 4–5)', 'Angle relationships (Grades 6–8)', 'Transversals, circles and radians (Grade 8 and up)']);
    expect(c.querySelector('#stem-angles-path-h').textContent).toBe('Start here: your path for Measuring angles (Grades 4–5)');
    await choose(sel, 'g57');
    expect(live.d.level).toBe('g57');
    expect(c.querySelector('[role="tab"]').id).toBe('stem-angles-tab-puzzles');
    expect(said.slice(-1)[0]).toBe('Level: Angle relationships (Grades 6–8).');
    // A teacher lock disables the menu.
    const l = await mount({ protractor: { teacher: { lockLevel: 'g8' } } }, { gradeBand: 'g35' });
    expect(l.querySelector('[data-angles-level-select]').disabled).toBe(true);
    expect(errors).toEqual([]);
  });
});

// Follow-up (2026-11-04): phones fold the 10-tab grid; the Protractor tab drops the topic band.
// A stub matchMedia: `phone.set(false)` fires a change like a rotated phone.
function stubPhone(matches) {
  const subs = new Set();
  const mq = { get matches() { return matches; }, media: '(max-width: 639px)', addEventListener: (_t, f) => subs.add(f), removeEventListener: (_t, f) => subs.delete(f), addListener: (f) => subs.add(f), removeListener: (f) => subs.delete(f) };
  window.matchMedia = vi.fn((q) => (/max-width:\s*639px/.test(q) ? mq : { matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
  return { set: async (v) => { matches = v; await React.act(async () => { subs.forEach((f) => f({ matches: v })); }); }, subs };
}
const tabIds = (c) => Array.from(c.querySelectorAll('[role="tab"]')).map((tb) => tb.id.replace('stem-angles-tab-', ''));
afterEach(() => { delete window.matchMedia; });

describe('6. phones: core tabs plus More', () => {
  it('a phone shows the band core tabs and a More disclosure; More opens every tab; the tabs pattern holds', async () => {
    stubPhone(true);
    const c = await mount({ protractor: {} }, { gradeBand: 'g35' });
    expect(tabIds(c)).toEqual(['protractor', 'challenges']);
    const more = c.querySelector('[data-angles-tabs-more]');
    expect(more, 'More button').toBeTruthy();
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(more.textContent).toBe('More (8)');
    expect(more.closest('[role="tablist"]'), 'More is not inside the tablist').toBe(null);
    const list = c.querySelector('[role="tablist"]');
    expect(more.getAttribute('aria-controls')).toBe(list.id);
    expect(Array.from(list.children).every((n) => n.getAttribute('role') === 'tab'), 'the tablist holds only tabs').toBe(true);
    // Every shown tab controls a panel that exists; one tab stop in the row.
    for (const tb of c.querySelectorAll('[role="tab"]')) expect(c.querySelector('#' + tb.getAttribute('aria-controls')), tb.id).toBeTruthy();
    expect(Array.from(c.querySelectorAll('[role="tab"]')).filter((tb) => tb.getAttribute('tabindex') === '0').map((tb) => tb.id)).toEqual(['stem-angles-tab-protractor']);
    // Arrow keys move round the shown tabs.
    await key(c.querySelector('#stem-angles-tab-protractor'), 'ArrowLeft');
    expect(live.d.activeTab).toBe('challenges');
    expect(document.activeElement.id).toBe('stem-angles-tab-challenges');
    // More: every tab, in order, reachable with the keyboard; Show fewer folds back.
    await click(more);
    expect(more.getAttribute('aria-expanded')).toBe('true');
    expect(more.textContent).toBe('Show fewer');
    expect(tabIds(c)).toEqual(['protractor', 'challenges', 'explore', 'puzzles', 'polygons', 'contexts', 'circles', 'construct', 'tools', 'reference']);
    await key(c.querySelector('#stem-angles-tab-challenges'), 'End');
    expect(live.d.activeTab).toBe('reference');
    expect(document.activeElement.id).toBe('stem-angles-tab-reference');
    await key(document.activeElement, 'ArrowLeft');
    expect(live.d.activeTab).toBe('tools');
    await click(c.querySelector('[data-angles-tabs-more]'));
    // Folded again, the open tab stays in the row.
    expect(tabIds(c)).toEqual(['protractor', 'challenges', 'tools']);
    expect(c.querySelector('[data-angles-tabs-more]').textContent).toBe('More (7)');
    expect(c.querySelector('[role="tab"][aria-selected="true"]').id).toBe('stem-angles-tab-tools');
    expect(errors).toEqual([]);
  });
  it('the More button is a keyboard stop right after the tabs, and the handle stays within reach', async () => {
    stubPhone(true);
    const c = await mount({ protractor: {} }, { gradeBand: 'g35' });
    const list = stops(c);
    const more = c.querySelector('[data-angles-tabs-more]');
    expect(list.indexOf(more)).toBe(list.indexOf(c.querySelector('#stem-angles-tab-protractor')) + 1);
    expect(list.indexOf(c.querySelector('[data-angles-protractor]'))).toBeLessThanOrEqual(8);
  });
  it('the core tabs follow the level; teacher locks still win; a wide screen and a rotated phone show every tab', async () => {
    stubPhone(true);
    const g = await mount({ protractor: { level: 'g57', activeTab: 'explore' } });
    expect(tabIds(g)).toEqual(['puzzles', 'polygons', 'contexts', 'explore']);
    const l = await mount({ protractor: { teacher: { lockLevel: 'g8' } } }, { gradeBand: 'g35' });
    expect(tabIds(l)).toEqual(['circles', 'construct']);
    expect(l.querySelector('[data-angles-tabs-more]').textContent).toBe('More (8)');
    const k = await mount({ protractor: { teacher: { lockTab: 'puzzles' } } }, { gradeBand: 'g35' });
    expect(tabIds(k)).toEqual(['puzzles', 'reference']);
    expect(k.querySelector('[data-angles-tabs-more]'), 'nothing to fold under a tab lock').toBe(null);
    const phone = stubPhone(true);
    const r = await mount({ protractor: {} }, { gradeBand: 'g35' });
    expect(tabIds(r).length).toBe(2);
    await phone.set(false);
    expect(tabIds(r).length).toBe(10);
    expect(r.querySelector('[data-angles-tabs-more]')).toBe(null);
    await unmount();
    expect(phone.subs.size, 'the media listener is removed on unmount').toBe(0);
    stubPhone(false);
    const w = await mount({ protractor: {} }, { gradeBand: 'g35' });
    expect(tabIds(w).length).toBe(10);
    expect(w.querySelector('[data-angles-tabs-more]')).toBe(null);
  });
});

describe('7. the Protractor tab has no repeated topic band', () => {
  it('no band hint on Protractor (its heading stays for screen readers); other tabs keep the band', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor' } }, { gradeBand: 'g35' });
    expect(c.textContent.includes('two scales because'), 'band hint shown').toBe(false);
    const hd = c.querySelector('[data-angles-band-sr="protractor"]');
    expect(hd && hd.tagName).toBe('H3');
    expect(hd.textContent).toBe('Protractor: read, draw and compare angles');
    expect(hd.style.position).toBe('absolute');
    const ch = await mount({ protractor: { activeTab: 'challenges' } }, { gradeBand: 'g35' });
    expect(ch.textContent.includes('Estimation builds spatial sense')).toBe(true);
  });
});

async function unmount() { const { root, container } = mounted.pop(); await React.act(async () => root.unmount()); container.remove(); }
