// City Planning Lab stage B (2026-11-03): the new views, overlays, hearing,
// described map and sound, mounted for real through the shared smoke
// harness with a stateful toolData, so effects, XP and saves all run.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 60000, hookTimeout: 30000 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.CITYLAB_FILE || 'stem_lab/stem_tool_citylab.js';
const STORE_KEY = 'allo_citylab_plan_v1';
const act = React.act || React.unstable_act;

let root = null;
let P = null;
let errors = [];
let errSpy = null;

beforeEach(() => {
  resetStemLab();
  delete window.__alloCityLabPure;
  window.localStorage.removeItem(STORE_KEY);
  loadTool(FILE, 'cityLab');
  P = window.__alloCityLabPure;
  document.body.innerHTML = '<div id="root"></div>';
  errors = [];
  errSpy = vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ')); });
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  root = null;
  window.localStorage.removeItem(STORE_KEY);
  delete window.AudioContext;
  errSpy.mockRestore();
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
const $$ = (sel) => [...document.querySelectorAll(sel)];
const parcel = (id) => $('#citylab-parcel-' + id);
const buttonByText = (text) => $$('button').find((b) => b.textContent.trim() === text);
const buttonsContaining = (text) => $$('button').filter((b) => b.textContent.indexOf(text) !== -1);
async function click(el) { await act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); }
async function choose(select, value) {
  await act(() => { select.value = value; select.dispatchEvent(new window.Event('change', { bubbles: true })); });
}
async function type(el, value) {
  await act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
const last = (arr) => arr[arr.length - 1] || '';
const text = () => document.body.textContent;
const words = (n) => Array.from({ length: n }, (_, i) => 'reason' + i).join(' ');

// A fake Web Audio context that records what the tool asked it to play.
function installFakeAudio() {
  const made = { contexts: [], oscillators: [] };
  window.AudioContext = function () {
    const ctx = {
      currentTime: 0, destination: {}, closed: false,
      createOscillator() {
        const o = { type: '', frequency: { setValueAtTime(v) { o.freq = v; } }, connect() {}, start() {}, stop() { o.stopped = true; } };
        made.oscillators.push(o); return o;
      },
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; },
      close() { ctx.closed = true; return Promise.resolve(); }
    };
    made.contexts.push(ctx);
    return ctx;
  };
  return made;
}

describe('stage B - the Heat view', () => {
  it('shades by modelled surface heat, reads the value out per parcel, and keys it in words', async () => {
    const m = await mount();
    await click(buttonByText('Heat'));
    expect(buttonByText('Heat').getAttribute('aria-pressed')).toBe('true');
    expect(parcel('D6').getAttribute('aria-label')).toMatch(/surface heat 31\.\d degrees above shaded ground, very hot/);
    expect(parcel('D6').textContent).toContain('32');
    expect(text()).toContain('MODELLED, under Central estimates');
    expect(last(m.announced)).toMatch(/not of the air/);
    expect(errors).toEqual([]);
  });

  it('shows the heat model, with its sources and caveat, under the scorecard', async () => {
    await mount();
    await click(buttonByText('Open the surface heat model'));
    expect(text()).toContain('Reducing Urban Heat Islands');
    expect(text()).toContain('TR-55');
    expect(text()).toMatch(/not tens/);
  });
});

describe('stage B - cool roofs and bus stops from the inspector', () => {
  it('adds a cool roof that lowers heat, charges nothing, and costs a move', async () => {
    const plan = P.setUse(P.basePlan('riverbend'), 'A6', 'mixed');
    const m = await mount({ toolData: { _cityLab: { plan } } });
    await click(parcel('A6'));
    const before = P.scorecard(m.latest._cityLab.plan, 'central');
    await click(buttonByText('Add cool roofs (owner pays, not the bond)'));
    const after = P.scorecard(m.latest._cityLab.plan, 'central');
    expect(m.latest._cityLab.plan.coolRoofs.A6).toBe(true);
    expect(after.surfaceHeat.A6).toBeLessThan(before.surfaceHeat.A6);
    expect(after.tier2.capitalCost).toBe(before.tier2.capitalCost);
    expect(m.latest._cityLab.plan.editCount).toBe(plan.editCount + 1);
    expect(last(m.announced)).toMatch(/A6 cool roofs added/);
  });

  it('adds a bus stop only where a road runs in, and the scorecard measures the walk-shed', async () => {
    const m = await mount();
    await click(parcel('A1'));
    const blocked = buttonByText('A bus stop needs a road into this parcel');
    expect(blocked.disabled).toBe(true);
    await click(parcel('C6'));
    await click(buttonsContaining('Add a bus stop')[0]);
    expect(m.latest._cityLab.plan.transit.C6).toBe(true);
    expect(parcel('C6').getAttribute('aria-label')).toContain('bus stop');
    expect(parcel('C6').textContent).toContain('T');
    expect(text()).toMatch(/Homes within a 5-minute walk of a bus stop100%/);
  });

  it('edits both overlays from the parcel table too', async () => {
    const plan = P.setUse(P.basePlan('riverbend'), 'A6', 'mixed');
    const m = await mount({ toolData: { _cityLab: { plan } } });
    await click($('#citylab-tab-table'));
    await click($('button[aria-label="Add cool roofs on parcel A6"]'));
    await click($('button[aria-label="Add a bus stop at parcel C6"]'));
    expect(m.latest._cityLab.plan.coolRoofs.A6).toBe(true);
    expect(m.latest._cityLab.plan.transit.C6).toBe(true);
    expect($('button[aria-label="Add a bus stop at parcel A1"]')).toBeFalsy();
  });
});

describe('stage B - the Access gaps view', () => {
  it('counts homes without each kind of access, reads it per parcel, and records the student\'s choice', async () => {
    const m = await mount();
    await click(buttonByText('Access gaps'));
    expect(parcel('B6').getAttribute('aria-label')).toContain('homes with no park or bus stop nearby');
    expect(parcel('B6').textContent).toContain('2');
    expect(text()).toContain('Who can walk to what');
    expect(text()).toContain('Homes missing at least one: 120. Homes missing all three: 0.');
    expect(text()).not.toMatch(/equity score|access score/i);
    const sel = $$('select').find((s) => s.closest('label') && /The gap I would close first/.test(s.closest('label').textContent));
    await choose(sel, 'transit');
    const ta = $$('textarea').find((x) => x.closest('label') && /Why that one/.test(x.closest('label').textContent));
    await type(ta, 'The old town homes nearest the river.');
    expect(m.latest._cityLab.plan.equity).toEqual({ priority: 'transit', note: 'The old town homes nearest the river.' });
    expect(errors).toEqual([]);
  });

  it('carries the choice into the printable memo', async () => {
    let written = '';
    const fakeWin = { document: { open() {}, write(s) { written += s; }, close() {} } };
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => fakeWin);
    const plan = Object.assign(P.basePlan('riverbend'), { equity: { priority: 'park', note: 'Near the school.' } });
    await mount({ toolData: { _cityLab: { plan } } });
    await click($('#citylab-tab-memo'));
    await click(buttonByText('Open the memo to print'));
    openSpy.mockRestore();
    expect(written).toContain('Who can walk to what');
    expect(written).toContain('The gap I would close first: Park.');
    expect(written).toContain('Near the school.');
  });
});

describe('stage B - described map and sound', () => {
  it('describes the map row by row for the view that is showing', async () => {
    await mount();
    await click(buttonByText('Describe the map row by row'));
    let rows = $$('ol[aria-label="Riverbend, row by row, north to south"] li');
    expect(rows).toHaveLength(12);
    expect(rows[5].textContent).toContain('A road runs into A to L.');
    await click(buttonByText('Heat'));
    rows = $$('ol[aria-label="Riverbend, row by row, north to south"] li');
    expect(rows[5].textContent).toMatch(/D very hot/);
  });

  it('plays one tone per requirement after saying in words what they mean, and stops on unmount', async () => {
    const audio = installFakeAudio();
    const m = await mount();
    await click(buttonByText('Listen to the requirements'));
    const rep = P.constraintReport(P.basePlan('riverbend'), 'central');
    expect(audio.oscillators.map((o) => o.freq)).toEqual(P.sonifyRequirements(rep).map((x) => x.freq));
    expect(audio.oscillators.map((o) => o.type)).toEqual(P.sonifyRequirements(rep).map((x) => x.wave));
    expect(last(m.announced)).toMatch(/Playing 7 tones.*Not met right now: Add at least 1,200 new homes/);
    expect(text()).toMatch(/Playing 7 tones/);
    await act(() => root.unmount());
    root = null;
    expect(audio.contexts[0].closed).toBe(true);
    expect(audio.oscillators.every((o) => o.stopped)).toBe(true);
  });

  it('plays the selected row as pitch, and says so when there is no sound at all', async () => {
    const m = await mount();
    await click(buttonByText('Listen to row 6: ground height'));
    expect(last(m.announced)).toMatch(/Sound is not available/);
    const audio = installFakeAudio();
    await click(buttonByText('Heat'));
    await click(buttonByText('Listen to row 6: surface heat'));
    expect(audio.oscillators).toHaveLength(11);              // E6 is the river: a rest
    expect(last(m.announced)).toMatch(/Row 6, column A to column L/);
  });
});

describe('stage B - the hearing', () => {
  async function fillMemo() {
    await choose($$('select').find((s) => [...s.options].some((o) => o.value === 'req_cost')), 'req_cost');
    await type($$('textarea')[0], 'We kept the bond by building close to the roads we already have instead of bridging the river.');
    await click(buttonsContaining('Public infrastructure cost:')[0]);
  }

  it('is part of the memo for grades 9-12 and demands evidence that speaks to the stakeholder', async () => {
    const award = vi.fn();
    const m = await mount({ award, ctx: { gradeBand: 'g912' } });
    await click($('#citylab-tab-memo'));
    expect(text()).toContain('The hearing');
    expect(text()).toContain('The Riverbend farm cooperative');
    await fillMemo();
    await click(buttonByText('Submit the memo'));
    expect(text()).toMatch(/choose the stakeholder whose objection to your plan is strongest/);
    expect(award).not.toHaveBeenCalledWith('citylab_memo_riverbend', expect.anything(), expect.anything());

    await choose($$('select').find((s) => [...s.options].some((o) => o.value === 'rb_farm')), 'rb_farm');
    const tas = $$('textarea');
    await type(tas[1], words(10));
    await type(tas[2], words(12));
    // Cost is not a number the farm cooperative watches.
    await click(buttonsContaining('Public infrastructure cost:').find((b) => b.closest('fieldset') && /Numbers behind your answer/.test(b.closest('fieldset').textContent)));
    await click(buttonByText('Submit the memo'));
    expect(text()).toMatch(/Cite at least one number The Riverbend farm cooperative would actually look at/);

    await click(buttonsContaining('(they watch this)').find((b) => /Farmland in production/.test(b.textContent)));
    await click(buttonByText('Submit the memo'));
    expect(text()).toContain('The hearing is in it too');
    const memo = m.latest._cityLab.plan.memo;
    expect(memo.stakeholder).toBe('rb_farm');
    expect(memo.counterEvidence).toEqual(['capitalCost', 'farmHa']);
    expect(m.latest._cityLab.hearingSubmitted).toEqual({ riverbend: true });
    await click(buttonByText('Submit the memo again'));
    expect(award.mock.calls.filter((c) => c[0] === 'citylab_hearing_riverbend')).toHaveLength(1);
    expect(award.mock.calls.filter((c) => c[0] === 'citylab_memo_riverbend')).toHaveLength(1);
  });

  it('is optional below 9-12, and a teacher setting fixes it either way', async () => {
    await mount({ ctx: { gradeBand: 'g68' } });
    await click($('#citylab-tab-memo'));
    expect(text()).not.toContain('Whose objection is strongest');
    await click(buttonByText('Add the hearing: answer a stakeholder'));
    expect(text()).toContain('Whose objection is strongest');
    await act(() => root.unmount());
    document.body.innerHTML = '<div id="root"></div>';
    await mount({ ctx: { gradeBand: 'g912' }, toolData: { _cityLab: { teacher: { hearing: 'off' } } } });
    await click($('#citylab-tab-memo'));
    expect(text()).not.toContain('Whose objection is strongest');
    expect(buttonByText('Add the hearing: answer a stakeholder')).toBeFalsy();
  });
});

describe('stage B - the heat mission', () => {
  it('becomes the fifth mission, checked by the model, with a named misconception', async () => {
    const done = { done: true, checks: 1 };
    const homes = [];
    ['A', 'B', 'C'].forEach((c) => [9, 10, 11, 12].forEach((r) => homes.push(c + r)));
    let plan = homes.reduce((a, id) => P.setUse(a, id, 'mixed'), P.basePlan('riverbend'));
    const pairs = [['C8', 'C9'], ['C9', 'C10'], ['C10', 'C11'], ['C11', 'C12']];
    [9, 10, 11, 12].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r]));
    plan = pairs.reduce((a, e) => P.setEdge(a, e[0], e[1], 'local'), plan);
    const m = await mount({ ctx: { gradeBand: 'g68' }, toolData: { _cityLab: { plan,
      missions: { riverbend: { m_park: done, m_bond: done, m_runoff: done, m_town: done } } } } });
    expect(text()).toContain('5. Keep the new streets cool (Now)');
    await click(buttonByText('Check my plan'));
    expect(text()).toContain('Dark roofs soak up the sun');
    expect(m.latest._cityLab.misTally.heat_dark_roofs).toBe(1);
    expect(errors).toEqual([]);
  });
});

describe('stage B - mounts cleanly everywhere', () => {
  it('opens every map view and every tab in every town, in both substrates, with no console error', async () => {
    for (const theme of ['light', 'contrast']) {
      for (const town of ['riverbend', 'mesahollow', 'harborlight']) {
        if (root) { await act(() => root.unmount()); root = null; }
        document.body.innerHTML = '<div id="root"></div>';
        await mount({ ctx: { theme, gradeBand: 'g912', isTeacherMode: true }, toolData: { _cityLab: { plan: P.basePlan(town) } } });
        for (const view of ['Land use', 'Height', '3D', 'Heat', 'Access gaps']) await click(buttonByText(view));
        for (const tabId of ['design', 'table', 'assume', 'memo', 'discuss', 'history', 'class', 'about']) {
          await click($('#citylab-tab-' + tabId));
          expect($('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe('citylab-tab-' + tabId);
        }
      }
    }
    expect(errors).toEqual([]);
  });
});

describe('stage B - every new string goes through the translator', () => {
  const wrapT = (k, fb) => '«' + fb + '»';
  const leaks = () => {
    const out = [];
    const walker = document.createTreeWalker(document.getElementById('root'), window.NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const s = n.nodeValue.trim();
      if (!s || s.indexOf('«') !== -1 || s.indexOf('»') !== -1) continue;
      if (/^(Riverbend|Mesa Hollow|Harborlight)$/.test(s)) continue;
      if (/[a-z]{4,}/.test(s)) out.push(s.slice(0, 80));
    }
    return out.concat($$('#root [aria-label]').map((el) => el.getAttribute('aria-label'))
      .filter((s) => /[a-z]{4,}/.test(s) && s.indexOf('«') === -1));
  };

  it('leaves no untranslated prose in the new views, panels and the hearing, in any town', async () => {
    window.AudioContext = undefined;
    const found = new Set();
    for (const town of ['riverbend', 'mesahollow', 'harborlight']) {
      if (root) { await act(() => root.unmount()); root = null; }
      document.body.innerHTML = '<div id="root"></div>';
      let plan = P.setUse(P.basePlan(town), 'A1', 'park');
      plan = Object.assign(plan, { transit: { [P.scenarioOf(town).coreParcel]: true } });
      await mount({ ctx: { t: wrapT, gradeBand: 'g912', isTeacherMode: true }, toolData: { _cityLab: { plan } } });
      for (const view of ['Heat', 'Access gaps']) {
        await click(buttonsContaining(view)[0]);
        await click(buttonsContaining('Describe the map row by row')[0] || buttonsContaining('Hide the row-by-row description')[0]);
        await click(buttonsContaining('Listen to row')[0]);
        leaks().forEach((s) => found.add(town + ' ' + view + ': ' + s));
      }
      for (const b of $$('button[aria-expanded="false"]')) await click(b);
      await click(buttonsContaining('Listen to the requirements')[0]);
      leaks().forEach((s) => found.add(town + ' design: ' + s));
      await click($('#citylab-tab-memo'));
      await click(buttonsContaining('Submit the memo')[0]);
      leaks().forEach((s) => found.add(town + ' memo: ' + s));
      await click($('#citylab-tab-discuss'));
      leaks().forEach((s) => found.add(town + ' discuss: ' + s));
      await click($('#citylab-tab-about'));
      leaks().forEach((s) => found.add(town + ' about: ' + s));
    }
    expect([...found]).toEqual([]);
    expect(errors).toEqual([]);
  });
});
