// Optics Lab, audit round 11 (Sept 2026): the Calculators hub, the Visual Lab
// mini-sims (reachable only since round 10), and the safety statements in the
// reference cards. Each check reads what the page prints or draws.
//
// What the audit found, all shipped:
//   - the three-polarizer hint (θ₂ = θ₃/2 "always helps") was false past 109.5°;
//   - depth of field printed "0.00 m" for a 2 mm DOF; grating d rounded to 1 sig fig;
//   - Doppler showed an approaching |β| ≥ 0.99 source as a ×100 REDSHIFT;
//   - a saved string crashed six calculators, and fiberNClad ≈ 0 froze the page;
//   - the thin film was painted its single strongest wavelength (violet for magenta);
//   - the Fresnel lens was "4× thinner" than a lens of twice its power;
//   - eclipse glasses, Class 2 lasers and Venus near the Sun understated the hazard.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_optics.js'), 'utf8');
const RENDER_TIMEOUT = 30000;
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const text = (html) => decode(html.replace(/<style[^]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
function render(state) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
  return renderTool('opticsLab', { opticsLab: state });
}
const calc = (sub, state = {}) => render({ mode: 'calcs', calcSubTool: sub, ...state });
const viz = (state) => render({ mode: 'viz', ...state });

describe('Calculators hub — the numbers are right at every setting', () => {
  it('three polarizers: the suggested middle angle really beats no middle filter, even past 109.5°', () => {
    for (const theta3 of [60, 150]) {
      const cut = text(calc('polartri', { polTriTheta2: theta3 <= 90 ? 80 : 75, polTriTheta3: theta3 }));
      const suggested = Number(cut.match(/try θ₂ = ([0-9.]+)°/)[1]);
      const noMid = 50 * Math.cos(theta3 * Math.PI / 180) ** 2;
      const t = text(calc('polartri', { polTriTheta2: suggested, polTriTheta3: theta3 }));
      const final = Number(t.match(/AFTER POL 3 \(final\) ([0-9.]+)%/)[1]);
      expect(final, `θ₃ ${theta3}: θ₂ ${suggested}`).toBeGreaterThan(noMid);
    }
    expect(calc('polartri')).toMatch(/aria-label="Middle polarizer angle" type="range" min="0" max="180"/);
  }, RENDER_TIMEOUT);

  it('depth of field in millimetres prints millimetres, not "0.00 m"', () => {
    const f = 50, N = 2.8, c = 0.03, s = 200;
    const H = f * f / (N * c) + f;
    const near = s * (H - f) / (H + s - 2 * f), far = s * (H - f) / (H - s);
    const t = text(calc('dof', { dofF: f, dofFstop: N, dofDist: s }));
    expect(t).toContain('TOTAL DOF ' + (far - near).toFixed(1) + ' mm');
    expect(t).not.toContain('0.00 m');
  }, RENDER_TIMEOUT);

  it('the grating spacing is printed precisely enough to reproduce the table', () => {
    for (const lines of [600, 1200, 1800]) {
      const t = text(calc('grating', { gratLines: lines, gratLambda: 550 }));
      const dUm = Number(t.match(/spacing d = ([0-9.]+) μm/)[1]);
      const sin1 = Number(t.match(/±[0-9.]+°\s+([0-9.]+)/)[1]);
      expect(550e-3 / dUm, `${lines}/mm`).toBeCloseTo(sin1, 3);
    }
  }, RENDER_TIMEOUT);

  it('photon energies use the exact constants: 2.2543 eV at 550 nm, 12.3984 eV at 100 nm', () => {
    expect(text(calc('photon', { photonLambdaNm: 550 }))).toContain('2.2543 eV');
    expect(text(calc('photon', { photonLambdaNm: 100 }))).toContain('12.3984 eV');
    // 380-400 nm is violet you can see, not "UV-A (tanning)".
    expect(calc('photon', { photonLambdaNm: 390 })).toMatch(/data-op-photon-band="Violet/);
  }, RENDER_TIMEOUT);

  it('the photon slider is logarithmic: the visible band is ~15% of the track, and it speaks nanometres', () => {
    const html = calc('photon', { photonLambdaNm: 550 });
    const input = html.match(/<input[^>]*data-op-photon-log-slider="true"[^>]*>/)[0];
    expect(input).toMatch(/min="2" max="4"/);
    expect(input).toMatch(/aria-valuetext="550 nm, Green"/);
    const [a, b] = html.match(/data-op-photon-visible-strip="([0-9.]+)-([0-9.]+)"/).slice(1).map(Number);
    expect(b - a).toBeGreaterThan(14);
  }, RENDER_TIMEOUT);

  it('Doppler: relativistic at every speed (no ×100 redshift for an approaching source), readable at 30 km/s', () => {
    const fast = text(calc('doppler', { dopLambda: 656.3, dopV: -298000 }));
    const obs = Number(fast.match(/OBSERVED WAVELENGTH ([0-9.]+) nm/)[1]);
    expect(obs, 'approaching: blueshift').toBeLessThan(656.3);
    const slow = text(calc('doppler', { dopLambda: 656.3, dopV: 30 }));
    expect(slow).toMatch(/REDSHIFT z 1\.00[0-9]e-4/);
    expect(slow).toContain('classical v/c = 1.001e-4');
  }, RENDER_TIMEOUT);

  it('saved junk does not crash, freeze or print NaN', () => {
    const cases = [
      ['brewster', { brewsterN1: 'abc', brewsterN2: '1.5' }], ['tir', { tirN1: 'x', tirN2: true }],
      ['fiber', { fiberNCore: 'a', fiberNClad: 1e-9 }], ['lensmaker', { lmkrN: 'glass' }],
      ['arcoat', { arNGlass: 'x', arNCoat: NaN }], ['doppler', { dopLambda: 'red', dopV: 1e9 }],
      ['telescope', { telAperture: Infinity }], ['photon', { photonLambdaNm: 'blue' }],
    ];
    for (const [sub, state] of cases) {
      const t0 = Date.now();
      const html = calc(sub, state);
      expect(Date.now() - t0, `${sub} rendered in time`).toBeLessThan(5000);
      expect(text(html), sub).not.toMatch(/NaN|Infinity/);
    }
    // An unknown sub-tool falls back to the photon calculator instead of an empty hub.
    expect(calc('bogus')).toContain('data-op-photon-band');
  }, RENDER_TIMEOUT);

  it('TIR calculator: "denser" only when it is, and the split shows when TIR cannot happen', () => {
    const t = text(calc('tir', { tirN1: 1.0, tirN2: 1.5, tirTheta: 30 }));
    expect(t).toContain('n₁ = 1.00 (less dense)');
    expect(t).toContain('n₂ = 1.50 (denser)');
    expect(t).toMatch(/At this angle: [0-9.]+% reflected, [0-9.]+% transmitted\./);
    expect(text(calc('tir', { tirN1: 1.5, tirN2: 1.0, tirTheta: 60 }))).not.toContain('undefined');
  }, RENDER_TIMEOUT);

  it('the fiber cone is a wedge around its apex, even at a 90° acceptance angle', () => {
    for (const [core, clad] of [[1.5, 1.48], [1.6, 1.3], [2.0, 1.3]]) {
      const d = calc('fiber', { fiberNCore: core, fiberNClad: clad }).match(/data-op-fiber-cone-wedge="true" d="([^"]+)"/)[1];
      const nums = d.match(/-?[0-9.]+/g).map(Number);
      const [ax, ay] = nums;
      const pts = [[nums[2], nums[3]], [nums[nums.length - 2], nums[nums.length - 1]]];
      for (const [x, y] of pts) expect(Math.hypot(x - ax, y - ay), `${core}/${clad}`).toBeCloseTo(18, 1);
      expect(d).toMatch(/ A 18 18 /);
    }
    expect(text(calc('fiber'))).toContain('V-NUMBER (core radius 4 μm, λ = 1.55 μm)');
  }, RENDER_TIMEOUT);
});

describe('Visual Lab mini-sims — each draws what it names', () => {
  it('thin film: painted the mix of its reflected spectrum (magenta at the default), peaks named', () => {
    const html = viz({ vizShowTF: true });
    const peaks = html.match(/data-op-viz-film-peaks="([^"]*)"/)[1].split(',').map(Number);
    expect(peaks.length).toBeGreaterThanOrEqual(2);
    const [r, g, b] = html.match(/data-op-viz-film-color="rgb\(([0-9]+),([0-9]+),([0-9]+)\)"/).slice(1).map(Number);
    expect(r, 'red end of a two-peak film').toBeGreaterThan(200);
    expect(b, 'blue end too').toBeGreaterThan(120);
    expect(g).toBeLessThan(r);
  }, RENDER_TIMEOUT);

  it('chromatic aberration: WHITE light arrives; the spread is flagged as exaggerated', () => {
    const html = viz({ vizShowCa: true });
    expect([...html.matchAll(/data-op-viz-ca-incoming="white"/g)].length).toBe(2);
    expect(text(html)).toContain('spread drawn ~15× wider than real glass');
  }, RENDER_TIMEOUT);

  it('photon energy viz: 2.25 eV at 550 nm (c = 3e8 gave 2.26)', () => {
    expect(text(viz({ vizShowPe: true, vizPeLam: 550 }))).toContain('2.25 eV');
  }, RENDER_TIMEOUT);

  it('Hermann grid: every square inside the picture', () => {
    const html = viz({ vizShowIll: true });
    const vb = Number(html.match(/Hermann grid optical illusion\.[^>]*viewBox="0 0 500 ([0-9]+)"/)[1]);
    const ys = [...html.matchAll(/<rect x="[0-9.]+" y="([0-9.]+)" width="40" height="40" fill="#000"/g)].map((m) => Number(m[1]));
    expect(ys.length).toBe(25);
    expect(Math.max(...ys) + 40).toBeLessThanOrEqual(vb);
  }, RENDER_TIMEOUT);

  it('concave mirror: a virtual image is drawn on the canvas, or the caption says it is beyond it', () => {
    for (const [f, dO] of [[80, 60], [100, 90], [60, 40]]) {
      const html = viz({ vizShowMirror: true, vizMirrType: 'concave', vizMirrF: f, vizMirrDo: dO, vizMirrH: 40 });
      const img = html.match(/data-op-viz-mirror-image="virtual" x1="([-0-9.]+)"/);
      if (img) { expect(Number(img[1])).toBeLessThanOrEqual(500); }
      else expect(text(html), `f ${f} d_o ${dO}`).toContain('(beyond this diagram)');
    }
    // f = 80, d_o = 60: d_i = −240; the vertex at 300 puts it at x = 540, so it is named.
    expect(text(viz({ vizShowMirror: true, vizMirrType: 'concave', vizMirrF: 80, vizMirrDo: 60 }))).toContain('(beyond this diagram)');
  }, RENDER_TIMEOUT);

  it('crowded grating orders are thinned; the EM strip speaks units, not 5.5e+2', () => {
    const labels = [...viz({ vizShowDg: true, vizDgLines: 100, vizDgLam: 380 }).matchAll(/data-op-viz-grating-label="/g)].length;
    expect(labels).toBeLessThanOrEqual(10);
    const em = viz({ vizShowEm: true, vizEmLam: 550 });
    expect(text(em)).not.toMatch(/e\+[0-9]/);
    expect(em).toMatch(/aria-label="Electromagnetic wavelength scale"[^>]*aria-valuetext="Visible, 550 nm"/);
  }, RENDER_TIMEOUT);

  it('spherical aberration at 0 says there is none', () => {
    expect(text(viz({ vizShowSa: true, vizSaAmt: 0 }))).toContain('No aberration: all rays meet at one focus');
  }, RENDER_TIMEOUT);

  it('prism ray labels stay inside the 500-wide picture at every apex angle', () => {
    // (at 90° every colour is trapped by TIR, so there are no exit rays to label)
    for (const apex of [30, 60, 80]) {
      const html = viz({ vizShowPrism: true, vizPrismAngle: apex });
      const labels = [...html.matchAll(/<text data-op-viz-prism-label="(red|violet)" x="([-0-9.]+)"[^>]*text-anchor="end"[^>]*>([^<]+)</g)];
      expect(labels.length, `apex ${apex}`).toBe(2);
      for (const [, which, x, words] of labels) {
        expect(Number(x), `${which} end, apex ${apex}`).toBeLessThanOrEqual(494);
        // ~0.55 em per character at 9 px, scaled up to 1.7x on a phone
        expect(Number(x) - words.length * 9 * 0.55 * 1.7, `${which} start, apex ${apex}`).toBeGreaterThan(0);
      }
    }
  }, RENDER_TIMEOUT);

  it('phone label scaling stays moderate (2x clipped long edge labels)', () => {
    const rule = SRC.match(/cq\.textContent = '@container \(max-width: 420px\)\{'[^]*?\+ '\}';/)[0];
    const factors = [...rule.matchAll(/scale:([0-9.]+);/g)].map((m) => Number(m[1]));
    expect(factors.length).toBeGreaterThanOrEqual(8);
    expect(Math.max(...factors)).toBeLessThanOrEqual(1.8);
    expect(rule).toContain('text[text-anchor="end"]{transform-origin:right center;}');
    // An engine without @container (jsdom 16) rejects the WHOLE sheet it sits in,
    // so it lives in its own <style>, not in the main optics sheet.
    const main = SRC.slice(SRC.indexOf("st.id = 'stem-optics-css';"), SRC.indexOf("document.head.appendChild(st);"));
    expect(main.length).toBeGreaterThan(1000);
    expect(main).not.toContain('@container');
  });
});

describe('Safety statements say the whole hazard', () => {
  it('eclipse glasses, lasers, totality and Venus', () => {
    expect(SRC).toContain('Never use behind binoculars or telescopes.');
    expect(SRC).toContain('most people do NOT blink in time');
    expect(SRC).toContain('glasses go back on the moment it reappears');
    expect(SRC).toContain('Never aim optics near the Sun.');
    expect(SRC).not.toContain('Eye is protected by the natural blink reflex');
    expect(SRC).not.toContain('Sungazer documentaries');
  });
});
