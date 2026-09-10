import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync('stem_lab/stem_tool_geometryworld_builder.js', 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let mounted;

function mesh(layer = 'student', type = 'stone', x = 0) {
  return { userData: { gridPos: { x, y: layer === 'student' ? 1 : 0, z: 0 },
    _measurementLayer: layer, _lessonBlock: layer !== 'student', blockType: type, shape: 'cube', rotation: 0, volume: 1 } };
}

function mountGuidance({ touch = false, blocks = [mesh('ground', 'grass')], data = {}, engine: overrides = {} } = {}) {
  vi.useFakeTimers();
  const interval = vi.spyOn(globalThis, 'setInterval');
  const lab = resetStemLab();
  const baseRender = vi.fn(ctx => React.createElement('main', { id: 'geoworld-fs-workspace', 'data-touch-active': ctx.toolData.geometryWorld.touchActive ? 'true' : 'false' },
    React.createElement('div', { id: 'geoworld-fs-wrap', tabIndex: 0 })));
  lab.registerTool('geometryWorld', { aliases: [], render: baseRender });
  if (!document.getElementById('allo-geometryworld-builder-css')) {
    const style = document.createElement('style'); style.id = 'allo-geometryworld-builder-css'; document.head.appendChild(style);
  }
  new Function(source)();
  let cached = blocks;
  const engine = window.__geoWorldEngine = Object.assign({
    blocks: {}, _builderSelection: null, _currentLesson: { sandbox: true }, blocksPlaced: 50,
    _undoStack: [{ type: 'place' }], _redoStack: [], getBlocksArr: vi.fn(() => cached), loadLesson: vi.fn(), logEvent: vi.fn()
  }, overrides);
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); const addToast = vi.fn(); const announceToSR = vi.fn();
  let current, update;
  function Host() {
    const [toolData, setToolData] = React.useState(() => ({ geometryWorld: { activeLesson: 'builderSandbox', worldActive: true,
      builderPanel: 'build', touchActive: touch, sandboxDockCollapsed: false, ...data } }));
    current = toolData.geometryWorld;
    update = patch => setToolData(old => ({ ...old, geometryWorld: { ...old.geometryWorld, ...patch } }));
    return lab._registry.geometryWorld.render(makeCtx({ toolData, setToolData, addToast, announceToSR,
      update: (key, value) => setToolData(old => ({ ...old, [key]: value })),
      updateMulti: (key, patch) => setToolData(old => ({ ...old, [key]: { ...old[key], ...patch } }))
    }));
  }
  act(() => root.render(React.createElement(Host)));
  mounted = { root, host };
  return { host, engine, baseRender, interval, addToast, announceToSR, state: () => current,
    guide: () => host.querySelector('[data-gwe-build-guidance]'),
    setBlocks(next) { cached = next; },
    poll() { act(() => vi.advanceTimersByTime(250)); },
    patch(patch) { act(() => update(patch)); },
    click(selector) { const button = host.querySelector(selector); expect(button, selector).toBeTruthy(); act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true }))); }
  };
}

afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null; }
  delete window.__geoWorldEngine; vi.restoreAllMocks(); vi.useRealTimers();
});

describe('Geometry World first-block guidance', () => {
  it('shows keyboard guidance for an empty world even when historical placements are nonzero', () => {
    const app = mountGuidance();
    expect(app.engine.blocksPlaced).toBe(50);
    expect(app.guide().dataset.gweBuildGuidance).toBe('empty');
    expect(app.guide().textContent).toBe('Aim at the ground and press B to add your first block. Then choose Select build to inspect your creation.');
  });

  it('excludes actual lesson and ground blocks without assuming a rectangular floor size', () => {
    const app = mountGuidance({ blocks: [mesh('ground', 'grass'), mesh('ground', 'stone'), mesh('lesson', 'brick')],
      engine: { _currentLesson: { sandbox: true, ground: { xMin: -40, xMax: 40, zMin: -40, zMax: 40 } } } });
    expect(app.guide().dataset.gweBuildGuidance).toBe('empty');
  });

  it('uses Place only while the core actually exposes touch controls', () => {
    const app = mountGuidance({ touch: true });
    expect(app.guide().textContent).toContain('tap Place'); expect(app.guide().textContent).not.toContain('press B');
    app.patch({ touchActive: false, touchMode: true });
    expect(app.guide().textContent).toContain('press B'); expect(app.guide().textContent).not.toContain('tap Place');
  });

  it('uses selection guidance for an imported student block even with no placement history', () => {
    const app = mountGuidance({ blocks: [mesh('ground', 'grass'), mesh()], engine: { blocksPlaced: 0, _undoStack: [], _redoStack: [] } });
    expect(app.guide().dataset.gweBuildGuidance).toBe('select');
    expect(app.guide().textContent).toBe('Aim at a block you placed, then choose Select build to inspect your creation.');
  });

  it('returns to first-block guidance after undo or clear leaves only the floor, and recovers after redo', () => {
    const floor = mesh('ground', 'grass'), student = mesh();
    const app = mountGuidance({ blocks: [floor] });
    app.setBlocks([floor, student]); app.poll(); expect(app.guide().dataset.gweBuildGuidance).toBe('select');
    // The real core supplies this cached-array transition after Undo/Break/Clear;
    // cumulative blocksPlaced deliberately stays50 throughout the UI regression.
    app.setBlocks([floor]); app.poll(); expect(app.guide().dataset.gweBuildGuidance).toBe('empty');
    app.setBlocks([floor, student]); app.poll(); expect(app.guide().dataset.gweBuildGuidance).toBe('select');
    app.setBlocks([]); app.poll(); expect(app.guide().dataset.gweBuildGuidance).toBe('empty');
    expect(app.engine.blocksPlaced).toBe(50);
  });

  it('keeps retained-selection guidance and does not change its blocks or history', () => {
    const student = mesh(), position = student.userData.gridPos;
    const selected = { blocks: [position] }, undo = [{ type: 'place', x: 0 }], redo = [{ type: 'remove', x: 2 }];
    const measured = { count: 1, L: 1, W: 1, H: 1, totalVolume: 1, isComplete: true, blocks: [position], shapeCounts: { cube: 1 } };
    const app = mountGuidance({ blocks: [student], engine: { blocks: { '0,1,0': student }, _builderSelection: selected,
      _undoStack: undo, _redoStack: redo, measureStructure: vi.fn(() => measured) } });
    expect(app.guide().dataset.gweBuildGuidance).toBe('selected');
    expect(app.guide().textContent).toBe('Your selection stays outlined as you look around.');
    expect(app.host.querySelector('[aria-label="Selected build summary"]').textContent).toContain('1Blocks selected');
    expect(app.host.querySelector('.gwe-selection-scope').textContent).toBe('Showcase and Print Lab use these blocks.');
    app.poll(); expect(app.engine._builderSelection.blocks).toEqual(selected.blocks);
    expect(app.engine.blocks['0,1,0']).toBe(student); expect(app.engine._undoStack).toBe(undo); expect(app.engine._redoStack).toBe(redo);
  });

  it('reuses the existing interval, short-circuits its presence check and avoids idle rerenders', () => {
    const unread = {}; Object.defineProperty(unread, 'userData', { get() { throw new Error('presence check did not short-circuit'); } });
    const app = mountGuidance({ blocks: [mesh(), unread] });
    expect(app.interval).toHaveBeenCalledTimes(1); expect(app.interval.mock.calls[0][1]).toBe(250);
    const renders = app.baseRender.mock.calls.length;
    for (let index = 0; index < 5; index++) app.poll();
    expect(app.baseRender).toHaveBeenCalledTimes(renders); expect(app.guide().dataset.gweBuildGuidance).toBe('select');
  });

  it.each([false, true])('announces the actual first placement control when opening a sandbox (touch=%s)', touch => {
    const app = mountGuidance({ touch, data: { activeLesson: 'volumeExplorer' } });
    app.click('.gwe-free-build-launch'); app.click('.gwe-open');
    expect(app.engine.loadLesson).toHaveBeenCalledTimes(1);
    const expected = 'Free Build Sandbox opened. Aim at the ground and ' + (touch ? 'tap Place' : 'press B') + ' to add your first block.';
    expect(app.addToast).toHaveBeenCalledWith(expected, 'success'); expect(app.announceToSR).toHaveBeenCalledWith(expected);
  });

  it('waits for the cached block API before claiming that the world is empty', () => {
    const app = mountGuidance({ engine: { getBlocksArr: undefined } });
    expect(app.guide().dataset.gweBuildGuidance).toBe('select');
    app.engine.getBlocksArr = vi.fn(() => [mesh('ground', 'grass')]); app.poll();
    expect(app.guide().dataset.gweBuildGuidance).toBe('empty');
  });
});
