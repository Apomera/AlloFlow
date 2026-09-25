// Optics Lab, round 8: the wave engine, the inquiry layer and the feedback
// tools. Each expected value is worked from the physics in the test and
// compared with what the tool DRAWS, PRINTS or RECORDS, never with a value the
// tool recomputes for the test.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { withPrediction } from './helpers/optics_prediction.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_optics.js'), 'utf8');
const RENDER_TIMEOUT = 60000;
const DEG = Math.PI / 180;

const load = () => { resetStemLab(); loadTool('stem_lab/stem_tool_optics.js', 'opticsLab'); };
const render = (state) => renderTool('opticsLab', { opticsLab: state });
const shown = (tab, state) => render(withPrediction(tab, state));
const tags = (html, tag, marker) => [...html.matchAll(new RegExp('<' + tag + ' [^>]*' + marker + '[^>]*>', 'g'))].map((m) => m[0]);
const attr = (t, name) => { const m = t.match(new RegExp(' ' + name + '="([^"]*)"')); return m ? m[1] : null; };
const num = (t, name) => Number(attr(t, name));
const between = (a, b) => sliceBetween(SRC, a, b, { file: 'stem_lab/stem_tool_optics.js' });
// The detector slider speaks "... relative intensity X percent; <class>".
const detectorPercent = (html) => Number((html.match(/relative intensity ([0-9.]+) percent/) || [])[1]);
const sinc2 = (b) => (Math.abs(b) < 1e-12 ? 1 : (Math.sin(b) / b) ** 2);

function table(name) {
  const open = `  var ${name} = [`;
  const start = SRC.indexOf(open);
  let depth = 0;
  let i = start + open.length - 1;
  for (; i < SRC.length; i += 1) {
    if (SRC[i] === '[') depth += 1;
    else if (SRC[i] === ']') { depth -= 1; if (depth === 0) break; }
  }
  return vm.runInNewContext(`(${SRC.slice(start + open.length - 1, i + 1)})`, {});
}

describe('Optics wave engine — what the screens, detectors and studio show', () => {
  it('a grating order in the Fresnel model sits where the grating equation puts it', () => {
    load();
    // 300 lines/mm, 600 nm, L = 1.5 m: sin θ₁ = 0.18, y₁ = L tan θ₁ = 274.5 mm. With
    // 50% open the order carries sinc²(π/2) = 40.5% of the centre. The paraxial
    // kernel put the Fresnel peak at mλL/d = 270 mm, so a detector on the label
    // read 1.5%.
    const y1 = 1500 * Math.tan(Math.asin(600e-9 / (1e-3 / 300)));
    const setup = (model) => ({ mode: 'diffraction', diffMode: 'grating', diffLambda: 600, diffGrating: 300, diffGratingDuty: 50, diffScreenL: 1.5, diffScreenProbeMm: +y1.toFixed(2), diffPropagationModel: model });
    const expected = 100 * sinc2(Math.PI / 2);
    expect(detectorPercent(shown('diffraction', setup('fraunhofer')))).toBeCloseTo(expected, 0);
    expect(Math.abs(detectorPercent(shown('diffraction', setup('fresnel'))) - expected), 'Fresnel detector at the m = +1 order').toBeLessThan(3);
    // Far from the aperture (F = D²/λL ≈ 0.03) the studio's two models agree.
    const studio = shown('diffraction', setup('fresnel'));
    expect(Number(attr(tags(studio, 'div', 'data-op-model-max-delta=')[0], 'data-op-model-max-delta')), 'max profile gap, percentage points').toBeLessThan(5);
  }, RENDER_TIMEOUT);

  it('a detector aperture averages the light across its width', () => {
    load();
    // A 6 mm aperture, L = 0.5 m, 600 nm, a = 20 μm. With d = 0.3 mm the fringes are
    // 1.0 mm apart, so seven samples spaced 1 mm (edges included) all sit on the
    // same fringe phase: 94% on a bright fringe, 0% on the dark one beside it.
    // With d = 0.35 mm (0.857 mm fringes) seven samples spaced 6/7 mm alias the same
    // way. Both are really the same box-car average.
    const L = 0.5, a = 20e-6, lam = 600e-9;
    for (const d of [0.3e-3, 0.35e-3]) {
      const I = (y) => { const s = Math.sin(Math.atan2(y, L)); return sinc2(Math.PI * a * s / lam) * Math.cos(Math.PI * d * s / lam) ** 2; };
      const boxcar = (y0) => { let sum = 0; const n = 6000; for (let k = 0; k < n; k += 1) sum += I(y0 + ((k + 0.5) / n - 0.5) * 6e-3); return 100 * sum / n; };
      const halfFringeMm = lam * L / d / 2 * 1000;
      for (const mm of [0, +halfFringeMm.toFixed(3)]) {
        const html = shown('interference', { mode: 'interference', intLambda: 600, intSlitSep: d * 1000, intSlitWidth: 20, intScreenL: L, intDetectorWidthMm: 6, intScreenProbeMm: mm });
        expect(Math.abs(detectorPercent(html) - boxcar(mm * 1e-3)), `d = ${d * 1000} mm, detector at ${mm} mm`).toBeLessThan(1.5);
      }
    }
  }, RENDER_TIMEOUT);

  it('the screens always draw the centre and every grating order at full height', () => {
    load();
    // 200 lines/mm, 380 nm, L = 0.3 m: orders are ~0.5 mm wide but the bars are
    // 1.9 mm apart, and neither the centre nor m = 1 fell on a bar (m = 0 drew 0.3%).
    const grating = shown('diffraction', { mode: 'diffraction', diffMode: 'grating', diffLambda: 380, diffGrating: 200, diffGratingDuty: 50, diffScreenL: 0.3 });
    const bars = tags(grating, 'rect', 'data-op-diff-sample=');
    expect(bars.length).toBe(521);
    const bar = (mm) => num(bars[Math.round((mm + 500) / 1000 * 520)], 'opacity');
    const y1 = 300 * Math.tan(Math.asin(380e-9 / 5e-6));
    expect(bar(0), 'm = 0').toBeGreaterThan(0.95);
    expect(bar(y1), 'm = +1').toBeGreaterThan(0.9 * sinc2(Math.PI / 2));
    expect(bar(-y1), 'm = -1').toBeGreaterThan(0.9 * sinc2(Math.PI / 2));
    // Single slit, 100 μm at 0.3 m: the central maximum fell between two bars (50%).
    const single = shown('diffraction', { mode: 'diffraction', diffMode: 'single', diffLambda: 380, diffSlitWidth: 100, diffScreenL: 0.3 });
    const singleBars = tags(single, 'rect', 'data-op-diff-sample=');
    expect(singleBars.length).toBe(181);
    expect(num(singleBars[90], 'opacity')).toBeGreaterThan(0.95);
    // Double slit, 455 nm, d = 0.3 mm, L = 1 m: the central fringe drew 85%.
    const dbl = shown('interference', { mode: 'interference', intLambda: 455, intSlitSep: 0.3, intScreenL: 1 });
    expect(num(tags(dbl, 'rect', 'data-op-int-sample="80"')[0], 'opacity')).toBeGreaterThan(0.97);
  }, RENDER_TIMEOUT);

  it('a broadband source smears a grating order into one continuous band', () => {
    load();
    // 300 lines/mm, L = 1.5 m, 600 ± 40 nm: the first order spreads over ~255-295 mm
    // (dy/dλ ≈ 0.47 mm/nm). A 5-line spectral comb drew it as five separate lines.
    const html = shown('diffraction', { mode: 'diffraction', diffMode: 'grating', diffLambda: 600, diffGrating: 300, diffGratingDuty: 50, diffScreenL: 1.5, diffBandwidthNm: 80 });
    const bars = tags(html, 'rect', 'data-op-diff-sample=');
    const inBand = [];
    for (let mm = 265; mm <= 283; mm += 1) inBand.push(num(bars[Math.round((mm + 500) / 1000 * 520)], 'opacity'));
    const max = Math.max(...inBand);
    expect(max).toBeGreaterThan(0.02);
    expect(Math.min(...inBand) / max, 'dips inside the band').toBeGreaterThan(0.5);
  }, RENDER_TIMEOUT);

  it('the field readout is the far-field amplitude with its sign, not an aliased carrier', () => {
    load();
    // d = 0.1 mm, a = 50 μm, 600 nm, L = 1 m, y = 7.5 mm: cos(1.25π)·sinc(0.625π) = -0.333.
    const html = shown('interference', { mode: 'interference', intLambda: 600, intSlitSep: 0.1, intSlitWidth: 50, intScreenL: 1, intScreenProbeMm: 7.5, intShowWavefield3D: true, intWavefieldProbe: 1 });
    const probe = tags(html, 'div', 'data-op-probe-field=')[0];
    expect(probe, 'probe readout').toBeTruthy();
    const s = Math.sin(Math.atan2(7.5e-3, 1));
    const amplitude = Math.cos(Math.PI * 0.1e-3 * s / 600e-9) * Math.sin(Math.PI * 50e-6 * s / 600e-9) / (Math.PI * 50e-6 * s / 600e-9);
    expect(num(probe, 'data-op-probe-field')).toBeCloseTo(amplitude, 2);
    expect(Math.abs(Math.abs(num(probe, 'data-op-probe-phase-rad')) - Math.PI)).toBeLessThan(1e-3);
  }, RENDER_TIMEOUT);

  it('the quantum reference curve follows the photons, not an aliased sampling', () => {
    load();
    // 600 nm, d = 0.5 mm, L = 0.5 m: 0.6 mm fringes, finer than the curve's 0.5 mm
    // points. 121 point samples drew full-contrast false fringes 2.5-3 mm apart,
    // reading 0 at ±1.5 mm where the photons land most densely.
    const html = shown('interference', { mode: 'interference', intLambda: 600, intSlitSep: 0.5, intSlitWidth: 50, intScreenL: 0.5 });
    const line = tags(html, 'polyline', 'data-op-quantum-envelope="true"')[0];
    expect(line, 'quantum reference curve').toBeTruthy();
    const pts = attr(line, 'points').split(' ').map((p) => p.split(',').map(Number))
      .map(([x, y]) => ({ v: (450 - x) / 64, mm: 30 - (y - 12) / 176 * 60 }));
    let jump = 0;
    for (let i = 1; i < pts.length; i += 1) jump = Math.max(jump, Math.abs(pts[i].v - pts[i - 1].v));
    expect(jump, 'largest step between neighbouring points').toBeLessThan(0.5);
    const centre = pts.filter((p) => Math.abs(p.mm) <= 1.6).map((p) => p.v);
    expect(Math.min(...centre)).toBeGreaterThan(0.3);
  }, RENDER_TIMEOUT);
});

describe('Optics inquiry — predictions, samples, missions and the evidence journal', () => {
  it('the Snell sandbox shows nothing of the outcome before the call, and grades the call it was given', () => {
    load();
    const box = (html) => (html.match(/class="opticslab-dark-inquiry" style="([^"]*)"/) || [])[1];
    const angleText = (html) => (html.match(/aria-valuetext="([0-9]+ degrees incidence;[^"]*)"/) || [])[1];
    const iq = (extra) => render({ mode: 'inquiry', snellInquiry: Object.assign({ n1: 1.5, n2: 1.0, wavelength: 550 }, extra) });
    const refracts = iq({ angle: 30 });
    const traps = iq({ angle: 42 });           // θc = 41.8° at 550 nm
    expect(box(refracts)).toBe(box(traps));
    expect(angleText(traps)).toContain('outcome hidden until you call it');
    expect(angleText(traps)).not.toContain('total internal reflection');
    const called = (angle, outcome, extra) => iq(Object.assign({ angle, predictedFor: '1.500|1.000|' + angle, predictedOutcome: outcome }, extra));
    expect(box(called(30, 'refract'))).not.toBe(box(called(42, 'tir')));
    expect(called(42, 'tir', { predictedActual: 'tir', predictedWavelength: 550 })).toContain('Your call was right');
    // Sweeping to 740 nm afterwards lowers n₁ (toy dispersion) so θc rises to 42.6°
    // and the light gets through. The call was right when it was made.
    const swept = called(42, 'tir', { predictedActual: 'tir', predictedWavelength: 550, wavelength: 740 });
    expect(swept).toContain('Your call was right');
    expect(swept).toContain('data-op-iq-shifted="true"');
  }, RENDER_TIMEOUT);

  it('sample problems: worked answers follow from their parameters, fit the bench, and wait for a prediction', () => {
    const SP = table('SAMPLE_PROBLEMS');
    const get = (id) => SP.find((p) => p.id === id);
    const thin = (dO, f) => { const di = f * dO / (dO - f); return { di, m: -di / dO }; };
    const lensOK = (s) => { const r = thin(s.params.lensDo, s.params.lensType === 'diverging' ? -s.params.lensFocal : s.params.lensFocal); return r; };
    const mag = lensOK(get('magnifier'));
    expect(mag.di).toBeCloseTo(-15, 6); expect(mag.m).toBeCloseTo(2.5, 6);
    expect(get('magnifier').answer).toContain('d_i = −15 cm, m = +2.5');
    const proj = lensOK(get('projector'));
    expect(proj.di).toBeCloseTo(35, 6); expect(proj.m).toBeCloseTo(-2.5, 6);
    expect(proj.di).toBeLessThanOrEqual(42);                       // the lens screen reaches 42 cm
    expect(get('projector').answer).toContain('d_i = 35 cm, m = −2.5');
    const makeup = thin(get('concave_makeup').params.reflDo, get('concave_makeup').params.reflFocal);
    expect(makeup.di).toBeCloseTo(-13.33, 2); expect(makeup.m).toBeCloseTo(1.67, 2);
    expect(Math.abs(makeup.di)).toBeLessThanOrEqual(20);           // the mirror window shows 20 cm behind
    const sec = get('convex_security').params;
    const security = thin(sec.reflDo, -sec.reflFocal);
    expect(security.di).toBeCloseTo(-10.9, 1); expect(security.m).toBeCloseTo(0.27, 2);
    expect(200 / 75).toBeCloseTo(sec.reflDo / sec.reflFocal, 6);    // the 1/5 scale model keeps the ratio
    const snork = get('snorkeler_lookup').params;
    expect(Math.asin(snork.refrN2 / snork.refrN1) / DEG).toBeCloseTo(48.6, 1);
    expect(Math.asin(snork.refrN1 * Math.sin(45 * DEG)) / DEG).toBeCloseTo(70.5, 1);
    const g = get('grating_spectrum').params;
    expect(sinc2(Math.PI * 2 * g.diffGratingDuty / 100), 'm = 2 is not a missing order').toBeGreaterThan(0.1);
    expect(get('youngs_classic').answer).toContain('6.0 mm');
    expect(0.6e-6 * 1.0 / 0.1e-3 * 1000).toBeCloseTo(6, 6);
    expect(get('first_min').answer).toContain('27.5 mm');
    expect(550e-9 * 1.5 / 30e-6 * 1000).toBeCloseTo(27.5, 6);
    // No hint states its own worked result.
    for (const s of SP) {
      if (!s.answer) continue;
      const results = (s.answer.match(/[0-9]+[.][0-9]+|[0-9]+/g) || [])
        .filter((n) => !JSON.stringify(s.params).includes(n) && !s.research_question.includes(n));
      for (const n of results) expect(s.hint, `${s.id}: hint gives away ${n}`).not.toMatch(new RegExp('(^|[^0-9.])' + n.replace('.', '[.]') + '($|[^0-9])'));
    }
  });

  it('a sample shows its worked answer only after a prediction', () => {
    load();
    const setup = { mode: 'interference', intLambda: 600, intSlitSep: 0.1, intScreenL: 1.0, activeSampleId: 'youngs_classic' };
    const held = render(setup);
    expect(held).toContain('The worked answer appears after you save a prediction.');
    expect(held).not.toContain('6.0 mm — quite visible');
    expect(shown('interference', setup)).toContain('✓ Check: y = 600 nm × 1.0 m / 0.10 mm = 6.0 mm');
  }, RENDER_TIMEOUT);

  it('loading a sample resets the leftovers that would change its answer', () => {
    const run = vm.runInNewContext(`(function () {
      var SAMPLE_PROBLEMS = ${JSON.stringify(table('SAMPLE_PROBLEMS'))};
      ${between('function loadSampleProblem(', '// The EXPERIMENT')}
      return function (id) { var got = null; loadSampleProblem(id, function (p) { got = p; }); return got; };
    })()`, {});
    expect(run('malus_classic').polQwp).toBe(false);
    const youngs = run('youngs_classic');
    expect(youngs.intPropagationModel).toBe('fraunhofer');
    expect(youngs.intBandwidthNm).toBe(0);
    expect(youngs.intDetectorWidthMm).toBe(0);
  });

  it('no mission is complete on arrival at a topic', () => {
    load();
    // The tab's real starting values (a bare { mode } leaves them undefined, and
    // undefined > undefined is false, which would hide the bug).
    const defaults = vm.runInNewContext(`(function () { ${between('var OPTICS_TOPIC_DEFAULTS =', 'var OPTICS_TOPIC_PRESETS')} return OPTICS_TOPIC_DEFAULTS; })()`, {});
    for (const tab of ['reflection', 'refraction', 'lenses', 'interference', 'diffraction', 'polarization']) {
      expect(Object.keys(defaults[tab]).length, tab).toBeGreaterThan(2);
      const html = render(Object.assign({ mode: tab }, defaults[tab]));
      const missions = tags(html, 'div', 'class="opticslab-mission"');
      expect(missions.length, tab).toBeGreaterThan(0);
      missions.forEach((m) => expect(attr(m, 'data-complete'), tab).toBe('false'));
    }
  }, RENDER_TIMEOUT);

  it('the causal chain records a plane mirror and a no-bend refraction truthfully', () => {
    load();
    const chain = (tab, now, before) => shown(tab, Object.assign({ mode: tab, opTopicTouched: { [tab]: true }, opTopicSnapshots: { [tab]: { before } } }, now));
    const plane = chain('reflection', { reflMirrorType: 'plane', reflFocal: 10, reflDo: 25, reflObjH: 6, reflScreenCm: 15 },
      { reflMirrorType: 'plane', reflFocal: 10, reflDo: 20, reflObjH: 6, reflScreenCm: 15 });
    expect(plane).toContain('d_i = -25.00 cm; virtual, upright, m = 1.00.');
    const flat = chain('refraction', { refrN1: 1.333, refrN2: 1.333, refrTheta1: 30 }, { refrN1: 1.333, refrN2: 1.333, refrTheta1: 20 });
    const flatChain = flat.slice(flat.indexOf('data-op-causal-insight='), flat.indexOf('Set current as baseline'));
    expect(flatChain).toContain('light passes straight through (no bend).');
    expect(flatChain).not.toContain('bends toward the normal');
  }, RENDER_TIMEOUT);

  it('a trial captured before its setup was predicted holds its result in the journal', () => {
    load();
    const setup = { intLambda: 600, intSlitSep: 0.1, intScreenL: 1, intSlitWidth: 50 };
    const trial = (extra) => Object.assign({ id: 't1', capturedAt: 1758672000000, setup, series: 'interference',
      x: 0.1, y: 6, xLabel: 'Slit separation', xUnit: 'mm', yLabel: 'Fringe spacing', yUnit: 'mm',
      summary: 'Adjacent bright fringes are 6.000 mm apart.' }, extra);
    const state = (t) => Object.assign({ mode: 'interference', opTrialRuns: { interference: [t] } }, setup);
    const held = render(state(trial({ revealed: false })));
    expect(held).toContain('Result held until you save a prediction for this setup.');
    expect(held).not.toContain('6.000 mm apart');
    expect(shown('interference', state(trial({ revealed: false })))).toContain('6.000 mm apart');
    // Captured with the answer already revealed, or saved before the flag existed.
    expect(render(state(trial({ revealed: true })))).toContain('6.000 mm apart');
    expect(render(state(trial({})))).toContain('6.000 mm apart');
  }, RENDER_TIMEOUT);
});

describe('Optics feedback tools — AI grader, offline checklist, sleuth and quiz', () => {
  const G = vm.runInNewContext(`(function () {
    ${between('function _localOpticsRubric(', 'function _renderSleuthPanel(')}
    return { rubric: _localOpticsRubric, grader: _renderAiGrader };
  })()`, { _isNum: (x) => typeof x === 'number' && isFinite(x), __alloT: (k, s) => s, t: (k, s) => s });
  const h = (type, props, ...children) => ({ type, props: props || {}, children });
  function findButton(node) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) { for (const c of node) { const f = findButton(c); if (f) return f; } return null; }
    if (node.type === 'button' && node.props.onClick) return node;
    return findButton(node.children);
  }
  async function grade(reply, d0) {
    const d = Object.assign({ aiDrafts: { refraction: 'Light bends toward the normal because the glass has a higher index.' }, aiGradedCount: 0 }, d0);
    const xp = []; const toasts = [];
    const upd = (k, v) => { if (typeof k === 'string') d[k] = v; else Object.assign(d, k); };
    const tree = G.grader('refraction', d, upd, h, (m, kind) => toasts.push(kind), (n) => xp.push(n), () => Promise.resolve(reply), null);
    findButton(tree).props.onClick();
    await new Promise((r) => setTimeout(r, 0));
    return { d, xp, toasts };
  }

  it('the AI grader fails closed: no grade, credit or success on an unreadable reply', async () => {
    for (const reply of ['', 'I cannot grade this right now.', '{"score": 7, "strengths": ["a"]', '{"score": 85, "strengths": [], "issues": []}', '{"feedback": "Good job"}']) {
      const { d, xp, toasts } = await grade(reply);
      expect(d.aiResponse && d.aiResponse.error, JSON.stringify(reply)).toBeTruthy();
      expect(d.aiGradedCount, JSON.stringify(reply)).toBe(0);
      expect(xp, JSON.stringify(reply)).toEqual([]);
      expect(toasts, JSON.stringify(reply)).not.toContain('success');
    }
  });

  it('a readable grade is recorded, and paid once per topic, even wrapped in prose', async () => {
    const good = 'Here is {your} grade: {"score": 7, "strengths": ["names Snell"], "issues": [], "improved_version": "x"}';
    const first = await grade(good);
    expect(first.d.aiResponse.score).toBe(7);
    expect(first.d.aiGradedCount).toBe(1);
    expect(first.xp).toEqual([10]);
    const again = await grade(good, { aiGradedDrafts: first.d.aiGradedDrafts, aiPaidTabs: first.d.aiPaidTabs, aiGradedCount: 1 });
    expect(again.d.aiGradedCount, 'regrading the same draft').toBe(1);
    expect(again.xp).toEqual([]);
    // Round 12: paying per distinct draft let a trailing space (or two alternating
    // drafts) earn XP on every click. A new draft is still graded, but not paid.
    const spaced = await grade(good, { aiDrafts: { refraction: 'Light bends toward the normal because the glass has a higher index. ' },
      aiGradedDrafts: again.d.aiGradedDrafts, aiPaidTabs: first.d.aiPaidTabs, aiGradedCount: 1 });
    expect(spaced.d.aiResponse.score).toBe(7);
    expect(spaced.xp, 'a trailing space paid again').toEqual([]);
  });

  it('the offline checklist matches whole words, not fragments', () => {
    const r = G.rubric('reflection', 'I also think the array was really bright on the imagined diagram.');
    const pass = Object.fromEntries(r.criteria.map((c) => [c.label, c.pass]));
    expect(pass['Cause and effect'], '"also" is not "so"').toBe(false);
    expect(pass['Physics principle'], '"array" is not "ray", "imagined" is not "image"').toBe(false);
    const good = G.rubric('refraction', 'Because the water has a higher index, the light refracts toward the normal, as the diagram shows.');
    expect(good.criteria.every((c) => c.pass)).toBe(true);
    expect(SRC).toContain("'Checklist: ' + (resp.score / 2) + ' of 5 parts present'");
    expect(SRC).not.toContain("'Local rubric estimate: '");
  });

  it('sleuth and quiz copy say what the physics says', () => {
    expect(SRC).toContain('+ d_i = real (far side of a lens, in front of a mirror); – d_i = virtual (object side of a lens, behind a mirror)');
    expect(SRC).not.toContain('realInvRed vs realInvMag');
    const quiz = table('AP_OPTICS_QUIZ');
    const q = quiz.find((item) => item.q === 'Which of these is NOT a wave phenomenon?');
    expect(q.choices[q.correct]).toBe('None: all three are wave phenomena');
    expect(q.choices.some((c) => /above/i.test(c)), 'shuffled, "All of the above" could come first').toBe(false);
  });
});

describe('Optics focus guide and reference figures', () => {
  it('the focus guide prints the blur it measures, and where the image really is', () => {
    load();
    // f = 12, d_o = 25: d_i = 300/13 = 23.077 cm. A screen at 23.0 cm is "in focus"
    // (blur ≤ 0.5%) with |1 − 23/23.077| = 0.33% blur, which printed as 0.0%.
    const html = shown('lenses', { mode: 'lenses', lensType: 'converging', lensFocal: 12, lensDo: 25, lensObjH: 5, lensScreenCm: 23 });
    const di = 12 * 25 / 13;
    const blur = (Math.abs(1 - 23 / di) * 100).toFixed(1);
    expect(blur).toBe('0.3');
    expect(html).toContain('Aligned at focus | blur ' + blur + '% aperture');
    expect(html).toContain('within ' + Math.abs(23 - di).toFixed(2) + ' cm of the real image plane (' + di.toFixed(2) + ' cm)');
    expect(render({ mode: 'lenses', lensType: 'converging', lensFocal: 12, lensDo: 25, lensObjH: 5, lensScreenCm: 23 })).toContain('sharp | blur ' + blur + '%');
  }, RENDER_TIMEOUT);

  it('reference numbers follow from the formulas they come from', () => {
    // Sea water (Quan-Fry, S = 35, 20 °C, 589 nm) and BK7 at 400 nm (Schott Sellmeier).
    const qf = (S, T, l) => 1.31405 + (1.779e-4 - 1.05e-6 * T + 1.6e-8 * T * T) * S - 2.02e-6 * T * T + (15.868 + 0.01155 * S - 0.00423 * T) / l - 4382 / (l * l) + 1.1455e6 / (l * l * l);
    expect(qf(35, 20, 589)).toBeCloseTo(1.339, 3);
    expect(SRC).toContain("{ material: 'Sea water', n: 1.339,");
    const B = [1.03961212, 0.231792344, 1.01046945]; const Cs = [0.00600069867, 0.0200179144, 103.560653];
    const bk7 = (l) => Math.sqrt(1 + B.reduce((s, b, i) => s + b * l * l / (l * l - Cs[i]), 0));
    expect(bk7(0.4)).toBeCloseTo(1.5308, 4);
    expect(SRC).toContain("{ material: 'BK7 at 400 nm', n: 1.5308,");
    // 600 lines/mm at 1.5 m: the visible first order spans ~40 cm.
    const y = (nm) => 1.5 * Math.tan(Math.asin(nm * 1e-9 / (1e-3 / 600)));
    expect((y(750) - y(380)) * 100).toBeCloseTo(40.5, 0);
    expect(SRC).toContain('the first-order visible spectrum is about 40 cm across');
    // 100 Tb/s over ~5 Mb/s HD streams; a 10⁻¹⁸ clock over 4.35e17 s.
    expect(100e12 / 5e6).toBe(2e7);
    expect(1e-18 * 4.35e17).toBeLessThan(0.5);
    expect(2021 - 1989).toBeGreaterThanOrEqual(30);
    expect(SRC).toContain('launched in 2021, about 30 years after it was first proposed');
    expect(SRC).toContain('picked up small, unknown charges, which Millikan then measured');
    expect(SRC).not.toContain('Far-infrared workhorse laser');
  });
});
