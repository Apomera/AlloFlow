import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const physics = require(resolve('stem_lab/stem_tool_magnetism.js'));
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function scan(strength = 1) {
  return physics.fieldScanSeries([{ x: 0, y: 0, angle: 0, polarity: 1, strength }], 'axial', [50, 65, 80, 100, 125, 150, 175], 0, 0)
    .map((row) => ({ ...row, strength }));
}

function mount(extra = {}) {
  resetStemLab();
  const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let latest;
  let setData;
  const initial = { tab: 'field', fieldView: 'map', fieldMapStrength: 2, fieldMapNoise: 0,
    fieldMapProbe: { x: 100, y: 0 }, fieldMapPath: 'axial', fieldMapSamples: scan(2), fieldMapReference: scan(),
    fieldMapScanPrediction: 3, fieldMapPrediction: 1, fieldMapGraphScale: 'log', fieldMapModel: 2,
    fieldMapSelected: 1, fieldMapCompareSelected: 4,
    learningMode: 'guided', notebookTrials: [], notebookClaim: 'The field changes.', notebookReasoning: 'Compare the recorded values.',
    notebookOpen: false, labShellPanel: '', missionId: 'field_detective', ...extra };
  function Harness() {
    const [toolData, setToolData] = React.useState({ magnetism: initial });
    latest = toolData.magnetism;
    setData = setToolData;
    return cfg.render({ React, toolData, setToolData, addToast() {}, announceToSR() {}, awardXP() {},
      aiHintsEnabled: false, callGemini: null, t: (key, fallback) => fallback || key });
  }
  act(() => root.render(React.createElement(Harness)));
  return { host, state: () => latest,
    patch(patch) { act(() => setData((previous) => ({ ...previous, magnetism: { ...previous.magnetism, ...patch } }))); },
    click(name) {
      const button = [...host.querySelectorAll('button')].find((item) => item.textContent.trim() === name);
      expect(button, name).toBeTruthy();
      act(() => button.click());
    },
    close() { act(() => root.unmount()); host.remove(); }
  };
}

describe('measurement experiments stay reproducible after notebook capture', () => {
  it('saves both datasets, captured prediction, and independent graph selections', () => {
    const live = mount();
    try {
      live.click('Save measurement trial');
      const saved = live.state().notebookTrials[0];
      expect(saved.experiment).toMatchObject({ version: 1, type: 'field-measurements', prediction: 3, nextPrediction: 1,
        graphScale: 'log', model: 2, selection: { first: 1, second: 4 } });
      expect(saved.prediction).toContain('1/8');
      expect(saved.experiment.samples).toHaveLength(7);
      expect(saved.experiment.reference).toHaveLength(7);
      const frozen = JSON.stringify(saved);
      live.patch({ fieldMapStrength: 3, fieldMapSamples: scan(3), fieldMapReference: [] });
      expect(JSON.stringify(live.state().notebookTrials[0])).toBe(frozen);
      const report = physics.missionReportState('field_detective', live.state());
      expect(report.trials[0].experiment).toEqual(saved.experiment);
      expect(JSON.parse(JSON.stringify(report)).trials[0].experiment.samples).toHaveLength(7);
      expect(report.rawMeasurementCount).toBe(14);
      const rows = physics.missionFieldMeasurementsCSV(report).trim().split('\r\n').map((line) => line.split(','));
      expect(rows).toHaveLength(15);
      expect(rows[0].slice(0, 4)).toEqual(['trial', 'predicted_fraction_at_double_distance', 'run', 'point']);
      expect(rows[1].slice(0, 3)).toEqual(['1', '0.125', 'reference']);
      expect(rows[8].slice(0, 3)).toEqual(['1', '0.125', 'current']);
    } finally { live.close(); }
  });

  it('reopens from another station and undoes back to an empty workbench without changing writing or trials', () => {
    const live = mount();
    try {
      live.click('Save measurement trial');
      const savedTrials = JSON.stringify(live.state().notebookTrials);
      live.patch({ tab: 'electro', fieldMapSamples: [], fieldMapReference: [], fieldMapStrength: 3,
        fieldMapPrediction: 2, fieldMapScanPrediction: null, fieldMapProbe: { x: 150, y: 50 },
        fieldMapGraphScale: 'linear', notebookOpen: true, labShellPanel: 'evidence' });
      live.click('Reopen measurements');
      expect(live.state()).toMatchObject({ tab: 'field', fieldView: 'map', fieldMapStrength: 2,
        fieldMapGraphScale: 'log', fieldMapModel: 2, fieldMapPrediction: 1, fieldMapScanPrediction: 3,
        fieldMapSelected: 1, fieldMapCompareSelected: 4 });
      expect(live.state().fieldMapSamples).toHaveLength(7);
      expect(live.state().fieldMapReference).toHaveLength(7);
      expect(live.state().notebookClaim).toBe('The field changes.');
      expect(live.state().notebookReasoning).toBe('Compare the recorded values.');
      expect(JSON.stringify(live.state().notebookTrials)).toBe(savedTrials);
      live.click('Undo reopen');
      expect(live.state()).toMatchObject({ fieldMapSamples: [], fieldMapReference: [], fieldMapStrength: 3,
        fieldMapPrediction: 2, fieldMapScanPrediction: null, fieldMapGraphScale: 'linear', fieldMapProbe: { x: 150, y: 50 }, fieldMapReopenUndo: null });
      expect(JSON.stringify(live.state().notebookTrials)).toBe(savedTrials);
    } finally { live.close(); }
  });

  it('uses the pre-scan choice in Challenge mode and does not substitute a later choice', () => {
    const live = mount({ learningMode: 'challenge', fieldMapScanPrediction: null, fieldMapPrediction: 3 });
    try {
      const save = () => [...live.host.querySelectorAll('button')].find((item) => item.textContent === 'Save measurement trial');
      expect(save().disabled).toBe(true);
      live.click('Run 7-point scan');
      expect(save().disabled).toBe(false);
      live.patch({ fieldMapPrediction: 1 });
      live.click('Save measurement trial');
      expect(live.state().notebookTrials[0].prediction).toContain('1/8');
      expect(live.state().notebookTrials[0].experiment.prediction).toBe(3);
    } finally { live.close(); }
  });

  it('leaves legacy summaries readable without offering a fabricated replay', () => {
    const live = mount({ notebookOpen: true, labShellPanel: 'evidence', notebookTrials: [
      { station: 'Old trial', setup: 'Earlier project', result: 'An observation', metrics: [] },
      { station: 'Broken snapshot', setup: 'Saved text', result: 'Still readable', experiment: { version: 99, type: 'field-measurements' } },
    ] });
    try {
      expect(live.host.textContent).toContain('Earlier project');
      expect(live.host.textContent).toContain('Still readable');
      expect([...live.host.querySelectorAll('button')].filter((item) => item.textContent === 'Reopen measurements')).toHaveLength(0);
    } finally { live.close(); }
  });
});

describe('saved numeric evidence uses the active model', () => {
  it('records the finite 3D solenoid field and keeps the 2D baseline separate', () => {
    const state = { tab: 'electro', electroView: '3d', turns: 100, current: 2, core: false,
      electro3dLengthCm: 12, electro3dRadiusCm: 3, electro3dMaterial: 'soft', electroBaseline: { turns: 50, current: 2, core: false } };
    const metric = physics.notebookMetricSnapshot(state);
    expect(metric.find((item) => item.key === 'field_mT').value).toBeCloseTo(physics.finiteSolenoidCenterField(100, 2, .12, .03, 'soft') * 1000, 9);
    expect(metric.some((item) => item.key === 'electro_baseline_mT')).toBe(false);
    expect(metric[0].model).toBe('electro:finite');
  });

  it('records particle evidence after a bench visit, including mass and tilt in 3D', () => {
    const state = { tab: 'motor', motorMode: 'particle', benchUsed: true, chargeView: '3d',
      chargeSpeed: 5, chargeB: 4, chargeMass: 2, chargeTilt: 30, chargeSign: 1, chargeField: 1 };
    const metric = physics.notebookMetricSnapshot(state);
    expect(metric.find((item) => item.key === 'bend_radius').value).toBeCloseTo(1.25, 9);
    expect(metric.some((item) => item.key === 'speed_rpm' || item.key === 'power_W')).toBe(false);
    expect(metric.some((item) => item.key === 'helix_pitch')).toBe(true);
  });

  it('compares saved values only when units and known model identities match', () => {
    const state = { tab: 'electro', turns: 100, current: 2, core: false };
    const field = physics.notebookMetricSnapshot(state)[0];
    const pulse = (metric) => physics.liveEvidencePulseState({ ...state, notebookTrials: [{ metrics: [metric] }] });
    expect(pulse({ ...field, model: 'electro:finite' }).metrics[0].comparable).toBe(false);
    expect(pulse({ ...field, unit: 'T' }).metrics[0].comparable).toBe(false);
    expect(pulse({ ...field, value: field.value / 2 }).metrics[0].comparable).toBe(true);
    const legacy = { ...field };
    delete legacy.model;
    expect(pulse(legacy).metrics[0].comparable).toBe(true);
    const spatialPulse = physics.liveEvidencePulseState({ ...state, electroView: '3d', notebookTrials: [{ metrics: [legacy] }] });
    expect(spatialPulse.metrics[0].comparable).toBe(false);
  });

  it('keeps reports readable when an older save contains a non-text claim', () => {
    const report = physics.missionReportState('power_path', { notebookClaim: {}, notebookReasoning: [], notebookTrials: [] });
    expect(report.claim).toBe('');
    expect(report.reasoning).toBe('');
    expect(report.claimStatus).toContain('Add a notebook claim');
  });

  it('captures the recorded transient window instead of substituting a steady bench prediction', () => {
    const state = { tab: 'motor', motorMode: 'forces', benchUsed: true, benchView: 'mission',
      motorCurrent: 3, motorField: 4, benchLoadOhms: 40, benchFriction: 3, benchTurns: 80, benchField: 4,
      benchTrace: [{ time: .1, rpm: 10, generatedVoltage: .5, outputPower: .03, temperature: 22 }] };
    const metrics = physics.notebookMetricSnapshot(state);
    expect(metrics.find((item) => item.key === 'speed_rpm')).toMatchObject({ value: 10, model: 'motor:bench:mission' });
    expect(metrics.find((item) => item.key === 'power_W').value).toBe(.03);
    const steady = physics.notebookMetricSnapshot({ ...state, benchView: 'steady' });
    expect(steady[0].model).toBe('motor:bench:steady');
    expect(steady[0].value).not.toBe(10);
  });

  it('records the same percentage and side force as the 3D motor instruments', () => {
    const state = { tab: 'motor', motorMode: 'forces', motorView: '3d', benchUsed: true,
      motorAngle: 90, motorCurrent: 3, motorField: 4, motorCurrentDir: 1, motorFieldDir: 1 };
    const spatial = physics.motorSpatialState(90, 3, 4, 1, 1);
    const metrics = physics.notebookMetricSnapshot(state);
    expect(metrics.find((item) => item.key === 'torque_percent')).toMatchObject({ value: spatial.torquePercent, unit: '%' });
    expect(metrics.find((item) => item.key === 'side_force_N').value).toBe(spatial.force);
    expect(metrics.some((item) => item.key === 'torque_rel' || item.key === 'speed_rpm')).toBe(false);
  });
});
