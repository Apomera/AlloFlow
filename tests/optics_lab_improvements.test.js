import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_optics.js';
const source = readFileSync(SOURCE, 'utf8');

function render(overrides = {}) {
  resetStemLab();
  loadTool(SOURCE, 'opticsLab');
  return renderTool('opticsLab', { opticsLab: { mode: 'home', ...overrides } });
}

describe('Optics Lab improvement regressions', () => {
  it('shuffles answer choices while preserving the correct answer and best score', () => {
    expect(source).toContain('function _shuffleOpticsQuestionChoices(q)');
    expect(source).toContain('return picked.map(_shuffleOpticsQuestionChoices);');
    expect(source).toContain('quizBestCorrect: Math.max(d.quizBestCorrect || 0, d.quizCorrect || 0, correct)');
    expect(source).not.toContain('All 30 questions mastered');
    expect(source).not.toContain('all 30 AP optics questions mastered');
    expect(source).not.toContain("opCeleb.total + ' / 30 quiz questions mastered'");
    expect(source).toContain("opCeleb.total + ' / ' + AP_OPTICS_QUIZ.length + ' quiz questions mastered'");
    expect(source).toContain("'aria-pressed': isPicked ? 'true' : 'false'");
    expect(source).toContain("role: 'region', 'aria-live': 'polite', 'aria-label': 'Quiz results'");
  });

  it('uses a responsive topic grid and does not point inactive tabs at unmounted panels', () => {
    expect(source).toContain("'.opticslab-topic-grid{display:grid;");
    expect(source).toContain('.opticslab-topic-grid{grid-template-columns:1fr;');
    expect(source).toContain("className: 'opticslab-topic-grid'");
    const html = render({ mode: 'home' });
    expect(html).toContain('aria-controls="op-panel-home"');
    expect(html).not.toContain('aria-controls="op-panel-reflection"');
    expect(source).not.toContain("color: '#e0e7ff'");
    expect(source).toContain("color: 'var(--allo-stem-text, #e0e7ff)'");
  });

  it('only awards the simulation milestone from actual simulation tabs', () => {
    expect(source).toContain("['reflection', 'refraction', 'lenses', 'interference', 'diffraction', 'polarization'].indexOf(next.opticsLab.mode) !== -1");
    expect(source).not.toContain("if (next.opticsLab.mode !== 'home') next.opticsLab.simRunOnce = true;");
  });

  it('announces computed outcomes on the main simulation sliders', () => {
    const refraction = render({ mode: 'refraction', refrN1: 1.333, refrN2: 1, refrTheta1: 60 });
    expect(refraction).toContain('Total internal reflection; no refracted ray.');

    const interference = render({ mode: 'interference', intLambda: 600, intSlitSep: 0.1, intScreenL: 1 });
    expect(interference).toContain('fringe spacing 6.00 millimeters.');

    const diffraction = render({ mode: 'diffraction', diffMode: 'single', diffLambda: 600, diffSlitWidth: 30, diffScreenL: 1.5 });
    expect(diffraction).toContain('first minimum at 30.00 millimeters.');

    const polarization = render({ mode: 'polarization', polTheta2: 90 });
    expect(polarization).toContain('transmitted intensity after P2 0.0 percent of I0.');
  });

  it('provides a prediction notebook and explains schematic/off-scale diagrams', () => {
    expect(source).toContain('Prediction notebook');
    expect(source).toContain('opPredictionDrafts');
    expect(source).toContain('opPredictionNotes');

    const notebook = render({
      mode: 'reflection',
      opPredictionDrafts: { reflection: 'The image should be virtual and upright.' },
      opPredictionNotes: { reflection: 'The image should be virtual and upright.' }
    });
    expect(notebook).toContain('Your prediction for the reflection experiment');
    expect(notebook).toContain('Saved: The image should be virtual and upright.');

    const lensOffScale = render({ mode: 'lenses', lensType: 'converging', lensFocal: 10, lensDo: 10.5 });
    expect(lensOffScale).toContain('Diagram scale');
    const mirrorOffScale = render({ mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10, reflDo: 10.5 });
    expect(mirrorOffScale).toContain('Diagram scale');
    expect(render({ mode: 'diffraction', diffMode: 'grating' })).toContain('50-slit model uses a physical opening fraction');
    expect(source).toContain('singleSlitIntensity(aperture.openingM, lambda, theta, 1) * grating');
    expect(source).toContain("rows.push(['Open fraction'");
    expect(render({ mode: 'diffraction', diffMode: 'grating' })).toContain('opening envelope controls relative order brightness.');
    expect(render({ mode: 'diffraction', diffMode: 'grating', diffShowMath: true })).toContain('The physical opening envelope controls relative order brightness.');
  });

  it('renders static WebGL scenes on demand and pauses animation when hidden', () => {
    expect(source.match(/function scheduleFrame\(\)/g)).toHaveLength(5);
    expect(source).toContain("if (typeof document !== 'undefined' && document.hidden) return;");
    expect(source).toContain('push: function (data) { pending = data; scheduleFrame(); }');
    expect(source).toContain('if (S.animate) scheduleFrame();');
  });

  it('makes the polarization 3D outcome explain each intensity projection', () => {
    expect(source).toContain("var polStageLine = 'I\\u2080 100.0% \\u2192 P\\u2081 '");
    expect(source).toContain('var polProjectionLine = useP3');
    expect(source).toContain("'data-op-polarization-3d-host': 'true'");
    expect(source).toContain("'aria-roledescription': 'interactive 3D model'");
    expect(source).toContain("'data-after-p1': afterP1.toFixed(6)");
    expect(source).toContain("'data-p2-relative-transmission': polP2Transmission.toFixed(6)");
    expect(source).toContain("'data-op-polarization-stage-trail': 'true'");
    expect(source).toContain("'data-op-polarization-rule': 'true'");
    expect(source).toContain("role: 'progressbar', 'aria-label': 'Final transmitted intensity'");
    expect(source).toContain('Press zero to reset the camera.');
    const keyStart = source.indexOf('function keyPolView(event)');
    const keyEnd = source.indexOf('var segs =', keyStart);
    expect(keyStart).toBeGreaterThan(-1);
    expect(keyEnd).toBeGreaterThan(keyStart);
    expect(source.slice(keyStart, keyEnd)).toContain('event.stopPropagation();');
  });

  it('adds an accessible, demand-rendered 3D lens bench with exact thin-lens outcomes', () => {
    expect(source).toContain('var OpticsLensGL = (function ()');
    expect(source).toContain("canvas.setAttribute('data-optics-lens-gl', 'true')");
    expect(source).toContain("failMessage: '3D lens bench unavailable'");
    expect(source).toContain('imageDistance: d_i, imageHeight: hImg');
    expect(source).toContain("'data-op-lens-3d-outcome': lensImageType");
    expect(source).toContain("'data-image-orientation': lensImageOrientation");
    expect(source).toContain("'data-image-height': hImg == null");
    expect(source).toContain("'data-op-lens-3d-host': 'true'");
    expect(source).toContain("'data-screen-offset-cm': screenDelta == null ? 'none' : screenDelta.toFixed(3)");
    expect(source).toContain("var screenRelationShort = screenFocused ? 'sharp focus");
    expect(source).toContain('S.resizeObserver.disconnect()');
    expect(source).toContain("window.__alloOpticsLensGL = OpticsLensGL");

    const collapsed = render({ mode: 'lenses', lensShow3D: false });
    expect(collapsed).toContain('3D ray-space bench');
    expect(collapsed).not.toContain('Loading 3D lens bench');

    const expanded = render({
      mode: 'lenses', lensShow3D: true, lensType: 'diverging', lensFocal: 12, lensDo: 25
    });
    expect(expanded).toContain('Loading 3D lens bench');
    expect(expanded).toContain('Dashed pink lines are backward extensions');
    expect(expanded).toContain('aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + - 0"');
    expect(expanded).toContain('Press zero to reset the camera.');
    expect(expanded).toContain('virtual, upright image');
    expect(expanded).toContain('The object tip is 5.0 centimeters above the optical axis; the image tip is 1.6 centimeters above the optical axis.');

    const focalPlane = render({
      mode: 'lenses', lensShow3D: true, lensShowMath: true,
      lensType: 'converging', lensFocal: 12, lensDo: 12, lensObjH: 6
    });
    expect(focalPlane).toContain('image at infinity');
    expect(focalPlane).toContain('outgoing cyan rays are parallel');
    expect(focalPlane).toContain('Parallel / collimated after lens');
    expect(focalPlane).toContain('1/d_i = 0');
    expect(focalPlane).toContain('no screen at a finite distance');
    expect(focalPlane).toContain('aria-label="Lens object height"');
    expect(focalPlane).toContain('Outgoing bundle angle');
    expect(focalPlane).toContain('The object tip is 6.0 centimeters above the optical axis.');

    const finiteImage = render({
      mode: 'lenses', lensShow3D: true,
      lensType: 'converging', lensFocal: 12, lensDo: 25, lensObjH: 7
    });
    expect(finiteImage).toContain('7.0 cm object height. Image tip 6.5 cm below the optical axis.');
    expect(finiteImage).toContain('The object tip is 7.0 centimeters above the optical axis; the image tip is 6.5 centimeters below the optical axis.');
  });

  it('tightens ray-space framing and labels physical versus construction rays', () => {
    expect(source).toContain('function _fitOptics3DModelBounds(THREE, model, target, half)');
    expect(source.match(/_fitOptics3DModelBounds\(THREE, S\.model, S\.target, S\.half\);/g)).toHaveLength(2);
    expect(source).toMatch(/ref: opticsMirrorGlRef, role: 'group'/);
    expect(source).toMatch(/ref: opticsLensGlRef,[\s\S]*?role: 'group'/);
    expect(source).toMatch(/data-op-mirror-3d-ray-key/);
    expect(source).toMatch(/data-op-lens-3d-ray-key/);
    expect(source).toMatch(/mirrorImageType === 'virtual'[\s\S]*?virtual extensions/);
    expect(source).toMatch(/lensImageType === 'virtual'[\s\S]*?virtual extensions/);
    expect(source).toContain('cameraDistance: S ? S.camera.position.distanceTo(S.target) : null');
  });

  it('adds an opt-in 3D refraction ray bench with TIR-aware geometry', () => {
    expect(source).toContain('var OpticsRefractionGL = (function ()');
    expect(source).toContain("el.setAttribute('data-optics-refraction-gl', 'true')");
    expect(source).toContain('window.__alloOpticsRefractionGL = OpticsRefractionGL');
    expect(source).toContain('theta1Deg: S ? S.theta1Deg : null');
    expect(source).toContain('function addArrowHead(THREE, from, to, color, opacity)');
    expect(source).toContain('S.visibilityHandler = function() { if (!document.hidden) scheduleFrame(); };');
    expect(source).toContain('Math.atan2(-dx, dy) / DEG');
    expect(source).toContain("'data-op-refraction-3d-outcome': refractionOutcomeState");
    expect(source).toContain("'data-critical-offset-deg': criticalOffsetDeg == null ? 'none' : criticalOffsetDeg.toFixed(3)");

    const collapsed = render({ mode: 'refraction', refrShow3D: false });
    expect(collapsed).toContain('Ray-space bench (3D');
    expect(collapsed).not.toContain('Loading 3D ray bench');

    const refracted = render({ mode: 'refraction', refrShow3D: true, refrN1: 1, refrN2: 1.52, refrTheta1: 30 });
    expect(refracted).toContain('Loading 3D ray bench');
    expect(refracted).toContain('Gold enters, cyan refracts');
    expect(refracted).toContain('refracts into index 1.520 at 19.2 degrees');
    expect(refracted).toContain('The transmitted ray bends toward the normal because the second refractive index is higher.');
    expect(refracted).toContain('No critical angle exists in this direction because the first refractive index is not greater than the second.');
    expect(refracted).toContain('data-op-refraction-3d-control="true"');
    expect(refracted).toContain('aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + - 0"');
    expect(refracted).toContain('data-op-refraction-3d-reset="true"');

    const away = render({ mode: 'refraction', refrShow3D: true, refrN1: 1.5, refrN2: 1, refrTheta1: 40 });
    expect(away).toContain('The transmitted ray bends away from the normal because the second refractive index is lower.');
    expect(away).toContain('1.8 degrees below the critical angle of 41.8 degrees.');

    const tir = render({ mode: 'refraction', refrShow3D: true, refrN1: 1.5, refrN2: 1, refrTheta1: 60 });
    expect(tir).toContain('totally internally reflects into the first medium');
    expect(tir).toContain('No transmitted ray leaves the interface.');
    expect(tir).toContain('18.2 degrees above the critical angle of 41.8 degrees.');
  });

  it('makes Snell\'s window geometry explicit and keeps its controls local', () => {
    expect(source).toContain('var windowDiameterDeg = windowPossible ? windowConeDeg * 2 : null;');
    expect(source).toContain('var windowRadiusModel = windowPossible ? OW_DEPTH * Math.tan(theta_c) : null;');
    expect(source).toMatch(/data-op-snell-window-3d-host/);
    expect(source).toMatch(/data-op-snell-window-3d-outcome/);
    expect(source).toMatch(/data-window-radius-model/);
    expect(source).toMatch(/ev\.preventDefault\(\); ev\.stopPropagation\(\); setWindowCamera\('oblique'\); return;/);

    const water = render({
      mode: 'refraction', refrShowWindow: true, refrN1: 1.333, refrN2: 1
    });
    expect(water).toMatch(/data-op-snell-window-3d-scene=.true./);
    expect(water).toMatch(/data-op-snell-window-3d-outcome=.active./);
    expect(water).toMatch(/data-cone-half-angle-deg=.48\.607./);
    expect(water).toMatch(/data-window-diameter-deg=.97\.213./);
    expect(water).toMatch(/data-index-ratio=.0\.750188./);
    expect(water).toMatch(/data-window-radius-model=.6\.807./);
    expect(water).toMatch(/data-op-snell-window-angle=.true./);
    expect(water).toMatch(/data-op-snell-window-diameter=.true./);
    expect(water).toContain('Sky inside cone');
    expect(water).toContain('mirror outside');
  });

  it('keeps long-distance mirror samples inside the range control domain', () => {
    expect(source).toContain('var reflDoSliderMax = Math.max(45, Math.ceil(d_o / 25) * 25);');
    const sample = render({ mode: 'reflection', reflMirrorType: 'convex', reflFocal: 25, reflDo: 200 });
    expect(sample).toContain('max="200"');
    expect(sample).toContain('200.0 cm object distance');
  });

  it('makes the inquiry reset complete and announces its computed state', () => {
    expect(source).toContain("role: 'status', 'aria-live': 'polite'");
    expect(source).toContain("'aria-valuetext': iq.angle.toFixed(0) + ' degrees incidence;");
    expect(source).toContain("hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: []");
    expect(render({ mode: 'inquiry' })).toContain('aria-valuetext');
  });
});
