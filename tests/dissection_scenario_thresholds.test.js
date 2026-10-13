import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

function loadProductionFunction(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw new Error('Expected one production function: ' + name);
  const match = matches[0], start = match.index + match[1].length;
  const ending = '\n' + match[1] + '}', end = source.indexOf(ending, start);
  if (end < start) throw new Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

const scenarioDeclarations = [...source.matchAll(/^([ \t]*)var ADVANCED_SCENARIOS = \[/gm)];
if (scenarioDeclarations.length !== 1) throw new Error('Expected one advanced scenario declaration');
const scenarioStart = scenarioDeclarations[0].index + scenarioDeclarations[0][0].length - 1;
const scenarioEnd = source.indexOf('\n' + scenarioDeclarations[0][1] + '];', scenarioStart);
if (scenarioEnd < scenarioStart) throw new Error('Missing advanced scenario declaration ending');
const scenarios = freezeDeep(new Function('"use strict"; return (' + source.slice(scenarioStart, scenarioEnd) + '\n]);')());

const thresholdKeys = ['instructorTarget', 'instructorMaxCautions', 'instructorRequiredStructures'];
const normalizeInstructorMaxCautions = loadProductionFunction('normalizeInstructorMaxCautions');
const normalizationSource = thresholdKeys.map(key => {
  const declarations = [...source.matchAll(new RegExp('^[ \\t]*var ' + key + ' = [^\\r\\n]+;', 'gm'))];
  if (declarations.length !== 1) throw new Error('Expected one threshold normalization: ' + key);
  return declarations[0][0];
}).join('\n');
const normalizedThresholds = new Function('d', 'normalizeInstructorMaxCautions',
  '"use strict"; ' + normalizationSource + '\nreturn { ' + thresholdKeys.join(', ') + ' };');

const scenarioFields = [
  ['precision-access', ['instructorTarget']],
  ['structure-trace', ['instructorRequiredStructures']],
  ['preservation', ['instructorTarget', 'instructorMaxCautions']],
  ['orientation-rescue', []],
  ['obscured-field', []],
  ['relationship-pathway', []],
  ['restricted-tray', []],
  ['timed-practical', []],
];
const ownCompletionRules = 'This challenge uses its own completion rules. These settings remain available for other challenges and lab feedback.';
const expectedChoices = {
  instructorTarget: [60, 65, 70, 75, 80, 85, 90, 95],
  instructorMaxCautions: [0, 1, 2],
  instructorRequiredStructures: [1, 2, 3, 4, 5],
};

function harness(overrides = {}) {
  const initial = freezeDeep({
    workspaceMode: 'advanced', quizMode: false, practicalMode: false,
    specimen: 'frog', activeLayer: 'skin', procedureScenario: 'precision-access',
    scenarioStartedAt: 1800000000000, scenarioCompletedAt: 1800000000123, scenarioTimeRemaining: 120,
    anatomicalView: 'dorsal', selectedOrgan: 'heart', relationshipTraceCount: 1,
    exploredOrgans: { 'frog|heart': true, 'frog|liver': true, 'pig|lung': true, 'frog|hidden': true },
    procedureByLayer: {
      skin: { inspected: true, errors: 0, completedSteps: 3, score: 90, preservation: 90,
        incisionMetrics: { control: 90, precision: 90 }, incisionPath: [{ x: 0.2, y: 0.3 }],
        history: ['inspect'], actionLog: [{ action: 'inspect', at: 123 }], cautionLog: [],
        tissueState: { salineDrops: 1, stability: 80, quality: 90 }, learningChecks: { inspect: true } },
      muscle: { inspected: false, history: [], actionLog: [] },
    },
    attemptArchive: { skin: [{ id: 'saved-attempt', score: 82, cautions: 1 }] },
    savedFrames: [{ id: 'frame', note: 'Keep this observation.' }],
    organNotes: { 'frog|heart': 'Saved anatomy note.' }, notebook: ['Saved reflection.'],
    _procedureReplay: { layer: 'skin', paused: false, elapsed: 500 },
    _procedureDemo: { layer: 'skin', startedAt: 456 }, compareReplayPlaying: true, compareReplayProgress: 0.4,
    activeInstrument: 'probe', toolCalibration: { bladeAngle: 35, pressure: 40 },
    procedureFeedback: { message: 'Saved feedback', tone: 'success' },
    largeText: true, highContrast: true, reducedMotion: true,
    ...overrides,
  });
  let state = initial;
  const updates = [];
  const initialEvidence = JSON.stringify(initial);

  function bindings() {
    const currentScenarioDefinition = loadProductionFunction('currentScenarioDefinition', {
      ADVANCED_SCENARIOS: scenarios, procedureScenario: state.procedureScenario,
    });
    const base = {
      d: state, advancedWorkspace: state.workspaceMode === 'advanced', currentScenarioDefinition,
      ...normalizedThresholds(state, normalizeInstructorMaxCautions),
    };
    return { ...base, scenarioThresholdControlData: loadProductionFunction('scenarioThresholdControlData', base) };
  }

  return {
    initial, updates,
    get state() { return state; },
    controls() { return bindings().scenarioThresholdControlData(); },
    requirements() { return loadProductionFunction('scenarioThresholdRequirements', bindings())(); },
    update(key, value) {
      return loadProductionFunction('updateScenarioThreshold', {
        ...bindings(),
        upd: (changedKey, changedValue) => {
          updates.push([changedKey, changedValue]);
          state = freezeDeep({ ...state, [changedKey]: changedValue });
        },
      })(key, value);
    },
    // Execute the production completion rules with fixed, unrelated metric
    // readings so threshold boundaries can be checked independently of scoring.
    status(procedurePatch = {}, inspectedOrgans) {
      const currentProcedure = freezeDeep({ ...state.procedureByLayer.skin, ...procedurePatch });
      const status = loadProductionFunction('procedureScenarioStatus', {
        ...bindings(), currentProcedure,
        procedureProtocol: freezeDeep({ order: ['inspect', 'scalpel', 'probe'], recommendedView: 'dorsal' }),
        procedureStepIndex: procedure => procedure.completedSteps,
        procedureTechniqueScore: procedure => procedure.score,
        tissuePreservationScore: procedure => procedure.preservation,
        observationFieldData: procedure => ({ quality: procedure.tissueState.quality }),
        normalizeTissueState: tissue => tissue,
        anatomicalRelationships: () => [{ organ: { id: 'liver' } }],
        organs: freezeDeep([{ id: 'heart' }, { id: 'liver' }, { id: 'lung' }]),
        specimen: state.specimen, anatomicalView: state.anatomicalView,
        formatScenarioTime: loadProductionFunction('formatScenarioTime'),
      })(currentProcedure, freezeDeep(inspectedOrgans));
      return status;
    },
    expectUnchanged() {
      expect(state).toBe(initial);
      expect(updates).toEqual([]);
      expect(JSON.stringify(initial)).toBe(initialEvidence);
    },
    expectOnlyThresholdChanged(key, value) {
      expect(updates).toEqual([[key, value]]);
      expect(state).toEqual({ ...initial, [key]: value });
      for (const otherKey of Object.keys(initial).filter(item => item !== key)) {
        expect(state[otherKey], otherKey).toBe(initial[otherKey]);
      }
      expect(JSON.stringify(initial)).toBe(initialEvidence);
    },
  };
}

describe('dissection threshold requirements and scenario applicability', () => {
  it('covers every production scenario', () => {
    expect(scenarios.map(scenario => scenario.id)).toEqual(scenarioFields.map(([id]) => id));
  });

  it.each(scenarioFields)('identifies the fields used by %s', (procedureScenario, activeKeys) => {
    const h = harness({ procedureScenario });
    const controls = h.controls();
    expect(controls.map(control => control.key)).toEqual(thresholdKeys);
    expect(controls.filter(control => control.applies).map(control => control.key)).toEqual(activeKeys);
    expect(controls.map(control => [control.id, control.label])).toEqual([
      ['diss-instructor-target', 'Target score'],
      ['diss-instructor-cautions', 'Maximum cautions'],
      ['diss-instructor-structures', 'Required structures'],
    ]);
    const requirements = {
      'precision-access': 'Finish all protocol steps and reach a technique score of at least 75/100.',
      preservation: 'Finish all protocol steps with control at least 75%, preservation at least 65%, and no more than 1 caution.',
      'structure-trace': 'Inspect at least 2 exposed structures in the current layer.',
    };
    expect(h.requirements()).toBe(requirements[procedureScenario] || ownCompletionRules);
    h.expectUnchanged();
  });

  it.each([[60, 65], [70, 65], [75, 65], [80, 70], [82.5, 72.5], [95, 85]])(
    'describes target %s with the actual preservation minimum %s', (instructorTarget, preservation) => {
      const h = harness({ procedureScenario: 'preservation', instructorTarget, instructorMaxCautions: 0 });
      expect(h.requirements()).toBe('Finish all protocol steps with control at least ' + instructorTarget +
        '%, preservation at least ' + preservation + '%, and no more than 0 cautions.');
      expect(h.controls()[0].help).toContain('preservation minimum is ' + preservation + '%');
      h.expectUnchanged();
    });

  it('uses singular structure and plural caution descriptions when selected', () => {
    const structures = harness({ procedureScenario: 'structure-trace', instructorRequiredStructures: 1 });
    expect(structures.requirements()).toBe('Inspect at least 1 exposed structure in the current layer.');
    const cautions = harness({ procedureScenario: 'preservation', instructorMaxCautions: 2 });
    expect(cautions.requirements()).toContain('no more than 2 cautions.');
    structures.expectUnchanged();
    cautions.expectUnchanged();
  });
});

describe('dissection threshold choices preserve current settings', () => {
  it('uses normalized defaults without writing them into the saved state', () => {
    const h = harness();
    expect(h.controls().map(control => control.value)).toEqual([75, 1, 2]);
    for (const control of h.controls()) {
      expect(control.choices).toEqual(expectedChoices[control.key]);
      expect(control.options).toEqual(expectedChoices[control.key]);
    }
    h.expectUnchanged();
  });

  it.each([82, 82.5])('keeps saved target %s and fractional structure requirements available', instructorTarget => {
    const h = harness({ instructorTarget, instructorMaxCautions: 0, instructorRequiredStructures: 2.5 });
    const [target, cautions, structures] = h.controls();
    expect(target.value).toBe(instructorTarget);
    expect(target.options).toEqual([60, 65, 70, 75, 80, instructorTarget, 85, 90, 95]);
    expect(target.choices).toEqual(expectedChoices.instructorTarget);
    expect(structures).toMatchObject({ value: 2.5, options: [1, 2, 2.5, 3, 4, 5], choices: [1, 2, 3, 4, 5] });
    expect(cautions).toMatchObject({ value: 0, options: [0, 1, 2], choices: [0, 1, 2] });
    expect(h.requirements()).toContain(instructorTarget + '/100');
    h.expectUnchanged();
  });

  it('normalizes loaded bounds and numeric strings without changing stored evidence', () => {
    const low = harness({ instructorTarget: 40, instructorMaxCautions: -1, instructorRequiredStructures: -2 });
    const high = harness({ instructorTarget: 100, instructorMaxCautions: 9, instructorRequiredStructures: 8 });
    const strings = harness({ instructorTarget: '82.5', instructorMaxCautions: '0', instructorRequiredStructures: '2.5' });
    expect(low.controls().map(control => control.value)).toEqual([60, 0, 1]);
    expect(high.controls().map(control => control.value)).toEqual([95, 2, 5]);
    expect(strings.controls().map(control => control.value)).toEqual([82.5, 0, 2.5]);
    for (const h of [low, high, strings]) h.expectUnchanged();
  });

  it('returns fresh options so a consumer cannot alter future choices', () => {
    const h = harness();
    h.controls()[0].options.push(82);
    h.controls()[1].choices.push(3);
    expect(h.controls()[0].options).toEqual(expectedChoices.instructorTarget);
    expect(h.controls()[1].choices).toEqual(expectedChoices.instructorMaxCautions);
    h.expectUnchanged();
  });
});

describe('dissection threshold updates are narrow and validated', () => {
  const allowedUpdates = Object.entries(expectedChoices).flatMap(([key, values]) => values.map(value => [key, value]));

  it.each(allowedUpdates)('accepts only the selected %s value %s and preserves all evidence', (key, value) => {
    const previous = expectedChoices[key].find(choice => choice !== value);
    for (const input of [value, String(value), ' ' + value + ' ']) {
      const h = harness({ instructorTarget: 80, instructorMaxCautions: 1, instructorRequiredStructures: 2, [key]: previous });
      expect(h.update(key, input)).toBe(true);
      h.expectOnlyThresholdChanged(key, value);
      expect(h.controls().find(control => control.key === key).value).toBe(value);
    }
  });

  it.each(thresholdKeys)('rejects invalid input for %s without writing or changing evidence', key => {
    for (const value of [undefined, null, '', ' \t\n ', false, true, [], [0], {}, NaN, Infinity, -Infinity, 'NaN', 'Infinity', 'invalid', -1, 100]) {
      const h = harness();
      expect(h.update(key, value), String(value)).toBe(false);
      h.expectUnchanged();
    }
  });

  it.each([
    ['instructorTarget', 82], ['instructorTarget', 82.5], ['instructorTarget', 61],
    ['instructorMaxCautions', 0.5], ['instructorMaxCautions', 3],
    ['instructorRequiredStructures', 2.5], ['instructorRequiredStructures', 0], ['instructorRequiredStructures', 6],
  ])('rejects a new value outside the %s choices: %s', (key, value) => {
    const h = harness();
    expect(h.update(key, value)).toBe(false);
    expect(h.update(key, String(value))).toBe(false);
    h.expectUnchanged();
  });

  it.each([
    ['instructorTarget', 75], ['instructorTarget', 82.5], ['instructorMaxCautions', 0],
    ['instructorMaxCautions', 1], ['instructorRequiredStructures', 2], ['instructorRequiredStructures', 2.5],
  ])('does not write unchanged %s value %s', (key, value) => {
    const h = harness({ [key]: value });
    expect(h.update(key, value)).toBe(false);
    expect(h.update(key, String(value))).toBe(false);
    h.expectUnchanged();
  });

  it.each(['procedureScenario', 'scenarioStartedAt', 'workspaceMode', '__proto__', 'constructor', '', null, undefined])(
    'rejects unrelated state key %s', key => {
      const h = harness();
      expect(h.update(key, 80)).toBe(false);
      h.expectUnchanged();
    });

  it.each([
    ['guided workspace', { workspaceMode: 'guided' }],
    ['quiz', { quizMode: true }],
    ['practical', { practicalMode: true }],
    ['quiz and practical', { quizMode: true, practicalMode: true }],
  ])('rejects edits from the hidden %s surface', (_name, overrides) => {
    const h = harness(overrides);
    for (const [key, value] of [['instructorTarget', 80], ['instructorMaxCautions', 0], ['instructorRequiredStructures', 3]]) {
      expect(h.update(key, value)).toBe(false);
    }
    h.expectUnchanged();
  });

  it('allows a setting for another challenge while retaining the current scenario', () => {
    const h = harness({ procedureScenario: 'orientation-rescue' });
    expect(h.controls().every(control => !control.applies)).toBe(true);
    expect(h.update('instructorMaxCautions', 0)).toBe(true);
    expect(h.requirements()).toBe(ownCompletionRules);
    h.expectOnlyThresholdChanged('instructorMaxCautions', 0);
  });
});

describe('dissection requirement copy agrees with production completion rules', () => {
  it.each([60, 75, 82, 82.5, 95])('requires all protocol steps and technique score %s for precision access', instructorTarget => {
    const h = harness({ instructorTarget });
    expect(h.requirements()).toContain('all protocol steps');
    expect(h.requirements()).toContain(instructorTarget + '/100');
    expect(h.status({ score: instructorTarget }).complete).toBe(true);
    expect(h.status({ score: instructorTarget - 0.5 }).complete).toBe(false);
    expect(h.status({ score: 100, completedSteps: 2 }).complete).toBe(false);
    h.expectUnchanged();
  });

  it.each([[60, 65, 0], [75, 65, 1], [82.5, 72.5, 0], [95, 85, 2]])(
    'requires control %s, preservation %s, and at most %s cautions', (instructorTarget, preservation, instructorMaxCautions) => {
      const h = harness({ procedureScenario: 'preservation', instructorTarget, instructorMaxCautions });
      const boundary = { incisionMetrics: { control: instructorTarget }, preservation, errors: instructorMaxCautions };
      expect(h.status(boundary).complete).toBe(true);
      expect(h.status({ ...boundary, incisionMetrics: { control: instructorTarget - 0.5 } }).complete).toBe(false);
      expect(h.status({ ...boundary, preservation: preservation - 0.5 }).complete).toBe(false);
      expect(h.status({ ...boundary, errors: instructorMaxCautions + 1 }).complete).toBe(false);
      expect(h.status({ ...boundary, completedSteps: 2 }).complete).toBe(false);
      h.expectUnchanged();
    });

  it('applies the preservation target to the latest stroke control and supports legacy smoothness', () => {
    const h = harness({ procedureScenario: 'preservation', instructorTarget: 80, instructorMaxCautions: 0 });
    expect(h.status({ incisionMetrics: { control: 100 }, extensionMetrics: { control: 79 } }).complete).toBe(false);
    expect(h.status({ incisionMetrics: { control: 0 }, extensionMetrics: { control: 80 } }).complete).toBe(true);
    expect(h.status({ incisionMetrics: { smoothness: 80 } }).complete).toBe(true);
    h.expectUnchanged();
  });

  it.each([1, 2, 2.5, 3])('counts only current exposed structures against requirement %s', instructorRequiredStructures => {
    const h = harness({ procedureScenario: 'structure-trace', instructorRequiredStructures });
    const needed = Math.ceil(instructorRequiredStructures);
    const ids = ['heart', 'liver', 'lung'];
    const inspected = Object.fromEntries(ids.slice(0, needed).map(id => ['frog|' + id, true]));
    const insufficient = { ...inspected };
    delete insufficient['frog|' + ids[needed - 1]];
    insufficient['pig|' + ids[needed - 1]] = true;
    insufficient['frog|hidden'] = true;
    expect(h.requirements()).toContain('at least ' + instructorRequiredStructures + ' exposed structure');
    expect(h.status({}, inspected).complete).toBe(true);
    expect(h.status({}, insufficient).complete).toBe(false);
    h.expectUnchanged();
  });

  it.each([
    ['precision-access', 'instructorTarget', 95, {}],
    ['preservation', 'instructorMaxCautions', 0, { errors: 1 }],
    ['structure-trace', 'instructorRequiredStructures', 3, {}],
  ])('updates %s completion from the chosen threshold while keeping recorded evidence', (procedureScenario, key, value, procedurePatch) => {
    const h = harness({ procedureScenario });
    expect(h.status(procedurePatch).complete).toBe(true);
    expect(h.update(key, value)).toBe(true);
    expect(h.status(procedurePatch).complete).toBe(false);
    h.expectOnlyThresholdChanged(key, value);
  });

  it.each(scenarioFields.filter(([, activeKeys]) => !activeKeys.length))(
    '%s keeps its completion rules independent of instructor thresholds', procedureScenario => {
      const low = harness({ procedureScenario, instructorTarget: 60, instructorMaxCautions: 2, instructorRequiredStructures: 1 });
      const high = harness({ procedureScenario, instructorTarget: 95, instructorMaxCautions: 0, instructorRequiredStructures: 5 });
      expect(low.requirements()).toBe(ownCompletionRules);
      expect(high.requirements()).toBe(ownCompletionRules);
      expect(low.status()).toEqual(high.status());
      expect(low.status({ completedSteps: 0, inspected: false, tissueState: { quality: 20, salineDrops: 5, stability: 10 } }))
        .toEqual(high.status({ completedSteps: 0, inspected: false, tissueState: { quality: 20, salineDrops: 5, stability: 10 } }));
      low.expectUnchanged();
      high.expectUnchanged();
    });
});
