import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const moduleDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let originalAlloModules;
let originalAlloFlowUX;
let originalStemLab;
let originalGlobalStemLab;
let originalSwimState;
let hadSwimState;
let root;
let host;

beforeAll(() => {
  React = require(resolve(moduleDir, 'react'));
  ReactDOMClient = require(resolve(moduleDir, 'react-dom/client'));
  ({ act } = require(resolve(moduleDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  originalAlloModules = window.AlloModules;
  originalAlloFlowUX = window.AlloFlowUX;
  originalStemLab = window.StemLab;
  originalGlobalStemLab = globalThis.StemLab;
  hadSwimState = Object.prototype.hasOwnProperty.call(window, '__alloflowSwimLab');
  originalSwimState = window.__alloflowSwimLab;
  delete window.__alloflowSwimLab;
  localStorage.removeItem('swimLab.state.v1');
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  host?.remove();
  host = null;
  window.AlloModules = originalAlloModules;
  window.AlloFlowUX = originalAlloFlowUX;
  window.StemLab = originalStemLab;
  globalThis.StemLab = originalGlobalStemLab;
  if (hadSwimState) window.__alloflowSwimLab = originalSwimState;
  else delete window.__alloflowSwimLab;
  localStorage.removeItem('swimLab.state.v1');
  vi.restoreAllMocks();
});

function loadSwimLab() {
  const registry = {
    _registry: {},
    _order: [],
    registerTool(id, config) {
      config.id = id;
      this._registry[id] = config;
      this._order.push(id);
    },
    isRegistered(id) {
      return Boolean(this._registry[id]);
    },
  };
  window.StemLab = registry;
  globalThis.StemLab = registry;
  const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_swimlab.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(source)();
  return registry._registry.swimLab;
}

function mountSwimLab({ confirm, dialogAvailable = true } = {}) {
  const config = loadSwimLab();
  const addToast = vi.fn();
  const api = {};
  const initialEntry = {
    q: 'What should I do in a rip current?',
    text: 'Float, signal, and swim parallel when able.',
    ts: 1234,
  };
  const Icons = new Proxy({}, {
    get: () => () => React.createElement('span', { 'aria-hidden': 'true' }),
  });

  window.AlloModules = dialogAvailable
    ? { ConfirmDialog: { ConfirmDialog: function ConfirmDialog() {} } }
    : {};
  window.AlloFlowUX = { confirm: confirm || vi.fn(async () => false) };

  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);

  function Harness() {
    const [toolData, setToolData] = React.useState({
      swimLab: { view: 'askLifeguard', askHistory: [initialEntry] },
    });
    api.getData = () => toolData;
    const update = (toolId, key, value) => {
      setToolData((previous) => ({
        ...previous,
        [toolId]: { ...(previous[toolId] || {}), [key]: value },
      }));
    };
    const updateMulti = (toolId, values) => {
      setToolData((previous) => ({
        ...previous,
        [toolId]: { ...(previous[toolId] || {}), ...values },
      }));
    };
    return config.render({
      React,
      toolData,
      update,
      updateMulti,
      setStemLabTool: () => {},
      setStemLabTab: () => {},
      setToolSnapshots: () => {},
      addToast,
      announceToSR: () => {},
      awardXP: () => {},
      beep: () => {},
      celebrate: () => {},
      canvasNarrate: () => {},
      canvasA11yDesc: () => {},
      callGemini: null,
      callTTS: null,
      callImagen: null,
      callGeminiVision: null,
      callGeminiImageEdit: null,
      gradeLevel: '5th Grade',
      stemLabTab: 'explore',
      stemLabTool: 'swimLab',
      toolSnapshots: [],
      props: {},
      srOnly: {},
      a11yClick: (handler) => ({ onClick: handler, role: 'button', tabIndex: 0 }),
      icons: Icons,
      t: (_key, fallback) => fallback,
      tryAward: () => {},
      getXP: () => 0,
    });
  }

  act(() => root.render(React.createElement(Harness)));
  api.addToast = addToast;
  api.confirm = window.AlloFlowUX.confirm;
  api.clearButton = () => host.querySelector('button[aria-label="Clear all saved AI answers"]');
  return api;
}

async function clickAsync(element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('SwimLab destructive confirmation accessibility', () => {
  it('keeps both deploy mirrors identical and removes the native confirm path', () => {
    const source = readFileSync('stem_lab/stem_tool_swimlab.js', 'utf8');
    const mirror = readFileSync('desktop/web-app/public/stem_lab/stem_tool_swimlab.js', 'utf8');

    expect(mirror).toBe(source);
    expect(source).not.toContain('window.confirm(');
    expect(source).toContain('window.AlloModules.ConfirmDialog.ConfirmDialog');
    expect(source).toContain('window.AlloFlowUX && window.AlloFlowUX.confirm');
    expect(source).toContain("tone: 'danger'");
    expect(source).toContain('fail closed rather than invoking that fallback');
  });

  it('preserves history on cancel and clears it only after accessible confirmation', async () => {
    const confirm = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const nativeConfirm = vi.spyOn(window, 'confirm').mockImplementation(() => {
      throw new Error('Native confirm must not be called');
    });
    const app = mountSwimLab({ confirm });

    const firstButton = app.clearButton();
    expect(firstButton.getAttribute('type')).toBe('button');
    await clickAsync(firstButton);
    expect(app.getData().swimLab.askHistory).toHaveLength(1);
    expect(app.clearButton()).not.toBeNull();

    await clickAsync(app.clearButton());
    expect(app.getData().swimLab.askHistory).toEqual([]);
    expect(app.clearButton()).toBeNull();
    expect(confirm).toHaveBeenNthCalledWith(
      1,
      'Clear all saved AI answers? This cannot be undone.',
      {
        title: 'Clear saved AI answers?',
        confirmText: 'Clear history',
        cancelText: 'Keep answers',
        tone: 'danger',
      },
    );
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(nativeConfirm).not.toHaveBeenCalled();
  });

  it('fails safely without calling AlloFlowUX when the real dialog module is unavailable', async () => {
    const confirm = vi.fn(async () => true);
    const nativeConfirm = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    const app = mountSwimLab({ confirm, dialogAvailable: false });

    await clickAsync(app.clearButton());

    expect(app.getData().swimLab.askHistory).toHaveLength(1);
    expect(confirm).not.toHaveBeenCalled();
    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(app.addToast).toHaveBeenCalledWith(
      'Confirmation is unavailable, so your saved answers were not changed.',
      'warning',
    );
  });

  it('preserves history when the accessible confirmation rejects', async () => {
    const confirm = vi.fn(async () => {
      throw new Error('dialog failed');
    });
    const nativeConfirm = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    const app = mountSwimLab({ confirm });

    await clickAsync(app.clearButton());

    expect(app.getData().swimLab.askHistory).toHaveLength(1);
    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(app.addToast).toHaveBeenCalledWith(
      'The confirmation could not open, so your saved answers were not changed.',
      'warning',
    );
  });
});
