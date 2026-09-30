import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'
];
const regions = ['head', 'chest', 'abdomen'];
const endpointLandmarks = {
  head: { superior: 'Right hemisphere', inferior: 'Cerebellum' },
  chest: { superior: 'Trachea', inferior: 'Liver dome' },
  abdomen: { superior: 'Liver', inferior: 'Bladder' }
};

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = find(child, predicate);
      if (match) return match;
    }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}

function recordDrawing() {
  let path = [];
  const strokes = [], texts = [];
  const noop = () => {};
  const context = {
    beginPath: () => { path = []; },
    moveTo: (x, y) => { path.push({ x, y }); },
    lineTo: (x, y) => { path.push({ x, y }); },
    stroke: () => { strokes.push({ color: context.strokeStyle, width: context.lineWidth, points: path.slice() }); },
    fillText: (text, x, y) => { texts.push({ text: String(text), x, y }); },
    measureText: text => ({ width: String(text).length * 6 }),
    ellipse: noop, arc: noop, fill: noop, fillRect: noop,
    save: noop, restore: noop, clearRect: noop, setLineDash: noop
  };
  return { context, strokes, texts };
}

function imagingState(imaging) {
  return { anatomy: {
    _activeTab: 'imaging', system: 'organs', view: 'anterior', complexity: 3,
    _startHereDismissed: true, imaging
  } };
}

function renderImaging(imaging) {
  const root = document.createElement('div');
  root.innerHTML = renderTool('anatomy', imagingState(imaging), { gradeLevel: '9' });
  return root;
}

function rulerSession(file, imaging) {
  resetStemLab();
  const tool = loadTool(file, 'anatomy');
  let data = imagingState({ plane: 'axial', slice: 50, tool: 'ruler', note: 'Scale calibration', ...imaging });
  const setToolData = update => { data = typeof update === 'function' ? update(data) : update; };
  const canvas = () => find(tool.render(makeCtx({ toolData: data, gradeLevel: '9', setToolData })),
    node => node.props?.['data-anatomy-imaging-canvas'] === 'true');
  return { canvas, data: () => data.anatomy.imaging };
}

beforeEach(() => {
  vi.useFakeTimers();
  resetStemLab();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

for (const file of files) describe('Imaging guidance correspondence ' + file, () => {
  for (const region of regions) it('maps axial slices from superior to inferior in the ' + region + ' painter and BodyScope display', () => {
    loadTool(file, 'anatomy');
    const { drawAnatomyImagingSlice: draw, getBodyScopeSpatialProfile: profile } = window.__alloAnatomyImagingPure;
    const expectedBands = ['Superior slice band', 'Central slice band', 'Inferior slice band'];
    const markerYs = [];
    for (const [index, slice] of [0, 50, 100].entries()) {
      expect(profile(region, 'axial', slice).positionLabel).toBe(expectedBands[index]);
      const root = renderImaging({ region, plane: 'axial', slice });
      const bodyScope = root.querySelector('[data-anatomy-bodyscope]');
      expect(bodyScope.getAttribute('data-bodyscope-position')).toBe(expectedBands[index]);
      expect(bodyScope.textContent).toContain('Axial · ' + expectedBands[index]);
      const band = root.querySelector('[data-bodyscope-locator] > rect[x="34"][width="112"]');
      const marker = root.querySelector('[data-bodyscope-plane-mark="axial"] rect');
      const markerY = Number(marker.getAttribute('y'));
      const bandTop = Number(band.getAttribute('y')), bandHeight = Number(band.getAttribute('height'));
      expect(markerY).toBeCloseTo(bandTop + (slice / 100) * bandHeight - 3, 8);
      markerYs.push(markerY);
    }
    expect(markerYs[0]).toBeLessThan(markerYs[1]);
    expect(markerYs[1]).toBeLessThan(markerYs[2]);
    const superior = draw(recordDrawing().context, 640, 480, { modality: 'CT', region, plane: 'axial', slice: 0, noise: false });
    const inferior = draw(recordDrawing().context, 640, 480, { modality: 'CT', region, plane: 'axial', slice: 100, noise: false });
    expect(superior.regions.map(item => item.text)).toContain(endpointLandmarks[region].superior);
    expect(superior.regions.map(item => item.text)).not.toContain(endpointLandmarks[region].inferior);
    expect(inferior.regions.map(item => item.text)).toContain(endpointLandmarks[region].inferior);
    expect(inferior.regions.map(item => item.text)).not.toContain(endpointLandmarks[region].superior);
  });

  for (const region of regions) it('retains the coronal and sagittal directions for the ' + region + ' display', () => {
    loadTool(file, 'anatomy');
    const profile = window.__alloAnatomyImagingPure.getBodyScopeSpatialProfile;
    for (const [plane, first, last] of [
      ['coronal', 'Anterior slice band', 'Posterior slice band'],
      ['sagittal', 'Right-sided slice band', 'Left-sided slice band']
    ]) {
      const positions = [];
      for (const [slice, expected] of [[0, first], [100, last]]) {
        expect(profile(region, plane, slice).positionLabel).toBe(expected);
        const root = renderImaging({ region, plane, slice });
        expect(root.querySelector('[data-anatomy-bodyscope]').getAttribute('data-bodyscope-position')).toBe(expected);
        const marker = root.querySelector('[data-bodyscope-plane-mark="' + plane + '"] rect');
        positions.push(Number(marker.getAttribute('x')));
      }
      expect(positions[1]).toBeGreaterThan(positions[0]);
    }
  });

  for (const region of regions) for (const modality of ['CT', 'MRI']) {
    it('measures the displayed 50 mm bar as 50 mm in ' + modality + ' ' + region + ' at different display sizes', () => {
      for (const displayWidth of [320, 640, 1280]) {
        const practice = rulerSession(file, { modality, region });
        const drawing = recordDrawing();
        window.__alloAnatomyImagingPure.drawAnatomyImagingSlice(drawing.context, 640, 480, {
          modality, region, plane: 'axial', slice: 50, noise: false, showLabels: false, showCrosshair: false
        });
        const scaleBars = drawing.strokes.filter(stroke => stroke.color === '#fff' && stroke.width === 3 && stroke.points.length === 2);
        expect(scaleBars).toHaveLength(1);
        expect(drawing.texts.some(item => item.text === '50 mm')).toBe(true);
        const [start, end] = scaleBars[0].points;
        expect(end.x - start.x).toBeCloseTo(62.5, 8);
        expect(end.y).toBe(start.y);
        const rect = { left: 19, top: 27, width: displayWidth, height: displayWidth * 480 / 640 };
        const canvas = { getBoundingClientRect: () => rect };
        const click = point => practice.canvas().props.onClick({
          currentTarget: canvas,
          clientX: rect.left + point.x / 640 * rect.width,
          clientY: rect.top + point.y / 480 * rect.height
        });
        click(start);
        expect(practice.data().rulerStart).toBeTruthy();
        expect(practice.data().annotations || []).toHaveLength(0);
        click(end);
        expect(practice.data().annotations).toHaveLength(1);
        expect(practice.data().annotations[0]).toMatchObject({
          type: 'ruler', distanceMm: 50, modality, region, plane: 'axial', slice: 50, note: 'Scale calibration'
        });
        expect(practice.data().rulerStart).toBeNull();
      }
    });
  }
});
