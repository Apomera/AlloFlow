import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});
const reading = (capture, id) => capture.readings.find(item => item.id === id)?.value;
const match = (patch = {}) => ({
  active: true, paused: true, day: 0, phase: 'build', result: null,
  difficulty: 'standard', opening: 'balanced', scenario: 'field_report',
  hiveHealth: 96.26, territory: 50, pheromones: { qmp: 100 },
  rival: { name: 'Meadow colony', health: 100, pressure: 0 },
  carryover: { source: 'beekeeper', readiness: 'prepared', label: 'Prepared field report' },
  ...patch
});
const capture = (patch = {}) => BH.bhQueenNotebookCapture(match(patch));

describe('Colony Network evidence across save recovery', () => {
  it('preserves unknown completed readings before supplying safe simulation defaults', () => {
    const raw = { queen: { active: true, result: 'victory', rival: { name: 'Saved rival' }, pheromones: {} } };
    const before = structuredClone(raw), recovered = BH.bhRecoverBeehiveState(raw);
    expect(recovered.state.queen.rival.health).toBe(100);
    expect(recovered.state.queen.pheromones.qmp).toBe(0);
    const evidence = BH.bhQueenNotebookCapture(recovered.state.queen);
    expect(evidence.source).toBe('saved');
    expect(evidence.readings.filter(item => item.id !== 'result').every(item => item.value === 'Not recorded')).toBe(true);
    expect(reading(evidence, 'result')).toBe('Victory');
    expect(evidence.context).toContain('Rival Saved rival');
    expect(raw).toEqual(before);
    const again = BH.bhRecoverBeehiveState(recovered.state);
    expect(again.state).toBe(recovered.state); expect(again.repairs).toEqual([]);
    expect(BH.bhQueenNotebookCapture(again.state.queen)).toEqual(evidence);
  });

  it.each(['legacy outcome', true, { unknown: true }])('keeps an unrecognized stopped result as saved evidence without restarting the match (%j)', (result) => {
    const recovered = BH.bhRecoverBeehiveState({ queen: { active: true, paused: false, result, rival: {}, pheromones: {} } });
    expect(recovered.state.queen).toMatchObject({ result: null, active: false, paused: false });
    const evidence = BH.bhQueenNotebookCapture(recovered.state.queen);
    expect(evidence).toMatchObject({ source: 'saved', state: 'saved' });
    expect(evidence.readings.every(item => item.value === 'Not recorded')).toBe(true);
    expect(BH.bhRecoverBeehiveState(recovered.state).state).toBe(recovered.state);
  });

  it('keeps genuine zero readings and saved conditions through repairs, setup changes and backup round trips', () => {
    const original = match({ result: 'defeat', day: 0, hiveHealth: 0, territory: 0, pheromones: { qmp: 0 }, rival: { name: 'Zero rival', health: 0, pressure: 0 } });
    const evidence = BH.bhQueenNotebookCapture(original);
    const repaired = BH.bhRecoverBeehiveState({ queen: original }).state;
    const selected = BH.bhQueenSetupSelection(repaired.queen, { difficulty: 'expert', opening: 'forage', scenario: 'rival_surge' });
    expect(BH.bhQueenNotebookCapture(selected)).toEqual(evidence);
    const restored = BH.bhReadBeeBackup(BH.bhBuildBeeBackup({ ...repaired, queen: selected }));
    expect(restored.error).toBeUndefined();
    expect(BH.bhQueenNotebookCapture(restored.state.queen)).toEqual(evidence);
    const fresh = match({ difficulty: 'expert', opening: 'forage', scenario: 'rival_surge' });
    expect(BH.bhQueenNotebookCapture(fresh)).toMatchObject({ source: 'current' });
    expect(BH.bhQueenNotebookCapture(fresh).context).toContain('Difficulty Expert');
  });

  it('copies only bounded evidence fields without retaining unrelated state or mutable nested records', () => {
    const original = match({ result: 'victory', notebookMatchConditions: { difficulty: 'guided' }, career: { wins: 50 }, threats: [{ hp: 5 }], custom: { note: 'Keep this outside the snapshot.' } });
    const saved = BH.bhQueenNotebookRecord(original);
    expect(saved.rival).not.toBe(original.rival);
    expect(saved.pheromones).not.toBe(original.pheromones);
    expect(saved.notebookMatchConditions).toEqual({ difficulty: 'guided', opening: null, scenario: null });
    expect(saved).not.toHaveProperty('career'); expect(saved).not.toHaveProperty('threats'); expect(saved).not.toHaveProperty('custom');
    original.rival.health = 7;
    expect(saved.rival.health).toBe(100);
  });

  it.each(['stem_lab/stem_tool_beehive.js', 'stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab/stem_tool_beehive.js', 'desktop/web-app/public/stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab_module.js'])('preserves completed evidence with the standalone recovery block in %s', (file) => {
    const source = readFileSync(file, 'utf8');
    const block = source.slice(source.indexOf('// BEEHIVE_STATE_RECOVERY_START'), source.indexOf('// BEEHIVE_STATE_RECOVERY_END'));
    const recover = new Function(block + '; return bhRecoverBeehiveState;')();
    const restored = recover({ queen: { active: true, result: 'victory', rival: {}, pheromones: {} } });
    expect(restored.state.queen.notebookMatchEvidence).toMatchObject({ result: 'victory', rival: { health: null, pressure: null }, pheromones: { qmp: null } });
    expect(recover(restored.state).state).toBe(restored.state);
  });
});

describe('Colony Network Notebook capture source and units', () => {
  it.each([undefined, null, [], {}, { active: false }, { active: 'true' }, { active: false, result: null, day: 9, hiveHealth: 100, territory: 50, pheromones: { qmp: 100 }, rival: { health: 100, pressure: 0 } }])('does not capture setup or inactive abandoned-match readings (%j)', (input) => {
    const result = BH.bhQueenNotebookCapture(input);
    expect(result).toMatchObject({ available: false, source: 'setup', state: 'setup', readings: [], text: '' });
    expect(result.context).toContain('Start a Colony Network match');
  });

  it('captures an actually started cycle zero while keeping advantage separate from percentages', () => {
    const result = capture();
    expect(result).toMatchObject({ available: true, source: 'current', state: 'paused' });
    expect(result.title).toBe('Paused readings from this match');
    expect(result.context).toBe('Current match · Paused · Cycle 0 · Phase Build · Difficulty Standard · Opening Balanced brood · Scenario Field report · Rival Meadow colony · Starting field report Prepared field report');
    expect(reading(result, 'brood-core')).toBe('96.3%');
    expect(reading(result, 'advantage')).toBe('50 / 100');
    expect(reading(result, 'qmp')).toBe('100%');
    expect(reading(result, 'rival-core')).toBe('100%');
    expect(reading(result, 'pressure')).toBe('0%');
    expect(reading(result, 'result')).toBeUndefined();
    expect(result.text).toContain('RTS advantage: 50 / 100');
    expect(result.text).not.toContain('Territory');
    expect(result.text.length).toBeLessThan(1000);
  });

  it.each([false, undefined, null, 'true'])('treats only a recorded boolean pause as paused (%s)', (paused) => {
    expect(capture({ paused })).toMatchObject({ source: 'current', state: 'live', title: 'Live readings from this match' });
  });

  it.each([
    ['guided', 'fortify', 'mite_crisis', 'build', 'Guided', 'Brood fortress', 'Mite crisis', 'Build'],
    ['standard', 'balanced', 'field_report', 'defend', 'Standard', 'Balanced brood', 'Field report', 'Defend'],
    ['expert', 'forage', 'rival_surge', 'swarm', 'Expert', 'Range expansion', 'Rival surge', 'swarm']
  ])('uses the learner labels for recorded settings (%s, %s, %s, %s)', (difficulty, opening, scenario, phase, difficultyLabel, openingLabel, scenarioLabel, phaseLabel) => {
    const result = capture({ difficulty, opening, scenario, phase });
    expect(result.context).toContain('Phase ' + phaseLabel + ' · Difficulty ' + difficultyLabel + ' · Opening ' + openingLabel + ' · Scenario ' + scenarioLabel);
  });

  it.each([['victory', 'Victory'], ['defeat', 'Defeat']])('prioritizes the stored %s result over active and paused flags', (result, expected) => {
    const record = capture({ result, active: true, paused: true, day: 12, hiveHealth: 0, territory: 0, pheromones: { qmp: 0 }, rival: { name: 'Recorded rival', health: 0, pressure: 0 } });
    expect(record).toMatchObject({ available: true, source: 'saved', state: 'saved' });
    expect(record.context).toContain('Recorded match result · Cycle 12');
    expect(record.context).not.toMatch(/Current|Paused|Live/);
    expect(reading(record, 'result')).toBe(expected);
    expect(reading(record, 'brood-core')).toBe('0%');
    expect(reading(record, 'advantage')).toBe('0 / 100');
    expect(reading(record, 'qmp')).toBe('0%');
    expect(reading(record, 'rival-core')).toBe('0%');
    expect(reading(record, 'pressure')).toBe('0%');
  });

  it('keeps a partial completed result without supplying setup readings or settings', () => {
    const result = BH.bhQueenNotebookCapture({ result: 'victory', active: false, career: { matches: 14, wins: 8, bestScore: 777 } });
    expect(result).toMatchObject({ available: true, source: 'saved', state: 'saved' });
    expect(result.readings.filter(item => item.id !== 'result').every(item => item.value === 'Not recorded')).toBe(true);
    expect(reading(result, 'result')).toBe('Victory');
    expect(result.context).toBe('Recorded match result · Cycle Not recorded · Phase Not recorded · Difficulty Not recorded · Opening Not recorded · Scenario Not recorded · Rival Not recorded');
    expect(result.text).not.toMatch(/100%|50 \/ 100|standard|balanced|field_report|777|Prepared/);
  });

  it.each([undefined, null, '0', NaN, Infinity, -Infinity])('does not coerce missing or invalid numeric readings into evidence (%s)', (value) => {
    const result = capture({ day: value, hiveHealth: value, territory: value, pheromones: { qmp: value }, rival: { health: value, pressure: value } });
    expect(result.available).toBe(true);
    expect(result.readings.every(item => item.value === 'Not recorded')).toBe(true);
    expect(result.context).toContain('Cycle Not recorded');
  });

  it.each([undefined, null, [], 'missing', 0])('does not default missing or malformed nested records (%j)', (value) => {
    const result = capture({ rival: value, pheromones: value, carryover: value });
    expect(reading(result, 'qmp')).toBe('Not recorded');
    expect(reading(result, 'rival-core')).toBe('Not recorded');
    expect(reading(result, 'pressure')).toBe('Not recorded');
    expect(result.context).toContain('Rival Not recorded');
    expect(result.context).not.toContain('Starting field report');
  });

  it.each(['draw', 'VICTORY', true, {}, []])('does not classify unfamiliar stopped outcomes as a victory or defeat (%j)', (outcome) => {
    const result = capture({ result: outcome, active: true, paused: false, hiveHealth: 100, rival: { health: 0 } });
    expect(result).toMatchObject({ source: 'saved', state: 'saved' });
    expect(reading(result, 'result')).toBe('Not recorded');
    expect(result.text).not.toMatch(/Victory|Defeat|\[object Object\]/);
  });

  it.each([undefined, null, false, '', 0])('does not infer an outcome from depleted health or career totals (%j)', (result) => {
    const current = capture({ result, hiveHealth: 0, rival: { health: 0 }, career: { wins: 999 } });
    expect(current).toMatchObject({ source: 'current', state: 'paused' });
    expect(reading(current, 'result')).toBeUndefined();
    expect(current.text).not.toMatch(/Victory|Defeat|999/);
  });

  it('uses only the conditions in this record, preserving unknown identifiers as recorded text', () => {
    const result = capture({ result: 'defeat', day: 0, phase: 'legacy phase', difficulty: 'old pressure', opening: 'previous opening', scenario: 'archived scenario', rival: { name: 'Past rival', health: 42, pressure: 3 }, carryover: { label: 'Prior opening report', readiness: 'stressed' }, career: { difficulty: 'different difficulty', opening: 'different opening' } });
    expect(result.context).toContain('Cycle 0 · Phase legacy phase · Difficulty old pressure · Opening previous opening · Scenario archived scenario · Rival Past rival · Starting field report Prior opening report');
    expect(result.text).not.toContain('different');
    expect(result.text).not.toContain('stressed');
  });

  it('does not stringify malformed condition values or invent a starting field report', () => {
    const result = capture({ phase: {}, difficulty: 0, opening: false, scenario: '  ', rival: { name: null }, carryover: { label: '', readiness: 'prepared' } });
    expect(result.context).toContain('Phase Not recorded · Difficulty Not recorded · Opening Not recorded · Scenario Not recorded · Rival Not recorded');
    expect(result.text).not.toMatch(/\[object Object\]|false|Starting field report|Prepared/);
  });

  it('preserves completed conditions through a chain of next-match setup choices', () => {
    const prior = Object.freeze(match({ result: 'victory', active: false, difficulty: 'easy', opening: 'fortify', scenario: 'mite_crisis' }));
    const difficulty = BH.bhQueenSetupSelection(prior, { difficulty: 'hard' });
    const opening = BH.bhQueenSetupSelection(difficulty, { opening: 'forage' });
    const scenario = BH.bhQueenSetupSelection(opening, { scenario: 'rival_surge' });
    expect(scenario).toMatchObject({ difficulty: 'hard', opening: 'forage', scenario: 'rival_surge', result: 'victory' });
    expect(scenario.notebookMatchConditions).toEqual({ difficulty: 'easy', opening: 'fortify', scenario: 'mite_crisis' });
    expect(opening.notebookMatchConditions).toBe(difficulty.notebookMatchConditions);
    expect(scenario.notebookMatchConditions).toBe(difficulty.notebookMatchConditions);
    expect(scenario.rival).toBe(prior.rival);
    expect(scenario.pheromones).toBe(prior.pheromones);
    expect(prior).not.toHaveProperty('notebookMatchConditions');
    expect(prior.difficulty).toBe('easy');
    const saved = BH.bhQueenNotebookCapture(scenario);
    expect(saved.context).toContain('Difficulty easy · Opening Brood fortress · Scenario Mite crisis');
    expect(saved.context).not.toMatch(/hard|forage|rival_surge/);
    expect(reading(saved, 'result')).toBe('Victory');
  });

  it.each([undefined, null, 0, false, '', NaN])('keeps unknown original conditions unknown after setup selections (%j)', (value) => {
    const original = match({ result: 'defeat', active: false, difficulty: value, opening: value, scenario: value });
    const selected = BH.bhQueenSetupSelection(original, { difficulty: 'standard', opening: 'balanced', scenario: 'field_report' });
    expect(selected.notebookMatchConditions).toEqual({ difficulty: value, opening: value, scenario: value });
    const saved = BH.bhQueenNotebookCapture(selected);
    expect(saved.context).toContain('Difficulty Not recorded · Opening Not recorded · Scenario Not recorded');
    expect(saved.context).not.toMatch(/standard|balanced|field_report/);
  });

  it('does not backfill a partial frozen condition record from next-match settings', () => {
    const stored = Object.freeze({ difficulty: 'legacy pressure', opening: null });
    const original = Object.freeze(match({ result: 'draw', notebookMatchConditions: stored }));
    const selected = BH.bhQueenSetupSelection(original, { difficulty: 'hard', opening: 'forage', scenario: 'rival_surge' });
    expect(selected.notebookMatchConditions).toBe(stored);
    const saved = BH.bhQueenNotebookCapture(selected);
    expect(saved).toMatchObject({ source: 'saved', state: 'saved' });
    expect(saved.context).toContain('Difficulty legacy pressure · Opening Not recorded · Scenario Not recorded');
    expect(reading(saved, 'result')).toBe('Not recorded');
  });

  it.each([null, [], false, 'old metadata'])('falls back to raw conditions for malformed legacy metadata, then preserves them before a selection (%j)', (metadata) => {
    const original = match({ result: 'victory', notebookMatchConditions: metadata });
    expect(BH.bhQueenNotebookCapture(original).context).toContain('Difficulty Standard · Opening Balanced brood · Scenario Field report');
    const selected = BH.bhQueenSetupSelection(original, { scenario: 'rival_surge' });
    expect(selected.notebookMatchConditions).toEqual({ difficulty: 'standard', opening: 'balanced', scenario: 'field_report' });
    expect(BH.bhQueenNotebookCapture(selected).context).toContain('Scenario Field report');
  });

  it('treats an empty frozen condition record as unknown, not as permission to use new setup settings', () => {
    const stored = Object.freeze({});
    const selected = BH.bhQueenSetupSelection(match({ result: 'victory', notebookMatchConditions: stored }), { difficulty: 'hard' });
    expect(selected.notebookMatchConditions).toBe(stored);
    expect(BH.bhQueenNotebookCapture(selected).context).toContain('Difficulty Not recorded · Opening Not recorded · Scenario Not recorded');
  });

  it('keeps setup choices and a freshly started replacement match separate from previous conditions', () => {
    const setup = BH.bhQueenSetupSelection({ active: false }, { difficulty: 'hard', opening: 'forage', scenario: 'rival_surge', result: 'victory', hiveHealth: 99 });
    expect(setup).toEqual({ active: false, difficulty: 'hard', opening: 'forage', scenario: 'rival_surge' });
    expect(BH.bhQueenNotebookCapture(setup).available).toBe(false);
    const started = match({ difficulty: setup.difficulty, opening: setup.opening, scenario: setup.scenario });
    expect(started).not.toHaveProperty('notebookMatchConditions');
    const current = BH.bhQueenNotebookCapture(started);
    expect(current).toMatchObject({ source: 'current', state: 'paused' });
    expect(current.context).toContain('Difficulty hard · Opening Range expansion · Scenario Rival surge');
    const completed = BH.bhQueenNotebookCapture({ ...started, result: 'defeat' });
    expect(completed.context).toContain('Difficulty hard · Opening Range expansion · Scenario Rival surge');
    expect(reading(completed, 'result')).toBe('Defeat');
  });

  it('uses current match conditions when an unrelated old saved-conditions field is present without a result', () => {
    const current = capture({ result: null, notebookMatchConditions: { difficulty: 'old pressure', opening: 'old opening', scenario: 'old scenario' } });
    expect(current.context).toContain('Difficulty Standard · Opening Balanced brood · Scenario Field report');
    expect(current.context).not.toContain('old');
  });

  it('accepts missing inputs without mutating or copying unrecognized selection fields', () => {
    expect(BH.bhQueenSetupSelection(undefined, { difficulty: 'standard', active: true })).toEqual({ difficulty: 'standard' });
    const original = Object.freeze(match({ result: 'defeat' }));
    const selection = Object.freeze({ scenario: 'mite_crisis' });
    const first = BH.bhQueenSetupSelection(original, selection);
    expect(first).toEqual(BH.bhQueenSetupSelection(original, selection));
    expect(first).not.toBe(original);
    expect(original.scenario).toBe('field_report');
    expect(selection).toEqual({ scenario: 'mite_crisis' });
  });

  it('provides the exact displayed reading text deterministically without mutating the match', () => {
    const input = Object.freeze(match({ result: 'defeat', rival: Object.freeze({ name: 'Rival', health: 21.15, pressure: 0 }), pheromones: Object.freeze({ qmp: 0 }), carryover: Object.freeze({ label: 'Watch-list field report' }) }));
    const before = JSON.stringify(input);
    const first = BH.bhQueenNotebookCapture(input);
    expect(first).toEqual(BH.bhQueenNotebookCapture(input));
    expect(JSON.stringify(input)).toBe(before);
    expect(first.text).toBe(first.title + ' | ' + first.context + ' | ' + first.readings.map(item => item.label + ': ' + item.value).join(' | '));
    expect(first.guide).toContain('not the percentage of land or flowers owned');
    expect(first.guide).toContain('not field measurements');
    expect(first.guide).toContain('does not establish a cause');
    expect(first.text).not.toMatch(/capturedAt|timestamp/);
  });
});
