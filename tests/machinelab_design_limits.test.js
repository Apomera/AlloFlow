import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const BENCHES = [
  { id: 'lever', key: 'leverEffortArm', min: 0.2, max: 4, step: 0.1, load: 'leverLoad', force: '100', travel: '3',
    settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 }, ma: (d) => d.leverEffortArm / d.leverLoadArm },
  { id: 'pulley', key: 'pulleySegments', min: 1, max: 6, step: 1, load: 'pulleyLoad', force: '100', travel: '3',
    settings: { pulleySegments: 2, pulleyLoad: 400 }, ma: (d) => d.pulleySegments },
  { id: 'windlass', key: 'windlassHandleR', min: 0.05, max: 0.8, step: 0.05, load: 'windlassLoad', force: '80', travel: '3',
    settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 }, ma: (d) => d.windlassHandleR / d.windlassDrumR },
  { id: 'ramp', key: 'rampLength', min: 0.5, max: 8, step: 0.1, load: 'rampLoad', force: '80', travel: '3',
    settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 }, ma: (d) => d.rampLength >= d.rampHeight ? d.rampLength / d.rampHeight : null },
  { id: 'wedge', key: 'wedgeLength', min: 0.05, max: 0.6, step: 0.01, load: 'wedgeLoad', force: '100', travel: '5',
    settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 }, ma: (d) => d.wedgeLength / d.wedgeThickness },
  { id: 'screw', key: 'screwPitch', min: 0.001, max: 0.02, step: 0.001, load: 'screwLoad', force: '100', travel: '100',
    settings: { screwHandleR: 0.15, screwPitch: 0.002, screwLoad: 2000 }, ma: (d) => 2 * Math.PI * d.screwHandleR / d.screwPitch }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map((b) => b.settings));
let tool;

beforeEach(() => {
  resetStemLab();
  tool = loadTool(FILE, 'machineLab');
});

function descendants(node) {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (!node || typeof node !== 'object') return [];
  return [node, ...descendants(node.props && node.props.children)];
}
function content(node) {
  if (Array.isArray(node)) return node.map(content).join('');
  if (node == null || typeof node === 'boolean') return '';
  return typeof node === 'object' ? content(node.props && node.props.children) : String(node);
}
function session(overrides = {}) {
  const store = newStore({ machineLab: { view: 'machines', bench: 'lever', bandOverride: 'g68', ...BASE, ...overrides } });
  const render = () => tool.render(makeCtx({}, store));
  const find = (predicate) => descendants(render()).find(predicate);
  const currentTarget = { closest: () => ({ isConnected: false, querySelector: () => null }) };
  return {
    state: () => store.toolData.machineLab,
    patch: (patch) => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    render, find,
    section: () => find((n) => n.props && n.props['data-ml-design'] === store.toolData.machineLab.bench),
    input: (kind) => find((n) => n.type === 'input' && n.props.id === `ml-design-${kind}-${store.toolData.machineLab.bench}`),
    change: (kind, value) => {
      const input = find((n) => n.type === 'input' && n.props.id === `ml-design-${kind}-${store.toolData.machineLab.bench}`);
      expect(input, `Missing ${kind} limit input`).toBeTruthy();
      input.props.onChange({ target: { value }, currentTarget });
    },
    suggestion: () => find((n) => n.props && n.props['data-ml-design-suggestion']),
    apply: () => find((n) => n.type === 'button' && content(n) === 'Apply suggested setting'),
    invoke: (node) => node.props.onClick({ currentTarget })
  };
}
function fixture(b, overrides = {}) {
  return session({ bench: b.id, benchDesignLimits: { [b.id]: { force: b.force, travel: b.travel } }, ...overrides });
}
function activeApply(s) { const node = s.apply(); return node && node.props.disabled !== true; }
function fitNode(s) { return s.find((n) => n.props && n.props['data-ml-design-fit'] !== undefined); }

describe('Machine Lab: force and travel design envelope', () => {
  it('derives the permitted mechanical advantage interval from both limits', () => {
    const envelope = tool._math.designEnvelope(400, 0.5, 100, 3);
    expect(envelope).toMatchObject({ minMA: 4, maxMA: 6, work: 200, budget: 300, possible: true });
  });

  it('allows equality where the force-distance budget exactly matches the task work', () => {
    const envelope = tool._math.designEnvelope(400, 0.5, 100, 2);
    expect(envelope).toMatchObject({ minMA: 4, maxMA: 4, work: 200, budget: 200, possible: true });
    expect(tool._math.designFit(400, 0.5, 4, 100, 2)).toMatchObject({ force: 100, travel: 2, forceOK: true, travelOK: true, fits: true });
  });

  it('recognizes an impossible work budget independently of a machine choice', () => {
    const envelope = tool._math.designEnvelope(400, 0.5, 100, 1.5);
    expect(envelope).toMatchObject({ minMA: 4, maxMA: 3, work: 200, budget: 150, possible: false });
  });

  it('distinguishes too much force, too much travel, and a setup that meets both limits', () => {
    expect(tool._math.designFit(400, 0.5, 2, 100, 3)).toMatchObject({ force: 200, travel: 1, forceOK: false, travelOK: true, fits: false });
    expect(tool._math.designFit(400, 0.5, 8, 100, 3)).toMatchObject({ force: 50, travel: 4, forceOK: true, travelOK: false, fits: false });
    expect(tool._math.designFit(400, 0.5, 5, 100, 3)).toMatchObject({ force: 80, travel: 2.5, forceOK: true, travelOK: true, fits: true });
  });

  it('keeps ideal work fixed when only the mechanical advantage changes', () => {
    for (const ma of [0.5, 1, 4, 100]) {
      const fit = tool._math.designFit(400, 0.5, ma, 100, 3);
      expect(fit.force * fit.travel).toBeCloseTo(200, 10);
    }
  });

  it.each([0, -1, NaN, Infinity, -Infinity, '100', null, undefined, []])('rejects an invalid numeric design input %s', (invalid) => {
    for (let index = 0; index < 4; index++) {
      const inputs = [400, 0.5, 100, 3];
      inputs[index] = invalid;
      expect(tool._math.designEnvelope(...inputs)).toBeNull();
    }
    for (let index = 0; index < 5; index++) {
      const inputs = [400, 0.5, 4, 100, 3];
      inputs[index] = invalid;
      expect(tool._math.designFit(...inputs)).toBeNull();
    }
  });
});

describe('Machine Lab: design within limits at each station', () => {
  it.each(BENCHES)('offers the $id design panel only in the quantitative bands', (b) => {
    for (const bandOverride of ['g68', 'g912']) {
      const s = fixture(b, { bandOverride });
      expect(s.section()).toBeTruthy();
      expect(s.input('force')).toBeTruthy();
      expect(s.input('travel')).toBeTruthy();
    }
    for (const bandOverride of ['k2', 'g35']) {
      const s = fixture(b, { bandOverride });
      expect(s.section()).toBeUndefined();
      expect(s.apply()).toBeUndefined();
    }
  });

  it('uses independent default limits without forcing a geometry change', () => {
    const s = session();
    expect(String(s.input('force').props.value)).toBe('100');
    expect(String(s.input('travel').props.value)).toBe('3');
    expect(s.state().leverEffortArm).toBe(2);
  });

  it.each(BENCHES)('suggests a legal single-setting change that satisfies both limits at $id', (b) => {
    const s = fixture(b);
    const suggestion = s.suggestion();
    expect(suggestion, `Missing legal suggestion at ${b.id}`).toBeTruthy();
    expect(suggestion.props['data-ml-design-suggestion']).toBe(b.key);
    const value = Number(suggestion.props['data-value']);
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(b.min);
    expect(value).toBeLessThanOrEqual(b.max);
    expect((value - b.min) / b.step).toBeCloseTo(Math.round((value - b.min) / b.step), 7);
    const candidate = { ...s.state(), [b.key]: value };
    expect(tool._math.designFit(candidate[b.load], candidate.loadDistance, b.ma(candidate), Number(b.force), Number(b.travel)).fits).toBe(true);
    expect(String(fitNode(s).props['data-ml-design-fit'])).toBe('false');
    expect(activeApply(s)).toBe(true);
    s.invoke(s.apply());
    expect(s.state()[b.key]).toBe(value);
    expect(String(fitNode(s).props['data-ml-design-fit'])).toBe('true');
    for (const key of Object.keys(BASE).filter((key) => key !== b.key)) expect(s.state()[key], `Unexpected task/geometry change: ${key}`).toBe(BASE[key]);
  });

  it('pauses inspection halfway and clears obsolete proof feedback while preserving student evidence', () => {
    const references = { lever: { ...BENCHES[0].settings, loadDistance: 0.5 } };
    const experiments = { lever: { benchId: 'lever', before: { settings: { ...references.lever } },
      after: { settings: { ...references.lever, leverEffortArm: 3 } }, note: 'Keep my explanation.' } };
    const investigations = { lever: { id: 'lever-one-change-v1', force: 'less', distance: 'more', tested: true } };
    const limits = { lever: { force: '100', travel: '3' }, pulley: { force: '140', travel: '2.75' } };
    const s = session({ benchReferences: references, benchExperiments: experiments, benchInvestigations: investigations,
      benchDesignLimits: limits, shopAnimating: true, shopMotionProgress: 0.8,
      benchPrediction: '200', benchChoice: 'far', benchResult: { correct: true },
      iqExplanation: 'Keep this other inquiry.' });
    const node = s.apply();
    expect(activeApply(s)).toBe(true);
    s.patch({ iqExplanation: 'Newest unrelated writing.' });
    s.invoke(node);
    expect(s.state()).toMatchObject({ shopAnimating: false, shopMotionProgress: 0.5, benchPrediction: '', benchChoice: null, benchResult: null });
    expect(s.state().benchReferences).toEqual(references);
    expect(s.state().benchExperiments).toEqual(experiments);
    expect(s.state().benchInvestigations).toEqual(investigations);
    expect(s.state().benchDesignLimits).toEqual(limits);
    expect(s.state().iqExplanation).toBe('Newest unrelated writing.');
  });

  it('chooses the nearest usable lever setting instead of changing more than needed', () => {
    const s = session({ leverEffortArm: 2, leverLoadArm: 0.5,
      benchDesignLimits: { lever: { force: '80', travel: '3' } } });
    // MA must be 5-6, so the nearest arm setting is 2.5 m, rather than 3 m.
    const suggestion = s.suggestion();
    expect(suggestion.props['data-ml-design-suggestion']).toBe('leverEffortArm');
    expect(Number(suggestion.props['data-value'])).toBe(2.5);
  });

  it.each(['', ' ', '0', '-1', 'Infinity', 'NaN', 'nope'])('keeps the raw invalid limit "%s" and provides no actionable suggestion', (raw) => {
    for (const kind of ['force', 'travel']) {
      const s = session();
      s.change(kind, raw);
      expect(s.state().benchDesignLimits.lever[kind]).toBe(raw);
      expect(s.input(kind).props.value).toBe(raw);
      expect(activeApply(s)).toBeFalsy();
    }
  });

  it('keeps limits separate when switching between stations', () => {
    const s = session();
    s.change('force', '125');
    s.change('travel', '2.5');
    s.patch({ bench: 'pulley' });
    expect(String(s.input('force').props.value)).toBe('100');
    s.change('force', '200');
    s.change('travel', '4');
    s.patch({ bench: 'lever' });
    expect(s.input('force').props.value).toBe('125');
    expect(s.input('travel').props.value).toBe('2.5');
    expect(s.state().benchDesignLimits.pulley).toEqual({ force: '200', travel: '4' });
  });

  it('does not offer a setting when the limits require more work than the budget permits', () => {
    const s = session({ benchDesignLimits: { lever: { force: '100', travel: '1.5' } } });
    expect(activeApply(s)).toBeFalsy();
    expect(s.suggestion()).toBeUndefined();
    expect(String(fitNode(s).props['data-ml-design-fit'])).toBe('false');
  });

  it('does not invent an intermediate pulley count when a feasible interval has no legal step', () => {
    // A continuous MA of 2.1-2.5 would work; no whole-number strand count does.
    const s = session({ bench: 'pulley', pulleyLoad: 420,
      benchDesignLimits: { pulley: { force: '200', travel: '1.25' } } });
    expect(tool._math.designEnvelope(420, 0.5, 200, 1.25).possible).toBe(true);
    expect(activeApply(s)).toBeFalsy();
    expect(s.suggestion()).toBeUndefined();
  });

  it('does not exceed the selected geometry control even when another geometry change could work', () => {
    const s = session({ leverLoadArm: 4,
      benchDesignLimits: { lever: { force: '100', travel: '3' } } });
    expect(tool._math.designEnvelope(400, 0.5, 100, 3).possible).toBe(true);
    expect(activeApply(s)).toBeFalsy();
    expect(s.suggestion()).toBeUndefined();
    expect(s.state().leverLoadArm).toBe(4);
  });

  it.each([
    ['another geometry value', { leverLoadArm: 1.1 }],
    ['the task load', { leverLoad: 500 }],
    ['the task movement', { loadDistance: 0.6 }],
    ['the edited limits', { benchDesignLimits: { lever: { force: '125', travel: '3' } } }],
    ['the selected station', { bench: 'pulley' }]
  ])('rejects a stale Apply callback after changing %s', (_label, patch) => {
    const s = session();
    const oldApply = s.apply();
    expect(activeApply(s)).toBe(true);
    s.patch(patch);
    const before = structuredClone(s.state());
    s.invoke(oldApply);
    expect(s.state()).toEqual(before);
  });
});
