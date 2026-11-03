import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Stage B pure models: particle speeds, Maxwell distributions, phase-change
// counts, the touch test, the thermal-camera palettes, the wall profile and the
// notebook CSV. Every expected value is computed here from the published
// formula, never read back from the tool.
const SRC = fs.readFileSync('stem_lab/stem_tool_heatlab.js', 'utf8');
function table(startMark) {
  const a = SRC.indexOf(startMark);
  const b = SRC.indexOf('\n  ];', a);
  return new Function('return ' + SRC.slice(a + startMark.length - 1, b) + '\n  ]')();
}
const MATERIALS = table('var MATERIALS = [');
const WALL_LAYERS = table('var WALL_LAYERS = [');
const mat = (id) => MATERIALS.find((m) => m.id === id);
const R = 8.314462618, NA = 6.02214076e23, kB = 1.380649e-23;
let M;

beforeEach(() => {
  resetStemLab();
  M = loadTool('stem_lab/stem_tool_heatlab.js', 'heatLab').models;
});

function integrate(f, a, b, n = 4000) {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return s * h / 3;
}

describe('particle speed scales with the square root of absolute temperature', () => {
  it('gives v_rms = sqrt(3RT/M) for water molecules and copper atoms', () => {
    expect(M.rmsSpeed(20, 0.018015)).toBeCloseTo(Math.sqrt(3 * R * 293.15 / 0.018015), 6);
    expect(M.rmsSpeed(20, 0.018015)).toBeCloseTo(637.1, 0);
    expect(M.rmsSpeed(100, M.molarMass.water)).toBeCloseTo(718.8, 0);
    expect(M.rmsSpeed(20, M.molarMass.copper)).toBeCloseTo(339.2, 0);
    expect(M.rmsSpeed(-300, 0.018)).toBeNaN();
  });

  it('doubling the kelvin temperature multiplies the speed by sqrt 2, not 2', () => {
    const T1 = 20, T2 = 2 * 293.15 - 273.15;
    expect(M.speedRatio(T2, T1)).toBeCloseTo(Math.SQRT2, 12);
    expect(M.rmsSpeed(T2, 0.03) / M.rmsSpeed(T1, 0.03)).toBeCloseTo(Math.SQRT2, 12);
    // 90 C tea is only about 11% faster than 20 C tea
    expect(M.speedRatio(90, 20)).toBeCloseTo(Math.sqrt(363.15 / 293.15), 12);
    expect(M.speedRatio(90, 20)).toBeCloseTo(1.113, 3);
  });

  it('gives every particle the same mean kinetic energy, 3/2 kT, whatever its mass', () => {
    expect(M.meanKineticJ(20)).toBeCloseTo(1.5 * kB * 293.15, 30);
    for (const id of ['water', 'copper', 'oil']) {
      const m = M.molarMass[id] / NA;
      expect(0.5 * m * M.rmsSpeed(20, M.molarMass[id]) ** 2).toBeCloseTo(M.meanKineticJ(20), 30);
    }
  });
});

describe('Maxwell-Boltzmann distributions', () => {
  it('the speed distribution is normalised and has the textbook mean', () => {
    const Mw = 0.018015, T = 50;
    const vmax = 6 * M.rmsSpeed(T, Mw);
    expect(integrate((v) => M.maxwellSpeedPdf(v, T, Mw), 0, vmax)).toBeCloseTo(1, 6);
    const mean = integrate((v) => v * M.maxwellSpeedPdf(v, T, Mw), 0, vmax);
    expect(mean).toBeCloseTo(Math.sqrt(8 * R * (T + 273.15) / (Math.PI * Mw)), 2);
    const msq = integrate((v) => v * v * M.maxwellSpeedPdf(v, T, Mw), 0, vmax);
    expect(Math.sqrt(msq)).toBeCloseTo(M.rmsSpeed(T, Mw), 2);
  });

  it('the energy distribution is normalised with mean 3/2 kT, independent of mass', () => {
    const T = 80, kT = kB * (T + 273.15);
    // substitute E = kT u^2 so the sqrt(E) edge at zero is smooth for Simpson
    const inU = (g) => integrate((u) => g(kT * u * u) * 2 * kT * u, 0, 7, 4000);
    expect(inU((E) => M.maxwellEnergyPdf(E, T))).toBeCloseTo(1, 8);
    expect(inU((E) => E * M.maxwellEnergyPdf(E, T)) / kT).toBeCloseTo(1.5, 8);
  });
});

describe('lens particles', () => {
  it('caps the count at 150, is deterministic, and has rms speed factor 1', () => {
    expect(M.lensMax).toBe(150);
    expect(M.lensParticles(999, 3)).toHaveLength(150);
    const a = M.lensParticles(150, 11), b = M.lensParticles(150, 11);
    expect(a).toEqual(b);
    expect(M.lensParticles(150, 12)).not.toEqual(a);
    const rms = Math.sqrt(a.reduce((s, p) => s + p.spd * p.spd, 0) / a.length);
    expect(rms).toBeCloseTo(1, 10);
    a.forEach((p) => {
      expect(p.hx).toBeGreaterThanOrEqual(0); expect(p.hx).toBeLessThan(1);
      expect(p.spd).toBeGreaterThan(0);
      expect(Object.values(p).every((v) => typeof v === 'number')).toBe(true);
    });
    // a Maxwell sample: spread, not all one speed
    const spds = a.map((p) => p.spd).sort((x, y) => x - y);
    expect(spds[spds.length - 1] / spds[0]).toBeGreaterThan(3);
  });
});

describe('bonds broken on the plateaus', () => {
  it('counts molecules and bond energy from the latent heats', () => {
    const melt = M.phaseChangeCount('melt', 0.5, 1);
    const total = 1 / 0.018015 * NA;
    expect(melt.total).toBeCloseTo(total, -20);
    expect(melt.freed / total).toBeCloseTo(0.5, 12);
    expect(melt.kJ).toBeCloseTo(167, 6);
    expect(melt.perMoleKJ).toBeCloseTo(6.017, 2);           // enthalpy of fusion, ~6.01 kJ/mol
    const boil = M.phaseChangeCount('boil', 1, 1);
    expect(boil.kJ).toBeCloseTo(2260, 6);
    expect(boil.perMoleKJ).toBeCloseTo(40.71, 1);           // ~40.7 kJ/mol at 100 C
    expect(boil.perMoleculeJ * NA / 1000).toBeCloseTo(boil.perMoleKJ, 9);
    expect(M.phaseChangeCount('melt', 2, 1).freed).toBeCloseTo(total, -20);   // clamped
  });
});

describe('touch test', () => {
  it('reproduces the textbook contact temperatures', () => {
    expect(M.touchTest(mat('copper')).contactC).toBeCloseTo(20.5, 1);
    expect(M.touchTest(mat('steel')).contactC).toBeCloseTo(21.3, 1);
    expect(M.touchTest(mat('wood')).contactC).toBeCloseTo(30.5, 1);
    expect(M.touchTest(mat('copper')).contactC).toBeCloseTo(M.contactTemperature(1500, mat('copper'), 33, 20), 12);
  });

  it('gives the semi-infinite contact flux q = e1e2 dT / ((e1 + e2) sqrt(pi t)) and its integral', () => {
    for (const id of ['copper', 'wood', 'aerogel']) {
      const e = Math.sqrt(mat(id).k * mat(id).rho * mat(id).c);
      const eff = 1500 * e / (1500 + e);
      const r = M.touchTest(mat(id), { seconds: 4 });
      expect(r.effusivity).toBeCloseTo(e, 8);
      expect(r.fluxWm2).toBeCloseTo(eff * 13 / Math.sqrt(Math.PI * 4), 8);
      expect(r.fingertipW).toBeCloseTo(r.fluxWm2 * 1e-4, 12);
      // heat drawn so far is the integral of the flux: its time derivative is the flux
      const Q = (s) => M.touchTest(mat(id), { seconds: s }).heatJm2;
      expect((Q(4 + 1e-4) - Q(4 - 1e-4)) / 2e-4 / r.fluxWm2).toBeCloseTo(1, 6);
      expect(Q(4) / Q(1)).toBeCloseTo(2, 12);
    }
    // copper drains about five times the heat wood does, at the same 20 C
    const ratio = M.touchTest(mat('copper')).fluxWm2 / M.touchTest(mat('wood')).fluxWm2;
    expect(ratio).toBeGreaterThan(4.5);
    expect(ratio).toBeLessThan(5.5);
    expect(M.touchTest(mat('copper')).fingertipW).toBeCloseTo(1.06, 2);
    // flux falls as 1/sqrt(t)
    expect(M.touchTest(mat('copper'), { seconds: 1 }).fluxWm2 / M.touchTest(mat('copper'), { seconds: 4 }).fluxWm2).toBeCloseTo(2, 10);
  });
});

describe('thermal camera palettes', () => {
  const lum = (rgb) => {
    const [r, g, b] = rgb.match(/\d+/g).map(Number).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  it('both palettes rise in lightness from cold to hot, so order survives without hue', () => {
    for (const pal of ['iron', 'grey']) {
      let prev = -1;
      for (let f = 0; f <= 1.0001; f += 0.01) {
        const L = lum(M.irColour(f, pal));
        expect(L, pal + ' f=' + f.toFixed(2)).toBeGreaterThanOrEqual(prev - 0.004);
        prev = L;
      }
      expect(lum(M.irColour(1, pal)) - lum(M.irColour(0, pal))).toBeGreaterThan(0.9);
    }
    expect(M.irColour(0, 'grey')).toBe('rgb(0,0,0)');
    expect(M.irColour(1, 'grey')).toBe('rgb(255,255,255)');
    expect(M.irColour(-3, 'iron')).toBe(M.irColour(0, 'iron'));
    expect(M.irColour(7, 'iron')).toBe(M.irColour(1, 'iron'));
  });
});

describe('what the camera sees on the mug and the wall', () => {
  it('puts the mug surface between the room and the tea by the resistance ratio', () => {
    expect(M.mugSurfaceC(mat('fibre'), 10, 80)).toBeCloseTo(20 + 60 * 0.12 / (0.25 + 0.12), 10);
    // a thin copper wrap is practically the tea temperature
    expect(80 - M.mugSurfaceC(mat('copper'), 1, 80)).toBeLessThan(0.01);
    // 60 mm of aerogel (R = 4) keeps the surface within 2 degrees of the room
    expect(M.mugSurfaceC(mat('aerogel'), 60, 80)).toBeCloseTo(20 + 60 * 0.12 / 4.12, 10);
    expect(M.mugSurfaceC(mat('aerogel'), 60, 80)).toBeLessThan(22);
  });

  it('splits the wall temperature drop in proportion to each resistance', () => {
    const ids = ['brick', 'mineral', 'plaster'];
    const rs = ids.map((id) => WALL_LAYERS.find((L) => L.id === id).r);
    const p = M.wallProfile(rs, 21, 2);
    const total = 0.13 + 0.04 + rs.reduce((a, b) => a + b, 0);
    expect(p.totalR).toBeCloseTo(total, 12);
    expect(p.fluxWm2).toBeCloseTo(19 / total, 12);
    expect(p.boundaries[0]).toBe(21);
    expect(p.boundaries[p.boundaries.length - 1]).toBeCloseTo(2, 10);
    // mineral wool carries 2.5 / total of the 19 degrees
    expect(p.boundaries[2] - p.boundaries[3]).toBeCloseTo(19 * 2.5 / total, 10);
    expect(p.outsideSurfaceC).toBeCloseTo(2 + 19 * 0.04 / total, 10);
    expect(Object.keys(M.wallLayerMm).sort()).toEqual(WALL_LAYERS.map((L) => L.id).sort());
  });
});

describe('lab notebook helpers', () => {
  const rows = [
    { kind: 'mug', at: 1, material: 'wood', thickness_mm: 10, T60_C: 60.6, above65: false },
    { kind: 'mug', at: 2, material: 'fibre', thickness_mm: 5, T60_C: 66.1, above65: true },
    { kind: 'mug', at: 3, material: 'copper', thickness_mm: 1, T60_C: null, note: 'say "hi", ok' },
  ];

  it('lists kinds in first-seen order and the plottable columns', () => {
    expect(M.logKinds([{ kind: 'a' }, { kind: 'b' }, { kind: 'a' }])).toEqual([{ kind: 'a', count: 2 }, { kind: 'b', count: 1 }]);
    expect(M.logColumns(rows)).toEqual(['material', 'thickness_mm', 'T60_C', 'above65', 'note']);
    expect(M.logNumericColumns(rows)).toEqual(['thickness_mm', 'T60_C']);
  });

  it('sorts stably both ways with empty cells last', () => {
    expect(M.logSorted(rows, 'T60_C', 'asc').map((p) => p.index)).toEqual([0, 1, 2]);
    expect(M.logSorted(rows, 'T60_C', 'desc').map((p) => p.index)).toEqual([1, 0, 2]);
    expect(M.logSorted(rows, 'material', 'asc').map((p) => p.row.material)).toEqual(['copper', 'fibre', 'wood']);
    expect(M.logSorted(rows, null).map((p) => p.index)).toEqual([0, 1, 2]);
  });

  it('writes RFC 4180 CSV and defuses spreadsheet formulas', () => {
    expect(M.csvCell('plain')).toBe('plain');
    expect(M.csvCell('a,b')).toBe('"a,b"');
    expect(M.csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(M.csvCell('two\nlines')).toBe('"two\nlines"');
    expect(M.csvCell('=1+1')).toBe("'=1+1");
    expect(M.csvCell('-5 C')).toBe("'-5 C");
    expect(M.csvCell(-5)).toBe('-5');
    expect(M.csvCell(null)).toBe('');
    expect(M.csvCell(NaN)).toBe('');
    expect(M.csvCell(true)).toBe('true');
    const csv = M.logToCsv(rows);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('kind,recorded_at,material,thickness_mm,T60_C,above65,note');
    expect(lines[1]).toBe('mug,1970-01-01T00:00:00.001Z,wood,10,60.6,false,');
    expect(lines[3]).toBe('mug,1970-01-01T00:00:00.003Z,copper,1,,,"say ""hi"", ok"');
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(lines).toHaveLength(5);
  });
});
