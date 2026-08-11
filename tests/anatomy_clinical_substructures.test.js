import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

const KIDNEY_NODE_MAP = {
  VH_F_left_kidney: 'UBERON:0004538',
  VH_F_kidney_capsule_L: 'UBERON:0002015',
  VH_F_hilum_of_kidney_L: 'UBERON:0008716',
  VH_F_renal_medulla_L: 'UBERON:0000362',
  VH_F_renal_papilla_L: 'UBERON:0001228',
  VH_F_renal_papilla_L_a: 'UBERON:0001228',
  VH_F_renal_papilla_L_b: 'UBERON:0001228',
  VH_F_renal_papilla_L_c: 'UBERON:0001228',
  VH_F_renal_papilla_L_d: 'UBERON:0001228',
  VH_F_renal_papilla_L_e: 'UBERON:0001228',
  VH_F_renal_papilla_L_f: 'UBERON:0001228',
  VH_F_renal_papilla_L_g: 'UBERON:0001228',
  VH_F_renal_papilla_L_h: 'UBERON:0001228',
  VH_F_renal_papilla_L_i: 'UBERON:0001228',
  VH_F_renal_papilla_L_j: 'UBERON:0001228',
  VH_F_renal_papilla_L_k: 'UBERON:0001228',
  VH_F_renal_pyramid_L: 'UBERON:0004200',
  VH_F_renal_pyramid_L_a: 'UBERON:0004200',
  VH_F_renal_pyramid_L_b: 'UBERON:0004200',
  VH_F_renal_pyramid_L_c: 'UBERON:0004200',
  VH_F_renal_pyramid_L_d: 'UBERON:0004200',
  VH_F_renal_pyramid_L_e: 'UBERON:0004200',
  VH_F_renal_pyramid_L_f: 'UBERON:0004200',
  VH_F_renal_pyramid_L_g: 'UBERON:0004200',
  VH_F_renal_pyramid_L_h: 'UBERON:0004200',
  VH_F_renal_pyramid_L_i: 'UBERON:0004200',
  VH_F_renal_pyramid_L_j: 'UBERON:0004200',
  VH_F_renal_pyramid_L_k: 'UBERON:0004200',
  VH_F_cortex_of_kidney_L: 'UBERON:0001225',
  VH_F_renal_column_L: 'UBERON:0001284',
  VH_F_outer_cortex_of_kidney_L: 'UBERON:0002189',
};

const KIDNEY_CONCEPTS = [
  ['UBERON:0004538', 'Left kidney'],
  ['UBERON:0002015', 'Kidney capsule'],
  ['UBERON:0008716', 'Hilum of kidney'],
  ['UBERON:0000362', 'Renal medulla'],
  ['UBERON:0001228', 'Renal papilla'],
  ['UBERON:0004200', 'Renal pyramid'],
  ['UBERON:0001225', 'Cortex of kidney'],
  ['UBERON:0001284', 'Renal column'],
  ['UBERON:0002189', 'Outer cortex of kidney'],
];

function renderClinicalAtlas(filePath, state = {}) {
  loadTool(filePath, 'anatomy');
  return renderTool('anatomy', {
    anatomy: {
      _activeTab: 'explore',
      system: 'organs',
      view: 'posterior',
      complexity: 3,
      selectedStructure: 'kidneys',
      _bodyView3d: true,
      _body3dStyle: 'clinical',
      _clinicalAtlasPackId: 'hra-kidney-female-left-v1.3',
      ...state,
    },
  });
}

function htmlRoot(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

beforeEach(() => {
  resetStemLab();
});

describe('Anatomy Clinical Atlas substructures', () => {
  it.each(ANATOMY_PATHS)('ships the complete 31-node, 9-concept kidney map in %s', (filePath) => {
    loadTool(filePath, 'anatomy');
    const kidney = window.StemLab.getAnatomyAtlasPacks()
      .find((pack) => pack.id === 'hra-kidney-female-left-v1.3');

    expect(kidney.structureMap).toEqual(KIDNEY_NODE_MAP);
    expect(Object.keys(kidney.structureMap)).toHaveLength(31);
    expect(new Set(Object.values(kidney.structureMap))).toEqual(
      new Set(KIDNEY_CONCEPTS.map(([ontologyId]) => ontologyId)),
    );
  }, 30_000);

  it.each(ANATOMY_PATHS)('renders one accessible control per ontology concept in %s', (filePath) => {
    const root = htmlRoot(renderClinicalAtlas(filePath));
    const list = root.querySelector('[data-anatomy-clinical-structure-list]');

    expect(list).not.toBeNull();
    expect(list.getAttribute('aria-label')).toBe('Clinical Atlas structures');
    const controls = [...list.querySelectorAll('button[data-anatomy-clinical-concept]')];
    expect(controls).toHaveLength(9);
    expect(new Set(controls.map((control) => control.dataset.anatomyClinicalConcept))).toEqual(
      new Set(KIDNEY_CONCEPTS.map(([ontologyId]) => ontologyId)),
    );
    KIDNEY_CONCEPTS.forEach(([ontologyId, label]) => {
      const control = list.querySelector(`button[data-anatomy-clinical-concept="${ontologyId}"]`);
      expect(control, ontologyId).not.toBeNull();
      expect(control.textContent).toContain(label);
      expect(control.textContent).toContain(ontologyId);
      expect(control.hasAttribute('aria-pressed')).toBe(true);
    });
  });

  it.each(ANATOMY_PATHS)('reflects the selected concept in the list, detail panel, and 3D canvas in %s', (filePath) => {
    const ontologyId = 'UBERON:0001228';
    const root = htmlRoot(renderClinicalAtlas(filePath, { _clinicalAtlasConceptId: ontologyId }));
    const selectedControl = root.querySelector(`button[data-anatomy-clinical-concept="${ontologyId}"]`);
    const selectedPanel = root.querySelector('[data-anatomy-clinical-selected-concept]');
    const canvas = root.querySelector('[data-anatomy-3d-canvas]');

    expect(selectedControl).not.toBeNull();
    expect(selectedControl.getAttribute('aria-pressed')).toBe('true');
    expect(selectedControl.getAttribute('data-selected')).toBe('true');
    expect(selectedPanel).not.toBeNull();
    expect(selectedPanel.getAttribute('data-anatomy-clinical-selected-concept')).toBe(ontologyId);
    expect(selectedPanel.textContent).toContain('Renal papilla');
    expect(selectedPanel.textContent).toContain(ontologyId);
    expect(canvas.getAttribute('data-anatomy-clinical-selection')).toBe(ontologyId);
  });

  it.each(ANATOMY_PATHS)('offers an explicit return to the kidney location in the 2D Atlas in %s', (filePath) => {
    const root = htmlRoot(renderClinicalAtlas(filePath));
    const locator = root.querySelector('button[data-anatomy-clinical-locate="kidneys"]');

    expect(locator).not.toBeNull();
    expect(locator.textContent).toMatch(/Locate (?:left )?kidney in 2D Atlas/i);
    expect(locator.getAttribute('aria-label')).toMatch(/Locate (?:the )?(?:left )?kidney in (?:the )?2D Atlas/i);
  });

  it.each(ANATOMY_PATHS)('maps recursive Clinical mesh hits and applies reversible concept highlighting in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toContain('clinicalPickTargets');
    expect(source).toContain('clinicalOntologyId');
    expect(source).toContain('applyClinicalAtlasSelection');
    expect(source).toContain('resolveClinicalAtlasHit');
    expect(source).toMatch(/selectedClinicalAtlasPack\.structureMap\s*\[/);
    expect(source).toMatch(/raycaster\.intersectObjects\(\s*clinicalPickTargets\s*,\s*true\s*\)/);
    expect(source).toMatch(/applyClinicalAtlasSelection\(\s*(?:canvas\._anatomy3dClinicalSelection\s*\|\|\s*selectedClinicalConceptId|nextClinicalConceptId[^)]*|pending3dState\.clinicalConceptId|selectedClinicalConceptId)\s*\)/);
    expect(source).toMatch(/_anatomy3dSyncState\([^;]*pending3dState\.clinicalConceptId\)/);
    expect(source).toContain("_lastSelectedSource: 'clinical-3d'");
    expect(source).not.toContain("if (canvas.getAttribute('data-anatomy-3d-style') === 'clinical' && importedModel && importedModel.visible) return;");
  });

  it.each(ANATOMY_PATHS)('keeps the body-locator transition explicit and non-destructive in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toContain("'data-anatomy-clinical-locate': selectedClinicalAtlasPack.focusStructureId");
    expect(source).toMatch(/_bodyView3d\s*:\s*false/);
    expect(source).toMatch(/selectedStructure\s*:\s*selectedClinicalAtlasPack\.focusStructureId/);
    expect(source).toMatch(/_lastSelectedSource\s*:\s*'clinical-locator'/);
  });
});
