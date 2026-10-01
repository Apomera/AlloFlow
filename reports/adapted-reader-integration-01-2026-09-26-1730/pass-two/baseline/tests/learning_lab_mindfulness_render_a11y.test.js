import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function buttonByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text);
}
async function settleFocus() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Learning Lab Mindfulness Practice rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkMind', viewLabel: 'Mindfulness Practice',
      mytkMind: { sessions: 'legacy-invalid-sessions' }
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

  it('renders optional and non-communication guidance without clinical effect claims, surviving malformed data', () => {
    expect(host.textContent).toContain('Mindfulness Practice');
    expect(host.textContent).toContain('These practices are optional.');
    expect(host.textContent).toContain('saving a session does not notify a teacher, school, employer, clinician, or family member');
    expect(host.textContent).toContain('Mindfulness practice is not therapy and does not replace professional support.');
    expect(host.textContent).toContain('0 sessions');
    expect(host.textContent).not.toContain('Reduces anxiety');
    expect(host.textContent).not.toContain('parasympathetic');
    expect(host.textContent).not.toContain('Reduces rumination');
    expect(host.querySelectorAll('ul[aria-label="Available mindfulness practices"] button')).toHaveLength(6);
  });

  it('starts a practice, moves focus to the active heading, and exposes timer semantics', async () => {
    await act(async () => { host.querySelector('#learning-lab-mindfulness-start-body').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-mindfulness-active-heading');
    expect(host.textContent).toContain('In practice');
    expect(host.querySelector('[role="timer"]')).not.toBeNull();
    const progress = host.querySelector('[role="progressbar"]');
    expect(progress?.getAttribute('aria-valuenow')).toBe('0');
    expect(progress?.getAttribute('aria-valuetext')).toContain('seconds remaining');
    expect(host.textContent).toContain('Practice instructions');
    expect(buttonByText(host, 'Pause timer')).not.toBeUndefined();
  });

  it('pauses and resumes with visible label changes and status text', async () => {
    await act(async () => { host.querySelector('#learning-lab-mindfulness-start-breath').click(); await settleFocus(); });
    await act(async () => { buttonByText(host, 'Pause timer').click(); await Promise.resolve(); });
    expect(host.textContent).toContain('Paused');
    const resume = buttonByText(host, 'Resume timer');
    expect(resume).not.toBeUndefined();
    await act(async () => { resume.click(); await Promise.resolve(); });
    expect(host.textContent).toContain('In practice');
    expect(buttonByText(host, 'Pause timer')).not.toBeUndefined();
  });

  it('saves a finished session and returns focus to the originating start control', async () => {
    await act(async () => { host.querySelector('#learning-lab-mindfulness-start-body').click(); await settleFocus(); });
    await act(async () => { buttonByText(host, 'Finish and save').click(); await settleFocus(); });
    expect(host.textContent).toContain('1 session');
    expect(document.activeElement?.id).toBe('learning-lab-mindfulness-start-body');
  });

  it('cancels a session only after accessible confirmation and saves nothing', async () => {
    await act(async () => { host.querySelector('#learning-lab-mindfulness-start-rain').click(); await settleFocus(); });
    await act(async () => { buttonByText(host, 'Cancel session').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Cancel this mindfulness session?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await settleFocus(); });
    expect(host.textContent).toContain('In practice');

    await act(async () => { buttonByText(host, 'Cancel session').click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Cancel session').click(); await settleFocus(); });
    expect(host.textContent).toContain('0 sessions');
    expect(document.activeElement?.id).toBe('learning-lab-mindfulness-start-rain');
  });
});
