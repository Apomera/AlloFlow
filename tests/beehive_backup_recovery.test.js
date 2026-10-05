import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});
const envelope = state => JSON.stringify({ kind: 'alloflow-beehive-backup', schemaVersion: 1, state });

describe('Bee recoverable save fields', () => {
  it('leaves healthy state and valid learning records unchanged', () => {
    const state = { day: 9, history: [{ d: 8, h: 21, w: 12000 }], notebook: { drone: { evidence: '31% energy' } } };
    const result = BH.bhRecoverBeehiveState(state);
    expect(result.state).toBe(state); expect(result.repairs).toEqual([]);
  });
  it('recovers damaged collections without resetting valid progress or notes', () => {
    const state = { day: 27, workers: 19000, honey: 28.5, history: {}, journal: 'broken', notebook: { synthesis: 'My evidence', drone: { evidence: '31% energy' }, discoveries: { stores: { explanation: 'Food budget' }, broken: null } } };
    const before = structuredClone(state), result = BH.bhRecoverBeehiveState(state);
    expect(result.state).toMatchObject({ day: 27, workers: 19000, honey: 28.5, history: [], journal: [], notebook: { synthesis: 'My evidence', drone: { evidence: '31% energy' }, discoveries: { stores: { explanation: 'Food budget' } } } });
    expect(result.state.notebook.discoveries).not.toHaveProperty('broken');
    expect(state).toEqual(before);
  });
  it('keeps valid history records while dropping unreadable records', () => {
    const result = BH.bhRecoverBeehiveState({ history: [null, { d: 1, h: 20 }, { day: 2, honey: 21 }, { d: 'three', h: 20 }] });
    expect(result.state.history).toEqual([{ d: 1, h: 20 }, { day: 2, honey: 21, d: 2, h: 21 }]);
    expect(result.repairs).toContain('history');
  });
  it('marks lost management records incomplete rather than certifying a fair trial', () => {
    const result = BH.bhRecoverBeehiveState({ managementTrail: [null, { day: 1, label: 'Feed', choiceId: 'feed_bees' }], managementHistory: { schemaVersion: 1, retainedCount: 2, omittedCount: 0, complete: true } });
    expect(result.state.managementHistory).toMatchObject({ complete: false, omittedCount: null, retainedCount: 1 });
  });
  it('bounds resources and starts a partial tracking segment after a damaged random cursor', () => {
    const result = BH.bhRecoverBeehiveState({ day: 27, honey: 5, syrup: 100, workers: -1, randomState: 'bad' });
    expect(result.state).toMatchObject({ honey: 5, syrup: 5, workers: 0, seededFromDay: 27 });
    expect(result.state).not.toHaveProperty('randomState');
  });
  it('uses the identical recovery contract in the tool and all host copies', () => {
    const paths = ['stem_lab/stem_tool_beehive.js', 'stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab_module.js', 'desktop/web-app/public/stem_lab/stem_lab_module.js'];
    const blocks = paths.map(path => {
      const text = readFileSync(path, 'utf8');
      return text.slice(text.indexOf('// BEEHIVE_STATE_RECOVERY_START'), text.indexOf('// BEEHIVE_STATE_RECOVERY_END')).trim();
    });
    blocks.forEach(block => expect(block).toBe(blocks[0]));
  });
  it('renders a repaired colony without crashing on invalid history or notebook maps', () => {
    const html = renderTool('beehive', { beehive: { tutorialDone: true, day: 10, history: {}, journal: {}, varietals: { broken: null }, notebook: { discoveries: { broken: null }, drone: [] } } });
    expect(html).toContain('data-beehive-backup="true"');
    expect(html).toContain('Download Bee backup');
  });
});

describe('Portable Bee backups', () => {
  it('round-trips food origins, cohort ages, plans, notes, and deterministic cursor', () => {
    const state = { ...BH.bhCreateNewColonyState(5412, 3, 20), day: 12, randomState: 382043, honey: 30, syrup: 10, notebook: { synthesis: 'Keep the garden control fixed', discoveries: { stores: { explanation: 'Income and use' } } } };
    const backup = BH.bhBuildBeeBackup(state, '2026-10-01T08:00:00Z');
    const restored = BH.bhReadBeeBackup(backup).state;
    expect(restored).toMatchObject({ day: 12, simulationSeed: 5412, randomState: 382043, experimentRunSerial: 3, honey: 30, syrup: 10, notebook: state.notebook, broodCohorts: state.broodCohorts, experimentEnvironment: state.experimentEnvironment });
    expect(BH.bhReadBeeBackup(backup).repairs).toEqual([]);
    expect(state.motionPaused).toBeUndefined();
  });
  it('reopens clocks paused and preserves completed Drone and Queen progress', () => {
    const restored = BH.bhReadBeeBackup(BH.bhBuildBeeBackup({ autoAdvance: true, bkAnim: { active: true }, queen: { active: true, paused: false, day: 9, score: 250 }, drone: { active: true, paused: false, replayIndex: 2, highScore: 500, lastRun: { success: true } } })).state;
    expect(restored).not.toHaveProperty('autoAdvance'); expect(restored).not.toHaveProperty('bkAnim');
    expect(restored.queen).toMatchObject({ active: true, paused: true, day: 9, score: 250 });
    expect(restored.drone).toEqual({ highScore: 500, lastRun: { success: true } });
  });
  it('preserves a valid zero seed and random cursor', () => {
    const result = BH.bhReadBeeBackup(BH.bhBuildBeeBackup({ day: 9, simulationSeed: 0, randomState: 0 }));
    expect(result.state).toMatchObject({ day: 9, simulationSeed: 0, randomState: 0 });
    expect(result.repairs).toEqual([]);
  });
  it.each(['bad JSON', '{"schemaVersion":1,"state":{}}', '{"kind":"alloflow-beehive-backup","schemaVersion":99,"state":{}}'])('rejects unsupported input without an importable state: %s', text => {
    const result = BH.bhReadBeeBackup(text); expect(result.error).toBeTruthy(); expect(result.state).toBeUndefined();
  });
  it('prevents prototype keys from reaching restored state', () => {
    const result = BH.bhReadBeeBackup('{"kind":"alloflow-beehive-backup","schemaVersion":1,"state":{"day":2,"__proto__":{"polluted":true},"notebook":{"constructor":{"polluted":true},"synthesis":"Evidence"}}}');
    expect(Object.prototype.polluted).toBeUndefined(); expect(result.state).not.toHaveProperty('__proto__');
    expect(result.state.notebook).toEqual({ synthesis: 'Evidence' });
  });
  it('rejects oversized backup text', () => expect(BH.bhReadBeeBackup(' '.repeat(2097153)).error).toContain('2 MB'));
  it('reports excluded archive records before restore', () => {
    const result = BH.bhReadBeeBackup(envelope({ day: 10, notebook: { synthesis: 'Keep my note' }, experimentArchive: { schemaVersion: 1, records: [{ broken: true }] } }));
    expect(result.archiveExcluded).toBe(1); expect(result.repairs).toContain('experimentArchive');
    expect(result.state.notebook.synthesis).toBe('Keep my note'); expect(result.state.experimentArchive.records).toEqual([]);
  });
});
