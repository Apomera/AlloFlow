// Optics Lab, audit round 10 (Sept 2026): the reflection and refraction
// benches, the interference and diffraction engine, guided content (missions,
// presets, hints), accessibility and the visual pass. Each check reads what the
// page DRAWS, PRINTS or ANNOUNCES and compares it with the physics or with
// another part of the same page.
//
// What the audit found, all shipped:
//   - with the object AT F the mirror's parallel ray had no reflected leg, and
//     the ray through C stopped at the object tip, short of a real image;
//   - the plane mirror printed θ = 13.5° and drew 19.4° (x and y scales differed);
//   - the 2D screen spot stopped growing at 42.5% blur;
//   - "no bend, normal incidence" at 3° (n 1.50 → 1.52 bends by 0.04°);
//   - calculator rows RENAMED themselves for the held answer ("Result" meant TIR);
//   - missions announced "Complete" as a hidden result crossed its threshold,
//     and two quick setups parked the screen on the hidden image distance;
//   - the 380-750 nm clamp piled half a broad band onto one coherent line;
//   - overlapping slits (a > d) were summed as two slits;
//   - the whole Visual Lab had no tab and could not be reached.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { withPrediction } from './helpers/optics_prediction.js';

const SRC = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_optics.js'), 'utf8');
const RENDER_TIMEOUT = 30000;
const DEG = Math.PI / 180;
const NUM = '(-?[0-9.]+(?:e-?[0-9]+)?)';
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const text = (html) => decode(html.replace(/<style[^]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

function render(state) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
  return renderTool('opticsLab', { opticsLab: state });
}
const shown = (tab, state) => render(withPrediction(tab, { mode: tab, ...state }));
const lineCoords = (tag) => ['x1', 'y1', 'x2', 'y2'].map((k) => Number(tag.match(new RegExp(' ' + k + '="' + NUM + '"'))[1]));
// The calculator's row labels, in order (the masking keeps these, so they must not say the answer).
const calcLabels = (html) => [...html.matchAll(/<span style="color:var\(--allo-stem-text-soft, #94a3b8\)">([^<]*)<\/span><span/g)].map((m) => m[1]);

describe('Mirror bench — every principal ray the diagram draws is the right ray', () => {
  it('object AT F: the parallel ray reflects through F and leaves parallel to the ray through C', () => {
    const html = shown('reflection', { reflMirrorType: 'concave', reflFocal: 10, reflDo: 10, reflObjH: 6 });
    const rays = [...html.matchAll(/<line [^>]*data-op-mirror-ray="reflected"[^>]*>/g)].map((m) => lineCoords(m[0]));
    expect(rays.length, 'both reflected rays drawn').toBe(2);
    const slope = ([x1, y1, x2, y2]) => (y2 - y1) / (x2 - x1);
    expect(slope(rays[0])).toBeCloseTo(slope(rays[1]), 6);
  }, RENDER_TIMEOUT);

  it('every reflected ray passes through the real image, even one farther out than the object', () => {
    for (const [f, dO, hO] of [[10, 14, 2], [10, 25, 6], [15, 25, 2]]) {   // images inside the view
      const html = shown('reflection', { reflMirrorType: 'concave', reflFocal: f, reflDo: dO, reflObjH: hO });
      const img = lineCoords(html.match(/<line x1="[^"]*" y1="[^"]*" x2="[^"]*" y2="[^"]*" stroke="#ef4444" stroke-width="3"[^>]*>/)[0]);
      const [ix, iy] = [img[2], img[3]];
      const rays = [...html.matchAll(/<line [^>]*data-op-mirror-ray="reflected"[^>]*>/g)].map((m) => lineCoords(m[0]));
      expect(rays.length).toBeGreaterThanOrEqual(2);
      for (const [x1, y1, x2, y2] of rays) {
        // On the segment, not only on its line: the drawn ray reaches the image.
        expect(Math.min(x1, x2) - 0.01, `f ${f} d_o ${dO}`).toBeLessThanOrEqual(ix);
        expect(Math.max(x1, x2) + 0.01).toBeGreaterThanOrEqual(ix);
        const yAt = y1 + (y2 - y1) * (ix - x1) / (x2 - x1);
        expect(Math.abs(yAt - iy), `f ${f} d_o ${dO}: ray misses the image tip`).toBeLessThan(0.05);
      }
    }
  }, RENDER_TIMEOUT);

  it('the plane mirror draws the angle it prints (equal x and y scales)', () => {
    for (const dO of [10, 25, 40]) {
      const html = shown('reflection', { reflMirrorType: 'plane', reflDo: dO, reflObjH: 6 });
      const [x1, y1, x2, y2] = lineCoords(html.match(/<line [^>]*data-op-mirror-ray="incident" data-op-ray-index="0"[^>]*>/)[0]);
      const drawn = Math.atan2(Math.abs(y2 - y1), Math.abs(x2 - x1)) / DEG;
      const printed = Number(text(html).match(/both ([0-9.]+) degrees/)[1]);
      expect(drawn, `d_o ${dO}`).toBeCloseTo(printed, 1);
      expect(printed).toBeCloseTo(Math.atan2(6, dO) / DEG, 1);
    }
  }, RENDER_TIMEOUT);

  it('the 2D screen spot keeps growing with the blur (it stopped at 34 px = 42.5%)', () => {
    for (const s of [30, 42]) {
      const html = shown('reflection', { reflMirrorType: 'concave', reflFocal: 10, reflDo: 25, reflObjH: 6, reflScreenCm: s });
      const ratio = Number(html.match(/data-screen-bundle-ratio="([0-9.]+)"/)[1]);
      const ry = Number(html.match(/data-op-mirror-screen-spot="true"[^>]* ry="([0-9.]+)"/)[1]);
      expect(ratio).toBeGreaterThan(0.425);
      expect(ry, `screen ${s}`).toBeCloseTo(80 * ratio, 3);   // 10 cm aperture = 80 px
    }
  }, RENDER_TIMEOUT);

  it('F and C stay inside the diagram for every focal length the slider offers', () => {
    for (const [type, f] of [['convex', 12], ['convex', 30], ['concave', 30]]) {
      const html = shown('reflection', { reflMirrorType: type, reflFocal: f, reflDo: 25, reflObjH: 6 });
      const xs = [...html.matchAll(/<text x="([-0-9.]+)" y="[-0-9.]+" fill="#(?:fbbf24|94a3b8)" font-size="9" text-anchor="middle">(?:F|C)<\/text>/g)].map((m) => Number(m[1]));
      expect(xs.length, `${type} ${f}`).toBe(2);
      for (const x of xs) { expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(460); }
    }
  }, RENDER_TIMEOUT);

  it('a real image taller than the view is flagged, and the calculator agrees', () => {
    const state = { reflMirrorType: 'concave', reflFocal: 10, reflDo: 13, reflObjH: 6 };
    const html = shown('reflection', state);
    expect(html).toContain('data-op-mirror-image-off="below"');
    expect(text(html)).toContain('The image is outside the diagram; use the numeric d_i readout.');
    // Held, the row does not point at a masked readout.
    const held = text(render({ mode: 'reflection', ...state }));
    expect(held).toContain('The image is outside the diagram.');
    expect(held).not.toContain('use the numeric d_i readout');
  }, RENDER_TIMEOUT);
});

describe('Refraction bench — honest words, and nothing that reads the held split', () => {
  it('"no bend" only at normal incidence or equal indices', () => {
    const t = text(shown('refraction', { refrN1: 1.5, refrN2: 1.52, refrTheta1: 3 }));
    expect(t).toContain('↘ toward the normal');
    expect(t).not.toContain('along the normal');
    expect(text(shown('refraction', { refrN1: 1, refrN2: 1.52, refrTheta1: 0 }))).toContain('along the normal');
  }, RENDER_TIMEOUT);

  it('held, the reflected and transmitted rays are drawn alike; revealed, they follow the split', () => {
    const emphasis = (html) => [...html.matchAll(/data-op-refraction-ray="(reflected|refracted|transmitted)"[^>]*data-visual-emphasis="([0-9.]+)"/g)].map((m) => Number(m[2]));
    for (const theta of [10, 85]) {
      const setup = { mode: 'refraction', refrN1: 1, refrN2: 1.52, refrTheta1: theta };
      const held = emphasis(render(setup));
      expect(held.length, 'both branches drawn').toBe(2);
      expect(held[0], `θ ${theta}`).toBe(held[1]);
      const open = emphasis(render(withPrediction('refraction', setup)));
      expect(open[0]).not.toBe(open[1]);
    }
  }, RENDER_TIMEOUT);

  it('the calculator rows keep the same labels whatever the outcome', () => {
    const refr = (theta) => calcLabels(render({ mode: 'refraction', refrN1: 1.333, refrN2: 1, refrTheta1: theta }));
    expect(refr(60), 'TIR').toEqual(refr(45));
    expect(refr(60)).not.toContain('Result');
    const mirror = (dO) => calcLabels(render({ mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10, reflDo: dO }));
    expect(mirror(10), 'object at F').toEqual(mirror(25));
    const lens = (dO) => calcLabels(render({ mode: 'lenses', lensType: 'converging', lensFocal: 12, lensDo: dO }));
    expect(lens(12), 'object at F').toEqual(lens(25));
  }, RENDER_TIMEOUT);

  it('Air shows as Air, equal indices print 0.0% (not 9.1e-31%), and θ₁ moves in 0.1° steps', () => {
    const html = shown('refraction', { refrN1: 1.52, refrN2: 1.52, refrTheta1: 40 });
    expect(text(html)).toContain('Reflected power (unpolarized) 0.0%');
    expect(text(html)).not.toMatch(/e-[0-9]+%/);
    const air = render({ mode: 'refraction', refrN1: 1, refrN2: 1.52, refrTheta1: 30 });
    expect(air).toMatch(/<select[^>]*data-op-variable="refrN1"[^>]*>[^]*?<option value="Air" selected=""/);
    expect(air).toMatch(/type="range" min="0" max="89" step="0.1"[^>]*data-op-variable="refrTheta1"/);
  }, RENDER_TIMEOUT);
});

describe('Missions and quick setups — nothing announces or hands over a held answer', () => {
  const mission = (html) => ({
    done: html.match(/class="opticslab-mission" data-complete="(true|false)"/)[1] === 'true',
    t: text(html.match(/class="opticslab-mission"[^]*?<\/div><\/div>/)?.[0] || '')
  });

  it('a mission judged on a held result completes only after a prediction', () => {
    const setup = { mode: 'interference', intLambda: 600, intSlitSep: 0.1, intScreenL: 1.4, opMissionStage: { interference: 0 } };
    const held = mission(render(setup));
    expect(held.done).toBe(false);
    expect(held.t).toContain('Save a prediction for your setup to have it checked.');
    // The same words whether or not the target is met: "not met" reads identically.
    expect(mission(render({ ...setup, intScreenL: 1.2 })).t).toBe(held.t);
    expect(mission(render(withPrediction('interference', setup))).done).toBe(true);
  }, RENDER_TIMEOUT);

  it('"Collimate" needs the object ON the focal plane; the circular-light mission needs P₂ at 90°', () => {
    const lens = (dO) => mission(render({ mode: 'lenses', lensType: 'converging', lensFocal: 12, lensDo: dO, opMissionStage: { lenses: 1 } })).done;
    expect(lens(11.8)).toBe(false);
    expect(lens(12)).toBe(true);
    const pol = (theta2) => mission(render({ mode: 'polarization', polQwp: true, polTheta2: theta2, opMissionStage: { polarization: 2 } })).done;
    expect(pol(30), 'ticking the plate alone').toBe(false);
    expect(pol(90)).toBe(true);
  }, RENDER_TIMEOUT);

  it('"Put a grating order on the screen" needs m = 1 on the ±500 mm screen, not just to exist', () => {
    const m2 = (L, nm) => mission(render(withPrediction('diffraction', { mode: 'diffraction', diffMode: 'grating', diffGrating: 600, diffLambda: nm, diffScreenL: L, opMissionStage: { diffraction: 1 } }))).done;
    expect(m2(1.5, 600), 'm = 1 lands at 579 mm').toBe(false);
    expect(m2(1.0, 633)).toBe(true);
  }, RENDER_TIMEOUT);

  it('no quick setup parks the screen on the hidden image distance', () => {
    const start = SRC.indexOf('var OPTICS_TOPIC_PRESETS = {');
    const body = SRC.slice(start + 'var OPTICS_TOPIC_PRESETS = '.length, SRC.indexOf('\n  };', start) + 4).replace(/\/\/[^\n]*/g, '');
    const presets = vm.runInNewContext('(' + body + ')');
    for (const tab of ['reflection', 'lenses']) {
      for (const p of presets[tab]) {
        const f = tab === 'reflection' ? p.patch.reflFocal : p.patch.lensFocal;
        const dO = tab === 'reflection' ? p.patch.reflDo : p.patch.lensDo;
        const screen = tab === 'reflection' ? p.patch.reflScreenCm : p.patch.lensScreenCm;
        if (screen == null || dO === f) continue;
        const di = 1 / (1 / f - 1 / dO);
        expect(Math.abs(screen - di), `${tab} "${p.label}"`).toBeGreaterThan(1);
      }
      for (const p of presets[tab]) expect(p.label, 'named for the setup, not the result').not.toMatch(/real image|magnifier/i);
    }
  }, RENDER_TIMEOUT);

  it('a prediction for another setup asks for this one; the causal law waits with the result', () => {
    const t = text(render({ mode: 'lenses', opPredictionNotes: { lenses: 'Some idea.' }, opTopicTouched: { lenses: true } }));
    expect(t).toContain('Predict this setup');
    const chain = text(render({ mode: 'interference', intLambda: 700, intSlitSep: 0.1, intScreenL: 1, intSlitWidth: 50,
      opTopicTouched: { interference: true },
      opTopicSnapshots: { interference: { before: { intLambda: 600, intSlitSep: 0.1, intScreenL: 1, intSlitWidth: 50 } } } }));
    expect(chain).toContain('Which law links this change to the result?');
    expect(chain).not.toContain('directly proportional to wavelength');
  }, RENDER_TIMEOUT);
});

describe('Inquiry sandbox and navigation', () => {
  const iq = (extra) => text(render({ mode: 'inquiry', snellInquiry: Object.assign({ wavelength: 550 }, extra) }));
  const called = (n1, n2, angle) => iq({ n1, n2, angle, predictedFor: n1.toFixed(3) + '|' + n2.toFixed(3) + '|' + angle, predictedOutcome: 'refract', predictedActual: 'refract' });

  it('equal indices do not "bend away"; "grazing" only when most light reflects', () => {
    const same = called(1, 1, 30);
    expect(same).toContain('No bend');
    expect(same).toContain('There is no boundary to bend at');
    expect(same).not.toContain('Bend away from normal');
    // Air → glass at 70°: 83% still transmits (the tool's own Fresnel numbers).
    expect(called(1, 1.52, 70)).not.toContain('Grazing incidence');
    expect(called(1, 1.52, 88)).toContain('Grazing incidence');
  }, RENDER_TIMEOUT);

  it('the Visual Lab has a tab (it was built without one)', () => {
    const nav = render({ mode: 'home', showOpticsLibrary: true });
    expect(nav).toContain('id="op-tab-viz"');
    const viz = render({ mode: 'viz', showOpticsLibrary: true });
    expect(viz).toMatch(/aria-labelledby="op-tab-viz"/);
    expect(viz).toContain('id="op-tab-viz"');
  }, RENDER_TIMEOUT);
});

describe('Interference and diffraction — the engine and its readouts', () => {
  it('overlapping slits are one opening of width d + a (the overlap was counted twice)', () => {
    // a 200 μm, d 0.1 mm, 600 nm, 1 m: one 300 μm opening has zeros at ±2 mm.
    const reading = (mm) => Number(render(withPrediction('interference', { mode: 'interference', intLambda: 600, intSlitSep: 0.1, intSlitWidth: 200, intScreenL: 1, intScreenProbeMm: mm }))
      .match(/data-op-detector-intensity="([0-9.]+)"/)[1]);
    expect(reading(2)).toBeLessThan(0.001);
    const beta = Math.PI * 300e-6 * Math.sin(Math.atan(3e-3)) / 600e-9;
    expect(reading(3)).toBeCloseTo((Math.sin(beta) / beta) ** 2, 3);
  }, RENDER_TIMEOUT);

  it('a broad band is not clamped at the visible edge: the fringes wash out as they should', () => {
    // 750 ± 40 nm, d 0.5 mm, a 10 μm, L 2 m: the unclamped band gives a drawn
    // fringe contrast near 0.46 at 22-30 mm; clamping half the band onto one
    // coherent 750 nm line kept it at 0.72.
    const html = render({ mode: 'interference', intLambda: 750, intBandwidthNm: 80, intSlitSep: 0.5, intSlitWidth: 10, intScreenL: 2 });
    const bars = [...html.matchAll(/data-op-int-sample="([0-9]+)"[^>]* opacity="([0-9.]+)"/g)].map((m) => ({ i: Number(m[1]), I: Number(m[2]) }));
    const n = bars.length;
    const edge = bars.filter((b) => b.i / (n - 1) <= 8 / 60).map((b) => b.I);
    const contrast = (Math.max(...edge) - Math.min(...edge)) / (Math.max(...edge) + Math.min(...edge));
    expect(contrast, 'fringe contrast at 22-30 mm').toBeLessThan(0.6);
    expect(contrast).toBeGreaterThan(0.3);
  }, RENDER_TIMEOUT);

  it('the broad-band label names the whole band', () => {
    const html = render({ mode: 'interference', intLambda: 750, intBandwidthNm: 80, intAdvancedOpen: true });
    const t = text(html);
    if (t.includes('source band from')) {
      expect(t).toContain('source band from 710 to 790 nanometers, partly outside the visible scale');
    } else {
      expect(decode(html)).toContain('source band from 710 to 790 nanometers, partly outside the visible scale');
    }
  }, RENDER_TIMEOUT);

  it('the detector is clamped to the current mode’s screen in every view', () => {
    const html = render(withPrediction('diffraction', { mode: 'diffraction', diffMode: 'single', diffScreenProbeMm: 410.56, diffShowWavefield3D: true }));
    const mms = [...html.matchAll(/data-op-detector-mm="(-?[0-9.]+)"/g)].map((m) => Number(m[1]));
    expect(mms.length).toBeGreaterThan(0);
    for (const mm of mms) expect(mm).toBeLessThanOrEqual(90);
  }, RENDER_TIMEOUT);

  it('held, the grating shows no order labels ("m=+2 missing" is the answer) and draws every order ray alike', () => {
    const setup = { mode: 'diffraction', diffMode: 'grating', diffGrating: 600, diffLambda: 633, diffGratingDuty: 50, diffScreenL: 0.4 };
    const rayStyles = (html) => [...html.matchAll(/stroke-width="([0-9.]+)" opacity="([0-9.]+)" data-op-diffraction-order-ray="[-0-9]+"/g)].map((m) => m[1] + '/' + m[2]);
    const held = render(setup);
    expect(held).not.toContain('data-op-grating-order-missing');
    const heldStyles = rayStyles(held);
    expect(heldStyles.length, 'order rays drawn').toBeGreaterThan(2);
    expect(new Set(heldStyles).size, 'held rays drawn alike').toBe(1);
    const open = render(withPrediction('diffraction', setup));
    expect(open).toContain('data-op-grating-order-missing="true"');
    expect(new Set(rayStyles(open)).size, 'revealed rays follow the envelope').toBeGreaterThan(1);
  }, RENDER_TIMEOUT);

  it('on an exact grating order the field keeps the sign of its neighbours: (−1)^m, not +1', () => {
    // 600 lines/mm, 600 nm, 50% open, L = 1 m: m = 1 at L·tan(asin 0.36); amplitude sinc(π/2)·(−1) = −0.637.
    const orderMm = 1000 * Math.tan(Math.asin(0.36));
    const field = (mm) => {
      const html = render(withPrediction('diffraction', { mode: 'diffraction', diffMode: 'grating', diffGrating: 600, diffLambda: 600, diffGratingDuty: 50, diffScreenL: 1,
        diffScreenProbeMm: mm, diffShowWavefield3D: true, diffWavefieldProbe: 1 }));
      return Number(html.match(/data-op-probe-field="(-?[0-9.]+)"/)[1]);
    };
    expect(field(orderMm)).toBeCloseTo(-2 / Math.PI, 2);
    expect(Math.sign(field(orderMm + 0.1))).toBe(-1);
  }, RENDER_TIMEOUT);

  it('the calculators say "missing", "grazes" and "off the screen" where the bench does', () => {
    const intf = text(shown('interference', { intLambda: 600, intSlitSep: 0.1, intScreenL: 1, intSlitWidth: 50 }));
    expect(intf).toMatch(/2nd bright fringe \(m=2\) 12\.000 mm from center \(missing: d\/a = 2\.00/);
    const grazing = text(shown('diffraction', { diffMode: 'grating', diffGrating: 1000, diffLambda: 500, diffScreenL: 1 }));
    expect(grazing).toContain('90° (mλ = d): grazes along the grating');
    const off = text(shown('diffraction', { diffMode: 'grating', diffGrating: 600, diffLambda: 600, diffScreenL: 1.5 }));
    expect(off).toContain('off the ±500 mm bench screen');
    expect(off).not.toMatch(/578\.[0-9]+ mm on screen/);
    const wide = text(shown('diffraction', { diffMode: 'single', diffSlitWidth: 5, diffLambda: 750, diffScreenL: 0.5 }));
    expect(wide).toContain('the exact zero is at 75.86 mm');
  }, RENDER_TIMEOUT);
});

describe('Accessibility — what a screen reader hears matches the picture', () => {
  it('the rainbow, mirage and eye pictures say their current result', () => {
    const rb = decode(render({ mode: 'phenomena', phenoSub: 'rainbow', phenoRbSunAlt: 60 }));
    expect(rb).toContain('Now: the sun is 60° up, so the bow falls below the horizon and no rainbow is visible.');
    const mirage = decode(render({ mode: 'phenomena', phenoSub: 'mirage', phenoMirageGrad: 0 }));
    expect(mirage).toContain('Now: No heating: no ray curves back up.');
    const eye = decode(render({ mode: 'phenomena', phenoSub: 'eye', phenoEyeCondition: 'myopia', phenoEyeDist: 500 }));
    expect(eye).toContain('Now: nearsighted (myopic) eye, object at 500 cm. Blurry: the rays meet 1.9 mm in front of the retina.');
    expect(eye).toMatch(/Near point about 8 cm; far point about 28 cm\./);
  }, RENDER_TIMEOUT);

  it('selectors say which one is chosen; label-changing toggles carry no aria-pressed', () => {
    const eye = render({ mode: 'phenomena', phenoSub: 'eye', phenoEyeCondition: 'myopia' });
    expect([...eye.matchAll(/<button aria-pressed="true"/g)].length).toBe(1);
    const page = render({ mode: 'lenses' });
    expect(page).not.toMatch(/aria-pressed="[a-z]+"[^>]*>(Pause motion|Resume motion|Focus on experiment|Exit focus view)</);
  }, RENDER_TIMEOUT);

  it('the refraction diagram (a fixed dark ground) takes no light-theme ink swaps', () => {
    const html = render({ mode: 'refraction' });
    const svg = html.match(/<svg[^>]*opticslab-core-svg[^>]*>/)[0];
    expect(svg).not.toContain('opticslab-svg-themed-ground');
    // ...while the mirror and lens diagrams, whose ground follows the theme, keep it.
    expect(render({ mode: 'reflection' })).toMatch(/<svg[^>]*opticslab-core-svg opticslab-svg-themed-ground/);
  }, RENDER_TIMEOUT);
});
