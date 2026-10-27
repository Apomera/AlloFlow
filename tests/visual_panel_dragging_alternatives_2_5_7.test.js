// WCAG 2.5.7 Dragging Movements: diagram labels and their leader-line anchors
// must be movable with single clicks (select the label's Move button, then
// click the picture), not only by dragging or arrow keys.
// ALLO_VISUAL_PANEL_CANDIDATE points at a scratch module copy for fail-before runs.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, VisualPanelGrid, root, host;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule(process.env.ALLO_VISUAL_PANEL_CANDIDATE || 'visual_panel_module.js');
  VisualPanelGrid = window.AlloModules.VisualPanelGrid;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  host?.remove(); host = null;
});

const visualPlan = {
  layout: 'single',
  panels: [{ imageUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', caption: 'Cell structure', labels: [{ text: 'Mitochondrion', position: 'top-left' }] }],
};

async function renderPanel() {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(VisualPanelGrid, {
      visualPlan, onUpdateLabel: vi.fn(), onRefinePanel: () => {}, onAnnotationsChange: () => {},
      initialAnnotations: { userLabels: { 0: [{ id: 'teacher-label', text: 'Nucleus', x: 35, y: 40 }] } },
      isTeacherMode: true, t: (key, fallback) => (key === 'common.cancel' ? 'Cancel' : (typeof fallback === 'string' && fallback) || key),
    }));
    await Promise.resolve();
  });
}

async function click(el, init) {
  await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, ...(init || {}) })); await Promise.resolve(); });
}
function moveButton(text) { return host.querySelector(`button[aria-label^="Move label ${text}:"]`); }
function target() {
  const el = host.querySelector('button.visual-panel-place-label-target');
  if (el) el.getBoundingClientRect = () => ({ left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100, x: 0, y: 0, toJSON: () => ({}) });
  return el;
}
function labelBox(text) { return [...host.querySelectorAll('.visual-label')].find((el) => el.textContent.includes(text)); }

describe('Visual Panel label placement without dragging (WCAG 2.5.7)', () => {
  it('moves a teacher label to the clicked point', async () => {
    await renderPanel();
    const move = moveButton('Nucleus');
    expect(move, 'Move button for the teacher label').not.toBeNull();
    await click(move);
    expect(moveButton('Nucleus').getAttribute('aria-pressed')).toBe('true');
    const t = target();
    expect(t).not.toBeNull();
    await click(t, { clientX: 140, clientY: 20 });
    expect(labelBox('Nucleus').style.left).toBe('70%');
    expect(labelBox('Nucleus').style.top).toBe('20%');
    expect(host.querySelector('button.visual-panel-place-label-target')).toBeNull();
  });

  it('moves an AI label, and can place a leader-line anchor instead', async () => {
    await renderPanel();
    await click(moveButton('Mitochondrion'));
    await click(target(), { clientX: 60, clientY: 50 });
    expect(labelBox('Mitochondrion').style.left).toBe('30%');
    expect(labelBox('Mitochondrion').style.top).toBe('50%');

    await click(moveButton('Nucleus'));
    const anchorToggle = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Leader-line anchor');
    expect(anchorToggle).toBeTruthy();
    await click(anchorToggle);
    await click(target(), { clientX: 180, clientY: 90 });
    const dots = [...host.querySelectorAll('svg.visual-leader-line circle.anchor-dot')].map((c) => [c.getAttribute('cx'), c.getAttribute('cy')]);
    expect(dots).toContainEqual(['90', '90']);
    // The label itself did not move.
    expect(labelBox('Nucleus').style.left).toBe('35%');
  });

  it('cancels placement without moving anything', async () => {
    await renderPanel();
    await click(moveButton('Nucleus'));
    const cancel = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Cancel');
    await click(cancel);
    expect(host.querySelector('button.visual-panel-place-label-target')).toBeNull();
    expect(labelBox('Nucleus').style.left).toBe('35%');
  });
});
