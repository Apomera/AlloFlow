import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

let THREE;
beforeAll(() => {
  const exports = {};
  new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(exports, { exports });
  THREE = exports;
});
afterEach(() => {
  delete window.__geoWorldEngine;
  delete window.__alloPrintLabPendingHandoff;
  delete window.__alloGeometryWorldReturnProject;
});

function fixture({ unit = 5, profile, check = { components: 1, openEdges: 0, nonManifoldEdges: 0 } } = {}) {
  window.THREE = THREE;
  window.StemLab = { _registry: { geometryWorld: { aliases: [], render(ctx) {
    return ctx.React.createElement('main', { id: 'geoworld-fs-workspace' });
  } } } };
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js', 'utf8'))();
  const api = window.StemLab.geometryWorldBuilderPure;
  const positions = [];
  for (let x = 0; x < 6; x++) positions.push({ x, y: 1, z: 0 });
  for (let z = 1; z < 4; z++) positions.push({ x: 0, y: 1, z });
  for (let y = 2; y <= 5; y++) positions.push({ x: 0, y, z: 0 });
  const engine = window.__geoWorldEngine = {
    blocks: {}, _builderSelection: { blocks: positions }, _currentLesson: api.FREE_BUILD_LESSON,
    _undoStack: [{ action: 'place', ...positions[0] }], _redoStack: [], blocksPlaced: positions.length,
    measureStructure(_x, _y, _z, retained) {
      const blocks = retained.filter(p => this.blocks[[p.x, p.y, p.z].join(',')]);
      const extent = axis => Math.max(...blocks.map(p => p[axis])) - Math.min(...blocks.map(p => p[axis])) + 1;
      return { blocks, count: blocks.length, isComplete: true, L: extent('x'), W: extent('z'), H: extent('y'),
        totalVolume: blocks.length, shapeCounts: { cube: blocks.length }, materialCounts: { stone: blocks.length } };
    },
  };
  for (const p of positions) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    mesh.position.set(p.x + 0.5, p.y + 0.5, p.z + 0.5);
    mesh.userData = { gridPos: p, shape: 'cube', rotation: 0, blockType: 'stone', volume: 1, _measurementLayer: 'student' };
    mesh.updateMatrixWorld(true);
    engine.blocks[[p.x, p.y, p.z].join(',')] = mesh;
  }
  const before = api.buildGeometryWorldStl(engine, positions).buffer;
  const history = JSON.stringify([engine._undoStack, engine._redoStack]);
  const ctx = { React, toolData: { geometryWorld: { worldActive: true, activeLesson: 'builderSandbox', builderPrintContext: { unitMm: unit }, builderPrintCheck: check }, printLab: { profile } }, setStemLabTool: vi.fn(), addToast() {} };
  const host = document.createElement('div');
  host.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(function Host() {
    return window.StemLab._registry.geometryWorld.render(ctx);
  }));
  return { host, engine, api, ctx, positions, before, history };
}

describe('physical size and mesh review in the Geometry World dock', () => {
  it('labels all three axes and announces their order and millimeter values', () => {
    const { host } = fixture();
    expect([...host.querySelectorAll('.gwe-print-axis-label')].map(el => el.textContent)).toEqual(['Width', 'Depth', 'Height']);
    expect([...host.querySelectorAll('.gwe-print-axis strong')].map(el => el.textContent)).toEqual(['30', '20', '25']);
    expect([...host.querySelectorAll('.gwe-print-axis small')].map(el => el.textContent)).toEqual(['mm', 'mm', 'mm']);
    const status = host.querySelector('.gwe-print-dimensions[role="status"]');
    expect(status.querySelector('.gwe-assistive-copy').textContent).toContain('Width, depth, height: 30 × 20 × 25 mm');
    expect(status.querySelector('.gwe-print-axes').getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('.gwe-print-scale').textContent).toContain('Bed ');
  });

  it('marks only the axes exceeding the saved printer profile at the retained scale', () => {
    const { host } = fixture({ unit: 12.5, profile: { bedWidthMm: 50, bedDepthMm: 80, bedHeightMm: 50 } });
    expect([...host.querySelectorAll('.gwe-print-axis strong')].map(el => el.textContent)).toEqual(['75', '50', '62.5']);
    expect([...host.querySelectorAll('.gwe-print-axis[data-over="true"]')].map(el => el.dataset.axis)).toEqual(['width', 'height']);
    expect(host.querySelector('[data-axis="depth"] .gwe-print-axis-note')).toBeNull();
    expect(host.querySelector('.gwe-assistive-copy').textContent).toContain('width and height exceed the printer bed');
    expect(host.querySelector('.gwe-print-scale').textContent).toBe('12.5 mm per block · Bed 50 × 80 × 50 mm');
  });

  it.each([
    [{ components: 1, openEdges: 0, nonManifoldEdges: 0 }, true, 'One joined piece'],
    [{ components: 1, openEdges: 3, nonManifoldEdges: 0 }, false, 'Open surfaces need review'],
    [{ components: 1, openEdges: 0, nonManifoldEdges: 2 }, false, 'Touching edges need review'],
    [{ components: 2, openEdges: 0, nonManifoldEdges: 0 }, false, '2 separate pieces'],
    [{ error: 'Could not inspect this mesh', components: 1, openEdges: 0, nonManifoldEdges: 0 }, false, 'Check this selection'],
    [{ components: 1 }, false, 'Review this selection'],
  ])('keeps the review badge honest for %j', (check, connected, heading) => {
    const { host } = fixture({ check });
    const card = host.querySelector('.gwe-connection-check');
    expect(card.getAttribute('data-connected')).toBe(String(connected));
    expect(card.querySelector('strong').textContent).toBe(heading);
    if (check.openEdges) expect(card.textContent).toContain('The selected mesh has open edges');
    if (!connected) expect(card.textContent).not.toContain('One joined piece');
  });

  it('preserves selected STL, history, and physical scale when the refined card sends to Print Lab', () => {
    const app = fixture({ unit: 12.5 });
    expect(new Uint8Array(app.api.buildGeometryWorldStl(app.engine, app.positions).buffer)).toEqual(new Uint8Array(app.before));
    app.api.openSelectedBuildInPrintLab(app.ctx);
    expect(app.ctx.setStemLabTool).toHaveBeenCalledWith('printLab');
    expect(window.__alloPrintLabPendingHandoff.unitMm).toBe(12.5);
    expect(window.__alloPrintLabPendingHandoff.bytes).toEqual(new Uint8Array(app.before));
    expect(window.__alloPrintLabPendingHandoff.sourceModel.blocks).toHaveLength(app.positions.length);
    expect(JSON.stringify([app.engine._undoStack, app.engine._redoStack])).toBe(app.history);
  });
});
