import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Circuit workbench language changes', () => {
  let host, root, config, latest, seed;

  beforeEach(() => {
    const context = new Proxy({
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
      measureText: () => ({ width: 0 }),
    }, { get: (target, key) => target[key] || (() => {}) });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit');
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
  });

  function Harness({ locale }) {
    const [toolData, setToolData] = React.useState(seed);
    const t = React.useMemo(() => (_key, fallback) => locale + ': ' + fallback, [locale]);
    latest = toolData;
    return config.render(makeCtx({ toolData, setToolData, t }));
  }

  const render = async (locale) => {
    await act(async () => root.render(React.createElement(Harness, { locale })));
  };

  it('updates Simple labels and memoized 3D labels without losing a draft or circuit state', async () => {
    seed = { _circuit: {
      mode: 'series', voltage: 9, pauseMotion: true, benchView: '3d',
      components: [{ type: 'resistor', value: 100, id: 1 }, { type: 'capacitor', value: 1000, id: 2 }],
      selectedPart: 0, lessonId: 'resistance', lessonOpen: true, prediction: 'Keep my prediction.',
    } };
    await render('EN');
    const input = host.querySelector('#circuit-inspector-value');
    expect(input.value).toBe('100');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '333');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(input.value).toBe('333');
    expect(latest._circuit.components[0].value).toBe(100);
    const components = latest._circuit.components;

    for (const locale of ['ES', 'FR', 'EN']) {
      await render(locale);
      expect(host.querySelector('[data-circuit-clear]').getAttribute('aria-label')).toBe(locale + ': Clear');
      expect(host.querySelector('.circuit-scene-pins').getAttribute('aria-label')).toBe(locale + ': Select a component directly in the 3D scene');
      expect(host.querySelector('.circuit-camera input').getAttribute('aria-label')).toBe(locale + ': 3D camera zoom');
      expect(host.querySelector('.circuit-learning-steps').getAttribute('aria-label')).toBe(locale + ': Experiment progress');
      expect(host.querySelector('#circuit-inspector-value')).toBe(input);
      expect(input.value).toBe('333');
      expect(latest._circuit.components).toBe(components);
      expect(latest._circuit.prediction).toBe('Keep my prediction.');
    }
  });

  it.each([
    ['mixedWorkbench', '.circuit-mixed-controls input', 'Mixed circuit supply voltage', '.circuit-signal-controls select', 'Signal experiment'],
    ['activeWorkbench', '.circuit-active-root', 'Active electronics workbench', '.circuit-active-node-layer', 'Place selected probe on a circuit node'],
    ['networkWorkbench', '.circuit-network-root', 'Connected circuit workbench', '.circuit-network-scroll', 'Scrollable connected circuit board'],
  ])('updates %s root and nested labels with the current translator', async (flag, selector, label, childSelector, childLabel) => {
    seed = { _circuit: { [flag]: true, pauseMotion: true } };
    await render('EN');
    const element = host.querySelector(selector);
    expect(element.getAttribute('aria-label')).toBe('EN: ' + label);
    for (const locale of ['ES', 'FR', 'EN']) {
      await render(locale);
      expect(host.querySelector(selector)).toBe(element);
      expect(element.getAttribute('aria-label')).toBe(locale + ': ' + label);
      expect(host.querySelector(childSelector).getAttribute('aria-label')).toBe(locale + ': ' + childLabel);
      expect(latest._circuit[flag]).toBe(true);
    }
  });
});
