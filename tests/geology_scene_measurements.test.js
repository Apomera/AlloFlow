import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

let P;
const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');

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
