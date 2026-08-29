import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const HOSTS = [
  'stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab_module.js',
  'desktop/web-app/public/stem_lab/stem_lab_module.js',
];
const START = '// BEEHIVE_PERSISTENCE_HELPER_START';
const END = '// BEEHIVE_PERSISTENCE_HELPER_END';

function read(relativePath) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

function helperBlock(source) {
  const start = source.indexOf(START);
  const end = source.indexOf(END, start);
  if (start < 0 || end < 0) throw new Error('Beehive persistence helper markers are missing');
  return source.slice(start, end + END.length);
}

function loadContract(source) {
  return Function(helperBlock(source) + '\nreturn {' +
    ' version: _BEEHIVE_PERSISTENCE_VERSION,' +
    ' serialize: _serializeBeehiveForPersistence,' +
    ' deserialize: _deserializeBeehiveFromPersistence' +
  ' };')();
}

describe('Beehive host persistence', () => {
  it('keeps the canonical host and both deploy copies on the same serializer contract', () => {
    const sources = HOSTS.map(read);
    const canonicalHelper = helperBlock(sources[0]);

    for (const source of sources) {
      expect(helperBlock(source)).toBe(canonicalHelper);
      expect(source).toContain('var _beehive = _serializeBeehiveForPersistence(labToolData.beehive);');
      expect(source).toContain('if (_beehive) _toSave.beehive = _beehive;');
      expect(source).toContain('var _hydratedBeehive = _deserializeBeehiveFromPersistence(_parsed.beehive);');
      expect(source).toContain('Object.assign({}, prev, _parsedForHydration, { _persisted: true })');
    }
  });

  it('round-trips durable colony, learning, Queen, and completed Drone data', () => {
    const { version, serialize } = loadContract(read(HOSTS[0]));
    const state = {
      day: 18,
      honey: 42.5,
      modelVersion: 'colony-daily-1.0',
      simulationSeed: 18436572,
      randomState: 305419896,
      experimentRunSerial: 3,
      seededFromDay: 0,
      experimentBaseline: {
        schemaVersion: 1,
        modelVersion: 'colony-daily-1.0',
        simulationSeed: 18436572,
        runSerial: 2,
        seededFromDay: 0,
        exactFromStart: true,
        capturedDay: 12,
        stockId: 'italian',
        siteId: 'meadow',
        metrics: { workers: 14000, brood: 3600, honey: 31, pollen: 18, varroaLevel: 9, diseaseRisk: 3, morale: 84, queenHealth: 96, habitat: 57, pesticideExposure: 2 },
        totals: { totalHoney: 22, totalHarvested: 8, eventsHandled: 2 },
        managementTrail: [{ day: 4, label: 'Plant wildflowers', cost: '1 AP', summary: 'Habitat improved.' }],
      },
      autoAdvance: true,
      notebook: {
        drone: { evidence: 'Reached the DCA with 31% energy.' },
        experiment: {
          schemaVersion: 1,
          question: 'Does planting wildflowers change honey stores?',
          hypothesis: 'More forage will increase honey stores.',
          changedVariable: 'Plant wildflowers once',
          prediction: 'Run B honey will be higher at Day 12.',
          observations: 'Run A had 20 lb and Run B had 28 lb.',
          alternativeExplanation: 'A later event could affect stores.',
          conclusion: 'The evidence supported the prediction with uncertainty.',
          review: { singleVariable: true, numericEvidence: true, uncertainty: true },
        },
      },
      queen: { active: true, paused: false, day: 6, career: { matches: 3, wins: 2 } },
      drone: {
        active: true,
        paused: true,
        carryover: 'Victory route',
        replayIndex: 7,
        highScore: 920,
        attempts: 4,
        successes: 2,
        bestDifficulty: 'hard',
        difficulty: 'hard',
        routePlan: 'thermal-first',
        scenario: 'crosswind',
        cameraMode: 'chase',
        graphicsMode: 'eco',
        steeringSensitivity: 'gentle',
        cameraStabilized: false,
        lastRun: { success: true, score: 920, energyLeft: 31, telemetry: [{ t: 4, altitude: 108 }] },
      },
    };
    const before = JSON.parse(JSON.stringify(state));

    const restored = JSON.parse(JSON.stringify(serialize(state)));

    expect(version).toBe(1);
    expect(restored._persistenceVersion).toBe(version);
    expect(restored.day).toBe(18);
    expect(restored.honey).toBe(42.5);
    expect(restored).toMatchObject({
      modelVersion: 'colony-daily-1.0',
      simulationSeed: 18436572,
      randomState: 305419896,
      experimentRunSerial: 3,
      seededFromDay: 0,
    });
    expect(restored.experimentBaseline).toEqual(state.experimentBaseline);
    expect(restored).not.toHaveProperty('autoAdvance');
    expect(restored.notebook).toEqual(state.notebook);
    expect(restored.notebook.experiment).toEqual(state.notebook.experiment);
    expect(restored.queen).toEqual({ active: true, paused: true, day: 6, career: { matches: 3, wins: 2 } });
    expect(restored.drone).toMatchObject({
      highScore: 920,
      attempts: 4,
      successes: 2,
      bestDifficulty: 'hard',
      difficulty: 'hard',
      routePlan: 'thermal-first',
      scenario: 'crosswind',
      cameraMode: 'chase',
      graphicsMode: 'eco',
      steeringSensitivity: 'gentle',
      cameraStabilized: false,
      lastRun: state.drone.lastRun,
    });
    expect(state).toEqual(before);
  });

  it('persists an in-progress Queen match without allowing either clock to auto-run', () => {
    const { serialize } = loadContract(read(HOSTS[0]));
    const state = {
      autoAdvance: true,
      queen: { active: true, paused: false, day: 19, score: 430, resources: { nectar: 27 } },
    };
    const before = JSON.parse(JSON.stringify(state));

    const persisted = serialize(state);

    expect(persisted).not.toHaveProperty('autoAdvance');
    expect(persisted.queen).toEqual({
      active: true,
      paused: true,
      day: 19,
      score: 430,
      resources: { nectar: 27 },
    });
    expect(state).toEqual(before);

    const completed = serialize({
      autoAdvance: false,
      queen: { active: false, paused: false, result: 'victory', day: 22 },
    });
    expect(completed).not.toHaveProperty('autoAdvance');
    expect(completed.queen).toEqual({ active: false, paused: false, result: 'victory', day: 22 });
  });

  it('sanitizes legacy Bee session state before hydration without mutating the parsed payload', () => {
    const { deserialize } = loadContract(read(HOSTS[0]));
    const legacy = {
      _persistenceVersion: 0,
      day: 27,
      autoAdvance: true,
      queen: { active: true, paused: false, day: 11, score: 280 },
      drone: {
        active: true,
        paused: true,
        interrupted: true,
        carryover: 'Recovery route',
        replayIndex: 9,
        highScore: 640,
        cameraMode: 'chase',
      },
    };
    const before = JSON.parse(JSON.stringify(legacy));

    const hydrated = deserialize(legacy);

    expect(hydrated).toEqual({
      _persistenceVersion: 1,
      day: 27,
      queen: { active: true, paused: true, day: 11, score: 280 },
      drone: { highScore: 640, cameraMode: 'chase' },
    });
    expect(legacy).toEqual(before);
  });

  it('drops non-resumable Drone session flags and rejects malformed state', () => {
    const { serialize } = loadContract(read(HOSTS[0]));
    const persisted = serialize({
      _persistenceVersion: 999,
      drone: { active: true, paused: true, interrupted: true, carryover: 'Recovery route', replayIndex: 3, highScore: 100 },
    });

    expect(persisted._persistenceVersion).toBe(1);
    expect(persisted.drone).toEqual({ highScore: 100 });
    expect(serialize(null)).toBeNull();
    expect(serialize([])).toBeNull();
    expect(serialize({ drone: ['not', 'state'], honey: 12 })).toEqual({ honey: 12, _persistenceVersion: 1 });
  });
});
