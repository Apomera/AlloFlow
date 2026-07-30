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
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

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

beforeAll(() => {
  source = readFileSync(SOURCE, 'utf8');
  resetStemLab();
  loadTool(SOURCE, 'semiconductor');
});

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

describe('P-N depletion width is physical, not a pixel count', () => {
  // It used to print "Depletion (60px)" -- a drawing coordinate, which would change
  // with canvas size and means nothing to a student. It is now solved from
  // W = sqrt(2*eps*(V_bi - V)/q * (1/N_A + 1/N_D)) and reported in micrometres.
  const widthFromLabel = (html) => {
    const m = /Depletion region about ([0-9.]+) micrometres/.exec(html);
    return m ? Number(m[1]) : null;
  };
  const render = (pnBias) =>
    renderTool('semiconductor', { semiconductor: { subtool: 'pnjunction', pnBias } });

  it('never reports a width in pixels', () => {
    [-3, 0, 1].forEach((b) => {
      expect(render(b), 'bias ' + b).not.toMatch(/Depletion \(\d+px\)/);
    });
    expect(source).not.toMatch(/'px\)'/);
  });

  it('gives the textbook ~0.43 um at zero bias for 1e16 doping', () => {
    expect(widthFromLabel(render(0))).toBeCloseTo(0.43, 2);
  });

  it('widens under reverse bias and narrows under forward bias', () => {
    const rev = widthFromLabel(render(-3));
    const zero = widthFromLabel(render(0));
    const fwd = widthFromLabel(render(0.5));
    expect(rev).toBeGreaterThan(zero);
    expect(zero).toBeGreaterThan(fwd);
  });

  it('follows the square-root dependence on junction voltage', () => {
    // W(V) / W(0) must equal sqrt((V_bi - V) / V_bi). A linear model would not.
    const V_BI = 0.7;
    const zero = widthFromLabel(render(0));
    [-3, -1, 0.3].forEach((b) => {
      const expected = zero * Math.sqrt((V_BI - b) / V_BI);
      expect(widthFromLabel(render(b)), 'bias ' + b).toBeCloseTo(expected, 1);
    });
  });

  it('stops quoting a figure once forward bias passes the built-in potential', () => {
    // The depletion approximation does not hold in high injection, so the tool must
    // not print a precise width there.
    const html = render(2);
    expect(widthFromLabel(html)).toBeNull();
    expect(html).toMatch(/collapsed by forward bias/i);
  });

  it('reports the width to screen-reader users, not just on the canvas', () => {
    expect(render(0)).toMatch(/aria-label="[^"]*0\.43 micrometres/);
  });
});

describe('I-V curve reports real currents', () => {
  // The plot multiplied amps by scaleY AND by 1000, so full scale came out around
  // 46 microamps: every real forward current hit the ceiling and the clamp drew a
  // flat line along the top, which reads as saturation rather than an exponential.
  // The aria-label is computed from the same calcCurrent the trace uses, so it is
  // the cheapest place to pin the model.
  const currentAt = (ivDevice, ivSweepV) => {
    const html = renderTool('semiconductor', { semiconductor: { subtool: 'ivcurve', ivDevice, ivSweepV } });
    const m = /I=(-?[0-9.]+) (mA|μA)/.exec(html);
    if (!m) return null;
    return Number(m[1]) * (m[2] === 'mA' ? 1 : 0.001);
  };

  it('obeys Ohm law for the 1k resistor', () => {
    expect(currentAt('resistor', 3)).toBeCloseTo(3.0, 2);   // 3 V / 1 kOhm
    expect(currentAt('resistor', 5)).toBeCloseTo(5.0, 2);
    expect(currentAt('resistor', -2)).toBeCloseTo(-2.0, 2);
  });

  it('passes essentially nothing at zero bias', () => {
    expect(Math.abs(currentAt('diode', 0))).toBeLessThan(1e-3);
  });

  it('conducts in Zener breakdown', () => {
    // Model is -0.05*(Vz - V) below Vz = -5.1 V, so -5.6 V gives -25 mA.
    expect(currentAt('zener', -5.6)).toBeCloseTo(-25, 1);
    // Above the knee it must NOT be conducting in reverse.
    expect(Math.abs(currentAt('zener', -3))).toBeLessThan(0.1);
  });

  it('sweeps far enough to reach the Zener knee', () => {
    // The range used to stop at -3 V while breakdown sits at -5.1 V, so the one
    // behaviour a Zener exists for was unreachable.
    const m = /var IV_V_MIN = (-?[0-9.]+)/.exec(source);
    expect(m, 'IV_V_MIN not found').toBeTruthy();
    const vMin = Number(m[1]);
    const vz = Number(/var Vz = (-?[0-9.]+)/.exec(source)[1]);
    expect(vMin).toBeLessThan(vz);
  });

  it('no longer double-converts amps to milliamps', () => {
    // The bug was `i * scaleY * 1000` where scaleY already mapped the axis.
    // Code lines only — the comments explaining the fix quote the old expression.
    const code = source.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    expect(code).not.toMatch(/originY - i \* scaleY \* 1000/);
    expect(code).not.toMatch(/markerI \* scaleY \* 1000/);
  });
});

describe("Moore's Law milestones are real chips with their real counts", () => {
  // In a module that teaches Moore's Law the data points ARE the lesson. Four were
  // wrong: the A11 was listed at 19.2 billion (it is 4.3) and the M1 at 50 billion
  // (it is 16), while the 2022 and 2024 counts were correct but attached to the
  // wrong chips — 114 billion is the M1 Ultra, not the M2 Ultra, and 208 billion is
  // NVIDIA's B200, not an "Apple M4 Ultra", which does not exist.
  const milestone = (year) => {
    const re = new RegExp('\\{ year: ' + year + ", transistors: (\\d+),[^}]*?name: t\\('[^']*',\\s*'([^']*)'\\)");
    const m = re.exec(source);
    if (!m) throw new Error('milestone not found for ' + year);
    return { transistors: Number(m[1]), name: m[2] };
  };

  it('has the documented transistor counts', () => {
    expect(milestone(1971).transistors).toBe(2300);          // Intel 4004
    expect(milestone(2017).transistors).toBe(4.3e9);         // Apple A11 Bionic
    expect(milestone(2020).transistors).toBe(16e9);          // Apple M1
    expect(milestone(2022).transistors).toBe(114e9);         // Apple M1 Ultra
    expect(milestone(2024).transistors).toBe(208e9);         // NVIDIA B200
  });

  it('names the chip that actually holds each count', () => {
    expect(milestone(2017).name).toMatch(/A11/);
    expect(milestone(2020).name).toMatch(/^Apple M1$/);
    expect(milestone(2022).name).toMatch(/M1 Ultra/);
    expect(milestone(2024).name).toMatch(/B200/);
    // The two that were invented or misattributed must not come back.
    expect(source).not.toMatch(/Apple M4 Ultra/);
    expect(source).not.toMatch(/'Apple M2 Ultra'/);
  });

  it('is not overridden by a stale ui_strings entry', () => {
    // The catalog wins over tool prose, so a leftover value there would put the
    // wrong chip name back on the graph.
    const cat = readFileSync('ui_strings.js', 'utf8');
    expect(cat).not.toMatch(/"apple_m4_ultra"/);
    expect(cat).not.toMatch(/"apple_m2_ultra"/);
    expect(cat).toMatch(/"apple_m1_ultra": "Apple M1 Ultra"/);
    expect(cat).toMatch(/"nvidia_b200": "NVIDIA B200"/);
  });

  it('keeps every milestone within an order of magnitude of the doubling curve', () => {
    // Moore's own curve: 64 transistors in 1965, doubling every two years. Real
    // chips scatter around it, but a point off by 10x means a typo, not history.
    const re = /\{ year: (\d{4}), transistors: (\d+),/g;
    let m, checked = 0;
    while ((m = re.exec(source)) !== null) {
      const year = Number(m[1]), n = Number(m[2]);
      const pred = 64 * Math.pow(2, (year - 1965) / 2);
      const ratio = n / pred;
      expect(ratio, year + ' is ' + ratio.toFixed(1) + 'x the Moore curve').toBeGreaterThan(0.1);
      expect(ratio, year + ' is ' + ratio.toFixed(1) + 'x the Moore curve').toBeLessThan(10);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(14);
  });
});

describe('deploy mirror carries the corrected physics', () => {
  it('is byte-identical to the source', () => {
    // The mirror is the copy that ships and does not always auto-sync.
    expect(readFileSync(MIRROR, 'utf8')).toBe(source);
  });
});
