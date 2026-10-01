import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

const BASE_STATE = {
  _activeTab: 'explore',
  system: 'skeletal',
  view: 'anterior',
  complexity: 3,
};

const VIEW_STATES = [
  BASE_STATE,
  { ...BASE_STATE, _bodyView3d: true, _body3dStyle: 'blueprint' },
  { ...BASE_STATE, _bodyView3d: true, _body3dStyle: 'realistic' },
  {
    ...BASE_STATE,
    system: 'circulatory',
    selectedStructure: 'heart',
    _bodyView3d: true,
    _body3dStyle: 'clinical',
    _clinicalAtlasPackId: 'hra-heart-female-v1.3',
  },
];

function renderAnatomy(filePath, state) {
  loadTool(filePath, 'anatomy');
  return renderTool('anatomy', { anatomy: state });
}

function parseMarkup(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

beforeEach(() => {
  resetStemLab();
});

describe('Anatomy canonical model structure count', () => {
  it.each(ANATOMY_PATHS)('renders one count in Atlas, Blueprint, Surface, and Clinical views from %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source.match(/'data-anatomy-structure-count': 'true'/g)).toHaveLength(1);

    VIEW_STATES.forEach((state) => {
      resetStemLab();
      const root = parseMarkup(renderAnatomy(filePath, state));
      const counts = [...root.querySelectorAll('[data-anatomy-structure-count="true"]')];

      expect(counts).toHaveLength(1);
      expect(counts[0].textContent).toMatch(/^\d+ structures$/);
    });
  }, 60_000);
});
