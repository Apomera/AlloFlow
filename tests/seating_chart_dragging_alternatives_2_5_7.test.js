// WCAG 2.5.7 Dragging Movements: in Edit room mode, desks and furniture must be
// movable with single clicks (arrow buttons, or select then click the floor),
// not only by dragging or the keyboard. ALLO_SEATING_CANDIDATE points at a
// scratch copy of the built module for fail-before runs.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const moduleDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, SeatingChart, root, host, latest;

beforeAll(() => {
  React = require(resolve(moduleDir, 'react'));
  ReactDOMClient = require(resolve(moduleDir, 'react-dom/client'));
  ({ act } = require(resolve(moduleDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.SeatingChart;
  loadAlloModule(process.env.ALLO_SEATING_CANDIDATE || 'seating_chart_module.js');
  SeatingChart = window.AlloModules.SeatingChart;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  host?.remove(); host = null;
});

function fire(el, type, init) { act(() => { el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...(init || {}) })); }); }
function button(text) { return [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === text); }
function byLabel(label) { return host.querySelector('[aria-label="' + label + '"]'); }
function seatOf(id) { return latest.seating.layouts.layout1.seats.find((s) => s.id === id); }

async function mountEditRoom() {
  const template = SeatingChart._testing.buildTemplate('rows', 2);
  const layout = { id: 'layout1', name: 'Room', seats: template.seats, furniture: template.furniture, assignments: {} };
  const initial = {
    className: 'Class', students: { ada: 'g1', lin: 'g1' }, displayNames: { ada: 'Ada', lin: 'Lin' }, groups: { g1: { color: '#4f46e5' } },
    seating: { version: 1, activeLayoutId: 'layout1', solveSeed: 1, layouts: { layout1: layout }, constraints: [] },
  };
  function Wrapper() {
    const [rk, setRk] = React.useState(initial);
    latest = rk;
    return React.createElement(SeatingChart.SeatingChartPanel, { isOpen: true, onClose: () => {}, rosterKey: rk, setRosterKey: setRk, t: (k) => k, addToast: () => {} });
  }
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(React.createElement(Wrapper)); await Promise.resolve(); });
  fire(button('Edit room'), 'click');
  return template.seats[0];
}

describe('Seating chart room edits without dragging (WCAG 2.5.7)', () => {
  it('nudges the selected desk with on-screen arrow buttons', async () => {
    const seat = await mountEditRoom();
    const seatEl = host.querySelector('svg[role="group"] g[role="button"][aria-label^="Seat 1:"]');
    expect(seatEl).not.toBeNull();
    fire(seatEl, 'click');
    const right = byLabel('Move right');
    expect(right, 'Move right button').not.toBeNull();
    expect(right.disabled).toBe(false);
    const x0 = seatOf(seat.id).x, y0 = seatOf(seat.id).y;
    fire(right, 'click');
    fire(byLabel('Move down'), 'click');
    expect(seatOf(seat.id).x).toBe(x0 + 1);
    expect(seatOf(seat.id).y).toBe(y0 + 1);
    fire(byLabel('Move left'), 'click');
    fire(byLabel('Move up'), 'click');
    expect(seatOf(seat.id)).toMatchObject({ x: x0, y: y0 });
  });

  it('places the selected desk where the floor is clicked, and a drag release does not re-place it', async () => {
    const seat = await mountEditRoom();
    const svg = host.querySelector('svg[role="group"]');
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 62, right: 100, bottom: 62, x: 0, y: 0 });
    const seatEl = host.querySelector('svg[role="group"] g[role="button"][aria-label^="Seat 1:"]');
    fire(seatEl, 'click');
    // Press on the desk, release over the floor: the click lands on the SVG but must not move it.
    const before = { ...seatOf(seat.id) };
    fire(seatEl, 'pointerdown', { clientX: before.x + 1, clientY: before.y + 1 });
    fire(seatEl, 'pointerup');
    fire(svg, 'click', { clientX: 90, clientY: 55 });
    expect(seatOf(seat.id)).toMatchObject({ x: before.x, y: before.y });
    // Press and click on the empty floor: the desk centres on that point.
    fire(svg, 'pointerdown', { clientX: 50, clientY: 40 });
    fire(svg, 'click', { clientX: 50, clientY: 40 });
    const s = seatOf(seat.id);
    expect(s.x).toBe(Math.round(50 - s.w / 2));
    expect(s.y).toBe(Math.round(40 - s.h / 2));
    expect(document.getElementById('allo-live-seating')).not.toBeNull();
  });
});
