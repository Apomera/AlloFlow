import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import axe from 'axe-core';
import { setupDinoLab, renderTab, baseData } from './helpers/dino_lab_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));

// Full WCAG axe scans over the larger DinoLab panels are CPU-heavy. They pass
// in well under this budget in isolation, but need headroom under full-suite
// parallel load so a slow worker does not turn a clean audit into a timeout.
const AXE_AUDIT_TIMEOUT_MS = 90000;

describe('Dino Lab 3D Field Station accessibility contract', () => {
  it('supports focused keyboard rotation with live status and cleanup', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_dinolab.js'), 'utf8');
    expect(source).toContain("tabIndex: 0, role: 'application'");
    expect(source).toContain("'aria-roledescription': 'Interactive 3D dinosaur reconstruction'");
    expect(source).toContain("'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown PageUp PageDown A D Home'");
    expect(source).toContain("key === 'ArrowLeft'");
    expect(source).toContain("key === 'ArrowRight'");
    expect(source).toContain("key === 'ArrowUp'");
    expect(source).toContain("key === 'ArrowDown'");
    expect(source).toContain("key === 'PageUp'");
    expect(source).toContain("key === 'PageDown'");
    expect(source).toContain("key === 'Home'");
    expect(source).toContain("canvas.addEventListener('keydown', keyDown)");
    expect(source).toContain("canvas.addEventListener('wheel', wheelZoom, { passive: false })");
    expect(source).toContain("canvas.removeEventListener('wheel', wheelZoom)");
    expect(source).toContain("canvas.removeEventListener('keydown', keyDown)");
    expect(source).toContain('try { canvas.focus(); }');
    expect(source).toContain("outline: canvasFocused ? '3px solid #5eead4' : 'none'");
    expect(source).toContain('Reconstruction returned to its starting view.');
    expect(source).toContain("ref: statusRef, className: 'dinolab-3d-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(source).toContain("'aria-describedby': viewerDescId + ' ' + statusId");
    expect(source).toContain("var viewerSummary = props.species.common + ' 3D model summary.");
    expect(source).toContain("Visible layers: ' + layerSummary");
    expect(source).toContain("Keyboard controls: Left and Right Arrow or A and D rotate; Up and Down Arrow raise or lower the camera; Page Up and Page Down zoom; Home resets the view.");
    expect(source).toContain("if (!reducedMotion && scanPulse)");
    expect(source).toContain("if (!reducedMotion && assemblyPulse)");
    expect(source).toContain("if (!reducedMotion && claimEvidencePulse)");
    expect(source).toContain("if (!reducedMotion) loggedRings.forEach");
    expect(source).toContain("role: 'progressbar', 'aria-label': 'Fossil assembly progress'");
    expect(source).toContain("role: 'progressbar', 'aria-label': 'Claim strength'");
    expect(source).toContain("role: 'progressbar', 'aria-label': 'Reconstruction challenge progress'");
    expect(source).toContain("scanStatusText = 'Evidence log '");
    expect(source).toContain("assemblyProgressText = 'Assembly '");
    expect(source).toContain("claimReadinessText = 'Claim strength '");
    expect(source).toContain("'aria-label': target.label + ' scan anchor");
    expect(source).toContain("'aria-label': piece.label + ' fossil");
    expect(source).toContain('var DinoFieldStation3DStable = null;');
    expect(source).toContain('if (!DinoFieldStation3DStable) DinoFieldStation3DStable = DinoFieldStation3D;');
    expect(source).toContain('el(DinoFieldStation3DStable, { species: dn, focusMode: focusMode, reconstructionMode: activeHypothesis.id,');
    expect(source).toContain("var focusMode = d.field3dFocusMode === true;");
    expect(source).toContain("else if (focusMode) { e.preventDefault(); toggleFieldFocus(); }");
    expect(source).toContain("'aria-keyshortcuts': focusMode ? 'Escape' : null");
    expect(source).toContain("hidden: !drawerOpen || focusMode");
    expect(source).toContain("props.focusMode ? 'clamp(620px, 76vh, 920px)' : 'clamp(520px, 62vh, 760px)'");
    expect(source).toContain("key.field3dFocusMode = false;");
    expect(source).toContain('function reconstructionHypothesesFor(dn, skeletalProfile, requestedMode)');
    expect(source).toContain("var fieldFocusActive = tab === 'field3d' && d.field3dFocusMode === true;");
    expect(source).toContain('fieldFocusActive ? null : tabNavigation');
    expect(source).toContain("'aria-labelledby': fieldFocusActive ? null : 'dinotab-' + tab");
    expect(source).toContain("role: fieldFocusActive ? 'region' : 'tabpanel'");
    expect(source).toContain('padding: fieldFocusActive ? 10 : 16');
    expect(source).toContain('function openSpeciesFile()');
    expect(source).toContain("field3dDrawerOpen: false, field3dFocusMode: false");
    expect(source).toContain("className: 'dinolab-field-toolbar-actions', role: 'group', 'aria-label': '3D model view controls'");
    expect(source).toContain("id: 'dinolab-field-species-file'");
    expect(source).toContain('grid-template-columns:repeat(auto-fit,minmax(108px,1fr))');
    expect(source).toContain('function workflowStepAvailable(step)');
    expect(source).toContain('function openWorkflowStep(step)');
    expect(source).toContain("if (step === 'assemble') return scanComplete;");
    expect(source).toContain("if (step === 'claim') return assemblyComplete;");
    expect(source).toContain("disabled: !available, 'aria-current': current ? 'step' : null");
    expect(source).toContain("'aria-label': 'Step ' + (index + 1) + ' ' + cap(step) + ', ' + state");
    expect(source).toContain("id: 'evidence'");
    expect(source).toContain('function fieldDrawerSectionAvailable(section)');
    expect(source).toContain('var drawerSection = fieldDrawerSectionAvailable(requestedDrawerSection)');
    expect(source).toContain("disabled: !available, 'aria-pressed': active ? 'true' : 'false'");
    expect(source).toContain('function focusFieldControlSoon(id)');
    expect(source).toContain('function currentFieldOpenerId()');
    expect(source).toContain("updates.field3dDrawerReturnFocusId = currentFieldOpenerId()");
    expect(source).toContain("focusFieldControlSoon('dinolab-field-drawer-close')");
    expect(source).toContain("var returnFocusId = d.field3dDrawerReturnFocusId || 'dinolab-field-tools-toggle'");
    expect(source).toContain("if (drawerOpen) { e.preventDefault(); closeFieldDrawer(); }");
    expect(source).toContain("'aria-labelledby': 'dinolab-field-drawer-title'");
    expect(source).toContain("'aria-keyshortcuts': 'Escape'");

    const evidenceDrawerStart = source.indexOf("el('div', { hidden: drawerSection !== 'evidence' }");
    const challengeDisclosure = source.indexOf("'Reconstruction challenge'), challengePanel", evidenceDrawerStart);
    const modelDrawerStart = source.indexOf("el('div', { hidden: drawerSection !== 'reconstruct' }");
    const anatomyDisclosure = source.indexOf("'Scientific anatomy profile'), anatomyProfilePanel", modelDrawerStart);
    const visualKeyDisclosure = source.indexOf("'Visual key'), visualKeyPanel", modelDrawerStart);
    expect(evidenceDrawerStart).toBeGreaterThan(-1);
    expect(challengeDisclosure).toBeGreaterThan(evidenceDrawerStart);
    expect(challengeDisclosure).toBeLessThan(modelDrawerStart);
    expect(modelDrawerStart).toBeGreaterThan(-1);
    expect(anatomyDisclosure).toBeGreaterThan(modelDrawerStart);
    expect(visualKeyDisclosure).toBeGreaterThan(modelDrawerStart);
    expect(source).toContain("id: 'conservative'");
    expect(source).toContain("id: 'classic'");
    expect(source).toContain("id: 'avian'");
    expect(source).toContain("label: 'Historical classic'");
    expect(source).toContain("status: directFeatherEvidence ? 'Contradicted historical model' : 'Historical comparison'");
    expect(source).toContain("status: avianEligible ? (directFeatherEvidence ? 'Evidence-compatible' : 'Phylogenetic hypothesis') : 'Not supported for this clade'");
    expect(source).toContain("var requestedReconstructionMode = d.field3dReconstructionMode || 'evidence';");
    expect(source).toContain("role: 'group', 'aria-label': 'Reconstruction hypothesis'");
    expect(source).toContain('Invariant across modes: skeleton, articulation, pose, measurements, evidence anchors, and scientific anatomy profile.');
    expect(source).toContain('props.reconstructionMode, props.showSkeleton');
    expect(source).toContain('var surfaceBodyHeight = bodyHeight * surfaceHypothesis.bodyHeightScale;');
    expect(source).toContain('var surfaceBodyDepth = bodyDepth * surfaceHypothesis.bodyDepthScale;');
    expect(source).toContain('var yawRef = React.useRef({ speciesId: props.species.id, value: -0.35, pitch: 0.18, zoom: 1 });');
    expect(source).toContain('var autoRotateRef = React.useRef(props.autoRotate);');
    expect(source).toContain('var readySpeciesRef = React.useRef(null);');
    expect(source).toContain('autoRotateRef.current = props.autoRotate;');
    expect(source).toContain('yawRef.current.value = yaw;');
    expect(source).toContain('yawRef.current.pitch = pitch;');
    expect(source).toContain('yawRef.current.zoom = zoom;');
    expect(source).toContain('function updateCameraView()');
    expect(source).toContain('var cameraReadoutRef = React.useRef(null);');
    expect(source).toContain('var sceneRef = React.useRef(null);');
    expect(source).toContain('var cameraRef = React.useRef(null);');
    expect(source).toContain('var rendererRef = React.useRef(null);');
    expect(source).toContain('var cameraControlRef = React.useRef(null);');
    expect(source).toContain('var visualMaterialsRef = React.useRef(null);');
    expect(source).toContain('var bodyOpacityRef = React.useRef(28);');
    expect(source).toContain('activeCameraControl = function (nextYaw, nextPitch, nextZoom, message)');
    expect(source).toContain('cameraControlRef.current(view.yaw, view.pitch, view.zoom, view.message);');
    expect(source).toContain('materials.body.opacity = alpha;');
    expect(source).toContain("'aria-label': 'Body inference opacity'");
    expect(source).toContain("className: 'dinolab-3d-view-controls'");
    expect(source).toContain('var previousSceneChildren = scene.children.slice();');
    expect(source).toContain('renderer = rendererRef.current;');
    expect(source).toContain('rendererRef.current = renderer;');
    expect(source).toContain('var mountedScene = sceneRef.current;');
    expect(source).toContain('var measurementIntervalLabels = [];');
    expect(source).toContain('label.visible = w >= 560');
    expect(source).toContain("className: 'dinolab-3d-canvas'");
    expect(source).toContain('function reconstructionProfileFor(dn)');
    expect(source).toContain('function skeletalAnatomyProfileFor(dn)');
    expect(source).toContain("profile.label = 'Toothless ornithomimid runner'");
    expect(source).toContain("profile.label = 'Toothless oviraptorosaur'");
    expect(source).toContain('profile.manualDigits = isBasalTyrannosauroid ? 3 : 2;');
    expect(source).toContain('profile.manualDigits = 1;');
    expect(source).toContain('profile.gastralia = /Heterodontosaur/i.test(clade);');
    expect(source).toContain('profile.manualUnguals = /Titanosaur/i.test(clade) ? 0 : 1;');
    expect(source).toContain("profile.coverage = 'limited'");
    expect(source).toContain('function updateCameraReadout()');
    expect(source).toContain("'aria-label': 'Current 3D camera view'");
    expect(source).toContain('new THREE.CanvasTexture(skyCanvas)');
    expect(source).toContain('renderer.outputEncoding = THREE.sRGBEncoding;');
    expect(source).toContain('renderer.toneMapping = THREE.ACESFilmicToneMapping;');
    expect(source).toContain('sun.shadow.mapSize.width = 1024;');
    expect(source).toContain('scene.background.dispose();');
    expect(source).toContain("var contactShadowCanvas = document.createElement('canvas');");
    expect(source).toContain('contactShadowContext.createRadialGradient(64, 64, 8, 64, 64, 62)');
    expect(source).toContain('function addAnatomyCallout(label, anchor, offset)');
    expect(source).toContain("addAnatomyCallout('Skull', head");
    expect(source).toContain("addAnatomyCallout('Tail', tailCalloutPoint");
    expect(source).toContain('function addSoftTissueCylinder(a, b, startRadius, endRadius, mat)');
    expect(source).toContain('function addBodyContour(mesh)');
    expect(source).toContain('wireframe: true, depthWrite: false');
    expect(source).toContain('var neckShell = addSoftTissueCylinder(shoulder, head');
    expect(source).toContain('addSoftTissueCylinder(armStart, elbow');
    expect(source).toContain('function addTextLabel(text, pos, color, scaleFactor, parent)');
    expect(source).toContain('(parent || model).add(sprite);');
    expect(source).toContain("addTextLabel(rt + ' m'");
    expect(source).toContain('addTextLabel(fmtLength(dn.lengthM)');
    expect(source).toContain('addTextLabel(fmtLength(dn.heightM)');
    expect(source).toContain('3D evidence view updated. Camera view preserved.');
    expect(source).toContain("touchAction: 'none'");
    expect(source).toContain("'Species anatomy cues'");
    expect(source).toContain('They are diagram cues, not specimen scans.');
    expect(source).not.toContain('props.dietColor, props.autoRotate, props.scanTarget');
    expect(source).toContain('new THREE.HemisphereLight(0xc8e4f0, 0x514631, 0.76)');
    expect(source).toContain('var naturalDietPalette = {');
    expect(source).toContain("var groundCanvas = document.createElement('canvas');");
    expect(source).toContain('new THREE.DodecahedronGeometry(rockSize, 0)');
    expect(source).toContain("var skinCanvas = document.createElement('canvas');");
    expect(source).toContain('roughness: 0.82, metalness: 0');
    expect(source).toContain('var muzzleShell = addSoftTissueCylinder(head, snout');
    expect(source).toContain('var faceScale = reconstructionProfile.head;');
    expect(source).toContain('var surveyCorners = [');
    expect(source).toContain('var compassCenter = vec(');
    expect(source).toContain('var compassRing = new THREE.Mesh(new THREE.TorusGeometry');
    expect(source).toContain("'Survey compass'");
    expect(source).toContain('var heightGuideMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });');
    expect(source).toContain("'Height guide'");
    expect(source).toContain('one-meter ticks');
    expect(source).toContain('var intersectionObserver = null;');
    expect(source).toContain("document.addEventListener('visibilitychange', visibilityChanged)");
    expect(source).toContain('new window.IntersectionObserver(function (entries)');
    expect(source).toContain('if (inViewport && pageVisible)');
    expect(source).toContain('intersectionObserver.disconnect()');
    expect(source).toContain("if (/Ceratops/i.test(cladeName))");
    expect(source).toContain("else if (/Stegosaur/i.test(cladeName))");
    expect(source).toContain("else if (/Spinosaur/i.test(cladeName))");
    expect(source).toContain("else if (/Ankylosaur/i.test(cladeName))");
    expect(source).toContain("else if (/Pachycephalosaur/i.test(cladeName))");
    expect(source).toContain("else if (/Therizinosaur/i.test(cladeName))");
    expect(source).toContain('if (isPennaraptoran) {');
    expect(source).toContain("else if (/Tyrannosaur/i.test(cladeName))");
    expect(source).toContain("else if (/Abelisaur/i.test(cladeName))");
    expect(source).toContain("else if (/Oviraptor/i.test(cladeName))");
    expect(source).toContain("else if (/Iguanodont/i.test(cladeName))");
    expect(source).toContain('var tyrantSnout = new THREE.Vector3().copy(head).lerp(snout, 0.60);');
    expect(source).toContain('var oviraptorCrest = addAccentCone');
    expect(source).toContain('var thumbBase = vec(');
    expect(source).toContain('var ribCount = isSauropod ? 10 : 9;');
    expect(source).toContain("ribHeadDetail: group !== 'other'");
    expect(source).toContain('function addCurvedBone(points, startRadius, endRadius, mat)');
    expect(source).toContain('var capitulumFacet = ribSpine.clone()');
    expect(source).toContain('var tuberculumFacet = ribSpine.clone()');
    expect(source).toContain('addCurvedBone([ribNeck, ribUpper, ribLateral, ribLower, ribVentral]');
    expect(source).toContain("uncinateProcesses: /Oviraptor|Caenagnath|Dromaeosaur|Avialae/i.test(clade)");
    expect(source).toContain('if (skeletalProfile.uncinateProcesses && ribIndex >= 1');
    expect(source).toContain('var uncinateBase = new THREE.Vector3()');
    expect(source).toContain('var pelvisHalf = Math.max(');
    expect(source).toContain("girdleDetail: group !== 'other'");
    expect(source).toContain('function addGirdleBlade(a, b, width, thickness, mat)');
    expect(source).toContain('var scapulaMid = shoulder.clone()');
    expect(source).toContain('var glenoidRim = new THREE.Mesh(new THREE.TorusGeometry');
    expect(source).toContain('var coracoidForamen = addSkeletonEllipsoid');
    expect(source).toContain('var iliumCrown = hip.clone()');
    expect(source).toContain('var acetabularRim = new THREE.Mesh(new THREE.TorusGeometry');
    expect(source).toContain('var obturatorProcess = new THREE.Vector3()');
    expect(source).toContain('function addSkeletonEllipsoid(pos, scale, mat)');
    expect(source).toContain('function addSkeletonCone(base, tip, radius, mat)');
    expect(source).toContain("longBoneDetail: group !== 'other'");
    expect(source).toContain('longBoneBow: isSauropod ? 0.003');
    expect(source).toContain('function addTaperedBoneSegment(a, b, startRadius, endRadius, mat)');
    expect(source).toContain('function addLongBone(a, b, radius, bowAmount, bowSide, proximalScale, distalScale)');
    expect(source).toContain('function addLimbJoint(p, axis, radius, hingeScale)');
    expect(source).toContain('function addLimbCrest(base, tip, radius)');
    expect(source).toContain('var companionProximal = knee.clone()');
    expect(source).toContain('var deltopectoralBase = new THREE.Vector3()');
    expect(source).toContain('var femoralTrochanterBase = new THREE.Vector3()');
    expect(source).toContain('var cnemialBase = new THREE.Vector3()');
    expect(source).toContain('var freeUlnaStart = elbow.clone()');
    expect(source).toContain('addLimbJoint(knee, new THREE.Vector3().subVectors(ankle, knee)');
    expect(source).toContain('function addVertebralChain(start, end, count, startRadius, endRadius, processScale, region)');
    expect(source).toContain('var centrum = addSkeletonEllipsoid(point');
    expect(source).toContain('var archCenter = point.clone()');
    expect(source).toContain("if (region === 'dorsal' && vertebraIndex % 2 === 0)");
    expect(source).toContain("else if (region === 'caudal' && vertebraIndex <= skeletalProfile.proximalCaudalProcessCount)");
    expect(source).toContain('var caudalProcessFade = 1 -');
    expect(source).toContain('var caudalProcessTip = caudalProcessBase.clone()');
    expect(source).toContain("if (region === 'caudal') spineTip.add(chainAxis.clone()");
    expect(source).toContain('var facetTip = facetBase.clone()');
    expect(source).toContain("1.55, 'dorsal'");
    expect(source).toContain("1.20, 'caudal'");
    expect(source).toContain("1.45, 'cervical'");
    expect(source).toContain('var skullLength = Math.max(');
    expect(source).toContain('showCranialModules: group !== \'other\'');
    expect(source).toContain("cranialKinesis: /Avialae/i.test(clade) ? 'braced early-avialan palate; modern powered bill kinesis is not reconstructed'");
    expect(source).toContain('function addCranialBone(a, b, radius, mat)');
    expect(source).toContain('var cranialAccentMat = THREE.MeshStandardMaterial');
    expect(source).toContain('var jawJointMat = THREE.MeshStandardMaterial');
    expect(source).toContain('var hyoidMat = THREE.MeshStandardMaterial');
    expect(source).toContain('var premaxillaUpper = snout.clone()');
    expect(source).toContain('var maxillaRear = new THREE.Vector3()');
    expect(source).toContain('var jugalRear = head.clone()');
    expect(source).toContain('var postorbitalTop = head.clone()');
    expect(source).toContain('var quadrateTop = head.clone()');
    expect(source).toContain('if (skeletalProfile.palatalBrace)');
    expect(source).toContain('var palatineFront = new THREE.Vector3()');
    expect(source).toContain('var pterygoidMid = new THREE.Vector3()');
    expect(source).toContain('var mandibularMid = new THREE.Vector3()');
    expect(source).toContain('var surangularMid = new THREE.Vector3()');
    expect(source).toContain('var quadrateCondyle = addSkeletonEllipsoid');
    expect(source).toContain("craniocervicalDetail: group !== 'other'");
    expect(source).toContain('var occipitalCondyleCenter = head.clone()');
    expect(source).toContain('var atlasCenter = head.clone()');
    expect(source).toContain('var axisSpineTip = axisCenter.clone()');
    expect(source).toContain('var odontoidTip = atlasCenter.clone()');
    expect(source).toContain('var coronoidTip = coronoidBase.clone()');
    expect(source).toContain('var retroarticularTip = jawHinge.clone()');
    expect(source).toContain('var hyoidBack = new THREE.Vector3()');
    expect(source).toContain('var hyoidFront = new THREE.Vector3()');
    expect(source).toContain('var temporalOpening = addSkeletonEllipsoid');
    expect(source).toContain("profile.toothProfile = isBasalTyrannosauroid ? 'ziphodont' : 'incrassate';");
    expect(source).toContain("if (/Spinosaur/i.test(clade)) profile.toothProfile = 'conical';");
    expect(source).toContain("if (/Diplodoc|Rebbachisaur/i.test(clade)) profile.toothProfile = 'pencil';");
    expect(source).toContain("var toothCount = skeletalProfile.toothProfile === 'conical' ? 9");
    expect(source).toContain('var toothMesh = addSkeletonCone');
    expect(source).toContain('if (skeletalProfile.antorbitalFenestra)');
    expect(source).toContain('var antorbitalFenestra = addSkeletonEllipsoid');
    expect(source).toContain('if (skeletalProfile.mandibularFenestra)');
    expect(source).toContain('var mandibularFenestra = addSkeletonEllipsoid');
    expect(source).toContain('for (var gastralIndex = 1; gastralIndex <= 5; gastralIndex++)');
    expect(source).toContain('var leftGastralMedial = gastralCenter.clone()');
    expect(source).toContain('var rightGastralMedial = gastralCenter.clone()');
    expect(source).toContain('profile.gastralBasketMode = profile.gastralia ?');
    expect(source).toContain('var shoulderHalf = Math.max(');
    expect(source).toContain('function addDigitFan(root, front, sideSign)');
    expect(source).toContain('var sickleDigit = !front && /Dromaeosaur|Troodont/i.test(cladeName)');
    expect(source).toContain('digitIndex === 0;');
    expect(source).toContain('var handDigits = skeletalProfile.manualDigits;');
    expect(source).toContain('var manualUngualVisible = handDigitIndex < skeletalProfile.manualUnguals;');
    expect(source).toContain('var scleroticRing = new THREE.Mesh');
    expect(source).toContain('var spinosaurRostrum = new THREE.Vector3()');
    expect(source).toContain('var duckBillCenter = snout.clone()');
    expect(source).toContain('var thagomizerBase = new THREE.Vector3()');
    expect(source).toContain('function (clubSide)');
    expect(source).toContain('var cervicalRibCount = skeletalProfile.cervicalRibCount;');
    expect(source).toContain('if (skeletalProfile.axialPneumaticity)');
    expect(source).toContain('var pneumaticFossa = addSkeletonEllipsoid');
    expect(source).toContain('pneumaticCervicals: supportsInvasivePneumaticity');
    expect(source).toContain('for (var dorsalPneumaticIndex = 1; dorsalPneumaticIndex <= skeletalProfile.pneumaticDorsals; dorsalPneumaticIndex++)');
    expect(source).toContain('var pneumaticRim = new THREE.Mesh');
    expect(source).toContain('var dorsalRim = new THREE.Mesh');
    expect(source).toContain('var sternalPlate = addSkeletonEllipsoid');
    expect(source).toContain('for (var sternalRibIndex = 0; sternalRibIndex < skeletalProfile.sternalRibCount; sternalRibIndex++)');
    expect(source).toContain('var sternalCostalAnchor = ribDistalAnchors[sternalCostalIndex]');
    expect(source).toContain('var costalJointMat = THREE.MeshStandardMaterial');
    expect(source).toContain('for (var chevronIndex = 1; chevronIndex <= skeletalProfile.chevronCount; chevronIndex++)');
    expect(source).toContain('var chevronLeftRoot = chevronBase.clone()');
    expect(source).toContain('var chevronRightRoot = chevronBase.clone()');
    expect(source).toContain('var chevronJunction = chevronBase.clone()');
    expect(source).toContain('if (skeletalProfile.sacralDetail)');
    expect(source).toContain('for (var sacralIndex = 0; sacralIndex < skeletalProfile.sacralCount; sacralIndex++)');
    expect(source).toContain('var sacralArchCenter = sacralCenter.clone()');
    expect(source).toContain('var sacralRibShoulder = sacralCenter.clone()');
    expect(source).toContain('var sacralIliacContact = sacralCenter.clone()');
    expect(source).toContain("var pubisOffsetX = skeletalProfile.pubisMode === 'posterior'");
    expect(source).toContain('var iliumAnterior = hip.clone()');
    expect(source).toContain('var iliumPosterior = hip.clone()');
    expect(source).toContain('var acetabularOpening = addSkeletonEllipsoid');
    expect(source).toContain('if (skeletalProfile.prepubicProcess)');
    expect(source).toContain('var prepubicTip = hip.clone()');
    expect(source).toContain('var furculaCenter = shoulder.clone()');
    expect(source).toContain('var digitCount = front ? skeletalProfile.manualDigits : skeletalProfile.pedalDigits;');
    expect(source).toContain('if (front && skeletalProfile.columnarManus)');
    expect(source).toContain('var phalangealFormula = front ? skeletalProfile.manualPhalanxFormula : skeletalProfile.pedalPhalanxFormula;');
    expect(source).toContain('var nonUngualCount = Math.max(0, Math.min(4, formulaCount - 1));');
    expect(source).toContain('var manualNonUngualCount = Math.max(0, Math.min(4, manualFormulaCount - 1));');
    expect(source).toContain('profile.pedalPhalanxFormula = [2, 3, 4, 5];');
    expect(source).toContain('profile.pedalPhalanxFormula = [2, 3, 4, 5, 1];');
    expect(source).toContain('for (var phalanxIndex = 0; phalanxIndex < nonUngualCount; phalanxIndex++)');
    expect(source).toContain('for (var manualPhalanxIndex = 0; manualPhalanxIndex < manualNonUngualCount; manualPhalanxIndex++)');
    expect(source).toContain('var compactSpread = front && skeletalProfile.compactManus ? 0.56 : 1;');
    expect(source).toContain('var terminalScale = skeletalProfile.hoofedDigits ?');
    expect(source).toContain('var visibleUngual = digitIndex < ungualCount;');
    expect(source).toContain('if (skeletalProfile.weightBearingForelimbs)');
    expect(source).toContain('if (skeletalProfile.gastralia)');
    expect(source).toContain('if (skeletalProfile.toothed)');
    expect(source).toContain("'Scientific anatomy profile'");
    expect(source).toContain("'Cranial mechanics: '");
    expect(source).toContain("'Cranial evidence: '");
    expect(source).toContain('skeletalProfile.cranialMechanics');
    expect(source).toContain('skeletalProfile.cranialEvidence');
    expect(source).toContain("'Head-neck junction: '");
    expect(source).toContain("'Head-neck evidence: '");
    expect(source).toContain("'Mandibular lever: '");
    expect(source).toContain("'Jaw-lever evidence: '");
    expect(source).toContain('skeletalProfile.craniocervicalArchitecture');
    expect(source).toContain('skeletalProfile.mandibularLeverArchitecture');
    expect(source).toContain('Cranial load frame');
    expect(source).toContain('Occiput and atlas-axis');
    expect(source).toContain('Mandibular levers');
    expect(source).toContain('Quadrate-articular joint');
    expect(source).toContain('Hyoid proxy');
    expect(source).toContain("'Pelvic architecture: '");
    expect(source).toContain('skeletalProfile.pelvis');
    expect(source).toContain("'Locomotor mechanics: '");
    expect(source).toContain('skeletalProfile.locomotor');
    expect(source).toContain("'Limb osteology: '");
    expect(source).toContain("'Limb evidence: '");
    expect(source).toContain('skeletalProfile.limbOsteology');
    expect(source).toContain('skeletalProfile.limbEvidence');
    expect(source).toContain("'Girdle architecture: '");
    expect(source).toContain("'Hands and feet mode: '");
    expect(source).toContain("'Hands and feet evidence: '");
    expect(source).toContain('skeletalProfile.girdleOsteology');
    expect(source).toContain('skeletalProfile.distalLimbMode');
    expect(source).toContain('skeletalProfile.distalLimbEvidence');
    expect(source).toContain("'Vertebral architecture: '");
    expect(source).toContain("'Vertebral evidence: '");
    expect(source).toContain('skeletalProfile.vertebralArchitecture');
    expect(source).toContain('skeletalProfile.vertebralEvidence');
    expect(source).toContain("'Thoracic cage: '");
    expect(source).toContain("'Thoracic evidence: '");
    expect(source).toContain("'Gastral basket: '");
    expect(source).toContain("'Uncinate processes: '");
    expect(source).toContain('skeletalProfile.ribArchitecture');
    expect(source).toContain('skeletalProfile.ribEvidence');
    expect(source).toContain('skeletalProfile.uncinateEvidence');
    expect(source).toContain("'Sacral load path: '");
    expect(source).toContain("'Sacral evidence: '");
    expect(source).toContain("'Caudal transition: '");
    expect(source).toContain("'Haemal arches: '");
    expect(source).toContain("'Haemal-arch evidence: '");
    expect(source).toContain('skeletalProfile.sacralArchitecture');
    expect(source).toContain('skeletalProfile.caudalArchitecture');
    expect(source).toContain('skeletalProfile.chevronArchitecture');
    expect(source).toContain('Sacral load path');
    expect(source).toContain('Caudal ribs and haemal arches');
    expect(source).toContain('Thoracic articulations');
    expect(source).toContain('Gastralia and uncinate processes');
    expect(source).toContain('Active reconstruction hypothesis');
    expect(source).toContain('Vertebral architecture');
    expect(source).toContain('Girdle blades and sockets');
    expect(source).toContain('Articulated hands and feet');
    expect(source).toContain('Long-bone morphology');
    expect(source).toContain('Articular surfaces');
    expect(source).toContain('Soft-tissue inference: ');
    expect(source).toContain('skeletalProfile.softTissue');
    expect(source).toContain('Respiratory reconstruction: ');
    expect(source).toContain('Respiratory evidence: ');
    expect(source).toContain('skeletalProfile.respiratoryEvidence');
    expect(source).toContain("respiratoryMode: supportsInvasivePneumaticity ? 'air-sac proxy' : 'dorsal lung proxy'");
    expect(source).toContain('isEarlyApneumaticSaurischian');
    expect(source).toContain('This does not prove that every soft air sac was absent.');
    expect(source).toContain('jawMuscleScale: 1');
    expect(source).toContain('tailBaseMuscleScale: isTheropod ? 1.12 : 1');
    expect(source).toContain('buccalTissue: /Ceratops|Hadrosaur|Tyrannosaur/i.test(clade)');
    expect(source).toContain('var muscleMat = THREE.MeshStandardMaterial');
    expect(source).toContain('var lungMat = THREE.MeshStandardMaterial');
    expect(source).toContain('var airSacMat = THREE.MeshStandardMaterial');
    expect(source).toContain('function addRespiratoryVolume(pos, scale, mat, order)');
    expect(source).toContain('if (skeletalProfile.cervicalAirSacs)');
    expect(source).toContain('if (skeletalProfile.thoracicAirSacs)');
    expect(source).toContain('if (skeletalProfile.abdominalAirSacs)');
    expect(source).toContain('Dorsal lung proxy');
    expect(source).toContain('Air-sac proxy');
    expect(source).toContain('Pneumatic bone evidence');
    expect(source).toContain('var keratinMat = THREE.MeshStandardMaterial');
    expect(source).toContain('function addMuscleBelly(a, b, radius, depthScale)');
    expect(source).toContain('if (skeletalProfile.buccalTissue)');
    expect(source).toContain('var caudofemoralOrigin =');
    expect(source).toContain('addKeratinCone(digitTip, sheathTip');
    expect(source).toContain('Muscle inference');
    expect(source).toContain('Keratin sheath');
    expect(source).toContain('integumentMode: \'scaled\'');
    expect(source).toContain('var isPennaraptoran =');
    expect(source).toContain('direct scale impressions in large derived tyrannosaurids');
    expect(source).toContain('exceptional direct skin and bristle preservation');
    expect(source).toContain('var filamentMat = THREE.MeshStandardMaterial');
    expect(source).toContain('var featherVaneMat = THREE.MeshStandardMaterial');
    expect(source).toContain('function addIntegumentFilament(base, tip, radius)');
    expect(source).toContain('function addFeatherVane(base, tip, width)');
    expect(source).toContain('if (surfaceHypothesis.dorsalBristles)');
    expect(source).toContain('if (surfaceHypothesis.tailFan)');
    expect(source).toContain('else if (surfaceHypothesis.tailFrond)');
    expect(source).toContain('surfaceHypothesis.hindWingFeathers');
    expect(source).toContain('surfaceHypothesis.wingFeathers');
    expect(source).toContain('Integument evidence: ');
    expect(source).toContain('Filament and feather tract');
    expect(source).toContain('Regional feature scales');
    expect(source).toContain('var isBasalTyrannosauroid =');
    expect(source).toContain('Basal tyrannosauroid three-fingered forelimb');
    expect(source).toContain('profile.arctometatarsus = !isBasalTyrannosauroid');
    expect(source).toContain("arctometatarsus: /Tyrannosaur|Ornithomim|Troodont|Alvarezsaur/i.test(clade)");
    expect(source).toContain("tailBracing: /Dromaeosaur/i.test(clade)");
    expect(source).toContain('var columnFactor = skeletalProfile.columnarLimbs ? 0.34 : 1;');
    expect(source).toContain('var distalScale = front ? 1 : skeletalProfile.distalLegScale;');
    expect(source).toContain('if (!front && skeletalProfile.arctometatarsus)');
    expect(source).toContain('var proximalT = metatarsalIndex === 1 ? 0.20 : 0.03;');
    expect(source).toContain('if (skeletalProfile.tailBracing)');
    expect(source).toContain('for (var tailBraceIndex = 0; tailBraceIndex < 6; tailBraceIndex++)');
    expect(source).toContain('var armScale = skeletalProfile.armScale;');
    expect(source).toContain('* skeletalProfile.stanceWidth;');
    expect(source).toContain("profile.label = 'Comparative outgroup - not a dinosaur'");
    expect(source).toContain('profile.craniocervicalDetail = false;');
    expect(source).toContain('profile.coronoidScale = 0;');
    expect(source).toContain('profile.sacralDetail = false;');
    expect(source).toContain('profile.proximalCaudalProcessCount = 0;');
    expect(source).toContain('profile.chevronCount = 0;');
    expect(source).toContain('Comparative outgroup warning: this animal is not a dinosaur.');
    expect(source).toContain('if (skeletalProfile.sternalPlates)');
    expect(source).toContain('skeletalProfile.caveat');
    expect(source).not.toContain("if (isTheropod || dn.diet === 'carnivore' || dn.diet === 'piscivore')");
    expect(source).toContain('addVertebralChain(hip, tail, isSauropod ? 18 : 14');
    expect(source).toContain('var interactionPauseUntil = 0;');
    expect(source).toContain('function pauseAutoRotate(ms)');
    expect(source).toContain('pauseAutoRotate(2400);');
    expect(source).toContain('performance.now() >= interactionPauseUntil');
  });

  it('keeps the Dig Site cells and guesses screen-reader reviewable', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_dinolab.js'), 'utf8');
    expect(source).toContain("digStatusText = 'Site #'");
    expect(source).toContain("digGridDesc = 'Dig grid with '");
    expect(source).toContain("'aria-disabled': isDug ? 'true' : 'false'");
    expect(source).toContain("var cellLabel = 'Cell ' + (cellIdx + 1)");
    expect(source).toContain("'aria-label': 'Identify the find choices'");
    expect(source).toContain("'aria-pressed': (picked || isAnswer) ? 'true' : 'false'");
    expect(source).not.toContain("disabled: isDug");
  });

  it('exposes visual chart scale semantics outside the 3D lab', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_dinolab.js'), 'utf8');
    expect(source).toContain("periodSummary = p.name + ' lasted about '");
    expect(source).toContain("'aria-label': p.name + ' duration on the Mesozoic timeline'");
    expect(source).toContain("deepTimeSummary = 'Compressed Earth history timeline");
    expect(source).toContain("role: 'img', 'aria-label': deepTimeSummary");
    expect(source).toContain("'aria-label': label + ' comparison value'");
    expect(source).toContain("'aria-valuetext': valueText");
    expect(source).toContain("if (scale === 'log') ratio = max > 0 ? Math.log10");
    expect(source).toContain('Time ranges overlap around');
    expect(source).toContain("className: 'dinolab-world-map', role: 'group'");
    expect(source).toContain('Counts describe this curated catalog, not global abundance or biodiversity.');
  });
  it('provides roving keyboard tabs, visible focus, and labeled filter groups', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_dinolab.js'), 'utf8');
    expect(source).toContain("if (!TABS.some(function (tb) { return tb.id === tab; })) tab = 'explore';");
    expect(source).toContain('function handleTabKeyDown(event, index)');
    expect(source).toContain("event.key === 'ArrowRight' || event.key === 'ArrowDown'");
    expect(source).toContain("event.key === 'ArrowLeft' || event.key === 'ArrowUp'");
    expect(source).toContain("else if (event.key === 'Home') nextIndex = 0;");
    expect(source).toContain("else if (event.key === 'End') nextIndex = TABS.length - 1;");
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain("'aria-orientation': 'horizontal'");
    expect(source).toContain("'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown Home End'");
    expect(source).toContain('.dinolab-root button:focus-visible');
    expect(source).toContain('outline:3px solid #f8fafc!important');
    expect(source).toContain("'aria-label': 'Filter by geological period'");
    expect(source).toContain("'aria-label': 'Filter by diet'");
    expect(source).toContain("'aria-label': 'Filter by location'");
    expect(source).toContain("'aria-label': 'Sort dinosaurs'");
    expect(source).toContain("className: 'dinolab-explore-layout'");
    expect(source).toContain('function tabGroupFor(id)');
    expect(source).toContain("'data-tab-group': tabGroupFor(tb.id)");
    expect(source).toContain("'aria-label': 'Dino Lab section navigation'");
    expect(source).toContain("className: 'dinolab-section-cue'");
    expect(source).toContain('overflow-x:auto!important');
  });
  it('keeps Quiz and Classify completed choices keyboard-reviewable', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_dinolab.js'), 'utf8');
    expect(source).toContain('function pickGroup(g) { if (sAnswered) return;');
    expect(source).toContain("var groupState = isCorrect ? 'correct answer'");
    expect(source).toContain("'aria-disabled': sAnswered ? 'true' : 'false'");
    expect(source).toContain("'aria-pressed': sPicked === g.id ? 'true' : 'false'");
    expect(source).toContain("'aria-label': g.label + ', ' + groupState");
    expect(source).toContain('function pick(i) { if (answered) return;');
    expect(source).toContain("var optionState = isCorrect ? 'correct answer'");
    expect(source).toContain("'aria-disabled': answered ? 'true' : 'false'");
    expect(source).toContain("'aria-pressed': picked === i ? 'true' : 'false'");
    expect(source).toContain("'aria-label': opt + ', ' + optionState");
    expect(source).not.toContain('disabled: sAnswered');
    expect(source).not.toContain('disabled: answered');
  });

  it('moves focus and activates sections with tab-list arrow keys', async () => {
    const api = setupDinoLab();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let data = baseData('explore');
    const render = () => root.render(api.tool.cfg.render({
      React: api.React,
      toolData: { dinoLab: data },
      update: (_toolId, key, value) => {
        data = { ...data, [key]: value };
        render();
      },
      updateMulti: (_toolId, values) => {
        data = { ...data, ...values };
        render();
      },
      announceToSR: () => {},
    }));

    await api.React.act(async () => { render(); });
    const exploreTab = document.getElementById('dinotab-explore');
    expect(exploreTab).not.toBeNull();
    exploreTab.focus();
    await api.React.act(async () => {
      exploreTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });

    expect(data.tab).toBe('timeline');
    expect(document.activeElement?.id).toBe('dinotab-timeline');
    expect(document.getElementById('dinotab-timeline')?.getAttribute('aria-selected')).toBe('true');
    expect(document.getElementById('dinotab-explore')?.getAttribute('tabindex')).toBe('-1');

    await api.React.act(async () => { root.unmount(); });
    host.remove();
  });
  it('lets keyboard users enter and revisit available Field Station workflow steps', async () => {
    const api = setupDinoLab();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let data = baseData('field3d');
    const render = () => root.render(api.tool.cfg.render({
      React: api.React,
      toolData: { dinoLab: data },
      update: (_toolId, key, value) => {
        data = { ...data, [key]: value };
        render();
      },
      updateMulti: (_toolId, values) => {
        data = { ...data, ...values };
        render();
      },
      announceToSR: () => {},
    }));

    await api.React.act(async () => { render(); });
    const scanStep = host.querySelector('button[aria-label="Step 2 Scan, Ready"]');
    const lockedAssembly = host.querySelector('button[aria-label="Step 3 Assemble, Locked"]');
    expect(scanStep).not.toBeNull();
    const lockedAssemblyTools = host.querySelector('button[aria-label="Assemble field tools, locked. Finish scan first"]');
    expect(scanStep?.disabled).toBe(false);
    expect(lockedAssembly?.disabled).toBe(true);
    expect(lockedAssemblyTools?.disabled).toBe(true);

    scanStep?.focus();
    await api.React.act(async () => { scanStep?.click(); await new Promise(resolve => setTimeout(resolve, 5)); });
    expect(data.field3dWorkflowStarted).toBe(true);
    expect(data.field3dDrawerOpen).toBe(true);
    expect(data.field3dDrawerSection).toBe('evidence');
    expect(host.querySelector('button[aria-label="Step 2 Scan, Current"]')).not.toBeNull();
    const viewControls = host.querySelector('[role="group"][aria-label="3D model view controls"]');
    expect(viewControls).not.toBeNull();
    expect([...viewControls.querySelectorAll('button')].map(button => button.textContent)).toEqual(['Pause spin', 'Close field tools', 'Focus model']);
    expect(host.querySelector('.dinolab-field-toolbar button#dinolab-field-species-file')).toBeNull();
    expect(host.querySelector('#dinolab-field-drawer #dinolab-field-species-file')?.textContent).toBe('Open full species file');
    expect(document.activeElement?.id).toBe('dinolab-field-drawer-close');

    const closeDrawer = host.querySelector('#dinolab-field-drawer-close');
    await api.React.act(async () => { closeDrawer?.click(); await new Promise(resolve => setTimeout(resolve, 5)); });
    expect(data.field3dDrawerOpen).toBe(false);
    expect(document.activeElement?.id).toBe('dinolab-field-step-scan');


    data = { ...data, field3dScanSpecies: 'tyrannosaurus', field3dScanLogged: { skull: true, shoulder: true, hip: true } };
    await api.React.act(async () => { render(); });
    const assembleStep = host.querySelector('button[aria-label="Step 3 Assemble, Current"]');
    expect(assembleStep?.disabled).toBe(false);
    const availableAssemblyTools = host.querySelector('button[aria-label="Assemble field tools"]');
    expect(availableAssemblyTools?.disabled).toBe(false);
    expect(host.querySelector('button[aria-label="Claim field tools, locked. Finish assembly first"]')?.disabled).toBe(true);
    assembleStep?.focus();
    await api.React.act(async () => { assembleStep?.click(); await new Promise(resolve => setTimeout(resolve, 5)); });
    expect(data.field3dDrawerSection).toBe('assemble');
    expect(document.activeElement?.id).toBe('dinolab-field-drawer-close');
    await api.React.act(async () => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 5));
    });
    expect(data.field3dDrawerOpen).toBe(false);
    expect(document.activeElement?.id).toBe('dinolab-field-step-assemble');

    await api.React.act(async () => { root.unmount(); });
    host.remove();
  });
  it('keeps the same 3D canvas mounted across unrelated Field Station updates', async () => {
    const api = setupDinoLab();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let data = baseData('field3d');
    const render = () => root.render(api.tool.cfg.render({
      React: api.React,
      toolData: { dinoLab: data },
      update: () => {},
      updateMulti: () => {},
      announceToSR: () => {},
    }));

    await api.React.act(async () => { render(); });
    const firstCanvas = host.querySelector('canvas[aria-roledescription="Interactive 3D dinosaur reconstruction"]');
    expect(firstCanvas).not.toBeNull();

    data = { ...data, field3dChallengeIdx: 1 };
    await api.React.act(async () => { render(); });
    expect(host.querySelector('canvas[aria-roledescription="Interactive 3D dinosaur reconstruction"]')).toBe(firstCanvas);

    const opacity = host.querySelector('input[aria-label="Body inference opacity"]');
    expect(opacity).not.toBeNull();
    const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await api.React.act(async () => {
      nativeValueSetter?.call(opacity, '52');
      opacity.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.querySelector('input[aria-label="Body inference opacity"]')?.value).toBe('52');
    expect(host.querySelector('canvas[aria-roledescription="Interactive 3D dinosaur reconstruction"]')).toBe(firstCanvas);

    const sideViewButton = [...host.querySelectorAll('.dinolab-3d-view-controls button')].find(button => button.textContent === 'Side');
    expect(sideViewButton).not.toBeNull();
    await api.React.act(async () => { sideViewButton.click(); });
    expect(host.querySelector('canvas[aria-roledescription="Interactive 3D dinosaur reconstruction"]')).toBe(firstCanvas);

    data = { ...data, field3dShowBody: false, field3dScanTargetIdx: 2, field3dScanLogged: { skull: true }, field3dAssemblyPlaced: { skull: true } };
    await api.React.act(async () => { render(); });

    data = { ...data, field3dFocusMode: true };
    await api.React.act(async () => { render(); });
    expect(host.querySelector('canvas[aria-roledescription="Interactive 3D dinosaur reconstruction"]')).toBe(firstCanvas);
    expect(host.querySelector('.dinolab-tablist')).toBeNull();
    expect([...host.querySelectorAll('button')].some(button => button.textContent === 'Exit focus view')).toBe(true);

    data = { ...data, field3dFocusMode: false };
    await api.React.act(async () => { render(); });
    expect(host.querySelector('canvas[aria-roledescription="Interactive 3D dinosaur reconstruction"]')).toBe(firstCanvas);
    expect(host.querySelector('.dinolab-tablist')).not.toBeNull();
    expect(host.querySelector('canvas[aria-roledescription="Interactive 3D dinosaur reconstruction"]')).toBe(firstCanvas);
    expect(host.querySelector('input[aria-label="Body inference opacity"]')?.disabled).toBe(true);

    await api.React.act(async () => { root.unmount(); });
    host.remove();
  });

  it('renders the Field Station without automated structural WCAG A/AA axe violations', async () => {
    setupDinoLab();
    document.body.innerHTML = renderTab('field3d');
    const panel = document.getElementById('dinopanel') || document.body;
    const results = await axe.run(panel, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  }, AXE_AUDIT_TIMEOUT_MS);

  it('renders the Dig Site without automated structural WCAG A/AA axe violations', async () => {
    setupDinoLab();
    document.body.innerHTML = renderTab('dig');
    const panel = document.getElementById('dinopanel') || document.body;
    const results = await axe.run(panel, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  }, AXE_AUDIT_TIMEOUT_MS);
  it('renders Quiz, Classify, Map, and Compare without automated structural WCAG A/AA axe violations', async () => {
    setupDinoLab();
    for (const tab of ['quiz', 'classify', 'map', 'compare']) {
      document.body.innerHTML = renderTab(tab);
      const panel = document.getElementById('dinopanel') || document.body;
      const results = await axe.run(panel, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations, tab).toEqual([]);
    }
  }, AXE_AUDIT_TIMEOUT_MS);
});
