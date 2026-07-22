import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const DISSECTION_PATHS = [
  'stem_lab/stem_tool_dissection.js',
  'prismflow-deploy/public/stem_lab/stem_tool_dissection.js',
];

describe('dissection improvement contracts', () => {
  it('keeps progress specimen-specific and persists learner evidence', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain("scheduleDissectionSave('dissection_progress_' + specimen");
      expect(source).toContain('revealedLayers: d.revealedLayers || {}');
      expect(source).toContain('organNotes: d.organNotes || {}');
      expect(source).toContain('organConfidence: d.organConfidence || {}');
      expect(source).toContain('annotations: d.annotations || []');
      expect(source).toContain("localStorage.removeItem('dissection_progress_' + specimen)");
      expect(source).not.toContain("setTimeout(function () { upd('_dissQuizOpts'");
    }
  });

  it('provides honest controls, accessible touch input, and reliable practical scoring', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('onPointerDown: function (e)');
      expect(source).toContain('canvas.setPointerCapture(e.pointerId)');
      expect(source).toContain("window.__alloDissectionSoundEnabled = enabled");
      expect(source).toContain('window.__alloDissectionPracticalScore = nextScore');
      expect(source).toContain("var finalScore = 0;");
      expect(source).toContain('window.print();');
      expect(source).not.toContain("upd('printMode'");
      expect(source).not.toContain('Switch anatomical view: dorsal or ventral');
    }
  });

  it('labels comparative science and captures evidence in reports', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('data-dissection-evidence');
      expect(source).toContain('Comparative learning model: specimen observations and human clinical connections are labeled separately.');
      expect(source).toContain("report += '  Evidence note: '");
      expect(source).toContain("report += '  Confidence: '");
      expect(source).toContain("Human/clinical connection");
      expect(source).toContain("species-specific");
    }
  });

  it('models a persistent, accessible procedural instrument workflow', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('var PROCEDURE_INSTRUMENTS = [');
      expect(source).toContain("schemaVersion: 4");
      expect(source).toContain('procedureByLayer: d.procedureByLayer || {}');
      expect(source).toContain("role: \"radiogroup\", \"aria-label\": \"Dissection instruments\"");
      expect(source).toContain('function performProcedureAction(action, payload)');
      expect(source).toContain('function beginProcedureStroke(e)');
      expect(source).toContain('function finishProcedureStroke(e)');
      expect(source).toContain('function procedurePathMetrics(points, samples)');
      expect(source).toContain('function procedureTechniqueScore(state)');
      expect(source).toContain('function showProcedureDemonstration()');
      expect(source).toContain('function showProcedureReplay()');
      expect(source).toContain('function procedureTactile(kind)');
      expect(source).toContain('navigator.vibrate');
      expect(source).toContain('canvas._toolResistance');
      expect(source).toContain("Resistance: ' + resistance.level");
      expect(source).toContain('actionLog: []');
      expect(source).toContain('tactileFeedback: d.tactileFeedback !== false');
      expect(source).toContain('function drawProcedureOpening(points, extended)');
      expect(source).toContain('function drawTissueFlaps(guide)');
      expect(source).toContain('function specimenScaleFactors()');
      expect(source).toContain('function inverseSpecimenVariation(point)');
      expect(source).toContain("cursorTool === 'scalpel'");
      expect(source).toContain('canvas._dissLensBuffer');
      expect(source).toContain("PROCEDURE_INSTRUMENTS.push({ id: 'dropper'");
      expect(source).toContain('visualRealism: visualRealism');
      expect(source).toContain('endpointDistance');
      expect(source).toContain('Undo last technique action');
      expect(source).toContain('generalized, non-graphic teaching simulation');
      expect(source).toContain("Technique cautions reviewed: ");
      expect(source).toContain("Current layer technique score: ");
      expect((source.match(/performProcedureAction\('forceps', \{ point:/g) || []).length).toBe(1);
    }
  });
});

describe('dissection improved UI render', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  });

  it('renders the evidence workflow and comparative-model notice', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        selectedOrgan: 'dorsal_skin',
        _dissLoadedSpec: 'frog',
        organNotes: { 'frog|dorsal_skin': 'Moist, pigmented external surface.' },
        organConfidence: { 'frog|dorsal_skin': 2 },
      },
    });

    expect(html).toContain('data-dissection-evidence="true"');
    expect(html).toContain('Evidence note');
    expect(html).toContain('Moist, pigmented external surface.');
    expect(html).toContain('Comparative learning model');
    expect(html).toContain('Guided investigation');
    expect(html).toContain('Practice assessment');
  });

  it('renders canvas-answer assessment with a keyboard alternative', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        _dissLoadedSpec: 'frog',
        quizMode: true,
        quizIdx: 1,
        quizSeed: 42,
        quizAnswerMode: 'hotspot',
      },
    });

    expect(html).toContain('Select on specimen');
    expect(html).toContain('keyboard-accessible multiple-choice answers');
    expect(html).toContain('Diagram location clue');
  });

  it('renders guided instruments, progress, depth controls, and an equivalent action button', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        _dissLoadedSpec: 'frog',
        activeInstrument: 'scalpel',
        incisionDepth: 'shallow',
        procedureMode: 'guided',
        procedureByLayer: {
          skin: { inspected: true, incisionStarted: false, incisionExtended: false, retracted: false, pins: [], probed: false, history: ['inspect'], actionLog: [{ action: 'inspect', label: 'Inspected', at: 1 }] },
        },
      },
    });

    expect(html).toContain('Technique practice');
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('Scalpel');
    expect(html).toContain('Deep (practice warning)');
    expect(html).toContain('Make a shallow guided incision');
    expect(html).toContain('Technique score');
    expect(html).toContain('Tool control');
    expect(html).toContain('Not scored');
    expect(html).toContain('Inspected');
    expect(html).toContain('Show technique');
    expect(html).toContain('Replay attempt');
    expect(html).toContain('Undo last technique action');
    expect(html).toContain('generalized, non-graphic teaching simulation');
  });

  it('renders specimen-aware realism controls and the sheep-eye dropper tray', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'sheepEye',
        activeLayer: 'skin',
        _dissLoadedSpec: 'sheepEye',
        activeInstrument: 'dropper',
        toolbarViewOpen: true,
        visualRealism: 'guided',
        labLight: 'neutral',
        inspectionLens: false,
        variationSeed: 3,
        procedureByLayer: { skin: { inspected: true, history: ['inspect'] } },
      },
    });

    expect(html).toContain('Visuals: Guided');
    expect(html).toContain('Tactile on');
    expect(html).toContain('Lens off');
    expect(html).toContain('neutral light');
    expect(html).toContain('Variation 3');
    expect(html).toContain('After view');
    expect(html).toContain('Dropper');
    expect(html).toContain('Apply controlled drop');
    expect(html).toContain('Eye tray');
  });
});
