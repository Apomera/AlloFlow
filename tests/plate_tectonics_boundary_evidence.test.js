import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const PATHS = [
  'stem_lab/stem_tool_platetectonics.js',
  'prismflow-deploy/public/stem_lab/stem_tool_platetectonics.js',
];

describe('Plate Tectonics boundary evidence simulator', () => {
  it('uses elapsed-time event probability instead of frame probability', () => {
    const source = readFileSync(PATHS[0], 'utf8');
    expect(source).toContain('1 - Math.exp(-eventsPerSecond * (cur.rate / 5) * dt)');
    expect(source).not.toContain("var quakeProb = cur.mode === 'transform' ? 0.06");
    expect(source).toContain('This is not a hazard forecast');
  });

  it('models boundary-specific focal-depth patterns', () => {
    const source = readFileSync(PATHS[0], 'utf8');
    expect(source).toContain("var depthKm = cur.mode === 'convergent'");
    expect(source).toContain('70 + Math.random() * 580');
    expect(source).toContain(': 2 + Math.random() * 28');
    expect(source).toContain("q.depthKm >= 300 ? '167,139,250'");
    expect(source).toContain("quakes: 'Shallow to deep at subduction zones'");
    expect(source).toContain("quakes: 'Mostly shallow'");
  });

  it('provides accessible, nonvisual boundary evidence', () => {
    const source = readFileSync(PATHS[0], 'utf8');
    expect(source).toContain("'aria-labelledby': 'ptEvidenceTitle'");
    expect(source).toContain("'aria-live': 'polite'");
    expect(source).toContain("['Relative motion', evidence.motion]");
    expect(source).toContain("['Crustal outcome', evidence.crust]");
    expect(source).toContain("['Quake-depth clue', evidence.quakes]");
    expect(source).toContain("['Volcanism clue', evidence.volcanoes]");
    expect(source).toContain("'aria-label': info.name + ' boundary cross-section.");
  });

  it('states model limits and convergent-scenario scope', () => {
    const source = readFileSync(PATHS[0], 'utf8');
    expect(source).toContain('accelerated qualitative cues, not forecasts or calibrated rates');
    expect(source).toContain('Continental collision looks different');
    expect(source).toContain('moment-magnitude unit');
    expect(source).not.toContain('most earthquakes fire here');
  });

  it('keeps persistent evidence text at ten pixels or larger', () => {
    const source = readFileSync(PATHS[0], 'utf8');
    expect(source).not.toMatch(/text-\[(?:[0-9])px\]/);
    expect(source).not.toMatch(/fontSize:\s*(?:[0-9](?:\.[0-9]+)?)\b/);
    expect(source).toContain('text-[10px] font-bold uppercase');
  });

  it('keeps source and public mirror identical', () => {
    expect(readFileSync(PATHS[1], 'utf8')).toBe(readFileSync(PATHS[0], 'utf8'));
  });
});
