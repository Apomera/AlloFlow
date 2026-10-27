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
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), announce = vi.fn();
  let current, setCurrent;
  function Host() {
    const [data, setData] = React.useState({ organismId: { activeView: 'tree', selected: 'Amanita', ...seed } });
    current = data.organismId;
    setCurrent = patch => setData(previous => ({ ...previous, organismId: { ...previous.organismId, ...patch } }));
    return config.render(makeCtx({ toolData: data, setToolData: setData, announceToSR: announce }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, announce, state: () => current, patch: patch => act(() => setCurrent(patch)),
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
  button.focus();
  act(() => button.click());
  await settleFocus();
}
async function press(target, key, options = {}) {
  target.focus();
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
  act(() => target.dispatchEvent(event));
  await settleFocus();
  return event;
}
function assertDetailsFocused(view, name) {
  const heading = view.one('#oid-detail-heading');
  expect(heading).toBeTruthy();
  expect(heading.tagName).toBe('H2');
  expect(heading.tabIndex).toBe(-1);
  expect(heading.hasAttribute('data-oid-focus')).toBe(true);
  expect(heading.textContent).toBe(name);
  expect(document.activeElement).toBe(heading);
  expect(view.state().selected).toBe(name);
  expect(view.state().seen[name]).toBe(true);
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

describe.each(paths)('Taxonomy navigation accessibility: %s', path => {
  it('places focus on the chosen details after a Hazard Tiers chip changes views', async () => {
    const view = mountTool(path, { activeView: 'groups' });
    const chip = view.all('.oid-chip').find(button => button.querySelector('span').textContent === 'Agaricus');
    await activate(chip);
    expect(view.state().activeView).toBe('tree');
    expect(chip.isConnected).toBe(false);
    assertDetailsFocused(view, 'Agaricus');
  });

  it('recovers focus after the selected Confused with button disappears', async () => {
    const view = mountTool(path);
    const sibling = view.all('.oid-detail button').find(button => button.textContent === 'Agaricus');
    await activate(sibling);
    expect(sibling.isConnected).toBe(false);
    assertDetailsFocused(view, 'Agaricus');
  });

  it('recovers focus when a lineage button becomes the selected ancestor', async () => {
    const view = mountTool(path);
    const parent = view.all('.oid-lineage button').find(button => button.textContent === 'Fungi');
    await activate(parent);
    expect(parent.isConnected).toBe(false);
    assertDetailsFocused(view, 'Fungi');
  });

  it('shows the requested details even when the tree branch was collapsed', async () => {
    const view = mountTool(path, { activeView: 'groups', collapsed: { Fungi: true } });
    await activate(view.all('.oid-chip').find(button => button.querySelector('span').textContent === 'Agaricus'));
    assertDetailsFocused(view, 'Agaricus');
    expect(view.state().collapsed.Fungi).toBe(true);
  });

  it('keeps focus on a tree row during ordinary selection and arrow-key exploration', async () => {
    const view = mountTool(path);
    const node = view.one('#oid-node-Amanita');
    await activate(node);
    expect(document.activeElement).toBe(node);
    const down = await press(node, 'ArrowDown');
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement.getAttribute('role')).toBe('treeitem');
    expect(document.activeElement).not.toBe(node);
    expect(view.state().selected).toBe('Amanita');
  });

  it('does not move focus to details on an incidental render', async () => {
    const view = mountTool(path);
    const tab = view.one('#oid-tab-tree'); tab.focus();
    view.patch({ seen: { Amanita: true } });
    await settleFocus();
    expect(document.activeElement).toBe(tab);
  });

  it('connects the active tab to a focusable, named panel including passive content', async () => {
    const view = mountTool(path, { activeView: 'lookalikes' });
    const tab = view.one('[role="tab"][aria-selected="true"]');
    const panel = view.one('#' + tab.getAttribute('aria-controls'));
    expect(panel).toBeTruthy();
    expect(panel.getAttribute('role')).toBe('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
    expect(panel.tabIndex).toBe(0);
    expect(panel.hasAttribute('data-oid-focus')).toBe(true);
    panel.focus();
    expect(document.activeElement).toBe(panel);
    expect(view.state().activeView).toBe('lookalikes');
  });

  it('moves the horizontal tabs with Left/Right and Home/End while keeping one tab stop', async () => {
    const view = mountTool(path);
    for (const [key, id] of [['ArrowRight', 'groups'], ['End', 'photo'], ['ArrowRight', 'tree'], ['ArrowLeft', 'photo'], ['Home', 'tree']]) {
      const event = await press(view.one('[role="tab"][aria-selected="true"]'), key);
      expect(event.defaultPrevented).toBe(true);
      const selected = view.one('#oid-tab-' + id);
      expect(document.activeElement).toBe(selected);
      expect(selected.getAttribute('aria-selected')).toBe('true');
      expect(view.all('[role="tab"][tabindex="0"]')).toHaveLength(1);
      const panel = view.one('#' + selected.getAttribute('aria-controls'));
      expect(panel.getAttribute('aria-labelledby')).toBe(selected.id);
    }
  });

  it('leaves vertical arrow scrolling and modified or composing keys to the browser', async () => {
    const view = mountTool(path);
    const tab = view.one('#oid-tab-tree');
    for (const [key, options] of [
      ['ArrowDown', {}], ['ArrowUp', {}], ['ArrowRight', { ctrlKey: true }],
      ['ArrowLeft', { altKey: true }], ['End', { metaKey: true }],
      ['Home', { shiftKey: true }], ['ArrowRight', { isComposing: true }]
    ]) {
      const event = await press(tab, key, options);
      expect(event.defaultPrevented, key + JSON.stringify(options)).toBe(false);
      expect(view.state().activeView).toBe('tree');
      expect(document.activeElement).toBe(tab);
    }
  });
});
