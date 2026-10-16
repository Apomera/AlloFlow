import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const translate = (key, fallback) => key.split('.').reduce((value, part) => value?.[part], strings) || fallback || key;
const flatten = node => !node || typeof node !== 'object' ? [] : (Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)]);

function setup(axis, depth) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', atlasDisplayMode: '3d', brain3DSliceAxis: axis, brain3DSlicePosition: depth } });
  const nodes = flatten(tool.render(makeCtx({ t: translate }, store)));
  const button = nodes.find(node => node.props?.className === 'brainatlas-3d-slice-map');
  const mapNodes = flatten(button);
  const svg = mapNodes.find(node => node.type === 'svg');
  const plane = mapNodes.find(node => node.props?.className === 'brainatlas-3d-slice-map-plane');
  const labels = mapNodes.filter(node => node.type === 'text');
  return { store, button, svg, plane, labels };
}

beforeEach(() => {
  resetStemLab();
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
});

afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Brain Atlas cutaway orientation navigator', () => {
  it.each(['sagittal', 'coronal', 'axial'])('keeps %s direction labels outside the entire plane track', axis => {
    const s = setup(axis, 50);
    const [start, end] = s.labels.map(node => node.props);
    const firstPlane = setup(axis, 0).plane.props;
    const lastPlane = setup(axis, 100).plane.props;
    if (axis === 'axial') {
      expect(Number(start.x)).toBe(Number(end.x));
      expect(Number(start.y) + 10).toBeLessThan(Number(firstPlane.y1));
      expect(Number(end.y) - 10).toBeGreaterThan(Number(lastPlane.y1));
      expect([start.children, end.children]).toEqual(['S', 'I']);
    } else {
      expect(Number(start.y)).toBe(Number(end.y));
      expect(Number(start.x) + 10).toBeLessThan(Number(firstPlane.x1));
      expect(Number(end.x) - 10).toBeGreaterThan(Number(lastPlane.x1));
      expect([start.children, end.children]).toEqual(axis === 'sagittal' ? ['L', 'R'] : ['A', 'P']);
    }
    expect(start.textAnchor).toBe('middle');
    expect(end.textAnchor).toBe('middle');
  });

  it.each(['sagittal', 'coronal', 'axial'])('keeps pointer selection aligned with the %s plane at different aspect ratios', axis => {
    for (const width of [190, 200, 400]) {
      for (const depth of [0, 25, 50, 75, 100]) {
        const s = setup(axis, depth);
        const [, , viewWidth, viewHeight] = s.svg.props.viewBox.split(' ').map(Number);
        const rect = { left: 40, top: 60, width, height: 112 };
        const scale = Math.min(rect.width / viewWidth, rect.height / viewHeight);
        const plane = s.plane.props;
        // Pick the actual rendered plane midpoint, rather than repeating the
        // implementation's conversion from depth to SVG coordinates.
        const x = (Number(plane.x1) + Number(plane.x2)) / 2;
        const y = (Number(plane.y1) + Number(plane.y2)) / 2;
        s.button.props.onClick({
          currentTarget: { querySelector: () => ({ getBoundingClientRect: () => rect }) },
          clientX: rect.left + (rect.width - viewWidth * scale) / 2 + x * scale,
          clientY: rect.top + (rect.height - viewHeight * scale) / 2 + y * scale
        });
        expect(s.store.toolData.brainAtlas.brain3DSlicePosition).toBe(depth);
      }
    }
  });
});
