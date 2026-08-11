import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab
} from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Fire Ecology cultural deep-dive interaction', () => {
  let host;
  let root;
  let config;
  let latest;
  let rafQueue;
  let originalRafDescriptor;
  let originalScrollDescriptor;

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_fireecology.js', 'fireEcology');
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    rafQueue = [];

    originalRafDescriptor = Object.getOwnPropertyDescriptor(window, 'requestAnimationFrame');
    originalScrollDescriptor = Object.getOwnPropertyDescriptor(
      window.HTMLElement.prototype,
      'scrollIntoView'
    );
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: vi.fn((callback) => {
        rafQueue.push(callback);
        return rafQueue.length;
      })
    });
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn()
    });
  });

  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    if (host) host.remove();
    if (originalRafDescriptor) {
      Object.defineProperty(window, 'requestAnimationFrame', originalRafDescriptor);
    } else {
      delete window.requestAnimationFrame;
    }
    if (originalScrollDescriptor) {
      Object.defineProperty(
        window.HTMLElement.prototype,
        'scrollIntoView',
        originalScrollDescriptor
      );
    } else {
      delete window.HTMLElement.prototype.scrollIntoView;
    }
    vi.restoreAllMocks();
  });

  async function mountMosaic() {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        fireEcology: { tab: 'mosaic' }
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  async function flushAnimationFrames() {
    while (rafQueue.length) {
      const batch = rafQueue.splice(0);
      batch.forEach((callback) => callback(0));
      await Promise.resolve();
    }
  }

  it('reveals and focuses the selected panel, then closes it with Escape', async () => {
    await mountMosaic();
    const trigger = [...host.querySelectorAll('button')].find(
      (button) => button.getAttribute('aria-label') === 'Learn more about Blueberry Barren'
    );
    expect(trigger).toBeTruthy();

    await act(async () => {
      trigger.click();
      await Promise.resolve();
    });

    expect(latest.fireEcology.mosaic.deepDiveZone).toBe('blueberryBarren');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const panel = host.querySelector('#fireecology-deep-dive-panel-blueberryBarren');
    expect(panel).toBeTruthy();

    await act(async () => flushAnimationFrames());
    expect(document.activeElement).toBe(panel);
    expect(panel.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start'
    });

    await act(async () => {
      panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await Promise.resolve();
    });
    expect(host.querySelector('#fireecology-deep-dive-panel-blueberryBarren')).toBeNull();

    await act(async () => flushAnimationFrames());
    expect(document.activeElement).toBe(trigger);
  });
});
