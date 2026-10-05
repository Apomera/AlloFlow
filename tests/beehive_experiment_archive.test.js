import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});

function pair(seed, delta = 6, options = {}) {
  const runA = { ...BH.bhCreateNewColonyState(seed, options.runA || 1, options.gardenBonus || 0), day: options.day || 12 };
  const runB = { ...BH.bhCreateNewColonyState(seed, options.runB || 2, options.gardenBonus || 0), day: options.day || 12, honey: 20 + delta };
  if (options.modelVersion) runA.modelVersion = runB.modelVersion = options.modelVersion;
  if (options.siteId) runA.apiarySite = runB.apiarySite = options.siteId;
  runB.managementTrail = [{ day: options.actionDay || 4, choiceId: 'plant_wildflowers', label: 'Plant wildflowers', cost: '1 AP', summary: 'Native forage planted.' }];
  const notebook = {
    plannedActionId: 'plant_wildflowers', predictedMetricId: 'honey', predictedDirection: 'higher',
    question: 'Does forage change honey stores?', hypothesis: 'More forage increases stores.',
    changedVariable: 'Plant wildflowers once', prediction: 'Run B honey will be higher at the checkpoint.',
    observations: 'The paired checkpoints differ.', alternativeExplanation: 'Eligible events can diverge.',
    conclusion: 'This modeled trial needs replication with other seeds.',
  };
  notebook.registeredPlan = BH.bhCreateExperimentPlanRegistration(notebook, runB.experimentRunSerial, runA.experimentRunSerial);
  runB.notebook = { experiment: notebook };
  return { baseline: BH.bhCreateExperimentSnapshot(runA), runB, notebook };
}

function save(archive, fixture) {
  return BH.bhSaveCompletedExperimentPair(archive, fixture.baseline, fixture.runB, fixture.notebook);
}

describe('Completed Bee experiment pairs', () => {
  it('freezes checkpoints, model provenance, protected plan, and observations without mutating the live trial', () => {
    const fixture = pair(100);
    const before = JSON.parse(JSON.stringify(fixture));
    const result = save(undefined, fixture);
    expect(result.status).toBe('saved');
    expect(fixture).toEqual(before);
    const record = result.archive.records[0];
    expect(record.baseline).toMatchObject({ simulationSeed: 100, runSerial: 1, capturedDay: 12, exactFromStart: true });
    expect(record.current).toMatchObject({ simulationSeed: 100, runSerial: 2, metrics: { honey: 26 }, managementHistory: { complete: true } });
    expect(record.notebook.registeredPlan).toMatchObject({ runSerial: 2, baselineRunSerial: 1, complete: true });
    fixture.runB.honey = 90;
    fixture.notebook.observations = 'Edited after saving.';
    fixture.runB.managementTrail[0].label = 'Edited label';
    expect(record.current.metrics.honey).toBe(26);
    expect(record.notebook.observations).toBe('The paired checkpoints differ.');
    expect(record.current.managementTrail[0].label).toBe('Plant wildflowers');
    expect(BH.bhNormalizeExperimentArchive(result.archive)).toEqual(result.archive);
  });

  it('requires protected eligible pairs and recomputes imported identity rather than trusting flags', () => {
    const fixture = pair(100);
    expect(save(undefined, { ...fixture, runB: { ...fixture.runB, day: 11 } }).status).toBe('ineligible');
    const changedPlan = { ...fixture.notebook, hypothesis: 'Edited after the run.' };
    expect(BH.bhSaveCompletedExperimentPair(undefined, fixture.baseline, fixture.runB, changedPlan).status).toBe('ineligible');
    const record = save(undefined, fixture).record;
    expect(BH.bhNormalizeExperimentArchiveRecord({ ...record, pairId: 'forged', protocolKey: 'forged' })).toEqual(record);
    expect(BH.bhNormalizeExperimentArchiveRecord({ ...record, current: { ...record.current, modelVersion: 'another-model' } })).toBeNull();
    expect(BH.bhNormalizeExperimentArchiveRecord({ ...record, current: { ...record.current, metrics: { ...record.current.metrics, honey: NaN } } })).toBeNull();
    expect(BH.bhNormalizeExperimentArchiveRecord({ ...record, current: { ...record.current, exactFromStart: false } })).toBeNull();
    expect(BH.bhNormalizeExperimentArchiveRecord({ ...record, baseline: { ...record.baseline, runSerial: 'unknown' } })).toBeNull();
    expect(BH.bhNormalizeExperimentArchiveRecord({ ...record, baseline: { ...record.baseline, capturedDay: 0 }, current: { ...record.current, capturedDay: 0 } })).toBeNull();
  });

  it('prevents duplicate pairs and refuses a thirteenth pair without silently overwriting existing evidence', () => {
    const fixture = pair(1);
    const first = save(undefined, fixture);
    const duplicate = save(first.archive, fixture);
    expect(duplicate.status).toBe('duplicate');
    expect(duplicate.archive).toEqual(first.archive);
    let archive = first.archive;
    for (let seed = 2; seed <= BH.BEEHIVE_EXPERIMENT_ARCHIVE_LIMIT; seed += 1) archive = save(archive, pair(seed)).archive;
    const before = JSON.parse(JSON.stringify(archive));
    expect(save(archive, pair(13))).toMatchObject({ status: 'full', archive: before });
    expect(archive).toEqual(before);
    archive = BH.bhRemoveExperimentArchivePair(archive, archive.records[0].pairId);
    expect(save(archive, pair(13)).status).toBe('saved');
    const oversized = BH.bhNormalizeExperimentArchive({ ...before, records: before.records.concat(save(undefined, pair(13)).record) });
    expect(oversized.records).toHaveLength(12);
    expect(oversized.discardedCount).toBe(1);
    expect(oversized.records[0]).toEqual(before.records[0]);
  });

  it('never turns unknown model checkpoints into eligible evidence through save normalization', () => {
    const fixture = pair(100);
    const record = save(undefined, fixture).record;
    for (const identity of [undefined, null, '', '  ', {}, BH.BEEHIVE_UNKNOWN_MODEL_VERSION]) {
      const rawBaseline = { ...fixture.baseline, modelVersion: identity, exactFromStart: true };
      const current = { ...fixture.runB, modelVersion: identity, seededFromDay: 0 };
      const normalized = BH.bhNormalizeExperimentSnapshot(rawBaseline);
      expect(normalized).toMatchObject({ modelVersion: BH.BEEHIVE_UNKNOWN_MODEL_VERSION, exactFromStart: false });
      for (const baseline of [rawBaseline, normalized, BH.bhNormalizeExperimentSnapshot(normalized)]) {
        const comparison = BH.bhCompareExperiments(baseline, current);
        expect(comparison.status).toBe('exploratory');
        expect(comparison.checks.find((check) => check.id === 'model').matched).toBe(false);
        expect(comparison.interpretationReady).toBe(false);
        expect(BH.bhSaveCompletedExperimentPair(undefined, baseline, current, fixture.notebook).status).toBe('ineligible');
      }
      const imported = { ...record, baseline: rawBaseline, current: { ...record.current, modelVersion: identity } };
      expect(BH.bhNormalizeExperimentArchiveRecord(imported)).toBeNull();
      const recovered = BH.bhReadBeeBackup(BH.bhBuildBeeBackup({ ...current, experimentBaseline: rawBaseline, experimentArchive: { schemaVersion: 1, records: [imported] } }));
      expect(BH.bhNormalizeExperimentSnapshot(recovered.state.experimentBaseline).exactFromStart).toBe(false);
      expect(recovered.state.experimentArchive.records).toEqual([]);
      expect(save(undefined, { ...fixture, baseline: recovered.state.experimentBaseline, runB: recovered.state }).status).toBe('ineligible');
    }
  });

  it('retains eligible explicit older-model evidence in a distinct protocol group', () => {
    const older = save(undefined, pair(111, 6, { modelVersion: 'colony-daily-1.1' }));
    expect(older.status).toBe('saved');
    const combined = save(older.archive, pair(222)).archive;
    const restored = BH.bhNormalizeExperimentArchive(combined);
    expect(restored.records[0].baseline.modelVersion).toBe('colony-daily-1.1');
    expect(restored.records[0].current.modelVersion).toBe('colony-daily-1.1');
    expect(BH.bhSummarizeExperimentArchive(restored).groups).toHaveLength(2);
    expect(BH.bhBuildExperimentArchiveEvidence(restored)).toContain('colony-daily-1.1');
  });

  it('keeps missing recorded outcomes unavailable through repeated normalization, table readout, and export', () => {
    const fixture = pair(100);
    const baseline = structuredClone(fixture.baseline);
    delete baseline.metrics.honey;
    for (const checkpoint of [baseline, BH.bhNormalizeExperimentSnapshot(baseline), BH.bhNormalizeExperimentSnapshot(BH.bhNormalizeExperimentSnapshot(baseline))]) {
      const comparison = BH.bhCompareExperiments(checkpoint, fixture.runB);
      expect(comparison.baseline).toMatchObject({ exactFromStart: false, metrics: { honey: null } });
      expect(comparison.metrics.find((metric) => metric.id === 'honey')).toMatchObject({ baseline: null, current: 26, delta: null });
      expect(comparison.prediction).toMatchObject({ status: 'waiting', observedDirectionId: '', delta: null });
      expect(BH.bhSaveCompletedExperimentPair(undefined, checkpoint, fixture.runB, fixture.notebook).status).toBe('ineligible');
      const html = renderTool('beehive', { beehive: { ...fixture.runB, viewMode: 'beekeeper', experimentBaseline: checkpoint } });
      const document = new DOMParser().parseFromString(html, 'text/html');
      const cells = document.querySelector('[data-experiment-metric="honey"]').querySelectorAll('td');
      expect(Array.from(cells, (cell) => cell.textContent)).toEqual(['Not recorded', '26 lb', 'Not recorded']);
      const evidence = BH.bhBuildExperimentEvidenceRecord(fixture.notebook, checkpoint, fixture.runB);
      expect(evidence).toContain('| Honey | Not recorded | 26 lb | Not recorded |');
      expect(evidence).not.toContain('| Honey | 20 lb |');
    }
    expect(BH.bhEvaluateExperimentPrediction(fixture.notebook, { matchedCheckpoint: true, metrics: [{ id: 'honey', baseline: null, current: 26, delta: null }] }).status).toBe('waiting');
    // An ordinary new colony still has real modeled defaults.
    expect(BH.bhCreateExperimentSnapshot(BH.bhCreateNewColonyState(100, 1)).metrics.honey).toBe(20);
  });

  it('never repairs absent recorded seed, run, or checkpoint identity into full evidence', () => {
    const fixture = pair(100);
    for (const field of ['simulationSeed', 'runSerial', 'capturedDay']) {
      const raw = structuredClone(fixture.baseline);
      delete raw[field];
      const first = BH.bhNormalizeExperimentSnapshot(raw);
      const second = BH.bhNormalizeExperimentSnapshot(first);
      expect(first.exactFromStart).toBe(false);
      expect(second.exactFromStart).toBe(false);
      for (const baseline of [raw, first, second]) expect(BH.bhSaveCompletedExperimentPair(undefined, baseline, fixture.runB, fixture.notebook).status).toBe('ineligible');
    }
  });

  it('summarizes paired differences across distinct recipes while counting deterministic replays once', () => {
    let archive = save(undefined, pair(1, 6)).archive;
    archive = save(archive, pair(2, -2)).archive;
    archive = save(archive, pair(1, 6, { runA: 3, runB: 4 })).archive;
    const summary = BH.bhSummarizeExperimentArchive(archive);
    expect(summary.recordCount).toBe(3);
    expect(summary.groups).toHaveLength(1);
    expect(summary.groups[0]).toMatchObject({ seedCount: 2, pairCount: 3, repeatedSeedCount: 1,
      meanDelta: 2, minDelta: -2, maxDelta: 6, higherCount: 1, lowerCount: 1, sameCount: 0, seeds: [1, 2] });
  });

  it('keeps differences in model, garden, checkpoint, site, or action timing in separate protocol groups', () => {
    let archive = save(undefined, pair(1)).archive;
    for (const fixture of [pair(2, 6, { modelVersion: 'previous-colony-model' }), pair(3, 6, { gardenBonus: 10 }),
      pair(4, 6, { day: 14 }), pair(5, 6, { siteId: 'forest' }), pair(6, 6, { actionDay: 5 })]) {
      const result = save(archive, fixture);
      expect(result.status).toBe('saved');
      archive = result.archive;
    }
    expect(BH.bhSummarizeExperimentArchive(archive).groups).toHaveLength(6);
    expect(BH.bhNormalizeExperimentArchive(archive).records[1].baseline.modelVersion).toBe('previous-colony-model');
  });

  it('separates adding, omitting, retiming, and replacing a choice, and different outcome metrics', () => {
    let archive;
    for (const [index, operation] of ['add', 'omit', 'retime', 'replace', 'workers'].entries()) {
      const fixture = pair(20 + index);
      const action = fixture.runB.managementTrail[0];
      const runA = BH.bhExperimentSnapshotState(fixture.baseline);
      if (operation === 'omit') {
        BH.bhAppendManagementAction(runA, action);
        fixture.runB.managementTrail = [];
      } else if (operation === 'retime') {
        BH.bhAppendManagementAction(runA, action);
        fixture.runB.managementTrail = [{ ...action, day: 5 }];
      } else if (operation === 'replace') {
        BH.bhAppendManagementAction(runA, { ...action, choiceId: 'feed_bees', label: 'Feed bees' });
      } else if (operation === 'workers') {
        fixture.runB.workers = 13000;
        fixture.notebook.predictedMetricId = 'workers';
        fixture.notebook.registeredPlan = BH.bhCreateExperimentPlanRegistration(fixture.notebook, 2, 1);
      }
      fixture.baseline = BH.bhCreateExperimentSnapshot(runA);
      const result = save(archive, fixture);
      expect(result.status).toBe('saved');
      archive = result.archive;
    }
    const summary = BH.bhSummarizeExperimentArchive(archive);
    expect(summary.groups).toHaveLength(5);
    expect(summary.groups.map((group) => group.metricId)).toEqual(['honey', 'honey', 'honey', 'honey', 'workers']);
    expect(summary.groups.every((group) => group.seedCount === 1)).toBe(true);
  });

  it('does not archive current-model colony evidence after damaged brood ages were reconstructed', () => {
    const fixture = pair(30);
    const recovered = BH.bhRecoverBeehiveState({ ...fixture.runB, broodCohorts: { ...fixture.runB.broodCohorts, workers: [] } });
    expect(recovered.repairs).toContain('broodCohorts');
    expect(recovered.state.seededFromDay).toBe(12);
    expect(BH.bhCreateExperimentSnapshot(recovered.state).exactFromStart).toBe(false);
    expect(save(undefined, { ...fixture, runB: recovered.state }).status).toBe('ineligible');
  });

  it('exports frozen paired evidence, descriptive mean and range, controls, seeds, and honest import limitations', () => {
    let archive = save(undefined, pair(1, 6)).archive;
    archive = save(archive, pair(2, -2)).archive;
    archive = BH.bhNormalizeExperimentArchive({ ...archive, records: archive.records.concat({ schemaVersion: 99 }) });
    const evidence = BH.bhBuildExperimentArchiveEvidence(archive);
    expect(evidence).toContain('**Mean paired difference:** +2 lb');
    expect(evidence).toContain('**Observed paired range:** -2 lb to +6 lb');
    expect(evidence).toContain('**Seeds:** 1, 2');
    expect(evidence).toContain('garden +0% fixed from Day 0');
    expect(evidence).toContain('not confidence intervals');
    expect(evidence).toContain('**Import limitation:** 1');
    expect(evidence.match(/### Saved pair/g)).toHaveLength(2);
    expect(evidence).toContain('Does forage change honey stores?');
    expect(evidence).toContain('**Comparison status:** Protected comparison ready');
    const source = readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');
    expect(source.match(/lines\.push\(bhBuildExperimentArchiveEvidence\(d\.experimentArchive\)\)/g)).toHaveLength(2);
  });

  it('round-trips archived pair evidence and garden provenance through the portable Bee backup', () => {
    const fixture = pair(15, 6, { gardenBonus: 20 });
    const archive = save(undefined, fixture).archive;
    const text = BH.bhBuildBeeBackup({ ...fixture.runB, experimentBaseline: fixture.baseline, experimentArchive: archive }, '2026-10-01T00:00:00.000Z');
    const restored = BH.bhReadBeeBackup(text);
    expect(restored.error).toBeUndefined();
    expect(restored.state.experimentArchive).toEqual(archive);
    expect(restored.state.experimentEnvironment).toEqual({ schemaVersion: 1, gardenBonus: 20, trackedFromDay: 0 });
    expect(restored.repairs).toEqual([]);
  });

  it('renders explicit save state, accessible summary captions and removal controls without hiding an occupied archive', () => {
    const fixture = pair(1);
    const archive = save(undefined, fixture).archive;
    const html = renderTool('beehive', { beehive: { ...fixture.runB, viewMode: 'beekeeper', experimentBaseline: fixture.baseline, experimentArchive: archive } });
    expect(html).toContain('data-experiment-archive-count="1"');
    expect(html).toContain('data-experiment-archive-save="duplicate"');
    expect(html).toContain('Pair already saved');
    expect(html).toContain('Paired outcome differences across distinct seeds (Run B minus Run A)');
    expect(html).toContain('aria-label="Remove saved pair 1 with seed 1"');
    const noBaseline = renderTool('beehive', { beehive: { ...fixture.runB, viewMode: 'beekeeper', experimentBaseline: null, experimentArchive: archive } });
    expect(noBaseline).toContain('data-experiment-archive-count="1"');
    expect(noBaseline).toContain('data-experiment-archive-save="ineligible"');
  });
});

describe('Protected garden environment control', () => {
  it('does not assume that missing or late-adopted garden history was a zero bonus from the start', () => {
    const fixture = pair(1);
    const unknown = { ...fixture.runB };
    delete unknown.experimentEnvironment;
    const late = { ...fixture.runB, experimentEnvironment: { schemaVersion: 1, gardenBonus: 0, trackedFromDay: 4 } };
    const different = { ...fixture.runB, experimentEnvironment: { schemaVersion: 1, gardenBonus: 10, trackedFromDay: 0 } };
    for (const current of [unknown, late, different]) {
      const comparison = BH.bhCompareExperiments(fixture.baseline, current);
      expect(comparison.checks.find((check) => check.id === 'garden').matched).toBe(false);
      expect(comparison.interpretationReady).toBe(false);
      expect(save(undefined, { ...fixture, runB: current }).status).toBe('ineligible');
    }
    expect(BH.bhNormalizeExperimentEnvironment({ schemaVersion: 1, gardenBonus: 31, trackedFromDay: 0 })).toBeNull();
    expect(BH.bhNormalizeExperimentEnvironment({ schemaVersion: 1, gardenBonus: '0', trackedFromDay: 0 })).toBeNull();
  });

  it('keeps Day0 stock and site setup exact, but changing controls back after Day0 stays partial', () => {
    const setup = BH.bhCreateNewColonyState(1, 1);
    expect(BH.bhApplyExperimentControlChange(setup, 'subspecies', 'russian')).toBe(true);
    expect(BH.bhApplyExperimentControlChange(setup, 'apiarySite', 'forest_edge')).toBe(true);
    expect(setup.seededFromDay).toBe(0);
    expect(setup.experimentControlChange).toBeNull();
    const fixture = pair(1);
    expect(BH.bhApplyExperimentControlChange(fixture.runB, 'subspecies', 'italian')).toBe(false);
    expect(BH.bhCompareExperiments(fixture.baseline, fixture.runB).interpretationReady).toBe(true);
    BH.bhApplyExperimentControlChange(fixture.runB, 'subspecies', 'russian');
    BH.bhApplyExperimentControlChange(fixture.runB, 'subspecies', 'italian');
    BH.bhApplyExperimentControlChange(fixture.runB, 'apiarySite', 'forest_edge');
    BH.bhApplyExperimentControlChange(fixture.runB, 'apiarySite', 'meadow');
    const comparison = BH.bhCompareExperiments(fixture.baseline, fixture.runB);
    expect(comparison.checks.find((check) => check.id === 'stock').matched).toBe(true);
    expect(comparison.checks.find((check) => check.id === 'site').matched).toBe(true);
    expect(comparison.checks.find((check) => check.id === 'tracking').matched).toBe(false);
    expect(comparison.interpretationReady).toBe(false);
    expect(save(undefined, fixture).status).toBe('ineligible');
    const html = renderTool('beehive', { beehive: { ...fixture.runB, viewMode: 'beekeeper', experimentBaseline: fixture.baseline } });
    expect(html).toContain('Apiary site changed on Day 12');
    expect(html).toContain('Changing back does not restore a full-run comparison');
    expect(html).not.toContain('This older run became repeatable');
    const repairedLater = renderTool('beehive', { beehive: { ...fixture.runB, day: 15, seededFromDay: 15, viewMode: 'beekeeper' } });
    expect(repairedLater).toContain('Apiary site changed on Day 12');
  });
});

describe('Live completed-pair archive action', () => {
  let host;
  let root;
  let originalRaf;
  let originalCancelRaf;

  afterEach(() => {
    if (root) act(() => root.unmount());
    host?.remove();
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    vi.restoreAllMocks();
  });

  it('saves a rapid double-click only once, survives clearing Run A, and exports through the manual copy fallback', async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform: vi.fn() });
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const fixture = pair(1);
    let latest;
    function Component() {
      const [toolData, setToolData] = React.useState({ beehive: { ...fixture.runB, viewMode: 'beekeeper', beeView: 'scene', tutorialDone: true, soundOn: false, experimentBaseline: fixture.baseline } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
    const button = host.querySelector('[data-experiment-archive-save="saved"]');
    expect(button).toBeTruthy();
    await act(async () => { button.click(); button.click(); await Promise.resolve(); });
    expect(latest.beehive.experimentArchive.records).toHaveLength(1);
    await act(async () => { host.querySelector('[data-experiment-baseline-clear]').click(); await Promise.resolve(); });
    expect(latest.beehive.experimentArchive.records).toHaveLength(1);
    await act(async () => { host.querySelector('[data-experiment-archive-copy]').click(); await Promise.resolve(); });
    expect(latest.beehive.exportedReportTitle).toBe('Completed Paired Trial Archive');
    expect(latest.beehive.exportedReport).toContain('### Saved pair 1 - Seed 1');
    await act(async () => { host.querySelector('[data-experiment-archive-remove]').click(); await Promise.resolve(); });
    expect(latest.beehive.experimentArchive.records).toEqual([]);
  });

  it('uses the live day when retained Day0 stock and site events arrive after an advance in the same batch', async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform: vi.fn() });
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    let latest;
    function Component() {
      const [toolData, setToolData] = React.useState({ beehive: { ...BH.bhCreateNewColonyState(1, 2), viewMode: 'beekeeper', beeView: 'scene', tutorialDone: true, soundOn: false, motionPaused: true, stockPickerOpen: true } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
    const advance = host.querySelector('[data-beehive-time-control="1"]');
    const russian = host.querySelector('[data-beehive-stock-option="russian"]');
    const italian = host.querySelector('[data-beehive-stock-option="italian"]');
    const forest = host.querySelector('[data-beehive-site-option="forest_edge"]');
    const meadow = host.querySelector('[data-beehive-site-option="meadow"]');
    expect([advance, russian, italian, forest, meadow].every(Boolean)).toBe(true);
    await act(async () => { advance.click(); russian.click(); italian.click(); forest.click(); meadow.click(); await Promise.resolve(); });
    expect(latest.beehive).toMatchObject({ day: 1, subspecies: 'italian', apiarySite: 'meadow', seededFromDay: 1,
      experimentControlChange: { day: 1, controlId: 'site', previousId: 'forest_edge', currentId: 'meadow' } });
    expect(BH.bhExperimentProvenance(latest.beehive).exactFromStart).toBe(false);
  });
});
