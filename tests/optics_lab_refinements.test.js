import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function state(overrides = {}) {
  return {
    opticsLab: {
      mode: 'home',
      showOpticsLibrary: false,
      quizMastery: {},
      quizCompletedCount: 0,
      ...overrides,
    },
  };
}

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
});

describe('Optics Lab refinements', () => {
  it('uses a roving tab stop in the main navigation', () => {
    const html = renderTool('opticsLab', state());

    expect(html).toContain('role="tablist"');
    expect(html).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*tabindex="0"/);
    expect(html).toMatch(/role="tab"[^>]*aria-selected="false"[^>]*tabindex="-1"/);
    expect(html).toContain('data-op-tab-value="home"');
    expect(html).toContain('id="op-tab-home"');
    expect(html).toContain('aria-controls="op-panel-home"');
    expect(html).toContain('id="op-panel-home"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-labelledby="op-tab-home"');
  });

  it('streamlines navigation and exposes a guided experiment workflow', () => {
    const source = readFileSync('stem_lab/stem_tool_optics.js', 'utf8');
    const home = renderTool('opticsLab', state());
    expect(home).toContain('class="opticslab-tab-strip"');
    expect(home).toContain('data-opticslab-tab-strip="true"');
    expect(home).toContain('aria-orientation="horizontal"');
    expect((home.match(/class="opticslab-route-card"/g) || [])).toHaveLength(6);
    expect(home).toContain('Compare slit and grating patterns.');

    const guided = renderTool('opticsLab', state({
      mode: 'lenses',
      opPredictionNotes: { lenses: 'The image will be inverted.' },
      aiDrafts: { lenses: 'The rays converge because the object is outside the focal point.' }
    }));
    expect(guided).toContain('opticslab-focus-panel--compact');
    expect(guided).toContain('aria-label="Experiment workflow"');
    expect(guided).toContain('id="op-predict-lenses"');
    expect(guided).toContain('id="op-explore-lenses"');
    expect(guided).toContain('id="op-explain-lenses"');
    expect(guided).toContain('Saved ✓');
    expect(guided).toContain('Draft ready ✓');
    expect(guided).toContain('2 · Explore the simulation');

    const expanded = renderTool('opticsLab', state({ mode: 'phenomena', showOpticsLibrary: false }));
    expect(expanded).toContain('Return to core benches');
    expect(source).toContain("upd(opIsExpandedMode ? { mode: 'home', showOpticsLibrary: false }");
  });

  it('persists a complete predict-observe-explain notebook with setup snapshots', () => {
    const source = readFileSync('stem_lab/stem_tool_optics.js', 'utf8');
    const guided = renderTool('opticsLab', state({
      mode: 'lenses',
      opTopicTouched: { lenses: true },
      opPredictionNotes: { lenses: 'The image will be real and inverted.' },
      opObservationNotes: { lenses: 'The cyan rays crossed on the far side.' },
      opTopicSnapshots: { lenses: { before: { lensDo: 25 }, after: { lensDo: 18 } } },
      aiDrafts: { lenses: 'The rays converge because the object is beyond the focal point, so the measured image is inverted.' }
    }));

    expect(guided).toContain('Quick setups');
    expect(guided).toContain('Reset experiment');
    expect(guided).toContain('Experiment results notebook');
    expect(guided).toContain('Observation saved');
    expect(guided).toContain('Prediction</span>');
    expect(guided).toContain('Observed result</span>');
    expect(guided).toContain('Setup change</span>');
    expect(guided).toContain('Download lab note');
    expect(guided).toContain('Check with offline rubric');
    expect(source).toContain('opObservationNotes');
    expect(source).toContain('opTopicSnapshots');
    expect(source).toContain('function _localOpticsRubric(tab, draft)');
  });

  it('renders persistent, restorable experiment trials with an evidence plot', () => {
    const source = readFileSync('stem_lab/stem_tool_optics.js', 'utf8');
    const guided = renderTool('opticsLab', state({
      mode: 'lenses',
      opTopicTouched: { lenses: true },
      opPredictionNotes: { lenses: 'A farther object should move the image toward the focal point.' },
      opObservationNotes: { lenses: 'The image distance became smaller.' },
      aiDrafts: { lenses: 'Because object distance increased, the thin-lens equation predicts a smaller real image distance.' },
      opTrialRuns: { lenses: [
        { id: 'run-1', capturedAt: 1, series: 'lenses-converging', setup: { lensDo: 18 }, x: 18, y: 36, xLabel: 'Object distance', yLabel: 'Image distance', xUnit: 'cm', yUnit: 'cm', summary: 'Real image at 36 cm.' },
        { id: 'run-2', capturedAt: 2, series: 'lenses-converging', setup: { lensDo: 24 }, x: 24, y: 24, xLabel: 'Object distance', yLabel: 'Image distance', xUnit: 'cm', yUnit: 'cm', summary: 'Real image at 24 cm.' },
      ] },
    }));

    expect(guided).toContain('data-op-trial-journal="lenses"');
    expect(guided).toContain('2 / 20 trials');
    expect(guided).toContain('Latest comparison:');
    expect(guided).toContain('Object distance increased by 6.00 cm');
    expect(guided).toContain('Image distance decreased by 12.00 cm');
    expect(guided).toContain('Evidence trend');
    expect(guided).toContain('Export CSV');
    expect(guided).toContain('Restore trial 1 setup');
    expect(guided).toContain('Run a contrast trial');
    expect(source).toContain('function _opticsTrialRecord(tab, state, preview)');
    expect(source).toContain('function _downloadOpticsTrialsCsv(tab, trials)');
    expect(source).toContain('opTrialRuns: d.opTrialRuns || {}');
  });

  it('shows an actionable offline-rubric checklist and an adaptive next action', () => {
    const html = renderTool('opticsLab', state({
      mode: 'refraction',
      aiDrafts: { refraction: 'Light bends.' },
      aiResponseTab: 'refraction',
      aiResponse: {
        local: true, score: 4, strengths: [], issues: [], improved_version: null,
        criteria: [
          { label: 'Physics principle', pass: true, guidance: 'Names refraction.' },
          { label: 'Model evidence', pass: false, guidance: 'Cite a measured angle.' },
        ],
      },
    }));

    expect(html).toContain('Next best action');
    expect(html).toContain('Write a prediction');
    expect(html).toContain('aria-label="Explanation checklist"');
    expect(html).toContain('data-pass="true"');
    expect(html).toContain('data-pass="false"');
    expect(html).toContain('Cite a measured angle.');
  });

  it('groups and searches reference tabs while retaining recent destinations', () => {
    const source = readFileSync('stem_lab/stem_tool_optics.js', 'utf8');
    const library = renderTool('opticsLab', state({
      mode: 'home', showOpticsLibrary: true,
      opticsLibraryGroup: 'people', opticsLibraryQuery: 'scientist',
      opticsRecentModes: ['scientists', 'history']
    }));

    expect(library).toContain('Filter reference library');
    expect(library).toContain('Library categories');
    expect(library).toMatch(/aria-pressed="true"[^>]*>People<\/button>/);
    expect(library).toContain('Scientists');
    expect(library).not.toContain('Encyclopedia</button>');
    expect(source).toContain("opticsLibraryGroup: 'explore'");
    expect(source).toContain("opticsRecentModes = recentModes.slice(0, 6)");
  });

  it('batches large reference collections without dropping entries', () => {
    const source = readFileSync('stem_lab/stem_tool_optics.js', 'utf8');
    expect(source).toContain('function _renderOpticsCollectionStatus(total, limit, key, upd, h)');
    expect(source).toContain("'Show 24 more'");
    expect(source).toContain('filtered.slice(0, phDbLimit).map');
    expect(source).toContain('filtered.slice(0, scientistLimit).map');
    expect(source).toContain('filtered.slice(0, historyLimit).map');
    expect(source).toContain('filtered.slice(0, glossaryLimit).map');
  });

  it('supports arrow, Home, and End keys across every tab system', () => {
    const source = readFileSync('stem_lab/stem_tool_optics.js', 'utf8');

    expect(source).toContain('function opTabKeyDown(e, activate)');
    expect(source).toContain("key !== 'ArrowLeft' && key !== 'ArrowRight'");
    expect(source).toContain("key === 'Home' ? 0 : key === 'End' ? tabs.length - 1");
    expect(source.match(/onKeyDown: function\(e\) \{ opTabKeyDown/g)).toHaveLength(3);
  });

  it('provides minimum targets and forced-colors affordances', () => {
    const source = readFileSync('stem_lab/stem_tool_optics.js', 'utf8');

    expect(source).toContain('min-block-size:24px;min-inline-size:24px');
    expect(source).toContain('@media(forced-colors:active)');
    expect(source).toContain('outline:3px solid Highlight!important');
    expect(source).not.toContain('outline: none');
    expect(source.match(/h\('th', \{ scope: 'col'/g)).toHaveLength(7);
    expect(source).toContain("'aria-label': 'Photon wavelength'" );
    expect(source).toContain("'aria-label': t('stem.optics.hypothesis_input', 'TIR hypothesis')");
    expect(source).toContain('Lens ray tracer showing object and image formation.');
    expect(source).toContain('Comparison of coherent and incoherent light waves.');
  });
  it('tracks simulation milestones from effects instead of render timers', () => {
    const source = readFileSync('stem_lab/stem_tool_optics.js', 'utf8');

    expect(source).toContain('Award simulation milestones from effects, never from render paths.');
    expect(source).toContain("}, [d.refrN1, d.refrN2, d.refrTheta1, d.tirTriggered]);");
    expect(source).toContain("}, [d.mode, d.lensType, d.lensFocal, d.lensDo, d.realImageFormed, d.virtualImageFormed]);");
    expect(source).not.toContain('Quest auto-tracking on the calc render');
    expect(source).not.toContain('Set later via upd to avoid re-render storm');
  });
  it('runs visualizer clocks through cancellable lifecycle effects', () => {
    const source = readFileSync('stem_lab/stem_tool_optics.js', 'utf8');

    expect(source).toContain("}, [d.phenoAfterPhase, d.phenoAfterStartedAt, d.phenoAfterTick]);");
    expect(source).toContain("}, [d.phenoQuantumPlaying, d.phenoQuantumRate, d.phenoQuantumDots, d.phenoQuantumCount]);");
    expect(source.match(/return function\(\) \{ clearTimeout\(timer\); \};/g).length).toBeGreaterThanOrEqual(2);
    expect(source).not.toContain('Schedule a per-second re-render so the countdown updates');
    expect(source).not.toContain('Auto-fire scheduling (mirrors after-image timer pattern)');
  });

  it('keeps the live experiment visually dominant while preserving guided support', () => {
    const html = renderTool('opticsLab', state({ mode: 'refraction', refrN1: 1, refrN2: 1.5, refrTheta1: 35 }));
    expect(html).toContain('class="opticslab-topic-page"');
    expect(html).toContain('class="opticslab-progress-strip"');
    expect(html).toContain('id="op-prelab-refraction"');
    expect(html).not.toContain('id="op-prelab-refraction" class="opticslab-prelab-drawer" open');
    expect(html).toContain('id="op-learning-refraction"');
    expect(html).toContain('Live relationship');
    expect(html).toContain('Mission 1/3');
    expect(html).toContain('Focus on experiment');
    expect(html).toContain('Pause motion');
    expect(html).toContain('data-op-variable="refrTheta1"');
  });

  it('adds responsive direct manipulation with semantic ray styling', () => {
    const mirror = renderTool('opticsLab', state({ mode: 'reflection', reflMirrorType: 'concave', reflFocal: 10, reflDo: 25 }));
    const polarizers = renderTool('opticsLab', state({ mode: 'polarization', polTheta2: 45, polUseP3: true, polTheta3: 90 }));
    expect(mirror).toContain('aria-roledescription="interactive ray diagram"');
    expect(mirror).toContain('data-op-direct-handle="object-distance"');
    expect(mirror).toContain('source / incident');
    expect(mirror).toContain('reflected / image');
    expect(polarizers).toContain('aria-label="P₂ polarizer axis"');
    expect(polarizers).toContain('aria-label="P₃ polarizer axis"');
    expect(polarizers).toContain('Drag the P₂/P₃ disks or use their arrow keys');
  });

  it('provides synchronized physics-derived 3D wavefields only on wave topics', () => {
    const interference = renderTool('opticsLab', state({ mode: 'interference', intShowWavefield3D: true, intWavefieldProbe: 0.4 }));
    const diffraction = renderTool('opticsLab', state({ mode: 'diffraction', diffShowWavefield3D: true, diffWavefieldProbe: 0.7 }));
    const lenses = renderTool('opticsLab', state({ mode: 'lenses' }));
    expect(interference).toContain('data-op-wavefield-3d="interference"');
    expect(interference).toContain('Ten cross-sections show the wavefield developing');
    expect(interference).toContain('data-op-wavefield-depth="interference"');
    expect(interference).toContain('data-op-wavefield-probe="true"');
    expect(interference).toContain('Depth probe');
    expect(interference).toContain('probe 40%');
    expect(diffraction).toContain('data-op-wavefield-3d="diffraction"');
    expect(diffraction).toContain('data-op-wavefield-depth="diffraction"');
    expect(diffraction).toContain('3D wavefield surface');
    expect(lenses).not.toContain('3D wavefield surface');
  });

  it('keeps wave apparatus geometry on a fixed physical scale with direct handles', () => {
    const source = readFileSync('stem_lab/stem_tool_optics.js', 'utf8');
    const interference = renderTool('opticsLab', state({
      mode: 'interference', intLambda: 600, intSlitSep: 0.2, intScreenL: 1.8, intSlitWidth: 80,
    }));
    const diffraction = renderTool('opticsLab', state({
      mode: 'diffraction', diffMode: 'single', diffLambda: 600, diffSlitWidth: 25, diffScreenL: 2,
    }));
    const grating = renderTool('opticsLab', state({
      mode: 'diffraction', diffMode: 'grating', diffLambda: 600, diffGrating: 1200, diffScreenL: 1,
    }));

    expect(interference).toContain('aria-roledescription="interactive interference bench"');
    expect(interference).toContain('fixed 60 mm screen window');
    expect(interference).toContain('data-op-direct-handle="slit-separation"');
    expect(interference).toContain('data-op-variable="intSlitSep"');
    expect(interference).toContain('data-op-variable="intScreenL"');
    expect(diffraction).toContain('aria-roledescription="interactive diffraction bench"');
    expect(diffraction).toContain('fixed 180 mm window');
    expect(diffraction).toContain('data-op-direct-handle="slit-width"');
    expect(diffraction).toContain('data-op-variable="diffScreenL"');
    expect(grating).toContain('fixed 1000 mm window');
    expect(source).toContain('var screenWindow_m = 0.060');
    expect(source).toContain("var screenWindow_m = mode === 'single' ? 0.18 : 1.0");
    expect(source).toContain('var midY = (screenTop + screenBot) / 2;');
    expect(source).toContain('visualGratingCount');
  });

  it('turns each wave screen into an accessible measurement instrument', () => {
    const interference = renderTool('opticsLab', state({
      mode: 'interference', intLambda: 600, intSlitSep: 0.1, intScreenL: 1,
      intSlitWidth: 50, intScreenProbeMm: 6,
    }));
    const diffraction = renderTool('opticsLab', state({
      mode: 'diffraction', diffMode: 'single', diffLambda: 600,
      diffSlitWidth: 30, diffScreenL: 1.5, diffScreenProbeMm: 0,
    }));
    const grating = renderTool('opticsLab', state({
      mode: 'diffraction', diffMode: 'grating', diffLambda: 600,
      diffGrating: 600, diffScreenL: 1, diffScreenProbeMm: 0,
    }));

    expect(interference).toContain('data-op-screen-ruler="interference"');
    expect(interference).toContain('data-op-screen-detector="interference"');
    expect(interference).toContain('aria-label="Interference screen detector position"');
    expect(interference).toContain('aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home End 0"');
    expect(interference).toContain('data-op-screen-probe-readout="interference"');
    expect(interference).toContain('aria-live="polite"');
    expect(interference).toContain('y = +6.0 mm');
    expect(interference).toContain('I / I₀ =');
    expect(interference).toContain('bright fringe');
    expect(interference).toContain('scale:');
    expect(interference).toContain('data-op-detector-targets="interference"');
    expect(interference).toContain('data-op-detector-target="dark-half"');
    expect(interference).toContain('data-op-detector-target="bright-1"');
    expect(interference).toContain('data-op-intensity-profile="interference"');
    expect(interference).toContain('data-op-intensity-profile-line="interference"');
    expect(interference).toContain('data-op-intensity-profile-detector="interference"');
    expect(interference).toContain('data-op-detector-mm="6.000"');
    expect(interference).toContain('data-axis="x"');
    expect(interference).toContain('data-axis="y"');
    expect(diffraction).toContain('data-op-screen-detector="diffraction"');
    expect(diffraction).toContain('data-op-screen-probe-readout="diffraction"');
    expect(diffraction).toContain('central maximum');
    expect(diffraction).toContain('data-op-detector-target="minimum-1"');
    expect(diffraction).toContain('data-op-intensity-profile="diffraction"');
    expect(grating).toContain('resolved order');
    expect(grating).toContain('data-op-detector-target="order-1"');
  });

  it('uses physical grating openings and mode-correct 3D aperture geometry', () => {
    const source = readFileSync('stem_lab/stem_tool_optics.js', 'utf8');
    const grating = renderTool('opticsLab', state({
      mode: 'diffraction', diffMode: 'grating', diffLambda: 600,
      diffGrating: 600, diffGratingDuty: 50, diffScreenL: 1,
      diffScreenProbeMm: 385, diffShowWavefield3D: true,
    }));
    const single = renderTool('opticsLab', state({
      mode: 'diffraction', diffMode: 'single', diffLambda: 600,
      diffSlitWidth: 30, diffScreenL: 1.5, diffShowWavefield3D: true,
    }));
    const interference = renderTool('opticsLab', state({
      mode: 'interference', intLambda: 600, intSlitSep: 0.1,
      intScreenL: 1, intSlitWidth: 50, intShowWavefield3D: true,
    }));

    expect(grating).toContain('data-op-variable="diffGratingDuty"');
    expect(grating).not.toContain('data-op-variable="diffSlitWidth"');
    expect(grating).toContain('aria-label="Grating open fraction"');
    expect(grating).toContain('opening width 0.83 micrometers');
    expect(grating).toContain('data-op-grating-duty="50"');
    expect(grating).toContain('data-op-grating-order="1"');
    expect(grating).toContain('resolved order m = +1');
    expect(grating).toContain('data-op-wavefield-aperture="grating"');
    expect(grating).toContain('data-op-grating-opening-count="9"');
    expect(grating).toContain('data-op-diffraction-order-ray="1"');
    expect(grating).toContain('data-op-wavefield-detector="diffraction"');
    expect(grating).toContain('data-op-wavefield-height="relative-intensity"');
    expect(grating).toContain('data-op-detector-mm="385.000"');
    expect(grating).toContain('data-op-detector-visible="true"');
    expect(grating).toContain('The linked detector is at +385 mm');
    expect(grating).toContain('Height directly encodes normalized intensity I over I zero');
    expect(source).not.toContain('Math.sqrt(Math.max(0, intensity))');
    expect(source).not.toContain('Math.sqrt(detectorIntensity)');
    expect(single).toContain('data-op-wavefield-aperture="single"');
    expect(interference).toContain('data-op-wavefield-aperture="double"');
  });

  it('turns setup changes into a cause, law, and measured-result chain', () => {
    const isolated = renderTool('opticsLab', state({
      mode: 'interference', intLambda: 700, intSlitSep: 0.1, intScreenL: 1, intSlitWidth: 50,
      opTopicTouched: { interference: true },
      opTopicSnapshots: { interference: { before: { intLambda: 600, intSlitSep: 0.1, intScreenL: 1, intSlitWidth: 50 } } },
    }));
    const confounded = renderTool('opticsLab', state({
      mode: 'interference', intLambda: 700, intSlitSep: 0.06, intScreenL: 1.5, intSlitWidth: 50,
      opTopicTouched: { interference: true },
      opTopicSnapshots: { interference: { before: { intLambda: 600, intSlitSep: 0.1, intScreenL: 1, intSlitWidth: 50 } } },
    }));

    expect(isolated).toContain('data-op-causal-insight="interference"');
    expect(isolated).toContain('data-isolated-variable="true"');
    expect(isolated).toContain('1 · Changed');
    expect(isolated).toContain('2 · Physics link');
    expect(isolated).toContain('3 · Result');
    expect(isolated).toContain('Wavelength: 600 nm → 700 nm');
    expect(isolated).toContain('Fringe spacing is directly proportional to wavelength');
    expect(isolated).toContain('Fringe spacing increased by 1.00 mm');
    expect(isolated).toContain('data-op-set-baseline="interference"');
    expect(isolated).toContain('Set current as baseline');
    expect(confounded).toContain('data-isolated-variable="false"');
    expect(confounded).toContain('variables changed together');
    expect(confounded).toContain('isolate one control');
  });

  it('renders every evidence family and offers a recent-versus-all history control', () => {
    const trials = [
      { id: 'c1', capturedAt: 1, series: 'lenses-converging', setup: { lensType: 'converging', lensDo: 18 }, x: 18, y: 36, xLabel: 'Object distance', yLabel: 'Image distance', xUnit: 'cm', yUnit: 'cm', summary: 'Converging run one.' },
      { id: 'c2', capturedAt: 2, series: 'lenses-converging', setup: { lensType: 'converging', lensDo: 24 }, x: 24, y: 24, xLabel: 'Object distance', yLabel: 'Image distance', xUnit: 'cm', yUnit: 'cm', summary: 'Converging run two.' },
      { id: 'd1', capturedAt: 3, series: 'lenses-diverging', setup: { lensType: 'diverging', lensDo: 10 }, x: 10, y: -5, xLabel: 'Object distance', yLabel: 'Image distance', xUnit: 'cm', yUnit: 'cm', summary: 'Diverging run one.' },
      { id: 'd2', capturedAt: 4, series: 'lenses-diverging', setup: { lensType: 'diverging', lensDo: 15 }, x: 15, y: -7, xLabel: 'Object distance', yLabel: 'Image distance', xUnit: 'cm', yUnit: 'cm', summary: 'Diverging run two.' },
      { id: 'd3', capturedAt: 5, series: 'lenses-diverging', setup: { lensType: 'diverging', lensDo: 20 }, x: 20, y: -8, xLabel: 'Object distance', yLabel: 'Image distance', xUnit: 'cm', yUnit: 'cm', summary: 'Diverging run three.' },
      { id: 'd4', capturedAt: 6, series: 'lenses-diverging', setup: { lensType: 'diverging', lensDo: 25 }, x: 25, y: -9, xLabel: 'Object distance', yLabel: 'Image distance', xUnit: 'cm', yUnit: 'cm', summary: 'Diverging run four.' },
    ];
    const html = renderTool('opticsLab', state({ mode: 'lenses', opTrialRuns: { lenses: trials } }));
    expect(html).toContain('Showing all 6 trials');
    expect(html).toContain('across 2 comparable setup families');
    expect(html).toContain('Evidence trend · lenses converging');
    expect(html).toContain('Evidence trend · lenses diverging');
    expect(html).toContain('Show all 6 trials');
    expect(html).not.toContain('Restore trial 1 setup');
  });
});
