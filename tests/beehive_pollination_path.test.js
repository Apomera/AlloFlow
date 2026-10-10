import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Bee pollen-transfer activity', () => {
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
  async function mount(overrides = {}, grade = '7th Grade') {
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    function Component() {
      const [toolData, setToolData] = React.useState({ beehive: { ...BH.bhCreateNewColonyState(777, 1, 0),
        viewMode: 'beekeeper', beeView: 'pollination', discoveryLesson: 'pollination', day: 60,
        tutorialDone: true, soundOn: false, motionPaused: true, ...overrides }, otherTool: { retained: true } });
      const [gradeLevel, updateGrade] = React.useState(grade); latest = toolData; setGrade = updateGrade;
      return config.render(makeCtx({ toolData, setToolData, gradeLevel }));
    }
    await act(async () => root.render(React.createElement(Component)));
  }
  const lab = () => host.querySelector('[data-pollination-lab]');
  const card = () => host.querySelector('[data-beehive-discovery]');
  const simulation = () => { const { pollinationLab, ...colony } = latest.beehive; return structuredClone({ colony, otherTool: latest.otherTool }); };
  async function click(node, text) { await act(async () => Array.from(node.querySelectorAll('button')).find(n => n.textContent === text).click()); }

  const cases = [];
  for (const pollen of [false, true]) for (const contact of [false, true]) for (const compatible of [false, true]) cases.push({ pollen, contact, compatible });
  it.each(cases)('separates deposition and later possibility for %j', value => {
    const r = BH.bhPollinationReading(value);
    expect(r).toMatchObject(value); expect(r.transferred).toBe(value.pollen && value.contact);
    expect(r.possible).toBe(value.pollen && value.contact && value.compatible);
    expect(r.outcome).toBe(r.transferred ? 'Pollen transfer shown' : 'No pollen transfer shown');
    if (r.transferred && !r.compatible) expect(r.next).toContain('incompatible');
    if (r.possible) expect(r.next).toContain('not observed');
  });
  it.each([null, [], false, 4, { pollen: 'false', contact: 1, compatible: null }, { pollen: undefined, contact: NaN, compatible: Infinity }])('normalizes malformed cases without inventing outcomes %j', value => {
    expect(BH.bhPollinationReading(value)).toMatchObject({ ...BH.BH_POLLINATION_DEFAULTS, transferred: false, possible: false });
  });
  it('has no random draws, clock reads or mutation in the reading and controls', () => {
    const value = Object.freeze({ pollen: true, contact: true, compatible: false });
    const random = vi.spyOn(Math, 'random'), now = vi.spyOn(Date, 'now'); random.mockClear(); now.mockClear();
    BH.bhPollinationReading(value); BH.bhSetPollinationControl(value, 'compatible', true);
    expect(random).not.toHaveBeenCalled(); expect(now).not.toHaveBeenCalled();
    expect(value.compatible).toBe(false);
  });
  it('retains writing and unknown metadata when changing and resetting a case', () => {
    const value = { pollen: false, contact: true, compatible: false, note: 'Keep', teacher: { note: 'Retain' } };
    const before = structuredClone(value), next = BH.bhSetPollinationControl(value, 'pollen', true);
    expect(next).toEqual({ ...value, pollen: true }); expect(value).toEqual(before); expect(next.teacher).toBe(value.teacher);
    expect(BH.bhSetPollinationControl(next, 'reset')).toEqual({ ...value, ...BH.BH_POLLINATION_DEFAULTS });
  });
  it.each([['pollen', 'true'], ['contact', 1], ['compatible', null], ['unknown', true], ['__proto__', true]])('ignores malformed %s input', (key, value) => {
    const original = { ...BH.BH_POLLINATION_DEFAULTS, note: 'Keep' };
    expect(BH.bhSetPollinationControl(original, key, value)).toEqual(original);
  });
  it.each([
    ['K–2', 'dots'], ['3–5', 'Change only'], ['6–8', 'insufficient'], ['9–12', 'inference']
  ])('supports a %s explanation without claiming seed success', (band, word) => {
    expect(BH.bhPollinationLesson(band).reasoning).toContain(word);
  });
  it('shows a visit without transfer initially and changes the diagram without spending colony resources', async () => {
    await mount(); const before = simulation();
    expect(lab().querySelector('[data-pollination-outcome]').dataset.pollinationOutcome).toBe('no-transfer');
    expect(latest.beehive.pollinationLab).toBeUndefined();
    await act(async () => lab().querySelector('#bee-pollen-contact').click());
    expect(lab().querySelector('[data-pollination-outcome]').dataset.pollinationOutcome).toBe('transfer');
    expect(lab().querySelector('svg[aria-label^="Pollen grains deposited"]')).not.toBeNull();
    await act(async () => lab().querySelector('#bee-pollen-compatible').click());
    expect(lab().querySelector('[data-pollination-outcome]').textContent).toContain('transfer still occurred');
    expect(simulation()).toEqual(before);
  });
  it('applies rapid checkbox changes to the latest state and preserves metadata through reset', async () => {
    await mount({ pollinationLab: { ...BH.BH_POLLINATION_DEFAULTS, teacher: { note: 'Keep' }, note: 'Original explanation' } });
    const before = simulation();
    await act(async () => { lab().querySelector('#bee-pollen-contact').click(); lab().querySelector('#bee-pollen-compatible').click(); });
    expect(latest.beehive.pollinationLab).toMatchObject({ pollen: true, contact: true, compatible: false, teacher: { note: 'Keep' } });
    await click(lab(), 'Reset flower case');
    expect(latest.beehive.pollinationLab).toEqual({ ...BH.BH_POLLINATION_DEFAULTS, teacher: { note: 'Keep' }, note: 'Original explanation' });
    expect(simulation()).toEqual(before);
  });
  it('captures normalized flower evidence in a separate versioned run', async () => {
    await mount({ pollinationLab: { pollen: 'invalid', contact: true, compatible: false } });
    await click(card(), 'Capture observation');
    const snapshot = latest.beehive.discoveryRecords.pollination.snapshot;
    expect(snapshot.runKey).toBe('pollination:777:1:pollen-transfer-1'); expect(snapshot.clock).toBe(0);
    expect(snapshot.metrics.map(m => [m.id, m.value, m.unit])).toEqual([
      ['pollen', 1, '0/1'], ['contact', 1, '0/1'], ['compatible', 0, '0/1'], ['transfer', 1, '0/1'], ['possible', 0, '0/1']
    ]);
    expect(snapshot.metrics.find(m => m.id === 'possible').label).toContain('not observed');
    expect(snapshot.summary).toContain('Loose pollen carried Yes (1)');
    expect(snapshot.summary).toContain('Later fertilization possible (not observed) No (0)');
  });
  it('formats a frozen flower comparison as yes/no conditions without percentages or measured seed claims', async () => {
    await mount(); await click(card(), 'Capture observation');
    const before = structuredClone(latest.beehive.discoveryRecords.pollination.snapshot);
    await act(async () => lab().querySelector('#bee-pollen-contact').click());
    await click(card(), 'Compare now');
    const comparison = latest.beehive.discoveryRecords.pollination.comparison;
    expect(comparison.rows.find(row => row.id === 'transfer')).toMatchObject({ before: 0, after: 1 });
    expect(card().querySelector('[data-evidence-metric="transfer"]').textContent).toContain('Starting caseNot shownCompared caseShown');
    expect(BH.bhDiscoveryComparisonText(comparison)).toContain('Fertilization was not observed');
    expect(latest.beehive.discoveryRecords.pollination.snapshot).toEqual(before);
  });
  it('preserves an older colony observation and notebook entry until a new discovery is saved', async () => {
    const snapshot = { version: 1, lesson: 'pollination', mode: 'beekeeper', runKey: 'colony:777:1', clock: 60, label: 'Day 60', metrics: [{ id: 'honey', label: 'Food stores', value: 40, unit: 'lb' }] };
    const oldRecord = { prediction: 2, checked: true, saved: true, observation: 'Earlier colony totals', snapshot, note: 'Earlier explanation' };
    const oldNotebook = { title: 'A flower connection', observation: oldRecord.observation, explanation: oldRecord.note, evidence: snapshot };
    await mount({ discoveryRecords: { pollination: oldRecord }, notebook: { discoveries: { pollination: oldNotebook } } });
    expect(card().querySelector('[data-discovery-feedback]').dataset.discoveryFeedback).toBe('pending');
    expect(card().textContent).toContain('Capture a fresh observation');
    expect(latest.beehive.discoveryRecords.pollination).toEqual(oldRecord);
    await click(card(), 'Update observation');
    expect(latest.beehive.discoveryRecords.pollination.note).toBe(oldRecord.note);
    expect(latest.beehive.notebook.discoveries.pollination).toEqual(oldNotebook);
  });
  it('keeps an expanded activity singular and preserves conditions through grade changes', async () => {
    await mount({ focusLayout: false, pollinationLab: { pollen: true, contact: true, compatible: false } }, '2nd Grade');
    expect(host.querySelectorAll('[data-pollination-lab]')).toHaveLength(1);
    expect(lab().querySelector('[data-pollination-grade]').textContent).toContain('dots');
    await act(async () => setGrade('11th Grade'));
    expect(lab().querySelector('[data-pollination-grade]').textContent).toContain('deposition');
    expect(latest.beehive.pollinationLab).toEqual({ pollen: true, contact: true, compatible: false });
  });
  it('defines pollination without promising fruit or stronger offspring', () => {
    expect(BH.POLLINATION_SCIENCE[0].explanation).toContain('separate event');
    expect(BH.POLLINATION_SCIENCE[0].explanation).toContain('within one flower');
    expect(BH.POLLINATION_SCIENCE[1].explanation).toContain('Compatibility');
    expect(BH.POLLINATION_SCIENCE[1].explanation.includes('stronger offspring')).toBe(false);
  });
});
