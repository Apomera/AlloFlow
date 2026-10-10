import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const BENCHES = [
  { id: 'lever', key: 'leverEffortArm', next: 4, load: 'leverLoad', settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 }, ma: d => d.leverEffortArm / d.leverLoadArm },
  { id: 'pulley', key: 'pulleySegments', next: 4, load: 'pulleyLoad', settings: { pulleySegments: 2, pulleyLoad: 400 }, ma: d => d.pulleySegments },
  { id: 'windlass', key: 'windlassHandleR', next: 0.6, load: 'windlassLoad', settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 }, ma: d => d.windlassHandleR / d.windlassDrumR },
  { id: 'ramp', key: 'rampLength', next: 8, load: 'rampLoad', settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 }, ma: d => d.rampLength / d.rampHeight },
  { id: 'wedge', key: 'wedgeLength', next: 0.6, load: 'wedgeLoad', settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 }, ma: d => d.wedgeLength / d.wedgeThickness },
  { id: 'screw', key: 'screwPitch', next: 0.01, load: 'screwLoad', settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 }, ma: d => 2 * Math.PI * d.screwHandleR / d.screwPitch }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function record(b = BENCHES[0], extra = {}) {
  return { benchId: b.id, settings: { ...b.settings, loadDistance: 0.5 }, limits: { force: 5000, travel: 300 }, control: b.key, note: 'Original design reasoning.', ...extra };
}
function session(extra = {}) {
  const store = newStore({ machineLab: { view: 'machines', bench: 'lever', bandOverride: 'g68', ...BASE,
    benchDesignLimits: { lever: { force: '5000', travel: '300', control: 'leverEffortArm' } },
    benchDesignRecords: { lever: record() }, ...extra } });
  const render = () => tool.render(makeCtx({}, store));
  const find = predicate => nodes(render()).find(predicate);
  const currentTarget = { closest: () => ({ isConnected: false, querySelector: () => null }) };
  const button = label => find(n => n.type === 'button' && text(n) === label);
  return { store, render, find, button, state: () => store.toolData.machineLab,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    html: () => ReactDOMServer.renderToStaticMarkup(render()),
    invoke: node => node.props.onClick({ currentTarget }),
    click: label => { const n = button(label); expect(n, `Missing ${label}`).toBeTruthy(); expect(n.props.disabled).not.toBe(true); n.props.onClick({ currentTarget }); },
    note: () => find(n => n.type === 'textarea' && n.props.id === `ml-design-note-${store.toolData.machineLab.bench}`),
    workNote: id => find(n => n.type === 'textarea' && n.props.id === `ml-record-design-note-${id}`)
  };
}
function comparison(s, kind = 'live') { return s.find(n => n.props?.['data-ml-design-comparison'] === kind); }
function metric(s, name, kind = 'live') {
  const row = nodes(comparison(s, kind)).find(n => n.props?.['data-ml-design-change'] === name);
  expect(row, `Missing ${kind}/${name}`).toBeTruthy();
  return Object.fromEntries(['before', 'after', 'delta'].map(key => [key, Number(row.props[`data-${key}`])]));
}
function fixture(b) {
  return session({ bench: b.id, [b.key]: b.next,
    benchDesignLimits: { [b.id]: { force: '5000', travel: '300', control: b.key } }, benchDesignRecords: { [b.id]: record(b) } });
}
function flag(s, attribute, value, kind = 'live') {
  const n = nodes(comparison(s, kind)).find(n => n.props?.[attribute] === value);
  expect(n, `Missing ${attribute}/${value}`).toBeTruthy(); return n.props['data-fit'];
}

describe('Machine Lab: live design comparison', () => {
  it.each(BENCHES)('compares fixed $id evidence with a one-geometry live change using full-precision physics', b => {
    const s = fixture(b), saved = s.state().benchDesignRecords[b.id];
    const panel = s.find(n => n.type === 'details' && n.props['data-ml-design-compare'] === b.id);
    expect(panel).toBeTruthy(); expect(text(nodes(panel).find(n => n.type === 'summary'))).toBe('Compare with current setup');
    expect(comparison(s).props).toMatchObject({ 'data-same-task': 'true', 'data-same-limits': 'true' });
    expect(Number(comparison(s).props['data-geometry-changes'])).toBe(1);
    const beforeMA = b.ma(saved.settings), afterMA = b.ma(s.state());
    const expected = { effort: [saved.settings[b.load] / beforeMA, s.state()[b.load] / afterMA],
      travel: [saved.settings.loadDistance * beforeMA, s.state().loadDistance * afterMA], work: [saved.settings[b.load] * 0.5, s.state()[b.load] * 0.5] };
    for (const [name, [before, after]] of Object.entries(expected)) {
      const actual = metric(s, name);
      expect(actual.before).toBeCloseTo(before, 9); expect(actual.after).toBeCloseTo(after, 9); expect(actual.delta).toBeCloseTo(after - before, 9);
    }
    expect(saved.settings[b.key]).toBe(b.settings[b.key]);
  });

  it('recognizes a changed task even when two different tasks happen to need equal work', () => {
    const s = session({ leverLoad: 800, loadDistance: 0.25 });
    expect(comparison(s).props['data-same-task']).toBe('false');
    expect(Number(comparison(s).props['data-geometry-changes'])).toBe(0);
    expect(metric(s, 'work')).toEqual({ before: 200, after: 200, delta: 0 });
    expect(metric(s, 'effort')).toEqual({ before: 200, after: 400, delta: 200 });
    expect(metric(s, 'travel')).toEqual({ before: 1, after: 0.5, delta: -0.5 });
  });

  it('compares both setups against the same recorded constraints before judging improvement', () => {
    const s = session({ leverEffortArm: 4, benchDesignRecords: { lever: record(BENCHES[0], { limits: { force: 100, travel: 3 } }) },
      benchDesignLimits: { lever: { force: '100', travel: '3', control: 'leverEffortArm' } } });
    expect(flag(s, 'data-ml-design-common-fit', 'before')).toBe('false');
    expect(flag(s, 'data-ml-design-common-fit', 'after')).toBe('true');
  });

  it('reports a limit-only change without inventing a physical change and keeps common versus new-limit checks distinct', () => {
    const s = session({ benchDesignRecords: { lever: record(BENCHES[0], { limits: { force: 100, travel: 3 } }) },
      benchDesignLimits: { lever: { force: '250', travel: '1.5', control: 'leverEffortArm' } } });
    expect(comparison(s).props).toMatchObject({ 'data-same-task': 'true', 'data-same-limits': 'false' });
    expect(Number(comparison(s).props['data-geometry-changes'])).toBe(0);
    for (const name of ['effort', 'travel', 'work']) expect(metric(s, name).delta).toBe(0);
    expect(flag(s, 'data-ml-design-common-fit', 'before')).toBe('false');
    expect(flag(s, 'data-ml-design-common-fit', 'after')).toBe('false');
    const own = nodes(comparison(s)).find(n => n.props?.['data-ml-design-own-fit'] !== undefined);
    expect(own).toBeTruthy(); expect(own.props['data-fit']).toBe('true');
  });

  it('does not count a chooser-only edit as changed geometry or a changed task', () => {
    const s = session({ benchDesignLimits: { lever: { force: '5000', travel: '300', control: 'leverLoadArm' } } });
    expect(comparison(s).props).toMatchObject({ 'data-same-task': 'true', 'data-same-limits': 'true' });
    expect(Number(comparison(s).props['data-geometry-changes'])).toBe(0);
    for (const name of ['effort', 'travel', 'work']) expect(metric(s, name).delta).toBe(0);
  });

  it('identifies two geometry changes even when their ratio and predicted outcomes are unchanged', () => {
    const s = session({ leverEffortArm: 4, leverLoadArm: 2 });
    expect(Number(comparison(s).props['data-geometry-changes'])).toBe(2);
    expect(comparison(s).props['data-same-task']).toBe('true');
    expect(text(comparison(s))).toContain('Their individual effects are not isolated.');
    expect(text(comparison(s))).not.toContain('isolates one geometry change');
    for (const name of ['effort', 'travel', 'work']) expect(metric(s, name).delta).toBe(0);
  });

  it('does not call one geometry change controlled when the task also changes despite equal work', () => {
    const s = session({ leverEffortArm: 4, leverLoad: 200, loadDistance: 1 });
    expect(Number(comparison(s).props['data-geometry-changes'])).toBe(1);
    expect(comparison(s).props['data-same-task']).toBe('false');
    expect(metric(s, 'work').delta).toBe(0);
    expect(text(comparison(s))).toContain('cannot be attributed to geometry alone');
    expect(text(comparison(s))).not.toContain('isolates one geometry change');
  });

  it('describes small nonzero changes without rounding their direction to a signed zero', () => {
    const s = session({ leverEffortArm: 2.000001 });
    expect(metric(s, 'effort').delta).toBeLessThan(0);
    expect(metric(s, 'travel').delta).toBeGreaterThan(0);
    expect(text(comparison(s))).toContain('change: decrease <0.001 N');
    expect(text(comparison(s))).toContain('change: increase <0.001 m');
    expect(text(comparison(s))).not.toMatch(/change: [+-]0(?:\s|[)])/);
  });

  it.each([
    ['blank force limit', { benchDesignLimits: { lever: { force: '', travel: '300' } } }],
    ['invalid travel limit', { benchDesignLimits: { lever: { force: '5000', travel: '0' } } }],
    ['invalid geometry', { leverLoadArm: 0 }]
  ])('keeps recorded evidence and omits numeric live comparisons with %s', (_label, patch) => {
    const s = session(patch);
    expect(s.find(n => n.props?.['data-ml-design-recorded'] === 'lever')).toBeTruthy();
    expect(s.note().props.value).toBe('Original design reasoning.');
    expect(comparison(s)).toBeUndefined();
  });
});

describe('Machine Lab: bounded previous design and revision', () => {
  it('replaces the recorded design while retaining one copied prior core and its bounded readonly explanation', () => {
    const original = record(BENCHES[0], { note: 'o'.repeat(1500), previous: record(BENCHES[0], { note: 'Nested history must be removed.' }), cachedFit: true });
    const s = session({ leverEffortArm: 4, benchDesignRecords: { lever: original } });
    s.click('Replace design record');
    const next = s.state().benchDesignRecords.lever;
    expect(next.note).toBe(''); expect(next.settings.leverEffortArm).toBe(4);
    expect(next.previous).toEqual({ benchId: original.benchId, settings: original.settings, limits: original.limits, control: original.control, note: 'o'.repeat(1200) });
    expect(next.previous.settings).not.toBe(original.settings); expect(next.previous.limits).not.toBe(original.limits);
    expect(Object.keys(next.previous).sort()).toEqual(['benchId', 'settings', 'limits', 'control', 'note'].sort());
    expect(next.previous.previous).toBeUndefined(); expect(next.previous.cachedFit).toBeUndefined();
    const revision = s.find(n => n.type === 'details' && n.props['data-ml-design-revision'] === 'lever');
    expect(revision).toBeTruthy(); expect(text(revision)).toContain('Previous design and revision');
    expect(text(revision)).toContain('o'.repeat(1200)); expect(text(revision)).not.toContain('Nested history must be removed.');
    expect(nodes(revision).filter(n => n.type === 'textarea')).toHaveLength(0);
  });

  it('retains only the latest pair through a third replacement while preserving the second explanation', () => {
    const s = session({ leverEffortArm: 4 }); s.click('Replace design record');
    s.note().props.onChange({ target: { value: 'The second design fits with less force.' } });
    s.patch({ leverEffortArm: 3 }); s.click('Replace design record');
    const third = s.state().benchDesignRecords.lever;
    expect(third.settings.leverEffortArm).toBe(3);
    expect(third.previous.settings.leverEffortArm).toBe(4);
    expect(third.previous.note).toBe('The second design fits with less force.');
    expect(third.previous.previous).toBeUndefined(); expect(third.note).toBe('');
    expect(s.html()).not.toContain('Original design reasoning.');
  });

  it.each(BENCHES)('compares fixed previous and recorded $id setups using full precision after the live station drifts', b => {
    const s = fixture(b); s.click('Replace design record');
    s.patch({ [b.load]: b.settings[b.load] * 2, loadDistance: 1 });
    expect(comparison(s, 'revision').props).toMatchObject({ 'data-same-task': 'true', 'data-same-limits': 'true' });
    expect(Number(comparison(s, 'revision').props['data-geometry-changes'])).toBe(1);
    const before = record(b).settings, after = { ...before, [b.key]: b.next };
    const expected = { effort: [before[b.load] / b.ma(before), after[b.load] / b.ma(after)],
      travel: [0.5 * b.ma(before), 0.5 * b.ma(after)], work: [before[b.load] * 0.5, after[b.load] * 0.5] };
    for (const [name, [oldValue, newValue]] of Object.entries(expected)) {
      const actual = metric(s, name, 'revision');
      expect(actual.before).toBeCloseTo(oldValue, 9); expect(actual.after).toBeCloseTo(newValue, 9); expect(actual.delta).toBeCloseTo(newValue - oldValue, 9);
    }
  });

  it('keeps a limit-only revision distinct from a physical improvement under the original constraints', () => {
    const s = session({ benchDesignRecords: { lever: record(BENCHES[0], { limits: { force: 100, travel: 3 } }) },
      benchDesignLimits: { lever: { force: '250', travel: '1.5', control: 'leverEffortArm' } } });
    s.click('Replace design record');
    expect(comparison(s, 'revision').props).toMatchObject({ 'data-same-task': 'true', 'data-same-limits': 'false' });
    for (const name of ['effort', 'travel', 'work']) expect(metric(s, name, 'revision').delta).toBe(0);
    expect(flag(s, 'data-ml-design-common-fit', 'before', 'revision')).toBe('false');
    expect(flag(s, 'data-ml-design-common-fit', 'after', 'revision')).toBe('false');
    const own = nodes(comparison(s, 'revision')).find(n => n.props?.['data-ml-design-own-fit'] === 'after');
    expect(own.props['data-fit']).toBe('true');
  });

  it('rejects a stale replacement callback after newer writing and preserves the existing previous snapshot', () => {
    const previous = record(BENCHES[0], { note: 'Previous evidence.' });
    const current = record(BENCHES[0], { previous });
    const s = session({ leverEffortArm: 4, benchDesignRecords: { lever: current } });
    const oldReplace = s.button('Replace design record');
    s.note().props.onChange({ target: { value: 'Newest explanation.' } });
    const newest = s.state().benchDesignRecords.lever;
    s.invoke(oldReplace);
    expect(s.state().benchDesignRecords.lever).toBe(newest);
    expect(newest.note).toBe('Newest explanation.'); expect(newest.previous).toBe(previous);
  });

  it('keeps previous writing fixed through successive current-note edits and rejects an editor captured before replacement', () => {
    const previous = record(BENCHES[0], { note: 'Readonly previous reason.' });
    const s = session({ benchDesignRecords: { lever: record(BENCHES[0], { previous }) } });
    const oldEditor = s.note();
    oldEditor.props.onChange({ target: { value: 'First current edit.' } });
    oldEditor.props.onChange({ target: { value: 'Second current edit.' } });
    expect(s.state().benchDesignRecords.lever.previous).toBe(previous);
    expect(previous.note).toBe('Readonly previous reason.');
    s.patch({ leverEffortArm: 4 }); s.click('Replace design record');
    const replaced = s.state().benchDesignRecords.lever;
    oldEditor.props.onChange({ target: { value: 'Stale editor overwrite.' } });
    expect(s.state().benchDesignRecords.lever).toBe(replaced);
    expect(replaced.previous.note).toBe('Second current edit.'); expect(replaced.note).toBe('');
  });

  it.each([
    ['wrong station', record(BENCHES[0], { benchId: 'pulley' })], ['missing settings', record(BENCHES[0], { settings: {} })],
    ['invalid geometry', record(BENCHES[0], { settings: { ...BENCHES[0].settings, leverEffortArm: 9, loadDistance: 0.5 } })],
    ['invalid limits', record(BENCHES[0], { limits: { force: 0, travel: 300 } })],
    ['invalid selected control', record(BENCHES[0], { control: 'leverLoad' })]
  ])('ignores an imported previous design with %s while retaining the valid current record', (_label, previous) => {
    const s = session({ benchDesignRecords: { lever: record(BENCHES[0], { previous }) } });
    expect(s.find(n => n.props?.['data-ml-design-recorded'] === 'lever')).toBeTruthy();
    expect(s.note().props.value).toBe('Original design reasoning.');
    expect(comparison(s, 'revision')).toBeUndefined();
    s.patch({ view: 'learn', manualTopic: 'record' });
    expect(s.workNote('lever')).toBeTruthy();
    expect(comparison(s, 'revision')).toBeUndefined();
  });

  it('renders a valid imported previous core once and never follows its nested history', () => {
    const deepest = record(BENCHES[0], { note: 'Do not render this nested history.' });
    const previous = record(BENCHES[0], { note: 'Visible preceding design.', previous: deepest });
    const current = record(BENCHES[0], { settings: { ...BENCHES[0].settings, leverEffortArm: 4, loadDistance: 0.5 }, previous });
    const s = session({ benchDesignRecords: { lever: current } });
    expect(comparison(s, 'revision')).toBeTruthy(); expect(s.html()).toContain('Visible preceding design.');
    expect(s.html()).not.toContain('Do not render this nested history.');
    expect(nodes(s.render()).filter(n => n.props?.['data-ml-design-comparison'] === 'revision')).toHaveLength(1);
    s.patch({ view: 'learn', manualTopic: 'record' });
    expect(s.html()).toContain('Visible preceding design.'); expect(s.html()).not.toContain('Do not render this nested history.');
    expect(nodes(s.render()).filter(n => n.props?.['data-ml-design-comparison'] === 'revision')).toHaveLength(1);
  });

  it('shows and copies fixed old/new evidence, both bounded notes and the latest explanation after live drift', async () => {
    const s = session({ leverEffortArm: 4 }); s.click('Replace design record');
    s.patch({ leverLoad: 800, loadDistance: 1, benchDesignLimits: { lever: { force: '250', travel: '8' } }, view: 'learn', manualTopic: 'record' });
    s.workNote('lever').props.onChange({ target: { value: 'Current\nFinal <script>literal</script>' } });
    const row = s.find(n => n.props?.['data-ml-design-record-station'] === 'lever');
    expect(text(row)).toContain('Original design reasoning.');
    expect(metric(s, 'effort', 'revision')).toEqual({ before: 200, after: 100, delta: -100 });
    expect(metric(s, 'travel', 'revision')).toEqual({ before: 1, after: 2, delta: 1 });
    expect(metric(s, 'work', 'revision')).toEqual({ before: 200, after: 200, delta: 0 });
    expect(s.html()).not.toContain('<script>literal</script>');
    const write = vi.fn(async () => true), descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    window.StemLab.writeClipboard = write; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } });
    try {
      const copy = s.find(n => n.type === 'button' && /Copy.*record/i.test(text(n))); expect(copy).toBeTruthy(); s.invoke(copy); await Promise.resolve();
      expect(write).toHaveBeenCalledOnce(); const copied = write.mock.calls[0][0];
      expect(copied).toContain('Original design reasoning.'); expect(copied).toContain('Current\nFinal <script>literal</script>');
      expect(copied).toMatch(/My explanation: Current\nFinal <script>literal<\/script>[\s\S]*Previous design:[\s\S]*Previous explanation: Original design reasoning\./);
      expect(copied).toContain('200 N'); expect(copied).toContain('100 N');
      expect(copied).toContain('1 m'); expect(copied).toContain('2 m'); expect(copied).toContain('200 J');
      expect(copied).not.toContain('800 N'); expect(copied).not.toContain('Maximum effort force: 250 N');
    } finally { if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor); else delete navigator.clipboard; }
  });
});
