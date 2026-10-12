import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Expected results use the physical givens below, never production math helpers.
const BENCHES = [
  { id: 'lever', load: 'leverLoad', settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 }, ma: 2 },
  { id: 'pulley', load: 'pulleyLoad', settings: { pulleySegments: 2, pulleyLoad: 400 }, ma: 2 },
  { id: 'windlass', load: 'windlassLoad', settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 }, ma: 4.5 },
  { id: 'ramp', load: 'rampLoad', settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 }, ma: 4 },
  { id: 'wedge', load: 'wedgeLoad', settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 }, ma: 5 },
  { id: 'screw', load: 'screwLoad', settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 }, ma: 60 * Math.PI }
];
const BASE = Object.assign({ loadDistance: 0.5 }, ...BENCHES.map(b => b.settings));
const NEW_SKILLS = [
  { id: 'output', unit: 'J', expected: b => b.settings[b.load] * 0.5, words: /useful|output/i },
  { id: 'efficiency', unit: '%', expected: () => 80, words: /efficiency/i },
  { id: 'actualMA', unit: '×', expected: b => b.ma * 0.8, words: /actual.*(MA|advantage)/i },
  { id: 'travel', unit: 'm', expected: b => 0.5 * b.ma, words: /travel/i }
];
const KINDS = ['input', 'force', 'loss', ...NEW_SKILLS.map(q => q.id), 'minMA', 'maxMA', 'forceEfficiency', 'taskEfficiency'];
const CASES = BENCHES.flatMap(b => NEW_SKILLS.map(q => ({ b, q, name: `${b.id}/${q.id}` })));
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function session(b = BENCHES[0], extra = {}) {
  const store = newStore({ machineLab: { view: 'machines', bench: b.id, bandOverride: 'g68', ...BASE, ...extra } });
  const awardXP = vi.fn(), tryAward = vi.fn();
  let renderedState, tree;
  const render = () => {
    if (renderedState !== store.toolData.machineLab) {
      renderedState = store.toolData.machineLab;
      tree = tool.render(makeCtx({ awardXP, tryAward }, store));
    }
    return tree;
  };
  const find = predicate => nodes(render()).find(predicate);
  const byId = suffix => find(n => n.props?.id === `ml-efficiency-${suffix}-${store.toolData.machineLab.bench}`);
  const action = kind => find(n => n.type === 'button' && n.props[`data-ml-efficiency-${kind}`] !== undefined);
  const invoke = node => { expect(node).toBeTruthy(); node.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }); };
  return { render, find, store, byId, action, invoke, awardXP, tryAward,
    state: () => store.toolData.machineLab,
    refresh: () => { renderedState = undefined; },
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    panel: () => find(n => n.props?.['data-ml-efficiency'] === store.toolData.machineLab.bench),
    practice: () => find(n => n.props?.['data-ml-efficiency-practice'] !== undefined),
    result: () => find(n => n.props?.['data-ml-efficiency-result'] !== undefined)?.props['data-ml-efficiency-result'],
    edit: (suffix, value) => { const n = byId(suffix); expect(n, `Missing ${suffix}`).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); },
    click: kind => { const n = action(kind); expect(n?.props.disabled).not.toBe(true); invoke(n); },
    recordRow: (id = b.id) => find(n => n.props?.['data-ml-efficiency-record-station'] === id),
    html: () => ReactDOMServer.renderToStaticMarkup(render()) };
}
function answer(s, q, value = q.expected(BENCHES.find(b => b.id === s.state().bench))) {
  s.edit('question', q.id); s.edit('answer', value); s.edit('unit', q.unit); s.click('check');
}
function record(q = NEW_SKILLS[0], extra = {}) {
  return { version: 2, benchId: 'lever', settings: { ...BENCHES[0].settings, loadDistance: 0.5 },
    percent: 80, question: q.id, answer: String(q.expected(BENCHES[0])), unit: q.unit, hint: 0, completion: 'checked', ...extra };
}

describe('Machine Lab: expanded efficiency calculations', () => {
  it.each(CASES)('checks, saves and reloads the independent $name result', ({ b, q }) => {
    const s = session(b), before = s.state(); answer(s, q);
    expect(s.result()).toBe('correct'); expect(s.action('save').props.disabled).toBe(false);
    expect(s.state().benchEfficiencyRecords).toBeUndefined();
    s.click('save'); const saved = s.state().benchEfficiencyRecords[b.id];
    expect(saved).toEqual({ version: 2, benchId: b.id, settings: { ...b.settings, loadDistance: 0.5 },
      percent: 80, question: q.id, answer: String(q.expected(b)), unit: q.unit, hint: 0, completion: 'checked' });
    for (const key of Object.keys(BASE)) expect(s.state()[key]).toBe(before[key]);
    const reloaded = session(b, { view: 'learn', manualTopic: 'record', benchEfficiencyRecords: JSON.parse(JSON.stringify(s.state().benchEfficiencyRecords)) });
    expect(reloaded.recordRow()).toBeTruthy(); expect(text(reloaded.recordRow())).toMatch(q.words);
    expect(text(reloaded.recordRow())).toContain(`Entered answer: ${String(q.expected(b))} ${q.unit}`);
    expect(text(reloaded.recordRow())).toContain('Answer checked');
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });

  it.each(NEW_SKILLS)('rejects an incorrect unit for $id and accepts the required $unit', q => {
    const s = session(); answer(s, q);
    for (const wrong of ['', q.unit === '%' ? '×' : '%']) {
      s.edit('unit', wrong); expect(s.result()).toBeUndefined(); s.click('check');
      expect(s.result()).toBe('unit'); expect(s.byId('unit').props['aria-invalid']).toBe(true);
      expect(s.action('save').props.disabled).toBe(true); s.invoke(s.action('save'));
      expect(s.state().benchEfficiencyRecords).toBeUndefined();
    }
    s.edit('unit', q.unit); s.click('check'); expect(s.result()).toBe('correct');
    expect(s.byId('unit').props['aria-invalid']).toBe(false);
  });

  it.each(NEW_SKILLS)('uses one-percent relative tolerance for the $id result', q => {
    const s = session(), target = q.expected(BENCHES[0]);
    answer(s, q, target * 0.9901); expect(s.result()).toBe('correct');
    s.edit('answer', target * 1.0099); s.click('check'); expect(s.result()).toBe('correct');
    s.edit('answer', target * 1.0101); s.click('check'); expect(s.result()).toBe('incorrect');
    s.edit('answer', target * 0.9899); s.click('check'); expect(s.result()).toBe('incorrect');
  });

  it('rejects zero and excessive rounding for a tiny actual MA while accepting a precise answer', () => {
    const s = session(BENCHES[0], { leverEffortArm: 0.2, leverLoadArm: 4 }); s.edit('percent', '1');
    const metric = s.find(n => n.props?.['data-ml-efficiency-metric'] === 'actualMA');
    expect(Number(metric.props['data-value'])).toBeCloseTo(0.0005, 12);
    expect(text(metric)).toContain('0.0005 ×'); expect(text(metric)).not.toContain('0.001 ×');
    answer(s, NEW_SKILLS[2], '0'); expect(s.result()).toBe('incorrect');
    s.edit('answer', '0.00049'); s.click('check'); expect(s.result()).toBe('incorrect');
    s.edit('answer', '0.0005049'); s.click('check'); expect(s.result()).toBe('correct');
    s.edit('answer', '0.0005'); s.click('check'); expect(s.result()).toBe('correct');
    s.click('save'); const saved = s.state().benchEfficiencyRecords.lever;
    expect(saved).toMatchObject({ version: 2, question: 'actualMA', answer: '0.0005', percent: 1, unit: '×' });
    s.patch({ view: 'learn', manualTopic: 'record' }); expect(s.recordRow()).toBeTruthy();
  });

  it('retains the legacy loss rounding allowance at exactly 100 percent', () => {
    const s = session(); s.edit('percent', '100');
    answer(s, { id: 'loss', unit: 'J' }, '0.0005'); expect(s.result()).toBe('correct');
    s.click('save'); expect(s.state().benchEfficiencyRecords.lever.version).toBe(1);
    s.edit('answer', '0.000501'); s.click('check'); expect(s.result()).toBe('incorrect');
  });

  it.each(NEW_SKILLS)('gives progressive hints for $id and records a viewed solution honestly', q => {
    const s = session(); s.edit('question', q.id); s.click('hint');
    const hint = () => s.find(n => n.props?.['data-ml-efficiency-hint-level'] !== undefined);
    expect(hint().props['data-ml-efficiency-hint-level']).toBe(1);
    expect(text(hint())).toMatch(q.words); expect(s.result()).toBeUndefined();
    s.click('hint'); expect(hint().props['data-ml-efficiency-hint-level']).toBe(2);
    expect(s.action('save').props.disabled).toBe(true); s.click('reveal');
    expect(s.result()).toBe('solution'); s.click('save');
    expect(s.state().benchEfficiencyRecords.lever).toMatchObject({ version: 2, question: q.id, answer: '', unit: '', hint: 2, completion: 'solution' });
    s.edit('answer', q.expected(BENCHES[0])); s.edit('unit', q.unit); s.click('check');
    expect(s.result()).toBe('solution'); s.click('save');
    expect(s.state().benchEfficiencyRecords.lever.completion).toBe('solution');
  });

  it('shows the exact near-100-percent efficiency and fraction in loss givens, setup and saved assumption', () => {
    const s = session(); s.edit('percent', '99.9999'); s.edit('question', 'loss');
    expect(text(s.find(n => n.props?.['data-ml-efficiency-given'] !== undefined))).toContain('99.9999%');
    s.click('hint'); s.click('hint'); expect(text(s.practice())).toContain('0.999999');
    s.click('reveal'); s.click('save'); s.patch({ view: 'learn', manualTopic: 'record' });
    expect(text(s.recordRow())).toContain('Assumed constant efficiency: 99.9999%');
    expect(text(s.recordRow())).toContain('0.999999');
  });
});

describe('Machine Lab: efficiency energy visualization', () => {
  it.each(BENCHES)('keeps $id useful and lost energy proportional at endpoint and fractional efficiencies', b => {
    const s = session(b), usefulJ = b.settings[b.load] * 0.5;
    for (const percent of [1, 37.5, 80, 99.9999, 100]) {
      s.edit('percent', percent); const before = s.state(), inputJ = usefulJ / (percent / 100);
      const chart = s.find(n => n.props?.['data-ml-efficiency-energy-split'] !== undefined);
      expect(chart).toBeTruthy();
      const parts = nodes(chart).filter(n => n.props?.['data-ml-efficiency-energy-part'] !== undefined);
      const bars = nodes(chart).filter(n => n.props?.['data-ml-efficiency-energy-bar'] !== undefined);
      expect(parts.map(n => n.props['data-ml-efficiency-energy-part']).sort()).toEqual(['loss', 'useful']);
      expect(bars.map(n => n.props['data-ml-efficiency-energy-bar']).sort()).toEqual(['loss', 'useful']);
      let sum = 0;
      for (const kind of ['useful', 'loss']) {
        const part = parts.find(n => n.props['data-ml-efficiency-energy-part'] === kind);
        const bar = bars.find(n => n.props['data-ml-efficiency-energy-bar'] === kind);
        const joules = kind === 'useful' ? usefulJ : inputJ - usefulJ, share = joules / inputJ * 100;
        expect(Number(part.props['data-value'])).toBeCloseTo(joules, 9);
        expect(Number(part.props['data-share'])).toBeCloseTo(share, 9);
        expect(parseFloat(bar.props.style.width)).toBeCloseTo(share, 9);
        expect(bar.props.style.minWidth ?? 0).toBe(0); sum += Number(part.props['data-value']);
      }
      expect(sum).toBeCloseTo(inputJ, 9); expect(text(chart)).not.toMatch(/NaN|Infinity/);
      expect(s.state()).toBe(before);
    }
  });

  it('removes energy bars when the efficiency assumption is invalid', () => {
    const s = session(); s.edit('percent', '100.01');
    expect(s.find(n => n.props?.['data-ml-efficiency-energy-split'] !== undefined)).toBeUndefined();
    expect(s.practice()).toBeUndefined(); expect(s.action('next')).toBeUndefined();
  });

  it('labels new practice controls, offers all eleven skills and announces feedback', () => {
    const s = session(), all = nodes(s.practice());
    expect(nodes(s.byId('question')).filter(n => n.type === 'option').map(n => n.props.value)).toEqual(KINDS);
    expect(nodes(s.byId('unit')).filter(n => n.type === 'option').map(n => n.props.value)).toEqual(expect.arrayContaining(['', 'N', 'J', 'm', '%', '×']));
    for (const key of ['question', 'answer', 'unit']) expect(all.some(n => n.type === 'label' && n.props.htmlFor === s.byId(key).props.id)).toBe(true);
    expect(all.some(n => n.props?.role === 'status' && n.props['aria-live'] === 'polite')).toBe(true);
    expect(s.action('next').props.type).toBe('button');
  });
});

describe('Machine Lab: Next calculation state integrity', () => {
  it('cycles through eleven skills and clears answer, unit, hints and completion without saving', () => {
    const s = session();
    for (let index = 0; index < KINDS.length; index++) {
      expect(s.byId('question').props.value).toBe(KINDS[index]);
      s.edit('answer', '123'); s.edit('unit', 'J'); s.click('hint'); s.click('reveal'); s.click('next');
      expect(s.byId('question').props.value).toBe(KINDS[(index + 1) % KINDS.length]);
      expect(s.byId('answer').props.value).toBe(''); expect(s.byId('unit').props.value).toBe('');
      expect(s.result()).toBeUndefined(); expect(s.action('save').props.disabled).toBe(true);
      expect(s.state().benchEfficiency.lever).toMatchObject({ percent: '80', answer: '', unit: '', hint: 0, checked: false, revealed: false });
      expect(s.state().benchEfficiencyRecords).toBeUndefined();
    }
  });

  it('preserves explicitly saved work when Next clears a new draft, and replaces only that station on Save', () => {
    const other = { note: 'untouched station' }, s = session(BENCHES[0], { benchEfficiencyRecords: { pulley: other } });
    answer(s, NEW_SKILLS[0]); s.click('save'); const first = s.state().benchEfficiencyRecords.lever;
    s.click('next'); expect(s.byId('question').props.value).toBe('efficiency');
    expect(s.state().benchEfficiencyRecords.lever).toBe(first);
    s.edit('answer', '80'); s.edit('unit', '%'); s.click('check');
    expect(s.state().benchEfficiencyRecords.lever).toBe(first); s.click('save');
    expect(s.state().benchEfficiencyRecords.lever).toMatchObject({ version: 2, question: 'efficiency', answer: '80', unit: '%' });
    expect(s.state().benchEfficiencyRecords.pulley).toBe(other);
  });

  it.each([
    ['station', { bench: 'pulley' }], ['view', { view: 'learn' }], ['geometry', { leverEffortArm: 3 }],
    ['load', { leverLoad: 500 }], ['movement', { loadDistance: 0.6 }],
    ['assumption', { benchEfficiency: { lever: { percent: '70', question: 'output' } } }]
  ])('rejects delayed Next and Save handlers after the %s changes', (_name, patch) => {
    const s = session(); answer(s, NEW_SKILLS[0]);
    const next = s.action('next'), save = s.action('save'); s.patch(patch); const before = s.state();
    s.invoke(next); s.invoke(save); expect(s.state()).toBe(before);
  });

  it('rejects old Next and Save after a newer question is selected', () => {
    const s = session(); answer(s, NEW_SKILLS[0]);
    const next = s.action('next'), save = s.action('save'); s.edit('question', 'travel'); const before = s.state();
    s.invoke(next); s.invoke(save); expect(s.state()).toBe(before);
    expect(s.byId('question').props.value).toBe('travel'); expect(s.state().benchEfficiencyRecords).toBeUndefined();
  });

  it('does not let a captured Save restore the completed answer cleared by Next', () => {
    const s = session(); answer(s, NEW_SKILLS[0]); const save = s.action('save');
    s.click('next'); const before = s.state(); s.invoke(save);
    expect(s.state()).toBe(before); expect(s.state().benchEfficiencyRecords).toBeUndefined();
  });
});

describe('Machine Lab: compatible and verifiable efficiency records', () => {
  it.each([
    { id: 'input', unit: 'J', value: '250' }, { id: 'force', unit: 'N', value: '250' }, { id: 'loss', unit: 'J', value: '50' }
  ])('keeps a version-1 $id record readable and rejects the same legacy question mislabeled version 2', q => {
    const legacy = record(NEW_SKILLS[0], { version: 1, question: q.id, unit: q.unit, answer: q.value });
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record', benchEfficiencyRecords: { lever: legacy } });
    expect(s.recordRow()).toBeTruthy(); expect(s.state().benchEfficiencyRecords.lever).toBe(legacy);
    s.patch({ benchEfficiencyRecords: { lever: { ...legacy, version: 2 } } }); expect(s.recordRow()).toBeUndefined();
    // New unit choices are also distractors for older skills. A viewed solution
    // may honestly retain one; an independently checked answer must still use
    // the question's correct unit.
    s.patch({ benchEfficiencyRecords: { lever: { ...legacy, completion: 'solution', unit: '%' } } });
    expect(s.recordRow()).toBeTruthy(); expect(text(s.recordRow())).toContain('Worked solution viewed');
    s.patch({ benchEfficiencyRecords: { lever: { ...legacy, completion: 'checked', unit: '%' } } });
    expect(s.recordRow()).toBeUndefined();
  });

  it.each(NEW_SKILLS)('rejects version 1, forged arithmetic and forged units for the new $id record', q => {
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record' });
    for (const patch of [{ version: 1 }, { answer: '999999' }, { unit: q.unit === '%' ? '×' : '%' }]) {
      s.patch({ benchEfficiencyRecords: { lever: record(q, patch) } }); expect(s.recordRow()).toBeUndefined();
    }
    s.patch({ benchEfficiencyRecords: { lever: record(q) } }); expect(s.recordRow()).toBeTruthy();
  });

  it.each([
    ['unsupported version', { version: 3 }], ['wrong station', { benchId: 'pulley' }],
    ['string percentage', { percent: '80' }], ['out-of-range percentage', { percent: 100.1 }],
    ['missing geometry', { settings: { leverLoad: 400, loadDistance: 0.5 } }],
    ['unknown question', { question: 'speed' }], ['unknown unit', { unit: 'W' }],
    ['invalid hints', { hint: 3 }], ['invalid completion', { completion: 'passed' }],
    ['non-string answer', { answer: 200 }], ['overlong answer', { answer: '2'.repeat(65) }]
  ])('omits a version-2 record with %s', (_name, patch) => {
    const s = session(BENCHES[0], { benchEfficiencyRecords: { lever: record(NEW_SKILLS[0], patch) } });
    expect(s.find(n => n.props?.['data-ml-efficiency-saved'] === 'lever')).toBeUndefined();
    s.patch({ view: 'learn', manualTopic: 'record' }); expect(s.recordRow()).toBeUndefined();
  });

  it('rejects a forged zero actual-MA record at the smallest supported lever ratio', () => {
    const tiny = record(NEW_SKILLS[2], { percent: 1, answer: '0', settings: { leverEffortArm: 0.2, leverLoadArm: 4, leverLoad: 400, loadDistance: 0.5 } });
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record', benchEfficiencyRecords: { lever: tiny } });
    expect(s.recordRow()).toBeUndefined();
    s.patch({ benchEfficiencyRecords: { lever: { ...tiny, answer: '0.0005' } } }); expect(s.recordRow()).toBeTruthy();
  });

  it('exports a new saved calculation from its fixed task with honest solution provenance', async () => {
    const saved = record(NEW_SKILLS[3], { answer: '<script>literal</script>', unit: '', hint: 2, completion: 'solution', travel: 9999, workIn: 9999 });
    const s = session(BENCHES[0], { view: 'learn', manualTopic: 'record', leverLoad: 900, leverEffortArm: 4, benchEfficiencyRecords: { lever: saved } });
    const evidence = text(s.recordRow());
    for (const snippet of ['Recorded efficiency calculation: Lever', '80%', '400 N', '250 N', '200 J', '250 J', 'Worked solution viewed', 'Hints opened: 2/2']) expect(evidence).toContain(snippet);
    expect(evidence).not.toContain('9999'); expect(s.html()).not.toContain('<script>literal</script>');
    const write = vi.fn(async () => true), descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    window.StemLab.writeClipboard = write;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } });
    try {
      s.refresh(); s.invoke(s.find(n => n.type === 'button' && /Copy.*record/i.test(text(n)))); await Promise.resolve();
      expect(write).toHaveBeenCalledOnce(); const copied = write.mock.calls[0][0];
      for (const snippet of ['Recorded efficiency calculation: Lever', '400 N', '250 N', '200 J', '250 J', 'Worked solution viewed', 'Hints opened: 2/2', saved.answer]) expect(copied).toContain(snippet);
      expect(copied).not.toContain('9999'); expect(s.state().benchEfficiencyRecords.lever).toBe(saved);
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor); else delete navigator.clipboard;
    }
  });
});
