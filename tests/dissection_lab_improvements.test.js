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
      expect(source).toContain("schemaVersion: 10");
      expect(source).toContain('procedureByLayer: d.procedureByLayer || {}');
      expect(source).toContain("role: \"radiogroup\", \"aria-label\": \"Dissection instruments\"");
      expect(source).toContain('function performProcedureAction(action, payload)');
      expect(source).toContain('function beginProcedureStroke(e)');
      expect(source).toContain('function finishProcedureStroke(e)');
      expect(source).toContain('function procedurePathMetrics(points, samples)');
      expect(source).toContain('function procedureTechniqueScore(state)');
      expect(source).toContain('function showProcedureDemonstration()');
      expect(source).toContain('function showProcedureReplay()');
      expect(source).toContain('function saveTechniqueAttempt()');
      expect(source).toContain('function startNewTechniqueAttempt()');
      expect(source).toContain('function techniqueComparisonData()');
      expect(source).toContain('function adaptiveCoachingData()');
      expect(source).toContain('function applyAdaptiveCoaching()');
      expect(source).toContain('attemptArchive: d.attemptArchive || {}');
      expect(source).toContain('adaptiveGuidance: d.adaptiveGuidance !== false');
      expect(source).toContain("ctx.fillText('Previous attempt'");
      expect(source).toContain('pointerType: canvas._toolInputType');
      expect(source).toContain('cautionLog: cautionLog');
      expect(source).toContain('function procedureTactile(kind)');
      expect(source).toContain('navigator.vibrate');
      expect(source).toContain('canvas._toolResistance');
      expect(source).toContain("Resistance: ' + resistance.level");
      expect(source).toContain('actionLog: []');
      expect(source).toContain('tactileFeedback: d.tactileFeedback !== false');
      expect(source).toContain('var ADVANCED_SCENARIOS = [');
      expect(source).toContain('function procedureScenarioStatus()');
      expect(source).toContain('function procedureDebriefData()');
      expect(source).toContain('function anatomicalRelationships()');
      expect(source).toContain('var CURATED_ANATOMY_RELATIONSHIPS = {');
      expect(source).toContain('var VIEW_OCCLUSIONS = {');
      expect(source).toContain('var VIEW_LANDMARK_OFFSETS = {');
      expect(source).toContain('function viewSpecificOrganPoint(org, point)');
      expect(source).toContain('function viewOrganVisibility(org)');
      expect(source).toContain("frog: { dorsal: [[0.50,0.27]");
      expect(source).toContain("heart: { dorsal: [[0.43,0.33]");
      expect(source).toContain("type: 'neural transmission'");
      expect(source).toContain("type: 'blood flow'");
      expect(source).toContain("Toggle curated anatomical relationships");
      const relationshipBlock = source.slice(source.indexOf('var CURATED_ANATOMY_RELATIONSHIPS'), source.indexOf('var VIEW_OCCLUSIONS'));
      const structureIds = new Set(Array.from(source.matchAll(/\bid: '([^']+)'/g), (match) => match[1]));
      const relationshipTargets = Array.from(relationshipBlock.matchAll(/\b(?:from|to): '([^']+)'/g), (match) => match[1]);
      expect(relationshipTargets.length).toBeGreaterThan(80);
      for (const target of relationshipTargets) expect(structureIds.has(target)).toBe(true);
      expect(source).toContain('angleControl: Math.round(angleControl * 100)');
      expect(source).toContain("ctx.fillText('Layer cross-section'");
      expect(source).toContain('anatomicalView: anatomicalView');
      expect(source).toContain('renderQuality: renderQuality');
      expect(source).toContain('Instructor assessment thresholds');
      expect(source).toContain('function drawProcedureOpening(points, extended)');
      expect(source).toContain('function drawTissueFlaps(guide, pins, forcepsPoint)');
      expect(source).toContain('var leftEdge = [], rightEdge = []');
      expect(source).toContain('var normalX = -tangentY / tangentLength');
      expect(source).toContain('var contactPressure = Math.max');
      expect(source).toContain("ctx.fillText('Contact '");
      expect(source).toContain("ctx.fillText('MACRO '");
      expect(source).toContain('var cursorAngleDelta = Math.atan2');
      expect(source).toContain('instrumentVisuals: instrumentVisuals');
      expect(source).toContain('macroInset: macroInset');
      expect(source).toContain('instrumentVisuals: data.instrumentVisuals !== false');
      expect(source).toContain('macroInset: data.macroInset !== false');
      expect(source).toContain('var SPECIMEN_MATERIAL_PROFILES = {');
      expect(source).toContain("pattern: 'chromatophores'");
      expect(source).toContain("pattern: 'segments'");
      expect(source).toContain("pattern: 'follicles'");
      expect(source).toContain("pattern: 'scales'");
      expect(source).toContain("pattern: 'facets'");
      expect(source).toContain("pattern: 'radial'");
      expect(source).toContain("pattern: 'fibers'");
      expect(source).toContain('sceneDetail: sceneDetail');
      expect(source).toContain('relationshipMotion: relationshipMotion');
      expect(source).toContain('sceneDetail: data.sceneDetail !== false');
      expect(source).toContain('relationshipMotion: data.relationshipMotion !== false');
      expect(source).toContain('var relationshipColor =');
      expect(source).toContain('var flowT = relationshipMotion && !dissMotionReduced');
      expect(source).toContain('var focusRadius = 12 + (1 - focusEntryProgress)');
      expect(source).toContain('var focusMuted = focusMode');
      expect(source).toContain('focusEntryProgress = 1 - Math.pow');
      expect(source).toContain('focusMode: focusMode');
      expect(source).toContain('lightDirection: lightDirection');
      expect(source).toContain('focusMode: data.focusMode !== false');
      expect(source).toContain('parallaxDepth: parallaxDepth');
      expect(source).toContain('parallaxDepth: data.parallaxDepth !== false');
      expect(source).toContain('visualEvidence: visualEvidence');
      expect(source).toContain('referenceEvidenceId: d.referenceEvidenceId || null');
      expect(source).toContain('function captureVisualEvidence()');
      expect(source).toContain('thumbnail.width = 220; thumbnail.height = 264');
      expect(source).toContain('visualEvidence.concat([evidenceEntry]).slice(-6)');
      expect(source).toContain('function selectEvidenceReference(evidenceId)');
      expect(source).toContain('function downloadEvidence(evidence)');
      expect(source).toContain('var parallaxEnabled = d.parallaxDepth !== false && !dissMotionReduced');
      expect(source).toContain('canvas._parallaxTargetX');
      expect(source).toContain('className: "diss-canvas-layout"');
      expect(source).toContain('className: "diss-evidence__grid"');
      expect(source).toContain("lightDirection: ['overhead', 'left', 'right', 'raking']");
      expect(source).toContain('var directionalShade = lightDirection');
      expect(source).toContain('var focusVignette = ctx.createRadialGradient');
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
        procedureScenario: 'precision-access',
        showProcedureDebrief: true,
        instructorTarget: 80,
        adaptiveGuidance: true,
        compareTechniqueAttempts: true,
        attemptArchive: {
          skin: [{ id: 7, score: 58, precision: 76, coverage: 70, control: 72, angleControl: 68, cautions: 1, view: 'dorsal', inputType: 'mouse', incisionPath: [{ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.6 }] }],
        },
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
    expect(html).toContain('Instrument angle');
    expect(html).toContain('Precision access');
    expect(html).toContain('Scenario: Precision access');
    expect(html).toContain('Debrief');
    expect(html).toContain('Next improvement');
    expect(html).toContain('Instructor thresholds');
    expect(html).toContain('Target score: 80');
    expect(html).toContain('Tool control');
    expect(html).toContain('Not scored');
    expect(html).toContain('Inspected');
    expect(html).toContain('Show technique');
    expect(html).toContain('Replay attempt');
    expect(html).toContain('Save attempt');
    expect(html).toContain('Start new attempt');
    expect(html).toContain('Compare attempts');
    expect(html).toContain('Adaptive coaching on');
    expect(html).toContain('Adaptive focus: Orientation');
    expect(html).toContain('Apply coaching setup');
    expect(html).toContain('Previous attempt vs current attempt');
    expect(html).toContain('Saved baseline: dorsal view, mouse');
    expect(html).toContain('Input');
    expect(html).toContain('Undo last technique action');
    expect(html).toContain('generalized, non-graphic teaching simulation');
  });

  it('renders a compressed evidence notebook with live-reference comparison controls', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        _dissLoadedSpec: 'frog',
        toolbarViewOpen: true,
        toolbarToolsOpen: true,
        parallaxDepth: true,
        splitComparison: true,
        referenceEvidenceId: 101,
        visualEvidence: [{
          id: 101,
          image: 'data:image/jpeg;base64,AAA',
          capturedAt: '2026-07-23T14:30:00.000Z',
          layer: 'skin',
          layerName: 'External Anatomy',
          view: 'dorsal',
          condition: 'standard',
          selectedOrganName: 'Dorsal Skin',
          techniqueScore: 84,
          specimen: 'frog',
        }],
      },
    });

    expect(html).toContain('Capture evidence');
    expect(html).toContain('Evidence notebook');
    expect(html).toContain('Reference frame');
    expect(html).toContain('data-split="true"');
    expect(html).toContain('data-reference="true"');
    expect(html).toContain('Depth motion on');
    expect(html).toContain('Split compare on');
    expect(html).toContain('Reference selected');
    expect(html).toContain('Technique 84/100');
    expect(html).toContain('Focused on Dorsal Skin');
  });

  it('renders specimen-aware realism controls and the sheep-eye dropper tray', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'sheepEye',
        activeLayer: 'skin',
        _dissLoadedSpec: 'sheepEye',
        activeInstrument: 'dropper',
        selectedOrgan: 'sclera',
        toolbarViewOpen: true,
        visualRealism: 'guided',
        labLight: 'neutral',
        inspectionLens: false,
        instrumentVisuals: true,
        macroInset: true,
        sceneDetail: true,
        relationshipMotion: true,
        focusMode: true,
        lightDirection: 'raking',
        variationSeed: 3,
        anatomicalView: 'lateral',
        crossSectionMode: true,
        specimenCondition: 'cloudy',
        relationshipMode: true,
        renderQuality: 'balanced',
        procedureByLayer: { skin: { inspected: true, history: ['inspect'] } },
      },
    });

    expect(html).toContain('Visuals: Guided');
    expect(html).toContain('View: lateral');
    expect(html).toContain('Cross-section on');
    expect(html).toContain('Condition: cloudy');
    expect(html).toContain('Relationships on');
    expect(html).toContain('Curated anatomical relationships');
    expect(html).toContain('provides attachment for Extraocular Muscles [attachment]');
    expect(html).toContain('structures directly visible in this orientation');
    expect(html).toContain('Quality: balanced');
    expect(html).toContain('Tactile on');
    expect(html).toContain('Lens off');
    expect(html).toContain('Visual tools on');
    expect(html).toContain('Macro view on');
    expect(html).toContain('Scene detail on');
    expect(html).toContain('Flow motion on');
    expect(html).toContain('Focus mode on');
    expect(html).toContain('Light angle: raking');
    expect(html).toContain('Material model: translucent corneal and scleral layers');
    expect(html).toContain('Surface model: translucent corneal and scleral layers');
    expect(html).toContain('Light direction: raking');
    expect(html).toContain('Focus isolation on');
    expect(html).toContain('neutral light');
    expect(html).toContain('Variation 3');
    expect(html).toContain('After view');
    expect(html).toContain('Dropper');
    expect(html).toContain('Apply controlled drop');
    expect(html).toContain('Eye tray');
  });
});
