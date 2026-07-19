import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function localISO() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function isoWeek(iso) {
  const parts = iso.split('-').map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const weekYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return weekYear + '-W' + String(week).padStart(2, '0');
}

function setValue(control, value) {
  const setter = Object.getOwnPropertyDescriptor(control.constructor.prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('Learning Lab Weekly Reflection rendered accessibility states', () => {
  let host;
  let root;
  const today = localISO();

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initialData = { learningLab: { view: 'mytkReflect', viewLabel: 'Weekly Reflection', mytkReflect: {
      entries: [{ id: 'reflection-1', date: today, week: isoWeek(today), went_well: 'I asked for clarification.', stuck: '', will_try: '', wins: '', proud: '', overall: 7 }], preservedSibling: true
    } } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initialData);
      const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });

  afterEach(() => {
    document.querySelectorAll('[data-learning-lab-confirm="true"]').forEach((dialog) => dialog.remove());
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders a semantic summary, current status, history, and qualified evidence', () => {
    expect(host.querySelector('#learning-lab-reflection-heading')?.tagName).toBe('H2');
    expect(host.querySelectorAll('ul[aria-label="Reflection summary"] > li')).toHaveLength(3);
    expect(host.textContent).toContain('1 week');
    expect(host.textContent).toContain('7.0 out of 10');
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-reflection-history-heading"] ul > li')).toHaveLength(1);
    expect(host.querySelector('time[datetime="' + today + '"]')).not.toBeNull();
    expect(host.querySelector('aside[aria-labelledby="learning-lab-reflection-evidence-heading"]')).not.toBeNull();
  });

  it('opens detail with focus and semantic prompt-response pairs', async () => {
    const button = host.querySelector('button[aria-label="View reflection from ' + today + ', rating 7 out of 10"]');
    await act(async () => { button.click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-reflection-detail-heading');
    expect(host.querySelector('dl dt')?.textContent).toContain('What went well this week?');
    expect(host.querySelector('dl dd')?.textContent).toBe('I asked for clarification.');
    expect(host.textContent).toContain('7 out of 10');
  });

  it('opens a labeled bounded form and describes the rating scale', async () => {
    await act(async () => { host.querySelector('button[aria-label^="View reflection from"]').click(); await Promise.resolve(); });
    await act(async () => { Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Edit reflection').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-reflection-form-heading');
    expect(host.querySelector('form[aria-labelledby="learning-lab-reflection-form-heading"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-reflection-overall"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-reflection-overall')?.getAttribute('aria-describedby')).toBe('learning-lab-reflection-overall-help');
    expect(host.querySelectorAll('ol[aria-label="Reflection prompts"] > li')).toHaveLength(5);
    expect(host.querySelector('#learning-lab-reflection-went_well')?.maxLength).toBe(4000);
  });

  it('rejects an empty reflection, exposes the error, and focuses the first prompt', async () => {
    await act(async () => { host.querySelector('button[aria-label^="View reflection from"]').click(); await Promise.resolve(); });
    await act(async () => { Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Edit reflection').click(); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-reflection-went_well'), ''); await Promise.resolve(); });
    const form = host.querySelector('form[aria-labelledby="learning-lab-reflection-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-reflection-form-error')?.getAttribute('role')).toBe('alert');
    expect(host.querySelector('#learning-lab-reflection-went_well')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement?.id).toBe('learning-lab-reflection-went_well');
  });

  it('confirms deletion and restores the start control when history becomes empty', async () => {
    await act(async () => { host.querySelector('button[aria-label^="View reflection from"]').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('button[aria-label="Delete reflection from ' + today + '"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    const confirm = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent === 'Delete reflection');
    await act(async () => { confirm.click(); await Promise.resolve(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-reflection-history-heading"]')).toHaveLength(0);
    expect(document.activeElement?.id).toBe('learning-lab-reflection-start-button');
  });
});
