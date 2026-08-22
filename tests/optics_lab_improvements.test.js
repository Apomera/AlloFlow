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
    expect(render({ mode: 'diffraction', diffMode: 'grating' })).toContain('idealized model uses 50 interfering slits');
    expect(source).toContain('singleSlitIntensity(a, lambda, theta, I0) * f / (Nslits * Nslits)');
    expect(source).toContain('Slit width (envelope)');
    expect(render({ mode: 'diffraction', diffMode: 'grating' })).toContain('finite single-slit envelope shapes each grating order.');
    expect(render({ mode: 'diffraction', diffMode: 'grating', diffShowMath: true })).toContain('The finite single-slit envelope controls relative order brightness.');
  });

  it('renders static WebGL scenes on demand and pauses animation when hidden', () => {
    expect(source.match(/function scheduleFrame\(\)/g)).toHaveLength(3);
    expect(source).toContain("if (typeof document !== 'undefined' && document.hidden) return;");
    expect(source).toContain('push: function (data) { pending = data; scheduleFrame(); }');
    expect(source).toContain('if (S.animate) scheduleFrame();');
  });

  it('adds an accessible, demand-rendered 3D lens bench with exact thin-lens outcomes', () => {
    expect(source).toContain('var OpticsLensGL = (function ()');
    expect(source).toContain("canvas.setAttribute('data-optics-lens-gl', 'true')");
    expect(source).toContain("failMessage: '3D lens bench unavailable'");
    expect(source).toContain('imageDistance: d_i, imageHeight: hImg');
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
    expect(expanded).toContain('aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + -"');
    expect(expanded).toContain('virtual, upright image');

    const focalPlane = render({
      mode: 'lenses', lensShow3D: true, lensType: 'converging', lensFocal: 12, lensDo: 12
    });
    expect(focalPlane).toContain('image at infinity');
    expect(focalPlane).toContain('outgoing cyan rays are parallel');
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
