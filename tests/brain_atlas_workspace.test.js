import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}
function setup(state = {}) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', ...state } });
  const announceToSR = vi.fn();
  const nodes = () => flatten(tool.render(makeCtx({ announceToSR }, store)));
  const get = key => nodes().find(el => el.props?.[key] === 'true');
  return { store, nodes, get, announceToSR };
}
beforeEach(() => { resetStemLab(); vi.useFakeTimers(); });
afterEach(() => {
  vi.useRealTimers(); vi.unstubAllGlobals();
  document.getElementById('brainatlas-canvas-fullscreen')?.remove();
  document.getElementById('brainatlas-region-search')?.remove();
});
describe('Brain Atlas compact workspace', () => {
  it('switches specialty diagrams between readable scrolling and a fitted overview', () => {
    const s = setup({ view: 'visualPathway', canvasZoom: 1.5 });
    const stage = () => s.nodes().find(el => el.props?.className === 'brainatlas-canvas-stage');
    const fit = () => s.get('data-brainatlas-fit-diagram');
    expect(stage().props['data-brainatlas-fit']).toBe('readable');
    expect(stage().props['data-brainatlas-scrollable']).toBe('true');
    expect(stage().props.tabIndex).toBe(0);
    fit().props.onClick();
    expect(s.store.toolData.brainAtlas.diagramFitToScreen).toBe(true);
    expect(s.store.toolData.brainAtlas.canvasZoom).toBe(1);
    expect(stage().props['data-brainatlas-fit']).toBe('overview');
    expect(stage().props['data-brainatlas-scrollable']).toBe('false');
    fit().props.onClick();
    expect(stage().props['data-brainatlas-fit']).toBe('readable');
  });

  it('keeps anatomy and camera controls available while exploration tools are collapsed', () => {
    const s = setup({ atlasDisplayMode: '3d' });
    const toolbox = () => s.get('data-brainatlas-3d-toolbox');
    expect(toolbox().props.open).toBe(false);
    const primary = s.nodes().find(el => el.props?.className === 'brainatlas-3d-primary-controls');
    const groups = flatten(primary).filter(el => el.props?.role === 'group');
    expect(groups.map(el => el.props['aria-label'])).toEqual(['Visible anatomy layer', '3D camera presets']);
    expect(s.nodes().find(el => el.props?.['data-brainatlas-layout'])?.props['data-brainatlas-layout']).toBe('studio');
    toolbox().props.onToggle({ currentTarget: { open: true } });
    expect(toolbox().props.open).toBe(true);
    toolbox().props.onToggle({ currentTarget: { open: false } });
    expect(toolbox().props.open).toBe(false);
  });

  it('shows active exploration tools and preserves an explicit collapsed choice', () => {
    const s = setup({ atlasDisplayMode: '3d', brain3DSliceAxis: 'sagittal', brain3DPathway: 'papez' });
    expect(s.get('data-brainatlas-3d-toolbox').props.open).toBe(true);
    expect(s.get('data-brainatlas-3d-toolbox-active')).toBeTruthy();
    s.get('data-brainatlas-3d-toolbox').props.onToggle({ currentTarget: { open: false } });
    expect(s.get('data-brainatlas-3d-toolbox').props.open).toBe(false);
    expect(s.get('data-brainatlas-3d-toolbox-active')).toBeTruthy();
    expect(s.store.toolData.brainAtlas.brain3DSliceAxis).toBe('sagittal');
    expect(s.store.toolData.brainAtlas.brain3DPathway).toBe('papez');
  });

  it('places the selected region takeaways before representation controls in reading order', () => {
    const s = setup({ selectedRegion: 'frontal' });
    const nodes = s.nodes();
    const takeaways = nodes.findIndex(el => el.props?.['data-brainatlas-detail-takeaways'] === 'true');
    const representation = nodes.findIndex(el => el.props?.['data-brainatlas-representation'] === 'diagram');
    expect(takeaways).toBeGreaterThan(-1);
    expect(representation).toBeGreaterThan(takeaways);
  });

  it('discloses mobile navigation and opens it before the search shortcut moves focus', () => {
    vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: query === '(max-width:760px)', media: query, addEventListener() {}, removeEventListener() {} })));
    const s = setup();
    const drawer = () => s.nodes().find(el => el.props?.id === 'brainatlas-navigation-controls');
    const toggle = () => s.get('data-brainatlas-nav-toggle');
    expect(toggle().props['aria-expanded']).toBe('false');
    expect(toggle().props['aria-controls']).toBe(drawer().props.id);
    expect(drawer().props['data-brainatlas-controls-open']).toBe('false');
    toggle().props.onClick();
    expect(toggle().props['aria-expanded']).toBe('true');
    expect(drawer().props['data-brainatlas-controls-open']).toBe('true');
    toggle().props.onClick();
    expect(drawer().props['data-brainatlas-controls-open']).toBe('false');

    const search = document.createElement('input');
    search.id = 'brainatlas-region-search'; search.scrollIntoView = vi.fn();
    document.body.appendChild(search);
    const event = { key: '/', target: { tagName: 'BUTTON' }, preventDefault: vi.fn() };
    s.get('data-brainatlas-tool').props.onKeyDown(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(toggle().props['aria-expanded']).toBe('true');
    expect(document.activeElement).not.toBe(search);
    vi.runOnlyPendingTimers();
    expect(document.activeElement).toBe(search);
    expect(search.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('keeps label settings optional and remembers disclosure state', () => {
    const s = setup();
    expect(s.get('data-brainatlas-label-disclosure').props.open).toBe(false);
    s.get('data-brainatlas-label-disclosure').props.onToggle({ currentTarget: { open: true } });
    expect(s.get('data-brainatlas-label-disclosure').props.open).toBe(true);
    const size = s.nodes().find(el => el.props?.['data-brainatlas-label-size-option'] === 'large');
    size.props.onClick();
    expect(s.store.toolData.brainAtlas.diagramLabelSize).toBe('large');
    expect(s.get('data-brainatlas-label-disclosure').props.open).toBe(true);
  });
  it('starts compact and preserves the learner choice across subsequent renders', () => {
    const s = setup();
    expect(s.get('data-brainatlas-tool').props['data-brainatlas-compact']).toBe('true');
    const toggle = s.get('data-brainatlas-overview-toggle');
    expect(toggle.props['aria-label']).toBe('Browse topics');
    expect(toggle.props['aria-expanded']).toBe('false');
    toggle.props.onClick();
    expect(s.store.toolData.brainAtlas.overviewCollapsed).toBe(false);
    expect(s.get('data-brainatlas-tool').props['data-brainatlas-compact']).toBe('false');
    s.get('data-brainatlas-overview-toggle').props.onClick();
    expect(s.get('data-brainatlas-tool').props['data-brainatlas-compact']).toBe('true');
    expect(setup({ overviewCollapsed: false }).get('data-brainatlas-overview-toggle').props['aria-expanded']).toBe('true');
  });
  it('opens a route, closes the overview, clears stale state, and focuses the diagram', () => {
    const s = setup({ overviewCollapsed: false, selectedRegion: 'frontal', search: 'vision', quizMode: true, quizIdx: 0 });
    const routes = s.nodes().filter(el => el.props?.['data-brainatlas-route-card'] === 'true');
    const diagram = document.createElement('div');
    diagram.id = 'brainatlas-canvas-fullscreen'; diagram.tabIndex = -1;
    diagram.scrollIntoView = vi.fn(); document.body.appendChild(diagram);
    routes[1].props.onClick();
    expect(s.store.toolData.brainAtlas).toMatchObject({ view: 'medial', overviewCollapsed: true, selectedRegion: null, search: '', quizMode: false });
    expect(diagram.scrollIntoView).not.toHaveBeenCalled();
    vi.runOnlyPendingTimers();
    expect(diagram.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(diagram);
    expect(s.announceToSR).toHaveBeenCalledWith('Brain Atlas diagram is now in view.');
  });
});
