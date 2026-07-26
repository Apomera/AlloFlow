import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const moduleDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let axe;
let SeatingChart;
let root;
let host;

beforeAll(() => {
  React = require(resolve(moduleDir, 'react'));
  ReactDOMClient = require(resolve(moduleDir, 'react-dom/client'));
  ({ act } = require(resolve(moduleDir, 'react-dom/test-utils')));
  axe = require(resolve(moduleDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.SeatingChart;
  document.getElementById('seating-chart-a11y')?.remove();
  loadAlloModule('seating_chart_module.js');
  SeatingChart = window.AlloModules.SeatingChart;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  host?.remove();
  host = null;
  vi.restoreAllMocks();
});

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

describe('Seating Chart map accessibility', () => {
  it('uses group semantics, supplies mode-specific keyboard instructions, and visibly styles every SVG focus target', async () => {
    const template = SeatingChart._testing.buildTemplate('rows', 2);
    const layout = {
      id: 'layout1',
      name: 'Accessible room',
      seats: template.seats,
      furniture: template.furniture,
      assignments: { [template.seats[0].id]: 'ada' },
    };
    const rosterKey = {
      className: 'Accessibility class',
      students: { ada: 'group1', lin: 'group1' },
      displayNames: { ada: 'Ada', lin: 'Lin' },
      groups: { group1: { color: '#4f46e5' } },
      seating: {
        version: 1,
        activeLayoutId: layout.id,
        solveSeed: 1,
        layouts: { [layout.id]: layout },
        constraints: [],
      },
    };
    const setRosterKey = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    await act(async () => {
      root.render(React.createElement(SeatingChart.SeatingChartPanel, {
        isOpen: true,
        onClose: () => {},
        rosterKey,
        setRosterKey,
        t: (key) => key === 'common.close' ? 'Close' : key,
        addToast: () => {},
      }));
      await Promise.resolve();
    });

    const dialog = host.querySelector('[role="dialog"]');
    const map = host.querySelector('svg[role="group"]');
    const instructions = host.querySelector('#seating-map-instructions');
    const seats = Array.from(map.querySelectorAll('g.seating-map-item[role="button"]'));
    const style = document.getElementById('seating-chart-a11y');

    expect(dialog).not.toBeNull();
    expect(host.querySelector('svg[role="application"]')).toBeNull();
    expect(map.getAttribute('aria-describedby')).toBe(instructions.id);
    expect(instructions.textContent).toContain('Choose a student');
    expect(instructions.textContent).toContain('Enter or Space');
    expect(seats).toHaveLength(2);
    expect(seats.every((seat) => !String(seat.getAttribute('style')).includes('outline'))).toBe(true);
    seats[0].focus();
    expect(document.activeElement).toBe(seats[0]);

    expect(style.textContent).toContain('.seating-map-item:focus-visible > rect');
    expect(style.textContent).toContain('vector-effect: non-scaling-stroke');
    expect(style.textContent).toContain('@media (forced-colors: active)');
    expect(style.textContent).toContain('stroke: Highlight');

    const editButton = Array.from(dialog.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Edit room'));
    click(editButton);
    expect(instructions.textContent).toContain('arrow keys');
    expect(instructions.textContent).toContain('Press Delete');
    const furniture = Array.from(map.querySelectorAll('g.seating-map-item[role="button"]'))
      .filter((item) => !seats.includes(item));
    expect(furniture.length).toBeGreaterThan(0);
    expect(furniture.every((item) => item.getAttribute('tabindex') === '0')).toBe(true);

    const axeResult = await axe.run(dialog, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    });
    expect(axeResult.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
  });
});
