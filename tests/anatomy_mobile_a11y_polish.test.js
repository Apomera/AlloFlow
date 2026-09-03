import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
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

const SYSTEM_IDS = [
  'skeletal',
  'muscular',
  'circulatory',
  'nervous',
  'organs',
  'respiratory',
  'endocrine',
  'lymphatic',
  'integumentary',
  'reproductive',
];

const BASE_STATE = {
  _activeTab: 'explore',
  system: 'skeletal',
  view: 'anterior',
  complexity: 3,
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

function addElement(parent, tagName, className) {
  const element = document.createElement(tagName);
  element.className = className;
  parent.appendChild(element);
  return element;
}

function clinicalTypography(readingMode) {
  const shell = addElement(document.body, 'div', 'anatomy-tool-shell');
  shell.setAttribute('data-reading-mode', readingMode ? 'true' : 'false');

  const nodes = {
    modelSource: addElement(shell, 'span', 'anatomy-model-source-note'),
    provenance: addElement(shell, 'dl', 'anatomy-atlas-provenance'),
    scope: addElement(shell, 'p', 'anatomy-atlas-scope-note'),
  };

  const packSwitcher = addElement(shell, 'div', 'anatomy-clinical-pack-switcher');
  nodes.packLabel = addElement(packSwitcher, 'label', '');
  nodes.packMeta = addElement(packSwitcher, 'span', '');

  const structuresHead = addElement(shell, 'div', 'anatomy-clinical-structures-head');
  addElement(structuresHead, 'strong', '');
  nodes.structureMeta = addElement(structuresHead, 'span', '');

  const concept = addElement(shell, 'button', 'anatomy-clinical-concept');
  nodes.conceptTitle = addElement(concept, 'strong', '');
  nodes.conceptId = addElement(concept, 'span', '');
  nodes.selection = addElement(shell, 'div', 'anatomy-clinical-selection');

  const locator = addElement(shell, 'div', 'anatomy-clinical-locator');
  nodes.locatorCopy = addElement(locator, 'p', '');

  const ftuHead = addElement(shell, 'div', 'anatomy-clinical-ftu-head');
  nodes.ftuHeadCopy = addElement(ftuHead, 'p', '');
  const figure = addElement(shell, 'figure', 'anatomy-clinical-ftu');
  nodes.ftuCaption = addElement(figure, 'figcaption', '');
  const ftuCell = addElement(shell, 'button', 'anatomy-clinical-ftu-cell');
  nodes.ftuCellTitle = addElement(ftuCell, 'strong', '');
  nodes.ftuCellId = addElement(ftuCell, 'span', '');
  nodes.ftuSelection = addElement(shell, 'div', 'anatomy-clinical-ftu-selection');
  nodes.ftuNote = addElement(shell, 'p', 'anatomy-clinical-ftu-note');

  const sizes = Object.fromEntries(Object.entries(nodes).map(([key, node]) => [
    key,
    Number.parseFloat(window.getComputedStyle(node).fontSize),
  ]));
  shell.remove();
  return sizes;
}

beforeEach(() => {
  resetStemLab();
});

describe('Anatomy mobile topbar', () => {
  it.each(ANATOMY_PATHS)('keeps stable hooks for Back, title, Comfort, and Snapshot in %s', (filePath) => {
    const root = parseMarkup(renderAnatomy(filePath));
    const topbar = root.querySelector('.anatomy-topbar');
    const back = topbar?.querySelector('button.anatomy-topbar-back');
    const title = topbar?.querySelector('.anatomy-topbar-title');
    const actions = [...(topbar?.querySelectorAll('button.anatomy-topbar-action') || [])];
    const snapshot = topbar?.querySelector('button.anatomy-topbar-snapshot');

    expect(topbar).not.toBeNull();
    expect(back?.getAttribute('aria-label')).toMatch(/Back to tools/i);
    expect(title?.querySelector('h3')?.textContent).toMatch(/Human Anatomy Explorer/i);
    expect(title?.querySelector('p')?.textContent.trim().length).toBeGreaterThan(0);
    // Comfort text, Study sheet, Snapshot — the study sheet toggle joined the topbar 2026-09-02.
    expect(actions).toHaveLength(3);
    expect(actions[0].getAttribute('aria-label')).toMatch(/comfortable reading mode/i);
    expect(actions[1].getAttribute('aria-controls')).toBe('anatomy-study-sheet');
    expect(snapshot).toBe(actions[2]);
    expect(snapshot?.getAttribute('aria-label')).toMatch(/Snapshot/i);
  });

  it.each(ANATOMY_PATHS)('uses a two-row 44px mobile layout at 560px and below in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toMatch(/@media \(max-width:560px\)\{\.anatomy-topbar\{[^}]*display:grid!important;[^}]*grid-template-columns:44px minmax\(0,1fr\) 1fr 1fr/);
    expect(source).toMatch(/\.anatomy-topbar-back\{[^}]*grid-row:1;[^}]*min-width:44px;min-height:44px/);
    expect(source).toMatch(/\.anatomy-topbar-title\{[^}]*grid-column:2\/-1;grid-row:1/);
    expect(source).toMatch(/\.anatomy-topbar-action\{[^}]*min-height:44px/);
    // Three actions share row 2 since 2026-09-02. nth-of-type counts buttons and Back is the
    // first, so the actions are buttons 2-4; before this the Study sheet button was unplaced
    // and auto-flowed into the 44px Back column on a third row with its label wrapped.
    expect(source).toMatch(/\.anatomy-topbar-action:nth-of-type\(2\)\{[^}]*grid-column:1\/3;grid-row:2/);
    expect(source).toMatch(/\.anatomy-topbar-action:nth-of-type\(3\)\{[^}]*grid-column:3\/4;grid-row:2/);
    expect(source).toMatch(/\.anatomy-topbar-snapshot\{[^}]*grid-column:4\/5;grid-row:2/);
  });
});

describe('Anatomy mode banner', () => {
  it.each(ANATOMY_PATHS)('carries the Go deeper actions instead of a separate band in %s', (filePath) => {
    // 2026-09-02: the standalone .anatomy-deeper-row strip was folded into the mode banner.
    // Measured at 1280x1000, the workspace moved from 601px down the page to 539px.
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).not.toContain("className: 'anatomy-deeper-row mb-3'");
    expect(source).toContain('.anatomy-mode-actions{display:flex;');

    const root = parseMarkup(renderAnatomy(filePath));
    const banner = root.querySelector('.anatomy-mode-card');
    const actions = banner?.querySelector('[data-anatomy-deeper-row="true"]');
    expect(actions).not.toBeNull();
    expect(actions.getAttribute('aria-label')).toBe('Go deeper');
    const labels = [...actions.querySelectorAll('button')].map((b) => b.textContent.trim());
    expect(labels).toHaveLength(3);
    expect(labels[0]).toMatch(/Anatomy Lens/);
    expect(labels[2]).toMatch(/Mastery map/);

    // The Imaging workspace takes the full width, so the banner there carries no actions.
    const imaging = parseMarkup(renderAnatomy(filePath, { _activeTab: 'imaging' }));
    expect(imaging.querySelector('.anatomy-mode-card')).not.toBeNull();
    expect(imaging.querySelector('[data-anatomy-deeper-row="true"]')).toBeNull();
  }, 60_000);
});

describe('Anatomy active-system contrast', () => {
  it.each(ANATOMY_PATHS)('derives every active foreground from its accent and lets the count inherit in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('color: anaReadableOn(s.accent)');
    expect(source).toContain('.anatomy-system-button[aria-pressed="true"] .anatomy-system-count{color:inherit;text-shadow:none;}');
    expect(source).not.toContain("systemIsActive ? 'text-white shadow-sm'");

    const tool = loadTool(filePath, 'anatomy');
    SYSTEM_IDS.forEach((systemId) => {
      const tree = tool.render(makeCtx({
        toolData: { anatomy: { ...BASE_STATE, system: systemId } },
      }));
      const activeSystem = findElement(tree, (node) => node.type === 'button'
        && node.props
        && typeof node.props.className === 'string'
        && node.props.className.includes('anatomy-system-button')
        && node.props['aria-pressed'] === true);

      expect(activeSystem).not.toBeNull();
      expect(['#ffffff', '#020617']).toContain(activeSystem.props.style.color);
      expect(activeSystem.props.className).not.toContain('text-white');
    });
  }, 60_000);
});

describe('Anatomy retrieval announcements', () => {
  // Every mode that grades an answer must speak the result through the host announcer.
  // A role=status block alone is not enough: it is inserted into the DOM together with its
  // text, which screen readers routinely miss. The quiz was silent until 2026-09-02.
  const HANDLERS = ['answerQuizOption', 'answerSpotterOption', 'answerConnectionCheck', 'answerSpot'];

  it.each(ANATOMY_PATHS)('announces the result from every answer handler in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    for (const handler of HANDLERS) {
      const start = source.indexOf('function ' + handler + '(');
      expect(start, handler).toBeGreaterThan(-1);
      const body = source.slice(start, start + 1600);
      expect(body, handler).toContain('announceToSR(');
    }
    expect(source).toContain("t('stem.anatomy.quiz_sr_wrong', 'Not quite. The answer was ')");
  });
});

describe('Anatomy compare-surface contrast', () => {
  it.each(ANATOMY_PATHS)('keeps the kicker and clinical warning above 4.5:1 on the violet tray in %s', (filePath) => {
    // axe, 2026-09-02, with animations frozen: on the compare tray ground #f5f3ff the kicker
    // (#64748b) measured 4.33:1 and the 11px italic clinical warning (#e11d48) measured 4.28:1.
    // Freeze animations before auditing: the shell's "enter" animation makes axe report blended
    // greys for elements that are fine once settled.
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('.anatomy-kicker{font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#475569;}');
    expect(source).not.toContain("'text-[11px] text-rose-600 italic leading-relaxed'");
    expect(source).toContain("'text-[11px] text-rose-700 italic leading-relaxed'");

    const root = parseMarkup(renderAnatomy(filePath, { selectedStructure: 'femur', _compareStructure: 'tibia' }));
    const tray = root.querySelector('[data-anatomy-compare-tray="true"]');
    expect(tray).not.toBeNull();
    expect(root.querySelector('.anatomy-structure-detail p.text-rose-700')).not.toBeNull();
    expect(root.querySelector('.anatomy-structure-detail p.text-rose-600')).toBeNull();
  }, 60_000);
});

describe('Anatomy Clinical metadata typography', () => {
  it.each(ANATOMY_PATHS)('maintains readable type floors and enlarges metadata in Comfort mode in %s', (filePath) => {
    document.getElementById('allo-anatomy-refinement-css')?.remove();
    loadTool(filePath, 'anatomy');

    const standard = clinicalTypography(false);
    const comfort = clinicalTypography(true);
    const tenPixelMetadata = [
      'modelSource', 'provenance', 'scope', 'packLabel', 'packMeta',
      'structureMeta', 'selection', 'locatorCopy', 'ftuHeadCopy',
      'ftuCaption', 'ftuSelection', 'ftuNote',
    ];
    const elevenPixelLabels = ['conceptTitle', 'ftuCellTitle'];
    const ninePixelIds = ['conceptId', 'ftuCellId'];

    tenPixelMetadata.forEach((key) => expect(standard[key], key).toBeGreaterThanOrEqual(10));
    elevenPixelLabels.forEach((key) => expect(standard[key], key).toBeGreaterThanOrEqual(11));
    ninePixelIds.forEach((key) => expect(standard[key], key).toBeGreaterThanOrEqual(9));
    Object.keys(standard).forEach((key) => {
      expect(comfort[key], key).toBeGreaterThan(standard[key]);
    });

    const comfortRoot = parseMarkup(renderTool('anatomy', {
      anatomy: {
        _activeTab: 'explore',
        system: 'circulatory',
        view: 'anterior',
        complexity: 3,
        selectedStructure: 'heart',
        _bodyView3d: true,
        _body3dStyle: 'clinical',
        _clinicalAtlasPackId: 'hra-heart-female-v1.3',
        _readingMode: true,
      },
    }));
    expect(comfortRoot.querySelector('[data-reading-mode="true"]')).not.toBeNull();
    expect(comfortRoot.querySelector('details[data-anatomy-canvas-help="true"]')?.hasAttribute('open')).toBe(true);
    expect(comfortRoot.querySelector('details[data-anatomy-learning-tools="true"]')?.hasAttribute('open')).toBe(true);
  }, 60_000);
});
