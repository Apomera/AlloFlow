import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Independent ideal-machine formulas and documented native task-control ranges.
const BENCHES = [
  { id: 'lever', control: 'leverEffortArm', load: 'leverLoad', min: 10, max: 1000, step: 10,
    settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 }, ma: d => d.leverEffortArm / d.leverLoadArm },
  { id: 'pulley', control: 'pulleySegments', load: 'pulleyLoad', min: 10, max: 1000, step: 10,
    settings: { pulleySegments: 2, pulleyLoad: 400 }, ma: d => d.pulleySegments },
  { id: 'windlass', control: 'windlassHandleR', load: 'windlassLoad', min: 10, max: 1000, step: 10,
    settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 }, ma: d => d.windlassHandleR / d.windlassDrumR },
  { id: 'ramp', control: 'rampLength', load: 'rampLoad', min: 10, max: 1000, step: 10,
    settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 }, ma: d => d.rampLength / d.rampHeight },
  { id: 'wedge', control: 'wedgeLength', load: 'wedgeLoad', min: 10, max: 2000, step: 10,
    settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 }, ma: d => d.wedgeLength / d.wedgeThickness },
  { id: 'screw', control: 'screwPitch', load: 'screwLoad', min: 50, max: 5000, step: 50,
    settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 }, ma: d => 2 * Math.PI * d.screwHandleR / d.screwPitch }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
const CASES = BENCHES.flatMap(b => ['load', 'movement'].map(kind => ({ b, kind, name: `${b.id}/${kind}` })));
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function session(b = BENCHES[0], extra = {}, force = 5000, travel = 300) {
  const store = newStore({ machineLab: { view: 'machines', bench: b.id, bandOverride: 'g68', ...BASE,
    benchDesignLimits: { [b.id]: { force: String(force), travel: String(travel), control: b.control } }, ...extra } });
  const render = () => tool.render(makeCtx({}, store));
  const find = predicate => nodes(render()).find(predicate);
  return { render, find, state: () => store.toolData.machineLab,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    panel: () => find(n => n.props?.['data-ml-task-capacity'] === store.toolData.machineLab.bench),
    card: kind => find(n => n.props?.['data-ml-capacity-kind'] === kind),
    use: kind => find(n => n.type === 'button' && n.props['data-ml-capacity-use'] === kind),
    undo: () => find(n => n.type === 'button' && n.props['data-ml-design-undo-use'] === store.toolData.machineLab.bench),
    button: label => find(n => n.type === 'button' && text(n) === label),
    invoke: n => n.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }) };
}
function settings(state, b) { return Object.fromEntries([...Object.keys(b.settings), 'loadDistance'].map(k => [k, state[k]])); }
function metric(card, kind) {
  const row = nodes(card).find(n => n.props?.['data-ml-capacity-metric'] === kind);
  expect(row, `Missing capacity metric ${kind}`).toBeTruthy();
  return { before: Number(row.props['data-before']), after: Number(row.props['data-after']), text: text(row) };
}
function limited(b, kind, extra = {}) {
  const ma = b.ma(BASE), value = kind === 'load' ? b.max * 0.63 : 1.3;
  const force = kind === 'load' ? (value + b.step * 0.4) / ma : BASE[b.load] / ma * 1.1;
  const travel = kind === 'load' ? BASE.loadDistance * ma * 1.1 : 1.35 * ma;
  return { s: session(b, extra, force, travel), value, force, travel };
}
function saved(b = BENCHES[0], note = 'Original design reasoning.') {
  return { benchId: b.id, settings: { ...b.settings, loadDistance: 0.5 }, limits: { force: 5000, travel: 300 }, control: b.control, note };
}

describe('Machine Lab: largest task that fits', () => {
  it.each(CASES)('finds the largest legal $name increment with independent force, travel and work', ({ b, kind }) => {
    const { s, value, force, travel } = limited(b, kind), original = s.state(), card = s.card(kind);
    const key = kind === 'load' ? b.load : 'loadDistance', step = kind === 'load' ? b.step : 0.1;
    const changed = { ...original, [key]: value }, ma = b.ma(original);
    expect(card).toBeTruthy(); expect(card.props).toMatchObject({ role: 'group', 'data-key': key,
      'data-available': 'true', 'data-current': 'false', 'data-boundary': kind === 'load' ? 'force' : 'travel' });
    expect(card.props['aria-label']).toBeTruthy(); expect(Number(card.props['data-value'])).toBeCloseTo(value, 11);
    const expected = { force: [original[b.load] / ma, changed[b.load] / ma],
      travel: [original.loadDistance * ma, changed.loadDistance * ma],
      work: [original[b.load] * original.loadDistance, changed[b.load] * changed.loadDistance] };
    for (const [name, [before, after]] of Object.entries(expected)) {
      expect(metric(card, name).before).toBeCloseTo(before, 10); expect(metric(card, name).after).toBeCloseTo(after, 10);
    }
    expect(metric(card, 'force').after).toBeLessThanOrEqual(force);
    expect(metric(card, 'travel').after).toBeLessThanOrEqual(travel);
    expect(metric(card, 'force').after * metric(card, 'travel').after).toBeCloseTo(metric(card, 'work').after, 9);
    const held = metric(card, kind === 'load' ? 'travel' : 'force'); expect(held.after).toBe(held.before);
    expect(Number(card.props['data-next-value'])).toBeCloseTo(value + step, 11);
    const next = { ...changed, [key]: value + step };
    expect(Number(card.props['data-next-force'])).toBeCloseTo(next[b.load] / ma, 9);
    expect(Number(card.props['data-next-travel'])).toBeCloseTo(next.loadDistance * ma, 9);
    expect(kind === 'load' ? Number(card.props['data-next-force']) > force : Number(card.props['data-next-travel']) > travel).toBe(true);
    expect(s.state()).toBe(original); expect(s.use(kind).props.disabled).toBe(false);
  });

  it.each(CASES)('includes an exactly fitting $name boundary without advancing to the next step', ({ b, kind }) => {
    const value = kind === 'load' ? b.max * 0.63 : 1.3, ma = b.ma(BASE);
    const force = (kind === 'load' ? value : BASE[b.load]) / ma;
    const travel = (kind === 'movement' ? value : BASE.loadDistance) * ma;
    const s = session(b, {}, force, travel), card = s.card(kind);
    expect(Number(card.props['data-value'])).toBeCloseTo(value, 11);
    expect(card.props['data-available']).toBe('true'); expect(s.use(kind).props.disabled).toBe(false);
    s.invoke(s.use(kind)); expect(s.find(n => n.props?.['data-ml-design-fit'] !== undefined).props['data-ml-design-fit']).toBe('true');
  });

  it.each(CASES)('labels the $name slider maximum as a range boundary without inventing a next step', ({ b, kind }) => {
    // Shorter screw radius keeps its full 3 m movement range below the 300 m travel limit.
    const s = session(b, b.id === 'screw' ? { screwHandleR: 0.05 } : {}), card = s.card(kind);
    expect(card.props).toMatchObject({ 'data-available': 'true', 'data-boundary': 'range' });
    expect(Number(card.props['data-value'])).toBe(kind === 'load' ? b.max : 3);
    for (const key of ['data-next-value', 'data-next-force', 'data-next-travel']) expect(card.props[key]).toBeUndefined();
  });

  it.each(BENCHES)('nests the $id capacity panel inside the existing closed task disclosure and gates younger bands', b => {
    for (const bandOverride of ['g68', 'g912']) {
      const s = session(b, { bandOverride }), panel = s.panel();
      expect(panel.props.role).toBe('group'); expect(panel.props['aria-label']).toBeTruthy(); expect(text(panel)).toContain('Find a task that fits');
      const trials = s.find(n => n.props?.['data-ml-task-trials'] === b.id);
      expect(trials.type).toBe('details'); expect(trials.props.open).not.toBe(true);
      expect(nodes(trials).some(n => n.props?.['data-ml-task-capacity'] === b.id)).toBe(true);
      expect(nodes(panel).filter(n => n.props?.['data-ml-capacity-kind'] !== undefined)).toHaveLength(2);
      expect(s.card('load').props['aria-label']).not.toBe(s.card('movement').props['aria-label']);
    }
    for (const bandOverride of ['k2', 'g35']) expect(session(b, { bandOverride }).panel()).toBeUndefined();
  });

  it.each([
    ['blank force', { benchDesignLimits: { lever: { force: '', travel: '3' } } }],
    ['zero travel', { benchDesignLimits: { lever: { force: '100', travel: '0' } } }],
    ['force outside range', { benchDesignLimits: { lever: { force: '5001', travel: '3' } } }],
    ['non-finite geometry', { leverEffortArm: Infinity }], ['missing geometry', { leverLoadArm: null }],
    ['invalid load', { leverLoad: 0 }], ['invalid movement', { loadDistance: 3.1 }]
  ])('omits numeric capacity for %s', (_label, extra) => {
    const s = session(BENCHES[0], extra); expect(s.panel()).toBeUndefined(); expect(s.card('load')).toBeUndefined(); expect(s.use('movement')).toBeUndefined();
  });

  it('omits capacity for a ramp shorter than its rise', () => {
    const s = session(BENCHES[3], { rampLength: 1, rampHeight: 2 }); expect(s.panel()).toBeUndefined();
  });

  it('keeps an irrational screw boundary below the next setting despite rounded display equivalence', () => {
    const b = BENCHES[5], ma = b.ma(BASE), travel = 1.4 * ma - 0.0001;
    const s = session(b, {}, 5000, travel), card = s.card('movement');
    expect(Number(card.props['data-value'])).toBe(1.3); expect(Number(card.props['data-next-value'])).toBe(1.4);
    expect(Number(card.props['data-next-travel'])).toBeGreaterThan(travel);
    expect(Number(card.props['data-next-travel']).toFixed(3)).toBe(travel.toFixed(3));
  });
});

describe('Machine Lab: task reduction and honest boundaries', () => {
  it.each(['load', 'movement'])('can reduce %s to fit when the current ideal-work budget is impossible', kind => {
    const s = kind === 'load' ? session(BENCHES[0], {}, 100, 1) : session(BENCHES[0], {}, 200, 0.6);
    expect(s.find(n => n.props?.['data-ml-design-impossible'] !== undefined)).toBeTruthy();
    const card = s.card(kind), key = kind === 'load' ? 'leverLoad' : 'loadDistance';
    expect(card.props['data-available']).toBe('true'); expect(Number(card.props['data-value'])).toBe(kind === 'load' ? 200 : 0.3);
    expect(Number(card.props['data-value'])).toBeLessThan(s.state()[key]);
    s.invoke(s.use(kind)); expect(s.find(n => n.props?.['data-ml-design-fit'] !== undefined).props['data-ml-design-fit']).toBe('true');
  });

  it.each(CASES)('identifies the held limit that no $name change can repair', ({ b, kind }) => {
    const ma = b.ma(BASE), force = BASE[b.load] / ma * (kind === 'movement' ? 0.5 : 1.1);
    const travel = BASE.loadDistance * ma * (kind === 'load' ? 0.5 : 1.1);
    const s = session(b, {}, force, travel), card = s.card(kind), before = s.state();
    expect(card.props).toMatchObject({ 'data-available': 'false', 'data-current': 'false', 'data-boundary': kind === 'load' ? 'held-travel' : 'held-force' });
    expect(card.props['data-value']).toBeUndefined(); expect(s.use(kind).props.disabled).toBe(true);
    expect(text(card)).not.toMatch(/NaN|Infinity/); expect(text(card).length).toBeGreaterThan(40);
    s.invoke(s.use(kind)); expect(s.state()).toBe(before); expect(s.state().benchDesignUndo).toBeUndefined();
  });

  it.each(['load', 'movement'])('distinguishes a failing minimum %s from a held-limit blocker', kind => {
    const s = kind === 'load' ? session(BENCHES[0], {}, 1, 3) : session(BENCHES[0], {}, 5000, 0.1);
    const card = s.card(kind), before = s.state();
    expect(card.props).toMatchObject({ 'data-available': 'false', 'data-current': 'false', 'data-boundary': 'minimum' });
    expect(card.props['data-value']).toBeUndefined(); expect(s.use(kind).props.disabled).toBe(true);
    s.invoke(s.use(kind)); expect(s.state()).toBe(before); expect(s.state().benchDesignUndo).toBeUndefined();
  });

  it.each(CASES)('finds a legal $name setting from imported off-grid task values and can undo exactly', ({ b, kind }) => {
    const key = kind === 'load' ? b.load : 'loadDistance', imported = kind === 'load' ? BASE[b.load] + 1 : 0.56;
    const { s, value } = limited(b, kind, { [key]: imported });
    expect(Number(s.card(kind).props['data-value'])).toBeCloseTo(value, 10); expect(s.use(kind).props.disabled).toBe(false);
    s.invoke(s.use(kind)); expect(s.state()[key]).toBeCloseTo(value, 10);
    s.invoke(s.undo()); expect(s.state()[key]).toBe(imported);
  });

  it.each(['load', 'movement'])('reports an already maximal %s as available/current and leaves state and checkpoint untouched', kind => {
    const key = kind === 'load' ? 'leverLoad' : 'loadDistance', { s, value } = limited(BENCHES[0], kind);
    s.invoke(s.use(kind)); const before = s.state(), checkpoint = before.benchDesignUndo.lever;
    expect(before[key]).toBe(value); expect(s.card(kind).props).toMatchObject({ 'data-available': 'true', 'data-current': 'true' });
    expect(s.use(kind).props.disabled).toBe(true); s.invoke(s.use(kind));
    expect(s.state()).toBe(before); expect(s.state().benchDesignUndo.lever).toBe(checkpoint);
  });
});

describe('Machine Lab: guarded capacity application', () => {
  it.each(CASES)('applies and undoes only the $name task setting with fresh bounded snapshots', ({ b, kind }) => {
    const { s, value } = limited(b, kind), before = s.state(), key = kind === 'load' ? b.load : 'loadDistance';
    s.invoke(s.use(kind)); const applied = s.state(), checkpoint = applied.benchDesignUndo[b.id];
    expect(applied[key]).toBeCloseTo(value, 10);
    for (const field of Object.keys(BASE).filter(field => field !== key)) expect(applied[field], field).toBe(before[field]);
    expect(applied.benchDesignLimits).toBe(before.benchDesignLimits);
    expect(checkpoint).toEqual({ benchId: b.id, key, before: settings(before, b), after: settings(applied, b) });
    expect(checkpoint.before).not.toBe(checkpoint.after); expect(checkpoint.before).not.toBe(before);
    s.invoke(s.undo()); expect(settings(s.state(), b)).toEqual(settings(before, b)); expect(s.state().benchDesignUndo[b.id]).toBeUndefined();
  });

  it.each([
    ['selected geometry', { leverEffortArm: 2.1 }], ['other geometry', { leverLoadArm: 1.1 }],
    ['load', { leverLoad: 500 }], ['movement', { loadDistance: 0.6 }],
    ['force limit', { benchDesignLimits: { lever: { force: '4000', travel: '300', control: 'leverEffortArm' } } }],
    ['travel limit', { benchDesignLimits: { lever: { force: '5000', travel: '200', control: 'leverEffortArm' } } }],
    ['selected control', { benchDesignLimits: { lever: { force: '5000', travel: '300', control: 'leverLoadArm' } } }],
    ['invalid force draft', { benchDesignLimits: { lever: { force: '', travel: '300', control: 'leverEffortArm' } } }],
    ['station', { bench: 'pulley' }], ['view', { view: 'learn', manualTopic: 'record' }]
  ])('rejects old capacity buttons after %s changes', (_label, patch) => {
    for (const kind of ['load', 'movement']) {
      const s = session(), button = s.use(kind); expect(button.props.disabled).toBe(false);
      s.patch(patch); const latest = s.state(); s.invoke(button); expect(s.state()).toBe(latest); expect(latest.benchDesignUndo).toBeUndefined();
    }
  });

  it.each(['load', 'movement'])('rejects a repeated captured %s click after applying it once', kind => {
    const s = session(), button = s.use(kind); s.invoke(button); const before = s.state(), checkpoint = before.benchDesignUndo.lever;
    s.invoke(button); expect(s.state()).toBe(before); expect(s.state().benchDesignUndo.lever).toBe(checkpoint);
  });

  it.each(['load', 'movement'])('preserves latest writing, recorded evidence, other checkpoints and current limit drafts through %s Apply/Undo', kind => {
    const previous = saved(), current = { ...saved(BENCHES[0], 'Revised reasoning.'), previous };
    const records = { lever: current, pulley: saved(BENCHES[1]) };
    const references = { lever: { ...previous.settings } };
    const experiments = { lever: { benchId: 'lever', before: { settings: { ...previous.settings } }, after: { settings: { ...previous.settings, leverEffortArm: 3 } }, note: 'Comparison reasoning.' } };
    const investigations = { lever: { id: 'lever-one-change-v1', force: 'less', distance: 'more', tested: true, explanation: 'Prediction reasoning.' } };
    const pulleyPoint = { benchId: 'pulley', key: 'pulleyLoad', before: { ...BENCHES[1].settings, loadDistance: 0.5 }, after: { ...BENCHES[1].settings, pulleyLoad: 800, loadDistance: 0.5 } };
    const s = session(BENCHES[0], { benchDesignRecords: records, benchReferences: references, benchExperiments: experiments,
      benchInvestigations: investigations, benchDesignUndo: { pulley: pulleyPoint }, iqExplanation: 'Earlier writing.',
      shopAnimating: true, shopMotionProgress: 0.9, shopClueBench: 'lever', benchPrediction: '200', benchChoice: 'far', benchResult: { correct: true } });
    const button = s.use(kind), latestRecords = { ...records, lever: { ...current, note: 'Latest design writing.' } };
    s.patch({ iqExplanation: 'Latest unrelated writing.', benchDesignRecords: latestRecords }); s.invoke(button);
    expect(s.state()).toMatchObject({ shopAnimating: false, shopMotionProgress: 0.5, shopClueBench: null, benchPrediction: '', benchChoice: null, benchResult: null });
    const latestLimits = { lever: { force: '', travel: '2', control: 'leverLoadArm' } };
    s.patch({ benchDesignLimits: latestLimits }); expect(s.undo().props.disabled).toBe(false); s.invoke(s.undo());
    expect(s.state().benchDesignLimits).toBe(latestLimits); expect(s.state().iqExplanation).toBe('Latest unrelated writing.');
    expect(s.state().benchDesignRecords).toBe(latestRecords); expect(s.state().benchDesignRecords.lever.previous).toBe(previous);
    expect(s.state().benchReferences).toBe(references); expect(s.state().benchExperiments).toBe(experiments); expect(s.state().benchInvestigations).toBe(investigations);
    expect(s.state().benchDesignUndo.pulley).toBe(pulleyPoint); expect(s.state().benchDesignUndo.lever).toBeUndefined();
  });

  it.each(['load', 'movement'])('records capacity-driven %s changes as changed tasks with no geometry changes', kind => {
    const original = saved(), s = session(BENCHES[0], { benchDesignRecords: { lever: original } });
    s.invoke(s.use(kind)); const live = s.find(n => n.props?.['data-ml-design-comparison'] === 'live');
    expect(live.props).toMatchObject({ 'data-same-task': 'false', 'data-same-limits': 'true', 'data-geometry-changes': 0 });
    s.invoke(s.button('Replace design record')); const current = s.state().benchDesignRecords.lever;
    expect(current.previous.settings).toEqual(original.settings); expect(current.previous.note).toBe(original.note);
    const key = kind === 'load' ? 'leverLoad' : 'loadDistance'; expect(current.settings[key]).toBe(s.state()[key]);
    const revision = s.find(n => n.props?.['data-ml-design-comparison'] === 'revision');
    expect(revision.props).toMatchObject({ 'data-same-task': 'false', 'data-same-limits': 'true', 'data-geometry-changes': 0 });
    s.invoke(s.undo()); expect(s.state().benchDesignRecords.lever).toBe(current); expect(current.settings[key]).not.toBe(s.state()[key]);
  });
});
