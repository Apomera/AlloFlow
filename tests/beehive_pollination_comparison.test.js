import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Bee flower-case comparison design', () => {
  let BH, config, root, host, latest, setGrade, originalRaf, originalCancel;
  beforeAll(() => {
    resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive;
  }, 120000);
  beforeEach(() => {
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    originalRaf = globalThis.requestAnimationFrame; originalCancel = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
  });
  afterEach(() => {
    if (root) act(() => root.unmount()); if (host) host.remove(); root = host = null;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancel;
    vi.restoreAllMocks();
  });
  const state = (pollen, contact, compatible) => ({ pollen, contact, compatible });
  const start = () => state(true, false, true);
  function snapshot(caseValue = start(), extra = {}) {
    const r = BH.bhPollinationReading(caseValue);
    return { version: 1, lesson: 'pollination', mode: 'beekeeper', runKey: 'pollination:777:2:pollen-transfer-1', clock: 0, label: 'Flower case · ' + r.outcome.toLowerCase(), metrics: [
      { id: 'pollen', label: 'Loose pollen carried', value: Number(r.pollen), unit: '0/1', angle: false },
      { id: 'contact', label: 'Stigma contact', value: Number(r.contact), unit: '0/1', angle: false },
      { id: 'compatible', label: 'Pollen compatible', value: Number(r.compatible), unit: '0/1', angle: false },
      { id: 'transfer', label: 'Pollen transfer shown', value: Number(r.transferred), unit: '0/1', angle: false },
      { id: 'possible', label: 'Later fertilization possible (not observed)', value: Number(r.possible), unit: '0/1', angle: false }
    ], ...extra };
  }
  const compare = (before = start(), after = state(true, true, true)) => BH.bhDiscoveryComparison(snapshot(before), snapshot(after));
  const record = (before = start(), after = state(true, true, true)) => ({ prediction: 2, checked: true, observation: 'Original selected case', snapshot: snapshot(before), comparison: compare(before, after), note: 'My earlier explanation', teacher: { retained: true } });
  async function mount(overrides = {}, grade = '7th Grade') {
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    function Component() {
      const [toolData, setToolData] = React.useState({ beehive: { ...BH.bhCreateNewColonyState(777, 2, 0),
        viewMode: 'beekeeper', beeView: 'pollination', discoveryLesson: 'pollination', day: 12, totalFlowerVisits: 3500,
        tutorialDone: true, soundOn: false, motionPaused: true, ...overrides }, otherTool: { retained: true } });
      const [gradeLevel, updateGrade] = React.useState(grade); latest = toolData; setGrade = updateGrade;
      return config.render(makeCtx({ toolData, setToolData, gradeLevel }));
    }
    await act(async () => root.render(React.createElement(Component)));
  }
  const card = () => host.querySelector('[data-beehive-discovery]');
  const coach = () => card().querySelector('[data-pollination-comparison]');
  const button = (name) => Array.from(card().querySelectorAll('button')).find(n => n.textContent === name);
  const simulation = () => { const { discoveryRecords, notebook, pollinationLab, ...colony } = latest.beehive; return structuredClone({ colony, otherTool: latest.otherTool }); };
  async function click(name) { await act(async () => button(name).click()); }

  it.each([
    ['contact with pollen', [true, false, true], [true, true, true], 'one-change', ['contact'], ['transfer', 'possible']],
    ['pollen with contact', [false, true, true], [true, true, true], 'one-change', ['pollen'], ['transfer', 'possible']],
    ['compatibility after transfer', [true, true, true], [true, true, false], 'one-change', ['compatible'], ['possible']],
    ['contact without pollen', [false, false, true], [false, true, true], 'one-change-null', ['contact'], []],
    ['compatibility without contact', [true, false, true], [true, false, false], 'one-change-null', ['compatible'], []],
    ['same case', [true, false, true], [true, false, true], 'same-case', [], []],
    ['two inputs with unchanged outcomes', [true, false, true], [false, true, true], 'several-changes', ['pollen', 'contact'], []],
    ['two inputs with changed outcomes', [false, false, true], [true, true, true], 'several-changes', ['pollen', 'contact'], ['transfer', 'possible']],
    ['three inputs', [false, false, false], [true, true, true], 'several-changes', ['pollen', 'contact', 'compatible'], ['transfer', 'possible']]
  ])('separates conditions and outcomes for %s', (_, a, b, kind, changed, outputs) => {
    const insight = BH.bhPollinationComparisonInsight(compare(state(...a), state(...b)));
    expect(insight.kind).toBe(kind); expect(insight.changedInputs.map(row => row.id)).toEqual(changed);
    expect(insight.changedCount).toBe(changed.length); expect(insight.inputs).toHaveLength(3);
    expect(insight.outputs.filter(row => row.changed).map(row => row.id)).toEqual(outputs);
    expect(insight.fixedInputs).toHaveLength(3 - changed.length);
  });
  it('describes a compatibility change without calling fertilization an observed outcome', () => {
    const insight = BH.bhPollinationComparisonInsight(compare(state(true, true, true), state(true, true, false)));
    expect(insight.detail).toContain('Pollen transfer stayed the same'); expect(insight.detail).toContain('not observed');
  });
  it('does not confuse two derived output changes with two selected input changes', () => {
    const value = compare(), original = structuredClone(value);
    const random = vi.spyOn(Math, 'random'), now = vi.spyOn(Date, 'now'); random.mockClear(); now.mockClear();
    const insight = BH.bhPollinationComparisonInsight(value);
    expect(insight.changedCount).toBe(1); expect(insight.outputs.every(row => row.changed)).toBe(true);
    expect(value).toEqual(original); expect(random).not.toHaveBeenCalled(); expect(now).not.toHaveBeenCalled();
  });
  it('matches reordered fields by identity and uses known labels instead of imported claims', () => {
    const value = compare(); value.rows.reverse(); value.rows[0].label = 'Fertilization observed';
    const insight = BH.bhPollinationComparisonInsight(value);
    expect(insight.inputs.map(row => row.id)).toEqual(['pollen', 'contact', 'compatible']);
    expect(insight.outputs[1].label).toBe('Later fertilization possible (not observed)');
  });
  it.each(['missing', 'duplicate', 'unknown', 'wrong-unit', 'non-binary', 'string', 'bad-delta', 'wrong-transfer', 'wrong-possibility', 'angle'])('refuses contradictory or malformed %s evidence without editing it', kind => {
    const value = compare();
    if (kind === 'missing') value.rows.pop();
    if (kind === 'duplicate') value.rows[4] = { ...value.rows[3] };
    if (kind === 'unknown') value.rows[4].id = 'seeds';
    if (kind === 'wrong-unit') value.rows[0].unit = '%';
    if (kind === 'non-binary') { value.rows[0].after = .5; value.rows[0].delta = -.5; }
    if (kind === 'string') value.rows[0].before = '1';
    if (kind === 'bad-delta') value.rows[0].delta = 1;
    if (kind === 'wrong-transfer') { value.rows[3].after = 0; value.rows[3].delta = 0; }
    if (kind === 'wrong-possibility') { value.rows[4].after = 0; value.rows[4].delta = 0; }
    if (kind === 'angle') value.rows[0].angle = true;
    const original = structuredClone(value); expect(BH.bhPollinationComparisonInsight(value)).toBeNull(); expect(value).toEqual(original);
  });
  it.each([null, {}, [], { error: 'invalid-evidence', rows: [] }])('does not analyze absent evidence %j', value => {
    expect(BH.bhPollinationComparisonInsight(value)).toBeNull();
  });
  it('accepts all eight modeled cases and the supported run bounds', () => {
    for (const pollen of [true, false]) for (const contact of [true, false]) for (const compatible of [true, false]) expect(BH.bhPollinationSnapshotValid(snapshot(state(pollen, contact, compatible)))).toBe(true);
    expect(BH.bhPollinationSnapshotValid(snapshot(start(), { runKey: 'pollination:0:10000000:pollen-transfer-1' }))).toBe(true);
    expect(BH.bhPollinationSnapshotValid(snapshot(start(), { runKey: 'pollination:4294967295:1:pollen-transfer-1' }))).toBe(true);
  });
  it.each(['pollination:777:2:pollen-transfer-2', 'pollination:4294967296:2:pollen-transfer-1', 'pollination:777:0:pollen-transfer-1', 'pollination:777:10000001:pollen-transfer-1', 'pollination:0777:2:pollen-transfer-1', 'colony:777:2', 'pollination:777:2:pollen-transfer-1:extra'])('retains but rejects an unsupported identity %s', runKey => {
    const value = snapshot(start(), { runKey }), original = structuredClone(value);
    expect(BH.bhPollinationSnapshotValid(value)).toBe(false); expect(value).toEqual(original);
  });
  it.each(['counterfeit-transfer', 'non-binary', 'wrong-clock'])('blocks %s snapshots in the shared comparison path', kind => {
    const before = snapshot();
    if (kind === 'counterfeit-transfer') before.metrics[3].value = 1;
    if (kind === 'non-binary') before.metrics[0].value = .25;
    if (kind === 'wrong-clock') before.clock = 1;
    expect(BH.bhDiscoveryComparison(before, snapshot())).toEqual({ error: 'invalid-evidence' });
    expect(BH.bhDiscoveryEvidenceReadiness({ observation: 'Imported case', snapshot: before }, snapshot()).ready).toBe(false);
  });
  it('does not treat a consistent delta as proof of a valid derived outcome', () => {
    const value = record(); value.comparison.rows[4].after = 0; value.comparison.rows[4].delta = 0;
    const original = structuredClone(value), readiness = BH.bhDiscoveryEvidenceReadiness(value, snapshot());
    expect(readiness).toMatchObject({ ready: false, captured: false, reason: 'invalid-evidence' }); expect(value).toEqual(original);
  });
  it('includes the comparison design in exported text without altering old frozen rows', () => {
    const value = compare(state(false, false, true), state(true, true, true)), before = structuredClone(value);
    const text = BH.bhDiscoveryComparisonText(value);
    expect(text).toContain('2 selected conditions changed'); expect(text).toContain('cannot isolate'); expect(text).toContain('Fertilization was not observed'); expect(value).toEqual(before);
  });
  it.each([['K–2', 'Starting case'], ['3–5', 'held fixed'], ['6–8', 'unchanged'], ['9–12', 'isolates']])('supports %s reflection', (grade, expected) => {
    expect(BH.bhPollinationComparisonPrompt(grade)).toContain(expected);
  });

  it('renders separate inputs and outputs without spending colony resources', async () => {
    await mount({ discoveryRecords: { pollination: record() } }); const before = simulation();
    expect(coach().dataset.pollinationComparison).toBe('one-change');
    expect(coach().querySelector('[data-pollination-design]').dataset.pollinationDesign).toBe('1');
    expect(coach().querySelectorAll('[data-evidence-kind="input"]')).toHaveLength(3);
    expect(coach().querySelectorAll('[data-evidence-kind="output"]')).toHaveLength(2);
    expect(coach().querySelector('[data-evidence-metric="contact"]').textContent).toContain('Changed');
    expect(coach().querySelector('[data-evidence-metric="pollen"]').textContent).toContain('Held fixed');
    expect(simulation()).toEqual(before);
  });
  it('keeps a one-change null result saveable as evidence, while identifying its limits', async () => {
    const value = record(state(false, false, true), state(false, true, true));
    await mount({ pollinationLab: state(false, true, true), discoveryRecords: { pollination: value } });
    expect(coach().dataset.pollinationComparison).toBe('one-change-null'); expect(coach().textContent).toContain('Both modeled outcomes stayed the same');
    expect(button('Save discovery').disabled).toBe(false); await click('Save discovery');
    expect(latest.beehive.notebook.discoveries.pollination.comparison).toContain('1 selected condition changed');
    expect(latest.beehive.notebook.discoveries.pollination.explanation).toBe('My earlier explanation');
  });
  it('allows a several-change description without claiming one isolated cause or replacing notebook writing', async () => {
    const value = record(state(false, false, true), state(true, true, true));
    const notebook = { beekeeper: { evidence: 'Colony evidence', claim: 'Keep', reasoning: 'Keep' }, queen: { evidence: 'Queen note' }, synthesis: 'Retain' };
    await mount({ pollinationLab: state(true, true, true), discoveryRecords: { pollination: value }, notebook }); const before = simulation();
    expect(coach().dataset.pollinationComparison).toBe('several-changes'); expect(coach().textContent).toContain('cannot isolate');
    await click('Save discovery'); expect(latest.beehive.notebook.beekeeper).toEqual(notebook.beekeeper);
    expect(latest.beehive.notebook.queen).toEqual(notebook.queen); expect(latest.beehive.notebook.synthesis).toBe('Retain');
    expect(latest.beehive.notebook.discoveries.pollination.comparison).toContain('2 selected conditions changed'); expect(simulation()).toEqual(before);
  });
  it('keeps the guidance frozen when live controls and the grade change', async () => {
    const value = record(); await mount({ discoveryRecords: { pollination: value } }, '2nd Grade');
    expect(coach().querySelector('[data-pollination-reflection]').textContent).toContain('Starting case');
    const original = structuredClone(latest.beehive.discoveryRecords.pollination);
    await act(async () => host.querySelector('#bee-pollen-pollen').click()); await act(async () => setGrade('11th Grade'));
    expect(coach().dataset.pollinationComparison).toBe('one-change'); expect(coach().querySelector('[data-evidence-metric="pollen"]').textContent).toContain('Starting casePresentCompared casePresent');
    expect(coach().querySelector('[data-pollination-reflection]').textContent).toContain('isolates');
    expect(latest.beehive.discoveryRecords.pollination).toEqual(original);
  });
  it('preserves contradictory flower-model evidence and earlier notebook writing when comparing fails', async () => {
    const value = record(); value.snapshot.metrics[3].value = 1;
    // Structurally valid arithmetic can still contradict the flower model.
    const transfer = value.comparison.rows.find(row => row.id === 'transfer');
    transfer.before = 1; transfer.delta = transfer.after - transfer.before;
    const original = structuredClone(value), notebook = { discoveries: { pollination: { explanation: 'Keep earlier work', evidence: value.snapshot } } };
    await mount({ discoveryRecords: { pollination: value }, notebook });
    expect(latest.beehive.discoveryRecords.pollination.comparison).toEqual(original.comparison);
    expect(coach()).toBeNull(); expect(button('Save discovery').disabled).toBe(true);
    await click('Compare now');
    expect(latest.beehive.discoveryRecords.pollination.snapshot).toEqual(original.snapshot);
    expect(latest.beehive.discoveryRecords.pollination.comparison).toEqual(original.comparison);
    expect(latest.beehive.discoveryRecords.pollination.note).toBe(original.note); expect(latest.beehive.notebook).toEqual(notebook);
  });
  it('round-trips earlier comparison records without requiring new metadata', () => {
    const value = record(), original = structuredClone(value), colony = { ...BH.bhCreateNewColonyState(777, 2, 0), discoveryRecords: { pollination: value }, notebook: { discoveries: { pollination: { comparisonEvidence: value.comparison, explanation: 'Retain' } } } };
    const restored = BH.bhReadBeeBackup(BH.bhBuildBeeBackup(colony, '2026-10-05T12:00:00Z')).state;
    expect(restored.discoveryRecords.pollination).toEqual(original);
    expect(BH.bhDiscoveryEvidenceReadiness(restored.discoveryRecords.pollination, snapshot()).ready).toBe(true);
    expect(restored.notebook).toEqual(colony.notebook);
  });
});
