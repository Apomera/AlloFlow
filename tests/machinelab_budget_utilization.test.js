import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

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
  return { render, find, id, practice, action, choice, invoke, choose, edit, awardXP, tryAward,
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

describe('Machine Lab: budget utilization arithmetic', () => {
  it.each(BENCHES)('calculates $id utilization and classification at 50, 100 and 200 percent', b => {
    const s = session(b);
    for (const factor of [2, 1, 0.5]) {
      const budget = expected(b).required * factor; s.edit('budget', budget); const before = s.allState();
      solve(s, expected(b, { budget })); onlyPracticeChanged(before, s.allState());
    }
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('accepts inclusive percentage-point tolerance without changing independent classification', () => {
    const s = session();
    for (const budget of [100, 50, 25]) {
      s.edit('budget', budget); const q = expected(BENCHES[0], { budget });
      for (const offset of [-0.1, 0.1, -0.100001, 0.100001]) {
        s.click('retry'); s.number(q.utilization + offset); s.choose(q.choice); s.click('check');
        expect(s.result()).toBe(Math.abs(offset) === 0.1 ? 'correct' : 'number');
        if (Math.abs(offset) === 0.1) worked(s, q); else hidden(s);
      }
    }
  });
  it('classifies near-budget floating-point values from power rather than rounded input', () => {
    const s = session();
    for (const ratio of [1 - 2e-9, 1 - 0.5e-9, 1, 1 + 0.5e-9, 1 + 2e-9]) {
      const budget = 50 / ratio; s.edit('budget', budget); const q = expected(BENCHES[0], { budget });
      s.number('100'); s.choose(q.choice); s.click('check'); expect(s.result()).toBe('correct'); worked(s, q);
      s.click('retry'); s.number('100'); s.choose(q.choice === 'at' ? 'over' : 'at'); s.click('check'); expect(s.result()).toBe('choice'); hidden(s);
    }
  });
  it('displays distinct powers and percentage labels when rounding would conceal a near-budget difference', () => {
    const s = session();
    for (const budget of [50 / (1 - 1e-8), 50 / (1 + 1e-8), 50.00004]) {
      s.edit('budget', budget); const q = expected(BENCHES[0], { budget });
      const given = nodes(s.practice()).find(n => n.props?.className === 'ml-budget-practice-given');
      expect(nodes(given).filter(n => n.type === 'dd').map(text)).toEqual(['50 W', String(budget) + ' W']); hidden(s);
      solve(s, q); const all = nodes(s.practice()), figure = all.find(n => n.props?.['data-ml-power-budget-utilization'] !== undefined);
      const equation = all.find(n => n.props?.['data-ml-power-budget-utilization-equation'] !== undefined);
      expect(text(equation)).toContain(String(budget) + ' W'); expect(text(equation)).toContain(String(q.utilization) + '%');
      expect(nodes(figure).some(n => n.type === 'p' && text(n) === String(q.utilization) + '%')).toBe(true);
      expect(nodes(figure).some(n => n.type === 'dt' && text(n).endsWith(String(q.utilization) + '%'))).toBe(true);
    }
  });
  it('converts minutes once and retains full precision in nondefault geometry', () => {
    const settings = { ...BASE, windlassLoad: 333, loadDistance: 0.7, windlassHandleR: 0.6, windlassDrumR: 0.15 };
    const s = session(BENCHES[4], settings); s.edit('duration', 2); s.edit('timeUnit', 'min'); s.edit('percent', 37.5); s.edit('budget', 12.3);
    solve(s, expected(BENCHES[4], { settings, seconds: 120, percent: 37.5, budget: 12.3 }));
    expect(s.id('duration').props.value).toBe('2'); expect(s.id('timeUnit').props.value).toBe('min');
  });
  it('preserves tiny positive utilization and does not clamp an over-budget result', () => {
    const settings = { ...BASE, leverLoad: 10, loadDistance: 0.1 }, s = session(BENCHES[0], settings);
    s.edit('percent', 100); s.edit('duration', 3600); s.edit('budget', 100000);
    const tiny = expected(BENCHES[0], { settings, percent: 100, seconds: 3600, budget: 100000 });
    s.number(tiny.utilization.toFixed(12)); s.choose('below'); s.click('check'); expect(s.result()).toBe('correct'); worked(s, tiny);
    s.click('retry'); s.number(0); s.choose('below'); s.click('check'); expect(s.result()).toBe('invalid'); hidden(s);
    s.edit('duration', 0.01); s.edit('budget', 0.01); solve(s, expected(BENCHES[0], { settings, percent: 100, seconds: 0.01, budget: 0.01 }));
  });
  it('rejects blank, nonpositive and unsupported forms while accepting positive decimal syntax', () => {
    const s = session();
    for (const value of ['', ' ', '0', '-0', '-50', 'NaN', 'Infinity', '+Infinity', '50%', '50 %', '5e1', '1,000', '0x32', '+', '.', '++50']) {
      s.click('retry'); s.number(value); s.choose('below'); s.click('check'); expect(s.result(), value).toBe('invalid'); hidden(s);
    }
    for (const value of ['50', ' +50.0 ', '50.']) { s.click('retry'); s.number(value); s.choose('below'); s.click('check'); expect(s.result(), value).toBe('correct'); }
  });
});

describe('Machine Lab: budget utilization lifecycle', () => {
  it('withholds worked answers until both numeric and interpretation answers are correct', () => {
    const s = session(); hidden(s); s.click('check'); expect(s.result()).toBe('invalid'); hidden(s);
    s.number(50); s.click('check'); expect(s.result()).toBe('invalid'); hidden(s);
    s.choose('over'); s.click('check'); expect(s.result()).toBe('choice'); hidden(s);
    s.number(80); s.choose('below'); s.click('check'); expect(s.result()).toBe('number'); hidden(s);
    s.number(50); s.click('check'); expect(s.result()).toBe('correct'); worked(s, expected(BENCHES[0]));
  });
  it('reveals the explanation explicitly and retains viewed provenance during corrections', () => {
    const s = session(); s.click('reveal'); expect(s.result()).toBe('solution'); worked(s, expected(BENCHES[0]));
    s.number(999); s.choose('over'); s.click('check'); expect(s.result()).toBe('solution'); worked(s, expected(BENCHES[0]));
    s.number(50); s.choose('below'); s.click('check'); expect(s.result()).toBe('solution');
  });
  it('marks edits after an independently correct answer as viewed', () => {
    const s = session(); solve(s, expected(BENCHES[0]));
    s.number(''); expect(s.result()).toBe('solution'); s.choose('over'); s.click('check'); expect(s.result()).toBe('solution'); worked(s, expected(BENCHES[0]));
  });
  it('clears revealed drafts and results on retry so a new independent attempt can succeed', () => {
    const s = session(); s.number(999); s.choose('over'); s.click('reveal'); s.click('retry');
    expect(s.id('budget-practice-answer').props.value).toBe(''); expect(s.result()).toBeUndefined(); hidden(s);
    for (const kind of ['below', 'at', 'over']) expect(s.choice(kind).props.checked).toBe(false);
    solve(s, expected(BENCHES[0]));
  });
  it('uses the latest drafts for an older same-session Check callback', () => {
    const s = session(), check = s.action('check'); s.number(50); s.choose('below'); s.number(99); s.invoke(check);
    expect(s.result()).toBe('number'); hidden(s); s.number(50); s.choose('at'); s.invoke(check); expect(s.result()).toBe('choice');
    s.choose('below'); s.invoke(check); expect(s.result()).toBe('correct');
  });
  it('supports Enter with latest state while ignoring other keys and IME composition', () => {
    const s = session(), field = s.id('budget-practice-answer'), preventDefault = vi.fn(); s.number(50); s.choose('below');
    field.props.onKeyDown({ key: 'Escape', preventDefault }); field.props.onKeyDown({ key: 'Enter', isComposing: true, preventDefault });
    expect(preventDefault).not.toHaveBeenCalled(); expect(s.result()).toBeUndefined(); hidden(s);
    field.props.onKeyDown({ key: 'Enter', preventDefault }); expect(preventDefault).toHaveBeenCalledOnce(); expect(s.result()).toBe('correct');
  });
});

describe('Machine Lab: budget utilization isolation', () => {
  it('rejects old field, choice and action callbacks after session, station or view changes', () => {
    const changes = [s => s.patch({ leverLoad: 500 }), s => s.patch({ leverEffortArm: 3 }), s => s.patch({ loadDistance: 0.6 }),
      s => s.edit('duration', 10), s => s.edit('timeUnit', 'min'), s => s.edit('percent', 40), s => s.edit('budget', 200),
      s => s.edit('question', 'handSpeed'), s => s.patch({ bench: 'pulley' }), s => s.patch({ view: 'learn' })];
    for (const change of changes) {
      const s = session(); s.number(50); const field = s.id('budget-practice-answer'), choice = s.choice('below'), actions = ['check', 'reveal', 'retry'].map(s.action);
      change(s); const before = s.allState(); field.props.onChange({ target: { value: '999' } }); field.props.onKeyDown({ key: 'Enter', preventDefault() {} });
      choice.props.onChange({ target: { checked: true, value: 'below' } }); actions.forEach(s.invoke); expect(s.allState()).toBe(before);
    }
  });
  it('removes practice when assumptions become invalid and clears drafts on signature changes', () => {
    const s = session(); solve(s, expected(BENCHES[0])); s.edit('budget', 0); expect(s.practice()).toBeUndefined();
    s.edit('budget', 200); expect(s.id('budget-practice-answer').props.value).toBe(''); expect(s.result()).toBeUndefined(); hidden(s);
    const before = s.allState(); s.render(); expect(s.allState()).toBe(before);
  });
  it('keeps bench drafts independent without render-time state writes', () => {
    const s = session(); s.number(50); s.choose('below'); const lever = s.state().benchPowerBudgetPractice.lever;
    s.patch({ bench: 'screw' }); expect(s.id('budget-practice-answer').props.value).toBe(''); solve(s, expected(BENCHES[5]));
    expect(s.state().benchPowerBudgetPractice.lever).toBe(lever); s.patch({ bench: 'lever' }); expect(s.id('budget-practice-answer').props.value).toBe('50'); expect(s.choice('below').props.checked).toBe(true);
    const before = s.allState(); s.render(); expect(s.allState()).toBe(before);
  });
  it('normalizes malformed restored drafts and flags without granting independent success', () => {
    const s = session(); s.number(50); const raw = s.state().benchPowerBudgetPractice.lever;
    for (const answer of [null, {}, [], 50, true]) {
      s.patch({ benchPowerBudgetPractice: { lever: { ...raw, answer, choice: 'below', checked: true } } });
      expect(s.id('budget-practice-answer').props.value).toBe(''); s.click('check'); expect(s.result()).toBe('invalid'); hidden(s);
    }
    s.patch({ benchPowerBudgetPractice: { lever: { ...raw, answer: '50', choice: 'below', checked: 'true', revealed: 'true', viewed: 'true' } } });
    expect(s.result()).toBeUndefined(); hidden(s); s.number('1'.repeat(100)); expect(s.id('budget-practice-answer').props.value).toHaveLength(64);
  });
  it('retains main calculation records, notes, other drafts, prediction work and XP', () => {
    const s = session(BENCHES[0], { designReflection: 'Keep notes', benchPower: { screw: { answer: 'Keep draft' } }, benchPowerPredictions: { screw: { choice: 'half' } } });
    s.edit('answer', 50); s.edit('unit', 'W'); s.mainClick('check'); s.mainClick('save');
    const before = s.allState(), records = s.state().benchPowerRecords, drafts = s.state().benchPower; expect(records.lever.inputPower).toBeTruthy();
    solve(s, expected(BENCHES[0])); s.click('reveal'); s.click('retry'); onlyPracticeChanged(before, s.allState());
    expect(s.state().benchPowerRecords).toBe(records); expect(s.state().benchPower).toBe(drafts); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('labels percent input and radio choices and announces feedback in a polite live region', () => {
    const s = session(), field = s.id('budget-practice-answer'), all = nodes(s.practice());
    expect(s.practice().type).toBe('section'); expect(field.props).toMatchObject({ type: 'text', inputMode: 'decimal', maxLength: 64 });
    const label = all.find(n => n.type === 'label' && n.props.htmlFor === field.props.id); expect(text(label)).toContain('%');
    for (const kind of ['below', 'at', 'over']) { const radio = s.choice(kind); expect(radio.props.type).toBe('radio'); expect(all.some(n => n.type === 'label' && (n.props.htmlFor === radio.props.id || nodes(n).includes(radio)))).toBe(true); }
    expect(all.some(n => n.type === 'fieldset' && nodes(n).some(c => c.type === 'legend'))).toBe(true);
    s.click('check'); const result = nodes(s.practice()).find(n => n.props?.['data-ml-power-budget-practice-result']);
    expect(nodes(s.practice()).some(n => (n.props?.role === 'status' || n.props?.['aria-live'] === 'polite') && nodes(n).includes(result))).toBe(true);
  });
  it('respects the existing learner-band visibility for the budget guide', () => {
    const s = session(); expect(s.practice()).toBeTruthy(); s.patch({ bandOverride: 'k2' }); expect(s.practice()).toBeUndefined();
  });
});
