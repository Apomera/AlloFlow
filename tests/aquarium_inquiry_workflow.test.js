import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab
} from './helpers/stem_widgets_smoke_harness.js';

function findElement(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const found = findElement(child, predicate); if (found) return found; }
    return null;
  }
  if (predicate(node)) return node;
  return findElement(node.props?.children, predicate);
}

// Execute the real one-hour button handler and its functional state updater.
// SSR supplies the hooks context, while returning null avoids mounting WebGL
// or testing unrelated presentation. No chemistry equations are reimplemented.
function renderTank(patch = {}, overrides = {}) {
  resetStemLab();
  const tool = loadTool('stem_lab/stem_tool_aquarium.js', 'aquarium');
  const store = newStore();
  store.toolData = { _aquarium: {
    mode: 'tank', selectedTank: 'freshwater', soundEnabled: false,
    simRunning: false, simTick: 10, simDay: 0, simHour: 12,
    tutorialDismissed: true, fishIdentityVersion: 3,
    tankFish: [], fishInstanceIds: [], nextFishInstanceId: 1,
    tankPlants: ['anubias'], plantHealth: { anubias: 80 }, plantBiomass: { anubias: 2 },
    waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 20, salinity: 0, dissolvedO2: 7, co2: 3 },
    lightsOn: true, equipment: { filter: 0, heater: 0, light: 0, airPump: 0 },
    equipmentCondition: { filter: 100, heater: 100, light: 100, airPump: 100 },
    equipmentFaults: {}, ...patch
  } };
  let element;
  function CaptureTool() {
    element = tool.render(makeCtx(overrides, store));
    return null;
  }
  ReactDOMServer.renderToStaticMarkup(React.createElement(CaptureTool));
  return { element, store };
}


const copy = x => JSON.parse(JSON.stringify(x));
const seed = { tankFish: ['guppy'], fishInstanceIds: ['fish-1'], nextFishInstanceId: 2, hungerLevels: { 'fish-1': 80 }, coins: 50 };
function view(patch = {}, overrides = {}) { const v = renderTank({ ...copy(seed), ...patch }, overrides); v.state = () => v.store.toolData._aquarium; v.byId = id => findElement(v.element, n => n.props?.id === id); v.click = label => { const button = findElement(v.element, n => n.type === 'button' && (n.props.children === label || n.props['aria-label'] === label)); expect(button, label).toBeTruthy(); expect(button.props.disabled, label).not.toBe(true); button.props.onClick(); return v.state(); }; return v; }
function baseline(patch = {}) { return view(patch).click('Save baseline'); }
function trial(patch = {}) { return view({ ...baseline(), inquiryPrediction: 'Oxygen in B will fall because the biological lights are off.', ...patch }).click('Create paired trial'); }
afterEach(() => vi.restoreAllMocks());

describe('Aquarium paired trials and care evidence', () => {
  it('captures a full immutable baseline without nesting prior snapshots', () => {
    const v = view({ observationBaseline: { tank: 'freshwater', chemistry: { nitrate: 99 } }, careEvidence: [{ tick: 1 }], inquiryExperiment: { old: true } });
    const next = v.click('Replace baseline'), saved = next.observationBaseline.tankState;
    expect(saved.waterChem).toEqual(next.waterChem); expect(saved.tankFish).toEqual(next.tankFish); expect(saved.plantBiomass).toEqual(next.plantBiomass);
    expect(saved.observationBaseline).toBeUndefined(); expect(saved.inquiryExperiment).toBeUndefined(); expect(saved.careEvidence).toBeUndefined();
    next.waterChem.nitrate = 45; next.hungerLevels['fish-1'] = 4;
    expect(saved.waterChem.nitrate).toBe(20); expect(saved.hungerLevels['fish-1']).toBe(80);
  });
  it('rejects a readings-only legacy baseline and an unchanged factor', () => {
    view(); const core = window.AquariumInquiryCore;
    expect(core.createExperiment({ chemistry: {} }, 'lightsOn', false, 'test')).toBeNull();
    const saved = baseline().observationBaseline;
    expect(core.createExperiment(saved, 'lightsOn', true, 'test')).toBeNull();
    expect(core.createExperiment(saved, 'lightsOn', false, '')).toBeNull();
    expect(core.createExperiment(saved, 'airPump', 99, 'test')).toBeNull();
    expect(core.createExperiment(saved, 'temperature', 80, 'test')).toBeNull();
    expect(view({ observationBaseline: { tank: 'freshwater', chemistry: {} }, aquariumWorkspacePanel: 'investigate' }).byId('aquarium-paired-experiment')).toBeTruthy();
  });
  it('creates two independent tanks changing exactly one setting', () => {
    const state = trial(), exp = state.inquiryExperiment;
    expect(exp.a).toEqual({ ...exp.b, lightsOn: true });
    expect(exp.b.lightsOn).toBe(false); exp.b.plantBiomass.anubias = 999;
    expect(exp.a.plantBiomass.anubias).toBe(2); expect(exp.baseline.plantBiomass.anubias).toBe(2); expect(state.plantBiomass.anubias).toBe(2);
  });
  it('advances both through real hourly equations without changing any live fields or baseline', () => {
    const initial = trial(), before = copy(initial), next = view(initial).click('Observe both +6 h');
    const { inquiryExperiment: exp, ...live } = next, { inquiryExperiment: old, ...beforeLive } = before;
    expect(live).toEqual(beforeLive); expect(exp.baseline).toEqual(old.baseline); expect(exp.elapsed).toBe(6);
    expect(exp.a.simTick).toBe(16); expect(exp.b.simTick).toBe(16); expect(exp.series).toHaveLength(7);
    expect(exp.a.lastEcosystemExchange.tick).toBe(16); expect(exp.b.lastEcosystemExchange.tick).toBe(16);
    expect(exp.a.lastEcosystemExchange.plants.oxygenProduced).toBeGreaterThan(exp.b.lastEcosystemExchange.plants.oxygenProduced);
    expect(exp.a.waterChem.dissolvedO2).not.toBe(exp.b.waterChem.dissolvedO2);
  });
  it('replays identical results and preserves the reflection', () => {
    const next = view(trial()).click('Observe both +6 h');
    next.inquiryExperiment.reflection = 'The readings differ.';
    const reset = view(next).click('Replay from start'); expect(reset.inquiryExperiment.elapsed).toBe(0);
    const replay = view(reset).click('Observe both +6 h'); expect(replay.inquiryExperiment).toEqual(next.inquiryExperiment);
  });
  it('uses matching keyed random streams for identical controls and clips the 24-hour limit', () => {
    const initial = trial(); initial.inquiryExperiment.b = copy(initial.inquiryExperiment.a);
    let next = initial; for (let i=0;i<4;i++) next = view(next).click('Observe both +6 h');
    expect(next.inquiryExperiment.a).toEqual(next.inquiryExperiment.b); expect(next.inquiryExperiment.elapsed).toBe(24);
    expect(next.inquiryExperiment.series).toHaveLength(25);
    const v = view(next); const button = findElement(v.element, n => n.type === 'button' && n.props.children === 'Observe both +1 h'); expect(button.props.disabled).toBe(true);
    button.props.onClick(); expect(v.state().inquiryExperiment).toEqual(next.inquiryExperiment);
  });
  it('keeps a saved pump fault and condition when changing its level', () => {
    const state = baseline({ equipmentFaults: { airPump: { severity: 1 } }, equipmentCondition: { filter: 100, heater: 100, light: 100, airPump: 20 } });
    const next = view({ ...state, inquiryFactor: 'airPump', inquiryValue: '3', inquiryPrediction: 'A failed pump may not improve oxygen.' }).click('Create paired trial');
    expect(next.inquiryExperiment.b.equipment.airPump).toBe(3); expect(next.inquiryExperiment.b.equipmentFaults).toEqual(next.inquiryExperiment.a.equipmentFaults);
    expect(next.inquiryExperiment.b.equipmentCondition).toEqual(next.inquiryExperiment.a.equipmentCondition);
  });
  it('records immediate feeding from actual before/after readings without advancing time', () => {
    const v = view(), before = copy(v.state()), after = v.click('Flake'), evidence = after.careEvidence.at(-1);
    expect(after.simTick).toBe(before.simTick); expect(evidence.kind).toBe('action'); expect(evidence.hungerDrop).toBe(35);
    expect(evidence.changes.find(m=>m.key==='ammonia').delta).toBeCloseTo(after.waterChem.ammonia-before.waterChem.ammonia,8);
    expect(evidence.exchange).toBeNull();
  });
  it('reports lighting as a setting change with no invented immediate chemistry effect', () => {
    const v = view(), after = v.click('Toggle Lights'), evidence = after.careEvidence.at(-1);
    expect(evidence.changes.every(m=>m.delta===0)).toBe(true); expect(evidence.kind).toBe('action'); expect(after.simTick).toBe(10);
  });
  it('records actual hourly changes separately and bounds the history', () => {
    vi.spyOn(Math,'random').mockReturnValue(.99);
    const v = view({ careEvidence: Array.from({length:8},(_,i)=>({tick:i})) }), before = copy(v.state());
    const after = v.click('Pause and observe one aquarium hour'), evidence = after.careEvidence.at(-1);
    expect(after.careEvidence).toHaveLength(8); expect(evidence.kind).toBe('hour'); expect(evidence.fromTick).toBe(10); expect(evidence.tick).toBe(11);
    expect(evidence.exchange).toEqual(after.lastEcosystemExchange); expect(evidence.changes.find(m=>m.key==='dissolvedO2').delta).toBeCloseTo(after.waterChem.dissolvedO2-before.waterChem.dissolvedO2,8);
  });
  it('switches workspace views without changing simulation or losing the live display', () => {
    const v = view(), before = copy(v.state()); const nav = findElement(v.element,n=>n.type==='nav'&&n.props['aria-label']==='Aquarium workspace');
    expect(nav).toBeTruthy(); const button = findElement(nav,n=>n.type==='button'&&n.props['aria-controls']==='aquarium-panel-decide');button.props.onClick();
    expect(v.state()).toEqual({...before,aquariumWorkspacePanel:'decide'});
    const next = view(v.state()); expect(next.byId('aquarium-panel-observe').props.hidden).toBe(true);expect(next.byId('aquarium-panel-decide').props.hidden).toBe(false);
    expect(next.byId('aquarium-live-tank')).toBeTruthy();expect(next.byId('aquarium-care-actions')).toBeTruthy();
  });
  it('trial simulation never calls external XP rewards while live healthy hours still do', () => {
    const awardXP = vi.fn();
    const healthy = { simTick: 4, tankPlants: [], waterChem: { temp:76,pH:7,ammonia:0,nitrite:0,nitrate:0,salinity:0,dissolvedO2:7,co2:3 } };
    const starting = view({ ...baseline(healthy), inquiryPrediction: 'Changing the lights changes the day phase.' }).click('Create paired trial');
    view(starting, { awardXP }).click('Observe both +6 h'); expect(awardXP).not.toHaveBeenCalled();
    vi.spyOn(Math,'random').mockReturnValue(.99);
    view(healthy, { awardXP }).click('Pause and observe one aquarium hour');
    expect(awardXP).toHaveBeenCalledWith('aquarium', 2, 'Healthy tank maintenance');
  });
  it('live observation preserves existing experiment snapshots', () => {
    const initial = trial(), next = view(initial).click('Pause and observe one aquarium hour');
    expect(next.inquiryExperiment).toEqual(initial.inquiryExperiment); expect(next.observationBaseline).toEqual(initial.observationBaseline); expect(next.simTick).toBe(11);
  });
  it('offers only saved plant species and rejects invalid or unchanged biomass', () => {
    const state = baseline(), core = window.AquariumInquiryCore, saved = state.observationBaseline;
    expect(saved.plantOptions).toEqual([expect.objectContaining({ id: 'anubias', name: expect.any(String), maxBiomass: expect.any(Number) })]);
    const options = core.factorOptions(saved); expect(options.map(o=>o.id)).toEqual(['lightsOn','airPump','filter','plant:anubias']);
    for (const value of ['', ' ', -1, Infinity, NaN, saved.plantOptions[0].maxBiomass+1, 2]) expect(core.createExperiment(saved, 'plant:anubias', value, 'A prediction')).toBeNull();
    expect(core.createExperiment(saved,'plant:missing',1,'A prediction')).toBeNull();
    expect(core.createExperiment(saved,'lightsOn','bogus','A prediction')).toBeNull();
  });
  it('changes only the selected biomass and uses it in the real hourly exchange model', () => {
    const state = view({ ...baseline(), inquiryFactor: 'plant:anubias', inquiryValue: '0', inquiryPrediction: 'Less plant biomass will reduce oxygen production.' }).click('Create paired trial');
    const exp = state.inquiryExperiment;
    expect(exp.b).toEqual({ ...exp.a, plantBiomass: { ...exp.a.plantBiomass, anubias: 0 } });
    expect(exp.baselineSetting).toContain('2 biomass index'); expect(exp.changedSetting).toContain('0 biomass index');
    const next = view(state).click('Observe both +1 h');
    expect(next.inquiryExperiment.a.lastEcosystemExchange.plants.oxygenProduced).toBeGreaterThan(next.inquiryExperiment.b.lastEcosystemExchange.plants.oxygenProduced);
    expect(next.plantBiomass.anubias).toBe(2);
    const replay = view(next).click('Replay from start'); expect(replay.inquiryExperiment.plantOptions).toEqual(exp.plantOptions);
    expect(view(replay).click('Observe both +1 h').inquiryExperiment).toEqual(next.inquiryExperiment);
  });
  it('filter trials preserve bacteria and faults and change only the filter level', () => {
    const before = baseline({ bacteriaLevel: 25, equipmentFaults: { filter: { severity: 1 } } });
    const state = view({ ...before, inquiryFactor: 'filter', inquiryValue: '3', inquiryPrediction: 'A fault could limit the stronger filter.' }).click('Create paired trial');
    const exp = state.inquiryExperiment;
    expect(exp.b).toEqual({ ...exp.a, equipment: { ...exp.a.equipment, filter: 3 } });
    expect(exp.changedSetting).toBe('Filter level: 3');
    const advanced = view(state).click('Observe both +1 h'); expect(advanced.inquiryExperiment.elapsed).toBe(1);
    expect(advanced.equipment).toEqual(before.equipment);
  });
  it('exports a detached complete trial and learner reasoning without changing state', () => {
    const state = view(trial()).click('Observe both +6 h'), core = window.AquariumInquiryCore;
    state.inquiryExperiment.reflection = 'B measured less oxygen. This supports my prediction, within the model.';
    const before = copy(state), file = core.exportTrial(state.inquiryExperiment, 'json'), packet = JSON.parse(file.body);
    expect(packet.schema).toBe('aquarium-paired-evidence-v1'); expect(packet.trial).toEqual(state.inquiryExperiment);
    expect(packet.reflection).toContain('supports my prediction'); expect(packet.limitations).toContain('Simplified aquarium model');
    packet.trial.baseline.waterChem.nitrate = 999; expect(state).toEqual(before);
  });
  it('exports every paired reading with units and actual differences', () => {
    const exp = view(trial()).click('Observe both +6 h').inquiryExperiment;
    const csv = window.AquariumInquiryCore.exportTrial(exp,'csv');
    const lines = csv.body.split('\r\n'); expect(lines).toHaveLength(1 + 7*7);
    expect(lines[0]).toContain('b_minus_a');
    const lastOxygen = lines.find(line=>line.startsWith('"6","16","Oxygen","mg/L"'));
    expect(lastOxygen).toContain(String(Number((exp.b.waterChem.dissolvedO2-exp.a.waterChem.dissolvedO2).toFixed(6))));
    const report = window.AquariumInquiryCore.exportTrial(exp,'report');
    expect(report.extension).toBe('txt'); expect(report.body).toContain(exp.prediction); expect(report.body).toContain('LEARNER EXPLANATION'); expect(report.body).toContain('(Not yet recorded)'); expect(report.body).toContain('REVIEW PROMPTS');
  });
  it('keeps older lights and pump trials exportable and replayable', () => {
    const state = trial(); for (const key of ['plantOptions','factorLabel','baselineSetting','changedSetting']) delete state.inquiryExperiment[key];
    const report = window.AquariumInquiryCore.exportTrial(state.inquiryExperiment,'report'); expect(report.body).toContain('Biological lights: off');
    const replay = view(state).click('Replay from start'); expect(replay.inquiryExperiment.value).toBe(false);
  });
  it('switches the plotted reading without changing live or trial model states', () => {
    const state = trial(), v = view(state); v.byId('aquarium-trial-metric').props.onChange({ target: { value: 'nitrate' } });
    expect(v.state()).toEqual({ ...state, inquiryChartMetric: 'nitrate' });
    const next = view(v.state()), chart = findElement(next.element,n=>n.type==='svg' && n.props['aria-label']?.startsWith('Nitrate over'));
    expect(chart).toBeTruthy();
  });

});
