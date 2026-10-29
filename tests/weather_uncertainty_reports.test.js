import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

function exploration(patch = {}, scale = 1) {
  return kernel.ensembleForecast(kernel.resolvedState({ scenario: 'coldFront', simHour: 3, ...patch }), { spreadScale: scale });
}

function parseCsv(input) {
  const rows = [];
  let quoted = false, cell = '', row = [];
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i += 1; } else quoted = !quoted;
    } else if (!quoted && ch === ',') { row.push(cell); cell = ''; }
    else if (!quoted && (ch === '\r' || ch === '\n')) {
      if (ch === '\r' && input[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (row.length || cell) { row.push(cell); rows.push(row); }
  return rows;
}

describe('Weather uncertainty exploration reports', () => {
  it('reports the original scenario, full starting setup, scale and actual issue/target window', () => {
    const result = exploration({ temp: 26, windDir: 180 }, 1.5);
    const report = kernel.uncertaintyExplorationText(result, 'A larger spread tests our assumptions.');
    expect(report).toContain('Approaching Cold Front (scenario ID: coldFront)');
    expect(report).toContain('Issue hour: T+3 h. Target hour: T+9 h. Timing window ends: T+15 h.');
    expect(report).toContain('Starting-condition spread scale: 1.5×');
    expect(report).toContain('Starting temperature: 26°C');
    expect(report).toContain('Starting wind from direction: 180°');
    expect(report).toContain('A larger spread tests our assumptions.');
    expect(report).toContain('Member 5 (unperturbed control)');
    expect((report.match(/^Member \d/gm) || []).length).toBe(9);
  });

  it('uses supplied member snapshots instead of recalculating outcomes from their inputs', () => {
    const result = exploration();
    result.members[0].temperature = 77.7;
    result.members[0].inputDeltas.temp = -1.234;
    result.modelState.temp = 33;
    const before = JSON.stringify(result);
    const report = kernel.uncertaintyExplorationText(result, 'Saved snapshot');
    expect(report).toContain('Temperature 77.7°C');
    expect(report).toContain('actual change from control: -1.234°C');
    expect(report).toContain('Starting temperature: 33°C');
    expect(JSON.stringify(result)).toBe(before);
    const csv = parseCsv(kernel.uncertaintyExplorationCsv(result));
    expect(csv[1][csv[0].indexOf('Target Temperature (°C)')]).toBe('77.7');
  });

  it('labels tied precipitation and hazard modes without presenting one as a unique winner', () => {
    const result = exploration();
    result.tiedPrecip = ['rain', 'snow'];
    result.tiedHazards = ['none', 'ice'];
    const report = kernel.uncertaintyExplorationText(result);
    expect(report).toContain('Most common precipitation outcome: tie between Rain / Snow.');
    expect(report).toContain('Most common illustrative hazard flag: tie between No hazard flag / Ice.');
  });

  it('can recover recorded modal ties from saved counts while ignoring zero-count categories', () => {
    const result = exploration();
    delete result.tiedPrecip;
    result.counts = { none: 0, rain: 4, snow: 4, mixed: 1, storms: 0 };
    const report = kernel.uncertaintyExplorationText(result);
    expect(report).toContain('tie between Rain / Snow');
    result.counts = {};
    expect(kernel.uncertaintyExplorationText(result)).toContain('Most common precipitation outcome: not recorded.');
  });

  it('states that identical members and min/max spread are not independent evidence or probability', () => {
    const report = kernel.uncertaintyExplorationText(exploration({}, 0));
    expect(report).toContain('Recorded members: 9. Distinct starting setups: 1.');
    expect(report).toContain('not independently sampled weather forecasts');
    expect(report).toContain('not confidence intervals');
    expect(report).toContain('not real-world probabilities or evidence of statistical calibration');
    expect(report).toContain('not a probability of rain');
  });

  it('honestly labels truncated and exhausted model windows', () => {
    const late = kernel.uncertaintyExplorationText(exploration({ simHour: 23 }));
    expect(late).toContain('Issue hour: T+23 h. Target hour: T+24 h.');
    expect(late).toContain('shortened by the model limit at T+24 h');
    const finished = exploration({ simHour: 24 });
    expect(kernel.uncertaintyExplorationText(finished)).toContain('No future model hour remains');
    const csv = parseCsv(kernel.uncertaintyExplorationCsv(finished));
    expect(csv.slice(1).every((row) => row[csv[0].indexOf('Future forecast available')] === 'no')).toBe(true);
  });

  it('retains the complete1500-character learner note and bounds any extra prose', () => {
    const note = 'n'.repeat(1500 - 'DISTINCT-END-MARKER'.length) + 'DISTINCT-END-MARKER';
    expect(note).toHaveLength(1500);
    const report = kernel.uncertaintyExplorationText(exploration(), note + 'SHOULD-NOT-APPEAR');
    expect(report).toContain(note);
    expect(report).not.toContain('SHOULD-NOT-APPEAR');
  });

  it('exports all9 members with numeric inputs, actual input changes, target outputs and units', () => {
    const result = exploration({}, 2);
    const rows = parseCsv(kernel.uncertaintyExplorationCsv(result));
    const headings = rows[0];
    expect(rows).toHaveLength(10);
    expect(rows.every((row) => row.length === headings.length)).toBe(true);
    expect(headings.filter((title) => title.startsWith('Actual change:'))).toHaveLength(8);
    expect(headings).toContain('Target Precipitation potential (model index 0–100)');
    const first = rows[1];
    expect(first[headings.indexOf('Starting temperature (°C)')]).toBe(String(result.members[0].modelState.temp));
    expect(first[headings.indexOf('Actual change: Starting temperature (°C)')]).toBe(String(result.members[0].inputDeltas.temp));
    expect(first[headings.indexOf('Starting-condition spread scale')]).toBe('2');
    expect(first[headings.indexOf('Issue model hour')]).toBe('3');
    expect(rows[5][headings.indexOf('Unperturbed control')]).toBe('yes');
  });

  it('escapes CSV text with quotes/newlines and guards spreadsheet formulas without changing negative numbers', () => {
    const result = exploration();
    result.scenarioName = ' =SUM("one",\n"two")';
    result.contextKey = '@IMPORTDATA("source")';
    result.members[0].temperature = -4.5;
    const rows = parseCsv(kernel.uncertaintyExplorationCsv(result));
    const headings = rows[0];
    expect(rows[1][headings.indexOf('Scenario')]).toBe("'" + result.scenarioName);
    expect(rows[1][headings.indexOf('Starting setup fingerprint')]).toBe("'" + result.contextKey);
    expect(rows[1][headings.indexOf('Target Temperature (°C)')]).toBe('-4.5');
    expect(rows).toHaveLength(10);
  });

  it('preserves unknown values as absent instead of fabricating zeros or a scenario', () => {
    const result = { members: [{ id: 1, modelState: { temp: null }, inputDeltas: { temp: false }, temperature: null }], modelState: {}, window: {}, counts: {} };
    const report = kernel.uncertaintyExplorationText(result);
    expect(report).toContain('Scenario: not recorded (scenario ID: not recorded)');
    expect(report).toContain('Starting temperature: not recorded');
    expect(report).not.toMatch(/NaN|undefined|Temperature 0°C|Starting temperature: 0°C/);
    const rows = parseCsv(kernel.uncertaintyExplorationCsv(result));
    expect(rows[1][rows[0].indexOf('Target Temperature (°C)')]).toBe('');
    expect(rows[1][rows[0].indexOf('Actual change: Starting temperature (°C)')]).toBe('');
    expect(parseCsv(kernel.uncertaintyExplorationCsv(null))).toHaveLength(1);
    expect(kernel.uncertaintyExplorationText(null)).toContain('No member snapshots recorded');
  });

  it('does not serialize inherited object properties as weather outcome labels', () => {
    const result = exploration();
    result.members[0].precip = 'toString';
    result.members[0].hazard = 'constructor';
    result.members[0].timing = '__proto__';
    const rows = parseCsv(kernel.uncertaintyExplorationCsv(result));
    expect(rows[1][rows[0].indexOf('Target precipitation')]).toBe('');
    expect(rows[1][rows[0].findIndex((title) => title.startsWith('Illustrative hazard flag'))]).toBe('');
    expect(rows[1][rows[0].findIndex((title) => title.startsWith('First precipitation timing'))]).toBe('');
  });

  it('includes saved hourly ranges while bounding oversized member/time arrays', () => {
    const result = exploration();
    result.members = Array.from({ length: 20 }, (_, index) => ({ ...result.members[0], id: index + 1 }));
    result.timeline = Array.from({ length: 40 }, (_, hour) => ({ hour, temperatureRange: [10, 20], pressureRange: [1000, 1010], precipPotentialRange: [25, 75] }));
    const report = kernel.uncertaintyExplorationText(result);
    expect((report.match(/^Member \d/gm) || []).length).toBe(9);
    expect(report).toContain('T+24 h: temperature 10°C to 20°C');
    expect(report).not.toContain('T+25 h: temperature');
    expect(parseCsv(kernel.uncertaintyExplorationCsv(result))).toHaveLength(10);
  });

  it('roundtrips exploration controls and context-bound notes without saving generated ensemble outputs', () => {
    const result = exploration();
    const source = { scenario: 'coldFront', ensembleScale: 1.5, ensembleMetric: 'pressure', ensembleMember: 8, ensembleReviewHour: 12, ensembleNote: 'Check the member inputs.', ensembleNoteContext: result.contextKey, ensembleResult: result, ensembleStatus: 'ready' };
    const payload = kernel.immersiveLocalWorkspacePayload(source);
    const restored = kernel.validateImmersiveLocalWorkspacePayload(JSON.parse(JSON.stringify(payload)));
    expect(restored).toMatchObject({ ensembleScale: 1.5, ensembleMetric: 'pressure', ensembleMember: 8, ensembleReviewHour: 12, ensembleNote: source.ensembleNote, ensembleNoteContext: result.contextKey });
    expect(restored.ensembleResult).toBeUndefined();
    expect(restored.ensembleStatus).toBeUndefined();
  });

  it('bounds imported exploration preferences and rejects nonnumeric values and unknown metrics', () => {
    const saved = kernel.immersiveSessionSharePayload({ ensembleScale: 7, ensembleMember: 8.7, ensembleReviewHour: -5, ensembleMetric: 'script', ensembleNote: '\u0000' + 'x'.repeat(1600), ensembleNoteContext: 'k'.repeat(1100) }).weatherSystems;
    expect(saved).toMatchObject({ ensembleScale: 2, ensembleMember: 9, ensembleReviewHour: 0 });
    expect(saved.ensembleMetric).toBeUndefined();
    expect(saved.ensembleNote).toHaveLength(1500);
    expect(saved.ensembleNoteContext).toHaveLength(1000);
    const invalid = kernel.immersiveSessionSharePayload({ ensembleScale: false, ensembleMember: null, ensembleReviewHour: ' ', ensembleMetric: [] }).weatherSystems;
    expect(invalid.ensembleScale).toBeUndefined();
    expect(invalid.ensembleMember).toBeUndefined();
    expect(invalid.ensembleReviewHour).toBeUndefined();
  });

  it('keeps compact forecast evidence below4000 characters with full1500-character learner prose', () => {
    const result = exploration({ temp: 27, windDir: 270 }, 1.5);
    const note = 'n'.repeat(1500 - 'FULL-NOTE-END'.length) + 'FULL-NOTE-END';
    const evidence = kernel.uncertaintyEvidenceText(result, note);
    expect(evidence.length).toBeLessThan(4000);
    expect(evidence).toContain(note);
    expect(evidence).toContain('Approaching Cold Front (scenario ID: coldFront)');
    expect(evidence).toContain('Issue T+3 h; precipitation target T+9 h; timing window ends T+15 h');
    expect(evidence).toContain('spread scale 1.5×');
    for (const input of ['temperature 27°C', 'relative humidity 72%', 'sea-level pressure 1008 hPa', 'wind speed 24 km/h', 'wind from direction 270°', 'front speed 36 km/h', 'instability index 68', 'terrain lift 25']) {
      expect(evidence).toContain(input);
    }
    expect(evidence).not.toContain('Member 1');
  });

  it('includes exact outcome counts, modal ties, min/max ranges and limitations in compact evidence', () => {
    const result = exploration();
    result.counts = { none: 1, rain: 4, snow: 4, mixed: 0, storms: 0 };
    result.tiedPrecip = ['rain', 'snow'];
    const evidence = kernel.uncertaintyEvidenceText(result);
    expect(evidence).toContain('No precipitation 1/9; Rain 4/9; Snow 4/9; Wintry mix 0/9; Thunderstorms 0/9');
    expect(evidence).toContain('tie between Rain / Snow');
    expect(evidence).toContain(`temperature ${result.temperatureRange[0]}°C to ${result.temperatureRange[1]}°C`);
    expect(evidence).toContain('not real-world probabilities');
    expect(evidence).toContain('not confidence intervals');
    expect(evidence).toContain('does not change the standard-spread confidence comparison');
  });

  it('keeps scale-zero duplicate and late-window limitations in compact evidence', () => {
    expect(kernel.uncertaintyEvidenceText(exploration({}, 0))).toContain('9 recorded members; 1 distinct starting setups');
    expect(kernel.uncertaintyEvidenceText(exploration({ simHour: 23 }))).toContain('shortened by the T+24 h model limit');
    expect(kernel.uncertaintyEvidenceText(exploration({ simHour: 24 }))).toContain('No future model hour remains');
  });

  it('uses saved snapshots immutably and preserves missing compact-evidence provenance', () => {
    const result = exploration();
    const before = JSON.stringify(result);
    kernel.uncertaintyEvidenceText(result, 'Explain the spread.');
    expect(JSON.stringify(result)).toBe(before);
    const missing = kernel.uncertaintyEvidenceText({ members: [], counts: { rain: 0 } });
    expect(missing).toContain('Scenario not recorded');
    expect(missing).toContain('Rain not recorded');
    expect(missing).not.toMatch(/NaN|undefined|0\/0/);
  });
});
