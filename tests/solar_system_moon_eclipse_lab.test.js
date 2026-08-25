import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const COPIES = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];
const source = readFileSync(COPIES[0], 'utf8');

const SYNODIC_DAYS = 29.53059;
const INCLINATION_DEG = 5.145;

function moonGeometry(phaseDeg, nodeOffsetDeg) {
  const phaseRad = phaseDeg * Math.PI / 180;
  const illuminated = 0.5 * (1 - Math.cos(phaseRad));
  const latitude = INCLINATION_DEG * Math.sin((phaseDeg - nodeOffsetDeg) * Math.PI / 180);
  const gap = (a, b) => {
    const raw = Math.abs(a - b) % 360;
    return Math.min(raw, 360 - raw);
  };
  const nearNode = Math.abs(latitude) <= 1.5;
  const alignment = gap(phaseDeg, 0) <= 12 && nearNode
    ? 'solar'
    : gap(phaseDeg, 180) <= 12 && nearNode ? 'lunar' : 'none';
  return { illuminated, latitude, age: phaseDeg / 360 * SYNODIC_DAYS, alignment };
}

describe('Solar System Moon phases and eclipses lab', () => {
  it('keeps the canonical and desktop assets identical', () => {
    expect(readFileSync(COPIES[1], 'utf8')).toBe(source);
  });

  it('uses reviewed mean lunar-cycle and orbital-inclination values', () => {
    expect(source).toContain('synodicDays: 29.53059');
    expect(source).toContain('inclinationDeg: 5.145');
    expect(source).toContain('https://science.nasa.gov/moon/moon-phases/');
    expect(source).toContain('https://science.nasa.gov/eclipses/geometry/');
    expect(source).toContain('https://eclipse.gsfc.nasa.gov/SEhelp/moonorbit.html');
  });

  it('calculates phase illumination and lunar age from viewing geometry', () => {
    expect(source).toContain('.5 * (1 - Math.cos(phaseRad))');
    expect(source).toContain('phaseDeg / 360 * SOLAR_MOON_MODEL.synodicDays');
    expect(moonGeometry(0, 0).illuminated).toBeCloseTo(0, 10);
    expect(moonGeometry(90, 0).illuminated).toBeCloseTo(0.5, 10);
    expect(moonGeometry(180, 0).illuminated).toBeCloseTo(1, 10);
    expect(moonGeometry(270, 0).illuminated).toBeCloseTo(0.5, 10);
    expect(moonGeometry(180, 0).age).toBeCloseTo(SYNODIC_DAYS / 2, 6);
  });

  it('requires both syzygy and node proximity for an eclipse alignment', () => {
    expect(source).toContain('SOLAR_MOON_MODEL.inclinationDeg * Math.sin((phaseDeg - nodeOffsetDeg)');
    expect(moonGeometry(0, 0).alignment).toBe('solar');
    expect(moonGeometry(180, 0).alignment).toBe('lunar');
    expect(moonGeometry(0, 90).alignment).toBe('none');
    expect(moonGeometry(90, 0).alignment).toBe('none');
    expect(source).toContain('tilted lunar orbit carries the Moon above or below the eclipse line');
  });

  it('discloses that its alignment windows cannot predict real eclipses', () => {
    expect(source).toContain('illustrative teaching thresholds—not eclipse predictions');
    expect(source).toContain('cannot predict an eclipse date, type, path, or visibility');
    expect(source).toContain('node precession, observer location, and atmosphere');
  });

  it('supports accessible controls, prediction feedback, reduced motion, and evidence capture', () => {
    expect(source).toContain('data-solarsystem-moon-toggle');
    expect(source).toContain('data-solarsystem-moon-lab');
    expect(source).toContain("id: 'solar-moon-phase-angle'");
    expect(source).toContain("id: 'solar-moon-node-offset'");
    expect(source).toContain("'aria-valuetext': phaseName");
    expect(source).toContain("role: 'img', 'aria-label': phaseName");
    expect(source).toContain("'aria-live': 'polite'");
    expect(source).toContain('var moonOutcomeVisible = !!predictionChoice;');
    expect(source).toContain("'data-moon-alignment-result': moonOutcomeVisible ? eclipseAlignment : 'hidden'");
    expect(source).toContain('Outcome hidden until you commit');
    expect(source).toContain("disabled: moonOutcomeVisible, 'aria-disabled': moonOutcomeVisible ? 'true' : 'false'");
    expect(source).toContain('Prediction accuracy is not scored.');
    expect(source).toContain('Save Moon evidence to journal');
    expect(source).toContain("addJournalEntry('Moon'");
    expect(source).toContain('.solar-cosmos .solar-moon-moving,.solar-cosmos .solar-moon-phase-disk');
  });
});
