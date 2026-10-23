import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import axe from 'axe-core';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { indexOfOrThrow, sliceBetween } from './helpers/anchored_slice.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const DISSECTION_PATHS = [
  'stem_lab/stem_tool_dissection.js',
  'desktop/web-app/public/stem_lab/stem_tool_dissection.js',
];

const STEM_SHARED_PATHS = [
  'stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab_module.js',
];

// Exercise the current shared anatomy helpers without coupling these legacy
// contracts to former inline comments or an optional tracing parameter list.
const contractFunctionBodies = new Map();
function contractFunction(source, name, bindings = {}) {
  const key = name + '|' + source.length;
  if (!contractFunctionBodies.has(key)) {
    const matches = [...source.matchAll(new RegExp('^([ \\t]*)(?:var ' + name + ' = )?function ' + name + '\\(', 'gm'))];
    if (matches.length !== 1) throw Error('Expected one anatomy helper: ' + name);
    const m = matches[0], start = source.indexOf('function ' + name + '(', m.index), ending = new RegExp('^' + m[1] + '}[; \\t]*\\r?$', 'gm');
    ending.lastIndex = start; const end = ending.exec(source);
    if (!end) throw Error('Missing anatomy helper ending: ' + name);
    contractFunctionBodies.set(key, source.slice(start, end.index + m[1].length + 1));
  }
  return new Function(...Object.keys(bindings), 'return (' + contractFunctionBodies.get(key) + ');')(...Object.values(bindings));
}
function contractSpecimens(source) {
  const start = source.indexOf('var SPECIMENS = {'), end = source.indexOf('\n          };', start);
  if (start < 0 || end < start) throw Error('Missing specimen reference data');
  return new Function(source.slice(start, end + 14) + ';return SPECIMENS;')();
}

describe('dissection improvement contracts', { timeout: 60000 }, () => {
  it('keeps the desktop runtime mirror byte-identical to the source tool', () => {
    const source = readFileSync(DISSECTION_PATHS[0]);
    const desktopMirror = readFileSync(DISSECTION_PATHS[1]);
    expect(desktopMirror.equals(source)).toBe(true);
  });

  it('provides one stable object identity per mounted plugin bridge', () => {
    const canonicalBridge = readFileSync(STEM_SHARED_PATHS[0]);
    for (const filePath of STEM_SHARED_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(readFileSync(filePath).equals(canonicalBridge)).toBe(true);
      expect(source).toContain('var pluginInstanceTokenRef = React.useRef(null);');
      expect(source).toContain('pluginInstanceTokenRef.current = {};');
      expect(source).toContain('var pluginCtx = Object.assign({}, props._ctx, { pluginInstanceToken: pluginInstanceTokenRef.current });');
      expect(source).toContain('window.StemLab.renderTool(props._toolId, pluginCtx);');
      expect(source).not.toContain('__stemPluginInstanceCounter');
    }
  });

  it('keeps progress specimen-specific and persists learner evidence', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain("var activeDissectionSaveKey = 'dissection_progress_' + specimen");
      expect(source).toContain('scheduleDissectionSave(activeDissectionSaveKey');
      expect(source).toContain('var _disSaveQueue = Object.create(null);');
      expect(source).toContain('var _disSaveAccess = Object.create(null);');
      expect(source).toContain('var _disSaveStatusByKey = Object.create(null);');
      expect(source).toContain('function dissectionSaveOwnerFor(identity)');
      expect(source).toContain('function dissectionSaveSlot(key, owner)');
      expect(source).toContain('var dissectionSaveOwner = dissectionSaveOwnerFor(ctx.pluginInstanceToken || setLabToolData);');
      expect(source).toContain('"data-dissection-save-key": activeDissectionSaveKey');
      expect(source).toContain('"data-dissection-save-owner": dissectionSaveOwner');
      expect(source).toContain('function releaseDissectionSaveOwner(owner)');
      expect(source).toContain('releaseDissectionSaveOwner(dissectionSaveOwner)');
      expect(source).toContain('detachedRoot._alloDissectionRefreshSaveAccess = null;');
      expect(source).toContain('function scopedDissectionQuery(root, selector)');
      expect(source).toContain("? '[id=\"' + String(selector).slice(1) + '\"]'");
      expect(source).toContain("scopedDissectionQuery(focusRoot, '#' + targetId)");
      expect(source).toContain("scopedDissectionQuery(focusRoot, '#diss-organ-' + organId)");
      expect(source).toContain("scopedDissectionQuery(specimenRoot, '#diss-specimen-tab-' + nextKey)");
      expect(source).not.toContain('_disSaveQueue[key]');
      expect(source).not.toContain('_disSaveAccess[key]');
      expect(source).toContain('function inspectDissectionStoredValue(key)');
      expect(source).toContain('writeInspection.raw !== saveAccess.baselineRaw');
      expect(source).toContain("kind: 'concurrent-change'");
      expect(source).toContain('window.__alloDissectionSaveStorageHandler');
      expect(source).toContain('function retryProtectedDissectionSave()');
      expect(source).toContain("loadIsProtectedRetry && loadInspection.kind === 'empty'");
      expect(source).toContain('currentDissectionSaveStatus(activeDissectionSaveKey, dissectionSaveOwner)');
      expect(source).toContain('function formatAccessibleDuration(seconds)');
      expect(source).toContain("currentDissectionSaveAccess(key, saveOwner).state !== 'writable'");
      expect(source).toContain('function prepareDissectionSaveAccess(key, specimenName, owner)');
      expect(source).toContain('var previous = _disSaveQueue[saveSlot];');
      expect(source).toContain('function flushDissectionSave(key, requireComplete, owner)');
      expect(source).toContain("var departureSaveKey = 'dissection_progress_' + specimen;");
      expect(source).toContain('var departureHadPendingSave = !!_disSaveQueue[dissectionSaveSlot(departureSaveKey, dissectionSaveOwner)];');
      expect(source).toContain('if (departureHadPendingSave && !departureSaved)');
      expect(source).toContain("if ((saveResult && saveResult.complete) || currentDissectionSaveAccess(key, saveOwner).state !== 'writable') delete _disSaveQueue[saveSlot];");
      expect(source).toContain('function cancelDissectionSave(key, owner)');
      expect(source).toContain('cancelDissectionSave(resetSaveKey, dissectionSaveOwner);');
      expect(source).not.toContain('var _disSaveTimer = null;');
      expect(source).toContain('revealedLayers: d.revealedLayers || {}');
      expect(source).toContain('organNotes: d.organNotes || {}');
      expect(source).toContain('organConfidence: d.organConfidence || {}');
      expect(source).toContain('annotations: d.annotations || []');
      expect(source).toContain('dissInquiry: normalizeDissectionInquiry(d.dissInquiry)');
      expect(source).toContain('dissInquiry: normalizeDissectionInquiry(data.dissInquiry)');
      expect(source).toContain('dissInquiry: defaultDissectionInquiry()');
      expect(source).toContain('quizFirstAttemptScore: Number(d.quizFirstAttemptScore) || 0');
      expect(source).toContain('quizFirstAttemptTotal: Number(d.quizFirstAttemptTotal) || 0');
      expect(source).toContain('quizSupportedCount: Number(d.quizSupportedCount) || 0');
      expect(source).toContain('assessmentRecordedScore: Number(d.assessmentRecordedScore) || 0');
      expect(source).toContain('assessmentRecordedTotal: Number(d.assessmentRecordedTotal) || 0');
      expect(source).toContain('assessmentRecordedScore: data.assessmentRecordedScore == null ? (Number(data.quizFirstAttemptScore) || 0)');
      expect(source).toContain('assessmentRecordedTotal: data.assessmentRecordedTotal == null ? (Number(data.quizFirstAttemptTotal) || 0)');
      expect(source).toContain('assessmentEvidence: d.assessmentEvidence || {}');
      expect(source).toContain('var understandingGoal = targetCount;');
      expect(source).toContain('var unresolvedTargetIds = targetIds.filter');
      expect(source).toContain('var ambiguousTargetIds = targetIds.filter');
      expect(source).toContain('var targetCount = Math.max(1, targetIds.length);');
      expect(source).toContain('var objectiveComplete = mappingComplete && observedCount === targetCount && recordedCount === targetCount && understoodCount === targetCount;');
      expect(source).toContain('if (!objectiveComplete) objectivePct = Math.min(99, objectivePct);');
      expect(source).not.toContain('requiresEveryVerification');
      expect(source).toContain('quizReviewQueue: Array.isArray(d.quizReviewQueue) ? d.quizReviewQueue : []');
      expect(source).toContain('var encounteredQuizPool = specimenQuizPool.filter');
      expect(source).toContain('var quizSessionLimit = Math.min(5, orderedQuizPool.length);');
      expect(source).toContain('dissStableOrder(specimenQuizPool.filter');
      expect(source).toContain('var remainingReviewIds = d.quizReviewMode ? quizReviewIds.filter');
      expect(source).toContain('var validSpecimenOrganIds = Object.create(null);');
      expect(source).toContain('&& objectivesDemonstrated;');
      expect(source).toContain('Object.prototype.hasOwnProperty.call(validSpecimenOrganIds');
      expect(source).toContain('if (!masteryComplete) masteryOverallPct = Math.min(99, masteryOverallPct);');
      expect(source).toContain('function unsafeSavedProcedureField(record, prefix)');
      expect(source).toContain("var quizKind = requestedQuizKind === 'location' && hotspotQuizAvailable && sameRegionCandidates.length === 1 ? 'location' : 'function';");
      expect(source).toContain("var quizSalt = specimen + '|assessment|' + (d.quizSeed || 'default');");
      expect(source).toContain("if (d.quizMode) {\n              setProcedureFeedback('Layer navigation is locked during an assessment so the current question stays stable.'");
      expect(source).toContain('localStorage.removeItem(resetSaveKey)');
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
      expect(source).toContain('var practicalEndsAt = Date.now() + 120000;');
      expect(source).toContain('Math.ceil((practicalDeadline - Date.now()) / 1000)');
      expect(source).toContain('var finalScore = Number(latest.quizScore) || 0;');
      expect(source).toContain("'Time up! No responses recorded.'");
      expect(source).not.toContain('var remaining = 120;');
      expect(source).toContain('window.print();');
      expect(source).toContain('function scheduleDissectionCanvasTimer(canvas, name, callback, delay)');
      expect(source).toContain('function clearAllDissectionCanvasTimers(canvas)');
      expect(source).toContain('function cancelDissectionLayerTimers(canvas)');
      expect(source).toContain('cancelDissectionLayerTimers(peelCanvas);');
      expect(source).toContain("scheduleDissectionCanvasTimer(replayCanvas, 'procedureReplay'");
      expect(source).toContain("scheduleDissectionCanvasTimer(compareCanvas, 'compareReplay'");
      expect(source).toContain("scheduleDissectionCanvasTimer(demoCanvas, 'procedureDemo'");
      expect(source).toContain("scheduleDissectionCanvasTimer(viewTransitionCanvas, 'viewTransition'");
      expect(source).toContain("scheduleDissectionCanvasTimer(layerBrowseCanvas, 'layerBrowseTransition'");
      expect(source).not.toContain('__alloDissectionDemoTimer');
      expect(source).not.toContain('__alloDissectionReplayTimer');
      expect(source).not.toContain('__alloDissectionCompareReplayTimer');
      expect(source).toContain('_incisionAnim: null, _layerTransition: null');
      expect(source).toContain("quizExplanation: d.practicalMode ? null : dissectionStructureCue(quizQ, 'explanation')");
      expect(source).not.toContain('d.practicalMode && !correct ? null');
      expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
      expect(source).toContain('Comparison paths shown at the final frame because reduced motion is active.');
      expect(source).toContain('function copyDissectionText(text, successMessage, failureMessage)');
      expect(source).toContain("copyDissectionText(report, 'Lab report copied to the clipboard.'");
      expect(source).toContain('copyDissectionText(cert, masteryComplete ?');
      expect(source).not.toContain('if (navigator.clipboard) navigator.clipboard.writeText');
      expect(source).not.toContain("upd('printMode'");
      expect(source).not.toContain('Switch anatomical view: dorsal or ventral');
      expect(source).toContain('.diss-selection-nav button { min-width: 2.75rem !important; min-height: 2.75rem !important; }');
      expect(source).toContain('id: "diss-organ-search"');
    }
  });

  it('labels comparative science and captures evidence in reports', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('data-dissection-evidence');
      expect(source).toContain('Comparative learning model: specimen observations and human clinical connections are labeled separately.');
      expect(source).toContain("report += '  Evidence note: '");
      expect(source).toContain("report += '  Confidence self-rating: '");
      expect(source).toContain('dissectionConfidenceLabel(confidenceRating)');
      expect(source).toContain("Human/clinical connection");
      expect(source).toContain("species-specific");
    }
  });

  it('keeps comparative anatomy species-specific in source and every runtime catalog', () => {
    const expectedDescriptions = {
      pig_desc: 'Mammalian specimen with a four-chambered heart and diaphragm. Major organ systems support comparison with humans, while anatomy, proportions, and development remain species-specific.',
      sheepEye_desc: 'Mammalian eye with cornea, lens, retina, and vitreous humor. Sheep-specific features include a tapetum lucidum and a horizontal retinal specialization rather than a human fovea.',
      sheepHeart_desc: 'Organ dissection — a four-chambered mammalian heart with a body plan useful for comparison to humans. Vessel branching, size, rate, and pressure remain species-specific.',
    };
    const retiredClaims = [
      'Fetal pig anatomy is 95% identical to human fetal anatomy.',
      'organ systems nearly identical to human',
      'pig organs are closest to human in size and function',
      'Mammalian muscles nearly identical to human.',
      'closest lab animal to human',
      '4 chambers identical to human',
      'alveolar structure identical to human',
      'Functionally identical to human liver.',
      'Gray/white matter identical to human.',
      'Functionally identical to human heart.',
    ];

    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      for (const retiredClaim of retiredClaims) expect(source).not.toContain(retiredClaim);
      expect(source).toContain('immune, infectious, and physiological barriers remain');
      expect(source).toContain('atrial, venous, ventricular, and great-vessel anatomy differs');
      expect(source).toContain('a tracheal bronchus supplies the cranial lobe');
      expect(source).toContain(expectedDescriptions.sheepEye_desc);
    }

    // Byte parity first: once the two copies are identical, parsing the mirror a second time
    // can only confirm what the buffers already proved, and this catalog is ~6.9MB.
    const sourceCatalogBytes = readFileSync('ui_strings.js');
    const publicCatalogBytes = readFileSync('desktop/web-app/public/ui_strings.js');
    expect(publicCatalogBytes.equals(sourceCatalogBytes)).toBe(true);
    expect(JSON.parse(sourceCatalogBytes.toString('utf8')).stem.dissection).toMatchObject(expectedDescriptions);

    const languageFiles = readdirSync('lang').filter((file) => file.endsWith('.js')).sort();
    expect(languageFiles.length).toBeGreaterThan(0);
    for (const languageFile of languageFiles) {
      const sourceBytes = readFileSync('lang/' + languageFile);
      const publicBytes = readFileSync('desktop/web-app/public/lang/' + languageFile);
      // This pair was parsed twice and never compared, so a mirror could drift in any key the
      // assertion below does not read and still pass. Compare the bytes, then parse once.
      expect(publicBytes.equals(sourceBytes), languageFile + ' mirror').toBe(true);
      expect(JSON.parse(sourceBytes.toString('utf8')).stem.dissection, languageFile).toMatchObject(expectedDescriptions);
    }
    // Measured 2026-09-04 on an idle machine: this test reads ~1GB (63 language packs at a 7.3MB
    // median, each in two copies, plus the 6.9MB catalog) and needs ~110s of I/O. The old 60s
    // budget sat UNDER the test's own floor, so it failed whenever the machine was busy and the
    // failure read as flakiness. Narrowing the 63-pack sweep to a dedicated i18n test would be
    // the real fix; that is a coverage decision for the owner, not something a timeout can do.
  }, 240000);

  it('models a persistent, accessible procedural instrument workflow', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('var PROCEDURE_INSTRUMENTS = [');
      expect(source).toContain('var SPECIMEN_PROCEDURE_PROFILES = {');
      expect(source).toContain("title: 'Frog ventral midline access'");
      expect(source).toContain("title: 'Earthworm dorsal longitudinal access'");
      expect(source).toContain("title: 'Fetal pig ventral body-cavity access'");
      expect(source).toContain("title: 'Fish lateral abdominal-window access'");
      expect(source).toContain("title: 'Crayfish dorsal carapace-window access'");
      expect(source).toContain("title: 'Sheep eye equatorial access'");
      expect(source).toContain("title: 'Sheep heart chamber-window access'");
      expect(source).toContain('protocolProtected: protocolProtected');
      expect(source).toContain('Specimen-specific procedure protocol');
      expect(source).toContain('diss-protocol__align');
      expect(source).toContain('Align specimen to recommended ');
      expect(source).toContain('procedureProtocol: {');
      expect(source).toContain('var DISSECTION_SAVE_SCHEMA_VERSION = 21;');
      expect(source).toContain('schemaVersion: DISSECTION_SAVE_SCHEMA_VERSION');
      expect(source).toContain('procedureByLayer: d.procedureByLayer || {}');
      expect(source).toContain('function normalizeSavedProcedureByLayer(map, options)');
      expect(source).toContain('procedureByLayer: normalizeSavedProcedureByLayer(data.procedureByLayer || {}, {');
      expect(source).toContain('delete snapshot.tissueState.lastUpdatedAt;');
      expect(source).toContain('verifiedIdentifications: d.verifiedIdentifications || {}');
      expect(source).toContain("role: \"radiogroup\", \"aria-label\": __alloT('stem.dissection.a11y_dissection_instruments', 'Dissection instruments')");
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
      expect(source).toContain('Attempt replay follows saved action order and distinguishes saved paths from teaching illustrations; pressure and settings appear only when recorded');
      expect(source).toContain('function saveTechniqueAttempt()');
      expect(source).toContain('function startNewTechniqueAttempt()');
      expect(source).toContain('function techniqueComparisonData()');
      expect(source).toContain('function adaptiveCoachingData()');
      expect(source).toContain('function focusAdaptiveCoaching()');
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
      expect(source).toContain('function procedureScenarioStatus(procedureState, inspectedOrgans)');
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
      const relationshipBlock = sliceBetween(source, 'var CURATED_ANATOMY_RELATIONSHIPS', 'var VIEW_OCCLUSIONS', {
        file: filePath, label: 'curated anatomical relationships',
      });
      const structureIds = new Set(Array.from(source.matchAll(/\bid: '([^']+)'/g), (match) => match[1]));
      const relationshipTargets = Array.from(relationshipBlock.matchAll(/\b(?:from|to): '([^']+)'/g), (match) => match[1]);
      expect(relationshipTargets.length).toBeGreaterThan(80);
      for (const target of relationshipTargets) expect(structureIds.has(target)).toBe(true);
      expect(source).toContain('angleControl: Math.round(angleControl * 100)');
      expect(source).toContain("ctx.fillText('Layer map'");
      expect(source).toContain('anatomicalView: anatomicalView');
      expect(source).toContain('renderQuality: renderQuality');
      expect(source).toContain('Scenario assessment thresholds');
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
      expect(source).toContain('var responseTitleLines = wrapTextToWidth(materialResponseLabel, responseTextWidth, 2);');
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
      expect(source).toContain('function drawInstrumentTissueOcclusion(toolId, angle, contactContext, engaged, material, pitchData)');
      expect(source).toContain('A foreground tissue lip briefly covers the engaged tip so depth reads through occlusion as well as shadow and pitch.');
      expect(source).toContain('distanceToGuide(screenPointer, activeOpeningPath) <= 0.055');
      expect(source).toContain("var toolDepthFactor = { scalpel: 0.62, scissors: 0.52, forceps: 0.46, pin: 0.92, probe: 0.38, wick: 0.24 }");
      expect(source).toContain('Paired depth notches make partial insertion legible without relying on the lip color.');
      expect(source).toContain('drawInstrumentTissueOcclusion(cursorTool, cursorAngle, cursorContactContext, toolVisuallyEngaged, cursorMaterial, cursorPitch)');
      expect(source).toContain('Engaged instrument tips use foreground tissue lips and paired depth notches to show partial insertion and opening-edge occlusion');
      expect(source).toContain('instrument-tissue occlusion: foreground lip and paired depth notches encoded');

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
      expect(source).toContain('duration: replayMotionReduced ? 900 : 1400, replay: true, replayPath: path');
      expect(source).toContain('Replay advances along the real teaching path, with eased travel and no looping.');
      expect(source).toContain("var replayStage = contactPulseProgress < 0.28 ? '1 APPROACH'");
      expect(source).toContain("var keyboardProbeResult = performProcedureAction('probe', { organ: keyboardSelected })");
      expect(source).toContain("if (keyboardProbeResult && keyboardProbeResult.ok) queueProcedureInstrumentReplay('probe'");
      expect(source).toContain('Equivalent keyboard and button actions include an instrument approach, contact, and release replay');
      expect(source).toContain("'; equivalent action replay: ' + (instrumentVisuals ? 'on' : 'off')");
      expect(source).toContain('function cuttingTrajectorySafety(point, vector, canvasEl)');
      expect(source).toContain("var maxForward = Math.min(safetyWidth, safetyHeight)");
      expect(source).toContain('var lateralDistance = Math.abs');
      expect(source).toContain("trajectorySafety.critical ? 'STOP: PROTECT '");
      expect(source).toContain('The projected safety envelope shows direction, clearance, and the first anatomical intercept without relying on color alone.');
      expect(source).toContain("var safetyLabel = (safetyCritical ? (trajectorySafety.protocolProtected ? 'PROTECT · ' : 'STOP · ') : 'AHEAD · ')");
      expect(source).toContain('canvas._cuttingSafetyState');
      expect(source).toContain('Shape-coded intent reticle previews whether contact will act, wait, or protect anatomy before commitment.');
      expect(source).toContain('var toolIntentState = canvas._toolIntentState;');
      expect(source).toContain('toolIntentState.tool === activePointerTool');
      expect(source).toContain("intentLabel === 'PROTECT'");
      expect(source).toContain("ctx.setLineDash(intentLabel === 'TRAY' ? [3, 3] : [])");
      expect(source).toContain('function nearestProcedureGuidePoint(point, guide)');
      expect(source).toContain('function nearestVisibleStructureTarget(point)');
      expect(source).toContain('var intentTarget = toolIntentState.target;');
      expect(source).toContain('ctx.setLineDash([6, 5])');
      expect(source).toContain("targetLabel: 'Safe path'");
      expect(source).toContain("var hoverPinPrerequisite = procedureProtocol.preStabilize ? currentProcedure.inspected : currentProcedure.retracted");
      expect(source).toContain("previewTargetLabel = hoverPins.length ? 'Opposite anchor' : 'Anchor point'");
      expect(source).toContain("var hoverProbeMode = nextProcedureInfo().action === 'inspect' ? 'inspect' : 'trace'");
      expect(source).toContain("var hoverProbePrerequisite = hoverProbeMode === 'inspect' || hoverPins.length >= 2");
      expect(source).toContain("activeInstrument === 'probe' && hoverProbeMode === 'inspect' ? 'INSPECT' : 'READY'");
      expect(source).toContain('Directional target guidance uses a dashed arrow, labeled endpoint, and shape-coded reticle');
      expect(source).toContain('function anatomicalOrientationData()');
      expect(source).toContain("pig: { start: 'CRANIAL', end: 'CAUDAL', axis: 'horizontal' }");
      expect(source).toContain("eye: { start: 'CORNEA', end: 'OPTIC NERVE', axis: 'horizontal' }");
      expect(source).toContain("heart: { start: 'BASE', end: 'APEX', axis: 'vertical' }");
      expect(source).toContain("mirrored: profile.axis === 'horizontal' && view === 'ventral'");
      expect(source).toContain('function drawAnatomicalOrientationCompass()');
      expect(source).toContain("var compassStatus = compass.view.toUpperCase() + (compass.aligned ? ' · ALIGNED' : ' · TARGET ' + compass.targetView.toUpperCase())");
      expect(source).toContain('drawAnatomicalOrientationCompass()');
      expect(source).toContain('Anatomical orientation axis uses a circle for ');
      expect(source).toContain('anatomical orientation axis: circle marks ');

      expect(source).toContain('function procedureTransitionSnapshot(procedureState)');
      expect(source).toContain('function queueProcedureUndoTransition(action, beforeProcedure, afterProcedure)');
      expect(source).toContain("action: 'undo-' + action");
      expect(source).toContain("label: 'UNDO · ' + procedureActionLabel(action).toUpperCase()");
      expect(source).toContain('beforeProcedure: undoBefore');
      expect(source).toContain('queueProcedureUndoTransition(action, currentProcedure, restoredProcedure)');
      expect(source).toContain("var liveTransitionIsUndo = liveTissueTransitionAction.indexOf('undo-') === 0");
      expect(source).toContain('liveProcedureState = procedureTransitionSnapshot(tissueTransition.beforeProcedure)');
      expect(source).toContain("var openingUndoActive = (liveTissueTransitionAction === 'undo-scalpel' && !extended)");
      expect(source).toContain("liveTissueTransitionAction === 'undo-pin' && transitioningPin ? 1 - liveTissueTransitionProgress : 1");
      expect(source).toContain("var hydrationUndoScale = liveTissueTransitionAction === 'undo-dropper' ? 1 - liveTissueTransitionProgress : 1");
      expect(source).toContain("var wickedUndoScale = liveTissueTransitionAction === 'undo-wick' ? 1 - liveTissueTransitionProgress : 1");
      expect(source).toContain("var probeUndoScale = liveTissueTransitionAction === 'undo-probe' ? 1 - liveTissueTransitionProgress : 1");
      expect(source).toContain('Undo the last technique action and visually restore the previous tissue state');
      expect(source).toContain('function interpolateTissueState(beforeState, afterState, progress)');
      expect(source).toContain("interpolated.salineDrops = amount < 0.68 ? before.salineDrops : after.salineDrops");
      expect(source).toContain('beforeTissue: normalizeTissueState(beforeState), afterTissue: normalizeTissueState(afterState)');
      expect(source).toContain("var liveTissueTransitionAction = ''");
      expect(source).toContain('liveTissueTransitionProgress = dissMotionReduced ? 1');
      expect(source).toContain('Object.assign({}, liveProcedureState, { tissueState: liveTissueState })');
      expect(source).toContain("var openingTransitionActive = (liveTissueTransitionAction === 'scalpel' && !extended)");
      expect(source).toContain("var flapTransition = liveTissueTransitionAction === 'forceps' ? liveTissueTransitionProgress : (liveTissueTransitionAction === 'undo-forceps' ? 1 - liveTissueTransitionProgress : 1)");
      expect(source).toContain("var pinInsertionProgress = liveTissueTransitionAction === 'pin'");
      expect(source).toContain("var pinSettleVisible = liveTissueTransitionAction === 'pin' ? liveTissueTransitionProgress >= 0.72 : (liveTissueTransitionAction === 'undo-pin' ? liveTissueTransitionProgress < 0.36 : true)");
      expect(source).toContain('Tissue opening, retraction, stabilization, hydration, and risk metrics transition spatially after each action; Undo reverses openings, retraction, pin placement, hydration, wick evidence, and probe traces; reduced motion snaps to the final state');
      expect(source).toContain('tissue-state transitions: opening, retraction, stabilization, hydration, and risk interpolate spatially; Undo reverses opening, flap, pin, hydration, wick, and trace geometry; reduced motion snaps to final state');
      expect(source).toContain('function procedureOutcomePoint(action, patch)');
      expect(source).toContain("var actionPath = action === 'scissors' ? (patch.extensionPath || []) : (action === 'scalpel' ? (patch.incisionPath || []) : [])");
      expect(source).toContain('function procedureOutcomeFeedbackData(action, patch, beforeState, afterState, requestedTone)');
      expect(source).toContain('function queueProcedureOutcomeFeedback(action, patch, beforeState, afterState, requestedTone)');
      expect(source).toContain('outcomeCanvas._toolOutcomePulse = {');
      expect(source).toContain("queueProcedureOutcomeFeedback('mistake'");
      expect(source).toContain('One-shot outcome feedback localizes the tissue-state change at the actual action point with shape and text redundancy.');
      expect(source).toContain('var activeOutcomePulse = queuedOutcomePulse');
      expect(source).toContain('var outcomeMotionProgress = dissMotionReduced ? 0.5 : outcomeProgress');
      expect(source).toContain("var outcomeCaution = activeOutcomePulse.tone === 'caution'");
      expect(source).toContain('Localized action outcomes use a one-shot check or warning symbol with the changed tissue metric');
      expect(source).toContain("'; localized action outcome: success or caution shape and changed tissue metric encoded'");
      expect(source).toContain('var activeContactIntent = !pointerIsSynthetic && canvas._toolIntentState');
      expect(source).toContain('var pinPreviewPrerequisite = procedureProtocol.preStabilize ? currentProcedure.inspected : currentProcedure.retracted');
      expect(source).toContain("var probePreviewMode = nextProcedureInfo().action === 'inspect' ? 'inspect' : 'trace'");
      expect(source).toContain("probePreviewMode === 'inspect' ? 'INSPECT: '");
      expect(source).toContain('function canvasPointerModeData(canvas, hit)');
      expect(source).toContain('function syncCanvasPointerPresentation(canvas, hit)');
      expect(source).toContain('canvas.style.cursor = pointerMode.cursor');
      expect(source).not.toContain("canvas.style.cursor = 'none'");
      expect(source).toContain('canvas._toolIntentState = null;');
      expect(source).toContain('e.currentTarget._toolIntentState = null;');
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
      expect(source).toContain('Tray-level stipple was removed: specimen microtexture is clipped and lit in the material pass after organism drawing.');
      expect(source).not.toContain('// Tissue texture overlay (stipple for organic feel)');
      expect(source).toContain("var liveLightDirection = d.lightDirection || 'overhead'");
      expect(source).toContain('var surfaceLightVector = {');
      expect(source).toContain("raking: { x: -0.72, y: 0.70 }");
      expect(source).toContain("var materialRoughness = materialCondition === 'dehydrated' ? 0.88");
      expect(source).toContain('Directional illumination turns the texture into surface relief; moisture sharpens sheen while dehydration breaks it up.');
      expect(source).toContain('var directionalSurfaceGradient = ctx.createLinearGradient');
      expect(source).toContain("ctx.setLineDash(materialCondition === 'dehydrated' ? [3, 3] : [])");
      expect(source).toContain('var sheenTangentX = -surfaceLightVector.y');
      expect(source).toContain("'. Surface microtexture ' + ((visualRealism === 'accessible' || !sceneDetail)");
      expect(source).toContain("report += 'Surface microdetail: '");
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
      expect(source).toContain("setDissectionLiveText(resistanceStatus, ((canvas._toolGestureContext && canvas._toolGestureContext.tool) === 'scissors'");
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
      expect(source).toContain('Direct forceps press-drag-release manipulation shows live lift direction, safe range, calibrated grip, speed, control, slip risk, and excess tension with text and geometry; the technique action button remains equivalent.');
      expect(source).toContain("'; forceps direct manipulation: press-drag-release lift, safe envelope, grip, slip, speed, control, and tension encoded'");
      expect(source).toContain("pinPreviewValid ? 'ANCHOR PREVIEW: ' + pinAnglePreview");
      expect(source).toContain('function drawPinStabilityPreview(guide, pointer, pins)');
      expect(source).toContain('Pin preview combines endpoint placement, separation, shaft angle, insertion depth, and flap tension before commitment.');
      expect(source).toContain("key: 'crowded', label: 'TOO CLOSE'");
      expect(source).toContain("key: 'shallow', label: 'SHALLOW \\u00B7 SLIP'");
      expect(source).toContain("key: 'steep', label: 'STEEP \\u00B7 STRESS'");
      expect(source).toContain("key: 'stable', label: 'STABLE ANCHOR'");
      expect(source).toContain('var pinTechniqueValid = pinPreviewValid');
      expect(source).toContain('drawPinStabilityPreview(activeOpeningPath, canvas._toolPointer, canvasProcedure.pins || [])');
      expect(source).toContain('Committed pins read as angled metal anchors with insertion collars, cast shadows, and shape-coded heads.');
      expect(source).toContain('function drawCommittedRetractionPin(pin, pinIdx)');
      expect(source).toContain('var committedPinAngle = Math.max(35, Math.min(90');
      expect(source).toContain('Tension tether terminates at the insertion point rather than passing through the pin.');
      expect(source).toContain('Concentric collar and depth notch make the insertion site legible without relying on pin color.');
      expect(source).toContain('(canvasProcedure.pins || []).forEach(drawCommittedRetractionPin)');
      expect(source).toContain('Live pin stability preview shows endpoint spacing, calibrated angle, insertion depth, and flap tension with text and geometry');
      expect(source).toContain("'; pin stability preview: angle, depth, spacing, and tension encoded'");
      expect(source).toContain("probePreviewValid ? (probePreviewMode === 'inspect'");
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
      expect(source).toContain('"data-tool-marker": "next"');
      expect(source).toContain("Guided procedure handoff cue connects the next required instrument to its anatomical target and ' + (procedureProtocol.order || []).length + '-step progress rail");
      expect(source).toContain("'; guided handoff cue: next instrument, anatomical target, and ' + (procedureProtocol.order || []).length + '-step progress encoded'");
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
      expect(source).toContain('Non-cutting previews pair sequence and calibration readiness with a visible nearest anatomical target.');
      expect(source).toContain("setDissectionLiveText(previewStatus, previewMessage)");
      expect(source).toContain("['forceps', 'pin', 'probe', 'dropper'].indexOf(responseTool) >= 0");
      expect(source).toContain('sceneDetail: sceneDetail');
      expect(source).toContain('relationshipMotion: relationshipMotion');
      expect(source).toContain('sceneDetail: data.sceneDetail !== false');
      expect(source).toContain('relationshipMotion: data.relationshipMotion !== false');
      // Workspace settings own Essentials gating and retained Advanced preferences;
      // dissection_settings_integrity.test.js exercises those settings through save/reload.
      expect(source).toContain('var workspaceSettings = dissectionWorkspaceSettings(d, workspaceMode);');
      expect(source).toContain('drawState = Object.assign({}, drawState, dissectionWorkspaceSettings(drawState, drawWorkspaceMode));');
      expect(source).toContain('var depthAtlasEnabled = workspaceSettings.depthAtlas;');
      expect(source).toContain('var depthAtlasCounts = organs.reduce');
      expect(source).toContain('function drawDepthAtlasMarker(x, y, depth, selected, hovered, muted)');
      expect(source).toContain('Shape-coded depth landmarks pair color, geometry, and line style so depth never depends on hue alone.');
      expect(source).toContain('function structureInspectionFootprint(org)');
      expect(source).toContain('/vessel|arter|vena|vein|aorta|cord|nerve|intestin|ureter|duct|esophagus|trachea|spinal|chordae/');
      expect(source).toContain('function structureBoundaryAttachmentPoint(org, towardPoint)');
      expect(source).toContain('function drawStructureInspectionFootprint(org, x, y, selected, hovered, visibility, callout)');
      expect(source).toContain('var chambered = /heart|stomach|bladder|crop|gizzard|atrium|ventricle|cloaca|lens|humor/');
      expect(source).toContain('var layered = /skin|integument|cuticle|scale|carapace|membrane|muscle|myomere|retina|cornea|sclera|choroid|conjunctiva|diaphragm|septum|pericardium|valve/');
      const footprint = contractFunction(source, 'structureInspectionFootprint', { structureOpticalDepth: () => 'deep', W: 500, H: 600,
        organs: Array.from({ length: 12 }), spec: { bodyShape: 'fish' }, specimen: 'perch' });
      expect(footprint({ id: 'artery', name: 'Artery' }).morphologyLabel).toBe('TUBE');
      expect(footprint({ id: 'liver_f', name: 'Liver' }).morphologyLabel).toBe('LOBED');
      expect(footprint({ id: 'stomach_f', name: 'Stomach' }).morphologyLabel).toBe('CHAMBERED');
      expect(footprint({ id: 'pyloric_ceca', name: 'Pyloric Ceca' })).toEqual({
        ...footprint({ id: 'spleen_f', name: 'Spleen' }), morphologyLabel: 'POUCHES',
      });
      expect(source).toContain('function traceStructureMorphologyContour(profile, yOffset, inflate)');
      expect(source).toContain('function drawStructureMorphologyTexture(profile)');
      expect(source).toContain('Morphology contours and internal marks distinguish structure classes without claiming an exact organ boundary.');
      expect(source).toContain('traceStructureMorphologyContour(profile, profile.depthOffset, 0)');
      expect(source).toContain('drawStructureMorphologyTexture(profile)');
      expect(source).toContain('The inspection footprint is a depth capsule, not an exact anatomical outline');
      expect(source).toContain('var sourceAttachment = structureBoundaryAttachmentPoint(relationshipSource, relationshipPoint)');
      expect(source).toContain('var targetAttachment = structureBoundaryAttachmentPoint(relationship.organ, relationshipSourcePoint)');
      expect(source).toContain('drawStructureInspectionFootprint(org, px, py, isSel, isHov, layout.visibility, layout)');
      expect(source).toContain("var hoverDepthLabel = anatomicalDepthLabel(structureOpticalDepth(hovOrg))");
      expect(source).toContain("var hoverExposure = structureExposureState(hovOrg, currentProcedure)");
      expect(source).toContain("var hoverMorphology = structureInspectionFootprint(hovOrg).morphologyLabel.toLowerCase()");
      expect(source).toContain('Selected and hovered structures retain a target and depth label. Teaching modes and covered anatomy also show a projected depth outline');
      expect(source).toContain("'; structure inspection: targets and depth labels retained; projected depth outlines in teaching modes and for covered anatomy; relationship pathways: type-specific line rhythms and marker shapes encoded'");
      expect(source).toContain('Relationship types use distinct line patterns and moving marker shapes, with fixed markers when motion is reduced.');
      expect(source).toContain('Teaching overlays distinguish tubes, lobes, chambers, layers, and compact structures with shapes and labels');
      expect(source).toContain("layout.depth === 'deep' ? [1.2, 3.2]");
      expect(source).toContain('depthAtlas: depthAtlasEnabled');
      expect(source).toContain('depthAtlas: data.depthAtlas !== false');
      expect(source).toContain('Toggle anatomical depth atlas with shape-coded landmarks');
      expect(source).toContain('className: "diss-depth-key"');
      expect(source).toContain('Anatomical depth visual key:');
      expect(source).toContain('var tissueReliefEnabled = workspaceSettings.tissueRelief;');
      expect(source).toContain('function drawSpecimenTissueRelief()');
      expect(source).toContain('Responsive tissue relief gives visible structures elevation, recess, and contact shadow before labels are drawn.');
      expect(source).toContain('function drawAnatomicalExposureVeil()');
      expect(source).toContain('Progressive exposure veil lets covered anatomy remain spatially legible without appearing dissected or selectable.');
      expect(source).toContain('A solid mask keeps covered structures genuinely covered; rings and hatching carry the same meaning without color.');
      expect(source).toContain('function drawExposureStateMarker(x, y, visibility, selected, hovered, muted)');
      expect(source).toContain('Exposure markers use distinct geometry so emerging and covered structures never read like exposed targets.');
      expect(source).toContain("var exposureMuted = layout.visibility !== 'visible';");
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
      expect(source).toContain('function anatomicalRelationshipVisualProfile(type)');
      expect(source).toContain('Relationship profiles pair hue with line rhythm, marker geometry, and readable text.');
      expect(source).toContain("category: 'vascular', color: '#fb7185', dash: [], marker: 'circle'");
      expect(source).toContain("category: 'neural', color: '#a78bfa', dash: [8, 3, 2, 3], marker: 'diamond'");
      expect(source).toContain("category: 'digestive', color: '#fbbf24', dash: [5, 3], marker: 'chevron'");
      expect(source).toContain("category: 'optical', color: '#38bdf8', dash: [1.5, 3.5], marker: 'triangle'");
      expect(source).toContain("category: 'excretory', color: '#c084fc', dash: [10, 4], marker: 'ring'");
      expect(source).toContain("category: 'respiratory', color: '#2dd4bf', dash: [7, 3, 2, 3], marker: 'double-chevron'");
      expect(source).toContain("category: 'structural', color: '#cbd5e1', dash: [10, 3], marker: 'square'");
      expect(source).toContain('function drawAnatomicalRelationshipMarker(x, y, angle, marker, size, color, accessible)');
      expect(source).toContain('Animated pathway markers retain distinct silhouettes so relationship meaning never depends on motion or color.');
      expect(source).toContain('ctx.setLineDash(relationshipVisual.dash)');
      expect(source).toContain('var flowTangentX =');
      expect(source).toContain('drawAnatomicalRelationshipMarker(flowX, flowY');
      expect(source).toContain("Visual code: ' + anatomicalRelationshipEncodingText(nextRelationship.type)");
      expect(source).toContain('Relationship pathway visual key');
      expect(source).toContain('var flowT = relationshipMotion && !dissMotionReduced');
      expect(source).toContain("var activeFunctionalTraceKey = advancedWorkspace ? (d.traceCirculation ? 'circulation'");
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
      expect(source).toContain('.diss-overlay-actions button[aria-pressed="true"]');      expect(source).toContain('var focusRadius = 12 + (1 - focusEntryProgress)');
      expect(source).toContain('var focusMuted = (focusMode || (denseHotspotView && d.selectedOrgan))');
      expect(source).toContain('focusEntryProgress = 1 - Math.pow');
      expect(source).toContain('Nearest-target hit testing also treats laid-out labels as interactive targets.');
      expect(source).toContain('function closestVisibleOrganAt(x, y, radius, canvasEl)');
      expect(source).toContain('canvasEl && canvasEl._hotspotLabelBoxes || []');
      expect(source).toContain('Adaptive hotspot labels share collision-aware columns and remain clickable.');
      expect(source).toContain("var canvasLabelsVisible = d.labelMode !== 'hidden' && !d.quizMode;");
      expect(source).toContain('var denseHotspotView = canvasLabelsVisible && organs.length >= 8 && zoom < 1.22;');
      expect(source).toContain('function resolveAdaptiveLabelColumn(items, minY, maxY)');
      expect(source.includes('canvas._hotspotLabelBoxes = adaptiveHotspotLayout.filter(function (item) { return item.showCallout; }).map'),
        'only painted callouts are published as clickable label targets').toBe(true);
      expect(source).toContain('Reticle marks make selected state readable without color alone.');
      expect(source).toContain("canvasCoarsePointer ? 'select to expand' : 'hover to expand'");
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
      expect(source).toContain('if (visualEvidence.length >= evidenceFrameLimit)');
      expect(source).toContain('no saved frame was replaced');
      expect(source).toContain('var nextEvidence = visualEvidence.concat([evidenceEntry]);');
      expect(source).not.toContain('visualEvidence.concat([evidenceEntry]).slice(-6)');
      expect(source).toContain('function selectEvidenceReference(evidenceId)');
      expect(source).toContain('function downloadEvidence(evidence)');
      expect(source).toContain('function requestEvidenceRemoval(evidenceId)');
      expect(source).toContain('function confirmEvidenceRemoval(evidenceId)');
      expect(source).toContain('function requestClearVisualEvidence()');
      expect(source).toContain('function confirmClearVisualEvidence()');
      expect(source).toContain('Notes and other specimen progress were preserved');
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
      expect(source).toContain("performProcedureAction('probe', { organ: drag.target, probeDragMetrics: probeDragMetrics");
      expect(source).not.toContain("performProcedureAction('probe', { organ: hit });");
      expect(source).toContain('Next-layer tissue bed becomes visible beneath the retracted flaps.');
      expect(source).toContain('var nextTissueLayer = spec.layers[Math.min(spec.layers.length - 1, currentLayerIdx + 1)]');
      expect(source).toContain('Probe confirmation remains anchored to the traced structure as persistent visual evidence.');
      expect(source).toContain('canvasProcedure.probed && canvasProcedure.probedOrganId');
      expect(source).toContain("var probeLabel = 'Trace: ' + probedStructure.name;");      expect(source).toContain('ann.prevX * W');
      expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
      expect(source).toContain('Technique completion follows the recorded specimen-specific access path without decorative particles.');
      expect(source).toContain('var completionPath = (completionProcedure.extensionPath');
      expect(source).toContain('var completionSamples = (completionProcedure.extensionSamples');
      expect(source).toContain('function traceTechniqueCompletionEdge(offset)');
      expect(source).toContain('var completionEdgeSpread = 2.2 + completionPressure * 2.4');
      expect(source).toContain('var completionBladeGradient = ctx.createLinearGradient');
      expect(source).not.toContain('// Sparkle particles along cut');
      expect(source).toContain('var transitionDuration = prefersReducedLayerMotion ? 650 : 1150');
      expect(source).toContain('_layerTransition: layerTransition');
      expect(source).toContain('Specimen-shaped layer transition opens along the dominant body axis to reveal the new anatomy beneath.');
      expect(source).toContain('var transitionHorizontalBody = transitionRX > transitionRY * 1.18');
      expect(source).toContain('Temporary connective strands bridge the opening and release as the flaps retract.');
      expect(source).toContain('Screen-fixed confirmation stays readable even when the specimen is mirrored, zoomed, or panned.');
      expect(source).toContain("ctx.fillText('LAYER REVEALED'");
      expect(source).toContain("_layerTransition.fromName + '  \\u2192  '");
      expect(source).toContain('_layerTransition.reducedMotion ? 1 : layerTransitionProgress');
      expect(source).toContain('function changeAnatomicalView(nextView, source)');
      expect(source).toContain('View changes retain spatial context with a specimen-aware turn cue and an equivalent spoken announcement.');
      expect(source).toContain("changeAnatomicalView(keyboardViews[(keyboardViews.indexOf(d.anatomicalView || 'dorsal')");
      expect(source).toContain("changeAnatomicalView(views[(views.indexOf(anatomicalView) + 1) % views.length], 'view toolbar')");
      expect(source).toContain("changeAnatomicalView(views[(views.indexOf(anatomicalView) + 1) % views.length], 'fullscreen dock')");
      expect(source).toContain("changeAnatomicalView(procedureProtocol.recommendedView, 'procedure alignment')");
      expect(source).not.toContain("upd('anatomicalView'");
      expect(source).toContain("_viewTransition: { active: true, fromView: fromView, toView: nextView");
      expect(source).toContain("_layerBrowseTransition: { active: true, fromId: fromLayer.id");
      expect(source).toContain("direction: layerIdx > fromLayerIdx ? 'deeper' : 'superficial'");
      expect(source).toContain('Spatial navigation overlays show orientation turns and layer depth changes without moving landmarks away from their hit targets.');
      expect(source).toContain('var viewTurnPhase = Math.sin(viewTransitionProgress * Math.PI)');
      expect(source).toContain("ctx.setLineDash([4, 4]); ctx.globalAlpha = 0.58");
      expect(source).toContain('var layerDepthScale = layerBrowseDeeper ? 1 - layerDepthPhase * 0.54');
      expect(source).toContain('function drawSpatialTransitionBadge(y, title, fromLabel, toLabel, directionLabel, progress, alpha, accent)');
      expect(source).toContain("'CIRCLE START / DIAMOND TARGET'");
      expect(source).toContain("'RINGS IN / DEEPER'");
      expect(source).toContain('View and layer navigation uses a labeled orientation sweep with circle start and diamond target markers');
      expect(source).toContain("'; spatial navigation transitions: orientation sweep, circle start, diamond target, and layer depth rings encoded; reduced motion switches instantly'");      expect(source).toContain('d.rulerStart.x * W');
      expect(source).toContain('Measurement complete. Approximate model distance: ');
      expect(source).toContain('Clear annotations');
      expect(source).toContain("Technique cautions reviewed: ");
      expect(source).toContain("Current layer technique score: ");
      expect((source.match(/performProcedureAction\('forceps', \{ point:/g) || []).length).toBe(1);
    }
  });

  it('keeps every guided interaction answerable, guarded, and honest about its result', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("var tone = restricted ? 'restricted'");
      expect(source).toContain("safeToAct: tone === 'ready'");
      expect(source).toContain("var fieldReady = isHydrationTool || next.action === 'inspect'");
      expect(source).toContain('function canBeginDirectInstrument(toolId, refusalEvent)');
      expect(source).toContain('if (readiness.safeToAct) return true;');
      // 2026-09-06: the gating is unchanged; the gestures now hand the refusal the event so the
      // follow-on click cannot overwrite the real reason with tap coaching. beginProbeDrag is
      // deliberately still the bare form - arming it there would swallow the probe's own
      // selection click, which canvasClick is the only path for.
      expect(source).toContain('if (!canBeginDirectInstrument(activeInstrument, e)) return false;');
      for (const tool of ['forceps', 'pin', 'dropper', 'wick']) {
        expect(source).toContain("if (!canBeginDirectInstrument('" + tool + "', e)) return false;");
      }
      expect(source).toContain("if (!canBeginDirectInstrument('probe')) return false;");

      expect(source).toContain('var actionResult = performProcedureAction(next.action, actionPayload)');
      expect(source).toContain('if (!actionResult || !actionResult.ok) return false;');
      expect(source).toContain('return { ok: true, organ: target, point: variedOrganPoint(target) };');
      expect(source).toContain('if (probeResult && probeResult.ok) queueProcedureInstrumentReplay');
      expect(source).toContain('if (dropperResult && dropperResult.ok) queueProcedureInstrumentReplay');
      expect(source).toContain('if (wickResult && wickResult.ok) queueProcedureInstrumentReplay');

      expect(source).toContain('orientationRecheckRequired: true');
      expect(source).toContain('var orientationRecorded = !!procedureState.inspected && !procedureState.orientationRecheckRequired');
      expect(source).toContain('orientationObservedAt: Date.now()');
      expect(source).toContain("Align the specimen to the recommended ' + procedureProtocol.recommendedView + ' view before recording orientation.");

      expect(source).toContain('var visibleQuizPool = quizPool.filter');
      expect(source).toContain('var practicalTargetIds = Array.isArray(d.practicalTargetIds)');
      expect(source).toContain('var activeQuizPool = d.practicalMode');
      expect(source).toContain('var orderedQuizPool = dissStableOrder(activeQuizPool, quizSalt);');
      expect(source).toContain('var hotspotQuizAvailable = !!quizQ && visibleQuizPool.some');
      expect(source).toContain("var effectiveQuizAnswerMode = d.quizAnswerMode === 'hotspot' && hotspotQuizAvailable ? 'hotspot' : 'choices';");
      expect(source).toContain("var guidedOrgans = organs.filter(function (org) { return structureExposureState(org, currentProcedure) === 'visible'; });");
      expect(source).toContain('function keyboardPreview(organ)');
      expect(source).toMatch(/function keyboardPreview\(organ\) \{[\s\S]{0,320}target\._keyboardPreviewOrganId = organ\.id;/);
      expect(source).toContain('var keyboardCommitId = target._keyboardPreviewOrganId;');
      expect(source).toContain('Use an Arrow key, Home, or End to preview a structure before pressing Enter.');
      expect(source).toMatch(/onBlur: function \(e\) \{[\s\S]{0,400}blurredCanvas\._keyboardFocus = false; blurredCanvas\._keyboardPreviewOrganId = null;/);
      expect(source).toContain("if (hadPointAnchor && blurredCanvas._dissMotionReduced && typeof blurredCanvas._drawDissectionNow === 'function') blurredCanvas._drawDissectionNow();");
      expect(source).not.toContain('var keyboardCommitId = d.quizMode ? d.hoveredOrgan : d.selectedOrgan;');
      expect(source).toContain("upd('selectedOrgan', organ.id)");
      expect(source).not.toContain('function keyboardChoose(organ)');
      expect(source).toContain("This assessment uses the answer choices. Press Tab to choose an answer");

      expect(source).toContain("procedureScenario === 'restricted-tray' && (activeInstrument === 'dropper' || activeInstrument === 'wick')");
      expect(source).toContain('var availableTools = PROCEDURE_INSTRUMENTS.filter');
      expect(source).toContain('disabled: restrictedTool');
      expect(source).toContain('toolbarStudyOpen: false');
      expect(source).toContain('var prefersReducedLayerMotion = reducedMotionEnabled;');
      expect(source).toContain('"data-dissection-next-action": true');
      expect(source).toContain('"data-next-action": nextActionModel.action');

      expect(source).toContain('function procedureLearningDefinition(action)');
      expect(source).toContain('function procedureLearningGateFor(action, state)');
      expect(source).toContain('function recordProcedureLearningChoice(action, phase, choiceId)');
      expect(source).toContain("{ id: 'predict', label: '1 Predict'");
      expect(source).toContain("{ id: 'perform', label: '2 Perform'");
      expect(source).toContain("{ id: 'reflect', label: '3 Explain'");
      expect(source).toContain("focusDissectionTarget('diss-learning-checkpoint', 'Learning checkpoint focused. Choose one response; the simulation will not perform the action for you.')");
      expect(source).toContain('function beginGuidedObservation(org)');
      expect(source).toContain('function recordGuidedObservationChoice(choiceId)');
      expect(source).toContain("verified[specimen + '|' + pendingOrgan.id] = { status: 'verified'");
      expect(source).toContain('Locating alone does not advance the step.');

      const primaryActionStart = indexOfOrThrow(source, 'function performPrimaryNextAction()', { file: filePath });
      const primaryActionSource = sliceBetween(source, 'function performPrimaryNextAction()', 'function renderNextActionCard()', {
        file: filePath, label: 'primary next-action handler',
      });
      expect(primaryActionStart).toBeGreaterThan(-1);
      expect(primaryActionSource).toContain("focusDissectionTarget('diss-canvas'");
      expect(primaryActionSource).not.toContain("changeAnatomicalView(nextActionModel.targetView");
      expect(primaryActionSource).not.toContain('performProcedureAction(');

      expect(source).not.toContain("icon: '??'");
      expect(source).not.toContain("'Next best action ? '");
      expect(source).not.toContain("' ? unavailable'");
      expect(source).not.toContain("'Technique in progress?'");
      expect(source).not.toContain("'Prepare ' + nextToolDefinition.label + ' for '");
    }
  });

  it('supports specimen-aware direct forceps lifting with equivalent accessible feedback', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function forcepsDragAssessment(canvas, point, at)');
      expect(source).toContain('function beginForcepsDrag(e)');
      expect(source).toContain('function appendForcepsDrag(e)');
      expect(source).toContain('function finishForcepsDrag(e, cancelled)');
      expect(source).toContain("key = !drag.startValid ? 'position'");
      expect(source).toContain("grasp: 'GRASP \u00B7 DRAG'");
      expect(source).toContain('peakSpeed > 1.35');
      expect(source).toContain('projectedTension: projectedTension');
      expect(source).toContain('update the polite live region only at meaningful state changes');
      expect(source).toContain('if (status && (stateChanged || finalMessage))');
      expect(source).toContain('The solid outer ring is the safe lift envelope; the dashed inner ring marks the minimum effective lift.');
      expect(source).toContain('ctx.ellipse(baseX, baseY, directAssessment.safeMax * W');
      expect(source).toContain("assessment.key === 'controlled' ? 'grabbing'");
      expect(source).toContain('if (canvas._forcepsDrag && canvas._forcepsDrag.active) { appendForcepsDrag(e); return; }');
      expect(source).toContain("techniquePointerActive && activeInstrument === 'forceps') { beginForcepsDrag(e); return; }");
      expect(source).toContain('if (finishForcepsDrag(e, false)) return;');
      expect(source).toContain('|| finishForcepsDrag(cancelEvent, true)');
      expect(source).toContain('if (canvas._dissMotionReduced && canvas._drawDissectionNow) canvas._drawDissectionNow();');
      expect(source).toContain("activeInstrument === 'scissors' || activeInstrument === 'forceps') ? 'none' : 'pan-y'");
      expect(source).toContain('forcepsDragMetrics: forcepsDragMetrics');
      expect(source).toContain('interactionMetrics: patch.forcepsDragMetrics');
      expect(source).toContain("report += 'Direct forceps lift: '");
      expect(source).toContain('Recorded direct forceps lift evidence');
      expect(source).toContain('the equivalent technique action button remains available');
      expect(source).not.toContain("activeInstrument === 'forceps') { performProcedureAction('forceps', { point: { x: mx, y: my } });");
    }

    resetStemLab();
    loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        _dissLoadedSpec: 'frog',
        activeInstrument: 'forceps',
        procedureByLayer: {
          skin: {
            inspected: true,
            incisionStarted: true,
            incisionExtended: true,
            retracted: true,
            forcepsPoint: { x: 0.5, y: 0.48 },
            forcepsDragMetrics: {
              liftPercent: 68,
              control: 88,
              projectedTension: 64,
              durationMs: 720,
              inputType: 'pen',
            },
          },
        },
      },
    });
    expect(html).toContain('Recorded direct forceps lift evidence');
    expect(html).toContain('Direct lift evidence');
    expect(html).toContain('68% lift');
    expect(html).toContain('Control 88%');
    expect(html).toContain('Projected tension 64%');
    expect(html).toContain('Input: pen');
    expect(html).toContain('the equivalent technique action button remains available');
  });
  it('supports direct pin press-drag-release placement with live stability evidence', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function pinDragAssessment(canvas, point, at)');
      expect(source).toContain('function beginPinDrag(e)');
      expect(source).toContain('function appendPinDrag(e)');
      expect(source).toContain('function finishPinDrag(e, cancelled)');
      expect(source).toContain("key = !drag.startValid ? 'position'");
      expect(source).toContain("label = { position: 'MOVE TO ENDPOINT'");
      expect(source).toContain("grasp: 'GRASP \u00B7 DRAG'");
      expect(source).toContain("stable: 'STABLE ANCHOR'");
      expect(source).toContain('safeTravel: safeTravel');
      expect(source).toContain('insertionPercent: insertionPercent');
      expect(source).toContain('alignment: Math.round(Math.max(0, alignment) * 100)');
      expect(source).toContain('ctx.ellipse(tipX, tipY, directPinAssessment.safeTravel * W');
      expect(source).toContain('if (canvas._pinDrag && canvas._pinDrag.active) { appendPinDrag(e); return; }');
      expect(source).toContain("techniquePointerActive && activeInstrument === 'pin') { beginPinDrag(e); return; }");
      expect(source).toContain('if (finishPinDrag(e, false)) return;');
      expect(source).toContain('var canceled = silentCancel ? canvasHasActiveDirectGesture(canvas) : (finishPinDrag(cancelEvent, true)');
      expect(source).toContain('pinDragMetrics: pinDragMetrics');
      expect(source).toContain("report += 'Direct pin placement: '");
      expect(source).toContain('Recorded direct pin placement evidence');
      expect(source).toContain('Direct pin press-drag-release placement adds shaft alignment, insertion travel, safe depth, and control feedback.');
      expect(source).toContain('the equivalent technique action button remains available');
      expect(source).not.toContain("activeInstrument === 'pin') { performProcedureAction('pin', { point: { x: mx, y: my } });");
    }

    resetStemLab();
    loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        _dissLoadedSpec: 'frog',
        activeInstrument: 'pin',
        procedureByLayer: {
          skin: {
            inspected: true,
            incisionStarted: true,
            incisionExtended: true,
            retracted: true,
            pins: [{ x: 0.3, y: 0.5 }],
            pinDragMetrics: {
              insertionPercent: 64,
              alignment: 92,
              control: 88,
              angle: 65,
              inputType: 'pen',
            },
          },
        },
      },
    });
    expect(html).toContain('Recorded direct pin placement evidence');
    expect(html).toContain('Direct pin evidence');
    expect(html).toContain('64% inserted');
    expect(html).toContain('Alignment 92%');
    expect(html).toContain('Control 88%');
    expect(html).toContain('Angle 65 degrees');
    expect(html).toContain('Input: pen');
    expect(html).toContain('Press an indicated endpoint, drag inward along the shaft');
  });  it('supports direct probe press-drag-release palpation with live contact evidence', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function probeDragAssessment(canvas, point, at)');
      expect(source).toContain('function beginProbeDrag(e)');
      expect(source).toContain('function appendProbeDrag(e)');
      expect(source).toContain('function finishProbeDrag(e, cancelled)');
      expect(source).toContain("labels = { position: 'MOVE TO STRUCTURE'");
      expect(source).toContain("grasp: 'GRASP · TRACE'");
      expect(source).toContain("controlled: 'CONTROLLED PALPATION'");
      expect(source).toContain('contactPercent: contactPercent');
      expect(source).toContain('resistanceValue: resistanceValue');
      expect(source).toContain('deformation: deformation');
      expect(source).toContain('if (canvas._probeDrag && canvas._probeDrag.active) { appendProbeDrag(e); return; }');
      expect(source).toMatch(/techniquePointerActive && activeInstrument === 'probe'\)[\s\S]{0,120}beginProbeDrag\(e\)/);
      expect(source).toContain('if (finishProbeDrag(e, false)) return;');
      expect(source).toContain('|| finishProbeDrag(cancelEvent, true)');
      expect(source).toContain('probeDragMetrics: probeDragMetrics');
      expect(source).toContain("report += 'Direct probe palpation: '");
      expect(source).toContain('Recorded direct probe palpation evidence');
      expect(source).toContain('Direct probe press-drag-release tracing adds contact coverage, alignment, resistance, deformation, and control feedback.');
      expect(source).toContain('the probe action button instead of tracing a structure');
    }

    resetStemLab();
    loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        _dissLoadedSpec: 'frog',
        activeInstrument: 'probe',
        procedureByLayer: {
          skin: {
            inspected: true,
            incisionStarted: true,
            incisionExtended: true,
            retracted: true,
            pins: [{ x: 0.3, y: 0.5 }, { x: 0.72, y: 0.5 }],
            probed: true,
            probedOrganId: 'heart',
            probeDragMetrics: {
              contactPercent: 86,
              alignment: 93,
              control: 89,
              resistance: 54,
              deformation: 9,
              inputType: 'pen',
            },
          },
        },
      },
    });
    expect(html).toContain('Recorded direct probe palpation evidence');
    expect(html).toContain('Direct probe evidence');
    expect(html).toContain('86% contact');
    expect(html).toContain('Alignment 93%');
    expect(html).toContain('Control 89%');
    expect(html).toContain('Resistance 54/100');
    expect(html).toContain('Deformation 9');
    expect(html).toContain('Input: pen');
    expect(html).toContain('Press a visible structure, trace a short path while monitoring pressure');
  });  it('supports direct dropper press-drag-release hydration with flow and pooling evidence', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function dropperDragAssessment(canvas, point, at)');
      expect(source).toContain('function beginDropperDrag(e)');
      expect(source).toContain('function appendDropperDrag(e)');
      expect(source).toContain('function finishDropperDrag(e, cancelled)');
      expect(source).toContain("labels = { position: 'MOVE TO SPECIMEN'");
      expect(source).toContain("grasp: 'GRASP · DRAG'");
      expect(source).toContain("controlled: 'CONTROLLED FILM'");
      expect(source).toContain('contactPercent: contactPercent');
      expect(source).toContain('flowAlignment: flowAlignment');
      expect(source).toContain('poolingRisk: poolingRisk');
      expect(source).toContain('if (canvas._dropperDrag && canvas._dropperDrag.active) { appendDropperDrag(e); return; }');
      expect(source).toContain("techniquePointerActive && activeInstrument === 'dropper') { beginDropperDrag(e); return; }");
      expect(source).toContain('if (finishDropperDrag(e, false)) return;');
      expect(source).toContain('|| finishDropperDrag(cancelEvent, true)');
      expect(source).toContain('dropperDragMetrics: dropperDragMetrics');
      expect(source).toContain('interactionMetrics: patch.forcepsDragMetrics');
      expect(source).toContain("report += 'Direct dropper hydration: '");
      expect(source).toContain('Recorded direct dropper hydration evidence');
      expect(source).toContain('Direct dropper press-drag-release hydration adds contact coverage, flow alignment, moisture, dose, and pooling feedback.');
      expect(source).toContain('the equivalent technique action button remains available');
      expect(source).toContain('drawDropperSpreadPreview(canvas._toolPointer, canvas);');
      expect(source).toContain('Legacy signature: function drawDropperSpreadPreview(pointer)');
    }

    resetStemLab();
    loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        _dissLoadedSpec: 'frog',
        activeInstrument: 'dropper',
        procedureByLayer: {
          skin: {
            inspected: true,
            incisionStarted: true,
            incisionExtended: true,
            retracted: true,
            surfaceCleared: true,
            dropperPoint: { x: 0.5, y: 0.5 },
            dropperDragMetrics: {
              dose: 1,
              moisture: 58,
              contactPercent: 92,
              flowAlignment: 88,
              control: 91,
              poolingRisk: 18,
              inputType: 'pen',
            },
          },
        },
      },
    });
    expect(html).toContain('Recorded direct dropper hydration evidence');
    expect(html).toContain('Direct dropper evidence');
    expect(html).toContain('92% contact');
    expect(html).toContain('Flow alignment 88%');
    expect(html).toContain('Control 91%');
    expect(html).toContain('Moisture 58%');
    expect(html).toContain('Pooling risk 18/100');
    expect(html).toContain('Input: pen');
    expect(html).toContain('Press the specimen surface, drag a short flow-aligned path');
  });
  it('supports direct wick press-drag-release recovery with pool-edge evidence', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function wickDragAssessment(canvas, point, at)');
      expect(source).toContain('function beginWickDrag(e)');
      expect(source).toContain('function appendWickDrag(e)');
      expect(source).toContain('function finishWickDrag(e, cancelled)');
      expect(source).toContain("labels = { position: 'MOVE TO POOL EDGE'");
      expect(source).toContain("grasp: 'GRASP · DRAG'");
      expect(source).toContain("controlled: 'CONTROLLED RECOVERY'");
      expect(source).toContain('edgeAlignment: edgeAlignment');
      expect(source).toContain('recoveryPercent: recoveryPercent');
      expect(source).toContain('if (canvas._wickDrag && canvas._wickDrag.active) { appendWickDrag(e); return; }');
      expect(source).toContain("techniquePointerActive && activeInstrument === 'wick') { beginWickDrag(e); return; }");
      expect(source).toContain('if (finishWickDrag(e, false)) return;');
      expect(source).toContain('|| finishWickDrag(cancelEvent, true)');
      expect(source).toContain('wickDragMetrics: wickDragMetrics');
      expect(source).toContain("report += 'Direct wick recovery: '");
      expect(source).toContain('Recorded direct wick recovery evidence');
      expect(source).toContain('Direct wick press-drag-release recovery adds pool-edge alignment, contact coverage, recovery distance, and control feedback.');
      expect(source).toContain('drawWickRecoveryPreview(canvas._toolPointer, canvas);');
      expect(source).toContain('the equivalent technique action button remains available');
    }

    resetStemLab();
    loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        _dissLoadedSpec: 'frog',
        activeInstrument: 'wick',
        procedureByLayer: {
          skin: {
            inspected: true,
            incisionStarted: true,
            incisionExtended: true,
            retracted: true,
            surfaceCleared: true,
            dropperPoint: { x: 0.5, y: 0.5 },
            fieldWicked: true,
            wickPoint: { x: 0.56, y: 0.5 },
            wickDragMetrics: {
              recoveryPercent: 74,
              edgeAlignment: 91,
              contactPercent: 94,
              control: 88,
              poolingBefore: 3,
              inputType: 'pen',
            },
          },
        },
      },
    });
    expect(html).toContain('Recorded direct wick recovery evidence');
    expect(html).toContain('Direct wick evidence');
    expect(html).toContain('74% recovery');
    expect(html).toContain('Edge alignment 91%');
    expect(html).toContain('Contact 94%');
    expect(html).toContain('Control 88%');
    expect(html).toContain('Pooling before 3 drops');
    expect(html).toContain('Input: pen');
    expect(html).toContain('Press the saline pool edge, drag outward across a short recovery path');
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
      const centerline = contractFunction(source, 'earthwormCenterlinePoint');
      const anatomyFrame = contractFunction(source, 'earthwormAnatomyFrame', { earthwormCenterlinePoint: centerline });
      const bodyPoint = contractFunction(source, 'earthwormPoint', { W: 500, H: 600, earthwormCenterlinePoint: centerline });
      const bodyWidth = contractFunction(source, 'earthwormWidth', { wormBaseWidth: 500 * .047 });
      const frame = contractFunction(source, 'earthwormFrame', { earthwormPoint: bodyPoint, earthwormWidth: bodyWidth });
      for (const t of [.16, .265, .8]) {
        const f = frame(t), p = centerline(t), shared = anatomyFrame(t, 500, 600);
        expect(f.point).toEqual(shared.point); expect(f.width).toBeCloseTo(shared.width, 10);
        for (const axis of ['tx', 'ty', 'nx', 'ny']) expect(f[axis]).toBeCloseTo(shared[axis], 10);
        expect(f.point.x).toBeCloseTo(p.x * 500, 10); expect(f.point.y).toBeCloseTo(p.y * 600, 10);
        expect(Math.hypot(f.nx, f.ny)).toBeCloseTo(1, 10);
      }
      const points = [], path = { beginPath: vi.fn(), moveTo: (x, y) => points.push({ x, y }), lineTo: (x, y) => points.push({ x, y }), closePath: vi.fn() };
      contractFunction(source, 'traceEarthwormBand', { earthwormFrame: frame })(.05, .93, .84, path);
      expect(points).toHaveLength(26); expect(path.closePath).toHaveBeenCalledOnce();
      expect(points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
      expect(source).toContain('var wormSurfaceGradient = ctx.createLinearGradient');
      expect(source).toContain('The clitellum is a gently expanded glandular saddle');
      expect(source).toContain('Four paired setal positions are suggested');
      const arches = contractFunction(source, 'earthwormAorticGeometry', { earthwormAnatomyFrame: anatomyFrame })(500, 600);
      expect(arches.pairs).toHaveLength(5); expect(arches.pairs.every(pair => pair.arms.length === 2)).toBe(true);
      expect(source.includes("stage: 'rear'") && source.includes("wormArchOptions.stage = 'front';"), 'paired vascular arms render behind and in front of the gut').toBe(true);
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
      // Essentials keeps the tray quiet; Advanced retains the calibrated markings.
      const tickStart = indexOfOrThrow(source, '// Keep fine tray markings with the detailed workspace;', { file: filePath });
      const tickEnd = indexOfOrThrow(source, '[[16,16]', { file: filePath, from: tickStart });
      expect(tickStart).toBeGreaterThan(-1);
      expect(tickEnd).toBeGreaterThan(tickStart);
      const tickSource = sliceBetween(source, '// Keep fine tray markings with the detailed workspace;', '[[16,16]', {
        file: filePath, label: 'detailed tray markings',
      });
      const drawTicks = new Function('ctx', 'W', 'H', 'detailedCanvasHud', tickSource);
      for (const detailed of [false, true]) {
        const tickCtx = { save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fillText: vi.fn() };
        drawTicks(tickCtx, 720, 540, detailed);
        expect(tickCtx.stroke).toHaveBeenCalledTimes(detailed ? 56 : 0);
        expect(tickCtx.fillText.mock.calls.map(call => call[0])).toEqual(detailed ? ['1', '2', '3', '4', '5'] : []);
      }
      expect(source).toContain('A specimen-shaped absorbent pad grounds the body and catches the preservation-fluid meniscus.');
      expect(source).toContain("specimenVariationValue('tray-pad-angle-' + padFiberIndex)");
      expect(source).not.toContain("specimenVariationValue('tissue-stipple-size-' + stip)");
      expect(source).toContain('Compact instrument bay: grounded metal tools replace the earlier faint line-art corner icons.');
      // 2026-09-05: the caption now routes through fillPanelText so the ventral mirror does
      // not reverse it, and the bay anchor mirrors with it to hold the bottom-right corner.
      expect(source).toContain("fillPanelText('INSTRUMENT BAY', instrumentBayX, instrumentBayW, 9,");
      const trayFrameRule = /\.diss-canvas-frame \{([^}]+)\}/.exec(source)?.[1];
      expect(trayFrameRule).toMatch(/background:\s*#[\da-f]+/i); expect(trayFrameRule).toContain('box-shadow: inset');
      expect(source).not.toContain('Math.random() * 2 + 0.5');
      expect(source).toContain('var fishBodyGradient = ctx.createLinearGradient');
      expect(source).toContain('var fishIridescence = ctx.createLinearGradient');
      expect(source).toContain('var fishEyeGradient = ctx.createRadialGradient');
      expect(source).toContain("{ id: 'operculum', name: 'Operculum', x: 0.31, y: 0.44");
      expect(source).toContain('Perch internal cutaway: dorsal buoyancy/excretory organs and ventral viscera share one coelomic cavity.');
      const cavityPath = { beginPath: vi.fn(), moveTo: vi.fn(), bezierCurveTo: vi.fn(), closePath: vi.fn() };
      contractFunction(source, 'tracePerchCoelom', { W: 500, H: 600, cx: 250, cy: 270 })(cavityPath);
      expect(cavityPath.bezierCurveTo).toHaveBeenCalledTimes(4); expect(cavityPath.closePath).toHaveBeenCalledOnce();
      expect(source).toContain('function drawPerchGillArch(archIndex)');
      const renal = contractFunction(source, 'perchRenalGeometry')(500, 600);
      expect(renal.detailed.curves.length).toBeGreaterThan(2); expect(renal.detailed.curves.at(-1)[2]).toEqual(renal.detailed.start);
      expect(source.includes('drawPerchRenalTissue(ctx, {'), 'dorsal renal tissue uses its registered ribbon').toBe(true);
      expect(source).toContain('Swim bladder: a thin-walled dorsal sac with a vascular rete mirabile patch.');
      expect(source).toContain('Rete mirabile is represented as a compact vascular network along the anterior bladder wall.');
      expect(source).toContain('Three overlapping liver lobes occupy the anterior ventral cavity.');
      const caeca = contractFunction(source, 'perchCaecalGeometry')(500, 600);
      expect(caeca.caeca).toHaveLength(3); expect(caeca.caeca.every(pouch => JSON.stringify(pouch.curves.at(-1)[2]) === JSON.stringify(pouch.start))).toBe(true);
      const cardiac = contractFunction(source, 'perchCardiacGeometry')(500, 600);
      for (const part of ['sinus', 'atrium', 'ventricle', 'bulbus']) expect(cardiac[part].curves.at(-1)[2]).toEqual(cardiac[part].start);
      expect(cardiac.outflow.curves.length).toBeGreaterThan(0);
      expect(source).toContain("{ id: 'heart_f', name: 'Heart (2-chamber)', x: 0.32, y: 0.51");
      expect(source).toContain("{ id: 'gonads_f', name: 'Gonads', x: 0.59, y: 0.46");
      const perchCutaway = sliceBetween(source, '// Perch internal cutaway:', "if (activeLayer === 'skeleton')", {
        file: filePath, label: 'perch internal cutaway',
      });
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
      const crayfishRenderer = sliceBetween(source, "spec.bodyShape === 'crayfish'", "spec.bodyShape === 'eye'", {
        file: filePath, label: 'crayfish renderer',
      });
      expect(crayfishRenderer).not.toContain('ctx.rect(segX');
      expect(crayfishRenderer).not.toContain("ctx.fillStyle = 'rgba(255,255,255,0.4)'");
    }
  });
  it('uses species-appropriate sheep-eye layers and an anatomical sheep-heart silhouette', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      const eyeTrace = contractFunction(source, 'traceSheepEyeGlobe').toString();
      expect(eyeTrace).toMatch(/traceContext\s*=\s*traceContext\s*\|\|\s*ctx/);
      const eyeContext = { beginPath: vi.fn(), ellipse: vi.fn() }, openingPath = { ellipse: vi.fn() };
      const traceEye = contractFunction(source, 'traceSheepEyeGlobe', { ctx: eyeContext, eyeCx: 250, eyeCy: 270, eyeRx: 120, eyeRy: 90 });
      traceEye(); traceEye(.8, .7, openingPath);
      // A complete ellipse returns to its start without requiring closePath.
      expect(eyeContext.ellipse.mock.calls).toEqual([[250, 270, 120, 90, -.015, 0, Math.PI * 2]]);
      expect(openingPath.ellipse).toHaveBeenCalledTimes(1);
      const openingEllipse = openingPath.ellipse.mock.calls[0];
      expect(openingEllipse.slice(0, 3)).toEqual([250, 270, 96]);
      expect(openingEllipse[3]).toBeCloseTo(63, 10);
      expect(openingEllipse.slice(4)).toEqual([-.015, 0, Math.PI * 2]);
      expect(eyeContext.beginPath).toHaveBeenCalledTimes(1);
      expect(source.includes('traceSheepEyeGlobe(1, 1, path)'), 'the exposed eye opening uses the same globe contour').toBe(true);
      expect(source).toContain('Tapetum lucidum occupies the dorsal posterior fundus in sheep');
      expect(source).toContain('Corneal dome and anterior chamber form a true bulge');
      expect(source).toContain('The iris is shown as two pigmented leaflets');
      expect(source).toContain('Sheep retinal specialization is represented as an area centralis, not a human fovea/macula.');
      expect(source).toContain("{ id: 'cornea', name: 'Cornea', x: 0.20, y: 0.45");
      expect(source).toContain("{ id: 'tapetum', name: 'Tapetum Lucidum', x: 0.67, y: 0.27");
      const eyeRenderer = sliceBetween(source, '// Sheep eye: layered lateral cross-section', '// Sheep heart: asymmetric ventricular mass', {
        file: filePath, label: 'sheep eye renderer',
      });
      expect(eyeRenderer).not.toContain('Fovea centralis');
      expect(eyeRenderer).not.toContain('Macula lutea region');
      const heartTrace = contractFunction(source, 'traceSheepHeartBody').toString();
      expect(heartTrace).toMatch(/traceContext\s*=\s*traceContext\s*\|\|\s*ctx/); expect(heartTrace).toContain('bezierCurveTo'); expect(heartTrace).toContain('closePath()');
      expect(source.includes('registerAnatomyOpening(traceSheepHeartBody)'), 'cutaway and outer body share the registered heart silhouette').toBe(true);
      expect(source).toContain('var heartMotionActive = livingFunctionEnabled && !dissMotionReduced;');
      expect(source).toContain('var heartScale = heartMotionActive ? 1 + livingWave * 0.018 : 1;');
      expect(source).toContain('Atrial auricles break the silhouette at the base');
      expect(source).toContain('Directional myocardial fibers follow the ventricular spiral');
      expect(source).toContain("if (activeLayer === 'organs' || activeLayer === 'chambers' || activeLayer === 'interior')");
      expect(source).toContain("(activeLayer === 'organs' && d.selectedOrgan === 'conduction')");
      expect(source).toContain("{ id: 'aorta_h', name: 'Aorta', x: 0.54, y: 0.12");
      expect(source).toContain("{ id: 'sup_vena_h', name: 'Cranial (Superior) Vena Cava', x: 0.69, y: 0.14");
      const heartRenderer = sliceBetween(source, '// Sheep heart: asymmetric ventricular mass', '// Conduction system animation', {
        file: filePath, label: 'sheep heart renderer',
      });
      expect(heartRenderer).not.toContain('ctx.moveTo(cx, cy - H * 0.25)');
    }
  });
  it('uses an integrated frog posture with registered external and internal anatomy', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function traceFrogTorso()');
      expect(source).toContain('function drawFrogLimbChain(points, radii, alpha)');
      expect(source).toContain('function drawFrogHindFoot(side, footX, footY, alpha)');
      expect(source).toContain('function drawFrogHindLimb(side, alpha)');
      expect(source).toContain('function drawFrogForelimb(side, alpha)');
      expect(source).toContain('Folded hindlimbs and smaller forelimbs establish the characteristic resting posture.');
      expect(source).toContain('Dorsolateral folds, chromatophores, and moisture all conform to the unified torso.');
      expect(source).toContain('Layered muscle masses replace generic animated stripes.');
      expect(source).toContain('Organs are drawn posterior-to-anterior so overlap conveys their position in the coelom.');
      expect(source).toContain('Three-chambered heart: paired atria over one muscular ventricle and conus.');
      const gastric = contractFunction(source, 'frogGastricGeometry')(500, 600);
      expect(gastric.stomach.curves.at(-1)[2]).toEqual(gastric.stomach.start); expect(gastric.duodenum.curves.length).toBeGreaterThan(0);
      expect(source.includes('drawFrogGastricComplex(ctx, {'), 'gastric body and duodenal turn use the connected complex').toBe(true);
      expect(source).toContain('Bilobed urinary bladder and shared cloacal outlet.');
      expect(source).toContain("{ id: 'tympanum', name: 'Tympanic Membrane', x: 0.65, y: 0.24");
      expect(source).toContain("{ id: 'gastrocnemius', name: 'Gastrocnemius', x: 0.24, y: 0.69");
      expect(source).toContain("{ id: 'heart', name: 'Heart (3-chamber)', x: 0.50, y: 0.35");
      expect(source).toContain("{ id: 'astragalus', name: 'Elongated Ankle Bones', x: 0.27, y: 0.78");
      const frogRenderer = sliceBetween(source, '// Frog: integrated head-and-torso silhouette', '// Earthworm geometry is built', {
        file: filePath, label: 'frog renderer',
      });
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
      const lungTrace = contractFunction(source, 'drawPigLungLobe').toString();
      expect(lungTrace).toContain('form'); expect(lungTrace).toContain('closePath()');
      const thymus = contractFunction(source, 'pigThymicGeometry')(500, 600);
      expect(thymus.region.curves.length).toBeGreaterThan(3); expect(thymus.region.curves.at(-1)[2]).toEqual(thymus.region.start);
      expect(source.includes('drawPigThymicSurface(ctx, {'), 'connected fetal thymic tissue is rendered by its shared contour').toBe(true);
      expect(source).toContain('The diaphragm forms a curved muscular boundary between thorax and abdomen.');
      const lobeStart = source.indexOf('var pigLiverLobes = ['), lobeEnd = source.indexOf('];', lobeStart);
      expect(lobeStart).toBeGreaterThan(0); expect(lobeEnd).toBeGreaterThan(lobeStart);
      const visibleLobes = new Function(source.slice(lobeStart, lobeEnd + 2) + ';return pigLiverLobes;')();
      expect(visibleLobes).toHaveLength(5); expect(visibleLobes.every(lobe => lobe.length === 5 && lobe[2] > 0 && lobe[3] > 0)).toBe(true);
      expect(source).toContain('porcine spiral colon forms a watch-spring coil.');
      expect(source).toContain('Urinary bladder and urachus connect directly toward the umbilical stump.');
      expect(source).toContain('Umbilical vein courses to the liver; paired arteries return alongside the bladder.');
      expect(source).toContain("{ id: 'heart_p', name: 'Heart (4-chamber)', x: 0.44, y: 0.44");
      expect(source).toContain("{ id: 'lg_int_p', name: 'Spiral Colon', x: 0.65, y: 0.53");
    }
  });
});

// Every test here renders the whole 18k-line tool, and several also parse the 6.9MB ui_strings
// catalog. That does not fit vitest's 5s default on a busy disk, and the sibling describe at the
// top of this file already carries a budget; this one was simply missing it, which is why tests
// in this block failed intermittently with "Test timed out in 5000ms".
describe('dissection improved UI render', { timeout: 60000 }, () => {
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  }, 60000);

  it('renders the catalog-backed species-specific specimen descriptions', () => {
    const catalog = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
    const translate = (key, fallback) => {
      const value = key.split('.').reduce((current, part) => current == null ? undefined : current[part], catalog);
      return typeof value === 'string' ? value : fallback;
    };
    const cases = [
      ['pig', 'Mammalian specimen with a four-chambered heart and diaphragm. Major organ systems support comparison with humans, while anatomy, proportions, and development remain species-specific.'],
      ['sheepEye', 'Mammalian eye with cornea, lens, retina, and vitreous humor. Sheep-specific features include a tapetum lucidum and a horizontal retinal specialization rather than a human fovea.'],
      ['sheepHeart', 'Organ dissection — a four-chambered mammalian heart with a body plan useful for comparison to humans. Vessel branching, size, rate, and pressure remain species-specific.'],
    ];

    for (const [specimen, description] of cases) {
      const html = renderTool('dissection', { dissection: { specimen } }, { t: translate });
      expect(html).toContain(description);
    }
  });

  it('renders a normalized, screen-reader-friendly inquiry simulator', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        dissInquiry: {
          specimenSize: 99,
          layerDepth: 0,
          careLevel: 20,
          timePress: '7',
          hypothesis: 'Depth will matter most.',
          stuckRevealed: false,
          understood: true,
          explanation: 'The model trades access against damage risk.',
          log: [{ t: '12:34:56', sz: 99, dp: 0, c: 20, tp: 7 }],
        },
      },
    });
    const page = document.createElement('div');
    page.innerHTML = html;

    const inquiry = page.querySelector('[data-dissection-inquiry]');
    expect(inquiry).not.toBeNull();
    expect(inquiry.querySelector('#diss-inquiry-result').getAttribute('role')).toBe('status');
    expect(inquiry.querySelector('#diss-inquiry-result').getAttribute('aria-live')).toBe('polite');
    expect(inquiry.querySelector('#diss-inquiry-result').textContent).toContain('Modeled outcome: High modeled insight');

    const size = inquiry.querySelector('#diss-inquiry-size');
    const depth = inquiry.querySelector('#diss-inquiry-depth');
    const care = inquiry.querySelector('#diss-inquiry-care');
    const time = inquiry.querySelector('#diss-inquiry-time');
    expect(size.value).toBe('30');
    expect(size.getAttribute('aria-valuetext')).toBe('30 centimeters');
    expect(depth.value).toBe('1');
    expect(care.value).toBe('10');
    expect(time.value).toBe('7');
    for (const control of [size, depth, care, time]) {
      expect(page.querySelector('label[for="' + control.id + '"]')).not.toBeNull();
      expect(control.getAttribute('aria-describedby')).toBe('diss-inquiry-disclaimer');
    }

    const log = inquiry.querySelector('[role="log"]');
    expect(log.getAttribute('aria-label')).toBe('Saved inquiry approaches');
    expect(log.textContent).toContain('size 30 cm');
    expect(inquiry.querySelector('#diss-inquiry-hypothesis').value).toBe('Depth will matter most.');
    expect(page.querySelector('label[for="diss-inquiry-hypothesis"]')).not.toBeNull();
    expect(inquiry.querySelector('[aria-controls="diss-inquiry-open-questions"]').getAttribute('aria-expanded')).toBe('false');
    expect(inquiry.querySelector('[aria-label="Reset inquiry simulator inputs"]').type).toBe('button');
    expect(inquiry.querySelector('#diss-inquiry-disclaimer').textContent).toContain('not lab-grade rubrics or predictions of an actual specimen');
    expect(inquiry.textContent).not.toContain('Specimen destroyed');
  });

  it('migrates legacy procedure layers to stable tissue state when progress loads', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    let latestToolData;
    let root;
    let host;

    // Earlier rendered fixtures can leave a module-owned 120 ms debounced save.
    // Drain it before installing the legacy record this test is responsible for.
    await new Promise((resolve) => setTimeout(resolve, 150));
    localStorage.setItem('dissection_progress_frog', JSON.stringify({
      schemaVersion: 19,
      activeLayer: 'skin',
      anatomicalView: 'ventral',
      specimenCondition: 'preserved',
      variationSeed: 7,
      dissInquiry: {
        specimenSize: 99,
        layerDepth: 0,
        careLevel: 20,
        timePress: '7',
        hypothesis: 'Depth will matter most.',
        stuckRevealed: true,
        understood: true,
        explanation: 'Compare the assumptions.',
        log: [{ t: '12:34:56', sz: 99, dp: 0, c: 20, tp: 7 }],
      },
      procedureByLayer: {
        skin: {
          inspected: true,
          learningChecks: {
            inspect: { predictionCorrect: true, reflectionCorrect: true },
            scalpel: { predictionCorrect: true },
          },
        },
      },
    }));

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: { specimen: 'frog' },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      const migratedTissue = latestToolData.dissection.procedureByLayer.skin.tissueState;
      expect(latestToolData.dissection._dissLoadedSpec).toBe('frog');
      expect(migratedTissue.lastUpdatedAt).toBeGreaterThan(0);
      expect(migratedTissue.lastAction).toBe('prepared');
      expect(migratedTissue.moisture).toBeLessThan(76);
      expect(migratedTissue.consequences).toEqual([]);
      expect(latestToolData.dissection.dissInquiry).toMatchObject({
        specimenSize: 30,
        layerDepth: 1,
        careLevel: 10,
        timePress: 7,
        hypothesis: 'Depth will matter most.',
        stuckRevealed: true,
        understood: true,
        explanation: 'Compare the assumptions.',
      });
      expect(latestToolData.dissection.dissInquiry.log).toHaveLength(1);
      expect(latestToolData.dissection.dissInquiry.log[0]).toMatchObject({
        sz: 30,
        dp: 1,
        c: 10,
        tp: 7,
        state: 'High modeled insight',
      });

      await new Promise((resolve) => setTimeout(resolve, 150));
      const persisted = JSON.parse(localStorage.getItem('dissection_progress_frog'));
      expect(persisted.schemaVersion).toBe(21);
      expect(persisted.procedureByLayer.skin.tissueState.lastUpdatedAt).toBe(migratedTissue.lastUpdatedAt);
      expect(persisted.dissInquiry).toEqual(latestToolData.dissection.dissInquiry);
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem('dissection_progress_frog');
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('preserves a newer protected save until the learner confirms reset', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const protectedRaw = JSON.stringify({
      schemaVersion: 22,
      activeLayer: 'skin',
      futureOnlyField: { mustSurvive: true },
      exploredOrgans: { 'frog|dorsal_skin': true },
    });
    let latestToolData;
    let root;
    let host;

    await new Promise((resolve) => setTimeout(resolve, 150));
    localStorage.setItem('dissection_progress_frog', protectedRaw);

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog',
          activeLayer: 'skin',
          _dissLoadedSpec: 'frog',
          exploredOrgans: { 'frog|tympanum': true },
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 180)); });
      window.dispatchEvent(new Event('pagehide'));

      expect(localStorage.getItem('dissection_progress_frog')).toBe(protectedRaw);
      expect(latestToolData.dissection.exploredOrgans).toEqual({ 'frog|tympanum': true });
      expect(host.querySelector('[data-dissection-save-status]').getAttribute('data-state')).toBe('warning');
      expect(host.querySelector('[data-dissection-save-status]').textContent).toContain('newer lab version');
      expect(host.querySelector('[data-dissection-protected-save]')).not.toBeNull();

      await act(async () => { host.querySelector('#diss-specimen-tab-pig').click(); await Promise.resolve(); });
      expect(latestToolData.dissection.specimen).toBe('frog');
      expect(latestToolData.dissection.procedureFeedback.message).toContain('specimen was not changed');
      expect(localStorage.getItem('dissection_progress_frog')).toBe(protectedRaw);

      await act(async () => {
        host.querySelector('#diss-protected-save-reset').click();
        await Promise.resolve();
      });
      expect(host.querySelector('#diss-reset-confirmation').textContent).toContain('permanently');

      await act(async () => {
        host.querySelector('#diss-reset-cancel').click();
        await Promise.resolve();
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(host.querySelector('#diss-reset-confirmation')).toBeNull();
      const protectedResetButton = host.querySelector('#diss-protected-save-reset');
      expect(protectedResetButton).not.toBeNull();
      expect(document.activeElement).toBe(protectedResetButton);
      expect(localStorage.getItem('dissection_progress_frog')).toBe(protectedRaw);

      await act(async () => {
        protectedResetButton.click();
        await Promise.resolve();
      });
      expect(host.querySelector('#diss-reset-confirmation').textContent).toContain('permanently');

      await act(async () => {
        host.querySelector('#diss-reset-confirm').click();
        await Promise.resolve();
      });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 180)); });

      const freshSave = JSON.parse(localStorage.getItem('dissection_progress_frog'));
      expect(freshSave.schemaVersion).toBe(21);
      expect(freshSave).not.toHaveProperty('futureOnlyField');
      expect(freshSave.exploredOrgans).toEqual({});
      expect(host.querySelector('[data-dissection-protected-save]')).toBeNull();
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem('dissection_progress_frog');
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('keeps malformed saved bytes quarantined instead of overwriting them with defaults', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const malformedRaw = '{"schemaVersion":21,"organNotes":';
    let latestToolData;
    let root;
    let host;

    await new Promise((resolve) => setTimeout(resolve, 150));
    localStorage.setItem('dissection_progress_frog', malformedRaw);

    function Component() {
      const [toolData, setToolData] = React.useState({ dissection: { specimen: 'frog' } });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 200)); });
      window.dispatchEvent(new Event('pagehide'));

      expect(latestToolData.dissection._dissLoadedSpec).toBe('frog');
      expect(localStorage.getItem('dissection_progress_frog')).toBe(malformedRaw);
      expect(host.querySelector('[data-dissection-save-status]').getAttribute('data-state')).toBe('error');
      expect(host.querySelector('[data-dissection-save-status]').textContent).toContain('preserved unchanged');
      expect(host.querySelector('[data-dissection-protected-save]').textContent).toContain('temporary session');
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem('dissection_progress_frog');
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('quarantines empty and unsafe nested save records byte-for-byte', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const cases = [
      { specimen: 'frog', activeLayer: 'skin', raw: '' },
      { specimen: 'pig', activeLayer: 'skin', raw: JSON.stringify({ schemaVersion: 21, annotations: [null], attemptArchive: { skin: [{ actionLog: {} }] } }) },
      { specimen: 'earthworm', activeLayer: 'skin', raw: JSON.stringify({ schemaVersion: 21, procedureByLayer: { skin: { history: ['inspect', { unsafe: true }], actionLog: [] } } }) },
      { specimen: 'perch', activeLayer: 'external', raw: JSON.stringify({ schemaVersion: 21, procedureByLayer: { external: { history: ['inspect'], actionLog: [{ action: 'inspect', label: { unsafe: true }, outcome: 'Recorded', at: 1 }] } } }) },
      { specimen: 'crayfish', activeLayer: 'skin', raw: JSON.stringify({ schemaVersion: 21, procedureByLayer: { skin: { history: [], actionLog: [], learningChecks: { inspect: { predictionFeedback: { unsafe: true } } } } } }) },
      { specimen: 'sheepEye', activeLayer: 'skin', raw: JSON.stringify({ schemaVersion: 21, procedureByLayer: { skin: { history: ['dropper'], actionLog: [{ action: 'dropper', label: 'Hydrate', outcome: 'Recorded', at: 1, undoState: { learningChecks: {} } }] } } }) },
      { specimen: 'sheepHeart', activeLayer: 'skin', raw: JSON.stringify({ schemaVersion: 21, procedureByLayer: { skin: { history: ['pin'], actionLog: [{ action: 'pin', label: 'Pin', outcome: 'Recorded', at: 1, undoState: { pins: {} } }] } } }) },
    ];

    try {
      for (const testCase of cases) {
        const key = 'dissection_progress_' + testCase.specimen;
        localStorage.setItem(key, testCase.raw);
        let root;
        let host;

        function Component() {
          const [toolData, setToolData] = React.useState({
            dissection: {
              specimen: testCase.specimen,
              activeLayer: testCase.activeLayer,
              _dissLoadedSpec: testCase.specimen,
              exploredOrgans: { [testCase.specimen + '|temporary']: true },
            },
          });
          return config.render(makeCtx({ toolData, setToolData }));
        }

        try {
          host = document.createElement('div');
          document.body.appendChild(host);
          root = ReactDOMClient.createRoot(host);
          await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
          await act(async () => { await new Promise((resolve) => setTimeout(resolve, 180)); });
          window.dispatchEvent(new Event('pagehide'));

          expect(localStorage.getItem(key)).toBe(testCase.raw);
          const protectedBanner = host.querySelector('[data-dissection-protected-save]');
          expect(protectedBanner, 'protected banner for ' + testCase.specimen).not.toBeNull();
        } finally {
          if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
          if (host) host.remove();
          localStorage.removeItem(key);
        }
      }
    } finally {
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('preserves a valid save changed in another tab and safely reloads it on retry', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const key = 'dissection_progress_frog';
    const externalRaw = JSON.stringify({
      schemaVersion: 21,
      activeLayer: 'skin',
      exploredOrgans: { 'frog|dorsal_skin': true },
      organNotes: { 'frog|dorsal_skin': 'Observation saved in another tab.' },
      organConfidence: { 'frog|dorsal_skin': 3 },
    });
    let latestToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog',
          exploredOrgans: { 'frog|tympanum': true },
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      localStorage.removeItem(key);
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 180)); });

      const previousRaw = localStorage.getItem(key);
      expect(previousRaw).not.toBeNull();
      localStorage.setItem(key, externalRaw);
      const storageEvent = new Event('storage');
      Object.defineProperty(storageEvent, 'key', { configurable: true, value: key });
      await act(async () => {
        window.dispatchEvent(storageEvent);
        await new Promise((resolve) => setTimeout(resolve, 30));
      });

      expect(localStorage.getItem(key)).toBe(externalRaw);
      expect(host.querySelector('[data-dissection-save-status]').getAttribute('data-state')).toBe('warning');
      expect(host.querySelector('[data-dissection-save-status]').textContent).toContain('another lab, tab, or window');
      expect(host.querySelector('[data-dissection-protected-save]')).not.toBeNull();
      window.dispatchEvent(new Event('pagehide'));
      expect(localStorage.getItem(key)).toBe(externalRaw);

      const protectedRetry = host.querySelector('#diss-protected-save-retry');
      protectedRetry.focus();
      expect(document.activeElement).toBe(protectedRetry);
      await act(async () => {
        protectedRetry.click();
        await Promise.resolve();
      });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 80)); });
      expect(latestToolData.dissection.organNotes['frog|dorsal_skin']).toBe('Observation saved in another tab.');
      expect(latestToolData.dissection.exploredOrgans).toEqual({ 'frog|dorsal_skin': true });
      expect(host.querySelector('[data-dissection-protected-save]')).toBeNull();
      expect(document.activeElement).toBe(host.querySelector('#diss-specimen-tab-frog'));
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem(key);
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('keeps an inactive specimen storage conflict out of the active specimen save UI', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const frogKey = 'dissection_progress_frog';
    const pigKey = 'dissection_progress_pig';
    const externalFrogRaw = JSON.stringify({
      schemaVersion: 21,
      activeLayer: 'skin',
      organNotes: { 'frog|heart': 'Changed in the other frog tab.' },
    });
    let updateToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog',
          exploredOrgans: { 'frog|tympanum': true },
        },
      });
      updateToolData = setToolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem(frogKey);
      localStorage.removeItem(pigKey);
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 180)); });

      await act(async () => {
        host.querySelector('#diss-specimen-tab-pig').click();
        await Promise.resolve();
      });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 220)); });

      const activeRoot = host.querySelector('[data-dissection-root]');
      expect(activeRoot.getAttribute('data-dissection-save-key')).toBe(pigKey);
      const statusBefore = host.querySelector('[data-dissection-save-status]');
      const stateBefore = statusBefore.getAttribute('data-state');
      const textBefore = statusBefore.textContent;
      expect(stateBefore).toBe('saved');

      localStorage.setItem(frogKey, externalFrogRaw);
      const storageEvent = new Event('storage');
      Object.defineProperty(storageEvent, 'key', { configurable: true, value: frogKey });
      await act(async () => {
        window.dispatchEvent(storageEvent);
        await new Promise((resolve) => setTimeout(resolve, 30));
      });

      const statusAfter = host.querySelector('[data-dissection-save-status]');
      expect(statusAfter.getAttribute('data-state')).toBe(stateBefore);
      expect(statusAfter.textContent).toBe(textBefore);
      expect(statusAfter.textContent).not.toContain('another lab, tab, or window');
      expect(host.querySelector('[data-dissection-protected-save]')).toBeNull();
      expect(localStorage.getItem(frogKey)).toBe(externalFrogRaw);

      // A later pig save must remain an ordinary save, not claim that the
      // unrelated frog conflict was "recovered."
      await act(async () => {
        updateToolData((previous) => ({
          ...previous,
          dissection: { ...previous.dissection, timeSpent: 41 },
        }));
        await Promise.resolve();
      });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 180)); });
      expect(host.querySelector('[data-dissection-save-status]').getAttribute('data-state')).toBe('saved');
      expect(host.querySelector('[data-dissection-save-status]').textContent).not.toContain('restored');
      expect(localStorage.getItem(frogKey)).toBe(externalFrogRaw);
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem(frogKey);
      localStorage.removeItem(pigKey);
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('detects a valid external save change even when no storage event arrives', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const key = 'dissection_progress_frog';
    const externalRaw = JSON.stringify({ schemaVersion: 21, activeLayer: 'skin', organNotes: { 'frog|heart': 'External current-version record.' } });
    let updateToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({ dissection: { specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog' } });
      updateToolData = setToolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      localStorage.removeItem(key);
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 180)); });

      localStorage.setItem(key, externalRaw);
      await act(async () => {
        updateToolData((previous) => ({ ...previous, dissection: { ...previous.dissection, timeSpent: 41 } }));
        await Promise.resolve();
      });
      await act(async () => {
        window.dispatchEvent(new Event('pagehide'));
        await new Promise((resolve) => setTimeout(resolve, 30));
      });

      expect(localStorage.getItem(key)).toBe(externalRaw);
      expect(host.querySelector('[data-dissection-save-status]').textContent).toContain('another lab, tab, or window');
      expect(host.querySelector('[data-dissection-protected-save]')).not.toBeNull();
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem(key);
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('keeps temporary work while protected-save retry remains unreadable', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const key = 'dissection_progress_frog';
    const savedRaw = JSON.stringify({
      schemaVersion: 21,
      activeLayer: 'skin',
      exploredOrgans: { 'frog|dorsal_skin': true },
      organNotes: { 'frog|dorsal_skin': 'Recovered protected observation.' },
    });
    const nativeGetItem = Storage.prototype.getItem;
    let readRestored = false;
    let latestToolData;
    let root;
    let host;

    localStorage.setItem(key, savedRaw);
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (requestedKey) {
      if (requestedKey === key) throw new DOMException('Simulated temporary read failure', 'SecurityError');
      return nativeGetItem.call(this, requestedKey);
    });

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog',
          exploredOrgans: { 'frog|tympanum': true },
          organNotes: { 'frog|tympanum': 'Temporary-session observation.' },
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
      expect(host.querySelector('[data-dissection-protected-save]')).not.toBeNull();

      await act(async () => {
        host.querySelector('#diss-protected-save-retry').click();
        await new Promise((resolve) => setTimeout(resolve, 40));
      });
      expect(nativeGetItem.call(localStorage, key)).toBe(savedRaw);
      expect(latestToolData.dissection.organNotes['frog|tympanum']).toBe('Temporary-session observation.');
      expect(host.querySelector('[data-dissection-protected-save]')).not.toBeNull();

      getItemSpy.mockRestore();
      readRestored = true;
      await act(async () => {
        host.querySelector('#diss-protected-save-retry').click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });
      expect(latestToolData.dissection.organNotes['frog|dorsal_skin']).toBe('Recovered protected observation.');
      expect(host.querySelector('[data-dissection-protected-save]')).toBeNull();
    } finally {
      if (!readRestored) getItemSpy.mockRestore();
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem(key);
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('keeps temporary work when transient storage failure recovers with no saved record', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const key = 'dissection_progress_frog';
    const nativeGetItem = Storage.prototype.getItem;
    let storageReadable = false;
    let latestToolData;
    let root;
    let host;

    localStorage.removeItem(key);
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (requestedKey) {
      if (requestedKey === key && !storageReadable) {
        throw new DOMException('Simulated temporary read failure', 'SecurityError');
      }
      return nativeGetItem.call(this, requestedKey);
    });

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog',
          exploredOrgans: { 'frog|tympanum': true },
          organNotes: { 'frog|tympanum': 'Keep this temporary observation.' },
          organConfidence: { 'frog|tympanum': 3 },
          timeSpent: 37,
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
      expect(host.querySelector('[data-dissection-protected-save]')).not.toBeNull();
      expect(nativeGetItem.call(localStorage, key)).toBeNull();

      storageReadable = true;
      const emptyRetry = host.querySelector('#diss-protected-save-retry');
      emptyRetry.focus();
      await act(async () => {
        emptyRetry.click();
        await Promise.resolve();
      });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 220)); });

      expect(latestToolData.dissection._dissLoadedSpec).toBe('frog');
      expect(document.activeElement).toBe(host.querySelector('#diss-specimen-tab-frog'));
      expect(latestToolData.dissection._dissSaveRetrying).toBe(false);
      expect(latestToolData.dissection.exploredOrgans).toEqual({ 'frog|tympanum': true });
      expect(latestToolData.dissection.organNotes).toEqual({ 'frog|tympanum': 'Keep this temporary observation.' });
      expect(latestToolData.dissection.organConfidence).toEqual({ 'frog|tympanum': 3 });
      expect(latestToolData.dissection.procedureFeedback.message).toContain('Temporary-session work was kept');
      expect(host.querySelector('[data-dissection-protected-save]')).toBeNull();

      const persisted = JSON.parse(nativeGetItem.call(localStorage, key));
      expect(persisted.exploredOrgans).toEqual({ 'frog|tympanum': true });
      expect(persisted.organNotes).toEqual({ 'frog|tympanum': 'Keep this temporary observation.' });
      expect(persisted.organConfidence).toEqual({ 'frog|tympanum': 3 });
      expect(persisted.timeSpent).toBe(37);
    } finally {
      getItemSpy.mockRestore();
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem(key);
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('flushes rapid specimen switches and cancels stale pre-reset writes', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    let latestToolData;
    let root;
    let host;

    // Let any previous module instance finish its short debounce before this
    // test takes ownership of the two specimen keys.
    await new Promise((resolve) => setTimeout(resolve, 150));
    localStorage.removeItem('dissection_progress_frog');
    localStorage.removeItem('dissection_progress_pig');
    localStorage.setItem('dissection_progress_pig', JSON.stringify({
      schemaVersion: 21,
      activeLayer: 'skin',
      dissInquiry: {
        specimenSize: 12,
        layerDepth: 2,
        careLevel: 8,
        timePress: 3,
        hypothesis: 'Pig inquiry record',
        stuckRevealed: false,
        understood: false,
        explanation: '',
        log: [],
      },
    }));

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog',
          activeLayer: 'skin',
          _dissLoadedSpec: 'frog',
          toolbarToolsOpen: true,
          exploredOrgans: { 'frog|dorsal_skin': true },
          dissInquiry: {
            specimenSize: 9,
            layerDepth: 2,
            careLevel: 7,
            timePress: 4,
            hypothesis: 'Frog inquiry record',
            stuckRevealed: false,
            understood: false,
            explanation: '',
            log: [],
          },
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });

      const pigTab = host.querySelector('#diss-specimen-tab-pig');
      expect(pigTab).not.toBeNull();
      await act(async () => {
        pigTab.click();
        await Promise.resolve();
      });

      const savedFrog = JSON.parse(localStorage.getItem('dissection_progress_frog'));
      expect(savedFrog.dissInquiry.hypothesis).toBe('Frog inquiry record');
      expect(savedFrog.exploredOrgans).toEqual({ 'frog|dorsal_skin': true });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(latestToolData.dissection.specimen).toBe('pig');
      expect(latestToolData.dissection._dissLoadedSpec).toBe('pig');
      expect(latestToolData.dissection.dissInquiry.hypothesis).toBe('Pig inquiry record');

      await act(async () => {
        host.querySelector('#diss-reset-specimen').click();
        await Promise.resolve();
      });
      await act(async () => {
        host.querySelector('#diss-reset-confirm').click();
        await Promise.resolve();
      });
      await new Promise((resolve) => setTimeout(resolve, 150));

      const resetPig = JSON.parse(localStorage.getItem('dissection_progress_pig'));
      expect(resetPig.schemaVersion).toBe(21);
      expect(resetPig.dissInquiry.hypothesis).toBe('');
      expect(resetPig.dissInquiry.log).toEqual([]);
      expect(resetPig.exploredOrgans).toEqual({});
      expect(JSON.parse(localStorage.getItem('dissection_progress_frog')).dissInquiry.hypothesis).toBe('Frog inquiry record');
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem('dissection_progress_frog');
      localStorage.removeItem('dissection_progress_pig');
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('cancels a delayed layer reveal before switching specimens', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const addToast = vi.fn();
    const awardXP = vi.fn();
    let latestToolData;
    let root;
    let host;

    await new Promise((resolve) => setTimeout(resolve, 150));
    localStorage.removeItem('dissection_progress_frog');
    localStorage.removeItem('dissection_progress_pig');

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog',
          activeLayer: 'skin',
          anatomicalView: 'ventral',
          _dissLoadedSpec: 'frog',
          activeInstrument: 'probe',
          exploredOrgans: {
            'frog|dorsal_skin': true,
            'frog|ventral_skin': true,
            'frog|tympanum': true,
            'frog|nictitating': true,
          },
          organNotes: {
            'frog|dorsal_skin': 'Protective pigmented surface.',
            'frog|ventral_skin': 'Thin vascular surface.',
            'frog|tympanum': 'External sound membrane.',
            'frog|nictitating': 'Protective transparent eyelid.',
          },
          organConfidence: {
            'frog|dorsal_skin': 2,
            'frog|ventral_skin': 2,
            'frog|tympanum': 2,
            'frog|nictitating': 2,
          },
          procedureByLayer: {
            skin: {
              inspected: true,
              incisionStarted: true,
              incisionExtended: true,
              retracted: true,
              pins: [{ x: 0.3, y: 0.5 }, { x: 0.7, y: 0.5 }],
              probed: true,
              probedOrganId: 'ventral_skin',
            },
          },
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData, addToast, awardXP }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });

      const revealCard = host.querySelector('[data-next-action="peel-layer"]');
      const revealButton = revealCard?.querySelector('.diss-next-action__primary');
      expect(revealButton).not.toBeNull();
      await act(async () => {
        revealButton.click();
        await Promise.resolve();
      });
      expect(latestToolData.dissection._incisionAnim?.active).toBe(true);

      await act(async () => {
        host.querySelector('#diss-specimen-tab-pig').click();
        await Promise.resolve();
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 700));
      });

      expect(latestToolData.dissection.specimen).toBe('pig');
      expect(latestToolData.dissection.activeLayer).toBe('skin');
      expect(latestToolData.dissection.revealedLayers).toEqual({});
      expect(latestToolData.dissection._incisionAnim).toBeNull();
      expect(latestToolData.dissection._layerTransition).toBeNull();
      expect(awardXP).not.toHaveBeenCalled();
      expect(addToast).not.toHaveBeenCalledWith(expect.stringContaining('Layer revealed'), 'success');

      await new Promise((resolve) => setTimeout(resolve, 150));
      const savedPig = JSON.parse(localStorage.getItem('dissection_progress_pig'));
      expect(savedPig.revealedLayers).toEqual({});
      expect(savedPig.activeLayer).toBe('skin');
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem('dissection_progress_frog');
      localStorage.removeItem('dissection_progress_pig');
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('preserves text when evidence storage is limited, surfaces failures, and reports recovery', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const nativeSetItem = Storage.prototype.setItem;
    let storageMode = 'reject-images';
    let requestSave;
    let latestToolData;
    let root;
    let host;

    await new Promise((resolve) => setTimeout(resolve, 150));
    localStorage.removeItem('dissection_progress_frog');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (String(key) === 'dissection_progress_frog') {
        const record = JSON.parse(String(value));
        const containsImages = Array.isArray(record.visualEvidence) && record.visualEvidence.length > 0;
        if (storageMode === 'reject-all' || (storageMode === 'reject-images' && containsImages)) {
          throw new DOMException('Simulated local storage limit', 'QuotaExceededError');
        }
      }
      return nativeSetItem.call(this, key, value);
    });

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog',
          activeLayer: 'skin',
          _dissLoadedSpec: 'frog',
          exploredOrgans: { 'frog|dorsal_skin': true },
          dissInquiry: {
            specimenSize: 8,
            layerDepth: 2,
            careLevel: 7,
            timePress: 4,
            hypothesis: 'Initial storage test',
            stuckRevealed: false,
            understood: false,
            explanation: '',
            log: [],
          },
          visualEvidence: [
            { id: 1, image: 'data:image/jpeg;base64,QUFB', layer: 'skin' },
            { id: 2, image: 'data:image/jpeg;base64,QkJC', layer: 'skin' },
          ],
          referenceEvidenceId: 1,
          splitComparison: true,
        },
      });
      requestSave = (hypothesis) => setToolData((previous) => ({
        ...previous,
        dissection: {
          ...previous.dissection,
          dissInquiry: { ...previous.dissection.dissInquiry, hypothesis },
        },
      }));
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });

      let persisted = JSON.parse(localStorage.getItem('dissection_progress_frog'));
      expect(persisted.dissInquiry.hypothesis).toBe('Initial storage test');
      expect(persisted.exploredOrgans).toEqual({ 'frog|dorsal_skin': true });
      expect(persisted.visualEvidence).toEqual([]);
      let saveStatus = host.querySelector('[data-dissection-save-status]');
      expect(saveStatus.getAttribute('data-state')).toBe('warning');
      expect(saveStatus.textContent).toContain('Progress and notes saved');
      expect(saveStatus.textContent).toContain('evidence images could not be stored');

      await act(async () => {
        host.querySelector('#diss-specimen-tab-pig').click();
        await Promise.resolve();
      });
      expect(latestToolData.dissection.specimen).toBe('frog');
      expect(latestToolData.dissection.visualEvidence).toHaveLength(2);
      expect(host.querySelector('[data-diss-tool-status]').textContent).toContain('specimen was not changed');

      storageMode = 'reject-all';
      await act(async () => {
        requestSave('Attempt while unavailable');
        await Promise.resolve();
      });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });

      saveStatus = host.querySelector('[data-dissection-save-status]');
      expect(saveStatus.getAttribute('data-state')).toBe('error');
      expect(saveStatus.textContent).toContain('Progress is not saved in this browser');
      expect(JSON.parse(localStorage.getItem('dissection_progress_frog')).dissInquiry.hypothesis).toBe('Initial storage test');

      storageMode = 'normal';
      await act(async () => {
        requestSave('Recovered storage test');
        await Promise.resolve();
      });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });

      persisted = JSON.parse(localStorage.getItem('dissection_progress_frog'));
      expect(persisted.dissInquiry.hypothesis).toBe('Recovered storage test');
      expect(persisted.visualEvidence).toHaveLength(2);
      saveStatus = host.querySelector('[data-dissection-save-status]');
      expect(saveStatus.getAttribute('data-state')).toBe('recovered');
      expect(saveStatus.textContent).toContain('Full progress saving has been restored');

      await act(async () => {
        host.querySelector('#diss-specimen-tab-pig').click();
        await Promise.resolve();
      });
      expect(latestToolData.dissection.specimen).toBe('pig');
    } finally {
      storageMode = 'normal';
      setItemSpy.mockRestore();
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem('dissection_progress_frog');
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('blocks silent evidence rollover and safely frees notebook storage without losing other progress', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    let latestToolData;
    let root;
    let host;

    await new Promise((resolve) => setTimeout(resolve, 150));
    localStorage.removeItem('dissection_progress_frog');
    const evidenceFrames = Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      image: 'data:image/jpeg;base64,' + String(index + 1),
      layer: 'skin',
      view: index % 2 ? 'ventral' : 'dorsal',
      condition: 'standard',
      techniqueScore: 70 + index,
    }));

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog',
          activeLayer: 'skin',
          _dissLoadedSpec: 'frog',
          workspaceMode: 'advanced',
          toolbarToolsOpen: true,
          visualEvidence: evidenceFrames,
          referenceEvidenceId: 1,
          splitComparison: true,
          organNotes: { 'frog|dorsal_skin': 'Preserve this evidence note.' },
          exploredOrgans: { 'frog|dorsal_skin': true },
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });

      const captureButton = host.querySelector('[data-evidence-capture]');
      expect(captureButton.textContent).toContain('Evidence full');
      expect(captureButton.getAttribute('aria-describedby')).toBe('diss-evidence-capacity');
      expect(host.querySelector('#diss-evidence-capacity').textContent).toContain('no frame will be replaced automatically');
      expect(host.querySelector('[data-evidence-id="1"] strong').textContent).toBe('Skin');

      await act(async () => {
        captureButton.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(latestToolData.dissection.visualEvidence).toHaveLength(6);
      expect(latestToolData.dissection.procedureFeedback.message).toContain('no saved frame was replaced');

      await act(async () => {
        host.querySelector('[data-evidence-remove-id="1"]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(latestToolData.dissection.evidenceRemovePendingId).toBe(1);
      const confirmRemove = host.querySelector('[data-evidence-confirm-remove-id="1"]');
      expect(confirmRemove).not.toBeNull();

      await act(async () => {
        confirmRemove.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(latestToolData.dissection.visualEvidence).toHaveLength(5);
      expect(latestToolData.dissection.referenceEvidenceId).toBe(6);
      expect(latestToolData.dissection.splitComparison).toBe(true);
      expect(latestToolData.dissection.organNotes).toEqual({ 'frog|dorsal_skin': 'Preserve this evidence note.' });

      await act(async () => {
        host.querySelector('#diss-evidence-clear-all').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(latestToolData.dissection.evidenceClearPending).toBe(true);
      const confirmClear = host.querySelector('#diss-evidence-confirm-clear');
      expect(confirmClear).not.toBeNull();

      await act(async () => {
        confirmClear.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(latestToolData.dissection.visualEvidence).toEqual([]);
      expect(latestToolData.dissection.referenceEvidenceId).toBeNull();
      expect(latestToolData.dissection.splitComparison).toBe(false);
      expect(latestToolData.dissection.organNotes).toEqual({ 'frog|dorsal_skin': 'Preserve this evidence note.' });
      expect(latestToolData.dissection.procedureFeedback.message).toContain('Notes and other specimen progress were preserved');

      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
      const persisted = JSON.parse(localStorage.getItem('dissection_progress_frog'));
      expect(persisted.visualEvidence).toEqual([]);
      expect(persisted.organNotes).toEqual({ 'frog|dorsal_skin': 'Preserve this evidence note.' });
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem('dissection_progress_frog');
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('flushes pending progress on pagehide before the debounce can expire', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    let root;
    let host;

    await new Promise((resolve) => setTimeout(resolve, 150));
    localStorage.removeItem('dissection_progress_frog');
    vi.useFakeTimers();

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog',
          activeLayer: 'skin',
          _dissLoadedSpec: 'frog',
          dissInquiry: {
            specimenSize: 8,
            layerDepth: 1,
            careLevel: 5,
            timePress: 5,
            hypothesis: 'Must survive pagehide',
            stuckRevealed: false,
            understood: false,
            explanation: '',
            log: [],
          },
          organNotes: { dorsal_skin: 'Close-safe note' },
        },
      });
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });

      expect(localStorage.getItem('dissection_progress_frog')).toBeNull();
      window.dispatchEvent(new Event('pagehide'));

      const persisted = JSON.parse(localStorage.getItem('dissection_progress_frog'));
      expect(persisted.dissInquiry.hypothesis).toBe('Must survive pagehide');
      expect(persisted.organNotes).toEqual({ dorsal_skin: 'Close-safe note' });
      expect(host.querySelector('[data-dissection-save-status]').getAttribute('data-state')).toBe('saved');
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      vi.useRealTimers();
      localStorage.removeItem('dissection_progress_frog');
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('keeps a direct scalpel gesture active across a harmless React re-render', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const dateSpy = vi.spyOn(Date, 'now');
    const config = window.StemLab._registry.dissection;
    let latestToolData;
    let requestHarmlessRender;
    let root;
    let host;
    let now = 1000;
    dateSpy.mockImplementation(() => now);

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog',
          activeLayer: 'skin',
          anatomicalView: 'ventral',
          procedureMode: 'independent',
          activeInstrument: 'scalpel',
          procedureScenario: 'precision-access',
          _dissLoadedSpec: 'frog',
          reducedMotion: true,
          procedureByLayer: {
            skin: {
              inspected: true,
              incisionStarted: false,
              incisionExtended: false,
              retracted: false,
              pins: [],
              probed: false,
              errors: 0,
              history: ['inspect'],
              actionLog: [],
              cautionLog: [],
              learningChecks: {
                inspect: { predictionCorrect: true, reflectionCorrect: true },
                scalpel: { predictionCorrect: true },
              },
            },
          },
        },
      });
      latestToolData = toolData;
      requestHarmlessRender = () => setToolData((previous) => ({
        ...previous,
        dissection: { ...previous.dissection, hoveredOrgan: 'dorsal_skin' },
      }));
      return config.render(makeCtx({ toolData, setToolData }));
    }

    function pointerEvent(type, x, y, buttons) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      const values = {
        pointerId: 7,
        pointerType: 'mouse',
        isPrimary: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons,
        pressure: buttons ? 0.5 : 0,
      };
      Object.entries(values).forEach(([key, value]) => {
        Object.defineProperty(event, key, { configurable: true, value });
      });
      return event;
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });

      const canvas = host.querySelector('#diss-canvas');
      canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 500, height: 600, right: 500, bottom: 600 });
      canvas.setPointerCapture = vi.fn();
      canvas.hasPointerCapture = vi.fn(() => false);
      canvas.releasePointerCapture = vi.fn();

      const equivalentAction = host.querySelector('.diss-procedure__next');
      expect(equivalentAction.disabled).toBe(false);
      expect(equivalentAction.getAttribute('aria-label')).toContain('Ready to record the equivalent technique action');
      expect(equivalentAction.getAttribute('aria-label')).not.toContain('complete prediction and readiness checks first');

      await act(async () => {
        canvas.dispatchEvent(pointerEvent('pointerdown', 245, 174, 1));
        await Promise.resolve();
      });

      now = 2000;
      await act(async () => {
        requestHarmlessRender();
        await Promise.resolve();
      });

      await act(async () => {
        for (let step = 1; step <= 20; step += 1) {
          const progress = step / 20;
          canvas.dispatchEvent(pointerEvent('pointermove', 245 + 5 * progress, 174 + 246 * progress, 1));
        }
        now = 3000;
        canvas.dispatchEvent(pointerEvent('pointerup', 250, 420, 0));
        await Promise.resolve();
      });

      const procedure = latestToolData.dissection.procedureByLayer.skin;
      expect(procedure.incisionStarted).toBe(true);
      expect(procedure.actionLog.at(-1).action).toBe('scalpel');
      expect(procedure.incisionMetrics.precision).toBeGreaterThanOrEqual(75);
      expect(latestToolData.dissection.procedureFeedback.tone).toBe('success');
    } finally {
      dateSpy.mockRestore();
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem('dissection_progress_frog');
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

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

    const shell = document.createElement('div');
    shell.innerHTML = html;
    const selection = shell.querySelector('[data-dissection-selection="true"]');
    const observePrompt = shell.querySelector('#diss-observe-first-dorsal_skin');
    const reference = shell.querySelector('details[data-selection-reference="true"]');
    const evidence = shell.querySelector('[data-dissection-evidence="true"]');

    expect(selection).not.toBeNull();
    expect(observePrompt?.textContent).toContain('Observe first');
    expect(observePrompt.compareDocumentPosition(reference) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(reference?.open).toBe(false);
    expect(reference?.querySelector('summary')?.textContent).toBe('Check reference and connections');
    expect(reference?.querySelector('.diss-selection-summary')?.textContent).toContain('Green-brown pigmented surface');
    expect(reference?.textContent).toContain('Human/clinical connection');
    expect(reference?.textContent).toContain('Specimen layer:Skin');
    expect(reference?.contains(evidence)).toBe(false);
    expect(reference.compareDocumentPosition(evidence) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(evidence?.querySelector('textarea')?.getAttribute('aria-describedby')).toBe(
      'diss-observe-first-dorsal_skin diss-evidence-help-dorsal_skin diss-note-status-dorsal_skin',
    );
    expect(selection?.textContent).not.toMatch(/x:\d+% y:\d+%/);
  });

  it('offers an ungraded evidence review without inferring explanation quality from words', () => {
    function evidence(note, confidence) {
      const host=document.createElement('div');
      host.innerHTML=renderTool('dissection',{dissection:{specimen:'frog',activeLayer:'skin',selectedOrgan:'dorsal_skin',_dissLoadedSpec:'frog',organNotes:{'frog|dorsal_skin':note},organConfidence:{'frog|dorsal_skin':confidence}}});
      return host.querySelector('[data-dissection-evidence]');
    }
    const empty=evidence('',0);
    expect(empty.querySelector('[data-evidence-draft]').dataset.evidenceDraft).toBe('empty');
    expect(empty.textContent).toContain('Note not started');
    expect(empty.textContent).toContain('Confidence not rated');
    expect(empty.querySelector('[data-evidence-countercheck]')).not.toBeNull();
    expect(empty.querySelector('[data-evidence-starter="reference"]')).not.toBeNull();
    expect(empty.querySelectorAll('[data-confidence-level]')).toHaveLength(3);
    for(const note of ['I observed. It is located. This supports the identification because.', '表面有斑点。', 'Moist, pigmented surface near the tympanum.']) {
      const draft=evidence(note,3);
      expect(draft.querySelector('[data-evidence-draft]').dataset.evidenceDraft).toBe('present');
      expect(draft.textContent).toContain('Draft present · review needed');
      expect(draft.textContent).toContain('Confidence: Confident');
      expect(draft.querySelector('[role="progressbar"]')).toBeNull();
      expect(draft.querySelector('[data-evidence-readiness]')).toBeNull();
      expect(draft.textContent).not.toMatch(/elements included|4-of-4|Your observation, location/);
      expect([...draft.querySelectorAll('.diss-draft-review__steps strong')].map(el=>el.textContent)).toEqual(['Observe','Locate','Explain']);
      expect(draft.textContent).toContain('separate its claims from what you saw');
      expect(draft.textContent).toContain('does not verify the explanation');
      expect(draft.querySelector('textarea').value).toBe(note);
    }
    expect(evidence('   ',2).textContent).toContain('Note not started');
    expect(evidence('',2).textContent).toContain('Confidence: Somewhat sure');
  });

  it('updates labeled confidence choices and appends the optional countercheck once', async () => {
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const readyNote = 'I observed a moist, pigmented surface. It is located on the dorsal side near the tympanum. This supports the identification because it covers the back.';
    const countercheckText = 'I would revise this identification if I observed ';
    let latestToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog',
          activeLayer: 'skin',
          selectedOrgan: 'dorsal_skin',
          _dissLoadedSpec: 'frog',
          workspaceMode: 'advanced',
          toolbarToolsOpen: true,
          exploredOrgans: { 'frog|dorsal_skin': true },
          organNotes: { 'frog|dorsal_skin': readyNote },
          organConfidence: { 'frog|dorsal_skin': 3 },
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });

      const confidenceInputs = Array.from(host.querySelectorAll('input[data-confidence-level]'));
      expect(confidenceInputs).toHaveLength(3);
      expect(confidenceInputs.every((input) => input.type === 'radio')).toBe(true);
      expect(confidenceInputs.filter((input) => input.checked)).toHaveLength(1);
      expect(host.querySelector('input[aria-label="Confidence 3 of 3: Confident"]')?.checked).toBe(true);

      const somewhatSure = host.querySelector('input[aria-label="Confidence 2 of 3: Somewhat sure"]');
      await act(async () => {
        somewhatSure.click();
        await Promise.resolve();
      });

      expect(latestToolData.dissection.organConfidence['frog|dorsal_skin']).toBe(2);
      expect(host.querySelector('input[aria-label="Confidence 2 of 3: Somewhat sure"]')?.checked).toBe(true);
      expect(host.querySelector('.diss-confidence-cue')?.textContent).toContain('Check one more distinguishing feature or anatomical relationship.');

      const countercheck = host.querySelector('details[data-evidence-countercheck="true"]');
      expect(countercheck).not.toBeNull();
      countercheck.open = true;
      const addCountercheck = host.querySelector('button[data-evidence-countercheck-action="true"]');
      expect(addCountercheck.disabled).toBe(false);
      await act(async () => {
        addCountercheck.click();
        await Promise.resolve();
      });

      const savedNote = latestToolData.dissection.organNotes['frog|dorsal_skin'];
      expect(savedNote.split(countercheckText).length - 1).toBe(1);
      expect(host.querySelector('#diss-note-dorsal_skin')?.value).toContain(countercheckText);
      expect(host.querySelector('[data-evidence-draft]')?.getAttribute('data-evidence-draft')).toBe('present');
      expect(host.querySelector('button[data-evidence-countercheck-action="true"]')?.disabled).toBe(true);
      expect(host.querySelector('.diss-countercheck__status')?.textContent).toContain('Finish the countercheck sentence');

      const reportButton = host.querySelector('button[aria-label="Copy lab report to clipboard"]');
      await act(async () => {
        reportButton.click();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(writeText).toHaveBeenCalledTimes(1);
      const report = writeText.mock.calls[0][0];
      expect(report).toContain('Confidence self-rating: Somewhat sure (2 of 3)');
      expect(report).toContain(countercheckText);
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem('dissection_progress_frog');
      if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
      else delete navigator.clipboard;
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('keeps focus continuous while structure-specific references reset only when the structure changes', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    let latestToolData;
    let root;
    let host;

    await new Promise((resolve) => setTimeout(resolve, 150));
    localStorage.removeItem('dissection_progress_frog');

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog',
          activeLayer: 'skin',
          selectedOrgan: null,
          _dissLoadedSpec: 'frog',
          workspaceMode: 'essentials',
          exploredOrgans: {
            'frog|dorsal_skin': true,
            'frog|ventral_skin': true,
          },
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    async function flushFocusTimer() {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });

      const dorsalDirectoryButton = host.querySelector('#diss-organ-dorsal_skin');
      expect(dorsalDirectoryButton).not.toBeNull();
      dorsalDirectoryButton.focus();
      expect(document.activeElement).toBe(dorsalDirectoryButton);

      await act(async () => {
        dorsalDirectoryButton.click();
        await Promise.resolve();
      });
      await flushFocusTimer();

      expect(latestToolData.dissection.selectedOrgan).toBe('dorsal_skin');
      let selectionTitle = host.querySelector('#diss-selection-title');
      expect(selectionTitle?.textContent).toBe('Dorsal Skin');
      expect(document.activeElement).toBe(host.querySelector('#diss-note-dorsal_skin'));

      const dorsalReference = host.querySelector('details[data-selection-reference="true"]');
      expect(dorsalReference).not.toBeNull();
      expect(dorsalReference.open).toBe(false);
      dorsalReference.open = true;

      const somewhatSure = host.querySelector('input[aria-label="Confidence 2 of 3: Somewhat sure"]');
      await act(async () => {
        somewhatSure.click();
        await Promise.resolve();
      });
      const sameStructureReference = host.querySelector('details[data-selection-reference="true"]');
      expect(sameStructureReference).toBe(dorsalReference);
      expect(sameStructureReference.open).toBe(true);

      const nextBefore = host.querySelector('button[aria-label="Next structure"]');
      nextBefore.focus();
      await act(async () => {
        nextBefore.click();
        await Promise.resolve();
      });

      expect(latestToolData.dissection.selectedOrgan).toBe('ventral_skin');
      selectionTitle = host.querySelector('#diss-selection-title');
      expect(selectionTitle?.textContent).toBe('Ventral Skin');

      const nextAfter = host.querySelector('button[aria-label="Next structure"]');
      expect(nextAfter).toBe(nextBefore);
      expect(document.activeElement).toBe(nextAfter);

      const positionStatus = host.querySelector('.diss-selection-position[role="status"]');
      expect(positionStatus?.getAttribute('aria-live')).toBe('polite');
      expect(positionStatus?.getAttribute('aria-atomic')).toBe('true');
      expect(positionStatus?.getAttribute('aria-label')).toBe('Ventral Skin, structure 2 of 4');

      const ventralReference = host.querySelector('details[data-selection-reference="true"]');
      expect(ventralReference).not.toBe(dorsalReference);
      expect(ventralReference.open).toBe(false);

      const closeButton = host.querySelector('button[aria-label="Back to structure directory"]');
      closeButton.focus();
      await act(async () => {
        closeButton.click();
        await Promise.resolve();
      });
      await flushFocusTimer();

      expect(latestToolData.dissection.selectedOrgan).toBeNull();
      const returnedDirectoryButton = host.querySelector('#diss-organ-ventral_skin');
      expect(returnedDirectoryButton).not.toBeNull();
      expect(document.activeElement).toBe(returnedDirectoryButton);
      expect(host.querySelector('details[data-selection-reference="true"]')).toBeNull();
      expect(host.querySelector('#diss-organ-search')).not.toBeNull();
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem('dissection_progress_frog');
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('projects assessment location clues into the displayed anatomical view', () => {
    const renderLocationView = (anatomicalView) => renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        anatomicalView,
        _dissLoadedSpec: 'frog',
        quizMode: true,
        quizReviewMode: true,
        quizReviewQueue: ['dorsal_skin', 'ventral_skin', 'tympanum', 'nictitating'],
        quizAnswerMode: 'choices',
        quizIdx: 1,
        quizSeed: 7,
        variationSeed: 1,
      },
    });

    const dorsalHtml = renderLocationView('dorsal');
    const ventralHtml = renderLocationView('ventral');
    const lateralHtml = renderLocationView('lateral');

    expect(dorsalHtml).toContain('upper-right region of this view');
    expect(ventralHtml).toContain('upper-left region of this view');
    expect(ventralHtml).not.toContain('upper-right region of this view');
    expect(lateralHtml).toContain('Function clue:');
    expect(lateralHtml).not.toContain('upper-central region of this view');
  });

  it('defaults to an Essentials workspace while preserving an explicit Advanced workspace', () => {
    const essentialsHtml = renderTool('dissection', {
      dissection: { specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog' },
    });
    const advancedHtml = renderTool('dissection', {
      dissection: { specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog', workspaceMode: 'advanced' },
    });

    expect(essentialsHtml).toContain('data-workspace-mode="essentials"');
    expect(essentialsHtml).toContain('Essentials workspace');
    expect(essentialsHtml).toContain('Procedure practice');
    expect(essentialsHtml).toContain('diss-advanced-only');
    expect(essentialsHtml).toContain('aria-label="Dissection instruments"');
    expect(advancedHtml).toContain('data-workspace-mode="advanced"');
    expect(advancedHtml).toContain('Advanced workspace');
    expect(advancedHtml).toContain('Free explore');

    document.body.innerHTML = essentialsHtml;
    expect(getComputedStyle(document.querySelector('.diss-scenario-console')).display).toBe('none');
    expect(getComputedStyle(document.querySelector('button[aria-label="Lab tool options"]')).display).toBe('none');
    expect(document.querySelector('[aria-label="Dissection instruments"]')).not.toBeNull();
    document.body.innerHTML = advancedHtml;
    expect(getComputedStyle(document.querySelector('.diss-scenario-console')).display).not.toBe('none');
    document.body.innerHTML = '';
  }, 60000);

  it('deactivates hidden challenge state when switching from Advanced to Essentials', async () => {
    const canvasContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const announceToSR = vi.fn();
    let latestToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog',
          workspaceMode: 'advanced', procedureMode: 'independent', toolbarStudyOpen: true,
          procedureScenario: 'restricted-tray', scenarioStartedAt: 1000,
          scenarioTimeRemaining: 180, activeInstrument: 'dropper',
          practicalMode: true, practicalTimer: 75, practicalEndsAt: Date.now() + 75000,
          practicalTargetIds: ['dorsal_skin'], quizMode: true, labelMode: 'hidden', _prePracticalLabelMode: 'show',
          crossSectionMode: true, relationshipMode: true, beforeTechniqueView: true,
          splitComparison: true, referenceEvidenceId: 1,
          visualEvidence: [{ id: 1, image: 'data:image/jpeg;base64,eA==', layer: 'skin' }],
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData, announceToSR }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });

      expect(host.querySelector('[aria-label="End timed practical"]')).not.toBeNull();
      expect(host.querySelector('#diss-practical-time-status[role="timer"]')?.getAttribute('aria-live')).toBe('off');
      expect(host.querySelector('#diss-practical-time-status')?.textContent).toMatch(/Timed practical: 1 minute (?:1[0-5]|[0-9]) seconds remaining/);

      const essentialsButton = Array.from(host.querySelectorAll('.diss-workspace-mode__choices button'))
        .find((button) => button.textContent.includes('Essentials'));
      await act(async () => { essentialsButton.click(); await Promise.resolve(); });

      expect(latestToolData.dissection.workspaceMode).toBe('essentials');
      expect(latestToolData.dissection.procedureScenario).toBe('precision-access');
      expect(latestToolData.dissection.scenarioStartedAt).toBe(0);
      expect(latestToolData.dissection.scenarioTimeRemaining).toBe(0);
      expect(latestToolData.dissection.practicalMode).toBe(false);
      expect(latestToolData.dissection.practicalTimer).toBe(0);
      expect(latestToolData.dissection.practicalEndsAt).toBe(0);
      expect(latestToolData.dissection.practicalTargetIds).toEqual([]);
      expect(latestToolData.dissection.quizMode).toBe(false);
      expect(latestToolData.dissection.labelMode).toBe('show');
      expect(window.__alloDissectionPracticalInterval).toBeNull();
      expect(latestToolData.dissection.procedureFeedback.message).toContain('timed practical ended');
      expect(announceToSR.mock.calls.filter(([message]) => String(message).includes('timed practical ended'))).toHaveLength(1);
      expect(latestToolData.dissection.procedureMode).toBe('independent');
      expect(host.querySelector('.diss-procedure__mode button[aria-pressed="true"]')?.textContent).toContain('Guided');
      expect(host.querySelector('.diss-canvas-layout')?.getAttribute('data-split')).toBe('false');
      expect(host.querySelector('select[aria-label="Fullscreen active instrument"] option[value="dropper"]')?.disabled).toBe(false);
      const essentialsCanvas = host.querySelector('#diss-canvas');
      const essentialsShortcuts = (essentialsCanvas?.getAttribute('aria-keyshortcuts') || '').split(/\s+/);
      expect(essentialsShortcuts).not.toEqual(expect.arrayContaining(['X', 'M', 'P', 'F']));
      await act(async () => { essentialsCanvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true })); await Promise.resolve(); });
      expect(latestToolData.dissection.crossSectionMode).toBe(true);
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      canvasContext.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('derives learning objectives from structure evidence instead of manual check-off', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'organs',
        _dissLoadedSpec: 'frog',
        exploredOrgans: { 'frog|heart': true },
        organNotes: { 'frog|heart': 'Two atria feed a shared ventricle.' },
        organConfidence: { 'frog|heart': 3 },
        verifiedIdentifications: { 'frog|heart': { status: 'verified' } },
      },
    });

    document.body.innerHTML = html;
    const objectives = Array.from(document.querySelectorAll('.diss-objective-item'));
    expect(objectives).toHaveLength(4);
    expect(objectives[0]?.tagName).toBe('ARTICLE');
    expect(objectives[0]?.getAttribute('data-objective-status')).toBe('demonstrated');
    expect(objectives[0]?.textContent).toContain('Evidence demonstrated');
    expect(objectives.every((objective) => objective.querySelector('button') === null)).toBe(true);

    const comparisonHtml = renderTool('dissection', {
      dissection: {
        specimen: 'frog', activeLayer: 'organs', _dissLoadedSpec: 'frog',
        exploredOrgans: { 'frog|dorsal_skin': true, 'frog|lungs': true },
        organNotes: { 'frog|dorsal_skin': 'Moist skin supports gas exchange.', 'frog|lungs': 'Pulmonary sacs support gas exchange.' },
        organConfidence: { 'frog|dorsal_skin': 3, 'frog|lungs': 3 },
        verifiedIdentifications: { 'frog|dorsal_skin': { status: 'verified' } },
      },
    });
    document.body.innerHTML = comparisonHtml;
    const comparisonObjective = document.querySelectorAll('.diss-objective-item')[1];
    expect(comparisonObjective?.getAttribute('data-objective-status')).toBe('developing');
    expect(comparisonObjective?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('83');
    expect(comparisonObjective?.textContent).toContain('2/2 targets observed');
    expect(comparisonObjective?.textContent).toContain('2/2 evidence records');
    expect(comparisonObjective?.textContent).toContain('1/2 targets verified for understanding');
    expect(comparisonObjective?.textContent).toContain('Next: verify Lungs in Guided investigation, or answer the corresponding assessment question correctly on the first attempt.');

    const demonstratedComparisonHtml = renderTool('dissection', {
      dissection: {
        specimen: 'frog', activeLayer: 'organs', _dissLoadedSpec: 'frog',
        exploredOrgans: { 'frog|dorsal_skin': true, 'frog|lungs': true },
        organNotes: { 'frog|dorsal_skin': 'Moist skin supports gas exchange.', 'frog|lungs': 'Pulmonary sacs support gas exchange.' },
        organConfidence: { 'frog|dorsal_skin': 3, 'frog|lungs': 3 },
        verifiedIdentifications: { 'frog|dorsal_skin': { status: 'verified' } },
        assessmentEvidence: { 'frog|lungs': { correct: true } },
      },
    });
    document.body.innerHTML = demonstratedComparisonHtml;
    const demonstratedComparisonObjective = document.querySelectorAll('.diss-objective-item')[1];
    expect(demonstratedComparisonObjective?.getAttribute('data-objective-status')).toBe('demonstrated');
    expect(demonstratedComparisonObjective?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100');
    expect(demonstratedComparisonObjective?.textContent).toContain('2/2 targets verified for understanding');
    expect(demonstratedComparisonObjective?.textContent).toContain('Evidence demonstrated');
    document.body.innerHTML = '';
  });

  it('renders a finite assessment summary with first-attempt and supported-practice evidence', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog',
        quizMode: true, quizComplete: true,
        quizFirstAttemptScore: 4, quizFirstAttemptTotal: 5, quizSupportedCount: 1,
        quizReviewQueue: ['tympanum'], assessmentCompletedAt: 123,
      },
    });

    expect(html).toContain('data-dissection-assessment-summary="true"');
    expect(html).toContain('Assessment complete');
    expect(html).toContain('First-attempt evidence: 4/5');
    expect(html).toContain('Supported practice is reported separately');
    expect(html).toContain('Review missed structures');
    expect(html).not.toContain('id="diss-quiz-panel"');
  });

  it('offers persisted missed-item review after returning to the lab', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog',
        quizMode: false, quizReviewQueue: ['tympanum', 'nictitating'],
        assessmentCompletedAt: 123, assessmentRecordedScore: 3, assessmentRecordedTotal: 5,
      },
    });

    expect(html).toContain('Review 2 missed structures');
    expect(html).toContain('completed first-attempt assessment 3/5');
  });

  it('renders one explicit next action as investigation state advances', () => {
    const explored = {
      'frog|dorsal_skin': true,
      'frog|ventral_skin': true,
      'frog|tympanum': true,
      'frog|nictitating': true,
    };
    const notes = {
      'frog|dorsal_skin': 'Pigmented moist surface.',
      'frog|ventral_skin': 'Lighter vascular surface.',
      'frog|tympanum': 'External sound membrane.',
      'frog|nictitating': 'Transparent protective eyelid.',
    };
    const confidence = {
      'frog|dorsal_skin': 2,
      'frog|ventral_skin': 2,
      'frog|tympanum': 2,
      'frog|nictitating': 2,
    };
    const cases = [
      {
        action: 'canvas',
        title: 'Find and inspect Dorsal Skin',
        state: {},
      },
      {
        action: 'evidence',
        title: 'Complete the observation record for Dorsal Skin',
        state: { exploredOrgans: explored },
      },
      {
        action: 'next-layer',
        title: 'Continue to the Muscle layer',
        state: { exploredOrgans: explored, organNotes: notes, organConfidence: confidence },
      },
    ];

    for (const testCase of cases) {
      const html = renderTool('dissection', {
        dissection: Object.assign({
          specimen: 'frog',
          activeLayer: 'skin',
          anatomicalView: 'dorsal',
          _dissLoadedSpec: 'frog',
          revealedLayers: { skin: true },
        }, testCase.state),
      });

      expect(html).toContain('data-dissection-next-action="true"');
      expect(html).toContain('data-next-action="' + testCase.action + '"');
      expect(html).toContain(testCase.title);
      expect(html).toContain('aria-current="step"');
      expect(html).toContain('Next best action \u00B7');
    }
  });

  it('requires learner evidence before offering to peel a completed layer', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        anatomicalView: 'ventral',
        _dissLoadedSpec: 'frog',
        activeInstrument: 'probe',
        exploredOrgans: {
          'frog|dorsal_skin': true,
          'frog|ventral_skin': true,
          'frog|tympanum': true,
          'frog|nictitating': true,
        },
        organNotes: {
          'frog|ventral_skin': 'Thin vascular surface.',
          'frog|tympanum': 'External sound membrane.',
          'frog|nictitating': 'Protective transparent eyelid.',
        },
        organConfidence: {
          'frog|ventral_skin': 2,
          'frog|tympanum': 2,
          'frog|nictitating': 2,
        },
        procedureByLayer: {
          skin: {
            inspected: true,
            incisionStarted: true,
            incisionExtended: true,
            retracted: true,
            pins: [{ x: 0.3, y: 0.5 }, { x: 0.7, y: 0.5 }],
            probed: true,
            probedOrganId: 'ventral_skin',
          },
        },
      },
    });

    const page = new DOMParser().parseFromString(html, 'text/html');
    const nextAction = page.querySelector('[data-dissection-next-action]');
    expect(nextAction.getAttribute('data-next-action')).toBe('evidence');
    expect(nextAction.textContent).toContain('Complete the observation record for Dorsal Skin');
    expect(page.querySelector('[data-next-action="peel-layer"]')).toBeNull();
  });

  it('offers an explicit chooser when Study tools has no active activity', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        anatomicalView: 'dorsal',
        _dissLoadedSpec: 'frog',
        toolbarStudyOpen: true,
      },
    });

    const page = new DOMParser().parseFromString(html, 'text/html');
    const nextAction = page.querySelector('[data-dissection-next-action]');
    expect(nextAction.getAttribute('data-next-action')).toBe('study-tools');
    expect(nextAction.textContent).toContain('Choose a study activity');
    expect(nextAction.querySelector('.diss-next-action__primary').textContent).toContain('Choose a study activity');

    const studyPanel = page.querySelector('#diss-study-tools');
    expect(studyPanel).not.toBeNull();
    expect(studyPanel.querySelector('[aria-label="Flashcard"]').getAttribute('aria-pressed')).toBe('false');
    expect(studyPanel.querySelector('[aria-label="Compare"]').getAttribute('aria-pressed')).toBe('false');
    expect(studyPanel.querySelector('[aria-label="Start 2-minute timed practical"]').getAttribute('aria-pressed')).toBe('false');
  });

  it('freezes the practical target pool and locks directory and view changes', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        anatomicalView: 'dorsal',
        _dissLoadedSpec: 'frog',
        practicalMode: true,
        practicalTimer: 90,
        practicalTargetIds: ['dorsal_skin', 'tympanum'],
        quizMode: true,
        quizAnswerMode: 'choices',
        quizIdx: 0,
        quizSeed: 42,
        toolbarViewOpen: true,
      },
    });

    const page = new DOMParser().parseFromString(html, 'text/html');
    expect(page.querySelector('[data-dissection-root]').getAttribute('data-assessment-mode')).toBe('true');
    expect(page.querySelector('[data-dissection-directory]')).toBeNull();

    const viewControl = page.querySelector('[aria-label="Anatomical view locked during timed practical"]');
    expect(viewControl).toBeNull();
    const fullscreenViewControl = page.querySelector('[aria-label="Fullscreen anatomical view locked during assessment"]');
    expect(fullscreenViewControl).not.toBeNull();
    expect(fullscreenViewControl.disabled).toBe(true);
    expect(readFileSync(DISSECTION_PATHS[0], 'utf8')).toContain('The anatomical view is locked during an assessment so the current question stays stable.');

    const practicalAnswers = Array.from(page.querySelectorAll('#diss-quiz-panel button[aria-label]'))
      .map((button) => button.getAttribute('aria-label'));
    expect(practicalAnswers).toHaveLength(4);
    expect(new Set(practicalAnswers).size).toBe(4);
    expect(practicalAnswers.some((label) => ['Dorsal Skin', 'Tympanic Membrane'].includes(label))).toBe(true);
  });

  it('does not reveal timed-practical correctness through answer explanations', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    let latestToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
          _dissLoadedSpec: 'frog', practicalMode: true, practicalTimer: 90,
          practicalEndsAt: Date.now() + 90000,
          practicalTargetIds: ['dorsal_skin'], quizMode: true,
          quizAnswerMode: 'choices', quizIdx: 0, quizSeed: 42, labelMode: 'hidden',
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });

      const correctAnswer = host.querySelector('#diss-quiz-panel button[aria-label="Dorsal Skin"]');
      expect(correctAnswer).not.toBeNull();
      await act(async () => {
        correctAnswer.click();
        await Promise.resolve();
      });

      expect(latestToolData.dissection.quizFeedback.correct).toBe(true);
      expect(latestToolData.dissection.quizExplanation).toBeNull();
      const panelText = host.querySelector('#diss-quiz-panel').textContent;
      expect(panelText).toContain('Correctness and the running score stay hidden while the timed practical is active.');
      expect(panelText).not.toContain('Mucous glands keep skin moist for cutaneous respiration');
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem('dissection_progress_frog');
      window.__alloDissectionPracticalScore = 0;
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('resumes a timed practical from its wall-clock deadline after canvas remount', async () => {
    vi.useFakeTimers();
    const startedAt = new Date('2026-08-31T12:00:00Z').getTime();
    vi.setSystemTime(startedAt);
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const addToast = vi.fn();
    const announceToSR = vi.fn();
    let latestToolData;
    let setVisible;
    let setToolDataExternally;
    let root;
    let host;

    function Component() {
      const [visible, updateVisible] = React.useState(true);
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
          _dissLoadedSpec: 'frog', workspaceMode: 'advanced', toolbarStudyOpen: true,
          reducedMotion: true, quizReviewQueue: ['tympanum'],
        },
      });
      setVisible = updateVisible;
      setToolDataExternally = setToolData;
      latestToolData = toolData;
      return visible ? config.render(makeCtx({ toolData, setToolData, addToast, announceToSR })) : React.createElement('div', { id: 'other-tool' });
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });

      await act(async () => {
        host.querySelector('[aria-label="Start 2-minute timed practical"]').click();
        await Promise.resolve();
        vi.advanceTimersByTime(0);
      });
      expect(latestToolData.dissection.practicalMode).toBe(true);
      expect(latestToolData.dissection.practicalEndsAt).toBe(startedAt + 120000);
      expect(latestToolData.dissection.practicalTimer).toBe(120);
      expect(latestToolData.dissection.quizReviewQueue).toEqual(['tympanum']);

      await act(async () => {
        setVisible(false);
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(window.__alloDissectionPracticalInterval).toBeNull();
      await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
      expect(latestToolData.dissection.practicalTimer).toBe(120);

      await act(async () => {
        setVisible(true);
        await Promise.resolve();
        await Promise.resolve();
      });
      await act(async () => { await vi.advanceTimersByTimeAsync(0); await Promise.resolve(); });
      expect(latestToolData.dissection.practicalMode).toBe(true);
      expect(latestToolData.dissection.practicalEndsAt).toBe(startedAt + 120000);
      expect(latestToolData.dissection.practicalTimer).toBe(90);

      vi.setSystemTime(startedAt + 61000);
      await act(async () => { vi.advanceTimersByTime(1000); await Promise.resolve(); });
      expect(latestToolData.dissection.practicalTimer).toBe(58);

      await act(async () => {
        setToolDataExternally((previous) => ({
          ...previous,
          dissection: { ...previous.dissection, quizScore: 3, quizTotal: 5 },
        }));
        await Promise.resolve();
      });
      window.__alloDissectionPracticalScore = 99;
      vi.setSystemTime(startedAt + 121000);
      await act(async () => { vi.advanceTimersByTime(1000); await Promise.resolve(); });
      expect(latestToolData.dissection.practicalMode).toBe(false);
      expect(latestToolData.dissection.quizMode).toBe(false);
      expect(latestToolData.dissection.practicalEndsAt).toBe(0);
      expect(addToast).toHaveBeenCalledTimes(1);
      expect(addToast).toHaveBeenCalledWith('Time up! Score: 3/5', 'info');
      expect(announceToSR.mock.calls.filter(([message]) => message === 'Practical assessment complete. Score 3 out of 5.')).toHaveLength(1);
      expect(latestToolData.dissection.quizReviewQueue).toEqual(['tympanum']);
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(addToast).toHaveBeenCalledTimes(1);
      expect(announceToSR.mock.calls.filter(([message]) => message === 'Practical assessment complete. Score 3 out of 5.')).toHaveLength(1);
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      if (window.__alloDissectionPracticalInterval) clearInterval(window.__alloDissectionPracticalInterval);
      window.__alloDissectionPracticalInterval = null;
      contextSpy.mockRestore();
      vi.useRealTimers();
      localStorage.removeItem('dissection_progress_frog');
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('keeps field diagnostics and technique controls progressively disclosed', () => {
    const baseState = {
      specimen: 'frog',
      activeLayer: 'skin',
      anatomicalView: 'ventral',
      _dissLoadedSpec: 'frog',
      procedureByLayer: { skin: { inspected: true } },
    };
    const closedHtml = renderTool('dissection', { dissection: baseState });
    const openHtml = renderTool('dissection', {
      dissection: Object.assign({}, baseState, { techniquePanelOpen: true }),
    });

    const closedPage = new DOMParser().parseFromString(closedHtml, 'text/html');
    const fieldMonitor = closedPage.querySelector('details.diss-field-monitor');
    const closedProcedure = closedPage.querySelector('details#diss-procedure-panel');
    expect(fieldMonitor.hasAttribute('open')).toBe(false);
    expect(fieldMonitor.querySelector('summary').textContent).toContain('Field monitor');
    expect(fieldMonitor.querySelector('.diss-field-monitor__body')).not.toBeNull();
    expect(closedProcedure.hasAttribute('open')).toBe(false);
    expect(closedProcedure.querySelector('summary').textContent).toContain('Technique controls');

    const openPage = new DOMParser().parseFromString(openHtml, 'text/html');
    expect(openPage.querySelector('details#diss-procedure-panel').hasAttribute('open')).toBe(true);
    expect(openPage.querySelector('details.diss-field-monitor').hasAttribute('open')).toBe(false);
  });

  it('previews a hidden directory structure without awarding exploration progress', async () => {
    const canvasContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    let latestToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog',
          activeLayer: 'skin',
          anatomicalView: 'dorsal',
          _dissLoadedSpec: 'frog',
          exploredOrgans: {},
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });

      const hiddenStructure = host.querySelector('#diss-organ-ventral_skin');
      expect(hiddenStructure).not.toBeNull();
      expect(hiddenStructure.querySelector('.diss-directory-index')?.textContent).toBe('2');
      expect(hiddenStructure.getAttribute('aria-disabled')).toBe('true');
      expect(hiddenStructure.getAttribute('aria-label')).toContain('preview only');
      expect(hiddenStructure.title).toContain('recovery cue');

      await act(async () => {
        hiddenStructure.click();
        await Promise.resolve();
      });

      expect(latestToolData.dissection.selectedOrgan).not.toBe('ventral_skin');
      expect(latestToolData.dissection.exploredOrgans || {}).not.toHaveProperty('frog|ventral_skin');
      expect(latestToolData.dissection.procedureFeedback.message).toMatch(/occluded|not yet exposed/);
    } finally {
      if (root) {
        await act(async () => {
          root.unmount();
          await Promise.resolve();
        });
      }
      if (host) host.remove();
      canvasContext.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  });

  it('reports clipboard rejection instead of claiming structure information was copied', async () => {
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard denied'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const addToast = vi.fn();
    let latestToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog',
          activeLayer: 'skin',
          anatomicalView: 'dorsal',
          _dissLoadedSpec: 'frog',
          selectedOrgan: 'dorsal_skin',
          exploredOrgans: { 'frog|dorsal_skin': true },
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData, addToast }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });

      const copyButton = host.querySelector('button[aria-label="Copy Dorsal Skin information to clipboard"]');
      expect(copyButton).not.toBeNull();
      await act(async () => {
        copyButton.click();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Dorsal Skin'));
      expect(addToast).toHaveBeenCalledWith('Could not copy Dorsal Skin information in this view.', 'error');
      expect(addToast).not.toHaveBeenCalledWith('Dorsal Skin information copied to the clipboard.', 'success');
      expect(latestToolData.dissection.procedureFeedback).toMatchObject({
        message: 'Could not copy Dorsal Skin information in this view.',
        tone: 'caution',
      });
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
      else delete navigator.clipboard;
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('separates first-attempt mastery from a correct supported retry', async () => {
    const canvasContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    let latestToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', _dissLoadedSpec: 'frog',
          quizMode: true, quizIdx: 1, quizSeed: 42, quizAnswerMode: 'choices',
          revealedLayers: { skin: true },
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    async function choose(labelStart) {
      const button = Array.from(host.querySelectorAll('#diss-quiz-panel button')).find((candidate) => candidate.getAttribute('aria-label')?.startsWith(labelStart));
      expect(button).toBeDefined();
      await act(async () => { button.click(); await Promise.resolve(); });
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });

      expect(host.textContent).toContain('Lighter, thinner ventral surface');
      const wrongAnswer = Array.from(host.querySelectorAll('#diss-quiz-panel button[aria-label]'))
        .find((candidate) => !candidate.getAttribute('aria-label').startsWith('Ventral Skin'));
      expect(wrongAnswer).toBeDefined();
      await act(async () => { wrongAnswer.click(); await Promise.resolve(); });
      expect(latestToolData.dissection.quizFirstAttemptScore).toBe(0);
      expect(latestToolData.dissection.quizFirstAttemptTotal).toBe(1);
      expect(latestToolData.dissection.quizTotal || 0).toBe(0);
      expect(latestToolData.dissection.quizRetry.questionId).toBe('ventral_skin');

      const muscleLayer = Array.from(host.querySelectorAll('.diss-layer-button')).find((button) => button.textContent.includes('Muscle'));
      const pigSpecimen = host.querySelector('#diss-specimen-tab-pig');
      const fullscreenView = host.querySelector('[aria-label="Fullscreen anatomical view locked during assessment"]');
      expect(muscleLayer?.disabled).toBe(true);
      expect(pigSpecimen?.disabled).toBe(true);
      expect(fullscreenView?.disabled).toBe(true);
      await act(async () => { muscleLayer.click(); pigSpecimen.click(); fullscreenView.click(); await Promise.resolve(); });
      expect(latestToolData.dissection.specimen).toBe('frog');
      expect(latestToolData.dissection.activeLayer).toBe('skin');
      expect(latestToolData.dissection.quizRetry.questionId).toBe('ventral_skin');
      expect(latestToolData.dissection.quizFirstAttemptTotal).toBe(1);

      await choose('Ventral Skin');
      expect(latestToolData.dissection.quizFirstAttemptScore).toBe(0);
      expect(latestToolData.dissection.quizFirstAttemptTotal).toBe(1);
      expect(latestToolData.dissection.quizSupportedCount).toBe(1);
      expect(latestToolData.dissection.quizTotal).toBe(1);
      expect(latestToolData.dissection.quizFeedback.supported).toBe(true);
      expect(host.textContent).toContain('Correct with support');
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      canvasContext.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('clears the durable missed-item queue after supported review is completed', async () => {
    const canvasContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    let latestToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog',
          quizMode: true, quizReviewMode: true, quizReviewQueue: ['ventral_skin'],
          quizIdx: 0, quizSeed: 42, quizAnswerMode: 'choices',
          assessmentCompletedAt: 123, assessmentRecordedScore: 3, assessmentRecordedTotal: 5,
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });

      const reviewChoices = Array.from(host.querySelectorAll('#diss-quiz-panel button[aria-label]'))
        .map((button) => button.getAttribute('aria-label'));
      expect(reviewChoices).toHaveLength(4);
      expect(new Set(reviewChoices).size).toBe(4);
      expect(reviewChoices).toContain('Ventral Skin');

      const correctAnswer = Array.from(host.querySelectorAll('#diss-quiz-panel button'))
        .find((button) => button.getAttribute('aria-label') === 'Ventral Skin');
      await act(async () => { correctAnswer.click(); await Promise.resolve(); });
      const summaryButton = host.querySelector('button[aria-label="View assessment summary"]');
      await act(async () => { summaryButton.click(); await Promise.resolve(); });

      expect(latestToolData.dissection.quizComplete).toBe(true);
      expect(latestToolData.dissection.quizReviewQueue).toEqual([]);
      expect(latestToolData.dissection.assessmentCompletedAt).toBe(123);
      expect(latestToolData.dissection.assessmentRecordedScore).toBe(3);
      expect(latestToolData.dissection.assessmentRecordedTotal).toBe(5);
      expect(host.textContent).toContain('Supported review complete');
      expect(host.textContent).toContain('First-attempt evidence: 3/5 · 60% accuracy');
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      canvasContext.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('falls back to multiple choice without changing an unanswerable hotspot question', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'organs',
        anatomicalView: 'dorsal',
        _dissLoadedSpec: 'frog',
        revealedLayers: { skin: true, muscle: true },
        quizMode: true,
        quizIdx: 0,
        quizSeed: 42,
        quizAnswerMode: 'hotspot',
      },
    });

    expect(html).toContain('data-assessment-mode="true"');
    expect(html).toContain('Specimen answer unavailable');
    expect(html).toContain('The current question is not visible on the specimen; use multiple choice');
    expect(html).toContain('This question is not visible in the current field, so multiple choice is active.');
    expect(html).toContain('Canvas selection will not submit in multiple-choice mode.');
    expect(html).not.toContain('Select the matching visible structure to submit.');
  });

  it('keeps a restricted tray keyboard-safe even when a hydration tool was persisted as active', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        anatomicalView: 'ventral',
        _dissLoadedSpec: 'frog',
        workspaceMode: 'advanced',
        procedureScenario: 'restricted-tray',
        activeInstrument: 'dropper',
      },
    });

    document.body.innerHTML = html;
    const probe = document.querySelector('#diss-instrument-probe');
    const dropper = document.querySelector('#diss-instrument-dropper');
    const fullscreenSelect = document.querySelector('select[aria-label="Fullscreen active instrument"]');

    expect(probe?.getAttribute('aria-checked')).toBe('true');
    expect(probe?.tabIndex).toBe(0);
    expect(dropper?.disabled).toBe(true);
    expect(dropper?.tabIndex).toBe(-1);
    expect(fullscreenSelect?.querySelector('option[value="dropper"]')?.disabled).toBe(true);
    expect(fullscreenSelect?.querySelector('option[value="wick"]')?.disabled).toBe(true);
    document.body.innerHTML = '';
  });

  it('renders canvas-answer assessment with a keyboard alternative', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        anatomicalView: 'ventral',
        _dissLoadedSpec: 'frog',
        quizMode: true,
        quizReviewMode: true,
        quizReviewQueue: ['dorsal_skin', 'ventral_skin', 'tympanum', 'nictitating'],
        quizIdx: 1,
        quizSeed: 42,
        quizAnswerMode: 'hotspot',
        toolbarViewOpen: true,
        labelMode: 'show',
        traceNervous: true, traceCirculation: true, traceDigestion: true,
        traceRespiration: true, traceExcretory: true, showEndocrine: true, livingFunctionEnabled: true,
      },
    });

    document.body.innerHTML = html;
    const labelToggle = document.querySelector('button[aria-label="Organ name labels hidden during assessment"]');
    const assessmentCanvas = document.querySelector('#diss-canvas');
    expect(document.querySelector('[data-dissection-directory]')).toBeNull();
    expect(document.querySelector('.diss-optics')).toBeNull();
    expect(document.querySelector('button[aria-label="Lab tool options"]')).toBeNull();
    expect(document.querySelector('button[aria-label="Toggle detailed pointer-following instrument visuals and contact response"]')).toBeNull();
    expect(assessmentCanvas?.style.touchAction).toBe('pan-y');

    expect(html).toContain('Select on specimen');
    expect(html).toContain('keyboard-accessible multiple-choice answers');
    expect(html).toContain('Function clue:');
    expect(html).not.toContain('Diagram location clue');
    expect(labelToggle?.disabled).toBe(true);
    expect(labelToggle?.getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('[data-dissection-overlays]')).toBeNull();
    document.body.innerHTML = '';
  });

  it('renders guided instruments, progress, depth controls, and an equivalent action button', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        anatomicalView: 'ventral',
        _dissLoadedSpec: 'frog',
        workspaceMode: 'advanced',
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
    expect(html).toContain('Frog ventral midline access');
    expect(html).toContain('Ventral surface centered with the limbs stabilized symmetrically.');
    expect(html).toContain('Protected landmarks');
    expect(html).toContain('View aligned to procedure recommendation');
    expect(Array.from(new DOMParser().parseFromString(html, 'text/html').querySelectorAll('.diss-protocol__landmarks li'), node => node.textContent)).toEqual(['Heart (3-chamber)', 'Liver (3 lobes)', 'Lungs']);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('Scalpel');
    expect(html).toContain('Active tool: Scalpel');
    const guidedDocument = new DOMParser().parseFromString(html, 'text/html');
    const selectedInstrument = guidedDocument.querySelector('#diss-instrument-scalpel');
    expect(selectedInstrument.getAttribute('role')).toBe('radio');
    expect(selectedInstrument.getAttribute('aria-checked')).toBe('true');
    expect(selectedInstrument.querySelector('[data-tool-marker="selected"]').textContent).toBe('Selected');
    expect(selectedInstrument.querySelector('[data-tool-marker="next"]').textContent).toBe('Next step');
    expect(selectedInstrument.querySelector('.diss-instrument__state').textContent).toBe('Ready');
    expect(html).toContain('class="diss-stage__handoff"');
    expect(html).toContain('Live specimen response monitor');
    expect(html).toContain('diss-stage__telemetry');
    expect(html).toContain('Exposure');
    expect(html).toContain('Last response · RECORDED');
    expect(html).toContain('Inspect last response · why did the field change?');
    expect(html).toContain('Replay last response');
    expect(html).toContain('diss-procedure__timeline-entry');
    expect(html).toContain('aria-label="Review Inspected: RECORDED"');
    expect(html).toContain('data-selected="true"');
    // 2026-09-03: when the learning checkpoint is on screen, the Next-best-action card is not
    // rendered. Its primary button only scrolled to that panel, and every line it carried is
    // already on the page: the phase in the mission copy, the specimen and layer in the stat
    // row, the step in the workflow rail. The prompt was appearing six times on one screen.
    expect(html).not.toContain('data-next-action="learning"');
    expect(html).toContain('Pause before contact');
    expect(html).toContain('Which plan best protects anatomy during the initial entry?');
    expect(html).toContain('1 Predict');
    expect(html).toContain('2 Perform');
    expect(html).toContain('3 Explain');
    expect(html).toContain('Choose the safest plan');
    expect(html).not.toContain('Pre-contact check');
    const planningMonitorAction = guidedDocument.querySelector('.diss-stage__telemetry-prepare');
    expect(planningMonitorAction.textContent).toBe('Review plan');
    expect(planningMonitorAction.getAttribute('aria-controls')).toBe('diss-learning-checkpoint');
    // 2026-09-03: the checkpoint panel now opens the same column, a couple of hundred pixels
    // above the stage, so the handoff names the phase instead of repeating the whole question.
    expect(html).not.toContain('Next · Which plan best protects anatomy during the initial entry?');
    expect(html).toContain('Which plan best protects anatomy during the initial entry?');
    const guidedHandoff = guidedDocument.querySelector('.diss-stage__handoff');
    const guidedProgress = guidedHandoff.querySelector('.diss-stage__handoff-progress').textContent;
    const guidedStep = guidedProgress.match(/^Workflow ([1-6])\/6$/);
    expect(guidedStep).not.toBeNull();
    expect(guidedHandoff.getAttribute('aria-label')).toContain('Workflow step ' + guidedStep[1] + ' of 6');
    expect(html).toContain('diss-fullscreen-dock__handoff');
    expect(html).toContain('Fullscreen next action: Which plan best protects anatomy during the initial entry?');
    expect(html).toContain('Follow the shallow ventral midline corridor');
    expect(html).toContain('data-readiness="ready"');
    expect(html).toContain('data-diss-tool-status="true"');
    expect(html).toContain('Deep (practice warning)');
    expect(html).toContain('Begin the shallow ventral midline opening');
    expect(html).toContain('Technique score');
    expect(html).toContain('Instrument angle');
    expect(html).toContain('Precision access');
    expect(html).toContain('RECORDED');
    expect(html).toContain('Scenario lab');
    const layerReview = guidedDocument.querySelector('#diss-layer-review');
    expect(layerReview.querySelector('h3').textContent).toBe('Layer review');
    expect(Array.from(layerReview.querySelectorAll('.diss-layer-review__card > h4')).map(node => node.textContent)).toEqual(['What you did', 'What changed', 'Try next']);
    expect(html).toContain('Scenario thresholds');
    expect(html).toContain('Target score: 80');
    expect(html).toContain('Tool control');
    expect(html).toContain('Not scored');
    expect(html).toContain('Inspected');
    expect(html).toContain('Show technique');
    expect(html).toContain('Replay attempt');
    expect(html).toContain('Save attempt');
    expect(html).toContain('Technique path comparison legend');
    expect(html).toContain('diss-attempt-comparison__scrub');
    expect(html).toContain('Scrub comparison replay');
    expect(html).toContain('Play compare replay');
    expect(html).toContain('Show full paths');
    expect(html).toContain('Current attempt · solid cyan path');
    expect(html).toContain('Saved baseline · dashed magenta path');
    expect(html).toContain('Start new attempt');
    expect(html).toContain('Compare attempts');
    expect(html).toContain('Adaptive coaching on');
    expect(html).toContain('Adaptive coaching');
    expect(html).toContain('id="diss-adaptive-coaching-title">Orientation');
    expect(html).toContain('Review technique controls');
    expect(html).toContain('Previous attempt vs current attempt');
    expect(html).toContain('Saved baseline: dorsal view, mouse');
    expect(html).toContain('Input');
    expect(html).toContain('Undo last technique action');
    expect(html).toContain('generalized, non-graphic teaching simulation');
  });

  it('renders distinct organism-specific access routes and next actions', () => {
    const wormHtml = renderTool('dissection', {
      dissection: {
        specimen: 'earthworm',
        activeLayer: 'skin',
        _dissLoadedSpec: 'earthworm',
        activeInstrument: 'scalpel',
        procedureMode: 'guided',
        procedureByLayer: { skin: { inspected: true, pins: [] } },
      },
    });
    expect(wormHtml).toContain('Earthworm dorsal longitudinal access');
    expect(wormHtml).toContain('shallow dorsal longitudinal corridor');
    expect(Array.from(new DOMParser().parseFromString(wormHtml, 'text/html').querySelectorAll('.diss-protocol__landmarks li'), node => node.textContent)).toEqual(['Aortic Arches (5 pairs)', 'Cerebral Ganglia', 'Intestine']);
    expect(wormHtml).toContain('Stabilize ends');
    expect(wormHtml).toContain('Place the first body-wall anchor');
    expect(wormHtml).toContain('Extend lengthwise');
    expect(wormHtml).toContain('View aligned to procedure recommendation');

    const stabilizedWormHtml = renderTool('dissection', {
      dissection: {
        specimen: 'earthworm',
        activeLayer: 'skin',
        _dissLoadedSpec: 'earthworm',
        activeInstrument: 'scalpel',
        procedureMode: 'guided',
        procedureByLayer: {
          skin: {
            inspected: true,
            pins: [{ x: 0.28, y: 0.5 }, { x: 0.72, y: 0.5 }],
          },
        },
      },
    });
    expect(stabilizedWormHtml).toContain('Begin a shallow dorsal midline opening');

    const pigHtml = renderTool('dissection', {
      dissection: {
        specimen: 'pig',
        activeLayer: 'skin',
        _dissLoadedSpec: 'pig',
        activeInstrument: 'scissors',
        procedureMode: 'guided',
        procedureByLayer: { skin: { inspected: true, incisionStarted: true, pins: [] } },
      },
    });
    expect(pigHtml).toContain('Fetal pig ventral body-cavity access');
    expect(pigHtml).toContain('ventral midline corridor with an umbilical detour');
    expect(pigHtml).toContain('Umbilical Cord, Heart (4-chamber), Urinary Bladder');
    expect(pigHtml).toContain('Extend around the umbilical region');
    expect(pigHtml).toContain('Detour cord');
  });

  it('renders a compressed evidence notebook with live-reference comparison controls', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        _dissLoadedSpec: 'frog',
        workspaceMode: 'advanced',
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
        workspaceMode: 'advanced',
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
    expect(html).toContain('Layer map on');
    expect(html).toContain('Condition: cloudy');
    expect(html).toContain('Relationships on');
    expect(html).toContain('Curated anatomical relationships');
    expect(html).toContain('provides attachment for Extraocular Muscles [attachment; structural, long-dash line with squares]');
    expect(html).toContain('Path key: vascular solid circles');
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
    expect(cuttingHtml).toContain('Attempt replay follows saved action order and distinguishes saved paths from teaching illustrations; pressure and settings appear only when recorded');
    expect(cuttingHtml).toContain('Direct forceps press-drag-release manipulation shows live lift direction, safe range, calibrated grip, speed, control, slip risk, and excess tension with text and geometry; the technique action button remains equivalent.');
    expect(cuttingHtml).toContain('Live pin stability preview shows endpoint spacing, calibrated angle, insertion depth, and flap tension with text and geometry');
    expect(cuttingHtml).toContain('Live probe palpation preview shows calibrated pressure, material resistance, anatomical depth, and tissue deformation with text and shape');
    expect(cuttingHtml).toContain('Live dropper spread forecast shows dose count, organism-specific flow direction, current saturation, and pooling risk with text and geometry');
    expect(cuttingHtml).toContain('Guided procedure handoff cue connects the next required instrument to its anatomical target and 6-step progress rail with text, shape, and line style');
    expect(cuttingHtml).toContain('Persistent localized technique evidence maps edge stress, grip compression, anchor tension, probe pressure, and saline pooling to actual contact locations with text and distinct geometry');
    expect(cuttingHtml).toContain('data-next="true"');
    expect(cuttingHtml).toContain('aria-current="step"');
    expect(cuttingHtml).toContain('Next required instrument.');
    expect(html).toContain('Light direction: raking');
    expect(html).toContain('Focus isolation on');
    expect(html).toContain('neutral light');
    expect(html).toContain('Variation 3');
    expect(html).toContain('Tissue: after');
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
      for (const [shape, axis, start, end] of [
        ['frog', 'vertical', 'ANTERIOR', 'POSTERIOR'], ['worm', 'vertical', 'ANTERIOR', 'POSTERIOR'],
        ['pig', 'horizontal', 'CRANIAL', 'CAUDAL'], ['fish', 'horizontal', 'ANTERIOR', 'POSTERIOR'],
        ['crayfish', 'horizontal', 'ANTERIOR', 'POSTERIOR'], ['eye', 'horizontal', 'CORNEA', 'OPTIC NERVE'], ['heart', 'vertical', 'BASE', 'APEX'],
      ]) for (const view of ['dorsal', 'ventral']) {
        const orientation = contractFunction(source, 'anatomicalOrientationData', { spec: { bodyShape: shape }, d: { anatomicalView: view },
          procedureProtocol: { recommendedView: 'ventral' } })();
        expect(orientation).toMatchObject({ axis, start, end, mirrored: axis === 'horizontal' && view === 'ventral', aligned: view === 'ventral' });
      }
      expect(source.includes('var scaleOrientation = anatomicalOrientationData();'), 'scale and compass use the same anatomical axis').toBe(true);
      expect(source.includes('scaleFirstLandmark = horizontalAxis && scaleOrientation.mirrored ? scaleOrientation.end : scaleOrientation.start'),
        'mirrored horizontal specimens reverse the scale endpoints').toBe(true);
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
      expect(source).toContain("var keyboardOrgans = organs.filter(function (organ) { return structureExposureState(organ, currentProcedure) === 'visible'; });");
      expect(source).toContain('(organIndex + direction + keyboardOrgans.length) % keyboardOrgans.length');
      expect(source).toContain("e.key === 'Home' || e.key === 'End'");
      expect(source).toContain("e.key === 'Enter' || e.key === ' '");
      expect(source).toContain("e.key === '+' || e.key === '='");
      expect(source).toContain("e.key === '-' || e.key === '_'");
      expect(source).toContain("'aria-keyshortcuts': 'ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Home End Enter Space Escape 0 R V' + (advancedWorkspace ? ' X M P F' : '') + ' 1 2 3 4 5 6 7'");
      expect(source).toContain("className: \"diss-shortcuts\"");
      expect(source).toContain("'Ctrl + wheel', 'Zoom around the pointer'");
      expect(source).toContain('var macroLikelyOnLeft = inspectionLens && macroInset');
      expect(source).toContain('var compassBottomInset = (guidedMode && currentGuided ? Math.max(72, 64 * canvasHudScale) : 14) + screenPhysiologyHudReserve');
      expect(source).toContain('var compassY = H - compassHeight - compassBottomInset');
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
      expect(source).toContain('function tissueVariantDefinition(layerId, options)');
      expect(source).toContain('function defaultTissueState(layerId, options)');
      expect(source).toContain('function normalizeTissueState(state, layerId, options)');
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
        workspaceMode: 'advanced',
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
    expect(html).not.toContain('Apply controlled drop');

    const dropperHtml = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        _dissLoadedSpec: 'frog',
        workspaceMode: 'advanced',
        activeInstrument: 'dropper',
        variationSeed: 4,
        specimenCondition: 'dehydrated',
      },
    });
    const dropperHost = document.createElement('div');
    dropperHost.innerHTML = dropperHtml;
    const salineAction = Array.from(dropperHost.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Apply controlled drop'));
    expect(salineAction).toBeDefined();
    expect(salineAction.type).toBe('button');
    expect(dropperHtml).toContain('Dynamic tissue state');
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
      expect(source).toContain('var liveObservationField = observationFieldData(liveProcedureForObservation)');
      expect(source).toContain('var fieldWidthFactor = 0.76 + liveObservationField.aperture');
      expect(source).toContain('var fieldDetailCount = 3 + Math.round(liveObservationField.quality / 14)');
      expect(source).toContain('var stressMarkCount = Math.min(7');
      expect(source).toContain('var bedFiberCount = 3 + Math.round(liveObservationField.quality / 16)');
      expect(source).toContain('var visibleSalineDrops = Math.max(1, Math.min(4');
      expect(source).toContain("'POOLING \u00B7 REDUCE DOSE'");
      expect(source).toContain('observationQuality: currentObservationField.quality');
      expect(source).toContain('observationQuality: observationField.quality');
      expect(source).toContain('observationDelta: techniqueComparisonDelta(current.observationQuality, previous.observationQuality)');
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
    expect(html).toContain('<dt>Opening size</dt><dd>72%</dd>');
    expect(html).toContain('<dt>Surface clarity</dt><dd>88%</dd>');
    expect(html).toContain('<dt>Field stability</dt><dd>76%</dd>');
    expect(html).toContain('<dt>Handling risk</dt><dd>12%</dd>');
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
      expect(source).toContain('function evidenceScore(value)');
      expect(source).toContain("if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) return null;");
      expect(source).toContain('return isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null;');
      expect(source).toContain('var optics = evidenceScore(evidence.opticalQuality);');
      expect(source).toContain('renderEvidenceMetadata(referenceEvidence,');
      expect(source).toContain('renderEvidenceMetadata(evidence,');
      expect(source).toContain("report += 'Optical inspection: '");
      expect(source).toContain("'Optical inspection \\u00B7 ' + currentOpticalInspection.label");
      expect(source).toContain(`"aria-label": __alloT('stem.dissection.a11y_inspection_focus_depth', 'Inspection focus depth')`);
    }

    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        selectedOrgan: 'dorsal_skin',
        workspaceMode: 'advanced',
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
    expect(html).toContain('data-optical-reading="focus"><dt>Recommended focus</dt><dd>surface</dd>');
    expect(html).toContain('Resolved');
    expect(html).toContain('aria-label="Inspection focus depth"');
    expect(html).toContain('aria-pressed="true">Surface');
    expect(html).toContain('aria-pressed="true">2x');
    const root = document.createElement('div');
    root.innerHTML = html;
    const focus = root.querySelector('[aria-label="Inspection focus depth"]');
    const magnify = root.querySelector('[aria-label="Inspection magnification"]');
    expect(focus.querySelectorAll('button')).toHaveLength(3);
    expect(magnify.querySelectorAll('button')).toHaveLength(3);
    expect(focus.contains(magnify)).toBe(false);
    for (const [target, depth, level, recommendation] of [['lens', 'deep', 2, '6x'], ['iris', 'surface', 6, '2x']]) {
      const adviceHtml = renderTool('dissection', { dissection: {
        specimen: 'sheepEye', _dissLoadedSpec: 'sheepEye', activeLayer: 'organs', anatomicalView: 'internal',
        selectedOrgan: target, workspaceMode: 'advanced', inspectionLens: true, lensPinned: true,
        lensPinnedOrganId: target, lensFocusDepth: depth, lensMagnification: level, lightIntensity: 60,
        revealedLayers: { skin: true }, procedureByLayer: { organs: {
          inspected: true, incisionStarted: true, incisionExtended: true, retracted: true,
          tissueState: { clarity: 92, exposure: 87, stability: 84, risk: 8, moisture: 67, tension: 45, trauma: 0 },
        } },
      } });
      expect(adviceHtml).toContain('Use ' + recommendation + ' magnification for this tissue depth.');
      expect(adviceHtml).not.toContain('Use lower magnification for a wider, steadier field.');
    }
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
      expect(source).toContain(`"aria-label": __alloT('stem.dissection.a11y_move_the_zoomed_specimen_without_dragging', 'Move the zoomed specimen without dragging')`);
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

  it('shows comparison replay statically when OS reduced motion is active without flooding live status', async () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    localStorage.removeItem('dissection_accessibility_preferences');
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const announcements = [];
    let latestToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog', activeLayer: 'skin', anatomicalView: 'ventral',
          _dissLoadedSpec: 'frog', workspaceMode: 'advanced', techniquePanelOpen: true,
          activeInstrument: 'scalpel', compareTechniqueAttempts: true,
          compareReplayProgress: 0, compareReplayPlaying: false,
          attemptArchive: {
            skin: [{
              id: 7, score: 58, precision: 76, coverage: 70, control: 72,
              angleControl: 68, cautions: 1, view: 'dorsal', inputType: 'mouse',
              incisionPath: [{ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.6 }],
            }],
          },
          procedureByLayer: {
            skin: {
              inspected: true, incisionStarted: false, incisionExtended: false,
              retracted: false, pins: [], probed: false, history: ['inspect'],
              actionLog: [{ action: 'inspect', label: 'Inspected', at: 1 }],
            },
          },
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({
        toolData,
        setToolData,
        announceToSR: (message) => announcements.push(String(message)),
      }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });

      const play = host.querySelector('button[aria-label="Play comparison replay"]');
      const output = host.querySelector('.diss-attempt-comparison__scrub output');
      expect(play).not.toBeNull();
      expect(output).not.toBeNull();
      expect(output.getAttribute('role')).toBeNull();
      expect(output.getAttribute('aria-live')).toBeNull();

      await act(async () => {
        play.click();
        await Promise.resolve();
      });

      expect(latestToolData.dissection.compareReplayProgress).toBe(1);
      expect(latestToolData.dissection.compareReplayPlaying).toBe(false);
      expect(host.querySelector('[data-diss-canvas]')._dissTimers?.compareReplay).toBeUndefined();
      expect(host.querySelector('[data-diss-compare-progress]').value).toBe('100');
      expect(host.querySelector('.diss-attempt-comparison__scrub output').textContent).toBe('100% · Full paths');
      expect(announcements.filter((message) => message.includes('final frame because reduced motion'))).toEqual([
        'Comparison paths shown at the final frame because reduced motion is active.',
      ]);
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      contextSpy.mockRestore();
      Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: originalMatchMedia });
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('updates physiology playback immediately on motion preference changes and releases the listener', async () => {
    const originalMatchMedia = window.matchMedia;
    const listeners = new Set();
    const media = {
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn((type, listener) => { if (type === 'change') listeners.add(listener); }),
      removeEventListener: vi.fn((type, listener) => { if (type === 'change') listeners.delete(listener); }),
      addListener: vi.fn((listener) => listeners.add(listener)),
      removeListener: vi.fn((listener) => listeners.delete(listener)),
    };
    Object.defineProperty(window, 'matchMedia', {
      configurable: true, writable: true,
      value: vi.fn((query) => query === media.media ? media : { ...media, media: query, matches: false }),
    });
    localStorage.removeItem('dissection_accessibility_preferences');
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    let latestToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({ dissection: {
        specimen: 'sheepHeart', _dissLoadedSpec: 'sheepHeart', workspaceMode: 'advanced',
        activeLayer: 'organs', revealedLayers: { skin: true, organs: true },
        livingFunctionEnabled: true, livingFunctionPaused: false, livingFunctionSpeed: 'normal',
        traceCirculation: true, systemPlaybackPaused: false, reducedMotion: false,
        sceneDetail: false, soundEnabled: false,
        organNotes: { leftVentricle: 'Observe the wall thickness' },
        organConfidence: { leftVentricle: 3 }, exploredOrgans: { 'sheepHeart|leftVentricle': true },
        quizScore: 1, quizTotal: 2,
      } });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
      const model = () => host.querySelector('.diss-living-function');
      const badge = () => model().querySelector('.diss-living-function__badge');
      const button = (name) => Array.from(model().querySelectorAll('button')).find((el) => el.textContent === name);
      const pathway = () => host.querySelector('.diss-system-playback');
      const speed = () => model().querySelector('button[aria-label="Cycle living function speed"]');
      expect(listeners.size).toBe(1);
      expect(badge().textContent).toBe('Static · reduced motion');
      expect(pathway().textContent).toContain('Static directions · reduced motion');
      expect(button('Function model on').disabled).toBe(false);
      for (const control of [button('Pause'), button('Replay'), speed(), ...pathway().querySelectorAll('button')]) {
        expect(control.disabled).toBe(true);
      }
      const beforeDissection = latestToolData.dissection;
      await act(async () => { button('Pause').click(); button('Replay').click(); speed().click(); });
      expect(latestToolData.dissection).toBe(beforeDissection);

      await act(async () => {
        media.matches = false;
        for (const listener of listeners) listener({ matches: false, media: media.media });
        await Promise.resolve();
      });
      expect(latestToolData.dissection).toBe(beforeDissection);
      expect(badge().textContent).toBe('Playing · normal');
      expect(model().getAttribute('data-motion')).toBe('playing');
      expect(pathway().textContent).toContain('Playing directional flow');
      for (const control of [button('Pause'), button('Replay'), speed(), ...pathway().querySelectorAll('button')]) {
        expect(control.disabled).toBe(false);
      }
      await act(async () => { button('Pause').click(); await Promise.resolve(); });
      expect(badge().textContent).toBe('Paused · normal');
      expect(button('Resume').getAttribute('aria-pressed')).toBe('true');
      await act(async () => { speed().click(); await Promise.resolve(); });
      expect(badge().textContent).toBe('Paused · slow');
      await act(async () => { button('Replay').click(); await Promise.resolve(); });
      expect(badge().textContent).toBe('Playing · slow');
      expect(latestToolData.dissection.livingFunctionReplayToken).toEqual(expect.any(Number));
      expect(listeners.size).toBe(1);

      const beforeReduced = latestToolData.dissection;
      await act(async () => {
        media.matches = true;
        for (const listener of listeners) listener({ matches: true, media: media.media });
        await Promise.resolve();
      });
      expect(latestToolData.dissection).toBe(beforeReduced);
      expect(badge().textContent).toBe('Static · reduced motion');
      expect(button('Pause').disabled).toBe(true);
      expect(button('Function model on').disabled).toBe(false);
      await act(async () => { button('Function model on').click(); await Promise.resolve(); });
      expect(badge().textContent).toBe('Off · preserved view remains static');
      expect(button('Enable function model').disabled).toBe(false);
      expect(listeners.size).toBe(1);

      await act(async () => { root.unmount(); await Promise.resolve(); });
      root = null;
      expect(listeners.size).toBe(0);
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      contextSpy.mockRestore();
      Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: originalMatchMedia });
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('protects destructive reset and announces filtered structure results with focus recovery', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function requestSpecimenReset()');
      expect(source).toContain('function cancelSpecimenReset()');
      expect(source).toContain('function confirmSpecimenReset()');
      expect(source).toContain("var resetSaveKey = 'dissection_progress_' + specimen");
      expect(source).toContain('cancelDissectionSave(resetSaveKey, dissectionSaveOwner);');
      expect(source).toContain("focusResetControl('diss-reset-confirm')");
      expect(source).toContain("if (d.resetConfirmPending) cancelSpecimenReset()");
      expect(source).toContain('"aria-controls": "diss-directory-results"');
      expect(source).toContain('"aria-describedby": "diss-directory-count diss-directory-keyboard-help"');
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
    const directoryDocument = new DOMParser().parseFromString(html, 'text/html');
    const describedIds = directoryDocument.querySelector('[aria-controls="diss-directory-results"]').getAttribute('aria-describedby').split(/\s+/);
    expect(describedIds).toEqual(['diss-directory-count', 'diss-directory-keyboard-help']);
    for (const id of describedIds) expect(directoryDocument.getElementById(id)?.textContent.trim()).toBeTruthy();
    const dataSource = readFileSync(DISSECTION_PATHS[0], 'utf8'), specimens = contractSpecimens(dataSource);
    const normalizeSearch = contractFunction(dataSource, 'normalizeDissectionSearch');
    const searchMatches = contractFunction(dataSource, 'matchesStructureSearch', { normalizeDissectionSearch: normalizeSearch,
      organSearchTokens: normalizeSearch('kidney').split(/\s+/).filter(Boolean) });
    const expectedNames = specimens.frog.organs.organs.filter(searchMatches).map(organ => organ.name);
    expect(expectedNames).toContain('Kidneys');
    const results = directoryDocument.querySelector('#diss-directory-results');
    expect([...results.querySelectorAll('.diss-directory-item__name')].map(node => node.textContent.trim())).toEqual(expectedNames);
    expect(directoryDocument.getElementById('diss-directory-count').textContent).toContain(expectedNames.length + ' matching '
      + (expectedNames.length === 1 ? 'structure' : 'structures') + ' in Organs');
    expect(html).toContain('aria-atomic="true"');
  });

  it('implements the ARIA radio keyboard pattern for procedural instruments', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function prepareNextProcedureStep(focusTarget)');
      // 91652c2fe made the focus function injectable; it still defaults to focusDissectionTarget.
      expect(source.includes('var prepareFocus = typeof focusTarget === \'function\' ? focusTarget : focusDissectionTarget;'), 'default focus helper').toBe(true);
      expect(source.includes("prepareFocus('diss-instrument-' + nextTool);"), 'planner focuses the next instrument').toBe(true);
      expect(source).toContain('No setup was changed automatically.');
      expect(source).not.toContain("selectProcedureInstrument(nextTool, 'next-step planner')");
      expect(source).toContain('function selectProcedureInstrument(toolId, inputMethod)');
      expect(source).toContain('function onInstrumentKeyDown(e, toolId)');
      expect(source).toContain("var navigationKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']");
      expect(source).toContain("id: 'diss-instrument-' + tool.id");
      expect(source).toContain("inputHint: 'Press · drag'");
      expect(source).toContain("inputHint: 'Stroke'");
      expect(source).toContain('Interaction: ');
      expect(source).toContain('tabIndex: activeInstrument === tool.id ? 0 : -1');
      expect(source).toContain("selectProcedureInstrument(keyboardTool.id, 'keyboard shortcut ' + e.key)");
      expect(source).toContain("setProcedureFeedback(selectionMessage, readiness.tone === 'ready' || readiness.tone === 'complete' ? 'success' : 'caution')");
      expect(source).not.toContain("announceToSR(selectionMessage + ' ' + toolState.instruction)");
      expect(source).toContain('var actionOutcome = procedureOutcomeFeedbackData(action, patch, tissueBefore, next.tissueState, tone)');
      expect(source).toContain('outcomeDetail: actionOutcome.detail');
      expect(source).toContain('diss-procedure__timeline-outcome');
      expect(source).toContain('var latestActionDeltaMetrics =');
      expect(source).toContain('Latest tissue response metric changes');
      expect(source).toContain('var fieldReadinessChecks =');
      expect(source).toContain('function runFieldReadinessCheck()');
      expect(source).toContain('function resolveFieldReadinessIssue(checkId, event)');
      expect(source).toContain('function showProcedureLastResponse()');
      expect(source).toContain('function selectProcedureTimelineEntry(entry)');
      expect(source).toContain('selectedProcedureActionAt');
      expect(source).toContain('diss-procedure__timeline-entry');
      expect(source).toContain('snapshot.actionLog =');
      expect(source).toContain('function drawComparisonMarker(point, label, color, diamond)');
      expect(source).toContain('function toggleTechniqueCompareReplay()');
      expect(source).toContain('compareReplayProgress');
      expect(source).toContain('data-diss-compare-progress');
      expect(source).toContain('function comparisonMarkerProgress(entry, markerIndex, total, path)');
      expect(source).toContain('Technique path comparison legend');
      expect(source).toContain('Replay last response');
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
    expect(html).toContain('Press · drag');
    expect(html).toContain('Stroke');
  });

  it('adds an explicit specimen-specific living-function model with responsive playback', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function specimenLivingFunctionProfile()');
      expect(source).toContain("title: 'Buccal-pump ventilation', motion: 'frog-buccal'");
      expect(source).toContain("title: 'Peristaltic locomotion', motion: 'worm-peristalsis'");
      expect(source).toContain("title: 'Opercular ventilation', motion: 'fish-operculum'");
      expect(source).toContain("title: 'Gill-bailer ventilation', motion: 'crayfish-gills'");
      expect(source).toContain("title: 'Diaphragmatic ventilation (postnatal model)', motion: 'pig-diaphragm'");
      expect(source).toContain("title: 'Pupillary light reflex', motion: 'eye-pupil'");
      expect(source).toContain("title: 'Coordinated cardiac cycle', motion: 'heart-cycle'");
      expect(source).toContain('The living-function model is opt-in and explicitly distinct from preserved specimen behavior.');
      expect(source).toContain('function updateLivingFunctionTimeline(nowMs)');
      expect(source).toContain('var timelineRunning = !!d.livingFunctionEnabled && !d.livingFunctionPaused && !dissMotionReduced;');
      expect(source).toContain('if (timelineRunning) canvas._livingFunctionElapsedMs += frameDeltaMs * speed;');
      expect(source).toContain('var livingTimeline = updateLivingFunctionTimeline(frameStartedAt);');
      expect(source).toContain('var livingPhase = livingTimeline.phase;');
      expect(source).toContain('var livingWave = livingTimeline.wave;');
      expect(source).toContain('return { phase: phase, wave: (1 - Math.cos(phase * Math.PI * 2)) / 2, running: timelineRunning, elapsedMs: canvas._livingFunctionElapsedMs };');
      expect(source).toContain('livingFunctionReplayToken');
      expect(source).toContain('LIVING MODEL');
      expect(source).toContain('In-life physiology');
      expect(source).toContain('not preserved motion');
      expect(source).toContain('livingFunction: livingFunctionEnabled ?');
      expect(source).toContain("report += 'Living function model: '");
      expect(source).toContain(`"aria-label": __alloT('stem.dissection.a11y_specimen_specific_living_function_model', 'Specimen-specific living function model')`);
    }

    const html = renderTool('dissection', {
      dissection: {
        specimen: 'earthworm',
        activeLayer: 'organs',
        _dissLoadedSpec: 'earthworm',
        workspaceMode: 'advanced',
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

  it('keeps living-function pause, speed, replay, and control state synchronized', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    let latestToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'earthworm',
          activeLayer: 'organs',
          anatomicalView: 'dorsal',
          _dissLoadedSpec: 'earthworm',
          workspaceMode: 'advanced',
          livingFunctionEnabled: true,
          livingFunctionPaused: false,
          livingFunctionSpeed: 'normal',
          livingFunctionReplayToken: 1,
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    function livingModel() {
      return host.querySelector('[aria-label="Specimen-specific living function model"]');
    }

    function livingButton(label) {
      return Array.from(livingModel().querySelectorAll('button')).find((button) => button.textContent.includes(label));
    }

    async function clickLivingButton(label) {
      const button = livingButton(label);
      expect(button).not.toBeNull();
      await act(async () => {
        button.click();
        await Promise.resolve();
      });
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });

      expect(livingModel().textContent).toContain('Playing');
      expect(livingModel().textContent).toContain('normal');
      expect(livingButton('Pause').getAttribute('aria-pressed')).toBe('false');
      expect(livingButton('Speed: normal').disabled).toBe(false);

      await clickLivingButton('Pause');
      expect(latestToolData.dissection.livingFunctionPaused).toBe(true);
      expect(livingModel().textContent).toContain('Paused');
      expect(livingModel().textContent).toContain('normal');
      expect(livingButton('Resume').getAttribute('aria-pressed')).toBe('true');

      await clickLivingButton('Speed: normal');
      expect(latestToolData.dissection.livingFunctionSpeed).toBe('slow');
      expect(latestToolData.dissection.livingFunctionPaused).toBe(true);
      expect(livingModel().textContent).toContain('Paused');
      expect(livingModel().textContent).toContain('slow');

      await clickLivingButton('Resume');
      expect(latestToolData.dissection.livingFunctionPaused).toBe(false);
      expect(livingModel().textContent).toContain('Playing');
      expect(livingModel().textContent).toContain('slow');

      await clickLivingButton('Speed: slow');
      expect(latestToolData.dissection.livingFunctionSpeed).toBe('fast');
      await clickLivingButton('Pause');
      const replayTokenBefore = latestToolData.dissection.livingFunctionReplayToken;
      await clickLivingButton('Replay');
      expect(latestToolData.dissection.livingFunctionPaused).toBe(false);
      expect(latestToolData.dissection.livingFunctionReplayToken).toBeGreaterThan(replayTokenBefore);
      expect(livingModel().textContent).toContain('Playing');
      expect(livingModel().textContent).toContain('fast');

      await clickLivingButton('Function model on');
      expect(latestToolData.dissection.livingFunctionEnabled).toBe(false);
      expect(latestToolData.dissection.livingFunctionPaused).toBe(false);
      expect(livingModel().textContent).toContain('Off');
      expect(livingButton('Pause').disabled).toBe(true);
      expect(livingModel().querySelector('[aria-label="Cycle living function speed"]').disabled).toBe(true);
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
      contextSpy.mockRestore();
    }
  }, 60000);

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
      expect(source).toContain('Light-aware cavity depth separates the retracted field into rim, wall, and deeper bed.');
      expect(source).toContain('function traceRetractedFieldContour(scale)');
      expect(source).toContain('var cavityLightVector =');
      expect(source).toContain('var cavityShadow = ctx.createLinearGradient');
      expect(source).toContain('var flapLiftPixels = 4 + spread * Math.min(W, H) * 0.18');
      expect(source).toContain('A light-facing cut rim reinforces flap elevation without adding another label.');
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
        workspaceMode: 'advanced',
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
      expect(source).toContain('.diss-instrument[data-next="true"]:not([aria-checked="true"])');
      expect(source).toContain('.diss-instrument:disabled { opacity: 1;');
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
    const previousMarkup = document.body.innerHTML;
    try {
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
    } finally {
      document.body.innerHTML = previousMarkup;
    }
  }, 180000);


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
    expect(html).toContain('aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Home End Enter Space Escape 0 R V 1 2 3 4 5 6 7"');
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
        workspaceMode: 'advanced',
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
    expect(html).toContain('data-optical-reading="light"><dt>Light intensity</dt><dd>96%</dd>');
    expect(html).toContain('data-optical-reading="illumination"><dt>Illumination status</dt><dd>Glare limited</dd>');
  });

  it('keeps the fullscreen dock visible and escapable in CSS fallback mode', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('data-allo-fullscreen-active="true"');
      expect(source).toContain('"data-diss-fullscreen-exit": true');
      // Went through the translator on 2026-09-21: a bare literal has no key, so
      // no translator is ever shown it and it ships English in all 63 packs.
      // Assert both halves — the key, and the English a screen reader falls back to.
      expect(source).toContain("title: __alloT('stem.dissection.exit_fullscreen_escape','Exit fullscreen (Escape)')");
      expect(source).toContain('"aria-keyshortcuts": "Escape"');
      expect(source).toContain('max-height: min(34vh, 18rem)');
      expect(source).toContain('grid-template-rows: minmax(0, 36vh) minmax(0, 1fr)');
      expect(source).toContain('"aria-live": "polite"');
      expect(source).toContain('"data-tool-status": "true"');
      expect(source).toContain('diss-stage__live[data-tool-status="true"][data-tone="ready"]');
      expect(source).toContain("queryDissectionNode('#diss-canvas-status') || queryDissectionNode('[data-diss-tool-status]')");
      expect(source).toContain("var liveStatus = queryDissectionNode('#diss-canvas-status') || queryDissectionNode('[data-diss-tool-status]')");
      expect(source).toContain("var resistanceStatus = queryDissectionNode('#diss-canvas-status') || queryDissectionNode('[data-diss-tool-status]')");
      expect(source).toContain("var strokeSafetyStatus = queryDissectionNode('#diss-canvas-status') || queryDissectionNode('[data-diss-tool-status]')");
      expect(source).toContain("'Next: ' + stageHandoffLabel + ' \\u00B7 ' + stageHandoffDetail");
      expect(source).toContain('function enterDissectionFullscreen(control)');
      expect(source).toContain('function exitDissectionFullscreen(control)');
      expect(source).toContain("root.querySelector('[data-diss-fullscreen-stage]')");
      expect(source).toContain('focusDissectionFullscreenExit(stage)');
      expect(source).toContain('restoreDissectionFullscreenFocus(stage)');
    }
    for (const filePath of STEM_SHARED_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('var _stemFsNotify = function(el, active)');
      expect(source).toContain("_stemFsNotify(el, true);");
      expect(source).toContain("_stemFsNotify(el, false);");
      expect(source).toContain("data-allo-fullscreen-active");
    }
  });
  it('integrates dynamic procedure, exposure, scenario, performance, and fullscreen controls', () => {
    for (const filePath of DISSECTION_PATHS) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain("order: ['inspect', 'pin', 'scalpel', 'scissors', 'forceps', 'probe']");
      expect(source).toContain('function procedureActionComplete(state, action)');
      expect(source).toContain('function procedureExposureData(state)');
      expect(source).toContain('function structureExposureState(org, state)');
      expect(source).toContain('function procedureMaterialInteractionData(toolId, state)');
      expect(source).toContain('function procedureDecisionScore(state)');
      expect(source).toContain("{ id: 'relationship-pathway'");
      expect(source).toContain("{ id: 'restricted-tray'");
      expect(source).toContain("{ id: 'timed-practical'");
      expect(source).toContain('function traceNextAnatomicalRelationship()');
      expect(source).toContain("setAccessibilityPreference('simplifiedInstructions'");
      expect(source).toContain('canvas._adaptiveFrameFloor');
      expect(source).toContain('"data-diss-fullscreen-stage": true');
      expect(source).toContain("root.querySelector('[data-diss-fullscreen-stage]')");
      expect(source).toContain('window.__alloStemFS(stage)');
      expect(source).toContain('Fullscreen specimen view and tools');
      expect(source).toContain('Exit fullscreen');
      expect(source).toContain('var stageHandoffLabel = currentLayerDone');
      expect(source).toContain('className: "diss-stage__handoff"');
      expect(source).toContain('className: "diss-stage__handoff-glyph"');
      expect(source).toContain('className: "diss-stage__handoff-progress"');
      expect(source).toContain('className: "diss-fullscreen-dock__handoff"');
      expect(source).toContain('"aria-label": "Fullscreen next action: "');
      expect(source).toContain('function formatScenarioTime(seconds)');
      expect(source).toContain('function activateProcedureScenario(scenario, restartAttempt)');
      expect(source).toContain('function procedureScenarioGuidance(status, procedureState)');
      expect(source).toContain('var dissScenarioTimer = setInterval');
      expect(source).toContain('clearInterval(dissScenarioTimer)');
      expect(source).toContain('diss-scenario-console__progress');
      expect(source).toContain('id: "diss-scenario-select"');
      expect(source).toContain('Restart scenario');
      expect(source).toContain('function onDissectionFullscreenChange()');
      expect(source).toContain('window.__alloDissectionFullscreenReturn = control');
      expect(source).toContain("document.addEventListener('fullscreenchange', onDissectionFullscreenChange)");
      expect(source).toContain('difficulty: scenarioDefinition.difficulty');
      expect(source).toContain("status: scenarioStatus.complete ? 'complete'");
      expect(source).toContain("(procedureProtocol.order || []).length + '-step progress");
expect(source).toContain('Scenario checkpoint: ');
      expect(source).toContain('function procedureToolReadinessData(toolId, state)');
      expect(source).toContain("{ id: 'sequence', label: 'Sequence', ready: sequenceReady }");
      expect(source).toContain('className: "diss-readiness"');
      expect(source).toContain(`"aria-label": __alloT('stem.dissection.a11y_active_instrument_action_readiness', 'Active instrument action readiness')`);
      expect(source).toContain('toolReadiness: { score: currentToolReadiness.score');
      expect(source).toContain("report += 'Active tool readiness: '");
      expect(source).toContain("var selectionMessage = tool.label + ' selected'");
    }

    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        _dissLoadedSpec: 'frog',
        workspaceMode: 'advanced',
        toolbarViewOpen: true,
        toolbarToolsOpen: true,
        relationshipMode: true,
        selectedOrgan: 'heart',
        procedureByLayer: { skin: { inspected: true, pins: [] } },
      },
    });

    expect(html).toContain('Decision quality');
    expect(html).toContain('Anatomical exposure');
    expect(html).toContain('Progressive exposure');
    expect(html).toContain('Material response');
    expect(html).toContain('Simple steps off');
    expect(html).toContain('Fullscreen specimen view and tools');
    expect(html).toContain('Exit fullscreen');
    expect(html).toContain('Fullscreen illumination intensity');
    expect(html).toContain('Fullscreen active instrument');
    expect(html).toContain('Trace next exposed connection');
    expect(html).toContain('Scenario lab');
    expect(html).toContain('Choose procedure scenario');
    expect(html).toContain('Restart scenario');
    expect(html).toContain('role="progressbar"');
expect(html).toContain('Scenario center');
    expect(html).toContain('Action readiness');
    expect(html).toContain('Active instrument action readiness');
    expect(html).toContain('Readiness checks');
    expect(html).toContain('Sequence ·');
    expect(html).toContain('Calibration ·');
    expect(html).toContain('Field + view ·');
    expect(html).toContain('Contact ·');

    const timedHtml = renderTool('dissection', {
      dissection: {
        specimen: 'frog',
        activeLayer: 'skin',
        _dissLoadedSpec: 'frog',
        workspaceMode: 'advanced',
        procedureScenario: 'timed-practical',
        scenarioStartedAt: Date.now(),
        scenarioTimeRemaining: 125,
        procedureByLayer: { skin: { inspected: true, pins: [] } },
      },
    });
    expect(timedHtml).toContain('4-minute technique challenge');
    expect(timedHtml).toContain('2 minutes 5 seconds remaining');
    expect(timedHtml).toContain('role="timer"');
  });

  it('undoes a repeated learning-checked action without losing the earlier state or stale completion evidence', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    let latestToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog', workspaceMode: 'advanced',
          scenarioCompletedAt: 99,
          procedureByLayer: {
            skin: {
              surfaceCleared: true,
              dropperPoint: { x: 0.8, y: 0.7 },
              dropperDragMetrics: { control: 92 },
              history: ['dropper', 'dropper'],
              actionLog: [
                { action: 'dropper', label: 'Hydrate', outcome: 'First drop', at: 1, undoState: {} },
                { action: 'dropper', label: 'Hydrate', outcome: 'Second drop', at: 2, undoState: { surfaceCleared: true, dropperPoint: { x: 0.2, y: 0.3 }, dropperDragMetrics: { control: 71 } } },
              ],
              learningChecks: { dropper: { reflectionChoice: 'observe', reflectionCorrect: true, reflectionFeedback: 'Verified.' } },
            },
          },
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      localStorage.removeItem('dissection_progress_frog');
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });

      const undo = host.querySelector('[aria-label="Undo the last technique action and visually restore the previous tissue state"]');
      expect(undo).not.toBeNull();
      expect(undo.disabled).toBe(false);
      await act(async () => { undo.click(); await Promise.resolve(); });

      const procedure = latestToolData.dissection.procedureByLayer.skin;
      expect(procedure.surfaceCleared).toBe(true);
      expect(procedure.dropperPoint).toEqual({ x: 0.2, y: 0.3 });
      expect(procedure.dropperDragMetrics).toEqual({ control: 71 });
      expect(procedure.history).toEqual(['dropper']);
      expect(procedure.actionLog).toHaveLength(1);
      expect(procedure.learningChecks.dropper).toMatchObject({
        reflectionChoice: null,
        reflectionCorrect: false,
        reflectionFeedback: 'Repeat the action, then explain the new observed response.',
      });
      expect(latestToolData.dissection.scenarioCompletedAt).toBe(0);

      const firstActionUndo = host.querySelector('[aria-label="Undo the last technique action and visually restore the previous tissue state"]');
      expect(firstActionUndo).not.toBeNull();
      await act(async () => { firstActionUndo.click(); await Promise.resolve(); });
      const clearedProcedure = latestToolData.dissection.procedureByLayer.skin;
      expect(clearedProcedure.surfaceCleared).toBe(false);
      expect(clearedProcedure.dropperPoint).toBeNull();
      expect(clearedProcedure.dropperDragMetrics).toBeNull();
      expect(clearedProcedure.history).toEqual([]);
      expect(clearedProcedure.actionLog).toEqual([]);
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem('dissection_progress_frog');
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('keeps one persistence owner when the host recreates deferred setter wrappers', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    let latestToolData;
    let updateToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog',
          activeLayer: 'skin',
          anatomicalView: 'dorsal',
          _dissLoadedSpec: 'frog',
          organNotes: {},
        },
      });
      const pluginInstanceTokenRef = React.useRef(null);
      if (!pluginInstanceTokenRef.current) pluginInstanceTokenRef.current = {};
      latestToolData = toolData;
      updateToolData = setToolData;
      // This mirrors the production host: the deferred wrapper itself is a
      // fresh function on every parent render, while the bridge token is stable.
      const freshDeferredWrapper = function (updater) { setToolData(updater); };
      return config.render(makeCtx({
        toolData,
        setToolData: freshDeferredWrapper,
        pluginInstanceToken: pluginInstanceTokenRef.current,
      }));
    }

    try {
      localStorage.removeItem('dissection_progress_frog');
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component));
        await Promise.resolve();
      });

      const initialOwner = host.querySelector('[data-dissection-root]').getAttribute('data-dissection-save-owner');
      expect(initialOwner).toMatch(/^lab-\d+$/);

      await act(async () => {
        updateToolData((previous) => ({
          ...previous,
          dissection: {
            ...previous.dissection,
            organNotes: { 'frog|dorsal_skin': 'First observation.' },
          },
        }));
        await Promise.resolve();
      });
      expect(host.querySelector('[data-dissection-root]').getAttribute('data-dissection-save-owner')).toBe(initialOwner);

      await act(async () => {
        updateToolData((previous) => ({
          ...previous,
          dissection: {
            ...previous.dissection,
            organNotes: { 'frog|dorsal_skin': 'Latest observation survives wrapper churn.' },
            timeSpent: 42,
          },
        }));
        await Promise.resolve();
      });
      expect(host.querySelector('[data-dissection-root]').getAttribute('data-dissection-save-owner')).toBe(initialOwner);
      expect(latestToolData.dissection.timeSpent).toBe(42);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 180));
      });
      const persisted = JSON.parse(localStorage.getItem('dissection_progress_frog'));
      expect(persisted.organNotes).toEqual({ 'frog|dorsal_skin': 'Latest observation survives wrapper churn.' });
      expect(persisted.timeSpent).toBe(42);
      expect(host.querySelector('[data-dissection-protected-save]')).toBeNull();
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem('dissection_progress_frog');
      contextSpy.mockRestore();
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
    }
  }, 60000);

  it('keeps keyboard, canvas lifecycle, and fullscreen focus scoped to the originating lab root', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const previousFullscreenHelper = window.__alloStemFS;
    const fullscreenHelper = vi.fn((stage) => {
      stage.__alloFsOn = !stage.__alloFsOn;
      if (stage.__alloFsOn) stage.setAttribute('data-allo-fullscreen-active', 'true');
      else stage.removeAttribute('data-allo-fullscreen-active');
    });
    window.__alloStemFS = fullscreenHelper;
    let latestA;
    let latestB;
    let rootA;
    let rootB;
    let hostA;
    let hostB;

    function LabA() {
      const [toolData, setToolData] = React.useState({ dissection: { specimen: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', _dissLoadedSpec: 'frog', toolbarViewOpen: true } });
      latestA = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    function LabB() {
      const [toolData, setToolData] = React.useState({ dissection: { specimen: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', _dissLoadedSpec: 'frog', toolbarViewOpen: true } });
      latestB = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      localStorage.removeItem('dissection_progress_frog');
      hostA = document.createElement('div');
      hostB = document.createElement('div');
      document.body.append(hostA, hostB);
      rootA = ReactDOMClient.createRoot(hostA);
      rootB = ReactDOMClient.createRoot(hostB);
      await act(async () => {
        rootA.render(React.createElement(LabA));
        rootB.render(React.createElement(LabB));
        await Promise.resolve();
      });

      const canvasA = hostA.querySelector('[data-diss-canvas]');
      const canvasB = hostB.querySelector('[data-diss-canvas]');
      const ownerA = hostA.querySelector('[data-dissection-root]').getAttribute('data-dissection-save-owner');
      const ownerB = hostB.querySelector('[data-dissection-root]').getAttribute('data-dissection-save-owner');
      expect(ownerA).toMatch(/^lab-\d+$/);
      expect(ownerB).toMatch(/^lab-\d+$/);
      expect(ownerA).not.toBe(ownerB);
      expect(canvasA._dissAlive).toBe(true);
      expect(canvasB._dissAlive).toBe(true);
      expect(canvasA._dissKeyHandler).toEqual(expect.any(Function));
      expect(canvasB._dissKeyHandler).toEqual(expect.any(Function));
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 180)); });

      await act(async () => {
        canvasA.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }));
        await Promise.resolve();
      });
      expect(latestA.dissection.anatomicalView).toBe('ventral');
      expect(latestB.dissection.anatomicalView).toBe('dorsal');
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 180)); });

      const handlerA = canvasA._dissKeyHandler;
      canvasA._dissKeyHandler = null;
      await act(async () => {
        canvasA.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }));
        await Promise.resolve();
      });
      expect(latestA.dissection.anatomicalView).toBe('ventral');
      expect(latestB.dissection.anatomicalView).toBe('dorsal');
      canvasA._dissKeyHandler = handlerA;

      const skipToCanvasB = Array.from(hostB.querySelectorAll('.diss-skip-link'))
        .find((link) => link.textContent.includes('interactive specimen'));
      expect(skipToCanvasB).toBeDefined();
      const canvasFocusSpy = vi.spyOn(canvasB, 'focus');
      skipToCanvasB.focus();
      expect(document.activeElement).toBe(skipToCanvasB);
      await act(async () => {
        skipToCanvasB.click();
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(latestB.dissection.procedureFeedback && latestB.dissection.procedureFeedback.message).toContain('Interactive specimen focused');
      expect(canvasFocusSpy).toHaveBeenCalled();
      expect(document.activeElement).toBe(canvasB);
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 180)); });
      expect(JSON.parse(localStorage.getItem('dissection_progress_frog')).anatomicalView).toBe('ventral');
      expect(hostA.querySelector('[data-dissection-protected-save]')).toBeNull();
      expect(hostB.querySelector('[data-dissection-protected-save]')).not.toBeNull();

      const entryB = hostB.querySelector('[aria-label="Enter fullscreen specimen mode with view and tool controls"]');
      const stageA = hostA.querySelector('[data-diss-fullscreen-stage]');
      const stageB = hostB.querySelector('[data-diss-fullscreen-stage]');
      entryB.focus();
      await act(async () => {
        entryB.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(fullscreenHelper).toHaveBeenLastCalledWith(stageB);
      expect(fullscreenHelper).not.toHaveBeenCalledWith(stageA);
      expect(document.activeElement).toBe(hostB.querySelector('[data-diss-fullscreen-exit]'));

      await act(async () => {
        hostB.querySelector('[data-diss-fullscreen-exit]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(document.activeElement).toBe(entryB);

      await act(async () => { rootB.unmount(); await Promise.resolve(); });
      rootB = null;
      expect(canvasA._dissAlive).toBe(true);
      await act(async () => {
        canvasA.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }));
        await Promise.resolve();
      });
      expect(latestA.dissection.anatomicalView).toBe('lateral');
    } finally {
      if (rootB) await act(async () => { rootB.unmount(); await Promise.resolve(); });
      if (rootA) await act(async () => { rootA.unmount(); await Promise.resolve(); });
      if (hostA) hostA.remove();
      if (hostB) hostB.remove();
      localStorage.removeItem('dissection_progress_frog');
      window.__alloStemFS = previousFullscreenHelper;
      window.__alloDissectionFullscreenReturn = null;
      window.__alloDissectionFullscreenStage = null;
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
      contextSpy.mockRestore();
    }
  }, 60000);

  it('keeps layer and teaching timers isolated when a sibling lab unmounts', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    let latestA;
    let continueAction;
    const awardXP = vi.fn();
    let rootA;
    let rootB;
    let hostA;
    let hostB;

    function findContinueAction(node) {
      if (!React.isValidElement(node)) return null;
      if (node.props.className === 'diss-mission-shortcuts') {
        const buttons = React.Children.toArray(node.props.children);
        return buttons[buttons.length - 1].props.onClick;
      }
      for (const child of React.Children.toArray(node.props.children)) {
        const action = findContinueAction(child);
        if (action) return action;
      }
      return null;
    }

    function LabA() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog',
          activeLayer: 'skin',
          anatomicalView: 'ventral',
          _dissLoadedSpec: 'frog',
          workspaceMode: 'advanced',
          activeInstrument: 'probe',
          exploredOrgans: {
            'frog|dorsal_skin': true,
            'frog|ventral_skin': true,
            'frog|tympanum': true,
            'frog|nictitating': true,
          },
          organNotes: {
            'frog|dorsal_skin': 'Protective pigmented surface.',
            'frog|ventral_skin': 'Thin vascular surface.',
            'frog|tympanum': 'External sound membrane.',
            'frog|nictitating': 'Protective transparent eyelid.',
          },
          organConfidence: {
            'frog|dorsal_skin': 2,
            'frog|ventral_skin': 2,
            'frog|tympanum': 2,
            'frog|nictitating': 2,
          },
          procedureByLayer: {
            skin: {
              inspected: true,
              incisionStarted: true,
              incisionExtended: true,
              retracted: true,
              pins: [{ x: 0.3, y: 0.5 }, { x: 0.7, y: 0.5 }],
              probed: true,
              probedOrganId: 'ventral_skin',
              history: ['inspect', 'pin', 'scalpel', 'scissors', 'forceps', 'probe'],
              actionLog: [{ action: 'inspect', label: 'Inspect', outcome: 'Orientation recorded', at: 1 }],
            },
          },
        },
      });
      latestA = toolData;
      const view = config.render(makeCtx({ toolData, setToolData, awardXP }));
      continueAction = findContinueAction(view);
      return view;
    }

    function LabB() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'pig',
          activeLayer: 'skin',
          anatomicalView: 'ventral',
          _dissLoadedSpec: 'pig',
        },
      });
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      localStorage.removeItem('dissection_progress_frog');
      localStorage.removeItem('dissection_progress_pig');
      hostA = document.createElement('div');
      hostB = document.createElement('div');
      document.body.append(hostA, hostB);
      rootA = ReactDOMClient.createRoot(hostA);
      rootB = ReactDOMClient.createRoot(hostB);
      await act(async () => {
        rootA.render(React.createElement(LabA));
        rootB.render(React.createElement(LabB));
        await Promise.resolve();
      });

      const canvasA = hostA.querySelector('[data-diss-canvas]');
      await act(async () => {
        hostA.querySelector('[aria-label="Show a generalized safe-technique demonstration on the specimen"]').click();
        await Promise.resolve();
      });
      const demoTimer = canvasA._dissTimers?.procedureDemo;
      expect(demoTimer).toBeDefined();
      expect(latestA.dissection._procedureDemo).toMatchObject({ layer: 'skin', duration: 3200 });

      await act(async () => {
        rootB.unmount();
        rootB = null;
        await Promise.resolve();
      });
      expect(canvasA._dissTimers?.procedureDemo).toBe(demoTimer);
      expect(latestA.dissection._procedureDemo).toMatchObject({ layer: 'skin', duration: 3200 });

      rootB = ReactDOMClient.createRoot(hostB);
      await act(async () => {
        rootB.render(React.createElement(LabB));
        await Promise.resolve();
      });

      await act(async () => {
        hostA.querySelector('[aria-label="Replay the recorded technique attempt on the specimen"]').click();
        await Promise.resolve();
      });
      const replayTimer = canvasA._dissTimers?.procedureReplay;
      expect(replayTimer).toBeDefined();
      expect(latestA.dissection._procedureReplay?.actions).toHaveLength(1);
      expect(canvasA._dissTimers?.procedureDemo).toBeUndefined();
      expect(latestA.dissection._procedureDemo).toBeNull();

      const revealButton = hostA.querySelector('[data-next-action="peel-layer"] .diss-next-action__primary');
      expect(revealButton).not.toBeNull();
      await act(async () => {
        revealButton.click();
        await Promise.resolve();
      });
      const peelTimer = canvasA._dissTimers?.layerPeel;
      expect(peelTimer).toBeDefined();
      expect(latestA.dissection._incisionAnim?.active).toBe(true);
      const pendingStartTick = latestA.dissection._incisionAnim.startTick;
      expect(Number.isFinite(pendingStartTick)).toBe(true);
      const continueButton = Array.from(hostA.querySelectorAll('.diss-mission-shortcuts button'))
        .find((button) => button.textContent === 'Technique in progress...');
      expect(continueButton, 'pending activity shortcut').toBeDefined();
      expect(continueButton.disabled).toBe(true);
      expect(revealButton.disabled).toBe(true);
      const pendingProof = {
        notes: latestA.dissection.organNotes, confidence: latestA.dissection.organConfidence,
        explored: latestA.dissection.exploredOrgans, procedures: latestA.dissection.procedureByLayer,
      };
      await act(async () => {
        continueButton.click();
        continueButton.click();
        revealButton.click();
        continueAction();
        await Promise.resolve();
      });
      expect(canvasA._dissTimers?.layerPeel).toBe(peelTimer);
      expect(latestA.dissection._incisionAnim.startTick).toBe(pendingStartTick);
      expect(latestA.dissection.activeLayer).toBe('skin');
      expect(latestA.dissection.revealedLayers?.skin).not.toBe(true);
      expect({
        notes: latestA.dissection.organNotes, confidence: latestA.dissection.organConfidence,
        explored: latestA.dissection.exploredOrgans, procedures: latestA.dissection.procedureByLayer,
      }).toEqual(pendingProof);

      await act(async () => {
        rootB.unmount();
        rootB = null;
        await Promise.resolve();
      });

      expect(canvasA._dissTimers?.procedureDemo).toBeUndefined();
      expect(latestA.dissection._procedureDemo).toBeNull();
      expect(canvasA._dissTimers?.procedureReplay).toBe(replayTimer);
      expect(canvasA._dissTimers?.layerPeel).toBe(peelTimer);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 700));
      });
      expect(latestA.dissection.revealedLayers).toMatchObject({ skin: true });
      expect(latestA.dissection.activeLayer).toBe('muscle');
      expect(awardXP.mock.calls.filter(([toolId, amount, reason]) => toolId === 'dissection' && amount === 3 && reason === 'Peeled skin layer')).toHaveLength(1);
      expect(canvasA._dissTimers?.layerPeel).toBeUndefined();
      expect(canvasA._dissTimers?.layerTransition).toBeDefined();
      expect(latestA.dissection._procedureDemo).toBeNull();
      expect(latestA.dissection._procedureReplay).not.toBeNull();
    } finally {
      if (rootB) await act(async () => { rootB.unmount(); await Promise.resolve(); });
      if (rootA) await act(async () => { rootA.unmount(); await Promise.resolve(); });
      if (hostA) hostA.remove();
      if (hostB) hostB.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem('dissection_progress_frog');
      localStorage.removeItem('dissection_progress_pig');
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
      contextSpy.mockRestore();
    }
  }, 60000);

  it('retains a transiently failed snapshot and blocks specimen switching until the save succeeds', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const frogKey = 'dissection_progress_frog';
    const pigKey = 'dissection_progress_pig';
    const nativeSetItem = Storage.prototype.setItem;
    let failFrogWrite = false;
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (failFrogWrite && key === frogKey) throw new DOMException('Temporary quota failure', 'QuotaExceededError');
      return nativeSetItem.call(this, key, value);
    });
    let latestToolData;
    let updateToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({ dissection: { specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog' } });
      latestToolData = toolData;
      updateToolData = setToolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      localStorage.removeItem(frogKey);
      localStorage.removeItem(pigKey);
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 180)); });

      failFrogWrite = true;
      await act(async () => {
        updateToolData((previous) => ({
          ...previous,
          dissection: { ...previous.dissection, organNotes: { 'frog|dorsal_skin': 'Unsaved transient observation.' } },
        }));
        await Promise.resolve();
      });
      let pigTab = null;
      for (let renderAttempt = 0; renderAttempt < 10 && !pigTab; renderAttempt += 1) {
        pigTab = host.querySelector('[id="diss-specimen-tab-pig"]');
        if (!pigTab) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
      }
      expect(pigTab).not.toBeNull();
      await act(async () => { pigTab.click(); await Promise.resolve(); });

      expect(latestToolData.dissection.specimen).toBe('frog');
      expect(host.querySelector('[data-diss-tool-status]').textContent).toContain('specimen was not changed');

      failFrogWrite = false;
      await act(async () => { host.querySelector('[id="diss-specimen-tab-pig"]').click(); await Promise.resolve(); });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
      expect(latestToolData.dissection.specimen).toBe('pig');
      expect(JSON.parse(localStorage.getItem(frogKey)).organNotes['frog|dorsal_skin']).toBe('Unsaved transient observation.');
    } finally {
      failFrogWrite = false;
      setItemSpy.mockRestore();
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem(frogKey);
      localStorage.removeItem(pigKey);
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
      contextSpy.mockRestore();
    }
  }, 60000);

  it('keeps review items beyond the five-question batch and rejects phantom verification credit', async () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const reviewIds = ['dorsal_skin', 'ventral_skin', 'tympanum', 'nictitating', 'heart', 'lungs'];
    let latestToolData;
    let root;
    let host;

    function Component() {
      const [toolData, setToolData] = React.useState({
        dissection: {
          specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog',
          quizMode: true, quizReviewMode: true, quizReviewQueue: reviewIds,
          quizIdx: 4, quizTotal: 5, quizFeedback: { correct: true, chosen: 'dorsal_skin', supported: true }, quizSeed: 42, quizAnswerMode: 'choices',
          assessmentCompletedAt: 123, assessmentRecordedScore: 3, assessmentRecordedTotal: 5,
          verifiedIdentifications: { 'frog|toString': { status: 'verified' }, 'frog|constructor': { status: 'verified' } },
          instructorRequiredStructures: 2,
        },
      });
      latestToolData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });

      const advance = host.querySelector('button[aria-label="View assessment summary"]');
      expect(advance).not.toBeNull();
      await act(async () => { advance.click(); await Promise.resolve(); });

      expect(latestToolData.dissection.quizComplete).toBe(true);
      expect(latestToolData.dissection.quizReviewQueue).toHaveLength(1);
      expect(reviewIds).toContain(latestToolData.dissection.quizReviewQueue[0]);
      expect(host.textContent).toContain('Review remaining structures');
      expect(host.textContent).toContain('0/2 guided identifications verified');
      expect(host.textContent).not.toContain('2/2 guided identifications verified');
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem('dissection_progress_frog');
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
      contextSpy.mockRestore();
    }
  }, 60000);

  it('ignores retired review IDs and announces reset confirmation only once', async () => {
    const staleHtml = renderTool('dissection', {
      dissection: {
        specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog',
        quizMode: true, quizComplete: true, quizReviewQueue: ['retired-structure-id'],
        assessmentCompletedAt: 123, assessmentRecordedScore: 3, assessmentRecordedTotal: 5,
      },
    });
    expect(staleHtml).toContain('No missed structures are waiting for supported review.');
    expect(staleHtml).not.toContain('Review missed structures');
    expect(staleHtml).not.toContain('retired-structure-id');

    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const announceToSR = vi.fn();
    let root;
    let host;
    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      function Component() {
        const [toolData, setToolData] = React.useState({ dissection: { specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog', workspaceMode: 'advanced', toolbarToolsOpen: true } });
        return config.render(makeCtx({ toolData, setToolData, announceToSR }));
      }
      await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
      announceToSR.mockClear();
      await act(async () => { host.querySelector('#diss-reset-specimen').click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });

      const resetAnnouncements = announceToSR.mock.calls.filter(([message]) => String(message).startsWith('Reset confirmation opened.'));
      expect(resetAnnouncements).toHaveLength(1);
      expect(document.activeElement).toBe(host.querySelector('#diss-reset-confirm'));
    } finally {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      localStorage.removeItem('dissection_progress_frog');
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
      contextSpy.mockRestore();
    }
  }, 60000);

  async function mountMarkingFixture(patch = {}, savedRecords = {}) {
    // Native React events exercise the actual tool callbacks. Canvas drawing is
    // unrelated to these state contracts and has its own browser verification.
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const config = window.StemLab._registry.dissection;
    const awardXP = vi.fn();
    let latest;
    let update;
    let root;
    let host;
    await new Promise((resolve) => setTimeout(resolve, 150));
    for (const specimen of ['frog', 'pig']) localStorage.removeItem('dissection_progress_' + specimen);
    for (const [specimen, record] of Object.entries(savedRecords)) {
      localStorage.setItem('dissection_progress_' + specimen, JSON.stringify(record));
    }
    const initial = {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
      workspaceMode: 'advanced', toolbarToolsOpen: true,
      visualRealism: 'accessible', parallaxDepth: false, reducedMotion: true, soundEnabled: false,
      selectedOrgan: 'nictitating', hoveredOrgan: 'tympanum',
      canvasZoom: 1.5, canvasPanX: 15, canvasPanY: -8,
      inspectionLens: true, lensPinned: true, lensPinnedOrganId: 'nictitating',
      lensPinnedPoint: { x: 0.6, y: 0.18 }, lensMagnification: 4, lensFocusDepth: 'surface',
      activeInstrument: 'probe', revealedLayers: { skin: true },
      exploredOrgans: { 'frog|nictitating': true },
      organNotes: { 'frog|nictitating': 'Transparent membrane noted before adding marks.' },
      organConfidence: { 'frog|nictitating': 3 },
      verifiedIdentifications: { 'frog|nictitating': { status: 'verified', at: 88 } },
      procedureByLayer: { skin: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 50 }] } },
      toolCalibration: { bladeAngle: 25, scissorsAperture: 35, forcepsGrip: 40, pinAngle: 65, probePressure: 30, salineDose: 1 },
      visualEvidence: [{ id: 11, image: 'data:image/jpeg;base64,eA==', layer: 'skin', view: 'dorsal' }],
      referenceEvidenceId: 11, quizScore: 1, quizTotal: 2,
      annotations: [], rulerMode: false, annotateMode: false, rulerStart: null, rulerEnd: null,
      ...patch,
    };
    function Component() {
      const [toolData, setToolData] = React.useState({ dissection: initial });
      latest = toolData.dissection;
      update = setToolData;
      return config.render(makeCtx({ toolData, setToolData, awardXP }));
    }
    function prepareCanvas() {
      const canvas = host.querySelector('[data-diss-canvas]');
      expect(canvas).not.toBeNull();
      canvas._logicalW = 500;
      canvas._logicalH = 600;
      canvas._interactionZoom = latest.canvasZoom || 1;
      canvas._interactionPanX = latest.canvasPanX || 0;
      canvas._interactionPanY = latest.canvasPanY || 0;
      canvas._parallaxX = 0;
      canvas._parallaxY = 0;
      canvas._cameraTransition = null;
      canvas.getBoundingClientRect = () => ({ left: 10, top: 20, right: 1010, bottom: 1220, width: 1000, height: 1200, x: 10, y: 20, toJSON() {} });
      return canvas;
    }
    async function close() {
      if (root) await act(async () => { root.unmount(); await Promise.resolve(); });
      if (host) host.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));
      for (const specimen of ['frog', 'pig']) localStorage.removeItem('dissection_progress_' + specimen);
      window._dissectionKeyHandler = null;
      document.getElementById('allo-live-dissection')?.remove();
      contextSpy.mockRestore();
    }
    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
      prepareCanvas();
    } catch (error) {
      await close();
      throw error;
    }
    return {
      get state() { return latest; },
      get host() { return host; },
      awardXP,
      close,
      async patch(next) {
        await act(async () => { update((previous) => ({ ...previous, dissection: { ...previous.dissection, ...next } })); await Promise.resolve(); });
      },
      async clickPoint(point) {
        // Dorsal Accessible view keeps specimen scale at 1; project canonical
        // coordinates through the current camera before sending a real click.
        const canvas = prepareCanvas();
        const zoom = latest.canvasZoom || 1;
        const rawX = (point.x - 0.5) * zoom + 0.5 + (latest.canvasPanX || 0) / 500;
        const rawY = (point.y - 0.5) * zoom + 0.5 + (latest.canvasPanY || 0) / 600;
        await act(async () => {
          canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: Math.round(10 + rawX * 1000), clientY: Math.round(20 + rawY * 1200) }));
          await Promise.resolve();
        });
      },
      async key(key) {
        const canvas = prepareCanvas();
        canvas.focus();
        await act(async () => { canvas.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); await Promise.resolve(); });
      },
    };
  }

  function markingWorkProof(state) {
    return JSON.parse(JSON.stringify({
      selectedOrgan: state.selectedOrgan, hoveredOrgan: state.hoveredOrgan,
      activeLayer: state.activeLayer, anatomicalView: state.anatomicalView,
      revealedLayers: state.revealedLayers, exploredOrgans: state.exploredOrgans,
      verifiedIdentifications: state.verifiedIdentifications, completedObjectives: state.completedObjectives,
      organNotes: state.organNotes, organConfidence: state.organConfidence,
      procedureByLayer: state.procedureByLayer, toolCalibration: state.toolCalibration,
      visualEvidence: state.visualEvidence, referenceEvidenceId: state.referenceEvidenceId,
      canvasZoom: state.canvasZoom, canvasPanX: state.canvasPanX, canvasPanY: state.canvasPanY,
      inspectionLens: state.inspectionLens, lensPinned: state.lensPinned,
      lensPinnedPoint: state.lensPinnedPoint, lensPinnedOrganId: state.lensPinnedOrganId,
      lensMagnification: state.lensMagnification, lensFocusDepth: state.lensFocusDepth,
      quizScore: state.quizScore, quizTotal: state.quizTotal,
    }));
  }

  it('adds annotation points immutably through the camera while preserving inspection and recorded work', async () => {
    const previousAnnotations = [{ x: 0.4, y: 0.4, type: 'dot' }];
    const beforeAnnotations = JSON.parse(JSON.stringify(previousAnnotations));
    const fixture = await mountMarkingFixture({ annotateMode: true, annotations: previousAnnotations });
    try {
      const before = markingWorkProof(fixture.state);
      // Hit a different visible organ, then the selected organ. Neither action
      // should change selection or award the structure inspection credit.
      await fixture.clickPoint({ x: 0.5, y: 0.38 });
      expect(previousAnnotations).toEqual(beforeAnnotations);
      expect(fixture.state.annotations).not.toBe(previousAnnotations);
      expect(fixture.state.annotations).toHaveLength(2);
      expect(fixture.state.annotations[1]).toMatchObject({ type: 'dot', prevX: 0.4, prevY: 0.4 });
      expect(fixture.state.annotations[1].x).toBeCloseTo(0.5, 8);
      expect(fixture.state.annotations[1].y).toBeCloseTo(0.38, 8);
      const intermediateAnnotations = fixture.state.annotations;
      const intermediateCopy = JSON.parse(JSON.stringify(intermediateAnnotations));
      await fixture.clickPoint({ x: 0.6, y: 0.18 });
      expect(intermediateAnnotations).toEqual(intermediateCopy);
      expect(fixture.state.annotations).not.toBe(intermediateAnnotations);
      expect(fixture.state.annotations).toHaveLength(3);
      expect(fixture.state.annotations[2].prevX).toBeCloseTo(0.5, 8);
      expect(fixture.state.annotations[2].prevY).toBeCloseTo(0.38, 8);
      expect(fixture.state.annotations[2].x).toBeCloseTo(0.6, 8);
      expect(fixture.state.annotations[2].y).toBeCloseTo(0.18, 8);
      // Leaving the canvas for observation controls preserves the inspector.
      const canvas = fixture.host.querySelector('[data-diss-canvas]');
      const undo = fixture.host.querySelector('[data-diss-point-undo]');
      expect(undo).not.toBeNull();
      await act(async () => {
        canvas.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, relatedTarget: undo }));
        await Promise.resolve();
      });
      expect(fixture.state.hoveredOrgan).toBe(before.hoveredOrgan);
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('starts, finishes, and restarts pointer measurements without recording technique or changing the inspection target', async () => {
    const fixture = await mountMarkingFixture({ rulerMode: true });
    try {
      const before = markingWorkProof(fixture.state);
      await fixture.clickPoint({ x: 0.5, y: 0.38 });
      expect(fixture.state.rulerStart.x).toBeCloseTo(0.5, 8);
      expect(fixture.state.rulerStart.y).toBeCloseTo(0.38, 8);
      expect(fixture.state.rulerEnd).toBeNull();
      expect(fixture.state.procedureFeedback.message).toMatch(/second point|second endpoint/i);
      await fixture.clickPoint({ x: 0.65, y: 0.24 });
      expect(fixture.state.rulerEnd.x).toBeCloseTo(0.65, 8);
      expect(fixture.state.rulerEnd.y).toBeCloseTo(0.24, 8);
      expect(fixture.state.procedureFeedback.message).toContain('1.6 cm');
      const guide = fixture.host.querySelector('[data-pointer-guide-instruction]');
      expect(guide.textContent).not.toMatch(/second endpoint|second point/i);
      expect(guide.textContent).toMatch(/new measurement|start again|first point|first endpoint/i);
      await fixture.clickPoint({ x: 0.6, y: 0.18 });
      expect(fixture.state.rulerStart.x).toBeCloseTo(0.6, 8);
      expect(fixture.state.rulerStart.y).toBeCloseTo(0.18, 8);
      expect(fixture.state.rulerEnd).toBeNull();
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('uses keyboard structure anchors for annotation without selecting, inspecting, or running a procedure', async () => {
    const fixture = await mountMarkingFixture({ annotateMode: true });
    try {
      const before = markingWorkProof(fixture.state);
      await fixture.key('Home');
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.state.annotations).toEqual([]);
      await fixture.key('Enter');
      expect(fixture.state.annotations).toEqual([{ x: 0.5, y: 0.38, type: 'dot' }]);
      await fixture.key('ArrowRight');
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.state.annotations).toHaveLength(1);
      await fixture.key(' ');
      expect(fixture.state.annotations[1]).toMatchObject({ x: 0.65, y: 0.24, prevX: 0.5, prevY: 0.38 });
      await fixture.key('End');
      expect(markingWorkProof(fixture.state)).toEqual(before);
      await fixture.key('Enter');
      expect(fixture.state.annotations[2]).toMatchObject({ x: 0.6, y: 0.18, prevX: 0.65, prevY: 0.24 });
      const recordedPoints = JSON.parse(JSON.stringify(fixture.state.annotations));
      // A frozen canvas must clear its keyboard anchor as focus moves to the
      // observation controls. This redraw must not place a point or inspect it.
      const canvas = fixture.host.querySelector('[data-diss-canvas]');
      const undo = fixture.host.querySelector('[data-diss-point-undo]');
      const redraw = vi.fn();
      canvas._drawDissectionNow = redraw;
      canvas._dissMotionReduced = true;
      expect(canvas._keyboardFocus).toBe(true);
      expect(canvas._keyboardPreviewOrganId).toBe('nictitating');
      await act(async () => { undo.focus(); await Promise.resolve(); });
      expect(document.activeElement).toBe(undo);
      expect(canvas._keyboardFocus).toBe(false);
      expect(canvas._keyboardPreviewOrganId).toBeNull();
      expect(redraw).toHaveBeenCalledTimes(1);
      expect(fixture.state.annotations).toEqual(recordedPoints);
      expect(markingWorkProof(fixture.state)).toEqual(before);
      // Returning to the canvas cannot commit the cleared candidate.
      await fixture.key('Enter');
      expect(fixture.state.annotations).toEqual(recordedPoints);
      expect(markingWorkProof(fixture.state)).toEqual(before);
      await fixture.key('Escape');
      expect(fixture.state.annotateMode).toBe(false);
      expect(fixture.state.rulerMode).toBe(false);
      expect(fixture.state.annotations).toEqual(recordedPoints);
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('uses keyboard structure anchors for a ruler and exits with Escape while retaining the completed measurement', async () => {
    const fixture = await mountMarkingFixture({ rulerMode: true });
    try {
      const before = markingWorkProof(fixture.state);
      await fixture.key('Home');
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.state.rulerStart).toBeNull();
      await fixture.key('Enter');
      expect(fixture.state.rulerStart).toEqual({ x: 0.5, y: 0.38 });
      expect(fixture.state.rulerEnd).toBeNull();
      await fixture.key('ArrowRight');
      expect(markingWorkProof(fixture.state)).toEqual(before);
      await fixture.key(' ');
      expect(fixture.state.rulerEnd).toEqual({ x: 0.65, y: 0.24 });
      expect(fixture.state.procedureFeedback.message).toContain('1.6 cm');
      await fixture.key('Escape');
      expect(fixture.state.rulerMode).toBe(false);
      expect(fixture.state.annotateMode).toBe(false);
      expect(fixture.state.rulerStart).toEqual({ x: 0.5, y: 0.38 });
      expect(fixture.state.rulerEnd).toEqual({ x: 0.65, y: 0.24 });
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('stops annotation and ruler modes when Essentials hides their controls while retaining the drawing and measurement', async () => {
    const marks = [{ x: 0.4, y: 0.4, type: 'dot' }];
    const start = { x: 0.5, y: 0.38 };
    const end = { x: 0.65, y: 0.24 };
    const fixture = await mountMarkingFixture({ annotateMode: true, rulerMode: true, annotations: marks, rulerStart: start, rulerEnd: end });
    try {
      const before = markingWorkProof(fixture.state);
      const essentials = fixture.host.querySelector('[aria-label="Essentials workspace"]');
      expect(essentials).not.toBeNull();
      await act(async () => { essentials.click(); await Promise.resolve(); });
      expect(fixture.state.workspaceMode).toBe('essentials');
      expect(fixture.state.toolbarToolsOpen).toBe(false);
      expect(fixture.state.annotateMode).toBe(false);
      expect(fixture.state.rulerMode).toBe(false);
      expect(fixture.state.annotations).toEqual(marks);
      expect(fixture.state.rulerStart).toEqual(start);
      expect(fixture.state.rulerEnd).toEqual(end);
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('clears ruler interaction state on a successful saved-progress load while restoring specimen annotations and notes', async () => {
    const savedMarks = [{ x: 0.3, y: 0.45, type: 'dot' }];
    const savedNote = 'This note belongs to the loaded frog record.';
    const fixture = await mountMarkingFixture({
      _dissLoadedSpec: null, rulerMode: true, annotateMode: true,
      rulerStart: { x: 0.5, y: 0.38 }, rulerEnd: { x: 0.65, y: 0.24 },
    }, {
      frog: { schemaVersion: 21, activeLayer: 'skin', annotations: savedMarks, organNotes: { 'frog|dorsal_skin': savedNote } },
    });
    try {
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
      expect(fixture.state._dissLoadedSpec).toBe('frog');
      expect(fixture.state.rulerMode).toBe(false);
      expect(fixture.state.annotateMode).toBe(false);
      expect(fixture.state.rulerStart).toBeNull();
      expect(fixture.state.rulerEnd).toBeNull();
      expect(fixture.state.annotations).toEqual(savedMarks);
      expect(fixture.state.organNotes['frog|dorsal_skin']).toBe(savedNote);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('clears ruler interaction state on specimen change and confirmed reset without erasing the departed specimen drawing', async () => {
    const frogMarks = [{ x: 0.4, y: 0.4, type: 'dot' }];
    const pigMarks = [{ x: 0.45, y: 0.3, type: 'dot' }];
    const fixture = await mountMarkingFixture({
      rulerMode: true, annotateMode: true, annotations: frogMarks,
      rulerStart: { x: 0.5, y: 0.38 }, rulerEnd: { x: 0.65, y: 0.24 },
    }, { pig: { schemaVersion: 21, activeLayer: 'skin', annotations: pigMarks } });
    try {
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
      expect(fixture.state._dissLoadedSpec).toBe('frog');
      const specimenTabs = Array.from(fixture.host.querySelectorAll('[role="tab"]')).map((tab) => tab.id);
      expect(specimenTabs).toContain('diss-specimen-tab-pig');
      const pigTab = fixture.host.querySelector('[id="diss-specimen-tab-pig"]');
      expect(pigTab).not.toBeNull();
      await act(async () => { pigTab.click(); await Promise.resolve(); });
      expect(fixture.state.specimen).toBe('pig');
      expect(fixture.state.rulerMode).toBe(false);
      expect(fixture.state.annotateMode).toBe(false);
      expect(fixture.state.rulerStart).toBeNull();
      expect(fixture.state.rulerEnd).toBeNull();
      expect(JSON.parse(localStorage.getItem('dissection_progress_frog')).annotations).toEqual(frogMarks);
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
      expect(fixture.state._dissLoadedSpec).toBe('pig');
      expect(fixture.state.annotations).toEqual(pigMarks);
      await fixture.patch({ workspaceMode: 'advanced', toolbarToolsOpen: true, toolbarViewOpen: false, rulerMode: true, annotateMode: true, rulerStart: { x: 0.2, y: 0.3 }, rulerEnd: { x: 0.3, y: 0.4 } });
      const reset = fixture.host.querySelector('[id="diss-reset-specimen"]');
      expect(reset).not.toBeNull();
      await act(async () => { reset.click(); await Promise.resolve(); });
      await act(async () => { fixture.host.querySelector('[id="diss-reset-confirm"]').click(); await Promise.resolve(); });
      expect(fixture.state.rulerMode).toBe(false);
      expect(fixture.state.annotateMode).toBe(false);
      expect(fixture.state.rulerStart).toBeNull();
      expect(fixture.state.rulerEnd).toBeNull();
      expect(fixture.state.annotations).toEqual([]);
      expect(JSON.parse(localStorage.getItem('dissection_progress_frog')).annotations).toEqual(frogMarks);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('undoes annotation points and clears a retained measurement through native controls without changing recorded work', async () => {
    const marks = [{ x: 0.5, y: 0.38, type: 'dot' }, { x: 0.65, y: 0.24, type: 'dot', prevX: 0.5, prevY: 0.38 }];
    const fixture = await mountMarkingFixture({ annotateMode: true, annotations: marks });
    try {
      const before = markingWorkProof(fixture.state);
      const undo = fixture.host.querySelector('[data-diss-point-undo]');
      expect(undo).not.toBeNull();
      await act(async () => { undo.click(); await Promise.resolve(); });
      expect(fixture.state.annotations).toEqual([marks[0]]);
      expect(marks).toHaveLength(2);
      await act(async () => { undo.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
      expect(fixture.state.annotations).toEqual([]);
      expect(undo.disabled).toBe(true);
      expect(document.activeElement).toBe(fixture.host.querySelector('[data-diss-canvas]'));
      const exit = fixture.host.querySelector('[data-diss-point-exit]');
      expect(exit).not.toBeNull();
      await act(async () => { exit.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
      expect(fixture.state.annotateMode).toBe(false);
      expect(fixture.state.rulerMode).toBe(false);
      expect(fixture.host.querySelector('.diss-point-mode')).toBeNull();
      expect(document.activeElement).toBe(fixture.host.querySelector('[data-diss-canvas]'));
      await fixture.patch({ rulerStart: { x: 0.5, y: 0.38 }, rulerEnd: { x: 0.65, y: 0.24 } });
      expect(fixture.host.querySelector('[data-diss-point-status]').textContent).toContain('1.6 cm');
      const clear = fixture.host.querySelector('[data-diss-measurement-clear]');
      expect(clear).not.toBeNull();
      clear.focus();
      await act(async () => { clear.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
      expect(fixture.state.rulerStart).toBeNull();
      expect(fixture.state.rulerEnd).toBeNull();
      expect(fixture.host.querySelector('.diss-point-mode')).toBeNull();
      expect(document.activeElement).toBe(fixture.host.querySelector('[data-diss-canvas]'));
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  function evidenceWorkProof(state) {
    const proof = markingWorkProof(state);
    delete proof.visualEvidence;
    delete proof.referenceEvidenceId;
    return JSON.parse(JSON.stringify({
      ...proof,
      annotations: state.annotations,
      rulerMode: state.rulerMode, annotateMode: state.annotateMode,
      rulerStart: state.rulerStart, rulerEnd: state.rulerEnd,
      assessmentEvidence: state.assessmentEvidence,
      dissInquiry: state.dissInquiry,
    }));
  }

  async function clickEvidenceControl(control) {
    expect(control).not.toBeNull();
    // Commit the native event before its deferred focus callback looks up the
    // newly rendered heading or confirmation button. A timer inside the same
    // async act can run while React still holds that update in its test batch.
    await act(async () => { control.click(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  }

  async function toggleEvidenceNotebook(fixture, open) {
    const notebook = fixture.host.querySelector('[id="diss-evidence-notebook"]');
    expect(notebook).not.toBeNull();
    await act(async () => {
      notebook.open = open;
      notebook.dispatchEvent(new Event('toggle'));
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(fixture.state.evidenceNotebookOpen).toBe(open);
    expect(notebook.open).toBe(open);
    return notebook;
  }

  it('keeps notebook disclosure independent and returns comparison focus to the distinct same-layer frame control', async () => {
    const frames = [101, 102].map((id) => ({ id, image: 'data:image/jpeg;base64,eA==', layer: 'skin', view: 'dorsal', condition: 'standard' }));
    const preservedFrames = JSON.parse(JSON.stringify(frames));
    const fixture = await mountMarkingFixture({
      visualEvidence: frames, referenceEvidenceId: 101, splitComparison: false, evidenceNotebookOpen: false,
      annotations: [{ x: 0.5, y: 0.38, type: 'dot' }],
      rulerStart: { x: 0.5, y: 0.38 }, rulerEnd: { x: 0.65, y: 0.24 },
    });
    try {
      const before = evidenceWorkProof(fixture.state);
      const notebook = fixture.host.querySelector('[id="diss-evidence-notebook"]');
      expect(notebook.open).toBe(false);
      expect(fixture.host.querySelector('.diss-split-reference')).toBeNull();
      for (const [index, frame] of frames.entries()) {
        const card = fixture.host.querySelector('[data-evidence-id="' + frame.id + '"]');
        expect(card.querySelector('strong').textContent).toBe('Skin');
        expect(card.textContent).toContain('Frame ' + (index + 1));
        const compare = card.querySelector('[id="diss-evidence-compare-' + frame.id + '"]');
        expect(compare.getAttribute('aria-label')).toBe('Compare frame ' + (index + 1) + ': Skin');
      }
      await toggleEvidenceNotebook(fixture, true);
      await fixture.patch({ procedureFeedback: { message: 'An unrelated status refresh.', tone: 'working', at: 99 } });
      expect(notebook.open).toBe(true);
      expect(fixture.state.splitComparison).toBe(false);

      const secondCompare = fixture.host.querySelector('[id="diss-evidence-compare-102"]');
      await clickEvidenceControl(secondCompare);
      const heading = fixture.host.querySelector('[id="diss-reference-heading"]');
      expect(heading.textContent).toBe('Reference frame 2');
      expect(heading.getAttribute('tabindex')).toBe('-1');
      expect(document.activeElement).toBe(heading);
      expect(fixture.state.referenceEvidenceId).toBe(102);
      expect(fixture.state.splitComparison).toBe(true);
      expect(fixture.state.evidenceNotebookOpen).toBe(true);
      expect(secondCompare.getAttribute('aria-pressed')).toBe('true');
      await clickEvidenceControl(fixture.host.querySelector('button[aria-label="Close split comparison"]'));
      expect(fixture.host.querySelector('.diss-split-reference')).toBeNull();
      expect(document.activeElement).toBe(secondCompare);
      expect(fixture.state.referenceEvidenceId).toBe(102);
      expect(fixture.state.evidenceNotebookOpen).toBe(true);
      expect(notebook.open).toBe(true);

      await toggleEvidenceNotebook(fixture, false);
      await fixture.patch({ procedureFeedback: { message: 'Another status refresh.', tone: 'working', at: 100 } });
      expect(notebook.open).toBe(false);
      expect(fixture.state.referenceEvidenceId).toBe(102);
      await toggleEvidenceNotebook(fixture, true);
      const firstCompare = fixture.host.querySelector('[id="diss-evidence-compare-101"]');
      await clickEvidenceControl(firstCompare);
      await toggleEvidenceNotebook(fixture, false);
      expect(fixture.state.splitComparison).toBe(true);
      expect(fixture.host.querySelector('[id="diss-reference-heading"]').textContent).toBe('Reference frame 1');
      await clickEvidenceControl(fixture.host.querySelector('button[aria-label="Close split comparison"]'));
      expect(document.activeElement).toBe(firstCompare);
      expect(fixture.state.evidenceNotebookOpen).toBe(true);
      expect(notebook.open).toBe(true);
      expect(fixture.state.visualEvidence).toEqual(preservedFrames);
      expect(frames).toEqual(preservedFrames);
      expect(evidenceWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('shows full UTC capture times and distinguishes valid zero metadata from missing or invalid legacy scores', async () => {
    const frames = [
      { id: 101, image: 'data:image/jpeg;base64,eA==', layer: 'skin', layerName: 'External Anatomy', view: 'dorsal', condition: 'preserved', capturedAt: '2026-07-23T16:30:00+02:00', techniqueScore: 0, opticalQuality: 0 },
      { id: 102, image: 'data:image/jpeg;base64,eA==', layer: 'skin', techniqueScore: null, opticalQuality: null },
      { id: 103, image: 'data:image/jpeg;base64,eA==', layer: 'skin', capturedAt: '', techniqueScore: '', opticalQuality: '' },
      { id: 104, image: 'data:image/jpeg;base64,eA==', layer: 'unknown-legacy-layer', capturedAt: 'not-a-date', techniqueScore: 'Infinity', opticalQuality: 'not-a-number' },
      { id: 105, image: 'data:image/jpeg;base64,eA==', layer: 'skin', capturedAt: '2026-02-31T12:00:00Z', techniqueScore: [], opticalQuality: false },
    ];
    const preservedFrames = JSON.parse(JSON.stringify(frames));
    const fixture = await mountMarkingFixture({ visualEvidence: frames, referenceEvidenceId: 101, splitComparison: true });
    try {
      const before = evidenceWorkProof(fixture.state);
      // Older saved records can request comparison without owning disclosure.
      // A missing notebook flag starts closed and native opening records it.
      expect(fixture.state.evidenceNotebookOpen).toBeUndefined();
      expect(fixture.host.querySelector('[id="diss-evidence-notebook"]').open).toBe(false);
      expect(fixture.host.querySelector('[id="diss-reference-heading"]').textContent).toBe('Reference frame 1');
      await toggleEvidenceNotebook(fixture, true);
      const zeroCard = fixture.host.querySelector('[data-evidence-id="101"]');
      expect(zeroCard.querySelector('strong').textContent).toBe('External Anatomy');
      expect(zeroCard.textContent).toContain('Technique 0/100');
      expect(zeroCard.textContent).toMatch(/(?:optics|optical quality)[:\s·]*0%/i);
      expect(zeroCard.textContent).toContain('2026-07-23 14:30:00 UTC');
      expect(zeroCard.querySelector('time').getAttribute('datetime')).toBe('2026-07-23T14:30:00.000Z');
      for (const frame of frames.slice(1)) {
        const card = fixture.host.querySelector('[data-evidence-id="' + frame.id + '"]');
        expect(card.querySelector('img').getAttribute('alt')).toContain('not recorded view');
        expect(card.textContent).toContain('Technique not recorded');
        expect(card.textContent).toContain('Optical quality not recorded');
        expect(card.textContent).toContain('Capture time unavailable');
        expect(card.textContent).not.toContain('Technique 0/100');
        expect(card.textContent).not.toMatch(/(?:optics|optical quality)[:\s·]*0%/i);
        expect(card.textContent).not.toMatch(/NaN|Infinity|not-a-date|not-a-number/);
        expect(card.querySelector('time')).toBeNull();
        await clickEvidenceControl(card.querySelector('[id="diss-evidence-compare-' + frame.id + '"]'));
        const reference = fixture.host.querySelector('.diss-split-reference');
        expect(reference.querySelector('img').getAttribute('alt')).toContain('not recorded view, not recorded');
        expect(reference.textContent).toContain('Technique not recorded');
        expect(reference.textContent).toContain('Optical quality not recorded');
        expect(reference.textContent).toContain('Capture time unavailable');
        expect(reference.textContent).not.toContain('Technique 0/100');
        expect(reference.querySelector('time')).toBeNull();
        await clickEvidenceControl(reference.querySelector('button[aria-label="Close split comparison"]'));
      }
      await clickEvidenceControl(fixture.host.querySelector('[id="diss-evidence-compare-101"]'));
      const reference = fixture.host.querySelector('.diss-split-reference');
      expect(reference.textContent).toContain('Technique 0/100');
      expect(reference.textContent).toMatch(/(?:optics|optical quality)[:\s·]*0%/i);
      expect(reference.textContent).toContain('2026-07-23 14:30:00 UTC');
      expect(reference.querySelector('time').getAttribute('datetime')).toBe('2026-07-23T14:30:00.000Z');
      expect(fixture.state.visualEvidence).toEqual(preservedFrames);
      expect(frames).toEqual(preservedFrames);
      expect(evidenceWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('captures a fresh distinct frame, focuses its reference, and downloads it without changing learner work', async () => {
    const collisionAt = Date.parse('2026-07-23T14:30:00.000Z');
    const frames = [{ id: collisionAt, image: 'data:image/jpeg;base64,b2xk', layer: 'skin', view: 'dorsal', techniqueScore: 30 }];
    const preservedFrames = JSON.parse(JSON.stringify(frames));
    const fixture = await mountMarkingFixture({
      visualEvidence: frames, referenceEvidenceId: collisionAt, splitComparison: false, evidenceNotebookOpen: false,
      annotations: [{ x: 0.5, y: 0.38, type: 'dot' }],
      rulerMode: true, rulerStart: { x: 0.5, y: 0.38 }, rulerEnd: { x: 0.65, y: 0.24 },
    });
    const thumbnailContext = { drawImage: vi.fn() };
    const downloads = [];
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(collisionAt);
    const imageSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,bmV3');
    const downloadSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      downloads.push({ href: this.href, download: this.download });
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      return this.width === 220 && this.height === 264 ? thumbnailContext : null;
    });
    try {
      const before = evidenceWorkProof(fixture.state);
      const previousFrames = fixture.state.visualEvidence;
      const sourceCanvas = fixture.host.querySelector('[data-diss-canvas]');
      const specimenCapture = vi.fn().mockReturnValue(true);
      sourceCanvas._captureDissectionEvidence = specimenCapture;
      const contents = fixture.host.querySelector('[id="diss-evidence-capture-contents"]');
      expect(contents).not.toBeNull();
      expect(contents.value).toBe('specimen');
      expect(fixture.host.querySelector('label[for="diss-evidence-capture-contents"]').textContent).toBe('Frame contents');
      expect(Array.from(contents.options).map((option) => [option.value, option.textContent])).toEqual([
        ['specimen', 'Specimen and marks'], ['canvas', 'Full canvas with guides'],
      ]);
      await clickEvidenceControl(fixture.host.querySelector('[data-evidence-capture]'));
      expect(specimenCapture).toHaveBeenCalledExactlyOnceWith(thumbnailContext, 220, 264);
      expect(thumbnailContext.drawImage).not.toHaveBeenCalled();
      expect(imageSpy).toHaveBeenCalledWith('image/jpeg', 0.72);
      expect(fixture.state.visualEvidence).toHaveLength(2);
      expect(fixture.state.visualEvidence).not.toBe(previousFrames);
      expect(fixture.state.visualEvidence[0]).toEqual(preservedFrames[0]);
      expect(frames).toEqual(preservedFrames);
      const captured = fixture.state.visualEvidence[1];
      expect(captured).toMatchObject({
        id: collisionAt + 1, image: 'data:image/jpeg;base64,bmV3',
        capturedAt: '2026-07-23T14:30:00.001Z', layer: 'skin', layerName: 'Skin',
        view: 'dorsal', selectedOrganId: 'nictitating', specimen: 'frog',
        captureContents: 'specimen', camera: { zoom: 1.5, panX: 15, panY: -8 }, annotationCount: 1,
      });
      expect(captured.measurementText).toContain('1.6 cm');
      expect(captured.selectedOrganName).toEqual(expect.any(String));
      expect(captured.selectedOrganName.length).toBeGreaterThan(0);
      expect(fixture.state.referenceEvidenceId).toBe(captured.id);
      expect(fixture.state.splitComparison).toBe(true);
      expect(fixture.state.evidenceNotebookOpen).toBe(true);
      const heading = fixture.host.querySelector('[id="diss-reference-heading"]');
      expect(heading.textContent).toBe('Reference frame 2');
      expect(document.activeElement).toBe(heading);
      const capturedCard = fixture.host.querySelector('[data-evidence-id="' + captured.id + '"]');
      const cardContext = capturedCard.querySelector('p[data-evidence-capture-context]');
      const referenceContext = fixture.host.querySelector('.diss-split-reference p[data-evidence-capture-context]');
      expect(cardContext.textContent).toContain('Specimen and marks');
      expect(cardContext.textContent).toContain('Zoom 1.5×');
      expect(cardContext.textContent).toContain('1 observation mark');
      expect(cardContext.textContent).toContain(captured.measurementText);
      expect(referenceContext.textContent).toBe(cardContext.textContent);
      const download = Array.from(capturedCard.querySelectorAll('button')).find((button) => button.textContent === 'Download');
      expect(download).not.toBeNull();
      download.focus();
      const notebookBeforeDownload = JSON.parse(JSON.stringify(fixture.state.visualEvidence));
      await clickEvidenceControl(download);
      expect(downloads).toEqual([{ href: captured.image, download: 'frog_skin_' + captured.id + '.jpg' }]);
      expect(document.activeElement).toBe(download);
      expect(fixture.state.visualEvidence).toEqual(notebookBeforeDownload);
      expect(fixture.state.referenceEvidenceId).toBe(captured.id);
      expect(fixture.state.splitComparison).toBe(true);
      await clickEvidenceControl(fixture.host.querySelector('button[aria-label="Close split comparison"]'));
      expect(document.activeElement).toBe(fixture.host.querySelector('[id="diss-evidence-compare-' + captured.id + '"]'));
      expect(fixture.state.referenceEvidenceId).toBe(captured.id);
      expect(fixture.state.evidenceNotebookOpen).toBe(true);
      expect(evidenceWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally {
      nowSpy.mockRestore(); imageSpy.mockRestore(); downloadSpy.mockRestore();
      await fixture.close();
    }
  });


  async function chooseEvidenceCaptureContents(fixture, value) {
    const select = fixture.host.querySelector('[id="diss-evidence-capture-contents"]');
    expect(select).not.toBeNull();
    await act(async () => {
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(fixture.state.evidenceCaptureContents).toBe(value);
    expect(select.value).toBe(value);
  }

  it('names specimen display tasks while retaining native control order and focus stops', async () => {
    const fixture = await mountMarkingFixture({ toolbarViewOpen: true });
    try {
      const panel = fixture.host.querySelector('#diss-view-tools');
      expect(panel.getAttribute('role')).toBe('region');
      expect(panel.getAttribute('tabindex')).toBe('-1');
      expect(Array.from(panel.querySelectorAll('[data-diss-view-group]')).map((group) => group.getAttribute('data-diss-view-group')))
        .toEqual(['accessibility', 'specimen', 'lighting', 'workspace']);
      const specimen = panel.querySelector('[data-diss-view-group="specimen"]');
      const groups = Array.from(specimen.querySelectorAll('[data-diss-view-subgroup]'));
      expect(groups.map((group) => group.getAttribute('data-diss-view-subgroup')))
        .toEqual(['presentation', 'inspection', 'scene', 'reference']);
      const names = ['Anatomy and presentation', 'Local inspection', 'Scene and landmarks', 'Reference and variation'];
      groups.forEach((group, index) => {
        expect(group.getAttribute('role')).toBe('group');
        const id = group.getAttribute('aria-labelledby');
        const heading = group.querySelector('[id="' + id + '"]');
        expect(heading.tagName).toBe('H5');
        expect(heading.textContent).toBe(names[index]);
        expect(fixture.host.querySelectorAll('[id="' + id + '"]')).toHaveLength(1);
        expect(group.hasAttribute('tabindex')).toBe(false);
      });
      expect(groups.map((group) => group.querySelectorAll('button').length)).toEqual([6, 4, 8, 3]);
      expect(Array.from(specimen.querySelectorAll('button')).map((button) => button.textContent.replace(/^[^A-Za-z]+/, ''))).toEqual([
        'Visuals: Accessible', 'View: dorsal', 'Layer map off', 'Condition: standard', 'Relationships off', 'Quality: auto',
        'Lens on', 'Unpin lens', 'Magnify 4x', 'Focus: surface', 'Visual tools on', 'Macro view on', 'Scene detail on',
        'Depth atlas on', 'Tissue relief on', 'Flow motion on', 'Focus mode on', 'Depth motion off',
        'Split compare off', 'Variation 1', 'Tissue: after',
      ]);
      const controls = Array.from(panel.querySelectorAll('button, input'));
      expect(panel.querySelectorAll('button')).toHaveLength(33);
      expect(panel.querySelectorAll('input')).toHaveLength(1);
      expect(Array.from(panel.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'))).toEqual(controls);
      for (const button of specimen.querySelectorAll('button[aria-describedby]')) {
        for (const id of button.getAttribute('aria-describedby').split(/\s+/)) {
          const help = specimen.querySelector('[id="' + id + '"]');
          expect(help).not.toBeNull();
          expect(help.textContent.trim().length).toBeGreaterThan(0);
          expect(fixture.host.querySelectorAll('[id="' + id + '"]')).toHaveLength(1);
        }
      }
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('explains Essentials display limits and retains assessment presentation controls without exposing inspection tasks', () => {
    const base = {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
      workspaceMode: 'essentials', toolbarViewOpen: true, visualRealism: 'realistic',
    };
    const essentials = new DOMParser().parseFromString(renderTool('dissection', { dissection: base }), 'text/html');
    const panel = essentials.querySelector('#diss-view-tools');
    expect(panel.querySelectorAll('button')).toHaveLength(33);
    expect(panel.querySelector('#diss-view-presentation-help').textContent)
      .toBe('Essentials uses Guided presentation. Select Advanced workspace to use the other presentation modes.');
    expect(panel.querySelector('#diss-view-inspection-help').textContent)
      .toBe('Local lens inspection is available in Advanced workspace.');
    expect(panel.querySelector('#diss-view-scene-help').textContent)
      .toContain('Essentials uses the default scene display.');
    expect(panel.querySelector('#diss-view-reference-help').textContent)
      .toContain('Saved-frame split comparison is available in Advanced workspace.');
    expect(panel.querySelector('button[aria-label^="Visual presentation"]').textContent).toContain('Visuals: Guided');
    const assessment = new DOMParser().parseFromString(renderTool('dissection', {
      dissection: { ...base, workspaceMode: 'advanced', quizMode: true, visualRealism: 'guided' },
    }), 'text/html');
    const assessed = assessment.querySelector('#diss-view-tools');
    expect(Array.from(assessed.querySelectorAll('[data-diss-view-subgroup]')).map((group) => group.getAttribute('data-diss-view-subgroup')))
      .toEqual(['presentation']);
    expect(assessed.querySelector('[data-diss-view-subgroup="presentation"]').querySelectorAll('button')).toHaveLength(1);
    expect(assessed.querySelector('#diss-view-presentation-help').textContent)
      .toBe('Guided uses balanced materials and visible technique targets.');
    expect(assessed.querySelector('#diss-view-cycle')).toBeNull();
    expect(assessed.querySelector('button[aria-label="Organ name labels hidden during assessment"]').disabled).toBe(true);
    expect(assessed.querySelector('button[aria-label="Toggle high contrast mode"]')).not.toBeNull();
    expect(assessed.querySelector('#diss-light-intensity-range')).toBeNull();
  });

  it('describes native presentation changes and retains Accessible preferences when returning to Guided', async () => {
    const fixture = await mountMarkingFixture({ toolbarViewOpen: true, visualRealism: 'guided', highContrast: false, animSpeed: 'normal' });
    try {
      const before = studyChooserWorkProof(fixture.state);
      const control = () => fixture.host.querySelector('#diss-view-tools button[aria-label^="Visual presentation"]');
      const help = () => fixture.host.querySelector('#diss-view-presentation-help').textContent;
      await clickEvidenceControl(control());
      expect(fixture.state.visualRealism).toBe('realistic');
      expect(help()).toContain('richer materials, natural landmark variation, and reduced teaching emphasis');
      expect(fixture.state.highContrast).toBe(false);
      expect(fixture.state.animSpeed).toBe('normal');
      await clickEvidenceControl(control());
      expect(fixture.state.visualRealism).toBe('accessible');
      expect(fixture.state.highContrast).toBe(true);
      expect(fixture.state.animSpeed).toBe('slow');
      expect(help()).toContain('High contrast and slow animation stay active when you change presentation.');
      expect(fixture.host.querySelector('#diss-view-tools button[aria-label="Toggle high contrast mode"]').getAttribute('aria-pressed')).toBe('true');
      await clickEvidenceControl(control());
      expect(fixture.state.visualRealism).toBe('guided');
      expect(control().textContent).toContain('Visuals: Guided');
      expect(fixture.state.highContrast).toBe(true);
      expect(fixture.state.animSpeed).toBe('slow');
      expect(help()).toBe('Guided uses balanced materials and visible technique targets.');
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it.each([
    ['the explicitly selected valid frame', 101, 1, 'Outer skin frame', 'data:image/jpeg;base64,YQ=='],
    ['the final valid frame when the saved reference is missing', 999, 2, 'Organ frame', 'data:image/jpeg;base64,Yg=='],
    ['missing valid evidence', 103, null, null, null],
  ])('describes and opens %s through the native split resolver while preserving saved evidence', async (_case, referenceEvidenceId, frameNumber, layerName, image) => {
    const frames = [
      { id: 101, image: 'data:image/jpeg;base64,YQ==', layer: 'skin', layerName: 'Outer skin frame', view: 'dorsal' },
      { id: 102, image: 'data:image/jpeg;base64,Yg==', layer: 'organs', layerName: 'Organ frame', view: 'internal' },
      { id: 103, image: null, layer: 'skin' },
    ];
    const fixture = await mountMarkingFixture({ toolbarViewOpen: true, visualEvidence: frameNumber ? frames : frames.slice(2), referenceEvidenceId, splitComparison: false });
    try {
      const before = studyChooserWorkProof(fixture.state);
      const split = fixture.host.querySelector('#diss-view-tools button[aria-label="Toggle live and reference split comparison"]');
      expect(split.getAttribute('aria-describedby')).toBe('diss-view-reference-help');
      if (!frameNumber) {
        expect(split.disabled).toBe(true);
        expect(split.getAttribute('aria-pressed')).toBe('false');
        expect(fixture.host.querySelector('#diss-view-reference-help').textContent)
          .toBe('Capture a frame in Lab tools to enable the live/reference split.');
        await clickEvidenceControl(split);
        expect(fixture.state.splitComparison).toBe(false);
        expect(fixture.host.querySelector('.diss-split-reference')).toBeNull();
        expect(studyChooserWorkProof(fixture.state)).toEqual(before);
        expect(fixture.awardXP).not.toHaveBeenCalled();
        return;
      }
      expect(split.disabled).toBe(false);
      expect(fixture.host.querySelector('#diss-view-reference-help').textContent)
        .toBe('Compare the live specimen with Frame ' + frameNumber + ' from ' + layerName + '.');
      await clickEvidenceControl(split);
      expect(fixture.state.splitComparison).toBe(true);
      expect(split.getAttribute('aria-pressed')).toBe('true');
      expect(fixture.host.querySelector('#diss-reference-heading').textContent).toBe('Reference frame ' + frameNumber);
      expect(fixture.host.querySelector('.diss-split-reference img').getAttribute('src')).toBe(image);
      expect(fixture.host.querySelector('.diss-split-reference').textContent).toContain(layerName);
      await clickEvidenceControl(split);
      expect(fixture.state.splitComparison).toBe(false);
      expect(split.getAttribute('aria-pressed')).toBe('false');
      expect(fixture.host.querySelector('.diss-split-reference')).toBeNull();
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('keeps native pin prerequisites and cycles local inspection without changing zoom or learner records', async () => {
    const fixture = await mountMarkingFixture({
      toolbarViewOpen: true, selectedOrgan: null, hoveredOrgan: null, inspectionLens: false,
      lensPinned: false, lensPinnedPoint: null, lensPinnedOrganId: null, lensMagnification: 2, lensFocusDepth: 'surface',
    });
    try {
      const pin = () => fixture.host.querySelector('#diss-view-tools button[aria-label="Pin inspection lens to selected structure or current pointer"]');
      const before = studyChooserWorkProof(fixture.state);
      expect(pin().getAttribute('aria-describedby')).toBe('diss-view-inspection-help diss-view-pin-help');
      expect(fixture.host.querySelector('#diss-view-pin-help').textContent)
        .toBe('Select a structure or move over the specimen before pinning.');
      delete fixture.host.querySelector('[data-diss-canvas]')._toolPointer;
      await clickEvidenceControl(pin());
      expect(fixture.state.lensPinned).toBe(false);
      expect(fixture.state.procedureFeedback.message).toBe('Move over the specimen or select a structure before pinning the lens.');
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      await fixture.patch({ selectedOrgan: 'nictitating' });
      const selectedWork = studyChooserWorkProof(fixture.state);
      await clickEvidenceControl(pin());
      expect(fixture.state.inspectionLens).toBe(true);
      expect(fixture.state.lensPinned).toBe(true);
      expect(fixture.state.lensPinnedOrganId).toBe('nictitating');
      expect(Number.isFinite(fixture.state.lensPinnedPoint.x)).toBe(true);
      expect(Number.isFinite(fixture.state.lensPinnedPoint.y)).toBe(true);
      const magnify = fixture.host.querySelector('#diss-view-tools button[aria-label^="Cycle inspection magnification"]');
      for (const expected of [4, 6, 2]) {
        await clickEvidenceControl(magnify);
        expect(fixture.state.lensMagnification).toBe(expected);
        expect(magnify.textContent).toContain('Magnify ' + expected + 'x');
      }
      const focus = fixture.host.querySelector('#diss-view-tools button[aria-label^="Cycle inspection focus depth"]');
      for (const expected of ['structure', 'deep', 'surface']) {
        await clickEvidenceControl(focus);
        expect(fixture.state.lensFocusDepth).toBe(expected);
        expect(focus.textContent).toContain('Focus: ' + expected);
      }
      await clickEvidenceControl(fixture.host.querySelector('#diss-view-tools button[aria-label="Release pinned inspection target"]'));
      expect(fixture.state.lensPinned).toBe(false);
      expect(fixture.state.lensPinnedPoint).toBeNull();
      expect(fixture.state.lensPinnedOrganId).toBeNull();
      const expectedWork = { ...selectedWork, inspectionLens: true };
      expect(studyChooserWorkProof(fixture.state)).toEqual(expectedWork);
      await fixture.patch({ selectedOrgan: null });
      const pointerWork = studyChooserWorkProof(fixture.state);
      fixture.host.querySelector('[data-diss-canvas]')._toolPointer = { x: 0.42, y: 0.31 };
      await clickEvidenceControl(fixture.host.querySelector('#diss-view-tools button[aria-label="Pin inspection lens to selected structure or current pointer"]'));
      expect(fixture.state.lensPinnedPoint).toEqual({ x: 0.42, y: 0.31 });
      expect(fixture.state.lensPinnedOrganId).toBeNull();
      expect(studyChooserWorkProof(fixture.state)).toEqual({
        ...pointerWork, inspectionLens: true, lensPinned: true, lensPinnedPoint: { x: 0.42, y: 0.31 }, lensPinnedOrganId: null,
      });
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('changes displayed variation and tissue overlay while preserving recorded technique and evidence', async () => {
    const fixture = await mountMarkingFixture({ toolbarViewOpen: true, variationSeed: 3, beforeTechniqueView: false });
    try {
      const before = studyChooserWorkProof(fixture.state);
      const variation = fixture.host.querySelector('#diss-view-tools button[aria-label="Generate another deterministic specimen variation"]');
      expect(fixture.host.querySelector('#diss-view-tissue-help').textContent)
        .toBe('Tissue before/after changes the displayed technique overlay. Your recorded technique stays saved.');
      await clickEvidenceControl(variation);
      expect(fixture.state.variationSeed).toBe(4);
      expect(variation.textContent).toContain('Variation 4');
      expect(fixture.state.procedureFeedback.message).toContain('Loaded specimen variation 4.');
      const tissue = fixture.host.querySelector('#diss-view-tools button[aria-label^="Tissue: after technique"]');
      expect(tissue.getAttribute('aria-describedby')).toBe('diss-view-tissue-help');
      await clickEvidenceControl(tissue);
      expect(fixture.state.beforeTechniqueView).toBe(true);
      expect(tissue.getAttribute('aria-label')).toBe('Tissue: before technique. Activate to show the tissue after the technique.');
      await clickEvidenceControl(tissue);
      expect(fixture.state.beforeTechniqueView).toBe(false);
      expect(tissue.getAttribute('aria-label')).toBe('Tissue: after technique. Activate to show the tissue before the technique.');
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('uses actual timed-practical entry and teardown to hide orientation and disable labels while preserving work', async () => {
    const fixture = await mountMarkingFixture({
      toolbarViewOpen: true, toolbarStudyOpen: true, selectedOrgan: null, hoveredOrgan: null,
      labelMode: 'show', inspectionLens: false, lensPinned: false, lensPinnedPoint: null, lensPinnedOrganId: null,
      quizScore: 0, quizTotal: 0,
    });
    try {
      const before = studyChooserWorkProof(fixture.state);
      expect(fixture.host.querySelector('#diss-view-cycle')).not.toBeNull();
      await clickEvidenceControl(fixture.host.querySelector('#diss-study-tools button[aria-label="Start 2-minute timed practical"]'));
      expect(fixture.state.practicalMode).toBe(true);
      expect(fixture.state.quizMode).toBe(true);
      expect(fixture.state.labelMode).toBe('hidden');
      expect(fixture.state.toolbarViewOpen).toBe(false);
      await clickEvidenceControl(fixture.host.querySelector('button[aria-label="Accessibility options"]'));
      expect(fixture.host.querySelector('#diss-view-cycle')).toBeNull();
      expect(fixture.host.querySelector('#diss-view-tools [data-diss-view-subgroup="inspection"]')).toBeNull();
      const labels = fixture.host.querySelector('#diss-view-tools button[aria-label="Organ name labels hidden during assessment"]');
      expect(labels.disabled).toBe(true);
      expect(labels.getAttribute('aria-pressed')).toBe('false');
      await clickEvidenceControl(labels);
      expect(fixture.state.labelMode).toBe('hidden');
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(fixture.host.querySelector('#diss-route-study'));
      await clickEvidenceControl(fixture.host.querySelector('#diss-study-tools button[aria-label="End timed practical"]'));
      expect(fixture.state.practicalMode).toBe(false);
      expect(fixture.state.quizMode).toBe(false);
      expect(fixture.state.labelMode).toBe('show');
      await clickEvidenceControl(fixture.host.querySelector('button[aria-label="View and accessibility options"]'));
      expect(fixture.host.querySelector('#diss-view-cycle').disabled).toBe(false);
      expect(fixture.host.querySelector('#diss-view-tools button[aria-label="Toggle organ name labels"]').disabled).toBe(false);
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it.each([
    ['no selection', { selectedOrgan: null }, 'Select a structure to compare',
      'Inspect a visible structure first to check whether cross-specimen references are mapped for it.', 'canvas', '#diss-canvas'],
    ['an unmapped selection', { selectedOrgan: 'nictitating' }, 'No cross-specimen comparison is mapped for Nictitating Membrane',
      'Open the comparison panel to review its scope, or inspect another visible structure to check reference availability.', 'comparison', '#diss-comparison-panel'],
    ['a mapped selection', { activeLayer: 'organs', anatomicalView: 'ventral', selectedOrgan: 'heart' }, 'Compare this structure across specimens',
      'Use the selected structure as the shared anatomical reference.', 'comparison', '#diss-comparison-panel'],
  ])('keeps comparison next-action guidance honest for %s and uses the native focus route without awarding work', async (_case, patch, title, description, action, target) => {
    const fixture = await mountMarkingFixture({ compareMode: true, ...patch });
    try {
      const before = studyChooserWorkProof(fixture.state);
      const next = fixture.host.querySelector('[data-dissection-next-action]');
      expect(next.getAttribute('data-next-action')).toBe(action);
      expect(next.querySelector('#diss-next-action-title').textContent).toBe(title);
      expect(next.querySelector('.diss-next-action__body > p').textContent).toBe(description);
      expect(fixture.host.querySelector('.diss-stage__handoff').textContent).toContain(title);
      const primary = next.querySelector('.diss-next-action__primary');
      expect(primary.textContent).toBe(action === 'canvas' ? 'Go to specimen' : 'Go to comparison');
      await clickEvidenceControl(primary);
      expect(document.activeElement).toBe(fixture.host.querySelector(target));
      if (action === 'canvas') expect(fixture.host.querySelector('#diss-comparison-panel')).toBeNull();
      else expect(fixture.host.querySelector('#diss-comparison-panel').getAttribute('data-comparison-group'))
        .toBe(patch.selectedOrgan === 'heart' ? 'pumps' : 'unmapped');
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  function scenarioSessionWorkProof(state) {
    return JSON.parse(JSON.stringify({
      ...studyChooserWorkProof(state),
      activeInstrument: state.activeInstrument, procedureMode: state.procedureMode,
      procedureScenario: state.procedureScenario, scenarioStartedAt: state.scenarioStartedAt,
      scenarioTimeRemaining: state.scenarioTimeRemaining, scenarioCompletedAt: state.scenarioCompletedAt,
      relationshipTraceIndex: state.relationshipTraceIndex, relationshipTraceCount: state.relationshipTraceCount,
      compareTechniqueAttempts: state.compareTechniqueAttempts,
      labelMode: state.labelMode, highContrast: state.highContrast, reducedMotion: state.reducedMotion,
      largeText: state.largeText, simplifiedInstructions: state.simplifiedInstructions,
    }));
  }

  function queuedScenarioConfirmation(button) {
    expect(button).not.toBeNull();
    // Retain the actual mounted handler to model a queued click from an old
    // review. Clicking a detached node would bypass React event delegation and
    // would never exercise the stale-callback guard.
    const propsKey = Object.keys(button).find((key) => key.startsWith('__reactProps$'));
    expect(propsKey).toBeDefined();
    const handler = button[propsKey].onClick;
    expect(typeof handler).toBe('function');
    return async () => {
      await act(async () => { handler({ currentTarget: button, preventDefault() {}, stopPropagation() {} }); });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    };
  }

  it('distinguishes an unstarted four-minute technique challenge and starts the native clock on the current attempt without resetting work', async () => {
    const now = 1800000000000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    let fixture;
    try {
      fixture = await mountMarkingFixture({
        revealedLayers: {}, procedureScenario: 'timed-practical', scenarioStartedAt: 0,
        scenarioTimeRemaining: 125, scenarioCompletedAt: 0, techniquePanelOpen: true,
      });
      const before = scenarioSessionWorkProof(fixture.state);
      const panel = fixture.host.querySelector('.diss-scenario-console');
      expect(panel.textContent).toContain('4-minute technique challenge');
      expect(panel.querySelector('.diss-scenario-console__state').getAttribute('data-state')).toBe('not-started');
      expect(panel.querySelector('#diss-scenario-time')).toBeNull();
      expect(panel.querySelector('[role="timer"]')).toBeNull();
      const start = panel.querySelector('#diss-scenario-start');
      expect(start.disabled).toBe(false);
      const helpIds = start.getAttribute('aria-describedby').split(/\s+/);
      expect(helpIds.length).toBeGreaterThan(0);
      for (const id of helpIds) expect(panel.querySelector('[id="' + id + '"]').textContent.trim().length).toBeGreaterThan(0);
      await clickEvidenceControl(start);
      expect(fixture.state.procedureScenario).toBe('timed-practical');
      expect(fixture.state.scenarioStartedAt).toBe(now);
      expect(fixture.state.scenarioTimeRemaining).toBe(240);
      expect(fixture.state.scenarioCompletedAt).toBe(0);
      expect(scenarioSessionWorkProof(fixture.state)).toEqual({
        ...before, scenarioStartedAt: now, scenarioTimeRemaining: 240, scenarioCompletedAt: 0,
      });
      expect(panel.querySelector('.diss-scenario-console__state').getAttribute('data-state')).toBe('active');
      expect(panel.querySelectorAll('[role="timer"]')).toHaveLength(1);
      expect(panel.querySelector('#diss-scenario-time').getAttribute('aria-live')).toBe('off');
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { if (fixture) await fixture.close(); clock.mockRestore(); }
  });

  it('uses the real expired deadline despite a stale positive counter and opens challenge recovery without resetting the attempt', async () => {
    const now = 1800000000000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    let fixture;
    try {
      fixture = await mountMarkingFixture({
        revealedLayers: {}, procedureScenario: 'timed-practical', scenarioStartedAt: now - 241000,
        scenarioTimeRemaining: 125, scenarioCompletedAt: 0, techniquePanelOpen: false,
      });
      const before = scenarioSessionWorkProof(fixture.state);
      const next = fixture.host.querySelector('[data-dissection-next-action]');
      expect(next.getAttribute('data-next-action')).toBe('scenario-recovery');
      const primary = next.querySelector('#diss-next-action-primary');
      expect(primary.textContent).toBe('Review challenge recovery');
      await clickEvidenceControl(primary);
      expect(fixture.state.techniquePanelOpen).toBe(true);
      const panel = fixture.host.querySelector('.diss-scenario-console');
      expect(panel.querySelector('.diss-scenario-console__state').getAttribute('data-state')).toBe('expired');
      const timer = panel.querySelector('#diss-scenario-time');
      expect(timer.textContent).toMatch(/0:00|0 seconds/);
      expect(timer.getAttribute('aria-live')).toBe('off');
      expect(fixture.state.scenarioTimeRemaining).toBe(125);
      expect(panel.querySelector('#diss-scenario-start')).toBeNull();
      const restart = panel.querySelector('#diss-scenario-restart');
      expect(document.activeElement).toBe(restart);
      expect(panel.querySelector('#diss-scenario-restart-review')).toBeNull();
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(restart);
      expect(panel.querySelector('#diss-scenario-restart-review')).not.toBeNull();
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(panel.querySelector('#diss-scenario-restart-cancel'));
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { if (fixture) await fixture.close(); clock.mockRestore(); }
  });

  it('keeps native completed-challenge time frozen with one quiet timer after the deadline passes', async () => {
    const startedAt = 1800000000000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(startedAt + 241000);
    let fixture;
    try {
      fixture = await mountMarkingFixture({
        revealedLayers: {}, procedureScenario: 'timed-practical', scenarioStartedAt: startedAt,
        scenarioTimeRemaining: 125, scenarioCompletedAt: startedAt + 115000, techniquePanelOpen: true,
        procedureByLayer: { skin: {
          inspected: true, incisionStarted: true, incisionExtended: true, retracted: true,
          pins: [{ x: 0.42, y: 0.36 }, { x: 0.58, y: 0.64 }], probed: true,
          history: ['inspect', 'pin', 'scalpel', 'scissors', 'forceps', 'probe'],
        } },
      });
      const before = scenarioSessionWorkProof(fixture.state);
      const panel = fixture.host.querySelector('.diss-scenario-console');
      const state = panel.querySelector('.diss-scenario-console__state');
      expect(state.getAttribute('data-state')).toBe('complete');
      expect(panel.querySelectorAll('[role="timer"]')).toHaveLength(1);
      const timer = panel.querySelector('#diss-scenario-time');
      expect(timer.textContent).toMatch(/2:05|2 minutes 5 seconds/);
      expect(timer.getAttribute('aria-live')).toBe('off');
      expect(timer.closest('[aria-live="polite"], [aria-live="assertive"]')).toBeNull();
      const text = timer.textContent;
      clock.mockReturnValue(startedAt + 600000);
      await fixture.patch({ procedureFeedback: { message: 'Reviewing recorded technique.', tone: 'working', at: startedAt + 600000 } });
      expect(state.getAttribute('data-state')).toBe('complete');
      expect(timer.textContent).toBe(text);
      expect(fixture.host.querySelector('[data-dissection-next-action]').getAttribute('data-next-action')).not.toBe('scenario-recovery');
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { if (fixture) await fixture.close(); clock.mockRestore(); }
  });

  it('reviews scenario restart consequences and cancels through its native button or Escape without changing learner work', async () => {
    const fixture = await mountMarkingFixture({ revealedLayers: {}, techniquePanelOpen: true, procedureScenario: 'precision-access' });
    try {
      const before = scenarioSessionWorkProof(fixture.state);
      const restart = fixture.host.querySelector('#diss-scenario-restart');
      await clickEvidenceControl(restart);
      let review = fixture.host.querySelector('#diss-scenario-restart-review');
      expect(review.getAttribute('role')).toBe('group');
      expect(review.getAttribute('tabindex')).toBe('-1');
      expect(review.getAttribute('aria-labelledby')).toBe('diss-scenario-restart-title');
      expect(review.getAttribute('aria-describedby')).toBe('diss-scenario-restart-effects');
      const warning = review.querySelector('#diss-scenario-restart-effects').textContent;
      expect(warning).toMatch(/technique/i);
      expect(warning).toMatch(/inspect/i);
      expect(warning).toMatch(/specimen/i);
      expect(document.activeElement).toBe(review.querySelector('#diss-scenario-restart-cancel'));
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(review.querySelector('#diss-scenario-restart-cancel'));
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBeNull();
      expect(document.activeElement).toBe(restart);
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(restart);
      review = fixture.host.querySelector('#diss-scenario-restart-review');
      await act(async () => { review.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBeNull();
      expect(document.activeElement).toBe(restart);
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('confirms exactly the native restart scope while retaining updated notes, other layers, other specimens, frames and archived attempts', async () => {
    const now = 1800000000000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    let fixture;
    try {
      fixture = await mountMarkingFixture({
        revealedLayers: {}, techniquePanelOpen: true, procedureScenario: 'timed-practical',
        scenarioStartedAt: now - 50000, scenarioTimeRemaining: 190, scenarioCompletedAt: 0,
        exploredOrgans: { 'frog|nictitating': true, 'frog|heart': true, 'pig|heart': true },
        procedureByLayer: {
          skin: { inspected: true, incisionStarted: true, history: ['inspect', 'scalpel'], actionLog: [{ action: 'inspect', at: 50 }], errors: 2,
            tissueState: { clarity: 32, moisture: 78, stability: 44, risk: 48 } },
          organs: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 60 }] },
        },
        attemptArchive: { skin: [{ id: 7, score: 80, history: ['inspect'], actionLog: [{ action: 'inspect', at: 40 }] }] },
        relationshipTraceIndex: 2, relationshipTraceCount: 3, compareTechniqueAttempts: true,
      });
      await clickEvidenceControl(fixture.host.querySelector('#diss-scenario-restart'));
      const updatedNotes = { ...fixture.state.organNotes, 'frog|nictitating': 'Keep the revised observation before restarting technique.' };
      await fixture.patch({ organNotes: updatedNotes });
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).not.toBeNull();
      const before = scenarioSessionWorkProof(fixture.state);
      await clickEvidenceControl(fixture.host.querySelector('#diss-scenario-restart-confirm'));
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBeNull();
      expect(fixture.state.procedureScenario).toBe('timed-practical');
      expect(fixture.state.scenarioStartedAt).toBe(now);
      expect(fixture.state.scenarioTimeRemaining).toBe(240);
      expect(fixture.state.scenarioCompletedAt).toBe(0);
      expect(fixture.state.exploredOrgans).toEqual({ 'pig|heart': true });
      expect(fixture.state.selectedOrgan).toBeNull();
      const fresh = fixture.state.procedureByLayer.skin;
      expect(fresh).toMatchObject({
        inspected: false, incisionStarted: false, incisionExtended: false, retracted: false,
        pins: [], probed: false, errors: 0, protocolDeviations: 0,
        history: [], actionLog: [], cautionLog: [], learningChecks: {},
      });
      expect(fresh.tissueState).not.toEqual(before.procedureByLayer.skin.tissueState);
      expect(fixture.state.procedureByLayer.organs).toEqual(before.procedureByLayer.organs);
      expect(scenarioSessionWorkProof(fixture.state)).toEqual({
        ...before, selectedOrgan: null, exploredOrgans: { 'pig|heart': true },
        procedureByLayer: { ...before.procedureByLayer, skin: fresh },
        scenarioStartedAt: now, scenarioTimeRemaining: 240, scenarioCompletedAt: 0,
        relationshipTraceIndex: 0, relationshipTraceCount: 0, compareTechniqueAttempts: false,
      });
      expect(fixture.state.organNotes).toEqual(updatedNotes);
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-scenario-restart'));
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { if (fixture) await fixture.close(); clock.mockRestore(); }
  });

  it.each([
    ['the selected specimen changes', (state) => ({ specimen: 'pig', _dissLoadedSpec: 'pig' })],
    ['the selected layer changes', (state) => ({ activeLayer: 'organs' })],
    ['the scenario changes', (state) => ({ procedureScenario: 'preservation' })],
    ['the current technique changes', (state) => ({ procedureByLayer: { ...state.procedureByLayer, skin: { ...state.procedureByLayer.skin, history: [...state.procedureByLayer.skin.history, 'probe'] } } })],
    ['inspection records change', (state) => ({ exploredOrgans: { ...state.exploredOrgans, 'frog|dorsal_skin': true } })],
    ['another layer technique changes', (state) => ({ procedureByLayer: { ...state.procedureByLayer, organs: { ...state.procedureByLayer.organs, history: [...state.procedureByLayer.organs.history, 'probe'] } } })],
    ['another specimen inspection changes', (state) => ({ exploredOrgans: { ...state.exploredOrgans, 'pig|heart': true } })],
  ])('rejects a queued restart confirmation after %s', async (_case, patch) => {
    const fixture = await mountMarkingFixture({
      revealedLayers: {}, techniquePanelOpen: true, procedureScenario: 'precision-access',
      procedureByLayer: {
        skin: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 50 }] },
        organs: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 60 }] },
      },
    });
    try {
      await clickEvidenceControl(fixture.host.querySelector('#diss-scenario-restart'));
      const queuedConfirm = queuedScenarioConfirmation(fixture.host.querySelector('#diss-scenario-restart-confirm'));
      await fixture.patch(patch(fixture.state));
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBeNull();
      const currentWork = scenarioSessionWorkProof(fixture.state);
      await queuedConfirm();
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(currentWork);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('ignores canceled review callbacks after reopening the same scope and keeps the current review usable', async () => {
    const fixture = await mountMarkingFixture({ revealedLayers: {}, techniquePanelOpen: true, procedureScenario: 'precision-access' });
    try {
      const before = scenarioSessionWorkProof(fixture.state);
      await clickEvidenceControl(fixture.host.querySelector('#diss-scenario-restart'));
      const oldReview = fixture.host.querySelector('#diss-scenario-restart-review');
      const queuedOldConfirm = queuedScenarioConfirmation(oldReview.querySelector('#diss-scenario-restart-confirm'));
      const queuedOldCancel = queuedScenarioConfirmation(oldReview.querySelector('#diss-scenario-restart-cancel'));
      const oldReviewPropsKey = Object.keys(oldReview).find((key) => key.startsWith('__reactProps$'));
      expect(oldReviewPropsKey).toBeDefined();
      const queuedOldEscape = oldReview[oldReviewPropsKey].onKeyDown;
      expect(typeof queuedOldEscape).toBe('function');
      await clickEvidenceControl(oldReview.querySelector('#diss-scenario-restart-cancel'));
      await clickEvidenceControl(fixture.host.querySelector('#diss-scenario-restart'));
      const currentReview = fixture.host.querySelector('#diss-scenario-restart-review');
      expect(currentReview).not.toBe(oldReview);
      const cancel = currentReview.querySelector('#diss-scenario-restart-cancel');
      expect(document.activeElement).toBe(cancel);
      await queuedOldConfirm();
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBe(currentReview);
      expect(document.activeElement).toBe(cancel);
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      await queuedOldCancel();
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBe(currentReview);
      expect(document.activeElement).toBe(cancel);
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      const staleEscape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      await act(async () => { queuedOldEscape(staleEscape); });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
      expect(staleEscape.defaultPrevented).toBe(false);
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBe(currentReview);
      expect(document.activeElement).toBe(cancel);
      expect(scenarioSessionWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(currentReview.querySelector('#diss-scenario-restart-confirm'));
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBeNull();
      expect(fixture.state.procedureByLayer.skin.inspected).toBe(false);
      expect(fixture.state.procedureByLayer.skin.history).toEqual([]);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it.each([
    ['Compare', { compareMode: true }, 'comparison'],
    ['Flashcard', { flashcardMode: true }, 'flashcards'],
    ['practice assessment', { quizMode: true }, 'quiz'],
    ['timed identification', { practicalMode: true, quizMode: true, practicalTimer: 75, practicalEndsAt: 1800000075000, practicalTargetIds: ['nictitating', 'tympanum'] }, 'quiz'],
    ['Guided investigation', { guidedMode: true, guidedStep: 0, guidedTargetIds: ['nictitating'] }, 'canvas'],
  ])('keeps %s guidance ahead of expired technique recovery', async (_case, patch, expectedAction) => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1800000000000);
    let fixture;
    try {
      fixture = await mountMarkingFixture({
        revealedLayers: {}, procedureScenario: 'timed-practical', scenarioStartedAt: 1799999759000,
        scenarioTimeRemaining: 125, scenarioCompletedAt: 0, ...patch,
      });
      expect(fixture.host.querySelector('[data-dissection-next-action]').getAttribute('data-next-action')).toBe(expectedAction);
      expect(fixture.host.querySelector('#diss-next-action-primary').textContent).not.toBe('Review challenge recovery');
      expect(fixture.host.querySelector('#diss-scenario-restart-review')).toBeNull();
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { if (fixture) await fixture.close(); clock.mockRestore(); }
  });
  function studyChooserWorkProof(state) {
    return JSON.parse(JSON.stringify({
      ...evidenceWorkProof(state),
      visualEvidence: state.visualEvidence, referenceEvidenceId: state.referenceEvidenceId,
      attemptArchive: state.attemptArchive,
      quizFirstAttemptScore: state.quizFirstAttemptScore, quizFirstAttemptTotal: state.quizFirstAttemptTotal,
      quizSupportedCount: state.quizSupportedCount, quizReviewQueue: state.quizReviewQueue,
      assessmentCompletedAt: state.assessmentCompletedAt,
      assessmentRecordedScore: state.assessmentRecordedScore, assessmentRecordedTotal: state.assessmentRecordedTotal,
    }));
  }

  it('names study activity groups and describes the native controls without adding tab stops', async () => {
    const fixture = await mountMarkingFixture({ toolbarStudyOpen: true });
    try {
      const panel = fixture.host.querySelector('[id="diss-study-tools"]');
      expect(panel.getAttribute('role')).toBe('region');
      expect(panel.getAttribute('aria-label')).toBe('Study tools');
      expect(panel.getAttribute('tabindex')).toBe('-1');
      const groups = Array.from(panel.querySelectorAll('[data-study-tools-group]'));
      expect(groups.map((group) => group.getAttribute('data-study-tools-group'))).toEqual(['practice', 'practical']);
      const headings = [
        ['diss-study-practice-heading', 'Review and compare'],
        ['diss-study-practical-heading', 'Timed identification'],
      ];
      groups.forEach((group, index) => {
        const [id, name] = headings[index];
        expect(group.getAttribute('role')).toBe('group');
        expect(group.getAttribute('aria-labelledby')).toBe(id);
        const heading = group.querySelector('[id="' + id + '"]');
        expect(heading.tagName).toMatch(/^H[1-6]$/);
        expect(heading.textContent).toBe(name);
        expect(fixture.host.querySelectorAll('[id="' + id + '"]')).toHaveLength(1);
      });
      const controls = Array.from(panel.querySelectorAll('button'));
      expect(controls.map((button) => button.getAttribute('aria-label'))).toEqual([
        'Flashcard', 'Compare', 'Start 2-minute timed practical',
      ]);
      expect(controls.map((button) => button.textContent)).toEqual([
        'Flashcard', 'Compare', 'Start 2-minute timed practical',
      ]);
      const descriptions = [
        ['diss-study-flashcard-help'],
        ['diss-study-compare-help'],
        ['diss-practical-study-help', 'diss-practical-readiness'],
      ];
      controls.forEach((button, index) => {
        expect(button.getAttribute('aria-describedby').split(/\s+/)).toEqual(descriptions[index]);
        expect(button.getAttribute('aria-pressed')).toBe('false');
        for (const id of descriptions[index]) {
          const owned = groups[index < 2 ? 0 : 1].querySelector('[id="' + id + '"]');
          expect(owned).not.toBeNull();
          expect(owned.textContent.trim().length).toBeGreaterThan(0);
          expect(fixture.host.querySelectorAll('[id="' + id + '"]')).toHaveLength(1);
        }
      });
      expect(panel.querySelector('[id="diss-study-flashcard-help"]').textContent)
        .toBe('Recall functions, reveal the reference answer, and mark cards to review.');
      expect(panel.querySelector('[id="diss-practical-study-help"]').textContent)
        .toBe('Two-minute identification check with structure labels hidden.');
      expect(Array.from(groups[0].querySelectorAll('button'))).toEqual(controls.slice(0, 2));
      expect(Array.from(groups[1].querySelectorAll('button'))).toEqual(controls.slice(2));
      expect(Array.from(panel.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'))).toEqual(controls);
      expect(panel.querySelector('[data-study-activity="eye"]')).toBeNull();
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it.each([
    ['no selected structure', { selectedOrgan: null },
      'Choose a structure to see whether reference comparisons are available.'],
    ['an unmapped structure', { selectedOrgan: 'nictitating' },
      'No cross-specimen comparison is mapped for Nictitating Membrane. Select another structure to compare.'],
    ['a mapped structure', { activeLayer: 'organs', anatomicalView: 'ventral', selectedOrgan: 'heart' },
      'Compare Heart (3-chamber) across reference specimens.'],
  ])('explains comparison for %s and preserves native focus and learner work', async (_case, patch, purpose) => {
    const fixture = await mountMarkingFixture({
      toolbarStudyOpen: true,
      annotations: [{ x: 0.5, y: 0.38, type: 'dot' }],
      rulerStart: { x: 0.5, y: 0.38 }, rulerEnd: { x: 0.65, y: 0.24 },
      ...patch,
    });
    try {
      const before = studyChooserWorkProof(fixture.state);
      const compare = fixture.host.querySelector('#diss-study-tools button[aria-label="Compare"]');
      const help = fixture.host.querySelector('[id="diss-study-compare-help"]');
      expect(help.textContent).toBe(purpose);
      expect(compare.disabled).toBe(false);
      compare.focus();
      await clickEvidenceControl(compare);
      expect(fixture.state.compareMode).toBe(true);
      expect(compare.getAttribute('aria-pressed')).toBe('true');
      expect(document.activeElement).toBe(compare);
      const panel = fixture.host.querySelector('[id="diss-comparison-panel"]');
      if (patch.selectedOrgan === null) expect(panel).toBeNull();
      else {
        expect(panel.getAttribute('aria-labelledby')).toBe('diss-comparison-title');
        if (patch.selectedOrgan === 'heart') expect(panel.getAttribute('data-comparison-group')).toBe('pumps');
        else {
          expect(panel.getAttribute('data-comparison-group')).toBe('unmapped');
          expect(panel.textContent).toContain('No cross-specimen comparison is mapped for this structure.');
        }
      }
      expect(help.textContent).toBe(purpose);
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(compare);
      expect(fixture.state.compareMode).toBe(false);
      expect(compare.getAttribute('aria-pressed')).toBe('false');
      expect(fixture.host.querySelector('[id="diss-comparison-panel"]')).toBeNull();
      expect(document.activeElement).toBe(compare);
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('opens native flashcard recall with prompt focus and returns to the specimen while preserving recorded work', async () => {
    const fixture = await mountMarkingFixture({
      toolbarStudyOpen: true,
      annotations: [{ x: 0.5, y: 0.38, type: 'dot' }],
      assessmentEvidence: { 'frog|nictitating': { verified: true, at: 88 } },
      quizFirstAttemptScore: 2, quizFirstAttemptTotal: 3,
      assessmentRecordedScore: 2, assessmentRecordedTotal: 3,
      quizReviewQueue: ['tympanum'],
    });
    try {
      const before = studyChooserWorkProof(fixture.state);
      const expected = { ...before, selectedOrgan: null, hoveredOrgan: null };
      const flashcard = fixture.host.querySelector('#diss-study-tools button[aria-label="Flashcard"]');
      flashcard.focus();
      await clickEvidenceControl(flashcard);
      expect(fixture.state.flashcardMode).toBe(true);
      expect(fixture.state.quizMode).toBe(false);
      expect(fixture.state.compareMode).toBe(false);
      expect(flashcard.getAttribute('aria-pressed')).toBe('true');
      const panel = fixture.host.querySelector('[id="diss-flashcard-panel"]');
      const prompt = panel.querySelector('[id="diss-flashcard-prompt"]');
      expect(prompt.getAttribute('tabindex')).toBe('-1');
      expect(document.activeElement).toBe(prompt);
      expect(panel.querySelector('[id="diss-flashcard-draft"]')).not.toBeNull();
      expect(studyChooserWorkProof(fixture.state)).toEqual(expected);
      const returnToSpecimen = Array.from(panel.querySelectorAll('button'))
        .find((button) => button.textContent === 'Return to specimen');
      await clickEvidenceControl(returnToSpecimen);
      expect(fixture.state.flashcardMode).toBe(false);
      expect(fixture.state._flashcardPractice).toBeNull();
      expect(fixture.host.querySelector('[id="diss-flashcard-panel"]')).toBeNull();
      expect(document.activeElement).toBe(fixture.host.querySelector('[data-diss-canvas]'));
      expect(flashcard.getAttribute('aria-pressed')).toBe('false');
      expect(studyChooserWorkProof(fixture.state)).toEqual(expected);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('matches practical readiness to the native visible-pool and active-transition guards', async () => {
    const fixture = await mountMarkingFixture({ toolbarStudyOpen: true, anatomicalView: 'internal' });
    try {
      const readiness = fixture.host.querySelector('[id="diss-practical-readiness"]');
      const practical = fixture.host.querySelector('#diss-study-tools button[aria-label="Start 2-minute timed practical"]');
      expect(readiness.getAttribute('role')).toBe('status');
      expect(readiness.getAttribute('aria-live')).toBe('polite');
      expect(readiness.getAttribute('aria-atomic')).toBe('true');
      expect(readiness.getAttribute('data-practical-ready')).toBe('false');
      expect(readiness.textContent).toBe('Needs at least two visible structures. Improve the field or change view.');
      expect(practical.disabled).toBe(false);
      const occludedWork = studyChooserWorkProof(fixture.state);
      practical.focus();
      await clickEvidenceControl(practical);
      expect(fixture.state.practicalMode).not.toBe(true);
      expect(fixture.state.quizMode).not.toBe(true);
      expect(fixture.state.procedureFeedback.message)
        .toBe('Timed practical unavailable: at least two structures must be visible. Improve the field or change view first.');
      expect(document.activeElement).toBe(practical);
      expect(studyChooserWorkProof(fixture.state)).toEqual(occludedWork);

      await fixture.patch({ anatomicalView: 'dorsal' });
      expect(readiness.getAttribute('data-practical-ready')).toBe('true');
      expect(readiness.textContent).toBe('3 visible structures available. Starts a new timed identification attempt.');
      const incision = { active: true, startTick: Date.now(), layerName: 'skin' };
      await fixture.patch({ _incisionAnim: incision });
      expect(readiness.getAttribute('data-practical-ready')).toBe('false');
      expect(readiness.textContent).toBe('Finish the current layer transition before starting.');
      expect(practical.disabled).toBe(false);
      const transitioningWork = studyChooserWorkProof(fixture.state);
      await clickEvidenceControl(practical);
      expect(fixture.state.practicalMode).not.toBe(true);
      expect(fixture.state.quizMode).not.toBe(true);
      expect(fixture.state._incisionAnim).toEqual(incision);
      expect(fixture.state.procedureFeedback.message)
        .toBe('Finish the current layer transition before starting the timed practical.');
      expect(studyChooserWorkProof(fixture.state)).toEqual(transitioningWork);
      await fixture.patch({ _incisionAnim: null });
      expect(readiness.getAttribute('data-practical-ready')).toBe('true');
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('shows the native practical countdown with quiet timer semantics and ends through native teardown', async () => {
    const fixture = await mountMarkingFixture({
      toolbarStudyOpen: true, selectedOrgan: null, hoveredOrgan: null,
      labelMode: 'show', inspectionLens: false, lensPinned: false,
      lensPinnedPoint: null, lensPinnedOrganId: null, quizScore: 0, quizTotal: 0,
      annotations: [{ x: 0.5, y: 0.38, type: 'dot' }],
    });
    try {
      const before = studyChooserWorkProof(fixture.state);
      const practical = fixture.host.querySelector('#diss-study-tools button[aria-label="Start 2-minute timed practical"]');
      expect(fixture.host.querySelector('[id="diss-practical-time-status"]')).toBeNull();
      await clickEvidenceControl(practical);
      expect(fixture.state.practicalMode).toBe(true);
      expect(fixture.state.quizMode).toBe(true);
      expect(fixture.state.labelMode).toBe('hidden');
      expect(fixture.state._prePracticalLabelMode).toBe('show');
      expect(fixture.state.practicalTargetIds).toHaveLength(3);
      expect(fixture.state.practicalTargetIds).toEqual(expect.arrayContaining(['dorsal_skin', 'tympanum', 'nictitating']));
      expect(fixture.state.practicalEndsAt).toBeGreaterThan(Date.now());
      expect(window.__alloDissectionPracticalInterval).not.toBeNull();
      const end = fixture.host.querySelector('#diss-study-tools button[aria-label="End timed practical"]');
      expect(end).toBe(practical);
      expect(end.getAttribute('aria-pressed')).toBe('true');
      expect(end.getAttribute('aria-describedby').split(/\s+/)).toEqual([
        'diss-practical-study-help', 'diss-practical-readiness', 'diss-practical-time-status',
      ]);
      const timer = fixture.host.querySelector('[id="diss-practical-time-status"]');
      expect(timer.tagName).toBe('OUTPUT');
      expect(timer.hidden).toBe(false);
      expect(timer.getAttribute('role')).toBe('timer');
      expect(timer.getAttribute('aria-live')).toBe('off');
      expect(timer.getAttribute('aria-atomic')).toBe('true');
      expect(timer.textContent).toMatch(/^Timed practical: (?:2 minutes|1 minute 59 seconds) remaining$/);
      expect(fixture.host.querySelectorAll('[id="diss-practical-time-status"]')).toHaveLength(1);
      expect(fixture.host.querySelector('[id="diss-practical-readiness"]').textContent)
        .toBe('The timed practical is active. End it to return to reference study.');
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      end.focus();
      await clickEvidenceControl(end);
      expect(fixture.state.practicalMode).toBe(false);
      expect(fixture.state.quizMode).toBe(false);
      expect(fixture.state.practicalTimer).toBe(0);
      expect(fixture.state.practicalEndsAt).toBe(0);
      expect(fixture.state.practicalTargetIds).toEqual([]);
      expect(fixture.state.labelMode).toBe('show');
      expect(window.__alloDissectionPracticalInterval).toBeNull();
      expect(fixture.host.querySelector('[data-diss-canvas]')._dissPracticalTimer).toBeNull();
      expect(fixture.host.querySelector('[id="diss-practical-time-status"]')).toBeNull();
      expect(practical.getAttribute('aria-label')).toBe('Start 2-minute timed practical');
      expect(practical.getAttribute('aria-pressed')).toBe('false');
      expect(practical.getAttribute('aria-describedby').split(/\s+/)).toEqual([
        'diss-practical-study-help', 'diss-practical-readiness',
      ]);
      expect(document.activeElement).toBe(practical);
      expect(studyChooserWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('describes the sheep-eye companion in native order and removes that entry during assessment', () => {
    const base = {
      specimen: 'sheepEye', _dissLoadedSpec: 'sheepEye', activeLayer: 'skin', anatomicalView: 'dorsal',
      workspaceMode: 'advanced', toolbarStudyOpen: true, eyeStudyMode: false, reducedMotion: true,
    };
    // Static rendering covers chooser gating without starting the WebGL companion.
    const page = new DOMParser().parseFromString(renderTool('dissection', { dissection: base }), 'text/html');
    const panel = page.querySelector('[id="diss-study-tools"]');
    const practice = panel.querySelector('[data-study-tools-group="practice"]');
    const eye = practice.querySelector('[id="diss-eye-study-toggle"]');
    expect(Array.from(practice.querySelectorAll('button')).map((button) => button.textContent))
      .toEqual(['3D eye study', 'Flashcard', 'Compare']);
    expect(eye.getAttribute('type')).toBe('button');
    expect(eye.getAttribute('aria-pressed')).toBe('false');
    expect(eye.getAttribute('aria-describedby')).toBe('diss-study-eye-help');
    const help = eye.closest('[data-study-activity="eye"]').querySelector('[id="diss-study-eye-help"]');
    expect(help.textContent).toBe('Explore the eye schematic from different viewpoints.');
    expect(panel.querySelectorAll('[id="diss-study-eye-help"]')).toHaveLength(1);
    expect(page.querySelector('[id="diss-eye-study-title"]')).toBeNull();
    for (const assessment of [
      { quizMode: true },
      { practicalMode: true, quizMode: true, practicalTimer: 90, practicalEndsAt: Date.now() + 90000,
        practicalTargetIds: ['cornea', 'sclera'] },
    ]) {
      const assessed = new DOMParser().parseFromString(renderTool('dissection', {
        dissection: { ...base, ...assessment },
      }), 'text/html');
      const study = assessed.querySelector('[id="diss-study-tools"]');
      expect(study.querySelector('[id="diss-eye-study-toggle"]')).toBeNull();
      expect(study.querySelector('[data-study-activity="eye"]')).toBeNull();
      expect(study.querySelector('[id="diss-study-eye-help"]')).toBeNull();
      expect(study.querySelector('button[aria-label="Flashcard"]')).not.toBeNull();
      expect(study.querySelector('button[aria-label="Compare"]')).not.toBeNull();
    }
  });

  it('groups advanced lab controls by observation, evidence capture, and records with named headings', async () => {
    const fixture = await mountMarkingFixture({ annotations: [{ x: 0.5, y: 0.38, type: 'dot' }] });
    try {
      const panel = fixture.host.querySelector('[id="diss-lab-tools"]');
      expect(panel.getAttribute('role')).toBe('region');
      const groups = Array.from(panel.querySelectorAll('.diss-lab-tool-group'));
      expect(groups.map((group) => group.getAttribute('data-lab-tools-group'))).toEqual(['observe', 'evidence', 'records']);
      const names = [
        ['diss-lab-observe-heading', 'Observe and measure'],
        ['diss-lab-evidence-heading', 'Capture and download'],
        ['diss-lab-records-heading', 'Report and reset'],
      ];
      groups.forEach((group, index) => {
        const [id, name] = names[index];
        expect(group.getAttribute('role')).toBe('group');
        expect(group.getAttribute('aria-labelledby')).toBe(id);
        const heading = group.querySelector('[id="' + id + '"]');
        expect(heading.tagName).toMatch(/^H[1-6]$/);
        expect(heading.textContent).toBe(name);
        expect(panel.querySelectorAll('[id="' + id + '"]')).toHaveLength(1);
      });
      const [observe, evidence, records] = groups;
      expect(Array.from(observe.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))).toEqual([
        'Ruler', 'Annotate', 'Clear annotations',
      ]);
      const options = evidence.querySelector('.diss-capture-options');
      const contents = options.querySelector('[id="diss-evidence-capture-contents"]');
      const capture = evidence.querySelector('[data-evidence-capture]');
      const download = evidence.querySelector('[data-canvas-download]');
      expect(contents.tagName).toBe('SELECT');
      const actions = evidence.querySelector('.diss-lab-tool-actions');
      expect(options.nextElementSibling).toBe(actions);
      expect(actions.firstElementChild).toBe(capture);
      expect(capture.nextElementSibling).toBe(download);
      expect(download.nextElementSibling).toBeNull();
      expect(Array.from(evidence.querySelectorAll('select, button'))).toEqual([contents, capture, download]);
      expect(download.getAttribute('aria-label')).toBe('Download full canvas PNG');
      expect(download.textContent).toContain('Download full canvas PNG');
      expect(download.getAttribute('data-canvas-download')).toBe('true');
      expect(evidence.querySelectorAll('button')).toHaveLength(2);
      expect(records.querySelector('[aria-label="Copy lab report to clipboard"]')).not.toBeNull();
      expect(records.querySelector('[id="diss-reset-specimen"]')).not.toBeNull();
      expect(records.querySelectorAll('button')).toHaveLength(2);
      expect(panel.querySelectorAll('button')).toHaveLength(7);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('retains native observation toggles and reset cancellation inside their lab control groups', async () => {
    const marks = [{ x: 0.5, y: 0.38, type: 'dot' }];
    const start = { x: 0.5, y: 0.38 };
    const end = { x: 0.65, y: 0.24 };
    const fixture = await mountMarkingFixture({ annotations: marks, rulerStart: start, rulerEnd: end });
    try {
      const before = markingWorkProof(fixture.state);
      const observe = fixture.host.querySelector('[data-lab-tools-group="observe"]');
      const ruler = observe.querySelector('[aria-label="Ruler"]');
      const annotate = observe.querySelector('[aria-label="Annotate"]');
      await clickEvidenceControl(ruler);
      expect(fixture.state.rulerMode).toBe(true);
      expect(fixture.state.annotateMode).toBe(false);
      expect(ruler.getAttribute('aria-pressed')).toBe('true');
      expect(annotate.getAttribute('aria-pressed')).toBe('false');
      expect(markingWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(annotate);
      expect(fixture.state.rulerMode).toBe(false);
      expect(fixture.state.annotateMode).toBe(true);
      expect(ruler.getAttribute('aria-pressed')).toBe('false');
      expect(annotate.getAttribute('aria-pressed')).toBe('true');
      expect(markingWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(annotate);
      expect(fixture.state.rulerMode).toBe(false);
      expect(fixture.state.annotateMode).toBe(false);
      expect(fixture.state.annotations).toEqual(marks);
      expect(fixture.state.rulerStart).toEqual(start);
      expect(fixture.state.rulerEnd).toEqual(end);
      const reset = fixture.host.querySelector('[data-lab-tools-group="records"] [id="diss-reset-specimen"]');
      const beforeReset = evidenceWorkProof(fixture.state);
      await clickEvidenceControl(reset);
      const confirmation = fixture.host.querySelector('[id="diss-reset-confirmation"]');
      expect(confirmation.closest('[data-lab-tools-group]')).toBe(fixture.host.querySelector('[data-lab-tools-group="records"]'));
      expect(document.activeElement).toBe(confirmation.querySelector('[id="diss-reset-confirm"]'));
      expect(evidenceWorkProof(fixture.state)).toEqual(beforeReset);
      await clickEvidenceControl(confirmation.querySelector('[id="diss-reset-cancel"]'));
      expect(fixture.state.resetConfirmPending).toBe(false);
      expect(fixture.host.querySelector('[id="diss-reset-confirmation"]')).toBeNull();
      expect(document.activeElement).toBe(reset);
      expect(evidenceWorkProof(fixture.state)).toEqual(beforeReset);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  function canvasDownloadWorkProof(state) {
    return JSON.parse(JSON.stringify({
      ...evidenceWorkProof(state),
      visualEvidence: state.visualEvidence, referenceEvidenceId: state.referenceEvidenceId,
      splitComparison: state.splitComparison, evidenceNotebookOpen: state.evidenceNotebookOpen,
      evidenceReturnFocusId: state.evidenceReturnFocusId, evidenceCaptureContents: state.evidenceCaptureContents,
      evidenceRemovePendingId: state.evidenceRemovePendingId, evidenceClearPending: state.evidenceClearPending,
      activeInstrument: state.activeInstrument, attemptArchive: state.attemptArchive,
    }));
  }

  it.each(['specimen', 'canvas'])('downloads a fresh full PNG with %s frame preference even when the notebook is full', async (contents) => {
    const frames = [101, 102, 103, 104, 105, 106].map((id) => ({ id, image: 'data:image/jpeg;base64,b2xk', layer: 'skin', view: 'dorsal' }));
    const preservedFrames = JSON.parse(JSON.stringify(frames));
    const fixture = await mountMarkingFixture({
      visualEvidence: frames, referenceEvidenceId: 102, splitComparison: true, evidenceNotebookOpen: true,
      evidenceReturnFocusId: 'diss-evidence-compare-102', evidenceCaptureContents: contents,
      annotations: [{ x: 0.5, y: 0.38, type: 'dot' }],
      rulerMode: true, rulerStart: { x: 0.5, y: 0.38 }, rulerEnd: { x: 0.65, y: 0.24 },
      assessmentEvidence: { 'frog|nictitating': { verified: true } },
      dissInquiry: { hypothesis: 'The transparent membrane protects the eye.', explanation: 'Its position matches the observed structure.', log: [{ at: 77, approach: 'careful' }] },
    });
    const sourceCanvas = fixture.host.querySelector('[data-diss-canvas]');
    sourceCanvas.width = 864;
    sourceCanvas.height = 1036;
    const originalCamera = { zoom: 1.25, panX: 4, panY: -3 };
    const ownedCamera = contents === 'specimen';
    if (ownedCamera) sourceCanvas._lastCaptureCamera = originalCamera;
    else delete sourceCanvas._lastCaptureCamera;
    const outputContext = { drawImage: vi.fn(), fillRect: vi.fn() };
    const wrongCapture = vi.fn(() => { throw new Error('Full PNG must use the full-frame API'); });
    sourceCanvas._captureDissectionEvidence = wrongCapture;
    let encodedImage;
    const firstCapture = vi.fn((context) => {
      sourceCanvas._lastCaptureCamera = { zoom: 2, panX: 20, panY: -10 };
      context.fillRect(0, 0, 864, 1036);
      encodedImage = 'data:image/png;base64,Zmlyc3Q=';
      return true;
    });
    const secondCapture = vi.fn((context) => {
      sourceCanvas._lastCaptureCamera = { zoom: 3, panX: -12, panY: 6 };
      context.fillRect(0, 0, 864, 1036);
      encodedImage = 'data:image/png;base64,c2Vjb25k';
      return true;
    });
    sourceCanvas._captureFullDissectionEvidence = firstCapture;
    const outputs = [];
    const createdAnchors = [];
    const nativeCreateElement = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag, options) => {
      const node = nativeCreateElement(tag, options);
      if (String(tag).toLowerCase() === 'canvas') outputs.push(node);
      if (String(tag).toLowerCase() === 'a') createdAnchors.push(node);
      return node;
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (kind) {
      return this !== sourceCanvas && this.width === 864 && this.height === 1036 && kind === '2d' ? outputContext : null;
    });
    const imageSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
      expect(this).not.toBe(sourceCanvas);
      expect(this.width).toBe(864);
      expect(this.height).toBe(1036);
      return encodedImage;
    });
    const staleImageSpy = vi.fn(() => { throw new Error('Stale canvas bitmap must not be downloaded'); });
    Object.defineProperty(sourceCanvas, 'toDataURL', { configurable: true, value: staleImageSpy });
    const downloads = [];
    const downloadSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      downloads.push({ href: this.href, download: this.download });
    });
    try {
      const before = canvasDownloadWorkProof(fixture.state);
      const previousFrames = fixture.state.visualEvidence;
      const capture = fixture.host.querySelector('[data-evidence-capture]');
      expect(capture.textContent).toContain('Evidence full');
      const download = fixture.host.querySelector('[data-canvas-download]');
      expect(download.disabled).toBe(false);
      download.focus();
      await clickEvidenceControl(download);
      expect(firstCapture).toHaveBeenCalledExactlyOnceWith(outputContext, 864, 1036);
      expect(Object.prototype.hasOwnProperty.call(sourceCanvas, '_lastCaptureCamera')).toBe(ownedCamera);
      if (ownedCamera) expect(sourceCanvas._lastCaptureCamera).toBe(originalCamera);
      // A second click must call the current API again and encode its fresh frame.
      sourceCanvas._captureFullDissectionEvidence = secondCapture;
      await clickEvidenceControl(download);
      expect(secondCapture).toHaveBeenCalledExactlyOnceWith(outputContext, 864, 1036);
      expect(firstCapture).toHaveBeenCalledTimes(1);
      expect(wrongCapture).not.toHaveBeenCalled();
      expect(staleImageSpy).not.toHaveBeenCalled();
      expect(imageSpy).toHaveBeenCalledTimes(2);
      expect(imageSpy.mock.calls).toEqual([['image/png'], ['image/png']]);
      expect(outputs).toHaveLength(2);
      expect(outputs[0]).not.toBe(outputs[1]);
      expect(outputs.every((output) => output.width === 864 && output.height === 1036)).toBe(true);
      expect(createdAnchors).toHaveLength(2);
      expect(downloads).toEqual([
        { href: 'data:image/png;base64,Zmlyc3Q=', download: 'frog_dissection.png' },
        { href: 'data:image/png;base64,c2Vjb25k', download: 'frog_dissection.png' },
      ]);
      expect(Object.prototype.hasOwnProperty.call(sourceCanvas, '_lastCaptureCamera')).toBe(ownedCamera);
      if (ownedCamera) expect(sourceCanvas._lastCaptureCamera).toBe(originalCamera);
      expect(fixture.state.visualEvidence).toBe(previousFrames);
      expect(fixture.state.visualEvidence).toEqual(preservedFrames);
      expect(frames).toEqual(preservedFrames);
      expect(document.activeElement).toBe(download);
      expect(fixture.state.procedureFeedback).toMatchObject({ message: 'Full canvas saved as frog_dissection.png.', tone: 'success' });
      expect(canvasDownloadWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally {
      createSpy.mockRestore(); delete sourceCanvas.toDataURL; imageSpy.mockRestore(); downloadSpy.mockRestore();
      await fixture.close();
    }
  });

  it.each(['specimen', 'canvas'].flatMap((contents) => ['missing', 'false', 'throw', 'context', 'encoding', 'invalid-png'].map((failure) => ({ contents, failure }))))('keeps full PNG failure $failure with $contents preference from downloading or changing work and focus', async ({ contents, failure }) => {
    const frames = [{ id: 101, image: 'data:image/jpeg;base64,b2xk', layer: 'skin', view: 'dorsal' }];
    const preservedFrames = JSON.parse(JSON.stringify(frames));
    const fixture = await mountMarkingFixture({
      visualEvidence: frames, referenceEvidenceId: 101, splitComparison: true, evidenceNotebookOpen: true,
      evidenceReturnFocusId: 'diss-evidence-compare-101', evidenceCaptureContents: contents,
      annotations: [{ x: 0.5, y: 0.38, type: 'dot' }],
      rulerMode: true, rulerStart: { x: 0.5, y: 0.38 }, rulerEnd: { x: 0.65, y: 0.24 },
    });
    const sourceCanvas = fixture.host.querySelector('[data-diss-canvas]');
    sourceCanvas.width = 864;
    sourceCanvas.height = 1036;
    const originalCamera = { zoom: 1.25, panX: 4, panY: -3 };
    const ownedCamera = contents === 'specimen';
    if (ownedCamera) sourceCanvas._lastCaptureCamera = originalCamera;
    else delete sourceCanvas._lastCaptureCamera;
    const outputContext = { drawImage: vi.fn() };
    const wrongCapture = vi.fn(() => { throw new Error('Wrong capture API'); });
    sourceCanvas._captureDissectionEvidence = wrongCapture;
    const fullCapture = vi.fn(() => {
      sourceCanvas._lastCaptureCamera = { zoom: 3, panX: 40, panY: -20 };
      if (failure === 'throw') throw new Error('Full frame capture unavailable');
      return failure !== 'false';
    });
    if (failure === 'missing') delete sourceCanvas._captureFullDissectionEvidence;
    else sourceCanvas._captureFullDissectionEvidence = fullCapture;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (kind) {
      return failure !== 'context' && this !== sourceCanvas && this.width === 864 && this.height === 1036 && kind === '2d' ? outputContext : null;
    });
    const imageSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
      expect(this).not.toBe(sourceCanvas);
      if (failure === 'encoding') throw new Error('PNG encoding failed');
      return failure === 'invalid-png' ? 'data:image/jpeg;base64,d3Jvbmc=' : 'data:image/png;base64,dW51c2Vk';
    });
    const staleImageSpy = vi.fn(() => { throw new Error('Stale bitmap must not be downloaded'); });
    Object.defineProperty(sourceCanvas, 'toDataURL', { configurable: true, value: staleImageSpy });
    const nativeCreateElement = document.createElement.bind(document);
    const createdAnchors = [];
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag, options) => {
      const node = nativeCreateElement(tag, options);
      if (String(tag).toLowerCase() === 'a') createdAnchors.push(node);
      return node;
    });
    const downloadSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      const before = canvasDownloadWorkProof(fixture.state);
      const previousFrames = fixture.state.visualEvidence;
      const download = fixture.host.querySelector('[data-canvas-download]');
      download.focus();
      await clickEvidenceControl(download);
      if (failure === 'missing' || failure === 'context') expect(fullCapture).not.toHaveBeenCalled();
      else expect(fullCapture).toHaveBeenCalledExactlyOnceWith(outputContext, 864, 1036);
      expect(wrongCapture).not.toHaveBeenCalled();
      expect(staleImageSpy).not.toHaveBeenCalled();
      expect(outputContext.drawImage).not.toHaveBeenCalled();
      if (failure === 'encoding' || failure === 'invalid-png') expect(imageSpy).toHaveBeenCalledExactlyOnceWith('image/png');
      else expect(imageSpy).not.toHaveBeenCalled();
      expect(createdAnchors).toEqual([]);
      expect(downloadSpy).not.toHaveBeenCalled();
      expect(Object.prototype.hasOwnProperty.call(sourceCanvas, '_lastCaptureCamera')).toBe(ownedCamera);
      if (ownedCamera) expect(sourceCanvas._lastCaptureCamera).toBe(originalCamera);
      expect(fixture.state.visualEvidence).toBe(previousFrames);
      expect(fixture.state.visualEvidence).toEqual(preservedFrames);
      expect(frames).toEqual(preservedFrames);
      expect(document.activeElement).toBe(download);
      expect(fixture.state.procedureFeedback).toMatchObject({ message: 'Canvas download is unavailable in this view.', tone: 'caution' });
      expect(canvasDownloadWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally {
      createSpy.mockRestore(); delete sourceCanvas.toDataURL; imageSpy.mockRestore(); downloadSpy.mockRestore();
      await fixture.close();
    }
  });

  it('captures the full canvas only after an explicit contents choice and preserves learner work', async () => {
    const fixture = await mountMarkingFixture({
      visualEvidence: [], referenceEvidenceId: null, splitComparison: false, evidenceNotebookOpen: false,
      annotations: [{ x: 0.5, y: 0.38, type: 'dot' }, { x: 0.4, y: 0.32, type: 'dot' }],
    });
    const thumbnailContext = { drawImage: vi.fn() };
    const imageSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,ZnVsbA==');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      return this.width === 220 && this.height === 264 ? thumbnailContext : null;
    });
    try {
      const before = evidenceWorkProof(fixture.state);
      const sourceCanvas = fixture.host.querySelector('[data-diss-canvas]');
      const specimenCapture = vi.fn(() => { throw new Error('Specimen API must not be used for full canvas'); });
      const fullCapture = vi.fn((context, width, height) => { context.drawImage(sourceCanvas, 0, 0, width, height); return true; });
      sourceCanvas._captureDissectionEvidence = specimenCapture;
      sourceCanvas._captureFullDissectionEvidence = fullCapture;
      await chooseEvidenceCaptureContents(fixture, 'canvas');
      expect(evidenceWorkProof(fixture.state)).toEqual(before);
      await clickEvidenceControl(fixture.host.querySelector('[data-evidence-capture]'));
      expect(specimenCapture).not.toHaveBeenCalled();
      expect(fullCapture).toHaveBeenCalledExactlyOnceWith(thumbnailContext, 220, 264);
      expect(thumbnailContext.drawImage).toHaveBeenCalledExactlyOnceWith(sourceCanvas, 0, 0, 220, 264);
      expect(imageSpy).toHaveBeenCalledWith('image/jpeg', 0.72);
      expect(fixture.state.visualEvidence).toHaveLength(1);
      const captured = fixture.state.visualEvidence[0];
      expect(captured).toMatchObject({
        image: 'data:image/jpeg;base64,ZnVsbA==', captureContents: 'canvas',
        camera: { zoom: 1.5, panX: 15, panY: -8 }, annotationCount: 2,
      });
      expect(captured.measurementText).toBe('');
      expect(fixture.host.querySelector('[data-evidence-id="' + captured.id + '"] p[data-evidence-capture-context]').textContent).toContain('Full canvas with guides');
      expect(fixture.state.evidenceCaptureContents).toBe('canvas');
      expect(fixture.state.referenceEvidenceId).toBe(captured.id);
      expect(fixture.state.splitComparison).toBe(true);
      expect(document.activeElement).toBe(fixture.host.querySelector('[id="diss-reference-heading"]'));
      expect(evidenceWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally {
      imageSpy.mockRestore();
      await fixture.close();
    }
  });

  it.each(['specimen', 'canvas'].flatMap((contents) => ['missing', 'false', 'throw', 'encoding'].map((failure) => ({ contents, failure }))))('keeps $contents capture failure $failure from saving a mislabeled canvas or changing focus and work', async ({ contents, failure }) => {
    const frames = [{ id: 101, image: 'data:image/jpeg;base64,b2xk', layer: 'skin', view: 'dorsal' }];
    const preservedFrames = JSON.parse(JSON.stringify(frames));
    const fixture = await mountMarkingFixture({
      visualEvidence: frames, referenceEvidenceId: 101, splitComparison: false, evidenceNotebookOpen: false,
      evidenceReturnFocusId: 'diss-evidence-compare-101',
      annotations: [{ x: 0.5, y: 0.38, type: 'dot' }],
      rulerMode: true, rulerStart: { x: 0.5, y: 0.38 }, rulerEnd: { x: 0.65, y: 0.24 },
    });
    const thumbnailContext = { drawImage: vi.fn() };
    const imageSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      if (failure === 'encoding') throw new Error('Image encoding failed');
      return 'data:image/jpeg;base64,dW51c2Vk';
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      return this.width === 220 && this.height === 264 ? thumbnailContext : null;
    });
    try {
      const before = evidenceWorkProof(fixture.state);
      const previousFrames = fixture.state.visualEvidence;
      const sourceCanvas = fixture.host.querySelector('[data-diss-canvas]');
      let specimenCapture;
      if (contents === 'canvas') await chooseEvidenceCaptureContents(fixture, 'canvas');
      const captureApi = contents === 'canvas' ? '_captureFullDissectionEvidence' : '_captureDissectionEvidence';
      const otherApi = contents === 'canvas' ? '_captureDissectionEvidence' : '_captureFullDissectionEvidence';
      const wrongCapture = vi.fn(() => { throw new Error('Wrong frame contents API must not be used'); });
      sourceCanvas[otherApi] = wrongCapture;
      if (failure === 'missing') delete sourceCanvas[captureApi];
      else {
        specimenCapture = vi.fn(() => {
          if (failure === 'throw') throw new Error('Frame capture unavailable');
          return failure === 'encoding';
        });
        sourceCanvas[captureApi] = specimenCapture;
      }
      const capture = fixture.host.querySelector('[data-evidence-capture]');
      capture.focus();
      await clickEvidenceControl(capture);
      if (specimenCapture) expect(specimenCapture).toHaveBeenCalledExactlyOnceWith(thumbnailContext, 220, 264);
      expect(wrongCapture).not.toHaveBeenCalled();
      expect(thumbnailContext.drawImage).not.toHaveBeenCalled();
      if (failure === 'encoding') expect(imageSpy).toHaveBeenCalledExactlyOnceWith('image/jpeg', 0.72);
      else expect(imageSpy).not.toHaveBeenCalled();
      expect(fixture.state.visualEvidence).toBe(previousFrames);
      expect(fixture.state.visualEvidence).toEqual(preservedFrames);
      expect(frames).toEqual(preservedFrames);
      expect(fixture.state.referenceEvidenceId).toBe(101);
      expect(fixture.state.splitComparison).toBe(false);
      expect(fixture.state.evidenceNotebookOpen).toBe(false);
      expect(fixture.state.evidenceReturnFocusId).toBe('diss-evidence-compare-101');
      expect(fixture.host.querySelector('[id="diss-evidence-notebook"]').open).toBe(false);
      expect(fixture.host.querySelector('[id="diss-reference-heading"]')).toBeNull();
      expect(document.activeElement).toBe(capture);
      expect(fixture.state.procedureFeedback).toMatchObject({ tone: 'caution' });
      expect(fixture.state.procedureFeedback.message).toMatch(/unavailable/i);
      expect(evidenceWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally {
      imageSpy.mockRestore();
      await fixture.close();
    }
  });

  it('shows capture context from frozen frames and leaves missing legacy context unknown after live view changes', async () => {
    const frames = [
      { id: 101, image: 'data:image/jpeg;base64,b2xk', layer: 'skin', view: 'dorsal' },
      { id: 102, image: 'data:image/jpeg;base64,bmV3', layer: 'skin', view: 'dorsal',
        captureContents: 'specimen', camera: { zoom: 2, panX: 25, panY: -10 }, annotationCount: 3, measurementText: '2.4 cm model distance' },
    ];
    const preservedFrames = JSON.parse(JSON.stringify(frames));
    const fixture = await mountMarkingFixture({ visualEvidence: frames, referenceEvidenceId: 102, splitComparison: true, evidenceNotebookOpen: true });
    try {
      const before = evidenceWorkProof(fixture.state);
      const frozenCard = fixture.host.querySelector('[data-evidence-id="102"] p[data-evidence-capture-context]');
      expect(frozenCard.textContent).toContain('Specimen and marks');
      expect(frozenCard.textContent).toContain('Zoom 2×');
      expect(frozenCard.textContent).toContain('3 observation marks');
      expect(frozenCard.textContent).toContain('2.4 cm model distance');
      const frozenText = frozenCard.textContent;
      expect(fixture.host.querySelector('.diss-split-reference p[data-evidence-capture-context]').textContent).toBe(frozenText);
      const legacyContext = fixture.host.querySelector('[data-evidence-id="101"] p[data-evidence-capture-context]');
      expect(legacyContext.textContent).toMatch(/contents.*not recorded/i);
      expect(legacyContext.textContent).not.toMatch(/Specimen and marks|Full canvas with guides|Zoom|mark|cm/);
      const legacyText = legacyContext.textContent;
      await fixture.patch({
        canvasZoom: 3, canvasPanX: -25, canvasPanY: 10,
        annotations: [{ x: 0.4, y: 0.4, type: 'dot' }],
        rulerStart: { x: 0.5, y: 0.38 }, rulerEnd: { x: 0.65, y: 0.24 },
      });
      expect(fixture.host.querySelector('[data-evidence-id="102"] p[data-evidence-capture-context]').textContent).toBe(frozenText);
      expect(fixture.host.querySelector('.diss-split-reference p[data-evidence-capture-context]').textContent).toBe(frozenText);
      expect(fixture.host.querySelector('[data-evidence-id="101"] p[data-evidence-capture-context]').textContent).toBe(legacyText);
      await clickEvidenceControl(fixture.host.querySelector('[id="diss-evidence-compare-101"]'));
      expect(fixture.host.querySelector('.diss-split-reference p[data-evidence-capture-context]').textContent).toBe(legacyText);
      expect(fixture.state.visualEvidence).toEqual(preservedFrames);
      expect(frames).toEqual(preservedFrames);
      const expected = { ...before, canvasZoom: 3, canvasPanX: -25, canvasPanY: 10,
        annotations: [{ x: 0.4, y: 0.4, type: 'dot' }], rulerStart: { x: 0.5, y: 0.38 }, rulerEnd: { x: 0.65, y: 0.24 } };
      expect(evidenceWorkProof(fixture.state)).toEqual(expected);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('saves the explicit frame contents preference and restores it with the specimen notebook', async () => {
    const fixture = await mountMarkingFixture({ evidenceNotebookOpen: true });
    let saved;
    try {
      const before = evidenceWorkProof(fixture.state);
      const frames = JSON.parse(JSON.stringify(fixture.state.visualEvidence));
      expect(fixture.host.querySelector('[id="diss-evidence-capture-contents"]').value).toBe('specimen');
      await chooseEvidenceCaptureContents(fixture, 'canvas');
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
      saved = JSON.parse(localStorage.getItem('dissection_progress_frog'));
      expect(saved.evidenceCaptureContents).toBe('canvas');
      expect(saved.visualEvidence).toEqual(frames);
      expect(saved.organNotes).toEqual(before.organNotes);
      expect(evidenceWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
    const loaded = await mountMarkingFixture({ _dissLoadedSpec: null }, { frog: saved });
    try {
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
      expect(loaded.state._dissLoadedSpec).toBe('frog');
      expect(loaded.state.evidenceCaptureContents).toBe('canvas');
      expect(loaded.host.querySelector('[id="diss-evidence-capture-contents"]').value).toBe('canvas');
      expect(loaded.state.visualEvidence).toEqual(saved.visualEvidence);
      expect(loaded.state.organNotes).toEqual(saved.organNotes);
      expect(loaded.awardXP).not.toHaveBeenCalled();
    } finally { await loaded.close(); }
  });

  it('confirms notebook deletion with focus recovery and preserves learner work through reference fallback and clearing', async () => {
    const frames = [101, 102, 103].map((id) => ({ id, image: 'data:image/jpeg;base64,eA==', layer: 'skin', view: 'dorsal' }));
    const preservedFrames = JSON.parse(JSON.stringify(frames));
    const fixture = await mountMarkingFixture({
      visualEvidence: frames, referenceEvidenceId: 102, splitComparison: true, evidenceNotebookOpen: true,
      annotations: [{ x: 0.5, y: 0.38, type: 'dot' }],
      rulerStart: { x: 0.5, y: 0.38 }, rulerEnd: { x: 0.65, y: 0.24 },
    });
    try {
      const before = evidenceWorkProof(fixture.state);
      const remove = fixture.host.querySelector('[data-evidence-remove-id="102"]');
      await clickEvidenceControl(remove);
      expect(fixture.state.evidenceRemovePendingId).toBe(102);
      expect(document.activeElement).toBe(fixture.host.querySelector('[data-evidence-confirm-remove-id="102"]'));
      expect(fixture.state.visualEvidence).toEqual(preservedFrames);
      const cancelRemoval = Array.from(fixture.host.querySelector('[data-evidence-id="102"]').querySelectorAll('button')).find((button) => button.textContent === 'Cancel');
      await clickEvidenceControl(cancelRemoval);
      expect(fixture.state.evidenceRemovePendingId).toBeNull();
      expect(document.activeElement).toBe(fixture.host.querySelector('[data-evidence-remove-id="102"]'));
      expect(fixture.state.referenceEvidenceId).toBe(102);
      expect(fixture.state.visualEvidence).toEqual(preservedFrames);
      await clickEvidenceControl(fixture.host.querySelector('[data-evidence-remove-id="102"]'));
      await clickEvidenceControl(fixture.host.querySelector('[data-evidence-confirm-remove-id="102"]'));
      expect(fixture.state.visualEvidence).toEqual([preservedFrames[0], preservedFrames[2]]);
      expect(frames).toEqual(preservedFrames);
      expect(fixture.state.referenceEvidenceId).toBe(103);
      expect(fixture.state.splitComparison).toBe(true);
      expect(fixture.state.evidenceNotebookOpen).toBe(true);
      expect(fixture.state.evidenceRemovePendingId).toBeNull();
      expect(document.activeElement).toBe(fixture.host.querySelector('[id="diss-evidence-notebook"] summary'));
      expect(fixture.host.querySelector('[id="diss-reference-heading"]').textContent).toBe('Reference frame 2');
      await clickEvidenceControl(fixture.host.querySelector('button[aria-label="Close split comparison"]'));
      expect(document.activeElement).toBe(fixture.host.querySelector('[id="diss-evidence-compare-103"]'));

      await clickEvidenceControl(fixture.host.querySelector('[id="diss-evidence-clear-all"]'));
      expect(fixture.state.evidenceClearPending).toBe(true);
      expect(document.activeElement).toBe(fixture.host.querySelector('[id="diss-evidence-confirm-clear"]'));
      const cancelClear = Array.from(fixture.host.querySelector('[id="diss-evidence-clear-confirmation"]').querySelectorAll('button')).find((button) => button.textContent === 'Cancel');
      await clickEvidenceControl(cancelClear);
      expect(fixture.state.evidenceClearPending).toBe(false);
      expect(fixture.state.visualEvidence).toEqual([preservedFrames[0], preservedFrames[2]]);
      expect(fixture.state.referenceEvidenceId).toBe(103);
      expect(document.activeElement).toBe(fixture.host.querySelector('[id="diss-evidence-clear-all"]'));
      await clickEvidenceControl(fixture.host.querySelector('[id="diss-evidence-clear-all"]'));
      await clickEvidenceControl(fixture.host.querySelector('[id="diss-evidence-confirm-clear"]'));
      expect(fixture.state.visualEvidence).toEqual([]);
      expect(fixture.state.referenceEvidenceId).toBeNull();
      expect(fixture.state.splitComparison).toBe(false);
      expect(fixture.state.evidenceClearPending).toBe(false);
      expect(fixture.state.evidenceNotebookOpen).toBe(true);
      expect(fixture.host.querySelector('[id="diss-evidence-notebook"]').open).toBe(true);
      expect(document.activeElement).toBe(fixture.host.querySelector('[id="diss-evidence-notebook"] summary'));
      expect(fixture.host.querySelector('.diss-split-reference')).toBeNull();
      expect(evidenceWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });


  it('opens an Essentials notebook comparison in Advanced and returns focus without changing learner work', async () => {
    const frames = [{ id: 101, image: 'data:image/jpeg;base64,eA==', layer: 'skin', view: 'dorsal' }];
    const preservedFrames = JSON.parse(JSON.stringify(frames));
    const fixture = await mountMarkingFixture({
      workspaceMode: 'essentials', toolbarToolsOpen: false,
      visualEvidence: frames, referenceEvidenceId: null, splitComparison: false, evidenceNotebookOpen: true,
      annotations: [{ x: 0.5, y: 0.38, type: 'dot' }],
      rulerStart: { x: 0.5, y: 0.38 }, rulerEnd: { x: 0.65, y: 0.24 },
    });
    try {
      const before = evidenceWorkProof(fixture.state);
      expect(fixture.state.workspaceMode).toBe('essentials');
      expect(fixture.host.querySelector('[id="diss-evidence-notebook"]').open).toBe(true);
      expect(fixture.host.querySelector('[id="diss-reference-heading"]')).toBeNull();
      const compare = fixture.host.querySelector('[id="diss-evidence-compare-101"]');
      expect(compare).not.toBeNull();
      expect(compare.textContent).toBe('Open comparison in Advanced');
      expect(compare.getAttribute('aria-label')).toBe('Open comparison in Advanced for frame 1: Skin');
      await clickEvidenceControl(compare);
      expect(fixture.state.workspaceMode).toBe('advanced');
      expect(fixture.state.referenceEvidenceId).toBe(101);
      expect(fixture.state.splitComparison).toBe(true);
      expect(fixture.state.evidenceNotebookOpen).toBe(true);
      const heading = fixture.host.querySelector('[id="diss-reference-heading"]');
      expect(heading.textContent).toBe('Reference frame 1');
      expect(document.activeElement).toBe(heading);
      expect(evidenceWorkProof(fixture.state)).toEqual(before);
      expect(fixture.state.visualEvidence).toEqual(preservedFrames);
      expect(frames).toEqual(preservedFrames);
      await clickEvidenceControl(fixture.host.querySelector('button[aria-label="Close split comparison"]'));
      const returnedCompare = fixture.host.querySelector('[id="diss-evidence-compare-101"]');
      expect(document.activeElement).toBe(returnedCompare);
      expect(returnedCompare.getAttribute('aria-label')).toBe('Compare frame 1: Skin');
      expect(fixture.host.querySelector('[id="diss-reference-heading"]')).toBeNull();
      expect(fixture.state.workspaceMode).toBe('advanced');
      expect(fixture.state.referenceEvidenceId).toBe(101);
      expect(fixture.state.splitComparison).toBe(false);
      expect(fixture.state.evidenceNotebookOpen).toBe(true);
      expect(fixture.host.querySelector('[id="diss-evidence-notebook"]').open).toBe(true);
      expect(fixture.state.visualEvidence).toEqual(preservedFrames);
      expect(evidenceWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });


  it('preserves a deliberate zero-caution scenario threshold', () => {
    const html = renderTool('dissection', {
      dissection: {
        specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog',
        workspaceMode: 'advanced', instructorMaxCautions: 0,
      },
    });
    expect(html).toContain('Max cautions: 0');
    expect(html).toContain('Scenario thresholds');
  });

// Technique sequence clarity: use the mounted tool and real callbacks so the
  // display reflects action facts without changing scoring or navigation.
  function techniqueRoadmapState(procedure = {}, patch = {}) {
    return {
      revealedLayers: {}, guidedMode: false, quizMode: false, practicalMode: false,
      toolbarStudyOpen: false, flashcardMode: false, compareMode: false, eyeStudyMode: false,
      activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'probe',
      selectedOrgan: null, hoveredOrgan: null, inspectionLens: false, lensPinned: false,
      canvasZoom: 1, canvasPanX: 0, canvasPanY: 0, procedureScenario: 'precision-access',
      techniquePanelOpen: true, procedureByLayer: { skin: procedure },
      ...patch,
    };
  }

  function readTechniqueRoadmap(fixture) {
    const roadmap = fixture.host.querySelector('[id="diss-technique-roadmap"]');
    expect(roadmap).not.toBeNull();
    const sequence = roadmap.querySelector('ol');
    expect(sequence).not.toBeNull();
    const rows = Array.from(sequence.querySelectorAll('li[data-technique-action]'));
    const progress = roadmap.querySelector('progress');
    expect(progress).not.toBeNull();
    expect(progress.max).toBe(rows.length);
    expect(roadmap.querySelector('summary')?.textContent).toBe('View technique sequence');
    expect(sequence.querySelector('button, a, input, select, textarea')).toBeNull();
    return { roadmap, rows, progress };
  }

  function expectTechniqueCurrent(rows, action, state) {
    const current = rows.filter((row) => row.getAttribute('aria-current') === 'step');
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute('data-technique-action')).toBe(action);
    expect(current[0].getAttribute('data-step-state')).toBe(state);
  }

  it('shows the initial technique plan and opens its native sequence without changing learner work', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState());
    try {
      const before = markingWorkProof(fixture.state);
      const { roadmap, rows, progress } = readTechniqueRoadmap(fixture);
      expect(roadmap.textContent).toContain('Technique 1 of 6');
      expect(roadmap.textContent).toContain('0 of 6 steps verified');
      expect(progress.value).toBe(0);
      expectTechniqueCurrent(rows, 'inspect', 'plan');
      expect(rows.slice(1).every((row) => row.getAttribute('data-step-state') === 'upcoming')).toBe(true);
      const details = roadmap.querySelector('details');
      expect(details).not.toBeNull();
      expect(details.open).toBe(false);
      await act(async () => {
        roadmap.querySelector('summary').click();
        await Promise.resolve();
      });
      expect(details.open).toBe(true);
      await act(async () => { roadmap.querySelector('summary').click(); await Promise.resolve(); });
      expect(details.open).toBe(false);
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
      expect(fixture.host.querySelector('[data-next-action="learning"]')).toBeNull();
    } finally { await fixture.close(); }
  });

  it('shows a confirmed technique plan as ready to perform without giving verification credit', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({
      learningChecks: { inspect: { predictionCorrect: true } },
    }));
    try {
      const { roadmap, rows, progress } = readTechniqueRoadmap(fixture);
      expect(roadmap.textContent).toContain('Technique 1 of 6');
      expect(progress.value).toBe(0);
      expectTechniqueCurrent(rows, 'inspect', 'perform');
      expect(fixture.state.procedureByLayer.skin.inspected).not.toBe(true);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('keeps a completed action current until its reflection is verified', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({
      inspected: true, history: ['inspect'],
      learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: false } },
    }));
    try {
      const { roadmap, rows, progress } = readTechniqueRoadmap(fixture);
      expect(roadmap.textContent).toContain('Technique 1 of 6');
      expect(progress.value).toBe(0);
      expectTechniqueCurrent(rows, 'inspect', 'reflect');
      expect(rows.find((row) => row.getAttribute('data-technique-action') === 'scalpel').getAttribute('data-step-state')).toBe('upcoming');
      expect(fixture.host.querySelector('[id="diss-learning-checkpoint"]').getAttribute('data-phase')).toBe('reflect');
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('advances the current technique action only after action, plan, and explanation are verified', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({
      inspected: true, history: ['inspect'],
      learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true } },
    }));
    try {
      const { roadmap, rows, progress } = readTechniqueRoadmap(fixture);
      expect(roadmap.textContent).toContain('Technique 2 of 6');
      expect(roadmap.textContent).toContain('1 of 6 steps verified');
      expect(progress.value).toBe(1);
      expect(rows[0].getAttribute('data-step-state')).toBe('verified');
      expect(rows[0].hasAttribute('aria-current')).toBe(false);
      expectTechniqueCurrent(rows, 'scalpel', 'plan');
    } finally { await fixture.close(); }
  });

  it('does not verify a cached plan and reflection when the technique action was never performed', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({
      inspected: true, incisionStarted: false, history: ['inspect'],
      learningChecks: {
        inspect: { predictionCorrect: true, reflectionCorrect: true },
        scalpel: { predictionCorrect: true, reflectionCorrect: true },
      },
    }));
    try {
      const { rows, progress } = readTechniqueRoadmap(fixture);
      expect(progress.value).toBe(1);
      expectTechniqueCurrent(rows, 'scalpel', 'perform');
      expect(rows.filter((row) => row.getAttribute('data-step-state') === 'verified')).toHaveLength(1);
      expect(fixture.state.procedureByLayer.skin.incisionStarted).toBe(false);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('labels a legacy completed action with missing plan evidence without changing the native current action', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({
      inspected: true, history: ['inspect'],
      learningChecks: { inspect: { predictionCorrect: false, reflectionCorrect: true } },
    }));
    try {
      const before = markingWorkProof(fixture.state);
      const { rows, progress } = readTechniqueRoadmap(fixture);
      expect(progress.value).toBe(0);
      expect(rows[0].getAttribute('data-technique-action')).toBe('inspect');
      expect(rows[0].getAttribute('data-step-state')).toBe('recorded');
      expect(rows[0].textContent).toContain('Recorded action; evidence incomplete');
      expect(rows[0].hasAttribute('aria-current')).toBe(false);
      expectTechniqueCurrent(rows, 'scalpel', 'plan');
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('follows the native reflection gate when a completed legacy action has no saved prediction', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({
      inspected: true, history: ['inspect'],
      learningChecks: { inspect: { predictionCorrect: false, reflectionCorrect: false } },
    }));
    try {
      const before = markingWorkProof(fixture.state);
      const { rows, progress } = readTechniqueRoadmap(fixture);
      expect(progress.value).toBe(0);
      expectTechniqueCurrent(rows, 'inspect', 'reflect');
      expect(fixture.host.querySelector('[id="diss-learning-checkpoint"]').getAttribute('data-phase')).toBe('reflect');
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('returns roadmap verification and current phase to the restored action after native undo', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({
      inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 50 }],
      learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true } },
    }));
    try {
      expect(readTechniqueRoadmap(fixture).progress.value).toBe(1);
      const before = markingWorkProof(fixture.state);
      const undo = fixture.host.querySelector('[aria-label="Undo the last technique action and visually restore the previous tissue state"]');
      expect(undo).not.toBeNull();
      expect(undo.disabled).toBe(false);
      await act(async () => { undo.click(); await Promise.resolve(); });
      const { roadmap, rows, progress } = readTechniqueRoadmap(fixture);
      expect(roadmap.textContent).toContain('Technique 1 of 6');
      expect(progress.value).toBe(0);
      expectTechniqueCurrent(rows, 'inspect', 'perform');
      expect(fixture.state.procedureByLayer.skin.inspected).toBe(false);
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect).toMatchObject({ predictionCorrect: true, reflectionCorrect: false });
      expect(fixture.state.organNotes).toEqual(before.organNotes);
      expect(fixture.state.organConfidence).toEqual(before.organConfidence);
      expect(fixture.state.exploredOrgans).toEqual(before.exploredOrgans);
      expect(fixture.state.verifiedIdentifications).toEqual(before.verifiedIdentifications);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it.each([
    ['frog', 'ventral', ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe']],
    ['earthworm', 'dorsal', ['inspect', 'pin', 'scalpel', 'scissors', 'forceps', 'probe']],
    ['pig', 'ventral', ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe']],
    ['perch', 'lateral', ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe']],
    ['crayfish', 'dorsal', ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe']],
    ['sheepEye', 'lateral', ['inspect', 'pin', 'scalpel', 'scissors', 'forceps', 'probe']],
    ['sheepHeart', 'ventral', ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe']],
  ])('uses the native %s protocol order in the technique roadmap', async (specimen, anatomicalView, expectedOrder) => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({}, {
      specimen, _dissLoadedSpec: specimen, anatomicalView,
    }));
    try {
      const { rows, progress } = readTechniqueRoadmap(fixture);
      expect(rows.map((row) => row.getAttribute('data-technique-action'))).toEqual(expectedOrder);
      expect(progress.max).toBe(expectedOrder.length);
      expectTechniqueCurrent(rows, 'inspect', 'plan');
    } finally {
      await fixture.close();
      localStorage.removeItem('dissection_progress_' + specimen);
    }
  });

  it.each([
    ['guided investigation', { guidedMode: true }],
    ['practice assessment', { quizMode: true }],
    ['timed practical', { practicalMode: true, quizMode: true }],
    ['revealed layer', { revealedLayers: { skin: true } }],
    ['study tools', { toolbarStudyOpen: true }],
  ])('keeps the technique roadmap out of %s', async (_case, patch) => {
    const activePatch = _case === 'timed practical' ? {
      ...patch, practicalTimer: 300, practicalEndsAt: Date.now() + 300000,
      practicalTargetIds: ['ventral_skin', 'tympanum'],
    } : patch;
    const fixture = await mountMarkingFixture(techniqueRoadmapState({}, activePatch));
    try {
      if (_case === 'timed practical') {
        expect(fixture.state.practicalMode).toBe(true);
        expect(fixture.state.quizMode).toBe(true);
        expect(fixture.state.practicalEndsAt).toBeGreaterThan(Date.now());
        expect(fixture.state.practicalTimer).toBeGreaterThan(0);
        expect(fixture.state.practicalTargetIds).toEqual(['ventral_skin', 'tympanum']);
        expect(fixture.host.querySelector('[data-dissection-root]')?.getAttribute('data-assessment-mode')).toBe('true');
      }
      expect(fixture.host.querySelector('[id="diss-technique-roadmap"]')).toBeNull();
      expect(fixture.host.querySelector('[id="diss-learning-checkpoint"]')).toBeNull();
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  // Action handoff follows the real post-action learning gate. These cases
  // exercise native controls and leave all authored plans/explanations intact.
  const actionHandoffOrder = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
  const actionHandoffTissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0 };
  const actionHandoffReflection = 'Next: explain what changed in the learning checkpoint before another technique action.';

  function actionHandoffProcedure(action, patch = {}) {
    expect(actionHandoffOrder).toContain(action);
    const actionIndex = actionHandoffOrder.indexOf(action);
    expect(actionIndex).toBeGreaterThanOrEqual(0);
    const before = actionHandoffOrder.slice(0, actionIndex);
    return {
      tissueState: { ...actionHandoffTissue },
      inspected: before.includes('inspect'), incisionStarted: before.includes('scalpel'),
      incisionExtended: before.includes('scissors'), retracted: before.includes('forceps'),
      pins: before.includes('pin') ? [{ x: .45, y: .3 }, { x: .55, y: .8 }] : [],
      probed: false, history: [...before], actionLog: [], errors: 0, protocolDeviations: 0,
      learningChecks: {
        ...Object.fromEntries(before.map((step) => [step, { predictionCorrect: true, reflectionCorrect: true }])),
        [action]: { predictionCorrect: true, reflectionCorrect: false },
      },
      ...patch,
    };
  }

  async function performActionHandoff(fixture) {
    const button = fixture.host.querySelector('.diss-procedure__next');
    expect(button).not.toBeNull();
    expect(button.disabled, button.getAttribute('aria-label')).toBe(false);
    await clickEvidenceControl(button);
    return fixture.state.procedureFeedback.message;
  }

  it.each(actionHandoffOrder)('action handoff sends completed %s to its pending explanation', async (action) => {
    const procedure = actionHandoffProcedure(action, action === 'pin' ? { pins: [{ x: .45, y: .3 }] } : {});
    const instrument = action === 'inspect' ? 'probe' : action;
    const fixture = await mountMarkingFixture(techniqueRoadmapState(procedure, { activeInstrument: instrument }));
    try {
      const checks = JSON.parse(JSON.stringify(fixture.state.procedureByLayer.skin.learningChecks));
      const message = await performActionHandoff(fixture);
      expect(message).toContain(actionHandoffReflection);
      expect(message).not.toMatch(/Switch to scissors|Use forceps next|Place two well-spaced pins|Next protocol action:|Record evidence or complete the layer|Next checkpoint:/);
      const checkpoint = fixture.host.querySelector('[id="diss-learning-checkpoint"]');
      expect(checkpoint.getAttribute('data-phase')).toBe('reflect');
      expect(checkpoint.getAttribute('data-learning-action')).toBe(action);
      expect(fixture.state.procedureByLayer.skin.actionLog.at(-1).action).toBe(action);
      expect(fixture.state.procedureByLayer.skin.learningChecks).toEqual(checks);
      expect(fixture.state.activeInstrument).toBe(instrument);
      expect(fixture.state.revealedLayers).toEqual({});
      expect(fixture.state.organNotes['frog|nictitating']).toBe('Transparent membrane noted before adding marks.');
      expect([fixture.state.quizScore, fixture.state.quizTotal]).toEqual([1, 2]);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('action handoff keeps the first pin on its second placement before requesting an explanation', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState(actionHandoffProcedure('pin'), { activeInstrument: 'pin' }));
    try {
      const firstMessage = await performActionHandoff(fixture);
      expect(fixture.state.procedureByLayer.skin.pins).toHaveLength(1);
      const secondPlacement = fixture.host.querySelector('.diss-procedure__next').textContent.replace('Motor-neutral: ', '');
      expect(firstMessage).toContain('Next: ' + secondPlacement + '.');
      expect(firstMessage).not.toContain(actionHandoffReflection);
      expect(fixture.host.querySelector('[id="diss-learning-checkpoint"]').getAttribute('data-phase')).toBe('perform');
      const secondMessage = await performActionHandoff(fixture);
      expect(fixture.state.procedureByLayer.skin.pins).toHaveLength(2);
      expect(secondMessage).toContain(actionHandoffReflection);
      expect(fixture.host.querySelector('[id="diss-learning-checkpoint"]').getAttribute('data-phase')).toBe('reflect');
      expect(fixture.state.procedureByLayer.skin.actionLog.map((entry) => entry.action)).toEqual(['pin', 'pin']);
    } finally { await fixture.close(); }
  });

  it('action handoff uses earthworm order after a forceps action with saved explanation credit', async () => {
    const procedure = actionHandoffProcedure('forceps', {
      pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }],
      learningChecks: Object.fromEntries(['inspect', 'pin', 'scalpel', 'scissors', 'forceps'].map((action) => [action, { predictionCorrect: true, reflectionCorrect: true }])),
    });
    const fixture = await mountMarkingFixture(techniqueRoadmapState(procedure, {
      specimen: 'earthworm', _dissLoadedSpec: 'earthworm', anatomicalView: 'dorsal', activeInstrument: 'forceps',
    }));
    try {
      const message = await performActionHandoff(fixture);
      expect(message).toContain('Next: use the learning checkpoint to plan this step: Trace the digestive tract or a visible vessel.');
      expect(message).not.toMatch(/Place two well-spaced pins|Next checkpoint:/);
      expect(fixture.host.querySelector('[id="diss-learning-checkpoint"]').getAttribute('data-learning-action')).toBe('probe');
      expect(fixture.host.querySelector('[id="diss-learning-checkpoint"]').getAttribute('data-phase')).toBe('predict');
      expect(fixture.state.procedureByLayer.skin.pins).toHaveLength(2);
      expect(fixture.state.procedureByLayer.skin.retracted).toBe(true);
      expect(fixture.state.procedureByLayer.skin.learningChecks.forceps.reflectionCorrect).toBe(true);
    } finally {
      await fixture.close();
      localStorage.removeItem('dissection_progress_earthworm');
    }
  });

  it('action handoff honors saved orientation evidence during an orientation rescue recheck', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState(actionHandoffProcedure('inspect', {
      inspected: true, orientationRecheckRequired: true,
      learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true } },
    }), { procedureScenario: 'orientation-rescue', scenarioCompletedAt: 0 }));
    try {
      const message = await performActionHandoff(fixture);
      expect(message).toContain('Next: use the learning checkpoint to plan this step: Begin the shallow ventral midline opening.');
      expect(message).toContain('Scenario checkpoint: 100%.');
      expect(message).toContain('Objective complete.');
      expect(message).not.toContain('Review the debrief or restart');
      expect(message).not.toContain(actionHandoffReflection);
      expect(fixture.state.procedureByLayer.skin.orientationRecheckRequired).toBe(false);
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect.reflectionCorrect).toBe(true);
      expect(fixture.state.scenarioCompletedAt).toBeGreaterThan(0);
    } finally { await fixture.close(); }
  });

  it('action handoff offers evidence review after a final probe with saved explanation credit', async () => {
    const procedure = actionHandoffProcedure('probe');
    procedure.learningChecks.probe.reflectionCorrect = true;
    const fixture = await mountMarkingFixture(techniqueRoadmapState(procedure));
    try {
      const message = await performActionHandoff(fixture);
      expect(message).toContain('Next: review your observations and the remaining layer evidence.');
      expect(message).not.toContain(actionHandoffReflection);
      expect(message).not.toContain('Record evidence or complete the layer');
      expect(fixture.state.procedureByLayer.skin.probed).toBe(true);
      expect(fixture.state.revealedLayers).toEqual({});
      expect(fixture.host.querySelector('[id="diss-learning-checkpoint"]')).toBeNull();
      expect(fixture.state.quizScore).toBe(1);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('action handoff leaves optional hydration on native scenario guidance without a new learning cycle', async () => {
    const procedure = actionHandoffProcedure('scalpel');
    const fixture = await mountMarkingFixture(techniqueRoadmapState(procedure, { activeInstrument: 'dropper' }));
    try {
      const checks = JSON.parse(JSON.stringify(fixture.state.procedureByLayer.skin.learningChecks));
      const control = Array.from(fixture.host.querySelectorAll('button')).find((button) => button.textContent.includes('Apply controlled drop'));
      expect(control).not.toBeNull();
      expect(control.disabled).toBe(false);
      await clickEvidenceControl(control);
      const message = fixture.state.procedureFeedback.message;
      expect(message).toContain('Controlled saline dose applied');
      expect(message).toContain('Next checkpoint: Begin the shallow ventral midline opening.');
      expect(message).not.toContain('Next:');
      expect(fixture.state.procedureByLayer.skin.actionLog.at(-1).action).toBe('dropper');
      expect(fixture.state.procedureByLayer.skin.learningChecks).toEqual(checks);
      expect(fixture.state.procedureByLayer.skin.incisionStarted).toBe(false);
      expect(fixture.state.procedureByLayer.skin.tissueState.salineDrops).toBeGreaterThan(0);
      expect(fixture.host.querySelector('[id="diss-learning-checkpoint"]').getAttribute('data-learning-action')).toBe('scalpel');
    } finally { await fixture.close(); }
  });

  it('hides the completed technique checkpoint and uses an honest review title before understanding is verified', async () => {
    const actions = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
    const verifiedProcedure = {
      inspected: true, incisionStarted: true, incisionExtended: true, retracted: true,
      pins: [{ x: 0.4, y: 0.4 }, { x: 0.6, y: 0.4 }], probed: true,
      learningChecks: Object.fromEntries(actions.map((action) => [action, { predictionCorrect: true, reflectionCorrect: true }])),
    };
    const structures = ['brain', 'spinal_cord', 'sciatic_n', 'brachial_n', 'cranial_n', 'optic_lobe'];
    const fixture = await mountMarkingFixture(techniqueRoadmapState(verifiedProcedure, {
      activeLayer: 'nervous', revealedLayers: { skin: true, muscle: true, organs: true, skeletal: true, nervous: true },
      procedureByLayer: { nervous: verifiedProcedure },
      exploredOrgans: Object.fromEntries(structures.map((id) => ['frog|' + id, true])),
      organNotes: Object.fromEntries(structures.map((id) => ['frog|' + id, 'Recorded observation.'])),
      organConfidence: Object.fromEntries(structures.map((id) => ['frog|' + id, 3])),
      verifiedIdentifications: {}, assessmentCompletedAt: 0,
    }));
    try {
      const before = markingWorkProof(fixture.state);
      expect(fixture.host.querySelector('[id="diss-technique-roadmap"]')).toBeNull();
      expect(fixture.host.querySelector('[id="diss-learning-checkpoint"]')).toBeNull();
      const next = fixture.host.querySelector('[data-dissection-next-action]');
      expect(next.getAttribute('data-next-action')).toBe('start-assessment');
      expect(next.querySelector('h3').textContent).toBe('Review your specimen investigation');
      expect(next.textContent).not.toContain('Specimen investigation complete');
      expect(fixture.state.assessmentCompletedAt).toBe(0);
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });


  // Technique availability explains the native action gate and offers only
  // a focus handoff; the learner still supplies every plan and explanation.
  it('technique availability lets learners review a required plan without changing work', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState());
    try {
      const before = markingWorkProof(fixture.state);
      const instrument = fixture.state.activeInstrument;
      const feedback = fixture.state.procedureFeedback;
      const action = fixture.host.querySelector('.diss-procedure__next');
      const hint = fixture.host.querySelector('#diss-equivalent-technique-note');
      const link = fixture.host.querySelector('#diss-equivalent-checkpoint-link');
      expect(action.disabled).toBe(true);
      expect(hint.tagName).toBe('P');
      expect(hint.classList.contains('diss-sr-only')).toBe(false);
      expect(hint.textContent).toContain('Choose a safe plan');
      expect(action.getAttribute('aria-describedby')).toBe(hint.id);
      expect(link.textContent).toBe('Review plan');
      expect(link.getAttribute('aria-controls')).toBe('diss-learning-checkpoint');
      expect(link.getAttribute('aria-describedby')).toBe(hint.id);
      await clickEvidenceControl(link);
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-learning-check-title'));
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.state.activeInstrument).toBe(instrument);
      expect(fixture.state.procedureFeedback).toEqual(feedback);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('technique availability returns to the pending explanation before the next action', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({
      inspected: true, history: ['inspect'],
      learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: false } },
    }));
    try {
      const before = markingWorkProof(fixture.state);
      const action = fixture.host.querySelector('.diss-procedure__next');
      const link = fixture.host.querySelector('#diss-equivalent-checkpoint-link');
      expect(action.disabled).toBe(true);
      expect(fixture.host.querySelector('#diss-equivalent-technique-note').textContent).toContain('Explain the observed result');
      expect(link.textContent).toBe('Explain result');
      await clickEvidenceControl(link);
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-learning-check-title'));
      expect(fixture.host.querySelector('#diss-learning-checkpoint').getAttribute('data-learning-action')).toBe('inspect');
      expect(fixture.host.querySelector('#diss-learning-checkpoint').getAttribute('data-phase')).toBe('reflect');
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('technique availability waits for the final native explanation before claiming completion', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState(actionHandoffProcedure('probe', {
      probed: true, history: [...actionHandoffOrder], cautionLog: [],
      tissueState: {
        ...actionHandoffTissue, consequences: [], lastAction: 'prepared', lastUpdatedAt: 100,
        variantId: 'firm', variantLabel: 'Firm preservation',
      },
    })));
    try {
      const before = markingWorkProof(fixture.state);
      const action = fixture.host.querySelector('.diss-procedure__next');
      expect(action.disabled).toBe(true);
      expect(action.textContent).toBe('Final explanation needed');
      expect(action.getAttribute('aria-label')).toBe('Final explanation needed. Complete the reflection checkpoint before continuing.');
      expect(action.getAttribute('aria-label')).not.toContain('protocol complete');
      expect(fixture.host.querySelector('#diss-equivalent-technique-note').textContent).toContain('Explain the observed result');
      expect(fixture.host.querySelector('#diss-equivalent-checkpoint-link').textContent).toBe('Explain result');
      const answer = Array.from(fixture.host.querySelectorAll('#diss-learning-checkpoint button')).find((button) =>
        button.textContent.includes('The visible boundary is traced and identified without increasing tissue stress.'));
      await clickEvidenceControl(answer);
      const completeAction = fixture.host.querySelector('.diss-procedure__next');
      expect(completeAction.disabled).toBe(true);
      expect(completeAction.textContent).toBe('Technique complete');
      expect(fixture.host.querySelector('#diss-equivalent-technique-note').textContent).toContain('Technique actions and explanations are complete');
      expect(fixture.host.querySelector('#diss-equivalent-checkpoint-link')).toBeNull();
      expect(fixture.host.querySelector('#diss-learning-checkpoint')).toBeNull();
      expect(fixture.state.procedureByLayer.skin.learningChecks.probe.reflectionCorrect).toBe(true);
      const after = markingWorkProof(fixture.state);
      const beforeProcedure = before.procedureByLayer.skin;
      const afterProcedure = after.procedureByLayer.skin;
      expect({ ...afterProcedure, learningChecks: undefined }).toEqual({ ...beforeProcedure, learningChecks: undefined });
      expect({ ...after, procedureByLayer: undefined }).toEqual({ ...before, procedureByLayer: undefined });
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('technique availability explains a wrong instrument without selecting one automatically', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({
      learningChecks: { inspect: { predictionCorrect: true } },
    }, { activeInstrument: 'scalpel' }));
    try {
      const before = markingWorkProof(fixture.state);
      expect(fixture.host.querySelector('.diss-procedure__next').disabled).toBe(true);
      expect(fixture.host.querySelector('#diss-equivalent-technique-note').textContent).toContain('Select Probe in the instrument tray');
      expect(fixture.host.querySelector('#diss-equivalent-checkpoint-link')).toBeNull();
      expect(fixture.state.activeInstrument).toBe('scalpel');
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('technique availability identifies a ready equivalent action while retaining the native action', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({
      learningChecks: { inspect: { predictionCorrect: true } },
    }));
    try {
      const action = fixture.host.querySelector('.diss-procedure__next');
      expect(action.disabled).toBe(false);
      expect(fixture.host.querySelector('#diss-equivalent-technique-note').textContent).toContain('Ready. This records a supported technique action');
      expect(fixture.host.querySelector('#diss-equivalent-checkpoint-link')).toBeNull();
      await clickEvidenceControl(action);
      expect(fixture.state.procedureByLayer.skin.inspected).toBe(true);
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect.reflectionCorrect).not.toBe(true);
      expect(fixture.host.querySelector('#diss-learning-checkpoint').getAttribute('data-phase')).toBe('reflect');
      expect(fixture.host.querySelector('#diss-equivalent-checkpoint-link').textContent).toBe('Explain result');
    } finally { await fixture.close(); }
  });

  it.each([
    ['guided investigation', { guidedMode: true }],
    ['practice assessment', { quizMode: true }],
    ['timed practical', { practicalMode: true, quizMode: true }],
    ['revealed layer', { revealedLayers: { skin: true } }],
    ['study tools', { toolbarStudyOpen: true }],
  ])('technique availability has no checkpoint handoff in %s', async (_case, patch) => {
    const activePatch = _case === 'timed practical' ? {
      ...patch, practicalTimer: 300, practicalEndsAt: Date.now() + 300000,
      practicalTargetIds: ['ventral_skin', 'tympanum'],
    } : patch;
    const fixture = await mountMarkingFixture(techniqueRoadmapState({}, activePatch));
    try {
      const before = markingWorkProof(fixture.state);
      expect(fixture.host.querySelector('#diss-learning-checkpoint')).toBeNull();
      expect(fixture.host.querySelector('#diss-equivalent-checkpoint-link')).toBeNull();
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });


  // Field-monitor navigation follows the current learning phase. These tests
  // use the native monitor control and preserve learner-authored work.
  async function openHandoffMonitor(fixture) {
    const monitor = fixture.host.querySelector('.diss-field-monitor');
    expect(monitor).not.toBeNull();
    if (!monitor.open) await clickEvidenceControl(monitor.querySelector('summary'));
    expect(monitor.open).toBe(true);
    return monitor;
  }

  function monitorHandoffWorkProof(state) {
    return JSON.parse(JSON.stringify({
      work: markingWorkProof(state), activeInstrument: state.activeInstrument,
      techniquePanelOpen: state.techniquePanelOpen, procedureFeedback: state.procedureFeedback,
      simplifiedInstructions: state.simplifiedInstructions,
    }));
  }

  it('monitor handoff names the required plan and focuses it without changing work', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({}, { simplifiedInstructions: true }));
    try {
      const monitor = await openHandoffMonitor(fixture);
      const before = monitorHandoffWorkProof(fixture.state);
      const action = monitor.querySelector('.diss-stage__telemetry-prepare');
      expect(action.disabled).toBe(false);
      expect(action.textContent).toBe('Review plan');
      expect(action.getAttribute('aria-label')).toContain('Review plan');
      expect(action.getAttribute('aria-controls')).toBe('diss-learning-checkpoint');
      expect(fixture.host.querySelector('#diss-procedure-title').textContent).toBe('Technique practice · Plan needed');
      expect(fixture.host.querySelector('#diss-procedure-summary > span').textContent).toMatch(/[Pp]lan/);
      expect(fixture.host.querySelector('#diss-active-tool-help').textContent).toBe('Next: choose a safe plan.');
      const performed = fixture.host.querySelector('.diss-procedure__steps');
      expect(performed.getAttribute('role')).toBe('group');
      expect(performed.getAttribute('aria-label')).toBe('0 of 6 actions performed');
      await clickEvidenceControl(action);
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-learning-check-title'));
      expect(monitorHandoffWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('monitor handoff keeps the performed action current until its explanation is verified', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({
      inspected: true, history: ['inspect'],
      learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: false } },
    }, { simplifiedInstructions: true }));
    try {
      const monitor = await openHandoffMonitor(fixture);
      const before = monitorHandoffWorkProof(fixture.state);
      const action = monitor.querySelector('.diss-stage__telemetry-prepare');
      expect(action.disabled).toBe(false);
      expect(action.textContent).toBe('Explain result');
      expect(action.getAttribute('aria-label')).toContain('Explain result');
      expect(action.getAttribute('aria-controls')).toBe('diss-learning-checkpoint');
      expect(fixture.host.querySelector('#diss-procedure-title').textContent).toBe('Technique practice · Explanation needed');
      const summary = fixture.host.querySelector('#diss-procedure-summary > span').textContent;
      const simplified = fixture.host.querySelector('#diss-active-tool-help').textContent;
      expect(summary).toMatch(/[Ee]xpla(?:in|nation)/);
      expect(simplified).toBe('Next: explain the observed result.');
      expect(summary + simplified).not.toContain('Begin the shallow ventral midline opening');
      expect(fixture.host.querySelector('.diss-procedure__steps').getAttribute('aria-label')).toBe('1 of 6 actions performed');
      expect(readTechniqueRoadmap(fixture).progress.value).toBe(0);
      await clickEvidenceControl(action);
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-learning-check-title'));
      expect(fixture.host.querySelector('#diss-learning-checkpoint').getAttribute('data-learning-action')).toBe('inspect');
      expect(monitorHandoffWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('monitor handoff waits for the final explanation before presenting technique completion', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState(actionHandoffProcedure('probe', {
      probed: true, history: [...actionHandoffOrder], cautionLog: [],
      tissueState: {
        ...actionHandoffTissue, consequences: [], lastAction: 'prepared', lastUpdatedAt: 100,
        variantId: 'firm', variantLabel: 'Firm preservation',
      },
    }), { simplifiedInstructions: true }));
    try {
      const monitor = await openHandoffMonitor(fixture);
      const before = monitorHandoffWorkProof(fixture.state);
      const action = monitor.querySelector('.diss-stage__telemetry-prepare');
      expect(action.disabled).toBe(false);
      expect(action.textContent).toBe('Explain result');
      expect(action.getAttribute('aria-label')).not.toMatch(/protocol complete|technique complete/i);
      expect(fixture.host.querySelector('#diss-procedure-title').textContent).toBe('Technique practice · Explanation needed');
      expect(fixture.host.querySelector('#diss-active-tool-help').textContent).toBe('Next: explain the observed result.');
      expect(fixture.host.querySelector('#diss-active-tool-help').textContent).not.toContain('Done. Complete this layer.');
      expect(fixture.host.querySelector('.diss-procedure__steps').getAttribute('aria-label')).toBe('6 of 6 actions performed');
      expect(readTechniqueRoadmap(fixture).progress.value).toBe(5);
      await clickEvidenceControl(action);
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-learning-check-title'));
      expect(monitorHandoffWorkProof(fixture.state)).toEqual(before);
      const answer = Array.from(fixture.host.querySelectorAll('#diss-learning-checkpoint button')).find((button) =>
        button.textContent.includes('The visible boundary is traced and identified without increasing tissue stress.'));
      await clickEvidenceControl(answer);
      const completeAction = monitor.querySelector('.diss-stage__telemetry-prepare');
      expect(completeAction.disabled).toBe(true);
      expect(completeAction.textContent).toBe('Technique complete');
      expect(completeAction.hasAttribute('aria-controls')).toBe(false);
      expect(fixture.host.querySelector('#diss-procedure-title').textContent).toBe('Technique practice · Technique complete');
      expect(fixture.host.querySelector('#diss-active-tool-help').textContent).toBe('Technique complete. Review specimen evidence.');
      expect(fixture.host.querySelector('#diss-learning-checkpoint')).toBeNull();
      expect(fixture.state.procedureByLayer.skin.learningChecks.probe.reflectionCorrect).toBe(true);
      const after = markingWorkProof(fixture.state);
      const beforeWork = before.work;
      expect({ ...after.procedureByLayer.skin, learningChecks: undefined }).toEqual({ ...beforeWork.procedureByLayer.skin, learningChecks: undefined });
      expect({ ...after, procedureByLayer: undefined }).toEqual({ ...beforeWork, procedureByLayer: undefined });
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('monitor handoff preserves native preparation and leaves instrument selection to the learner', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState(actionHandoffProcedure('scalpel'), {
      activeInstrument: 'probe', techniquePanelOpen: false,
    }));
    try {
      const monitor = await openHandoffMonitor(fixture);
      const before = markingWorkProof(fixture.state);
      const action = monitor.querySelector('.diss-stage__telemetry-prepare');
      expect(action.disabled).toBe(false);
      expect(action.textContent).toMatch(/^Prepare/);
      expect(action.getAttribute('aria-controls')).not.toBe('diss-learning-checkpoint');
      expect(fixture.host.querySelector('#diss-procedure-title').textContent).toBe('Technique practice · Step 2 of 6');
      await clickEvidenceControl(action);
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-instrument-scalpel'));
      expect(fixture.state.techniquePanelOpen).toBe(true);
      expect(fixture.state.activeInstrument).toBe('probe');
      expect(markingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('monitor handoff labels a revealed layer without offering a nonexistent checkpoint', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState({}, { revealedLayers: { skin: true } }));
    try {
      const monitor = await openHandoffMonitor(fixture);
      const before = monitorHandoffWorkProof(fixture.state);
      const action = monitor.querySelector('.diss-stage__telemetry-prepare');
      expect(action.disabled).toBe(true);
      expect(action.textContent).toBe('Layer revealed');
      expect(action.hasAttribute('aria-controls')).toBe(false);
      expect(fixture.host.querySelector('#diss-procedure-title').textContent).toBe('Technique practice · Layer revealed');
      expect(fixture.host.querySelector('#diss-learning-checkpoint')).toBeNull();
      await clickEvidenceControl(action);
      expect(monitorHandoffWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('monitor handoff pauses navigation during an animation and restores the same planning route', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState());
    try {
      const monitor = await openHandoffMonitor(fixture);
      const incision = { active: true, startTick: Date.now(), layerName: 'skin' };
      await fixture.patch({ _incisionAnim: incision });
      const before = monitorHandoffWorkProof(fixture.state);
      const action = monitor.querySelector('.diss-stage__telemetry-prepare');
      expect(action.disabled).toBe(true);
      expect(action.textContent).toMatch(/^Technique in progress/);
      expect(action.hasAttribute('aria-controls')).toBe(false);
      await clickEvidenceControl(action);
      expect(fixture.state._incisionAnim).toEqual(incision);
      expect(monitorHandoffWorkProof(fixture.state)).toEqual(before);
      await fixture.patch({ _incisionAnim: null });
      const restored = monitor.querySelector('.diss-stage__telemetry-prepare');
      expect(restored.disabled).toBe(false);
      expect(restored.textContent).toBe('Review plan');
      expect(restored.getAttribute('aria-controls')).toBe('diss-learning-checkpoint');
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it.each([
    ['guided investigation', { guidedMode: true }],
    ['practice assessment', { quizMode: true }],
    ['timed practical', { practicalMode: true, quizMode: true }],
    ['study tools', { toolbarStudyOpen: true }],
  ])('monitor handoff hides the procedure action in %s while keeping field metrics', async (_case, patch) => {
    const activePatch = _case === 'timed practical' ? {
      ...patch, practicalTimer: 300, practicalEndsAt: Date.now() + 300000,
      practicalTargetIds: ['ventral_skin', 'tympanum'],
    } : patch;
    const fixture = await mountMarkingFixture(techniqueRoadmapState({}, activePatch));
    try {
      const monitor = await openHandoffMonitor(fixture);
      const before = monitorHandoffWorkProof(fixture.state);
      expect(monitor.querySelector('.diss-stage__telemetry-prepare')).toBeNull();
      expect(monitor.querySelectorAll('.diss-stage__telemetry-metric')).toHaveLength(4);
      expect(fixture.host.querySelector('#diss-learning-checkpoint')).toBeNull();
      expect(monitorHandoffWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });


  // Coaching stays associated with the native selected response. No retry
  // helper supplies an answer or substitutes for the learner's next choice.
  function checkpointCoachingProcedure(patch = {}) {
    return {
      ...actionHandoffProcedure('inspect'), cautionLog: [], learningChecks: {},
      tissueState: {
        ...actionHandoffTissue, consequences: [], lastAction: 'prepared', lastUpdatedAt: 100,
        variantId: 'firm', variantLabel: 'Firm preservation',
      },
      ...patch,
    };
  }

  function checkpointCoachingWorkProof(state) {
    const proof = markingWorkProof(state);
    proof.procedureByLayer = Object.fromEntries(Object.entries(proof.procedureByLayer || {}).map(([layer, procedure]) => {
      const { learningChecks, ...physical } = procedure;
      return [layer, physical];
    }));
    proof.activeInstrument = state.activeInstrument;
    return proof;
  }

  function expectSelectedCoaching(panel, button, feedbackId, nativeMessage) {
    const feedback = panel.querySelector('[id="' + feedbackId + '"]');
    expect(panel.querySelectorAll('[id="' + feedbackId + '"]')).toHaveLength(1);
    expect(button.parentElement.classList.contains('diss-learning-check__choice')).toBe(true);
    expect(button.nextElementSibling).toBe(feedback);
    expect(feedback.tagName).toBe('P');
    expect(feedback.getAttribute('data-result')).toBe('incorrect');
    expect(feedback.querySelector('.diss-learning-check__feedback-title').textContent.trim()).toBe('Try another choice.');
    expect(feedback.textContent).toContain(nativeMessage);
    expect(button.getAttribute('aria-describedby')).toBe(feedbackId);
    expect(button.textContent).not.toContain(nativeMessage);
    const others = Array.from(panel.querySelectorAll('.diss-learning-check__option')).filter((choice) => choice !== button);
    expect(others.every((choice) => !choice.hasAttribute('aria-describedby'))).toBe(true);
    return feedback;
  }

  it('checkpoint coaching follows repeated wrong plans without moving focus or recording a technique', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState(checkpointCoachingProcedure()));
    try {
      const panel = fixture.host.querySelector('#diss-learning-checkpoint');
      const choices = Array.from(panel.querySelectorAll('.diss-learning-check__option'));
      const answerText = choices.map((choice) => choice.querySelector('.diss-learning-check__answer').textContent);
      const before = checkpointCoachingWorkProof(fixture.state);
      const coaching = 'Look for the recommended view, planned route, and protected landmarks before contact.';
      choices[1].focus();
      await clickEvidenceControl(choices[1]);
      expect(document.activeElement).toBe(choices[1]);
      expect(panel.querySelectorAll('.diss-learning-check__option')[1]).toBe(choices[1]);
      const firstFeedback = expectSelectedCoaching(panel, choices[1], 'diss-learning-check-feedback', coaching);
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect).toMatchObject({ predictionChoice: 'deep-view', predictionCorrect: false, predictionAttempts: 1 });
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      choices[2].focus();
      await clickEvidenceControl(choices[2]);
      expect(document.activeElement).toBe(choices[2]);
      expect(firstFeedback.isConnected).toBe(false);
      expectSelectedCoaching(panel, choices[2], 'diss-learning-check-feedback', coaching);
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect).toMatchObject({ predictionChoice: 'tool-first', predictionCorrect: false, predictionAttempts: 2 });
      expect(choices.map((choice) => choice.querySelector('.diss-learning-check__answer').textContent)).toEqual(answerText);
      const beforeBrowsing = JSON.parse(JSON.stringify(fixture.state.procedureByLayer));
      await act(async () => { choices[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })); });
      expect(document.activeElement).toBe(choices[1]);
      expect(fixture.state.procedureByLayer).toEqual(beforeBrowsing);
      expectSelectedCoaching(panel, choices[2], 'diss-learning-check-feedback', coaching);
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      choices[0].focus();
      await clickEvidenceControl(choices[0]);
      expect(panel.getAttribute('data-phase')).toBe('perform');
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-learning-check-title'));
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect).toMatchObject({ predictionChoice: 'confirm-route', predictionCorrect: true, predictionAttempts: 3 });
      const confirmed = panel.querySelector('#diss-learning-check-feedback');
      expect(panel.querySelectorAll('#diss-learning-check-feedback')).toHaveLength(1);
      expect(confirmed.getAttribute('data-result')).toBe('correct');
      expect(confirmed.closest('.diss-learning-check__choice')).toBeNull();
      expect(confirmed.textContent).toContain('Plan confirmed.');
      expect(confirmed.textContent).not.toContain('Try another choice.');
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('checkpoint coaching keeps reflection feedback beside the chosen answer until native verification', async () => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState(checkpointCoachingProcedure({
      inspected: true, history: ['inspect'],
      learningChecks: { inspect: { predictionChoice: 'confirm-route', predictionCorrect: true, reflectionCorrect: false } },
    })));
    try {
      const panel = fixture.host.querySelector('#diss-learning-checkpoint');
      const choices = Array.from(panel.querySelectorAll('.diss-learning-check__option'));
      const before = checkpointCoachingWorkProof(fixture.state);
      choices[0].focus();
      await clickEvidenceControl(choices[0]);
      expect(document.activeElement).toBe(choices[0]);
      expectSelectedCoaching(panel, choices[0], 'diss-learning-check-feedback', 'Base the conclusion on view alignment and identifiable landmarks, not tool selection.');
      expect(panel.getAttribute('data-phase')).toBe('reflect');
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect).toMatchObject({ reflectionChoice: 'largest-area', reflectionCorrect: false, reflectionAttempts: 1 });
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      choices[1].focus();
      await clickEvidenceControl(choices[1]);
      expect(panel.getAttribute('data-phase')).toBe('predict');
      expect(panel.getAttribute('data-learning-action')).toBe('scalpel');
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-learning-check-title'));
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect).toMatchObject({ reflectionChoice: 'aligned-landmarks', reflectionCorrect: true, reflectionAttempts: 2 });
      expect(panel.querySelector('#diss-learning-check-feedback')).toBeNull();
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  function checkpointCoachingGuidedState(feedback) {
    return techniqueRoadmapState(checkpointCoachingProcedure(), {
      guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin', 'tympanum'],
      guidedObservationPending: 'ventral_skin', guidedObservationFeedback: feedback,
    });
  }

  function guidedEvidenceChoices(panel) {
    const all = Array.from(panel.querySelectorAll('.diss-learning-check__option'));
    const correct = all.find(choice => choice.querySelector('.diss-learning-check__answer').textContent.includes('Lighter, thinner ventral surface'));
    expect(correct, 'the ventral-skin observation is present').toBeTruthy();
    return { all, correct, wrong: all.filter(choice => choice !== correct) };
  }

  it('checkpoint coaching supports Guided retries without granting identification credit', async () => {
    const fixture = await mountMarkingFixture(checkpointCoachingGuidedState(null));
    try {
      const panel = fixture.host.querySelector('#diss-guided-observation-check');
      const { all: choices, correct, wrong } = guidedEvidenceChoices(panel);
      expect(choices).toHaveLength(3);
      const before = checkpointCoachingWorkProof(fixture.state);
      const coaching = 'That observation belongs to a different structure. Compare position, tissue appearance, and function, then try again.';
      wrong[0].focus();
      await clickEvidenceControl(wrong[0]);
      expect(document.activeElement).toBe(wrong[0]);
      const firstFeedback = expectSelectedCoaching(panel, wrong[0], 'diss-guided-observation-feedback', coaching);
      expect(fixture.state.guidedStep).toBe(0);
      expect(fixture.state.guidedObservationPending).toBe('ventral_skin');
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      wrong[1].focus();
      await clickEvidenceControl(wrong[1]);
      expect(document.activeElement).toBe(wrong[1]);
      expect(firstFeedback.isConnected).toBe(false);
      expectSelectedCoaching(panel, wrong[1], 'diss-guided-observation-feedback', coaching);
      const beforeBrowsing = JSON.parse(JSON.stringify(fixture.state.guidedObservationFeedback));
      await act(async () => { wrong[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })); });
      expect(document.activeElement).toBe(choices[0]);
      expect(fixture.state.guidedObservationFeedback).toEqual(beforeBrowsing);
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
      await clickEvidenceControl(correct);
      expect(fixture.host.querySelector('#diss-guided-observation-check')).toBeNull();
      expect(fixture.host.querySelector('#diss-guided-observation-feedback')).toBeNull();
      expect(document.activeElement).toBe(fixture.host.querySelector('#diss-canvas'));
      expect(fixture.state.guidedStep).toBe(1);
      expect(fixture.state.guidedObservationPending).toBeNull();
      expect(fixture.state.verifiedIdentifications['frog|ventral_skin'].status).toBe('verified');
      const after = checkpointCoachingWorkProof(fixture.state);
      expect({ ...after, selectedOrgan: before.selectedOrgan, verifiedIdentifications: before.verifiedIdentifications }).toEqual(before);
      expect(fixture.awardXP).toHaveBeenCalledTimes(1);
    } finally { await fixture.close(); }
  });

  it.each([
    ['missing', undefined],
    ['obsolete', 'retired-choice'],
  ])('checkpoint coaching retains saved feedback for a %s plan choice without inventing a selected answer', async (_case, savedChoice) => {
    const savedFeedback = 'Review the saved orientation response before trying again.';
    const fixture = await mountMarkingFixture(techniqueRoadmapState(checkpointCoachingProcedure({
      learningChecks: { inspect: { predictionChoice: savedChoice, predictionCorrect: false, predictionFeedback: savedFeedback } },
    })));
    try {
      const panel = fixture.host.querySelector('#diss-learning-checkpoint');
      const before = checkpointCoachingWorkProof(fixture.state);
      const feedback = panel.querySelector('#diss-learning-check-feedback');
      expect(panel.querySelectorAll('#diss-learning-check-feedback')).toHaveLength(1);
      expect(feedback.textContent).toContain(savedFeedback);
      expect(feedback.closest('.diss-learning-check__choice')).toBeNull();
      expect(panel.querySelector('.diss-learning-check__option[aria-pressed="true"]')).toBeNull();
      expect(panel.querySelector('.diss-learning-check__option[aria-describedby]')).toBeNull();
      const correct = panel.querySelector('.diss-learning-check__option');
      await clickEvidenceControl(correct);
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect).toMatchObject({ predictionChoice: 'confirm-route', predictionCorrect: true, predictionAttempts: 1 });
      expect(panel.getAttribute('data-phase')).toBe('perform');
      expect(panel.querySelectorAll('#diss-learning-check-feedback')).toHaveLength(1);
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it.each([
    ['empty', ''],
    ['non-string', { unsupported: true }],
  ])('checkpoint coaching leaves no dangling description for %s saved planning feedback', async (_case, savedFeedback) => {
    const fixture = await mountMarkingFixture(techniqueRoadmapState(checkpointCoachingProcedure({
      learningChecks: { inspect: { predictionChoice: 'deep-view', predictionCorrect: false, predictionFeedback: savedFeedback } },
    })));
    try {
      const panel = fixture.host.querySelector('#diss-learning-checkpoint');
      const before = checkpointCoachingWorkProof(fixture.state);
      const choice = panel.querySelectorAll('.diss-learning-check__option')[1];
      expect(choice.getAttribute('aria-pressed')).toBe('true');
      expect(choice.hasAttribute('aria-describedby')).toBe(false);
      expect(panel.querySelector('#diss-learning-check-feedback')).toBeNull();
      choice.focus();
      await clickEvidenceControl(choice);
      expect(document.activeElement).toBe(choice);
      expectSelectedCoaching(panel, choice, 'diss-learning-check-feedback', 'Look for the recommended view, planned route, and protected landmarks before contact.');
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect.predictionAttempts).toBe(1);
      expect(fixture.state.procedureByLayer.skin.learningChecks.inspect.predictionCorrect).toBe(false);
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('checkpoint coaching retains unmatched Guided feedback until a native response is selected', async () => {
    const savedFeedback = 'Review the previous observation against the current specimen.';
    const fixture = await mountMarkingFixture(checkpointCoachingGuidedState({ correct: false, choiceId: 'retired-structure', message: savedFeedback }));
    try {
      const panel = fixture.host.querySelector('#diss-guided-observation-check');
      const before = checkpointCoachingWorkProof(fixture.state);
      const feedback = panel.querySelector('#diss-guided-observation-feedback');
      expect(panel.querySelectorAll('#diss-guided-observation-feedback')).toHaveLength(1);
      expect(feedback.textContent).toContain(savedFeedback);
      expect(feedback.closest('.diss-learning-check__choice')).toBeNull();
      expect(panel.querySelector('.diss-learning-check__option[aria-describedby]')).toBeNull();
      const wrong = guidedEvidenceChoices(panel).wrong[0];
      wrong.focus();
      await clickEvidenceControl(wrong);
      expect(document.activeElement).toBe(wrong);
      expect(feedback.isConnected).toBe(false);
      expectSelectedCoaching(panel, wrong, 'diss-guided-observation-feedback', 'That observation belongs to a different structure.');
      expect(fixture.state.guidedStep).toBe(0);
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it.each([
    ['empty', ''],
    ['non-string', { unsupported: true }],
  ])('checkpoint coaching leaves no dangling description for %s Guided feedback', async (_case, savedFeedback) => {
    const fixture = await mountMarkingFixture(checkpointCoachingGuidedState({ correct: false, choiceId: 'ventral_skin', message: savedFeedback }));
    try {
      const panel = fixture.host.querySelector('#diss-guided-observation-check');
      const before = checkpointCoachingWorkProof(fixture.state);
      const { correct, wrong } = guidedEvidenceChoices(panel);
      expect(correct.getAttribute('aria-pressed')).toBe('true');
      expect(correct.hasAttribute('aria-describedby')).toBe(false);
      expect(panel.querySelector('#diss-guided-observation-feedback')).toBeNull();
      wrong[0].focus();
      await clickEvidenceControl(wrong[0]);
      expect(document.activeElement).toBe(wrong[0]);
      expectSelectedCoaching(panel, wrong[0], 'diss-guided-observation-feedback', 'That observation belongs to a different structure.');
      expect(fixture.state.guidedStep).toBe(0);
      expect(fixture.state.guidedObservationPending).toBe('ventral_skin');
      expect(checkpointCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });


  // Adaptive advice navigates to the controls the learner needs without
  // performing a technique, changing calibration, or supplying an answer.
  const adaptiveCoachingMetrics = { alignment: 95, coverage: 95, angleControl: 95, control: 95, precision: 95, smoothness: 95 };

  function adaptiveCoachingProcedure(patch = {}, tissuePatch = {}) {
    const base = checkpointCoachingProcedure();
    return { ...base, ...patch, tissueState: { ...base.tissueState, ...tissuePatch } };
  }

  function adaptiveCoachingFixtureState(procedure, patch = {}) {
    return techniqueRoadmapState(procedure, {
      procedureMode: 'independent', activeInstrument: 'scalpel',
      adaptiveGuidance: true, instructorTarget: 82,
      toolbarViewOpen: false, compareTechniqueAttempts: false,
      procedureFeedback: { message: 'Keep this recorded feedback.', tone: 'working' },
      ...patch,
    });
  }

  function adaptiveCoachingWorkProof(state) {
    const { techniquePanelOpen, toolbarViewOpen, compareTechniqueAttempts, ...work } = state;
    return JSON.parse(JSON.stringify(work));
  }

  function adaptiveCoachingAction(fixture, focus, label, target, mounted = true) {
    const panel = fixture.host.querySelector('#diss-adaptive-coaching');
    expect(panel).not.toBeNull();
    expect(panel.getAttribute('aria-labelledby')).toBe('diss-adaptive-coaching-title');
    expect(panel.querySelector('#diss-adaptive-coaching-title').textContent).toBe(focus);
    const button = panel.querySelector('button');
    expect(button.textContent).toBe(label);
    expect(button.getAttribute('aria-controls')).toBe(mounted ? target : null);
    const describedIds = button.getAttribute('aria-describedby').split(/\s+/);
    expect(describedIds).toEqual(['diss-adaptive-coaching-suggestion', 'diss-adaptive-coaching-help']);
    for (const id of describedIds) expect(fixture.host.querySelectorAll('[id="' + id + '"]')).toHaveLength(1);
    expect(panel.querySelector('#diss-adaptive-coaching-help').textContent).toBe('Opens controls for review.');
    return button;
  }

  it.each([
    ['dry field', {}, { moisture: 25 }, {}, 'Surface moisture', 'Review Dropper', 'diss-instrument-dropper'],
    ['restricted dry field', {}, { moisture: 25 }, { procedureScenario: 'restricted-tray' }, 'Surface moisture', 'Review tissue condition', 'diss-field-monitor-summary'],
    ['tissue trauma', {}, { trauma: 48 }, {}, 'Tissue preservation', 'Review tissue condition', 'diss-field-monitor-summary'],
    ['high tension', {}, { tension: 90 }, {}, 'Retraction tension', 'Review tissue condition', 'diss-field-monitor-summary'],
    ['recorded safety caution', { cautionLog: [{ message: 'Verify the corridor before further contact.', at: 100 }] }, {}, {}, 'Safety sequence', 'Review technique controls', 'diss-procedure-summary'],
    ['orientation', {}, {}, {}, 'Orientation', 'Review technique controls', 'diss-procedure-summary'],
    ['low field quality', { incisionMetrics: adaptiveCoachingMetrics }, { clarity: 20, exposure: 20, stability: 30 }, {}, 'Access width', 'Review tissue condition', 'diss-field-monitor-summary'],
  ])('adaptive coaching reviews %s without changing learner work or selecting an instrument', async (_case, procedurePatch, tissuePatch, statePatch, focus, label, targetId) => {
    const fixture = await mountMarkingFixture(adaptiveCoachingFixtureState(adaptiveCoachingProcedure(procedurePatch, tissuePatch), statePatch));
    try {
      const action = adaptiveCoachingAction(fixture, focus, label, targetId);
      const before = adaptiveCoachingWorkProof(fixture.state);
      if (_case === 'restricted dry field') {
        expect(fixture.host.querySelector('#diss-instrument-dropper').disabled).toBe(true);
        expect(fixture.host.querySelector('#diss-adaptive-coaching-suggestion').textContent).toContain('Hydration tools are unavailable');
      }
      action.focus();
      await clickEvidenceControl(action);
      const target = fixture.host.querySelector('#' + targetId);
      expect(document.activeElement).toBe(target);
      expect(fixture.state.techniquePanelOpen).toBe(true);
      if (targetId === 'diss-field-monitor-summary') expect(target.closest('details').open).toBe(true);
      if (targetId === 'diss-instrument-dropper') expect(target.getAttribute('aria-checked')).toBe('false');
      expect(fixture.state.toolbarViewOpen).toBe(false);
      expect(fixture.state.compareTechniqueAttempts).toBe(false);
      expect(adaptiveCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('adaptive coaching opens optical controls without changing the inspected target or focus settings', async () => {
    const procedure = adaptiveCoachingProcedure({ incisionMetrics: adaptiveCoachingMetrics });
    const fixture = await mountMarkingFixture(adaptiveCoachingFixtureState(procedure, {
      selectedOrgan: 'ventral_skin', inspectionLens: true, lensPinned: false,
      lensFocusDepth: 'deep', lensMagnification: 6,
    }));
    try {
      const action = adaptiveCoachingAction(fixture, 'Optical focus', 'Review view controls', 'diss-view-tools', false);
      expect(fixture.host.querySelector('#diss-view-tools')).toBeNull();
      const before = adaptiveCoachingWorkProof(fixture.state);
      await clickEvidenceControl(action);
      const viewControls = fixture.host.querySelector('#diss-view-tools');
      expect(document.activeElement).toBe(viewControls);
      expect(fixture.state.toolbarViewOpen).toBe(true);
      expect(fixture.state.compareTechniqueAttempts).toBe(false);
      adaptiveCoachingAction(fixture, 'Optical focus', 'Review view controls', 'diss-view-tools');
      expect(adaptiveCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('adaptive coaching reviews the next instrument without applying calibration or changing the selected tool', async () => {
    const procedure = adaptiveCoachingProcedure({
      ...actionHandoffProcedure('scissors'), incisionMetrics: adaptiveCoachingMetrics,
    });
    const fixture = await mountMarkingFixture(adaptiveCoachingFixtureState(procedure, {
      toolCalibration: { bladeAngle: 25, scissorsAperture: 70, forcepsGrip: 40, pinAngle: 65, probePressure: 30, salineDose: 1 },
    }));
    try {
      const action = adaptiveCoachingAction(fixture, 'Instrument calibration', 'Review Scissors', 'diss-instrument-scissors');
      const before = adaptiveCoachingWorkProof(fixture.state);
      await clickEvidenceControl(action);
      const scissors = fixture.host.querySelector('#diss-instrument-scissors');
      expect(document.activeElement).toBe(scissors);
      expect(scissors.getAttribute('aria-checked')).toBe('false');
      expect(fixture.state.activeInstrument).toBe('scalpel');
      expect(fixture.state.toolCalibration.scissorsAperture).toBe(70);
      expect(adaptiveCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });

  it('adaptive coaching reveals saved comparison without starting playback or replacing the baseline', async () => {
    const procedure = adaptiveCoachingProcedure({ incisionMetrics: adaptiveCoachingMetrics });
    const fixture = await mountMarkingFixture(adaptiveCoachingFixtureState(procedure, {
      compareReplayProgress: 0.37, compareReplayPlaying: false,
      attemptArchive: { skin: [{ id: 7, score: 100, precision: 90, coverage: 90, control: 90, angleControl: 90, cautions: 0, view: 'ventral', inputType: 'mouse', incisionPath: [{ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.6 }] }] },
    }));
    try {
      const action = adaptiveCoachingAction(fixture, 'Strategy change', 'Review saved comparison', 'diss-compare-replay-progress', false);
      expect(fixture.host.querySelector('#diss-compare-replay-progress')).toBeNull();
      const before = adaptiveCoachingWorkProof(fixture.state);
      await clickEvidenceControl(action);
      const replay = fixture.host.querySelector('#diss-compare-replay-progress');
      expect(document.activeElement).toBe(replay);
      expect(fixture.state.compareTechniqueAttempts).toBe(true);
      expect(fixture.state.techniquePanelOpen).toBe(true);
      expect(fixture.state.toolbarViewOpen).toBe(false);
      adaptiveCoachingAction(fixture, 'Strategy change', 'Review saved comparison', 'diss-compare-replay-progress');
      expect(adaptiveCoachingWorkProof(fixture.state)).toEqual(before);
      expect(fixture.awardXP).not.toHaveBeenCalled();
    } finally { await fixture.close(); }
  });
});
