import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(
  resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'),
);

const CELL_TOOL = 'stem_lab/stem_tool_cellatlas.js';
const ALPHAFOLD_TOOL = 'stem_lab/stem_tool_alphafold.js';
const DATA_FILE = 'stem_lab/stem_data_cellatlas_muraro.js';
const COMPANION_FILE = 'alphafold_explorer/alphafold_explorer.html';
const COMPANION_MIRROR = 'desktop/web-app/public/alphafold_explorer/alphafold_explorer.html';

function loadSnapshot() {
  new Function(readFileSync(resolve(process.cwd(), DATA_FILE), 'utf8'))();
}

function buttonByText(container, text) {
  return [...container.querySelectorAll('button')].find(
    (button) => button.textContent.trim() === text,
  );
}

describe('Cell Atlas to AlphaFold cross-scale evidence bridge', () => {
  let container;
  let root;
  let latestState;
  let latestTool;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    resetStemLab();
    delete window.__alloCellAtlasPure;
    delete window.__alloCellAtlasRealSnapshots;
    loadSnapshot();
    loadTool(CELL_TOOL, 'cellAtlasLab');
    loadTool(ALPHAFOLD_TOOL, 'alphaFoldExplorer');
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    container.remove();
    root = null;
    vi.restoreAllMocks();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  async function fill(id, value) {
    const control = container.querySelector('#' + id);
    expect(control, `control "${id}"`).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    ).set;
    await act(async () => {
      setter.call(control, value);
      control.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  async function click(text) {
    const button = buttonByText(container, text);
    expect(button, `button "${text}"`).toBeDefined();
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  it('carries exact aggregate context into AlphaFold and returns to the atlas', async () => {
    function ToolView({ activeTool, toolData, setToolData, setActiveTool }) {
      const config = window.StemLab._registry[activeTool];
      return config.render(makeCtx({
        toolData,
        setToolData,
        setStemLabTool: setActiveTool,
        setStemLabTab: () => {},
        theme: 'dark',
        lang: 'en',
      }));
    }

    function Host() {
      const [toolData, setToolData] = React.useState({
        cellAtlasLab: {
          tissue: 'pancreas',
          view: 'map',
          evidenceMode: 'real',
          realMetric: 'relativeMeanPct',
          selectedCell: 'beta',
          selectedGene: 'INS',
        },
      });
      const [activeTool, setActiveTool] = React.useState('cellAtlasLab');
      latestState = toolData;
      latestTool = activeTool;
      return React.createElement(ToolView, {
        key: activeTool,
        activeTool,
        toolData,
        setToolData,
        setActiveTool,
      });
    }

    root = ReactDOMClient.createRoot(container);
    await act(async () => root.render(React.createElement(Host)));

    await click('Follow INS to AlphaFold →');
    expect(latestTool).toBe('alphaFoldExplorer');
    expect(latestState._alphaFoldExplorer).toMatchObject({
      _scaleJourneySource: 'cellAtlasLab',
      prefillAccession: 'P01308',
      prefillGene: 'INS',
      prefillProtein: 'Insulin precursor',
      prefillCellType: 'Beta cell',
      prefillTissue: 'Pancreas',
      prefillEvidenceMode: 'Real aggregate RNA evidence',
      prefillMetricLabel: 'Within-gene relative mean',
      prefillEvidenceValue: 100,
      prefillCellCount: 448,
    });
    expect(latestState._alphaFoldExplorer.prefillEvidenceDetail).toContain(
      'detected in 97.5% of 448 mapped cells',
    );
    expect(container.textContent).toContain('One biological story, four different evidence levels');
    expect(container.textContent).toContain('RNA evidence');
    expect(container.textContent).toContain('Protein presence');
    expect(container.textContent).toContain('Protein structure');
    expect(container.textContent).toContain('Function in context');

    await click(
      'The atlas supports a transcript-level hypothesis, while AlphaFold supplies separate structural-model evidence; protein abundance, localization, and function still require appropriate experiments.',
    );
    expect(latestState._alphaFoldExplorer.crossScaleAnswer).toBe('separate');
    expect(container.textContent).toContain(
      'transcript, protein, structure, and function are connected hypotheses',
    );

    const saveButtonBefore = buttonByText(container, 'Save cross-scale evidence record');
    expect(saveButtonBefore.disabled).toBe(true);
    await fill('af-cross-observation', 'I observed a compact core beside a more flexible model region.');
    await fill('af-cross-evidence', 'The confidence colors support the local core but flag uncertainty in the flexible region.');
    await fill('af-cross-claim', 'The RNA and structural model support a hypothesis, not proof of insulin abundance or activity.');
    await fill('af-cross-next-test', 'Measure insulin protein abundance and localization, then test glucose-responsive secretion.');
    await click('Save cross-scale evidence record');

    expect(latestState._alphaFoldExplorer.crossScaleEvidenceRecord).toMatchObject({
      schemaVersion: 1,
      kind: 'cell-atlas-alphafold-evidence',
      complete: true,
      accession: 'P01308',
      gene: 'INS',
      cellType: 'Beta cell',
      tissue: 'Pancreas',
    });
    expect(latestState.cellAtlasLab.alphaFoldEvidenceRecord).toEqual(
      latestState._alphaFoldExplorer.crossScaleEvidenceRecord,
    );
    expect(latestState._alphaFoldExplorer.crossScaleEvidenceRecord).not.toHaveProperty('sequence');
    expect(container.textContent).toContain('Evidence record saved for return to Cell Atlas');

    await click('← Return to Cell Atlas evidence');
    expect(latestTool).toBe('cellAtlasLab');
    expect(latestState.cellAtlasLab.alphaFoldRoundTrip).toBe(true);
    expect(latestState._alphaFoldExplorer.crossScaleReturnCount).toBe(1);
    expect(container.textContent).toContain('Illustrative pancreas cell-type expression neighborhood');
    expect(container.textContent).toContain('Cross-scale evidence record');
    expect(container.textContent).toContain('Learner structural observation');
    expect(container.textContent).toContain('compact core beside a more flexible model region');
    expect(container.textContent).toContain('Source atlas observation (Within-gene relative mean)');
    expect(container.textContent).toContain('No amino-acid sequence is stored');
    const recordQuest = window.StemLab._registry.cellAtlasLab.questHooks.find(
      (quest) => quest.id === 'atlas_scale_record',
    );
    expect(recordQuest.check(latestState.cellAtlasLab)).toBe(true);
  });

  it('receives only verified, redacted companion evidence for the handed-off public accession', async () => {
    const popup = { closed: false, postMessage: vi.fn(), focus: vi.fn(), location: { href: '' } };
    vi.spyOn(window, 'open').mockReturnValue(popup);
    const config = window.StemLab._registry.alphaFoldExplorer;

    function Host() {
      const [toolData, setToolData] = React.useState({
        cellAtlasLab: {},
        _alphaFoldExplorer: {
          _scaleJourneySource: 'cellAtlasLab',
          prefillAccession: 'P01308',
          prefillLabel: 'Human insulin',
          prefillGene: 'INS',
          prefillProtein: 'Insulin precursor',
          prefillCellType: 'Beta cell',
          prefillTissue: 'Pancreas',
          prefillEvidenceMode: 'Real aggregate RNA evidence',
          prefillMetricLabel: 'Within-gene relative mean',
          prefillEvidenceDetail: 'INS was detected in 97.5% of 448 mapped beta cells.',
          prefillEvidenceBoundary: 'RNA does not directly measure protein abundance or function.',
        },
      });
      latestState = toolData;
      return config.render(makeCtx({ toolData, setToolData, theme: 'dark', lang: 'en' }));
    }

    root = ReactDOMClient.createRoot(container);
    await act(async () => root.render(React.createElement(Host)));
    await click('Open Human insulin in AlphaFold Explorer');

    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', {
        source: popup,
        data: { type: 'allocaf-hello' },
      }));
    });
    const ready = popup.postMessage.mock.calls.find((call) => call[0].type === 'allocaf-ready')[0];
    expect(ready.cellAtlasHandoff).toMatchObject({
      schemaVersion: 1,
      source: 'cellAtlasLab',
      accession: 'P01308',
      gene: 'INS',
      cellType: 'Beta cell',
    });
    expect(ready.cellAtlasHandoff).not.toHaveProperty('sequence');

    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', {
        source: popup,
        data: {
          type: 'allocaf-cross-scale-evidence',
          schemaVersion: 1,
          source: 'AlphaFold DB',
          structureLoaded: true,
          accession: 'P01275',
          observation: 'This is long enough to be an observation.',
          evidence: 'This is long enough to be structure evidence.',
          claim: 'This is long enough to be a cautious claim.',
          caution: 'This is long enough to be a next experiment.',
        },
      }));
    });
    expect(latestState.cellAtlasLab.alphaFoldEvidenceRecord).toBeUndefined();

    const pastedSequence = 'ACDEFGHIKLMNPQRSTVWY'.repeat(3);
    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', {
        source: popup,
        data: {
          type: 'allocaf-cross-scale-evidence',
          schemaVersion: 1,
          source: 'AlphaFold DB',
          structureLoaded: true,
          accession: 'P01308',
          entryId: 'AF-P01308-F1',
          proteinName: 'Insulin precursor',
          organism: 'Homo sapiens',
          gene: 'INS',
          length: '110 amino acids',
          confidenceSummary: 'reported summary score 91.4',
          paeSelection: {
            available: true,
            matrixSize: 110,
            alignedResidue: 24,
            comparedResidue: 75,
            forwardAngstroms: 4.2,
            reverseAngstroms: 6.1,
            interpretation: 'Low-to-moderate directional uncertainty for this pair.',
            matrix: [[0, 1], [1, 0]],
          },
          observation: 'Observed a compact core ' + pastedSequence,
          evidence: 'The pLDDT coloring supports the folded core while flagging a flexible segment.',
          claim: 'The model supports a structural hypothesis but does not prove insulin abundance or activity.',
          caution: 'Measure protein abundance and localization, then test glucose-responsive secretion.',
          sequence: pastedSequence,
          rawStructure: 'not allowed',
        },
      }));
    });

    const record = latestState.cellAtlasLab.alphaFoldEvidenceRecord;
    expect(record).toMatchObject({
      kind: 'cell-atlas-alphafold-evidence',
      captureMethod: 'alphafold-companion-explicit-send',
      accession: 'P01308',
      structureRecord: {
        source: 'AlphaFold DB',
        accession: 'P01308',
        structureLoaded: true,
        confidenceSummary: 'reported summary score 91.4',
        paeSelection: {
          available: true,
          alignedResidue: 24,
          comparedResidue: 75,
          forwardAngstroms: 4.2,
          reverseAngstroms: 6.1,
        },
      },
    });
    expect(record.structureObservation).toContain('[protein sequence omitted]');
    expect(record).not.toHaveProperty('sequence');
    expect(record).not.toHaveProperty('rawStructure');
    expect(record.structureRecord.paeSelection).not.toHaveProperty('matrix');

    const savedToolData = latestState;
    const cellConfig = window.StemLab._registry.cellAtlasLab;
    function ReturnedCellAtlas() {
      const [toolData, setToolData] = React.useState(savedToolData);
      return cellConfig.render(makeCtx({ toolData, setToolData, theme: 'dark', lang: 'en' }));
    }
    await act(async () => root.render(React.createElement(ReturnedCellAtlas)));
    expect(container.textContent).toContain('Companion verification');
    expect(container.textContent).toContain('successfully loaded before this explicit handoff');
    expect(container.textContent).toContain('reported summary score 91.4');
    expect(container.textContent).toContain('Selected PAE pair: residues 24 and 75');
  });

  it('keeps the companion handoff explicit, public-record-only, sequence-free, and mirrored', () => {
    const companion = readFileSync(resolve(process.cwd(), COMPANION_FILE), 'utf8');
    const mirror = readFileSync(resolve(process.cwd(), COMPANION_MIRROR), 'utf8');
    expect(mirror).toBe(companion);
    expect(companion).toContain('id="sendCellAtlasEvidenceBtn"');
    expect(companion).toContain("type: 'allocaf-cross-scale-evidence'");
    expect(companion).toContain("current.source === 'AlphaFold DB'");
    expect(companion).toContain('structureLoaded');
    expect(companion).toContain('redactSequenceLikeText(noteInput.value.trim())');
    const sendBlock = companion.match(/function sendCellAtlasEvidence\(\) \{[\s\S]*?\n  \}\n\n  function renderAiState/);
    expect(sendBlock).not.toBeNull();
    expect(sendBlock[0]).not.toMatch(/\bsequence\s*:/i);
    expect(sendBlock[0]).not.toMatch(/\bmatrix\s*:/i);
  });

  it('does not render the Cell Atlas evidence ladder for a generic AlphaFold visit', async () => {
    const config = window.StemLab._registry.alphaFoldExplorer;
    function Host() {
      const [toolData, setToolData] = React.useState({ _alphaFoldExplorer: {} });
      return config.render(makeCtx({ toolData, setToolData, theme: 'dark', lang: 'en' }));
    }
    root = ReactDOMClient.createRoot(container);
    await act(async () => root.render(React.createElement(Host)));
    expect(container.textContent).not.toContain('One biological story, four different evidence levels');
    expect(container.textContent).toContain('AlphaFold Explorer');
  });
});
