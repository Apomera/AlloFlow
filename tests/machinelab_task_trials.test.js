import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Independent ideal-machine formulas and native task-control ranges.
const BENCHES = [
  { id: 'lever', key: 'leverEffortArm', load: 'leverLoad', max: 1000, step: 10,
    settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 }, ma: d => d.leverEffortArm / d.leverLoadArm },
  { id: 'pulley', key: 'pulleySegments', load: 'pulleyLoad', max: 1000, step: 10,
    settings: { pulleySegments: 2, pulleyLoad: 400 }, ma: d => d.pulleySegments },
  { id: 'windlass', key: 'windlassHandleR', load: 'windlassLoad', max: 1000, step: 10,
    settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 }, ma: d => d.windlassHandleR / d.windlassDrumR },
  { id: 'ramp', key: 'rampLength', load: 'rampLoad', max: 1000, step: 10,
    settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 }, ma: d => d.rampLength / d.rampHeight },
  { id: 'wedge', key: 'wedgeLength', load: 'wedgeLoad', max: 2000, step: 10,
    settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 }, ma: d => d.wedgeLength / d.wedgeThickness },
  { id: 'screw', key: 'screwPitch', load: 'screwLoad', max: 5000, step: 50,
    settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 }, ma: d => 2 * Math.PI * d.screwHandleR / d.screwPitch }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
const TRIALS = BENCHES.flatMap(b => ['load', 'movement'].map(kind => ({ b, kind, name: `${b.id}/${kind}` })));
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function session(b = BENCHES[0], extra = {}, force = 5000, travel = 300) {
  const store = newStore({ machineLab: { view: 'machines', bench: b.id, bandOverride: 'g68', ...BASE,
    benchDesignLimits: { [b.id]: { force: String(force), travel: String(travel), control: b.key } }, ...extra } });
  const render = () => tool.render(makeCtx({}, store));
  const find = predicate => nodes(render()).find(predicate);
  return { render, find, state: () => store.toolData.machineLab,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    panel: () => find(n => n.props?.['data-ml-task-trials'] === b.id),
    trial: kind => find(n => n.props?.['data-ml-task-trial'] === kind),
    use: kind => find(n => n.type === 'button' && n.props['data-ml-task-use'] === kind),
    invoke: node => node.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }),
    button: label => find(n => n.type === 'button' && text(n) === label)
  };
}
function metric(card, kind) {
  const row = nodes(card).find(n => n.props?.['data-ml-task-metric'] === kind);
  expect(row, `Missing task metric ${kind}`).toBeTruthy();
  return { before: Number(row.props['data-before']), after: Number(row.props['data-after']), text: text(row) };
}
function saved(b = BENCHES[0], extra = {}) {
  return { benchId: b.id, settings: { ...b.settings, loadDistance: 0.5 }, limits: { force: 5000, travel: 300 }, control: b.key, note: 'Original design reasoning.', ...extra };
}

describe('Machine Lab: changed-task previews', () => {
  it.each(TRIALS)('previews $name with fixed geometry using independent force, travel and work formulas', ({ b, kind }) => {
    const s = session(b), before = { ...s.state() }, card = s.trial(kind);
    const key = kind === 'load' ? b.load : 'loadDistance', after = { ...before, [key]: before[key] * 2 };
    expect(card).toBeTruthy();
    expect(card.props).toMatchObject({ role: 'group', 'data-key': key, 'data-available': 'true', 'data-fits': 'true' });
    expect(card.props['aria-label']).toBeTruthy(); expect(Number(card.props['data-value'])).toBe(after[key]);
    const mechanicalAdvantage = b.ma(before);
    const expected = {
      force: [before[b.load] / mechanicalAdvantage, after[b.load] / mechanicalAdvantage],
      travel: [before.loadDistance * mechanicalAdvantage, after.loadDistance * mechanicalAdvantage],
      work: [before[b.load] * before.loadDistance, after[b.load] * after.loadDistance]
    };
    for (const [name, [first, second]] of Object.entries(expected)) {
      const actual = metric(card, name);
      expect(actual.before).toBeCloseTo(first, 10); expect(actual.after).toBeCloseTo(second, 10);
    }
    expect(metric(card, 'work').after).toBeCloseTo(2 * metric(card, 'work').before, 10);
    const unchanged = metric(card, kind === 'load' ? 'travel' : 'force');
    expect(unchanged.after).toBe(unchanged.before);
    expect(metric(card, 'force').after * metric(card, 'travel').after).toBeCloseTo(expected.work[1], 9);
    expect(s.state()).toEqual(before);
  });

  it.each(BENCHES)('starts $id trials closed inside the design disclosure in both quantitative bands', b => {
    for (const bandOverride of ['g68', 'g912']) {
      const s = session(b, { bandOverride }), panel = s.panel();
      expect(panel?.type).toBe('details'); expect(panel.props.open).not.toBe(true);
      expect(nodes(panel).filter(n => n.props?.['data-ml-task-trial'] !== undefined)).toHaveLength(2);
      const design = s.find(n => n.props?.['data-ml-design'] === b.id);
      expect(nodes(design).some(n => n.props?.['data-ml-task-trials'] === b.id)).toBe(true);
      expect(nodes(panel).find(n => n.type === 'summary')).toBeTruthy();
      expect(s.trial('load').props['aria-label']).not.toBe(s.trial('movement').props['aria-label']);
    }
    for (const bandOverride of ['k2', 'g35']) expect(session(b, { bandOverride }).panel()).toBeUndefined();
  });

  it.each(['load', 'movement'])('distinguishes the failing %s trial from a baseline exactly at both limits', kind => {
    const s = session(BENCHES[0], {}, 200, 1), card = s.trial(kind);
    expect(s.find(n => n.props?.['data-ml-design-fit'] !== undefined).props['data-ml-design-fit']).toBe('true');
    expect(card.props['data-fits']).toBe('false'); expect(card.props['data-available']).toBe('true');
    expect(metric(card, kind === 'load' ? 'force' : 'travel').text).toContain('Over limit');
    expect(metric(card, kind === 'load' ? 'travel' : 'force').text).toContain('Within limit');
    expect(s.use(kind).props.disabled).toBe(false);
    s.invoke(s.use(kind));
    expect(s.find(n => n.props?.['data-ml-design-fit'] !== undefined).props['data-ml-design-fit']).toBe('false');
  });

  it('retains useful task trials when the force/travel budget makes every geometry infeasible', () => {
    const s = session(BENCHES[0], {}, 100, 1);
    expect(s.find(n => n.props?.['data-ml-design-impossible'] !== undefined)).toBeTruthy();
    expect(s.panel()).toBeTruthy();
    for (const kind of ['load', 'movement']) {
      expect(s.trial(kind).props['data-fits']).toBe('false'); expect(s.use(kind).props.disabled).toBe(false);
    }
    expect(s.find(n => n.props?.['data-ml-design-options'] !== undefined)).toBeUndefined();
  });

  it('keeps a screw trial just outside the true travel limit from passing after display rounding', () => {
    const exactTravel = 2 * Math.PI * BASE.screwHandleR / BASE.screwPitch;
    const s = session(BENCHES[5], {}, 5000, Number(exactTravel.toFixed(3)) - 0.001);
    const card = s.trial('movement');
    expect(metric(card, 'travel').after).toBeCloseTo(exactTravel, 10);
    expect(metric(card, 'travel').text).toContain('Over limit'); expect(card.props['data-fits']).toBe('false');
  });

  it.each([
    ['blank force', { benchDesignLimits: { lever: { force: '', travel: '3' } } }],
    ['zero travel', { benchDesignLimits: { lever: { force: '100', travel: '0' } } }],
    ['force above range', { benchDesignLimits: { lever: { force: '5001', travel: '3' } } }],
    ['zero geometry', { leverLoadArm: 0 }], ['non-finite geometry', { leverEffortArm: Infinity }],
    ['missing imported geometry', { leverEffortArm: null }], ['zero load', { leverLoad: 0 }],
    ['missing imported movement', { loadDistance: null }], ['movement above range', { loadDistance: 3.1 }]
  ])('omits numeric trials for %s', (_label, extra) => {
    const s = session(BENCHES[0], extra);
    expect(s.panel()).toBeUndefined(); expect(s.trial('load')).toBeUndefined(); expect(s.use('movement')).toBeUndefined();
  });

  it('uses existing station defaults when design limits have never been entered', () => {
    const s = session(BENCHES[0], { benchDesignLimits: undefined });
    expect(s.panel()).toBeTruthy(); expect(s.trial('load').props['data-fits']).toBe('false');
    expect(metric(s.trial('load'), 'force').after).toBe(400);
  });
});

describe('Machine Lab: task-setting availability', () => {
  it.each(BENCHES)('keeps an out-of-range doubled $id load as a numeric preview without clamping or applying it', b => {
    const s = session(b, { [b.load]: b.max }), card = s.trial('load'), button = s.use('load');
    expect(Number(card.props['data-value'])).toBe(b.max * 2); expect(card.props['data-available']).toBe('false');
    expect(metric(card, 'force').after).toBeCloseTo(b.max * 2 / b.ma(BASE), 9);
    expect(button.props.disabled).toBe(true); expect(text(card)).toMatch(/outside.*range/i);
    const original = s.state(); s.invoke(button); expect(s.state()).toBe(original);
  });

  it.each(BENCHES)('admits the exact maximum doubled $id load', b => {
    const s = session(b, { [b.load]: b.max / 2 });
    expect(Number(s.trial('load').props['data-value'])).toBe(b.max);
    expect(s.trial('load').props['data-available']).toBe('true'); expect(s.use('load').props.disabled).toBe(false);
    s.invoke(s.use('load')); expect(s.state()[b.load]).toBe(b.max);
  });

  it.each(BENCHES)('does not silently round an imported $id load trial onto the control grid', b => {
    const imported = b.settings[b.load] + 1, s = session(b, { [b.load]: imported }), card = s.trial('load');
    expect(Number(card.props['data-value'])).toBe(imported * 2); expect(card.props['data-available']).toBe('false');
    expect(text(card)).toMatch(/between.*increments/i); expect(s.use('load').props.disabled).toBe(true);
    const original = s.state(); s.invoke(s.use('load')); expect(s.state()).toBe(original);
  });

  it.each([
    { current: 3, next: 6, available: false, reason: /outside.*range/i },
    { current: 1.5, next: 3, available: true },
    { current: 0.56, next: 1.12, available: false, reason: /between.*increments/i },
    { current: 0.55, next: 1.1, available: true },
    { current: 0.3, next: 0.6, available: true }
  ])('uses the movement grid without clamping $current m to $next m', ({ current, next, available, reason }) => {
    const s = session(BENCHES[0], { loadDistance: current }), card = s.trial('movement');
    expect(Number(card.props['data-value'])).toBeCloseTo(next, 12); expect(card.props['data-available']).toBe(String(available));
    expect(s.use('movement').props.disabled).toBe(!available); if (reason) expect(text(card)).toMatch(reason);
    s.invoke(s.use('movement')); expect(s.state().loadDistance).toBeCloseTo(available ? next : current, 12);
  });
});

describe('Machine Lab: deliberate task application', () => {
  it.each(TRIALS)('applies only the selected $name task variable and leaves all geometry, other station settings and limits fixed', ({ b, kind }) => {
    const s = session(b), before = { ...s.state() }, key = kind === 'load' ? b.load : 'loadDistance';
    expect(s.use(kind).props.disabled).toBe(false); s.invoke(s.use(kind));
    expect(s.state()[key]).toBe(before[key] * 2);
    for (const name of Object.keys(BASE).filter(name => name !== key)) expect(s.state()[name], name).toBe(before[name]);
    expect(s.state().benchDesignLimits).toBe(before.benchDesignLimits);
    expect(s.state().bench).toBe(b.id); expect(s.state().view).toBe('machines');
  });

  it.each([
    ['selected geometry', { leverEffortArm: 2.1 }], ['other geometry', { leverLoadArm: 1.1 }],
    ['load', { leverLoad: 500 }], ['movement', { loadDistance: 0.6 }],
    ['force limit', { benchDesignLimits: { lever: { force: '4000', travel: '300', control: 'leverEffortArm' } } }],
    ['travel limit', { benchDesignLimits: { lever: { force: '5000', travel: '200', control: 'leverEffortArm' } } }],
    ['selected control', { benchDesignLimits: { lever: { force: '5000', travel: '300', control: 'leverLoadArm' } } }],
    ['station', { bench: 'pulley' }], ['view', { view: 'learn', manualTopic: 'record' }]
  ])('rejects old trial buttons after the %s changes', (_label, patch) => {
    for (const kind of ['load', 'movement']) {
      const s = session(), oldUse = s.use(kind); expect(oldUse.props.disabled).toBe(false); s.patch(patch);
      const latest = s.state(); s.invoke(oldUse); expect(s.state()).toBe(latest);
    }
  });

  it.each(['load', 'movement'])('rejects a repeated %s click captured before the first application', kind => {
    const s = session(), oldUse = s.use(kind); s.invoke(oldUse); const applied = s.state();
    s.invoke(oldUse); expect(s.state()).toBe(applied);
  });

  it.each(['load', 'movement'])('pauses the %s trial halfway, clears live feedback and preserves the latest evidence and writing', kind => {
    const previous = saved(), records = { lever: saved(BENCHES[0], { note: 'Revised reasoning.', previous }) };
    const references = { lever: { ...previous.settings } };
    const experiments = { lever: { benchId: 'lever', before: { settings: { ...previous.settings } }, after: { settings: { ...previous.settings, leverEffortArm: 3 } }, note: 'Comparison reasoning.' } };
    const investigations = { lever: { id: 'lever-one-change-v1', force: 'less', distance: 'more', tested: true, explanation: 'Prediction reasoning.' } };
    const s = session(BENCHES[0], { benchDesignRecords: records, benchReferences: references, benchExperiments: experiments, benchInvestigations: investigations,
      shopAnimating: true, shopMotionProgress: 0.9, shopClueBench: 'lever', benchPrediction: '200', benchChoice: 'far', benchResult: { correct: true }, iqExplanation: 'Earlier writing.' });
    const oldUse = s.use(kind);
    s.patch({ iqExplanation: 'Latest unrelated writing.', benchDesignRecords: { ...records, lever: { ...records.lever, note: 'Latest design writing.' } } });
    const latestRecords = s.state().benchDesignRecords;
    s.invoke(oldUse);
    expect(s.state()).toMatchObject({ shopAnimating: false, shopMotionProgress: 0.5, shopClueBench: null, benchPrediction: '', benchChoice: null, benchResult: null, iqExplanation: 'Latest unrelated writing.' });
    expect(s.state().benchDesignRecords).toBe(latestRecords); expect(s.state().benchDesignRecords.lever.previous).toBe(previous);
    expect(s.state().benchReferences).toBe(references); expect(s.state().benchExperiments).toBe(experiments); expect(s.state().benchInvestigations).toBe(investigations);
  });

  it.each(['load', 'movement'])('marks an applied %s trial as a changed task with zero geometry changes and saves that distinction', kind => {
    const original = saved(), s = session(BENCHES[0], { benchDesignRecords: { lever: original } });
    s.invoke(s.use(kind));
    const live = s.find(n => n.props?.['data-ml-design-comparison'] === 'live');
    expect(live.props['data-same-task']).toBe('false'); expect(Number(live.props['data-geometry-changes'])).toBe(0);
    expect(live.props['data-same-limits']).toBe('true'); expect(text(live)).not.toContain('isolates one geometry change');
    const work = nodes(live).find(n => n.props?.['data-ml-design-change'] === 'work');
    expect(Number(work.props['data-before'])).toBe(200); expect(Number(work.props['data-after'])).toBe(400);
    s.invoke(s.button('Replace design record'));
    const current = s.state().benchDesignRecords.lever;
    expect(current.previous.settings).toEqual(original.settings); expect(current.previous.note).toBe(original.note);
    expect(current.settings[kind === 'load' ? 'leverLoad' : 'loadDistance']).toBe(kind === 'load' ? 800 : 1);
    const revision = s.find(n => n.props?.['data-ml-design-comparison'] === 'revision');
    expect(revision.props['data-same-task']).toBe('false'); expect(Number(revision.props['data-geometry-changes'])).toBe(0);
    expect(revision.props['data-same-limits']).toBe('true');
  });
});
