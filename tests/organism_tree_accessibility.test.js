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
  let current;
  function Host() {
    const [data, setData] = React.useState({ organismId: { activeView: 'tree', selected: 'Amanita', ...seed } });
    current = data.organismId;
    return config.render(makeCtx({ toolData: data, setToolData: setData, announceToSR: announce }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, config, announce, state: () => current,
    one: selector => host.querySelector(selector), all: selector => [...host.querySelectorAll(selector)],
    node: name => host.querySelector('#' + config.testHooks.treeDomId(name)) };
}
async function settleFocus() {
  await act(async () => {
    await Promise.resolve();
    vi.runOnlyPendingTimers();
    frames.splice(0).forEach(callback => callback(16));
    await Promise.resolve();
  });
}
async function press(target, key, options = {}) {
  target.focus();
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
  act(() => target.dispatchEvent(event));
  await settleFocus();
  return event;
}
async function click(target) {
  act(() => target.click());
  await settleFocus();
}
function expectRovingFocus(view, name) {
  const item = view.node(name);
  expect(document.activeElement).toBe(item);
  expect(item.tabIndex).toBe(0);
  expect(view.all('[role="treeitem"][tabindex="0"]')).toEqual([item]);
}
function checkPositions(view) {
  for (const group of view.all('[role="tree"], [role="group"]')) {
    const children = [...group.children].map(li => li.querySelector('.oid-node-row [role="treeitem"]')).filter(Boolean);
    children.forEach((item, index) => {
      expect(item.getAttribute('aria-posinset')).toBe(String(index + 1));
      expect(item.getAttribute('aria-setsize')).toBe(String(children.length));
    });
  }
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

describe.each(paths)('Taxonomy tree accessibility: %s', path => {
  it('connects every expanded parent to its child group and removes ownership when collapsed', async () => {
    const view = mountTool(path, { treeFocus: 'Fungi' });
    const expanded = view.all('[role="treeitem"][aria-expanded="true"]');
    expect(expanded.length).toBeGreaterThan(3);
    for (const item of expanded) {
      const group = view.one('#' + item.getAttribute('aria-owns'));
      expect(group).toBeTruthy();
      expect(group.getAttribute('role')).toBe('group');
      expect(group.parentElement).toBe(item.closest('.oid-tree-item'));
      const firstChild = group.querySelector('[role="treeitem"]');
      expect(Number(firstChild.getAttribute('aria-level'))).toBe(Number(item.getAttribute('aria-level')) + 1);
    }
    const ownedId = view.node('Fungi').getAttribute('aria-owns');
    await press(view.node('Fungi'), 'ArrowLeft');
    expect(view.node('Fungi').getAttribute('aria-expanded')).toBe('false');
    expect(view.node('Fungi').hasAttribute('aria-owns')).toBe(false);
    expect(view.one('#' + ownedId)).toBeNull();
    expect(view.node('Amanita')).toBeNull();
  });

  it('exposes sibling positions and set sizes independently of the number of expanded descendants', async () => {
    const view = mountTool(path, { treeFocus: 'Fungi' });
    checkPositions(view);
    expect(view.node('Life').getAttribute('aria-posinset')).toBe('1');
    expect(view.node('Life').getAttribute('aria-setsize')).toBe('1');
    const before = view.node('Animalia').getAttribute('aria-setsize');
    await press(view.node('Fungi'), 'ArrowLeft');
    checkPositions(view);
    expect(view.node('Animalia').getAttribute('aria-setsize')).toBe(before);
  });

  it('names each treeitem using only its own name, rank and hazard rather than its owned descendants', () => {
    const view = mountTool(path);
    for (const item of view.all('[role="treeitem"]')) {
      const refs = (item.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
      expect(refs.length).toBeGreaterThanOrEqual(2);
      const labels = refs.map(id => view.one('#' + id));
      for (const label of labels) {
        expect(label).toBeTruthy();
        expect(item.contains(label)).toBe(true);
        expect(label.textContent.trim()).toBeTruthy();
      }
      expect(labels[0].textContent).toBe(item.querySelector('.oid-node-name').textContent);
      expect(labels[1].textContent).toBe(item.querySelector('.oid-node-rank').textContent);
      const hazard = item.querySelector('.sr-only');
      expect(refs.length).toBe(hazard ? 3 : 2);
      if (hazard) expect(labels[2]).toBe(hazard);
    }
  });

  it('uses nonfocusable hidden carets and restores focus to the parent when a focused descendant is collapsed', async () => {
    const view = mountTool(path, { treeFocus: 'Amanita', seen: { Amanita: true } });
    for (const caret of view.all('.oid-caret:not(.oid-caret-empty)')) {
      expect(caret.tagName).toBe('SPAN');
      expect(caret.hasAttribute('tabindex')).toBe(false);
      expect(caret.getAttribute('aria-hidden')).toBe('true');
    }
    const selected = view.node('Amanita'); selected.focus();
    await click(view.node('Fungi').closest('.oid-node-row').querySelector('.oid-caret'));
    expectRovingFocus(view, 'Fungi');
    expect(selected.isConnected).toBe(false);
    expect(view.state().selected).toBe('Amanita');
    expect(view.state().seen).toEqual({ Amanita: true });
    expect(view.announce).not.toHaveBeenCalled();
  });

  it('expands with a caret without selecting or crediting the parent and enters its child with Right', async () => {
    const view = mountTool(path, { treeFocus: 'Animalia', collapsed: { Fungi: true }, seen: { Amanita: true } });
    await click(view.node('Fungi').closest('.oid-node-row').querySelector('.oid-caret'));
    expectRovingFocus(view, 'Fungi');
    expect(view.node('Fungi').getAttribute('aria-expanded')).toBe('true');
    const group = view.one('#' + view.node('Fungi').getAttribute('aria-owns'));
    const childId = group.querySelector('[role="treeitem"]').id;
    await press(view.node('Fungi'), 'ArrowRight');
    expect(document.activeElement.id).toBe(childId);
    expect(view.state().selected).toBe('Amanita');
    expect(view.state().seen).toEqual({ Amanita: true });
  });

  it('keeps collapse and re-expansion on the parent, then supports entering and returning from children', async () => {
    const view = mountTool(path, { treeFocus: 'Fungi' });
    await press(view.node('Fungi'), 'ArrowLeft');
    expectRovingFocus(view, 'Fungi');
    await press(view.node('Fungi'), 'ArrowRight');
    expectRovingFocus(view, 'Fungi');
    expect(view.node('Fungi').getAttribute('aria-expanded')).toBe('true');
    await press(view.node('Fungi'), 'ArrowRight');
    const child = document.activeElement;
    expect(child).not.toBe(view.node('Fungi'));
    if (child.getAttribute('aria-expanded') === 'true') await press(child, 'ArrowLeft');
    await press(child, 'ArrowLeft');
    expectRovingFocus(view, 'Fungi');
    expect(view.state().selected).toBe('Amanita');
  });

  it('moves Up, Down, Home and End through visible rows without changing selection or credit', async () => {
    const view = mountTool(path, { treeFocus: 'Life', seen: { Amanita: true } });
    const names = view.config.testHooks.visibleTreeNames({});
    await press(view.node('Life'), 'ArrowDown'); expectRovingFocus(view, names[1]);
    await press(document.activeElement, 'ArrowUp'); expectRovingFocus(view, 'Life');
    await press(document.activeElement, 'End'); expectRovingFocus(view, names[names.length - 1]);
    await press(document.activeElement, 'Home'); expectRovingFocus(view, 'Life');
    expect(view.state().selected).toBe('Amanita');
    expect(view.state().seen).toEqual({ Amanita: true });
  });

  it('leaves modified and composing tree keys untouched', async () => {
    const view = mountTool(path, { treeFocus: 'Fungi' }), item = view.node('Fungi');
    for (const [key, options] of [
      ['ArrowDown', { ctrlKey: true }], ['ArrowLeft', { altKey: true }],
      ['Home', { metaKey: true }], ['End', { shiftKey: true }],
      ['ArrowRight', { isComposing: true }]
    ]) {
      const event = await press(item, key, options);
      expect(event.defaultPrevented).toBe(false);
      expectRovingFocus(view, 'Fungi');
      expect(view.node('Fungi').getAttribute('aria-expanded')).toBe('true');
      expect(view.state().selected).toBe('Amanita');
    }
  });

  it('preserves native row activation as the explicit selection and credit action', async () => {
    const view = mountTool(path, { treeFocus: 'Fungi', seen: { Amanita: true } }), item = view.node('Fungi');
    expect(item.tagName).toBe('BUTTON');
    item.focus();
    await click(item);
    expectRovingFocus(view, 'Fungi');
    expect(view.state().selected).toBe('Fungi');
    expect(view.state().seen).toEqual({ Amanita: true, Fungi: true });
    expect(item.getAttribute('aria-selected')).toBe('true');
  });
});
