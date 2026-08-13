import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

const CLINICAL_STATE = {
  _activeTab: 'explore',
  system: 'organs',
  view: 'posterior',
  complexity: 3,
  selectedStructure: 'kidneys',
  _bodyView3d: true,
  _body3dStyle: 'clinical',
  _clinicalAtlasPackId: 'hra-kidney-female-left-v1.3',
  _clinicalAtlasConceptId: 'UBERON:0001225',
};

const EXPECTED_SCALE_BRIDGE = {
  organLabel: 'Left kidney',
  tissueLabel: 'Kidney regions & nephron',
  tissueTarget: 'regionalAtlas',
  tissueStructureId: 'kidneys',
  tissueStep: 0,
  cellLabel: 'Cell Microdissection',
  cellTarget: 'microdissection',
  cellContextId: 'kidney',
};

function renderClinicalAtlas(filePath, state = {}) {
  loadTool(filePath, 'anatomy');
  return renderTool('anatomy', {
    anatomy: { ...CLINICAL_STATE, ...state },
  });
}

function parseMarkup(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
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

function renderInteractive(filePath) {
  const tool = loadTool(filePath, 'anatomy');
  const initialToolData = { anatomy: { ...CLINICAL_STATE } };
  let updatedToolData = initialToolData;
  const setToolData = vi.fn((updater) => {
    updatedToolData = typeof updater === 'function' ? updater(updatedToolData) : updater;
  });
  const setStemLabTool = vi.fn();
  const tree = tool.render(makeCtx({
    toolData: initialToolData,
    setToolData,
    setStemLabTool,
  }));
  return {
    tree,
    setToolData,
    setStemLabTool,
    getUpdatedToolData: () => updatedToolData,
  };
}

beforeEach(() => {
  resetStemLab();
});

describe('Anatomy Clinical kidney functional-tissue-unit bridge', () => {
  it.each(ANATOMY_PATHS)('ships a normalized, data-only kidney scale bridge in %s', (filePath) => {
    loadTool(filePath, 'anatomy');
    const kidney = window.StemLab.getAnatomyAtlasPacks()
      .find((pack) => pack.id === 'hra-kidney-female-left-v1.3');

    expect(kidney.scaleBridge).toEqual(EXPECTED_SCALE_BRIDGE);

    const custom = window.StemLab.registerAnatomyAtlasPack({
      id: 'safe-scale-bridge-contract',
      modelUrl: '/safe-model.glb',
      scaleBridge: {
        ...EXPECTED_SCALE_BRIDGE,
        ignoredPatch: { _activeTab: 'procedure' },
        ignoredHandler: () => 'must not survive normalization',
      },
    });
    expect(custom.scaleBridge).toEqual(EXPECTED_SCALE_BRIDGE);
  });

  it.each(ANATOMY_PATHS)('personalizes the existing Scale Journey without adding a parallel widget in %s', (filePath) => {
    const root = parseMarkup(renderClinicalAtlas(filePath));
    const journeys = root.querySelectorAll('[data-anatomy-scale-journey]');
    const journey = journeys[0];

    expect(journeys).toHaveLength(1);
    expect(journey).not.toBeNull();
    expect(journey.getAttribute('data-scale-source')).toBe('clinical-atlas');
    expect(journey.getAttribute('data-anatomy-atlas-pack')).toBe('hra-kidney-female-left-v1.3');
    expect(journey.querySelector('[data-scale-stage="structure"]')?.textContent).toContain('Left kidney');
    expect(journey.querySelector('[data-scale-stage="tissue"]')?.textContent).toContain('Kidney regions & nephron');
    expect(journey.querySelector('[data-scale-stage="tissue"]')?.getAttribute('data-scale-specialist')).toBe('regionalAtlas');
    expect(journey.querySelector('[data-scale-stage="cell"]')?.getAttribute('data-scale-cell-context')).toBe('kidney');
    expect(journey.querySelector('[data-scale-stage="cell"]')?.textContent).toContain('Cell Microdissection');
    expect(journey.textContent).toContain('Clinical focus: Cortex of kidney');
  });

  it.each(ANATOMY_PATHS)('opens the existing kidney regional atlas at its first FTU step in %s', (filePath) => {
    const runtime = renderInteractive(filePath);
    const tissueButton = findElement(runtime.tree, (node) => node.props
      && node.props['data-scale-stage'] === 'tissue'
      && node.props['data-scale-specialist'] === 'regionalAtlas');

    expect(tissueButton).not.toBeNull();
    tissueButton.props.onClick();
    expect(runtime.setToolData).toHaveBeenCalled();
    expect(runtime.getUpdatedToolData().anatomy).toMatchObject({
      selectedStructure: 'kidneys',
      _bodyView3d: false,
      _clinicalAtlasPackId: 'hra-kidney-female-left-v1.3',
      _clinicalAtlasConceptId: 'UBERON:0001225',
      _regionalAtlasOpen: 'kidneys',
      _regionalAtlasStep: 0,
      _regionalAtlasPlaying: true,
    });
  });

  it.each(ANATOMY_PATHS)('normalizes the licensed renal-corpuscle tissue atlas as data-only metadata in %s', (filePath) => {
    loadTool(filePath, 'anatomy');
    const kidney = window.StemLab.getAnatomyAtlasPacks()
      .find((pack) => pack.id === 'hra-kidney-female-left-v1.3');

    expect(kidney.tissueAtlas).toMatchObject({
      id: 'hra-kidney-renal-corpuscle-v1.4',
      tissueOntologyId: 'UBERON:0001229',
      organOntologyId: 'UBERON:0002113',
      illustrationNodeCount: 142,
      licenseName: 'CC BY 4.0',
    });
    expect(kidney.tissueAtlas.cellConcepts).toHaveLength(9);
    expect(kidney.tissueAtlas.cellConcepts.map((concept) => concept.id)).toEqual(expect.arrayContaining([
      'CL:0000648', 'CL:0000653', 'CL:0002306', 'CL:1000452', 'CL:1000742',
      'CL:1000850', 'CL:1001005', 'CL:1001096', 'CL:1001099',
    ]));

    const custom = window.StemLab.registerAnatomyAtlasPack({
      id: 'safe-tissue-atlas-contract', modelUrl: '/safe-model.glb',
      tissueAtlas: {
        ...kidney.tissueAtlas,
        ignoredPatch: { _activeTab: 'procedure' },
        ignoredHandler: () => 'must not survive normalization',
        cellConcepts: [{ id: 'CL:0000653', label: 'Podocyte', nodeCount: 27, role: 'Filtration barrier.' }],
      },
    });
    expect(custom.tissueAtlas.ignoredPatch).toBeUndefined();
    expect(custom.tissueAtlas.ignoredHandler).toBeUndefined();
    expect(custom.tissueAtlas.cellConcepts).toEqual([{ id: 'CL:0000653', label: 'Podocyte', nodeCount: 27, role: 'Filtration barrier.' }]);
  });

  it.each(ANATOMY_PATHS)('renders one lazy, accessible FTU panel inside the existing kidney Scale Bridge in %s', (filePath) => {
    const html = renderClinicalAtlas(filePath, { _bodyView3d: false, _regionalAtlasOpen: 'kidneys', _regionalAtlasStep: 0 });
    const root = parseMarkup(html);
    const panels = root.querySelectorAll('[data-anatomy-clinical-ftu="hra-kidney-renal-corpuscle-v1.4"]');
    const panel = panels[0];
    expect(panels).toHaveLength(1);
    expect(panel.getAttribute('data-anatomy-atlas-pack')).toBe('hra-kidney-female-left-v1.3');
    const image = panel.querySelector('img');
    expect(image.getAttribute('src')).toContain('hra-kidney-renal-corpuscle-v1.4.png');
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(image.getAttribute('decoding')).toBe('async');
    expect(image.getAttribute('alt')).toContain('renal corpuscle');
    expect(panel.querySelectorAll('[data-anatomy-ftu-cell]')).toHaveLength(9);
    expect(panel.querySelectorAll('[data-anatomy-ftu-selection]')).toHaveLength(1);
    expect(panel.textContent).toContain('142 mapped nodes · 9 cell concepts');
    expect(panel.textContent).toContain('stylized healthy-reference illustration');
    expect(panel.textContent).toContain('Ontology crosswalk');
  });

  it.each(ANATOMY_PATHS)('routes kidney cell scale to Microdissection, never the unsupported Cell Atlas Lab in %s', (filePath) => {
    const runtime = renderInteractive(filePath);
    const cellButton = findElement(runtime.tree, (node) => node.props
      && node.props['data-scale-stage'] === 'cell'
      && node.props['data-scale-cell-context'] === 'kidney');

    expect(cellButton).not.toBeNull();
    cellButton.props.onClick();
    expect(runtime.setStemLabTool).toHaveBeenCalledWith('cell');
    expect(runtime.setStemLabTool).not.toHaveBeenCalledWith('cellAtlasLab');
    expect(runtime.getUpdatedToolData().cell).toMatchObject({
      mode: 'microdissection',
      _cellPicked: true,
      _cellCategory: 'interactive',
      microCellType: 'animal',
      _scaleJourneySource: 'anatomy',
      _scaleJourneySystem: 'organs',
      _scaleJourneyStructure: 'kidneys',
      _anatomyFtuContext: {
        schemaVersion: 1,
        packId: 'hra-kidney-female-left-v1.3',
        structureId: 'kidneys',
        organLabel: 'Left kidney',
        tissueAtlasId: 'hra-kidney-renal-corpuscle-v1.4',
        tissueLabel: 'Renal corpuscle',
        tissueOntologyId: 'UBERON:0001229',
        cellId: 'CL:0000648',
        cellLabel: 'Kidney granular cell',
        mappedNodeCount: 15,
        licenseName: 'CC BY 4.0',
      },
    });
  });
});
