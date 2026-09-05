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

describe('Art Studio profile hydration keeps legacy kits with their saved runs', () => {
  let config, host, root, database, latestToolData, latestSnapshots, switchProfile;

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
      const [profile, setProfile] = React.useState('learner-a');
      switchProfile = setProfile;
      latestToolData = data; latestSnapshots = snapshots;
      return config.render(makeCtx({ activeProfileId: profile, toolData: data,
        setToolData: setData, toolSnapshots: snapshots, setToolSnapshots: setSnapshots }));
    }
    await act(async () => root.render(React.createElement(App)));
    await settle();
  }

  function seedWorkflow(workflow, profile = 'learner-a') {
    if (!database.data.has('workflow')) database.data.set('workflow', new Map());
    database.data.get('workflow').set('profile:' + profile + '::workflow', {
      version: 1, scope: 'profile:' + profile, savedAt: 1234, workflow,
    });
  }

  function storedWorkflow(profile = 'learner-a') { return database.data.get('workflow').get('profile:' + profile + '::workflow').workflow; }
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

  it('retains a legacy saved palette under its original run when a new thread starts during a profile switch', async () => {
    const palette = { sourceTab: 'colorWheel', harmony: 'triadic', colors: [{ h: 20, s: 80, l: 45 }, { h: 140, s: 80, l: 45 }] };
    seedWorkflow({ studioThreadId: 'tiny-night-world', studioThreadRunId: 'b-saved-run',
      studioCurrentProjectRunId: 'b-saved-run', studioThreadStep: 1, studioThreadCompletedSteps: [0],
      studioThreadKit: { schemaVersion: 1, accessibilityTarget: 7, palette } }, 'learner-b');
    await mount({ studioThreadKit: { schemaVersion: 2, runs: [{ schemaVersion: 1, runId: 'a-private-run', accessibilityTarget: 7 }] } });
    database.control.holdWorkflowReads = true;
    await act(async () => switchProfile('learner-b'));
    await settle();
    expect(database.control.pendingReads).toHaveLength(1);
    expect(latestToolData.artStudio.studioPersistenceOwnerScope).toBe('profile:learner-b');
    expect(latestToolData.artStudio.studioThreadKit.runs).toEqual([]);
    await click(/^Open Studio home$/i);
    await click(/^Start Tiny night world\./i);
    const newRunId = latestToolData.artStudio.studioThreadRunId;
    expect(newRunId).toBeTruthy();
    expect(newRunId).not.toBe('b-saved-run');
    await releaseReads();
    expect(latestToolData.artStudio.studioThreadRunId).toBe(newRunId);
    const runs = storedWorkflow('learner-b').studioThreadKit.runs;
    expect(runs.map(kit => kit.runId).sort()).toEqual(['b-saved-run', newRunId].sort());
    expect(runs.find(kit => kit.runId === 'b-saved-run')).toMatchObject({ accessibilityTarget: 7, palette });
    expect(runs.find(kit => kit.runId === newRunId)).toEqual({ schemaVersion: 1, runId: newRunId, accessibilityTarget: 4.5 });
    expect(runs.some(kit => kit.runId === 'a-private-run')).toBe(false);
  });
});
