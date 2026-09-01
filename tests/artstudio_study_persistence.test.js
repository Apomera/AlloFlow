import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
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
  const stats = { open: 0, getAll: 0 };
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
              later(() => {
                request.result = rows.get(key);
                request.onsuccess?.({ target: request });
              });
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

describe('Art Studio durable study persistence', () => {
  let config;
  let host;
  let root;
  let database;
  let latestSnapshots;
  let latestToolData;

  beforeEach(() => {
    resetStemLab();
    database = installIndexedDB({
      version: 1,
      stores: {
        watercolorStates: {
          'existing-watercolor': { version: 1, state: { pigment: 'preserved' } },
        },
      },
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    const context = canvasContext();
    window.HTMLCanvasElement.prototype.getContext = function () {
      context.canvas = this;
      return context;
    };
    window.HTMLCanvasElement.prototype.toDataURL = function () {
      return 'data:image/webp;base64,persisted-study-preview';
    };
    window.requestAnimationFrame = vi.fn(() => 1);
    window.cancelAnimationFrame = vi.fn();
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    latestSnapshots = [];
    latestToolData = {};
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: originalIndexedDB,
    });
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: originalWindowIndexedDB,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    window.HTMLCanvasElement.prototype.getContext = originalGetContext;
    window.HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  async function mount({ profileId, artStudio = {}, snapshots = [] } = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: {
          tab: 'pixel',
          studioHome: false,
          studioStarted: true,
          pixelData: { '0-0': '#123456' },
          ...artStudio,
        },
      });
      const [toolSnapshots, setToolSnapshots] = React.useState(snapshots);
      latestToolData = toolData;
      latestSnapshots = toolSnapshots;
      return config.render(makeCtx({
        activeProfileId: profileId,
        toolData,
        setToolData: (updater) => setToolData(updater),
        toolSnapshots,
        setToolSnapshots: (updater) => setToolSnapshots(updater),
      }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
    });
    await settle();
  }

  async function saveStudy() {
    const button = [...host.querySelectorAll('button')].find((node) => /^Save (?:current )?study$/i.test(accessibleName(node)));
    expect(button).toBeTruthy();
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await settle();
  }

  async function clickButton(name) {
    const button = [...host.querySelectorAll('button')].find((node) => name.test(accessibleName(node)));
    expect(button).toBeTruthy();
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await settle();
  }

  it('upgrades the shared database without losing the existing watercolor store', async () => {
    await mount({ profileId: 'learner-a' });
    await saveStudy();

    expect(database.version).toBe(2);
    expect([...database.data.keys()].sort()).toEqual(['studies', 'watercolorStates', 'workflow']);
    expect(database.data.get('watercolorStates').get('existing-watercolor')).toEqual({
      version: 1,
      state: { pigment: 'preserved' },
    });
    expect(database.data.get('studies').size).toBe(1);
    expect(host.textContent).toContain('Saved for this profile on this device.');
  });

  it('hydrates saved studies once, without duplicates, for the matching profile only', async () => {
    await mount({ profileId: 'learner-a' });
    await saveStudy();
    const saved = latestSnapshots[0];
    expect(saved.artStudioPersistenceScope).toBe('profile:learner-a');

    await mount({ profileId: 'learner-a', snapshots: [saved] });
    expect(latestSnapshots.map((study) => study.id)).toEqual([saved.id]);

    await mount({ profileId: 'learner-b' });
    expect(latestSnapshots).toHaveLength(0);

    await mount({ profileId: 'learner-a' });
    expect(latestSnapshots).toHaveLength(1);
    expect(latestSnapshots[0].id).toBe(saved.id);
  });

  it('archives and restores the same durable study row for the matching profile', async () => {
    await mount({ profileId: 'learner-a' });
    await saveStudy();
    const savedId = latestSnapshots[0].id;

    await clickButton(/^Open Process shelf$/i);
    await clickButton(/^Archive /i);

    expect(database.data.get('studies').size).toBe(1);
    let stored = [...database.data.get('studies').values()][0];
    expect(stored.record.id).toBe(savedId);
    expect(stored.record.artStudioStudy.archivedAt).toBeTruthy();

    await mount({ profileId: 'learner-a' });
    expect(latestSnapshots).toHaveLength(1);
    expect(latestSnapshots[0].id).toBe(savedId);
    expect(latestSnapshots[0].artStudioStudy.archivedAt).toBeTruthy();

    await clickButton(/^Open Process shelf$/i);
    await clickButton(/^Archived \(1\)$/i);
    await clickButton(/^Restore /i);

    expect(database.data.get('studies').size).toBe(1);
    stored = [...database.data.get('studies').values()][0];
    expect(stored.record.id).toBe(savedId);
    expect(stored.record.artStudioStudy.archivedAt).toBeUndefined();

    await mount({ profileId: 'learner-a' });
    expect(latestSnapshots).toHaveLength(1);
    expect(latestSnapshots[0].artStudioStudy.archivedAt).toBeUndefined();

    await mount({ profileId: 'learner-b' });
    expect(latestSnapshots).toHaveLength(0);
  });

  it('persists and restores only lightweight project and Creative Thread progress', async () => {
    await mount({
      profileId: 'learner-a',
      artStudio: {
        studioFreeProjectId: 'free-project-7',
        studioCurrentProjectRunId: 'current-project-7',
        studioThreadId: 'tiny-night-world',
        studioThreadRunId: 'thread-run-7',
        studioThreadStep: 1,
        studioThreadCompletedSteps: [0],
        studioLastCompletedThreadRunId: 'finished-run-3',
        studioLastCompletedThreadId: 'pattern-with-a-pulse',
        studioThreadKit: {
          schemaVersion: 1,
          runId: 'thread-run-7',
          accessibilityTarget: 7,
          palette: {
            sourceTab: 'colorWheel',
            harmony: 'triadic',
            colors: [{ h: 20, s: 80, l: 45 }, { h: 140, s: 80, l: 45 }, { h: 260, s: 80, l: 45 }],
          },
        },
        studioVariationParentStudyId: 'study-parent',
        studioVariationRootStudyId: 'study-root',
        studioVariationDepth: 2,
        studioVariationForkPending: true,
        studioVariationActiveStudyId: 'study-active',
      },
    });

    const workflowRows = [...database.data.get('workflow').values()];
    expect(workflowRows).toHaveLength(1);
    expect(workflowRows[0].workflow).toEqual({
      schemaVersion: 3,
      studioFreeProjectId: 'free-project-7',
      studioCurrentProjectRunId: 'current-project-7',
      studioThreadId: 'tiny-night-world',
      studioThreadRunId: 'thread-run-7',
      studioThreadStep: 1,
      studioThreadCompletedSteps: [0],
      studioLastCompletedThreadRunId: 'finished-run-3',
      studioLastCompletedThreadId: 'pattern-with-a-pulse',
      studioThreadKit: {
        schemaVersion: 2,
        runs: [{
          schemaVersion: 1,
          runId: 'thread-run-7',
          accessibilityTarget: 7,
          palette: {
            sourceTab: 'colorWheel',
            harmony: 'triadic',
            colors: [{ h: 20, s: 80, l: 45 }, { h: 140, s: 80, l: 45 }, { h: 260, s: 80, l: 45 }],
          },
        }],
      },
    });
    expect(workflowRows[0].workflow).not.toHaveProperty('studioVariationForkPending');
    expect(workflowRows[0].workflow).not.toHaveProperty('studioVariationActiveStudyId');

    await mount({ profileId: 'learner-a' });
    expect(latestToolData.artStudio).toMatchObject({
      studioFreeProjectId: 'free-project-7',
      studioCurrentProjectRunId: 'current-project-7',
      studioThreadId: 'tiny-night-world',
      studioThreadRunId: 'thread-run-7',
      studioThreadStep: 1,
      studioThreadCompletedSteps: [0],
      studioLastCompletedThreadRunId: 'finished-run-3',
      studioLastCompletedThreadId: 'pattern-with-a-pulse',
      studioThreadKit: {
        schemaVersion: 2,
        runs: [{
          schemaVersion: 1,
          runId: 'thread-run-7',
          accessibilityTarget: 7,
          palette: {
            sourceTab: 'colorWheel',
            harmony: 'triadic',
            colors: [{ h: 20, s: 80, l: 45 }, { h: 140, s: 80, l: 45 }, { h: 260, s: 80, l: 45 }],
          },
        }],
      },
    });
  });

  it('persists independent Thread Kits for multiple project runs', async () => {
    const runA = {
      schemaVersion: 1,
      runId: 'run-a',
      accessibilityTarget: 7,
      palette: {
        sourceTab: 'colorWheel',
        harmony: 'triadic',
        colors: [{ h: 20, s: 80, l: 45 }, { h: 140, s: 80, l: 45 }, { h: 260, s: 80, l: 45 }],
      },
    };
    const runB = {
      schemaVersion: 1,
      runId: 'run-b',
      accessibilityTarget: 4.5,
      palette: {
        sourceTab: 'colorWheel',
        harmony: 'complementary',
        colors: [{ h: 200, s: 90, l: 50 }, { h: 20, s: 90, l: 50 }],
      },
    };
    await mount({
      profileId: 'learner-a',
      artStudio: {
        studioFreeProjectId: 'run-b',
        studioCurrentProjectRunId: 'run-b',
        studioThreadKit: { schemaVersion: 2, runs: [runA, runB] },
      },
    });

    let workflow = [...database.data.get('workflow').values()][0].workflow;
    expect(workflow.schemaVersion).toBe(3);
    expect(workflow.studioThreadKit.runs).toEqual([runA, runB]);

    await mount({ profileId: 'learner-a' });
    expect(latestToolData.artStudio.studioThreadKit).toEqual({
      schemaVersion: 2,
      runs: [runA, runB],
    });
  });

  it('falls back to session-only studies when IndexedDB is unavailable', async () => {
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, writable: true, value: undefined });
    Object.defineProperty(window, 'indexedDB', { configurable: true, writable: true, value: undefined });

    await mount({ profileId: 'learner-a' });
    await saveStudy();

    expect(latestSnapshots).toHaveLength(1);
    expect(latestSnapshots[0].tool).toBe('artStudio');
    expect(host.textContent).toContain('Session only \u2014 keep this tab open to keep these studies.');
  });

  it('hydrates once even when host setter wrappers change during ordinary rerenders', async () => {
    await mount({ profileId: 'learner-a' });
    expect(database.stats.getAll).toBe(1);

    await saveStudy();
    expect(database.stats.getAll).toBe(1);
    expect(database.stats.open).toBe(1);
  });

  it('adopts a legacy unscoped study into the first active profile', async () => {
    const legacyStudy = {
      id: 'legacy-study-1',
      tool: 'artStudio',
      label: 'Legacy pixel study',
      timestamp: 42,
      data: { tab: 'pixel', pixelData: { '0-0': '#abcdef' } },
      artStudioStudy: {
        schemaVersion: 1,
        payloadVersion: 2,
        runId: 'legacy-free-run',
        threadId: '',
        sourceTab: 'pixel',
        stepLabel: 'Pixel Art',
        summary: 'A legacy pixel checkpoint.',
      },
    };

    await mount({ profileId: 'learner-a', snapshots: [legacyStudy] });

    expect(latestSnapshots).toHaveLength(1);
    expect(latestSnapshots[0].artStudioPersistenceScope).toBe('profile:learner-a');
    const stored = [...database.data.get('studies').values()];
    expect(stored).toHaveLength(1);
    expect(stored[0].record.id).toBe('legacy-study-1');
    expect(stored[0].scope).toBe('profile:learner-a');
  });

  it('replaces scoped workflow state during a live learner switch', async () => {
    function SwitchingHarness({ profileId }) {
      const [toolData, setToolData] = React.useState({
        artStudio: {
          tab: 'pixel',
          studioHome: false,
          studioStarted: true,
          studioFreeProjectId: 'a-free',
          studioCurrentProjectRunId: 'a-current',
          studioThreadId: 'tiny-night-world',
          studioThreadRunId: 'a-thread-run',
          studioThreadStep: 1,
          studioThreadCompletedSteps: [0],
        },
      });
      const [toolSnapshots, setToolSnapshots] = React.useState([]);
      latestToolData = toolData;
      latestSnapshots = toolSnapshots;
      return config.render(makeCtx({
        activeProfileId: profileId,
        toolData,
        setToolData: (updater) => setToolData(updater),
        toolSnapshots,
        setToolSnapshots: (updater) => setToolSnapshots(updater),
      }));
    }

    await act(async () => {
      root.render(React.createElement(SwitchingHarness, { profileId: 'learner-a' }));
    });
    await settle();
    expect(latestToolData.artStudio.studioPersistenceOwnerScope).toBe('profile:learner-a');

    database.data.get('workflow').set('profile:learner-b::workflow', {
      version: 1,
      scope: 'profile:learner-b',
      savedAt: Date.now(),
      workflow: {
        schemaVersion: 1,
        studioFreeProjectId: 'b-free',
        studioCurrentProjectRunId: 'b-current',
        studioThreadId: 'pattern-with-a-pulse',
        studioThreadRunId: 'b-thread-run',
        studioThreadStep: 1,
        studioThreadCompletedSteps: [0],
        studioLastCompletedThreadRunId: 'b-finished',
        studioLastCompletedThreadId: 'tiny-night-world',
      },
    });

    await act(async () => {
      root.render(React.createElement(SwitchingHarness, { profileId: 'learner-b' }));
    });
    await settle(12);

    expect(latestToolData.artStudio).toMatchObject({
      studioPersistenceOwnerScope: 'profile:learner-b',
      studioFreeProjectId: 'b-free',
      studioCurrentProjectRunId: 'b-current',
      studioThreadId: 'pattern-with-a-pulse',
      studioThreadRunId: 'b-thread-run',
      studioThreadStep: 1,
      studioThreadCompletedSteps: [0],
      studioLastCompletedThreadRunId: 'b-finished',
      studioLastCompletedThreadId: 'tiny-night-world',
    });
    expect(database.data.get('workflow').get('profile:learner-b::workflow').workflow.studioThreadRunId).toBe('b-thread-run');
  });
});
