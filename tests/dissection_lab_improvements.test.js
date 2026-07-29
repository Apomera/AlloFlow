import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import axe from 'axe-core';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const DISSECTION_PATHS = [
  'stem_lab/stem_tool_dissection.js',
  'desktop/web-app/public/stem_lab/stem_tool_dissection.js',
];

describe('dissection improvement contracts', { timeout: 20000 }, () => {
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
      expect(source).toContain("schemaVersion: 16");
      expect(source).toContain('procedureByLayer: d.procedureByLayer || {}');
      expect(source).toContain("role: \"radiogroup\", \"aria-label\": \"Dissection instruments\"");
      expect(source).toContain('function performProcedureAction(action, payload)');
      expect(source).toContain('function beginProcedureStroke(e)');
      expect(source).toContain('function finishProcedureStroke(e)');
      expect(source).toContain('function procedurePathMetrics(points, samples)');
      expect(source).toContain('function procedureTechniqueScore(state)');
      expect(source).toContain('function showProcedureDemonstration()');
      expect(source).toContain('function showProcedureReplay()');
      expect(source).toContain('function compactProcedureSamples(samples)');
      expect(source).toContain('Bounded pressure and cadence samples preserve technique replay detail without retaining raw pointer events.');
      expect(source).toContain('sample.dt != null ? Number(sample.dt)');
      expect(source).toContain('incisionSamples: compactProcedureSamples(payload.samples)');
      expect(source).toContain('extensionSamples: compactProcedureSamples(payload.samples)');
      expect(source).toContain('function drawPressureReplayTrail(points, samples, progress, color, dashed)');
      expect(source).toContain('Pressure is encoded redundantly by trail width, perpendicular ticks, a radial gauge, and numeric text.');
      expect(source).toContain("replayStatusText = replayDistance <= 0.04 ? 'ON PATH'");
      expect(source).toContain("'CORRECTION'");
      expect(source).toContain("'STEP ' + (replayIndex + 1) + '/' + replayActions.length");
      expect(source).toContain('Previous attempt \\u00B7 dashed pressure trail');
      expect(source).toContain('Recorded attempt replay progressively traces pressure with line width and states path alignment in text and shape');
      expect(source).toContain('function saveTechniqueAttempt()');
      expect(source).toContain('function startNewTechniqueAttempt()');
      expect(source).toContain('function techniqueComparisonData()');
      expect(source).toContain('function adaptiveCoachingData()');
      expect(source).toContain('function applyAdaptiveCoaching()');
      expect(source).toContain('attemptArchive: d.attemptArchive || {}');
      expect(source).toContain('adaptiveGuidance: d.adaptiveGuidance !== false');
      expect(source).toContain("ctx.fillText('Previous attempt \\u00B7 dashed pressure trail'");
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
      expect(source).toContain('function drawAnatomicalAccessCorridor(points)');
      expect(source).toContain('The access corridor shows full instrument clearance, travel direction, endpoints, and depth risk instead of a single target line.');
      expect(source).toContain("var corridorDeep = (d.incisionDepth || 'shallow') === 'deep'");
      expect(source).toContain("spec.bodyShape === 'worm' ? 6.2");
      expect(source).toContain('function corridorPointAt(ratio)');
      expect(source).toContain("ctx.setLineDash(corridorDeep ? [3, 3] : [7, 5])");
      expect(source).toContain("'SAFE SHALLOW CORRIDOR'");
      expect(source).toContain("'DEEP PRACTICE \\u00B7 PROTECTED'");
      expect(source).toContain('drawAnatomicalAccessCorridor(procedureGuidePoints())');
      expect(source).toContain('Guided anatomical access corridor active; circle marks start and diamond marks finish');
      expect(source).toContain("'; access corridor: ' + (procedureMode === 'guided'");
      expect(source).toContain('function drawTissueFlaps(guide, pins, forcepsPoint)');
      expect(source).toContain('var leftEdge = [], rightEdge = []');
      expect(source).toContain('var normalX = -tangentY / tangentLength');
      expect(source).toContain('var contactPressure = Math.max');
      expect(source).toContain("ctx.fillText(materialResponseLabel");
      expect(source).toContain("ctx.fillText('MACRO '");
      expect(source).toContain('function toggleInspectionPin()');
      expect(source).toContain('function cycleLensMagnification()');
      expect(source).toContain('function cycleLensFocusDepth()');
      expect(source).toContain('lensPinned: lensPinned');
      expect(source).toContain('lensMagnification: lensMagnification');
      expect(source).toContain('lensFocusDepth: lensFocusDepth');
      expect(source).toContain("var inspectionAccent = inspectionDepth === 'surface'");
      expect(source).toContain("ctx.fillText('FOCUS: ' + liveOpticalInspection.label.toUpperCase()");
      expect(source).toContain("e.key === 'p' || e.key === 'P'");
      expect(source).toContain("e.key === 'm' || e.key === 'M'");
      expect(source).toContain("e.key === 'f' || e.key === 'F'");
      expect(source).toContain('var cursorAngleDelta = Math.atan2');
      expect(source).toContain('function drawInstrumentContactShadow(toolId, contactContext, angle, engaged, scale, material, pitchData, lightingData)');
      expect(source).toContain('Directional contact shadow and tool-specific footprint distinguish approach, contact, and engagement before the instrument body is drawn.');
      expect(source).toContain('var shadowDirection =');
      expect(source).toContain("ctx.setLineDash(onSpecimen ? [] : [4, 3])");
      expect(source).toContain("toolId === 'scalpel' || toolId === 'scissors'");
      expect(source).toContain("toolId === 'forceps'");
      expect(source).toContain("toolId === 'pin'");
      expect(source).toContain("toolId === 'dropper'");
      expect(source).toContain('drawInstrumentContactShadow(cursorTool, cursorContactContext, cursorAngle, toolVisuallyEngaged, cursorScale, cursorMaterial, cursorPitch, cursorLighting)');
      expect(source).toContain('Directional contact footprint feedback is active');
      expect(source).toContain('function instrumentPitchData(toolId)');
      expect(source).toContain("scalpel: { degrees: toolCalibration.bladeAngle, min: 20, max: 35");
      expect(source).toContain("pin: { degrees: toolCalibration.pinAngle, min: 55, max: 75");
      expect(source).toContain('function drawInstrumentPitchGauge(toolId, angle, pitchData, engaged, onSpecimen)');
      expect(source).toContain('The posture reticle separates planar heading from above-surface pitch using angle, foreshortening, and non-color status geometry.');
      expect(source).toContain('var cursorLongitudinalScale = 0.62 + Math.cos(cursorPitch.radians) * 0.38');
      expect(source).toContain('var cursorProjectedOffset = toolTipOffset * cursorLongitudinalScale * cursorScale');
      expect(source).toContain('ctx.scale(cursorScale * cursorLongitudinalScale, cursorScale)');
      expect(source).toContain('ctx.rotate(-angle)');
      expect(source).not.toContain("cursorAngle += (toolCalibration.bladeAngle - 25)");
      expect(source).not.toContain("cursorAngle += (toolCalibration.pinAngle - 65)");
      expect(source).toContain('Three-dimensional instrument pitch feedback is active');
      expect(source).toContain("'; instrument pitch: ' + (instrumentVisuals ? 'on' : 'off')");
      expect(source).toContain('function instrumentLightingData(angle, pitchData)');
      expect(source).toContain('One lab-light model drives metal highlights, instrument shadows, and the projected tip-to-surface elevation cue.');
      expect(source).toContain('function drawInstrumentElevationTether(angle, engaged, onSpecimen, pitchData, lightingData, tipPoint)');
      expect(source).toContain('function drawInstrumentSpecularEdge(toolId, lightingData)');
      expect(source).toContain('var cursorLighting = instrumentLightingData(cursorAngle, cursorPitch)');
      expect(source).toContain('ctx.setLineDash(engaged && onSpecimen ? [] : (onSpecimen ? [2, 2] : [4, 3]))');
      expect(source).toContain('metalGradient.addColorStop(cursorLighting.highlightPosition');
      expect(source).toContain('Light-aware instrument elevation feedback is active');
      expect(source).toContain("'; instrument lighting: ' + (instrumentVisuals ? 'light-aware elevation feedback on' : 'off')");
      expect(source).toContain('function queueProcedureInstrumentReplay(toolId, options)');
      expect(source).toContain('Equivalent action controls receive the same visible instrument choreography as direct canvas manipulation.');
      expect(source).toContain('duration: dissMotionReduced ? 900 : 1400, replay: true, replayPath: path');
      expect(source).toContain('Replay advances along the real teaching path, with eased travel and no looping.');
      expect(source).toContain("var replayStage = contactPulseProgress < 0.28 ? '1 APPROACH'");
      expect(source).toContain("queueProcedureInstrumentReplay('probe', { point: variedOrganPoint(keyboardSelected) })");
      expect(source).toContain('Equivalent keyboard and button actions include an instrument approach, contact, and release replay');
      expect(source).toContain("'; equivalent action replay: ' + (instrumentVisuals ? 'on' : 'off')");
      expect(source).toContain('function cuttingTrajectorySafety(point, vector)');
      expect(source).toContain("var maxForward = Math.min(safetyWidth, safetyHeight)");
      expect(source).toContain('var lateralDistance = Math.abs');
      expect(source).toContain("trajectorySafety.critical ? 'STOP: PROTECT '");
      expect(source).toContain('The projected safety envelope shows direction, clearance, and the first anatomical intercept without relying on color alone.');
      expect(source).toContain("var safetyLabel = (safetyCritical ? 'STOP · ' : 'AHEAD · ')");
      expect(source).toContain('canvas._cuttingSafetyState');
      expect(source).toContain('Predictive cutting trajectory safety feedback is active');
      expect(source).toContain("'; trajectory safety: ' + (instrumentVisuals ? 'on' : 'off')");
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
      expect(source).toContain('Material response values drive incision width, flap movement, and live tool-contact deformation.');
      expect(source).toContain("response: 'elastic skin'");
      expect(source).toContain("response: 'segment compression'");
      expect(source).toContain("response: 'dermal tension'");
      expect(source).toContain("response: 'scale displacement'");
      expect(source).toContain("response: 'rigid shell contact'");
      expect(source).toContain("response: 'corneal ripple'");
      expect(source).toContain("response: 'fiber compression'");
      expect(source).toContain('openingMaterial.compliance');
      expect(source).toContain('Edge microstructure keeps the opening visually tied to the organism');
      expect(source).toContain('flapMaterial.compliance');
      expect(source).toContain('flapTissue.moisture');
      expect(source).toContain('canvas._toolContactPulse');
      expect(source).toContain('function specimenContactContext(point)');
      expect(source).toContain('Contact context separates tissue interaction from tray contact');
      expect(source).toContain('A pressure-weighted live trail shows both stroke placement and corridor alignment');
      expect(source).toContain('var liveStrokeDistance = distanceToGuide');
      expect(source).toContain("'ON PATH'");
      expect(source).toContain("'EDGE'");
      expect(source).toContain("'DRIFT'");
      expect(source).toContain("resistanceStatus.textContent = (activeInstrument === 'scissors'");
      expect(source).toContain("'TRAY SURFACE'");
      expect(source).toContain('no tissue response');
      expect(source).toContain("activeDepthLabel + ' / PROTECT '");
      expect(source).toContain('Organism-aware contact deformation makes every instrument read as physically connected');
      expect(source).toContain("toolMaterial.pattern === 'segments'");
      expect(source).toContain("toolMaterial.pattern === 'scales'");
      expect(source).toContain("toolMaterial.pattern === 'facets'");
      expect(source).toContain("toolMaterial.pattern === 'radial'");
      expect(source).toContain("toolMaterial.pattern === 'fibers'");
      expect(source).toContain("toolMaterial.pattern === 'follicles'");
      expect(source).toContain("ctx.fillText('ACTIVE'");
      expect(source).toContain("ctx.fillText('LIFTED'");
      expect(source).toContain("{ eye: 'OPTICAL FILM RESTORED', worm: 'CUTICLE HYDRATED'");
      expect(source).toContain("var probeLabel = 'Trace: ' + probedStructure.name");
      expect(source).toContain("ctx.fillText('STABLE ANCHOR'");
      expect(source).toContain("forcepsPreviewValid ? 'LIFT PREVIEW: ' + forcepsGripPreview");
      expect(source).toContain('function drawForcepsTractionPreview(guide, pointer)');
      expect(source).toContain('Live traction converts grip calibration, material compliance, and tissue tension into a visible pre-commit tissue tent.');
      expect(source).toContain("key: 'slip', label: 'SLIP RISK'");
      expect(source).toContain("key: 'stress', label: 'HIGH STRESS'");
      expect(source).toContain("key: 'controlled', label: 'CONTROLLED LIFT'");
      expect(source).toContain("drawForcepsTractionPreview(activeOpeningPath, canvas._toolPointer)");
      expect(source).toContain('Live forceps traction preview shows tissue lift direction, calibrated grip, slip risk, and excess stress with text and geometry');
      expect(source).toContain("'; forceps traction preview: grip, slip, and stress encoded'");
      expect(source).toContain("pinPreviewValid ? 'ANCHOR PREVIEW: ' + pinAnglePreview");
      expect(source).toContain('function drawPinStabilityPreview(guide, pointer, pins)');
      expect(source).toContain('Pin preview combines endpoint placement, separation, shaft angle, insertion depth, and flap tension before commitment.');
      expect(source).toContain("key: 'crowded', label: 'TOO CLOSE'");
      expect(source).toContain("key: 'shallow', label: 'SHALLOW \\u00B7 SLIP'");
      expect(source).toContain("key: 'steep', label: 'STEEP \\u00B7 STRESS'");
      expect(source).toContain("key: 'stable', label: 'STABLE ANCHOR'");
      expect(source).toContain('var pinTechniqueValid = pinPreviewValid');
      expect(source).toContain('drawPinStabilityPreview(activeOpeningPath, canvas._toolPointer, canvasProcedure.pins || [])');
      expect(source).toContain('Live pin stability preview shows endpoint spacing, calibrated angle, insertion depth, and flap tension with text and geometry');
      expect(source).toContain("'; pin stability preview: angle, depth, spacing, and tension encoded'");
      expect(source).toContain("probePreviewValid ? 'PALPATE: ' + underTipOrgan.name");
      expect(source).toContain('function drawProbePalpationPreview(pointer, organ)');
      expect(source).toContain('Live palpation maps calibrated pressure, organism material, tissue condition, and anatomical depth into pre-commit deformation feedback.');
      expect(source).toContain("key: 'light', label: 'TOO LIGHT'");
      expect(source).toContain("key: 'stress', label: 'EXCESS PRESSURE'");
      expect(source).toContain("key: 'controlled', label: 'CONTROLLED PALPATION'");
      expect(source).toContain("var palpationDepthRank = { surface: 0, structure: 1, deep: 2 }");
      expect(source).toContain('var palpationResistanceValue = Math.max');
      expect(source).toContain('drawProbePalpationPreview(canvas._toolPointer, liveProbeContact.organ)');
      expect(source).toContain('var probeTechniqueValid = probePreviewValid');
      expect(source).toContain("'Probe preview: ' + hoverProbeState");
      expect(source).toContain('Live probe palpation preview shows calibrated pressure, material resistance, anatomical depth, and tissue deformation with text and shape');
      expect(source).toContain("'; probe palpation preview: pressure, resistance, depth, and deformation encoded'");
      expect(source).toContain("dropperPreviewValid ? 'DROP PREVIEW: ' + dropperDosePreview");
      expect(source).toContain('function drawDropperSpreadPreview(pointer)');
      expect(source).toContain('The live dose forecast uses the same organism flow profile as applied saline, exposing spread and pooling risk before commitment.');
      expect(source).toContain("key: 'controlled', label: 'CONTROLLED FILM'");
      expect(source).toContain("key: 'broad', label: 'BROAD SPREAD'");
      expect(source).toContain("key: 'pooling', label: 'POOLING RISK'");
      expect(source).toContain("key: 'saturated', label: 'SATURATED \\u00B7 NO DOSE'");
      expect(source).toContain("forecastProfile.pattern === 'radial'");
      expect(source).toContain("forecastProfile.pattern === 'segments'");
      expect(source).toContain("forecastProfile.pattern === 'fibers'");
      expect(source).toContain("forecastProfile.pattern === 'channels'");
      expect(source).toContain("forecastProfile.pattern === 'beads'");
      expect(source).toContain('drawDropperSpreadPreview(canvas._toolPointer)');
      expect(source).toContain('var dropperTechniqueValid = dropperPreviewValid');
      expect(source).toContain("'Dropper forecast: ' + hoverDropperState");
      expect(source).toContain('Live dropper spread forecast shows dose count, organism-specific flow direction, current saturation, and pooling risk with text and geometry');
      expect(source).toContain("'; dropper spread forecast: dose, flow, saturation, and pooling encoded'");
      expect(source).toContain('function drawProcedureHandoffCue(nextInfo, openingPath)');
      expect(source).toContain('The handoff cue links the completed technique state to the next instrument and its anatomical target without relying on color.');
      expect(source).toContain("'NEXT ' + (handoffStep + 1) + '/6");
      expect(source).toContain("nextInfo.action === 'forceps'");
      expect(source).toContain("nextInfo.action === 'pin'");
      expect(source).toContain("nextInfo.action === 'probe'");
      expect(source).toContain('drawProcedureHandoffCue(nextProcedureInfo(), activeOpeningPath)');
      expect(source).toContain("var toolIsNext = procedureNext.action !== 'complete'");
      expect(source).toContain('"data-next": toolIsNext ? \'true\' : \'false\'');
      expect(source).toContain('"aria-current": toolIsNext ? \'step\' : undefined');
      expect(source).toContain("'Next \\u00B7 ' + toolState.label");
      expect(source).toContain('Guided procedure handoff cue connects the next required instrument to its anatomical target and six-step progress rail with text, shape, and line style');
      expect(source).toContain("'; guided handoff cue: next instrument, anatomical target, and six-step progress encoded'");
      expect(source).toContain('function drawLocalizedTechniqueEvidence(procedureState, tissueState)');
      expect(source).toContain("Localized technique evidence anchors persistent consequences to the learner's actual paths and contact points.");
      expect(source).toContain("evidenceCues.push('EDGE ' + evidenceEdgeMarks)");
      expect(source).toContain("evidenceCues.push('GRIP 1')");
      expect(source).toContain("evidenceCues.push('ANCHOR ' + (procedureState.pins || []).length)");
      expect(source).toContain("evidenceCues.push('CONTACT 1')");
      expect(source).toContain("evidenceCues.push('POOL 1')");
      expect(source).toContain('drawLocalizedTechniqueEvidence(liveProcedureState, liveTissueState)');
      expect(source).toContain('Persistent localized technique evidence maps edge stress, grip compression, anchor tension, probe pressure, and saline pooling to actual contact locations with text and distinct geometry');
      expect(source).toContain("'; localized technique evidence: incision edge, grip, anchor, probe, and pooling consequences encoded'");
      expect(source).toContain('Non-cutting tools announce preview validity only when it changes');
      expect(source).toContain("previewStatus.textContent = previewMessage");
      expect(source).toContain("['forceps', 'pin', 'probe', 'dropper'].indexOf(responseTool) >= 0");
      expect(source).toContain('sceneDetail: sceneDetail');
      expect(source).toContain('relationshipMotion: relationshipMotion');
      expect(source).toContain('sceneDetail: data.sceneDetail !== false');
      expect(source).toContain('relationshipMotion: data.relationshipMotion !== false');
      expect(source).toContain('var depthAtlasEnabled = d.depthAtlas !== false;');
      expect(source).toContain('var depthAtlasCounts = organs.reduce');
      expect(source).toContain('function drawDepthAtlasMarker(x, y, depth, selected, hovered, muted)');
      expect(source).toContain('Shape-coded depth landmarks pair color, geometry, and line style so depth never depends on hue alone.');
      expect(source).toContain("layout.depth === 'deep' ? [1.2, 3.2]");
      expect(source).toContain('depthAtlas: depthAtlasEnabled');
      expect(source).toContain('depthAtlas: data.depthAtlas !== false');
      expect(source).toContain('Toggle anatomical depth atlas with shape-coded landmarks');
      expect(source).toContain('className: "diss-depth-key"');
      expect(source).toContain('Anatomical depth visual key:');
      expect(source).toContain('var tissueReliefEnabled = d.tissueRelief !== false;');
      expect(source).toContain('function drawSpecimenTissueRelief()');
      expect(source).toContain('Responsive tissue relief gives visible structures elevation, recess, and contact shadow before labels are drawn.');
      expect(source).toContain('var reliefPointer = canvas._toolPointer;');
      expect(source).toContain("ctx.globalCompositeOperation = 'multiply'");
      expect(source).toContain("ctx.globalCompositeOperation = 'screen'");
      expect(source).toContain("reliefDepth === 'deep'");
      expect(source).toContain('tissueRelief: tissueReliefEnabled');
      expect(source).toContain('tissueRelief: data.tissueRelief !== false');
      expect(source).toContain('Toggle responsive tissue relief lighting around visible structures');
      expect(source).toContain('function opticalPlaneStatus(organ, focusDepth)');
      expect(source).toContain('var opticalPlaneCounts = organs.reduce');
      expect(source).toContain('function drawOpticalFocusPlaneMap()');
      expect(source).toContain('The focus-plane map projects lens depth across visible landmarks using distinct contour patterns.');
      expect(source).toContain("planeStatus === 'resolved'");
      expect(source).toContain("planeStatus === 'soft'");
      expect(source).toContain('className: "diss-optics__plane-key"');
      expect(source).toContain('Optical plane visual key:');
      expect(source).toContain('function specimenHydrationProfile()');
      expect(source).toContain("label: 'segment-following cuticle film'");
      expect(source).toContain("label: 'corneal film'");
      expect(source).toContain("label: 'fiber-following myocardial film'");
      expect(source).toContain('Organism-specific hydration visualization maps saline spread to surface anatomy and gravity.');
      expect(source).toContain("hydrationProfile.pattern === 'radial'");
      expect(source).toContain("hydrationProfile.pattern === 'segments'");
      expect(source).toContain("hydrationProfile.pattern === 'fibers'");
      expect(source).toContain("hydrationProfile.pattern === 'channels'");
      expect(source).toContain("hydrationProfile.pattern === 'beads'");
      expect(source).toContain("'POOLING \u00B7 REDUCE DOSE'");
      expect(source).toContain("report += 'Hydration response: '");
      expect(source).toContain('var relationshipColor =');
      expect(source).toContain('var flowT = relationshipMotion && !dissMotionReduced');
      expect(source).toContain("var activeFunctionalTraceKey = d.traceCirculation ? 'circulation'");
      expect(source).toContain('One shared playback clock keeps all functional pathways synchronized and pausable.');
      expect(source).toContain('canvas._systemTraceReplayToken !== systemReplayToken');
      expect(source).toContain('var systemTraceTick = Math.max(0, systemTraceBaseTick');
      expect(source).toContain('Screen-fixed functional pathway HUD pairs color with labels, motion state, and direction arrows.');
      expect(source).toContain("'STATIC \\u00B7 reduced motion'");
      expect(source).toContain("'PAUSED \\u00B7 directions held'");
      expect(source).toContain('className: "diss-system-playback"');
      expect(source).toContain('Waiting for Internal Organs layer');
      expect(source).toContain("pathway replayed from the beginning.");
      expect(source).toContain('systemTraceReplayToken: Date.now()');
      expect(source).toContain('.diss-system-playback button[aria-pressed="true"]');      expect(source).toContain('var focusRadius = 12 + (1 - focusEntryProgress)');
      expect(source).toContain('var focusMuted = (focusMode || (denseHotspotView && d.selectedOrgan))');
      expect(source).toContain('focusEntryProgress = 1 - Math.pow');
      expect(source).toContain('Nearest-target hit testing also treats laid-out labels as interactive targets.');
      expect(source).toContain('function closestVisibleOrganAt(x, y, radius, canvasEl)');
      expect(source).toContain('canvasEl && canvasEl._hotspotLabelBoxes || []');
      expect(source).toContain('Adaptive hotspot labels share collision-aware columns and remain clickable.');
      expect(source).toContain("var denseHotspotView = d.labelMode !== 'hidden' && organs.length >= 8 && zoom < 1.22");
      expect(source).toContain('function resolveAdaptiveLabelColumn(items, minY, maxY)');
      expect(source).toContain('canvas._hotspotLabelBoxes = adaptiveHotspotLayout.map');
      expect(source).toContain('Reticle marks make selected state readable without color alone.');
      expect(source).toContain("'Adaptive labels \\u00B7 ' + compactHotspotCount + ' compact \\u00B7 hover to expand'");
      expect(source).toContain('var hit = closestVisibleOrganAt(mx, my, clickHitRadius, canvas);');
      expect(source).toContain('var hit = closestVisibleOrganAt(mx, my, hoverHitRadius, canvas);');
      expect(source).not.toContain('var lx = px + 12, ly = py - 8;');      expect(source).toContain('focusMode: focusMode');
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
      expect(source).toContain("{ id: 'dropper', label: 'Dropper'");
      expect(source).toContain('visualRealism: visualRealism');
      expect(source).toContain('endpointDistance');
      expect(source).toContain('Undo last technique action');
      expect(source).toContain('generalized, non-graphic teaching simulation');
      expect(source).toContain('function procedureInstrumentStatus(toolId)');
      expect(source).toContain('data-diss-tool-status');
      expect(source).toContain("performProcedureAction('probe', { organ: hit });");
      expect(source).toContain('Next-layer tissue bed becomes visible beneath the retracted flaps.');
      expect(source).toContain('var nextTissueLayer = spec.layers[Math.min(spec.layers.length - 1, currentLayerIdx + 1)]');
      expect(source).toContain('Probe confirmation remains anchored to the traced structure as persistent visual evidence.');
      expect(source).toContain('canvasProcedure.probed && canvasProcedure.probedOrganId');
      expect(source).toContain("var probeLabel = 'Trace: ' + probedStructure.name;");      expect(source).toContain('ann.prevX * W');
      expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
      expect(source).toContain('var transitionDuration = prefersReducedLayerMotion ? 650 : 1150');
      expect(source).toContain('_layerTransition: layerTransition');
      expect(source).toContain('Specimen-shaped layer transition opens along the dominant body axis to reveal the new anatomy beneath.');
      expect(source).toContain('var transitionHorizontalBody = transitionRX > transitionRY * 1.18');
      expect(source).toContain('Temporary connective strands bridge the opening and release as the flaps retract.');
      expect(source).toContain('Screen-fixed confirmation stays readable even when the specimen is mirrored, zoomed, or panned.');
      expect(source).toContain("ctx.fillText('LAYER REVEALED'");
      expect(source).toContain("_layerTransition.fromName + '  \\u2192  '");
      expect(source).toContain('_layerTransition.reducedMotion ? 1 : layerTransitionProgress');      expect(source).toContain('d.rulerStart.x * W');
      expect(source).toContain('Measurement complete: ');
      expect(source).toContain('Clear annotations');
      expect(source).toContain("Technique cautions reviewed: ");
      expect(source).toContain("Current layer technique score: ");
      expect((source.match(/performProcedureAction\('forceps', \{ point:/g) || []).length).toBe(1);
    }
  });

  it('uses an anatomy-aware fetal pig silhouette instead of mascot-like features', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('var pigTissueGradient = ctx.createLinearGradient');
      expect(source).toContain('function tracePigBody()');
      expect(source).toContain('function drawPigLimb(shoulderX, shoulderY, kneeX, kneeY, hoofX, hoofY, farSide)');
      expect(source).toContain('Far-side limbs sit behind the torso');
      expect(source).toContain('closed eyelid read as fetal anatomy');
      expect(source).toContain('Fetal-specific external landmark: a short, softly modeled umbilical stump.');
      expect(source).toContain('The fetal tail is a narrow taper with one relaxed curve');
      expect(source).toContain('for (var pigFollicle = 0; pigFollicle < 42; pigFollicle++)');
      expect(source).toContain("{ id: 'masseter_p', name: 'Masseter', x: 0.26, y: 0.42");
      expect(source).toContain("{ id: 'heart_p', name: 'Heart (4-chamber)', x: 0.44, y: 0.44");
      expect(source).toContain("{ id: 'brain_p', name: 'Brain', x: 0.24, y: 0.39");
      expect(source).not.toContain("ctx.arc(cx - W * 0.24, cy - H * 0.06, 4");
    }
  });

  it('keeps earthworm surface and internal anatomy registered to one curved body axis', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function earthwormPoint(t)');
      expect(source).toContain('function earthwormFrame(t)');
      expect(source).toContain('function traceEarthwormBody()');
      expect(source).toContain('function traceEarthwormLine(offsetRatio, startT, endT)');
      expect(source).toContain('function traceEarthwormBand(startT, endT, widthScale)');
      expect(source).toContain('var wormSurfaceGradient = ctx.createLinearGradient');
      expect(source).toContain('The clitellum is a gently expanded glandular saddle');
      expect(source).toContain('Four paired setal positions are suggested');
      expect(source).toContain('Five paired aortic arches encircle the anterior digestive tract');
      expect(source).toContain('Ventral cord sits slightly off the digestive midline');
      expect(source).toContain("{ id: 'setae', name: 'Setae', x: 0.46, y: 0.55");
      expect(source).toContain("{ id: 'clitellum', name: 'Clitellum', x: 0.51, y: 0.33");
      expect(source).toContain("{ id: 'cerebral_g', name: 'Cerebral Ganglia', x: 0.51, y: 0.12");
      expect(source).not.toContain('var ww = W * 0.045;');
    }
  });

  it('adds immersive tray depth and anatomy-aware perch and crayfish materials', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('var trayFluid = ctx.createRadialGradient');
      expect(source).toContain('small condensation beads give the tray depth');
      expect(source).toContain('Recessed stainless tray well with a sealed inner gasket and reflected rim light.');
      expect(source).toContain('Engraved edge ticks suggest a calibrated teaching tray without competing with the scale tool.');
      expect(source).toContain('A specimen-shaped absorbent pad grounds the body and catches the preservation-fluid meniscus.');
      expect(source).toContain("specimenVariationValue('tray-pad-angle-' + padFiberIndex)");
      expect(source).toContain("var stableStippleSize = 0.5 + specimenVariationValue('tissue-stipple-size-' + stip) * 2");
      expect(source).toContain('Compact instrument bay: grounded metal tools replace the earlier faint line-art corner icons.');
      expect(source).toContain("ctx.fillText('INSTRUMENT BAY'");
      expect(source).toContain('background: linear-gradient(145deg, #64748b 0%, #26364b 16%, #0f172a 78%, #475569 100%)');
      expect(source).not.toContain('Math.random() * 2 + 0.5');      expect(source).toContain('var fishBodyGradient = ctx.createLinearGradient');
      expect(source).toContain('var fishIridescence = ctx.createLinearGradient');
      expect(source).toContain('var fishEyeGradient = ctx.createRadialGradient');
      expect(source).toContain("{ id: 'operculum', name: 'Operculum', x: 0.31, y: 0.44");
      expect(source).toContain('Perch internal cutaway: dorsal buoyancy/excretory organs and ventral viscera share one coelomic cavity.');
      expect(source).toContain('function tracePerchCoelom()');
      expect(source).toContain('function drawPerchGillArch(archIndex)');
      expect(source).toContain('The kidney is a dark, elongated organ fixed against the dorsal body wall.');
      expect(source).toContain('Swim bladder: a thin-walled dorsal sac with a vascular rete mirabile patch.');
      expect(source).toContain('Rete mirabile is represented as a compact vascular network along the anterior bladder wall.');
      expect(source).toContain('Three overlapping liver lobes occupy the anterior ventral cavity.');
      expect(source).toContain('Pyloric ceca are distinct blind fingers, not a single generic line.');
      expect(source).toContain('Two functional chambers are shown with the sinus venosus and bulbus arteriosus in series.');
      expect(source).toContain("{ id: 'heart_f', name: 'Heart (2-chamber)', x: 0.32, y: 0.51");
      expect(source).toContain("{ id: 'gonads_f', name: 'Gonads', x: 0.59, y: 0.46");
      const perchCutawayStart = source.indexOf('// Perch internal cutaway:');
      const perchCutaway = source.slice(perchCutawayStart, source.indexOf("if (activeLayer === 'skeleton')", perchCutawayStart));
      expect(perchCutaway).not.toContain('ctx.ellipse(cx, cy - H * 0.04, W * 0.10, H * 0.035');
      expect(source).toContain('function drawCraySegment(x1, y1, x2, y2, r1, r2, alpha)');
      expect(source).toContain('function drawCrayWalkingLeg(side, index, alpha)');
      expect(source).toContain('function drawCrayCheliped(side)');
      expect(source).toContain('Overlapping abdomen plates taper naturally into the telson.');
      expect(source).toContain('Tail fan: central telson plus paired overlapping uropods');
      expect(source).toContain('Movable eye stalks with faceted, low-glare compound eyes.');
      expect(source).toContain("if (activeLayer === 'muscle')");
      expect(source).toContain("{ id: 'carapace', name: 'Carapace', x: 0.47, y: 0.37");
      expect(source).toContain("{ id: 'telson', name: 'Telson & Uropods', x: 0.89, y: 0.45");
      const crayfishRenderer = source.slice(source.indexOf("spec.bodyShape === 'crayfish'"), source.indexOf("spec.bodyShape === 'eye'"));
      expect(crayfishRenderer).not.toContain('ctx.rect(segX');
      expect(crayfishRenderer).not.toContain("ctx.fillStyle = 'rgba(255,255,255,0.4)'");
    }
  });
  it('uses species-appropriate sheep-eye layers and an anatomical sheep-heart silhouette', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function traceSheepEyeGlobe(scaleX, scaleY)');
      expect(source).toContain('Tapetum lucidum occupies the dorsal posterior fundus in sheep');
      expect(source).toContain('Corneal dome and anterior chamber form a true bulge');
      expect(source).toContain('The iris is shown as two pigmented leaflets');
      expect(source).toContain('Sheep retinal specialization is represented as an area centralis, not a human fovea/macula.');
      expect(source).toContain("{ id: 'cornea', name: 'Cornea', x: 0.20, y: 0.45");
      expect(source).toContain("{ id: 'tapetum', name: 'Tapetum Lucidum', x: 0.67, y: 0.27");
      const eyeRenderer = source.slice(source.indexOf('// Sheep eye: layered lateral cross-section'), source.indexOf('// Sheep heart: asymmetric ventricular mass'));
      expect(eyeRenderer).not.toContain('Fovea centralis');
      expect(eyeRenderer).not.toContain('Macula lutea region');
      expect(source).toContain('function traceSheepHeartBody()');
      expect(source).toContain('var heartPhase = dissMotionReduced ? 0');
      expect(source).toContain('Atrial auricles break the silhouette at the base');
      expect(source).toContain('Directional myocardial fibers follow the ventricular spiral');
      expect(source).toContain("if (activeLayer === 'organs' || activeLayer === 'chambers' || activeLayer === 'interior')");
      expect(source).toContain("(activeLayer === 'organs' && d.selectedOrgan === 'conduction')");
      expect(source).toContain("{ id: 'aorta_h', name: 'Aorta', x: 0.54, y: 0.12");
      expect(source).toContain("{ id: 'sup_vena_h', name: 'Cranial (Superior) Vena Cava', x: 0.69, y: 0.14");
      const heartRendererStart = source.indexOf('// Sheep heart: asymmetric ventricular mass');
      const heartRenderer = source.slice(heartRendererStart, source.indexOf('// Conduction system animation', heartRendererStart));
      expect(heartRenderer).not.toContain('ctx.moveTo(cx, cy - H * 0.25)');
    }
  });
  it('uses an integrated frog posture with registered external and internal anatomy', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function traceFrogTorso()');
      expect(source).toContain('function drawFrogLimbSegment(x1, y1, x2, y2, r1, r2, alpha)');
      expect(source).toContain('function drawFrogHindFoot(side, footX, footY, alpha)');
      expect(source).toContain('function drawFrogHindLimb(side, alpha)');
      expect(source).toContain('function drawFrogForelimb(side, alpha)');
      expect(source).toContain('Folded hindlimbs and smaller forelimbs establish the characteristic resting posture.');
      expect(source).toContain('Dorsolateral folds, chromatophores, and moisture all conform to the unified torso.');
      expect(source).toContain('Layered muscle masses replace generic animated stripes.');
      expect(source).toContain('Organs are drawn posterior-to-anterior so overlap conveys their position in the coelom.');
      expect(source).toContain('Three-chambered heart: paired atria over one muscular ventricle and conus.');
      expect(source).toContain('J-shaped stomach with a duodenal turn.');
      expect(source).toContain('Bilobed urinary bladder and shared cloacal outlet.');
      expect(source).toContain("{ id: 'tympanum', name: 'Tympanic Membrane', x: 0.65, y: 0.24");
      expect(source).toContain("{ id: 'gastrocnemius', name: 'Gastrocnemius', x: 0.24, y: 0.69");
      expect(source).toContain("{ id: 'heart', name: 'Heart (3-chamber)', x: 0.50, y: 0.35");
      expect(source).toContain("{ id: 'astragalus', name: 'Elongated Ankle Bones', x: 0.27, y: 0.78");
      const frogRendererStart = source.indexOf('// Frog: integrated head-and-torso silhouette');
      const frogRenderer = source.slice(frogRendererStart, source.indexOf('// Earthworm geometry is built', frogRendererStart));
      expect(frogRenderer).not.toContain('var bS = breathScale;');
      expect(frogRenderer).not.toContain('Specular highlight (top-left)');
      expect(frogRenderer).not.toContain('draw simplified organ shapes inside body');
    }
  });
  it('renders anatomically layered heart and fetal-pig internal cutaways', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('Internal cutaway: chamber geometry, wall thickness, valves, chordae, and trabeculae.');
      expect(source).toContain('function traceHeartAtrium(side)');
      expect(source).toContain('function drawHeartValveLeaflet(x, y, width, side, color)');
      expect(source).toContain('The interventricular septum is a muscular partition');
      expect(source).toContain('Papillary muscles rise from the wall and anchor multiple branching chordae.');
      expect(source).toContain('Trabeculae carneae follow each ventricular wall');
      expect(source).toContain('function drawSemilunarValve(x, y, color)');
      expect(source).toContain("{ id: 'mitral', name: 'Mitral (Bicuspid) Valve', x: 0.44, y: 0.43");
      expect(source).toContain("{ id: 'septum', name: 'Interventricular Septum', x: 0.50, y: 0.53");
      expect(source).toContain('Side-lying visceral cavity with thoracic and abdominal organs registered to the torso.');
      expect(source).toContain('function drawPigLungLobe(x, y, rx, ry, rotation, alpha)');
      expect(source).toContain('Large fetal thymus extends from the neck into the anterior mediastinum.');
      expect(source).toContain('The diaphragm forms a curved muscular boundary between thorax and abdomen.');
      expect(source).toContain('Five liver lobes overlap near the cranial abdomen.');
      expect(source).toContain('porcine spiral colon forms a watch-spring coil.');
      expect(source).toContain('Urinary bladder and urachus connect directly toward the umbilical stump.');
      expect(source).toContain('Umbilical vein courses to the liver; paired arteries return alongside the bladder.');
      expect(source).toContain("{ id: 'heart_p', name: 'Heart (4-chamber)', x: 0.44, y: 0.44");
      expect(source).toContain("{ id: 'lg_int_p', name: 'Spiral Colon', x: 0.65, y: 0.53");
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
    expect(html).toContain('Active tool: Scalpel');
    expect(html).toContain('Selected · Ready');
    expect(html).toContain('Drag from one end of the teaching corridor');
    expect(html).toContain('data-readiness="ready"');
    expect(html).toContain('data-diss-tool-status="true"');
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
    expect(html).toContain('Clear annotations');
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
        lensPinned: true,
        lensPinnedPoint: { x: 0.42, y: 0.36 },
        lensPinnedOrganId: 'sclera',
        lensMagnification: 6,
        lensFocusDepth: 'deep',
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
    expect(html).toContain('Unpin lens');
    expect(html).toContain('Magnify 6x');
    expect(html).toContain('Focus: deep');
    expect(html).toContain('Visual tools on');
    expect(html).toContain('Macro view on');
    expect(html).toContain('Scene detail on');
    expect(html).toContain('Flow motion on');
    expect(html).toContain('Focus mode on');
    expect(html).toContain('Light angle: raking');
    expect(html).toContain('Material model: translucent corneal and scleral layers');
    expect(html).toContain('Contact response: corneal ripple');
    expect(html).toContain('Surface model: translucent corneal and scleral layers');
    expect(html).toContain('Tool contact response: corneal ripple');
    expect(html).toContain('Directional contact footprint feedback is active');
    expect(html).toContain('Guided anatomical access corridor active; circle marks start and diamond marks finish');

    const cuttingHtml = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        _dissLoadedSpec: 'frog',
        activeInstrument: 'scalpel',
        instrumentVisuals: true,
        procedureMode: 'guided',
        procedureByLayer: { skin: { inspected: true } },
      },
    });
    expect(cuttingHtml).toContain('Predictive cutting trajectory safety feedback is active');
    expect(cuttingHtml).toContain('Three-dimensional instrument pitch feedback is active');
    expect(cuttingHtml).toContain('Light-aware instrument elevation feedback is active');
    expect(cuttingHtml).toContain('Equivalent keyboard and button actions include an instrument approach, contact, and release replay');
    expect(cuttingHtml).toContain('Recorded attempt replay progressively traces pressure with line width and states path alignment in text and shape');
    expect(cuttingHtml).toContain('Live forceps traction preview shows tissue lift direction, calibrated grip, slip risk, and excess stress with text and geometry');
    expect(cuttingHtml).toContain('Live pin stability preview shows endpoint spacing, calibrated angle, insertion depth, and flap tension with text and geometry');
    expect(cuttingHtml).toContain('Live probe palpation preview shows calibrated pressure, material resistance, anatomical depth, and tissue deformation with text and shape');
    expect(cuttingHtml).toContain('Live dropper spread forecast shows dose count, organism-specific flow direction, current saturation, and pooling risk with text and geometry');
    expect(cuttingHtml).toContain('Guided procedure handoff cue connects the next required instrument to its anatomical target and six-step progress rail with text, shape, and line style');
    expect(cuttingHtml).toContain('Persistent localized technique evidence maps edge stress, grip compression, anchor tension, probe pressure, and saline pooling to actual contact locations with text and distinct geometry');
    expect(cuttingHtml).toContain('data-next="true"');
    expect(cuttingHtml).toContain('aria-current="step"');
    expect(cuttingHtml).toContain('Next required instrument.');
    expect(html).toContain('Light direction: raking');
    expect(html).toContain('Focus isolation on');
    expect(html).toContain('neutral light');
    expect(html).toContain('Variation 3');
    expect(html).toContain('After view');
    expect(html).toContain('Dropper');
    expect(html).toContain('Apply controlled drop');
    expect(html).toContain('Eye tray');
  });

  it('keeps anatomical orientation and reference scale accurate at every zoom', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('A calibrated screen-fixed orientation and scale HUD');
      expect(source).toContain("var hudView = String(d.anatomicalView || anatomicalView || 'dorsal').toUpperCase()");
      expect(source).toContain("spec.bodyShape === 'worm' ? 15");
      expect(source).toContain("spec.bodyShape === 'pig' ? 25");
      expect(source).toContain("spec.bodyShape === 'fish' ? 20");
      expect(source).toContain("spec.bodyShape === 'crayfish' ? 12");
      expect(source).toContain("spec.bodyShape === 'frog' ? 8 : 3");
      expect(source).toContain("var horizontalAxis = spec.bodyShape === 'pig' || spec.bodyShape === 'fish' || spec.bodyShape === 'crayfish' || spec.bodyShape === 'eye'");
      expect(source).toContain("var axisStart = cardiacAxis ? 'BASE' : 'A'");
      expect(source).toContain("var axisEnd = cardiacAxis ? 'APEX' : 'P'");
      expect(source).toContain("(scaleCm / specimenSpanCm) * W * zoom");
      expect(source).toContain("var scaleLabel = scaleCm + ' cm  /  ' + zoom.toFixed(1) + 'x'");
      expect(source).not.toContain("ctx.fillText('Anterior', W / 2 - 20, 14)");
      expect(source).not.toContain("d.viewAngle === 'dorsal'");
    }
  });

  it('provides constrained precision navigation and discoverable keyboard parity', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('Canvas navigation shares one constrained zoom model across keyboard, wheel, buttons, and drag panning.');
      expect(source).toContain('function clampCanvasPan(value, zoomLevel, logicalSize)');
      expect(source).toContain('function applyCanvasZoom(canvas, requestedZoom, anchorX, anchorY, announce)');
      expect(source).toContain('focusX - logicalWidth / 2 - worldOffsetX * nextZoom');
      expect(source).toContain("if (!e.ctrlKey && !e.metaKey) return;");
      expect(source).toContain('onWheel: canvasWheelZoom');
      expect(source).toContain('if (canvas._wheelZoomTimer) { clearTimeout(canvas._wheelZoomTimer); canvas._wheelZoomTimer = null; }');
      expect(source).toContain("var keyboardOrgans = organs.filter(function (organ) { return viewOrganVisibility(organ) === 'visible'; });");
      expect(source).toContain('(organIndex + direction + keyboardOrgans.length) % keyboardOrgans.length');
      expect(source).toContain("e.key === 'Home' || e.key === 'End'");
      expect(source).toContain("e.key === 'Enter' || e.key === ' '");
      expect(source).toContain("e.key === '+' || e.key === '='");
      expect(source).toContain("e.key === '-' || e.key === '_'");
      expect(source).toContain("'aria-roledescription': 'interactive specimen canvas'");
      expect(source).toContain("'aria-keyshortcuts': 'ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Home End Enter Space 0 R V X M P F 1 2 3 4 5 6 7'");
      expect(source).toContain("className: \"diss-shortcuts\"");
      expect(source).toContain("'Ctrl + wheel', 'Zoom around the pointer'");
      expect(source).toContain('var macroLikelyOnLeft = inspectionLens && macroInset');
      expect(source).toContain('var compassBottomInset = guidedMode && currentGuided ? 72 : 14');
      expect(source).toContain('var lensNearCompass = inspectionLens');
      expect(source).not.toContain("var z = Math.max(0.5, (d.canvasZoom || 1) - 0.25)");
      expect(source).not.toContain("var z = Math.min(3, (d.canvasZoom || 1) + 0.25)");
    }

    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        _dissLoadedSpec: 'frog',
      },
    });
    expect(html).toContain('role="application"');
    expect(html).toContain('aria-roledescription="interactive specimen canvas"');
    expect(html).toContain('Keyboard and precision controls');
    expect(html).toContain('Browse visible structures');
    expect(html).toContain('Zoom around the pointer');
    expect(html).toContain('Center and reset to 100%');
  });

  it('models persistent tissue dynamics and connected procedural consequences', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('Persistent tissue dynamics turn isolated tool actions into connected, reversible consequences.');
      expect(source).toContain('function tissueVariantDefinition()');
      expect(source).toContain('function defaultTissueState()');
      expect(source).toContain('function normalizeTissueState(state)');
      expect(source).toContain('function evolveTissueState(action, patch, baseState)');
      expect(source).toContain('function tissuePreservationScore(state)');
      expect(source).toContain('function tissueStatusData(state)');
      expect(source).toContain('tissueState: defaultTissueState()');
      expect(source).toContain("action === 'mistake'");
      expect(source).toContain('tissueBefore: tissueBefore');
      expect(source).toContain('tissueAfter: next.tissueState');
      expect(source).toContain('if (lastActionEntry && lastActionEntry.tissueBefore)');
      expect(source).toContain('procedureMeanPressure(payload.samples)');
      expect(source).toContain('Controlled saline dose applied to the specimen surface.');
      expect(source).toContain('Tissue-state visualization makes accumulated moisture, clarity, tension, and trauma visible on the specimen.');
      expect(source).toContain('liveTissueState.moisture / 100');
      expect(source).toContain('Dynamic tissue state');
      expect(source).toContain('Tissue preservation: ');
      expect(source).toContain('Tissue consequence history: ');
      expect(source).toContain('tissuePreservation: currentTissueStatus.preservation');
      expect(source).toContain('preservationDelta');
      expect(source).toContain('ctx.setTransform(canvas._dpr || 1, 0, 0, canvas._dpr || 1, 0, 0);');
      expect(source).toContain('lensCtx.setTransform(1, 0, 0, 1, 0, 0);');
      expect(source).not.toContain('lensctx.');
    }

    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        _dissLoadedSpec: 'frog',
        variationSeed: 4,
        specimenCondition: 'dehydrated',
      },
    });
    expect(html).toContain('Dynamic tissue state');
    expect(html).toContain('aria-label="Dynamic tissue state"');
    expect(html).toContain('Moisture');
    expect(html).toContain('Clarity');
    expect(html).toContain('Exposure');
    expect(html).toContain('Stability');
    expect(html).toContain('Tension');
    expect(html).toContain('Trauma');
    expect(html).toContain('Apply one controlled saline drop');
  });

  it('calibrates every procedural instrument with live readiness and tissue consequences', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function normalizeToolCalibration(value)');
      expect(source).toContain('function calibrationControlDefinition(toolId)');
      expect(source).toContain('function toolCalibrationScore(toolId, calibration)');
      expect(source).toContain('function instrumentCalibrationAssessment(toolId, calibration)');
      expect(source).toContain('function calibratedActionPatch(toolId, patch)');
      expect(source).toContain('toolCalibration: toolCalibration');
      expect(source).toContain('calibrationScoresBefore:');
      expect(source).toContain('Instrument calibration score:');
      expect(source).toContain('Restore specimen moisture with a controlled saline dose.');
      expect(source).toContain('"aria-valuetext":');
      expect(source).toContain("scalpel: { degrees: toolCalibration.bladeAngle, min: 20, max: 35");
      expect(source).toContain('var jawBase = 0.07 + toolCalibration.scissorsAperture / 100 * 0.38');
      expect(source).toContain('var forcepsClose = toolCalibration.forcepsGrip / 100 * 6.2');
      expect(source).toContain("pin: { degrees: toolCalibration.pinAngle, min: 55, max: 75");
      expect(source).toContain('2.5 + toolCalibration.probePressure / 100 * 2.1');
      expect(source).toContain('11 + toolCalibration.salineDose * 2');
      expect(source).toContain("responseTool + ' | ' + contactCalibration.label.toLowerCase()");
      expect(source).toContain('Move the dropper over the specimen surface before applying saline.');
    }

    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        activeInstrument: 'scalpel',
        toolCalibration: { bladeAngle: 30 },
        _dissLoadedSpec: 'frog',
      },
    });
    expect(html).toContain('Instrument calibration');
    expect(html).toContain('Blade angle');
    expect(html).toContain('30°');
    expect(html).toContain('Calibrated 100%');
    expect(html).toContain('20–35° protects deeper structures.');
  });

  it('derives one responsive observation field for visuals, coaching, evidence, and accessibility', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('One observation-field model keeps visual aperture, clarity, coaching, evidence, and reporting consistent.');
      expect(source).toContain('function observationFieldData(state)');
      expect(source).toContain('var liveObservationField = observationFieldData(liveProcedureState)');
      expect(source).toContain('var fieldWidthFactor = 0.76 + liveObservationField.aperture');
      expect(source).toContain('var fieldDetailCount = 3 + Math.round(liveObservationField.quality / 14)');
      expect(source).toContain('var stressMarkCount = Math.min(7');
      expect(source).toContain('var bedFiberCount = 3 + Math.round(liveObservationField.quality / 16)');
      expect(source).toContain('var visibleSalineDrops = Math.max(1, Math.min(4');
      expect(source).toContain("'POOLING \u00B7 REDUCE DOSE'");
      expect(source).toContain('observationQuality: currentObservationField.quality');
      expect(source).toContain('observationQuality: observationField.quality');
      expect(source).toContain('observationDelta: current.observationQuality');
      expect(source).toContain("label: 'Observation', previous:");
      expect(source).toContain("report += 'Observation field: '");
      expect(source).toContain('"aria-label": "Observation field quality "');
    }

    const html = renderTool('dissection', {
      dissection: {
        specimen: 'worm',
        activeLayer: 'skin',
        _dissLoadedSpec: 'worm',
        procedureByLayer: {
          skin: {
            inspected: true,
            incisionStarted: true,
            incisionExtended: true,
            retracted: true,
            pins: [{ x: 0.5, y: 0.2 }, { x: 0.5, y: 0.8 }],
            tissueState: { clarity: 88, exposure: 72, stability: 76, risk: 12, moisture: 82, tension: 55, trauma: 8 },
          },
        },
      },
    });
    expect(html).toContain('Observation field');
    expect(html).toContain('Observation quality');
    expect(html).toContain('Limiting factor:');
    expect(html).toContain('Aperture 72%');
    expect(html).toContain('Clarity 88%');
    expect(html).toContain('Stability 76%');
    expect(html).toContain('aria-label="Observation field quality');
  });

  it('models depth-aware optical inspection with visible focus and magnification tradeoffs', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function structureOpticalDepth(organ)');
      expect(source).toContain('function opticalInspectionData(target, focusDepth, magnification, pinned, procedureState)');
      expect(source).toContain('var liveOpticalInspection = opticalInspectionData');
      expect(source).toContain("ctx.filter = inspectionFocusBlur > 0 ? 'blur('");
      expect(source).toContain('function drawOpticalDepthCues(');
      expect(source).toContain("depth === 'surface'");
      expect(source).toContain("depth === 'structure'");
      expect(source).toContain('inspectionQualityColor');
      expect(source).toContain('liveOpticalInspection.quality / 100');
      expect(source).toContain('opticalInspection: Object.assign({}, currentOpticalInspection)');
      expect(source).toContain("referenceEvidence.opticalQuality != null ? ' · optics '");
      expect(source).toContain("evidence.opticalQuality != null ? ' · optics '");
      expect(source).toContain("report += 'Optical inspection: '");
      expect(source).toContain("'Optical inspection \\u00B7 ' + currentOpticalInspection.label");
      expect(source).toContain('"aria-label": "Inspection focus depth"');
    }

    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        selectedOrgan: 'dorsal_skin',
        inspectionLens: true,
        lensPinned: true,
        lensPinnedOrganId: 'dorsal_skin',
        lensFocusDepth: 'surface',
        lensMagnification: 2,
        _dissLoadedSpec: 'frog',
        procedureByLayer: {
          skin: {
            inspected: true,
            tissueState: { clarity: 92, exposure: 76, stability: 82, risk: 8, moisture: 84, tension: 45, trauma: 4 },
          },
        },
      },
    });
    expect(html).toContain('Optical inspection');
    expect(html).toContain('Dorsal Skin');
    expect(html).toContain('pigment and mucous texture');
    expect(html).toContain('Ideal focus: surface');
    expect(html).toContain('Resolved');
    expect(html).toContain('aria-label="Inspection focus depth"');
    expect(html).toContain('aria-pressed="true">surface');
    expect(html).toContain('aria-pressed="true">2x');
  });

  it('provides persistent WCAG preferences, robust focus, composite keyboard navigation, and drag alternatives', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('outline: 3px solid #111827');
      expect(source).toContain('box-shadow: 0 0 0 6px #facc15');
      expect(source).toContain('@media (forced-colors: active)');
      expect(source).toContain(':where(button, input, textarea, summary, [tabindex]) { scroll-margin-block: 5rem; }');
      expect(source).toContain('function onCompositeToolbarKeyDown(e)');
      expect(source).toContain('"aria-orientation": "horizontal", onKeyDown: onCompositeToolbarKeyDown');
      expect(source).toContain('function panCanvasByControl(e, horizontalStep, verticalStep, label)');
      expect(source).toContain('"aria-label": "Move the zoomed specimen without dragging"');
      expect(source).toContain("localStorage.getItem('dissection_accessibility_preferences')");
      expect(source).toContain("localStorage.setItem('dissection_accessibility_preferences'");
      expect(source).toContain('"data-reduced-motion": reducedMotionEnabled ? "true" : "false"');
      expect(source).toContain('"data-text-size": largeTextEnabled ? "large" : "default"');
      expect(source).toContain('Every canvas selection and drag action has a keyboard or button alternative.');
      expect(source).toContain("['Shift + Arrows', 'Pan the zoomed specimen without dragging']");
      expect(source).not.toContain("labelMode: 'show', highContrast: false");
    }

    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'organs',
        _dissLoadedSpec: 'frog',
        toolbarViewOpen: true,
        highContrast: true,
        reducedMotion: true,
        largeText: true,
        canvasZoom: 2,
      },
    });

    expect(html).toContain('data-high-contrast="true"');
    expect(html).toContain('data-reduced-motion="true"');
    expect(html).toContain('data-text-size="large"');
    expect(html).toContain('href="#diss-canvas"');
    expect(html).toContain('href="#diss-structure-directory"');
    expect(html).toContain('id="diss-canvas"');
    expect(html).toContain('id="diss-structure-directory"');
    expect(html).toContain('aria-describedby="diss-canvas-status diss-canvas-equivalent"');
    expect(html).toContain('Move the zoomed specimen without dragging');
    expect(html).toContain('aria-label="Move specimen up"');
    expect(html).toContain('aria-label="Move specimen left"');
    expect(html).toContain('aria-label="Move specimen right"');
    expect(html).toContain('aria-label="Move specimen down"');
    expect(html).toContain('Reduced motion on');
    expect(html).toContain('Larger text on');
  });

  it('protects destructive reset and announces filtered structure results with focus recovery', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function requestSpecimenReset()');
      expect(source).toContain('function cancelSpecimenReset()');
      expect(source).toContain('function confirmSpecimenReset()');
      expect(source).toContain("focusResetControl('diss-reset-confirm')");
      expect(source).toContain("if (d.resetConfirmPending) cancelSpecimenReset()");
      expect(source).toContain('"aria-controls": "diss-directory-results"');
      expect(source).toContain('"aria-describedby": "diss-directory-count"');
      expect(source).toContain('"aria-atomic": "true"');
      expect(source).toContain('filteredOrgans.length');
      expect(source).toContain('Accessibility preferences were preserved.');
    }

    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'organs',
        _dissLoadedSpec: 'frog',
        toolbarToolsOpen: true,
        resetConfirmPending: true,
        organSearch: 'kidney',
      },
    });

    expect(html).toContain('id="diss-reset-confirmation"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('Confirm reset');
    expect(html).toContain('Cancel');
    expect(html).toContain('Accessibility preferences are preserved');
    expect(html).toContain('aria-controls="diss-directory-results"');
    expect(html).toContain('aria-describedby="diss-directory-count"');
    expect(html).toContain('2 matching structures in Organs');
    expect(html).toContain('aria-atomic="true"');
  });

  it('implements the ARIA radio keyboard pattern for procedural instruments', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function selectProcedureInstrument(toolId, inputMethod)');
      expect(source).toContain('function onInstrumentKeyDown(e, toolId)');
      expect(source).toContain("var navigationKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']");
      expect(source).toContain("id: 'diss-instrument-' + tool.id");
      expect(source).toContain('tabIndex: activeInstrument === tool.id ? 0 : -1');
      expect(source).toContain("selectProcedureInstrument(keyboardTool.id, 'keyboard shortcut ' + e.key)");
      expect(source).toContain("announceToSR(tool.label + ' selected.");
    }

    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'organs',
        _dissLoadedSpec: 'frog',
        activeInstrument: 'scalpel',
      },
    });

    expect(html).toContain('role="radiogroup" aria-label="Dissection instruments"');
    expect(html).toContain('id="diss-instrument-scalpel"');
    expect(html).toContain('id="diss-instrument-scalpel" class="diss-instrument" aria-checked="true" tabindex="0"');
    expect(html).toContain('id="diss-instrument-probe" class="diss-instrument" aria-checked="false" tabindex="-1"');
  });

  it('adds an explicit specimen-specific living-function model with responsive playback', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function specimenLivingFunctionProfile()');
      expect(source).toContain("title: 'Buccal-pump ventilation', motion: 'frog-buccal'");
      expect(source).toContain("title: 'Peristaltic locomotion', motion: 'worm-peristalsis'");
      expect(source).toContain("title: 'Opercular ventilation', motion: 'fish-operculum'");
      expect(source).toContain("title: 'Gill-bailer ventilation', motion: 'crayfish-gills'");
      expect(source).toContain("title: 'Diaphragmatic ventilation', motion: 'pig-diaphragm'");
      expect(source).toContain("title: 'Pupillary light reflex', motion: 'eye-pupil'");
      expect(source).toContain("title: 'Coordinated cardiac cycle', motion: 'heart-cycle'");
      expect(source).toContain('The living-function model is opt-in and explicitly distinct from preserved specimen behavior.');
      expect(source).toContain('var livingPhase = dissMotionReduced ? 0.5');
      expect(source).toContain('livingFunctionReplayToken');
      expect(source).toContain('LIVING FUNCTION MODEL');
      expect(source).toContain('In-life physiology');
      expect(source).toContain('not preserved motion');
      expect(source).toContain('livingFunction: livingFunctionEnabled ?');
      expect(source).toContain("report += 'Living function model: '");
      expect(source).toContain('"aria-label": "Specimen-specific living function model"');
    }

    const html = renderTool('dissection', {
      dissection: {
        specimen: 'earthworm',
        activeLayer: 'organs',
        _dissLoadedSpec: 'earthworm',
        livingFunctionEnabled: true,
        livingFunctionPaused: false,
        livingFunctionSpeed: 'slow',
      },
    });

    expect(html).toContain('Peristaltic locomotion');
    expect(html).toContain('Circular and longitudinal muscles contract in alternating waves');
    expect(html).toContain('Playing · slow');
    expect(html).toContain('Function model on');
    expect(html).toContain('Pause');
    expect(html).toContain('Replay');
    expect(html).toContain('Speed: slow');
  });

  it('drives flap physics from tissue state and smoothly frames selected anatomy', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function tissuePhysicsData(state)');
      expect(source).toContain('compliance: compliance, damping: damping, sag: sag, recoil: recoil');
      expect(source).toContain('var flapPhysics = tissuePhysicsData(flapTissue)');
      expect(source).toContain('var settleAmplitude = (100 - flapPhysics.damping) / 100 * 0.0032');
      expect(source).toContain('var dynamicCompliance = 0.62 + flapPhysics.compliance / 100 * 0.58');
      expect(source).toContain('var flapSag = flapPhysics.sag / 100 * 0.032');
      expect(source).toContain('flapPoint.y += flapSag * outerWeight + flutter');
      expect(source).toContain('if (flapTissue.moisture > 55)');
      expect(source).toContain('var currentTissuePhysics = tissuePhysicsData(currentTissueState)');
      expect(source).toContain("label: 'Compliance'");
      expect(source).toContain("label: 'Motion damping'");
      expect(source).toContain('function animateCanvasCamera(canvas, nextZoom, nextPanX, nextPanY, message)');
      expect(source).toContain('function frameSelectedStructure(e)');
      expect(source).toContain('var cameraEase = cameraLinear < 0.5');
      expect(source).toContain('canvas._interactionZoom = zoom');
      expect(source).toContain('Number(canvas._interactionZoom) || d.canvasZoom || 1');
      expect(source).toContain('canvas._cameraTransition = null;');
      expect(source).toContain('"aria-label": "Frame selected structure " + sel.name');
      expect(source).toContain("Camera framed on ' + sel.name");
      expect(source).toContain('Camera returned to the full specimen at 100 percent zoom.');
    }

    const html = renderTool('dissection', {
      dissection: {
        specimen: 'sheepEye',
        activeLayer: 'skin',
        _dissLoadedSpec: 'sheepEye',
        selectedOrgan: 'sclera',
        inspectionLens: true,
        procedureByLayer: {
          skin: {
            inspected: true,
            surfaceCleared: true,
            dropperPoint: { x: 0.62, y: 0.31 },
            tissueState: {
              moisture: 74,
              tension: 68,
              exposure: 48,
              trauma: 12,
              clarity: 82,
              stability: 76,
              risk: 18,
              salineDrops: 2,
              lastAction: 'dropper',
              lastUpdatedAt: Date.now(),
            },
          },
        },
      },
    });
    expect(html).toContain('Depth atlas on');
    expect(html).toContain('Tissue relief on');
    expect(html).toContain('Tissue relief on and responsive to the inspection light');
    expect(html).toContain('Optical plane visual key:');
    expect(html).toContain('Hydration model: corneal film, 2 saline drops applied');
    expect(html).toContain('Focus plane');
    expect(html).toContain('Resolved');
    expect(html).toContain('Soft');
    expect(html).toContain('Unresolved');
    expect(html).toContain('Anatomical depth visual key:');
    expect(html).toContain('Surface');
    expect(html).toContain('Mid-depth');
    expect(html).toContain('Deep');
    expect(html).toContain('Frame Sclera');
    expect(html).toContain('Frame selected structure Sclera');
    expect(html).toContain('Compliance');
    expect(html).toContain('Motion damping');
  });

  it('keeps instrument readiness labels readable at WCAG AA contrast', () => {
    function channel(value) {
      value /= 255;
      return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    }
    function luminance(hex) {
      return [1, 3, 5].map(function (index) {
        return channel(parseInt(hex.slice(index, index + 2), 16));
      }).reduce(function (sum, value, index) {
        return sum + value * [0.2126, 0.7152, 0.0722][index];
      }, 0);
    }
    function contrast(foreground, background) {
      var foregroundLum = luminance(foreground);
      var backgroundLum = luminance(background);
      return (Math.max(foregroundLum, backgroundLum) + 0.05) /
        (Math.min(foregroundLum, backgroundLum) + 0.05);
    }

    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('.diss-instrument__state { font-size: .65rem;');
      expect(source).toContain('letter-spacing: .035em; opacity: 1;');
      expect(source).not.toContain('.diss-instrument__state { font-size: .54rem;');
    }

    expect(contrast('#315b58', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#047857', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#2563eb', '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('has no axe-detectable WCAG A or AA violations in the rendered lab', async () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'organs',
        _dissLoadedSpec: 'frog',
        activeInstrument: 'scalpel',
        selectedOrgan: 'heart',
        highContrast: false,
        largeText: false,
        procedureByLayer: {
          organs: {
            inspected: true,
            surfaceCleared: true,
            incisionStarted: true,
            incisionCompleted: true,
            incisions: [{ x: 0.42, y: 0.31 }, { x: 0.58, y: 0.68 }],
          },
        },
      },
    });
    document.body.innerHTML = html;
    const root = document.querySelector('[data-dissection-root]');
    expect(root).not.toBeNull();

    const results = await axe.run(root, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
      },
      rules: {
        // jsdom cannot calculate layout or computed color contrast reliably.
        // Explicit palette contrast checks above cover the changed readiness labels.
        'color-contrast': { enabled: false },
      },
    });

    expect(results.violations.map(function (violation) {
      return {
        id: violation.id,
        impact: violation.impact,
        targets: violation.nodes.map(function (node) { return node.target; }),
      };
    })).toEqual([]);
  }, 15000);


  it('adds an absorbent-wick recovery loop for excess saline', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain("id: 'wick', label: 'Absorbent Wick'");
      expect(source).toContain("if (action === 'wick')");
      expect(source).toContain("wickPoint: wickPoint, fieldWicked: true");
      expect(source).toContain("WICK PREVIEW: POOL EDGE");
      expect(source).toContain("WICKED · BALANCED FILM");
      expect(source).toContain("replayEntry.action === 'wick'");
      expect(source).toContain("/^[1-7]$/.test(e.key)");
      expect(source).toContain("activeInstrument === 'wick'");
      expect(source).toContain("Wick excess saline from the visible pool edge");
      expect(source).toContain("absorbent wicking: ");
    }

    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'organs',
        _dissLoadedSpec: 'frog',
        activeInstrument: 'wick',
        procedureByLayer: {
          organs: {
            inspected: true,
            surfaceCleared: true,
            dropperPoint: { x: 0.5, y: 0.48 },
            tissueState: {
              moisture: 94,
              tension: 36,
              exposure: 62,
              trauma: 8,
              clarity: 70,
              stability: 72,
              risk: 31,
              salineDrops: 4,
              lastAction: 'dropper',
              lastUpdatedAt: Date.now(),
            },
          },
        },
      },
    });

    expect(html).toContain('id="diss-instrument-wick"');
    expect(html).toContain('Absorbent Wick');
    expect(html).toContain('Pool detected');
    expect(html).toContain('Wick excess saline');
    expect(html).toContain('1-7');
    expect(html).toContain('aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Home End Enter Space 0 R V X M P F 1 2 3 4 5 6 7"');
  });


  it('models adjustable specimen-aware illumination and glare', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function illuminationAssessmentData(procedureState, intensity)');
      expect(source).toContain("var reflectivity = { eye: 0.95, fish: 0.82");
      expect(source).toContain('illumination.score * 0.12');
      expect(source).toContain('var liveLightIntensity = Math.max(20, Math.min(100');
      expect(source).toContain('liveIllumination.glareRisk >= 25');
      expect(source).toContain('className: "diss-light-intensity"');
      expect(source).toContain('id: "diss-light-intensity-range"');
      expect(source).toContain('lightIntensity: lightIntensity');
      expect(source).toContain('lightIntensity: Math.max(20, Math.min(100');
      expect(source).toContain('illumination: Object.assign({}, currentIllumination)');
      expect(source).toContain("glare risk ' + currentIllumination.glareRisk");
    }

    const html = renderTool('dissection', {
      dissection: {
        specimen: 'sheepEye',
        activeLayer: 'skin',
        _dissLoadedSpec: 'sheepEye',
        selectedOrgan: 'sclera',
        inspectionLens: true,
        lensPinned: true,
        lensPinnedOrganId: 'sclera',
        lensFocusDepth: 'surface',
        lensMagnification: 2,
        lightIntensity: 96,
        toolbarViewOpen: true,
        procedureByLayer: {
          skin: {
            inspected: true,
            tissueState: {
              moisture: 95,
              tension: 32,
              exposure: 54,
              trauma: 4,
              clarity: 78,
              stability: 74,
              risk: 12,
              salineDrops: 1,
              lastAction: 'dropper',
              lastUpdatedAt: Date.now(),
            },
          },
        },
      },
    });

    expect(html).toContain('Illumination intensity');
    expect(html).toContain('Glare limited');
    expect(html).toContain('id="diss-light-intensity-range"');
    expect(html).toContain('value="96"');
    expect(html).toContain('glare risk');
    expect(html).toContain('Illumination: Glare limited at 96%');
  });

});
