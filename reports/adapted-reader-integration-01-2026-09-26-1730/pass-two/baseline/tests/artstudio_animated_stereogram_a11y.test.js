import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');
const publicPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_artstudio.js');
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeCanvasContext(width = 400, height = 400) {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    createImageData: vi.fn((w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h })),
    drawImage: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(width * height * 4), width, height })),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    putImageData: vi.fn(),
    stroke: vi.fn(),
  };
}

describe('Art Studio animated stereogram accessibility', () => {
  let host;
  let root;
  let announce;
  let config;
  let drawContext;
  let depthContext;
  let outputContext;

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    announce = vi.fn();
    drawContext = makeCanvasContext();
    depthContext = makeCanvasContext();
    outputContext = makeCanvasContext(512, 512);
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      if (this.id === 'stereoAnimDrawCanvas') return drawContext;
      if (this.id === 'depthMapCanvas') return depthContext;
      return outputContext;
    });
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

  async function mount(initial, onState, overrides) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ artStudio: initial });
      if (onState) onState(toolData);
      return config.render(makeCtx(Object.assign({}, overrides || {}, {
        toolData,
        setToolData,
        announceToSR: announce,
      })));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('groups source, preset, brush, pattern, and transform choices with selected states and reflow', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const presetHtml = renderTool('artStudio', {
      artStudio: {
        tab: 'stereogram',
        stereoAnimMode: 'animate',
        stereoAnimSource: 'preset',
        stereoAnimPreset: 'pulseSphere',
        stereoPattern: 'color',
      },
    });

    expect(presetHtml).toContain('grid grid-cols-2 sm:grid-cols-5');
    expect(presetHtml).toContain('aria-labelledby="artstudio-animation-source-label"');
    expect(presetHtml).toContain('aria-labelledby="artstudio-animation-preset-label"');
    expect(presetHtml).toMatch(/aria-pressed="true"[^>]*>✨ Preset/);
    expect(presetHtml).toMatch(/aria-pressed="true"[^>]*>💫 Pulse/);
    expect(presetHtml).toContain('aria-labelledby="artstudio-anim-pattern-label"');

    const transformHtml = renderTool('artStudio', {
      artStudio: {
        tab: 'stereogram',
        stereoAnimMode: 'animate',
        stereoAnimSource: 'transform',
        stereoAnimTransform: 'rotate',
        stereoStaticDepthSnapshot: { width: 1, height: 1, data: [0, 0, 0, 255] },
      },
    });
    expect(transformHtml).toContain('aria-labelledby="artstudio-static-transform-label"');
    expect(transformHtml).toContain('Static depth map captured');
    expect(transformHtml).toMatch(/aria-pressed="true"[^>]*>🔄 Rotate/);
  });

  it('exposes keyboard drawing instructions, shortcuts, labels, focus, progress, and playback state', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'stereogram',
        stereoAnimMode: 'animate',
        stereoAnimSource: 'draw',
        stereoAnimDrawBrush: 'near',
        stereoAnimKeyframes: [{ width: 1, height: 1, data: [0, 0, 0, 255] }],
        stereoAnimRendering: true,
        stereoAnimProgress: 42,
        stereoAnimHasFrames: true,
        stereoAnimPlaying: false,
      },
    });

    expect(html).toContain('hold Shift with an Arrow key to draw');
    expect(html).toContain('aria-describedby="artstudio-anim-draw-description artstudio-anim-depth-touch-help artstudio-anim-draw-keyboard-help"');
    expect(html).toContain('Shift+ArrowUp');
    expect(html).toContain('focus-visible:ring-4');
    expect(html).toContain('for="artstudio-anim-draw-size"');
    expect(html).toContain('for="artstudio-anim-frame-count"');
    expect(html).toContain('role="progressbar" aria-label="Animation rendering progress"');
    expect(html).toContain('aria-valuenow="42"');
    expect(html).toContain('aria-label="Remove keyframe 1"');
    expect(html).toContain('aria-label="Play animated stereogram" aria-pressed="false"');
    expect(html).toContain('aria-describedby="artstudio-animated-stereogram-help"');
    expect(html).toContain('from-purple-700 to-indigo-700');
  });

  it('moves, stamps, draws, exposes a visible cursor, and refreshes the selected brush handler', async () => {
    await mount({
      tab: 'stereogram',
      stereoAnimMode: 'animate',
      stereoAnimSource: 'draw',
      stereoAnimDrawBrush: 'near',
      stereoAnimDrawSize: 20,
    });
    const canvas = host.querySelector('#stereoAnimDrawCanvas');
    const cursor = host.querySelector('[data-anim-depth-keyboard-cursor="true"]');
    canvas.focus();

    expect(cursor.style.display).toBe('block');
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    canvas.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    }));

    expect(announce).toHaveBeenCalledWith('Animation depth cursor x 210, y 200.');
    expect(announce).toHaveBeenCalledWith('Stamped near animation depth at x 210, y 200.');
    expect(announce).toHaveBeenCalledWith('Drew animation depth to x 210, y 210.');
    expect(drawContext.arc).toHaveBeenCalled();
    expect(drawContext.lineTo).toHaveBeenCalledWith(210, 210);

    const midButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Mid'));
    await act(async () => {
      midButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(announce).toHaveBeenCalledWith('Stamped mid animation depth at x 210, y 210.');
    expect(drawContext.fillStyle).toBe('#888888');
  });

  it('captures the static depth map before switching to animation mode', async () => {
    let latest;
    depthContext.getImageData.mockReturnValue({
      data: new Uint8ClampedArray([7, 8, 9, 255]),
      width: 400,
      height: 400,
    });
    await mount({
      tab: 'stereogram',
      stereoAnimMode: 'static',
      stereoDepth: 'near',
    }, (toolData) => {
      latest = toolData;
    });

    const animateButton = host.querySelector('button[aria-label="Animate"]');
    await act(async () => {
      animateButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(latest.artStudio.stereoAnimMode).toBe('animate');
    expect(latest.artStudio.stereoStaticDepthSnapshot).toMatchObject({
      width: 400,
      height: 400,
    });
    expect(latest.artStudio.stereoStaticDepthSnapshot.data).toBeInstanceOf(Uint8ClampedArray);
    expect(Array.from(latest.artStudio.stereoStaticDepthSnapshot.data)).toEqual([7, 8, 9, 255]);
  });

  it('stores keyframes in compact typed buffers and enforces the capture limit', async () => {
    let latest;
    const toast = vi.fn();
    drawContext.getImageData.mockReturnValue({
      data: new Uint8ClampedArray([11, 22, 33, 255]),
      width: 400,
      height: 400,
    });
    const existing = Array.from({ length: 11 }, () => ({
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([0, 0, 0, 255]),
    }));
    await mount({
      tab: 'stereogram',
      stereoAnimMode: 'animate',
      stereoAnimSource: 'draw',
      stereoAnimKeyframes: existing,
    }, (toolData) => {
      latest = toolData;
    }, { addToast: toast });

    const capture = host.querySelector('button[aria-label="Capture Keyframe"]');
    await act(async () => {
      capture.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(latest.artStudio.stereoAnimKeyframes).toHaveLength(12);
    expect(latest.artStudio.stereoAnimKeyframes[11].data).toBeInstanceOf(Uint8ClampedArray);
    expect(Array.from(latest.artStudio.stereoAnimKeyframes[11].data)).toEqual([11, 22, 33, 255]);

    await act(async () => {
      capture.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.stereoAnimKeyframes).toHaveLength(12);
    expect(toast).toHaveBeenCalledWith(
      'Keep up to 12 keyframes. Remove one before capturing another.',
      'warning',
    );
  });

  it('keeps the playback timer reachable after render-progress state updates', async () => {
    const animationFrames = [];
    window.requestAnimationFrame.mockImplementation((callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });
    const setTimer = vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 321);
    const clearTimer = vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => {});
    let latest;
    await mount({
      tab: 'stereogram',
      stereoAnimMode: 'animate',
      stereoAnimSource: 'preset',
      stereoAnimPreset: 'floatText',
      stereoAnimFrameCount: 2,
      stereoAnimSpeed: 8,
    }, (toolData) => {
      latest = toolData;
    });

    const render = host.querySelector('button[aria-label="Render Animated Stereogram"]');
    await act(async () => {
      render.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    let frameNumber = 0;
    while (animationFrames.length && frameNumber < 10) {
      const callback = animationFrames.shift();
      frameNumber += 1;
      await act(async () => {
        callback(frameNumber * 16);
        await Promise.resolve();
      });
    }

    expect(latest.artStudio.stereoAnimHasFrames).toBe(true);
    expect(latest.artStudio.stereoAnimPlaying).toBe(true);
    expect(setTimer).toHaveBeenCalled();

    const pause = host.querySelector('button[aria-label="Pause animated stereogram"]');
    await act(async () => {
      pause.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(clearTimer).toHaveBeenCalledWith(321);
    expect(latest.artStudio.stereoAnimPlaying).toBe(false);
  });

  it('ignores queued render work after returning to the Studio home', async () => {
    const animationFrames = [];
    window.requestAnimationFrame.mockImplementation((callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });
    let latest;
    await mount({
      tab: 'stereogram',
      studioHome: false,
      studioStarted: true,
      stereoAnimMode: 'animate',
      stereoAnimSource: 'preset',
      stereoAnimPreset: 'floatText',
      stereoAnimFrameCount: 2,
    }, (toolData) => {
      latest = toolData;
    });

    const render = host.querySelector('button[aria-label="Render Animated Stereogram"]');
    await act(async () => {
      render.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    const queuedRender = animationFrames.shift();
    expect(queuedRender).toBeTypeOf('function');

    const homeButton = host.querySelector('button[aria-label="Open Studio home"]');
    await act(async () => {
      homeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await act(async () => {
      queuedRender(16);
      await Promise.resolve();
    });

    expect(latest.artStudio.studioHome).toBe(true);
    expect(latest.artStudio.stereoAnimRendering).toBe(false);
    expect(latest.artStudio.stereoAnimHasFrames).toBe(false);
    expect(animationFrames).toHaveLength(0);
  });

  it('keeps reduced-motion users paused after all three rendering completion paths', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source.match(/if \(reducedMotion\) upd\('stereoAnimPlaying', false\);/g)).toHaveLength(3);
    expect(source).toContain("transition: reducedMotion ? 'none' : 'width 0.3s'");
    expect(source).toContain('srcData = d.stereoStaticDepthSnapshot || null');
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
