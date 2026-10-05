import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive;
});
const definition = { id: 'food_loss', label: 'Food loss', emoji: '🌧️', desc: 'A storm disturbed the colony.',
  lesson: 'Resource use continues through a storm.', weather: true, effect: { honey: -30, morale: -8 } };
function fixture() {
  const before = { ...BH.bhCreateNewColonyState(0, 3, 0), day: 10, honey: 2, morale: 4 };
  const after = { ...before, day: 11, honey: 0, workers: 9789, morale: 0, varroaLevel: 5.3 };
  const event = BH.bhCaptureColonyEvent(definition, before, after, before);
  return { before, after, event };
}
describe('Colony event evidence integrity', () => {
  it('freezes the whole-day endpoints without changing the event definition, state, AP or random stream', () => {
    const { before, after, event } = fixture(), original = JSON.stringify({ before, after, definition });
    expect(event).not.toBe(definition); expect(event.effect).not.toBe(definition.effect);
    expect(event.observation).toMatchObject({ fromDay: 10, toDay: 11, simulationSeed: 0, runSerial: 3,
      before: { honey: 2, morale: 4 }, after: { honey: 0, morale: 0 } });
    const view = BH.bhColonyEventView(event);
    expect(view.settings.find(item => item.id === 'honey').amount).toBe(-30);
    expect(view.metrics.find(item => item.id === 'honey').delta).toBe(-2);
    expect(view.metrics.find(item => item.id === 'varroaLevel').delta).toBe(0.3);
    expect(JSON.stringify({ before, after, definition })).toBe(original);
    after.honey = 999; before.morale = 80;
    expect(event.observation.after.honey).toBe(0); expect(event.observation.before.morale).toBe(4);
  });
  it('separates daily outcomes from clamped event settings during a real model step', () => {
    const { before } = fixture();
    const config = { params: { ...BH.SIMULATION_PARAMS, randomEventChance: 1 }, subMods: { honey: 1, spring: 1, winter: 1, varroa: 1 },
      siteMods: { forage: 1, disease: 1 }, gardenBonus: 0, hiveEvents: [definition], diseaseEvents: [], rand: () => .5 };
    const result = BH.bhStepColony(before, config), original = JSON.stringify(result);
    const event = BH.bhCaptureColonyEvent(result.event, before, result.next, before);
    expect(event.observation.after.honey).toBe(result.next.honey);
    expect(event.observation.before.honey).toBe(2);
    expect(event.effect.honey).toBe(-30);
    expect(BH.bhColonyEventView(event).metrics.find(metric => metric.id === 'honey').delta).not.toBe(-30);
    expect(JSON.stringify(result)).toBe(original);
  });
  it('does not invent legacy endpoints, dates, provenance, or unknown effect values', () => {
    const legacy = BH.bhColonyEventView(definition);
    expect(legacy.observation).toBeNull(); expect(legacy.metrics.every(metric => metric.delta === null)).toBe(true);
    const { event } = fixture();
    const raw = { ...event.observation, runSerial: 0, simulationSeed: '0', modelVersion: {}, before: { honey: 0, workers: -1, morale: 101 }, after: { honey: 1, workers: '100' } };
    expect(BH.bhEventObservation(raw)).toMatchObject({ runSerial: null, simulationSeed: null, modelVersion: null,
      before: { honey: 0, workers: null, morale: null }, after: { honey: 1, workers: null } });
    for (const observation of [null, { ...raw, schemaVersion: 2 }, { ...raw, fromDay: 1.2 }, { ...raw, toDay: 99 }]) {
      expect(BH.bhEventObservation(observation)).toBeNull();
    }
    const malformed = BH.bhColonyEventView({ label: {}, emoji: [], lesson: {}, effect: { honey: Infinity, morale: '8', workers: 0 } });
    expect(malformed.label).toBe('Colony event'); expect(malformed.settings).toEqual([]);
  });
  it('records relevant non-dashboard effects without ranking incompatible units', () => {
    const { event } = fixture(); event.effect.queenHealth = -40; event.effect.pollen = -3;
    expect(BH.bhColonyEventView(event).metrics.map(metric => metric.id)).toEqual(['workers', 'honey', 'varroaLevel', 'morale', 'pollen', 'queenHealth']);
    const text = BH.bhBuildColonyEventEvidence(event);
    expect(text).toContain('Combined food: 2 lb → 0 lb; change -2 lb');
    expect(text).toContain('Combined food -30 lb');
    expect(text).toContain('do not isolate'); expect(text).toContain('Run 3 | Seed 0');
    expect(text).not.toContain('largest');
    expect(BH.bhBuildColonyEventEvidence(definition)).toContain('Event day not recorded');
  });
  it('acknowledges exactly once, archives the original receipt and preserves model and Notebook state', () => {
    const { after, event } = fixture();
    const state = { ...after, activeEvent: event, autoAdvance: true, notebook: { beekeeper: { evidence: 'Writing.' } } };
    const next = BH.bhAcknowledgeColonyEvent(state, event);
    expect(next).toMatchObject({ activeEvent: null, autoAdvance: false, eventsHandled: 1, weatherEventsHandled: 1 });
    expect(next.eventLog[0]).toBe(event); expect(next.notebook).toBe(state.notebook);
    for (const key of ['day', 'workers', 'honey', 'actionPoints', 'randomState', 'history']) expect(next[key]).toBe(state[key]);
    expect(BH.bhAcknowledgeColonyEvent(next, event)).toBe(next);
    expect(BH.bhAcknowledgeColonyEvent(state, { ...event })).toBe(state);
    expect(state.eventLog).toEqual([]); expect(state.activeEvent).toBe(event);
  });
  it('retains the newest twelve acknowledged events without mutating older input or fabricating legacy snapshots', () => {
    const { after, event } = fixture();
    const log = Array.from({ length: 12 }, (_, index) => ({ label: 'Earlier ' + index }));
    const next = BH.bhAcknowledgeColonyEvent({ ...after, activeEvent: event, eventLog: log }, event);
    expect(log).toHaveLength(12); expect(next.eventLog).toHaveLength(12);
    expect(next.eventLog[0]).toBe(log[1]); expect(next.eventLog.at(-1)).toBe(event);
    expect(BH.bhColonyEventView(next.eventLog[0]).observation).toBeNull();
  });
  it('preserves receipts and future observation schemas through recovery and portable backups', () => {
    const { after, event } = fixture();
    const future = { ...definition, observation: { schemaVersion: 2, futureData: ['preserve'] } };
    const state = { ...after, activeEvent: event, eventLog: [future, event] };
    const recovered = BH.bhRecoverBeehiveState(state).state;
    expect(BH.bhBuildColonyEventEvidence(future)).toContain('unsupported format');
    expect(recovered.eventLog).toEqual(state.eventLog); expect(recovered.activeEvent).toEqual(event);
    const portable = BH.bhBackupBeeState(state);
    expect(portable.eventLog).toEqual(state.eventLog); expect(portable.activeEvent.observation).toEqual(event.observation);
  });
  it('exports bounded evidence without overwriting writing or repeated insertion', () => {
    const { event } = fixture(); const text = BH.bhBuildColonyEventEvidence(event);
    const entry = { evidence: 'My original writing.', review: { evidence: true, prediction: true } };
    const result = BH.bhAppendNotebookEvidence(entry, text);
    expect(result.status).toBe('added'); expect(result.entry.evidence).toBe(entry.evidence + '\n' + text);
    expect(result.entry.review).toEqual({ evidence: false, prediction: true });
    expect(BH.bhAppendNotebookEvidence(result.entry, text).status).toBe('duplicate');
    const full = { evidence: 'x'.repeat(1200) };
    expect(BH.bhAppendNotebookEvidence(full, text)).toMatchObject({ status: 'full', entry: full });
  });
  it('renders frozen readings alongside presets and safely displays partial archived events', () => {
    const { after, event } = fixture();
    const html = renderTool('beehive', { beehive: { ...after, viewMode: 'beekeeper', activeEvent: event, eventLog: [{ label: {} }, event] } });
    expect(html).toContain('data-event-day-delta="honey"'); expect(html).toContain('data-beehive-event-history="true"');
    expect(html).toContain('Recorded day change'); expect(html).toContain('Time paused');
    expect(html).toContain('Day not recorded'); expect(html).toContain('model inputs, not measured changes');
  });
  it('does not display a tiny recorded value as zero', () => {
    const { after, event } = fixture(); event.observation.after.honey = 1e-16;
    const html = renderTool('beehive', { beehive: { ...after, viewMode: 'beekeeper', activeEvent: event } });
    expect(html).toContain('0.0000000000000001 lb');
  });
});
