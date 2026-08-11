import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

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

function expectActiveMode(html, label) {
  expect(html).toMatch(new RegExp('<button[^>]*aria-pressed="true"[^>]*>' + label + '</button>'));
}

beforeEach(() => {
  resetStemLab();
});

describe('Anatomy Clinical Atlas integration', () => {
  it.each(ANATOMY_PATHS)('shows the licensed organ-focus mode only for a supported system in %s', (filePath) => {
    const skeletal = renderAnatomy(filePath, { system: 'skeletal' });
    expect(skeletal).not.toContain('data-anatomy-view-option="clinical"');

    const clinical = renderAnatomy(filePath, {
      system: 'organs',
      view: 'posterior',
      selectedStructure: 'kidneys',
      _bodyView3d: true,
      _body3dStyle: 'clinical',
      _clinicalAtlasPackId: 'hra-kidney-female-left-v1.3',
    });

    expect(clinical).toContain('data-anatomy-view="3d"');
    expect(clinical).toContain('data-anatomy-3d-style="clinical"');
    expect(clinical).toContain('data-anatomy-atlas-pack="hra-kidney-female-left-v1.3"');
    expect(clinical).toContain('data-anatomy-clinical-atlas-provenance="hra-kidney-female-left-v1.3"');
    expectActiveMode(clinical, 'Clinical Atlas');
    expect(clinical).toContain('Clinical Kidney Atlas');
    expect(clinical).toContain('UBERON:0004538');
    expect(clinical).toContain('31 mapped model nodes');
    expect(clinical).toContain('CC BY 4.0');
    expect(clinical).toContain('Ontology crosswalk');
    expect(clinical).toContain('not a whole-body positional overlay');
    expect(clinical).not.toContain('Import local GLB');
    expect(clinical).not.toContain('aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight + - [ ] R Home 0"');
  });

  it.each(ANATOMY_PATHS)('registers a validated local HRA pack and keeps failed models reversible in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    loadTool(filePath, 'anatomy');
    const packs = window.StemLab.getAnatomyAtlasPacks();
    const kidney = packs.find((pack) => pack.id === 'hra-kidney-female-left-v1.3');

    expect(kidney).toMatchObject({
      title: 'Clinical Kidney Atlas',
      systems: ['organs'],
      focusStructureId: 'kidneys',
      primaryOntologyId: 'UBERON:0004538',
      modeledStructureCount: 31,
      licenseName: 'CC BY 4.0',
    });
    expect(kidney.modelUrl).toContain('stem_lab/assets/anatomy/clinical-atlas/hra-kidney-female-left-v1.3.glb');
    expect(window.StemLab.registerAnatomyAtlasPack({ id: 'unsafe', modelUrl: 'javascript:alert(1)' })).toBeNull();
    expect(source).toContain("var importedModelStyle = activeAnatomyModelKind === 'clinical' ? 'clinical' : 'realistic';");
    expect(source).toContain("surfaceGroup.visible = body3dStyle === 'realistic' || body3dStyle === 'clinical';");
    expect(source).toContain('silhouetteGroup.visible = !importedVisible;');
    expect(source).toContain('syncSelectedStructureLeader(showBodyMarkers ? selectedId : null);');
    expect(source).toContain("selectedClinicalAtlasPack.focusLabel + ' \\u00b7 organ focus'");
    expect(source).toContain('var nextPack = clinicalAtlasPacks.find');
    expect(source).toContain("var atlasPatch = { _clinicalAtlasPackId: nextPackId, _clinicalAtlasConceptId: '', search: '' };");
    expect(source).toContain('updMulti(atlasPatch);');
    expect(source).not.toContain('if (imported && imported.parent) imported.parent.remove(imported);');
    expect(source).not.toContain('dispose3dResources(imported);');
  });
});
