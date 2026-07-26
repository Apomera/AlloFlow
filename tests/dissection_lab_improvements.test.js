import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const DISSECTION_PATHS = [
  'stem_lab/stem_tool_dissection.js',
  'desktop/web-app/public/stem_lab/stem_tool_dissection.js',
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
      expect(source).toContain('var focusMuted = (focusMode || (denseHotspotView && d.selectedOrgan))');
      expect(source).toContain('focusEntryProgress = 1 - Math.pow');
      expect(source).toContain('Nearest-target hit testing also treats laid-out labels as interactive targets.');
      expect(source).toContain('function closestVisibleOrganAt(x, y, radius)');
      expect(source).toContain('canvas._hotspotLabelBoxes || []');
      expect(source).toContain('Adaptive hotspot labels share collision-aware columns and remain clickable.');
      expect(source).toContain("var denseHotspotView = d.labelMode !== 'hidden' && organs.length >= 8 && zoom < 1.22");
      expect(source).toContain('function resolveAdaptiveLabelColumn(items, minY, maxY)');
      expect(source).toContain('canvas._hotspotLabelBoxes = adaptiveHotspotLayout.map');
      expect(source).toContain('Reticle marks make selected state readable without color alone.');
      expect(source).toContain("'Adaptive labels \\u00B7 ' + compactHotspotCount + ' compact \\u00B7 hover to expand'");
      expect(source).toContain('var hit = closestVisibleOrganAt(mx, my, clickHitRadius);');
      expect(source).toContain('var hit = closestVisibleOrganAt(mx, my, hoverHitRadius);');
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
      expect(source).toContain("PROCEDURE_INSTRUMENTS.push({ id: 'dropper'");
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
      expect(source).toContain("var probeLabel = 'Trace recorded';");      expect(source).toContain('ann.prevX * W');
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
