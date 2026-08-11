import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE_FILE = 'stem_lab/stem_tool_geosandbox.js';
const PUBLIC_FILE = 'desktop/web-app/public/stem_lab/stem_tool_geosandbox.js';
const IMMERSIVE_SOURCE_FILE = 'immersive_geometry/immersive_geometry.html';
const IMMERSIVE_PUBLIC_FILE = 'desktop/web-app/public/immersive_geometry/immersive_geometry.html';

function read(path) {
  return readFileSync(path, 'utf8');
}

describe('Geometry Sandbox visual clarity', () => {
  it('keeps source and public copies aligned', () => {
    expect(read(PUBLIC_FILE)).toBe(read(SOURCE_FILE));
  });

  it('keeps immersive geometry source and public copies aligned', () => {
    expect(read(IMMERSIVE_PUBLIC_FILE)).toBe(read(IMMERSIVE_SOURCE_FILE));
  });

  it('does not enable haze-prone scene polish by default', () => {
    const source = read(SOURCE_FILE);

    expect(source).toContain('scene.background = new THREE.Color(themeBg)');
    expect(source).toContain('window.AlloGeoSandboxPostFXEnabled !== true');
    expect(source).toContain('new THREE.MeshPhongMaterial');
    expect(source).not.toContain('new THREE.CanvasTexture(bgCv)');
    expect(source).not.toContain('scene._alloMotes');
    expect(source).not.toContain('new THREE.MeshPhysicalMaterial');
  });

  it('keeps compact UI text and controls at accessible contrast', () => {
    const source = read(SOURCE_FILE);
    const immersive = read(IMMERSIVE_SOURCE_FILE);

    expect(source).toContain('allo-geosandbox-contrast-css');
    expect(source).toContain("id: 'allo-geo-sandbox'");
    expect(source).not.toContain('text-amber-900 bg-amber-500/20');
    expect(source).not.toContain('from-amber-500 to-orange-600 text-white');
    expect(source).not.toContain('bg-yellow-600 text-white');
    expect(source).not.toContain('bg-sky-600 text-white');
    expect(source).not.toMatch(/hover:bg-(sky|yellow|emerald|teal|amber|orange)-600/);
    expect(source).not.toContain('border-transparent hover:bg-slate-700');
    expect(source).not.toContain('border-transparent hover:scale-105');

    expect(immersive).toContain('--accent: #665cf5');
    expect(immersive).toContain('button.act:focus-visible');
    expect(immersive).toContain('id="labelWrap"');
    expect(immersive).not.toContain('--accent: #6366f1');
    expect(immersive).not.toContain('color: #5f6d99');
    expect(immersive).not.toContain('color: #7d86ad');
  });

  it('renders stretch and sculpt objects with high-contrast scene labels', () => {
    const source = read(SOURCE_FILE);

    expect(source).toContain('function buildGeoLabelSprite');
    expect(source).toContain('function addSculptSceneLabel');
    expect(source).toContain('function sculptPartLabelText');
    expect(source).toContain('function sculptRecipeLabelText');
    expect(source).toContain('var showSceneLabels = gd.showSceneLabels !== false');
    expect(source).toContain("t('stem.geosandbox.scene_labels', 'Scene labels')");
    expect(source).toContain("(mode === 'stretch' || mode === 'sculpt')");
    expect(source).toContain('addSculptSceneLabel(window.THREE, sg, sculptRecipe, selPart, unitDef.short)');
    expect(source).toContain('selPart]');
    expect(source).toContain('new THREE.CanvasTexture(canvas)');
    expect(source).toContain('disposeGeoObject3D(window._geoScene.constructionGroup)');
    expect(source).toContain('disposeGeoObject3D(window._geoScene.sculptGroup)');
  });
  it('keeps solids visible from every camera angle', () => {
    const source = read(SOURCE_FILE);

    // ShadowMaterial is transparent but inherits depthWrite=true, so the invisible
    // 40x40 catcher wrote depth across the floor and depth-rejected every solid
    // above it once the camera orbited below the grid. There is no polar clamp.
    expect(source).toContain('new THREE.ShadowMaterial({ opacity: isDarkBg ? 0.32 : 0.22, depthWrite: false })');

    // Face winding: the base triangulates to u x v, which points UP into the solid.
    // Reversed, it points along -w and survives back-face culling.
    expect(source).toContain('[0, 3, 2, 1], // bottom');
    expect(source).not.toContain('[0, 1, 2, 3], // bottom');
    expect(source).toContain('var facesPy = [[0, 3, 2, 1]');

    // The prism is the only solid that shipped without DoubleSide.
    expect(source).toContain('opacity: 0.7, side: THREE.DoubleSide');

    // Geometry is authored in world coords with the mesh at the origin, so every
    // transparent object shared one sort key and draw order fell back to creation
    // order — solids punched depth holes through each other as the camera moved.
    expect(source).toContain('function recentreForSort(THREE, node)');
    expect(source).toContain('recentreForSort(THREE, mesh);');

    // The cross-section slice lives inside the solid it slices; with depth testing
    // on it was rejected by that solid's own front face.
    expect(source).toContain('depthWrite: false, depthTest: false');
    expect(source).toContain('sliceFill.renderOrder = 4000');
  });

  it('shows where a raised point will land, and cleans the marker up', () => {
    const source = read(SOURCE_FILE);

    expect(source).toContain('function buildPlacementGhost(THREE, x, y, z)');
    expect(source).toContain('if (placeArmed || placeY > 0) {');
    // Every other scene group has a clear/dispose path; this one must too, or the
    // marker accumulates GPU resources on every placement tweak.
    expect(source).toContain('var _clearGhost = function()');
    expect(source).toContain('disposeGeoObject3D(window._geoScene.ghostGroup)');
    // A stale ghost is worse than none — the scene effect has to re-run when the
    // target moves, so the placement values belong in its dependency array.
    expect(source).toContain('selPart, sculptEdit, sculptSliceOn, sculptSliceT, placeArmed, placeX, placeY, placeZ]);');
  });

  it('gives the non-visual channel the same information as the 3D view', () => {
    const source = read(SOURCE_FILE);

    // The ghost is WebGL-only; this is the screen-reader equivalent, and it has to
    // be wired into the canvas description or it describes a scene that no longer
    // matches what placement is about to do.
    expect(source).toContain('function geoDescribePlacement(placement)');
    expect(source).toContain('{ armed: mode === \'stretch\' && placeArmed, x: placeX, y: placeY, z: placeZ }');
    expect(source).toContain('geoDescribePlacement: geoDescribePlacement,');

    // Where a point landed is otherwise unknowable without sight.
    expect(source).toContain("t('stem.geosandbox.sr_point_added', 'Point added')");
    expect(source).toContain("t('stem.geosandbox.sr_height', 'height')");

    // A toast is a visual channel. Refusals on the keyboard/VR paths speak too.
    expect(source).toContain('var refuse = function(message, level)');
    expect(source).toContain('if (announceToSR) announceToSR(message);');
    expect(source).not.toContain("addToast('Select an object first', 'error')");
  });

  it('marks the selected object with more than a hue change', () => {
    const source = read(SOURCE_FILE);

    // WCAG 1.4.1: an amber translucent solid beside a violet one is colour as the
    // only visual means. The selected object gets an outline that reads through.
    expect(source).toContain('var edgeLines = function(geo, isSelected)');
    expect(source).toContain('color: 0xfbbf24, transparent: true, opacity: 0.95, depthTest: false');
    expect(source).toContain('if (isSelected) lines.renderOrder = 3000;');
    // The three solids share one edge builder rather than three copies drifting apart.
    expect(source).toContain('rectGroup.add(edgeLines(rectGeo, isSel))');
    expect(source).toContain('prismGroup.add(edgeLines(prismGeo, isSel))');
    expect(source).toContain('pyGroup.add(edgeLines(pyGeo, isSel))');
  });

  it('lets points be placed at a height, not only on the floor', () => {
    const source = read(SOURCE_FILE);

    expect(source).toContain('var placeY = gd.placeY != null ? gd.placeY : 0;');
    expect(source).toContain('function placePoint(x, z, y)');
    expect(source).toContain('addPoint([sn(x), Math.max(0, sn(y == null ? placeY : y)), sn(z)]);');   // never below the grid
    expect(source).toContain("t('stem.geosandbox.place_y'");
    expect(source).toContain('placePoint(placeX, placeZ, placeY)');

    // Click-to-place raycasts a horizontal plane that rides at the chosen height.
    expect(source).toContain('_groundPlane.constant = -_ph;');
    expect(source).toContain('window._geoPlaceY = placeY;');
    expect(source).toContain('window._geoPlacePoint(_gpHit.x, _gpHit.z, _gpHit.y)');
  });

  it('translates the stretch builder’s primary control', () => {
    const source = read(SOURCE_FILE);

    // These labels are the whole 0D->3D ladder in words, and they double as the
    // button's aria-label — they shipped hard-coded in English while every other
    // string in the file went through t().
    [
      'btn_start_with_point', 'btn_select_first', 'btn_point_to_segment',
      'btn_segment_to_rect', 'btn_rect_to_prism', 'btn_already_solid',
      'btn_taper_pyramid', 'btn_taper_frustum', 'btn_taper_prism',
      'btn_revolve_cone', 'btn_revolve_cylinder', 'btn_needs_rectangle',
    ].forEach((key) => expect(source).toContain("t('stem.geosandbox." + key + "'"));

    expect(source).not.toContain("label = 'Stretch point → segment (1D)'");
    expect(source).not.toContain("label = 'Select an object first'");
    expect(source).not.toContain("'Construction (' + construction.objects.length");
  });

  it('tells the student what the axis picker will actually do', () => {
    const source = read(SOURCE_FILE);

    expect(source).toContain('function geoEffectiveAxis(sel, axis, verb)');
    expect(source).toContain('function geoVerbApplies(sel, verb)');
    expect(source).toContain('geoEffectiveAxis: geoEffectiveAxis, geoVerbApplies: geoVerbApplies,');

    // Where the picker cannot apply it is REPLACED by a readout of the real
    // direction, not dimmed — a dimmed control reads as "locked out" when the
    // truth is "there is nothing to choose". No disabled axis buttons anywhere.
    expect(source).toContain("var fixedByNormal = eff.reason === 'normal';");
    expect(source).toContain("t('stem.geosandbox.axis_out_of_face', 'Straight out of the face')");
    expect(source).not.toContain('bg-slate-800/60 text-slate-400 cursor-not-allowed');
    expect(source).toContain("t('stem.geosandbox.axis_normal_note'");
    expect(source).toContain("t('stem.geosandbox.axis_parallel_note'");
    expect(source).toContain("t('stem.geosandbox.axis_spin_note'");

    // Keyboard/VR must refuse the same combinations the button refuses.
    expect(source).toContain('if (!geoVerbApplies(sel, buildVerb)) {');
  });

  it('keeps the 3D canvas and supporting graphics keyboard and screen-reader accessible', () => {
    const source = read(SOURCE_FILE);

    expect(source).toContain("role: 'application'");
    expect(source).toContain("'aria-describedby': 'geo-sandbox-canvas-description'");
    expect(source).toContain("'aria-keyshortcuts': 'ArrowUp ArrowDown ArrowLeft ArrowRight + - [ ] Delete'");
    expect(source).toContain("new window.THREE.Spherical().setFromVector3(offset)");
    expect(source).toContain("role: 'alertdialog'");
    expect(source).not.toContain('window.confirm(');
    expect(source).not.toContain('window.prompt(');
    expect(source).toContain("id: 'geo-save-name'");
    expect(source).toContain("key === '[' || key === ']'" );
    expect(source).toContain("key === 'Delete' || key === 'Backspace'");
    expect(source).toContain('var next = (g.history || []).concat([snap]);');
    expect((source.match(/role: 'img'/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(source).toContain("@media (max-width: 760px)");
    expect(source).toContain("id: 'geo-control-sidebar'");
    expect(source).toContain("id: 'geo-viewport-shell'");
    expect(source).toContain("pc.kind === 'annularSector'");
    expect(source).toContain("mode === 'single' && h('button', { 'aria-label': t('stem.geosandbox.export_stl', 'Export current shape as STL')");
    expect(source).toContain("'aria-label': t('stem.geosandbox.ai_tutor', 'AI Tutor')");
    expect(source).toContain("if (!exportSTL(shape, addToast))");
    expect(source).toContain("if (typeof mesh.updateMatrixWorld === 'function') mesh.updateMatrixWorld(true)");
    expect(source).toContain("window.setTimeout(function() { URL.revokeObjectURL(url); }, 0)");
    expect(source).toContain("steps.vol.formula");
    expect(source).toContain("steps.sa.formula");
    expect(source).toContain("['box','pyramid','prism'].indexOf(shape) >= 0");
    expect(source).toContain("geometry.rotateY(Math.PI / 4)");
    expect(source).toContain("label: 'Rectangular Prism'");
    expect(source).toContain("label: 'Base Half-Side'");
    expect(source).toContain("title: 'Frustum'");
    expect(source).toContain("rd = geoNormalizeShapeDims(sid, rd)");
    expect(source).toContain("shape === 'torus' && sl.key === 'tube'");
    expect(source).toContain("torus does not self-intersect");
    expect(source).toContain('input[type="range"] { min-height: 24px');
    expect(source).toContain("'aria-pressed': shapeColor === c");
    expect(source).toContain("role: 'switch', 'aria-checked': wireframe");
    expect(source).toContain("className: 'w-7 h-7 rounded-full");
    expect(source).toContain("className: 'geo-hint-touch'");
    expect(source).toContain("Pinch: zoom");
    expect(source).toContain("['ArrowLeft','ArrowRight','Home','End']");
    expect(source).toContain("tabIndex: mode === 'single' ? 0 : -1");
    expect(source).toContain("'aria-controls': 'geo-fullscreen-container'");
    expect(source).toContain("'aria-controls': 'geo-stretch-net-panel'");
    expect(source).toContain("disabled: !net");
    expect(source).toContain("'aria-controls': 'geo-single-net-panel'");
    expect(source).toContain("clearTimeout(window._geoSrTimer); window._geoSrTimer = null");
    expect(source).toContain("_geoAudioCtx.state !== 'closed'");
    expect(source).toContain("_geoAudioCtx = null");
    expect(source).toContain("id: 'geo-challenge-answer'");
    expect(source).toContain("document.getElementById('geo-challenge-answer')");
    expect(source).toContain("geoFormatChallengeAnswer(challenge)");
    expect(source).toContain("'aria-label': t('stem.geosandbox.challenge_result', 'Challenge result')");
    expect(source).toContain("geoBuildTutorPrompt(mode, shape, dims, construction, sculptRecipe, unitDef.short)");
    expect(source).toContain("if (aiLoading || aiRequestRef.current) return");
    expect(source).toContain("'aria-controls': 'geo-ai-tutor-panel'");
    expect(source).toContain("'aria-busy': aiLoading");
    expect(source).toContain("Analyzing the current geometry scene");
    expect(source).toContain("document.getElementById('geo-ai-tutor-button')");
  });
  it('keeps headset view transforms distinct from mathematical dilation', () => {
    const source = read(SOURCE_FILE);

    expect(source).toContain('startScale: obj.scale.clone()');
    expect(source).toContain('_grab.obj.scale.copy(_grab.two.startScale).multiplyScalar(ratio)');
    expect(source).toContain("'VIEW SCALE ×' + ratio.toFixed(2) + ' | measurements unchanged'");
    expect(source).not.toContain('_grab.obj.scale.setScalar(s)');
    expect(source).toContain("var _vrMathText = '', _vrStatusText = ''");
    expect(source).toContain('setVrStatus: _geoSetVrStatus');
  });

  it('hands compatible selected constructions into the guided immersive lab', () => {
    const source = read(SOURCE_FILE);

    expect(source).toContain('function geoImmersiveLaunchState(o)');
    expect(source).toContain("['point', 'segment', 'rect', 'prism'].indexOf(o.type)");
    expect(source).toContain('state.H = Math.abs(');
    expect(source).toContain('if (uvCos > 0.001) return null');
    expect(source).toContain('if (Math.abs(vec3Mag(extrusion) - state.H) > 0.001) return null');
    expect(source).toContain('function geoImmersiveLabUrl(locationLike, mode, selectedObject)');
    expect(source).toContain("params.push(key + '=' + encodeURIComponent(launchState[key]))");
    expect(source).toContain("immersiveBase = immersiveOrigin + '/immersive_geometry/immersive_geometry.html'");
    expect(source).toContain("var url = geoImmersiveLabUrl(window.location, mode, selectedForImmersive)");
    expect(source).toContain('function geoOpenImmersiveLab(url, environment)');
    expect(source).toContain("mode: 'same-window', reason: 'popup-blocked'");
    expect(source).toContain("addToast(fallbackNotice, 'info')");
    expect(source).toContain("addToast(blockedNotice, 'error')");
  });

  it('shows a visible startup and recovery state for the immersive scene', () => {
    const immersive = read(IMMERSIVE_SOURCE_FILE);

    expect(immersive).toContain('id="immersiveBootStatus" data-state="loading" role="status"');
    expect(immersive).toContain('id="immersiveBootReload" type="button" hidden');
    expect(immersive).toContain('window.__alloImmersiveBoot = {');
    expect(immersive).toContain("scene.addEventListener('renderstart'");
    expect(immersive).toContain('markComponentReady');
    expect(immersive).toContain("panel.setAttribute('role', 'alert')");
    expect(immersive).toContain("figure.addEventListener('componentinitialized'");
    expect(immersive).toContain("event.detail.name === 'stretch-lab'");
  });
});
