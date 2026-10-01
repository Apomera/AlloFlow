import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setValue(control, value) {
  const setter = Object.getOwnPropertyDescriptor(control.constructor.prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
}

const STEP_IDS = ['warning', 'coping', 'distract', 'helpers', 'pros', 'safe'];

describe('Learning Lab Personal Crisis Plan rendered accessibility states', () => {
  let host;
  let root;
  let latestToolData;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkCrisis', viewLabel: 'My Crisis Plan',
      mytkCrisis: {
        plan: { warning: 'Racing thoughts', coping: 42, distract: null, helpers: ['legacy-array'] },
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

  it('renders crisis resources first with actionable, labelled links', () => {
    expect(host.textContent).toContain('If you are in crisis right now');
    expect(host.querySelector('a[href="tel:988"]')).not.toBeNull();
    expect(host.querySelector('a[href="sms:988"]')).not.toBeNull();
    expect(host.querySelector('a[href="tel:+18885681112"]')).not.toBeNull();
    expect(host.querySelector('a[href="sms:741741"]')).not.toBeNull();
    expect(host.querySelector('a[href="tel:911"]')).not.toBeNull();
    expect(host.textContent).toContain('available 24 hours a day, 7 days a week');
  });

  it('explains non-notification, privacy, and professional-care limits', () => {
    expect(host.textContent).toContain('Saving does not send your plan to anyone or notify a teacher, school, counselor, or family member');
    expect(host.textContent).toContain('sharing it is always your choice');
    expect(host.textContent).toContain('use a device and account you trust');
    expect(host.textContent).toContain('does not replace professional care or emergency services');
    expect(host.textContent).toContain('Based on the Stanley and Brown (2012) Safety Planning Intervention.');
  });

  it('renders all six labelled steps and tolerates malformed field values', () => {
    for (const id of STEP_IDS) {
      const field = host.querySelector('#learning-lab-crisis-' + id);
      expect(field?.tagName).toBe('TEXTAREA');
      expect(host.querySelector('label[for="learning-lab-crisis-' + id + '"]')).not.toBeNull();
      expect(field.getAttribute('aria-describedby')).toContain('learning-lab-crisis-' + id + '-prompt');
      expect(field.getAttribute('aria-describedby')).toContain('learning-lab-crisis-save-note');
    }
    expect(host.querySelector('#learning-lab-crisis-warning').value).toBe('Racing thoughts');
    expect(host.querySelector('#learning-lab-crisis-coping').value).toBe('');
    expect(host.querySelector('#learning-lab-crisis-distract').value).toBe('');
    expect(host.querySelector('#learning-lab-crisis-helpers').value).toBe('');
    expect(host.textContent).not.toContain('42');
    expect(host.textContent).not.toContain('legacy-array');
  });

  it('saves typed entries while preserving other fields, sibling data, and existing steps', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-crisis-helpers'), 'Call my aunt: 555-0100'); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-crisis-helpers').value).toBe('Call my aunt: 555-0100');
    expect(latestToolData.learningLab.mytkCrisis.plan.helpers).toBe('Call my aunt: 555-0100');
    expect(latestToolData.learningLab.mytkCrisis.plan.warning).toBe('Racing thoughts');
    expect(latestToolData.learningLab.mytkCrisis.preservedSibling).toBe(true);
  });

  it('recovers from a fully corrupt plan value on first save', async () => {
    await act(async () => { root.unmount(); await Promise.resolve(); });
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const corrupt = { learningLab: { view: 'mytkCrisis', viewLabel: 'My Crisis Plan', mytkCrisis: { plan: 'legacy-corrupt-string', preservedSibling: true } } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(corrupt);
      latestToolData = toolData;
      const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-crisis-warning').value).toBe('');
    await act(async () => { setValue(host.querySelector('#learning-lab-crisis-warning'), 'Trouble sleeping'); await Promise.resolve(); });
    expect(latestToolData.learningLab.mytkCrisis.plan).toEqual({ warning: 'Trouble sleeping' });
    expect(latestToolData.learningLab.mytkCrisis.preservedSibling).toBe(true);
  });
});
