// WCAG 2.5.7 Dragging Movements: Venn tokens in the interactive organizer
// (renderInteractiveMap, view_renderers) moved only by drag or arrow keys.
// Now: click a token to select it (the existing connectingSourceId pick), then
// click a circle, the overlap or the bank to put it there. Real clicks on a
// live mount with a stateful stand-in for the host.
//
// ALLO_VR_CANDIDATE loads another copy of view_renderers_module.js (used to
// prove the test fails on the pre-fix file).
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, renderInteractiveMap, root, host, latest;
let dragStarts = [];

const VENN_ZONES = { A: { x: 250, y: 250, r: 220 }, B: { x: 550, y: 250, r: 220 }, BANK_Y: 500 };

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule(process.env.ALLO_VR_CANDIDATE || 'view_renderers_module.js');
  ({ renderInteractiveMap } = window.AlloModules.ViewRenderers);
});

afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });

const noop = () => {};
const TOKENS = [
  { id: 't1', type: 'venn-token', text: 'Has fur', x: 200, y: 550 },
  { id: 't2', type: 'venn-token', text: 'Lays eggs', x: 400, y: 550 },
];

function Host() {
  const [conceptMapNodes, setConceptMapNodes] = React.useState(TOKENS);
  const [conceptMapEdges, setConceptMapEdges] = React.useState([]);
  const [connectingSourceId, setConnectingSourceId] = React.useState(null);
  const mapContainerRef = React.useRef(null);
  latest = { conceptMapNodes, conceptMapEdges, connectingSourceId };
  // The host's handleNodeClick (host_handlers_source.jsx): first click picks,
  // same node cancels, a second node links the two.
  const handleNodeClick = (e, nodeId) => {
    e.stopPropagation();
    if (connectingSourceId === null) { setConnectingSourceId(nodeId); return; }
    if (connectingSourceId === nodeId) { setConnectingSourceId(null); return; }
    setConceptMapEdges((prev) => [...prev, { id: 'e' + prev.length, fromId: connectingSourceId, toId: nodeId }]);
    setConnectingSourceId(null);
  };
  return renderInteractiveMap({
    ConfettiExplosion: () => null, STYLE_TEXT_SHADOW_WHITE: {}, VENN_ZONES,
    activeChallengeMode: null, challengeFeedback: null, challengeModeType: null,
    generatedContent: { id: 'g1', type: 'outline', data: { structureType: 'Venn Diagram', branches: [{ title: 'Cats' }, { title: 'Birds' }] } },
    isChallengeActive: false, isCheckingChallenge: false, isProcessing: false, isTeacherMode: false,
    letterSpacing: 0, nodeInputText: '', isMapLocked: false, connectingSourceId,
    conceptMapNodes, conceptMapEdges, draggedNodeId: null,
    setChallengeModeType: noop, setConnectingSourceId, setIsInteractiveMap: noop, setIsInteractiveVenn: noop,
    setNodeInputText: noop, mapContainerRef, addToast: noop, handleAddManualNode: noop, handleAutoLayout: noop,
    handleCheckChallengeRouter: noop, handleClearEdges: noop, handleCreateChallenge: noop, handleDeleteEdge: noop,
    handleDeleteNode: noop, handleExitChallenge: noop, handleNodeClick, handleNodeMouseDown: (e, id) => { dragStarts.push(id); },
    handleResetLayout: noop, handleRetryChallenge: noop, handleSetIsConceptMapReadyToFalse: noop,
    handleToggleIsMapLocked: noop, setConceptMapNodes, t: (k) => k,
  });
}

function mount() {
  dragStarts = [];
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(Host)));
}

const token = (text) => [...host.querySelectorAll('[role="button"]')].find((b) => b.getAttribute('aria-label') === text);
const board = () => host.querySelector('[class*="h-[800px]"]');
const node = (id) => latest.conceptMapNodes.find((n) => n.id === id);
const press = (el, x = 0, y = 0) => {
  act(() => {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
  });
};

describe('Venn tokens: click-to-place alternative to dragging (2.5.7)', () => {
  it('click a token, then click inside circle A, moves it there', () => {
    mount();
    press(token('Has fur'));
    expect(latest.connectingSourceId).toBe('t1');
    press(board(), 120, 250);
    expect(node('t1')).toMatchObject({ x: 120, y: 250 });
    expect(latest.connectingSourceId).toBe(null);
    expect(node('t2')).toMatchObject({ x: 400, y: 550 });
    // The drag path still starts on the token's mousedown.
    expect(dragStarts).toContain('t1');
  });

  it('places into the overlap and into circle B', () => {
    mount();
    press(token('Has fur'));
    press(board(), 400, 260);
    expect(node('t1')).toMatchObject({ x: 400, y: 260 });
    press(token('Lays eggs'));
    press(board(), 700, 240);
    expect(node('t2')).toMatchObject({ x: 700, y: 240 });
  });

  it('with a token picked, clicking another token switches the pick instead of linking them', () => {
    mount();
    press(token('Has fur'));
    press(token('Lays eggs'));
    expect(latest.connectingSourceId).toBe('t2');
    expect(latest.conceptMapEdges).toHaveLength(0);
    press(board(), 600, 250);
    expect(node('t2')).toMatchObject({ x: 600, y: 250 });
    expect(node('t1')).toMatchObject({ x: 200, y: 550 });
  });

  it('a click outside both circles sends the token back to the bank, as a drag drop does', () => {
    mount();
    press(token('Has fur'));
    press(board(), 120, 250);
    expect(node('t1')).toMatchObject({ x: 120, y: 250 });
    press(token('Has fur'));
    press(board(), 790, 20);
    const t1 = node('t1');
    expect(t1.y).toBeGreaterThan(VENN_ZONES.BANK_Y);
  });

  it('without a pick, a board click changes nothing', () => {
    mount();
    press(board(), 120, 250);
    expect(node('t1')).toMatchObject({ x: 200, y: 550 });
    expect(latest.connectingSourceId).toBe(null);
  });
});
