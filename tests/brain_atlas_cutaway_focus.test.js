import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
let root, host;

beforeEach(() => {
  resetStemLab();
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});

afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function setup(extra = {}) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: {
    view: 'medial', atlasDisplayMode: '3d', brain3DToolsOpen: true,
    brain3DSliceAxis: 'sagittal', brain3DSlicePosition: 57, ...extra
  } });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const render = async () => {
    const nodes = flatten(tool.render(makeCtx({}, store)));
    const find = attribute => nodes.find(node => node.props?.[attribute] === 'true');
    // Mount the actual controls and panel with React reconciliation, omitting WebGL.
    await React.act(async () => root.render(React.createElement('div', { className: 'brainatlas-canvas-shell' },
      find('data-brainatlas-3d-toolbox'), find('data-brainatlas-3d-slice'),
      React.createElement('button', { type: 'button', 'data-other-control': 'true' }, 'Another control')
    )));
  };
  const flush = async () => { await React.act(async () => vi.runOnlyPendingTimers()); };
  const close = async ({ focus = true, defer = false } = {}) => {
    const button = host.querySelector('[data-brainatlas-3d-slice-close]');
    if (focus) button.focus();
    await React.act(async () => button.click());
    await render();
    if (!defer) await flush();
  };
  await render();
  return { store, render, flush, close };
}

describe('Brain Atlas cutaway keyboard continuity', () => {
  it('returns Close to the stable Cutaway Off control after the actual panel unmounts', async () => {
    const s = await setup();
    await s.close();
    expect(host.querySelector('[data-brainatlas-3d-slice]')).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('[data-brainatlas-3d-slice-axis="off"]'));
    expect(s.store.toolData.brainAtlas).toMatchObject({ brain3DSliceAxis: 'off', brain3DSlicePosition: 57 });
  });

  it('returns to the toolbox summary when its Off control is collapsed', async () => {
    const s = await setup({ brain3DToolsOpen: false });
    await s.close();
    const toolbox = host.querySelector('[data-brainatlas-3d-toolbox]');
    expect(toolbox.open).toBe(false);
    expect(document.activeElement).toBe(toolbox.querySelector('summary'));
  });

  it('preserves a later focus choice while Close finishes updating', async () => {
    const s = await setup();
    await s.close({ defer: true });
    const other = host.querySelector('[data-other-control]');
    other.focus();
    await s.flush();
    expect(document.activeElement).toBe(other);
  });

  it('does not take focus when Close did not own it', async () => {
    const s = await setup();
    const other = host.querySelector('[data-other-control]');
    other.focus();
    await s.close({ focus: false });
    expect(document.activeElement).toBe(other);
  });

  it.each(['shell', 'target'])('does not recover focus into a disappeared %s', async missing => {
    const s = await setup();
    await s.close({ defer: true });
    if (missing === 'shell') host.remove();
    else host.querySelector('[data-brainatlas-3d-slice-axis="off"]').remove();
    await s.flush();
    expect(document.activeElement).toBe(document.body);
  });

  it('keeps keyboard-triggered map clicks and arrow adjustment on the focused map', async () => {
    const s = await setup();
    const map = host.querySelector('.brainatlas-3d-slice-map');
    map.focus();
    vi.spyOn(map.querySelector('svg'), 'getBoundingClientRect').mockReturnValue({ left: 40, top: 300, width: 200, height: 112 });
    await React.act(async () => map.click());
    await s.render();
    expect(s.store.toolData.brainAtlas.brain3DSlicePosition).toBe(57);
    expect(document.activeElement).toBe(map);
    await React.act(async () => map.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })));
    await s.render();
    expect(s.store.toolData.brainAtlas.brain3DSlicePosition).toBe(62);
    expect(document.activeElement).toBe(map);
  });
});
