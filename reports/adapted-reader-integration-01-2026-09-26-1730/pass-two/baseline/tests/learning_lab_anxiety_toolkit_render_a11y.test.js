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

describe('Learning Lab Anxiety Toolkit rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkAnxiety', viewLabel: 'Anxiety Toolkit',
      mytkAnxiety: { logs: [
        { id: 'g1', date: '2026-07-01', time: 1782000000000, toolId: 'sense' },
        { id: 'g2', date: '2026-07-02', time: 1782100000000, toolId: 'sense' },
        { id: 'g3', date: '2026-07-03', time: 1782200000000, toolId: 'unknown-legacy-tool' },
        null,
        'legacy-invalid-entry'
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

  it('renders crisis resources, optional guidance, and hedged strategy text over malformed logs', () => {
    expect(host.textContent).toContain('If you are in crisis or feel unsafe');
    expect(host.querySelector('a[href="tel:988"]')).not.toBeNull();
    expect(host.querySelector('a[href="sms:988"]')).not.toBeNull();
    expect(host.querySelector('a[href="https://988lifeline.org/chat/"]')).not.toBeNull();
    expect(host.querySelector('a[href="tel:+18885681112"]')).not.toBeNull();
    expect(host.textContent).toContain('These tools are optional self-help strategies for everyday anxious moments.');
    expect(host.textContent).toContain('They are not therapy and do not replace professional support.');
    expect(host.textContent).not.toContain('regulation circuits');
    expect(host.querySelectorAll('ul[aria-label="Available anxiety tools"] button')).toHaveLength(6);
    expect(host.textContent).toContain('used 2 times');
    expect(host.textContent).toContain('Tools you have logged');
    expect(host.textContent).toContain('2 uses');
    expect(host.textContent).not.toContain('Most-used tools');
  });

  it('opens a tool, moves focus to the active heading, and lists its steps', async () => {
    await act(async () => { host.querySelector('#learning-lab-anxiety-start-thought').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-anxiety-active-heading');
    expect(host.textContent).toContain('Steps for Cognitive defusion');
    expect(host.textContent).toContain('This practice comes from acceptance and commitment therapy (ACT).');
    expect(host.querySelectorAll('ol li').length).toBeGreaterThanOrEqual(5);
    expect(buttonByText(host, 'Finish and log this tool')).not.toBeUndefined();
  });

  it('returns without logging and restores focus to the launcher', async () => {
    await act(async () => { host.querySelector('#learning-lab-anxiety-start-breath').click(); await settleFocus(); });
    await act(async () => { buttonByText(host, '← Back to tools').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-anxiety-start-breath');
    expect(host.textContent).not.toContain('1 use');
    expect(host.textContent).toContain('2 uses');
  });

  it('logs a use on finish, updates counts, and restores focus to the launcher', async () => {
    await act(async () => { host.querySelector('#learning-lab-anxiety-start-breath').click(); await settleFocus(); });
    await act(async () => { buttonByText(host, 'Finish and log this tool').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-anxiety-start-breath');
    expect(host.textContent).toContain('used 1 time');
    expect(host.textContent).toContain('1 use');
    expect(host.textContent).toContain('Counts are informational only');
  });

  it('clears logged uses only after accessible confirmation and moves focus to the first tool', async () => {
    await act(async () => { buttonByText(host, 'Clear logged uses').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Clear logged uses?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.textContent).toContain('Tools you have logged');

    await act(async () => { buttonByText(host, 'Clear logged uses').click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Clear logged uses').click(); await settleFocus(); });
    expect(host.textContent).not.toContain('Tools you have logged');
    expect(host.textContent).not.toContain('used 2 times');
    expect(document.activeElement?.id).toBe('learning-lab-anxiety-start-name');
  });
});
