import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setValue(control, value) {
  const setter = Object.getOwnPropertyDescriptor(control.constructor.prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
}
function buttonByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes(text));
}
async function settleFocus() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Learning Lab Memory Palace rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkPalace', viewLabel: 'Memory Palace Builder',
      mytkPalace: { palaces: [
        { id: 'p1', name: 'My house', description: 'Biology vocab', createdAt: '2026-07-01', loci: [
          { id: 's1', location: 'Front door', item: 'Cell membrane controls entry', vivid: 'A bouncer at the door' },
          { id: 's2', location: 'Kitchen', item: 'Mitochondria make energy', vivid: '' },
          null,
          'legacy-invalid-stop'
        ] },
        { id: 'p2', name: null, description: null, createdAt: null, loci: 'legacy-bad-loci' },
        'legacy-invalid-palace'
      ] }
    } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initial);
      const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });

  afterEach(() => {
    document.querySelectorAll('[data-learning-lab-confirm="true"]').forEach((dialog) => dialog.remove());
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('lists palaces with guidance and fallbacks over malformed data', () => {
    expect(host.textContent).toContain('Palaces are saved only in your Personal Toolkit and are not shared with or sent to anyone.');
    expect(host.querySelectorAll('ul[aria-label="Memory palaces"] > li')).toHaveLength(2);
    expect(host.textContent).toContain('Untitled palace');
    expect(host.textContent).toContain('2 stops');
    expect(host.textContent).toContain('0 stops');
    expect(host.textContent).not.toContain('null');
  });

  it('validates the required palace name and focuses it', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-palace-new-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    const name = host.querySelector('#learning-lab-palace-new-name');
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#learning-lab-palace-name-error')?.textContent).toContain('Enter a name for the memory palace.');
    expect(document.activeElement).toBe(name);
  });

  it('opens a palace, lists its valid stops, and adds a new stop with focus recovery', async () => {
    await act(async () => { host.querySelector('#learning-lab-palace-open-p1').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-palace-editor-heading');
    expect(host.querySelectorAll('ol[aria-label="Memory palace route"] > li')).toHaveLength(2);
    const form = host.querySelector('form[aria-labelledby="learning-lab-palace-add-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelector('#learning-lab-palace-location-error')?.textContent).toContain('Enter a location for this stop.');
    expect(document.activeElement?.id).toBe('learning-lab-palace-location');
    await act(async () => { setValue(host.querySelector('#learning-lab-palace-location'), 'Stairs'); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-palace-item'), 'Ribosomes build proteins'); await Promise.resolve(); });
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelectorAll('ol[aria-label="Memory palace route"] > li')).toHaveLength(3);
    expect(host.textContent).toContain('3. Stairs');
    expect(document.activeElement?.id).toBe('learning-lab-palace-location');
  });

  it('walks the palace with progress semantics and completes back to the start control', async () => {
    await act(async () => { host.querySelector('#learning-lab-palace-open-p1').click(); await settleFocus(); });
    await act(async () => { host.querySelector('#learning-lab-palace-start-walk').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-palace-walk-heading');
    expect(host.textContent).toContain('Front door');
    expect(host.textContent).toContain('A bouncer at the door');
    const progress = host.querySelector('[role="progressbar"]');
    expect(progress?.getAttribute('aria-valuenow')).toBe('1');
    expect(progress?.getAttribute('aria-valuetext')).toBe('Stop 1 of 2');
    await act(async () => { buttonByText(host, 'Next stop').click(); await settleFocus(); });
    expect(host.textContent).toContain('Mitochondria make energy');
    expect(host.textContent).not.toContain('Vivid image');
    await act(async () => { buttonByText(host, 'Complete walk').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-palace-start-walk');
  });

  it('deletes a stop and a palace only after confirmation', async () => {
    await act(async () => { host.querySelector('#learning-lab-palace-open-p1').click(); await settleFocus(); });
    const deleteStop = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Delete memory stop 1: Front door');
    await act(async () => { deleteStop.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Delete this palace stop?');
    await act(async () => { buttonByText(dialog, 'Delete stop').click(); await settleFocus(); });
    expect(host.querySelectorAll('ol[aria-label="Memory palace route"] > li')).toHaveLength(1);
    expect(document.activeElement?.id).toBe('learning-lab-palace-location');

    await act(async () => { buttonByText(host, '← All palaces').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-palace-open-p1');
    const deletePalace = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Delete memory palace: My house');
    await act(async () => { deletePalace.click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    expect(confirmDialog?.textContent).toContain('Delete this memory palace?');
    await act(async () => { buttonByText(confirmDialog, 'Delete palace').click(); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Memory palaces"] > li')).toHaveLength(1);
    expect(document.activeElement?.id).toBe('learning-lab-palace-new-name');
  });
});
