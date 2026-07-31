// Semiconductor Lab canvas alternatives.
//
// Every visualisation here is a canvas, so its accessible name is the ONLY route
// a screen-reader user has to the content. Naming the picture is not enough: the
// description has to carry the quantity the picture exists to show.
//
// Four did not. The Moore's Law graph -- a data visualisation -- had a fixed
// string, so it conveyed "a graph exists" and nothing about the trend, the
// selected year, or how the real chip compares to the prediction. The band-gap
// diagram omitted the band gap. The doping lattice said which dopant but not how
// many or what carriers resulted. The quantum well gave a level count but not the
// energies the solver had just computed.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_semiconductor.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_semiconductor.js';

let source;
const label = (state) => {
  const html = renderTool('semiconductor', { semiconductor: state });
  const m = /<canvas[^>]*aria-label="([^"]*)"/.exec(html);
  return m ? m[1] : null;
};

beforeAll(() => {
  source = readFileSync(SOURCE, 'utf8');
  resetStemLab();
  loadTool(SOURCE, 'semiconductor');
});

describe('every canvas is exposed as a named image', () => {
  it('pairs each 2D context with a role and a label', () => {
    const canvases = (source.match(/getContext\('2d'\)/g) || []).length;
    const roles = (source.match(/role: 'img'/g) || []).length;
    expect(canvases).toBeGreaterThanOrEqual(13);
    expect(roles).toBeGreaterThanOrEqual(canvases);
  });
});

describe('descriptions carry live values, not just titles', () => {
  it('band gap states the gap and what it makes the material', () => {
    const si = label({ subtool: 'bandgap', material: 'silicon', temperature: 300 });
    expect(si).toMatch(/1\.12 electron volts/);
    expect(si).toMatch(/Semiconductor:/);

    const cu = label({ subtool: 'bandgap', material: 'copper', temperature: 300 });
    expect(cu).toMatch(/Conductor:/);
    const gl = label({ subtool: 'bandgap', material: 'insulator', temperature: 300 });
    expect(gl).toMatch(/Insulator:/);
  });

  it('band gap tracks the temperature slider', () => {
    // The gap narrows with heat; the description must move with it.
    const hot = label({ subtool: 'bandgap', material: 'silicon', temperature: 500 });
    expect(hot).toMatch(/500 kelvin/);
    const eg = Number(/([0-9.]+) electron volts/.exec(hot)[1]);
    expect(eg).toBeLessThan(1.12);
  });

  it('doping states the dopant count, valence and majority carrier', () => {
    const n = label({ subtool: 'doping', dopant: 'phosphorus', dopantCount: 4 });
    expect(n).toMatch(/4 Phosphorus/);
    expect(n).toMatch(/5 valence electrons/);
    expect(n).toMatch(/n-type/);
    expect(n).toMatch(/free electrons/);

    const p = label({ subtool: 'doping', dopant: 'boron', dopantCount: 2 });
    expect(p).toMatch(/3 valence electrons/);
    expect(p).toMatch(/p-type/);
    expect(p).toMatch(/holes/);
  });

  it('intrinsic silicon is described as such, not as doped', () => {
    const i = label({ subtool: 'doping' });
    expect(i).toMatch(/Intrinsic silicon/);
    expect(i).toMatch(/almost no free carriers/);
  });

  it('quantum well lists the confined energies, not just how many', () => {
    const qw = label({ subtool: 'qwell', qwWidth: 5, qwDepth: 0.3 });
    expect(qw).toMatch(/GaAs\/AlGaAs/);
    expect(qw).toMatch(/5 nanometres wide/);
    // Ground state for a 5 nm GaAs well is about 0.225 eV.
    expect(qw).toMatch(/n=1 at 0\.2\d\d eV/);
  });

  it("Moore's Law reports the selected year, the chip and the prediction", () => {
    const m = label({ subtool: 'moorelaw', mooreYear: 2024 });
    expect(m).toMatch(/Selected year 2024/);
    expect(m).toMatch(/NVIDIA B200/);
    expect(m).toMatch(/208 billion transistors/);
    expect(m).toMatch(/doubling prediction for 2024/);
    // The old fixed string conveyed nothing about the data.
    expect(m).not.toBe("Moore's Law graph showing transistor counts from 1965 to 2030");
  });

  it("Moore's Law description follows the year slider", () => {
    const early = label({ subtool: 'moorelaw', mooreYear: 1971 });
    expect(early).toMatch(/Intel 4004/);
    expect(early).toMatch(/2,300 transistors/);
    expect(early).toMatch(/10.m process/);
  });
});

describe('transistor count formatting is speakable', () => {
  it('says magnitudes rather than long digit strings', () => {
    const f = window.__SemiconductorCore.formatTransistorCount;
    expect(f(2300)).toBe('2,300');
    expect(f(29000)).toBe('29,000');
    expect(f(3.1e6)).toBe('3.1 million');
    expect(f(125e6)).toBe('125 million');
    expect(f(4.3e9)).toBe('4.3 billion');
    expect(f(16e9)).toBe('16 billion');
    expect(f(208e9)).toBe('208 billion');
    expect(f(64)).toBe('64');
  });

  it('degrades safely on nonsense input', () => {
    const f = window.__SemiconductorCore.formatTransistorCount;
    expect(f(0)).toBe('0');
    expect(f(-5)).toBe('0');
    expect(f(NaN)).toBe('0');
    expect(f(Infinity)).toBe('0');
  });
});

describe('deploy copy matches', () => {
  it('keeps the source and deploy copies identical', () => {
    expect(readFileSync(MIRROR, 'utf8')).toBe(source);
  });
});
