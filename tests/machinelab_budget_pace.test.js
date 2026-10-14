import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const BENCHES = [
  { id: 'lever', load: 'leverLoad', settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 } },
  { id: 'pulley', load: 'pulleyLoad', settings: { pulleySegments: 2, pulleyLoad: 400 } },
  { id: 'ramp', load: 'rampLoad', settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 } },
  { id: 'wedge', load: 'wedgeLoad', settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 } },
  { id: 'windlass', load: 'windlassLoad', settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 } },
  { id: 'screw', load: 'screwLoad', settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 } }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function session(b = BENCHES[0], extra = {}) {
  const store = newStore({ otherTool: { note: 'Keep other work' }, machineLab: { view: 'machines', bench: b.id, bandOverride: 'g68', ...BASE, ...extra } });
  const awardXP = vi.fn(), tryAward = vi.fn(); let renderedState, tree;
  const render = () => { if (renderedState !== store.toolData.machineLab) { renderedState = store.toolData.machineLab; tree = tool.render(makeCtx({ awardXP, tryAward }, store)); } return tree; };
  const find = predicate => nodes(render()).find(predicate);
  const id = suffix => find(n => n.props?.id === `ml-power-${suffix}-${store.toolData.machineLab.bench}`);
  const practice = () => find(n => n.props?.['data-ml-power-budget-practice'] === store.toolData.machineLab.bench);
  const action = kind => nodes(practice()).find(n => n.type === 'button' && n.props?.['data-ml-power-budget-practice-action'] === kind);
  const choice = kind => nodes(practice()).find(n => n.props?.['data-ml-power-budget-practice-choice'] === kind);
  const invoke = n => { expect(n).toBeTruthy(); n.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }); };
  const choose = kind => { const n = choice(kind); expect(n).toBeTruthy(); n.props.onChange({ target: { value: kind, checked: true } }); };
  const edit = (suffix, value) => { const n = id(suffix); expect(n, `Missing ${suffix}`).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); };
  return { power: () => find(n => n.props?.['data-ml-power'] === store.toolData.machineLab.bench), render, find, id, practice, action, choice, invoke, choose, edit, awardXP, tryAward,
    state: () => store.toolData.machineLab, allState: () => store.toolData,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    number: value => edit('budget-practice-answer', value), click: kind => invoke(action(kind)),
    result: () => nodes(practice()).find(n => n.props?.['data-ml-power-budget-practice-result'])?.props['data-ml-power-budget-practice-result'],
    mainClick: kind => invoke(find(n => n.type === 'button' && n.props?.[`data-ml-power-${kind}`] !== undefined)) };
}
// Independent SI relationship: input power = load × movement / efficiency / time.
// Expected utilization never reads the implementation's helper or rendered target.
function expected(b, { settings = BASE, percent = 80, seconds = 5, budget = 100 } = {}) {
  const required = settings[b.load] * settings.loadDistance / (percent / 100) / seconds;
  const ratio = required / budget;
  return { required, budget, utilization: ratio * 100, choice: ratio < 1 - 1e-9 ? 'below' : ratio > 1 + 1e-9 ? 'over' : 'at' };
}
function close(actual, wanted) { expect(Number.isFinite(actual)).toBe(true); expect(Math.abs(actual - wanted)).toBeLessThanOrEqual(Math.max(1e-12, Math.abs(wanted) * 1e-11)); }
function hidden(s) {
  for (const attr of ['data-ml-power-budget-utilization', 'data-ml-power-budget-utilization-bar', 'data-ml-power-budget-utilization-equation']) {
    expect(nodes(s.practice()).filter(n => n.props?.[attr] !== undefined)).toHaveLength(0);
  }
}
function worked(s, q) {
  const all = nodes(s.practice()), card = all.find(n => n.props?.['data-ml-power-budget-utilization'] !== undefined);
  expect(card).toBeTruthy(); close(Number(card.props['data-value']), q.utilization);
  expect(all.filter(n => n.props?.['data-ml-power-budget-utilization-equation'] !== undefined)).toHaveLength(1);
  const bars = all.filter(n => n.props?.['data-ml-power-budget-utilization-bar'] !== undefined);
  expect(bars.map(n => n.props['data-ml-power-budget-utilization-bar']).sort()).toEqual(['budget', 'required']);
  for (const bar of bars) close(parseFloat(bar.props.style.width), (bar.props['data-ml-power-budget-utilization-bar'] === 'budget' ? 100 : q.utilization) / Math.max(100, q.utilization) * 100);
  expect(text(s.practice())).not.toMatch(/NaN|Infinity|undefined/); expect(text(card)).toContain('%');
}
function solve(s, q) { s.number(q.utilization); s.choose(q.choice); s.click('check'); expect(s.result()).toBe('correct'); worked(s, q); }
function onlyPracticeChanged(before, after) {
  const { benchPowerBudgetPractice: a, ...oldState } = before.machineLab, { benchPowerBudgetPractice: b, ...newState } = after.machineLab;
  expect(newState).toEqual(oldState); expect(after.otherTool).toBe(before.otherTool);
}

function pace(s) { return s.find(n => n.props?.['data-ml-power-budget-pace'] === s.state().bench); }
function cta(s) { return nodes(pace(s)).find(n => n.props?.['data-ml-power-budget-pace-practice'] !== undefined); }
// Time at budget follows energy / power, independently of the production model.
function expectedPace(b, options = {}) {
  const settings = options.settings || BASE, seconds = options.seconds ?? 5, percent = options.percent ?? 80, budget = options.budget ?? 100;
  const energy = settings[b.load] * settings.loadDistance / (percent / 100);
  return { ...expected(b, options), current: seconds, atBudget: energy / budget, factor: (energy / seconds) / budget };
}
function checkPace(s, q) {
  const section = pace(s); expect(section?.type).toBe('section'); const all = nodes(section);
  const metrics = all.filter(n => n.props?.['data-ml-power-budget-pace-metric'] !== undefined);
  expect(metrics.map(n => n.props['data-ml-power-budget-pace-metric']).sort()).toEqual(['budget', 'current']);
  for (const n of metrics) close(Number(n.props['data-value']), n.props['data-ml-power-budget-pace-metric'] === 'current' ? q.current : q.atBudget);
  close(Number(all.find(n => n.props?.['data-ml-power-budget-pace-factor'] !== undefined).props['data-value']), q.factor);
  expect(all.filter(n => n.props?.['data-ml-power-budget-pace-equation'] !== undefined)).toHaveLength(1);
  const bars = all.filter(n => n.props?.['data-ml-power-budget-pace-bar'] !== undefined);
  expect(bars.map(n => n.props['data-ml-power-budget-pace-bar']).sort()).toEqual(['budget', 'current']);
  for (const n of bars) { const wanted = n.props['data-ml-power-budget-pace-bar'] === 'current' ? q.current : q.atBudget;
    close(Number(n.props['data-value']), wanted); close(parseFloat(n.props.style.width), wanted / Math.max(q.current, q.atBudget) * 100); }
  expect(text(section)).not.toMatch(/NaN|Infinity|undefined/); expect(cta(s)?.props.type).toBe('button');
}
function mount(s) {
  const host = document.createElement('div'); host.innerHTML = ReactDOMServer.renderToStaticMarkup(s.power()); document.body.append(host);
  const root = host.querySelector('[data-ml-power]'); root.open = true; const guide = root.querySelector('[data-ml-power-planning]'); guide.open = true;
  const button = root.querySelector('[data-ml-power-budget-pace-practice]'), answer = root.querySelector('#ml-power-answer-' + s.state().bench);
  answer.scrollIntoView = vi.fn(); const focus = vi.spyOn(answer, 'focus');
  const frames = []; vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  const flush = (commit = true) => {
    // Model the keyed React commit without replacing the answer input; actual
    // browser checks verify that React itself preserves the node across renders.
    const current = s.power();
    if (commit && current && frames.length && current.props['data-ml-power'] === root.getAttribute('data-ml-power')) {
      root.setAttribute('data-ml-power-navigation-signature', current.props['data-ml-power-navigation-signature']);
      root.querySelector('#ml-power-question-' + s.state().bench).value = s.id('question').props.value;
    }
    while (frames.length) frames.shift()(0);
  };
  return { host, root, guide, button, answer, focus, flush,
    run: (node = cta(s), origin = button) => { node.props.onClick({ currentTarget: origin }); flush(); } };
}

describe('Machine Lab: budget pace arithmetic', () => {
  it.each(BENCHES)('relates independent $id times and ratios at below, at and over budget', b => {
    const s = session(b);
    for (const factor of [2, 1, 0.5]) { const budget = expected(b).required * factor; s.edit('budget', budget); const before = s.allState();
      const q = expectedPace(b, { budget }); solve(s, q); checkPace(s, q); onlyPracticeChanged(before, s.allState()); }
  });
  it('converts minutes once and uses full precision for nondefault efficiency and movement', () => {
    const settings = { ...BASE, windlassLoad: 333, loadDistance: 0.7 }, s = session(BENCHES[4], settings);
    s.edit('duration', 2); s.edit('timeUnit', 'min'); s.edit('percent', 37.5); s.edit('budget', 12.3);
    const q = expectedPace(BENCHES[4], { settings, seconds: 120, percent: 37.5, budget: 12.3 }); solve(s, q); checkPace(s, q);
    expect(s.id('duration').props.value).toBe('2'); expect(s.id('timeUnit').props.value).toBe('min');
  });
  it('keeps calculated time outside the simulation-input range without clamping', () => {
    for (const [b, settings, percent, budget] of [
      [BENCHES[0], { ...BASE, leverLoad: 10, loadDistance: 0.1 }, 100, 100000],
      [BENCHES[5], { ...BASE, screwLoad: 5000, loadDistance: 3 }, 1, 0.01]
    ]) { const s = session(b, settings); s.edit('percent', percent); s.edit('budget', budget); s.click('reveal');
      const q = expectedPace(b, { settings, percent, budget }); expect(q.atBudget < 0.01 || q.atBudget > 3600).toBe(true); checkPace(s, q); }
  });
  it('keeps near-tie times visibly distinct instead of rounding them to the same value', () => {
    const s = session();
    for (const budget of [50 / (1 - 1e-8), 50 / (1 + 1e-8), 50.00004]) {
      s.edit('budget', budget); const q = expectedPace(BENCHES[0], { budget }); solve(s, q); checkPace(s, q);
      const metrics = nodes(pace(s)).filter(n => n.props?.['data-ml-power-budget-pace-metric'] !== undefined);
      const current = metrics.find(n => n.props['data-ml-power-budget-pace-metric'] === 'current');
      const atBudget = metrics.find(n => n.props['data-ml-power-budget-pace-metric'] === 'budget');
      expect(text(current)).toContain('5'); expect(text(atBudget)).toContain(String(q.atBudget)); expect(text(current)).not.toBe(text(atBudget));
    }
  });
});

describe('Machine Lab: budget pace disclosure', () => {
  it('keeps time metrics and practice navigation hidden until both utilization answers are correct', () => {
    const s = session(); expect(pace(s)).toBeUndefined(); s.number(50); s.choose('over'); s.click('check'); expect(pace(s)).toBeUndefined();
    s.number(80); s.choose('below'); s.click('check'); expect(pace(s)).toBeUndefined();
    s.number(50); s.click('check'); checkPace(s, expectedPace(BENCHES[0])); s.click('retry'); expect(pace(s)).toBeUndefined();
  });
  it('retains viewed time relationships after edits but clears them when practice or assumptions reset', () => {
    const s = session(); s.click('reveal'); checkPace(s, expectedPace(BENCHES[0])); s.number(999); s.choose('over');
    expect(s.result()).toBe('solution'); checkPace(s, expectedPace(BENCHES[0])); s.edit('budget', 200); expect(pace(s)).toBeUndefined();
  });
});

describe('Machine Lab: budget pace navigation', () => {
  it('opens time practice with a fresh ordinary draft and focuses the existing answer input', () => {
    const s = session(); s.edit('answer', 50); s.edit('unit', 'W'); s.mainClick('hint'); s.mainClick('check');
    s.click('reveal'); const before = s.state(), dom = mount(s); dom.run();
    expect(s.id('question').props.value).toBe('budgetTime'); expect(s.id('answer').props.value).toBe(''); expect(s.id('unit').props.value).toBe('');
    const draft = s.state().benchPower.lever; expect(draft.hint).toBe(0); expect(draft.checked).toBe(false); expect(draft.revealed).toBe(false);
    expect(draft.signature).not.toBe(before.benchPower.lever.signature); expect(document.activeElement).toBe(dom.answer);
    expect(dom.focus).toHaveBeenCalledWith({ preventScroll: true }); expect(dom.answer.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
    expect(dom.guide.open).toBe(true); expect(s.id('duration').props.value).toBe('5');
  });
  it('leaves the entire state unchanged when budget-time practice is already active', () => {
    const s = session(); s.edit('question', 'budgetTime'); s.edit('answer', 2.5); s.edit('unit', 's'); s.mainClick('hint'); s.mainClick('check'); s.click('reveal');
    const before = s.allState(), dom = mount(s); dom.run(); expect(s.allState()).toBe(before); expect(document.activeElement).toBe(dom.answer);
    expect(s.id('answer').props.value).toBe('2.5'); expect(s.id('unit').props.value).toBe('s'); expect(s.state().benchPower.lever.checked).toBe(true);
  });
  it('allows navigation from an independently checked result and permits solving the existing time skill', () => {
    const s = session(); solve(s, expected(BENCHES[0])); const dom = mount(s); dom.run();
    s.edit('answer', 2.5); s.edit('unit', 's'); s.mainClick('check');
    expect(s.find(n => n.props?.['data-ml-power-result'] === 'correct')).toBeTruthy();
  });
  it('rejects closed, mismatched, stale, disabled or disconnected DOM origins', () => {
    const s = session(); s.click('reveal'); const dom = mount(s), signature = dom.root.getAttribute('data-ml-power-navigation-signature');
    const operations = [
      [() => { dom.root.open = false; }, () => { dom.root.open = true; }],
      [() => dom.root.setAttribute('data-ml-power', 'screw'), () => dom.root.setAttribute('data-ml-power', 'lever')],
      [() => dom.root.setAttribute('data-ml-power-navigation-signature', 'stale'), () => dom.root.setAttribute('data-ml-power-navigation-signature', signature)],
      [() => { dom.button.disabled = true; }, () => { dom.button.disabled = false; }],
      [() => dom.host.remove(), () => document.body.append(dom.host)],
      [() => dom.button.remove(), () => dom.guide.append(dom.button)]
    ];
    const before = s.allState();
    for (const [disable, restore] of operations) { disable(); dom.run(); expect(s.allState()).toBe(before); expect(dom.focus).not.toHaveBeenCalled(); restore(); }
  });
  it('requires an answer target connected inside the owning lab before mutating state', () => {
    const s = session(); s.click('reveal'); const dom = mount(s), before = s.allState();
    dom.answer.remove(); dom.run(); expect(s.allState()).toBe(before); expect(dom.focus).not.toHaveBeenCalled();
    document.body.append(dom.answer); dom.run(); expect(s.allState()).toBe(before); expect(dom.focus).not.toHaveBeenCalled();
  });
  it('rejects a previously visible call to action after retry removes the result', () => {
    const s = session(); s.click('reveal'); const old = cta(s), dom = mount(s); s.click('retry'); const before = s.allState();
    dom.run(old); expect(s.allState()).toBe(before); expect(dom.focus).not.toHaveBeenCalled(); expect(pace(s)).toBeUndefined();
  });
  it('rejects stale callbacks after source assumptions, question, bench or view change', () => {
    for (const change of [s => s.patch({ leverLoad: 500 }), s => s.edit('duration', 10), s => s.edit('budget', 200),
      s => s.edit('question', 'handSpeed'), s => s.patch({ bench: 'pulley' }), s => s.patch({ view: 'learn' })]) {
      const s = session(); s.click('reveal'); const old = cta(s), dom = mount(s); change(s); const before = s.allState();
      dom.run(old); expect(s.allState()).toBe(before); expect(dom.focus).not.toHaveBeenCalled(); dom.host.remove();
    }
  });
  it('rechecks the live destination before deferred focus without altering an active time draft', () => {
    for (const change of [dom => { dom.root.open = false; }, dom => dom.root.setAttribute('data-ml-power-navigation-signature', 'new-task'),
      dom => dom.answer.remove(), dom => { dom.root.querySelector('#ml-power-question-lever').value = 'handSpeed'; }]) {
      const s = session(); s.edit('question', 'budgetTime'); s.click('reveal'); const before = s.allState(), dom = mount(s);
      cta(s).props.onClick({ currentTarget: dom.button }); expect(dom.focus).not.toHaveBeenCalled(); change(dom); dom.flush(false);
      expect(dom.focus).not.toHaveBeenCalled(); expect(s.allState()).toBe(before); dom.host.remove();
    }
  });
  it('preserves physical inputs, saved records, other drafts, notes and XP while switching skills', () => {
    const s = session(BENCHES[0], { designReflection: 'Keep notes', benchPower: { screw: { answer: 'Keep draft' } } });
    s.edit('answer', 50); s.edit('unit', 'W'); s.mainClick('check'); s.mainClick('save'); s.edit('duration', 2); s.edit('timeUnit', 'min'); s.click('reveal');
    const before = s.allState(), dom = mount(s); dom.run(); const after = s.allState();
    const { benchPower: oldDrafts, ...oldLab } = before.machineLab, { benchPower: newDrafts, ...newLab } = after.machineLab;
    expect(newLab).toEqual(oldLab); expect(newDrafts.screw).toBe(oldDrafts.screw); expect(after.otherTool).toBe(before.otherTool);
    expect(s.id('duration').props.value).toBe('2'); expect(s.id('timeUnit').props.value).toBe('min');
    expect(s.state().benchPowerRecords).toBe(before.machineLab.benchPowerRecords); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('exposes a named semantic comparison with an explicit time-practice button', () => {
    const s = session(); s.click('reveal'); const section = pace(s), label = section.props['aria-labelledby'];
    expect(label).toBeTruthy(); expect(nodes(section).some(n => n.props?.id === label && text(n).length > 0)).toBe(true);
    expect(text(cta(s))).toMatch(/time/i); expect(cta(s).props.type).toBe('button');
  });
});
