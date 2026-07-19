import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function localISO() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
function setValue(control, value) {
  const setter = Object.getOwnPropertyDescriptor(control.constructor.prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
}
function buttonByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text);
}

describe('Learning Lab Concept Map rendered accessibility states', () => {
  let host;
  let root;
  let latestToolData;
  const today = localISO();

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initialData = { learningLab: { view: 'mytkMap', viewLabel: 'Concept Maps', mytkMap: {
      maps: [{ id: 'map-1', title: 'Biology', createdAt: today,
        nodes: [
          { id: 'n1', label: 'Cells', x: 150, y: 150, color: '#d8b4fe' },
          { id: 'n2', label: 'Energy', x: 400, y: 250, color: '#6ee7b7' }
        ],
        edges: [{ id: 'e1', from: 'n1', to: 'n2', label: 'use' }]
      }],
      preservedSibling: true
    } } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initialData);
      latestToolData = toolData;
      const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });

  afterEach(() => {
    document.querySelectorAll('[data-learning-lab-confirm="true"], [data-learning-lab-form="true"]').forEach((dialog) => dialog.remove());
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders a labelled bounded native form, privacy guidance, and semantic map list', () => {
    expect(host.querySelector('#learning-lab-concept-map-list-heading')?.tagName).toBe('H2');
    expect(host.querySelector('#learning-lab-concept-map-privacy')).not.toBeNull();
    expect(host.querySelector('form[aria-labelledby="learning-lab-new-concept-map-heading"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-concept-map-title"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-concept-map-title')?.maxLength).toBe(160);
    expect(host.querySelector('ul[aria-label="Saved concept maps"] > li article')).not.toBeNull();
  });

  it('reports an empty title inline and focuses the title field', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-new-concept-map-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-concept-map-title-error')?.getAttribute('role')).toBe('alert');
    expect(host.querySelector('#learning-lab-concept-map-title')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement?.id).toBe('learning-lab-concept-map-title');
  });

  it('creates a map, preserves sibling data, and moves focus into the editor', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-concept-map-title'), 'Chemistry'); await Promise.resolve(); });
    const form = host.querySelector('form[aria-labelledby="learning-lab-new-concept-map-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-concept-map-editor-heading');
    expect(latestToolData.learningLab.mytkMap.preservedSibling).toBe(true);
    expect(latestToolData.learningLab.mytkMap.maps).toHaveLength(2);
  });

  it('renders equivalent semantic concepts and connections while hiding the visual SVG', async () => {
    await act(async () => { buttonByText(host, 'Open Biology').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-concept-map-editor-heading');
    expect(host.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('svg')?.getAttribute('focusable')).toBe('false');
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-concepts-heading"] li > button')).toHaveLength(2);
    expect(host.querySelector('#learning-lab-connections-heading')?.textContent).toBe('Connections');
    expect(host.textContent).toContain('Cells — use — Energy');
  });

  it('selects concepts with native pressed state and exposes named movement controls', async () => {
    await act(async () => { buttonByText(host, 'Open Biology').click(); await Promise.resolve(); });
    const cells = host.querySelector('button[data-concept-id="n1"]');
    await act(async () => { cells.click(); await Promise.resolve(); });
    expect(cells.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('#learning-lab-concept-controls-heading')?.textContent).toBe('Position Cells');
    expect(host.querySelectorAll('button[aria-label^="Move Cells "]')).toHaveLength(8);
  });

  it('prevents a duplicate connection and restores focus to the concept list', async () => {
    await act(async () => { buttonByText(host, 'Open Biology').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('button[data-concept-id="n1"]').click(); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Connect from Cells').click(); await Promise.resolve(); });
    expect(host.querySelector('[role="status"]')?.textContent).toContain('Connection started from Cells');
    await act(async () => { host.querySelector('button[data-concept-id="n2"]').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-concepts-heading');
    expect(host.querySelector('[role="status"]')).toBeNull();
    expect(latestToolData.learningLab.mytkMap.maps[0].edges).toHaveLength(1);
  });

  it('confirms connection deletion and restores a stable focus target', async () => {
    await act(async () => { buttonByText(host, 'Open Biology').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('button[aria-label="Delete connection: Cells — use — Energy"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    await act(async () => { buttonByText(dialog, 'Delete connection').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-concepts-heading');
    expect(host.textContent).toContain('No connections yet.');
    expect(latestToolData.learningLab.mytkMap.preservedSibling).toBe(true);
  });

  it('returns focus to the map list and safely deletes the final map', async () => {
    await act(async () => { buttonByText(host, 'Open Biology').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('#learning-lab-concept-map-back').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-concept-map-list-heading');
    await act(async () => { host.querySelector('button[aria-label="Delete concept map: Biology"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    await act(async () => { buttonByText(dialog, 'Delete map').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-concept-map-title');
    expect(host.textContent).toContain('No concept maps yet.');
    expect(latestToolData.learningLab.mytkMap.preservedSibling).toBe(true);
  });
});
