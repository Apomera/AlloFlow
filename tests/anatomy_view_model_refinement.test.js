import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 60_000 });

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

const HEART_PACK_ID = 'hra-heart-female-v1.3';

const BASE_STATE = {
  _activeTab: 'explore',
  system: 'skeletal',
  view: 'anterior',
  complexity: 3,
};

const HEART_CLINICAL_STATE = {
  ...BASE_STATE,
  system: 'circulatory',
  selectedStructure: 'heart',
  _bodyView3d: true,
  _body3dStyle: 'clinical',
  _clinicalAtlasPackId: HEART_PACK_ID,
};

function renderAnatomy(filePath, state = {}) {
  loadTool(filePath, 'anatomy');
  return renderTool('anatomy', {
    anatomy: { ...BASE_STATE, ...state },
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

function getOption(group, attribute, value) {
  return group?.querySelector(`button[${attribute}="${value}"]`) || null;
}

function expectVisibleGroupLabel(root, group, expectedText) {
  expect(group).toBeTruthy();
  if (!group) return;
  expect(group.getAttribute('role')).toBe('group');
  const labelId = group.getAttribute('aria-labelledby');
  expect(labelId).toBeTruthy();
  expect(root.querySelector('[id="' + labelId + '"]')?.textContent).toMatch(expectedText);
}

beforeEach(() => {
  resetStemLab();
});

describe('Anatomy View and Model control hierarchy', () => {
  it.each(ANATOMY_PATHS)('keeps View as a two-choice dimension control in the 2D atlas from %s', (filePath) => {
    const root = parseMarkup(renderAnatomy(filePath));
    const controls = root.querySelector('[data-anatomy-view-model-controls="true"]');
    const viewSwitcher = controls?.querySelector('[data-anatomy-view-switcher="true"]');
    const modelSwitcher = controls?.querySelector('[data-anatomy-model-switcher="true"]');
    const viewOptions = [...(viewSwitcher?.querySelectorAll('button[data-anatomy-view-dimension]') || [])];

    expect(controls).not.toBeNull();
    expectVisibleGroupLabel(root, viewSwitcher, /^View$/i);
    expect(viewOptions.map((button) => button.dataset.anatomyViewDimension)).toEqual(['2d', '3d']);
    expect(viewOptions[0].textContent.trim()).toMatch(/^2D(?: Atlas)?$/i);
    expect(viewOptions[1].textContent.trim()).toMatch(/^3D(?: View)?$/i);
    expect(getOption(viewSwitcher, 'data-anatomy-view-dimension', '2d')?.dataset.anatomyViewOption).toBe('2d');
    expect(viewOptions.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(getOption(viewSwitcher, 'data-anatomy-view-dimension', '2d')?.getAttribute('aria-pressed')).toBe('true');
    expect(modelSwitcher).toBeNull();
  });

  it.each(ANATOMY_PATHS)('reveals a separate Model control only in 3D and marks one model active in %s', (filePath) => {
    const surfaceRoot = parseMarkup(renderAnatomy(filePath, {
      _bodyView3d: true,
      _body3dStyle: 'realistic',
    }));
    const surfaceControls = surfaceRoot.querySelector('[data-anatomy-view-model-controls="true"]');
    const surfaceView = surfaceControls?.querySelector('[data-anatomy-view-switcher="true"]');
    const surfaceModels = surfaceControls?.querySelector('[data-anatomy-model-switcher="true"]');
    const surfaceOptions = [...(surfaceModels?.querySelectorAll('button[data-anatomy-model-option]') || [])];

    expectVisibleGroupLabel(surfaceRoot, surfaceView, /^View$/i);
    expectVisibleGroupLabel(surfaceRoot, surfaceModels, /^Model$/i);
    expect(getOption(surfaceView, 'data-anatomy-view-dimension', '3d')?.getAttribute('aria-pressed')).toBe('true');
    expect(surfaceOptions.map((button) => button.dataset.anatomyModelOption)).toEqual(['blueprint', 'realistic']);
    expect(surfaceOptions[0].textContent).toMatch(/Blueprint/i);
    expect(surfaceOptions[1].textContent).toMatch(/Surface/i);
    expect(surfaceOptions.map((button) => button.dataset.anatomyViewOption)).toEqual(['blueprint', 'realistic']);
    expect(surfaceOptions.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(getOption(surfaceModels, 'data-anatomy-model-option', 'realistic')?.getAttribute('aria-pressed')).toBe('true');

    resetStemLab();
    const clinicalRoot = parseMarkup(renderAnatomy(filePath, HEART_CLINICAL_STATE));
    const clinicalModels = clinicalRoot.querySelector('[data-anatomy-model-switcher="true"]');
    const clinicalOptions = [...(clinicalModels?.querySelectorAll('button[data-anatomy-model-option]') || [])];

    expectVisibleGroupLabel(clinicalRoot, clinicalModels, /^Model$/i);
    expect(clinicalOptions.map((button) => button.dataset.anatomyModelOption)).toEqual(['blueprint', 'realistic', 'clinical']);
    expect(clinicalOptions[0].textContent).toMatch(/Blueprint/i);
    expect(clinicalOptions[1].textContent).toMatch(/Surface/i);
    expect(clinicalOptions[2].textContent).toMatch(/Clinical Atlas/i);
    expect(clinicalOptions.map((button) => button.dataset.anatomyViewOption)).toEqual(['blueprint', 'realistic', 'clinical']);
    expect(clinicalOptions.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(getOption(clinicalModels, 'data-anatomy-model-option', 'clinical')?.getAttribute('aria-pressed')).toBe('true');
  }, 60_000);

  it.each(ANATOMY_PATHS)('round-trips 2D and 3D without losing the selected model or model-focus state in %s', (filePath) => {
    const tool = loadTool(filePath, 'anatomy');
    let updatedToolData = {
      anatomy: {
        ...BASE_STATE,
        _bodyView3d: true,
        _body3dStyle: 'realistic',
        _anatomyModelFocus: true,
      },
    };
    const setToolData = vi.fn((updater) => {
      updatedToolData = typeof updater === 'function' ? updater(updatedToolData) : updater;
    });
    const renderTree = () => tool.render(makeCtx({ toolData: updatedToolData, setToolData }));
    const findControl = (tree, attribute, value) => findElement(tree, (node) => node.type === 'button'
      && node.props
      && node.props[attribute] === value);

    let tree = renderTree();
    const twoDimensional = findControl(tree, 'data-anatomy-view-dimension', '2d');
    expect(twoDimensional).not.toBeNull();
    twoDimensional.props.onClick();
    expect(updatedToolData.anatomy).toMatchObject({
      _bodyView3d: false,
      _body3dStyle: 'realistic',
      _anatomyModelFocus: true,
    });

    tree = renderTree();
    const threeDimensional = findControl(tree, 'data-anatomy-view-dimension', '3d');
    expect(threeDimensional).not.toBeNull();
    threeDimensional.props.onClick();
    expect(updatedToolData.anatomy).toMatchObject({
      _bodyView3d: true,
      _body3dStyle: 'realistic',
      _anatomyModelFocus: true,
    });

    tree = renderTree();
    const surface = findControl(tree, 'data-anatomy-model-option', 'realistic');
    const blueprint = findControl(tree, 'data-anatomy-model-option', 'blueprint');
    expect(surface?.props['aria-pressed']).toBe('true');
    expect(blueprint).not.toBeNull();
    blueprint.props.onClick();
    expect(updatedToolData.anatomy).toMatchObject({
      _bodyView3d: true,
      _body3dStyle: 'blueprint',
      _anatomyModelFocus: true,
    });

    tree = renderTree();
    expect(findElement(tree, (node) => node.props
      && node.props['data-anatomy-model-focus'] === 'true')).not.toBeNull();
    expect(findControl(tree, 'data-anatomy-model-option', 'blueprint')?.props['aria-pressed']).toBe('true');
  });
});

describe('Anatomy model-aware canvas toolbar', () => {
  it.each(ANATOMY_PATHS)('renders only the relevant labeled canvas controls in every model from %s', (filePath) => {
    const modes = [
      {
        id: '2d',
        state: { _bodyView3d: false },
        groupLabel: /2D diagram controls/i,
        visibleLabel: /diagram|patient/i,
        controls: ['zoom-out', 'zoom-in', 'pan-left', 'pan-up', 'pan-down', 'pan-right', 'focus', 'reset'],
      },
      {
        id: 'blueprint',
        state: { _bodyView3d: true, _body3dStyle: 'blueprint' },
        groupLabel: /Blueprint camera controls/i,
        visibleLabel: /Blueprint/i,
        controls: ['rotate-left', 'rotate-right', 'tilt-up', 'tilt-down', 'zoom-in', 'zoom-out', 'reset'],
      },
      {
        id: 'realistic',
        state: { _bodyView3d: true, _body3dStyle: 'realistic' },
        groupLabel: /Surface camera controls/i,
        visibleLabel: /Surface/i,
        controls: ['rotate-left', 'rotate-right', 'tilt-up', 'tilt-down', 'zoom-in', 'zoom-out', 'reset'],
      },
      {
        id: 'clinical',
        state: HEART_CLINICAL_STATE,
        groupLabel: /Clinical Atlas camera controls/i,
        visibleLabel: /Clinical Atlas/i,
        controls: ['rotate-left', 'rotate-right', 'tilt-up', 'tilt-down', 'zoom-in', 'zoom-out', 'reset'],
      },
    ];

    modes.forEach((mode) => {
      resetStemLab();
      const root = parseMarkup(renderAnatomy(filePath, mode.state));
      const toolbar = root.querySelector('[data-anatomy-canvas-toolbar="true"]');
      const groups = [...(toolbar?.querySelectorAll('[data-anatomy-canvas-controls]') || [])];
      const group = toolbar?.querySelector(`[data-anatomy-canvas-controls="${mode.id}"]`);
      const label = toolbar?.querySelector('[data-anatomy-canvas-toolbar-label="true"]');
      const buttons = [...(group?.querySelectorAll('button[data-anatomy-canvas-control]') || [])];

      expect(toolbar).not.toBeNull();
      expect(toolbar.dataset.anatomyCanvasMode).toBe(mode.id);
      expect(groups).toHaveLength(1);
      expect(group).toBeTruthy();
      expect(group?.getAttribute('role')).toBe('group');
      expect(group?.getAttribute('aria-label')).toMatch(mode.groupLabel);
      expect(label).toBeTruthy();
      expect(label?.textContent).toMatch(mode.visibleLabel);
      expect(buttons.map((button) => button.dataset.anatomyCanvasControl)).toEqual(mode.controls);
      buttons.forEach((button) => {
        expect(button.type).toBe('button');
        expect(button.getAttribute('aria-label')).toBeTruthy();
      });
    });
  }, 60_000);

  it.each(ANATOMY_PATHS)('offers procedure handoff only from whole-body Blueprint and Surface models in %s', (filePath) => {
    const blueprint = parseMarkup(renderAnatomy(filePath, {
      _bodyView3d: true,
      _body3dStyle: 'blueprint',
    }));
    resetStemLab();
    const surface = parseMarkup(renderAnatomy(filePath, {
      _bodyView3d: true,
      _body3dStyle: 'realistic',
    }));
    resetStemLab();
    const clinical = parseMarkup(renderAnatomy(filePath, HEART_CLINICAL_STATE));
    const clinicalCanvas = clinical.querySelector('[data-anatomy-3d-canvas="true"]');

    expect(blueprint.querySelector('[data-anatomy-3d-procedure-launch="true"]')).not.toBeNull();
    expect(surface.querySelector('[data-anatomy-3d-procedure-launch="true"]')).not.toBeNull();
    expect(clinical.querySelector('[data-anatomy-3d-procedure-launch="true"]')).toBeNull();
    expect(clinicalCanvas.getAttribute('aria-keyshortcuts')).not.toMatch(/\[|\]/);
  }, 60_000);
});

describe('Anatomy stateful canvas identity', () => {
  function canvasDeclarationPrelude(anatomySource, hook) {
    const hookIndex = anatomySource.indexOf(`'${hook}': 'true'`);
    expect(hookIndex, `Missing ${hook}`).toBeGreaterThan(-1);
    const canvasIndex = anatomySource.lastIndexOf("h('canvas', {", hookIndex);
    expect(canvasIndex, `Missing canvas declaration for ${hook}`).toBeGreaterThan(-1);
    return anatomySource.slice(canvasIndex, hookIndex);
  }

  function renderElement(tool, anatomyState) {
    return tool.render(makeCtx({ toolData: { anatomy: anatomyState } }));
  }

  it.each(ANATOMY_PATHS)('does not assign state-derived React keys to the procedure or imaging canvas source in %s', (filePath) => {
    const anatomySource = fs.readFileSync(filePath, 'utf8');
    const procedurePrelude = canvasDeclarationPrelude(anatomySource, 'data-anatomy-procedure-canvas');
    const imagingPrelude = canvasDeclarationPrelude(anatomySource, 'data-anatomy-imaging-canvas');

    expect.soft(procedurePrelude).not.toMatch(/\bkey\s*:/);
    expect.soft(imagingPrelude).not.toMatch(/\bkey\s*:/);
    expect.soft(anatomySource.includes('function stableAnatomyProcedureRef(canvas)')).toBe(true);
    expect.soft(anatomySource.includes('function paintAnatomyProcedureFrame')).toBe(true);
    expect.soft(anatomySource.includes('ref: stableAnatomyProcedureRef')).toBe(true);
    const hasLatestPainterHook = anatomySource.includes('anatomyProcedureController.push(paintAnatomyProcedureFrame);')
      || /canvas\._anatomyProcedure[A-Za-z]*(?:Paint|Painter)[A-Za-z]*\s*=\s*paintAnatomyProcedureFrame/.test(anatomySource);
    expect.soft(hasLatestPainterHook).toBe(true);
  });

  it.each(ANATOMY_PATHS)('keeps the procedure canvas unkeyed across interactive state updates in %s', (filePath) => {
    const tool = loadTool(filePath, 'anatomy');
    const baseProcedure = {
      stage: 3,
      planLocked: true,
      timeoutConfirmed: true,
      sterilePrep: true,
      eyeProtection: true,
      tool: 'retractor',
      incisionDepth: 64,
      exposure: 38,
      bleeding: 24,
    };
    const firstTree = renderElement(tool, {
      ...BASE_STATE,
      _activeTab: 'procedure',
      procedure: baseProcedure,
    });
    const secondTree = renderElement(tool, {
      ...BASE_STATE,
      _activeTab: 'procedure',
      procedure: { ...baseProcedure, exposure: 51, bleeding: 17 },
    });
    const isProcedureCanvas = (node) => node.type === 'canvas'
      && node.props
      && node.props['data-anatomy-procedure-canvas'] === 'true';
    const firstCanvas = findElement(firstTree, isProcedureCanvas);
    const secondCanvas = findElement(secondTree, isProcedureCanvas);

    expect(firstCanvas).not.toBeNull();
    expect(secondCanvas).not.toBeNull();
    expect.soft(firstCanvas?.key).toBeNull();
    expect.soft(secondCanvas?.key).toBeNull();
    expect(typeof firstCanvas?.ref).toBe('function');
    expect(secondCanvas?.ref).toBe(firstCanvas?.ref);
  });

  it.each(ANATOMY_PATHS)('keeps the imaging canvas unkeyed across slice and window updates in %s', (filePath) => {
    const tool = loadTool(filePath, 'anatomy');
    const firstTree = renderElement(tool, {
      ...BASE_STATE,
      _activeTab: 'imaging',
      imaging: { modality: 'CT', region: 'chest', plane: 'axial', slice: 42, windowWidth: 400, windowLevel: 40 },
    });
    const secondTree = renderElement(tool, {
      ...BASE_STATE,
      _activeTab: 'imaging',
      imaging: { modality: 'CT', region: 'chest', plane: 'axial', slice: 57, windowWidth: 1200, windowLevel: 120 },
    });
    const isImagingCanvas = (node) => node.type === 'canvas'
      && node.props
      && node.props['data-anatomy-imaging-canvas'] === 'true';
    const firstCanvas = findElement(firstTree, isImagingCanvas);
    const secondCanvas = findElement(secondTree, isImagingCanvas);

    expect(firstCanvas).not.toBeNull();
    expect(secondCanvas).not.toBeNull();
    expect.soft(firstCanvas?.key).toBeNull();
    expect.soft(secondCanvas?.key).toBeNull();
  });
});

describe('Anatomy structure list-to-detail focus handoff', () => {
  it.each(ANATOMY_PATHS)('exposes stable list and programmatic detail-heading focus hooks in %s', (filePath) => {
    const listRoot = parseMarkup(renderAnatomy(filePath));
    const list = listRoot.querySelector('[data-anatomy-structure-list="true"]');
    const options = [...(list?.querySelectorAll('button[data-anatomy-structure-option]') || [])];

    expect(list).not.toBeNull();
    expect(options.length).toBeGreaterThan(0);
    options.forEach((option) => {
      expect(option.type).toBe('button');
      expect(option.dataset.anatomyStructureOption).toBeTruthy();
    });

    const selectedId = options[0].dataset.anatomyStructureOption;
    resetStemLab();
    const detailRoot = parseMarkup(renderAnatomy(filePath, { selectedStructure: selectedId }));
    const detail = detailRoot.querySelector(`[data-anatomy-structure-detail="${selectedId}"]`);
    const heading = detail?.querySelector('[data-anatomy-structure-detail-heading="true"]');

    expect(detail).toBeTruthy();
    expect(detail?.getAttribute('role')).toBe('region');
    expect(heading).toBeTruthy();
    expect(heading?.id).toBeTruthy();
    expect(heading?.tabIndex).toBe(-1);
    expect(detail?.getAttribute('aria-labelledby')).toBe(heading?.id);
    expect(heading?.textContent.trim()).toBe(options[0].querySelector('.font-bold')?.textContent.trim());
  });

  it.each(ANATOMY_PATHS)('focuses the selected structure heading after a list-button selection in %s', (filePath) => {
    const anatomySource = fs.readFileSync(filePath, 'utf8');

    expect(anatomySource.includes('function focusAnatomyStructureDetail()')).toBe(true);
    expect(anatomySource.includes("[data-anatomy-structure-detail-heading=\"true\"]")).toBe(true);
    expect(/focusAnatomyStructureDetail\(\)[\s\S]{0,500}\.focus\(/.test(anatomySource)).toBe(true);
  });
});
