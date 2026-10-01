import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.ART_STUDIO_REVIEW_CANDIDATE || 'stem_lab/stem_tool_artstudio.js';
const png = (mark) => 'data:image/png;base64,' + Buffer.from(mark).toString('base64');
let host, root, config, latest, snapshots, setProfile, images, contexts, handoff;

function contextFor(canvas) {
  if (!contexts.has(canvas)) {
    const context = {
      canvas, mark: 'blank',
      clearRect() { this.mark = 'blank'; },
      fillRect() { this.mark = 'paper'; },
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
  resetStemLab(); contexts = new WeakMap(); images = []; handoff = vi.fn();
  vi.stubGlobal('indexedDB', undefined);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('Image', class {
    set src(value) { this._src = value; images.push(this); }
    get src() { return this._src; }
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () { return contextFor(this); });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () { return png(contextFor(this).mark); });
  new Function(readFileSync(sourcePath, 'utf8'))();
  config = window.StemLab._registry.artStudio;
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});

afterEach(async () => {
  await React.act(async () => root?.unmount()); host?.remove();
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

async function mount() {
  function App() {
    const [profile, updateProfile] = React.useState('learner-a');
    const [data, setData] = React.useState({ artStudio: {
      tab: 'symmetry', studioStarted: true, studioHome: false,
      symmetrySnapshot: png('learner-a-paint'), symBackgroundMode: 'transparent',
      studioFreeProjectId: 'learner-a-project',
    } });
    const [saved, setSaved] = React.useState([]);
    latest = data; snapshots = saved; setProfile = updateProfile;
    return config.render(makeCtx({ toolData: data, setToolData: setData, toolSnapshots: saved,
      setToolSnapshots: setSaved, activeProfileId: profile, onUseArtwork: handoff }));
  }
  await React.act(async () => root.render(React.createElement(App)));
  expect(latest.artStudio.studioPersistenceOwnerScope).toBe('profile:learner-a');
  return host.querySelector('#symmetryCanvas');
}

async function click(node) {
  expect(node).toBeTruthy();
  await React.act(async () => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

async function finishImages() {
  await React.act(async () => { for (const image of images.splice(0)) image.onload?.(); });
}

describe('Art Studio pending capture ownership', () => {
  it('cancels a queued study after a learner switch without reviving the previous project', async () => {
    const canvas = await mount();
    await click(host.querySelector('button[aria-label="Save current study"]'));
    expect(snapshots).toHaveLength(0);
    await React.act(async () => setProfile('learner-b'));
    expect(host.querySelector('#symmetryCanvas')).toBe(canvas);
    expect(latest.artStudio.studioPersistenceOwnerScope).toBe('profile:learner-b');
    expect(latest.artStudio.studioFreeProjectId).toBe('');
    await finishImages();
    expect(snapshots).toHaveLength(0);
    expect(latest.artStudio.studioFreeProjectId).toBe('');
    await click(host.querySelector('button[aria-label="Save current study"]'));
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].artStudioPersistenceScope).toBe('profile:learner-b');
  });

  it('cancels a queued handoff even when the learner switches away and back before decoding', async () => {
    await mount();
    await click(host.querySelector('button[title*="Page Designer"]'));
    expect(handoff).not.toHaveBeenCalled();
    await React.act(async () => setProfile('learner-b'));
    await React.act(async () => setProfile('learner-a'));
    await finishImages();
    expect(handoff).not.toHaveBeenCalled();
    await click(host.querySelector('button[title*="Page Designer"]'));
    expect(handoff).toHaveBeenCalledTimes(1);
    expect(handoff.mock.calls[0][0].src).toBe(png('learner-a-paint'));
  });

  it('keeps Clear effective when an earlier Symmetry image eventually decodes', async () => {
    const canvas = await mount();
    expect(canvas._artStudioRestoring).toBe(true);
    await React.act(async () => canvas._symClearAction());
    const cleared = canvas.toDataURL();
    expect(cleared).toBe(png('blank'));
    await finishImages();
    expect(canvas.toDataURL()).toBe(cleared);
    expect(latest.artStudio.symmetrySnapshot).toBe(cleared);
    expect(canvas._artStudioRestoring).toBe(false);
  });

  it('settles captures canceled by Clear without waiting for the discarded image', async () => {
    const canvas = await mount();
    const pendingExport = canvas._symExportAction();
    let result = 'unsettled'; pendingExport.then((value) => { result = value; });
    await click(host.querySelector('button[aria-label="Save current study"]'));
    await React.act(async () => canvas._symClearAction());
    expect(result).toBe('');
    expect(snapshots).toHaveLength(0);
    expect(canvas._artStudioRestoring).toBe(false);
    expect(typeof canvas._symExportAction()).toBe('string');
  });
});