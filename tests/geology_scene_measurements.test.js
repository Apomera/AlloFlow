import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

let P;
const root = path.resolve(import.meta.dirname, '..');
// GEO_TEST_SOURCE lets a mutation check load a scratch copy instead of rewriting the shared file.
const sourcePath = process.env.GEO_TEST_SOURCE || path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');

beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered() { return false; } };
  delete window.__alloGeologyPure;
  // eslint-disable-next-line no-new-func
  new Function(fs.readFileSync(sourcePath, 'utf8'))();
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed');
});

beforeEach(() => {
  P.setScene('crust');
  P.setGrid('standard');
});

describe('Geology Explorer scene-aware measurements', () => {
  it('keeps depth, temperature, and pressure for the layered crust', () => {
    const facts = P.rockFacts('shale', 4);
    expect(facts.measurements.map((row) => row.id)).toEqual(['depth', 'temperature', 'pressure']);
    expect(facts.measurementSummary).toContain('kilometres');
    expect(facts.measurementSummary).toContain('degrees Celsius');
    expect(facts.measurementSummary).toContain('megapascals');
  });

  it('uses specimen scale and wall-to-center growth order for the geode', () => {
    P.setScene('geode');
    P.setGrid('standard');
    const facts = P.rockFacts('quartz', 6);
    expect(facts.measurements.map((row) => row.id)).toEqual(['scale', 'growth-zone', 'formation-order']);
    expect(facts.measurements[0].value).toContain('2 m');
    expect(facts.measurements[1].value).toBe('Open-space crystal zone');
    expect(facts.measurements[2].value).toBe('Later inward growth');
    expect(facts.measurementSummary).not.toContain('kilometres');
    expect(P.grid().NY * P.grid().KM_PER_VOXEL).toBeCloseTo(0.002);
  });

  it('surfaces the defining spatial evidence for tectonic scenes', () => {
    P.setScene('subduction');
    P.setGrid('standard');
    const slab = P.rockFacts('slab', 7);
    expect(slab.measurements.map((row) => row.id)).toEqual(['depth', 'process-position', 'thermal-domain', 'temperature']);
    expect(slab.measurements.find((row) => row.id === 'thermal-domain').value).toBe('Cold slab anomaly');
    expect(slab.measurements.find((row) => row.id === 'depth').label).toBe('Representative depth');

    P.setScene('ridge');
    P.setGrid('standard');
    const axis = P.rockFacts('axialMagma', 3);
    expect(axis.measurements.find((row) => row.id === 'age-position').value).toContain('youngest crust');
    expect(axis.measurements.find((row) => row.id === 'evidence-signal').value).toContain('new seafloor');

    P.setScene('hotspot');
    P.setGrid('standard');
    const seamount = P.rockFacts('seamount', 2);
    expect(seamount.measurements.find((row) => row.id === 'track-position').value).toContain('Farthest');
    expect(seamount.measurements.find((row) => row.id === 'age-signal').value).toContain('Oldest');
  });

  it('formats deep-Earth pressure in readable gigapascals', () => {
    P.setScene('deepEarth');
    P.setGrid('standard');
    const core = P.rockFacts('innerCore', 0);
    expect(core.measurements[0].label).toBe('Representative radial depth');
    expect(core.measurements.find((row) => row.id === 'pressure').value).toBe('≈ 360 GPa');
  });

  it('announces the scene-specific measurement story in first-person mode', () => {
    P.setScene('geode');
    P.setGrid('standard');
    const geodeSpeech = P.fpAnnounceText(P.fpProbe(0, 0, 0));
    expect(geodeSpeech).toContain('specimen span about 2 metres');
    expect(geodeSpeech).toContain('Formation order');
    expect(geodeSpeech).not.toContain('kilometres');

    P.setScene('deepEarth');
    P.setGrid('standard');
    const coreSpeech = P.fpAnnounceText(P.fpProbe(0, 0, 0));
    expect(coreSpeech).toContain('gigapascals');
    expect(coreSpeech).toContain('State solid');
  });
});

// The numbers a student reads must come from the Earth, not from convenience. Until 09-24 the
// "upper mantle" sat at 700 km (inside the LOWER mantle; the boundary is 660 km) with the 660 km
// pressure, the lower mantle showed 125 GPa at 2,000 km (PREM: about 88), and the ridge's magma
// lens sat SHALLOWER than the vent on the seafloor above it.
describe('displayed depths, pressures and temperatures agree with the real Earth', () => {
  // PREM (Dziewonski & Anderson 1981) pressure in GPa at depth in km; linear between points.
  const PREM = [[0, 0], [35, 1.0], [400, 13.4], [660, 23.8], [1000, 38.5], [1500, 62], [2000, 88], [2500, 114], [2891, 135.8], [4000, 231], [5150, 328.9], [6000, 358], [6371, 363.9]];
  const prem = (d) => { for (let i = 1; i < PREM.length; i++) if (d <= PREM[i][0]) { const [d0, p0] = PREM[i - 1], [d1, p1] = PREM[i]; return p0 + (p1 - p0) * (d - d0) / (d1 - d0); } return 363.9; };
  const LAYERS = { crust: [0, 70], upperMantle: [35, 660], lowerMantle: [660, 2891], outerCore: [2891, 5150], innerCore: [5150, 6371] };

  it('each Deep Earth shell reports a depth inside its own layer', () => {
    P.setScene('deepEarth'); P.setGrid('standard');
    for (const [key, [top, bottom]] of Object.entries(LAYERS)) {
      const depth = Number(P.rockFacts(key, 0).depthKm);
      expect(depth, key).toBeGreaterThan(top);
      expect(depth, key).toBeLessThanOrEqual(bottom);
    }
  });

  it('each Deep Earth shell shows the PREM pressure at that depth (within 10%), and temperature rises inward', () => {
    P.setScene('deepEarth'); P.setGrid('standard');
    let lastT = -Infinity;
    for (const key of Object.keys(LAYERS)) {
      const f = P.rockFacts(key, 0), depth = Number(f.depthKm), gpa = Number(f.presMPa) / 1000, want = prem(depth);
      expect(Math.abs(gpa - want) / want, key + ': ' + gpa + ' GPa at ' + depth + ' km, PREM ' + want.toFixed(1)).toBeLessThan(0.1);
      expect(Number(f.tempC), key).toBeGreaterThan(lastT);
      lastT = Number(f.tempC);
    }
  });

  it("the ridge's magma lens lies below the seafloor vent, at the base of the sheeted dikes", () => {
    P.setScene('ridge'); P.setGrid('standard');
    const depth = (k) => Number(P.rockFacts(k, 0).depthKm);
    expect(depth('axialMagma')).toBeGreaterThan(depth('vent'));
    expect(depth('axialMagma')).toBeGreaterThanOrEqual(depth('dikes'));
    expect(depth('axialMagma')).toBeLessThan(depth('gabbro'));
  });

  it('crust pressure follows rock of about 2.7 g/cm3 (27 MPa per km)', () => {
    P.setScene('crust'); P.setGrid('standard');
    const f = P.rockFacts('shale', 4), depth = Number(f.depthKm);
    expect(Number(f.presMPa) / depth).toBeGreaterThan(25);
    expect(Number(f.presMPa) / depth).toBeLessThan(29);
  });
});
