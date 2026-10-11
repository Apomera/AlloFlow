import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// These formulas and fixtures are independent of the tool's calculation helpers.
const BENCHES = [
  { id: 'lever', control: 'leverEffortArm', load: 'leverLoad', settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 }, ma: d => d.leverEffortArm / d.leverLoadArm },
  { id: 'pulley', control: 'pulleySegments', load: 'pulleyLoad', settings: { pulleySegments: 2, pulleyLoad: 400 }, ma: d => d.pulleySegments },
  { id: 'windlass', control: 'windlassHandleR', load: 'windlassLoad', settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 }, ma: d => d.windlassHandleR / d.windlassDrumR },
  { id: 'ramp', control: 'rampLength', load: 'rampLoad', settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 }, ma: d => d.rampLength / d.rampHeight },
  { id: 'wedge', control: 'wedgeLength', load: 'wedgeLoad', settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 }, ma: d => d.wedgeLength / d.wedgeThickness },
  { id: 'screw', control: 'screwPitch', load: 'screwLoad', settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 }, ma: d => 2 * Math.PI * d.screwHandleR / d.screwPitch }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function session(b = BENCHES[0], force = 500, travel = 150, extra = {}) {
  const store = newStore({ machineLab: { view: 'machines', bench: b.id, bandOverride: 'g68', ...BASE,
    benchDesignLimits: { [b.id]: { force: String(force), travel: String(travel), control: b.control } }, ...extra } });
  const render = () => tool.render(makeCtx({}, store));
  const find = predicate => nodes(render()).find(predicate);
  return { render, find, state: () => store.toolData.machineLab,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    panel: () => find(n => n.props?.['data-ml-limit-explanation'] === store.toolData.machineLab.bench),
    budget: kind => find(n => n.props?.['data-ml-limit-budget'] === kind),
    direction: () => find(n => n.props?.['data-ml-limit-direction'] !== undefined),
    discrete: () => find(n => n.props?.['data-ml-limit-discrete'] !== undefined),
    button: label => find(n => n.type === 'button' && text(n) === label),
    invoke: n => n.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }) };
}
function expected(b, state) { const ma = b.ma(state); return { force: state[b.load] / ma, travel: state.loadDistance * ma, ma }; }
function numeric(row, attr) { expect(row, `Missing row for ${attr}`).toBeTruthy(); return Number(row.props[attr]); }
function checkBudget(s, kind, actual, limit) {
  const row = s.budget(kind);
  expect(row.props.role).toBe('group'); expect(row.props['aria-label']).toBeTruthy();
  expect(numeric(row, 'data-value')).toBeCloseTo(actual, 10);
  expect(numeric(row, 'data-limit')).toBe(limit);
  expect(numeric(row, 'data-percent')).toBeCloseTo(100 * actual / limit, 8);
  expect(numeric(row, 'data-margin')).toBeCloseTo(limit - actual, 10);
  const bars = nodes(row).filter(n => n.props?.['data-ml-limit-bar'] !== undefined);
  expect(bars).toHaveLength(2);
  for (const name of ['current', 'limit']) {
    const bar = bars.find(n => n.props['data-ml-limit-bar'] === name);
    expect(bar, `Missing ${name} bar`).toBeTruthy();
    expect(parseFloat(bar.props.style.width)).toBeCloseTo(100 * (name === 'current' ? actual : limit) / Math.max(actual, limit), 8);
    expect(nodes(row).some(n => (n.props?.['aria-hidden'] === true || n.props?.['aria-hidden'] === 'true') && nodes(n).includes(bar))).toBe(true);
  }
  expect(text(row)).toContain('%'); expect(text(row)).toContain(kind === 'force' ? 'N' : 'm');
  expect(text(row)).not.toMatch(/NaN|Infinity/);
}

describe('Machine Lab: read the force and travel limits', () => {
  it.each(BENCHES)('explains independent $id force and movement physics in named text and decorative bars', b => {
    const s = session(b), before = s.state(), e = expected(b, before);
    checkBudget(s, 'force', e.force, 500); checkBudget(s, 'travel', e.travel, 150);
    expect(s.budget('force').props['aria-label']).not.toBe(s.budget('travel').props['aria-label']);
    expect(numeric(s.budget('force'), 'data-value') * numeric(s.budget('travel'), 'data-value')).toBeCloseTo(before[b.load] * before.loadDistance, 9);
    const forceFormula = s.find(n => n.props?.['data-ml-limit-formula'] === 'force');
    const travelFormula = s.find(n => n.props?.['data-ml-limit-formula'] === 'travel');
    expect(text(forceFormula)).toContain(String(before[b.load])); expect(text(forceFormula)).toMatch(/÷|\//);
    expect(text(travelFormula)).toContain(String(before.loadDistance)); expect(text(travelFormula)).toMatch(/×|\*/);
    expect(s.direction().props['data-ml-limit-direction']).toBe('fits');
    expect(s.state()).toBe(before);
  });

  it.each(BENCHES)('uses a closed native disclosure inside the $id design panel without extra interactive controls', b => {
    for (const bandOverride of ['g68', 'g912']) {
      const s = session(b, 500, 150, { bandOverride }), panel = s.panel();
      expect(panel.type).toBe('details'); expect(panel.props.open).not.toBe(true);
      const summaries = nodes(panel).filter(n => n.type === 'summary');
      expect(summaries).toHaveLength(1); expect(text(summaries[0])).toBe('Read the limits');
      expect(nodes(panel).filter(n => ['button', 'input', 'select', 'textarea'].includes(n.type))).toHaveLength(0);
      expect(nodes(panel).filter(n => n.props?.role === 'progressbar' || n.props?.role === 'meter')).toHaveLength(0);
      expect(nodes(s.find(n => n.props?.['data-ml-design'] === b.id)).some(n => n.props?.['data-ml-limit-explanation'] === b.id)).toBe(true);
    }
    for (const bandOverride of ['k2', 'g35']) expect(session(b, 500, 150, { bandOverride }).panel()).toBeUndefined();
  });

  it.each(BENCHES)('keeps both $id numeric comparisons and percentages live when task conditions change', b => {
    const s = session(b), first = expected(b, s.state());
    s.patch({ [b.load]: s.state()[b.load] * 1.1, loadDistance: 0.7 });
    const before = s.state(), second = expected(b, before);
    checkBudget(s, 'force', second.force, 500); checkBudget(s, 'travel', second.travel, 150);
    expect(second.force / first.force).toBeCloseTo(1.1, 10); expect(second.travel / first.travel).toBeCloseTo(1.4, 10);
    expect(s.state()).toBe(before);
  });

  it.each([
    ['force', 100, 3, 'force'], ['travel', 500, 0.75, 'travel'],
    ['both', 100, 0.75, 'budget'], ['force with impossible budget', 100, 1.1, 'budget'],
    ['travel with impossible budget', 210, 0.75, 'budget'], ['both fit', 500, 3, 'fits']
  ])('explains the %s case with the correct design direction', (_name, force, travel, direction) => {
    const s = session(BENCHES[0], force, travel), node = s.direction();
    expect(node.props['data-ml-limit-direction']).toBe(direction); expect(text(node).length).toBeGreaterThan(35);
    if (direction === 'force') expect(text(node)).toMatch(/increas|higher|larger|more mechanical/i);
    if (direction === 'travel') expect(text(node)).toMatch(/decreas|lower|smaller|less mechanical/i);
    if (direction === 'budget') expect(text(node)).toMatch(/work|budget/i);
  });

  it('keeps raw percentages above 100 while scaling both visual bars to the same local maximum', () => {
    const s = session(BENCHES[0], 100, 0.5);
    checkBudget(s, 'force', 200, 100); checkBudget(s, 'travel', 1, 0.5);
    for (const kind of ['force', 'travel']) {
      expect(s.budget(kind).props['data-state']).toBe('over'); expect(text(s.budget(kind))).toContain('200');
      expect(numeric(s.budget(kind), 'data-percent')).toBe(200);
    }
  });

  it('preserves a very large force overrun without clipping the text or raw percentage', () => {
    const s = session(BENCHES[0], 1, 0.1, { leverEffortArm: 0.2, leverLoadArm: 4, leverLoad: 1000 });
    checkBudget(s, 'force', 20000, 1); checkBudget(s, 'travel', 0.025, 0.1);
    expect(numeric(s.budget('force'), 'data-percent')).toBe(2000000);
    expect(s.budget('force').props['data-state']).toBe('over'); expect(s.budget('travel').props['data-state']).toBe('below');
  });

  it('preserves a very large screw travel overrun without clipping the text or raw percentage', () => {
    const b = BENCHES[5], s = session(b, 100, 0.1), e = expected(b, s.state());
    checkBudget(s, 'force', e.force, 100); checkBudget(s, 'travel', e.travel, 0.1);
    expect(numeric(s.budget('travel'), 'data-percent')).toBeGreaterThan(90000);
    expect(s.budget('travel').props['data-state']).toBe('over');
  });
});

describe('Machine Lab: honest limit precision', () => {
  it('shows a positive screw force percentage below display precision as less than 0.001%, never zero', () => {
    const b = BENCHES[5], s = session(b, 5000, 300, { screwHandleR: 0.5, screwPitch: 0.001, screwLoad: 50, loadDistance: 0.1 });
    const actual = 50 / (2 * Math.PI * 0.5 / 0.001), row = s.budget('force');
    checkBudget(s, 'force', actual, 5000);
    expect(numeric(row, 'data-percent')).toBeGreaterThan(0); expect(numeric(row, 'data-percent')).toBeLessThan(0.001);
    expect(text(row)).toContain('<0.001%'); expect(text(row)).not.toMatch(/Uses 0(?:\.0+)?%/);
  });

  it.each(['force', 'travel'])('labels an exactly equal %s value as at the limit', kind => {
    const s = session(BENCHES[0], 200, 1), row = s.budget(kind);
    expect(row.props['data-state']).toBe('at'); expect(numeric(row, 'data-margin')).toBe(0);
    expect(numeric(row, 'data-percent')).toBe(100); expect(text(row)).toMatch(/at.*limit|exact/i);
  });

  it.each(['force', 'travel'].flatMap(kind => [-1, 1].map(sign => ({ kind, sign }))))('distinguishes accepted $kind precision near equality on side $sign', ({ kind, sign }) => {
    const limit = (kind === 'force' ? 200 : 1) + sign * (kind === 'force' ? 1e-7 : 5e-10);
    const s = session(BENCHES[0], kind === 'force' ? limit : 500, kind === 'travel' ? limit : 3), row = s.budget(kind);
    expect(row.props['data-state']).toBe('tolerance'); expect(numeric(row, 'data-margin')).not.toBe(0);
    expect(text(row)).toMatch(/tolerance|precision/i); expect(text(row)).not.toContain('<0.001');
    expect(s.direction().props['data-ml-limit-direction']).toBe('fits');
  });

  it.each(['force', 'travel'].flatMap(kind => [-1, 1].map(sign => ({ kind, sign }))))('does not hide a real $kind difference on side $sign behind a rounded 100%', ({ kind, sign }) => {
    const actual = kind === 'force' ? 200 : 1, limit = actual + sign * (kind === 'force' ? 4e-7 : 2e-9);
    const s = session(BENCHES[0], kind === 'force' ? limit : 500, kind === 'travel' ? limit : 3), row = s.budget(kind);
    expect(row.props['data-state']).toBe(sign > 0 ? 'below' : 'over');
    expect(text(row)).toContain('<0.001'); expect(text(row)).toContain(kind === 'force' ? 'N' : 'm');
    expect(numeric(row, 'data-percent').toFixed(3)).toBe('100.000');
    expect(numeric(row, 'data-percent') > 100).toBe(sign < 0);
    expect(s.direction().props['data-ml-limit-direction']).toBe(sign > 0 ? 'fits' : kind);
  });

  it.each(['force', 'travel'])('shows a small genuine %s margin with its own unit', kind => {
    const s = session(BENCHES[0], kind === 'force' ? 200.0005 : 500, kind === 'travel' ? 1.0005 : 3);
    const row = s.budget(kind);
    expect(row.props['data-state']).toBe('below'); expect(text(row)).toContain('<0.001');
    expect(text(row)).toContain(kind === 'force' ? 'N' : 'm');
    expect(numeric(row, 'data-margin')).toBeCloseTo(0.0005, 10);
  });

  it('honors accepted per-limit tolerances when the combined envelope comparison is slightly stricter', () => {
    const s = session(BENCHES[0], 200 - 1.5e-7, 1 - 9e-10);
    // Each direct comparison accepts its difference; the MA interval misses by more than its own tolerance.
    expect(400 / (200 - 1.5e-7) - (1 - 9e-10) / 0.5).toBeGreaterThan(2.1e-9);
    expect(s.budget('force').props['data-state']).toBe('tolerance'); expect(s.budget('travel').props['data-state']).toBe('tolerance');
    expect(s.direction().props['data-ml-limit-direction']).toBe('fits');
  });
});

describe('Machine Lab: physical limits and available settings are different', () => {
  it('identifies a pulley interval that fits ideal work but has no whole-number strand setting', () => {
    const s = session(BENCHES[1], 200, 1.25, { pulleyLoad: 420 });
    expect(420 * 0.5).toBeLessThan(200 * 1.25);
    expect(s.discrete().props).toMatchObject({ 'data-ml-limit-discrete': 'none', 'data-control': 'pulleySegments' });
    expect(s.direction().props['data-ml-limit-direction']).toBe('force');
    expect(text(s.discrete())).toMatch(/slider|setting/i);
  });

  it('keeps an imported off-grid setup that fits distinct from having no available slider increment', () => {
    const s = session(BENCHES[0], 400 / 2.05, 0.5 * 2.05, { leverEffortArm: 2.05 });
    expect(s.direction().props['data-ml-limit-direction']).toBe('fits');
    expect(s.discrete().props).toMatchObject({ 'data-ml-limit-discrete': 'none', 'data-control': 'leverEffortArm' });
    expect(s.budget('force').props['data-state']).toBe('at'); expect(s.budget('travel').props['data-state']).toBe('at');
  });

  it('updates the no-setting explanation when a different geometry control can reach the interval', () => {
    const s = session(BENCHES[0], 100, 3, { leverLoadArm: 4 });
    expect(s.discrete().props['data-control']).toBe('leverEffortArm');
    const before = s.state(), force = numeric(s.budget('force'), 'data-value'), travel = numeric(s.budget('travel'), 'data-value');
    const chooser = s.find(n => n.type === 'select' && n.props.id === 'ml-design-control-lever');
    chooser.props.onChange({ target: { value: 'leverLoadArm' } });
    expect(s.discrete()).toBeUndefined(); expect(s.direction().props['data-ml-limit-direction']).toBe('force');
    expect(numeric(s.budget('force'), 'data-value')).toBe(force); expect(numeric(s.budget('travel'), 'data-value')).toBe(travel);
    expect({ ...s.state(), benchDesignLimits: before.benchDesignLimits }).toEqual(before);
  });

  it('does not blame slider increments when the ideal-work budget itself is impossible', () => {
    const s = session(BENCHES[0], 100, 1);
    expect(s.direction().props['data-ml-limit-direction']).toBe('budget'); expect(s.discrete()).toBeUndefined();
  });
});

describe('Machine Lab: explanation availability and state preservation', () => {
  it.each([
    ['blank force', { benchDesignLimits: { lever: { force: '', travel: '3' } } }],
    ['blank travel', { benchDesignLimits: { lever: { force: '100', travel: '' } } }],
    ['zero force', { benchDesignLimits: { lever: { force: '0', travel: '3' } } }],
    ['force outside range', { benchDesignLimits: { lever: { force: '5001', travel: '3' } } }],
    ['travel outside range', { benchDesignLimits: { lever: { force: '100', travel: '301' } } }],
    ['non-finite force', { benchDesignLimits: { lever: { force: 'Infinity', travel: '3' } } }],
    ['malformed travel', { benchDesignLimits: { lever: { force: '100', travel: 'maybe' } } }],
    ['non-finite geometry', { leverEffortArm: Infinity }], ['missing geometry', { leverLoadArm: null }],
    ['invalid load', { leverLoad: 0 }], ['invalid movement', { loadDistance: 3.1 }]
  ])('hides calculated explanations for %s without changing state', (_label, extra) => {
    const s = session(BENCHES[0], 100, 3, extra), before = s.state();
    expect(s.panel()).toBeUndefined(); expect(s.budget('force')).toBeUndefined(); expect(s.budget('travel')).toBeUndefined();
    expect(s.direction()).toBeUndefined(); expect(s.state()).toBe(before);
  });

  it('hides calculated explanations for impossible ramp geometry', () => {
    const s = session(BENCHES[3], 500, 3, { rampLength: 1, rampHeight: 2 }); expect(s.panel()).toBeUndefined();
  });

  it.each(BENCHES)('recalculates $id explanations after Apply and Undo while preserving saved records and writing', b => {
    const record = { benchId: b.id, settings: { ...b.settings, loadDistance: 0.5 }, limits: { force: 500, travel: 150 }, control: b.control, note: 'Keep this explanation.' };
    const investigation = { question: 'Compare the task and the effort.', observation: 'Retain evidence.' };
    const records = { [b.id]: record }, investigations = { [b.id]: investigation };
    const s = session(b, 500, 150, { benchDesignRecords: records, benchInvestigations: investigations, journalNote: 'Keep my reflection.' });
    const initial = expected(b, s.state()), originalLoad = s.state()[b.load];
    const use = s.find(n => n.type === 'button' && n.props['data-ml-capacity-use'] === 'load');
    expect(use.props.disabled).toBe(false); s.invoke(use);
    const changed = expected(b, s.state()); expect(s.state()[b.load]).not.toBe(originalLoad);
    checkBudget(s, 'force', changed.force, 500); checkBudget(s, 'travel', changed.travel, 150);
    expect(changed.travel).toBe(initial.travel);
    s.invoke(s.find(n => n.type === 'button' && n.props['data-ml-design-undo-use'] === b.id));
    checkBudget(s, 'force', initial.force, 500); checkBudget(s, 'travel', initial.travel, 150);
    expect(s.state()[b.load]).toBe(originalLoad); expect(s.state().benchDesignRecords).toBe(records);
    expect(s.state().benchInvestigations).toBe(investigations); expect(s.state().journalNote).toBe('Keep my reflection.');
    const beforeRender = s.state(); s.render(); expect(s.state()).toBe(beforeRender);
  });

  it('reads changed limits and keeps every saved object and explanation intact', () => {
    const records = { lever: { benchId: 'lever', settings: { ...BENCHES[0].settings, loadDistance: 0.5 }, limits: { force: 500, travel: 3 }, control: 'leverEffortArm', note: 'Saved note.' } };
    const s = session(BENCHES[0], 500, 3, { benchDesignRecords: records, benchCompare: { note: 'Evidence' }, customNote: 'Unrelated writing.' });
    const before = s.state();
    const forceInput = s.find(n => n.type === 'input' && n.props.id === 'ml-design-force-lever');
    forceInput.props.onChange({ target: { value: '100' } });
    checkBudget(s, 'force', 200, 100); expect(s.direction().props['data-ml-limit-direction']).toBe('force');
    expect({ ...s.state(), benchDesignLimits: before.benchDesignLimits }).toEqual(before);
    expect(s.state().benchDesignRecords).toBe(records); expect(s.state().benchCompare).toBe(before.benchCompare);
  });
});
