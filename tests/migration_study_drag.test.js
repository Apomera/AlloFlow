import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool;
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const hit = find(child, predicate); if (hit) return hit; } return null; }
  if (predicate(node)) return node;
  return find(node.props?.children, predicate);
}
function fixture(seed = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightStudyYaw: 35, flightStudyPitch: 15, ...seed }, tree;
  const writes = [];
  const ctx = makeCtx({ update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; }, updateMulti: (_, patch) => { writes.push(patch); state = { ...state, ...patch }; } });
  ctx.toolData = { migration: state };
  function Component() { tree = tool.render(ctx); return tree; }
  ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
  const props = find(tree, node => node.props?.id === 'migration-flight-stage').props;
  const host = document.createElement('div');
  host.tabIndex = 0; host.setAttribute('data-flight-ready', 'true');
  const canvas = document.createElement('canvas'); host.append(canvas); document.body.append(host);
  let captured = null;
  host.setPointerCapture = id => { captured = id; };
  host.hasPointerCapture = id => captured === id;
  host.releasePointerCapture = id => { if (captured === id) { captured = null; props.onLostPointerCapture(event()); } };
  function event(values = {}) { return { pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100, target: canvas, currentTarget: host, preventDefault() {}, ...values }; }
  return { props, host, canvas, writes, event,
    button(label) { return find(tree, node => node.type === 'button' && node.props.children === label); },
    label(label) { return find(tree, node => node.props?.['aria-label'] === label); },
    get state() { return state; }, get captured() { return captured; } };
}
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration'); });
afterEach(() => { window.dispatchEvent(new Event('blur')); document.body.innerHTML = ''; });

describe('Migration direct Study manipulation', () => {
  it('previews a captured orbit without persistence, then saves one bounded five-degree update on release', () => {
    const original = { prediction: 'Keep this evidence', trials: [] };
    const ui = fixture({ flightWind: -4, flightInvestigation: original });
    ui.props.onPointerDown(ui.event());
    expect(ui.captured).toBe(1);
    expect(document.activeElement).toBe(ui.host);
    expect(ui.host.getAttribute('data-study-dragging')).toBe('true');
    ui.props.onPointerMove(ui.event({ clientX: 160, clientY: 150 }));
    expect(ui.writes).toEqual([]);
    ui.props.onPointerUp(ui.event({ clientX: 160, clientY: 150 }));
    expect(ui.writes).toEqual([{ flightStudyYaw: 10, flightStudyPitch: 30 }]);
    expect(ui.captured).toBeNull();
    expect(ui.host.hasAttribute('data-study-dragging')).toBe(false);
    expect(ui.state.flightWind).toBe(-4);
    expect(ui.state.flightInvestigation).toBe(original);
  });

  it('discards cancellation and lost capture rather than saving a partial gesture', () => {
    for (const action of ['onPointerCancel', 'onLostPointerCapture']) {
      const ui = fixture();
      ui.props.onPointerDown(ui.event()); ui.props.onPointerMove(ui.event({ clientX: 250 }));
      ui.props[action](ui.event());
      ui.props.onPointerUp(ui.event());
      expect(ui.writes).toEqual([]);
      expect(ui.state.flightStudyYaw).toBe(35);
      expect(ui.host.hasAttribute('data-study-dragging')).toBe(false);
    }
  });

  it('ignores secondary pointers, buttons, modifiers, and controls inside the stage', () => {
    for (const values of [{ button: 2 }, { isPrimary: false }, { ctrlKey: true }, { target: document.createElement('button') }]) {
      const ui = fixture(); ui.props.onPointerDown(ui.event(values));
      ui.props.onPointerMove(ui.event({ clientX: 200 })); ui.props.onPointerUp(ui.event());
      expect(ui.writes).toEqual([]); expect(ui.captured).toBeNull();
    }
    const chase = fixture({ flightCamera: 'chase' });
    chase.props.onPointerDown(chase.event()); expect(chase.captured).toBeNull();
  });

  it('cancels an existing gesture when a second contact arrives and ignores unrelated pointer moves', () => {
    const ui = fixture(); ui.props.onPointerDown(ui.event());
    ui.props.onPointerMove(ui.event({ pointerId: 2, clientX: 300 }));
    ui.props.onPointerUp(ui.event({ pointerId: 2 }));
    expect(ui.captured).toBe(1);
    ui.props.onPointerDown(ui.event({ pointerId: 2, isPrimary: false }));
    expect(ui.captured).toBeNull(); expect(ui.writes).toEqual([]);
  });

  it('does not write tiny clicks and keeps a long wrapped drag inside the slider bounds', () => {
    const click = fixture(); click.props.onPointerDown(click.event());
    click.props.onPointerMove(click.event({ clientX: 101 })); click.props.onPointerUp(click.event());
    expect(click.writes).toEqual([]);
    const drag = fixture(); drag.props.onPointerDown(drag.event());
    drag.props.onPointerMove(drag.event({ clientX: 2100, clientY: 1000 })); drag.props.onPointerUp(drag.event());
    expect(drag.state.flightStudyYaw).toBe(-45);
    expect(drag.state.flightStudyPitch).toBe(60);
  });

  it('cancels the preview before a keyboard orbit action so only the requested key is saved', () => {
    const ui = fixture(); ui.props.onPointerDown(ui.event()); ui.props.onPointerMove(ui.event({ clientX: 200 }));
    ui.props.onKeyDown({ key: 'ArrowRight', target: ui.host, currentTarget: ui.host, preventDefault() {} });
    ui.props.onPointerUp(ui.event());
    expect(ui.writes).toEqual([{ flightStudyYaw: 45 }]);
    expect(ui.captured).toBeNull();
  });

  it('releases a captured preview on window blur without retaining a partial orbit', () => {
    const ui = fixture(); ui.props.onPointerDown(ui.event()); ui.props.onPointerMove(ui.event({ clientX: 200 }));
    window.dispatchEvent(new Event('blur'));
    ui.props.onPointerUp(ui.event());
    expect(ui.writes).toEqual([]); expect(ui.captured).toBeNull();
    expect(ui.host.hasAttribute('data-study-dragging')).toBe(false);
  });

  it('cancels before camera or species changes so a late pointerup cannot overwrite the new view', () => {
    const camera = fixture(); camera.props.onPointerDown(camera.event()); camera.props.onPointerMove(camera.event({ clientX: 200 }));
    camera.button('Chase').props.onClick(); camera.props.onPointerUp(camera.event());
    expect(camera.writes).toEqual([{ flightCamera: 'chase' }]); expect(camera.captured).toBeNull();
    const species = fixture(); species.props.onPointerDown(species.event()); species.props.onPointerMove(species.event({ clientX: 200 }));
    species.label('3D migration focus species').props.onChange({ target: { value: 'monarch' } });
    species.props.onPointerUp(species.event());
    expect(species.state.flightSpecies).toBe('monarch');
    expect(species.state.flightStudyYaw).toBe(35); expect(species.state.flightStudyPitch).toBe(15);
    expect(species.captured).toBeNull();
    expect(species.writes.every(patch => !Object.prototype.hasOwnProperty.call(patch, 'flightStudyYaw'))).toBe(true);
  });
});
