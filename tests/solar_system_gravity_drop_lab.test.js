import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const COPIES = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];
const source = readFileSync(COPIES[0], 'utf8');
const EARTH_G = 9.80665;

function dropMetrics(massKg, heightM, gravityRatio) {
  const acceleration = EARTH_G * gravityRatio;
  return {
    force: massKg * acceleration,
    fallTime: Math.sqrt(2 * heightM / acceleration),
  };
}

describe('Solar System mass, weight, and gravity-drop lab', () => {
  it('keeps the canonical and desktop assets identical', () => {
    expect(readFileSync(COPIES[1], 'utf8')).toBe(source);
  });

  it('uses reviewed gravity ratios and reports force in newtons', () => {
    expect(source).toContain('var GRAVITY_MAP = { Mercury: 0.38, Venus: 0.91, Earth: 1.0, Mars: 0.38, Jupiter: 2.53, Saturn: 1.06, Uranus: 0.89, Neptune: 1.14, Pluto: 0.06 }');
    expect(source).toContain("Math.round(force).toLocaleString() + ' N'");
    expect(source).toContain("stem.solarsystem.mass_stays");
    expect(source).toContain('"Mass stays ") + massKg.toFixed(1)');
    expect(source).toContain("stem.solarsystem.mass_weight_force_suffix");
    expect(source).toContain('W = mg and t = \\u221a(2h/g)');
    expect(source).toContain('https://spaceplace.nasa.gov/planets-weight/en/');
    expect(source).toContain('JPL gravity values');

    expect(Math.round(dropMetrics(70, 10, 1).force)).toBe(686);
    expect(Math.round(dropMetrics(70, 10, 0.38).force)).toBe(261);
    expect(Math.round(dropMetrics(70, 10, 2.53).force)).toBe(1737);
  });

  it('derives vacuum fall time from height and acceleration, independent of object mass', () => {
    expect(source).toContain('Math.sqrt(2 * dropHeight / 9.80665)');
    expect(source).toContain('Math.sqrt(2 * dropHeight / targetAcceleration)');
    expect(source).toContain('Object mass does not change either fall time.');
    expect(source).toContain('The drop ignores air drag, buoyancy, winds, terrain, altitude change, and rotation.');

    const earth = dropMetrics(70, 10, 1);
    const mars = dropMetrics(70, 10, 0.38);
    const jupiter = dropMetrics(70, 10, 2.53);
    expect(earth.fallTime).toBeCloseTo(1.428, 3);
    expect(mars.fallTime).toBeCloseTo(2.317, 3);
    expect(jupiter.fallTime).toBeCloseTo(0.898, 3);
    expect(dropMetrics(5, 10, 0.38).fallTime).toBeCloseTo(mars.fallTime, 10);
  });

  it('removes kilogram-as-weight language and discloses giant-planet boundaries', () => {
    expect(source).not.toContain('Your weight (kg)');
    expect(source).not.toContain("' kg on '");
    expect(source).not.toContain('Jupiter: 2.34');
    expect(source).not.toContain('Uranus: 0.92');
    expect(source).not.toContain('Neptune: 1.19');
    expect(source).toContain("/giant/i.test(PLANET_KINDS[gravityTarget.key] || '')");
    expect(source).toContain('has no solid surface. Its listed gravity is a reference-level value');
  });

  it('supports accessible comparison, prediction, animation, and evidence capture', () => {
    expect(source).toContain('data-solarsystem-gravity-drop-lab');
    expect(source).toContain('data-gravity-earth-force');
    expect(source).toContain('data-gravity-target-force');
    expect(source).toContain("stem.solarsystem.vacuum_drop_height_meters");
    expect(source).toContain('"Vacuum drop height in meters"');
    expect(source).toContain('role: "img", "aria-label": dropHasRun ? "Ideal vacuum drop from "');
    expect(source).toContain('"Ideal vacuum drop setup from " + dropHeight');
    expect(source).toContain("var dropHasRun = dropNonce > 0 && !!predictionChoice;");
    expect(source).toContain("if (!predictionChoice) return;");
    expect(source).toContain("Result hidden until the model runs.");
    expect(source).toContain('data-gravity-inquiry-step');
    expect(source).toContain("stem.solarsystem.gravity_drop_prediction");
    expect(source).toContain('"Gravity drop prediction"');
    expect(source).toContain('disabled: !predictionChoice');
    expect(source).toContain('Step 2 · Run synchronized vacuum drop');
    expect(source).toContain('dropHasRun && predictionChoice ? React.createElement');
    expect(source).toContain('Step 3 · Save comparison to journal');
    expect(source).toContain('addJournalEntry(gravityTarget.name');
    expect(source).toContain('.solar-cosmos .solar-drop-ball{animation:none!important}');
  });
});
