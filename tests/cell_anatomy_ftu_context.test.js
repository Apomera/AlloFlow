import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const CELL_PATHS = [
  'stem_lab/stem_tool_cell.js',
  'desktop/web-app/public/stem_lab/stem_tool_cell.js',
];

const ANATOMY_FTU_CONTEXT = {
  schemaVersion: 1,
  packId: 'hra-kidney-female-left-v1.3',
  packTitle: 'HRA Female Left Kidney',
  structureId: 'kidneys',
  organLabel: 'Left kidney',
  tissueAtlasId: 'hra-kidney-renal-corpuscle-v1.4',
  tissueTitle: 'HRA renal corpuscle v1.4',
  tissueLabel: 'Renal corpuscle',
  tissueOntologyId: 'UBERON:0001229',
  cellId: 'CL:0000653',
  cellLabel: 'Podocyte',
  cellRole: 'Interdigitating foot processes help form the glomerular filtration barrier.',
  mappedNodeCount: 27,
  sourceUrl: 'https://lod.humanatlas.io/2d-ftu/kidney-renal-corpuscle/v1.4/',
  licenseName: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: 'HRA reference illustration by Rachel Bajema (2026).',
};

function renderMicrodissection(filePath, cellState = {}) {
  loadTool(filePath, 'cell');
  return renderTool('cell', {
    cell: {
      mode: 'microdissection',
      _cellPicked: true,
      _cellCategory: 'interactive',
      microCellType: 'animal',
      microStage: 0,
      _scaleJourneySource: 'anatomy',
      _anatomyFtuContext: ANATOMY_FTU_CONTEXT,
      ...cellState,
    },
  });
}

function parseMarkup(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

beforeEach(() => {
  resetStemLab();
});

describe('Anatomy FTU context in Cell Microdissection', () => {
  it.each(CELL_PATHS)('renders the bounded Anatomy tissue and cell context from %s', (filePath) => {
    const root = parseMarkup(renderMicrodissection(filePath));
    const cards = root.querySelectorAll('[data-cell-anatomy-ftu-context="hra-kidney-renal-corpuscle-v1.4"]');
    const card = cards[0];

    expect(cards).toHaveLength(1);
    expect(card.getAttribute('data-cell-anatomy-ftu-cell')).toBe('CL:0000653');
    expect(card.textContent).toContain('HRA Female Left Kidney');
    expect(card.textContent).toContain('hra-kidney-female-left-v1.3');
    expect(card.textContent).toContain('Left kidney');
    expect(card.textContent).toContain('HRA renal corpuscle v1.4');
    expect(card.textContent).toContain('hra-kidney-renal-corpuscle-v1.4');
    expect(card.textContent).toContain('Renal corpuscle');
    expect(card.textContent).toContain('UBERON:0001229');
    expect(card.textContent).toContain('Podocyte');
    expect(card.textContent).toContain('CL:0000653');
    expect(card.textContent).toContain('Interdigitating foot processes help form the glomerular filtration barrier.');
    expect(card.textContent).toContain('27 mapped nodes');
    expect(card.textContent).toContain('HRA reference illustration by Rachel Bajema (2026).');
    expect(card.textContent).toContain('CC BY 4.0');

    const source = card.querySelector('a[href="https://lod.humanatlas.io/2d-ftu/kidney-renal-corpuscle/v1.4/"]');
    const license = card.querySelector('a[href="https://creativecommons.org/licenses/by/4.0/"]');
    expect(source).not.toBeNull();
    expect(license).not.toBeNull();
    expect(source.getAttribute('target')).toBe('_blank');
    expect(source.getAttribute('rel')).toContain('noopener');
    expect(license.getAttribute('target')).toBe('_blank');
    expect(license.getAttribute('rel')).toContain('noopener');
    expect(card.querySelector('[data-cell-return-to-anatomy="true"]')).not.toBeNull();
  });

  it.each(CELL_PATHS)('keeps the canvas generic and labels the model limitation in %s', (filePath) => {
    const root = parseMarkup(renderMicrodissection(filePath));
    const card = root.querySelector('[data-cell-anatomy-ftu-context]');
    const canvas = root.querySelector('[data-cell-microdissection-canvas="true"]');

    expect(card.textContent.toLowerCase()).toContain('generic cell canvas');
    expect(card.textContent.toLowerCase()).toContain('not a morphology model');
    expect(canvas.getAttribute('aria-label')).toContain('Microdissection view of a animal cell');
    expect(canvas.getAttribute('aria-label')).not.toContain('Podocyte');
    expect(canvas.getAttribute('aria-label')).not.toContain('CL:0000653');
  });

  it.each(CELL_PATHS)('does not render Anatomy context for invalid, unknown, or non-Anatomy state in %s', (filePath) => {
    const missingId = parseMarkup(renderMicrodissection(filePath, {
      _anatomyFtuContext: { ...ANATOMY_FTU_CONTEXT, cellId: '' },
    }));
    const unknownSource = parseMarkup(renderMicrodissection(filePath, {
      _scaleJourneySource: 'unknown',
    }));
    const cellSource = parseMarkup(renderMicrodissection(filePath, {
      _scaleJourneySource: 'cell',
    }));
    const wrongMode = parseMarkup(renderMicrodissection(filePath, {
      mode: 'observe',
    }));

    expect(missingId.querySelector('[data-cell-anatomy-ftu-context]')).toBeNull();
    expect(unknownSource.querySelector('[data-cell-anatomy-ftu-context]')).toBeNull();
    expect(cellSource.querySelector('[data-cell-anatomy-ftu-context]')).toBeNull();
    expect(wrongMode.querySelector('[data-cell-anatomy-ftu-context]')).toBeNull();
  });
});
