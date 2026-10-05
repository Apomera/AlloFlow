import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Bee colony forecast investigations', () => {
  let BH, config, host, root, latest, setData, awardXP, oldRaf, oldCancelRaf;
  beforeEach(() => {
    resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    BH = window.__RR_TEST_EXPORTS__.beehive;
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    oldRaf = globalThis.requestAnimationFrame; oldCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    awardXP = vi.fn();
  });
  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove(); root = host = null;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = oldRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = oldCancelRaf;
    vi.restoreAllMocks();
  });
  function colony(extra = {}) {
    return { ...BH.bhCreateNewColonyState(777, 1, 0), viewMode: 'beekeeper', tutorialDone: true,
      soundOn: false, motionPaused: true, workers: 22000, honey: 80, pollen: 80, day: 10,
      actionPoints: 3, ...extra };
  }
  function cfg(extra = {}) {
    return { params: BH.SIMULATION_PARAMS, subMods: { honey: 1, spring: 1, winter: 1, varroa: 1 },
      siteMods: { forage: 1, disease: 1 }, gardenBonus: 0, hiveEvents: [], diseaseEvents: [],
      rand: vi.fn(() => { throw new Error('Registration consumed live randomness'); }), ...extra };
  }
  function draft(extra = {}) {
    return { metricId: 'workers', horizon: 7, direction: 'higher', prediction: 'Brood will emerge during spring.', ...extra };
  }
  function study(state = colony(), prediction = draft()) {
    const result = BH.bhCreateForecastStudy(state, cfg({ gardenBonus: state.experimentEnvironment.gardenBonus }), prediction, 'study-1');
    expect(result.ok, result.reason).toBe(true); return result.study;
  }
  function finish(initial = colony(), prediction = draft()) {
    let state = initial, investigation = study(state, prediction);
    for (let i = 0; i < prediction.horizon; i++) {
      state = { ...state, ...BH.bhStepColony(state, cfg({ rand: () => 1 })).next };
      investigation = BH.bhObserveForecastStudy(investigation, state);
    }
    return { state, investigation };
  }
  async function mount(initial, transform) {
    let armed = false;
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const Component = () => {
      const [data, setter] = React.useState({ beehive: initial, otherTool: { retained: true } });
      latest = data; setData = setter;
      const setToolData = transform ? update => setter(prev => typeof update === 'function' ? update(armed ? transform(prev) : prev) : update) : setter;
      return config.render(makeCtx({ toolData: data, setToolData, awardXP }));
    };
    await act(async () => root.render(React.createElement(Component)));
    armed = true; awardXP.mockClear();
  }
  async function open() {
    const details = host.querySelector('[data-forecast-investigation]');
    await act(async () => { details.open = true; details.dispatchEvent(new Event('toggle', { bubbles: true })); });
  }
  async function click(selector) {
    const node = host.querySelector(selector); expect(node).toBeTruthy();
    await act(async () => node.click());
  }
  async function text(selector, value) {
    const node = host.querySelector(selector); expect(node).toBeTruthy();
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
    await act(async () => { descriptor.set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
  }

  it.each([7, 30])('registers a frozen %i-day forecast without changing state, AP, or the random cursor', horizon => {
    const state = colony({ notebook: { synthesis: 'Keep this' } }), before = structuredClone(state), options = cfg();
    const result = BH.bhCreateForecastStudy(state, options, draft({ horizon }), 'recorded');
    expect(result.ok).toBe(true);
    expect(state).toEqual(before); expect(options.rand).not.toHaveBeenCalled();
    expect(result.study.forecast).toHaveLength(horizon + 1);
    expect(result.study.observations).toHaveLength(1);
    expect(result.study.forecast.slice(1).map(p => p.workers)).toEqual(BH.bhForecastColony(state, options, horizon).timeline.map(p => p.workers));
  });

  it.each([
    [{ activeEvent: { id: 'rain' } }, {}, 'Acknowledge'],
    [{ colonySurvived: false }, {}, 'living colony'],
    [{ modelVersion: 'old' }, {}, 'current model'],
    [{ experimentEnvironment: null }, {}, 'garden control'],
    [{ day: 10000000 }, {}, 'checkpoint'],
    [{}, { direction: '' }, 'direction'],
    [{}, { prediction: '   ' }, 'prediction'],
  ])('blocks invalid registration before constructing a forecast', (extra, prediction, reason) => {
    const options = cfg(), state = colony(extra), before = structuredClone(state);
    const result = BH.bhCreateForecastStudy(state, options, draft(prediction), 'blocked');
    expect(result.ok).toBe(false); expect(result.reason).toContain(reason);
    expect(result.study).toBeNull(); expect(state).toEqual(before); expect(options.rand).not.toHaveBeenCalled();
  });

  it('requires the forecast to use the saved garden control', () => {
    expect(BH.bhCreateForecastStudy(colony(), cfg({ gardenBonus: 30 }), draft(), 'different').reason).toContain('match');
  });

  it.each([7, 30])('observes every day and compares the exact %i-day checkpoint', horizon => {
    const initial = colony(), original = study(initial, draft({ horizon }));
    const { state, investigation } = finish(initial, draft({ horizon }));
    expect(investigation.status).toBe('complete'); expect(investigation.forecast).toEqual(original.forecast);
    expect(investigation.observations.map(p => p.day)).toEqual(Array.from({ length: horizon + 1 }, (_, i) => initial.day + i));
    const result = BH.bhForecastStudyResult(investigation);
    expect(result.actual).toBe(state.workers); expect(result.projected).toBe(state.workers); expect(result.error).toBe(0);
    expect(BH.bhObserveForecastStudy(investigation, { ...state, day: state.day + 1, workers: 12 })).toEqual(investigation);
  });

  it('retains intervening actions and measured event effects without changing the forecast', () => {
    const initial = colony(), original = study(initial);
    let tracked = BH.bhForecastStudyNotice(original, initial, 'action', 'transaction-1', 'Feed bees');
    tracked = BH.bhForecastStudyNotice(tracked, initial, 'action', 'transaction-1', 'Feed bees');
    const next = { ...initial, ...BH.bhStepColony(initial, cfg({ rand: () => 1 })).next, honey: 0 };
    tracked = BH.bhObserveForecastStudy(tracked, next, { id: 'dearth', label: 'Nectar dearth' });
    expect(tracked.notices).toHaveLength(2); expect(tracked.observations[1].honey).toBe(0);
    expect(tracked.forecast).toEqual(original.forecast); expect(original.notices).toHaveLength(0);
    expect(BH.bhBuildForecastStudyRecord(tracked)).toContain('does not establish cause');
  });

  it.each([
    { simulationSeed: 0 }, { experimentRunSerial: 2 }, { modelVersion: 'colony-daily-future' },
    { subspecies: 'russian' }, { apiarySite: 'urban' }, { experimentEnvironment: { schemaVersion: 1, gardenBonus: 30 } },
  ])('interrupts when a run control changes and keeps recorded evidence intact', extra => {
    const initial = colony(), original = study(initial);
    const interrupted = BH.bhForecastStudyView(original, { ...initial, ...extra });
    expect(interrupted.status).toBe('interrupted'); expect(interrupted.reason).toContain('changed');
    expect(interrupted.observations).toEqual(original.observations); expect(original.status).toBe('tracking');
  });

  it('identifies skipped monitoring and never substitutes a later day for the checkpoint', () => {
    const initial = colony(), original = study(initial);
    const interrupted = BH.bhObserveForecastStudy(original, { ...initial, day: 18, workers: 30000 });
    expect(interrupted.status).toBe('interrupted'); expect(interrupted.reason).toContain('Missing checkpoints');
    expect(interrupted.observations).toHaveLength(1); expect(BH.bhForecastStudyResult(interrupted).actual).toBeNull();
    expect(BH.bhForecastStudyView(original, { ...initial, day: 11 }).status).toBe('interrupted');
  });

  it('keeps a completed historical investigation intact when a new run starts', () => {
    const { investigation } = finish();
    expect(BH.bhForecastStudyView(investigation, colony({ experimentRunSerial: 2 }))).toEqual(investigation);
  });

  it('records an early collapse and its final event as partial evidence', () => {
    const initial = colony({ day: 95, workers: 510, honey: 0, pollen: 0, brood: 0, broodCohorts: null });
    const original = study(initial), next = { ...initial, day: 96, workers: 490, colonySurvived: false };
    const interrupted = BH.bhObserveForecastStudy(original, next, { id: 'loss', label: 'Colony loss' });
    expect(interrupted.status).toBe('interrupted'); expect(interrupted.observations[1].workers).toBe(490);
    expect(interrupted.notices[0].label).toBe('Colony loss');
    expect(BH.bhForecastStudyResult(interrupted).actual).toBeNull();
    expect(BH.bhForecastStudyResult(interrupted).projected).toBeNull();
    expect(BH.bhBuildForecastStudyRecord(interrupted)).toContain('Planned checkpoint: Not recorded');
  });

  it('preserves actual zeros, marks absent telemetry missing, and checks displayed precision', () => {
    const { investigation } = finish(colony(), draft({ metricId: 'honey', direction: 'same' }));
    investigation.observations[0].honey = 0;
    investigation.observations.at(-1).honey = 0.04; investigation.forecast.at(-1).honey = 0;
    expect(BH.bhForecastStudyResult(investigation)).toMatchObject({ start: 0, actual: 0.04, projected: 0, direction: 'same', alignment: 'aligned', error: 0 });
    delete investigation.observations.at(-1).honey;
    expect(BH.bhForecastStudyResult(investigation)).toMatchObject({ actual: null, alignment: 'unavailable', error: null });
    expect(BH.bhBuildForecastStudyRecord(investigation)).toContain('Not recorded');
  });

  it('repairs bounded imported structures without damaging other tool or role evidence', () => {
    const original = study(), malformed = structuredClone(original);
    malformed.observations[0].workers = NaN; malformed.forecast.push({ day: 1000, workers: 1 });
    malformed.notices = Array.from({ length: 140 }, (_, i) => ({ day: 10, kind: 'action', id: String(i), label: 'x'.repeat(200) }));
    malformed.explanation = 'e'.repeat(2000); malformed.extra = 'remove';
    const recovered = BH.bhRecoverBeehiveState(colony({ forecastInvestigation: malformed, notebook: { queen: { explanation: 'Keep me' } } }));
    expect(recovered.repairs).toContain('forecastInvestigation');
    expect(recovered.state.forecastInvestigation.observations[0].workers).toBeNull();
    expect(recovered.state.forecastInvestigation.forecast).toHaveLength(8);
    expect(recovered.state.forecastInvestigation.notices).toHaveLength(120);
    expect(recovered.state.forecastInvestigation.omittedNotices).toBe(20);
    expect(recovered.state.forecastInvestigation.explanation).toHaveLength(1600);
    expect(recovered.state.notebook.queen.explanation).toBe('Keep me');
    expect(recovered.state.forecastInvestigation.extra).toBeUndefined();
  });

  it('keeps a known checkpoint visible when the missing starting reading prevents a direction check', () => {
    const { investigation } = finish();
    const recorded = investigation.observations.at(-1).workers;
    delete investigation.observations[0].workers;
    expect(BH.bhForecastStudyResult(investigation)).toMatchObject({ start: null, actual: recorded, alignment: 'unavailable', error: 0 });
  });

  it('rejects damaged checkpoint claims and deduplicates truncated portfolio identifiers', () => {
    const { investigation } = finish(); investigation.observations.splice(3, 1);
    expect(BH.bhNormalizeForecastStudy(investigation).status).toBe('interrupted');
    const prefix = 'p'.repeat(80);
    const entries = [{ id: prefix + 'a', text: 'first' }, { id: prefix + 'b', text: 'second' }, { id: '__proto__', text: 'third' }];
    expect(BH.bhNormalizeForecastPortfolio({ entries }).entries.map(e => e.text)).toEqual(['first', 'third']);
  });

  it('counts omitted imported notices even beyond the bounded validation window', () => {
    const investigation = study();
    investigation.notices = Array.from({ length: 500 }, (_, i) => ({ day: 10, kind: 'action', id: String(i), label: 'Choice' }));
    const normalized = BH.bhNormalizeForecastStudy(investigation);
    expect(normalized.notices).toHaveLength(120); expect(normalized.omittedNotices).toBe(380);
  });

  it('retains the full explanation at maximum supported prediction and context-log lengths', () => {
    const { investigation } = finish(colony(), draft({ horizon: 30, prediction: 'p'.repeat(1200) }));
    investigation.notices = Array.from({ length: 120 }, (_, i) => ({ day: 10, kind: 'action', id: String(i), label: 'c'.repeat(160) }));
    investigation.explanation = 'e'.repeat(1600);
    const record = { id: investigation.id, title: 'Long evidence', text: BH.bhBuildForecastStudyRecord(investigation) };
    const portfolio = BH.bhNormalizeForecastPortfolio({ schemaVersion: 1, entries: [record] });
    expect(portfolio.entries[0].text).toBe(record.text);
    expect(portfolio.entries[0].text.endsWith(investigation.explanation)).toBe(true);
  });

  it('preserves intact JSON round trips and repairs a saved flag without a Notebook record', () => {
    const original = colony({ forecastInvestigation: study(), forecastInvestigationDraft: draft() });
    expect(BH.bhRecoverBeehiveState(original).state).toBe(original);
    const json = JSON.parse(JSON.stringify(original));
    expect(BH.bhRecoverBeehiveState(json).state).toBe(json);
    const { investigation } = finish(); investigation.saved = true;
    const recovered = BH.bhRecoverBeehiveState(colony({ forecastInvestigation: investigation }));
    expect(recovered.state.forecastInvestigation.saved).toBe(false);
  });

  it.each(['stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab_module.js', 'desktop/web-app/public/stem_lab/stem_lab_module.js'])('round-trips draft, monitoring, and saved evidence through host %s', file => {
    const source = readFileSync(file, 'utf8'), begin = '// BEEHIVE_PERSISTENCE_HELPER_START', end = '// BEEHIVE_PERSISTENCE_HELPER_END';
    const start = source.indexOf(begin), markerEnd = source.indexOf(end, start);
    const contract = Function(source.slice(start, markerEnd + end.length) + '\nreturn { serialize: _serializeBeehiveForPersistence, deserialize: _deserializeBeehiveFromPersistence };')();
    const { state, investigation } = finish();
    investigation.explanation = 'Brood emergence is plausible; random events limit inference.'; investigation.saved = true;
    const record = { id: investigation.id, title: 'Saved workers', text: BH.bhBuildForecastStudyRecord(investigation) };
    const original = { ...state, forecastInvestigationDraft: draft(), forecastInvestigation: investigation,
      notebook: { forecastStudies: { schemaVersion: 1, entries: [record] }, queen: { explanation: 'Keep queen evidence' } } };
    const restored = contract.deserialize(JSON.parse(JSON.stringify(contract.serialize(original))));
    expect(restored.forecastInvestigationDraft).toEqual(original.forecastInvestigationDraft);
    expect(restored.forecastInvestigation).toEqual(investigation); expect(restored.notebook).toEqual(original.notebook);
    const backup = BH.bhBuildBeeBackup(original), decoded = BH.bhReadBeeBackup(backup);
    expect(decoded.repairs).toEqual([]); expect(decoded.state.forecastInvestigation).toEqual(investigation);
    expect(decoded.state.notebook.forecastStudies.entries[0]).toEqual(record);
  });

  it('opening and registering is independent of simulation time, AP, rewards, and other tools', async () => {
    await mount(colony({ forecastInvestigationDraft: draft() })); const before = structuredClone(latest);
    await open(); expect(latest).toEqual(before);
    await click('[data-forecast-study-start]');
    expect(document.activeElement).toBe(host.querySelector('[data-forecast-study-registered]'));
    expect(latest.beehive.forecastInvestigation.status).toBe('tracking');
    expect(latest.beehive.day).toBe(before.beehive.day); expect(latest.beehive.actionPoints).toBe(before.beehive.actionPoints);
    expect(latest.beehive.randomState).toBe(before.beehive.randomState);
    expect(latest.otherTool).toEqual(before.otherTool); expect(awardXP).not.toHaveBeenCalled();
    expect(host.querySelector('[data-forecast-study-metric]')).toBeNull();
    await click('[data-management-choice="feed_bees"]');
    expect(latest.beehive.forecastInvestigation.notices).toHaveLength(1);
    expect(latest.beehive.forecastInvestigation.notices[0].label).toMatch(/feed/i);
  });

  it('revalidates registration against queued live state', async () => {
    await mount(colony({ forecastInvestigationDraft: draft() }), prev => ({ ...prev, beehive: { ...prev.beehive, activeEvent: { id: 'rain', label: 'Rain' } } }));
    await open(); await click('[data-forecast-study-start]');
    expect(latest.beehive.forecastInvestigation).toBeFalsy(); expect(latest.beehive.actionPoints).toBe(3);
    expect(host.querySelector('[data-forecast-study-readiness]').textContent).toContain('Acknowledge');
  });

  it('graphs a small numeric range against its labeled scale and centers unchanged readings', async () => {
    const { investigation } = finish(colony(), draft({ metricId: 'honey' }));
    investigation.forecast.forEach((p, i) => { p.honey = i / 10; });
    investigation.observations.forEach((p, i) => { p.honey = i / 10; });
    await mount(colony({ forecastInvestigation: investigation })); await open();
    const line = host.querySelector('[data-forecast-trace="forecast"]');
    const ys = line.getAttribute('points').split(' ').map(p => Number(p.split(',')[1]));
    expect(ys[0]).toBe(162); expect(ys.at(-1)).toBe(24);
    await act(async () => setData(prev => ({ ...prev, beehive: { ...prev.beehive, forecastInvestigation: {
      ...investigation, forecast: investigation.forecast.map(p => ({ ...p, honey: 0 })), observations: investigation.observations.map(p => ({ ...p, honey: 0 })) } } })));
    const flat = host.querySelector('[data-forecast-trace="forecast"]').getAttribute('points').split(' ').map(p => Number(p.split(',')[1]));
    expect(flat.every(y => y === 93)).toBe(true);
  });

  it('captures the actual checkpoint during a multi-day advance and freezes it afterward', async () => {
    await mount(colony({ forecastInvestigationDraft: draft() })); await open(); await click('[data-forecast-study-start]');
    // Seeded events legitimately pause a batch; acknowledge them just as a learner does.
    for (let attempts = 0; attempts < 15 && latest.beehive.day < 20; attempts++) {
      if (latest.beehive.activeEvent) await act(async () => setData(prev => ({ ...prev, beehive: { ...prev.beehive, activeEvent: null } })));
      await click('[data-beehive-time-control="5"]');
    }
    expect(latest.beehive.day).toBeGreaterThanOrEqual(20);
    const record = latest.beehive.forecastInvestigation;
    expect(record.status).toBe('complete'); expect(record.observations.map(p => p.day)).toEqual([10,11,12,13,14,15,16,17]);
    const endpoint = record.observations.at(-1);
    expect(BH.bhForecastStudyResult(record).actual).toBe(endpoint.workers);
    expect(endpoint.workers).not.toBe(latest.beehive.workers);
  });

  it('stops, saves once, preserves other Notebook notes, and returns focus to a new draft', async () => {
    await mount(colony({ forecastInvestigationDraft: draft(), notebook: { queen: { explanation: 'Keep queen notes' } } }));
    await open(); await click('[data-forecast-study-start]'); await click('[data-forecast-study-stop]');
    expect(document.activeElement).toBe(host.querySelector('[data-forecast-study-explanation]'));
    expect(host.querySelector('[data-forecast-study-save]').disabled).toBe(true);
    await text('[data-forecast-study-explanation]', 'Stopped early; the checkpoint is missing.');
    const save = host.querySelector('[data-forecast-study-save]');
    await act(async () => { save.click(); save.click(); });
    expect(latest.beehive.notebook.forecastStudies.entries).toHaveLength(1);
    expect(latest.beehive.notebook.forecastStudies.entries[0].text).toContain('checkpoint is missing');
    expect(latest.beehive.notebook.queen.explanation).toBe('Keep queen notes');
    await click('[data-forecast-study-clear]');
    expect(document.activeElement).toBe(host.querySelector('[data-forecast-study-metric]'));
    expect(latest.beehive.forecastInvestigationDraft.prediction).toBe('');
    expect(latest.beehive.notebook.forecastStudies.entries).toHaveLength(1);
  });

  it('holds six records without silently evicting evidence and permits explicit removal', async () => {
    const { investigation } = finish(); investigation.explanation = 'Observed a rise, with weather as a limitation.';
    const entries = Array.from({ length: 6 }, (_, i) => ({ id: 'saved-' + i, title: 'Study ' + i, text: 'Evidence ' + i }));
    await mount(colony({ forecastInvestigation: investigation, notebook: { forecastStudies: { schemaVersion: 1, entries } } }));
    await open(); expect(host.querySelector('[data-forecast-study-save]').disabled).toBe(true);
    await click('[data-forecast-study-notebook]');
    expect(document.activeElement.id).toBe('beehive-notebook-summary');
    await click('[data-forecast-saved-remove="saved-0"]');
    expect(document.activeElement.id).toBe('beehive-notebook-summary');
    expect(host.querySelector('[data-forecast-study-save]').disabled).toBe(false);
    await click('[data-forecast-study-save]');
    expect(latest.beehive.notebook.forecastStudies.entries).toHaveLength(6);
    expect(latest.beehive.notebook.forecastStudies.entries.at(-1).id).toBe(investigation.id);
    await click('[data-forecast-saved-remove="study-1"]');
    expect(latest.beehive.forecastInvestigation.saved).toBe(false);
  });

  it('opens the Notebook from focus layout and offers a readable copy if clipboard fails', async () => {
    const { investigation } = finish();
    await mount(colony({ focusLayout: true, forecastInvestigation: investigation })); await open();
    await click('[data-forecast-study-notebook]');
    expect(latest.beehive.focusLayout).toBe(false); expect(latest.beehive.notebookOpen).toBe(true);
    expect(document.activeElement.id).toBe('beehive-notebook-summary');
    window.StemLab.writeClipboard = vi.fn(() => { throw new Error('Clipboard unavailable'); });
    await click('[data-forecast-study-copy]');
    expect(latest.beehive.exportedReport).toContain('## Colony forecast investigation');
    expect(latest.beehive.exportedReport).toContain('does not establish cause');
  });

  it.each(['same-seed', 'fresh-seed'])('retains stopped evidence and Notebook records after a %s restart', async restart => {
    const initial = colony({ day: 95, workers: 510 }), investigation = study(initial);
    const entries = [{ id: 'older', title: 'Earlier observation', text: 'Keep this evidence' }];
    await mount({ ...initial, colonySurvived: false, forecastInvestigation: investigation,
      notebook: { forecastStudies: { schemaVersion: 1, entries }, queen: { explanation: 'Retain this' } } });
    await open(); await click('[data-beehive-restart="' + restart + '"]');
    expect(latest.beehive.day).toBe(0); expect(latest.beehive.experimentRunSerial).toBe(2);
    expect(latest.beehive.forecastInvestigation.prediction).toBe(investigation.prediction);
    expect(latest.beehive.notebook.forecastStudies.entries).toEqual(entries);
    expect(latest.beehive.notebook.queen.explanation).toBe('Retain this');
    expect(host.querySelector('[data-forecast-study-status="interrupted"]').textContent).toContain('changed');
    expect(latest.otherTool.retained).toBe(true);
  });
});
