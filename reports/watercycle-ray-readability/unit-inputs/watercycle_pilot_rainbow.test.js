import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const stagedRuntime = process.env.WATER_CYCLE_RAINBOW_RUNTIME;
const stagedStrings = process.env.WATER_CYCLE_RAINBOW_STRINGS;
const WATER_CYCLE_PATHS = stagedRuntime
  ? [stagedRuntime]
  : [
      'stem_lab/stem_tool_watercycle.js',
      'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
    ];
const UI_STRING_PATHS = stagedStrings
  ? [stagedStrings]
  : ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];

function loadPilotExports(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const start = source.indexOf('  var WC_PILOT_UNIT_M =');
  const exportAt = source.indexOf('  window.WaterCyclePilotKernel = {');
  expect(start, `pilot start marker missing in ${filePath}`).toBeGreaterThan(-1);
  expect(exportAt, `pilot export missing in ${filePath}`).toBeGreaterThan(start);
  const end = source.indexOf('\n  };', exportAt);
  expect(end, `pilot export never closes in ${filePath}`).toBeGreaterThan(exportAt);
  const host = {};
  // eslint-disable-next-line no-new-func
  new Function('window', source.slice(start, end + '\n  };'.length))(host);
  return {
    kernel: host.WaterCyclePilotKernel,
    notebook: host.WaterCyclePilotNotebook,
    source,
  };
}

describe.each(WATER_CYCLE_PATHS)('Be the Water double-rainbow optics (%s)', (filePath) => {
  const { kernel: K, notebook: N, source } = loadPilotExports(filePath);

  it('requires liquid rain, a bright low Sun, and antisolar alignment', () => {
    const ready = {
      form: 'rain', solar: 1.15, sunAltitudeDeg: 24,
      antisolarAlignment: 1, mass: K.MASS_TO_FALL,
    };
    expect(K.rainbowOptics({ ...ready, form: 'snow' }).stage).toBe(0);
    expect(K.rainbowOptics({ ...ready, form: 'snow' }).primaryVisible).toBe(false);
    expect(K.rainbowOptics({ ...ready, sunAltitudeDeg: 48 }).primaryVisible).toBe(false);
    expect(K.rainbowOptics({ ...ready, solar: 0.7 }).primaryVisible).toBe(false);
    expect(K.rainbowOptics({ ...ready, antisolarAlignment: 0.5 }).primaryVisible).toBe(false);
  });

  it('reveals the primary before the fainter, wider, color-reversed secondary', () => {
    const base = {
      form: 'rain', solar: 1.15, sunAltitudeDeg: 24,
      mass: K.MASS_TO_FALL,
    };
    const primary = K.rainbowOptics({ ...base, antisolarAlignment: 0.9 });
    expect(primary.stage).toBe(3);
    expect(primary.primaryVisible).toBe(true);
    expect(primary.secondaryVisible).toBe(false);
    expect(primary.primaryAngleDeg).toBe(42);
    expect(primary.primaryReflections).toBe(1);

    const double = K.rainbowOptics({ ...base, antisolarAlignment: 1 });
    expect(double.stage).toBe(4);
    expect(double.primaryVisible).toBe(true);
    expect(double.secondaryVisible).toBe(true);
    expect(double.secondaryAngleDeg).toBe(51);
    expect(double.secondaryReflections).toBe(2);
    expect(double.secondaryStrength).toBeLessThan(double.primaryStrength);
  });

  it('keeps every scenario Sun below the 42-degree rainbow limit', () => {
    Object.keys(K.scenarios).forEach((id) => {
      const env = K.environment(id);
      expect(env.sunElevationDeg).toBeGreaterThan(0);
      expect(env.sunElevationDeg).toBeLessThan(42);
      expect(K.environment(id).sunElevationDeg).toBe(env.sunElevationDeg);
    });
  });

  it('persists and safely merges optical evidence in the Journey Notebook', () => {
    const snapshot = K.initialState('temperateCoast');
    const saved = N.capture({
      rainbowDoubleCreated: true,
      pilotNotebook: { reflection: 'The second reflection reversed the outer bow.' },
      pilot: {
        notebookSessionId: 'rainbow-test', scenario: 'temperateCoast',
        snapshot, rainbowEvidence: {
          primarySeen: true, doubleCreated: true, stageReached: 4,
          bestAlignment: 0.996, sunAltitudeDeg: 28,
          scenario: 'temperateCoast', elapsed: 44,
        },
      },
    }, 1_700_000_000_123, 'double-rainbow');

    expect(saved.evidence.rainbow).toMatchObject({
      primarySeen: true, doubleCreated: true, stageReached: 4,
      bestAlignment: 0.996, sunAltitudeDeg: 28,
    });
    const restored = N.restore({
      pilot: { rainbowEvidence: { primarySeen: true, stageReached: 3, bestAlignment: 0.9 } },
    }, saved);
    expect(restored.pilot.rainbowEvidence.stageReached).toBe(4);
    expect(restored.pilot.rainbowEvidence.doubleCreated).toBe(true);
    expect(restored.rainbowDoubleCreated).toBe(true);
  });

  it('wires the visual, causal controls, accessibility, challenge ledger, and report', () => {
    const required = [
      "className: 'wc-pilot-rainbow-visual'",
      "className: 'wc-pilot-rainbow-challenge'",
      "className: 'wc-pilot-rainbow-geometry'",
      "'data-optics-stage': String(rainbowOptics.stage)",
      "className: 'wc-pilot-rainbow-veil'",
      "className: 'wc-pilot-rain-curtain'",
      "className: 'wc-pilot-antisolar-marker'",
      "className: 'wc-pilot-optics-seal'",
      "className: 'wc-pilot-prism-sweep'",
      "pilot_rainbow_double_found",
      "wc-pilot-rainbow-challenge[data-stage=\"4\"]::after",
      "className: 'wc-pilot-rainbow-raylab'",
      "className: 'wc-pilot-rainbow-receipt', role: 'note'",
      "'aria-labelledby': 'wcPilotRainbowReceiptTitle'",
      "role: 'img'",
      "function focusPilotRainbowNotebook()",
      "pilot_rainbow_raylab_note",
      "className: 'wc-pilot-alexander-band'",
      'pilotRainbowPrimaryColors.slice().reverse()',
      "input.rainbowAlign = fineTune ? 2 : 1",
      "canvasEl.dataset.rainbowStage",
      "canvasEl.dataset.weatherOptics",
      "role: 'progressbar'",
      "'aria-live': 'polite'",
      "id: 'double_rainbow'",
      "patch.rainbowDoubleCreated = true",
      "'double-rainbow'",
      "'Double-rainbow evidence'",
      '@media(prefers-reduced-motion:reduce)',
      '@media(forced-colors:active)',
    ];
    required.forEach((contract) => expect(source).toContain(contract));
    expect(source.match(/className: 'wc-pilot-ray-bounce'/g)).toHaveLength(3);
  });
});

describe('Be the Water double-rainbow strings and mirrors', () => {
  it('ships reviewed copy for the visual challenge and science explanation', () => {
    const sources = UI_STRING_PATHS.map((filePath) => readFileSync(filePath, 'utf8'));
    sources.forEach((source) => {
      expect(() => JSON.parse(source)).not.toThrow();
      expect(source).toContain('"pilot_rainbow_challenge_title": "Create a double rainbow"');
      expect(source).toContain('"pilot_rainbow_secondary_science_detail"');
      expect(source).toContain('"pilot_rainbow_dark_band"');
      expect(source).toContain('"pilot_notebook_report_rainbow"');
    });
    const catalog = JSON.parse(sources[0]).stem.watercycle;
    const runtimeSource = readFileSync(WATER_CYCLE_PATHS[0], 'utf8');
    const usedRainbowKeys = new Set(Array.from(runtimeSource.matchAll(
      /t\('stem\.watercycle\.((?:pilot_rainbow|pilot_notebook_report_rainbow|pilot_notebook_yes|pilot_notebook_not_yet)[^']*)'/g,
    ), (match) => match[1]));
    expect(usedRainbowKeys.size).toBeGreaterThan(30);
    usedRainbowKeys.forEach((key) => expect(catalog, `missing UI string ${key}`).toHaveProperty(key));
    if (!stagedStrings) expect(sources[0]).toBe(sources[1]);
  });

  it('keeps both shipped runtime mirrors byte-identical', () => {
    if (stagedRuntime) return;
    expect(readFileSync(WATER_CYCLE_PATHS[0], 'utf8'))
      .toBe(readFileSync(WATER_CYCLE_PATHS[1], 'utf8'));
  });
});
