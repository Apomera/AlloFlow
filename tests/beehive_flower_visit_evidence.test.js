import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Bee flower-visit evidence', () => {
  let BH, config, root, host, latest, updateData, setGrade, originalRaf, originalCancel;
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
      const [toolData, setToolData] = React.useState({ beehive: { ...BH.bhCreateNewColonyState(777, 2, 0),
        viewMode: 'beekeeper', beeView: 'pollination', discoveryLesson: 'pollination', day: 3, totalFlowerVisits: 2000,
        tutorialDone: true, soundOn: false, motionPaused: true, ...overrides }, otherTool: { retained: true } });
      const [gradeLevel, updateGrade] = React.useState(grade); latest = toolData; updateData = setToolData; setGrade = updateGrade;
      return config.render(makeCtx({ toolData, setToolData, gradeLevel }));
    }
    await act(async () => root.render(React.createElement(Component)));
  }
  const panel = () => host.querySelector('[data-flower-visit-study]');
  const button = name => Array.from(panel().querySelectorAll('button')).find(n => n.textContent === name);
  const colony = () => { const { flowerVisitStudy, notebook, ...state } = latest.beehive; return structuredClone({ state, otherTool: latest.otherTool }); };
  const snapshot = (day = 3, visits = 2000, extra = {}) => BH.bhCaptureFlowerVisits({ ...BH.bhCreateNewColonyState(777, 2, 0), day, totalFlowerVisits: visits, ...extra });
  const study = (extra = {}) => BH.bhFreezeFlowerVisitStudy(BH.bhStartFlowerVisitStudy({ explanation: 'More visits do not establish more seeds.', teacher: { retained: true }, ...extra }, snapshot()).study, snapshot(5, 3500)).study;
  async function changeColony(patch) { await act(async () => updateData(prev => ({ ...prev, beehive: { ...prev.beehive, ...patch } }))); }
  async function click(name) { await act(async () => button(name).click()); }
  async function write(text) {
    await act(async () => {
      const input = panel().querySelector('textarea');
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(input, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  it('distinguishes an unstarted zero from an unavailable older counter', () => {
    expect(BH.bhFlowerVisitCounter({})).toBe(0);
    expect(BH.bhFlowerVisitCounter({ day: 0 })).toBe(0);
    expect(BH.bhFlowerVisitCounter({ day: 8 })).toBeNull();
    expect(BH.bhFlowerVisitCounter({ day: 8, totalFlowerVisits: 0 })).toBe(0);
  });
  it.each([-1, 2.5, '2000', null, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])('does not invent a count from %s', value => {
    expect(BH.bhFlowerVisitCounter({ day: 3, totalFlowerVisits: value })).toBeNull();
    expect(snapshot(3, value)).toBeNull();
  });
  it('captures the recorded run identity without retaining unrelated fields or aliases', () => {
    const value = snapshot();
    expect(value).toEqual({ schemaVersion: 1, kind: 'flower-visits', day: 3, visits: 2000, simulationSeed: 777, runSerial: 2, modelVersion: BH.BEEHIVE_COLONY_MODEL_VERSION, seededFromDay: 0 });
    const normalized = BH.bhNormalizeFlowerVisitSnapshot({ ...value, modelVersion: '  ' + value.modelVersion + '  ', foreign: true });
    expect(normalized).toEqual(value); expect(normalized).not.toBe(value);
  });
  it.each([
    { day: undefined }, { day: -1 }, { day: 2.5 }, { day: 10000001 },
    { simulationSeed: undefined }, { simulationSeed: '777' }, { simulationSeed: 4294967296 },
    { experimentRunSerial: 0 }, { experimentRunSerial: undefined }, { seededFromDay: undefined }, { seededFromDay: 4 },
    { modelVersion: undefined }, { modelVersion: 'unknown-model' }, { modelVersion: 'bad\nmodel' }
  ])('does not supply missing or malformed provenance %j', extra => {
    expect(snapshot(3, 2000, extra)).toBeNull();
  });
  it('accepts a recorded zero seed and adoption at the observation day', () => {
    expect(snapshot(3, 0, { simulationSeed: 0, seededFromDay: 3 })).toMatchObject({ visits: 0, simulationSeed: 0, seededFromDay: 3 });
  });
  it('computes an interval difference and mean from the two cumulative readings', () => {
    expect(BH.bhCompareFlowerVisits(snapshot(), snapshot(5, 3500))).toMatchObject({ ok: true, elapsedDays: 2, visitsAdded: 1500, meanPerDay: 750 });
  });
  it('allows a zero difference across later days without making a plant-outcome claim', () => {
    expect(BH.bhCompareFlowerVisits(snapshot(3, 0), snapshot(5, 0))).toMatchObject({ ok: true, visitsAdded: 0, meanPerDay: 0 });
  });
  it.each([
    [{ simulationSeed: 778 }, 'different-run'], [{ experimentRunSerial: 3 }, 'different-run'],
    [{ modelVersion: 'colony-daily-future' }, 'different-model'], [{ seededFromDay: 1 }, 'different-tracking'],
    [{ day: 2 }, 'earlier-day'], [{ totalFlowerVisits: 1999 }, 'counter-decreased'],
    [{ day: 3, totalFlowerVisits: 2000 }, 'wait'], [{ day: 3 }, 'same-day-change'],
    [{ totalFlowerVisits: undefined }, 'invalid-observation']
  ])('rejects incompatible interval %j with %s', (extra, reason) => {
    expect(BH.bhCompareFlowerVisits(snapshot(), snapshot(5, 3500, extra))).toEqual({ ok: false, reason });
  });
  it('preserves draft writing and metadata while replacing a starting reading', () => {
    const old = study(), before = structuredClone(old), result = BH.bhStartFlowerVisitStudy(old, snapshot(8, 4000));
    expect(result.status).toBe('started'); expect(result.study).toMatchObject({ explanation: old.explanation, teacher: old.teacher, baseline: { day: 8, visits: 4000 }, comparison: null });
    expect(old).toEqual(before); expect(result.study.teacher).toBe(old.teacher);
    expect(BH.bhStartFlowerVisitStudy(old, null)).toEqual({ status: 'unavailable', study: old });
  });
  it('freezes fresh endpoint objects and leaves invalid comparisons untouched', () => {
    const start = BH.bhStartFlowerVisitStudy({ explanation: 'Keep' }, snapshot()).study, before = structuredClone(start);
    const after = snapshot(5, 3500), result = BH.bhFreezeFlowerVisitStudy(start, after);
    expect(start).toEqual(before); expect(result.study.comparison.after).not.toBe(after);
    expect(BH.bhFreezeFlowerVisitStudy(start, snapshot(3, 2000))).toEqual({ status: 'wait', study: start });
  });
  it('recomputes saved differences and ignores invented cached outcomes', () => {
    const value = study(); Object.assign(value.comparison, { visitsAdded: 999999, meanPerDay: 77777, fruits: 400 });
    expect(BH.bhFrozenFlowerVisitComparison(value)).toMatchObject({ visitsAdded: 1500, meanPerDay: 750 });
    expect(BH.bhBuildFlowerVisitEvidence(value)).toContain('Added 1500 visits across 2 modeled days');
  });
  it.each(['future-format', 'other-baseline', 'other-run', 'backward-counter'])('retains but does not verify %s saved evidence', kind => {
    const value = study();
    if (kind === 'future-format') value.comparison.schemaVersion = 2;
    if (kind === 'other-baseline') value.baseline.visits++;
    if (kind === 'other-run') value.comparison.after.runSerial++;
    if (kind === 'backward-counter') value.comparison.after.visits = 1;
    const original = structuredClone(value);
    expect(BH.bhFrozenFlowerVisitComparison(value)).toBeNull(); expect(BH.bhBuildFlowerVisitEvidence(value)).toBe(''); expect(value).toEqual(original);
  });
  it.each(['', '   ', 'x'.repeat(281)])('requires a bounded explanation before producing notebook evidence (%s)', explanation => {
    expect(BH.bhBuildFlowerVisitEvidence(study({ explanation }))).toBe('');
  });
  it('records explicit endpoints, provenance and evidence limits without clock or random use', () => {
    const value = study({ explanation: '  Visits do not count seeds.  ' }), before = structuredClone(value);
    const random = vi.spyOn(Math, 'random'), now = vi.spyOn(Date, 'now'); random.mockClear(); now.mockClear();
    const text = BH.bhBuildFlowerVisitEvidence(value);
    BH.bhStartFlowerVisitStudy(value, snapshot()); BH.bhFreezeFlowerVisitStudy(value, snapshot(8, 5000));
    expect(text).toContain('run 2, seed 777, colony-daily-1.2, tracking from Day 0');
    expect(text).toContain('Day 3: 2000 cumulative visits; frozen Day 5: 3500');
    expect(text).toContain('not a field observation'); expect(text).toContain('do not measure pollen deposition');
    expect(text.endsWith('My explanation: Visits do not count seeds.')).toBe(true);
    expect(random).not.toHaveBeenCalled(); expect(now).not.toHaveBeenCalled(); expect(value).toEqual(before);
  });
  it.each([['K–2', 'stigma'], ['3–5', 'Subtract'], ['6–8', 'elapsed'], ['9–12', 'controls']])('gives a %s evidence prompt', (band, word) => {
    const lesson = BH.bhFlowerVisitLesson(band); expect(lesson.question + lesson.reasoning).toContain(word);
  });

  it.each(['current', 'future'])('round-trips %s observations through backups and all app persistence loaders', format => {
    const saved = format === 'current' ? study() : { baseline: { schemaVersion: 2, teacher: 'Keep' }, comparison: { schemaVersion: 2, future: 'Keep' }, explanation: 'Earlier draft' };
    const state = { ...BH.bhCreateNewColonyState(777, 2, 0), day: 5, totalFlowerVisits: 3500, flowerVisitStudy: saved, notebook: { beekeeper: { evidence: 'Keep my notes' } } };
    const restored = BH.bhReadBeeBackup(BH.bhBuildBeeBackup(state, '2026-10-05T12:00:00Z')).state;
    expect(restored.flowerVisitStudy).toEqual(saved); expect(restored.notebook).toEqual(state.notebook);
    expect(BH.bhRecoverBeehiveState(state).state.flowerVisitStudy).toEqual(saved);
    for (const file of ['stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab_module.js', 'desktop/web-app/public/stem_lab/stem_lab_module.js']) {
      const source = readFileSync(file, 'utf8'), start = source.indexOf('// BEEHIVE_PERSISTENCE_HELPER_START'), end = source.indexOf('// BEEHIVE_PERSISTENCE_HELPER_END');
      const contract = Function(source.slice(start, end) + '\nreturn { save: _serializeBeehiveForPersistence, load: _deserializeBeehiveFromPersistence };')();
      const reloaded = contract.load(JSON.parse(JSON.stringify(contract.save(state))));
      expect(reloaded.flowerVisitStudy).toEqual(saved); expect(reloaded.notebook).toEqual(state.notebook);
    }
  });

  it('shows actual model counts and separates visits from unmeasured plant outcomes', async () => {
    await mount();
    expect(panel().querySelector('output').textContent).toBe('2,000 visits');
    expect(panel().querySelectorAll('.bee-visits-path li')).toHaveLength(3);
    expect(panel().textContent).toContain('Unmeasured does not mean zero');
    expect(button('Freeze current interval').disabled).toBe(true);
    expect(button('Add interval to notebook').disabled).toBe(true);
    expect(latest.beehive.flowerVisitStudy).toBeUndefined();
  });
  it('captures the latest state and freezes without changing time, resources or other tools', async () => {
    await mount({ flowerVisitStudy: { teacher: { retained: true }, explanation: 'My draft' } }); const before = colony();
    await click('Save starting reading'); expect(latest.beehive.flowerVisitStudy.baseline.visits).toBe(2000);
    expect(colony()).toEqual(before); await write('Visits show activity, not seed success.');
    await changeColony({ day: 5, totalFlowerVisits: 3500 }); const afterAdvance = colony();
    await click('Freeze current interval');
    expect(latest.beehive.flowerVisitStudy).toMatchObject({ teacher: { retained: true }, explanation: 'Visits show activity, not seed success.', comparison: { after: { day: 5, visits: 3500 } } });
    expect(colony()).toEqual(afterAdvance);
    expect(panel().querySelector('[data-flower-visit-value="added"]').textContent).toContain('1,500 visits');
    expect(panel().querySelector('[data-flower-visit-mean]').textContent).toContain('750 visits');
  });
  it('appends the frozen evidence once while retaining notebook writing and other roles', async () => {
    const notebook = { beekeeper: { claim: 'My claim', evidence: 'Earlier evidence.', reasoning: 'My reasoning', review: { claim: true, reasoning: true, evidence: true }, teacher: { retained: true } }, queen: { evidence: 'Queen note' }, synthesis: 'My synthesis' };
    await mount({ flowerVisitStudy: study(), notebook });
    const frozen = structuredClone(latest.beehive.flowerVisitStudy), before = colony();
    await changeColony({ day: 9, totalFlowerVisits: 9000 });
    await click('Add interval to notebook');
    const saved = latest.beehive.notebook;
    expect(saved.beekeeper).toMatchObject({ claim: 'My claim', reasoning: 'My reasoning', teacher: { retained: true }, review: { claim: true, reasoning: true, evidence: false } });
    expect(saved.beekeeper.evidence).toBe('Earlier evidence.\n' + BH.bhBuildFlowerVisitEvidence(frozen));
    expect(saved.queen).toEqual(notebook.queen); expect(saved.synthesis).toBe(notebook.synthesis);
    expect(saved.beekeeper.evidence.includes('9000')).toBe(false);
    expect(button('Already in notebook').disabled).toBe(true); await click('Already in notebook'); expect(latest.beehive.notebook).toEqual(saved);
    expect(latest.beehive.flowerVisitStudy).toEqual(frozen); expect(colony().state.workers).toBe(before.state.workers);
  });
  it('keeps full notebook fields without truncating either the field or the saved interval', async () => {
    const notebook = { beekeeper: { evidence: 'x'.repeat(1200), claim: 'Keep', reasoning: 'Keep' } }, saved = study();
    await mount({ flowerVisitStudy: saved, notebook });
    expect(button('Add interval to notebook').disabled).toBe(true);
    expect(panel().querySelector('[data-flower-visit-notebook]').dataset.flowerVisitNotebook).toBe('full');
    await click('Add interval to notebook'); expect(latest.beehive.notebook).toEqual(notebook); expect(latest.beehive.flowerVisitStudy).toEqual(saved);
  });
  it('preserves a frozen earlier run and writing while blocking a cross-run comparison', async () => {
    const saved = study(), notebook = { beekeeper: { evidence: 'Keep earlier evidence' } };
    await mount({ flowerVisitStudy: saved, notebook, experimentRunSerial: 3, day: 1, totalFlowerVisits: 100 });
    expect(panel().textContent).toContain('belongs to another colony run');
    expect(panel().querySelector('[data-flower-visit-comparison]').textContent).toContain('Run 2');
    expect(button('Freeze current interval').disabled).toBe(true); expect(latest.beehive.flowerVisitStudy).toEqual(saved);
    await click('Replace starting reading');
    expect(latest.beehive.flowerVisitStudy).toMatchObject({ explanation: saved.explanation, teacher: saved.teacher, baseline: { runSerial: 3, day: 1 }, comparison: null });
    expect(latest.beehive.notebook).toEqual(notebook);
  });
  it('does not coerce missing older data to a measured zero or erase earlier work', async () => {
    const saved = { baseline: { schemaVersion: 2, future: 'Keep' }, comparison: { schemaVersion: 2 }, explanation: 'Earlier draft', teacher: { retained: true } };
    await mount({ totalFlowerVisits: undefined, simulationSeed: undefined, flowerVisitStudy: saved });
    expect(panel().querySelector('output').textContent).toBe('Unavailable');
    expect(button('Save starting reading').disabled).toBe(true); expect(button('Freeze current interval').disabled).toBe(true);
    expect(panel().textContent).toContain('saved pair cannot be verified'); expect(latest.beehive.flowerVisitStudy).toEqual(saved);
  });
  it('keeps zero intervals explicit, and changes grade prompts without changing saved evidence', async () => {
    const zero = BH.bhFreezeFlowerVisitStudy(BH.bhStartFlowerVisitStudy({ explanation: 'No modeled increase.' }, snapshot(3, 0)).study, snapshot(5, 0)).study;
    await mount({ day: 5, totalFlowerVisits: 0, flowerVisitStudy: zero, focusLayout: false }, '2nd Grade');
    expect(host.querySelectorAll('[data-flower-visit-study]')).toHaveLength(1);
    expect(panel().querySelector('[data-flower-visit-mean]')).toBeNull();
    expect(panel().querySelector('[data-flower-visit-comparison]').textContent).toContain('No visits were added');
    expect(Array.from(panel().querySelectorAll('.bee-visits-track > span')).map(n => n.style.width)).toEqual(['0%', '0%']);
    await act(async () => setGrade('11th Grade'));
    expect(panel().querySelector('[data-flower-visit-mean]').textContent).toContain('0 visits');
    expect(panel().querySelector('[data-flower-visit-grade]').textContent).toContain('effectiveness'); expect(latest.beehive.flowerVisitStudy).toEqual(zero);
  });
  it('exports a visit count without apple-tree or money conversions', async () => {
    const clipboard = vi.fn().mockResolvedValue(); vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: clipboard } });
    try {
      await mount(); await act(async () => host.querySelector('[aria-label="Export colony report"]').click());
      const report = clipboard.mock.calls[0][0];
      expect(report).toContain('Modeled flower visits (cumulative):** 2,000'); expect(report.includes('apple trees')).toBe(false);
      expect(report).toContain('does not measure pollen deposition');
    } finally { vi.unstubAllGlobals(); }
  });
  it('removes fixed yield, acreage, value and distance conversions from the panel', () => {
    const source = readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');
    for (const label of ['Pollination Impact', 'Apple trees worth of fruit', 'Crop acres pollinated', 'Ecosystem service value', 'Miles flown foraging']) expect(source.includes(label)).toBe(false);
  });
});
