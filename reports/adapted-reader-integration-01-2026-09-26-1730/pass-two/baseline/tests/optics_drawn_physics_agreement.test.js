// Optics Lab, audit round 9 (Sept 2026): calculators, the flat polarization
// bench, phenomena, the lens bench and the visual-lab mini-sims. Each check
// reads what the page DRAWS or PRINTS and compares it with the physics, or
// with another part of the same page that must agree with it.
//
// What the audit found, all shipped:
//   - a NORMAL eye read "far point beyond ∞": its relaxed power was 44 D, but a
//     22.7 mm eye needs 1000/22.7 = 44.05 D to focus infinity on the retina;
//   - E-field arrows grew longer after a polarizer (8 + 4·I₂/I₁), where the
//     amplitude is √I and can only shrink;
//   - the AR designer said "×1.0: this coating makes reflection worse";
//   - the depth-of-field calculator printed "TOTAL -0.00 m" for a subject at
//     the focal length;
//   - the grating calculator gave m_max = 1 for 1000 lines/mm at 500 nm
//     (2e-6 / 5e-7 = 1.9999999999999996);
//   - the EM strip painted "visible" across 45-63% of a log axis where
//     visible light is 61.2-62.6%;
//   - the lens calculator's "outside the diagram" row used |d_i| > 45 while
//     the diagram tested |d_i| and the image height.

import { describe, it, expect } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { withPrediction } from './helpers/optics_prediction.js';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_optics.js'), 'utf8');

const RENDER_TIMEOUT = 30000;
const DEG = Math.PI / 180;
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const text = (html) => decode(html.replace(/<style[^]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

function render(state) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
  return renderTool('opticsLab', { opticsLab: state });
}
const calc = (sub, state = {}) => render({ mode: 'calcs', calcSubTool: sub, ...state });
const pheno = (sub, state = {}) => render({ mode: 'phenomena', phenoSub: sub, ...state });
const viz = (state) => render({ mode: 'viz', ...state });

describe('Optics calculators — each printed number follows from the inputs', () => {
  it('fiber: the drawn guided ray bounces at asin(NA/n_core), and NA ≥ n_ext means 90°, not NaN', () => {
    for (const [nCore, nClad] of [[1.5, 1.48], [1.5, 1.4], [1.62, 1.52]]) {
      const html = calc('fiber', { fiberNCore: nCore, fiberNClad: nClad });
      const m = html.match(/points="([^"]+)" data-op-fiber-ray-deg="([0-9.]+)"/);
      expect(m, `${nCore}/${nClad}: guided ray not drawn`).toBeTruthy();
      const na = Math.sqrt(nCore * nCore - nClad * nClad);
      expect(Number(m[2])).toBeCloseTo(Math.asin(na / nCore) / DEG, 2);
      // Every drawn leg has that slope and turns at the core walls (y 95 and 125).
      const pts = m[1].split(' ').map((p) => p.split(',').map(Number));
      expect(pts.length, 'the ray reflects at least once').toBeGreaterThan(2);
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        expect(Math.abs(y1 - y0) / (x1 - x0), `leg ${i}`).toBeCloseTo(Math.tan(Number(m[2]) * DEG), 1);
        if (i < pts.length - 1) expect([95, 125]).toContain(y1);
      }
    }
    const wide = text(calc('fiber', { fiberNCore: 1.7, fiberNClad: 1.3 }));
    expect(wide).not.toContain('NaN');
    expect(wide).toContain('90.00°');
    expect(wide).toContain('every ray that enters is guided');
  }, RENDER_TIMEOUT);

  it('AR coating: the printed ratio matches the two printed reflectances, and a near-perfect coat is not "100%"', () => {
    // A quarter wave of a coat DENSER than the glass is a reflector. n = 1.8
    // (76.4 nm at 550 nm) makes ×3.07, which one decimal would print as ×3.1.
    for (const [nc, tt] of [[1.8, 76.4], [2.2, 62.5]]) {
      const worse = calc('arcoat', { arNCoat: nc, arT: tt });
      const t = text(worse);
      const R = Number(t.match(/With this coating: ([0-9.]+)%/)[1]);
      const R0 = Number(t.match(/Uncoated glass: ([0-9.]+)%/)[1]);
      expect(R).toBeGreaterThan(R0);
      const ratio = Number(worse.match(/data-op-ar-worse="true"[^>]*>×([0-9.]+):/)[1]);
      expect(Math.abs(ratio - R / R0), `n ${nc}: ×${ratio} vs ${R}/${R0}`).toBeLessThan(0.01);
    }
    // Default quarter-wave MgF₂-like coat: some light still reflects, so not 100.0%.
    const best = text(calc('arcoat'));
    expect(best).toContain('Reduction: >99.9%');
    expect(best).not.toContain('100.0%');
    // A half-wave layer (2nt = 2λ here) is invisible: same reflectance as bare
    // glass. Float noise used to put it a hair above: "×1.00 ... makes reflection worse".
    const halfWave = calc('arcoat', { arNCoat: 2.2, arT: 250 });
    expect(halfWave).not.toContain('data-op-ar-worse');
    expect(text(halfWave)).toContain('Change: none: this layer reflects like bare glass (2nt = 2λ, a half-wave layer)');
  }, RENDER_TIMEOUT);

  it('EM spectrum: every tick and the rainbow sit where their frequencies fall on the log axis', () => {
    const html = calc('em');
    const pct = (logF) => (logF - 3) / 19 * 100;
    const ticks = [...html.matchAll(/data-op-em-tick-pct="([0-9.]+)"[^>]*>([^<]+)</g)].map((m) => [m[2], Number(m[1])]);
    const want = { kHz: 3, MHz: 6, GHz: 9, THz: 12, 'X-ray': 17, 'γ-ray': 20 };
    for (const [label, logF] of Object.entries(want)) {
      const tick = ticks.find(([l]) => l === label);
      expect(tick, label).toBeTruthy();
      expect(tick[1], label).toBeCloseTo(pct(logF), 1);
    }
    const vis = ticks.find(([l]) => l === 'visible');
    const from = Number(html.match(/data-op-em-visible-from="([0-9.]+)"/)[1]);
    const to = Number(html.match(/data-op-em-visible-to="([0-9.]+)"/)[1]);
    expect(from).toBeCloseTo(pct(Math.log10(3e8 / 700e-9)), 1);
    expect(to).toBeCloseTo(pct(Math.log10(3e8 / 380e-9)), 1);
    expect(vis[1]).toBeGreaterThan(from);
    expect(vis[1]).toBeLessThan(to);
    // The painted strip: red starts at "from", violet ends at "to", grey outside.
    const grad = decode(html).match(/linear-gradient\(90deg,[^)]*\)/)[0];
    expect(grad).toContain('#ef4444 ' + from.toFixed(2) + '%');
    expect(grad).toContain('#8b5cf6 ' + to.toFixed(2) + '%');
    const stops = [...grad.matchAll(/(#[0-9a-f]{6}) ([0-9.]+)%/g)].map((m) => [m[1], Number(m[2])]);
    const coloured = stops.filter(([c]) => !['#1e293b', '#475569'].includes(c));
    for (const [c, p] of coloured) {
      expect(p, c).toBeGreaterThanOrEqual(from - 0.01);
      expect(p, c).toBeLessThanOrEqual(to + 0.01);
    }
  }, RENDER_TIMEOUT);

  it('depth of field: a subject at or inside the focal length gets a warning, not negative distances', () => {
    const bad = calc('dof', { dofF: 200, dofDist: 200 });
    expect(bad).toContain('data-op-dof-impossible="true"');
    expect(text(bad)).not.toContain('TOTAL DOF');
    const ok = text(calc('dof', { dofF: 50, dofDist: 3000 }));
    const near = Number(ok.match(/NEAR DOF LIMIT ([0-9.]+) m/)[1]);
    const far = Number(ok.match(/FAR DOF LIMIT ([0-9.]+) m/)[1]);
    expect(near).toBeLessThan(3);
    expect(far).toBeGreaterThan(3);
    expect(ok).not.toMatch(/-[0-9.]+ m/);
  }, RENDER_TIMEOUT);

  it('grating: m_max = floor(d/λ) exactly, and a whole-number d/λ says its top order grazes at 90°', () => {
    const t = text(calc('grating', { gratLines: 1000, gratLambda: 500 }));
    expect(t).toContain('m_max = floor(d/λ) = floor(2.00) = 2.');
    expect(t).toContain('the m = 2 order leaves at 90°');
    const u = text(calc('grating', { gratLines: 600, gratLambda: 550 }));
    expect(u).toContain('floor(3.03) = 3.');
    expect(u).not.toContain('leaves at 90°');
  }, RENDER_TIMEOUT);

  it('Brewster: equal indices have no boundary and no Brewster angle', () => {
    const t = text(calc('brewster', { brewsterN1: 1.5, brewsterN2: 1.5, brewsterTheta: 45 }));
    expect(t).toContain('there is no Brewster angle to find');
  }, RENDER_TIMEOUT);

  it('three polarizers: the text says when the middle filter changes nothing', () => {
    // Middle aligned with the first: it passes everything, so the crossed pair still gives 0.
    expect(text(calc('polartri', { polTriTheta2: 0, polTriTheta3: 90 }))).toContain('Here the middle filter makes no difference');
    expect(text(calc('polartri', { polTriTheta2: 45, polTriTheta3: 90 }))).not.toContain('Here the middle filter makes no difference');
  }, RENDER_TIMEOUT);
});

describe('Optics polarization bench (flat view) — amplitudes, not intensities', () => {
  it('E-field arrows shrink as √I through each polarizer, never grow', () => {
    const html = render(withPrediction('polarization', { mode: 'polarization', polUseP3: true, polTheta2: 45, polTheta3: 90 }));
    const halves = [...html.matchAll(/<line x1="([-0-9.e]+)" y1="([-0-9.e]+)" x2="([-0-9.e]+)" y2="([-0-9.e]+)"[^>]*class="opticslab-efield-vec"/g)]
      .map((m) => Math.hypot(m[3] - m[1], m[4] - m[2]) / 2);
    // After P₁ (I = ½): 10 px. After P₂ at 45° (¼): 10·√½. After P₃ at 90° (⅛): 10·√¼.
    const after = (len) => halves.filter((h) => Math.abs(h - len) < 0.01).length;
    expect(after(10), 'after P₁').toBe(3);
    expect(after(10 * Math.SQRT1_2), 'after P₂').toBe(2);
    expect(after(5), 'after P₃').toBe(2);
  }, RENDER_TIMEOUT);

  it('circular light after the plate: rings of radius 10/√2, turning anticlockwise, with room when P₃ is in', () => {
    const qwp = render(withPrediction('polarization', { mode: 'polarization', polQwp: true }));
    const rings = [...qwp.matchAll(/data-op-pol-efield="circular"[^>]* r="([0-9.]+)"/g)].map((m) => Number(m[1]));
    expect(rings.length).toBe(2);
    for (const r of rings) expect(r).toBe(7);
    expect([...qwp.matchAll(/data-op-pol-circular-sense="ccw"/g)].length).toBe(2);
    const both = render(withPrediction('polarization', { mode: 'polarization', polQwp: true, polUseP3: true }));
    expect([...both.matchAll(/data-op-pol-efield="circular"/g)].length, 'P₃ in: the circular light is still drawn').toBeGreaterThanOrEqual(1);
    // On a phone the diagram is 360 px wide: P₂ and P₃ move right to leave a gap
    // for the ring, and a gap of 10 px or more still gets one (smaller) ring.
    const phone = render(withPrediction('polarization', { mode: 'polarization', polQwp: true, polUseP3: true, opViewportWidth: 360 }));
    expect([...phone.matchAll(/data-op-pol-efield="circular"/g)].length, 'phone, P₃ in').toBe(1);
  }, RENDER_TIMEOUT);
});

describe('Optics phenomena — the eye, the rainbow and the prism draw their own model', () => {
  const eyeText = (s) => text(pheno('eye', s));
  const farPoint = (t) => t.match(/Far point: (~∞|~[0-9]+ cm|beyond ∞)/)[1];

  it('a normal relaxed eye focuses infinity on the retina: far point ∞, not "beyond ∞"', () => {
    expect(farPoint(eyeText({ phenoEyeCondition: 'normal' }))).toBe('~∞');
    expect(farPoint(eyeText({ phenoEyeCondition: 'normal', phenoEyeAge: 60 }))).toBe('~∞');
    // A hyperope's relaxed eye still has power to spare: parallel light focuses behind the retina.
    expect(farPoint(eyeText({ phenoEyeCondition: 'hyperopia' }))).toBe('beyond ∞');
    expect(farPoint(eyeText({ phenoEyeCondition: 'myopia' }))).toMatch(/^~[0-9]+ cm$/);
    // Glasses in 0.25 D steps: the nearest step (+4.25 D for this 20.7 mm eye)
    // corrects it; +3 D leaves 1.26 D of hyperopia.
    expect(farPoint(eyeText({ phenoEyeCondition: 'hyperopia', phenoEyeGlasses: true, phenoEyeGlassesD: 4.25 }))).toBe('~∞');
    expect(farPoint(eyeText({ phenoEyeCondition: 'hyperopia', phenoEyeGlasses: true, phenoEyeGlassesD: 3 }))).toBe('beyond ∞');
  }, RENDER_TIMEOUT);

  it('the focus marker sits where the vergence rule puts the image, in front of or behind the retina', () => {
    // Myope (24.7 mm eye), relaxed, object at 5 m: image at 1/(P − 1/d) = 22.80 mm.
    const myope = pheno('eye', { phenoEyeCondition: 'myopia', phenoEyeDist: 500 });
    const Prelaxed = 1000 / 22.7;
    expect(Number(myope.match(/data-op-eye-focus-mm="(-?[0-9.]+)"/)[1])).toBeCloseTo(1000 / (Prelaxed - 1000 / 5000) - 24.7, 2);
    // 60-year-old at 15 cm: full accommodation (the printed maximum) still focuses behind.
    const old = pheno('eye', { phenoEyeCondition: 'normal', phenoEyeAge: 60, phenoEyeDist: 15 });
    const pMax = Number(text(old).match(/range [0-9]+–([0-9]+) D/)[1]);
    const shown = Number(old.match(/data-op-eye-focus-mm="(-?[0-9.]+)"/)[1]);
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeCloseTo(1000 / (pMax - 1000 / 150) - 22.7, 1);
    // An eye that can focus the object shows no marker.
    expect(pheno('eye', { phenoEyeCondition: 'normal', phenoEyeDist: 25 })).not.toContain('data-op-eye-focus-mm');
  }, RENDER_TIMEOUT);

  it('glasses for a myope are drawn biconcave (diverging)', () => {
    expect(pheno('eye', { phenoEyeCondition: 'myopia', phenoEyeGlasses: true, phenoEyeGlassesD: -3 })).toContain('data-op-eye-glasses-shape="biconcave"');
  }, RENDER_TIMEOUT);

  it('the rainbow is clipped at the horizon, and its drops pulse as growing rings', () => {
    const html = pheno('rainbow');
    expect(html).toContain('<clipPath id="rbAboveHorizon">');
    expect(html).toMatch(/<g clip-path="url\(#rbAboveHorizon\)" data-op-rainbow-clipped="true">/);
    // Every coloured arc is inside the clipped group, so none dips below the ground.
    const group = html.slice(html.indexOf('data-op-rainbow-clipped="true"'));
    const clippedArcs = group.slice(0, group.indexOf('</g>')).match(/<path /g) || [];
    expect(clippedArcs.length).toBeGreaterThan(0);
    // The drop markers use the drop keyframes (a growing radius), not the E-field
    // "scale" pulse, which shrank them to nothing about their own corner.
    expect(html).toContain('class="opticslab-drop-pulse"');
    expect(SRC).toMatch(/@keyframes opticslab-drop-pulse \{',\s*'\s*0%\s*\{ r: 1;[^']*',\s*'\s*100% \{ r: 5;/);
  }, RENDER_TIMEOUT);

  it('a steep prism reflects every colour internally, and draws the reflected rays', () => {
    const steep = pheno('prism', { phenoPrismApex: 80 });
    expect([...steep.matchAll(/data-op-prism-ray="tir-reflected"/g)].length).toBeGreaterThan(0);
    expect(pheno('prism', { phenoPrismApex: 45 })).not.toContain('data-op-prism-ray="tir-reflected"');
  }, RENDER_TIMEOUT);

  it('the colour mixers name the centre colour in words, not only as a swatch', () => {
    const t = text(pheno('colormix'));
    expect(t).toContain('Center: white (rgb 255, 255, 255)');
    expect(t).toContain('Center: black (rgb 0, 0, 0)');
  }, RENDER_TIMEOUT);
});

describe('Optics lens bench — the calculator, the diagram and the screen agree', () => {
  const lens = (s) => render(withPrediction('lenses', { mode: 'lenses', lensType: 'converging', ...s }));

  it('"outside the diagram" in the calculator exactly when the diagram says so', () => {
    for (const [f, dO, h, outside] of [[10, 15, 6, true], [10, 15, 5, false], [10, 11, 5, true], [10, 30, 5, false]]) {
      const t = text(lens({ lensFocal: f, lensDo: dO, lensObjH: h }));
      const calcSays = t.includes('The image is outside the diagram; use the numeric d_i readout.');
      const diagramSays = t.includes('image is outside the current diagram');
      expect(calcSays, `f ${f} d_o ${dO} h ${h}: calculator`).toBe(outside);
      expect(diagramSays, `f ${f} d_o ${dO} h ${h}: diagram`).toBe(outside);
    }
  }, RENDER_TIMEOUT);

  it('the screen can reach "sharp": within half a 0.1 cm step of the image', () => {
    // f = 4, d_o = 40: the image is at 4.444 cm; 4.4 is the nearest screen stop.
    const state = (cm) => lens({ lensFocal: 4, lensDo: 40, lensScreenCm: cm }).match(/data-op-lens-screen-test="([a-z-]+)"/)[1];
    expect(state(4.4)).toBe('sharp');
    expect(state(4.3)).toBe('blurred');
    expect(state(4.6)).toBe('blurred');
  }, RENDER_TIMEOUT);

  it('a spot off the top or bottom of the view is labelled, not pinned silently to the edge', () => {
    // Magnification −5 at the screen: the spot is far below the axis.
    const off = lens({ lensFocal: 10, lensDo: 12, lensObjH: 5, lensScreenCm: 30 });
    expect(off).toContain('data-op-screen-spot-off="below"');
    expect(text(off)).toContain('↓ spot below view');
    expect(lens({ lensFocal: 10, lensDo: 30, lensObjH: 5, lensScreenCm: 15 })).not.toContain('data-op-screen-spot-off');
  }, RENDER_TIMEOUT);

  it('worked math puts a negative number in parentheses', () => {
    const t = text(render(withPrediction('lenses', { mode: 'lenses', lensType: 'diverging', lensFocal: 12, lensDo: 25, lensShowMath: true })));
    // _fmt prints an ASCII hyphen; the formula's operators are U+2212 minus.
    expect(t).not.toMatch(/− [-−][0-9]/);
    expect(t).not.toMatch(/−[-−][0-9]/);
    expect(t).toContain('(25.00 − (-12.00))');
    expect(t).toContain('−(-8.108) / 25.000');
  }, RENDER_TIMEOUT);
});

describe('Optics visual lab (round 9) — each drawing follows its own rule', () => {
  it('spherical aberration: every ray focuses at 270 − SA·(h/40)², and the red dot is the marginal focus', () => {
    for (const sa of [0, 30, 70]) {
      const html = viz({ vizShowSa: true, vizSaAmt: sa });
      const rays = [...html.matchAll(/<line x1="120" y1="([0-9]+)" x2="([0-9.]+)" y2="100"/g)].map((m) => ({ y: Number(m[1]), x: Number(m[2]) }));
      expect(rays.length).toBe(6);
      for (const r of rays) expect(r.x, `SA ${sa}, height ${r.y}`).toBeCloseTo(270 - sa * ((r.y - 100) / 40) ** 2, 6);
      const red = Number(html.match(/<circle cx="([0-9.]+)" cy="100" r="3" fill="#dc2626"/)[1]);
      expect(red).toBe(Math.min(...rays.map((r) => r.x)));
    }
  }, RENDER_TIMEOUT);

  it('Fresnel lens: the ring drops add up to the plain lens\'s sag, and every ray meets one focus', () => {
    const html = viz({ vizShowFl: true });
    const drops = new Map([...html.matchAll(/data-op-viz-fresnel-facet="([0-9]+)" data-op-viz-fresnel-drop="([0-9.]+)"/g)].map((m) => [m[1], Number(m[2])]));
    expect(drops.size).toBe(5);
    // Parabolic surface x = 20·(y/50)²: each ring drops by its share of the 20 px sag.
    expect([...drops.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(20, 6);
    // ...and outer rings drop more, as (2k + 1): five identical rings would be five
    // little lenses with five different foci.
    for (const [k, drop] of drops) expect(drop, `ring ${k}`).toBeCloseTo(drops.get('0') * (2 * Number(k) + 1), 6);
    const ends = [...html.matchAll(/data-op-viz-fresnel-ray="true" points="[^"]* ([0-9.]+),([0-9.]+)"/g)].map((m) => m[1] + ',' + m[2]);
    expect(ends.length).toBe(4);
    expect(new Set(ends)).toEqual(new Set(['170,110']));
    const ratio = Number(html.match(/data-op-viz-fresnel-ratio="([0-9.]+)"/)[1]);
    // Against a lens of the SAME power: one curved face with the 20 px sag the rings
    // copy (plano-convex). The old biconvex outline had twice the power, so "4×".
    expect(html).toContain('data-op-viz-fresnel-regular="plano-convex"');
    expect(ratio).toBeCloseTo(20 / (3 + Math.max(...drops.values())), 2);
  }, RENDER_TIMEOUT);

  it('grating: one label per order up to floor(d/λ), the m = 0 beam, and the grazing order named', () => {
    for (const [lines, lam, want, grazes] of [[600, 550, 3, false], [1000, 500, 2, true], [1500, 700, 0, false]]) {
      const html = viz({ vizShowDg: true, vizDgLines: lines, vizDgLam: lam });
      expect([...html.matchAll(/data-op-viz-grating-label="/g)].length, `${lines}/${lam}`).toBe(want);
      expect(html).toContain('data-op-viz-grating-m0="true"');
      expect(text(html).includes('grazes along the grating at 90°'), `${lines}/${lam} grazing note`).toBe(grazes);
    }
  }, RENDER_TIMEOUT);

  it('Newtonian telescope: the flat is at 45°, turned about its own centre', () => {
    const html = viz({ vizShowTel: true, vizTelType: 'newtonian' });
    const m = html.match(/<rect x="([0-9.]+)" y="([0-9.]+)" width="([0-9.]+)" height="([0-9.]+)"[^>]*transform="rotate\((-?[0-9.]+) ([0-9.]+) ([0-9.]+)\)"/);
    expect(m, 'secondary mirror').toBeTruthy();
    const [x, y, w, h, a, cx, cy] = m.slice(1).map(Number);
    expect(Math.abs(a)).toBe(45);
    expect(cx).toBe(x + w / 2);
    expect(cy).toBe(y + h / 2);
  }, RENDER_TIMEOUT);

  it('refractive-index bars are ∝ n and listed from lowest to highest', () => {
    const html = viz({ vizShowRi: true });
    const bars = [...html.matchAll(/<text x="100" y="[0-9.]+" text-anchor="end"[^>]*>([^<]+)<\/text><rect x="110" y="[0-9.]+" width="([0-9.]+)"[^>]*><\/rect><text[^>]*>n=([0-9.]+)</g)]
      .map((m) => ({ name: m[1], w: Number(m[2]), n: Number(m[3]) }));
    expect(bars.length).toBe(10);
    for (const b of bars) expect(b.w, b.name).toBeCloseTo(b.n * 80, 6);
    for (let i = 1; i < bars.length; i++) expect(bars[i].n, bars[i].name).toBeGreaterThanOrEqual(bars[i - 1].n);
  }, RENDER_TIMEOUT);

  it('the fact list of refractive indices is in rising order too', () => {
    const t = text(viz({ vizShowL61: true }));
    const from = t.indexOf('Material refractive indices, lowest to highest.');
    expect(from).toBeGreaterThan(-1);
    const seg = t.slice(from, t.indexOf('Diamond', from) + 20);
    // A range ("1.58 to 1.62") ranks by its middle.
    const ns = [...seg.matchAll(/ ([0-9]\.[0-9]+)(?: to ([0-9]\.[0-9]+))?(?: \(|\.)/g)].map((m) => (m[2] ? (Number(m[1]) + Number(m[2])) / 2 : Number(m[1])));
    expect(ns.length).toBe(12);
    for (let i = 1; i < ns.length; i++) expect(ns[i], seg).toBeGreaterThanOrEqual(ns[i - 1]);
  }, RENDER_TIMEOUT);
});
