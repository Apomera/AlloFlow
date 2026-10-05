import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let BH;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});

const structure = () => ({ type: 'honey', x: 0.31, y: 0.38, level: 2 });
const threat = () => ({ type: 'mites', icon: '🦟', label: 'Varroa Spike', desc: 'Parasites in brood', strength: 60, hp: 27, maxHp: 60, bornDay: 3 });
const order = () => ({ id: 'worker-brood-4-1', type: 'workers', label: 'Worker brood', icon: '🐣', amount: 20, remaining: 1 });
const telemetry = () => ({ t: 24.5, x: 21, z: -312, altitude: 133, energy: 41, wind: 1.2, clearance: 98, hazard: false, phase: 'congregation', action: 'Coast', impact: 'Energy conserved' });
const decision = () => ({ turn: 2, action: 'Coast', seconds: 4, altitudeBefore: 126, altitude: 133, energyBefore: 47, energy: 41, rangeBefore: 91, range: 65, x: 21, z: -312, target: 'Queen signal', phase: 'congregation' });
function capture() {
  const snapshot = { version: 1, runKey: 'colony:5412:3', lesson: 'waggle', mode: 'beekeeper', clock: 0, label: 'Dance decoder', capturedAt: 12345, metrics: [{ id: 'food', label: 'Food bearing', unit: '°', value: 350, angle: true }] };
  const after = { ...snapshot, metrics: [{ ...snapshot.metrics[0], value: 10 }] };
  return { snapshot, comparison: BH.bhDiscoveryComparison(snapshot, after), observation: 'The food bearing is 350°.', note: 'The shortest turn crosses north.', prediction: 1, link: 0, checked: true, saved: true, observedAt: 12345 };
}

describe('Bee nested save recovery', () => {
  it('leaves healthy nested progress, written notes, and evidence unchanged by identity', () => {
    const state = {
      day: 12, workers: 19000, honey: 28.5,
      queen: { active: true, paused: true, day: 4, score: 210, buildMode: null, result: null, structures: [structure()], threats: [threat()], events: [{ type: 'build', text: 'The honey store is complete.' }], productionQueue: [order()], resources: { nectar: 8, pollen: 12, wax: 4, royalJelly: 3 }, population: { nurses: 200, builders: 100, guards: 60, foragers: 285, scouts: 30, drones: 40 }, pheromones: { qmp: 80, alarm: 30, nasonov: 50, brood: 40 }, rival: { name: 'Thistle Crown', health: 81, strength: 330, stores: 18, structures: 3, pressure: 27, intel: 50 }, feedback: { tone: 'info', text: 'Protect the brood.' } },
      drone: { highScore: 490, attempts: 4, successes: 1, lastRun: { success: true, score: 490, maxAlt: 144, energyLeft: 41, distance: 810, telemetry: [telemetry()], decisionLog: [decision()] } },
      discoveryRecords: { waggle: capture() },
      notebook: { synthesis: 'Movement connects the three perspectives.', queen: { prediction: 'Guards will slow the raid.', evidence: 'Pressure is 27.', explanation: 'Alarm moves existing workers.' }, discoveries: { waggle: { prediction: 'Across north', observation: '350° to 10°', explanation: 'A shortest turn of 20°', comparison: '20° change' } }, honeyStores: { evidence: 'Stores: 28.5 kg', explanation: 'Income exceeds use.', text: '# Food budget' } },
    };
    const result = BH.bhRecoverBeehiveState(state);
    expect(result.state).toBe(state); expect(result.repairs).toEqual([]);
  });

  it('drops unreadable Queen collection entries while retaining valid structures, threats, and queued brood', () => {
    const intactStructure = structure(), intactThreat = threat(), intactOrder = order();
    const state = { day: 27, honey: 28.5, queen: { day: 4, score: 210, structures: [intactStructure, null, { type: 'honey', x: 'bad', y: 0.5, level: 1 }], threats: [intactThreat, null, { ...threat(), strength: {} }], events: [{ type: 'build', text: 'Valid event' }, null, { text: {} }], productionQueue: [intactOrder, null, { ...order(), amount: {} }] }, notebook: { queen: { explanation: 'Keep the brood protected.' } } };
    const before = structuredClone(state), result = BH.bhRecoverBeehiveState(state);
    expect(result.repairs).toEqual(['queen']);
    expect(result.state.queen.structures).toEqual([intactStructure]);
    expect(result.state.queen.threats).toEqual([intactThreat]);
    expect(result.state.queen.productionQueue).toEqual([intactOrder]);
    expect(result.state.queen.events).toEqual([{ type: 'build', text: 'Valid event' }]);
    expect(result.state.queen.structures[0]).toBe(intactStructure);
    expect(result.state.notebook).toBe(state.notebook);
    expect(result.state).toMatchObject({ day: 27, honey: 28.5, queen: { day: 4, score: 210 } });
    expect(state).toEqual(before);
  });

  it('repairs partial Queen economy maps without erasing valid balances or worker allocations', () => {
    const state = { queen: { resources: { nectar: 8, pollen: {}, wax: 4 }, population: { nurses: 210, guards: 60, foragers: 285, builders: 'bad', scouts: 30, drones: 40 }, pheromones: { qmp: 80, alarm: {}, nasonov: 50, brood: 40 }, rival: { health: 81, strength: 330, pressure: 27, name: {} } } };
    const result = BH.bhRecoverBeehiveState(state);
    expect(result.state.queen.resources).toEqual({ nectar: 8, pollen: 0, wax: 4, royalJelly: 0 });
    expect(result.state.queen.population).toMatchObject({ nurses: 210, guards: 60, foragers: 285, builders: 0 });
    expect(result.state.queen.pheromones).toMatchObject({ qmp: 80, alarm: 0 });
    expect(result.state.queen.rival).toMatchObject({ health: 81, strength: 330, pressure: 27, stores: 0, structures: 0, intel: 0 });
    expect(result.state.queen.rival).not.toHaveProperty('name');
    expect(BH.bhRecoverBeehiveState(result.state).repairs).toEqual([]);
  });

  it('renders an active paused Queen after broken collections and display values are repaired', () => {
    const state = { tutorialDone: true, viewMode: 'queen', queen: { active: true, paused: true, day: 4, structures: {}, threats: 'bad', events: 'bad', productionQueue: {}, buildMode: 'unsupported', feedback: { text: {} }, lastImpact: { kind: 'command', title: 'Scout', summary: {}, changes: [null, { label: 'Pressure', before: 4, after: 6 }] } }, notebook: { queen: { explanation: 'Preserved queen explanation.' } } };
    const result = BH.bhRecoverBeehiveState(state);
    expect(result.state.queen).toMatchObject({ active: true, paused: true, day: 4, structures: [], threats: [], events: [], productionQueue: [], buildMode: null });
    const html = renderTool('beehive', { beehive: state });
    expect(html).toContain('Preserved queen explanation.');
    expect(html).toContain('data-beehive-notebook="queen"');
  });

  it('retains completed flight measurements and readable telemetry while removing damaged samples and scalar objects', () => {
    const sample = telemetry(), maneuver = decision();
    const state = { drone: { highScore: 490, successes: 1, lastRun: { success: true, score: {}, trafficHits: {}, maxAlt: 144, energyLeft: 41, distance: 810, telemetry: [sample, null, { ...telemetry(), t: {} }, { ...telemetry(), action: {}, impact: {} }], decisionLog: [maneuver, null, { ...decision(), seconds: {}, target: {} }] } }, notebook: { drone: { evidence: '144 ft with 41% energy remaining.' } } };
    const result = BH.bhRecoverBeehiveState(state);
    expect(result.repairs).toEqual(['drone']);
    expect(result.state.drone).toMatchObject({ highScore: 490, successes: 1, lastRun: { success: true, maxAlt: 144, energyLeft: 41, distance: 810 } });
    expect(result.state.drone.lastRun).not.toHaveProperty('score');
    expect(result.state.drone.lastRun).not.toHaveProperty('trafficHits');
    expect(result.state.drone.lastRun.telemetry).toHaveLength(2);
    expect(result.state.drone.lastRun.telemetry[0]).toBe(sample);
    expect(result.state.drone.lastRun.telemetry[1]).not.toHaveProperty('action');
    expect(result.state.drone.lastRun.decisionLog).toHaveLength(2);
    expect(result.state.drone.lastRun.decisionLog[0]).toBe(maneuver);
    expect(result.state.drone.lastRun.decisionLog[1]).not.toHaveProperty('seconds');
    expect(result.state.drone.lastRun.decisionLog[1]).not.toHaveProperty('target');
    expect(result.state.notebook).toBe(state.notebook);
  });

  it('normalizes broken saved-flight collections and preserves empty or legacy completed records', () => {
    const result = BH.bhRecoverBeehiveState({ drone: { lastRun: { success: true, telemetry: {}, decisionLog: 'broken' } } });
    expect(result.state.drone.lastRun).toEqual({ success: true, telemetry: [], decisionLog: [] });
    const legacy = { drone: { lastRun: { success: true }, highScore: 100 } };
    expect(BH.bhRecoverBeehiveState(legacy).state).toBe(legacy);
    expect(renderTool('beehive', { beehive: { tutorialDone: true, viewMode: 'drone', ...result.state } })).toContain('data-beehive-notebook="drone"');
  });

  it('preserves valid partial legacy time and altitude telemetry without inventing spatial or energy evidence', () => {
    const sample = { t: 4, altitude: 108 };
    const state = { drone: { lastRun: { telemetry: [sample] } } };
    const result = BH.bhRecoverBeehiveState(state);
    expect(result.state).toBe(state); expect(result.repairs).toEqual([]);
    const repaired = BH.bhRecoverBeehiveState({ drone: { lastRun: { telemetry: [{ ...sample, x: {}, z: 'bad', energy: Infinity, wind: {}, clearance: NaN }] } } });
    expect(repaired.state.drone.lastRun.telemetry).toEqual([sample]);
    expect(repaired.repairs).toEqual(['drone']);
  });

  it('preserves pending event effects and weather metadata while replacing unreadable card text', () => {
    const effect = { honey: -4, morale: -3 };
    const event = { id: 'saved-weather', label: {}, desc: {}, emoji: {}, lesson: {}, effect, weather: true };
    const state = { activeEvent: event, honey: 24, day: 8, notebook: { beekeeper: { explanation: 'Preserved pending-event notes.' } } };
    const result = BH.bhRecoverBeehiveState(state);
    expect(result.repairs).toEqual(['activeEvent']);
    expect(result.state.activeEvent).toMatchObject({ id: 'saved-weather', effect, weather: true, label: 'Recovered colony event' });
    for (const field of ['label', 'desc', 'emoji', 'lesson']) expect(typeof result.state.activeEvent[field]).toBe('string');
    expect(result.state.activeEvent.effect).toBe(effect);
    expect(result.state.notebook).toBe(state.notebook);
    expect(event.label).toEqual({});
    expect(BH.bhRecoverBeehiveState(result.state).state).toBe(result.state);
    for (const inactive of [null, false, 0, '']) {
      const inactiveState = { activeEvent: inactive };
      expect(BH.bhRecoverBeehiveState(inactiveState).state).toBe(inactiveState);
    }
  });

  it('mounts a repaired event card, holds the colony clock, and lets the learner acknowledge it', async () => {
    const config = window.StemLab._registry.beehive;
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const canvasContext = vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const effect = { honey: -4, morale: -3 };
    let latest;
    const initial = { tutorialDone: true, notebookOpen: true, motionPaused: true, day: 8, honey: 24, activeEvent: { id: 'saved-weather', label: {}, desc: {}, emoji: {}, lesson: {}, effect, weather: true }, notebook: { beekeeper: { explanation: 'Preserved pending-event notes.' } } };
    function MountedBee() {
      const [toolData, setToolData] = React.useState({ beehive: initial });
      latest = toolData.beehive;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    try {
      await act(async () => { root.render(React.createElement(MountedBee)); await Promise.resolve(); });
      const eventCard = host.querySelector('#beehive-active-event');
      expect(eventCard).not.toBeNull();
      expect(eventCard.textContent).toContain('Recovered colony event');
      expect(eventCard.textContent).not.toContain('[object Object]');
      expect(host.textContent).toContain('Preserved pending-event notes.');
      expect(latest.activeEvent.effect).toEqual(effect);
      const advance = host.querySelector('#beehive-next-day');
      expect(advance.getAttribute('aria-disabled')).toBe('true');
      await act(async () => { advance.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
      expect(latest.day).toBe(8);
      await act(async () => { eventCard.querySelector('[data-event-acknowledge]').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
      expect(latest.activeEvent).toBeNull();
      expect(latest.day).toBe(8);
      expect(latest.honey).toBe(24);
      expect(latest.weatherEventsHandled).toBe(1);
      expect(host.querySelector('#beehive-active-event')).toBeNull();
      expect(host.querySelector('#beehive-next-day').getAttribute('aria-disabled')).toBeNull();
    } finally {
      await act(async () => { root.unmount(); }); host.remove(); canvasContext.mockRestore();
    }
  });

  it('requires a fresh discovery capture after damaged numeric evidence, preserving the written explanation', () => {
    const record = capture(); record.snapshot = { ...record.snapshot, metrics: [...record.snapshot.metrics, null] };
    const state = { discoveryRecords: { waggle: record }, notebook: { discoveries: { waggle: { explanation: 'Previously reviewed explanation.' } } } };
    const result = BH.bhRecoverBeehiveState(state);
    expect(result.repairs).toEqual(['discoveryRecords']);
    expect(result.state.discoveryRecords.waggle).toMatchObject({ observation: record.observation, note: record.note, saved: false, comparison: null });
    expect(result.state.discoveryRecords.waggle).not.toHaveProperty('snapshot');
    expect(result.state.notebook).toBe(state.notebook);
    expect(record.saved).toBe(true);
    expect(BH.bhDiscoveryEvidenceReadiness(result.state.discoveryRecords.waggle, capture().snapshot).reason).toBe('capture');
  });

  it('clears unreadable comparison rows while retaining the valid initial observation and snapshot', () => {
    const record = capture(); record.comparison = { ...record.comparison, rows: [null] };
    const result = BH.bhRecoverBeehiveState({ discoveryRecords: { waggle: record } });
    expect(result.state.discoveryRecords.waggle.snapshot).toBe(record.snapshot);
    expect(result.state.discoveryRecords.waggle).toMatchObject({ note: record.note, observation: record.observation, saved: false, comparison: null });
  });

  it('rejects a fabricated or mismatched numeric comparison instead of repairing it into claimed evidence', () => {
    const record = capture(); record.comparison = { ...record.comparison, rows: [{ ...record.comparison.rows[0], delta: 999 }] };
    expect(BH.bhRecoverBeehiveState({ discoveryRecords: { waggle: record } }).state.discoveryRecords.waggle.comparison).toBeNull();
    const duplicate = capture(); duplicate.comparison.rows.push({ ...duplicate.comparison.rows[0] });
    expect(BH.bhRecoverBeehiveState({ discoveryRecords: { waggle: duplicate } }).state.discoveryRecords.waggle.saved).toBe(false);
  });

  it('repairs discovery maps and malformed display strings without clearing valid notes', () => {
    const record = capture(); record.observation = {}; record.comparisonNotice = {};
    const result = BH.bhRecoverBeehiveState({ discoveryRecords: { broken: null, waggle: record } });
    expect(result.state.discoveryRecords).not.toHaveProperty('broken');
    expect(result.state.discoveryRecords.waggle).toMatchObject({ note: record.note, saved: false });
    expect(result.state.discoveryRecords.waggle).not.toHaveProperty('observation');
    expect(result.state.discoveryRecords.waggle).not.toHaveProperty('comparisonNotice');
    expect(BH.bhRecoverBeehiveState({ discoveryRecords: [] }).state.discoveryRecords).toEqual({});
  });

  it('renders damaged Honey Stores and reviewed discovery text safely while keeping valid notebook writing', () => {
    const state = { tutorialDone: true, notebookOpen: true, notebook: { synthesis: 'Preserved synthesis.', beekeeper: { prediction: 'Preserved prediction.', evidence: {}, explanation: 'Preserved explanation.' }, honeyStores: { evidence: {}, explanation: {}, text: '# Preserved food-budget report' }, discoveries: { waggle: { prediction: {}, observation: {}, comparison: {}, explanation: 'Preserved reviewed discovery.' } } } };
    const result = BH.bhRecoverBeehiveState(state);
    expect(result.repairs).toEqual(['notebook']);
    expect(result.state.notebook.honeyStores).toEqual({ text: '# Preserved food-budget report' });
    const html = renderTool('beehive', { beehive: state });
    for (const note of ['Preserved synthesis.', 'Preserved prediction.', 'Preserved explanation.', 'Preserved food-budget report', 'Preserved reviewed discovery.']) expect(html).toContain(note);
    expect(html).toContain('data-honey-notebook-record="true"');
    expect(html).not.toContain('[object Object]');
  });

  it('remains self-contained for the shared host loader and idempotent after repairs', () => {
    const source = readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');
    const block = source.slice(source.indexOf('// BEEHIVE_STATE_RECOVERY_START'), source.indexOf('// BEEHIVE_STATE_RECOVERY_END'));
    const recover = new Function(block + '; return bhRecoverBeehiveState;')();
    const once = recover({ queen: { events: [null], structures: {} }, drone: { lastRun: { telemetry: [null] } }, discoveryRecords: { broken: null }, notebook: { honeyStores: { evidence: {} } } });
    const twice = recover(once.state);
    expect(twice.state).toBe(once.state); expect(twice.repairs).toEqual([]);
    expect(once.repairs).toEqual(['notebook', 'queen', 'drone', 'discoveryRecords']);
  });

  it('retains completed evidence while restoring Queen paused and Drone to preflight', () => {
    const run = { success: true, maxAlt: 144, telemetry: [telemetry()], decisionLog: [decision()] };
    const restored = BH.bhBackupBeeState({ queen: { active: true, paused: false, score: 210 }, drone: { active: true, paused: false, highScore: 490, lastRun: run } });
    expect(restored.queen).toMatchObject({ active: true, paused: true, score: 210 });
    expect(restored.drone).not.toHaveProperty('active');
    expect(restored.drone.lastRun).toBe(run);
    const source = readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');
    expect(source).toContain('Active Queen simulations reopen paused. Drone flights return to preflight; completed flight evidence is retained.');
  });
});
