import { beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_volume.js';

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'volume');
});

describe('3D Volume Explorer freeform layer builder', () => {
  it('normalizes layer colors and derives readable rendering tones', () => {
    const pure = window.__alloVolumePure;

    expect(pure.layerColors).toHaveLength(10);
    expect(pure.normalizeVolumeLayerColor('#00AA55', 1)).toBe('#00aa55');
    expect(pure.normalizeVolumeLayerColor('invalid', 1)).toBe(pure.layerColors[1]);
    expect(pure.volumeLayerColorToHsl('#00aa55', 1)).toMatchObject({
      hex: '#00aa55',
      h: 150,
      s: 100,
    });
    expect(pure.volumeLayerTextColor('#ffffff', 0)).toBe('#0f172a');
    expect(pure.volumeLayerTextColor('#111111', 0)).toBe('#ffffff');
    expect(pure.volumeExportFaceColors('#00aa55', 1)).toMatchObject({
      hex: '#00aa55',
      top: expect.stringContaining('hsl(150,100%'),
    });
    expect(pure.cameraPresets).toMatchObject({
      isometric: { rotation: { x: -25, y: -35 }, scale: 1 },
      front: { rotation: { x: 0, y: 0 }, scale: 1 },
      side: { rotation: { x: 0, y: -90 }, scale: 1 },
      top: { rotation: { x: -90, y: 0 }, scale: 0.9 },
    });
  });

  it('places, recolors, layers, and undoes blocks through the visible grid', async () => {
    const cfg = window.StemLab._registry.volume;
    const container = document.createElement('div');
    document.body.appendChild(container);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const originalCanvasGetContext = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = function() {
      const noop = function() {};
      return {
        scale: noop, fillRect: noop, save: noop, translate: noop,
        beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
        rect: noop, arc: noop, ellipse: noop, fill: noop, stroke: noop,
        restore: noop, fillText: noop, setTransform: noop,
      };
    };
    const originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
    };

    function Host() {
      const [toolData, setToolData] = React.useState({
        _volume: { mode: 'freeform', positions: [] },
      });
      return cfg.render(makeCtx({ toolData, setToolData }));
    }

    const root = ReactDOMClient.createRoot(container);
    const setNativeValue = (element, value) => {
      const prototype = element.tagName === 'SELECT'
        ? window.HTMLSelectElement.prototype
        : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
      setter.call(element, value);
    };

    try {
      await React.act(async () => {
        root.render(React.createElement(Host));
      });

      expect(container.querySelector('[data-volume-layer-builder="true"]')).not.toBeNull();
      expect(container.querySelectorAll('[data-volume-cell-layer="0"]')).toHaveLength(64);

      let firstCell = container.querySelector('[data-volume-cell="0-0-0"]');
      expect(firstCell.getAttribute('aria-pressed')).toBe('false');

      await React.act(async () => firstCell.click());

      firstCell = container.querySelector('[data-volume-cell="0-0-0"]');
      expect(firstCell.getAttribute('aria-pressed')).toBe('true');
      expect(container.querySelector('[data-volume-cube="true"][data-volume-layer="0"]').getAttribute('data-volume-layer-color')).toBe('#2563eb');
      expect(container.textContent).toContain('Layer 1 has 1 block.');

      const layerSelect = container.querySelector('#volume-freeform-layer');
      await React.act(async () => {
        setNativeValue(layerSelect, '1');
        layerSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
      });

      const colorInput = container.querySelector('#volume-layer-color');
      await React.act(async () => {
        setNativeValue(colorInput, '#00aa55');
        colorInput.dispatchEvent(new window.Event('input', { bubbles: true }));
        colorInput.dispatchEvent(new window.Event('change', { bubbles: true }));
      });

      const secondLayerCell = container.querySelector('[data-volume-cell="1-0-1"]');
      await React.act(async () => secondLayerCell.click());

      const secondLayerCube = container.querySelector('[data-volume-cube="true"][data-volume-layer="1"]');
      expect(secondLayerCube).not.toBeNull();
      expect(secondLayerCube.getAttribute('data-volume-layer-color')).toBe('#00aa55');
      expect(container.textContent).toContain('Layer 2 has 1 block.');

      const undo = container.querySelector('button[aria-label*="Undo last placement"]');
      await React.act(async () => undo.click());
      expect(container.querySelector('[data-volume-cube="true"][data-volume-layer="1"]')).toBeNull();
      expect(container.querySelector('[data-volume-cube="true"][data-volume-layer="0"]')).not.toBeNull();
      await React.act(async () => {
        setNativeValue(layerSelect, '0');
        layerSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
      });

      const duplicate = container.querySelector('button[aria-label^="Duplicate layer 1"]');
      await React.act(async () => duplicate.click());
      expect(container.querySelector('[data-volume-cube="true"][data-volume-layer="1"]')).not.toBeNull();
      expect(container.querySelector('#volume-freeform-layer').value).toBe('1');

      const clearLayer = container.querySelector('button[aria-label^="Clear every block from layer 2"]');
      await React.act(async () => clearLayer.click());
      expect(container.querySelector('[data-volume-cube="true"][data-volume-layer="1"]')).toBeNull();

      await React.act(async () => {
        container.querySelector('button[aria-label*="Undo last placement"]').click();
      });
      expect(container.querySelectorAll('[data-volume-cube="true"][data-volume-layer="1"]')).toHaveLength(1);

      const fillLayer = container.querySelector('button[aria-label^="Fill every square on layer 2"]');
      await React.act(async () => fillLayer.click());
      expect(container.querySelectorAll('[data-volume-cell-layer="1"][aria-pressed="true"]')).toHaveLength(64);
      expect(container.querySelectorAll('[data-volume-cube="true"][data-volume-layer="1"]')).toHaveLength(64);

      await React.act(async () => {
        container.querySelector('button[aria-label*="Undo last placement"]').click();
      });
      expect(container.querySelectorAll('[data-volume-cube="true"][data-volume-layer="1"]')).toHaveLength(1);

      expect(container.querySelector('#volume-3d-viewport')).not.toBeNull();
      expect(container.querySelector('[data-volume-fullscreen="true"]')).not.toBeNull();
      const topView = container.querySelector('[data-volume-camera="top"]');
      await React.act(async () => topView.click());
      expect(container.querySelector('[data-volume-camera="top"]').getAttribute('aria-pressed')).toBe('true');
    } finally {
      await React.act(async () => root.unmount());
      container.remove();
      window.HTMLCanvasElement.prototype.getContext = originalCanvasGetContext;
      if (originalResizeObserver) globalThis.ResizeObserver = originalResizeObserver; else delete globalThis.ResizeObserver;
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
  });
});
