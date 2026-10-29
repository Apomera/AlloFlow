import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_geometryworld_builder.js', 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let mounted;
function mount() {
  vi.useFakeTimers(); window.THREE = undefined;
  const lab = resetStemLab();
  lab.registerTool('geometryWorld', { aliases: [], render: () => React.createElement('main', { id: 'geoworld-fs-workspace' },
    React.createElement('div', { id: 'geoworld-fs-wrap', tabIndex: 0 }),
    React.createElement('button', { id: 'background-action' }, 'Background action'),
    React.createElement('div', { id: 'allo-live-geometryworld', role: 'status' })) });
  const style = document.createElement('style'); style.id = 'allo-geometryworld-builder-css'; document.head.appendChild(style);
  new Function(source)();
  const initial = { userData: { gridPos: { x: 0, y: 1, z: 0 }, blockType: 'stone', shape: 'cube', rotation: 0, _measurementLayer: 'student' } };
  let patch, current;
  const navigate = vi.fn(), toast = vi.fn();
  const engine = window.__geoWorldEngine = {
    blocks: { '0,1,0': initial }, _currentLesson: { sandbox: true }, _showcase: { look: 'studio' },
    _builderSelection: { blocks: [initial.userData.gridPos] }, _undoStack: [{ type: 'place' }], _redoStack: [], blocksPlaced: 1,
    getBlocksArr() { return Object.values(this.blocks); },
    measureStructure() { return { blocks: [initial.userData.gridPos], count: 1, L: 1, W: 1, H: 1, isComplete: true, totalVolume: 1 }; },
    rotateShowcase: vi.fn(), endShowcase: vi.fn(options => {
      engine._showcase = null; patch({ showcaseActive: false });
      // Match the real engine's delayed default focus restoration. Returning
      // to a form must opt out, or the canvas steals focus after 30 ms.
      if (!options || options.restoreFocus !== false) setTimeout(() => document.getElementById('geoworld-fs-wrap')?.focus(), 30);
    }),
    logEvent: vi.fn()
  };
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
  function Host() {
    const [toolData, setToolData] = React.useState({ geometryWorld: { activeLesson: 'builderSandbox', worldActive: true,
      showcaseActive: true, showcaseLook: 'studio', sandboxDockCollapsed: false, builderPrintContext: { unitMm: 12.5 } } });
    current = toolData.geometryWorld; patch = p => setToolData(old => ({ ...old, geometryWorld: { ...old.geometryWorld, ...p } }));
    return lab._registry.geometryWorld.render(makeCtx({ toolData, setToolData,
      updateMulti: (key, p) => setToolData(old => ({ ...old, [key]: { ...old[key], ...p } })), setStemLabTool: navigate, addToast: toast, announceToSR: vi.fn() }));
  }
  React.act(() => root.render(React.createElement(Host))); mounted = { root, host, style };
  const button = text => [...host.querySelectorAll('button')].find(node => node.textContent === text);
  const click = node => { expect(node).toBeTruthy(); React.act(() => node.click()); };
  const key = (node, value, shiftKey = false) => {
    const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, shiftKey });
    React.act(() => node.dispatchEvent(event)); return event;
  };
  return { host, engine, navigate, toast, button, click, key, state: () => current,
    open: () => click(button('Use & export')),
    patch: p => React.act(() => patch(p)),
    draft(value) { const input = host.querySelector('#gwe-print-scale-value'); expect(input).toBeTruthy(); React.act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
    }); }
  };
}
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.host.remove(); mounted.style.remove(); mounted = null; }
  delete window.__geoWorldEngine; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Geometry World export accessibility', () => {
  it('exposes one named modal and makes the surrounding workspace inert until close', () => {
    const app = mount(); app.open();
    const panel = app.host.querySelector('#gwe-showcase-files');
    expect(panel.getAttribute('role')).toBe('dialog'); expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(app.host.querySelector('#' + panel.getAttribute('aria-labelledby')).textContent).toBe('Use your creation');
    expect(app.host.querySelectorAll('[role=dialog][aria-modal=true]')).toHaveLength(1);
    expect(app.host.querySelector('#background-action').hasAttribute('inert')).toBe(true);
    expect(app.host.querySelector('#background-action').getAttribute('aria-hidden')).toBe('true');
    expect(app.host.querySelector('#allo-live-geometryworld').hasAttribute('inert')).toBe(false);
    expect(app.host.querySelector('input[type=file]').hasAttribute('inert')).toBe(false);
    app.key(panel, 'Escape');
    expect(app.host.querySelector('#background-action').hasAttribute('inert')).toBe(false);
    expect(app.host.querySelector('.gwe-showcase').getAttribute('role')).toBe('dialog');
    expect(document.activeElement).toBe(app.button('Use & export'));
  });

  it('contains forward and backward focus while skipping hidden, inert and disabled controls', () => {
    const app = mount(); app.open(); const panel = app.host.querySelector('#gwe-showcase-files');
    const first = panel.querySelector('button'), last = [...panel.querySelectorAll('button')].at(-1);
    const inaccessible = document.createElement('div');
    inaccessible.innerHTML = '<button hidden>Hidden</button><div inert><button>Inert</button></div><div style="display:none"><button>Display none</button></div><button disabled>Disabled</button><button tabindex="-1">Programmatic only</button>';
    panel.appendChild(inaccessible);
    expect(app.key(panel, 'Tab').defaultPrevented).toBe(true); expect(document.activeElement).toBe(first);
    expect(app.key(first, 'Tab', true).defaultPrevented).toBe(true); expect(document.activeElement).toBe(last);
    expect(app.key(last, 'Tab').defaultPrevented).toBe(true); expect(document.activeElement).toBe(first);
    app.key(panel, 'ArrowRight'); expect(app.engine.rotateShowcase).not.toHaveBeenCalled();
  });

  it('keeps focus in the dialog if every action becomes unavailable', () => {
    const app = mount(); app.open(); const panel = app.host.querySelector('#gwe-showcase-files');
    panel.querySelectorAll('button').forEach(button => { button.disabled = true; });
    expect(app.key(panel, 'Tab').defaultPrevented).toBe(true); expect(document.activeElement).toBe(panel);
    expect(app.key(panel, 'Tab', true).defaultPrevented).toBe(true); expect(document.activeElement).toBe(panel);
  });

  it('shows the detailed download failure locally without losing work or leaving Showcase', () => {
    const app = mount(); app.open(); const blocks = app.engine.blocks, history = app.engine._undoStack;
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => { throw new Error('The download could not be created. Try again.'); }), revokeObjectURL: vi.fn() });
    app.click(app.button('Download editable JSON'));
    const alert = app.host.querySelector('#gwe-showcase-files .gwe-file-status[role=alert]');
    expect(alert.textContent).toBe('The download could not be created. Try again.');
    expect(alert.dataset.state).toBe('error'); expect(app.toast).toHaveBeenCalledWith(alert.textContent, 'error');
    expect(app.engine.blocks).toBe(blocks); expect(app.engine._undoStack).toBe(history);
    expect(app.engine.endShowcase).not.toHaveBeenCalled(); expect(app.engine.logEvent).not.toHaveBeenCalled();
  });

  it('reports success and clears a previous download error when retrying', () => {
    const app = mount(); app.open();
    const create = vi.fn().mockImplementationOnce(() => { throw new Error('Download unavailable.'); }).mockReturnValue('blob:export');
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    app.click(app.button('Download editable JSON')); app.click(app.button('Download editable JSON'));
    const status = app.host.querySelector('#gwe-showcase-files .gwe-file-status');
    expect(status.getAttribute('role')).toBe('status'); expect(status.dataset.state).toBe('success');
    expect(status.textContent).toContain('Editable creation downloaded');
  });

  it.each(['Download STL', 'Open in Print Lab'])('protects an unapplied size edit before %s and offers a focused return to edit it', action => {
    const app = mount(); app.draft('30'); app.open();
    expect(app.host.querySelector('.gwe-file-print-dimensions').textContent).toContain('12.5 × 12.5 × 12.5 mm');
    const exportAction = [...app.host.querySelectorAll('#gwe-showcase-files button')].find(button => button.textContent === action);
    app.click(exportAction); React.act(() => vi.advanceTimersByTime(1));
    expect(app.navigate).not.toHaveBeenCalled(); expect(app.engine.logEvent).not.toHaveBeenCalled();
    expect(app.host.querySelector('#gwe-showcase-files [role=alert]').textContent).toContain('Apply or discard your size edit');
    expect(document.activeElement).toBe(app.button('Review size edit'));
    app.click(app.button('Review size edit')); React.act(() => vi.advanceTimersByTime(60));
    const input = app.host.querySelector('#gwe-print-scale-value');
    expect(input.value).toBe('30'); expect(document.activeElement).toBe(input); expect(input.closest('details').open).toBe(true);
    expect(app.engine.endShowcase).toHaveBeenCalledWith({ restoreFocus: false });
    expect(app.state().builderPrintContext.unitMm).toBe(12.5); expect(app.state().sandboxDockCollapsed).toBe(false);
  });
});
