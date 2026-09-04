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
afterEach(() => { vi.useRealTimers(); document.getElementById('brainatlas-canvas-fullscreen')?.remove(); });
describe('Brain Atlas compact workspace', () => {
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
