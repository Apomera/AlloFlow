import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
const roots = new Set();
let tool;
function fixture(seed = {}, delayed = false) {
  let state = { tab: 'flight3d', inquiry: { hypothesis: 'Keep my prediction' }, flightInvestigation: { evidence: 'Keep my evidence' }, ...seed }, refresh;
  const writes = [], pending = [];
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); roots.add(root);
  const commit = patch => { writes.push(patch); if (delayed) pending.push(patch); else { state = { ...state, ...patch }; refresh(n => n + 1); } };
  const ctx = makeCtx({ update: (_, key, value) => commit({ [key]: value }), updateMulti: (_, patch) => commit(patch) });
  function Component() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; return tool.render(ctx); }
  act(() => root.render(React.createElement(Component)));
  return { host, writes, get state() { return state; }, tab(id) { return host.querySelector('[data-migration-tab="' + id + '"]'); },
    panel() { return host.querySelector('[role="tabpanel"]'); },
    key(id, key, modifiers = {}) { const node = this.tab(id); node.focus(); let result; act(() => { result = node.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers })); }); return result; },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); },
    flush() { act(() => { for (const patch of pending.splice(0)) state = { ...state, ...patch }; refresh(n => n + 1); }); },
    unmount() { act(() => root.unmount()); roots.delete(root); host.remove(); }
  };
}
function handlers(node) { return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))]; }
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('matchMedia', query => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(620);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function(kind) {
    if (kind !== '2d') return null;
    if (!this._navigationContext) this._navigationContext = new Proxy({ canvas: this,
      measureText: text => ({ width: String(text).length * 6 }),
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} })
    }, { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
    return this._navigationContext;
  });
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => { act(() => { roots.forEach(root => root.unmount()); roots.clear(); }); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('Migration horizontal activity navigation', () => {
  it('associates each tab and panel only with its own mounted instance', () => {
    const first = fixture(), second = fixture();
    const ids = [];
    for (const ui of [first, second]) {
      const panel = ui.panel(), selected = ui.tab('flight3d');
      ids.push(panel.id, ...Array.from(ui.host.querySelectorAll('[role="tab"]'), node => node.id));
      expect(panel.getAttribute('aria-labelledby')).toBe(selected.id);
      expect(selected.tabIndex).toBe(0);
      for (const tab of ui.host.querySelectorAll('[role="tab"]')) {
        expect(document.getElementById(tab.getAttribute('aria-controls'))).toBe(panel);
        expect(tab.tabIndex).toBe(tab === selected ? 0 : -1);
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('moves immediately within the activated instance and wraps left/right', () => {
    const first = fixture(), second = fixture();
    const tabs = Array.from(second.host.querySelectorAll('[role="tab"]'));
    const last = tabs.at(-1).getAttribute('data-migration-tab');
    expect(second.key('flight3d', 'ArrowLeft')).toBe(false);
    expect(document.activeElement).toBe(second.tab(last)); expect(second.state.tab).toBe(last);
    second.key(last, 'ArrowRight'); expect(document.activeElement).toBe(second.tab('flight3d'));
    second.key('flight3d', 'End'); expect(document.activeElement).toBe(second.tab(last));
    second.key(last, 'Home'); expect(document.activeElement).toBe(second.tab('flight3d'));
    expect(first.state.tab).toBe('flight3d'); expect(first.writes).toEqual([]);
    expect(second.state.inquiry).toEqual({ hypothesis: 'Keep my prediction' });
    expect(second.state.flightInvestigation).toEqual({ evidence: 'Keep my evidence' });
    expect(second.writes.every(patch => Object.keys(patch).join() === 'tab')).toBe(true);
  });
  it.each(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'a'])('leaves %s available to the browser', key => {
    const ui = fixture(); expect(ui.key('flight3d', key)).toBe(true); expect(document.activeElement).toBe(ui.tab('flight3d')); expect(ui.writes).toEqual([]);
  });
  it.each(['ctrlKey', 'altKey', 'metaKey', 'shiftKey'])('ignores modified tab shortcuts with %s', modifier => {
    const ui = fixture(); expect(ui.key('flight3d', 'ArrowRight', { [modifier]: true })).toBe(true); expect(ui.writes).toEqual([]);
  });
  it('does not schedule a later focus return, including delayed host acknowledgement', async () => {
    const ui = fixture({}, true), other = document.createElement('button'); other.textContent = 'My next activity'; document.body.append(other);
    const next = ui.host.querySelectorAll('[role="tab"]')[1].getAttribute('data-migration-tab');
    ui.key('flight3d', 'ArrowRight'); expect(document.activeElement).toBe(ui.tab(next)); expect(ui.state.tab).toBe('flight3d');
    other.focus(); ui.flush(); await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    expect(document.activeElement).toBe(other); expect(ui.state.tab).toBe(next);
  });
  it('uses the focused tab position for repeated moves while host updates are delayed', () => {
    const ui = fixture({}, true), tabs = Array.from(ui.host.querySelectorAll('[role="tab"]'));
    ui.key('flight3d', 'ArrowRight'); const secondId = tabs[1].getAttribute('data-migration-tab');
    ui.key(secondId, 'ArrowRight'); expect(document.activeElement).toBe(tabs[2]);
    expect(ui.writes).toEqual([{ tab: secondId }, { tab: tabs[2].getAttribute('data-migration-tab') }]);
    ui.flush(); expect(ui.tab(ui.state.tab).getAttribute('aria-selected')).toBe('true');
  });
  it('rejects replaced, disconnected and other-instance actions', () => {
    const first = fixture(), second = fixture(), node = first.tab('flight3d'), retained = handlers(node);
    const event = target => ({ key: 'ArrowRight', target, currentTarget: target, preventDefault: vi.fn() });
    act(() => retained.onKeyDown(event(second.tab('flight3d')))); expect(first.writes).toEqual([]);
    first.set({ tab: 'world' }); const before = first.writes.length;
    act(() => { retained.onKeyDown(event(node)); retained.onClick({ currentTarget: node }); }); expect(first.writes).toHaveLength(before);
    const fresh = handlers(node); first.unmount();
    act(() => { fresh.onKeyDown(event(node)); fresh.onClick({ currentTarget: node }); }); expect(first.writes).toHaveLength(before);
  });
  it.each(['hidden', 'inert', 'disabled'])('does not activate an unexposed %s tab', condition => {
    const ui = fixture(), node = ui.tab('flight3d'), retained = handlers(node);
    if (condition === 'disabled') node.disabled = true; else node.setAttribute(condition, '');
    const event = { key: 'ArrowRight', target: node, currentTarget: node, preventDefault: vi.fn() };
    act(() => { retained.onKeyDown(event); retained.onClick(event); }); expect(ui.writes).toEqual([]); expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
