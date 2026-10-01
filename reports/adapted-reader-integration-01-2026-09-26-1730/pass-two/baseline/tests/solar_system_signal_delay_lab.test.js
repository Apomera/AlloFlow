import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const COPIES = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];
const source = readFileSync(COPIES[0], 'utf8');

const SECONDS_PER_AU = 499.0047838;

function circularSignalTime(targetAU, angleDeg) {
  const angle = angleDeg * Math.PI / 180;
  const distanceAU = Math.sqrt(1 + targetAU ** 2 - 2 * targetAU * Math.cos(angle));
  return { distanceAU, oneWaySeconds: distanceAU * SECONDS_PER_AU };
}

describe('Solar System deep-space signal-delay lab', () => {
  it('keeps the canonical and desktop assets identical', () => {
    expect(readFileSync(COPIES[1], 'utf8')).toBe(source);
  });

  it('uses exact light speed and documented mean orbital distances', () => {
    expect(source).toContain('lightKmPerSecond: 299792.458');
    expect(source).toContain('secondsPerAU: 499.0047838');
    expect(source).toContain("Mars: { key: 'Mars', semiMajorAU: 1.524 }");
    expect(source).toContain("Jupiter: { key: 'Jupiter', semiMajorAU: 5.203 }");
    expect(source).toContain("Neptune: { key: 'Neptune', semiMajorAU: 30.07 }");
    expect(source).toContain('https://science.nasa.gov/mars/mars-relay-network/');
    expect(source).toContain('https://physics.nist.gov/cuu/Constants/Value/c.html');
  });

  it('calculates Earth-target distance from orbital geometry', () => {
    expect(source).toContain('Math.sqrt(1 + target.semiMajorAU * target.semiMajorAU - 2 * target.semiMajorAU * Math.cos(angleRad))');
    expect(source).toContain('distanceAU * SOLAR_SIGNAL_CONSTANTS.secondsPerAU');

    const marsNear = circularSignalTime(1.524, 0);
    const marsFar = circularSignalTime(1.524, 180);
    expect(marsNear.distanceAU).toBeCloseTo(0.524, 6);
    expect(marsNear.oneWaySeconds / 60).toBeCloseTo(4.36, 2);
    expect(marsFar.distanceAU).toBeCloseTo(2.524, 6);
    expect(marsFar.oneWaySeconds / 60).toBeCloseTo(20.99, 2);

    const jupiterRightAngle = circularSignalTime(5.203, 90);
    expect(jupiterRightAngle.oneWaySeconds / 60).toBeCloseTo(44.06, 2);
    const neptuneFar = circularSignalTime(30.07, 180);
    expect(neptuneFar.oneWaySeconds / 3600).toBeCloseTo(4.31, 2);
  });

  it('replaces the misleading constant-speed rocket shortcut with disclosed model limits', () => {
    expect(source).toContain('Signal delay: geometry matters');
    expect(source).toContain('Spacecraft travel time requires a trajectory and propulsion model');
    expect(source).toContain('not distance divided by a constant rocket speed');
    expect(source).not.toContain('By rocket (~40,000 km/h)');
    expect(source).not.toContain('var hours = km / 40000');
  });

  it('supports accessible interaction, prediction, animation, and journal evidence', () => {
    expect(source).toContain('data-solarsystem-signal-toggle');
    expect(source).toContain('data-solarsystem-signal-lab');
    expect(source).toContain('id: "solar-signal-angle"');
    expect(source).toContain('"aria-valuetext": geometryLabel');
    expect(source).toContain("stem.solarsystem.signal_delay_prediction");
    expect(source).toContain('"Signal delay prediction"');
    expect(source).toContain('Send a light-speed ping');
    expect(source).toContain('Save signal evidence to journal');
    expect(source).toContain('addJournalEntry(targetPlanet.name');
    expect(source).toContain('.solar-cosmos .solar-signal-line,.solar-cosmos .solar-signal-pulse,.solar-cosmos .solar-drop-ball{animation:none!important}');
  });
});
