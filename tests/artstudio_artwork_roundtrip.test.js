import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// The optional candidate path lets a staged surgical patch be exercised before it
// is applied. Normal test runs always load the production source.
const sourcePath = process.env.ART_STUDIO_REVIEW_CANDIDATE || 'stem_lab/stem_tool_artstudio.js';
let host, root, config, latest, snapshots, update, contexts, frames, database;
const sum = (values) => values.reduce((total, value) => total + value, 0);
const png = (mark) => 'data:image/png;base64,' + Buffer.from(mark).toString('base64');

function fingerprint(value) {
  const hash = createHash('sha256');
  function visit(item) {
    if (ArrayBuffer.isView(item)) { hash.update(Buffer.from(item.buffer, item.byteOffset, item.byteLength)); return; }
    if (item && typeof item === 'object') {
      for (const key of Object.keys(item).sort()) { hash.update(key); visit(item[key]); }
    } else hash.update(JSON.stringify(item) ?? 'undefined');
  }
  visit(value); return hash.digest('hex');
}

function clone(value) {
  if (!value || typeof value !== 'object') return value;
  if (ArrayBuffer.isView(value)) return value.slice();
  if (Array.isArray(value)) return value.map(clone);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
}

function installDatabase() {
  const data = new Map();
  const db = {
    objectStoreNames: { contains: (name) => data.has(name) },
    createObjectStore: (name) => data.set(name, new Map()),
    close() {},
    transaction(name) {
      const rows = data.get(name);
      const transaction = { objectStore() {
        const request = (operation, write = false) => {
          const result = {};
          queueMicrotask(() => {
            result.result = operation(); result.onsuccess?.();
            if (write) queueMicrotask(() => transaction.oncomplete?.());
          });
          return result;
        };
        return {
          get: (key) => request(() => clone(rows.get(key))),
          getAll: () => request(() => [...rows.values()].map(clone)),
          put: (value, key) => request(() => { rows.set(key, clone(value)); return key; }, true),
          delete: (key) => request(() => rows.delete(key), true),
        };
      } };
      return transaction;
    },
  };
  vi.stubGlobal('indexedDB', { open() {
    const request = { result: db };
    queueMicrotask(() => { request.onupgradeneeded?.(); request.onsuccess?.(); });
    return request;
  } });
  return data;
}

function canvasContext(canvas) {
  if (!contexts.has(canvas)) {
    const context = {
      canvas, mark: 'blank',
      clearRect() { this.mark = 'blank'; },
      fillRect() { this.paper = this.fillStyle; this.mark = 'background'; },
      fill() { this.mark += '|paint'; },
      stroke() { this.mark += '|stroke'; },
      getImageData() { return { data: new Uint8ClampedArray(4), mark: this.mark }; },
      putImageData(image) { if (image.mark) this.mark = image.mark; },
      drawImage(image) {
        if (image.src) this.mark = Buffer.from(image.src.split(',')[1] || '', 'base64').toString();
        else if (contexts.has(image)) this.mark = contexts.get(image).mark;
      },
      createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
      measureText: () => ({ width: 10 }),
    };
    contexts.set(canvas, new Proxy(context, { get: (target, key) => key in target ? target[key] : () => {} }));
  }
  return contexts.get(canvas);
}

beforeEach(() => {
  vi.useFakeTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); contexts = new WeakMap(); frames = new Map();
  database = installDatabase();
  let frameId = 0;
  vi.stubGlobal('requestAnimationFrame', (callback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id) => frames.delete(id));
  vi.stubGlobal('Image', class {
    set src(value) { this._src = value; queueMicrotask(() => this.onload?.()); }
    get src() { return this._src; }
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () { return canvasContext(this); });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () { return png(canvasContext(this).mark); });
  new Function(readFileSync(sourcePath, 'utf8'))();
  config = window.StemLab._registry.artStudio;
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});

afterEach(async () => {
  await React.act(async () => root?.unmount());
  host?.remove();
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

async function mount(artStudio) {
  function App() {
    const [data, setData] = React.useState({ artStudio: { studioStarted: true, studioHome: false, ...artStudio } });
    const [saved, setSaved] = React.useState([]);
    latest = data; snapshots = saved; update = setData;
    return config.render(makeCtx({ toolData: data, setToolData: setData, toolSnapshots: saved, setToolSnapshots: setSaved }));
  }
  await React.act(async () => { root.render(React.createElement(App)); });
}

async function click(node) {
  expect(node).toBeTruthy();
  await React.act(async () => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

async function key(canvas, value) {
  await React.act(async () => canvas.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })));
}

async function save() {
  await click(host.querySelector('button[aria-label="Save current study"]'));
  expect(snapshots).toHaveLength(1);
  return snapshots[0];
}

describe('Art Studio artwork checkpoints', () => {
  it('preserves Spin Art paint and live drips through navigation and a same-lab study fork', async () => {
    await mount({ tab: 'spinArt', spinPaused: false });
    let canvas = host.querySelector('#spinCanvas');
    await key(canvas, 'Enter');
    await React.act(async () => frames.get(canvas._spinAnim)(16));
    const painted = canvas.toDataURL();
    expect(canvasContext(canvas).mark).toContain('paint');
    const study = await save();
    expect(study.data.spinSnapshot).toBe(painted);
    expect(study.data.spinDrips.length).toBeGreaterThan(0);
    await click(host.querySelector('#artstudio-tab-pixel'));
    await click(host.querySelector('#artstudio-tab-spinArt'));
    canvas = host.querySelector('#spinCanvas');
    expect(canvas.toDataURL()).toBe(painted);
    expect(canvas._captureArtStudioState().spinDrips).toEqual(study.data.spinDrips);
    await React.act(async () => update((prev) => ({ ...prev, artStudio: { ...prev.artStudio, spinReset: 'clear-test', spinSnapshot: '', spinDrips: [] } })));
    expect(host.querySelector('#spinCanvas').toDataURL()).not.toBe(painted);
    await click(host.querySelector('button[aria-label^="Fork Spin Art"]'));
    expect(host.querySelector('#spinCanvas').toDataURL()).toBe(painted);
    expect(snapshots[0].data.spinSnapshot).toBe(painted);
  });

  it('preserves transparent Symmetry paint through navigation and restores a study without current strokes', async () => {
    await mount({ tab: 'symmetry', symBrushMode: 'solid' });
    let canvas = host.querySelector('#symmetryCanvas');
    await key(canvas, 'Enter');
    const painted = canvas.toDataURL();
    expect(canvasContext(canvas).mark).toMatch(/paint|stroke/);
    const study = await save();
    expect(study.data.symmetrySnapshot).toBe(painted);
    await click(host.querySelector('#artstudio-tab-spirograph'));
    await click(host.querySelector('#artstudio-tab-symmetry'));
    canvas = host.querySelector('#symmetryCanvas');
    expect(canvas.toDataURL()).toBe(painted);
    await key(canvas, 'Enter');
    expect(canvas.toDataURL()).not.toBe(painted);
    await click(host.querySelector('button[aria-label^="Fork Symmetry"]'));
    expect(host.querySelector('#symmetryCanvas').toDataURL()).toBe(painted);
    expect(host.querySelector('#symmetryCanvas')._symUndo).toEqual([]);
  });

  it('replaces a mounted watercolor simulation and keeps the saved study immutable after editing and clearing', async () => {
    await mount({ tab: 'watercolor' });
    const canvas = host.querySelector('#watercolorCanvas');
    const engine = canvas._watercolorEngine;
    await React.act(async () => engine.dabAt(35, 35, 0.8));
    const study = await save();
    const keyAtSave = study.data.watercolorStateKey;
    const persistedAtSave = fingerprint(database.get('watercolorStates').get(keyAtSave));
    const pigmentAtSave = sum(engine.captureState().pigmentDensity);
    await React.act(async () => engine.dabAt(155, 155, 0.8));
    expect(sum(engine.captureState().pigmentDensity)).toBeGreaterThan(pigmentAtSave);
    await click(host.querySelector('button[aria-label^="Fork Watercolor"]'));
    expect(host.querySelector('#watercolorCanvas')._watercolorEngine).toBe(engine);
    expect(sum(engine.captureState().pigmentDensity)).toBeCloseTo(pigmentAtSave, 1);
    expect(engine.captureState().pigmentDensity[155 * 192 + 155]).toBe(0);
    await React.act(async () => { engine.dabAt(120, 120, 0.8); engine.persistState(); });
    expect(latest.artStudio.watercolorStateKey).not.toBe(keyAtSave);
    expect(fingerprint(database.get('watercolorStates').get(keyAtSave))).toBe(persistedAtSave);
    await React.act(async () => engine.clear());
    expect(fingerprint(database.get('watercolorStates').get(keyAtSave))).toBe(persistedAtSave);
  });

  it('clears current watercolor pigment when a saved checkpoint has only a portable PNG', async () => {
    await mount({ tab: 'watercolor' });
    const engine = host.querySelector('#watercolorCanvas')._watercolorEngine;
    await React.act(async () => engine.dabAt(96, 96, 0.8));
    expect(sum(engine.captureState().pigmentDensity)).toBeGreaterThan(0);
    await React.act(async () => update((prev) => ({ ...prev, artStudio: { ...prev.artStudio,
      watercolorSnapshot: png('historical-paint'), watercolorStateKey: 'unavailable-checkpoint',
      watercolorStateIsCheckpoint: true, watercolorRestoreToken: 'portable-fork' } })));
    expect(sum(engine.captureState().pigmentDensity)).toBe(0);
    expect(sum(engine.captureState().water)).toBe(0);
    expect(engine.captureState().baseSnapshot).toBe(png('historical-paint'));
  });
  it.each([
    ['symmetry', 'symmetrySnapshot', '_symExportAction', { symBackgroundMode: 'light' }, '#f8fafc'],
    ['spinArt', 'spinSnapshot', '_spinExportAction', { spinDark: false, spinPaused: true }, '#fefefe'],
  ])('waits for delayed %s paint before exporting or saving a paper-colored preview', async (tab, snapshotKey, exportKey, settings, paperColor) => {
    const images = [];
    vi.stubGlobal('Image', class {
      set src(value) { this._src = value; images.push(this); }
      get src() { return this._src; }
    });
    const incoming = png('historical-white-paint');
    await mount({ tab, [snapshotKey]: incoming, ...settings });
    const canvas = host.querySelector(tab === 'symmetry' ? '#symmetryCanvas' : '#spinCanvas');
    expect(canvas._artStudioRestoring).toBe(true);
    expect(canvas._captureArtStudioState()[snapshotKey]).toBe(incoming);
    const capturedContextCount = HTMLCanvasElement.prototype.getContext.mock.results.length;
    const exported = canvas[exportKey]();
    expect(typeof exported.then).toBe('function');
    await click(host.querySelector('button[aria-label="Save current study"]'));
    expect(snapshots).toHaveLength(0);
    await React.act(async () => { for (const image of images.splice(0)) image.onload(); });
    expect(await exported).toBe(incoming);
    expect(canvas._artStudioRestoring).toBe(false);
    expect(typeof canvas[exportKey]()).toBe('string');
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].data[snapshotKey]).toBe(incoming);
    expect(snapshots[0].artStudioStudy.previewSrc).toBe(incoming);
    const composed = HTMLCanvasElement.prototype.getContext.mock.results.slice(capturedContextCount)
      .map((result) => result.value).filter((context) => context.paper === paperColor && context.mark === 'historical-white-paint');
    expect(composed.length).toBeGreaterThanOrEqual(2); // Export and thumbnail each paint the requested paper.
  });

  it('keeps pending watercolor metadata intact and cancels a queued save after navigation', async () => {
    const images = [];
    vi.stubGlobal('Image', class {
      set src(value) { this._src = value; images.push(this); }
      get src() { return this._src; }
    });
    const incoming = png('portable-watercolor');
    const water = new Float32Array(192 * 192); water[100] = 0.7;
    const pigmentDensity = new Float32Array(192 * 192); pigmentDensity[100] = 0.3;
    const record = { version: 1, state: { simWidth: 192, simHeight: 192, water, pigmentDensity,
      flatSnapshot: incoming, baseSnapshot: incoming, paused: true } };
    database.set('watercolorStates', new Map([['working-before-reload', clone(record)]]));
    await mount({ tab: 'watercolor', watercolorSnapshot: incoming, watercolorStateKey: 'working-before-reload' });
    const canvas = host.querySelector('#watercolorCanvas');
    const engine = canvas._watercolorEngine;
    expect(canvas._artStudioRestoring).toBe(true);
    await React.act(async () => { expect(engine.persistState()).toBe(incoming); });
    expect(latest.artStudio.watercolorSnapshot).toBe(incoming);
    expect(latest.artStudio.watercolorStateKey).toBe('working-before-reload');
    expect(fingerprint(database.get('watercolorStates').get('working-before-reload'))).toBe(fingerprint(record));
    await click(host.querySelector('button[aria-label="Save current study"]'));
    expect(snapshots).toHaveLength(0);
    await click(host.querySelector('#artstudio-tab-colorWheel'));
    await React.act(async () => { for (const image of images.splice(0)) image.onload(); });
    expect(snapshots).toHaveLength(0);
    expect(latest.artStudio.tab).toBe('colorWheel');
    expect(latest.artStudio.watercolorSnapshot).toBe(incoming);
    expect(fingerprint(database.get('watercolorStates').get('working-before-reload'))).toBe(fingerprint(record));
  });

  it('settles watercolor readiness after an image decode error', async () => {
    const images = [];
    vi.stubGlobal('Image', class {
      set src(value) { this._src = value; images.push(this); }
      get src() { return this._src; }
    });
    await mount({ tab: 'watercolor', watercolorSnapshot: png('unreadable-image') });
    const canvas = host.querySelector('#watercolorCanvas');
    expect(canvas._artStudioRestoring).toBe(true);
    await React.act(async () => { for (const image of images.splice(0)) image.onerror(); });
    await canvas._artStudioReady;
    expect(canvas._artStudioRestoring).toBe(false);
  });
});
