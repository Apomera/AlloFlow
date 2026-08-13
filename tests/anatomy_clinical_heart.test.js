import fs from 'node:fs';
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

const HEART_PACK_ID = 'hra-heart-female-v1.3';
const KIDNEY_PACK_ID = 'hra-kidney-female-left-v1.3';

const HEART_NODE_MAP = {
  VH_F_heart: 'UBERON:0000948',
  VH_F_interventricular_septum: 'UBERON:0002094',
  VH_F_left_cardiac_atrium: 'UBERON:0002079',
  VH_F_left_ventricle: 'UBERON:0002084',
  VH_F_right_cardiac_atrium: 'UBERON:0002078',
  VH_F_right_ventricle: 'UBERON:0002080',
  VH_F_papillary_muscle_of_heart: 'UBERON:0002494',
  VH_F_papillary_muscle_of_heart_ant: 'FMA:7264',
  VH_F_papillary_muscle_of_heart_antlat: 'FMA:7265',
  VH_F_papillary_muscle_of_heart_med: 'FMA:7262',
  VH_F_papillary_muscle_of_heart_pos: 'FMA:7261',
  VH_F_papillary_muscle_of_heart_posmed: 'FMA:7267',
  VH_F_valve: 'UBERON:0003978',
  VH_F_aortic_valve: 'UBERON:0002137',
  VH_F_pulmonary_valve: 'UBERON:0002146',
  VH_F_mitral_valve: 'UBERON:0002135',
  VH_F_tricuspid_valve: 'UBERON:0002134',
};

const HEART_CONCEPT_IDS = Object.freeze(Object.values(HEART_NODE_MAP));

const HEART_CLINICAL_STATE = {
  _activeTab: 'explore',
  system: 'circulatory',
  view: 'anterior',
  complexity: 3,
  selectedStructure: 'heart',
  _bodyView3d: true,
  _body3dStyle: 'clinical',
  _clinicalAtlasPackId: HEART_PACK_ID,
};

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

function parseMarkup(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  if (typeof node !== 'object') return '';
  return textOf(node.props && node.props.children);
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

describe('Anatomy Clinical Heart Atlas registry', () => {
  it.each(ANATOMY_PATHS)('registers the verified female heart v1.3 pack and exact 17-concept map in %s', (filePath) => {
    loadTool(filePath, 'anatomy');
    const packs = window.StemLab.getAnatomyAtlasPacks();
    const heart = packs.find((pack) => pack.id === HEART_PACK_ID);
    const kidney = packs.find((pack) => pack.id === KIDNEY_PACK_ID);

    expect(heart).toMatchObject({
      id: HEART_PACK_ID,
      title: 'Clinical Heart Atlas',
      systems: ['circulatory'],
      focusStructureId: 'heart',
      bodyView: 'anterior',
      referenceSex: 'female',
      primaryOntologyId: 'UBERON:0000948',
      modeledStructureCount: 17,
      licenseName: 'CC BY 4.0',
    });
    expect(heart.modelUrl).toContain('stem_lab/assets/anatomy/clinical-atlas/hra-heart-female-v1.3.glb');
    expect(heart.structureMap).toEqual(HEART_NODE_MAP);
    expect(Object.keys(heart.structureMap)).toHaveLength(17);
    expect(new Set(Object.values(heart.structureMap))).toEqual(new Set(HEART_CONCEPT_IDS));
    expect(heart.tissueAtlas).toBeNull();

    expect(kidney).toMatchObject({
      id: KIDNEY_PACK_ID,
      systems: ['organs'],
      focusStructureId: 'kidneys',
      primaryOntologyId: 'UBERON:0004538',
    });
  }, 60_000);
});

describe('Anatomy Clinical Heart Atlas rendering and isolation', () => {
  it.each(ANATOMY_PATHS)('renders heart provenance and all 17 concepts without the kidney FTU in %s', (filePath) => {
    const root = parseMarkup(renderAnatomy(filePath, HEART_CLINICAL_STATE));
    const clinicalMode = root.querySelector('[data-anatomy-view-option="clinical"]');
    const canvas = root.querySelector('[data-anatomy-3d-canvas]');
    const provenance = root.querySelector(`[data-anatomy-clinical-atlas-provenance="${HEART_PACK_ID}"]`);
    const conceptControls = [...root.querySelectorAll('[data-anatomy-clinical-structure-list] button[data-anatomy-clinical-concept]')];

    expect(clinicalMode).not.toBeNull();
    expect(clinicalMode.getAttribute('aria-pressed')).toBe('true');
    expect(canvas).not.toBeNull();
    expect(canvas.getAttribute('data-anatomy-atlas-pack')).toBe(HEART_PACK_ID);
    expect(provenance).not.toBeNull();
    expect(provenance.textContent).toContain('Clinical Heart Atlas');
    expect(provenance.textContent).toContain('UBERON:0000948');
    expect(provenance.textContent).toContain('17 mapped model nodes');
    expect(provenance.textContent).toContain('CC BY 4.0');
    expect(provenance.textContent).toContain('Ontology crosswalk');

    expect(conceptControls).toHaveLength(17);
    expect(new Set(conceptControls.map((control) => control.dataset.anatomyClinicalConcept)))
      .toEqual(new Set(HEART_CONCEPT_IDS));
    expect(root.querySelector('[data-anatomy-clinical-ftu]')).toBeNull();
    expect(root.textContent).not.toContain('Renal Corpuscle FTU');
  }, 60_000);

  it.each(ANATOMY_PATHS)('keeps heart Clinical mode circulatory, kidney Clinical mode organs, and skeletal unsupported in %s', (filePath) => {
    const heart = parseMarkup(renderAnatomy(filePath, HEART_CLINICAL_STATE));

    resetStemLab();
    const kidney = parseMarkup(renderAnatomy(filePath, {
      system: 'organs',
      view: 'posterior',
      selectedStructure: 'kidneys',
      _bodyView3d: true,
      _body3dStyle: 'clinical',
      _clinicalAtlasPackId: KIDNEY_PACK_ID,
    }));

    resetStemLab();
    const skeletal = parseMarkup(renderAnatomy(filePath, {
      system: 'skeletal',
      selectedStructure: 'skull',
      _bodyView3d: true,
    }));

    expect(heart.querySelector('[data-anatomy-atlas-pack]')?.getAttribute('data-anatomy-atlas-pack')).toBe(HEART_PACK_ID);
    expect(heart.textContent).toContain('Clinical Heart Atlas');
    expect(kidney.querySelector('[data-anatomy-atlas-pack]')?.getAttribute('data-anatomy-atlas-pack')).toBe(KIDNEY_PACK_ID);
    expect(kidney.textContent).toContain('Clinical Kidney Atlas');
    expect(skeletal.querySelector('[data-anatomy-view-option="clinical"]')).toBeNull();
  }, 60_000);
});

describe('Anatomy cross-system Clinical pack switching', () => {
  it.each(ANATOMY_PATHS)('offers both packs and resets kidney-only state when switching to heart in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const tool = loadTool(filePath, 'anatomy');
    const initialToolData = {
      anatomy: {
        _activeTab: 'explore',
        system: 'organs',
        view: 'posterior',
        complexity: 3,
        selectedStructure: 'kidneys',
        _bodyView3d: true,
        _body3dStyle: 'clinical',
        _clinicalAtlasPackId: KIDNEY_PACK_ID,
        _clinicalAtlasConceptId: 'UBERON:0001225',
        _clinicalFtuCellId: 'CL:0000653',
        _regionalAtlasOpen: 'kidneys',
        search: 'renal',
      },
    };
    let updatedToolData = initialToolData;
    const setToolData = vi.fn((updater) => {
      updatedToolData = typeof updater === 'function' ? updater(updatedToolData) : updater;
    });
    const tree = tool.render(makeCtx({ toolData: initialToolData, setToolData }));
    const packSelect = findElement(tree, (node) => node.type === 'select'
      && node.props
      && node.props['aria-label'] === 'Clinical Atlas pack');

    expect(packSelect).not.toBeNull();
    expect(textOf(packSelect)).toContain('Clinical Kidney Atlas');
    expect(textOf(packSelect)).toContain('Clinical Heart Atlas');
    packSelect.props.onChange({ currentTarget: { value: HEART_PACK_ID } });

    expect(setToolData).toHaveBeenCalled();
    expect(updatedToolData.anatomy).toMatchObject({
      system: 'circulatory',
      view: 'anterior',
      selectedStructure: 'heart',
      _clinicalAtlasPackId: HEART_PACK_ID,
      _clinicalAtlasConceptId: 'UBERON:0000948',
      _clinicalFtuCellId: null,
      _clinicalFtuAtlasId: null,
      _regionalAtlasOpen: null,
      search: '',
    });
    expect(source).toContain("_clinicalAtlasConceptId: conceptId || pack.primaryOntologyId || ''");
    expect(source).toMatch(/_clinicalFtuCellId\s*:\s*null/);
    expect(source).toMatch(/_clinicalFtuAtlasId\s*:\s*null/);
    expect(source).toMatch(/_regionalAtlasOpen\s*:\s*null/);
  }, 60_000);
});

describe('Anatomy restored Clinical pack identity', () => {
  it.each(ANATOMY_PATHS)('repairs a stale kidney pack identity through heart interactions in %s', (filePath) => {
    const staleKidneyHeartState = {
      ...HEART_CLINICAL_STATE,
      _clinicalAtlasPackId: KIDNEY_PACK_ID,
      _clinicalAtlasConceptId: 'UBERON:0001225',
      _clinicalFtuAtlasId: 'hra-kidney-renal-corpuscle-v1.4',
      _clinicalFtuCellId: 'CL:0000653',
      _regionalAtlasOpen: 'kidneys',
    };

    const root = parseMarkup(renderAnatomy(filePath, staleKidneyHeartState));
    const canvas = root.querySelector('[data-anatomy-3d-canvas]');
    const journey = root.querySelector('[data-anatomy-scale-journey]');
    const selectedHeart = root.querySelector('[data-anatomy-clinical-concept="UBERON:0000948"]');

    expect(canvas).not.toBeNull();
    expect(canvas.getAttribute('data-anatomy-atlas-pack')).toBe(HEART_PACK_ID);
    expect(canvas.getAttribute('data-anatomy-clinical-selection')).toBe('UBERON:0000948');
    expect(root.querySelector('[data-anatomy-clinical-atlas-provenance="' + HEART_PACK_ID + '"]')).not.toBeNull();
    expect(root.querySelector('[data-anatomy-clinical-ftu]')).toBeNull();
    expect(selectedHeart?.getAttribute('aria-pressed')).toBe('true');
    expect(journey?.getAttribute('data-scale-source')).toBe('clinical-atlas');
    expect(journey?.getAttribute('data-anatomy-atlas-pack')).toBe(HEART_PACK_ID);

    function createRuntime() {
      resetStemLab();
      const tool = loadTool(filePath, 'anatomy');
      const initialToolData = { anatomy: { ...staleKidneyHeartState } };
      let updatedToolData = initialToolData;
      const setToolData = vi.fn((updater) => {
        updatedToolData = typeof updater === 'function' ? updater(updatedToolData) : updater;
      });
      const tree = tool.render(makeCtx({ toolData: initialToolData, setToolData }));
      return { tree, setToolData, getUpdatedToolData: () => updatedToolData };
    }

    const conceptRuntime = createRuntime();
    const aorticValve = findElement(conceptRuntime.tree, (node) => node.props
      && node.props['data-anatomy-clinical-concept'] === 'UBERON:0002137');
    expect(aorticValve).not.toBeNull();
    aorticValve.props.onClick();
    expect(conceptRuntime.setToolData).toHaveBeenCalled();
    expect(conceptRuntime.getUpdatedToolData().anatomy).toMatchObject({
      _clinicalAtlasPackId: HEART_PACK_ID,
      _clinicalAtlasConceptId: 'UBERON:0002137',
      _lastSelectedSource: 'clinical-list',
    });

    const locatorRuntime = createRuntime();
    const heartLocator = findElement(locatorRuntime.tree, (node) => node.props
      && node.props['data-anatomy-clinical-locate'] === 'heart');
    expect(heartLocator).not.toBeNull();
    heartLocator.props.onClick();
    expect(locatorRuntime.setToolData).toHaveBeenCalled();
    expect(locatorRuntime.getUpdatedToolData().anatomy).toMatchObject({
      _bodyView3d: false,
      system: 'circulatory',
      view: 'anterior',
      selectedStructure: 'heart',
      _clinicalAtlasPackId: HEART_PACK_ID,
      _clinicalAtlasConceptId: 'UBERON:0000948',
      _lastSelectedSource: 'clinical-locator',
    });

    const tissueRuntime = createRuntime();
    const tissueStage = findElement(tissueRuntime.tree, (node) => node.props
      && node.props['data-scale-stage'] === 'tissue'
      && node.props['data-scale-specialist'] === 'regionalAtlas');
    expect(tissueStage).not.toBeNull();
    tissueStage.props.onClick();
    expect(tissueRuntime.setToolData).toHaveBeenCalled();
    expect(tissueRuntime.getUpdatedToolData().anatomy).toMatchObject({
      _bodyView3d: false,
      system: 'circulatory',
      selectedStructure: 'heart',
      _clinicalAtlasPackId: HEART_PACK_ID,
      _clinicalAtlasConceptId: 'UBERON:0000948',
      _regionalAtlasOpen: 'heart',
      _regionalAtlasSource: 'clinical-atlas',
      _scaleJourneySource: 'clinical-atlas',
      _scaleJourneyAtlasPackId: HEART_PACK_ID,
      _scaleJourneyOntologyId: 'UBERON:0000948',
      _lastSelectedSource: 'clinical-scale-bridge',
    });
  }, 60_000);
});

