import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 60_000 });
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

function extractNamedFunction(source, functionName) {
  const signature = `function ${functionName}(`;
  const start = source.indexOf(signature);
  if (start < 0) return null;
  const openBrace = source.indexOf('{', start + signature.length);
  if (openBrace < 0) return null;

  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return null;
}

beforeEach(() => {
  resetStemLab();
});

describe('Anatomy cross-system search', () => {
  it.each(ANATOMY_PATHS)('uses an accessible combobox/listbox relationship in %s', (filePath) => {
    const root = parseMarkup(renderAnatomy(filePath, { search: 'heart' }));
    const combobox = root.querySelector('input[role="combobox"]');

    expect(combobox).not.toBeNull();
    expect(combobox.getAttribute('aria-autocomplete')).toBe('list');
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
    expect(combobox.getAttribute('aria-controls')).toBeTruthy();

    const listbox = root.querySelector(`#${combobox.getAttribute('aria-controls')}[role="listbox"]`);
    expect(listbox).not.toBeNull();
    expect(listbox.querySelectorAll('[role="option"]').length).toBeGreaterThan(0);
    listbox.querySelectorAll('[role="option"]').forEach((option) => {
      expect(option.id).toBeTruthy();
    });

    const activeDescendant = combobox.getAttribute('aria-activedescendant');
    if (activeDescendant) expect(listbox.querySelector(`#${activeDescendant}`)).not.toBeNull();
  });

  it.each(ANATOMY_PATHS)('finds structures outside the active system and resolves common aliases in %s', (filePath) => {
    const heartRoot = parseMarkup(renderAnatomy(filePath, { system: 'skeletal', search: 'heart' }));
    const aliasRoot = parseMarkup(renderAnatomy(filePath, { system: 'organs', search: 'collarbone' }));

    const heartResults = heartRoot.querySelector('[role="listbox"]')?.textContent || '';
    const aliasResults = aliasRoot.querySelector('[role="listbox"]')?.textContent || '';
    expect(heartResults).toMatch(/Heart/i);
    expect(heartResults).toMatch(/Circulatory/i);
    expect(aliasResults).toMatch(/Clavicle/i);
    expect(aliasResults).toMatch(/Skeletal/i);
  });

  it.each(ANATOMY_PATHS)('resolves an ontology identifier and switches context when a result is selected in %s', (filePath) => {
    const ontologyRoot = parseMarkup(renderAnatomy(filePath, {
      system: 'skeletal',
      search: 'UBERON:0004538',
    }));
    const ontologyResults = ontologyRoot.querySelector('[role="listbox"]')?.textContent || '';
    expect(ontologyResults).toMatch(/Kidneys?/i);

    resetStemLab();
    const tool = loadTool(filePath, 'anatomy');
    const initialToolData = { anatomy: { ...BASE_STATE, search: 'heart' } };
    let updatedToolData = initialToolData;
    const setToolData = vi.fn((updater) => {
      updatedToolData = typeof updater === 'function' ? updater(updatedToolData) : updater;
    });
    const tree = tool.render(makeCtx({
      toolData: initialToolData,
      setToolData,
    }));
    const heartOption = findElement(tree, (node) => node.props
      && node.props.role === 'option'
      && /Heart/i.test(textOf(node)));

    expect(heartOption).not.toBeNull();
    expect(typeof heartOption.props.onClick).toBe('function');
    heartOption.props.onClick();
    expect(setToolData).toHaveBeenCalled();
    expect(updatedToolData.anatomy).toMatchObject({
      system: 'circulatory',
      selectedStructure: 'heart',
      search: '',
    });
  });

  it.each(ANATOMY_PATHS)('supports keyboard navigation from the combobox in %s', (filePath) => {
    const tool = loadTool(filePath, 'anatomy');
    const tree = tool.render(makeCtx({
      toolData: { anatomy: { ...BASE_STATE, search: 'heart' } },
    }));
    const combobox = findElement(tree, (node) => node.type === 'input'
      && node.props
      && node.props.role === 'combobox');

    expect(combobox).not.toBeNull();
    expect(typeof combobox.props.onKeyDown).toBe('function');
    expect(combobox.props['aria-controls']).toBeTruthy();
    expect(combobox.props['aria-autocomplete']).toBe('list');
  });
});

describe('Anatomy demand-driven 3D rendering', () => {
  it.each(ANATOMY_PATHS)('pauses while hidden or offscreen and releases its observer in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toMatch(/new\s+IntersectionObserver\s*\(/);
    expect(source).toMatch(/\.observe\s*\(\s*canvas\s*\)/);
    expect(source).toMatch(/\.isIntersecting|intersectionRatio/);
    expect(source).toContain("document.addEventListener('visibilitychange'");
    expect(source).toContain("document.removeEventListener('visibilitychange'");
    expect(source).toMatch(/cancelAnimationFrame\s*\(\s*raf\s*\)/);
    expect(source).toMatch(/\.disconnect\s*\(\s*\)/);
  });

  it.each(ANATOMY_PATHS)('does not recursively schedule an idle animation frame in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const animateBody = extractNamedFunction(source, 'animate3d');

    expect(animateBody).not.toBeNull();
    expect(animateBody).not.toMatch(/requestAnimationFrame\s*\(\s*animate3d\s*\)/);
    expect(source).toMatch(/controls\.addEventListener\s*\(\s*['"]change['"]/);
    expect(source).toMatch(/_anatomy3d(?:RequestRender|Invalidate|Render)\s*=/);
  });
});

describe('Anatomy explicit mobile 3D controls', () => {
  it.each(ANATOMY_PATHS)('renders named rotate, tilt, zoom, and reset actions in %s', (filePath) => {
    const root = parseMarkup(renderAnatomy(filePath, {
      _bodyView3d: true,
      _body3dStyle: 'realistic',
    }));
    const controls = root.querySelector('[role="group"][aria-label*="3D"]');
    expect(controls).not.toBeNull();

    const labels = Array.from(controls.querySelectorAll('button')).map((button) => (
      button.getAttribute('aria-label') || button.textContent || ''
    ));
    ['rotate left', 'rotate right', 'tilt up', 'tilt down', 'zoom in', 'zoom out', 'reset'].forEach((action) => {
      expect(labels.some((label) => label.toLowerCase().includes(action))).toBe(true);
    });
  });

  it.each(ANATOMY_PATHS)('routes explicit controls through the same keyboard-tested canvas API in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toMatch(/_anatomy3dKeyControl\s*\(\s*['"]ArrowLeft['"]\s*\)/);
    expect(source).toMatch(/_anatomy3dKeyControl\s*\(\s*['"]ArrowRight['"]\s*\)/);
    expect(source).toMatch(/_anatomy3dKeyControl\s*\(\s*['"]ArrowUp['"]\s*\)/);
    expect(source).toMatch(/_anatomy3dKeyControl\s*\(\s*['"]ArrowDown['"]\s*\)/);
    expect(source).toMatch(/_anatomy3dKeyControl\s*\(\s*['"]\+['"]\s*\)/);
    expect(source).toMatch(/_anatomy3dKeyControl\s*\(\s*['"]-['"]\s*\)/);
    expect(source).toMatch(/\.anatomy-3d-(?:mobile-)?controls[^}]*min-height:\s*44px/);
    expect(source).toContain('touch-action:none');
  });

  it.each(ANATOMY_PATHS)('uses buttons while preserving page scroll on coarse-only pointers in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toMatch(/@media[^\n]*\(hover\s*:\s*none\)\s+and\s+\(pointer\s*:\s*coarse\)[^\n]*\.anatomy-3d-mobile-controls[^\n]*display:\s*grid/);
    expect(source).toMatch(/@media[^\n]*\(hover\s*:\s*none\)\s+and\s+\(pointer\s*:\s*coarse\)[^\n]*\.anatomy-3d-canvas\s*\{\s*touch-action:\s*pan-y/);
    expect(source).toContain("window.matchMedia('(hover: none) and (pointer: coarse)').matches");
    expect(source).toContain('controls.enabled = !coarsePointerOnly;');
    expect(source).toContain("canvas.setAttribute('data-anatomy-3d-input', coarsePointerOnly ? 'buttons' : 'orbit')");
  });
});
