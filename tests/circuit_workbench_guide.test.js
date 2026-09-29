import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Circuit workbench orientation', () => {
  let host, root, config, latest, seed, announce;

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
    announce = vi.fn();
    seed = {
      _circuit: {
        voltage: 9, mode: 'series', pauseMotion: true,
        components: [{ id: 1, type: 'resistor', value: 330 }],
        prediction: 'Keep my prediction', observations: [{ before: { mode: 'series', voltage: 6, components: [] }, after: { mode: 'series', voltage: 9, components: [{ id: 1, type: 'resistor', value: 330 }] }, delta: 9 / 330, explanation: 'Keep my notes' }],
        undo: [{ voltage: 6, mode: 'series', components: [] }],
      },
      _circuitMixed: { voltage: 7, mode: 'mixed', components: [{ id: 11, type: 'resistor', value: 470, branch: 1 }], prediction: 'Mixed notes' },
      _circuitActive: { project: 'light', supply: 6, input: 2.7, light: 32, prediction: 'Active notes' },
      _circuitNetwork: { components: [{ id: 1, type: 'voltage', value: 4, a: 'A', b: '0' }, { id: 2, type: 'resistor', value: 180, a: 'A', b: '0' }], analysis: 'dc', prediction: 'Network notes' },
      circuit: { workspaceTab: 'build', expSection: 'ohmInquiry' },
      unrelated: { keep: true },
    };
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
  });

  function Harness({ locale }) {
    const [toolData, setToolData] = React.useState(seed);
    const t = React.useMemo(() => (_key, fallback) => locale ? locale + ': ' + fallback : fallback, [locale]);
    latest = toolData;
    return config.render(makeCtx({ toolData, setToolData, t, announceToSR: announce }));
  }

  const render = async (locale = '') => act(async () => root.render(React.createElement(Harness, { locale })));
  const guide = () => host.querySelector('.circuit-workspace-guide');
  const openGuide = async () => act(async () => guide().querySelector('summary').click());
  const action = id => host.querySelector('[data-circuit-open-workbench="' + id + '"]');

  it('starts collapsed and explains four choices without loading a starter circuit', async () => {
    seed = { _circuit: { components: [], voltage: 9, pauseMotion: true } };
    await render();
    const parts = latest._circuit.components;
    expect(guide().open).toBe(false);
    expect(guide().querySelector('summary').textContent).toBe('Which workbench should I use?');
    await openGuide();
    expect(guide().open).toBe(true);
    expect(guide().querySelectorAll('li')).toHaveLength(4);
    expect(guide().textContent).toContain('Your circuit in each workbench stays in place');
    expect(latest._circuit.components).toBe(parts);
    expect(latest._circuit.components).toHaveLength(0);
    expect(latest._circuitMixed).toBeUndefined();
    expect(latest._circuitActive).toBeUndefined();
    expect(latest._circuitNetwork).toBeUndefined();
  });

  it('opens each saved workbench and preserves designs, history, notes and unrelated state', async () => {
    await render();
    await openGuide();
    const parts = latest._circuit.components;
    const history = latest._circuit.undo;
    const notes = latest._circuit.observations;
    const workbenches = [
      ['mixed', 'mixedWorkbench', '.circuit-mixed-root'],
      ['active', 'activeWorkbench', '.circuit-active-root:not(.circuit-network-root)'],
      ['connected', 'networkWorkbench', '.circuit-network-root'],
      ['simple', null, '[data-circuit-bench]'],
    ];
    for (const [id, flag, selector] of workbenches) {
      const button = action(id);
      button.focus();
      await act(async () => button.click());
      expect(host.querySelector(selector)).not.toBeNull();
      expect(document.activeElement).toBe(button);
      expect(guide().open).toBe(true);
      expect(button.getAttribute('aria-pressed')).toBe('true');
      expect(guide().querySelectorAll('button[aria-pressed="true"]')).toHaveLength(1);
      expect(button.parentNode.querySelector('small').textContent).toBe('Current workbench');
      for (const candidate of ['mixedWorkbench', 'activeWorkbench', 'networkWorkbench']) {
        expect(latest._circuit[candidate]).toBe(candidate === flag);
      }
      expect(latest._circuit.components).toBe(parts);
      expect(latest._circuit.undo).toBe(history);
      expect(latest._circuit.observations).toBe(notes);
      expect(latest._circuit.voltage).toBe(9);
      expect(latest._circuit.prediction).toBe('Keep my prediction');
      for (const key of ['_circuitMixed', '_circuitActive', '_circuitNetwork', 'circuit', 'unrelated']) expect(latest[key]).toBe(seed[key]);
    }
    expect(announce).toHaveBeenCalledTimes(4);
    expect(announce).toHaveBeenLastCalledWith('Opened Simple circuits. Your circuits are unchanged.');
  });

  it('keeps the existing mode buttons and guide selection in agreement', async () => {
    await render();
    const buttons = [...host.querySelectorAll('.circuit-workspace-switch > button')];
    expect(buttons.map(button => button.textContent)).toEqual(['Simple circuits', 'Mixed circuits', 'Active electronics', 'Connected circuits']);
    for (const index of [3, 1, 2, 0]) {
      await act(async () => buttons[index].click());
      expect(buttons[index].getAttribute('aria-pressed')).toBe('true');
      expect([...guide().querySelectorAll('button')][index].getAttribute('aria-pressed')).toBe('true');
      expect(guide().open).toBe(false);
    }
  });

  it('updates guide language without closing it, moving focus or replacing saved circuits', async () => {
    await render('EN');
    await openGuide();
    const details = guide();
    const button = action('connected');
    button.focus();
    const parts = latest._circuit.components;
    for (const locale of ['ES', 'FR', 'EN']) {
      await render(locale);
      expect(guide()).toBe(details);
      expect(details.open).toBe(true);
      expect(details.querySelector('summary').textContent).toBe(locale + ': Which workbench should I use?');
      expect(button.textContent).toBe(locale + ': Open Connected circuits');
      expect(document.getElementById(button.getAttribute('aria-describedby')).textContent).toBe(locale + ': Choose which nodes each part connects to. Explore bridges, rectifiers, and amplifiers.');
      expect(details.querySelector('small').textContent).toBe(locale + ': Current workbench');
      expect(document.activeElement).toBe(button);
      expect(latest._circuit.components).toBe(parts);
    }
    await act(async () => button.click());
    expect(announce).toHaveBeenLastCalledWith('EN: Opened EN: Connected circuits. Your circuits are unchanged.');
  });

  it('offers native keyboard controls and closes with Escape, returning focus to its summary', async () => {
    await render();
    await openGuide();
    const summary = guide().querySelector('summary');
    expect(summary.getAttribute('aria-controls')).toBe('circuit-workspace-guide-content');
    const button = action('mixed');
    expect(button.tagName).toBe('BUTTON');
    expect(button.tabIndex).toBe(0);
    expect(button.type).toBe('button');
    button.focus();
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    button.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(false);
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => button.dispatchEvent(escape));
    expect(escape.defaultPrevented).toBe(true);
    expect(guide().open).toBe(false);
    expect(document.activeElement).toBe(summary);
    expect(latest._circuit.components).toBe(seed._circuit.components);
    expect(latest._circuit.mixedWorkbench).toBeUndefined();
  });
});
