import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Independent station formulas and legal slider grids: no production math helpers.
const BENCHES = [
  { id: 'lever', load: 'leverLoad', settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 },
    controls: [{ key: 'leverEffortArm', min: 0.2, max: 4, step: 0.1 }, { key: 'leverLoadArm', min: 0.2, max: 4, step: 0.1 }], ma: d => d.leverEffortArm / d.leverLoadArm },
  { id: 'pulley', load: 'pulleyLoad', settings: { pulleySegments: 2, pulleyLoad: 400 },
    controls: [{ key: 'pulleySegments', min: 1, max: 6, step: 1 }], ma: d => d.pulleySegments },
  { id: 'windlass', load: 'windlassLoad', settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 },
    controls: [{ key: 'windlassHandleR', min: 0.05, max: 0.8, step: 0.05 }, { key: 'windlassDrumR', min: 0.02, max: 0.4, step: 0.01 }], ma: d => d.windlassHandleR / d.windlassDrumR },
  { id: 'ramp', load: 'rampLoad', settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 },
    controls: [{ key: 'rampLength', min: 0.5, max: 8, step: 0.1 }, { key: 'rampHeight', min: 0.2, max: 4, step: 0.1 }], ma: d => d.rampHeight <= d.rampLength ? d.rampLength / d.rampHeight : null },
  { id: 'wedge', load: 'wedgeLoad', settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 },
    controls: [{ key: 'wedgeLength', min: 0.05, max: 0.6, step: 0.01 }, { key: 'wedgeThickness', min: 0.01, max: 0.2, step: 0.005 }], ma: d => d.wedgeLength / d.wedgeThickness },
  { id: 'screw', load: 'screwLoad', settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 },
    controls: [{ key: 'screwHandleR', min: 0.02, max: 0.5, step: 0.01 }, { key: 'screwPitch', min: 0.001, max: 0.02, step: 0.001 }], ma: d => 2 * Math.PI * d.screwHandleR / d.screwPitch }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
const CONTROLS = BENCHES.flatMap(b => b.controls.map(c => ({ b, c, name: `${b.id}/${c.key}` })));
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function session(extra = {}) {
  const store = newStore({ machineLab: { view: 'machines', bench: 'lever', bandOverride: 'g68', ...BASE,
    benchDesignLimits: { lever: { force: '5000', travel: '300', control: 'leverEffortArm' } }, ...extra } });
  const render = () => tool.render(makeCtx({}, store));
  const find = predicate => nodes(render()).find(predicate);
  return { state: () => store.toolData.machineLab, render, find,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    panel: () => find(n => n.props?.['data-ml-design-options'] === store.toolData.machineLab.bench),
    cards: () => nodes(render()).filter(n => n.props?.['data-ml-design-option'] !== undefined),
    use: value => find(n => n.type === 'button' && Number(n.props['data-ml-design-use']) === value),
    invoke: node => node.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }),
    button: label => find(n => n.type === 'button' && text(n) === label)
  };
}
function fixture(b, c, extra = {}, force = 5000, travel = 300) {
  return session({ bench: b.id, benchDesignLimits: { [b.id]: { force: String(force), travel: String(travel), control: c.key } }, ...extra });
}
function enumeration(b, c, setup, forceLimit = 5000, travelLimit = 300) {
  const result = [];
  for (let tick = 0; tick <= Math.round((c.max - c.min) / c.step); tick++) {
    const value = Number((c.min + tick * c.step).toFixed(10));
    const state = { ...setup, [c.key]: value }, ma = b.ma(state);
    if (!ma) continue;
    const force = state[b.load] / ma, travel = state.loadDistance * ma;
    if (force <= forceLimit + 1e-8 && travel <= travelLimit + 1e-8) result.push({ value, force, travel });
  }
  return result;
}
function goals(card) { return card.props['data-goals'].split(' '); }
function cardFor(s, goal) { return s.cards().find(n => goals(n).includes(goal)); }
function value(card) { return Number(card.props['data-ml-design-option']); }

describe('Machine Lab: bounded working design choices', () => {
  it.each(CONTROLS)('finds real force/travel extrema and the nearest legal $name setting', ({ b, c }) => {
    const s = fixture(b, c), candidates = enumeration(b, c, BASE), cards = s.cards();
    const force = [...candidates].sort((a, z) => a.force - z.force || a.value - z.value)[0];
    const travel = [...candidates].sort((a, z) => a.travel - z.travel || a.value - z.value)[0];
    const nearest = [...candidates].sort((a, z) => Math.abs(a.value - BASE[c.key]) - Math.abs(z.value - BASE[c.key]) || a.value - z.value)[0];
    expect(value(cardFor(s, 'force'))).toBe(force.value);
    expect(value(cardFor(s, 'travel'))).toBe(travel.value);
    expect(value(cardFor(s, 'nearest'))).toBe(nearest.value);
    expect(cards).toHaveLength(new Set([force.value, travel.value, nearest.value]).size);
    expect(cards.length).toBeLessThanOrEqual(3);
    expect(Number(s.panel().props['data-count'])).toBe(cards.length);
    for (const card of cards) {
      const candidate = candidates.find(c => c.value === value(card));
      expect(candidate).toBeTruthy();
      expect(card.props.role).toBe('group');
      expect(card.props['aria-label']).toContain(goals(card).includes('force') ? 'Least effort' : goals(card).includes('travel') ? 'Shortest travel' : 'Closest setting');
      expect(Number(card.props['data-force'])).toBeCloseTo(candidate.force, 10);
      expect(Number(card.props['data-travel'])).toBeCloseTo(candidate.travel, 10);
      expect(Number(card.props['data-force-margin'])).toBeCloseTo(5000 - candidate.force, 10);
      expect(Number(card.props['data-travel-margin'])).toBeCloseTo(300 - candidate.travel, 10);
      expect(candidate.force * candidate.travel).toBeCloseTo(BASE[b.load] * BASE.loadDistance, 9);
      expect(value(card)).toBeGreaterThanOrEqual(c.min); expect(value(card)).toBeLessThanOrEqual(c.max);
      expect((value(card) - c.min) / c.step).toBeCloseTo(Math.round((value(card) - c.min) / c.step), 8);
    }
  });

  it.each(CONTROLS)('applies one legal $name choice while preserving the fixed task and other geometry', ({ b, c }) => {
    const s = fixture(b, c), choice = s.cards().find(n => n.props['data-current'] === 'false');
    expect(choice).toBeTruthy();
    const before = { ...s.state() }, selected = value(choice), button = s.use(selected);
    expect(button.props.disabled).toBe(false); expect(text(button)).toMatch(/^Use .+: /);
    s.invoke(button);
    expect(s.state()[c.key]).toBe(selected);
    for (const key of Object.keys(BASE).filter(key => key !== c.key)) expect(s.state()[key], key).toBe(before[key]);
    expect(s.state().benchDesignLimits).toBe(before.benchDesignLimits);
    expect(cardFor(s, 'nearest').props['data-current']).toBe('true');
    expect(s.use(selected).props.disabled).toBe(true);
  });

  it.each(BENCHES)('starts the $id options closed in quantitative bands and omits them in younger bands', b => {
    for (const bandOverride of ['g68', 'g912']) {
      const s = fixture(b, b.controls[0], { bandOverride });
      expect(s.panel().type).toBe('details'); expect(s.panel().props.open).not.toBe(true);
      expect(text(nodes(s.panel()).find(n => n.type === 'summary'))).toBe('Explore working designs');
      expect(text(s.panel())).toContain('Least effort'); expect(text(s.panel())).toContain('Shortest travel');
      expect(text(s.panel())).toContain('Closest setting');
    }
    for (const bandOverride of ['k2', 'g35']) expect(fixture(b, b.controls[0], { bandOverride }).panel()).toBeUndefined();
  });

  it('makes the force-versus-travel tradeoff explicit while every option meets the constraints', () => {
    const s = session({ benchDesignLimits: { lever: { force: '400', travel: '2', control: 'leverEffortArm' } } });
    const force = cardFor(s, 'force'), travel = cardFor(s, 'travel'), nearest = cardFor(s, 'nearest');
    expect([value(force), value(travel), value(nearest)]).toEqual([4, 1, 2]);
    expect(Number(force.props['data-force'])).toBeLessThan(Number(travel.props['data-force']));
    expect(Number(force.props['data-travel'])).toBeGreaterThan(Number(travel.props['data-travel']));
    expect(text(s.panel())).toContain('Less effort requires more hand travel');
    for (const card of s.cards()) { expect(Number(card.props['data-force-margin'])).toBeGreaterThanOrEqual(0); expect(Number(card.props['data-travel-margin'])).toBeGreaterThanOrEqual(0); }
  });

  it('deduplicates all three goals at the sole legal setting and reports exact zero margins', () => {
    const s = session({ benchDesignLimits: { lever: { force: '200', travel: '1', control: 'leverEffortArm' } } });
    expect(s.cards()).toHaveLength(1);
    expect(s.cards()[0].props).toMatchObject({ 'data-goals': 'force travel nearest', 'data-current': 'true', 'data-force-margin': 0, 'data-travel-margin': 0 });
    expect(value(s.cards()[0])).toBe(2);
  });

  it('merges the nearest goal with an extreme and leaves only two distinct choices', () => {
    const s = session({ leverEffortArm: 4 });
    expect(s.cards()).toHaveLength(2);
    expect(goals(cardFor(s, 'force'))).toEqual(['force', 'nearest']);
    expect(value(cardFor(s, 'force'))).toBe(4);
  });

  it.each([[2.26, 2.3], [2.25, 2.2]])('selects the closest legal increment to an off-grid value %s with lower-value ties', (current, expected) => {
    const s = session({ leverEffortArm: current });
    expect(value(cardFor(s, 'nearest'))).toBe(expected);
    expect(cardFor(s, 'nearest').props['data-current']).toBe('false');
    expect(s.state().leverEffortArm).toBe(current);
  });

  it('does not use rounded displayed values to admit a screw choice outside the travel limit', () => {
    const b = BENCHES.find(b => b.id === 'screw'), c = b.controls[1];
    const exactTravel = Math.PI * 0.15 / 0.005;
    const s = fixture(b, c, {}, 100, Number(exactTravel.toFixed(3)) - 0.001);
    const expected = enumeration(b, c, BASE, 100, Number(exactTravel.toFixed(3)) - 0.001);
    expect(value(cardFor(s, 'force'))).toBe(expected[0].value);
    expect(value(cardFor(s, 'force'))).toBe(0.006);
    expect(Number(cardFor(s, 'force').props['data-travel'])).toBeCloseTo(Math.PI * 0.15 / 0.006, 10);
  });

  it('normalizes round-off tolerance at a limit instead of exposing a negative margin', () => {
    const s = session({ benchDesignLimits: { lever: { force: '199.99999999999997', travel: '1', control: 'leverEffortArm' } } });
    expect(s.cards()).toHaveLength(1);
    expect(s.cards()[0].props['data-force-margin']).toBe(0);
    expect(s.cards()[0].props['data-travel-margin']).toBe(0);
  });

  it('keeps the original nearest suggestion available when the current setup fails', () => {
    const s = session({ benchDesignLimits: { lever: { force: '100', travel: '3', control: 'leverLoadArm' } } });
    const oldSuggestion = s.find(n => n.props?.['data-ml-design-suggestion'] === 'leverLoadArm');
    expect(s.button('Apply suggested setting')).toBeTruthy();
    expect(value(cardFor(s, 'nearest'))).toBe(Number(oldSuggestion.props['data-value']));
    expect(value(cardFor(s, 'nearest'))).toBe(0.5);
  });

  it.each([
    ['empty force', { benchDesignLimits: { lever: { force: '', travel: '3' } } }],
    ['out-of-range travel', { benchDesignLimits: { lever: { force: '100', travel: '301' } } }],
    ['invalid geometry', { leverLoadArm: 0 }],
    ['impossible work budget', { benchDesignLimits: { lever: { force: '100', travel: '1' } } }],
    ['unreachable selected geometry', { leverLoadArm: 4, benchDesignLimits: { lever: { force: '100', travel: '3' } } }],
    ['no whole pulley count', { bench: 'pulley', pulleyLoad: 420, benchDesignLimits: { pulley: { force: '200', travel: '1.25' } } }],
    ['fitting off-grid setup without a legal slider increment', { leverEffortArm: 2.05, benchDesignLimits: { lever: { force: String(400 / 2.05), travel: '1.025' } } }]
  ])('offers no actionable working options for %s', (_label, extra) => {
    const s = session(extra);
    expect(s.panel()).toBeUndefined(); expect(s.cards()).toEqual([]);
    expect(s.find(n => n.props?.['data-ml-design-use'] !== undefined)).toBeUndefined();
  });
});

describe('Machine Lab: deliberate application preserves learner evidence', () => {
  it('makes the current-setting button a disabled no-op even if its callback is invoked', () => {
    const s = session({ shopAnimating: true, shopMotionProgress: 0.8, benchPrediction: '200', benchChoice: 'far', benchResult: { correct: true } });
    const current = cardFor(s, 'nearest'), button = s.use(value(current));
    expect(current.props['data-current']).toBe('true'); expect(button.props.disabled).toBe(true);
    expect(text(button)).toBe('Current setting');
    const original = s.state(); s.invoke(button); expect(s.state()).toBe(original);
  });

  it.each([
    ['selected geometry', { leverEffortArm: 2.1 }], ['other geometry', { leverLoadArm: 1.1 }],
    ['load', { leverLoad: 500 }], ['load movement', { loadDistance: 0.6 }],
    ['force limit', { benchDesignLimits: { lever: { force: '4000', travel: '300', control: 'leverEffortArm' } } }],
    ['travel limit', { benchDesignLimits: { lever: { force: '5000', travel: '200', control: 'leverEffortArm' } } }],
    ['chosen control', { benchDesignLimits: { lever: { force: '5000', travel: '300', control: 'leverLoadArm' } } }],
    ['station', { bench: 'pulley' }], ['view', { view: 'learn', manualTopic: 'record' }]
  ])('rejects an old option after the %s changes', (_label, patch) => {
    const s = session(), oldUse = s.use(value(cardFor(s, 'force')));
    expect(oldUse.props.disabled).toBe(false); s.patch(patch);
    const original = s.state(); s.invoke(oldUse); expect(s.state()).toBe(original);
  });

  it('pauses halfway and resets live feedback while preserving all snapshots, notes and investigation choices', () => {
    const previous = { benchId: 'lever', settings: { ...BENCHES[0].settings, loadDistance: 0.5 }, limits: { force: 100, travel: 3 }, control: 'leverEffortArm', note: 'First reasoning.' };
    const records = { lever: { ...previous, note: 'Revised reasoning.', previous } };
    const references = { lever: { ...previous.settings } };
    const experiments = { lever: { benchId: 'lever', before: { settings: { ...previous.settings } }, after: { settings: { ...previous.settings, leverEffortArm: 3 } }, note: 'Comparison reasoning.' } };
    const investigations = { lever: { id: 'lever-one-change-v1', force: 'less', distance: 'more', tested: true, explanation: 'Prediction reasoning.' } };
    const s = session({ benchDesignRecords: records, benchReferences: references, benchExperiments: experiments, benchInvestigations: investigations,
      shopAnimating: true, shopMotionProgress: 0.9, shopClueBench: 'lever', benchPrediction: '200', benchChoice: 'far', benchResult: { correct: true }, iqExplanation: 'Earlier writing.' });
    const use = s.use(value(cardFor(s, 'force')));
    s.patch({ iqExplanation: 'Latest unrelated writing.', benchDesignRecords: { ...records, lever: { ...records.lever, note: 'Latest design writing.' } } });
    const latestRecords = s.state().benchDesignRecords;
    s.invoke(use);
    expect(s.state()).toMatchObject({ leverEffortArm: 4, shopAnimating: false, shopMotionProgress: 0.5, shopClueBench: null, benchPrediction: '', benchChoice: null, benchResult: null, iqExplanation: 'Latest unrelated writing.' });
    expect(s.state().benchDesignRecords).toBe(latestRecords); expect(s.state().benchDesignRecords.lever.previous).toBe(previous);
    expect(s.state().benchReferences).toBe(references); expect(s.state().benchExperiments).toBe(experiments); expect(s.state().benchInvestigations).toBe(investigations);
  });
});
