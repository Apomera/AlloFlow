import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CELL_PATHS = [
  'stem_lab/stem_tool_cell.js',
  'desktop/web-app/public/stem_lab/stem_tool_cell.js',
];
const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

beforeEach(() => resetStemLab());

describe('Cell microdissection experience', () => {
  it.each(CELL_PATHS)('renders the five-stage, scale-aware workspace from %s', (filePath) => {
    loadTool(filePath, 'cell');
    const html = renderTool('cell', { cell: {
      mode: 'microdissection',
      _cellPicked: true,
      _cellCategory: 'interactive',
      microCellType: 'bacterium',
      microStage: 3,
      microTool: 'laser',
      microStain: 'fluorescence',
      microTarget: 'nucleoid',
      microSectionDepth: 62,
    } });

    expect(html).toContain('data-cell-microdissection-workspace="true"');
    expect(html).toContain('data-cell-microdissection-canvas="true"');
    expect(html).toContain('Microdissection Studio');
    expect(html).toContain('1 µm field scale');
    expect(html).toContain('microtomes, optical sectioning, micropipettes, probes, and laser-capture systems');
    expect(html).toContain('Laser capture');
    expect(html).toContain('Collect target sample');
    expect(html).toContain('Section depth 62%');
    expect(html).toContain('Scale Journey');
    expect(html).toContain('Human body →');
    expect(html).not.toContain('data-cell-stage="true"');
  });

  it('shows recorded preparation and instrument metadata in the evidence log', () => {
    loadTool(CELL_PATHS[0], 'cell');
    const html = renderTool('cell', { cell: {
      mode: 'microdissection',
      microStage: 5,
      microCellType: 'animal',
      microTool: 'micropipette',
      microStain: 'nuclear',
      microTarget: 'nucleus',
      microEvidence: [{ id: 'e1', targetName: 'Nucleus', cellType: 'animal', tool: 'micropipette', stain: 'nuclear', sectionDepth: 44 }],
    } });

    expect(html).toContain('Protocol complete');
    expect(html).toContain('Nucleus');
    expect(html).toContain('micropipette');
    expect(html).toContain('nuclear');
    expect(html).toContain('depth 44%');
    expect(html).toContain('Clear evidence log');
  });

  it('guards the protocol order and records a bounded evidence trail', () => {
    const source = fs.readFileSync(CELL_PATHS[0], 'utf8');
    expect(source).toContain("microTool !== 'objective'");
    expect(source).toContain("microTool !== 'microtome'");
    expect(source).toContain("microStain === 'none'");
    expect(source).toContain("['microprobe', 'micropipette', 'laser'].indexOf(microTool) < 0");
    expect(source).toContain('microEvidence.concat([entry]).slice(-6)');
    expect(source).toContain("key: 'cell-micro-canvas'");
    expect(source).toContain('ref: microCanvasRefCb');
    expect(source).not.toContain("key: 'cell-micro-' + microType");
    expect(source).toContain('var cam = { x: 400, y: 300, zoom: initialZoom }');
    expect(source).toContain("height: '680px'");
    expect(source).toContain("title: 'PLANT CELL', subtitle: 'EUKARYOTE'");
    expect(source).toContain("'SELECTED STRUCTURE'");
    expect(source).toContain("'SECTION PLANE \\u2022 DEPTH '");
    expect(source).toContain("'MICRODISSECTION PROTOCOL'");
    expect(source).toContain("sel === 'cellWall' ? { x: 0.975");
    expect(source).toContain('function interiorGeometry(W, H, type, zoom)');
    expect(source).toContain('data-cell-comparison');
    expect(source).toContain('data-cell-guided-pathway');
    expect(source).toContain('GUIDED TRACE');
    expect(source).toContain('guideKeys');
    expect(source).toContain('reduced ? 4 : 14');
    expect(source).toContain('EVIDENCE SAMPLE');
    expect(source).toContain('aria-keyshortcuts');
    expect(source).toContain('ArrowRight ArrowLeft Enter Space');
    expect(source).toContain('interiorHighContrast');
    expect(source).toContain('HIGH CONTRAST');
    expect(source).toContain('data-cell-zoom-control');
    expect(source).toContain('DETAIL ZOOM');
    expect(source).toContain('data-cell-specialization-control');
    expect(source).toContain('data-cell-concept-check');
    expect(source).toContain('data-cell-concept-feedback');
    expect(source).toContain('data-cell-label-toggle');
    expect(source).toContain('data-cell-structure-directory');
    expect(source).toContain('data-cell-reset-view');
    expect(source).toContain('data-cell-depth-toggle');
    expect(source).toContain('data-cell-depth-control');
    expect(source).toContain('data-cell-structure-transcript');
    expect(source).toContain('Text transcript of cell diagram');
    expect(source).toContain('data-cell-microdissection-link');
    expect(source).toContain('data-cell-optical-handoff');
    expect(source).toContain('moveToMicrodissection');
    expect(source).toContain('returnToInterior');
    expect(source).toContain('data-cell-review-filter');
    expect(source).toContain('data-cell-mastery-controls');
    expect(source).toContain('Mark mastered');
    expect(source).toContain('interiorMastered');
    expect(source).toContain('CELL_PROGRESS_SCHEMA_VERSION');
    expect(source).toContain('normalizeCellProgress');
    expect(source).toContain('data-cell-progress-portability');
    expect(source).toContain('data-cell-progress-overview');
    expect(source).toContain('Portfolio overview');
    expect(source).toContain('Progress across cell types');
    expect(source).toContain('function switchInteriorType(nextType)');
    expect(source).toContain('Export progress');
    expect(source).toContain('Import progress');
    expect(source).toContain('Reset all progress');
    expect(source).toContain('data-cell-adaptive-quiz');
    expect(source).toContain('data-cell-learning-progress');
    expect(source).toContain('Study progress');
    expect(source).toContain('Open review queue');
    expect(source).toContain('aria-valuenow');
    expect(source).toContain('interiorAdaptiveQuiz');
    expect(source).toContain('Review-first retrieval');
    expect(source).toContain('answerAdaptiveQuiz');
    expect(source).toContain('OPTICAL SECTION');
    expect(source).toContain('Search structure directory');
    expect(source).toContain('Unexplored only');
    expect(source).toContain('resetInteriorView');
    expect(source).toContain('Mechanism:');
    expect(source).toContain('STUDY LABELS');
    expect(source).toContain('Check your reasoning before reveal');
    expect(source).toContain('This is a concept check, not an experiment prediction.');
    expect(source).toContain('SPECIALIZATION');
    expect(source).toContain('Compare cell architectures');
    expect(source).toContain('function traceInteriorBoundary');
    expect(source).toContain('cv.width, cv.height');
    expect(source).toContain('A bacterial flagellum extends beyond the cell wall');
    expect(source).toContain("name: 'Peroxisome'");
    expect(source).toContain("name: 'Plasmodesmata'");
    expect(source).toContain("name: 'Capsule (some bacteria)'");
    expect(source).toContain('Bacterial envelope ultrastructure: hydrated capsule and surface pili.');
    expect(source).toContain("type === 'bacterium' ? '1 µm' : '10 µm'");
  });
});

describe('Anatomy 3D overview and cross-scale handoffs', () => {
  it.each(ANATOMY_PATHS)('renders the optional 3D view while preserving its accessible alternative from %s', (filePath) => {
    loadTool(filePath, 'anatomy');
    const html = renderTool('anatomy', { anatomy: { _activeTab: 'explore', system: 'circulatory', complexity: 3, _bodyView3d: true } });

    expect(html).toContain('data-anatomy-view="3d"');
    expect(html).toContain('data-anatomy-3d-canvas="true"');
    expect(html).toContain('3D controls:');
    expect(html).toContain('Camera controls · drag/wheel where supported');
    expect(html).toContain('structure directory for precise labels and full keyboard access');
    expect(html).toContain('id="anatomy-3d-status"');
    expect(html).toContain('2D Atlas');
    expect(html).toContain('Cell scale');
    expect(html).toContain('Microscope');
    expect(html).not.toContain('data-anatomy-canvas="true"');
  });

  it('keeps the detailed 2D atlas as the default and explicit fallback', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const html = renderTool('anatomy', { anatomy: { _activeTab: 'explore', system: 'skeletal', complexity: 3 } });
    expect(html).toContain('data-anatomy-view="2d"');
    expect(html).toContain('data-anatomy-canvas="true"');
    expect(html).toContain('Diagram controls:');
    expect(html).not.toContain('data-anatomy-3d-canvas="true"');
  });

  it('uses the shared resilient 3D runtime and routes picked markers through normal selection state', () => {
    const source = fs.readFileSync(ANATOMY_PATHS[0], 'utf8');
    expect(source).toContain('window.StemLab.ensureThree({ orbit: true');
    expect(source).toContain('new THREE.OrbitControls(camera, canvas)');
    expect(source).toContain("updMulti(structureFocusPatch(id, { _lastSelectedSource: '3d' }))");
    expect(source).toContain('window.__alloAnatomy3dCleanup');
    expect(source).toContain('prefers-reduced-motion: reduce');
    expect(source).toContain('The accessible 2D anatomy view remains available.');
  });
});
describe('Anatomy CT/MRI Imaging Lab', () => {
  it.each(ANATOMY_PATHS)('renders a full-width non-diagnostic CT workspace from %s', (filePath) => {
    loadTool(filePath, 'anatomy');
    const html = renderTool('anatomy', { anatomy: {
      _activeTab: 'imaging',
      imaging: { modality: 'CT', region: 'chest', plane: 'axial', slice: 0, windowWidth: 1500, windowLevel: 0, showLabels: true, showCrosshair: true },
    } });
    expect(html).toContain('data-anatomy-imaging-workspace="true"');
    expect(html).toContain('data-anatomy-imaging-canvas="true"');
    expect(html).toContain('CT / MRI Imaging Lab');
    expect(html).toContain('Educational · non-diagnostic');
    expect(html).toContain('generated diagrams, not scans');
    expect(html).toContain('Slice 0 / 100');
    expect(html).toContain('Window width 1500');
    expect(html).toContain('Window level 0');
    expect(html).toContain('R/L refer to the patient');
    expect(html).not.toContain('data-anatomy-model-shell="true"');
    expect(html).not.toContain('data-anatomy-system-rail="true"');
    expect(html).not.toContain('data-anatomy-layer-bar="true"');
    expect(html).not.toContain('anatomy-badge-panel');
    expect(html).not.toContain('Clinical Cases (');
  });

  it('renders MRI sequence controls, annotations, and accessible structure guidance', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const html = renderTool('anatomy', { anatomy: {
      _activeTab: 'imaging',
      imaging: {
        modality: 'MRI', region: 'head', plane: 'coronal', slice: 42, sequence: 'T2', tool: 'ruler',
        annotations: [{ id: 'r1', type: 'ruler', x: 0.2, y: 0.3, x2: 0.7, y2: 0.3, distanceMm: 54.2, note: 'Ventricle span', modality: 'MRI', region: 'head', plane: 'coronal', slice: 42 }],
      },
    } });
    expect(html).toContain('MRI display contrast');
    expect(html).toContain('aria-label="MRI sequence"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>T2<\/button>/);
    expect(html).toContain('54.2 mm');
    expect(html).toContain('Ventricle span');
    expect(html).toContain('Brain hemispheres');
    expect(html).toContain('MRI signal intensity is sequence- and scanner-dependent');
  });

  it('offers privacy-aware bridges to established open-source imaging and anatomy projects', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const html = renderTool('anatomy', { anatomy: { _activeTab: 'imaging' } });
    expect(html).toContain('data-anatomy-open-source-bridge="true"');
    expect(html).toContain('https://viewer.ohif.org/');
    expect(html).toContain('https://www.cornerstonejs.org/live-examples/local');
    expect(html).toContain('https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html');
    expect(html).toContain('https://github.com/Z-Anatomy/Models-of-human-anatomy');
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
    expect(html).toContain('do not upload protected health information');
    expect(html).toContain('CC BY 4.0');
    expect(html).toContain('CC BY-SA 4.0');
    expect(html).toContain('mixed and NonCommercial licenses');
  });

  it('normalizes the phantom renderer while preserving valid zero values', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const draw = window.__alloAnatomyImagingPure?.drawAnatomyImagingSlice;
    expect(typeof draw).toBe('function');
    const noop = () => {};
    const context = {
      beginPath: noop, ellipse: noop, fill: noop, stroke: noop, fillRect: noop, moveTo: noop, lineTo: noop,
      save: noop, restore: noop, clearRect: noop, arc: noop, fillText: noop, setLineDash: noop,
      measureText: (text) => ({ width: String(text).length * 6 }),
    };
    const result = draw(context, 640, 480, { modality: 'CT', region: 'forged', plane: 'forged', slice: 0, windowWidth: 400, windowLevel: 0 });
    expect(result).toMatchObject({ modality: 'CT', region: 'chest', plane: 'axial', slice: 0, windowWidth: 400, windowLevel: 0 });
    expect(result.labelCount).toBeGreaterThan(3);
    const focused = draw(context, 640, 480, { modality: 'CT', region: 'chest', plane: 'axial', slice: 50, focusTerms: ['heart'] });
    expect(focused.focusLabelCount).toBeGreaterThan(0);
  });

  it.each(ANATOMY_PATHS)('renders a synchronized BodyScope spatial navigator from %s', (filePath) => {
    loadTool(filePath, 'anatomy');
    const html = renderTool('anatomy', { anatomy: {
      _activeTab: 'imaging',
      imaging: { modality: 'CT', region: 'abdomen', plane: 'sagittal', slice: 82 },
    } });
    expect(html).toContain('data-anatomy-bodyscope="true"');
    expect(html).toContain('data-bodyscope-region="abdomen"');
    expect(html).toContain('data-bodyscope-plane="sagittal"');
    expect(html).toContain('data-bodyscope-position="Left-sided slice band"');
    expect(html).toContain('data-bodyscope-locator="true"');
    expect(html).toContain('data-bodyscope-plane-mark="sagittal"');
    expect(html).toContain('BodyScope');
    expect(html).toContain('Many bowel loops lie anterior to the kidneys');
    expect(html).toContain('Which paired organs lie posterior to most bowel loops?');
    expect(html).toContain('data-bodyscope-choice="kidneys"');
    expect(html).toContain('data-bodyscope-depth-focus="field"');
    expect(html).toContain('data-bodyscope-depth="boundary"');
    expect(html).toContain('data-bodyscope-depth="anchor"');
    expect(html).toContain('Depth focus: Bowel and liver');
    expect(html).toContain('data-bodyscope-depth-ladder="field"');
    expect(html).toContain('data-depth-node="Abdominal wall"');
    expect(html).toMatch(/data-depth-node="Bowel and liver"[^>]*data-depth-focus="true"|data-depth-focus="true"[^>]*data-depth-node="Bowel and liver"/);
    expect(html).toContain('Posterior abdominal wall');
    expect(html).toContain('Depth sequence from superficial to deep');
  });

  it('normalizes BodyScope planes and returns precise orientation guidance', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const getProfile = window.__alloAnatomyImagingPure?.getBodyScopeSpatialProfile;
    expect(typeof getProfile).toBe('function');
    const fallback = getProfile('forged', 'forged', 0);
    expect(fallback).toMatchObject({
      region: 'chest',
      plane: 'axial',
      slice: 0,
      positionLabel: 'Inferior slice band',
      regionLabel: 'Thorax and mediastinum',
    });
    expect(fallback.orientation).toContain('patient right appears on the image’s left');
    expect(fallback.relations).toHaveLength(3);
    expect(fallback.depthLayers.map((layer) => layer.id)).toEqual(['boundary', 'field', 'anchor']);
    expect(fallback.depthLayers.find((layer) => layer.id === 'anchor')?.targets).toEqual(['heart']);
    expect(fallback.depthLayers.find((layer) => layer.id === 'anchor')?.path).toEqual(['Sternum', 'Heart', 'Esophagus and spine']);
    expect(fallback.depthLayers.find((layer) => layer.id === 'anchor')?.focusIndex).toBe(1);
    const posteriorHead = getProfile('head', 'coronal', 100);
    expect(posteriorHead.positionLabel).toBe('Posterior slice band');
    expect(posteriorHead.challenge.options.find((option) => option.correct)?.id).toBe('cerebellum');
  });

  it('renders validated BodyScope feedback and rejects forged saved answers', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const correct = renderTool('anatomy', { anatomy: {
      _activeTab: 'imaging',
      imaging: {
        region: 'abdomen', plane: 'sagittal', slice: 50,
        bodyScopeAnswers: { 'abdomen-sagittal': 'kidneys' },
      },
    } });
    const forged = renderTool('anatomy', { anatomy: {
      _activeTab: 'imaging',
      imaging: {
        region: 'abdomen', plane: 'sagittal', slice: 50,
        bodyScopeAnswers: { 'abdomen-sagittal': 'forged-answer' },
      },
    } });
    expect(correct).toContain('data-selected="true"');
    expect(correct).toContain('data-bodyscope-result="correct"');
    expect(correct).toContain('Spatial relationship matched.');
    expect(correct).toContain('The kidneys are retroperitoneal');
    expect(forged).not.toContain('data-bodyscope-result=');
  });

  it('emphasizes the selected BodyScope depth and safely falls back from forged state', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const anchor = renderTool('anatomy', { anatomy: {
      _activeTab: 'imaging',
      imaging: { region: 'abdomen', plane: 'axial', slice: 50, bodyScopeDepth: 'anchor' },
    } });
    const forged = renderTool('anatomy', { anatomy: {
      _activeTab: 'imaging',
      imaging: { region: 'head', plane: 'axial', slice: 50, bodyScopeDepth: 'forged-depth' },
    } });
    expect(anchor).toContain('data-bodyscope-depth-focus="anchor"');
    expect(anchor).toMatch(/data-bodyscope-depth="anchor"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-bodyscope-depth="anchor"/);
    expect(anchor).toContain('Depth focus: Kidneys');
    expect(anchor).toContain('Highlighted labels on the teaching slice: Kidneys.');
    expect(anchor).toContain('data-bodyscope-depth-ladder="anchor"');
    expect(anchor).toContain('data-depth-node="Bowel and peritoneum"');
    expect(anchor).toMatch(/data-depth-node="Kidneys"[^>]*data-depth-focus="true"|data-depth-focus="true"[^>]*data-depth-node="Kidneys"/);
    expect(anchor).toContain('Posterior wall and spine');
    expect(forged).toContain('data-bodyscope-depth-focus="field"');
    expect(forged).toContain('Depth focus: Brain');
    expect(forged).not.toContain('data-bodyscope-depth-focus="forged-depth"');
  });

  it('supports licensed local GLB files with a resilient procedural fallback', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const html = renderTool('anatomy', { anatomy: { _activeTab: 'explore', _bodyView3d: true, _body3dStyle: 'realistic' } });
    expect(html).toContain('Import local GLB');
    expect(html).toContain('accept=".glb,model/gltf-binary"');
    expect(html).toContain('The file is not uploaded');
    const source = fs.readFileSync(ANATOMY_PATHS[0], 'utf8');
    expect(source).toContain('three-gltf-loader');
    expect(source).toContain('new THREE.GLTFLoader().load');
    expect(source).toContain('silhouetteGroup.visible = true');
    expect(source).toContain('imported.visible = importedVisible;');
    expect(source).toContain(".catch(function() { return THREE; })");
    expect(source).toContain('Preserve the model source attribution and share-alike terms.');
    expect(source).toContain('allImagingAnnotations.concat([ruler]).slice(-12)');
  });
});

describe('Integrated scan-to-cell procedure', () => {
  it.each(ANATOMY_PATHS)('renders a focused layered-tissue procedure workspace from %s', (filePath) => {
    loadTool(filePath, 'anatomy');
    const html = renderTool('anatomy', { anatomy: {
      _activeTab: 'procedure',
      procedure: {
        stage: 3, planLocked: true, planSlice: 58, timeoutConfirmed: true, sterilePrep: true, eyeProtection: true,
        tool: 'retractor', pressure: 5, angle: 45, incisionDepth: 64, exposure: 38, bleeding: 24, tissueDamage: 7, sampleIntegrity: 96, actions: 4,
      },
    } });
    expect(html).toContain('data-anatomy-procedure-workspace="true"');
    expect(html).toContain('data-anatomy-procedure-canvas="true"');
    expect(html).toContain('Scan-to-cell Procedure Studio');
    expect(html).toContain('Synthetic practice only:');
    expect(html).toContain('Never use it for patient care');
    expect(html).toContain('Control field');
    expect(html).toContain('Depth</div><div class="text-lg font-black text-slate-900">64%');
    expect(html).toContain('Use Retractor without drawing');
    expect(html).toContain('Direct control:');
    expect(html).toContain('Gesture replay and coaching');
    expect(html).toContain('aria-keyshortcuts="Enter Space ArrowUp ArrowDown [ ] F"');
    expect(html).toContain('Pressure 5 / 10');
    expect(html).toContain('Blade approach angle 45°');
    expect(html).not.toContain('data-anatomy-model-shell="true"');
    expect(html).not.toContain('data-anatomy-system-rail="true"');
  });

  it('connects scan planning, preparation, specimen handoff, and debrief states', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const planning = renderTool('anatomy', { anatomy: { _activeTab: 'procedure', procedure: { stage: 0, planSlice: 58 } } });
    expect(planning).toContain('data-procedure-planning-scan="true"');
    expect(planning).toContain('Planning slice 58 / 100');
    expect(planning).toContain('Lock scan plan');
    expect(planning).toContain('Case: Central target');

    const prep = renderTool('anatomy', { anatomy: { _activeTab: 'procedure', procedure: { stage: 1, planLocked: true, timeoutConfirmed: true, sterilePrep: true, eyeProtection: true } } });
    expect(prep).toContain('Preparation checkpoint');
    expect(prep).toContain('Begin layered simulation');

    const handoff = renderTool('anatomy', { anatomy: { _activeTab: 'procedure', procedure: { stage: 5, specimenCollected: true, specimenId: 'spec-1', sampleIntegrity: 91 } } });
    expect(handoff).toContain('Specimen handoff');
    expect(handoff).toContain('Continue to Cell Microdissection');

    const debrief = renderTool('anatomy', { anatomy: { _activeTab: 'procedure', procedure: { stage: 6, planLocked: true, planSlice: 58, timeoutConfirmed: true, sterilePrep: true, eyeProtection: true, specimenCollected: true, sampleIntegrity: 92, microscopyComplete: true, actions: 8, tissueDamage: 5, bleeding: 8 } } });
    expect(debrief).toContain('data-procedure-debrief="true"');
    expect(debrief).toContain('Performance debrief');
    expect(debrief).toContain('Microscopy');
    expect(debrief).toContain('/100');
  });

  it('normalizes hostile state, renders tissue layers, and scores the evidence chain deterministically', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    expect(typeof pure?.normalize).toBe('function');
    expect(typeof pure?.evaluate).toBe('function');
    expect(typeof pure?.draw).toBe('function');
    expect(pure.normalize({ stage: 99, pressure: -4, angle: 999, tool: 'unsafe', actionLog: [{ label: 'ok' }, null] })).toMatchObject({ stage: 6, pressure: 1, angle: 90, tool: 'scalpel', actionLog: [{ label: 'ok' }] });
    const score = pure.evaluate({ stage: 6, planLocked: true, planSlice: 58, timeoutConfirmed: true, sterilePrep: true, eyeProtection: true, specimenCollected: true, sampleIntegrity: 100, microscopyComplete: true, actions: 8, tissueDamage: 0, bleeding: 0 });
    expect(score).toMatchObject({ total: 100, planning: 20, preparation: 15, safety: 25, specimen: 15, efficiency: 15, microscopy: 10, label: 'Ready to extend' });
    const noop = () => {};
    const context = { save: noop, restore: noop, clearRect: noop, fillRect: noop, fillText: noop, beginPath: noop, ellipse: noop, fill: noop, stroke: noop, moveTo: noop, lineTo: noop, arc: noop };
    expect(pure.draw(context, 760, 440, { tool: 'forceps', incisionDepth: 70, exposure: 55, bleeding: 12, tissueDamage: 4, specimenCollected: true })).toMatchObject({ tool: 'forceps', incisionDepth: 70, exposure: 55, bleeding: 12, tissueDamage: 4, specimenCollected: true });
  });

  it.each(CELL_PATHS)('shows procedure provenance and a return-to-debrief path in %s', (filePath) => {
    loadTool(filePath, 'cell');
    const html = renderTool('cell', {
      anatomy: { procedure: { stage: 5, microscopyComplete: true, specimenId: 'spec-1' } },
      cell: {
        mode: 'microdissection', microStage: 5, microCellType: 'animal', microTool: 'laser', microStain: 'nuclear', microTarget: 'nucleus',
        procedureSpecimen: { id: 'spec-1', source: 'anatomy-procedure', targetName: 'Synthetic thoracic tissue target', sampleIntegrity: 93, planSlice: 58 },
        microEvidence: [{ id: 'e-proc', targetName: 'Nucleus', cellType: 'animal', tool: 'laser', stain: 'nuclear', sectionDepth: 50 }],
      },
    });
    expect(html).toContain('data-procedure-specimen-handoff="true"');
    expect(html).toContain('Integrated procedure specimen');
    expect(html).toContain('preserved integrity 93%');
    expect(html).toContain('planned at CT slice 58');
    expect(html).toContain('Return to procedure debrief');
  });

  it('records microscopy completion atomically into the anatomy procedure state', () => {
    const source = fs.readFileSync(CELL_PATHS[0], 'utf8');
    expect(source).toContain("procedureSpecimen.source === 'anatomy-procedure'");
    expect(source).toContain('anatomyState.procedure = Object.assign');
    expect(source).toContain('microscopyComplete: true');
    expect(source).toContain("_activeTab: 'procedure'");
    const anatomySource = fs.readFileSync(ANATOMY_PATHS[0], 'utf8');
    expect(anatomySource).toContain("next.cell = Object.assign({}, next.cell || {}, { mode: 'microdissection'");
    expect(anatomySource).toContain("actionLog: procedure.actionLog.concat([entry]).slice(-14)");
    expect(anatomySource).toContain("if (!collected && complication === 'none' && depth >= caseMeta.requiredDepth && exposure >= 50 && bleeding <= 35) stage = 4");
  });
});
describe('Procedure direct manipulation and replay', () => {
  it('analyzes controlled and wandering strokes with bounded deterministic metrics', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const controlled = pure.analyzeStroke({ tool: 'scalpel', input: 'pen', points: [
      { x: 0.5, y: 0.12, pressure: 0.42, time: 1000 },
      { x: 0.5, y: 0.36, pressure: 0.42, time: 1300 },
      { x: 0.5, y: 0.61, pressure: 0.42, time: 1600 },
    ] });
    const wandering = pure.analyzeStroke({ tool: 'scalpel', points: [
      { x: 0.24, y: 0.12, pressure: 0.2, time: 1000 },
      { x: 0.8, y: 0.3, pressure: 0.95, time: 1080 },
      { x: 0.18, y: 0.6, pressure: 0.1, time: 1160 },
    ] });
    expect(controlled).toMatchObject({ pointCount: 3, meanPressure: 0.42, precision: 100, steadiness: 100, pathAngle: 90 });
    expect(controlled.maxDepth).toBeGreaterThanOrEqual(60);
    expect(controlled.quality).toBeGreaterThan(90);
    expect(wandering.precision).toBeLessThan(controlled.precision);
    expect(wandering.control).toBeLessThan(controlled.control);
    expect(wandering.recommendation).toContain('centerline');
    expect(pure.normalizeStroke({ tool: 'unsafe', input: 'unknown', points: [{ x: -4, y: 7, pressure: 8, time: -1 }] })).toMatchObject({ tool: 'scalpel', input: 'mouse', points: [{ x: 0, y: 1, pressure: 1, time: 0 }] });
  });

  it('applies gestures to tissue state, preserves bounded replay, and supports undo', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const initial = { stage: 2, planLocked: true, timeoutConfirmed: true, sterilePrep: true, eyeProtection: true, tool: 'scalpel', pressure: 4, incisionDepth: 0, exposure: 0, bleeding: 0, tissueDamage: 0, actions: 0 };
    const afterCut = pure.applyStroke(initial, { id: 'cut-1', tool: 'scalpel', input: 'pen', endedAt: 1600, points: [
      { x: 0.5, y: 0.12, pressure: 0.4, time: 1000 },
      { x: 0.5, y: 0.61, pressure: 0.4, time: 1600 },
    ] });
    expect(afterCut.stage).toBe(3);
    expect(afterCut.incisionDepth).toBeGreaterThanOrEqual(60);
    expect(afterCut.actions).toBe(1);
    expect(afterCut.strokes).toHaveLength(1);
    expect(afterCut.strokes[0].metrics.precision).toBe(100);
    expect(afterCut.actionLog[0].label).toContain('Scalpel gesture');
    const undone = pure.undoStroke(afterCut);
    expect(undone).toMatchObject({ stage: 2, incisionDepth: 0, exposure: 0, bleeding: 0, tissueDamage: 0, actions: 0, strokes: [] });

    const collected = pure.applyStroke({ ...afterCut, stage: 4, incisionDepth: 70, exposure: 65, bleeding: 18, tissueDamage: 5, tool: 'forceps' }, { id: 'pick-1', tool: 'forceps', input: 'touch', points: [
      { x: 0.5, y: 0.68, pressure: 0.35, time: 2000 },
      { x: 0.57, y: 0.78, pressure: 0.35, time: 2550 },
    ] });
    expect(collected).toMatchObject({ stage: 5, specimenCollected: true });
    expect(collected.sampleIntegrity).toBeGreaterThan(80);
    expect(collected.feedback).toContain('Specimen preserved');
  });

  it.each(ANATOMY_PATHS)('renders replay metrics, adaptive coaching, intensity controls, and heatmap state from %s', (filePath) => {
    loadTool(filePath, 'anatomy');
    const html = renderTool('anatomy', { anatomy: { _activeTab: 'procedure', procedure: {
      stage: 3, planLocked: true, timeoutConfirmed: true, sterilePrep: true, eyeProtection: true, tool: 'scalpel', incisionDepth: 62,
      showReplay: true, reducedVisuals: true, actions: 1,
      strokes: [{ id: 's1', tool: 'scalpel', input: 'pen', points: [{ x: 0.5, y: 0.12, pressure: 0.4, time: 1000 }, { x: 0.5, y: 0.61, pressure: 0.4, time: 1600 }], before: { stage: 2, incisionDepth: 0 }, metrics: { precision: 98, steadiness: 96, meanPressure: 0.4, control: 94, quality: 96, pathAngle: 90, speed: 0.82, recommendation: 'Controlled path. Preserve this pace and alignment.' } }],
      actionLog: [{ id: 's1', label: 'Scalpel gesture · 96% control', tool: 'scalpel', depth: 62 }],
    } } });
    expect(html).toContain('data-procedure-replay="true"');
    expect(html).toContain('data-procedure-stroke-metrics="true"');
    expect(html).toContain('Hide path heatmap');
    expect(html).toContain('Use standard visual intensity');
    expect(html).toContain('Precision</div><div class="text-sm font-black text-slate-900">98%');
    expect(html).toContain('Adaptive coach:');
    expect(html).toContain('Path angle</div><div class="text-sm font-black text-slate-900">90°');
    expect(html).toContain('Relative speed</div><div class="text-sm font-black text-slate-900">0.82');
    expect(html).toContain('Cyan dashed = planned route');
    expect(html).toContain('Undo last gesture');
  });

  it('keeps pointer capture, touch behavior, keyboard parity, bounded strokes, and replay rendering in source', () => {
    const source = fs.readFileSync(ANATOMY_PATHS[0], 'utf8');
    expect(source).toContain('onPointerDown: beginProcedureGesture');
    expect(source).toContain('canvas.setPointerCapture(event.pointerId)');
    expect(source).toContain("touchAction: 'none'");
    expect(source).toContain("event.key === 'Enter' || event.key === ' '");
    expect(source).toContain("strokes: state.strokes.concat([stroke]).slice(-12)");
    expect(source).toContain('canvas._procedureStroke.length > 96');
    expect(source).toContain('state.reducedVisuals ? 0');
    expect(source).toContain("impact < 60 ? '#fb7185'");
  });
});
describe('Procedure tissue realism and recoverable model events', () => {
  it('maps depth to distinct tissue resistance and measures segment proximity', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    expect(pure.tissueResponse(0)).toMatchObject({ id: 'skin', resistance: 38 });
    expect(pure.tissueResponse(12)).toMatchObject({ id: 'adipose', resistance: 18 });
    expect(pure.tissueResponse(32)).toMatchObject({ id: 'fascia', resistance: 82 });
    expect(pure.tissueResponse(50)).toMatchObject({ id: 'muscle', resistance: 58 });
    expect(pure.tissueResponse(80)).toMatchObject({ id: 'target', resistance: 44 });
    expect(pure.distanceToHazard([{ x: 0.2, y: 0.55 }, { x: 0.5, y: 0.55 }], 0.36, 0.55)).toBe(0);
    expect(pure.distanceToHazard([{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }], 0.69, 0.64)).toBeGreaterThan(0.6);
  });

  it('detects a vessel event, resolves it with a bounded model gesture, and restores it with undo', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const initial = { stage: 3, incisionDepth: 60, exposure: 55, bleeding: 8, tissueDamage: 3, tool: 'scalpel', actions: 2 };
    const event = pure.applyStroke(initial, { id: 'vessel-hit', tool: 'scalpel', points: [
      { x: 0.36, y: 0.45, pressure: 0.5, time: 1000 },
      { x: 0.36, y: 0.66, pressure: 0.5, time: 1400 },
    ] });
    expect(event).toMatchObject({ complication: 'vessel_bleed', hazardEvents: 1 });
    expect(event.vesselIntegrity).toBeLessThan(100);
    expect(event.bleeding).toBeGreaterThan(initial.bleeding);
    expect(event.complicationLog.at(-1)).toMatchObject({ type: 'vessel_bleed', resolved: false });
    expect(event.strokes.at(-1).metrics.vesselDistance).toBe(0);

    const restored = pure.undoStroke(event);
    expect(restored).toMatchObject({ complication: 'none', hazardEvents: 0, vesselIntegrity: 100, bleeding: 8 });
    expect(restored.complicationLog).toEqual([]);

    const resolved = pure.applyStroke({ ...event, tool: 'cautery' }, { id: 'controlled-cautery', tool: 'cautery', points: [
      { x: 0.34, y: 0.54, pressure: 0.5, time: 1800 },
      { x: 0.38, y: 0.56, pressure: 0.5, time: 2200 },
    ] });
    expect(resolved.complication).toBe('none');
    expect(resolved.complicationSeverity).toBe(0);
    expect(resolved.complicationLog.at(-1)).toMatchObject({ type: 'vessel_bleed', resolved: true });
    expect(resolved.feedback).toContain('resolved');
  });

  it('models nerve contact, tissue tear, thermal spread, and specimen compression as distinct events', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const nerve = pure.applyStroke({ stage: 3, incisionDepth: 60, exposure: 55, tool: 'scalpel' }, { tool: 'scalpel', points: [
      { x: 0.69, y: 0.5, pressure: 0.45, time: 1000 }, { x: 0.69, y: 0.7, pressure: 0.45, time: 1400 },
    ] });
    expect(nerve.complication).toBe('nerve_contact');
    expect(nerve.nerveIntegrity).toBeLessThan(100);

    const tear = pure.applyStroke({ stage: 3, incisionDepth: 70, exposure: 20, tool: 'retractor' }, { tool: 'retractor', points: [
      { x: 0.25, y: 0.52, pressure: 0.9, time: 1000 }, { x: 0.75, y: 0.52, pressure: 0.9, time: 1500 },
    ] });
    expect(tear.complication).toBe('tissue_tear');
    expect(tear.tearLevel).toBeGreaterThan(50);

    const thermal = pure.applyStroke({ stage: 3, incisionDepth: 70, exposure: 55, tool: 'cautery' }, { tool: 'cautery', points: [
      { x: 0.5, y: 0.38, pressure: 0.9, time: 1000 }, { x: 0.5, y: 0.48, pressure: 0.9, time: 1500 },
    ] });
    expect(thermal.complication).toBe('thermal_spread');
    expect(thermal.thermalLoad).toBeGreaterThan(0);

    const crushed = pure.applyStroke({ stage: 4, incisionDepth: 70, exposure: 65, bleeding: 10, tool: 'forceps' }, { tool: 'forceps', points: [
      { x: 0.5, y: 0.68, pressure: 0.9, time: 1000 }, { x: 0.57, y: 0.78, pressure: 0.9, time: 1500 },
    ] });
    expect(crushed).toMatchObject({ complication: 'specimen_crush', specimenCollected: false });
    expect(crushed.sampleIntegrity).toBeLessThan(100);
  });

  it.each(ANATOMY_PATHS)('renders deformable tissue feedback, anatomy guides, and checkpoint recovery from %s', (filePath) => {
    loadTool(filePath, 'anatomy');
    const html = renderTool('anatomy', { anatomy: { _activeTab: 'procedure', procedure: {
      stage: 3, incisionDepth: 62, exposure: 60, bleeding: 52, tool: 'cautery', showHazards: true,
      vesselIntegrity: 58, nerveIntegrity: 92, complication: 'vessel_bleed', complicationSeverity: 68, hazardEvents: 1,
      strokes: [{ id: 'v1', tool: 'scalpel', points: [{ x: 0.36, y: 0.45, pressure: 0.5, time: 1000 }, { x: 0.36, y: 0.66, pressure: 0.5, time: 1400 }], before: { complication: 'none' } }],
      complicationLog: [{ id: 'hazard-1', type: 'vessel_bleed', severity: 68, resolved: false, label: 'The gesture intersected the highlighted synthetic vessel.' }],
    } } });
    expect(html).toContain('data-procedure-tissue-response="true"');
    expect(html).toContain('Live tissue response');
    expect(html).toContain('Muscle · directional stretch');
    expect(html).toContain('Resistance</dt><dd class="font-black text-slate-900">58%');
    expect(html).toContain('Vessel integrity</dt><dd class="font-black text-slate-900">58%');
    expect(html).toContain('Hide anatomy guides');
    expect(html).toContain('data-procedure-complication="vessel_bleed"');
    expect(html).toContain('Synthetic vessel-source event');
    expect(html).toContain('Restore previous checkpoint');
    expect(html).toContain('data-procedure-event-history="true"');
  });

  it('draws deformation, hazards, and instrument-following state without mutating inputs', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const noop = () => {};
    const context = { save: noop, restore: noop, clearRect: noop, fillRect: noop, fillText: noop, beginPath: noop, closePath: noop, ellipse: noop, fill: noop, stroke: noop, moveTo: noop, lineTo: noop, arc: noop, setLineDash: noop };
    const input = { stage: 3, tool: 'retractor', incisionDepth: 62, exposure: 60, complication: 'tissue_tear', complicationSeverity: 64, showHazards: true, strokes: [{ id: 'r1', tool: 'retractor', points: [{ x: 0.3, y: 0.5, pressure: 0.82, time: 1 }, { x: 0.7, y: 0.5, pressure: 0.82, time: 2 }] }] };
    const snapshot = JSON.stringify(input);
    const result = pure.draw(context, 760, 440, input);
    expect(result).toMatchObject({ tissue: 'muscle', resistance: 58, complication: 'tissue_tear', hazardsVisible: true });
    expect(result.deformation).toBeGreaterThan(0);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('keeps model-event state bounded and exposes the realism contracts in source', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const complicationLog = Array.from({ length: 15 }, (_, index) => ({ id: String(index), type: 'vessel_bleed', label: 'event ' + index }));
    const normalized = pure.normalize({ complication: 'forged', vesselIntegrity: -8, nerveIntegrity: 500, thermalLoad: 999, tearLevel: -4, complicationLog });
    expect(normalized).toMatchObject({ complication: 'none', vesselIntegrity: 0, nerveIntegrity: 100, thermalLoad: 100, tearLevel: 0 });
    expect(normalized.complicationLog).toHaveLength(8);
    const source = fs.readFileSync(ANATOMY_PATHS[0], 'utf8');
    expect(source).toContain('function registerComplication');
    expect(source).toContain('vesselDistance <= 0.06');
    expect(source).toContain('nerveDistance <= 0.055');
    expect(source).toContain('state.exposure * 0.22');
    expect(source).toContain('drawAnatomyProcedureInstrument');
  });
});
describe('Procedure case variation and optical field feedback', () => {
  it('normalizes deterministic cases and scores each case against its own planning slice', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    expect(pure.getCase('standard')).toMatchObject({ label: 'Central target', planSlice: 58, requiredDepth: 66 });
    expect(pure.getCase('lateral')).toMatchObject({ label: 'Lateral target', planSlice: 44, requiredDepth: 68 });
    expect(pure.getCase('deep')).toMatchObject({ label: 'Deep target', planSlice: 72, requiredDepth: 72 });
    expect(pure.getCase('forged')).toMatchObject({ id: 'standard' });
    expect(pure.normalize({ caseId: 'forged', illumination: 'unsafe', showLoupe: true })).toMatchObject({ caseId: 'standard', illumination: 'standard', showLoupe: true });
    expect(pure.evaluate({ caseId: 'deep', planLocked: true, planSlice: 72 }).planning).toBe(20);
    expect(pure.evaluate({ caseId: 'deep', planLocked: true, planSlice: 58 }).planning).toBeLessThan(20);
  });

  it('shifts hazard detection and collection depth with the selected synthetic case', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const lateralEvent = pure.applyStroke({ caseId: 'lateral', stage: 3, incisionDepth: 65, exposure: 55, tool: 'scalpel' }, { tool: 'scalpel', points: [
      { x: 0.42, y: 0.48, pressure: 0.45, time: 1000 }, { x: 0.42, y: 0.68, pressure: 0.45, time: 1500 },
    ] });
    expect(lateralEvent.complication).toBe('vessel_bleed');
    expect(lateralEvent.strokes.at(-1).metrics.vesselDistance).toBe(0);
    const forcepsStroke = { tool: 'forceps', points: [{ x: 0.48, y: 0.74, pressure: 0.4, time: 1000 }, { x: 0.54, y: 0.84, pressure: 0.4, time: 1500 }] };
    const tooShallow = pure.applyStroke({ caseId: 'deep', stage: 4, incisionDepth: 70, exposure: 65, bleeding: 8, tool: 'forceps' }, forcepsStroke);
    expect(tooShallow.specimenCollected).toBe(false);
    expect(tooShallow.feedback).toContain('target depth');
    expect(pure.applyStroke({ caseId: 'deep', stage: 4, incisionDepth: 72, exposure: 65, bleeding: 8, tool: 'forceps' }, forcepsStroke)).toMatchObject({ stage: 5, specimenCollected: true });
  });

  it('derives visibility from field conditions and renders case and optical controls in both copies', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    expect(pure.visibility({ exposure: 70, bleeding: 5, illumination: 'focused' }).label).toBe('Clear');
    expect(pure.visibility({ exposure: 40, bleeding: 28, illumination: 'standard' }).label).toBe('Workable');
    expect(pure.visibility({ exposure: 15, bleeding: 70, thermalLoad: 50, complication: 'vessel_bleed', illumination: 'soft' })).toMatchObject({ score: 0, label: 'Obscured' });
    ANATOMY_PATHS.forEach((filePath) => {
      loadTool(filePath, 'anatomy');
      const planning = renderTool('anatomy', { anatomy: { _activeTab: 'procedure', procedure: { stage: 0, caseId: 'deep', planSlice: 72 } } });
      expect(planning).toContain('data-procedure-case-selector="true"');
      expect(planning).toContain('Advanced · fibrotic · slice 72');
      expect(planning).toContain('Case: Deep target');
      const working = renderTool('anatomy', { anatomy: { _activeTab: 'procedure', procedure: { stage: 3, caseId: 'lateral', incisionDepth: 62, exposure: 60, bleeding: 20, illumination: 'focused', showLoupe: true } } });
      expect(working).toContain('data-procedure-optics="true"');
      expect(working).toContain('Lateral target synthetic layered tissue model');
      expect(working).toContain('Visibility</dt>');
      expect(working).toContain('Hide 2× view');
      expect(working).toMatch(/aria-pressed="true"[^>]*>Focused<\/button>/);
    });
  });

  it('returns case, visibility, and loupe telemetry without mutation and exposes source contracts', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const noop = () => {};
    const context = { save: noop, restore: noop, clearRect: noop, fillRect: noop, fillText: noop, beginPath: noop, closePath: noop, ellipse: noop, fill: noop, stroke: noop, moveTo: noop, lineTo: noop, arc: noop, setLineDash: noop };
    const state = { caseId: 'deep', stage: 3, tool: 'forceps', incisionDepth: 72, exposure: 65, bleeding: 8, illumination: 'focused', showLoupe: true, showHazards: true };
    const snapshot = JSON.stringify(state);
    expect(pure.draw(context, 760, 440, state)).toMatchObject({ caseId: 'deep', visibilityLabel: 'Clear', loupe: true, hazardsVisible: true });
    expect(JSON.stringify(state)).toBe(snapshot);
    const source = fs.readFileSync(ANATOMY_PATHS[0], 'utf8');
    expect(source).toContain('var ANATOMY_PROCEDURE_CASES');
    expect(source).toContain('depth >= caseMeta.requiredDepth');
    expect(source).toContain('anatomyProcedureStrokeDistance(stroke.points, caseMeta.targetX, caseMeta.targetY)');
    expect(source).toContain("state.viewZoom.toFixed(1)");
  });
});
describe('Procedure coordination, challenge mode, and repeat practice', () => {
  it('normalizes bounded coordination settings and attempt history', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const attempts = Array.from({ length: 9 }, (_, index) => ({ id: 'a' + index, score: index * 20, caseId: index % 2 ? 'deep' : 'forged', mode: index % 2 ? 'challenge' : 'guided', integrity: 120, hazards: -2, actions: 1001 }));
    const state = pure.normalize({ assistTool: 'unsafe', practiceMode: 'unsafe', toolChanges: -4, coordinationUses: 1001, hintUses: 3.8, attempts });
    expect(state).toMatchObject({ assistTool: 'none', practiceMode: 'guided', toolChanges: 0, coordinationUses: 999, hintUses: 4 });
    expect(state.attempts).toHaveLength(5);
    expect(state.attempts[0]).toMatchObject({ id: 'a4', caseId: 'standard', score: 80, integrity: 100, hazards: 0, actions: 999 });
  });

  it('applies retractor and suction assistance as real coordinated effects and restores them with undo', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const retractorAssist = pure.applyStroke({ stage: 3, incisionDepth: 60, exposure: 20, bleeding: 12, tool: 'scalpel', assistTool: 'retractor' }, { tool: 'scalpel', points: [
      { x: 0.5, y: 0.48, pressure: 0.4, time: 1000 }, { x: 0.5, y: 0.6, pressure: 0.4, time: 1500 },
    ] });
    expect(retractorAssist.exposure).toBeGreaterThan(20);
    expect(retractorAssist.coordinationUses).toBe(1);
    expect(retractorAssist.strokes.at(-1).metrics).toMatchObject({ assistTool: 'retractor' });
    expect(retractorAssist.strokes.at(-1).metrics.coordinationBenefit).toContain('exposure');
    expect(retractorAssist.feedback).toContain('Coordinated assist');
    expect(pure.undoStroke(retractorAssist)).toMatchObject({ exposure: 20, coordinationUses: 0 });

    const suctionAssist = pure.applyStroke({ stage: 3, incisionDepth: 70, exposure: 20, bleeding: 50, tool: 'retractor', assistTool: 'suction' }, { tool: 'retractor', points: [
      { x: 0.38, y: 0.55, pressure: 0.45, time: 1000 }, { x: 0.62, y: 0.55, pressure: 0.45, time: 1500 },
    ] });
    expect(suctionAssist.bleeding).toBeLessThan(50);
    expect(suctionAssist.coordinationUses).toBe(1);
    expect(suctionAssist.strokes.at(-1).metrics.coordinationBenefit).toContain('fluid');
  });

  it('derives an objective board and accounts for coordination, switches, and hints in efficiency', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const objectives = pure.objectives({ caseId: 'standard', planLocked: true, planSlice: 58, timeoutConfirmed: true, sterilePrep: true, eyeProtection: true, incisionDepth: 68, tissueDamage: 8, exposure: 60, bleeding: 10, coordinationUses: 2, specimenCollected: true, sampleIntegrity: 90 });
    expect(objectives).toHaveLength(6);
    expect(objectives.every((item) => item.complete)).toBe(true);
    const efficient = pure.evaluate({ actions: 8, coordinationUses: 4, toolChanges: 4, hintUses: 0 });
    const inefficient = pure.evaluate({ actions: 8, coordinationUses: 0, toolChanges: 12, hintUses: 8 });
    expect(efficient.efficiency).toBe(15);
    expect(inefficient.efficiency).toBeLessThan(efficient.efficiency);
  });

  it.each(ANATOMY_PATHS)('renders the two-hand tray, challenge hint gate, objectives, and comparisons from %s', (filePath) => {
    loadTool(filePath, 'anatomy');
    const html = renderTool('anatomy', { anatomy: { _activeTab: 'procedure', procedure: {
      stage: 3, practiceMode: 'challenge', showHazards: false, assistTool: 'suction', tool: 'scalpel', incisionDepth: 62, exposure: 48, bleeding: 28, actions: 2,
      attempts: [{ id: 'a1', score: 72, caseId: 'standard', mode: 'guided', integrity: 88, hazards: 1, actions: 9 }],
      strokes: [{ id: 's1', tool: 'scalpel', points: [{ x: 0.5, y: 0.3, pressure: 0.4, time: 1000 }, { x: 0.5, y: 0.6, pressure: 0.4, time: 1500 }], metrics: { precision: 90, steadiness: 92, meanPressure: 0.4, control: 91, quality: 91, pathAngle: 90, speed: 0.6, recommendation: 'Preserve the controlled path.' } }],
    } } });
    expect(html).toContain('data-procedure-practice-mode="challenge"');
    expect(html).toContain('data-procedure-instrument-tray="true"');
    expect(html).toContain('aria-label="Active procedure instrument"');
    expect(html).toContain('aria-label="Assisting procedure instrument"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>Suction assist/);
    expect(html).toContain('data-procedure-objectives="true"');
    expect(html).toContain('Use an assisting instrument effectively');
    expect(html).toContain('data-procedure-reveal-hint="true"');
    expect(html).not.toContain('data-procedure-coach="visible"');
    expect(html).toContain('data-procedure-attempt-history="true"');
    expect(html).toContain('Best 72/100');
    expect(html).toContain('Archive attempt and reset');
  });

  it('renders the assisting instrument and exposes coordination telemetry without mutation', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const noop = () => {};
    const context = { save: noop, restore: noop, clearRect: noop, fillRect: noop, fillText: noop, beginPath: noop, closePath: noop, ellipse: noop, fill: noop, stroke: noop, moveTo: noop, lineTo: noop, arc: noop, setLineDash: noop };
    const state = { stage: 3, tool: 'scalpel', assistTool: 'retractor', coordinationUses: 3, incisionDepth: 62, exposure: 55, bleeding: 12 };
    const snapshot = JSON.stringify(state);
    expect(pure.draw(context, 760, 440, state)).toMatchObject({ assistTool: 'retractor', coordinationUses: 3 });
    expect(JSON.stringify(state)).toBe(snapshot);
    const source = fs.readFileSync(ANATOMY_PATHS[0], 'utf8');
    expect(source).toContain("state.assistTool === 'retractor'");
    expect(source).toContain("state.assistTool === 'suction'");
    expect(source).toContain("'data-procedure-instrument-tray': 'true'");
    expect(source).toContain("'data-procedure-objectives': 'true'");
  });
});
describe('Procedure camera control and tissue behavior', () => {
  it('normalizes bounded camera, elastic, and compression state', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    expect(pure.normalize({ viewFocus: 'unsafe', viewZoom: 9, focusLock: true, elasticTension: -4, compressionLevel: 500 }))
      .toMatchObject({ viewFocus: 'instrument', viewZoom: 3, focusLock: true, elasticTension: 0, compressionLevel: 100 });
    expect(pure.normalize({ viewFocus: 'nerve', viewZoom: 0.2 }))
      .toMatchObject({ viewFocus: 'nerve', viewZoom: 1 });
  });

  it('models retraction tension, unsupported recoil, assisted exposure, and forceps compression', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const retracted = pure.applyStroke({ stage: 3, incisionDepth: 70, exposure: 20, tool: 'retractor' }, { tool: 'retractor', points: [
      { x: 0.34, y: 0.52, pressure: 0.5, time: 1000 }, { x: 0.68, y: 0.52, pressure: 0.5, time: 1500 },
    ] });
    expect(retracted.elasticTension).toBeGreaterThan(0);
    const released = pure.applyStroke({ ...retracted, tool: 'suction', assistTool: 'none' }, { tool: 'suction', points: [
      { x: 0.46, y: 0.58, pressure: 0.4, time: 1800 }, { x: 0.54, y: 0.58, pressure: 0.4, time: 2200 },
    ] });
    expect(released.exposure).toBeLessThan(retracted.exposure);
    expect(released.elasticTension).toBeLessThan(retracted.elasticTension);
    expect(released.strokes.at(-1).metrics.elasticReturn).toBeGreaterThan(0);

    const assisted = pure.applyStroke({ ...retracted, tool: 'suction', assistTool: 'retractor' }, { tool: 'suction', points: [
      { x: 0.46, y: 0.58, pressure: 0.4, time: 1800 }, { x: 0.54, y: 0.58, pressure: 0.4, time: 2200 },
    ] });
    expect(assisted.exposure).toBeGreaterThan(retracted.exposure);
    expect(assisted.strokes.at(-1).metrics.elasticReturn).toBe(0);

    const compressed = pure.applyStroke({ stage: 4, incisionDepth: 70, exposure: 65, bleeding: 8, tool: 'forceps', compressionLevel: 12 }, { tool: 'forceps', points: [
      { x: 0.5, y: 0.7, pressure: 0.82, time: 1000 }, { x: 0.57, y: 0.78, pressure: 0.82, time: 1500 },
    ] });
    expect(compressed.compressionLevel).toBeGreaterThan(80);
    expect(pure.undoStroke(compressed).compressionLevel).toBe(12);
  });

  it('returns camera and localized tissue telemetry without mutating the draw input', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const noop = () => {};
    const context = { save: noop, restore: noop, clearRect: noop, fillRect: noop, fillText: noop, beginPath: noop, closePath: noop, ellipse: noop, fill: noop, stroke: noop, moveTo: noop, lineTo: noop, arc: noop, setLineDash: noop };
    const state = { stage: 3, tool: 'cautery', incisionDepth: 70, exposure: 62, thermalLoad: 44, elasticTension: 58, compressionLevel: 36, showLoupe: true, viewFocus: 'vessel', viewZoom: 3, focusLock: true, strokes: [{ id: 'heat-1', tool: 'cautery', points: [{ x: 0.42, y: 0.55, pressure: 0.4, time: 1 }, { x: 0.45, y: 0.57, pressure: 0.4, time: 2 }] }] };
    const snapshot = JSON.stringify(state);
    expect(pure.draw(context, 760, 440, state)).toMatchObject({ viewFocus: 'vessel', viewZoom: 3, focusLock: true, elasticTension: 58, compressionLevel: 36, thermalZoneVisible: true });
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it.each(ANATOMY_PATHS)('renders adjustable optics, focus targets, keyboard parity, and live deformation metrics from %s', (filePath) => {
    loadTool(filePath, 'anatomy');
    const html = renderTool('anatomy', { anatomy: { _activeTab: 'procedure', procedure: { stage: 3, incisionDepth: 68, exposure: 60, showLoupe: true, viewFocus: 'target', viewZoom: 2.5, focusLock: true, elasticTension: 54, compressionLevel: 31 } } });
    expect(html).toContain('aria-label="Working view magnification"');
    expect(html).toContain('aria-label="Working view focus target"');
    expect(html).toContain('Hide 2.5× view');
    expect(html).toContain('Unlock focus');
    expect(html).toContain('aria-keyshortcuts="Enter Space ArrowUp ArrowDown [ ] F"');
    expect(html).toContain('Elastic tension</dt><dd class="font-black text-slate-900">54%');
    expect(html).toContain('Compression</dt><dd class="font-black text-slate-900">31%');
  });
});
describe('Contact-aware procedure instruments and sensory debrief', () => {
  it('normalizes bounded contact, incision, and opt-in sensory state', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    expect(pure.normalize({ sensoryCues: true, incisionContinuity: 500, lastContact: 'unsafe', contactAccuracy: -5 }))
      .toMatchObject({ sensoryCues: true, incisionContinuity: 100, lastContact: 'none', contactAccuracy: 0 });
  });

  it('requires bilateral incision-edge engagement and distinguishes a retractor slip', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const base = { stage: 3, incisionDepth: 70, exposure: 20, tool: 'retractor' };
    const engaged = pure.applyStroke(base, { tool: 'retractor', points: [
      { x: 0.35, y: 0.66, pressure: 0.5, time: 1000 }, { x: 0.65, y: 0.66, pressure: 0.5, time: 1500 },
    ] });
    expect(engaged.exposure).toBeGreaterThan(20);
    expect(engaged).toMatchObject({ lastContact: 'incision_edge' });
    expect(engaged.strokes.at(-1).metrics).toMatchObject({ edgeEngaged: true, contact: 'incision_edge' });

    const slipped = pure.applyStroke(base, { tool: 'retractor', points: [
      { x: 0.66, y: 0.66, pressure: 0.5, time: 1000 }, { x: 0.86, y: 0.66, pressure: 0.5, time: 1500 },
    ] });
    expect(slipped.exposure).toBe(20);
    expect(slipped).toMatchObject({ lastContact: 'slip' });
    expect(slipped.feedback).toContain('slipped');
  });

  it('makes suction and cautery local while cooling thermal load during later actions', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const base = { stage: 3, incisionDepth: 70, exposure: 55, bleeding: 50 };
    const near = [{ x: 0.48, y: 0.65, pressure: 0.4, time: 1000 }, { x: 0.52, y: 0.69, pressure: 0.4, time: 1450 }];
    const far = [{ x: 0.78, y: 0.2, pressure: 0.4, time: 1000 }, { x: 0.84, y: 0.24, pressure: 0.4, time: 1450 }];
    const suctionHit = pure.applyStroke({ ...base, tool: 'suction' }, { tool: 'suction', points: near });
    const suctionMiss = pure.applyStroke({ ...base, tool: 'suction' }, { tool: 'suction', points: far });
    expect(suctionHit.bleeding).toBeLessThan(50);
    expect(suctionHit.lastContact).toBe('fluid_pool');
    expect(suctionMiss).toMatchObject({ bleeding: 50, lastContact: 'miss' });

    const cauteryHit = pure.applyStroke({ ...base, tool: 'cautery' }, { tool: 'cautery', points: near });
    const cauteryMiss = pure.applyStroke({ ...base, tool: 'cautery' }, { tool: 'cautery', points: far });
    expect(cauteryHit.bleeding).toBeLessThan(50);
    expect(cauteryMiss.bleeding).toBe(50);
    expect(cauteryMiss.thermalLoad).toBeGreaterThan(0);
    const cooled = pure.applyStroke({ ...cauteryHit, bleeding: 0, tool: 'suction' }, { tool: 'suction', points: near });
    expect(cooled.thermalLoad).toBeLessThan(cauteryHit.thermalLoad);
  });

  it('records incision continuity, grasp alignment, and path-local rendering without mutation', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const cut = pure.applyStroke({ stage: 2, tool: 'scalpel' }, { tool: 'scalpel', points: [
      { x: 0.44, y: 0.12, pressure: 0.42, time: 1000 }, { x: 0.48, y: 0.61, pressure: 0.42, time: 1600 },
    ] });
    expect(cut.incisionContinuity).toBeGreaterThan(50);
    expect(cut.lastContact).toBe('muscle');

    const grasp = pure.applyStroke({ stage: 4, incisionDepth: 70, exposure: 65, bleeding: 8, tool: 'forceps' }, { tool: 'forceps', points: [
      { x: 0.5, y: 0.7, pressure: 0.4, time: 1800 }, { x: 0.57, y: 0.78, pressure: 0.4, time: 2250 },
    ] });
    expect(grasp.strokes.at(-1).metrics.graspAlignment).toBeGreaterThan(80);
    expect(grasp.lastContact).toBe('target');

    const noop = () => {};
    const context = { save: noop, restore: noop, clearRect: noop, fillRect: noop, fillText: noop, beginPath: noop, closePath: noop, ellipse: noop, fill: noop, stroke: noop, moveTo: noop, lineTo: noop, arc: noop, setLineDash: noop };
    const state = { stage: 3, incisionDepth: 62, exposure: 48, bleeding: 36, incisionContinuity: 72, lastContact: 'fluid_pool', contactAccuracy: 88, strokes: cut.strokes };
    const snapshot = JSON.stringify(state);
    expect(pure.draw(context, 760, 440, state)).toMatchObject({ incisionContinuity: 72, lastContact: 'fluid_pool', contactAccuracy: 88, fluidPool: { amount: 36 } });
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it.each(ANATOMY_PATHS)('renders contact metrics, sensory opt-in, and the synchronized debrief timeline from %s', (filePath) => {
    loadTool(filePath, 'anatomy');
    const stroke = { id: 'contact-1', tool: 'retractor', points: [{ x: 0.35, y: 0.66, pressure: 0.5, time: 1 }, { x: 0.65, y: 0.66, pressure: 0.5, time: 2 }], metrics: { quality: 91, precision: 90, steadiness: 92, meanPressure: 0.5, control: 91, pathAngle: 0, speed: 0.6, contact: 'incision_edge', contactAccuracy: 94, edgeEngaged: true, recommendation: 'Maintain placement.' } };
    const working = renderTool('anatomy', { anatomy: { _activeTab: 'procedure', procedure: { stage: 3, incisionDepth: 70, exposure: 60, incisionContinuity: 74, lastContact: 'incision_edge', contactAccuracy: 94, sensoryCues: true, strokes: [stroke] } } });
    expect(working).toContain('Incision continuity</dt><dd class="font-black text-slate-900">74%');
    expect(working).toContain('Last contact</dt><dd class="font-black text-slate-900">incision edge');
    expect(working).toContain('Contact accuracy');
    expect(working).toContain('data-procedure-sensory-cues="true"');
    expect(working).toContain('Disable sensory cues');

    const debrief = renderTool('anatomy', { anatomy: { _activeTab: 'procedure', procedure: { stage: 6, incisionDepth: 70, exposure: 60, strokes: [stroke], specimenCollected: true, microscopyComplete: true } } });
    expect(debrief).toContain('data-procedure-contact-timeline="true"');
    expect(debrief).toContain('Contact-aware procedure timeline');
    expect(debrief).toContain('incision edge');
  });
});
describe('Deterministic pathology scenarios and instructor case builder', () => {
  it('normalizes scenario configuration and preserves repeat-attempt context', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    expect(pure.normalize({ caseId: 'vascular', scenarioSeed: 12000, approach: 'minimal', scenarioDifficulty: 'expert' }))
      .toMatchObject({ caseId: 'vascular', scenarioSeed: 9999, approach: 'minimal', scenarioDifficulty: 'expert' });
    expect(pure.normalize({ caseId: 'forged', scenarioSeed: -4, approach: 'unsafe', scenarioDifficulty: 'unsafe' }))
      .toMatchObject({ caseId: 'standard', scenarioSeed: 1, approach: 'central', scenarioDifficulty: 'adaptive' });
    expect(pure.normalize({ attempts: [{ id: 'a1', score: 81, caseId: 'friable', scenarioSeed: 4321, approach: 'lateral' }] }).attempts[0])
      .toMatchObject({ caseId: 'friable', scenarioSeed: 4321, approach: 'lateral' });
  });

  it('creates repeatable seeded geometry, branches, pathology, and a legacy-safe seed', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const legacy = pure.getScenario({ caseId: 'standard', scenarioSeed: 100 });
    expect(legacy).toMatchObject({ planSlice: 58, targetX: 0.57, targetY: 0.78, vesselX: 0.36, vesselY: 0.55, nerveX: 0.69, nerveY: 0.64 });
    const first = pure.getScenario({ caseId: 'vascular', scenarioSeed: 4321, approach: 'minimal', scenarioDifficulty: 'expert' });
    const repeated = pure.getScenario({ caseId: 'vascular', scenarioSeed: 4321, approach: 'minimal', scenarioDifficulty: 'expert' });
    const alternate = pure.getScenario({ caseId: 'vascular', scenarioSeed: 4322, approach: 'minimal', scenarioDifficulty: 'expert' });
    expect(repeated).toEqual(first);
    expect(alternate.targetX).not.toBe(first.targetX);
    expect(first).toMatchObject({ region: 'chest', pathology: { id: 'vascular' }, approach: { id: 'minimal' }, adaptive: { id: 'expert' } });
    expect(first.tissueProfile.vascularity).toBeGreaterThan(1);
    expect(first.vesselPath).toHaveLength(6);
    expect(first.nervePath).toHaveLength(6);
  });

  it('adapts difficulty from prior performance while honoring explicit instructor levels', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    expect(pure.difficulty({ scenarioDifficulty: 'adaptive' }).id).toBe('supported');
    expect(pure.difficulty({ scenarioDifficulty: 'adaptive', attempts: [{ score: 70 }] }).id).toBe('standard');
    expect(pure.difficulty({ scenarioDifficulty: 'adaptive', attempts: [{ score: 90 }] }).id).toBe('expert');
    expect(pure.difficulty({ scenarioDifficulty: 'supported', attempts: [{ score: 99 }] }).id).toBe('supported');
  });

  it('changes bleeding, retraction, and thermal response with pathology and approach', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const scalpel = { tool: 'scalpel', points: [{ x: 0.5, y: 0.12, pressure: 0.45, time: 1000 }, { x: 0.5, y: 0.42, pressure: 0.45, time: 1500 }] };
    const standardCut = pure.applyStroke({ caseId: 'standard', scenarioSeed: 100, stage: 2, tool: 'scalpel' }, scalpel);
    const vascularCut = pure.applyStroke({ caseId: 'vascular', scenarioSeed: 100, stage: 2, tool: 'scalpel' }, scalpel);
    expect(vascularCut.bleeding).toBeGreaterThan(standardCut.bleeding);

    const retract = { tool: 'retractor', points: [{ x: 0.34, y: 0.67, pressure: 0.5, time: 1000 }, { x: 0.68, y: 0.67, pressure: 0.5, time: 1500 }] };
    const standardRetraction = pure.applyStroke({ caseId: 'standard', scenarioSeed: 100, stage: 3, incisionDepth: 70, exposure: 20, tool: 'retractor' }, retract);
    const adherentRetraction = pure.applyStroke({ caseId: 'adhesion', scenarioSeed: 100, stage: 3, incisionDepth: 70, exposure: 20, tool: 'retractor' }, retract);
    expect(adherentRetraction.exposure).toBeLessThan(standardRetraction.exposure);

    const cautery = { tool: 'cautery', points: [{ x: 0.8, y: 0.2, pressure: 0.4, time: 1000 }, { x: 0.84, y: 0.24, pressure: 0.4, time: 1450 }] };
    const standardThermal = pure.applyStroke({ caseId: 'standard', scenarioSeed: 100, stage: 3, bleeding: 20, tool: 'cautery' }, cautery);
    const friableThermal = pure.applyStroke({ caseId: 'friable', scenarioSeed: 100, stage: 3, bleeding: 20, tool: 'cautery' }, cautery);
    expect(friableThermal.thermalLoad).toBeGreaterThan(standardThermal.thermalLoad);
    expect(friableThermal.strokes.at(-1).metrics).toMatchObject({ approach: 'central' });
    expect(friableThermal.strokes.at(-1).metrics.approachAccuracy).toBeGreaterThanOrEqual(0);
  });

  it('reports seeded pathology, approach, adaptive level, and branching without mutating draw input', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const noop = () => {};
    const context = { save: noop, restore: noop, clearRect: noop, fillRect: noop, fillText: noop, beginPath: noop, closePath: noop, ellipse: noop, fill: noop, stroke: noop, moveTo: noop, lineTo: noop, arc: noop, setLineDash: noop };
    const state = { caseId: 'vascular', scenarioSeed: 4321, approach: 'minimal', scenarioDifficulty: 'expert', stage: 3, incisionDepth: 70, exposure: 60 };
    const snapshot = JSON.stringify(state);
    expect(pure.draw(context, 760, 440, state)).toMatchObject({ caseId: 'vascular', scenarioSeed: 4321, pathology: 'vascular', approach: 'minimal', adaptiveDifficulty: 'expert', branchCounts: { vessels: 6, nerves: 6 } });
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it.each(ANATOMY_PATHS)('renders instructor assignments, approach reflection, and the 3D launch from %s', (filePath) => {
    loadTool(filePath, 'anatomy');
    const planning = renderTool('anatomy', { anatomy: { _activeTab: 'procedure', procedure: { stage: 0, caseId: 'vascular', scenarioSeed: 4321, approach: 'minimal', scenarioDifficulty: 'expert', instructorMode: true } } });
    expect(planning).toContain('data-procedure-scenario-builder="true"');
    expect(planning).toContain('Assignment VASCULAR-4321-MINIMAL');
    expect(planning).toContain('Deterministic seed');
    expect(planning).toContain('aria-label="Procedure approach"');
    expect(planning).toContain('Scenario difficulty');
    expect(planning).toContain('Hypervascular synthetic lesion');
    expect(planning).toContain('Vascularity');

    const overview3d = renderTool('anatomy', { anatomy: { _activeTab: 'explore', system: 'circulatory', complexity: 3, _bodyView3d: true } });
    expect(overview3d).toContain('data-anatomy-3d-procedure-launch="true"');
    expect(overview3d).toContain('Open matching procedure');

    const debrief = renderTool('anatomy', { anatomy: { _activeTab: 'procedure', procedure: { stage: 6, caseId: 'vascular', scenarioSeed: 4321, approach: 'minimal', specimenCollected: true, microscopyComplete: true, tissueDamage: 12, attempts: [{ id: 'a1', score: 75, caseId: 'vascular', scenarioSeed: 4310, approach: 'lateral', mode: 'guided' }] } } });
    expect(debrief).toContain('data-procedure-approach-comparison="true"');
    expect(debrief).toContain('Approach comparison');
    expect(debrief).toContain('These estimates support reflection and are not clinical guidance.');
    expect(debrief).toContain('seed 4310');
    expect(debrief).toContain('lateral');
  });
});
describe('Enhanced dissection lighting, texture, motion, and fluid visuals', () => {
  function createVisualContext() {
    const gradientStops = [];
    const ellipses = [];
    const noop = () => {};
    function gradient(kind) { return { addColorStop(position, color) { gradientStops.push({ kind, position, color }); } }; }
    return {
      context: {
        save: noop, restore: noop, clearRect: noop, fillRect: noop, fillText: noop, beginPath: noop, closePath: noop,
        fill: noop, stroke: noop, moveTo: noop, lineTo: noop, arc: noop, setLineDash: noop,
        ellipse(...args) { ellipses.push(args); },
        createLinearGradient() { return gradient('linear'); },
        createRadialGradient() { return gradient('radial'); },
      },
      gradientStops,
      ellipses,
    };
  }

  it('renders five textured tissue bands with layered lighting and dimensional fluid', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const visual = createVisualContext();
    const state = { caseId: 'vascular', scenarioSeed: 4321, scenarioDifficulty: 'expert', stage: 3, incisionDepth: 70, exposure: 58, bleeding: 42, complication: 'vessel_bleed', showHazards: true, illumination: 'focused', visualPhase: 1.25 };
    const snapshot = JSON.stringify(state);
    const result = pure.draw(visual.context, 760, 440, state);
    expect(result.visualFidelity).toMatchObject({ lighting: 'focused', textureBands: 5, motion: true, fluidLayers: 3 });
    expect(visual.gradientStops.some((stop) => stop.kind === 'linear')).toBe(true);
    expect(visual.gradientStops.some((stop) => stop.kind === 'radial')).toBe(true);
    expect(visual.ellipses.length).toBeGreaterThan(12);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('advances subtle physiological and fluid motion while honoring reduced visuals', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const pure = window.__alloAnatomyProcedurePure;
    const early = pure.draw(createVisualContext().context, 760, 440, { caseId: 'vascular', scenarioSeed: 4321, scenarioDifficulty: 'expert', stage: 3, incisionDepth: 70, bleeding: 42, visualPhase: 0.2 });
    const later = pure.draw(createVisualContext().context, 760, 440, { caseId: 'vascular', scenarioSeed: 4321, scenarioDifficulty: 'expert', stage: 3, incisionDepth: 70, bleeding: 42, visualPhase: 1.4 });
    expect(later.visualFidelity.physiologyOffset).not.toBe(early.visualFidelity.physiologyOffset);
    expect(later.visualFidelity.fluidSurfaceOffset).not.toBe(early.visualFidelity.fluidSurfaceOffset);
    const reduced = pure.draw(createVisualContext().context, 760, 440, { caseId: 'vascular', scenarioSeed: 4321, scenarioDifficulty: 'expert', stage: 3, incisionDepth: 70, bleeding: 42, visualPhase: 1.4, reducedVisuals: true });
    expect(reduced.visualFidelity).toMatchObject({ motion: false, fluidLayers: 0, physiologyOffset: 0, fluidSurfaceOffset: 0 });
  });

  it.each(ANATOMY_PATHS)('exposes the enhanced canvas and capped reduced-motion-aware animation from %s', (filePath) => {
    loadTool(filePath, 'anatomy');
    const html = renderTool('anatomy', { anatomy: { _activeTab: 'procedure', procedure: { stage: 3, caseId: 'friable', scenarioSeed: 77, incisionDepth: 68, exposure: 55, bleeding: 24 } } });
    expect(html).toContain('data-procedure-visual-fidelity="enhanced"');
    expect(html).toContain('Reduce visual intensity');
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
    expect(source).toContain('timestamp - lastPaint >= 48');
    expect(source).toContain('requestAnimationFrame(paint)');
    expect(source).toContain('canvas._anatomyProcedureReduceMotion = reducedMotion');
    expect(source).toContain('ref: stableAnatomyProcedureRef');
    expect(source).toContain('function drawProcedureLayerTexture');
    expect(source).toContain('fluidVisualLayers = 3');
  });
});
