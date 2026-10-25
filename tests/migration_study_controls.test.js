import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool;
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const hit = find(child, predicate); if (hit) return hit; } return null; }
  if (predicate(node)) return node;
  return find(node.props?.children, predicate);
}
function view(seed = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', ...seed }, tree;
  const ctx = makeCtx({ update: (_, key, value) => { state = { ...state, [key]: value }; }, updateMulti: (_, values) => { state = { ...state, ...values }; } });
  const ui = {
    get state() { return state; },
    render() { ctx.toolData = { migration: state }; function Component() { tree = tool.render(ctx); return tree; } return ReactDOMServer.renderToStaticMarkup(React.createElement(Component)); },
    node(predicate) { return find(tree, predicate); },
    label(label) { return find(tree, node => node.props?.['aria-label'] === label); },
    button(text) { return find(tree, node => node.type === 'button' && node.props.children === text); },
    key(key, modifiers = {}) { const target = {}; ui.node(node => node.props?.className === 'migration-flight-stage').props.onKeyDown({ key, target, currentTarget: target, preventDefault() {}, ...modifiers }); ui.render(); }
  };
  ui.render(); return ui;
}
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration'); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

describe('Migration Study controls', () => {
  it('bounds unreadable or extreme camera state before rendering controls', () => {
    const ui = view({ flightStudyBird: 999, flightStudyYaw: 900, flightStudyPitch: -99, flightStudyZoom: 999 });
    expect(ui.label('Study individual').props.value).toBe(10);
    expect(ui.label('Study angle in degrees').props.value).toBe(180);
    expect(ui.label('Study elevation in degrees').props.value).toBe(-60);
    expect(ui.label('Study zoom percent').props.value).toBe(160);
    expect(() => view({ flightStudyBird: {}, flightStudyYaw: {}, flightStudyPitch: Infinity, flightStudyZoom: 'bad' })).not.toThrow();
  });

  it('orbits and zooms with focused-scene keys while respecting browser shortcuts', () => {
    const ui = view({ flightStudyYaw: 175, flightStudyPitch: 60, flightStudyZoom: 1.6 });
    ui.key('ArrowRight'); ui.key('ArrowUp'); ui.key('+');
    expect(ui.state.flightStudyYaw).toBe(-175);
    expect(ui.state.flightStudyPitch).toBe(60);
    expect(ui.state.flightStudyZoom).toBe(1.6);
    ui.key('ArrowLeft', { ctrlKey: true });
    expect(ui.state.flightStudyYaw).toBe(-175);
    ui.key('ArrowLeft'); ui.key('ArrowDown'); ui.key('-');
    expect(ui.state.flightStudyYaw).toBe(175);
    expect(ui.state.flightStudyPitch).toBe(55);
    expect(ui.state.flightStudyZoom).toBe(1.5);
  });

  it('steps an illustrative wingbeat without changing recorded observations or flight conditions', () => {
    const notebook = { prediction: 'Keep this work', trials: [] };
    const ui = view({ flightWingStep: 1000000, flightPaused: false, flightWind: -3, flightInvestigation: notebook });
    ui.button('Step wingbeat').props.onClick();
    expect(ui.state.flightPaused).toBe(true);
    expect(ui.state.flightWingStep).toBe(0);
    expect(ui.state.flightWind).toBe(-3);
    expect(ui.state.flightInvestigation).toBe(notebook);
  });

  it('clamps the selected individual when a formation has fewer members', () => {
    const ui = view({ flightStudyBird: 9 });
    ui.label('3D migration flight pattern').props.onChange({ target: { value: 'solo' } }); ui.render();
    expect(ui.label('Study individual').props.value).toBe(0);
    expect(ui.label('Study individual').props.disabled).toBe(true);
    ui.label('3D migration flight pattern').props.onChange({ target: { value: 'natural' } }); ui.render();
    expect(ui.label('Study individual').props.value).toBe(9);
  });

  it('retains two explicit step clicks before a new React render', () => {
    const ui = view({ flightWingStep: 0, flightPaused: true });
    const step = ui.button('Step wingbeat').props.onClick;
    step(); step();
    expect(ui.state.flightWingStep).toBe(2);
  });

  it('resets only the orbit and zoom, retaining the chosen individual and layers', () => {
    const ui = view({ flightStudyBird: 3, flightStudyYaw: 90, flightStudyPitch: 50, flightStudyZoom: 1.6, flightShowAnatomy: true, flightWind: 7 });
    ui.button('Reset study view').props.onClick();
    expect(ui.state).toMatchObject({ flightStudyBird: 3, flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, flightShowAnatomy: true, flightWind: 7 });
  });

  it.each([['Front', 180, 10], ['Profile', 90, 10], ['From above', 0, 60], ['From below', 0, -60]])('sets the %s viewpoint without changing zoom, individual, or investigation work', (label, yaw, pitch) => {
    const work = { prediction: 'Keep my observations', trials: [] };
    const ui = view({ flightStudyBird: 4, flightStudyZoom: 1.25, flightWind: -4, flightInvestigation: work });
    ui.button(label).props.onClick(); ui.render();
    expect(ui.state).toMatchObject({ flightStudyYaw: yaw, flightStudyPitch: pitch, flightStudyZoom: 1.25, flightStudyBird: 4, flightWind: -4 });
    expect(ui.state.flightInvestigation).toBe(work);
    expect(ui.button(label).props['aria-pressed']).toBe('true');
    ui.key('ArrowLeft');
    expect(ui.button(label).props['aria-pressed']).toBe('false');
  });

  it('does not focus an unrelated global scene from an uncommitted Study action', () => {
    const ui = view(), before = structuredClone(ui.state);
    const stage = document.createElement('div'), next = document.createElement('button');
    stage.id = 'migration-flight-stage'; stage.tabIndex = 0; document.body.append(stage, next); next.focus();
    const button = ui.button('Focus 3D scene');
    expect(button.props['data-scene-focus']).toBe('');
    button.props.onClick(); button.props.onClick({ currentTarget: stage });
    expect(document.activeElement).toBe(next); expect(ui.state).toEqual(before);
  });

  it('places playback before flight conditions in the DOM and describes device-reduced motion truthfully', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const ui = view({ flightPaused: false });
    const html = ui.render();
    expect(html.indexOf('migration-flight-actions')).toBeLessThan(html.indexOf('3D migration focus species'));
    expect(html).toContain('data-motion-reduced="true"');
    expect(html).toContain('Motion reduced');
    expect(html).toContain('Flight stays still; camera controls and Step wingbeat respond to your input.');
  });
});
