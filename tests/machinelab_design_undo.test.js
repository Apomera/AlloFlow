import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Station control keys and fixtures are independent of production snapshot helpers.
const BENCHES = [
  { id: 'lever', load: 'leverLoad', settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 },
    controls: [{ key: 'leverEffortArm', suggestion: 4 }, { key: 'leverLoadArm', suggestion: 0.5 }], ma: d => d.leverEffortArm / d.leverLoadArm },
  { id: 'pulley', load: 'pulleyLoad', settings: { pulleySegments: 2, pulleyLoad: 400 },
    controls: [{ key: 'pulleySegments', suggestion: 4 }], ma: d => d.pulleySegments },
  { id: 'windlass', load: 'windlassLoad', settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 },
    controls: [{ key: 'windlassHandleR', suggestion: 0.6 }, { key: 'windlassDrumR', suggestion: 0.05 }], ma: d => d.windlassHandleR / d.windlassDrumR },
  { id: 'ramp', load: 'rampLoad', settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 },
    controls: [{ key: 'rampLength', suggestion: 6 }, { key: 'rampHeight', suggestion: 0.5 }], ma: d => d.rampLength / d.rampHeight },
  { id: 'wedge', load: 'wedgeLoad', settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 },
    controls: [{ key: 'wedgeLength', suggestion: 0.5 }, { key: 'wedgeThickness', suggestion: 0.03 }], ma: d => d.wedgeLength / d.wedgeThickness },
  { id: 'screw', load: 'screwLoad', settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 },
    controls: [{ key: 'screwHandleR', suggestion: 0.2 }, { key: 'screwPitch', suggestion: 0.003 }], ma: d => 2 * Math.PI * d.screwHandleR / d.screwPitch }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
const CONTROLS = BENCHES.flatMap(b => b.controls.map(c => ({ b, c, name: `${b.id}/${c.key}` })));
const TRIALS = BENCHES.flatMap(b => ['load', 'movement'].map(kind => ({ b, kind, name: `${b.id}/${kind}` })));
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function session(b = BENCHES[0], c = b.controls[0], extra = {}, force = 5000) {
  const store = newStore({ machineLab: { view: 'machines', bench: b.id, bandOverride: 'g68', ...BASE,
    benchDesignLimits: { [b.id]: { force: String(force), travel: '300', control: c.key } }, ...extra } });
  const render = () => tool.render(makeCtx({}, store));
  const find = predicate => nodes(render()).find(predicate);
  return { render, find, state: () => store.toolData.machineLab,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    panel: () => find(n => n.props?.['data-ml-design-undo'] === store.toolData.machineLab.bench),
    undo: () => find(n => n.type === 'button' && n.props['data-ml-design-undo-use'] === store.toolData.machineLab.bench),
    option: goal => find(n => n.props?.['data-ml-design-option'] !== undefined && n.props['data-goals'].split(' ').includes(goal)),
    use: value => find(n => n.type === 'button' && Number(n.props['data-ml-design-use']) === value),
    trial: kind => find(n => n.type === 'button' && n.props['data-ml-task-use'] === kind),
    button: label => find(n => n.type === 'button' && text(n) === label),
    invoke: node => node.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }) };
}
function settings(state, b) { return Object.fromEntries([...Object.keys(b.settings), 'loadDistance'].map(k => [k, state[k]])); }
function checkpoint(b = BENCHES[0], key = b.controls[0].key, before = {}, after = {}) {
  return { benchId: b.id, key, before: { ...b.settings, loadDistance: 0.5, ...before }, after: { ...b.settings, loadDistance: 0.5, [key]: b.controls[0].suggestion, ...after } };
}
function applyOption(s, goal = 'force') {
  const value = Number(s.option(goal).props['data-ml-design-option']), button = s.use(value);
  expect(button.props.disabled).toBe(false); s.invoke(button); return value;
}
function verifyCheckpoint(s, b, key, before, value) {
  const point = s.state().benchDesignUndo[b.id];
  expect(Object.keys(point).sort()).toEqual(['after', 'before', 'benchId', 'key']);
  expect(point).toEqual({ benchId: b.id, key, before: settings(before, b), after: { ...settings(before, b), [key]: value } });
  expect(point.before).not.toBe(point.after);
  expect(point.before).not.toBe(before);
  expect(Object.keys(point.before).sort()).toEqual([...Object.keys(b.settings), 'loadDistance'].sort());
  expect(s.panel().props).toMatchObject({ 'data-key': key, 'data-before': before[key], 'data-after': value, 'data-available': 'true' });
  expect(s.undo().props.disabled).toBe(false); expect(text(s.undo())).toBe('Undo last applied change');
  return point;
}

describe('Machine Lab: one-step recovery for applied choices', () => {
  it.each(CONTROLS)('restores only $name after a working-design choice', ({ b, c }) => {
    const s = session(b, c), before = { ...s.state() }, value = applyOption(s);
    verifyCheckpoint(s, b, c.key, before, value);
    s.invoke(s.undo());
    for (const key of Object.keys(BASE)) expect(s.state()[key], key).toBe(before[key]);
    expect(s.state().benchDesignLimits).toBe(before.benchDesignLimits);
    expect(s.state().benchDesignUndo?.[b.id]).toBeUndefined(); expect(s.panel()).toBeUndefined(); expect(s.undo()).toBeUndefined();
  });

  it.each(CONTROLS)('also makes the nearest suggested $name setting reversible', ({ b, c }) => {
    const target = { ...BASE, [c.key]: c.suggestion };
    const s = session(b, c, {}, BASE[b.load] / b.ma(target)), before = { ...s.state() };
    const suggestion = s.find(n => n.props?.['data-ml-design-suggestion'] === c.key);
    expect(suggestion).toBeTruthy(); const value = Number(suggestion.props['data-value']);
    expect(value).not.toBe(before[c.key]); s.invoke(s.button('Apply suggested setting'));
    verifyCheckpoint(s, b, c.key, before, value); s.invoke(s.undo());
    expect(settings(s.state(), b)).toEqual(settings(before, b)); expect(s.state().benchDesignUndo?.[b.id]).toBeUndefined();
  });

  it.each(TRIALS)('restores the original $name task without changing geometry', ({ b, kind }) => {
    const s = session(b), before = { ...s.state() }, key = kind === 'load' ? b.load : 'loadDistance';
    s.invoke(s.trial(kind)); verifyCheckpoint(s, b, key, before, before[key] * 2);
    s.invoke(s.undo());
    for (const field of Object.keys(BASE)) expect(s.state()[field], field).toBe(before[field]);
    expect(s.state().benchDesignUndo?.[b.id]).toBeUndefined();
  });

  it('restores a valid imported off-grid starting value exactly, without rounding it', () => {
    const s = session(BENCHES[0], BENCHES[0].controls[0], { leverEffortArm: 2.26 });
    const nearest = Number(s.option('nearest').props['data-ml-design-option']);
    expect(nearest).toBe(2.3); s.invoke(s.use(nearest)); s.invoke(s.undo());
    expect(s.state().leverEffortArm).toBe(2.26);
  });

  it('retains exactly the latest applied change and consumes it without reviving older history', () => {
    const s = session(); applyOption(s); const first = s.state().benchDesignUndo.lever;
    s.invoke(s.trial('load')); const second = s.state().benchDesignUndo.lever;
    expect(second).not.toBe(first); expect(second.key).toBe('leverLoad');
    expect(second.before.leverEffortArm).toBe(4); expect(second.before.leverLoad).toBe(400);
    expect(Object.keys(second).sort()).toEqual(['after', 'before', 'benchId', 'key']);
    s.invoke(s.undo()); expect(s.state().leverLoad).toBe(400); expect(s.state().leverEffortArm).toBe(4);
    expect(s.state().benchDesignUndo.lever).toBeUndefined(); expect(s.undo()).toBeUndefined();
  });

  it('does not create recovery state before the first accepted Apply', () => {
    const s = session(); expect(s.panel()).toBeUndefined(); expect(s.undo()).toBeUndefined();
    const current = s.use(Number(s.option('nearest').props['data-ml-design-option']));
    expect(current.props.disabled).toBe(true); const before = s.state(); s.invoke(current); expect(s.state()).toBe(before);
  });

  it('leaves an existing checkpoint unchanged for disabled and stale Apply callbacks', () => {
    const s = session(); applyOption(s); const point = s.state().benchDesignUndo.lever;
    const current = s.use(Number(s.option('nearest').props['data-ml-design-option']));
    expect(current.props.disabled).toBe(true); const applied = s.state(); s.invoke(current); expect(s.state()).toBe(applied);
    const stale = s.trial('load'); s.patch({ leverLoadArm: 1.1 }); const changed = s.state();
    s.invoke(stale); expect(s.state()).toBe(changed); expect(s.state().benchDesignUndo.lever).toBe(point);
  });

  it.each(['g68', 'g912'])('exposes Undo only after an applied change in the %s band', bandOverride => {
    const s = session(BENCHES[0], BENCHES[0].controls[0], { bandOverride });
    applyOption(s); expect(s.panel()).toBeTruthy(); expect(s.undo().props.disabled).toBe(false);
  });
});

describe('Machine Lab: recovery eligibility follows physical settings', () => {
  it.each([
    ['changed geometry', { leverEffortArm: 3.9 }], ['other geometry', { leverLoadArm: 1.1 }],
    ['changed load', { leverLoad: 500 }], ['changed movement', { loadDistance: 0.6 }],
    ['invalid geometry', { leverLoadArm: 0 }], ['non-finite geometry', { leverEffortArm: Infinity }],
    ['missing load', { leverLoad: null }]
  ])('disables Undo after %s and leaves the latest state intact', (_label, patch) => {
    const s = session(); applyOption(s); const point = s.state().benchDesignUndo.lever;
    s.patch(patch); const before = s.state();
    expect(s.panel().props['data-available']).toBe('false'); expect(s.undo().props.disabled).toBe(true);
    s.invoke(s.undo()); expect(s.state()).toBe(before); expect(s.state().benchDesignUndo.lever).toBe(point);
  });

  it.each([
    ['changed limits', { force: '100', travel: '2', control: 'leverEffortArm' }],
    ['blank force limit', { force: '', travel: '300', control: 'leverEffortArm' }],
    ['invalid travel limit', { force: '5000', travel: '0', control: 'leverEffortArm' }],
    ['different chosen geometry', { force: '5000', travel: '300', control: 'leverLoadArm' }]
  ])('allows Undo after %s and preserves that latest choice', (_label, limits) => {
    const s = session(); applyOption(s); const changedLimits = { lever: limits };
    s.patch({ benchDesignLimits: changedLimits });
    expect(s.panel().props['data-available']).toBe('true'); expect(s.undo().props.disabled).toBe(false);
    s.invoke(s.undo()); expect(s.state().leverEffortArm).toBe(2); expect(s.state().benchDesignLimits).toBe(changedLimits);
  });

  it('permits recovery when every geometry fails the latest design limits', () => {
    const s = session(); applyOption(s); s.patch({ benchDesignLimits: { lever: { force: '1', travel: '1' } } });
    expect(s.find(n => n.props?.['data-ml-design-impossible'] !== undefined)).toBeTruthy();
    expect(s.undo().props.disabled).toBe(false); s.invoke(s.undo()); expect(s.state().leverEffortArm).toBe(2);
  });

  it('re-enables the checkpoint if a manual edit returns to exactly the applied setup', () => {
    const s = session(); applyOption(s); const point = s.state().benchDesignUndo.lever;
    s.patch({ leverLoadArm: 1.1 }); expect(s.undo().props.disabled).toBe(true);
    s.patch({ leverLoadArm: 1 }); expect(s.undo().props.disabled).toBe(false);
    expect(s.state().benchDesignUndo.lever).toBe(point); s.invoke(s.undo()); expect(s.state().leverEffortArm).toBe(2);
  });

  it('detects shared load movement changed through another machine', () => {
    const s = session(); applyOption(s);
    s.patch({ bench: 'pulley', benchDesignLimits: { ...s.state().benchDesignLimits, pulley: { force: '5000', travel: '300' } } });
    s.invoke(s.trial('movement')); expect(s.state().loadDistance).toBe(1);
    const pulleyPoint = s.state().benchDesignUndo.pulley;
    s.patch({ bench: 'lever' }); expect(s.undo().props.disabled).toBe(true);
    const current = s.state(); s.invoke(s.undo()); expect(s.state()).toBe(current); expect(s.state().benchDesignUndo.pulley).toBe(pulleyPoint);
    s.patch({ bench: 'pulley' }); s.invoke(s.undo()); expect(s.state().loadDistance).toBe(0.5);
    s.patch({ bench: 'lever' }); expect(s.undo().props.disabled).toBe(false);
  });

  it('keeps independent checkpoints for station-specific changes and consumes only the active one', () => {
    const s = session(); applyOption(s); const leverPoint = s.state().benchDesignUndo.lever;
    s.patch({ bench: 'pulley', benchDesignLimits: { ...s.state().benchDesignLimits, pulley: { force: '5000', travel: '300' } } });
    s.invoke(s.trial('load')); const pulleyPoint = s.state().benchDesignUndo.pulley;
    expect(s.state().benchDesignUndo.lever).toBe(leverPoint);
    s.patch({ bench: 'lever' }); s.invoke(s.undo()); expect(s.state().leverEffortArm).toBe(2);
    expect(s.state().pulleyLoad).toBe(800); expect(s.state().benchDesignUndo.pulley).toBe(pulleyPoint);
    s.patch({ bench: 'pulley' }); expect(s.undo().props.disabled).toBe(false);
  });
});

describe('Machine Lab: Undo preserves work and rejects stale callbacks', () => {
  it('restores one physical value while retaining the newest evidence, writing, limits and investigation choices', () => {
    const s = session(); applyOption(s); const undo = s.undo();
    const previous = { benchId: 'lever', settings: { ...BENCHES[0].settings, loadDistance: 0.5 }, limits: { force: 200, travel: 1 }, control: 'leverEffortArm', note: 'Earlier explanation.' };
    const records = { lever: { ...previous, settings: { ...previous.settings, leverEffortArm: 4 }, note: 'Latest explanation.', previous } };
    const references = { lever: { ...previous.settings } };
    const experiments = { lever: { benchId: 'lever', before: { settings: { ...previous.settings } }, after: { settings: { ...records.lever.settings } }, note: 'Comparison explanation.' } };
    const investigations = { lever: { id: 'lever-one-change-v1', force: 'less', distance: 'more', tested: true, explanation: 'Latest prediction explanation.' } };
    const limits = { lever: { force: '', travel: '3', control: 'leverLoadArm' } };
    s.patch({ benchDesignRecords: records, benchReferences: references, benchExperiments: experiments, benchInvestigations: investigations,
      benchDesignLimits: limits, iqExplanation: 'Latest unrelated writing.', shopAnimating: true, shopMotionProgress: 0.9,
      shopClueBench: 'lever', benchPrediction: '200', benchChoice: 'far', benchResult: { correct: true } });
    s.invoke(undo);
    expect(s.state()).toMatchObject({ leverEffortArm: 2, shopAnimating: false, shopMotionProgress: 0.5, shopClueBench: null,
      benchPrediction: '', benchChoice: null, benchResult: null, iqExplanation: 'Latest unrelated writing.' });
    expect(s.state().benchDesignRecords).toBe(records); expect(s.state().benchDesignRecords.lever.previous).toBe(previous);
    expect(s.state().benchReferences).toBe(references); expect(s.state().benchExperiments).toBe(experiments);
    expect(s.state().benchInvestigations).toBe(investigations); expect(s.state().benchDesignLimits).toBe(limits);
  });

  it.each([
    ['station', { bench: 'pulley' }], ['view', { view: 'learn', manualTopic: 'record' }],
    ['physical settings', { leverLoad: 500 }], ['removed checkpoint', { benchDesignUndo: {} }]
  ])('rejects a captured Undo after the %s changes', (_label, patch) => {
    const s = session(); applyOption(s); const oldUndo = s.undo(); s.patch(patch);
    const current = s.state(); s.invoke(oldUndo); expect(s.state()).toBe(current);
  });

  it('rejects a captured Undo after a newer checkpoint reaches the same physical setup', () => {
    const s = session(); applyOption(s); const oldUndo = s.undo(), oldPoint = s.state().benchDesignUndo.lever;
    s.patch({ leverEffortArm: 2 }); applyOption(s);
    expect(s.state().benchDesignUndo.lever).not.toBe(oldPoint); expect(s.state().benchDesignUndo.lever).toEqual(oldPoint);
    const latest = s.state(); s.invoke(oldUndo); expect(s.state()).toBe(latest);
    s.invoke(s.undo()); expect(s.state().leverEffortArm).toBe(2);
  });

  it('consumes the checkpoint once even if the old button is invoked twice', () => {
    const s = session(); applyOption(s); const oldUndo = s.undo(); s.invoke(oldUndo); const undone = s.state();
    s.invoke(oldUndo); expect(s.state()).toBe(undone); expect(s.state().leverEffortArm).toBe(2);
  });
});

describe('Machine Lab: untrusted imported recovery state', () => {
  const valid = checkpoint();
  const malformed = [
    ['wrong station', { ...valid, benchId: 'pulley' }], ['unknown key', { ...valid, key: 'iqExplanation' }],
    ['other station key', { ...valid, key: 'pulleySegments' }], ['missing before', { ...valid, before: null }],
    ['missing after', { ...valid, after: null }], ['missing geometry', { ...valid, before: { leverEffortArm: 2, leverLoad: 400, loadDistance: 0.5 } }],
    ['zero geometry', { ...valid, before: { ...valid.before, leverLoadArm: 0 } }],
    ['non-finite before', { ...valid, before: { ...valid.before, leverEffortArm: Infinity } }],
    ['non-finite after', { ...valid, after: { ...valid.after, leverEffortArm: NaN } }],
    ['out-of-range before', { ...valid, before: { ...valid.before, leverLoad: 1010 } }],
    ['out-of-range after', { ...valid, after: { ...valid.after, loadDistance: 3.1 } }],
    ['two changes', { ...valid, after: { ...valid.after, leverLoadArm: 0.5 } }],
    ['wrong changed key', { ...valid, key: 'leverLoad' }], ['no change', { ...valid, after: { ...valid.before } }],
    ['array checkpoint', []], ['string checkpoint', 'undo'], ['null checkpoint', null]
  ];
  it.each(malformed)('hides malformed %s without mutating imported state', (_label, point) => {
    const s = session(BENCHES[0], BENCHES[0].controls[0], { leverEffortArm: 4, benchDesignUndo: { lever: point } });
    const before = s.state(); expect(s.panel()).toBeUndefined(); expect(s.undo()).toBeUndefined(); expect(s.state()).toBe(before);
  });

  it('rejects a ramp checkpoint whose earlier height exceeds its length', () => {
    const b = BENCHES[3], point = checkpoint(b, 'rampLength', { rampLength: 0.5 }, { rampLength: 6 });
    const s = session(b, b.controls[0], { rampLength: 6, benchDesignUndo: { ramp: point } });
    expect(s.panel()).toBeUndefined(); expect(s.undo()).toBeUndefined();
  });

  it('accepts a valid recovered checkpoint while ignoring unrelated imported snapshot fields', () => {
    const point = checkpoint(); point.before.iqExplanation = 'Do not restore this.'; point.before.pulleyLoad = 10;
    point.after.iqExplanation = 'Not a physical station setting.'; point.previous = { arbitrary: 'Must never be restored.' };
    const s = session(BENCHES[0], BENCHES[0].controls[0], { leverEffortArm: 4, iqExplanation: 'Current writing.', benchDesignUndo: { lever: point } });
    expect(s.undo().props.disabled).toBe(false); s.invoke(s.undo());
    expect(s.state().leverEffortArm).toBe(2); expect(s.state().pulleyLoad).toBe(400); expect(s.state().iqExplanation).toBe('Current writing.');
    expect(s.state().previous).toBeUndefined(); expect(s.state().benchDesignUndo.lever).toBeUndefined();
  });

  it('revalidates the checkpoint at activation instead of trusting an earlier rendered button', () => {
    const s = session(); applyOption(s); const oldUndo = s.undo();
    s.state().benchDesignUndo.lever.before.leverLoadArm = 0;
    const latest = s.state(); s.invoke(oldUndo); expect(s.state()).toBe(latest); expect(s.state().leverEffortArm).toBe(4);
  });
});

describe('Machine Lab: delayed focus follows the active station', () => {
  const CASES = ['apply', 'undo'].flatMap(action => [false, true].map(switched => ({
    action, switched, name: `${action}/${switched ? 'reused panel after station switch' : 'same station'}`
  })));
  it.each(CASES)('handles pending movement focus for $name', ({ action, switched }) => {
    const point = checkpoint(BENCHES[0], 'loadDistance', {}, { loadDistance: 1 });
    const s = session(BENCHES[0], BENCHES[0].controls[0], action === 'undo'
      ? { loadDistance: 1, benchDesignUndo: { lever: point } } : {});
    const control = action === 'undo' ? s.undo() : s.trial('movement');
    const panel = document.createElement('div'); panel.setAttribute('data-ml-design', 'lever');
    const trigger = document.createElement('button'), target = document.createElement('input');
    target.id = 'ml-loadDistance'; target.scrollIntoView = vi.fn();
    panel.append(trigger, target); document.body.append(panel); trigger.focus();
    const focus = vi.spyOn(target, 'focus');
    vi.useFakeTimers();
    try {
      control.props.onClick({ currentTarget: trigger });
      expect(s.state().loadDistance).toBe(action === 'undo' ? 0.5 : 1);
      expect(focus).not.toHaveBeenCalled();
      // Undo removes its button; React may reuse the connected panel and the
      // shared load-distance control when another station renders before the timer.
      if (action === 'undo') trigger.remove();
      if (switched) { s.patch({ bench: 'pulley' }); panel.setAttribute('data-ml-design', 'pulley'); }
      expect(panel.isConnected).toBe(true);
      expect(document.activeElement).toBe(action === 'undo' ? document.body : trigger);
      vi.runOnlyPendingTimers();
      if (switched) {
        expect(focus).not.toHaveBeenCalled(); expect(target.scrollIntoView).not.toHaveBeenCalled();
      } else {
        expect(focus).toHaveBeenCalledWith({ preventScroll: true });
        expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
        expect(document.activeElement).toBe(target);
      }
    } finally { vi.useRealTimers(); focus.mockRestore(); panel.remove(); }
  });
});
