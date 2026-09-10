import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync('stem_lab/stem_tool_geometryworld_builder.js', 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let mounted;

function mountSelectedBuild() {
  vi.useFakeTimers();
  // This regression exercises the builder's real render and click handlers;
  // the core stub reproduces its inspector-close state update.
  const lab = resetStemLab();
  lab.registerTool('geometryWorld', { aliases: [], render(ctx) {
    return React.createElement('main', { id: 'geoworld-fs-workspace' },
      React.createElement('div', { id: 'geoworld-fs-wrap', tabIndex: 0 }),
      ctx.toolData.geometryWorld.measureResult && React.createElement('button', {
        onClick() { ctx.update('geometryWorld', { ...ctx.toolData.geometryWorld, measureResult: null }); },
      }, 'Close measurement inspector'));
  } });
  if (!document.getElementById('allo-geometryworld-builder-css')) {
    const style = document.createElement('style'); style.id = 'allo-geometryworld-builder-css'; document.head.appendChild(style);
  }
  new Function(source)();
  const blocks = {};
  const positions = [{ x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }];
  positions.forEach((p) => { blocks[`${p.x},${p.y},${p.z}`] = { userData: {
    gridPos: p, blockType: 'stone', shape: 'halfB', rotation: 0, volume: 0.5, _measurementLayer: 'student',
  } }; });
  const engine = window.__geoWorldEngine = {
    blocks, _builderSelection: { blocks: positions }, _currentLesson: { sandbox: true }, loadLesson: vi.fn(),
    _undoStack: [{ type: 'place' }], _redoStack: [],
    measureStructure: vi.fn((_x, _y, _z, retained) => {
      const live = [], queue = retained.slice(), visited = new Set();
      for (let i = 0; i < queue.length; i += 1) {
        const p = queue[i], key = [p.x,p.y,p.z].join(',');
        if (visited.has(key)) continue;
        visited.add(key);
        const u = blocks[key]?.userData;
        if (!u || u._measurementLayer !== 'student' || u._lessonBlock) continue;
        live.push(p);
        queue.push({ ...p, x:p.x-1 }, { ...p, x:p.x+1 });
      }
      if (!live.length) return null;
      return { blocks: live, isComplete: true, count: live.length, L: live.length, W: 1, H: 1,
        totalVolume: live.reduce((sum, p) => sum + blocks[`${p.x},${p.y},${p.z}`].userData.volume, 0),
        shapeCounts: live.reduce((counts, p) => { const shape = blocks[`${p.x},${p.y},${p.z}`].userData.shape; counts[shape] = (counts[shape] || 0) + 1; return counts; }, {}) };
    }),
  };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let current, update;
  function Host() {
    const [toolData, setToolData] = React.useState(() => ({ geometryWorld: {
      activeLesson: 'builderSandbox', worldActive: true, builderPanel: 'build', measureResult: engine.measureStructure(0, 1, 0, positions),
    } }));
    current = toolData.geometryWorld;
    update = (patch) => setToolData((old) => ({ ...old, geometryWorld: { ...old.geometryWorld, ...patch } }));
    return lab._registry.geometryWorld.render(makeCtx({ toolData, setToolData,
      update: (key, value) => setToolData((old) => ({ ...old, [key]: value })),
      updateMulti: (key, patch) => setToolData((old) => ({ ...old, [key]: { ...old[key], ...patch } })),
    }));
  }
  act(() => root.render(React.createElement(Host)));
  function click(text) {
    const button = [...host.querySelectorAll('button')].find((node) => node.textContent === text || node.getAttribute('aria-label') === text);
    expect(button, text).toBeTruthy();
    act(() => button.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  }
  mounted = { root, host };
  return { engine, host, click, state: () => current, refresh: (patch = {}) => act(() => update(patch)) };
}

afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null; }
  delete window.__geoWorldEngine;
  vi.useRealTimers();
});

describe('retained creation after closing its measurement inspector', () => {
  it('keeps selected count, Showcase and Print Lab affordances and reopens measurements explicitly', () => {
    const app = mountSelectedBuild();
    const history = JSON.stringify([app.engine._undoStack, app.engine._redoStack]);
    app.click('Explore measurements');
    expect(app.state().builderPanel).toBe('measure');
    app.click('Close measurement inspector');
    expect(app.state().measureResult).toBeNull();
    app.click('Expand Free Build Studio');
    expect(app.host.querySelector('[aria-label="Build summary"]').textContent).toContain('2Selected');
    expect(app.host.textContent).toContain('Showcase creation');
    expect(app.host.textContent).toContain('Explore measurements');
    expect(app.host.querySelector('[aria-label="Print Lab block envelope"]')).toBeTruthy();
    expect(app.host.querySelector('[aria-label="Send selected build to Print Lab"]')).toBeTruthy();
    const reads = app.engine.measureStructure.mock.calls.length;
    for (let i = 0; i < 5; i += 1) app.refresh({ selectedBlock: i });
    expect(app.engine.measureStructure).toHaveBeenCalledTimes(reads);
    expect(app.state().measureResult).toBeNull();
    app.click('Explore measurements');
    expect(app.state().measureResult.count).toBe(2);
    expect(app.state().builderPanel).toBe('measure');
    expect(app.engine._builderSelection.blocks).toHaveLength(2);
    expect(JSON.stringify([app.engine._undoStack, app.engine._redoStack])).toBe(history);
    app.click('Close measurement inspector');
    app.click('Expand Free Build Studio');
    app.click('Clear selection');
    expect(app.engine._builderSelection).toBeNull();
    expect(app.host.textContent).not.toContain('Showcase creation');
  });

  it('reuses the dock summary after unchanged selection polling', () => {
    const app = mountSelectedBuild();
    app.click('Close measurement inspector');
    const reads = app.engine.measureStructure.mock.calls.length;
    for (let i = 1; i <= 3; i += 1) {
      act(() => vi.advanceTimersByTime(250));
      app.refresh({ selectedBlock: i });
      // Stable semantic occupancy skips the connected-component walk entirely.
      expect(app.engine.measureStructure).toHaveBeenCalledTimes(reads);
      expect(app.state().measureResult).toBeNull();
    }
  });

  it('updates a connected addition without reopening a deliberately closed inspector', () => {
    const app = mountSelectedBuild();
    app.click('Explore measurements');
    app.click('Close measurement inspector');
    app.engine.blocks['2,1,0'] = { userData: { gridPos: {x:2,y:1,z:0}, blockType:'wood',
      shape:'quarter', rotation:1, volume:0.25, _measurementLayer:'student' } };
    act(() => vi.advanceTimersByTime(250));
    expect(app.state().measureResult).toBeNull();
    expect(app.state().builderPanel).toBe('measure');
    expect(app.host.querySelector('[data-builder-panel="build"]')).toBeTruthy();
    app.click('Expand Free Build Studio');
    expect(app.host.querySelector('[aria-label="Build summary"]').textContent).toContain('3Selected');
    expect(app.host.querySelector('[aria-label="Print Lab block envelope"]')).toBeTruthy();
    expect(app.engine._builderSelection.blocks).toHaveLength(3);
    app.click('Explore measurements');
    expect(app.state().measureResult.count).toBe(3);
    expect(app.state().measureResult.totalVolume).toBe(1.25);
  });

  it('refreshes an edited fractional shape and rotation while the inspector is closed', () => {
    const app = mountSelectedBuild();
    app.click('Close measurement inspector');
    const reads = app.engine.measureStructure.mock.calls.length;
    Object.assign(app.engine.blocks['1,1,0'].userData, { shape: 'quarter', volume: 0.25, rotation: 1 });
    app.refresh();
    expect(app.engine.measureStructure).toHaveBeenCalledTimes(reads + 1);
    expect(app.state().measureResult).toBeNull();
    app.click('Explore measurements');
    expect(app.state().measureResult.totalVolume).toBe(0.75);
    expect(app.state().measureResult.shapeCounts).toEqual({ halfB: 1, quarter: 1 });
    app.click('Close measurement inspector');
    app.click('Expand Free Build Studio');
    const afterShape = app.engine.measureStructure.mock.calls.length;
    app.engine.blocks['1,1,0'].userData.rotation = 2;
    app.refresh();
    expect(app.engine.measureStructure).toHaveBeenCalledTimes(afterShape + 1);
    expect(app.host.querySelector('[aria-label="Print Lab block envelope"]')).toBeTruthy();
    expect(app.state().measureResult).toBeNull();
  });

  it('publishes a volume-only edit into the already-open selected inspector', () => {
    const app = mountSelectedBuild();
    app.click('Explore measurements');
    const reads = app.engine.measureStructure.mock.calls.length;
    app.engine.blocks['1,1,0'].userData.volume = 0.125;
    act(() => vi.advanceTimersByTime(250));
    expect(app.state().measureResult.totalVolume).toBe(0.625);
    expect(app.state().builderPanel).toBe('measure');
    const settledReads=app.engine.measureStructure.mock.calls.length;
    expect(settledReads).toBeGreaterThan(reads);
    act(() => vi.advanceTimersByTime(10000));
    expect(app.engine.measureStructure).toHaveBeenCalledTimes(settledReads);
  });

  it('refreshes an identical selected-cell list after the live engine is replaced', () => {
    const app = mountSelectedBuild();
    app.click('Explore measurements');
    const oldEngine=app.engine;
    const replacement={...oldEngine,blocks:{...oldEngine.blocks},measureStructure:vi.fn((...args)=>({...oldEngine.measureStructure(...args),totalVolume:0.75}))};
    window.__geoWorldEngine=replacement;
    act(() => vi.advanceTimersByTime(250));
    const settledReads=replacement.measureStructure.mock.calls.length;
    expect(settledReads).toBeGreaterThan(0);
    expect(app.state().measureResult.totalVolume).toBe(0.75);
    act(() => vi.advanceTimersByTime(1000));
    expect(replacement.measureStructure).toHaveBeenCalledTimes(settledReads);
  });

  it('clears a vanished selection and its open inspector after the last block is removed', () => {
    const app = mountSelectedBuild();
    app.click('Explore measurements');
    delete app.engine.blocks['0,1,0'];delete app.engine.blocks['1,1,0'];
    act(() => vi.advanceTimersByTime(250));
    expect(app.engine._builderSelection).toBeNull();
    expect(app.state().measureResult).toBeNull();
    expect(app.state().builderPanel).toBe('build');
    app.click('Expand Free Build Studio');
    expect(app.host.querySelector('[aria-label="Build summary"]').textContent).toContain('—Selected');
    expect(app.host.textContent).not.toContain('Showcase creation');
    expect(app.host.textContent).not.toContain('Explore measurements');
    expect(app.host.textContent).not.toContain('That measurement was the ground or a lesson structure.');
  });

  it('keeps the selected inspector current after a partial removal and shape edit', () => {
    const app = mountSelectedBuild();
    app.click('Explore measurements');
    delete app.engine.blocks['1,1,0'];
    Object.assign(app.engine.blocks['0,1,0'].userData, {shape:'quarter',volume:0.25});
    act(() => vi.advanceTimersByTime(250));
    expect(app.state().measureResult.count).toBe(1);
    expect(app.state().measureResult.totalVolume).toBe(0.25);
    expect(app.state().measureResult.shapeCounts).toEqual({quarter:1});
    expect(app.state().builderPanel).toBe('measure');
    expect(app.engine._builderSelection.blocks).toHaveLength(1);
  });

  it.each(['student','lesson'])('preserves an unrelated %s measurement across selected edits and deletion', (layer) => {
    const app = mountSelectedBuild(), p={x:8,y:layer==='lesson'?0:1,z:0},key=[p.x,p.y,p.z].join(',');
    app.engine.blocks[key]={userData:{gridPos:p,shape:'cube',rotation:0,volume:1,blockType:layer==='lesson'?'grass':'wood',_measurementLayer:layer,_lessonBlock:layer==='lesson'}};
    const unrelated={blocks:[p],count:1,isComplete:true,L:1,W:1,H:1,totalVolume:1,shapeCounts:{cube:1}};
    app.refresh({measureResult:unrelated,builderPanel:'measure'});
    Object.assign(app.engine.blocks['0,1,0'].userData,{shape:'quarter',volume:0.25});
    act(() => vi.advanceTimersByTime(250));
    expect(app.state().measureResult).toBe(unrelated);
    delete app.engine.blocks['0,1,0'];delete app.engine.blocks['1,1,0'];
    act(() => vi.advanceTimersByTime(250));
    expect(app.engine._builderSelection).toBeNull();
    expect(app.state().measureResult).toBe(unrelated);
    expect(app.state().builderPanel).toBe('measure');
    expect(app.engine.blocks[key]).toBeTruthy();
  });

  it.each(['missing', 'lesson'])('invalidates %s blocks without stale counts or actions', (kind) => {
    const app = mountSelectedBuild();
    app.click('Close measurement inspector');
    const invalidate = (key) => {
      if (kind === 'missing') delete app.engine.blocks[key];
      else Object.assign(app.engine.blocks[key].userData, { _measurementLayer: 'lesson', _lessonBlock: true });
    };
    invalidate('1,1,0'); app.refresh();
    expect(app.host.querySelector('[aria-label="Build summary"]').textContent).toContain('1Selected');
    expect(app.engine._builderSelection.blocks).toHaveLength(1);
    invalidate('0,1,0'); app.refresh();
    expect(app.engine._builderSelection).toBeNull();
    expect(app.host.querySelector('[aria-label="Build summary"]').textContent).toContain('—Selected');
    expect(app.host.textContent).not.toContain('Showcase creation');
    expect(app.host.textContent).not.toContain('Explore measurements');
    expect(app.host.querySelector('[aria-label="Print Lab block envelope"]')).toBeNull();
  });
});
