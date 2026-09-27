import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const hosts = ['stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab/stem_lab_module.js'];

function snapshotLoader(file, snapshot, setData, open = vi.fn()) {
  const source = readFileSync(file, 'utf8');
  const marker = source.indexOf('"aria-label": "Open " + snap.label + " snapshot"');
  const start = source.indexOf('onClick: () => {', marker) + 'onClick: '.length;
  const end = source.indexOf('\n            },', start) + '\n            }'.length;
  if (marker < 0 || end <= start) throw new Error('Snapshot Load handler not found');
  return new Function('snap', 'setStemLabTab', '_openStemTool', 'setLabToolData', 'return (' + source.slice(start, end) + ');')(
    snapshot, vi.fn(), open, setData,
  );
}

describe('Circuit snapshots through the shared host', () => {
  let host, root, config;
  beforeEach(() => {
    const canvas = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 0 }) }, {
      get: (target, key) => target[key] || (() => {}),
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvas);
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

  it.each(hosts)('saves, edits, and restores the actual Simple bench using %s', async file => {
    let current, update, snapshots;
    const network = { components: [{ id: 9, type: 'resistor', value: 200, a: 'A', b: '0' }] };
    function Harness() {
      const [data, setData] = React.useState({
        _circuit: { pauseMotion: true, voltage: 9, mode: 'series', components: [{ id: 1, type: 'resistor', value: 470 }], prediction: 'Current will rise', observations: [{ explanation: 'Saved evidence', delta: 0, before: { mode: 'series', voltage: 9, components: [] }, after: { mode: 'series', voltage: 9, components: [] } }] },
        _circuitNetwork: network,
        circuit: { workspaceTab: 'build', expSection: 'ohmInquiry' },
        unrelated: { keep: true },
      });
      const [saved, setSaved] = React.useState([]);
      current = data; update = setData; snapshots = saved;
      return config.render(makeCtx({ toolData: data, setToolData: setData, setToolSnapshots: setSaved }));
    }
    await act(async () => root.render(React.createElement(Harness)));
    await act(async () => host.querySelector('button[aria-label="Snapshot"]').click());
    expect(snapshots).toHaveLength(1);
    const snapshot = snapshots[0];
    expect(snapshot.data.voltage).toBe(9);
    expect(snapshot.data.components).not.toBe(current._circuit.components);
    expect(snapshot.data.observations).not.toBe(current._circuit.observations);
    await act(async () => update(prev => ({ ...prev, _circuit: { ...prev._circuit, voltage: 24, networkWorkbench: true }, circuit: { ...prev.circuit, workspaceTab: 'reference' } })));
    const open = vi.fn();
    await act(async () => snapshotLoader(file, snapshot, update, open)());
    expect(open).toHaveBeenCalledWith('circuit', snapshot.label);
    expect(current._circuit).toMatchObject({ voltage: 9, mode: 'series', networkWorkbench: false, activeWorkbench: false, mixedWorkbench: false, prediction: 'Current will rise' });
    expect(current.circuit).toEqual({ workspaceTab: 'build', expSection: 'ohmInquiry' });
    expect(current._circuitNetwork).toBe(network);
    expect(current.unrelated).toEqual({ keep: true });
    expect(host.querySelector('input[type="range"][aria-label="Voltage slider"]').value).toBe('9');
    expect(current._circuit.components).not.toBe(snapshot.data.components);
    current._circuit.components[0].value = 100;
    current._circuit.observations[0].explanation = 'Changed later';
    expect(snapshot.data.components[0].value).toBe(470);
    expect(snapshot.data.observations[0].explanation).toBe('Saved evidence');
    await act(async () => snapshotLoader(file, snapshot, update)());
    expect(current._circuit.components[0].value).toBe(470);
    expect(current._circuit.observations[0].explanation).toBe('Saved evidence');
  });

  it('restores legacy zero-volt snapshots without reviving pending actions or requests', () => {
    let data = { _circuit: { voltage: 24, networkWorkbench: true, unsaved: 'old state' }, _circuitMixed: { voltage: 12 } };
    const snapshot = { tool: 'circuit', label: 'Legacy', data: { voltage: 0, mode: 'parallel', components: [], tick: 80, confirmAction: { type: 'clear' }, _aiLoading: true, _aiResponse: 'stale', networkWorkbench: true } };
    const original = JSON.stringify(snapshot);
    snapshotLoader(hosts[0], snapshot, fn => { data = fn(data); })();
    expect(data._circuit).toMatchObject({ voltage: 0, mode: 'parallel', components: [], tick: 0, confirmAction: null, _aiLoading: false, _aiResponse: '', networkWorkbench: false });
    expect(data._circuit.unsaved).toBeUndefined();
    expect(data._circuitMixed).toEqual({ voltage: 12 });
    expect(JSON.stringify(snapshot)).toBe(original);
  });
});
