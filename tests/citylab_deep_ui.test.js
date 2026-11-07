// City Planning Lab deep pass (2026-11-03): behaviour a student or teacher
// actually meets, mounted for real through the shared smoke harness with a
// stateful toolData, so effects, XP and saves all run.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.CITYLAB_FILE || 'stem_lab/stem_tool_citylab.js';
const STORE_KEY = 'allo_citylab_plan_v1';
const act = React.act || React.unstable_act;

let root = null;
let P = null;

beforeEach(() => {
  resetStemLab();
  delete window.__alloCityLabPure;
  window.localStorage.removeItem(STORE_KEY);
  loadTool(FILE, 'cityLab');
  P = window.__alloCityLabPure;
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  root = null;
  window.localStorage.removeItem(STORE_KEY);
});

async function mount(opts) {
  opts = opts || {};
  const out = { latest: null, announced: [], award: opts.award || vi.fn() };
  function App() {
    const [state, setState] = React.useState(opts.toolData || {});
    out.latest = state;
    return window.StemLab._registry.cityLab.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState, awardXP: out.award,
      announceToSR: (m) => out.announced.push(m),
      theme: 'light'
    }, opts.ctx || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await act(() => root.render(React.createElement(App)));
  return out;
}

const $ = (sel) => document.querySelector(sel);
const parcel = (id) => $('#citylab-parcel-' + id);
const buttonByText = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
const buttonsContaining = (text) => [...document.querySelectorAll('button')].filter((b) => b.textContent.indexOf(text) !== -1);
async function click(el) { await act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); }
async function press(el, key) {
  await act(() => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });
}
async function choose(select, value) {
  await act(() => { select.value = value; select.dispatchEvent(new window.Event('change', { bubbles: true })); });
}
const last = (arr) => arr[arr.length - 1] || '';
const text = () => document.body.textContent;

describe('predict before commit', () => {
  it('holds the edit and its numbers back until the student predicts', async () => {
    const m = await mount({ toolData: { _cityLab: { predictEvery: true } } });
    await press(parcel('A9'), '6');
    // Not applied: the board and the saved plan still show open field.
    expect(parcel('A9').getAttribute('aria-label')).toContain('Open field');
    expect(m.latest._cityLab.plan.uses.A9).toBe('field');
    expect(text()).toContain('Before you look');
    // The screen reader hears the change and the question, and no new number.
    const said = last(m.announced);
    expect(said).toMatch(/not applied yet/);
    expect(said).not.toMatch(/New homes \d|Runoff coefficient \d|Cost \$/);

    // Predict the homes count, with a size, then commit.
    await choose([...document.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === 'newUnitsServed')), 'newUnitsServed');
    await click(buttonsContaining('Medium:')[0]);
    await click(buttonByText('up'));
    expect(parcel('A9').getAttribute('aria-label')).toContain('Housing, mid density');
    const logged = m.latest._cityLab.plan.predictions;
    expect(logged).toHaveLength(1);
    // A9 has no road, so the count of reached homes did not move. The model
    // says so instead of agreeing with the guess.
    expect(logged[0]).toMatchObject({ indicator: 'newUnitsServed', guess: 'up', actual: 'about the same', size: 'medium' });
    expect(text()).toMatch(/You said up\. It actually went about the same/);
    // Now, and only now, the numbers are spoken.
    expect(last(m.announced)).toMatch(/New homes \d/);
  });

  it('can be skipped or cancelled without logging a prediction', async () => {
    const m = await mount({ toolData: { _cityLab: { predictEvery: true } } });
    await press(parcel('A9'), '6');
    await click(buttonByText('Cancel this change'));
    expect(parcel('A9').getAttribute('aria-label')).toContain('Open field');
    await press(parcel('A9'), '6');
    await click(buttonByText('Skip, just apply it'));
    expect(parcel('A9').getAttribute('aria-label')).toContain('Housing, mid density');
    expect(m.latest._cityLab.plan.predictions).toHaveLength(0);
  });

  it('stages the seventh edit by default rather than asking after the fact', async () => {
    await mount();
    for (const id of ['A9', 'B9', 'C9', 'A10', 'B10', 'C10']) await press(parcel(id), '6');
    expect(text()).not.toContain('Before you look');
    await press(parcel('A11'), '6');
    expect(text()).toContain('Before you look');
    expect(parcel('A11').getAttribute('aria-label')).toContain('Open field');
  });

  it('lets a teacher require it, and then offers no skip', async () => {
    await mount({ toolData: { _cityLab: { teacher: { predictEvery: true } } } });
    await press(parcel('A9'), '6');
    expect(text()).toContain('Before you look');
    expect(buttonByText('Skip, just apply it')).toBeFalsy();
    expect(buttonByText('Cancel this change')).toBeTruthy();
  });
});

describe('saved plans travel in toolData', () => {
  it('writes the plan to toolData and still to localStorage', async () => {
    const m = await mount();
    await press(parcel('A9'), '6');
    expect(m.latest._cityLab.plan.uses.A9).toBe('housing_mid');
    expect(JSON.parse(window.localStorage.getItem(STORE_KEY)).uses.A9).toBe('housing_mid');
  });

  it('migrates a localStorage-only plan into toolData, keeping its move budget', async () => {
    const old = P.startChallenge('mesahollow', 12);
    const edited = P.setUse(old, 'H1', 'mixed');
    window.localStorage.setItem(STORE_KEY, JSON.stringify(edited));
    const m = await mount();
    expect(m.latest._cityLab.plan.scenarioId).toBe('mesahollow');
    expect(m.latest._cityLab.plan.uses.H1).toBe('mixed');
    // The old loader dropped this, silently ending the challenge on reload.
    expect(m.latest._cityLab.plan.moveBudget).toBe(12);
    expect(text()).toContain('11 of 12 moves left');
  });

  it('prefers the project copy over this machine\'s copy', async () => {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(P.basePlan('mesahollow')));
    const mine = P.setUse(P.basePlan('harborlight'), 'A1', 'park');
    const m = await mount({ toolData: { _cityLab: { plan: mine } } });
    expect(m.latest._cityLab.plan.scenarioId).toBe('harborlight');
    expect(text()).toContain('City Planning Lab · Harborlight');
  });
});

describe('the assumption set the scorecard uses can actually be changed', () => {
  it('moves the 2100 line on the map when the set changes', async () => {
    const m = await mount({ toolData: { _cityLab: { plan: P.basePlan('harborlight') } } });
    const atRisk = () => [...document.querySelectorAll('[id^="citylab-parcel-"]')]
      .filter((b) => /inside the 2100 reach/.test(b.getAttribute('aria-label'))).length;
    const before = atRisk();
    await click(buttonByText('Assumption Lab'));
    const sel = [...document.querySelectorAll('select')].find((s) => s.closest('label') && /scorecard and the map use/.test(s.closest('label').textContent));
    await choose(sel, 'conservative');
    expect(m.latest._cityLab.plan.assumptionSetId).toBe('conservative');
    expect(m.latest._cityLab.plan.editCount).toBe(0);           // not an edit, costs no move
    await click(buttonByText('Design'));
    expect(atRisk()).toBeGreaterThan(before);
  });
});

describe('XP: modest, verified, once', () => {
  function briefPlan() {
    const useAll = (p, ids, u) => ids.reduce((a, id) => P.setUse(a, id, u), p);
    const homes = [];
    ['A', 'B', 'C'].forEach((c) => [9, 10, 11, 12].forEach((r) => homes.push(c + r)));
    ['A', 'B', 'C'].forEach((c) => [1, 2].forEach((r) => homes.push(c + r)));
    homes.push('A3', 'B3');
    let p = useAll(P.basePlan(), homes, 'mixed');
    p = homes.reduce((a, id) => P.toggleGreenInfra(a, id), p);
    p = useAll(p, ['D10', 'D2', 'D12'], 'park');
    const pairs = [];
    for (let r = 8; r <= 11; r++) pairs.push(['C' + r, 'C' + (r + 1)]);
    [9, 10, 11, 12].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r], ['C' + r, 'D' + r]));
    for (let r = 2; r <= 5; r++) pairs.push(['C' + r, 'C' + (r - 1)]);
    [1, 2, 3].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r], ['C' + r, 'D' + r]));
    pairs.push(['D2', 'D1']);
    return pairs.reduce((a, e) => P.setEdge(a, e[0], e[1], 'local'), p);
  }
  const calls = (award, id) => award.mock.calls.filter((c) => c[0] === id);

  // W7 (Aaron): the brief's XP is paid by Check my plan on the brief strip, not on mount.
  const checkBrief = () => click(document.querySelector('[data-citylab-strip-check="brief"]'));
  it('pays for meeting the brief once, and never again on reopen', async () => {
    const award = vi.fn();
    const m = await mount({ award, ctx: { gradeBand: 'g912' }, toolData: { _cityLab: { plan: briefPlan(), coachOff: true } } });
    expect(calls(award, 'citylab_brief_riverbend')).toHaveLength(0);
    await checkBrief();
    expect(calls(award, 'citylab_brief_riverbend')).toHaveLength(1);
    expect(calls(award, 'citylab_brief_riverbend')[0][1]).toBe(20);
    expect(typeof calls(award, 'citylab_brief_riverbend')[0][2]).toBe('string');
    const saved = m.latest;
    await act(() => root.unmount());
    root = null;
    document.body.innerHTML = '<div id="root"></div>';
    await mount({ award, ctx: { gradeBand: 'g912' }, toolData: saved });
    await checkBrief();
    expect(calls(award, 'citylab_brief_riverbend')).toHaveLength(1);
  });

  it('pays nothing for a plan loaded from a file', async () => {
    const award = vi.fn();
    await mount({ award, ctx: { gradeBand: 'g912' }, toolData: { _cityLab: { plan: Object.assign(briefPlan(), { imported: true }), coachOff: true } } });
    await checkBrief();
    expect(calls(award, 'citylab_brief_riverbend')).toHaveLength(0);
  });

  it('pays for an Assumption Lab comparison once, and only on a plan with changes', async () => {
    const award = vi.fn();
    await mount({ award });
    await click(buttonByText('Assumption Lab'));
    await click(buttonByText('Run the plan under both sets'));
    expect(calls(award, 'citylab_lab_riverbend')).toHaveLength(0);
    await click(buttonByText('Design'));
    await press(parcel('A9'), '6');
    await click(buttonByText('Assumption Lab'));
    await click(buttonByText('Run the plan under both sets'));
    await click(buttonByText('Run the plan under both sets'));
    expect(calls(award, 'citylab_lab_riverbend')).toHaveLength(1);
  });

  it('pays for a memo only once it has a constraint, a reason and evidence', async () => {
    const award = vi.fn();
    const m = await mount({ award });
    await click(buttonByText('Memo'));
    await click(buttonByText('Submit the memo'));
    expect(text()).toContain('Not ready to submit yet');
    expect(calls(award, 'citylab_memo_riverbend')).toHaveLength(0);
    await choose([...document.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === 'req_cost')), 'req_cost');
    const ta = $('textarea');
    await act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, 'We kept the bond by building close to the roads we already have instead of bridging the river.');
      ta.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await click(buttonsContaining('Public infrastructure cost:')[0]);
    await click(buttonByText('Submit the memo'));
    expect(text()).toContain('Memo submitted for Riverbend');
    expect(m.latest._cityLab.plan.memo.bindingConstraint).toBe('req_cost');
    expect(m.latest._cityLab.plan.memo.evidence).toEqual(['capitalCost']);
    await click(buttonByText('Submit the memo again'));
    expect(calls(award, 'citylab_memo_riverbend')).toHaveLength(1);
  });
});

describe('grade-band missions', () => {
  it('starts grades 6-8 on staged missions with a worked example from another town', async () => {
    await mount({ ctx: { gradeBand: 'g68' } });
    expect(text()).toContain('Missions');
    expect(text()).toContain('1. Fix park access (Now)');
    expect(text()).toContain('Worked example, from Mesa Hollow');
    expect(text()).toContain('4. Keep the farms and the wetland (Later)');
  });

  it('starts grades 9-12 on the open brief, with missions one click away', async () => {
    await mount({ ctx: { gradeBand: 'g912' } });
    expect(text()).not.toContain('Fix park access');
    await click(buttonByText('Missions'));
    expect(text()).toContain('Fix park access');
  });

  it('checks a mission with the model, names the misconception, and reveals only after two tries', async () => {
    const award = vi.fn();
    const m = await mount({ award, ctx: { gradeBand: 'g68' } });
    await click(buttonByText('Check my plan'));
    expect(text()).toContain('Not met yet');
    expect(text()).toContain('No park yet');
    expect(buttonByText('Show one way to do it')).toBeFalsy();
    await click(buttonByText('Check my plan'));
    expect(buttonByText('Show one way to do it')).toBeTruthy();
    expect(m.latest._cityLab.misTally.no_park).toBe(2);
    expect(award).not.toHaveBeenCalledWith('citylab_mission_riverbend_m_park', expect.anything(), expect.anything());
  });

  it('pays mission XP once when the model confirms it, and not after a reveal', async () => {
    let plan = P.basePlan('riverbend');
    P.parkExample('riverbend').steps.forEach((s) => {
      plan = P.setUse(plan, s.id, 'park');
      if (s.via) plan = P.setEdge(plan, s.id, s.via, 'path');
    });
    const award = vi.fn();
    const m = await mount({ award, ctx: { gradeBand: 'g68' }, toolData: { _cityLab: { plan } } });
    await click(buttonByText('Check my plan'));
    expect(text()).toContain('Mission complete: Fix park access');
    expect(award.mock.calls.filter((c) => c[0] === 'citylab_mission_riverbend_m_park')).toHaveLength(1);
    expect(m.latest._cityLab.missions.riverbend.m_park.done).toBe(true);
    // The next mission is now current.
    expect(text()).toContain('2. Meet the bond (Now)');

    const award2 = vi.fn();
    await act(() => root.unmount());
    document.body.innerHTML = '<div id="root"></div>';
    await mount({ award: award2, ctx: { gradeBand: 'g68' }, toolData: { _cityLab: { plan, missions: { riverbend: { m_park: { checks: 2, revealed: true } } } } } });
    await click(buttonByText('Check my plan'));
    expect(text()).toContain('Mission complete: Fix park access');
    expect(award2.mock.calls.filter((c) => c[0] === 'citylab_mission_riverbend_m_park')).toHaveLength(0);
  });
});

describe('teacher panel', () => {
  it('is invisible to students', async () => {
    await mount();
    expect(text()).not.toContain('Teacher settings');
  });

  it('locks the town and the move budget, and the lock holds for students', async () => {
    const m = await mount({ toolData: { _cityLab: { teacher: { lockTown: 'mesahollow', moveBudget: 20 } } } });
    expect(m.latest._cityLab.plan.scenarioId).toBe('mesahollow');
    expect($('select[aria-label="Town, set by your teacher"]').disabled).toBe(true);
    expect(text()).toContain('20 of 20 moves left');
    expect(buttonByText('End challenge')).toBeFalsy();
    expect(buttonByText('Limited moves')).toBeFalsy();
  });

  it('lets a teacher fix the compared sets, and the student cannot change them', async () => {
    const m = await mount({ ctx: { isTeacherMode: true } });
    expect(text()).toContain('Teacher settings');
    await click(buttonByText('Fix the two sets students compare'));
    expect(m.latest._cityLab.teacher.lockSets).toBe(true);
    await click(buttonByText('Assumption Lab'));
    expect(text()).toContain('Your teacher has chosen the two sets to compare.');
    const setSelects = [...document.querySelectorAll('select')].filter((s) => s.closest('label') && /^Set [AB]/.test(s.closest('label').textContent));
    expect(setSelects.length).toBeGreaterThan(0);
    setSelects.filter((s) => !s.closest('section').textContent.includes('Teacher settings')).forEach((s) => expect(s.disabled).toBe(true));
  });
});

describe('keyboard and structure', () => {
  it('makes the map one tab stop with a roving tabindex', async () => {
    await mount();
    const stops = [...document.querySelectorAll('[id^="citylab-parcel-"]')].filter((b) => b.tabIndex === 0);
    expect(stops.map((b) => b.id)).toEqual(['citylab-parcel-D6']);
    parcel('D6').focus();
    await press(parcel('D6'), 'ArrowRight');
    const after = [...document.querySelectorAll('[id^="citylab-parcel-"]')].filter((b) => b.tabIndex === 0);
    expect(after.map((b) => b.id)).toEqual(['citylab-parcel-E6']);
  });

  it('wraps the open tab\'s content in its tab panel, and moves between tabs with the arrow keys', async () => {
    await mount();
    const panel = $('[role="tabpanel"]');
    expect(panel.getAttribute('aria-labelledby')).toBe('citylab-tab-design');
    expect(panel.contains(parcel('A1'))).toBe(true);
    const design = $('#citylab-tab-design');
    design.focus();
    await press(design, 'ArrowRight');
    expect(document.activeElement.id).toBe('citylab-tab-table');
    expect($('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe('citylab-tab-table');
    expect($('[role="tabpanel"]').querySelector('select[aria-label="Land use for parcel A9"]')).toBeTruthy();
  });

  it('ignores the digit shortcuts when a modifier key is held', async () => {
    await mount();
    await act(() => {
      parcel('A9').dispatchEvent(new window.KeyboardEvent('keydown', { key: '6', ctrlKey: true, bubbles: true, cancelable: true }));
    });
    expect(parcel('A9').getAttribute('aria-label')).toContain('Open field');
  });
});

describe('every visible string goes through the translator', () => {
  // Wrap every fallback; any lowercase prose left unwrapped never reached t().
  const wrapT = (k, fb) => '«' + fb + '»';
  const leaks = () => {
    const out = [];
    const walker = document.createTreeWalker(document.getElementById('root'), window.NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const s = n.nodeValue.trim();
      if (!s || s.indexOf('«') !== -1 || s.indexOf('»') !== -1) continue;
      // The towns are proper names (the town picker's options).
      if (/^(Riverbend|Mesa Hollow|Harborlight)$/.test(s)) continue;
      if (/[a-z]{4,}/.test(s)) out.push(s.slice(0, 80));
    }
    return out;
  };
  const ATTRS = ['aria-label'];
  const attrLeaks = () => [...document.querySelectorAll('#root [aria-label]')]
    .map((el) => el.getAttribute(ATTRS[0]))
    .filter((s) => /[a-z]{4,}/.test(s) && s.indexOf('«') === -1);

  it('leaves no untranslated prose on any tab, in any town, at either level, or for a teacher', async () => {
    const found = new Set();
    for (const town of ['riverbend', 'mesahollow', 'harborlight']) {
      for (const band of ['g68', 'g912']) {
        if (root) { await act(() => root.unmount()); root = null; }
        document.body.innerHTML = '<div id="root"></div>';
        await mount({ ctx: { t: wrapT, gradeBand: band, isTeacherMode: band === 'g68' },
          toolData: { _cityLab: { plan: P.setUse(P.basePlan(town), 'A1', 'park') } } });
        for (const tabId of ['design', 'table', 'assume', 'memo', 'discuss', 'history', 'class', 'about']) {
          await click($('#citylab-tab-' + tabId));
          if (tabId === 'assume') await click(buttonsContaining('Run the plan under both sets')[0]);
          if (tabId === 'design') {
            for (const b of [...document.querySelectorAll('button[aria-expanded="false"]')]) await click(b);
            await click(buttonsContaining('Keyboard shortcuts')[0]);
            await click(buttonsContaining('Height')[0]);
          }
          leaks().concat(attrLeaks()).forEach((s) => found.add(tabId + ': ' + s));
        }
      }
    }
    expect([...found]).toEqual([]);
  });
});
