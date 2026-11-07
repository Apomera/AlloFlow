// City Planning Lab stage C (2026-11-03): the Start here path, the tab
// groups, the hearing's reveal-on-demand, the Assumption Lab prediction,
// the drawn overlays in the 3D panel, the class view's new panel and the
// re-checked sources, mounted for real with a stateful toolData.
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

function load(stubViewer) {
  resetStemLab();
  delete window.__alloCityLabPure;
  if (stubViewer) window.StemLab.makeOrbitViewer = stubViewer;
  loadTool(FILE, 'cityLab');
  P = window.__alloCityLabPure;
}

beforeEach(() => {
  load(null);
  window.localStorage.removeItem(STORE_KEY);
  document.body.innerHTML = '<div id="root"></div>';
  errors = [];
  errSpy = vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ')); });
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  root = null;
  window.localStorage.removeItem(STORE_KEY);
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
async function remount(opts) {
  if (root) await act(() => root.unmount());
  root = null;
  document.body.innerHTML = '<div id="root"></div>';
  return mount(opts);
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const buttonByText = (text) => $$('button').find((b) => b.textContent.trim() === text);
const buttonsContaining = (text) => $$('button').filter((b) => b.textContent.indexOf(text) !== -1);
const pathButtons = () => $$('nav[aria-labelledby="citylab-path-title"] ol button');
const pathTexts = () => pathButtons().map((b) => b.textContent.replace(/^[✔○]/, '').trim());
// W6: Start here starts folded to its chip whenever a strip shows (every level); open it.
async function openPath() { if (!pathButtons().length) await click(buttonByText('Show the steps')); }
async function click(el) { await act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); }
async function press(el, key) {
  await act(() => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });
}
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
const text = () => document.body.textContent;
const last = (arr) => arr[arr.length - 1] || '';
const words = (n) => Array.from({ length: n }, (_, i) => 'reason' + i).join(' ');

describe('stage C - Start here, grades 6-8', () => {
  it('lists the worked example then the five missions, and opens each where it happens', async () => {
    // W3: the first-run coach folds the path to a chip; this test is about the path itself.
    const m = await mount({ ctx: { gradeBand: 'g68' }, toolData: { _cityLab: { coachOff: true } } });
    expect(text()).toContain('Start here: 0 of 6 done in Riverbend');
    await openPath();
    const steps = pathTexts();
    expect(steps).toHaveLength(6);
    expect(steps[0]).toBe('1. Study the worked example from Mesa Hollow: next');
    expect(steps[1]).toBe('2. Mission: Fix park access: not yet');
    expect(steps[2]).toBe('3. Mission: Meet the bond: not yet');
    expect(steps[4]).toBe('5. Mission: Keep the farms and the wetland: not yet');
    expect(steps[5]).toBe('6. Mission: Keep the new streets cool: not yet');
    expect(pathButtons()[0].getAttribute('aria-current')).toBe('step');
    // Opening the example moves focus to it and ticks it.
    await click($('#citylab-tab-memo'));
    await click(pathButtons()[0]);
    expect($('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe('citylab-tab-design');
    expect(document.activeElement.id).toBe('citylab-worked-example');
    expect(m.latest._cityLab.exampleRead).toEqual({ riverbend: true });
    expect(pathTexts()[0]).toBe('1. Study the worked example from Mesa Hollow: done');
    expect(pathTexts()[1]).toBe('2. Mission: Fix park access: next');
    expect(errors).toEqual([]);
  });

  it('ticks a mission when the model confirms it, and writes the flat flag the autosave keeps', async () => {
    let plan = P.basePlan('riverbend');
    P.parkExample('riverbend').steps.forEach((s) => {
      plan = P.setUse(plan, s.id, 'park');
      if (s.via) plan = P.setEdge(plan, s.id, s.via, 'path');
    });
    const m = await mount({ ctx: { gradeBand: 'g68' }, toolData: { _cityLab: { plan } } });
    await click(buttonByText('Check my plan'));
    expect(m.latest._cityLab.missionsDone).toEqual({ 'riverbend:m_park': true });
    expect(text()).toContain('Start here: 2 of 6 done in Riverbend');
    // A reload that kept ONLY the autosaved progress still knows the mission is done.
    await remount({ ctx: { gradeBand: 'g68' }, toolData: { _cityLab: { missionsDone: { 'riverbend:m_park': true } } } });
    expect(text()).toContain('2. Meet the bond (Now)');
    expect(text()).toContain('Start here: 2 of 6 done in Riverbend');
  });

  it('remembers a mission reveal in a flag, so a reload cannot turn it back into XP', async () => {
    const m = await mount({ ctx: { gradeBand: 'g68' } });
    await click(buttonByText('Check my plan'));
    await click(buttonByText('Check my plan'));
    await click(buttonByText('Show one way to do it'));
    expect(m.latest._cityLab.missionsRevealed).toEqual({ 'riverbend:m_park': true });
    expect(last(m.announced)).toMatch(/earns no XP now/);
    let plan = P.basePlan('riverbend');
    P.parkExample('riverbend').steps.forEach((s) => {
      plan = P.setUse(plan, s.id, 'park');
      if (s.via) plan = P.setEdge(plan, s.id, s.via, 'path');
    });
    const award = vi.fn();
    await remount({ award, ctx: { gradeBand: 'g68' }, toolData: { _cityLab: { plan, missionsRevealed: { 'riverbend:m_park': true } } } });
    await click(buttonByText('Check my plan'));
    expect(text()).toContain('Mission complete: Fix park access');
    expect(award).not.toHaveBeenCalled();
  });
});

describe('stage C - Start here, grades 9-12', () => {
  it('runs brief, Assumption Lab, memo, hearing, access gaps, each one click away', async () => {
    const m = await mount({ ctx: { gradeBand: 'g912' }, toolData: { _cityLab: { coachOff: true } } });
    await openPath();
    expect(pathTexts()).toEqual([
      '1. Meet every required part of the brief, then press Check my plan: next',
      '2. Test the plan under two assumption sets in the Assumption Lab: not yet',
      '3. Write and submit the memo: not yet',
      '4. Answer a stakeholder at the hearing: not yet',
      '5. Open Access gaps and choose the gap you would close first: not yet'
    ]);
    await click(pathButtons()[1]);
    expect($('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe('citylab-tab-assume');
    expect(document.activeElement.id).toBe('citylab-tab-assume');
    await click(buttonByText('Run the plan under both sets'));
    expect(pathTexts()[1]).toMatch(/: done$/);
    await click(pathButtons()[4]);
    expect(buttonByText('Access gaps').getAttribute('aria-pressed')).toBe('true');
    const sel = $$('select').find((s) => s.closest('label') && /The gap I would close first/.test(s.closest('label').textContent));
    await choose(sel, 'park');
    expect(pathTexts()[4]).toMatch(/: done$/);
    expect(m.latest._cityLab.plan.equity.priority).toBe('park');
  });

  it('turns the hearing on from the path for a learner who had left it out', async () => {
    const m = await mount({ ctx: { gradeBand: 'g912' }, toolData: { _cityLab: { hearing: false, coachOff: true } } });
    await openPath();
    expect(text()).not.toContain('Whose objection is strongest');
    await click(pathButtons()[3]);
    expect(m.latest._cityLab.hearing).toBe(true);
    expect(text()).toContain('Whose objection is strongest');
  });

  it('can be hidden by the learner, and switched off by a teacher', async () => {
    await mount({ ctx: { gradeBand: 'g912' }, toolData: { _cityLab: { coachOff: true } } });
    await openPath();
    await click(buttonByText('Hide the steps'));
    expect(pathButtons()).toHaveLength(0);
    expect(text()).toContain('Start here: 0 of 5 done');
    const m = await remount({ ctx: { gradeBand: 'g912', isTeacherMode: true } });
    await click(buttonByText('Show the Start here path'));
    expect(m.latest._cityLab.teacher.pathOff).toBe(true);
    expect($('nav[aria-labelledby="citylab-path-title"]')).toBeFalsy();
    expect(buttonByText('Show the Start here path').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('stage C - tabs grouped so the core comes first', () => {
  it('orders build, test and argue, background, then the teacher view, with captions hidden from AT', async () => {
    await mount();
    expect($$('[role="tab"]').map((b) => b.id.replace('citylab-tab-', '')))
      .toEqual(['design', 'table', 'assume', 'memo', 'discuss', 'history', 'about', 'class']);
    const captions = $$('[role="tablist"] > span');
    expect(captions.map((c) => c.textContent)).toEqual(['Build', 'Test and argue', 'Background', 'For teachers']);
    captions.forEach((c) => expect(c.getAttribute('aria-hidden')).toBe('true'));
    const about = $('#citylab-tab-about');
    about.focus();
    await press(about, 'ArrowRight');
    expect(document.activeElement.id).toBe('citylab-tab-class');
    expect(errors).toEqual([]);
  });
});

describe('stage C - the hearing follows the mission rule', () => {
  async function memoReady() {
    await choose($$('select').find((s) => [...s.options].some((o) => o.value === 'req_cost')), 'req_cost');
    await type($$('textarea')[0], 'We kept the bond by building close to the roads we already have instead of bridging the river.');
    await click(buttonsContaining('Public infrastructure cost:')[0]);
  }
  const theirChip = () => buttonsContaining('(they watch this)').find((b) => /Farmland in production/.test(b.textContent));
  const evidenceChip = (label) => buttonsContaining(label).find((b) => b.closest('fieldset') && /Numbers behind your answer/.test(b.closest('fieldset').textContent));

  it('names the misconception, offers "Show one way" only after two tries, and pays no hearing XP after it', async () => {
    const award = vi.fn();
    const m = await mount({ award, ctx: { gradeBand: 'g912' } });
    await click($('#citylab-tab-memo'));
    await memoReady();
    await choose($$('select').find((s) => [...s.options].some((o) => o.value === 'rb_farm')), 'rb_farm');
    await type($$('textarea')[1], words(10));
    await type($$('textarea')[2], words(12));
    await click(buttonByText('Submit the memo'));
    expect(text()).toContain('Not ready to submit yet. Here is what is still missing:');
    expect(text()).toContain('A claim with nothing under it.');
    expect(buttonByText('Show one way to answer')).toBeFalsy();
    await click(evidenceChip('Public infrastructure cost:'));
    await click(buttonByText('Submit the memo'));
    expect(text()).toContain('Talking past them.');
    expect(m.latest._cityLab.hearingChecks).toEqual({ riverbend: 2 });
    expect(m.latest._cityLab.misTally).toMatchObject({ hearing_no_evidence: 1, hearing_talking_past: 1 });
    await click(buttonByText('Show one way to answer'));
    expect(m.latest._cityLab.hearingRevealed).toEqual({ riverbend: true });
    // The method is shown on ANOTHER town's stakeholder.
    expect(text()).toContain('One way to answer, shown on Mesa Hollow');
    expect(buttonByText('Show one way to answer')).toBeFalsy();
    await click(theirChip());
    await click(buttonByText('Submit the memo'));
    expect(m.latest._cityLab.hearingSubmitted).toEqual({ riverbend: true });
    expect(text()).toContain('earns no XP after "Show one way"');
    expect(award.mock.calls.filter((c) => c[0] === 'citylab_hearing_riverbend')).toHaveLength(0);
    expect(award.mock.calls.filter((c) => c[0] === 'citylab_memo_riverbend')).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it('offers no reveal when the teacher has turned reveals off', async () => {
    await mount({ ctx: { gradeBand: 'g912' }, toolData: { _cityLab: { hearingChecks: { riverbend: 5 }, teacher: { allowReveal: false } } } });
    await click($('#citylab-tab-memo'));
    expect(buttonByText('Show one way to answer')).toBeFalsy();
  });
});

describe('stage C - the Assumption Lab asks before it shows', () => {
  it('records an optional prediction, compares it with what flipped, and locks it while showing', async () => {
    const plan = P.setUse(P.basePlan('riverbend'), 'A9', 'housing_mid');
    const m = await mount({ toolData: { _cityLab: { plan } } });
    await click($('#citylab-tab-assume'));
    const sel = $$('select').find((s) => s.closest('label') && /Before you run it/.test(s.closest('label').textContent));
    await choose(sel, 'none');
    await click(buttonByText('Run the plan under both sets'));
    const cmp = P.compareAssumptions(m.latest._cityLab.plan, 'conservative', 'optimistic');
    if (cmp.flipped.length) expect(text()).toMatch(/You expected every verdict to hold\. These changed:/);
    else expect(text()).toContain('You expected every verdict to hold, and they all did.');
    expect(last(m.announced)).toMatch(/^You expected every verdict to hold/);
    expect(sel.disabled).toBe(true);
    // Nothing is scored, so nothing about the prediction reaches XP.
    expect(m.award.mock.calls.every((c) => c[0] === 'citylab_lab_riverbend')).toBe(true);
  });
});

describe('stage C - the 3D panel says what it draws', () => {
  it('names cool roofs, bus stops and green infrastructure, with this plan\'s counts', async () => {
    const pushes = [];
    load(function () {
      return { attach() {}, status() { return 'ready'; }, onStatusChange() {}, push(p) { pushes.push(p); } };
    });
    let plan = P.setUse(P.basePlan('riverbend'), 'A6', 'mixed');
    plan = P.toggleCoolRoof(plan, 'A6');
    plan = P.toggleTransit(plan, 'C6');
    await mount({ toolData: { _cityLab: { plan } } });
    await click(buttonByText('3D'));
    const note = $('[data-citylab-3d-overlays]');
    expect(note.textContent).toContain('Cool roofs are drawn as white caps');
    expect(note.textContent).toContain('cool-roof parcels 1, bus stops 1, green-infrastructure parcels 0');
    expect($('[role="img"]').getAttribute('aria-label')).toContain('bus stops 1');
    const lastPush = pushes[pushes.length - 1];
    expect(lastPush.massing.overlays).toEqual({ coolRoofs: 1, busStops: 1, greenInfra: 0 });
    expect(errors).toEqual([]);
  });
});

describe('stage C - the class view adds heat, transit and the hearing', () => {
  it('reads loaded plans into the new panel and table, measured facts only', async () => {
    await mount({ ctx: { isTeacherMode: true } });
    await click($('#citylab-tab-class'));
    let plan = P.setUse(P.basePlan('riverbend'), 'A6', 'mixed');
    plan = P.toggleCoolRoof(plan, 'A6');
    plan = P.toggleTransit(plan, 'C6');
    const files = ['ana', 'ben', 'cy'].map((n, i) => new window.File([JSON.stringify(i ? P.basePlan('riverbend') : plan)], n + '.json', { type: 'application/json' }));
    const input = $('input[type="file"]');
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    await act(async () => {
      input.dispatchEvent(new window.Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(text()).toContain('Plans loaded: 3.');
    expect(text()).toContain('Heat, bus stops and the hearing');
    expect(text()).toContain('Surface heat itself is modelled, so it is not added up here.');
    const rows = $$('table').find((tb) => /Plan by plan/.test(tb.textContent)).querySelectorAll('tbody tr');
    expect([...rows].map((r) => [...r.children].map((c) => c.textContent))).toEqual([
      ['ana', '1', '0', '1 of 1', '1', expect.stringMatching(/%$/), 'No'],
      ['ben', '0', '0', '0 of 0', '0', '0%', 'No'],
      ['cy', '0', '0', '0 of 0', '0', '0%', 'No']
    ]);
    expect(errors).toEqual([]);
  });
});

describe('stage C - sources, re-checked', () => {
  it('cites TR-55 Table 2-2a by page, and the FTA notice for the walk to a stop', async () => {
    await mount();
    await click($('#citylab-tab-about'));
    expect(text()).toContain('Table 2-2a, page 2-5');
    expect(text()).toContain('1/4-acre lots 38%');
    expect(text()).toContain('76 FR 52046, 19 August 2011');
    expect(text()).toContain('"the anecdotal rule of thumb"');
    expect(text()).not.toContain('uses half a mile for stations people will walk further to reach');
  });
});

describe('stage C - every new string goes through the translator', () => {
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

  it('leaves no untranslated prose in the path, tab captions, hearing reveal or lab prediction', async () => {
    const found = new Set();
    for (const band of ['g68', 'g912']) {
      await remount({ ctx: { t: wrapT, gradeBand: band, isTeacherMode: true },
        toolData: { _cityLab: { hearingChecks: { riverbend: 2 }, hearingRevealed: band === 'g912' ? { riverbend: true } : undefined } } });
      leaks().forEach((s) => found.add(band + ' design: ' + s));
      // W3: the coach is running, so the path is a chip: open it (the coach's own text is checked above).
      if (!pathButtons().length) await click(buttonsContaining('Show the steps')[0]);
      await click(pathButtons()[0]);
      leaks().forEach((s) => found.add(band + ' path: ' + s));
      await click($('#citylab-tab-assume'));
      await choose($$('select').find((s) => [...s.options].some((o) => o.value === 'none')), 'none');
      await click(buttonsContaining('Run the plan under both sets')[0]);
      leaks().forEach((s) => found.add(band + ' assume: ' + s));
      await click($('#citylab-tab-memo'));
      await click(buttonsContaining('Submit the memo')[0]);
      leaks().forEach((s) => found.add(band + ' memo: ' + s));
      await click($('#citylab-tab-class'));
      leaks().forEach((s) => found.add(band + ' class: ' + s));
    }
    expect([...found]).toEqual([]);
    expect(errors).toEqual([]);
  });
});
