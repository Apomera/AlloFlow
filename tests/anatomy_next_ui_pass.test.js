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
const SELECTED_HEART_CONCEPT_ID = 'UBERON:0002084';

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
  _clinicalAtlasConceptId: SELECTED_HEART_CONCEPT_ID,
};

function renderAnatomy(filePath, state = {}, overrides) {
  loadTool(filePath, 'anatomy');
  return renderTool('anatomy', {
    anatomy: { ...BASE_STATE, ...state },
  }, overrides);
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

beforeEach(() => {
  resetStemLab();
});

describe('Anatomy compact study dashboard', () => {
  it.each(ANATOMY_PATHS)('uses a collapsed native disclosure while preserving every study signal in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const root = parseMarkup(renderAnatomy(filePath, {
      _structuresViewed: { skull: true, ribs: true },
      _systemsExplored: { skeletal: true },
    }));
    const dashboard = root.querySelector('details[data-anatomy-study-dashboard="true"]');
    const summary = dashboard?.querySelector(':scope > summary[data-anatomy-study-dashboard-summary="true"]');
    const content = dashboard?.querySelector(':scope > [data-anatomy-study-dashboard-content="true"]');
    const mission = root.querySelector('[data-anatomy-mission="true"]');
    const missionTitle = mission?.querySelector('.anatomy-mission-title');

    expect(mission.getAttribute('aria-labelledby')).toBe(missionTitle.id);
    expect(dashboard).not.toBeNull();
    expect(dashboard.hasAttribute('open')).toBe(false);
    expect(summary).not.toBeNull();
    expect(summary.textContent).toMatch(/Study dashboard/i);
    expect(content).not.toBeNull();
    expect(content.querySelectorAll('.anatomy-metric')).toHaveLength(6);
    const challengeList = content.querySelector('.anatomy-challenge-strip');
    expect(challengeList).not.toBeNull();
    expect(challengeList.getAttribute('role')).toBe('list');
    [...challengeList.querySelectorAll('.anatomy-challenge-chip')].forEach((chip) => {
      expect(chip.getAttribute('role')).toBe('listitem');
      expect(chip.getAttribute('aria-label')).toMatch(/completed|not completed/i);
    });
    expect(content.querySelector('.anatomy-coach')).not.toBeNull();
    expect(content.textContent).toContain('Structures viewed');
    expect(content.textContent).toContain('Systems explored');
    expect(content.textContent).toContain('Recommended next step');
    expect(source).not.toMatch(/\.anatomy-mission-text\{[^}]*-webkit-line-clamp/);
  });
});

describe('Anatomy desktop learning-mode strip', () => {
  it.each(ANATOMY_PATHS)('keeps all modes in one horizontally scrollable row at every width in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const root = parseMarkup(renderAnatomy(filePath));
    const strip = root.querySelector('[data-anatomy-tab-strip="true"]');
    const tabs = [...(strip?.querySelectorAll(':scope > [role="tab"]') || [])];

    expect(strip).not.toBeNull();
    expect(strip.className.split(/\s+/)).not.toContain('flex-wrap');
    expect(strip.getAttribute('role')).toBe('tablist');
    expect(strip.getAttribute('aria-orientation')).toBe('horizontal');
    // Harness profile is '5th Grade': Quiz joins the strip, the two clinician-level workspaces
    // (Imaging Lab, Procedure Studio) are hidden for a known K-5 profile.
    expect(tabs).toHaveLength(9);
    expect(tabs.map((tab) => tab.id)).toContain('anatomy-mode-tab-quiz');
    expect(tabs.map((tab) => tab.id)).not.toContain('anatomy-mode-tab-imaging');
    expect(tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true')).toHaveLength(1);
    const olderRoot = parseMarkup(renderAnatomy(filePath, {}, { gradeLevel: '9' }));
    const olderTabs = [...olderRoot.querySelector('[data-anatomy-tab-strip="true"]').querySelectorAll(':scope > [role="tab"]')];
    expect(olderTabs).toHaveLength(11);
    expect(olderTabs[olderTabs.length - 1].id).toBe('anatomy-mode-tab-procedure');
    const panel = root.querySelector('[data-anatomy-panel]');
    const activeTab = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true');
    expect(tabs.every((tab) => /^anatomy-mode-tab-/.test(tab.id))).toBe(true);
    expect(panel.getAttribute('aria-labelledby')).toBe(activeTab.id);
    expect(source).toMatch(/'\.anatomy-tab-strip\{(?=[^}]*display:flex!important)(?=[^}]*flex-wrap:nowrap!important)(?=[^}]*overflow-x:auto)(?=[^}]*overscroll-behavior-x:contain)[^}]*\}'/);
    expect(source).toMatch(/'\.anatomy-tab-strip>button\{[^}]*flex:0 0 auto/);
    expect(source).toContain('scrollIntoView');
  });
});

describe('Anatomy Clinical concept search', () => {
  it.each(ANATOMY_PATHS)('filters labels accessibly while retaining a nonmatching selected concept in %s', (filePath) => {
    const tool = loadTool(filePath, 'anatomy');
    const initialToolData = { anatomy: { ...HEART_CLINICAL_STATE } };
    let updatedToolData = initialToolData;
    const setToolData = vi.fn((updater) => {
      updatedToolData = typeof updater === 'function' ? updater(updatedToolData) : updater;
    });
    const tree = tool.render(makeCtx({ toolData: initialToolData, setToolData }));
    const search = findElement(tree, (node) => node.type === 'input'
      && node.props
      && node.props['data-anatomy-clinical-concept-search'] === 'true');

    expect(search).not.toBeNull();
    expect(search.props.type).toBe('search');
    expect(search.props.role).toBe('searchbox');
    expect(search.props['aria-label']).toMatch(/Search Clinical Atlas concepts/i);
    expect(search.props['aria-controls']).toBeTruthy();
    search.props.onChange({ target: { value: 'valve' }, currentTarget: { value: 'valve' } });

    expect(setToolData).toHaveBeenCalled();
    expect(updatedToolData.anatomy).toMatchObject({
      _clinicalConceptSearch: 'valve',
      _clinicalAtlasConceptId: SELECTED_HEART_CONCEPT_ID,
    });

    const root = parseMarkup(renderTool('anatomy', updatedToolData));
    const renderedSearch = root.querySelector('input[data-anatomy-clinical-concept-search="true"]');
    const scroll = root.querySelector('[data-anatomy-clinical-concept-scroll="true"]');
    const results = root.querySelector('[data-anatomy-clinical-concept-results="true"]');
    const controls = [...(scroll?.querySelectorAll('button[data-anatomy-clinical-concept]') || [])];
    const selected = controls.find((control) => control.dataset.anatomyClinicalConcept === SELECTED_HEART_CONCEPT_ID);

    expect(renderedSearch.value).toBe('valve');
    expect(renderedSearch.getAttribute('aria-controls')).toBe(scroll.id);
    expect(scroll.getAttribute('role')).toBe('region');
    expect(scroll.getAttribute('aria-label')).toMatch(/Clinical Atlas concepts/i);
    expect(scroll.tabIndex).toBe(-1);
    expect(controls.filter((control) => control.tabIndex === 0)).toHaveLength(1);
    expect(results.getAttribute('role')).toBe('status');
    expect(results.getAttribute('aria-live')).toBe('polite');
    expect(controls).toHaveLength(6);
    expect(selected).not.toBeNull();
    expect(selected.getAttribute('aria-pressed')).toBe('true');
    expect(selected.dataset.selected).toBe('true');
    controls.filter((control) => control !== selected).forEach((control) => {
      expect(control.textContent.toLowerCase()).toContain('valve');
    });
  });

  it.each(ANATOMY_PATHS)('matches ontology IDs case-insensitively without dropping the current selection in %s', (filePath) => {
    const root = parseMarkup(renderAnatomy(filePath, {
      ...HEART_CLINICAL_STATE,
      _clinicalConceptSearch: 'fma:7264',
    }));
    const controls = [...root.querySelectorAll('[data-anatomy-clinical-concept-scroll="true"] button[data-anatomy-clinical-concept]')];

    expect(controls).toHaveLength(2);
    expect(new Set(controls.map((control) => control.dataset.anatomyClinicalConcept))).toEqual(new Set([
      SELECTED_HEART_CONCEPT_ID,
      'FMA:7264',
    ]));
    expect(controls.find((control) => control.dataset.anatomyClinicalConcept === SELECTED_HEART_CONCEPT_ID)?.getAttribute('aria-pressed')).toBe('true');
  });

  it.each(ANATOMY_PATHS)('keeps the selected concept and announces an empty filtered result in %s', (filePath) => {
    const root = parseMarkup(renderAnatomy(filePath, {
      ...HEART_CLINICAL_STATE,
      _clinicalConceptSearch: 'no-such-concept',
    }));
    const controls = [...root.querySelectorAll('[data-anatomy-clinical-concept-scroll="true"] button[data-anatomy-clinical-concept]')];
    const empty = root.querySelector('[data-anatomy-clinical-concept-empty="true"]');

    expect(controls).toHaveLength(1);
    expect(controls[0].dataset.anatomyClinicalConcept).toBe(SELECTED_HEART_CONCEPT_ID);
    expect(controls[0].getAttribute('aria-pressed')).toBe('true');
    expect(empty).not.toBeNull();
    expect(empty.getAttribute('role')).toBe('status');
    expect(empty.textContent).toMatch(/No matching Clinical Atlas concepts/i);
  });

  it.each(ANATOMY_PATHS)('clears a stale concept query when switching atlas packs in %s', (filePath) => {
    const tool = loadTool(filePath, 'anatomy');
    const initialToolData = {
      anatomy: { ...HEART_CLINICAL_STATE, _clinicalConceptSearch: 'valve' },
    };
    let updatedToolData = initialToolData;
    const setToolData = vi.fn((updater) => {
      updatedToolData = typeof updater === 'function' ? updater(updatedToolData) : updater;
    });
    const tree = tool.render(makeCtx({ toolData: initialToolData, setToolData }));
    const packSelect = findElement(tree, (node) => node.type === 'select'
      && node.props
      && node.props['data-anatomy-clinical-pack-select'] === 'true');

    expect(packSelect).not.toBeNull();
    packSelect.props.onChange({ currentTarget: { value: 'hra-kidney-female-left-v1.3' } });
    expect(updatedToolData.anatomy._clinicalConceptSearch).toBe('');
  });
});

describe('Anatomy model-specific legends', () => {
  it.each(ANATOMY_PATHS)('shows only the Clinical visual key for a circulatory Clinical Atlas in %s', (filePath) => {
    const root = parseMarkup(renderAnatomy(filePath, HEART_CLINICAL_STATE));
    const visualKey = root.querySelector('[data-anatomy-clinical-visual-key="true"]');
    const canvas = root.querySelector('[data-anatomy-3d-canvas="true"]');
    const learningTools = root.querySelector('[data-anatomy-learning-tools="true"]');

    expect(visualKey).not.toBeNull();
    expect(visualKey.getAttribute('role')).toBe('list');
    expect(visualKey.getAttribute('aria-label')).toMatch(/Clinical Atlas visual key/i);
    expect(visualKey.querySelectorAll('[role="listitem"]').length).toBeGreaterThanOrEqual(2);
    expect(visualKey.id).toBeTruthy();
    expect(canvas.getAttribute('aria-describedby').split(/\s+/)).toContain(visualKey.id);
    expect(learningTools.contains(visualKey)).toBe(false);
    expect(root.querySelector('.anatomy-marker-legend')).toBeNull();
    expect(root.querySelector('[data-anatomy-circulatory-flow-legend="true"]')).toBeNull();
    expect(root.textContent).not.toContain('Pin status');
    expect(root.textContent).not.toContain('Oxygenated (arteries)');
  });

  it.each(ANATOMY_PATHS)('keeps teaching-pin and blood-flow legends in the non-Clinical circulatory atlas in %s', (filePath) => {
    const root = parseMarkup(renderAnatomy(filePath, {
      system: 'circulatory',
      selectedStructure: 'heart',
      _bodyView3d: false,
    }));

    expect(root.querySelector('[data-anatomy-clinical-visual-key="true"]')).toBeNull();
    expect(root.querySelector('.anatomy-marker-legend')).not.toBeNull();
    expect(root.querySelector('[data-anatomy-circulatory-flow-legend="true"]')).not.toBeNull();
  });
});

describe('Clinical Atlas stable list navigation', () => {
  function list(root) { return root.querySelector('[data-anatomy-clinical-concept-scroll]'); }
  function options(root) { return [...list(root).querySelectorAll('[data-anatomy-clinical-concept]')]; }
  function order(root) { return options(root).map((node) => node.dataset.anatomyClinicalConcept); }

  it.each(ANATOMY_PATHS)('keeps concept order stable when selection changes in %s', (filePath) => {
    const first = parseMarkup(renderAnatomy(filePath, HEART_CLINICAL_STATE));
    const second = parseMarkup(renderAnatomy(filePath, { ...HEART_CLINICAL_STATE, _clinicalAtlasConceptId: 'UBERON:0002137' }));
    expect(order(second)).toEqual(order(first));
    expect(options(second).filter((node) => node.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(options(second).find((node) => node.getAttribute('aria-pressed') === 'true').dataset.anatomyClinicalConcept).toBe('UBERON:0002137');
  });

  it.each(ANATOMY_PATHS)('has one Tab stop and connected keyboard instructions in %s', (filePath) => {
    const root = parseMarkup(renderAnatomy(filePath, HEART_CLINICAL_STATE));
    expect(list(root).getAttribute('tabindex')).toBe('-1');
    const stops = options(root).filter((node) => node.getAttribute('tabindex') === '0');
    expect(stops).toHaveLength(1);
    expect(stops[0].dataset.anatomyClinicalConcept).toBe(SELECTED_HEART_CONCEPT_ID);
    for (const id of list(root).getAttribute('aria-describedby').split(' ')) expect([...root.querySelectorAll('[id]')].some((node) => node.id === id)).toBe(true);
    expect(root.querySelector('[id^="anatomy-clinical-key-help-"]').textContent).toContain('Enter or Space selects');
  });

  it.each(ANATOMY_PATHS)('moves the Tab stop without selecting or changing the model in %s', (filePath) => {
    const tool = loadTool(filePath, 'anatomy');
    let data = { anatomy: { ...HEART_CLINICAL_STATE } };
    const tree = tool.render(makeCtx({ toolData: data, setToolData: (updater) => { data = typeof updater === 'function' ? updater(data) : updater; } }));
    const target = findElement(tree, (node) => node.props?.['data-anatomy-clinical-concept'] === 'UBERON:0002137');
    target.props.onFocus();
    expect(data.anatomy._clinicalAtlasConceptId).toBe(SELECTED_HEART_CONCEPT_ID);
    expect(data.anatomy._clinicalConceptFocusId).toBe('UBERON:0002137');
    const root = parseMarkup(renderTool('anatomy', data));
    expect(options(root).filter((node) => node.getAttribute('tabindex') === '0').map((node) => node.dataset.anatomyClinicalConcept)).toEqual(['UBERON:0002137']);
  });

  it.each(ANATOMY_PATHS)('ignores a focus target from a different pack and retains an unmatched selection in %s', (filePath) => {
    const root = parseMarkup(renderAnatomy(filePath, { ...HEART_CLINICAL_STATE, _clinicalConceptSearch: 'no-such-concept', _clinicalConceptFocusPackId: 'hra-kidney-female-left-v1.3', _clinicalConceptFocusId: 'UBERON:0001225' }));
    expect(options(root)).toHaveLength(1);
    expect(options(root)[0].getAttribute('tabindex')).toBe('0');
    expect(options(root)[0].dataset.anatomyClinicalConcept).toBe(SELECTED_HEART_CONCEPT_ID);
  });

  it.each(ANATOMY_PATHS)('returns to the whole organ without clearing the query or study context in %s', (filePath) => {
    const tool = loadTool(filePath, 'anatomy');
    let data = { anatomy: { ...HEART_CLINICAL_STATE, _clinicalConceptSearch: 'valve', _structureNotes: { heart: 'My note' } } };
    const tree = tool.render(makeCtx({ toolData: data, setToolData: (updater) => { data = typeof updater === 'function' ? updater(data) : updater; } }));
    const reset = findElement(tree, (node) => node.props?.['data-anatomy-clinical-whole-organ'] === 'true');
    expect(reset.props.disabled).toBe(false);
    reset.props.onClick();
    expect(data.anatomy).toMatchObject({ _clinicalAtlasConceptId: 'UBERON:0000948', _clinicalConceptSearch: 'valve', _structureNotes: { heart: 'My note' }, _body3dStyle: 'clinical' });
    const root = parseMarkup(renderTool('anatomy', data));
    expect(root.querySelector('[data-anatomy-clinical-whole-organ]').disabled).toBe(true);
    expect(options(root)[0].dataset.anatomyClinicalConcept).toBe('UBERON:0000948');
  });
});
