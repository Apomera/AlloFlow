import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const STATIONS = ['lever', 'pulley', 'ramp', 'wedge', 'windlass', 'screw'];
const FAMILIES = {
  power: ['inputPower', 'usefulPower', 'lossPower', 'effortFromPower', 'loadFromPower'],
  motion: ['handSpeed', 'loadSpeed'],
  planning: ['budgetTime', 'budgetEnergy', 'budgetLoad', 'budgetMovement', 'requiredEfficiency'],
  rotation: ['torque', 'rpm', 'turns', 'angularTravel', 'omega', 'rotationalWork', 'rotationalPower']
};
const BASE = { loadDistance: 0.5, leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400,
  pulleySegments: 2, pulleyLoad: 400, rampLength: 4, rampHeight: 1, rampLoad: 400,
  wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800,
  windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400,
  screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 };
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function session(bench = 'windlass', extra = {}) {
  const store = newStore({ machineLab: { view: 'machines', bench, bandOverride: 'g68', ...BASE, ...extra } });
  const awardXP = vi.fn(), tryAward = vi.fn(); let renderedState, tree;
  const render = () => { if (renderedState !== store.toolData.machineLab) { renderedState = store.toolData.machineLab; tree = tool.render(makeCtx({ awardXP, tryAward }, store)); } return tree; };
  const find = predicate => nodes(render()).find(predicate);
  const byId = suffix => find(n => n.props?.id === `ml-power-${suffix}-${store.toolData.machineLab.bench}`);
  const action = kind => find(n => n.type === 'button' && n.props[`data-ml-power-${kind}`] !== undefined);
  const invoke = node => { expect(node).toBeTruthy(); node.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }); };
  const map = () => find(n => n.props?.['data-ml-power-skill-map'] === store.toolData.machineLab.bench);
  const skill = kind => nodes(map()).find(n => n.props?.['data-ml-power-skill'] === kind);
  return { render, find, byId, action, invoke, map, skill, awardXP, tryAward,
    state: () => store.toolData.machineLab,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    edit: (suffix, value) => { const n = byId(suffix); expect(n, `Missing ${suffix}`).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); },
    click: kind => { const n = action(kind); expect(n?.props.disabled).not.toBe(true); invoke(n); },
    choose: kind => invoke(skill(kind)),
    result: () => find(n => n.props?.['data-ml-power-result'] !== undefined)?.props['data-ml-power-result'] };
}
function record(extra = {}) {
  // Independent defaults: 400 N * 0.5 m / 0.8 / 5 s = 50 W.
  return { version: 1, benchId: 'windlass', settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400, loadDistance: 0.5 },
    percent: 80, seconds: 5, budget: 100, question: 'inputPower', answer: '50', unit: 'W', hint: 0, completion: 'checked', ...extra };
}
function status(s, kind, completion, setup) {
  expect(s.skill(kind)?.props['data-ml-power-skill-status']).toBe(completion);
  expect(s.skill(kind)?.props['data-ml-power-skill-setup']).toBe(setup);
}
function completeInput(s) { s.edit('answer', 50); s.edit('unit', 'W'); s.click('check'); expect(s.result()).toBe('correct'); }

describe('Machine Lab: skill map inventory', () => {
  it.each(STATIONS)('organizes every skill once in native closed %s navigation', bench => {
    const s = session(bench), before = s.state(), map = s.map(), rotary = ['windlass', 'screw'].includes(bench);
    expect(map?.type).toBe('details'); expect(map.props.open).not.toBe(true);
    expect(text(nodes(map).find(n => n.type === 'summary'))).toContain('Explore skills and saved practice');
    const families = Object.entries(FAMILIES).filter(([family]) => rotary || family !== 'rotation');
    expect(nodes(map).filter(n => n.props?.['data-ml-power-skill-family']).map(n => n.props['data-ml-power-skill-family'])).toEqual(families.map(([family]) => family));
    for (const [family, expected] of families) {
      const section = nodes(map).find(n => n.props?.['data-ml-power-skill-family'] === family);
      expect(nodes(section).filter(n => n.props?.['data-ml-power-skill']).map(n => n.props['data-ml-power-skill'])).toEqual(expected);
    }
    const buttons = nodes(map).filter(n => n.props?.['data-ml-power-skill']);
    expect(buttons).toHaveLength(rotary ? 19 : 12);
    expect(new Set(buttons.map(n => n.props['data-ml-power-skill'])).size).toBe(buttons.length);
    expect(buttons.map(n => n.props['data-ml-power-skill']).sort()).toEqual(nodes(s.byId('question')).filter(n => n.type === 'option').map(n => n.props.value).sort());
    for (const button of buttons) {
      const kind = button.props['data-ml-power-skill']; expect(button.type).toBe('button'); expect(button.props.type).toBe('button');
      expect(button.props['aria-pressed']).toBe(kind === 'inputPower'); expect(text(button)).not.toBe(''); status(s, kind, 'unsaved', 'none');
    }
    expect(s.state()).toBe(before); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('follows the existing age and valid-model visibility rules', () => {
    for (const bandOverride of ['k2', 'g35', 'g68', 'g912']) expect(!!session('windlass', { bandOverride }).map()).toBe(['g68', 'g912'].includes(bandOverride));
    for (const patch of [{ windlassHandleR: 0 }, { benchPower: { windlass: { percent: '0' } } }, { benchPower: { windlass: { duration: '0' } } }]) expect(session('windlass', patch).map()).toBeUndefined();
  });
});

describe('Machine Lab: skill map guarded navigation', () => {
  it.each(['lever', 'windlass', 'screw'])('selects a %s family skill and clears only the current practice draft', bench => {
    const saved = { windlass: { inputPower: record() } }, s = session(bench, { benchPowerRecords: saved, designReflection: 'Keep this note' });
    s.edit('answer', '123'); s.edit('unit', 'J'); s.click('hint'); s.click('reveal');
    const kind = bench === 'lever' ? 'budgetEnergy' : 'omega'; s.choose(kind);
    expect(s.byId('question').props.value).toBe(kind); expect(s.skill(kind).props['aria-pressed']).toBe(true); expect(s.skill('inputPower').props['aria-pressed']).toBe(false);
    expect(s.byId('answer').props.value).toBe(''); expect(s.byId('unit').props.value).toBe(''); expect(s.result()).toBeUndefined();
    expect(s.find(n => n.props?.['data-ml-power-hint-level'] !== undefined)).toBeUndefined();
    expect(s.state().benchPowerRecords).toBe(saved); expect(s.state().designReflection).toBe('Keep this note');
    for (const key of Object.keys(BASE)) expect(s.state()[key]).toBe(BASE[key]);
  });
  it.each([
    ['station', { bench: 'screw' }], ['view', { view: 'learn' }], ['geometry', { windlassHandleR: 0.6 }],
    ['efficiency', { benchPower: { windlass: { percent: '40' } } }], ['time', { benchPower: { windlass: { duration: '10' } } }],
    ['budget', { benchPower: { windlass: { budget: '200' } } }], ['question', { benchPower: { windlass: { question: 'turns' } } }]
  ])('ignores a delayed skill card after %s changes', (_name, patch) => {
    const s = session(), stale = s.skill('budgetEnergy'); s.patch(patch); const before = s.state(); s.invoke(stale); expect(s.state()).toBe(before);
  });
  it('invalidates old answer, check and save handlers when a card changes the selected skill', () => {
    const s = session(); completeInput(s); const oldInput = s.byId('answer'), oldCheck = s.action('check'), oldSave = s.action('save');
    s.choose('turns'); const before = s.state(); oldInput.props.onChange({ target: { value: '999' } }); s.invoke(oldCheck); s.invoke(oldSave);
    expect(s.state()).toBe(before); expect(s.state().benchPowerRecords).toBeUndefined(); expect(s.byId('answer').props.value).toBe('');
  });
  it('treats the active card as a no-op and retains checked work and hints', () => {
    const s = session(); s.click('hint'); completeInput(s); const before = s.state(); s.choose('inputPower');
    expect(s.state()).toBe(before); expect(s.result()).toBe('correct'); expect(s.byId('answer').props.value).toBe('50'); expect(s.byId('unit').props.value).toBe('W');
    expect(s.find(n => n.props?.['data-ml-power-hint-level'] === 1)).toBeTruthy(); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
});

describe('Machine Lab: skill map saved evidence', () => {
  it('displays valid v1, v2 and v3 records together with their honest saved provenance', () => {
    const records = { inputPower: record({ hint: 1 }), budgetEnergy: record({ version: 2, question: 'budgetEnergy', answer: '500', unit: 'J', hint: 2 }),
      turns: record({ version: 3, question: 'turns', answer: String(0.5 / (2 * Math.PI * 0.1)), unit: 'turns' }) };
    const s = session('windlass', { benchPowerRecords: { windlass: records } });
    for (const [kind, value] of Object.entries(records)) { status(s, kind, 'checked', 'current'); expect(text(s.skill(kind))).toMatch(/checked/i); expect(text(s.skill(kind))).toContain(`${value.hint}/2`); }
    expect(s.find(n => n.props?.['data-ml-power-map-saved'] !== undefined)?.props).toMatchObject({ 'data-ml-power-map-saved': 3, 'data-ml-power-map-checked': 3, 'data-ml-power-map-solutions': 0 });
    expect(text(s.map())).not.toMatch(/mastered|mastery|earned|\bXP\b/); status(s, 'omega', 'unsaved', 'none');
  });
  it('shows checked practice only after an explicit save and preserves its hint count', () => {
    const s = session(); s.click('hint'); s.click('hint'); completeInput(s); status(s, 'inputPower', 'unsaved', 'none');
    s.click('save'); status(s, 'inputPower', 'checked', 'current'); expect(text(s.skill('inputPower'))).toContain('2/2');
    s.edit('answer', 'incorrect draft'); s.edit('unit', 'J'); status(s, 'inputPower', 'checked', 'current'); expect(s.state().benchPowerRecords.windlass.inputPower.answer).toBe('50');
  });
  it('identifies saved worked solutions even when the learner later enters the correct answer', () => {
    const s = session(); s.click('hint'); s.click('reveal'); status(s, 'inputPower', 'unsaved', 'none'); s.click('save');
    status(s, 'inputPower', 'solution', 'current'); expect(text(s.skill('inputPower'))).toMatch(/solution/i);
    expect(s.find(n => n.props?.['data-ml-power-map-saved'] !== undefined)?.props).toMatchObject({ 'data-ml-power-map-saved': 1, 'data-ml-power-map-checked': 0, 'data-ml-power-map-solutions': 1 });
    s.edit('answer', '50'); s.edit('unit', 'W'); s.click('check'); s.click('save'); status(s, 'inputPower', 'solution', 'current');
    expect(s.state().benchPowerRecords.windlass.inputPower).toMatchObject({ completion: 'solution', hint: 1 });
  });
  it('retains fixed evidence and marks an earlier setup after relevant geometry changes', () => {
    const fixed = record(), s = session('windlass', { benchPowerRecords: { windlass: { inputPower: fixed } } }); status(s, 'inputPower', 'checked', 'current');
    for (const patch of [{ windlassHandleR: 0.6 }, { windlassDrumR: 0.15 }, { windlassLoad: 500 }, { loadDistance: 1 }]) {
      s.patch({ ...BASE, ...patch }); status(s, 'inputPower', 'checked', 'earlier'); expect(text(s.skill('inputPower'))).toMatch(/earlier/i); expect(s.state().benchPowerRecords.windlass.inputPower).toBe(fixed);
    }
    s.patch(BASE); status(s, 'inputPower', 'checked', 'current');
    s.patch({ screwLoad: 3000 }); status(s, 'inputPower', 'checked', 'current');
  });
  it.each([['percent', '40'], ['duration', '10'], ['budget', '200']])('marks saved work as earlier when %s changes', (field, value) => {
    const fixed = record(), s = session('windlass', { benchPowerRecords: { windlass: { inputPower: fixed } } }); s.edit(field, value);
    status(s, 'inputPower', 'checked', 'earlier'); expect(s.state().benchPowerRecords.windlass.inputPower).toBe(fixed);
  });
  it('compares numeric assumptions and seconds rather than input spelling or time-unit labels', () => {
    // A two-minute, 400 N * 0.5 m task has input power 250 J / 120 s.
    const fixed = record({ seconds: 120, answer: String(250 / 120) });
    const s = session('windlass', { benchPowerRecords: { windlass: { inputPower: fixed } }, benchPower: { windlass: { percent: '80.0', duration: '2', timeUnit: 'min', budget: '100.00' } } });
    status(s, 'inputPower', 'checked', 'current'); s.edit('timeUnit', 's'); status(s, 'inputPower', 'checked', 'earlier');
    s.edit('duration', '120.0'); status(s, 'inputPower', 'checked', 'current');
  });
  it('ignores malformed or arithmetically invalid saved evidence without changing storage', () => {
    const s = session();
    for (const patch of [{ version: 3 }, { benchId: 'screw' }, { question: 'turns' }, { answer: '999' }, { unit: 'J' }, { hint: 3 }, { seconds: 0 }, { settings: { windlassLoad: 400 } }, { completion: 'mastered' }]) {
      const saved = { windlass: { inputPower: record(patch) } }; s.patch({ benchPowerRecords: saved }); status(s, 'inputPower', 'unsaved', 'none'); expect(s.state().benchPowerRecords).toBe(saved);
    }
  });
  it('preserves other station records and never borrows their status', () => {
    const fixed = record(), saved = { windlass: { inputPower: fixed }, screw: { unrelatedNote: 'retained' } };
    const s = session('windlass', { benchPowerRecords: saved }); status(s, 'inputPower', 'checked', 'current'); s.patch({ bench: 'screw' }); status(s, 'inputPower', 'unsaved', 'none');
    s.choose('omega'); expect(s.state().benchPowerRecords).toBe(saved); s.patch({ bench: 'windlass' }); status(s, 'inputPower', 'checked', 'current');
  });
});
