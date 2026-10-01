import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let axe;
let VisualPanelGrid;
let root;
let host;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('visual_panel_module.js');
  VisualPanelGrid = window.AlloModules.VisualPanelGrid;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  host?.remove();
  host = null;
});

const visualPlan = {
  layout: 'single',
  panels: [{
    imageUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
    caption: 'Cell structure',
    labels: [{ text: 'Mitochondrion', position: 'top-left' }],
  }],
};

async function renderPanel(onUpdateLabel = vi.fn()) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(VisualPanelGrid, {
      visualPlan,
      onUpdateLabel,
      onRefinePanel: () => {},
      onAnnotationsChange: () => {},
      initialAnnotations: {
        userLabels: {
          0: [{ id: 'teacher-label', text: 'Nucleus', x: 35, y: 40 }],
        },
      },
      isTeacherMode: true,
      t: (_key, fallback) => fallback || _key,
    }));
    await Promise.resolve();
  });
  return onUpdateLabel;
}

describe('Visual Panel label removal accessibility', () => {
  it('renders persistent named native controls with AA-sized targets', async () => {
    await renderPanel();

    const aiRemove = host.querySelector('button[aria-label="Remove label Mitochondrion from panel 1"]');
    const teacherRemove = host.querySelector('button[aria-label="Remove label Nucleus from panel 1"]');
    expect(aiRemove).not.toBeNull();
    expect(teacherRemove).not.toBeNull();
    expect(aiRemove.classList.contains('label-delete-btn')).toBe(true);
    expect(teacherRemove.classList.contains('label-delete-btn')).toBe(true);
    expect(aiRemove.style.minWidth).toBe('32px');
    expect(aiRemove.style.minHeight).toBe('32px');

    const results = await axe.run(host, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    });
    const serious = results.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help}`);
    expect(serious).toEqual([]);
  });

  it('invokes AI removal and removes a teacher label without drag or hover', async () => {
    const onUpdateLabel = await renderPanel();
    const aiRemove = host.querySelector('button[aria-label="Remove label Mitochondrion from panel 1"]');
    const teacherRemove = host.querySelector('button[aria-label="Remove label Nucleus from panel 1"]');

    await act(async () => {
      aiRemove.click();
      await Promise.resolve();
    });
    expect(onUpdateLabel).toHaveBeenCalledWith(0, 0, null);

    await act(async () => {
      teacherRemove.click();
      await Promise.resolve();
    });
    expect(host.querySelector('button[aria-label="Remove label Nucleus from panel 1"]')).toBeNull();
  });

  it('offers a native keyboard placement target without wrapping panel controls', async () => {
    await renderPanel();
    const addLabel = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Add Label'));

    await act(async () => {
      addLabel.click();
      await Promise.resolve();
    });

    const target = host.querySelector('button.visual-panel-add-label-target');
    expect(target).not.toBeNull();
    target.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 200,
      bottom: 100,
      width: 200,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    await act(async () => {
      target.click();
      await Promise.resolve();
    });

    expect(host.querySelector('button[aria-label="Remove label New Label from panel 1"]')).not.toBeNull();
    expect(host.querySelector('button.visual-panel-add-label-target')).toBeNull();
  });
});
