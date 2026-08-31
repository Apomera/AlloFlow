import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const HOSTS = [
  'stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab/stem_lab_module.js',
];
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeCanvasContext() {
  const context = {
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

describe('Art Studio snapshots', () => {
  let config;
  let host;
  let root;
  let toast;

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    toast = vi.fn();
    const canvasContext = makeCanvasContext();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
    vi.spyOn(window.HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/webp;base64,study-preview');
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
  });

  it('saves editable inputs while clearing transient playback state', async () => {
    let latestSnapshots = [];
    const keyframes = Array.from({ length: 13 }, (_, index) => ({
      width: 1,
      height: 1,
      marker: index,
      data: new Uint8ClampedArray([index, index, index, 255]),
    }));

    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: {
          tab: 'stereogram',
          studioHome: false,
          studioStarted: true,
          stereoAnimMode: 'animate',
          stereoAnimSource: 'draw',
          stereoAnimKeyframes: keyframes,
          stereoAnimPlaying: true,
          stereoAnimRendering: true,
          stereoAnimHasFrames: true,
          stereoAnimProgress: 67,
          stereoAnimAiGenerating: true,
          stereoAnimAiMotionStatus: 'Generating',
        },
      });
      const [snapshots, setSnapshots] = React.useState([]);
      latestSnapshots = snapshots;
      return config.render(makeCtx({
        toolData,
        setToolData,
        setToolSnapshots: setSnapshots,
        addToast: toast,
      }));
    }

    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
    const save = host.querySelector('button[aria-label="Save current study"]');
    await act(async () => {
      save.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(latestSnapshots).toHaveLength(1);
    const snapshot = latestSnapshots[0];
    expect(snapshot.tool).toBe('artStudio');
    expect(snapshot.label).toBe('Art Studio · Stereogram');
    expect(snapshot.artStudioStudy).toMatchObject({
      schemaVersion: 1,
      sourceTab: 'stereogram',
      stepIndex: null,
      previewSrc: 'data:image/webp;base64,study-preview',
    });
    expect(snapshot.data.tab).toBe('stereogram');
    expect(snapshot.data.stereoAnimKeyframes).toHaveLength(12);
    expect(snapshot.data.stereoAnimKeyframes[0].marker).toBe(1);
    expect(snapshot.data.stereoAnimKeyframes[0].data).toBeInstanceOf(Uint8ClampedArray);
    expect(snapshot.data).toMatchObject({
      stereoAnimPlaying: false,
      stereoAnimRendering: false,
      stereoAnimHasFrames: false,
      stereoAnimProgress: 0,
      stereoAnimIndex: 0,
      stereoAnimAiGenerating: false,
      stereoAnimAiMotionStatus: '',
    });
    expect(toast).toHaveBeenCalledWith('📸 Study saved on your Process Shelf!', 'success');
  });

  for (const hostFile of HOSTS) {
    it('restores Art Studio data in ' + hostFile, () => {
      const source = fs.readFileSync(path.resolve(process.cwd(), hostFile), 'utf8');
      expect(source).toContain("snap.tool === 'artStudio'");
      expect(source).toMatch(
        /snap\.tool === 'artStudio' && snap\.data[\s\S]*artStudio: Object\.assign\(\{\}, prev\.artStudio, snap\.data/,
      );
      expect(source).toMatch(/stereoAnimPlaying: false[\s\S]*stereoAnimHasFrames: false/);
    });
  }
});
