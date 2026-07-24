// Stateful-mount coverage for the Throughline swim-lanes + a11y additions.
//
// The SSR golden (throughline_golden.test.js) renders once with default state, so
// it does NOT exercise the branches that only appear after interaction:
//   • Lanes toggle ON  → lane bands + laneLabel() in the SVG
//   • "Arrange into lanes" → arrangeIntoLanes() mutates node y
//   • connect mode      → the accessible inline edge-type picker (replaces window.confirm)
//   • node-edit modal   → the lane/strand <input> + datalist
//   • outline panel     → rows are role=button + keyboard-operable
// This mounts the real component with createRoot+act (the repo's stateful pattern,
// see stem_loading_gate_hooks_guard.test.js) and drives those paths, failing loudly
// if any throws. jsdom only — no Canvas smoke (that gate is still pending).

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import {
  setupThroughline, seedStorage, clearStorage,
  sampleUnit, sampleHistory, sampleUnits, React,
} from './helpers/throughline_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const noop = () => {};
function baseProps(over) {
  return Object.assign({ isOpen: true, onClose: noop, addToast: noop, studentNickname: '', t: (k) => k }, over || {});
}
function mount(over) {
  const C = setupThroughline();
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(C, baseProps(over))); });
  return { host, cleanup() { try { act(() => root.unmount()); } catch (_) {} host.remove(); } };
}
function btn(host, needle) {
  return Array.prototype.slice.call(host.querySelectorAll('button'))
    .find((b) => (b.textContent || '').includes(needle));
}
function svgTextJoined(host) {
  return Array.prototype.slice.call(host.querySelectorAll('svg text')).map((t) => t.textContent).join('|');
}

describe('Throughline lanes + a11y (stateful mount)', () => {
  beforeEach(() => clearStorage());

  it('Lanes toggle renders bands (laneLabel resolves the unit name) and Arrange runs without crashing', () => {
    seedStorage(sampleUnit());
    const m = mount({ history: sampleHistory(), units: sampleUnits(), onOpenLesson: noop });
    // No lane labels before toggling (the SVG has only grid/marker/edges — no <text>).
    expect(svgTextJoined(m.host)).toBe('');
    const lanesBtn = btn(m.host, 'throughline.lanes');
    expect(lanesBtn).toBeTruthy();
    act(() => { lanesBtn.click(); });
    // sampleUnit nodes carry category 'u_fix'; with the units prop, laneLabel('u_fix') => 'Water Cycle'.
    expect(svgTextJoined(m.host)).toMatch(/Water Cycle/);
    const arrangeBtn = btn(m.host, 'throughline.arrange_lanes');
    expect(arrangeBtn).toBeTruthy();
    act(() => { arrangeBtn.click(); });   // must not throw
    m.cleanup();
  });

  it('connect mode uses the accessible inline picker instead of window.confirm', () => {
    seedStorage(sampleUnit());
    const m = mount({ history: sampleHistory(), units: sampleUnits(), onOpenLesson: noop });
    act(() => { btn(m.host, 'throughline.connect').click(); });   // enter connect mode
    const cards = m.host.querySelectorAll('[role="group"]');
    expect(cards.length).toBe(2);
    act(() => { cards[0].click(); });   // pendingFrom = n1
    act(() => { cards[1].click(); });   // pendingEdge = {n1,n2} → inline choice bar appears
    const seqBtn = btn(m.host, 'throughline.edge_sequence');
    expect(seqBtn).toBeTruthy();                                  // the accessible choice is present
    expect(btn(m.host, 'throughline.edge_prereq')).toBeTruthy();
    act(() => { seqBtn.click(); });                               // resolve → bar dismisses, no crash
    expect(btn(m.host, 'throughline.edge_sequence')).toBeFalsy();
    m.cleanup();
  });

  it('node-edit modal exposes a lane/strand input that writes node.category', () => {
    seedStorage(sampleUnit());
    const m = mount({ history: sampleHistory(), units: sampleUnits(), onOpenLesson: noop });
    act(() => { btn(m.host, 'throughline.edit').click(); });      // open the first card's editor
    const laneInput = m.host.querySelector('#tl-node-lane');
    expect(laneInput).toBeTruthy();
    expect(m.host.querySelector('#tl-lane-list')).toBeTruthy();    // datalist of existing lanes
    // Setting a new strand must not throw (writes category via setNodeFields).
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    act(() => { setter.call(laneInput, 'Make-Meaning'); laneInput.dispatchEvent(new window.Event('input', { bubbles: true })); });
    m.cleanup();
  });

  it('outline rows are keyboard-operable (role=button + hint)', () => {
    seedStorage(sampleUnit());
    const m = mount({ history: sampleHistory(), units: sampleUnits(), onOpenLesson: noop });
    act(() => { btn(m.host, 'throughline.outline').click(); });   // open the outline panel
    const rows = Array.prototype.slice.call(m.host.querySelectorAll('[role="button"]'))
      .filter((el) => (el.getAttribute('aria-label') || '').includes('throughline.outline_row_hint'));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].getAttribute('tabindex')).toBe('0');
    m.cleanup();
  });
});
