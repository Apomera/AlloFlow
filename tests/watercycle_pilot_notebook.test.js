import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

function loadNotebook(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const start = source.indexOf('  var WC_PILOT_UNIT_M =');
  const exportAt = source.indexOf('  window.WaterCyclePilotKernel = {');
  expect(start, 'pilot start marker missing in ' + filePath).toBeGreaterThan(-1);
  expect(exportAt, 'pilot export missing in ' + filePath).toBeGreaterThan(start);
  const end = source.indexOf('\n  };', exportAt);
  expect(end, 'pilot export never closes in ' + filePath).toBeGreaterThan(exportAt);
  const host = {};
  // eslint-disable-next-line no-new-func
  new Function('window', source.slice(start, end + '\n  };'.length))(host);
  expect(host.WaterCyclePilotNotebook, 'notebook export missing in ' + filePath).toBeTruthy();
  return { notebook: host.WaterCyclePilotNotebook, source };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

function journeyState(changeCount = 3) {
  return {
    wcPrediction: 'runoff',
    journeyLoops: 2,
    journeyPaths: { runoff: 2, infiltrate: 1, plant: 0 },
    stagesViewed: { evaporation: true, condensation: true },
    pilotNotebook: { reflection: 'Dry air can evaporate falling rain before it reaches the ground.' },
    pilot: {
      notebookSessionId: 'session-test',
      scenario: 'desertBasin',
      cameraMode: 'water',
      stagesSeen: { evaporation: true, condensation: true, precipitation: true },
      routes: { water: 0, runoff: 2, infiltration: 1, plant: 0 },
      comparisons: {
        tropicalOcean: {
          scenario: 'tropicalOcean', form: 'rain', altitudeM: 1400,
          stageCount: 4, rainbowStage: 2, savedAt: 10,
          pointerTrail: [{ x: 900, y: 400 }],
        },
        mountainWinter: {
          scenario: 'mountainWinter', form: 'snow', altitudeM: 999999,
          stageCount: 999, rainbowStage: 99, savedAt: 20,
          renderer: { frame: 'must not persist' },
        },
        invented: {
          scenario: 'invented', form: 'plasma', altitudeM: -500,
          stageCount: -4, rainbowStage: -2, savedAt: 30,
        },
      },
      lastRoute: 'infiltration',
      loopsCompleted: 2,
      lastChange: { from: 'rain', to: 'vapor', altitudeM: 840, tempC: 22, rh: 24 },
      notebookChanges: Array.from({ length: changeCount }, (_, index) => ({
        id: 'change-' + index,
        sequence: index + 1,
        from: index % 2 ? 'vapor' : 'liquid',
        to: index % 2 ? 'droplet' : 'vapor',
        scenario: 'desertBasin',
        altitudeM: 400 + index,
        tempC: 24,
        rh: 28,
        elapsed: index * 4,
      })),
      snapshot: {
        scenario: 'desertBasin', form: 'vapor', altitudeM: 840,
        x: 42, z: -18, yaw: -0.8, pitch: 0.18, vy: 3,
        energy: 0.4, droplets: 2, mass: 0.2, nucleus: true,
        dryAirExposure: 0.72, pathwayProgress: 0,
        formsSeen: { liquid: true, vapor: true, invented: true },
        stagesSeen: { evaporation: true, condensation: true, invented: true },
        loops: 2, elapsed: 48, note: 'virga', surface: 'permeable', cameraMode: 'water',
        extraFrameObject: { shouldNotPersist: true },
      },
    },
  };
}

describe.each(WATER_CYCLE_PATHS)('Be the Water Journey Notebook kernel (%s)', (filePath) => {
  const { notebook: N, source } = loadNotebook(filePath);

  it('creates a bounded, versioned, privacy-safe checkpoint', () => {
    const state = journeyState(31);
    state.pilotNotebook.reflection = 'R'.repeat(1500);
    state.studentName = 'must not persist';
    const record = N.capture(state, 1_700_000_000_123, 'transition');

    expect(record.version).toBe(1);
    expect(record.savedAt).toBe(1_700_000_000_123);
    expect(record.reason).toBe('transition');
    expect(record.sessionId).toBe('session-test');
    expect(record.reflection).toHaveLength(1200);
    expect(record.evidence.changes).toHaveLength(24);
    expect(record.evidence.prediction).toBe('runoff');
    expect(N.MAX_COMPARISONS).toBe(4);
    expect(Object.keys(record.evidence.comparisons)).toEqual(['tropicalOcean', 'mountainWinter']);
    expect(record.evidence.comparisons.tropicalOcean).toEqual({
      scenario: 'tropicalOcean', form: 'rain', altitudeM: 1400,
      stageCount: 4, rainbowStage: 2, savedAt: 10,
    });
    expect(record.evidence.comparisons.mountainWinter).toEqual({
      scenario: 'mountainWinter', form: 'snow', altitudeM: 6000,
      stageCount: 6, rainbowStage: 4, savedAt: 20,
    });
    expect(N.summary(record).comparisons).toBe(2);
    expect(JSON.stringify(record)).not.toContain('pointerTrail');
    expect(JSON.stringify(record)).not.toContain('must not persist');
    expect(record.checkpoint.formsSeen).toEqual({ liquid: true, vapor: true });
    expect(record.checkpoint.stagesSeen).toEqual({ evaporation: true, condensation: true });
    expect(record.checkpoint).not.toHaveProperty('extraFrameObject');
    expect(JSON.stringify(record)).not.toContain('must not persist');
  });

  it('round-trips valid saves and rejects corrupt or future records', () => {
    const storage = memoryStorage();
    const record = N.capture(journeyState(), 1_700_000_000_123, 'manual');
    expect(N.write(record, storage)).toEqual(record);
    expect(N.read(storage)).toEqual(record);

    storage.setItem(N.STORAGE_KEY, '{bad json');
    expect(N.read(storage)).toBeNull();
    storage.setItem(N.STORAGE_KEY, JSON.stringify({ ...record, version: 99 }));
    expect(N.read(storage)).toBeNull();
    expect(N.clear(storage)).toBe(true);
    expect(storage.getItem(N.STORAGE_KEY)).toBeNull();
  });

  it('restores at a paused neutral boundary without discarding cumulative evidence', () => {
    const record = N.capture(journeyState(), 1_700_000_000_123, 'pagehide');
    const current = {
      journeyLoops: 4,
      journeyPaths: { runoff: 5, infiltrate: 0, plant: 2 },
      stagesViewed: { collection: true },
      pilot: {
        routes: { runoff: 5 },
        stagesSeen: { collection: true },
        comparisons: {
          tropicalOcean: {
            scenario: 'tropicalOcean', form: 'liquid', altitudeM: 100,
            stageCount: 1, rainbowStage: 0, savedAt: 99,
          },
        },
      },
    };
    const restored = N.restore(current, record);

    expect(restored.pilot.paused).toBe(true);
    expect(restored.pilot.onboardingComplete).toBe(true);
    expect(restored.pilot.resumeCheckpoint).toEqual(record.checkpoint);
    expect(restored.pilot.snapshot).toEqual(record.checkpoint);
    expect(restored.pilot.cameraMode).toBe('water');
    expect(restored.pilot.routes.runoff).toBe(5);
    expect(restored.pilot.routes.infiltration).toBe(1);
    expect(restored.pilot.comparisons.tropicalOcean.form).toBe('liquid');
    expect(restored.pilot.comparisons.tropicalOcean.savedAt).toBe(99);
    expect(restored.pilot.comparisons.mountainWinter).toEqual(record.evidence.comparisons.mountainWinter);
    expect(Object.keys(restored.pilot.comparisons)).toHaveLength(2);
    expect(restored.pilot.stagesSeen.collection).toBe(true);
    expect(restored.pilot.stagesSeen.precipitation).toBe(true);
    expect(restored.journeyLoops).toBe(4);
    expect(restored.journeyPaths.plant).toBe(2);
    expect(restored.pilotNotebook.reflection).toBe(record.reflection);
  });

  it('wires stable checkpoint boundaries, recovery controls, reflection, and export cleanup', () => {
    expect(source).toContain("window.addEventListener('pagehide', onPilotPageHide)");
    expect(source).toContain("window.removeEventListener('pagehide', onPilotPageHide)");
    expect(source).toContain("snapshot('pagehide')");
    expect(source).toContain('input.restoreCheckpoint');
    expect(source).toContain("className: 'wc-pilot-recovery'");
    expect(source).toContain("className: 'wc-pilot-notebook'");
    expect(source).toContain("id: 'wcPilotNotebookReflection'");
    expect(source).toContain('maxLength: WCPN.MAX_REFLECTION');
    expect(source).toContain("'aria-describedby': 'wcPilotNotebookReflectionHelp'");
    expect(source).toContain("type: 'text/markdown;charset=utf-8'");
    expect(source).toContain('URL.revokeObjectURL(notebookUrl)');
    expect(source).toContain('No name, account, or location is stored.');
    expect(source).toContain('function wcPilotNotebookNormalizeComparisons(value)');
    expect(source).toContain('comparisons: pilot.comparisons || {}');
    expect(source).toContain('var comparisons = wcPilotNotebookMergeComparisons');
    expect(source).toContain("className: 'wc-pilot-notebook-compare'");
    expect(source).toContain("className: 'wc-pilot-compare-notebook-btn'");
    expect(source).toContain('function focusPilotComparisonNotebook()');
    const handoffStart = source.indexOf('function focusPilotComparisonNotebook()');
    const handoffEnd = source.indexOf('function savePilotNotebook(', handoffStart);
    const handoff = source.slice(handoffStart, handoffEnd);
    expect(handoff).toContain('var hasReflection = notebookReflection.trim().length > 0;');
    expect(handoff).toContain('if (!hasReflection) {');
    expect(handoff).toContain('reflection: starter.slice(0, WCPN.MAX_REFLECTION)');
    expect(handoff).toContain('Your existing writing was preserved.');
    expect(source).toContain("pilot_notebook_report_comparison',");
    expect(source).toContain('normalized.evidence.comparisons');
    expect(source).toContain('var reportComparisonFreezing = pilotComparisonFreezingText(row);');
    expect(source).toContain(".replace('{freezing}', reportComparisonFreezing)");
    expect(source).toContain("h('dt', null, t('stem.watercycle.pilot_compare_freezing', 'Freezing'))");
  });
});

describe('Be the Water Journey Notebook strings and mirrors', () => {
  it('ships identical runtime and string mirrors with reviewed notebook copy', () => {
    expect(readFileSync(WATER_CYCLE_PATHS[0], 'utf8')).toBe(readFileSync(WATER_CYCLE_PATHS[1], 'utf8'));
    const canonicalStrings = readFileSync('ui_strings.js', 'utf8');
    const publicStrings = readFileSync('desktop/web-app/public/ui_strings.js', 'utf8');
    expect(canonicalStrings).toBe(publicStrings);
    expect(canonicalStrings).toContain('"pilot_notebook": "Journey notebook"');
    expect(canonicalStrings).toContain('"pilot_resume_saved": "Resume saved journey"');
    expect(canonicalStrings).toContain('"pilot_notebook_privacy": "Saved only in this browser on this device. No name, account, or location is stored."');
    expect(canonicalStrings).toContain('"pilot_compare_use_in_notebook": "Use this conclusion in Journey Notebook"');
    expect(canonicalStrings).toContain('"pilot_notebook_compare_title": "Climate comparison evidence"');
    expect(canonicalStrings).toContain('"pilot_notebook_report_comparison": "Climate comparison evidence"');
    expect(canonicalStrings).toContain('"pilot_compare_profile_title": "Climate sky profile"');
    expect(canonicalStrings).toContain('starting humidity; freezing {freezing}."');
  });
});
