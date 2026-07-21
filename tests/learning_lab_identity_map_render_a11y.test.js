import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setValue(control, value) {
  const setter = Object.getOwnPropertyDescriptor(control.constructor.prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
}

const DIMENSION_IDS = ['roles', 'cultures', 'values', 'communities', 'strengths', 'growing', 'voices', 'aspirations'];

describe('Learning Lab Identity Map rendered accessibility states', () => {
  let host;
  let root;
  let latestToolData;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkIdent', viewLabel: 'My Identity Map',
      mytkIdent: {
        map: { roles: 'Student, big sibling', cultures: 42, values: null, communities: ['legacy-array'] },
        preservedSibling: true
      }
    } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initial);
      latestToolData = toolData;
      const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders affirming guidance, non-notification wording, and all eight labelled dimensions', () => {
    expect(host.textContent).toContain('Identity can change and grow');
    expect(host.textContent).toContain('There are no wrong answers.');
    expect(host.textContent).toContain('saving does not send or show your map to anyone');
    expect(host.textContent).toContain('use a device and account you trust');
    for (const id of DIMENSION_IDS) {
      const field = host.querySelector('#learning-lab-identity-' + id);
      expect(field?.tagName).toBe('TEXTAREA');
      expect(host.querySelector('label[for="learning-lab-identity-' + id + '"]')).not.toBeNull();
      expect(field.getAttribute('aria-describedby')).toContain('learning-lab-identity-' + id + '-prompt');
      expect(field.getAttribute('aria-describedby')).toContain('learning-lab-identity-save-note');
    }
  });

  it('tolerates malformed field values without leaking them into the textareas', () => {
    expect(host.querySelector('#learning-lab-identity-roles').value).toBe('Student, big sibling');
    expect(host.querySelector('#learning-lab-identity-cultures').value).toBe('');
    expect(host.querySelector('#learning-lab-identity-values').value).toBe('');
    expect(host.querySelector('#learning-lab-identity-communities').value).toBe('');
    expect(host.textContent).not.toContain('legacy-array');
  });

  it('saves typed entries while preserving other fields and sibling data', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-identity-strengths'), 'Good listener, patient with tech'); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-identity-strengths').value).toBe('Good listener, patient with tech');
    expect(latestToolData.learningLab.mytkIdent.map.strengths).toBe('Good listener, patient with tech');
    expect(latestToolData.learningLab.mytkIdent.map.roles).toBe('Student, big sibling');
    expect(latestToolData.learningLab.mytkIdent.preservedSibling).toBe(true);
  });

  it('recovers from a fully corrupt map value on first save', async () => {
    await act(async () => { root.unmount(); await Promise.resolve(); });
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const corrupt = { learningLab: { view: 'mytkIdent', viewLabel: 'My Identity Map', mytkIdent: { map: 'legacy-corrupt-string', preservedSibling: true } } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(corrupt);
      latestToolData = toolData;
      const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-identity-roles').value).toBe('');
    await act(async () => { setValue(host.querySelector('#learning-lab-identity-roles'), 'Team captain'); await Promise.resolve(); });
    expect(latestToolData.learningLab.mytkIdent.map).toEqual({ roles: 'Team captain' });
    expect(latestToolData.learningLab.mytkIdent.preservedSibling).toBe(true);
  });
});
