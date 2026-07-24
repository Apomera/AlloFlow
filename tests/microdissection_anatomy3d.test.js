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
    expect(html).toContain('Drag to rotate');
    expect(html).toContain('structure directory for precise labels and full keyboard access');
    expect(html).toContain('id="anatomy-3d-status"');
    expect(html).toContain('2D detail');
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
    expect(html).toContain('https://lifesciencedb.jp/bp3d/info/index.html');
    expect(html).toContain('https://github.com/LluisV/Z-Anatomy');
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
    expect(html).toContain('do not upload protected health information');
    expect(html).toContain('CC BY-SA 2.1 JP');
    expect(html).toContain('CC BY-SA 4.0');
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
  });

  it('supports licensed local GLB files with a resilient procedural fallback', () => {
    loadTool(ANATOMY_PATHS[0], 'anatomy');
    const html = renderTool('anatomy', { anatomy: { _activeTab: 'explore', _bodyView3d: true } });
    expect(html).toContain('Import local GLB');
    expect(html).toContain('accept=".glb,model/gltf-binary"');
    expect(html).toContain('The file is not uploaded');
    const source = fs.readFileSync(ANATOMY_PATHS[0], 'utf8');
    expect(source).toContain('three-gltf-loader');
    expect(source).toContain('new THREE.GLTFLoader().load');
    expect(source).toContain('silhouetteGroup.visible = false');
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
    expect(html).toContain('aria-keyshortcuts="Enter Space ArrowUp ArrowDown"');
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
    expect(planning).toContain('synthetic thoracic target');

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
    expect(anatomySource).toContain("if (!collected && depth >= 66 && exposure >= 50 && bleeding <= 35) stage = 4");
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