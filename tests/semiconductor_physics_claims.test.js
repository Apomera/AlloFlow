// Semiconductor Lab — the physics the tool TEACHES must match the physics it
// TABULATES, and both must match reality.
//
// Same shape as roadready_stopping_claims: the constants live inside render() next
// to t() calls, so they are parsed out of the source rather than imported.
//
// Four real defects prompted this suite:
//   1. Intrinsic silicon conductivity was quoted as 4.4e-4 S/cm. From the tool's own
//      n_i and mobilities it is 4.4e-6 -- a factor of 100, and the resistivity it
//      implies (2.2e3 ohm-cm) is nowhere near intrinsic Si's ~2.3e5.
//   2. The band-gap panel printed "Varshni: Eg(T) = Eg(0) + alphaT". Varshni is
//      Eg(0) - alpha*T^2/(T+beta); the tool states it correctly elsewhere in the same
//      file, so it contradicted itself.
//   3. SiC was labelled "Zinc Blende" while carrying 3.26 eV. 3.26 eV is the 4H
//      (hexagonal) polytype; the zinc-blende polytype is 3C at 2.36 eV.
//   4. tempCoeff mixed two different quantities: Si and GaAs held Varshni ALPHA
//      values while Ge held a real dEg/dT, so the linear model over-predicted how
//      fast those gaps close with heating.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE = 'stem_lab/stem_tool_semiconductor.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_semiconductor.js';

let source;

/** Pull one material row out of the MATERIALS literal. */
function material(key) {
  const row = new RegExp('\\n\\s*' + key + ':\\s*\\{([^}]*)\\}').exec(source);
  if (!row) throw new Error('material row not found: ' + key);
  const body = row[1];
  const num = (field) => {
    const m = new RegExp(field + ':\\s*(-?[0-9.eE+-]+)').exec(body);
    return m ? Number(m[1]) : undefined;
  };
  const str = (field) => {
    const m = new RegExp(field + ":\\s*'([^']*)'").exec(body);
    return m ? m[1] : undefined;
  };
  return {
    bandGap: num('bandGap'), tempCoeff: num('tempCoeff'),
    ni: num('ni'), mobility: num('mobility'), lattice: str('lattice')
  };
}

beforeAll(() => { source = readFileSync(SOURCE, 'utf8'); });

describe('Semiconductor band gaps at 300 K', () => {
  it('matches accepted values', () => {
    expect(material('silicon').bandGap).toBeCloseTo(1.12, 2);
    expect(material('germanium').bandGap).toBeCloseTo(0.67, 2);
    expect(material('gaas').bandGap).toBeCloseTo(1.42, 2);
    expect(material('gan').bandGap).toBeCloseTo(3.40, 2);
    expect(material('diamond').bandGap).toBeCloseTo(5.47, 2);
  });

  it('orders the materials conductor < semiconductor < insulator', () => {
    expect(material('copper').bandGap).toBe(0);
    expect(material('silicon').bandGap).toBeGreaterThan(material('germanium').bandGap);
    expect(material('insulator').bandGap).toBeGreaterThan(material('diamond').bandGap);
  });

  it('keeps the SiC polytype and its lattice consistent', () => {
    const sic = material('sic');
    // 4H is hexagonal at 3.26 eV; 3C is zinc blende at 2.36 eV. Naming one and
    // quoting the other's gap is the defect this guards.
    if (Math.abs(sic.bandGap - 3.26) < 0.05) {
      expect(sic.lattice, 'SiC at 3.26 eV is the 4H polytype, which is hexagonal').toMatch(/hexagon/i);
    } else if (Math.abs(sic.bandGap - 2.36) < 0.05) {
      expect(sic.lattice).toMatch(/zinc/i);
    } else {
      throw new Error('SiC band gap ' + sic.bandGap + ' matches no standard polytype');
    }
  });
});

describe('Temperature coefficient is dEg/dT, not a Varshni alpha', () => {
  // Differentiating Varshni at 300 K gives roughly half the alpha, so holding alpha
  // in this column silently doubles the modelled shift.
  it('uses room-temperature slopes for silicon and GaAs', () => {
    // Si: accepted dEg/dT is about -2.7e-4 eV/K. Its Varshni alpha is 4.73e-4.
    expect(material('silicon').tempCoeff).toBeGreaterThan(-3.1e-4);
    expect(material('silicon').tempCoeff).toBeLessThan(-2.2e-4);
    // GaAs: accepted dEg/dT about -4.5e-4 eV/K. Its Varshni alpha is 5.405e-4.
    expect(material('gaas').tempCoeff).toBeGreaterThan(-4.9e-4);
    expect(material('gaas').tempCoeff).toBeLessThan(-4.1e-4);
  });

  it('has every semiconductor gap shrinking with heat', () => {
    ['silicon', 'germanium', 'gaas', 'diamond', 'sic', 'gan'].forEach((k) => {
      expect(material(k).tempCoeff, k + ' gap must narrow as temperature rises').toBeLessThan(0);
    });
  });

  it('never states Varshni in a linear form', () => {
    // The equation is quadratic over linear. A "+ alphaT" rendering is wrong, and the
    // file gets it right in the advanced band-gap copy, so the two must not diverge.
    // Only user-facing copy is under test; code comments discussing the parameter
    // are not claims shown to a student.
    const mentions = source.split('\n')
      .filter((l) => /Varshni/.test(l))
      .filter((l) => !/^\s*\/\//.test(l));
    expect(mentions.length, 'no Varshni mention found — update this test').toBeGreaterThan(0);
    mentions.forEach((line) => {
      expect(line, 'Varshni written without its T^2/(T+beta) term').toMatch(/T\\u00B2\/\(T\+|T²\/\(T\+/);
      expect(line).not.toMatch(/Varshni:\s*E\\u2097\(T\)\s*=\s*E\\u2097\(0\)\s*\+/);
    });
  });
});

describe('Quoted intrinsic conductivity matches the tabulated constants', () => {
  it('agrees with q x ni x (mu_n + mu_p) for silicon', () => {
    const si = material('silicon');
    const q = 1.602e-19;
    // The copy names mu_p = 470 for silicon alongside the tabulated mu_n.
    const muP = 470;
    const sigma = q * si.ni * (si.mobility + muP);

    // Pull the figure the tool prints: "4.4×10⁻⁶ S/cm".
    const m = /([0-9.]+)\\u00D710\\u207B\\u([0-9A-F]{4}) S\/cm/.exec(source);
    expect(m, 'intrinsic conductivity claim not found in copy').toBeTruthy();

    const mantissa = Number(m[1]);
    // Superscript digits live at U+2070..U+2079 with 1,2,3 as exceptions.
    const SUP = { '2070': 0, '00B9': 1, '00B2': 2, '00B3': 3, '2074': 4, '2075': 5, '2076': 6, '2077': 7, '2078': 8, '2079': 9 };
    const exponent = SUP[m[2].toUpperCase()];
    expect(exponent, 'unrecognised superscript in the conductivity claim').toBeDefined();

    const claimed = mantissa * Math.pow(10, -exponent);
    // Within 10%: the copy rounds the mantissa, but the ORDER must be right.
    expect(claimed).toBeGreaterThan(sigma * 0.9);
    expect(claimed).toBeLessThan(sigma * 1.1);
  });

  it('quotes a resistivity consistent with that conductivity', () => {
    // Intrinsic silicon is ~2.3e5 ohm-cm; anything near 1e3 means the exponent slipped.
    expect(source).toMatch(/2\.3\\u00D710\\u2075/);
  });
});

describe('Dopant chemistry', () => {
  it('pairs every donor with valence 5 and every acceptor with valence 3', () => {
    const block = /var DOPANTS = \{([\s\S]*?)\n      \};/.exec(source);
    expect(block, 'DOPANTS table not found').toBeTruthy();

    const rows = block[1].split('\n').filter((l) => /type:\s*'[np]'/.test(l));
    expect(rows.length, 'expected several dopants').toBeGreaterThanOrEqual(6);

    rows.forEach((line) => {
      const type = /type:\s*'([np])'/.exec(line)[1];
      const valence = Number(/valence:\s*(\d)/.exec(line)[1]);
      // Group V donates an electron (n-type); group III leaves a hole (p-type).
      expect(valence, line.trim().slice(0, 40) + ' has the wrong valence for ' + type + '-type')
        .toBe(type === 'n' ? 5 : 3);
    });
  });
});

describe('LED table obeys the photon energy relation', () => {
  it('has wavelength = 1240 / Eg for every colour', () => {
    const rows = source.split('\n').filter((l) => /wavelength:\s*\d+,\s*bandGap:/.test(l));
    expect(rows.length, 'LED table not found').toBeGreaterThanOrEqual(6);

    rows.forEach((line) => {
      const nm = Number(/wavelength:\s*(\d+)/.exec(line)[1]);
      const eg = Number(/bandGap:\s*([0-9.]+)/.exec(line)[1]);
      const expected = 1240 / eg;
      expect(Math.abs(nm - expected) / expected, 'lambda != 1240/Eg on: ' + line.trim().slice(0, 50))
        .toBeLessThan(0.02);
    });
  });
});

describe('deploy mirror carries the corrected physics', () => {
  it('is byte-identical to the source', () => {
    // The mirror is the copy that ships and does not always auto-sync.
    expect(readFileSync(MIRROR, 'utf8')).toBe(source);
  });
});
