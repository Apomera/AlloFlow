import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

function readAnatomy(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function renderAnatomy(filePath, state = {}) {
  loadTool(filePath, 'anatomy');
  return renderTool('anatomy', {
    anatomy: {
      _activeTab: 'explore',
      system: 'skeletal',
      view: 'anterior',
      complexity: 3,
      ...state,
    },
  });
}

function expectActiveViewAndModel(html, dimension, model) {
  const root = document.createElement('div');
  root.innerHTML = html;
  const viewSwitcher = root.querySelector('[data-anatomy-view-switcher="true"]');
  const activeView = viewSwitcher?.querySelector('[data-anatomy-view-dimension="' + dimension + '"]');

  expect(viewSwitcher).not.toBeNull();
  expect(activeView?.getAttribute('aria-pressed')).toBe('true');
  if (!model) {
    expect(root.querySelector('[data-anatomy-model-switcher="true"]')).toBeNull();
    expect(activeView?.dataset.anatomyViewOption).toBe('2d');
    return;
  }

  const modelSwitcher = root.querySelector('[data-anatomy-model-switcher="true"]');
  const activeModel = modelSwitcher?.querySelector('[data-anatomy-model-option="' + model + '"]');
  expect(modelSwitcher).not.toBeNull();
  expect(activeModel?.getAttribute('aria-pressed')).toBe('true');
  expect(activeModel?.dataset.anatomyViewOption).toBe(model);
}

function findElement(node, predicate) {
  if (node == null || typeof node === 'boolean') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, predicate);
      if (match) return match;
    }
    return null;
  }
  if (typeof node !== 'object') return null;
  if (predicate(node)) return node;
  return findElement(node.props && node.props.children, predicate);
}

beforeEach(() => {
  resetStemLab();
});

describe('Anatomy model visual refinement', () => {
  it.each(ANATOMY_PATHS)('renders 2D Atlas, 3D Blueprint, and 3D Surface modes from %s', (filePath) => {
    const atlas = renderAnatomy(filePath);
    expect(atlas).toContain('data-anatomy-view="2d"');
    expect(atlas).toContain('data-anatomy-canvas="true"');
    expect(atlas).not.toContain('anatomy-canvas-mode-chip');
    expect(atlas).not.toContain('data-anatomy-3d-canvas="true"');
    expectActiveViewAndModel(atlas, '2d');

    const blueprint = renderAnatomy(filePath, { _bodyView3d: true, _body3dStyle: 'blueprint' });
    expect(blueprint).toContain('data-anatomy-view="3d"');
    expect(blueprint).toContain('data-anatomy-3d-canvas="true"');
    expect(blueprint).not.toContain('data-anatomy-canvas="true"');
    expect(blueprint).toContain('anatomy-canvas-mode-chip');
    expectActiveViewAndModel(blueprint, '3d', 'blueprint');

    const surface = renderAnatomy(filePath, { _bodyView3d: true, _body3dStyle: 'realistic' });
    expect(surface).toContain('data-anatomy-view="3d"');
    expect(surface).toContain('data-anatomy-3d-canvas="true"');
    expect(surface).not.toContain('data-anatomy-canvas="true"');
    expectActiveViewAndModel(surface, '3d', 'realistic');
  });

  it.each(ANATOMY_PATHS)('scopes display, appearance, and model-source controls to the relevant view in %s', (filePath) => {
    const atlas = renderAnatomy(filePath);
    const blueprint = renderAnatomy(filePath, { _bodyView3d: true, _body3dStyle: 'blueprint' });
    const surface = renderAnatomy(filePath, { _bodyView3d: true, _body3dStyle: 'realistic' });

    expect(atlas).toContain('data-anatomy-display-controls="true"');
    expect(atlas).toContain('data-anatomy-2d-controls="true"');
    expect(atlas).toContain('data-anatomy-skin-tone-controls="true"');
    expect(atlas).not.toContain('data-anatomy-model-source-controls="true"');

    expect(blueprint).not.toContain('data-anatomy-display-controls="true"');
    expect(blueprint).not.toContain('data-anatomy-2d-controls="true"');
    expect(blueprint).not.toContain('data-anatomy-skin-tone-controls="true"');
    expect(blueprint).not.toContain('data-anatomy-model-source-controls="true"');

    expect(surface).not.toContain('data-anatomy-display-controls="true"');
    expect(surface).not.toContain('data-anatomy-2d-controls="true"');
    expect(surface).toContain('data-anatomy-skin-tone-controls="true"');
    expect(surface).toContain('data-anatomy-model-source-controls="true"');
  });

  it.each(ANATOMY_PATHS)('keeps imported model controls in Surface while hiding built-in-only tone controls in %s', (filePath) => {
    const previousName = window.__alloAnatomyModelName;
    try {
      window.__alloAnatomyModelName = 'licensed-body.glb';
      const atlas = renderAnatomy(filePath);
      const blueprint = renderAnatomy(filePath, { _bodyView3d: true, _body3dStyle: 'blueprint' });
      const surface = renderAnatomy(filePath, { _bodyView3d: true, _body3dStyle: 'realistic' });

      expect(atlas).toContain('data-anatomy-skin-tone-controls="true"');
      expect(blueprint).not.toContain('data-anatomy-model-source-controls="true"');
      expect(surface).toContain('data-anatomy-model-source-controls="true"');
      expect(surface).toContain('Replace GLB');
      expect(surface).toContain('Use procedural model');
      expect(surface).not.toContain('data-anatomy-skin-tone-controls="true"');
    } finally {
      window.__alloAnatomyModelName = previousName;
    }
  });

  it.each(ANATOMY_PATHS)('keeps Atlas presets and advanced appearance options in progressive disclosures in %s', (filePath) => {
    const source = readAnatomy(filePath);
    const atlas = renderAnatomy(filePath);
    const surface = renderAnatomy(filePath, { _bodyView3d: true, _body3dStyle: 'realistic' });

    expect(atlas).toContain('<summary class="anatomy-display-summary"><span>Display</span>');
    expect(atlas).toContain('data-anatomy-visual-presets="true"');
    expect(atlas).toContain('aria-label="Atlas visual preset"');
    expect(atlas).toContain('data-anatomy-visual-preset="surface"');
    expect(atlas).toContain('data-anatomy-visual-preset="systems"');
    expect(atlas).toContain('data-anatomy-visual-preset="xray"');
    expect(atlas).toContain('<summary class="anatomy-appearance-summary"><span>Appearance &amp; labels</span>');
    expect(surface).toContain('<summary class="anatomy-appearance-summary"><span>Surface appearance</span>');
    expect(surface).toContain('<summary class="anatomy-model-source-summary"><span>Model source</span>');

    expect(source).toContain("var atlasVisualPreset = xrayMode ? 'xray' : anyDeepLayer ? 'systems' : 'surface';");
    expect(source).toContain("var nextPreset = ['surface', 'systems', 'xray'].indexOf(preset) !== -1 ? preset : 'surface';");
    expect(source).toContain('.anatomy-display-panel[open]>.anatomy-display-summary:after');
    expect(source).toContain('.anatomy-model-source[open]>.anatomy-model-source-summary:after');
  });

  it.each(ANATOMY_PATHS)('scales the responsive 2D atlas crisply and keeps hover tooltips inside the canvas in %s', (filePath) => {
    const source = readAnatomy(filePath);

    expect(source).toContain('function syncAnatomy2dSize(force)');
    expect(source).toContain('var sizeTarget = canvas.parentElement || canvas;');
    expect(source).toContain('var displayedWidth = sizeTarget && sizeTarget.clientWidth ? sizeTarget.clientWidth : LOGICAL_WIDTH;');
    expect(source).toContain('var cssDisplayScale = Math.max(0.5, displayedWidth / LOGICAL_WIDTH);');
    expect(source).toContain('var renderScale = Math.min(3, Math.max(1, deviceScale * cssDisplayScale));');
    expect(source).toContain('var nextWidth = Math.round(LOGICAL_WIDTH * renderScale);');
    expect(source).toContain('var nextHeight = Math.round(LOGICAL_HEIGHT * renderScale);');
    expect(source).toContain('if (!force && canvas.width === nextWidth && canvas.height === nextHeight && context) return false;');
    expect(source).toContain('context.setTransform(renderScale, 0, 0, renderScale, 0, 0)');
    expect(source).toContain('resizeObserver = new ResizeObserver(function() { scheduleResize(); });');
    expect(source).toContain('resizeObserver.observe(canvas.parentElement || canvas);');
    expect(source).toContain("window.matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)')");
    expect(source).toContain('if (resizeObserver) resizeObserver.disconnect();');
    expect(source).toContain("window.addEventListener('resize', scheduleResize, { passive: true })");
    expect(source).toContain("window.removeEventListener('resize', scheduleResize)");

    expect(source).toContain('var hoveredMarker = markerPosition(hSt);');
    expect(source).toContain("var displayName = showName ? hSt.name : 'Structure Pin';");
    expect(source).toContain('var briefFn = displayFn.substring(0, 36);');
    expect(source).toContain('if (htx + boxW > W - 4) htx = W - boxW - 4;');
    expect(source).toContain('if (hty + boxH > H - 4) hty = H - boxH - 4;');
    expect(source).toContain("cCtx.fillStyle = 'rgba(15,23,42,0.92)'; cCtx.fill();");
  });

  it.each(ANATOMY_PATHS)('attaches an identity-stable 2D canvas ref in %s', (filePath) => {
    const source = readAnatomy(filePath);

    expect(source).toContain('var anatomy2dController = (function()');
    expect(source).toContain('function stableAnatomy2dRef(canvas)');
    expect(source).toContain('anatomy2dController.attach(canvas);');
    expect(source).toContain('anatomy2dController.push(paintAnatomyFrame);');
    expect(source).toContain('ref: stableAnatomy2dRef');
    expect(source).not.toContain('ref: canvasRef');
  });

  it.each(ANATOMY_PATHS)('keeps the same 2D canvas ref identity across anatomy state renders in %s', (filePath) => {
    const tool = loadTool(filePath, 'anatomy');
    const baseState = {
      _activeTab: 'explore',
      _bodyView3d: false,
      system: 'skeletal',
      view: 'anterior',
      complexity: 3,
    };
    const firstTree = tool.render(makeCtx({
      toolData: { anatomy: { ...baseState, selectedStructure: null } },
    }));
    const secondTree = tool.render(makeCtx({
      toolData: { anatomy: { ...baseState, selectedStructure: 'femur' } },
    }));
    const is2dCanvas = (node) => node.type === 'canvas'
      && node.props
      && node.props['data-anatomy-canvas'] === 'true';
    const firstCanvas = findElement(firstTree, is2dCanvas);
    const secondCanvas = findElement(secondTree, is2dCanvas);

    expect(firstCanvas).not.toBeNull();
    expect(secondCanvas).not.toBeNull();
    expect(typeof firstCanvas.ref).toBe('function');
    expect(secondCanvas.ref).toBe(firstCanvas.ref);
  });
  it.each(ANATOMY_PATHS)('attaches the stable 3D ref without forcing context loss in %s', (filePath) => {
    const source = readAnatomy(filePath);

    expect(source).toContain('function stableAnatomy3dRef(canvas)');
    expect(source).toContain('var anatomy3dActiveCanvas = null;');
    expect(source).toContain('ref: stableAnatomy3dRef');
    expect(source).not.toContain('ref: anatomy3dRef');
    expect(source).not.toContain('forceContextLoss');
  });
  it.each(ANATOMY_PATHS)('keeps the same canvas ref identity across anatomy state renders in %s', (filePath) => {
    const tool = loadTool(filePath, 'anatomy');
    const baseState = {
      _activeTab: 'explore',
      _bodyView3d: true,
      _body3dStyle: 'realistic',
      system: 'skeletal',
      view: 'anterior',
      complexity: 3,
    };
    const firstTree = tool.render(makeCtx({
      toolData: { anatomy: { ...baseState, selectedStructure: null } },
    }));
    const secondTree = tool.render(makeCtx({
      toolData: { anatomy: { ...baseState, selectedStructure: 'femur' } },
    }));
    const is3dCanvas = (node) => node.type === 'canvas'
      && node.props
      && node.props['data-anatomy-3d-canvas'] === 'true';
    const firstCanvas = findElement(firstTree, is3dCanvas);
    const secondCanvas = findElement(secondTree, is3dCanvas);

    expect(firstCanvas).not.toBeNull();
    expect(secondCanvas).not.toBeNull();
    expect(typeof firstCanvas.ref).toBe('function');
    expect(secondCanvas.ref).toBe(firstCanvas.ref);
  });


  it.each(ANATOMY_PATHS)('recovers from WebGL context loss without replacing the canvas in %s', (filePath) => {
    const source = readAnatomy(filePath);


    expect(source).toContain("canvas.addEventListener('webglcontextlost', onContextLost)");
    expect(source).toContain("canvas.addEventListener('webglcontextrestored', onContextRestored)");
    expect(source).toContain("canvas.removeEventListener('webglcontextlost', onContextLost)");
    expect(source).toContain("canvas.removeEventListener('webglcontextrestored', onContextRestored)");
    expect(source).toContain("canvas.setAttribute('data-anatomy-3d-state', state || 'loading')");
    expect(source).toContain("setStatus('The 3D graphics context paused. Restoring the body view?', 'recovering')");
    expect(source).toContain("setStatus('3D body restored. Your camera position is preserved.', 'ready')");
    expect(source).toContain("statusEl.setAttribute('data-state', state || 'loading')");
    expect(source).toContain('.anatomy-3d-status[data-state^="fallback"]:before');
    expect(source).toContain('var statusEl = null, renderErrorReported = false;');
    expect(source).toContain("if (typeof canvas._anatomy3dResume === 'function') canvas._anatomy3dResume();");
    expect(source).toContain('canvas._anatomy3dResume = null;');
    expect(source).toContain('canvas._anatomy3dRequestRender = requestAnatomy3dRender;');
    expect(source).toContain('if (!alive || !viewerIsVisible || canvas._anatomy3dContextLost || canvas._anatomy3dRenderFailed) return;');
  });

  it.each(ANATOMY_PATHS)('queues state changes while the 3D engine is still starting in %s', (filePath) => {
    const source = readAnatomy(filePath);

    expect(source).toContain("canvas._anatomy3dInstanceKey === anatomy3dInstanceKey");
    expect(source).toContain("canvas._anatomy3dPendingState = { selectedId: selected3dStructureId, style: body3dStyle, clinicalConceptId: selected3dClinicalConceptId }");
    expect(source).toContain("var pending3dState = canvas._anatomy3dPendingState");
    expect(source).toContain("canvas._anatomy3dSyncState(pending3dState.selectedId, pending3dState.style, pending3dState.clinicalConceptId)");
    expect(source).toContain('canvas._anatomy3dPendingState = null');
  });

  it.each(ANATOMY_PATHS)('syncs search markers and built-in Surface tones without rebuilding WebGL in %s', (filePath) => {
    const source = readAnatomy(filePath);

    expect(source).toContain("var anatomy3dInstanceKey = [sysKey, view, complexity, bodyModelRevision, activeAnatomyModelIdentity].join('|');");
    expect(source).not.toContain('var anatomy3dInstanceKey = [sysKey, view, complexity, searchTerm, skinToneId');
    expect(source).toContain('canvas._anatomy3dVisibleMarkerItems = visible3dMarkerItems;');
    expect(source).toContain('canvas._anatomy3dVisibleMarkerIds = visible3dMarkerIds;');
    expect(source).toContain('canvas._anatomy3dSurfaceTone = next3dSurfaceTone;');
    expect(source).toContain('viewFiltered.forEach(function(st, index)');
    expect(source).toContain('function syncSurfaceTone()');
    expect(source).toContain("object.userData.surfaceMaterialRole === 'detail'");
    expect(source).toContain('marker.visible = !!(canvas._anatomy3dVisibleMarkerIds');
    expect(source).toContain("var markerItems = canvas.getAttribute('data-anatomy-3d-style') === 'clinical' && importedModel && importedModel.visible");
  });

  it.each(ANATOMY_PATHS)('prefers the local GLTF loader and retains resilient fallbacks in %s', (filePath) => {
    const source = readAnatomy(filePath);

    expect(source).toContain("new URL('../vendor/three-r128/GLTFLoader.js', anatomyScriptSrc).href");
    expect(source).toContain("cacheKey: 'three-gltf-loader'");
    expect(source).toContain('localGltfUrls.concat([');
    expect(source).toContain('cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js');
    expect(source).toContain('The local anatomy model loader could not load; the procedural body remains available.');
  });

  it.each(ANATOMY_PATHS)('builds the detailed body surface with modern geometry and materials in %s', (filePath) => {
    const source = readAnatomy(filePath);

    expect(source).toContain("surfaceGroup.name = 'body-surface'");
    expect(source).toContain('new THREE.LatheGeometry(torsoProfile');
    expect(source).toContain('var SurfaceBodyMaterial = THREE.MeshPhysicalMaterial || THREE.MeshStandardMaterial;');
    expect(source).toContain('var surfaceSkinMat = new SurfaceBodyMaterial');
    expect(source).toContain('clearcoat: 0.035, clearcoatRoughness: 0.9');
    expect(source).toContain('var surfaceShadeMat = new SurfaceBodyMaterial');
    expect(source).toContain('buildDetailedBody(surfaceGroup, surfaceSkinMat, surfaceShadeMat, false)');
    expect(source).toContain("surfaceGroup.visible = body3dStyle === 'realistic' || body3dStyle === 'clinical'");
  });

  it.each(ANATOMY_PATHS)('adds Blueprint spatial grids and depth-aware selected structure cues in %s', (filePath) => {
    const source = readAnatomy(filePath);

    expect(source).toContain("blueprintStageGroup.name = 'blueprint-spatial-stage'");
    expect(source).toContain('var verticalReferenceGrid = new THREE.GridHelper(5.8, 14');
    expect(source).toContain("verticalReferenceGrid.name = 'blueprint-reference-grid'");
    expect(source).toContain('verticalReferenceGrid.rotation.x = Math.PI / 2;');
    expect(source).toContain('var floorReferenceGrid = new THREE.GridHelper(3.5, 8');
    expect(source).toContain("floorReferenceGrid.name = 'blueprint-floor-grid'");
    expect(source).toContain("blueprintStageGroup.visible = body3dStyle === 'blueprint'");
    expect(source).toContain("if (blueprintStageGroup) blueprintStageGroup.visible = resolvedStyle === 'blueprint';");
    expect(source).toContain('depthWrite: false, side: THREE.FrontSide');

    expect(source).toContain("selectionCueGroup.name = 'selected-structure-cue'");
    expect(source).toContain("selectedLeader.name = 'selected-structure-leader'");
    expect(source).toContain('new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.68, depthTest: true, depthWrite: false })');
    expect(source).toContain('new THREE.TorusGeometry(0.15, 0.012, 8, 32)');
    expect(source).toContain('new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.82, depthTest: true, depthWrite: false, side: THREE.DoubleSide })');
    expect(source).toContain("selectedAnchorRing.name = 'selected-structure-anchor'");
    expect(source).toContain('function syncSelectedStructureLeader(selectedId)');
    expect(source).toContain('selectionCueGroup.visible = !!selectedMarker;');
    expect(source).toContain('leaderPosition.setXYZ(0, selectedMarker.position.x');
    expect(source).toContain('selectedAnchorRing.position.copy(selectedMarker.position);');
    expect(source).toContain('marker.material.depthTest = true;');
    expect(source).toContain('marker.renderOrder = selected ? 6 : 2;');
    expect(source).toContain('syncSelectedStructureLeader(showBodyMarkers ? selectedId : null);');
  });

  it.each(ANATOMY_PATHS)('renders one canonical structure count in every model view from %s', (filePath) => {
    const source = readAnatomy(filePath);
    const views = [
      renderAnatomy(filePath),
      renderAnatomy(filePath, { _bodyView3d: true, _body3dStyle: 'blueprint' }),
      renderAnatomy(filePath, { _bodyView3d: true, _body3dStyle: 'realistic' }),
    ];

    expect(source.match(/'data-anatomy-structure-count': 'true'/g)).toHaveLength(1);
    views.forEach((html) => {
      expect(html.match(/data-anatomy-structure-count="true"/g)).toHaveLength(1);
      expect(html).toContain('>19 structures</span>');
    });
  });

  it.each(ANATOMY_PATHS)('keeps the refined 2D atlas stage and orientation cues in %s', (filePath) => {
    const source = readAnatomy(filePath);
    const html = renderAnatomy(filePath);

    expect(source).toContain('.anatomy-canvas-frame{width:min(400px,100%)');
    expect(source).toContain('.anatomy-canvas-mode-chip[data-mode="2d"]');
    expect(source).toContain('.anatomy-canvas{border-radius:18px!important;background-color:#f5f2ed!important');
    expect(html).toContain('data-anatomy-canvas-frame="true"');
    expect(html).toContain('data-anatomy-view="2d"');
    expect(html).toContain('data-anatomy-canvas="true"');

    expect(html).toContain('Patient R / L');
    expect(html).toContain('Diagram controls:');
    expect(source).toContain("cCtx.textAlign = 'left'");
    // Caption sits right of the R marker: centered it collided with head pins (nervous, endocrine).
    expect(source).toContain("PATIENT VIEW', 52, 16)");
    expect(source).toContain('background:linear-gradient(135deg,#0f172a,#1e293b)');
  });

  it.each(ANATOMY_PATHS)('keeps imported GLBs compatible with Blueprint mode and multi-material meshes in %s', (filePath) => {
    const source = readAnatomy(filePath);

    expect(source).toContain('Array.isArray(obj.material) ? obj.material : [obj.material]');
    expect(source).toContain('sourceMaterials.map(function(sourceMaterial)');
    expect(source).toContain("blueprintGroup.visible = resolvedStyle === 'blueprint'");
    expect(source).toContain('if (importedModel) importedModel.visible = importedVisible;');
    expect(source).toContain('imported.visible = importedVisible;');
    expect(source).toContain("Switch to 3D Surface to view it; Blueprint remains available.");
  });
});
