// Optics Lab reference content: every number a student is shown or graded on
// must follow from the physics, not from whoever typed it. Each check below
// computes the value from the inputs the text itself states and compares it
// with the SHIPPED key or claim. A key that was typed wrong, or a claim that
// never matched its own formula, fails here.
//
// Found by an audit in Sept 2026, all shipped:
//   - the key to "why is light slower in glass" was the absorption/re-emission
//     misconception;
//   - "blue scatters 9x (or 5.6x) more than red" in four places, including one
//     that printed the formula (680/470)^4 next to it (it is 4.4);
//   - a fringe count of "~2" that counted spacings, not fringes (3);
//   - a fibre that kept "~95%" of its light over 100 km at 0.2 dB/km (1%).

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { withPrediction } from './helpers/optics_prediction.js';

const SRC = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_optics.js'), 'utf8');

function table(name) {
  const open = `  var ${name} = [`;
  const start = SRC.indexOf(open);
  if (start === -1) return null;
  let depth = 0;
  let i = start + open.length - 1;
  for (; i < SRC.length; i += 1) {
    const c = SRC[i];
    if (c === '[') depth += 1;
    else if (c === ']') { depth -= 1; if (depth === 0) break; }
  }
  try {
    return vm.runInNewContext(`(${SRC.slice(start + open.length - 1, i + 1)})`, {});
  } catch {
    return null;
  }
}

function rows(...names) {
  const out = [];
  for (const n of names) {
    const t = table(n);
    expect(Array.isArray(t), `${n} no longer parses — every check on it would pass vacuously`).toBe(true);
    out.push(...t);
  }
  return out;
}

const QUIZ = rows('AP_OPTICS_QUIZ', 'QUIZ_EXTRA');
const PROBLEMS = rows('WORKED_PROBLEMS', 'WORKED_PROBLEMS_MORE', 'WORKED_PROBLEMS_EXTRA');
const TRIVIA = rows('OPTICS_TRIVIA');
const RECORDS = rows('OPTICS_RECORDS');
const QUOTES = rows('OPTICS_QUOTES');

const C = 299792458;
const DEG = Math.PI / 180;
const RAD_TO_ARCSEC = 180 / Math.PI * 3600;
// Loading the 28k-line tool into jsdom takes 1-7 s under load; the default
// 5 s timeout read a slow load as a failure during mutation runs.
const RENDER_TIMEOUT = 30000;

function question(fragment) {
  const hits = QUIZ.filter((q) => q.q.includes(fragment));
  expect(hits.length, `quiz item "${fragment}" not found exactly once`).toBe(1);
  return hits[0];
}
const keyOf = (q) => q.choices[q.correct];

function problem(id) {
  const p = PROBLEMS.find((x) => x.id === id);
  expect(p, `worked problem ${id} is gone`).toBeTruthy();
  return p;
}

// The choice nearest the computed value must be the keyed one. `unit` converts
// a choice's text to a number in the same unit as `value`.
function expectNearestIsKey(q, value, unit = (t) => Number((t.match(/-?\d+(?:\.\d+)?/) || [])[0]), log = false) {
  const nums = q.choices.map(unit);
  const dist = (x) => (Number.isFinite(x) ? (log ? Math.abs(Math.log(x / value)) : Math.abs(x - value)) : Infinity);
  let best = 0;
  nums.forEach((x, i) => { if (dist(x) < dist(nums[best])) best = i; });
  expect(Number.isFinite(nums[best]), `no numeric choice in "${q.q}"`).toBe(true);
  expect(keyOf(q), `"${q.q}": computed ${value}, nearest choice is "${q.choices[best]}"`).toBe(q.choices[best]);
}

// Real/virtual, upright/inverted, larger/smaller, from the thin-lens equation.
function imageWords(f, dO) {
  const dI = 1 / (1 / f - 1 / dO);
  const m = -dI / dO;
  return { dI, m, type: dI > 0 ? 'Real' : 'Virtual', orient: m < 0 ? 'inverted' : 'upright', bigger: Math.abs(m) > 1 };
}

describe('Optics quiz — numeric keys follow from the physics', () => {
  it('concave mirror, object inside f: virtual, upright, larger', () => {
    const w = imageWords(10, 5);
    const key = keyOf(question('A concave mirror has f = 10 cm. An object is placed 5 cm in front.'));
    expect(key).toBe(`${w.type}, ${w.orient}, ${w.bigger ? 'larger' : 'smaller'}`);
  });

  it('convex mirror: the keyed size IS the magnification (0.4, not "1/2")', () => {
    const w = imageWords(-20, 30);
    const q = question('A convex mirror with |f| = 20 cm has an object 30 cm in front.');
    expect(keyOf(q)).toBe(`${w.type}, ${w.orient}, ${w.m.toFixed(1)}× size`);
  });

  it('converging lens beyond f: real, inverted, larger', () => {
    const w = imageWords(12, 20);
    const key = keyOf(question('A converging lens has f = 12 cm. An object is at 20 cm.'));
    expect(key.startsWith(`${w.type}, ${w.orient}, ${w.bigger ? 'larger' : 'smaller'}`), key).toBe(true);
  });

  it('Snell and critical angle', () => {
    expectNearestIsKey(question('n₁ = 1.50, n₂ = 1.00, θ₁ = 30°'), Math.asin(1.5 * Math.sin(30 * DEG)) / DEG);
    expectNearestIsKey(question('critical angle 42°'), 1 / Math.sin(42 * DEG));
  });

  it('grating first orders', () => {
    expectNearestIsKey(question('500 lines/mm and 600 nm'), Math.asin(600e-9 / (1e-3 / 500)) / DEG);
    expectNearestIsKey(question('1000 lines per mm. Light at 600 nm'), Math.asin(600e-9 / (1e-3 / 1000)) / DEG);
  });

  it("Malus's law and the three-polarizer chain", () => {
    expectNearestIsKey(question('I = 100 W/m²'), 100 * Math.cos(60 * DEG) ** 2);
    const frac = (t) => (/^0$/.test(t) ? 0 : t.includes('/') ? Number(t.split('/')[0]) / Number(t.split('/')[1]) : NaN);
    expectNearestIsKey(question('P₁ at 0°, P₂ at 45°, P₃ at 90°'),
      0.5 * Math.cos(45 * DEG) ** 2 * Math.cos(45 * DEG) ** 2, frac);
  });

  it('telescope resolution, mirror radius and reading-glass focal length', () => {
    const arcsec = (t) => { const n = Number((t.match(/\d+(?:\.\d+)?/) || [])[0]); return /arcmin/.test(t) ? n * 60 : n; };
    expectNearestIsKey(question('A 1 m telescope at 500 nm'), 1.22 * 500e-9 / 1 * RAD_TO_ARCSEC, arcsec, true);
    expectNearestIsKey(question('radius of curvature R = 30 cm'), 30 / 2);
    expectNearestIsKey(question('+1.5 D reading glasses'), 100 / 1.5);
  });
});

describe('Optics quiz — conceptual keys', () => {
  it('does not key the absorption/re-emission misconception as the reason light slows in glass', () => {
    const q = question('Why is the speed of light slower in glass than in vacuum?');
    expect(keyOf(q), 'the keyed answer is the misconception').not.toMatch(/absor|re-emi/i);
    expect(keyOf(q)).toMatch(/oscillat/i);
    // The misconception stays as a distractor, and the explanation names it.
    expect(q.choices.some((c) => /absorbs the light and re-emits/i.test(c)), 'the named distractor is gone').toBe(true);
    expect(q.explain).toMatch(/NOT absorption and re-emission/);
  });

  it('compares a grating with a DOUBLE slit, whose peak angles it shares', () => {
    const q = question('a diffraction grating with many slits produces:');
    expect(q.q).toMatch(/double slit with the same slit spacing/i);
    expect(q.q).not.toMatch(/single slit/i);
  });

  it('has exactly one true answer for the speed of light', () => {
    const q = question('The speed of light c in vacuum is:');
    expect(keyOf(q)).toMatch(/299,792,458/);
    const alsoTrue = q.choices.filter((c, i) => i !== q.correct && /300 million m\/s|3(?:\.0)?\s*×\s*10⁸/.test(c));
    expect(alsoTrue, 'a distractor is also correct').toEqual([]);
  });
});

describe('Optics — Rayleigh ratios match (λ_red/λ_blue)⁴', () => {
  it('every stated blue-to-red ratio in the source is the fourth-power ratio of ITS OWN wavelengths', () => {
    const re = /\((?:λ ≈ )?(\d{3}) nm\) scatters (?:about |~)(\d+(?:\.\d+)?)× more(?: strongly)? than red \((?:λ ≈ )?(\d{3}) nm\)/g;
    const found = [...SRC.matchAll(re)];
    // Quiz, extra quiz, encyclopedia, teaching tip and glossary each state one.
    expect(found.length, 'the ratio sentences were reworded; this check now guards nothing').toBeGreaterThanOrEqual(5);
    // A ratio stated WITHOUT its wavelengths cannot be checked, so it is not
    // allowed: the glossary said "~5.6× more than red" with no numbers at all.
    const loose = [...SRC.matchAll(/scatters (?:about |~)\d+(?:\.\d+)?× more/g)];
    expect(loose.length, 'a blue/red ratio is stated without the wavelengths it was computed from')
      .toBe(found.length);
    for (const [text, blue, stated, red] of found) {
      const ratio = (Number(red) / Number(blue)) ** 4;
      expect(Math.abs(Number(stated) - ratio) / ratio, `"${text}" — (${red}/${blue})⁴ = ${ratio.toFixed(2)}`).toBeLessThan(0.05);
    }
  });

  it('the sunset simulation prints the ratio of the bands it simulates', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
    const html = renderTool('opticsLab', { opticsLab: { mode: 'phenomena', phenoSub: 'sunset' } });
    const m = html.match(/Blue light \((\d{3}) nm\) scatters about (\d+(?:\.\d+)?)× more strongly than red \((\d{3}) nm\)/);
    expect(m, 'sunset explanation not rendered').toBeTruthy();
    const ratio = (Number(m[3]) / Number(m[1])) ** 4;
    expect(Number(m[2])).toBeCloseTo(ratio, 1);
  }, RENDER_TIMEOUT);
});

describe('Optics grating caption — describes what the screen actually shows', () => {
  // It promised "the classic 1 m setup's first-order peaks" at every setting,
  // but the shared default screen distance is 1.5 m, where m = ±1 lands off
  // the ±500 mm screen: one spot under a caption describing three.
  const FIT = 'the first-order peaks fit on this fixed 1000 mm screen';
  const ONLY = 'only the central peak is on this fixed 1000 mm screen right now';
  const firstOrderMm = (nm, linesPerMm, L) => L * Math.tan(Math.asin(nm * 1e-9 / (1e-3 / linesPerMm))) * 1000;

  function caption(state) {
    resetStemLab();
    loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
    return renderTool('opticsLab', { opticsLab: { mode: 'diffraction', diffMode: 'grating', ...state } });
  }

  it('says only the central peak shows at the default 1.5 m, and names the fixes', () => {
    expect(firstOrderMm(600, 600, 1.5), 'defaults moved; this case no longer puts m=1 off screen').toBeGreaterThan(500);
    const html = caption({ diffLambda: 600, diffGrating: 600, diffScreenL: 1.5 });
    expect(html).toContain(ONLY);
    expect(html).not.toContain(FIT);
    expect(html).toContain('pick the Grating quick setup');
  }, RENDER_TIMEOUT);

  it('says the first orders fit once the Grating quick setup puts them on screen', () => {
    expect(firstOrderMm(633, 600, 1.0), 'preset moved; m=1 no longer on screen').toBeLessThan(500);
    const html = caption({ diffLambda: 633, diffGrating: 600, diffScreenL: 1.0 });
    expect(html).toContain(FIT);
    expect(html).not.toContain(ONLY);
  }, RENDER_TIMEOUT);

  it('does not say WHY the orders are missing, which is the held answer', () => {
    const html = caption({ diffLambda: 600, diffGrating: 600, diffScreenL: 1.5 });
    const note = html.match(/Physical-scale view:[^<]*/)[0];
    expect(note).not.toMatch(/mλ|m lambda|no real|sin ?θ|off the edge because/i);
  }, RENDER_TIMEOUT);
});

describe('Optics worked problems — answers follow from the givens', () => {
  it('counts FRINGES in the centered window, not spacings', () => {
    const p = problem('wpa3');
    const spacingMm = 632.8e-9 * 1.5 / 1e-4 * 1000;
    let count = 0;
    for (let m = -10; m <= 10; m += 1) if (Math.abs(m * spacingMm) <= 10) count += 1;
    expect(p.problem).toMatch(/centered on the central maximum/);
    expect(p.answer).toContain(`${count} bright fringes`);
  });

  it("Hubble's Rayleigh limit", () => {
    const arcsec = 1.22 * 500e-9 / 2.4 * RAD_TO_ARCSEC;
    expect(problem('wpa4').answer).toContain(`${arcsec.toFixed(3)} arcsec`);
  });

  it('reading glasses round to the NEAREST 0.25 D step', () => {
    const power = 1 / 0.25 - 1 / 0.75;
    const stock = Math.round(power * 4) / 4;
    const a = problem('wpa8').answer;
    expect(a).toContain(`+${power.toFixed(2)} D`);
    expect(a).toContain(`+${stock.toFixed(2)} D`);
  });

  it("lensmaker: the radii's signs match the lens the problem names", () => {
    const p = problem('wp_l5');
    const [r1, r2] = p.given.filter((g) => /^R/.test(g)).map((g) => Number(g.match(/[+−-]\d+/)[0].replace('−', '-')));
    const f = 1 / ((1.5 - 1) * (1 / r1 - 1 / r2));
    expect(p.answer).toContain(`f = ${Math.round(f)} cm`);
    // Opposite signs = both faces bulge outward = biconvex, not "convex and concave".
    if (Math.sign(r1) !== Math.sign(r2)) {
      expect(p.problem).toMatch(/biconvex/i);
      expect(p.problem).not.toMatch(/concave surface/i);
    }
  });
});

describe('Optics records and trivia — stated comparisons are arithmetic', () => {
  const recordText = (title) => {
    const r = RECORDS.find((x) => x.title === title);
    expect(r, `record "${title}" is gone`).toBeTruthy();
    return `${r.value} ${r.context}`;
  };

  it('attoseconds vs a femtosecond', () => {
    const t = recordText('Shortest light pulse ever made');
    const as = Number(t.match(/(\d+) attoseconds/)[1]);
    const times = Number(t.match(/about (\d+) times shorter than a femtosecond/)[1]);
    expect(times).toBe(Math.round(1000 / as));
  });

  it('fibre loss in dB/km compounds over distance', () => {
    const t = recordText('Clearest glass');
    const dbPerKm = Number(t.match(/about ([\d.]+) dB\/km/)[1]);
    const left = (km) => Math.round(100 * 10 ** (-dbPerKm * km / 10));
    expect(t).toContain(`about ${left(1)}% of the light remains after 1 km`);
    expect(t).toContain(`only about ${left(100)}% after 100 km`);
  });

  it('CO₂ wavelength vs red, MINFLUX vs the diffraction limit, EHT on the Moon', () => {
    const co2 = recordText('Far-infrared workhorse laser');
    expect(co2).toContain(`about ${Math.round(10600 / 700)} times longer than red light`);

    const minflux = recordText('Highest-resolution optical microscope');
    const [lo, hi] = minflux.match(/~(\d+) to (\d+) nm/).slice(1).map(Number);
    const claimed = Number(minflux.match(/About (\d+) times finer/)[1]);
    expect(claimed).toBeGreaterThanOrEqual(250 / hi);
    expect(claimed).toBeLessThanOrEqual(250 / lo);

    const eht = recordText('Highest-resolution telescope (operational)');
    const uas = Number(eht.match(/~(\d+) microarcseconds/)[1]);
    const cm = 384400e3 * (uas * 1e-6 / RAD_TO_ARCSEC) * 100;
    expect(eht).toContain(`about ${Math.round(cm)} cm`);
  });

  it('radiation pressure of sunlight and the 20/20 comparison', () => {
    const pressure = TRIVIA.find((x) => /Light has momentum/.test(x.text)).text;
    expect(pressure).toContain(`about ${(1361 / C * 1e6).toFixed(1)} micropascals`);
    const acuity = TRIVIA.find((x) => /20\/20/.test(x.text)).text;
    expect(acuity).toContain(`about ${Math.round(10 * Math.tan(DEG / 60) * 1000)} mm seen from 10 m`);
  });

  it('does not repeat the "sunset is 8 minutes late" misconception', () => {
    const sun = TRIVIA.find((x) => /8 minutes 20 seconds/.test(x.text));
    expect(sun, 'the light-travel-time fact is gone').toBeTruthy();
    expect(sun.text).not.toMatch(/set 8 minutes earlier/);
    expect(sun.text).toMatch(/does NOT make sunset 8 minutes late/);
  });
});

describe('Optics quotes — attributable, or not shown', () => {
  it('drops the quotes no source could be found for', () => {
    // Searched Sept 2026: none of these appear in any source attributed to the
    // named person. A real person's name on words they never said is worse
    // than one fewer quote.
    const unsourced = [
      'must consider it a fairy tale',
      'We will lose the night sky to light pollution',
      'You don\'t need to be an Einstein',
      'without the observer being part of the description',
      'no one was telling us what to do',
    ];
    const all = QUOTES.map((q) => q.text).join('\n');
    for (const u of unsourced) expect(all, u).not.toContain(u);
    expect(QUOTES.length, 'the quotes table emptied').toBeGreaterThan(20);
  });

  it("quotes Longfellow's stanza as written", () => {
    const q = QUOTES.find((x) => /Longfellow/.test(x.author));
    expect(q.text).toMatch(/And my youth comes back to me\.$/);
    expect(q.text).not.toMatch(/sea-mist/);
  });
});

describe('Optics EM spectrum table — bands are self-consistent', () => {
  const BANDS = rows('EM_SPECTRUM_BANDS');
  const LEN = { km: 1e3, m: 1, cm: 1e-2, mm: 1e-3, 'μm': 1e-6, nm: 1e-9 };
  const FRQ = { Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9, THz: 1e12, PHz: 1e15, EHz: 1e18 };

  // "315-400 nm", "100 m to 100 km", "952 THz - 1.1 PHz" -> [lo, hi] in SI.
  function span(text, units) {
    if (/^\s*[<>]/.test(text)) return null;          // open-ended ELF / gamma
    const parts = text.split(/\s*(?:\bto\b|-|–)\s*/);
    if (parts.length !== 2) return null;
    const one = (t) => { const m = t.trim().match(/^([\d.]+)\s*([a-zA-Zμ]+)?$/); return m && { n: Number(m[1]), u: m[2] }; };
    const a = one(parts[0]); const b = one(parts[1]);
    if (!a || !b) return null;
    const ua = a.u || b.u; const ub = b.u || a.u;
    if (!(ua in units) || !(ub in units)) return null;
    return [a.n * units[ua], b.n * units[ub]];
  }

  it('each band\'s frequency span is c/λ of its wavelength span', () => {
    let checked = 0;
    for (const b of BANDS) {
      const lam = span(b.range, LEN);
      const f = span(b.freq, FRQ);
      if (!lam || !f) continue;
      checked += 1;
      const fLo = C / lam[1]; const fHi = C / lam[0];
      expect(Math.abs(f[0] - fLo) / fLo, `${b.band}: ${b.freq} low edge vs c/${b.range}`).toBeLessThan(0.04);
      expect(Math.abs(f[1] - fHi) / fHi, `${b.band}: ${b.freq} high edge vs c/${b.range}`).toBeLessThan(0.04);
    }
    expect(checked, 'band strings stopped parsing; this check guards nothing').toBeGreaterThanOrEqual(24);
  });

  it('every wavelength a band cites as an example lies inside that band', () => {
    // Blu-ray (405 nm) was listed under blue (430-480), KrF (248 nm) under
    // UV-B (280-315), the 1310 nm fibre band under 700 nm-1 μm.
    let checked = 0;
    for (const b of BANDS) {
      const lam = span(b.range, LEN);
      if (!lam) continue;
      for (const m of `${b.uses} ${b.examples}`.matchAll(/(\d+(?:\.\d+)?)\s?(nm|μm)\b/g)) {
        const v = Number(m[1]) * LEN[m[2]];
        checked += 1;
        expect(v >= lam[0] * 0.999 && v <= lam[1] * 1.001, `${b.band} (${b.range}) cites ${m[0]}`).toBe(true);
      }
    }
    expect(checked, 'no examples parsed').toBeGreaterThanOrEqual(15);
  });
});

describe('Optics animal acuity — raptors, not "5-8×"', () => {
  it('never claims more than ~3× human acuity for hawks or eagles', () => {
    // Measured raptor acuity (wedge-tailed eagle, the record) is about 2.5×
    // human. "5×" and "5-8×" appeared in three tables.
    const texts = [
      ...rows('ANIMAL_VISION').map((a) => `${a.name}: ${a.acuity}. ${a.details}`),
      ...TRIVIA.map((x) => x.text),
    ].filter((t) => /hawk|eagle|raptor/i.test(t));
    expect(texts.length, 'the raptor entries are gone').toBeGreaterThanOrEqual(3);
    for (const t of texts) {
      for (const m of t.matchAll(/(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*×\s*(?:sharper|better|finer)/g)) {
        expect(Number(m[2] || m[1]), t).toBeLessThanOrEqual(3);
      }
      expect(t).not.toMatch(/\b[4-9](?:\.\d)?\s*[-–]?\s*\d*\s*× (?:sharper|better)/);
    }
  });
});

describe('Optics Fresnel model — no false orders from sampling the aperture', () => {
  // The Fresnel field summed N point sources across each opening. A row of
  // point sources is a grating, so it threw a false order at y = λz/(a/N): a
  // full-height spike at 86 mm for a 100 μm slit at 0.3 m (N = 48), inside
  // the ±90 mm screen. Read the tool's OWN detector there.
  const BASE = { mode: 'diffraction', diffPropagationModel: 'fresnel', diffMode: 'single',
    diffLambda: 600, diffSlitWidth: 100, diffScreenL: 0.3 };

  function detector(probeMm) {
    resetStemLab();
    loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
    const html = renderTool('opticsLab', { opticsLab: withPrediction('diffraction', { ...BASE, diffScreenProbeMm: probeMm }) });
    const tag = html.match(/<circle[^>]*data-op-intensity-profile-detector="diffraction"[^>]*>/);
    expect(tag, 'intensity-profile detector not rendered').toBeTruthy();
    return Number(tag[0].match(/data-op-detector-intensity="([^"]+)"/)[1]);
  }

  it('reads the central maximum at the centre, so the readout is live', () => {
    expect(detector(0)).toBeGreaterThan(0.95);
  }, RENDER_TIMEOUT);

  it('reads darkness where 48 sampled sources put a false order', () => {
    const aliasMm = 600e-9 * 0.3 / (100e-6 / 48) * 1000;
    expect(aliasMm, 'the alias no longer falls on the ±90 mm screen').toBeLessThan(90);
    // Single-slit intensity there: sinc² of β = π a y / λ L ≈ 45π, ~5e-5.
    expect(detector(Math.round(aliasMm))).toBeLessThan(0.001);
  }, RENDER_TIMEOUT);
});

describe('Optics history — one chronological timeline, dates that check out', () => {
  // The panel printed OPTICS_HISTORY, then OPTICS_HISTORY_MORE appended after
  // it, so the timeline ran to 2025 and restarted at ~430 BCE; three events
  // appeared twice. Read the RENDERED order, not the tables.
  function renderedYears() {
    resetStemLab();
    loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
    const html = renderTool('opticsLab', { opticsLab: { mode: 'history', historyLimit: 500 } });
    return [...html.matchAll(/font-family:ui-monospace, Menlo, monospace"[^>]*>([^<]+)</g)].map((m) => m[1]);
  }
  const yearOf = (label) => {
    const m = String(label).match(/\d+/);
    return /BC/.test(label) ? -Number(m[0]) : Number(m[0]);
  };

  it('renders every milestone in date order', () => {
    const years = renderedYears();
    expect(years.length, 'history years not found in the render').toBeGreaterThan(100);
    const out = [];
    for (let i = 1; i < years.length; i += 1) {
      if (yearOf(years[i]) < yearOf(years[i - 1])) out.push(`${years[i - 1]} then ${years[i]}`);
    }
    expect(out, 'out of order').toEqual([]);
  }, RENDER_TIMEOUT);

  it('lists each of the three once-duplicated events once', () => {
    const all = [...rows('OPTICS_HISTORY'), ...rows('OPTICS_HISTORY_MORE')];
    const count = (yearRe, eventRe) => all.filter((e) => yearRe.test(e.year) && eventRe.test(e.event)).length;
    expect(count(/^1962$/, /semiconductor|diode/i), 'the 1962 diode laser').toBe(1);
    expect(count(/^19(69|70|71)$/, /CCD|charge-coupled/i), 'the invention of the CCD').toBe(1);
    expect(count(/^186[45]$/, /Dynamical Theory/), "Maxwell's Dynamical Theory").toBe(1);
  });

  it('keeps the corrected dates and attributions', () => {
    const all = [...rows('OPTICS_HISTORY'), ...rows('OPTICS_HISTORY_MORE')];
    const find = (re) => { const e = all.find((x) => re.test(x.event)); expect(e, String(re)).toBeTruthy(); return e; };
    expect(find(/Nimrud lens/).year).toBe('~750 BCE');
    expect(find(/Eyeglasses are invented/).event).toMatch(/forged epitaph/);
    expect(find(/Compact Disc/).year).toBe('1982');
    expect(find(/infrared radiation/).year).toBe('1800');
    expect(find(/Boulevard du Temple/).year).toBe('1838');
    expect(find(/Hipparcos/).year).toBe('1997');
    expect(find(/Portland Head Light receives/).event).toMatch(/fourth-order/);
    expect(all.some((e) => /Tartaglia/.test(e.event)), 'the unsourced Tartaglia telescope is back').toBe(false);
  });
});

describe('Optics scientists — real people, their own words', () => {
  const PEOPLE = rows('FAMOUS_OPTICIANS', 'FAMOUS_OPTICIANS_MORE');

  it('lists each scientist once', () => {
    const seen = new Set();
    const dupes = PEOPLE.map((p) => p.name).filter((n) => (seen.has(n) ? true : (seen.add(n), false)));
    expect(dupes, 'Roy Glauber was listed twice').toEqual([]);
  });

  it('carries no invented person, credit or quote', () => {
    // Searched Sept 2026: no source for any of these. "Tony Minkowski" matches
    // no vision scientist; Faggin did not make the CCD practical; the Goos of
    // the Goos–Hänchen shift was Fritz.
    const text = JSON.stringify(PEOPLE);
    for (const bad of ['Tony Minkowski', 'Karl Wieland Goos', 'Faggin', 'Approbavit nemo',
      'Nobel address, 2009', 'riffing on Feynman', 'no such thing as a fundamental limit',
      'Why should we be content with measuring', 'taught the photon', 'You don\'t need to be an Einstein',
      'no one was telling us what to do', 'BEC isn\'t just colder']) {
      expect(text, bad).not.toContain(bad);
    }
    expect(PEOPLE.length, 'the scientists table emptied').toBeGreaterThanOrEqual(50);
  });

  function openCard(id) {
    resetStemLab();
    loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
    return renderTool('opticsLab', { opticsLab: { mode: 'scientists', scientistOpenId: id, scientistLimit: 200 } });
  }
  const quoteBoxes = (html) => [...html.matchAll(/background:rgba\(251,191,36,0\.06\)[^>]*>([^<]*)</g)].map((m) => m[1]);

  it('shows a real quote exactly as written, with no doubled or stray marks', () => {
    const boxes = quoteBoxes(openCard('gaborD'));
    expect(boxes.length, 'no quote box on an entry that has a quote').toBe(1);
    expect(boxes[0]).toMatch(/^(&quot;|")The future cannot be predicted/);
    expect(boxes[0]).not.toMatch(/(&quot;|")\s*$/);
  }, RENDER_TIMEOUT);

  it('shows no quote box where no quote is documented', () => {
    expect(quoteBoxes(openCard('fraunhofer'))).toEqual([]);
    expect(quoteBoxes(openCard('witelo')), 'a "(no quote)" note rendered as a quotation').toEqual([]);
  }, RENDER_TIMEOUT);
});

describe('Optics encyclopedia — numbers that follow from the formulas it states', () => {
  const PHEN = rows('OPTICAL_PHENOMENA_DB', 'OPTICAL_PHENOMENA_DB_MORE');
  const text = (name) => {
    const e = PHEN.find((x) => x.name === name);
    expect(e, `encyclopedia entry "${name}" is gone`).toBeTruthy();
    return [e.physics, e.funFact, e.whereSeen].join(' ');
  };

  it("Snell's window is 2·asin(1/1.333) across, about 97°", () => {
    const deg = 2 * Math.asin(1 / 1.333) / DEG;
    for (const name of ['Total internal reflection', 'Apparent depth']) {
      const m = text(name).match(/about (\d+)° wide/);
      expect(m, `${name}: window width not stated`).toBeTruthy();
      expect(Math.abs(Number(m[1]) - deg), `${name}: ${m[1]}° vs ${deg.toFixed(1)}°`).toBeLessThan(0.6);
    }
  });

  it('uncoated lens losses compound per surface: 1 − 0.96^24', () => {
    const t = text('Fresnel equations');
    const [, surfaces, lost] = t.match(/(\d+) air-glass surfaces would lose ~(\d+)%/);
    expect(Number(lost)).toBe(Math.round(100 * (1 - 0.96 ** Number(surfaces))));
  });

  it("Brewster glare: the Sun's elevation is 90° − atan(1.33)", () => {
    const t = text("Brewster's angle reflection");
    const brewster = Math.atan(1.33) / DEG;
    expect(t).toContain(`about ${Math.round(brewster)}°`);
    expect(t).toContain(`The Sun at ${Math.round(90 - brewster)}° above the horizon`);
  });

  it('does not tell students flicker above ~20 Hz looks steady', () => {
    const t = text('Persistence of vision');
    expect(t).not.toMatch(/faster than ~20 Hz/);
    expect(t).toMatch(/critical flicker fusion frequency \(roughly 50–90 Hz/);
  });
});

describe('Optics misconceptions — the "right" side is right', () => {
  // The MISCONCEPTIONS table is an object of per-topic arrays; read it whole.
  const start = SRC.indexOf('  var MISCONCEPTIONS = {');
  const end = SRC.indexOf('\n  };', start);
  const M = vm.runInNewContext(`(${SRC.slice(start + '  var MISCONCEPTIONS = '.length, end + 4)})`, {});
  const all = Object.values(M).flat();

  it('parses, so the checks below guard something', () => {
    expect(all.length).toBeGreaterThanOrEqual(15);
  });

  it('does not call Young\'s sunlight double slit a misconception', () => {
    // Young (1803) saw the fringes in sunlight, after a pinhole.
    expect(all.some((m) => /You can see double-slit interference with sunlight/.test(m.wrong))).toBe(false);
    const coherence = all.find((m) => /Any light source makes clear double-slit fringes/.test(m.wrong));
    expect(coherence, 'the coherence misconception is gone').toBeTruthy();
    expect(coherence.right).toMatch(/Young \(1803\).*pinhole/);
  });

  it('does not say extra slits leave the transmitted power unchanged', () => {
    const slits = all.find((m) => /More slits/.test(m.wrong));
    expect(slits.right).not.toMatch(/total transmitted power is roughly the same/i);
    expect(slits.right).toMatch(/N²/);
  });

  it('every "wrong" line is actually wrong: none is conceded as true', () => {
    for (const m of all) expect(m.right, m.wrong).not.toMatch(/^True for/);
  });
});

describe('Optics mirage — rays really curve, and the heat slider really matters', () => {
  // The old tracer re-derived each ray's angle with a sign-blind Snell step:
  // at every slider value the three rays were the same straight lines, none
  // ever turned, and the "upward" ray headed down.
  function mirage(grad) {
    resetStemLab();
    loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
    const html = renderTool('opticsLab', { opticsLab: { mode: 'phenomena', phenoSub: 'mirage', phenoMirageGrad: grad } });
    const rays = [...html.matchAll(/data-op-mirage-ray="([a-z]+)" data-launch-deg="([\d.]+)" data-turned="(true|false)"/g)]
      .map((m) => ({ fate: m[1], launch: Number(m[2]), turned: m[3] === 'true' }));
    const headline = (html.match(/data-op-mirage-headline="true"[^>]*>([^<]+)</) || [])[1] || '';
    const crit = Number((headline.match(/within ([\d.]+)° of horizontal/) || [])[1]);
    const rise = Number((headline.match(/\+(\d+) °C/) || [])[1]);
    return { rays, headline, crit, rise };
  }

  it('turns no ray when the road is not heated', () => {
    const m = mirage(0);
    expect(m.rays.length, 'mirage rays not rendered').toBeGreaterThanOrEqual(6);
    expect(m.rays.filter((r) => r.turned)).toEqual([]);
    expect(m.headline).toMatch(/No heating/);
  }, RENDER_TIMEOUT);

  it('turns more rays, never fewer, as the road gets hotter', () => {
    const turned = [0, 0.3, 0.6, 1].map((g) => mirage(g).rays.filter((r) => r.turned).length);
    for (let i = 1; i < turned.length; i += 1) expect(turned[i], `turned rays ${turned.join(' → ')}`).toBeGreaterThanOrEqual(turned[i - 1]);
    expect(turned[3]).toBeGreaterThan(turned[0]);
  }, RENDER_TIMEOUT);

  it('at full heat shows both mirages: the upside-down tree and the sky "puddle"', () => {
    const m = mirage(1);
    const fates = new Set(m.rays.map((r) => r.fate));
    expect(fates.has('inverted'), 'no upside-down image').toBe(true);
    expect(fates.has('puddle'), 'no sky seen on the road').toBe(true);
    expect(m.rise, 'road-air temperature rise').toBeGreaterThan(20);
    expect(m.rise).toBeLessThan(60);
  }, RENDER_TIMEOUT);

  it('obeys its own critical angle: a ray within it turns, a ray beyond it reaches the road', () => {
    for (const g of [0.3, 0.6, 1]) {
      const m = mirage(g);
      expect(Number.isFinite(m.crit), `no critical angle printed at ${g}`).toBe(true);
      for (const r of m.rays) {
        if (r.turned) expect(r.launch, `turned beyond ${m.crit}°`).toBeLessThanOrEqual(m.crit + 0.005);
        if (r.fate === 'road') expect(r.launch, `reached the road within ${m.crit}°`).toBeGreaterThanOrEqual(m.crit - 0.005);
      }
    }
  }, RENDER_TIMEOUT);
});

describe('Optics rainbow — the bow sits where minimum deviation puts it', () => {
  // The arcs were hand-typed (red 42.0°, violet 39.7°) and the antisolar point
  // used a different scale from the bow, so the apex the scene drew was not the
  // "bow angle − sun altitude" it printed.
  const bowDeg = (n) => {
    const i = Math.acos(Math.sqrt((n * n - 1) / 3));
    const r = Math.asin(Math.sin(i) / n);
    return (4 * r - 2 * i) / DEG;
  };
  function rainbow(sunAlt) {
    resetStemLab();
    loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
    const html = renderTool('opticsLab', { opticsLab: { mode: 'phenomena', phenoSub: 'rainbow', phenoRbSunAlt: sunAlt } });
    const arcs = Object.fromEntries([...html.matchAll(/data-op-rainbow-nm="(\d+)" data-op-rainbow-deg="([\d.]+)"/g)].map((m) => [m[1], Number(m[2])]));
    const n = html.match(/\(red ([\d.]+), violet ([\d.]+)\)/);
    const apex = Number((html.match(/data-op-rainbow-apex="([\d.]+)"/) || [])[1]);
    return { arcs, nRed: n && Number(n[1]), nViolet: n && Number(n[2]), apex, html };
  }

  it('draws red and violet at the minimum-deviation angles of the n it states', () => {
    const r = rainbow(25);
    expect(r.nRed, 'the explanation no longer states n').toBeTruthy();
    expect(r.arcs['700'], 'red arc angle').toBeCloseTo(bowDeg(r.nRed), 2);
    expect(r.arcs['400'], 'violet arc angle').toBeCloseTo(bowDeg(r.nViolet), 2);
    // Every band between them, in order: red outermost, violet innermost.
    const order = ['700', '620', '580', '530', '490', '450', '400'].map((k) => r.arcs[k]);
    for (let i = 1; i < order.length; i += 1) expect(order[i]).toBeLessThan(order[i - 1]);
  }, RENDER_TIMEOUT);

  it('draws the sunlight-to-eye rays that "Show rays" promises, one per colour band', () => {
    // Every drop sat below the horizon and was filtered out: the rays never drew.
    const low = rainbow(25);
    const drops = [...low.html.matchAll(/data-op-rainbow-drop-nm="(\d+)"/g)].map((m) => m[1]);
    expect(drops.length, 'no drop rays drawn with the sun at 25°').toBeGreaterThanOrEqual(3);
    expect(new Set(drops).size, 'drops share a colour band').toBe(drops.length);
    const high = rainbow(45);
    expect(high.html).not.toMatch(/data-op-rainbow-drop-nm=/);
  }, RENDER_TIMEOUT);

  it('prints the apex as bow angle minus sun altitude, and the spread it draws', () => {
    for (const sun of [0, 25, 40]) {
      const r = rainbow(sun);
      expect(r.apex, `apex at sun ${sun}°`).toBeCloseTo(Math.max(0, r.arcs['700'] - sun), 1);
    }
    const r = rainbow(25);
    const spread = (r.arcs['700'] - r.arcs['400']).toFixed(1);
    expect(r.html).toContain(`That ${spread}° spread is the rainbow.`);
  }, RENDER_TIMEOUT);
});

describe('Optics prism — the deviation table is the textbook D = i + e − A', () => {
  // It printed 180° − D (about 141° for a 60° flint prism at 45°, where D is
  // 51°), and drew the white beam on the wrong side of the face normal.
  function prism(state) {
    resetStemLab();
    loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
    const html = renderTool('opticsLab', { opticsLab: { mode: 'phenomena', phenoSub: 'prism', ...state } });
    return [...html.matchAll(/\((\d+) nm\)<\/td><td[^>]*>n = ([\d.]+)<\/td><td[^>]*>D = ([\d.]+)°/g)]
      .map((m) => ({ nm: Number(m[1]), n: Number(m[2]), D: Number(m[3]) }));
  }
  const textbookD = (A, i, n) => {
    const r1 = Math.asin(Math.sin(i * DEG) / n) / DEG;
    const e = Math.asin(n * Math.sin((A - r1) * DEG)) / DEG;
    return i + e - A;
  };

  for (const [A, i, mat] of [[60, 45, 'flint'], [60, 50, 'crown'], [45, 30, 'water']]) {
    it(`${mat}, apex ${A}°, incidence ${i}°`, () => {
      const rows = prism({ phenoPrismMat: mat, phenoPrismApex: A, phenoPrismInc: i });
      expect(rows.length, 'deviation table not rendered').toBeGreaterThanOrEqual(6);
      for (const r of rows) {
        expect(r.D, `${r.nm} nm with n = ${r.n}`).toBeCloseTo(textbookD(A, i, r.n), 1);
      }
      // Violet (higher n) is deviated more than red.
      expect(rows[0].D).toBeGreaterThan(rows[rows.length - 1].D);
    }, RENDER_TIMEOUT);
  }
});

describe('Optics eye — glasses follow the vergence rule 1/d′ = 1/d − P', () => {
  // The sign was + P: every pair of glasses made the eye worse. The
  // auto-prescribed −3.5 D lenses moved a myope's far point from 28 cm in to
  // 14 cm, and +3 D reading glasses pushed a hyperope's near point from 20 cm
  // out to 53 cm.
  function eye(state) {
    resetStemLab();
    loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
    const html = renderTool('opticsLab', { opticsLab: { mode: 'phenomena', phenoSub: 'eye', ...state } });
    const read = (label) => {
      const m = html.match(new RegExp(`${label}: ~(∞|[0-9]+) cm|${label}: ~(∞)`));
      expect(m, `${label} not rendered`).toBeTruthy();
      return (m[1] || m[2]) === '∞' ? Infinity : Number(m[1]);
    };
    return { near: read('Near point'), far: read('Far point') };
  }

  it('a myope corrected by −1/(far point) sees to infinity, and the near point moves OUT', () => {
    const bare = eye({ phenoEyeCondition: 'myopia', phenoEyeGlasses: false });
    expect(Number.isFinite(bare.far), 'a myope has a finite far point').toBe(true);
    const rx = -Math.round((100 / bare.far) * 4) / 4;
    const worn = eye({ phenoEyeCondition: 'myopia', phenoEyeGlasses: true, phenoEyeGlassesD: rx });
    expect(worn.far === Infinity || worn.far > 500, `far point with ${rx} D: ${worn.far} cm`).toBe(true);
    expect(worn.near).toBeGreaterThan(bare.near);
    expect(worn.near).toBeCloseTo(100 / (100 / bare.near + rx), -0.5);
  }, RENDER_TIMEOUT);

  it('+3 D reading glasses bring a hyperope\'s near point IN by the vergence rule', () => {
    const bare = eye({ phenoEyeCondition: 'hyperopia', phenoEyeGlasses: false });
    const worn = eye({ phenoEyeCondition: 'hyperopia', phenoEyeGlasses: true, phenoEyeGlassesD: 3 });
    expect(worn.near).toBeLessThan(bare.near);
    expect(Math.abs(worn.near - 100 / (100 / bare.near + 3)), `${worn.near} cm`).toBeLessThanOrEqual(1);
  }, RENDER_TIMEOUT);

  it('reading glasses on a normal eye blur the distance: far point 1/P', () => {
    const worn = eye({ phenoEyeCondition: 'normal', phenoEyeGlasses: true, phenoEyeGlassesD: 2 });
    expect(Math.abs(worn.far - 50), `far point ${worn.far} cm with +2 D`).toBeLessThanOrEqual(1);
  }, RENDER_TIMEOUT);
});

describe('Optics polarized sky — Rayleigh\'s P = sin²θ / (1 + cos²θ)', () => {
  function sky(state) {
    resetStemLab();
    loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
    const html = renderTool('opticsLab', { opticsLab: { mode: 'phenomena', phenoSub: 'polsky', ...state } });
    return [...html.matchAll(/data-op-sky-pol="([\d.]+)" data-op-sky-scatter-deg="([\d.]+)" data-op-sky-pass="([\d.]+)"/g)]
      .map((m) => ({ P: Number(m[1]), theta: Number(m[2]), pass: Number(m[3]) }));
  }

  it('peaks at 90° from the sun, under the ~75% real skies reach, and fades near the sun', () => {
    const tiles = sky({ phenoSkySunAz: 30, phenoSkyPolDeg: 0 });
    expect(tiles.length, 'sky tiles not rendered').toBeGreaterThan(100);
    for (const t of tiles) {
      const s2 = Math.sin(t.theta * DEG) ** 2;
      expect(t.P, `θ = ${t.theta}°`).toBeCloseTo(0.75 * s2 / (1 + (1 - s2)), 2);
    }
    const peak = tiles.reduce((a, b) => (b.P > a.P ? b : a));
    expect(Math.abs(peak.theta - 90), `peak at ${peak.theta}°`).toBeLessThan(12);
    expect(peak.P).toBeLessThanOrEqual(0.75);
    for (const t of tiles.filter((x) => x.theta < 15)) expect(t.P).toBeLessThan(0.06);
  }, RENDER_TIMEOUT);

  it('a nearly unpolarized patch passes about half whatever the polarizer does', () => {
    for (const pol of [0, 45, 90]) {
      for (const t of sky({ phenoSkySunAz: 30, phenoSkyPolDeg: pol }).filter((x) => x.P < 0.02)) {
        expect(Math.abs(t.pass - 1), `P ${t.P} at polarizer ${pol}°`).toBeLessThan(0.03);
      }
    }
  }, RENDER_TIMEOUT);
});

describe('Optics calculators — answers from the physics, not a shortcut', () => {
  function calc(sub, state) {
    resetStemLab();
    loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
    return renderTool('opticsLab', { opticsLab: { mode: 'calcs', calcSubTool: sub, ...state } });
  }

  it('AR coating: at quarter-wave thickness R = ((n_g − n_c²)/(n_g + n_c²))²', () => {
    // A closed form the calculator does not use. The old two-beam sum assumed
    // both reflections flip phase, so a DENSE coating (n 2.0 on 1.52 glass)
    // came out at 3.9%, below bare glass, where the truth is 20%.
    for (const [nc, ng] of [[1.38, 1.52], [1.23, 1.52], [2.0, 1.52]]) {
      const lambda = 550;
      const t = lambda / (4 * nc);
      const html = calc('arcoat', { arLambda: lambda, arNGlass: ng, arNCoat: nc, arT: t });
      const shown = [...html.matchAll(/>([\d.]+)%</g)].map((m) => Number(m[1]));
      expect(shown.length, 'no reflectance rendered').toBeGreaterThan(0);
      const expected = 100 * ((ng - nc * nc) / (ng + nc * nc)) ** 2;
      expect(shown[0], `n_coat ${nc} on ${ng}`).toBeCloseTo(expected, 1);
    }
  }, RENDER_TIMEOUT);

  it('EM spectrum slider: every wavelength it cites lands in its own band', () => {
    // HeNe (633 nm) read "Orange/Yellow" under a Red band citing HeNe; Blu-ray
    // (405 nm) was cited under Blue; the CO2 laser fell in Far IR.
    const cases = [[633e-9, 'Red'], [589e-9, 'Yellow'], [532e-9, 'Green'], [450e-9, 'Blue'], [405e-9, 'Violet'],
      [10.6e-6, 'Mid IR'], [1550e-9, 'Near IR'], [13.5e-9, 'UV-C/EUV'], [0.005e-9, 'Gamma rays']];
    for (const [lambda, band] of cases) {
      const html = calc('em', { emLogFreq: Math.log10(C / lambda) });
      expect(html, `${lambda} m`).toMatch(new RegExp('>' + band + '( [(]visible[)])?<'));
    }
  }, RENDER_TIMEOUT);

  it('fiber: calls V < 2.405 single-mode, and the telecom preset IS single-mode', () => {
    const vOf = (html) => Number(html.match(/V-NUMBER[^<]*<\/div><div[^>]*>([\d.]+)</)[1]);
    for (const [c, cl] of [[1.450, 1.444], [1.5, 1.47], [1.49, 1.402]]) {
      const html = calc('fiber', { fiberNCore: c, fiberNClad: cl });
      const v = vOf(html);
      const mode = html.match(/data-op-fiber-modes="(single|multi)"/)[1];
      expect(mode, `V = ${v}`).toBe(v < 2.405 ? 'single' : 'multi');
    }
    const telecom = calc('fiber', {});
    expect(telecom).toContain("Single-mode telecom (like SMF-28)");
    expect(vOf(calc('fiber', { fiberNCore: 1.450, fiberNClad: 1.444 }))).toBeLessThan(2.405);
  }, RENDER_TIMEOUT);
});

describe('Optics lab kits — every laser or Sun activity carries its warning', () => {
  const KITS = rows('OPTICS_LAB_KITS', 'OPTICS_LAB_KITS_MORE', 'OPTICS_LAB_KITS_FINAL');

  it('parses the kits', () => expect(KITS.length).toBeGreaterThanOrEqual(25));

  it('any kit with a laser in its materials limits the power and forbids looking into it', () => {
    // "Don't stack polarizers in laser beams — IR leaks" named a hazard that
    // does not exist and no power limit; "Class 3R laser only" read as if 3R
    // were REQUIRED rather than the ceiling.
    const laserKits = KITS.filter((k) => /laser/i.test(JSON.stringify(k.materials)));
    expect(laserKits.length, 'no laser kits found').toBeGreaterThanOrEqual(3);
    for (const k of laserKits) {
      expect(k.safety, `${k.title}: no power limit`).toMatch(/Class [23]|mW/);
      expect(k.safety, `${k.title}: no "never look/aim"`).toMatch(/never (look|aim)|Never (look|aim)/);
      expect(k.safety, `${k.title}`).not.toMatch(/Class 3R laser only/);
    }
  });

  it('any kit that uses sunlight warns about the Sun', () => {
    const sunKits = KITS.filter((k) => /\bsun(light)?\b/i.test(`${k.goal} ${JSON.stringify(k.materials)} ${JSON.stringify(k.steps)}`));
    expect(sunKits.length, 'no Sun kits found').toBeGreaterThanOrEqual(3);
    for (const k of sunKits) expect(k.safety, `${k.title}`).toMatch(/Sun|sunlight|sunny/i);
  });
});

describe('Optics glossary — numbers agree with their own arithmetic and the EM table', () => {
  const GLOSS = rows('GLOSSARY_EXPANDED', 'GLOSSARY_EXPANDED_MORE', 'GLOSSARY_E_Z', 'GLOSSARY_RZ');
  const entry = (term) => {
    const e = GLOSS.find((g) => g.term === term);
    expect(e, `glossary term "${term}" is gone`).toBeTruthy();
    return `${e.def} ${e.example || ''}`;
  };

  it('fibre attenuation compounds: 0.2 dB/km keeps ~95% per km and ~1% over 100 km', () => {
    const t = entry('Attenuation');
    const db = Number(t.match(/([\d.]+) dB\/km/)[1]);
    expect(t).toContain(`about ${Math.round(100 * 10 ** (-db / 10))}% of the light over 1 km`);
    expect(t).toContain(`only about ${Math.round(100 * 10 ** (-db * 100 / 10))}% over 100 km`);
  });

  it('a phone lens NA follows from its f-number, NA ≈ 1/(2N)', () => {
    const t = entry('Numerical aperture (NA)');
    const [, n, na] = t.match(/f\/([\d.]+) has NA ≈ 1\/\(2·[\d.]+\) ≈ (\d+\.\d+)/);
    expect(Number(na)).toBeCloseTo(1 / (2 * Number(n)), 2);
  });

  it('the UV bands match the EM spectrum table', () => {
    const t = entry('Ultraviolet (UV)');
    const bands = Object.fromEntries(rows('EM_SPECTRUM_BANDS').map((b) => [b.band, b.range]));
    const edge = (label) => bands[label].match(/(\d+)-(\d+) nm/).slice(1).join('–');
    expect(t).toContain(`UV-A (${edge('Near UV (UV-A)')} nm)`);
    expect(t).toContain(`UV-B (${edge('Middle UV (UV-B)')} nm)`);
    expect(t).toContain(`UV-C (${edge('Deep UV (UV-C)')} nm)`);
  });

  it('carries no "5-nm-wide features" node myth and no 14 D young-adult accommodation', () => {
    const text = JSON.stringify(GLOSS);
    expect(text).not.toMatch(/prints 5-nm-wide/);
    expect(text).not.toMatch(/young adults: ~14 diopters/);
  });
});

describe('Optics deep dives — stated comparisons are arithmetic', () => {
  it('a 5 mW, 1 mm beam: ~6.4 kW/m², more than 6× noon sunlight', () => {
    const w = 5e-3 / (Math.PI * 0.5e-3 ** 2);
    expect(SRC).toContain(`produces ~${(w / 1000).toFixed(1)} kW/m², more than ${Math.floor(w / 1000)}× the intensity of noon sunlight`);
  });

  it('JWST vs Hubble: resolution by diameter, light by collecting area', () => {
    expect(SRC).toContain(`JWST (6.5 m) has ~${(6.5 / 2.4).toFixed(1)}× the diffraction-limited resolution of Hubble (2.4 m)`);
    expect(SRC).toContain(`collects about ${Math.round(25 / 4)}× more light than Hubble`);
  });

  it('credits the 2014 Nobel to STED and PALM, not STORM', () => {
    expect(SRC).not.toMatch(/STED, PALM, STORM all won/);
    expect(SRC).toMatch(/STORM, from Xiaowei Zhuang.{0,4}s lab, works the same way but was not part of the prize/);
  });

  it('the fiber-laser record agrees with the lasers deep dive', () => {
    const record = RECORDS.find((r) => r.title === 'Most powerful continuous-wave fiber laser');
    expect(record.value).toBe('100+ kilowatts');
    expect(SRC).toMatch(/IPG.{0,2}s 100\+ kW machines/);
  });
});

describe('Optics sunset — air mass and per-colour survival', () => {
  // The secant air mass, clamped at 2°, topped out at 29 while the tool's own
  // text says the horizon path is ~38× longer.
  function sunset(alt) {
    resetStemLab();
    loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
    const html = renderTool('opticsLab', { opticsLab: { mode: 'phenomena', phenoSub: 'sunset', phenoSunsetAlt: alt } });
    const path = Number(html.match(/Atmospheric path: ([\d.]+)× normal/)[1]);
    const bars = [...html.matchAll(/data-op-sunset-nm="(\d+)" data-op-sunset-survival="([\d.]+)"/g)].map((m) => [m[1] === '470' ? 'blue' : m[1] === '680' ? 'red' : m[1], 100 * Number(m[2])]);
    return { html, path, bars: Object.fromEntries(bars) };
  }

  it('is 1 straight up, 2 at 30°, and the horizon figure it quotes is ~38', () => {
    expect(sunset(90).path).toBeCloseTo(1, 1);
    expect(sunset(30).path).toBeCloseTo(2, 1);
    const quoted = Number(sunset(30).html.match(/path is up to (\d+)× longer/)[1]);
    expect(quoted).toBeGreaterThanOrEqual(36);
    expect(quoted).toBeLessThanOrEqual(40);
  }, RENDER_TIMEOUT);

  it('red outlasts blue at every altitude, and almost no blue survives near the horizon', () => {
    for (const alt of [60, 20, 5, 1]) {
      const s = sunset(alt);
      expect(s.bars.red, `alt ${alt}°`).toBeGreaterThan(s.bars.blue);
    }
    expect(sunset(1).bars.blue).toBeLessThan(5);
  }, RENDER_TIMEOUT);
});

describe('Optics teaching tips and famous experiments — no confident errors', () => {
  const TIPS = rows('TEACHING_TIPS').map((t) => JSON.stringify(t)).join('\n');
  const EXPS = rows('FAMOUS_EXPERIMENTS');
  const exp = (re) => { const e = EXPS.find((x) => re.test(x.title)); expect(e, String(re)).toBeTruthy(); return JSON.stringify(e); };

  it('gives lenses their own third ray, and credits a pinhole\'s depth of focus to geometry', () => {
    expect(TIPS).toMatch(/for a lens, a ray through the lens.{0,2}s center goes straight through/);
    expect(TIPS).not.toMatch(/pinhole cameras have wide depth of field \(each ray spreads\)/);
    expect(TIPS).toMatch(/1\.9√\(λf\)/);
  });

  it('keeps the experiments to what they actually showed', () => {
    expect(exp(/Newton's prism/)).not.toMatch(/Cambridge, England \(during plague leave\)/);
    expect(exp(/Michelson-Morley/)).not.toMatch(/independent of motion of source/);
    expect(exp(/First operational laser/)).not.toMatch(/in a basement/);
    expect(exp(/LIGO/)).not.toMatch(/200 W laser sources/);
    expect(exp(/Lamb shift/)).not.toMatch(/1 part in 10⁹/);
  });
});

describe('Optics Sign Convention Sleuth — every key follows from its own setup', () => {
  // The vignettes live inside the renderer, so read that array literal.
  const start = SRC.indexOf('    var V = [', SRC.indexOf('function _renderSleuthPanel'));
  let depth = 0; let i = start + '    var V = '.length;
  for (; i < SRC.length; i += 1) { if (SRC[i] === '[') depth += 1; else if (SRC[i] === ']') { depth -= 1; if (!depth) break; } }
  const V = vm.runInNewContext(`(${SRC.slice(start + '    var V = '.length, i + 1)})`, {});

  it('parses all ten vignettes', () => expect(V.length).toBe(10));

  it('grades the image type the thin-lens / mirror equation gives, with no same-size ties', () => {
    for (const v of V) {
      const f = Number(v.setup.match(/f = ([−-]?\d+)/)[1].replace('−', '-'));
      const far = /infinity/.test(v.setup);
      const dO = far ? Infinity : Number(v.setup.match(/(?:placed(?: exactly)?(?: at)?|stand) (\d+) cm/)[1]);
      const dI = far ? f : 1 / (1 / f - 1 / dO);
      const m = far ? 0 : -dI / dO;
      expect(Math.abs(Math.abs(m) - 1), `vignette ${v.id}: |m| = 1 fits none of the four choices`).toBeGreaterThan(0.05);
      const type = (dI > 0 ? 'realInv' : 'virtUpr') + (Math.abs(m) > 1 ? 'Mag' : 'Red');
      expect(v.correct, `vignette ${v.id}: ${v.setup}`).toBe(type);
    }
  });
});

describe('Optics Snell inquiry — dispersion belongs to the glass, not the air', () => {
  // Dispersion was applied to n₂ alone, so glass → air made the AIR disperse
  // and gave blue the LARGER critical angle: red hit TIR first, backwards.
  function inquiry(n1, n2, angle, wavelength) {
    resetStemLab();
    loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
    const key = `${n1.toFixed(3)}|${n2.toFixed(3)}|${angle}`;
    const html = renderTool('opticsLab', { opticsLab: { mode: 'inquiry',
      snellInquiry: { n1, n2, angle, wavelength, predictedFor: key, predictedOutcome: 'refract', log: [] } } });
    const read = (label) => {
      const m = html.match(new RegExp('>' + label + '<[^]{0,400}?>([0-9.]+)°'));
      return m ? Number(m[1]) : null;
    };
    return { crit: read('Critical angle'), theta2: read('θ₂ [(]refracted[)]'), html };
  }

  it('glass → air: violet reaches total internal reflection first (smaller critical angle)', () => {
    const violet = inquiry(1.5, 1.0, 30, 400).crit;
    const red = inquiry(1.5, 1.0, 30, 700).crit;
    expect(violet, 'critical angle not shown').toBeTruthy();
    expect(violet).toBeLessThan(red);
  }, RENDER_TIMEOUT);

  it('air → glass: violet bends more (smaller refraction angle)', () => {
    const violet = inquiry(1.0, 1.5, 40, 400).theta2;
    const red = inquiry(1.0, 1.5, 40, 700).theta2;
    expect(violet, 'refraction angle not shown').toBeTruthy();
    expect(violet).toBeLessThan(red);
  }, RENDER_TIMEOUT);
});

describe('Optics calculators hub — edge cases and the other ten calculators', () => {
  function calc(sub, state) {
    resetStemLab();
    loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
    return renderTool('opticsLab', { opticsLab: { mode: 'calcs', calcSubTool: sub, ...state } });
  }
  const attr = (html, name) => { const m = html.match(new RegExp(name + '="([^"]*)"')); return m ? m[1] : null; };
  function fresnelUnpolarized(n1, n2, deg) {
    const s = (n1 / n2) * Math.sin(deg * DEG);
    if (s >= 1) return 1;
    const c1 = Math.cos(deg * DEG);
    const c2 = Math.sqrt(1 - s * s);
    const rs = ((n1 * c1 - n2 * c2) / (n1 * c1 + n2 * c2)) ** 2;
    const rp = ((n2 * c1 - n1 * c2) / (n2 * c1 + n1 * c2)) ** 2;
    return (rs + rp) / 2;
  }

  it('a 0° incidence slider means normal incidence, not 30°', () => {
    // `d.tirTheta || 30` turned 0 into 30, so the 4% normal-incidence case
    // could not be shown in either calculator.
    const tir = calc('tir', { tirN1: 1.5, tirN2: 1.0, tirTheta: 0 });
    expect(Number(attr(tir, 'data-op-tir-reflectance'))).toBeCloseTo(0.04, 4);
    const brew = calc('brewster', { brewsterN1: 1.0, brewsterN2: 1.5, brewsterTheta: 0 });
    expect(brew).toMatch(/Current θ_i<[^]{0,200}?>0°</);
    // Both polarizations reflect ((n2 − n1)/(n2 + n1))² = 4% head-on, each with its unit.
    expect(brew.match(/>4[.]00%</g) || []).toHaveLength(2);
  }, RENDER_TIMEOUT);

  it('TIR: the reflected share climbs smoothly to 100% at the critical angle', () => {
    // It printed "Partly reflected, mostly transmitted" right up to θc, where
    // the Fresnel reflectance is already past one half.
    const crit = Math.asin(1 / 1.5) / DEG;
    for (const deg of [10, 30, 40, 41.5]) {
      const html = calc('tir', { tirN1: 1.5, tirN2: 1.0, tirTheta: deg });
      const expected = fresnelUnpolarized(1.5, 1.0, deg);
      expect(Number(attr(html, 'data-op-tir-reflectance')), `${deg}°`).toBeCloseTo(expected, 3);
      expect(html.includes('mostly reflected'), `${deg}°: R = ${expected.toFixed(3)}`).toBe(expected >= 0.5);
    }
    expect(fresnelUnpolarized(1.5, 1.0, 41.5)).toBeGreaterThan(0.5);
    expect(calc('tir', { tirN1: 1.5, tirN2: 1.0, tirTheta: crit + 1 })).toContain('100% reflected, 0% transmitted');
  }, RENDER_TIMEOUT);

  it('TIR: Snell runs n1 sin θ1 = n2 sin θ2, so glass → air bends AWAY from the normal', () => {
    // The calculator used sin θ2 = (n2/n1) sin θ1: glass → air light bent toward
    // the normal and never reached TIR, while air → glass drew "TIR!".
    const glassToAir = calc('tir', { tirN1: 1.5, tirN2: 1.0, tirTheta: 30 });
    const theta2 = Math.asin(1.5 * Math.sin(30 * DEG)) / DEG;
    expect(glassToAir).toMatch(new RegExp('Refraction angle θ_t<[^]{0,200}?>' + theta2.toFixed(2) + '°<'));
    for (const deg of [30, 60, 89]) {
      expect(calc('tir', { tirN1: 1.0, tirN2: 1.5, tirTheta: deg }), `air → glass at ${deg}°`).not.toContain('TIR!');
    }
  }, RENDER_TIMEOUT);

  it('lensmaker: flat faces and equal radii give a real answer, never "Infinity"', () => {
    const plano = calc('lensmaker', { lmkrN: 1.5, lmkrR1: 0, lmkrR2: -30 });
    expect(attr(plano, 'data-op-lens-shape')).toBe('Plano-convex');
    expect(Number(attr(plano, 'data-op-lens-focal-cm'))).toBeCloseTo(60, 6);
    for (const state of [{ lmkrN: 1.5, lmkrR1: 20, lmkrR2: 20 }, { lmkrN: 1.0, lmkrR1: 20, lmkrR2: -30 }, { lmkrN: 1.5, lmkrR1: 0, lmkrR2: 0 }]) {
      const html = calc('lensmaker', state);
      expect(html, JSON.stringify(state)).not.toMatch(/Infinity|NaN/);
      expect(attr(html, 'data-op-lens-focal-cm'), JSON.stringify(state)).toBe('inf');
    }
  }, RENDER_TIMEOUT);

  it('lensmaker: the drawn cross-section has the shape the radii describe', () => {
    const faces = (html) => {
      const d = html.match(/<path d="(M[^"]*Z)" fill="rgba[(]125,211,252/)[1];
      const pts = d.replace(/[MLZ]/g, ' ').trim().split(/ +/).map((p) => p.split(',').map(Number));
      expect(pts).toHaveLength(50);
      return { one: pts.slice(0, 25), two: pts.slice(25).reverse() };
    };
    // 'out' = the face bulges away from the glass; 'in' = it caves in.
    const bulge = (face, outward) => {
      const d = outward * (face[12][0] - face[0][0]);
      return Math.abs(d) < 0.05 ? 'flat' : d < 0 ? 'out' : 'in';
    };
    const cases = [[20, -30, 'Biconvex', 'out', 'out'], [-20, 30, 'Biconcave', 'in', 'in'],
      [10, 20, 'Positive meniscus', 'out', 'in'], [20, 10, 'Negative meniscus', 'out', 'in'],
      [0, -30, 'Plano-convex', 'flat', 'out'], [0, 30, 'Plano-concave', 'flat', 'in']];
    for (const [r1, r2, shape, face1, face2] of cases) {
      const html = calc('lensmaker', { lmkrN: 1.5, lmkrR1: r1, lmkrR2: r2 });
      expect(attr(html, 'data-op-lens-shape'), `${r1}/${r2}`).toBe(shape);
      const f = 1 / (0.5 * ((r1 ? 1 / r1 : 0) - (r2 ? 1 / r2 : 0)));
      expect(Number(attr(html, 'data-op-lens-focal-cm')), shape).toBeCloseTo(f, 3);
      const { one, two } = faces(html);
      one.forEach((p, k) => expect(two[k][0] - p[0], `${shape}: glass on row ${k}`).toBeGreaterThan(0));
      expect(bulge(one, 1), `${shape} face 1`).toBe(face1);
      expect(bulge(two, -1), `${shape} face 2`).toBe(face2);
      // The focus is marked where it falls on the drawing, or named with its distance.
      const off = 'F is ' + Math.abs(f).toFixed(0) + ' cm to the ' + (f > 0 ? 'right' : 'left') + ', off the drawing';
      expect(html.includes(off) || (f > 0 ? />F</ : />F [(]virtual[)]</).test(html), shape).toBe(true);
    }
  }, RENDER_TIMEOUT);

  it('Doppler: a real blueshift preset, and no unsourced merger speed', () => {
    const html = calc('doppler', { dopLambda: 656.3, dopV: -300 });
    expect(html).not.toContain('GW170817');
    expect(html).toContain('Andromeda');
    const beta = -300 / 299792;
    const obs = 656.3 * Math.sqrt((1 + beta) / (1 - beta));
    expect(obs).toBeLessThan(656.3);
    expect(html).toContain('>' + obs.toFixed(2) + ' nm<');
  }, RENDER_TIMEOUT);

  it('photon: band names follow the EM table, with no invalid colour outside the visible', () => {
    // 100-200 nm read "X-ray (soft)", and wavelengthToRGB returned
    // rgb(0,NaN,255) for every UV wavelength, so the chip had no background.
    const cases = [[150, /vacuum UV/], [250, /^UV-C/], [300, /^UV-B/], [350, /^UV-A/], [405, /^Violet/], [450, /^Blue/],
      [532, /^Green/], [585, /^Yellow/], [650, /^Red/], [745, /^Red/], [1550, /IR/], [9000, /^Mid IR/]];
    for (const [nm, band] of cases) {
      const html = calc('photon', { photonLambdaNm: nm });
      expect(html, `${nm} nm`).not.toContain('NaN');
      expect(attr(html, 'data-op-photon-band'), `${nm} nm`).toMatch(band);
      const swatch = attr(html, 'data-op-photon-swatch');
      expect(swatch != null, `${nm} nm: a colour swatch only for visible light`).toBe(nm >= 380 && nm <= 750);
      if (swatch) expect(swatch).toMatch(/^rgb[(][0-9]+,[0-9]+,[0-9]+[)]$/);
    }
  }, RENDER_TIMEOUT);

  it('wavelengthToRGB returns a valid colour for every wavelength, visible or not', () => {
    // Below 380 nm it fell through to rgb(0,NaN,255), an invalid colour that
    // dropped whole backgrounds, e.g. a source spectrum strip starting in the UV.
    const start = SRC.indexOf('  function wavelengthToRGB(nm) {');
    const NL = String.fromCharCode(10);
    const end = SRC.indexOf(NL + '  }' + NL, start) + 4;
    const toRGB = vm.runInNewContext(SRC.slice(start, end) + '; wavelengthToRGB', {});
    for (let nm = 100; nm <= 1200; nm += 5) {
      expect(toRGB(nm), `${nm} nm`).toMatch(/^rgb[(][0-9]+,[0-9]+,[0-9]+[)]$/);
    }
    expect(toRGB(550)).not.toBe('rgb(0,0,0)');
  });

  it('colour mixer: luminance is the linear-light Rec. 709 sum, not gamma-space luma', () => {
    const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    for (const [r, g, b] of [[0, 255, 0], [0, 0, 255], [128, 128, 128], [255, 255, 0]]) {
      const html = calc('color', { mixR: r, mixG: g, mixB: b });
      const expected = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      expect(Number(attr(html, 'data-op-mix-luminance')), `${r},${g},${b}`).toBeCloseTo(expected, 4);
    }
  }, RENDER_TIMEOUT);

  it('eye estimator: a "high" myopia preset really is −6 D or stronger', () => {
    const presets = [...SRC.matchAll(/[{] l: 'Myopia ([a-z]+) [(]−([0-9.]+) D[)]', n: [0-9]+, f: ([0-9]+) [}]/g)];
    expect(presets.length).toBe(2);
    for (const [, grade, label, far] of presets) {
      expect(100 / Number(far), `${grade}: far point ${far} cm`).toBeCloseTo(Number(label), 1);
      if (grade === 'high') expect(100 / Number(far)).toBeGreaterThanOrEqual(6);
    }
    expect(calc('eye', { eyeNear: 10, eyeFar: 15 })).toContain('-6.67 D');
  }, RENDER_TIMEOUT);

  it('three polarizers: explained by Malus, not billed as a quantum effect', () => {
    expect(SRC).not.toMatch(/non-classical intuition|Quantum-style|The non-classical paradox/);
    const html = calc('polartri', { polTriTheta2: 45, polTriTheta3: 90 });
    expect(html).toContain('>12.50%<');
  }, RENDER_TIMEOUT);
});

describe('Optics visual lab — every mini-sim draws the physics it names', () => {
  // Audit, Sept 2026: the lens tracer sent real-image rays back to the left, the
  // mirror lab drew concave as convex, the prism bent red more than violet, the
  // rainbow put red inside, the camera sharpened the background at f/1.4, the
  // Newton's-rings rings were 188 px apart, and more. Each check below reads the
  // DRAWN geometry back and compares it with the physics computed here.
  function viz(state) {
    resetStemLab();
    loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
    return renderTool('opticsLab', { opticsLab: { mode: 'viz', ...state } });
  }
  const NUM = '(-?[0-9.]+(?:e-?[0-9]+)?)';
  function tagWith(html, tag, attr, value) {
    const m = html.match(new RegExp('<' + tag + ' ' + attr + '="' + value + '"[^>]*>'));
    expect(m, `${tag}[${attr}=${value}] not drawn`).toBeTruthy();
    return m[0];
  }
  const num = (tag, name) => Number(tag.match(new RegExp(' ' + name + '="' + NUM + '"'))[1]);
  const seg = (tag) => ({ x1: num(tag, 'x1'), y1: num(tag, 'y1'), x2: num(tag, 'x2'), y2: num(tag, 'y2') });
  function meet(a, b) {
    const d = (a.x1 - a.x2) * (b.y1 - b.y2) - (a.y1 - a.y2) * (b.x1 - b.x2);
    const p = a.x1 * a.y2 - a.y1 * a.x2;
    const q = b.x1 * b.y2 - b.y1 * b.x2;
    return { x: (p * (b.x1 - b.x2) - (a.x1 - a.x2) * q) / d, y: (p * (b.y1 - b.y2) - (a.y1 - a.y2) * q) / d };
  }

  it('lens tracer: the two drawn rays meet at the drawn image, real or virtual', () => {
    for (const [type, f, dO] of [['converging', 60, 150], ['converging', 60, 90], ['converging', 60, 40], ['diverging', 60, 150], ['diverging', 40, 60]]) {
      const html = viz({ vizShowLens: true, vizLensType: type, vizLensF: f, vizLensDo: dO, vizLensH: 40 });
      const fS = type === 'converging' ? f : -f;
      const dI = 1 / (1 / fS - 1 / dO);
      const img = seg(tagWith(html, 'line', 'data-op-viz-lens-image', dI > 0 ? 'real' : 'virtual'));
      const par = seg(tagWith(html, 'line', 'data-op-viz-lens-ray', 'parallel'));
      const chief = seg(tagWith(html, 'line', 'data-op-viz-lens-ray', 'chief'));
      const p = meet(par, chief);
      expect(p.x, `${type} f=${f} do=${dO}: x`).toBeCloseTo(img.x1, 3);
      expect(p.y, `${type} f=${f} do=${dO}: y`).toBeCloseTo(img.y2, 3);
      expect(par.x2, 'light leaves the lens going forward').toBeGreaterThan(par.x1);
      expect(chief.y1 + (chief.y2 - chief.y1) * (280 - chief.x1) / (chief.x2 - chief.x1), 'chief ray through the centre').toBeCloseTo(130, 3);
    }
  }, RENDER_TIMEOUT);

  it('mirror lab: concave hollows away from the object, and the rays meet at the image', () => {
    for (const [type, f, dO] of [['concave', 50, 110], ['concave', 50, 30], ['convex', 50, 110]]) {
      const html = viz({ vizShowMirror: true, vizMirrType: type, vizMirrF: f, vizMirrDo: dO, vizMirrH: 40 });
      const fS = type === 'concave' ? f : -f;
      const dI = 1 / (1 / fS - 1 / dO);
      const img = seg(tagWith(html, 'line', 'data-op-viz-mirror-image', dI > 0 ? 'real' : 'virtual'));
      const p = meet(seg(tagWith(html, 'line', 'data-op-viz-mirror-ray', 'parallel')), seg(tagWith(html, 'line', 'data-op-viz-mirror-ray', 'vertex')));
      expect(p.x, `${type} do=${dO}`).toBeCloseTo(img.x1, 3);
      expect(p.y, `${type} do=${dO}`).toBeCloseTo(img.y2, 3);
      // The object is on the left: a concave mirror's middle sits further right than its rim.
      const q = html.match(/<path d="M 390 50 Q ([0-9.]+) 130 390 210"/);
      expect(q, 'mirror curve').toBeTruthy();
      expect(Number(q[1]) > 390, `${type} curve`).toBe(type === 'concave');
    }
  }, RENDER_TIMEOUT);

  it('prism: violet deviates more than red, by D = i + e − A for crown glass', () => {
    const nAt = (nm) => 1.5 + 0.0042 / (nm / 1000) ** 2;
    for (const A of [30, 45, 60]) {
      const html = viz({ vizShowPrism: true, vizPrismAngle: A });
      const Ar = A * DEG;
      const inc = Math.asin(nAt(550) * Math.sin(Ar / 2));
      const D = (nm) => {
        const r1 = Math.asin(Math.sin(inc) / nAt(nm));
        return (inc + Math.asin(nAt(nm) * Math.sin(Ar - r1)) - Ar) / DEG;
      };
      const shown = (nm) => Number(html.match(new RegExp('data-op-viz-prism-nm="' + nm + '" data-op-viz-prism-deviation="' + NUM + '"'))[1]);
      expect(shown(400), `A=${A} violet`).toBeCloseTo(D(400), 2);
      expect(shown(700), `A=${A} red`).toBeCloseTo(D(700), 2);
      expect(shown(400)).toBeGreaterThan(shown(700));
      // ...and the DRAWN exit rays agree: violet leaves steeper toward the base (lower).
      const exitSlope = (nm) => {
        const g = html.match(new RegExp('data-op-viz-prism-nm="' + nm + '"[^]*?</g>'))[0];
        const lines = [...g.matchAll(/<line [^>]*>/g)].map((m) => seg(m[0]));
        const out = lines[1];
        return (out.y2 - out.y1) / (out.x2 - out.x1);
      };
      expect(exitSlope(400), `A=${A}`).toBeGreaterThan(exitSlope(700));
    }
    // A steep apex traps every colour: the readout says so rather than drawing a fan.
    expect(viz({ vizShowPrism: true, vizPrismAngle: 88 })).toContain('no light gets out');
  }, RENDER_TIMEOUT);

  it('rainbow: red on the outside at ~42°, radii from minimum deviation', () => {
    const html = viz({ vizShowRb: true });
    const water = (nm) => { const B = 0.012 / (1 / 0.16 - 1 / 0.49); return 1.331 + B * (1 / (nm / 1000) ** 2 - 1 / 0.49); };
    const bow = (n) => { const i = Math.acos(Math.sqrt((n * n - 1) / 3)); return (4 * Math.asin(Math.sin(i) / n) - 2 * i) / DEG; };
    const arcs = [...html.matchAll(/data-op-viz-rainbow-nm="([0-9]+)" data-op-viz-rainbow-deg="([0-9.]+)" d="M ([0-9.]+) 212 A ([0-9.]+)/g)]
      .map((m) => ({ nm: Number(m[1]), deg: Number(m[2]), r: Number(m[4]) }));
    expect(arcs.length).toBe(7);
    for (const a of arcs) {
      expect(a.deg, `${a.nm} nm`).toBeCloseTo(bow(water(a.nm)), 2);
      expect(a.r, `${a.nm} nm radius`).toBeCloseTo(a.deg * 4.2, 0);
    }
    const red = arcs.find((a) => a.nm === 700), violet = arcs.find((a) => a.nm === 410);
    expect(red.r).toBeGreaterThan(violet.r);
    expect(red.deg).toBeGreaterThan(41.5);
    expect(red.deg - violet.deg).toBeLessThan(2.5);
    expect(html).not.toContain('42° spread');
  }, RENDER_TIMEOUT);

  it('double slit: the drawn fringe period is Δy = λL/d at the stated scale', () => {
    for (const [lam, slit, L] of [[550, 0.05, 1.0], [650, 0.1, 2.0], [450, 0.2, 1.5]]) {
      const html = viz({ vizShowDS: true, vizDsLam: lam, vizDsSlit: slit, vizDsL: L });
      const bars = [...html.matchAll(/data-op-viz-ds-fringe="true" x="([0-9.]+)" y="70" width="2" height="120" fill="[^"]*" opacity="([0-9.]+)"/g)]
        .map((m) => ({ x: Number(m[1]) + 1, I: Number(m[2]) }));
      expect(bars.length).toBe(150);
      const peaks = bars.filter((b, i) => i > 0 && i < bars.length - 1 && b.I >= bars[i - 1].I && b.I > bars[i + 1].I && b.I > 0.9);
      expect(peaks.length, `${lam}/${slit}/${L}: at least two bright fringes`).toBeGreaterThanOrEqual(2);
      const periodPx = (peaks[peaks.length - 1].x - peaks[0].x) / (peaks.length - 1);
      const expectedPx = (lam * 1e-9 * L / (slit * 1e-3)) * 1000 * 7.5;
      expect(Math.abs(periodPx - expectedPx), `${lam}/${slit}/${L}: ${periodPx} px vs ${expectedPx}`).toBeLessThan(2.1);
    }
  }, RENDER_TIMEOUT);

  it('Snell visualizer: the θ₁ arc is measured from the normal, not the surface', () => {
    for (const th of [20, 50]) {
      const html = viz({ vizShowSnell: true, vizSnellTh: th, vizSnellN1: 1, vizSnellN2: 1.52 });
      const d = html.match(/data-op-viz-snell-arc="incident" d="M ([0-9.]+) ([0-9.]+) A 30 30 0 0 0 ([0-9.]+) ([0-9.]+)"/);
      expect(d, 'incident arc').toBeTruthy();
      const [x0, y0, x1, y1] = d.slice(1).map(Number);
      expect(x0, 'starts on the normal').toBe(250);
      const swept = Math.atan2(250 - x1, 130 - y1) / DEG;
      expect(swept, `${th}°`).toBeCloseTo(th, 1);
      expect(y0).toBe(100);
    }
  }, RENDER_TIMEOUT);

  it("Newton's rings: the first dark ring sits at √(λR) and grows with λ", () => {
    const firstDark = (lam) => {
      const html = viz({ vizShowNr: true, vizNrLam: lam });
      const rings = [...html.matchAll(/data-op-viz-newton-ring="([0-9.]+)" cx="250" cy="110" r="[0-9.]+" fill="none" stroke="[^"]*" stroke-width="1.05" opacity="([0-9.]+)"/g)]
        .map((m) => ({ r: Number(m[1]), I: Number(m[2]) }));
      expect(rings.length).toBe(110);
      const i = rings.findIndex((ring, k) => k > 3 && ring.I < rings[k - 1].I && ring.I <= rings[k + 1].I);
      return rings[i].r;
    };
    for (const lam of [450, 650]) {
      expect(Math.abs(firstDark(lam) - Math.sqrt(lam * 1e-6 * 1000) * 30), `${lam} nm`).toBeLessThan(1.1);
    }
    expect(firstDark(650)).toBeGreaterThan(firstDark(450));
  }, RENDER_TIMEOUT);

  it('atmospheric refraction: a Sun already below the horizon is still seen, lifted and squashed', () => {
    const read = (alt, key) => Number(viz({ vizShowAr: true, vizArAlt: alt }).match(new RegExp('data-op-viz-refraction-' + key + '="' + NUM + '"'))[1]);
    expect(read(0, 'lift')).toBeGreaterThan(0.45);
    expect(read(0, 'lift')).toBeLessThan(0.6);
    // Entire true disc below the horizon (centre −0.4°, radius 0.27°), top edge still in view.
    expect(read(-0.4, 'top')).toBeGreaterThan(0);
    expect(read(0, 'squash')).toBeLessThan(0.9);
    // Refraction falls from ~10.5′ to ~9.5′ across the disc at 5°: about 3% flattening.
    expect(read(5, 'squash')).toBeGreaterThan(0.95);
    expect(read(5, 'squash')).toBeGreaterThan(read(0, 'squash') + 0.08);
    expect(read(5, 'lift')).toBeLessThan(read(0, 'lift') / 2.5);
  }, RENDER_TIMEOUT);

  it('camera: opening the aperture BLURS the near and far objects', () => {
    const blur = (N) => [...viz({ vizShowCam: true, vizCamF: N }).matchAll(/data-op-viz-cam-blur="([0-9.]+)"/g)].map((m) => Number(m[1]));
    const [nearWide, farWide] = blur(1.4);
    const [nearNarrow, farNarrow] = blur(22);
    expect(nearWide).toBeGreaterThan(10 * nearNarrow);
    expect(farWide).toBeGreaterThan(10 * farNarrow);
    expect(farNarrow).toBeLessThan(1);
    // b = f²/(N(s − f)) · |x − s|/x for f 50 mm, s 3 m, x 1.5 m, CoC 0.03 mm
    expect(nearWide).toBeCloseTo((2500 / (1.4 * 2950)) / 0.03, 2);
  }, RENDER_TIMEOUT);

  it('pinhole: rays run straight through the hole and the image is d_i/d_o as tall', () => {
    for (const [size, dist] of [[1, 100], [0.3, 180]]) {
      const html = viz({ vizShowPh: true, vizPhSize: size, vizPhD: dist });
      const top = seg(tagWith(html, 'line', 'data-op-viz-pinhole-ray', 'top'));
      const yAtHole = top.y1 + (top.y2 - top.y1) * (230 - top.x1) / (top.x2 - top.x1);
      expect(yAtHole, 'through the hole').toBeCloseTo(110, 6);
      expect(Number(html.match(/data-op-viz-pinhole-image="([0-9.]+)"/)[1])).toBeCloseTo(100 * dist / 150, 2);
    }
    // A hole far below the optimum is blurrier than one near it: diffraction takes over.
    const blurAt = (size) => Number(viz({ vizShowPh: true, vizPhSize: size, vizPhD: 100 }).match(/data-op-viz-pinhole-blur="([0-9.]+)"/)[1]);
    expect(blurAt(0.1)).toBeGreaterThan(blurAt(0.3));
    expect(blurAt(3)).toBeGreaterThan(blurAt(0.3));
  }, RENDER_TIMEOUT);

  it('sky: a white Sun overhead, a red one at the horizon, blue sky at 30°', () => {
    const sun = (alt) => viz({ vizShowSky: true, vizSkyAlt: alt }).match(/data-op-viz-sky-sun="rgb[(]([0-9]+),([0-9]+),([0-9]+)[)]"/).slice(1).map(Number);
    const [, gHigh, bHigh] = sun(70);
    expect(gHigh).toBeGreaterThan(230);
    expect(bHigh).toBeGreaterThan(170);
    const [rLow, gLow, bLow] = sun(0);
    expect(rLow).toBe(255);
    expect(gLow).toBeLessThan(80);
    expect(bLow).toBeLessThan(10);
    expect(viz({ vizShowSky: true, vizSkyAlt: 30 })).toContain('still a blue sky');
  }, RENDER_TIMEOUT);

  it('Brewster: the reflected ray survives at θ_B, polarized, with R_p = 0', () => {
    const html = viz({ vizShowBr: true, vizBrN2: 1.52 });
    expect(html).toContain('data-op-viz-brewster-reflected="s-only"');
    expect(html).toMatch(/R_p = 0[.]0%/);
    const rs = ((Math.cos(Math.atan(1.52)) - 1.52 * Math.cos(Math.PI / 2 - Math.atan(1.52))) / (Math.cos(Math.atan(1.52)) + 1.52 * Math.cos(Math.PI / 2 - Math.atan(1.52)))) ** 2;
    expect(html).toContain('R_s = ' + (rs * 100).toFixed(1) + '%');
  }, RENDER_TIMEOUT);

  it('polarizer pair: an unpolarized source loses half at P1 before Malus applies', () => {
    const html = viz({ vizShowPol: true, vizPol1: 0, vizPol2: 30 });
    expect(html).toContain((50 * Math.cos(30 * DEG) ** 2).toFixed(1) + '% of the source gets through');
    expect(html).not.toMatch(/100[.]0% transmitted/);
  }, RENDER_TIMEOUT);

  it('eye: the lens thickens for near objects and is relaxed only for far ones', () => {
    // Reads the DRAWN width, not a number computed beside it.
    const rx = (cm) => Number(viz({ vizShowEye: true, vizEyeF: cm }).match(/data-op-viz-eye-lens="true" cx="310" cy="110" rx="([0-9.]+)"/)[1]);
    expect(rx(10)).toBeGreaterThan(rx(50));
    expect(rx(50)).toBeGreaterThan(rx(500));
    expect(viz({ vizShowEye: true, vizEyeF: 50 })).toContain('Lens (thicker: adding 2.0 D)');
    expect(viz({ vizShowEye: true, vizEyeF: 500 })).toContain('Lens (relaxed, thin)');
  }, RENDER_TIMEOUT);

  it('EM explorer: the rainbow sits where 380–750 nm falls on its own log scale', () => {
    const html = viz({ vizShowEm: true });
    expect(html).not.toContain('id="grad"');
    const green = Number(html.match(/<stop offset="([0-9.]+)%" stop-color="#22c55e"/)[1]);
    expect(green).toBeGreaterThan(Math.log10(380) / 12 * 100);
    expect(green).toBeLessThan(Math.log10(750) / 12 * 100);
  }, RENDER_TIMEOUT);

  it('wave-particle: the photon count is the count drawn, and more photons only add dots', () => {
    const dots = (n) => [...viz({ vizShowWp: true, vizWpN: n }).matchAll(/<circle cx="([0-9.]+)" cy="([0-9.]+)" r="1.5" fill="#fde047"/g)].map((m) => m[1] + ',' + m[2]);
    const few = dots(100), many = dots(300);
    expect(few.length).toBe(100);
    expect(many.length).toBe(300);
    expect(many.slice(0, 100)).toEqual(few);
  }, RENDER_TIMEOUT);

  it('reference cards: photon energies follow E = hf, and no particle is listed as light', () => {
    const E = (hz) => 4.1357e-15 * hz;
    expect(SRC).toContain('"Visible (~5 × 10¹⁴ Hz)"');
    expect(E(5e14)).toBeGreaterThan(1.7);
    expect(E(5e14)).toBeLessThan(3.3);
    expect(SRC).not.toContain('"UV-C (10¹⁶ Hz)"');
    expect(E(1e16)).toBeGreaterThan(10);
    expect(SRC).not.toMatch(/"Cosmic rays"/);
    expect(SRC).not.toContain("['1907', 'Einstein");
    expect(SRC).not.toContain('299,792,458 m/s (exact)');
  });
});

describe('Optics visual-lab reference cards — numbers that follow from the physics', () => {
  // ~70 fact cards were audited in Sept 2026. The ones below state a number a
  // formula fixes, so the formula is run here; the rest are pinned against the
  // wrong wording coming back.
  const WIEN_UM_K = 2897.8;
  const card = (title) => {
    const m = SRC.match(new RegExp('"' + title.replace(/[()+.?]/g, (c) => '[' + c + ']') + '"[)],[^"]*"([^"]+)"'));
    expect(m, `card "${title}" not found`).toBeTruthy();
    return m[1];
  };

  it('Balmer lines are in nm and match the Rydberg formula (air wavelengths)', () => {
    const text = SRC.match(/"([0-9.]+) [(]Hα red[)], ([0-9.]+) [(]Hβ cyan[)], ([0-9.]+) [(]Hγ violet[)] nm/);
    expect(text, 'Balmer card').toBeTruthy();
    const R = 1.0967758e7;
    [3, 4, 5].forEach((n, i) => {
      const vacuumNm = 1e9 / (R * (1 / 4 - 1 / (n * n)));
      const airNm = vacuumNm / 1.000277;
      expect(Math.abs(Number(text[i + 1]) - airNm), `n = ${n}`).toBeLessThan(0.3);
    });
  });

  it('Wien peaks: fire glows in the infrared, the Sun’s core in X-rays', () => {
    expect(WIEN_UM_K / 1500).toBeGreaterThan(1.8);
    expect(WIEN_UM_K / 1000).toBeLessThan(3.0);
    expect(card('Why is fire orange?')).toContain('infrared (~2-3 μm)');
    const coreNm = WIEN_UM_K / 1.5e7 * 1000;
    expect(coreNm).toBeCloseTo(0.2, 1);
    expect(card('Center of Sun (15 MK)')).toContain('0.2 nm (X-rays)');
  });

  it('Stefan–Boltzmann: doubling T gives 2⁴ = 16× the power', () => {
    expect(2 ** 4).toBe(16);
    expect(card('Stefan-Boltzmann')).toContain('Double the temperature → 2⁴ = 16×');
  });

  it('an attosecond of light spans ~3 hydrogen atoms (diameter 2a₀)', () => {
    const atoms = (299792458 * 1e-18) / (2 * 0.0529e-9);
    expect(Math.round(atoms)).toBe(3);
    expect(card('1 attosecond')).toContain('about 3 hydrogen atoms');
  });

  it('keeps the corrected history, astronomy and technology claims', () => {
    expect(card('GPS time')).toMatch(/^TAI − 19 seconds/);
    expect(card('Frame rates')).toContain('48 fps (The Hobbit');
    expect(card('Gravitational redshift')).toContain('Pound and Rebka');
    expect(SRC).toContain('"Horizontally oriented flat hexagonal plate crystals. ~22° from a low sun."');
    expect(card('Acadia NP')).not.toMatch(/Dark Sky Park since/);
    for (const wrong of ['Object angle / image angle', 'Used in Hubble, JWST', 'Pingree Park', 'Nobel 1999.', 'Confirmed at White Sands',
      '120 fps (Hobbit)', 'TAI + 19', 'quadruples temperature', 'Mie scattering (droplet ~λ)', 'Wien displacement → orange peak',
      'Photons accumulate', 'each photon randomly takes one path', 'not hidden variables', 'Mostly accurate orbital mechanics',
      'Sunburn, asphalt warming', 'Horizontally oriented hex columns', 'Subscribe to OSA', 'Federally designated dark sky',
      'Replaced cash registers', 'Also tans skin', '99% of starlight', 'Up to 16 color receptors', '4000°C achievable',
      'Used optics methods to show electron spin', 'Vacuum has color', '90% efficient at ideal phosphor mix',
      'sound from speakers is incoherent', 'Same as lens, with sign flipped', 'Renaissance artists projected']) {
      expect(SRC, wrong).not.toContain(wrong);
    }
  });
});
