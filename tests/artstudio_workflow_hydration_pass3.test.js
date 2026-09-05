import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const originalIndexedDB = globalThis.indexedDB;
const originalWindowIndexedDB = window.indexedDB;
const originalMatchMedia = window.matchMedia;
const originalGetContext = window.HTMLCanvasElement.prototype.getContext;
const originalToDataURL = window.HTMLCanvasElement.prototype.toDataURL;
const originalRequestAnimationFrame = window.requestAnimationFrame;
const originalCancelAnimationFrame = window.cancelAnimationFrame;

function installIndexedDB({ version = 1, stores = {} } = {}) {
  let databaseVersion = version;
  const data = new Map();
  const stats = { open: 0, getAll: 0, workflowWrites: 0 };
  const control = { failWorkflowReads: 0, holdWorkflowReads: false, pendingReads: [] };
  Object.entries(stores).forEach(([name, rows]) => {
    data.set(name, new Map(Object.entries(rows || {})));
  });
  const later = (fn) => queueMicrotask(fn);
  const objectStoreNames = {
    contains(name) {
      return data.has(name);
    },
  };
  const database = {
    objectStoreNames,
    createObjectStore(name) {
      if (!data.has(name)) data.set(name, new Map());
      return {};
    },
    close() {},
    transaction(name) {
      if (!data.has(name)) throw new Error('Missing object store ' + name);
      const rows = data.get(name);
      let transaction;
      const complete = () => later(() => transaction.oncomplete?.());
      transaction = {
        oncomplete: null,
        onerror: null,
        onabort: null,
        objectStore() {
          return {
            get(key) {
              const request = {};
              const captured = rows.get(key);
              const fail = name === 'workflow' && control.failWorkflowReads > 0;
              if (fail) control.failWorkflowReads -= 1;
              const finish = () => {
                if (fail) { request.onerror?.(); transaction.onabort?.(); return; }
                request.result = captured;
                request.onsuccess?.({ target: request });
              };
              if (name === 'workflow' && control.holdWorkflowReads) control.pendingReads.push(finish);
              else later(finish);
              return request;
            },
            getAll() {
              stats.getAll += 1;
              const request = {};
              later(() => {
                request.result = [...rows.values()];
                request.onsuccess?.({ target: request });
              });
              return request;
            },
            put(value, key) {
              if (name === 'workflow') stats.workflowWrites += 1;
              const request = {};
              later(() => {
                rows.set(key, value);
                request.result = key;
                request.onsuccess?.({ target: request });
                complete();
              });
              return request;
            },
            delete(key) {
              const request = {};
              later(() => {
                rows.delete(key);
                request.result = undefined;
                request.onsuccess?.({ target: request });
                complete();
              });
              return request;
            },
          };
        },
      };
      return transaction;
    },
  };
  const factory = {
    open(name, requestedVersion) {
      stats.open += 1;
      const request = { result: database };
      later(() => {
        if (requestedVersion > databaseVersion) {
          databaseVersion = requestedVersion;
          request.onupgradeneeded?.({ target: request });
        }
        request.onsuccess?.({ target: request });
      });
      return request;
    },
  };
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, writable: true, value: factory });
  Object.defineProperty(window, 'indexedDB', { configurable: true, writable: true, value: factory });
  return {
    data,
    stats,
    control,
    get version() {
      return databaseVersion;
    },
  };
}

function canvasContext() {
  const gradient = { addColorStop: vi.fn() };
  const context = {
    canvas: null,
    createImageData: vi.fn((width, height) => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    })),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
    })),
    putImageData: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    measureText: vi.fn(() => ({ width: 12 })),
  };
  return new Proxy(context, {
    get(target, property) {
      if (!(property in target)) target[property] = vi.fn();
      return target[property];
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });
}

async function settle(turns = 8) {
  await act(async () => {
    for (let index = 0; index < turns; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
}

function accessibleName(node) {
  return String(node?.getAttribute('aria-label') || node?.textContent || '').replace(/\s+/g, ' ').trim();
}


const sourcePath = process.env.ART_STUDIO_REVIEW_CANDIDATE || 'stem_lab/stem_tool_artstudio.js';

describe('Art Studio workflow hydration protects durable progress', () => {
  let config, host, root, database, latestToolData, latestSnapshots;

  beforeEach(() => {
    resetStemLab();
    database = installIndexedDB();
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true,
      value: vi.fn(() => ({ matches: false })) });
    const context = canvasContext();
    window.HTMLCanvasElement.prototype.getContext = function () { context.canvas = this; return context; };
    window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,cHJldmlldw==';
    window.requestAnimationFrame = vi.fn(() => 1);
    window.cancelAnimationFrame = vi.fn();
    new Function(readFileSync(sourcePath, 'utf8'))();
    config = window.StemLab._registry.artStudio;
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, writable: true, value: originalIndexedDB });
    Object.defineProperty(window, 'indexedDB', { configurable: true, writable: true, value: originalWindowIndexedDB });
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: originalMatchMedia });
    window.HTMLCanvasElement.prototype.getContext = originalGetContext;
    window.HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  async function mount(artStudio = {}) {
    function App() {
      const [data, setData] = React.useState({ artStudio: {
        tab: 'pixel', studioStarted: true, studioHome: false, pixelData: { '0-0': '#123456' }, ...artStudio,
      } });
      const [snapshots, setSnapshots] = React.useState([]);
      latestToolData = data; latestSnapshots = snapshots;
      return config.render(makeCtx({ activeProfileId: 'learner-a', toolData: data,
        setToolData: setData, toolSnapshots: snapshots, setToolSnapshots: setSnapshots }));
    }
    await act(async () => root.render(React.createElement(App)));
    await settle();
  }

  function seedWorkflow(workflow) {
    if (!database.data.has('workflow')) database.data.set('workflow', new Map());
    database.data.get('workflow').set('profile:learner-a::workflow', {
      version: 1, scope: 'profile:learner-a', savedAt: 1234, workflow,
    });
  }

  function storedWorkflow() { return database.data.get('workflow').get('profile:learner-a::workflow').workflow; }
  async function click(name) {
    const button = [...host.querySelectorAll('button')].find(node => name.test(accessibleName(node)));
    expect(button).toBeTruthy();
    await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await settle();
  }
  async function releaseReads() {
    database.control.holdWorkflowReads = false;
    await act(async () => database.control.pendingReads.splice(0).forEach(finish => finish()));
    await settle();
  }

  it('does not overwrite an existing workflow after a failed read, including after a successful study save', async () => {
    const workflow = { studioThreadId: 'tiny-night-world', studioThreadRunId: 'durable-run',
      studioCurrentProjectRunId: 'durable-run', studioThreadStep: 1, studioThreadCompletedSteps: [0] };
    seedWorkflow(workflow);
    database.control.failWorkflowReads = 1;
    await mount();
    expect(storedWorkflow()).toEqual(workflow);
    expect(database.stats.workflowWrites).toBe(0);
    expect(host.textContent).toContain('Session only');
    await click(/^Save (?:current )?study$/i);
    expect(latestSnapshots).toHaveLength(1);
    expect(database.data.get('studies').size).toBe(1);
    expect(database.stats.workflowWrites).toBe(0);
    expect(storedWorkflow()).toEqual(workflow);
    expect(host.textContent).toContain('Session only');
    await mount();
    expect(latestToolData.artStudio.studioThreadRunId).toBe('durable-run');
    expect(latestSnapshots).toHaveLength(1);
  });

  it('keeps a thread closed when the learner leaves it before its older workflow finishes loading', async () => {
    const kit = { schemaVersion: 1, runId: 'durable-run', accessibilityTarget: 7,
      palette: { sourceTab: 'colorWheel', harmony: 'triadic', colors: [{ h: 20, s: 80, l: 45 }, { h: 140, s: 80, l: 45 }] } };
    const workflow = { studioThreadId: 'tiny-night-world', studioThreadRunId: 'durable-run',
      studioCurrentProjectRunId: 'durable-run', studioThreadStep: 0, studioThreadCompletedSteps: [],
      studioThreadKit: { schemaVersion: 2, runs: [kit] } };
    seedWorkflow(workflow);
    database.control.holdWorkflowReads = true;
    await mount({ ...workflow, studioThreadKit: undefined });
    expect(database.control.pendingReads).toHaveLength(1);
    await click(/^Leave brief$/i);
    expect(latestToolData.artStudio.studioThreadId).toBe('');
    await releaseReads();
    expect(latestToolData.artStudio.studioThreadId).toBe('');
    expect(latestToolData.artStudio.studioThreadRunId).toBe('');
    expect(storedWorkflow().studioThreadId).toBe('');
    expect(storedWorkflow().studioThreadKit.runs).toEqual([kit]);
  });

  it('still restores untouched navigation after delayed hydration and writes a new empty store', async () => {
    const workflow = { studioThreadId: 'tiny-night-world', studioThreadRunId: 'durable-run',
      studioCurrentProjectRunId: 'durable-run', studioThreadStep: 1, studioThreadCompletedSteps: [0] };
    seedWorkflow(workflow);
    database.control.holdWorkflowReads = true;
    await mount();
    await releaseReads();
    expect(latestToolData.artStudio.studioThreadRunId).toBe('durable-run');
    expect(storedWorkflow().studioThreadCompletedSteps).toEqual([0]);
    database.data.get('workflow').clear();
    await mount({ studioFreeProjectId: 'new-free-run' });
    expect(storedWorkflow().studioFreeProjectId).toBe('new-free-run');
  });
});
