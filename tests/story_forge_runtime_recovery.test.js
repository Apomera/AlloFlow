import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const SAVE_KEY = 'alloflow_storyforge_draft_recovery-tester';

let React;
let ReactDOMClient;
let act;
let transformSync;
let transformReactJsx;
let StoryForge;
let helpers;
let root;
let host;
let addToast;
let vaultRecords;

const t = (key) => ({
  'ui_common.continue_where_left': 'Continue where you left off?',
  'ui_common.start_fresh': 'Start fresh',
  'ui_common.restore_draft': 'Restore draft',
  'ui_common.keep_working': 'Keep working',
  'ui_common.save_draft_close': 'Save draft and close',
  'ui_common.close_anyway': 'Close anyway',
}[key] || key);

const waitForWork = async (turns = 6) => {
  for (let index = 0; index < turns; index += 1) {
    await new Promise((resolveTick) => setTimeout(resolveTick, 0));
  }
};

const waitForSelector = async (selector, turns = 50) => {
  for (let index = 0; index < turns; index += 1) {
    const node = host?.querySelector(selector);
    if (node) return node;
    await act(async () => {
      await new Promise((resolveTick) => setTimeout(resolveTick, 0));
    });
  }
  return host?.querySelector(selector) || null;
};

function installVault(records = []) {
  vaultRecords = new Map(records.map((record) => [record.key, record]));
  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => {},
    close: () => {},
    transaction: () => {
      let transaction;
      const store = {
        get: (key) => {
          const request = {};
          setTimeout(() => {
            request.result = vaultRecords.get(key);
            request.onsuccess?.({ target: request });
          }, 0);
          return request;
        },
        put: (record) => {
          vaultRecords.set(record.key, record);
          setTimeout(() => transaction.oncomplete?.(), 0);
          return {};
        },
        delete: (key) => {
          vaultRecords.delete(key);
          const request = {};
          setTimeout(() => request.onsuccess?.({ target: request }), 0);
          return request;
        },
      };
      transaction = {
        objectStore: () => store,
        oncomplete: null,
        onerror: null,
        onabort: null,
      };
      return transaction;
    },
  };
  const factory = {
    open: () => {
      const request = {};
      setTimeout(() => {
        request.result = db;
        request.onsuccess?.({ target: request });
      }, 0);
      return request;
    },
  };
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, writable: true, value: factory });
  Object.defineProperty(window, 'indexedDB', { configurable: true, writable: true, value: factory });
}

class FixtureFileReader {
  readAsText(file) {
    queueMicrotask(() => {
      this.result = file.__text;
      this.onload?.({ target: { result: this.result } });
    });
  }
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  act = React.act || require(resolve(modulesDir, 'react-dom/test-utils')).act;
  ({ transformSync } = require(resolve(modulesDir, '@babel/core')));
  transformReactJsx = require(resolve(modulesDir, '@babel/plugin-transform-react-jsx'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;

  const source = readFileSync(resolve(process.cwd(), 'story_forge_source.jsx'), 'utf8');
  const seam = `\nwindow.__storyForgeRuntimeTest = { StoryForge, getStoryForgeReviewSignature, sanitizeStoryForgeProject };`;
  const compiled = transformSync(source + seam, {
    babelrc: false,
    configFile: false,
    plugins: [[transformReactJsx, {
      runtime: 'classic',
      pragma: 'React.createElement',
      pragmaFrag: 'React.Fragment',
    }]],
  }).code;
  const iconNames = [
    'ArrowLeft', 'ArrowRight', 'BookOpen', 'CheckCircle2', 'Download', 'Edit', 'Eye',
    'HelpCircle', 'Image', 'ImageIcon', 'Maximize2', 'Mic', 'Move', 'Palette', 'Play',
    'Plus', 'Redo2', 'RefreshCw', 'Save', 'Sparkles', 'Star', 'Target', 'Trash2', 'Type',
    'Undo2', 'Volume2', 'X',
  ];
  const preamble = `
    var React = window.React;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useRef = React.useRef;
    var useCallback = React.useCallback;
    var useMemo = React.useMemo;
    var useReducer = React.useReducer;
    ${iconNames.map((name) => `var ${name} = function ${name}(){ return null; };`).join('\n')}
  `;
  new Function(preamble + compiled)();
  ({ StoryForge, ...helpers } = window.__storyForgeRuntimeTest);

  window.matchMedia = () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  });
  HTMLElement.prototype.scrollIntoView = () => {};
}, 90_000);

beforeEach(() => {
  localStorage.clear();
  addToast = vi.fn();
  installVault();
  Object.defineProperty(globalThis, 'FileReader', { configurable: true, writable: true, value: FixtureFileReader });
  Object.defineProperty(window, 'FileReader', { configurable: true, writable: true, value: FixtureFileReader });
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  host?.remove();
  host = null;
  vi.restoreAllMocks();
  localStorage.clear();
  window.__alloFocusTrapStack = [];
});

function makeProject(overrides = {}) {
  return helpers.sanitizeStoryForgeProject({
    storyTitle: 'Recovered story',
    storyPrompt: 'Tell what happened next.',
    genre: 'free',
    artifactType: 'story',
    writingView: 'standard',
    layoutMode: 'prose',
    phase: 'export',
    paragraphs: [{ id: 'p-0', text: 'A learner wrote a complete opening scene.', scaffoldFrame: '', plotBeat: '' }],
    reviewedDraftSignature: '',
    savedAt: '2026-08-13T12:00:00.000Z',
    ...overrides,
  });
}

function makeReviewedProject(overrides = {}) {
  const project = makeProject(overrides);
  project.reviewedDraftSignature = helpers.getStoryForgeReviewSignature(project);
  return project;
}

function makeHandoff(title = 'Shared classmate draft') {
  return {
    ...makeProject({ storyTitle: title, phase: 'export' }),
    _storyForgeVersion: 3,
    purpose: 'handoff',
    exportedBy: 'Partner Writer',
    exportedAt: '2026-08-13T13:00:00.000Z',
    reviewedDraftSignature: '',
  };
}

async function mountStoryForge(extraProps = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(StoryForge, {
      isOpen: true,
      onClose: vi.fn(),
      addToast,
      t,
      codename: 'Recovery Tester',
      sourceTopic: '',
      glossaryTerms: [],
      lessonResources: [],
      ...extraProps,
    }));
    await waitForWork();
  });
}

async function click(node) {
  expect(node).toBeTruthy();
  await act(async () => {
    node.click();
    await waitForWork();
  });
}

function expectCurrentPhase(phase) {
  const step = host.querySelector(`[data-sf-phase-step="${phase}"]`);
  expect(step).toBeTruthy();
  expect(step.getAttribute('aria-current')).toBe('step');
}

async function restoreSavedDraft() {
  let restore = host.querySelector('[data-sf-restore-draft]');
  if (!restore) {
    await click(host.querySelector('[data-sf-draft-save]'));
    restore = host.querySelector('[data-sf-restore-draft]');
  }
  expect(restore).toBeTruthy();
  await click(restore);
  expect(host.querySelector('[data-sf-restore-draft]')).toBeNull();
}

async function chooseImportFile(trigger, payload) {
  const originalCreateElement = document.createElement.bind(document);
  let picker = null;
  const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
    const node = originalCreateElement(tagName, options);
    if (String(tagName).toLowerCase() === 'input') {
      Object.defineProperty(node, 'click', {
        configurable: true,
        value: () => { if (node.type === 'file') picker = node; },
      });
    }
    return node;
  });
  try {
    await click(trigger);
    expect(picker).toBeTruthy();
    const text = JSON.stringify(payload);
    await act(async () => {
      picker.onchange({ target: { files: [{ name: 'draft.storyforge', size: text.length, __text: text }] } });
      await waitForWork();
    });
  } finally {
    createElementSpy.mockRestore();
  }
}

describe('StoryForge mounted recovery and import flow', () => {
  it('restores a saved project at the earliest unmet phase', async () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(makeProject({ phase: 'export' })));
    await mountStoryForge();
    await restoreSavedDraft();
    expectCurrentPhase('review');
    expect(host.querySelector('[data-sf-phase-step="export"]').getAttribute('aria-current')).toBeNull();
    expect(addToast).not.toHaveBeenCalledWith(expect.any(String), 'error');
  }, 20_000);

  it('does not let a checkpoint raw phase bypass review gating', async () => {
    const current = makeReviewedProject({ storyTitle: 'Current reviewed project', phase: 'export' });
    const checkpoint = makeProject({ storyTitle: 'Older unreviewed checkpoint', phase: 'export' });
    installVault([{
      key: SAVE_KEY,
      snapshot: current,
      revisions: [{ id: 'before-design', label: 'Before design', savedAt: '2026-08-13T11:00:00.000Z', snapshot: checkpoint }],
    }]);
    await mountStoryForge();
    await restoreSavedDraft();
    expectCurrentPhase('export');
    await click(host.querySelector('[data-sf-restore-checkpoint="before-design"]'));
    expectCurrentPhase('review');
    expect(host.querySelector('[data-sf-phase-step="export"]').getAttribute('aria-current')).toBeNull();
  }, 20_000);

  it('imports a handoff into a blank workspace without an uninitialized decision', async () => {
    await mountStoryForge();
    await chooseImportFile(host.querySelector('[data-sf-import-draft]'), makeHandoff());
    expectCurrentPhase('write');
    expect(host.querySelector('[data-sf-import-confirm-action="replace"]')).toBeNull();
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Draft loaded from Partner Writer'), 'success');
    expect(addToast).not.toHaveBeenCalledWith(expect.any(String), 'error');
  }, 20_000);

  it('resumes a confirmed import and routes a handoff back to Draft', async () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(makeReviewedProject({ phase: 'export' })));
    await mountStoryForge();
    await restoreSavedDraft();
    expectCurrentPhase('export');
    await chooseImportFile(host.querySelector('[data-sf-import-draft]'), makeHandoff('Confirmed handoff'));
    const replace = host.querySelector('[data-sf-import-confirm-action="replace"]');
    expect(replace).toBeTruthy();
    await click(replace);
    expect(host.querySelector('[data-sf-import-confirm-action="replace"]')).toBeNull();
    expectCurrentPhase('write');
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Draft loaded from Partner Writer'), 'success');
  }, 20_000);

  it('identifies the saved artifact and its safe resume phase before restoring', async () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(makeProject({
      storyTitle: 'The Clockwork Garden',
      phase: 'export',
      savedAt: '2026-08-13T12:00:00.000Z',
    })));
    await mountStoryForge();

    const dialog = await waitForSelector('[data-sf-restore-dialog]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('data-sf-recovery-title')).toBe('The Clockwork Garden');
    expect(dialog.getAttribute('data-sf-recovery-artifact')).toBe('story');
    expect(dialog.getAttribute('data-sf-recovery-resume-phase')).toBe('review');
    expect(host.querySelector('[data-sf-recovery-project-title]').textContent).toContain('The Clockwork Garden');
    expect(host.querySelector('[data-sf-recovery-artifact-label]').textContent).toBe('Story');
    expect(host.querySelector('[data-sf-recovery-phase-label]').textContent).toBe('Review');
    expect(host.querySelector('[data-sf-recovery-saved-at]').getAttribute('datetime')).toBe('2026-08-13T12:00:00.000Z');
    expect(host.querySelector('[data-sf-restore-draft]').textContent).toContain('Review');
  }, 20_000);

  it('keeps recovery actionable after Escape and confirms before deleting saved work', async () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(makeProject({ storyTitle: 'Keep This Story' })));
    await mountStoryForge();

    expect(await waitForSelector('[data-sf-restore-dialog]')).toBeTruthy();

    await act(async () => {
      window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await waitForWork();
    });

    const banner = host.querySelector('[data-sf-recovery-banner]');
    expect(banner).toBeTruthy();
    expect(banner.getAttribute('data-sf-recovery-title')).toBe('Keep This Story');
    expect(host.querySelector('[data-sf-banner-restore-draft]')).toBeTruthy();
    expect(host.querySelector('[data-sf-open-recovery-options]')).toBeTruthy();
    expect(localStorage.getItem(SAVE_KEY)).not.toBeNull();

    await click(host.querySelector('[data-sf-open-recovery-options]'));
    await click(host.querySelector('[data-sf-request-discard-draft]'));
    expect(host.querySelector('[data-sf-discard-draft-confirmation]')).toBeTruthy();
    expect(localStorage.getItem(SAVE_KEY)).not.toBeNull();

    await click(host.querySelector('[data-sf-cancel-discard-draft]'));
    expect(host.querySelector('[data-sf-discard-draft-confirmation]')).toBeNull();
    expect(host.querySelector('[data-sf-restore-dialog]')).toBeTruthy();
    expect(localStorage.getItem(SAVE_KEY)).not.toBeNull();

    await click(host.querySelector('[data-sf-request-discard-draft]'));
    await click(host.querySelector('[data-sf-confirm-discard-draft]'));
    expect(host.querySelector('[data-sf-discard-draft-confirmation]')).toBeNull();
    expect(host.querySelector('[data-sf-recovery-banner]')).toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  }, 20_000);
});
