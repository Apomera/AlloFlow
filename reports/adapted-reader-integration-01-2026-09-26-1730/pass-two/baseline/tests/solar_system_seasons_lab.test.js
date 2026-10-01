import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const COPIES = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

const source = readFileSync(COPIES[0], 'utf8');

function latitudeMetrics(tiltDeg, phase, latitudeDeg) {
  const phaseAngle = phase / 100 * Math.PI * 2;
  const declination = Math.asin(Math.sin(tiltDeg * Math.PI / 180) * Math.sin(phaseAngle));
  const latitude = latitudeDeg * Math.PI / 180;
  const horizonTerm = -Math.tan(latitude) * Math.tan(declination);
  const hourAngle = horizonTerm <= -1 ? Math.PI : horizonTerm >= 1 ? 0 : Math.acos(horizonTerm);
  return {
    daylightHours: 24 * hourAngle / Math.PI,
    noonElevation: Math.max(0, 90 - Math.abs(latitudeDeg - declination * 180 / Math.PI)),
  };
}

describe('Solar System axial-tilt and seasons lab', () => {
  it('keeps the canonical and desktop assets identical', () => {
    expect(readFileSync(COPIES[1], 'utf8')).toBe(source);
  });

  it('uses reviewed tilt, eccentricity, distance, and year inputs for three contrasting worlds', () => {
    expect(source).toContain("Earth: { key: 'Earth', tiltDeg: solarTiltDeg('Earth'), eccentricity: 0.01671, semiMajorAU: 1, yearLabel: '365.25 days'");
    expect(source).toContain("Mars: { key: 'Mars', tiltDeg: solarTiltDeg('Mars'), eccentricity: 0.09339, semiMajorAU: 1.524, yearLabel: '687 Earth days'");
    expect(source).toContain("Uranus: { key: 'Uranus', tiltDeg: solarTiltDeg('Uranus'), eccentricity: 0.04726, semiMajorAU: 19.19, yearLabel: '84 Earth years'");
    // Tilt is single-sourced: the seasons lab reads the planet table rather than
    // keeping its own copy, and the table holds IAU-convention obliquity.
    expect(source).toContain("planetRow.tilt = planetRow.tiltDeg * Math.PI / 180;");
    expect(source).toContain("tiltDeg: 23.44");
    expect(source).toContain("tiltDeg: 97.77");
    expect(source).toContain('https://science.nasa.gov/helio-and-you-seasons-on-earth-mars-and-beyond/');
    expect(source).toContain('https://science.nasa.gov/mars/facts/');
    expect(source).toContain('https://science.nasa.gov/uranus/facts/');
  });

  it('models daylight and solar-noon geometry rather than inventing a climate forecast', () => {
    expect(source).toContain('Math.asin(Math.sin(world.tiltDeg * Math.PI / 180) * Math.sin(phaseAngle))');
    expect(source).toContain('24 * hourAngle / Math.PI');
    expect(source).toContain('90 - Math.abs(latitudeDeg - declinationDeg)');
    expect(source).toContain('This is not a temperature or climate forecast');
    expect(source).toContain('atmosphere, refraction, terrain, weather, oceans, ice, and thermal inertia');

    const earthNorthJune = latitudeMetrics(23.44, 25, 45);
    const earthSouthJune = latitudeMetrics(23.44, 25, -45);
    expect(earthNorthJune.daylightHours).toBeCloseTo(15.43, 1);
    expect(earthSouthJune.daylightHours).toBeCloseTo(8.57, 1);
    expect(earthNorthJune.noonElevation).toBeCloseTo(68.44, 1);

    const earthNorthEquinox = latitudeMetrics(23.44, 0, 45);
    const earthSouthEquinox = latitudeMetrics(23.44, 0, -45);
    expect(earthNorthEquinox.daylightHours).toBeCloseTo(12, 5);
    expect(earthSouthEquinox.daylightHours).toBeCloseTo(12, 5);

    const uranusNorthSolstice = latitudeMetrics(97.77, 25, 45);
    const uranusSouthSolstice = latitudeMetrics(97.77, 25, -45);
    expect(uranusNorthSolstice.daylightHours).toBe(24);
    expect(uranusSouthSolstice.daylightHours).toBe(0);
  });

  it('makes evidence interpretation, scrubbing, model boundaries, and evidence capture accessible', () => {
    expect(source).toContain('data-solarsystem-seasons-toggle');
    expect(source).toContain('data-solarsystem-seasons-lab');
    expect(source).toContain('id: "solar-season-phase"');
    expect(source).toContain('"aria-valuetext": phaseLabel');
    expect(source).toContain('"aria-label": sunlightDescription');
    expect(source).toContain('role: "meter"');
    expect(source).toContain('data-solar-season-evidence-check');
    expect(source).toContain('This is an evidence-reading check, not a prediction.');
    expect(source).toContain("stem.solarsystem.season_sunlight_evidence_check");
    expect(source).toContain('"Season sunlight evidence check"');
    expect(source).toContain('Save interpretation + evidence to journal');
    expect(source).toContain('addJournalEntry(planet.name');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');
    expect(source).toContain('.solar-cosmos .solar-season-sun,.solar-cosmos .solar-season-beam,.solar-cosmos .solar-signal-line,.solar-cosmos .solar-signal-pulse,.solar-cosmos .solar-drop-ball{animation:none!important}');
  });
});
