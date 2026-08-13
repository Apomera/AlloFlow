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

const BASE_STATE = {
  _activeTab: 'explore',
  system: 'skeletal',
  view: 'anterior',
  complexity: 3,
};

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
    anatomy: { ...BASE_STATE, ...state },
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

describe('Anatomy manual model focus', () => {
  it.each(ANATOMY_PATHS)('keeps model focus reversible while preserving the SSR workspace in %s', (filePath) => {
    const tool = loadTool(filePath, 'anatomy');
    const initialToolData = { anatomy: { ...BASE_STATE } };
    let updatedToolData = initialToolData;
    const setToolData = vi.fn((updater) => {
      updatedToolData = typeof updater === 'function' ? updater(updatedToolData) : updater;
    });

    const initialTree = tool.render(makeCtx({ toolData: initialToolData, setToolData }));
    const initialShell = findElement(initialTree, (node) => node.props
      && node.props['data-anatomy-model-focus'] === 'false');
    const initialToggle = findElement(initialTree, (node) => node.type === 'button'
      && node.props
      && node.props['data-anatomy-model-focus-toggle'] === 'true');

    expect(initialShell).not.toBeNull();
    expect(initialToggle).not.toBeNull();
    expect(initialToggle.props['aria-pressed']).toBe('false');
    expect(textOf(initialToggle).trim()).toBe('Focus model');

    initialToggle.props.onClick();
    expect(setToolData).toHaveBeenCalled();

    const focusedTree = tool.render(makeCtx({ toolData: updatedToolData, setToolData }));
    const focusedShell = findElement(focusedTree, (node) => node.props
      && node.props['data-anatomy-model-focus'] === 'true');
    const focusedToggle = findElement(focusedTree, (node) => node.type === 'button'
      && node.props
      && node.props['data-anatomy-model-focus-toggle'] === 'true');

    expect(focusedShell).not.toBeNull();
    expect(focusedToggle).not.toBeNull();
    expect(focusedToggle.props['aria-pressed']).toBe('true');
    expect(textOf(focusedToggle).trim()).toBe('Exit focus');

    const focusedHtml = parseMarkup(renderTool('anatomy', updatedToolData));
    expect(focusedHtml.querySelector('[data-anatomy-mission]')).not.toBeNull();
    expect(focusedHtml.querySelector('[data-anatomy-tab-strip]')).not.toBeNull();
    expect(focusedHtml.querySelector('[data-anatomy-model-shell]')).not.toBeNull();
    expect(focusedHtml.querySelector('[data-anatomy-panel]')).not.toBeNull();
  });

  it.each(ANATOMY_PATHS)('uses focus-state CSS to remove chrome visually and widen the model without deleting it in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toContain('data-anatomy-model-focus');
    expect(source).toMatch(/\.anatomy-tool-shell\[data-anatomy-model-focus=["']?true["']?\][^{]*\.anatomy-side-panel[^\{]*\{[^}]*display\s*:\s*none/);
    expect(source).toMatch(/\.anatomy-tool-shell\[data-anatomy-model-focus=["']?true["']?\][^{]*\.anatomy-workspace\s*\{[^}]*(?:grid-template-columns|max-width|width)\s*:/);
    expect(source).toMatch(/\.anatomy-tool-shell\[data-anatomy-model-focus=["']?true["']?\][^{]*\.anatomy-body-shell\s*\{[^}]*(?:max-width\s*:\s*none|width\s*:\s*100%)/);
    expect(source).toMatch(/\.anatomy-tool-shell\[data-anatomy-model-focus=["']?true["']?\][^{]*\.anatomy-canvas-frame[^\{]*\{[^}]*width\s*:/);
  });
});

describe('Anatomy progressive-disclosure polish', () => {
  it.each(ANATOMY_PATHS)('keeps the Clinical pack switcher visible outside collapsible provenance in %s', (filePath) => {
    const root = parseMarkup(renderAnatomy(filePath, HEART_CLINICAL_STATE));
    const switcher = root.querySelector('[data-anatomy-clinical-pack-switcher="true"]');
    const select = switcher?.querySelector('select[data-anatomy-clinical-pack-select="true"]');
    const provenance = root.querySelector(`details[data-anatomy-clinical-atlas-provenance="${HEART_PACK_ID}"]`);

    expect(switcher).not.toBeNull();
    expect(select).not.toBeNull();
    expect(select.getAttribute('aria-label')).toBe('Clinical Atlas pack');
    expect(select.value).toBe(HEART_PACK_ID);
    expect([...select.options].map((option) => option.textContent)).toEqual([
      'Clinical Kidney Atlas',
      'Clinical Heart Atlas',
    ]);
    expect(provenance).not.toBeNull();
    expect(provenance.contains(switcher)).toBe(false);
    expect(provenance.querySelector('summary')?.textContent).toContain('Atlas source & credits');
  }, 60_000);

  it.each(ANATOMY_PATHS)('uses a collapsible guide that remains the canvas description in every model view in %s', (filePath) => {
    const states = [
      BASE_STATE,
      { ...BASE_STATE, _bodyView3d: true, _body3dStyle: 'realistic' },
      HEART_CLINICAL_STATE,
    ];

    states.forEach((state) => {
      resetStemLab();
      const root = parseMarkup(renderAnatomy(filePath, state));
      const canvas = root.querySelector('[data-anatomy-canvas], [data-anatomy-3d-canvas]');
      const guide = root.querySelector('details[data-anatomy-canvas-help="true"]');

      expect(canvas).not.toBeNull();
      expect(guide).not.toBeNull();
      expect(guide.id).toBe('anatomy-canvas-instructions');
      expect(guide.querySelector('summary')).not.toBeNull();
      expect(canvas.getAttribute('aria-describedby').split(/\s+/)).toContain(guide.id);
    });
  }, 60_000);

  it.each(ANATOMY_PATHS)('keeps Scale Journey in Learning tools and scopes pin status to non-Clinical views in %s', (filePath) => {
    const views = [BASE_STATE, HEART_CLINICAL_STATE];

    views.forEach((state) => {
      resetStemLab();
      const root = parseMarkup(renderAnatomy(filePath, state));
      const learningTools = root.querySelector('details[data-anatomy-learning-tools="true"]');

      expect(learningTools).not.toBeNull();
      expect(learningTools.querySelector('summary')?.textContent).toMatch(/Learning tools/i);
      expect(learningTools.querySelector('[data-anatomy-scale-journey]')).not.toBeNull();
      if (state === HEART_CLINICAL_STATE) {
        expect(learningTools.querySelector('.anatomy-marker-legend')).toBeNull();
        expect(root.querySelector('[data-anatomy-clinical-visual-key="true"]')).not.toBeNull();
        expect(learningTools.querySelector('[data-anatomy-clinical-visual-key="true"]')).toBeNull();
      } else {
        expect(learningTools.querySelector('.anatomy-marker-legend')).not.toBeNull();
        expect(root.querySelector('[data-anatomy-clinical-visual-key="true"]')).toBeNull();
      }
    });
  }, 60_000);
});

describe('Anatomy responsive interaction states', () => {
  it.each(ANATOMY_PATHS)('gives every Anatomy control type a visible keyboard focus indicator in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');

    ['button', 'input', 'select', 'textarea', 'summary', 'a', 'canvas'].forEach((element) => {
      expect(source).toContain(`.anatomy-tool-shell ${element}:focus-visible`);
    });
  });

  it.each(ANATOMY_PATHS)('keeps the new mobile focus, disclosure, and pack controls touch sized in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toMatch(/\.anatomy-model-focus-toggle\s*\{[^}]*min-height\s*:\s*44px/);
    expect(source).toMatch(/\.anatomy-clinical-pack-switcher select\s*\{[^}]*min-height\s*:\s*44px/);
    expect(source).toMatch(/\.anatomy-canvas-guide-summary[^\{]*\{[^}]*min-height\s*:\s*44px/);
    expect(source).toMatch(/\.anatomy-learning-tools-summary[^\{]*\{[^}]*min-height\s*:\s*44px/);
  });

  it.each(ANATOMY_PATHS)('exposes exactly one active tab, model view, and Clinical concept in %s', (filePath) => {
    const root = parseMarkup(renderAnatomy(filePath, HEART_CLINICAL_STATE));
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const modelViews = [...root.querySelectorAll('[data-anatomy-view-option]')];
    const concepts = [...root.querySelectorAll('[data-anatomy-clinical-concept]')];

    expect(tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true')).toHaveLength(1);
    expect(tabs.filter((tab) => tab.tabIndex === 0)).toHaveLength(1);
    expect(modelViews.filter((view) => view.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(modelViews.find((view) => view.getAttribute('aria-pressed') === 'true')?.dataset.anatomyViewOption).toBe('clinical');
    expect(concepts.filter((concept) => concept.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(concepts.filter((concept) => concept.dataset.selected === 'true')).toHaveLength(1);
  }, 60_000);
});
