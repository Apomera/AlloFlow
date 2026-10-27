import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_organismid.js', 'desktop/web-app/public/stem_lab/stem_tool_organismid.js'];
const disposers = [];
let frames;

function mountTool(path, seed = {}) {
  resetStemLab();
  const config = loadTool(path, 'organismId');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let current, setCurrent;
  function Host() {
    const [data, setData] = React.useState({ organismId: { activeView: 'tree', selected: 'Amanita', treeFocus: 'Life', ...seed } });
    current = data.organismId;
    setCurrent = patch => setData(previous => ({ ...previous, organismId: { ...previous.organismId, ...patch } }));
    return config.render(makeCtx({ toolData: data, setToolData: setData }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { state: () => current, patch: patch => act(() => setCurrent(patch)),
    one: selector => host.querySelector(selector), all: selector => [...host.querySelectorAll(selector)] };
}
async function settleFocus() {
  await act(async () => {
    await Promise.resolve();
    vi.runOnlyPendingTimers();
    frames.splice(0).forEach(callback => callback(16));
    await Promise.resolve();
  });
}
async function activate(button) {
  expect(button).toBeTruthy();
  expect(button.tagName).toBe('BUTTON');
  expect(button.type).toBe('button');
  button.focus();
  act(() => button.click());
  await settleFocus();
}
function assertTreeFocus(view, name) {
  const item = view.one('#oid-node-' + name);
  expect(item).toBeTruthy();
  expect(document.activeElement).toBe(item);
  expect(item.getAttribute('role')).toBe('treeitem');
  expect(item.getAttribute('aria-selected')).toBe('true');
  expect(item.tabIndex).toBe(0);
  expect(view.all('[role="treeitem"][tabindex="0"]')).toHaveLength(1);
  expect(view.state().treeFocus).toBe(name);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  disposers.splice(0).forEach(dispose => dispose());
  await settleFocus();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each(paths)('Taxonomy detail return and lesson relationships: %s', path => {
  it('reveals only the selected branch ancestors and focuses that branch without selecting or crediting another node', async () => {
    const collapsed = { Life: true, Fungi: true, Basidiomycota: true, Agaricales: true, Animalia: true };
    const seen = { Amanita: true };
    const view = mountTool(path, { selected: 'Agaricales', collapsed, seen });
    expect(view.one('#oid-node-Agaricales')).toBeNull();
    const action = view.one('#oid-show-in-tree');
    expect(action.textContent).toBe('Go to this branch');
    await activate(action);
    assertTreeFocus(view, 'Agaricales');
    expect(view.state().selected).toBe('Agaricales');
    expect(view.state().seen).toEqual(seen);
    expect(view.state().collapsed).toEqual({ Agaricales: true, Animalia: true });
    expect(view.one('#oid-node-Agaricales').getAttribute('aria-expanded')).toBe('false');
    expect(collapsed).toEqual({ Life: true, Fungi: true, Basidiomycota: true, Agaricales: true, Animalia: true });
  });

  it('leaves focus alone during rendering and returns to an already visible selected branch only on request', async () => {
    const outside = document.createElement('button'); document.body.appendChild(outside); outside.focus();
    disposers.push(() => outside.remove());
    const view = mountTool(path, { collapsed: { Animalia: true }, seen: { Amanita: true } });
    await settleFocus();
    expect(document.activeElement).toBe(outside);
    view.patch({ observationNote: 'An unrelated retained draft.' });
    await settleFocus();
    expect(document.activeElement).toBe(outside);
    await activate(view.one('#oid-show-in-tree'));
    assertTreeFocus(view, 'Amanita');
    expect(view.state().collapsed).toEqual({ Animalia: true });
    expect(view.state().seen).toEqual({ Amanita: true });
    expect(view.state().observationNote).toBe('An unrelated retained draft.');
  });

  it('returns to the currently displayed related organism after its details replace the earlier selection', async () => {
    const view = mountTool(path, { collapsed: { Fungi: true }, seen: { Amanita: true } });
    const related = view.all('.oid-detail .oid-species-list button').find(button => button.textContent === 'Agaricus');
    await activate(related);
    expect(document.activeElement).toBe(view.one('#oid-detail-heading'));
    expect(view.state().selected).toBe('Agaricus');
    expect(view.one('#oid-node-Agaricus')).toBeNull();
    const seenAfterSelection = { ...view.state().seen };
    await activate(view.one('#oid-show-in-tree'));
    assertTreeFocus(view, 'Agaricus');
    expect(view.state().seen).toEqual(seenAfterSelection);
    expect(view.state().collapsed.Fungi).toBeUndefined();
  });

  it('connects every native lesson toggle to a stable labelled region and hides closed lesson contents', async () => {
    const view = mountTool(path, { activeView: 'learn', openSection: -1 });
    const buttons = view.all('.oid-exp-head');
    expect(buttons.length).toBeGreaterThan(1);
    const panels = buttons.map((button, index) => {
      expect(button.id).toBe('oid-lesson-toggle-' + index);
      expect(button.getAttribute('aria-controls')).toBe('oid-lesson-panel-' + index);
      expect(button.getAttribute('aria-expanded')).toBe('false');
      const panel = view.one('#' + button.getAttribute('aria-controls'));
      expect(panel).toBeTruthy();
      expect(panel.getAttribute('role')).toBe('region');
      expect(panel.getAttribute('aria-labelledby')).toBe(button.id);
      expect(panel.hidden).toBe(true);
      expect(panel.textContent).toBe('');
      return panel;
    });
    await activate(buttons[0]);
    expect(document.activeElement).toBe(buttons[0]);
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
    expect(view.one('#oid-lesson-panel-0')).toBe(panels[0]);
    expect(panels[0].hidden).toBe(false);
    expect(panels[0].textContent.length).toBeGreaterThan(30);
  });

  it('updates both lesson relationships when switching sections and keeps focus on the surviving toggle when closing', async () => {
    const view = mountTool(path, { activeView: 'learn', openSection: 0 });
    const first = view.one('#oid-lesson-toggle-0'), second = view.one('#oid-lesson-toggle-1');
    const firstPanel = view.one('#oid-lesson-panel-0'), secondPanel = view.one('#oid-lesson-panel-1');
    expect(firstPanel.hidden).toBe(false);
    await activate(second);
    expect(document.activeElement).toBe(second);
    expect(view.state().openSection).toBe(1);
    expect(first.getAttribute('aria-expanded')).toBe('false');
    expect(firstPanel.hidden).toBe(true);
    expect(firstPanel.textContent).toBe('');
    expect(second.getAttribute('aria-expanded')).toBe('true');
    expect(secondPanel.hidden).toBe(false);
    expect(secondPanel.textContent.length).toBeGreaterThan(30);
    await activate(second);
    expect(document.activeElement).toBe(second);
    expect(view.state().openSection).toBe(-1);
    expect(second.getAttribute('aria-expanded')).toBe('false');
    expect(secondPanel.hidden).toBe(true);
    expect(secondPanel.textContent).toBe('');
    expect(view.one('#oid-lesson-panel-0')).toBe(firstPanel);
    expect(view.one('#oid-lesson-panel-1')).toBe(secondPanel);
  });
});
